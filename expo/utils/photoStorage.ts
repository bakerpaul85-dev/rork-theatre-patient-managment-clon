import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const DB_NAME = 'MedicalFormsPhotoDB';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

let dbInstance: IDBDatabase | null = null;

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('IndexedDB opened successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.log('IndexedDB store created');
      }
    };
  });
};

const getPhotosDir = (): string => {
  if (Platform.OS === 'web') return '';
  return `${(FileSystem as any).documentDirectory || ''}patient_form_photos/`;
};

const PHOTOS_DIR = getPhotosDir();

export const initializeStorage = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      await getDB();
      console.log('Web storage (IndexedDB) initialized - supports ~50MB+ storage');
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
    }
  } else {
    try {
      await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
      console.log('Native storage (FileSystem) initialized');
    } catch (err) {
      // Directory might already exist
    }
  }
};

export const savePhoto = async (
  formId: string,
  photoType: string,
  base64Data: string
): Promise<void> => {
  if (!base64Data || base64Data.length === 0) {
    console.log(`Skipping empty photo data for ${photoType}`);
    return;
  }

  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
  
  if (!cleanBase64 || cleanBase64.length === 0) {
    console.log(`Skipping empty cleaned base64 for ${photoType}`);
    return;
  }

  const key = `${formId}_${photoType}`;

  if (Platform.OS === 'web') {
    try {
      const db = await getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.put(cleanBase64, key);
        
        request.onsuccess = () => {
          console.log(`Photo saved to IndexedDB: ${key} (${(cleanBase64.length / 1024 / 1024).toFixed(2)}MB)`);
          resolve();
        };
        
        request.onerror = () => {
          console.error('IndexedDB save error:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Error saving photo ${key} to IndexedDB:`, error);
      throw error;
    }
  } else {
    const filePath = `${PHOTOS_DIR}${key}.jpg`;
    
    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch (e) {
      // File doesn't exist
    }
    
    if (base64Data.startsWith('file://') || base64Data.startsWith('/')) {
      await FileSystem.copyAsync({ from: base64Data, to: filePath });
    } else {
      const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64);
      if (!isValidBase64) {
        try {
          await FileSystem.copyAsync({ from: base64Data, to: filePath });
        } catch (copyError) {
          throw new Error(`Invalid base64 and failed to copy file`);
        }
      } else {
        await FileSystem.writeAsStringAsync(filePath, cleanBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    }
    console.log(`Photo saved to FileSystem: ${key}`);
  }
};

export const readPhoto = async (
  formId: string,
  photoType: string
): Promise<string | null> => {
  const key = `${formId}_${photoType}`;

  if (Platform.OS === 'web') {
    try {
      const db = await getDB();
      
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.get(key);
        
        request.onsuccess = () => {
          const base64Data = request.result;
          if (base64Data) {
            resolve(`data:image/jpeg;base64,${base64Data}`);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error('IndexedDB read error:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error(`Error reading photo ${key} from IndexedDB:`, error);
      return null;
    }
  } else {
    const filePath = `${PHOTOS_DIR}${key}.jpg`;
    try {
      const base64Data = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64Data}`;
    } catch {
      return null;
    }
  }
};

export const deletePhoto = async (
  formId: string,
  photoType: string
): Promise<void> => {
  const key = `${formId}_${photoType}`;

  if (Platform.OS === 'web') {
    try {
      const db = await getDB();
      
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.delete(key);
        
        request.onsuccess = () => {
          console.log(`Photo deleted from IndexedDB: ${key}`);
          resolve();
        };
        
        request.onerror = () => {
          console.error('IndexedDB delete error:', request.error);
          resolve();
        };
      });
    } catch (error) {
      console.error(`Error deleting photo ${key} from IndexedDB:`, error);
    }
  } else {
    const filePath = `${PHOTOS_DIR}${key}.jpg`;
    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      console.log(`Photo deleted from FileSystem: ${key}`);
    } catch (error) {
      console.error(`Error deleting photo ${key}:`, error);
    }
  }
};

export const deleteAllPhotosForForm = async (formId: string): Promise<void> => {
  const photoTypes = [
    'hospital', 'timeIn', 'timeOut', 'timeInClock', 'timeOutClock',
    'screening', 'firstMedical', 'patientId', 'referralLetter',
  ];

  const deletePromises: Promise<void>[] = [];

  for (const photoType of photoTypes) {
    deletePromises.push(deletePhoto(formId, photoType));
  }

  for (let i = 0; i < 100; i++) {
    deletePromises.push(deletePhoto(formId, `cArm_${i}`));
    deletePromises.push(deletePhoto(formId, `employer_${i}`));
    deletePromises.push(deletePhoto(formId, `attachment_${i}`));
  }

  await Promise.all(deletePromises);
  console.log(`All photos deleted for form: ${formId}`);
};

export const getStorageStats = async (): Promise<{
  usedBytes: number;
  usedMB: string;
  photoCount: number;
}> => {
  if (Platform.OS === 'web') {
    try {
      const db = await getDB();
      
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.openCursor();
        let totalSize = 0;
        let count = 0;
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const value = cursor.value;
            if (typeof value === 'string') {
              totalSize += value.length;
            }
            count++;
            cursor.continue();
          } else {
            resolve({
              usedBytes: totalSize,
              usedMB: (totalSize / 1024 / 1024).toFixed(2),
              photoCount: count,
            });
          }
        };
        
        request.onerror = () => {
          resolve({ usedBytes: 0, usedMB: '0', photoCount: 0 });
        };
      });
    } catch (error) {
      return { usedBytes: 0, usedMB: '0', photoCount: 0 };
    }
  } else {
    try {
      const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
      let totalSize = 0;
      
      for (const file of files) {
        const info = await FileSystem.getInfoAsync(`${PHOTOS_DIR}${file}`);
        if (info.exists && (info as any).size) {
          totalSize += (info as any).size;
        }
      }
      
      return {
        usedBytes: totalSize,
        usedMB: (totalSize / 1024 / 1024).toFixed(2),
        photoCount: files.length,
      };
    } catch {
      return { usedBytes: 0, usedMB: '0', photoCount: 0 };
    }
  }
};

export const cleanupOrphanedPhotos = async (validFormIds: string[]): Promise<number> => {
  const validIdSet = new Set(validFormIds);
  let cleanedCount = 0;

  if (Platform.OS === 'web') {
    try {
      const db = await getDB();
      
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const key = cursor.key as string;
            const parts = key.split('_');
            const formId = parts.length >= 3 ? `${parts[0]}_${parts[1]}_${parts[2]}` : '';
            
            if (!validIdSet.has(formId)) {
              cursor.delete();
              cleanedCount++;
              console.log(`Cleaned orphaned photo: ${key}`);
            }
            cursor.continue();
          } else {
            console.log(`Cleaned ${cleanedCount} orphaned photos`);
            resolve(cleanedCount);
          }
        };
        
        request.onerror = () => {
          resolve(cleanedCount);
        };
      });
    } catch (error) {
      console.error('Error cleaning orphaned photos:', error);
      return cleanedCount;
    }
  } else {
    try {
      const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
      
      for (const file of files) {
        const parts = file.replace('.jpg', '').split('_');
        const formId = parts.length >= 3 ? `${parts[0]}_${parts[1]}_${parts[2]}` : '';
        
        if (!validIdSet.has(formId)) {
          await FileSystem.deleteAsync(`${PHOTOS_DIR}${file}`, { idempotent: true });
          cleanedCount++;
          console.log(`Cleaned orphaned photo: ${file}`);
        }
      }
      
      console.log(`Cleaned ${cleanedCount} orphaned photos`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning orphaned photos:', error);
      return cleanedCount;
    }
  }
};

export const clearAllPhotos = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      const db = await getDB();
      
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('All photos cleared from IndexedDB');
          resolve();
        };
        
        request.onerror = () => {
          console.error('Error clearing IndexedDB:', request.error);
          resolve();
        };
      });
    } catch (error) {
      console.error('Error clearing photos:', error);
    }
  } else {
    try {
      const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
      
      for (const file of files) {
        await FileSystem.deleteAsync(`${PHOTOS_DIR}${file}`, { idempotent: true });
      }
      
      console.log('All photos cleared from FileSystem');
    } catch (error) {
      console.error('Error clearing photos:', error);
    }
  }
};
