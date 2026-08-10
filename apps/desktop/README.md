# Didian Desktop

## Brand Icons

Desktop icons are generated from the Didian mark in `scripts/generate-desktop-icons.mjs`.

```bash
cd /Users/duang777/Developer/work/xunlei/multica-resource-workbench-remove-discord-card
pnpm -C apps/desktop run brand:icons
```

This refreshes the development dock/window icon, packaged macOS and Windows icons, and the Linux hicolor sizes:

- `apps/desktop/resources/icon.png`
- `apps/desktop/build/icon.png`
- `apps/desktop/build/icon.icns`
- `apps/desktop/build/icon.ico`
- `apps/desktop/build/icons/*.png`

## Onboarding

The desktop app reuses the shared onboarding flow from `packages/views/onboarding`.

- `apps/desktop/src/renderer/src/App.tsx` decides when to show a pre-workspace overlay.
- `apps/desktop/src/renderer/src/components/window-overlay.tsx` hosts onboarding, workspace creation, invite, and invitations flows above the tab shell.
- `packages/views/onboarding/onboarding-flow.tsx` owns the actual onboarding steps and questionnaire persistence.

Desktop-specific behavior:

- Authenticated users without `onboarded_at` see the onboarding overlay.
- Users with pending invitations see the invitations overlay first.
- Users who are onboarded but have no workspace see the new-workspace overlay.
- Completing onboarding lands in the workspace AI Inbox.
- Runtime refresh in onboarding calls the bundled desktop daemon restart API.
