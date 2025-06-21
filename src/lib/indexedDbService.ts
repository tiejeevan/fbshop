
'use client';

import { simpleUUID } from '@/lib/utils';

const DB_NAME = 'LocalCommerceImagesDB'; // Re-using the same DB for simplicity
const PRODUCT_IMAGES_STORE_NAME = 'productImages';
const ADMIN_ACTION_LOGS_STORE_NAME = 'adminActionLogs'; // New store for admin logs
const DB_VERSION = 2; // Incremented version due to new object store

const MAX_IDB_ADMIN_LOGS = 500; // Max number of admin logs to keep in IndexedDB

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error("IndexedDB not available on server-side."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(PRODUCT_IMAGES_STORE_NAME)) {
          db.createObjectStore(PRODUCT_IMAGES_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(ADMIN_ACTION_LOGS_STORE_NAME)) {
          const logStore = db.createObjectStore(ADMIN_ACTION_LOGS_STORE_NAME, { keyPath: 'id' });
          logStore.createIndex('timestamp', 'timestamp'); // Index for sorting
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
        dbPromise = null; 
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }
  return dbPromise;
}

// Product Image Functions (existing)
export async function saveImage(productId: string, imageIndex: number | 'primary' | string, imageFile: File): Promise<string> {
  const db = await openDB();
  const imageId = `${productId}_${imageIndex}_${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`; 

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PRODUCT_IMAGES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PRODUCT_IMAGES_STORE_NAME);
    const request = store.put({ id: imageId, image: imageFile });

    request.onsuccess = () => resolve(imageId);
    request.onerror = (event) => {
      console.error('Error saving image to IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function getImage(imageId: string): Promise<Blob | null> {
  if (!imageId) return null;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PRODUCT_IMAGES_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PRODUCT_IMAGES_STORE_NAME);
    const request = store.get(imageId);

    request.onsuccess = (event) => {
      const result = (event.target as IDBRequest).result;
      resolve(result ? result.image : null);
    };
    request.onerror = (event) => {
      console.error('Error getting image from IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function deleteImage(imageId: string): Promise<void> {
  if (!imageId) return;
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(PRODUCT_IMAGES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PRODUCT_IMAGES_STORE_NAME);
    const request = store.delete(imageId);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error('Error deleting image from IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function deleteImagesForProduct(imageIds: string[]): Promise<void> {
  if (!imageIds || imageIds.length === 0) return;
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(PRODUCT_IMAGES_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PRODUCT_IMAGES_STORE_NAME);
    let completedDeletes = 0;
    const validImageIds = imageIds.filter(id => !!id);

    if (validImageIds.length === 0) {
        resolve();
        return;
    }

    validImageIds.forEach(id => {
      const request = store.delete(id);
      request.onsuccess = () => {
        completedDeletes++;
        if (completedDeletes === validImageIds.length) {
          resolve();
        }
      };
      request.onerror = (event) => {
        console.error(`Error deleting image ${id} from IndexedDB:`, (event.target as IDBRequest).error);
        completedDeletes++; 
        if (completedDeletes === validImageIds.length) {
          resolve(); 
        }
      };
    });
    
    transaction.onerror = (event) => {
        console.error('Transaction error deleting images for product:', (event.target as IDBTransaction).error);
        reject((event.target as IDBTransaction).error);
    };
  });
}


// Admin Action Log Functions (New)
import type { AdminActionLog } from '@/types';

async function trimAdminLogs(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(ADMIN_ACTION_LOGS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(ADMIN_ACTION_LOGS_STORE_NAME);
  const index = store.index('timestamp');

  const countRequest = index.count();
  countRequest.onsuccess = () => {
    const currentCount = countRequest.result;
    if (currentCount > MAX_IDB_ADMIN_LOGS) {
      const itemsToDelete = currentCount - MAX_IDB_ADMIN_LOGS;
      let deletedCount = 0;
      
      // Open a cursor to iterate over the oldest items and delete them
      const cursorRequest = index.openCursor(null, 'next'); // 'next' gives oldest first
      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && deletedCount < itemsToDelete) {
          store.delete(cursor.primaryKey); // Delete by primary key (id)
          deletedCount++;
          cursor.continue();
        }
      };
      cursorRequest.onerror = (event) => {
        console.error('Error in cursor during log trimming:', (event.target as IDBRequest).error);
      };
    }
  };
  countRequest.onerror = (event) => {
    console.error('Error counting logs for trimming:', (event.target as IDBRequest).error);
  };
}


export async function addAdminActionLogToDB(logData: Omit<AdminActionLog, 'id' | 'timestamp'>): Promise<AdminActionLog> {
  const db = await openDB();
  const newLog: AdminActionLog = {
    ...logData,
    id: simpleUUID(),
    timestamp: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ADMIN_ACTION_LOGS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(ADMIN_ACTION_LOGS_STORE_NAME);
    const request = store.add(newLog);

    request.onsuccess = () => {
      resolve(newLog);
      // After successfully adding, trim old logs.
      // No need to await this, can run in background.
      trimAdminLogs().catch(err => console.error("Error trimming admin logs:", err));
    };
    request.onerror = (event) => {
      console.error('Error adding admin action log to IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function getAdminActionLogsFromDB(): Promise<AdminActionLog[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ADMIN_ACTION_LOGS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(ADMIN_ACTION_LOGS_STORE_NAME);
    const index = store.index('timestamp');
    const getAllRequest = index.getAll(); // Get all logs sorted by timestamp (default ascending)

    getAllRequest.onsuccess = (event) => {
      const logs = (event.target as IDBRequest).result as AdminActionLog[];
      resolve(logs.reverse()); // Reverse to get newest first
    };
    getAllRequest.onerror = (event) => {
      console.error('Error getting admin action logs from IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}
