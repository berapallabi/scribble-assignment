import { randomUUID } from "node:crypto";
import type { Guess, Participant, Point, Room, RoomSnapshot, Stroke } from "../models/game.js";
import { STARTER_ROLES, STARTER_WORDS } from "../seed/starterData.js";

const ROUND_DURATION_MS = 60_000;

const rooms = new Map<string, Room>();

function now() {
  return new Date().toISOString();
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function generateUniqueCode() {
  let code = generateCode();

  while (rooms.has(code)) {
    code = generateCode();
  }

  return code;
}

function createParticipant(name: string, isHost: boolean): Participant {
  return {
    id: randomUUID(),
    name,
    isHost,
    joinedAt: now(),
    score: 0
  };
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

function httpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function advanceRoundIfNeeded(room: Room): void {
  if (room.status !== "in-game") {
    return;
  }

  const elapsed = Date.now() - new Date(room.roundStartedAt).getTime();
  const timerExpired = elapsed >= ROUND_DURATION_MS;

  if (!timerExpired) {
    const nonDrawers = room.participants.filter((p) => p.id !== room.drawerId);
    const correctGuessers = new Set(
      room.guesses.filter((g) => g.isCorrect).map((g) => g.participantId)
    );
    const allGuessed = nonDrawers.length > 0 && nonDrawers.every((p) => correctGuessers.has(p.id));

    if (!allGuessed) {
      return;
    }
  }

  const nextRound = room.roundNumber + 1;

  if (nextRound > room.participants.length) {
    room.status = "game-over";
    room.updatedAt = now();
    rooms.set(room.code, room);
    return;
  }

  const nextWord: string = STARTER_WORDS[(nextRound - 1) % STARTER_WORDS.length] ?? STARTER_WORDS[0] ?? "";

  room.roundNumber = nextRound;
  room.drawerId = room.participants[nextRound - 1]?.id;
  room.currentWord = nextWord;
  room.roundStartedAt = now();
  room.strokes = [];
  room.guesses = [];
  room.updatedAt = now();
  rooms.set(room.code, room);
}

export function listWords() {
  return [...STARTER_WORDS];
}

export function createRoom(playerName: string) {
  const participant = createParticipant(playerName, true);
  const room: Room = {
    code: generateUniqueCode(),
    status: "lobby",
    participants: [participant],
    createdAt: now(),
    updatedAt: now(),
    strokes: [],
    guesses: [],
    roundNumber: 0,
    roundStartedAt: ""
  };

  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function joinRoom(code: string, playerName: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  const participant = createParticipant(playerName, false);
  room.participants.push(participant);
  room.updatedAt = now();
  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function getRoom(code: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  advanceRoundIfNeeded(room);
  return cloneRoom(room);
}

export function saveRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
  return getRoom(room.code);
}

export function startGame(code: string, participantId: string) {
  const room = rooms.get(code);

  if (!room) {
    throw httpError(404, "Room not found");
  }

  const caller = room.participants.find((p) => p.id === participantId);

  if (!caller?.isHost) {
    throw httpError(403, "Only the host can start the game");
  }

  if (room.participants.length < 2) {
    throw httpError(422, "At least 2 players are required to start the game");
  }

  if (room.status === "in-game") {
    throw httpError(409, "The game has already started");
  }

  const firstWord: string | undefined = STARTER_WORDS[0];

  if (!firstWord) {
    throw httpError(500, "No words available to start the game");
  }

  for (const participant of room.participants) {
    participant.score = 0;
  }

  room.drawerId = caller.id;
  room.currentWord = firstWord;
  room.strokes = [];
  room.guesses = [];
  room.roundNumber = 1;
  room.roundStartedAt = now();
  room.status = "in-game";
  room.updatedAt = now();
  rooms.set(room.code, room);

  return cloneRoom(room);
}

export function addStroke(code: string, participantId: string, points: Point[]) {
  const room = rooms.get(code);

  if (!room) {
    throw httpError(404, "Room not found");
  }

  if (room.status !== "in-game") {
    throw httpError(409, "Game has not started");
  }

  if (participantId !== room.drawerId) {
    throw httpError(403, "Only the drawer can add strokes");
  }

  if (points.length < 2) {
    throw httpError(422, "A stroke must have at least 2 points");
  }

  const stroke: Stroke = {
    id: randomUUID(),
    points: points.map((p) => ({ x: clamp(p.x), y: clamp(p.y) })),
    createdAt: now()
  };

  room.strokes.push(stroke);
  room.updatedAt = now();
  rooms.set(room.code, room);

  return cloneRoom(room);
}

export function clearStrokes(code: string, participantId: string) {
  const room = rooms.get(code);

  if (!room) {
    throw httpError(404, "Room not found");
  }

  if (room.status !== "in-game") {
    throw httpError(409, "Game has not started");
  }

  if (participantId !== room.drawerId) {
    throw httpError(403, "Only the drawer can clear strokes");
  }

  room.strokes = [];
  room.updatedAt = now();
  rooms.set(room.code, room);

  return cloneRoom(room);
}

export function submitGuess(code: string, participantId: string, rawText: string) {
  const room = rooms.get(code);

  if (!room) {
    throw httpError(404, "Room not found");
  }

  if (room.status !== "in-game") {
    throw httpError(409, "Game has not started");
  }

  const participant = room.participants.find((p) => p.id === participantId);

  if (!participant) {
    throw httpError(404, "Participant not found");
  }

  if (participantId === room.drawerId) {
    throw httpError(403, "The drawer cannot submit guesses");
  }

  const text = rawText.trim();

  if (text === "") {
    throw httpError(422, "Guess cannot be empty");
  }

  const isCorrect = text.toLowerCase() === (room.currentWord ?? "").toLowerCase();

  if (isCorrect) {
    participant.score += 100;
  }

  const guess: Guess = {
    participantId,
    participantName: participant.name,
    text,
    isCorrect,
    submittedAt: now()
  };

  room.guesses.push(guess);
  room.updatedAt = now();
  rooms.set(room.code, room);

  advanceRoundIfNeeded(room);

  return cloneRoom(room);
}

export function toRoomSnapshot(room: Room, viewerParticipantId?: string): RoomSnapshot {
  const elapsed = room.roundStartedAt
    ? Date.now() - new Date(room.roundStartedAt).getTime()
    : 0;
  const secondsRemaining =
    room.status === "in-game"
      ? Math.max(0, 60 - Math.floor(elapsed / 1000))
      : 0;

  const snapshot: RoomSnapshot = {
    code: room.code,
    status: room.status,
    participants: room.participants.map((participant) => ({ ...participant })),
    availableWords: listWords(),
    roles: [...STARTER_ROLES],
    strokes: room.strokes.map((s) => ({ ...s, points: [...s.points] })),
    guesses: [...room.guesses],
    roundNumber: room.roundNumber,
    secondsRemaining,
    ...(room.status !== "lobby" && { drawerId: room.drawerId })
  };

  if (room.status === "in-game" && room.currentWord) {
    if (viewerParticipantId === room.drawerId) {
      snapshot.currentWord = room.currentWord;
    } else {
      snapshot.wordLength = room.currentWord.length;
    }
  }

  return snapshot;
}
