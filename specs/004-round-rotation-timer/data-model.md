# Data Model: Round Rotation & Timer

**Feature**: `004-round-rotation-timer`
**Date**: 2026-06-03

---

## Entities

### Room *(extended)*

| Field | Type | Description |
|---|---|---|
| `code` | `string` | 4-char room identifier (existing) |
| `status` | `"lobby" \| "in-game" \| "game-over"` | **EXTENDED** — adds `"game-over"` state |
| `participants` | `Participant[]` | All players with scores (existing) |
| `drawerId` | `string \| undefined` | Current round's drawer (existing) |
| `currentWord` | `string \| undefined` | Current round's secret word (existing) |
| `strokes` | `Stroke[]` | Canvas strokes, cleared each round (existing) |
| `guesses` | `Guess[]` | Guesses for current round only, cleared on advance (existing) |
| `roundNumber` | `number` | **NEW** — 1-based current round counter; initialised to `1` in `startGame()` |
| `roundStartedAt` | `string` (ISO) | **NEW** — Server timestamp when current round began; initialised in `startGame()` |
| `createdAt` | `string` (ISO) | (existing) |
| `updatedAt` | `string` (ISO) | (existing) |

**State transitions**:
```
lobby → in-game (startGame)
  drawerId     = participants[0].id
  currentWord  = STARTER_WORDS[0]
  roundNumber  = 1
  roundStartedAt = now()
  strokes      = []
  guesses      = []
  all participant.score = 0

in-game → in-game (advanceRound, when roundNumber < participants.length)
  roundNumber   += 1
  drawerId       = participants[roundNumber - 1].id
  currentWord    = STARTER_WORDS[(roundNumber - 1) % STARTER_WORDS.length]
  roundStartedAt = now()
  strokes        = []
  guesses        = []
  (scores preserved)

in-game → game-over (advanceRound, when roundNumber === participants.length)
  status = "game-over"
  roundNumber stays at final value
```

**Round advance triggers** (evaluated in `advanceRoundIfNeeded`):
- Timer: `Date.now() - new Date(roundStartedAt).getTime() >= 60_000`
- All guessed: every non-drawer participant has ≥ 1 correct entry in `room.guesses`

---

### RoomSnapshot *(extended)*

| Field | Type | Notes |
|---|---|---|
| `code` | `string` | (existing) |
| `status` | `"lobby" \| "in-game" \| "game-over"` | **EXTENDED** |
| `participants` | `Participant[]` | With `score` (existing) |
| `drawerId` | `string \| undefined` | (existing) |
| `currentWord` | `string \| undefined` | Drawer only (existing) |
| `wordLength` | `number \| undefined` | Guesser only (existing) |
| `strokes` | `Stroke[]` | (existing) |
| `guesses` | `Guess[]` | Current round only (existing) |
| `roundNumber` | `number` | **NEW** — Current round (1-based) |
| `secondsRemaining` | `number` | **NEW** — Server-computed; `max(0, 60 - elapsed)` |

---

## Type Changes Summary

```
backend/src/models/game.ts
  EXTEND:  RoomStatus   + "game-over"
  EXTEND:  Room         + roundNumber: number
                        + roundStartedAt: string
  EXTEND:  RoomSnapshot + roundNumber: number
                        + secondsRemaining: number

frontend/src/services/api.ts
  EXTEND:  RoomSnapshot.status  type  + "game-over"
  EXTEND:  RoomSnapshot         + roundNumber: number
                                + secondsRemaining: number
```
