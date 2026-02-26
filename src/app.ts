const CITIES = [
  { id: 'sapporo', name: '札幌', enName: 'Sapporo', zhName: '札幌', koName: '삿포로', region: '北海道', enRegion: 'Hokkaido', zhRegion: '北海道', koRegion: '홋카이도', lat: 43.0618, lon: 141.3545 },
  { id: 'sendai',  name: '仙台', enName: 'Sendai', zhName: '仙台', koName: '센다이', region: '宮城県', enRegion: 'Miyagi', zhRegion: '宫城县', koRegion: '미야기현', lat: 38.2688, lon: 140.8721 },
  { id: 'tokyo',   name: '東京', enName: 'Tokyo', zhName: '东京', koName: '도쿄', region: '東京都', enRegion: 'Tokyo', zhRegion: '东京都', koRegion: '도쿄도', lat: 35.6762, lon: 139.6503 },
  { id: 'nagoya',  name: '名古屋', enName: 'Nagoya', zhName: '名古屋', koName: '나고야', region: '愛知県', enRegion: 'Aichi', zhRegion: '爱知县', koRegion: '아이치현', lat: 35.1815, lon: 136.9066 },
  { id: 'osaka',   name: '大阪', enName: 'Osaka', zhName: '大阪', koName: '오사카', region: '大阪府', enRegion: 'Osaka', zhRegion: '大阪府', koRegion: '오사카부', lat: 34.6937, lon: 135.5023 },
  { id: 'fukuoka', name: '福岡', enName: 'Fukuoka', zhName: '福冈', koName: '후쿠오카', region: '福岡県', enRegion: 'Fukuoka', zhRegion: '福冈县', koRegion: '후쿠오카현', lat: 33.5904, lon: 130.4017 },
];

const NAGANO = [
  { id: 'hokushin', name: '長野市', enName: 'Nagano', zhName: '长野市', koName: '나가노시', region: '北信', enRegion: 'North Shin', zhRegion: '北信', koRegion: '북신', lat: 36.6485, lon: 138.1948 },
  { id: 'toushin',  name: '上田市', enName: 'Ueda', zhName: '上田市', koName: '우에다시', region: '東信', enRegion: 'East Shin', zhRegion: '东信', koRegion: '동신', lat: 36.4020, lon: 138.2490 },
  { id: 'chushin',  name: '松本市', enName: 'Matsumoto', zhName: '松本市', koName: '마쓰모토시', region: '中信', enRegion: 'Central Shin', zhRegion: '中信', koRegion: '중신', lat: 36.2380, lon: 137.9724 },
  { id: 'nanshin',  name: '飯田市', enName: 'Iida', zhName: '饭田市', koName: '이다시', region: '南信', enRegion: 'South Shin', zhRegion: '南信', koRegion: '남신', lat: 35.5151, lon: 137.8217 },
  { id: 'suwa',     name: '諏訪市', enName: 'Suwa', zhName: '诹访市', koName: '스와시', region: '諏訪エリア', enRegion: 'Suwa Area', zhRegion: '诹访区域', koRegion: '스와 지역', lat: 36.0392, lon: 138.1131 },
  { id: 'inaji',    name: '伊那市', enName: 'Ina', zhName: '伊那市', koName: '이나시', region: '伊那路エリア', enRegion: 'Inaji Area', zhRegion: '伊那路区域', koRegion: '이나지 지역', lat: 35.8274, lon: 137.9537 },
  { id: 'kisoj',    name: '木曽町', enName: 'Kiso', zhName: '木曾町', koName: '기소마치', region: '木曽路エリア', enRegion: 'Kisoji Area', zhRegion: '木曾路区域', koRegion: '기소지 지역', lat: 35.8423, lon: 137.6937 },
  { id: 'alps',     name: '大町市', enName: 'Omachi', zhName: '大町市', koName: '오마치시', region: '日本アルプスエリア', enRegion: 'Japan Alps Area', zhRegion: '日本阿尔卑斯区域', koRegion: '일본 알프스 지역', lat: 36.5045, lon: 137.8518 },
];

