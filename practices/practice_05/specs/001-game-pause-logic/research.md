# Research: Pause Logic for Play Screen

## Decisions

1. Authoritative paused flag in game state
- Decision: Maintain `paused: boolean` in the running game state to gate countdown and inputs.
- Rationale: Simple, explicit contract for UI and logic; easy to assert in tests.
- Alternatives considered: Derive paused from absence of `timerId` (ambiguous after answer); central event bus (overkill for scope).

2. Countdown preservation
- Decision: On pause, clear interval and keep `timeLeft` unchanged; on resume, recreate interval at 200 ms cadence using `timeLeft`.
- Rationale: Matches current timer design; avoids drift and respects constitution’s cadence.
- Alternatives considered: Single requestAnimationFrame loop (would alter cadence and complexity).

3. Input gating
- Decision: While `paused` is true, ignore `answer()` calls and defer `next` navigation activation until resume.
- Rationale: Guarantees no state mutation during pause and aligns with UI spec constraints.
- Alternatives considered: Disable DOM controls only (insufficient vs programmatic calls).

4. Race conditions and idempotence
- Decision: Guard pause/resume transitions to be idempotent; ensure only one active interval exists.
- Rationale: Prevents duplicate timers and inconsistent states during rapid toggles.
- Alternatives considered: Debounce toggles (unnecessary; correctness ensured by guards).

## Open Items Resolved

- Pause scope: Play screen only, during active question. Outside scope → ignored.
- Timeout collision: If time hits 0 at pause boundary, timeout wins; pause ignored for that question.
- Post-answer pause: Allowed; time is already stopped; navigation gated until resume.
