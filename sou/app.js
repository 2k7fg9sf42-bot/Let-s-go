/* Sou — tes dépenses, en deux gestes. */
(() => {
'use strict';

/* ---------- icons ---------- */
const ICONS = {
  basket:'<path d="M3 8h14l-1.5 8.3a1.5 1.5 0 01-1.5 1.2H6a1.5 1.5 0 01-1.5-1.2z"/><path d="M7 8l3-5 3 5"/>',
  fork:'<path d="M5.5 2.5v5a2 2 0 002 2h0a2 2 0 002-2v-5M7.5 9.5v8"/><path d="M14.5 17.5v-15c-1.8 1-3 3.4-3 6.5 0 1 .5 1.5 1.5 1.5h1.5"/>',
  bus:'<rect x="4" y="2.5" width="12" height="12" rx="3"/><path d="M4 9h12M7 17.5l.8-3M13 17.5l-.8-3"/><circle cx="7.5" cy="11.8" r=".5" fill="currentColor"/><circle cx="12.5" cy="11.8" r=".5" fill="currentColor"/>',
  glass:'<path d="M4 3h12l-6 7.5z"/><path d="M10 10.5v7M6.5 17.5h7"/>',
  bag:'<path d="M4.5 6.5h11l-.8 11H5.3z"/><path d="M7.5 6.5V5a2.5 2.5 0 015 0v1.5"/>',
  home:'<path d="M3 9.5l7-6.5 7 6.5v8H3z"/><path d="M8 17.5v-5h4v5"/>',
  heart:'<path d="M10 16.5s-6.5-3.8-6.5-8.4A3.4 3.4 0 0110 6.3a3.4 3.4 0 016.5 1.8c0 4.6-6.5 8.4-6.5 8.4z"/>',
  dots:'<circle cx="5" cy="10" r="1.1" fill="currentColor"/><circle cx="10" cy="10" r="1.1" fill="currentColor"/><circle cx="15" cy="10" r="1.1" fill="currentColor"/>',
  loop:'<path d="M4 10a6 6 0 0110.4-4.1L16 7.5M16 3.5v4h-4"/><path d="M16 10a6 6 0 01-10.4 4.1L4 12.5M4 16.5v-4h4"/>',
  coffee:'<path d="M4 7.5h10v5a4.5 4.5 0 01-4.5 4.5h-1A4.5 4.5 0 014 12.5z"/><path d="M14 9h1a2 2 0 010 4h-1.2M7 2.5v2M10 2.5v2"/>',
  gift:'<rect x="3" y="7" width="14" height="4" rx="1"/><path d="M4.5 11v6.5h11V11M10 7v10.5M10 7S8.8 3 6.8 3.5 6 7 10 7zm0 0s1.2-4 3.2-3.5S14 7 10 7z"/>',
  plane:'<path d="M2.5 11l15-6.5-4 12-3.5-4.5z"/><path d="M10 12l7.5-7.5"/>',
  dumbbell:'<path d="M6 6v8M14 6v8M3.5 8v4M16.5 8v4M6 10h8"/>',
  paw:'<circle cx="6" cy="8" r="1.6"/><circle cx="10" cy="5.5" r="1.6"/><circle cx="14" cy="8" r="1.6"/><path d="M10 10.5c-3 0-4.5 3.5-3.5 5.5 1 1.5 2.5.5 3.5.5s2.5 1 3.5-.5c1-2-.5-5.5-3.5-5.5z"/>',
  play:'<rect x="2.5" y="4" width="15" height="12" rx="3"/><path d="M8.5 7.5v5l4.5-2.5z"/>',
  book:'<path d="M10 5.5C8 4 5.5 3.5 3 4v11.5c2.5-.5 5 0 7 1.5 2-1.5 4.5-2 7-1.5V4c-2.5-.5-5 0-7 1.5zM10 5.5V17"/>',
  fuel:'<path d="M4 17.5v-13A1.5 1.5 0 015.5 3h5A1.5 1.5 0 0112 4.5v13M3 17.5h10M4 8.5h8M12 7l3 2v6a1.2 1.2 0 002.4 0V8L15 5.5"/>',
  baby:'<circle cx="10" cy="8" r="4.5"/><path d="M8.3 7.8h.01M11.7 7.8h.01M8.5 10a2 2 0 003 0M5.5 17.5a4.5 4.5 0 019 0"/>',
};
const PALETTE = ['#3E8E5E','#E0A030','#3D6FD8','#C2457A','#8A5CD6','#2E9AA0','#D9543F','#8C877B','#E06A2C','#4B5563','#B8862E','#5A7F2E'];
const DEFAULT_CATS = [
  {id:'courses',name:'Courses',color:'#3E8E5E',icon:'basket'},
  {id:'resto',name:'Resto',color:'#E0A030',icon:'fork'},
  {id:'transport',name:'Transport',color:'#3D6FD8',icon:'bus'},
  {id:'sorties',name:'Sorties',color:'#C2457A',icon:'glass'},
  {id:'shopping',name:'Shopping',color:'#8A5CD6',icon:'bag'},
  {id:'maison',name:'Maison',color:'#2E9AA0',icon:'home'},
  {id:'sante',name:'Santé',color:'#D9543F',icon:'heart'},
  {id:'autre',name:'Autre',color:'#8C877B',icon:'dots'},
];
const svg = (name, vb = 20) => `<svg viewBox="0 0 ${vb} ${vb}">${ICONS[name] || ICONS.dots}</svg>`;

/* ---------- storage ---------- */
const KEY = 'sou.v1';
const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.tx)) return s; } catch {} return null; };
let S = load() || { v:1, tx:[], budget:0 };
if (!Array.isArray(S.cats) || !S.cats.length) S.cats = DEFAULT_CATS.map(c => ({...c}));
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf0 = new Intl.NumberFormat('fr-FR', {maximumFractionDigits:0});
const nf2 = new Intl.NumberFormat('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2});
const fmt = (c, dec) => { const neg = c < 0; c = Math.abs(Math.round(c)); const s = (dec === false || (dec !== true && c % 100 === 0)) ? nf0.format(Math.round(c/100)) : nf2.format(c/100); return ((neg ? '−' : '') + s).replace(/[\u202F\u00A0]/g, '\u00A0') + '\u00A0€'; };
const fmtHTML = (c, dec) => fmt(c, dec).replace('\u00A0€', '<small>\u00A0€</small>');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const catById = id => S.cats.find(c => c.id === id) || S.cats.find(c => c.id === 'autre') || S.cats[0];
const dayKey = t => { const d = new Date(t); return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate(); };
const startOfDay = t => { const d = new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const parseAmount = v => { const n = parseFloat(String(v).replace(/\s/g,'').replace(',', '.').replace(/[^\d.]/g,'')); return isFinite(n) ? Math.round(n*100) : 0; };

const hapEl = $('#hap');
const hap = () => { try { hapEl.click(); } catch {} try { navigator.vibrate && navigator.vibrate(8); } catch {} };

/* ---------- entry state ---------- */
let entry = '';         // "12,5"
let note = '';
let when = 0;           // 0 = now, else timestamp (day)
const amountEl = $('#amount'), numEl = $('#amount-num'), catsEl = $('#cats');

function entryCents(){ return entry ? parseAmount(entry) : 0; }
function renderEntry(bump){
  let [i, d] = entry.split(',');
  i = i || (entry ? '0' : '');
  const intFmt = i ? nf0.format(+i).replace(/\u202F/g, '\u00A0') : '0';
  numEl.textContent = entry.includes(',') ? intFmt + ',' + (d || '') : intFmt;
  amountEl.classList.toggle('empty', !entry);
  const len = numEl.textContent.length;
  const base = innerHeight < 700 ? 84 : 112;
  amountEl.style.setProperty('--amt-size', (len <= 4 ? base : Math.max(48, base - (len-4)*12)) + 'px');
  catsEl.classList.toggle('idle', entryCents() <= 0);
  if (bump){ amountEl.classList.remove('bump'); void amountEl.offsetWidth; amountEl.classList.add('bump'); }
}
function press(k){
  const [i, d] = entry.split(',');
  if (k === 'del'){ entry = entry.slice(0, -1); if (entry === '0') entry = ''; }
  else if (k === ','){ if (entry.includes(',')) return nope(); entry = (entry || '0') + ','; }
  else {
    if (d !== undefined && d.length >= 2) return nope();
    if (d === undefined && (i || '').length >= 6) return nope();
    if (entry === '0') entry = '';
    if (entry === '' && k === '0') { entry = '0'; renderEntry(true); return; }
    entry += k;
  }
  renderEntry(true);
}
function nope(){ amountEl.classList.remove('shake'); void amountEl.offsetWidth; amountEl.classList.add('shake'); }

/* keypad */
const pad = $('#pad');
let longT = 0, longFired = false;
pad.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.k === 'del' && longFired){ longFired = false; return; }
  hap(); press(b.dataset.k);
});
pad.addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-k="del"]'); if (!b) return;
  longFired = false;
  longT = setTimeout(() => { longFired = true; entry = ''; renderEntry(true); hap(); }, 450);
});
['pointerup','pointercancel','pointerleave'].forEach(ev => pad.addEventListener(ev, () => clearTimeout(longT)));
document.addEventListener('keydown', e => {
  if (!$('#view-add').classList.contains('is-active') || sheetOpen) return;
  if (/^[0-9]$/.test(e.key)) press(e.key);
  else if (e.key === ',' || e.key === '.') press(',');
  else if (e.key === 'Backspace') press('del');
});

