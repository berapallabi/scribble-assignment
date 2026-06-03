# Tasks: Round Rotation & Timer

**Input**: Design documents from `specs/004-round-rotation-timer/`

**Prerequisites**: plan.md, spec.md, data-model.md, research.md, contracts/game-api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: [US1], [US2], [US3]

---

## Phase 1: Setup

**Purpose**: Baseline check — no new project structure required

- [ ] T001 Verify `STARTER_WORDS` has ≥ 1 entry in backend/src/seed/starterData.ts (read-only)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Complete before any user story work

- [ ] T002 [P] Extend `RoomStatus` to `"lobby" | "in-game" | "game-over"`; add `roundNumber: number` and `roundStartedAt: string` to `Room`; add `roundNumber: number` and `secondsRemaining: number` to `RoomSnapshot` in backend/src/models/game.ts
- [ ] T003 [P] Extend `RoomSnapshot.status` type to include `"game-over"`; add `roundNumber: number` and `secondsRemaining: number` to `RoomSnapshot` in frontend/src/services/api.ts
- [ ] T004 Update `createRoom()` in backend/src/services/roomStore.ts to initialise `roundNumber: 0` and `roundStartedAt: ""` on the new room object (sentinel for lobby state)
- [ ] T005 Update `startGame()` in backend/src/services/roomStore.ts to set `room.roundNumber = 1` and `room.roundStartedAt = now()` after existing guard checks

**Checkpoint**: Types updated; room creation and game-start include round fields — user stories can begin

---

## Phase 3: User Story 1 — Round Completion & Transition (Priority: P1) 🎯 MVP

**Goal**: Rounds end when all guessers are correct or 60 s elapse; game advances to next drawer with new word and cleared canvas; scores are preserved.

**Independent Test**: 3-player game — both guessers submit the correct word → game advances to round 2 with the second player as drawer, new word, blank canvas, and preserved scores. Separately: wait 60 s without guessing → same advance occurs on next poll.

### Implementation for User Story 1

- [ ] T006 [US1] Add `advanceRoundIfNeeded(room: Room): void` to backend/src/services/roomStore.ts: (1) return if `room.status !== "in-game"`; (2) check timer: `Date.now() - new Date(room.roundStartedAt).getTime() >= 60_000`; (3) check all-guessed: every non-drawer participant has ≥1 correct entry in `room.guesses`; (4) if neither condition met, return; (5) if `room.roundNumber >= room.participants.length` set `room.status = "game-over"` else increment `roundNumber`, set `drawerId = participants[roundNumber-1].id`, `currentWord = STARTER_WORDS[(roundNumber-1) % STARTER_WORDS.length]`, `roundStartedAt = now()`, `strokes = []`, `guesses = []`; (6) call `rooms.set(room.code, room)` to persist
- [ ] T007 [US1] Update `getRoom(code)` in backend/src/services/roomStore.ts to call `advanceRoundIfNeeded` on the live room before cloning: get room from map, call `advanceRoundIfNeeded(room)`, return `cloneRoom(room)`
- [ ] T008 [US1] Update `submitGuess()` in backend/src/services/roomStore.ts to call `advanceRoundIfNeeded(room)` after appending the guess and before returning `cloneRoom(room)`
- [ ] T009 [US1] Update `toRoomSnapshot()` in backend/src/services/roomStore.ts to include `roundNumber: room.roundNumber` and `secondsRemaining` (computed as `room.status === "in-game" ? Math.max(0, 60 - Math.floor((Date.now() - new Date(room.roundStartedAt).getTime()) / 1000)) : 0`) in the returned snapshot

**Checkpoint**: Round transitions fire on both all-guessed and timeout triggers. Scores, canvas state, and drawer rotation are correct. Verify with two browser tabs.

---

## Phase 4: User Story 2 — Round Timer Display (Priority: P2)

**Goal**: All participants see a live countdown from 60 to 0. Timer resets to 60 at each new round. When it hits 0, the round transitions on the next poll.

**Independent Test**: Start a game — both tabs show a countdown. Observe it counting down on each poll. At 0, round advances and timer resets.

### Implementation for User Story 2

- [ ] T010 [US2] Update frontend/src/pages/GamePage.tsx: replace the hardcoded `"Round 1"` section kicker with `Round ${room.roundNumber}`; add a countdown display (e.g. `<span>{room.secondsRemaining}s</span>`) in the game header next to the round kicker

**Checkpoint**: Header shows "Round 2", "Round 3" etc. as rounds advance. Countdown ticks down visibly via the existing 2 s polling loop and resets to 60 at each new round.

---

## Phase 5: User Story 3 — Game End & Final Scores (Priority: P3)

**Goal**: After every player has drawn once, the game transitions to "game-over". All participants see final accumulated scores. No new round starts.

**Independent Test**: 3-player game — play all 3 rounds → game-over overlay appears on all tabs showing final scores. No timer runs. No canvas or guess form shown.

### Implementation for User Story 3

- [ ] T011 [US3] Update frontend/src/pages/GamePage.tsx: before the main game layout, add a game-over guard — if `room.status === "game-over"`, render a full-panel overlay showing "Game Over", a sorted list of participant names and scores (descending), and an Exit button (`navigate("/lobby")`); return early so the canvas/guess layout is not rendered

**Checkpoint**: After all N rounds, all tabs show the game-over screen with final scores. Exit navigates back to lobby.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T012 [P] Verify TypeScript build passes for backend with `npm run build` in backend/
- [ ] T013 [P] Verify TypeScript build passes for frontend with `npm run build` in frontend/

---

## Dependencies & Execution Order

- **Phase 2**: T002 ‖ T003 (parallel) → T004 → T005 (sequential, all in roomStore.ts or different files)
- **Phase 3**: T006 → T007, T008 (T007 and T008 both depend on T006; they can be done sequentially in same file) → T009
- **Phase 4**: T010 depends on T003 (frontend types) and T009 (secondsRemaining in snapshot)
- **Phase 5**: T011 depends on T002/T003 (game-over status type) and T006 (game-over logic)
- **Phase 6**: T012 after all backend tasks; T013 after all frontend tasks; T012 ‖ T013

## Notes

- `advanceRoundIfNeeded` mutates the live room (not a clone) — it must receive the room object directly from `rooms.get()`, never a cloned copy
- `getRoom()` currently returns `cloneRoom(room)` — T007 inserts the advance check before the clone
- `submitGuess()` already has the live room in scope — T008 just adds the advance call before the final return
- GamePage is edited twice (T010 and T011) — apply sequentially; T010 first (timer display), T011 second (game-over overlay)
- Build gate: both `npm run build` commands must pass before PR
