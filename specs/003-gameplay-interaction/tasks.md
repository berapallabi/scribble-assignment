# Tasks: Gameplay Interaction

**Input**: Design documents from `specs/003-gameplay-interaction/`

**Prerequisites**: plan.md, spec.md, data-model.md, research.md, contracts/game-api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to ([US1], [US2], [US3])
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm baseline stubs exist before implementation begins

- [ ] T001 Verify GuessForm.tsx, Scoreboard.tsx, and ResultPanel.tsx exist as stubs in frontend/src/components/ (read-only check; no change expected)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend shared type definitions and initialise game-start logic — MUST complete before any user story work begins

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] Add `Point`, `Stroke`, `Guess` interfaces; add `score: number` to `Participant`; add `strokes: Stroke[]` and `guesses: Guess[]` to `Room` and `RoomSnapshot` in backend/src/models/game.ts
- [ ] T003 [P] Add `Point`, `Stroke`, `Guess` interfaces; add `score: number` to `Participant`; add `strokes: Stroke[]` and `guesses: Guess[]` to `RoomSnapshot` in frontend/src/services/api.ts
- [ ] T004 Update `startGame()` in backend/src/services/roomStore.ts to initialise `participant.score = 0` for every participant, `room.strokes = []`, and `room.guesses = []` before setting `room.status = "in-game"` (after T002)
- [ ] T005 Update `toRoomSnapshot()` in backend/src/services/roomStore.ts to include `strokes: room.strokes.map(s => ({ ...s, points: [...s.points] }))` and `guesses: [...room.guesses]` in the returned snapshot (no viewer-filtering; both drawer and guessers receive the full arrays) (after T004)

**Checkpoint**: Types updated, game-start initialises clean state, snapshot carries strokes and guesses — user story implementation can now begin

---

## Phase 3: User Story 1 — Canvas Drawing (Priority: P1) 🎯 MVP

**Goal**: The drawer draws strokes on the canvas; strokes appear immediately on the drawer's screen and are synced to all guessers' canvases via the existing polling cycle. The drawer can clear the canvas.

**Independent Test**: Open two browser tabs (one drawer, one guesser) → drawer draws a line → line appears on drawer's canvas immediately; after the next poll (~2 s), same line appears on guesser's canvas. Drawer clicks Clear → both canvases blank within next poll.

### Implementation for User Story 1

- [ ] T006 [US1] Add `addStroke(code, participantId, points)` and `clearStrokes(code, participantId)` functions to backend/src/services/roomStore.ts: guard room exists (404), in-game (409), caller is drawer (403 if not), points ≥ 2 (422); clamp coordinates to [0,1]; append stroke with `randomUUID()` id; clear sets `room.strokes = []`
- [ ] T007 [P] [US1] Add `strokeSchema` (`{ participantId: string.min(1), points: array(point).min(2) }`) and `clearStrokesSchema` (`{ participantId: string.min(1) }`) to backend/src/api/schemas.ts (parallel with T006, different file)
- [ ] T008 [US1] Add `POST /rooms/:code/strokes` and `DELETE /rooms/:code/strokes` routes to backend/src/api/rooms.ts: parse schemas, call `addStroke`/`clearStrokes`, return `{ room: toRoomSnapshot(room, participantId) }` (after T006 + T007)
- [ ] T009 [P] [US1] Add `addStroke(code, participantId, points)` and `clearStrokes(code, participantId)` methods to the `api` object in frontend/src/services/api.ts (parallel with T006–T008, different repo layer; depends on T003 for types)
- [ ] T010 [P] [US1] Create frontend/src/components/DrawingCanvas.tsx: props `strokes: Stroke[]`, `onStroke?: (points: Point[]) => void`, `onClear?: () => void`; use `useRef<HTMLCanvasElement>` and `useEffect([strokes])` to clear and re-draw all strokes on each change; in drawer mode (onStroke provided) wire `mousedown`/`mousemove`/`mouseup` to accumulate points and call `onStroke(points)` on mouseup; scale normalised coordinates by `canvas.width`/`canvas.height`; show "Clear Canvas" button only when `onClear` is provided (parallel with T006–T008; depends on T003 for types)
- [ ] T011 [US1] Update frontend/src/pages/GamePage.tsx: import DrawingCanvas; replace canvas-placeholder div with `<DrawingCanvas strokes={room.strokes ?? []} onStroke={isDrawer ? handleStroke : undefined} onClear={isDrawer ? handleClear : undefined} />`; add `handleStroke(points)` that calls `api.addStroke` and updates snapshot via `roomStore.setRoomSnapshot`; add `handleClear()` that calls `api.clearStrokes` and updates snapshot (after T009 + T010)

