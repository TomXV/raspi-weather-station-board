import i18n from "../src/i18n.toml";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Loc {
  id: string;
  lat: number;
  lon: number;
  name_ja: string;
  region_ja: string;
}

interface WmoEntry {
  code: number;
  ja: string;
}

interface WarningArea {
  code: string;
  label_ja: string;
}

interface I18nData {
  cities: Loc[];
  nagano: Loc[];
  warning_areas: WarningArea[];
  wmo: WmoEntry[];
}

const data = i18n as unknown as I18nData;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function wmoJa(code: number): string {
  const entry = data.wmo.find((w) => w.code === code);
  return entry?.ja ?? "不明";
}

async function fetchWeather(lat: number, lon: number): Promise<any> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&hourly=temperature_2m&past_hours=2&forecast_hours=1` +
    `&timezone=Asia%2FTokyo&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function buildWeatherSentence(label: string, weather: any): string {
  const temp = Math.round(weather.current.temperature_2m);
  const maxTemp = Math.round(weather.daily.temperature_2m_max[0]);
  const minTemp = Math.round(weather.daily.temperature_2m_min[0]);
  const humidity = Math.round(weather.current.relative_humidity_2m);
  const windMs = (weather.current.wind_speed_10m / 3.6).toFixed(1);
  const weatherJa = wmoJa(weather.current.weather_code);
  return (
    `${label}、天気は${weatherJa}、現在気温は${temp}度、` +
    `最高気温は${maxTemp}度、最低気温は${minTemp}度、` +
    `湿度は${humidity}パーセント、風速は毎秒${windMs}メートルです。`
  );
}

function naganoLabel(region_ja: string): string {
  return region_ja.endsWith("エリア") ? region_ja : `${region_ja}エリア`;
}

// ─── Build TTS text ────────────────────────────────────────────────────────────

async function buildTtsText(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const parts: string[] = [];

  // 1. 現在時刻アナウンス
  parts.push(
    `${year}年${month}月${day}日、${hour}時${minute}分頃の天気情報をお伝えします。`,
  );

  // 2. 主要都市
  parts.push("主要都市の天気情報をお伝えします。");
  for (const city of data.cities) {
    try {
      const weather = await fetchWeather(city.lat, city.lon);
      parts.push(buildWeatherSentence(city.name_ja, weather));
    } catch (e) {
      console.error(`[skip] ${city.name_ja}: ${e}`);
    }
  }

  // 3. 長野県各地
  parts.push("続いて、長野県各地の天気をお伝えします。");
  for (const region of data.nagano) {
    try {
      const weather = await fetchWeather(region.lat, region.lon);
      parts.push(buildWeatherSentence(naganoLabel(region.region_ja), weather));
    } catch (e) {
      console.error(`[skip] ${region.region_ja}: ${e}`);
    }
  }

  // 4. 警報・注意報
  const warningLines: string[] = [];
  for (const area of data.warning_areas) {
    try {
      const res = await fetch(
        `https://www.jma.go.jp/bosai/warning/data/warning/${area.code}.json`,
      );
      if (!res.ok) continue;
      const warningData = await res.json();
      const headline = (warningData.headlineText ?? "").trim();
      // 解除のみ or 空は無視
      if (headline && !headline.includes("解除")) {
        warningLines.push(`${area.label_ja}では${headline}`);
      }
    } catch (e) {
      console.error(`[skip warning] ${area.label_ja}: ${e}`);
    }
  }

  if (warningLines.length > 0) {
    parts.push(...warningLines);
  } else {
    parts.push("現在、目立った警報・注意報はありません。");
  }

  return parts.join("\n");
}

// ─── TTS synthesis & playback ──────────────────────────────────────────────────

const EDGE_TTS = "/home/pi/.npm-global/lib/node_modules/openclaw/node_modules/node-edge-tts/bin.js";

async function synthesizeChunk(text: string, outFile: string): Promise<void> {
  const proc = Bun.spawn(
    ["node", EDGE_TTS, "-v", "ja-JP-NanamiNeural", "-l", "ja-JP", "--timeout", "30000", "-t", text, "-f", outFile],
    { stdout: "pipe", stderr: "pipe" },
  );
  const code = await proc.exited;
  if (code !== 0) throw new Error(`TTS chunk failed (exit ${code}): ${text.slice(0, 40)}`);
}

async function runTts(text: string): Promise<void> {
  const { unlinkSync } = await import("node:fs");
  const lines = text.split("\n").map((s: string) => s.trim()).filter(Boolean);
  const tmpFiles: string[] = [];

  console.log(`Synthesizing ${lines.length} chunks...`);
  for (let i = 0; i < lines.length; i++) {
    const tmp = `/tmp/weather-tts-chunk-${i}.mp3`;
    process.stdout.write(`  [${i + 1}/${lines.length}] ${lines[i].slice(0, 30)}...\n`);
    await synthesizeChunk(lines[i], tmp);
    tmpFiles.push(tmp);
  }

  const listFile = "/tmp/weather-tts-list.txt";
  const outputFile = "/tmp/weather-tts-output.mp3";
  await Bun.write(listFile, tmpFiles.map((f: string) => `file '${f}'`).join("\n"));

  console.log("Concatenating...");
  const concat = Bun.spawn(
    ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outputFile],
    { stdout: "pipe", stderr: "pipe" },
  );
  await concat.exited;

  for (const f of tmpFiles) { try { unlinkSync(f); } catch {} }

  console.log("Playing audio...");
  const play = Bun.spawn(["ffplay", "-nodisp", "-autoexit", outputFile], { stdout: "inherit", stderr: "inherit" });
  await play.exited;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const ttsText = await buildTtsText();
console.log("=== TTS Text ===");
console.log(ttsText);
console.log("================");
await runTts(ttsText);
