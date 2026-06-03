# Research: Round Rotation & Timer

**Feature**: `004-round-rotation-timer`
**Date**: 2026-06-03

---

## Decision 1: Server-authoritative timer via timestamp diff

**Decision**: Store `roundStartedAt: string` (ISO timestamp) on `Room` when a round
begins. On every snapshot request, compute
`secondsRemaining = Math.max(0, 60 - Math.floor(elapsed / 1000))` where
`elapsed = Date.now() - new Date(room.roundStartedAt).getTime()`.
Include `secondsRemaining` in `RoomSnapshot`; the frontend displays it.

**Rationale**: HTTP polling only — no WebSocket push. The server is the single
source of truth for time, avoiding client clock drift. Computing on read is
zero-overhead at the scale of a single room. All clients receive the same value
from the same server clock, ensuring consistency.

**Alternatives considered**:
- Client-side countdown (server sends start time, client counts down) — rejected;
  clock drift across browser tabs produces different countdowns, breaking determinism.
- Server background job / `setInterval` to advance rounds — rejected; violates
  Principle II (no push), adds stateful background process, and introduces race
  conditions with request handlers.

---

## Decision 2: Timer expiry checked lazily on read (GET /rooms/:code)

**Decision**: The GET handler calls `advanceRoundIfNeeded(room)` before building
the snapshot. This function checks whether `secondsRemaining === 0` (or the
all-guessed condition) and — if so — mutates the stored room in-place before
returning. No background thread is needed.

**Rationale**: Lazy evaluation on read means round transitions happen the first
time any client polls after the deadline. With a 2 s polling interval, transitions
occur within 2 s of the actual deadline — satisfying SC-001. This is the simplest
possible timer implementation under the polling-only constraint.

**Alternatives considered**:
- Checking only in `submitGuess()` — rejected; timer expiry would never fire if
  no guess is submitted in the final seconds.
- A periodic server-side cron — rejected; adds stateful infrastructure, violates
  Principle III (no external stores) and II (no push).

---

## Decision 3: Drawer rotation by round number index

**Decision**: `drawerId` for round N = `room.participants[N - 1].id`.
Participants are in insertion order (join order). `roundNumber` is a 1-based
counter stored on `Room`. The first round's drawer is always `participants[0]`
(the host, who joined first). The next drawer is `participants[1]`, and so on.

**Rationale**: No separate rotation index is needed; `roundNumber - 1` is the
array index. Total rounds = `participants.length`, so the game ends naturally when
`roundNumber > participants.length`.

**Alternatives considered**:
- Random drawer selection — rejected; spec requires deterministic, ordered rotation.
- Storing a separate `drawerIndex` — rejected; redundant with `roundNumber`.

---

## Decision 4: Word cycling with modulo

**Decision**: Word for round N = `STARTER_WORDS[(N - 1) % STARTER_WORDS.length]`.
With 5 words and N players, words cycle if `N > 5`.

**Rationale**: Simple, deterministic, never throws. Matches spec assumption about
cycling.

---

## Decision 5: "All guessed" check after each submitGuess

**Decision**: After recording a guess in `submitGuess()`, call
`advanceRoundIfNeeded()` inline. The check: filter `room.guesses` for `isCorrect`,
build a `Set` of correct-guesser IDs, verify every non-drawer participant appears
in the set. If true, advance the round immediately.

**Rationale**: Trigger is synchronous and immediate — the round advances in the
same request that submitted the final correct guess. The response snapshot already
reflects the new round. No extra poll needed.

---

## Decision 6: `RoomStatus` extended with `"game-over"`

**Decision**: Add `"game-over"` to the `RoomStatus` union (`"lobby" | "in-game" | "game-over"`).
When `roundNumber > participants.length`, set `room.status = "game-over"`.
`GamePage` renders a game-over overlay when it detects this status.

**Rationale**: Reuses the existing `status` field; no new top-level flag needed.
Frontend already switches on `room.status` for lobby/in-game; adding a third
branch is minimal.

**Alternatives considered**:
- Separate `gameOver: boolean` field — rejected; duplicates information already
  in `status`; breaks the single-field status convention established in Features
  001–003.

---

## Decision 7: Guess rejection once round is not active

**Decision**: `submitGuess()` throws 409 `"Round is not active"` when
`room.status !== "in-game"` (already handled) or when the round's timer has
expired (i.e., `advanceRoundIfNeeded` has already fired). Since `advanceRound`
is called inside `submitGuess` before appending, a race where a guess arrives
just as the timer expires is resolved deterministically: timer check fires first,
round advances, then the guess is rejected as the room is now a new round or
game-over.

---

## Gaps and Assumptions from Codebase Discovery

1. `GamePage` currently hard-codes `"Round 1"` in the section kicker — this must
   use `room.roundNumber` after this feature.
2. `Scoreboard`, `ResultPanel`, and `GuessForm` already exist from Feature 003.
   Only `GamePage` layout changes are needed for the game-over state.
3. The polling interval in `GamePage` is already set up (fixed in Feature 003
   bugfix). Timer display will update automatically on each poll.
4. `startGame()` must also initialise `roundNumber = 1` and `roundStartedAt = now()`.
5. Constitution deviation: this feature introduces timers and round rotation,
   both previously listed as out of scope. See plan.md Complexity Tracking section
   for the written justification.
