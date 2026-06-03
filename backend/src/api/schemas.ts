import { z } from "zod";

export const createRoomSchema = z.object({
  playerName: z.string().trim().min(1, "Player name is required")
});

export const joinRoomSchema = z.object({
  playerName: z.string().trim().min(1, "Player name is required")
});

export const startGameSchema = z.object({
  participantId: z.string().min(1, "Participant ID is required")
});

export const roomCodeParamsSchema = z.object({
  code: z.string()
});

export const roomViewerQuerySchema = z.object({
  participantId: z.string().optional()
});

export const pointSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const strokeSchema = z.object({
  participantId: z.string().min(1, "Participant ID is required"),
  points: z.array(pointSchema).min(2, "A stroke must have at least 2 points")
});

export const clearStrokesSchema = z.object({
  participantId: z.string().min(1, "Participant ID is required")
});

export const guessSchema = z.object({
  participantId: z.string().min(1, "Participant ID is required"),
  text: z.string()
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
