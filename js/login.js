// js/login.js — WeGEM Learning login

import "./wallpaper-init.js";
import {
  loginUser,
  getUser,
  setCurrentUser,
  getCurrentUser,
} from "./firebase.js";

/* =========================================================
   GUARD — if already signed in, skip to dashboard
   ========================================================= */

if (getCurrentUser()) {
  window.location.href = "home.html";
}

/* =========================================================
   ELEMENTS
   ========================================================= */

const emailEl = document.getElementById("loginEmail");
const passwordEl = document.getElementById("loginPassword");
const rememberEl = document.getElementById("rememberMe");
const signInBtn = document.getElementById("signInBtn");
const errorEl = document.getElementById("loginError");
const forgotLink = document.getElementById("forgotLink");

/* =========================================================
   HELPERS
   ========================================================= */

function showError(msg) {
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
  errorEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearError() {
  if (!errorEl) return;
  errorEl.classList.add("hidden");
  errorEl.textContent = "";
}

/* =========================================================
   PRE-FILL SAVED EMAIL
   ========================================================= */

try {
  const savedEmail = localStorage.getItem("wegem_last_email");
  if (savedEmail && emailEl) emailEl.value = savedEmail;
} catch {}

/* =========================================================
   SIGN IN
   ========================================================= */

async function signIn() {
  clearError();

  const email = (emailEl?.value || "").trim().toLowerCase();
  const password = passwordEl?.value || "";

  if (!email) {
    showError("Please enter your email.");
    emailEl?.focus();
    return;
  }
  if (!email.includes("@") || !email.includes(".")) {
    showError("Please enter a valid email address.");
    emailEl?.focus();
    return;
  }
  if (!password) {
    showError("Please enter your password.");
    passwordEl?.focus();
    return;
  }

  // Loading state
  signInBtn.disabled = true;
  const originalText = signInBtn.textContent;
  signInBtn.textContent = "Signing in…";

  try {
    const user = await loginUser(email, password);

    // Remember email
    try {
      if (rememberEl?.checked) {
        localStorage.setItem("wegem_last_email", email);
      } else {
        localStorage.removeItem("wegem_last_email");
      }
    } catch {}

    // Fetch full user record from DB
    let fullUser = user;
    try {
      const fresh = await getUser(user.userId);
      if (fresh) {
        fullUser = { ...user, ...fresh };
      }
    } catch (e) {
      console.warn("Could not fetch full user record, using cached:", e);
    }

    setCurrentUser(fullUser);

    signInBtn.textContent = "✓ Welcome back!";
    setTimeout(() => {
      window.location.href = "home.html";
    }, 450);
  } catch (e) {
    console.error("Sign in failed:", e);
    const msg = friendlyError(e);
    showError(msg);
    signInBtn.disabled = false;
    signInBtn.textContent = originalText;
  }
}

function friendlyError(e) {
  const code = e?.code || e?.message || "";
  if (
    code.includes("not-found") ||
    code.includes("no user") ||
    code.includes("not registered")
  ) {
    return "No account found with that email. Try creating one.";
  }
  if (
    code.includes("password") ||
    code.includes("invalid-credential") ||
    code.includes("wrong")
  ) {
    return "Incorrect password. Please try again.";
  }
  if (code.includes("timeout")) {
    return "Connection timed out. Check your internet and try again.";
  }
  return e?.message || "Could not sign in. Please try again.";
}

/* =========================================================
   BUTTON + ENTER KEY
   ========================================================= */

signInBtn.addEventListener("click", signIn);

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !signInBtn.disabled) {
    e.preventDefault();
    signIn();
  }
});

/* =========================================================
   FORGOT PASSWORD (placeholder)
   ========================================================= */

forgotLink?.addEventListener("click", (e) => {
  e.preventDefault();
  alert(
    "Password reset coming soon.\n\n" +
      "For now, contact support at eddiegucci08@gmail.com " +
      "with your registered email address and we will reset it manually.",
  );
});
