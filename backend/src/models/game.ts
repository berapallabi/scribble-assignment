export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "in-game" | "round-over";

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string;
  score: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  createdAt: string;
}

export interface Guess {
  participantId: string;
  participantName: string;
  text: string;
  isCorrect: boolean;
  submittedAt: string;
}

export interface Room {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
  drawerId?: string;
  currentWord?: string;
  strokes: Stroke[];
  guesses: Guess[];
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
  drawerId?: string;
  currentWord?: string;
  wordLength?: number;
  strokes: Stroke[];
  guesses: Guess[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
