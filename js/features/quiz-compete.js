// js/features/quiz-compete.js
// Compete quiz (multiplayer) for WeGEM Learning.
// Uses Firebase Realtime Database for live state sync.

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
  onValue,
  off,
  remove,
  push,
  serverTimestamp,
  onDisconnect,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { firebaseConfig } from "../config/firebase-config.js";
import { buildQuiz, answerQuestion, getWeakTopics } from "./quiz-engine.js";
import { getQuestionsForSubject } from "../core/db.js";
import { getCachedQuestions } from "../core/cache.js";
import { log, shuffle } from "../core/utils.js";

/* =========================================================
   INITIALIZE REALTIME DB
   ========================================================= */

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);

/* =========================================================
   ROOM CODES
   ========================================================= */

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL_MS = 60 * 60 * 1000; // 1 hour

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
   ROOM LIFECYCLE
   ========================================================= */

export async function createRoom({ host, questions, settings = {} }) {
  const roomCode = generateRoomCode();
  const roomRef = ref(rtdb, `rooms/${roomCode}`);

  // Check collision (rare but possible)
  const existing = await get(roomRef);
  if (existing.exists()) {
    return createRoom({ host, questions, settings });
  }

  const roomData = {
    code: roomCode,
    status: "waiting", // waiting | starting | playing | finished
    createdAt: serverTimestamp(),
    hostUid: host.uid,
    settings: {
      questionsPerRound: settings.questionsPerRound || 10,
      secondsPerQuestion: settings.secondsPerQuestion || 20,
      showExplanation: settings.showExplanation !== false,
    },
    players: {
      [host.uid]: {
        uid: host.uid,
        name: host.name || "Player",
        school: host.school || "",
        avatar: host.avatar || "",
        ready: true,
        score: 0,
        correct: 0,
        answers: {},
        joinedAt: serverTimestamp(),
      },
    },
    questions: questions.map((q, i) => ({
      index: i,
      topic: q.topic || "General",
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explain: q.explain || "",
    })),
    currentQuestionIndex: -1,
    startedAt: null,
    finishedAt: null,
  };

  await set(roomRef, roomData);

  // Auto-remove room on disconnect (host)
  const hostConnRef = ref(rtdb, `rooms/${roomCode}/players/${host.uid}`);
  onDisconnect(hostConnRef).remove();

  return { roomCode, room: roomData };
}

export async function joinRoom(roomCode, player) {
  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  const snap = await get(roomRef);

  if (!snap.exists()) throw new Error("Room not found. Check the code.");
  const room = snap.val();

  if (room.status === "finished") throw new Error("This game is already over.");
  if (room.status === "playing")
    throw new Error("This game has already started.");

  const playerRef = ref(rtdb, `rooms/${roomCode}/players/${player.uid}`);
  await set(playerRef, {
    uid: player.uid,
    name: player.name || "Player",
    school: player.school || "",
    avatar: player.avatar || "",
    ready: false,
    score: 0,
    correct: 0,
    answers: {},
    joinedAt: serverTimestamp(),
  });

  onDisconnect(playerRef).remove();

  return room;
}

export async function setPlayerReady(roomCode, uid, ready) {
  const playerRef = ref(rtdb, `rooms/${roomCode}/players/${uid}/ready`);
  await set(playerRef, ready);
}

export async function startGame(roomCode) {
  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  await update(roomRef, {
    status: "playing",
    currentQuestionIndex: 0,
    startedAt: serverTimestamp(),
  });
}

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
    correct,
    answeredAt: serverTimestamp(),
  });

  if (correct) {
    const scoreRef = ref(rtdb, `rooms/${roomCode}/players/${uid}`);
    const snap = await get(scoreRef);
    const data = snap.val() || {};
    await update(scoreRef, {
      score: (data.score || 0) + 1,
      correct: (data.correct || 0) + 1,
    });
  }
}

export async function advanceQuestion(roomCode, newIndex, totalQuestions) {
  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  if (newIndex >= totalQuestions) {
    await update(roomRef, {
      status: "finished",
      finishedAt: serverTimestamp(),
      currentQuestionIndex: totalQuestions,
    });
  } else {
    await update(roomRef, { currentQuestionIndex: newIndex });
  }
}

export async function leaveRoom(roomCode, uid) {
  const playerRef = ref(rtdb, `rooms/${roomCode}/players/${uid}`);
  await remove(playerRef);
}

export async function deleteRoom(roomCode) {
  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  await remove(roomRef);
}

/* =========================================================
   LIVE SUBSCRIPTIONS
   ========================================================= */

export function subscribeToRoom(roomCode, callback) {
  const roomRef = ref(rtdb, `rooms/${roomCode}`);
  const handler = (snap) => {
    callback(snap.exists() ? snap.val() : null);
  };
  onValue(roomRef, handler);
  return () => off(roomRef, "value", handler);
}

/* =========================================================
   COMPUTE LEADERBOARD FOR ROOM
   ========================================================= */

export function computeRoomRankings(room) {
  if (!room?.players) return [];
  return Object.values(room.players)
    .sort(
      (a, b) =>
        (b.score || 0) - (a.score || 0) || (b.correct || 0) - (a.correct || 0),
    )
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

/* =========================================================
   FETCH QUESTIONS FOR COMPETE
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
    if (questions.length) {
      const { cacheQuestions } = await import("../core/cache.js");
      await cacheQuestions(questions);
    }
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
