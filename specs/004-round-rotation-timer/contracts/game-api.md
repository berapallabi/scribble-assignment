# API Contract: Round Rotation & Timer

**Feature**: `004-round-rotation-timer`
**Date**: 2026-06-03

All existing endpoints are unchanged except where noted. New fields are additive.

---

## Modified Endpoint: GET /rooms/:code

Now includes `roundNumber` and `secondsRemaining` in `RoomSnapshot`.
`status` now has a third possible value: `"game-over"`.

**Response — in-game, guesser view (mid-round)**
```json
{
  "room": {
    "code": "ABCD",
    "status": "in-game",
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true,  "joinedAt": "...", "score": 100 },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "joinedAt": "...", "score": 0   }
    ],
    "drawerId": "uuid-1",
    "wordLength": 6,
    "strokes": [],
    "guesses": [],
    "roundNumber": 2,
    "secondsRemaining": 47
  }
}
```

**Response — game-over**
```json
{
  "room": {
    "code": "ABCD",
    "status": "game-over",
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true,  "joinedAt": "...", "score": 200 },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "joinedAt": "...", "score": 100 }
    ],
    "drawerId": "uuid-2",
    "strokes": [],
    "guesses": [],
    "roundNumber": 2,
    "secondsRemaining": 0
  }
}
```

**Notes**:
- `secondsRemaining` is always present and is `0` when the game is over.
- `roundNumber` is always present once the game has started (undefined in lobby).
- When `status === "game-over"`, the `currentWord`/`wordLength` fields may be absent.
- Timer expiry is checked lazily on GET — the round may advance as part of handling
  this request if the timer has elapsed since the last poll.

---

## Modified Endpoint: POST /rooms/:code/guesses

If the submitted guess is the last correct guess needed to complete the round, the
response snapshot already reflects the new round (or game-over state).

**Behaviour change**: After recording the guess, `advanceRoundIfNeeded` is called
server-side. The response is the post-advance snapshot.

**New error case**:

| Scenario | Status | Message |
|---|---|---|
| Round timer has expired (round already advanced) | 409 | "Game has not started" (existing catch-all for non-in-game status) |

---

## Unchanged Endpoints

- `POST /rooms` — create room
- `POST /rooms/:code/join` — join room
- `POST /rooms/:code/start` — start game (internally now also sets `roundNumber` and `roundStartedAt`)
- `POST /rooms/:code/strokes` — add stroke
- `DELETE /rooms/:code/strokes` — clear strokes
