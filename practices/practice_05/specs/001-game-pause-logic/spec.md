# Feature Specification: Pause Logic for Play Screen

**Feature Branch**: `[001-game-pause-logic]`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Ознакомься с проектом в @dz/ . Задача - добавить функцию паузы во время игры. Напиши отдельную спецификацию для логики, соответствующую спецификации для UI в @.specify/memory/specs/pause-button-ui.md ."

## User Scenarios & Testing (mandatory)

### User Story 1 - Pause stops countdown and inputs (Priority: P1)

Player can pause the running game during a question. While paused, the countdown does not decrease and no game inputs (answers, navigation) are processed until resume.

**Why this priority**: Prevents time pressure during interruptions and avoids accidental answers.

**Independent Test**: Start a game, wait until the timer clearly decreased, trigger pause; after waiting 5–10 seconds, resume and verify time remaining is unchanged from the pause moment and no answer was accepted during pause.

**Acceptance Scenarios**:

1. Given Play screen is active and a question is running, When pause is requested, Then the countdown stops immediately and answer submissions are ignored until resume.
2. Given paused state, When resume is requested, Then the countdown continues from the exact remaining time at pause and inputs are processed again.

---

### User Story 2 - Resume preserves game phase (Priority: P1)

Resuming returns the game to the exact phase it was in before pausing (before answering or after answering), without side effects.

**Why this priority**: Guarantees consistency of score and progression.

**Independent Test**: Pause before answering, then resume and answer; pause after answering (Next visible), then resume and proceed to next question; in both cases, score and state remain consistent.

**Acceptance Scenarios**:

1. Given paused state before any answer, When resume, Then the user can answer and scoring works as if no pause occurred.
2. Given paused state after an answer was already processed, When resume, Then Next/continue action proceeds as normal and score/explanation remain unchanged.

---

### User Story 3 - Scope boundaries for pause (Priority: P2)

Pause only applies on the Play screen during an active question. Requests to pause outside this scope have no effect.

**Why this priority**: Prevents invalid states and reduces complexity.

**Independent Test**: Attempt pause on List/Editor/Result screens or when no active game/question; verify no state changes occur.

**Acceptance Scenarios**:

1. Given the app is on List, Editor, or Result screen, When pause is requested, Then nothing changes in game state.
2. Given time has already expired on the current question or navigation already happened, When pause is requested, Then it is ignored.

---

### User Story 4 - Robust toggling and idempotence (Priority: P2)

Rapid toggling of pause/resume produces predictable state without duplicate timers or skipped states.

**Why this priority**: Prevents race conditions and negative user experience.

**Independent Test**: Trigger pause/resume rapidly 10 times; verify the game ends in the correct final state (paused or running as requested) and the countdown progresses normally when running.

**Acceptance Scenarios**:

1. Given running state, When pause is requested multiple times in quick succession, Then the game enters paused state once and the countdown does not decrease while paused.
2. Given paused state, When resume is requested multiple times in quick succession, Then the game resumes once and the countdown decreases at the normal rate.

---

### User Story 5 - Logic/UI contract alignment (Priority: P3)

The logic exposes a clear paused state for the UI to reflect and enforces input blocking consistent with the UI spec (.specify/memory/specs/pause-button-ui.md).

**Why this priority**: Keeps behavior consistent across layers and simplifies UI implementation.

**Independent Test**: While toggling pause via the UI, verify the logic’s paused flag matches the UI state; verify blocked inputs during pause even if triggered programmatically.

**Acceptance Scenarios**:

1. Given paused state, When an answer submission is attempted programmatically, Then logic rejects it and score/progression do not change.
2. Given paused state, When a programmatic navigation attempt to next question is made, Then logic defers it until the game is resumed.

### Edge Cases

- Pause requested at the same moment the timer would expire: expiration takes precedence; the question ends and pause has no effect.
- Pause requested after an answer is processed but before navigating: allowed; time is already stopped, but inputs to advance are deferred until resume.
- Pause requested when there is no active current game or the Play screen is not active: ignored.
- Multiple overlapping pause requests: safe and idempotent; no duplicate countdowns on resume.
- Resuming after a long pause (minutes): countdown continues from saved remaining time without drift or penalties.

## Requirements (mandatory)

### Functional Requirements

- FR-LOG-001: The system MUST support a paused state during an active question on the Play screen such that time remaining does not change while paused.
- FR-LOG-002: Upon pause, the system MUST immediately stop countdown progression and prevent processing of answer submissions and navigation actions until resume.
- FR-LOG-003: Upon resume, the system MUST continue the countdown from the exact time remaining at the moment of pause and re-enable processing of inputs.
- FR-LOG-004: Pause requests outside the Play screen or when no active question is running MUST be ignored without changing game state.
- FR-LOG-005: If a pause request coincides with question timeout, timeout resolution MUST take precedence; the question ends and pause is ignored for that question.
- FR-LOG-006: Pausing after an answer has been processed but before navigating MUST be allowed; while paused, navigation actions to the next step MUST be deferred until resume.
- FR-LOG-007: The system MUST expose a read-only indicator of paused state for the UI layer and keep it consistent with actual logic (true only when inputs are blocked and time is not advancing).
- FR-LOG-008: Rapid consecutive pause/resume requests MUST be handled idempotently (no duplicate or lost state transitions) and MUST NOT create multiple concurrent countdowns.
- FR-LOG-009: Transitioning away from the Play screen (e.g., to Result) MUST automatically clear any paused state; paused state MUST NOT persist across questions or screens.
- FR-LOG-010: While paused, visual timer updates are out of scope for logic; however, logic MUST maintain the authoritative remaining time that the UI can read without drift on resume.

### Key Entities

- Paused Flag: A boolean indicator representing that the game is paused (authoritative for time/input blocking).
- Time Remaining: The authoritative remaining time for the current question; preserved exactly across pause/resume.
- Input Gate: Logical guard that rejects or defers answer and navigation inputs while paused.
- Game Phase: The current phase of the question (pre-answer vs. post-answer); preserved across pause/resume.

## Success Criteria (mandatory)

### Measurable Outcomes

- SC-LOG-001: When paused for at least 10 seconds, resuming shows the same remaining time as at the moment of pause; no decrease during the pause interval.
- SC-LOG-002: While paused, attempts to submit an answer or advance do not change score, correctness counters, or question index.
- SC-LOG-003: After resuming, countdown progression and input handling return to normal within 100 ms of the resume action.
- SC-LOG-004: Toggling pause/resume 10 times in 5 seconds results in at most one active countdown and correct final state (paused or running) matching the last request.

## Assumptions

- Pause is only available on the Play screen during an active question and is not persisted across screens or sessions.
- There is no limit on pause count or duration; user value favors flexibility over constraints.
- If an answer was already processed before pausing, the remaining time is irrelevant for scoring and will not be used until the next question.
- Internationalization is not in scope; alignment with the existing Russian UI labels is sufficient for this feature’s logic contract.
