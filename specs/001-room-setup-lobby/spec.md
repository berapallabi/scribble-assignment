# Feature Specification: Room Setup & Lobby

**Feature Branch**: `001-room-setup-lobby`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Room Setup & Lobby — Given a player wants to host or join a drawing game, When they create or join a room via a unique code, Then the creator is automatically the host; invalid/empty codes are rejected with clear feedback; rooms are fully isolated; the lobby refreshes via polling (~2s); and only the host can start the game once at least 2 players are present."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Create a Room and Become Host (Priority: P1)

A player opens the app and chooses to create a new room. The system generates a
unique room code and assigns the creator as host. The player lands in the lobby,
where their name appears as the host. No other player is yet present.

**Why this priority**: This is the entry point for any game session. Without room
creation, no other feature can function. Delivering this story alone produces a
usable lobby.

**Independent Test**: One browser tab can create a room, receive a unique code,
and see the lobby screen showing the creator as host — with no other players
required.

**Acceptance Scenarios**:

1. **Given** a player is on the Start screen, **When** they choose "Create Room"
   and submit a non-empty player name, **Then** a unique room code is generated,
   the player is recorded as host, and they are taken to the Lobby screen.

2. **Given** a player submits an empty or whitespace-only player name, **When**
   they attempt to create a room, **Then** the system rejects the attempt and
   displays a clear inline error message; no room is created.

3. **Given** two rooms are created independently, **When** players are in their
   respective lobbies, **Then** each room's participant list contains only its
   own players and room states do not affect each other.

---

### User Story 2 — Join a Room via Code (Priority: P2)

A player who has received a room code opens the app and joins an existing room.
They land in the lobby alongside the host and any other participants already
present.

**Why this priority**: Joining is the second essential action — without it a
multi-player session cannot form. This story can be tested independently once
Story 1 is complete.

**Independent Test**: A second browser tab joins using the code from Story 1 and
is visible in the lobby of that room without affecting any other room.

**Acceptance Scenarios**:

1. **Given** an existing room with a valid code, **When** a player enters that
   code and a valid (non-empty, non-whitespace) player name, **Then** they are
   added to that room's participant list and land on the Lobby screen.

2. **Given** a player enters an empty or whitespace-only room code, **When**
   they attempt to join, **Then** the system rejects the attempt and displays a
   clear error message before any network request is made.

3. **Given** a player enters a code that does not match any existing room,
   **When** they attempt to join, **Then** the system displays a clear "room not
   found" error message and the player remains on the Join screen.

4. **Given** a player enters a valid code but an empty or whitespace-only player
   name, **When** they attempt to join, **Then** the system rejects the attempt
   with a clear error message and does not add the player to the room.

---

### User Story 3 — Lobby Auto-Refresh via Polling (Priority: P3)

Once in the lobby, every participant's screen automatically refreshes the
participant list at approximately 2-second intervals so that new joiners appear
without any manual action.

**Why this priority**: Auto-refresh turns the lobby into a live shared space.
Without it, players would not see each other arrive, making the host-start check
effectively unverifiable in real time.

**Independent Test**: With two browser tabs in the same lobby, joining a third
player in a third tab causes their name to appear on the other two tabs within
approximately 2 seconds — without pressing any button.

**Acceptance Scenarios**:

1. **Given** a player is on the Lobby screen, **When** another player joins the
   same room, **Then** the first player's lobby participant list updates to
   include the new joiner within approximately 2 seconds without any manual
   refresh action.

2. **Given** the lobby is polling, **When** no new players join, **Then** the
   participant list remains stable and no visible flicker or error occurs.

---

### User Story 4 — Host Starts the Game (Priority: P4)

The host sees a "Start Game" control in the lobby. It becomes active only when
at least 2 players are present. Non-host players do not see or cannot activate
this control.

**Why this priority**: Starting the game is the terminal action of the lobby
phase. It depends on Stories 1–3 being functional and is independently
verifiable once a 2-player lobby exists.

