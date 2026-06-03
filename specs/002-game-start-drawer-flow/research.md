# Research: Game Start & Drawer Flow

**Feature**: `002-game-start-drawer-flow`
**Date**: 2026-06-01

---

## Decision 1: Where to store round state (drawer + word)

**Decision**: Extend the existing `Room` model with two optional fields — `drawerId: string | undefined` and `currentWord: string | undefined` — set when `status` transitions to `"in-game"`.

**Rationale**: The `Room` is the single in-memory entity already managed by `roomStore.ts`. A separate `GameRound` object would require a new data structure and a join at every read. Extending `Room` is minimal, consistent with Principle I (no rewrites), and directly mirrors how `status` was added in Scenario 1.

**Alternatives considered**:
- Separate `GameRound` map keyed by room code — rejected; adds complexity for no benefit in a single-round scope.
- Storing word index instead of the word string — rejected; requires a lookup on every snapshot; storing the string is simpler and avoids index-out-of-bounds risk.

---

## Decision 2: Server-side word filtering in `toRoomSnapshot`

**Decision**: `toRoomSnapshot(room, viewerParticipantId?)` already has the viewer parameter (currently ignored with `void`). We will use it: if `viewerParticipantId === room.drawerId`, include `currentWord` in the snapshot; otherwise include `wordLength = room.currentWord?.length` instead.

**Rationale**: `toRoomSnapshot` is called at every read path (`GET /rooms/:code`, `POST /rooms/:code/join`, `POST /rooms/:code/start`). Centralising filtering here means the word never leaks, regardless of which endpoint is called. This satisfies FR-006 and the clarified Q1 answer.

**Alternatives considered**:
- Client-side filtering (send word to all, UI hides it) — rejected per clarification Q1; word would be visible in network traffic.
- A separate `/rooms/:code/game` endpoint — rejected; unnecessary duplication of the existing fetch path.

---

## Decision 3: Drawer assignment — host is always drawer for round 1

**Decision**: On `startGame()`, set `room.drawerId = host.id` where `host` is the participant with `isHost === true`. No random selection, no rotation.

**Rationale**: The spec (FR-002, FR-003) requires deterministic assignment. The host is already known at game-start time (validated by the existing host check). This is the simplest deterministic rule and matches player expectations (host controls the session).

**Alternatives considered**:
- First participant by `joinedAt` — equivalent in practice since the host always joins first, but less semantically clear.
- Random drawer — explicitly rejected by FR-003.

---

## Decision 4: Word selection — `STARTER_WORDS[0]`

**Decision**: Always select `STARTER_WORDS[0]` ("rocket") for the first round. No index tracking needed.

**Rationale**: FR-005 specifies the first word in the starter list. The list has 5 words; index 0 is unambiguous. Multi-round word rotation is out of scope (constitution Scope Constraints). Hardcoding index 0 is safe and testable.

**Alternatives considered**:
- Store a `wordIndex` on `Room` for future rotation — rejected; premature for a single-round scope. Can be added in a future feature.

---

## Decision 5: Empty word list guard

**Decision**: In `startGame()`, check `STARTER_WORDS.length === 0` before assigning a word. If true, throw a 500-level `HttpError` with a clear message. Guard is a compile-time near-impossibility (the seed array is typed), but the runtime check satisfies FR-010.

**Rationale**: Spec FR-010 requires a safe error state, not a crash. The guard is one line and makes the behaviour explicitly testable.

---

## Gaps and Assumptions from Codebase Discovery

1. `toRoomSnapshot` already accepts `viewerParticipantId` but ignores it — this is the exact hook we need; no new function signature required.
2. `POST /rooms/:code/start` currently calls `toRoomSnapshot(room)` without passing `participantId` — we need to pass `participantId` so the host/drawer sees the word immediately on game start.
3. `RoomSnapshot.availableWords` and `RoomSnapshot.roles` are sent to all clients today — these generic fields remain for compatibility but are supplemented by the new `drawerId`, `currentWord`, and `wordLength` fields.
4. `GamePage.tsx` is a layout placeholder — all game-state rendering (drawer badge, word display) will be added to this file.
5. The frontend polling path (`fetchRoom` → `GET /rooms/:code?participantId=xxx`) already passes `participantId` in the query, so the filtered snapshot will reach each client automatically on every poll tick.
