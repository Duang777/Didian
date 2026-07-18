# Flowix-style Atlas Workspace

## Objective

Didian should borrow Flowix's strongest product feel: a document is not the final artifact shelf; it is the place where the Agent works. The resource workbench should turn messy links, browser captures, notes, and research goals into a Mission Workspace that can be read, edited, handed back to Codex, and reopened later from Atlas.

The target user is a resource-heavy researcher, student, creator, product manager, or engineer who wants to drop chaotic material into Didian and receive a structured, source-backed workspace rather than a one-off chat answer or a static task record.

Success means a user can feel this loop in the UI:

```text
AI Inbox input -> Mission Workspace -> Agent context -> Markdown outputs -> Atlas reuse
```

## Product Shape

Every resource Mission owns an Atlas Workspace. The workspace is represented as a normal folder-like Markdown structure:

```text
AI Agent 项目调研/
  mission.md
  sources/
    browser-use.md
    stagehand.md
    opencode.md
  evidence.md
  decisions.md
  outputs/
    资源索引.md
    项目对比表.md
    可复用清单.md
    下一步行动.md
  agent-log.md
```

The first implementation is a view-model backed workspace using fixture data and local UI state. It must be shaped so later Local Drive Adapter, Mock Drive Adapter, or MCP/CLI persistence can replace fixture content without redesigning the UI.

## User Experience Requirements

- AI Inbox previews the workspace before creating a Mission.
- Mission detail opens as a document workspace, not a classic issue/task page.
- The left side exposes a stable file tree with `mission.md`, `sources/`, `outputs/`, evidence, decisions, and logs.
- The center reads the selected Markdown document using the existing Markdown renderer.
- The right side controls Agent context scope: current document, current workspace, captured sources, outputs, entire Atlas, local downloads, and cloud drive resources.
- Review decisions and output actions are part of the workspace surface, not detached modal-only flows.
- Artifact actions can simulate writing back to Markdown files in the first slice.
- Atlas can reopen a workspace and show the same source/evidence/output structure.

## Technical Decisions

- Use `packages/views/ai-workbench/types.ts` for the first UI contract.
- Keep pure workspace generation helpers in `packages/views/ai-workbench/fixtures.ts` until the contract stabilizes.
- Reuse existing `packages/views/common/markdown.tsx` and the `@didian/ui` Markdown renderer.
- Do not build a custom Markdown editor in this slice. The repository already has Tiptap-based `ContentEditor`; wire it in later when persistence is ready.
- Do not add a new persistence layer in this slice. Workspace files are fixtures plus local UI state.
- Do not copy Flowix source code. We borrow the product pattern, not the implementation.

## Commands

```bash
pnpm --filter @didian/views test -- ai-workbench
pnpm --filter @didian/views typecheck
pnpm typecheck
pnpm dev:web
```

## Project Structure

```text
packages/views/ai-workbench/types.ts
  Atlas Workspace view model.

packages/views/ai-workbench/fixtures.ts
  Workspace fixture generation and demo workspaces.

packages/views/ai-workbench/fixtures.test.ts
  Pure tests for workspace generation and Mission handoff content.

packages/views/ai-workbench/missions/mission-detail-page.tsx
  Mission Workspace document UI.

packages/views/ai-workbench/missions/mission-detail-page.test.tsx
  Workspace file switching, context scope, and write-back behavior tests.

packages/views/ai-workbench/ai-inbox/ai-inbox-page.tsx
  Workspace preview and Mission handoff prompt.

packages/views/ai-workbench/atlas/atlas-page.tsx
  Atlas Workspace browser.
```

## Boundaries

- Always: keep the AI Inbox -> Mission -> Atlas path coherent.
- Always: preserve provenance in generated workspace files.
- Always: keep UI usable at desktop and mobile widths.
- Always: test new pure logic and core UI behavior.
- Ask first: adding new dependencies, persistence schema, real filesystem writes, MCP service changes.
- Never: copy Flowix code, build a partial custom editor, add a workflow builder, or expose destructive drive actions without review.

## Acceptance Criteria

- AI Inbox shows a Mission Workspace preview derived from the current input.
- Creating a Mission includes workspace handoff instructions in the Mission description.
- Mission detail defaults to `mission.md` and renders Markdown content.
- Users can switch workspace files from a tree without losing the page.
- Users can toggle Agent context scopes and see the scope change reflected in UI state.
- Users can trigger an output write-back action that updates or opens an output Markdown file in the current session.
- Atlas shows the workspace associated with a completed Collection and lets users switch workspace files.
- Focused `@didian/views` tests pass.

## Not Doing

- Full Flowix or Obsidian clone.
- Plugin system.
- Real local file synchronization.
- Multiplayer document editing.
- Full Markdown editing UX.
- LiveContext-style workflow builder.
- New backend schema for Atlas resources.

## Open Questions

- When should the fixture workspace become a persisted workspace: after Mission creation, after Mission completion, or only after user review?
- Should the first real persistence adapter write to Local Drive, Mock Drive, or both?
- Should Agent context scopes become permissions, prompt metadata, or both?
