# Feature Specification: Gameplay Interaction

**Feature Branch**: `003-gameplay-interaction`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Gameplay Interaction — Given a round is active with a drawer and guessers (all scores start at 0), When the drawer draws/clears the canvas and guessers submit their guesses, Then the drawing is visible on the drawer's screen; guesses are trimmed, case-insensitively compared, and empty ones rejected; the guess history is synced to all players via polling; correct guesses score 100 (incorrect add 0)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Canvas Drawing (Priority: P1)

The drawer can draw freely on the canvas and clear it at any time. Strokes appear
immediately on the drawer's own screen. All other participants can see the drawing
update on their screens via polling, giving guessers the visual information they
need to play.

**Why this priority**: Without a visible, shared drawing, the game cannot be played.
This is the core mechanic of Scribble. Canvas drawing and canvas sync together form
the single mandatory foundation — neither is useful without the other.

**Independent Test**: Open two browser tabs in an active game (one drawer, one
guesser) — drawer draws a line → line appears on the drawer's canvas immediately;
after the next poll cycle (~2 s), the same line appears on the guesser's canvas.
Drawer clicks Clear → both canvases become blank within the next poll.

**Acceptance Scenarios**:

1. **Given** an active round with the drawer on the game screen, **When** the drawer
   draws a stroke, **Then** the stroke is visible on the drawer's canvas immediately.

2. **Given** an active round with at least one guesser on the game screen, **When**
   the drawer adds or removes strokes, **Then** all guessers' canvases reflect the
   same drawing state within the next polling cycle (~2 s).

3. **Given** the drawer has drawn multiple strokes, **When** the drawer clicks the
   Clear button, **Then** the canvas is wiped blank on the drawer's screen immediately
   and on all guessers' screens within the next poll cycle.

---

### User Story 2 — Guess Submission & Scoring (Priority: P2)

Any guesser can submit a text guess at any time during an active round. The system
trims the guess, rejects empty input, and compares it case-insensitively against the
secret word. A correct match awards 100 points to the guesser; an incorrect guess
adds 0 points. The drawer cannot submit guesses.

**Why this priority**: Guess submission and correct scoring are what make the game
a competition. This is independently testable once a round is active — even before
canvas sync is visible on guessers' screens, the scoring logic can be verified.

**Independent Test**: Start a game with 2+ players. From a guesser tab submit (a)
the correct word, (b) the correct word in a different case, (c) a wrong word, and
(d) a whitespace-only string — verify: (a) and (b) each award 100 points, (c) awards
0 points, (d) is rejected with an error message.

**Acceptance Scenarios**:

1. **Given** an active round, **When** a guesser submits the correct word (exact or
   different case), **Then** the guesser's score increases by 100 points.

2. **Given** an active round, **When** a guesser submits an incorrect word, **Then**
   the guesser's score does not change.

3. **Given** an active round, **When** a guesser submits a guess with leading or
   trailing whitespace, **Then** the whitespace is trimmed before comparison (e.g.,
   `"  rocket  "` is treated as `"rocket"`).

4. **Given** an active round, **When** a guesser submits an empty or
   whitespace-only string, **Then** the submission is rejected and a clear error
   message is shown to that guesser.

5. **Given** an active round, **When** the drawer attempts to submit a guess, **Then**
   the guess form is not available to the drawer (drawer cannot guess).

---

### User Story 3 — Guess History & Score Sync (Priority: P3)

Every submitted guess (correct or incorrect) is appended to a shared guess history
visible to all participants. All players' current scores are displayed and stay in
sync via polling so that everyone can see who is winning.

**Why this priority**: Sharing the guess history and live scores is what makes the
round social and competitive. This is independently testable once guess submission
(US2) is working — the data already exists; this story adds the visible, synced
display.

**Independent Test**: From two browser tabs (guesser A, guesser B), have A submit
"castle" (wrong). Within the next poll cycle, B's screen must show "castle" in the
guess history. Check that both tabs display correct scores for all players.

**Acceptance Scenarios**:

1. **Given** a guesser submits any guess (correct or incorrect), **When** any other
   participant's screen polls for updates, **Then** the submitted guess appears in
   the shared guess history visible to all.

2. **Given** a correct guess has been submitted, **When** any participant's screen
   polls for updates, **Then** the guesser's updated score (previous + 100) is
   visible to all participants.

3. **Given** multiple guesses have been submitted, **When** a participant views the
   guess history, **Then** guesses are displayed in the order they were submitted.

---

### Edge Cases

