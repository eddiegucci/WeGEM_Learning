// js/pages/quiz.js
// Quiz page controller. Typed-answer engine with real Firestore sync.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc, saveAttempt, updateLeaderboardEntry } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
  cacheAttempt,
} from "../core/cache.js";
import {
  loadQuizzes,
  getQuizzesForUser,
  getAllSubjectsForUser,
  getSets,
} from "../quizzes/index.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import {
  escapeHTML,
  firstName,
  initials,
  log,
  isOnline,
  formatDuration,
} from "../core/utils.js";

const state = {
  user: null,
  userDoc: null,
  curriculum: "",
  level: "",
  allSubjects: [],
  availableQuizzes: [],
  subject: "",
  quizId: "",
  quiz: null,
  answers: [],
  currentIndex: 0,
  totalTime: 0,
  remaining: 0,
  timerId: null,
  started: false,
  submitted: false,
  result: null,
};

const els = {
  setupScreen: document.getElementById("setupScreen"),
  quizScreen: document.getElementById("quizScreen"),
  resultsScreen: document.getElementById("resultsScreen"),
  subjectSelect: document.getElementById("subjectSelect"),
  setSelect: document.getElementById("setSelect"),
  setSelectWrap: document.getElementById("setSelectWrap"),
  quizPreviewInfo: document.getElementById("quizPreviewInfo"),
  qpiMarks: document.getElementById("qpiMarks"),
  qpiQuestions: document.getElementById("qpiQuestions"),
  qpiTime: document.getElementById("qpiTime"),
  setupError: document.getElementById("setupError"),
  comingSoon: document.getElementById("comingSoon"),
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
   USER
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
    state.curriculum = doc?.curriculum || "";
    state.level = doc?.level || "";
  } catch (e) {
    log.warn("Could not load user doc:", e);
  }
  return true;
}

/* =========================================================
   LOAD QUIZZES
   ========================================================= */

async function loadAll() {
  try {
    await loadQuizzes(state.curriculum, state.level);
  } catch (e) {
    log.warn("Could not load quizzes:", e);
  }

  state.allSubjects = getAllSubjectsForUser(state.curriculum, state.level);
  state.availableQuizzes = getQuizzesForUser(state.curriculum, state.level);

  log.info(
    "Quiz page: " +
      state.allSubjects.length +
      " subjects, " +
      state.availableQuizzes.length +
      " published quizzes",
  );
}

function populateSubjects() {
  if (!els.subjectSelect) return;

  if (!state.allSubjects.length) {
    els.subjectSelect.innerHTML = '<option value="">No subjects</option>';
    els.startBtn.disabled = true;
    if (els.setSelectWrap) els.setSelectWrap.classList.add("hidden");
    if (els.quizPreviewInfo) els.quizPreviewInfo.classList.add("hidden");
    return;
  }

  const subjectsWithQuiz = new Set(
    state.availableQuizzes.map(function (q) {
      return q.subject;
    }),
  );

  const sorted = state.allSubjects.slice().sort(function (a, b) {
    const aHas = subjectsWithQuiz.has(a);
    const bHas = subjectsWithQuiz.has(b);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return a.localeCompare(b);
  });

  els.subjectSelect.innerHTML = sorted
    .map(function (s) {
      const hasQuiz = subjectsWithQuiz.has(s);
      const suffix = hasQuiz ? "" : " ·";
      return (
        '<option value="' +
        escapeHTML(s) +
        '">' +
        escapeHTML(s) +
        suffix +
        "</option>"
      );
    })
    .join("");

  const firstWithQuiz = sorted.find(function (s) {
    return subjectsWithQuiz.has(s);
  });
  state.subject = firstWithQuiz || sorted[0];

  els.subjectSelect.value = state.subject;
  populateSets();
}

function populateSets() {
  if (!els.setSelect) return;

  const sets = getSets(state.availableQuizzes, state.subject);

  if (!sets.length) {
    if (els.setSelectWrap) els.setSelectWrap.classList.add("hidden");
    if (els.quizPreviewInfo) els.quizPreviewInfo.classList.add("hidden");
    if (els.comingSoon) els.comingSoon.classList.remove("hidden");
    els.startBtn.disabled = true;
    return;
  }

  if (els.setSelectWrap) els.setSelectWrap.classList.remove("hidden");
  if (els.comingSoon) els.comingSoon.classList.add("hidden");

  els.setSelect.innerHTML = sets
    .map(function (q) {
      const marks = q.totalMarks || 0;
      const questions = (q.questions && q.questions.length) || 0;
      return (
        '<option value="' +
        escapeHTML(q.title) +
        '">' +
        escapeHTML(q.title) +
        " · " +
        questions +
        " Qs · " +
        marks +
        " marks</option>"
      );
    })
    .join("");

  state.quizId = sets[0].title;
  updatePreview();
}

