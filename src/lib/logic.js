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
// Cycle des modes de thème : auto → clair → sombre → auto. Pur + testé.
function nextThemeMode(current) { const order = ['auto', 'light', 'dark']; const i = order.indexOf(current); return order[(i + 1) % order.length]; }
// Thème effectif ('light'|'dark') selon le mode choisi et la préférence système. Pur + testé.
function resolveTheme(mode, systemDark) { if (mode === 'light') return 'light'; if (mode === 'dark') return 'dark'; return systemDark ? 'dark' : 'light'; }

// Clé de date YYYY-MM-DD pour une date quelconque.
function dateKey(d) { const x = new Date(d), offset = x.getTimezoneOffset(); return new Date(x - offset * 6e4).toISOString().slice(0, 10); }

// Lundi 00:00 de la semaine courante.
function weekStart() { const d = new Date(); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); d.setHours(0, 0, 0, 0); return d; }

// Pourcentage borné à 100 (0 si pas d'objectif).
function pct(value, goal) { return goal > 0 ? Math.min(100, Math.round(value / goal * 100)) : 0; }

// Niveau à partir de l'XP (100 XP = 1 niveau).
function levelFromXp(xp) { return Math.floor((Number(xp) || 0) / 100) + 1; }
// Détecte une montée de niveau entre deux totaux d'XP : nouveau niveau si supérieur, sinon null. Pur + testé.
function leveledUp(oldXp, newXp) { const a = levelFromXp(oldXp), b = levelFromXp(newXp); return b > a ? b : null; }

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

// Paliers de série (gamification). Prochain palier strictement au-dessus de la série actuelle :
// { milestone, remaining } ou null si le dernier palier est atteint. Pur + testé.
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365];
function nextStreakMilestone(current) {
  const c = Math.max(0, Math.round(Number(current) || 0));
  const next = STREAK_MILESTONES.find(m => m > c);
  return next == null ? null : { milestone: next, remaining: next - c };
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
    paused: Boolean(x.paused),
    doneLog: Array.isArray(x.doneLog) ? x.doneLog.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [],
    skipLog: Array.isArray(x.skipLog) ? x.skipLog.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [],
    rule: {
      freq: RECUR_FREQ.includes(r.freq) ? r.freq : 'weekly',
      interval: Math.max(1, Math.min(52, Math.round(Number(r.interval) || 1))),
      weekdays: Array.isArray(r.weekdays) ? r.weekdays.map(Number).filter(n => n >= 0 && n <= 6) : [],
      startDate: isDate(r.startDate) ? r.startDate : '',
      until: isDate(r.until) ? r.until : ''
    }
  };
}

// Un récurrent a-t-il une occurrence ce jour-là ? (non en pause, jour non sauté,
// et la règle correspond). Pur + testé.
function recurringOccurs(rec, dateKey) {
  const r = normalizeRecurring(rec);
  if (r.paused) return false;
  if (r.skipLog.includes(dateKey)) return false;
  return recurrenceMatches(r.rule, dateKey);
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

// Record de série : la plus longue suite d'occurrences prévues consécutives réalisées,
// sur tout l'historique (du 1er jour validé jusqu'à aujourd'hui). Pur + testé.
function habitBestStreak(habit, todayKey) {
  const h = normalizeHabit(habit);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || '')); if (!m) return 0;
  const logs = h.log.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
  if (!logs.length) return 0;
  const done = new Set(logs);
  const wds = h.weekdays.length ? new Set(h.weekdays) : new Set([0, 1, 2, 3, 4, 5, 6]);
  const pad = n => String(n).padStart(2, '0');
  const key = x => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  const f = logs[0].split('-').map(Number);
  let d = new Date(f[0], f[1] - 1, f[2]); d.setHours(0, 0, 0, 0);
  const end = new Date(+m[1], +m[2] - 1, +m[3]); end.setHours(0, 0, 0, 0);
  let cur = 0, best = 0, guard = 0;
  while (d <= end && guard++ < 3660) {
    if (wds.has(d.getDay())) { if (done.has(key(d))) { cur++; if (cur > best) best = cur; } else cur = 0; }
    d.setDate(d.getDate() + 1);
  }
  return best;
}

// Frise des 7 derniers jours (ancien→récent) d'une habitude :
// [{key, dow, scheduled, done}] — scheduled = jour prévu, done = validé ce jour-là.
function habitWeekMap(habit, todayKey) {
  const h = normalizeHabit(habit);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || '')); if (!m) return [];
  const done = new Set(h.log);
  const wds = h.weekdays.length ? new Set(h.weekdays) : new Set([0, 1, 2, 3, 4, 5, 6]);
  const pad = n => String(n).padStart(2, '0');
  const key = x => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const k = key(d);
    out.push({ key: k, dow: d.getDay(), scheduled: wds.has(d.getDay()), done: done.has(k) });
  }
  return out;
}

// Première zone prioritaire non travaillée (couverture 0) parmi `zones`, sinon null. Pur + testé.
function neglectedZone(coverage, zones) {
  const cov = coverage && typeof coverage === 'object' ? coverage : {};
  const list = Array.isArray(zones) && zones.length ? zones : ['abs', 'legs', 'back', 'arms', 'chest', 'shoulders', 'glutes'];
  for (const z of list) { if (!cov[z]) return z; }
  return null;
}

// Habitudes prévues un jour donné → [{id, name, xp, done, streak, best}].
function habitsForDay(habits, todayKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || '')); if (!m) return [];
  const wd = new Date(+m[1], +m[2] - 1, +m[3]).getDay();
  return (Array.isArray(habits) ? habits : []).map(normalizeHabit)
    .filter(h => !h.weekdays.length || h.weekdays.includes(wd))
    .map(h => ({ id: h.id, name: h.name, xp: h.xp, done: h.log.includes(todayKey), streak: habitStreak(h, todayKey), best: habitBestStreak(h, todayKey) }));
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
    location: typeof x.location === 'string' ? x.location.slice(0, 120) : '',
    notes: typeof x.notes === 'string' ? x.notes.slice(0, 500) : '',
    travelMin: Math.max(0, Math.min(600, Math.round(Number(x.travelMin) || 0))),
    workout: Array.isArray(x.workout) ? x.workout.filter(n => typeof n === 'string' && n).slice(0, 12) : undefined,
    completed: Boolean(x.completed)
  };
}

// Copie un événement d'agenda : nouvel id, repart "à faire", détaché d'un éventuel
// créneau planifié (planId). `targetDate` (YYYY-MM-DD) déplace la copie ; sinon même jour.
function duplicateAgendaItem(item, newId, targetDate) {
  if (!item || typeof item !== 'object') return null;
  const copy = { ...item };
  copy.id = Number(newId) || Date.now();
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(targetDate || ''))) copy.date = targetDate;
  copy.completed = false;
  delete copy.planId;
  delete copy.recId;
  delete copy.refId;
  return copy;
}

// Heure de départ conseillée pour un événement horodaté avec un temps de trajet.
// Renvoie {departAt:'HH:MM', travelMin, leaveInMin|null (min avant de partir si `now`
// est un Date)} ; `late` = déjà l'heure de partir. null si pas d'heure ou pas de trajet.
function departureInfo(item, now) {
  if (!item || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(item.time || ''))) return null;
  const travel = Math.round(Number(item.travelMin) || 0);
  if (travel <= 0) return null;
  const [h, m] = item.time.split(':').map(Number);
  const depMin = h * 60 + m - travel;
  const pad = n => String(n).padStart(2, '0');
  const wrapped = ((depMin % 1440) + 1440) % 1440;
  const departAt = `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
  let leaveInMin = null;
  if (now instanceof Date) leaveInMin = depMin - (now.getHours() * 60 + now.getMinutes());
  return { departAt, travelMin: travel, leaveInMin, late: leaveInMin != null && leaveInMin < 0 };
}

// Texte partageable d'une journée : une ligne par item (heure + titre + ✓ si fait),
// hors anniversaires. Pur + testé.
function dayPlanText(items) {
  return (Array.isArray(items) ? items : [])
    .filter(it => it && it.type !== 'birthday')
    .map(it => {
      const t = it.allDay ? 'Journée' : (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(it.time || '')) ? it.time : '—');
      return `- ${t} ${String(it.title || '').trim()}${it.completed ? ' ✓' : ''}`;
    })
    .join('\n');
}

// Total de minutes planifiées dans une liste d'items : créneaux horodatés (HH:MM),
// hors « journée entière » et anniversaires. Somme des durées (défaut 60 min). Pur + testé.
function dayPlannedMinutes(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, it) => {
    if (!it || it.allDay || it.type === 'birthday') return sum;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(it.time || ''))) return sum;
    return sum + Math.max(0, Math.round(Number(it.durationMin) || 60));
  }, 0);
}

// Minute (depuis minuit) à laquelle ancrer un rappel : l'heure de départ si un trajet
// est renseigné (heure − trajet), sinon l'heure de l'événement. null si pas d'heure valide.
// Bornée au même jour (pas de passage à la veille). Pur + testé.
function reminderAnchorMinutes(item) {
  if (!item || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(item.time || ''))) return null;
  const [h, m] = item.time.split(':').map(Number);
  const travel = Math.max(0, Math.min(600, Math.round(Number(item.travelMin) || 0)));
  return Math.max(0, h * 60 + m - travel);
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

// Hôte privé / loopback / lien-local → interdit pour un abonnement calendrier
// (garde-fou anti-SSRF : on ne fetch que des hôtes publics). Pur.
function isPrivateHost(host) {
  const h = String(host || '').toLowerCase().replace(/\.$/, '');
  if (!h || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h.startsWith('[') || h.includes(':')) return true; // littéral IPv6 → refusé
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const a = +m[1], b = +m[2];
    if ([a, b, +m[3], +m[4]].some(n => n > 255)) return true;
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a >= 224) return true; // multicast/réservé
  }
  return false;
}

// Valide/normalise une URL d'abonnement calendrier : HTTPS uniquement
// (webcal:// → https://), hôtes publics seulement. Renvoie l'URL https ou '' si refusée.
function normalizeCalendarUrl(input) {
  let s = String(input || '').trim();
  if (!s) return '';
  if (/^webcal:\/\//i.test(s)) s = s.replace(/^webcal:\/\//i, 'https://');
  if (!/^https:\/\//i.test(s)) { if (/^\w+:\/\//.test(s)) return ''; s = 'https://' + s; }
  let u; try { u = new URL(s); } catch { return ''; }
  if (u.protocol !== 'https:' || !u.hostname || isPrivateHost(u.hostname)) return '';
  return u.toString();
}

// --- Vague S.8 : trajet auto (géocodage Nominatim + itinéraire OSRM, sans clé) ---
// Hôtes publics ALLOWLISTÉS — aucun autre hôte n'est contactable pour le trajet.
const TRAVEL_HOSTS = ['nominatim.openstreetmap.org', 'router.project-osrm.org'];

// Valide une URL de trajet : HTTPS + hôte exactement dans l'allowlist + public
// (réutilise isPrivateHost). Renvoie l'URL normalisée, ou '' si refusée. Pur.
function isAllowedTravelUrl(input) {
  let u; try { u = new URL(String(input || '')); } catch { return ''; }
  if (u.protocol !== 'https:' || !u.hostname || isPrivateHost(u.hostname)) return '';
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  return TRAVEL_HOSTS.includes(h) ? u.toString() : '';
}

// URL de géocodage Nominatim (1 résultat). Pur. '' si requête vide.
function buildGeocodeUrl(query) {
  const q = String(query || '').trim();
  if (!q) return '';
  return 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=1&q=' + encodeURIComponent(q);
}

// URL d'itinéraire OSRM (profil voiture) entre deux points {lat, lon}. Pur. '' si coords invalides.
function buildRouteUrl(from, to) {
  if (!from || !to) return '';
  const n = v => (Number.isFinite(Number(v)) ? Number(v) : null);
  const a = [n(from.lon), n(from.lat)], b = [n(to.lon), n(to.lat)];
  if (a.concat(b).some(v => v == null)) return '';
  return `https://router.project-osrm.org/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=false&alternatives=false&steps=false`;
}

// Distance à vol d'oiseau (km) entre deux points {lat, lon} — repli si l'itinéraire échoue. Pur.
function haversineKm(from, to) {
  if (!from || !to) return null;
  const lat1 = Number(from.lat), lon1 = Number(from.lon), lat2 = Number(to.lat), lon2 = Number(to.lon);
  if ([lat1, lon1, lat2, lon2].some(v => !Number.isFinite(v))) return null;
  const R = 6371, rad = d => d * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// À partir de la distance routière (m) et de la durée voiture (s) d'OSRM, dérive un
// temps par mode : voiture = durée réelle ; vélo ~15 km/h, marche ~5 km/h sur la
// distance routière. Renvoie des entiers de minutes (min. 1 dès qu'il y a une distance). Pur.
function travelModes(distanceM, driveSec) {
  const km = Math.max(0, Number(distanceM) || 0) / 1000;
  const drive = Math.max(0, Number(driveSec) || 0);
  const at = kmh => (km > 0 ? Math.max(1, Math.round((km / kmh) * 60)) : 0);
  return {
    distanceKm: Math.round(km * 10) / 10,
    driving: drive > 0 ? Math.max(1, Math.round(drive / 60)) : at(50),
    cycling: at(15),
    walking: at(5)
  };
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
    location: typeof a.location === 'string' ? a.location : '', notes: typeof a.notes === 'string' ? a.notes : '', travelMin: Math.max(0, Math.round(Number(a.travelMin) || 0)),
    workout: Array.isArray(a.workout) && a.workout.length ? a.workout.slice(0, 12) : null,
    durationMin: Math.max(0, Math.round(Number(a.durationMin) || 0)),
    type: a.planId ? 'plan' : (a.kind === 'study' ? 'study' : 'agenda')
  }));
  const seen = new Set(items.filter(i => i.planId).map(i => i.planId));
  plans.filter(p => !seen.has(p.id)).forEach(p => items.push({ id: p.id, time: p.time || '', title: `Séance · ${p.type}`, kind: 'sport', priority: 'normal', allDay: false, completed: false, planId: p.id, type: 'plan' }));
  // Anniversaires (récurrents chaque année, non validables)
  birthdaysForDay(s.birthdays, date).forEach(b => items.push({ id: 'bday-' + b.id, time: '', title: `🎂 ${b.name}${b.age != null ? ` (${b.age} ans)` : ''}`, kind: 'birthday', priority: 'normal', allDay: true, completed: false, planId: null, type: 'birthday' }));
  // Événements récurrents : occurrence du jour, validable (doneLog par date)
  (Array.isArray(s.recurring) ? s.recurring : []).map(normalizeRecurring).forEach(r => {
    if (recurringOccurs(r, date)) items.push({ id: 'rec-' + r.id, time: r.time || '', title: r.title, kind: r.kind, priority: r.priority, allDay: !r.time, completed: r.doneLog.includes(date), planId: null, type: 'recurring', recId: r.id, recurring: true });
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

// Série de jours calendaires consécutifs présents dans l'ensemble, en terminant
// aujourd'hui (grâce : si aujourd'hui est absent, on part d'hier pour ne pas casser
// la série en cours de journée). dateKeys : liste de 'YYYY-MM-DD'. Pur + testé.
function dailyStreak(dateKeys, todayKey) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return 0;
  const set = new Set((Array.isArray(dateKeys) ? dateKeys : []).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(String(k))));
  if (!set.size) return 0;
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const cur = new Date(+t[1], +t[2] - 1, +t[3]); cur.setHours(0, 0, 0, 0);
  if (!set.has(keyOf(cur))) cur.setDate(cur.getDate() - 1);   // grâce : aujourd'hui encore vide
  let streak = 0;
  while (set.has(keyOf(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  return streak;
}

// Ratio charge aiguë:chronique (ACWR) — indicateur de risque de surmenage.
// aiguë = charge des 7 derniers jours ; chronique = moyenne hebdo sur 28 jours.
// charge d'une séance = durée × effort (RPE). workouts : [{date, duration, effort}].
// Retourne {acute, chronic, ratio, zone} ou null si pas de charge chronique. Pur + testé.
function acuteChronicRatio(workouts, todayKey) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return null;
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  const load = w => (Number(w.duration) || 0) * (Number(w.effort) || 2);
  let acute = 0, chronic28 = 0;
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w && w.date || ''));
    if (!m) return;
    const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
    const days = Math.round((today - d) / 86400000);
    if (days < 0 || days > 27) return;
    const l = load(w);
    chronic28 += l;
    if (days <= 6) acute += l;
  });
  const chronic = chronic28 / 4;
  if (!(chronic > 0)) return null;
  const ratio = Math.round((acute / chronic) * 100) / 100;
  const zone = ratio < 0.8 ? 'low' : ratio > 1.5 ? 'high' : 'optimal';
  return { acute: Math.round(acute), chronic: Math.round(chronic), ratio, zone };
}

