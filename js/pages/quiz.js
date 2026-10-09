// js/pages/quiz.js
// Typed-answer quiz controller with markpoint scoring.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
  cacheAttempt,
} from "../core/cache.js";
import { saveAttempt, updateLeaderboardEntry } from "../core/db.js";
import { QUIZZES } from "../quizzes/index.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import {
  escapeHTML,
  firstName,
  initials,
  getParam,
  setParam,
  log,
  isOnline,
} from "../core/utils.js";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  user: null,
  userDoc: null,
  curriculum: "CBE",
  level: "",
  subject: "",
  quizId: "",
  quiz: null,
  answers: [],
  currentIndex: 0,
  totalTime: 0,
  remaining: 0,
  timerId: null,
  started: false,
  startedAt: null,
  submitted: false,
};

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  setupScreen: document.getElementById("setupScreen"),
  quizScreen: document.getElementById("quizScreen"),
  resultsScreen: document.getElementById("resultsScreen"),

  curriculumSelect: document.getElementById("curriculumSelect"),
  levelSelect: document.getElementById("levelSelect"),
  subjectSelect: document.getElementById("subjectSelect"),
  setSelect: document.getElementById("setSelect"),
  quizPreviewInfo: document.getElementById("quizPreviewInfo"),
  qpiMarks: document.getElementById("qpiMarks"),
  qpiQuestions: document.getElementById("qpiQuestions"),
  qpiTime: document.getElementById("qpiTime"),
  setupError: document.getElementById("setupError"),
  startBtn: document.getElementById("startBtn"),

  quizMeta: document.getElementById("quizMeta"),
  quizCounter: document.getElementById("quizCounter"),
  quizTimer: document.getElementById("quizTimer"),
  quizProgress: document.getElementById("quizProgress"),
  questionTopic: document.getElementById("questionTopic"),
  questionText: document.getElementById("questionText"),
  questionMarks: document.getElementById("questionMarks"),
  answerBox: document.getElementById("answerBox"),
  quitBtn: document.getElementById("quitBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),

  resultsTitle: document.getElementById("resultsTitle"),
  finalScore: document.getElementById("finalScore"),
  finalDetail: document.getElementById("finalDetail"),
  statMarks: document.getElementById("statMarks"),
  statTime: document.getElementById("statTime"),
  statQuestions: document.getElementById("statQuestions"),
  syncStatus: document.getElementById("syncStatus"),
  reviewBtn: document.getElementById("reviewBtn"),
  reviewSection: document.getElementById("reviewSection"),
  reviewList: document.getElementById("reviewList"),
  retryBtn: document.getElementById("retryBtn"),

  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),
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

  const cached = getCachedUser();
  const displayName =
    cached?.displayName ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Student";

  if (els.userAvatar) els.userAvatar.textContent = initials(displayName);
  if (els.userNameTop) els.userNameTop.textContent = firstName(displayName);

  try {
    let doc = await getCachedUserFromIDB(user.uid);
    if (!doc) {
      doc = await getUserDoc(user.uid);
      if (doc) await cacheUser(doc);
    }
    state.userDoc = doc;

    if (doc?.name) {
      if (els.userAvatar) els.userAvatar.textContent = initials(doc.name);
      if (els.userNameTop) els.userNameTop.textContent = firstName(doc.name);
    }
  } catch (e) {
    log.warn("Could not load user doc:", e);
  }

  return true;
}

/* =========================================================
   LOAD QUIZ SETUP
   ========================================================= */

function getPublishedQuizzes() {
  return QUIZZES.filter((q) => q.status === "published");
}

function populateCurriculumSelect() {
  if (!els.curriculumSelect) return;

  const published = getPublishedQuizzes();
  const curriculums = [...new Set(published.map((q) => q.curriculum))];

  // If user has a doc, prefer their curriculum
  let preferred = "CBE";
  if (state.userDoc?.curriculum === "CBE") preferred = "CBE";
  else if (state.userDoc?.curriculum === "844") preferred = "8-4-4";

  if (curriculums.includes(preferred)) {
    els.curriculumSelect.value = preferred;
  }

  state.curriculum = els.curriculumSelect.value;
  populateLevelSelect();
}

