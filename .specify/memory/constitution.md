<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Modified principles: N/A (initial ratification)
Added sections:
  - Core Principles (5 principles)
  - Scope Constraints
  - Development Workflow
  - Governance
Templates reviewed:
  - .specify/templates/plan-template.md ✅ — Constitution Check section aligns with principles below
  - .specify/templates/spec-template.md ✅ — Scope/requirements alignment confirmed; no changes required
  - .specify/templates/tasks-template.md ✅ — Task categories (backend, frontend, game logic) align with principles
Deferred TODOs: None
-->

# Scribble Constitution

## Core Principles

### I. Incremental Brownfield Enhancement

Work with the existing codebase; do not rewrite it from scratch. Every change
MUST be traceable to a spec, plan, or task artifact. Unrelated refactors are
forbidden. New top-level dependencies require explicit justification in the plan.
Discovery MUST precede implementation: read the relevant starter files and
document gaps and assumptions before writing any new code.

### II. HTTP Polling Only — No Real-Time Push

All client-server synchronisation MUST use HTTP polling. WebSockets, Socket.io,
Server-Sent Events, and any other push or real-time protocol are strictly
forbidden. Polling intervals MUST be approximately 2 seconds where specified.
This constraint is non-negotiable and applies to all lobby and gameplay sync.

### III. In-Memory State Only — No Persistence

All game data MUST be stored in server memory only. No database (SQL, NoSQL,
SQLite, files, or any external store) may be introduced. Restarting the backend
MUST clear all room state. Room memory footprint MUST remain minimal; inactive
rooms SHOULD be removed when no longer needed.

### IV. TypeScript-First, Typed and Validated

All new and modified code MUST be fully typed TypeScript. The `any` type is
forbidden; use `unknown` for truly dynamic values. Backend request and response
payloads MUST be validated with Zod. Frontend state MUST follow the established
patterns in `roomStore.ts`. Functional React components and standard hooks
(`useState`, `useEffect`) are required; class components are forbidden.

### V. Spec-Driven Development with Human Review

Every feature MUST follow the Spec Kit loop in order:
Specify → Clarify → Plan → Tasks → Implement → Validate.
AI-generated output MUST be critically reviewed before committing. Commits MUST
be granular and meaningful so each change is traceable to a spec artifact.
The drawer MUST review every AI suggestion rather than accepting it wholesale.

## Scope Constraints

The following are explicitly out of scope for this project. Including any of
these in a spec, plan, task, or implementation is a constitution violation:

- WebSockets or any real-time push protocol
- Databases, persistent storage, or file-based state
- Authentication, accounts, sessions, JWT, or OAuth
- Deployment, hosting, CI/CD, or Docker configuration
- New state-management or routing libraries beyond the starter
- Multiple rounds, drawer rotation, timers, countdowns, or bonuses
- Custom or random word packs beyond the starter seed
- Spectator mode, moderation, room passwords, or invite links
- Rewriting the starter application from scratch

Deviations from this list MUST be documented in the plan and require explicit
written justification explaining why the out-of-scope item is now necessary.

## Development Workflow

1. **Discovery** — Read relevant starter files; document ≥3 gaps, ≥2 assumptions,
   and the relevant files before specifying.
2. **Specify** — Write or update `spec.md` with acceptance criteria and edge cases.
3. **Clarify** — Resolve ambiguity before planning; do not guess at scope.
4. **Plan** — Update state model, data flow, and file-level implementation plan.
5. **Tasks** — Decompose the plan into ordered, independently testable tasks.
6. **Implement** — Complete one meaningful slice at a time and commit it.
7. **Validate** — Verify acceptance criteria using two browser tabs before moving on.

Commit message format: `<type>: <short summary>` (e.g., `feat: add lobby polling`).
Build MUST pass (`npm run build` in both `backend/` and `frontend/`) before
raising a pull request.

## Governance

This constitution supersedes all other development practices. Amendments require:

1. A documented rationale explaining why the change is necessary.
2. Updates to any affected spec, plan, or task artifacts.
3. A version bump following semantic versioning:
   - **MAJOR**: Backward-incompatible principle removal or redefinition.
   - **MINOR**: New principle or section added, or materially expanded guidance.
   - **PATCH**: Clarifications, wording fixes, or non-semantic refinements.

All pull requests and AI-assisted reviews MUST verify compliance with the
principles above. Complexity beyond what the task requires MUST be justified.
Use `AGENTS.md` for runtime AI agent guidance.

**Version**: 1.0.0 | **Ratified**: 2026-06-01 | **Last Amended**: 2026-06-01
