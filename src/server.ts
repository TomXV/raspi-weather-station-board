import { readFileSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { hostname, loadavg } from "node:os";
import {
  diskStatsFromDfOutput,
  memStatsFromMeminfo,
  round,
  uptimeHumanFromSeconds,
  type UsageStats,
} from "./server-metrics";

const PORT = 8788;
const HOST = "127.0.0.1";
const BASE = resolve(import.meta.dir, "..", "public");
const NO_STORE = "no-store";
const CORS_ALLOW_ALL = "*";
const DEFAULT_MIME = "application/octet-stream";

interface PiStatusPayload {
  time: number;
  hostname: string;
  cpu_temp_c: number | null;
  load1: number;
  mem: UsageStats | null;
  disk: UsageStats | null;
  uptime: string | null;
  ip: string | null;
}

function runShell(command: string): Promise<string | null> {
  return (async () => {
    try {
      const proc = Bun.spawn(["bash", "-lc", command], {
        stdout: "pipe",
        stderr: "ignore",
      });
      const output = (await new Response(proc.stdout).text()).trim();
      await proc.exited;
      return output || null;
    } catch {
      return null;
    }
  })();
}

function staticHeaders(contentType: string): HeadersInit {
  return {
    "Content-Type": contentType,
    "Cache-Control": NO_STORE,
  };
}

function readCpuTemp(): number | null {
  try {
    const raw = readFileSync(
      "/sys/class/thermal/thermal_zone0/temp",
      "utf-8",
    ).trim();
    return round(Number(raw) / 1000, 1);
  } catch {
    return null;
  }
}

function memStats(): UsageStats | null {
  try {
    const meminfo = readFileSync("/proc/meminfo", "utf-8");
    return memStatsFromMeminfo(meminfo);
  } catch {
    return null;
  }
}

function uptimeHuman(): string | null {
  try {
    const sec = Math.floor(
      Number(readFileSync("/proc/uptime", "utf-8").split(" ")[0]),
    );
    return uptimeHumanFromSeconds(sec);
  } catch {
    return null;
  }
}

async function localIp(): Promise<string | null> {
  return runShell("ip route get 1.1.1.1 | awk '{print $7; exit}'");
}

async function diskStats(): Promise<UsageStats | null> {
  const out = await runShell("df -B1 / | tail -1 | awk '{print $2, $3}'");
  if (!out) return null;
  return diskStatsFromDfOutput(out);
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function staticResponse(pathname: string): Response {
  const relativePath =
    pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = join(BASE, relativePath);

  try {
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      const indexPath = join(filePath, "index.html");
      return new Response(Bun.file(indexPath), {
        headers: staticHeaders(MIME[".html"]),
      });
    }

    const ext = extname(filePath).toLowerCase();
    return new Response(Bun.file(filePath), {
      headers: staticHeaders(MIME[ext] ?? DEFAULT_MIME),
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

async function piStatusPayload(): Promise<PiStatusPayload> {
  const [disk, ip] = await Promise.all([diskStats(), localIp()]);
  return {
    time: Math.floor(Date.now() / 1000),
    hostname: hostname(),
    cpu_temp_c: readCpuTemp(),
    load1: round(loadavg()[0], 2),
    mem: memStats(),
    disk,
    uptime: uptimeHuman(),
    ip,
  };
}

Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/pi-status") {
      const payload = await piStatusPayload();
      return Response.json(payload, {
        headers: {
          "Cache-Control": NO_STORE,
          "Access-Control-Allow-Origin": CORS_ALLOW_ALL,
        },
      });
    }

    const res = staticResponse(url.pathname);
    res.headers.set("Access-Control-Allow-Origin", CORS_ALLOW_ALL);
    return res;
  },
});

console.log(`weather-station Bun server listening on http://${HOST}:${PORT}`);