function updatePreview() {
  const quiz = getMatchingQuiz();

  if (!quiz) {
    if (els.quizPreviewInfo) els.quizPreviewInfo.classList.add("hidden");
    els.startBtn.disabled = true;
    return;
  }

  if (els.quizPreviewInfo) els.quizPreviewInfo.classList.remove("hidden");
  if (els.qpiMarks) els.qpiMarks.textContent = quiz.totalMarks || "—";
  if (els.qpiQuestions) {
    els.qpiQuestions.textContent =
      (quiz.questions && quiz.questions.length) || 0;
  }
  if (els.qpiTime) {
    const mins = Math.round((quiz.duration || 1800) / 60);
    els.qpiTime.textContent = mins + " min";
  }
  els.startBtn.disabled = false;
}

function getMatchingQuiz() {
  const sets = getSets(state.availableQuizzes, state.subject);
  return sets.find(function (q) {
    return q.title === state.quizId;
  });
}

/* =========================================================
   START
   ========================================================= */

function handleStart() {
  const quiz = getMatchingQuiz();
  if (!quiz || !quiz.questions || !quiz.questions.length) return;

  state.quiz = quiz;
  state.answers = new Array(quiz.questions.length).fill("");
  state.currentIndex = 0;
  state.totalTime = quiz.duration || 45 * 60;
  state.remaining = state.totalTime;
  state.started = true;
  state.submitted = false;
  state.result = null;

  showQuizScreen();
  renderQuestion();
  startTimer();
}

