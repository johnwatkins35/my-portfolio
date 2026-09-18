#!/usr/bin/env bash
# Serve SysDesk on all interfaces so you can reach it from another machine.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
echo "SysDesk at http://0.0.0.0:${PORT}"
exec python3 -m http.server "$PORT" --bind 0.0.0.0
