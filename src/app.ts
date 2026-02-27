import i18nRaw from "./i18n.toml";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = "ja" | "en" | "zh" | "ko";
type CalMode = "gregory" | "japanese" | "chinese";

/** i18n.toml の [ui.*] セクション 1 言語分 */
interface LangText {
  boardTitle: string;
  warningTitle: string;
  piTitle: string;
  majorLabel: string;
  naganoLabel: string;
  updated: string;
  updating: string;
  precip: string;
  wind: string;
  humidity: string;
  failed: string;
  page: string;
  nextUpdate: string;
  am: string;
  pm: string;
  hourUnit: string;
  weekdays: string[];
  piTemp: string;
  piLoad: string;
  piMem: string;
  piDisk: string;
  piUptime: string;
  piIp: string;
  warningNoHeadline: string;
  warningFetchFailed: string;
  warningAllFailed: string;
  noInfo: string;
}

/** i18n.toml の [[cities]] / [[nagano]] エントリ */
interface Loc {
  id: string;
  lat: number;
  lon: number;
  name_ja: string;
  name_en: string;
  name_zh: string;
  name_ko: string;
  region_ja: string;
  region_en: string;
  region_zh: string;
  region_ko: string;
}

/** i18n.toml の [[warning_areas]] エントリ — JMA 警報 API のオフィスコードとラベル */
interface WarningArea {
  code: string;
  label_ja: string;
  label_en: string;
  label_zh: string;
}

/** i18n.toml の [[wmo]] エントリ — WMO 天気コードの解釈 */
interface WMOEntry {
  code: number;
  icon: string;
  ja: string;
  en: string;
  zh?: string;
  ko?: string;
}

interface OpenMeteoCurrent {
  temperature_2m: number;
  weather_code: number;
  wind_speed_10m: number;
  relative_humidity_2m: number;
}

interface OpenMeteoDaily {
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: Array<number | null>;
}

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
}

interface OpenMeteoData {
  current: OpenMeteoCurrent;
  daily: OpenMeteoDaily;
  hourly: OpenMeteoHourly;
}

interface PiStatus {
  cpu_temp_c: number | null;
  load1: number | null;
  mem: { used_gb: number; total_gb: number; used_pct: number } | null;
  disk: { used_gb: number; total_gb: number; used_pct: number } | null;
  uptime: string | null;
  ip: string | null;
}

