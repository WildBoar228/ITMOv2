# Research: Pause Button UI

## Decisions

- Control placement: Add `#play-pause` button in Play header, right side near score.
- Overlay: Add `#pause-overlay` inside `#screen-play`; visible only when `.paused` is set on `#screen-play`.
- Hidden elements while paused: `#play-question`, `#play-options`, `#play-explain`, `#play-next`.
- Accessibility: Toggle `aria-pressed` on the Pause control; update `aria-label` to "Пауза"/"Продолжить"; ensure hidden elements are non-focusable via CSS (`display:none`) and/or `inert` when available (non-mandatory).
- Mobile: Keep Pause control in the header; overlay centered with readable text.

## Rationale

- Header placement aligns with existing controls (score, title) and ensures visibility.
- Container `.paused` class simplifies CSS-based state control without invasive JS.
- Using `display:none` preserves focus rules naturally; optional `inert` improves robustness where supported.
- Overlay communicates state clearly and prevents accidental inputs.

## Alternatives Considered

- Modal dialog: Rejected to avoid focus trap complexity without a component library.
- Separate Pause screen route: Rejected; unnecessary navigation complexity for a simple toggle.
- Disabling buttons without hiding content: Rejected; users could still read the question, conflicting with the requirement to hide the task until resume.
