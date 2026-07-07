/*
 * logic.js — fonctions pures (dates, niveaux, streak, pourcentages).
 * Double usage :
 *   - Navigateur (Electron renderer) : chargé AVANT app.js, les fonctions
 *     deviennent globales et sont utilisées telles quelles par app.js.
 *   - Node (tests) : require('../lib/logic.js') renvoie les mêmes fonctions.
 * Ces fonctions ne dépendent NI du DOM NI de `state` : elles sont testables isolément.
 */

// Date locale au format YYYY-MM-DD (indépendante du fuseau, ancrée sur l'heure locale).
function localDate() { const d = new Date(), offset = d.getTimezoneOffset(); return new Date(d - offset * 6e4).toISOString().slice(0, 10); }

// Clé de date YYYY-MM-DD pour une date quelconque.
function dateKey(d) { const x = new Date(d), offset = x.getTimezoneOffset(); return new Date(x - offset * 6e4).toISOString().slice(0, 10); }

// Lundi 00:00 de la semaine courante.
function weekStart() { const d = new Date(); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); d.setHours(0, 0, 0, 0); return d; }

// Pourcentage borné à 100 (0 si pas d'objectif).
function pct(value, goal) { return goal > 0 ? Math.min(100, Math.round(value / goal * 100)) : 0; }

// Niveau à partir de l'XP (100 XP = 1 niveau).
function levelFromXp(xp) { return Math.floor((Number(xp) || 0) / 100) + 1; }

// XP à l'intérieur du niveau courant (0..99), robuste aux valeurs négatives.
function xpWithinLevel(xp) { const n = Number(xp) || 0; return ((n % 100) + 100) % 100; }

// Nouvelle valeur de streak, sans effet de bord.
//  - même jour  -> inchangé
//  - hier actif -> +1
//  - sinon      -> reset à 1
function computeStreak(lastActive, today, yesterday, streak) {
  if (lastActive === today) return Number(streak) || 0;
  return lastActive === yesterday ? (Number(streak) || 0) + 1 : 1;
}

// Kinds/sources autorisés pour les événements du calendrier unifié (Vague 1).
// 'planner' = créneaux générés par le planificateur de révision interne (Vague 2).
const AGENDA_KINDS = ['focus', 'sport', 'life', 'study'];
const AGENDA_SOURCES = ['manual', 'training', 'study-glc', 'imported', 'planner'];
// Priorités, de la plus forte à la plus faible (sert aussi de rang de tri).
const AGENDA_PRIORITIES = ['high', 'normal', 'low'];
function priorityRank(p) { const i = AGENDA_PRIORITIES.indexOf(p); return i === -1 ? 1 : i; }

// ---- To-Do du jour : tâches sans horaire, distinctes des rendez-vous d'agenda ----
// Modèle : {id, text, date, priority, done, doneAt, createdAt}.
function normalizeTodo(item) {
  const x = item && typeof item === 'object' ? item : {};
  return {
    ...x,
    id: Number(x.id) || Date.now(),
    text: String(x.text || '').slice(0, 200),
    date: typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : '',
    priority: AGENDA_PRIORITIES.includes(x.priority) ? x.priority : 'normal',
    done: Boolean(x.done),
    doneAt: typeof x.doneAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.doneAt) ? x.doneAt : null,
    createdAt: Number(x.createdAt) || Number(x.id) || Date.now()
  };
}

// Vue « à faire aujourd'hui » : tâches actives (non faites, du jour OU en retard) +
// tâches terminées aujourd'hui. Les tâches non faites d'un jour passé remontent
// marquées `overdue` (report visible) — l'utilisateur décide (faire/reporter/suppr),
// pas de report silencieux. Tri : en retard d'abord, puis priorité, puis ancienneté.
function todosForDay(todos, today) {
  const list = (Array.isArray(todos) ? todos : []).map(normalizeTodo).filter(t => t.date);
  const active = list.filter(t => !t.done && t.date <= today).map(t => ({ ...t, overdue: t.date < today }));
  const done = list.filter(t => t.done && (t.doneAt ? t.doneAt === today : t.date === today));
  active.sort((a, b) => (Number(b.overdue) - Number(a.overdue)) || (priorityRank(a.priority) - priorityRank(b.priority)) || (a.createdAt - b.createdAt));
  return { active, done, remaining: active.length, overdue: active.filter(t => t.overdue).length };
}

// ---- Anniversaires : personnes connues, récurrents chaque année dans l'agenda ----
// Modèle : {id, name, day (1-31), month (1-12), year|null (pour calculer l'âge)}.
function normalizeBirthday(item) {
  const x = item && typeof item === 'object' ? item : {};
  const day = Math.round(Number(x.day)), month = Math.round(Number(x.month)), year = Math.round(Number(x.year));
  return {
    id: Number(x.id) || Date.now(),
    name: String(x.name || '').slice(0, 60),
    day: day >= 1 && day <= 31 ? day : 0,
    month: month >= 1 && month <= 12 ? month : 0,
    year: (Number.isFinite(year) && year >= 1900 && year <= 2100) ? year : null
  };
}

// Anniversaires tombant un jour donné (clé YYYY-MM-DD) → [{id, name, age|null}].
// L'âge est celui atteint ce jour-là (année de la date − année de naissance).
function birthdaysForDay(birthdays, dateKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!m) return [];
  const year = +m[1], month = +m[2], day = +m[3];
  return (Array.isArray(birthdays) ? birthdays : [])
    .map(normalizeBirthday)
    .filter(b => b.day === day && b.month === month)
    .map(b => ({ id: b.id, name: b.name, age: b.year ? year - b.year : null }));
}

// Prochains anniversaires à venir depuis `todayKey` (inclus) → triés par proximité.
// Chaque entrée : {id, name, date (prochaine occurrence YYYY-MM-DD), age|null (âge
// atteint à cette occurrence), daysUntil}. opts.withinDays borne l'horizon (défaut
// 60), opts.max le nombre renvoyé (défaut 5, 0 = tous). Gère le passage d'année.
function upcomingBirthdays(birthdays, todayKey, opts) {
  opts = opts || {};
  const withinDays = opts.withinDays == null ? 60 : Number(opts.withinDays);
  const max = opts.max == null ? 5 : Number(opts.max);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!m) return [];
  const today = new Date(+m[1], +m[2] - 1, +m[3]); today.setHours(0, 0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  const out = [];
  (Array.isArray(birthdays) ? birthdays : []).map(normalizeBirthday).filter(b => b.day && b.month).forEach(b => {
    let year = today.getFullYear();
    let next = new Date(year, b.month - 1, b.day); next.setHours(0, 0, 0, 0);
    if (next < today) { year++; next = new Date(year, b.month - 1, b.day); next.setHours(0, 0, 0, 0); }
    const daysUntil = Math.round((next - today) / 86400000);
    if (daysUntil > withinDays) return;
    out.push({ id: b.id, name: b.name, date: `${year}-${pad(b.month)}-${pad(b.day)}`, age: b.year ? year - b.year : null, daysUntil });
  });
  out.sort((a, b) => a.daysUntil - b.daysUntil || String(a.name).localeCompare(b.name));
  return max > 0 ? out.slice(0, max) : out;
}