- What if two guessers submit the correct word at the same time? Each guesser
  receives 100 points independently — no "first correct guess wins" mechanic is in
  scope for this feature.
- What if the canvas is cleared while a guesser is mid-poll? The guesser sees the
  blank canvas on the next poll — no partial state is shown.
- What if the drawer's stroke count grows very large? No limit on strokes is defined
  for this feature; stroke storage remains in-memory.
- What if a guesser submits the correct word multiple times? Each submission is
  processed independently — the guesser scores 100 points per correct submission
  with no duplicate-guess protection in this feature.
- What if the word is a multi-word phrase? Comparison is still case-insensitive and
  exact-match; trimming applies to the full phrase.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The drawer MUST be able to draw strokes on the canvas during an active
  round.
- **FR-002**: The drawer MUST be able to clear all strokes from the canvas at any
  time during an active round.
- **FR-003**: Drawing strokes MUST be visible on the drawer's canvas immediately when
  drawn.
- **FR-004**: Drawing strokes MUST be synced to all participants' canvases via
  polling.
- **FR-005**: Guessers MUST be able to submit a text guess during an active round.
- **FR-006**: The system MUST trim leading and trailing whitespace from every
  submitted guess before processing it.
- **FR-007**: The system MUST reject empty or whitespace-only guesses and return a
  clear error message to the submitting guesser.
- **FR-008**: Guess comparison MUST be case-insensitive.
- **FR-009**: A correct guess MUST increase the guesser's score by exactly 100
  points.
- **FR-010**: An incorrect guess MUST leave the guesser's score unchanged (add 0
  points).
- **FR-011**: Every submitted guess (correct and incorrect) MUST be appended to a
  shared guess history.
- **FR-012**: The guess history MUST be synced to all participants via polling.
- **FR-013**: All participants' scores MUST be synced to all participants via polling.
- **FR-014**: All participants' scores MUST be 0 at the start of a round.
- **FR-015**: The guess submission form MUST NOT be available to the drawer.

### Key Entities

- **Canvas Stroke**: A single drawing action on the canvas. Attributes: unique
  identifier, sequence number, start coordinates, end coordinates, colour, brush
  size, timestamp.
- **Guess**: A text submission by a guesser. Attributes: submitting participant ID,
  raw text (before trimming), trimmed text, result (correct / incorrect), timestamp.
- **Score**: A participant's accumulated points in the current round. Starts at 0;
  increases by 100 per correct guess.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Drawing strokes appear on the drawer's canvas within 100 ms of the
  draw action (immediate local feedback).
- **SC-002**: Drawing strokes are visible on all guessers' canvases within the next
  polling cycle (~2 s) after the drawer adds or clears them.
- **SC-003**: Guess history and score updates are visible to all participants within
  the next polling cycle (~2 s) of submission.
- **SC-004**: 100% of correct guesses are detected and scored accurately
  (case-insensitive, trimmed comparison).
- **SC-005**: 100% of empty or whitespace-only guesses are rejected with a
  user-visible error message before submission reaches the server.
- **SC-006**: Scores for all participants are correctly initialised to 0 at round
  start in 100% of game sessions.

## Assumptions

- Canvas strokes are stored as a sequential list on the server; clients receive the
  full stroke list on each poll and re-render the canvas. Delta syncing is out of
  scope.
- A stroke is defined as a straight segment between two points (mouse-down to
  mouse-up defines a segment). Freehand curves are represented as many short
  segments. Exact stroke representation is an implementation detail.
- Colour and brush-size selection by the drawer are out of scope; a single default
  colour and size is used.
- The drawer sees their own canvas update immediately (local state); the server-side
  stroke list is updated on each draw action via an API call.
- The guess form is only shown to guessers; the drawer's game screen shows only the
  canvas and secret word.
- A guesser who has already guessed correctly is not locked out — they can continue
  submitting guesses and earning 100 points per correct submission. Locking out
  correct guessers is out of scope.
- There is no time limit on guesses; round end and timer mechanics are out of scope.
- Only a single active round is in scope; round progression and drawer rotation are
  out of scope.
- The secret word is already assigned at round start (from Feature 002); this
  feature reads it but does not change word assignment.

## Out of Scope

- Colour palette or brush-size selection for the drawer.
- Freehand curve interpolation beyond straight segments.
- Locking a guesser out after a correct guess.
- "First correct guess wins" mechanic; per-round single-winner scoring.
- Timer or countdown for the drawing phase.
- Round progression and drawer rotation after round end.
- Chat messages unrelated to guessing.
- Canvas replay or history playback.
