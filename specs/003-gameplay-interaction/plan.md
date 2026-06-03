# Implementation Plan: Gameplay Interaction

**Branch**: `003-gameplay-interaction` | **Date**: 2026-06-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-gameplay-interaction/spec.md`

---

## Summary

When a round is active, the drawer draws on an HTML Canvas; each completed stroke is POSTed to the server and stored in memory. All participants see the updated canvas via the existing poll cycle. Guessers submit text guesses through a form; the server trims, validates, and compares case-insensitively against `currentWord`. Correct guesses award 100 points. The guess history and live scores ride the existing `RoomSnapshot` and are visible to all players on every poll.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 backend, React 18 frontend)

**Primary Dependencies**: Express + Zod (backend); React + Vite + React Router (frontend) — all from starter, no new packages. HTML5 Canvas API used for drawing (no additional library needed).

**Storage**: In-memory `Map<string, Room>` in `roomStore.ts` — no database

**Testing**: Vitest (backend `schemas.test.ts`, `roomStore.test.ts`; frontend `api.test.ts`) — existing test harness

**Target Platform**: Local dev server (backend :3005, frontend :5173)

**Performance Goals**: Stroke render on drawer's canvas within 100 ms of mouseup (local state update); canvas visible on guessers' canvases within ~2 s polling cycle (SC-001, SC-002)

**Constraints**: HTTP polling only; no WebSockets; in-memory only; no new npm packages; all guess validation server-side

**Scale/Scope**: Single room, single round, 2–N players

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Incremental Brownfield Enhancement | ✅ Pass | Extends `Room`, `Participant`, `RoomSnapshot`; re-uses existing stub components |
| II. HTTP Polling Only | ✅ Pass | Strokes and guesses delivered via existing poll; no push mechanism added |
| III. In-Memory State Only | ✅ Pass | `strokes[]` and `guesses[]` added to in-memory `Room` |
| IV. TypeScript-First | ✅ Pass | All new types defined; Zod schemas added for new endpoints |
| V. Spec-Driven Development | ✅ Pass | Following Spec Kit loop; all tasks traceable to FRs |

No violations. No complexity justification required.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-gameplay-interaction/
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
    │   └── game.ts          ← add Point, Stroke, Guess; extend Participant (score), Room (strokes, guesses), RoomSnapshot
    ├── services/
    │   └── roomStore.ts     ← startGame() init scores+arrays; addStroke(); clearStrokes(); submitGuess(); toRoomSnapshot() includes strokes+guesses
    └── api/
        ├── rooms.ts         ← POST /rooms/:code/strokes, DELETE /rooms/:code/strokes, POST /rooms/:code/guesses
        └── schemas.ts       ← strokeSchema, clearStrokesSchema, guessSchema

frontend/
└── src/
    ├── services/
    │   └── api.ts           ← add Point, Stroke, Guess types; addStroke(), clearStrokes(), submitGuess() methods
    ├── components/
    │   ├── DrawingCanvas.tsx ← NEW: interactive (drawer) or read-only (guesser) canvas using HTML5 Canvas API
    │   ├── GuessForm.tsx    ← implement real guess submission (was a stub)
    │   ├── ResultPanel.tsx  ← implement guess history display (was a stub)
    │   └── Scoreboard.tsx   ← implement scores display (was a stub)
    └── pages/
        └── GamePage.tsx     ← add DrawingCanvas to main area; add GuessForm, Scoreboard, ResultPanel to sidebars
```

---

## Implementation Steps

### Step 1: Extend backend types (blocking — must come first)

**`backend/src/models/game.ts`**:
- Add `Point` interface: `{ x: number; y: number }`
- Add `Stroke` interface: `{ id: string; points: Point[]; createdAt: string }`
- Add `Guess` interface: `{ participantId: string; participantName: string; text: string; isCorrect: boolean; submittedAt: string }`
- Extend `Participant`: add `score: number`
- Extend `Room`: add `strokes: Stroke[]` and `guesses: Guess[]`
- Extend `RoomSnapshot`: add `strokes: Stroke[]` and `guesses: Guess[]`

**`frontend/src/services/api.ts`** (parallel with backend):
- Add `Point`, `Stroke`, `Guess` interfaces (mirror of backend)
- Extend `Participant`: add `score: number`
- Extend `RoomSnapshot`: add `strokes: Stroke[]` and `guesses: Guess[]`