// ---- Récurrence native (sans dépendance) : rendez-vous répétés ----
// rule = {freq:'daily'|'weekly'|'monthly'|'yearly', interval:1, weekdays:[0..6]?,
//         startDate:'YYYY-MM-DD', until:'YYYY-MM-DD'?}. weekdays : 0=dim..6=sam.
// Modèle stocké : {id, title, time, durationMin, kind, priority, rule}.
const RECUR_FREQ = ['daily', 'weekly', 'monthly', 'yearly'];
function normalizeRecurring(item) {
  const x = item && typeof item === 'object' ? item : {};
  const r = x.rule && typeof x.rule === 'object' ? x.rule : {};
  const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  return {
    id: Number(x.id) || Date.now(),
    title: String(x.title || 'Bloc').slice(0, 70),
    time: typeof x.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.time) ? x.time : '',
    durationMin: Math.max(5, Math.min(600, Number(x.durationMin) || 60)),
    kind: AGENDA_KINDS.includes(x.kind) ? x.kind : 'life',
    priority: AGENDA_PRIORITIES.includes(x.priority) ? x.priority : 'normal',
    refId: typeof x.refId === 'string' ? x.refId : '',
    doneLog: Array.isArray(x.doneLog) ? x.doneLog.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [],
    rule: {
      freq: RECUR_FREQ.includes(r.freq) ? r.freq : 'weekly',
      interval: Math.max(1, Math.min(52, Math.round(Number(r.interval) || 1))),
      weekdays: Array.isArray(r.weekdays) ? r.weekdays.map(Number).filter(n => n >= 0 && n <= 6) : [],
      startDate: isDate(r.startDate) ? r.startDate : '',
      until: isDate(r.until) ? r.until : ''
    }
  };
}

// Un jour donné (clé YYYY-MM-DD) correspond-il à la règle de récurrence ? Pur.
function recurrenceMatches(rule, dateKey) {
  if (!rule || typeof rule !== 'object') return false;
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || '')); if (!dm) return false;
  const sm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(rule.startDate || '')); if (!sm) return false;
  const date = new Date(+dm[1], +dm[2] - 1, +dm[3]); date.setHours(0, 0, 0, 0);
  const start = new Date(+sm[1], +sm[2] - 1, +sm[3]); start.setHours(0, 0, 0, 0);
  if (date < start) return false;
  if (rule.until) { const um = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rule.until); if (um) { const until = new Date(+um[1], +um[2] - 1, +um[3]); until.setHours(0, 0, 0, 0); if (date > until) return false; } }
  const interval = Math.max(1, Math.round(Number(rule.interval) || 1));
  const monday = d => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };
  switch (rule.freq) {
    case 'daily':
      return Math.round((date - start) / 86400000) % interval === 0;
    case 'weekly': {
      const wds = Array.isArray(rule.weekdays) && rule.weekdays.length ? rule.weekdays.map(Number) : [start.getDay()];
      if (!wds.includes(date.getDay())) return false;
      const weeks = Math.round((monday(date) - monday(start)) / (7 * 86400000));
      return weeks % interval === 0;
    }
    case 'monthly': {
      if (date.getDate() !== start.getDate()) return false;
      const months = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
      return months >= 0 && months % interval === 0;
    }
    case 'yearly': {
      if (date.getDate() !== start.getDate() || date.getMonth() !== start.getMonth()) return false;
      return (date.getFullYear() - start.getFullYear()) % interval === 0;
    }
    default: return false;
  }
}

// ---- Habitudes quotidiennes (façon Habitica « Dailies ») : récurrentes + série ----
// Modèle : {id, name, weekdays:[0..6] (vide = tous les jours), xp, log:[YYYY-MM-DD faits], createdAt}.
function normalizeHabit(item) {
  const x = item && typeof item === 'object' ? item : {};
  return {
    id: Number(x.id) || Date.now(),
    name: String(x.name || '').slice(0, 70),
    weekdays: Array.isArray(x.weekdays) ? x.weekdays.map(Number).filter(n => n >= 0 && n <= 6) : [],
    xp: Math.max(1, Math.min(50, Math.round(Number(x.xp) || 10))),
    log: Array.isArray(x.log) ? x.log.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [],
    createdAt: Number(x.createdAt) || Number(x.id) || Date.now()
  };
}

// Série (streak) courante d'une habitude au jour `todayKey` : nombre de jours
// programmés consécutifs faits, en remontant. Tolérant : si le jour même est
// programmé mais pas encore fait, la série n'est pas cassée (on part de la veille).
function habitStreak(habit, todayKey) {
  const h = normalizeHabit(habit);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || '')); if (!m) return 0;
  const done = new Set(h.log);
  const wds = h.weekdays.length ? new Set(h.weekdays) : new Set([0, 1, 2, 3, 4, 5, 6]);
  const pad = n => String(n).padStart(2, '0');
  const key = x => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  let d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
  if (wds.has(d.getDay()) && !done.has(key(d))) d.setDate(d.getDate() - 1); // aujourd'hui pas encore fait : on n'entame pas
  let streak = 0, guard = 0;
  while (guard++ < 3660) {
    if (wds.has(d.getDay())) { if (done.has(key(d))) streak++; else break; }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Habitudes prévues un jour donné → [{id, name, xp, done, streak}].
function habitsForDay(habits, todayKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || '')); if (!m) return [];
  const wd = new Date(+m[1], +m[2] - 1, +m[3]).getDay();
  return (Array.isArray(habits) ? habits : []).map(normalizeHabit)
    .filter(h => !h.weekdays.length || h.weekdays.includes(wd))
    .map(h => ({ id: h.id, name: h.name, xp: h.xp, done: h.log.includes(todayKey), streak: habitStreak(h, todayKey) }));
}

// Normalise une entrée d'agenda vers le modèle d'événement unifié :
// {id, title, date, time, durationMin, kind, source, refId?, planId?, completed}
// Idempotente ; les champs inconnus sont préservés (spread), les invalides corrigés.
function normalizeAgendaItem(item) {
  const x = item && typeof item === 'object' ? item : {};
  return {
    ...x,
    id: Number(x.id) || Date.now(),
    title: String(x.title || 'Bloc'),
    date: typeof x.date === 'string' ? x.date : '',
    time: typeof x.time === 'string' ? x.time : '',
    durationMin: Math.max(5, Math.min(600, Number(x.durationMin) || 60)),
    kind: AGENDA_KINDS.includes(x.kind) ? x.kind : 'life',
    source: AGENDA_SOURCES.includes(x.source) ? x.source : (x.planId ? 'training' : 'manual'),
    priority: AGENDA_PRIORITIES.includes(x.priority) ? x.priority : 'normal',
    allDay: Boolean(x.allDay),
    completed: Boolean(x.completed)
  };
}

