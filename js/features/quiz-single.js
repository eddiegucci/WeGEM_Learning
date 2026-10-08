// js/features/quiz-single.js
// Solo quiz flow for WeGEM Learning.

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
import { saveAttempt, updateLeaderboardEntry } from "../core/db.js";
import { cacheAttempt } from "../core/cache.js";
import { getQuestionsForSubject } from "../core/db.js";
import { getCachedQuestions } from "../core/cache.js";
import { toast, toastOk, toastErr } from "../ui/toast.js";
import { log, isOnline } from "../core/utils.js";

/* =========================================================
   FETCH QUESTIONS (cache-first)
   ========================================================= */

export async function fetchQuestions({ exam, subject, count = 10 }) {
  let questions = [];

  // Try cache first
  try {
    questions = await getCachedQuestions(exam, subject);
  } catch (e) {
    log.warn("Cache read failed:", e);
  }

  // If cache is empty and online, fetch from Firestore
  if (!questions.length && isOnline()) {
    try {
      questions = await getQuestionsForSubject(exam, subject);
      if (questions.length) {
        const { cacheQuestions } = await import("../core/cache.js");
        await cacheQuestions(questions);
      }
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
   RUN QUIZ
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
   SAVE ATTEMPT
   ========================================================= */

export async function persistAttempt(uid, { exam, subject, result }) {
  const attempt = {
    exam,
    subject,
    correct: result.correct,
    total: result.total,
    score: result.score,
    duration: result.duration,
    topicResults: result.topicResults,
    mode: "practice",
  };

  // Save to Firestore
  let savedToCloud = false;
  if (uid && isOnline()) {
    try {
      const id = await saveAttempt(uid, attempt);
      attempt.id = id;
      savedToCloud = true;

      // Update leaderboard
      await updateLeaderboardEntry(uid, {
        scoreDelta: result.score,
        quizDelta: 1,
        correctDelta: result.correct,
        totalDelta: result.total,
      });
    } catch (e) {
      log.warn("Could not save attempt to cloud:", e);
    }
  }

  // Always save to IndexedDB
  attempt.id = attempt.id || "local_" + Date.now();
  attempt.createdAt = new Date().toISOString();
  try {
    await cacheAttempt(attempt);
  } catch (e) {
    log.warn("Could not cache attempt:", e);
  }

  return { attempt, savedToCloud };
}

/* =========================================================
   RESULTS HELPERS
   ========================================================= */

export function getResultsSummary(result) {
  const badge = scoreLabel(result.score);
  const weak = getWeakTopics(result.topicResults);
  return { badge, weak };
}
