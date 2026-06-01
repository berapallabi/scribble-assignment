---
description: "Task list for Room Setup & Lobby (Scenario 1)"
---

# Tasks: Room Setup & Lobby

**Input**: Design documents from `specs/001-room-setup-lobby/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/rooms-api.md ✅

**Tests**: Not explicitly requested in spec — no test tasks generated.

**Organization**: Tasks are grouped by user story. Each phase is independently completable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps to user story from spec.md (US1–US4)
- All file paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: No project initialisation needed — starter is already running. This phase is intentionally empty. Begin at Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Widen shared types that every user story depends on. Both backend and frontend type files are independent and can be updated in parallel.

**⚠️ CRITICAL**: Complete this phase before any user story work begins.

- [x] T001 [P] Add `isHost: boolean` to `Participant` interface and widen `RoomStatus` from `"lobby"` to `"lobby" | "in-game"` in `backend/src/models/game.ts`
- [x] T002 [P] Mirror the same type changes — add `isHost: boolean` to `Participant` and widen `RoomSnapshot.status` to `"lobby" | "in-game"` — in `frontend/src/services/api.ts`

**Checkpoint**: Both type files updated. TypeScript compiler should report no new errors from type widening alone.

---

## Phase 3: User Story 1 — Create a Room and Become Host (Priority: P1) 🎯 MVP

**Goal**: Creating a room produces a unique code, the creator is the host, and the lobby shows a "Host" badge next to their name. Empty/whitespace-only player names are rejected with a clear error.

**Independent Test**: One browser tab — create a room with a valid name → land on Lobby → see "Host" badge on own name. Attempt to create with a blank name → see inline error, no navigation.

### Implementation for User Story 1

- [x] T003 [P] [US1] In `createRoom()` in `backend/src/services/roomStore.ts`: trim `playerName`, throw if empty after trim, set `isHost: true` on the created participant; preserve the existing unique 4-char alphanumeric code generation logic (FR-001, FR-002)
- [x] T004 [P] [US1] In `backend/src/api/schemas.ts`: change `createRoomSchema.playerName` from `z.string().optional()` to `z.string().trim().min(1, "Player name is required")` (FR-004, FR-012)
- [x] T005 [US1] In `backend/src/api/rooms.ts`: ensure `POST /rooms` returns a 400 response with the Zod validation message when `playerName` fails the updated schema (depends on T003, T004)
- [x] T006 [US1] In `frontend/src/pages/LobbyPage.tsx`: derive `currentParticipant` from `participantId` + `room.participants`; render a "Host" badge inline next to the participant whose `isHost === true` (depends on T002)

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 — Join a Room via Code (Priority: P2)

**Goal**: A player can join an existing room with a valid code and valid name. Empty names, empty/whitespace codes, and unknown codes each show a distinct clear error. Code matching is case-insensitive.

**Independent Test**: Second browser tab — join using the code from Phase 3. Verify the joiner appears in the first tab's lobby (manual refresh still acceptable at this stage). Try empty name, empty code, and a made-up code — each should show the correct error without navigating away.

### Implementation for User Story 2

- [x] T007 [P] [US2] In `joinRoom()` in `backend/src/services/roomStore.ts`: trim `playerName`, throw if empty after trim, set `isHost: false` on the joining participant (FR-003, FR-004, FR-012)
- [x] T008 [P] [US2] In `backend/src/api/schemas.ts`: change `joinRoomSchema.playerName` from `z.string().optional()` to `z.string().trim().min(1, "Player name is required")` (FR-004, FR-012)
- [x] T009 [P] [US2] In `frontend/src/pages/JoinRoomPage.tsx`: add client-side validation before calling `roomStore.joinRoom()` — trim the room code input, reject if empty after trim, and display a clear inline error message without making any network request (FR-005, SC-004)
- [x] T010 [US2] In `backend/src/api/rooms.ts`: apply `.toUpperCase()` to `req.params.code` in both the `POST /rooms/:code/join` handler and the `GET /rooms/:code` handler before all store lookups (FR-013; depends on T007, T008)

**Checkpoint**: User Stories 1 AND 2 both independently functional.

---

## Phase 5: User Story 3 — Lobby Auto-Refresh via Polling (Priority: P3)

**Goal**: The lobby participant list updates automatically at ~2 s intervals without any button press. Transient poll failures are retried silently; an error is shown only after 3 consecutive failures.

**Independent Test**: Three browser tabs in the same room — joining in a third tab causes the name to appear on the other two tabs within ~2 s, without pressing any button.

### Implementation for User Story 3

- [x] T011 [US3] In `frontend/src/pages/LobbyPage.tsx`: replace the manual refresh button with a `useEffect` that calls `roomStore.fetchRoom()` via `setInterval` at 2 000 ms; return `clearInterval` from the effect for cleanup (FR-008, SC-003)
- [x] T012 [US3] In `frontend/src/pages/LobbyPage.tsx`: add a `useRef<number>` to count consecutive poll failures; increment on each error, reset to 0 on success; show the error UI only when the count reaches 3 (depends on T011)
- [x] T013 [US3] In `frontend/src/pages/LobbyPage.tsx`: add a separate `useEffect` watching `room?.status`; when `status === "in-game"` call `navigate("/game")` (depends on T011)

**Checkpoint**: All three user stories independently functional and auto-polling visible across multiple tabs.

---

## Phase 6: User Story 4 — Host Starts the Game (Priority: P4)

**Goal**: The host sees a "Start Game" button in the lobby, disabled with a message when fewer than 2 players are present. Clicking it when ≥ 2 players are present transitions all players (including non-hosts via polling) to the game screen.

**Independent Test**: Two browser tabs — host tab shows an active "Start Game" button; non-host tab does not. Host clicks the button → both tabs navigate to `/game`.

### Implementation for User Story 4

- [x] T014 [P] [US4] In `backend/src/api/schemas.ts`: add `startGameSchema = z.object({ participantId: z.string().min(1) })` (FR-011)
- [x] T015 [P] [US4] In `backend/src/services/roomStore.ts`: add `startGame(code: string, participantId: string): Room` — fetch room (404 if missing), verify caller `isHost` (403 if not), verify `participants.length >= 2` (422 if not), verify `status === "lobby"` (409 if already in-game), set `status = "in-game"`, call `saveRoom`, return updated room (FR-009, FR-010, FR-011)
- [x] T016 [US4] In `backend/src/api/rooms.ts`: add `POST /rooms/:code/start` handler — validate body with `startGameSchema`, call `roomStore.startGame(code.toUpperCase(), participantId)`, map thrown errors to 403/404/409/422, return `{ room: toRoomSnapshot(updated) }` with 200 (depends on T014, T015)
- [x] T017 [P] [US4] In `frontend/src/services/api.ts`: add `startGame(code: string, participantId: string): Promise<{ room: RoomSnapshot }>` using `POST /rooms/:code/start` (FR-011)
- [x] T018 [US4] In `frontend/src/state/roomStore.ts`: add `startGame()` action — reads `room.code` and `participantId` from state, calls `api.startGame()`, updates via `setRoomSnapshot`, wrapped with `withLoading` (depends on T017)
- [x] T019 [US4] In `frontend/src/pages/LobbyPage.tsx`: render "Start Game" button only when `isCurrentPlayerHost === true`; disable with message "Need at least 2 players" when `room.participants.length < 2`; on click call `roomStore.startGame()`; navigation handled by phase-change effect from T013 (FR-009, FR-010, FR-011; depends on T013, T018)

**Checkpoint**: All four user stories independently functional. Two browser tabs can join a room, host starts game, both navigate to `/game`.

---

## Phase 7: Polish & Build Validation

**Purpose**: Verify the full implementation compiles cleanly and the end-to-end scenario works across two browser tabs.

- [x] T020 Verify backend build passes: `cd backend && npm run build`
- [x] T021 Verify frontend build passes: `cd frontend && npm run build`
- [x] T022 [P] Manual end-to-end validation per testing strategy in `specs/001-room-setup-lobby/plan.md` — two browser tabs, run through all four user story acceptance scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately. BLOCKS all user story phases.
- **US1 (Phase 3)**: Depends on Phase 2 completion.
- **US2 (Phase 4)**: Depends on Phase 2 completion. Independent of US1 (different files).
- **US3 (Phase 5)**: Depends on Phase 2 completion. Builds on US1/US2 for meaningful visual result but core polling logic is independent.
- **US4 (Phase 6)**: Depends on Phase 2 and US3 (T013 phase-change navigation must exist before T019).
- **Polish (Phase 7)**: Depends on all user story phases being complete.

### Within Each User Story

- Models/types before services before routes (backend).
- API client before store action before page component (frontend).
- T003 and T004 can start in parallel (different files).
- T007, T008, and T009 can start in parallel (different files — backend store, backend schema, frontend page).
- T014 and T015 can start in parallel (different files).
- T017 can start in parallel with T014/T015 (frontend vs. backend).

### Parallel Opportunities

```bash
# Phase 2 — run in parallel:
T001  backend/src/models/game.ts
T002  frontend/src/services/api.ts

