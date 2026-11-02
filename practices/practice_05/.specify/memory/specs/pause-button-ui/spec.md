# Feature Specification: Pause Button on Play Screen (UI-only)

**Feature Branch**: `practice_5_ui`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Добавь кнопку паузы во время игры. Она должна остановить таймер и скрыть условие задания с вариантами ответа до момента, пока пользователь не нажмет снова. Распиши спецификации только для UI, логика будет отдельно."

## User Scenarios & Testing (mandatory)

### User Story 1 - Pause/Resume control visible and operable (Priority: P1)

Player can pause the current question from the Play screen via a dedicated Pause button; while paused, the question text and answer options are hidden from view until the player resumes.

**Why this priority**: Core interaction; provides immediate control to the user and prevents accidental answering.

**Independent Test**: From a running game on the Play screen, clicking the Pause button toggles UI state: question/options hidden, overlay visible, button label/icon changes; clicking again restores the view.

**Acceptance Scenarios**:

1. Given Play screen is visible with a question and four answer buttons, When user clicks the Pause button, Then the question element and the options container become hidden and a pause overlay becomes visible.
2. Given UI is in paused state, When user clicks the Resume (same) button, Then the question and options reappear exactly as before and the overlay hides.
3. Given non-Play screens (List/Editor/Result), Then the Pause control is not visible.

---

### User Story 2 - Accessibility and keyboard interaction (Priority: P1)

Pause control is fully accessible via keyboard and screen readers; while paused, interactive game controls are not focusable to avoid accidental activation.

**Why this priority**: Inclusive access and prevention of accidental interactions.

**Independent Test**: Using only keyboard (Tab/Enter/Space), user can toggle pause; while paused, Tab does not focus answer buttons or Next; screen reader announces paused state.

**Acceptance Scenarios**:

1. Given Play screen, When user tabs through controls, Then the Pause button is reachable and Space/Enter toggles its state.
2. Given paused state, When user presses Tab, Then focus does not enter any hidden or disabled controls (answer buttons, Next); focus stays on Resume or permitted elements.
3. Given transition to paused state, Then ARIA label and/or `aria-pressed` state of the control reflects the new state, and an aria-live message or descriptive text indicates "Пауза".

---

### User Story 3 - Mobile layout and visual clarity (Priority: P2)

Pause control is visible and not obstructing key UI on narrow screens; overlay communicates paused state clearly.

**Why this priority**: Mobile is a primary use case; controls must remain usable.

**Independent Test**: On viewport ≤560px, Pause control is visible in the play header; toggling pause displays a centered, readable overlay.

**Acceptance Scenarios**:

1. Given viewport width ≤560px, Then the Pause control appears in the play header next to score/title without overlapping the timer bar.
2. Given paused state on mobile, Then the overlay text "На паузе" is centered and legible; background content (question/options) is not visible.

---

### User Story 4 - UI state consistency with feedback/next (Priority: P2)

When the "Далее" button or feedback/explanation are visible, entering pause keeps UI coherent and prevents unintended actions.

**Why this priority**: Prevents confusing states around end-of-question.

**Independent Test**: After answering but before moving on, pausing hides question/options and disables/hides Next in UI until resume.

**Acceptance Scenarios**:

1. Given feedback and "Далее" are visible, When user clicks Pause, Then Next becomes disabled (or hidden) and is not focusable; on Resume, Next returns to its previous visible/enabled state.
2. Given explanation text exists for the question, When paused, Then the explanation area is hidden together with the question/options (to avoid hints remaining visible), and on resume it returns to its prior state.

---

### User Story 5 - Visual indicators and iconography (Priority: P3)

Pause control uses intuitive icon/text; paused state uses an overlay and optional dimming.

**Why this priority**: Improves comprehension and polish.

**Independent Test**: Check icon/text swap and overlay style while toggling.

**Acceptance Scenarios**:

1. Given running state, Then the control label is "Пауза" with a pause icon (⏸︎ or similar); in paused state, it is "Продолжить" with a play icon (▶︎ or similar) and has `aria-label` reflecting the state.
2. Given paused state, Then the Play screen container has a `paused` modifier class and the background content is optionally dimmed under a semi-opaque overlay.

### Edge Cases

- Rapid double-click on Pause toggles state predictably without visual glitches.
- Attempting to pause when time already expired or after navigating away has no visible effect; Pause control is not shown outside Play screen.
- Resizing the window while paused preserves the paused overlay and hidden elements.
- If no explanation text exists, paused overlay still appears and question/options remain hidden.

## Requirements (mandatory)

### Functional Requirements (UI-only)

- FR-UI-001: Add a Pause control to the Play screen header (`#screen-play`), styled consistently with existing buttons (use existing `.btn` variants), accessible via keyboard.
- FR-UI-002: The Pause control toggles a visual state on the Play screen container (e.g., adds/removes `.paused` on `#screen-play`).
- FR-UI-003: In `.paused` state, the following elements MUST be hidden from view and focus: `#play-question`, `#play-options`, `#play-explain`, and `#play-next` (hidden or disabled). Score and title remain visible.
- FR-UI-004: Introduce a pause overlay element (e.g., `#pause-overlay`) inside the Play screen that is visible only when paused; overlay text: "На паузе" with a short hint "Нажмите «Продолжить», чтобы вернуться".
- FR-UI-005: The Pause control label/icon MUST switch between "Пауза" (running) and "Продолжить" (paused), and update `aria-label` accordingly; consider `aria-pressed` to reflect toggled state.
- FR-UI-006: While paused, interactive elements hidden/disabled MUST not be focusable via Tab; overlay or the Pause control MUST remain focusable.
- FR-UI-007: On mobile (≤560px), the Pause control MUST remain visible within the play header; overlay MUST be responsive and centered.
- FR-UI-008: No changes to data schema, timers, or scoring logic in this UI scope; underlying logic to stop/resume time is out of scope and specified separately.

### Key Entities (UI elements)

- `#play-pause` (button): toggles paused UI state; updates text/icon and ARIA.
- `#screen-play.paused` (container class): visual state flag controlling visibility and focus behavior of children.
- `#pause-overlay` (div): full-bleed semi-opaque overlay with centered message; only visible when paused.
- Existing elements affected: `#play-question`, `#play-options`, `#play-explain`, `#play-next`, timer bar area (visual-only; no logic here).

## Success Criteria (mandatory)

### Measurable Outcomes

- SC-UI-001: Toggling the Pause control hides/shows question and options within 100 ms of the click (CSS/DOM state change) without layout shifts affecting header and score.
- SC-UI-002: While paused, Tab navigation does not reach hidden option buttons or Next; screen readers announce the paused label within an aria-live region or via updated control label.
- SC-UI-003: On ≤560px viewport, Pause control remains visible without overlapping timer bar, and overlay text remains readable (>14px, sufficient contrast).
- SC-UI-004: No DOM errors in console when toggling pause 10 times in succession.

## Assumptions

- Underlying timer and game logic will implement actual time stop/resume; UI only sets state and visibility.
- No persistence of paused state across screens/sessions; Pause exists only on Play screen.
- Existing CSS variables and button styles will be reused; new classes/IDs are allowed in `index.html` and styles in `style.css` per project rules.
- Internationalization is not in scope; Russian labels are acceptable for this feature.
