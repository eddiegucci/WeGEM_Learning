// js/settings.js — WeGEM Learning settings page

import "./wallpaper-init.js";
import {
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  getUser,
  saveUser,
} from "./firebase.js";
import { clearLocalProgress } from "./storage.js";
import { SUBJECTS_BY_CURRICULUM } from "./data.js";

/* =========================================================
   GUARD
   ========================================================= */

let user = getCurrentUser();
if (!user) {
  window.location.href = "login.html";
}

/* =========================================================
   ELEMENTS
   ========================================================= */

const toast = document.getElementById("toast");
const modal = document.getElementById("editModal");
const modalError = document.getElementById("modalError");

/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;
function showToast(msg, kind = "ok") {
  if (!toast) return;
  toast.textContent = msg;
  toast.className = "toast " + (kind === "err" ? "toast-err" : "toast-ok");
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

/* =========================================================
   RENDER PROFILE
   ========================================================= */

function levelLabel() {
  return user.level || user.form || user.grade || "—";
}

function renderProfile() {
  const initial = (user.name || "S").charAt(0).toUpperCase();
  document.getElementById("userAvatar").textContent = initial;
  document.getElementById("userNameTop").textContent = (
    user.name || "Student"
  ).split(" ")[0];
  document.getElementById("bigAvatar").textContent = initial;
  document.getElementById("bigName").textContent = user.name || "Student";
  document.getElementById("bigEmail").textContent = user.email || "—";

  document.getElementById("infoCurriculum").textContent =
    user.curriculum === "CBE" ? "CBE" : "8-4-4";
  document.getElementById("infoLevel").textContent = levelLabel();
  document.getElementById("infoSchool").textContent = user.school || "—";
  document.getElementById("infoAdm").textContent = user.adm || "—";
  document.getElementById("infoStream").textContent = user.stream || "—";

  const subjectsCount = (user.subjects || []).length;
  document.getElementById("infoSubjects").textContent = subjectsCount
    ? `${subjectsCount} selected`
    : "—";

  document.getElementById("currSubText").textContent =
    `Currently: ${user.curriculum === "CBE" ? "CBE" : "8-4-4"}`;
  document.getElementById("levelSubText").textContent =
    `Currently: ${levelLabel()}`;
  document.getElementById("subjectsSubText").textContent = subjectsCount
    ? `${subjectsCount} subjects selected`
    : "No subjects yet";

  // Wallpaper
  try {
    const saved = JSON.parse(localStorage.getItem("wegem_wallpaper") || "null");
    document.getElementById("wallpaperSubText").textContent =
      saved?.name || "World Map & Globe";
  } catch {}
}

/* =========================================================
   SAVE USER — sync to DB + localStorage
   ========================================================= */

async function persistUser(updated) {
  user = { ...user, ...updated };
  setCurrentUser(user);
  renderProfile();

  try {
    const { password, ...safe } = user; // don't overwrite password on partial updates
    await saveUser(user.userId, { ...safe, password: user.password });
    showToast("✓ Saved", "ok");
  } catch (e) {
    console.error(e);
    showToast("Saved locally (sync failed)", "err");
  }
}

/* =========================================================
   EDIT PROFILE MODAL
   ========================================================= */

function openModal() {
  modal.classList.remove("hidden");
  document.getElementById("editName").value = user.name || "";
  document.getElementById("editSchool").value = user.school || "";
  document.getElementById("editAdm").value = user.adm || "";
  document.getElementById("editStream").value = user.stream || "";
  modalError.classList.add("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

document.getElementById("editProfileBtn").addEventListener("click", openModal);
document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
document.getElementById("modalCancelBtn").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

document.getElementById("modalSaveBtn").addEventListener("click", async () => {
  const name = document.getElementById("editName").value.trim();
  const school = document.getElementById("editSchool").value.trim();
  const adm = document.getElementById("editAdm").value.trim();
  const stream = document.getElementById("editStream").value.trim();

  if (!name) {
    modalError.textContent = "Name cannot be empty.";
    modalError.classList.remove("hidden");
    return;
  }

  await persistUser({ name, school, adm, stream });
  closeModal();
});

/* =========================================================
   CURRICULUM SWITCH
   ========================================================= */

document
  .getElementById("switchCurriculumBtn")
  .addEventListener("click", async () => {
    const next = user.curriculum === "CBE" ? "844" : "CBE";
    const nextLabel = next === "CBE" ? "CBE" : "8-4-4";

    if (
      !confirm(
        `Switch to ${nextLabel}? Your subjects will be cleared so you can pick new ones.`,
      )
    )
      return;

    const defaultLevel = next === "CBE" ? "Grade 9" : "Form 4";
    await persistUser({
      curriculum: next,
      level: defaultLevel,
      form: next === "844" ? defaultLevel : "",
      grade: next === "CBE" ? defaultLevel : "",
      subjects: [],
    });

    setTimeout(() => {
      window.location.href = "signup.html";
    }, 500);
  });

/* =========================================================
   LEVEL SWITCH
   ========================================================= */

document
  .getElementById("switchLevelBtn")
  .addEventListener("click", async () => {
    const options =
      user.curriculum === "CBE"
        ? ["Grade 7", "Grade 8", "Grade 9"]
        : ["Form 1", "Form 2", "Form 3", "Form 4"];

    const picked = prompt(
      `Choose a new level:\n\n${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\nEnter the number:`,
      "",
    );

    if (!picked) return;
    const idx = parseInt(picked, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= options.length) {
      showToast("Invalid choice", "err");
      return;
    }

    const newLevel = options[idx];
    await persistUser({
      level: newLevel,
      form: user.curriculum === "844" ? newLevel : "",
      grade: user.curriculum === "CBE" ? newLevel : "",
      subjects: [],
    });

    showToast(`✓ Switched to ${newLevel}`, "ok");
    setTimeout(() => {
      window.location.href = "signup.html";
    }, 700);
  });

/* =========================================================
   SUBJECTS MANAGE
   ========================================================= */

document.getElementById("switchSubjectsBtn").addEventListener("click", () => {
  if (!confirm("You will be taken to the subject picker. Continue?")) return;
  window.location.href = "signup.html";
});

/* =========================================================
   WALLPAPER RESET
   ========================================================= */

document.getElementById("resetWallpaperBtn").addEventListener("click", () => {
  localStorage.removeItem("wegem_wallpaper");
  document.documentElement.style.setProperty(
    "--wallpaper",
    "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1400&q=60&auto=format')",
  );
  document.getElementById("wallpaperSubText").textContent = "World Map & Globe";
  showToast("✓ Wallpaper reset", "ok");
});

/* =========================================================
   SIGN OUT
   ========================================================= */

document.getElementById("signOutBtn").addEventListener("click", () => {
  if (!confirm("Sign out of this device?")) return;
  clearCurrentUser();
  window.location.href = "login.html";
});

/* =========================================================
   CLEAR LOCAL DATA
   ========================================================= */

document.getElementById("clearDataBtn").addEventListener("click", () => {
  if (
    !confirm(
      "Clear local quiz history and cached data?\n\nYour account and Firebase records will stay.",
    )
  )
    return;
  clearLocalProgress();
  showToast("✓ Local data cleared", "ok");
});

/* =========================================================
   DELETE ACCOUNT
   ========================================================= */

document
  .getElementById("deleteAccountBtn")
  .addEventListener("click", async () => {
    const confirmText = prompt(
      "This will permanently delete your account.\n\nType DELETE to confirm:",
    );

    if (confirmText !== "DELETE") {
      if (confirmText !== null) showToast("Cancelled", "ok");
      return;
    }

    try {
      // Firebase: remove user record
      const { db } = await import("./firebase.js");
      // Fallback: just clear local
      clearLocalProgress();
      clearCurrentUser();
      showToast("Account deleted locally", "ok");
      setTimeout(() => {
        window.location.href = "signup.html";
      }, 600);
    } catch (e) {
      console.error(e);
      showToast("Could not delete. Contact support.", "err");
    }
  });

/* =========================================================
   USER MENU (topbar)
   ========================================================= */

document.getElementById("userMenuBtn").addEventListener("click", () => {
  if (confirm(`Signed in as ${user.email}\n\nOK = Sign out`)) {
    clearCurrentUser();
    window.location.href = "login.html";
  }
});

/* =========================================================
   SEARCH (filters cards)
   ========================================================= */

document.getElementById("settingsSearch")?.addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".settings-card").forEach((card) => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(q) ? "" : "none";
  });
});

/* =========================================================
   REFRESH FROM FIREBASE ON LOAD
   ========================================================= */

async function refreshFromFirebase() {
  try {
    const fresh = await getUser(user.userId);
    if (fresh) {
      user = { ...user, ...fresh };
      setCurrentUser(user);
      renderProfile();
    }
  } catch (e) {
    console.warn("Could not refresh from Firebase:", e);
  }
}

/* =========================================================
   INIT
   ========================================================= */

renderProfile();
refreshFromFirebase();