// Recommandation de charge combinant l'ACWR (aiguë/chronique) et la forme du jour (readiness).
// acwr : sortie de acuteChronicRatio (ou null) ; readiness : sortie de readinessScore (ou null).
// Priorité au risque (surcharge ou forme basse → alléger). Renvoie { status, emoji, title, advice }. Pur + testé.
function loadAdvice(acwr, readiness) {
  const zone = acwr && acwr.zone;
  const score = readiness && Number.isFinite(readiness.score) ? readiness.score : null;
  const lowForm = score != null && score < 50;
  const highForm = score != null && score >= 75;
  if (zone === 'high') return { status: 'deload', emoji: '🟥', title: 'Allège cette semaine', advice: 'Ta charge récente a bondi (risque de blessure). Réduis le volume de 30–40 % pendant 5–7 jours, garde une technique propre, puis reprends.' };
  if (lowForm) return { status: 'ease', emoji: '🟧', title: 'Récupération d’abord', advice: 'Ta forme est basse (sommeil/fatigue/courbatures). Fais une séance courte et facile, ou du repos actif ; priorise le sommeil et les protéines.' };
  if (zone === 'optimal' && highForm) return { status: 'push', emoji: '🟩', title: 'Feu vert — pousse', advice: 'Charge maîtrisée et bonne forme : c’est le moment d’ajouter un peu (charge ou 1 série) sur les exercices clés.' };
  if (zone === 'low' && !lowForm) return { status: 'build', emoji: '🟦', title: 'Tu peux remonter le volume', advice: 'Ta charge récente est basse par rapport à ton habitude : ré-augmente progressivement (≤ 10 %/semaine) pour reconstruire la base.' };
  return { status: 'maintain', emoji: '🟨', title: 'Maintiens le cap', advice: 'Continue sur ta lancée : même volume, technique propre, 1–2 répétitions en réserve.' };
}

// Carte de régularité des séances (grille type GitHub), alignée lundi→dimanche par colonne.
// Retourne un tableau de w*7 jours { date, count, future } du plus ancien au plus récent. Pur + testé.
function trainingHeatmap(workouts, todayKey, weeks) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return [];
  const w = Math.max(1, Math.min(26, Math.round(Number(weeks) || 8)));
  const counts = {};
  (Array.isArray(workouts) ? workouts : []).forEach(x => { if (x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date || ''))) counts[x.date] = (counts[x.date] || 0) + 1; });
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  const start = new Date(today); const dow = (start.getDay() + 6) % 7; // 0 = lundi
  start.setDate(start.getDate() - dow - (w - 1) * 7);
  const out = [];
  for (let i = 0; i < w * 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); const key = keyOf(d); out.push({ date: key, count: counts[key] || 0, future: d > today }); }
  return out;
}

// Nombre de semaines (lundi→dimanche) consécutives avec au moins une séance,
// en terminant cette semaine. Si la semaine en cours est encore vide, on part de
// la semaine précédente (grâce) pour ne pas remettre à zéro en début de semaine.
function weeklyWorkoutStreak(workouts, todayKey) {
  if (!Array.isArray(workouts)) return 0;
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return 0;
  const pad = n => String(n).padStart(2, '0');
  const monKey = d => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = x.getDay() || 7;
    x.setDate(x.getDate() - day + 1);
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  };
  const weeks = new Set();
  for (const w of workouts) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w && w.date || ''));
    if (m) weeks.add(monKey(new Date(+m[1], +m[2] - 1, +m[3])));
  }
  if (!weeks.size) return 0;
  let cur = new Date(+t[1], +t[2] - 1, +t[3]);
  const day = cur.getDay() || 7;
  cur.setDate(cur.getDate() - day + 1);                 // lundi de la semaine courante
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (!weeks.has(keyOf(cur))) cur.setDate(cur.getDate() - 7); // grâce : semaine en cours vide
  let streak = 0;
  while (weeks.has(keyOf(cur))) { streak++; cur.setDate(cur.getDate() - 7); }
  return streak;
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
// Jours entre deux clés YYYY-MM-DD (de `fromKey` à `toKey`) — négatif si passé. Pur + testé.
function daysUntil(fromKey, toKey) {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fromKey || ''));
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(toKey || ''));
  if (!a || !b) return null;
  const da = new Date(+a[1], +a[2] - 1, +a[3]); da.setHours(0, 0, 0, 0);
  const db = new Date(+b[1], +b[2] - 1, +b[3]); db.setHours(0, 0, 0, 0);
  return Math.round((db - da) / 86400000);
}
// Échéances clés à venir dans l'horizon (jours) : examen + course, triées par proximité. Pur + testé.
function upcomingKeyDates(examGoal, raceGoal, todayKey, horizon) {
  const h = Math.max(1, Math.min(730, Math.round(Number(horizon) || 60)));
  const out = [];
  const add = (kind, label, date) => { const d = daysUntil(todayKey, date); if (d != null && d >= 0 && d <= h) out.push({ kind, label, daysLeft: d, date }); };
  if (examGoal && examGoal.date) add('exam', String(examGoal.title || 'Examen').slice(0, 40), examGoal.date);
  if (raceGoal && raceGoal.date) add('race', 'Course objectif', raceGoal.date);
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

// Marqueurs d'échéances clés tombant un jour donné (examen, course objectif). Pur + testé.
function keyDateMarkers(examGoal, raceGoal, dateKey) {
  const out = [];
  const isKey = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''));
  if (isKey && examGoal && examGoal.date === dateKey) out.push({ kind: 'exam', label: String(examGoal.title || 'Examen').slice(0, 40) });
  if (isKey && raceGoal && raceGoal.date === dateKey) out.push({ kind: 'race', label: 'Course' });
  return out;
}

// Statistiques de révision (agenda kind='study') : total, faites, à venir. Pur + testé.
function studyStats(agenda, todayKey) {
  const list = (Array.isArray(agenda) ? agenda : []).filter(a => a && a.kind === 'study');
  const done = list.filter(a => a.completed).length;
  const upcoming = list.filter(a => !a.completed && /^\d{4}-\d{2}-\d{2}$/.test(String(a.date || '')) && a.date >= todayKey).length;
  return { total: list.length, done, upcoming };
}

// Compte à rebours d'un examen : { daysLeft, weeksLeft, past, title, date } ou null si pas de date. Pur + testé.
function examCountdown(examGoal, todayKey) {
  const g = examGoal && typeof examGoal === 'object' ? examGoal : {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(g.date || ''))) return null;
  const d = daysUntil(todayKey, g.date);
  if (d == null) return null;
  return { daysLeft: d, weeksLeft: Math.round(d / 7), past: d < 0, title: String(g.title || 'Examen').slice(0, 60), date: g.date };
}
// Message de rappel d'examen si aujourd'hui est un palier (J-30/14/7/3/1/0), sinon null. Pur + testé.
function examReminderDue(examGoal, todayKey) {
  const c = examCountdown(examGoal, todayKey);
  if (!c || c.past) return null;
  if (![0, 1, 3, 7, 14, 30].includes(c.daysLeft)) return null;
  const when = c.daysLeft === 0 ? "c'est aujourd'hui !" : c.daysLeft === 1 ? "c'est demain !" : `dans ${c.daysLeft} jours`;
  return `📚 ${c.title} : ${when}`;
}

// Prochaine séance planifiée à venir (aujourd'hui non encore passée, ou plus tard).
// plans : [{id,date,time,type}] ; todayKey 'YYYY-MM-DD' ; nowMinutes = minutes depuis minuit.
function nextTrainingSession(plans, todayKey, nowMinutes) {
  if (!Array.isArray(plans)) return null;
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return null;
  const nowMin = Number.isFinite(nowMinutes) ? nowMinutes : -1;
  const toMin = t => {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t || ''));
    return m ? +m[1] * 60 + +m[2] : null;
  };
  const upcoming = plans
    .filter(p => p && isKey(p.date))
    .filter(p => {
      if (p.date > todayKey) return true;
      if (p.date < todayKey) return false;
      const min = toMin(p.time);      // même jour : garder si pas d'heure ou heure pas encore passée
      return min == null || min >= nowMin;
    })
    .sort((a, b) =>
      String(a.date).localeCompare(String(b.date)) ||
      String(a.time || '99:99').localeCompare(String(b.time || '99:99')));
  const next = upcoming[0];
  if (!next) return null;
  return { plan: next, daysLeft: daysUntil(todayKey, next.date) };
}
function raceGoalStatus(goal, now) {
  if (!goal || !goal.date) return null;
  const today = now instanceof Date ? dateKey(now) : (typeof now === 'string' ? now : localDate());
  const weeksLeft = weeksBetween(today, goal.date);
  const daysLeft = daysUntil(today, goal.date);
  const phase = racePhase(weeksLeft);
  const km = Number(goal.distanceKm) || 0;
  const peakLong = Math.min(300, Math.max(60, Math.round(km * 3)));
  const longRunMin = Math.round(peakLong * phase.longMul / 5) * 5;
  return {
    weeksLeft, daysLeft,
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

// Retour au calme spécifique selon le type de séance : mobilité douce + étirements
// tenus (~5 min) pour récupérer et entretenir la souplesse. Pas d'XP.
function cooldownFor(title) {
  const t = String(title || '').toLowerCase();
  if (/poussée|tirage|haut|traction|pompes|press|militaire/.test(t))
    return { label: 'Retour au calme haut du corps · ~5 min', moves: ['Étirement pectoraux au cadre de porte · 30 s/côté', 'Étirement dorsaux/lats, bras tendu · 30 s/côté', 'Étirement triceps derrière la tête · 30 s/côté', 'Rotations lentes du cou + respirations profondes · 1 min'] };
  if (/jambe|chaîne|squat|fessier|fente|mollet/.test(t))
    return { label: 'Retour au calme bas du corps · ~5 min', moves: ['Étirement quadriceps debout · 30 s/jambe', 'Étirement ischios, jambe tendue · 30 s/jambe', 'Étirement fléchisseurs de hanche (fente basse) · 30 s/côté', 'Étirement mollets au mur · 30 s/jambe'] };
  if (/trail|côte|course|puissance|longue|swing|explos|prévention/.test(t))
    return { label: 'Retour au calme trail/course · ~5 min', moves: ['Marche lente · 2 min pour faire redescendre le cardio', 'Étirement mollets + tendon d’Achille au mur · 30 s/jambe', 'Étirement ischios et fléchisseurs de hanche · 30 s/côté', 'Étirement fessiers (figure 4 au sol) · 30 s/côté'] };
  return { label: 'Retour au calme général · ~5 min', moves: ['Respiration lente : 4 s inspire / 6 s expire · 1 min', 'Étirement chaîne postérieure (mains vers les pieds) · 30 s', 'Mobilité douce hanches + épaules · 30 s/côté', 'Relâchement complet, allongé · 1 min'] };
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

// Nombre d'articles de la liste encore à acheter (non cochés). `checked` : { label: true }.
function remainingShopping(items, checked) {
  if (!Array.isArray(items)) return 0;
  const done = checked && typeof checked === 'object' ? checked : {};
  return items.filter(it => it && !done[it.label]).length;
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

// Texte partageable d'un bilan hebdomadaire (à partir de weeklySummary). Pur + testé.
function weeklySummaryText(sum) {
  const s = sum && typeof sum === 'object' ? sum : {};
  const n = v => Number(v) || 0;
  const lines = [`Bilan de la semaine${s.mondayKey ? ' du ' + String(s.mondayKey).split('-').reverse().join('/') : ''} :`];
  lines.push(`🏋️ ${n(s.sessions)} séance${n(s.sessions) > 1 ? 's' : ''} · ${n(s.minutes)} min${n(s.km) ? ` · ${s.km} km` : ''}`);
  if (n(s.focusMin)) lines.push(`🧠 ${n(s.focusMin)} min de focus`);
  if (n(s.studyPlanned)) lines.push(`📚 ${n(s.studyDone)}/${n(s.studyPlanned)} révisions validées`);
  if (n(s.sleepAvg)) lines.push(`😴 ${s.sleepAvg} h de sommeil moyen`);
  return lines.join('\n');
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

// --- Objectifs physiques par zone (demande d'Adrien : abdos/6-pack, bras, jambes…) ---
// Chaque exercice est tagué par les zones musculaires qu'il travaille, zone principale
// en premier (sert à classer les plus ciblés d'abord). Pur, testé.
const TRAINING_GOALS = [
  { id: 'abs', emoji: '🔥', label: 'Abdos (tablette)' },
  { id: 'arms', emoji: '💪', label: 'Bras (biceps & triceps)' },
  { id: 'chest', emoji: '🎯', label: 'Pectoraux' },
  { id: 'back', emoji: '🦅', label: 'Dos (largeur)' },
  { id: 'shoulders', emoji: '🏔️', label: 'Épaules' },
  { id: 'legs', emoji: '🦵', label: 'Jambes' },
  { id: 'glutes', emoji: '🍑', label: 'Fessiers' }
];
const EXERCISE_ZONES = {
  'Goblet squat kettlebell': ['legs', 'glutes'], 'Pompes inclinées': ['chest', 'arms', 'shoulders'],
  'Fentes arrière': ['legs', 'glutes'], 'Soulevé de terre kettlebell': ['back', 'glutes', 'legs'],
  'Step-up escalier': ['legs', 'glutes'], 'Gainage planche': ['abs'],
  'Pompes classiques': ['chest', 'arms', 'shoulders'], 'Pompes diamants': ['arms', 'chest'],
  'Pompes gilet lesté': ['chest', 'arms', 'shoulders'], 'Gainage latéral': ['abs'],
  'Kettlebell swing': ['glutes', 'back', 'legs'], 'Élévations mollets': ['legs'],
  'Mountain climbers': ['abs', 'legs'], 'Hollow hold': ['abs'], 'Bear crawl': ['abs', 'shoulders'],
  'Split squat bulgare': ['legs', 'glutes'], 'Marche fermier kettlebell': ['back', 'abs', 'shoulders'],
  'Dead bug': ['abs'], 'Step-down escalier': ['legs'],
  'Soulevé de terre une jambe kettlebell': ['glutes', 'legs', 'back'], 'Pont fessier': ['glutes'],
  'Relevés tibiaux au mur': ['legs'], 'Chaise au mur': ['legs'], 'Squat cosaque': ['legs'],
  'Pike push-up': ['shoulders', 'arms'], 'Rowing kettlebell un bras': ['back', 'arms'],
  'Développé militaire kettlebell': ['shoulders', 'arms'], 'Floor press kettlebell': ['chest', 'arms'],
  'Bird dog': ['abs', 'back'], 'Superman': ['back'], 'Tractions': ['back', 'arms'],
  'Tractions supination': ['arms', 'back'], 'Tractions négatives': ['back', 'arms'],
  'Rowing australien': ['back', 'arms'], 'Suspension barre': ['back', 'shoulders'],
  'Relevés de genoux suspendu': ['abs'], 'Pompes déficit': ['chest', 'arms', 'shoulders'],
  'Squat sauté': ['legs', 'glutes'], 'Fentes sautées': ['legs', 'glutes'],
  'Montées de genoux': ['legs', 'abs'], 'Sauts de cheville': ['legs'],
  'Pont fessier une jambe': ['glutes', 'legs'], 'Good morning kettlebell': ['back', 'glutes'],
  'Nordic curl': ['legs'], 'Turkish get-up kettlebell': ['abs', 'shoulders'],
  'Équilibre unipodal': ['legs'], 'Planche touches d’épaule': ['abs', 'shoulders']
};
function exerciseZones(name) { return EXERCISE_ZONES[name] || []; }
// Bascule un nom dans une liste de favoris : l'ajoute s'il est absent, le retire sinon.
// Renvoie une nouvelle liste (n'altère pas l'entrée). Ignore les noms vides. Pur + testé.
function toggleFavorite(favorites, name) {
  const list = (Array.isArray(favorites) ? favorites : []).filter(x => typeof x === 'string' && x);
  const n = typeof name === 'string' ? name.trim() : '';
  if (!n) return list.slice();
  return list.includes(n) ? list.filter(x => x !== n) : [...list, n];
}

// Liste des équipements (champ `kind`) présents dans la bibliothèque, avec le nombre d'exercices,
// triée par fréquence décroissante puis alphabétique. Pur + testé.
function equipmentOptions(exercises) {
  const counts = {};
  (Array.isArray(exercises) ? exercises : []).forEach(x => {
    const k = x && typeof x.kind === 'string' ? x.kind.trim() : '';
    if (!k) return;
    counts[k] = (counts[k] || 0) + 1;
  });
  return Object.entries(counts).map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind, 'fr'));
}
// Nombre de séries effectuées par groupe musculaire sur les 7 derniers jours.
// Compte les séries validées (completedSets) sinon les séries prévues (sets), par zone. Pur + testé.
function weeklySetsPerZone(workouts, todayKey) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return {};
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  const zones = {};
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w && w.date || '')); if (!m) return;
    const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
    const days = Math.round((today - d) / 86400000); if (days < 0 || days > 6) return;
    const exos = Array.isArray(w.exercises) && w.exercises.length ? w.exercises
      : (w.exercise ? [{ name: w.exercise, sets: w.sets, completedSets: w.completedSets }] : []);
    exos.forEach(ex => {
      if (!ex || !ex.name) return;
      const sets = Number(ex.completedSets) > 0 ? Number(ex.completedSets) : (Number(ex.sets) || 0);
      if (sets <= 0) return;
      exerciseZones(ex.name).forEach(z => { zones[z] = (zones[z] || 0) + sets; });
    });
  });
  return zones;
}
// Équilibre poussée/tirage sur une fenêtre (défaut 28 j) : séries de poussée (pectoraux+épaules)
// vs tirage (dos). Renvoie {push, pull, ratio, zone}. zone : balanced · push-heavy · pull-heavy ·
// no-pull · no-push. Null si aucune série de poussée ni tirage sur la période. Pur + testé.
function muscleBalance(workouts, todayKey, days) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return null;
  const win = Math.max(1, Math.round(Number(days) || 28));
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  let push = 0, pull = 0;
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w && w.date || '')); if (!m) return;
    const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
    const dd = Math.round((today - d) / 86400000); if (dd < 0 || dd > win - 1) return;
    const exos = Array.isArray(w.exercises) && w.exercises.length ? w.exercises
      : (w.exercise ? [{ name: w.exercise, sets: w.sets, completedSets: w.completedSets }] : []);
    exos.forEach(ex => {
      if (!ex || !ex.name) return;
      const sets = Number(ex.completedSets) > 0 ? Number(ex.completedSets) : (Number(ex.sets) || 0);
      if (sets <= 0) return;
      const zones = exerciseZones(ex.name);
      if (zones.includes('chest') || zones.includes('shoulders')) push += sets;
      if (zones.includes('back')) pull += sets;
    });
  });
  if (push === 0 && pull === 0) return null;
  const ratio = pull > 0 ? Math.round(push / pull * 100) / 100 : null;
  const zone = pull === 0 ? 'no-pull' : push === 0 ? 'no-push' : ratio > 1.5 ? 'push-heavy' : ratio < 0.67 ? 'pull-heavy' : 'balanced';
  return { push, pull, ratio, zone };
}

