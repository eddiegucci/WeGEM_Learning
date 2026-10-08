// js/pages/home.js
// Controller for home.html — the main dashboard.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc, getUserAttempts } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
  cacheAttempts,
  getCachedAttempts,
} from "../core/cache.js";
import { initNav } from "../ui/nav.js";
import { toastErr, toastOk } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import {
  getSubjectIcon,
  getSubjectColor,
  getSubjects,
} from "../data/subjects.js";
import {
  aggregateAttempts,
  computeStreak,
  getWeakTopics,
  scoreLabel,
} from "../features/quiz-engine.js";
import {
  log,
  firstName,
  initials,
  escapeHTML,
  timeAgo,
  isOnline,
} from "../core/utils.js";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  user: null,
  userDoc: null,
  attempts: [],
};

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  greeting: document.getElementById("greeting"),
  heroName: document.getElementById("heroName"),
  heroSub: document.getElementById("heroSub"),
  heroStreak: document.getElementById("heroStreak"),
  heroStreakNote: document.getElementById("heroStreakNote"),
  heroAvg: document.getElementById("heroAvg"),
  heroAvgNote: document.getElementById("heroAvgNote"),
  heroQuizzes: document.getElementById("heroQuizzes"),
  heroQuizzesNote: document.getElementById("heroQuizzesNote"),
  heroHours: document.getElementById("heroHours"),
  heroHoursNote: document.getElementById("heroHoursNote"),
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),
  continueBtn: document.getElementById("continueBtn"),
  continueCardSub: document.getElementById("continueCardSub"),
  reviseList: document.getElementById("reviseList"),
  subjectList: document.getElementById("subjectList"),
  overallAvg: document.getElementById("overallAvg"),
  activityList: document.getElementById("activityList"),
  miniChart: document.getElementById("miniChart"),
  chartXAxis: document.getElementById("chartXAxis"),
  progressTotal: document.getElementById("progressTotal"),
  progressNote: document.getElementById("progressNote"),
};

/* =========================================================
   GREETING
   ========================================================= */

function setGreeting(name) {
  const hour = new Date().getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  if (els.greeting) els.greeting.textContent = greeting;
  if (els.heroName) els.heroName.textContent = firstName(name || "Student");
}

/* =========================================================
   RENDER HERO STATS
   ========================================================= */

function renderHeroStats(attempts) {
  const agg = aggregateAttempts(attempts);
  const streak = computeStreak(attempts);

  // Streak
  if (els.heroStreak) els.heroStreak.textContent = streak;
  if (els.heroStreakNote) {
    if (streak === 0) els.heroStreakNote.textContent = "Start today!";
    else if (streak === 1) els.heroStreakNote.textContent = "Just started";
    else if (streak < 7) els.heroStreakNote.textContent = "Keep it going!";
    else if (streak < 30) els.heroStreakNote.textContent = "On fire! 🔥";
    else els.heroStreakNote.textContent = "Unstoppable!";
  }

  // Average
  if (els.heroAvg) {
    els.heroAvg.innerHTML = `${agg.averageScore}<span class="hs-unit">%</span>`;
  }
  if (els.heroAvgNote) {
    const a = agg.averageScore;
    if (!agg.totalAttempts) els.heroAvgNote.textContent = "No data yet";
    else if (a >= 80) els.heroAvgNote.textContent = "Excellent! 🎉";
    else if (a >= 60) els.heroAvgNote.textContent = "Good work!";
    else if (a >= 40) els.heroAvgNote.textContent = "Room to grow";
    else els.heroAvgNote.textContent = "Keep practicing";
  }

  // Quizzes
  if (els.heroQuizzes) els.heroQuizzes.textContent = agg.totalAttempts;
  if (els.heroQuizzesNote) {
    if (!agg.totalAttempts) els.heroQuizzesNote.textContent = "Take your first";
    else if (agg.totalAttempts < 10)
      els.heroQuizzesNote.textContent = "Building momentum";
    else els.heroQuizzesNote.textContent = "Great consistency!";
  }

  // Study hours
  const minutes = attempts.reduce((s, a) => s + (a.duration || 0), 0) / 60;
  const hours = Math.round((minutes / 60) * 10) / 10;
  if (els.heroHours)
    els.heroHours.innerHTML = `${hours}<span class="hs-unit">h</span>`;
  if (els.heroHoursNote) {
    if (hours === 0) els.heroHoursNote.textContent = "This week";
    else els.heroHoursNote.textContent = `~${Math.round(minutes)} min total`;
  }
}

