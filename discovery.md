# Scribble Lab: Discovery Notes

## 1. Functional Gaps (Incomplete Behaviors)
* **No Automatic Polling:** The lobby (`LobbyPage.tsx`) only updates participants when a user clicks the manual "Refresh Room" button. There is no automated background polling mechanism to update players in real-time.
* **Missing Host Architecture:** The backend room store (`roomStore.ts`) accepts any joining player equally. There is no structural tracking identifying the room creator as the "Host", nor is there an implementation to restrict starting the game exclusively to that creator.
* **Scaffolded Gameplay UI:** The game screen (`GamePage.tsx`) renders layout shell containers for a drawing canvas, guess input forms, and scores, but lacks all functional backend endpoints, roles routing, drawing synchronization, or validation state entirely.

## 2. Technical Assumptions
* **In-Memory Volatility:** The system utilizes an in-memory storage array (`roomStore.ts`) on the Express backend server. All rooms, configurations, and roster balances are completely wiped whenever the backend process restarts.
* **Single-Round Flow:** The architecture assumes a localized single-round game framework where players play one core cycle of drawing and guessing before returning to a baseline lobby state.

## 3. Core Files Targets
* `backend/src/state/roomStore.ts` - For adding host tracking parameters and scoring metrics.
* `backend/src/server.ts` - For exposing game state initialization, guess endpoints, and polling targets.
* `frontend/src/pages/LobbyPage.tsx` - For implementing the ~2-second `setInterval` HTTP polling lookups.
* `frontend/src/pages/GamePage.tsx` - For building canvas tracking handlers, inputs, and state views.