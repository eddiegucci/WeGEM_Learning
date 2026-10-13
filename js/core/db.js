// js/core/db.js
// Firestore wrapper for WeGEM Learning.
// Same collections, same field names — no schema changes.

import {
  getApps,
  initializeApp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
  runTransaction,
  onSnapshot,
  Timestamp,
  deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { firebaseConfig } from "../config/firebase-config.js";
import { log, withTimeout } from "./utils.js";

/* =========================================================
   INIT
   ========================================================= */

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager(),
  }),
});

/* =========================================================
   COLLECTIONS
   ========================================================= */

export const COLLECTIONS = {
  USERS: "users",
  CONTENT: "content",
  CONTENT_META: "contentMeta",
  QUESTIONS: "questions",
  NOTES: "notes",
  EXAM_LINKS: "examLinks",
  LEADERBOARD: "leaderboard",
  ACTIVITY: "activity",
};

/* =========================================================
   TIMEOUTS
   ========================================================= */

const READ_TIMEOUT = 8000;
const WRITE_TIMEOUT = 10000;

/* =========================================================
   HELPERS
   ========================================================= */

function toISO(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value.toDate && typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function docToObject(snap) {
  if (!snap || !snap.exists()) return null;
  const data = snap.data() || {};
  return {
    id: snap.id,
    ...data,
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt),
    lastActiveAt: toISO(data.lastActiveAt),
  };
}

/* =========================================================
   USER OPERATIONS
   ========================================================= */

export async function createUserDoc(uid, data) {
  if (!uid) throw new Error("createUserDoc: uid required");
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await withTimeout(
    setDoc(ref, {
      uid,
      email: data.email || "",
      name: data.name || "",
      school: data.school || "",
      adm: data.adm || "",
      stream: data.stream || "",
      curriculum: data.curriculum || "844",
      level: data.level || "",
      subjects: data.subjects || [],
      role: data.role || "student",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    WRITE_TIMEOUT,
    "Create user doc",
  );
}

export async function getUserDoc(uid) {
  if (!uid) return null;
  const ref = doc(db, COLLECTIONS.USERS, uid);
  const snap = await withTimeout(getDoc(ref), READ_TIMEOUT, "Get user doc");
  return docToObject(snap);
}

export async function updateUserDoc(uid, updates) {
  if (!uid) throw new Error("updateUserDoc: uid required");
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await withTimeout(
    updateDoc(ref, { ...updates, updatedAt: serverTimestamp() }),
    WRITE_TIMEOUT,
    "Update user doc",
  );
}

export async function deleteUserData(uid) {
  if (!uid) return;
  try {
    // Delete attempts subcollection
    const attemptsRef = collection(db, COLLECTIONS.USERS, uid, "attempts");
    const attemptsSnap = await withTimeout(
      getDocs(attemptsRef),
      READ_TIMEOUT,
      "Get attempts for deletion",
    );
    const batch = writeBatch(db);
    attemptsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    // Delete user doc
    await deleteDoc(doc(db, COLLECTIONS.USERS, uid));

    // Delete leaderboard entry
    await deleteDoc(doc(db, COLLECTIONS.LEADERBOARD, uid)).catch(() => {});
  } catch (e) {
    log.warn("Could not fully delete user data:", e);
  }
}

/* =========================================================
   QUIZ ATTEMPTS — users/{uid}/attempts
   ========================================================= */

export async function saveAttempt(uid, attempt) {
  if (!uid) throw new Error("saveAttempt: uid required");
  const ref = collection(db, COLLECTIONS.USERS, uid, "attempts");
  const docRef = await withTimeout(
    addDoc(ref, {
      exam: attempt.exam || "",
      subject: attempt.subject || "",
      correct: attempt.correct || 0,
      total: attempt.total || 0,
      score: attempt.score || 0,
      topicResults: attempt.topicResults || {},
      duration: attempt.duration || 0,
      mode: attempt.mode || "practice",
      createdAt: serverTimestamp(),
    }),
    WRITE_TIMEOUT,
    "Save attempt",
  );
  return docRef.id;
}

export async function getUserAttempts(uid, max = 100) {
  if (!uid) return [];
  const ref = collection(db, COLLECTIONS.USERS, uid, "attempts");
  const q = query(ref, orderBy("createdAt", "desc"), limit(max));
  const snap = await withTimeout(getDocs(q), READ_TIMEOUT, "Get attempts");
  return snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      id: d.id,
      ...data,
      createdAt: toISO(data.createdAt),
    };
  });
}

