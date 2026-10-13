// js/features/quiz-single.js
// Solo quiz flow. Handles fetch, save, and offline re-sync.

import {
  buildQuiz,
  createQuizState,
  answerQuestion,
  nextQuestion,
  isFinished,
  finishQuiz,
  getWeakTopics,
  scoreLabel,
} from "./quiz-engine.js";
import {
  saveAttempt,
  updateLeaderboardEntry,
  getQuestionsForSubject,
} from "../core/db.js";
import {
  cacheAttempt,
  cacheQuestions,
  getCachedQuestions,
} from "../core/cache.js";
import { log, isOnline } from "../core/utils.js";

/* =========================================================
   FETCH QUESTIONS — cache first
   ========================================================= */

export async function fetchQuestions({ exam, subject, count = 10 }) {
  let questions = [];

  try {
    questions = await getCachedQuestions(exam, subject);
  } catch (e) {
    log.warn("Cache read failed:", e);
  }

  if (!questions.length && isOnline()) {
    try {
      questions = await getQuestionsForSubject(exam, subject);
      if (questions.length) await cacheQuestions(questions);
    } catch (e) {
      log.warn("Firestore fetch failed:", e);
    }
  }

  if (!questions.length) {
    throw new Error("No questions available for this subject yet.");
  }

  return buildQuiz(questions, { count });
}

/* =========================================================
   FLOW WRAPPERS
   ========================================================= */

export function startQuiz(quiz) {
  return createQuizState(quiz);
}

export function submitAnswer(state, selectedIndex) {
  return answerQuestion(state, selectedIndex);
}

export function goNext(state) {
  return nextQuestion(state);
}

export function finished(state) {
  return isFinished(state);
}

export function complete(state) {
  return finishQuiz(state);
}

/* =========================================================
   PERSIST ATTEMPT
   ========================================================= */

export async function persistAttempt(uid, { exam, subject, result }) {
  const attempt = {
    uid,
    exam,
    subject,
    correct: result.correct,
    total: result.total,
    score: result.score,
    duration: result.duration,
    topicResults: result.topicResults,
    mode: "practice",
  };

  let savedToCloud = false;

  if (uid && isOnline()) {
    try {
      const id = await saveAttempt(uid, attempt);
      attempt.id = id;
      savedToCloud = true;

      try {
        await updateLeaderboardEntry(uid, {
          scoreDelta: result.score,
          quizDelta: 1,
          correctDelta: result.correct,
          totalDelta: result.total,
        });
      } catch (e) {
        log.warn("Leaderboard update failed:", e);
      }
    } catch (e) {
      log.warn("Cloud save failed, will retry on sync:", e);
    }
  }

  // Always cache locally. If it never reached the cloud, mark as pending.
  attempt.id = attempt.id || "local_" + Date.now();
  attempt.createdAt = new Date().toISOString();
  attempt.pending = !savedToCloud;

  try {
    await cacheAttempt(attempt);
  } catch (e) {
    log.warn("Local cache failed:", e);
  }

  return { attempt, savedToCloud };
}

/* =========================================================
   RESULTS SUMMARY
   ========================================================= */

export function getResultsSummary(result) {
  const badge = scoreLabel(result.score);
  const weak = getWeakTopics(result.topicResults);
  return { badge, weak };
}
