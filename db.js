// db.js – super paprasta IndexedDB versija vienam profiliui (id: "user-1")

const DB_NAME = 'timurita-db';
const DB_VERSION = 1;
const STORE = 'profiles';

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

// IŠSAUGOTI profilį: { id: 'user-1', name, phone, city }
export async function saveProfile(profile) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(profile);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// PERSKAITYTI profilį pagal id (pvz., 'user-1')
export async function loadProfile(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => rej(req.error);
  });
}