// Échappement RFC 5545 pour les valeurs texte iCalendar.
function icsEscape(text) { return String(text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }

// Ligne RRULE iCalendar depuis une règle de récurrence interne. '' si invalide.
function buildRRuleLine(rule) {
  if (!rule || !RECUR_FREQ.includes(rule.freq) || !/^\d{4}-\d{2}-\d{2}$/.test(String(rule.startDate || ''))) return '';
  const F = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }[rule.freq];
  const D = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  let s = 'RRULE:FREQ=' + F;
  const iv = Math.max(1, Math.round(Number(rule.interval) || 1));
  if (iv > 1) s += ';INTERVAL=' + iv;
  if (rule.freq === 'weekly' && Array.isArray(rule.weekdays) && rule.weekdays.length) s += ';BYDAY=' + rule.weekdays.map(n => D[n]).filter(Boolean).join(',');
  if (rule.until) s += ';UNTIL=' + rule.until.replace(/-/g, '') + 'T235959Z';
  return s;
}

// Construit un fichier iCalendar à partir des événements du calendrier unifié.
// DTEND = début + durationMin (défaut 60), UID stable <id>@irllvpup, lignes CRLF.
// Accepte aussi les événements récurrents ({rule}) : DTSTART = début de série
// (ou journée entière sans heure) + ligne RRULE. `now` injectable pour les tests.
function buildIcs(events, now) {
  const pad = n => String(n).padStart(2, '0');
  const stamp = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  const dtstamp = stamp(now instanceof Date ? now : new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//IRL LVP UP//FR'];
  (events || []).forEach(a => {
    if (!a) return;
    const rrule = a.rule ? buildRRuleLine(a.rule) : '';
    const date = rrule ? a.rule.startDate : a.date;
    if (!date) return;
    const head = ['BEGIN:VEVENT', `UID:${a.id}@irllvpup`, `DTSTAMP:${dtstamp}`];
    if (a.time) {
      const d = new Date(`${date}T${a.time}`);
      if (isNaN(d)) return;
      const end = new Date(d.getTime() + (Number(a.durationMin) || 60) * 60000);
      head.push(`DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`);
    } else if (rrule) {
      head.push(`DTSTART;VALUE=DATE:${date.replace(/-/g, '')}`);
    } else return; // ponctuel sans heure : ignoré (comportement historique)
    if (rrule) head.push(rrule);
    head.push(`SUMMARY:${icsEscape(a.title)}`, `CATEGORIES:${icsEscape(a.kind || 'life')}`, 'END:VEVENT');
    lines.push(...head);
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

// Inverse de icsEscape : restitue les caractères échappés d'une valeur iCalendar.
function unescapeIcs(v) {
  return String(v || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

// Analyse une valeur DTSTART/DTEND iCalendar → {date:'YYYY-MM-DD', time:'HH:MM'|'',
// allDay, ms}. Gère la date seule (VALUE=DATE, journée entière), l'heure locale/
// flottante (heure de paroi telle quelle) et l'UTC (suffixe Z → converti en local).
// TZID non résolu : l'heure de paroi est prise telle quelle (suffisant en perso).
function parseIcsDateTime(value) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(String(value || '').trim());
  if (!m) return null;
  const [, Y, Mo, D, h, mi, s, z] = m;
  const pad = n => String(n).padStart(2, '0');
  if (h === undefined) return { date: `${Y}-${Mo}-${D}`, time: '', allDay: true, ms: Date.UTC(+Y, +Mo - 1, +D) };
  if (z === 'Z') {
    const d = new Date(Date.UTC(+Y, +Mo - 1, +D, +h, +mi, +(s || 0)));
    return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, allDay: false, ms: d.getTime() };
  }
  return { date: `${Y}-${Mo}-${D}`, time: `${h}:${mi}`, allDay: false, ms: Date.UTC(+Y, +Mo - 1, +D, +h, +mi, +(s || 0)) };
}

// Importe un fichier .ics (export/abonnement Google Agenda ou Apple Calendrier)
// vers des événements du modèle unifié. Déplie les lignes RFC 5545, lit chaque
// VEVENT (SUMMARY, DTSTART, DTEND, UID), déduit la durée, et marque source:'imported'
// avec refId 'ics-<uid>' pour un réimport idempotent via mergePlannedEvents.
// opts.kind = catégorie attribuée (défaut 'life'). Purement local, aucun réseau.
// Convertit une RRULE iCalendar (ex. "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20261231T000000Z")
// en règle de récurrence interne, à partir de la date de début (YYYY-MM-DD). null si non géré.
const ICS_DAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const RRULE_FREQ = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' };
function parseRRule(rrule, startDateKey) {
  if (typeof rrule !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(String(startDateKey || ''))) return null;
  const parts = {};
  rrule.split(';').forEach(kv => { const i = kv.indexOf('='); if (i > 0) parts[kv.slice(0, i).trim().toUpperCase()] = kv.slice(i + 1).trim(); });
  const freq = RRULE_FREQ[String(parts.FREQ || '').toUpperCase()];
  if (!freq) return null;
  const interval = Math.max(1, Math.round(Number(parts.INTERVAL) || 1));
  const weekdays = freq === 'weekly' && parts.BYDAY
    ? parts.BYDAY.split(',').map(d => ICS_DAY[d.trim().slice(-2).toUpperCase()]).filter(n => n != null)
    : [];
  let until = '';
  if (parts.UNTIL) { const m = /^(\d{4})(\d{2})(\d{2})/.exec(parts.UNTIL.trim()); if (m) until = `${m[1]}-${m[2]}-${m[3]}`; }
  return { freq, interval, weekdays, startDate: startDateKey, until };
}

function parseIcs(text, opts) {
  opts = opts || {};
  const kind = AGENDA_KINDS.includes(opts.kind) ? opts.kind : 'life';
  const idBase = Number(opts.baseId) || Date.now();
  const unfolded = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
  const events = [];
  let cur = null;
  for (const line of unfolded.split('\n')) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') {
      if (cur && cur.start && cur.start.date) {
        let durationMin = 60;
        if (cur.end && cur.end.ms != null && cur.start.ms != null) {
          const diff = Math.round((cur.end.ms - cur.start.ms) / 60000);
          if (diff > 0) durationMin = Math.min(1440, diff);
        }
        events.push({
          id: idBase + events.length,
          title: cur.summary || 'Événement',
          date: cur.start.date,
          time: cur.start.allDay ? '' : cur.start.time,
          durationMin,
          kind,
          source: 'imported',
          refId: 'ics-' + (cur.uid || `${cur.start.date}-${cur.start.time}-${cur.summary || ''}`),
          allDay: !!cur.start.allDay,
          recurrence: cur.rrule ? parseRRule(cur.rrule, cur.start.date) : null,
          completed: false
        });
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const name = line.slice(0, idx).split(';')[0].toUpperCase();
    const value = line.slice(idx + 1);
    if (name === 'SUMMARY') cur.summary = unescapeIcs(value);
    else if (name === 'UID') cur.uid = value.trim();
    else if (name === 'DTSTART') cur.start = parseIcsDateTime(value);
    else if (name === 'DTEND') cur.end = parseIcsDateTime(value);
    else if (name === 'RRULE') cur.rrule = value;
  }
  return events;
}

// Planificateur de révision : génère des événements `study` récurrents entre
// startDate et examDate (incluses) sur les jours cochés (0=dim..6=sam).
// refId = planner-<date>-<time> → régénération idempotente via mergePlannedEvents.
function planStudySessions(config) {
  const { title = 'Révision', time = '17:30', durationMin = 45, weekdays = [], startDate, examDate, baseId } = config || {};
  if (!startDate || !examDate || !Array.isArray(weekdays) || !weekdays.length) return [];
  const days = new Set(weekdays.map(Number));
  const start = new Date(`${startDate}T12:00:00`), end = new Date(`${examDate}T12:00:00`);
  if (isNaN(start) || isNaN(end) || start > end) return [];
  const events = []; const idBase = Number(baseId) || Date.now();
  for (let d = new Date(start), i = 0; d <= end && i < 400; d.setDate(d.getDate() + 1), i++) {
    if (!days.has(d.getDay())) continue;
    const date = dateKey(d);
    events.push({ id: idBase + events.length, title, date, time, durationMin, kind: 'study', source: 'planner', refId: `planner-${date}-${time}`, completed: false });
  }
  return events;
}

// Fusionne un plan (re)généré dans l'agenda sans doublon :
// les événements existants portant le même refId sont remplacés en PRÉSERVANT
// leur id et leur statut `completed` ; tout le reste de l'agenda est intact.
function mergePlannedEvents(agenda, events) {
  const list = Array.isArray(agenda) ? agenda : [];
  const incoming = Array.isArray(events) ? events : [];
  const previous = new Map(list.filter(a => a && a.refId).map(a => [a.refId, a]));
  const merged = incoming.map(e => { const old = previous.get(e.refId); return old ? { ...e, id: old.id, completed: Boolean(old.completed) } : e; });
  const refs = new Set(incoming.map(e => e.refId));
  return list.filter(a => !(a && a.refId && refs.has(a.refId))).concat(merged);
}

// Liste chronologique de tout ce qu'il y a à faire un jour donné (vue « Ma journée »).
// Chaque item : {id, time, title, kind, completed, planId?, type: 'plan'|'study'|'agenda'}
//  - 'plan'  = séance d'entraînement planifiée (démarrable)
//  - 'study' = créneau de révision (validable, rapporte de l'XP)
//  - 'agenda'= bloc classique (validable)
// Les plans « orphelins » (sans entrée agenda, données d'avant le fix 1.3) sont inclus.
function todayItems(state, date) {
  const s = state || {};
  const plans = Array.isArray(s.plans) ? s.plans.filter(p => p && p.date === date) : [];
  const agenda = (Array.isArray(s.agenda) ? s.agenda : []).filter(a => a && a.date === date);
  const items = agenda.map(a => ({
    id: a.id, time: a.time || '', title: String(a.title || 'Bloc'), kind: a.kind || 'life',
    priority: AGENDA_PRIORITIES.includes(a.priority) ? a.priority : 'normal',
    allDay: Boolean(a.allDay), completed: Boolean(a.completed), planId: a.planId || null,
    type: a.planId ? 'plan' : (a.kind === 'study' ? 'study' : 'agenda')
  }));
  const seen = new Set(items.filter(i => i.planId).map(i => i.planId));
  plans.filter(p => !seen.has(p.id)).forEach(p => items.push({ id: p.id, time: p.time || '', title: `Séance · ${p.type}`, kind: 'sport', priority: 'normal', allDay: false, completed: false, planId: p.id, type: 'plan' }));
  // Anniversaires (récurrents chaque année, non validables)
  birthdaysForDay(s.birthdays, date).forEach(b => items.push({ id: 'bday-' + b.id, time: '', title: `🎂 ${b.name}${b.age != null ? ` (${b.age} ans)` : ''}`, kind: 'birthday', priority: 'normal', allDay: true, completed: false, planId: null, type: 'birthday' }));
  // Événements récurrents : occurrence du jour, validable (doneLog par date)
  (Array.isArray(s.recurring) ? s.recurring : []).map(normalizeRecurring).forEach(r => {
    if (recurrenceMatches(r.rule, date)) items.push({ id: 'rec-' + r.id, time: r.time || '', title: r.title, kind: r.kind, priority: r.priority, allDay: !r.time, completed: r.doneLog.includes(date), planId: null, type: 'recurring', recId: r.id, recurring: true });
  });
  // Chronologique, puis priorité (haute avant basse) à heure égale.
  return items.sort((x, y) => String(x.time).localeCompare(String(y.time)) || priorityRank(x.priority) - priorityRank(y.priority));
}

// Convertit un export de planning du Grand Livre Compta en événements `study`.
// Format attendu : {version:1, source:'legl.compta.v2', days:[{date:'YYYY-MM-DD', due:N}]}
// Validation défensive (S.5) : schéma strict, date regex, due borné 1..500,
// max 120 jours, uniquement aujourd'hui/futur (fromDate). Renvoie [] si invalide.
// refId = glc-<date> → réimport idempotent via mergePlannedEvents.
function glcPlanningToEvents(data, options) {
  const { time = '17:30', fromDate, baseId } = options || {};
  if (!data || typeof data !== 'object' || Number(data.version) !== 1 || !Array.isArray(data.days)) return [];
  const from = typeof fromDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fromDate) ? fromDate : null;
  const safeTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '17:30';
  const idBase = Number(baseId) || Date.now();
  const events = [];
  for (const day of data.days.slice(0, 120)) {
    if (!day || typeof day !== 'object') continue;
    if (typeof day.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) continue;
    const due = Math.round(Number(day.due));
    if (!Number.isFinite(due) || due < 1 || due > 500) continue;
    if (from && day.date < from) continue;
    events.push({
      id: idBase + events.length,
      title: `Révision compta · ${due} carte${due > 1 ? 's' : ''}`,
      date: day.date, time: safeTime,
      durationMin: Math.min(90, Math.max(15, due * 2)),
      kind: 'study', source: 'study-glc', refId: `glc-${day.date}`, completed: false
    });
  }
  return events;
}

// Vue « Ma semaine » : 7 jours à partir d'un lundi (clé YYYY-MM-DD), chacun avec
// ses items (via todayItems) et un résumé par type. Pur et testable.
function weekItems(state, mondayKey) {
  const start = new Date(`${mondayKey}T12:00:00`);
  if (isNaN(start)) return [];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const items = todayItems(state, key);
    const counts = { sport: 0, focus: 0, life: 0, study: 0 };
    items.forEach(it => { if (counts[it.kind] !== undefined) counts[it.kind]++; });
    days.push({ dateKey: key, weekday: d.getDay(), items, counts, done: items.filter(i => i.completed).length, total: items.length });
  }
  return days;
}

// ---- Objectif de course & périodisation (Vague 5.3, coaching) ----
// Presets d'objectifs ; l'utilisateur peut aussi entrer une distance libre.
const RACE_PRESETS = {
  semi:     { label: 'Semi-marathon', km: 21 },
  marathon: { label: 'Marathon', km: 42 },
  ultra50:  { label: 'Ultra 50 km', km: 50 },
  ultra80:  { label: 'Ultra 80 km', km: 80 },
  ultra100: { label: 'Ultra 100 km', km: 100 },
  ultra160: { label: 'Ultra 150–200 km', km: 170 },
  custom:   { label: 'Distance libre', km: 0 }
};

// Nombre de semaines entières entre deux dates YYYY-MM-DD (négatif si to est passé).
function weeksBetween(from, to) {
  const a = new Date(`${from}T12:00:00`), b = new Date(`${to}T12:00:00`);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / (7 * 864e5));
}

// Phase de préparation en fonction des semaines restantes avant la course.
function racePhase(weeksLeft) {
  if (weeksLeft == null) return { key: 'none', label: '—', focus: '', longMul: 0 };
  if (weeksLeft < 0) return { key: 'done', label: 'Course passée', focus: 'Récupère, savoure, puis fixe un nouveau cap.', longMul: 0 };
  if (weeksLeft <= 2) return { key: 'taper', label: 'Affûtage', focus: 'Réduis le volume (~40–50 %), garde un peu d’allure, dors et mange bien : arrive frais.', longMul: 0.4 };
  if (weeksLeft <= 8) return { key: 'specific', label: 'Spécifique', focus: 'Sorties longues progressives, dénivelé, allure course et nutrition testées. Une variable à la fois.', longMul: 1 };
  if (weeksLeft <= 20) return { key: 'build', label: 'Développement', focus: 'Monte volume et D+ prudemment, un peu d’intensité contrôlée. Une semaine plus légère toutes les 3–4.', longMul: 0.75 };
  if (weeksLeft <= 52) return { key: 'base', label: 'Base', focus: 'Volume facile et régulier, force trail 2×/sem, endurance fondamentale. La base décide de tout.', longMul: 0.5 };
  return { key: 'foundation', label: 'Fondation long terme', focus: 'Installe l’habitude et la base aérobie sans te presser. Force générale (tractions, KB, gainage) + course facile. Le temps joue pour toi.', longMul: 0.4 };
}

// Échelle de distances standards pour bâtir des paliers intermédiaires.
const RACE_LADDER = [
  { km: 10, label: '10 km' },
  { km: 21, label: 'Semi-marathon' },
  { km: 42, label: 'Marathon' },
  { km: 50, label: 'Ultra 50 km' },
  { km: 80, label: 'Ultra 80 km' },
  { km: 100, label: 'Ultra 100 km' }
];

// Objectifs intermédiaires (paliers) vers l'objectif principal : distances
// croissantes réparties sur le temps disponible, pour valider la progression.
function intermediateGoals(goal, now) {
  if (!goal || !goal.date) return [];
  const today = now instanceof Date ? dateKey(now) : (typeof now === 'string' ? now : localDate());
  const weeksLeft = weeksBetween(today, goal.date);
  if (weeksLeft == null || weeksLeft < 20) return []; // trop proche pour des paliers utiles
  const D = Number(goal.distanceKm) || 0;
  const rungs = RACE_LADDER.filter(r => r.km < D * 0.75);
  if (!rungs.length) return [];
  const count = Math.max(1, Math.min(3, rungs.length, Math.floor(weeksLeft / 16)));
  const start = 0.30, end = 0.82;
  const out = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.min(rungs.length - 1, Math.max(0, Math.round((i + 0.5) / count * rungs.length)));
    const rung = rungs[idx];
    const frac = count === 1 ? 0.5 : start + (end - start) * (i / (count - 1));
    const wk = Math.round(weeksLeft * frac);
    const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() + wk * 7);
    out.push({ label: rung.label, distanceKm: rung.km, date: dateKey(d), weeksFromNow: wk, monthsFromNow: Math.round(wk / 4.345 * 10) / 10 });
  }
  // dédoublonner si deux paliers tombent sur la même distance
  return out.filter((m, i) => i === 0 || m.distanceKm !== out[i - 1].distanceKm);
}

