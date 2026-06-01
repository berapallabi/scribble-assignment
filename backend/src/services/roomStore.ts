import { randomUUID } from "node:crypto";
import type { Participant, Room, RoomSnapshot } from "../models/game.js";
import { STARTER_ROLES, STARTER_WORDS } from "../seed/starterData.js";

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

function displayName(name?: string) {
  return name || "Player";
}

function createParticipant(name?: string): Participant {
  return {
    id: randomUUID(),
    name: displayName(name),
    joinedAt: now()
  };
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

export function listWords() {
  return [...STARTER_WORDS];
}

export function createRoom(playerName?: string) {
  const participant = createParticipant(playerName);
  const room: any = {
      code: generateUniqueCode(),
      status: "lobby",
      hostId: participant.id, // Sets the creator as the host
      participants: [participant],
      createdAt: now(),
      updatedAt: now(),
      canvasLines: []
    };

  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function joinRoom(code: string, playerName?: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  const participant = createParticipant(playerName);
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
  return room ? cloneRoom(room) : null;
}

export function saveRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
  return getRoom(room.code);
}

export function toRoomSnapshot(room: any, viewerParticipantId: string): any {
  const participantsList = room.participants || [];
  
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    canvasLines: room.canvasLines || [],
    participants: participantsList.map((participant: any, index: number) => {
      let role = "lobbyist";
      if (room.status === "playing") {
        // Feature Group 2 Rule: Assign index 0 as drawer, others as guessers
        role = index === 0 ? "drawer" : "guesser";
      }
      
      return {
        id: participant.id,
        name: participant.name,
        joinedAt: participant.joinedAt,
        role: role
      };
    }),
    availableWords: typeof listWords === "function" ? listWords() : [],
    roles: room.status === "playing" ? ["drawer", "guesser"] : ["host", "player"]
  };
}
export function appendCanvasLines(code: string, lines: any[]): any {
  const room = getRoom(code);
  if (!room) return null;
  
  if (!(room as any).canvasLines) (room as any).canvasLines = [];
  (room as any).canvasLines.push(...lines);
  return room;
}

export function clearCanvasLines(code: string): any {
  const room = getRoom(code);
  if (!room) return null;
  
  (room as any).canvasLines = [];
  return room;
}