### Step 2: Extend `startGame()` and `toRoomSnapshot()`

**`backend/src/services/roomStore.ts`**:
- In `startGame()`, after existing guard checks and before `room.status = "in-game"`: set `room.strokes = []` and `room.guesses = []`; set every `participant.score = 0`
- In `toRoomSnapshot()`, add `strokes: room.strokes.map(s => ({ ...s, points: [...s.points] }))` and `guesses: [...room.guesses]` to the snapshot (no viewer-filtering — all participants see both)

### Step 3: Add `addStroke()` and `clearStrokes()` to roomStore

**`backend/src/services/roomStore.ts`**:
- `addStroke(code, participantId, points)`:
  - Guard: room exists (404), in-game (409), caller is drawer — `caller.id === room.drawerId` (403 if not), `points.length >= 2` (422 if not)
  - Clamp all `{x, y}` coordinates to `[0, 1]` using `Math.min(1, Math.max(0, v))`
  - Append `{ id: randomUUID(), points: clampedPoints, createdAt: now() }` to `room.strokes`
  - Return `cloneRoom(room)`
- `clearStrokes(code, participantId)`:
  - Guard: room exists (404), in-game (409), caller is drawer (403 if not)
  - Set `room.strokes = []`
  - Return `cloneRoom(room)`

### Step 4: Add `submitGuess()` to roomStore

**`backend/src/services/roomStore.ts`**:
- `submitGuess(code, participantId, rawText)`:
  - Guard: room exists (404), in-game (409), participant exists (404), caller is NOT drawer (403 if drawer)
  - `const text = rawText.trim()`; if `text === ""` throw 422 `"Guess cannot be empty"`
  - `const isCorrect = text.toLowerCase() === (room.currentWord ?? "").toLowerCase()`
  - If `isCorrect`: find participant and set `participant.score += 100`
  - Append `{ participantId, participantName: participant.name, text, isCorrect, submittedAt: now() }` to `room.guesses`
  - Return `cloneRoom(room)`

### Step 5: Add Zod schemas

**`backend/src/api/schemas.ts`**:
```typescript
export const pointSchema = z.object({ x: z.number(), y: z.number() });
export const strokeSchema = z.object({
  participantId: z.string().min(1),
  points: z.array(pointSchema).min(2, "A stroke must have at least 2 points")
});
export const clearStrokesSchema = z.object({ participantId: z.string().min(1) });
export const guessSchema = z.object({
  participantId: z.string().min(1),
  text: z.string()
});
```

### Step 6: Add new routes

**`backend/src/api/rooms.ts`**:
- Import `addStroke`, `clearStrokes`, `submitGuess` from roomStore
- `router.post("/:code/strokes", ...)` → parse `strokeSchema`, call `addStroke(code, participantId, points)`, return `{ room: toRoomSnapshot(room, participantId) }`
- `router.delete("/:code/strokes", ...)` → parse `clearStrokesSchema` from `request.body`, call `clearStrokes(code, participantId)`, return `{ room: toRoomSnapshot(room, participantId) }`
- `router.post("/:code/guesses", ...)` → parse `guessSchema`, call `submitGuess(code, participantId, text)`, return `{ room: toRoomSnapshot(room, participantId) }`

### Step 7: Add API methods to frontend