/** i18n.toml 全体の型（Bun がビルド時に TOML をパースしてインライン化する） */
interface I18nData {
  ui: Record<Lang, LangText>;
  cities: Loc[];
  nagano: Loc[];
  warning_areas: WarningArea[];
  wmo: WMOEntry[];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * 気温変化量（℃）からトレンド矢印と CSS クラスを返す。
 * ±0.5℃ 未満は横ばい、±1.5℃ 以上は急変とみなす。
 */
function trendMeta(delta: number) {
  if (delta >= 1.5) return { symbol: "↑", cls: "up-fast" };
  if (delta >= 0.5) return { symbol: "↗", cls: "up" };
  if (delta <= -1.5) return { symbol: "↓", cls: "down-fast" };
  if (delta <= -0.5) return { symbol: "↘", cls: "down" };
  return { symbol: "→", cls: "flat" };
}

/**
 * Open-Meteo の hourly データから「30 分前の気温」を探し、
 * 現在気温との差分（℃）を返す。データ不足時は 0。
 */
function tempDeltaFrom30mAgo(data: OpenMeteoData): number {
  const currentTemp = Number(data?.current?.temperature_2m);
  const times: string[] = data?.hourly?.time || [];
  const temps: number[] = data?.hourly?.temperature_2m || [];
  if (!Number.isFinite(currentTemp) || times.length === 0) return 0;

  // 30 分前に最も近いインデックスを線形探索
  const target = Date.now() - 30 * 60 * 1000;
  let bestIdx = -1,
    bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  if (bestIdx < 0 || !Number.isFinite(Number(temps[bestIdx]))) return 0;
  return currentTemp - Number(temps[bestIdx]);
}

/**
 * マーキー要素（.ticker-track）のテキストと速度を更新する。
 * シームレスなループスクロールのためテキストを 2 連結する。
 * 文字数に比例してアニメーション時間を伸ばし可読性を確保（24〜90 秒）。
 */
function setTickerText(trackId: string, text: string, noInfo: string) {
  const el = document.getElementById(trackId);
  if (!el) return;
  const clean = (text || "").trim() || noInfo;
  el.textContent = `${clean}　◆　${clean}　◆　`;
  el.style.animationDuration = `${Math.max(24, Math.min(90, Math.round(clean.length * 0.45)))}s`;
}

/** HH:MM 形式（24 時制） */
function formatHourMinute(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// ─── I18n ─────────────────────────────────────────────────────────────────────

/**
 * 言語切り替え・翻訳テキスト取得・ロケール表示名解決・WMO コードデコードを担う。
 * すべてのパネルがこのインスタンスを共有し、同一の currentLang を参照する。
 */
class I18n {
  /** 循環順序 */
  private static readonly ORDER: Lang[] = ["ja", "en", "zh", "ko"];
  private _lang: Lang = "ja";
  private _langIdx = 0;

  readonly ui: Record<Lang, LangText>;
  private readonly wmoMap: Map<number, WMOEntry>;

  constructor(data: I18nData) {
    this.ui = data.ui;
    // 配列 → Map に変換して O(1) ルックアップを実現
    this.wmoMap = new Map(data.wmo.map((w) => [w.code, w]));
  }

  /** 現在の言語コード */
  get lang(): Lang {
    return this._lang;
  }

  /** 現在言語の翻訳テキスト一式 */
  get t(): LangText {
    return this.ui[this._lang];
  }

  /** ja → en → zh → ko → ja と循環する */
  rotateLang(): void {
    this._langIdx = (this._langIdx + 1) % I18n.ORDER.length;
    this._lang = I18n.ORDER[this._langIdx];
  }

  /**
   * 現在言語で都市名・地域名を返す。
   * 翻訳がない場合は en → ja の順でフォールバックする。
   */
  display(loc: Loc): { name: string; region: string } {
    const l = this._lang;
    const name =
      l === "en"
        ? loc.name_en || loc.name_ja
        : l === "zh"
          ? loc.name_zh || loc.name_en || loc.name_ja
          : l === "ko"
            ? loc.name_ko || loc.name_en || loc.name_ja
            : loc.name_ja;
    const region =
      l === "en"
        ? loc.region_en || loc.region_ja
        : l === "zh"
          ? loc.region_zh || loc.region_en || loc.region_ja
          : l === "ko"
            ? loc.region_ko || loc.region_en || loc.region_ja
            : loc.region_ja;
    return { name, region };
  }

  /** WMO コード → WMOEntry。未知コードはアイコン ❓ のエントリを返す */
  decodeWMO(code: number): WMOEntry {
    return (
      this.wmoMap.get(code) ?? {
        code,
        icon: "❓",
        ja: `(${code})`,
        en: `(${code})`,
        ko: `(${code})`,
      }
    );
  }

  /** WMOEntry から現在言語の天気説明文を返す。zh は未設定なら en を使用 */
  wmoDesc(w: WMOEntry): string {
    const l = this._lang;
    return l === "en"
      ? w.en
      : l === "zh"
        ? w.zh || w.en
        : l === "ko"
          ? w.ko || w.en
          : w.ja;
  }
}

// ─── ClockPanel ───────────────────────────────────────────────────────────────

/**
 * ヘッダーの時計・日付・次回更新カウントダウンを毎秒更新する。
 * カレンダー表示は言語と経過時間から自動選択し、6 秒ごとに切り替わる。
 *
 * WeatherGrid の nextRefreshAt を直接参照する代わりにゲッター関数を受け取ることで、
 * 両クラスの結合度を下げる（依存性逆転）。
 */
class ClockPanel {
  // DOM 要素はコンストラクタ時点で一度だけ取得してキャッシュ
  private readonly elClock = document.getElementById("clock")!;
  private readonly elClock12 = document.getElementById("clock12-str");
  private readonly elWeekday = document.getElementById("weekday-str");
  private readonly elDate = document.getElementById("date-str");
  private readonly elNextUpd = document.getElementById("next-update");

  constructor(
    private readonly i18n: I18n,
    /** WeatherGrid の次回更新予定時刻 (Unix ms) を返す関数 */
    private readonly getNextRefreshAt: () => number,
  ) {}

  /** 毎秒呼び出す。時刻・12時制・曜日・日付・次回更新を一括更新する */
  tick(): void {
    const now = new Date();
    const h24 = now.getHours();

    // 24 時制 HH:MM:SS
    this.elClock.textContent = `${String(h24).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    // 12 時制（英語は "AM 9:00"、それ以外は "午前9時" 形式）
    const t = this.i18n.t;
    const h12 = ((h24 + 11) % 12) + 1;
    const ampm = h24 < 12 ? t.am : t.pm;
    if (this.elClock12) {
      this.elClock12.textContent =
        this.i18n.lang === "en"
          ? `${ampm} ${h12}:00`
          : `${ampm}${h12}${t.hourUnit}`;
    }

    if (this.elWeekday) this.elWeekday.textContent = t.weekdays[now.getDay()];

    // カレンダー表示（西暦・和暦・旧暦を自動切替）
    const mode = this.calendarMode(now);
    if (this.elDate) {
      this.elDate.textContent = this.formatDate(now, mode);
      // 旧暦は文字列が長いため CSS で横ズレを補正するクラスを付与
      this.elDate.classList.toggle("is-chinese-cal", mode === "chinese");
    }

    this.updateNextUpdate(now);
  }

  /** 次回更新カウントダウンだけを更新する（言語切替時などに単独で呼ぶ） */
  updateNextUpdate(now = new Date()): void {
    const remain = Math.max(0, this.getNextRefreshAt() - now.getTime());
    const mm = String(Math.floor(remain / 60000)).padStart(2, "0");
    const ss = String(Math.floor((remain % 60000) / 1000)).padStart(2, "0");
    if (this.elNextUpd)
      this.elNextUpd.textContent = `${this.i18n.t.nextUpdate} ${mm}:${ss}`;
  }

  /** 指定カレンダーで日付文字列を返す。Intl がサポート外のとき西暦にフォールバック */
  private formatDate(now: Date, cal: CalMode): string {
    const y = now.getFullYear(),
      mo = now.getMonth() + 1,
      d = now.getDate();
    const greg = `${y}/${String(mo).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
    try {
      if (cal === "japanese") {
        return new Intl.DateTimeFormat("ja-JP-u-ca-japanese", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(now);
      }
      if (cal === "chinese") {
        return new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(now);
      }
    } catch {
      /* Intl が未対応の場合は西暦を使用 */
    }
    return greg;
  }

  /**
   * 現在時刻の「フェーズ」（6 秒単位）でカレンダー種別を決定する。
   * 中国語表示中は西暦・和暦・旧暦の 3 種、それ以外は西暦・和暦の 2 種を循環する。
   */
  private calendarMode(now: Date): CalMode {
    const phase = Math.floor(now.getTime() / 6000);
    if (this.i18n.lang === "zh")
      return (["gregory", "japanese", "chinese"] as const)[phase % 3];
    return (["gregory", "japanese"] as const)[phase % 2];
  }
}

// ─── WeatherGrid ──────────────────────────────────────────────────────────────

/** 天気データ更新間隔（30 分） */
const WEATHER_REFRESH_MS = 30 * 60 * 1000;

/** 長野エリアを 1 ページに表示するカード数 */
const NAGANO_PAGE_SIZE = 4;

/**
 * 主要都市・長野エリアの天気カードを管理する。
 * - Open-Meteo API からデータを取得してカードを更新する
 * - 長野エリアはページネーションで切り替え表示する
 * - 取得済みデータはキャッシュし、言語切替時の即時再描画に利用する
 */
class WeatherGrid {
  /** ClockPanel が参照する次回更新予定時刻 */
  private _nextRefreshAt = Date.now() + WEATHER_REFRESH_MS;

  /** loc.id をキーとした最新の Open-Meteo レスポンスキャッシュ */
  private readonly cache: Record<string, OpenMeteoData> = {};

  /** 現在表示中の長野エリアページ（0 始まり） */
  private naganoPage = 0;

  get nextRefreshAt(): number {
    return this._nextRefreshAt;
  }

  constructor(
    private readonly cities: Loc[],
    private readonly nagano: Loc[],
    private readonly i18n: I18n,
  ) {}

  /** 起動時に都市グリッドと長野グリッドの初期カードを生成する */
  init(): void {
    const cg = document.getElementById("cities-grid")!;
    this.cities.forEach((c) => cg.appendChild(this.buildCard(c)));
    this.renderNaganoPage(0);
  }

  /** 全地点を並列フェッチし、カードと最終更新時刻を更新する */
  async refresh(): Promise<void> {
    const lastUpdEl = document.getElementById("last-updated");
    if (lastUpdEl) lastUpdEl.textContent = this.i18n.t.updating;

    // 都市・長野の全地点を並列リクエスト（失敗してもほかの地点に影響しない）
    await Promise.allSettled(
      [...this.cities, ...this.nagano].map(async (loc) => {
        try {
          const data = await this.fetchWeather(loc);
          this.cache[loc.id] = data;
          this.updateCard(loc, data);
        } catch {
          this.setCardError(loc);
        }
      }),
    );

    this.updateCityTicker();

    // 次回更新予定時刻を記録（ClockPanel のカウントダウン表示に使用）
    const now = new Date();
    this._nextRefreshAt = now.getTime() + WEATHER_REFRESH_MS;
    if (lastUpdEl) {
      lastUpdEl.textContent = `${this.i18n.t.updated}: ${formatHourMinute(now)}`;
    }
  }

  /** 指定ページの長野エリアカードを描画する。負数・超過値は自動でラップする */
  renderNaganoPage(index: number): void {
    const ng = document.getElementById("nagano-grid");
    if (!ng) return;
    const pageCount = Math.ceil(this.nagano.length / NAGANO_PAGE_SIZE);
    this.naganoPage = ((index % pageCount) + pageCount) % pageCount;
    const rows = this.nagano.slice(
      this.naganoPage * NAGANO_PAGE_SIZE,
      (this.naganoPage + 1) * NAGANO_PAGE_SIZE,
    );

    ng.innerHTML = "";
    rows.forEach((c) => {
      ng.appendChild(this.buildCard(c));
      // キャッシュがあれば即時にデータを反映（ページ切替のたびにフェッチしない）
      if (this.cache[c.id]) this.updateCard(c, this.cache[c.id]);
    });

    const ind = document.getElementById("nagano-page-indicator");
    if (ind) ind.textContent = `(${this.naganoPage + 1}/${pageCount})`;
  }

  /** 次のページに進む（WeatherBoard の定期タイマーから呼ばれる） */
  nextNaganoPage(): void {
    this.renderNaganoPage(this.naganoPage + 1);
  }

  /**
   * キャッシュ済みデータから全カードを再描画する。
   * 言語切替後に新しい言語でカードを即時更新するために使用する。
   */
  redrawAll(): void {
    this.cities.forEach((c) => {
      if (this.cache[c.id]) this.updateCard(c, this.cache[c.id]);
    });
    this.renderNaganoPage(this.naganoPage);
  }

  /** Open-Meteo から 1 地点分の現況・日次・時間別データを取得する */
  private async fetchWeather(loc: Loc): Promise<OpenMeteoData> {
    const url =
      "https://api.open-meteo.com/v1/forecast?" +
      `latitude=${loc.lat}&longitude=${loc.lon}` +
      "&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&hourly=temperature_2m&past_hours=2&forecast_hours=1" + // 30 分前の気温差分算出に使用
      "&timezone=Asia%2FTokyo&forecast_days=1";
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status.toString());
    return res.json() as Promise<OpenMeteoData>;
  }

  /** ローディング状態のカードスケルトンを生成する */
  private buildCard(loc: Loc): HTMLElement {
    const card = document.createElement("div");
    card.className = "weather-card";
    card.id = `card-${loc.id}`;
    const { name, region } = this.i18n.display(loc);
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="card-city">${name}</div>
          <div class="card-region">${region}</div>
        </div>
        <div class="loading">…</div>
      </div>
    `;
    return card;
  }

  /** フェッチ済みデータでカードの内容を更新する */
  private updateCard(loc: Loc, data: OpenMeteoData): void {
    const card = document.getElementById(`card-${loc.id}`);
    if (!card) return;
    const cur = data.current,
      daily = data.daily;
    const w = this.i18n.decodeWMO(cur.weather_code);
    const { name, region } = this.i18n.display(loc);
    const t = this.i18n.t;
    const trend = trendMeta(tempDeltaFrom30mAgo(data));

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="card-city">${name}</div>
          <div class="card-region">${region}</div>
        </div>
        <div class="card-precip">${t.precip}:${daily.precipitation_probability_max[0] ?? "--"}%</div>
      </div>
      <div class="card-weather-row">
        <span class="card-icon">${w.icon}</span>
        <div>
          <div>
            <span class="card-temp">${Math.round(cur.temperature_2m)}</span>
            <span class="card-temp-unit">°C</span>
            <span class="card-trend ${trend.cls}">${trend.symbol}</span>
          </div>
          <div class="card-desc">${this.i18n.wmoDesc(w)}</div>
        </div>
      </div>
      <div class="card-minmax">
        <span class="max">↑${Math.round(daily.temperature_2m_max[0])}°</span>
        &nbsp;
        <span class="min">↓${Math.round(daily.temperature_2m_min[0])}°</span>
      </div>
      <div class="card-details">
        <span class="card-detail">💨 ${t.wind} ${Math.round(cur.wind_speed_10m)}km/h</span>
        <span class="card-detail">💧 ${t.humidity} ${cur.relative_humidity_2m}%</span>
      </div>
    `;
    card.classList.add("loaded");
  }

  /** フェッチ失敗時にエラー表示カードを描画する */
  private setCardError(loc: Loc): void {
    const card = document.getElementById(`card-${loc.id}`);
    if (!card) return;
    const { name, region } = this.i18n.display(loc);
    card.innerHTML = `
      <div class="card-city">${name}</div>
      <div class="card-region">${region}</div>
      <div class="error">${this.i18n.t.failed}</div>
    `;
  }

  /** 主要都市の速報テロップ（city-track）を最新データで更新する */
  private updateCityTicker(): void {
    const chunks = this.cities.map((c) => {
      const data = this.cache[c.id];
      if (!data?.current || !data?.daily) return `${c.name_ja}: --`;
      const w = this.i18n.decodeWMO(data.current.weather_code);
      const rain = data.daily.precipitation_probability_max?.[0] ?? "--";
      return `${this.i18n.display(c).name} ${Math.round(data.current.temperature_2m)}°C ${this.i18n.wmoDesc(w)} ${this.i18n.t.precip}${rain}%`;
    });
    setTickerText("city-track", chunks.join(" ｜ "), this.i18n.t.noInfo);
  }
}

// ─── WarningPanel ─────────────────────────────────────────────────────────────

/**
 * 気象庁（JMA）の警報・注意報 API を全エリア並列フェッチし、
 * alert-track マーキーに結果を表示する。
 * 警報テキストは生文（日本語）のため、ラベルも常に label_ja を使用する。
 */
class WarningPanel {
  constructor(
    private readonly areas: WarningArea[],
    private readonly i18n: I18n,
  ) {}

  async fetch(): Promise<void> {
    try {
      const results = await Promise.allSettled(
        this.areas.map(async (area) => {
          const res = await fetch(
            `https://www.jma.go.jp/bosai/warning/data/warning/${area.code}.json`,
          );
          if (!res.ok) throw new Error(String(res.status));
          const data = await res.json();
          const headline = (data.headlineText || "").trim();
          const reportTime = (data.reportDatetime || "")
            .replace("T", " ")
            .replace("+09:00", "");
          // 目立つ見出しがない場合は「現在、目立つ警報見出しなし」と表示
          if (!headline)
            return `${area.label_ja}: ${this.i18n.ui.ja.warningNoHeadline}`;
          return `${area.label_ja} [${reportTime}] ${headline}`;
        }),
      );

      const lines = results.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : `${this.areas[i].label_ja}: ${this.i18n.ui.ja.warningFetchFailed}`,
      );
      setTickerText("alert-track", lines.join(" ｜ "), this.i18n.t.noInfo);
    } catch {
      setTickerText(
        "alert-track",
        this.i18n.ui.ja.warningAllFailed,
        this.i18n.t.noInfo,
      );
    }
  }
}

// ─── PiPanel ──────────────────────────────────────────────────────────────────

/**
 * ローカルサーバーの /api/pi-status エンドポイントから
 * Raspberry Pi のシステム情報を取得して表示する。
 */
class PiPanel {
  private readonly el = document.getElementById("pi-status")!;

  constructor(private readonly i18n: I18n) {}

  async fetch(): Promise<void> {
    try {
      const res = await fetch("/api/pi-status");
      if (!res.ok) throw new Error("status");
      const s: PiStatus = await res.json();
      const t = this.i18n.t;
      const mem = s.mem
        ? `${s.mem.used_gb}/${s.mem.total_gb}GB (${s.mem.used_pct}%)`
        : "--";
      const disk = s.disk
        ? `${s.disk.used_gb}/${s.disk.total_gb}GB (${s.disk.used_pct}%)`
        : "--";
      this.el.innerHTML = `
        <span>${t.piTemp}: <b>${s.cpu_temp_c ?? "--"}°C</b></span>
        <span>${t.piLoad}: <b>${s.load1 ?? "--"}</b></span>
        <span>${t.piMem}: <b>${mem}</b></span>
        <span>${t.piDisk}: <b>${disk}</b></span>
        <span>${t.piUptime}: <b>${s.uptime || "--"}</b></span>
        <span>${t.piIp}: <b>${s.ip || "--"}</b></span>
      `;
    } catch {
      this.el.innerHTML = `<span>${this.i18n.t.failed}</span>`;
    }
  }
}

// ─── WeatherBoard (root) ──────────────────────────────────────────────────────

/**
 * アプリケーションのルートクラス。
 * 各パネルをインスタンス化して依存を注入し、更新タイマーと言語ローテーションを管理する。
 *
 * タイマー構成:
 *   - 1 秒ごと  : ClockPanel.tick()
 *   - 12 秒ごと : 長野ページ切替（onPageSwitch）
 *   - 24 秒ごと : 言語切替（ページ切替 2 回に 1 回 = pageSwitchCount % 2 === 0）
 *   - 10 分ごと : 警報情報更新
 *   - 30 分ごと : 天気データ更新
 *   - 60 秒ごと : Pi ステータス更新
 */
class WeatherBoard {
  private readonly i18n: I18n;
  private readonly grid: WeatherGrid;
  private readonly clock: ClockPanel;
  private readonly warning: WarningPanel;
  private readonly pi: PiPanel;

  /** 長野ページが切り替わった回数。2 回に 1 回言語を切り替えるカウンタ */
  private pageSwitchCount = 0;

  constructor() {
    const data = i18nRaw as I18nData;
    this.i18n = new I18n(data);
    this.grid = new WeatherGrid(data.cities, data.nagano, this.i18n);
    // ClockPanel には WeatherGrid の nextRefreshAt をゲッター関数として渡す（疎結合）
    this.clock = new ClockPanel(this.i18n, () => this.grid.nextRefreshAt);
    this.warning = new WarningPanel(data.warning_areas, this.i18n);
    this.pi = new PiPanel(this.i18n);
  }

  /** 全パネルを初期化し、定期更新タイマーを起動する */
  start(): void {
    this.applyLang();
    this.grid.init();
    this.clock.tick();
    setInterval(() => this.clock.tick(), 1000);

    // 初回データ取得
    void this.grid.refresh();
    void this.warning.fetch();
    void this.pi.fetch();
    document.body.classList.add("cursor-hidden");
    this.initCursorHide();

    // 定期更新タイマー
    setInterval(() => void this.grid.refresh(), WEATHER_REFRESH_MS);
    setInterval(() => void this.warning.fetch(), 10 * 60 * 1000);
    setInterval(() => void this.pi.fetch(), 60 * 1000);
    setInterval(() => this.onPageSwitch(), 12 * 1000);
  }

  /** 現在言語でヘッダー等の静的ラベルを一括更新する */
  private applyLang(): void {
    const t = this.i18n.t;
    (
      [
        ["board-title", t.boardTitle],
        ["warning-title", t.warningTitle],
        ["pi-title", t.piTitle],
        ["major-label", t.majorLabel],
        ["nagano-label", t.naganoLabel],
      ] as [string, string][]
    ).forEach(([id, text]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
    this.clock.updateNextUpdate();
  }

  /** 言語を次に切り替え、全パネルを新しい言語で即時再描画する */
  private rotateLang(): void {
    this.i18n.rotateLang();
    this.applyLang();
    this.grid.redrawAll(); // キャッシュ済みデータで即時再描画
    void this.warning.fetch(); // 警報ラベルは日本語固定だが UI テキストが変わりうる
    void this.pi.fetch();
    this.updateLastUpdated();
  }

  /**
   * 12 秒ごとに呼ばれる。長野エリアのページを進め、
   * 2 回に 1 回（= 24 秒ごと）言語を切り替える。
   */
  private onPageSwitch(): void {
    this.grid.nextNaganoPage();
    this.pageSwitchCount++;
    if (this.pageSwitchCount % 2 === 0) this.rotateLang();
  }

  /**
   * マウス・タッチ・キー操作を検知してカーソルを一時表示する。
   * 3 秒無操作で再び非表示にする（デジタルサイネージ向け）。
   */
  private initCursorHide(): void {
    let timer: ReturnType<typeof setTimeout>;
    const show = () => {
      document.body.classList.remove("cursor-hidden");
      clearTimeout(timer);
      timer = setTimeout(
        () => document.body.classList.add("cursor-hidden"),
        3000,
      );
    };
    (
      ["mousemove", "mousedown", "wheel", "touchstart", "keydown"] as const
    ).forEach((evt) => window.addEventListener(evt, show, { passive: true }));
  }

  /** #last-updated の「最終更新 HH:MM」テキストを現在時刻で更新する */
  private updateLastUpdated(): void {
    const now = new Date();
    const el = document.getElementById("last-updated");
    if (el) el.textContent = `${this.i18n.t.updated}: ${formatHourMinute(now)}`;
  }
}

// ─── エントリーポイント ────────────────────────────────────────────────────────

new WeatherBoard().start();
