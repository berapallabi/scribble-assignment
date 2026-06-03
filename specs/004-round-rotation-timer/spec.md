# Feature Specification: Round Rotation & Timer

**Feature Branch**: `004-round-rotation-timer`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Round Rotation & Timer — After the active round ends (either all guessers have guessed correctly, or 60 seconds have elapsed since the round started), the game advances to the next round: the next player in join order becomes the drawer, a new word is selected from the starter list, all scores are preserved, and the canvas is cleared. The round timer is visible to all players. The game ends when all players have had a turn as drawer."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Round Completion & Transition (Priority: P1)

When a round ends — either because every guesser has submitted a correct answer or because
60 seconds have elapsed — the game automatically advances to the next round. The next player
in join order becomes the drawer, a fresh word is assigned, and the canvas is wiped clean.
Accumulated scores carry over.

**Why this priority**: Without round transitions the game has no progression. Every other
story depends on this core state machine working correctly. This is the highest-risk,
highest-value story.

**Independent Test**: Start a 3-player game. Have both guessers submit the correct word →
observe that the game advances to round 2 with the second player as drawer and a new word
assigned. Alternatively, wait 60 seconds without guessing → observe the same transition.

**Acceptance Scenarios**:

1. **Given** an active round with all guessers having submitted a correct guess, **When**
   the last correct guess is recorded, **Then** the round ends and the next player in join
   order is assigned as drawer for the next round.

2. **Given** an active round with 60 seconds elapsed since the round started, **When** the
   timer expires, **Then** the round ends regardless of how many guessers have guessed
   correctly, and the next player becomes drawer.

3. **Given** a round has just ended, **When** the new round begins, **Then** the canvas is
   cleared, a new word from the starter list is assigned to the new drawer, and all
   previously accumulated scores are preserved.

4. **Given** the word list is shorter than the number of rounds, **When** a new word is
   needed, **Then** the word list is cycled from the beginning (index 0).

---

### User Story 2 — Round Timer Display (Priority: P2)

All participants see a live countdown timer showing how many seconds remain in the current
round. The timer starts at 60 and counts down to 0. When it reaches 0, the round ends.

**Why this priority**: The timer is the secondary completion condition and a key gameplay
element. Independently testable once round transitions work — you can verify the display and
the timeout expiry separately.

**Independent Test**: Start a game and observe both browser tabs show a countdown from 60.
Wait for it to reach 0 → round transitions. Verify the timer resets to 60 at the start of
each new round.

**Acceptance Scenarios**:

1. **Given** a round has just started, **When** any participant views the game screen,
   **Then** a countdown timer showing 60 (or the elapsed seconds remaining) is visible.

2. **Given** the round timer is running, **When** participants poll for updates, **Then**
   the displayed countdown reflects the actual remaining seconds (within the polling
   interval).

3. **Given** the countdown reaches 0, **When** any participant's screen updates, **Then**
   the round has ended and the transition to the next round has occurred.

4. **Given** a new round starts, **When** any participant views the game screen, **Then**
   the timer resets to 60 for the new round.

---

### User Story 3 — Game End & Final Scores (Priority: P3)

When every participant has had exactly one turn as drawer, the game ends. All players see
the final accumulated scores. The game does not loop back to a new cycle automatically.

**Why this priority**: Game completion is independently testable once round rotation works —
simply play through all N rounds and verify the end state is reached.

**Independent Test**: Play a full game with 3 players — verify that after 3 rounds (each
player draws once), the game displays an end state with final scores for all players rather
than starting a round 4.

**Acceptance Scenarios**:

1. **Given** every participant has completed one turn as drawer, **When** the final round
   ends, **Then** the game transitions to a "game over" state and all participants see
   the final scores.

2. **Given** the game is in "game over" state, **When** a participant views the screen,
   **Then** the final cumulative scores for all players are displayed in a clear summary.

3. **Given** the game is in "game over" state, **When** a participant views the screen,
   **Then** no new round starts and no timer is running.

