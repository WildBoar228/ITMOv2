# Quickstart Validation: Pause Logic

Use this guide to validate pause/resume behavior end-to-end in the local app.

## Prerequisites

- Python 3 installed
- Node.js installed

## Start local server

1. Run: `python3 -m http.server 8000`
2. Open: http://localhost:8000/project/

## Validation Scenarios

1. Pause stops time and inputs
   - Start any game, begin a question.
   - Wait ~2 seconds, trigger Pause.
   - Wait ≥5 seconds.
   - Resume and verify the timer bar resumes from the same position; attempt answers while paused do nothing.

2. Resume preserves phase
   - Answer a question (feedback + Next appears).
   - Trigger Pause.
   - Resume; click Next and verify progression and score remain correct.

3. Rapid toggling is safe
   - Toggle Pause/Resume quickly several times.
   - Ensure no errors and the final state matches the last toggle; timer progresses normally when running.

4. Scope boundaries
   - Attempt Pause on non-Play screens; verify no effect.

## Checks

- No console errors during toggling.
- Time does not decrease during paused intervals.