// Statut complet de l'objectif : semaines/mois restants, phase, cible de sortie longue.
function raceGoalStatus(goal, now) {
  if (!goal || !goal.date) return null;
  const today = now instanceof Date ? dateKey(now) : (typeof now === 'string' ? now : localDate());
  const weeksLeft = weeksBetween(today, goal.date);
  const phase = racePhase(weeksLeft);
  const km = Number(goal.distanceKm) || 0;
  const peakLong = Math.min(300, Math.max(60, Math.round(km * 3)));
  const longRunMin = Math.round(peakLong * phase.longMul / 5) * 5;
  return {
    weeksLeft,
    monthsLeft: weeksLeft == null ? null : Math.round(weeksLeft / 4.345 * 10) / 10,
    phase, km, longRunMin
  };
}

// Échauffement spécifique selon le type de séance (mots-clés du titre).
// Renvoie { label, moves:[...] } — 3-4 mouvements, ~5 min, pas d'XP.
function warmupFor(title) {
  const t = String(title || '').toLowerCase();
  if (/poussée|tirage|haut|traction|pompes|press|militaire/.test(t))
    return { label: 'Échauffement haut du corps · ~5 min', moves: ['Cercles de bras + rotations d’épaules · 30 s', 'Étirements dynamiques poitrine/dos · 30 s', 'Suspension passive à la barre · 20 s', '1 série de pompes faciles + tractions négatives lentes'] };
  if (/jambe|chaîne|squat|fessier|fente|mollet/.test(t))
    return { label: 'Échauffement bas du corps · ~5 min', moves: ['Mobilité hanches (balanciers) · 30 s/jambe', 'Mobilité chevilles (genou au mur) · 30 s/côté', '15 squats à vide en contrôle', 'Fentes marchées lentes · 6/jambe'] };
  if (/trail|côte|course|puissance|longue|swing|explos/.test(t))
    return { label: 'Échauffement trail/course · ~5 min', moves: ['Marche rapide ou trot très facile · 2 min', 'Montées de genoux + talons-fesses · 30 s chacun', 'Mobilité chevilles + fentes lentes · 30 s', 'Gainage planche léger · 20 s'] };
  return { label: 'Échauffement général · ~5 min', moves: ['Mobilité cou/épaules/hanches · 1 min', 'Rotations chevilles et poignets · 30 s', '10 squats à vide + 10 rotations du tronc', 'Montée progressive du rythme cardiaque · 1 min'] };
}

