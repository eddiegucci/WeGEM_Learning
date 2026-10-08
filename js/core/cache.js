// js/core/cache.js
// IndexedDB caching for WeGEM Learning. Fast offline-first storage.

import { log } from "./utils.js";

/* =========================================================
   DATABASE SETUP
   ========================================================= */

const DB_NAME = "wegem_learning";
const DB_VERSION = 1;

const STORES = {
  CONTENT: "content", // questions, notes, exam links
  USER: "user", // user profile
  ATTEMPTS: "attempts", // quiz attempts
  LEADERBOARD: "leaderboard",
  META: "meta", // sync versions, timestamps
  WALLPAPER: "wallpaper", // current wallpaper choice
};

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.CONTENT)) {
        const store = db.createObjectStore(STORES.CONTENT, { keyPath: "id" });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("exam", "exam", { unique: false });
        store.createIndex("subject", "subject", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.USER)) {
        db.createObjectStore(STORES.USER, { keyPath: "uid" });
      }

      if (!db.objectStoreNames.contains(STORES.ATTEMPTS)) {
        const store = db.createObjectStore(STORES.ATTEMPTS, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("subject", "subject", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.LEADERBOARD)) {
        db.createObjectStore(STORES.LEADERBOARD, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(STORES.WALLPAPER)) {
        db.createObjectStore(STORES.WALLPAPER, { keyPath: "key" });
      }
    };
  });

  return dbPromise;
}

/* =========================================================
   GENERIC OPERATIONS
   ========================================================= */

async function tx(storeName, mode = "readonly") {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put(storeName, value) {
  try {
    const store = await tx(storeName, "readwrite");
    await reqToPromise(store.put(value));
    return true;
  } catch (e) {
    log.warn(`Cache put failed for ${storeName}:`, e);
    return false;
  }
}

export async function putMany(storeName, values) {
  if (!values?.length) return true;
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    values.forEach((v) => store.put(v));
    return await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    log.warn(`Cache bulk put failed for ${storeName}:`, e);
    return false;
  }
}

export async function get(storeName, key) {
  try {
    const store = await tx(storeName);
    return await reqToPromise(store.get(key));
  } catch (e) {
    log.warn(`Cache get failed for ${storeName}:`, e);
    return null;
  }
}

export async function getAll(storeName) {
  try {
    const store = await tx(storeName);
    return await reqToPromise(store.getAll());
  } catch (e) {
    log.warn(`Cache getAll failed for ${storeName}:`, e);
    return [];
  }
}

export async function getAllByIndex(storeName, indexName, value) {
  try {
    const store = await tx(storeName);
    const index = store.index(indexName);
    return await reqToPromise(index.getAll(value));
  } catch (e) {
    log.warn(`Cache index query failed for ${storeName}.${indexName}:`, e);
    return [];
  }
}

export async function remove(storeName, key) {
  try {
    const store = await tx(storeName, "readwrite");
    await reqToPromise(store.delete(key));
    return true;
  } catch (e) {
    log.warn(`Cache remove failed for ${storeName}:`, e);
    return false;
  }
}

export async function clear(storeName) {
  try {
    const store = await tx(storeName, "readwrite");
    await reqToPromise(store.clear());
    return true;
  } catch (e) {
    log.warn(`Cache clear failed for ${storeName}:`, e);
    return false;
  }
}

/* =========================================================
   DOMAIN-SPECIFIC HELPERS
   ========================================================= */

/* --- Content (questions + notes) --- */

export async function cacheQuestions(questions) {
  return putMany(
    STORES.CONTENT,
    questions.map((q) => ({ ...q, type: "question" })),
  );
}

export async function cacheNotes(notes) {
  return putMany(
    STORES.CONTENT,
    notes.map((n) => ({ ...n, type: "note" })),
  );
}

export async function getCachedQuestions(exam, subject) {
  const all = await getAllByIndex(STORES.CONTENT, "type", "question");
  return all.filter((q) => q.exam === exam && q.subject === subject);
}

export async function getCachedNotes(curriculum, level) {
  const all = await getAllByIndex(STORES.CONTENT, "type", "note");
  return all.filter((n) => n.curriculum === curriculum && n.level === level);
}

/* --- User --- */

export async function cacheUser(user) {
  if (!user?.uid) return false;
  return put(STORES.USER, { ...user, cachedAt: Date.now() });
}

export async function getCachedUser(uid) {
  return uid ? get(STORES.USER, uid) : null;
}

/* --- Attempts --- */

export async function cacheAttempt(attempt) {
  if (!attempt?.id) return false;
  return put(STORES.ATTEMPTS, attempt);
}

export async function cacheAttempts(attempts) {
  return putMany(STORES.ATTEMPTS, attempts);
}

export async function getCachedAttempts() {
  return getAll(STORES.ATTEMPTS);
}

/* --- Leaderboard --- */

export async function cacheLeaderboard(entries) {
  return putMany(STORES.LEADERBOARD, entries);
}

export async function getCachedLeaderboard() {
  const all = await getAll(STORES.LEADERBOARD);
  return all.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
}

/* --- Meta (sync versions) --- */

export async function setMeta(key, value) {
  return put(STORES.META, { key, value, updatedAt: Date.now() });
}

export async function getMeta(key) {
  const row = await get(STORES.META, key);
  return row ? row.value : null;
}

/* --- Wallpaper --- */

export async function setWallpaperCache(wallpaper) {
  return put(STORES.WALLPAPER, {
    key: "current",
    value: wallpaper,
    updatedAt: Date.now(),
  });
}

export async function getWallpaperCache() {
  const row = await get(STORES.WALLPAPER, "current");
  return row ? row.value : null;
}

/* =========================================================
   STATS
   ========================================================= */

export async function getCacheStats() {
  try {
    const [content, attempts, leaderboard] = await Promise.all([
      getAll(STORES.CONTENT),
      getAll(STORES.ATTEMPTS),
      getAll(STORES.LEADERBOARD),
    ]);
    return {
      contentItems: content.length,
      attempts: attempts.length,
      leaderboardEntries: leaderboard.length,
      estimatedBytes: JSON.stringify({ content, attempts, leaderboard }).length,
    };
  } catch {
    return {
      contentItems: 0,
      attempts: 0,
      leaderboardEntries: 0,
      estimatedBytes: 0,
    };
  }
}

export async function clearAllCache() {
  await Promise.all([
    clear(STORES.CONTENT),
    clear(STORES.USER),
    clear(STORES.ATTEMPTS),
    clear(STORES.LEADERBOARD),
    clear(STORES.META),
  ]);
}

export { STORES };
