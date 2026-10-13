// js/pages/signup.js
// Signup controller.

import { signUp, onAuthChange } from "../core/auth.js";
import { createUserDoc, updateLeaderboardEntry } from "../core/db.js";
import { cacheUser } from "../core/cache.js";
import { getSubjects } from "../data/subjects.js";
import { toastOk, toastErr } from "../ui/toast.js";
import {
  escapeHTML,
  isValidEmail,
  isPasswordStrong,
  friendlyFirebaseError,
  log,
  sleep,
} from "../core/utils.js";

const state = {
  step: 1,
  curriculum: null,
  level: null,
  subjects: [],
  name: "",
  school: "",
  adm: "",
  stream: "",
  email: "",
  password: "",
  submitting: false,
};

const els = {
  step1: document.getElementById("step1"),
  step2: document.getElementById("step2"),
  step3: document.getElementById("step3"),
  step4: document.getElementById("step4"),
  stepDots: document.querySelectorAll(".step-dot"),
  backBtn: document.getElementById("backBtn"),
  nextBtn: document.getElementById("nextBtn"),
  errorBox: document.getElementById("signupError"),
  levelGrid: document.getElementById("levelGrid"),
  levelTitle: document.getElementById("levelTitle"),
  levelSub: document.getElementById("levelSub"),
  subjectsGrid: document.getElementById("subjectsGrid"),
  subjectCount: document.getElementById("subjectCount"),
  selectAllBtn: document.getElementById("selectAllBtn"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  fullName: document.getElementById("fullName"),
  school: document.getElementById("school"),
  adm: document.getElementById("adm"),
  stream: document.getElementById("stream"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
};

let redirected = false;
onAuthChange((user) => {
  if (user && !redirected && !state.submitting) {
    redirected = true;
    setTimeout(() => window.location.replace("home.html"), 100);
  }
});

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

function setStep(n) {
  if (n < 1 || n > 4) return;
  state.step = n;

  [els.step1, els.step2, els.step3, els.step4].forEach((section, i) => {
    if (!section) return;
    section.classList.toggle("hidden", i + 1 !== n);
  });

  els.stepDots.forEach((dot) => {
    const dotStep = parseInt(dot.dataset.step, 10);
    dot.classList.toggle("active", dotStep === n);
    dot.classList.toggle("done", dotStep < n);
  });

  els.backBtn.disabled = n === 1;
  els.nextBtn.textContent = n === 4 ? "Create Account →" : "Continue →";

  updateNextEnabled();
  clearError();

  const card = document.querySelector(".signup-card");
  if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });

  if (n === 4) setTimeout(() => els.fullName?.focus(), 200);
}

function updateNextEnabled() {
  let enabled = false;
  switch (state.step) {
    case 1:
      enabled = !!state.curriculum;
      break;
    case 2:
      enabled = !!state.level;
      break;
    case 3:
      enabled = state.subjects.length > 0;
      break;
    case 4:
      enabled = !state.submitting;
      break;
  }
  els.nextBtn.disabled = !enabled;
}

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

    if (value === "844") {
      els.levelTitle.textContent = "Which form are you in?";
      els.levelSub.textContent =
        "Pick your current form to see relevant subjects.";
    } else {
      els.levelTitle.textContent = "Which grade are you in?";
      els.levelSub.textContent =
        "Pick your current grade to see relevant subjects.";
    }

    updateNextEnabled();

    setTimeout(() => {
      renderLevelGrid();
      setStep(2);
    }, 280);
  });
});

function renderLevelGrid() {
  if (!els.levelGrid) return;
  const options =
    state.curriculum === "844"
      ? ["Form 1", "Form 2", "Form 3", "Form 4"]
      : ["Grade 7", "Grade 8", "Grade 9"];

  els.levelGrid.innerHTML = options
    .map(
      (opt) => `
    <button class="level-btn${state.level === opt ? " selected" : ""}" data-level="${escapeHTML(opt)}" type="button">
      ${escapeHTML(opt)}
    </button>
  `,
    )
    .join("");

  els.levelGrid.querySelectorAll(".level-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      els.levelGrid
        .querySelectorAll(".level-btn")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.level = btn.dataset.level;
      state.subjects = [];
      updateNextEnabled();

      setTimeout(() => {
        renderSubjectsGrid();
        setStep(3);
      }, 250);
    });
  });
}

