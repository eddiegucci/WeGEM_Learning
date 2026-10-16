/* =========================================================
   STREAK CALCULATION
   Correctly counts consecutive days including today OR ending yesterday.
   Uses local-date keys (not UTC) so a quiz at 11pm counts for that day.
   ========================================================= */

function dayKey(dateInput) {
  // Returns "YYYY-MM-DD" in LOCAL time (not UTC)
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function todayKey() {
  return dayKey(new Date());
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

function dayBeforeKey(dateKey) {
  // Given "YYYY-MM-DD", return the previous day's key
  const parts = String(dateKey).split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

export function computeStreak(attempts = []) {
  if (!Array.isArray(attempts) || !attempts.length) return 0;

  // Build a set of unique local-date keys when the user was active
  const activeDays = new Set();
  attempts.forEach(function (a) {
    const when = a.createdAt || a.date;
    if (!when) return;
    const key = dayKey(when);
    if (key) activeDays.add(key);
  });

  if (!activeDays.size) return 0;

  const today = todayKey();
  const yesterday = yesterdayKey();

  // Streak must start today OR yesterday.
  let cursor;
  if (activeDays.has(today)) {
    cursor = today;
  } else if (activeDays.has(yesterday)) {
    cursor = yesterday;
  } else {
    // No activity today or yesterday → streak is broken
    return 0;
  }

  // Walk backwards counting consecutive days
  let streak = 0;
  while (activeDays.has(cursor)) {
    streak += 1;
    cursor = dayBeforeKey(cursor);
    if (streak > 3650) break; // safety valve (10 years)
  }

  return streak;
}
