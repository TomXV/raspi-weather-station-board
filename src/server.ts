import { readFileSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { hostname, loadavg } from "node:os";

const PORT = 8788;
const HOST = "127.0.0.1";
const BASE = resolve(import.meta.dir, "..", "public");

function readCpuTemp(): number | null {
  try {
    const raw = readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf-8").trim();
    return Math.round((Number(raw) / 1000) * 10) / 10;
  } catch {
    return null;
  }
}

function memStats() {
  try {
    const meminfo = readFileSync("/proc/meminfo", "utf-8");
    let total = 0;
    let available = 0;
    for (const line of meminfo.split("\n")) {
      if (line.startsWith("MemTotal:")) total = Number(line.split(/\s+/)[1]) * 1024;
      if (line.startsWith("MemAvailable:")) available = Number(line.split(/\s+/)[1]) * 1024;
    }
    if (!total || !available) return null;
    const used = total - available;
    return {
      total_gb: Math.round((total / 1024 ** 3) * 100) / 100,
      used_gb: Math.round((used / 1024 ** 3) * 100) / 100,
      used_pct: Math.round((used / total) * 1000) / 10,
    };
  } catch {
    return null;
  }
}

function uptimeHuman(): string | null {
  try {
    const sec = Math.floor(Number(readFileSync("/proc/uptime", "utf-8").split(" ")[0]));
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
  } catch {
    return null;
  }
}

async function localIp(): Promise<string | null> {
  try {
    const p = Bun.spawn(["bash", "-lc", "ip route get 1.1.1.1 | awk '{print $7; exit}'"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const out = (await new Response(p.stdout).text()).trim();
    await p.exited;
    return out || null;
  } catch {
    return null;
  }
}

async function diskStats() {
  try {
    const p = Bun.spawn(["bash", "-lc", "df -B1 / | tail -1 | awk '{print $2, $3}'"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const out = (await new Response(p.stdout).text()).trim();
    await p.exited;
    const [totalS, usedS] = out.split(/\s+/);
    const total = Number(totalS);
    const used = Number(usedS);
    if (!total || !used) throw new Error("bad disk stats");
    return {
      used_gb: Math.round((used / 1024 ** 3) * 10) / 10,
      total_gb: Math.round((total / 1024 ** 3) * 10) / 10,
      used_pct: Math.round((used / total) * 1000) / 10,
    };
  } catch {
    return null;
  }
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
  const safe = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(BASE, safe.replace(/^\/+/, ""));
  try {
    const st = statSync(filePath);
    if (st.isDirectory()) {
      const idx = join(filePath, "index.html");
      return new Response(Bun.file(idx), { headers: { "Content-Type": MIME[".html"], "Cache-Control": "no-store" } });
    }
    const ext = extname(filePath).toLowerCase();
    return new Response(Bun.file(filePath), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/pi-status") {
      const mem = memStats();
      const disk = await diskStats();
      const payload = {
        time: Math.floor(Date.now() / 1000),
        hostname: hostname(),
        cpu_temp_c: readCpuTemp(),
        load1: Math.round(loadavg()[0] * 100) / 100,
        mem,
        disk,
        uptime: uptimeHuman(),
        ip: await localIp(),
      };
      return Response.json(payload, {
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const res = staticResponse(url.pathname);
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  },
});

console.log(`weather-station Bun server listening on http://${HOST}:${PORT}`);