export function subscribeToAttempts(uid, callback, max = 50) {
  if (!uid) return () => {};
  const ref = collection(db, COLLECTIONS.USERS, uid, "attempts");
  const q = query(ref, orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        ...data,
        createdAt: toISO(data.createdAt),
      };
    });
    callback(list);
  });
}

/* =========================================================
   CONTENT — QUESTIONS
   ========================================================= */

export async function getQuestionsForSubject(exam, subject) {
  if (!exam || !subject) return [];
  const ref = collection(db, COLLECTIONS.QUESTIONS);
  const q = query(
    ref,
    where("exam", "==", exam),
    where("subject", "==", subject),
    limit(200),
  );
  const snap = await withTimeout(getDocs(q), READ_TIMEOUT, "Get questions");
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* =========================================================
   CONTENT — NOTES
   ========================================================= */

export async function getNotesForLevel(curriculum, level) {
  if (!curriculum || !level) return [];
  const ref = collection(db, COLLECTIONS.NOTES);
  const q = query(
    ref,
    where("curriculum", "==", curriculum),
    where("level", "==", level),
    limit(500),
  );
  const snap = await withTimeout(getDocs(q), READ_TIMEOUT, "Get notes");
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Save a user-created note to Firestore.
 * Previously missing — this is what features/notes.js tried to call.
 */
export async function saveNote(note) {
  const ref = collection(db, COLLECTIONS.NOTES);
  const docRef = await withTimeout(
    addDoc(ref, {
      curriculum: note.curriculum || "844",
      level: note.level || "",
      subject: note.subject || "",
      topic: note.topic || "",
      summary: note.summary || "",
      keyPoints: Array.isArray(note.keyPoints) ? note.keyPoints : [],
      createdBy: note.createdBy || "",
      createdByName: note.createdByName || "",
      source: note.source || "user",
      createdAt: serverTimestamp(),
    }),
    WRITE_TIMEOUT,
    "Save note",
  );
  return docRef.id;
}

export async function deleteNoteById(id) {
  if (!id) return;
  await withTimeout(
    deleteDoc(doc(db, COLLECTIONS.NOTES, id)),
    WRITE_TIMEOUT,
    "Delete note",
  );
}

/* =========================================================
   CONTENT MANIFEST (delta sync)
   ========================================================= */

export async function getContentMeta() {
  const ref = doc(db, COLLECTIONS.CONTENT_META, "manifest");
  const snap = await withTimeout(getDoc(ref), READ_TIMEOUT, "Get manifest");
  return snap.exists() ? snap.data() : null;
}

export async function setContentMeta(meta) {
  const ref = doc(db, COLLECTIONS.CONTENT_META, "manifest");
  await withTimeout(
    setDoc(ref, { ...meta, updatedAt: serverTimestamp() }, { merge: true }),
    WRITE_TIMEOUT,
    "Set manifest",
  );
}

/* =========================================================
   EXAM LINKS
   ========================================================= */

export async function addExamLink(link) {
  const ref = collection(db, COLLECTIONS.EXAM_LINKS);
  const docRef = await withTimeout(
    addDoc(ref, {
      title: link.title || "",
      url: link.url || "",
      subject: link.subject || "",
      type: link.type || "papers",
      curriculum: link.curriculum || "844",
      level: link.level || "",
      createdBy: link.createdBy || "",
      createdByName: link.createdByName || "",
      createdAt: serverTimestamp(),
    }),
    WRITE_TIMEOUT,
    "Add exam link",
  );
  return docRef.id;
}

export async function getExamLinks() {
  const ref = collection(db, COLLECTIONS.EXAM_LINKS);
  const q = query(ref, orderBy("createdAt", "desc"), limit(200));
  const snap = await withTimeout(getDocs(q), READ_TIMEOUT, "Get exam links");
  return snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      id: d.id,
      ...data,
      createdAt: toISO(data.createdAt),
    };
  });
}

