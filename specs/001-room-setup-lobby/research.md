# Research: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-01

---

## Decision 1: Host Tracking Strategy

**Decision**: Add `isHost: boolean` to the existing `Participant` interface.

**Rationale**: The simplest extension to the current model. Each participant already lives inside `room.participants[]`, so marking one of them as host requires no new top-level field on `Room` and no second lookup. `isHost` is also naturally serialised into every `RoomSnapshot`, making it available to any polling client without extra work.

**Alternatives considered**:
- Separate `hostId: string` field on `Room` — requires the client to cross-reference two arrays to find the host name; adds indirection without benefit.
- Separate `host: Participant` field — duplicates data already in `participants[]`; risks drift.

---

## Decision 2: Room Phase / Status Expansion

**Decision**: Expand the existing `RoomStatus` union type from `"lobby"` to `"lobby" | "in-game"`. Keep the field name `status` throughout backend and frontend (spec uses the word "phase" as a concept; the code field remains `status`).

**Rationale**: The type already exists; widening it is a minimal, non-breaking change. `RoomSnapshot` already serialises `status` to the client, so the polling loop receives phase information with zero new endpoint surface.

**Alternatives considered**:
- Separate boolean `gameStarted` flag — less extensible; two fields can diverge.
- New `phase` field alongside `status` — redundant; creates confusion.

---

## Decision 3: Auto-Polling in the Lobby

**Decision**: `useEffect` with `setInterval` at 2 000 ms in `LobbyPage`. Clear the interval on component unmount. Retry silently on transient failures; surface an error message only after 3 consecutive failures.

**Rationale**: Standard React pattern — no new library needed, consistent with constitution Principle IV (follow existing hooks patterns). The existing `roomStore.fetchRoom()` method is already correct; only the call site changes from manual button click to interval.

**Alternatives considered**:
- New dedicated polling hook — unnecessary abstraction for a single consumer.
- Polling inside the store — couples transport timing to state management; harder to test.

---

## Decision 4: Game-Start Endpoint

**Decision**: Add `POST /rooms/:code/start` on the backend. Validates that the caller is the host (`participantId` in request body matches the host participant) and that ≥ 2 players are present. On success, sets `room.status = "in-game"` and returns the updated `RoomSnapshot`.

**Rationale**: Keeps mutation server-side (single source of truth). Clients detect the phase change on the next lobby poll automatically (FR-011/clarification Q1 answer).

**Alternatives considered**:
- Client-only navigation — would leave server state as `"lobby"` forever; non-host polling clients would never see the transition.
- Reusing `PATCH /rooms/:code` — a generic patch endpoint is broader than needed and harder to validate.

---

## Decision 5: Player Name Validation

**Decision**: Update Zod schemas to require `playerName`, `.trim()` it, and enforce `.min(1)`. Return HTTP 400 with a descriptive message on failure.

**Rationale**: The current schema marks `playerName` as `optional()` with no length check, meaning the backend accepts empty or whitespace-only names today. FR-004 / FR-012 require trimming and rejection.

**Existing code affected**: `backend/src/api/schemas.ts` — `createRoomSchema` and `joinRoomSchema`.

---

## Decision 6: Room Code Case Normalisation

**Decision**: The room code is already normalised to uppercase in `JoinRoomPage` (auto-uppercase on input). Confirm the backend route handler also normalises the `:code` param (uppercase before store lookup) to satisfy FR-013.

**Finding**: The explore agent confirmed the route accepts the code as-is from the URL param. The frontend uppercases before sending, providing partial protection. To be safe and fully honour FR-013, the backend route handler for `POST /rooms/:code/join` and `GET /rooms/:code` MUST also `.toUpperCase()` the `code` param before calling `roomStore`.

---

## Existing Assets to Reuse (No Rewrite Needed)

| Asset | Location | Reuse |
|-------|----------|-------|
| `rooms` Map | `backend/src/services/roomStore.ts` | Keep as-is |
| `createRoom`, `joinRoom`, `getRoom`, `saveRoom` | same file | Extend, do not replace |
| `toRoomSnapshot` | same file | Extend to include `isHost` |
| `api.fetchRoom()` | `frontend/src/services/api.ts` | Reuse unchanged |
| `roomStore.fetchRoom()` | `frontend/src/state/roomStore.ts` | Reuse; add `startGame` action |
| `LobbyPage` layout/UI | `frontend/src/pages/LobbyPage.tsx` | Extend polling + host controls |
| Zod schemas | `backend/src/api/schemas.ts` | Tighten existing schemas |
