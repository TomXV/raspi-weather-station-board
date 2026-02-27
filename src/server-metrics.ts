const BYTES_IN_GIB = 1024 ** 3;

export interface UsageStats {
  used_gb: number;
  total_gb: number;
  used_pct: number;
}

export function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function toGiB(bytes: number, digits: number): number {
  return round(bytes / BYTES_IN_GIB, digits);
}

export function toPercent(value: number, total: number, digits: number): number {
  return round((value / total) * 100, digits);
}

export function parseMeminfoBytes(meminfo: string, key: "MemTotal" | "MemAvailable"): number | null {
  for (const line of meminfo.split("\n")) {
    if (!line.startsWith(`${key}:`)) continue;
    const valueKiB = Number(line.split(/\s+/)[1]);
    return Number.isFinite(valueKiB) ? valueKiB * 1024 : null;
  }
  return null;
}

export function memStatsFromMeminfo(meminfo: string): UsageStats | null {
  const total = parseMeminfoBytes(meminfo, "MemTotal");
  const available = parseMeminfoBytes(meminfo, "MemAvailable");
  if (!total || !available) return null;

  const used = total - available;
  return {
    total_gb: toGiB(total, 2),
    used_gb: toGiB(used, 2),
    used_pct: toPercent(used, total, 1),
  };
}

export function diskStatsFromDfOutput(output: string): UsageStats | null {
  const [totalRaw, usedRaw] = output.trim().split(/\s+/);
  const total = Number(totalRaw);
  const used = Number(usedRaw);
  if (!total || !used) return null;

  return {
    used_gb: toGiB(used, 1),
    total_gb: toGiB(total, 1),
    used_pct: toPercent(used, total, 1),
  };
}

export function uptimeHumanFromSeconds(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}
