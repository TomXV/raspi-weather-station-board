import i18n from "../src/i18n.toml";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Loc {
  id: string;
  lat: number;
  lon: number;
  name_en: string;
  region_en: string;
}

interface WmoEntry {
  code: number;
  en: string;
}

interface WarningArea {
  code: string;
  label_en: string;
}

interface I18nData {
  cities: Loc[];
  nagano: Loc[];
  warning_areas: WarningArea[];
  wmo: WmoEntry[];
}

const data = i18n as unknown as I18nData;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function wmoEn(code: number): string {
  const entry = data.wmo.find((w) => w.code === code);
  return entry?.en ?? "Unknown";
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
  const weatherEn = wmoEn(weather.current.weather_code);
  return (
    `${label}. Conditions: ${weatherEn}. ` +
    `Current temperature: ${temp} degrees Celsius. ` +
    `High: ${maxTemp}, Low: ${minTemp}. ` +
    `Humidity: ${humidity} percent. ` +
    `Wind speed: ${windMs} meters per second.`
  );
}

// ─── DeepL translation ─────────────────────────────────────────────────────────

const DEEPL_API_KEY = "ddbe39ab-efdc-9ada-e776-9ee6d2477f2d:fx";
const DEEPL_ENDPOINT = "https://api-free.deepl.com/v2/translate";

async function translateTexts(texts: string[]): Promise<string[]> {
  const res = await fetch(DEEPL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `DeepL-Auth-Key ${DEEPL_API_KEY}`,
    },
    body: JSON.stringify({
      text: texts,
      source_lang: "JA",
      target_lang: "EN-US",
    }),
  });
  if (!res.ok) throw new Error(`DeepL HTTP ${res.status}`);
  const json = await res.json();
  return json.translations.map((t: { text: string }) => t.text);
}

// ─── Build TTS text ────────────────────────────────────────────────────────────

async function buildTtsText(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = MONTHS[now.getMonth()];
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes().toString().padStart(2, "0");

  const parts: string[] = [];

  // 1. Time announcement
  parts.push(
    `This is the weather report for ${month} ${day}, ${year}, around ${hour}:${minute}.`,
  );

  // 2. Major cities
  parts.push("Here is the weather for major cities.");
  for (const city of data.cities) {
    try {
      const weather = await fetchWeather(city.lat, city.lon);
      parts.push(buildWeatherSentence(city.name_en, weather));
    } catch (e) {
      console.error(`[skip] ${city.name_en}: ${e}`);
    }
  }

  // 3. Nagano regions
  parts.push("Now, the weather for Nagano Prefecture.");
  for (const region of data.nagano) {
    try {
      const weather = await fetchWeather(region.lat, region.lon);
      parts.push(buildWeatherSentence(region.region_en, weather));
    } catch (e) {
      console.error(`[skip] ${region.region_en}: ${e}`);
    }
  }

  // 4. Warnings
  parts.push("Now, weather warnings and advisories.");

  const warningItems: { labelEn: string; headlineJa: string }[] = [];
  for (const area of data.warning_areas) {
    try {
      const res = await fetch(
        `https://www.jma.go.jp/bosai/warning/data/warning/${area.code}.json`,
      );
      if (!res.ok) continue;
      const warningData = await res.json();
      const headline = (warningData.headlineText ?? "").trim();
      if (headline && !headline.includes("解除")) {
        warningItems.push({ labelEn: area.label_en, headlineJa: headline });
      }
    } catch (e) {
      console.error(`[skip warning] ${area.label_en}: ${e}`);
    }
  }

  if (warningItems.length > 0) {
    try {
      const texts = warningItems.map((w) => w.headlineJa);
      const translated = await translateTexts(texts);
      for (let i = 0; i < warningItems.length; i++) {
        parts.push(`${warningItems[i].labelEn}: ${translated[i]}`);
      }
    } catch (e) {
      console.error(`[DeepL error]: ${e}`);
      for (const w of warningItems) {
        parts.push(`${w.labelEn}: ${w.headlineJa}`);
      }
    }
  } else {
    parts.push("No significant weather warnings or advisories at this time.");
  }

  return parts.join("\n");
}

// ─── TTS synthesis & playback ──────────────────────────────────────────────────

const EDGE_TTS = "/home/pi/.npm-global/lib/node_modules/openclaw/node_modules/node-edge-tts/bin.js";

async function synthesizeChunk(text: string, outFile: string): Promise<void> {
  const proc = Bun.spawn(
    ["node", EDGE_TTS, "-v", "en-US-JennyNeural", "-l", "en-US", "--timeout", "30000", "-t", text, "-f", outFile],
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
    const tmp = `/tmp/weather-tts-en-chunk-${i}.mp3`;
    process.stdout.write(`  [${i + 1}/${lines.length}] ${lines[i].slice(0, 50)}...\n`);
    await synthesizeChunk(lines[i], tmp);
    tmpFiles.push(tmp);
  }

  const listFile = "/tmp/weather-tts-en-list.txt";
  const outputFile = "/tmp/weather-tts-en-output.mp3";
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
