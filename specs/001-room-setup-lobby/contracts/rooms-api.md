# API Contracts: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-01
**Base URL**: `http://localhost:3005`

---

## Existing Endpoints (Modified)

### POST /rooms — Create Room

Creates a new room. The caller becomes the host.

**Request**

```json
{
  "playerName": "Alice"
}
```

| Field      | Type   | Constraints                        |
|------------|--------|------------------------------------|
| playerName | string | Required; trimmed; min 1 char after trim |

**Response 201**

```json
{
  "participantId": "abc123",
  "room": {
    "code": "XKQR",
    "status": "lobby",
    "participants": [
      { "id": "abc123", "name": "Alice", "joinedAt": "2026-06-01T10:00:00Z", "isHost": true }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400    | `playerName` missing, empty, or whitespace-only after trim |

---

### POST /rooms/:code/join — Join Room

Adds a player to an existing room.

**URL param**: `code` — normalised to uppercase before lookup (case-insensitive).

**Request**

```json
{
  "playerName": "Bob"
}
```

| Field      | Type   | Constraints                        |
|------------|--------|------------------------------------|
| playerName | string | Required; trimmed; min 1 char after trim |

**Response 200**

```json
{
  "participantId": "def456",
  "room": {
    "code": "XKQR",
    "status": "lobby",
    "participants": [
      { "id": "abc123", "name": "Alice", "joinedAt": "2026-06-01T10:00:00Z", "isHost": true },
      { "id": "def456", "name": "Bob",   "joinedAt": "2026-06-01T10:01:00Z", "isHost": false }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400    | `playerName` missing, empty, or whitespace-only after trim |
| 404    | Room with given code not found |

---

### GET /rooms/:code — Fetch Room Snapshot

Used by the lobby polling loop. Returns current participant list and room status.

**URL param**: `code` — normalised to uppercase before lookup.

**Query param**: `participantId` (optional) — for future viewer-specific views.

**Response 200**

```json
{
  "room": {
    "code": "XKQR",
    "status": "lobby",
    "participants": [
      { "id": "abc123", "name": "Alice", "joinedAt": "2026-06-01T10:00:00Z", "isHost": true },
      { "id": "def456", "name": "Bob",   "joinedAt": "2026-06-01T10:01:00Z", "isHost": false }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

When the host has started the game, `status` will be `"in-game"`. Lobby-polling clients MUST navigate to `/game` on detecting this value.

**Error responses**

| Status | Condition |
|--------|-----------|
| 404    | Room with given code not found |

---

## New Endpoint

### POST /rooms/:code/start — Start Game

Transitions the room from `lobby` to `in-game`. Only the host may call this endpoint.

**URL param**: `code` — normalised to uppercase before lookup.

**Request**

```json
{
  "participantId": "abc123"
}
```

| Field         | Type   | Constraints                         |
|---------------|--------|-------------------------------------|
| participantId | string | Required; must match the host participant |

**Response 200**

```json
{
  "room": {
    "code": "XKQR",
    "status": "in-game",
    "participants": [
      { "id": "abc123", "name": "Alice", "joinedAt": "2026-06-01T10:00:00Z", "isHost": true },
      { "id": "def456", "name": "Bob",   "joinedAt": "2026-06-01T10:01:00Z", "isHost": false }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400    | `participantId` missing |
| 403    | Caller is not the host of this room |
| 404    | Room not found |
| 409    | Room already in-game (start called twice) |
| 422    | Fewer than 2 participants in the room |
