// js/pages/compete.js
// Compete page controller — typed-answer multiplayer.
// Reads compete banks from js/compete/index.js.

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
  submitTypedAnswer,
  advanceQuestion,
  leaveRoom,
  deleteRoom,
  subscribeToRoom,
  computeRoomRankings,
  scoreAnswer,
} from "../features/quiz-compete.js";
import { loadBanks, getBanksForUser } from "../compete/index.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import { escapeHTML, firstName, initials, log } from "../core/utils.js";

const state = {
  user: null,
  userDoc: null,
  curriculum: "",
  level: "",
  availableBanks: [],
  selectedBankTitle: "",
  roomCode: null,
  room: null,
  isHost: false,
  unsub: null,
  currentQuestion: -1,
  myAnswers: {},
  timerInterval: null,
  timerEndsAt: 0,
  timerSeconds: 60,
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
  createQuiz: document.getElementById("createQuiz"),
  createTime: document.getElementById("createTime"),
  confirmCreateBtn: document.getElementById("confirmCreateBtn"),
  cancelCreateBtn: document.getElementById("cancelCreateBtn"),
  lobbyError: document.getElementById("lobbyError"),
  lobbyErrorText: document.getElementById("lobbyErrorText"),
  roomCodeDisplay: document.getElementById("roomCodeDisplay"),
  copyCodeBtn: document.getElementById("copyCodeBtn"),
  leaveRoomBtn: document.getElementById("leaveRoomBtn"),
  waitingQuiz: document.getElementById("waitingQuiz"),
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
  playMarks: document.getElementById("playMarks"),
  playAnswerBox: document.getElementById("playAnswerBox"),
  playSubmitBtn: document.getElementById("playSubmitBtn"),
  playStatus: document.getElementById("playStatus"),
  finalTitle: document.getElementById("finalTitle"),
  finalWinnerScore: document.getElementById("finalWinnerScore"),
  finalWinnerName: document.getElementById("finalWinnerName"),
  finalStandings: document.getElementById("finalStandings"),
  playAgainBtn: document.getElementById("playAgainBtn"),
  reviewAnswersBtn: document.getElementById("reviewAnswersBtn"),
  finalReviewSection: document.getElementById("finalReviewSection"),
  finalReviewList: document.getElementById("finalReviewList"),
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
  state.availableBanks = getBanksForUser(state.curriculum, state.level);
  log.info("Compete page: " + state.availableBanks.length + " available banks");
}

function populateBankDropdown() {
  if (!els.createQuiz) return;

  if (!state.availableBanks.length) {
    els.createQuiz.innerHTML =
      '<option value="">No compete banks available</option>';
    els.confirmCreateBtn.disabled = true;
    showLobbyError("No published compete banks for your class yet.");
    return;
  }

  els.createQuiz.innerHTML = state.availableBanks
    .map(function (b) {
      const qs = (b.questions && b.questions.length) || 0;
      const label = (b.subject || "Untitled") + " · " + qs + " Qs";
      return (
        '<option value="' +
        escapeHTML(b.subject + "::" + (b.title || "")) +
        '">' +
        escapeHTML(label) +
        "</option>"
      );
    })
    .join("");

  state.selectedBankTitle =
    (state.availableBanks[0].subject || "") +
    "::" +
    (state.availableBanks[0].title || "");
  els.confirmCreateBtn.disabled = false;
  clearLobbyError();
}

function getSelectedBank() {
  return state.availableBanks.find(function (b) {
    return b.subject + "::" + (b.title || "") === state.selectedBankTitle;
  });
}

/* =========================================================
   ERRORS
   ========================================================= */

function showLobbyError(msg) {
  if (!els.lobbyError) return;
  els.lobbyError.classList.remove("hidden");
  if (els.lobbyErrorText) els.lobbyErrorText.textContent = msg;
}

function clearLobbyError() {
  if (els.lobbyError) els.lobbyError.classList.add("hidden");
}

/* =========================================================
   SCREENS
   ========================================================= */

