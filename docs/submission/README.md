# Didian Submission Package

This folder collects the materials needed for a product submission:

- product demo link or installable package
- product explanation document
- recorded product walkthrough

## Current Deliverables

| Item | Status | Location |
| --- | --- | --- |
| Product explanation | Ready | [product-overview.md](./product-overview.md) |
| Demo recording plan | Ready | [recording-plan.md](./recording-plan.md) |
| Recording script | Ready | `scripts/submission/record-demo.mjs` |
| Delivery checklist | Ready | [submission-checklist.md](./submission-checklist.md) |
| Desktop package | Optional build | `pnpm -C apps/desktop package -- --mac --arm64 --publish never` |
| Web demo link | Local dev | `make start-worktree`, then open the printed frontend URL |
| Recorded walkthrough | Generated locally | `tmp/submission/didian-product-demo.mp4` |

## Recommended Submission Shape

1. **Demo link**
   - Local demo: start the worktree and use the printed frontend URL.
   - Public demo: deploy the web app and backend, then replace the local URL in this document.

2. **Installable package**
   - macOS local package:

     ```bash
     CSC_IDENTITY_AUTO_DISCOVERY=false pnpm -C apps/desktop package -- --mac --arm64 --publish never
     ```

   - The generated package will be under `apps/desktop/dist/`.
   - Current note: on this machine, electron-builder produced an intermediate `Electron.app` directory but did not finish the final named Didian package within the local timeout. For the immediate submission, use the demo link plus recording. Keep the package command as the release path after builder/signing is stabilized.

3. **Product document**
   - Use [product-overview.md](./product-overview.md) as the submitted product description.

4. **Recorded walkthrough**
   - Start the app:

     ```bash
     cd /Users/duang777/Developer/work/xunlei/multica-resource-workbench-remove-discord-card
     make start-worktree
     ```

   - In another terminal, record:

     ```bash
     PLAYWRIGHT_BASE_URL=http://localhost:13877 node scripts/submission/record-demo.mjs
     ```

   - The script writes:
     - `tmp/submission/didian-product-demo.webm`
     - `tmp/submission/didian-product-demo.mp4`

## Video Skill Notes

The external video skills the team mentioned are useful, but they should be adopted by role:

- `ProductVideoCreator`: best for a polished web-product video with Playwright, Remotion, TTS, and subtitles.
- `super-video-maker-skill`: best when we need a full video production pipeline with b-roll, subtitles, voiceover, and QC.
- `llm-video-maker`: best for quick one-shot generated demo videos.
- `ffmpeg-skill`: best for final trimming, compression, captions, and format conversion.

For the current submission, we keep the repository dependency-light and use the existing Playwright + ffmpeg stack. This gives us a reproducible demo recording without adding a large video toolchain to the product repo.
