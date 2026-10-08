// js/core/router.js
// Route guards and navigation for WeGEM Learning.

import { getCurrentUser, getCachedUser, waitForAuth } from "./auth.js";
import { getUserDoc } from "./db.js";
import { cacheUser, getCachedUser as getCachedUserFromIDB } from "./cache.js";
import { log, isOnline } from "./utils.js";

/* =========================================================
   PAGE ROLES
   ========================================================= */

const PAGE_ROLES = {
  "signup.html": "guest",
  "login.html": "guest",
  "forgot-password.html": "guest",
  "index.html": "any",
  "intro.html": "any",
  "home.html": "user",
  "notes.html": "user",
  "exams.html": "user",
  "quiz.html": "user",
  "compete.html": "user",
  "leaderboard.html": "user",
  "progress.html": "user",
  "wallpapers.html": "user",
  "settings.html": "user",
  "admin.html": "admin",
};

const DEFAULT_AFTER_LOGIN = "home.html";
const DEFAULT_AFTER_LOGOUT = "login.html";

/* =========================================================
   GET CURRENT PAGE
   ========================================================= */

export function getCurrentPage() {
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  return last || "index.html";
}

/* =========================================================
   ROLE CHECK
   ========================================================= */

function getRequiredRole(page) {
  if (PAGE_ROLES[page]) return PAGE_ROLES[page];
  if (page.startsWith("admin")) return "admin";
  return "user";
}

async function checkUserRole(user) {
  if (!user) return null;
  if (!isOnline()) {
    const cached = await getCachedUserFromIDB(user.uid);
    return cached?.role || "student";
  }
  try {
    const doc = await getUserDoc(user.uid);
    if (doc) {
      await cacheUser(doc);
      return doc.role || "student";
    }
    return "student";
  } catch (e) {
    log.warn("Could not fetch user role, using cache:", e);
    const cached = await getCachedUserFromIDB(user.uid);
    return cached?.role || "student";
  }
}

/* =========================================================
   GUARD — call on every protected page
   ========================================================= */

export async function guardPage() {
  const page = getCurrentPage();
  const requiredRole = getRequiredRole(page);

  // Public pages
  if (requiredRole === "any") return { ok: true };

  // Wait for auth to be ready
  const user = await waitForAuth();

  // Guest-only pages (login, signup)
  if (requiredRole === "guest") {
    if (user) {
      window.location.href = DEFAULT_AFTER_LOGIN;
      return { ok: false, redirecting: true };
    }
    return { ok: true, user: null };
  }

  // User/admin pages require login
  if (!user) {
    const redirect = encodeURIComponent(page + window.location.search);
    window.location.href = `login.html?redirect=${redirect}`;
    return { ok: false, redirecting: true };
  }

  // Admin pages require admin role
  if (requiredRole === "admin") {
    const role = await checkUserRole(user);
    if (role !== "admin") {
      window.location.href = DEFAULT_AFTER_LOGIN;
      return { ok: false, redirecting: true };
    }
  }

  return { ok: true, user };
}

/* =========================================================
   NAVIGATION HELPERS
   ========================================================= */

export function goTo(url, replace = false) {
  if (replace) window.location.replace(url);
  else window.location.href = url;
}

export function goBack(fallback = DEFAULT_AFTER_LOGIN) {
  if (window.history.length > 1) window.history.back();
  else goTo(fallback);
}

export function redirectAfterLogin() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (redirect && isSafeRedirect(redirect)) return redirect;
  return DEFAULT_AFTER_LOGIN;
}

function isSafeRedirect(url) {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function redirectAfterLogout() {
  return DEFAULT_AFTER_LOGOUT;
}

/* =========================================================
   REQUIRE USER — throws if not signed in
   ========================================================= */

export async function requireUser() {
  const user = await waitForAuth();
  if (!user) {
    const redirect = encodeURIComponent(
      getCurrentPage() + window.location.search,
    );
    goTo(`login.html?redirect=${redirect}`, true);
    throw new Error("Not signed in");
  }
  return user;
}

/* =========================================================
   GET CURRENT USER (with fallback to cache)
   ========================================================= */

export async function getUserWithCache() {
  const fresh = getCurrentUser();
  if (fresh) return fresh;

  const cached = getCachedUser();
  if (cached) return cached;

  await waitForAuth();
  return getCurrentUser();
}

/* =========================================================
   REDIRECT IF SIGNED IN (for login/signup pages)
   ========================================================= */

export async function redirectIfSignedIn() {
  const user = await waitForAuth();
  if (user) {
    goTo(redirectAfterLogin(), true);
    return true;
  }
  return false;
}

/* =========================================================
   SET ACTIVE NAV LINK
   ========================================================= */

export function markActiveNavLink() {
  const current = getCurrentPage();
  document.querySelectorAll(".top-nav-links a").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    if (href === current) link.classList.add("active");
    else link.classList.remove("active");
  });
}
