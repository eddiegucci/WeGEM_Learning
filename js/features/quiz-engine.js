// js/features/quiz-engine.js
// Pure quiz logic. No DOM. Used by quiz-single and quiz-compete.

import { shuffle } from "../core/utils.js";

/* =========================================================
   BUILD QUIZ
   ========================================================= */

export function buildQuiz(questions, options = {}) {
  const {
    count = 10,
    shuffleOptions = true,
    shuffleQuestions = true,
  } = options;

  if (!Array.isArray(questions) || !questions.length) {
    return { questions: [], total: 0 };
  }

  let pool = shuffleQuestions ? shuffle(questions) : [...questions];
  pool = pool.slice(0, Math.min(count, pool.length));

  const prepared = pool.map((q) => {
    const originalAnswer = q.answer ?? q.correctIndex ?? 0;
    const opts = Array.isArray(q.options) ? [...q.options] : [];
    const correctText = opts[originalAnswer];

    if (!shuffleOptions) {
      return {
        id: q.id || null,
        topic: q.topic || "General",
        question: q.q || q.question || "",
        options: opts,
        correctIndex: originalAnswer,
        explain: q.explain || "",
      };
    }

    // Shuffle options while tracking correct index
    const indices = opts.map((_, i) => i);
    const shuffled = shuffle(indices);
    const newOptions = shuffled.map((i) => opts[i]);
    const newCorrectIndex = shuffled.indexOf(originalAnswer);

    return {
      id: q.id || null,
      topic: q.topic || "General",
      question: q.q || q.question || "",
      options: newOptions,
      correctIndex: newCorrectIndex,
      explain: q.explain || "",
      // Keep original in case we need it
      _original: { options: opts, correctText },
    };
  });

  return { questions: prepared, total: prepared.length };
}

/* =========================================================
   QUIZ STATE
   ========================================================= */

export function createQuizState(quiz) {
  return {
    quiz,
    index: 0,
    correct: 0,
    incorrect: 0,
    topicResults: {},
    answers: [],
    startedAt: Date.now(),
    finishedAt: null,
  };
}

/* =========================================================
   ANSWER A QUESTION
   ========================================================= */

export function answerQuestion(state, selectedIndex) {
  const q = state.quiz.questions[state.index];
  if (!q) return null;

  const isCorrect = selectedIndex === q.correctIndex;
  const topic = q.topic || "General";

  // Track topic results
  if (!state.topicResults[topic]) {
    state.topicResults[topic] = { correct: 0, total: 0 };
  }
  state.topicResults[topic].total += 1;
  if (isCorrect) {
    state.topicResults[topic].correct += 1;
    state.correct += 1;
  } else {
    state.incorrect += 1;
  }

  // Save answer
  state.answers.push({
    index: state.index,
    selected: selectedIndex,
    correct: q.correctIndex,
    isCorrect,
    topic,
  });

  return {
    isCorrect,
    correctIndex: q.correctIndex,
    explain: q.explain,
  };
}

/* =========================================================
   ADVANCE
   ========================================================= */

export function nextQuestion(state) {
  state.index += 1;
  return state.index < state.quiz.questions.length;
}

export function isFinished(state) {
  return state.index >= state.quiz.questions.length;
}

/* =========================================================
   FINISH AND SCORE
   ========================================================= */

export function finishQuiz(state) {
  state.finishedAt = Date.now();
  const total = state.quiz.questions.length;
  const score = total ? Math.round((state.correct / total) * 100) : 0;
  const duration = Math.round((state.finishedAt - state.startedAt) / 1000);

  return {
    correct: state.correct,
    incorrect: state.incorrect,
    total,
    score,
    duration,
    topicResults: state.topicResults,
    answers: state.answers,
  };
}

/* =========================================================
   TOPIC ANALYSIS
   ========================================================= */

export function getWeakTopics(topicResults, threshold = 0.7) {
  return Object.entries(topicResults || {})
    .map(([name, s]) => ({
      name,
      correct: s.correct,
      total: s.total,
      score: s.total ? s.correct / s.total : 0,
    }))
    .filter((t) => t.score < threshold)
    .sort((a, b) => a.score - b.score);
}

export function getStrongTopics(topicResults, threshold = 0.8) {
  return Object.entries(topicResults || {})
    .map(([name, s]) => ({
      name,
      correct: s.correct,
      total: s.total,
      score: s.total ? s.correct / s.total : 0,
    }))
    .filter((t) => t.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

/* =========================================================
   AGGREGATE ATTEMPTS
   ========================================================= */

export function aggregateAttempts(attempts = []) {
  const total = attempts.length;
  const avgScore = total
    ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / total)
    : 0;

  const totalCorrect = attempts.reduce((sum, a) => sum + (a.correct || 0), 0);
  const totalQuestions = attempts.reduce((sum, a) => sum + (a.total || 0), 0);

  const topics = {};
  attempts.forEach((a) => {
    if (!a.topicResults) return;
    Object.entries(a.topicResults).forEach(([topic, s]) => {
      if (!topics[topic]) topics[topic] = { correct: 0, total: 0 };
      topics[topic].correct += s.correct || 0;
      topics[topic].total += s.total || 0;
    });
  });

  return {
    totalAttempts: total,
    averageScore: avgScore,
    totalCorrect,
    totalQuestions,
    accuracy: totalQuestions
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0,
    topics,
  };
}

/* =========================================================
   STREAK CALCULATION
   ========================================================= */

export function computeStreak(attempts = []) {
  if (!attempts.length) return 0;

  const days = new Set(
    attempts.map((a) => {
      const d = a.createdAt ? new Date(a.createdAt) : new Date(a.date);
      return d.toDateString();
    }),
  );

  let streak = 0;
  const cursor = new Date();

  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/* =========================================================
   SCORE BADGE
   ========================================================= */

export function scoreLabel(score) {
  if (score >= 90)
    return { label: "Outstanding", emoji: "🏆", color: "#fbbf24" };
  if (score >= 80) return { label: "Excellent", emoji: "🎉", color: "#10b981" };
  if (score >= 70) return { label: "Great", emoji: "✨", color: "#3b82f6" };
  if (score >= 60) return { label: "Good", emoji: "👍", color: "#a855f7" };
  if (score >= 40)
    return { label: "Keep practicing", emoji: "💪", color: "#f59e0b" };
  return { label: "Review needed", emoji: "📚", color: "#ef4444" };
}
