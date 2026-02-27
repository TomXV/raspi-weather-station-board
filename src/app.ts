import i18nRaw from './i18n.toml';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'ja' | 'en' | 'zh' | 'ko';

interface LangText {
  boardTitle: string; warningTitle: string; piTitle: string;
  majorLabel: string; naganoLabel: string;
  updated: string; updating: string;
  precip: string; wind: string; humidity: string; failed: string;
  page: string; nextUpdate: string;
  calGregorian: string; calJapanese: string; calChinese: string;
  am: string; pm: string; hourUnit: string; weekdays: string[];
  piTemp: string; piLoad: string; piMem: string; piDisk: string; piUptime: string; piIp: string;
  warningNoHeadline: string; warningFetchFailed: string; warningAllFailed: string; noInfo: string;
}

interface Loc {
  id: string; lat: number; lon: number;
  name_ja: string; name_en: string; name_zh: string; name_ko: string;
  region_ja: string; region_en: string; region_zh: string; region_ko: string;
}

interface WarningArea {
  code: string; label_ja: string; label_en: string; label_zh: string;
}

interface WMOEntry {
  code: number; icon: string;
  ja: string; en: string; zh?: string; ko?: string;
}

const i18n = i18nRaw as {
  ui: Record<Lang, LangText>;
  cities: Loc[];
  nagano: Loc[];
  warning_areas: WarningArea[];
  wmo: WMOEntry[];
};

const CITIES        = i18n.cities;
const NAGANO        = i18n.nagano;
const WARNING_AREAS = i18n.warning_areas;
const UI_TEXT       = i18n.ui;
const WMO_MAP       = new Map<number, WMOEntry>(i18n.wmo.map(w => [w.code, w]));

let currentLang: Lang = 'ja';

function decodeWMO(code: number): WMOEntry {
  return WMO_MAP.get(code) ?? { code, icon: '❓', ja: `(${code})`, en: `(${code})`, ko: `(${code})` };
}

function getDisplay(loc: Loc) {
  const name = currentLang === 'en'
    ? (loc.name_en || loc.name_ja)
    : currentLang === 'zh'
      ? (loc.name_zh || loc.name_en || loc.name_ja)
      : currentLang === 'ko'
        ? (loc.name_ko || loc.name_en || loc.name_ja)
        : loc.name_ja;

  const region = currentLang === 'en'
    ? (loc.region_en || loc.region_ja)
    : currentLang === 'zh'
      ? (loc.region_zh || loc.region_en || loc.region_ja)
      : currentLang === 'ko'
        ? (loc.region_ko || loc.region_en || loc.region_ja)
        : loc.region_ja;

  return { name, region };
}

function applyStaticLanguage() {
  const t = UI_TEXT[currentLang];
  const board = document.getElementById('board-title');
  if (board) board.textContent = t.boardTitle;
  const warning = document.getElementById('warning-title');
  if (warning) warning.textContent = t.warningTitle;
  const pi = document.getElementById('pi-title');
  if (pi) pi.textContent = t.piTitle;
  const major = document.getElementById('major-label');
  if (major) major.textContent = t.majorLabel;
  const nag = document.getElementById('nagano-label');
  if (nag) nag.textContent = t.naganoLabel;
  updateNextUpdateLabel(new Date());
}

function warningAreaLabel(area: WarningArea) {
  // 警報・注意報テキストは常に日本語（生文優先）
  return area.label_ja;
}

