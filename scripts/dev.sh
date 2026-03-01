#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting CCM development servers..."

# Start backend
(cd "$ROOT" && uv run uvicorn ccm.main:app --reload --host 127.0.0.1 --port 8000) &
BACKEND_PID=$!

# Start frontend
(cd "$ROOT/frontend" && npx vite --host 127.0.0.1) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

echo "Backend:  http://127.0.0.1:8000"
echo "Frontend: http://127.0.0.1:5173"

wait
