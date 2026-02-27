import { describe, expect, test } from "bun:test";
import {
  formatHourMinute,
  tempDeltaFrom30mAgo,
  trendMeta,
  type OpenMeteoData,
} from "../src/weather-utils";

function baseData(): OpenMeteoData {
  return {
    current: {
      temperature_2m: 0,
      weather_code: 1,
      wind_speed_10m: 3,
      relative_humidity_2m: 50,
    },
    daily: {
      temperature_2m_max: [10],
      temperature_2m_min: [1],
      precipitation_probability_max: [20],
    },
    hourly: {
      time: [],
      temperature_2m: [],
    },
  };
}

describe("trendMeta", () => {
  test("returns expected arrows at thresholds", () => {
    expect(trendMeta(1.5)).toEqual({ symbol: "↑", cls: "up-fast" });
    expect(trendMeta(0.5)).toEqual({ symbol: "↗", cls: "up" });
    expect(trendMeta(0.49)).toEqual({ symbol: "→", cls: "flat" });
    expect(trendMeta(-0.5)).toEqual({ symbol: "↘", cls: "down" });
    expect(trendMeta(-1.5)).toEqual({ symbol: "↓", cls: "down-fast" });
  });
});

describe("tempDeltaFrom30mAgo", () => {
  test("calculates delta via linear interpolation", () => {
    const now = Date.parse("2026-02-27T10:00:00+09:00");
    const data = baseData();
    data.current.temperature_2m = 15;
    data.hourly.time = [
      "2026-02-27T09:00:00+09:00",
      "2026-02-27T10:00:00+09:00",
    ];
    data.hourly.temperature_2m = [10, 14];

    // 30 分前 (09:30) は 12℃、現在15℃との差は +3℃
    expect(tempDeltaFrom30mAgo(data, now)).toBe(3);
  });

  test("falls back to nearest available side when one side is missing", () => {
    const now = Date.parse("2026-02-27T10:00:00+09:00");
    const data = baseData();
    data.current.temperature_2m = 11;
    data.hourly.time = ["2026-02-27T09:00:00+09:00"];
    data.hourly.temperature_2m = [8];
    expect(tempDeltaFrom30mAgo(data, now)).toBe(3);
  });

  test("returns 0 when data is insufficient", () => {
    const data = baseData();
    data.current.temperature_2m = Number.NaN;
    expect(tempDeltaFrom30mAgo(data, Date.now())).toBe(0);
  });
});

describe("formatHourMinute", () => {
  test("formats HH:MM with zero padding", () => {
    const date = new Date(2026, 1, 27, 3, 4, 59);
    expect(formatHourMinute(date)).toBe("03:04");
  });
});
