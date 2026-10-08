// js/pages/settings.js
// Controller for settings.html.

import {
  waitForAuth,
  signOutNow,
  getCachedUser,
  sendPasswordReset,
  deleteAccount,
} from "../core/auth.js";
import { getUserDoc, updateUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
  clearAllCache,
  getWallpaperCache,
  setWallpaperCache,
} from "../core/cache.js";
import { getDefaultWallpaper } from "../data/wallpapers.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr } from "../ui/toast.js";
import {
  confirmDialog,
  promptDialog,
  openModal,
  closeModal,
} from "../ui/modal.js";
import {
  escapeHTML,
  firstName,
  initials,
  log,
  lsGet,
  lsSet,
  lsRemove,
} from "../core/utils.js";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  user: null,
  userDoc: null,
  saving: false,
};

const WALLPAPER_KEY = "wegem_wallpaper";

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),

  profileAvatar: document.getElementById("profileAvatar"),
  profileName: document.getElementById("profileName"),
  profileEmail: document.getElementById("profileEmail"),

  infoCurriculum: document.getElementById("infoCurriculum"),
  infoLevel: document.getElementById("infoLevel"),
  infoSchool: document.getElementById("infoSchool"),
  infoAdm: document.getElementById("infoAdm"),
  infoStream: document.getElementById("infoStream"),
  infoSubjects: document.getElementById("infoSubjects"),

  editProfileBtn: document.getElementById("editProfileBtn"),
  resetWallpaperBtn: document.getElementById("resetWallpaperBtn"),
  wallpaperSubText: document.getElementById("wallpaperSubText"),

  changePasswordBtn: document.getElementById("changePasswordBtn"),
  clearDataBtn: document.getElementById("clearDataBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  deleteAccountBtn: document.getElementById("deleteAccountBtn"),

  // Modal
  editModal: document.getElementById("editModal"),
  modalError: document.getElementById("modalError"),
  editName: document.getElementById("editName"),
  editSchool: document.getElementById("editSchool"),
  editAdm: document.getElementById("editAdm"),
  editStream: document.getElementById("editStream"),
  modalCloseBtn: document.getElementById("modalCloseBtn"),
  modalCancelBtn: document.getElementById("modalCancelBtn"),
  modalSaveBtn: document.getElementById("modalSaveBtn"),
};

/* =========================================================
   SETUP USER
   ========================================================= */

async function setupUser() {
  const user = await waitForAuth();
  if (!user) {
    window.location.replace("login.html");
    return false;
  }

  state.user = user;

  try {
    let doc = await getCachedUserFromIDB(user.uid);
    if (!doc) {
      doc = await getUserDoc(user.uid);
      if (doc) await cacheUser(doc);
    }
    state.userDoc = doc;
  } catch (e) {
    log.warn("Could not load user doc:", e);
  }

  return true;
}

/* =========================================================
   RENDER PROFILE
   ========================================================= */

function renderProfile() {
  const doc = state.userDoc;
  const user = state.user;

  const displayName =
    doc?.name || user?.displayName || user?.email?.split("@")[0] || "Student";
  const email = doc?.email || user?.email || "—";

  // Top nav
  if (els.userAvatar) els.userAvatar.textContent = initials(displayName);
  if (els.userNameTop) els.userNameTop.textContent = firstName(displayName);

  // Profile card
  if (els.profileAvatar) els.profileAvatar.textContent = initials(displayName);
  if (els.profileName) els.profileName.textContent = displayName;
  if (els.profileEmail) els.profileEmail.textContent = email;

  // Info grid
  if (els.infoCurriculum)
    els.infoCurriculum.textContent =
      doc?.curriculum === "CBE" ? "CBE" : "8-4-4";
  if (els.infoLevel) els.infoLevel.textContent = doc?.level || "—";
  if (els.infoSchool) els.infoSchool.textContent = doc?.school || "—";
  if (els.infoAdm) els.infoAdm.textContent = doc?.adm || "—";
  if (els.infoStream) els.infoStream.textContent = doc?.stream || "—";
  if (els.infoSubjects) {
    const count = (doc?.subjects || []).length;
    els.infoSubjects.textContent = count ? `${count} selected` : "—";
  }
}

