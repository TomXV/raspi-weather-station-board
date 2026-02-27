import { describe, expect, test } from "bun:test";
import {
  diskStatsFromDfOutput,
  memStatsFromMeminfo,
  parseMeminfoBytes,
  round,
  toGiB,
  toPercent,
  uptimeHumanFromSeconds,
} from "../src/server-metrics";

describe("round/toGiB/toPercent", () => {
  test("rounds values to specified digits", () => {
    expect(round(1.234, 2)).toBe(1.23);
    expect(toGiB(1024 ** 3, 1)).toBe(1);
    expect(toPercent(1, 4, 1)).toBe(25);
  });
});

describe("parseMeminfoBytes", () => {
  test("extracts bytes from meminfo", () => {
    const meminfo = "MemTotal:       2048 kB\nMemAvailable:    1024 kB\n";
    expect(parseMeminfoBytes(meminfo, "MemTotal")).toBe(2048 * 1024);
    expect(parseMeminfoBytes(meminfo, "MemAvailable")).toBe(1024 * 1024);
  });

  test("returns null when key is missing", () => {
    expect(parseMeminfoBytes("SwapTotal: 1000 kB", "MemTotal")).toBeNull();
  });
});

describe("memStatsFromMeminfo", () => {
  test("builds usage stats", () => {
    const meminfo = "MemTotal:       1048576 kB\nMemAvailable:    524288 kB\n";
    const stats = memStatsFromMeminfo(meminfo);
    expect(stats).not.toBeNull();
    expect(stats?.used_pct).toBe(50);
  });

  test("returns null when required values are absent", () => {
    expect(memStatsFromMeminfo("MemTotal: 1000 kB\n")).toBeNull();
  });
});

describe("diskStatsFromDfOutput", () => {
  test("parses df output and computes usage stats", () => {
    const total = 100 * 1024 ** 3;
    const used = 55 * 1024 ** 3;
    const stats = diskStatsFromDfOutput(`${total} ${used}`);
    expect(stats).not.toBeNull();
    expect(stats?.used_pct).toBe(55);
    expect(stats?.total_gb).toBe(100);
  });

  test("returns null for invalid output", () => {
    expect(diskStatsFromDfOutput("invalid")).toBeNull();
  });
});

describe("uptimeHumanFromSeconds", () => {
  test("formats uptime for less than one day", () => {
    expect(uptimeHumanFromSeconds(3 * 3600 + 25 * 60)).toBe("3h 25m");
  });

  test("formats uptime with days", () => {
    expect(uptimeHumanFromSeconds(2 * 86400 + 5 * 3600 + 10 * 60)).toBe(
      "2d 5h 10m",
    );
  });
});