**Independent Test**: With exactly 2 players in the lobby, the host's tab shows
an active "Start Game" button; the non-host's tab does not show an active
"Start Game" button. Clicking the host's button transitions all players to the
game screen.

**Acceptance Scenarios**:

1. **Given** only 1 player is in the lobby, **When** viewing the host's lobby
   screen, **Then** the "Start Game" control is visible but disabled, with a
   message indicating that at least 2 players are required.

2. **Given** 2 or more players are in the lobby, **When** the host activates
   "Start Game", **Then** the game begins and all players are taken to the Game
   screen.

3. **Given** 2 or more players are in the lobby, **When** a non-host player
   views the lobby, **Then** they cannot trigger the game start (the control is
   either absent or non-interactive for them).

---

### Edge Cases

- What happens when a player submits only spaces as their player name? The
  system MUST trim the name and treat a whitespace-only result as empty,
  displaying an appropriate validation error.
- What happens if the room code field is submitted with only spaces? The code
  MUST be trimmed; a whitespace-only code MUST be treated as empty and rejected.
- What happens if a player navigates back from the lobby and tries to rejoin
  with the same name? The system MUST add them as a new participant entry (no
  duplicate-name enforcement is required).
- What happens when the backend is restarted while players are in the lobby?
  Polling will receive a "room not found" error; the UI MUST show a clear error
  state rather than silently failing.
- What happens when a single lobby poll request fails due to a transient network
  error? The UI MUST silently retry on the next poll cycle (~2s later) and only
  display an error after multiple consecutive failures.
- What if two players create rooms at the same moment? Each room MUST receive a
  distinct code.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a player to create a new room by providing a
  non-empty, non-whitespace player name; on success the player is designated host.
- **FR-002**: The system MUST generate a unique room code for every newly created
  room.
- **FR-003**: The system MUST allow a player to join an existing room by providing
  a valid room code and a non-empty, non-whitespace player name.
- **FR-004**: The system MUST reject any join or create attempt where the player
  name is empty or whitespace-only, displaying a clear, inline error message.
- **FR-005**: The system MUST reject any join attempt where the room code is empty
  or whitespace-only, displaying a clear error message before attempting to reach
  the server.
- **FR-006**: The system MUST reject any join attempt with a room code that does
  not correspond to an existing room, displaying a "room not found" error message.
- **FR-007**: Each room MUST be fully isolated — participant lists, game state, and
  interactions in one room MUST NOT affect any other room.
- **FR-008**: The lobby MUST automatically poll room state (participant list and
  room phase) at approximately 2-second intervals without requiring any user
  action. The poll response MUST include the current room phase.
- **FR-009**: The "Start Game" control MUST be visible only to the host.
- **FR-010**: The "Start Game" control MUST be disabled (or show a minimum-player
  message) when fewer than 2 players are present in the room.
- **FR-011**: The host MUST be able to start the game when 2 or more players are
  present. When the host starts the game, the room phase changes to `in-game`.
  All clients — including non-host players — MUST detect this phase change via
  their next lobby poll and automatically navigate to the Game screen.
- **FR-012**: Player names and room codes MUST be trimmed of leading and trailing
  whitespace before validation and storage.
- **FR-013**: Room code matching MUST be case-insensitive. The entered code MUST
  be normalised (e.g., uppercased) before comparison so that a player typing in
  any case can successfully join.

### Key Entities

#### Room

Represents an active, isolated game session.

| Field        | Description                                                        | Constraints                                      |
|--------------|--------------------------------------------------------------------|--------------------------------------------------|
| code         | Unique identifier shared with others to join the room              | Non-empty; unique across all active rooms        |
| participants | Ordered list of players currently in the room                      | At least 1 (the creator); no enforced upper limit |
| status       | Current state of the room (referred to as "phase" conceptually)   | One of: `lobby`, `in-game`                       |
| hostName     | Display name of the player who created the room                    | Must match one entry in participants             |

**Relationships**: A Room contains one or more Players. Exactly one Player is
designated host. A Room exists independently of all other Rooms — no shared
state.

#### Player

Represents a participant within a single Room.

