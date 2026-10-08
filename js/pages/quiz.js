// js/pages/quiz.js
// Controller for quiz.html — solo quiz flow.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
  cacheAttempt,
} from "../core/cache.js";
import {
  fetchQuestions,
  startQuiz,
  submitAnswer,
  goNext,
  finished,
  complete,
  persistAttempt,
  getResultsSummary,
} from "../features/quiz-single.js";
import { scoreLabel, getWeakTopics } from "../features/quiz-engine.js";
import {
  getSubjects,
  getSubjectIcon,
  getSubjectColor,
  EXAM_BY_LEVEL,
} from "../data/subjects.js";
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
} from "../core/utils.js";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  user: null,
  userDoc: null,
  exam: null,
  subject: null,
  count: 10,
  quizState: null, // created by startQuiz()
  currentResult: null,
  savedToCloud: false,
};

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  // Screens
  setupScreen: document.getElementById("setupScreen"),
  quizScreen: document.getElementById("quizScreen"),
  resultsScreen: document.getElementById("resultsScreen"),

  // Setup
  examSelect: document.getElementById("examSelect"),
  subjectSelect: document.getElementById("subjectSelect"),
  countSelect: document.getElementById("countSelect"),
  startBtn: document.getElementById("startBtn"),

  // Quiz
  quizMeta: document.getElementById("quizMeta"),
  quizCounter: document.getElementById("quizCounter"),
  liveScore: document.getElementById("liveScore"),
  quizProgress: document.getElementById("quizProgress"),
  questionTopic: document.getElementById("questionTopic"),
  questionText: document.getElementById("questionText"),
  optionsList: document.getElementById("optionsList"),
  feedbackBox: document.getElementById("feedbackBox"),
  nextBtn: document.getElementById("nextBtn"),
  quitBtn: document.getElementById("quitBtn"),

  // Results
  resultsTitle: document.getElementById("resultsTitle"),
  finalScore: document.getElementById("finalScore"),
  finalDetail: document.getElementById("finalDetail"),
  syncStatus: document.getElementById("syncStatus"),
  weakHeading: document.getElementById("weakHeading"),
  weakList: document.getElementById("weakList"),
  retryBtn: document.getElementById("retryBtn"),

  // User
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
   SETUP SCREEN
   ========================================================= */

function getExamForLevel() {
  if (!state.userDoc) return "KCSE";
  const curriculum = state.userDoc.curriculum || "844";
  const level =
    state.userDoc.level || (curriculum === "CBE" ? "Grade 9" : "Form 4");
  return EXAM_BY_LEVEL[curriculum]?.[level] || "KCSE";
}

function populateExamSelect() {
  if (!els.examSelect) return;

  const defaultExam = getExamForLevel();
  const exams = ["KCSE", "KJSEA", "KPSEA"];

  els.examSelect.innerHTML = exams
    .map(
      (e) => `
    <option value="${e}"${e === defaultExam ? " selected" : ""}>${e}</option>
  `,
    )
    .join("");

  state.exam = defaultExam;
}

