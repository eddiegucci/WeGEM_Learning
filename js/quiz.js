// js/quiz.js
import { EXAMS, shuffle } from "./data.js";
import { saveAttempt, getCurrentUser, clearCurrentUser } from "./firebase.js";
import { recordLocalAttempt } from "./storage.js";

const user = getCurrentUser();
if (!user) window.location.href = "signup.html";

const authLink = document.getElementById("auth-link");
if (authLink) {
  authLink.onclick = (e) => {
    e.preventDefault();
    clearCurrentUser();
    window.location.href = "signup.html";
  };
}

const setupScreen = document.getElementById("setupScreen");
const quizScreen = document.getElementById("quizScreen");
const resultsScreen = document.getElementById("resultsScreen");
const examSelect = document.getElementById("examSelect");
const subjectSelect = document.getElementById("subjectSelect");
const countSelect = document.getElementById("countSelect");
const startBtn = document.getElementById("startBtn");

Object.keys(EXAMS).forEach((key) => {
  const opt = document.createElement("option");
  opt.value = key;
  opt.textContent = `${key} — ${EXAMS[key].gradeLabel}`;
  examSelect.appendChild(opt);
});

const params = new URLSearchParams(window.location.search);
if (params.get("exam") && EXAMS[params.get("exam")]) {
  examSelect.value = params.get("exam");
}

function refreshSubjects() {
  const exam = EXAMS[examSelect.value];
  subjectSelect.innerHTML = "";
  exam.subjects.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = `${s.name} (${s.questions.length})`;
    subjectSelect.appendChild(opt);
  });
  const urlSubject = params.get("subject");
  if (urlSubject && exam.subjects.some((s) => s.name === urlSubject)) {
    subjectSelect.value = urlSubject;
  }
}
examSelect.addEventListener("change", refreshSubjects);
refreshSubjects();

let quiz = null;

startBtn.addEventListener("click", () => {
  const examKey = examSelect.value;
  const subjectName = subjectSelect.value;
  const count = parseInt(countSelect.value, 10);
  const exam = EXAMS[examKey];
  const subject = exam.subjects.find((s) => s.name === subjectName);
  const pool = shuffle(subject.questions);
  const questions = pool.slice(0, Math.min(count, pool.length));

  quiz = {
    examKey,
    subjectName,
    questions,
    index: 0,
    correct: 0,
    topicResults: {},
  };
  setupScreen.classList.add("hidden");
  resultsScreen.classList.add("hidden");
  quizScreen.classList.remove("hidden");
  renderQuestion();
});

function renderQuestion() {
  const { questions, index, examKey, subjectName, correct } = quiz;
  const q = questions[index];

  document.getElementById("quizMeta").textContent =
    `${examKey} · ${subjectName}`;
  document.getElementById("quizCounter").textContent =
    `Q ${index + 1} of ${questions.length}`;
  document.getElementById("liveScore").textContent = correct;
  document.getElementById("quizProgress").style.width =
    `${(index / questions.length) * 100}%`;
  document.getElementById("questionTopic").textContent = q.topic.toUpperCase();
  document.getElementById("questionText").textContent = q.q;

  const optionsList = document.getElementById("optionsList");
  optionsList.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.innerHTML = `<span class="option-letter">${"ABCD"[i]}</span><span>${opt}</span>`;
    btn.onclick = () => handleAnswer(i, btn);
    optionsList.appendChild(btn);
  });

  document.getElementById("feedbackBox").classList.add("hidden");
  document.getElementById("nextBtn").classList.add("hidden");
}

function handleAnswer(selectedIndex, btn) {
  const q = quiz.questions[quiz.index];
  const isCorrect = selectedIndex === q.answer;

  document
    .querySelectorAll(".option")
    .forEach((o) => o.classList.add("disabled"));
  const allOptions = document.querySelectorAll(".option");
  allOptions[q.answer].classList.add("correct");
  if (!isCorrect) btn.classList.add("wrong");

  if (!quiz.topicResults[q.topic])
    quiz.topicResults[q.topic] = { correct: 0, total: 0 };
  quiz.topicResults[q.topic].total += 1;
  if (isCorrect) {
    quiz.correct += 1;
    quiz.topicResults[q.topic].correct += 1;
  }

  document.getElementById("liveScore").textContent = quiz.correct;

  const fb = document.getElementById("feedbackBox");
  fb.className = "feedback " + (isCorrect ? "correct" : "wrong");
  fb.innerHTML = isCorrect
    ? `<strong>✓ Correct</strong>${q.explain}`
    : `<strong>✗ Not quite</strong>Correct: <b>${q.options[q.answer]}</b><br>${q.explain}`;
  fb.classList.remove("hidden");

  const nextBtn = document.getElementById("nextBtn");
  nextBtn.textContent =
    quiz.index === quiz.questions.length - 1 ? "See Results →" : "Next →";
  nextBtn.classList.remove("hidden");
  nextBtn.onclick = advance;
}

function advance() {
  quiz.index += 1;
  if (quiz.index >= quiz.questions.length) finishQuiz();
  else renderQuestion();
}

async function finishQuiz() {
  const { examKey, subjectName, correct, questions, topicResults } = quiz;
  const total = questions.length;
  const pct = Math.round((correct / total) * 100);

  const attempt = {
    exam: examKey,
    subject: subjectName,
    correct,
    total,
    topicResults,
    date: new Date().toISOString(),
  };
  recordLocalAttempt(attempt);

  let syncMessage = "";
  try {
    await saveAttempt(user.userId, attempt);
    syncMessage = '<span class="sync-ok">✓ Saved to your account</span>';
  } catch (e) {
    console.error(e);
    syncMessage = '<span class="sync-warn">Saved locally</span>';
  }

  quizScreen.classList.add("hidden");
  resultsScreen.classList.remove("hidden");

  document.getElementById("finalScore").textContent = pct + "%";
  document.getElementById("finalDetail").textContent =
    `${correct} / ${total} correct`;
  document.getElementById("syncStatus").innerHTML = syncMessage;

  let title = "Keep going!";
  if (pct >= 80) title = "Outstanding! 🎉";
  else if (pct >= 60) title = "Good job!";
  else if (pct >= 40) title = "Keep practicing.";
  else title = "Let's review together.";
  document.getElementById("resultsTitle").textContent = title;

  const weakList = document.getElementById("weakList");
  weakList.innerHTML = "";
  const weak = Object.entries(topicResults)
    .filter(([, s]) => s.correct / s.total < 0.7)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);

  if (weak.length) {
    weak.forEach(([topic, s]) => {
      const div = document.createElement("div");
      div.className = "weak-item";
      div.innerHTML = `<span>${topic}</span><strong>${s.correct}/${s.total}</strong>`;
      weakList.appendChild(div);
    });
  } else {
    weakList.innerHTML =
      '<div class="empty-state">No weak topics — great work!</div>';
  }
}

document.getElementById("retryBtn").addEventListener("click", () => {
  resultsScreen.classList.add("hidden");
  setupScreen.classList.remove("hidden");
  quiz = null;
  window.history.replaceState({}, "", "quiz.html");
});
