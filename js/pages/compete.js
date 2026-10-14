// js/pages/compete.js
// Compete page controller.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import {
  createRoom,
  joinRoom,
  startGame,
  submitAnswerRtdb,
  advanceQuestion,
  leaveRoom,
  deleteRoom,
  subscribeToRoom,
  computeRoomRankings,
} from "../features/quiz-compete.js";
import { loadBanks, getAllSubjectsWithBankStatus } from "../compete/index.js";
import { SUBJECTS_BY_CURRICULUM } from "../data/subjects.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import { escapeHTML, firstName, initials, log } from "../core/utils.js";

const state = {
  user: null,
  userDoc: null,
  curriculum: "",
  level: "",
  roomCode: null,
  room: null,
  isHost: false,
  unsub: null,
  currentQuestion: -1,
  myAnswers: {},
  timerInterval: null,
  timerEndsAt: 0,
  timerSeconds: 20,
  advancing: false,
};

const els = {
  lobbyScreen: document.getElementById("lobbyScreen"),
  waitingScreen: document.getElementById("waitingScreen"),
  playScreen: document.getElementById("playScreen"),
  finalScreen: document.getElementById("finalScreen"),

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

  lobbyError: document.getElementById("lobbyError"),
  lobbyErrorText: document.getElementById("lobbyErrorText"),

  roomCodeDisplay: document.getElementById("roomCodeDisplay"),
  copyCodeBtn: document.getElementById("copyCodeBtn"),
  leaveRoomBtn: document.getElementById("leaveRoomBtn"),
  waitingSubject: document.getElementById("waitingSubject"),
  waitingCount: document.getElementById("waitingCount"),
  waitingTime: document.getElementById("waitingTime"),
  playerCount: document.getElementById("playerCount"),
  playerList: document.getElementById("playerList"),
  startGameBtn: document.getElementById("startGameBtn"),

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

  finalTitle: document.getElementById("finalTitle"),
  finalWinnerScore: document.getElementById("finalWinnerScore"),
  finalWinnerName: document.getElementById("finalWinnerName"),
  finalStandings: document.getElementById("finalStandings"),
  playAgainBtn: document.getElementById("playAgainBtn"),

  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),
};

/* =========================================================
   USER
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

    state.curriculum = doc?.curriculum || "";
    state.level = doc?.level || "";
  } catch (e) {
    log.warn("Could not load user doc:", e);
  }
  return true;
}

/* =========================================================
   LOAD BANKS
   ========================================================= */

async function loadAll() {
  try {
    await loadBanks(state.curriculum, state.level);
  } catch (e) {
    log.warn("Could not load compete banks:", e);
  }
}

/* =========================================================
   SUBJECT → BANK MAP
   ========================================================= */

function getSubjectBankMap() {
  if (!state.curriculum || !state.level) return {};

  const curriculumKey =
    state.curriculum === "CBE" || state.curriculum.toLowerCase() === "cbe"
      ? "CBE"
      : "844";

  const source = SUBJECTS_BY_CURRICULUM[curriculumKey];
  if (!source) return {};

  let subjects = source[state.level];

  if (!subjects) {
    const numMatch = String(state.level).match(/\d+/);
    if (numMatch) {
      const matchKey = Object.keys(source).find((k) => k.includes(numMatch[0]));
      if (matchKey) subjects = source[matchKey];
    }
  }

  if (!subjects || !subjects.length) return {};

  const withStatus = getAllSubjectsWithBankStatus(
    state.curriculum,
    state.level,
    subjects,
  );

  const map = {};
  withStatus.forEach(({ subject, bank }) => {
    map[subject] = bank;
  });
  return map;
}

/* =========================================================
   POPULATE CREATE FORM
   ========================================================= */

function populateCreateSubjects() {
  if (!els.createSubject) return;

  const subjectMap = getSubjectBankMap();
  const subjects = Object.keys(subjectMap);

  if (!subjects.length) {
    els.createSubject.innerHTML = `<option value="">No subjects available</option>`;
    els.confirmCreateBtn.disabled = true;
    showLobbyError(
      "No subjects found for your class. Check your profile settings.",
    );
    return;
  }

  const sorted = [...subjects].sort((a, b) => {
    const aHas = !!subjectMap[a];
    const bHas = !!subjectMap[b];
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return a.localeCompare(b);
  });

  els.createSubject.innerHTML = sorted
    .map((s) => {
      const hasBank = !!subjectMap[s];
      const label = hasBank ? s : `${s} — coming soon`;
      return `<option value="${escapeHTML(s)}">${escapeHTML(label)}</option>`;
    })
    .join("");

  els.confirmCreateBtn.disabled = false;
  clearLobbyError();
}

function showLobbyError(msg) {
  if (!els.lobbyError) return;
  els.lobbyError.classList.remove("hidden");
  if (els.lobbyErrorText) els.lobbyErrorText.textContent = msg;
}

