/* ═══════════════════════════════════════════════════════════
   THE DROWNED LEDGER — game core
   static PoC: state in localStorage, multiplayer simulated
   ═══════════════════════════════════════════════════════════ */
"use strict";

/* ── city registry (name, country, lat, lon) ───────────── */
const CITIES = [
  ["New York","US",40.71,-74.01],["Los Angeles","US",34.05,-118.24],["Chicago","US",41.88,-87.63],
  ["San Francisco","US",37.77,-122.42],["Seattle","US",47.61,-122.33],["Miami","US",25.76,-80.19],
  ["Houston","US",29.76,-95.37],["Denver","US",39.74,-104.99],["Honolulu","US",21.31,-157.86],
  ["Anchorage","US",61.22,-149.90],["Toronto","CA",43.65,-79.38],["Vancouver","CA",49.28,-123.12],
  ["Montreal","CA",45.50,-73.57],["Mexico City","MX",19.43,-99.13],["Havana","CU",23.11,-82.37],
  ["Bogotá","CO",4.71,-74.07],["Caracas","VE",10.48,-66.90],["Lima","PE",-12.05,-77.04],
  ["São Paulo","BR",-23.55,-46.63],["Buenos Aires","AR",-34.60,-58.38],["Santiago","CL",-33.45,-70.67],
  ["Reykjavík","IS",64.15,-21.94],["London","GB",51.51,-0.13],["Lisbon","PT",38.72,-9.14],
  ["Madrid","ES",40.42,-3.70],["Paris","FR",48.86,2.35],["Amsterdam","NL",52.37,4.90],
  ["Berlin","DE",52.52,13.40],["Rome","IT",41.90,12.50],["Stockholm","SE",59.33,18.07],
  ["Warsaw","PL",52.23,21.01],["Athens","GR",37.98,23.73],["Bucharest","RO",44.43,26.10],
  ["Istanbul","TR",41.01,28.98],["Moscow","RU",55.76,37.62],["Tel Aviv","IL",32.08,34.78],
  ["Cairo","EG",30.04,31.24],["Casablanca","MA",33.57,-7.59],["Accra","GH",5.60,-0.19],
  ["Lagos","NG",6.52,3.38],["Addis Ababa","ET",9.03,38.74],["Nairobi","KE",-1.29,36.82],
  ["Johannesburg","ZA",-26.20,28.05],["Dubai","AE",25.20,55.27],["Karachi","PK",24.86,67.01],
  ["Mumbai","IN",19.08,72.88],["Delhi","IN",28.61,77.21],["Bangalore","IN",12.97,77.59],
  ["Bangkok","TH",13.76,100.50],["Singapore","SG",1.35,103.82],["Jakarta","ID",-6.21,106.85],
  ["Ho Chi Minh City","VN",10.82,106.63],["Manila","PH",14.60,120.98],["Hong Kong","HK",22.32,114.17],
  ["Shanghai","CN",31.23,121.47],["Beijing","CN",39.90,116.40],["Seoul","KR",37.57,126.98],
  ["Tokyo","JP",35.68,139.69],["Perth","AU",-31.95,115.86],["Sydney","AU",-33.87,151.21],
  ["Melbourne","AU",-37.81,144.96],["Auckland","NZ",-36.85,174.76],
];

