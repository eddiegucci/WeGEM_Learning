// js/firebase.js — WeGEM Learning Firebase (Realtime Database)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  update,
  remove,
  query,
  orderByChild,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/* =========================================================
   FIREBASE CONFIG
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyA3tmQ7WhAdIVnng2pjGI3shElIUG3e6B4",
  authDomain: "wegem-learning.firebaseapp.com",
  databaseURL: "https://wegem-learning-default-rtdb.firebaseio.com",
  projectId: "wegem-learning",
  storageBucket: "wegem-learning.firebasestorage.app",
  messagingSenderId: "871985386463",
  appId: "1:871985386463:web:3ea9435d9db8a51bfaea6a",
  measurementId: "G-0W46VK9PGJ",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

/* =========================================================
   ADMIN CONFIG — CHANGE THESE IF NEEDED
   ========================================================= */

const ADMIN_EMAIL = "eddiegucci08@gmail.com";
const ADMIN_PASSWORD = "WEGEM2026!";

export function getAdminEmail() {
  return ADMIN_EMAIL;
}

// Check if the currently signed-in user is admin (by email)
export function isAdminEmail(email) {
  return email && email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
}

// Combined check: admin email + correct password
export function isAdmin(email, password) {
  return isAdminEmail(email) && password === ADMIN_PASSWORD;
}

/* =========================================================
   LOCAL USER (session)
   ========================================================= */

const USER_KEY = "wegem_user";

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY);
}

/* =========================================================
   TIMEOUT WRAPPER — never hangs forever
   ========================================================= */

function withTimeout(promise, ms = 8000, label = "Operation") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

/* =========================================================
   PASSWORD HASHING — SHA-256 (client-side)
   ========================================================= */

export async function hashPassword(password) {
  try {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(password),
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    let h = 0;
    for (let i = 0; i < password.length; i++) {
      h = (h << 5) - h + password.charCodeAt(i);
      h |= 0;
    }
    return "plain_" + Math.abs(h).toString(16);
  }
}

/* =========================================================
   USER ID
   ========================================================= */

export function makeUserId(email) {
  if (!email) return "guest_" + Date.now();
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_");
}

/* =========================================================
   USERS — save / get / login
   ========================================================= */

export async function saveUser(userId, data) {
  const userRef = ref(db, `users/${userId}`);
  const payload = {
    ...data,
    userId,
    updatedAt: new Date().toISOString(),
  };
  if (!payload.createdAt) {
    payload.createdAt = new Date().toISOString();
  }
  await withTimeout(set(userRef, payload), 8000, "Save user");
}

export async function getUser(userId) {
  const snap = await withTimeout(
    get(ref(db, `users/${userId}`)),
    8000,
    "Get user",
  );
  return snap.exists() ? snap.val() : null;
}

export async function loginUser(email, password) {
  const normalizedEmail = email.toLowerCase().trim();
  const userId = makeUserId(normalizedEmail);

  const snap = await withTimeout(
    get(ref(db, `users/${userId}`)),
    8000,
    "Login lookup",
  );

  if (!snap.exists()) {
    const err = new Error("No account found with that email.");
    err.code = "user-not-found";
    throw err;
  }

  const data = snap.val();
  const inputHash = await hashPassword(password);
  const storedPass = data.password || "";

  const matches = storedPass === inputHash || storedPass === password;

  if (!matches) {
    const err = new Error("Incorrect password.");
    err.code = "wrong-password";
    throw err;
  }

  // Upgrade plain text to hash silently
  if (storedPass === password) {
    try {
      await update(ref(db, `users/${userId}`), { password: inputHash });
    } catch {}
  }

  return {
    userId,
    name: data.name || "",
    email: data.email || normalizedEmail,
    curriculum: data.curriculum || "844",
    level: data.level || "",
    subjects: data.subjects || [],
    school: data.school || "",
    adm: data.adm || "",
    stream: data.stream || "",
    form: data.form || "",
    grade: data.grade || "",
  };
}

/* =========================================================
   ATTEMPTS (built-in quiz results — legacy)
   ========================================================= */

export async function saveAttempt(userId, attempt) {
  const attemptsRef = ref(db, `users/${userId}/attempts`);
  const newRef = push(attemptsRef);
  await withTimeout(
    set(newRef, {
      ...attempt,
      createdAt: new Date().toISOString(),
    }),
    8000,
    "Save attempt",
  );
}

export async function getUserAttempts(userId, max = 100) {
  const attemptsRef = ref(db, `users/${userId}/attempts`);
  const q = query(attemptsRef, orderByChild("createdAt"), limitToLast(max));
  const snap = await withTimeout(get(q), 8000, "Get attempts");
  if (!snap.exists()) return [];

  const data = snap.val();
  const list = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}