function populateLevelSelect() {
  if (!els.levelSelect) return;

  const published = getPublishedQuizzes().filter(
    (q) => q.curriculum === state.curriculum,
  );
  const levels = [...new Set(published.map((q) => q.grade))];

  els.levelSelect.innerHTML = levels
    .map((l) => `<option value="${escapeHTML(l)}">${escapeHTML(l)}</option>`)
    .join("");

  state.level = els.levelSelect.value || "";
  populateSubjectSelect();
}

function populateSubjectSelect() {
  if (!els.subjectSelect) return;

  const published = getPublishedQuizzes().filter(
    (q) => q.curriculum === state.curriculum && q.grade === state.level,
  );

  const subjects = [...new Set(published.map((q) => q.subject))];

  els.subjectSelect.innerHTML = subjects
    .map((s) => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`)
    .join("");

  state.subject = els.subjectSelect.value || "";
  populateSetSelect();
}

function populateSetSelect() {
  if (!els.setSelect) return;

  const matches = getPublishedQuizzes().filter(
    (q) =>
      q.curriculum === state.curriculum &&
      q.grade === state.level &&
      q.subject === state.subject,
  );

  els.setSelect.innerHTML = matches
    .map(
      (q) =>
        `<option value="${escapeHTML(q.title)}">${escapeHTML(q.title)}</option>`,
    )
    .join("");

  state.quizId = els.setSelect.value || "";
  updateQuizPreview();
}

function updateQuizPreview() {
  const quiz = getMatchingQuiz();

  if (!quiz) {
    els.quizPreviewInfo?.classList.add("hidden");
    els.startBtn.disabled = true;
    return;
  }

  els.quizPreviewInfo?.classList.remove("hidden");

  if (els.qpiMarks) els.qpiMarks.textContent = quiz.totalMarks || "—";
  if (els.qpiQuestions)
    els.qpiQuestions.textContent = quiz.questions.length || 0;
  if (els.qpiTime) {
    const mins = Math.round((quiz.duration || 1800) / 60);
    els.qpiTime.textContent = `${mins} min`;
  }

  els.startBtn.disabled = false;
}

function getMatchingQuiz() {
  return getPublishedQuizzes().find(
    (q) =>
      q.curriculum === state.curriculum &&
      q.grade === state.level &&
      q.subject === state.subject &&
      q.title === state.quizId,
  );
}

/* =========================================================
   START QUIZ
   ========================================================= */

function handleStart() {
  const quiz = getMatchingQuiz();

  if (!quiz) {
    showError("Quiz not found.");
    return;
  }

  if (!quiz.questions || !quiz.questions.length) {
    showError("This quiz has no questions yet.");
    return;
  }

  state.quiz = quiz;
  state.answers = new Array(quiz.questions.length).fill("");
  state.currentIndex = 0;
  state.totalTime = quiz.duration || 45 * 60;
  state.remaining = state.totalTime;
  state.startedAt = Date.now();
  state.started = true;
  state.submitted = false;

  showQuizScreen();
  renderQuestion();
  startTimer();
}

function showError(msg) {
  if (!els.setupError) return;
  els.setupError.textContent = msg;
  els.setupError.classList.remove("hidden");
}

function clearError() {
  if (!els.setupError) return;
  els.setupError.classList.add("hidden");
  els.setupError.textContent = "";
}

/* =========================================================
   SCREENS
   ========================================================= */

function showSetupScreen() {
  els.setupScreen?.classList.remove("hidden");
  els.quizScreen?.classList.add("hidden");
  els.resultsScreen?.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showQuizScreen() {
  els.setupScreen?.classList.add("hidden");
  els.quizScreen?.classList.remove("hidden");
  els.resultsScreen?.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showResultsScreen() {
  els.setupScreen?.classList.add("hidden");
  els.quizScreen?.classList.add("hidden");
  els.resultsScreen?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   RENDER QUESTION
   ========================================================= */

function renderQuestion() {
  const { quiz, currentIndex, answers } = state;
  if (!quiz) return;

  const q = quiz.questions[currentIndex];

  if (els.quizMeta) {
    els.quizMeta.textContent = `${quiz.exam} · ${quiz.subject}`;
  }
  if (els.quizCounter) {
    els.quizCounter.textContent = `Question ${currentIndex + 1} of ${quiz.questions.length}`;
  }
  if (els.quizProgress) {
    els.quizProgress.style.width = `${((currentIndex + 1) / quiz.questions.length) * 100}%`;
  }

  if (els.questionTopic) {
    els.questionTopic.textContent = (q.topic || quiz.subject).toUpperCase();
  }
  if (els.questionText) {
    els.questionText.textContent = q.q;
  }
  if (els.questionMarks) {
    els.questionMarks.textContent = `${q.marks} mark${q.marks === 1 ? "" : "s"}`;
  }

  // Restore previous answer for this question
  if (els.answerBox) {
    els.answerBox.value = answers[currentIndex] || "";
    els.answerBox.focus();
  }

  // Update buttons
  if (els.prevBtn) els.prevBtn.disabled = currentIndex === 0;

  if (els.nextBtn) {
    if (currentIndex === quiz.questions.length - 1) {
      els.nextBtn.textContent = "Submit Quiz";
      els.nextBtn.classList.add("btn-primary");
    } else {
      els.nextBtn.textContent = "Next →";
    }
  }
}

/* =========================================================
   ANSWER HANDLING
   ========================================================= */

function saveCurrentAnswer() {
  if (!els.answerBox) return;
  state.answers[state.currentIndex] = els.answerBox.value;
}

function handlePrev() {
  if (state.currentIndex === 0) return;
  saveCurrentAnswer();
  state.currentIndex -= 1;
  renderQuestion();
}

async function handleNext() {
  const { quiz, currentIndex } = state;
  if (!quiz) return;

  saveCurrentAnswer();

  if (currentIndex === quiz.questions.length - 1) {
    const ok = await confirmDialog({
      title: "Submit quiz?",
      message:
        "Once submitted, your answers will be marked against the scheme.",
      okLabel: "Submit",
      cancelLabel: "Keep working",
    });
    if (ok) submitQuiz(false);
  } else {
    state.currentIndex += 1;
    renderQuestion();
  }
}

/* =========================================================
   TIMER
   ========================================================= */

function startTimer() {
  clearTimer();
  updateTimerDisplay();

  state.timerId = setInterval(() => {
    state.remaining -= 1;
    updateTimerDisplay();

    if (state.remaining <= 0) {
      clearTimer();
      submitQuiz(true);
    }
  }, 1000);
}

function clearTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerDisplay() {
  if (!els.quizTimer) return;

  const m = Math.floor(Math.max(0, state.remaining) / 60);
  const s = Math.max(0, state.remaining) % 60;

  const valueEl = els.quizTimer.querySelector(".timer-value");
  if (valueEl) {
    valueEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  els.quizTimer.classList.remove("warn", "danger");

  if (state.remaining <= 60) els.quizTimer.classList.add("danger");
  else if (state.remaining <= 180) els.quizTimer.classList.add("warn");
}

/* =========================================================
   SUBMIT + SCORE
   ========================================================= */

async function submitQuiz(timeUp = false) {
  if (state.submitted) return;
  state.submitted = true;
  state.started = false;
  clearTimer();

  saveCurrentAnswer();

  const quiz = state.quiz;
  const result = scoreQuiz(quiz, state.answers);

  const timeUsed = state.totalTime - Math.max(0, state.remaining);

  // Save attempt
  const attempt = {
    exam: quiz.exam,
    subject: quiz.subject,
    grade: quiz.grade,
    curriculum: quiz.curriculum,
    quizTitle: quiz.title,
    correct: result.scored,
    total: result.totalMarks,
    score: result.percentage,
    duration: timeUsed,
    topicResults: result.topicResults,
    mode: "typed",
    answers: state.answers,
  };

  let savedToCloud = false;
  if (state.user && isOnline()) {
    try {
      await saveAttempt(state.user.uid, attempt);
      savedToCloud = true;
      await updateLeaderboardEntry(state.user.uid, {
        name: state.userDoc?.name || "",
        school: state.userDoc?.school || "",
        curriculum: quiz.curriculum,
        level: quiz.grade,
        scoreDelta: result.percentage,
        quizDelta: 1,
        correctDelta: result.scored,
        totalDelta: result.totalMarks,
      });
    } catch (e) {
      log.warn("Could not save attempt:", e);
    }
  }

  try {
    await cacheAttempt({
      ...attempt,
      id: "local_" + Date.now(),
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    log.warn("Could not cache attempt:", e);
  }

  renderResults(result, timeUp, savedToCloud);
  showResultsScreen();
}

/* =========================================================
   SCORING ENGINE — matches answers against markpoints
   ========================================================= */

function scoreQuiz(quiz, answers) {
  let scored = 0;
  let totalMarks = 0;
  const details = [];
  const topicResults = {};

  const STOP_WORDS = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "at",
    "for",
    "with",
    "by",
    "from",
    "as",
    "it",
    "its",
    "that",
    "this",
    "these",
    "those",
    "such",
    "also",
    "so",
    "then",
    "than",
    "if",
    "when",
  ]);

  quiz.questions.forEach((q, i) => {
    const studentAnswer = answers[i] || "";
    const normalized = normalize(studentAnswer);
    const matched = [];
    let qScore = 0;

    (q.markpoints || []).forEach((mp, j) => {
      const mpText = typeof mp === "string" ? mp : mp.text;
      const mpMarks = typeof mp === "string" ? 1 : mp.marks || 1;

      if (markpointMatches(normalized, mpText, STOP_WORDS)) {
        matched.push(j);
        qScore += mpMarks;
      }
    });

    qScore = Math.min(qScore, q.marks);
    scored += qScore;
    totalMarks += q.marks;

    details.push({
      qIndex: i,
      q: q.q,
      marks: q.marks,
      scored: qScore,
      matched,
      studentAnswer,
      markpoints: q.markpoints,
    });

    // Topic tracking
    const topic = q.topic || quiz.subject;
    if (!topicResults[topic]) topicResults[topic] = { correct: 0, total: 0 };
    topicResults[topic].correct += qScore;
    topicResults[topic].total += q.marks;
  });

  const percentage = totalMarks ? Math.round((scored / totalMarks) * 100) : 0;

  return {
    scored,
    totalMarks,
    percentage,
    details,
    topicResults,
  };
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function markpointMatches(normalizedAnswer, markpointText, stopWords) {
  if (!normalizedAnswer) return false;

  const normalizedMp = normalize(markpointText);

  // Full phrase match
  if (normalizedAnswer.includes(normalizedMp)) return true;

  // Extract keywords from the markpoint
  const words = normalizedMp
    .split(" ")
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (!words.length) return false;

  // Count how many keywords the student's answer contains
  let hits = 0;
  for (const word of words) {
    if (normalizedAnswer.includes(word)) hits += 1;
  }

  // Require at least 60% of keywords (with a floor of 1)
  const threshold = Math.max(1, Math.ceil(words.length * 0.6));
  return hits >= threshold;
}

/* =========================================================
   RESULTS
   ========================================================= */

function renderResults(result, timeUp, savedToCloud) {
  const pct = result.percentage;

  if (els.resultsTitle) {
    if (timeUp) els.resultsTitle.textContent = "Time's up!";
    else if (pct >= 80) els.resultsTitle.textContent = "Outstanding! 🎉";
    else if (pct >= 60) els.resultsTitle.textContent = "Well done!";
    else if (pct >= 40) els.resultsTitle.textContent = "Keep practicing";
    else els.resultsTitle.textContent = "Let's review this together";
  }

  if (els.finalScore) els.finalScore.textContent = pct + "%";
  if (els.finalDetail) {
    els.finalDetail.textContent = `${result.scored} / ${result.totalMarks} marks`;
  }

  if (els.statMarks)
    els.statMarks.textContent = `${result.scored}/${result.totalMarks}`;
  if (els.statQuestions)
    els.statQuestions.textContent = state.quiz.questions.length;
  if (els.statTime) {
    const used = state.totalTime - Math.max(0, state.remaining);
    const m = Math.floor(used / 60);
    const s = used % 60;
    els.statTime.textContent = `${m}:${String(s).padStart(2, "0")}`;
  }

  if (els.syncStatus) {
    if (savedToCloud) {
      els.syncStatus.innerHTML =
        '<span class="sync-ok">✓ Saved to your account</span>';
    } else {
      els.syncStatus.innerHTML = '<span class="sync-warn">Saved locally</span>';
    }
  }

  window._quizResult = result;
}

/* =========================================================
   REVIEW
   ========================================================= */

function renderReview() {
  const result = window._quizResult;
  if (!result || !els.reviewList) return;

  els.reviewSection?.classList.remove("hidden");

  els.reviewList.innerHTML = result.details
    .map((d, i) => {
      const rows = (d.markpoints || [])
        .map((mp, j) => {
          const text = typeof mp === "string" ? mp : mp.text;
          const marks = typeof mp === "string" ? 1 : mp.marks || 1;
          const hit = d.matched.includes(j);
          return `
            <div class="review-point ${hit ? "hit" : "missed"}">
              <span class="review-icon">${hit ? "✓" : "✗"}</span>
              <span class="review-text">${escapeHTML(text)}</span>
              <span class="review-marks">${marks} mark${marks === 1 ? "" : "s"}</span>
            </div>
          `;
        })
        .join("");

      return `
        <div class="review-item">
          <div class="review-item-head">
            <span class="review-num">Q${i + 1}</span>
            <span class="review-score">${d.scored}/${d.marks} marks</span>
          </div>
          <div class="review-question">${escapeHTML(d.q)}</div>
          <div class="review-your-answer">
            <strong>Your answer:</strong>
            <div class="your-answer-text">${d.studentAnswer ? escapeHTML(d.studentAnswer) : "<em>Not answered</em>"}</div>
          </div>
          <div class="review-scheme">
            <div class="scheme-title">Mark scheme:</div>
            ${rows}
          </div>
        </div>
      `;
    })
    .join("");

  els.reviewBtn?.classList.add("hidden");
}

/* =========================================================
   RETRY / QUIT
   ========================================================= */

function handleRetry() {
  clearTimer();
  state.quiz = null;
  state.answers = [];
  state.currentIndex = 0;
  state.submitted = false;
  state.started = false;
  els.reviewSection?.classList.add("hidden");
  els.reviewBtn?.classList.remove("hidden");
  showSetupScreen();
}

async function handleQuit() {
  const ok = await confirmDialog({
    title: "Quit quiz?",
    message: "Your progress will be lost.",
    okLabel: "Quit",
    cancelLabel: "Keep going",
    danger: true,
  });

  if (ok) {
    clearTimer();
    state.started = false;
    state.quiz = null;
    showSetupScreen();
  }
}

/* =========================================================
   USER MENU
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

    // Dropdown change events
    els.curriculumSelect?.addEventListener("change", () => {
      state.curriculum = els.curriculumSelect.value;
      populateLevelSelect();
    });

    els.levelSelect?.addEventListener("change", () => {
      state.level = els.levelSelect.value;
      populateSubjectSelect();
    });

    els.subjectSelect?.addEventListener("change", () => {
      state.subject = els.subjectSelect.value;
      populateSetSelect();
    });

    els.setSelect?.addEventListener("change", () => {
      state.quizId = els.setSelect.value;
      updateQuizPreview();
    });

    // Start button
    els.startBtn?.addEventListener("click", handleStart);

    // Quiz navigation
    els.prevBtn?.addEventListener("click", handlePrev);
    els.nextBtn?.addEventListener("click", handleNext);
    els.quitBtn?.addEventListener("click", handleQuit);

    // Results
    els.reviewBtn?.addEventListener("click", renderReview);
    els.retryBtn?.addEventListener("click", handleRetry);

    // User menu
    els.userMenuBtn?.addEventListener("click", handleUserMenu);

    // Init dropdowns
    populateCurriculumSelect();

    // If nothing published, show message
    const published = getPublishedQuizzes();
    if (!published.length) {
      showError("No quizzes published yet. Check back soon.");
      els.startBtn.disabled = true;
    }

    log.info(`Quiz page ready — ${published.length} published quiz(zes)`);
  } catch (e) {
    log.error("Quiz init failed:", e);
    toastErr("Could not load quiz.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
