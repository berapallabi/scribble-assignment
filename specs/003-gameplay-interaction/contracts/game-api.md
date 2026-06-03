# API Contract: Gameplay Interaction

**Feature**: `003-gameplay-interaction`
**Date**: 2026-06-03

All existing endpoints from Features 001/002 are unchanged except where noted.
New fields are additive — no existing fields are removed or renamed.

---

## Modified Endpoint: GET /rooms/:code

Now returns `strokes` and `guesses` in `RoomSnapshot` for all in-game rooms.
The `participants` array now includes `score` on each entry.

**Request** *(unchanged)*
```
GET /rooms/:code?participantId=<uuid>
```

**Response** *(extended — in-game, guesser view)*
```json
{
  "room": {
    "code": "ABCD",
    "status": "in-game",
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true,  "joinedAt": "...", "score": 100 },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "joinedAt": "...", "score": 0   }
    ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "roles": ["drawer","guesser"],
    "drawerId": "uuid-1",
    "wordLength": 6,
    "strokes": [
      {
        "id": "stroke-uuid",
        "points": [{"x":0.1,"y":0.2},{"x":0.15,"y":0.25},{"x":0.2,"y":0.3}],
        "createdAt": "2026-06-03T10:00:00.000Z"
      }
    ],
    "guesses": [
      {
        "participantId": "uuid-2",
        "participantName": "Bob",
        "text": "rocket",
        "isCorrect": true,
        "submittedAt": "2026-06-03T10:00:05.000Z"
      }
    ]
  }
}
```

**Notes**:
- `strokes` is always an array (empty `[]` while in lobby or before any stroke is drawn).
- `guesses` is always an array (empty `[]` while in lobby or before any guess is submitted).
- `participants[].score` is `0` for all participants before `startGame()` is called; `startGame()` initialises scores.

---

## New Endpoint: POST /rooms/:code/strokes

Appends a completed drawing stroke. Only the drawer may call this endpoint.

**Request**
```json
{ "participantId": "uuid-1", "points": [{"x":0.1,"y":0.2},{"x":0.2,"y":0.3}] }
```

**Response**
```json
{
  "room": { "...": "same shape as GET drawer response with updated strokes array" }
}
```

**Errors**

| Scenario | Status | Message |
|---|---|---|
| Room not found | 404 | "Room not found" |
| Caller is not the drawer | 403 | "Only the drawer can add strokes" |
| Room not in-game | 409 | "Game has not started" |
| `points` has fewer than 2 entries | 422 | "A stroke must have at least 2 points" |

---

## New Endpoint: DELETE /rooms/:code/strokes

Clears all strokes from the canvas. Only the drawer may call this endpoint.

**Request**
```
DELETE /rooms/:code/strokes
Content-Type: application/json

{ "participantId": "uuid-1" }
```

**Response**
```json
{
  "room": { "...": "same shape as GET drawer response with strokes: []" }
}
```

**Errors**

| Scenario | Status | Message |
|---|---|---|
| Room not found | 404 | "Room not found" |
| Caller is not the drawer | 403 | "Only the drawer can clear strokes" |
| Room not in-game | 409 | "Game has not started" |

---

## New Endpoint: POST /rooms/:code/guesses

Submits a text guess. Only guessers may call this endpoint.

**Request**
```json
{ "participantId": "uuid-2", "text": "  Rocket  " }
```

**Response**
```json
{
  "room": { "...": "same shape as GET guesser response with updated guesses and participants (scores)" }
}
```

**Notes**:
- `text` is trimmed server-side before comparison; the stored `text` in the response is already trimmed.
- Comparison is case-insensitive.
- The drawer (`participantId === drawerId`) cannot submit guesses.

**Errors**

| Scenario | Status | Message |
|---|---|---|
| Room not found | 404 | "Room not found" |
| Participant not found | 404 | "Participant not found" |
| Caller is the drawer | 403 | "The drawer cannot submit guesses" |
| Room not in-game | 409 | "Game has not started" |
| Text is empty or whitespace-only | 422 | "Guess cannot be empty" |

---

## Unchanged Endpoints

- `POST /rooms` — create room
- `POST /rooms/:code/join` — join room
- `POST /rooms/:code/start` — start game (score initialisation happens here internally)
