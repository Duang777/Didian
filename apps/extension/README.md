# Didian Browser Capture Extension

Chrome MV3 extension for saving the current browser page into Didian browser memory.

## Current slice

- Popup stores `apiBaseUrl` and `workspaceSlug` in `chrome.storage.sync`.
- `Capture Current Page` injects the content script into the active tab.
- The content script extracts URL, title, domain, favicon URL, selected text, readable text, links, and captured time.
- The background service worker posts the payload to `POST /api/browser-captures` with `X-Workspace-Slug` and `credentials: "include"`.

The extension does not store auth tokens. It relies on the existing Didian web session cookie for the configured API origin.

## Commands

```bash
pnpm --filter @didian/extension typecheck
pnpm --filter @didian/extension test
pnpm --filter @didian/extension build
```

Load `apps/extension/dist` as an unpacked extension after building.

## Scope

This slice only implements one-click current-page capture. Bookmark import, tab group capture, search recall suggestions, notes, and highlights remain later slices.