// Fraîcheur par groupe musculaire : jours depuis le dernier entraînement de chaque zone,
// et statut (prêt ≥ 2 j · récent < 2 j · jamais). Ordre fixe des 7 zones. Pur + testé.
function zoneFreshness(workouts, todayKey) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return [];
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  const last = {};
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w && w.date || '')); if (!m) return;
    const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
    if (d > today) return;
    const exos = Array.isArray(w.exercises) && w.exercises.length ? w.exercises : (w.exercise ? [{ name: w.exercise }] : []);
    exos.forEach(ex => { if (!ex || !ex.name) return; exerciseZones(ex.name).forEach(z => { if (last[z] == null || d > last[z]) last[z] = d; }); });
  });
  return ['abs', 'arms', 'chest', 'back', 'shoulders', 'legs', 'glutes'].map(z => {
    if (last[z] == null) return { zone: z, days: null, status: 'never' };
    const days = Math.round((today - last[z]) / 86400000);
    return { zone: z, days, status: days >= 2 ? 'ready' : 'recent' };
  });
}
// Suggère les groupes musculaires à privilégier aujourd'hui : reposés (≥ 2 j ou jamais)
// classés par priorité = repos (jours) + déficit vers le minimum hebdo (10 séries).
// Exclut les groupes travaillés récemment (< 2 j). Trié, plus prioritaire d'abord. Pur + testé.
function suggestTrainingFocus(workouts, todayKey) {
  const fresh = zoneFreshness(workouts, todayKey);
  const sets = weeklySetsPerZone(workouts, todayKey);
  return fresh.map(f => {
    const s = sets[f.zone] || 0;
    const rested = f.status === 'ready' || f.status === 'never';
    const deficit = Math.max(0, 10 - s);
    const days = f.days == null ? 7 : f.days;
    return { zone: f.zone, status: f.status, days: f.days, sets: s, deficit, rested, score: rested ? days + deficit : -1 };
  }).filter(z => z.score >= 0)
    .sort((a, b) => b.score - a.score || b.deficit - a.deficit || a.zone.localeCompare(b.zone, 'fr'));
}

// Repère d'hypertrophie pour un volume hebdo de séries : <10 à augmenter, 10-20 optimal, >20 élevé. Pur + testé.
function setLandmark(sets) {
  const s = Number(sets) || 0;
  if (s < 10) return { label: 'à augmenter', zone: 'low' };
  if (s <= 20) return { label: 'optimal', zone: 'ok' };
  return { label: 'volume élevé', zone: 'high' };
}
// Couverture des zones musculaires sur les 7 derniers jours : compte des exercices
// (top-level `exercise` + `exercises[]`) touchant chaque zone. workouts:[{date,exercise?,exercises?}]. Pur + testé.
function weeklyZoneCoverage(workouts, todayKey) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return {};
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  const zones = {};
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w && w.date || ''));
    if (!m) return;
    const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
    const days = Math.round((today - d) / 86400000);
    if (days < 0 || days > 6) return;
    const names = [];
    if (w.exercise) names.push(w.exercise);
    if (Array.isArray(w.exercises)) w.exercises.forEach(ex => { if (ex && ex.name) names.push(ex.name); });
    names.forEach(n => exerciseZones(n).forEach(z => { zones[z] = (zones[z] || 0) + 1; }));
  });
  return zones;
}
function goalMatch(name, zone) { return exerciseZones(name).indexOf(zone) !== -1; }
// Rang de ciblage : 0 = zone principale, 1 = secondaire… 99 = ne cible pas. Plus petit = plus ciblé.
function goalRank(name, zone) { const i = exerciseZones(name).indexOf(zone); return i < 0 ? 99 : i; }

// Meilleurs exercices d'une zone (les plus ciblés d'abord). Pur.
function zoneTopExercises(zone, n) {
  const names = Object.keys(EXERCISE_ZONES).filter(name => goalMatch(name, zone));
  names.sort((a, b) => goalRank(a, zone) - goalRank(b, zone) || a.localeCompare(b));
  return names.slice(0, Math.max(1, n || 5));
}
// Séances préconçues par envie de corps (lançables en guidé). Ordre = ordre d'affichage.
const BODY_GOALS = [
  { key: 'abs', title: 'Abdos béton', emoji: '🔥', zones: ['abs'], why: 'Tronc solide et gainage.' },
  { key: 'arms', title: 'Bras', emoji: '💪', zones: ['arms'], why: 'Biceps, triceps et poussée.' },
  { key: 'chest', title: 'Pectoraux', emoji: '🎯', zones: ['chest'], why: 'Poussée et pectoraux.' },
  { key: 'back', title: 'Dos largeur', emoji: '🦅', zones: ['back'], why: 'Dos et tirage.' },
  { key: 'shoulders', title: 'Épaules', emoji: '🏔️', zones: ['shoulders'], why: 'Épaules et galbe.' },
  { key: 'legs', title: 'Bas du corps', emoji: '🦵', zones: ['legs', 'glutes'], why: 'Jambes et fessiers.' },
  { key: 'fullbody', title: 'Full body', emoji: '⚡', zones: ['legs', 'back', 'chest', 'abs', 'shoulders'], why: 'Tout le corps en une séance.', spread: true },
];
// Compose une séance préconçue pour une envie de corps : les meilleurs exercices de la ou des zones,
// avec séries/reps de la bibliothèque. En mode `spread` (full body), prend une par zone en tournant.
// opts : { count=5 }. Null si clé inconnue. Pur + testé.
function bodyGoalWorkout(key, exercises, opts) {
  const g = BODY_GOALS.find(x => x.key === key);
  if (!g) return null;
  const list = Array.isArray(exercises) ? exercises : [];
  const n = Math.max(2, Math.min(8, Math.round((opts && opts.count) || 5)));
  let chosen;
  if (g.spread) {
    const byZone = g.zones.map(z => list.filter(x => x && x.name && exerciseZones(x.name).indexOf(z) !== -1)
      .sort((a, b) => goalRank(a.name, z) - goalRank(b.name, z) || a.name.localeCompare(b.name, 'fr')));
    const picked = [], seen = new Set();
    let round = 0, added = true;
    while (picked.length < n && added) {
      added = false;
      for (const zl of byZone) { const c = zl[round]; if (c && !seen.has(c.name)) { picked.push(c); seen.add(c.name); added = true; if (picked.length >= n) break; } }
      round++;
    }
    chosen = picked;
  } else {
    const rank = name => Math.min(...g.zones.map(z => goalRank(name, z)));
    chosen = list.filter(x => x && x.name && g.zones.some(z => exerciseZones(x.name).indexOf(z) !== -1))
      .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, 'fr')).slice(0, n);
  }
  return { key: g.key, title: g.title, emoji: g.emoji, zones: g.zones, why: g.why, exercises: chosen.map(x => ({ name: x.name, sets: Number(x.sets) || 3, reps: Number(x.reps) || 10, unit: x.unit || 'reps' })) };
}

// Choisit ~n exercices couvrant une liste de zones, en tournant (round-robin) : une par zone,
// meilleures d'abord, sans doublon. `offset` fait tourner le choix dans chaque zone (variété /
// bouton régénérer) tout en restant pertinent. Renvoie [{name,sets,reps,unit}]. Pur + testé.
function pickExercisesForZones(zones, exercises, n, offset) {
  const list = Array.isArray(exercises) ? exercises : [];
  const zs = Array.isArray(zones) ? zones : [];
  const num = Math.max(1, Math.round(Number(n) || 5));
  const off = Math.max(0, Math.round(Number(offset) || 0));
  const byZone = zs.map(z => {
    const l = list.filter(x => x && x.name && exerciseZones(x.name).indexOf(z) !== -1)
      .sort((a, b) => goalRank(a.name, z) - goalRank(b.name, z) || a.name.localeCompare(b.name, 'fr'));
    if (off > 0 && l.length > 1) { const k = off % l.length; return l.slice(k).concat(l.slice(0, k)); }
    return l;
  });
  const picked = [], seen = new Set();
  let round = 0, added = true;
  while (picked.length < num && added) {
    added = false;
    for (const zl of byZone) { const c = zl[round]; if (c && !seen.has(c.name)) { picked.push(c); seen.add(c.name); added = true; if (picked.length >= num) break; } }
    round++;
  }
  return picked.map(x => ({ name: x.name, sets: Number(x.sets) || 3, reps: Number(x.reps) || 10, unit: x.unit || 'reps' }));
}

// Matériel requis par type d'exercice (champ `kind`) → clé de profile.equipment.
const EQUIP_KIND_REQ = { 'Kettlebell': 'kettlebell', 'Barre de traction': 'pullup', 'Gilet lesté': 'vest', 'Poignées de pompes': 'handles' };
const EQUIP_LABELS = { kettlebell: 'Kettlebell', pullup: 'Barre de traction', vest: 'Gilet lesté', handles: 'Poignées de pompes' };
// Un exercice est réalisable si son matériel est dispo, ou s'il n'en requiert pas (poids du corps / trail). Pur.
function exerciseAvailable(exercise, equipment) {
  const kind = exercise && typeof exercise.kind === 'string' ? exercise.kind : '';
  const req = EQUIP_KIND_REQ[kind];
  if (!req) return true;
  const eq = equipment && typeof equipment === 'object' ? equipment : {};
  return Boolean(eq[req]);
}
// Filtre une liste d'exercices selon le matériel dispo. equipment falsy = pas de filtre. Pur + testé.
function filterByEquipment(exercises, equipment) {
  const list = Array.isArray(exercises) ? exercises : [];
  if (!equipment || typeof equipment !== 'object') return list.slice();
  return list.filter(x => exerciseAvailable(x, equipment));
}

