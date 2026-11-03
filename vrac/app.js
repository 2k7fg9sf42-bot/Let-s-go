/* Vrac — vide ta tête, Vrac range. */
(() => {
'use strict';

const KINDS = {
  tache:{label:'Tâches', one:'Tâche', check:true},
  achat:{label:'À acheter', one:'À acheter', check:true},
  idee:{label:'Idées', one:'Idée', check:false},
  voir:{label:'À voir', one:'À voir', check:true},
  note:{label:'Notes', one:'Note', check:false},
};
const ORDER = ['tache','achat','idee','voir','note'];
const cvar = k => `var(--c-${k})`;

/* ---------- storage ---------- */
const KEY = 'vrac.v1';
let S = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.items)) return s; } catch {} return {v:1, items:[], learn:{}}; })();
S.learn = S.learn || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’']/g,"'");
const sod = t => { const d = new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
const hapEl = $('#hap');
const hap = () => { try { hapEl.click(); } catch {} try { navigator.vibrate && navigator.vibrate(8); } catch {} };
const cap = s => /^(https?:|www\.)/i.test(s) ? s : s.charAt(0).toUpperCase() + s.slice(1);

/* =========================================================
   Le cerveau : classement automatique (100 % sur le téléphone)
   ========================================================= */
const W = s => s.split('|');
const LEX = {
  achat: W('lait|pain|oeufs|oeuf|beurre|fromage|yaourt|yaourts|pates|riz|cafe|the|sucre|farine|huile|sel|poivre|jambon|poulet|viande|poisson|saumon|steak|tomates|tomate|pommes|pomme|bananes|banane|carottes|oignons|ail|salade|legumes|fruits|citron|avocat|courgettes|patates|pommes de terre|chocolat|biscuits|cereales|jus|eau|biere|bieres|vin|soda|coca|papier toilette|pq|sopalin|essuie-tout|lessive|liquide vaisselle|eponge|eponges|shampoing|gel douche|dentifrice|deodorant|savon|couches|croquettes|litiere|piles|ampoule|ampoules|sacs poubelle|creme|mozza|mozzarella|parmesan|baguette|croissants|miel|confiture|nutella|ketchup|mayo|moutarde|surgeles|glace|pizza|chips|capsules|filtres|lingettes|coton|rasoirs'),
  voir: W('film|films|serie|series|saison|episode|livre|livres|roman|bd|manga|podcast|album|chanson|morceau|musique|playlist|netflix|youtube|prime video|disney|canal|arte|documentaire|docu|video|article|expo|exposition|musee|spectacle|concert|anime|jeu video|bande annonce|trailer|spotify|deezer|twitch|ted|conference'),
  idee: W('idee|idees|concept|logo|appli|application|app|startup|business|design|projet|cadeau|inspiration|moodboard|branding|typo|affiche|illustration|nom de|slogan|tatouage|deco|voyage'),
  tache: W('rdv|rendez-vous|rendez vous|mail|email|e-mail|facture|factures|impots|dossier|banque|medecin|dentiste|kine|ophtalmo|garage|controle technique|assurance|mutuelle|caf|urssaf|deadline|urgent|reunion|appel|devis|loyer|colis|formulaire|papiers|passeport|carte d\'identite|permis|abonnement'),
};
const RX = {
  achat: /^(il (me )?faut |faut |penser a |pense a |ne pas oublier (d'|de )|n'oublie pas (d'|de ))?(acheter|racheter|prendre (du|de la|de l'|des|un|une)|courses?\b|liste de courses|a acheter)/,
  voir: /^(regarder|mater|voir le film|voir la serie|voir l'expo|aller voir|lire|ecouter|tester|essayer|decouvrir|binge)\b|^(un |le |la |les )?(film|serie|livre|podcast|album|docu)\b/,
  idee: /^(idee|et si|pourquoi pas|ce serait|ca serait|ca pourrait|imagine|imaginer|concept|projet|piste|faire une appli|creer)\b/,
  tache: /^(il (me )?faut|faut|je dois|dois|penser a|pense a|ne pas oublier|n'oublie pas|oublie pas|appeler|rappeler|telephoner|envoyer|payer|regler|reserver|prendre (un )?(rdv|rendez)|faire|finir|terminer|relancer|repondre|ecrire|imprimer|deposer|recuperer|ranger|nettoyer|reparer|annuler|commander|contacter|verifier|demander|preparer|mettre|changer|resilier|inscrire|planifier|organiser|booker|signer|scanner|declarer|rendre|laver|sortir|aller|passer|amener|emmener|chercher|trouver|noter|confirmer|valider|renouveler|vider|arroser|nourrir|souhaiter|offrir)\b/,
};
const STOP = new Set(W("les|des|une|pour|avec|dans|sur|par|pas|plus|que|qui|quoi|est|sont|mon|ton|son|mes|tes|ses|notre|votre|leur|aux|du|de|la|le|un|et|ou|en|a|au|il|elle|je|tu|on|nous|vous|ils|ce|cet|cette|ces|ca|faut|faire|demain|aujourd'hui|soir|matin"));
const tokens = s => norm(s).split(/[^a-z0-9'-]+/).filter(w => w.length >= 3 && !STOP.has(w));

function classify(text){
  const t = norm(text).trim();
  const sc = {tache:0, achat:0, idee:0, voir:0, note:.6};
  for (const k of ['achat','voir','idee','tache']) if (RX[k].test(t)) sc[k] += k === 'tache' ? 3 : 4;
  for (const k of Object.keys(LEX)) for (const w of LEX[k]) if (new RegExp(`(^|[^a-z])${w.replace(/[-]/g,'\\-')}s?([^a-z]|$)`).test(t)) sc[k] += k === 'achat' ? 1.6 : 1.4;
  if (/https?:\/\/|www\./.test(t)) sc.voir += 2.5;
  if (/youtu|netflix|spotify|deezer|vimeo|allocine|senscritique|imdb|letterboxd/.test(t)) sc.voir += 3;
  if (parseDue(text).due) sc.tache += 1.6;
  if (/\?$/.test(t)) sc.idee += .8;
  if (t.split(/\s+/).length > 22) sc.note += 1.5;
  /* ce que Vrac a appris de tes corrections */
  for (const w of tokens(text)){ const L = S.learn[w]; if (L) for (const k in L) sc[k] = (sc[k]||0) + 1.3 * Math.log2(1 + L[k]); }
  return ORDER.concat().sort((a,b) => sc[b] - sc[a])[0];
}
function learn(text, kind){
  for (const w of tokens(text)){ const L = S.learn[w] = S.learn[w] || {}; L[kind] = (L[kind]||0) + 1; }
}

/* découpe « acheter du lait, des œufs et du pain » en 3 articles */
function splitPurchases(text){
  let t = text.trim().replace(/^(il (me )?faut |faut |penser à |pense à |ne pas oublier (d'|de )|n'oublie pas (d'|de ))?(acheter|racheter|prendre|courses?\s*:?|liste de courses\s*:?|à acheter\s*:?)\s*/i, '');
  const parts = t.split(/\s*(?:,|;|\n|\s+et\s+|\s+puis\s+|\s+plus\s+|\s+avec\s+)\s*/i).map(s => s.trim()).filter(Boolean);
  // dictée sans virgules : « des pâtes du parmesan du basilic » → coupe devant chaque article
  if (!/[,;\n]/.test(t)) for (let i = parts.length - 1; i >= 0; i--){
    const sub = parts[i].split(/\s+(?=(?:du|des|de la|de l'|de l’|un|une|quelques)\s)/i).map(x => x.trim()).filter(Boolean);
    if (sub.length > 1) parts.splice(i, 1, ...sub);
  }
  const clean = s => cap(s.replace(/^(du|de la|de l'|des|un|une|le|la|les|l'|d'|quelques|deux|trois)\s*/i, '').replace(/[.!]+$/, '').trim());
  if (parts.length >= 2 && parts.every(p => p.split(/\s+/).length <= 6)) return parts.map(clean).filter(Boolean);
  return [clean(t) || cap(text.trim())];
}

/* dates en français : demain, lundi, le 12, à 15h, dans 3 jours… */
const DAYS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const MONTHS = ['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
const NUM = {un:1,une:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10,quinze:15};
function parseDue(text){
  const t = norm(text), now = new Date();
  let d = null, time = null;
  if (/apres[- ]demain/.test(t)) d = sod(now) + 2*864e5;
  else if (/\bdemain\b/.test(t)) d = sod(now) + 864e5;
  else if (/aujourd'?hui|\bce soir\b|\bce matin\b|cet aprem|cet apres-midi|\btout a l'heure\b|\btantot\b/.test(t)) d = sod(now);
  else if (/semaine prochaine/.test(t)){ const x = new Date(sod(now)); x.setDate(x.getDate() + ((8 - x.getDay()) % 7 || 7)); d = x.getTime(); }
  else {
    let m = t.match(/\bdans (\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|dix|quinze) (jours?|semaines?)\b/);
    if (m){ const n = NUM[m[1]] || +m[1]; d = sod(now) + n * (m[2].startsWith('sem') ? 7 : 1) * 864e5; }
    else if ((m = t.match(new RegExp(`\\b(${DAYS.join('|')})\\b`)))){
      const target = DAYS.indexOf(m[1]); let diff = (target - now.getDay() + 7) % 7; if (diff === 0) diff = 7; d = sod(now) + diff * 864e5;
    } else if ((m = t.match(new RegExp(`\\ble (\\d{1,2})(?:er)?(?: (${MONTHS.join('|')}))?\\b`)))){
      const day = +m[1]; if (day >= 1 && day <= 31){
        let mo = m[2] ? MONTHS.indexOf(m[2]) : now.getMonth(); let y = now.getFullYear();
        let x = new Date(y, mo, day); if (x.getTime() < sod(now)) { if (m[2]) x = new Date(y+1, mo, day); else x = new Date(y, mo+1, day); }
        d = x.getTime();
      }
    }
  }
  let m = t.match(/\b(?:a |vers |avant )?(\d{1,2}) ?h ?(\d{2})?\b/) || t.match(/\b(?:a |vers )(\d{1,2}):(\d{2})\b/);
  if (m && +m[1] < 24){ time = [+m[1], m[2] ? +m[2] : 0]; }
  else if (/\bmidi\b/.test(t)) time = [12, 0];
  else if (/\bce soir\b/.test(t)) time = null;
  if (time && d === null){ d = sod(now); if (now.getHours()*60 + now.getMinutes() > time[0]*60 + time[1]) d += 864e5; }
  if (d === null) return {};
  const x = new Date(d); if (time) x.setHours(time[0], time[1], 0, 0); else x.setHours(12, 0, 0, 0);
  return {due:x.getTime(), hasTime:!!time};
}
function dueLabel(it){
  const today = sod(Date.now()), day = sod(it.due), diff = Math.round((day - today)/864e5);
  const tm = it.hasTime ? ' · ' + new Date(it.due).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}).replace(':','h') : '';
  let l, cls = '';
  if (diff < 0){ l = diff === -1 ? 'hier' : `il y a ${-diff} j`; cls = 'late'; }
  else if (diff === 0){ l = "aujourd'hui"; cls = 'today'; if (it.hasTime && it.due < Date.now()) cls = 'late'; }
  else if (diff === 1) l = 'demain';
  else if (diff < 7) l = new Date(it.due).toLocaleDateString('fr-FR',{weekday:'long'});
  else l = new Date(it.due).toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
  return {l: l + tm, cls};
}
const ago = t => { const s = (Date.now() - t)/1000; if (s < 60) return "à l'instant"; if (s < 3600) return `${Math.floor(s/60)} min`; if (s < 86400) return `${Math.floor(s/3600)} h`; const d = Math.floor(s/86400); return d === 1 ? 'hier' : d < 7 ? `${d} j` : new Date(t).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}); };

/* ---------- ajout ---------- */
function analyze(text, forced){
  const kind = forced || classify(text);
  const parts = kind === 'achat' ? splitPurchases(text) : [cap(kind === 'idee' ? (text.trim().replace(/^id[ée]e\s*:?\s*(de\s+|d['’]\s*)?/i, '') || text.trim()) : text.trim())];
  const due = kind === 'achat' ? {} : parseDue(text);
  return {kind, parts, due};
}
function ingest(text, forced, opts = {}){
  text = String(text || '').trim(); if (!text) return [];
  const {kind, parts, due} = analyze(text, forced);
  const t = Date.now();
  const made = parts.map((p, i) => ({id:uid(), text:p, kind, t:t + i, done:false, raw: parts.length > 1 ? text : undefined, ...due}));
  S.items.push(...made); save();
  landing = new Set(made.map(m => m.id));
  if (filter !== 'all' && filter !== kind) filter = kind;
  render();
  const d = $(`.drawer[data-k="${kind}"]`); if (d){ d.classList.remove('pulse'); void d.offsetWidth; d.classList.add('pulse'); }
  if (!opts.silent){
    toast(made.length > 1 ? `${made.length} articles → ${KINDS[kind].label}` : (due.due ? `${KINDS[kind].one} · touche la cloche pour un rappel` : `Rangé dans ${KINDS[kind].label}`), cvar(kind), () => {
      const ids = new Set(made.map(m => m.id)); S.items = S.items.filter(x => !ids.has(x.id)); save(); render();
    }, made.length === 1 ? () => editItem(made[0].id) : null);
  }
  return made;
}
let landing = new Set();

/* ---------- rendu ---------- */
let filter = 'all';
const listEl = $('#list');
function render(){
  const open = S.items.filter(i => !i.done), done = S.items.filter(i => i.done);
  $('#date').textContent = new Date().toLocaleDateString('fr-FR',{weekday:'short', day:'numeric', month:'long'});
  const late = open.filter(i => i.due && sod(i.due) <= sod(Date.now())).length;
  $('#count').innerHTML = `<button type="button" id="settings-btn" style="text-align:right;line-height:1.5"><b>${open.length}</b> en vrac${late ? `<br><span style="color:var(--hot)">${late} pour aujourd'hui</span>` : '<br>⋯'}</button>`;

  $('#drawers').innerHTML = [['all','Tout',open.length]].concat(ORDER.map(k => [k, KINDS[k].label, open.filter(i => i.kind === k).length]))
    .map(([k,l,n]) => `<button type="button" class="drawer ${filter === k ? 'on':''}" data-k="${k}" style="--c:${k === 'all' ? 'var(--ink)' : cvar(k)}">${k === 'all' ? '' : '<i></i>'}${l}${n ? ` <em>${n}</em>` : ''}</button>`).join('');

  const shown = open.filter(i => filter === 'all' || i.kind === filter);
  const shownDone = done.filter(i => filter === 'all' || i.kind === filter).sort((a,b) => (b.doneAt||0) - (a.doneAt||0));
  let html = '';
  if (!shown.length && !shownDone.length){
    html = filter === 'all'
      ? `<div class="empty"><div class="big">La tête vide,<br>enfin.</div><p>Dis ou écris n'importe quoi, Vrac le range tout seul.</p><p><span class="ex">acheter du lait, des œufs et du pain</span><span class="ex">appeler le garage demain 10h</span><span class="ex">idée : une affiche en risographie</span><span class="ex">regarder Dune 2</span></p></div>`
      : `<div class="empty"><div class="big">Rien ici.</div><p>${KINDS[filter].label} : tout est fait. Pas mal.</p></div>`;
  } else {
    const now = sod(Date.now());
    const urgent = shown.filter(i => i.due && sod(i.due) <= now).sort((a,b) => a.due - b.due);
    const rest = shown.filter(i => !urgent.includes(i));
    if (urgent.length) html += `<div class="sec hot"><span>Aujourd'hui</span></div>` + urgent.map(card).join('');
    if (filter === 'all'){
      for (const k of ORDER){
        const g = rest.filter(i => i.kind === k).sort(sorter); if (!g.length) continue;
        html += `<div class="sec"><span>${KINDS[k].label} · ${g.length}</span>${k === 'achat' ? '<button type="button" class="act" data-act="share">Partager</button>' : ''}</div>` + g.map(card).join('');
      }
    } else {
      const g = rest.sort(sorter);
      if (g.length) html += `<div class="sec"><span>${urgent.length ? 'Ensuite' : KINDS[filter].label}</span>${filter === 'achat' ? '<button type="button" class="act" data-act="share">Partager la liste</button>' : ''}</div>` + g.map(card).join('');
    }
    if (shownDone.length){
      html += `<div class="sec"><span>Fait · ${shownDone.length}</span><button type="button" class="act" data-act="clear">Vider</button></div>` + (showDone ? shownDone.slice(0, 40).map(card).join('') : `<button type="button" class="sec" data-act="showdone" style="width:100%;padding-top:0">Afficher ↓</button>`);
    }
  }
  listEl.innerHTML = html;
  landing = new Set();
}
let showDone = false;
const sorter = (a,b) => (a.due && b.due) ? a.due - b.due : a.due ? -1 : b.due ? 1 : b.t - a.t;
function card(i){
  const K = KINDS[i.kind], chk = K.check;
  const due = i.due && !i.done ? dueLabel(i) : null;
  const url = (i.text.match(/https?:\/\/[^\s]+/) || [])[0];
  const txt = esc(url ? i.text.replace(url, '').trim() || url : i.text);
  return `<div class="card-wrap" data-id="${i.id}">
    <div class="card-under r">${chk ? (i.done ? 'Rouvrir' : 'Fait') : ''}</div><div class="card-under l">Supprimer</div>
    <div class="card k-${i.kind} ${chk ? '' : 'nocheck'} ${i.done ? 'done':''} ${landing.has(i.id) ? 'landing':''}" style="--c:${cvar(i.kind)}">
      ${chk ? `<button type="button" class="chk" data-act="toggle" aria-label="Cocher"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg></button>` : ''}
      <div><div class="txt">${txt}</div>
      <div class="meta"><span class="tag"><i></i>${K.one}</span>${due ? `<button type="button" class="due ${due.cls} ${i.reminded ? 'rem' : ''}" data-act="remind" aria-label="Me le rappeler">${BELL}${due.l}</button>` : ''}${url ? `<a class="link" href="${esc(url)}" target="_blank" rel="noopener">${esc(url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])} ↗</a>` : ''}<span>${ago(i.t)}</span></div></div>
    </div></div>`;
}

/* ---------- interactions liste ---------- */
$('#drawers').addEventListener('click', e => { const d = e.target.closest('.drawer'); if (!d) return; hap(); filter = d.dataset.k; render(); listEl.scrollTop = 0; d.scrollIntoView({inline:'nearest', behavior:'smooth', block:'nearest'}); });
listEl.addEventListener('click', e => {
  if (e.target.closest('a')) return;
  const act = e.target.closest('[data-act]');
  if (act){
    const a = act.dataset.act;
    if (a === 'toggle'){ const id = act.closest('.card-wrap').dataset.id; toggle(id); return; }
    if (a === 'remind'){ remind(act.closest('.card-wrap').dataset.id); return; }
    if (a === 'share') return shareList();
    if (a === 'showdone'){ showDone = true; render(); return; }
    if (a === 'clear'){ const n = S.items.filter(i => i.done && (filter === 'all' || i.kind === filter)); const ids = new Set(n.map(i=>i.id)); S.items = S.items.filter(i => !ids.has(i.id)); save(); render(); toast(`${n.length} élément${n.length>1?'s':''} vidé${n.length>1?'s':''}`, null, () => { S.items.push(...n); save(); render(); }); return; }
  }
  const w = e.target.closest('.card-wrap'); if (w && !swiped) editItem(w.dataset.id);
});
function toggle(id){
  const it = S.items.find(x => x.id === id); if (!it) return;
  hap();
  const w = $(`.card-wrap[data-id="${id}"]`); const c = w && $('.card', w);
  it.done = !it.done; it.doneAt = it.done ? Date.now() : undefined; save();
  if (c){ c.classList.toggle('done', it.done); setTimeout(() => { w.classList.add('leaving'); setTimeout(render, 360); }, 380); } else render();
}
function remove(id){
  const idx = S.items.findIndex(x => x.id === id); if (idx < 0) return;
  const [it] = S.items.splice(idx, 1); save(); hap();
  const w = $(`.card-wrap[data-id="${id}"]`);
  if (w){ w.classList.add('leaving'); setTimeout(render, 360); } else render();
  toast('Supprimé', cvar(it.kind), () => { S.items.splice(idx, 0, it); save(); render(); });
}

/* swipe : droite = fait, gauche = supprimer */
let swiped = false;
(() => {
  let w = null, c = null, x0 = 0, y0 = 0, dx = 0, lock = null;
  listEl.addEventListener('touchstart', e => { const ww = e.target.closest('.card-wrap'); if (!ww || e.target.closest('.chk,a,[data-act]')) return; w = ww; c = $('.card', w); x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; lock = null; swiped = false; }, {passive:true});
  listEl.addEventListener('touchmove', e => {
    if (!w) return; const x = e.touches[0].clientX - x0, y = e.touches[0].clientY - y0;
    if (lock === null && (Math.abs(x) > 8 || Math.abs(y) > 8)) lock = Math.abs(x) > Math.abs(y) * 1.2 ? 'x' : 'y';
    if (lock !== 'x') return;
    const it = S.items.find(i => i.id === w.dataset.id); const canR = it && KINDS[it.kind].check;
    dx = x > 0 && !canR ? x * .15 : x; c.style.transition = 'none'; c.style.transform = `translateX(${dx}px)`;
    $('.card-under.r', w).style.opacity = dx > 0 ? 1 : 0; $('.card-under.l', w).style.opacity = dx < 0 ? 1 : 0;
  }, {passive:true});
  listEl.addEventListener('touchend', () => {
    if (!w) return; const id = w.dataset.id, ww = w; c.style.transition = '';
    if (lock === 'x'){ swiped = true; setTimeout(() => swiped = false, 50);
      const it = S.items.find(i => i.id === id);
      if (dx > 90 && it && KINDS[it.kind].check){ c.style.transform = ''; toggle(id); }
      else if (dx < -110){ c.style.transform = 'translateX(-110%)'; setTimeout(() => remove(id), 180); }
      else c.style.transform = '';
    }
    w = null; void ww;
  });
})();

/* ---------- édition ---------- */
function editItem(id){
  const it = S.items.find(x => x.id === id); if (!it) return;
  let kind = it.kind, due = it.due || null, hasTime = !!it.hasTime;
  const iso = t => new Date(t - new Date(t).getTimezoneOffset()*6e4).toISOString().slice(0,16);
  openSheet(`<h3>${KINDS[it.kind].one}</h3>
    <label class="field"><textarea class="ta" id="e-t">${esc(it.text)}</textarea></label>
    <div class="field"><span>Ranger dans · Vrac s'en souviendra</span><div class="chips" id="e-k">${ORDER.map(k => `<button type="button" class="chip ${k === kind ? 'on':''}" data-k="${k}" style="--c:${cvar(k)}"><i></i>${KINDS[k].one}</button>`).join('')}</div></div>
    <div class="field"><span>Échéance</span><div class="chips" id="e-d">
      <button type="button" class="chip" data-d="none">Aucune</button><button type="button" class="chip" data-d="0">Aujourd'hui</button><button type="button" class="chip" data-d="1">Demain</button><button type="button" class="chip" data-d="7">Dans 1 sem.</button>
    </div><input class="input" type="datetime-local" id="e-dt" style="margin-top:8px" value="${due ? iso(due) : ''}"></div>
    <button type="button" class="btn remind" id="e-rem">${BELL}<span id="e-rem-l"></span></button>
    <div class="row-btns"><button type="button" class="btn danger" id="e-del">Supprimer</button>${navigator.share ? '<button type="button" class="btn ghost" id="e-sh">Partager</button>' : ''}<button type="button" class="btn" id="e-ok">OK</button></div>`, body => {
    const ta = $('#e-t', body); const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(220, ta.scrollHeight + 2) + 'px'; }; grow(); ta.addEventListener('input', grow);
    const markDue = () => { $$('#e-d .chip', body).forEach(c => { const v = c.dataset.d; c.classList.toggle('on', v === 'none' ? !due : due && sod(due) === sod(Date.now()) + (+v)*864e5); }); $('#e-dt', body).value = due ? iso(due) : ''; };
    markDue();
    $('#e-k', body).addEventListener('click', e => { const c = e.target.closest('[data-k]'); if (!c) return; kind = c.dataset.k; hap(); $$('#e-k .chip', body).forEach(x => x.classList.toggle('on', x === c)); });
    $('#e-d', body).addEventListener('click', e => { const c = e.target.closest('[data-d]'); if (!c) return; hap(); if (c.dataset.d === 'none'){ due = null; hasTime = false; } else { const x = new Date(sod(Date.now()) + (+c.dataset.d)*864e5); if (hasTime && it.due){ const o = new Date(it.due); x.setHours(o.getHours(), o.getMinutes()); } else { x.setHours(12); hasTime = false; } due = x.getTime(); } markDue(); });
    $('#e-dt', body).addEventListener('change', e => { const v = e.target.value; if (!v){ due = null; } else { due = new Date(v).getTime(); hasTime = true; } markDue(); });
    $('#e-ok', body).addEventListener('click', () => {
      const text = ta.value.trim(); if (!text) return remove(id), closeSheet();
      if (kind !== it.kind){ learn(it.raw || it.text, kind); }
      it.text = text; it.kind = kind; it.due = due || undefined; it.hasTime = due ? hasTime : undefined; save(); closeSheet(); render();
    });
    $('#e-del', body).addEventListener('click', () => { closeSheet(); remove(id); });
    const remBtn = $('#e-rem', body);
    const markRem = () => { remBtn.disabled = !due; $('#e-rem-l', body).textContent = !due ? 'Choisis une échéance pour un rappel' : it.reminded && it.due === due ? 'Rappel ajouté · le refaire' : 'Me le rappeler'; };
    markRem();
    body.addEventListener('click', e => { if (e.target.closest('#e-d,#e-k')) setTimeout(markRem); });
    $('#e-dt', body).addEventListener('change', () => setTimeout(markRem));
    remBtn.addEventListener('click', () => {
      if (!due) return;
      const text = ta.value.trim() || it.text;
      it.text = text; it.kind = kind; it.due = due; it.hasTime = hasTime; save(); closeSheet(); render(); remind(id);
    });
    const sh = $('#e-sh', body); sh && sh.addEventListener('click', () => navigator.share({text: ta.value}).catch(() => {}));
  });
}
function shareList(){
  const items = S.items.filter(i => i.kind === 'achat' && !i.done);
  const text = 'À acheter :\n' + items.map(i => '◻︎ ' + i.text).join('\n');
  if (navigator.share) navigator.share({text}).catch(() => {}); else navigator.clipboard.writeText(text).then(() => toast('Liste copiée'));
}

/* ---------- rappels : passe par l'app Calendrier de l'iPhone ---------- */
const BELL = '<svg viewBox="0 0 16 16" class="bell"><path d="M4 11.5V7.2a4 4 0 018 0v4.3l1 1.2H3z"/><path d="M6.6 14.2a1.5 1.5 0 002.8 0"/></svg>';
function remind(id){
  const it = S.items.find(x => x.id === id); if (!it || !it.due) return;
  hap();
  const q = new URLSearchParams({t: it.text, d: String(it.due), h: it.hasTime ? '1' : '0', id: it.id});
  it.reminded = true; save(); render();
  if (navigator.serviceWorker && navigator.serviceWorker.controller) location.href = 'rappel.ics?' + q;
  else location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(self.vracICS(it.text, it.due, it.hasTime, it.id));
}

/* ---------- réglages ---------- */
function openSettings(){
  const learned = Object.keys(S.learn).length;
  openSheet(`<h3>Réglages</h3>
    <div class="set-title">Le cerveau</div>
    <div class="set-group"><button type="button" class="set-row" id="s-forget"><span class="lbl">Oublier ce que Vrac a appris</span><span class="val">${learned} mot${learned>1?'s':''}</span></button></div>
    <p class="set-note">Quand tu changes le tiroir d'un élément, Vrac retient les mots pour mieux ranger la prochaine fois. Tout reste sur ton téléphone.</p>
    <div class="set-title">Données</div>
    <div class="set-group">
      <button type="button" class="set-row" id="s-bak"><span class="lbl">Sauvegarder</span><span class="val">.json ›</span></button>
      <label class="set-row"><span class="lbl">Restaurer une sauvegarde</span><span class="val">›</span><input type="file" id="s-imp" accept="application/json,.json" hidden></label>
      <button type="button" class="set-row" id="s-wipe" style="color:var(--hot)"><span class="lbl">Tout effacer</span></button>
    </div>`, body => {
    $('#s-forget', body).addEventListener('click', e => { S.learn = {}; save(); $('.val', e.currentTarget).textContent = '0 mot'; hap(); });
    $('#s-bak', body).addEventListener('click', async () => {
      const name = `vrac-sauvegarde-${new Date().toISOString().slice(0,10)}.json`, file = new File([JSON.stringify(S)], name, {type:'application/json'});
      try { if (navigator.canShare && navigator.canShare({files:[file]})) return await navigator.share({files:[file]}); } catch (err) { if (err && err.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click();
    });
    $('#s-imp', body).addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); if (!Array.isArray(d.items)) throw 0; if (confirm(`Remplacer par cette sauvegarde (${d.items.length} éléments) ?`)){ S = d; S.learn = S.learn || {}; save(); render(); closeSheet(); toast('Sauvegarde restaurée'); } } catch { alert('Fichier illisible.'); } });
    $('#s-wipe', body).addEventListener('click', () => { if (confirm('Tout effacer ? C\'est définitif.')){ S.items = []; save(); render(); closeSheet(); } });
  });
}
$('#count').addEventListener('click', e => { if (e.target.closest('#settings-btn')) openSettings(); });

/* ---------- saisie ---------- */
const input = $('#input'), form = $('#capture'), guess = $('#guess');
let forced = null;
function autoGrow(){ input.style.height = 'auto'; input.style.height = Math.min(132, input.scrollHeight) + 'px'; }
function updateGuess(){
  const v = input.value.trim(); form.classList.toggle('has', !!v);
  if (!v){ guess.hidden = true; forced = null; return; }
  const a = analyze(v, forced);
  guess.hidden = false;
  const gc = $('#guess-chip'); gc.style.setProperty('--c', cvar(a.kind)); gc.innerHTML = `<i></i>${KINDS[a.kind].one}`;
  const extra = [];
  if (a.parts.length > 1) extra.push(`${a.parts.length} articles`);
  if (a.due.due) extra.push(dueLabel({due:a.due.due, hasTime:a.due.hasTime}).l);
  $('#guess-extra').textContent = extra.join(' · ');
}
input.addEventListener('input', () => { autoGrow(); updateGuess(); });
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); submit(); } });
form.addEventListener('submit', e => { e.preventDefault(); submit(); });
$('#send').addEventListener('pointerdown', e => e.preventDefault()); // garde le clavier ouvert
function submit(){
  const v = input.value.trim(); if (!v) return;
  hap();
  if (forced) learn(v, forced);
  ingest(v, forced);
  input.value = ''; forced = null; autoGrow(); updateGuess();
}
$('#guess-chip').addEventListener('pointerdown', e => e.preventDefault());
$('#guess-chip').addEventListener('click', () => {
  const cur = analyze(input.value, forced).kind; forced = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]; hap(); updateGuess();
});

/* ---------- dictée ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const listen = $('#listen'), listenText = $('#listen-text'), listenGuess = $('#listen-guess');
const IDLE = "Je t'écoute…";
let rec = null, heard = '', silenceT = 0, maxT = 0;
function keyboardFallback(msg){ input.focus(); toast(msg || 'Touche le micro du clavier pour dicter'); }
function showHeard(){
  listenText.textContent = heard || IDLE;
  listenText.classList.toggle('idle', !heard);
  if (heard){ const a = analyze(heard); listenGuess.style.setProperty('--c', cvar(a.kind)); listenGuess.innerHTML = `<i></i>${KINDS[a.kind].one}${a.parts.length > 1 ? ` · ${a.parts.length} articles` : ''}${a.due.due ? ' · ' + dueLabel({due:a.due.due, hasTime:a.due.hasTime}).l : ''}`; listenGuess.hidden = false; }
  else listenGuess.hidden = true;
}
$('#mic').addEventListener('click', () => {
  hap();
  if (!SR) return keyboardFallback();
  try {
    rec = new SR(); rec.lang = 'fr-FR'; rec.interimResults = true; rec.continuous = true;
    heard = ''; showHeard(); listen.classList.add('on');
    rec.onresult = e => {
      let t = ''; for (const r of e.results) t += r[0].transcript; heard = t.replace(/\s+/g, ' ').trim(); showHeard();
      clearTimeout(silenceT); silenceT = setTimeout(() => stopListening(true), 2200); // fini tout seul après un silence
    };
    rec.onerror = ev => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed'){ stopListening(false); keyboardFallback('Micro non autorisé : utilise celui du clavier'); }
      else if (ev.error === 'no-speech'){ stopListening(false); toast("Je n'ai rien entendu"); }
      else if (ev.error !== 'aborted') stopListening(true);
    };
    rec.onend = () => { if (listen.classList.contains('on')) stopListening(true); };
    rec.start();
    clearTimeout(maxT); maxT = setTimeout(() => stopListening(true), 60000);
  } catch { listen.classList.remove('on'); keyboardFallback(); }
});
function stopListening(commit){
  clearTimeout(silenceT); clearTimeout(maxT);
  if (!listen.classList.contains('on')) return;
  listen.classList.remove('on'); const r = rec; rec = null; try { r && r.abort(); } catch {}
  const text = heard.trim(); heard = '';
  if (commit && text){ hap(); ingest(text); }
}
$('#listen-done').addEventListener('click', e => { e.stopPropagation(); stopListening(true); });
$('#listen-cancel').addEventListener('click', e => { e.stopPropagation(); stopListening(false); });

/* ---------- sheet & toast ---------- */
const sheet = $('#sheet'), scrim = $('#scrim'), sheetBody = $('#sheet-body');
function openSheet(html, mount){ sheetBody.innerHTML = html; sheet.style.transform = ''; sheet.classList.add('on'); scrim.classList.add('on'); mount && mount(sheetBody); }
function closeSheet(){ if (document.activeElement) document.activeElement.blur(); sheet.classList.remove('on'); scrim.classList.remove('on'); sheet.style.transform = ''; }
scrim.addEventListener('click', closeSheet);
(() => { let y0 = null, dy = 0;
  sheet.addEventListener('touchstart', e => { if (e.target.closest('textarea,input') || (sheetBody.scrollTop > 0 && !e.target.closest('.grip'))) return; y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = 'none'; }, {passive:true});
  sheet.addEventListener('touchmove', e => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); sheet.style.transform = `translateY(${dy}px)`; }, {passive:true});
  sheet.addEventListener('touchend', () => { if (y0 === null) return; sheet.style.transition = ''; y0 = null; if (dy > 90) closeSheet(); else sheet.style.transform = ''; });
})();
let toastT = 0, undoFn = null, tapFn = null;
const toastEl = $('#toast');
function toast(text, color, undo, onTap){
  $('#toast-text').textContent = text; toastEl.style.setProperty('--c', color || 'var(--accent)');
  undoFn = undo || null; tapFn = onTap || null; $('#toast-undo').hidden = !undo;
  toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), undo ? 4200 : 2000);
}
$('#toast-undo').addEventListener('click', e => { e.stopPropagation(); if (undoFn){ hap(); const f = undoFn; undoFn = null; f(); toastEl.classList.remove('on'); } });
$('#toast-text').addEventListener('click', () => { if (tapFn){ toastEl.classList.remove('on'); tapFn(); } });

/* ---------- clavier iOS : garde la barre de saisie au-dessus ---------- */
const app = $('#app');
if (window.visualViewport){
  const vv = window.visualViewport;
  const fit = () => { app.style.height = vv.height + 'px'; app.style.transform = `translateY(${vv.offsetTop}px)`; document.body.classList.toggle('kb', vv.height < window.innerHeight - 120); document.documentElement.style.setProperty('--kbh', Math.max(0, window.innerHeight - vv.height - vv.offsetTop) + 'px'); document.documentElement.style.setProperty('--dock-h', $('#dock').offsetHeight + 'px'); };
  vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); fit();
}

render();
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
setInterval(() => { if (!document.hidden && !sheet.classList.contains('on')) render(); }, 60000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
