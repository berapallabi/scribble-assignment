# Feature Specification: Result, Restart & Final Validation

**Feature Branch**: `005-result-restart`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Result, Restart & Final Validation — Given a round has ended, When the result state is displayed and the host restarts, Then all players see the correct word, final scores, and full guess history; on restart, everyone returns to the lobby with players preserved and all round state cleared."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Round Result Display (Priority: P1)

When a round ends (either by all-correct or timeout), all participants immediately see
a result screen showing the correct word, the final scores for that session, and the
full ordered guess history for the completed round. This result screen appears
automatically — no action is required from any player to see it.

**Why this priority**: Players need to see the outcome of the round before the game
moves on. Without a result moment, the word reveal and score confirmation never
happen, making the game feel abrupt and incomplete. This is the first thing players
see when a round ends.

**Independent Test**: Complete a round with two guessers (one correct, one not) → all
browser tabs automatically switch to a result view showing the word (e.g. "rocket"),
the final scores for all players, and the ordered list of guesses showing which were
correct and which were not.

**Acceptance Scenarios**:

1. **Given** a round has just ended (all-correct or timeout), **When** any participant's
   screen updates, **Then** a result view is displayed showing the secret word that was
   being drawn.

2. **Given** the result view is displayed, **When** any participant views it, **Then**
   the current accumulated scores for all players are visible.

3. **Given** the result view is displayed, **When** any participant views it, **Then**
   the full guess history for the completed round is visible in submission order,
   clearly indicating which guesses were correct and which were incorrect.

4. **Given** a round ended due to timeout with no correct guesses, **When** any
   participant views the result, **Then** the word is still revealed and the guess
   history shows all incorrect submissions (or "No guesses" if none were made).

---

### User Story 2 — Host-Triggered Restart (Priority: P2)

After the game ends (all rounds complete), the host can trigger a restart. On restart,
all players are returned to the lobby screen. Their names are preserved — they do not
need to re-enter their names or re-join. All scores, round data, and canvas content
are cleared in preparation for a fresh game.

**Why this priority**: Without a restart path, the game is a dead end after one full
session. The host restart is the natural continuation mechanic for repeated play.
Independently testable once the game-over state is reachable.

**Independent Test**: Complete a full game (all rounds) → game-over screen appears →
host clicks "Play Again" → all browser tabs return to the lobby screen with all player
names still listed, host badge intact, and scores reset to zero.

**Acceptance Scenarios**:

1. **Given** the game is in game-over state, **When** the host clicks the "Play Again"
   (or equivalent restart) button, **Then** all participants are returned to the lobby
   screen within the next polling cycle.

2. **Given** a restart has been triggered, **When** the lobby screen loads, **Then**
   all participants who were in the game are still present with their names and host
   status intact.

3. **Given** a restart has been triggered, **When** any participant views the lobby,
   **Then** all scores are reset to zero, the canvas is cleared, the guess history is
   empty, and no drawer or word is assigned.

4. **Given** a non-host participant views the game-over screen, **When** they look for
   a restart option, **Then** no restart button is available to them — only the host
   can trigger a restart.

---

### User Story 3 — Final Validation (Priority: P3)

The complete end-to-end game flow — from lobby through all rounds to game-over and
restart — works correctly with no regressions: scores accumulate accurately, round
transitions happen reliably, and the restart leaves the room in a clean state ready
for a new game.

**Why this priority**: A full end-to-end validation pass gives confidence that the
integration of all features (001–005) works together. This is independently verifiable
by playing through a full session and checking each milestone.

**Independent Test**: Play a complete 3-player session from lobby to game-over and
restart — verify scores, word reveals, history, and lobby restoration all behave
correctly at each stage without manual intervention.

**Acceptance Scenarios**:

1. **Given** a full game session (all rounds played), **When** a participant traces
   the score history, **Then** total scores match the sum of per-round correct guesses
   (100 pts each).

