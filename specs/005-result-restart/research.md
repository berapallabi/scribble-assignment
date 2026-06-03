# Research: Result, Restart & Final Validation

**Feature**: `005-result-restart`
**Date**: 2026-06-03

---

## Decision 1: Word reveal in game-over via snapshot filter change

**Decision**: In `toRoomSnapshot()`, extend the word-inclusion block to cover
`"game-over"` status in addition to `"in-game"`. When `room.status === "game-over"`,
include `currentWord` for **all** viewers (not just the drawer). No new field is needed.

**Rationale**: The game is over — there is no longer any fairness reason to hide the
word from guessers. All players should see what the word was. The snapshot already
carries `currentWord` on the `Room` object; the only change is removing the
viewer-aware filter for the game-over state.

**Alternatives considered**:
- Add a separate `revealedWord` field to `RoomSnapshot` — rejected; redundant with
  `currentWord`; adds a second field with identical semantics.
- Client-side reveal (store word in component state on round-end) — rejected;
  violates the server-as-source-of-truth principle and requires client-side bookkeeping.

---

## Decision 2: Guess history in game-over state

**Decision**: `room.guesses` is NOT cleared when `advanceRoundIfNeeded` transitions
to `"game-over"` (this is already the case — clearing only happens on mid-game round
advances). The game-over overlay reads `room.guesses` directly from the snapshot to
display the final round's guess history. No data model change is needed.

**Rationale**: The last round's guesses are already in the snapshot at game-over. The
`ResultPanel` component (Feature 003) already renders `Guess[]` with correct/incorrect
indicators — reusing it in the game-over overlay avoids duplication.

**Alternatives considered**:
- Storing a `finalRoundGuesses` snapshot separately — rejected; unnecessary copy of
  data that already exists in `room.guesses`.

---

## Decision 3: Restart as `POST /rooms/:code/restart`

**Decision**: Add a new `POST /rooms/:code/restart` endpoint. Only the host may call
it. Effect: reset `status → "lobby"`, clear `drawerId`, `currentWord`,
`roundNumber → 0`, `roundStartedAt → ""`, `strokes → []`, `guesses → []`, and reset
all `participant.score → 0`. Participants list is preserved. Response is the updated
`RoomSnapshot`.

**Rationale**: A new dedicated endpoint is cleaner than overloading an existing one.
The restart pattern (host-only, room preserved, participants preserved, game state
cleared) is a distinct operation that deserves its own route, consistent with
`POST /rooms/:code/start`.

**Alternatives considered**:
- Re-using `POST /rooms` to create a new room — rejected; room code would change,
  breaking all clients' localStorage state and requiring a new join flow.
- `DELETE /rooms/:code/game` — rejected; `DELETE` implies resource removal; a restart
  is a state reset, not a deletion.

---

## Decision 4: Post-restart navigation via status detection

**Decision**: Add a `useEffect` in `GamePage` that detects when `room.status`
transitions to `"lobby"` and navigates to `/lobby`. This is the mirror of
`LobbyPage`'s existing `useEffect` that navigates to `/game` when status becomes
`"in-game"`. No new mechanism is needed.

**Rationale**: The existing polling loop (2 s interval) in `GamePage` already calls
`store.fetchRoom()`. When the host triggers restart, the status becomes `"lobby"`.
On the next poll, all clients receive the updated snapshot, the status effect fires,
and all tabs navigate to `/lobby`. Exactly the same pattern as the lobby→game
transition.

---

## Decision 5: "Play Again" button — host only

**Decision**: Render the "Play Again" button in the game-over overlay only when
`participantId === room.participants.find(p => p.isHost)?.id`. Non-host players see
only "Exit" (which navigates to `/lobby` manually).

**Rationale**: Host-only restart is a spec requirement (FR-005). Using `isHost` on
the participant record is consistent with how host identity is already used throughout
the codebase (e.g., `startGame()` guard check).

---

## Gaps from Codebase Discovery

1. `toRoomSnapshot()` currently gates `currentWord` on `room.status === "in-game"` —
   this must be extended to also expose it (to all) when status is `"game-over"`.
2. The current game-over overlay (Feature 004) shows a sorted scores list and an
   "Exit" button but lacks the word reveal, guess history, and "Play Again" button.
3. No `restartGame` function exists in `roomStore.ts` — must be added.
4. No `POST /rooms/:code/restart` route exists in `rooms.ts` — must be added.
5. No `restartGame` schema exists in `schemas.ts` — must be added.
6. `GamePage` has no navigation trigger for `status === "lobby"` — must be added.
