// js/firebase.js — WeGEM Learning Firebase (Firestore only, no Auth)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA3tmQ7WhAdIVnng2pjGI3shElIUG3e6B4",
  authDomain: "wegem-learning.firebaseapp.com",
  projectId: "wegem-learning",
  storageBucket: "wegem-learning.firebasestorage.app",
  messagingSenderId: "871985386463",
  appId: "1:871985386463:web:3ea9435d9db8a51bfaea6a",
  measurementId: "G-0W46VK9PGJ",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/* =========================================================
   LOCAL USER — stored in localStorage as an identifier
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
   USERS — Firestore
   ========================================================= */

export async function saveUser(userId, { email, name }) {
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    {
      email,
      name,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getUser(userId) {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}

export function makeUserId(email) {
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_");
}

/* =========================================================
   ATTEMPTS — Firestore subcollection
   ========================================================= */

export async function saveAttempt(userId, attempt) {
  const ref = collection(db, "users", userId, "attempts");
  return addDoc(ref, {
    ...attempt,
    createdAt: serverTimestamp(),
  });
}

export async function getUserAttempts(userId, max = 50) {
  const ref = collection(db, "users", userId, "attempts");
  const q = query(ref, orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt:
        data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
    };
  });
}
