// js/core/auth.js
// Firebase Auth wrapper — optimized for instant page load.

import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { firebaseConfig } from "../config/firebase-config.js";
import { log, withTimeout } from "./utils.js";

/* =========================================================
   INIT
   ========================================================= */

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((e) => {
  log.warn("Could not set auth persistence:", e);
});

/* =========================================================
   SESSION CACHE — instant access from localStorage
   ========================================================= */

const SESSION_KEY = "wegem_session_user";
let currentUser = null;
const listeners = new Set();

function saveSession(user) {
  try {
    if (user) {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
        }),
      );
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

currentUser = loadSession();

/* =========================================================
   AUTH STATE
   ========================================================= */

let authReady = false;
let authReadyResolve;
const authReadyPromise = new Promise((resolve) => {
  authReadyResolve = resolve;
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  saveSession(user);
  if (!authReady) {
    authReady = true;
    authReadyResolve(user);
  }
  listeners.forEach((cb) => {
    try {
      cb(user);
    } catch (e) {
      log.error("Auth listener error:", e);
    }
  });
});

/* =========================================================
   PUBLIC API
   ========================================================= */

export function isReady() {
  return authReady;
}

export function waitForAuth() {
  if (currentUser) return Promise.resolve(currentUser);
  return authReadyPromise;
}

export function getCurrentUser() {
  return currentUser;
}

export function getCachedUser() {
  return currentUser || loadSession();
}

export function isSignedIn() {
  return !!currentUser;
}

export function onAuthChange(callback) {
  listeners.add(callback);
  if (currentUser) {
    try {
      callback(currentUser);
    } catch {}
  }
  return () => listeners.delete(callback);
}

/* =========================================================
   SIGN UP / SIGN IN / OUT
   ========================================================= */

export async function signUp(email, password, displayName = "") {
  const normalized = String(email).toLowerCase().trim();
  const cred = await withTimeout(
    createUserWithEmailAndPassword(auth, normalized, password),
    10000,
    "Sign up",
  );
  if (displayName && cred.user) {
    try {
      await updateProfile(cred.user, { displayName });
    } catch {}
  }
  return cred.user;
}

export async function signIn(email, password) {
  const normalized = String(email).toLowerCase().trim();
  const cred = await withTimeout(
    signInWithEmailAndPassword(auth, normalized, password),
    10000,
    "Sign in",
  );
  return cred.user;
}

export async function signOutNow() {
  await withTimeout(signOut(auth), 6000, "Sign out");
  currentUser = null;
  saveSession(null);
}

export async function sendPasswordReset(email) {
  const normalized = String(email).toLowerCase().trim();
  await withTimeout(
    sendPasswordResetEmail(auth, normalized),
    10000,
    "Send reset",
  );
}

export async function updateDisplayName(name) {
  if (!currentUser) throw new Error("Not signed in.");
  await updateProfile(currentUser, { displayName: name });
  saveSession(currentUser);
}

export async function deleteAccount(password) {
  if (!currentUser) throw new Error("Not signed in.");
  if (!currentUser.email) throw new Error("No email on account.");
  const cred = EmailAuthProvider.credential(currentUser.email, password);
  await reauthenticateWithCredential(currentUser, cred);
  await deleteUser(currentUser);
  currentUser = null;
  saveSession(null);
}

export async function getIdToken(forceRefresh = false) {
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}
