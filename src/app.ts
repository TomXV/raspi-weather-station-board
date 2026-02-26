const CITIES = [
  { id: 'sapporo', name: '札幌', enName: 'Sapporo', region: '北海道', enRegion: 'Hokkaido', lat: 43.0618, lon: 141.3545 },
  { id: 'sendai',  name: '仙台', enName: 'Sendai', region: '宮城県', enRegion: 'Miyagi', lat: 38.2688, lon: 140.8721 },
  { id: 'tokyo',   name: '東京', enName: 'Tokyo', region: '東京都', enRegion: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { id: 'nagoya',  name: '名古屋', enName: 'Nagoya', region: '愛知県', enRegion: 'Aichi', lat: 35.1815, lon: 136.9066 },
  { id: 'osaka',   name: '大阪', enName: 'Osaka', region: '大阪府', enRegion: 'Osaka', lat: 34.6937, lon: 135.5023 },
  { id: 'fukuoka', name: '福岡', enName: 'Fukuoka', region: '福岡県', enRegion: 'Fukuoka', lat: 33.5904, lon: 130.4017 },
];

const NAGANO = [
  { id: 'hokushin', name: '長野市', enName: 'Nagano', region: '北信', enRegion: 'North Shin', lat: 36.6485, lon: 138.1948 },
  { id: 'toushin',  name: '上田市', enName: 'Ueda', region: '東信', enRegion: 'East Shin', lat: 36.4020, lon: 138.2490 },
  { id: 'chushin',  name: '松本市', enName: 'Matsumoto', region: '中信', enRegion: 'Central Shin', lat: 36.2380, lon: 137.9724 },
  { id: 'nanshin',  name: '飯田市', enName: 'Iida', region: '南信', enRegion: 'South Shin', lat: 35.5151, lon: 137.8217 },
  { id: 'suwa',     name: '諏訪市', enName: 'Suwa', region: '諏訪エリア', enRegion: 'Suwa Area', lat: 36.0392, lon: 138.1131 },
  { id: 'inaji',    name: '伊那市', enName: 'Ina', region: '伊那路エリア', enRegion: 'Inaji Area', lat: 35.8274, lon: 137.9537 },
  { id: 'kisoj',    name: '木曽町', enName: 'Kiso', region: '木曽路エリア', enRegion: 'Kisoji Area', lat: 35.8423, lon: 137.6937 },
  { id: 'alps',     name: '大町市', enName: 'Omachi', region: '日本アルプスエリア', enRegion: 'Japan Alps Area', lat: 36.5045, lon: 137.8518 },
];

const WARNING_AREAS = [
  { label: '札幌(北海道)', code: '016000' },
  { label: '仙台(宮城県)', code: '040000' },
  { label: '東京(東京都)', code: '130000' },
  { label: '名古屋(愛知県)', code: '230000' },
  { label: '大阪(大阪府)', code: '270000' },
  { label: '福岡(福岡県)', code: '400000' },
  { label: '長野県', code: '200000' },
];

type Lang = 'ja' | 'en';
let currentLang: Lang = 'ja';

const UI_TEXT = {
  ja: {
    boardTitle: '⛅ 気象情報ボード',
    warningTitle: '⚠ 警報・注意報（主要都市 + 長野県 / 生文）',
    piTitle: '🖥 Raspberry Pi ステータス',
    majorLabel: '▶ 主要都市',
    naganoLabel: '▶ 長野県',
    updated: '最終更新',
    updating: '更新中...',
    precip: '降水量',
    wind: '風速',
    humidity: '湿度',
    failed: '取得失敗',
    page: 'ページ',
  },
  en: {
    boardTitle: '⛅ Weather Board',
    warningTitle: '⚠ Warning / Advisory (Major Cities + Nagano / Raw Text)',
    piTitle: '🖥 Raspberry Pi Status',
    majorLabel: '▶ Major Cities',
    naganoLabel: '▶ Nagano',
    updated: 'Updated',
    updating: 'Updating...',
    precip: 'Rain',
    wind: 'Wind',
    humidity: 'Humidity',
    failed: 'Fetch Failed',
    page: 'Page',
  }
};

function decodeWMO(code: number) {
  const map: Record<number, { icon: string; ja: string; en: string }> = {
    0:  { icon: '☀️', ja: '快晴', en: 'Clear' },
    1:  { icon: '🌤️', ja: 'ほぼ晴れ', en: 'Mostly clear' },
    2:  { icon: '⛅', ja: '一部曇り', en: 'Partly cloudy' },
    3:  { icon: '☁️', ja: '曇り', en: 'Cloudy' },
    45: { icon: '🌫️', ja: '霧', en: 'Fog' },
    48: { icon: '🌫️', ja: '霧(着氷)', en: 'Rime fog' },
    51: { icon: '🌦️', ja: '霧雨(弱)', en: 'Light drizzle' },
    53: { icon: '🌦️', ja: '霧雨', en: 'Drizzle' },
    55: { icon: '🌦️', ja: '霧雨(強)', en: 'Dense drizzle' },
    61: { icon: '🌧️', ja: '雨(弱)', en: 'Light rain' },
    63: { icon: '🌧️', ja: '雨', en: 'Rain' },
    65: { icon: '🌧️', ja: '雨(強)', en: 'Heavy rain' },
    71: { icon: '🌨️', ja: '雪(弱)', en: 'Light snow' },
    73: { icon: '❄️', ja: '雪', en: 'Snow' },
    75: { icon: '❄️', ja: '雪(強)', en: 'Heavy snow' },
    77: { icon: '🌨️', ja: 'あられ', en: 'Snow grains' },
    80: { icon: '🌦️', ja: 'にわか雨(弱)', en: 'Light showers' },
    81: { icon: '🌦️', ja: 'にわか雨', en: 'Showers' },
    82: { icon: '⛈️', ja: 'にわか雨(強)', en: 'Heavy showers' },
    85: { icon: '🌨️', ja: 'にわか雪', en: 'Snow showers' },
    86: { icon: '🌨️', ja: 'にわか雪(強)', en: 'Heavy snow showers' },
    95: { icon: '⛈️', ja: '雷雨', en: 'Thunderstorm' },
    96: { icon: '⛈️', ja: '雷雨+ひょう', en: 'Storm + hail' },
    99: { icon: '⛈️', ja: '激しい雷雨', en: 'Severe storm' },
  };
  return map[code] || { icon: '❓', ja: `(${code})`, en: `(${code})` };
}

function getDisplay(loc: any) {
  return {
    name: currentLang === 'en' ? (loc.enName || loc.name) : loc.name,
    region: currentLang === 'en' ? (loc.enRegion || loc.region) : loc.region,
  };
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
}

// カード HTML 生成
function buildCard(loc, isNagano) {
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
let naganoPage = 0;
const weatherCache = {};

function renderNaganoPage(pageIndex) {
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
  CITIES.forEach(c => cg.appendChild(buildCard(c, false)));

  renderNaganoPage(0);
}

// Open-Meteo API から取得
async function fetchWeather(loc) {
  const url = `https://api.open-meteo.com/v1/forecast?`
    + `latitude=${loc.lat}&longitude=${loc.lon}`
    + `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
    + `&timezone=Asia%2FTokyo&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

function setTickerText(trackId, text) {
  const el = document.getElementById(trackId);
  if (!el) return;
  const clean = (text || '').trim() || '情報なし';
  // シームレススクロール用に同じ内容を2回並べる
  el.textContent = `${clean}　◆　${clean}　◆　`;

  // 長文ほどゆっくり流す（可読性優先）
  const sec = Math.max(24, Math.min(90, Math.round(clean.length * 0.45)));
  el.style.animationDuration = `${sec}s`;
}

function updateCityTicker() {
  const chunks = CITIES.map(c => {
    const data = weatherCache[c.id];
    if (!data || !data.current || !data.daily) return `${c.name}: --`;
    const { desc } = decodeWMO(data.current.weather_code);
    const t = Math.round(data.current.temperature_2m);
    const rain = data.daily.precipitation_probability_max?.[0] ?? '--';
    return `${c.name} ${t}°C ${desc} 降水${rain}%`;
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
        if (!headline) return `${area.label}: 現在、目立つ警報見出しなし`;
        return `${area.label} [${reportTime}] ${headline}`;
      })
    );

    const lines = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return `${WARNING_AREAS[i].label}: 取得失敗`;
    });

    setTickerText('alert-track', lines.join(' ｜ '));
  } catch (e) {
    setTickerText('alert-track', '警報・注意報情報の取得に失敗');
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

    const labels = currentLang === 'en'
      ? { temp: 'Temp', load: 'Load', mem: 'Memory', disk: 'Disk', up: 'Uptime', ip: 'IP' }
      : { temp: '温度', load: '負荷', mem: 'メモリ', disk: 'ディスク', up: '稼働', ip: 'IP' };

    document.getElementById('pi-status').innerHTML = `
      <span>${labels.temp}: <b>${temp}°C</b></span>
      <span>${labels.load}: <b>${load}</b></span>
      <span>${labels.mem}: <b>${mem}</b></span>
      <span>${labels.disk}: <b>${disk}</b></span>
      <span>${labels.up}: <b>${uptime}</b></span>
      <span>${labels.ip}: <b>${ip}</b></span>
    `;
  } catch (e) {
    document.getElementById('pi-status').innerHTML = `<span>${UI_TEXT[currentLang].failed}</span>`;
  }
}

