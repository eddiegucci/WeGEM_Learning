// js/features/notes.js
// Notes feature. Cache-first reads, real Firestore writes.

import { getNotesForLevel, saveNote as saveNoteToCloud } from "../core/db.js";
import {
  getCachedNotes,
  cacheNotes,
  put,
  remove,
  STORES,
} from "../core/cache.js";
import { log, isOnline } from "../core/utils.js";

/* =========================================================
   FETCH
   ========================================================= */

export async function fetchNotes(curriculum, level) {
  let notes = [];

  try {
    notes = await getCachedNotes(curriculum, level);
  } catch (e) {
    log.warn("Cache read failed for notes:", e);
  }

  if (isOnline()) {
    try {
      const fresh = await getNotesForLevel(curriculum, level);
      if (fresh.length) {
        await cacheNotes(fresh);
        notes = mergeNotes(notes, fresh);
      }
    } catch (e) {
      log.warn("Cloud fetch failed, using cache:", e);
    }
  }

  return notes;
}

function mergeNotes(cached, fresh) {
  const byId = new Map();
  cached.forEach((n) => n.id && byId.set(n.id, n));
  fresh.forEach((n) => n.id && byId.set(n.id, n));
  return Array.from(byId.values());
}

/* =========================================================
   FILTER
   ========================================================= */

export function filterNotes(notes, { subject = "all", query = "" } = {}) {
  let filtered = notes;

  if (subject !== "all") {
    filtered = filtered.filter((n) => n.subject === subject);
  }

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        (n.topic || "").toLowerCase().includes(q) ||
        (n.subject || "").toLowerCase().includes(q) ||
        (n.summary || "").toLowerCase().includes(q),
    );
  }

  return filtered;
}

/* =========================================================
   CREATE — real Firestore write
   ========================================================= */

export async function createNote(note) {
  const prepared = {
    subject: note.subject || "General",
    topic: note.topic || "",
    summary: note.summary || "",
    keyPoints: Array.isArray(note.keyPoints)
      ? note.keyPoints.filter(Boolean)
      : [],
    curriculum: note.curriculum || "844",
    level: note.level || "",
    createdBy: note.createdBy || "",
    createdByName: note.createdByName || "",
    source: "user",
  };

  // Always save locally first — instant UX.
  const localId = "note_" + Date.now();
  const stored = {
    ...prepared,
    id: localId,
    createdAt: new Date().toISOString(),
    pending: true,
  };
  await put(STORES.CONTENT, { ...stored, type: "note" });

  // Sync to Firestore if online.
  if (isOnline()) {
    try {
      const cloudId = await saveNoteToCloud(prepared);
      // Replace local copy with cloud-id version.
      await remove(STORES.CONTENT, localId);
      const synced = { ...stored, id: cloudId, pending: false };
      await put(STORES.CONTENT, { ...synced, type: "note" });
      return synced;
    } catch (e) {
      log.warn("Cloud save failed, note stays local:", e);
    }
  }

  return stored;
}

/* =========================================================
   DELETE
   ========================================================= */

export async function deleteNote(noteId) {
  if (!noteId) return false;
  try {
    await remove(STORES.CONTENT, noteId);
    return true;
  } catch (e) {
    log.warn("Could not delete note:", e);
    return false;
  }
}

/* =========================================================
   SUBJECTS
   ========================================================= */

export function extractSubjects(notes) {
  const set = new Set();
  notes.forEach((n) => n.subject && set.add(n.subject));
  return Array.from(set).sort();
}