2. **Given** a completed and restarted game, **When** the host starts a new game,
   **Then** the game proceeds correctly from round 1 with scores at 0 and a clean
   canvas.

3. **Given** any state during or after a game, **When** a participant tries to submit
   a guess to a round that has already ended, **Then** the submission is rejected with
   a clear message.

---

### Edge Cases

- What if the host leaves before clicking restart? Other players remain on the
  game-over screen. Restart by a non-host is not permitted. (Host-leave handling
  is out of scope; the room persists until the server restarts.)
- What if a participant closes their tab during the result screen? They will miss the
  result but can re-navigate to the lobby if the room still exists.
- What if no guesses were made in a round? The result screen shows an empty guess
  history and the word reveal.
- What if a participant tries to guess after the round has ended? The server rejects
  the guess with a clear error message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a round ends, the system MUST display the secret word to all
  participants.
- **FR-002**: The result display MUST include the accumulated scores for all
  participants.
- **FR-003**: The result display MUST show the complete ordered guess history for the
  completed round, including each guesser's name, submitted text, and whether it was
  correct.
- **FR-004**: The result display MUST appear automatically without any participant
  action.
- **FR-005**: Only the host MUST be able to trigger a game restart from the game-over
  screen.
- **FR-006**: On restart, the system MUST transition all participants to the lobby
  screen within the next polling cycle.
- **FR-007**: On restart, all participant names and host status MUST be preserved.
- **FR-008**: On restart, the system MUST reset all scores to zero, clear the canvas,
  empty the guess history, and remove the drawer and word assignments.
- **FR-009**: The system MUST reject guess submissions for a round that has already
  ended and return a clear error message.
- **FR-010**: The result display MUST be visible to all participants simultaneously via
  polling — no participant should see a stale in-game view after a round has ended.

### Key Entities

- **Result State**: The post-round display state. Contains: revealed word, all
  participant scores, ordered guess history for the completed round.
- **Restart Action**: A host-only action that transitions the room back to lobby
  status and clears all game data while preserving participant list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The result view (with word reveal, scores, and guess history) is visible
  to all participants within one polling cycle (~2 s) of a round ending.
- **SC-002**: 100% of game-over-to-restart transitions correctly preserve all
  participant names and reset all game state.
- **SC-003**: After a restart, all scores are 0 for 100% of participants with no
  residual data from the previous game.
- **SC-004**: 100% of guess submissions made after a round has ended are rejected with
  an error message.
- **SC-005**: A full 3-player game session (lobby → all rounds → game-over → restart →
  lobby) completes without requiring any manual page refresh.

## Assumptions

- The result display reuses the existing game-over screen from Feature 004, which
  already shows final scores; this feature extends it to also show the word reveal
  and full guess history.
- "Round has ended" maps to the existing `"game-over"` status from Feature 004
  (after all rounds) or the between-round transition moment. For mid-game round
  transitions, the word reveal happens briefly before the next round starts. Only
  the final game-over screen has a persistent result view; mid-round results are
  visible in the guess history panel during play.
- The restart action creates a new `"lobby"` state on the existing room record —
  it does not create a new room or new room code.
- Scores are reset to zero on restart; the previous game's scores are not retained
  or displayed after restart.
- A non-host participant on the game-over screen sees the result and an "Exit" button
  but no "Play Again" button.
- The host's "Play Again" action is available only when `status === "game-over"`.
- The game-over screen from Feature 004 is the result screen for this feature —
  it will be enhanced with the word reveal and guess history.

## Out of Scope

- Per-round result screens between rounds (mid-game word reveals between rounds 1
  and 2, etc.) — the reveal happens passively via the result panel already visible
  during play.
- Saving or displaying historical game results across sessions.
- Score persistence after restart.
- Kick / remove player functionality during restart.
- Host transfer if the host is absent.
- Animated or delayed word reveal transitions.