// Objectifs physiques : chacun définit un nombre de courses/sem et un split muscu (focus par séance).
const FOCUS_ZONES = { upper: ['chest', 'back', 'shoulders', 'arms'], lower: ['legs', 'glutes', 'abs'], push: ['chest', 'shoulders', 'arms'], pull: ['back', 'arms'], legs: ['legs', 'glutes'], fullbody: ['legs', 'back', 'chest', 'abs', 'shoulders'] };
const FOCUS_TITLE = { upper: 'Haut du corps', lower: 'Bas du corps', push: 'Poussée', pull: 'Tirage', legs: 'Jambes', fullbody: 'Full body' };
const FITNESS_OBJECTIVES = [
  { key: 'athletique', title: 'Corps athlétique', emoji: '🏃', runs: 3, split: ['upper', 'lower', 'fullbody'], runEmphasis: 'balanced', runFocus: 'course équilibrée', why: 'Polyvalent : cardio + force pour une silhouette sportive.' },
  { key: 'muscle', title: 'Prise de muscle', emoji: '💪', runs: 1, split: ['push', 'pull', 'legs', 'upper'], runEmphasis: 'facile', runFocus: 'footing de récup', why: 'Priorité muscu (4 séances), cardio léger.' },
  { key: 'seche', title: 'Perte de gras', emoji: '🔥', runs: 4, split: ['fullbody', 'fullbody', 'upper'], runEmphasis: 'vitesse', runFocus: 'tempo & fractionné', why: 'Beaucoup de cardio + full body pour garder le muscle.' },
  { key: 'endurance', title: 'Endurance / trail', emoji: '🏔️', runs: 4, split: ['lower', 'fullbody'], runEmphasis: 'endurance', runFocus: 'sorties longues', why: 'Volume de course + renfo jambes et tronc.' },
  { key: 'forme', title: 'Remise en forme', emoji: '⚖️', runs: 2, split: ['fullbody', 'fullbody'], runEmphasis: 'facile', runFocus: 'course facile', why: 'Doux et régulier : full body + course facile.' },
];
// Programme hebdo automatique selon un objectif physique : séances de muscu (avec exercices précis)
// + de course, alternées et espacées sur la semaine. opts.perSession = nb d'exos/séance muscu (défaut 5).
// Null si objectif inconnu. Pur + testé.
function objectiveProgram(key, exercises, opts) {
  const o = FITNESS_OBJECTIVES.find(x => x.key === key);
  if (!o) return null;
  const per = Math.max(3, Math.min(7, Math.round((opts && opts.perSession) || 5)));
  const seed = Math.max(0, Math.round((opts && opts.seed) || 0));
  const pool = opts && opts.equipment ? filterByEquipment(exercises, opts.equipment) : exercises;
  const muscu = o.split.map((f, fi) => ({ kind: 'muscu', focus: f, title: FOCUS_TITLE[f] || 'Musculation', minutes: 45, exercises: pickExercisesForZones(FOCUS_ZONES[f], pool, per, seed ? seed + fi : 0) }));
  const runs = runPlanWeek(o.runs, { emphasis: o.runEmphasis }).sessions.map(s => ({ kind: 'course', type: s.type, title: s.label, minutes: s.minutes, why: s.why }));
  const ordered = []; let mi = 0, ri = 0;
  while (mi < muscu.length || ri < runs.length) { if (mi < muscu.length) ordered.push(muscu[mi++]); if (ri < runs.length) ordered.push(runs[ri++]); }
  const total = ordered.length;
  const P = { 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 3, 5, 0], 5: [1, 2, 4, 5, 0], 6: [1, 2, 3, 4, 5, 0], 7: [1, 2, 3, 4, 5, 6, 0] };
  const days = P[Math.max(1, Math.min(7, total))] || [1, 3, 5, 0];
  const week = ordered.map((s, i) => ({ ...s, weekday: days[i % days.length] })).sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
  return { key: o.key, title: o.title, emoji: o.emoji, why: o.why, runs: o.runs, runFocus: o.runFocus, strength: o.split.length, week };
}
// Résumé hebdo d'un programme : nb de séances, minutes totales, heures (1 décimale), répartition. Pur + testé.
function programWeekSummary(week) {
  const list = Array.isArray(week) ? week : [];
  const minutes = list.reduce((a, s) => a + (Number(s && s.minutes) || 0), 0);
  return {
    sessions: list.length,
    muscu: list.filter(s => s && s.kind === 'muscu').length,
    course: list.filter(s => s && s.kind === 'course').length,
    minutes,
    hours: Math.round(minutes / 60 * 10) / 10,
  };
}
// Met en forme un programme par objectif en texte brut (copier/partager). '' si programme vide. Pur + testé.
function objectiveProgramText(program, opts) {
  const p = program || {};
  const week = Array.isArray(p.week) ? p.week : [];
  if (!p.title || !week.length) return '';
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const sum = programWeekSummary(week);
  const lines = [];
  lines.push(`${p.emoji || ''} ${p.title} — programme de la semaine`.trim());
  lines.push(`${p.strength} muscu · ${p.runs} course/sem.${p.runFocus ? ' · ' + p.runFocus : ''}`);
  lines.push(`≈ ${String(sum.hours).replace('.', ',')} h/semaine · ${sum.sessions} séances`);
  lines.push('');
  week.forEach(s => {
    const icon = s.kind === 'muscu' ? '🏋️' : '🏃';
    lines.push(`${days[s.weekday] || ''} — ${icon} ${s.title} (${s.minutes} min)`);
    if (s.kind === 'muscu' && Array.isArray(s.exercises)) s.exercises.forEach(e => lines.push(`   • ${e.name} : ${e.sets}×${e.reps}`));
    else if (s.why) lines.push(`   ${s.why}`);
  });
  const nutri = opts && opts.nutri;
  if (nutri) { lines.push(''); lines.push(`🍽️ Nutrition (${nutri.dir}) : ${nutri.dailyTarget} kcal/j · P ${nutri.proteinG} g · G ${nutri.carbG} g · L ${nutri.fatG} g`); }
  return lines.join('\n');
}

// Bloc de progression sur 4 semaines : S1 base, S2 volume (+1 série), S3 intensité (charge ↑),
// S4 décharge (récup). weekIndex 0-based (cycle tous les 4). Pur + testé.
function blockPhase(weekIndex) {
  const i = ((Number(weekIndex) || 0) % 4 + 4) % 4;
  return [
    { week: 1, phase: 'Base', short: 'Base', setDelta: 0, intensity: false, deload: false, note: 'Prends tes marques, technique propre.' },
    { week: 2, phase: 'Volume', short: 'Volume', setDelta: 1, intensity: false, deload: false, note: '+1 série par exercice, même charge.' },
    { week: 3, phase: 'Intensité', short: 'Intensité', setDelta: 0, intensity: true, deload: false, note: 'Monte la charge / vise le haut de la fourchette de reps.' },
    { week: 4, phase: 'Décharge', short: 'Décharge', setDelta: 0, intensity: false, deload: true, note: 'Volume réduit : le corps surcompense et récupère.' },
  ][i];
}
// Nombre de séries pour une semaine du bloc, à partir des séries de base. Pur + testé.
function progressSets(baseSets, weekIndex) {
  const b = Math.max(1, Math.round(Number(baseSets) || 3));
  const p = blockPhase(weekIndex);
  if (p.deload) return Math.max(2, Math.round(b * 0.6));
  return Math.max(1, b + p.setDelta);
}

// Génère une séance express : remplit un budget de temps (minutes) avec des exercices
// de la bibliothèque, filtrés par zone et/ou matériel. opts : { minutes=20, zone='all',
// equipment='all', maxExercises=8 }. Renvoie { exercises:[...], totalMinutes, count }. Pur + testé.
function quickSessionPlan(exercises, opts) {
  const list = Array.isArray(exercises) ? exercises : [];
  const o = opts && typeof opts === 'object' ? opts : {};
  const budget = Math.max(1, Math.round(Number(o.minutes) || 20));
  const zone = o.zone && o.zone !== 'all' ? o.zone : null;
  const equip = o.equipment && o.equipment !== 'all' ? o.equipment : null;
  const maxEx = Math.max(1, Math.round(Number(o.maxExercises) || 8));
  let pool = list.filter(x => x && x.name && (!equip || x.kind === equip) && (!zone || exerciseZones(x.name).indexOf(zone) !== -1));
  if (zone) pool = pool.slice().sort((a, b) => exerciseZones(a.name).indexOf(zone) - exerciseZones(b.name).indexOf(zone));
  const picked = []; let total = 0;
  for (const x of pool) {
    if (picked.length >= maxEx) break;
    const m = prescriptionFor(x, x).minutes;
    if (picked.length && total + m > budget) continue;
    picked.push(x); total += m;
    if (total >= budget) break;
  }
  return { exercises: picked, totalMinutes: total, count: picked.length };
}

// Programme progressif ciblé sur une zone (ex. « objectif abdos en 8 semaines »).
// Volume qui monte, décharge toutes les 4 semaines. Pur + testé.
function buildZonePlan(zone, weeks, perWeek) {
  const goal = TRAINING_GOALS.find(g => g.id === zone);
  if (!goal) return null;
  weeks = Math.max(4, Math.min(12, Math.round(Number(weeks) || 8)));
  perWeek = Math.max(2, Math.min(5, Math.round(Number(perWeek) || 3)));
  const exercises = zoneTopExercises(zone, 5);
  const blocks = [];
  for (let w = 1; w <= weeks; w++) {
    const deload = w % 4 === 0;
    const sets = deload ? 2 : (w > weeks / 2 ? 4 : 3);
    const reps = deload ? 12 : Math.min(22, 12 + (w - 1) * 2);
    blocks.push({ week: w, deload, sets, reps });
  }
  return { zone, label: goal.label, emoji: goal.emoji, weeks, perWeek, exercises, blocks };
}

// Records personnels par exercice, depuis l'historique des séances. Pour chaque exercice :
// meilleure charge (kg) et meilleur nombre de reps jamais enregistrés (séries incluses). Pur + testé.
function personalRecords(workouts) {
  const rec = {};
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    if (!w || !Array.isArray(w.exercises)) return;
    w.exercises.forEach(ex => {
      if (!ex || !ex.name) return;
      let load = Number(ex.load) || 0, reps = Number(ex.reps) || 0;
      if (Array.isArray(ex.setLogs)) ex.setLogs.forEach(s => { load = Math.max(load, Number(s && s.load) || 0); reps = Math.max(reps, Number(s && s.reps) || 0); });
      const cur = rec[ex.name] || { load: 0, reps: 0, date: '' };
      const improved = load > cur.load || reps > cur.reps;
      rec[ex.name] = { load: Math.max(cur.load, load), reps: Math.max(cur.reps, reps), date: improved ? (w.date || cur.date) : cur.date };
    });
  });
  return rec;
}

// Résumé d'historique d'un exercice : nb de séances où il apparaît, dernière date,
// meilleure série chargée (1RM estimé), meilleures reps (poids du corps) et total de séries. Pur + testé.
function exerciseHistoryStats(workouts, name) {
  if (!name) return null;
  let sessions = 0, lastDate = '', best = null, bestReps = 0, totalSets = 0;
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.date || ''))) return;
    const exos = Array.isArray(w.exercises) && w.exercises.length ? w.exercises
      : (w.exercise ? [{ name: w.exercise, load: w.load, reps: w.reps, sets: w.sets, completedSets: w.completedSets }] : []);
    let present = false;
    exos.forEach(ex => {
      if (!ex || ex.name !== name) return;
      present = true;
      const setsArr = Array.isArray(ex.setLogs) && ex.setLogs.length ? ex.setLogs : null;
      totalSets += setsArr ? setsArr.length : (Number(ex.completedSets) > 0 ? Number(ex.completedSets) : (Number(ex.sets) || 0));
      (setsArr || [{ load: ex.load, reps: ex.reps }]).forEach(s => {
        const load = Number(s && s.load) || 0, reps = Number(s && s.reps) || 0;
        if (reps > bestReps) bestReps = reps;
        const e = estimate1RM(load, reps);
        if (e != null && (!best || e > best.e1rm)) best = { load, reps, e1rm: e };
      });
    });
    if (present) { sessions++; if (w.date > lastDate) lastDate = w.date; }
  });
  if (!sessions) return null;
  return { sessions, lastDate, bestSet: best, bestReps, totalSets };
}

// Prochain palier rond de force strictement au-dessus d'une valeur (1RM estimé). step défaut 10 kg.
// Retourne { milestone, gap } (écart arrondi 0,5 kg) ou null si valeur invalide. Pur + testé.
function nextStrengthMilestone(value, step) {
  const v = Number(value), s = Number(step) > 0 ? Number(step) : 10;
  if (!(v > 0)) return null;
  const milestone = Math.ceil((v + 1e-6) / s) * s;
  return { milestone: Math.round(milestone * 10) / 10, gap: Math.round((milestone - v) * 2) / 2 };
}

// Palmarès de force : pour chaque exercice chargé, la meilleure série (1RM estimé le plus haut)
// avec charge, reps, 1RM estimé et date. Trié par 1RM décroissant. Pur + testé.
function strengthRecords(workouts) {
  const best = {};
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    if (!w || !Array.isArray(w.exercises) || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.date || ''))) return;
    w.exercises.forEach(ex => {
      if (!ex || !ex.name) return;
      const sets = Array.isArray(ex.setLogs) && ex.setLogs.length ? ex.setLogs : [{ load: ex.load, reps: ex.reps }];
      sets.forEach(s => {
        const load = Number(s && s.load) || 0, reps = Number(s && s.reps) || 0;
        const e1rm = estimate1RM(load, reps);
        if (e1rm == null) return;
        const cur = best[ex.name];
        if (!cur || e1rm > cur.e1rm) best[ex.name] = { name: ex.name, load, reps, e1rm, date: w.date };
      });
    });
  });
  return Object.values(best).sort((a, b) => b.e1rm - a.e1rm || a.name.localeCompare(b.name, 'fr'));
}

// Indice de masse corporelle + catégorie OMS (repère indicatif). Null si entrées invalides. Pur + testé.
function bmiInfo(weightKg, heightCm) {
  const w = Number(weightKg), h = Number(heightCm);
  if (!(w > 0) || !(h > 0)) return null;
  const bmi = Math.round(w / ((h / 100) ** 2) * 10) / 10;
  const category = bmi < 18.5 ? 'maigreur' : bmi < 25 ? 'corpulence normale' : bmi < 30 ? 'surpoids' : 'obésité';
  return { bmi, category };
}
// Métabolisme de base (kcal/j) — formule de Mifflin-St Jeor. sex : 'femme' sinon homme.
// Null si entrées invalides. Pur + testé.
function basalMetabolicRate(weightKg, heightCm, age, sex) {
  const w = Number(weightKg), h = Number(heightCm), a = Number(age);
  if (!(w > 0) || !(h > 0) || !(a > 0)) return null;
  const base = 10 * w + 6.25 * h - 5 * a;
  return Math.round(sex === 'femme' ? base - 161 : base + 5);
}
// Facteur d'activité selon le nombre de séances/semaine. Pur + testé.
function activityFactor(sessionsPerWeek) {
  const s = Number(sessionsPerWeek) || 0;
  if (s <= 0) return 1.2; if (s <= 2) return 1.375; if (s <= 4) return 1.55; if (s <= 6) return 1.725; return 1.9;
}
// Facteur d'activité pour un niveau choisi manuellement (sinon null). Pur + testé.
function activityLevelFactor(level) {
  return ({ sedentaire: 1.2, leger: 1.375, modere: 1.55, actif: 1.725, tres: 1.9 })[level] || null;
}
// Date à N semaines d'une date de départ (YYYY-MM-DD). Null si invalide. Pur + testé.
function dateAfterWeeks(todayKey, weeks) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || '')); const w = Math.round(Number(weeks) || 0);
  if (!t || w <= 0) return null;
  const d = new Date(+t[1], +t[2] - 1, +t[3]); d.setDate(d.getDate() + w * 7);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// Compare la durée réelle mesurée à la durée prévue : 'on' (proche), 'slow' (+30 %), 'fast' (−23 %). Null si invalide. Pur + testé.