// Montée en volume de course sécurisée : progression hebdomadaire du kilométrage
// de startKm vers targetKm sur `weeks` semaines, avec un gain hebdo plafonné
// (défaut 12 %) et une semaine de décharge périodique. Renvoie la série + un
// bilan honnête (cible atteignable dans les délais ? sinon durée réaliste).
function volumeRamp(startKm, targetKm, weeks, opts) {
  opts = opts || {};
  const maxGain = opts.maxWeeklyGain != null ? opts.maxWeeklyGain : 0.12;
  const cutEvery = opts.cutbackEvery != null ? opts.cutbackEvery : 4;
  const cutFactor = opts.cutbackFactor != null ? opts.cutbackFactor : 0.7;
  const start = Math.max(1, Number(startKm) || 10);
  const target = Math.max(start, Number(targetKm) || start);
  const n = Math.max(1, Math.min(52, Math.round(Number(weeks)) || 8));
  const isCut = w => cutEvery > 0 && w % cutEvery === 0 && w !== n;
  let buildCount = 0; for (let w = 1; w <= n; w++) if (!isCut(w)) buildCount++;
  const steps = Math.max(1, buildCount - 1);
  const neededRate = Math.pow(target / start, 1 / steps) - 1;
  const rate = Math.min(maxGain, Math.max(0, neededRate));
  const series = []; let peak = start, first = true;
  for (let w = 1; w <= n; w++) {
    if (isCut(w)) { series.push({ week: w, km: Math.round(peak * cutFactor), cutback: true }); continue; }
    if (!first) peak = Math.min(target, peak * (1 + rate));
    first = false;
    series.push({ week: w, km: Math.round(peak), cutback: false });
  }
  const reachableKm = Math.round(peak);
  const reachesTarget = reachableKm >= Math.round(target * 0.98);
  const safeBuildWeeks = target > start ? Math.ceil(Math.log(target / start) / Math.log(1 + maxGain)) : 0;
  const safeTotalWeeks = safeBuildWeeks + Math.floor(safeBuildWeeks / Math.max(1, cutEvery - 1));
  return { series, ratePct: Math.round(rate * 1000) / 10, reachableKm, reachesTarget, thisWeekKm: series[0].km, targetKm: target, safeTotalWeeks };
}

