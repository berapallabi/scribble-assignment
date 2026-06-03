# API Contract: Game Start & Drawer Flow

**Feature**: `002-game-start-drawer-flow`
**Date**: 2026-06-01

All existing endpoints from Scenario 1 are unchanged except where noted below.
New fields are additive — no existing fields are removed or renamed.

---

## Modified Endpoint: GET /rooms/:code

Existing endpoint. Now returns viewer-aware `RoomSnapshot`.

**Request**
```
GET /rooms/:code?participantId=<uuid>
```

**Response — Drawer (participantId === drawerId)**
```json
{
  "room": {
    "code": "ABCD",
    "status": "in-game",
    "participants": [
      { "id": "uuid-1", "name": "Alice", "isHost": true, "joinedAt": "..." },
      { "id": "uuid-2", "name": "Bob",   "isHost": false, "joinedAt": "..." }
    ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "roles": ["drawer","guesser"],
    "drawerId": "uuid-1",
    "currentWord": "rocket"
  }
}
```

**Response — Guesser (participantId !== drawerId, or omitted)**
```json
{
  "room": {
    "code": "ABCD",
    "status": "in-game",
    "participants": [ ... ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "roles": ["drawer","guesser"],
    "drawerId": "uuid-1",
    "wordLength": 6
  }
}
```

**Notes**:
- `currentWord` is NEVER present in a guesser response.
- `wordLength` is NEVER present in a drawer response.
- While `status === "lobby"`, both `drawerId` and `currentWord`/`wordLength` are absent.

---

## Modified Endpoint: POST /rooms/:code/start

Existing endpoint. Now passes `participantId` to `toRoomSnapshot` so the host (who is the drawer) receives `currentWord` immediately in the start response.

**Request** *(unchanged)*
```json
{ "participantId": "uuid-1" }
```

**Response** — same shape as GET drawer response above (host = drawer sees the word).

---

## Unchanged Endpoints

- `POST /rooms` — create room (no game-state changes)
- `POST /rooms/:code/join` — join room (no game-state changes; returns lobby snapshot)

---

## Error Cases (new)

| Scenario | Status | Message |
|---|---|---|
| `STARTER_WORDS` is empty at runtime | 500 | "No words available to start the game" |

All existing error cases from Scenario 1 remain unchanged.