/* ── rites (buildings) ─────────────────────────────────── */
const RITES = [
  { id:"acolyte", name:"Unpaid Acolyte",            rate:0.1,   cost:15,     desc:"Files tribute forms in triplicate. Weeps quietly." },
  { id:"shrine",  name:"Cubicle Shrine",            rate:1,     cost:100,    desc:"Standing desk, ergonomic altar, blood drawer." },
  { id:"manager", name:"Middle Manager of the Deep",rate:8,     cost:1100,   desc:"Synergizes the drowned. Circles back eternally." },
  { id:"choir",   name:"Algorithmic Choir",         rate:47,    cost:12000,  desc:"Sings KPIs in a language older than profit." },
  { id:"fund",    name:"Offshore Leviathan Fund",   rate:260,   cost:130000, desc:"Very offshore. Beneath the shelf. Below the light." },
  { id:"dreams",  name:"Dream-Marketing Dept.",     rate:1400,  cost:1.4e6,  desc:"Targets ads at the sleeping. Conversion: total." },
  { id:"throat",  name:"Throat of the Ledger",      rate:7800,  cost:2.0e7,  desc:"All invoices are read aloud. All are approved." },
  { id:"moon",    name:"Subsidiary Moon",           rate:44000, cost:3.3e8,  desc:"Acquired in a hostile takeover of the tide." },
];

const SAVE_KEY = "drowned-ledger-v1";
const FRENZY_MULT = 7, FRENZY_SECS = 30;
const VISION_MULT = 2, VISION_MINS = 10, VISIONS_PER_DAY = 3;
const OFFLINE_CAP_H = 8, OFFLINE_EFF = 0.5;

/* ── state ─────────────────────────────────────────────── */
const defaultState = () => ({
  tribute: 0, total: 0, clicks: 0,
  clickLevel: 0,
  rites: {},                       // id -> count
  city: null,
  sound: true,
  lastSeen: Date.now(),
  daily: { date: "", streak: 0 },
  visions: { date: "", used: 0 },
  frenzyUntil: 0, boostUntil: 0,
  sim: null,                       // leaderboard simulation
  created: Date.now(),
});

let S = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = Object.assign(defaultState(), JSON.parse(raw));
      // saves are user-editable: only accept a city from our registry
      if (s.city && !CITIES.some(c => c[0] === s.city)) s.city = null;
      return s;
    }
  } catch (e) { /* corrupted save -> fresh start */ }
  return defaultState();
}
function save() {
  S.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}

/* ── derived numbers ───────────────────────────────────── */
const riteCount = (id) => S.rites[id] || 0;
const riteCost = (r) => Math.ceil(r.cost * Math.pow(1.15, riteCount(r.id)));
const clickUpCost = () => Math.ceil(50 * Math.pow(2.6, S.clickLevel));

function baseCps() {
  let c = 0;
  for (const r of RITES) c += r.rate * riteCount(r.id);
  return c;
}
function mult() {
  let m = 1;
  if (Date.now() < S.frenzyUntil) m *= FRENZY_MULT;
  if (Date.now() < S.boostUntil) m *= VISION_MULT;
  return m;
}
const cps = () => baseCps() * mult();
const clickPower = () => (1 + S.clickLevel + baseCps() * 0.05) * mult();

