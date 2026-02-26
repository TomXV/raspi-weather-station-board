#!/usr/bin/env bash
set -e
export DISPLAY=:0
export XAUTHORITY=/home/pi/.Xauthority
pkill -f "weather-station/server.py" >/dev/null 2>&1 || true
pkill -f "bun server.ts" >/dev/null 2>&1 || true
pkill -f "chromium.*127.0.0.1:8788" >/dev/null 2>&1 || true
nohup bun /home/pi/clawd/weather-station/server.ts >/tmp/weather-station-server.log 2>&1 &
sleep 2
exec chromium --kiosk --noerrdialogs --disable-infobars --no-first-run --password-store=basic http://127.0.0.1:8788/
