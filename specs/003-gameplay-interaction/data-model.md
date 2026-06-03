# Data Model: Gameplay Interaction

**Feature**: `003-gameplay-interaction`
**Date**: 2026-06-03

---

## Entities

### Participant *(extended)*

| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Unique participant identifier (existing) |
| `name` | `string` | Player display name, trimmed (existing) |
| `isHost` | `boolean` | Whether this participant created the room (existing) |
| `joinedAt` | `string` (ISO) | Join timestamp (existing) |
| `score` | `number` | **NEW** — Accumulated points for the current round; initialised to `0` when the game starts |

**Rule**: `score` is always a non-negative integer. `startGame()` sets every participant's `score = 0`. A correct guess adds `100`; an incorrect guess adds `0`.

---

### Stroke *(new)*

Represents one completed drawing gesture (mousedown → mouseup).

| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Unique stroke identifier |
| `points` | `Point[]` | Ordered array of at least 2 normalised coordinates |
| `createdAt` | `string` (ISO) | Server timestamp when stroke was persisted |

#### Point *(sub-type)*

| Field | Type | Description |
|---|---|---|
| `x` | `number` | Normalised x-coordinate (0.0–1.0, relative to canvas width) |
| `y` | `number` | Normalised y-coordinate (0.0–1.0, relative to canvas height) |

**Validation rules**:
- `points` array MUST contain ≥ 2 entries.
- `x` and `y` MUST each be in the range `[0, 1]`.
- Points outside `[0, 1]` are clamped server-side to prevent rendering artefacts.

---

### Guess *(new)*

A single text submission by a guesser.

| Field | Type | Description |
|---|---|---|
| `participantId` | `string` (UUID) | ID of the submitting guesser |
| `participantName` | `string` | Denormalised display name of the guesser |
| `text` | `string` | Trimmed guess text (leading/trailing whitespace removed) |
| `isCorrect` | `boolean` | `true` if the trimmed text matches `currentWord` case-insensitively |
| `submittedAt` | `string` (ISO) | Server timestamp |

**Validation rules**:
- `text` (after trimming) MUST be non-empty; empty submissions are rejected with a 422 error.
- Comparison: `text.trim().toLowerCase() === room.currentWord?.toLowerCase()`.
- The drawer (`participantId === room.drawerId`) MUST NOT submit guesses — rejected with a 403 error.

---

### Room *(extended)*

| Field | Type | Description |
|---|---|---|
| `code` | `string` | 4-char room identifier (existing) |
| `status` | `"lobby" \| "in-game"` | Room lifecycle state (existing) |
| `participants` | `Participant[]` | All players, now including `score` field (existing + extended) |
| `createdAt` | `string` (ISO) | (existing) |
| `updatedAt` | `string` (ISO) | (existing) |
| `drawerId` | `string \| undefined` | Current drawer's participant ID (Feature 002) |
| `currentWord` | `string \| undefined` | Secret word for the active round (Feature 002) |
| `strokes` | `Stroke[]` | **NEW** — Ordered list of canvas strokes; empty array until game starts |
| `guesses` | `Guess[]` | **NEW** — Ordered list of submitted guesses; empty array until game starts |

**State transitions**:
```
lobby → in-game (startGame)
  sets drawerId = host.id
  sets currentWord = STARTER_WORDS[0]
  sets all participant.score = 0
  initialises strokes = []
  initialises guesses = []

in-game + POST /strokes
  appends Stroke to room.strokes

in-game + DELETE /strokes
  resets room.strokes = []

in-game + POST /guesses
  appends Guess to room.guesses
  if isCorrect: increments guesser's participant.score += 100
```

---

### RoomSnapshot *(extended)*

The read-only projection returned by the API. All participants receive the same strokes and guesses (no viewer-filtering required for these fields).

| Field | Type | Drawer sees | Guesser sees | Notes |
|---|---|---|---|---|
| `code` | `string` | ✅ | ✅ | (existing) |
| `status` | `"lobby" \| "in-game"` | ✅ | ✅ | (existing) |
| `participants` | `Participant[]` | ✅ | ✅ | Now includes `score` per participant |
| `availableWords` | `string[]` | ✅ | ✅ | (existing, kept for compatibility) |
| `roles` | `ParticipantRole[]` | ✅ | ✅ | (existing, kept for compatibility) |
| `drawerId` | `string \| undefined` | ✅ | ✅ | (Feature 002) |
| `currentWord` | `string \| undefined` | ✅ (word) | ❌ (omitted) | (Feature 002) |
| `wordLength` | `number \| undefined` | ❌ (omitted) | ✅ (count) | (Feature 002) |
| `strokes` | `Stroke[]` | ✅ | ✅ | **NEW** — Full stroke list |
| `guesses` | `Guess[]` | ✅ | ✅ | **NEW** — Full guess history |

---

## Type Changes Summary

```
backend/src/models/game.ts
  NEW:     Point interface         { x: number; y: number }
  NEW:     Stroke interface        { id, points, createdAt }
  NEW:     Guess interface         { participantId, participantName, text, isCorrect, submittedAt }
  EXTEND:  Participant interface   + score: number
  EXTEND:  Room interface          + strokes: Stroke[]
                                   + guesses: Guess[]
  EXTEND:  RoomSnapshot            + strokes: Stroke[]
                                   + guesses: Guess[]

frontend/src/services/api.ts
  NEW:     Point interface         (mirror of backend)
  NEW:     Stroke interface        (mirror of backend)
  NEW:     Guess interface         (mirror of backend)
  EXTEND:  Participant interface   + score: number
  EXTEND:  RoomSnapshot            + strokes: Stroke[]
                                   + guesses: Guess[]
```