/* ── formatting ────────────────────────────────────────── */
const SUFFIX = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp"];
function fmt(n) {
  if (n < 1000) return n < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();
  let tier = Math.min(SUFFIX.length - 1, Math.floor(Math.log10(n) / 3));
  const v = n / Math.pow(10, tier * 3);
  return (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + SUFFIX[tier];
}

/* ── dom handles ───────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const el = {
  tribute: $("tribute"), cps: $("cps"), cityName: $("cityName"),
  clickPow: $("clickPow"), boostInfo: $("boostInfo"),
  shop: $("shop"), board: $("board"), toasts: $("toasts"),
  ticker: $("tickerLine"), floatLayer: $("floatLayer"),
  toil: $("toil"), frenzyBanner: $("frenzyBanner"), frenzyTimer: $("frenzyTimer"),
  sigilLayer: $("sigilLayer"), soundBtn: $("soundBtn"),
  cityModal: $("cityModal"), cityList: $("cityList"), citySearch: $("citySearch"),
  visionBtn: $("visionBtn"), visionLeft: $("visionLeft"),
  visionOverlay: $("visionOverlay"), visionCount: $("visionCount"),
};

/* ── audio (synthesized, no assets) ────────────────────── */
let AC = null;
function audio() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === "suspended") AC.resume();
  return AC;
}
function blip(freq, dur, type, vol) {
  if (!S.sound) return;
  try {
    const ctx = audio(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch (e) {}
}
const sndClick = () => blip(180 + Math.random() * 60, 0.08, "triangle", 0.12);
const sndBuy   = () => blip(72, 0.35, "sine", 0.25);
const sndEvent = () => blip(440, 0.5, "sawtooth", 0.08);

/* ── toasts ────────────────────────────────────────────── */
function toast(html) {
  const t = document.createElement("div");
  t.className = "toast"; t.innerHTML = html;
  el.toasts.appendChild(t);
  setTimeout(() => t.remove(), 5200);
}

/* ═══════════════════ GLOBE ════════════════════════════ */
const globe = (() => {
  const canvas = $("globe"), ctx = canvas.getContext("2d");
  let W = 0, H = 0, R = 0, CX = 0, CY = 0;
  let lon0 = 0, vel = 0.05;           // rotation offset (rad), velocity
  const TILT = -0.35;
  let dragging = false, lastX = 0;
  let arcs = [];                       // tribute pulses toward home city

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.42; CX = W / 2; CY = H / 2;
  }

  // lat/lon (deg) -> rotated unit vector
  function vec(lat, lon) {
    const p = lat * Math.PI / 180, l = lon * Math.PI / 180 + lon0;
    let x = Math.cos(p) * Math.sin(l), y = Math.sin(p), z = Math.cos(p) * Math.cos(l);
    const y2 = y * Math.cos(TILT) - z * Math.sin(TILT);
    const z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
    return [x, y2, z2];
  }
  const sx = (v) => CX + v[0] * R;
  const sy = (v) => CY - v[1] * R;

  function strokePath(pts) {
    let pen = false;
    ctx.beginPath();
    for (const v of pts) {
      if (v[2] > 0.02) {
        if (pen) ctx.lineTo(sx(v), sy(v)); else { ctx.moveTo(sx(v), sy(v)); pen = true; }
      } else pen = false;
    }
    ctx.stroke();
  }

  function slerp(a, b, t) {
    const dot = Math.max(-1, Math.min(1, a[0]*b[0] + a[1]*b[1] + a[2]*b[2]));
    const th = Math.acos(dot);
    if (th < 1e-4) return a;
    const s = Math.sin(th), f0 = Math.sin((1-t)*th)/s, f1 = Math.sin(t*th)/s;
    return [a[0]*f0+b[0]*f1, a[1]*f0+b[1]*f1, a[2]*f0+b[2]*f1];
  }

  function pulse() {                   // spawn a tribute arc to home city
    if (!S.city) return;
    const from = CITIES[Math.floor(Math.random() * CITIES.length)];
    if (from[0] === S.city) return;
    arcs.push({ from, t: 0 });
  }

  function draw(dt) {
    if (!dragging) lon0 += vel * dt;
    ctx.clearRect(0, 0, W, H);

    // abyssal disc
    const g = ctx.createRadialGradient(CX - R*0.3, CY - R*0.4, R*0.1, CX, CY, R);
    g.addColorStop(0, "rgba(42,143,118,.14)");
    g.addColorStop(0.7, "rgba(13,16,20,.9)");
    g.addColorStop(1, "rgba(6,7,9,1)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI*2); ctx.fill();

    // outer glow ring
    ctx.strokeStyle = "rgba(232,181,77,.35)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = "rgba(232,181,77,.1)";
    ctx.beginPath(); ctx.arc(CX, CY, R + 6, 0, Math.PI*2); ctx.stroke();

    // graticule
    ctx.strokeStyle = "rgba(232,181,77,.13)";
    ctx.lineWidth = 0.7;
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let l = 0; l <= 360; l += 6) pts.push(vec(lat, l));
      strokePath(pts);
    }
    for (let lon = 0; lon < 180; lon += 30) {
      const pts = [];
      for (let p = -90; p <= 90; p += 6) pts.push(vec(p, lon));
      for (let p = 90; p >= -90; p -= 6) pts.push(vec(p, lon + 180));
      strokePath(pts);
    }

    // tribute arcs
    if (S.city) {
      const home = CITIES.find(c => c[0] === S.city);
      const hv = vec(home[2], home[3]);
      for (const a of arcs) {
        a.t += dt * 0.55;
        const av = vec(a.from[2], a.from[3]);
        const head = slerp(av, hv, Math.min(1, a.t));
        // lifted trail
        ctx.strokeStyle = "rgba(89,242,196,.5)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        let pen = false;
        const t0 = Math.max(0, a.t - 0.3);
        for (let k = 0; k <= 14; k++) {
          const tt = t0 + (Math.min(1, a.t) - t0) * (k / 14);
          const v = slerp(av, hv, tt);
          const lift = 1 + 0.08 * Math.sin(Math.PI * tt);
          const px = CX + v[0]*R*lift, py = CY - v[1]*R*lift;
          if (v[2] > 0) { if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; } }
          else pen = false;
        }
        ctx.stroke();
        if (head[2] > 0 && a.t < 1) {
          ctx.fillStyle = "rgba(89,242,196,.9)";
          ctx.beginPath(); ctx.arc(sx(head), sy(head), 2, 0, Math.PI*2); ctx.fill();
        }
      }
      arcs = arcs.filter(a => a.t < 1.15);
    }

    // city nodes
    const now = performance.now();
    for (const c of CITIES) {
      const v = vec(c[2], c[3]);
      if (v[2] <= 0.02) continue;
      const isHome = S.city === c[0];
      const depth = 0.4 + 0.6 * v[2];
      if (isHome) {
        const pul = 1 + 0.3 * Math.sin(now / 300);
        ctx.fillStyle = "rgba(89,242,196,.25)";
        ctx.beginPath(); ctx.arc(sx(v), sy(v), 9 * pul, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#59f2c4";
        ctx.beginPath(); ctx.arc(sx(v), sy(v), 3.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(217,210,192,.9)";
        ctx.font = "9px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(c[0].toUpperCase(), sx(v), sy(v) - 12);
      } else {
        ctx.fillStyle = `rgba(232,181,77,${0.55 * depth})`;
        ctx.beginPath(); ctx.arc(sx(v), sy(v), 1.4, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  // drag to spin
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    lon0 += dx * 0.006;
    vel = dx * 0.18;                  // inertia from last movement
  });
  const release = () => {
    dragging = false;
    vel = Math.max(-1.2, Math.min(1.2, vel));
    if (Math.abs(vel) < 0.05) vel = 0.05;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  window.addEventListener("resize", resize);
  resize();
  setInterval(pulse, 2600);
  return { draw, resize };
})();

/* ═══════════════════ GAME ACTIONS ═════════════════════ */
function doToil(x, y) {
  const gain = clickPower();
  S.tribute += gain; S.total += gain; S.clicks++;
  sndClick();
  if (navigator.vibrate) navigator.vibrate(8);
  const f = document.createElement("div");
  const crit = mult() > 1;
  f.className = "floatnum" + (crit ? " crit" : "");
  f.textContent = "+" + fmt(gain);
  const layer = el.floatLayer.getBoundingClientRect();
  f.style.left = (x - layer.left + (Math.random()*30 - 15)) + "px";
  f.style.top  = (y - layer.top - 20) + "px";
  el.floatLayer.appendChild(f);
  setTimeout(() => f.remove(), 1000);
}

el.toil.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  doToil(e.clientX, e.clientY);
  renderCounters();
});

function buyRite(r) {
  const cost = riteCost(r);
  if (S.tribute < cost) return;
  S.tribute -= cost;
  S.rites[r.id] = riteCount(r.id) + 1;
  sndBuy();
  if (navigator.vibrate) navigator.vibrate([10, 30, 20]);
  renderShop(); renderCounters(); save();
}
function buyClickUp() {
  const cost = clickUpCost();
  if (S.tribute < cost) return;
  S.tribute -= cost;
  S.clickLevel++;
  sndBuy();
  renderShop(); renderCounters(); save();
}

/* ── frenzy (veil sigil) ───────────────────────────────── */
function spawnSigil() {
  if (document.querySelector(".veil-sigil") || Date.now() < S.frenzyUntil) return;
  const s = document.createElement("button");
  s.className = "veil-sigil";
  s.textContent = "⛧";
  s.style.left = (10 + Math.random() * 70) + "%";
  s.style.top  = (15 + Math.random() * 55) + "%";
  s.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    s.remove();
    S.frenzyUntil = Date.now() + FRENZY_SECS * 1000;
    sndEvent();
    if (navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 60]);
    toast("<b>THE VEIL THINS.</b> Tribute ×" + FRENZY_MULT + " for " + FRENZY_SECS + "s. TOIL.");
    save();
  }, { once: true });
  el.sigilLayer.appendChild(s);
  setTimeout(() => s.remove(), 10000);
}
setInterval(() => { if (Math.random() < 0.35) spawnSigil(); }, 45000);
setTimeout(spawnSigil, 20000);        // early taste of the mechanic

