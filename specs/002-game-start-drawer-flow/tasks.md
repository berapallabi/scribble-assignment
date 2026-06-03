# Tasks: Game Start & Drawer Flow

**Input**: Design documents from `specs/002-game-start-drawer-flow/`

**Prerequisites**: plan.md, spec.md, data-model.md, research.md, contracts/game-api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to ([US1], [US2], [US3])
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm baseline is ready before making changes

- [ ] T001 Verify STARTER_WORDS array in backend/src/seed/starterData.ts contains ["rocket","pizza","castle","guitar","sunflower"] (read-only check; no change expected)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend shared type definitions — MUST be complete before any user story work begins

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] Add `drawerId?: string` and `currentWord?: string` to `Room` interface; add `drawerId?: string`, `currentWord?: string`, `wordLength?: number` to `RoomSnapshot` interface in backend/src/models/game.ts
- [ ] T003 [P] Add `drawerId?: string`, `currentWord?: string`, `wordLength?: number` to `RoomSnapshot` interface in frontend/src/services/api.ts

**Checkpoint**: Type definitions updated — backend and frontend can now reference new fields safely

---

## Phase 3: User Story 1 — Transition to Game Screen (Priority: P1) 🎯 MVP

**Goal**: When the host starts the game, all participants navigate to the game screen and see a meaningful in-game layout with participant names and role labels.

**Independent Test**: Open two browser tabs in a lobby → host clicks "Start Game" → both tabs navigate to `/game` and display an in-game layout showing at least the drawer's name and guessers' names with role labels.

### Implementation for User Story 1

- [ ] T004 [US1] Update `startGame()` in backend/src/services/roomStore.ts: guard against empty `STARTER_WORDS` (throw 500 `"No words available to start the game"`), then set `room.drawerId = host.id` and `room.currentWord = STARTER_WORDS[0]` before setting `room.status = "in-game"`
- [ ] T005 [US1] Update `toRoomSnapshot()` in backend/src/services/roomStore.ts to always include `drawerId: room.drawerId` in the returned snapshot (applies to all viewers when status is `"in-game"`)
- [ ] T006 [US1] Update `POST /rooms/:code/start` handler in backend/src/api/rooms.ts to pass `participantId` to `toRoomSnapshot(room, participantId)` so the host (drawer) receives the correct snapshot immediately in the start response
- [ ] T007 [US1] Replace the GamePage placeholder with an in-game layout in frontend/src/pages/GamePage.tsx: obtain `isDrawer = room.drawerId === participantId` and `participantId` from `useRoomState()`; render a participant list showing each player's name with a "Drawer" or "Guesser" role label based on `room.drawerId`; remove `<GuessForm>`, `<Scoreboard>`, and `<ResultPanel>` (out of scope for this feature); retain the canvas-placeholder div and the Exit Game button

**Checkpoint**: User Story 1 fully functional — two browser tabs can start a game and navigate to the game screen with drawer/guesser names visible. (Navigation from lobby → `/game` is handled by the existing `LobbyPage.tsx` polling logic from Scenario 1; no change to the navigation trigger is needed.)

---

## Phase 4: User Story 2 — Drawer Assignment (Priority: P2)

**Goal**: All participants see the host clearly identified as the drawer with a prominent "Drawing" section. The drawer assignment is deterministic (host is always drawer for round 1).

**Independent Test**: Start a game with 3 players → host's name appears as "Drawer" on all participants' screens with a dedicated visible indicator; the two non-host players appear as guessers.

### Implementation for User Story 2

- [ ] T008 [US2] Add a dedicated "Current Drawer" section to GamePage.tsx in frontend/src/pages/GamePage.tsx: derive `drawerName = room.participants.find(p => p.id === room.drawerId)?.name` and render it prominently (e.g., `"Drawing: [drawerName]"`) above the participant list

**Checkpoint**: User Story 2 fully functional — all screens show a clear, prominent drawer indicator with the host's name; the guesser list is distinct

---

## Phase 5: User Story 3 — Secret Word Visibility (Priority: P3)

**Goal**: The drawer sees the secret word on their screen; guessers see only underscore placeholders matching the word's letter count. Word filtering is enforced server-side.

**Independent Test**: Start a game → drawer's screen shows `"rocket"`, guesser's screen shows `"_ _ _ _ _ _"`; checking the guesser's network response confirms `currentWord` is absent.

### Implementation for User Story 3