// カード HTML 生成
function buildCard(loc: Loc, _isNagano: boolean) {
  const card = document.createElement('div');
  card.className = 'weather-card';
  card.id = `card-${loc.id}`;
  const d = getDisplay(loc);
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div class="card-city">${d.name}</div>
        <div class="card-region">${d.region}</div>
      </div>
      <div class="loading">…</div>
    </div>
  `;
  return card;
}

const NAGANO_PAGE_SIZE = 4;
const WEATHER_REFRESH_MS = 30 * 60 * 1000;
let nextRefreshAt = Date.now() + WEATHER_REFRESH_MS;
let naganoPage = 0;
const weatherCache: Record<string, any> = {};

function renderNaganoPage(pageIndex: number) {
  const ng = document.getElementById('nagano-grid');
  if (!ng) return;

  const pageCount = Math.ceil(NAGANO.length / NAGANO_PAGE_SIZE);
  naganoPage = ((pageIndex % pageCount) + pageCount) % pageCount;

  const start = naganoPage * NAGANO_PAGE_SIZE;
  const rows = NAGANO.slice(start, start + NAGANO_PAGE_SIZE);

  ng.innerHTML = '';
  rows.forEach(c => {
    ng.appendChild(buildCard(c, true));
    if (weatherCache[c.id]) updateCard(c, weatherCache[c.id]);
  });

  const ind = document.getElementById('nagano-page-indicator');
  if (ind) ind.textContent = `(${naganoPage + 1}/${pageCount})`;
}

// グリッドにカード配置
function initGrids() {
  const cg = document.getElementById('cities-grid');
  CITIES.forEach(c => cg!.appendChild(buildCard(c, false)));

  renderNaganoPage(0);
}

// Open-Meteo API から取得
async function fetchWeather(loc: Loc) {
  const url = `https://api.open-meteo.com/v1/forecast?`
    + `latitude=${loc.lat}&longitude=${loc.lon}`
    + `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
    + `&hourly=temperature_2m`
    + `&past_hours=2&forecast_hours=1`
    + `&timezone=Asia%2FTokyo&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status.toString());
  return res.json();
}

function setTickerText(trackId: string, text: string) {
  const el = document.getElementById(trackId);
  if (!el) return;
  const clean = (text || '').trim() || UI_TEXT[currentLang].noInfo;
  // シームレススクロール用に同じ内容を2回並べる
  el.textContent = `${clean}　◆　${clean}　◆　`;

  // 長文ほどゆっくり流す（可読性優先）
  const sec = Math.max(24, Math.min(90, Math.round(clean.length * 0.45)));
  el.style.animationDuration = `${sec}s`;
}

function updateCityTicker() {
  const chunks = CITIES.map(c => {
    const data = weatherCache[c.id];
    if (!data || !data.current || !data.daily) return `${c.name_ja}: --`;
    const w = decodeWMO(data.current.weather_code);
    const desc = currentLang === 'en' ? w.en
      : currentLang === 'zh' ? (w.zh || w.en)
      : currentLang === 'ko' ? (w.ko || w.en)
      : w.ja;
    const t = Math.round(data.current.temperature_2m);
    const rain = data.daily.precipitation_probability_max?.[0] ?? '--';
    const ut = UI_TEXT[currentLang];
    return `${getDisplay(c).name} ${t}°C ${desc} ${ut.precip}${rain}%`;
  });
  setTickerText('city-track', chunks.join(' ｜ '));
}

async function fetchWarningInfo() {
  try {
    const results = await Promise.allSettled(
      WARNING_AREAS.map(async area => {
        const res = await fetch(`https://www.jma.go.jp/bosai/warning/data/warning/${area.code}.json`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const headline = (data.headlineText || '').trim();
        const reportTime = (data.reportDatetime || '').replace('T', ' ').replace('+09:00', '');
        const label = warningAreaLabel(area);
        if (!headline) return `${label}: ${UI_TEXT.ja.warningNoHeadline}`;
        return `${label} [${reportTime}] ${headline}`;
      })
    );

    const lines = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const label = warningAreaLabel(WARNING_AREAS[i]);
      return `${label}: ${UI_TEXT.ja.warningFetchFailed}`;
    });

    setTickerText('alert-track', lines.join(' ｜ '));
  } catch (e) {
    setTickerText('alert-track', UI_TEXT.ja.warningAllFailed);
  }
}

async function fetchPiStatus() {
  try {
    const res = await fetch('/api/pi-status');
    if (!res.ok) throw new Error('status');
    const s = await res.json();
    const mem = s.mem ? `${s.mem.used_gb}/${s.mem.total_gb}GB (${s.mem.used_pct}%)` : '--';
    const disk = s.disk ? `${s.disk.used_gb}/${s.disk.total_gb}GB (${s.disk.used_pct}%)` : '--';
    const temp = (s.cpu_temp_c ?? '--');
    const load = (s.load1 ?? '--');
    const uptime = s.uptime || '--';
    const ip = s.ip || '--';

    const t = UI_TEXT[currentLang];

    document.getElementById('pi-status')!.innerHTML = `
      <span>${t.piTemp}: <b>${temp}°C</b></span>
      <span>${t.piLoad}: <b>${load}</b></span>
      <span>${t.piMem}: <b>${mem}</b></span>
      <span>${t.piDisk}: <b>${disk}</b></span>
      <span>${t.piUptime}: <b>${uptime}</b></span>
      <span>${t.piIp}: <b>${ip}</b></span>
    `;
  } catch (e) {
    document.getElementById('pi-status')!.innerHTML = `<span>${UI_TEXT[currentLang].failed}</span>`;
  }
}