function populateSubjectSelect() {
  if (!els.subjectSelect) return;

  const curriculum = state.userDoc?.curriculum === "CBE" ? "CBE" : "844";
  const level =
    state.userDoc?.level || (curriculum === "CBE" ? "Grade 9" : "Form 4");

  let subjects = state.userDoc?.subjects || [];
  if (!subjects.length) subjects = getSubjects(curriculum, level);

  // Deduplicate
  subjects = Array.from(new Set(subjects));

  els.subjectSelect.innerHTML =
    `<option value="">Select subject</option>` +
    subjects
      .map((s) => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`)
      .join("");
}

function readSetupParamsFromURL() {
  const examParam = getParam("exam");
  const subjectParam = getParam("subject");

  if (examParam && ["KCSE", "KJSEA", "KPSEA"].includes(examParam)) {
    if (els.examSelect) els.examSelect.value = examParam;
    state.exam = examParam;
  }

  if (subjectParam) {
    const option = els.subjectSelect?.querySelector(
      `option[value="${CSS.escape ? CSS.escape(subjectParam) : subjectParam}"]`,
    );
    if (option) {
      els.subjectSelect.value = subjectParam;
      state.subject = subjectParam;
    }
  }
}

/* =========================================================
   START QUIZ
   ========================================================= */

async function handleStartQuiz() {
  const exam = els.examSelect?.value || "KCSE";
  const subject = els.subjectSelect?.value || "";
  const count = parseInt(els.countSelect?.value || "10", 10);

  if (!subject) {
    toastErr("Please select a subject to begin.");
    els.subjectSelect?.focus();
    return;
  }

  state.exam = exam;
  state.subject = subject;
  state.count = count;

  if (els.startBtn) {
    els.startBtn.disabled = true;
    els.startBtn.textContent = "Loading questions…";
  }

  try {
    const quiz = await fetchQuestions({ exam, subject, count });

    if (!quiz.questions.length) {
      throw new Error("No questions available for this subject yet.");
    }

    state.quizState = startQuiz(quiz);

    // Update URL
    setParam("exam", exam);
    setParam("subject", subject);

    showQuizScreen();
    renderQuestion();

    log.info(`Quiz started: ${exam} / ${subject} / ${quiz.total} questions`);
  } catch (e) {
    log.warn("Start quiz failed:", e);
    toastErr(e.message || "Could not load questions.");
    if (els.startBtn) {
      els.startBtn.disabled = false;
      els.startBtn.textContent = "Start Quiz →";
    }
  }
}

/* =========================================================
   SCREEN SWITCHING
   ========================================================= */

function showSetupScreen() {
  els.setupScreen?.classList.remove("hidden");
  els.quizScreen?.classList.add("hidden");
  els.resultsScreen?.classList.add("hidden");
  if (els.startBtn) {
    els.startBtn.disabled = false;
    els.startBtn.textContent = "Start Quiz →";
  }
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
  const qs = state.quizState;
  if (!qs) return;

  const { questions, index, correct } = qs;
  const q = questions[index];

  if (els.quizMeta) {
    els.quizMeta.textContent = `${state.exam} · ${state.subject}`;
  }
  if (els.quizCounter) {
    els.quizCounter.textContent = `Question ${index + 1} of ${questions.length}`;
  }
  if (els.liveScore) {
    els.liveScore.textContent = correct;
  }
  if (els.quizProgress) {
    els.quizProgress.style.width = `${(index / questions.length) * 100}%`;
  }

  if (els.questionTopic) {
    els.questionTopic.textContent = (q.topic || "GENERAL").toUpperCase();
  }
  if (els.questionText) {
    els.questionText.textContent = q.question;
  }

  // Render options
  if (els.optionsList) {
    els.optionsList.innerHTML = q.options
      .map(
        (opt, i) => `
      <button class="option" type="button" data-option-index="${i}">
        <span class="option-letter">${"ABCD"[i]}</span>
        <span>${escapeHTML(opt)}</span>
      </button>
    `,
      )
      .join("");

    els.optionsList.querySelectorAll(".option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.optionIndex, 10);
        handleAnswer(idx);
      });
    });
  }

  // Hide feedback and next button
  if (els.feedbackBox) {
    els.feedbackBox.classList.add("hidden");
    els.feedbackBox.className = "feedback hidden";
  }
  if (els.nextBtn) {
    els.nextBtn.classList.add("hidden");
  }
}

/* =========================================================
   HANDLE ANSWER
   ========================================================= */

function handleAnswer(selectedIndex) {
  const qs = state.quizState;
  if (!qs) return;

  // Prevent double-answer
  if (els.optionsList?.querySelector(".option.disabled")) return;

  const result = submitAnswer(qs, selectedIndex);
  if (!result) return;

  const { isCorrect, correctIndex, explain } = result;

  // Disable all options and mark correct/wrong
  const allOptions = els.optionsList?.querySelectorAll(".option") || [];
  allOptions.forEach((btn) => btn.classList.add("disabled"));

  allOptions[correctIndex]?.classList.add("correct");
  if (!isCorrect) {
    allOptions[selectedIndex]?.classList.add("wrong");
  }

  // Update live score
  if (els.liveScore) els.liveScore.textContent = qs.correct;

  // Show feedback
  if (els.feedbackBox) {
    els.feedbackBox.className = `feedback ${isCorrect ? "correct" : "wrong"}`;
    els.feedbackBox.innerHTML = isCorrect
      ? `<strong>✓ Correct</strong>${escapeHTML(explain || "")}`
      : `<strong>✗ Not quite</strong>Correct answer: <b>${escapeHTML(qs.quiz.questions[qs.index].options[correctIndex])}</b><br>${escapeHTML(explain || "")}`;
    els.feedbackBox.classList.remove("hidden");
  }

  // Show next button
  if (els.nextBtn) {
    const isLast = qs.index === qs.quiz.questions.length - 1;
    els.nextBtn.textContent = isLast ? "See Results →" : "Next →";
    els.nextBtn.classList.remove("hidden");
    els.nextBtn.onclick = handleNext;
  }
}

/* =========================================================
   NEXT
   ========================================================= */

function handleNext() {
  const qs = state.quizState;
  if (!qs) return;

  const hasNext = goNext(qs);
  if (hasNext) {
    renderQuestion();
  } else {
    finishQuiz();
  }
}

/* =========================================================
   FINISH QUIZ
   ========================================================= */

async function finishQuiz() {
  const qs = state.quizState;
  if (!qs) return;

  const result = complete(qs);
  state.currentResult = result;

  // Save attempt
  try {
    const { savedToCloud } = await persistAttempt(state.user.uid, {
      exam: state.exam,
      subject: state.subject,
      result,
    });
    state.savedToCloud = savedToCloud;
  } catch (e) {
    log.warn("Could not save attempt:", e);
    state.savedToCloud = false;
  }

  renderResults(result);
  showResultsScreen();
}

/* =========================================================
   RENDER RESULTS
   ========================================================= */

function renderResults(result) {
  const { score, correct, total, topicResults } = result;
  const badge = scoreLabel(score);

  if (els.resultsTitle) {
    els.resultsTitle.textContent = `${badge.emoji} ${badge.label}`;
  }

  if (els.finalScore) {
    els.finalScore.textContent = `${score}%`;
    els.finalScore.style.background = `linear-gradient(135deg, ${badge.color}, #fcd34d)`;
    els.finalScore.style.webkitBackgroundClip = "text";
    els.finalScore.style.backgroundClip = "text";
    els.finalScore.style.webkitTextFillColor = "transparent";
  }

  if (els.finalDetail) {
    els.finalDetail.textContent = `${correct} / ${total} correct`;
  }

  // Sync status
  if (els.syncStatus) {
    if (state.savedToCloud) {
      els.syncStatus.innerHTML =
        '<span class="sync-ok">✓ Saved to your account</span>';
    } else if (state.user) {
      els.syncStatus.innerHTML =
        '<span class="sync-warn">Saved locally (offline)</span>';
    } else {
      els.syncStatus.innerHTML =
        '<span class="sync-info">Not saved — sign in to sync</span>';
    }
  }

  // Weak topics
  const weak = getWeakTopics(topicResults, 0.7);

  if (els.weakHeading) {
    els.weakHeading.textContent = weak.length
      ? "Areas to review"
      : "Great work!";
  }

  if (els.weakList) {
    if (!weak.length) {
      els.weakList.innerHTML = `
        <div class="empty-state" style="border: none; background: none; padding: 20px;">
          <div class="empty-icon">🎉</div>
          <div class="empty-title">No weak topics</div>
          <div class="empty-sub">You did excellent on every topic!</div>
        </div>
      `;
    } else {
      els.weakList.innerHTML = weak
        .slice(0, 5)
        .map((t) => {
          const pct = Math.round(t.score * 100);
          return `
          <div class="weak-item">
            <span>${escapeHTML(t.name)}</span>
            <strong>${t.correct}/${t.total} · ${pct}%</strong>
          </div>
        `;
        })
        .join("");
    }
  }

  // Focus the retry button for keyboard users
  setTimeout(() => els.retryBtn?.focus(), 200);
}

/* =========================================================
   RETRY / QUIT
   ========================================================= */

function handleRetry() {
  state.quizState = null;
  state.currentResult = null;
  state.savedToCloud = false;
  showSetupScreen();
}

async function handleQuit() {
  const ok = await confirmDialog({
    title: "Quit quiz?",
    message: "Your progress on this quiz will not be saved.",
    okLabel: "Quit",
    cancelLabel: "Keep going",
    danger: true,
  });

  if (ok) {
    state.quizState = null;
    showSetupScreen();
    setParam("exam", null);
    setParam("subject", null);
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

    // Populate selectors
    populateExamSelect();
    populateSubjectSelect();

    // Read initial params from URL
    readSetupParamsFromURL();

    // Wire up buttons
    els.startBtn?.addEventListener("click", handleStartQuiz);
    els.quitBtn?.addEventListener("click", handleQuit);
    els.retryBtn?.addEventListener("click", handleRetry);
    els.userMenuBtn?.addEventListener("click", handleUserMenu);

    // Enter key triggers Next when answer is submitted
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Enter" &&
        els.nextBtn &&
        !els.nextBtn.classList.contains("hidden")
      ) {
        e.preventDefault();
        handleNext();
      }
    });

    // Keep dropdowns in sync
    els.examSelect?.addEventListener("change", () => {
      state.exam = els.examSelect.value;
    });

    els.subjectSelect?.addEventListener("change", () => {
      state.subject = els.subjectSelect.value;
    });

    // Auto-start if URL has exam + subject
    if (getParam("exam") && getParam("subject")) {
      setTimeout(() => handleStartQuiz(), 300);
    }

    log.info("Quiz page ready");
  } catch (e) {
    log.error("Quiz init failed:", e);
    toastErr("Could not load quiz. Please refresh.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