- [ ] T009 [US3] Extend the `toRoomSnapshot()` function in backend/src/services/roomStore.ts — preserving the `drawerId` field added in T005 — to add viewer-aware word filtering: when `room.status === "in-game"` and `viewerParticipantId === room.drawerId`, also include `currentWord: room.currentWord`; otherwise include `wordLength: room.currentWord?.length`; omit both fields while `status === "lobby"`
- [ ] T010 [US3] Add secret word display to GamePage.tsx in frontend/src/pages/GamePage.tsx: if `isDrawer` render `room.currentWord` prominently; otherwise render underscore placeholders — one `"_"` per letter space-separated using `room.wordLength` (e.g., `Array.from({length: room.wordLength}, () => "_").join(" ")`)

**Checkpoint**: User Story 3 fully functional — drawer sees the word, guessers see only underscores, `currentWord` never appears in guesser network responses. Also verify the late-joiner edge case: a participant who navigates to the game screen after `status = "in-game"` receives a guesser snapshot with `wordLength` (not `currentWord`).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build verification and final validation

- [ ] T011 [P] Verify TypeScript build passes for backend with `npm run build` in backend/
- [ ] T012 [P] Verify TypeScript build passes for frontend with `npm run build` in frontend/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — read-only baseline check
- **Foundational (Phase 2)**: Depends on Phase 1 — T002 and T003 can run in parallel (different files) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on T002 and T003 completing
  - T004 → T005 → T006 (sequential, all in backend)
  - T007 depends on T003 (frontend types) + T006 (backend endpoint updated)
- **User Story 2 (Phase 4)**: T008 depends on T007 (builds on GamePage layout)
- **User Story 3 (Phase 5)**: T009 depends on T004 + T005; T010 depends on T009 + T008
- **Polish (Phase 6)**: T011 after T009; T012 after T010

### User Story Dependencies

- **US1 (P1)**: Requires Foundational (T002, T003) — no dependency on US2 or US3
- **US2 (P2)**: Requires US1 (T007) — no dependency on US3
- **US3 (P3)**: Requires US1 backend (T004, T005) and US2 UI (T008)

### Within Each User Story

- Models (type changes) before services before endpoints before UI
- Story complete before moving to next priority

### Parallel Opportunities

- T002 and T003 (foundational type changes) run in parallel — different files
- T004, T005, T006 must run sequentially — same file (roomStore.ts → rooms.ts pipeline)
- T007 (frontend) can start in parallel with T004–T006 once T003 is done (different repo layer)
- T011 and T012 (build checks) run in parallel

---

## Parallel Example: User Story 1

```bash
# Once T002+T003 are done, backend and frontend can progress in parallel:

# Backend pipeline (sequential within roomStore.ts + rooms.ts):
Task T004: Update startGame() in backend/src/services/roomStore.ts
Task T005: Update toRoomSnapshot() in backend/src/services/roomStore.ts
Task T006: Update POST /rooms/:code/start in backend/src/api/rooms.ts

# Frontend (parallel with backend pipeline after T003 completes):
Task T007: Update GamePage.tsx in frontend/src/pages/GamePage.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify seed data)
2. Complete Phase 2: Foundational type changes (T002 + T003 in parallel)
3. Complete Phase 3: User Story 1 (T004 → T005 → T006; T007 in parallel after T003)
4. **STOP and VALIDATE**: Two browser tabs → start game → both navigate to game screen with names + role labels
5. Demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Types ready
2. Add User Story 1 → Test independently → Demo (MVP: game screen with roles)
3. Add User Story 2 → Test independently → Demo (drawer section prominent)
4. Add User Story 3 → Test independently → Demo (word visible to drawer only)
5. Run build verification → Ship

### Parallel Team Strategy

With two developers:
1. Both complete Setup + Foundational together (fast — T001, T002, T003)
2. Developer A: T004 → T005 → T006 (backend pipeline)
3. Developer B: T007 (frontend layout, parallel after T003)
4. Merge and verify → proceed to US2, US3

---

## Notes

- [P] tasks = different files, no blocking dependencies — safe to run concurrently
- [Story] label maps each task to its user story for traceability against spec.md
- T005 (include `drawerId`) and T009 (word filtering) are intentionally split — US1/US2 can be tested without word visibility; US3 extends the snapshot logic
- Word filtering is server-side by design (FR-006, research Decision 2) — never send `currentWord` to guessers
- `toRoomSnapshot` already accepts `viewerParticipantId` (currently ignored with `void`) — T005/T009 activate this existing hook
- Build gate per plan.md: both `npm run build` commands must pass before PR
