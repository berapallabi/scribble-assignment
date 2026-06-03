# Feature Specification: Result, Restart & Final Validation

**Feature Branch**: `006-result-restart`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Result, Restart & Final Validation — Given a round has ended, When the result state is displayed and the host restarts, Then all players see the correct word, final scores, and full guess history; on restart, everyone returns to the lobby with players preserved and all round state cleared."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Round Result Display (Priority: P1)

When every guesser has submitted a correct answer, the round ends. All participants
immediately see a result screen showing the secret word that was being drawn, the final
scores for all players, and the complete ordered guess history for the round. No player
action is needed to trigger the result screen — it appears automatically once the last
correct guess is detected.

**Why this priority**: Players need to see what the word was and how they scored before
anything else can happen. Without a result moment the round ends invisibly, making the
game feel broken. This is the highest-value story and must work before restart is useful.

**Independent Test**: Play a round with two guessers — both submit the correct word →
all browser tabs automatically switch to the result view showing the word (e.g.
"rocket"), all player scores, and the ordered guess history with correct/incorrect
indicators.

**Acceptance Scenarios**:

1. **Given** all non-drawer participants have submitted a correct guess, **When** any
   participant's screen next updates, **Then** a result view is displayed showing the
   secret word that was being drawn.

2. **Given** the result view is displayed, **When** any participant views it, **Then**
   the accumulated scores for all players are clearly visible.

3. **Given** the result view is displayed, **When** any participant views it, **Then**
   the full ordered guess history for the completed round is shown, with each entry
   indicating the guesser's name, the text they submitted, and whether it was correct
   or incorrect.

4. **Given** a round ended with some incorrect guesses before the final correct one,
   **When** participants view the result, **Then** all guesses (correct and incorrect)
   appear in submission order.

---

### User Story 2 — Host-Triggered Restart (Priority: P2)

After the result is displayed, the host can trigger a restart. On restart, all players
return to the lobby screen automatically — they do not need to rejoin or re-enter their
names. All round data (canvas, guesses, word, drawer assignment) is cleared. Scores
are reset to zero so the next game starts fresh.

**Why this priority**: Without a restart path the game is a dead end after one round.
The host restart is the natural continuation mechanic. Independently testable once
US1 works.

**Independent Test**: Result screen visible → host clicks "Play Again" → all browser
tabs return to the lobby with all player names intact, host badge preserved, and scores
showing zero.

**Acceptance Scenarios**:

1. **Given** the result screen is shown, **When** the host clicks the restart button,
   **Then** all participants are navigated to the lobby screen within the next polling
   cycle.

2. **Given** a restart has just occurred, **When** the lobby loads, **Then** all
   participants who were in the game are present with their names and host status
   unchanged.

3. **Given** a restart has just occurred, **When** any participant views the lobby,
   **Then** all scores are zero, there is no active drawer, no secret word is assigned,
   and the canvas history is gone.

4. **Given** a non-host participant views the result screen, **When** they look for a
   restart option, **Then** no restart button is available to them — only the host may
   initiate a restart.

---

### User Story 3 — Final Validation (Priority: P3)

A complete end-to-end game session — from lobby, through active gameplay, to the
result screen and back to the lobby via restart — works correctly with no regressions:
scores reflect actual correct guesses, the word is correctly revealed, and the restart
leaves the room in a clean playable state.

**Why this priority**: Validates the integration of all features built so far. No new
logic is introduced; this story is a completeness and correctness check.

**Independent Test**: Full session from lobby → two guessers play → result shown →
host restarts → lobby reloaded with same players at zero scores → start a second game
successfully.

**Acceptance Scenarios**:

1. **Given** a completed round where one guesser scored 100 and one scored 0, **When**
   the result screen is shown, **Then** the scores match the actual guess outcomes.

2. **Given** the game has been restarted and a second game begins, **When** participants
   play normally, **Then** the second game behaves identically to the first — clean
   canvas, correct word assignment, working guessing.

3. **Given** any state during an active round, **When** a participant submits a guess
   after the round has already ended, **Then** the submission is rejected with a clear
   error message.

---

### Edge Cases

- What if no guesser submits a correct answer? Without a timer the round continues
  indefinitely — there is no timeout in scope. The host cannot force-end a round; the
  round only ends when all guessers have guessed correctly.
- What if only one guesser is present? The round ends as soon as that one guesser
  guesses correctly.
- What if the host closes their tab during the result screen? Other players see the
  result but the restart button is unavailable. The room persists until the server
  restarts.
- What if a participant tries to guess after the round has ended? The submission is
  rejected server-side with an error message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST transition all participants to a result view when all
  non-drawer participants have submitted at least one correct guess.
- **FR-002**: The result view MUST display the secret word to all participants
  (including those who did not guess it correctly).
- **FR-003**: The result view MUST display the accumulated scores for all participants.
- **FR-004**: The result view MUST display the complete ordered guess history for the
  round, including each guesser's name, submitted text, and correct/incorrect status.
- **FR-005**: The result view MUST appear automatically via polling — no participant
  action is required.
- **FR-006**: Only the host MUST have access to a restart button on the result screen.
- **FR-007**: When the host triggers a restart, the system MUST transition all
  participants to the lobby within the next polling cycle.
- **FR-008**: On restart, all participant names and host status MUST be preserved.
- **FR-009**: On restart, the system MUST clear all round state: canvas strokes, guess
  history, secret word, and drawer assignment.
- **FR-010**: On restart, all participant scores MUST be reset to zero.
- **FR-011**: The system MUST reject guess submissions made after a round has ended
  and return a clear error message.

### Key Entities

- **Result State**: The post-round display. Contains: revealed secret word, all
  participant scores, complete ordered guess history for the round.
- **Restart Action**: A host-only operation that transitions the room from the result
  state back to lobby, preserving participants and resetting all game data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The result view is visible to all participants within one polling cycle
  (~2 s) of the final correct guess being submitted.
- **SC-002**: 100% of restarts correctly preserve participant names and host status
  with no data loss.
- **SC-003**: After every restart, all participant scores are zero in 100% of sessions.
- **SC-004**: 100% of guess submissions made after round end are rejected with an
  error message visible to the submitter.
- **SC-005**: A complete session (lobby → round → result → restart → lobby → second
  round start) completes without any manual page refresh.

## Assumptions

- The round ends **only** when all non-drawer participants have submitted a correct
  guess. There is no timer and no host force-end. A round can last indefinitely.
- The result state reuses the existing `"game-over"` room status introduced in the
  current codebase — no new status value is needed.

  **Wait** — looking at the current codebase post-reset: the codebase is at Scenario 3
  and does NOT have a `"game-over"` status. This feature will introduce the result/end
  state. The room transitions from `"in-game"` to a new `"round-over"` status when all
  guessers have guessed correctly.

- The result screen is a dedicated view — not an overlay on the existing game screen.
- The restart action reuses the same room code; no new room is created.
- Scores are reset to zero on restart; historical scores from the completed round are
  not preserved after restart.
- The drawer cannot submit guesses (established in Scenario 3) and is not counted
  in the "all guessers guessed" check.
- A guesser who has already submitted a correct guess cannot submit another guess in
  the same round (preventing duplicate scoring). If they try, the submission is
  rejected.

## Out of Scope

- Multiple rounds or drawer rotation — only one round per game session.
- Per-player "play again" option — only the host may restart.
- Saving or displaying historical game results across sessions.
- Score preservation across restarts.
- Animated transitions or delayed word reveals.
- Any timer or countdown mechanic.
