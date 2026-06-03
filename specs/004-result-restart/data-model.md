# Data Model: Result, Restart & Final Validation

**Feature**: `004-result-restart`
**Date**: 2026-06-03

---

## Entities

### RoomStatus *(extended)*

```
"lobby" | "in-game" | "round-over"    ← adds "round-over"
```

**Transition table**:

```
lobby       →  in-game     (startGame)
in-game     →  round-over  (submitGuess, when all non-drawer participants have ≥1 correct guess)
round-over  →  lobby       (restartGame, host only)
```

---

### Room *(no new fields)*

All data needed for the result screen already exists on `Room` from Scenario 3:
- `drawerId` — who drew
- `currentWord` — the secret word (revealed to all in `"round-over"`)
- `strokes` — canvas state
- `guesses` — full ordered guess history

No new fields are added to `Room`.

---

### RoomSnapshot *(snapshot filter change only)*

The word-visibility rule changes for `"round-over"`:

| Status | Drawer sees | Guesser sees |
|---|---|---|
| `"lobby"` | — | — |
| `"in-game"` | `currentWord: "rocket"` | `wordLength: 6` |
| `"round-over"` | `currentWord: "rocket"` | `currentWord: "rocket"` |

No new fields added to `RoomSnapshot`.

---

## State Transitions

### `in-game` → `round-over` (inside `submitGuess`)

**Trigger**: After appending a correct guess, check:
```
const nonDrawers = room.participants.filter(p => p.id !== room.drawerId)
const correctGuessers = new Set(
  room.guesses.filter(g => g.isCorrect).map(g => g.participantId)
)
const allDone = nonDrawers.every(p => correctGuessers.has(p.id))
```
If `allDone`: set `room.status = "round-over"` and persist.

### `round-over` → `lobby` (`restartGame`)

```
room.status        = "lobby"
room.drawerId      = undefined
room.currentWord   = undefined
room.strokes       = []
room.guesses       = []
for each participant: score = 0
```
Participants list unchanged.

---

## Validation Rules

- **Already-guessed guard**: In `submitGuess`, if `room.guesses` already contains
  a `{ participantId, isCorrect: true }` entry for the caller → throw 409
  `"You have already guessed the word correctly"`.
- **Round-over guard**: In `submitGuess`, if `room.status === "round-over"` → throw
  409 `"The round has ended"` (catches late-arriving guesses).
- **Restart guard**: In `restartGame`, room must be `"round-over"` → throw 409
  `"The round is not over yet"` if not.

---

## Type Changes Summary

```
backend/src/models/game.ts
  EXTEND:  RoomStatus  +  "round-over"

frontend/src/services/api.ts
  EXTEND:  RoomSnapshot.status  +  "round-over"
```
