# Didian

Didian is an AI resource workbench for turning scattered browser tabs, download links, bookmarks, and cloud-drive files into a structured, deduplicated, searchable resource library.

The product starts before files reach the drive. A user can capture the current browser context, create a resource task, route it to a local Agent runtime such as Codex, Claude Code, Cursor Agent, or OpenCode, review the proposed operations, and then write approved artifacts into a mock or connected drive workspace.

**English | [简体中文](README.zh-CN.md)**

## Product Shape

- **Browser-to-drive workflow**: capture tabs, pages, links, and local context before resources lose provenance.
- **Local Agent runtime**: execute resource tasks on the user's machine through a daemon that detects available Agent CLIs and streams progress back to the workbench.
- **Dynamic task graph**: show scanning, extraction, matching, merging, planning, confirmation, execution, indexing, and follow-up Q&A as explicit steps.
- **Adapter-based drive layer**: use `MockDriveAdapter` for the MVP, with room for local-folder, browser-assisted, or official cloud-drive adapters later.
- **Human confirmation gate**: require review before writing to a drive workspace; destructive operations are disabled for the MVP.
- **Traceable artifacts**: generate resource indexes, comparison tables, reuse checklists, and next-step plans with source references.

## Architecture

```text
Browser / Extension
  -> Web Workbench
  -> Go API + Task Queue
  -> Local Daemon / Runtime
  -> Codex / Claude Code / Cursor Agent / OpenCode
  -> Artifacts + Proposed Actions
  -> Mock Drive or Adapter-backed Workspace
```

Core areas:

- `apps/web/`: Next.js platform wiring for the workbench.
- `apps/extension/`: browser capture entry point.
- `server/`: Go API, task queue, WebSocket, and daemon APIs.
- `server/internal/daemon/`: local runtime execution lifecycle.
- `packages/core/`: headless business logic, schemas, API client, hooks, and stores.
- `packages/ui/`: reusable UI primitives.
- `packages/views/`: shared product views for web and desktop.
- `packages/adapters/`: drive adapter implementations.
- `tasks/`: implementation plan and task checklist.

## Development

Requirements: Node.js, pnpm, Go, Docker, and PostgreSQL-compatible local services as described by the project scripts.

```bash
pnpm install
cp .env.example .env
make setup
make start
```

Useful checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
make test
make check
```

Read `CLAUDE.md` before code changes. It is the root engineering guide for local Agent work in this repository.

## Status

Didian is in MVP build-out. The first milestones focus on the resource workbench shell, runtime visibility, browser capture payloads, local Agent execution, mock-drive writes, and artifact generation.

## License

See [LICENSE](LICENSE).
