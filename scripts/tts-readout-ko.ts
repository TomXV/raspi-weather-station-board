import i18n from "../src/i18n.toml";
import { resolveEdgeTtsBin, streamToText } from "./tts-edge";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Loc {
  id: string;
  lat: number;
  lon: number;
  name_ko: string;
  region_ko?: string;
}

interface WmoEntry {
  code: number;
  en: string;
  ko?: string;
}

interface WarningArea {
  code: string;
  label_ja: string;
  label_ko?: string;
}

interface I18nData {
  cities: Loc[];
  nagano: Loc[];
  warning_areas: WarningArea[];
  wmo: WmoEntry[];
}

const data = i18n as unknown as I18nData;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function wmoKo(code: number): string {
  const entry = data.wmo.find((w) => w.code === code);
  return entry?.ko ?? entry?.en ?? "알 수 없음";
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

function buildWeatherSentence(nameKo: string, weather: any): string {
  const temp = Math.round(weather.current.temperature_2m);
  const maxTemp = Math.round(weather.daily.temperature_2m_max[0]);
  const minTemp = Math.round(weather.daily.temperature_2m_min[0]);
  const humidity = Math.round(weather.current.relative_humidity_2m);
  const windMs = (weather.current.wind_speed_10m / 3.6).toFixed(1);
  const weatherKo = wmoKo(weather.current.weather_code);
  return (
    `${nameKo}. 날씨는 ${weatherKo}, 현재 기온은 ${temp}도, 최고 기온 ${maxTemp}도, 최저 기온 ${minTemp}도, ` +
    `습도 ${humidity}퍼센트, 풍속 초속 ${windMs}미터입니다.`
  );
}

// ─── DeepL translation ─────────────────────────────────────────────────────────

const DEEPL_API_KEY = process.env.DEEPL_API_KEY ?? "";
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
      target_lang: "KO",
    }),
  });
  if (!res.ok) throw new Error(`DeepL HTTP ${res.status}`);
  const json = await res.json();
  return json.translations.map((t: { text: string }) => t.text);
}

// ─── Build TTS text ────────────────────────────────────────────────────────────

async function buildTtsText(warningsOnly = false): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes().toString().padStart(2, "0");

  const parts: string[] = [];

  // 1. Time announcement
  if (warningsOnly) {
    parts.push(
      `이것은 ${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분경의 기상 경보 및 주의보입니다.`,
    );
  } else {
    parts.push(
      `이것은 ${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분경의 날씨 정보입니다.`,
    );
  }

  if (!warningsOnly) {
    // 2. Major cities
    parts.push("주요 도시의 날씨 정보입니다.");
    for (const city of data.cities) {
      try {
        const weather = await fetchWeather(city.lat, city.lon);
        parts.push(buildWeatherSentence(city.name_ko, weather));
      } catch (e) {
        console.error(`[skip] ${city.name_ko}: ${e}`);
      }
    }

    // 3. Nagano regions
    parts.push("나가노현 각 지역의 날씨입니다.");
    for (const region of data.nagano) {
      try {
        const weather = await fetchWeather(region.lat, region.lon);
        const label = region.region_ko ?? region.name_ko;
        parts.push(buildWeatherSentence(label, weather));
      } catch (e) {
        console.error(`[skip] ${region.region_ko ?? region.name_ko}: ${e}`);
      }
    }
  }

  // 4. Warnings
  if (!warningsOnly) parts.push("기상 경보 및 주의보입니다.");

  const warningItems: { labelKo: string; headlineJa: string }[] = [];
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
          labelKo: area.label_ko ?? area.label_ja,
          headlineJa: headline,
        });
      }
    } catch (e) {
      console.error(`[skip warning] ${area.label_ko ?? area.label_ja}: ${e}`);
    }
  }

  if (warningItems.length > 0) {
    try {
      const texts = warningItems.map((w) => w.headlineJa);
      const translated = await translateTexts(texts);
      for (let i = 0; i < warningItems.length; i++) {
        parts.push(`${warningItems[i].labelKo}: ${translated[i]}`);
      }
    } catch (e) {
      console.error(`[DeepL error]: ${e}`);
      for (const w of warningItems) {
        parts.push(`${w.labelKo}: ${w.headlineJa}`);
      }
    }
  } else {
    parts.push("현재 특별한 기상 경보 또는 주의보가 없습니다.");
  }

  return parts.join("\n");
}