/* =========================================================
   EXAM LINKS (Ctrl+Shift+Alt+V tray)
   ========================================================= */

export async function saveExamLink(link) {
  const linksRef = ref(db, "examLinks");
  const newRef = push(linksRef);
  await withTimeout(
    set(newRef, {
      ...link,
      createdAt: new Date().toISOString(),
    }),
    8000,
    "Save exam link",
  );
  return newRef.key;
}

export async function getExamLinks() {
  const linksRef = ref(db, "examLinks");
  const snap = await withTimeout(get(linksRef), 8000, "Get exam links");
  if (!snap.exists()) return [];

  const data = snap.val();
  const list = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}

export async function deleteExamLink(linkId) {
  await withTimeout(
    remove(ref(db, `examLinks/${linkId}`)),
    8000,
    "Delete exam link",
  );
}

/* =========================================================
   NOTES (single-topic cards — legacy)
   ========================================================= */

export async function saveNote(note) {
  const notesRef = ref(db, "notes");
  const newRef = push(notesRef);
  await withTimeout(
    set(newRef, {
      ...note,
      createdAt: new Date().toISOString(),
    }),
    8000,
    "Save note",
  );
  return newRef.key;
}

export async function getNotes() {
  const notesRef = ref(db, "notes");
  const snap = await withTimeout(get(notesRef), 8000, "Get notes");
  if (!snap.exists()) return [];

  const data = snap.val();
  const list = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}

export async function deleteNote(noteId) {
  await withTimeout(remove(ref(db, `notes/${noteId}`)), 8000, "Delete note");
}

/* =========================================================
   CANVAS — paginated long-form notes / exams
   Structure:
     /canvases/{mode}/{curriculum}/{level}/{subject}/{canvasId}
       title, pages[], updatedAt, createdBy
   mode: 'notes' | 'exams'
   ========================================================= */

export async function saveCanvas(canvas) {
  // canvas = { id?, mode, curriculum, level, subject, title, pages: [...] }
  const base = `canvases/${canvas.mode}/${canvas.curriculum}/${canvas.level}/${canvas.subject}`;

  if (canvas.id) {
    // Update existing
    const refPath = `${base}/${canvas.id}`;
    await withTimeout(
      update(ref(db, refPath), {
        title: canvas.title,
        pages: canvas.pages,
        updatedAt: new Date().toISOString(),
      }),
      8000,
      "Update canvas",
    );
    return canvas.id;
  }

  // Create new
  const newRef = push(ref(db, base));
  await withTimeout(
    set(newRef, {
      title: canvas.title,
      pages: canvas.pages,
      curriculum: canvas.curriculum,
      level: canvas.level,
      subject: canvas.subject,
      mode: canvas.mode,
      createdBy: canvas.createdBy || "anon",
      createdByName: canvas.createdByName || "Anonymous",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    8000,
    "Save canvas",
  );
  return newRef.key;
}

export async function getCanvas(mode, curriculum, level, subject, canvasId) {
  const snap = await withTimeout(
    get(
      ref(db, `canvases/${mode}/${curriculum}/${level}/${subject}/${canvasId}`),
    ),
    8000,
    "Get canvas",
  );
  return snap.exists() ? { id: canvasId, ...snap.val() } : null;
}

export async function listCanvases(mode, curriculum, level, subject) {
  const snap = await withTimeout(
    get(ref(db, `canvases/${mode}/${curriculum}/${level}/${subject}`)),
    8000,
    "List canvases",
  );
  if (!snap.exists()) return [];

  const data = snap.val();
  const list = Object.keys(data).map((id) => ({ id, ...data[id] }));
  list.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt) -
      new Date(a.updatedAt || a.createdAt),
  );
  return list;
}

export async function listAllCanvases(mode) {
  const snap = await withTimeout(
    get(ref(db, `canvases/${mode}`)),
    8000,
    "List all canvases",
  );
  if (!snap.exists()) return [];

  const out = [];
  const byCurriculum = snap.val();
  Object.entries(byCurriculum).forEach(([curriculum, byLevel]) => {
    Object.entries(byLevel || {}).forEach(([level, bySubject]) => {
      Object.entries(bySubject || {}).forEach(([subject, byId]) => {
        Object.entries(byId || {}).forEach(([id, canvas]) => {
          out.push({ id, curriculum, level, subject, ...canvas });
        });
      });
    });
  });
  out.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt) -
      new Date(a.updatedAt || a.createdAt),
  );
  return out;
}

