// js/pages/login.js
// Login controller.

import { signIn, onAuthChange, getCurrentUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import { cacheUser } from "../core/cache.js";
import { toastOk, toastErr } from "../ui/toast.js";
import {
  friendlyFirebaseError,
  isValidEmail,
  log,
  sleep,
} from "../core/utils.js";

const els = {
  email: document.getElementById("loginEmail"),
  password: document.getElementById("loginPassword"),
  remember: document.getElementById("rememberMe"),
  signInBtn: document.getElementById("signInBtn"),
  errorBox: document.getElementById("loginError"),
};

const state = { submitting: false, redirected: false };
const REMEMBER_KEY = "wegem_last_email";
const REDIRECT_DEFAULT = "home.html";

try {
  const savedEmail = localStorage.getItem(REMEMBER_KEY);
  if (savedEmail && els.email) {
    els.email.value = savedEmail;
    if (els.remember) els.remember.checked = true;
    setTimeout(() => els.password?.focus(), 100);
  }
} catch {}

onAuthChange((user) => {
  if (user && !state.redirected && !state.submitting) {
    state.redirected = true;
    setTimeout(() => window.location.replace(getRedirectTarget()), 100);
  }
});

function getRedirectTarget() {
  try {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      const url = new URL(redirect, window.location.origin);
      if (url.origin === window.location.origin) {
        return url.pathname.replace(/^\//, "") + url.search;
      }
    }
  } catch {}
  return REDIRECT_DEFAULT;
}

function showError(msg) {
  if (!els.errorBox) return;
  els.errorBox.textContent = msg;
  els.errorBox.classList.remove("hidden");
  els.errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearError() {
  if (!els.errorBox) return;
  els.errorBox.classList.add("hidden");
  els.errorBox.textContent = "";
}

function validate() {
  const email = (els.email?.value || "").trim().toLowerCase();
  const password = els.password?.value || "";

  if (!email) return { error: "Please enter your email.", field: "email" };
  if (!isValidEmail(email))
    return { error: "Please enter a valid email address.", field: "email" };
  if (!password)
    return { error: "Please enter your password.", field: "password" };
  return { email, password };
}

async function handleSignIn() {
  if (state.submitting) return;
  clearError();

  const validation = validate();
  if (validation.error) {
    showError(validation.error);
    if (validation.field === "email") els.email?.focus();
    else if (validation.field === "password") els.password?.focus();
    return;
  }

  state.submitting = true;
  els.signInBtn.disabled = true;
  const originalText = els.signInBtn.textContent;
  els.signInBtn.textContent = "Signing in…";

  try {
    const user = await signIn(validation.email, validation.password);
    if (!user) throw new Error("Sign in failed.");

    try {
      if (els.remember?.checked)
        localStorage.setItem(REMEMBER_KEY, validation.email);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {}

    try {
      const doc = await getUserDoc(user.uid);
      if (doc) await cacheUser(doc);
    } catch (e) {
      log.warn("Could not fetch user doc:", e);
    }

    els.signInBtn.textContent = "✓ Welcome back!";
    toastOk("Signed in. Redirecting…");

    await sleep(400);
    window.location.replace(getRedirectTarget());
  } catch (error) {
    log.error("Login failed:", error);
    const message = friendlyFirebaseError(error);
    showError(message);
    toastErr(message);
    els.signInBtn.disabled = false;
    els.signInBtn.textContent = originalText;
    state.submitting = false;

    const code = error?.code || "";
    if (
      code.includes("wrong-password") ||
      code.includes("invalid-credential")
    ) {
      els.password?.focus();
      els.password?.select();
    }
  }
}

els.signInBtn?.addEventListener("click", handleSignIn);

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !state.submitting) {
    e.preventDefault();
    handleSignIn();
  }
});

[els.email, els.password].forEach((input) => {
  input?.addEventListener("input", clearError);
});

function init() {
  const current = getCurrentUser();
  if (current) {
    state.redirected = true;
    window.location.replace(getRedirectTarget());
    return;
  }
  log.info("Login page ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