function renderSubjectsGrid() {
  if (!els.subjectsGrid) return;
  const subjects = getSubjects(state.curriculum, state.level);

  if (!subjects.length) {
    els.subjectsGrid.innerHTML = `<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-mute);">No subjects available.</div>`;
    return;
  }

  els.subjectsGrid.innerHTML = subjects
    .map(
      (s) => `
    <button class="subject-toggle" data-subject="${escapeHTML(s)}" type="button">
      <span class="st-check" aria-hidden="true">✓</span>
      <span class="st-name">${escapeHTML(s)}</span>
    </button>
  `,
    )
    .join("");

  els.subjectsGrid.querySelectorAll(".subject-toggle").forEach((btn) => {
    if (state.subjects.includes(btn.dataset.subject))
      btn.classList.add("selected");

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
      updateNextEnabled();
    });
  });

  updateSubjectCount();
}

function updateSubjectCount() {
  if (els.subjectCount) els.subjectCount.textContent = state.subjects.length;
}

els.selectAllBtn?.addEventListener("click", () => {
  const subjects = getSubjects(state.curriculum, state.level);
  state.subjects = [...subjects];
  els.subjectsGrid
    .querySelectorAll(".subject-toggle")
    .forEach((btn) => btn.classList.add("selected"));
  updateSubjectCount();
  updateNextEnabled();
});

els.clearAllBtn?.addEventListener("click", () => {
  state.subjects = [];
  els.subjectsGrid
    .querySelectorAll(".subject-toggle")
    .forEach((btn) => btn.classList.remove("selected"));
  updateSubjectCount();
  updateNextEnabled();
});

function readDetailsForm() {
  return {
    name: (els.fullName?.value || "").trim(),
    school: (els.school?.value || "").trim(),
    adm: (els.adm?.value || "").trim(),
    stream: (els.stream?.value || "").trim(),
    email: (els.email?.value || "").trim().toLowerCase(),
    password: els.password?.value || "",
  };
}

function validateDetails(details) {
  if (!details.name) return "Please enter your full name.";
  if (details.name.length < 2) return "Name is too short.";
  if (!details.school) return "Please enter your school.";
  if (!details.email) return "Please enter your email.";
  if (!isValidEmail(details.email))
    return "Please enter a valid email address.";
  if (!isPasswordStrong(details.password))
    return "Password must be at least 6 characters.";
  return null;
}

els.backBtn?.addEventListener("click", () => {
  if (state.step > 1) setStep(state.step - 1);
});

els.nextBtn?.addEventListener("click", handleNext);

async function handleNext() {
  clearError();

  if (state.step === 1) {
    if (!state.curriculum)
      return showError("Please choose a curriculum to continue.");
    renderLevelGrid();
    setStep(2);
    return;
  }
  if (state.step === 2) {
    if (!state.level) return showError("Please pick your form or grade.");
    renderSubjectsGrid();
    setStep(3);
    return;
  }
  if (state.step === 3) {
    if (!state.subjects.length)
      return showError("Please select at least one subject.");
    setStep(4);
    return;
  }
  if (state.step === 4) await submitSignup();
}

async function submitSignup() {
  if (state.submitting) return;

  const details = readDetailsForm();
  const validationError = validateDetails(details);
  if (validationError) return showError(validationError);

  state.submitting = true;
  els.nextBtn.disabled = true;
  const originalText = els.nextBtn.textContent;
  els.nextBtn.textContent = "Creating account…";

  Object.assign(state, details);

  try {
    const user = await signUp(details.email, details.password, details.name);
    if (!user) throw new Error("Account creation failed.");

    const userData = {
      email: details.email,
      name: details.name,
      school: details.school,
      adm: details.adm,
      stream: details.stream,
      curriculum: state.curriculum,
      level: state.level,
      subjects: state.subjects,
      role: "student",
    };

    await createUserDoc(user.uid, userData);

    try {
      await cacheUser({ uid: user.uid, ...userData });
    } catch (e) {
      log.warn("Could not cache user:", e);
    }

    try {
      await updateLeaderboardEntry(user.uid, {
        name: details.name,
        school: details.school,
        curriculum: state.curriculum,
        level: state.level,
      });
    } catch (e) {
      log.warn("Could not initialize leaderboard:", e);
    }

    els.nextBtn.textContent = "✓ Welcome!";
    toastOk("Account created. Redirecting…");

    await sleep(500);
    window.location.replace("home.html");
  } catch (error) {
    log.error("Signup failed:", error);
    const message = friendlyFirebaseError(error);
    showError(message);
    toastErr(message);
    els.nextBtn.disabled = false;
    els.nextBtn.textContent = originalText;
    state.submitting = false;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (state.submitting) return;
  if (state.step === 4) {
    e.preventDefault();
    submitSignup();
  }
});

function init() {
  setStep(1);
  els.nextBtn.disabled = true;
  log.info("Signup page ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
