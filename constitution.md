# Scribble Project Constitution

## 1. Core Engineering Principles
* **Tech Stack Boundary:** Pure React 18 frontend + localized Node/Express REST backend. 
* **State Sync Mechanism:** Periodic short-polling (~2s intervals) via standard HTTP fetch operations. WebSockets/real-time socket connections are strictly out of scope.
* **Data Storage:** Explicit in-memory storage objects on the backend server. Databases and persistent volumes are completely excluded.

## 2. Input & Validation Rules
* **Whitespace Treatment:** All user inputs (player names, room codes, guess forms) must be aggressively trimmed using `.trim()`. Whitespace-only or completely empty submissions must be rejected with clear UI error feedback.
* **Security Boundaries:** Rooms must remain structurally isolated from one another via their unique room codes. No cross-room data leaks are permitted.