# Contributing to Claude Panel

Thanks for your interest in contributing! This guide covers development setup, workflow, and conventions.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Python](https://www.python.org/) 3.12+
- [`uv`](https://docs.astral.sh/uv/)
- Git

## Development Setup

```bash
# Clone the repository
git clone https://github.com/codes71/claude-panel.git
cd claude-panel

# Install frontend dependencies
npm --prefix frontend install

# Build frontend into backend static directory
npm run build:frontend

# Start the app locally
npm start
```

For active development with hot-reload on both backend and frontend:

```bash
bash scripts/dev.sh
```

This starts the FastAPI backend on port 8000 and the Vite dev server on port 5173.

## Project Structure

```
claude-panel/
  backend/
    ccm/
      config.py          # App configuration (pydantic-settings)
      main.py            # FastAPI app factory
      models/            # Pydantic request/response models
      routers/           # API route handlers
      services/          # Business logic layer
  frontend/
    src/
      api/               # React Query hooks and API client
      components/        # Shared UI components
      pages/             # Page-level components
      types.ts           # Shared TypeScript types
  bin/
    claude-panel.js       # CLI entrypoint
  scripts/
    build-frontend.mjs   # Frontend build helper
    build.sh             # Shell build shortcut
    dev.sh               # Development server launcher
```

## Code Style

**Backend (Python)**
- FastAPI + Pydantic conventions
- Type hints on all public functions
- Services handle business logic; routers stay thin
- File-based storage (no database)

**Frontend (TypeScript/React)**
- React 19 with React Router and TanStack Query
- MUI v7 component library
- Functional components with hooks

## Pull Request Workflow

1. Fork the repository and create a feature branch from `main`.
2. Make your changes with clear, focused commits.
3. Ensure the app builds and starts without errors:
   ```bash
   npm run build:frontend
   npm start -- --no-open
   ```
4. Open a pull request against `main` with a description of what changed and why.

## Reporting Issues

Use [GitHub Issues](https://github.com/codes71/claude-panel/issues) for bug reports and feature requests. Please include:
- Claude Panel version (`claude-panel --help` shows version)
- OS and Node/Python versions
- Steps to reproduce (for bugs)

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Please read it before participating.
