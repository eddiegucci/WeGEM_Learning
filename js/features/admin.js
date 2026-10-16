// js/features/admin.js
// Admin features — user management, questions, notes, exam links.

import { db, COLLECTIONS } from "../core/db.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { log, isOnline, withTimeout } from "../core/utils.js";

/* =========================================================
   USERS
   ========================================================= */

export async function listUsers({ limitCount = 100 } = {}) {
  if (!isOnline()) throw new Error("Admin actions require internet.");
  const ref = collection(db, COLLECTIONS.USERS);
  const q = query(ref, orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await withTimeout(getDocs(q), 10000, "List users");
  return snap.docs.map(function (d) {
    return Object.assign({ id: d.id }, d.data());
  });
}

export async function promoteUser(uid) {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await setDoc(
    ref,
    { role: "admin", updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function demoteUser(uid) {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await setDoc(
    ref,
    { role: "student", updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function deleteUserProfile(uid) {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await deleteDoc(ref);
}

/* =========================================================
   QUESTIONS
   ========================================================= */

export async function addQuestion(question) {
  if (!isOnline()) throw new Error("Internet required.");
  const ref = doc(collection(db, COLLECTIONS.QUESTIONS));
  await setDoc(ref, {
    exam: question.exam || "KCSE",
    subject: question.subject || "",
    topic: question.topic || "General",
    q: question.q || question.question || "",
    options: question.options || [],
    answer:
      question.answer != null
        ? question.answer
        : question.correctIndex != null
          ? question.correctIndex
          : 0,
    explain: question.explain || "",
    curriculum: question.curriculum || "844",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function bulkAddQuestions(questions) {
  if (!Array.isArray(questions)) questions = [];
  const results = { added: 0, failed: 0 };
  for (const q of questions) {
    try {
      await addQuestion(q);
      results.added += 1;
    } catch (e) {
      log.warn("Question add failed:", e);
      results.failed += 1;
    }
  }
  return results;
}

export async function deleteQuestion(id) {
  if (!isOnline()) throw new Error("Internet required.");
  const ref = doc(db, COLLECTIONS.QUESTIONS, id);
  await deleteDoc(ref);
}

export async function listQuestions({ exam, subject, limitCount = 200 } = {}) {
  if (!isOnline()) throw new Error("Internet required.");
  const ref = collection(db, COLLECTIONS.QUESTIONS);
  const constraints = [];
  if (exam) constraints.push(where("exam", "==", exam));
  if (subject) constraints.push(where("subject", "==", subject));
  constraints.push(limit(limitCount));
  const q = query(ref, ...constraints);
  const snap = await withTimeout(getDocs(q), 10000, "List questions");
  return snap.docs.map(function (d) {
    return Object.assign({ id: d.id }, d.data());
  });
}

/* =========================================================
   NOTES
   ========================================================= */

export async function addNote(note) {
  if (!isOnline()) throw new Error("Internet required.");
  const ref = doc(collection(db, COLLECTIONS.NOTES));
  await setDoc(ref, {
    curriculum: note.curriculum || "844",
    level: note.level || "Form 4",
    subject: note.subject || "",
    topic: note.topic || "",
    summary: note.summary || "",
    keyPoints: Array.isArray(note.keyPoints) ? note.keyPoints : [],
    source: "admin",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteNote(id) {
  if (!isOnline()) throw new Error("Internet required.");
  const ref = doc(db, COLLECTIONS.NOTES, id);
  await deleteDoc(ref);
}

export async function listNotes({ curriculum, level, limitCount = 500 } = {}) {
  if (!isOnline()) throw new Error("Internet required.");
  const ref = collection(db, COLLECTIONS.NOTES);
  const constraints = [];
  if (curriculum) constraints.push(where("curriculum", "==", curriculum));
  if (level) constraints.push(where("level", "==", level));
  constraints.push(limit(limitCount));
  const q = query(ref, ...constraints);
  const snap = await withTimeout(getDocs(q), 10000, "List notes");
  return snap.docs.map(function (d) {
    return Object.assign({ id: d.id }, d.data());
  });
}

/* =========================================================
   EXAM LINKS
   ========================================================= */

export async function addExamLink(link) {
  if (!isOnline()) throw new Error("Internet required.");
  const ref = doc(collection(db, COLLECTIONS.EXAM_LINKS));
  await setDoc(ref, {
    title: link.title || "",
    url: link.url || "",
    subject: link.subject || "",
    type: link.type || "papers",
    curriculum: link.curriculum || "844",
    level: link.level || "",
    createdBy: link.createdBy || "",
    createdByName: link.createdByName || "",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteExamLink(id) {
  if (!isOnline()) throw new Error("Internet required.");
  const ref = doc(db, COLLECTIONS.EXAM_LINKS, id);
  await deleteDoc(ref);
}

export async function listExamLinks({ limitCount = 200 } = {}) {
  if (!isOnline()) throw new Error("Internet required.");
  const ref = collection(db, COLLECTIONS.EXAM_LINKS);
  const q = query(ref, orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await withTimeout(getDocs(q), 10000, "List exam links");
  return snap.docs.map(function (d) {
    const data = d.data() || {};
    return Object.assign({ id: d.id }, data, {
      createdAt:
        data.createdAt && data.createdAt.toDate
          ? data.createdAt.toDate().toISOString()
          : null,
    });
  });
}

/* =========================================================
   CONTENT MANIFEST
   ========================================================= */

export async function updateContentManifest(manifest) {
  const ref = doc(db, COLLECTIONS.CONTENT_META, "manifest");
  await setDoc(
    ref,
    Object.assign({}, manifest, {
      version: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  );
}

/* =========================================================
   ANALYTICS
   ========================================================= */

export async function getContentCounts() {
  if (!isOnline()) throw new Error("Internet required.");
  const results = await Promise.all([
    getDocs(collection(db, COLLECTIONS.QUESTIONS)),
    getDocs(collection(db, COLLECTIONS.NOTES)),
    getDocs(collection(db, COLLECTIONS.EXAM_LINKS)),
  ]);
  return {
    questions: results[0].size,
    notes: results[1].size,
    examLinks: results[2].size,
  };
}
