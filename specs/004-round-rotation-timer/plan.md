# Implementation Plan: Round Rotation & Timer

**Branch**: `004-round-rotation-timer` | **Date**: 2026-06-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-round-rotation-timer/spec.md`

---

## Summary

After a round ends (all non-drawer participants have guessed correctly, or 60 s elapsed),
`advanceRoundIfNeeded()` rotates the drawer by join-order index, picks the next word by
cycling `STARTER_WORDS`, resets the canvas, and preserves scores. The server records
`roundStartedAt` and computes `secondsRemaining` on every snapshot read. Clients display
the countdown via the existing 2 s polling loop. When all players have drawn,
`status` transitions to `"game-over"` and `GamePage` renders a final-scores overlay.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 backend, React 18 frontend)

**Primary Dependencies**: Express + Zod (backend); React + Vite (frontend) — no new packages

**Storage**: In-memory `Map<string, Room>` — no database

**Testing**: Vitest — existing test harness

**Target Platform**: Local dev server (backend :3005, frontend :5173)

**Performance Goals**: Round transitions within ~2 s of trigger (SC-001); timer accurate
to within 2 s (SC-002) — both satisfied by the existing polling interval

**Constraints**: HTTP polling only; no WebSockets; no background timers; no new npm packages

**Scale/Scope**: Single room, N rounds (N = player count), 2–N players

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Incremental Brownfield Enhancement | ✅ Pass | Extends existing `Room`, `startGame()`, `toRoomSnapshot()` |
| II. HTTP Polling Only | ✅ Pass | Timer computed on read; no push mechanism |
| III. In-Memory State Only | ✅ Pass | `roundNumber`, `roundStartedAt` on in-memory `Room` |
| IV. TypeScript-First | ✅ Pass | All new fields typed; no `any` |
| V. Spec-Driven Development | ✅ Pass | Following Spec Kit loop |

**⚠️ Constitution Deviation — Option B (documented inline)**

The project constitution (v1.0.0) lists the following as out of scope:
> *"Multiple rounds, drawer rotation, timers, countdowns, or bonuses"*

This feature explicitly introduces all three. The user selected Option B (implement with
documented deviation) rather than amending the constitution.

**Justification**: The game is unplayable with a single-round design in a real session.
Round rotation and a time limit are the two minimal mechanics that make Scribble a
functional multiplayer game rather than a demo. Implementing them at this stage is
necessary to deliver a complete, demonstrable product. The implementation remains fully
within the other four principles (polling-only, in-memory, TypeScript, brownfield).

No simpler alternative exists — without rotation, the game simply stops after one round.

---

## Project Structure

### Documentation (this feature)

```text
specs/004-round-rotation-timer/
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
    │   └── game.ts          ← extend RoomStatus (+game-over); extend Room (+roundNumber, +roundStartedAt); extend RoomSnapshot (+roundNumber, +secondsRemaining)
    └── services/
        └── roomStore.ts     ← startGame() init round fields; advanceRoundIfNeeded(); submitGuess() calls advance; toRoomSnapshot() includes roundNumber+secondsRemaining; getRoom() triggers advance on read

frontend/
└── src/
    ├── services/
    │   └── api.ts           ← extend RoomSnapshot status type; add roundNumber, secondsRemaining
    └── pages/
        └── GamePage.tsx     ← use room.roundNumber for "Round N" display; show countdown timer; render game-over overlay when status === "game-over"