// カード更新
function updateCard(loc, data) {
  const card = document.getElementById(`card-${loc.id}`);
  if (!card) return;

  const cur = data.current;
  const daily = data.daily;
  const w = decodeWMO(cur.weather_code);
  const desc = currentLang === 'en' ? w.en : w.ja;
  const tempMax = Math.round(daily.temperature_2m_max[0]);
  const tempMin = Math.round(daily.temperature_2m_min[0]);
  const precip = daily.precipitation_probability_max[0] ?? '--';
  const d = getDisplay(loc);
  const t = UI_TEXT[currentLang];

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

function setCardError(loc, msg) {
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
  document.getElementById('last-updated').textContent = `${UI_TEXT[currentLang].updating}`;
  const all = [...CITIES, ...NAGANO];
  await Promise.allSettled(all.map(async loc => {
    try {
      const data = await fetchWeather(loc);
      weatherCache[loc.id] = data;
      updateCard(loc, data);
    } catch (e) {
      setCardError(loc, e.message);
    }
  }));
  updateCityTicker();
  const now = new Date();
  document.getElementById('last-updated').textContent =
    `${UI_TEXT[currentLang].updated}: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
}

// 時計
function tickClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2,'0');
  const m = now.getMinutes().toString().padStart(2,'0');
  const s = now.getSeconds().toString().padStart(2,'0');
  document.getElementById('clock').textContent = `${h}:${m}:${s}`;

  const days = ['日','月','火','水','木','金','土'];
  const y = now.getFullYear();
  const mo = (now.getMonth()+1).toString().padStart(2,'0');
  const d = now.getDate().toString().padStart(2,'0');
  const dow = days[now.getDay()];
  document.getElementById('date-str').textContent = `${y}/${mo}/${d} (${dow})`;
}

// カーソル自動非表示（起動直後から非表示 / 3秒無操作で再び隠す）
let cursorHideTimer;
function showCursorTemporarily() {
  document.body.classList.remove('cursor-hidden');
  clearTimeout(cursorHideTimer);
  cursorHideTimer = setTimeout(() => {
    document.body.classList.add('cursor-hidden');
  }, 3000);
}
['mousemove','mousedown','wheel','touchstart','keydown'].forEach(evt => {
  window.addEventListener(evt, showCursorTemporarily, { passive: true });
});

function toggleLanguage() {
  currentLang = currentLang === 'ja' ? 'en' : 'ja';
  applyStaticLanguage();
  // キャッシュ済みデータで即時描画しなおす
  CITIES.forEach(c => {
    if (weatherCache[c.id]) updateCard(c, weatherCache[c.id]);
  });
  renderNaganoPage(naganoPage);
  fetchPiStatus();
  const now = new Date();
  document.getElementById('last-updated').textContent =
    `${UI_TEXT[currentLang].updated}: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
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

setInterval(refresh, 30 * 60 * 1000); // 30分ごと
setInterval(fetchWarningInfo, 10 * 60 * 1000); // 10分ごと
setInterval(fetchPiStatus, 60 * 1000); // 1分ごと
setInterval(() => renderNaganoPage(naganoPage + 1), 12 * 1000); // 12秒ごとに長野ページ切替
setInterval(toggleLanguage, 24 * 1000); // 24秒ごとに日本語/英語切替
