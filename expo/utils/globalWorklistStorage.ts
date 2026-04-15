import { WorklistPatient } from '@/utils/worklistService';

const DB_ENDPOINT = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT || '';
const DB_NAMESPACE = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE || '';
const DB_TOKEN = process.env.EXPO_PUBLIC_RORK_DB_TOKEN || '';

const WORKLIST_URL_KEY = 'worklist_url';
const MANUAL_ENTRIES_KEY = 'worklist_manual_entries';

interface GlobalSetting {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

const surreal = async (query: string): Promise<any[]> => {
  if (!DB_ENDPOINT || !DB_TOKEN) {
    console.warn('[GlobalWorklist] DB not configured, falling back');
    throw new Error('DB_NOT_CONFIGURED');
  }

  const url = `${DB_ENDPOINT}/sql`;
  console.log('[GlobalWorklist] Executing query:', query.substring(0, 120));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DB_TOKEN}`,
      'NS': DB_NAMESPACE,
      'DB': DB_NAMESPACE,
      'Accept': 'application/json',
      'Content-Type': 'text/plain',
    },
    body: query,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[GlobalWorklist] DB error:', response.status, text);
    throw new Error(`DB error: ${response.status}`);
  }

  const results = await response.json();
  console.log('[GlobalWorklist] DB response:', JSON.stringify(results).substring(0, 200));
  return results;
};

export const getGlobalWorklistUrl = async (): Promise<string> => {
  try {
    const results = await surreal(
      `SELECT * FROM global_settings WHERE key = '${WORKLIST_URL_KEY}' LIMIT 1;`
    );
    const records = results?.[0]?.result;
    if (records && records.length > 0) {
      console.log('[GlobalWorklist] Found global URL:', records[0].value?.substring(0, 50));
      return records[0].value || '';
    }
    return '';
  } catch (e: any) {
    if (e.message === 'DB_NOT_CONFIGURED') throw e;
    console.error('[GlobalWorklist] Error getting URL:', e);
    return '';
  }
};

export const saveGlobalWorklistUrl = async (url: string): Promise<void> => {
  const now = new Date().toISOString();
  const escapedUrl = url.replace(/'/g, "\\'");
  await surreal(
    `DELETE FROM global_settings WHERE key = '${WORKLIST_URL_KEY}'; ` +
    `CREATE global_settings SET key = '${WORKLIST_URL_KEY}', value = '${escapedUrl}', updatedAt = '${now}';`
  );
  console.log('[GlobalWorklist] Saved global URL');
};

export const getGlobalManualEntries = async (): Promise<WorklistPatient[]> => {
  try {
    const results = await surreal(
      `SELECT * FROM worklist_entries ORDER BY createdAt DESC;`
    );
    const records = results?.[0]?.result;
    if (records && records.length > 0) {
      console.log('[GlobalWorklist] Found', records.length, 'global manual entries');
      return records.map((r: any) => {
        try {
          return JSON.parse(r.data);
        } catch {
          return null;
        }
      }).filter(Boolean) as WorklistPatient[];
    }
    return [];
  } catch (e: any) {
    if (e.message === 'DB_NOT_CONFIGURED') throw e;
    console.error('[GlobalWorklist] Error getting entries:', e);
    return [];
  }
};

export const saveGlobalManualEntry = async (entry: WorklistPatient): Promise<void> => {
  const now = new Date().toISOString();
  const escapedData = JSON.stringify(entry).replace(/'/g, "\\'");
  await surreal(
    `CREATE worklist_entries SET entryId = '${entry.id}', data = '${escapedData}', createdAt = '${now}';`
  );
  console.log('[GlobalWorklist] Saved global manual entry:', entry.id);
};

export const deleteGlobalManualEntry = async (entryId: string): Promise<void> => {
  await surreal(
    `DELETE FROM worklist_entries WHERE entryId = '${entryId}';`
  );
  console.log('[GlobalWorklist] Deleted global manual entry:', entryId);
};

export const isGlobalStorageAvailable = (): boolean => {
  return !!(DB_ENDPOINT && DB_TOKEN && DB_NAMESPACE);
};
