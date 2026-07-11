# Self-Hosting Setup (for AI Agents)

This document is designed for AI agents to execute. Follow these steps exactly to deploy a local Didian instance and connect to it.

## Prerequisites

- Docker and Docker Compose installed
- Homebrew installed (for CLI)
- At least one AI agent CLI on PATH: `claude` or `codex`

## Install

```bash
# Install CLI + provision self-host server
curl -fsSL https://raw.githubusercontent.com/didian-ai/didian/main/scripts/install.sh | bash -s -- --with-server

# Configure CLI for localhost, authenticate, and start daemon
didian setup self-host
```

Wait for the server output `✓ Didian server is running and CLI is ready!` before running `didian setup self-host`.

**Expected result:**
- Frontend at http://localhost:3000
- Backend at http://localhost:8080
- `didian` CLI installed and configured for localhost

## Alternative: Manual Setup

```bash
git clone https://github.com/didian-ai/didian.git
cd didian
make selfhost
brew install didian-ai/tap/didian
didian setup self-host
```

The `didian setup self-host` command will:
1. Configure CLI to connect to localhost:8080 / localhost:3000
2. Open a browser for login — use the emailed code, or the generated code printed in backend logs when Resend is unset
3. Discover workspaces automatically
4. Start the daemon in the background

## Verification

```bash
didian daemon status
```

Should show `running` with detected agents.

## Stopping

```bash
# Stop the daemon
didian daemon stop

# Stop all Docker services
cd didian
make selfhost-stop
```

## Custom Ports

If the default ports (8080/3000) are in use:

1. Edit `.env` and change `PORT` and `FRONTEND_PORT`
2. Run `make selfhost`
3. Run `didian setup self-host --port <PORT> --frontend-port <FRONTEND_PORT>`

## Troubleshooting

- **Backend not ready:** `docker compose -f docker-compose.selfhost.yml logs backend`
- **Frontend not ready:** `docker compose -f docker-compose.selfhost.yml logs frontend`
- **Daemon issues:** `didian daemon logs`
- **Health checks:** `curl http://localhost:8080/health` for liveness, `curl http://localhost:8080/readyz` for dependency-aware readiness
