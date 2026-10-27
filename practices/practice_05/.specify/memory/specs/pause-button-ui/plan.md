# Implementation Plan: Pause Button on Play Screen (UI-only)

**Branch**: `practice_5_ui` | **Date**: 2026-10-27 | **Spec**: .specify/memory/specs/pause-button-ui/spec.md

**Input**: Feature specification from `/specs/pause-button-ui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Add a Pause control to the Play screen that toggles a paused UI state: hides question/options/explanation/Next, shows a centered overlay, and updates the control’s label and accessibility state. No timer/score logic changes in this UI scope; logic covered separately.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: HTML/CSS/JavaScript (vanilla); Node for JS syntax check

**Primary Dependencies**: None (no build system)

**Storage**: N/A (no persistence in UI scope)

**Testing**: pytest for schema/static checks; manual UI verification; future static tests possible

**Target Platform**: Local web page via `python3 -m http.server`

**Project Type**: Single-page web UI (no build)

**Performance Goals**: UI toggle within ~100 ms; no layout thrash

**Constraints**: No schema changes; no localStorage; styles only in `project/style.css`; inline JS limited to timer width

**Scale/Scope**: Single Play screen UI toggle and overlay

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Schema untouched (PASS): No changes to `project/data/decks.json`.
- Fixed timer rule (PASS in UI scope): UI-only; no change to `TIME_PER_QUESTION` or timer logic.
- Styling boundaries (PASS): New styles added only to `project/style.css`; minimal inline JS.
- TDD requirement (ACK): Logic implementation will follow TDD; UI-only scope has no logic changes.
- MCP/server unaffected (PASS): No changes to MCP layer.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: Single web project under `project/`; update `index.html` (add `#play-pause`, `#pause-overlay`), `style.css` (paused state, overlay), and minimal JS wiring in `app.js` to toggle `.paused`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