/* categories */
function renderCats(){
  catsEl.innerHTML = S.cats.filter(c => !c.hidden).slice(0, 8).map(c =>
    `<button type="button" class="cat" data-id="${c.id}" style="--c:${c.color}"><span class="g">${svg(c.icon)}</span><span class="l">${esc(c.name)}</span></button>`).join('');
  renderEntry();
}
catsEl.addEventListener('click', e => {
  const b = e.target.closest('.cat'); if (!b) return;
  const cents = entryCents();
  if (cents <= 0){ nope(); return; }
  hap();
  b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
  addTx({a:cents, c:b.dataset.id, n:note.trim(), t:when ? when : Date.now()});
  amountEl.classList.add('fly');
  setTimeout(() => { amountEl.classList.remove('fly'); entry=''; note=''; when=0; renderEntry(); renderMeta(); }, 320);
});

function addTx(tx, silent){
  tx.id = tx.id || uid();
  S.tx.push(tx); save(); lastAdded = tx.id;
  renderGlance(); if (curView === 'month') renderMonth();
  if (!silent){
    const c = catById(tx.c);
    toast(`${esc(c.name)} · <em>${fmt(tx.a)}</em>`, c.color, () => { S.tx = S.tx.filter(x => x.id !== tx.id); save(); renderGlance(); renderMonth(); toast('Dépense annulée'); });
  }
}
let lastAdded = null;

