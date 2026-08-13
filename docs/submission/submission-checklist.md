# Submission Checklist

## Required Materials

- [x] Product demo link or installable package
- [x] Product explanation document
- [x] Product walkthrough recording

## Demo Link

- Local demo URL:

  ```text
  http://localhost:13877
  ```

- Backend URL:

  ```text
  http://localhost:18957
  ```

- Start command:

  ```bash
  cd /Users/duang777/Developer/work/xunlei/multica-resource-workbench-remove-discord-card
  make start-worktree
  ```

## Installable Package

Current status: optional. The desktop build command starts successfully and compiles the app, but on this machine electron-builder did not finish the final named package before timeout. Use the web demo URL plus generated recording for the immediate submission.

- macOS arm64 package command:

  ```bash
  cd /Users/duang777/Developer/work/xunlei/multica-resource-workbench-remove-discord-card
  CSC_IDENTITY_AUTO_DISCOVERY=false pnpm -C apps/desktop package -- --mac --arm64 --publish never
  ```

- Expected output folder:

  ```text
  apps/desktop/dist/
  ```

## Product Document

- Submit:

  ```text
  docs/submission/product-overview.md
  ```

## Recording

Current local output:

```text
tmp/submission/didian-product-demo.mp4
```

- Start app:

  ```bash
  make start-worktree
  ```

- Record demo:

  ```bash
  PLAYWRIGHT_BASE_URL=http://localhost:13877 node scripts/submission/record-demo.mjs
  ```

- Expected output:

  ```text
  tmp/submission/didian-product-demo.mp4
  ```

## Pre-Submit QA

- [ ] Login works or demo session is already authenticated.
- [ ] AI Inbox has at least one captured resource.
- [ ] Capability creation entry is visible.
- [ ] Skills/Capabilities library can be opened.
- [ ] Missions page shows Mission flow.
- [ ] Mission detail page can show capability usage records.
- [ ] Atlas page opens and communicates long-term memory.
- [ ] Desktop app icon and login screen use Didian branding.
- [ ] Video is under 150 seconds.
- [ ] Video text is readable at 1080p.
