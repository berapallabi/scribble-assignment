import { Router } from "express";
import {
  createRoomSchema,
  HttpError,
  joinRoomSchema,
  roomCodeParamsSchema,
  roomViewerQuerySchema
} from "./schemas.js";
import { createRoom, getRoom, joinRoom, saveRoom, toRoomSnapshot, appendCanvasLines, clearCanvasLines } from "../services/roomStore.js";
export function createRoomsRouter() {
  const router = Router();

  router.post("/", (request, response, next) => {
    try {
      const { playerName } = createRoomSchema.parse(request.body);
      const result = createRoom(playerName);

      response.status(201).json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room, result.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/join", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { playerName } = joinRoomSchema.parse(request.body);
      const result = joinRoom(code.toUpperCase(), playerName);

      if (!result) {
        throw new HttpError(404, "Unable to join room");
      }

      response.status(200).json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room, result.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:code", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = roomViewerQuerySchema.parse(request.query);
      const room = getRoom(code.toUpperCase());

      if (!room) {
        throw new HttpError(404, "Unable to load room");
      }

      room: toRoomSnapshot(room, (participantId || "") as string)
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/start", (request, response, next) => {
    try {
      const { code } = request.params;
      const { participantId } = request.body;
      const room = getRoom(code.toUpperCase());

      if (!room) {
        throw new HttpError(404, "Room not found");
      }

      if ((room as any).hostId !== participantId) {
        throw new HttpError(403, "Only the host can start the game.");
      }

      if (room.participants.length < 2) {
        throw new HttpError(400, "Need at least 2 players to start.");
      }

      room.status = "playing" as any;
      saveRoom(room);

      response.status(200).json({ room: toRoomSnapshot(room, participantId) });
    } catch (error) {
      next(error);
    }
  });
// POST /api/rooms/:code/canvas - Broadcast newly drawn brush strokes
  router.post("/:code/canvas", (request, response, next) => {
    try {
      const { code } = request.params;
      const { lines, participantId } = request.body;
      const room = getRoom(code.toUpperCase());

      if (!room) {
        throw new HttpError(404, "Room not found");
      }

      // Scenario 3 Guardrail: Only the assigned drawer can broadcast coordinates
      const participantsList = (room as any).participants || [];
      const currentDrawer = participantsList[0];
      
      if (currentDrawer && currentDrawer.id !== participantId) {
        throw new HttpError(403, "Only the designated drawer can draw on the canvas.");
      }

      const updatedRoom = appendCanvasLines(code, lines || []);
      response.status(200).json({ room: toRoomSnapshot(updatedRoom, participantId) });
    } catch (error) {
      next(error);
    }
  });

  // POST /api/rooms/:code/canvas/clear - Wipe the coordinate vector arrays
  router.post("/:code/canvas/clear", (request, response, next) => {
    try {
      const { code } = request.params;
      const { participantId } = request.body;
      const room = getRoom(code.toUpperCase());

      if (!room) {
        throw new HttpError(404, "Room not found");
      }

      // Scenario 3 Guardrail: Only the assigned drawer can wipe the canvas board
      const participantsList = (room as any).participants || [];
      const currentDrawer = participantsList[0];
      
      if (currentDrawer && currentDrawer.id !== participantId) {
        throw new HttpError(403, "Only the designated drawer can clear the canvas.");
      }

      const updatedRoom = clearCanvasLines(code);
      response.status(200).json({ room: toRoomSnapshot(updatedRoom, participantId) });
    } catch (error) {
      next(error);
    }
  });
  return router;
}