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
    completed: Boolean(x.completed)
  };
}

// Échappement RFC 5545 pour les valeurs texte iCalendar.
function icsEscape(text) { return String(text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }

// Construit un fichier iCalendar à partir des événements du calendrier unifié.
// DTEND = début + durationMin (défaut 60), UID stable <id>@irllvpup, lignes CRLF.
// `now` injectable pour des tests déterministes.
function buildIcs(events, now) {
  const pad = n => String(n).padStart(2, '0');
  const stamp = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  const dtstamp = stamp(now instanceof Date ? now : new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//IRL LVP UP//FR'];
  (events || []).forEach(a => {
    if (!a || !a.date || !a.time) return;
    const d = new Date(`${a.date}T${a.time}`);
    if (isNaN(d)) return;
    const end = new Date(d.getTime() + (Number(a.durationMin) || 60) * 60000);
    lines.push('BEGIN:VEVENT', `UID:${a.id}@irllvpup`, `DTSTAMP:${dtstamp}`, `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`, `SUMMARY:${icsEscape(a.title)}`, `CATEGORIES:${icsEscape(a.kind || 'life')}`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
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
    completed: Boolean(a.completed), planId: a.planId || null,
    type: a.planId ? 'plan' : (a.kind === 'study' ? 'study' : 'agenda')
  }));
  const seen = new Set(items.filter(i => i.planId).map(i => i.planId));
  plans.filter(p => !seen.has(p.id)).forEach(p => items.push({ id: p.id, time: p.time || '', title: `Séance · ${p.type}`, kind: 'sport', completed: false, planId: p.id, type: 'plan' }));
  return items.sort((x, y) => String(x.time).localeCompare(String(y.time)));
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

// ---- Compléments & ravitaillement (nutrition sportive, repères généraux) ----
// Cible protéique quotidienne (g/kg selon l'objectif). Repère, pas une prescription.
function proteinTarget(weightKg, goal) {
  const kg = Number(weightKg) || 75;
  const perKg = goal === 'force' ? 1.9 : goal === 'trail' ? 1.6 : 1.8;
  return { perKg, gramsPerDay: Math.round(kg * perKg / 5) * 5 };
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
  module.exports = { localDate, dateKey, weekStart, pct, levelFromXp, xpWithinLevel, computeStreak, normalizeAgendaItem, AGENDA_KINDS, AGENDA_SOURCES, icsEscape, buildIcs, planStudySessions, mergePlannedEvents, todayItems, weekItems, glcPlanningToEvents, prescriptionFor, formatFor, mondayOf, weeklyAggregate, weeklySummary, RACE_PRESETS, weeksBetween, racePhase, raceGoalStatus, RACE_LADDER, intermediateGoals, proteinTarget, hydrationPlan };
}
