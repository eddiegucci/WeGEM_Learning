// js/pages/compete.js
// Controller for compete.html — multiplayer quiz.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import {
  createRoom,
  joinRoom,
  setPlayerReady,
  startGame,
  submitAnswerRtdb,
  advanceQuestion,
  leaveRoom,
  deleteRoom,
  subscribeToRoom,
  computeRoomRankings,
  loadCompeteQuestions,
} from "../features/quiz-compete.js";
import {
  getSubjects,
  getSubjectIcon,
  getSubjectColor,
  EXAM_BY_LEVEL,
} from "../data/subjects.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr, toastInfo } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import { escapeHTML, firstName, initials, log } from "../core/utils.js";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  user: null,
  userDoc: null,
  roomCode: null,
  room: null,
  isHost: false,
  unsub: null, // unsubscribe function from subscribeToRoom
  currentQuestion: -1,
  answers: {}, // { questionIndex: true/false }
  timerInterval: null,
  timerEndsAt: 0,
  questionStartHandled: false,
  advancing: false,
};

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  // Screens
  lobbyScreen: document.getElementById("lobbyScreen"),
  waitingScreen: document.getElementById("waitingScreen"),
  playScreen: document.getElementById("playScreen"),
  finalScreen: document.getElementById("finalScreen"),

  // Lobby
  createRoomBtn: document.getElementById("createRoomBtn"),
  showJoinBtn: document.getElementById("showJoinBtn"),
  joinForm: document.getElementById("joinForm"),
  joinCodeInput: document.getElementById("joinCodeInput"),
  joinRoomBtn: document.getElementById("joinRoomBtn"),
  cancelJoinBtn: document.getElementById("cancelJoinBtn"),
  createForm: document.getElementById("createForm"),
  createSubject: document.getElementById("createSubject"),
  createCount: document.getElementById("createCount"),
  createTime: document.getElementById("createTime"),
  confirmCreateBtn: document.getElementById("confirmCreateBtn"),
  cancelCreateBtn: document.getElementById("cancelCreateBtn"),

  // Waiting
  roomCodeDisplay: document.getElementById("roomCodeDisplay"),
  copyCodeBtn: document.getElementById("copyCodeBtn"),
  waitingSubject: document.getElementById("waitingSubject"),
  waitingCount: document.getElementById("waitingCount"),
  waitingTime: document.getElementById("waitingTime"),
  playerCount: document.getElementById("playerCount"),
  playerList: document.getElementById("playerList"),
  leaveRoomBtn: document.getElementById("leaveRoomBtn"),
  startGameBtn: document.getElementById("startGameBtn"),

  // Playing
  playMeta: document.getElementById("playMeta"),
  playCounter: document.getElementById("playCounter"),
  playTimer: document.getElementById("playTimer"),
  playProgress: document.getElementById("playProgress"),
  liveScoreboard: document.getElementById("liveScoreboard"),
  playTopic: document.getElementById("playTopic"),
  playQuestion: document.getElementById("playQuestion"),
  playOptions: document.getElementById("playOptions"),
  playFeedback: document.getElementById("playFeedback"),
  playStatus: document.getElementById("playStatus"),

  // Final
  finalTitle: document.getElementById("finalTitle"),
  finalWinnerScore: document.getElementById("finalWinnerScore"),
  finalWinnerName: document.getElementById("finalWinnerName"),
  finalStandings: document.getElementById("finalStandings"),
  playAgainBtn: document.getElementById("playAgainBtn"),

  // User
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),
};

/* =========================================================
   SETUP USER
   ========================================================= */

