import * as FileSystem from 'expo-file-system/legacy';

/**
 * Email attachment temp files are shared across case submissions. To stop one
 * case's attachments bleeding into another's email, every submission gets its
 * own session subfolder, and session folders older than 24 hours are pruned
 * when a new session starts (an in-progress email draft still works, because
 * its files are not touched until they are a day old).
 */

export const newAttachmentSession = (tempDir: string): ((filename: string) => string) => {
  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sessionDir = `${tempDir}${sessionId}/`;
  FileSystem.makeDirectoryAsync(sessionDir, { intermediates: true }).catch(() => {});
  return (filename: string) => `${sessionDir}${filename}`;
};

export const pruneOldAttachments = async (tempDir: string, maxAgeHours = 24): Promise<void> => {
  try {
    const entries = await FileSystem.readDirectoryAsync(tempDir);
    const cutoff = Date.now() - maxAgeHours * 3_600_000;
    await Promise.all(
      entries.map(async (name) => {
        const entryPath = `${tempDir}${name}`;
        try {
          const info = await FileSystem.getInfoAsync(entryPath);
          if (!info.exists) return;
          const modifiedMs = (info as any).modificationTime
            ? (info as any).modificationTime * 1000
            : 0;
          if (modifiedMs && modifiedMs >= cutoff) return;
          await FileSystem.deleteAsync(entryPath, { idempotent: true });
        } catch {}
      })
    );
  } catch {
    // Directory may not exist yet - nothing to prune
  }
};
