# Implementation Plan: Room Setup & Lobby

**Branch**: `scribble-lab` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-room-setup-lobby/spec.md`

## Summary

Extend the existing Scribble starter to satisfy Scenario 1: host tracking on room creation, strict player-name validation, automatic lobby polling (~2 s), and host-only game-start with a 2-player minimum. All changes build on existing files — no new dependencies, no rewrites.

## Technical Context

**Language/Version**: TypeScript — Node 18+ with tsx (backend); React 18 + Vite (frontend)

**Primary Dependencies**: Express + Zod (backend); React Router v6, useSyncExternalStore (frontend) — all pre-installed in the starter; no new packages.

**Storage**: In-memory `Map<string, Room>` in `backend/src/services/roomStore.ts` — unchanged.

**Testing**: Existing test files (`roomStore.test.ts`, `schemas.test.ts`) — extend to cover new validation and `startGame`.

**Target Platform**: Local browser — backend on `localhost:3005`, frontend on `localhost:5173`.

**Project Type**: Brownfield web-app enhancement (REST backend + React frontend).

**Performance Goals**: Lobby poll visible within 2 s; room create/join under 5 s (SC-001, SC-002, SC-003).

**Constraints**: No WebSockets, no database, no new state-management libraries (Constitution II, III, IV).

**Scale/Scope**: Small in-memory session; a handful of concurrent rooms per local test run.

## Constitution Check

*GATE: Must pass before implementation. Re-checked post-design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Incremental Brownfield | All changes extend existing files; no rewrites | ✅ PASS |
| II. HTTP Polling Only | Lobby uses `setInterval` + REST fetch; no WebSockets | ✅ PASS |
| III. In-Memory State Only | Existing `rooms` Map unchanged; no DB introduced | ✅ PASS |
| IV. TypeScript-First | All new code fully typed; Zod schemas updated; no `any` | ✅ PASS |
| V. Spec-Driven | Every step traces to a FR or clarification answer | ✅ PASS |

No violations — Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/001-room-setup-lobby/
├── plan.md              ← this file
├── spec.md              ← feature specification
├── research.md          ← decisions and rationale (Phase 0)
├── data-model.md        ← updated type shapes (Phase 1)
├── contracts/
│   └── rooms-api.md     ← endpoint contracts (Phase 1)
└── checklists/
    └── requirements.md  ← quality checklist
```

### Source Files to Modify

```text
backend/src/
├── models/
│   └── game.ts                  ← add isHost to Participant; widen RoomStatus
├── services/
│   └── roomStore.ts             ← set isHost on create/join; add startGame()
├── api/
│   ├── schemas.ts               ← tighten playerName; add startGameSchema
│   └── rooms.ts                 ← uppercase code params; add POST /rooms/:code/start

frontend/src/
├── services/
│   └── api.ts                   ← update types; add startGame()
├── state/
│   └── roomStore.ts             ← add startGame() action
└── pages/
    └── LobbyPage.tsx            ← auto-polling; host badge; host-only start; phase nav
```

**Structure Decision**: Web-application layout (Option 2). `backend/` and `frontend/` directories match the existing starter structure exactly.

## Implementation Sequence

### Step 1 — Backend: Widen Types (`backend/src/models/game.ts`)

- Add `isHost: boolean` to `Participant` interface.
- Widen `RoomStatus` to `"lobby" | "in-game"`.

### Step 2 — Backend: Update Store (`backend/src/services/roomStore.ts`)

- `createRoom(playerName)`:
  - Trim `playerName`; throw if empty after trim.
  - Set `isHost: true` on the first (and only) participant.
- `joinRoom(code, playerName)`:
  - Trim `playerName`; throw if empty after trim.
  - Set `isHost: false` on the joining participant.
- `toRoomSnapshot`: no change required — `isHost` is on `Participant` and is already serialised.
- Add `startGame(code: string, participantId: string): Room`:
  - Fetch room; throw 404-style error if missing.
  - Find participant by `participantId`; throw 403-style error if not host.
  - Throw 422-style error if `participants.length < 2`.
  - Throw 409-style error if `status` is already `"in-game"`.
  - Set `room.status = "in-game"`, call `saveRoom(room)`, return updated room.