function trendMeta(delta: number) {
  if (delta >= 1.5) return { symbol: '↑', cls: 'up-fast' };
  if (delta >= 0.5) return { symbol: '↗', cls: 'up' };
  if (delta <= -1.5) return { symbol: '↓', cls: 'down-fast' };
  if (delta <= -0.5) return { symbol: '↘', cls: 'down' };
  return { symbol: '→', cls: 'flat' };
}

function tempDeltaFrom30mAgo(data: any) {
  const currentTemp = Number(data?.current?.temperature_2m);
  const times = data?.hourly?.time || [];
  const temps = data?.hourly?.temperature_2m || [];
  if (!Number.isFinite(currentTemp) || !Array.isArray(times) || !Array.isArray(temps) || times.length === 0) {
    return 0;
  }

  const target = Date.now() - 30 * 60 * 1000;
  let bestIdx = -1;
  let bestDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const ts = new Date(times[i]).getTime();
    if (!Number.isFinite(ts)) continue;
    const diff = Math.abs(ts - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  if (bestIdx < 0 || !Number.isFinite(Number(temps[bestIdx]))) return 0;
  return currentTemp - Number(temps[bestIdx]);
}

// カード更新
function updateCard(loc: Loc, data: any) {
  const card = document.getElementById(`card-${loc.id}`);
  if (!card) return;

  const cur = data.current;
  const daily = data.daily;
  const w = decodeWMO(cur.weather_code);
  const desc = currentLang === 'en'
    ? w.en
    : currentLang === 'zh'
      ? (w.zh || w.en)
      : currentLang === 'ko'
        ? (w.ko || w.en)
        : w.ja;
  const tempMax = Math.round(daily.temperature_2m_max[0]);
  const tempMin = Math.round(daily.temperature_2m_min[0]);
  const precip = daily.precipitation_probability_max[0] ?? '--';
  const d = getDisplay(loc);
  const t = UI_TEXT[currentLang];

  const trend = trendMeta(tempDeltaFrom30mAgo(data));

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div class="card-city">${d.name}</div>
        <div class="card-region">${d.region}</div>
      </div>
      <div class="card-precip">${t.precip}:${precip}%</div>
    </div>
    <div class="card-weather-row">
      <span class="card-icon">${w.icon}</span>
      <div>
        <div>
          <span class="card-temp">${Math.round(cur.temperature_2m)}</span>
          <span class="card-temp-unit">°C</span>
          <span class="card-trend ${trend.cls}">${trend.symbol}</span>
        </div>
        <div class="card-desc">${desc}</div>
      </div>
    </div>
    <div class="card-minmax">
      <span class="max">↑${tempMax}°</span>
      &nbsp;
      <span class="min">↓${tempMin}°</span>
    </div>
    <div class="card-details">
      <span class="card-detail">💨 ${t.wind} ${Math.round(cur.wind_speed_10m)}km/h</span>
      <span class="card-detail">💧 ${t.humidity} ${cur.relative_humidity_2m}%</span>
    </div>
  `;
  card.classList.add('loaded');
}

function setCardError(loc: Loc, _msg: string) {
  const card = document.getElementById(`card-${loc.id}`);
  if (!card) return;
  const d = getDisplay(loc);
  card.innerHTML = `
    <div class="card-city">${d.name}</div>
    <div class="card-region">${d.region}</div>
    <div class="error">${UI_TEXT[currentLang].failed}</div>
  `;
}

// 全データ更新
async function refresh() {
  document.getElementById('last-updated')!.textContent = `${UI_TEXT[currentLang].updating}`;
  const all = [...CITIES, ...NAGANO];
  await Promise.allSettled(all.map(async loc => {
    try {
      const data = await fetchWeather(loc);
      weatherCache[loc.id] = data;
      updateCard(loc, data);
    } catch (e: any) {
      setCardError(loc, e.message);
    }
  }));
  updateCityTicker();
  const now = new Date();
  nextRefreshAt = now.getTime() + WEATHER_REFRESH_MS;
  document.getElementById('last-updated')!.textContent =
    `${UI_TEXT[currentLang].updated}: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
}

function updateNextUpdateLabel(now: Date) {
  const remain = Math.max(0, nextRefreshAt - now.getTime());
  const mm = String(Math.floor(remain / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remain % 60000) / 1000)).padStart(2, '0');
  const el = document.getElementById('next-update');
  if (el) el.textContent = `${UI_TEXT[currentLang].nextUpdate} ${mm}:${ss}`;
}