// ─── TTS synthesis & playback ──────────────────────────────────────────────────

const EDGE_TTS = resolveEdgeTtsBin();
console.log(`[tts] node-edge-tts: ${EDGE_TTS.binPath}`);

async function synthesizeChunk(text: string, outFile: string): Promise<void> {
  const proc = Bun.spawn(
    ["node", EDGE_TTS.binPath, "-v", "ko-KR-InJoonNeural", "-l", "ko-KR", "--timeout", "30000", "-t", text, "-f", outFile],
    { stdout: "pipe", stderr: "pipe" },
  );
  const stdoutPromise = streamToText(proc.stdout);
  const stderrPromise = streamToText(proc.stderr);
  const code = await proc.exited;
  const stdout = await stdoutPromise;
  const stderr = await stderrPromise;
  if (code !== 0) {
    throw new Error(
      [
        `TTS chunk failed (exit ${code})`,
        `edge-tts bin: ${EDGE_TTS.binPath}`,
        `input: ${text.slice(0, 80)}`,
        stdout ? `stdout: ${stdout}` : "",
        stderr ? `stderr: ${stderr}` : "",
      ].filter(Boolean).join("\n"),
    );
  }
}

async function runTts(text: string): Promise<void> {
  const { unlinkSync } = await import("node:fs");
  const lines = text.split("\n").map((s: string) => s.trim()).filter(Boolean);
  const tmpFiles: string[] = [];

  console.log(`Synthesizing ${lines.length} chunks...`);
  for (let i = 0; i < lines.length; i++) {
    const tmp = `/tmp/weather-tts-ko-chunk-${i}.mp3`;
    process.stdout.write(`  [${i + 1}/${lines.length}] ${lines[i].slice(0, 50)}...\n`);
    await synthesizeChunk(lines[i], tmp);
    tmpFiles.push(tmp);
  }

  const listFile = "/tmp/weather-tts-ko-list.txt";
  const outputFile = "/tmp/weather-tts-ko-output.mp3";
  await Bun.write(listFile, [`file '${import.meta.dir}/../assets/jingle.mp3'`, ...tmpFiles.map((f: string) => `file '${f}'`)].join("\n"));

  console.log("Concatenating...");
  const concat = Bun.spawn(
    ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outputFile],
    { stdout: "pipe", stderr: "pipe" },
  );
  const concatStdoutPromise = streamToText(concat.stdout);
  const concatStderrPromise = streamToText(concat.stderr);
  const concatCode = await concat.exited;
  if (concatCode !== 0) {
    const concatStdout = await concatStdoutPromise;
    const concatStderr = await concatStderrPromise;
    console.error(`ffmpeg concat failed with code ${concatCode}`);
    if (concatStdout) console.error(concatStdout);
    if (concatStderr) console.error(concatStderr);
    process.exit(1);
  }

  for (const f of tmpFiles) { try { unlinkSync(f); } catch {} }

  if (process.env.NO_PLAY === "1") {
    console.log("NO_PLAY=1 set, skipping playback.");
    return;
  }

  console.log("Playing audio...");
  const play = Bun.spawn(["ffplay", "-nodisp", "-autoexit", outputFile], { stdout: "inherit", stderr: "inherit" });
  await play.exited;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const warningsOnly = process.argv.includes("--warnings-only");
const ttsText = await buildTtsText(warningsOnly);
console.log("=== TTS Text ===");
console.log(ttsText);
console.log("================");
await runTts(ttsText);
