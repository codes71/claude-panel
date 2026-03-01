#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building frontend..."
(cd "$ROOT/frontend" && npx vite build --outDir "$ROOT/backend/ccm/static")

echo "Build complete. Run with: cd backend && uv run uvicorn ccm.main:app --host 127.0.0.1 --port 8000"
