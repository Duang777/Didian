# Didian Dialog Style Refresh

## Goal

Make common dialogs feel like Didian instead of the original Multica chrome, while preserving every modal's behavior, data flow, keyboard handling, and component contract.

## Scope

- Refresh shared `Dialog` and `AlertDialog` surface styles in `packages/ui`.
- Use warm paper surfaces, subtle brown borders, quieter overlay blur, and a restrained footer rail.
- Keep existing business modal layouts, widths, close behavior, focus handling, and Base UI primitives.
- Keep destructive, outline, and default button semantics unchanged.

## Non-goals

- Do not redesign every business modal individually.
- Do not rename modal APIs or modal registry keys.
- Do not change form validation, submit handlers, or close semantics.
- Do not touch mobile native dialogs in this pass.

## Style Rules

- Modal surfaces use `--dialog-surface`, `--dialog-border`, `--dialog-footer`, and `--dialog-shadow`.
- Default radius stays compact (`rounded-lg`) so dialogs feel tool-like, not marketing-card-like.
- Headers get a light bottom rule; footers get a warm rail.
- Existing modal `className` overrides remain authoritative for special cases such as full-screen onboarding, tall setup flows, and custom zero-padding layouts.
- Overlay is warm and blurred, but not theatrical.

## Verification

- Typecheck `@didian/ui`, `@didian/views`, `@didian/web`, and `@didian/desktop`.
- Run the `@didian/views` modal-adjacent test suite.
- Smoke the running web shell with system Chrome. A signed-in visual dialog
  smoke still needs an authenticated browser session.