// Répartit une semaine d'entraînement hybride sur les jours choisis (0=dim..6=sam).
// Assigne un type à CHAQUE jour coché : Sortie longue, Musculation, Fractionné,
// Course, Mobilité / repos. Espace les jours durs, garde les jambes fraîches
// avant la sortie longue, et n'ajoute du fractionné qu'en phase avancée.
function buildWeekPlan(days, opts) {
  opts = opts || {};
  const phase = opts.phase || 'base';
  const pos = d => (Number(d) + 6) % 7; // lundi=0 … dimanche=6
  const sorted = [...new Set((Array.isArray(days) ? days : []).map(Number).filter(d => d >= 0 && d <= 6))].sort((a, b) => pos(a) - pos(b));
  const n = sorted.length;
  if (!n) return [];
  const plan = {};
  const isHard = t => t === 'Musculation' || t === 'Fractionné' || t === 'Sortie longue';
  const adjacent = (a, b) => Math.abs(pos(a) - pos(b)) === 1;
  // 1) Sortie longue : week-end si possible, sinon dernier jour coché
  let longDay = null;
  if (n >= 2) { longDay = sorted.includes(6) ? 6 : sorted.includes(0) ? 0 : sorted[n - 1]; plan[longDay] = 'Sortie longue'; }
  // 2) Fractionné : uniquement phase développement/spécifique, loin de la sortie longue
  if ((phase === 'build' || phase === 'specific' || phase === 'dev') && n >= 4) {
    const cand = sorted.filter(d => !plan[d] && (longDay == null || Math.abs(pos(d) - pos(longDay)) >= 2));
    const pick = cand.find(d => d === 2 || d === 3);
    const chosen = pick != null ? pick : cand[0];
    if (chosen != null) plan[chosen] = 'Fractionné';
  }
  // 3) Musculation : cible selon le nombre de jours, en évitant la veille de la sortie longue
  const strengthTarget = n >= 6 ? 3 : n >= 3 ? 2 : 1;
  const dayBeforeLong = longDay == null ? null : [...sorted].reverse().find(d => pos(d) < pos(longDay));
  let placed = 0;
  for (const d of sorted) { if (plan[d] || placed >= strengthTarget) continue; if (d === dayBeforeLong && sorted.filter(x => !plan[x]).length > strengthTarget - placed) continue; plan[d] = 'Musculation'; placed++; }
  for (const d of sorted) { if (plan[d] || placed >= strengthTarget) continue; plan[d] = 'Musculation'; placed++; }
  // 4) Le reste : course facile
  for (const d of sorted) { if (!plan[d]) plan[d] = 'Course'; }
  // 5) Lissage : jamais deux jours durs consécutifs (une muscu redevient course facile)
  for (let i = 1; i < n; i++) {
    const a = sorted[i - 1], b = sorted[i];
    if (adjacent(a, b) && isHard(plan[a]) && isHard(plan[b])) {
      if (plan[b] === 'Musculation') plan[b] = 'Course';
      else if (plan[a] === 'Musculation') plan[a] = 'Course';
    }
  }
  return sorted.map(d => ({ weekday: d, type: plan[d] }));
}

// ---- Compléments & ravitaillement (nutrition sportive, repères généraux) ----
// Cible protéique quotidienne (g/kg selon l'objectif). Repère, pas une prescription.
function proteinTarget(weightKg, goal) {
  const kg = Number(weightKg) || 75;
  const perKg = goal === 'force' ? 1.9 : goal === 'trail' ? 1.6 : 1.8;
  return { perKg, gramsPerDay: Math.round(kg * perKg / 5) * 5 };
}

