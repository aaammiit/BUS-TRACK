import { Song } from '../types';

const DB_NAME = 'BusWalaTrackDB';
const DB_VERSION = 2;
const STORE_NAME = 'songs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomHornBlob(file: File): Promise<string> {
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains('settings')) {
      return URL.createObjectURL(file);
    }
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    
    store.put({
      key: 'custom_horn',
      name: file.name,
      type: file.type,
      blob: file
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        const blobUrl = URL.createObjectURL(file);
        resolve(blobUrl);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Error saving custom horn blob to IndexedDB:', error);
    return URL.createObjectURL(file);
  }
}

export async function getCustomHornRecord(): Promise<{ name: string; url: string } | null> {
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains('settings')) return null;
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('custom_horn');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const rec = request.result;
        if (rec && rec.blob) {
          const blobUrl = URL.createObjectURL(rec.blob);
          resolve({ name: rec.name || 'custom_horn.mp3', url: blobUrl });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading custom horn from IndexedDB:', error);
    return null;
  }
}

export async function clearCustomHornFromDB(): Promise<void> {
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains('settings')) return;
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    store.delete('custom_horn');
  } catch (error) {
    console.error('Error clearing custom horn from IndexedDB:', error);
  }
}

export async function saveSongToDB(song: Song, fileBlob?: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Store metadata and optional binary blob
    const record = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      fileName: song.fileName,
      contentUri: song.contentUri,
      isMediaStore: !!song.isMediaStore,
      size: song.size,
      addedAt: song.addedAt,
      isPreset: false,
      blob: fileBlob || null
    };

    store.put(record);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Error saving song to IndexedDB:', error);
  }
}

export async function getAllSongsFromDB(): Promise<Song[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const records = request.result || [];
        const songs: Song[] = records.map((rec) => {
          const url = rec.blob ? URL.createObjectURL(rec.blob) : (rec.contentUri || '');
          return {
            id: rec.id,
            title: rec.title,
            artist: rec.artist,
            duration: rec.duration,
            url: url,
            contentUri: rec.contentUri,
            isMediaStore: rec.isMediaStore,
            size: rec.size,
            fileName: rec.fileName,
            isPreset: false,
            addedAt: rec.addedAt,
            blob: rec.blob
          };
        });
        resolve(songs);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error reading songs from IndexedDB:', error);
    return [];
  }
}

export async function deleteSongFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Error deleting song from IndexedDB:', error);
  }
}