/* ── visions (rewarded-ad stand-in) ────────────────────── */
function visionsLeft() {
  const today = new Date().toDateString();
  if (S.visions.date !== today) { S.visions = { date: today, used: 0 }; }
  return VISIONS_PER_DAY - S.visions.used;
}
el.visionBtn.addEventListener("click", () => {
  if (visionsLeft() <= 0 || Date.now() < S.boostUntil) return;
  el.visionOverlay.classList.remove("hidden");
  let n = 8;
  el.visionCount.textContent = n;
  sndEvent();
  const iv = setInterval(() => {
    n--;
    el.visionCount.textContent = n;
    if (n <= 0) {
      clearInterval(iv);
      el.visionOverlay.classList.add("hidden");
      S.visions.used++;
      S.boostUntil = Date.now() + VISION_MINS * 60 * 1000;
      toast("<b>YOU HAVE SEEN.</b> Tribute ×" + VISION_MULT + " for " + VISION_MINS + " minutes.");
      renderAlms(); save();
    }
  }, 1000);
});
function renderAlms() {
  const left = visionsLeft();
  el.visionLeft.textContent = left;
  el.visionBtn.disabled = left <= 0 || Date.now() < S.boostUntil;
  el.visionBtn.textContent = Date.now() < S.boostUntil ? "BLESSED" : left > 0 ? "GAZE" : "RETURN TOMORROW";
}