async function setupUser() {
  const user = await waitForAuth();
  if (!user) {
    window.location.replace("login.html");
    return false;
  }
  state.user = user;

  const cached = getCachedUser();
  const displayName =
    cached?.displayName ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Student";

  if (els.userAvatar) els.userAvatar.textContent = initials(displayName);
  if (els.userNameTop) els.userNameTop.textContent = firstName(displayName);

  try {
    let doc = await getCachedUserFromIDB(user.uid);
    if (!doc) {
      doc = await getUserDoc(user.uid);
      if (doc) await cacheUser(doc);
    }
    state.userDoc = doc;

    if (doc?.name) {
      if (els.userAvatar) els.userAvatar.textContent = initials(doc.name);
      if (els.userNameTop) els.userNameTop.textContent = firstName(doc.name);
    }
  } catch (e) {
    log.warn("Could not load user doc:", e);
  }

  return true;
}

/* =========================================================
   SCREEN SWITCHING
   ========================================================= */

function showLobby() {
  els.lobbyScreen?.classList.remove("hidden");
  els.waitingScreen?.classList.add("hidden");
  els.playScreen?.classList.add("hidden");
  els.finalScreen?.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showWaiting() {
  els.lobbyScreen?.classList.add("hidden");
  els.waitingScreen?.classList.remove("hidden");
  els.playScreen?.classList.add("hidden");
  els.finalScreen?.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPlaying() {
  els.lobbyScreen?.classList.add("hidden");
  els.waitingScreen?.classList.add("hidden");
  els.playScreen?.classList.remove("hidden");
  els.finalScreen?.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showFinal() {
  els.lobbyScreen?.classList.add("hidden");
  els.waitingScreen?.classList.add("hidden");
  els.playScreen?.classList.add("hidden");
  els.finalScreen?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   LOBBY
   ========================================================= */

function populateCreateSubject() {
  if (!els.createSubject) return;

  const curriculum = state.userDoc?.curriculum === "CBE" ? "CBE" : "844";
  const level =
    state.userDoc?.level || (curriculum === "CBE" ? "Grade 9" : "Form 4");

  let subjects = state.userDoc?.subjects || [];
  if (!subjects.length) subjects = getSubjects(curriculum, level);
  subjects = Array.from(new Set(subjects));

  els.createSubject.innerHTML =
    `<option value="">Select subject</option>` +
    subjects
      .map((s) => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`)
      .join("");
}

function showJoinForm() {
  els.joinForm?.classList.remove("hidden");
  els.createForm?.classList.add("hidden");
  setTimeout(() => els.joinCodeInput?.focus(), 150);
}

function showCreateForm() {
  els.createForm?.classList.remove("hidden");
  els.joinForm?.classList.add("hidden");
}

function hideForms() {
  els.joinForm?.classList.add("hidden");
  els.createForm?.classList.add("hidden");
}

/* =========================================================
   CREATE ROOM
   ========================================================= */

async function handleCreateRoom() {
  const subject = els.createSubject?.value;
  const count = parseInt(els.createCount?.value || "10", 10);
  const seconds = parseInt(els.createTime?.value || "20", 10);

  if (!subject) {
    toastErr("Please choose a subject.");
    els.createSubject?.focus();
    return;
  }

  els.confirmCreateBtn.disabled = true;
  els.confirmCreateBtn.textContent = "Creating…";

  try {
    // Load questions
    const exam = getExamForLevel();
    const questions = await loadCompeteQuestions({ exam, subject, count });

    if (!questions.length)
      throw new Error("No questions available for this subject.");

    // Create the room
    const { roomCode } = await createRoom({
      host: {
        uid: state.user.uid,
        name: state.userDoc?.name || state.user.displayName || "Player",
        school: state.userDoc?.school || "",
        avatar: "",
      },
      questions,
      settings: {
        subject,
        exam,
        questionsPerRound: count,
        secondsPerQuestion: seconds,
      },
    });

    state.roomCode = roomCode;
    state.isHost = true;

    toastOk(`Room created: ${roomCode}`);
    subscribeToCurrentRoom();
    showWaiting();
  } catch (e) {
    log.error("Create room failed:", e);
    toastErr(e.message || "Could not create room.");
  } finally {
    els.confirmCreateBtn.disabled = false;
    els.confirmCreateBtn.textContent = "Create Room →";
  }
}

/* =========================================================
   JOIN ROOM
   ========================================================= */

async function handleJoinRoom() {
  const code = (els.joinCodeInput?.value || "").trim().toUpperCase();

  if (code.length !== 6) {
    toastErr("Please enter a 6-letter code.");
    els.joinCodeInput?.focus();
    return;
  }

  els.joinRoomBtn.disabled = true;
  els.joinRoomBtn.textContent = "Joining…";

  try {
    await joinRoom(code, {
      uid: state.user.uid,
      name: state.userDoc?.name || state.user.displayName || "Player",
      school: state.userDoc?.school || "",
      avatar: "",
    });

    state.roomCode = code;
    state.isHost = false;

    toastOk(`Joined room ${code}`);
    subscribeToCurrentRoom();
    showWaiting();
  } catch (e) {
    log.error("Join room failed:", e);
    toastErr(e.message || "Could not join room.");
    els.joinRoomBtn.disabled = false;
    els.joinRoomBtn.textContent = "Join →";
  }
}

/* =========================================================
   ROOM SUBSCRIPTION
   ========================================================= */

function subscribeToCurrentRoom() {
  if (!state.roomCode) return;

  // Cleanup previous
  if (state.unsub) state.unsub();

  state.unsub = subscribeToRoom(state.roomCode, (room) => {
    if (!room) {
      toastErr("Room was closed.");
      cleanupRoom();
      showLobby();
      return;
    }

    state.room = room;
    handleRoomUpdate(room);
  });
}

function handleRoomUpdate(room) {
  const myUid = state.user.uid;
  const me = room.players?.[myUid];

  // Show correct screen based on status
  if (
    room.status === "waiting" &&
    els.waitingScreen?.classList.contains("hidden")
  ) {
    showWaiting();
  }
  if (
    room.status === "playing" &&
    els.playScreen?.classList.contains("hidden")
  ) {
    showPlaying();
  }
  if (
    room.status === "finished" &&
    els.finalScreen?.classList.contains("hidden")
  ) {
    renderFinal();
    showFinal();
  }

  // Update waiting screen
  if (room.status === "waiting") {
    renderWaitingRoom(room);
  }

  // Update playing screen
  if (room.status === "playing") {
    renderPlayingRoom(room);
  }
}

/* =========================================================
   WAITING ROOM
   ========================================================= */

function renderWaitingRoom(room) {
  if (els.roomCodeDisplay) {
    els.roomCodeDisplay.textContent = room.code || "------";
  }

  const settings = room.settings || {};
  if (els.waitingSubject)
    els.waitingSubject.textContent = settings.subject || "—";
  if (els.waitingCount)
    els.waitingCount.textContent = settings.questionsPerRound || "—";
  if (els.waitingTime)
    els.waitingTime.textContent = (settings.secondsPerQuestion || 20) + "s";

  const players = Object.values(room.players || {});
  if (els.playerCount) els.playerCount.textContent = players.length;

  if (els.playerList) {
    els.playerList.innerHTML = players
      .map((p) => {
        const isMe = p.uid === state.user.uid;
        const classes = [
          "player-row",
          isMe ? "is-you" : "",
          p.ready ? "ready" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return `
        <div class="${classes}">
          <div class="user-avatar">${initials(p.name || "P")}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; color: #fff; font-size: 14px;">${escapeHTML(p.name || "Player")}${isMe ? " (you)" : ""}</div>
            <div style="font-size: 11.5px; color: var(--text-mute);">${escapeHTML(p.school || "")}</div>
          </div>
          <div class="player-status">${p.ready ? "Ready" : "Waiting"}</div>
        </div>
      `;
      })
      .join("");
  }

  // Show start button to host
  if (els.startGameBtn) {
    if (state.isHost) {
      els.startGameBtn.style.display = "";
      els.startGameBtn.disabled = false;
    } else {
      els.startGameBtn.style.display = "none";
    }
  }

  if (els.leaveRoomBtn) {
    els.leaveRoomBtn.textContent = state.isHost ? "Cancel Room" : "Leave";
  }
}

async function handleCopyCode() {
  if (!state.roomCode) return;
  try {
    await navigator.clipboard.writeText(state.roomCode);
    toastOk("Code copied!");
  } catch {
    // Fallback: select the text
    toastInfo("Code: " + state.roomCode);
  }
}

/* =========================================================
   START GAME
   ========================================================= */

async function handleStartGame() {
  if (!state.isHost || !state.roomCode) return;

  const ok = await confirmDialog({
    title: "Start game?",
    message: "All players must answer in real time. Ready to go?",
    okLabel: "Start",
    cancelLabel: "Wait",
  });

  if (!ok) return;

  try {
    await startGame(state.roomCode);
    toastOk("Game starting!");
  } catch (e) {
    log.error("Start failed:", e);
    toastErr("Could not start the game.");
  }
}

/* =========================================================
   PLAYING ROOM
   ========================================================= */

function renderPlayingRoom(room) {
  const settings = room.settings || {};
  const questions = room.questions || [];
  const currentIdx = room.currentQuestionIndex;

  if (currentIdx < 0) return;

  // Show scoreboard
  renderLiveScoreboard(room);

  // Handle question transitions
  if (currentIdx !== state.currentQuestion) {
    state.currentQuestion = currentIdx;
    state.questionStartHandled = false;
    renderQuestion(questions[currentIdx], currentIdx);
  }

  // Timer
  if (!state.timerInterval && settings.secondsPerQuestion) {
    startTimer(settings.secondsPerQuestion, questions.length);
  }

  // Update status message
  const players = Object.values(room.players || {});
  const answeredCount = players.filter(
    (p) => p.answers && p.answers[currentIdx] !== undefined,
  ).length;
  if (els.playStatus) {
    if (answeredCount === players.length) {
      els.playStatus.textContent = "Everyone answered! Moving on…";
    } else {
      els.playStatus.textContent = `${answeredCount} / ${players.length} players answered`;
    }
  }

  // Host advances when everyone answers
  if (
    state.isHost &&
    !state.advancing &&
    players.length > 0 &&
    answeredCount === players.length
  ) {
    state.advancing = true;
    setTimeout(async () => {
      try {
        await advanceQuestion(state.roomCode, currentIdx + 1, questions.length);
      } catch (e) {
        log.warn("Advance failed:", e);
      } finally {
        state.advancing = false;
      }
    }, 800);
  }
}

function renderQuestion(q, index) {
  if (!q) return;

  const room = state.room;
  const meta = room.settings || {};

  if (els.playMeta) {
    els.playMeta.textContent = `${meta.exam || "Quiz"} · ${meta.subject || "Subject"}`;
  }
  if (els.playCounter) {
    els.playCounter.textContent = `Question ${index + 1} of ${room.questions.length}`;
  }
  if (els.playProgress) {
    els.playProgress.style.width = `${(index / room.questions.length) * 100}%`;
  }

  if (els.playTopic)
    els.playTopic.textContent = (q.topic || "GENERAL").toUpperCase();
  if (els.playQuestion) els.playQuestion.textContent = q.question;

  if (els.playOptions) {
    els.playOptions.innerHTML = q.options
      .map(
        (opt, i) => `
      <button class="option" type="button" data-option-index="${i}">
        <span class="option-letter">${"ABCD"[i]}</span>
        <span>${escapeHTML(opt)}</span>
      </button>
    `,
      )
      .join("");

    els.playOptions.querySelectorAll(".option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.optionIndex, 10);
        handlePlayAnswer(idx, index);
      });
    });
  }

  if (els.playFeedback) {
    els.playFeedback.classList.add("hidden");
  }
}

/* =========================================================
   ANSWER IN PLAY
   ========================================================= */

async function handlePlayAnswer(selectedIndex, questionIndex) {
  if (!state.roomCode || !state.room) return;
  if (state.answers[questionIndex] !== undefined) return;

  const room = state.room;
  const q = room.questions?.[questionIndex];
  if (!q) return;

  const isCorrect = selectedIndex === q.correctIndex;
  state.answers[questionIndex] = isCorrect;

  // Disable all options and mark
  const allOptions = els.playOptions?.querySelectorAll(".option") || [];
  allOptions.forEach((btn) => btn.classList.add("disabled"));
  allOptions[q.correctIndex]?.classList.add("correct");
  if (!isCorrect) {
    allOptions[selectedIndex]?.classList.add("wrong");
  }

  // Show feedback
  if (els.playFeedback) {
    els.playFeedback.className = `feedback ${isCorrect ? "correct" : "wrong"}`;
    els.playFeedback.innerHTML = isCorrect
      ? `<strong>✓ Correct</strong>${escapeHTML(q.explain || "")}`
      : `<strong>✗ Not quite</strong>Correct: <b>${escapeHTML(q.options[q.correctIndex])}</b>`;
    els.playFeedback.classList.remove("hidden");
  }

  // Submit to Firebase
  try {
    await submitAnswerRtdb(
      state.roomCode,
      state.user.uid,
      questionIndex,
      selectedIndex,
      isCorrect,
    );
  } catch (e) {
    log.warn("Could not submit answer:", e);
  }
}

/* =========================================================
   LIVE SCOREBOARD
   ========================================================= */

function renderLiveScoreboard(room) {
  if (!els.liveScoreboard) return;

  const rankings = computeRoomRankings(room);

  els.liveScoreboard.innerHTML = rankings
    .map((p) => {
      const isMe = p.uid === state.user.uid;
      const answered =
        p.answers && p.answers[room.currentQuestionIndex] !== undefined;
      const classes = [
        "compete-player-card",
        isMe ? "is-you" : "",
        answered ? "answered" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
      <div class="${classes}">
        <div class="cp-name">${escapeHTML(p.name || "Player")}${isMe ? " (you)" : ""}</div>
        <div class="cp-score">${p.score || 0}</div>
      </div>
    `;
    })
    .join("");
}

/* =========================================================
   TIMER
   ========================================================= */

function startTimer(seconds, totalQuestions) {
  clearTimer();
  state.timerEndsAt = Date.now() + seconds * 1000;

  state.timerInterval = setInterval(() => {
    const remaining = Math.max(
      0,
      Math.ceil((state.timerEndsAt - Date.now()) / 1000),
    );
    if (els.playTimer) els.playTimer.textContent = remaining;

    if (remaining <= 0) {
      clearTimer();
      // Host moves to next question
      if (state.isHost && !state.advancing) {
        state.advancing = true;
        const next = state.currentQuestion + 1;
        advanceQuestion(state.roomCode, next, totalQuestions)
          .catch((e) => log.warn("Auto-advance failed:", e))
          .finally(() => {
            state.advancing = false;
            // Reset timer for next question
            state.timerEndsAt = Date.now() + seconds * 1000;
          });
      }
    }
  }, 250);
}

function clearTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

/* =========================================================
   FINAL SCREEN
   ========================================================= */

function renderFinal() {
  const room = state.room;
  if (!room) return;

  const rankings = computeRoomRankings(room);
  const winner = rankings[0];
  if (!winner) return;

  if (els.finalTitle) {
    const isMe = winner.uid === state.user.uid;
    els.finalTitle.textContent = isMe
      ? "You Win! 🏆"
      : `${escapeHTML(winner.name)} Wins! 🏆`;
  }

  const totalQ = room.questions?.length || 1;
  const pct = Math.round(((winner.score || 0) / totalQ) * 100);
  if (els.finalWinnerScore) els.finalWinnerScore.textContent = `${pct}%`;
  if (els.finalWinnerName)
    els.finalWinnerName.textContent = winner.name || "Champion";

  if (els.finalStandings) {
    els.finalStandings.innerHTML = rankings
      .map(
        (p, idx) => `
      <div class="lb-row ${p.rank === 1 ? "top-1" : p.rank === 2 ? "top-2" : p.rank === 3 ? "top-3" : ""}">
        <div class="lb-rank">${p.rank}</div>
        <div class="lb-user">
          <div class="lb-avatar">${initials(p.name || "P")}</div>
          <div style="min-width: 0;">
            <div class="lb-name">${escapeHTML(p.name || "Player")}${p.uid === state.user.uid ? " (you)" : ""}</div>
            <div class="lb-school">${escapeHTML(p.school || "")}</div>
          </div>
        </div>
        <div>
          <div class="lb-score">${p.score || 0}</div>
          <div class="lb-score-label">points</div>
        </div>
      </div>
    `,
      )
      .join("");
  }
}

/* =========================================================
   LEAVE / CLEANUP
   ========================================================= */

async function handleLeaveRoom() {
  const ok = await confirmDialog({
    title: state.isHost ? "Close room?" : "Leave room?",
    message: state.isHost
      ? "This will end the game for everyone."
      : "You will leave the current game.",
    okLabel: state.isHost ? "Close Room" : "Leave",
    cancelLabel: "Stay",
    danger: true,
  });

  if (!ok) return;

  try {
    if (state.isHost && state.roomCode) {
      await deleteRoom(state.roomCode);
    } else if (state.roomCode) {
      await leaveRoom(state.roomCode, state.user.uid);
    }
  } catch (e) {
    log.warn("Leave failed:", e);
  } finally {
    cleanupRoom();
    showLobby();
  }
}

function cleanupRoom() {
  clearTimer();
  if (state.unsub) {
    state.unsub();
    state.unsub = null;
  }
  state.roomCode = null;
  state.room = null;
  state.currentQuestion = -1;
  state.answers = {};
  state.isHost = false;
  state.advancing = false;
  state.questionStartHandled = false;

  els.roomCodeDisplay && (els.roomCodeDisplay.textContent = "------");
  hideForms();
}

function handlePlayAgain() {
  cleanupRoom();
  showLobby();
}

/* =========================================================
   HELPERS
   ========================================================= */

function getExamForLevel() {
  if (!state.userDoc) return "KCSE";
  const curriculum = state.userDoc.curriculum || "844";
  const level =
    state.userDoc.level || (curriculum === "CBE" ? "Grade 9" : "Form 4");
  return EXAM_BY_LEVEL[curriculum]?.[level] || "KCSE";
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
      if (state.roomCode) {
        if (state.isHost) await deleteRoom(state.roomCode).catch(() => {});
        else await leaveRoom(state.roomCode, state.user.uid).catch(() => {});
      }
      await signOutNow();
      window.location.replace("login.html");
    } catch (e) {
      log.error("Sign out failed:", e);
      toastErr("Could not sign out.");
    }
  }
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  try {
    const ready = await setupUser();
    if (!ready) return;

    initNav();
    populateCreateSubject();

    // Lobby buttons
    els.createRoomBtn?.addEventListener("click", showCreateForm);
    els.showJoinBtn?.addEventListener("click", showJoinForm);
    els.cancelJoinBtn?.addEventListener("click", hideForms);
    els.cancelCreateBtn?.addEventListener("click", hideForms);

    els.joinRoomBtn?.addEventListener("click", handleJoinRoom);
    els.confirmCreateBtn?.addEventListener("click", handleCreateRoom);

    // Waiting room
    els.copyCodeBtn?.addEventListener("click", handleCopyCode);
    els.leaveRoomBtn?.addEventListener("click", handleLeaveRoom);
    els.startGameBtn?.addEventListener("click", handleStartGame);

    // Final
    els.playAgainBtn?.addEventListener("click", handlePlayAgain);

    // User menu
    els.userMenuBtn?.addEventListener("click", handleUserMenu);

    // Enter key submits join code
    els.joinCodeInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleJoinRoom();
    });

    // Auto-uppercase join code
    els.joinCodeInput?.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    });

    // Warn on leaving while in a room
    window.addEventListener("beforeunload", (e) => {
      if (state.roomCode) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    showLobby();
    log.info("Compete page ready");
  } catch (e) {
    log.error("Compete init failed:", e);
    toastErr("Could not load compete page.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
