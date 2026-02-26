#!/usr/bin/env bash
set -euo pipefail

cd /home/pi/clawd/weather-station
pkill -f "weather-station/src/server.ts" >/dev/null 2>&1 || true
pkill -f "weather-station/server.py" >/dev/null 2>&1 || true

exec bun --watch src/server.ts
