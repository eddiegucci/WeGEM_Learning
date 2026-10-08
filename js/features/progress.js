// js/features/progress.js
// Progress analytics for WeGEM Learning.

import { getUserAttempts } from "../core/db.js";
import { getCachedAttempts, cacheAttempts } from "../core/cache.js";
import {
  aggregateAttempts,
  computeStreak,
  getWeakTopics,
} from "./quiz-engine.js";
import { log, isOnline } from "../core/utils.js";

/* =========================================================
   FETCH ATTEMPTS
   ========================================================= */

export async function fetchAttempts(uid, max = 200) {
  let attempts = [];

  try {
    attempts = await getCachedAttempts();
  } catch (e) {
    log.warn("Could not read cached attempts:", e);
  }

  if (uid && isOnline()) {
    try {
      const fresh = await getUserAttempts(uid, max);
      if (fresh.length) {
        await cacheAttempts(fresh);
        attempts = fresh;
      }
    } catch (e) {
      log.warn("Could not fetch attempts:", e);
    }
  }

  return attempts.sort((a, b) => {
    const at = new Date(a.createdAt || 0).getTime();
    const bt = new Date(b.createdAt || 0).getTime();
    return bt - at;
  });
}

/* =========================================================
   BUILD STATS
   ========================================================= */

export function buildStats(attempts) {
  const agg = aggregateAttempts(attempts);
  const streak = computeStreak(attempts);

  const weakTopics = getWeakTopics(agg.topics);
  const strongTopics = Object.entries(agg.topics || {})
    .map(([name, s]) => ({
      name,
      correct: s.correct,
      total: s.total,
      score: s.total ? s.correct / s.total : 0,
    }))
    .filter((t) => t.score >= 0.8)
    .sort((a, b) => b.score - a.score);

  const studyMinutes = Math.round(
    attempts.reduce((sum, a) => sum + (a.duration || 0), 0) / 60,
  );

  return {
    ...agg,
    streak,
    weakTopics,
    strongTopics,
    studyMinutes,
    studyHours: Math.round((studyMinutes / 60) * 10) / 10,
  };
}

/* =========================================================
   SUBJECT BREAKDOWN
   ========================================================= */

export function subjectBreakdown(attempts) {
  const bySubject = {};

  attempts.forEach((a) => {
    if (!a.subject) return;
    if (!bySubject[a.subject]) {
      bySubject[a.subject] = {
        subject: a.subject,
        correct: 0,
        total: 0,
        count: 0,
        score: 0,
      };
    }
    bySubject[a.subject].correct += a.correct || 0;
    bySubject[a.subject].total += a.total || 0;
    bySubject[a.subject].count += 1;
    bySubject[a.subject].score += a.score || 0;
  });

  return Object.values(bySubject)
    .map((s) => ({
      ...s,
      averageScore: s.count ? Math.round(s.score / s.count) : 0,
      accuracy: s.total ? Math.round((s.correct / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.averageScore - a.averageScore);
}

/* =========================================================
   CHART DATA (last N attempts)
   ========================================================= */

export function chartData(attempts, count = 10) {
  const recent = attempts.slice(0, count).reverse();
  return recent.map((a) => ({
    date: a.createdAt,
    score: a.score || 0,
    subject: a.subject || "",
  }));
}

/* =========================================================
   TIME RANGE
   ========================================================= */

export function filterByRange(attempts, range = "all") {
  if (range === "all") return attempts;
  const now = Date.now();
  const ranges = {
    week: 7 * 86400000,
    month: 30 * 86400000,
    today: 24 * 86400000,
  };
  const cutoff = now - (ranges[range] || 0);
  return attempts.filter((a) => {
    const ts = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    return ts >= cutoff;
  });
}
