# Implementation Plan: Result, Restart & Final Validation

**Branch**: `006-result-restart` | **Date**: 2026-06-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-result-restart/spec.md`

---

## Summary

When all non-drawer participants have submitted a correct guess, `submitGuess()`
transitions `room.status` to `"round-over"`. All clients see this on the next poll,
and `GamePage` switches to a result view showing the revealed word, all scores, and
the full guess history. The host can then trigger `POST /rooms/:code/restart` to reset
the room to `"lobby"` — all participants navigate back automatically via the existing
polling loop.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 backend, React 18 frontend)

**Primary Dependencies**: Express + Zod (backend); React + Vite (frontend) — no new packages

**Storage**: In-memory `Map<string, Room>` — no database

**Testing**: Vitest — existing test harness

**Target Platform**: Local dev server (backend :3005, frontend :5173)

**Performance Goals**: Result view visible within one polling cycle (~2 s) of last
correct guess; all clients redirected to lobby within one polling cycle of restart

**Constraints**: HTTP polling only; no WebSockets; no new npm packages; no timer

**Scale/Scope**: Single round, 2–N players, one game session

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Incremental Brownfield Enhancement | ✅ Pass | Extends `submitGuess()`, `toRoomSnapshot()`, `RoomStatus`; no rewrites |
| II. HTTP Polling Only | ✅ Pass | Round-over detected on guess submission; restart navigation via existing poll |
| III. In-Memory State Only | ✅ Pass | New `"round-over"` status on in-memory `Room` |
| IV. TypeScript-First | ✅ Pass | `RoomStatus` union extended; new schema and function fully typed |
| V. Spec-Driven Development | ✅ Pass | Following Spec Kit loop; traceable to FRs |

**No violations. No constitution deviations. No complexity justification required.**

---

## Project Structure

### Documentation (this feature)

```text
specs/004-result-restart/
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
    ├── models/
    │   └── game.ts          ← add "round-over" to RoomStatus
    ├── services/
    │   └── roomStore.ts     ← submitGuess() adds already-correct guard + round-over detection;
    │                           toRoomSnapshot() reveals word in round-over;
    │                           restartGame() function
    └── api/
        ├── rooms.ts         ← POST /rooms/:code/restart route
        └── schemas.ts       ← restartGameSchema

frontend/
└── src/
    ├── services/
    │   └── api.ts           ← add "round-over" to status type; restartGame() method
    └── pages/
        └── GamePage.tsx     ← useEffect nav trigger for status==="lobby";
                                round-over result view with word reveal, scores,
                                guess history, Play Again (host) / Exit buttons
