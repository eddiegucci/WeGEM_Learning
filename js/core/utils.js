// js/core/utils.js
// Pure utility functions for WeGEM Learning.

/* =========================================================
   DOM HELPERS
   ========================================================= */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "style" && typeof value === "object")
      Object.assign(node.style, value);
    else if (key === "dataset" && typeof value === "object")
      Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== null && value !== undefined && value !== false) {
      node.setAttribute(key, value);
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  }
  return node;
}

export function show(node) {
  if (!node) return;
  node.classList.remove("hidden");
  node.removeAttribute("aria-hidden");
}

export function hide(node) {
  if (!node) return;
  node.classList.add("hidden");
  node.setAttribute("aria-hidden", "true");
}

export function setHTML(node, html) {
  if (!node) return;
  node.innerHTML = html;
}

/* =========================================================
   STRING HELPERS
   ========================================================= */

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function escapeAttr(str) {
  return escapeHTML(str);
}

export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function titleCase(str) {
  if (!str) return "";
  return String(str)
    .split(" ")
    .map((w) => capitalize(w.toLowerCase()))
    .join(" ");
}

export function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function firstName(name) {
  if (!name) return "Student";
  return String(name).trim().split(/\s+/)[0];
}

export function slugify(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str, max = 60) {
  if (!str) return "";
  const s = String(str);
  return s.length > max ? s.slice(0, max).trimEnd() + "…" : s;
}

export function makeUserId(email) {
  if (!email) return "guest_" + Date.now();
  return String(email)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_");
}

/* =========================================================
   TIME HELPERS
   ========================================================= */

export function timeAgo(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return diff + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 172800) return "yesterday";
  if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDate(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateString(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return d.toDateString();
}

export function todayString() {
  return new Date().toDateString();
}

export function isToday(dateInput) {
  return toDateString(dateInput) === todayString();
}

/* =========================================================
   NUMBER HELPERS
   ========================================================= */

export function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

export function formatNumber(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString();
}

export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* =========================================================
   ARRAY HELPERS
   ========================================================= */

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function unique(arr) {
  return Array.from(new Set(arr));
}

export function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function sortBy(arr, keyFn, direction = "asc") {
  const sorted = [...arr].sort((a, b) => {
    const av = keyFn(a);
    const bv = keyFn(b);
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}

/* =========================================================
   ASYNC HELPERS
   ========================================================= */

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withTimeout(promise, ms = 8000, label = "Operation") {
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

export function debounce(fn, wait = 250) {
  let t;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function throttle(fn, wait = 250) {
  let last = 0;
  let timeout;
  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      clearTimeout(timeout);
      last = now;
      fn.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        last = Date.now();
        timeout = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/* =========================================================
   STORAGE HELPERS (localStorage with JSON)
   ========================================================= */

export function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function lsRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function lsClearAll() {
  try {
    localStorage.clear();
  } catch {}
}

/* =========================================================
   URL HELPERS
   ========================================================= */

export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function setParam(name, value, replace = true) {
  const url = new URL(window.location.href);
  if (value === null || value === undefined || value === "") {
    url.searchParams.delete(name);
  } else {
    url.searchParams.set(name, value);
  }
  if (replace) window.history.replaceState({}, "", url);
  else window.history.pushState({}, "", url);
}

export function buildQuery(params) {
  const url = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") url.set(k, v);
  }
  const str = url.toString();
  return str ? "?" + str : "";
}

export function goTo(url) {
  window.location.href = url;
}

export function reload() {
  window.location.reload();
}

/* =========================================================
   VALIDATION HELPERS
   ========================================================= */

export function isValidEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim());
}

export function isValidURL(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isNonEmpty(str) {
  return typeof str === "string" && str.trim().length > 0;
}

export function isPasswordStrong(pwd) {
  return typeof pwd === "string" && pwd.length >= 6;
}

/* =========================================================
   DEVICE HELPERS
   ========================================================= */

export function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function isMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

export function isOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function onOnline(callback) {
  window.addEventListener("online", callback);
}

export function onOffline(callback) {
  window.addEventListener("offline", callback);
}

/* =========================================================
   ERROR HELPERS
   ========================================================= */

export function friendlyFirebaseError(error) {
  if (!error) return "Something went wrong. Try again.";
  const code = error.code || error.message || "";

  if (code.includes("auth/email-already-in-use"))
    return "That email is already registered.";
  if (code.includes("auth/invalid-email")) return "Please enter a valid email.";
  if (code.includes("auth/weak-password"))
    return "Password must be at least 6 characters.";
  if (code.includes("auth/user-not-found"))
    return "No account with that email.";
  if (code.includes("auth/wrong-password")) return "Incorrect password.";
  if (code.includes("auth/invalid-credential"))
    return "Incorrect email or password.";
  if (code.includes("auth/too-many-requests"))
    return "Too many attempts. Wait a minute.";
  if (code.includes("auth/network-request-failed"))
    return "Network error. Check your connection.";
  if (code.includes("auth/requires-recent-login"))
    return "Please sign in again to continue.";
  if (code.includes("permission-denied"))
    return "You don't have permission for this action.";
  if (code.includes("not-found")) return "Not found.";
  if (code.includes("unavailable")) return "Service temporarily unavailable.";
  if (code.includes("timeout"))
    return "Request timed out. Check your connection.";

  return error.message || "Something went wrong. Try again.";
}

/* =========================================================
   LOGGER (only logs in development)
   ========================================================= */

const IS_DEV = (() => {
  try {
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.protocol === "file:"
    );
  } catch {
    return false;
  }
})();

export const log = {
  info(...args) {
    if (IS_DEV) console.log("[WeGEM]", ...args);
  },
  warn(...args) {
    if (IS_DEV) console.warn("[WeGEM]", ...args);
  },
  error(...args) {
    console.error("[WeGEM]", ...args);
  },
};
