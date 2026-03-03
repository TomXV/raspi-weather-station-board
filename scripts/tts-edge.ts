import { existsSync } from "node:fs";
import { join } from "node:path";

interface EdgeTtsResolution {
  binPath: string;
  searched: string[];
}

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function buildCandidates(): { envBin?: string; candidates: string[] } {
  const envBin = process.env.EDGE_TTS_BIN?.trim();
  const home = process.env.HOME?.trim();
  const bunInstall = process.env.BUN_INSTALL?.trim();

  const candidates = uniq([
    home ? join(home, ".bun/install/global/node_modules/node-edge-tts/bin.js") : "",
    bunInstall ? join(bunInstall, "install/global/node_modules/node-edge-tts/bin.js") : "",
    home ? join(home, ".npm-global/lib/node_modules/node-edge-tts/bin.js") : "",
    home ? join(home, ".npm-global/lib/node_modules/openclaw/node_modules/node-edge-tts/bin.js") : "",
    "/home/pi/.npm-global/lib/node_modules/openclaw/node_modules/node-edge-tts/bin.js",
    "/home/linuxbrew/.linuxbrew/lib/node_modules/node-edge-tts/bin.js",
    "/usr/local/lib/node_modules/node-edge-tts/bin.js",
    "/usr/lib/node_modules/node-edge-tts/bin.js",
  ]);

  return { envBin, candidates };
}

export function resolveEdgeTtsBin(): EdgeTtsResolution {
  const { envBin, candidates } = buildCandidates();

  if (envBin) {
    if (existsSync(envBin)) {
      return { binPath: envBin, searched: [envBin, ...candidates] };
    }
    throw new Error(
      [
        `EDGE_TTS_BIN is set but does not exist: ${envBin}`,
        "Fix EDGE_TTS_BIN or remove it to enable auto-discovery.",
      ].join("\n"),
    );
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { binPath: candidate, searched: candidates };
    }
  }

  throw new Error(
    [
      "node-edge-tts bin.js was not found.",
      "Set EDGE_TTS_BIN to the absolute path of node-edge-tts/bin.js.",
      "Searched paths:",
      ...candidates.map((candidate) => `- ${candidate}`),
    ].join("\n"),
  );
}

export async function streamToText(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return "";
  return (await new Response(stream).text()).trim();
}
