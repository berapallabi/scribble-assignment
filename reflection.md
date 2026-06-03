# Lab Reflection — Scribble Drawing Game

**Author**: Pallabi Bera
**Date**: 2026-06-03
**Branch**: `scribble-lab`

---

## What the Starter App Already Had

The starter was a functional but hollow scaffold — enough structure to understand the intended shape, but with no real game logic.

**Backend (Express + TypeScript + Zod)**
- A `Room` model with `code`, `status` (only `"lobby"`), `participants`, and timestamps.
- A `Participant` model with `id`, `name`, `joinedAt` — no host flag, no score.
- `createRoom()` and `joinRoom()` in `roomStore.ts` — player names were optional and defaulted to `"Player"` with no validation.
- A `RoomSnapshot` that included `availableWords` and `roles` arrays — game-ready placeholders, but unused and never wired to any logic.
- Seed data: `STARTER_WORDS` and `STARTER_ROLES` — sitting idle.

**Frontend (React 18 + Vite + React Router)**
- `StartPage`, `CreateRoomPage`, `JoinRoomPage` — all functional entry points.
- `LobbyPage` — worked, but had a manual **Refresh** button instead of polling. No host tracking, no Start Game control.
- `GamePage` — a full placeholder with no game logic.
- `GuessForm`, `Scoreboard`, `ResultPanel` — stub components rendering nothing useful.
- No `DrawingCanvas` component at all.

The starter set the file structure, routing, and state management pattern (`useSyncExternalStore`). Everything gamplay-related was left to build.

---

## What Was Added

### Scenario 1 — Room Setup & Lobby

The first scenario turned the lobby from a waiting screen into a real shared space.

- Added `isHost: boolean` to `Participant` and widened `RoomStatus` to `"lobby" | "in-game"`.
- Tightened `createRoom()` and `joinRoom()` — player names are now required, trimmed, and Zod-validated; the first participant is marked as host.
- Added `startGame()` to `roomStore.ts` — enforces host-only access and a 2-player minimum before setting `status = "in-game"`.
- Added `POST /rooms/:code/start` endpoint.
- Replaced `LobbyPage`'s manual refresh button with a `setInterval` polling loop at 2 s. Added consecutive-failure tracking (error shown only after 3 failures). Added a status-watching `useEffect` that navigates all clients to `/game` when `status === "in-game"`.
- Added a host badge in the participant list and a host-only Start Game button (disabled with a message when fewer than 2 players are present).
- Added client-side empty-code validation in `JoinRoomPage` — no network request made for blank codes.

### Scenario 2 — Game Start & Drawer Flow

Turned the game screen from a placeholder into a meaningful in-game state.

- Extended `Room` and `RoomSnapshot` with `drawerId?`, `currentWord?`, and `wordLength?`.
- Extended `startGame()` to assign `drawerId = host.id` and `currentWord = STARTER_WORDS[0]`, with an empty-word-list guard.
- Made `toRoomSnapshot()` viewer-aware: the drawer receives `currentWord`; guessers receive only `wordLength`.
- Updated `GamePage` to derive `isDrawer`, show role labels (Drawer / Guesser), display the word to the drawer, and show blank underscores matching word length to guessers.

### Scenario 3 — Gameplay Interaction

The largest scenario — introduced all real-time game mechanics over HTTP polling.

- Added `Point`, `Stroke`, and `Guess` types; added `score: number` to `Participant`; added `strokes[]` and `guesses[]` to `Room`.
- Added `addStroke()`, `clearStrokes()`, and `submitGuess()` to `roomStore.ts`. Guess processing: trim → reject empty → case-insensitive compare → award 100 pts on correct → append to history.
- Added three new endpoints: `POST /rooms/:code/strokes`, `DELETE /rooms/:code/strokes`, `POST /rooms/:code/guesses`.
- Created `DrawingCanvas.tsx` from scratch using the HTML5 Canvas API — interactive for the drawer (mouse events → stroke accumulation → `onStroke` callback on `mouseup`), read-only for guessers (re-renders full stroke list on each poll update). Coordinates stored normalised `[0,1]` and scaled to canvas dimensions at render time.
- Implemented `GuessForm`, `Scoreboard`, and `ResultPanel` from their stubs.
- Wired `GamePage` to render the canvas, guess form (guessers only), live scoreboard, and guess history. Added a polling loop so guessers see canvas updates without any action.