function paceStatus(plannedWeeks, realWeeks) {
  const p = Number(plannedWeeks), r = Number(realWeeks);
  if (!(p > 0) || !(r > 0)) return null;
  const ratio = r / p;
  return ratio > 1.3 ? 'slow' : ratio < 0.77 ? 'fast' : 'on';
}
// Plan énergétique complet pour atteindre une cible de poids : métabolisme, dépense (TDEE),
// calories & macros cibles, rythme sûr, nombre de semaines et date d'atteinte estimée.
// opts : { weight, height, age, sex, sessionsPerWeek, targetWeight, todayKey }. Null si données manquantes.
// Rythme borné (~0,6 %/sem en perte, 0,25 kg/sem en prise), calories jamais sous le métabolisme de base. Pur + testé.
function energyPlan(opts) {
  const o = opts || {};
  const weight = Number(o.weight), target = Number(o.targetWeight);
  const bmr = basalMetabolicRate(weight, o.height, o.age, o.sex);
  if (bmr == null || !(target > 0)) return null;
  const tdee = Math.round(bmr * (activityLevelFactor(o.activityLevel) || activityFactor(o.sessionsPerWeek)));
  const diff = Math.round((weight - target) * 10) / 10; // + = perdre, - = prendre
  const goal = Math.abs(diff) < 0.3 ? 'maintien' : diff > 0 ? 'perte' : 'prise';
  let ratePerWeek = 0, deficit = 0, dailyTarget = tdee;
  if (goal === 'perte') {
    const desired = Math.min(0.9, Math.max(0.25, Math.round(weight * 0.006 * 100) / 100));
    deficit = Math.round(desired * 7700 / 7);
    dailyTarget = Math.max(bmr, tdee - deficit);
    const eff = tdee - dailyTarget;
    ratePerWeek = Math.round(eff * 7 / 7700 * 100) / 100; deficit = eff;
  } else if (goal === 'prise') {
    ratePerWeek = 0.25; const surplus = Math.round(ratePerWeek * 7700 / 7);
    dailyTarget = tdee + surplus; deficit = -surplus;
  }
  const weeks = goal === 'maintien' ? 0 : Math.max(1, Math.ceil(Math.abs(diff) / (ratePerWeek || 0.25)));
  const proteinG = Math.round(weight * (goal === 'perte' ? 2 : 1.8));
  const fatG = Math.round(weight * 0.9);
  const carbG = Math.max(0, Math.round((dailyTarget - (proteinG * 4 + fatG * 9)) / 4));
  const targetDate = weeks > 0 ? dateAfterWeeks(o.todayKey, weeks) : null;
  return { bmr, tdee, goal, diff: Math.abs(diff), ratePerWeek, deficit, dailyTarget, proteinG, fatG, carbG, weeks, targetDate };
}

// Orientation nutritionnelle cohérente avec l'objectif d'entraînement (déficit / maintien / surplus).
const OBJECTIVE_NUTRITION = {
  athletique: { dir: 'maintien', adjust: 0, proteinPerKg: 1.8, tip: 'Mange autour de ta dépense : priorise protéines et qualité pour te recomposer.' },
  muscle: { dir: 'surplus', adjust: 0.10, proteinPerKg: 2.0, tip: 'Léger surplus (~+10 %) + protéines hautes pour construire du muscle.' },
  seche: { dir: 'déficit', adjust: -0.18, proteinPerKg: 2.2, tip: 'Déficit (~-18 %) + beaucoup de protéines pour fondre en gardant le muscle.' },
  endurance: { dir: 'maintien', adjust: 0.05, proteinPerKg: 1.6, tip: 'Léger surplus glucidique pour tenir le volume de course.' },
  forme: { dir: 'maintien', adjust: -0.05, proteinPerKg: 1.6, tip: 'Autour du maintien : la régularité prime sur la restriction.' },
};
// Cibles caloriques/macros alignées sur l'objectif d'entraînement, à partir de poids/taille/âge/sexe/activité.
// Null si objectif inconnu ou données manquantes. Calories jamais sous le métabolisme de base. Pur + testé.
function objectiveNutrition(objectiveKey, opts) {
  const cfg = OBJECTIVE_NUTRITION[objectiveKey];
  const o = opts || {};
  const weight = Number(o.weight);
  const bmr = basalMetabolicRate(weight, o.height, o.age, o.sex);
  if (!cfg || bmr == null || !(weight > 0)) return null;
  const tdee = Math.round(bmr * (activityLevelFactor(o.activityLevel) || activityFactor(o.sessionsPerWeek)));
  const dailyTarget = Math.max(bmr, Math.round(tdee * (1 + cfg.adjust)));
  const proteinG = Math.round(weight * cfg.proteinPerKg);
  const fatG = Math.round(weight * 0.9);
  const carbG = Math.max(0, Math.round((dailyTarget - (proteinG * 4 + fatG * 9)) / 4));
  return { dir: cfg.dir, adjustPct: Math.round(cfg.adjust * 100), bmr, tdee, dailyTarget, proteinG, fatG, carbG, tip: cfg.tip };
}

// Plan de course de la semaine (≥ 3, plafonné à 6 sorties) pour progresser en cardio :
// mix endurance facile / tempo / fractionné / sortie longue, réparti sur la semaine (longue le dimanche).
// opts.days (0=Dim…6=Sam) peut imposer les jours. Renvoie { sessions:[{weekday,type,label,minutes,why}], count, totalMinutes }. Pur + testé.
function runPlanWeek(count, opts) {
  const want = Math.max(3, Math.min(6, Math.round(Number(count) || 4)));
  const PATTERN = { 3: [2, 4, 0], 4: [1, 3, 5, 0], 5: [1, 2, 4, 5, 0], 6: [1, 2, 3, 4, 5, 0] };
  // Mélanges de séances selon l'accent : équilibré (défaut), endurance (volume/longues),
  // vitesse (tempo/fractionné, ex. sèche), facile (footing de récup, ex. jours de muscu lourds).
  const TEMPLATES = {
    balanced: { 3: ['facile', 'tempo', 'longue'], 4: ['facile', 'fractionne', 'facile', 'longue'], 5: ['facile', 'fractionne', 'facile', 'tempo', 'longue'], 6: ['facile', 'fractionne', 'facile', 'tempo', 'facile', 'longue'] },
    endurance: { 3: ['facile', 'facile', 'longue'], 4: ['facile', 'facile', 'tempo', 'longue'], 5: ['facile', 'facile', 'facile', 'tempo', 'longue'], 6: ['facile', 'facile', 'tempo', 'facile', 'facile', 'longue'] },
    vitesse: { 3: ['fractionne', 'tempo', 'facile'], 4: ['fractionne', 'tempo', 'facile', 'longue'], 5: ['fractionne', 'tempo', 'fractionne', 'facile', 'longue'], 6: ['fractionne', 'tempo', 'facile', 'fractionne', 'tempo', 'longue'] },
    facile: { 3: ['facile', 'facile', 'facile'], 4: ['facile', 'facile', 'facile', 'facile'], 5: ['facile', 'facile', 'tempo', 'facile', 'facile'], 6: ['facile', 'facile', 'facile', 'tempo', 'facile', 'facile'] },
  };
  const META = {
    facile: { label: 'Course facile', minutes: 35, why: 'Endurance fondamentale : à l’aise, tu peux parler.' },
    tempo: { label: 'Tempo', minutes: 30, why: 'Allure soutenue tenue : élève ton seuil.' },
    fractionne: { label: 'Fractionné', minutes: 35, why: 'Intervalles rapides : booste la VMA et le cardio.' },
    longue: { label: 'Sortie longue', minutes: 70, why: 'Volume : endurance et mental.' },
  };
  const o = opts || {};
  const template = TEMPLATES[o.emphasis] || TEMPLATES.balanced;
  const days = Array.isArray(o.days) && o.days.length >= want ? o.days.slice(0, want) : PATTERN[want];
  const order = w => (w + 6) % 7;
  const sessions = template[want].map((type, i) => ({ weekday: days[i], type, ...META[type] })).sort((a, b) => order(a.weekday) - order(b.weekday));
  return { sessions, count: sessions.length, totalMinutes: sessions.reduce((a, s) => a + s.minutes, 0) };
}

// Titre d'une séance du Coach Poids selon son type (pour l'agenda). Pur + testé.
function coachSessionLabel(type) {
  return ({ muscu: '🏋️ Musculation', renfo: '🔥 Renfo / circuit', course: '🏃 Course' })[type] || 'Séance';
}

// Répartition d'entraînement hebdo adaptée à l'objectif de poids, placée sur les jours dispo.
// goal : 'perte'|'prise'|'maintien'. days : jours dispo (0=Dim … 6=Sam). Combine muscu (garde le muscle),
// renfo (circuit intense) et course (déficit). Sessions espacées sur la semaine. Pur + testé.
// Renvoie { sessions:[{weekday,type,label,minutes,why}], strength, runs, renfo, note }.
function coachWeekPlan(goal, days, opts) {
  const g = goal === 'perte' || goal === 'prise' ? goal : 'maintien';
  const uniq = [...new Set((Array.isArray(days) ? days : []).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
  const slots = uniq.length || 4;
  const TEMPLATE = {
    perte: ['course', 'muscu', 'renfo', 'course', 'muscu', 'course'],
    prise: ['muscu', 'muscu', 'course', 'muscu', 'muscu'],
    maintien: ['muscu', 'course', 'muscu', 'renfo', 'course'],
  };
  const NOTE = {
    perte: 'Perte de poids : la course et le renfo creusent le déficit, la muscu garde ton muscle. Garde des protéines hautes.',
    prise: 'Prise de masse : priorité à la muscu en surcharge progressive ; peu de cardio pour préserver le surplus.',
    maintien: 'Maintien : équilibre muscu + cardio pour entretenir forme et composition.',
  };
  const META = {
    muscu: { label: 'Musculation', minutes: 45, why: 'Force : garde/construit le muscle.' },
    renfo: { label: 'Renfo / circuit', minutes: 30, why: 'Circuit intense : grosse dépense en peu de temps.' },
    course: { label: 'Course', minutes: 40, why: 'Endurance : creuse le déficit énergétique.' },
  };
  const goalTotal = g === 'perte' ? 6 : 5;
  const total = Math.max(1, Math.min(goalTotal, slots));
  const chosen = TEMPLATE[g].slice(0, total);
  const dayList = [];
  if (!uniq.length) { const def = [1, 3, 5, 2, 4, 6, 0]; for (let i = 0; i < total; i++) dayList.push(def[i % 7]); }
  else if (uniq.length <= total) { for (let i = 0; i < total; i++) dayList.push(uniq[i % uniq.length]); }
  else { for (let i = 0; i < total; i++) dayList.push(uniq[Math.round(i * (uniq.length - 1) / (total - 1 || 1))]); }
  const sessions = chosen.map((type, i) => ({ weekday: dayList[i], type, ...META[type] })).sort((a, b) => a.weekday - b.weekday);
  return {
    sessions,
    strength: sessions.filter(s => s.type === 'muscu').length,
    runs: sessions.filter(s => s.type === 'course').length,
    renfo: sessions.filter(s => s.type === 'renfo').length,
    note: NOTE[g],
  };
}

// Formate le plan Coach Poids en texte partageable (objectif, calories/macros, semaine type, repas).
// opts : { plan (energyPlan), week ([{weekday,label,minutes}]), meals ([{meal,kcal,example}]) }. Pur + testé.
function coachPlanText(opts) {
  const o = opts || {}, p = o.plan;
  if (!p || typeof p !== 'object') return '';
  const num = n => String(n).replace('.', ','), jour = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'], fr = d => String(d).split('-').reverse().join('/');
  const gl = p.goal === 'perte' ? `Perdre ${num(p.diff)} kg` : p.goal === 'prise' ? `Prendre ${num(p.diff)} kg` : 'Maintenir mon poids';
  const lines = ['🎯 Mon plan pour atteindre ma cible', `Objectif : ${gl}${p.targetDate ? ` · cible ~ ${fr(p.targetDate)}` : ''}`, `🔥 ${p.dailyTarget} kcal/jour · ${p.proteinG} g prot · ${p.carbG} g gluc · ${p.fatG} g lip`];
  if (Array.isArray(o.week) && o.week.length) { lines.push('', '🗓️ Semaine type :'); o.week.forEach(s => lines.push(`- ${jour[s.weekday]} : ${s.label} · ${s.minutes} min`)); }
  if (Array.isArray(o.meals) && o.meals.length) { lines.push('', '🍽️ Journée d’assiette :'); o.meals.forEach(m => lines.push(`- ${m.meal} : ${m.kcal} kcal${m.example ? ` · ${m.example}` : ''}`)); }
  return lines.join('\n');
}

// Étapes de coaching « comment y arriver » selon l'objectif de poids. Liste de conseils. Pur + testé.
function coachSteps(goal) {
  if (goal === 'prise') return [
    'Vise un léger surplus calorique constant : c’est lui qui construit.',
    'Muscu en surcharge progressive : ajoute des reps puis de la charge chaque semaine.',
    'Protéines élevées réparties sur la journée pour nourrir le muscle.',
    'Dors 7-9 h : la croissance se fait au repos.',
    'Sois patient : ~0,25 kg/sem évite de prendre trop de gras.',
  ];
  if (goal === 'perte') return [
    'Tiens un déficit calorique modéré et régulier : la régularité bat l’intensité.',
    'Garde les protéines hautes + la muscu : tu perds du gras, pas du muscle.',
    'Ajoute course/renfo pour creuser le déficit sans trop couper les calories.',
    'Dors et gère le stress : ils pilotent l’appétit.',
    'Pèse-toi 1×/sem à jeun et regarde la tendance sur 2-3 sem, pas le chiffre du jour.',
  ];
  return [
    'Mange autour de ta dépense et bouge régulièrement.',
    'Muscu pour entretenir la masse, cardio pour le cœur.',
    'Protéines suffisantes et sommeil régulier.',
    'Surveille la tendance de ton poids sur plusieurs semaines.',
  ];
}
// Enregistre/actualise le score d'adhérence d'une semaine (clé = lundi) dans l'historique.
// Met à jour si la semaine existe, ajoute sinon, trie par date, garde les `cap` dernières. Pur + testé.
function upsertAdherenceSnapshot(history, weekKey, score, cap) {
  const list = (Array.isArray(history) ? history : []).filter(h => h && /^\d{4}-\d{2}-\d{2}$/.test(String(h.week || '')));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(weekKey || ''))) return list.slice();
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const out = list.filter(h => h.week !== weekKey).concat([{ week: weekKey, score: s }]).sort((a, b) => a.week.localeCompare(b.week));
  const n = Math.max(1, Math.round(Number(cap) || 12));
  return out.slice(-n);
}

// Adhérence hebdo au plan (lundi → today) à partir des données réelles de l'état.
// opts : { proteinTargetG, sessionTarget, waterGoal=8, sleepTarget=7, minProteinDays=3, minWaterDays=3 }.
// Renvoie { items:[{key,label,done}], done, total, score }. Pur + testé.
function weeklyAdherence(state, mondayKey, todayKey, opts) {
  const s = state && typeof state === 'object' ? state : {};
  const o = opts || {};
  const arr = k => Array.isArray(s[k]) ? s[k] : [];
  const inWeek = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && d >= mondayKey && d <= todayKey;
  const sessionTarget = Math.max(1, Math.round(Number(o.sessionTarget) || 3));
  const workouts = arr('workouts').filter(w => w && inWeek(w.date)).length;
  const protTgt = Number(o.proteinTargetG) || 0, waterGoal = Number(o.waterGoal) || 8, sleepTarget = Number(o.sleepTarget) || 7;
  const minProt = o.minProteinDays || 3, minWater = o.minWaterDays || 3;
  const nut = arr('nutrition').filter(n => n && inWeek(n.date));
  const protDays = protTgt > 0 ? nut.filter(n => (Number(n.protein) || 0) >= protTgt).length : 0;
  const waterDays = nut.filter(n => (Number(n.water) || 0) >= waterGoal).length;
  const rec = arr('recovery').filter(r => r && inWeek(r.date) && Number(r.sleep) > 0);
  const sleepAvg = rec.length ? rec.reduce((a, r) => a + Number(r.sleep), 0) / rec.length : 0;
  const weighed = arr('weights').some(w => w && inWeek(w.date));
  const items = [
    { key: 'sessions', label: `Séances (${workouts}/${sessionTarget})`, done: workouts >= sessionTarget },
    { key: 'protein', label: `Protéines à la cible (${protDays} j)`, done: protTgt > 0 && protDays >= minProt },
    { key: 'water', label: `Hydratation (${waterDays} j)`, done: waterDays >= minWater },
    { key: 'sleep', label: `Sommeil ≥ ${sleepTarget} h (moy. ${sleepAvg ? Math.round(sleepAvg * 10) / 10 : '—'})`, done: sleepAvg >= sleepTarget },
    { key: 'weighin', label: 'Pesée cette semaine', done: weighed },
  ];
  const done = items.filter(i => i.done).length;
  return { items, done, total: items.length, score: Math.round(done / items.length * 100) };
}

