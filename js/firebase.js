// js/firebase.js — WeGEM Learning Firebase (Realtime Database)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  push,
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
   LOCAL USER
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
   TIMEOUT WRAPPER
   ========================================================= */

function withTimeout(promise, ms = 8000, label = "Operation") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms),
    ),
  ]);
}

/* =========================================================
   USERS
   ========================================================= */

export function makeUserId(email) {
  if (!email) return "guest_" + Date.now();
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_");
}

export async function saveUser(userId, data) {
  const userRef = ref(db, `users/${userId}`);
  await withTimeout(
    set(userRef, {
      ...data,
      updatedAt: new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString(),
    }),
    8000,
    "Save user",
  );
}

export async function getUser(userId) {
  const snap = await withTimeout(
    get(ref(db, `users/${userId}`)),
    8000,
    "Get user",
  );
  return snap.exists() ? snap.val() : null;
}

/* =========================================================
   ATTEMPTS
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

export async function getUserAttempts(userId, max = 50) {
  const attemptsRef = ref(db, `users/${userId}/attempts`);
  const q = query(attemptsRef, orderByChild("createdAt"), limitToLast(max));
  const snap = await withTimeout(get(q), 8000, "Get attempts");
  if (!snap.exists()) return [];

  const data = snap.val();
  const list = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}