function clearLobbyError() {
  els.lobbyError?.classList.add("hidden");
}

/* =========================================================
   SCREEN SWITCHING
   ========================================================= */

function showLobby() {
  els.lobbyScreen?.classList.remove("hidden");
  els.waitingScreen?.classList.add("hidden");
  els.playScreen?.classList.add("hidden");
  els.finalScreen?.classList.add("hidden");
  els.joinForm?.classList.add("hidden");
  els.createForm?.classList.add("hidden");
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
   CREATE ROOM
   ========================================================= */

async function handleCreateRoom() {
  clearLobbyError();

  const subject = els.createSubject?.value || "";
  const count = parseInt(els.createCount?.value || "10", 10);
  const seconds = parseInt(els.createTime?.value || "20", 10);

  if (!subject) return showLobbyError("Please choose a subject.");

  const subjectMap = getSubjectBankMap();
  const bank = subjectMap[subject];

  if (!bank) {
    return showLobbyError(
      `${subject} doesn't have a published compete bank yet. Pick another subject.`,
    );
  }

  els.confirmCreateBtn.disabled = true;
  els.confirmCreateBtn.textContent = "Creating…";

  try {
    const questions = bank.questions.slice(0, count).map((q) => ({
      question: q.q,
      options: q.options || [],
      correctIndex: q.answer ?? q.correctIndex ?? 0,
      topic: q.topic || subject,
      points: q.points ?? 100,
      timeLimit: q.timeLimit ?? seconds,
      explain: q.explain || "",
    }));

    if (!questions.length) throw new Error("Bank has no questions.");

    const { roomCode } = await createRoom({
      host: {
        uid: state.user.uid,
        name: state.userDoc?.name || state.user.displayName || "Player",
        school: state.userDoc?.school || "",
      },
      questions,
      settings: {
        subject,
        exam: bank.exam,
        questionsPerRound: questions.length,
        secondsPerQuestion: seconds,
      },
    });

    state.roomCode = roomCode;
    state.isHost = true;
    state.timerSeconds = seconds;

    toastOk(`Room created: ${roomCode}`);
    subscribeToCurrentRoom();
    showWaiting();
  } catch (e) {
    log.error("Create room failed:", e);
    showLobbyError(e.message || "Could not create room.");
  } finally {
    els.confirmCreateBtn.disabled = false;
    els.confirmCreateBtn.textContent = "Create →";
  }
}

/* =========================================================
   JOIN ROOM
   ========================================================= */

async function handleJoinRoom() {
  clearLobbyError();

  const code = (els.joinCodeInput?.value || "").trim().toUpperCase();

  if (code.length !== 6) {
    return toastErr("Please enter a 6-letter code.");
  }

  els.joinRoomBtn.disabled = true;
  els.joinRoomBtn.textContent = "Joining…";

  try {
    await joinRoom(code, {
      uid: state.user.uid,
      name: state.userDoc?.name || state.user.displayName || "Player",
      school: state.userDoc?.school || "",
    });

    state.roomCode = code;
    state.isHost = false;

    toastOk(`Joined room ${code}`);
    subscribeToCurrentRoom();
    showWaiting();
  } catch (e) {
    log.error("Join failed:", e);
    toastErr(e.message || "Could not join.");
    els.joinRoomBtn.disabled = false;
    els.joinRoomBtn.textContent = "Join →";
  }
}

/* =========================================================
   SUBSCRIBE
   ========================================================= */

function subscribeToCurrentRoom() {
  if (!state.roomCode) return;
  if (state.unsub) state.unsub();

  state.unsub = subscribeToRoom(state.roomCode, (room) => {
    if (!room) {
      toastErr("Room was closed.");
      cleanupRoom();
      showLobby();
      return;
    }

    state.room = room;
    if (room.settings?.secondsPerQuestion) {
      state.timerSeconds = room.settings.secondsPerQuestion;
    }

    const status = room.status;
    if (status === "waiting") {
      if (els.waitingScreen?.classList.contains("hidden")) showWaiting();
      renderWaitingRoom(room);
    } else if (status === "playing") {
      if (els.playScreen?.classList.contains("hidden")) showPlaying();
      renderPlayingRoom(room);
    } else if (status === "finished") {
      renderFinal();
      showFinal();
    }
  });
}

/* =========================================================
   WAITING ROOM
   ========================================================= */

function renderWaitingRoom(room) {
  if (els.roomCodeDisplay)
    els.roomCodeDisplay.textContent = room.code || "------";

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
        const classes = ["player-row", isMe ? "is-you" : ""]
          .filter(Boolean)
          .join(" ");
        return `
          <div class="${classes}">
            <div class="user-avatar" style="width: 36px; height: 36px; font-size: 14px;">${initials(p.name || "P")}</div>
            <div style="flex: 1; min-width: 0;">
              <div class="player-name">${escapeHTML(p.name || "Player")}${isMe ? ' <span class="player-badge">You</span>' : ""}</div>
              <div class="player-school">${escapeHTML(p.school || "—")}</div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  if (els.startGameBtn) {
    if (state.isHost) els.startGameBtn.classList.remove("hidden");
    else els.startGameBtn.classList.add("hidden");
  }
}

/* =========================================================
   COPY CODE
   ========================================================= */

async function handleCopyCode() {
  if (!state.roomCode) return;
  try {
    await navigator.clipboard.writeText(state.roomCode);
    toastOk("Code copied!");
  } catch {
    toastOk("Code: " + state.roomCode);
  }
}

/* =========================================================
   START GAME
   ========================================================= */

async function handleStartGame() {
  if (!state.isHost || !state.roomCode) return;

  const ok = await confirmDialog({
    title: "Start game?",
    message: "All players must answer in real time.",
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
  const currentIdx = room.currentQuestionIndex;
  if (currentIdx < 0) return;

  renderLiveScoreboard(room);

  if (currentIdx !== state.currentQuestion) {
    state.currentQuestion = currentIdx;
    renderQuestion(room.questions[currentIdx], currentIdx, room);
    startQuestionTimer();
  }

  const players = Object.values(room.players || {});
  const answeredCount = players.filter(
    (p) => p.answers && p.answers[currentIdx] !== undefined,
  ).length;

  if (els.playStatus) {
    if (answeredCount === players.length && players.length > 0) {
      els.playStatus.textContent = "Everyone answered — moving on…";
    } else {
      els.playStatus.textContent = `${answeredCount} / ${players.length} players answered`;
    }
  }

  if (
    state.isHost &&
    !state.advancing &&
    players.length > 0 &&
    answeredCount === players.length
  ) {
    state.advancing = true;
    setTimeout(async () => {
      try {
        await advanceQuestion(
          state.roomCode,
          currentIdx + 1,
          room.questions.length,
        );
      } catch (e) {
        log.warn("Advance failed:", e);
      } finally {
        state.advancing = false;
      }
    }, 900);
  }
}

function renderQuestion(q, index, room) {
  if (!q) return;

  const settings = room.settings || {};

  if (els.playMeta)
    els.playMeta.textContent = `${settings.exam || ""} · ${settings.subject || ""}`;
  if (els.playCounter)
    els.playCounter.textContent = `Question ${index + 1} of ${room.questions.length}`;
  if (els.playProgress) {
    els.playProgress.style.width = `${((index + 1) / room.questions.length) * 100}%`;
  }

  if (els.playTopic)
    els.playTopic.textContent = (
      q.topic ||
      settings.subject ||
      ""
    ).toUpperCase();
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
        handlePlayAnswer(idx, index, q);
      });
    });
  }

  if (els.playFeedback) {
    els.playFeedback.classList.add("hidden");
    els.playFeedback.className = "glass-feedback hidden";
  }
}

/* =========================================================
   ANSWER
   ========================================================= */

async function handlePlayAnswer(selectedIndex, questionIndex, q) {
  if (!state.roomCode || !state.room) return;
  if (state.myAnswers[questionIndex] !== undefined) return;

  state.myAnswers[questionIndex] = selectedIndex;

  const isCorrect = selectedIndex === q.correctIndex;

  const options = els.playOptions?.querySelectorAll(".option") || [];
  options.forEach((opt) => opt.classList.add("disabled"));
  options[q.correctIndex]?.classList.add("correct");
  if (!isCorrect) options[selectedIndex]?.classList.add("wrong");

  if (els.playFeedback) {
    els.playFeedback.className = `glass-feedback ${isCorrect ? "correct" : "wrong"}`;
    els.playFeedback.textContent = isCorrect ? "✓ Correct!" : "✗ Not quite.";
    els.playFeedback.classList.remove("hidden");
  }

  try {
    await submitAnswerRtdb(
      state.roomCode,
      state.user.uid,
      questionIndex,
      selectedIndex,
      isCorrect,
    );
  } catch (e) {
    log.warn("Submit failed:", e);
  }
}

/* =========================================================
   SCOREBOARD
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

function startQuestionTimer() {
  clearQuestionTimer();
  state.timerEndsAt = Date.now() + state.timerSeconds * 1000;

  updateTimerValue(state.timerSeconds);

  state.timerInterval = setInterval(() => {
    const remaining = Math.max(
      0,
      Math.ceil((state.timerEndsAt - Date.now()) / 1000),
    );
    updateTimerValue(remaining);

    if (remaining <= 0) {
      clearQuestionTimer();
      if (state.isHost && !state.advancing && state.room) {
        state.advancing = true;
        const next = state.currentQuestion + 1;
        advanceQuestion(state.roomCode, next, state.room.questions.length)
          .catch((e) => log.warn("Auto-advance failed:", e))
          .finally(() => {
            state.advancing = false;
            state.timerEndsAt = Date.now() + state.timerSeconds * 1000;
          });
      }
    }
  }, 250);
}

function updateTimerValue(seconds) {
  if (els.playTimer) {
    const val = els.playTimer.querySelector(".timer-value");
    if (val) val.textContent = seconds;
    els.playTimer.classList.remove("warn", "danger");
    if (seconds <= 5) els.playTimer.classList.add("danger");
    else if (seconds <= 10) els.playTimer.classList.add("warn");
  }
}

function clearQuestionTimer() {
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

  const isMe = winner.uid === state.user.uid;
  if (els.finalTitle) {
    els.finalTitle.textContent = isMe
      ? "You Win! 🏆"
      : `${winner.name} Wins! 🏆`;
  }

  const totalQ = room.questions?.length || 1;
  const pct = Math.round(((winner.score || 0) / totalQ) * 100);
  if (els.finalWinnerScore) els.finalWinnerScore.textContent = `${pct}%`;
  if (els.finalWinnerName)
    els.finalWinnerName.textContent = winner.name || "Champion";

  if (els.finalStandings) {
    els.finalStandings.innerHTML = rankings
      .map((p) => {
        const rank = p.rank;
        const cls =
          rank === 1
            ? "top-1"
            : rank === 2
              ? "top-2"
              : rank === 3
                ? "top-3"
                : "";
        return `
          <div class="lb-row ${cls}">
            <div class="lb-rank">${rank}</div>
            <div class="lb-user">
              <div class="user-avatar" style="width: 32px; height: 32px; font-size: 13px;">${initials(p.name || "P")}</div>
              <div style="min-width: 0;">
                <div class="lb-name">${escapeHTML(p.name || "Player")}${p.uid === state.user.uid ? " (you)" : ""}</div>
                <div class="lb-school">${escapeHTML(p.school || "")}</div>
              </div>
            </div>
            <div class="lb-score">${p.score || 0}</div>
          </div>
        `;
      })
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
      ? "This ends the game for everyone."
      : "You will leave the current room.",
    okLabel: state.isHost ? "Close Room" : "Leave",
    cancelLabel: "Stay",
    danger: true,
  });

  if (!ok) return;

  try {
    if (state.isHost && state.roomCode) await deleteRoom(state.roomCode);
    else if (state.roomCode) await leaveRoom(state.roomCode, state.user.uid);
  } catch (e) {
    log.warn("Leave failed:", e);
  } finally {
    cleanupRoom();
    showLobby();
  }
}

function cleanupRoom() {
  clearQuestionTimer();
  if (state.unsub) {
    state.unsub();
    state.unsub = null;
  }
  state.roomCode = null;
  state.room = null;
  state.currentQuestion = -1;
  state.myAnswers = {};
  state.isHost = false;
  state.advancing = false;
  if (els.roomCodeDisplay) els.roomCodeDisplay.textContent = "------";
}

/* =========================================================
   USER MENU
   ========================================================= */

async function handleUserMenu() {
  const ok = await confirmDialog({
    title: "Sign out?",
    message: `Signed in as ${state.user?.email || "Student"}.\n\nSign out?`,
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
      toastErr("Could not sign out.");
    }
  }
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  const ready = await setupUser();
  if (!ready) return;

  initNav();
  await loadAll();
  populateCreateSubjects();

  els.createRoomBtn?.addEventListener("click", () => {
    els.joinForm?.classList.add("hidden");
    els.createForm?.classList.remove("hidden");
    clearLobbyError();
  });

  els.showJoinBtn?.addEventListener("click", () => {
    els.createForm?.classList.add("hidden");
    els.joinForm?.classList.remove("hidden");
    setTimeout(() => els.joinCodeInput?.focus(), 150);
  });

  els.cancelJoinBtn?.addEventListener("click", () => {
    els.joinForm?.classList.add("hidden");
  });

  els.cancelCreateBtn?.addEventListener("click", () => {
    els.createForm?.classList.add("hidden");
  });

  els.confirmCreateBtn?.addEventListener("click", handleCreateRoom);
  els.joinRoomBtn?.addEventListener("click", handleJoinRoom);
  els.copyCodeBtn?.addEventListener("click", handleCopyCode);
  els.leaveRoomBtn?.addEventListener("click", handleLeaveRoom);
  els.startGameBtn?.addEventListener("click", handleStartGame);
  els.playAgainBtn?.addEventListener("click", () => {
    cleanupRoom();
    showLobby();
  });
  els.userMenuBtn?.addEventListener("click", handleUserMenu);

  els.joinCodeInput?.addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });

  els.joinCodeInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleJoinRoom();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
