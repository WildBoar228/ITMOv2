# Data Model: Pause Logic

## Entities and State

- GameState (augment existing in-memory state)
  - paused: boolean — true if the game is paused during Play
  - timeLeft: number — seconds remaining for current question; preserved across pause/resume
  - timerId: number | undefined — platform interval ID when running; cleared on pause
  - locked: boolean — existing flag for post-answer lock; independent of paused
  - phase: enum { preAnswer, postAnswer } — implicit via `locked` and Next visibility; maintained across pause

## Validation Rules

- When paused = true, timeLeft MUST NOT change.
- While paused = true, inputs that would mutate score/index MUST be rejected or deferred.
- On resume, a single interval MUST be active; prior intervals MUST be cleared.

## Transitions

- Running → Paused: clear interval; keep timeLeft; set paused=true.
- Paused → Running: recreate interval using existing timeLeft; set paused=false.
- Any → Result/List/Editor: clear interval; set paused=false.
