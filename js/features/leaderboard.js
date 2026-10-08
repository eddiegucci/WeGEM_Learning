// js/features/leaderboard.js
// Leaderboard / rankings for WeGEM Learning.

import { getLeaderboard, getUserRank } from "../core/db.js";
import { cacheLeaderboard, getCachedLeaderboard } from "../core/cache.js";
import { log, isOnline } from "../core/utils.js";

/* =========================================================
   TIME FILTERS
   ========================================================= */

function filterByTime(entries, timeframe) {
  if (timeframe === "all") return entries;

  const now = Date.now();
  const ranges = {
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };

  const cutoff = now - (ranges[timeframe] || 0);

  return entries.filter((e) => {
    const ts = e.lastActiveAt?.toMillis?.() || e.lastActiveAt || 0;
    return ts >= cutoff;
  });
}

/* =========================================================
   FETCH LEADERBOARD
   ========================================================= */

export async function fetchLeaderboard({
  timeframe = "all",
  curriculum = null,
  limit = 100,
} = {}) {
  // Try cache first
  let entries = [];
  try {
    entries = await getCachedLeaderboard();
  } catch (e) {
    log.warn("Cache read failed for leaderboard:", e);
  }

  // If online, fetch fresh
  if (isOnline()) {
    try {
      entries = await getLeaderboard(limit, curriculum);
      await cacheLeaderboard(entries);
    } catch (e) {
      log.warn("Could not fetch leaderboard, using cache:", e);
    }
  }

  if (curriculum) entries = entries.filter((e) => e.curriculum === curriculum);
  if (timeframe !== "all") entries = filterByTime(entries, timeframe);

  return entries.map((e, idx) => ({ ...e, rank: idx + 1 }));
}

/* =========================================================
   MY RANK
   ========================================================= */

export async function fetchMyRank(uid, curriculum = null) {
  if (!uid) return null;
  try {
    return await getUserRank(uid, curriculum);
  } catch (e) {
    log.warn("Could not fetch user rank:", e);
    return null;
  }
}

/* =========================================================
   FORMAT HELPERS
   ========================================================= */

export function formatRank(rank) {
  if (!rank) return "—";
  const medal = { 1: "🥇", 2: "🥈", 3: "🥉" }[rank];
  return medal ? `${medal} ${rank}` : `#${rank}`;
}

export function rankBadge(rank) {
  if (rank === 1) return "top-1";
  if (rank === 2) return "top-2";
  if (rank === 3) return "top-3";
  return "";
}

/* =========================================================
   COMPUTE RANKINGS FROM ATTEMPTS (fallback for offline)
   ========================================================= */

export function computeFromAttempts(attempts = [], users = {}) {
  const byUser = {};
  attempts.forEach((a) => {
    if (!a.uid) return;
    if (!byUser[a.uid])
      byUser[a.uid] = {
        uid: a.uid,
        score: 0,
        quizzes: 0,
        correct: 0,
        total: 0,
      };
    byUser[a.uid].score += a.score || 0;
    byUser[a.uid].quizzes += 1;
    byUser[a.uid].correct += a.correct || 0;
    byUser[a.uid].total += a.total || 0;
  });

  return Object.values(byUser)
    .map((u) => {
      const user = users[u.uid] || {};
      return {
        ...u,
        name: user.name || "Anonymous",
        school: user.school || "",
        averageScore: u.quizzes ? Math.round(u.score / u.quizzes) : 0,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}