/* meta: date & note */
function renderMeta(){
  const wl = $('#when-label'), nl = $('#note-label');
  if (!when) wl.textContent = "Aujourd'hui";
  else {
    const diff = Math.round((startOfDay(Date.now()) - startOfDay(when)) / 864e5);
    wl.textContent = diff === 1 ? 'Hier' : diff === 2 ? 'Avant-hier' : new Date(when).toLocaleDateString('fr-FR', {weekday:'short', day:'numeric', month:'short'});
  }
  $('#when-btn').classList.toggle('on', !!when);
  nl.textContent = note.trim() || 'Note';
  $('#note-btn').classList.toggle('on', !!note.trim());
}
$('#when-btn').addEventListener('click', () => {
  const today = startOfDay(Date.now());
  const opts = [[0,"Aujourd'hui"],[today - 864e5 + 12*36e5,'Hier'],[today - 2*864e5 + 12*36e5,'Avant-hier']];
  const iso = new Date((when || Date.now()) - new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
  openSheet(`<h3>Quand ?</h3>
    <div class="chips" style="margin-bottom:18px">${opts.map(([t,l]) => `<button type="button" class="chip plain ${(!when && !t) || (when && t && dayKey(t) === dayKey(when)) ? 'on':''}" data-t="${t}">${l}</button>`).join('')}</div>
    <label class="field"><span>Autre date</span><input class="input" type="date" id="when-date" value="${iso}" max="${new Date(Date.now() - new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10)}"></label>`, body => {
    body.addEventListener('click', e => { const c = e.target.closest('[data-t]'); if (!c) return; when = +c.dataset.t; renderMeta(); hap(); closeSheet(); });
    $('#when-date', body).addEventListener('change', e => {
      const v = e.target.value; if (!v) return;
      const [y,m,d] = v.split('-').map(Number); const t = new Date(y, m-1, d, 12).getTime();
      when = dayKey(t) === dayKey(Date.now()) ? 0 : t; renderMeta(); closeSheet();
    });
  });
});
$('#note-btn').addEventListener('click', () => {
  const recent = [...new Set(S.tx.slice().reverse().map(t => t.n).filter(Boolean))].slice(0, 8);
  openSheet(`<h3>Une note ?</h3>
    <label class="field"><input class="input" id="note-in" placeholder="Boulangerie, cadeau Léa…" value="${esc(note)}" enterkeyhint="done" autocomplete="off"></label>
    ${recent.length ? `<div class="set-title" style="margin-top:4px">Récemment</div><div class="chips">${recent.map(n => `<button type="button" class="chip plain" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
    <div class="row-btns">${note ? '<button type="button" class="btn ghost" id="note-clear">Effacer</button>' : ''}<button type="button" class="btn" id="note-ok">OK</button></div>`, body => {
    const inp = $('#note-in', body);
    setTimeout(() => inp.focus(), 60);
    const done = () => { note = inp.value; renderMeta(); closeSheet(); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') done(); });
    $('#note-ok', body).addEventListener('click', done);
    const cl = $('#note-clear', body); cl && cl.addEventListener('click', () => { note=''; renderMeta(); closeSheet(); });
    body.addEventListener('click', e => { const c = e.target.closest('[data-n]'); if (c){ note = c.dataset.n; renderMeta(); closeSheet(); } });
  });
});

/* ---------- month math ---------- */
function monthData(offset){
  const now = new Date();
  const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const y = ref.getFullYear(), m = ref.getMonth();
  const D = new Date(y, m+1, 0).getDate();
  const isCur = offset === 0;
  const dayIdx = isCur ? now.getDate() : (offset < 0 ? D : 0);
  const txs = S.tx.filter(t => { const d = new Date(t.t); return d.getFullYear() === y && d.getMonth() === m; }).sort((a,b) => b.t - a.t);
  const spent = txs.reduce((s,t) => s + t.a, 0);
  const perDay = Array(D).fill(0); txs.forEach(t => perDay[new Date(t.t).getDate()-1] += t.a);
  const byCat = {}; txs.forEach(t => byCat[t.c] = (byCat[t.c]||0) + t.a);
  return {y, m, D, isCur, dayIdx, txs, spent, perDay, byCat, B:S.budget||0, label:ref.toLocaleDateString('fr-FR', {month:'long', year: y === now.getFullYear() ? undefined : 'numeric'})};
}

/* ---------- glance ---------- */
function renderGlance(){
  const md = monthData(0), g = $('#glance');
  if (md.B){
    const rest = md.B - md.spent, daysLeft = md.D - md.dayIdx + 1;
    $('#glance-label').innerHTML = rest >= 0 ? `reste <b>${fmt(rest, false)}</b> · ${fmt(Math.max(0, rest/daysLeft), false)}/j` : `<b>${fmt(-rest, false)}</b> au-dessus`;
    $('#glance-fill').style.width = Math.min(100, md.spent / md.B * 100) + '%';
    g.classList.toggle('over', rest < 0);
    $('.glance-bar').style.display = '';
  } else {
    $('#glance-label').innerHTML = `ce mois <b>${fmt(md.spent, false)}</b>`;
    $('.glance-bar').style.display = 'none';
  }
}
$('#glance').addEventListener('click', () => go('month'));

/* ---------- month view ---------- */
let offset = 0;
function renderMonth(){
  const md = monthData(offset);
  $('#m-title').textContent = md.label;
  $('#m-next').disabled = offset >= 0;
  $('#h-spent').innerHTML = fmtHTML(md.spent);

  const sub = $('#h-sub');
  if (md.B){
    const rest = md.B - md.spent;
    sub.innerHTML = rest >= 0 ? `sur ${fmt(md.B, false)} · reste <b>${fmt(rest)}</b>` : `sur ${fmt(md.B, false)} · <span class="over">dépassé de ${fmt(-rest)}</span>`;
  } else sub.innerHTML = `<button type="button" id="set-budget-link" style="text-decoration:underline;text-underline-offset:3px">Fixer un budget mensuel</button> pour voir ton rythme`;
  const sbl = $('#set-budget-link'); sbl && sbl.addEventListener('click', openSettings);

  /* gauge */
  const scale = Math.max(md.B, md.spent) || 1;
  const cats = Object.entries(md.byCat).sort((a,b) => b[1]-a[1]);
  $('#gauge-track').innerHTML = cats.map(([id,a]) => `<i style="--c:${catById(id).color};flex:0 0 ${a/scale*100}%"></i>`).join('');
  const gauge = $('#gauge'); gauge.classList.toggle('nobudget', !md.B || !md.isCur);
  if (md.B && md.isCur){
    const paceX = (md.B * (md.dayIdx / md.D)) / scale * 100;
    $('#gauge-pace').style.left = paceX + '%';
    $('#gauge-pace span').style.transform = `translateX(${paceX > 80 ? '-100%' : paceX < 20 ? '0' : '-50%'})`;
  }
  gauge.style.height = md.B && md.isCur ? '44px' : '14px';

  /* stats */
  const avg = md.dayIdx ? md.spent / md.dayIdx : 0;
  const st = [];
  if (md.isCur){
    if (md.B){ const left = Math.max(0, (md.B - md.spent) / (md.D - md.dayIdx + 1)); st.push(['Par jour<br>jusqu\'au ' + md.D, fmtHTML(left, false), md.spent > md.B]); }
    st.push(['Moyenne<br>par jour', fmtHTML(avg, false)]);
    const proj = avg * md.D; st.push(['Projection<br>fin du mois', fmtHTML(proj, false), md.B && proj > md.B]);
    if (!md.B) st.push(['Nombre de<br>dépenses', `${md.txs.length}`]);
  } else {
    st.push(['Moyenne<br>par jour', fmtHTML(avg, false)]);
    const big = md.txs.reduce((m,t) => t.a > m ? t.a : m, 0); st.push(['Plus grosse<br>dépense', fmtHTML(big, false)]);
    st.push(['Nombre de<br>dépenses', `${md.txs.length}`]);
  }
  $('#stats').innerHTML = st.slice(0,3).map(([k,v,hot]) => `<div class="stat ${hot?'hot':''}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');

  renderChart(md);

  /* categories */
  const tot = md.spent || 1, max = cats.length ? cats[0][1] : 1;
  $('#catlist').innerHTML = cats.length ? cats.map(([id,a]) => { const c = catById(id);
    return `<div class="crow" style="--c:${c.color}"><span class="g">${svg(c.icon)}</span><span class="n">${esc(c.name)}</span><span class="a">${fmt(a)}</span><span class="bar"><i style="width:${a/max*100}%"></i></span><span class="p">${Math.round(a/tot*100)} %</span></div>`; }).join('')
    : `<div class="empty-state"><span class="big">Rien pour l'instant.</span>${md.isCur ? 'Tape un montant, touche une catégorie. C\'est tout.' : 'Aucune dépense ce mois-là.'}</div>`;

  /* transactions */
  $('#tx-count').textContent = md.txs.length ? md.txs.length + (md.txs.length > 1 ? ' dépenses' : ' dépense') : '';
  const groups = new Map();
  md.txs.forEach(t => { const k = dayKey(t.t); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); });
  const todayK = dayKey(Date.now()), yestK = dayKey(Date.now() - 864e5);
  $('#txlist').innerHTML = [...groups.entries()].map(([k, list]) => {
    const lbl = k === todayK ? "Aujourd'hui" : k === yestK ? 'Hier' : new Date(list[0].t).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'short'});
    return `<div class="txday"><div class="txday-h"><span>${lbl}</span><span>${fmt(list.reduce((s,t)=>s+t.a,0))}</span></div>${list.map(t => { const c = catById(t.c);
      return `<button type="button" class="tx ${t.id === lastAdded ? 'new' : ''}" data-id="${t.id}" style="--c:${c.color}"><span class="g">${svg(c.icon)}</span><span><span class="n">${esc(t.n || c.name)}</span><span class="s" style="display:block">${t.n ? esc(c.name) + ' · ' : ''}${new Date(t.t).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span></span><span class="a">${fmt(t.a)}</span></button>`; }).join('')}</div>`;
  }).join('');
  lastAdded = null;
}

function renderChart(md){
  const el = $('#chart'), W = el.clientWidth || 340, H = 150, top = 6, bottom = 18, ch = H - top - bottom;
  const pace = md.B ? md.B / md.D : 0;
  const max = Math.max(...md.perDay, pace * 1.6, 100);
  const gap = W / md.D, bw = Math.max(2, gap * 0.62);
  let bars = '', hits = '', labels = '';
  md.perDay.forEach((v, i) => {
    const day = i + 1, x = i * gap + (gap - bw) / 2;
    const h = v ? Math.max(3, v / max * ch) : 2;
    const future = md.isCur ? day > md.dayIdx : offset > 0;
    const cls = future ? 'future' : (md.isCur && day === md.dayIdx) ? 'today' : (pace && v > pace * 1.5) ? 'over' : '';
    bars += `<rect class="bar ${cls}" x="${x.toFixed(1)}" y="${(top + ch - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(3, bw/2).toFixed(1)}"/>`;
    hits += `<rect class="hit" data-i="${i}" x="${(i*gap).toFixed(1)}" y="0" width="${gap.toFixed(1)}" height="${H}"/>`;
    if ([1, 8, 15, 22, md.D].includes(day)) labels += `<text class="ax" x="${(i*gap + gap/2).toFixed(1)}" y="${H - 4}" text-anchor="middle">${day}</text>`;
  });
  const py = top + ch - pace / max * ch;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}${pace ? `<line class="pace" x1="0" x2="${W}" y1="${py}" y2="${py}"/>` : ''}${labels}${hits}</svg><div class="chart-tip" id="chart-tip"></div>`;
  $('#chart-hint').textContent = pace ? `– – ${fmt(pace, false)}/jour` : '';
  const tip = $('#chart-tip'), svgEl = $('svg', el);
  const show = e => {
    const r = svgEl.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const i = Math.max(0, Math.min(md.D - 1, Math.floor(x / r.width * md.D)));
    tip.textContent = `${i+1} ${new Date(md.y, md.m, 1).toLocaleDateString('fr-FR',{month:'short'})} · ${fmt(md.perDay[i])}`;
    tip.style.left = Math.max(50, Math.min(r.width - 50, (i + .5) / md.D * r.width)) + 'px'; tip.classList.add('on');
  };
  svgEl.addEventListener('pointerdown', show); svgEl.addEventListener('pointermove', e => e.buttons || e.pointerType === 'touch' ? show(e) : 0);
  svgEl.addEventListener('pointerup', () => setTimeout(() => tip.classList.remove('on'), 1200));
  svgEl.addEventListener('pointerleave', () => tip.classList.remove('on'));
}

$('#m-prev').addEventListener('click', () => { offset--; hap(); renderMonth(); $('#month-scroll').scrollTop = 0; });
$('#m-next').addEventListener('click', () => { if (offset < 0){ offset++; hap(); renderMonth(); $('#month-scroll').scrollTop = 0; } });
$('#txlist').addEventListener('click', e => { const b = e.target.closest('.tx'); if (b) editTx(b.dataset.id); });

/* swipe months horizontally */
(() => { let x0 = null, y0 = 0; const sc = $('#month-scroll');
  sc.addEventListener('touchstart', e => { if (e.target.closest('.chart')) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, {passive:true});
  sc.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8){ dx > 0 ? $('#m-prev').click() : $('#m-next').click(); } }, {passive:true});
})();

/* ---------- edit transaction ---------- */
function catChips(sel){ return S.cats.map(c => `<button type="button" class="chip ${c.id === sel ? 'on':''}" data-c="${c.id}" style="--c:${c.color}"><span class="g">${svg(c.icon)}</span>${esc(c.name)}</button>`).join(''); }
function editTx(id){
  const t = S.tx.find(x => x.id === id); if (!t) return;
  let cat = t.c;
  const iso = new Date(t.t - new Date(t.t).getTimezoneOffset()*6e4).toISOString().slice(0,10);
  openSheet(`<h3>Modifier</h3>
    <label class="field"><span>Montant</span><input class="input big" id="e-a" inputmode="decimal" value="${nf2.format(t.a/100).replace(/\s/g,'')}"></label>
    <div class="field"><span>Catégorie</span><div class="chips" id="e-c">${catChips(cat)}</div></div>
    <label class="field"><span>Note</span><input class="input" id="e-n" value="${esc(t.n)}" placeholder="—" autocomplete="off"></label>
    <label class="field"><span>Date</span><input class="input" type="date" id="e-d" value="${iso}"></label>
    <div class="row-btns"><button type="button" class="btn danger" id="e-del">Supprimer</button><button type="button" class="btn" id="e-ok">Enregistrer</button></div>`, body => {
    $('#e-c', body).addEventListener('click', e => { const c = e.target.closest('[data-c]'); if (!c) return; cat = c.dataset.c; hap(); $$('#e-c .chip', body).forEach(x => x.classList.toggle('on', x === c)); });
    $('#e-ok', body).addEventListener('click', () => {
      const a = parseAmount($('#e-a', body).value); if (a <= 0) return $('#e-a', body).focus();
      t.a = a; t.c = cat; t.n = $('#e-n', body).value.trim();
      const v = $('#e-d', body).value; if (v){ const [y,m,d] = v.split('-').map(Number); const o = new Date(t.t); t.t = new Date(y, m-1, d, o.getHours(), o.getMinutes()).getTime(); }
      save(); closeSheet(); renderMonth(); renderGlance(); toast('Modifié');
    });
    $('#e-del', body).addEventListener('click', () => {
      const idx = S.tx.indexOf(t); S.tx.splice(idx, 1); save(); closeSheet(); renderMonth(); renderGlance(); hap();
      toast(`Supprimé · <em>${fmt(t.a)}</em>`, catById(t.c).color, () => { S.tx.push(t); save(); renderMonth(); renderGlance(); });
    });
  });
}

/* ---------- settings ---------- */
const APP_URL = location.origin + location.pathname.replace(/index\.html$/, '');
function openSettings(){
  const webapp = APP_URL.replace(/^https?:\/\//, 'webapp://');
  openSheet(`<h3>Réglages</h3>
    <div class="set-title">Budget</div>
    <div class="set-group"><label class="set-row"><span class="lbl">Budget mensuel</span><input class="inline" id="s-b" inputmode="decimal" placeholder="ex. 1 200" style="text-align:right;flex:0 0 120px" value="${S.budget ? nf2.format(S.budget/100).replace(/,00$/,'').replace(/\s/g,' ') : ''}"><span class="val">€</span></label></div>
    <p class="set-note">Sou calcule combien tu peux encore dépenser par jour jusqu'à la fin du mois.</p>
    <div class="set-title">Catégories · les 8 premières apparaissent à la saisie</div>
    <div class="set-group" id="s-cats">${S.cats.map((c,i) => `<button type="button" class="set-row" data-i="${i}" style="--c:${c.color}"><span class="g">${svg(c.icon)}</span><span class="lbl">${esc(c.name)}</span><span class="val">${i < 8 ? '' : 'masquée'} ›</span></button>`).join('')}</div>
    <div class="set-title">Raccourci · Toucher le dos</div>
    <div class="set-group"><button type="button" class="set-row" id="s-copy"><span class="lbl" style="font-family:var(--mono);font-size:12px;word-break:break-all;padding:12px 0">${esc(webapp)}</span><span class="val">Copier</span></button></div>
    <p class="set-note">Dans Raccourcis : action « Ouvrir les URL » avec ce lien, puis Réglages → Accessibilité → Toucher → Toucher le dos → Toucher deux fois → choisis le raccourci. Ajoute <code>?m=12,50&amp;c=resto</code> pour enregistrer directement.</p>
    <div class="set-title">Données · stockées uniquement sur ce téléphone</div>
    <div class="set-group">
      <button type="button" class="set-row" id="s-csv"><span class="lbl">Exporter en CSV</span><span class="val">Numbers, Excel ›</span></button>
      <button type="button" class="set-row" id="s-bak"><span class="lbl">Sauvegarder</span><span class="val">.json ›</span></button>
      <label class="set-row"><span class="lbl">Restaurer une sauvegarde</span><span class="val">›</span><input type="file" id="s-imp" accept="application/json,.json" hidden></label>
      <button type="button" class="set-row" id="s-wipe" style="color:var(--signal)"><span class="lbl">Tout effacer</span></button>
    </div>
    <p class="set-note">${S.tx.length} dépense${S.tx.length > 1 ? 's' : ''} enregistrée${S.tx.length > 1 ? 's' : ''}. Pense à sauvegarder de temps en temps.</p>`, body => {
    const bi = $('#s-b', body);
    bi.addEventListener('change', () => { S.budget = parseAmount(bi.value); save(); renderGlance(); renderMonth(); });
    bi.addEventListener('keydown', e => { if (e.key === 'Enter') bi.blur(); });
    $('#s-cats', body).addEventListener('click', e => { const r = e.target.closest('[data-i]'); if (r) editCat(+r.dataset.i); });
    $('#s-copy', body).addEventListener('click', async e => { try { await navigator.clipboard.writeText(webapp); $('.val', e.currentTarget).textContent = 'Copié ✓'; hap(); } catch { prompt('Copie ce lien :', webapp); } });
    $('#s-csv', body).addEventListener('click', () => {
      const rows = [['date','heure','montant','categorie','note']].concat(S.tx.slice().sort((a,b)=>a.t-b.t).map(t => { const d = new Date(t.t);
        return [d.toLocaleDateString('fr-FR'), d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}), (t.a/100).toFixed(2).replace('.',','), catById(t.c).name, (t.n||'').replace(/"/g,'""')]; }));
      shareFile(rows.map(r => r.map(v => `"${v}"`).join(';')).join('\n'), `sou-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
    });
    $('#s-bak', body).addEventListener('click', () => shareFile(JSON.stringify(S), `sou-sauvegarde-${new Date().toISOString().slice(0,10)}.json`, 'application/json'));
    $('#s-imp', body).addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const d = JSON.parse(await f.text()); if (!Array.isArray(d.tx)) throw 0;
        if (confirm(`Remplacer tes données par cette sauvegarde (${d.tx.length} dépenses) ?`)){ S = d; S.cats = S.cats || DEFAULT_CATS.map(c=>({...c})); save(); renderAll(); closeSheet(); toast('Sauvegarde restaurée'); }
      } catch { alert('Fichier illisible.'); }
    });
    $('#s-wipe', body).addEventListener('click', () => { if (confirm('Effacer toutes les dépenses ? C\'est définitif.')){ S.tx = []; save(); renderAll(); closeSheet(); toast('Tout est effacé'); } });
  });
}
$('#settings-btn').addEventListener('click', openSettings);

function editCat(i){
  const c = S.cats[i];
  let color = c.color, icon = c.icon;
  openSheet(`<h3>Catégorie</h3>
    <label class="field"><span>Nom</span><input class="input" id="c-n" value="${esc(c.name)}" maxlength="14" autocomplete="off"></label>
    <div class="field"><span>Couleur</span><div class="swatches" id="c-col" style="flex-wrap:wrap;gap:10px">${PALETTE.map(p => `<button type="button" class="sw ${p === color ? 'on':''}" data-p="${p}" style="--c:${p};width:30px;height:30px"></button>`).join('')}</div></div>
    <div class="field"><span>Icône</span><div class="chips" id="c-ic">${Object.keys(ICONS).map(k => `<button type="button" class="chip plain ${k === icon ? 'on':''}" data-k="${k}" style="padding:0;width:44px;justify-content:center">${svg(k)}</button>`).join('')}</div></div>
    <div class="row-btns">
      ${i > 0 ? '<button type="button" class="btn ghost small" id="c-up">↑ Monter</button>' : ''}
      <button type="button" class="btn" id="c-ok">OK</button>
    </div>`, body => {
    $$('#c-ic svg', body).forEach(s => { s.style.width = '20px'; s.style.height = '20px'; });
    $('#c-col', body).addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; color = b.dataset.p; $$('#c-col .sw', body).forEach(x => x.classList.toggle('on', x === b)); hap(); });
    $('#c-ic', body).addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; icon = b.dataset.k; $$('#c-ic .chip', body).forEach(x => x.classList.toggle('on', x === b)); hap(); });
    const commit = () => { c.name = $('#c-n', body).value.trim() || c.name; c.color = color; c.icon = icon; save(); renderAll(); };
    $('#c-ok', body).addEventListener('click', () => { commit(); openSettings(); });
    const up = $('#c-up', body); up && up.addEventListener('click', () => { commit(); S.cats.splice(i-1, 0, S.cats.splice(i, 1)[0]); save(); renderAll(); openSettings(); });
  });
}

async function shareFile(text, name, type){
  const file = new File([text], name, {type});
  try { if (navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:name}); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- sheet ---------- */
let sheetOpen = false;
const sheet = $('#sheet'), scrim = $('#scrim'), sheetBody = $('#sheet-body');
function openSheet(html, mount){
  sheetBody.innerHTML = html; sheetBody.scrollTop = 0;
  sheet.style.transform = ''; sheet.classList.add('on'); scrim.classList.add('on'); sheetOpen = true;
  mount && mount(sheetBody);
}
function closeSheet(){ if (document.activeElement) document.activeElement.blur(); sheet.classList.remove('on'); scrim.classList.remove('on'); sheet.style.transform = ''; sheetOpen = false; }
scrim.addEventListener('click', closeSheet);
(() => { let y0 = null, dy = 0;
  sheet.addEventListener('touchstart', e => { if (sheetBody.scrollTop > 0 && !e.target.closest('.grip')) return; if (e.target.closest('input,textarea')) return; y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = 'none'; }, {passive:true});
  sheet.addEventListener('touchmove', e => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); sheet.style.transform = `translateY(${dy}px)`; }, {passive:true});
  sheet.addEventListener('touchend', () => { if (y0 === null) return; sheet.style.transition = ''; y0 = null; if (dy > 90) closeSheet(); else sheet.style.transform = ''; });
})();

/* ---------- toast ---------- */
let toastT = 0, undoFn = null;
const toastEl = $('#toast');
function toast(html, color, undo){
  $('#toast-text').innerHTML = html; toastEl.style.setProperty('--c', color || 'var(--signal)');
  undoFn = undo || null; $('#toast-undo').hidden = !undo;
  toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), undo ? 4200 : 1800);
}
$('#toast-undo').addEventListener('click', () => { if (undoFn){ hap(); const f = undoFn; undoFn = null; f(); } });

/* ---------- views ---------- */
let curView = 'add';
function go(v){
  curView = v;
  $$('.view').forEach(x => x.classList.toggle('is-active', x.id === 'view-' + v));
  $$('.tab').forEach(x => x.classList.toggle('is-active', x.dataset.view === v));
  if (v === 'month'){ renderMonth(); }
}
$('#tabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t && t.dataset.view !== curView){ hap(); go(t.dataset.view); } });

function renderAll(){ renderCats(); renderMeta(); renderGlance(); if (curView === 'month') renderMonth(); }

/* ---------- URL intents (Raccourcis) ---------- */
function handleIntent(){
  const p = new URLSearchParams(location.search);
  if (!p.has('m') && !p.has('c') && !p.has('vue')) return;
  const sig = location.search; let seen = '';
  try { seen = sessionStorage.getItem('sou.lastIntent') || ''; sessionStorage.setItem('sou.lastIntent', sig); } catch {}
  history.replaceState(null, '', location.pathname);
  if (p.get('vue') === 'mois') go('month');
  if (seen === sig) return;
  const a = parseAmount(p.get('m') || ''), cq = norm(p.get('c'));
  const cat = cq && S.cats.find(c => norm(c.id) === cq || norm(c.name) === cq);
  if (a > 0 && cat){ addTx({a, c:cat.id, n:(p.get('n')||'').trim(), t:Date.now()}); }
  else if (a > 0){ entry = (a/100).toFixed(2).replace('.', ',').replace(/,00$/, ''); note = p.get('n') || ''; renderEntry(true); renderMeta(); }
}

/* ---------- boot ---------- */
renderAll(); handleIntent();
let lastDay = dayKey(Date.now());
document.addEventListener('visibilitychange', () => { if (!document.hidden){ const k = dayKey(Date.now()); if (k !== lastDay){ lastDay = k; renderAll(); } } });
addEventListener('resize', () => { renderEntry(); if (curView === 'month') renderChart(monthData(offset)); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
