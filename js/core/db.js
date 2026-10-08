// js/core/db.js
// Firestore wrapper for WeGEM Learning.

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
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { firebaseConfig } from "../config/firebase-config.js";
import { log, withTimeout } from "./utils.js";

/* =========================================================
   INITIALIZE FIRESTORE (singleton with modern offline cache)
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
   USER OPERATIONS
   ========================================================= */

export async function createUserDoc(uid, data) {
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
    8000,
    "Create user doc",
  );
}

export async function getUserDoc(uid) {
  if (!uid) return null;
  const ref = doc(db, COLLECTIONS.USERS, uid);
  const snap = await withTimeout(getDoc(ref), 8000, "Get user doc");
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserDoc(uid, updates) {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await withTimeout(
    updateDoc(ref, { ...updates, updatedAt: serverTimestamp() }),
    8000,
    "Update user doc",
  );
}

/* =========================================================
   QUIZ ATTEMPTS — subcollection: users/{uid}/attempts
   ========================================================= */

export async function saveAttempt(uid, attempt) {
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
    8000,
    "Save attempt",
  );
  return docRef.id;
}

export async function getUserAttempts(uid, max = 100) {
  if (!uid) return [];
  const ref = collection(db, COLLECTIONS.USERS, uid, "attempts");
  const q = query(ref, orderBy("createdAt", "desc"), limit(max));
  const snap = await withTimeout(getDocs(q), 8000, "Get attempts");
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });
}

export function subscribeToAttempts(uid, callback, max = 50) {
  if (!uid) return () => {};
  const ref = collection(db, COLLECTIONS.USERS, uid, "attempts");
  const q = query(ref, orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });
    callback(list);
  });
}

/* =========================================================
   CONTENT (questions, notes — versioned for delta sync)
   ========================================================= */

export async function getContentMeta() {
  const ref = doc(db, COLLECTIONS.CONTENT_META, "manifest");
  const snap = await withTimeout(getDoc(ref), 8000, "Get content manifest");
  return snap.exists() ? snap.data() : null;
}

export async function setContentMeta(meta) {
  const ref = doc(db, COLLECTIONS.CONTENT_META, "manifest");
  await withTimeout(
    setDoc(ref, { ...meta, updatedAt: serverTimestamp() }, { merge: true }),
    8000,
    "Set content manifest",
  );
}

export async function getQuestionsForSubject(exam, subject) {
  const ref = collection(db, COLLECTIONS.QUESTIONS);
  const q = query(
    ref,
    where("exam", "==", exam),
    where("subject", "==", subject),
    limit(200),
  );
  const snap = await withTimeout(getDocs(q), 8000, "Get questions");
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getNotesForLevel(curriculum, level) {
  const ref = collection(db, COLLECTIONS.NOTES);
  const q = query(
    ref,
    where("curriculum", "==", curriculum),
    where("level", "==", level),
    limit(500),
  );
  const snap = await withTimeout(getDocs(q), 8000, "Get notes");
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      createdAt: serverTimestamp(),
    }),
    8000,
    "Add exam link",
  );
  return docRef.id;
}

export async function getExamLinks() {
  const ref = collection(db, COLLECTIONS.EXAM_LINKS);
  const q = query(ref, orderBy("createdAt", "desc"), limit(200));
  const snap = await withTimeout(getDocs(q), 8000, "Get exam links");
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });
}

export async function deleteExamLink(id) {
  const ref = doc(db, COLLECTIONS.EXAM_LINKS, id);
  await withTimeout(deleteDoc(ref), 8000, "Delete exam link");
}

/* =========================================================
   LEADERBOARD
   ========================================================= */

export async function updateLeaderboardEntry(uid, data) {
  const ref = doc(db, COLLECTIONS.LEADERBOARD, uid);
  await withTimeout(
    setDoc(
      ref,
      {
        uid,
        name: data.name || "",
        school: data.school || "",
        curriculum: data.curriculum || "844",
        level: data.level || "",
        totalScore: increment(data.scoreDelta || 0),
        totalQuizzes: increment(data.quizDelta || 0),
        totalCorrect: increment(data.correctDelta || 0),
        totalQuestions: increment(data.totalDelta || 0),
        bestStreak: data.bestStreak || 0,
        lastActiveAt: serverTimestamp(),
      },
      { merge: true },
    ),
    8000,
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
  const snap = await withTimeout(getDocs(q), 8000, "Get leaderboard");
  return snap.docs.map((d, idx) => ({
    rank: idx + 1,
    id: d.id,
    ...d.data(),
  }));
}

export async function getUserRank(uid, curriculum = null) {
  if (!uid) return null;
  const entries = await getLeaderboard(500, curriculum);
  const idx = entries.findIndex((e) => e.id === uid);
  return idx >= 0 ? entries[idx] : null;
}

/* =========================================================
   ACTIVITY LOG
   ========================================================= */

export async function logActivity(uid, action, meta = {}) {
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
   RE-EXPORTS
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
};
