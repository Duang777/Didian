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

## Connect Your Local Codex

Didian does not run Codex in the browser. It dispatches work to a local daemon, and the daemon detects the `codex` CLI on your machine, registers a Codex runtime, and executes assigned Missions locally. The normal user path is CLI-first: run setup once, then keep the daemon running.

For a local self-hosted development server, start the web/API stack first, then run the setup flow:

```bash
didian setup self-host
```

When developing from this repository before installing the CLI, run the same command through the source CLI:

```bash
cd server
go run ./cmd/didian setup self-host
```

`setup self-host` configures `http://localhost:8080` as the API, `http://localhost:3000` as the app, opens the browser login flow, discovers your workspaces, and starts the daemon. The daemon auto-detects Codex from `PATH`; on macOS it also checks the Codex binary bundled in ChatGPT.app and Codex.app.

Verify that setup found Codex:

```bash
didian daemon status
didian runtime list --output json
```

With the source CLI:

```bash
go run ./cmd/didian daemon status
go run ./cmd/didian runtime list --output json
```

In the runtime output, the Codex row should have `provider` set to `codex` and `status` set to `online`. Once the Codex runtime is online and an Agent is bound to it, newly created Missions can be assigned to that Agent from the UI.

If an already-created Mission is still unassigned, attach it to the Codex-backed Agent from the CLI:

```bash
didian agent list --output json
didian issue update DID-8 --assignee-id <agent-id> --status todo
```

### Troubleshooting Codex Detection

If `daemon status` shows only another agent, or `runtime list` shows the Codex runtime as `offline`, first restart the daemon after confirming Codex is available:

```bash
codex --version
didian daemon stop
didian daemon start
```

On macOS, if Codex is bundled inside ChatGPT.app and still is not detected, pin the path explicitly:

```bash
didian daemon stop

DIDIAN_CODEX_PATH=/Applications/ChatGPT.app/Contents/Resources/codex \
didian daemon start
```

The equivalent source-CLI debugging flow is:

```bash
cd server

export DIDIAN_SERVER_URL=http://localhost:8080
export DIDIAN_WORKSPACE_ID=<workspace-id>

DIDIAN_CODEX_PATH=/Applications/ChatGPT.app/Contents/Resources/codex \
go run ./cmd/didian daemon start --foreground
```

Keep `didian daemon start` running while you create or assign Missions. You can set `DIDIAN_CODEX_MODEL=<model-id>` to choose a daemon-wide default model.

## Status

Didian is in MVP build-out. The first milestones focus on the resource workbench shell, runtime visibility, browser capture payloads, local Agent execution, mock-drive writes, and artifact generation.

## License

See [LICENSE](LICENSE).