**`frontend/src/services/api.ts`**:
```typescript
addStroke(code: string, participantId: string, points: Point[]) {
  return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/strokes`, {
    method: "POST",
    body: JSON.stringify({ participantId, points })
  });
},
clearStrokes(code: string, participantId: string) {
  return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/strokes`, {
    method: "DELETE",
    body: JSON.stringify({ participantId })
  });
},
submitGuess(code: string, participantId: string, text: string) {
  return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/guesses`, {
    method: "POST",
    body: JSON.stringify({ participantId, text })
  });
}
```

### Step 8: Implement DrawingCanvas component

**`frontend/src/components/DrawingCanvas.tsx`** (new file):
- Props: `strokes: Stroke[]`, `onStroke?: (points: Point[]) => void`, `onClear?: () => void`
- `useRef<HTMLCanvasElement>()` for direct DOM access
- `useEffect([strokes])`: clear canvas and re-draw all strokes from `strokes` prop on every change (full re-render)
- Stroke rendering: `ctx.beginPath(); ctx.moveTo(pts[0]); pts.slice(1).forEach(p => ctx.lineTo(p)); ctx.stroke()`; coordinates scaled by `canvas.width` / `canvas.height`
- Drawer mode (`onStroke` provided): local `currentPoints` state; `onMouseDown` starts recording, `onMouseMove` appends points and draws live, `onMouseUp` calls `onStroke(currentPoints)` and resets local state
- "Clear Canvas" button below canvas, shown only when `onClear` is provided

### Step 9: Implement GuessForm, Scoreboard, ResultPanel

**`frontend/src/components/GuessForm.tsx`**:
- Keep existing `disabled?: boolean` prop; add `onSubmit: (text: string) => void` and `error?: string | null`
- Controlled input with local state; on form submit call `onSubmit(value)` and clear input; display `error` below input if non-null

**`frontend/src/components/Scoreboard.tsx`**:
- Props: `participants: Participant[]`
- Render list sorted by `score` descending: name + score

**`frontend/src/components/ResultPanel.tsx`**:
- Props: `guesses: Guess[]`
- Render ordered list: `[name]: [text]` with ✓/✗ indicator for `isCorrect`

### Step 10: Update GamePage

**`frontend/src/pages/GamePage.tsx`**:
- Import `DrawingCanvas`, `GuessForm`, `ResultPanel`, `Scoreboard`
- Replace canvas-placeholder with `<DrawingCanvas strokes={room.strokes ?? []} onStroke={isDrawer ? handleStroke : undefined} onClear={isDrawer ? handleClear : undefined} />`
- Left sidebar: add `<Scoreboard participants={room.participants} />` and `<ResultPanel guesses={room.guesses ?? []} />`
- Right sidebar: show `<GuessForm onSubmit={handleGuess} error={guessError} disabled={isSubmitting} />` for guessers only (not shown to drawer)
- Local state: `guessError: string | null`, `isSubmitting: boolean`
- `handleStroke(points)`: calls `roomStore.addStroke(room.code, participantId, points)` → `api.addStroke` → updates snapshot
- `handleClear()`: calls `roomStore.clearStrokes(room.code, participantId)` → `api.clearStrokes` → updates snapshot
- `handleGuess(text)`: sets `isSubmitting=true`, calls `api.submitGuess(...)`, updates snapshot, clears error; on error sets `guessError`; finally `isSubmitting=false`

---

## Data Flow

```
Drawer draws stroke:
  mouseup → handleStroke(points)
  → api.addStroke(code, participantId, points)
  → POST /rooms/:code/strokes
  → addStroke(): clamp, append Stroke
  → toRoomSnapshot() → response
  → roomStore.setRoomSnapshot(response.room)
  → DrawingCanvas re-renders with new strokes

Guesser polls (every ~2s):
  GET /rooms/:code?participantId=guesserUuid
  → toRoomSnapshot includes strokes, guesses, participants (scores)
  → DrawingCanvas re-renders (read-only)
  → Scoreboard + ResultPanel update

Guesser submits guess:
  handleGuess("  Rocket  ")
  → api.submitGuess(code, participantId, "  Rocket  ")
  → POST /rooms/:code/guesses
  → submitGuess(): trim → "Rocket", compare → correct, score += 100, append Guess
  → toRoomSnapshot() → response
  → roomStore.setRoomSnapshot(response.room)
  → Scoreboard + ResultPanel update immediately
```

---

## Testing Strategy

| Scenario | How to test |
|---|---|
| Drawer draws and clears | Drawer tab: draw → strokes appear live; clear → canvas blanks |
| Guesser sees drawing | Guesser tab: after next poll → same strokes appear on read-only canvas |
| Correct guess scored | Submit correct word → score +100 for that player on all tabs |
| Incorrect guess no score | Submit wrong word → score unchanged; guess appears in history |
| Empty guess rejected | Submit whitespace → error message; no guess added to history |
| Case-insensitive match | Submit "ROCKET" when word is "rocket" → correct |
| Drawer blocked from guessing | Drawer tab: no guess form visible |
| Score starts at 0 | Game start → all scores 0 on all tabs |

**Build gate**: `cd backend && npm run build` and `cd frontend && npm run build` must both pass before PR.