**Checkpoint**: Drawer draws → strokes visible locally and on guesser canvases after next poll. Clear works on all screens. (Navigation from lobby to `/game` is handled by existing `LobbyPage.tsx` polling logic — no change needed.)

---

## Phase 4: User Story 2 — Guess Submission & Scoring (Priority: P2)

**Goal**: Guessers submit text guesses. The server trims, rejects empty input, and compares case-insensitively. Correct guesses award 100 points; incorrect award 0. The drawer has no guess form.

**Independent Test**: From a guesser tab submit (a) correct word, (b) correct word in different case, (c) wrong word, (d) whitespace-only string — verify: (a) and (b) score +100, (c) score unchanged, (d) rejected with error message.

### Implementation for User Story 2

- [ ] T012 [US2] Add `submitGuess(code, participantId, rawText)` to backend/src/services/roomStore.ts: guard room exists (404), in-game (409), participant exists (404), caller is not drawer (403); trim text, reject empty (422 "Guess cannot be empty"); compare `text.toLowerCase() === currentWord?.toLowerCase()`; if correct add 100 to participant.score; append `{ participantId, participantName, text, isCorrect, submittedAt }` to `room.guesses`; return `cloneRoom(room)` (after T004)
- [ ] T013 [P] [US2] Add `guessSchema` (`{ participantId: string.min(1), text: string() }`) to backend/src/api/schemas.ts (parallel with T012, different file)
- [ ] T014 [US2] Add `POST /rooms/:code/guesses` route to backend/src/api/rooms.ts: parse `guessSchema`, call `submitGuess(code, participantId, text)`, return `{ room: toRoomSnapshot(room, participantId) }` (after T012 + T013)
- [ ] T015 [P] [US2] Add `submitGuess(code, participantId, text)` method to the `api` object in frontend/src/services/api.ts: `POST /rooms/:code/guesses` returning `{ room: RoomSnapshot }` (parallel with T012–T014; depends on T003)
- [ ] T016 [P] [US2] Implement GuessForm.tsx in frontend/src/components/GuessForm.tsx: keep existing `disabled?: boolean` prop; add `onSubmit: (text: string) => void` and `error?: string | null`; controlled input with local state; call `onSubmit(value)` and clear input on form submit; show `error` below input when present; disable input and button when `disabled` is true (parallel with T012–T014)
- [ ] T017 [US2] Update frontend/src/pages/GamePage.tsx: add local state `guessError: string | null` and `isSubmitting: boolean`; add `handleGuess(text)` that sets `isSubmitting=true`, calls `api.submitGuess`, calls `roomStore.setRoomSnapshot(response.room)`, clears `guessError`, sets `guessError` on API error, finally sets `isSubmitting=false`; render `<GuessForm onSubmit={handleGuess} error={guessError} disabled={isSubmitting} />` in right sidebar only when `!isDrawer` (after T015 + T016)

**Checkpoint**: Guesser submits correct word → score increases by 100 on next render. Wrong word → score unchanged. Empty/whitespace → inline error. Drawer has no guess form visible.

---

## Phase 5: User Story 3 — Guess History & Score Sync (Priority: P3)

**Goal**: All participants see the full guess history (submitter name, text, correct/incorrect) and live scores synced via polling. Scores are visible sorted by rank.

**Independent Test**: From two guesser tabs, have guesser A submit a wrong guess → within next poll, guesser B's screen shows the guess in history. Check both tabs display all participants' scores.

### Implementation for User Story 3

- [ ] T018 [P] [US3] Implement Scoreboard.tsx in frontend/src/components/Scoreboard.tsx: accept `participants: Participant[]` prop; render a list sorted descending by `score` showing each participant's name and score
- [ ] T019 [P] [US3] Implement ResultPanel.tsx in frontend/src/components/ResultPanel.tsx: accept `guesses: Guess[]` prop; render ordered list of guesses showing submitter name, trimmed text, and a ✓ or ✗ indicator based on `isCorrect`
- [ ] T020 [US3] Update frontend/src/pages/GamePage.tsx: import Scoreboard and ResultPanel; add `<Scoreboard participants={room.participants} />` and `<ResultPanel guesses={room.guesses ?? []} />` to the left sidebar (after T018 + T019)

**Checkpoint**: All participants see guess history in submission order and live scores. After a correct guess, updated score appears within the next poll cycle on all screens.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build verification before PR

