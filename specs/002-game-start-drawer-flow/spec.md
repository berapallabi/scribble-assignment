# Feature Specification: Game Start & Drawer Flow

**Feature Branch**: `002-game-start-drawer-flow`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Game Start & Drawer Flow — Given a game is starting and player names are trimmed (empty/whitespace-only rejected with a message), When the first round begins, Then the host (or first player) becomes the clearly-identified drawer, and the secret word (deterministically selected from the starter list) is visible only to the drawer."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Transition to Game Screen (Priority: P1)

When the host starts the game from the lobby (with at least 2 players present),
all participants are navigated to the game screen. The game screen shows a
meaningful in-game state rather than a blank or loading placeholder. Players
can see their role (drawer or guesser) clearly.

**Why this priority**: This is the first moment the game becomes playable. Every
subsequent feature (drawing, guessing, scoring) depends on a valid in-game state
being established. Delivering this story alone produces a working game entry
point.

**Independent Test**: Two browser tabs in a lobby — host clicks "Start Game" →
both tabs navigate to `/game` and display an in-game layout with at least the
drawer's name and the guessers' names visible.

**Acceptance Scenarios**:

1. **Given** a lobby with at least 2 participants and the host present, **When**
   the host starts the game, **Then** all participants are taken to the game
   screen within the next polling cycle (~2 s).

2. **Given** a game screen for any participant, **When** the game begins,
   **Then** the screen clearly shows which player is currently the drawer and
   which players are guessers.

3. **Given** a game has started, **When** a guesser views their game screen,
   **Then** they do NOT see the secret word — only the drawer's name and the
   drawing canvas area.

---

### User Story 2 — Drawer Assignment (Priority: P2)

At the start of the first round, the host is automatically and deterministically
assigned as the drawer. Every participant can clearly see who the drawer is. The
drawer role is never ambiguous.

**Why this priority**: Role assignment is the core mechanic of Scribble. Without
a clearly identified drawer, the game cannot proceed. This is independently
testable once Story 1 is complete.

**Independent Test**: Start a game with 3 players — verify that the host's name
appears as "Drawer" on all participants' screens, and the other two appear as
guessers.

**Acceptance Scenarios**:

1. **Given** a game has just started, **When** any participant views the game
   screen, **Then** the host is shown as the drawer with a visible "Drawer"
   label or equivalent indicator.

2. **Given** a game has just started with multiple non-host participants,
   **When** the game screen loads, **Then** all non-host participants are shown
   as guessers.

3. **Given** drawer assignment is made, **When** the same game starts under the
   same conditions, **Then** the same player (the host) is always assigned as
   drawer (deterministic, not random).

---

### User Story 3 — Secret Word Visibility (Priority: P3)

The drawer is shown the secret word on their game screen. Guessers cannot see
the secret word — they see only a hint that a word has been chosen (e.g., blank
letters or a placeholder). The word is selected deterministically from the
predefined starter word list.

**Why this priority**: Correct word visibility is critical for fair gameplay.
The drawer must know what to draw; guessers must not have an unfair advantage.
This is independently testable once the drawer is correctly identified.

**Independent Test**: Start a game — verify that the drawer's screen shows the
secret word, and every guesser's screen does not reveal the word (only a
placeholder or word-length hint).

**Acceptance Scenarios**:

1. **Given** the first round has begun, **When** the drawer views the game
   screen, **Then** the secret word is clearly displayed to them.

2. **Given** the first round has begun, **When** a guesser views the game
   screen, **Then** the secret word is NOT displayed; blank underscores matching
   the word's letter count (e.g., `_ _ _ _ _` for a 5-letter word) appear.

3. **Given** the same room code and participant order, **When** a game starts,
   **Then** the same word from the starter list is always selected (deterministic
   selection, not random).

4. **Given** the starter word list contains 5 words, **When** the first round
   starts, **Then** the first word in the list is selected as the secret word.

---

### Edge Cases

- What happens when the host leaves before starting the game? (Out of scope for
  this feature — no host-leave handling defined yet.)
- What if the word list is empty? The system must not crash; instead it must
  surface a clear error and keep the game in a safe state.