/* ── daily blessing & offline progress ─────────────────── */
function checkDaily() {
  const today = new Date().toDateString();
  if (S.daily.date === today) return;
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  S.daily.streak = S.daily.date === yesterday ? S.daily.streak + 1 : 1;
  S.daily.date = today;
  const grant = Math.ceil((50 + baseCps() * 300) * S.daily.streak);
  S.tribute += grant; S.total += grant;
  toast(`<b>DAILY BLESSING.</b> Streak ${S.daily.streak} — the Ledger credits you <b>${fmt(grant)}</b> tribute.`);
}
function checkOffline() {
  const away = (Date.now() - S.lastSeen) / 1000;
  if (away < 90 || baseCps() <= 0) return;
  const secs = Math.min(away, OFFLINE_CAP_H * 3600);
  const grant = Math.floor(baseCps() * secs * OFFLINE_EFF);
  if (grant <= 0) return;
  S.tribute += grant; S.total += grant;
  toast(`<b>WHILE YOU SLEPT…</b> the branch toiled on. <b>+${fmt(grant)}</b> tribute recovered.`);
}

/* ═══════════════════ FAKE MULTIPLAYER ═════════════════ */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
function initSim() {
  if (S.sim && S.sim.scores) return;
  const scores = {};
  for (const c of CITIES) {
    const h = hash(c[0]);
    scores[c[0]] = 5e4 + (h % 9e5);
  }
  S.sim = { scores, last: Date.now() };
}
function tickSim() {
  const now = Date.now();
  const dt = Math.min((now - S.sim.last) / 1000, 3600 * 24);
  S.sim.last = now;
  for (const c of CITIES) {
    const rate = 4 + (hash(c[0] + "r") % 90);
    S.sim.scores[c[0]] += rate * dt * (0.7 + Math.random() * 0.6);
  }
}
function renderBoard() {
  const rows = CITIES.map(c => ({
    name: c[0], country: c[1],
    score: S.sim.scores[c[0]] + (S.city === c[0] ? S.total : 0),
  })).sort((a, b) => b.score - a.score);
  const myRank = rows.findIndex(r => r.name === S.city);
  const top = rows.slice(0, 12);
  if (myRank >= 12) top.push(rows[myRank]);
  el.board.innerHTML = top.map(r =>
    `<li${r.name === S.city ? ' class="you"' : ""}>
      <span class="b-city">${r.name} <span class="cl-country">${r.country}</span></span>
      <span class="b-score">${fmt(r.score)}</span>
    </li>`).join("");
}