| Field    | Description                                              | Constraints                                    |
|----------|----------------------------------------------------------|------------------------------------------------|
| name     | Display name chosen by the player on join or create      | Non-empty after trimming whitespace            |
| isHost   | Whether this player created the room                     | Exactly one Player per Room has `isHost = true` |

**Relationships**: A Player belongs to exactly one Room. The host Player is the
only one permitted to trigger game start.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can create a room and land in the lobby in under 5 seconds
  under normal conditions.
- **SC-002**: A player can join an existing room using a valid code in under
  5 seconds under normal conditions.
- **SC-003**: A new participant appears on all other lobby screens within
  approximately 2 seconds of joining, without any manual refresh.
- **SC-004**: 100% of invalid inputs (empty name, empty code, unknown code) are
  rejected with a visible error message before the player advances past the
  current screen.
- **SC-005**: A host with 2 or more players present can successfully start the
  game on the first attempt.
- **SC-006**: Two independent rooms running simultaneously show no cross-room
  data leakage in participant lists or game state.

## Non-Goals / Out of Scope

The following are explicitly excluded from this feature. Do not implement or
spec them here.

- **Real-time push**: All sync is HTTP polling only. WebSockets, Server-Sent
  Events, and any push protocol are out of scope.
- **Persistent storage**: Room state is in-memory only. No database, file, or
  external store of any kind.
- **Authentication & accounts**: No login, sessions, JWT, or identity system.
  Player names are anonymous display labels.
- **Duplicate name enforcement**: Two players may share the same display name
  in the same room; the system does not prevent this.
- **Room expiry / cleanup policy**: Automatic removal of stale or empty rooms is
  not part of this feature.
- **Maximum player cap**: No upper limit on participants per room is enforced.
- **Room password / invite links**: Access control beyond the shared code is out
  of scope.
- **Game start & drawer assignment**: Assigning the drawer role and selecting the
  secret word are covered in Scenario 2 (a later spec).
- **Secret word visibility**: Restricting word visibility to the drawer only is
  covered in Scenario 2.
- **Drawing canvas & clear action**: Interactive drawing and the clear-canvas
  control are covered in Scenario 3.
- **Guess submission & history sync**: Submitting guesses, validating them, and
  syncing the guess history to all players are covered in Scenario 3.
- **Scoring**: Awarding points for correct guesses is covered in Scenario 3.
- **Result state**: Displaying the correct word, final scores, and full guess
  history at round end is covered in Scenario 4.
- **Restart flow**: Returning all players to the lobby with state cleared after a
  round is covered in Scenario 4.
- **Multiple rounds / drawer rotation / timers**: Out of scope for the entire lab.
- **Spectator mode**: All participants are active players; spectators are not
  supported.

## Assumptions

- Player names are display labels only; no uniqueness constraint is enforced
  within a room.
- Room codes are short, human-readable strings (exact format defined during
  planning) and do not expire during an active session.
- The server holds all room state in memory; a server restart clears all rooms.
  This is an accepted constraint, not an error condition.
- A "valid" room code means it matches an existing in-memory room; no
  cryptographic or format validation is applied to the code itself.
- Polling uses the existing REST endpoint for fetching room state; no new
  dedicated polling endpoint is required.
- The lobby does not enforce a maximum number of players per room.
- Once a host starts the game, the room phase changes to `in-game`; non-host
  players detect this via the lobby poll and navigate to the Game screen
  automatically. No separate mechanism is required.

## Clarifications

### Session 2026-06-01

- Q: How do non-host players detect that the host has started the game and navigate to the Game screen? → A: The lobby poll response includes the room phase; when any client sees `phase: in-game` it automatically navigates to the Game screen. No separate mechanism is needed.
- Q: When one lobby poll request fails transiently, what should the UI do? → A: Silently retry on the next poll cycle (~2s later); show an error only after multiple consecutive failures.
- Q: Is room code matching case-sensitive when a player joins? → A: Case-insensitive — the entered code is normalised (uppercased) before matching so any capitalisation is accepted.