# Phase 3 — backend tasks in parallel:
T003  backend/src/services/roomStore.ts (createRoom)
T004  backend/src/api/schemas.ts (createRoomSchema)

# Phase 4 — all three can run in parallel:
T007  backend/src/services/roomStore.ts (joinRoom)
T008  backend/src/api/schemas.ts (joinRoomSchema)
T009  frontend/src/pages/JoinRoomPage.tsx (client-side code validation)

# Phase 6 — backend schema + service + frontend client in parallel:
T014  backend/src/api/schemas.ts (startGameSchema)
T015  backend/src/services/roomStore.ts (startGame)
T017  frontend/src/services/api.ts (startGame)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational type changes (T001, T002)
2. Complete Phase 3: US1 — create room + host badge (T003–T006)
3. **STOP and VALIDATE**: Create a room in one tab → lobby shows "Host" badge → empty name is rejected
4. Proceed to US2 only after US1 validates

### Incremental Delivery

1. Phase 2 → Phase 3 (US1) → validate → commit
2. Phase 4 (US2) → validate → commit
3. Phase 5 (US3) → validate → commit
4. Phase 6 (US4) → validate → commit
5. Phase 7: build + end-to-end → PR

---

## Notes

- `[P]` tasks touch different files and have no incomplete task dependencies — safe to work in parallel
- `[Story]` label maps each task to its user story for traceability back to spec.md
- Both backend schema (T004/T008) and store service (T003/T007) validate player name — this is intentional defence-in-depth, not redundancy
- Commit after each phase checkpoint — keep commits granular and traceable
- No new npm packages are required anywhere in this feature
- Build validation (T020, T021) MUST pass before raising a pull request