### Step 3 — Backend: Update Schemas (`backend/src/api/schemas.ts`)

- `createRoomSchema`: `playerName` from `z.string().optional()` → `z.string().trim().min(1, "Player name is required")`.
- `joinRoomSchema`: same change.
- Add `startGameSchema`: `z.object({ participantId: z.string().min(1) })`.

### Step 4 — Backend: Update Routes (`backend/src/api/rooms.ts`)

- In `POST /rooms/:code/join` and `GET /rooms/:code` handlers: apply `.toUpperCase()` to `req.params.code` before store lookup (completes FR-013).
- Add `POST /rooms/:code/start` handler:
  - Parse body with `startGameSchema`.
  - Call `roomStore.startGame(code.toUpperCase(), participantId)`.
  - Catch typed errors and map to 403 / 404 / 409 / 422 HTTP responses.
  - Return `{ room: toRoomSnapshot(updatedRoom) }` with status 200.

### Step 5 — Frontend: Update Types & API Client (`frontend/src/services/api.ts`)

- Add `isHost: boolean` to `Participant` interface.
- Widen `RoomSnapshot` status type to `"lobby" | "in-game"`.
- Add `startGame(code: string, participantId: string): Promise<{ room: RoomSnapshot }>` — `POST /rooms/:code/start`.

### Step 6 — Frontend: Update Store (`frontend/src/state/roomStore.ts`)

- Add `startGame()` action:
  - Reads `room.code` and `participantId` from current state.
  - Calls `api.startGame(code, participantId)`.
  - Updates via `setRoomSnapshot`.
  - Wrapped with `withLoading` for consistent error/loading handling.

### Step 7 — Frontend: Extend LobbyPage (`frontend/src/pages/LobbyPage.tsx`)

**Auto-polling** (replaces manual refresh button):
- `useEffect` sets up `setInterval(poll, 2000)`; returns `clearInterval` for cleanup.
- `poll` calls `roomStore.fetchRoom()`.
- Track consecutive failure count with `useRef<number>`; only show error after 3 consecutive failures (clears on next success).

**Phase-change navigation**:
- Separate `useEffect` watching `room?.status`: when `status === "in-game"`, call `navigate("/game")`.

**Host identification in participant list**:
- Derive `currentParticipant` from `participantId` + `room.participants`.
- `isCurrentPlayerHost = currentParticipant?.isHost ?? false`.
- Show a "Host" badge next to the host's name in the participant list.

**Start Game control**:
- Render button only when `isCurrentPlayerHost === true`.
- Disable with tooltip/message "Need at least 2 players" when `room.participants.length < 2`.
- On click: call `roomStore.startGame()`; navigation to `/game` handled by the phase-change effect.

## Data Flow

```
[Lobby mounts]
      │
      ├─► setInterval(2 000 ms)
      │         │
      │         └─► GET /rooms/:code ──► roomStore.setRoomSnapshot()
      │                                        │
      │                             room.status === "in-game"?
      │                                        │ yes
      │                             navigate("/game")   (all clients)
      │
[Host clicks Start Game]
      │
      └─► POST /rooms/:code/start ──► roomStore.startGame()
                │                           │
                │                   setRoomSnapshot(status:"in-game")
                │                           │
                └──────────────── phase-change effect fires → navigate("/game")
```

## Testing Strategy

Validate each user story independently using two or more browser tabs:

| Story | Manual validation |
|-------|-------------------|
| US1 — Create + host | One tab: create room → lobby shows "Host" badge on creator's name |
| US2 — Join + validation | Second tab: join with valid code → appears in first tab's list within ~2 s; try empty name, empty code, wrong code → each shows correct error |
| US3 — Auto-polling | Third tab joins → other tabs update within ~2 s without any button press |
| US4 — Host starts game | With 1 player: Start Game disabled; with 2+ players: Start Game enabled; host clicks → all tabs navigate to /game |

Run builds before raising PR:

```bash
cd backend && npm run build
cd frontend && npm run build
```
