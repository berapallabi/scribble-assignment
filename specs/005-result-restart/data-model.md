# Data Model: Result, Restart & Final Validation

**Feature**: `005-result-restart`
**Date**: 2026-06-03

---

## No new entities or fields

This feature introduces no new data model entities or fields. All required data
already exists in the current `Room` and `RoomSnapshot` structures from Features
001–004. The changes are:

1. A **snapshot filter change** (expose `currentWord` to all viewers in game-over)
2. A **new state transition** (restart: game-over → lobby)

---

## Snapshot filter change: `currentWord` in game-over

### Current behaviour (`toRoomSnapshot`)

| Status | Drawer sees | Guesser sees |
|---|---|---|
| `"lobby"` | — | — |
| `"in-game"` | `currentWord: "rocket"` | `wordLength: 6` |
| `"game-over"` | — (omitted) | — (omitted) |

### New behaviour after this feature

| Status | Drawer sees | Guesser sees |
|---|---|---|
| `"lobby"` | — | — |
| `"in-game"` | `currentWord: "rocket"` | `wordLength: 6` |
| `"game-over"` | `currentWord: "rocket"` | `currentWord: "rocket"` |

**Rule**: When `room.status === "game-over"`, set `snapshot.currentWord = room.currentWord`
regardless of `viewerParticipantId`.

---

## Restart state transition

```
game-over → lobby  (restartGame)
  status        = "lobby"
  drawerId      = undefined
  currentWord   = undefined
  roundNumber   = 0
  roundStartedAt = ""
  strokes       = []
  guesses       = []
  for each participant: score = 0
  (participants list preserved — names, IDs, isHost unchanged)
```

**Guard**: Caller must be host (`caller.isHost === true`); throws 403 otherwise.
**Guard**: Room must be in `"game-over"` state; throws 409 otherwise.

---

## Type Changes Summary

```
backend/src/models/game.ts
  No changes

frontend/src/services/api.ts
  No changes

backend/src/services/roomStore.ts
  NEW FUNCTION: restartGame(code, participantId) → Room
  MODIFIED:     toRoomSnapshot() — expose currentWord to all in game-over

backend/src/api/schemas.ts
  NEW: restartGameSchema = z.object({ participantId: z.string().min(1) })

backend/src/api/rooms.ts
  NEW ROUTE: POST /rooms/:code/restart

frontend/src/services/api.ts
  NEW METHOD: restartGame(code, participantId) → { room: RoomSnapshot }

frontend/src/pages/GamePage.tsx
  MODIFIED: game-over overlay — word reveal + guess history + Play Again (host)
  NEW:      useEffect navigation trigger for status === "lobby"
```
