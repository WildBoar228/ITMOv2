# UI/Logic Contract: Pause

This contract defines the interaction between UI controls and core logic for pause.

## Events from UI to Logic

- pauseRequested(): Intent to pause current question. Logic may ignore if out of scope.
- resumeRequested(): Intent to resume if currently paused.

## Read-only Signals from Logic to UI


## Rules

- UI MUST not attempt to change timeLeft directly; only reflect logic state.
- UI MAY hide/disable controls per paused state; logic gates inputs regardless of UI.
