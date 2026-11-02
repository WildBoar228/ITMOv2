---

description: "Implementation tasks for Pause Logic (Play Screen)"
---

# Tasks: Pause Logic for Play Screen

**Input**: Design documents from `/specs/001-game-pause-logic/`

**Prerequisites**: plan.md (completed), spec.md (user stories), research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: Tests are OPTIONAL. Per project constitution, use static checks and manual quickstart validation. Add a simple static test file only if requested later.

**Organization**: Tasks grouped by user story to enable independent testing

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

 - [x] T001 Confirm working branch `001-game-pause-logic` is active (informational)
 - [x] T002 Verify local dev server works: `python3 -m http.server 8000` (open /project/)

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T003 Ensure no schema or TIME_PER_QUESTION changes are planned (constitution compliance)
- [x] T004 Identify insertion points in practices/practice_05/dz/project/app.js for pause/resume (renderQuestion, answer, navigation)

---

## Phase 3: User Story 1 - Pause stops countdown and inputs (Priority: P1) 🎯 MVP

**Goal**: Pausing halts countdown immediately and blocks answer/next processing until resume; resuming continues from exact remaining time.

**Independent Test**: Start a question, pause, wait ≥5s, resume; timeLeft unchanged; inputs ignored while paused.

- [x] T010 [US1] Add `paused` boolean to runtime state in practices/practice_05/dz/project/app.js (within `state.current` during Play)
- [x] T011 [US1] Implement `pauseGame()` to: clear interval, set `paused=true`, preserve `timeLeft` in practices/practice_05/dz/project/app.js
- [x] T012 [US1] Implement `resumeGame()` to: restart interval at 200ms using preserved `timeLeft`, set `paused=false` in practices/practice_05/dz/project/app.js
- [x] T013 [US1] Gate `answer(idx)` early-return if `state.current.paused === true` in practices/practice_05/dz/project/app.js
- [x] T014 [US1] Gate Next navigation while paused: ignore clicks or no-op until resume in practices/practice_05/dz/project/app.js
- [x] T015 [P] [US1] Expose read-only paused getter for UI toggle sync (e.g., function `isPaused()`) in practices/practice_05/dz/project/app.js

---

## Phase 4: User Story 2 - Resume preserves game phase (Priority: P1)

**Goal**: Resume restores exactly pre-pause phase (pre-answer vs post-answer) without side effects.

**Independent Test**: Pause before answering then resume and answer; pause after answering then resume and go Next; state consistent.

- [x] T020 [US2] Ensure `pauseGame()` does not modify `locked` or score in practices/practice_05/dz/project/app.js
- [x] T021 [US2] Ensure `resumeGame()` does not re-render current question or reset options; timer only in practices/practice_05/dz/project/app.js
- [x] T022 [US2] Verify that post-answer state (feedback, Next visibility) persists across pause/resume by not touching related flags in practices/practice_05/dz/project/app.js

---

## Phase 5: User Story 3 - Scope boundaries for pause (Priority: P2)

**Goal**: Pause requests outside Play screen or without active question are ignored.

**Independent Test**: Try pause on List/Editor/Result; no effect.

- [x] T030 [US3] Guard `pauseGame()` and `resumeGame()` to no-op when `!state.current` or when non-Play screens are active in practices/practice_05/dz/project/app.js
- [x] T031 [P] [US3] Clear paused=false when leaving Play (showScreen transitions to other screens) in practices/practice_05/dz/project/app.js

---

## Phase 6: User Story 4 - Robust toggling and idempotence (Priority: P2)

**Goal**: Rapid toggling causes no duplicate timers or skipped states.

**Independent Test**: Toggle 10x quickly; only one interval exists; final state matches last toggle.

- [x] T040 [US4] Make `pauseGame()` idempotent: if already paused, return early in practices/practice_05/dz/project/app.js
- [x] T041 [US4] Make `resumeGame()` idempotent: if not paused, return early; ensure existing interval cleared before starting new one in practices/practice_05/dz/project/app.js

---

## Phase 7: User Story 5 - Logic/UI contract alignment (Priority: P3)

**Goal**: Provide simple UI hooks without leaking implementation details; UI state follows logic.

**Independent Test**: Programmatic calls ignored while paused; paused flag readable.

- [x] T050 [US5] Provide exported functions `pauseGame`, `resumeGame`, `isPaused` for UI wiring in practices/practice_05/dz/project/app.js
- [x] T051 [P] Manual validation following specs/001-game-pause-logic/quickstart.md

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T090 Update docs if public names differ: specs/001-game-pause-logic/contracts/ui.md
- [x] T091 Code cleanup: ensure no inline styles added beyond timer width updates in practices/practice_05/dz/project/app.js
- [x] T092 Run static checks: `node --check practices/practice_05/dz/project/app.js`
- [x] T093 [P] Sanity manual pass on edge cases (timeout collision, long pause)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 (MVP) → US2 → US3 → US4 → US5
- Parallel opportunities: T015 with T013/T014; T031 with T030; T041 with T040; T051 with polish tasks

## Implementation Strategy

- MVP scope is US1: pause/resume core behavior and gating
- Deliver incrementally per phase; validate via quickstart after US1
