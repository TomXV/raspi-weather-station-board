import i18n from "../src/i18n.toml";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Loc {
  id: string;
  lat: number;
  lon: number;
  name_zh: string;
  region_zh: string;
}

interface WmoEntry {
  code: number;
  en: string;
  zh?: string;
}

interface WarningArea {
  code: string;
  label_ja: string;
  label_zh?: string;
}

interface I18nData {
  cities: Loc[];
  nagano: Loc[];
  warning_areas: WarningArea[];
  wmo: WmoEntry[];
}

const data = i18n as unknown as I18nData;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function wmoZh(code: number): string {
  const entry = data.wmo.find((w) => w.code === code);
  return entry?.zh ?? entry?.en ?? "未知";
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

function buildWeatherSentence(nameZh: string, weather: any): string {
  const temp = Math.round(weather.current.temperature_2m);
  const maxTemp = Math.round(weather.daily.temperature_2m_max[0]);
  const minTemp = Math.round(weather.daily.temperature_2m_min[0]);
  const humidity = Math.round(weather.current.relative_humidity_2m);
  const windMs = (weather.current.wind_speed_10m / 3.6).toFixed(1);
  const weatherZh = wmoZh(weather.current.weather_code);
  return (
    `${nameZh}，天气${weatherZh}，当前气温${temp}摄氏度，` +
    `最高气温${maxTemp}度，最低气温${minTemp}度，` +
    `湿度${humidity}百分比，风速每秒${windMs}米。`
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
      target_lang: "ZH",
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
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes().toString().padStart(2, "0");

  const parts: string[] = [];

  // 1. Time announcement
  parts.push(
    `这是${year}年${month}月${day}日，${hour}时${minute}分左右的天气预报。`,
  );

  // 2. Major cities
  parts.push("以下是主要城市的天气情况。");
  for (const city of data.cities) {
    try {
      const weather = await fetchWeather(city.lat, city.lon);
      parts.push(buildWeatherSentence(city.name_zh, weather));
    } catch (e) {
      console.error(`[skip] ${city.name_zh}: ${e}`);
    }
  }

  // 3. Nagano regions
  parts.push("以下是长野县各地的天气情况。");
  for (const region of data.nagano) {
    try {
      const weather = await fetchWeather(region.lat, region.lon);
      const label = region.region_zh ?? region.name_zh;
      parts.push(buildWeatherSentence(label, weather));
    } catch (e) {
      console.error(`[skip] ${region.region_zh ?? region.name_zh}: ${e}`);
    }
  }

  // 4. Warnings
  parts.push("以下是气象警报与注意事项。");

  const warningItems: { labelZh: string; headlineJa: string }[] = [];
  for (const area of data.warning_areas) {
    try {
      const res = await fetch(
        `https://www.jma.go.jp/bosai/warning/data/warning/${area.code}.json`,
      );
      if (!res.ok) continue;
      const warningData = await res.json();
      const headline = (warningData.headlineText ?? "").trim();
      if (headline && !headline.includes("解除")) {
        warningItems.push({
          labelZh: area.label_zh ?? area.label_ja,
          headlineJa: headline,
        });
      }
    } catch (e) {
      console.error(`[skip warning] ${area.label_zh ?? area.label_ja}: ${e}`);
    }
  }

  if (warningItems.length > 0) {
    try {
      const texts = warningItems.map((w) => w.headlineJa);
      const translated = await translateTexts(texts);
      for (let i = 0; i < warningItems.length; i++) {
        parts.push(`${warningItems[i].labelZh}：${translated[i]}`);
      }
    } catch (e) {
      console.error(`[DeepL error]: ${e}`);
      for (const w of warningItems) {
        parts.push(`${w.labelZh}：${w.headlineJa}`);
      }
    }
  } else {
    parts.push("目前没有明显的气象警报或注意事项。");
  }

  return parts.join("\n");
}

// ─── TTS synthesis & playback ──────────────────────────────────────────────────

const EDGE_TTS = "/home/pi/.npm-global/lib/node_modules/openclaw/node_modules/node-edge-tts/bin.js";

async function synthesizeChunk(text: string, outFile: string): Promise<void> {
  const proc = Bun.spawn(
    ["node", EDGE_TTS, "-v", "zh-CN-XiaoyiNeural", "-l", "zh-CN", "--timeout", "30000", "-t", text, "-f", outFile],
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
    const tmp = `/tmp/weather-tts-zh-chunk-${i}.mp3`;
    process.stdout.write(`  [${i + 1}/${lines.length}] ${lines[i].slice(0, 50)}...\n`);
    await synthesizeChunk(lines[i], tmp);
    tmpFiles.push(tmp);
  }

  const listFile = "/tmp/weather-tts-zh-list.txt";
  const outputFile = "/tmp/weather-tts-zh-output.mp3";
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
