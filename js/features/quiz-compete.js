// js/features/quiz-compete.js
// Real-time multiplayer typed-answer quiz.
// Reads compete banks from js/compete/ (separate from solo quiz).

import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  onDisconnect,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { firebaseConfig } from "../config/firebase-config.js";
import { log } from "../core/utils.js";

/* =========================================================
   INIT
   ========================================================= */

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);

/* =========================================================
   CONSTANTS
   ========================================================= */

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_ROOM_AGE_MS = 30 * 60 * 1000;

/* =========================================================
   ROOM CODE
   ========================================================= */

export function generateRoomCode() {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS.charAt(
      Math.floor(Math.random() * ROOM_CODE_CHARS.length),
    );
  }
  return code;
}

/* =========================================================
   CREATE ROOM
   ========================================================= */

export async function createRoom({ host, quiz, settings = {} }) {
  let roomCode;
  let roomRef;
  let existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    roomCode = generateRoomCode();
    roomRef = ref(rtdb, "rooms/" + roomCode);
    existing = await get(roomRef);
    if (!existing.exists()) break;

    const data = existing.val();
    const age = Date.now() - (data.createdAt || 0);
    if (age > MAX_ROOM_AGE_MS) {
      await remove(roomRef).catch(function () {});
      break;
    }
  }

  if (existing && existing.exists()) {
    throw new Error("Could not find a free room code. Please try again.");
  }

  const safeQuestions = quiz.questions.map(function (q, i) {
    return {
      index: i,
      topic: q.topic || "General",
      question: q.q || q.question || "",
      marks: q.marks || 1,
      markpoints: q.markpoints || [],
    };
  });

  const hostPlayer = {};
  hostPlayer[host.uid] = {
    uid: host.uid,
    name: host.name || "Player",
    school: host.school || "",
    ready: true,
    score: 0,
    correct: 0,
    totalMarks: 0,
    answers: {},
    joinedAt: Date.now(),
  };

  const roomData = {
    code: roomCode,
    status: "waiting",
    createdAt: Date.now(),
    hostUid: host.uid,
    settings: {
      subject: quiz.subject || "",
      exam: quiz.exam || "",
      title: quiz.title || "",
      questionsPerRound: safeQuestions.length,
      secondsPerQuestion: settings.secondsPerQuestion || 90,
    },
    players: hostPlayer,
    questions: safeQuestions,
    currentQuestionIndex: -1,
    startedAt: null,
    finishedAt: null,
  };

  await set(roomRef, roomData);

  const hostPlayerRef = ref(rtdb, "rooms/" + roomCode + "/players/" + host.uid);
  onDisconnect(hostPlayerRef).remove();

  return { roomCode: roomCode, room: roomData };
}

/* =========================================================
   JOIN ROOM
   ========================================================= */

export async function joinRoom(roomCode, player) {
  const normalized = String(roomCode).toUpperCase().trim();
  const roomRef = ref(rtdb, "rooms/" + normalized);
  const snap = await get(roomRef);

  if (!snap.exists()) throw new Error("Room not found. Check the code.");

  const room = snap.val();

  const age = Date.now() - (room.createdAt || 0);
  if (age > MAX_ROOM_AGE_MS) {
    await remove(roomRef).catch(function () {});
    throw new Error("This room has expired. Ask the host to create a new one.");
  }

  if (room.status === "finished") throw new Error("This game is already over.");
  if (room.status === "playing")
    throw new Error("This game has already started.");

  const existingPlayer = room.players && room.players[player.uid];
  if (existingPlayer) return room;

  const playerRef = ref(rtdb, "rooms/" + normalized + "/players/" + player.uid);
  await set(playerRef, {
    uid: player.uid,
    name: player.name || "Player",
    school: player.school || "",
    ready: false,
    score: 0,
    correct: 0,
    totalMarks: 0,
    answers: {},
    joinedAt: Date.now(),
  });

  onDisconnect(playerRef).remove();

  return room;
}

/* =========================================================
   READY
   ========================================================= */

export async function setPlayerReady(roomCode, uid, ready) {
  const playerRef = ref(
    rtdb,
    "rooms/" + roomCode + "/players/" + uid + "/ready",
  );
  await set(playerRef, !!ready);
}

/* =========================================================
   START GAME
   ========================================================= */