// Répartition des calories & macros cibles sur les repas (petit-déj 25 % / déj 35 % / dîner 30 % / collation 10 %).
// Renvoie [{meal, share, kcal, proteinG, carbG, fatG}] ou [] si calories invalides. Pur + testé.
function mealSplit(dailyTarget, proteinG, carbG, fatG) {
  const kcal = Number(dailyTarget) || 0;
  if (!(kcal > 0)) return [];
  const p = Number(proteinG) || 0, c = Number(carbG) || 0, f = Number(fatG) || 0;
  return [
    { meal: 'Petit-déjeuner', share: 0.25 },
    { meal: 'Déjeuner', share: 0.35 },
    { meal: 'Dîner', share: 0.30 },
    { meal: 'Collation', share: 0.10 },
  ].map(m => ({ meal: m.meal, share: m.share, kcal: Math.round(kcal * m.share), proteinG: Math.round(p * m.share), carbG: Math.round(c * m.share), fatG: Math.round(f * m.share) }));
}
// Idées de repas concrètes par moment de la journée (exemples d'assiettes). seed fait tourner les idées.
const MEAL_IDEAS = {
  'Petit-déjeuner': ['Flocons d’avoine + fromage blanc + fruit + oléagineux', 'Œufs brouillés + pain complet + avocat', 'Skyr + granola + fruits rouges'],
  'Déjeuner': ['Poulet + riz complet + légumes + huile d’olive', 'Saumon + patate douce + brocoli', 'Steak haché 5 % + pâtes complètes + ratatouille'],
  'Dîner': ['Poisson blanc + quinoa + légumes verts', 'Omelette + grande salade + pain complet', 'Poulet ou tofu + riz + poêlée de légumes'],
  'Collation': ['Skyr + amandes', 'Banane + beurre de cacahuète', 'Fromage blanc + fruit'],
};
function mealIdea(mealName, kcal, seed) {
  const ideas = MEAL_IDEAS[mealName] || ['Protéine + féculent complet + légumes'];
  const i = Math.abs(Math.round(Number(seed) || 0)) % ideas.length;
  return { meal: mealName, kcal: Math.round(Number(kcal) || 0), example: ideas[i] };
}

// Repères « quoi manger » selon l'objectif de poids. Renvoie une liste de conseils. Pur + testé.
function nutritionTips(goal) {
  const base = [
    'Une source de protéines à chaque repas (œufs, poulet, poisson, skyr, légumineuses, whey).',
    'Remplis la moitié de l’assiette de légumes : rassasiants et peu caloriques.',
    'Féculents complets (riz/pâtes complètes, patate douce, flocons d’avoine) plutôt que raffinés.',
    'Bois de l’eau régulièrement : la faim est parfois de la soif.',
  ];
  if (goal === 'perte') return ['Mange à ta faim mais reste sous ta dépense : le déficit fait maigrir.', ...base, 'Limite boissons sucrées et alcool (calories « vides »).'];
  if (goal === 'prise') return ['Ajoute un surplus modéré : collations denses (fruits secs, beurre de cacahuète, avoine).', ...base, 'Ne saute pas de repas ; répartis les protéines sur la journée.'];
  return ['Mange autour de ta dépense pour stabiliser ton poids.', ...base];
}

// Trajectoire de poids prévue vers la cible : un point par semaine de today → date cible,
// au rythme donné (kg/sem, signe déduit du sens cible). Valeurs bornées à la cible, arrondies 0,1.
// Renvoie [{date, value}] (>= 2 points) ou [] si données invalides. Pur + testé.
function weightForecast(current, target, ratePerWeek, weeks, todayKey) {
  const c = Number(current), tg = Number(target), rate = Math.abs(Number(ratePerWeek)) || 0;
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  const w = Math.max(0, Math.round(Number(weeks) || 0));
  if (!(c > 0) || !(tg > 0) || !t || w <= 0 || rate <= 0) return [];
  const dir = tg < c ? -1 : 1;
  const start = new Date(+t[1], +t[2] - 1, +t[3]); start.setHours(0, 0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const out = [{ date: keyOf(start), value: Math.round(c * 10) / 10 }];
  for (let i = 1; i <= w; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i * 7);
    let v = c + dir * rate * i;
    v = dir < 0 ? Math.max(tg, v) : Math.min(tg, v);
    out.push({ date: keyOf(d), value: Math.round(v * 10) / 10 });
  }
  return out;
}

// Détecte une stagnation du poids sur ≥ 14 jours (≥ 3 pesées) et propose un ajustement calorique
// (~125 kcal/j) selon l'objectif : perte qui ne descend plus → baisser ; prise qui ne monte plus → monter.
// Renvoie { stagnating, suggestion:'reduce'|'increase'|null, delta, newTarget, ratePerWeek, message }. Pur + testé.
function calorieAdjustment(weights, goal, dailyTarget) {
  const list = (Array.isArray(weights) ? weights : [])
    .filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date || '')) && Number.isFinite(Number(w.value)))
    .map(w => ({ date: w.date, value: Number(w.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const dt = Number(dailyTarget) || 0;
  if (list.length < 3 || !(dt > 0) || (goal !== 'perte' && goal !== 'prise')) return { stagnating: false, suggestion: null };
  const recent = list.slice(-4), a = recent[0], b = recent[recent.length - 1];
  const days = (Date.parse(b.date + 'T12:00:00') - Date.parse(a.date + 'T12:00:00')) / 864e5;
  if (!(days >= 14)) return { stagnating: false, suggestion: null };
  const ratePerWeek = Math.round(((b.value - a.value) / days * 7) * 100) / 100;
  const delta = 125, d = Math.round(days);
  const rateTxt = `${ratePerWeek >= 0 ? '+' : ''}${ratePerWeek} kg/sem sur ${d} j`;
  if (goal === 'perte' && ratePerWeek >= -0.1)
    return { stagnating: true, suggestion: 'reduce', delta, newTarget: Math.max(1200, dt - delta), ratePerWeek, message: `Ton poids stagne (${rateTxt}). Baisse d'environ ${delta} kcal/jour ou ajoute du cardio pour relancer la perte.` };
  if (goal === 'prise' && ratePerWeek <= 0.1)
    return { stagnating: true, suggestion: 'increase', delta, newTarget: dt + delta, ratePerWeek, message: `Ta prise stagne (${rateTxt}). Ajoute environ ${delta} kcal/jour pour relancer la progression.` };
  return { stagnating: false, suggestion: null, ratePerWeek };
}

// Tendance de poids : rythme récent (kg/sem) sur les 6 dernières mesures, direction,
// et estimation de semaines pour atteindre la cible si on va dans le bon sens. Pur + testé.
// weights : [{date:'YYYY-MM-DD', value}]. Retourne null si < 2 mesures exploitables.
function weightTrend(weights, target) {
  const list = (Array.isArray(weights) ? weights : [])
    .filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date || '')) && Number.isFinite(Number(w.value)))
    .map(w => ({ date: w.date, value: Number(w.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (list.length < 2) return null;
  const recent = list.slice(-6), a = recent[0], b = recent[recent.length - 1];
  const days = (new Date(b.date + 'T12:00:00') - new Date(a.date + 'T12:00:00')) / 864e5;
  if (!(days > 0)) return null;
  const ratePerWeek = Math.round(((b.value - a.value) / days * 7) * 100) / 100;
  const direction = ratePerWeek <= -0.05 ? 'down' : ratePerWeek >= 0.05 ? 'up' : 'flat';
  const tgt = Number(target);
  let toTarget = null, weeksToTarget = null, onTrack = null;
  if (Number.isFinite(tgt) && tgt > 0) {
    toTarget = Math.round((tgt - b.value) * 10) / 10;   // + = doit prendre, − = doit perdre
    if (Math.abs(toTarget) < 0.1) { weeksToTarget = 0; onTrack = true; }
    else if (Math.abs(ratePerWeek) >= 0.05 && Math.sign(ratePerWeek) === Math.sign(toTarget)) {
      weeksToTarget = Math.max(1, Math.round(toTarget / ratePerWeek));
      onTrack = true;
    } else onTrack = false;
  }
  return { ratePerWeek, direction, toTarget, weeksToTarget, onTrack, current: b.value };
}

// Totaux cumulés « à vie » à partir de l'état. Pur + testé.
function lifetimeStats(state) {
  const s = state && typeof state === 'object' ? state : {};
  const arr = k => Array.isArray(s[k]) ? s[k] : [];
  const workouts = arr('workouts'), focus = arr('focusSessions');
  const num = (v) => Number(v) || 0;
  return {
    workouts: workouts.length,
    workoutMinutes: workouts.reduce((a, w) => a + num(w && w.duration), 0),
    runKm: Math.round(workouts.filter(w => w && w.type === 'run').reduce((a, w) => a + num(w.distance), 0) * 10) / 10,
    focusSessions: focus.length,
    focusMinutes: focus.reduce((a, f) => a + num(f && f.minutes), 0),
    xp: Math.max(0, Math.round(num(s.xp)))
  };
}

// Succès (badges) calculés à partir de l'état complet. Pur + testé.
// Retourne { badges:[{id,emoji,title,desc,unlocked}], unlocked, total }.
function computeAchievements(state) {
  const s = state && typeof state === 'object' ? state : {};
  const arr = k => Array.isArray(s[k]) ? s[k] : [];
  const workouts = arr('workouts'), focus = arr('focusSessions'), habits = arr('habits'),
    nutrition = arr('nutrition'), measurements = arr('measurements'), quests = arr('quests'),
    agenda = arr('agenda'), weights = arr('weights');
  const hasType = t => workouts.some(w => w && w.type === t);
  const studyDone = agenda.filter(a => a && a.kind === 'study' && a.completed).length;
  const waterGoal = 8;
  const bestWater = nutrition.reduce((mx, n) => Math.max(mx, Number(n && n.water) || 0), 0);
  const runKmTotal = workouts.filter(w => w && w.type === 'run').reduce((a, w) => a + (Number(w.distance) || 0), 0);
  const totalTonnage = lifetimeTonnage(workouts);
  const goals = s.goals && typeof s.goals === 'object' ? s.goals : {};
  const targetW = Number(goals.targetWeight) || 0, curW = weights.length ? Number(weights[weights.length - 1].value) || 0 : 0;
  const weightGoalHit = targetW > 0 && curW > 0 && Math.abs(curW - targetW) <= 0.5;
  const strengthNames = new Set(workouts.filter(w => w && w.type === 'strength').flatMap(w => Array.isArray(w.exercises) ? w.exercises.map(e => e && e.name) : []).filter(Boolean));
  const defs = [
    ['first-quest', '⚔️', 'Première quête', 'Valide une quête du jour.', quests.some(q => q && q.done)],
    ['focus-found', '⏳', 'Focus trouvé', 'Termine un premier bloc de concentration.', (Number(s.timerRuns) || 0) > 0 || focus.length > 0],
    ['streak-3', '🔥', 'Série de 3 jours', 'Garde ta série active 3 jours.', (Number(s.streak) || 0) >= 3],
    ['first-workout', '👟', 'En mouvement', 'Enregistre ta première séance.', workouts.length >= 1],
    ['workouts-10', '🏋️', 'Assidu·e', 'Enregistre 10 séances.', workouts.length >= 10],
    ['first-strength', '💪', 'Première fonte', 'Note une séance de musculation.', hasType('strength')],
    ['first-run', '🏃', 'Premier run', 'Note une sortie course.', hasType('run')],
    ['hydrated', '💧', 'Bien hydraté', `Atteins ${waterGoal} verres d'eau un jour.`, bestWater >= waterGoal],
    ['focus-10', '🧠', 'Marathon mental', 'Cumule 10 blocs de focus.', focus.length >= 10],
    ['race-goal', '🎯', 'Cap fixé', 'Définis une course objectif.', !!(s.raceGoal && s.raceGoal.date)],
    ['body-track', '📏', 'Miroir', 'Enregistre 2 mensurations.', measurements.length >= 2],
    ['weigh-in', '⚖️', 'Sur la balance', 'Note un premier poids.', weights.length >= 1],
    ['study-5', '📚', 'Réviseur', 'Valide 5 créneaux de révision.', studyDone >= 5],
    ['habit-built', '🌱', 'Rituel ancré', 'Crée une habitude.', habits.length >= 1],
    ['streak-7', '🔥', 'Semaine de feu', 'Garde ta série active 7 jours.', (Number(s.streak) || 0) >= 7],
    ['streak-30', '🌋', 'Inarrêtable', 'Garde ta série active 30 jours.', (Number(s.streak) || 0) >= 30],
    ['workouts-50', '🏅', 'Pilier', 'Enregistre 50 séances.', workouts.length >= 50],
    ['tonnage-10t', '🐘', '10 tonnes', 'Soulève 10 000 kg cumulés.', totalTonnage >= 10000],
    ['run-100', '🌍', 'Bornes avalées', 'Cours 100 km au total.', runKmTotal >= 100],
    ['objective-set', '🧭', 'Cap physique', 'Choisis un objectif de programme auto.', !!s.fitnessObjective],
    ['weight-goal', '🎖️', 'Cible atteinte', 'Atteins ta cible de poids.', weightGoalHit],
    ['variety', '🎨', 'Touche-à-tout', 'Travaille 8 exercices de muscu différents.', strengthNames.size >= 8],
  ];
  const badges = defs.map(([id, emoji, title, desc, unlocked]) => ({ id, emoji, title, desc, unlocked: !!unlocked }));
  return { badges, unlocked: badges.filter(b => b.unlocked).length, total: badges.length };
}

// Interprète l'évolution poids vs tour de taille : détecte une recomposition (poids stable, taille qui baisse),
// une perte de gras nette, ou une prise. Retourne { key, message } ou null. Pur + testé.
function recompositionInsight(weightDeltaKg, waistDeltaCm) {
  const w = Number(weightDeltaKg), t = Number(waistDeltaCm);
  if (!Number.isFinite(w) || !Number.isFinite(t)) return null;
  if (t <= -1 && Math.abs(w) < 1)
    return { key: 'recomp', message: 'Ton poids bouge peu mais ton tour de taille baisse : recomposition en cours — tu perds du gras et gardes ton muscle. 💪' };
  if (t <= -1 && w <= -1)
    return { key: 'fatloss', message: 'Poids et tour de taille en baisse : la perte de gras est bien engagée.' };
  if (t >= 1 && w >= 1)
    return { key: 'gain', message: 'Poids et tour de taille montent : en prise de muscle, surveille que la taille ne grimpe pas trop (gras).' };
  return null;
}

// Évolution d'une mensuration (waist/chest/arm…) : première vs dernière valeur > 0.
// measurements : [{date, <field>}]. Retourne {latest, first, delta, count, date} ou null. Pur + testé.
function measurementDelta(measurements, field) {
  const list = (Array.isArray(measurements) ? measurements : [])
    .filter(m => m && Number(m[field]) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(m.date || '')))
    .map(m => ({ date: m.date, value: Number(m[field]) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!list.length) return null;
  const first = list[0], last = list[list.length - 1];
  return { latest: last.value, first: first.value, delta: Math.round((last.value - first.value) * 10) / 10, count: list.length, date: last.date };
}

// Records battus entre deux instantanés de personalRecords (avant/après une séance).
// before/after : { name: {load, reps, date} }. Retourne [{name, load, reps, loadPr, repsPr}]. Pur + testé.
function newRecords(before, after) {
  const b = before && typeof before === 'object' ? before : {};
  const a = after && typeof after === 'object' ? after : {};
  const out = [];
  Object.keys(a).forEach(name => {
    const cur = a[name] || {}, prev = b[name] || { load: 0, reps: 0 };
    const loadPr = (Number(cur.load) || 0) > (Number(prev.load) || 0);
    const repsPr = (Number(cur.reps) || 0) > (Number(prev.reps) || 0);
    if (loadPr || repsPr) out.push({ name, load: Number(cur.load) || 0, reps: Number(cur.reps) || 0, loadPr, repsPr });
  });
  return out;
}

// Séances contenant un exercice donné (dans exercises[] ou le champ top-level `exercise`).
// name vide ou 'all' → toutes les séances (copie). Pur + testé.
function workoutsWithExercise(workouts, name) {
  const list = Array.isArray(workouts) ? workouts : [];
  const n = typeof name === 'string' ? name.trim() : '';
  if (!n || n === 'all') return list.slice();
  return list.filter(w => w && (w.exercise === n || (Array.isArray(w.exercises) && w.exercises.some(ex => ex && ex.name === n))));
}

// Tableau texte de l'historique d'entraînement (une ligne par séance), séparateur au choix
// (défaut TAB → collage direct dans Excel). En-tête inclus. Pur + testé.
function workoutsTable(workouts, sep) {
  const s = sep || '\t';
  const clean = v => String(v == null ? '' : v).replace(/[\t\r\n;]/g, ' ').trim();
  const header = ['Date', 'Type', 'Durée (min)', 'Distance (km)', 'RPE', 'Exercices'];
  const rows = (Array.isArray(workouts) ? workouts : [])
    .filter(w => w && w.date)
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(w => {
      const exos = Array.isArray(w.exercises) && w.exercises.length
        ? w.exercises.filter(x => x && x.name).map(x => x.name).join(', ')
        : (w.exercise || '');
      return [clean(w.date), clean(w.type), clean(w.duration), w.distance ? clean(w.distance) : '', clean(w.effort), clean(exos)].join(s);
    });
  return [header.join(s)].concat(rows).join('\n');
}

// Dernière séance loggée d'un des types voulus (défaut muscu/renfo) ayant des exercices.
// Retourne la séance {date, type, exercises} la plus récente, ou null. Pur + testé.
function lastLoggedSession(workouts, types) {
  const wanted = Array.isArray(types) && types.length ? types : ['strength', 'conditioning'];
  return (Array.isArray(workouts) ? workouts : [])
    .filter(w => w && wanted.includes(w.type) && Array.isArray(w.exercises) && w.exercises.length && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date || '')))
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

// Noms d'exercices déjà réalisés au moins une fois (historique de séances). Pur + testé.
function loggedExerciseNames(workouts) {
  const set = new Set();
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    if (!w) return;
    if (w.exercise) set.add(w.exercise);
    if (Array.isArray(w.exercises)) w.exercises.forEach(ex => { if (ex && ex.name) set.add(ex.name); });
  });
  return [...set];
}

// Tonnage total (kg soulevés) d'une séance : somme sur les exercices de charge × reps × séries,
// en privilégiant les séries réellement validées (setLogs complétés). Pur + testé.
function workoutTonnage(workout) {
  if (!workout || !Array.isArray(workout.exercises)) return 0;
  return workout.exercises.reduce((sum, ex) => {
    if (!ex) return sum;
    if (Array.isArray(ex.setLogs) && ex.setLogs.length) {
      const done = ex.setLogs.filter(x => x && x.completed);
      const arr = done.length ? done : ex.setLogs;
      return sum + arr.reduce((s, x) => s + (Number(x && x.load) || 0) * (Number(x && x.reps) || 0), 0);
    }
    return sum + (Number(ex.load) || 0) * (Number(ex.reps) || 0) * (Number(ex.sets) || 0);
  }, 0);
}

// Tonnage cumulé sur toutes les séances (Σ workoutTonnage) : « poids total soulevé à vie ». Pur + testé.
function lifetimeTonnage(workouts) {
  return (Array.isArray(workouts) ? workouts : []).reduce((sum, w) => sum + workoutTonnage(w), 0);
}
// Tonnage des séries validées (completed) sur une liste d'exercices : Σ charge × reps
// des séries cochées. Sert de compteur en direct pendant une séance guidée. Pur + testé.
function completedTonnage(exercises) {
  return (Array.isArray(exercises) ? exercises : []).reduce((sum, ex) => {
    if (!ex || !Array.isArray(ex.setLogs)) return sum;
    return sum + ex.setLogs.filter(s => s && s.completed).reduce((a, s) => a + (Number(s.load) || 0) * (Number(s.reps) || 0), 0);
  }, 0);
}
// Bilan de fin de séance guidée : tonnage validé, nb de séries, nb d'exercices, et records
// potentiellement battus (comparaison des meilleures séries validées vs records antérieurs).
// priorRecords = sortie de personalRecords(state.workouts) AVANT enregistrement. Pur + testé.
function sessionSummary(exercises, priorRecords) {
  const list = Array.isArray(exercises) ? exercises : [];
  const after = {};
  list.forEach(ex => {
    if (!ex || !ex.name) return;
    (Array.isArray(ex.setLogs) ? ex.setLogs : []).filter(s => s && s.completed).forEach(s => {
      const load = Number(s.load) || 0, reps = Number(s.reps) || 0;
      const cur = after[ex.name] || { load: 0, reps: 0 };
      after[ex.name] = { load: Math.max(cur.load, load), reps: Math.max(cur.reps, reps) };
    });
  });
  return { tonnage: completedTonnage(list), sets: completedSetCount(list), exercises: Object.keys(after).length, prs: newRecords(priorRecords || {}, after) };
}
// Nombre de séries validées (completed) sur une liste d'exercices. Pur + testé.
function completedSetCount(exercises) {
  return (Array.isArray(exercises) ? exercises : []).reduce((n, ex) =>
    n + (ex && Array.isArray(ex.setLogs) ? ex.setLogs.filter(s => s && s.completed).length : 0), 0);
}

// Distance de course (km) cumulée sur une fenêtre [sinceKey..untilKey]. Pur + testé.
function runKmInWindow(workouts, sinceKey, untilKey) {
  return (Array.isArray(workouts) ? workouts : []).reduce((sum, w) => {
    if (!w || w.type !== 'run' || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.date || ''))) return sum;
    if (w.date < sinceKey || w.date > untilKey) return sum;
    return sum + (Number(w.distance) || 0);
  }, 0);
}

