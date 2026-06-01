export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "in-game";

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string;
}

export interface Room {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
