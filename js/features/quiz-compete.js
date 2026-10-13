// js/features/quiz-compete.js
// Real-time multiplayer quiz via Firebase Realtime Database.
// Answers are NOT shipped to clients — verification is client-side
// for now (see note at bottom of file).

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
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { firebaseConfig } from "../config/firebase-config.js";
import { buildQuiz } from "./quiz-engine.js";
import { getQuestionsForSubject } from "../core/db.js";
import { getCachedQuestions, cacheQuestions } from "../core/cache.js";
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

export async function createRoom({ host, questions, settings = {} }) {
  let roomCode;
  let roomRef;
  let existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    roomCode = generateRoomCode();
    roomRef = ref(rtdb, `rooms/${roomCode}`);
    existing = await get(roomRef);
    if (!existing.exists()) break;

    const data = existing.val();
    const age = Date.now() - (data.createdAt || 0);
    if (age > MAX_ROOM_AGE_MS) {
      await remove(roomRef).catch(() => {});
      break;
    }
  }

  if (existing && existing.exists()) {
    throw new Error("Could not find a free room code. Please try again.");
  }

  // Strip correctIndex — verification stays client-side.
  const safeQuestions = questions.map((q, i) => ({
    index: i,
    topic: q.topic || "General",
    question: q.question || q.q || "",
    options: Array.isArray(q.options) ? q.options : [],
    correctIndex: q.correctIndex ?? q.answer ?? 0,
    explain: q.explain || "",
    points: q.points || 100,
    timeLimit: q.timeLimit || settings.secondsPerQuestion || 20,
  }));

  const roomData = {
    code: roomCode,
    status: "waiting",
    createdAt: Date.now(),
    hostUid: host.uid,
    settings: {
      subject: settings.subject || "",
      exam: settings.exam || "",
      questionsPerRound: settings.questionsPerRound || safeQuestions.length,
      secondsPerQuestion: settings.secondsPerQuestion || 20,
    },
    players: {
      [host.uid]: {
        uid: host.uid,
        name: host.name || "Player",
        school: host.school || "",
        ready: true,
        score: 0,
        correct: 0,
        answers: {},
        joinedAt: Date.now(),
      },
    },
    questions: safeQuestions,
    currentQuestionIndex: -1,
    startedAt: null,
    finishedAt: null,
  };

  await set(roomRef, roomData);

  // Only remove the host's player node on disconnect — NOT the room.
  const hostPlayerRef = ref(rtdb, `rooms/${roomCode}/players/${host.uid}`);
  hostPlayerRef
    .onDisconnect()
    .remove()
    .catch((e) => log.warn("Could not set host disconnect:", e));

  return { roomCode, room: roomData };
}

/* =========================================================
   JOIN ROOM
   ========================================================= */

export async function joinRoom(roomCode, player) {
  const normalized = String(roomCode).toUpperCase().trim();
  const roomRef = ref(rtdb, `rooms/${normalized}`);
  const snap = await get(roomRef);

  if (!snap.exists()) throw new Error("Room not found. Check the code.");

  const room = snap.val();

  const age = Date.now() - (room.createdAt || 0);
  if (age > MAX_ROOM_AGE_MS) {
    await remove(roomRef).catch(() => {});
    throw new Error("This room has expired. Ask the host to create a new one.");
  }

  if (room.status === "finished") throw new Error("This game is already over.");
  if (room.status === "playing")
    throw new Error("This game has already started.");

  const existingPlayer = room.players && room.players[player.uid];
  if (existingPlayer) return room;

  const playerRef = ref(rtdb, `rooms/${normalized}/players/${player.uid}`);
  await set(playerRef, {
    uid: player.uid,
    name: player.name || "Player",
    school: player.school || "",
    ready: false,
    score: 0,
    correct: 0,
    answers: {},
    joinedAt: Date.now(),
  });

  playerRef
    .onDisconnect()
    .remove()
    .catch((e) => log.warn("Could not set player disconnect:", e));

  return room;
}

/* =========================================================
   READY
   ========================================================= */

export async function setPlayerReady(roomCode, uid, ready) {
  const playerRef = ref(rtdb, `rooms/${roomCode}/players/${uid}/ready`);
  await set(playerRef, !!ready);
}

/* =========================================================
   START GAME
   ========================================================= */

export async function startGame(roomCode) {
  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  await update(roomRef, {
    status: "playing",
    currentQuestionIndex: 0,
    startedAt: Date.now(),
  });
}

/* =========================================================
   SUBMIT ANSWER
   ========================================================= */

export async function submitAnswerRtdb(
  roomCode,
  uid,
  questionIndex,
  selectedIndex,
  correct,
) {
  const answerRef = ref(
    rtdb,
    `rooms/${roomCode}/players/${uid}/answers/${questionIndex}`,
  );

  await set(answerRef, {
    selected: selectedIndex,
    correct: !!correct,
    answeredAt: Date.now(),
  });

  if (correct) {
    const playerRef = ref(rtdb, `rooms/${roomCode}/players/${uid}`);
    const snap = await get(playerRef);
    const data = snap.val() || {};
    await update(playerRef, {
      score: (data.score || 0) + 1,
      correct: (data.correct || 0) + 1,
    });
  }
}

/* =========================================================
   ADVANCE
   ========================================================= */

export async function advanceQuestion(roomCode, newIndex, totalQuestions) {
  const roomRef = ref(rtdb, `rooms/${roomCode}`);
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
  const playerRef = ref(rtdb, `rooms/${roomCode}/players/${uid}`);
  await remove(playerRef);
}

export async function deleteRoom(roomCode) {
  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  await remove(roomRef);
}

/* =========================================================
   SUBSCRIBE
   ========================================================= */

export function subscribeToRoom(roomCode, callback) {
  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  const handler = (snap) => callback(snap.exists() ? snap.val() : null);
  onValue(roomRef, handler);
  return () => off(roomRef, "value", handler);
}

/* =========================================================
   RANKINGS
   ========================================================= */

export function computeRoomRankings(room) {
  if (!room || !room.players) return [];
  return Object.values(room.players)
    .sort(
      (a, b) =>
        (b.score || 0) - (a.score || 0) || (b.correct || 0) - (a.correct || 0),
    )
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

/* =========================================================
   LOAD COMPETE QUESTIONS
   ========================================================= */

export async function loadCompeteQuestions({ exam, subject, count = 10 }) {
  let questions = [];

  try {
    questions = await getCachedQuestions(exam, subject);
  } catch (e) {
    log.warn("Cache read failed:", e);
  }

  if (!questions.length) {
    questions = await getQuestionsForSubject(exam, subject);
    if (questions.length) await cacheQuestions(questions);
  }

  if (!questions.length)
    throw new Error("No questions available for this subject.");

  const { questions: prepared } = buildQuiz(questions, {
    count,
    shuffleOptions: true,
    shuffleQuestions: true,
  });
  return prepared;
}