```

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Round rotation (was out of scope) | Game cannot be demonstrated without multiple rounds | Single-round play is not a usable product |
| 60 s timer (was out of scope) | Without a timeout, a round can never end if guessers give up | No other completion condition exists without a timer |

---

## Implementation Steps

### Step 1: Extend types (blocking)

**`backend/src/models/game.ts`**:
- Change `RoomStatus` to `"lobby" | "in-game" | "game-over"`
- Add `roundNumber: number` and `roundStartedAt: string` to `Room`
- Add `roundNumber: number` and `secondsRemaining: number` to `RoomSnapshot`

**`frontend/src/services/api.ts`** (parallel):
- Change `status` type to `"lobby" | "in-game" | "game-over"`
- Add `roundNumber: number` and `secondsRemaining: number` to `RoomSnapshot`

### Step 2: Update `startGame()` and `createRoom()`

**`backend/src/services/roomStore.ts`**:
- In `createRoom()`: add `roundNumber: 0` and `roundStartedAt: ""` to the initial room
  (sentinel values for lobby state)
- In `startGame()`: after existing logic, set `room.roundNumber = 1` and
  `room.roundStartedAt = now()`

### Step 3: Add `advanceRoundIfNeeded()`

**`backend/src/services/roomStore.ts`**:
```
function advanceRoundIfNeeded(room: Room): void
```
- If `room.status !== "in-game"`: return immediately
- Check timer: `elapsed = Date.now() - new Date(room.roundStartedAt).getTime()`; if `elapsed < 60_000`: check all-guessed condition
- Check all-guessed: non-drawer participants, build set of IDs with correct guess in `room.guesses`; if not all done and timer not elapsed: return
- Advance: `const next = room.roundNumber + 1`
  - If `next > room.participants.length`: set `room.status = "game-over"`, return
  - Else: `room.roundNumber = next`, `room.drawerId = room.participants[next - 1].id`,
    `room.currentWord = STARTER_WORDS[(next - 1) % STARTER_WORDS.length]`,
    `room.roundStartedAt = now()`, `room.strokes = []`, `room.guesses = []`
- Persist: `rooms.set(room.code, room)` (mutates in-place — called with live room, not clone)

### Step 4: Trigger advance on read and on guess

- In `getRoom(code)`: get live room, call `advanceRoundIfNeeded(room)`, then return `cloneRoom(room)`
- In `submitGuess()`: after appending guess, get the live room (already have it), call `advanceRoundIfNeeded(room)`, then return `cloneRoom(room)`

### Step 5: Update `toRoomSnapshot()`

- Add `roundNumber: room.roundNumber` to snapshot
- Compute `secondsRemaining`:
  ```ts
  const elapsed = room.roundStartedAt
    ? Date.now() - new Date(room.roundStartedAt).getTime()
    : 0;
  const secondsRemaining = room.status === "in-game"
    ? Math.max(0, 60 - Math.floor(elapsed / 1000))
    : 0;
  ```
- Add `secondsRemaining` to snapshot

### Step 6: Update `GamePage`

**`frontend/src/pages/GamePage.tsx`**:
- Replace hardcoded `"Round 1"` kicker with `Round ${room.roundNumber}`
- Add countdown display: `{room.secondsRemaining}s` below the round kicker or in the header
- Add game-over guard: if `room.status === "game-over"`, render a game-over overlay showing
  final scores (sorted `room.participants` by score desc) with an Exit button; skip all
  canvas/guess rendering

---

## Data Flow

```
Timer expiry (lazy on poll):
  GET /rooms/:code?participantId=xxx
  → getRoom(code): advanceRoundIfNeeded → mutates room if elapsed ≥ 60s
  → toRoomSnapshot: secondsRemaining = 0, roundNumber = N+1 (or status = game-over)
  → client GamePage: shows new drawer, new word placeholder, reset canvas

All-guessed completion:
  POST /rooms/:code/guesses { participantId, text: "rocket" }
  → submitGuess(): record guess → advanceRoundIfNeeded → detects all correct → advance
  → toRoomSnapshot: roundNumber = N+1 (or game-over)
  → immediate response reflects new round; other clients see it on next poll

Countdown display:
  GET every ~2s → secondsRemaining decreases → GamePage re-renders timer
```

---

## Testing Strategy

| Scenario | How to test |
|---|---|
| All-guessed triggers advance | 3-player game: both guessers submit correct word → round 2 starts immediately |
| Timer triggers advance | Wait 60 s without guessing → round advances on next poll |
| Drawer rotation order | Round 1: host draws; Round 2: second player draws; etc. |
| Scores preserved | Score from round 1 still shows in round 2 |
| Canvas cleared on advance | Strokes from round 1 gone at start of round 2 |
| Game ends after N rounds | N-player game completes after N rounds → game-over overlay |
| Countdown display | Header shows decreasing seconds; resets to 60 on new round |

**Build gate**: `npm run build` in both `backend/` and `frontend/` must pass before PR.
