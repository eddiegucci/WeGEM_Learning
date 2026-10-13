// js/features/leaderboard.js
// Leaderboard feature.

import { getLeaderboard, getUserRank } from "../core/db.js";
import { cacheLeaderboard, getCachedLeaderboard } from "../core/cache.js";
import { log, isOnline } from "../core/utils.js";

/* =========================================================
   TIME FILTER
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
   FETCH
   ========================================================= */

export async function fetchLeaderboard({
  timeframe = "all",
  curriculum = null,
  limit = 100,
} = {}) {
  let entries = [];

  try {
    entries = await getCachedLeaderboard();
  } catch (e) {
    log.warn("Cache read failed for leaderboard:", e);
  }

  if (isOnline()) {
    try {
      entries = await getLeaderboard(limit, curriculum);
      await cacheLeaderboard(entries);
    } catch (e) {
      log.warn("Cloud fetch failed, using cache:", e);
    }
  }

  if (curriculum) {
    entries = entries.filter((e) => e.curriculum === curriculum);
  }

  if (timeframe !== "all") {
    entries = filterByTime(entries, timeframe);
  }

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
    log.warn("Could not fetch rank:", e);
    return null;
  }
}

/* =========================================================
   FORMAT
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
