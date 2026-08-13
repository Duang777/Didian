# Product Demo Recording Plan

## Goal

Create a short, reproducible product walkthrough that explains Didian as an AI workbench for saved resources, capabilities, Missions, local runtime execution, and Atlas memory.

Target length: 90-150 seconds.

## Recommended Story

### Scene 1: Home Context

Show the main Didian workspace and explain:

> Didian turns scattered saved web resources into AI-readable knowledge, reusable capabilities, and executable Missions.

### Scene 2: AI Inbox

Show resource cards in AI Inbox.

Explain:

> Saved pages are not passive bookmarks. Didian enriches them, keeps provenance, and decides whether they can become useful capabilities.

### Scene 3: Capability Creation

Click a capability entry or button.

Explain:

> The user does not need to know what a Skill is. They can simply ask Didian to make a capability from this resource. The local Codex runtime can propose directions before generation.

### Scene 4: Capability Library

Open Skills/Capabilities.

Explain:

> Generated capabilities are stored in the workspace library instead of being lost inside a chat session.

### Scene 5: Mission

Open Missions and create/open a Mission.

Explain:

> Missions are general-purpose tasks. They can be coding tasks, research tasks, resource organization, planning, or any work the connected local agent can perform.

### Scene 6: Capability Usage Record

Open Mission detail and show the capability usage area.

Explain:

> Didian tracks the difference between selected capabilities, injected capabilities, and actual runtime usage. A local agent reports whether a capability was used, skipped, or failed.

### Scene 7: Atlas

Open Atlas.

Explain:

> Atlas becomes the memory surface. It connects resources, evidence, Missions, capabilities, and previous usage so knowledge can be reused.

## Recording Script

The local script is:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:13877 node scripts/submission/record-demo.mjs
```

Outputs:

```text
tmp/submission/didian-product-demo.webm
tmp/submission/didian-product-demo.mp4
```

## Post-Production Notes

Use ffmpeg for lightweight processing:

```bash
ffmpeg -i tmp/submission/didian-product-demo.mp4 -vf "scale=1920:-2" -c:v libx264 -preset medium -crf 23 -c:a aac tmp/submission/didian-product-demo-final.mp4
```

If we later need voiceover, subtitle timing, or b-roll, use a dedicated video workflow such as ProductVideoCreator or super-video-maker-skill.