function formatDateWithCalendar(now: Date, cal: 'gregory' | 'japanese' | 'chinese') {
  try {
    if (cal === 'gregory') {
      return `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
    }
    if (cal === 'japanese') {
      return new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(now);
    }
    return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      year: 'numeric', month: 'long', day: 'numeric'
    }).format(now);
  } catch {
    return `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
  }
}

function currentCalendarMode(now: Date): 'gregory' | 'japanese' | 'chinese' {
  const phase = Math.floor(now.getTime() / 6000);
  if (currentLang === 'zh') {
    return (['gregory', 'japanese', 'chinese'] as const)[phase % 3];
  }
  return (['gregory', 'japanese'] as const)[phase % 2];
}

// 時計
function tickClock() {
  const now = new Date();
  const hour24 = now.getHours();
  const h = hour24.toString().padStart(2,'0');
  const m = now.getMinutes().toString().padStart(2,'0');
  const s = now.getSeconds().toString().padStart(2,'0');
  document.getElementById('clock')!.textContent = `${h}:${m}:${s}`;

  const hour12 = ((hour24 + 11) % 12) + 1;
  const am = hour24 < 12;
  const t = UI_TEXT[currentLang];
  const ampm = am ? t.am : t.pm;
  const clock12 = currentLang === 'en'
    ? `${ampm} ${hour12}:00`
    : `${ampm}${hour12}${t.hourUnit}`;
  const clock12El = document.getElementById('clock12-str');
  if (clock12El) clock12El.textContent = clock12;

  const weekdayEl = document.getElementById('weekday-str');
  if (weekdayEl) weekdayEl.textContent = t.weekdays[now.getDay()];

  const mode = currentCalendarMode(now);
  const dateEl = document.getElementById('date-str');
  if (dateEl) {
    dateEl.textContent = formatDateWithCalendar(now, mode);
    dateEl.classList.toggle('is-chinese-cal', mode === 'chinese');
  }

  updateNextUpdateLabel(now);
}

// カーソル自動非表示（起動直後から非表示 / 3秒無操作で再び隠す）
let cursorHideTimer: ReturnType<typeof setTimeout>;
function showCursorTemporarily() {
  document.body.classList.remove('cursor-hidden');
  clearTimeout(cursorHideTimer);
  cursorHideTimer = setTimeout(() => {
    document.body.classList.add('cursor-hidden');
  }, 3000);
}
(['mousemove','mousedown','wheel','touchstart','keydown'] as const).forEach(evt => {
  window.addEventListener(evt, showCursorTemporarily, { passive: true });
});

const LANG_ORDER: Lang[] = ['ja', 'en', 'zh', 'ko'];
let langIndex = 0;

function applyLanguage(nextLang: Lang) {
  if (nextLang === currentLang) return;
  currentLang = nextLang;
  applyStaticLanguage();

  // キャッシュ済みデータで即時描画しなおす
  CITIES.forEach(c => {
    if (weatherCache[c.id]) updateCard(c, weatherCache[c.id]);
  });
  renderNaganoPage(naganoPage);
  fetchWarningInfo();
  fetchPiStatus();

  const now = new Date();
  document.getElementById('last-updated')!.textContent =
    `${UI_TEXT[currentLang].updated}: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
}

function rotateLanguage() {
  langIndex = (langIndex + 1) % LANG_ORDER.length;
  applyLanguage(LANG_ORDER[langIndex]);
}

// 初期化
applyStaticLanguage();
initGrids();
tickClock();
setInterval(tickClock, 1000);

refresh();
fetchWarningInfo();
fetchPiStatus();
document.body.classList.add('cursor-hidden');

setInterval(refresh, WEATHER_REFRESH_MS); // 30分ごと
setInterval(fetchWarningInfo, 10 * 60 * 1000); // 10分ごと
setInterval(fetchPiStatus, 60 * 1000); // 1分ごと

let pageSwitchCount = 0;
setInterval(() => {
  renderNaganoPage(naganoPage + 1); // 12秒ごとに長野ページ切替
  pageSwitchCount++;
  if (pageSwitchCount % 2 === 0) {
    rotateLanguage(); // 24秒ごとに言語切替（ページ切替と同期）
  }
}, 12 * 1000);