/* ── the wire (ambient fake feed) ──────────────────────── */
const WIRE = [
  c => `${c} cell filed ${fmt(1000 + Math.random() * 9e5)} tribute this hour`,
  c => `the audit circles ${c}. it is patient.`,
  c => `${c} reports a record drowning quarter`,
  c => `a new branch opens beneath ${c}`,
  c => `${fmt(3 + Math.random() * 400)} interns ascended in ${c}`,
  () => `market sentiment: INEVITABLE`,
  () => `the ledger hungers. productivity +${(2 + Math.random() * 9).toFixed(1)}%`,
  () => `reminder: lunch is a construct. toil.`,
  c => `${c} branch denies everything`,
];
function tickWire() {
  const c = CITIES[Math.floor(Math.random() * CITIES.length)][0].toUpperCase();
  const line = WIRE[Math.floor(Math.random() * WIRE.length)](c);
  el.ticker.textContent = line;
  el.ticker.style.animation = "none";
  void el.ticker.offsetWidth;          // restart fade-in
  el.ticker.style.animation = "";
}
setInterval(tickWire, 7000);

/* ═══════════════════ RENDERING ════════════════════════ */
function renderCounters() {
  el.tribute.textContent = fmt(S.tribute);
  el.cps.textContent = fmt(cps()) + "/s";
  el.clickPow.textContent = fmt(clickPower());
  // frenzy banner
  const now = Date.now();
  if (now < S.frenzyUntil) {
    el.frenzyBanner.classList.remove("hidden");
    el.toil.classList.add("frenzy");
    el.frenzyTimer.textContent = Math.ceil((S.frenzyUntil - now) / 1000) + "s";
  } else {
    el.frenzyBanner.classList.add("hidden");
    el.toil.classList.remove("frenzy");
  }
  if (now < S.boostUntil) {
    el.boostInfo.classList.remove("hidden");
    el.boostInfo.textContent = "✦ blessed ×" + VISION_MULT + " — " + Math.ceil((S.boostUntil - now) / 60000) + "min left";
  } else el.boostInfo.classList.add("hidden");
}

