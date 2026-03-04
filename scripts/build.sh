#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building frontend..."
(cd "$ROOT" && node scripts/build-frontend.mjs)

echo "Build complete. Run with: claudeboard"
