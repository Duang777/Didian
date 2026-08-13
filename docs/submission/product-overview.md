# Didian Product Overview

## One-Liner

Didian is a personal AI workbench that turns scattered browser pages, bookmarked resources, and open-ended tasks into reusable knowledge, local-agent Missions, and persistent capabilities.

## Problem

People collect useful pages, repos, tutorials, docs, papers, and product references every day, but those resources usually become passive bookmarks. When they later need to act on them, they still have to reread, compare, extract, plan, and explain the same context to an AI agent from scratch.

Didian makes saved resources active. It remembers where a resource came from, lets AI judge what it is useful for, turns suitable resources into reusable capabilities, and lets local agents such as Codex use those capabilities inside Missions.

## Target Users

- Individual builders who collect technical resources and want local AI agents to help them act on those resources.
- Researchers, product people, and creators who save many pages and want structured knowledge instead of a flat bookmark list.
- Developers who want local runtime execution, traceability, and reusable task context without giving every web page to a remote black box.

## Core Workflow

1. **Capture**
   - The user saves a web page from the browser into Didian.
   - Didian stores title, URL, source type, preview, page summary, and provenance.

2. **AI Inbox**
   - Captured resources appear as active cards.
   - Backend enrichment can decide whether a resource is worth turning into a reusable capability.
   - The user can also manually ask Didian to make a capability from any saved resource.

3. **Capability Direction**
   - Didian asks the local agent runtime to inspect the resource and propose useful capability directions.
   - The user chooses a direction or adds a plain-language requirement.

4. **Capability Generation**
   - The selected direction is handed to a local Codex runtime.
   - Codex generates a high-quality capability and writes it back into the Didian capability library.

5. **Mission Execution**
   - Missions are general-purpose tasks. They can be development work, research tasks, resource organization, planning, comparison, or personal productivity workflows.
   - A Mission can select capabilities from the library.
   - The local runtime receives selected capabilities during task claim.
   - After execution, the runtime reports whether each capability was actually used, skipped, or failed.

6. **Atlas**
   - Atlas is the long-term memory surface.
   - It should connect resources, evidence, Missions, capabilities, and usage records so users can ask what something came from, where it was used, and what it can become next.

## What Makes It Different

- **Bookmarks become actions.** Didian does not stop at saving links; it helps decide what a saved link can do.
- **Local runtime first.** Codex and other local agents run on the user's machine, with platform coordination and traceability.
- **Capabilities are reusable.** A useful resource can become an instruction/capability that future Missions can reuse.
- **Usage is auditable.** Didian distinguishes planned capability selection from actual runtime usage.
- **Knowledge stays connected.** Resources, Missions, generated capabilities, and outputs are meant to flow into Atlas.

## Current Demo Highlights

- AI Inbox with captured resource cards.
- Capability recommendation and manual capability creation entry.
- Capability direction confirmation flow.
- Skill/capability library.
- Mission board and Mission detail pages.
- Mission capability selection.
- Runtime capability injection and actual usage reporting API.
- Atlas prototype with built-in capability prompts and resource packs.
- Desktop app shell with Didian branding.

## Submission Demo Script

The recommended product demo should show:

1. Open Didian and show the AI Inbox.
2. Save or inspect a captured web resource.
3. Trigger "make capability" from the resource card.
4. Show the capability direction flow.
5. Open the capability library.
6. Create or open a Mission.
7. Attach/use a capability in the Mission.
8. Show Mission detail usage records.
9. Show Atlas as the memory surface where resources and capabilities can be reused.

## Current Limitations

- Some internal APIs and database tables still use the historical `issue` and `skill` names. The user-facing product language is being migrated to Mission and capability.
- Public hosted demo deployment is not included in this repository by default.
- The desktop package can be built locally, but distribution signing/notarization should be configured before a public release.
- Atlas is still evolving from demo/fixture content into a fully persistent knowledge graph.

## Local Demo Commands

```bash
cd /Users/duang777/Developer/work/xunlei/multica-resource-workbench-remove-discord-card
make setup-worktree
make start-worktree
```

Open the printed frontend URL, usually:

```text
http://localhost:13877
```

## Desktop Package Command

```bash
cd /Users/duang777/Developer/work/xunlei/multica-resource-workbench-remove-discord-card
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm -C apps/desktop package -- --mac --arm64 --publish never
```

The package output is expected under:

```text
apps/desktop/dist/
```
