// js/core/auth.js
// Firebase Auth wrapper for WeGEM Learning.
// Public API identical to v2 — same exports, same signatures.

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

// Real Firebase User object (has .getIdToken, .getIdTokenResult, etc.)
let currentUser = null;

// Snapshot of the user's serializable fields (uid, email, displayName)
// Used to render UI instantly before Firebase fires onAuthStateChanged.
let cachedSnapshot = null;

// Listeners registered via onAuthChange()
const listeners = new Set();

/* ---------- Snapshot helpers ---------- */

function makeSnapshot(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    emailVerified: !!user.emailVerified,
    photoURL: user.photoURL || "",
  };
}

function saveSnapshot(snapshot) {
  try {
    if (snapshot) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {}
}

function loadSnapshot() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.uid) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Load cached snapshot for instant UI rendering on cold start.
cachedSnapshot = loadSnapshot();

/* =========================================================
   AUTH STATE
   ========================================================= */

let authReady = false;
let authReadyResolve;
const authReadyPromise = new Promise((resolve) => {
  authReadyResolve = resolve;
});

onAuthStateChanged(auth, (user) => {
  currentUser = user || null;

  if (user) {
    cachedSnapshot = makeSnapshot(user);
    saveSnapshot(cachedSnapshot);
  } else {
    cachedSnapshot = null;
    saveSnapshot(null);
  }

  if (!authReady) {
    authReady = true;
    authReadyResolve();
  }

  listeners.forEach((cb) => {
    try {
      cb(user || null);
    } catch (e) {
      log.error("Auth listener error:", e);
    }
  });
});

/* =========================================================
   PUBLIC API
   ========================================================= */

/**
 * Synchronously returns the real Firebase User, or null.
 * Null until onAuthStateChanged fires the first time.
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Returns the cached snapshot (uid, email, displayName).
 * Available immediately on cold start, even before Firebase fires.
 * Safe to use for rendering — do NOT call Firebase methods on this.
 */
export function getCachedUser() {
  return cachedSnapshot;
}

export function isReady() {
  return authReady;
}

export function isSignedIn() {
  return !!currentUser;
}

/**
 * Wait for Firebase Auth to be ready.
 * Always returns the real Firebase User (or null).
 * Never returns a plain object.
 */
export function waitForAuth() {
  if (authReady) return Promise.resolve(currentUser);
  return authReadyPromise.then(() => currentUser);
}

/**
 * Subscribe to auth changes.
 * Fires immediately with the current user if available.
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback) {
  listeners.add(callback);
  if (authReady) {
    try {
      callback(currentUser);
    } catch (e) {
      log.error("Auth listener error:", e);
    }
  }
  return () => listeners.delete(callback);
}

/* =========================================================
   SIGN UP / SIGN IN / OUT
   ========================================================= */

function normalizeEmail(email) {
  return String(email || "")
    .toLowerCase()
    .trim();
}

export async function signUp(email, password, displayName = "") {
  const normalized = normalizeEmail(email);
  const cred = await withTimeout(
    createUserWithEmailAndPassword(auth, normalized, password),
    15000,
    "Sign up",
  );

  if (displayName && cred.user) {
    try {
      await updateProfile(cred.user, { displayName });
      // Refresh local snapshot
      cachedSnapshot = makeSnapshot(cred.user);
      saveSnapshot(cachedSnapshot);
    } catch (e) {
      log.warn("Could not set display name:", e);
    }
  }

  return cred.user;
}

export async function signIn(email, password) {
  const normalized = normalizeEmail(email);
  const cred = await withTimeout(
    signInWithEmailAndPassword(auth, normalized, password),
    15000,
    "Sign in",
  );
  return cred.user;
}

export async function signOutNow() {
  await withTimeout(signOut(auth), 8000, "Sign out");
  currentUser = null;
  cachedSnapshot = null;
  saveSnapshot(null);
}

export async function sendPasswordReset(email) {
  const normalized = normalizeEmail(email);
  await withTimeout(
    sendPasswordResetEmail(auth, normalized),
    15000,
    "Send reset",
  );
}

export async function updateDisplayName(name) {
  if (!currentUser) throw new Error("Not signed in.");
  const clean = String(name || "").trim();
  if (!clean) throw new Error("Name cannot be empty.");
  await updateProfile(currentUser, { displayName: clean });
  cachedSnapshot = makeSnapshot(currentUser);
  saveSnapshot(cachedSnapshot);
  return currentUser;
}

export async function deleteAccount(password) {
  if (!currentUser) throw new Error("Not signed in.");
  if (!currentUser.email) throw new Error("No email on account.");

  const credential = EmailAuthProvider.credential(currentUser.email, password);
  await reauthenticateWithCredential(currentUser, credential);
  await deleteUser(currentUser);

  currentUser = null;
  cachedSnapshot = null;
  saveSnapshot(null);
}

export async function getIdToken(forceRefresh = false) {
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken(forceRefresh);
  } catch (e) {
    log.warn("Could not get ID token:", e);
    return null;
  }
}

export async function reloadUser() {
  if (!currentUser) return null;
  try {
    await currentUser.reload();
    // currentUser is mutated in place by Firebase SDK
    cachedSnapshot = makeSnapshot(currentUser);
    saveSnapshot(cachedSnapshot);
  } catch (e) {
    log.warn("Could not reload user:", e);
  }
  return currentUser;
}