```

---

## Implementation Steps

### Step 1: Extend `RoomStatus` type (blocking)

**`backend/src/models/game.ts`**:
- Change: `export type RoomStatus = "lobby" | "in-game" | "round-over";`

**`frontend/src/services/api.ts`** (parallel):
- Change: `status: "lobby" | "in-game" | "round-over";` in `RoomSnapshot`

### Step 2: Update `submitGuess()` in roomStore

**`backend/src/services/roomStore.ts`** — two additions after existing guards:

1. **Already-correct guard** (add after drawer-check, before text trim):
   ```typescript
   const alreadyCorrect = room.guesses.some(
     (g) => g.participantId === participantId && g.isCorrect
   );
   if (alreadyCorrect) {
     throw httpError(409, "You have already guessed the word correctly");
   }
   ```

2. **Round-over status guard** (add to existing status check):
   Change `if (room.status !== "in-game")` → check covers both non-in-game states,
   but use a clearer message for round-over:
   ```typescript
   if (room.status === "round-over") {
     throw httpError(409, "The round has ended");
   }
   if (room.status !== "in-game") {
     throw httpError(409, "Game has not started");
   }
   ```

3. **Round-over detection** (add after `room.guesses.push(guess)`):
   ```typescript
   const nonDrawers = room.participants.filter((p) => p.id !== room.drawerId);
   const correctGuessers = new Set(
     room.guesses.filter((g) => g.isCorrect).map((g) => g.participantId)
   );
   if (nonDrawers.length > 0 && nonDrawers.every((p) => correctGuessers.has(p.id))) {
     room.status = "round-over";
   }
   room.updatedAt = now();
   rooms.set(room.code, room);
   ```

### Step 3: Update `toRoomSnapshot()` — word reveal for round-over

**`backend/src/services/roomStore.ts`** — extend the word-inclusion block:
```typescript
// Change:
if (room.status === "in-game" && room.currentWord) {
// To:
if (room.currentWord) {
  if (room.status === "round-over") {
    snapshot.currentWord = room.currentWord;       // reveal to all
  } else if (room.status === "in-game") {
    if (viewerParticipantId === room.drawerId) {
      snapshot.currentWord = room.currentWord;
    } else {
      snapshot.wordLength = room.currentWord.length;
    }
  }
}
```

### Step 4: Add `restartGame()` to roomStore

**`backend/src/services/roomStore.ts`**:
```typescript
export function restartGame(code: string, participantId: string) {
  const room = rooms.get(code);
  if (!room) throw httpError(404, "Room not found");

  const caller = room.participants.find((p) => p.id === participantId);
  if (!caller?.isHost) throw httpError(403, "Only the host can restart the game");
  if (room.status !== "round-over") throw httpError(409, "The round is not over yet");

  room.status = "lobby";
  room.drawerId = undefined;
  room.currentWord = undefined;
  room.strokes = [];
  room.guesses = [];
  for (const p of room.participants) { p.score = 0; }
  room.updatedAt = now();
  rooms.set(room.code, room);
  return cloneRoom(room);
}
```

### Step 5: Add schema and route

**`backend/src/api/schemas.ts`**:
```typescript
export const restartGameSchema = z.object({
  participantId: z.string().min(1, "Participant ID is required")
});
```

**`backend/src/api/rooms.ts`**: Import `restartGame` + `restartGameSchema`, add:
```typescript
router.post("/:code/restart", (request, response, next) => {
  try {
    const { code } = roomCodeParamsSchema.parse(request.params);
    const { participantId } = restartGameSchema.parse(request.body);
    const room = restartGame(code.toUpperCase(), participantId);
    response.json({ room: toRoomSnapshot(room) });
  } catch (error) { next(error); }
});
```

### Step 6: Add frontend API method

**`frontend/src/services/api.ts`**:
```typescript
restartGame(code: string, participantId: string) {
  return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/restart`, {
    method: "POST",
    body: JSON.stringify({ participantId })
  });
}
```

### Step 7: Update `GamePage`

**`frontend/src/pages/GamePage.tsx`**:

1. Add `useEffect` for lobby navigation after restart:
   ```typescript
   useEffect(() => {
     if (room?.status === "lobby") {
       navigate("/lobby", { replace: true });
     }
   }, [navigate, room?.status]);
   ```

2. Add result-screen branch before the main in-game layout — when
   `room.status === "round-over"`:
   - Derive `isHost` from participants
   - Show word reveal prominently
   - Show scores (sorted desc)
   - Show full guess history (`ResultPanel`)
   - "Play Again" button — host only, calls `api.restartGame` then
     `store.setRoomSnapshot(response.room)`
   - "Exit" button for all players (navigate to `/lobby`)

---

## Data Flow

```
All guessers submit correct word:
  POST /rooms/:code/guesses (last correct guess)
  → submitGuess(): detects allDone → room.status = "round-over"
  → toRoomSnapshot(): currentWord included for all
  → response: { room: { status: "round-over", currentWord: "rocket", ... } }
  → caller's GamePage shows result screen immediately

Other clients (polling):
  GET /rooms/:code → status = "round-over", currentWord visible
  → GamePage renders result screen automatically

Host clicks "Play Again":
  POST /rooms/:code/restart
  → restartGame(): status = "lobby", state cleared
  → response: lobby snapshot
  → store.setRoomSnapshot → status = "lobby"
  → GamePage useEffect: navigate("/lobby")

Other clients (next poll):
  GET /rooms/:code → status = "lobby"
  → GamePage useEffect: navigate("/lobby")
  → All arrive at LobbyPage with names preserved
```

---

## Testing Strategy

| Scenario | How to test |
|---|---|
| Result screen appears on all-correct | Two guessers both submit correctly → all tabs switch to result view |
| Word revealed to all | Result screen shows "rocket" on drawer AND guesser tabs |
| Guess history complete | All guesses (correct + incorrect) visible in submission order |
| Correct scores shown | Player who guessed correctly shows 100; others show 0 |
| Duplicate correct guess rejected | Submit correct word twice → second attempt gets error |
| Late guess rejected after round-over | Submit after all-correct → "The round has ended" error |
| Non-host has no Play Again | Non-host result screen: no Play Again button |
| Host restart → all to lobby | Host clicks Play Again → all tabs navigate to lobby |
| Participants preserved after restart | Names, host badge intact in lobby post-restart |
| Scores reset to 0 after restart | All participants show 0 in lobby |

**Build gate**: `npm run build` in both `backend/` and `frontend/` must pass before PR.