/* =========================================================
   RENDER REVISE NEXT
   ========================================================= */

function renderReviseNext(attempts) {
  if (!els.reviseList) return;

  const agg = aggregateAttempts(attempts);
  const weak = getWeakTopics(agg.topics, 0.75).slice(0, 3);

  if (!weak.length && !attempts.length) {
    const userSubjects = state.userDoc?.subjects || [];
    const previewSubjects = userSubjects.slice(0, 3);

    els.reviseList.innerHTML = `
      <p style="font-size: 13px; color: var(--text-mute); margin-bottom: 12px;">
        Take a quiz to see your weak topics here.
      </p>
      ${previewSubjects
        .map((s, i) => {
          const colors = ["#3b82f6", "#a855f7", "#10b981"];
          const color = colors[i % colors.length];
          return `
          <div class="revise-item">
            <div class="revise-left">
              <div class="revise-bar" style="background: ${color};"></div>
              <div style="min-width: 0;">
                <div class="revise-topic">${escapeHTML(s)}</div>
                <div class="revise-subtopic">Start practicing</div>
              </div>
            </div>
            <div class="revise-score" style="background: ${color}22; color: ${color};">NEW</div>
          </div>
        `;
        })
        .join("")}
    `;
    return;
  }

  if (!weak.length) {
    els.reviseList.innerHTML = `
      <div class="revise-item" style="border-bottom: none; padding: 8px 0;">
        <div style="text-align: center; width: 100%; color: var(--green-2); font-size: 13.5px; font-weight: 600;">
          🎉 No weak topics — great work!
        </div>
      </div>
    `;
    return;
  }

  const colors = ["#ef4444", "#f97316", "#f59e0b"];
  els.reviseList.innerHTML = weak
    .map((t, i) => {
      const color = colors[i % colors.length];
      const pct = Math.round(t.score * 100);
      return `
      <div class="revise-item">
        <div class="revise-left">
          <div class="revise-bar" style="background: ${color};"></div>
          <div style="min-width: 0;">
            <div class="revise-topic">${escapeHTML(t.name)}</div>
            <div class="revise-subtopic">${t.correct} of ${t.total} correct</div>
          </div>
        </div>
        <div class="revise-score" style="background: ${color}22; color: ${color};">
          ${pct}%
        </div>
      </div>
    `;
    })
    .join("");
}

/* =========================================================
   RENDER SUBJECT PERFORMANCE
   ========================================================= */