export async function deleteExamLink(id) {
  if (!id) return;
  await withTimeout(
    deleteDoc(doc(db, COLLECTIONS.EXAM_LINKS, id)),
    WRITE_TIMEOUT,
    "Delete exam link",
  );
}

/* =========================================================
   LEADERBOARD
   ========================================================= */

export async function updateLeaderboardEntry(uid, data) {
  if (!uid) return;
  const ref = doc(db, COLLECTIONS.LEADERBOARD, uid);

  const payload = {
    uid,
    name: data.name || "",
    school: data.school || "",
    curriculum: data.curriculum || "844",
    level: data.level || "",
    lastActiveAt: serverTimestamp(),
  };

  if (data.scoreDelta !== undefined)
    payload.totalScore = increment(data.scoreDelta);
  if (data.quizDelta !== undefined)
    payload.totalQuizzes = increment(data.quizDelta);
  if (data.correctDelta !== undefined)
    payload.totalCorrect = increment(data.correctDelta);
  if (data.totalDelta !== undefined)
    payload.totalQuestions = increment(data.totalDelta);
  if (data.bestStreak !== undefined) payload.bestStreak = data.bestStreak;

  await withTimeout(
    setDoc(ref, payload, { merge: true }),
    WRITE_TIMEOUT,
    "Update leaderboard",
  );
}

export async function getLeaderboard(limitCount = 100, curriculum = null) {
  const ref = collection(db, COLLECTIONS.LEADERBOARD);
  let q;
  if (curriculum) {
    q = query(
      ref,
      where("curriculum", "==", curriculum),
      orderBy("totalScore", "desc"),
      limit(limitCount),
    );
  } else {
    q = query(ref, orderBy("totalScore", "desc"), limit(limitCount));
  }
  const snap = await withTimeout(getDocs(q), READ_TIMEOUT, "Get leaderboard");
  return snap.docs.map((d, idx) => ({
    rank: idx + 1,
    id: d.id,
    ...d.data(),
  }));
}

export async function getUserRank(uid, curriculum = null) {
  if (!uid) return null;
  try {
    const entries = await getLeaderboard(500, curriculum);
    const idx = entries.findIndex((e) => e.id === uid);
    return idx >= 0 ? entries[idx] : null;
  } catch (e) {
    log.warn("Could not get user rank:", e);
    return null;
  }
}

/* =========================================================
   ACTIVITY LOG
   ========================================================= */

export async function logActivity(uid, action, meta = {}) {
  if (!uid) return;
  try {
    const ref = collection(db, COLLECTIONS.ACTIVITY);
    await addDoc(ref, {
      uid,
      action,
      meta,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    log.warn("Could not log activity:", e);
  }
}

/* =========================================================
   BATCH / TRANSACTION HELPERS
   ========================================================= */

export async function batchWrite(operations) {
  const batch = writeBatch(db);
  operations.forEach(({ type, ref, data }) => {
    if (type === "set") batch.set(ref, data);
    else if (type === "update") batch.update(ref, data);
    else if (type === "delete") batch.delete(ref);
  });
  await batch.commit();
}

/* =========================================================
   RE-EXPORTS (so features don't need to import firebase-firestore directly)
   ========================================================= */

export {
  runTransaction,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  deleteField,
  serverTimestamp,
};
