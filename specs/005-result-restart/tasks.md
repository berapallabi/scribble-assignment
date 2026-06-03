# Tasks: Result, Restart & Final Validation

**Input**: Design documents from `specs/005-result-restart/`

**Prerequisites**: plan.md, spec.md, data-model.md, research.md, contracts/game-api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: [US1], [US2], [US3]

---

## Phase 1: Setup

**Purpose**: Baseline check — no new project structure or dependencies required

- [x] T001 Verify `room.guesses` is NOT cleared in `advanceRoundIfNeeded` when transitioning to `"game-over"` in backend/src/services/roomStore.ts (read-only; confirms last round's guess history is available for the result screen)

---

## Phase 2: Foundational (Blocking Prerequisites)

**No blocking type changes for this feature.** All required data already exists in the current `Room` and `RoomSnapshot` from Features 001–004. US stories can begin immediately after Phase 1.

---

## Phase 3: User Story 1 — Round Result Display (Priority: P1) 🎯 MVP

**Goal**: When a round ends, all participants automatically see the game-over screen with the secret word revealed, accumulated scores, and the full ordered guess history.

**Independent Test**: Complete a game (all rounds) → all browser tabs show the game-over screen with the word (e.g. "rocket"), all player scores, and the ordered guess list with ✓/✗ indicators.

### Implementation for User Story 1

- [x] T002 [US1] Update `toRoomSnapshot()` in backend/src/services/roomStore.ts: extend the word-inclusion block so that when `room.status === "game-over"` and `room.currentWord` exists, `snapshot.currentWord = room.currentWord` is set for all viewers (remove the viewer filter for game-over; keep existing in-game drawer/guesser split unchanged)
- [x] T003 [US1] Extend the game-over overlay in frontend/src/pages/GamePage.tsx: inside the `if (room.status === "game-over")` block, add a word-reveal paragraph `<p>The word was: <strong>{room.currentWord}</strong></p>` above the scores list, and add `<ResultPanel guesses={room.guesses ?? []} />` below the scores card to show the full guess history (depends on T002 for currentWord in snapshot)

**Checkpoint**: All browser tabs show the revealed word and full guess history on the game-over screen without any manual refresh.

---

## Phase 4: User Story 2 — Host-Triggered Restart (Priority: P2)

**Goal**: The host can click "Play Again" from the game-over screen. All participants return to the lobby with names preserved and all game state cleared. Non-host players see no restart button.

**Independent Test**: Full game → game-over → host clicks "Play Again" → all tabs navigate to lobby showing all players at 0 pts. Non-host tab: no "Play Again" button visible.

### Implementation for User Story 2

- [x] T004 [P] [US2] Add `restartGame(code, participantId)` function to backend/src/services/roomStore.ts: guard room exists (404), caller is host (403 "Only the host can restart the game"), room is game-over (409 "Game is not over yet"); then set `room.status = "lobby"`, `room.drawerId = undefined`, `room.currentWord = undefined`, `room.roundNumber = 0`, `room.roundStartedAt = ""`, `room.strokes = []`, `room.guesses = []`, reset all `participant.score = 0`; call `rooms.set(room.code, room)`; return `cloneRoom(room)`
- [x] T005 [P] [US2] Add `export const restartGameSchema = z.object({ participantId: z.string().min(1, "Participant ID is required") })` to backend/src/api/schemas.ts (parallel with T004, different file)
- [x] T006 [US2] Add `POST /rooms/:code/restart` route to backend/src/api/rooms.ts: import `restartGame` and `restartGameSchema`; parse `restartGameSchema.parse(request.body)`; call `restartGame(code.toUpperCase(), participantId)`; return `{ room: toRoomSnapshot(room) }` (after T004 + T005)
- [x] T007 [P] [US2] Add `restartGame(code: string, participantId: string)` method to the `api` object in frontend/src/services/api.ts: `POST /rooms/${encodeURIComponent(code)}/restart` with body `{ participantId }`, returning `{ room: RoomSnapshot }` (parallel with T004–T006; different layer)
- [x] T008 [US2] Update frontend/src/pages/GamePage.tsx: (1) add a `useEffect` that navigates to `/lobby` with `{ replace: true }` when `room?.status === "lobby"`; (2) in the game-over overlay, derive `isHost = room.participants.find(p => p.id === participantId)?.isHost ?? false`; (3) add a "Play Again" button shown only when `isHost` that calls `api.restartGame(room.code, participantId)` then `store.setRoomSnapshot(response.room)` (after T006 + T007)

**Checkpoint**: Host clicks "Play Again" → all tabs navigate to lobby within the next poll with names preserved and scores at 0. Non-host tab: no "Play Again" button.

---

## Phase 5: User Story 3 / Polish — Final Validation & Build

**Goal**: End-to-end flow (lobby → rounds → game-over → word reveal → restart → lobby) verified with no regressions. Both builds pass.

- [x] T009 [P] Verify TypeScript build passes for backend with `npm run build` in backend/
- [x] T010 [P] Verify TypeScript build passes for frontend with `npm run build` in frontend/

---

## Dependencies & Execution Order

- **Phase 3 (US1)**: T002 → T003 (T003 depends on T002 for word in snapshot; different files so T003 frontend work can begin once T002 is code-complete)
- **Phase 4 (US2)**: T004 ‖ T005 (different files) → T006 (depends on both) ; T007 ‖ T004–T006 (different layer) → T008 (depends on T006 + T007)
- **Phase 5**: T009 ‖ T010 after all backend and frontend changes done

## Parallel Opportunities

- T004 ‖ T005 — `roomStore.ts` vs `schemas.ts`, both backend but different files
- T007 ‖ T004–T005 — frontend `api.ts` can be written while backend is in progress
- T009 ‖ T010 — build checks are independent

## Notes

- T001 is a read-only verification; if `room.guesses` is found to be cleared in game-over transition, that would need to be fixed before proceeding (it should NOT be cleared per Feature 004 implementation)
- T002 edits `toRoomSnapshot()` which is a shared function — review carefully to keep the `"in-game"` drawer/guesser word split intact
- T003 and T008 both edit `GamePage.tsx` — apply T003 first (word reveal), then T008 (restart button + nav trigger)
- The navigation trigger `useEffect` in T008 must depend on `[navigate, room?.status]` to mirror the existing `LobbyPage` pattern
- Build gate: both `npm run build` commands must pass before PR
