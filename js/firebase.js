// js/firebase.js — WeGEM Learning Firebase configuration

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase configuration — from Firebase Console → Project Settings → Your apps
const firebaseConfig = {
  apiKey: "AIzaSyA3tmQ7WhAdIVnng2pjGI3shElIUG3e6B4",
  authDomain: "wegem-learning.firebaseapp.com",
  projectId: "wegem-learning",
  storageBucket: "wegem-learning.firebasestorage.app",
  messagingSenderId: "871985386463",
  appId: "1:871985386463:web:3ea9435d9db8a51bfaea6a",
  measurementId: "G-0W46VK9PGJ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ---- AUTH HELPERS ----

export async function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logOut() {
  return signOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ---- PROGRESS DATA ----

// Save a quiz attempt: users/{uid}/attempts/{auto-id}
export async function saveAttempt(userId, attempt) {
  const attemptsRef = collection(db, "users", userId, "attempts");
  return addDoc(attemptsRef, {
    ...attempt,
    createdAt: new Date().toISOString(),
  });
}

// Get last 50 attempts for a user
export async function getUserAttempts(userId) {
  const attemptsRef = collection(db, "users", userId, "attempts");
  const q = query(attemptsRef, orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