export async function deleteCanvas(mode, curriculum, level, subject, canvasId) {
  await withTimeout(
    remove(
      ref(db, `canvases/${mode}/${curriculum}/${level}/${subject}/${canvasId}`),
    ),
    8000,
    "Delete canvas",
  );
}

/* =========================================================
   QUIZZES — authored by admin in quiz-builder.html
   Structure:
     /quizzes/{curriculum}/{level}/{subject}/{quizId}
       title, html, markingJS, createdAt, createdBy
   ========================================================= */

export async function saveQuiz(quiz) {
  // quiz = { id?, curriculum, level, subject, title, html, markingJS }
  const base = `quizzes/${quiz.curriculum}/${quiz.level}/${quiz.subject}`;

  if (quiz.id) {
    const refPath = `${base}/${quiz.id}`;
    await withTimeout(
      update(ref(db, refPath), {
        title: quiz.title,
        html: quiz.html,
        markingJS: quiz.markingJS,
        updatedAt: new Date().toISOString(),
      }),
      8000,
      "Update quiz",
    );
    return quiz.id;
  }

  const newRef = push(ref(db, base));
  await withTimeout(
    set(newRef, {
      title: quiz.title,
      html: quiz.html,
      markingJS: quiz.markingJS,
      curriculum: quiz.curriculum,
      level: quiz.level,
      subject: quiz.subject,
      createdBy: quiz.createdBy || "anon",
      createdByName: quiz.createdByName || "Anonymous",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    8000,
    "Save quiz",
  );
  return newRef.key;
}

export async function getQuiz(curriculum, level, subject, quizId) {
  const snap = await withTimeout(
    get(ref(db, `quizzes/${curriculum}/${level}/${subject}/${quizId}`)),
    8000,
    "Get quiz",
  );
  return snap.exists() ? { id: quizId, ...snap.val() } : null;
}

export async function listQuizzes(curriculum, level, subject) {
  const snap = await withTimeout(
    get(ref(db, `quizzes/${curriculum}/${level}/${subject}`)),
    8000,
    "List quizzes",
  );
  if (!snap.exists()) return [];

  const data = snap.val();
  const list = Object.keys(data).map((id) => ({ id, ...data[id] }));
  list.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt) -
      new Date(a.updatedAt || a.createdAt),
  );
  return list;
}

// List every quiz across all subjects (used by quiz-builder admin page)
export async function listAllQuizzes() {
  const snap = await withTimeout(
    get(ref(db, "quizzes")),
    8000,
    "List all quizzes",
  );
  if (!snap.exists()) return [];

  const out = [];
  const byCurriculum = snap.val();
  Object.entries(byCurriculum).forEach(([curriculum, byLevel]) => {
    Object.entries(byLevel || {}).forEach(([level, bySubject]) => {
      Object.entries(bySubject || {}).forEach(([subject, byId]) => {
        Object.entries(byId || {}).forEach(([id, quiz]) => {
          out.push({ id, curriculum, level, subject, ...quiz });
        });
      });
    });
  });
  out.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt) -
      new Date(a.updatedAt || a.createdAt),
  );
  return out;
}

export async function deleteQuiz(curriculum, level, subject, quizId) {
  await withTimeout(
    remove(ref(db, `quizzes/${curriculum}/${level}/${subject}/${quizId}`)),
    8000,
    "Delete quiz",
  );
}

/* =========================================================
   QUIZ RESULTS — records a student's score for an authored quiz
   Structure:
     /users/{userId}/authoredQuizResults/{resultId}
       quizId, curriculum, level, subject, title, score, total, percent, createdAt
   ========================================================= */

export async function saveQuizResult(userId, result) {
  const resultsRef = ref(db, `users/${userId}/authoredQuizResults`);
  const newRef = push(resultsRef);
  await withTimeout(
    set(newRef, {
      ...result,
      createdAt: new Date().toISOString(),
    }),
    8000,
    "Save quiz result",
  );
  return newRef.key;
}

export async function getUserQuizResults(userId, max = 100) {
  const resultsRef = ref(db, `users/${userId}/authoredQuizResults`);
  const q = query(resultsRef, orderByChild("createdAt"), limitToLast(max));
  const snap = await withTimeout(get(q), 8000, "Get quiz results");
  if (!snap.exists()) return [];

  const data = snap.val();
  const list = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}

/* =========================================================
   BULK EXPORT — get everything admin needs to manage
   ========================================================= */

export async function getAllUsers() {
  const snap = await withTimeout(get(ref(db, "users")), 10000, "Get all users");
  if (!snap.exists()) return [];

  const data = snap.val();
  return Object.keys(data).map((id) => ({ id, ...data[id] }));
}
