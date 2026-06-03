# Research: Result, Restart & Final Validation

**Feature**: `004-result-restart`
**Date**: 2026-06-03

---

## Decision 1: New `"round-over"` status rather than reusing `"in-game"`

**Decision**: Extend `RoomStatus` to `"lobby" | "in-game" | "round-over"`. When all
non-drawer participants have submitted at least one correct guess, `room.status`
transitions from `"in-game"` to `"round-over"`.

**Rationale**: A distinct status is the cleanest signal for all clients. Frontend
can switch on `status` to decide which view to render — no ambiguous in-game state
where the round might or might not be over. `toRoomSnapshot()` can use this status
to reveal the word to all. The existing `"lobby"` → `"in-game"` pattern is followed
exactly.

**Alternatives considered**:
- Boolean flag `roundOver: boolean` on `Room` — rejected; status already conveys
  lifecycle state; adding a parallel flag duplicates information.
- Keep `"in-game"` and use a separate `roundOverAt` timestamp — rejected; adds
  complexity for no benefit; clients would need to check two fields.

---

## Decision 2: Round-over trigger — all non-drawer participants have ≥1 correct guess

**Decision**: After each `submitGuess()` call, check whether every non-drawer
participant appears in `room.guesses` filtered by `isCorrect === true`. If all do,
transition to `"round-over"`.

**Rationale**: This is the only completion condition allowed by the constitution (no
timer). The check is O(n) where n = participants, which is negligible. It runs inline
in `submitGuess()` — no polling, no background job, no push.

**Alternatives considered**:
- Checking on every GET poll — rejected; the transition should fire as soon as the
  winning guess is submitted, not on the next poll. Firing in `submitGuess` gives the
  caller an immediate `"round-over"` snapshot.

---

## Decision 3: Prevent duplicate scoring — reject guess if already correct

**Decision**: In `submitGuess()`, before processing, check whether the submitting
participant already has a correct guess in `room.guesses`. If yes, throw 409
`"You have already guessed the word correctly"`.

**Rationale**: Spec FR-011 and the assumption section both require this. It also
makes the round-over check deterministic — a participant is "done" after their first
correct guess; no double-counting. Simple set membership check on existing guesses.

**Alternatives considered**:
- Allow multiple correct guesses, cap scoring — rejected; adds complex scoring logic.
- Silently ignore duplicate correct guesses — rejected; user gets no feedback and
  the spec explicitly says to reject with an error.

---

## Decision 4: Word revealed to all in `"round-over"` via snapshot filter

**Decision**: In `toRoomSnapshot()`, when `room.status === "round-over"`, set
`snapshot.currentWord = room.currentWord` for all viewers (no viewer filter).

**Rationale**: The round is over — there is no fairness reason to hide the word.
Same pattern used throughout the codebase: snapshot filter is the single place to
control what each viewer sees.

**Alternatives considered**:
- Add a separate `revealedWord` field — rejected; redundant with `currentWord`.

---

## Decision 5: Restart as `POST /rooms/:code/restart`, host-only, round-over only

**Decision**: New endpoint that validates caller is host (403 otherwise) and room is
`"round-over"` (409 otherwise). Resets: `status = "lobby"`, clears `drawerId`,
`currentWord`, `strokes`, `guesses`; zeros all `participant.score`. Participants list
preserved. Returns updated `RoomSnapshot`.

**Rationale**: Consistent with `POST /rooms/:code/start` pattern. A dedicated
endpoint is semantically clear. Returning the full snapshot lets the client
immediately reflect the new lobby state.

---

## Decision 6: Post-restart navigation via status polling in `GamePage`

**Decision**: Add a `useEffect` in `GamePage` that navigates to `/lobby` when
`room.status === "lobby"`. The existing 2s polling loop will pick up the restart
and all clients redirect automatically — no extra mechanism needed. Mirror of
how `LobbyPage` navigates to `/game` when status becomes `"in-game"`.

---

## Gaps from Codebase Discovery

1. `submitGuess()` currently allows unlimited guesses including multiple correct ones
   from the same participant — needs the already-correct guard and round-over check.
2. `toRoomSnapshot()` gates word reveal on `status === "in-game"` only — needs
   extending to `"round-over"`.
3. No `restartGame()` function or `POST /rooms/:code/restart` route exists.
4. `GamePage` has no navigation trigger for `status === "lobby"` — must be added.
5. `"round-over"` status does not exist in either backend or frontend type definitions.