const WARNING_AREAS = [
  { code: '016000', labelJa: '札幌(北海道)', labelEn: 'Sapporo (Hokkaido)', labelZh: '札幌（北海道）' },
  { code: '040000', labelJa: '仙台(宮城県)', labelEn: 'Sendai (Miyagi)', labelZh: '仙台（宫城县）' },
  { code: '130000', labelJa: '東京(東京都)', labelEn: 'Tokyo (Tokyo)', labelZh: '东京（东京都）' },
  { code: '230000', labelJa: '名古屋(愛知県)', labelEn: 'Nagoya (Aichi)', labelZh: '名古屋（爱知县）' },
  { code: '270000', labelJa: '大阪(大阪府)', labelEn: 'Osaka (Osaka)', labelZh: '大阪（大阪府）' },
  { code: '400000', labelJa: '福岡(福岡県)', labelEn: 'Fukuoka (Fukuoka)', labelZh: '福冈（福冈县）' },
  { code: '200000', labelJa: '長野県', labelEn: 'Nagano', labelZh: '长野县' },
];

type Lang = 'ja' | 'en' | 'zh' | 'ko';
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
    nextUpdate: '次回更新まで',
    calGregorian: '西暦',
    calJapanese: '和暦',
    calChinese: '中国暦',
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
    nextUpdate: 'Next update in',
    calGregorian: 'Gregorian',
    calJapanese: 'Japanese Era',
    calChinese: 'Chinese Calendar',
  },
  zh: {
    boardTitle: '⛅ 气象信息看板',
    warningTitle: '⚠ 警报/注意报（主要城市 + 长野 / 原文）',
    piTitle: '🖥 Raspberry Pi 状态',
    majorLabel: '▶ 主要城市',
    naganoLabel: '▶ 长野',
    updated: '更新',
    updating: '更新中...',
    precip: '降水',
    wind: '风速',
    humidity: '湿度',
    failed: '获取失败',
    page: '页',
    nextUpdate: '距离下次更新',
    calGregorian: '公历',
    calJapanese: '和历',
    calChinese: '农历',
  },
  ko: {
    boardTitle: '⛅ 기상 정보 보드',
    warningTitle: '⚠ 경보/주의보 (주요 도시 + 나가노 / 원문)',
    piTitle: '🖥 Raspberry Pi 상태',
    majorLabel: '▶ 주요 도시',
    naganoLabel: '▶ 나가노',
    updated: '갱신',
    updating: '갱신 중...',
    precip: '강수',
    wind: '풍속',
    humidity: '습도',
    failed: '가져오기 실패',
    page: '페이지',
    nextUpdate: '다음 업데이트까지',
    calGregorian: '서기',
    calJapanese: '화력',
    calChinese: '중국력',
  }
};

function decodeWMO(code: number) {
  const map: Record<number, { icon: string; ja: string; en: string; zh?: string; ko?: string }> = {
    0:  { icon: '☀️', ja: '快晴', en: 'Clear', ko: '맑음' },
    1:  { icon: '🌤️', ja: 'ほぼ晴れ', en: 'Mostly clear', ko: '대체로 맑음' },
    2:  { icon: '⛅', ja: '一部曇り', en: 'Partly cloudy', ko: '부분적으로 흐림' },
    3:  { icon: '☁️', ja: '曇り', en: 'Cloudy', ko: '흐림' },
    45: { icon: '🌫️', ja: '霧', en: 'Fog', ko: '안개' },
    48: { icon: '🌫️', ja: '霧(着氷)', en: 'Rime fog', ko: '착빙 안개' },
    51: { icon: '🌦️', ja: '霧雨(弱)', en: 'Light drizzle', ko: '약한 이슬비' },
    53: { icon: '🌦️', ja: '霧雨', en: 'Drizzle', ko: '이슬비' },
    55: { icon: '🌦️', ja: '霧雨(強)', en: 'Dense drizzle', ko: '강한 이슬비' },
    61: { icon: '🌧️', ja: '雨(弱)', en: 'Light rain', ko: '약한 비' },
    63: { icon: '🌧️', ja: '雨', en: 'Rain', ko: '비' },
    65: { icon: '🌧️', ja: '雨(強)', en: 'Heavy rain', ko: '강한 비' },
    71: { icon: '🌨️', ja: '雪(弱)', en: 'Light snow', ko: '약한 눈' },
    73: { icon: '❄️', ja: '雪', en: 'Snow', ko: '눈' },
    75: { icon: '❄️', ja: '雪(強)', en: 'Heavy snow', ko: '강한 눈' },
    77: { icon: '🌨️', ja: 'あられ', en: 'Snow grains', ko: '싸락눈' },
    80: { icon: '🌦️', ja: 'にわか雨(弱)', en: 'Light showers', ko: '약한 소나기' },
    81: { icon: '🌦️', ja: 'にわか雨', en: 'Showers', ko: '소나기' },
    82: { icon: '⛈️', ja: 'にわか雨(強)', en: 'Heavy showers', ko: '강한 소나기' },
    85: { icon: '🌨️', ja: 'にわか雪', en: 'Snow showers', ko: '눈 소나기' },
    86: { icon: '🌨️', ja: 'にわか雪(強)', en: 'Heavy snow showers', ko: '강한 눈 소나기' },
    95: { icon: '⛈️', ja: '雷雨', en: 'Thunderstorm', ko: '뇌우' },
    96: { icon: '⛈️', ja: '雷雨+ひょう', en: 'Storm + hail', ko: '뇌우+우박' },
    99: { icon: '⛈️', ja: '激しい雷雨', en: 'Severe storm', ko: '강한 뇌우' },
  };
  return map[code] || { icon: '❓', ja: `(${code})`, en: `(${code})`, ko: `(${code})` };
}

