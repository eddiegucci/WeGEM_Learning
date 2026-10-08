// js/core/auth.js
// Firebase Authentication wrapper for WeGEM Learning.

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
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { firebaseConfig } from "../config/firebase-config.js";
import { log, withTimeout } from "./utils.js";

/* =========================================================
   INITIALIZE FIREBASE APP (singleton)
   ========================================================= */

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

/* =========================================================
   SESSION STATE (local cache of current user)
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
          photoURL: user.photoURL || "",
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

/* =========================================================
   INITIALIZE — subscribe to Firebase Auth state
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
   SIGN UP
   ========================================================= */

export async function signUp(email, password, displayName = "") {
  const normalizedEmail = String(email).toLowerCase().trim();
  const cred = await withTimeout(
    createUserWithEmailAndPassword(auth, normalizedEmail, password),
    10000,
    "Sign up",
  );

  if (displayName && cred.user) {
    try {
      await updateProfile(cred.user, { displayName });
    } catch (e) {
      log.warn("Could not set display name:", e);
    }
  }

  return cred.user;
}

/* =========================================================
   SIGN IN
   ========================================================= */

export async function signIn(email, password) {
  const normalizedEmail = String(email).toLowerCase().trim();
  const cred = await withTimeout(
    signInWithEmailAndPassword(auth, normalizedEmail, password),
    10000,
    "Sign in",
  );
  return cred.user;
}

/* =========================================================
   SIGN OUT
   ========================================================= */

export async function signOutNow() {
  await withTimeout(signOut(auth), 6000, "Sign out");
  currentUser = null;
  saveSession(null);
}

/* =========================================================
   PASSWORD RESET
   ========================================================= */

export async function sendPasswordReset(email) {
  const normalizedEmail = String(email).toLowerCase().trim();
  await withTimeout(
    sendPasswordResetEmail(auth, normalizedEmail),
    10000,
    "Send password reset",
  );
}

/* =========================================================
   UPDATE PROFILE
   ========================================================= */

export async function updateDisplayName(name) {
  if (!currentUser) throw new Error("Not signed in.");
  await updateProfile(currentUser, { displayName: name });
  saveSession(currentUser);
}

/* =========================================================
   DELETE ACCOUNT
   ========================================================= */

export async function deleteAccount(password) {
  if (!currentUser) throw new Error("Not signed in.");
  if (!currentUser.email) throw new Error("No email on account.");

  const cred = EmailAuthProvider.credential(currentUser.email, password);
  await reauthenticateWithCredential(currentUser, cred);
  await deleteUser(currentUser);
  currentUser = null;
  saveSession(null);
}

/* =========================================================
   GET ID TOKEN (for API calls that need it)
   ========================================================= */

export async function getIdToken(forceRefresh = false) {
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken(forceRefresh);
  } catch (e) {
    log.warn("Could not get ID token:", e);
    return null;
  }
}