/* =========================================================
   WALLPAPER
   ========================================================= */

function renderWallpaperLabel() {
  if (!els.wallpaperSubText) return;
  const saved = lsGet(WALLPAPER_KEY, null);
  els.wallpaperSubText.textContent = saved?.name || "World Map & Globe";
}

async function handleResetWallpaper() {
  const ok = await confirmDialog({
    title: "Reset wallpaper?",
    message: "Return to the default background.",
    okLabel: "Reset",
    cancelLabel: "Cancel",
  });

  if (!ok) return;

  const def = getDefaultWallpaper();
  lsRemove(WALLPAPER_KEY);
  try {
    await setWallpaperCache(def);
  } catch {}
  document.documentElement.style.setProperty(
    "--wallpaper",
    `url('${def.url}')`,
  );
  renderWallpaperLabel();
  toastOk("Wallpaper reset");
}

/* =========================================================
   EDIT PROFILE MODAL
   ========================================================= */

function openEditModal() {
  if (!state.userDoc) {
    toastErr("Profile not loaded yet.");
    return;
  }

  if (els.editName) els.editName.value = state.userDoc.name || "";
  if (els.editSchool) els.editSchool.value = state.userDoc.school || "";
  if (els.editAdm) els.editAdm.value = state.userDoc.adm || "";
  if (els.editStream) els.editStream.value = state.userDoc.stream || "";
  clearModalError();

  els.editModal?.classList.remove("hidden");
  setTimeout(() => els.editName?.focus(), 100);
}

function closeEditModal() {
  els.editModal?.classList.add("hidden");
  clearModalError();
}

function clearModalError() {
  if (!els.modalError) return;
  els.modalError.classList.add("hidden");
  els.modalError.textContent = "";
}

function showModalError(msg) {
  if (!els.modalError) return;
  els.modalError.textContent = msg;
  els.modalError.classList.remove("hidden");
}

async function saveProfile() {
  if (state.saving) return;

  const name = (els.editName?.value || "").trim();
  const school = (els.editSchool?.value || "").trim();
  const adm = (els.editAdm?.value || "").trim();
  const stream = (els.editStream?.value || "").trim();

  if (!name) return showModalError("Name cannot be empty.");
  if (name.length < 2) return showModalError("Name is too short.");

  state.saving = true;
  els.modalSaveBtn.disabled = true;
  els.modalSaveBtn.textContent = "Saving…";

  try {
    await updateUserDoc(state.user.uid, { name, school, adm, stream });

    // Update cached
    state.userDoc = { ...state.userDoc, name, school, adm, stream };
    try {
      await cacheUser(state.userDoc);
    } catch {}

    renderProfile();
    closeEditModal();
    toastOk("Profile updated");
  } catch (e) {
    log.error("Save failed:", e);
    showModalError(e.message || "Could not save. Try again.");
  } finally {
    state.saving = false;
    els.modalSaveBtn.disabled = false;
    els.modalSaveBtn.textContent = "Save Changes";
  }
}

/* =========================================================
   CHANGE PASSWORD
   ========================================================= */

async function handleChangePassword() {
  const email = state.userDoc?.email || state.user?.email;
  if (!email) {
    return toastErr("No email on account.");
  }

  const ok = await confirmDialog({
    title: "Send reset email?",
    message: `We'll send a password reset link to:\n\n${email}`,
    okLabel: "Send",
    cancelLabel: "Cancel",
  });

  if (!ok) return;

  try {
    await sendPasswordReset(email);
    toastOk("Reset email sent. Check your inbox.");
  } catch (e) {
    log.error("Password reset failed:", e);
    toastErr(e.message || "Could not send reset email.");
  }
}

/* =========================================================
   CLEAR LOCAL DATA
   ========================================================= */

async function handleClearData() {
  const ok = await confirmDialog({
    title: "Clear local data?",
    message:
      "Cached notes, attempts, and downloads will be removed from this device.\n\nYour account stays signed in.",
    okLabel: "Clear",
    cancelLabel: "Cancel",
    danger: true,
  });

  if (!ok) return;

  try {
    await clearAllCache();
    toastOk("Local data cleared");
  } catch (e) {
    log.warn("Clear failed:", e);
    toastErr("Could not clear data.");
  }
}

