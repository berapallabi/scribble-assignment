# Data Model: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-01

---

## Updated Types

### RoomStatus

```
"lobby" | "in-game"
```

Previously `"lobby"` only. Widened to support the game-start transition (FR-011).

---

### Participant

| Field      | Type    | Constraints                                              | Change  |
|------------|---------|----------------------------------------------------------|---------|
| id         | string  | Unique within the room; generated on join                | Existing |
| name       | string  | Non-empty after trim; max unconstrained                  | Existing (validation tightened) |
| joinedAt   | string  | ISO 8601 timestamp                                       | Existing |
| **isHost** | boolean | Exactly one participant per room has `isHost = true`     | **NEW** |

**Invariant**: The participant with `isHost = true` is always the one returned by `createRoom`. All participants added via `joinRoom` have `isHost = false`.

---

### Room (server-side, in-memory)

| Field        | Type          | Constraints                          | Change   |
|--------------|---------------|--------------------------------------|----------|
| code         | string        | 4-char alphanumeric, unique, uppercase | Existing |
| status       | RoomStatus    | `"lobby"` or `"in-game"`            | Extended |
| participants | Participant[] | ≥ 1; ordered by join time            | Existing |
| createdAt    | string        | ISO 8601                             | Existing |
| updatedAt    | string        | ISO 8601; updated on every mutation  | Existing |

---

### RoomSnapshot (API response / client type)

Serialised form returned by all room endpoints and consumed by the frontend polling loop.

| Field        | Type          | Notes                                              |
|--------------|---------------|----------------------------------------------------|
| code         | string        | Uppercase room code                                |
| status       | RoomStatus    | `"lobby"` or `"in-game"` — drives client navigation |
| participants | Participant[] | Includes `isHost` flag per participant             |
| availableWords | string[]    | Starter word list (unchanged)                      |
| roles        | string[]      | Starter roles array (unchanged)                    |

---

## State Transitions

```
[create room]
      │
      ▼
   lobby  ◄──── [players join]
      │
      │  [host calls POST /rooms/:code/start
      │   with ≥ 2 participants]
      ▼
   in-game
```

- The only valid forward transition is `lobby → in-game`.
- There is no back-transition within this feature scope (restart is Scenario 4).
- Once `status = "in-game"`, all lobby-polling clients detect it and navigate to `/game`.

---

## Validation Rules

| Field       | Rule                                          | Where enforced              |
|-------------|-----------------------------------------------|-----------------------------|
| playerName  | Required; trimmed; min length 1 after trim    | Backend Zod schema + service |
| roomCode    | Trimmed; uppercased before lookup             | Frontend input + backend route |
| participants count (start) | ≥ 2 before `status` changes  | `startGame` service method  |
| isHost      | Exactly 1 per room at all times               | `createRoom` sets; `joinRoom` always sets false |