- [ ] T021 [P] Verify TypeScript build passes for backend with `npm run build` in backend/
- [ ] T022 [P] Verify TypeScript build passes for frontend with `npm run build` in frontend/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — read-only check
- **Foundational (Phase 2)**: T002 ‖ T003 (parallel) → T004 → T005 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on T002–T005; T006 ‖ T007 → T008; T009 ‖ T010 → T011
- **US2 (Phase 4)**: Depends on T004 (scores initialised); T012 ‖ T013 → T014; T015 ‖ T016 → T017
- **US3 (Phase 5)**: Depends on T012 (guesses stored) and T005 (snapshot carries guesses); T018 ‖ T019 → T020
- **Polish (Phase 6)**: T021 after all backend tasks; T022 after all frontend tasks; T021 ‖ T022

### User Story Dependencies

- **US1 (P1)**: Requires Foundational (T002–T005) — no dependency on US2 or US3
- **US2 (P2)**: Requires T004 (startGame scores init) — no dependency on US1 canvas
- **US3 (P3)**: Requires T012 (guesses populated) and T005 (snapshot includes guesses) — independent of US1 canvas

### Within Each User Story

- Backend service functions before schemas before routes
- Frontend api methods parallel with backend route work
- Frontend component parallel with backend work
- Page update (GamePage) last — depends on component + api method

### Parallel Opportunities

- T002 ‖ T003 — backend and frontend type changes in different files
- T006 ‖ T007 (US1) — roomStore.ts vs schemas.ts
- T009 ‖ T010 (US1) — api.ts vs DrawingCanvas.tsx, both frontend but different files
- T012 ‖ T013 (US2) — roomStore.ts vs schemas.ts
- T015 ‖ T016 (US2) — api.ts vs GuessForm.tsx
- T018 ‖ T019 (US3) — Scoreboard.tsx vs ResultPanel.tsx
- T021 ‖ T022 — backend vs frontend build checks

---

## Parallel Example: User Story 1

```bash
# Once T002+T003+T004+T005 are done:

# Backend pipeline (sequential within roomStore.ts → schemas.ts → rooms.ts):
Task T006: addStroke() + clearStrokes() in backend/src/services/roomStore.ts
Task T007: strokeSchema + clearStrokesSchema in backend/src/api/schemas.ts  [P with T006]
Task T008: Routes POST+DELETE /strokes in backend/src/api/rooms.ts

# Frontend (parallel with backend pipeline after T003 completes):
Task T009: addStroke() + clearStrokes() in frontend/src/services/api.ts     [P with T006–T008]
Task T010: DrawingCanvas.tsx component in frontend/src/components/           [P with T006–T008]

# Merge: depends on T009 + T010
Task T011: Update GamePage.tsx with DrawingCanvas integration
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Verify stubs (T001)
2. Complete Phase 2: Foundational type + service changes (T002–T005)
3. Complete Phase 3: Canvas drawing end-to-end (T006–T011)
4. **STOP and VALIDATE**: Drawer draws → guesser sees strokes via polling; clear works
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → Types and game-start ready
2. Add US1 → Test independently → Demo (drawer draws, canvas syncs)
3. Add US2 → Test independently → Demo (guessers guess, scoring works)
4. Add US3 → Test independently → Demo (history and scores visible)
5. Build verification → Ship

### Parallel Team Strategy

With two developers:
1. Both complete Phase 1 + Phase 2 together (fast — T001–T005)
2. Developer A: T006 → T007 → T008 (backend stroke pipeline)
3. Developer B: T009 + T010 (frontend api + DrawingCanvas, parallel)
4. Both: T011 (GamePage integration) → proceed to US2

---

## Notes

- [P] tasks = different files, no blocking dependencies — safe to run concurrently
- [Story] label maps each task to its user story for traceability against spec.md
- T004 (startGame) and T005 (toRoomSnapshot) are in roomStore.ts and touch different function bodies — they must be sequential (T004 first because T005 reads `room.strokes`/`room.guesses` set by T004)
- T006 and T007 are in the same logical change cycle but different files (roomStore.ts vs schemas.ts) — mark [P] for T007
- GuessForm.tsx, Scoreboard.tsx, ResultPanel.tsx are existing stubs — T016/T018/T019 implement them; the stub file must be read before editing
- DrawingCanvas.tsx is a new file — T010 creates it fresh
- GamePage.tsx is updated three times (T011, T017, T020) — always sequentially, each building on the previous
- Build gate per plan.md: both `npm run build` commands must pass before PR
