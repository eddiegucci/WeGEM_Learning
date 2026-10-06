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
    // Fallback: simple obfuscation if Web Crypto unavailable
    let h = 0;
    for (let i = 0; i < password.length; i++) {
      h = (h << 5) - h + password.charCodeAt(i);
      h |= 0;
    }
    return "plain_" + Math.abs(h).toString(16);
  }
}

/* =========================================================
   USER ID (from email)
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

// Save or update a user (merges with existing)
export async function saveUser(userId, data) {
  const userRef = ref(db, `users/${userId}`);
  const payload = {
    ...data,
    userId,
    updatedAt: new Date().toISOString(),
  };
  // Preserve original createdAt if it exists
  if (!payload.createdAt) {
    payload.createdAt = new Date().toISOString();
  }
  await withTimeout(set(userRef, payload), 8000, "Save user");
}

// Fetch a user record
export async function getUser(userId) {
  const snap = await withTimeout(
    get(ref(db, `users/${userId}`)),
    8000,
    "Get user",
  );
  return snap.exists() ? snap.val() : null;
}

// Login: verify email exists, compare hashed password
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

  // Compare hashed passwords
  const inputHash = await hashPassword(password);

  // Accept either hashed match OR plain-text (for migrated records)
  const storedPass = data.password || "";
  const matches =
    storedPass === inputHash ||
    storedPass === password ||
    storedHashFallback(storedPass) === inputHash;

  if (!matches) {
    const err = new Error("Incorrect password.");
    err.code = "wrong-password";
    throw err;
  }

  // If stored was plain text, upgrade it to hash silently
  if (storedPass === password) {
    try {
      await update(ref(db, `users/${userId}`), { password: inputHash });
    } catch {
      // non-fatal
    }
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

// Helper for very old records
function storedHashFallback(s) {
  return s;
}

/* =========================================================
   ATTEMPTS (quiz results)
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
  const linkRef = ref(db, `examLinks/${linkId}`);
  await withTimeout(remove(linkRef), 8000, "Delete exam link");
}

/* =========================================================
   NOTES (user-created, organized by curriculum/level/subject)
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
  const noteRef = ref(db, `notes/${noteId}`);
  await withTimeout(remove(noteRef), 8000, "Delete note");
}