export async function startGame(roomCode) {
  const roomRef = ref(rtdb, "rooms/" + roomCode);
  await update(roomRef, {
    status: "playing",
    currentQuestionIndex: 0,
    startedAt: Date.now(),
  });
}

/* =========================================================
   SUBMIT TYPED ANSWER
   ========================================================= */

export async function submitTypedAnswer(
  roomCode,
  uid,
  questionIndex,
  text,
  scored,
  marks,
) {
  const answerRef = ref(
    rtdb,
    "rooms/" + roomCode + "/players/" + uid + "/answers/" + questionIndex,
  );

  await set(answerRef, {
    text: String(text || ""),
    scored: scored || 0,
    marks: marks || 0,
    answeredAt: Date.now(),
  });

  const playerRef = ref(rtdb, "rooms/" + roomCode + "/players/" + uid);
  const snap = await get(playerRef);
  const data = snap.val() || {};
  await update(playerRef, {
    score: (data.score || 0) + (scored || 0),
    correct: (data.correct || 0) + (scored || 0),
    totalMarks: (data.totalMarks || 0) + (marks || 0),
  });
}

/* =========================================================
   ADVANCE
   ========================================================= */

export async function advanceQuestion(roomCode, newIndex, totalQuestions) {
  const roomRef = ref(rtdb, "rooms/" + roomCode);
  if (newIndex >= totalQuestions) {
    await update(roomRef, {
      status: "finished",
      finishedAt: Date.now(),
      currentQuestionIndex: totalQuestions,
    });
  } else {
    await update(roomRef, { currentQuestionIndex: newIndex });
  }
}

/* =========================================================
   LEAVE / DELETE
   ========================================================= */

export async function leaveRoom(roomCode, uid) {
  const playerRef = ref(rtdb, "rooms/" + roomCode + "/players/" + uid);
  await remove(playerRef);
}

export async function deleteRoom(roomCode) {
  const roomRef = ref(rtdb, "rooms/" + roomCode);
  await remove(roomRef);
}

/* =========================================================
   SUBSCRIBE
   ========================================================= */

export function subscribeToRoom(roomCode, callback) {
  const roomRef = ref(rtdb, "rooms/" + roomCode);
  const handler = function (snap) {
    callback(snap.exists() ? snap.val() : null);
  };
  onValue(roomRef, handler);
  return function () {
    off(roomRef, "value", handler);
  };
}

/* =========================================================
   RANKINGS
   ========================================================= */

export function computeRoomRankings(room) {
  if (!room || !room.players) return [];
  return Object.values(room.players)
    .sort(function (a, b) {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.correct || 0) - (a.correct || 0);
    })
    .map(function (p, i) {
      return Object.assign({}, p, { rank: i + 1 });
    });
}

/* =========================================================
   SCORING (matches solo quiz logic)
   ========================================================= */

const STOP_WORDS = [
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "at",
  "for",
  "with",
  "by",
  "from",
  "as",
  "it",
  "its",
  "that",
  "this",
  "these",
  "those",
  "such",
  "also",
  "so",
  "then",
  "than",
  "if",
  "when",
];

export function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function markpointMatches(normalizedAnswer, markpointText) {
  if (!normalizedAnswer) return false;
  const normalizedMp = normalizeText(markpointText);
  if (!normalizedMp) return false;
  if (normalizedAnswer.indexOf(normalizedMp) !== -1) return true;

  const words = normalizedMp.split(" ").filter(function (w) {
    return w.length > 2 && STOP_WORDS.indexOf(w) === -1;
  });
  if (!words.length) return false;

  let hits = 0;
  for (const word of words) {
    if (normalizedAnswer.indexOf(word) !== -1) hits += 1;
  }
  const threshold = Math.max(1, Math.ceil(words.length * 0.6));
  return hits >= threshold;
}

export function scoreAnswer(question, text) {
  const normalized = normalizeText(text);
  const matched = [];
  let scored = 0;

  (question.markpoints || []).forEach(function (mp, j) {
    const mpText = typeof mp === "string" ? mp : mp.text;
    const mpMarks = typeof mp === "string" ? 1 : mp.marks || 1;
    if (markpointMatches(normalized, mpText)) {
      matched.push(j);
      scored += mpMarks;
    }
  });

  const max = question.marks || 1;
  scored = Math.min(scored, max);

  return { scored: scored, marks: max, matched: matched };
}
