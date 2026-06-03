# Research: Gameplay Interaction

**Feature**: `003-gameplay-interaction`
**Date**: 2026-06-03

---

## Decision 1: Canvas stroke representation

**Decision**: Each completed drawing gesture (mousedown → mousemove* → mouseup) is stored as one `Stroke` — an ordered array of `{x, y}` normalised coordinates (values 0–1, relative to canvas dimensions). On mouseup the frontend POSTs the completed stroke to the server.

**Rationale**: A polyline-per-gesture is the minimal model that allows smooth curves without complex compression. Normalised coordinates decouple strokes from canvas pixel dimensions, so the guesser's canvas can be any size and still render correctly. One POST per gesture keeps the request rate low (typically 1–3 requests per second while drawing actively), which is safe under HTTP polling architecture.

**Alternatives considered**:
- Per-pixel events (one POST per mousemove) — rejected; creates hundreds of requests per second, incompatible with HTTP polling principle.
- SVG path strings — rejected; more complex to parse and accumulate; no advantage for in-memory storage.
- Start/end line segments only — rejected; loses freehand curve quality; polylines give better UX at the same storage cost.

---

## Decision 2: Canvas sync via RoomSnapshot

**Decision**: The full stroke list (`room.strokes`) is included in every `RoomSnapshot` returned by `GET /rooms/:code`. No separate strokes endpoint. Guessers re-render the canvas from scratch on each poll using the full list.

**Rationale**: Consistent with how `participants`, `drawerId`, `currentWord`, and `wordLength` are already delivered — one snapshot contains all state. Full-list delivery is simple, correct, and scales easily to the 2–N player scope. Re-rendering from scratch on each poll is negligible at typical stroke counts (<100 strokes per round).

**Alternatives considered**:
- Delta/incremental stroke sync — rejected; adds complexity with no benefit at single-room, single-round scope.
- Separate `GET /rooms/:code/strokes` endpoint — rejected; adds a second polling loop and diverges from the single-snapshot pattern established in features 001/002.

---

## Decision 3: Score storage on Participant

**Decision**: Add `score: number` to the `Participant` model. `startGame()` initialises every participant's score to 0. When a correct guess is submitted, the guesser's `score` is incremented by 100 in place.

**Rationale**: Scores are per-participant and already ride the participant list in every snapshot. No new map or data structure is needed. This follows Principle I — extend the existing model minimally.

**Alternatives considered**:
- Separate `scores: Map<participantId, number>` on `Room` — rejected; adds a parallel data structure that must be kept in sync with the participant list, complicating serialisation into `RoomSnapshot`.
- Score on `RoomSnapshot` only (computed) — rejected; scores must survive multiple poll cycles without recomputation; they are mutable state.

---

## Decision 4: Guess storage as ordered array on Room

**Decision**: Add `guesses: Guess[]` to `Room`. Each `Guess` records: `participantId`, `participantName` (denormalised for display), `text` (trimmed), `isCorrect`, `submittedAt` (ISO string).

**Rationale**: An ordered array naturally represents guess history in submission order. Denormalising `participantName` avoids a lookup at render time. `text` is stored trimmed (the processing step is server-side and irreversible from the client's perspective). `isCorrect` avoids re-comparing on every render.

**Alternatives considered**:
- Storing raw (untrimmed) text and reprocessing on read — rejected; the processed result is what matters; storing both is redundant.
- Separate `guessHistory` and `scores` structures — rejected; unnecessarily splits related data.

---

## Decision 5: Three new API endpoints

**Decision**: Add `POST /rooms/:code/strokes`, `DELETE /rooms/:code/strokes`, and `POST /rooms/:code/guesses`. All three return `{ room: RoomSnapshot }` for consistency with existing endpoints.

**Rationale**: Separate endpoints for each mutation keep route handlers small and independently testable. Returning the updated `RoomSnapshot` from mutation endpoints means the client gets immediate feedback without an extra poll — consistent with how `POST /rooms/:code/start` already works.

**Alternatives considered**:
- `PUT /rooms/:code/canvas` for both add and clear — rejected; mixes concerns; `DELETE` is semantically clearer for clearing strokes.
- Bundling stroke submission with the polling GET — rejected; GET must remain idempotent.

---

## Decision 6: DrawingCanvas as a new frontend component

**Decision**: Create `frontend/src/components/DrawingCanvas.tsx`. It accepts `strokes` (read-only display) and an optional `onStroke` callback (drawer mode). When `onStroke` is provided the component wires mouse events; otherwise it is a read-only canvas viewer.

**Rationale**: The canvas requires direct DOM access via `useRef<HTMLCanvasElement>` and imperative drawing calls — fundamentally different from React's declarative rendering. Extracting it into its own component is the minimum required structure, not premature abstraction. The dual drawer/viewer behaviour via a single optional prop avoids duplicating the rendering logic.

**Alternatives considered**:
- Inline canvas in `GamePage.tsx` — rejected; `GamePage` would become unmanageably large.
- Separate `DrawingCanvas` and `ViewCanvas` components — rejected; the rendering logic is identical; only the event handlers differ.

---

## Gaps and Assumptions from Codebase Discovery

1. `GuessForm`, `Scoreboard`, and `ResultPanel` exist as stub components but were removed from `GamePage` in Feature 002. All three will be reimplemented and re-added to `GamePage` in this feature.
2. `Participant` currently has no `score` field. Adding it requires `startGame()` to initialise scores for all participants when the room transitions to `"in-game"`.
3. `toRoomSnapshot()` already has the viewer-aware pattern established in Feature 002. Strokes and guesses are not viewer-filtered — both drawer and guessers receive the full list.
4. The frontend's `RoomStore.fetchRoom()` already passes `participantId` in the GET query. Canvas strokes and guess history will arrive on every existing poll tick without new polling logic.
5. HTML5 Canvas API (`useRef<HTMLCanvasElement>`, `getContext('2d')`) is available in all modern browsers; no new dependency is needed.
