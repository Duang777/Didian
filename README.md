<div align="center">

# 🧩 Didian

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Go](https://img.shields.io/badge/Go-1.26-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-Modified_Apache_2.0-8A2BE2?style=for-the-badge)

**AI resource workbench — from browser tabs to structured, searchable, deduplicated resource libraries.**

**[English](README.md) | [简体中文](README.zh-CN.md)**

</div>

> Didian captures what you find in the browser before it disappears into downloads and bookmarks, dispatches it to a local AI agent runtime, and turns it into a structured, searchable, and traceable resource library — with human confirmation at every write step.

<div align="center">
  <img src="demo-recording/f2e10b0cfdc8f4935014e58e9e44dc1c.png" width="600" alt="Didian Mission Detail view — AI resource workspace with file tree, agent log, and evidence">
  <br><br>
  <a href="#-concept">Concept</a> · <a href="#-features">Features</a> · <a href="#-quick-start">Quick Start</a> · <a href="#-tech-stack">Tech Stack</a> · <a href="#-roadmap">Roadmap</a>
</div>

---

## 💡 Concept

Didian is not a chatbot bolted onto a cloud drive. It is a full browser-to-drive resource workflow:

1. **Capture** — browser extension collects active tabs, links, downloads, bookmarks, and search results before the context is lost.
2. **Dispatch** — the AI Inbox creates a Mission and routes it to a local Agent runtime (Codex, Claude Code, Cursor Agent, or OpenCode).
3. **Execute** — the local daemon detects available CLIs, runs the agent in an isolated workdir, and streams progress — input, understanding, plan, execution log, evidence, review, artifacts, and memory — back to the workbench.
4. **Review** — the user inspects evidence, proposed operations, and generated artifacts before approving any write. Destructive operations (delete, overwrite, batch move) are disabled for the MVP.
5. **Index** — approved artifacts land in an Atlas Workspace: structured, deduplicated, and ready for follow-up Q&A with source provenance preserved.

The first mile is the browser. The last mile is a structured, permanent memory.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **AI Inbox** | Capture browser tabs, links, and downloads into resource tasks with full provenance — URL, source tab, capture time, and surrounding context |
| **Mission Workspace** | Dynamic task graph showing scan, extract, match, plan, confirm, execute, and index as explicit, inspectable steps |
| **Local Agent Runtime** | Daemon auto-detects Codex, Claude Code, Cursor Agent, and OpenCode from `PATH` — no cloud lock-in, no data leaves your machine |
| **Atlas Workspace** | Structured, searchable, deduplicated resource library with agent-generated artifacts, evidence, and decisions |
| **Human Confirmation Gate** | Review every proposed action before writing to the drive workspace; destructive operations are blocked by default |
| **Adapter-based Drive** | `MockDriveAdapter` for MVP development, with a clean interface for local folder, cloud-drive, or MCP adapters |
| **Traceable Artifacts** | Resource indexes, comparison tables, reuse checklists, and next-step plans with source references and citations |
| **Browser Extension** | Passive capture of active browser context — tabs, selected text, download links — before provenance is lost |

---

## 🚀 Quick Start

```bash
git clone https://github.com/didian-ai/didian.git
cd didian
pnpm install
cp .env.example .env
make setup
make start
```

Verify the stack is running:

```bash
pnpm typecheck
pnpm lint
pnpm test
make test
make check
```

<details>
<summary>⚙️ Environment Variables</summary>

```bash
cp .env.example .env
```

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `DIDIAN_CODEX_PATH` | Custom path to Codex binary | No |
| `DIDIAN_CODEX_MODEL` | Daemon-wide default model for Codex | No |

</details>

<details>
<summary>🔌 Connect Your Local Codex</summary>

Didian dispatches work to a local daemon, which detects the `codex` CLI on your machine and executes Missions locally.

```bash
didian setup self-host
```

Or from source before the CLI is installed:

```bash
cd server
go run ./cmd/didian setup self-host
```

`setup self-host` configures `http://localhost:8080` as the API, `http://localhost:3000` as the app, opens the browser login flow, discovers your workspaces, and starts the daemon. The daemon auto-detects Codex from `PATH`; on macOS it also checks the Codex binary bundled in ChatGPT.app and Codex.app.

Verify the Codex runtime is online:

```bash
didian daemon status
didian runtime list --output json
```

In the runtime output, the Codex row should have `provider` set to `codex` and `status` set to `online`. Once the Codex runtime is online and an Agent is bound to it, newly created Missions can be assigned to that Agent from the UI.

**Troubleshooting.** If `daemon status` shows only another agent, or `runtime list` shows the Codex runtime as `offline`, restart the daemon:

```bash
codex --version
didian daemon stop
didian daemon start
```

On macOS, if Codex is bundled inside ChatGPT.app but still not detected, pin the path explicitly:

```bash
DIDIAN_CODEX_PATH=/Applications/ChatGPT.app/Contents/Resources/codex \
didian daemon start
```

</details>

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Next.js 16, TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui, Base UI |
| Desktop | Electron |
| Mobile | Expo / React Native |
| Backend | Go 1.26, Chi router, sqlc, gorilla/websocket |
| Database | PostgreSQL |
| State | TanStack Query 5, Zustand 5 |
| Charts | Recharts 3 |
| Extension | Chrome Extension (MV3) |

<details>
<summary>📁 Project Structure</summary>

```
didian/
├── apps/
│   ├── web/                   # Next.js App Router platform
│   ├── extension/             # Chrome extension — passive browser capture
│   ├── desktop/               # Electron desktop app
│   └── mobile/                # Expo / React Native (iOS)
├── server/
│   ├── cmd/didian/            # CLI entry point
│   ├── internal/daemon/       # Local runtime execution lifecycle
│   ├── internal/handler/      # Chi router API handlers
│   └── migrations/            # Database migrations
├── packages/
│   ├── core/                  # Headless logic, schemas, API client, hooks, stores
│   ├── ui/                    # Reusable UI primitives (shadcn/ui)
│   ├── views/                 # Shared product views for web and desktop
│   └── adapters/              # Drive adapter implementations (Mock, Local, etc.)
├── tasks/                     # Implementation plan and task checklist
├── docs/                      # Product requirements, technical plans, and reviews
├── demo-screenshots/          # Demo screenshots
├── CLAUDE.md                  # Engineering guide for local AI agent work
└── llms.txt                   # Plain-text README for LLM discoverability
```

</details>

---

## 🗺️ Roadmap

- [x] AI Inbox — capture browser tabs, links, and downloads with provenance
- [x] Mission Workspace — dynamic task graph with inspectable execution steps
- [x] Atlas Workspace — structured, searchable, deduplicated resource library
- [x] Local Agent runtime detection — Codex, Claude Code, Cursor Agent, OpenCode
- [x] Flowix-style document workspace for Mission Detail
- [x] Demo fixtures, screenshots, and recording
- [x] Atlas workspace browser and re-entry
- [ ] Browser extension — passive capture of active context
- [ ] Search and full-text recall across Atlas collections
- [ ] Cloud-drive adapter integration (Local Drive, official cloud APIs)
- [ ] Mobile companion app
- [ ] Real-time collaboration and multi-agent squads

---

## 🤝 Contributing

Fork → `feature/name` → PR

Read `CLAUDE.md` before contributing. It is the root engineering guide for local AI agent work in this repository and covers architecture, package boundaries, state management, and code conventions.

---

## 📄 License

Didian. Licensed under a [modified Apache License 2.0](LICENSE).