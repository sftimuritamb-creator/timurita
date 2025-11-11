// /timurita/db.js
// Bendras IndexedDB helperis: stores = profiles, offers, settings

const DB_NAME = 'timurita-db';
const DB_VERSION = 3;

const STORES = {
  profiles: { keyPath: 'id' },   // { id: 'user-1', name, phone, city, ... }
  offers:   { keyPath: 'id' },   // { id, title, city, company, desc, ... }
  settings: { keyPath: 'key' }   // { key: 'lang', value: 'lt' }
};

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      Object.entries(STORES).forEach(([name, opts]) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: opts.keyPath });
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(storeName, mode, cb) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const res = cb(store);
    t.oncomplete = () => resolve(res);
    t.onerror = () => reject(t.error);
  });
}

// ---- BENDRI CRUD ----
export async function put(storeName, value) {
  return tx(storeName, 'readwrite', (s) => s.put(value));
}

export async function get(storeName, key) {
  const req = await tx(storeName, 'readonly', (s) => s.get(key));
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll(storeName) {
  const req = await tx(storeName, 'readonly', (s) => s.getAll());
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function remove(storeName, key) {
  return tx(storeName, 'readwrite', (s) => s.delete(key));
}

export async function clear(storeName) {
  return tx(storeName, 'readwrite', (s) => s.clear());
}

// ---- PROFILIS ----
export async function saveProfile(profile) {
  // profile: { id: 'user-1', name, phone, city, ... }
  await put('profiles', profile);
}

export async function loadProfile(id) {
  return get('profiles', id);
}

// ---- PASIŪLYMAI ----
export async function saveOffer(offer) {
  // offer: { id, title, city, company, desc }
  await put('offers', offer);
}

export async function getAllOffers() {
  return getAll('offers');
}

export async function deleteOffer(id) {
  await remove('offers', id);
}

export async function seedOffers(list) {
  for (const o of list) await saveOffer(o);
}

// ---- NUSTATYMAI / MISC ----
export async function setSetting(key, value) {
  await put('settings', { key, value });
}
export async function getSetting(key) {
  const row = await get('settings', key);
  return row ? row.value : null;
}

// ---- (NEPRIVALOMA) Migracija iš localStorage ----
export async function migrateFromLocalStorageOnce() {
  try {
    if (localStorage.getItem('migrated_to_indexeddb')) return;

    const prof = JSON.parse(localStorage.getItem('profile') || 'null');
    if (prof && prof.id) await saveProfile(prof);

    const offers = JSON.parse(localStorage.getItem('offers') || '[]');
    if (Array.isArray(offers)) {
      for (const o of offers) if (o && o.id) await saveOffer(o);
    }

    localStorage.setItem('migrated_to_indexeddb', '1');
  } catch (e) {
    console.warn('Migracija nepavyko:', e);
  }
}

