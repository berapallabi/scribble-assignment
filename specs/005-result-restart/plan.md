# Implementation Plan: Result, Restart & Final Validation

**Branch**: `005-result-restart` | **Date**: 2026-06-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-result-restart/spec.md`

---

## Summary

This feature has two backend changes and one frontend change. Backend: (1) expose
`currentWord` to all viewers when `status === "game-over"` in `toRoomSnapshot()`;
(2) add `restartGame()` function and `POST /rooms/:code/restart` route that resets
the room to lobby state while preserving participants. Frontend: extend the game-over
overlay to show the word reveal and full guess history, add a "Play Again" button for
the host, and add a navigation trigger so all clients automatically return to `/lobby`
when the room status becomes `"lobby"` after a restart.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 backend, React 18 frontend)

**Primary Dependencies**: Express + Zod (backend); React + Vite (frontend) — no new packages

**Storage**: In-memory `Map<string, Room>` — no database

**Testing**: Vitest — existing test harness

**Target Platform**: Local dev server (backend :3005, frontend :5173)

**Performance Goals**: Result view visible to all within one polling cycle (~2 s) of
round end (SC-001); restart navigates all clients to lobby within one polling cycle

**Constraints**: HTTP polling only; no WebSockets; no new npm packages

**Scale/Scope**: Single room, 2–N players, post-game result and restart flow

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Incremental Brownfield Enhancement | ✅ Pass | Extends `toRoomSnapshot()`, adds `restartGame()`, updates existing `GamePage` overlay |
| II. HTTP Polling Only | ✅ Pass | Post-restart navigation detected via existing polling loop |
| III. In-Memory State Only | ✅ Pass | `restartGame()` mutates in-memory `Room` |
| IV. TypeScript-First | ✅ Pass | New schema and function fully typed |
| V. Spec-Driven Development | ✅ Pass | Following Spec Kit loop |

No violations. No complexity justification required.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-result-restart/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── game-api.md      ← Phase 1 output
├── checklists/
│   └── requirements.md  ← spec quality checklist
└── tasks.md             ← Phase 2 output (not yet created)
```

### Source Code (files touched by this feature)

```text
backend/
└── src/
    ├── services/
    │   └── roomStore.ts   ← add restartGame(); update toRoomSnapshot() word reveal
    └── api/
        ├── rooms.ts       ← add POST /rooms/:code/restart route
        └── schemas.ts     ← add restartGameSchema

frontend/
└── src/
    ├── services/
    │   └── api.ts         ← add restartGame() method
    └── pages/
        └── GamePage.tsx   ← extend game-over overlay; add lobby navigation trigger
```

---

## Implementation Steps

### Step 1: Update `toRoomSnapshot()` — word reveal in game-over

**`backend/src/services/roomStore.ts`**:

Change the word-inclusion block from:
```typescript
if (room.status === "in-game" && room.currentWord) { ... }
```
to:
```typescript
if (room.currentWord) {
  if (room.status === "game-over") {
    snapshot.currentWord = room.currentWord;          // reveal to all
  } else if (room.status === "in-game") {
    if (viewerParticipantId === room.drawerId) {
      snapshot.currentWord = room.currentWord;
    } else {
      snapshot.wordLength = room.currentWord.length;
    }
  }
}
```

### Step 2: Add `restartGame()` to roomStore

**`backend/src/services/roomStore.ts`**:
```typescript
export function restartGame(code: string, participantId: string) {
  const room = rooms.get(code);
  if (!room) throw httpError(404, "Room not found");

  const caller = room.participants.find((p) => p.id === participantId);
  if (!caller?.isHost) throw httpError(403, "Only the host can restart the game");
  if (room.status !== "game-over") throw httpError(409, "Game is not over yet");

  room.status = "lobby";
  room.drawerId = undefined;
  room.currentWord = undefined;
  room.roundNumber = 0;
  room.roundStartedAt = "";
  room.strokes = [];
  room.guesses = [];
  for (const p of room.participants) { p.score = 0; }
  room.updatedAt = now();
  rooms.set(room.code, room);
  return cloneRoom(room);
}
```

### Step 3: Add schema and route

**`backend/src/api/schemas.ts`**:
```typescript
export const restartGameSchema = z.object({
  participantId: z.string().min(1, "Participant ID is required")
});
```

**`backend/src/api/rooms.ts`**:
- Import `restartGame` and `restartGameSchema`
- Add: `router.post("/:code/restart", ...)` → parse `restartGameSchema`, call
  `restartGame(code, participantId)`, return `{ room: toRoomSnapshot(room) }`
  (no viewer filtering needed — lobby snapshot is same for all)

### Step 4: Add frontend API method

**`frontend/src/services/api.ts`**:
```typescript
restartGame(code: string, participantId: string) {
  return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/restart`, {
    method: "POST",
    body: JSON.stringify({ participantId })
  });
}
```

### Step 5: Update `GamePage` — game-over overlay + navigation trigger

**`frontend/src/pages/GamePage.tsx`**:

1. **Navigation trigger** — add a new `useEffect` after the existing ones:
   ```typescript
   useEffect(() => {
     if (room?.status === "lobby") {
       navigate("/lobby", { replace: true });
     }
   }, [navigate, room?.status]);
   ```

2. **Game-over overlay** — extend the existing `if (room.status === "game-over")` block:
   - Keep the sorted final scores list (`<Scoreboard>` or inline)
   - Add word reveal: `<p>The word was: <strong>{room.currentWord}</strong></p>`
   - Add `<ResultPanel guesses={room.guesses ?? []} />` for full guess history
   - Add "Play Again" button **only for host** (`isHost` derived from participants):
     ```typescript
     const isHost = room.participants.find((p) => p.id === participantId)?.isHost ?? false;
     ```
     Button calls `api.restartGame(room.code, participantId)` then
     `store.setRoomSnapshot(response.room)` (the navigation trigger fires on next
     render because status is now `"lobby"`)

---

## Data Flow

```
Game ends (status = "game-over"):
  All clients poll → GET /rooms/:code
  → toRoomSnapshot: currentWord now included for all
  → GamePage shows game-over overlay with word + guesses + scores

Host clicks "Play Again":
  → api.restartGame(code, participantId)
  → POST /rooms/:code/restart
  → restartGame(): status = "lobby", state cleared
  → toRoomSnapshot(room) → response (lobby snapshot)
  → store.setRoomSnapshot(response.room)
  → GamePage useEffect detects status === "lobby" → navigate("/lobby")

Other clients (polling):
  GET /rooms/:code → status = "lobby"
  → GamePage useEffect detects lobby → navigate("/lobby")
  → All clients land on LobbyPage with preserved participants
```

---

## Testing Strategy

| Scenario | How to test |
|---|---|
| Word revealed to all on game-over | Both tabs show the word after game ends |
| Guess history shown on game-over | All guesses from last round visible on game-over overlay |
| Scores shown on game-over | Correct accumulated scores visible to all |
| Host restarts → all go to lobby | Host clicks Play Again → all tabs navigate to lobby |
| Participants preserved after restart | Player names and host badge intact on lobby screen |
| Scores reset to 0 after restart | Lobby shows 0 for all players |
| Non-host cannot restart | Non-host tab: no "Play Again" button visible |
| Stale guess rejected | Submit guess after round ends → error message |

**Build gate**: `npm run build` in both `backend/` and `frontend/` must pass before PR.
