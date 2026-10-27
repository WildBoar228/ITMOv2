---

description: "Implementation tasks for Pause Button UI"
---

# Tasks: Pause Button on Play Screen (UI-only)

**Input**: Design documents from `/specs/pause-button-ui/`

**Prerequisites**: plan.md (completed), spec.md (user stories), research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: UI tests are not required by spec; manual validation via quickstart.md

**Organization**: Tasks grouped by user story to enable independent testing

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

 - [X] T001 [P] Create feature working branch confirmed (practice_5_ui)
- [ ] T002 [P] Verify dev server workflow in README: `python3 -m http.server 8000`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T003 Ensure no schema or timer logic changes planned in this UI scope (constitution compliance)

---

## Phase 3: User Story 1 - Pause/Resume control visible and operable (Priority: P1) 🎯 MVP

**Goal**: Pause control toggles UI: hide question/options/explanation/Next, show overlay

**Independent Test**: Per quickstart.md steps 3–4

- [X] T010 [US1] Add Pause button container and overlay in practices/practice_05/dz/project/index.html (ids: `play-pause`, `pause-overlay`)
- [X] T011 [P] [US1] Add CSS rules in practices/practice_05/dz/project/style.css for `.paused` state, overlay visuals, and focus hiding
 - [X] T012 [US1] Wire minimal JS in practices/practice_05/dz/project/app.js to handle pause toggle accessibility (aria-pressed/label, keyboard)
 - [X] T013 [US1] Manual verify: pause hides `#play-question`, `#play-options`, `#play-explain`, `#play-next`; overlay visible; resume reverses

---

## Phase 4: User Story 2 - Accessibility and keyboard interaction (Priority: P1)

**Goal**: Keyboard accessible; aria states updated; hidden elements not focusable

**Independent Test**: Tab/Enter/Space toggling; focus cannot reach hidden elements

 - [X] T020 [US2] Add `aria-pressed` toggling and `aria-label` updates to `#play-pause` in practices/practice_05/dz/project/app.js
 - [X] T021 [P] [US2] Ensure hidden areas use `display:none` in practices/practice_05/dz/project/style.css and markup
- [ ] T022 [US2] Manual verify keyboard navigation and screen reader label changes

---

## Phase 5: User Story 3 - Mobile layout and visual clarity (Priority: P2)

**Goal**: Control visible on ≤560px; overlay readable and centered

**Independent Test**: Resize; verify placements

- [ ] T030 [P] [US3] Adjust `.play-head` layout to include `#play-pause` without overlap in practices/practice_05/dz/project/style.css
- [ ] T031 [US3] Style `#pause-overlay` for responsive centering and contrast in practices/practice_05/dz/project/style.css
- [ ] T032 [US3] Manual verify on narrow viewport

---

## Phase 6: User Story 4 - UI state consistency with feedback/next (Priority: P2)

**Goal**: Pausing after answering hides feedback and Next; resume restores

**Independent Test**: Answer a question, pause, then resume

- [ ] T040 [US4] Extend `.paused` rules to also hide `#play-explain` and control `#play-next` visibility in practices/practice_05/dz/project/style.css
- [ ] T041 [US4] Manual verify with a deck having explanations

---

## Phase 7: User Story 5 - Visual indicators and iconography (Priority: P3)

**Goal**: Icon/text swap; dimmed background under overlay

**Independent Test**: Toggle; check icon/text and dimming

 - [X] T051 [P] [US5] Add optional dim backdrop style on `#screen-play.paused` in practices/practice_05/dz/project/style.css
 - [ ] T052 [US5] Manual verify visuals

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] T090 [P] Update docs: quickstart notes for pause in practices/practice_05/.specify/memory/specs/pause-button-ui/quickstart.md
- [ ] T091 Code cleanup: ensure no inline styles beyond allowed scope in JS
- [X] T092 Run static checks: `node --check practices/practice_05/dz/project/app.js`

---

## Phase 8: Convergence

- [ ] T093 [US2] Perform manual keyboard and ARIA verification per quickstart; record issues if found (missing)
- [X] T094 [US3] Adjust play-head and overlay CSS for ≤560px; verify responsive placement and readability (missing)
- [X] T095 [US4] Ensure .paused hides #play-explain and controls #play-next visibility consistently; verify (missing)
- [X] T096 [US5] Implement icon/text swap for #play-pause (⏸/▶); optional dim backdrop; verify (missing)
- [ ] T097 Verify repeated toggles (≥10) have no console errors; note any anomalies (partial)
- [X] T098 [P] Re-audit app.js to ensure no inline styles beyond allowed timer width; keep CSS-only visibility (unrequested audit)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → User Stories in order (US1 is MVP)
- Parallel opportunities: T011 with T010; T021 with T020; T030 with T031
