const CITIES = [
  { id: 'sapporo', name: '札幌',    region: '北海道',  lat: 43.0618, lon: 141.3545 },
  { id: 'sendai',  name: '仙台',    region: '宮城県',  lat: 38.2688, lon: 140.8721 },
  { id: 'tokyo',   name: '東京',    region: '東京都',  lat: 35.6762, lon: 139.6503 },
  { id: 'nagoya',  name: '名古屋',  region: '愛知県',  lat: 35.1815, lon: 136.9066 },
  { id: 'osaka',   name: '大阪',    region: '大阪府',  lat: 34.6937, lon: 135.5023 },
  { id: 'fukuoka', name: '福岡',    region: '福岡県',  lat: 33.5904, lon: 130.4017 },
];

const NAGANO = [
  { id: 'hokushin',   name: '長野市', region: '北信', lat: 36.6485, lon: 138.1948 },
  { id: 'toushin',    name: '上田市', region: '東信', lat: 36.4020, lon: 138.2490 },
  { id: 'chushin',    name: '松本市', region: '中信', lat: 36.2380, lon: 137.9724 },
  { id: 'nanshin',    name: '飯田市', region: '南信', lat: 35.5151, lon: 137.8217 },
  { id: 'suwa',       name: '諏訪市', region: '諏訪エリア', lat: 36.0392, lon: 138.1131 },
  { id: 'inaji',      name: '伊那市', region: '伊那路エリア', lat: 35.8274, lon: 137.9537 },
  { id: 'kisoj',      name: '木曽町', region: '木曽路エリア', lat: 35.8423, lon: 137.6937 },
  { id: 'alps',       name: '大町市', region: '日本アルプスエリア', lat: 36.5045, lon: 137.8518 },
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

// WMO 天気コード → 絵文字 + 日本語
function decodeWMO(code) {
  const map = {
    0:  { icon: '☀️',  desc: '快晴' },
    1:  { icon: '🌤️', desc: 'ほぼ晴れ' },
    2:  { icon: '⛅',  desc: '一部曇り' },
    3:  { icon: '☁️',  desc: '曇り' },
    45: { icon: '🌫️', desc: '霧' },
    48: { icon: '🌫️', desc: '霧(着氷)' },
    51: { icon: '🌦️', desc: '霧雨(弱)' },
    53: { icon: '🌦️', desc: '霧雨' },
    55: { icon: '🌦️', desc: '霧雨(強)' },
    61: { icon: '🌧️', desc: '雨(弱)' },
    63: { icon: '🌧️', desc: '雨' },
    65: { icon: '🌧️', desc: '雨(強)' },
    71: { icon: '🌨️', desc: '雪(弱)' },
    73: { icon: '❄️',  desc: '雪' },
    75: { icon: '❄️',  desc: '雪(強)' },
    77: { icon: '🌨️', desc: 'あられ' },
    80: { icon: '🌦️', desc: 'にわか雨(弱)' },
    81: { icon: '🌦️', desc: 'にわか雨' },
    82: { icon: '⛈️', desc: 'にわか雨(強)' },
    85: { icon: '🌨️', desc: 'にわか雪' },
    86: { icon: '🌨️', desc: 'にわか雪(強)' },
    95: { icon: '⛈️', desc: '雷雨' },
    96: { icon: '⛈️', desc: '雷雨+ひょう' },
    99: { icon: '⛈️', desc: '激しい雷雨' },
  };
  return map[code] || { icon: '❓', desc: `(${code})` };
}

// カード HTML 生成
function buildCard(loc, isNagano) {
  const card = document.createElement('div');
  card.className = 'weather-card';
  card.id = `card-${loc.id}`;
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div class="card-city">${loc.name}</div>
        <div class="card-region">${loc.region}</div>
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

    document.getElementById('pi-status').innerHTML = `
      <span>温度: <b>${temp}°C</b></span>
      <span>負荷: <b>${load}</b></span>
      <span>メモリ: <b>${mem}</b></span>
      <span>ディスク: <b>${disk}</b></span>
      <span>稼働: <b>${uptime}</b></span>
      <span>IP: <b>${ip}</b></span>
    `;
  } catch (e) {
    document.getElementById('pi-status').innerHTML = `<span>取得失敗</span>`;
  }
}

// カード更新
function updateCard(loc, data) {
  const card = document.getElementById(`card-${loc.id}`);
  if (!card) return;

  const cur = data.current;
  const daily = data.daily;
  const { icon, desc } = decodeWMO(cur.weather_code);
  const tempMax = Math.round(daily.temperature_2m_max[0]);
  const tempMin = Math.round(daily.temperature_2m_min[0]);
  const precip = daily.precipitation_probability_max[0] ?? '--';

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div class="card-city">${loc.name}</div>
        <div class="card-region">${loc.region}</div>
      </div>
      <div class="card-precip">降水量:${precip}%</div>
    </div>
    <div class="card-weather-row">
      <span class="card-icon">${icon}</span>
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
      <span class="card-detail">💨 ${Math.round(cur.wind_speed_10m)}km/h</span>
      <span class="card-detail">💧 ${cur.relative_humidity_2m}%</span>
    </div>
  `;
  card.classList.add('loaded');
}

function setCardError(loc, msg) {
  const card = document.getElementById(`card-${loc.id}`);
  if (!card) return;
  card.innerHTML = `
    <div class="card-city">${loc.name}</div>
    <div class="card-region">${loc.region}</div>
    <div class="error">取得失敗</div>
  `;
}

// 全データ更新
async function refresh() {
  document.getElementById('last-updated').textContent = '更新中...';
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
    `最終更新: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
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

// 初期化
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
