# Tasks: Result, Restart & Final Validation

**Input**: Design documents from `specs/004-result-restart/`

**Prerequisites**: plan.md, spec.md, data-model.md, research.md, contracts/game-api.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: [US1], [US2], [US3]

---

## Phase 1: Setup

**Purpose**: Baseline check — no new project structure required

- [x] T001 Verify `room.guesses` is an array on every `Room` and that `submitGuess` does NOT already block duplicate correct guesses in backend/src/services/roomStore.ts (read-only; confirms the guard is missing and needs to be added)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend `RoomStatus` type in both layers — MUST complete before any user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Change `RoomStatus` from `"lobby" | "in-game"` to `"lobby" | "in-game" | "round-over"` in backend/src/models/game.ts
- [x] T003 [P] Change `status` type in `RoomSnapshot` from `"lobby" | "in-game"` to `"lobby" | "in-game" | "round-over"` in frontend/src/services/api.ts

**Checkpoint**: Both layers typed — user story implementation can begin

---

## Phase 3: User Story 1 — Round Result Display (Priority: P1) 🎯 MVP

**Goal**: When all non-drawer participants have submitted a correct guess, the round automatically transitions to `"round-over"` and all participants see a result view showing the secret word, scores, and full guess history.

**Independent Test**: Two-guesser game — both submit the correct word → all browser tabs switch to a result view showing "rocket", both players' scores, and the ordered guess history with ✓/✗ indicators.

### Implementation for User Story 1

- [x] T004 [US1] Update `submitGuess()` in backend/src/services/roomStore.ts with three additions (in this order, after existing guards): (1) already-correct guard — `if (room.guesses.some(g => g.participantId === participantId && g.isCorrect)) throw httpError(409, "You have already guessed the word correctly")`; (2) round-over guard — add `if (room.status === "round-over") throw httpError(409, "The round has ended")` before the existing `"in-game"` check; (3) round-over detection — after `room.guesses.push(guess)`, compute `nonDrawers` and `correctGuessers`, if all non-drawers have a correct guess set `room.status = "round-over"` then persist with `rooms.set`
- [x] T005 [US1] Update `toRoomSnapshot()` in backend/src/services/roomStore.ts to reveal the word to all viewers in round-over: change the word-inclusion condition from `if (room.status === "in-game" && room.currentWord)` to handle three cases — `"round-over"` sets `snapshot.currentWord` for all; `"in-game"` keeps the existing drawer/guesser split; lobby omits the word (after T004)
- [x] T006 [US1] Add a `round-over` result view to frontend/src/pages/GamePage.tsx: before the main in-game layout, add `if (room.status === "round-over")` branch that shows the revealed word prominently, a sorted final-scores list, and `<ResultPanel guesses={room.guesses ?? []} />`; include an "Exit" button navigating to `/lobby` for all players; the view must render from `room.currentWord`, `room.participants`, and `room.guesses` already in the snapshot (depends on T003 for status type and T005 for word in snapshot)

**Checkpoint**: All tabs automatically show the result view (word + scores + history) when both guessers answer correctly. No manual refresh needed — detected via existing 2 s polling.

---

## Phase 4: User Story 2 — Host-Triggered Restart (Priority: P2)

**Goal**: The host can restart from the result screen. All participants return to the lobby with names preserved and all round state cleared. Non-host players see no restart button.

**Independent Test**: Result screen visible → host clicks "Play Again" → all tabs navigate to lobby showing all players at 0 pts, no canvas, no word.

### Implementation for User Story 2

- [x] T007 [P] [US2] Add `restartGame(code, participantId)` function to backend/src/services/roomStore.ts: guard room exists (404), caller is host (403 `"Only the host can restart the game"`), room is `"round-over"` (409 `"The round is not over yet"`); then set `room.status = "lobby"`, `room.drawerId = undefined`, `room.currentWord = undefined`, `room.strokes = []`, `room.guesses = []`, reset `participant.score = 0` for every participant; persist with `rooms.set`; return `cloneRoom(room)` (parallel with T008 — different logical section of the file, no conflict)
- [x] T008 [P] [US2] Add `export const restartGameSchema = z.object({ participantId: z.string().min(1, "Participant ID is required") })` to backend/src/api/schemas.ts (parallel with T007, different file)
- [x] T009 [US2] Add `POST /rooms/:code/restart` route to backend/src/api/rooms.ts: import `restartGame` from roomStore and `restartGameSchema` from schemas; parse `restartGameSchema.parse(request.body)`; call `restartGame(code.toUpperCase(), participantId)`; return `{ room: toRoomSnapshot(room) }` (after T007 + T008)
- [x] T010 [P] [US2] Add `restartGame(code: string, participantId: string)` method to the `api` object in frontend/src/services/api.ts: `POST /rooms/${encodeURIComponent(code)}/restart` with body `{ participantId }`, returning `{ room: RoomSnapshot }` (parallel with T007–T009, different layer; depends on T003 for types)
- [x] T011 [US2] Update frontend/src/pages/GamePage.tsx: (1) add `useEffect` that navigates to `/lobby` with `{ replace: true }` when `room?.status === "lobby"` — depends on `[navigate, room?.status]`; (2) in the `"round-over"` result view from T006, derive `isHost = room.participants.find(p => p.id === participantId)?.isHost ?? false`; (3) add "Play Again" button visible only when `isHost` that calls `api.restartGame(room.code, participantId)` and then `store.setRoomSnapshot(response.room)` (after T009 + T010)

**Checkpoint**: Host clicks "Play Again" → all tabs navigate to lobby within next poll with names intact and scores at 0. Non-host tab: no "Play Again" button visible.

---

## Phase 5: User Story 3 / Polish — Final Validation & Build

**Goal**: End-to-end session (lobby → round → result → restart → lobby → second round start) works correctly. Both builds pass.

- [x] T012 [P] Verify TypeScript build passes for backend with `npm run build` in backend/
- [x] T013 [P] Verify TypeScript build passes for frontend with `npm run build` in frontend/

---

## Dependencies & Execution Order

- **Phase 2**: T002 ‖ T003 (different files)
- **Phase 3 (US1)**: T004 → T005 (both in roomStore.ts, sequential); T006 depends on T003 + T005
- **Phase 4 (US2)**: T007 ‖ T008 (roomStore.ts vs schemas.ts); T010 ‖ T007–T008 (different layer); T009 depends on T007+T008; T011 depends on T009+T010
- **Phase 5**: T012 ‖ T013 after all changes complete

## Parallel Opportunities

- T002 ‖ T003 — backend vs frontend type files
- T007 ‖ T008 — roomStore.ts new function vs schemas.ts new schema
- T010 ‖ T007–T008 — frontend api.ts independent of backend route work
- T012 ‖ T013 — independent build checks

## Notes

- T004 and T005 are both in `backend/src/services/roomStore.ts` — apply sequentially; T004 first (adds round-over trigger), T005 second (uses round-over status to reveal word)
- T006 and T011 are both in `frontend/src/pages/GamePage.tsx` — apply sequentially; T006 first (result view structure), T011 second (adds Play Again + nav trigger)
- The `"round-over"` guard in T004 must come BEFORE the existing `"in-game"` check so late guesses get a clear error message rather than the generic "Game has not started"
- The already-correct guard in T004 must come BEFORE processing the guess text — fail fast
- Build gate: both `npm run build` commands must pass before PR