### Scenario 4 — Result, Restart & Final Validation

Completed the round lifecycle: end detection, result display, and host-triggered restart.

- Added `"round-over"` to `RoomStatus`.
- Extended `submitGuess()` with two new guards: (1) already-correct guard — rejects a second correct submission per guesser; (2) round-over detection — after each guess, checks if every non-drawer has a correct entry; if so, sets `status = "round-over"`.
- Updated `toRoomSnapshot()` to reveal `currentWord` to all viewers in `"round-over"` state.
- Added `restartGame()` — host-only, resets `status` to `"lobby"`, clears canvas/guesses/word/drawer, resets all scores to 0, preserves participants.
- Added `POST /rooms/:code/restart` endpoint.
- Updated `GamePage` with a `round-over` branch: shows revealed word, sorted final scores, full guess history, and a Play Again button (host only). Added a `useEffect` that navigates all clients back to `/lobby` when `status === "lobby"`.

---

## Decisions, AI Usage, and Tradeoffs

### Spec-Driven Workflow with Claude

All four scenarios followed the same loop: **Specify → Clarify → Plan → Tasks → Implement**, enforced by the Spec Kit tooling. Claude Sonnet 4.6 was the pair-programming partner throughout — generating specs, identifying gaps during `/speckit-clarify`, writing plan documents, and implementing code task-by-task.

The constitution (`.specify/memory/constitution.md`) acted as a hard gate at every planning step. Any proposal that touched WebSockets, a database, or a new state-management library was rejected before implementation started. This kept the scope honest.

After all four scenarios were implemented, `/speckit-analyze` and `/speckit-clarify` were run as a retrospective quality pass. This surfaced a confirmed defect: **FR-011 in Scenario 2 (reject mid-game join) was never implemented** — the `joinRoom()` function has no `status` check. The clarification session also resolved a direct behavioral contradiction between specs 003 and 004 around whether a correct guesser can keep scoring (answer: no — the already-correct guard in Scenario 4 is canonical and necessary for round-end detection to work).

### Tradeoffs Made

**Full canvas re-render on every poll** — the simplest approach. Every client receives the full stroke list on each `GET /rooms/:code` response and redraws the entire canvas. For a local two-tab test session this is fine; at any real scale this would need delta syncing. Chosen because it kept `DrawingCanvas` stateless with respect to the server.

**HTTP polling at 2 s** — the constitution mandated this. The visible tradeoff is a ~2 s lag for guessers to see new strokes and for all clients to detect status transitions (game start, round over, restart). Accepted as a deliberate constraint, not a technical limitation.

**In-memory state only** — a server restart clears all rooms. This was non-negotiable per the constitution. The edge case (backend restarts mid-game) is handled gracefully: polling returns a 404 and the UI shows an error after 3 consecutive failures.

**No first-correct-guess mechanic** — any guesser scores 100 pts on a correct guess independently. This keeps the scoring model simple and avoids coordination logic. The already-correct guard prevents a single guesser from repeatedly scoring.

**Single stroke colour and brush size** — no colour palette was built. A single default is used throughout. The out-of-scope declaration was explicit in the spec; adding selection UI would have added frontend complexity for no functional requirement.

**Round ends only on all-correct** — without a timer, a round can theoretically run indefinitely if a guesser never submits the right word. This is an accepted edge case explicitly called out in Scenario 4's spec. Adding a timer was out of scope per the constitution.

### What Worked Well

The task-by-task implementation structure — with each task mapped to a specific file and function — made it easy to review AI-generated changes incrementally rather than accepting large diffs wholesale. Constitution principle V ("drawer MUST review every AI suggestion") was meaningful here: several generated implementations needed small corrections before committing.

The retrospective analysis pass genuinely found things the forward pass missed — the mid-game join defect and the cross-spec contradiction around guesser lock-out behaviour. Running `/speckit-analyze` after implementation, not just before, proved its value.
