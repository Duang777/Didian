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
  outputs/              # created only after the user or AI explicitly writes an output
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
- The current Markdown file is the Agent surface. Users select text in the document and invoke a compact floating AI action from that selection.
- Review decisions, source imports, and output actions write into the current Markdown draft first; saving the `.md` is the confirmation boundary.
- Artifact actions should call an AI edit/write adapter when available. They should not simulate "AI output" with hard-coded frontend templates.
- Atlas can reopen a workspace and show the same source/evidence/output structure.

## Technical Decisions

- Use `packages/views/ai-workbench/types.ts` for the first UI contract.
- Keep pure workspace generation helpers in `packages/views/ai-workbench/fixtures.ts` until the contract stabilizes.
- Reuse existing `packages/views/common/markdown.tsx` and the `@didian/ui` Markdown renderer.
- Do not build a custom Markdown editor in this slice. The repository already has Tiptap-based `ContentEditor`; wire it in later when persistence is ready.
- Do not add a new persistence layer in this slice. Workspace files are fixtures plus local UI state.
- Real AI selected-text edits are routed through `/api/atlas-preview/ai-edit`, an OpenAI-compatible chat completions adapter configured by `DIDIAN_LLM_*` or `OPENAI_*` environment variables. If no model endpoint is configured, the UI should show an AI edit failure instead of inventing a fake response.
- Do not copy Flowix source code. We borrow the product pattern, not the implementation.

## Commands

```bash
pnpm --filter @didian/views test -- ai-workbench
pnpm --filter @didian/views typecheck
pnpm typecheck
pnpm dev:web
```

## Verification Notes

- For Atlas responsive checks, prefer DOM, console, and layout measurements over reading screenshot images. Screenshot/image inspection can consume too much agent context; only capture images when a human needs the artifact or when pixel-level visual QA is explicitly requested.
- Mobile-width Atlas should default to the Markdown document canvas with Notebook collapsed. Desktop-width Atlas should keep the Notebook available as a resizable side panel.
- Atlas should feel like one Mission owning one Markdown folder. The primary object is the current `.md` file, usually `mission.md` plus optional `notes/`, `sources/`, `evidence.md`, and outputs.
- AI interaction belongs inside the current Markdown document workflow: the user selects text, opens the floating AI action next to that selection, gives an instruction, AI edits that selected md span directly, and the user saves the document. Do not reintroduce a top toolbar full of one-off AI skill buttons, a permanent AI input, or a "preview Markdown patch / append patch" modal.
- The floating AI action must dismiss on outside click, Escape, file switch, and successful write-back. It should not remain pinned after the selected text is gone.
- Do not allocate a persistent right-side Agent workspace for Atlas.
- Mission material import should write selected material into the current md draft first. It should not create a separate patch confirmation step; the save button is the confirmation boundary.
- Do not pre-create output Markdown files such as resource indexes, comparison tables, reusable checklists, or next-action docs when the workspace first opens. They are expected outputs, not existing files. Create them only after the user explicitly asks AI to generate/write one, imports material into a draft, or creates a note.

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

- Copy Flowix code or UI verbatim.
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
