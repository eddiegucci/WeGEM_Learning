// js/features/notes.js
// Notes feature logic for WeGEM Learning.

import { getNotesForLevel } from "../core/db.js";
import {
  getCachedNotes,
  cacheNotes,
  put,
  remove,
  getAllByIndex,
  STORES,
} from "../core/cache.js";
import { log, isOnline, escapeHTML } from "../core/utils.js";

/* =========================================================
   FETCH NOTES
   ========================================================= */

export async function fetchNotes(curriculum, level) {
  let notes = [];

  // Cache first
  try {
    notes = await getCachedNotes(curriculum, level);
  } catch (e) {
    log.warn("Could not read cached notes:", e);
  }

  // Fetch from cloud if empty or online
  if (isOnline() && !notes.length) {
    try {
      notes = await getNotesForLevel(curriculum, level);
      if (notes.length) await cacheNotes(notes);
    } catch (e) {
      log.warn("Could not fetch notes:", e);
    }
  }

  return notes;
}

/* =========================================================
   FILTER NOTES
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
   CREATE NOTE
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
    createdAt: new Date().toISOString(),
    source: "user",
  };

  // Save locally
  const localId = "note_" + Date.now();
  const stored = { ...prepared, id: localId };
  await put(STORES.CONTENT, { ...stored, type: "note" });

  // Save to cloud
  if (isOnline()) {
    try {
      const { saveNote } = await import("../core/db.js").catch(() => ({}));
      if (saveNote) await saveNote(prepared);
    } catch (e) {
      log.warn("Could not save note to cloud:", e);
    }
  }

  return stored;
}

/* =========================================================
   DELETE NOTE
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
   GET SUBJECTS WITH NOTES
   ========================================================= */

export function extractSubjects(notes) {
  const set = new Set();
  notes.forEach((n) => n.subject && set.add(n.subject));
  return Array.from(set).sort();
}
