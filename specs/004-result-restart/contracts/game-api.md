# API Contract: Result, Restart & Final Validation

**Feature**: `004-result-restart`
**Date**: 2026-06-03

All existing endpoints are unchanged except where noted.

---

## Modified Endpoint: GET /rooms/:code

`status` now has a third possible value: `"round-over"`. When status is
`"round-over"`, `currentWord` is included for **all** participants.

**Response — round-over (all participants see the word)**
```json
{
  "room": {
    "code": "ABCD",
    "status": "round-over",
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true,  "score": 0   },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "score": 100 },
      { "id": "uuid-3", "name": "Carol", "isHost": false, "score": 100 }
    ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "roles": ["drawer","guesser"],
    "drawerId": "uuid-1",
    "currentWord": "rocket",
    "strokes": [],
    "guesses": [
      { "participantId": "uuid-2", "participantName": "Bob",   "text": "rocket", "isCorrect": true,  "submittedAt": "..." },
      { "participantId": "uuid-3", "participantName": "Carol", "text": "plane",  "isCorrect": false, "submittedAt": "..." },
      { "participantId": "uuid-3", "participantName": "Carol", "text": "rocket", "isCorrect": true,  "submittedAt": "..." }
    ]
  }
}
```

---

## Modified Endpoint: POST /rooms/:code/guesses

Two new error cases:

| Scenario | Status | Message |
|---|---|---|
| Caller has already submitted a correct guess this round | 409 | "You have already guessed the word correctly" |
| Round has ended (`status === "round-over"`) | 409 | "The round has ended" |

When the submitted guess is the last correct guess (all guessers now correct), the
response snapshot already has `status: "round-over"` and `currentWord` visible to all.

---

## New Endpoint: POST /rooms/:code/restart

Resets the room to lobby. Only the host may call this, and only from `"round-over"`.

**Request**
```json
{ "participantId": "uuid-1" }
```

**Response** — lobby snapshot, participants preserved, scores zeroed
```json
{
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true,  "score": 0 },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "score": 0 },
      { "id": "uuid-3", "name": "Carol", "isHost": false, "score": 0 }
    ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "roles": ["drawer","guesser"],
    "strokes": [],
    "guesses": []
  }
}
```

**Errors**

| Scenario | Status | Message |
|---|---|---|
| Room not found | 404 | "Room not found" |
| Caller is not the host | 403 | "Only the host can restart the game" |
| Room is not in round-over state | 409 | "The round is not over yet" |

---

## Unchanged Endpoints

- `POST /rooms` — create room
- `POST /rooms/:code/join` — join room
- `POST /rooms/:code/start` — start game
- `POST /rooms/:code/strokes` — add stroke
- `DELETE /rooms/:code/strokes` — clear strokes