function renderShop() {
  const parts = [];
  parts.push(`
    <button class="shop-item click-up" id="buy-click" ${S.tribute < clickUpCost() ? "disabled" : ""}>
      <span class="si-name">Ink-Blessed Stylus ${S.clickLevel > 0 ? "lv." + S.clickLevel : ""}</span>
      <span class="si-cost">${fmt(clickUpCost())}</span>
      <span class="si-desc">Sharpen your toil. +1 tribute per click, forever.</span>
      <span class="si-meta">+1/click</span>
    </button>`);
  for (const r of RITES) {
    const n = riteCount(r.id);
    parts.push(`
      <button class="shop-item" data-rite="${r.id}" ${S.tribute < riteCost(r) ? "disabled" : ""}>
        <span class="si-name">${r.name}${n ? " ×" + n : ""}</span>
        <span class="si-cost">${fmt(riteCost(r))}</span>
        <span class="si-desc">${r.desc}</span>
        <span class="si-meta"><b>${fmt(r.rate)}</b>/s each</span>
      </button>`);
  }
  el.shop.innerHTML = parts.join("");
  $("buy-click").addEventListener("click", buyClickUp);
  el.shop.querySelectorAll("[data-rite]").forEach(b =>
    b.addEventListener("click", () => buyRite(RITES.find(r => r.id === b.dataset.rite))));
}

function refreshShopAffordance() {
  if (!document.getElementById("panel-rites").classList.contains("active")) return;
  const cu = $("buy-click");
  if (cu) cu.disabled = S.tribute < clickUpCost();
  el.shop.querySelectorAll("[data-rite]").forEach(b => {
    const r = RITES.find(x => x.id === b.dataset.rite);
    b.disabled = S.tribute < riteCost(r);
  });
}

/* ── tabs ──────────────────────────────────────────────── */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".panel").forEach(p =>
      p.classList.toggle("active", p.id === tab.dataset.panel));
    if (tab.dataset.panel === "panel-ledger") { tickSim(); renderBoard(); }
    if (tab.dataset.panel === "panel-rites") renderShop();
    if (tab.dataset.panel === "panel-alms") renderAlms();
  });
});

/* ── city picker ───────────────────────────────────────── */
function renderCityList(filter) {
  const f = (filter || "").toLowerCase();
  el.cityList.innerHTML = CITIES
    .filter(c => !f || c[0].toLowerCase().includes(f) || c[1].toLowerCase().includes(f))
    .map(c => `<li data-city="${c[0]}"><span>${c[0]}</span><span class="cl-country">${c[1]}</span></li>`)
    .join("");
}
el.citySearch.addEventListener("input", () => renderCityList(el.citySearch.value));
el.cityList.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-city]");
  if (!li) return;
  const first = !S.city;
  S.city = li.dataset.city;
  el.cityName.textContent = S.city.toUpperCase();
  el.cityModal.classList.add("hidden");
  if (first) toast(`<b>BRANCH REGISTERED.</b> ${S.city} has been waiting for you.`);
  save();
});
$("cityBtn").addEventListener("click", () => {
  renderCityList("");
  el.citySearch.value = "";
  el.cityModal.classList.remove("hidden");
});

/* ── sound toggle ──────────────────────────────────────── */
function renderSound() { el.soundBtn.classList.toggle("muted", !S.sound); }
el.soundBtn.addEventListener("click", () => { S.sound = !S.sound; renderSound(); save(); });

/* ═══════════════════ MAIN LOOP ════════════════════════ */
let lastTick = performance.now(), lastSlow = 0;
function loop(now) {
  const dt = Math.min((now - lastTick) / 1000, 0.5);
  lastTick = now;
  const gain = cps() * dt;
  if (gain > 0) { S.tribute += gain; S.total += gain; }
  globe.draw(dt);
  if (now - lastSlow > 250) {          // counters & affordances at 4 Hz
    lastSlow = now;
    renderCounters();
    refreshShopAffordance();
  }
  requestAnimationFrame(loop);
}

/* ── boot ──────────────────────────────────────────────── */
initSim();
tickSim();
checkOffline();
checkDaily();
renderSound();
renderCounters();
renderShop();
renderAlms();
tickWire();
if (S.city) el.cityName.textContent = S.city.toUpperCase();
else { renderCityList(""); el.cityModal.classList.remove("hidden"); }

setInterval(save, 3000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") save();
  else { lastTick = performance.now(); checkOffline(); checkDaily(); }
});

requestAnimationFrame(loop);

/* ── PWA ───────────────────────────────────────────────── */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
