# Implementation Plan: Game Start & Drawer Flow

**Branch**: `scribble-lab` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-game-start-drawer-flow/spec.md`

---

## Summary

When the host starts the game, the backend assigns the host as drawer, selects the
first starter word, and returns a viewer-aware `RoomSnapshot` — the drawer receives
`currentWord`, guessers receive `wordLength`. The `GamePage` is updated from a
placeholder to a functional round-1 layout: drawer sees the word, guessers see
underscores, and all participants see role labels.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 backend, React 18 frontend)

**Primary Dependencies**: Express + Zod (backend); React + Vite + React Router (frontend) — all from starter, no new packages

**Storage**: In-memory `Map<string, Room>` in `roomStore.ts` — no database

**Testing**: Vitest (backend `schemas.test.ts`, `roomStore.test.ts`; frontend `api.test.ts`) — existing test harness

**Target Platform**: Local dev server (backend :3005, frontend :5173)

**Performance Goals**: Game screen populated within 2 s of navigation (SC-005); all clients reach game screen within 3 s of host action (SC-001 via existing ~2 s polling)

**Constraints**: HTTP polling only; no WebSockets; in-memory only; no new npm packages; word filter MUST be server-side

**Scale/Scope**: Single room, single round, 2–N players

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Incremental Brownfield Enhancement | ✅ Pass | Extends `Room` model and `toRoomSnapshot`; no rewrites |
| II. HTTP Polling Only | ✅ Pass | Reuses existing 2 s polling; no push mechanism added |
| III. In-Memory State Only | ✅ Pass | `drawerId` and `currentWord` added to in-memory `Room` |
| IV. TypeScript-First | ✅ Pass | All new fields typed; Zod validates existing schemas |
| V. Spec-Driven Development | ✅ Pass | Following Spec Kit loop; all tasks traceable to FRs |

No violations. No complexity justification required.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-game-start-drawer-flow/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── game-api.md      ← Phase 1 output
├── checklists/
│   └── requirements.md  ← spec quality checklist
└── tasks.md             ← Phase 2 output (not yet created)
```

### Source Code (files touched by this feature)

```text
backend/
└── src/
    ├── models/
    │   └── game.ts          ← add drawerId?, currentWord? to Room; add to RoomSnapshot
    ├── services/
    │   └── roomStore.ts     ← startGame() sets drawerId+currentWord; toRoomSnapshot filters by viewer
    └── api/
        └── rooms.ts         ← POST /rooms/:code/start passes participantId to toRoomSnapshot

frontend/
└── src/
    ├── services/
    │   └── api.ts           ← add drawerId?, currentWord?, wordLength? to RoomSnapshot
    └── pages/
        └── GamePage.tsx     ← replace placeholder with drawer/guesser layout
```

---

## Implementation Steps

### Step 1: Widen shared types (blocking — must come first)

**Backend** `backend/src/models/game.ts`:
- Add `drawerId?: string` and `currentWord?: string` to `Room` interface
- Add `drawerId?: string`, `currentWord?: string`, `wordLength?: number` to `RoomSnapshot` interface

**Frontend** `frontend/src/services/api.ts` (parallel with backend types):
- Add `drawerId?: string`, `currentWord?: string`, `wordLength?: number` to `RoomSnapshot` interface

### Step 2: Assign drawer and word on game start

**`backend/src/services/roomStore.ts`** — `startGame()`:
1. After the existing guard checks (host, ≥2 players, status), guard against empty word list: `if (STARTER_WORDS.length === 0) throw httpError(500, "No words available to start the game")`
2. Set `room.drawerId = caller.id` (caller is already verified as host)
3. Set `room.currentWord = STARTER_WORDS[0]`
4. Then set `room.status = "in-game"` (as before)

### Step 3: Filter snapshot by viewer

**`backend/src/services/roomStore.ts`** — `toRoomSnapshot(room, viewerParticipantId?)`:
- Remove `void viewerParticipantId`
- Always include `drawerId: room.drawerId` in the snapshot
- If `room.status === "in-game"`:
  - If `viewerParticipantId === room.drawerId`: add `currentWord: room.currentWord`
  - Else: add `wordLength: room.currentWord?.length`
- If `room.status === "lobby"`: neither field is included (undefined fields omitted by JSON)

### Step 4: Pass participantId to snapshot on start

**`backend/src/api/rooms.ts`** — `POST /rooms/:code/start` handler:
- Change `toRoomSnapshot(room)` → `toRoomSnapshot(room, participantId)` so the host/drawer receives `currentWord` immediately in the start response

### Step 5: Update GamePage

**`frontend/src/pages/GamePage.tsx`**:
- Derive `isDrawer = room.drawerId === participantId`
- Derive `drawerName = room.participants.find(p => p.id === room.drawerId)?.name`
- Render participant list with "Drawer" / "Guesser" labels (FR-004, FR-008)
- If `isDrawer`: render `room.currentWord` prominently (FR-006)
- If `!isDrawer`: render underscores — one `_` per letter, space-separated (FR-007)
- Keep existing Exit Game button and page header

---

## Data Flow

```
Host clicks "Start Game"
  → POST /rooms/:code/start { participantId }
  → startGame(): set drawerId = host.id, currentWord = STARTER_WORDS[0], status = "in-game"
  → toRoomSnapshot(room, participantId = host)
  → response: { room: { ..., drawerId, currentWord: "rocket" } }
  → host's GamePage: shows "rocket"

Guesser poll (every ~2 s)
  → GET /rooms/:code?participantId=guesserUuid
  → toRoomSnapshot(room, participantId = guesser)
  → response: { room: { ..., drawerId, wordLength: 6 } }
  → guesser's GamePage: shows "_ _ _ _ _ _"
```

---

## Testing Strategy

| Scenario | How to test |
|---|---|
| Drawer sees word | Start game as host → check GamePage shows "rocket" |
| Guesser sees underscores | Open second tab as guesser → check GamePage shows 6 underscores |
| Word absent from guesser network response | Browser DevTools → Network → GET /rooms/:code → confirm no `currentWord` |
| Drawer label visible to all | Both tabs show host name with "Drawer" indicator |
| Guesser label visible to all | Both tabs show non-host names with "Guesser" indicator |
| Empty word list (edge case) | Unit test: mock STARTER_WORDS as [] → startGame throws 500 |

**Build gate**: `cd backend && npm run build` and `cd frontend && npm run build` must both pass before PR.
