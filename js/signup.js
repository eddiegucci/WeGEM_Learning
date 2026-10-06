// js/signup.js — WeGEM Learning signup flow

import "./wallpaper-init.js";
import {
  saveUser,
  setCurrentUser,
  makeUserId,
  hashPassword,
  getCurrentUser,
} from "./firebase.js";
import { SUBJECTS_BY_CURRICULUM } from "./data.js";

/* =========================================================
   GUARD — if already signed in, skip to dashboard
   ========================================================= */

if (getCurrentUser()) {
  window.location.href = "home.html";
}

/* =========================================================
   STATE
   ========================================================= */

const state = {
  step: 1,
  curriculum: null, // '844' or 'CBE'
  level: null, // 'Form 1'..'Form 4' OR 'Grade 7'..'Grade 9'
  subjects: [], // array of subject names
  name: "",
  school: "",
  adm: "",
  stream: "",
  email: "",
  password: "",
};

/* =========================================================
   ELEMENTS
   ========================================================= */

const stepSections = {
  1: document.getElementById("step1"),
  2: document.getElementById("step2"),
  3: document.getElementById("step3"),
  4: document.getElementById("step4"),
};

const stepDots = document.querySelectorAll(".step-dot");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const errorEl = document.getElementById("signupError");

const levelGrid = document.getElementById("levelGrid");
const levelTitle = document.getElementById("levelTitle");
const levelSub = document.getElementById("levelSub");

const subjectsGrid = document.getElementById("subjectsGrid");
const subjectCount = document.getElementById("subjectCount");
const selectAllBtn = document.getElementById("selectAllBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

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

function setStep(n) {
  state.step = n;

  Object.entries(stepSections).forEach(([num, el]) => {
    if (!el) return;
    el.classList.toggle("hidden", parseInt(num, 10) !== n);
  });

  stepDots.forEach((dot) => {
    const dotStep = parseInt(dot.dataset.step, 10);
    dot.classList.toggle("active", dotStep === n);
    dot.classList.toggle("done", dotStep < n);
  });

  backBtn.disabled = n === 1;
  nextBtn.textContent = n === 4 ? "Create Account →" : "Continue →";
  nextBtn.disabled =
    (n === 1 && !state.curriculum) ||
    (n === 2 && !state.level) ||
    (n === 3 && state.subjects.length === 0);
  clearError();

  const card = document.querySelector(".signup-card");
  if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =========================================================
   STEP 1 — CURRICULUM
   ========================================================= */

document.querySelectorAll(".curriculum-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = btn.dataset.curriculum;

    document
      .querySelectorAll(".curriculum-btn")
      .forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    state.curriculum = value;
    state.level = null;
    state.subjects = [];

    nextBtn.disabled = false;

    if (value === "844") {
      levelTitle.textContent = "Which form are you in?";
      levelSub.textContent = "Pick your current form to see relevant subjects.";
    } else {
      levelTitle.textContent = "Which grade are you in?";
      levelSub.textContent =
        "Pick your current grade to see relevant subjects.";
    }

    setTimeout(() => {
      renderLevelGrid();
      setStep(2);
    }, 300);
  });
});

/* =========================================================
   STEP 2 — LEVEL
   ========================================================= */

function renderLevelGrid() {
  if (!levelGrid) return;

  const options =
    state.curriculum === "844"
      ? ["Form 1", "Form 2", "Form 3", "Form 4"]
      : ["Grade 7", "Grade 8", "Grade 9"];

  levelGrid.innerHTML = options
    .map(
      (opt) => `
    <button class="level-btn${state.level === opt ? " selected" : ""}" data-level="${opt}" type="button">
      ${opt}
    </button>
  `,
    )
    .join("");

  levelGrid.querySelectorAll(".level-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      levelGrid
        .querySelectorAll(".level-btn")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");

      state.level = btn.dataset.level;
      state.subjects = [];

      nextBtn.disabled = false;

      setTimeout(() => {
        renderSubjectsGrid();
        setStep(3);
      }, 250);
    });
  });
}

/* =========================================================
   STEP 3 — SUBJECTS
   ========================================================= */

function getSubjectsForLevel() {
  if (!state.curriculum || !state.level) return [];
  const byCurriculum = SUBJECTS_BY_CURRICULUM[state.curriculum] || {};
  return byCurriculum[state.level] || [];
}