/* =========================================================
   SIGN OUT
   ========================================================= */

async function handleSignOut() {
  const ok = await confirmDialog({
    title: "Sign out?",
    message: "You'll need to sign in again to continue.",
    okLabel: "Sign Out",
    cancelLabel: "Stay",
    danger: true,
  });

  if (!ok) return;

  try {
    await signOutNow();
    window.location.replace("login.html");
  } catch (e) {
    log.error("Sign out failed:", e);
    toastErr("Could not sign out.");
  }
}

/* =========================================================
   DELETE ACCOUNT
   ========================================================= */

async function handleDeleteAccount() {
  const confirmText = await promptDialog({
    title: "⚠️ Delete Account",
    label:
      "This permanently deletes your account, progress, and all data.\n\nType DELETE to confirm:",
    placeholder: "DELETE",
    okLabel: "Delete Forever",
    type: "text",
  });

  if (confirmText !== "DELETE") {
    if (confirmText !== null && confirmText !== "") {
      toastErr("Cancelled — you must type DELETE exactly.");
    }
    return;
  }

  const password = await promptDialog({
    title: "Confirm password",
    label: "Enter your password to confirm deletion:",
    placeholder: "Your password",
    okLabel: "Delete",
    type: "password",
  });

  if (!password) return;

  try {
    // Clear local data first
    await clearAllCache().catch(() => {});
    lsRemove(WALLPAPER_KEY);

    // Delete Firebase Auth account
    await deleteAccount(password);

    toastOk("Account deleted. Goodbye 👋");
    setTimeout(() => window.location.replace("signup.html"), 800);
  } catch (e) {
    log.error("Delete account failed:", e);
    if (
      e.code === "auth/wrong-password" ||
      e.code === "auth/invalid-credential"
    ) {
      toastErr("Wrong password.");
    } else if (e.code === "auth/requires-recent-login") {
      toastErr("Please sign out and sign back in, then try again.");
    } else {
      toastErr(e.message || "Could not delete account.");
    }
  }
}

/* =========================================================
   USER MENU (top nav)
   ========================================================= */

async function handleUserMenu() {
  const ok = await confirmDialog({
    title: "Sign out?",
    message: `Signed in as ${state.user?.email || "Student"}.\n\nDo you want to sign out?`,
    okLabel: "Sign Out",
    cancelLabel: "Stay",
    danger: true,
  });

  if (ok) {
    try {
      await signOutNow();
      window.location.replace("login.html");
    } catch (e) {
      log.error("Sign out failed:", e);
      toastErr("Could not sign out.");
    }
  }
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  try {
    const ready = await setupUser();
    if (!ready) return;

    initNav();
    renderProfile();
    renderWallpaperLabel();

    // Wire buttons
    els.userMenuBtn?.addEventListener("click", handleUserMenu);
    els.editProfileBtn?.addEventListener("click", openEditModal);
    els.resetWallpaperBtn?.addEventListener("click", handleResetWallpaper);
    els.changePasswordBtn?.addEventListener("click", handleChangePassword);
    els.clearDataBtn?.addEventListener("click", handleClearData);
    els.signOutBtn?.addEventListener("click", handleSignOut);
    els.deleteAccountBtn?.addEventListener("click", handleDeleteAccount);

    // Modal wiring
    els.modalCloseBtn?.addEventListener("click", closeEditModal);
    els.modalCancelBtn?.addEventListener("click", closeEditModal);
    els.editModal?.addEventListener("click", (e) => {
      if (e.target === els.editModal) closeEditModal();
    });
    els.modalSaveBtn?.addEventListener("click", saveProfile);

    // ESC closes modal
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        els.editModal &&
        !els.editModal.classList.contains("hidden")
      ) {
        closeEditModal();
      }
    });

    log.info("Settings page ready");
  } catch (e) {
    log.error("Settings init failed:", e);
    toastErr("Could not load settings.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
