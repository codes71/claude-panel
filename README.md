<p align="center">
  <img src="frontend/public/logo.svg" alt="ClaudeBoard" width="120" height="120" />
</p>

<h1 align="center">ClaudeBoard</h1>

<p align="center">
  Local dashboard and control panel for Claude Code
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/claudeboard"><img src="https://img.shields.io/npm/v/claudeboard.svg" alt="npm version" /></a>
  <a href="https://github.com/codes71/claudeboard/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/claudeboard.svg" alt="license" /></a>
  <img src="https://img.shields.io/badge/platform-linux%20%7C%20macos-blue" alt="platform" />
  <a href="https://github.com/codes71/claudeboard"><img src="https://img.shields.io/github/stars/codes71/claudeboard.svg?style=social" alt="GitHub stars" /></a>
</p>

---

Manage configuration, plugins, commands, MCP servers, skill providers, and multiple Claude Code instances from a single UI.

## Features

- **Dashboard** -- token breakdown, top consumers, optimization recommendations
- **Settings** -- environment variables, hooks, behavioral toggles
- **Plugin Manager** -- list, enable/disable, and inspect installed plugins with token estimates
- **MCP Servers** -- add, remove, and toggle Model Context Protocol servers
- **CLAUDE.md Editor** -- recursive tree scanner with live editing for global and per-project files
- **Custom Commands** -- full CRUD for slash commands with namespace grouping
- **Skill Providers** -- add git-based providers, discover and install skills
- **Skill Catalog** -- unified view of installable skills across all providers
- **Marketplace** -- browse and install plugins from marketplaces
- **Claude Code Router** -- view provider status, models, routing rules
- **Multi-Instance** -- switch between multiple `~/.claude*` configuration profiles
- **Visibility** -- overview of commands, agents, and memory files

## Platform Support

| Platform | Status |
|----------|--------|
| Linux    | Supported |
| macOS    | Supported |
| Windows  | Not yet supported (WSL may work but is untested) |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Python](https://www.python.org/) 3.12+
- [`uv`](https://docs.astral.sh/uv/) (Python package manager)

## Install

```bash
npm install -g claudeboard
```

Or run without installing globally:

```bash
npx claudeboard
```

## Usage

```bash
claudeboard
```

By default, ClaudeBoard tries port `8787`. If that port is busy, it automatically selects a free port and prints the URL.

### CLI Options

| Flag | Description |
|------|-------------|
| `--port <number>` | Use a specific port (fails if busy) |
| `--no-open` | Don't open the browser automatically |
| `--help` | Show usage information |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CCM_PORT` | Override the default port | `8787` |

## Troubleshooting

**`uv` not found**
Install uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`

**Python not found**
Ensure `python3` (or `python`) 3.12+ is installed and on your PATH.

**Port already in use**
Either let ClaudeBoard auto-select a free port, use `--port <number>` with a different port, or set `CCM_PORT` to change the default.

**First run is slow**
On first launch, `uv` creates a Python virtual environment and installs backend dependencies. Subsequent starts are fast.

## Local Development

Build frontend assets into the backend static directory:

```bash
npm run build:frontend
```

Run the packaged launcher locally:

```bash
npm start
```

Start both backend and frontend dev servers (hot-reload):

```bash
bash scripts/dev.sh
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development setup and contribution guidelines.

## Publishing

The `prepack` lifecycle script automatically runs `npm ci` in the frontend directory and builds static assets, so `npm publish` produces a ready-to-run package.

## License

[MIT](LICENSE)

## Disclaimer

ClaudeBoard is an independent open-source project and is not affiliated with, endorsed by, or officially connected to Anthropic, PBC. "Claude" is a trademark of Anthropic.
