// js/pages/forgot-password.js
// Controller for forgot-password.html.

import { sendPasswordReset, onAuthChange } from "../core/auth.js";
import { toastOk, toastErr } from "../ui/toast.js";
import {
  friendlyFirebaseError,
  isValidEmail,
  log,
  sleep,
} from "../core/utils.js";

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  formView: document.getElementById("formView"),
  successView: document.getElementById("successView"),
  emailInput: document.getElementById("resetEmail"),
  resetBtn: document.getElementById("resetBtn"),
  errorBox: document.getElementById("resetError"),
  sentToEmail: document.getElementById("sentToEmail"),
  retryBtn: document.getElementById("retryBtn"),
};

/* =========================================================
   STATE
   ========================================================= */

const state = {
  submitting: false,
  cooldownUntil: 0, // prevents spamming — 60 second cooldown
  lastEmail: "",
};

const COOLDOWN_MS = 60 * 1000;

/* =========================================================
   IF ALREADY SIGNED IN — go home
   ========================================================= */

onAuthChange((user) => {
  if (user) {
    window.location.replace("home.html");
  }
});

/* =========================================================
   ERROR HELPERS
   ========================================================= */

function showError(msg) {
  if (!els.errorBox) return;
  els.errorBox.textContent = msg;
  els.errorBox.classList.remove("hidden");
}

function clearError() {
  if (!els.errorBox) return;
  els.errorBox.classList.add("hidden");
  els.errorBox.textContent = "";
}

/* =========================================================
   VIEW SWITCHING
   ========================================================= */

function showFormView() {
  els.formView?.classList.remove("hidden");
  els.successView?.classList.add("hidden");
  clearError();
  setTimeout(() => els.emailInput?.focus(), 100);
}

function showSuccessView(email) {
  if (els.sentToEmail) els.sentToEmail.textContent = email;
  els.formView?.classList.add("hidden");
  els.successView?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   BUTTON STATE
   ========================================================= */

function setButtonLoading(loading, text = null) {
  if (!els.resetBtn) return;
  els.resetBtn.disabled = loading;
  els.resetBtn.textContent = loading ? text || "Sending…" : "Send Reset Link →";
}

function startCooldown() {
  state.cooldownUntil = Date.now() + COOLDOWN_MS;
  const interval = setInterval(() => {
    const remaining = Math.ceil((state.cooldownUntil - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(interval);
      setButtonLoading(false);
      return;
    }
    setButtonLoading(true, `Try again in ${remaining}s`);
  }, 1000);
}

/* =========================================================
   SUBMIT
   ========================================================= */

async function handleReset() {
  if (state.submitting) return;

  // Cooldown check
  if (Date.now() < state.cooldownUntil) {
    const remaining = Math.ceil((state.cooldownUntil - Date.now()) / 1000);
    return showError(`Please wait ${remaining}s before trying again.`);
  }

  clearError();

  const email = (els.emailInput?.value || "").trim().toLowerCase();

  if (!email) {
    return showError("Please enter your email address.");
  }
  if (!isValidEmail(email)) {
    return showError("Please enter a valid email address.");
  }

  state.submitting = true;
  state.lastEmail = email;
  setButtonLoading(true);

  try {
    await sendPasswordReset(email);

    toastOk("Reset email sent. Check your inbox.");
    state.submitting = false;
    startCooldown();
    showSuccessView(email);
  } catch (error) {
    log.error("Password reset failed:", error);
    const message = friendlyFirebaseError(error);
    showError(message);
    toastErr(message);
    setButtonLoading(false);
    state.submitting = false;
  }
}

/* =========================================================
   RETRY
   ========================================================= */

function handleRetry() {
  showFormView();
  if (state.lastEmail && els.emailInput) {
    els.emailInput.value = state.lastEmail;
  }
}

/* =========================================================
   EVENT WIRING
   ========================================================= */

els.resetBtn?.addEventListener("click", handleReset);
els.retryBtn?.addEventListener("click", handleRetry);

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !state.submitting) {
    e.preventDefault();
    handleReset();
  }
});

// Clear error on typing
els.emailInput?.addEventListener("input", clearError);

/* =========================================================
   INIT
   ========================================================= */

function init() {
  // If URL has ?email=..., prefill
  try {
    const params = new URLSearchParams(window.location.search);
    const prefEmail = params.get("email");
    if (prefEmail && els.emailInput) els.emailInput.value = prefEmail;
  } catch {}

  log.info("Forgot password page ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