function getDisplay(loc: any) {
  const name = currentLang === 'en'
    ? (loc.enName || loc.name)
    : currentLang === 'zh'
      ? (loc.zhName || loc.enName || loc.name)
      : currentLang === 'ko'
        ? (loc.koName || loc.enName || loc.name)
        : loc.name;

  const region = currentLang === 'en'
    ? (loc.enRegion || loc.region)
    : currentLang === 'zh'
      ? (loc.zhRegion || loc.enRegion || loc.region)
      : currentLang === 'ko'
        ? (loc.koRegion || loc.enRegion || loc.region)
        : loc.region;

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

function warningAreaLabel(area: any) {
  // 警報・注意報テキストは常に日本語（生文優先）
  return area.labelJa;
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
const WEATHER_REFRESH_MS = 30 * 60 * 1000;
let nextRefreshAt = Date.now() + WEATHER_REFRESH_MS;
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
        const label = warningAreaLabel(area);
        if (!headline) return `${label}: 現在、目立つ警報見出しなし`;
        return `${label} [${reportTime}] ${headline}`;
      })
    );

    const lines = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const label = warningAreaLabel(WARNING_AREAS[i]);
      return `${label}: 取得失敗`;
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
      : currentLang === 'zh'
        ? { temp: '温度', load: '负载', mem: '内存', disk: '磁盘', up: '运行时长', ip: 'IP' }
        : currentLang === 'ko'
          ? { temp: '온도', load: '부하', mem: '메모리', disk: '디스크', up: '가동시간', ip: 'IP' }
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
  nextRefreshAt = now.getTime() + WEATHER_REFRESH_MS;
  document.getElementById('last-updated').textContent =
    `${UI_TEXT[currentLang].updated}: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
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

function updateNextUpdateLabel(now: Date) {
  const remain = Math.max(0, nextRefreshAt - now.getTime());
  const mm = String(Math.floor(remain / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remain % 60000) / 1000)).padStart(2, '0');
  const el = document.getElementById('next-update');
  if (el) el.textContent = `${UI_TEXT[currentLang].nextUpdate} ${mm}:${ss}`;
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
  document.getElementById('clock').textContent = `${h}:${m}:${s}`;

  const hour12 = ((hour24 + 11) % 12) + 1;
  const am = hour24 < 12;
  const clock12 = currentLang === 'en'
    ? `${am ? 'AM' : 'PM'} ${hour12}:00`
    : currentLang === 'zh'
      ? `${am ? '上午' : '下午'}${hour12}点`
      : currentLang === 'ko'
        ? `${am ? '오전' : '오후'} ${hour12}시`
        : `${am ? '午前' : '午後'}${hour12}時`;
  const clock12El = document.getElementById('clock12-str');
  if (clock12El) clock12El.textContent = clock12;

  const days = ['日','月','火','水','木','金','土'];
  const y = now.getFullYear();
  const mo = (now.getMonth()+1).toString().padStart(2,'0');
  const d = now.getDate().toString().padStart(2,'0');
  const dow = days[now.getDay()];
  const weekdayEl = document.getElementById('weekday-str');
  if (weekdayEl) {
    const w = currentLang === 'en' ? ['SUN','MON','TUE','WED','THU','FRI','SAT'][now.getDay()]
      : currentLang === 'zh' ? ['周日','周一','周二','周三','周四','周五','周六'][now.getDay()]
      : currentLang === 'ko' ? ['일','월','화','수','목','금','토'][now.getDay()]
      : `${dow}曜`;
    weekdayEl.textContent = w;
  }
  const mode = currentCalendarMode(now);
  const dateEl = document.getElementById('date-str');
  if (dateEl) {
    dateEl.textContent = formatDateWithCalendar(now, mode);
    dateEl.classList.toggle('is-chinese-cal', mode === 'chinese');
  }

  updateNextUpdateLabel(now);
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
  document.getElementById('last-updated').textContent =
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