---

### Edge Cases

- What if there is only one non-drawer participant? The round ends as soon as that
  participant guesses correctly (all guessers done = 1 person).
- What if no guesser guesses correctly within 60 seconds? The timeout fires, the round ends,
  and the next player rotates in — no guesser receives points for that round.
- What if the drawer's turn arrives again (word list cycling)? The same word may appear
  again if the list is shorter than the number of rounds; this is accepted behaviour.
- What if a participant leaves mid-game? Out of scope — no disconnect or leave handling.
- Can the drawer also score points? No — the drawer knows the word and cannot guess.
  Drawer scoring is out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST end the current round when every non-drawer participant has
  submitted a correct guess.
- **FR-002**: The system MUST end the current round when 60 seconds have elapsed since the
  round started, regardless of guess results.
- **FR-003**: Upon round end, the system MUST assign the next participant in join order as
  the new drawer.
- **FR-004**: Upon round end, the system MUST select the next word from the starter list
  (cycling to index 0 when the list is exhausted).
- **FR-005**: Upon round end, the system MUST clear all canvas strokes.
- **FR-006**: Accumulated participant scores MUST be preserved and carried over across all
  rounds.
- **FR-007**: The system MUST display the remaining round time (in seconds) to all
  participants.
- **FR-008**: The displayed countdown MUST reflect the true remaining seconds within the
  polling interval (~2 s accuracy).
- **FR-009**: The system MUST end the game after every participant has completed exactly one
  turn as drawer.
- **FR-010**: At game end, the system MUST display the final accumulated scores to all
  participants.
- **FR-011**: The current round number MUST be visible to all participants during play.
- **FR-012**: Guesses submitted after a round has ended MUST be rejected.

### Key Entities

- **Round**: One drawing turn. Attributes: round number (1-based), drawer participant ID,
  assigned word, start timestamp, duration (60 s), end reason (`all-correct` or `timeout`),
  status (`active` / `complete`).
- **Game Progress**: Tracks how many rounds have been played and how many remain. Total
  rounds equals the number of participants at game start.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Round transitions happen within one polling cycle (~2 s) of the completion
  condition being met (all-correct or timeout).
- **SC-002**: The displayed countdown is accurate to within 2 seconds of true remaining
  time at all times during a round.
- **SC-003**: 100% of rounds transition correctly when all guessers submit correct answers.
- **SC-004**: 100% of rounds transition correctly when the 60-second timer expires.
- **SC-005**: The game ends correctly after exactly N rounds (where N = participant count)
  in 100% of sessions.
- **SC-006**: Accumulated scores are correctly preserved across all rounds with no data
  loss on transition.

## Assumptions

- The drawer rotation order is fixed at game start: participants are ordered by `joinedAt`
  timestamp ascending (the host is first, as they always join first).
- The first round's drawer is the host (established in Feature 002); subsequent rounds
  follow the same join-order rotation.
- Word selection for round N uses `STARTER_WORDS[(N-1) % STARTER_WORDS.length]` to cycle.
- The server is authoritative for timing: the server records `roundStartedAt` and computes
  elapsed time on every snapshot request. Clients display what the server reports.
- "All guessers have guessed correctly" means every non-drawer participant has at least one
  correct guess recorded in the current round.
- The guess form is disabled once a round ends; guesses submitted in the gap between
  round-end detection and the next poll are rejected server-side.
- There is no "skip round" or "pass" mechanic; every round runs to either all-correct or
  timeout.
- Scores from all rounds accumulate in a single total per participant; per-round
  breakdowns are not displayed.
- A final leaderboard / winner announcement is out of scope — only raw scores are shown.

## Out of Scope

- Per-round score breakdown or history.
- Winner announcement or podium display.
- Drawer earning points for guessers' success.
- Skipping a round or passing the drawer role.
- Mid-game player join or leave handling.
- Restarting the game from the game-over screen.
- Multiple game cycles (play again).
- Variable round durations (60 s is fixed).
