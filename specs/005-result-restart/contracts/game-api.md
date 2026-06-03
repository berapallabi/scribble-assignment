# API Contract: Result, Restart & Final Validation

**Feature**: `005-result-restart`
**Date**: 2026-06-03

All existing endpoints are unchanged except where noted.

---

## Modified Endpoint: GET /rooms/:code

The `RoomSnapshot` now includes `currentWord` for **all** participants when
`status === "game-over"` (previously it was omitted).

**Response — game-over (all participants see the word)**
```json
{
  "room": {
    "code": "ABCD",
    "status": "game-over",
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true,  "score": 200 },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "score": 100 }
    ],
    "drawerId": "uuid-2",
    "currentWord": "rocket",
    "strokes": [],
    "guesses": [
      { "participantId": "uuid-1", "participantName": "Alice", "text": "rocket", "isCorrect": true, "submittedAt": "..." }
    ],
    "roundNumber": 2,
    "secondsRemaining": 0
  }
}
```

**Note**: `wordLength` is NOT included in game-over state — only `currentWord`.

---

## New Endpoint: POST /rooms/:code/restart

Resets the room to lobby state. Only the host may call this endpoint.

**Request**
```json
{ "participantId": "uuid-1" }
```

**Response** — lobby snapshot with all participants preserved and scores reset
```json
{
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true,  "score": 0 },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "score": 0 }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"],
    "strokes": [],
    "guesses": [],
    "roundNumber": 0,
    "secondsRemaining": 0
  }
}
```

**Errors**

| Scenario | Status | Message |
|---|---|---|
| Room not found | 404 | "Room not found" |
| Caller is not the host | 403 | "Only the host can restart the game" |
| Room is not in game-over state | 409 | "Game is not over yet" |

---

## Unchanged Endpoints

- `POST /rooms` — create room
- `POST /rooms/:code/join` — join room
- `POST /rooms/:code/start` — start game
- `POST /rooms/:code/strokes` — add stroke
- `DELETE /rooms/:code/strokes` — clear strokes
- `POST /rooms/:code/guesses` — submit guess
