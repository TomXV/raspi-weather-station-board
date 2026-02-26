#!/usr/bin/env bash
set -euo pipefail

cd /home/pi/clawd/weather-station

# 既存の常駐サーバーを落としてポート競合を防ぐ
pkill -f "weather-station/src/server.ts" >/dev/null 2>&1 || true
pkill -f "weather-station/server.py" >/dev/null 2>&1 || true

cleanup() {
  pkill -P $$ >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

bun --watch src/server.ts &
SERVER_PID=$!

bun run build:watch &
WEBPACK_PID=$!

wait $SERVER_PID $WEBPACK_PID