- What if a participant joins between the lobby and the game screen appearing?
  Late joiners land on the game screen and are assigned as guessers.
- What if a participant's name is empty or whitespace-only? The system rejects
  the create/join attempt before the game can start — this is inherited from the
  Room Setup & Lobby feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the host starts the game, the system MUST transition all
  participants to the in-game screen within the next polling cycle.
- **FR-002**: The system MUST assign the host as the drawer for the first round.
- **FR-003**: The drawer assignment MUST be deterministic — the same conditions
  always produce the same drawer.
- **FR-004**: The system MUST display a clear "Drawer" indicator next to the
  assigned drawer's name, visible to all participants.
- **FR-005**: The system MUST select the secret word deterministically from the
  predefined starter word list (first word in the list for the first round).
- **FR-006**: The server MUST withhold the secret word from guesser API responses
  — the word is only included in the snapshot returned to the drawer. Guessers
  must not receive the word over the network, regardless of UI behaviour.
- **FR-007**: The guesser's game screen MUST NOT reveal the secret word; blank
  underscores matching the word's letter count (e.g., `_ _ _ _ _` for a
  5-letter word) MUST be shown instead. The server MUST include the word length
  (not the word itself) in the guesser's snapshot to enable this display.
- **FR-008**: The game screen MUST show all participants, labelled as either
  "Drawer" or "Guesser".
- **FR-009**: Player names MUST be trimmed of leading/trailing whitespace;
  empty or whitespace-only names MUST be rejected with a clear error message
  before the player enters the game (inherited from Room Setup & Lobby).
- **FR-010**: If the secret word list is empty, the system MUST surface a clear
  error state rather than crashing or showing a blank word.

### Key Entities

- **Game Round**: Represents a single round of play. Attributes: current drawer
  (participant reference), secret word, round number, start time.
- **Participant Role**: Each participant in an active game has exactly one role —
  either Drawer or Guesser — for the current round.
- **Word List**: The predefined, ordered collection of secret words available for
  selection. Selection is positional (index-based), not random.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All participants reach the game screen within 3 seconds of the
  host starting the game (accounting for the polling interval).
- **SC-002**: 100% of game starts correctly identify the host as the drawer with
  no ambiguity (verifiable by checking the drawer indicator on all participants'
  screens).
- **SC-003**: The secret word is visible on the drawer's screen in 100% of game
  starts and absent from all guessers' screens in 100% of game starts.
- **SC-004**: Word selection is fully deterministic — running the same scenario
  twice always produces the same word with no variance.
- **SC-005**: The game screen is meaningfully populated (roles, names, word
  placeholder) within 2 seconds of navigation for all participants.

## Clarifications

### Session 2026-06-01

- Q: Should the server withhold the secret word from guesser API responses, or should it be sent to all clients and hidden by the UI? → A: Server withholds the word from guessers — only the drawer's snapshot includes `currentWord`.
- Q: What should guessers see in place of the secret word? → A: Underscores matching word length (e.g., `_ _ _ _ _` for "pizza"); server includes word length only in guesser snapshot.

## Assumptions

- The starter word list is a fixed, ordered list defined at deployment time;
  no dynamic word management is in scope for this feature.
- The first round always starts with the first word in the list (index 0); word
  rotation across rounds is out of scope.
- The host is always present when the game starts (the host cannot leave while
  in the lobby — enforced by the existing minimum-player check).
- Late joiners (participants who join between lobby and game start) are treated
  as guessers and see the placeholder word, not the secret word.
- The drawing canvas itself (actual Scribble drawing interaction) is out of scope
  for this feature — this feature only covers role assignment, word display, and
  the game-screen layout for round 1.
- No timer or countdown for the drawing round is in scope for this feature.
- Guessing mechanics (submitting guesses, checking correctness) are out of scope.

## Out of Scope

- Drawing canvas interaction and stroke rendering.
- Guess submission and correctness checking.
- Round progression beyond round 1 (multi-round rotation of drawers/words).
- Score tracking and leaderboard display.
- Host migration if the host disconnects.
- Word selection by the drawer (drawer is assigned a word, not given a choice).
- Timer / countdown for the drawing phase.
- Real-time communication (WebSockets, server-sent events) — polling only.