function renderSubjectPerformance(attempts) {
  if (!els.subjectList) return;

  const bySubject = {};
  attempts.forEach((a) => {
    if (!a.subject) return;
    if (!bySubject[a.subject])
      bySubject[a.subject] = { correct: 0, total: 0, score: 0, count: 0 };
    bySubject[a.subject].correct += a.correct || 0;
    bySubject[a.subject].total += a.total || 0;
    bySubject[a.subject].score += a.score || 0;
    bySubject[a.subject].count += 1;
  });

  const rows = Object.entries(bySubject)
    .map(([name, s]) => ({
      name,
      pct: s.count ? Math.round(s.score / s.count) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  if (!rows.length) {
    // Show user's subjects with 0% as a starting point
    const userSubjects = (state.userDoc?.subjects || []).slice(0, 8);
    if (userSubjects.length) {
      renderSubjectRows(
        userSubjects.map((s) => ({ name: s, pct: 0 })),
        0,
      );
    } else {
      els.subjectList.innerHTML = `
        <div class="empty-state" style="border: none; background: none;">
          <div class="empty-icon">📊</div>
          <div class="empty-title">No performance yet</div>
          <div class="empty-sub">Take a quiz to see your subject performance.</div>
        </div>
      `;
    }
    return;
  }

  const avg = Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length);
  renderSubjectRows(rows, avg);
}

function renderSubjectRows(rows, avg) {
  if (!els.subjectList) return;

  els.subjectList.innerHTML = rows
    .slice(0, 8)
    .map((r) => {
      const color = getSubjectColor(r.name);
      const icon = getSubjectIcon(r.name);
      return `
      <div class="subject-row">
        <div class="subject-info">
          <div class="subject-icon" style="background: ${color}22; color: ${color};">${icon}</div>
          <div class="subject-name">${escapeHTML(r.name)}</div>
        </div>
        <div class="subject-bar-wrap">
          <div class="subject-bar" style="width: ${r.pct}%; background: ${color}; box-shadow: 0 0 10px ${color}66;"></div>
        </div>
        <div class="subject-score" style="color: ${color};">${r.pct}%</div>
      </div>
    `;
    })
    .join("");

  if (els.overallAvg) els.overallAvg.textContent = avg + "%";
  if (els.progressTotal) els.progressTotal.textContent = avg + "%";
  if (els.progressNote) {
    if (avg >= 70) els.progressNote.textContent = "↗ Keep it up!";
    else if (avg >= 40) els.progressNote.textContent = "↗ Improving";
    else els.progressNote.textContent = "Practice more";
  }
}

/* =========================================================
   RENDER ACTIVITY
   ========================================================= */

function renderActivity(attempts) {
  if (!els.activityList) return;

  const recent = attempts.slice(0, 4);

  if (!recent.length) {
    els.activityList.innerHTML = `
      <div class="empty-state" style="border: none; background: none; padding: 20px;">
        <div class="empty-icon">🕐</div>
        <div class="empty-title">No activity yet</div>
        <div class="empty-sub">Take your first quiz to see your history.</div>
      </div>
    `;
    return;
  }

  els.activityList.innerHTML = recent
    .map((a) => {
      const icon = getSubjectIcon(a.subject);
      const color = getSubjectColor(a.subject);
      return `
      <div class="activity-item">
        <div class="activity-icon" style="background: ${color}22; color: ${color};">${icon}</div>
        <div class="activity-text">
          <div class="activity-title">${escapeHTML(a.subject)} Quiz</div>
          <div class="activity-meta">Score: ${a.score || 0}% · ${timeAgo(a.createdAt)}</div>
        </div>
      </div>
    `;
    })
    .join("");
}

/* =========================================================
   RENDER MINI CHART
   ========================================================= */

function renderMiniChart(attempts) {
  if (!els.miniChart) return;

  const recent = attempts.slice(0, 7).reverse();

  if (recent.length < 2) {
    els.miniChart.innerHTML = "";
    if (els.chartXAxis) {
      els.chartXAxis.innerHTML = `<span style="color: var(--text-mute); font-size: 11px;">Not enough data yet</span>`;
    }
    return;
  }

  const W = 300;
  const H = 120;
  const padTop = 15;
  const padBottom = 15;
  const chartH = H - padTop - padBottom;

  const scores = recent.map((a) => a.score || 0);
  const points = scores
    .map((s, i) => {
      const x = (i / (scores.length - 1)) * W;
      const y = padTop + chartH - (s / 100) * chartH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const polygonPoints = `${points} ${W},${H} 0,${H}`;

  els.miniChart.innerHTML = `
    <defs>
      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polyline points="${points}"
              fill="none" stroke="#fbbf24" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="${polygonPoints}" fill="url(#chartFill)"/>
  `;

  if (els.chartXAxis) {
    const labels = recent
      .map((a) => {
        const d = new Date(a.createdAt || Date.now());
        return `<span>${d.getDate()}</span>`;
      })
      .join("");
    els.chartXAxis.innerHTML = labels;
  }
}

/* =========================================================
   USER MENU
   ========================================================= */

async function handleUserMenu() {
  const ok = await confirmDialog({
    title: "Sign out?",
    message: `Signed in as ${state.user?.email || "Student"}.\n\nDo you want to sign out?`,
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
      toastErr("Could not sign out. Try again.");
    }
  }
}

/* =========================================================
   CONTINUE BUTTON
   ========================================================= */

function handleContinue() {
  window.location.href = "notes.html";
}

/* =========================================================
   LOAD DATA
   ========================================================= */

async function loadAttempts(uid) {
  let attempts = [];

  // Try cache first
  try {
    attempts = await getCachedAttempts();
  } catch (e) {
    log.warn("Could not read attempts from cache:", e);
  }

  // If online, fetch fresh
  if (isOnline() && uid) {
    try {
      const fresh = await getUserAttempts(uid, 200);
      if (fresh.length || !attempts.length) {
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

async function loadUserDoc(uid) {
  let doc = null;
  try {
    doc = await getCachedUserFromIDB(uid);
  } catch {}

  if (isOnline()) {
    try {
      const fresh = await getUserDoc(uid);
      if (fresh) {
        await cacheUser(fresh);
        doc = fresh;
      }
    } catch (e) {
      log.warn("Could not fetch user doc:", e);
    }
  }

  return doc;
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  try {
    // Wait for auth
    const user = await waitForAuth();
    if (!user) {
      window.location.replace("login.html");
      return;
    }

    state.user = user;

    // Set initial name (cached)
    const cached = getCachedUser();
    const initialName =
      cached?.displayName ||
      user.displayName ||
      user.email?.split("@")[0] ||
      "Student";
    setGreeting(initialName);

    if (els.userAvatar) els.userAvatar.textContent = initials(initialName);
    if (els.userNameTop) els.userNameTop.textContent = firstName(initialName);

    // Wire up nav
    initNav();

    // Load user doc + attempts in parallel
    const [doc, attempts] = await Promise.all([
      loadUserDoc(user.uid),
      loadAttempts(user.uid),
    ]);

    state.userDoc = doc;
    state.attempts = attempts;

    // Update name from doc if available
    if (doc?.name) {
      setGreeting(doc.name);
      if (els.userAvatar) els.userAvatar.textContent = initials(doc.name);
      if (els.userNameTop) els.userNameTop.textContent = firstName(doc.name);
    }

    // Personalize hero sub
    if (els.heroSub && doc) {
      const level = doc.level || "your level";
      if (doc.curriculum === "CBE") {
        els.heroSub.textContent = `Ready to improve your CBE ${level} score today?`;
      } else {
        els.heroSub.textContent = `Ready to improve your KCSE score today?`;
      }
    }

    // Personalize "continue" card
    if (els.continueCardSub) {
      if (doc?.subjects?.length) {
        els.continueCardSub.textContent = `Study ${doc.subjects.length} subjects — pick a topic`;
      } else {
        els.continueCardSub.textContent = "Browse notes and study by topic";
      }
    }

    // Render everything
    renderHeroStats(attempts);
    renderReviseNext(attempts);
    renderSubjectPerformance(attempts);
    renderActivity(attempts);
    renderMiniChart(attempts);

    // Wire up buttons
    els.userMenuBtn?.addEventListener("click", handleUserMenu);
    els.continueBtn?.addEventListener("click", handleContinue);

    log.info(`Dashboard loaded: ${attempts.length} attempts`);
  } catch (e) {
    log.error("Dashboard init failed:", e);
    toastErr("Could not load dashboard. Please refresh.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
