// js/storage.js — Local fallback for when users are not signed in

const STORAGE_KEY = "wegem_progress";

export function loadLocalProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: [], topics: {}, streak: 0, lastDay: null };
    return JSON.parse(raw);
  } catch (e) {
    return { attempts: [], topics: {}, streak: 0, lastDay: null };
  }
}

export function saveLocalProgress(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function recordLocalAttempt({
  exam,
  subject,
  correct,
  total,
  topicResults,
}) {
  const p = loadLocalProgress();
  const today = new Date().toDateString();

  if (p.lastDay !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    p.streak = p.lastDay === yesterday ? p.streak + 1 : 1;
    p.lastDay = today;
  }

  p.attempts.unshift({
    exam,
    subject,
    correct,
    total,
    date: new Date().toISOString(),
  });
  p.attempts = p.attempts.slice(0, 50);

  Object.entries(topicResults || {}).forEach(([topic, { correct, total }]) => {
    if (!p.topics[topic]) p.topics[topic] = { correct: 0, total: 0 };
    p.topics[topic].correct += correct;
    p.topics[topic].total += total;
  });

  saveLocalProgress(p);
}

export function computeStatsFromAttempts(attempts) {
  const totalQuizzes = attempts.length;
  const averageScore =
    totalQuizzes === 0
      ? 0
      : Math.round(
          attempts.reduce((sum, a) => sum + (a.correct / a.total) * 100, 0) /
            totalQuizzes,
        );

  // Streak from local state
  const p = loadLocalProgress();

  // Topics aggregate
  const topics = {};
  attempts.forEach((a) => {
    if (a.topicResults) {
      Object.entries(a.topicResults).forEach(([t, s]) => {
        if (!topics[t]) topics[t] = { correct: 0, total: 0 };
        topics[t].correct += s.correct;
        topics[t].total += s.total;
      });
    }
  });

  return {
    streak: p.streak,
    totalQuizzes,
    averageScore,
    topics,
    attempts,
  };
}

export function clearLocalProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
