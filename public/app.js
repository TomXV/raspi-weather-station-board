var $=[{id:"sapporo",name:"札幌",region:"北海道",lat:43.0618,lon:141.3545},{id:"sendai",name:"仙台",region:"宮城県",lat:38.2688,lon:140.8721},{id:"tokyo",name:"東京",region:"東京都",lat:35.6762,lon:139.6503},{id:"nagoya",name:"名古屋",region:"愛知県",lat:35.1815,lon:136.9066},{id:"osaka",name:"大阪",region:"大阪府",lat:34.6937,lon:135.5023},{id:"fukuoka",name:"福岡",region:"福岡県",lat:33.5904,lon:130.4017}],X=[{id:"hokushin",name:"長野市",region:"北信",lat:36.6485,lon:138.1948},{id:"toushin",name:"上田市",region:"東信",lat:36.402,lon:138.249},{id:"chushin",name:"松本市",region:"中信",lat:36.238,lon:137.9724},{id:"nanshin",name:"飯田市",region:"南信",lat:35.5151,lon:137.8217},{id:"suwa",name:"諏訪市",region:"諏訪エリア",lat:36.0392,lon:138.1131},{id:"inaji",name:"伊那市",region:"伊那路エリア",lat:35.8274,lon:137.9537},{id:"kisoj",name:"木曽町",region:"木曽路エリア",lat:35.8423,lon:137.6937},{id:"alps",name:"大町市",region:"日本アルプスエリア",lat:36.5045,lon:137.8518}],b=[{label:"札幌(北海道)",code:"016000"},{label:"仙台(宮城県)",code:"040000"},{label:"東京(東京都)",code:"130000"},{label:"名古屋(愛知県)",code:"230000"},{label:"大阪(大阪府)",code:"270000"},{label:"福岡(福岡県)",code:"400000"},{label:"長野県",code:"200000"}];function H(q){return{0:{icon:"☀️",desc:"快晴"},1:{icon:"\uD83C\uDF24️",desc:"ほぼ晴れ"},2:{icon:"⛅",desc:"一部曇り"},3:{icon:"☁️",desc:"曇り"},45:{icon:"\uD83C\uDF2B️",desc:"霧"},48:{icon:"\uD83C\uDF2B️",desc:"霧(着氷)"},51:{icon:"\uD83C\uDF26️",desc:"霧雨(弱)"},53:{icon:"\uD83C\uDF26️",desc:"霧雨"},55:{icon:"\uD83C\uDF26️",desc:"霧雨(強)"},61:{icon:"\uD83C\uDF27️",desc:"雨(弱)"},63:{icon:"\uD83C\uDF27️",desc:"雨"},65:{icon:"\uD83C\uDF27️",desc:"雨(強)"},71:{icon:"\uD83C\uDF28️",desc:"雪(弱)"},73:{icon:"❄️",desc:"雪"},75:{icon:"❄️",desc:"雪(強)"},77:{icon:"\uD83C\uDF28️",desc:"あられ"},80:{icon:"\uD83C\uDF26️",desc:"にわか雨(弱)"},81:{icon:"\uD83C\uDF26️",desc:"にわか雨"},82:{icon:"⛈️",desc:"にわか雨(強)"},85:{icon:"\uD83C\uDF28️",desc:"にわか雪"},86:{icon:"\uD83C\uDF28️",desc:"にわか雪(強)"},95:{icon:"⛈️",desc:"雷雨"},96:{icon:"⛈️",desc:"雷雨+ひょう"},99:{icon:"⛈️",desc:"激しい雷雨"}}[q]||{icon:"❓",desc:`(${q})`}}function Z(q,z){let j=document.createElement("div");return j.className="weather-card",j.id=`card-${q.id}`,j.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div class="card-city">${q.name}</div>
        <div class="card-region">${q.region}</div>
      </div>
      <div class="loading">…</div>
    </div>
  `,j}var V=4,L=0,Q={};function M(q){let z=document.getElementById("nagano-grid");if(!z)return;let j=Math.ceil(X.length/V);L=(q%j+j)%j;let B=L*V,D=X.slice(B,B+V);z.innerHTML="",D.forEach((J)=>{if(z.appendChild(Z(J,!0)),Q[J.id])W(J,Q[J.id])});let F=document.getElementById("nagano-page-indicator");if(F)F.textContent=`(${L+1}/${j})`}function f(){let q=document.getElementById("cities-grid");$.forEach((z)=>q.appendChild(Z(z,!1))),M(0)}async function S(q){let z=`https://api.open-meteo.com/v1/forecast?latitude=${q.lat}&longitude=${q.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=1`,j=await fetch(z);if(!j.ok)throw Error(j.status);return j.json()}function Y(q,z){let j=document.getElementById(q);if(!j)return;let B=(z||"").trim()||"情報なし";j.textContent=`${B}　◆　${B}　◆　`;let D=Math.max(24,Math.min(90,Math.round(B.length*0.45)));j.style.animationDuration=`${D}s`}function P(){let q=$.map((z)=>{let j=Q[z.id];if(!j||!j.current||!j.daily)return`${z.name}: --`;let{desc:B}=H(j.current.weather_code),D=Math.round(j.current.temperature_2m),F=j.daily.precipitation_probability_max?.[0]??"--";return`${z.name} ${D}°C ${B} 降水${F}%`});Y("city-track",q.join(" ｜ "))}async function R(){try{let z=(await Promise.allSettled(b.map(async(j)=>{let B=await fetch(`https://www.jma.go.jp/bosai/warning/data/warning/${j.code}.json`);if(!B.ok)throw Error(String(B.status));let D=await B.json(),F=(D.headlineText||"").trim(),J=(D.reportDatetime||"").replace("T"," ").replace("+09:00","");if(!F)return`${j.label}: 現在、目立つ警報見出しなし`;return`${j.label} [${J}] ${F}`}))).map((j,B)=>{if(j.status==="fulfilled")return j.value;return`${b[B].label}: 取得失敗`});Y("alert-track",z.join(" ｜ "))}catch(q){Y("alert-track","警報・注意報情報の取得に失敗")}}async function y(){try{let q=await fetch("/api/pi-status");if(!q.ok)throw Error("status");let z=await q.json(),j=z.mem?`${z.mem.used_gb}/${z.mem.total_gb}GB (${z.mem.used_pct}%)`:"--",B=z.disk?`${z.disk.used_gb}/${z.disk.total_gb}GB (${z.disk.used_pct}%)`:"--",D=z.cpu_temp_c??"--",F=z.load1??"--",J=z.uptime||"--",K=z.ip||"--";document.getElementById("pi-status").innerHTML=`
      <span>温度: <b>${D}°C</b></span>
      <span>負荷: <b>${F}</b></span>
      <span>メモリ: <b>${j}</b></span>
      <span>ディスク: <b>${B}</b></span>
      <span>稼働: <b>${J}</b></span>
      <span>IP: <b>${K}</b></span>
    `}catch(q){document.getElementById("pi-status").innerHTML="<span>取得失敗</span>"}}function W(q,z){let j=document.getElementById(`card-${q.id}`);if(!j)return;let{current:B,daily:D}=z,{icon:F,desc:J}=H(B.weather_code),K=Math.round(D.temperature_2m_max[0]),U=Math.round(D.temperature_2m_min[0]),_=D.precipitation_probability_max[0]??"--";j.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div class="card-city">${q.name}</div>
        <div class="card-region">${q.region}</div>
      </div>
      <div class="card-precip">\uD83D\uDCA7${_}%</div>
    </div>
    <div class="card-weather-row">
      <span class="card-icon">${F}</span>
      <div>
        <div>
          <span class="card-temp">${Math.round(B.temperature_2m)}</span>
          <span class="card-temp-unit">°C</span>
        </div>
        <div class="card-desc">${J}</div>
      </div>
    </div>
    <div class="card-minmax">
      <span class="max">↑${K}°</span>
      &nbsp;
      <span class="min">↓${U}°</span>
    </div>
    <div class="card-details">
      <span class="card-detail">\uD83D\uDCA8 ${Math.round(B.wind_speed_10m)}km/h</span>
      <span class="card-detail">\uD83D\uDCA7 ${B.relative_humidity_2m}%</span>
    </div>
  `,j.classList.add("loaded")}function k(q,z){let j=document.getElementById(`card-${q.id}`);if(!j)return;j.innerHTML=`
    <div class="card-city">${q.name}</div>
    <div class="card-region">${q.region}</div>
    <div class="error">取得失敗</div>
  `}async function x(){document.getElementById("last-updated").textContent="更新中...";let q=[...$,...X];await Promise.allSettled(q.map(async(j)=>{try{let B=await S(j);Q[j.id]=B,W(j,B)}catch(B){k(j,B.message)}})),P();let z=new Date;document.getElementById("last-updated").textContent=`最終更新: ${z.getHours().toString().padStart(2,"0")}:${z.getMinutes().toString().padStart(2,"0")}`}function O(){let q=new Date,z=q.getHours().toString().padStart(2,"0"),j=q.getMinutes().toString().padStart(2,"0"),B=q.getSeconds().toString().padStart(2,"0");document.getElementById("clock").textContent=`${z}:${j}:${B}`;let D=["日","月","火","水","木","金","土"],F=q.getFullYear(),J=(q.getMonth()+1).toString().padStart(2,"0"),K=q.getDate().toString().padStart(2,"0"),U=D[q.getDay()];document.getElementById("date-str").textContent=`${F}/${J}/${K} (${U})`}var v;function m(){document.body.classList.remove("cursor-hidden"),clearTimeout(v),v=setTimeout(()=>{document.body.classList.add("cursor-hidden")},3000)}["mousemove","mousedown","wheel","touchstart","keydown"].forEach((q)=>{window.addEventListener(q,m,{passive:!0})});f();O();setInterval(O,1000);x();R();y();document.body.classList.add("cursor-hidden");setInterval(x,1800000);setInterval(R,600000);setInterval(y,60000);setInterval(()=>M(L+1),12000);