function showSetupScreen() {
  if (els.setupScreen) els.setupScreen.classList.remove("hidden");
  if (els.quizScreen) els.quizScreen.classList.add("hidden");
  if (els.resultsScreen) els.resultsScreen.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showQuizScreen() {
  if (els.setupScreen) els.setupScreen.classList.add("hidden");
  if (els.quizScreen) els.quizScreen.classList.remove("hidden");
  if (els.resultsScreen) els.resultsScreen.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showResultsScreen() {
  if (els.setupScreen) els.setupScreen.classList.add("hidden");
  if (els.quizScreen) els.quizScreen.classList.add("hidden");
  if (els.resultsScreen) els.resultsScreen.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderQuestion() {
  const quiz = state.quiz;
  const currentIndex = state.currentIndex;
  const answers = state.answers;
  if (!quiz) return;
  const q = quiz.questions[currentIndex];

  if (els.quizMeta)
    els.quizMeta.textContent = (quiz.exam || "") + " · " + (quiz.subject || "");
  if (els.quizCounter)
    els.quizCounter.textContent =
      "Question " + (currentIndex + 1) + " of " + quiz.questions.length;
  if (els.quizProgress)
    els.quizProgress.style.width =
      ((currentIndex + 1) / quiz.questions.length) * 100 + "%";

  if (els.questionTopic)
    els.questionTopic.textContent = String(
      q.topic || quiz.subject || "",
    ).toUpperCase();
  if (els.questionText) els.questionText.textContent = q.q || q.question || "";
  if (els.questionMarks) {
    const marks = q.marks || 1;
    els.questionMarks.textContent = marks + " mark" + (marks === 1 ? "" : "s");
  }

  if (els.answerBox) {
    els.answerBox.value = answers[currentIndex] || "";
    els.answerBox.focus();
  }

  if (els.prevBtn) els.prevBtn.disabled = currentIndex === 0;
  if (els.nextBtn) {
    els.nextBtn.textContent =
      currentIndex === quiz.questions.length - 1 ? "Submit Quiz" : "Next →";
  }
}

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
  const quiz = state.quiz;
  const currentIndex = state.currentIndex;
  if (!quiz) return;
  saveCurrentAnswer();

  if (currentIndex === quiz.questions.length - 1) {
    const ok = await confirmDialog({
      title: "Submit quiz?",
      message: "Your answers will be marked against the scheme.",
      okLabel: "Submit",
      cancelLabel: "Keep working",
    });
    if (ok) submitQuiz(false);
  } else {
    state.currentIndex += 1;
    renderQuestion();
  }
}

function startTimer() {
  clearTimer();
  updateTimerDisplay();
  state.timerId = setInterval(function () {
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
  if (valueEl)
    valueEl.textContent =
      String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  els.quizTimer.classList.remove("warn", "danger");
  if (state.remaining <= 60) els.quizTimer.classList.add("danger");
  else if (state.remaining <= 180) els.quizTimer.classList.add("warn");
}

/* =========================================================
   SUBMIT
   ========================================================= */

async function submitQuiz(timeUp) {
  if (state.submitted) return;
  state.submitted = true;
  state.started = false;
  clearTimer();
  saveCurrentAnswer();

  const quiz = state.quiz;
  const result = scoreQuiz(quiz, state.answers);
  const timeUsed = state.totalTime - Math.max(0, state.remaining);

  const attempt = {
    uid: state.user.uid,
    exam: quiz.exam || "",
    subject: quiz.subject,
    correct: result.scored,
    total: result.totalMarks,
    score: result.percentage,
    duration: timeUsed,
    topicResults: result.topicResults,
    mode: "typed",
  };

  let savedToCloud = false;
  if (state.user && isOnline()) {
    try {
      await saveAttempt(state.user.uid, attempt);
      savedToCloud = true;
      await updateLeaderboardEntry(state.user.uid, {
        name: (state.userDoc && state.userDoc.name) || "",
        school: (state.userDoc && state.userDoc.school) || "",
        curriculum: quiz.curriculum,
        level: quiz.grade || state.level,
        scoreDelta: result.percentage,
        quizDelta: 1,
        correctDelta: result.scored,
        totalDelta: result.totalMarks,
      });
    } catch (e) {
      log.warn("Save failed:", e);
    }
  }

  try {
    await cacheAttempt({
      uid: state.user.uid,
      exam: quiz.exam || "",
      subject: quiz.subject,
      correct: result.scored,
      total: result.totalMarks,
      score: result.percentage,
      duration: timeUsed,
      topicResults: result.topicResults,
      mode: "typed",
      id: "local_" + Date.now(),
      createdAt: new Date().toISOString(),
      pending: !savedToCloud,
    });
  } catch (e) {
    log.warn("Cache failed:", e);
  }

  state.result = Object.assign({}, result, {
    timeUp: !!timeUp,
    savedToCloud: savedToCloud,
  });
  renderResults(result, !!timeUp, savedToCloud);
  showResultsScreen();
}

function scoreQuiz(quiz, answers) {
  let scored = 0;
  let totalMarks = 0;
  const details = [];
  const topicResults = {};

  const stopWords = [
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
  ];

  quiz.questions.forEach(function (q, i) {
    const studentAnswer = answers[i] || "";
    const normalized = normalize(studentAnswer);
    const matched = [];
    let qScore = 0;
    const qMarks = q.marks || 1;

    (q.markpoints || []).forEach(function (mp, j) {
      const mpText = typeof mp === "string" ? mp : mp.text;
      const mpMarks = typeof mp === "string" ? 1 : mp.marks || 1;
      if (markpointMatches(normalized, mpText, stopWords)) {
        matched.push(j);
        qScore += mpMarks;
      }
    });

    qScore = Math.min(qScore, qMarks);
    scored += qScore;
    totalMarks += qMarks;

    details.push({
      qIndex: i,
      q: q.q || q.question || "",
      marks: qMarks,
      scored: qScore,
      matched: matched,
      studentAnswer: studentAnswer,
      markpoints: q.markpoints || [],
    });

    const topic = q.topic || quiz.subject;
    if (!topicResults[topic]) topicResults[topic] = { correct: 0, total: 0 };
    topicResults[topic].correct += qScore;
    topicResults[topic].total += qMarks;
  });

  const percentage = totalMarks ? Math.round((scored / totalMarks) * 100) : 0;
  return {
    scored: scored,
    totalMarks: totalMarks,
    percentage: percentage,
    details: details,
    topicResults: topicResults,
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
  if (!normalizedMp) return false;
  if (normalizedAnswer.indexOf(normalizedMp) !== -1) return true;

  const words = normalizedMp.split(" ").filter(function (w) {
    return w.length > 2 && stopWords.indexOf(w) === -1;
  });
  if (!words.length) return false;

  let hits = 0;
  for (const word of words) {
    if (normalizedAnswer.indexOf(word) !== -1) hits += 1;
  }
  const threshold = Math.max(1, Math.ceil(words.length * 0.6));
  return hits >= threshold;
}

/* =========================================================
   CREATIVE RESULTS — confetti on good scores
   ========================================================= */

function fireConfetti(durationMs) {
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  document.body.appendChild(layer);

  const colors = [
    "#fbbf24",
    "#f59e0b",
    "#3b82f6",
    "#10b981",
    "#ec4899",
    "#a855f7",
  ];
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = (Math.random() * 0.5).toFixed(2) + "s";
    piece.style.animationDuration =
      (2.4 + Math.random() * 1.2).toFixed(2) + "s";
    layer.appendChild(piece);
  }
  setTimeout(function () {
    layer.remove();
  }, durationMs || 4000);
}

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
  if (els.finalDetail)
    els.finalDetail.textContent =
      result.scored + " / " + result.totalMarks + " marks";
  if (els.statMarks)
    els.statMarks.textContent = result.scored + "/" + result.totalMarks;
  if (els.statQuestions)
    els.statQuestions.textContent = state.quiz.questions.length;
  if (els.statTime) {
    const used = state.totalTime - Math.max(0, state.remaining);
    els.statTime.textContent = formatDuration(used);
  }

  if (els.syncStatus) {
    els.syncStatus.innerHTML = savedToCloud
      ? '<span class="sync-ok">✓ Saved to your account</span>'
      : '<span class="sync-warn">Saved locally — will sync when online</span>';
  }

  if (pct >= 70) fireConfetti(3800);
}

/* =========================================================
   REVIEW
   ========================================================= */

function renderReview() {
  const result = state.result;
  if (!result || !els.reviewList) return;

  if (els.reviewSection) els.reviewSection.classList.remove("hidden");

  els.reviewList.innerHTML = result.details
    .map(function (d, i) {
      const rows = (d.markpoints || [])
        .map(function (mp, j) {
          const text = typeof mp === "string" ? mp : mp.text;
          const marks = typeof mp === "string" ? 1 : mp.marks || 1;
          const hit = d.matched.indexOf(j) !== -1;
          return (
            '<div class="review-point ' +
            (hit ? "hit" : "missed") +
            '">' +
            '<span class="review-icon">' +
            (hit ? "✓" : "✗") +
            "</span>" +
            '<span class="review-text">' +
            escapeHTML(text) +
            "</span>" +
            '<span class="review-marks">' +
            marks +
            " mark" +
            (marks === 1 ? "" : "s") +
            "</span>" +
            "</div>"
          );
        })
        .join("");

      return (
        '<div class="review-item">' +
        '<div class="review-item-head">' +
        '<span class="review-num">Q' +
        (i + 1) +
        "</span>" +
        '<span class="review-score">' +
        d.scored +
        "/" +
        d.marks +
        " marks</span>" +
        "</div>" +
        '<div class="review-question">' +
        escapeHTML(d.q) +
        "</div>" +
        '<div class="review-your-answer">' +
        "<strong>Your answer:</strong>" +
        '<div class="your-answer-text">' +
        (d.studentAnswer
          ? escapeHTML(d.studentAnswer)
          : "<em>Not answered</em>") +
        "</div>" +
        "</div>" +
        '<div class="review-scheme">' +
        '<div class="scheme-title">Mark scheme:</div>' +
        rows +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  if (els.reviewBtn) els.reviewBtn.classList.add("hidden");
}

function handleRetry() {
  clearTimer();
  state.quiz = null;
  state.answers = [];
  state.currentIndex = 0;
  state.submitted = false;
  state.started = false;
  state.result = null;
  if (els.reviewSection) els.reviewSection.classList.add("hidden");
  if (els.reviewBtn) els.reviewBtn.classList.remove("hidden");
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

async function handleUserMenu() {
  const ok = await confirmDialog({
    title: "Sign out?",
    message:
      "Signed in as " +
      ((state.user && state.user.email) || "Student") +
      ".\n\nSign out?",
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
    await loadAll();
    populateSubjects();

    if (els.subjectSelect) {
      els.subjectSelect.addEventListener("change", function () {
        state.subject = els.subjectSelect.value;
        populateSets();
      });
    }
    if (els.setSelect) {
      els.setSelect.addEventListener("change", function () {
        state.quizId = els.setSelect.value;
        updatePreview();
      });
    }

    if (els.startBtn) els.startBtn.addEventListener("click", handleStart);
    if (els.prevBtn) els.prevBtn.addEventListener("click", handlePrev);
    if (els.nextBtn) els.nextBtn.addEventListener("click", handleNext);
    if (els.quitBtn) els.quitBtn.addEventListener("click", handleQuit);
    if (els.reviewBtn) els.reviewBtn.addEventListener("click", renderReview);
    if (els.retryBtn) els.retryBtn.addEventListener("click", handleRetry);
    if (els.userMenuBtn)
      els.userMenuBtn.addEventListener("click", handleUserMenu);
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
