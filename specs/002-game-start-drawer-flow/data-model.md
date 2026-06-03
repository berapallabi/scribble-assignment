# Data Model: Game Start & Drawer Flow

**Feature**: `002-game-start-drawer-flow`
**Date**: 2026-06-01

---

## Entities

### Room *(extended)*

The central in-memory entity managed by `roomStore.ts`. Two new optional fields are added when the game starts.

| Field | Type | Description |
|---|---|---|
| `code` | `string` | Unique 4-char room identifier (existing) |
| `status` | `"lobby" \| "in-game"` | Room lifecycle state (existing) |
| `participants` | `Participant[]` | All players in the room (existing) |
| `createdAt` | `string` (ISO) | Creation timestamp (existing) |
| `updatedAt` | `string` (ISO) | Last-mutation timestamp (existing) |
| `drawerId` | `string \| undefined` | **NEW** — ID of the current drawer; `undefined` while in lobby |
| `currentWord` | `string \| undefined` | **NEW** — Secret word for the active round; `undefined` while in lobby |

**State transition**:
```
lobby → in-game
  sets drawerId = host.id
  sets currentWord = STARTER_WORDS[0]
```

---

### Participant *(unchanged)*

| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Unique participant identifier |
| `name` | `string` | Player display name (trimmed, non-empty) |
| `isHost` | `boolean` | Whether this participant created the room |
| `joinedAt` | `string` (ISO) | Join timestamp |

---

### RoomSnapshot *(viewer-aware, extended)*

The read-only projection of a `Room` returned by the API. The shape differs by viewer role — server-side filtering ensures the word never leaks to guessers.

| Field | Type | Drawer sees | Guesser sees | Notes |
|---|---|---|---|---|
| `code` | `string` | ✅ | ✅ | Room code |
| `status` | `"lobby" \| "in-game"` | ✅ | ✅ | |
| `participants` | `Participant[]` | ✅ | ✅ | Full list |
| `availableWords` | `string[]` | ✅ | ✅ | Kept for compatibility |
| `roles` | `ParticipantRole[]` | ✅ | ✅ | Kept for compatibility |
| `drawerId` | `string \| undefined` | ✅ | ✅ | Both see who the drawer is |
| `currentWord` | `string \| undefined` | ✅ (word) | ❌ (omitted) | Only in drawer's response |
| `wordLength` | `number \| undefined` | ❌ (omitted) | ✅ (letter count) | Only in guesser's response |

---

### Word List *(read-only seed)*

| Attribute | Value |
|---|---|
| Source | `backend/src/seed/starterData.ts` → `STARTER_WORDS` |
| Contents | `["rocket", "pizza", "castle", "guitar", "sunflower"]` |
| Selection rule | Always index 0 for round 1 (`"rocket"`) |
| Mutability | Immutable at runtime; no dynamic word management |

---

## Validation Rules

- `drawerId` MUST reference a `Participant.id` that exists in `room.participants`.
- `currentWord` MUST be a non-empty string from `STARTER_WORDS`; if `STARTER_WORDS` is empty at runtime, `startGame` MUST throw before writing to the room.
- `wordLength` in the guesser snapshot MUST equal `currentWord.length` on the server; the server computes it, the client does not.

---

## Type Changes Summary

```
backend/src/models/game.ts
  Room interface:       + drawerId?: string
                        + currentWord?: string
  RoomSnapshot:         + drawerId?: string
                        + currentWord?: string   (drawer only)
                        + wordLength?: number    (guesser only)

frontend/src/services/api.ts
  RoomSnapshot:         + drawerId?: string
                        + currentWord?: string
                        + wordLength?: number
```
