export interface OpenMeteoCurrent {
  temperature_2m: number;
  weather_code: number;
  wind_speed_10m: number;
  relative_humidity_2m: number;
}

export interface OpenMeteoDaily {
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: Array<number | null>;
}

export interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
}

export interface OpenMeteoData {
  current: OpenMeteoCurrent;
  daily: OpenMeteoDaily;
  hourly: OpenMeteoHourly;
}

export function trendMeta(delta: number) {
  if (delta >= 1.5) return { symbol: "↑", cls: "up-fast" };
  if (delta >= 0.5) return { symbol: "↗", cls: "up" };
  if (delta <= -1.5) return { symbol: "↓", cls: "down-fast" };
  if (delta <= -0.5) return { symbol: "↘", cls: "down" };
  return { symbol: "→", cls: "flat" };
}

/**
 * hourly データから 30 分前の気温を線形補間で推定し、
 * 現在気温との差分（℃）を返す。データ不足時は 0。
 */
export function tempDeltaFrom30mAgo(data: OpenMeteoData, nowMs = Date.now()): number {
  const currentTemp = Number(data?.current?.temperature_2m);
  const times: string[] = data?.hourly?.time || [];
  const temps: number[] = data?.hourly?.temperature_2m || [];
  if (!Number.isFinite(currentTemp) || times.length === 0) return 0;

  const targetMs = nowMs - 30 * 60 * 1000;
  const points = times
    .map((time, idx) => ({ ms: new Date(time).getTime(), temp: Number(temps[idx]) }))
    .filter((p) => Number.isFinite(p.ms) && Number.isFinite(p.temp))
    .sort((a, b) => a.ms - b.ms);
  if (points.length === 0) return 0;

  let before: { ms: number; temp: number } | undefined;
  let after: { ms: number; temp: number } | undefined;
  for (const p of points) {
    if (p.ms <= targetMs) before = p;
    if (p.ms >= targetMs) {
      after = p;
      break;
    }
  }

  let pastTemp: number;
  if (before && after && before.ms !== after.ms) {
    const ratio = (targetMs - before.ms) / (after.ms - before.ms);
    pastTemp = before.temp + (after.temp - before.temp) * ratio;
  } else if (before) {
    pastTemp = before.temp;
  } else if (after) {
    pastTemp = after.temp;
  } else {
    return 0;
  }

  return currentTemp - pastTemp;
}

export function formatHourMinute(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