function renderSubjectsGrid() {
  if (!subjectsGrid) return;

  const subjects = getSubjectsForLevel();
  subjectsGrid.innerHTML = subjects
    .map(
      (s) => `
    <button class="subject-toggle" data-subject="${s}" type="button">
      <span class="st-check">✓</span>
      <span class="st-name">${s}</span>
    </button>
  `,
    )
    .join("");

  subjectsGrid.querySelectorAll(".subject-toggle").forEach((btn) => {
    if (state.subjects.includes(btn.dataset.subject)) {
      btn.classList.add("selected");
    }

    btn.addEventListener("click", () => {
      const name = btn.dataset.subject;
      const idx = state.subjects.indexOf(name);

      if (idx === -1) {
        state.subjects.push(name);
        btn.classList.add("selected");
      } else {
        state.subjects.splice(idx, 1);
        btn.classList.remove("selected");
      }

      updateSubjectCount();
    });
  });

  updateSubjectCount();
}

function updateSubjectCount() {
  if (subjectCount) subjectCount.textContent = state.subjects.length;
  nextBtn.disabled = state.subjects.length === 0;
}

selectAllBtn?.addEventListener("click", () => {
  const all = getSubjectsForLevel();
  state.subjects = [...all];
  subjectsGrid
    .querySelectorAll(".subject-toggle")
    .forEach((btn) => btn.classList.add("selected"));
  updateSubjectCount();
});

clearAllBtn?.addEventListener("click", () => {
  state.subjects = [];
  subjectsGrid
    .querySelectorAll(".subject-toggle")
    .forEach((btn) => btn.classList.remove("selected"));
  updateSubjectCount();
});

/* =========================================================
   STEP 4 — DETAILS
   ========================================================= */

function readDetailsForm() {
  return {
    name: document.getElementById("fullName")?.value.trim() || "",
    school: document.getElementById("school")?.value.trim() || "",
    adm: document.getElementById("adm")?.value.trim() || "",
    stream: document.getElementById("stream")?.value.trim() || "",
    email: document.getElementById("email")?.value.trim().toLowerCase() || "",
    password: document.getElementById("password")?.value || "",
  };
}

/* =========================================================
   BACK / NEXT
   ========================================================= */

backBtn.addEventListener("click", () => {
  if (state.step > 1) setStep(state.step - 1);
});

nextBtn.addEventListener("click", async () => {
  clearError();

  /* STEP 1 */
  if (state.step === 1) {
    if (!state.curriculum)
      return showError("Please choose a curriculum to continue.");
    renderLevelGrid();
    setStep(2);
    return;
  }

  /* STEP 2 */
  if (state.step === 2) {
    if (!state.level) return showError("Please pick your form or grade.");
    renderSubjectsGrid();
    setStep(3);
    return;
  }

  /* STEP 3 */
  if (state.step === 3) {
    if (!state.subjects.length)
      return showError("Select at least one subject.");
    setStep(4);
    return;
  }

  /* STEP 4 — create account */
  if (state.step === 4) {
    const details = readDetailsForm();

    if (!details.name) return showError("Please enter your full name.");
    if (!details.school) return showError("Please enter your school.");
    if (!details.email) return showError("Please enter your email.");
    if (!details.email.includes("@") || !details.email.includes(".")) {
      return showError("Please enter a valid email address.");
    }
    if (!details.password || details.password.length < 6) {
      return showError("Password must be at least 6 characters.");
    }

    Object.assign(state, details);

    nextBtn.disabled = true;
    nextBtn.textContent = "Creating account…";

    const userId = makeUserId(details.email);
    const hashedPassword = await hashPassword(details.password);

    const userData = {
      userId,
      name: details.name,
      email: details.email,
      password: hashedPassword,
      curriculum: state.curriculum,
      level: state.level,
      subjects: state.subjects,
      school: details.school,
      adm: details.adm,
      stream: details.stream,
      form: state.curriculum === "844" ? state.level : "",
      grade: state.curriculum === "CBE" ? state.level : "",
      createdAt: new Date().toISOString(),
    };

    try {
      await saveUser(userId, userData);
      setCurrentUser(userData);
      nextBtn.textContent = "✓ Welcome!";
      setTimeout(() => {
        window.location.href = "home.html";
      }, 500);
    } catch (e) {
      console.error("Signup failed:", e);
      // Fallback: continue offline
      setCurrentUser({ ...userData, offline: true });
      nextBtn.textContent = "✓ Continuing…";
      setTimeout(() => {
        window.location.href = "home.html";
      }, 600);
    }
  }
});

/* =========================================================
   ENTER KEY
   ========================================================= */

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !nextBtn.disabled && state.step === 4) {
    e.preventDefault();
    nextBtn.click();
  }
});

/* =========================================================
   INIT
   ========================================================= */

setStep(1);
nextBtn.disabled = true;
