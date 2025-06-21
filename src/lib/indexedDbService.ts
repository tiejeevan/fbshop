
'use client';

const DB_NAME = 'LocalCommerceImagesDB';
const PRODUCT_IMAGES_STORE_NAME = 'productImages';
const DB_VERSION = 1; // Version can be 1 if only productImages store exists

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