// Synthèse endurance à partir des sorties course (type 'run') : km sur 7 j, km sur 28 j,
// nb de sorties sur 28 j et plus longue sortie sur 28 j (km + date). Null si aucune sortie. Pur + testé.
function trailReadiness(workouts, todayKey) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return null;
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  let week = 0, month = 0, runs = 0, longest = null;
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    if (!w || w.type !== 'run') return;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w.date || '')); if (!m) return;
    const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
    const days = Math.round((today - d) / 86400000);
    if (days < 0 || days > 27) return;
    const km = Number(w.distance) || 0;
    month += km; runs++;
    if (days <= 6) week += km;
    if (km > 0 && (!longest || km > longest.km)) longest = { km: Math.round(km * 10) / 10, date: w.date };
  });
  if (!runs) return null;
  return { weekKm: Math.round(week * 10) / 10, monthKm: Math.round(month * 10) / 10, runs, longRun: longest };
}

// Progression du volume de course semaine sur semaine (règle des +10 %/sem).
// this = km sur 0-6 j, last = km sur 7-13 j. Renvoie {thisWeekKm, lastWeekKm, rampPct, zone}
// zone : start (pas de semaine précédente) · high (>30 %) · build (10-30 %) · steady (-10..10 %) · down (<-10 %).
// Null si aucun km sur les deux semaines. Pur + testé.
function weeklyKmRamp(workouts, todayKey) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return null;
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  let thisWk = 0, lastWk = 0;
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    if (!w || w.type !== 'run') return;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w.date || '')); if (!m) return;
    const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
    const days = Math.round((today - d) / 86400000), km = Number(w.distance) || 0;
    if (days >= 0 && days <= 6) thisWk += km;
    else if (days >= 7 && days <= 13) lastWk += km;
  });
  thisWk = Math.round(thisWk * 10) / 10; lastWk = Math.round(lastWk * 10) / 10;
  if (thisWk === 0 && lastWk === 0) return null;
  if (lastWk === 0) return { thisWeekKm: thisWk, lastWeekKm: 0, rampPct: null, zone: 'start' };
  const rampPct = Math.round((thisWk - lastWk) / lastWk * 100);
  const zone = rampPct > 30 ? 'high' : rampPct >= 10 ? 'build' : rampPct >= -10 ? 'steady' : 'down';
  return { thisWeekKm: thisWk, lastWeekKm: lastWk, rampPct, zone };
}

// Allure de course : à partir de la distance (km) et de la durée (min), renvoie
// { secPerKm, label:'m:ss' } en minutes:secondes par km, ou null si entrées invalides. Pur + testé.
function runPace(distanceKm, durationMin) {
  const d = Number(distanceKm), m = Number(durationMin);
  if (!(d > 0) || !(m > 0)) return null;
  const secPerKm = Math.round((m * 60) / d);
  const mm = Math.floor(secPerKm / 60), ss = secPerKm % 60;
  return { secPerKm, label: `${mm}:${String(ss).padStart(2, '0')}` };
}

// Somme d'une liste de durées (minutes) — total d'une séance. Arrondi, valeurs invalides ignorées. Pur + testé.
function sessionMinutes(list) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((s, m) => s + Math.max(0, Math.round(Number(m) || 0)), 0);
}

// Formate des secondes en horloge m:ss (ex. 90 → "1:30"). Négatif/invalide → "0:00". Pur + testé.
function formatClock(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
// Largeur (%) de la barre de repos = temps restant / temps total. Bornée 0-100. Pur + testé.
function restBarPct(remaining, total) {
  const t = Number(total), r = Number(remaining);
  if (!(t > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round(Math.max(0, r) / t * 100)));
}
// Ajuste une durée de repos de `delta` secondes, bornée [0, 600]. Pur + testé.
function adjustRestSeconds(current, delta) {
  return Math.max(0, Math.min(600, Math.round((Number(current) || 0) + (Number(delta) || 0))));
}

// Estimation du 1RM (charge maximale théorique) via la formule d'Epley :
// 1RM = charge × (1 + reps/30). Retourne kg arrondi à 0,5, ou null si entrées invalides. Pur + testé.
function estimate1RM(load, reps) {
  const w = Number(load), r = Math.round(Number(reps));
  if (!(w > 0) || !(r >= 1) || r > 30) return null;
  const est = r === 1 ? w : w * (1 + r / 30);
  return Math.round(est * 2) / 2;
}

// Table de charges d'entraînement à partir d'un 1RM estimé : intensités classiques
// (% du 1RM), charge arrondie à 0,5 kg et plage de reps + objectif. [] si 1RM invalide. Pur + testé.
function loadPercentages(oneRm) {
  const rm = Number(oneRm);
  if (!(rm > 0)) return [];
  return [
    { pct: 60, reps: '12–15', focus: 'Endurance de force' },
    { pct: 70, reps: '10–12', focus: 'Hypertrophie' },
    { pct: 80, reps: '6–8', focus: 'Force' },
    { pct: 90, reps: '3–5', focus: 'Force max' },
  ].map(r => ({ ...r, load: Math.round(rm * r.pct / 100 * 2) / 2 }));
}

// Suggestion de progression (double progression) pour un exercice chargé.
// Cherche la dernière séance (par date) où l'exercice a une charge ET des reps
// (meilleure série si setLogs), puis :
//   - reps ≥ haut de fourchette → +incrément kg, on repart au bas de fourchette ;
//   - sinon → même charge, +1 rep (plafonné au haut de fourchette).
// opts : { minReps=8, maxReps=12, increment=2.5 }. Null si aucune donnée chargée. Pur + testé.
function progressionSuggestion(workouts, name, opts) {
  if (!name) return null;
  const o = opts && typeof opts === 'object' ? opts : {};
  const minReps = Math.max(1, Math.round(Number(o.minReps) || 8));
  const maxReps = Math.max(minReps, Math.round(Number(o.maxReps) || 12));
  const inc = Number(o.increment) > 0 ? Number(o.increment) : 2.5;
  let best = null;
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    if (!w || !Array.isArray(w.exercises) || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.date || ''))) return;
    w.exercises.forEach(ex => {
      if (!ex || ex.name !== name) return;
      let load = Number(ex.load) || 0, reps = Number(ex.reps) || 0;
      if (Array.isArray(ex.setLogs) && ex.setLogs.length) {
        ex.setLogs.forEach(s => {
          const l = Number(s && s.load) || 0, r = Number(s && s.reps) || 0;
          if (l > load || (l === load && r > reps)) { load = l; reps = r; }
        });
      }
      if (!(load > 0) || !(reps > 0)) return;
      if (!best || w.date >= best.date) best = { date: w.date, load, reps };
    });
  });
  if (!best) return null;
  const atTop = best.reps >= maxReps;
  const nextLoad = atTop ? Math.round((best.load + inc) * 2) / 2 : best.load;
  const nextReps = atTop ? minReps : Math.min(maxReps, best.reps + 1);
  return { action: atTop ? 'weight' : 'reps', nextLoad, nextReps, lastLoad: best.load, lastReps: best.reps, minReps, maxReps, increment: inc, date: best.date };
}
// Formate une suggestion de progression en phrase FR. Pur + testé.
function progressionText(s) {
  if (!s || typeof s !== 'object') return '';
  const kg = n => (Math.round(Number(n) * 2) / 2).toString().replace('.', ',');
  if (s.action === 'weight') return `🎯 ${s.lastReps} reps atteintes à ${kg(s.lastLoad)} kg : monte à ${kg(s.nextLoad)} kg et repars à ${s.nextReps} reps.`;
  return `🎯 Dernier : ${s.lastReps} reps à ${kg(s.lastLoad)} kg → vise ${s.nextReps} reps à ${kg(s.nextLoad)} kg (puis +${kg(s.increment)} kg au bout de ${s.maxReps}).`;
}

// Série du 1RM estimé d'un exercice : meilleur 1RM (Epley) par jour de séance,
// N dernières séances, ancien→récent. [{date, e1rm}]. Ignore les séries sans charge. Pur + testé.
function estimatedOneRmSeries(workouts, name, limit) {
  if (!name) return [];
  const lim = Math.max(1, Math.min(30, Math.round(Number(limit) || 8)));
  const byDate = new Map();
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.date || ''))) return;
    const exos = Array.isArray(w.exercises) && w.exercises.length ? w.exercises
      : (w.exercise ? [{ name: w.exercise, load: w.load, reps: w.reps }] : []);
    exos.forEach(ex => {
      if (!ex || ex.name !== name) return;
      (Array.isArray(ex.setLogs) && ex.setLogs.length ? ex.setLogs : [{ load: ex.load, reps: ex.reps }]).forEach(s => {
        const e = estimate1RM(Number(s && s.load) || 0, Number(s && s.reps) || 0);
        if (e != null) byDate.set(w.date, Math.max(byDate.get(w.date) || 0, e));
      });
    });
  });
  return [...byDate.entries()].map(([date, e1rm]) => ({ date, e1rm }))
    .sort((a, b) => a.date.localeCompare(b.date)).slice(-lim);
}

