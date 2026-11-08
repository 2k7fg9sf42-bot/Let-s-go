/* Calendrier MMA : application statique, sans dépendance. */
(() => {
  "use strict";

  const TZ = "Europe/Paris";
  const LOCALE = "fr-FR";
  const STORE_KEY = "mma-cal-prefs-v1";
  const REGION_LABELS = { international: "Internationales", france: "France", europe: "Europe" };

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "style" && typeof v === "object") {
        for (const [p, val] of Object.entries(v)) {
          if (p.startsWith("--")) n.style.setProperty(p, val); else n.style[p] = val;
        }
      }
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (k === "html") n.innerHTML = v;
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return n;
  };

  const add = (parent, ...kids) => parent.append(...kids.flat().filter((k) => k != null && k !== false));

  // ---------- Formats de date (toujours en heure de Paris) ----------
  const fmt = (opts) => new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, ...opts });
  const fTime = fmt({ hour: "2-digit", minute: "2-digit" });
  const fDayKey = fmt({ year: "numeric", month: "2-digit", day: "2-digit" });
  const fDow = fmt({ weekday: "short" });
  const fDowLong = fmt({ weekday: "long" });
  const fNum = fmt({ day: "numeric" });
  const fMon = fmt({ month: "short" });
  const fMonthYear = fmt({ month: "long", year: "numeric" });
  const fFull = fmt({ weekday: "long", day: "numeric", month: "long" });
  const fFullYear = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fUpdated = fmt({ weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  const time = (d) => fTime.format(d).replace(":", "h");
  const dayKey = (d) => {
    const p = fDayKey.formatToParts(d);
    const g = (t) => p.find((x) => x.type === t).value;
    return `${g("year")}-${g("month")}-${g("day")}`;
  };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const keyToDate = (k) => new Date(`${k}T12:00:00Z`);
  const addDays = (k, n) => {
    const d = keyToDate(k);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const mondayOf = (k) => {
    const d = keyToDate(k);
    const dow = (d.getUTCDay() + 6) % 7;
    return addDays(k, -dow);
  };

  // ---------- État ----------
  const state = {
    data: null,
    events: [],
    orgs: {},
    selected: new Set(),
    freeOnly: false,
    query: "",
    view: "list",
    month: null,
    selectedDay: null,
  };

  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      if (Array.isArray(p.selected)) state.selected = new Set(p.selected);
      state.freeOnly = !!p.freeOnly;
      if (p.view === "month" || p.view === "list") state.view = p.view;
      return p;
    } catch {
      return {};
    }
  }
  function savePrefs(extra = {}) {
    try {
      const prev = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      localStorage.setItem(STORE_KEY, JSON.stringify({
        ...prev,
        selected: [...state.selected],
        freeOnly: state.freeOnly,
        view: state.view,
        ...extra,
      }));
    } catch { /* stockage indisponible : pas grave */ }
  }

  // ---------- Thème ----------
  function initTheme(prefs) {
    const apply = (t) => document.documentElement.setAttribute("data-theme", t);
    const sys = window.matchMedia("(prefers-color-scheme: light)");
    apply(prefs.theme || (sys.matches ? "light" : "dark"));
    sys.addEventListener?.("change", (e) => {
      if (!loadPrefs().theme) apply(e.matches ? "light" : "dark");
    });
    $("#theme-btn").addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(next);
      document.querySelector('meta[name="theme-color"]').setAttribute("content", next === "light" ? "#f4f5f8" : "#0d0f14");
      savePrefs({ theme: next });
    });
  }

  // ---------- Données ----------
  async function load() {
    const res = await fetch("data/events.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function prepare(data) {
    state.data = data;
    state.orgs = data.organizations || {};
    state.events = (data.events || [])
      .filter((e) => e.start)
      .map((e) => {
        const segments = e.segments.map((s) => ({ ...s, date: new Date(s.start) }));
        if (segments.length === 1) segments[0].label = "Début";
        const main = segments.find((s) => s.key === "main") || segments[segments.length - 1];
        const me = e.fights.find((f) => f.main_event) || e.fights[0];
        const co = e.fights.find((f) => f !== me);
        const haystack = [
          e.name, e.subtitle, e.venue, e.city, e.country, state.orgs[e.org]?.name, state.orgs[e.org]?.full_name,
          ...e.fights.flatMap((f) => [f.a.name, f.b.name]),
        ].join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return {
          ...e,
          segments,
          date: new Date(e.start),
          mainDate: main ? main.date : new Date(e.start),
          day: dayKey(new Date(e.start)),
          me,
          co,
          haystack,
          anyFree: segments.some((s) => s.channels.some((c) => c.free)),
        };
      })
      .sort((a, b) => a.date - b.date);
    // Filtre par défaut : toutes les organisations.
    const known = Object.keys(state.orgs);
    state.selected = new Set([...state.selected].filter((id) => known.includes(id)));
  }

  function filtered() {
    const q = state.query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const now = Date.now();
    return state.events.filter((e) => {
      if (state.selected.size && !state.selected.has(e.org)) return false;
      if (state.freeOnly && !e.anyFree) return false;
      if (q && !q.split(/\s+/).every((w) => e.haystack.includes(w))) return false;
      return e.mainDate.getTime() + 5 * 3600e3 > now;
    });
  }

  // ---------- Petits composants ----------
  const orgColor = (id) => state.orgs[id]?.color || "#888";
  const orgName = (id) => state.orgs[id]?.name || id.toUpperCase();

  function headline(e) {
    if (e.subtitle && /vs\.?/i.test(e.subtitle)) return e.subtitle;
    if (e.me) return `${lastName(e.me.a.name)} vs. ${lastName(e.me.b.name)}`;
    return e.subtitle || "";
  }
  // Sous-titre qui n'est pas déjà « X vs. Y » (ex. « London », « Unplugged »).
  function tagline(e) {
    return e.subtitle && !/\bvs\.?\b/i.test(e.subtitle) ? e.subtitle : "";
  }

  // Main event et co-main event, noms complets.
  function billNode(e, extraClass = "") {
    if (!e.me) {
      const h = headline(e);
      return h ? el("p", { class: "ev-main" }, h) : null;
    }
    const row = (label, f, isMain) => el("div", { class: `bill-row${isMain ? " is-main" : ""}` },
      el("span", { class: "bill-label" }, label),
      el("span", { class: "bill-names" },
        el("b", {}, f.a.name),
        el("span", { class: "bill-vs" }, "vs"),
        el("b", {}, f.b.name),
        f.title ? el("span", { class: "title-belt" }, "★ Titre") : null,
      ),
    );
    return el("div", { class: `bill ${extraClass}`.trim() },
      row("Main event", e.me, true),
      e.co ? row("Co-main", e.co, false) : null,
    );
  }

  function lastName(n) {
    const parts = n.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(" ") : n;
  }

  function channelsNode(chs) {
    if (!chs.length) return el("span", { class: "muted" }, "À confirmer");
    return el("span", { class: "chans" }, chs.map((c) => el("span", { class: `chan${c.free ? " free" : ""}` }, c.name)));
  }

  function segRow(e, s) {
    const nextDay = dayKey(s.date) !== e.day;
    return el("div", { class: "seg" },
      el("span", { class: "seg-label" }, s.label),
      el("span", { class: "seg-time", title: s.estimated ? "Heure estimée" : "" },
        s.estimated ? el("span", { class: "est" }, "≈") : null,
        time(s.date),
        nextDay ? el("span", { class: "nextday" }, cap(fDow.format(s.date).replace(".", ""))) : null,
      ),
      channelsNode(s.channels),
    );
  }

  function eventCard(e) {
    const place = [e.city, e.country].filter(Boolean).join(", ");
    return el("button", {
      class: "ev", type: "button", style: { "--org": orgColor(e.org) },
      onclick: () => openEvent(e),
      "aria-label": `${e.name}, ${fFull.format(e.date)}`,
    },
      el("div", { class: "ev-head" },
        el("span", { class: "badge" }, orgName(e.org)),
        el("span", { class: "ev-place" }, place),
      ),
      el("div", { class: "ev-title" }, e.name, e.me && tagline(e) ? el("span", { class: "ev-tag" }, tagline(e)) : null),
      billNode(e),
      el("div", { class: "segs" }, e.segments.map((s) => segRow(e, s))),
    );
  }

  function toast(msg) {
    const t = el("div", { class: "toast", role: "status" }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2200);
  }

  // ---------- Prochain événement ----------
  let heroTimer = null;
  function renderHero(list) {
    const hero = $("#hero");
    clearInterval(heroTimer);
    hero.replaceChildren();
    const now = Date.now();
    const next = list.find((e) => e.mainDate.getTime() + 4 * 3600e3 > now);
    if (!next) return;
    const cd = el("div", { class: "countdown", "aria-label": "Compte à rebours" });
    const main = next.segments.find((s) => s.key === "main") || next.segments[0];
    const first = next.segments[0];
    const card = el("div", {
      class: "hero-card", style: { "--org": orgColor(next.org) }, role: "button", tabindex: "0",
      onclick: () => openEvent(next),
      onkeydown: (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openEvent(next); } },
    },
      el("div", { class: "hero-kicker" }, `${next.date.getTime() <= now ? "En ce moment" : "Prochaine soirée"} · ${orgName(next.org)}`),
      el("div", { class: "hero-title" }, next.name),
      next.me ? billNode(next, "hero-bill") : el("p", { class: "hero-sub" }, headline(next)),
      el("div", { class: "hero-grid" },
        el("div", {},
          el("div", { style: { fontWeight: 700, fontSize: "16px" } }, cap(fFull.format(next.date))),
          el("div", { class: "muted", style: { marginTop: "2px" } },
            first !== main ? `${first.label} ${first.estimated ? "≈" : ""}${time(first.date)} · ` : "",
            `Main card ${main.estimated ? "≈" : ""}${time(main.date)}`,
            dayKey(main.date) !== next.day ? ` (${fDowLong.format(main.date)})` : "",
          ),
          el("div", { style: { marginTop: "8px" } }, channelsNode(main.channels)),
        ),
        cd,
      ),
    );
    hero.append(card);
    const tick = () => {
      const target = first.date.getTime();
      let diff = Math.max(0, target - Date.now());
      if (diff === 0) {
        cd.replaceChildren(el("span", { class: "live" }, "En cours"));
        return;
      }
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      const unit = (v, l) => el("div", {}, el("b", {}, String(v).padStart(2, "0")), el("span", {}, l));
      cd.replaceChildren(unit(d, "jours"), unit(h, "h"), unit(m, "min"), unit(s, "s"));
    };
    tick();
    heroTimer = setInterval(tick, 1000);
  }

  // ---------- Filtres ----------
  function renderChips() {
    const box = $("#chips");
    box.replaceChildren();
    const counts = {};
    for (const e of state.events) counts[e.org] = (counts[e.org] || 0) + 1;
    const all = el("button", {
      class: "chip", type: "button", "aria-pressed": String(state.selected.size === 0),
      onclick: () => { state.selected.clear(); update(); },
    }, "Toutes", el("span", { class: "count" }, state.events.length));
    box.append(all);

    const byRegion = {};
    for (const [id, o] of Object.entries(state.orgs)) (byRegion[o.region || "autre"] ||= []).push(id);
    for (const region of Object.keys(REGION_LABELS)) {
      const ids = byRegion[region];
      if (!ids) continue;
      box.append(el("span", { class: "chip-sep", "aria-hidden": "true" }));
      for (const id of ids) {
        const on = state.selected.has(id);
        box.append(el("button", {
          class: "chip", type: "button", "aria-pressed": String(on), style: { "--c": orgColor(id) },
          title: state.orgs[id].full_name,
          onclick: () => {
            if (on) state.selected.delete(id); else state.selected.add(id);
            update();
          },
        }, el("span", { class: "dot" }), orgName(id), el("span", { class: "count" }, counts[id] || 0)));
      }
    }
  }

  // ---------- Vue liste ----------
  function renderList(list) {
    const root = $("#list-view");
    root.replaceChildren();
    if (!list.length) return root.append(emptyNode());
    const today = dayKey(new Date());
    const thisMonday = mondayOf(today);
    const weeks = new Map();
    for (const e of list) {
      const wk = mondayOf(e.day);
      if (!weeks.has(wk)) weeks.set(wk, new Map());
      const days = weeks.get(wk);
      if (!days.has(e.day)) days.set(e.day, []);
      days.get(e.day).push(e);
    }
    for (const [wk, days] of weeks) {
      let label;
      if (wk === thisMonday) label = "Cette semaine";
      else if (wk === addDays(thisMonday, 7)) label = "Semaine prochaine";
      else label = `Semaine du ${fmt({ day: "numeric", month: "long", timeZone: "UTC" }).format(keyToDate(wk))}`;
      const n = [...days.values()].reduce((a, d) => a + d.length, 0);
      const sec = el("section", { class: "week" },
        el("h2", { class: "week-title" }, label, el("small", {}, `${n} soirée${n > 1 ? "s" : ""}`)));
      for (const [dk, evs] of days) {
        const d = keyToDate(dk);
        sec.append(el("div", { class: "day" },
          el("div", { class: `day-label${dk === today ? " today" : ""}` },
            el("div", { class: "dow" }, new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: "UTC" }).format(d).replace(".", "")),
            el("div", { class: "num" }, new Intl.DateTimeFormat(LOCALE, { day: "numeric", timeZone: "UTC" }).format(d)),
            el("div", { class: "mon" }, new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" }).format(d).replace(".", "")),
          ),
          el("div", { class: "day-events" }, evs.map(eventCard)),
        ));
      }
      root.append(sec);
    }
  }

  function emptyNode() {
    const n = $("#empty-tpl").content.cloneNode(true);
    n.querySelector("[data-reset]").addEventListener("click", () => {
      state.selected.clear(); state.freeOnly = false; state.query = "";
      $("#search").value = ""; $("#free-only").checked = false;
      update();
    });
    return n;
  }

  // ---------- Vue calendrier ----------
  function renderMonth(list) {
    const root = $("#month-view");
    root.replaceChildren();
    const today = dayKey(new Date());
    if (!state.month) state.month = (list[0]?.day || today).slice(0, 7);
    const [y, m] = state.month.split("-").map(Number);
    const first = `${state.month}-01`;
    const start = mondayOf(first);
    const byDay = new Map();
    for (const e of list) {
      if (!byDay.has(e.day)) byDay.set(e.day, []);
      byDay.get(e.day).push(e);
    }
    const shift = (n) => {
      const d = new Date(Date.UTC(y, m - 1 + n, 1));
      state.month = d.toISOString().slice(0, 7);
      state.selectedDay = null;
      renderMonth(filtered());
    };
    root.append(el("div", { class: "month-head" },
      el("h2", {}, cap(fMonthYear.format(new Date(Date.UTC(y, m - 1, 15))))),
      el("div", { class: "month-nav" },
        el("button", { class: "btn ghost small", type: "button", onclick: () => shift(-1), "aria-label": "Mois précédent" }, "‹"),
        el("button", { class: "btn ghost small", type: "button", onclick: () => { state.month = today.slice(0, 7); state.selectedDay = null; renderMonth(filtered()); } }, "Aujourd'hui"),
        el("button", { class: "btn ghost small", type: "button", onclick: () => shift(1), "aria-label": "Mois suivant" }, "›"),
      ),
    ));
    const grid = el("div", { class: "grid" });
    for (const d of ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]) grid.append(el("div", { class: "dow" }, d));
    for (let i = 0; i < 42; i++) {
      const k = addDays(start, i);
      if (i >= 35 && k.slice(0, 7) !== state.month) break;
      const evs = byDay.get(k) || [];
      const cls = ["cell"];
      if (k.slice(0, 7) !== state.month) cls.push("out");
      if (evs.length) cls.push("has");
      if (k === today) cls.push("today");
      if (k === state.selectedDay) cls.push("sel");
      const cell = el(evs.length ? "button" : "div", {
        class: cls.join(" "), type: evs.length ? "button" : null,
        onclick: evs.length ? () => { state.selectedDay = k; renderMonth(filtered()); } : null,
        "aria-label": evs.length ? `${k} : ${evs.length} événement(s)` : null,
      },
        el("span", { class: "n" }, Number(k.slice(8))),
        evs.slice(0, 3).map((e) => el("span", { class: "pill", style: { "--org": orgColor(e.org) } }, e.name)),
        evs.length > 3 ? el("span", { class: "muted small" }, `+${evs.length - 3}`) : null,
        el("span", { class: "dots" }, evs.map((e) => el("i", { style: { "--org": orgColor(e.org) } }))),
      );
      grid.append(cell);
    }
    root.append(grid);
    const detail = el("div", { class: "day-detail" });
    const sel = state.selectedDay && byDay.get(state.selectedDay);
    if (sel) {
      detail.append(el("h2", { class: "week-title" }, cap(new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(keyToDate(state.selectedDay)))));
      detail.append(el("div", { class: "day-events" }, sel.map(eventCard)));
    } else {
      const inMonth = list.filter((e) => e.day.startsWith(state.month)).length;
      detail.append(el("p", { class: "muted small" }, inMonth
        ? `${inMonth} soirée${inMonth > 1 ? "s" : ""} ce mois-ci. Touche un jour pour voir le détail.`
        : "Aucune soirée ce mois-ci avec les filtres actuels."));
    }
    root.append(detail);
  }

  // ---------- Fiche événement ----------
  function openEvent(e) {
    const dlg = $("#event-dialog");
    const body = $("#event-body");
    body.replaceChildren();
    body.style.setProperty("--org", orgColor(e.org));
    const place = [e.venue, e.city, e.country].filter(Boolean).join(", ");
    const anyEst = e.segments.some((s) => s.estimated);
    add(body, 
      el("div", { class: "sheet-top" },
        el("div", {},
          el("span", { class: "badge", style: { "--org": orgColor(e.org) } }, state.orgs[e.org]?.full_name || orgName(e.org)),
          el("h2", { id: "ev-title" }, e.name),
          headline(e) ? el("div", { style: { fontWeight: 600, fontSize: "16px" } }, headline(e)) : null,
          el("p", { class: "when" }, cap(fFullYear.format(e.date))),
          place ? el("div", { class: "muted small" }, place) : null,
        ),
        el("button", { class: "close", type: "button", "aria-label": "Fermer", onclick: () => dlg.close() }, "✕"),
      ),
      el("h3", {}, "Horaires & chaînes (France)"),
      el("div", { class: "box" }, e.segments.map((s) => segRow(e, s))),
      anyEst ? el("p", { class: "muted small" }, el("span", { class: "est" }, "≈ "), "Heure estimée d'après les habitudes de l'organisation : la source ne donne que la date.") : null,
      e.notes ? el("p", { class: "small" }, e.notes) : null,
    );

    if (e.fights.length) {
      add(body, el("h3", {}, `Carte des combats (${e.fights.length})`));
      const wrap = el("div", { class: "fights" });
      const multi = new Set(e.fights.map((f) => f.segment)).size > 1;
      let last = null;
      for (const f of e.fights) {
        if (multi && f.segment !== last) {
          const seg = e.segments.find((s) => s.key === f.segment);
          wrap.append(el("div", { class: "seg-group" }, seg ? `${seg.label} · ${seg.estimated ? "≈" : ""}${time(seg.date)}` : f.segment));
          last = f.segment;
        }
        wrap.append(el("div", { class: `fight${f.main_event ? " me" : ""}` },
          el("div", { class: "fighter" }, el("b", {}, f.a.name), el("span", {}, [f.a.record, f.a.country].filter(Boolean).join(" · "))),
          el("div", { class: "vs" },
            el("b", {}, "VS"),
            f.main_event ? el("div", {}, "Main event") : f === e.co ? el("div", {}, "Co-main event") : null,
            f.title ? el("div", { class: "belt" }, "★ Titre") : null,
            f.weight || "",
          ),
          el("div", { class: "fighter r" }, el("b", {}, f.b.name), el("span", {}, [f.b.record, f.b.country].filter(Boolean).join(" · "))),
        ));
      }
      add(body, wrap);
    } else {
      add(body, el("p", { class: "notice muted" }, "La carte des combats n'est pas encore annoncée."));
    }

    add(body, el("div", { class: "actions" },
      el("button", { class: "btn", type: "button", onclick: () => downloadIcs(e) }, "Ajouter à mon agenda"),
      navigator.share ? el("button", { class: "btn ghost", type: "button", onclick: () => shareEvent(e) }, "Partager") : null,
      e.url ? el("a", { class: "btn ghost", href: e.url, target: "_blank", rel: "noopener" }, `Voir sur ${e.source}`) : null,
    ));
    if (!dlg.open) dlg.showModal();
    body.scrollTop = 0;
  }

  function shareEvent(e) {
    const main = e.segments.find((s) => s.key === "main") || e.segments[0];
    const text = `${e.name}${headline(e) ? ` : ${headline(e)}` : ""} · ${cap(fFull.format(e.date))}, main card ${time(main.date)} sur ${main.channels.map((c) => c.name).join(" / ") || "?"}`;
    navigator.share({ title: e.name, text, url: location.href.split("#")[0] }).catch(() => {});
  }

  // ---------- Fichiers .ics ----------
  const icsDate = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const icsEsc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  function downloadIcs(e) {
    const main = e.segments.find((s) => s.key === "main") || e.segments[e.segments.length - 1];
    const end = new Date(main.date.getTime() + 3 * 3600e3);
    const desc = [
      headline(e),
      ...e.segments.map((s) => `${s.label} : ${s.estimated ? "≈" : ""}${time(s.date)} — ${s.channels.map((c) => c.name + (c.free ? " (gratuit)" : "")).join(", ")}`),
      "",
      ...e.fights.slice(0, 6).map((f, i) => `${i === 0 ? "Main event : " : i === 1 ? "Co-main : " : ""}${f.a.name} vs ${f.b.name}${f.weight ? ` (${f.weight})` : ""}`),
      e.url || "",
    ].join("\n");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Calendrier MMA//FR", "BEGIN:VEVENT",
      `UID:${e.id}@calendrier-mma`, `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(e.date)}`, `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsEsc(`[${orgName(e.org)}] ${e.name}${headline(e) ? ` : ${headline(e)}` : ""}`)}`,
      `LOCATION:${icsEsc([e.venue, e.city, e.country].filter(Boolean).join(", "))}`,
      `DESCRIPTION:${icsEsc(desc)}`,
      "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(e.name)}`, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = el("a", {
      href: URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" })),
      download: `${e.id}.ics`,
    });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- Abonnement aux calendriers ----------
  function openSubscribe() {
    const dlg = $("#subscribe-dialog");
    const body = $("#subscribe-body");
    const base = new URL("data/ics/", location.href);
    const httpUrl = (f) => new URL(f, base).href;
    const webcal = (f) => httpUrl(f).replace(/^https?:/, "webcal:");
    const copy = async (txt) => {
      try { await navigator.clipboard.writeText(txt); toast("Lien copié"); } catch { prompt("Copie ce lien :", txt); }
    };
    const item = (file, label, color) => el("div", { class: "sub-item" },
      el("span", { class: "name" }, color ? el("span", { class: "chip", style: { "--c": color, padding: "0", border: "0", background: "none" } }, el("span", { class: "dot" })) : null, label),
      el("span", { class: "btns" },
        el("a", { class: "btn small", href: webcal(file) }, "S'abonner"),
        el("button", { class: "btn ghost small", type: "button", onclick: () => copy(httpUrl(file)) }, "Copier le lien"),
      ),
    );
    body.replaceChildren(
      el("div", { class: "sheet-top" },
        el("h2", { id: "sub-title" }, "Dans ton agenda"),
        el("button", { class: "close", type: "button", "aria-label": "Fermer", onclick: () => dlg.close() }, "✕"),
      ),
      el("p", {}, "Abonne-toi une fois : les soirées apparaissent dans ton agenda (iPhone, Android, Google Agenda, Outlook) et se mettent à jour toutes seules après chaque lundi."),
      el("div", { class: "sub-list" },
        item("mma.ics", "Toutes les organisations"),
        Object.entries(state.orgs).map(([id, o]) => item(`${id}.ics`, o.name, o.color)),
      ),
      el("h3", {}, "Comment faire"),
      el("ul", { class: "howto" },
        el("li", {}, el("strong", {}, "iPhone / Mac : "), "touche « S'abonner », puis confirme."),
        el("li", {}, el("strong", {}, "Google Agenda (Android) : "), "« Copier le lien », puis sur ordinateur : Google Agenda → Autres agendas → + → À partir de l'URL → colle le lien. Il s'affichera aussi sur ton téléphone."),
        el("li", {}, el("strong", {}, "Outlook : "), "Ajouter un calendrier → S'abonner à partir du web → colle le lien."),
      ),
    );
    dlg.showModal();
  }

  // ---------- Rendu global ----------
  function update() {
    savePrefs();
    const list = filtered();
    renderChips();
    renderHero(list);
    $("#list-view").hidden = state.view !== "list";
    $("#month-view").hidden = state.view !== "month";
    document.querySelectorAll(".tab").forEach((t) => {
      const on = t.dataset.view === state.view;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    });
    if (state.view === "list") renderList(list); else renderMonth(list);
  }

  function renderUpdated() {
    const g = state.data?.generated_at ? new Date(state.data.generated_at) : null;
    const failed = Object.entries(state.data?.status || {}).filter(([, v]) => !v.ok).map(([k]) => orgName(k));
    $("#updated").textContent = g
      ? `Mis à jour ${fUpdated.format(g)}${failed.length ? ` · source indisponible : ${failed.join(", ")}` : ""}`
      : "";
  }

  function bind() {
    document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => { state.view = t.dataset.view; update(); }));
    let deb;
    $("#search").addEventListener("input", (ev) => {
      clearTimeout(deb);
      deb = setTimeout(() => { state.query = ev.target.value; update(); }, 120);
    });
    $("#free-only").checked = state.freeOnly;
    $("#free-only").addEventListener("change", (ev) => { state.freeOnly = ev.target.checked; update(); });
    $("#subscribe-btn").addEventListener("click", openSubscribe);
    for (const dlg of document.querySelectorAll("dialog")) {
      dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
    }
  }

  async function start() {
    const prefs = loadPrefs();
    initTheme(prefs);
    bind();
    try {
      prepare(await load());
      renderUpdated();
      update();
    } catch (err) {
      $("#updated").textContent = "Impossible de charger les données";
      $("#list-view").replaceChildren(el("div", { class: "notice" },
        el("strong", {}, "Les données n'ont pas pu être chargées. "),
        "Vérifie ta connexion puis recharge la page.",
        el("div", { class: "muted small" }, String(err)),
      ));
    }
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  start();
})();
