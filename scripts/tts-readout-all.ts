#!/usr/bin/env bun
/**
 * 全言語一括TTS読み上げスクリプト
 * JA → EN → ZH → KO の順に読み上げ、最後に1つのMP3に結合する
 */

const LANGS = ["ja", "en", "zh", "ko"] as const;
const SCRIPT_MAP: Record<string, string> = {
  ja: "scripts/tts-readout.ts",
  en: "scripts/tts-readout-en.ts",
  zh: "scripts/tts-readout-zh.ts",
  ko: "scripts/tts-readout-ko.ts",
};
const OUTPUT_MAP: Record<string, string> = {
  ja: "/tmp/weather-tts-output.mp3",
  en: "/tmp/weather-tts-en-output.mp3",
  zh: "/tmp/weather-tts-zh-output.mp3",
  ko: "/tmp/weather-tts-ko-output.mp3",
};

const FINAL_OUTPUT = "/tmp/weather-tts-all-output.mp3";
const warningsOnly = process.argv.includes("--warnings-only");
const BUN_BIN = Bun.which("bun") ?? "bun";

// ─── Generate each language ────────────────────────────────────────────────────

for (const lang of LANGS) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🌐 Generating ${lang.toUpperCase()}...`);
  console.log("=".repeat(60));

  const args = ["run", SCRIPT_MAP[lang]];
  if (warningsOnly) args.push("--", "--warnings-only");

  const proc = Bun.spawn([BUN_BIN, ...args], {
    cwd: `${import.meta.dir}/..`,
    env: { ...process.env, NO_PLAY: "1" },
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`❌ ${lang.toUpperCase()} failed (exit ${code})`);
    process.exit(1);
  }
  console.log(`✅ ${lang.toUpperCase()} done`);
}

// ─── Concatenate all languages ─────────────────────────────────────────────────

console.log(`\n${"=".repeat(60)}`);
console.log("🔗 Concatenating all languages...");
console.log("=".repeat(60));

const listFile = "/tmp/weather-tts-all-list.txt";
const files = LANGS.map((lang) => `file '${OUTPUT_MAP[lang]}'`).join("\n");
await Bun.write(listFile, files);

const concat = Bun.spawn(
  ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", FINAL_OUTPUT],
  { stdout: "pipe", stderr: "pipe" },
);
const concatCode = await concat.exited;
if (concatCode !== 0) {
  console.error(`❌ ffmpeg concat failed (exit ${concatCode})`);
  process.exit(1);
}

console.log(`✅ All languages combined → ${FINAL_OUTPUT}`);

// ─── Play ──────────────────────────────────────────────────────────────────────

if (process.env.NO_PLAY !== "1") {
  console.log("\n🔊 Playing...");
  const play = Bun.spawn(["ffplay", "-nodisp", "-autoexit", FINAL_OUTPUT], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await play.exited;
}