// Générateur de repas à partir du frigo (pantry) et de l'envie du jour.
// pantry = aliments possédés [{n,cat,kcal,p,c,f}]. opts : { style, anchor, seed, count }.
// style ∈ 'equilibre'|'leger'|'proteine'|'reconfort'. anchor = texte (« poulet ») qui
// ancre un aliment du frigo. Renvoie des repas {items[{name,grams,kcal,p}], totalKcal,
// totalP, missing[]}. Utilise UNIQUEMENT ce qui est dans le frigo ; signale ce qui manque.
const MEAL_PORTIONS = { P: 130, F: 180, L: 170, R: 120, D: 150, G: 15 };
const MEAL_STYLES = {
  equilibre: { F: 180, L: 170, extra: ['D'], pMul: 1 },
  leger: { F: 120, L: 220, extra: ['R'], pMul: 1 },
  proteine: { F: 150, L: 150, extra: ['D'], pMul: 1.4 },
  reconfort: { F: 220, L: 130, extra: ['G'], pMul: 1 }
};
function mealMacro(food, grams) {
  const at = k => (food && food[k] != null ? food[k] : 0) * grams / 100;
  return { name: food.n, grams, kcal: Math.round((food.kcal || 0) * grams / 100), p: Math.round(at('p')) };
}
function generateMeals(pantry, opts) {
  opts = opts || {};
  const st = MEAL_STYLES[opts.style] || MEAL_STYLES.equilibre;
  const seed = Number(opts.seed) || 0;
  const count = Math.max(1, Math.min(4, Number(opts.count) || 3));
  const list = Array.isArray(pantry) ? pantry.filter(x => x && x.cat) : [];
  const byCat = {}; list.forEach(x => { (byCat[x.cat] = byCat[x.cat] || []).push(x); });
  const norm = s => String(s || '').toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const anchor = opts.anchor ? list.find(x => norm(x.n).includes(norm(opts.anchor))) : null;
  const pick = (cat, i) => { const a = byCat[cat]; if (!a || !a.length) return null; return a[i % a.length]; };
  const meals = [];
  for (let m = 0; m < count; m++) {
    const i = seed + m, items = [], missing = [];
    // protéine (ancre prioritaire si sa catégorie est P, sinon on l'ajoute en plus)
    let p = pick('P', i);
    if (anchor && anchor.cat === 'P') p = anchor;
    if (p) items.push(mealMacro(p, Math.round(MEAL_PORTIONS.P * st.pMul))); else missing.push('une protéine');
    // féculent
    const f = (anchor && anchor.cat === 'F') ? anchor : pick('F', i);
    if (f) items.push(mealMacro(f, st.F)); else missing.push('un féculent');
    // légume
    const l = (anchor && anchor.cat === 'L') ? anchor : pick('L', i);
    if (l) items.push(mealMacro(l, st.L)); else missing.push('un légume');
    // extra selon le style (laitier / fruit / gras)
    (st.extra || []).forEach(cat => { const e = pick(cat, i); if (e) items.push(mealMacro(e, MEAL_PORTIONS[cat] || 100)); });
    // ancre d'une autre catégorie non déjà incluse
    if (anchor && !items.some(it => it.name === anchor.n)) items.push(mealMacro(anchor, MEAL_PORTIONS[anchor.cat] || 120));
    if (!items.length) continue;
    const totalKcal = items.reduce((a, it) => a + it.kcal, 0);
    const totalP = items.reduce((a, it) => a + it.p, 0);
    meals.push({ items, totalKcal, totalP, missing });
  }
  return meals;
}

// Liste de courses : à partir du frigo + de l'envie du jour, propose des aliments
// concrets à acheter pour les catégories que l'envie demande mais qui manquent au
// frigo (P/F/L + l'extra du style). Renvoie [{cat, label, grams, suggestions[]}]. Pur.
const SHOP_LABELS = { P: 'Protéine', F: 'Féculent', L: 'Légume', R: 'Fruit', D: 'Produit laitier', G: 'Gourmandise' };
const SHOPPING_STAPLES = {
  P: ['Poulet (blanc/filet)', 'Œufs', 'Thon au naturel', 'Steak haché 5%'],
  F: ['Riz', 'Pâtes complètes', 'Pain complet', 'Pommes de terre'],
  L: ['Brocoli', 'Courgettes', 'Carottes', 'Haricots verts'],
  R: ['Pommes', 'Bananes', 'Oranges', 'Fruits rouges'],
  D: ['Yaourt nature', 'Fromage blanc', 'Skyr'],
  G: ['Chocolat noir', 'Amandes', 'Miel']
};
function buildShoppingList(pantry, opts) {
  opts = opts || {};
  const st = MEAL_STYLES[opts.style] || MEAL_STYLES.equilibre;
  const count = Math.max(1, Math.min(4, Number(opts.count) || 3));
  const list = Array.isArray(pantry) ? pantry.filter(x => x && x.cat) : [];
  const have = {}; list.forEach(x => { have[x.cat] = true; });
  const needed = ['P', 'F', 'L'].concat(st.extra || []);
  const items = [], seen = {};
  needed.forEach(cat => {
    if (seen[cat] || have[cat]) return;
    seen[cat] = true;
    items.push({
      cat,
      label: SHOP_LABELS[cat] || cat,
      grams: Math.round((MEAL_PORTIONS[cat] || 100) * count),
      suggestions: (SHOPPING_STAPLES[cat] || []).slice(0, 3)
    });
  });
  return items;
}

// Timing des compléments AVANT / PENDANT / APRÈS selon le type de séance.
// Contenu = repères de nutrition sportive courants (pas un avis médical).
function supplementTiming(kind) {
  const K = {
    muscu: {
      title: 'Musculation',
      avant: ['Repas normal 1,5–2 h avant. Pas besoin de whey avant.', 'Bois de l’eau, arrive hydraté.'],
      pendant: ['Eau. Électrolytes inutiles pour une séance courte en intérieur.'],
      apres: ['1 dose de whey (~25–30 g) dans les 2 h + une source de glucides (fruit, riz, pain).']
    },
    'course-courte': {
      title: 'Course facile (< 1 h)',
      avant: ['Pas de whey juste avant (digestion). Si tu pars à jeun depuis longtemps : une banane ou une petite collation glucidique.', 'Hydrate-toi.'],
      pendant: ['De l’eau suffit sous ~1 h en conditions tempérées. Électrolytes optionnels.'],
      apres: ['Réhydrate. Whey utile seulement si le prochain repas est loin ou si tu enchaînes de la muscu.']
    },
    'sortie-longue': {
      title: 'Sortie longue (> 1 h 30)',
      avant: ['Repas riche en glucides 2–3 h avant. PAS de shake de whey juste avant (troubles digestifs).', 'Hydrate + un peu de sodium si le départ est chaud.'],
      pendant: ['Électrolytes : 400–600 ml/h et 300–600 mg de sodium/h.', 'Glucides 30–60 g/h sur les très longues (gel, fruits secs, boisson).', 'Teste tout à l’entraînement, jamais le jour J.'],
      apres: ['Réhydrate avec du sodium.', 'Whey (~25–30 g) + glucides dans les 2 h pour la récupération.']
    },
    chaleur: {
      title: 'Course par forte chaleur',
      avant: ['Pré-hydrate : ~500 ml + du sodium 1–2 h avant. Pars déjà bien hydraté et au frais.'],
      pendant: ['Bois avant d’avoir soif : 600–800 ml/h, sodium 800–1000 mg/h.', 'Rafraîchis-toi (nuque, avant-bras), ralentis l’allure.'],
      apres: ['Réhydrate généreusement avec du sodium (pèse-toi avant/après pour estimer les pertes).', 'Whey + glucides pour la récupération.']
    }
  };
  return K[kind] || K.muscu;
}