// Détecte un plateau de force : si sur les `window` dernières séances la meilleure valeur
// (ex. 1RM estimé) n'a pas dépassé celle d'avant la fenêtre, renvoie { plateau, sessions, best, advice }.
// null si historique insuffisant ou progression détectée. Pur + testé.
function strengthPlateau(values, window) {
  const arr = (Array.isArray(values) ? values : []).map(Number).filter(x => x > 0);
  const w = Math.max(3, Math.round(Number(window) || 3));
  if (arr.length < w + 1) return null;
  const before = arr.slice(0, arr.length - w);
  const bestBefore = Math.max(...before);
  const bestRecent = Math.max(...arr.slice(-w));
  if (bestRecent > bestBefore) return null;
  return { plateau: true, sessions: w, best: Math.round(bestBefore * 10) / 10, advice: 'Plateau : change une variable — +1 répétition, tempo plus lent, ou décharge 1 semaine puis reprends un peu plus lourd.' };
}

// Série de volume (charge×reps×séries) d'un exercice, une valeur par jour de séance,
// N dernières séances (ancien→récent). entries : [{name, date, volume}]. Pur + testé.
function exerciseVolumeSeries(entries, name, limit) {
  if (!Array.isArray(entries) || !name) return [];
  const lim = Math.max(1, Math.min(30, Math.round(Number(limit) || 8)));
  const byDate = new Map();
  entries.forEach(e => {
    if (!e || e.name !== name || !/^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ''))) return;
    const v = Math.max(0, Math.round(Number(e.volume) || 0));
    byDate.set(e.date, (byDate.get(e.date) || 0) + v);
  });
  return [...byDate.entries()]
    .map(([date, volume]) => ({ date, volume }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-lim);
}

// Nombre de jours (fenêtre [sinceKey..todayKey]) où un champ atteint la cible.
// records : [{date, <field>}]. Agrège par date (max). Pur + testé.
function daysHittingTarget(records, field, target, sinceKey, todayKey) {
  const tgt = Number(target);
  if (!(tgt > 0)) return 0;
  const byDate = {};
  (Array.isArray(records) ? records : []).forEach(n => {
    if (!n || !/^\d{4}-\d{2}-\d{2}$/.test(String(n.date || ''))) return;
    if (n.date < sinceKey || n.date > todayKey) return;
    byDate[n.date] = Math.max(byDate[n.date] || 0, Number(n[field]) || 0);
  });
  return Object.values(byDate).filter(v => v >= tgt).length;
}
// Jours ≥ cible de protéines sur la fenêtre (délègue à daysHittingTarget). Pur + testé.
function proteinDaysOnTarget(nutrition, target, sinceKey, todayKey) {
  return daysHittingTarget(nutrition, 'protein', target, sinceKey, todayKey);
}

// Score de forme du jour (0-100) à partir d'un check-in {sleep(h), fatigue(1-5), soreness(1-5)}.
// Sommeil pèse 40, fatigue 30, courbatures 30 (1 = mieux). Retourne { score, label } ou null. Pur + testé.
function readinessScore(recovery) {
  const r = recovery && typeof recovery === 'object' ? recovery : null;
  if (!r) return null;
  const sleep = Math.max(0, Math.min(12, Number(r.sleep) || 0));
  const fatigue = Math.max(1, Math.min(5, Number(r.fatigue) || 3));
  const soreness = Math.max(1, Math.min(5, Number(r.soreness) || 3));
  const score = Math.round(Math.min(1, sleep / 8) * 40 + ((5 - fatigue) / 4) * 30 + ((5 - soreness) / 4) * 30);
  const label = score >= 75 ? 'Prêt à pousser' : score >= 50 ? 'Correct — garde une marge' : 'Récupération prioritaire';
  return { score, label };
}

// Tendance de forme : score de readiness des N derniers check-ins (ancien→récent),
// + delta entre le premier et le dernier de la fenêtre. Null si < 2 check-ins. Pur + testé.
function readinessTrend(recoveryList, limit) {
  const lim = Math.max(2, Math.min(30, Math.round(Number(limit) || 8)));
  const pts = (Array.isArray(recoveryList) ? recoveryList : [])
    .filter(r => r && /^\d{4}-\d{2}-\d{2}$/.test(String(r.date || '')))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-lim)
    .map(r => { const rs = readinessScore(r); return { date: r.date, score: rs ? rs.score : 0 }; });
  if (pts.length < 2) return null;
  const delta = pts[pts.length - 1].score - pts[0].score;
  const direction = delta >= 5 ? 'up' : delta <= -5 ? 'down' : 'flat';
  return { points: pts, delta, direction, latest: pts[pts.length - 1].score };
}

// Dette de sommeil sur une fenêtre : somme des heures manquantes sous la cible
// (défaut 7,5 h), en ne comptant que les nuits renseignées (sleep > 0). Pur + testé.
// recovery : [{date, sleep}]. Retourne { debt, nights, target, avg }.
function sleepDebtHours(recovery, target, sinceKey, todayKey) {
  const tgt = Number(target) > 0 ? Number(target) : 7.5;
  const byDate = {};
  (Array.isArray(recovery) ? recovery : []).forEach(r => {
    if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) return;
    if (r.date < sinceKey || r.date > todayKey) return;
    byDate[r.date] = Number(r.sleep) || 0;
  });
  let debt = 0, nights = 0, sum = 0;
  Object.values(byDate).forEach(s => { if (s > 0) { nights++; sum += s; if (s < tgt) debt += (tgt - s); } });
  return { debt: Math.round(debt * 10) / 10, nights, target: tgt, avg: nights ? Math.round((sum / nights) * 10) / 10 : 0 };
}

// Objectif d'eau du jour : base (défaut 8 verres) + 2 les jours d'entraînement
// (besoins accrus par la sudation). Borné [1..20]. Pur + testé.
function waterGoalFor(base, trainedToday) {
  const b = Math.max(1, Math.min(20, Math.round(Number(base) || 8)));
  return trainedToday ? Math.min(20, b + 2) : b;
}

// Hydratation du jour : compte de verres (1 verre ≈ 0,25 L) vs objectif. Pur + testé.
function waterStatus(waterLog, dateKey, goal) {
  const g = Math.max(1, Math.min(20, Math.round(Number(goal) || 8)));
  const count = Math.max(0, Math.min(40, Math.round(Number((waterLog && waterLog[dateKey]) || 0))));
  return { count, goal: g, liters: Math.round(count * 0.25 * 10) / 10, pct: Math.min(100, Math.round((count / g) * 100)), done: count >= g };
}

// Un événement d'agenda correspond-il à une recherche texte (titre / lieu / notes) ? Pur + testé.
function agendaMatch(item, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  if (!item) return false;
  const hay = [item.title, item.location, item.notes].map(x => String(x || '').toLowerCase()).join(' ');
  return hay.includes(q);
}

// Répartit des événements datés (start/end en minutes) en colonnes pour la grille
// horaire : deux événements qui se chevauchent tombent côte à côte. Pur + testé.
// Renvoie, dans l'ordre d'entrée, { col, cols } (colonne occupée + nb de colonnes du groupe).
function dayColumns(events) {
  const list = (Array.isArray(events) ? events : []).map((e, i) => ({ start: Number(e.start) || 0, end: Math.max(Number(e.end) || 0, (Number(e.start) || 0) + 1), i }));
  const out = list.map(() => ({ col: 0, cols: 1 }));
  const order = list.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    if (!cluster.length) return;
    const colEnds = [];
    cluster.forEach(ev => {
      let placed = colEnds.findIndex(end => ev.start >= end);
      if (placed < 0) { placed = colEnds.length; colEnds.push(0); }
      colEnds[placed] = ev.end;
      out[ev.i].col = placed;
    });
    cluster.forEach(ev => { out[ev.i].cols = colEnds.length; });
    cluster = []; clusterEnd = -1;
  };
  order.forEach(ev => { if (cluster.length && ev.start >= clusterEnd) flush(); cluster.push(ev); clusterEnd = Math.max(clusterEnd, ev.end); });
  flush();
  return out;
}

// Planificateur intelligent : combine plusieurs objectifs de muscu/renfo + des runs
// en UNE semaine type. Répartit les zones sur les jours de force, intercale les runs
// pour espacer les jours durs, place la sortie longue le week-end. Pur + testé.
const WEEKDAY_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
function buildTrainingWeek(zones, strengthDays, runs, sameDay) {
  zones = (Array.isArray(zones) ? zones : []).filter(z => TRAINING_GOALS.some(g => g.id === z));
  if (!zones.length) return null;
  strengthDays = Math.max(1, Math.min(6, Math.round(Number(strengthDays) || 3)));
  runs = Math.max(0, Math.min(5, Math.round(Number(runs) || 0)));
  sameDay = Boolean(sameDay);
  if (!sameDay && strengthDays + runs > 6) runs = Math.max(0, 6 - strengthDays); // ≥ 1 jour de repos
  const labelOf = z => (TRAINING_GOALS.find(g => g.id === z) || {}).label || z;
  const layouts = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
  // Séances de force : chaque jour prend une (ou plusieurs) zones en tournant.
  const strengthSessions = [];
  for (let i = 0; i < strengthDays; i++) {
    const zs = [];
    for (let j = i; j < zones.length; j += strengthDays) zs.push(zones[j]);
    if (!zs.length) zs.push(zones[i % zones.length]);
    const per = Math.max(1, Math.round(5 / zs.length));
    let ex = [];
    zs.forEach(z => { ex = ex.concat(zoneTopExercises(z, per)); });
    ex = [...new Set(ex)].slice(0, 5);
    strengthSessions.push({ type: 'muscu', kind: 'sport', zones: zs, title: '💪 ' + zs.map(labelOf).join(' & '), exercises: ex });
  }
  // Runs : faciles, la dernière devient « sortie longue » s'il y en a ≥ 2.
  const runSessions = [];
  for (let i = 0; i < runs; i++) {
    const long = runs >= 2 && i === runs - 1;
    runSessions.push({ type: 'run', kind: 'sport', long, title: long ? '🏃 Sortie longue' : '🏃 Course facile', exercises: [] });
  }

  if (sameDay) {
    // Une journée = muscu + un/des runs (ex. muscu le matin, run plus tard).
    const wds = layouts[strengthDays] || layouts[6];
    const days = strengthSessions.map((s, i) => ({ weekday: wds[i], weekdayLabel: WEEKDAY_FR[wds[i]], ...s, runs: [] }));
    let ordered = runSessions.slice();
    const li = ordered.findIndex(r => r.long);
    const longRun = li >= 0 ? ordered.splice(li, 1)[0] : null;
    ordered.forEach((r, i) => { days[i % days.length].runs.push(r); });
    if (longRun) days[days.length - 1].runs.push(longRun); // sortie longue le dernier jour (week-end)
    return { zones, strengthDays, runs, sameDay: true, sessions: days.length, days };
  }

  // Jours séparés : intercalage muscu/run pour espacer les jours durs.
  const seq = []; let a = 0, b = 0;
  while (a < strengthSessions.length || b < runSessions.length) {
    if (a < strengthSessions.length) seq.push(strengthSessions[a++]);
    if (b < runSessions.length) seq.push(runSessions[b++]);
  }
  const wds = layouts[seq.length] || layouts[6];
  const days = seq.map((s, i) => ({ weekday: wds[i], weekdayLabel: WEEKDAY_FR[wds[i]], ...s }));
  const longIdx = days.findIndex(d => d.long);
  if (longIdx >= 0 && longIdx !== days.length - 1) {
    const target = days.length - 1;
    const tmpW = days[target].weekday, tmpL = days[target].weekdayLabel;
    days[target].weekday = days[longIdx].weekday; days[target].weekdayLabel = days[longIdx].weekdayLabel;
    days[longIdx].weekday = tmpW; days[longIdx].weekdayLabel = tmpL;
    days.sort((x, y) => x.weekday - y.weekday);
  }
  return { zones, strengthDays, runs, sameDay: false, sessions: days.length, days };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { localDate, nextThemeMode, resolveTheme, dateKey, weekStart, pct, levelFromXp, leveledUp, xpWithinLevel, computeStreak, nextStreakMilestone, normalizeAgendaItem, duplicateAgendaItem, departureInfo, reminderAnchorMinutes, dayPlannedMinutes, dayPlanText, AGENDA_KINDS, AGENDA_SOURCES, AGENDA_PRIORITIES, priorityRank, normalizeTodo, todosForDay, normalizeBirthday, birthdaysForDay, upcomingBirthdays, normalizeRecurring, recurrenceMatches, recurringOccurs, RECUR_FREQ, normalizeHabit, habitStreak, habitBestStreak, habitWeekMap, habitsForDay, icsEscape, buildIcs, buildRRuleLine, parseIcs, parseRRule, isPrivateHost, normalizeCalendarUrl, TRAVEL_HOSTS, isAllowedTravelUrl, buildGeocodeUrl, buildRouteUrl, haversineKm, travelModes, planStudySessions, mergePlannedEvents, todayItems, weekItems, glcPlanningToEvents, prescriptionFor, formatFor, mondayOf, weeklyAggregate, weeklySummary, weeklySummaryText, RACE_PRESETS, weeksBetween, weeklyWorkoutStreak, dailyStreak, trainingHeatmap, acuteChronicRatio, racePhase, raceGoalStatus, loadAdvice, daysUntil, examCountdown, examReminderDue, studyStats, keyDateMarkers, upcomingKeyDates, nextTrainingSession, RACE_LADDER, intermediateGoals, proteinTarget, hydrationPlan, buildWeekPlan, volumeRamp, warmupFor, cooldownFor, supplementTiming, generateMeals, MEAL_STYLES, buildShoppingList, remainingShopping, SHOPPING_STAPLES, TRAINING_GOALS, EXERCISE_ZONES, exerciseZones, equipmentOptions, toggleFavorite, weeklyZoneCoverage, weeklySetsPerZone, setLandmark, muscleBalance, zoneFreshness, suggestTrainingFocus, runPlanWeek, coachSessionLabel, neglectedZone, goalMatch, goalRank, zoneTopExercises, BODY_GOALS, bodyGoalWorkout, pickExercisesForZones, exerciseAvailable, filterByEquipment, EQUIP_LABELS, FITNESS_OBJECTIVES, objectiveProgram, objectiveNutrition, programWeekSummary, objectiveProgramText, blockPhase, progressSets, quickSessionPlan, buildZonePlan, buildTrainingWeek, WEEKDAY_FR, dayColumns, waterStatus, waterGoalFor, daysHittingTarget, proteinDaysOnTarget, basalMetabolicRate, bmiInfo, activityFactor, activityLevelFactor, dateAfterWeeks, paceStatus, energyPlan, calorieAdjustment, weightForecast, coachWeekPlan, mealSplit, nutritionTips, mealIdea, coachPlanText, coachSteps, weeklyAdherence, upsertAdherenceSnapshot, readinessScore, readinessTrend, sleepDebtHours, personalRecords, newRecords, weightTrend, measurementDelta, recompositionInsight, computeAchievements, lifetimeStats, lastLoggedSession, workoutsTable, workoutsWithExercise, loggedExerciseNames, exerciseVolumeSeries, estimatedOneRmSeries, strengthPlateau, estimate1RM, formatClock, restBarPct, adjustRestSeconds, loadPercentages, progressionSuggestion, progressionText, strengthRecords, nextStrengthMilestone, exerciseHistoryStats, sessionMinutes, workoutTonnage, lifetimeTonnage, completedTonnage, completedSetCount, sessionSummary, runPace, runKmInWindow, weeklyKmRamp, trailReadiness, agendaMatch };
}