function showLobby() {
  if (els.lobbyScreen) els.lobbyScreen.classList.remove("hidden");
  if (els.waitingScreen) els.waitingScreen.classList.add("hidden");
  if (els.playScreen) els.playScreen.classList.add("hidden");
  if (els.finalScreen) els.finalScreen.classList.add("hidden");
  if (els.joinForm) els.joinForm.classList.add("hidden");
  if (els.createForm) els.createForm.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showWaiting() {
  if (els.lobbyScreen) els.lobbyScreen.classList.add("hidden");
  if (els.waitingScreen) els.waitingScreen.classList.remove("hidden");
  if (els.playScreen) els.playScreen.classList.add("hidden");
  if (els.finalScreen) els.finalScreen.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPlaying() {
  if (els.lobbyScreen) els.lobbyScreen.classList.add("hidden");
  if (els.waitingScreen) els.waitingScreen.classList.add("hidden");
  if (els.playScreen) els.playScreen.classList.remove("hidden");
  if (els.finalScreen) els.finalScreen.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showFinal() {
  if (els.lobbyScreen) els.lobbyScreen.classList.add("hidden");
  if (els.waitingScreen) els.waitingScreen.classList.add("hidden");
  if (els.playScreen) els.playScreen.classList.add("hidden");
  if (els.finalScreen) els.finalScreen.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   CREATE ROOM
   ========================================================= */

async function handleCreateRoom() {
  clearLobbyError();

  const bank = getSelectedBank();
  const seconds = parseInt(els.createTime?.value || "60", 10);

  if (!bank) return showLobbyError("Please choose a quiz.");

  els.confirmCreateBtn.disabled = true;
  els.confirmCreateBtn.textContent = "Creating…";

  try {
    if (!bank.questions || !bank.questions.length) {
      throw new Error("This bank has no questions.");
    }

    const result = await createRoom({
      host: {
        uid: state.user.uid,
        name: state.userDoc?.name || state.user.displayName || "Player",
        school: state.userDoc?.school || "",
      },
      quiz: bank,
      settings: { secondsPerQuestion: seconds },
    });

    state.roomCode = result.roomCode;
    state.isHost = true;
    state.timerSeconds = seconds;

    toastOk("Room created: " + result.roomCode);
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
  if (code.length !== 6) return toastErr("Please enter a 6-letter code.");

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
    toastOk("Joined room " + code);
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

  state.unsub = subscribeToRoom(state.roomCode, function (room) {
    if (!room) {
      toastErr("Room was closed.");
      cleanupRoom();
      showLobby();
      return;
    }

    state.room = room;
    if (room.settings && room.settings.secondsPerQuestion) {
      state.timerSeconds = room.settings.secondsPerQuestion;
    }

    const status = room.status;
    if (status === "waiting") {
      if (els.waitingScreen && els.waitingScreen.classList.contains("hidden"))
        showWaiting();
      renderWaitingRoom(room);
    } else if (status === "playing") {
      if (els.playScreen && els.playScreen.classList.contains("hidden"))
        showPlaying();
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

  const s = room.settings || {};
  if (els.waitingQuiz)
    els.waitingQuiz.textContent = s.title || s.subject || "—";
  if (els.waitingCount)
    els.waitingCount.textContent = s.questionsPerRound || "—";
  if (els.waitingTime)
    els.waitingTime.textContent = (s.secondsPerQuestion || 60) + "s";

  const players = Object.values(room.players || {});
  if (els.playerCount) els.playerCount.textContent = players.length;

  if (els.playerList) {
    els.playerList.innerHTML = players
      .map(function (p) {
        const isMe = p.uid === state.user.uid;
        const classes = ["player-row", isMe ? "is-you" : ""]
          .filter(Boolean)
          .join(" ");
        return (
          '<div class="' +
          classes +
          '">' +
          '<div class="user-avatar" style="width:36px;height:36px;font-size:14px;">' +
          initials(p.name || "P") +
          "</div>" +
          '<div style="flex:1;min-width:0;">' +
          '<div class="player-name">' +
          escapeHTML(p.name || "Player") +
          (isMe ? ' <span class="player-badge">You</span>' : "") +
          "</div>" +
          '<div class="player-school">' +
          escapeHTML(p.school || "—") +
          "</div>" +
          "</div>" +
          "</div>"
        );
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
    message: "All players answer in real time.",
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
   PLAYING
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
  const answeredCount = players.filter(function (p) {
    return p.answers && p.answers[currentIdx] !== undefined;
  }).length;

  if (els.playStatus) {
    if (answeredCount === players.length && players.length > 0) {
      els.playStatus.textContent = "Everyone answered — moving on…";
    } else {
      els.playStatus.textContent =
        answeredCount + " / " + players.length + " players answered";
    }
  }

  if (
    state.isHost &&
    !state.advancing &&
    players.length > 0 &&
    answeredCount === players.length
  ) {
    state.advancing = true;
    setTimeout(function () {
      advanceQuestion(state.roomCode, currentIdx + 1, room.questions.length)
        .catch(function (e) {
          log.warn("Advance failed:", e);
        })
        .finally(function () {
          state.advancing = false;
        });
    }, 1200);
  }
}

function renderQuestion(q, index, room) {
  if (!q) return;
  const settings = room.settings || {};

  if (els.playMeta)
    els.playMeta.textContent =
      (settings.exam || "") + " · " + (settings.subject || "");
  if (els.playCounter)
    els.playCounter.textContent =
      "Question " + (index + 1) + " of " + room.questions.length;
  if (els.playProgress) {
    els.playProgress.style.width =
      ((index + 1) / room.questions.length) * 100 + "%";
  }
  if (els.playTopic)
    els.playTopic.textContent = String(
      q.topic || settings.subject || "",
    ).toUpperCase();
  if (els.playQuestion) els.playQuestion.textContent = q.question;
  if (els.playMarks)
    els.playMarks.textContent = q.marks + " mark" + (q.marks === 1 ? "" : "s");

  if (els.playAnswerBox) {
    els.playAnswerBox.value = "";
    els.playAnswerBox.disabled = false;
    els.playAnswerBox.focus();
  }
  if (els.playSubmitBtn) {
    els.playSubmitBtn.disabled = false;
    els.playSubmitBtn.textContent = "Submit Answer";
  }
}

/* =========================================================
   SUBMIT ANSWER
   ========================================================= */

async function handleSubmitAnswer() {
  if (!state.roomCode || !state.room) return;
  const qIndex = state.currentQuestion;
  if (qIndex < 0) return;
  if (state.myAnswers[qIndex] !== undefined) return;

  const text = (els.playAnswerBox?.value || "").trim();
  if (!text) return toastErr("Please type an answer.");

  const question = state.room.questions[qIndex];
  const result = scoreAnswer(question, text);

  state.myAnswers[qIndex] = text;

  if (els.playAnswerBox) els.playAnswerBox.disabled = true;
  if (els.playSubmitBtn) {
    els.playSubmitBtn.disabled = true;
    els.playSubmitBtn.textContent = "Submitted ✓";
  }

  toastOk("Scored " + result.scored + "/" + result.marks);

  try {
    await submitTypedAnswer(
      state.roomCode,
      state.user.uid,
      qIndex,
      text,
      result.scored,
      result.marks,
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
    .map(function (p) {
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

      return (
        '<div class="' +
        classes +
        '">' +
        '<div class="cp-name">' +
        escapeHTML(p.name || "Player") +
        (isMe ? " (you)" : "") +
        "</div>" +
        '<div class="cp-score">' +
        (p.score || 0) +
        "</div>" +
        "</div>"
      );
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

  state.timerInterval = setInterval(function () {
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
          .catch(function (e) {
            log.warn("Auto-advance failed:", e);
          })
          .finally(function () {
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
    else if (seconds <= 15) els.playTimer.classList.add("warn");
  }
}

function clearQuestionTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

/* =========================================================
   FINAL — creative results
   ========================================================= */

function fireConfetti(durationMs) {
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  document.body.appendChild(layer);

  const colors = [
    "#fbbf24",
    "#f59e0b",
    "#3b82f6",
    "#10b981",
    "#ec4899",
    "#a855f7",
  ];
  const count = 80;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = (Math.random() * 0.6).toFixed(2) + "s";
    piece.style.animationDuration =
      (2.4 + Math.random() * 1.2).toFixed(2) + "s";
    piece.style.transform = "rotate(" + Math.random() * 360 + "deg)";
    layer.appendChild(piece);
  }

  setTimeout(function () {
    layer.remove();
  }, durationMs || 4000);
}

function ringSvg(percent) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const offset = 283 - (clamped / 100) * 283;
  return (
    '<div class="creative-ring">' +
    '<svg viewBox="0 0 100 100">' +
    '<circle class="ring-bg" cx="50" cy="50" r="45"></circle>' +
    '<circle class="ring-fill" cx="50" cy="50" r="45" data-offset="' +
    offset +
    '"></circle>' +
    "</svg>" +
    '<div class="creative-ring-value">' +
    clamped +
    "%</div>" +
    "</div>"
  );
}

function buildBadges(room, winner, me) {
  const badges = [];
  const players = Object.values(room.players || {});
  const totalQ = (room.questions || []).length;

  if (winner) {
    if (winner.score >= totalQ * 0.8)
      badges.push({ icon: "🏆", label: "Top Scorer", cls: "" });
    if (winner.score >= totalQ * 0.9)
      badges.push({ icon: "⭐", label: "Sharp", cls: "success" });
  }
  if (players.length >= 3)
    badges.push({
      icon: "👥",
      label: players.length + " Players",
      cls: "info",
    });
  if (me && winner && me.uid === winner.uid)
    badges.push({ icon: "🥇", label: "Champion", cls: "" });

  if (!badges.length) return "";

  return (
    '<div class="creative-badges">' +
    badges
      .map(function (b) {
        return (
          '<span class="creative-badge ' +
          (b.cls || "") +
          '">' +
          b.icon +
          " " +
          b.label +
          "</span>"
        );
      })
      .join("") +
    "</div>"
  );
}

function renderFinal() {
  const room = state.room;
  if (!room) return;

  const rankings = computeRoomRankings(room);
  const winner = rankings[0];
  if (!winner) return;

  const me =
    rankings.find(function (p) {
      return p.uid === state.user.uid;
    }) || null;
  const isWinner = winner.uid === state.user.uid;
  const winnerPct = Math.round(
    ((winner.score || 0) / (winner.totalMarks || 1)) * 100,
  );

  if (els.finalTitle)
    els.finalTitle.textContent = isWinner
      ? "You Win! 🏆"
      : winner.name + " Wins! 🏆";

  if (els.finalWinnerScore) els.finalWinnerScore.textContent = winnerPct + "%";
  if (els.finalWinnerName)
    els.finalWinnerName.textContent = winner.name || "Champion";

  fireConfetti(4200);

  const scoreContainer = els.finalWinnerScore
    ? els.finalWinnerScore.parentElement
    : null;
  if (scoreContainer && scoreContainer.parentElement) {
    const existing =
      scoreContainer.parentElement.querySelector(".creative-rings");
    if (existing) existing.remove();
    const existingBadges =
      scoreContainer.parentElement.querySelector(".creative-badges");
    if (existingBadges) existingBadges.remove();

    const top3 = rankings.slice(0, 3);
    const ringsHtml =
      '<div class="creative-rings">' +
      top3
        .map(function (p) {
          const pct = Math.round(((p.score || 0) / (p.totalMarks || 1)) * 100);
          return (
            '<div class="creative-ring-card">' +
            ringSvg(pct) +
            '<div class="creative-ring-label">' +
            escapeHTML((p.name || "Player").slice(0, 16)) +
            "</div>" +
            "</div>"
          );
        })
        .join("") +
      "</div>";

    const badgesHtml = buildBadges(room, winner, me);
    scoreContainer.insertAdjacentHTML("afterend", ringsHtml + badgesHtml);
  }

  setTimeout(function () {
    document
      .querySelectorAll(".creative-ring .ring-fill")
      .forEach(function (c) {
        const offset = c.getAttribute("data-offset");
        if (offset !== null) c.style.strokeDashoffset = offset;
      });
  }, 120);

  if (els.finalStandings) {
    els.finalStandings.innerHTML = rankings
      .map(function (p) {
        const rank = p.rank;
        const cls =
          rank === 1
            ? "top-1"
            : rank === 2
              ? "top-2"
              : rank === 3
                ? "top-3"
                : "";
        const marks = p.totalMarks || 1;
        const scorePct = Math.round(((p.score || 0) / marks) * 100);
        return (
          '<div class="lb-row ' +
          cls +
          ' creative-standing">' +
          '<div class="lb-rank">' +
          rank +
          "</div>" +
          '<div class="lb-user">' +
          '<div class="user-avatar" style="width:32px;height:32px;font-size:13px;">' +
          initials(p.name || "P") +
          "</div>" +
          '<div style="min-width:0;">' +
          '<div class="lb-name">' +
          escapeHTML(p.name || "Player") +
          (p.uid === state.user.uid ? " (you)" : "") +
          "</div>" +
          '<div class="lb-school">' +
          escapeHTML(p.school || "") +
          "</div>" +
          "</div>" +
          "</div>" +
          '<div class="lb-score">' +
          scorePct +
          "%</div>" +
          "</div>"
        );
      })
      .join("");
  }
}

/* =========================================================
   FINAL REVIEW
   ========================================================= */

function renderFinalReview() {
  const room = state.room;
  if (!room || !els.finalReviewList) return;

  const players = Object.values(room.players || {});
  const questions = room.questions || [];

  els.finalReviewList.innerHTML = questions
    .map(function (q, i) {
      const markpointsHtml = (q.markpoints || [])
        .map(function (mp) {
          const text = typeof mp === "string" ? mp : mp.text;
          const marks = typeof mp === "string" ? 1 : mp.marks || 1;
          return (
            '<div class="review-point hit">' +
            '<span class="review-icon">✓</span>' +
            '<span class="review-text">' +
            escapeHTML(text) +
            "</span>" +
            '<span class="review-marks">' +
            marks +
            " mark" +
            (marks === 1 ? "" : "s") +
            "</span>" +
            "</div>"
          );
        })
        .join("");

      const playersHtml = players
        .map(function (p) {
          const answer = (p.answers && p.answers[i]) || null;
          const answerText = answer && answer.text ? answer.text : null;
          const scored = answer ? answer.scored || 0 : 0;
          const marks = answer ? answer.marks || q.marks || 1 : q.marks || 1;
          const isMe = p.uid === state.user.uid;
          const hasAnswer = answerText !== null && answerText !== "";
          const answerClass = hasAnswer
            ? scored > 0
              ? "hit"
              : "missed"
            : "missed";

          return (
            '<div class="review-point ' +
            answerClass +
            '">' +
            '<span class="review-icon">' +
            (hasAnswer ? "•" : "✗") +
            "</span>" +
            '<span class="review-text">' +
            "<strong>" +
            escapeHTML(p.name || "Player") +
            (isMe ? " (you)" : "") +
            ":</strong> " +
            (hasAnswer ? escapeHTML(answerText) : "<em>No answer</em>") +
            "</span>" +
            '<span class="review-marks">' +
            scored +
            "/" +
            marks +
            "</span>" +
            "</div>"
          );
        })
        .join("");

      return (
        '<div class="review-item">' +
        '<div class="review-item-head">' +
        '<span class="review-num">Q' +
        (i + 1) +
        "</span>" +
        '<span class="review-score">' +
        (q.marks || 1) +
        " mark" +
        (q.marks === 1 ? "" : "s") +
        "</span>" +
        "</div>" +
        '<div class="review-question">' +
        escapeHTML(q.question) +
        "</div>" +
        '<div class="review-scheme">' +
        '<div class="scheme-title">Correct answers:</div>' +
        markpointsHtml +
        "</div>" +
        '<div class="review-scheme" style="margin-top: var(--sp-4);">' +
        '<div class="scheme-title">Player answers:</div>' +
        playersHtml +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  if (els.finalReviewSection) els.finalReviewSection.classList.remove("hidden");
  if (els.reviewAnswersBtn) els.reviewAnswersBtn.classList.add("hidden");
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
  if (els.finalReviewSection) els.finalReviewSection.classList.add("hidden");
  if (els.reviewAnswersBtn) els.reviewAnswersBtn.classList.remove("hidden");

  // Clean up injected creative blocks
  document.querySelectorAll(".creative-rings").forEach(function (n) {
    n.remove();
  });
  document.querySelectorAll(".creative-badges").forEach(function (n) {
    n.remove();
  });
}

/* =========================================================
   USER MENU
   ========================================================= */

async function handleUserMenu() {
  const ok = await confirmDialog({
    title: "Sign out?",
    message:
      "Signed in as " + (state.user?.email || "Student") + ".\n\nSign out?",
    okLabel: "Sign Out",
    cancelLabel: "Stay",
    danger: true,
  });
  if (ok) {
    try {
      if (state.roomCode) {
        if (state.isHost)
          await deleteRoom(state.roomCode).catch(function () {});
        else
          await leaveRoom(state.roomCode, state.user.uid).catch(function () {});
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
  populateBankDropdown();

  if (els.createQuiz) {
    els.createQuiz.addEventListener("change", function () {
      state.selectedBankTitle = els.createQuiz.value;
    });
  }
  if (els.createRoomBtn) {
    els.createRoomBtn.addEventListener("click", function () {
      if (els.joinForm) els.joinForm.classList.add("hidden");
      if (els.createForm) els.createForm.classList.remove("hidden");
      clearLobbyError();
    });
  }
  if (els.showJoinBtn) {
    els.showJoinBtn.addEventListener("click", function () {
      if (els.createForm) els.createForm.classList.add("hidden");
      if (els.joinForm) els.joinForm.classList.remove("hidden");
      setTimeout(function () {
        els.joinCodeInput?.focus();
      }, 150);
    });
  }
  if (els.cancelJoinBtn)
    els.cancelJoinBtn.addEventListener("click", function () {
      if (els.joinForm) els.joinForm.classList.add("hidden");
    });
  if (els.cancelCreateBtn)
    els.cancelCreateBtn.addEventListener("click", function () {
      if (els.createForm) els.createForm.classList.add("hidden");
    });
  if (els.confirmCreateBtn)
    els.confirmCreateBtn.addEventListener("click", handleCreateRoom);
  if (els.joinRoomBtn)
    els.joinRoomBtn.addEventListener("click", handleJoinRoom);
  if (els.copyCodeBtn)
    els.copyCodeBtn.addEventListener("click", handleCopyCode);
  if (els.leaveRoomBtn)
    els.leaveRoomBtn.addEventListener("click", handleLeaveRoom);
  if (els.startGameBtn)
    els.startGameBtn.addEventListener("click", handleStartGame);
  if (els.playSubmitBtn)
    els.playSubmitBtn.addEventListener("click", handleSubmitAnswer);
  if (els.reviewAnswersBtn)
    els.reviewAnswersBtn.addEventListener("click", renderFinalReview);
  if (els.playAgainBtn)
    els.playAgainBtn.addEventListener("click", function () {
      cleanupRoom();
      showLobby();
    });
  if (els.userMenuBtn)
    els.userMenuBtn.addEventListener("click", handleUserMenu);

  if (els.joinCodeInput) {
    els.joinCodeInput.addEventListener("input", function (e) {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    });
    els.joinCodeInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleJoinRoom();
    });
  }
  if (els.playAnswerBox) {
    els.playAnswerBox.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmitAnswer();
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