// Plan d'hydratation/sodium par heure d'effort selon la température (°C).
// Fourchettes larges volontaires : à ajuster à la transpiration et à la tolérance.
function hydrationPlan(tempC) {
  const t = Number(tempC);
  if (t >= 30) return { level: 'Très chaud', fluidMlPerH: [600, 800], sodiumMgPerH: [800, 1000], note: 'Chaleur forte : bois avant d’avoir soif, monte le sodium, cherche l’ombre et rafraîchis-toi (nuque, avant-bras). Pars déjà bien hydraté.' };
  if (t >= 25) return { level: 'Chaud', fluidMlPerH: [500, 700], sodiumMgPerH: [600, 800], note: 'Il fait chaud : anticipe l’hydratation dès le départ et sale davantage ta boisson.' };
  if (t >= 15) return { level: 'Tempéré', fluidMlPerH: [400, 600], sodiumMgPerH: [400, 600], note: 'Conditions confortables : hydrate-toi régulièrement par petites gorgées.' };
  return { level: 'Frais', fluidMlPerH: [350, 500], sodiumMgPerH: [300, 500], note: 'Frais : on boit moins spontanément — garde quand même un apport régulier.' };
}

// Bilan chiffré d'une semaine (lundi YYYY-MM-DD) : sport, focus, sommeil, révision.
// Pur et testable. Utilisé par l'export PDF hebdo (Vague 4.2).
function weeklySummary(state, mondayKey) {
  const s = state || {};
  const start = new Date(`${mondayKey}T00:00:00`);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const inWeek = d => { if (typeof d !== 'string') return false; const t = new Date(`${d}T12:00:00`); return t >= start && t < end; };
  const workouts = (Array.isArray(s.workouts) ? s.workouts : []).filter(w => w && inWeek(w.date));
  const sessions = workouts.length;
  const minutes = workouts.reduce((a, w) => a + (Number(w.duration) || 0), 0);
  const km = workouts.filter(w => w.type === 'run').reduce((a, w) => a + (Number(w.distance) || 0), 0);
  const load = workouts.reduce((a, w) => a + (Number(w.duration) || 0) * (Number(w.effort) || 2), 0);
  const focusMin = (Array.isArray(s.focusSessions) ? s.focusSessions : []).filter(f => f && inWeek(f.date)).reduce((a, f) => a + (Number(f.minutes) || 0), 0);
  const rec = (Array.isArray(s.recovery) ? s.recovery : []).filter(r => r && inWeek(r.date));
  const sleepAvg = rec.length ? rec.reduce((a, r) => a + (Number(r.sleep) || 0), 0) / rec.length : 0;
  const study = (Array.isArray(s.agenda) ? s.agenda : []).filter(a => a && a.kind === 'study' && inWeek(a.date));
  const studyDone = study.filter(a => a.completed).length;
  return {
    mondayKey, sessions, minutes, km: Math.round(km * 10) / 10, load,
    focusMin, sleepAvg: Math.round(sleepAvg * 10) / 10,
    studyPlanned: study.length, studyDone
  };
}

// Calcul pur de la prescription d'un exercice (unité, repos, durée estimée).
// `source` = fiche de la bibliothèque (ou undefined) ; injectée pour rester testable
// sans dépendre du global `exercises`. app.js fournit le lookup.
function prescriptionFor(x, source) {
  x = x || {};
  const unit = x.unit || source?.unit || 'reps';
  const rest = Number(x.rest ?? source?.rest ?? (source?.family === 'conditioning' ? 30 : source?.family === 'core' ? 45 : 75));
  const sets = Number(x.sets) || 0, reps = Number(x.reps) || 0;
  const workSeconds = unit === 'sec' ? sets * reps : unit === 'pas' ? sets * reps : sets * reps * (source?.family === 'conditioning' ? 2.5 : 4);
  const minutes = Math.max(1, Math.round((workSeconds + Math.max(0, sets - 1) * rest) / 60));
  return { unit, rest, minutes };
}
function formatFor(x, source) { x = x || {}; const p = prescriptionFor(x, source); return `${x.sets || '?'}×${x.reps || '?'} ${p.unit}`; }

// Lundi 00:00 d'une date quelconque (semaine ISO, lundi = début).
function mondayOf(date) { const x = new Date(date); const day = x.getDay() || 7; x.setDate(x.getDate() - day + 1); x.setHours(0, 0, 0, 0); return x; }

// Agrège des enregistrements datés par semaine, sur les N dernières semaines.
// options : {weeks=8, now, dateField='date', value=r=>1, mode='sum'|'avg'|'count'}
// Renvoie [{weekKey, total}] (plus ancien → plus récent), aligné sur les lundis.
function weeklyAggregate(records, options) {
  const o = options || {};
  const weeks = Math.max(1, Math.min(52, Number(o.weeks) || 8));
  const now = o.now instanceof Date ? o.now : new Date();
  const value = typeof o.value === 'function' ? o.value : () => 1;
  const mode = o.mode || 'sum';
  const dateField = o.dateField || 'date';
  const currentMonday = mondayOf(now);
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) { const ws = new Date(currentMonday); ws.setDate(ws.getDate() - i * 7); buckets.push({ key: dateKey(ws), values: [] }); }
  const firstKey = buckets[0].key;
  (Array.isArray(records) ? records : []).forEach(r => {
    if (!r || typeof r[dateField] !== 'string' || r[dateField] < firstKey) return;
    const monday = dateKey(mondayOf(new Date(`${r[dateField]}T12:00:00`)));
    const bucket = buckets.find(b => b.key === monday);
    if (bucket) bucket.values.push(Number(value(r)) || 0);
  });
  return buckets.map(b => {
    let total = 0;
    if (mode === 'count') total = b.values.length;
    else if (mode === 'avg') total = b.values.length ? b.values.reduce((a, x) => a + x, 0) / b.values.length : 0;
    else total = b.values.reduce((a, x) => a + x, 0);
    return { weekKey: b.key, total: Math.round(total * 10) / 10 };
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { localDate, dateKey, weekStart, pct, levelFromXp, xpWithinLevel, computeStreak, normalizeAgendaItem, AGENDA_KINDS, AGENDA_SOURCES, AGENDA_PRIORITIES, priorityRank, normalizeTodo, todosForDay, normalizeBirthday, birthdaysForDay, upcomingBirthdays, normalizeRecurring, recurrenceMatches, RECUR_FREQ, normalizeHabit, habitStreak, habitsForDay, icsEscape, buildIcs, buildRRuleLine, parseIcs, parseRRule, planStudySessions, mergePlannedEvents, todayItems, weekItems, glcPlanningToEvents, prescriptionFor, formatFor, mondayOf, weeklyAggregate, weeklySummary, RACE_PRESETS, weeksBetween, racePhase, raceGoalStatus, RACE_LADDER, intermediateGoals, proteinTarget, hydrationPlan, buildWeekPlan, volumeRamp, warmupFor, supplementTiming, generateMeals, MEAL_STYLES, buildShoppingList, SHOPPING_STAPLES };
}
