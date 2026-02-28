# Weather Station Board

Raspberry Pi + Chromium kiosk で動く、案内掲示板風の天気ダッシュボードです。

## 30秒でわかる

- 主要都市 + 長野県エリアの天気を1画面で表示
- JMAの警報・注意報（生文）と Raspberry Pi の稼働状況を同時に確認
- Chromium kiosk + autostart 対応で、電源投入後に掲示板としてすぐ使える

- 主要都市 + 長野県エリア表示
- 警報・注意報（JMA生文）
- Raspberry Pi ステータス表示（温度/負荷/メモリ/ディスク/稼働/IP）
- 多言語ローテーション（ja/en/zh/ko）
- モバイル表示対応

## Stack

- Runtime: [Bun](https://bun.sh)
- Frontend: Vanilla HTML/CSS/TS (bundled with `bun build`)
- API: Open-Meteo + JMA + local `/api/pi-status`

## Quick Start

```bash
cd weather-station
bun install
bun run build
bun run start
```

open: `http://127.0.0.1:8788`

## Scripts

- `bun run dev` — Bun server watch mode
- `bun run start` — start server
- `bun run build` — build `src/app.ts` -> `public/app.js`
- `bun run build:watch` — frontend build watch
- `bun run watch` — server + frontend watch
- `bun run test` — test runner

## Kiosk / Autostart (Raspberry Pi)

このリポジトリには起動スクリプトが含まれています:

- `scripts/start-weather-station.sh`
- `start-weather-station.sh`（wrapper）

LXDE autostart 例:

```ini
[Desktop Entry]
Type=Application
Name=Weather Station Board
Exec=/home/pi/workspace/weather-station/start-weather-station.sh
X-GNOME-Autostart-enabled=true
Terminal=false
```

## Data Sources

- Weather: Open-Meteo (CC BY 4.0)
- Warnings: JMA warning JSON (`warning/*.json`)

## Notes

- 警報・注意報は生文表示を優先しており、日本語のまま表示します。
- トレンド矢印は API の「30分前気温差分」で算出します。

## License

MIT
