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
function nextThemeMode(current) { const order = ['auto', 'light', 'dark', 'time']; const i = order.indexOf(current); return order[(i + 1) % order.length]; }
// Thème effectif ('light'|'dark') selon le mode choisi, la préférence système et l'heure (mode 'time').
// 'time' → clair de 7h à 18h59, sombre sinon (repli système si heure absente). Pur + testé.
function resolveTheme(mode, systemDark, hour) {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  if (mode === 'time') { const h = Number(hour); if (Number.isFinite(h)) return (h >= 7 && h < 19) ? 'light' : 'dark'; return systemDark ? 'dark' : 'light'; }
  return systemDark ? 'dark' : 'light';
}

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

// Salutation d'accueil personnalisée et selon l'heure : « Bonsoir Adrien » + un mot de contexte
// adapté au moment (matin : poser le cap ; soir : faire le bilan…). `name` optionnel (on garde le
// prénom), `hour` 0-23. Renvoie { hello, nudge }. Pur + testé.
function dailyGreeting(opts) {
  const o = opts || {};
  const h = Number.isFinite(Number(o.hour)) ? ((Math.floor(Number(o.hour)) % 24) + 24) % 24 : 12;
  const first = (typeof o.name === 'string' && o.name.trim()) ? ' ' + o.name.trim().split(/\s+/)[0].slice(0, 30) : '';
  let hello, nudge;
  if (h >= 5 && h < 12) { hello = 'Bonjour'; nudge = 'pose ton cap pour aujourd’hui'; }
  else if (h >= 12 && h < 18) { hello = 'Bon après-midi'; nudge = 'une petite victoire à cocher ?'; }
  else if (h >= 18 && h < 23) { hello = 'Bonsoir'; nudge = 'fais le bilan de ta journée'; }
  else { hello = 'Encore debout'; nudge = 'pense aussi à te reposer'; }
  return { hello: hello + first, nudge };
}

// Suggère des quêtes du jour depuis l'état réel : séance prévue non faite, protéines/eau non
// atteintes, focus manquant, habitude due. Renvoie [{key, name, category, xp}] (max 4), en
// excluant celles dont le nom est déjà dans state.quests. Pur + testé.
function suggestedQuests(state, todayKey) {
  const s = state || {};
  const today = String(todayKey || '');
  const arr = k => Array.isArray(s[k]) ? s[k] : [];
  const workouts = arr('workouts'), agenda = arr('agenda'), nutrition = arr('nutrition'), focus = arr('focusSessions');
  const existing = new Set(arr('quests').map(q => q && typeof q.name === 'string' ? q.name : ''));
  const n = nutrition.filter(x => x && x.date === today).slice(-1)[0] || {};
  const profile = s.profile && typeof s.profile === 'object' ? s.profile : {};
  const out = [];
  const push = (key, name, category, xp) => { if (!existing.has(name) && !out.some(o => o.name === name)) out.push({ key, name, category, xp }); };
  const trainedToday = workouts.some(w => w && w.date === today);
  const sportToday = agenda.some(a => a && a.kind === 'sport' && a.date === today && !a.completed);
  if (sportToday && !trainedToday) push('session', '🏋️ Fais ta séance du jour', 'health', 20);
  else if (!trainedToday) push('move', '👟 Bouge au moins 20 min', 'health', 15);
  const pt = proteinTarget(profile.weight, profile.goal);
  const pTarget = pt && Number(pt.gramsPerDay) || 0;
  if (pTarget > 0 && (Number(n.protein) || 0) < pTarget) push('protein', `🥩 Atteins tes protéines (${pTarget} g)`, 'health', 15);
  const waterGoal = waterGoalFor(8, trainedToday);
  if ((Number(n.water) || 0) < waterGoal) push('water', `💧 Bois tes ${waterGoal} verres d’eau`, 'health', 10);
  if (!focus.some(f => f && f.date === today)) push('focus', '🧠 Un bloc de concentration', 'focus', 15);
  const habitDue = habitsForDay(arr('habits'), today).filter(h => h && !h.done)[0];
  if (habitDue) push('habit', `🌱 ${habitDue.name}`, 'life', 10);
  return out.slice(0, 4);
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

// ---- Recherche d'alternance : suivi de candidatures + moteur de motivation quotidien ----
// Pipeline d'une candidature. `date` = jour d'envoi (vide tant que « à postuler »).
const JOB_STATUSES = ['a_postuler', 'postule', 'relance', 'entretien', 'accepte', 'refus'];
const JOB_STATUS_LABEL = { a_postuler: '📋 À postuler', postule: '📤 Postulé', relance: '🔁 Relancé', entretien: '🤝 Entretien', accepte: '🎉 Accepté', refus: '❌ Refusé' };
function normalizeApplication(item) {
  const x = item && typeof item === 'object' ? item : {};
  return {
    id: Number(x.id) || Date.now(),
    company: String(x.company || '').slice(0, 80),
    role: String(x.role || '').slice(0, 80),
    status: JOB_STATUSES.includes(x.status) ? x.status : 'a_postuler',
    date: typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : '',
    source: String(x.source || '').slice(0, 60),
    notes: String(x.notes || '').slice(0, 300),
    // score de la cible (0-10, vient de l'onglet Cibles) — null si inconnu.
    score: (() => { const n = Number(x.score); return Number.isFinite(n) && n >= 0 && n <= 10 ? Math.round(n * 10) / 10 : null; })(),
    createdAt: Number(x.createdAt) || Number(x.id) || Date.now()
  };
}

// Ordre d'affichage du suivi : par étape du pipeline, puis — pour les « à postuler » — par SCORE
// décroissant (les meilleures cibles en tête, celles sans note en queue) ; pour les autres étapes,
// par date décroissante (l'activité récente d'abord). Départage par date puis ancienneté. Pur + testé.
function compareApplications(a, b) {
  const sa = JOB_STATUSES.indexOf(a.status) - JOB_STATUSES.indexOf(b.status);
  if (sa) return sa;
  const scoreCmp = (b.score == null ? -1 : b.score) - (a.score == null ? -1 : a.score);
  const dateCmp = String(b.date).localeCompare(String(a.date));
  if (a.status === 'a_postuler') return scoreCmp || dateCmp || (b.createdAt - a.createdAt);
  return dateCmp || scoreCmp || (b.createdAt - a.createdAt);
}

// La « Cible du jour » : parmi les candidatures À POSTULER, la mieux notée (score de l'onglet
// Cibles), départage par nom. Répond à la vraie question quotidienne : « je postule à QUI
// aujourd'hui ? ». null si rien à postuler. Pur + testé.
function nextAlternanceTarget(applications) {
  const list = (Array.isArray(applications) ? applications : []).map(normalizeApplication).filter(a => a.status === 'a_postuler' && a.company);
  if (!list.length) return null;
  list.sort((a, b) => ((b.score == null ? -1 : b.score) - (a.score == null ? -1 : a.score)) || a.company.localeCompare(b.company, 'fr'));
  const t = list[0];
  return { id: t.id, company: t.company, role: t.role, source: t.source, score: t.score };
}
// Échéance « avant août » : le prochain 1er août (cette année, ou l'an prochain si déjà passé).
// Renvoie { date, daysLeft }. Pur + testé.
function alternanceDeadline(todayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  const y = +todayKey.slice(0, 4);
  let deadline = y + '-08-01';
  if (todayKey >= deadline) deadline = (y + 1) + '-08-01';
  const days = daysUntil(todayKey, deadline);
  return { date: deadline, daysLeft: days == null ? 0 : days };
}
// Le cœur MOTIVATION : compte les candidatures envoyées (aujourd'hui, cette semaine vs objectif), la
// SÉRIE de jours consécutifs avec au moins une candidature (finissant aujourd'hui ou hier), le funnel
// par statut, le taux de réponse, et les RELANCES à faire (postulé depuis >= relanceDays, sans suite).
// But affiché : pousser à postuler chaque jour. Pur + testé.
function applicationStats(applications, todayKey, opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  const goal = Math.max(1, Math.min(50, Math.round(Number(o.weekGoal) || 5)));
  const relanceDays = Math.max(2, Math.round(Number(o.relanceDays) || 7));
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const list = (Array.isArray(applications) ? applications : []).map(normalizeApplication);
  const byStatus = {}; JOB_STATUSES.forEach(s => { byStatus[s] = 0; });
  list.forEach(a => { byStatus[a.status]++; });
  const sent = list.filter(a => isKey(a.date));
  const appliedToday = isKey(todayKey) && sent.some(a => a.date === todayKey);
  let monday = '';
  const tm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (tm) { const d = new Date(+tm[1], +tm[2] - 1, +tm[3]); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); monday = dateKey(d); }
  const weekCount = monday ? sent.filter(a => a.date >= monday && a.date <= todayKey).length : 0;
  // Série
  const days = new Set(sent.map(a => a.date));
  let streak = 0;
  if (tm && days.size) {
    const cur = new Date(+tm[1], +tm[2] - 1, +tm[3]); cur.setHours(0, 0, 0, 0);
    if (!days.has(dateKey(cur))) cur.setDate(cur.getDate() - 1);
    while (days.has(dateKey(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  }
  const pendingRelances = isKey(todayKey) ? list.filter(a => a.status === 'postule' && isKey(a.date) && (daysUntil(a.date, todayKey) || 0) >= relanceDays).map(a => ({ id: a.id, company: a.company, days: daysUntil(a.date, todayKey) || 0 })).sort((x, y) => y.days - x.days) : [];
  const applied = byStatus.postule + byStatus.relance + byStatus.entretien + byStatus.accepte + byStatus.refus;
  const answered = byStatus.entretien + byStatus.accepte + byStatus.refus;
  return {
    total: list.length, sent: sent.length, byStatus,
    appliedToday, weekCount, weekGoal: goal, weekPct: Math.min(100, Math.round(weekCount / goal * 100)), weekReached: weekCount >= goal,
    streak, entretiens: byStatus.entretien + byStatus.accepte, accepted: byStatus.accepte,
    responseRate: applied > 0 ? Math.round(answered / applied * 100) : 0,
    pendingRelances
  };
}
// Parseur CSV minimal mais correct (gère les guillemets, virgules et sauts de ligne échappés). Pur.
function parseCsv(text) {
  const s = String(text || ''); const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',' || c === ';' || c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
// Import d'un export CSV (Google Sheets…) → candidatures. Détecte les colonnes par nom (entreprise,
// poste, statut, date, source, note), tolère l'absence d'en-tête (1re colonne = entreprise), mappe les
// statuts FR et les dates (YYYY-MM-DD ou JJ/MM/AAAA). Ignore les lignes sans entreprise. Pur + testé.
function parseApplicationsCsv(text) {
  const rows = parseCsv(text).filter(r => r.some(c => String(c || '').trim() !== ''));
  if (!rows.length) return [];
  const norm = x => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const header = rows[0].map(norm);
  const find = (...keys) => { for (const k of keys) { const i = header.findIndex(h => h.includes(k)); if (i >= 0) return i; } return -1; };
  const iCompany = find('entreprise', 'company', 'societe', 'employeur');
  const iRole = find('poste', 'role', 'intitule', 'metier');
  const iStatus = find('statut', 'status', 'etat', 'reponse');
  const iDate = find('date');
  const iSource = find('source', 'plateforme', 'site', 'via');
  const iNotes = find('note', 'commentaire', 'remarque');
  const hasHeader = iCompany >= 0 || iRole >= 0 || iStatus >= 0 || iDate >= 0;
  const ci = iCompany >= 0 ? iCompany : 0;
  const body = hasHeader ? rows.slice(1) : rows;
  const out = [];
  for (const r of body) {
    const company = String(r[ci] || '').trim();
    if (!company) continue;
    const status = iStatus >= 0 ? jobStatusFromText(r[iStatus]) : 'a_postuler';
    let date = iDate >= 0 ? jobDateFromText(r[iDate]) : '';
    out.push({ company: company.slice(0, 80), role: iRole >= 0 ? String(r[iRole] || '').trim().slice(0, 80) : '', status, date, source: iSource >= 0 ? String(r[iSource] || '').trim().slice(0, 60) : '', notes: iNotes >= 0 ? String(r[iNotes] || '').trim().slice(0, 300) : '' });
  }
  return out;
}

// Mappe un libellé de statut FR libre → l'une des 6 étapes du pipeline. Partagé par tous les imports
// (manuel + sync). « à contacter » (marqueur de prospection La Bonne Alternance) → à postuler ;
// « confirmé » = candidature confirmée envoyée (PAS accepté). Pur.
function jobStatusFromText(t) {
  const x = String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  if (/a postuler|a envoyer|a faire|a contacter|a verifier|trouver le contact|todo|prospect/.test(x)) return 'a_postuler';
  if (/relanc/.test(x)) return 'relance';
  if (/entretien|entrevue/.test(x)) return 'entretien';
  if (/accept|retenu|pris|embauch/.test(x)) return 'accepte';
  if (/refus|negati|decline|abandonn|ecart|sans suite/.test(x)) return 'refus';
  if (/postule|envoye|candidat|attente|en cours|contacte|mail envoye|confirm/.test(x)) return 'postule';
  return 'a_postuler';
}
// Extrait une date ISO d'un texte (ISO ou JJ/MM/AAAA). '' sinon. Pur.
// Borne mois 1-12 / jour 1-31 : une cellule aberrante (ex. « 13/45/2026 ») ne pollue plus la date
// d'une candidature — elle est ignorée ('') au lieu d'être stockée telle quelle. Si le motif ISO
// trouvé est hors bornes, on retombe sur le motif JJ/MM/AAAA (une vraie date peut suivre du bruit).
function jobDateFromText(t) {
  const s = String(t || '');
  const pad = (y, mo, d) => { const M = Number(mo), D = Number(d); return (M >= 1 && M <= 12 && D >= 1 && D <= 31) ? `${y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}` : ''; };
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(s); const isoDate = iso ? pad(iso[1], iso[2], iso[3]) : '';
  if (isoDate) return isoDate;
  const fr = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return fr ? pad(fr[3], fr[2], fr[1]) : '';
}

// Parse un CSV de CIBLES type La Bonne Alternance (colonnes « Entreprise », « Ville » = "Ville (NN)",
// « Score /10 », « Statut »…) en le FILTRANT — l'onglet fait ~15 000 lignes, on ne garde que les
// bonnes cibles proches. opts : { minScore, depts:[..], townDepts:{dept:[villes]}, max }.
//   - minScore : ne garde que Score/10 >= minScore (scores hors 0–10 = ligne écartée)
//   - depts : départements entièrement retenus (ex. ['35','56'])
//   - townDepts : pour un département partiel, villes autorisées (ex. { '22': ['loudeac'] })
//   - max : plafond de sécurité (défaut 800) pour ne jamais inonder le suivi
// Renvoie des candidatures normalisables (à postuler pour « à contacter »). Pur + testé.
function parseAlternanceTargets(text, opts) {
  const o = opts || {};
  const minScore = Number(o.minScore) || 0;
  const allowDepts = Array.isArray(o.depts) ? o.depts.map(String) : [];
  const townDepts = (o.townDepts && typeof o.townDepts === 'object') ? o.townDepts : {};
  const max = Math.max(1, Math.round(Number(o.max) || 800));
  const rows = parseCsv(text).filter(r => r.some(c => String(c || '').trim() !== ''));
  if (rows.length < 2) return [];
  const norm = x => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const header = rows[0].map(norm);
  const find = (...keys) => { for (const k of keys) { const i = header.findIndex(h => h.includes(k)); if (i >= 0) return i; } return -1; };
  const iCompany = find('entreprise', 'company', 'societe', 'employeur');
  if (iCompany < 0) return [];
  const iVille = find('ville', 'commune', 'localite');
  const iScore = header.findIndex(h => h.includes('score') && h.includes('10'));
  const iStatus = find('statut', 'status', 'etat');
  const iRole = find('poste', 'intitule', 'metier');
  const iNotes = find('pourquoi', 'note', 'commentaire', 'contexte');
  const deptOf = v => { const m = String(v || '').match(/\((\d{2})\)/); return m ? m[1] : ''; };
  const scoreOf = v => { const m = String(v || '').replace(',', '.').match(/^\s*(\d+(?:\.\d+)?)/); const n = m ? parseFloat(m[1]) : NaN; return (n >= 0 && n <= 10) ? n : NaN; };
  const geoOk = ville => {
    if (!allowDepts.length && !Object.keys(townDepts).length) return true;
    const d = deptOf(ville);
    if (allowDepts.includes(d)) return true;
    if (townDepts[d]) return townDepts[d].some(t => norm(ville).includes(norm(t)));
    return false;
  };
  const out = [];
  for (const r of rows.slice(1)) {
    const company = String(r[iCompany] || '').trim();
    if (!company) continue;
    if (minScore > 0 && iScore >= 0) { const sc = scoreOf(r[iScore]); if (!(sc >= minScore)) continue; }
    const ville = iVille >= 0 ? String(r[iVille] || '').trim() : '';
    if (!geoOk(ville)) continue;
    const sc = iScore >= 0 ? scoreOf(r[iScore]) : NaN;
    out.push({
      company: company.slice(0, 80),
      role: iRole >= 0 ? String(r[iRole] || '').trim().slice(0, 80) : '',
      status: iStatus >= 0 ? jobStatusFromText(r[iStatus]) : 'a_postuler',
      date: '',
      source: ville.slice(0, 60),
      notes: iNotes >= 0 ? String(r[iNotes] || '').trim().slice(0, 300) : '',
      score: Number.isFinite(sc) ? sc : null
    });
    if (out.length >= max) break;
  }
  return out;
}

// Routeur d'import d'un CSV Sheets : détecte un onglet de CIBLES type La Bonne Alternance (présence
// d'une colonne « Score …/10 » + une colonne « Ville ») → applique le filtre `parseAlternanceTargets`
// (opts) ; sinon c'est un onglet de suivi simple → `parseApplicationsCsv` (tout gardé). Pur + testé.
function parseSheetApplications(text, opts) {
  const rows = parseCsv(text);
  const header = (rows[0] || []).map(h => String(h || '').toLowerCase());
  const looksLikeTargets = header.some(h => h.includes('score') && h.includes('10')) && header.some(h => /ville|commune|localite/.test(h));
  return looksLikeTargets ? parseAlternanceTargets(text, opts) : parseApplicationsCsv(text);
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

// Applique une modification (nom et/ou jours) à une habitude en PRÉSERVANT id, historique (log),
// xp et createdAt — éditer ne doit pas faire perdre la série ni les 30 jours de régularité. Un nom
// vide ou une liste de jours vide sont ignorés (on garde l'existant). 7 jours cochés → [] (tous les
// jours, convention interne). Pur + testé.
function applyHabitEdit(habit, patch) {
  const h = normalizeHabit(habit);
  const p = patch || {};
  const name = (typeof p.name === 'string' && p.name.trim()) ? p.name.trim().slice(0, 70) : h.name;
  let weekdays = h.weekdays;
  if (Array.isArray(p.weekdays)) {
    const w = [...new Set(p.weekdays.map(Number).filter(n => n >= 0 && n <= 6))];
    if (w.length) weekdays = (w.length === 7) ? [] : w.sort((a, b) => a - b);
  }
  return { ...h, name, weekdays };
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

// Taux de régularité d'une habitude sur une fenêtre (défaut 30 j) : occurrences RÉALISÉES vs
// PRÉVUES (jours qui matchent ses `weekdays` ; aucun weekday = tous les jours). Complète la série
// (court terme, « je ne casse pas la chaîne ») par une vue LONG terme : « laquelle je tiens
// vraiment sur la durée ». Renvoie { done, scheduled, rate } (rate 0-100) ou null si aucune
// occurrence prévue dans la fenêtre. Pur + testé.
function habitConsistency(habit, todayKey, days) {
  const h = normalizeHabit(habit);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!m) return null;
  const win = Math.max(1, Math.round(Number(days) || 30));
  const done = new Set(h.log);
  if (!done.size) return null;                              // aucune histoire → pas de taux
  // On borne la fenêtre à la 1re date loggée : sinon une habitude créée hier afficherait un taux
  // ridicule (jours comptés AVANT son existence). C'est « la régularité DEPUIS que tu as commencé »,
  // plafonnée à `days`.
  const earliest = [...done].sort()[0];
  const wds = h.weekdays.length ? new Set(h.weekdays) : new Set([0, 1, 2, 3, 4, 5, 6]);
  const pad = n => String(n).padStart(2, '0');
  const key = x => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  let d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
  let scheduled = 0, hit = 0;
  for (let i = 0; i < win; i++) {
    const k = key(d);
    if (k < earliest) break;                               // avant le début de l'habitude : on s'arrête
    if (wds.has(d.getDay())) { scheduled++; if (done.has(k)) hit++; }
    d.setDate(d.getDate() - 1);
  }
  if (!scheduled) return null;
  return { done: hit, scheduled, rate: Math.round(hit / scheduled * 100) };
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

// Pouls hebdomadaire de TOUTES les habitudes : le panneau montre chaque habitude (série, régularité
// 30 j, frise 7 j) mais aucune vue d'ensemble « comment va ma semaine ». Agrège sur 7 jours les
// occurrences prévues vs tenues (une habitude ne compte que les jours où elle est programmée).
// Renvoie { done, scheduled, rate, days:[{key,done,scheduled}] } ou null si aucune occurrence prévue
// sur la semaine. S'appuie sur habitWeekMap (déjà testé). Pur + testé.
function habitsWeekPulse(habits, todayKey) {
  const list = Array.isArray(habits) ? habits : [];
  if (!list.length) return null;
  let acc = null;
  for (const h of list) {
    const wm = habitWeekMap(h, todayKey);
    if (!wm.length) return null;
    if (!acc) acc = wm.map(d => ({ key: d.key, done: 0, scheduled: 0 }));
    wm.forEach((d, i) => { if (d.scheduled) { acc[i].scheduled += 1; if (d.done) acc[i].done += 1; } });
  }
  if (!acc) return null;
  const done = acc.reduce((s, d) => s + d.done, 0);
  const scheduled = acc.reduce((s, d) => s + d.scheduled, 0);
  if (scheduled === 0) return null;
  return { done, scheduled, rate: Math.round((done / scheduled) * 100), days: acc };
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

// Habitudes dont la série est EN JEU aujourd'hui : prévues ce jour, pas encore faites, et portant
// une série courante >= minStreak (défaut 2). `habitStreak` étant tolérant au jour en cours, ces
// séries tiennent encore — mais tombent si la journée se termine sans validation.
// Triées par série décroissante puis nom. Pur + testé.
function habitsAtRisk(habits, todayKey, minStreak) {
  const min = Math.max(1, Math.round(Number(minStreak) || 2));
  return habitsForDay(habits, todayKey)
    .filter(h => !h.done && h.streak >= min)
    .sort((a, b) => b.streak - a.streak || String(a.name).localeCompare(String(b.name)));
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
// Passe UNIQUE, atomique, gauche→droite : un backslash consomme le caractère qui suit,
// de sorte qu'un backslash échappé (« \\ ») suivi d'un « n » littéral donne bien « \n »
// (backslash + n) et pas un retour à la ligne — des replace séquentiels se trompaient.
function unescapeIcs(v) {
  return String(v || '').replace(/\\([\\nN,;])/g, (m, c) => (c === 'n' || c === 'N') ? '\n' : c);
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

// --- Sync auto du Google Sheets d'alternance (demande d'Adrien) ---
// Hôtes autorisés pour la récupération d'un CSV publié Google Sheets. docs.google.com sert le CSV ;
// il redirige souvent vers *.googleusercontent.com — les DEUX sont acceptés, rien d'autre (allowlist
// stricte, anti-SSRF réutilise isPrivateHost). Pur.
function isAllowedSheetHost(host) {
  const h = String(host || '').toLowerCase().replace(/\.$/, '');
  if (!h || isPrivateHost(h)) return false;
  return h === 'docs.google.com' || h === 'googleusercontent.com' || h.endsWith('.googleusercontent.com');
}

// Valide/normalise une URL de CSV publié Google Sheets (« Publier sur le web » → CSV, /export?format=csv,
// ou gviz tqx=out:csv). HTTPS + docs.google.com + chemin de feuille + sortie CSV explicite. Renvoie
// l'URL normalisée, ou '' si refusée. Pur + testé. C'est le garde-fou : l'app ne contactera QUE ça.
function normalizeSheetCsvUrl(input) {
  let s = String(input || '').trim();
  if (!s) return '';
  if (!/^https:\/\//i.test(s)) { if (/^\w+:\/\//.test(s)) return ''; s = 'https://' + s; }
  let u; try { u = new URL(s); } catch { return ''; }
  if (u.protocol !== 'https:' || !u.hostname || isPrivateHost(u.hostname)) return '';
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  if (h !== 'docs.google.com') return '';
  const path = u.pathname.toLowerCase();
  if (!path.includes('/spreadsheets/')) return '';
  const csv = /(?:^|[?&])output=csv|tqx=out:csv|format=csv/i.test(u.search) || /\/pub\b/.test(path);
  if (!csv) return '';
  return u.toString();
}

// Fusion IDEMPOTENTE de candidatures importées (sync) dans la liste existante. Dédoublonne par
// ENTREPRISE (insensible casse/accents) : une entreprise = une ligne — c'est le bon grain pour la
// recherche d'alternance, et surtout ça réconcilie une même entreprise présente à la fois dans
// « Cibles » (avec poste, « à postuler ») et « Suivi Existant » (sans poste, statut avancé) au lieu
// d'en faire deux entrées. Nouveauté → ajoutée ; correspondance → mise à jour des champs depuis la
// source (le poste n'est écrasé que s'il est fourni), SANS jamais régresser un suivi déjà avancé
// vers « à postuler ». Conserve id et createdAt existants. Renvoie { applications, added, updated }.
// Pur + testé.
function mergeApplications(existing, incoming) {
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const keyOf = a => norm(a.company);
  const out = (Array.isArray(existing) ? existing : []).map(normalizeApplication);
  const byKey = new Map();
  out.forEach(a => { const k = keyOf(a); if (!byKey.has(k)) byKey.set(k, a); });
  let added = 0, updated = 0;
  (Array.isArray(incoming) ? incoming : []).map(normalizeApplication).forEach(inc => {
    if (!inc.company) return;
    const k = keyOf(inc);
    const cur = byKey.get(k);
    if (!cur) { out.push(inc); byKey.set(k, inc); added++; return; }
    let changed = false;
    const nextStatus = (cur.status !== 'a_postuler' && inc.status === 'a_postuler') ? cur.status : inc.status;
    if (cur.status !== nextStatus) { cur.status = nextStatus; changed = true; }
    if (inc.date && cur.date !== inc.date) { cur.date = inc.date; changed = true; }
    if (inc.source && cur.source !== inc.source) { cur.source = inc.source; changed = true; }
    if (inc.notes && cur.notes !== inc.notes) { cur.notes = inc.notes; changed = true; }
    if (inc.role && cur.role !== inc.role) { cur.role = inc.role; changed = true; }
    if (inc.score != null && cur.score !== inc.score) { cur.score = inc.score; changed = true; }
    if (changed) updated++;
  });
  return { applications: out, added, updated };
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

// « Ma journée » ne montrait QUE le jour même — impossible, le soir, de voir ce que demain réserve
// sans ouvrir la vue jour. Or le rituel du soir invite justement à « préparer demain ». Cette fonction
// résume le lendemain : nombre de blocs à faire, première chose horodatée, anniversaires. S'appuie sur
// todayItems (déjà pur). Renvoie null si rien n'est prévu demain (pas d'encart inutile). Pur + testé.
function tomorrowPreview(state, todayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  const d = new Date(todayKey + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  const key = dateKey(d);
  const items = todayItems(state, key);
  if (!Array.isArray(items) || !items.length) return null;
  const isTimed = it => !it.allDay && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(it.time || ''));
  const doable = items.filter(it => it && it.type !== 'birthday');
  const timed = doable.filter(isTimed).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const first = timed[0] || null;
  return {
    dateKey: key,
    total: doable.length,
    timedCount: timed.length,
    allDayCount: doable.filter(it => !isTimed(it)).length,
    birthdays: items.filter(it => it && it.type === 'birthday').length,
    first: first ? { time: first.time, title: String(first.title || ''), kind: first.kind || 'life' } : null
  };
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

// Notes passées d'un champ texte du rituel du soir (`win`, `lesson`, `tomorrow`), les plus récentes
// d'abord. Ces notes sont conservées (jusqu'à 180 jours) mais n'étaient jamais réaffichées : la seule
// lecture était le repeuplement du champ de saisie du jour. Exclut le jour courant et les entrées
// vides. opts : { cap = 5, days = 90 }. Renvoie [{ date, text, daysAgo }]. Pur + testé.
function recentReflectionNotes(reflections, field, todayKey, opts) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const f = String(field || '');
  if (!isKey(todayKey) || !f) return [];
  const o = opts || {};
  const cap = Math.max(1, Math.round(Number(o.cap) || 5));
  const days = Math.max(1, Math.round(Number(o.days) || 90));
  return (Array.isArray(reflections) ? reflections : [])
    .filter(r => r && isKey(r.date) && r.date < todayKey && String(r[f] || '').trim())
    .map(r => ({ date: r.date, text: String(r[f]).trim().slice(0, 120), daysAgo: daysUntil(r.date, todayKey) }))
    .filter(r => r.daysAgo != null && r.daysAgo <= days)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, cap);
}

// Journalise le « pas du jour » (dailyLifeStep) AVANT son écrasement quotidien.
// `state.dailyLifeStep` est un OBJET UNIQUE {date, text, done} : chaque bascule de jour le remplace
// par {date: d, text: '', done: false}. Le pas concret qu'Adrien s'engageait à faire pour ses
// objectifs de vie — écrit, parfois validé (+10 XP) — était donc effacé sans laisser aucune trace,
// et un seul jour existait à la fois. Un pas sans texte n'est pas journalisé (rien à mesurer).
// Idempotent : réécrit l'entrée d'une date déjà journalisée. cap = entrées conservées (défaut 180).
// Pur + testé.
function logLifeStep(log, step, cap) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const base = Array.isArray(log) ? log.filter(e => e && isKey(e.date)) : [];
  const keep = Math.max(30, Math.round(Number(cap) || 180));
  const s = step && typeof step === 'object' ? step : null;
  const text = s ? String(s.text || '').trim() : '';
  if (!s || !isKey(s.date) || !text) return base.slice(-keep);
  const arr = base.filter(e => e.date !== s.date);
  arr.push({ date: s.date, text: text.slice(0, 140), done: !!s.done });
  arr.sort((a, b) => a.date.localeCompare(b.date));
  return arr.slice(-keep);
}

// Suivi des « pas du jour » : série de jours consécutifs où le pas a été TENU (done), taux de suivi,
// et dernier pas tenu. Comme pour les quêtes, le journal ne contient que les jours PASSÉS (l'entrée
// du jour n'est écrite qu'à la bascule suivante) : l'état du jour est donc passé à part, sinon la
// série serait perpétuellement en retard d'un jour. Réutilise `dailyStreak` (grâce du jour en cours).
// Renvoie { streak, doneDays, loggedDays, rate, lastDone } ; `lastDone` = {date, text, daysAgo} ou null.
// Pur + testé.
function lifeStepStats(log, todayKey, todayStep) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const entries = (Array.isArray(log) ? log : [])
    .filter(e => e && isKey(e.date) && String(e.text || '').trim() && e.date !== todayKey);
  const t = todayStep && typeof todayStep === 'object' ? todayStep : null;
  const todayText = t ? String(t.text || '').trim() : '';
  const todayCounts = !!todayText && isKey(todayKey);
  const doneDates = entries.filter(e => e.done).map(e => e.date);
  if (todayCounts && t.done) doneDates.push(todayKey);
  const loggedDays = entries.length + (todayCounts ? 1 : 0);
  const doneDays = doneDates.length;
  const past = entries.filter(e => e.done).sort((a, b) => b.date.localeCompare(a.date));
  const lastPast = past[0] || null;
  const lastDone = (todayCounts && t.done)
    ? { date: todayKey, text: todayText.slice(0, 140), daysAgo: 0 }
    : (lastPast ? { date: lastPast.date, text: lastPast.text, daysAgo: daysUntil(lastPast.date, todayKey) } : null);
  return {
    streak: dailyStreak(doneDates, todayKey),
    doneDays,
    loggedDays,
    rate: loggedDays ? Math.round(doneDays / loggedDays * 100) : 0,
    lastDone
  };
}

// Journalise le résultat des quêtes d'une journée AVANT la remise à zéro quotidienne.
// Sans ça, `resetDailyContent()` remet tous les `done` à false sans rien conserver : les quêtes
// validées chaque jour disparaissaient sans laisser de trace (seul l'XP cumulé subsistait, indistinct).
// Idempotent : réécrit l'entrée d'une date déjà journalisée. Un jour sans aucune quête n'est pas
// journalisé (rien à mesurer). cap = nombre d'entrées conservées (défaut 180). Pur + testé.
function logQuestDay(log, dateKey, done, total, cap) {
  const base = Array.isArray(log) ? log.filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ''))) : [];
  const keep = Math.max(30, Math.round(Number(cap) || 180));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return base.slice(-keep);
  const t = Math.max(0, Math.round(Number(total) || 0));
  const arr = base.filter(e => e.date !== dateKey);
  if (!t) return arr.slice(-keep);
  const d = Math.max(0, Math.min(t, Math.round(Number(done) || 0)));
  arr.push({ date: dateKey, done: d, total: t });
  arr.sort((a, b) => a.date.localeCompare(b.date));
  return arr.slice(-keep);
}

// Série de journées « quêtes parfaites » : jours consécutifs où TOUTES les quêtes du jour ont été
// validées. `questLog` ne contient que les jours PASSÉS (l'entrée du jour n'est écrite qu'à la
// bascule quotidienne) — l'état du jour est donc passé à part, sinon la série serait toujours en
// retard d'un jour. Réutilise `dailyStreak` (qui tolère un jour courant encore vide).
// Renvoie { streak, perfectDays, loggedDays, rate }. Pur + testé.
function questPerfectStreak(log, todayKey, todayDone, todayTotal) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const entries = (Array.isArray(log) ? log : [])
    .filter(e => e && isKey(e.date) && Number(e.total) > 0 && e.date !== todayKey);
  const perfect = entries.filter(e => Number(e.done) >= Number(e.total)).map(e => e.date);
  const tTotal = Math.max(0, Math.round(Number(todayTotal) || 0));
  const tDone = Math.max(0, Math.round(Number(todayDone) || 0));
  const todayCounts = tTotal > 0 && isKey(todayKey);
  if (todayCounts && tDone >= tTotal) perfect.push(todayKey);
  const loggedDays = entries.length + (todayCounts ? 1 : 0);
  const perfectDays = perfect.length;
  return {
    streak: dailyStreak(perfect, todayKey),
    perfectDays,
    loggedDays,
    rate: loggedDays ? Math.round(perfectDays / loggedDays * 100) : 0
  };
}

// Suivi d'intention : relie l'intention posée le MATIN (`morningRituals[].intention` — champ
// jusqu'ici jamais relu, sauf pour repeupler son propre input) à la victoire notée le SOIR du même
// jour (`reflections[].win`). Donne un taux de suivi et les paires récentes.
// Le JOUR COURANT est exclu : sa victoire du soir n'est pas encore écrite, le compter comme « non
// tenue » serait injuste. opts : { days = 14, cap = 5 }.
// Renvoie { total, kept, rate, pairs: [{date, daysAgo, intention, win, kept}] } ou null si aucune
// intention dans la fenêtre. Pur + testé.
function intentionFollowThrough(rituals, reflections, todayKey, opts) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return null;
  const o = opts || {};
  const days = Math.max(1, Math.round(Number(o.days) || 14));
  const cap = Math.max(1, Math.round(Number(o.cap) || 5));
  const winByDate = {};
  (Array.isArray(reflections) ? reflections : []).forEach(r => {
    if (r && isKey(r.date) && String(r.win || '').trim()) winByDate[r.date] = String(r.win).trim().slice(0, 120);
  });
  const intByDate = {};
  (Array.isArray(rituals) ? rituals : []).forEach(r => {
    if (r && isKey(r.date) && String(r.intention || '').trim()) intByDate[r.date] = String(r.intention).trim().slice(0, 120);
  });
  const pairs = Object.keys(intByDate)
    .map(d => ({ date: d, daysAgo: daysUntil(d, todayKey) }))
    .filter(x => x.daysAgo != null && x.daysAgo >= 1 && x.daysAgo <= days)
    .map(x => ({ date: x.date, daysAgo: x.daysAgo, intention: intByDate[x.date], win: winByDate[x.date] || null, kept: !!winByDate[x.date] }))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!pairs.length) return null;
  const total = pairs.length;
  const kept = pairs.filter(p => p.kept).length;
  return { total, kept, rate: Math.round(kept / total * 100), pairs: pairs.slice(0, cap) };
}

// Ce que les blocs de focus ont fait avancer (`focusReviews[].outcome`, « Ce qui a avancé »).
// Ce champ est saisi après CHAQUE bloc terminé et conservé (300 entrées), mais il n'avait
// AUCUNE lecture dans l'app : donnée strictement write-only.
// Deux différences avec les notes du rituel du soir : plusieurs blocs par jour sont possibles
// (donc pas de dédup par date), et le jour courant est INCLUS (rien ne le réaffichait non plus).
// Les plus récents d'abord (à date égale, l'`id` le plus grand). opts : { cap = 6, days = 30 }.
// Renvoie [{ date, outcome, daysAgo }]. Pur + testé.
function recentFocusOutcomes(reviews, todayKey, opts) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return [];
  const o = opts || {};
  const cap = Math.max(1, Math.round(Number(o.cap) || 6));
  const days = Math.max(1, Math.round(Number(o.days) || 30));
  return (Array.isArray(reviews) ? reviews : [])
    .filter(r => r && isKey(r.date) && r.date <= todayKey && String(r.outcome || '').trim())
    .map(r => ({ date: r.date, outcome: String(r.outcome).trim().slice(0, 140), daysAgo: daysUntil(r.date, todayKey), id: Number(r.id) || 0 }))
    .filter(r => r.daysAgo != null && r.daysAgo <= days)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, cap)
    .map(r => ({ date: r.date, outcome: r.outcome, daysAgo: r.daysAgo }));
}

// Victoires passées du rituel du soir. Renvoie [{ date, win, daysAgo }]. Pur + testé.
function recentWins(reflections, todayKey, opts) {
  return recentReflectionNotes(reflections, 'win', todayKey, opts)
    .map(r => ({ date: r.date, win: r.text, daysAgo: r.daysAgo }));
}

// Leçons passées du rituel du soir. L'app promet « un indice utile à ton futur toi » — encore
// fallait-il le lui rendre. Renvoie [{ date, lesson, daysAgo }]. Pur + testé.
function recentLessons(reflections, todayKey, opts) {
  return recentReflectionNotes(reflections, 'lesson', todayKey, opts)
    .map(r => ({ date: r.date, lesson: r.text, daysAgo: r.daysAgo }));
}
// Série de « journées complètes » : jours consécutifs (jusqu'à aujourd'hui, ou hier si rien encore
// aujourd'hui) où au moins `threshold` domaines de vie ont été cochés. days = [{date, count}]. Réutilise
// dailyStreak sur les dates qualifiées. Renvoie la longueur de la série (0 si aucune). Pur + testé.
function completeDaysStreak(days, threshold, todayKey) {
  const thr = Number.isFinite(Number(threshold)) && Number(threshold) > 0 ? Number(threshold) : 4;
  const dates = (Array.isArray(days) ? days : [])
    .filter(d => d && /^\d{4}-\d{2}-\d{2}$/.test(String(d.date)) && (Number(d.count) || 0) >= thr)
    .map(d => d.date);
  return dailyStreak(dates, todayKey);
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

// Prochaines échéances importantes de l'agenda : blocs non faits, priorité haute, à venir dans
// l'horizon (jours). Triés par proximité puis titre, limités à `limit`. Pur + testé.
function upcomingPriorityItems(agenda, todayKey, horizon, limit) {
  const h = Math.max(1, Math.min(365, Math.round(Number(horizon) || 30)));
  const cap = Math.max(1, Math.min(10, Math.round(Number(limit) || 3)));
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return [];
  const out = [];
  (Array.isArray(agenda) ? agenda : []).forEach(a => {
    if (!a || a.completed || a.priority !== 'high' || !isKey(a.date)) return;
    const d = daysUntil(todayKey, a.date);
    if (d == null || d < 0 || d > h) return;
    out.push({ kind: AGENDA_KINDS.includes(a.kind) ? a.kind : 'life', title: String(a.title || 'Échéance').slice(0, 40), daysLeft: d, date: a.date });
  });
  return out.sort((x, y) => x.daysLeft - y.daysLeft || x.title.localeCompare(y.title)).slice(0, cap);
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

// Répartition des révisions PAR MATIÈRE (le titre de la séance study sert de matière : « Compta »,
// « Droit »…). Un BTS a plusieurs matières ; studyStats ne donne qu'un total global, on ne voit donc
// pas laquelle est négligée. On regroupe par titre et on trie par « priorité de révision » :
// d'abord le plus de retard (prévu, passé, non fait), puis le plus faible taux de complétion, puis
// le plus de séances à venir. Renvoie [{subject, total, done, upcoming, overdue, doneRate}]. Pur + testé.
function studyBySubject(agenda, todayKey) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const today = isKey(todayKey) ? todayKey : null;
  const groups = new Map();
  (Array.isArray(agenda) ? agenda : []).forEach(a => {
    if (!a || a.kind !== 'study') return;
    const subj = (String(a.title || '').trim()) || 'Révision';
    if (!groups.has(subj)) groups.set(subj, { subject: subj, total: 0, done: 0, upcoming: 0, overdue: 0 });
    const g = groups.get(subj);
    g.total++;
    if (a.completed) g.done++;
    else if (today && isKey(a.date)) { if (a.date >= today) g.upcoming++; else g.overdue++; }
  });
  const arr = [...groups.values()];
  arr.forEach(g => { g.doneRate = g.total ? Math.round(g.done / g.total * 100) : 0; });
  arr.sort((a, b) => b.overdue - a.overdue || a.doneRate - b.doneRate || b.upcoming - a.upcoming || a.subject.localeCompare(b.subject));
  return arr;
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
// Rythme de révision vers l'examen : à partir des séances de révision planifiées (agenda kind 'study') et
// de la date d'examen, calcule les révisions restantes (à venir non faites), les jours restants et le
// nombre de séances/semaine à tenir pour finir à temps. Renvoie { remaining, daysLeft, perWeek, done,
// total, status } ('done'|'ahead'|'onTrack'|'tight') ou null si pas d'examen à venir ou aucune révision. Pur + testé.
function studyPacing(agenda, examGoal, todayKey) {
  const c = examCountdown(examGoal, todayKey);
  if (!c || c.past) return null;
  const list = (Array.isArray(agenda) ? agenda : []).filter(a => a && a.kind === 'study');
  const total = list.length;
  if (!total) return null;
  const done = list.filter(a => a.completed).length;
  const remaining = list.filter(a => !a.completed && /^\d{4}-\d{2}-\d{2}$/.test(String(a.date || '')) && a.date >= todayKey).length;
  if (remaining === 0) return { remaining: 0, daysLeft: c.daysLeft, perWeek: 0, done, total, status: 'done' };
  const weeksLeft = Math.max(1, c.daysLeft / 7);
  const perWeek = Math.ceil(remaining / weeksLeft);
  const status = perWeek <= 2 ? 'ahead' : perWeek <= 4 ? 'onTrack' : 'tight';
  return { remaining, daysLeft: c.daysLeft, perWeek, done, total, status };
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

// Pendant de nextTrainingSession pour les RÉVISIONS : la prochaine révision planifiée non faite (item
// d'agenda kind==='study'), aujourd'hui non encore passée ou plus tard. Adrien (BTS CG) voit sa
// prochaine séance sport sur l'accueil mais pas sa prochaine révision. Renvoie { id, title, date,
// time, daysLeft } ou null. Pur + testé.
function nextStudySession(agenda, todayKey, nowMinutes) {
  if (!Array.isArray(agenda)) return null;
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return null;
  const nowMin = Number.isFinite(nowMinutes) ? nowMinutes : -1;
  const toMin = t => { const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t || '')); return m ? +m[1] * 60 + +m[2] : null; };
  const up = agenda
    .filter(a => a && a.kind === 'study' && !a.completed && isKey(a.date))
    .filter(a => {
      if (a.date > todayKey) return true;
      if (a.date < todayKey) return false;
      const min = toMin(a.time);
      return min == null || min >= nowMin;
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time || '99:99').localeCompare(String(b.time || '99:99')));
  const n = up[0];
  if (!n) return null;
  const dl = daysUntil(todayKey, n.date);
  return { id: n.id, title: String(n.title || 'Révision'), date: n.date, time: n.time || '', daysLeft: dl == null ? 0 : dl };
}

// Séances sport prévues récemment (fenêtre [today - days .. hier]) et non faites : ni marquées
// complétées, ni avec une séance loguée ce jour-là. opts : { days=14, cap=5 }. Renvoie
// [{date, title}] du plus récent au plus ancien. Pur + testé.
function missedSessions(agenda, workouts, todayKey, opts) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return [];
  const o = opts || {};
  const days = Math.max(1, Math.round(Number(o.days) || 14));
  const cap = Math.max(1, Math.round(Number(o.cap) || 5));
  const s = new Date(todayKey + 'T12:00:00'); s.setDate(s.getDate() - days);
  const p = n => String(n).padStart(2, '0');
  const startKey = `${s.getFullYear()}-${p(s.getMonth() + 1)}-${p(s.getDate())}`;
  const trainedDays = new Set((Array.isArray(workouts) ? workouts : []).filter(w => w && isKey(w.date)).map(w => w.date));
  return (Array.isArray(agenda) ? agenda : [])
    .filter(a => a && a.kind === 'sport' && isKey(a.date) && a.date < todayKey && a.date >= startKey && !a.completed && !trainedDays.has(a.date))
    .map(a => ({ date: a.date, title: a.title || 'Séance' }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, cap);
}

// Révisions (agenda kind='study') prévues dans le passé récent (fenêtre [today - days .. hier]) et
// jamais validées. Pendant de `missedSessions` (qui ne couvre que le sport) : sans ça, une révision
// sautée disparaît du suivi — `studyPacing` ne compte que les révisions à VENIR, donc le rythme
// paraît meilleur qu'il ne l'est. opts : { days=21, cap=5 }. Renvoie [{date, title, daysLate}] du
// plus récent au plus ancien. Pur + testé.
function overdueStudy(agenda, todayKey, opts) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return [];
  const o = opts || {};
  const days = Math.max(1, Math.round(Number(o.days) || 21));
  const cap = Math.max(1, Math.round(Number(o.cap) || 5));
  const s = new Date(todayKey + 'T12:00:00'); s.setDate(s.getDate() - days);
  const p = n => String(n).padStart(2, '0');
  const startKey = `${s.getFullYear()}-${p(s.getMonth() + 1)}-${p(s.getDate())}`;
  return (Array.isArray(agenda) ? agenda : [])
    .filter(a => a && a.kind === 'study' && isKey(a.date) && a.date < todayKey && a.date >= startKey && !a.completed)
    .map(a => ({ date: a.date, title: String(a.title || 'Révision').slice(0, 60), daysLate: daysUntil(a.date, todayKey) }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, cap);
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

// Collations protéinées concrètes, triées par apport croissant.
const PROTEIN_SNACKS = [
  { name: 'Une poignée d’amandes', p: 6 },
  { name: 'Un œuf dur', p: 7 },
  { name: 'Fromage blanc (150 g)', p: 12 },
  { name: 'Un skyr (150 g)', p: 15 },
  { name: 'Deux œufs + pain complet', p: 18 },
  { name: 'Un shaker de whey (~25 g)', p: 24 },
  { name: 'Blanc de poulet (120 g)', p: 30 },
  { name: 'Poulet (120 g) + un skyr', p: 45 },
];

// Suggère une collation pour combler le protéique restant du jour (consommé vs cible).
// Choisit la plus PETITE collation qui couvre l'écart (sinon la plus grosse). Pur + testé.
// Renvoie null si l'objectif est atteint (écart ≤ 5 g) ou si la cible est inconnue.
function proteinSnackSuggestion(consumed, target) {
  const c = Number(consumed) || 0, t = Number(target) || 0;
  if (t <= 0) return null;
  const gap = Math.round(t - c);
  if (gap <= 5) return null;
  const snack = PROTEIN_SNACKS.find(s => s.p >= gap) || PROTEIN_SNACKS[PROTEIN_SNACKS.length - 1];
  return { gap, snack: snack.name, snackProtein: snack.p };
}

// Construit un CSV du journal nutrition (date, protéines g, eau verres, fruits/légumes o/n), trié
// par date croissante et dédupliqué par date (dernière entrée conservée). En-tête toujours présent.
// Pur + testé.
function nutritionCsv(nutrition) {
  const header = 'date,proteines_g,eau_verres,fruits_legumes';
  const byDate = {};
  (Array.isArray(nutrition) ? nutrition : []).forEach(n => {
    if (n && /^\d{4}-\d{2}-\d{2}$/.test(String(n.date || ''))) byDate[n.date] = n;
  });
  const rows = Object.keys(byDate).sort().map(d => {
    const n = byDate[d];
    return `${d},${Number(n.protein) || 0},${Number(n.water) || 0},${n.fruit ? 'oui' : 'non'}`;
  });
  return [header, ...rows].join('\n');
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
  // Recherche d'alternance : candidatures de la semaine (date d'action dans la semaine) et
  // celles déjà arrivées en entretien/acceptées — la priorité n°1 d'Adrien appartient au bilan.
  const weekApps = (Array.isArray(s.applications) ? s.applications : []).filter(a => a && a.status !== 'a_postuler' && inWeek(a.date));
  return {
    mondayKey, sessions, minutes, km: Math.round(km * 10) / 10, load,
    focusMin, sleepAvg: Math.round(sleepAvg * 10) / 10,
    studyPlanned: study.length, studyDone,
    apps: weekApps.length,
    appEntretiens: weekApps.filter(a => a.status === 'entretien' || a.status === 'accepte').length
  };
}

// Texte partageable d'un bilan hebdomadaire (à partir de weeklySummary). Pur + testé.
function weeklySummaryText(sum) {
  const s = sum && typeof sum === 'object' ? sum : {};
  const n = v => Number(v) || 0;
  const lines = [`Bilan de la semaine${s.mondayKey ? ' du ' + String(s.mondayKey).split('-').reverse().join('/') : ''} :`];
  lines.push(`🏋️ ${n(s.sessions)} séance${n(s.sessions) > 1 ? 's' : ''} · ${n(s.minutes)} min${n(s.km) ? ` · ${s.km} km` : ''}`);
  if (n(s.focusMin)) lines.push(`🧠 ${n(s.focusMin)} min de focus`);
  if (n(s.apps)) lines.push(`💼 ${n(s.apps)} candidature${n(s.apps) > 1 ? 's' : ''}${n(s.appEntretiens) ? ` · ${n(s.appEntretiens)} entretien${n(s.appEntretiens) > 1 ? 's' : ''} 🎉` : ''}`);
  if (n(s.studyPlanned)) lines.push(`📚 ${n(s.studyDone)}/${n(s.studyPlanned)} révisions validées`);
  if (n(s.sleepAvg)) lines.push(`😴 ${s.sleepAvg} h de sommeil moyen`);
  return lines.join('\n');
}
// Prépare un objet de partage natif (Web Share) pour le bilan hebdo : { title, text }. null si texte
// vide. Le texte = weeklySummaryText(sum). Pur + testé.
function shareableWeek(sum) {
  const text = weeklySummaryText(sum);
  if (!text || !text.trim()) return null;
  const s = sum && typeof sum === 'object' ? sum : {};
  const title = `🏆 Mon bilan de la semaine${s.mondayKey ? ' du ' + String(s.mondayKey).split('-').reverse().join('/') : ''}`;
  return { title, text };
}

// Noms de mois FR (index 0 = janvier) pour l'étiquetage des bilans mensuels.
const MONTH_NAMES_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
// Étiquette lisible d'un mois ('YYYY-MM' → 'juillet 2026'). '' si invalide. Pur + testé.
function monthLabelFr(monthKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
  if (!m || +m[2] < 1 || +m[2] > 12) return '';
  return `${MONTH_NAMES_FR[+m[2] - 1]} ${m[1]}`;
}

// Récapitulatif d'un mois calendaire ('YYYY-MM') : séances, minutes, km courus, focus, bien-être,
// révisions faites/planifiées, jours actifs (dates distinctes avec sport/bien-être/focus/révision faite)
// et sommeil moyen. Renvoie null si mois invalide ou totalement vide. Pur + testé.
function monthlyRecap(state, monthKey) {
  const s = state || {};
  if (!/^\d{4}-\d{2}$/.test(String(monthKey || ''))) return null;
  const inMonth = d => typeof d === 'string' && d.slice(0, 7) === monthKey;
  const workouts = (Array.isArray(s.workouts) ? s.workouts : []).filter(w => w && inMonth(w.date));
  const sessions = workouts.length;
  const minutes = workouts.reduce((a, w) => a + (Number(w.duration) || 0), 0);
  const km = Math.round(workouts.filter(w => w.type === 'run').reduce((a, w) => a + (Number(w.distance) || 0), 0) * 10) / 10;
  const focus = (Array.isArray(s.focusSessions) ? s.focusSessions : []).filter(f => f && inMonth(f.date));
  const focusMin = focus.reduce((a, f) => a + (Number(f.minutes) || 0), 0);
  const wellnessList = (Array.isArray(s.wellnessDone) ? s.wellnessDone : []).filter(w => w && inMonth(w.date));
  const wellness = wellnessList.length;
  const study = (Array.isArray(s.agenda) ? s.agenda : []).filter(a => a && a.kind === 'study' && inMonth(a.date));
  const studyDoneList = study.filter(a => a.completed);
  const rec = (Array.isArray(s.recovery) ? s.recovery : []).filter(r => r && inMonth(r.date) && (Number(r.sleep) || 0) > 0);
  const sleepAvg = rec.length ? Math.round(rec.reduce((a, r) => a + (Number(r.sleep) || 0), 0) / rec.length * 10) / 10 : 0;
  if (!sessions && !focusMin && !wellness && !studyDoneList.length && !rec.length) return null;
  const activeDays = new Set();
  workouts.forEach(w => activeDays.add(w.date));
  wellnessList.forEach(w => activeDays.add(w.date));
  focus.forEach(f => activeDays.add(f.date));
  studyDoneList.forEach(a => activeDays.add(a.date));
  return { monthKey, sessions, minutes, km, focusMin, wellness, studyDone: studyDoneList.length, studyPlanned: study.length, activeDays: activeDays.size, sleepAvg };
}

// Texte partageable d'un bilan mensuel (à partir de monthlyRecap). '' si vide. Pur + testé.
function monthlyRecapText(recap) {
  const r = recap && typeof recap === 'object' ? recap : null;
  if (!r) return '';
  const n = v => Number(v) || 0;
  const lines = [`Bilan de ${monthLabelFr(r.monthKey)} :`];
  lines.push(`🏋️ ${n(r.sessions)} séance${n(r.sessions) > 1 ? 's' : ''} · ${n(r.minutes)} min${n(r.km) ? ` · ${r.km} km` : ''}`);
  if (n(r.wellness)) lines.push(`🧘 ${n(r.wellness)} séance${n(r.wellness) > 1 ? 's' : ''} bien-être`);
  if (n(r.focusMin)) lines.push(`🧠 ${n(r.focusMin)} min de focus`);
  if (n(r.studyPlanned)) lines.push(`📚 ${n(r.studyDone)}/${n(r.studyPlanned)} révisions validées`);
  if (n(r.sleepAvg)) lines.push(`😴 ${r.sleepAvg} h de sommeil moyen`);
  lines.push(`📅 ${n(r.activeDays)} jour${n(r.activeDays) > 1 ? 's' : ''} actif${n(r.activeDays) > 1 ? 's' : ''}`);
  return lines.join('\n');
}

// Prépare un objet de partage natif (Web Share) pour le bilan mensuel : { title, text }. null si
// texte vide. Le texte = monthlyRecapText(recap). Pur + testé.
function shareableMonth(recap) {
  const text = monthlyRecapText(recap);
  if (!text || !text.trim()) return null;
  const r = recap && typeof recap === 'object' ? recap : {};
  const label = monthLabelFr(r.monthKey);
  return { title: `🏆 Mon bilan${label ? ' de ' + label : ' du mois'}`, text };
}

// Bilan hebdo intelligent : compare la semaine (weeklySummary) aux objectifs et à la semaine
// précédente (+ ACWR, sommeil) et renvoie des insights personnalisés { emoji, tone, text }
// (tone: good|warn|info), 1 à 5. Pur + testé.
function weeklyInsights(state, mondayKey, todayKey) {
  const s = state || {};
  const cur = weeklySummary(s, mondayKey);
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(mondayKey || ''));
  let prev = null;
  if (t) { const d = new Date(+t[1], +t[2] - 1, +t[3]); d.setDate(d.getDate() - 7); const p = n => String(n).padStart(2, '0'); prev = weeklySummary(s, `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`); }
  const goals = s.goals && typeof s.goals === 'object' ? s.goals : {};
  const out = [];
  const goalSessions = Math.round(Number(goals.sessions) || 0);
  if (goalSessions > 0) {
    if (cur.sessions >= goalSessions) out.push({ emoji: '✅', tone: 'good', text: `${cur.sessions}/${goalSessions} séances — objectif atteint, bravo !` });
    else out.push({ emoji: '🎯', tone: 'warn', text: `${cur.sessions}/${goalSessions} séances — encore ${goalSessions - cur.sessions} pour ton objectif hebdo.` });
  } else if (cur.sessions > 0) out.push({ emoji: '🏋️', tone: 'info', text: `${cur.sessions} séance${cur.sessions > 1 ? 's' : ''} cette semaine.` });
  const goalKm = Number(goals.distance) || 0;
  if (goalKm > 0 && cur.km > 0) out.push(cur.km >= goalKm
    ? { emoji: '🏃', tone: 'good', text: `${cur.km} km courus — objectif ${goalKm} km atteint.` }
    : { emoji: '🏃', tone: 'info', text: `${cur.km}/${goalKm} km courus cette semaine.` });
  if (prev && (prev.minutes > 0 || cur.minutes > 0)) {
    const d = cur.minutes - prev.minutes;
    if (d >= 15) out.push({ emoji: '📈', tone: 'good', text: `+${d} min vs semaine dernière — tu montes en volume.` });
    else if (d <= -30) out.push({ emoji: '📉', tone: 'warn', text: `${d} min vs semaine dernière — volume en baisse, semaine plus légère ?` });
  }
  const acwr = acuteChronicRatio(s.workouts, todayKey || mondayKey);
  if (acwr && acwr.zone === 'high') out.push({ emoji: '🟥', tone: 'warn', text: `Charge en pic (ACWR ${acwr.ratio}) : prévois une semaine plus légère pour éviter la blessure.` });
  if (cur.sleepAvg > 0 && cur.sleepAvg < 7) out.push({ emoji: '😴', tone: 'warn', text: `Sommeil moyen ${cur.sleepAvg} h — vise 7–8 h pour mieux récupérer et progresser.` });
  if (!out.length) out.push({ emoji: '🌱', tone: 'info', text: `Pas encore de données cette semaine — lance une séance pour démarrer ton bilan.` });
  return out.slice(0, 5);
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
// Conseil d'équilibre poussée/tirage à partir de muscleBalance : { emoji, label, advice, ok, push,
// pull, ratio } ou null (données absentes ou insuffisantes, < minSets séries au total). Pur + testé.
function pushPullAdvice(balance, minSets) {
  const b = balance && typeof balance === 'object' ? balance : null;
  if (!b) return null;
  const total = (Number(b.push) || 0) + (Number(b.pull) || 0);
  if (total < Math.max(2, Math.round(Number(minSets) || 6))) return null;
  const base = { push: b.push, pull: b.pull, ratio: b.ratio };
  switch (b.zone) {
    case 'balanced': return { ...base, ok: true, emoji: '⚖️', label: 'Push/pull équilibré', advice: 'Ton ratio poussée/tirage est bon, continue comme ça.' };
    case 'push-heavy': return { ...base, ok: false, emoji: '⚠️', label: 'Trop de poussée', advice: 'Ajoute du tirage (dos : tractions, rowing) pour rééquilibrer et protéger tes épaules.' };
    case 'pull-heavy': return { ...base, ok: false, emoji: '⚠️', label: 'Trop de tirage', advice: 'Ajoute de la poussée (pecs, épaules) pour rééquilibrer.' };
    case 'no-pull': return { ...base, ok: false, emoji: '⚠️', label: 'Aucun tirage', advice: 'Tu ne fais que de la poussée : ajoute du dos (tractions, rowing).' };
    case 'no-push': return { ...base, ok: false, emoji: '⚠️', label: 'Aucune poussée', advice: 'Tu ne fais que du tirage : ajoute pecs et épaules.' };
    default: return null;
  }
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
// Zone musculaire à rattraper : la moins travaillée (en séries) sur les `days` derniers jours (défaut 28).
// Renvoie { zone, sets, emoji, label, days, neglected, bySets } ou null si aucune séance chargée sur la
// fenêtre. neglected = zone jamais touchée (0) ou nettement sous la moyenne (< 40 %). Pur + testé.
function neglectedZoneReport(workouts, todayKey, days) {
  const win = Math.max(7, Math.round(Number(days) || 28));
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return null;
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  const zones = ['abs', 'arms', 'chest', 'back', 'shoulders', 'legs', 'glutes'];
  const sets = {}; zones.forEach(z => { sets[z] = 0; });
  let any = false;
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w && w.date || '')); if (!m) return;
    const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
    const dd = Math.round((today - d) / 86400000); if (dd < 0 || dd > win - 1) return;
    const exos = Array.isArray(w.exercises) && w.exercises.length ? w.exercises : (w.exercise ? [{ name: w.exercise, sets: w.sets, completedSets: w.completedSets }] : []);
    exos.forEach(ex => {
      if (!ex || !ex.name) return;
      const s = Number(ex.completedSets) > 0 ? Number(ex.completedSets) : (Number(ex.sets) || 0);
      if (s <= 0) return;
      exerciseZones(ex.name).forEach(z => { if (sets[z] != null) { sets[z] += s; any = true; } });
    });
  });
  if (!any) return null;
  let min = zones[0];
  zones.forEach(z => { if (sets[z] < sets[min]) min = z; });
  const mean = zones.reduce((a, z) => a + sets[z], 0) / zones.length;
  const g = TRAINING_GOALS.find(x => x.id === min) || { emoji: '🎯', label: min };
  return { zone: min, sets: sets[min], emoji: g.emoji, label: g.label, days: win, neglected: sets[min] === 0 || sets[min] < mean * 0.4, bySets: sets };
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

// Bibliothèque : liste des filtres ACTIFS (non-défaut) en étiquettes lisibles. Six filtres cumulables
// (recherche, famille, matériel, objectif, favoris, nouveaux) peuvent vider la liste sans qu'on
// comprenne pourquoi ; on les affiche pour proposer une réinitialisation en un clic. Renvoie [] si
// aucun filtre actif. Pur + testé.
function activeExerciseFilters(f) {
  const o = f && typeof f === 'object' ? f : {};
  const out = [];
  const term = String(o.term || '').trim();
  if (term) out.push('🔎 « ' + term + ' »');
  const famFr = { trail: 'Trail', general: 'Musculation', core: 'Tronc & gainage', conditioning: 'Conditioning' };
  if (o.family && o.family !== 'all') out.push(famFr[o.family] || String(o.family));
  if (o.equip && o.equip !== 'all') out.push('🧰 ' + String(o.equip));
  const goalFr = { abs: '🔥 Abdos', arms: '💪 Bras', chest: '🎯 Pectoraux', back: '🦅 Dos', shoulders: '🏔️ Épaules', legs: '🦵 Jambes', glutes: '🍑 Fessiers' };
  if (o.goal && o.goal !== 'all') out.push(goalFr[o.goal] || String(o.goal));
  if (o.favOnly) out.push('⭐ Favoris');
  if (o.newOnly) out.push('🆕 Nouveaux');
  return out;
}

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
// Vrai si on est sur un appareil iOS non encore installé en app (Safari ne propose pas le bouton
// d'installation → on affiche une aide « Ajouter à l'écran d'accueil »). Pur + testé.
// iPadOS 13+ : Safari annonce un user-agent « Macintosh » (plus de « iPad ») — on reconnaît alors
// l'iPad à son écran tactile (maxTouchPoints > 1), sinon l'aide ne s'afficherait jamais sur iPad.
// Un vrai Mac de bureau a maxTouchPoints 0 → non affecté. maxTouchPoints absent → NaN → ignoré
// (rétrocompatible avec les appels ne passant pas ce 3ᵉ argument).
function isIosInstallable(userAgent, standalone, maxTouchPoints) {
  const ua = String(userAgent || '');
  const isTouchMac = /macintosh|mac os x/i.test(ua) && Number(maxTouchPoints) > 1;
  return (/iphone|ipad|ipod/i.test(ua) || isTouchMac) && standalone !== true;
}
// Nudge d'installation PWA contextuel : ne propose l'ajout à l'écran d'accueil qu'APRÈS engagement
// (séances loggées ≥ seuil), quand l'app est installable (canPrompt Android/desktop) mais pas déjà
// installée (standalone) ni refusée (dismissed). ctx : { standalone, canPrompt, dismissed, threshold }.
// Renvoie { show, sessions, message }. iOS a son propre bandeau → non couvert ici. Pur + testé.
function installNudge(state, ctx) {
  const c = ctx || {};
  const sessions = Array.isArray(state && state.workouts) ? state.workouts.length : 0;
  const threshold = Number.isFinite(Number(c.threshold)) ? Math.max(1, Number(c.threshold)) : 3;
  if (c.standalone === true || c.dismissed === true || c.canPrompt !== true || sessions < threshold) {
    return { show: false, sessions };
  }
  return { show: true, sessions, message: `Tu as déjà loggé ${sessions} séance${sessions > 1 ? 's' : ''} 💪 Installe l'app sur ton écran d'accueil : accès en 1 tap, même hors-ligne, tes données restent sur ton téléphone.` };
}
// Journal des nouveautés (le plus récent EN PREMIER). CHANGELOG[0].v = version courante de l'app.
// Sert à l'écran « Nouveautés » après une mise à jour auto. À compléter à chaque release notable.
const CHANGELOG = [
  { v: '2.0.27', emoji: '📲', text: 'Aide d’installation sur iPad : sur iPadOS récent, Safari se fait passer pour un Mac (l’UA ne contient plus « iPad »), si bien que le rappel « Ajoute l’app à l’écran d’accueil » ne s’affichait jamais sur iPad. L’app reconnaît maintenant l’iPad à son écran tactile et propose l’aide comme sur iPhone. Aucun impact sur les vrais Mac de bureau (pas tactiles).' },
  { v: '2.0.26', emoji: '💼', text: 'Import des candidatures d’alternance plus robuste : une date de cellule aberrante (ex. « 13/45/2026 » ou un mois/jour hors bornes) est désormais ignorée au lieu d’être stockée telle quelle sur la candidature. Les vraies dates (AAAA-MM-JJ ou JJ/MM/AAAA, même noyées dans du texte) restent lues comme avant — plus de date fantôme qui fausse le tri du suivi.' },
  { v: '2.0.25', emoji: '📅', text: 'Correctif d’import calendrier (.ics) : un titre d’événement contenant un vrai « \\n » (backslash + lettre n, ex. un chemin de fichier) n’ajoute plus de retour à la ligne parasite. Le déséchappement iCalendar est désormais fait en une seule passe, propre — les séquences « \\, », « \\; » et « \\\\ » restent gérées comme avant.' },
  { v: '2.0.24', emoji: '🌙', text: 'Coach sommeil (4/4) — le coach RPG est complet. Ton plan de recalage affiche maintenant des conseils du soir calés sur ton coucher cible (dernier café, dîner, écrans, routine calme, lumière du matin), suit ton adhérence (« Nuits dans le plan : 4/5 · 🔥 3 d’affilée ») et te récompense en XP quand tu notes un coucher qui tient la cible du jour (+15, +25 si tu atteins l’objectif). Encouragements bienveillants quand tu dévies, sans culpabilité. Le système sommeil demandé est bouclé : bilan → capture → plan → coach.' },
  { v: '2.0.23', emoji: '🌙', text: 'Coach sommeil (3/4) : le plan de recalage progressif est là. Fixe ton coucher visé (ex. 23:30) dans la Récupération, et l’app te donne CHAQUE SOIR l’heure de coucher cible — on avance de ~20-30 min tous les 1-2 jours, en douceur, depuis ton rythme réel (≈ 6 h). Le plan s’adapte si tu dévies : en retard, il ne réclame qu’un pas depuis là où tu en es (l’arrivée recule honnêtement) ; en avance, il te laisse tranquille. Barre de progression + date d’arrivée estimée à l’objectif.' },
  { v: '2.0.22', emoji: '🌙', text: 'Coach sommeil (2/4) : tu peux maintenant noter ton heure de coucher au check-in récup (champ facultatif, à côté de la durée). C’est ce qui manquait pour un vrai plan de recalage — l’app suit désormais à quelle heure tu te couches vraiment, nuit après nuit, même quand ça traverse minuit (6 h du matin est bien « plus tard » que 23 h). Le plan de décalage progressif arrive à l’étape suivante.' },
  { v: '2.0.21', emoji: '😴', text: 'Premier pas du coach sommeil demandé : la récup affiche un « Bilan sommeil » qui combine moyenne de la semaine, dette et régularité (nuit après nuit) en un seul verdict — repère la différence entre « je dors trop peu » et « je dors assez mais à des heures qui changent tout le temps ». Base du futur plan de recalage progressif vers un coucher plus tôt.' },
  { v: '2.0.20', emoji: '♿', text: 'Les boutons « × » qui ferment les fenêtres (agenda, quête, séance, séance guidée, revue de focus, fiche exercice, programme, historique) ont maintenant un libellé « Fermer » pour les lecteurs d’écran — un simple « × » sans texte n’était pas annoncé comme un bouton de fermeture.' },
  { v: '2.0.19', emoji: '🏆', text: 'Ton bilan de la semaine (à copier ou partager depuis l’accueil) inclut maintenant ta recherche d’alternance : « 💼 4 candidatures · 1 entretien 🎉 » aux côtés de tes séances, ton focus et ton sommeil. Ta priorité n°1 mérite sa place dans la revue de semaine.' },
  { v: '2.0.18', emoji: '🔁', text: 'Le suivi d’alternance travaille pour toi : les meilleures cibles (score le plus haut) remontent en tête de ta liste « à postuler », le score s’affiche sur chaque ligne, et les relances se traitent en un clic — quand ta relance est envoyée, clique l’entreprise dans le bandeau « Relances à faire » : statut mis à jour, avec annulation possible.' },
  { v: '2.0.17', emoji: '🎯', text: 'Fini l’hésitation devant 400 cibles : chaque jour, l’onglet Alternance te propose LA « Cible du jour » — la mieux notée de ta liste à postuler (score, ville) — avec son bouton « J’ai postulé » direct. Le score de tes Cibles est maintenant conservé à la sync, et une fois ta candidature du jour envoyée, la cible s’efface jusqu’à demain.' },
  { v: '2.0.16', emoji: '🔍', text: 'Ton suivi d’alternance devient navigable : une barre de recherche (entreprise, poste, ville, notes — accents ignorés) et un filtre par statut apparaissent dès que ta liste grandit. Avec des centaines de cibles synchronisées, retrouver une entreprise prend une seconde au lieu d’un long défilement. Filtrer sur « Refusé » les réaffiche le temps de la consultation.' },
  { v: '2.0.15', emoji: '🔎', text: 'Importer une sauvegarde ne se fait plus à l’aveugle : avant de remplacer tes données, l’app te montre CE QUE contient le fichier (séances, candidatures, agenda, XP, dernière activité) et t’avertit clairement s’il est vide, bien moins fourni ou plus ancien que tes données actuelles. Fini le risque d’écraser 6 mois de suivi avec un vieux fichier par erreur.' },
  { v: '2.0.14', emoji: '🩺', text: 'Nouveau dans Réglages → Sauvegarde & données : « Santé du stockage ». En un clic tu vois le poids de tes données, l’espace navigateur utilisé, la fraîcheur de ta copie de secours interne (et ses instantanés), et si la persistance renforcée est accordée — avec des alertes claires si quelque chose mérite ton attention.' },
  { v: '2.0.13', emoji: '🗓️', text: 'La copie de secours interne garde maintenant 7 jours d’historique : un instantané de tes données est conservé chaque jour, et en cas de pépin l’app restaure le plus récent qui soit valide — même si la copie principale a été abîmée entre-temps. L’équivalent des points de restauration, silencieux et automatique.' },
  { v: '2.0.12', emoji: '🛟', text: 'Tes données ont maintenant une copie de secours interne : en plus du stockage habituel, l’app entretient un miroir résilient (IndexedDB) mis à jour à chaque enregistrement, et demande au navigateur de protéger le tout contre le nettoyage automatique. Si le stockage principal est vidé (nettoyage, saturation, pépin), l’app restaure tes données depuis le miroir au lancement suivant — sans que tu fasses quoi que ce soit.' },
  { v: '2.0.11', emoji: '🎯', text: 'Le coach connaît maintenant tes objectifs : quand il te parle d’entraînement ou de focus, il compte par rapport à TON objectif de la semaine (« 1/4 séances sur ton objectif », « 25/120 min de focus ») au lieu d’un simple compteur. Un conseil ancré dans ce que TU t’es fixé, pas dans une moyenne générique.' },
  { v: '2.0.10', emoji: '📈', text: 'Le coach mesure maintenant si ses conseils te servent : sous « Le focus du moment », une petite ligne t’indique combien de ses conseils tu as suivis sur les 7 derniers jours (« Conseils suivis : 4/6 »). Suivre un conseil = avoir bougé sur ce pilier le jour même. Honnête dans les deux sens : ça félicite quand tu suis, ça encourage sans culpabiliser quand tu décroches.' },
  { v: '2.0.9', emoji: '🧠', text: 'Ton coach a maintenant de la mémoire : s’il t’a proposé le même focus trois jours de suite sans que ça bouge, il change d’angle — deuxième priorité, ou renfort de ce qui marche — au lieu de répéter la même chose. Un coach qui radote finit ignoré ; celui-là varie pour garder ton attention. (La priorité alternance, elle, ne lâche jamais.)' },
  { v: '2.0.8', emoji: '🗂️', text: 'Suivi d’alternance plus lisible : les candidatures refusées sont désormais masquées par défaut — tu ne vois que ce sur quoi tu peux encore avancer. Un bouton « Afficher » les rappelle à l’écran quand tu veux (elles restent comptées dans tes stats). Elles ne sont pas supprimées, sinon la sync les réimporterait depuis ton Sheets.' },
  { v: '2.0.7', emoji: '🎯', text: 'Sync alternance plus maligne : ton grand onglet « Cibles » (des milliers d’entreprises) est filtré automatiquement pour ne garder que les bonnes cibles — note ≥ 6/10 et proches de toi (Morbihan, Ille-et-Vilaine, et Loudéac en Côtes-d’Armor). Fini la liste noyée : tu récupères une shortlist d’entreprises à qui postuler, pas 15 000 lignes.' },
  { v: '2.0.6', emoji: '📄', text: 'Sync auto de ton Google Sheets d’alternance : publie tes onglets « Cibles » et « Suivi Existant » en CSV (Fichier → Partager → Publier sur le web → CSV), colle les liens dans l’onglet Alternance, et l’app récupère tes candidatures toute seule — au démarrage et régulièrement. Fusion intelligente (pas de doublon, un suivi déjà avancé n’est jamais remis en arrière). 100 % local et sécurisé : seul ce que tu publies est lu.' },
  { v: '2.0.5', emoji: '🔄', text: 'Mises à jour façon appli mobile : la nouvelle version se télécharge toute seule, en silence, en arrière-plan — plus aucune manip. Quand elle est prête, une petite pop-up « Version prête 🎉 » apparaît en bas : tu cliques « Redémarrer & installer », ou tu ne fais rien et elle se pose à la prochaine fermeture de l’app.' },
  { v: '2.0.4', emoji: '💼', text: 'Ton coach met désormais la recherche d’alternance en priorité n°1 : tant que tu n’as pas postulé du jour et pas décroché ta place, « Le focus du moment » affiche « Postule aujourd’hui pour ton alternance » avec le compte à rebours avant août, ton avancement de la semaine et ta série — le vrai coup de pouce pour candidater chaque jour. Une fois ta candidature du jour envoyée, le coach passe au reste.' },
  { v: '2.0.3', emoji: '🧭', text: 'Nouveau — ton coach adaptatif : sur l’accueil, une carte « Le focus du moment » lit ta dynamique des deux dernières semaines (entraînement, focus, sommeil, nutrition) et te propose UNE priorité du jour, avec un ton qui s’adapte : relancer un pilier qui s’essouffle, reprendre ce qui dort, ou renforcer ce qui monte. Un clic t’emmène au bon endroit.' },
  { v: '2.0.2', emoji: '📌', text: 'Recherche d’alternance : un rappel « Postule aujourd’hui » remonte dès l’accueil (dans « À rattraper ») tant que tu n’as pas postulé — et tu peux importer tes candidatures depuis un fichier CSV (export de ton Google Sheets).' },
  { v: '2.0.1', emoji: '💼', text: 'Nouveau : onglet « Recherche d’alternance » — pensé pour te pousser à postuler CHAQUE jour. Compte à rebours avant août, objectif de candidatures par semaine, série de jours d’affilée, suivi complet (à postuler → postulé → entretien → accepté) et rappels de relance. Clique « J’ai postulé » et gagne de l’XP.' },
  { v: '2.0.0', emoji: '🚀', text: 'Bienvenue en version 2.0 ! Ton app de vie est désormais complète : agenda + planning de révision BTS, coach poids sur mesure, entraînement guidé (47 exercices animés), suivi poids / mesures / sommeil en courbes, hydratation, nutrition, focus, habitudes et quêtes — 100 % local, sauvegardable, installable sur PC et iPhone. Place au polish et à tes retours. Merci d’être passé de la v1 à la v2 avec moi. 💚' },
  { v: '1.9.289', emoji: '☀️', text: 'Rituel du matin : une série « 🔥 N jours de check-in d’affilée » s’affiche quand tu poses ton cap plusieurs matins de suite — un petit encouragement pour le rituel qui lance ta journée (tolérance d’un jour manqué).' },
  { v: '1.9.288', emoji: '🧯', text: 'Robustesse : au chargement, l’app assainit ses compteurs et réglages (XP, série, objectifs de séances/km, cible poids, objectif routines) — une sauvegarde importée bancale ne peut plus produire de valeur absurde qui casserait ton niveau ou tes barres.' },
  { v: '1.9.287', emoji: '🎉', text: 'Quêtes : valider ta dernière quête du jour déclenche une petite célébration « Journée parfaite ! » (avec ta série en cours) — le moment est enfin fêté, pas juste comptabilisé.' },
  { v: '1.9.286', emoji: '📚', text: 'Accueil : « Prochaine révision » — comme pour ta prochaine séance de sport, ta prochaine révision planifiée s’affiche dans « Ma journée » (matière + quand), et un clic ouvre l’agenda au bon jour.' },
  { v: '1.9.285', emoji: '↩️', text: 'Agenda : reporter un événement à demain propose maintenant « Annuler » — un clic de travers ne t’oblige plus à retrouver l’événement et à corriger la date à la main.' },
  { v: '1.9.284', emoji: '😴', text: 'Sommeil : une mini-courbe des dernières nuits apparaît dans le bilan récupération (avec la moyenne) — tu vois d’un coup d’œil si ton sommeil progresse ou se dégrade, au-delà du seul chiffre du jour.' },
  { v: '1.9.283', emoji: '📉', text: 'Mensurations : une mini-courbe de ton tour de taille apparaît sous tes mesures — l’évolution devient visible d’un coup d’œil (utile pour suivre la recomposition, là où la balance seule ne dit pas tout).' },
  { v: '1.9.282', emoji: '📏', text: 'Mensurations : une seule entrée par jour (comme la pesée). Corriger une mesure ou compléter un champ plus tard dans la journée met à jour ta ligne du jour au lieu de créer un doublon — et ne perd pas les autres tours déjà notés.' },
  { v: '1.9.281', emoji: '♿', text: 'Accessibilité : l’onglet de navigation actif est désormais annoncé aux lecteurs d’écran (aria-current) — sur la barre principale comme sur le sous-menu Athlète.' },
  { v: '1.9.280', emoji: '🛡️', text: 'Import de sauvegarde plus sûr : restaurer un fichier de sauvegarde automatique (format enveloppé) ne risque plus d’effacer tes données — l’app reconnaît les deux formats de fichier.' },
  { v: '1.9.279', emoji: '📅', text: 'Habitudes : un « pouls » hebdomadaire résume toutes tes habitudes d’un coup d’œil — combien de rituels prévus tu as tenus cette semaine (%), avec une frise des 7 derniers jours.' },
  { v: '1.9.278', emoji: '🧹', text: 'Bibliothèque d’exercices : quand des filtres sont actifs (recherche, matériel, objectif, favoris…), un bandeau les affiche et un bouton « ✕ Réinitialiser » réaffiche tout en un clic — fini de rester bloqué sur « aucun résultat ».' },
  { v: '1.9.277', emoji: '💧', text: 'Hydratation : un indicateur de rythme te dit, selon l’heure, si tu es dans les temps sur tes verres d’eau — et te rappelle de boire quand tu prends du retard (jamais juste avant de dormir).' },
  { v: '1.9.276', emoji: '⬆️', text: 'Réglages → « Mises à jour » : vérifie les mises à jour à la demande et installe-les sans attendre le prochain démarrage (l’app continue aussi de vérifier automatiquement à l’ouverture et en tâche de fond).' },
  { v: '1.9.275', emoji: '🚶', text: 'Coach poids : une barre de progression globale montre d’un coup d’œil où tu en es entre ton point de départ et ta cible — pourcentage parcouru, kilos faits et kilos restants.' },
  { v: '1.9.274', emoji: '🔧', text: 'Coach poids : le sélecteur de cible affiche enfin la décimale en entier sur tous les écrans (« 88,5 » n’est plus rognée), et les petites flèches disgracieuses des champs numériques ont disparu partout dans l’app.' },
  { v: '1.9.273', emoji: '🌅', text: 'Aperçu de demain : « Ma journée » affiche maintenant ce que réserve le lendemain (nombre de blocs, première chose au programme) — pour préparer ta journée dès le soir.' },
  { v: '1.9.272', emoji: '☕', text: 'Chaque bloc de focus terminé te propose maintenant une pause adaptée (≈ 5 min après 25, plus après un long bloc), et une vraie coupure tous les 4 blocs — le rythme travail/pause complet.' },
  { v: '1.9.271', emoji: '🛟', text: 'Rappel de sauvegarde : « À rattraper » te signale quand tu n’as pas exporté tes données depuis longtemps (ou jamais) — il disparaît dès que c’est fait.' },
  { v: '1.9.270', emoji: '💾', text: 'Sauvegarde sur mobile : « Exporter » télécharge un fichier de tes données, « Importer » le recharge — ta sécurité contre une perte (surtout sur iPhone). Marche enfin hors app installée.' },
  { v: '1.9.269', emoji: '🎂', text: 'Un anniversaire dans un jour ou deux apparaît maintenant dans « À rattraper » sur l’accueil — tu ne l’oublieras plus.' },
  { v: '1.9.268', emoji: '👋', text: 'L’accueil te salue par ton prénom selon le moment de la journée (bonjour / bonsoir…) avec un petit mot adapté.' },
  { v: '1.9.267', emoji: '⚖️', text: 'Poids : une seule pesée par jour (une nouvelle saisie remplace celle du jour), où que tu l’enregistres — pour des tendances et un plan justes.' },
  { v: '1.9.266', emoji: '⎋', text: 'La touche Échap ferme maintenant l’agenda et le calendrier ouverts (plus besoin de viser le bouton ×).' },
  { v: '1.9.265', emoji: '📅', text: 'Onglet Poids : enregistre ton poids du jour directement là, vois ta dernière pesée (avec rappel), et ton plan se met à jour aussitôt.' },
  { v: '1.9.264', emoji: '🎚️', text: 'Nouveau sélecteur de poids cible : gros affichage et boutons − / + (0,5 kg) pour ajuster au pouce, sans taper.' },
  { v: '1.9.263', emoji: '⚖️', text: 'Le Coach Poids a désormais son propre onglet « Poids » dans la barre du haut — cible, paliers et plan réunis, plus besoin de fouiller dans Athlète.' },
  { v: '1.9.262', emoji: '🪜', text: 'Coach poids : des paliers intermédiaires vers ta cible (le poids à viser chaque semaine ou deux) + conseils de fréquence de pesée et mensurations. Et la carte « Nouveautés » se ferme bien désormais.' },
  { v: '1.9.261', emoji: '↩️', text: 'Supprimé une habitude par erreur ? Un bouton « Annuler » apparaît quelques secondes pour la récupérer avec toute son histoire.' },
  { v: '1.9.260', emoji: '✏️', text: 'Habitudes modifiables : renomme ou change les jours d’une habitude sans la supprimer — ta série et ton historique restent intacts.' },
  { v: '1.9.259', emoji: '📊', text: 'Habitudes : un taux de régularité sur 30 jours par habitude (vert/orange/rouge) — vois laquelle tu tiens vraiment sur la durée.' },
  { v: '1.9.258', emoji: '🔥', text: 'Série protéines : tes jours consécutifs à ta cible, avec ton record — la nutrition entre dans le jeu des séries.' },
  { v: '1.9.257', emoji: '🧠', text: 'Focus : « Où est passé ton temps » sur 7 jours, réparti par tâche — vois enfin sur quoi tu te concentres vraiment.' },
  { v: '1.9.256', emoji: '🧭', text: 'Bloc « À rattraper » : chaque ligne t’emmène pile au bon endroit (calendrier pour les révisions, onglet Séance pour la forme) et déroule jusqu’au panneau.' },
  { v: '1.9.255', emoji: '🎯', text: 'Nouveau bloc « À rattraper » sur l’accueil : révisions en retard, séances manquées, forme basse… tout ce qui a besoin d’attention, en un endroit.' },
  { v: '1.9.254', emoji: '📚', text: 'Révisions par matière : vois d’un coup d’œil laquelle est en retard (Compta, Droit…) et laquelle prioriser.' },
  { v: '1.9.253', emoji: '🧭', text: 'Onglet Athlète rangé en 3 zones (Faire maintenant · Mon entraînement · Récupération). « Base d’endurance » ne s’affiche que si tu vises l’endurance.' },
  { v: '1.9.252', emoji: '🎯', text: 'Poids cible rassemblé à un seul endroit : le panneau « Mon plan ». Un doute en moins, un renvoi depuis les objectifs.' },
  { v: '1.9.251', emoji: '📋', text: '« Prochaine séance » et « Planifier la suite » affichent enfin les séances de ton programme, pas seulement les créneaux ajoutés à la main.' },
  { v: '1.9.250', emoji: '♻️', text: 'Nouveau programme : les séances de l’ancien à venir sont enlevées — fini les jours à deux séances. Passé et RDV perso conservés.' },
  { v: '1.9.249', emoji: '🗓️', text: 'Conflit d’horaire : l’app te propose maintenant le prochain créneau libre au lieu de juste dire non.' },
  { v: '1.9.248', emoji: '🎯', text: 'Poids cible modifiable directement dans « Mon plan » + alerte si une séance en chevauche une autre.' },
  { v: '1.9.247', emoji: '🖼️', text: 'Photos : compressées à l’import — fini le stockage saturé sur mobile.' },
  { v: '1.9.246', emoji: '🎯', text: 'Poids cible : l’app te dit si elle est réaliste et cohérente avec ton objectif sportif.' },
  { v: '1.9.245', emoji: '🧭', text: 'Rubriques rangées (le programme et les routines ne s’affichent plus dans Réglages) + durée en heures.' },
  { v: '1.9.244', emoji: '⚡', text: 'Séance guidée : saisie des charges fluide (plus de blocage à chaque frappe).' },
  { v: '1.9.243', emoji: '⏳', text: 'Repos entre séries : ne dérive plus quand l’écran s’éteint, et survit à une interruption.' },
  { v: '1.9.242', emoji: '⏱️', text: 'Minuteur de focus : ne dérive plus en arrière-plan et survit à un rechargement.' },
  { v: '1.9.241', emoji: '💾', text: 'Séance guidée : ta séance n’est plus perdue si tu fermes l’app — reprends où tu en étais.' },
  { v: '1.9.240', emoji: '🔄', text: 'Séance guidée : remplace un exercice à la volée (même zone, ton matériel).' },
  { v: '1.9.239', emoji: '🎉', text: 'Séance guidée : record annoncé dès que tu le bats, sous la barre — plus à la fin.' },
  { v: '1.9.238', emoji: '➕', text: 'Séance guidée : ajoute ou retire une série à la volée (le nombre n’est plus figé).' },
  { v: '1.9.237', emoji: '📋', text: 'Séance guidée : « la dernière fois » — tes séries réelles du dernier passage, sous la barre.' },
  { v: '1.9.236', emoji: '🌱', text: 'Pas du jour : tes pas de vie ne sont plus effacés — série et taux de suivi.' },
  { v: '1.9.235', emoji: '🏅', text: 'Quêtes : tes journées parfaites sont enfin mémorisées (série + taux), plus effacées chaque nuit.' },
  { v: '1.9.234', emoji: '🎯', text: 'Suivi d’intention : tes intentions du matin sont reliées aux victoires du soir.' },
  { v: '1.9.233', emoji: '🧠', text: 'Focus : « ce qui a avancé » après chaque bloc est enfin réaffiché (c’était write-only).' },
  { v: '1.9.232', emoji: '⚡', text: 'Rituel du matin : tendance de ton énergie (moyenne + évolution), plus seulement le jour même.' },
  { v: '1.9.231', emoji: '💡', text: 'Rituel du soir : tes leçons passées reviennent aussi (l’indice à ton futur toi).' },
  { v: '1.9.230', emoji: '🏆', text: 'Rituel du soir : tes victoires passées te sont enfin réaffichées.' },
  { v: '1.9.229', emoji: '📚', text: 'Révisions : les séances passées jamais validées ne disparaissent plus (rattrapage).' },
  { v: '1.9.228', emoji: '🔥', text: 'Habitudes : alerte « série en jeu » pour les habitudes du jour pas encore validées.' },
  { v: '1.9.227', emoji: '📏', text: 'Mensurations : évolution récente (~30 j) en plus du cumul depuis le début.' },
  { v: '1.9.226', emoji: '📄', text: 'Données : export CSV du journal nutrition (protéines, eau, fruits/légumes).' },
  { v: '1.9.225', emoji: '🧠', text: 'Focus : objectif hebdo de minutes de concentration avec barre de progression.' },
  { v: '1.9.224', emoji: '📤', text: 'Revue : partage natif du bilan du mois (bouton Partager).' },
  { v: '1.9.223', emoji: '🗓️', text: 'Revue : bilan du mois (séances, km, bien-être, révisions, jours actifs) à copier.' },
  { v: '1.9.222', emoji: '🔴', text: 'Ma journée : les échéances agenda prioritaires (rendus, contrôles) en évidence.' },
  { v: '1.9.221', emoji: '💪', text: 'Nutrition : idée de collation pour combler le protéique restant du jour.' },
  { v: '1.9.220', emoji: '😴', text: 'Récup : bilan de sommeil de la semaine (moyenne + statut).' },
  { v: '1.9.219', emoji: '🌟', text: 'Mission Control : série de journées « complètes » (≥ 4 domaines).' },
  { v: '1.9.218', emoji: '🎯', text: 'Révisions BTS : rythme conseillé vers l\'examen (séances/semaine).' },
  { v: '1.9.217', emoji: '📚', text: 'Coaching : tes blocs terminés regroupés par objectif.' },
  { v: '1.9.216', emoji: '🤸', text: 'Bien-être : répartition des routines par famille cette semaine.' },
  { v: '1.9.215', emoji: '🩹', text: 'Onboarding : note blessures/limitations rappelée avant l\'entraînement.' },
  { v: '1.9.214', emoji: '📳', text: 'Vibrations sur les paliers bien-être et quêtes bouclées.' },
  { v: '1.9.213', emoji: '🏃', text: 'Coaching : course de la semaine vs objectif + progression.' },
  { v: '1.9.212', emoji: '📤', text: 'Bien-être : partage de ton bilan (série, minutes, paliers).' },
  { v: '1.9.211', emoji: '✅', text: 'Onboarding : une habitude de départ selon ton objectif.' },
  { v: '1.9.210', emoji: '📋', text: 'Raccourci « Ma journée » sur l\'icône installée.' },
  { v: '1.9.209', emoji: '⚖️', text: 'Coaching : équilibre course/muscu de la semaine.' },
  { v: '1.9.208', emoji: '🗓️', text: 'Bien-être : record de routines sur une semaine.' },
  { v: '1.9.207', emoji: '🙂', text: 'Onboarding : ton prénom/pseudo affiché sur ta carte joueur.' },
  { v: '1.9.206', emoji: '📤', text: 'Bouton « Partager l\'app » pour inviter un ami.' },
  { v: '1.9.205', emoji: '📅', text: 'Coaching : mes jours d\'entraînement + jour fort de la semaine.' },
  { v: '1.9.204', emoji: '⚡', text: 'Bien-être : routine express au hasard selon le temps dispo.' },
  { v: '1.9.203', emoji: '🚶', text: 'Onboarding : niveau d\'activité pour affiner les calories.' },
  { v: '1.9.202', emoji: '🕐', text: 'Thème selon l\'heure : clair le jour, sombre la nuit.' },
  { v: '1.9.201', emoji: '🗓️', text: 'Coaching : record hebdo de tonnage (meilleure semaine).' },
  { v: '1.9.200', emoji: '🎯', text: 'Bien-être : rappel de la zone du corps la moins mobilisée.' },
  { v: '1.9.199', emoji: '🔥', text: 'Onboarding : estimation calories/protéines en direct.' },
  { v: '1.9.198', emoji: '🎖️', text: 'Ancienneté « Membre depuis » avec paliers de fidélité.' },
  { v: '1.9.197', emoji: '📏', text: 'Coaching : score de régularité d\'entraînement (28 j).' },
  { v: '1.9.196', emoji: '🏅', text: 'Bien-être : record de série (meilleure suite de jours).' },
  { v: '1.9.195', emoji: '🏃', text: 'Onboarding : objectif de course hebdo (km).' },
  { v: '1.9.194', emoji: '🧘', text: 'Raccourci « Bien-être » (appui long sur l\'icône installée).' },
  { v: '1.9.193', emoji: '🏆', text: 'Coaching : record de tonnage sur une séance.' },
  { v: '1.9.192', emoji: '⏱️', text: 'Bien-être : total des minutes de mobilité de la semaine.' },
  { v: '1.9.191', emoji: '🎯', text: 'Onboarding : suggestion d\'objectif selon ton profil.' },
  { v: '1.9.190', emoji: '✨', text: 'Écran « Nouveautés » après chaque mise à jour.' },
  { v: '1.9.189', emoji: '📈', text: 'Tonnage muscu : tendance sur 8 semaines (mini-graphe).' },
  { v: '1.9.188', emoji: '🧘', text: 'Filtre des routines bien-être par temps dispo (≤4/5/6 min).' },
  { v: '1.9.187', emoji: '⚖️', text: 'Poids cible dès l\'onboarding, relié au coach poids.' },
  { v: '1.9.186', emoji: '📤', text: 'Partage d\'une routine bien-être (Web Share).' },
  { v: '1.9.185', emoji: '📊', text: 'Partage de ta progression de bloc.' },
];
// Compare deux versions « a.b.c » composant par composant : 1 si a>b, -1 si a<b, 0 si égales. Pur + testé.
function compareVersions(a, b) {
  const pa = String(a == null ? '' : a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b == null ? '' : b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d !== 0) return d > 0 ? 1 : -1; }
  return 0;
}
// Entrées de nouveautés à montrer après une mise à jour : celles dont la version est > lastSeen,
// triées de la plus récente à la plus ancienne, plafonnées (défaut 6). lastSeen absent/vide (1re
// utilisation) → [] : on n'ennuie pas un nouvel arrivant avec tout l'historique. Pur + testé.
function whatsNewSince(lastSeen, changelog, limit) {
  const log = Array.isArray(changelog) ? changelog : CHANGELOG;
  if (!lastSeen) return [];
  const cap = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.floor(Number(limit)) : 6;
  return log.filter(e => e && e.v && compareVersions(e.v, lastSeen) > 0)
    .sort((a, b) => compareVersions(b.v, a.v))
    .slice(0, cap);
}
// Paliers d'ancienneté (fidélité) — du plus haut au plus bas ; le premier atteint gagne.
const MEMBERSHIP_TIERS = [
  { days: 365, emoji: '💎', label: 'Vétéran' },
  { days: 100, emoji: '🏆', label: 'Habitué' },
  { days: 30, emoji: '⭐', label: 'Régulier' },
  { days: 7, emoji: '🌱', label: 'Lancé' },
  { days: 0, emoji: '👋', label: 'Nouveau' },
];
// Ancienneté depuis la 1re utilisation. installDate/today au format 'YYYY-MM-DD'. Renvoie { days,
// tier:{emoji,label}, next:{days,emoji,label,remaining}|null } ; days borné à ≥ 0 ; null si dates
// invalides. Pur + testé.
function membershipInfo(installDate, todayKey) {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(installDate || ''));
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!a || !b) return null;
  const start = new Date(+a[1], +a[2] - 1, +a[3]), today = new Date(+b[1], +b[2] - 1, +b[3]);
  const days = Math.max(0, Math.round((today - start) / 86400000));
  const tier = MEMBERSHIP_TIERS.find(t => days >= t.days);
  const higher = MEMBERSHIP_TIERS.filter(t => t.days > days).sort((x, y) => x.days - y.days);
  const next = higher.length ? { days: higher[0].days, emoji: higher[0].emoji, label: higher[0].label, remaining: higher[0].days - days } : null;
  return { days, tier: { emoji: tier.emoji, label: tier.label }, next };
}
// Message d'invitation à partager (Web Share) pour faire découvrir l'app. url : lien d'installation,
// inclus seulement s'il est en http/https (ignore file:// du desktop). Renvoie { title, text, url? }. Pur + testé.
function shareAppPayload(url) {
  const u = /^https?:\/\//.test(String(url || '')) ? String(url) : null;
  const payload = {
    title: 'IRL LVP UP — ton RPG de vie',
    text: 'Je gère mon sport, ma nutrition et mes révisions avec IRL LVP UP : un RPG de vie 100 % sur le téléphone, sans compte ni pub. Essaie !',
  };
  if (u) payload.url = u;
  return payload;
}
// Cibles de lancement PWA autorisées (raccourcis manifest « ?go=... » — appui long sur l'icône).
const LAUNCH_TARGETS = ['today', 'athlete', 'coach', 'nutrition', 'agenda', 'wellness'];
// Cible de lancement depuis la query string : renvoie une clé parmi LAUNCH_TARGETS, ou null si absente
// ou inconnue. Robuste aux entrées malformées. Pur + testé.
function launchTarget(search) {
  try {
    const go = new URLSearchParams(String(search || '')).get('go');
    return go && LAUNCH_TARGETS.indexOf(go) !== -1 ? go : null;
  } catch (_) { return null; }
}
// Faut-il ré-acquérir le verrou d'écran (Wake Lock) ? Vrai seulement si une séance guidée est ouverte
// ET que la page est de nouveau visible — le navigateur libère le lock quand la page passe cachée.
// Pur + testé.
function shouldReacquireWakeLock(dialogOpen, visibilityState) {
  return !!dialogOpen && visibilityState === 'visible';
}
// Nombre d'actions en attente aujourd'hui, pour le badge de l'icône PWA (setAppBadge) : quêtes non
// cochées + séances de sport planifiées ce jour. Borné à 99. Pur + testé.
function pendingBadgeCount(state, todayKey) {
  const s = state || {};
  const today = String(todayKey || '');
  const quests = Array.isArray(s.quests) ? s.quests.filter(q => q && !q.done).length : 0;
  const sessions = Array.isArray(s.agenda) ? s.agenda.filter(a => a && a.date === today && a.kind === 'sport').length : 0;
  return Math.min(99, quests + sessions);
}
// Motif de vibration (retour haptique mobile) pour un événement : tableau de durées en ms (compatible
// navigator.vibrate) ou null si l'événement n'a pas de motif. Pur + testé.
const VIBRATION_PATTERNS = {
  restEnd: [180, 90, 180],
  setDone: [40],
  record: [60, 40, 60, 40, 140],
  levelUp: [80, 50, 80, 50, 220],
  badge: [50, 40, 90, 40, 160],
  questDone: [30, 30, 60],
};
function vibrationPattern(event) {
  const p = VIBRATION_PATTERNS[event];
  return Array.isArray(p) ? p.slice() : null;
}

// Checklist « bien démarrer » calculée sur l'état réel : premières actions clés à cocher.
// Renvoie { items:[{key,label,done}], done, total, complete }. Pur + testé.
function starterChecklist(state, todayKey) {
  const s = state || {};
  const arr = k => Array.isArray(s[k]) ? s[k] : [];
  const today = String(todayKey || '');
  const water = arr('nutrition').filter(n => n && n.date === today).slice(-1)[0];
  const items = [
    { key: 'objective', label: 'Choisir ton objectif', done: !!s.fitnessObjective },
    { key: 'program', label: 'Programmer ta semaine', done: !!s.blockStart },
    { key: 'weight', label: 'Noter ton poids', done: arr('weights').length > 0 },
    { key: 'workout', label: 'Faire ta 1re séance', done: arr('workouts').length > 0 },
    { key: 'water', label: 'Boire ton eau du jour', done: !!water && (Number(water.water) || 0) >= 4 },
    { key: 'quest', label: 'Valider une quête', done: arr('quests').some(q => q && q.done) },
  ];
  const done = items.filter(i => i.done).length;
  return { items, done, total: items.length, complete: done >= items.length };
}

// Message de bienvenue personnalisé selon l'objectif : ce que l'app va mettre en place. Pur + testé.
const OBJECTIVE_WELCOME = {
  athletique: 'On construit un corps sportif : force + cardio équilibrés — 3 séances muscu et 3 courses/sem, nutrition au maintien.',
  muscle: 'Cap sur le muscle : 4 séances muscu ciblées, cardio léger, léger surplus riche en protéines.',
  seche: 'Objectif perte de gras : cardio (tempo/fractionné) + full body pour garder le muscle, déficit calorique maîtrisé.',
  endurance: 'Direction endurance/trail : volume de course (sorties longues) + renfo jambes et tronc.',
  forme: 'Remise en forme en douceur : full body + course facile, la régularité avant l\'intensité.',
};
function objectiveWelcome(key) {
  return OBJECTIVE_WELCOME[key] || OBJECTIVE_WELCOME.athletique;
}

// Construit le patch d'état initial à partir des réponses d'onboarding (profil, objectif, séances).
// inputs : { weight, height, age, sex, objective, sessions, equipment:{handles,vest,kettlebell,pullup} }.
// Valide/borne chaque champ ; objectif inconnu → 'athletique'. Pur + testé.
function onboardingSetup(inputs) {
  const i = inputs || {};
  const eq = i.equipment && typeof i.equipment === 'object' ? i.equipment : {};
  const objective = FITNESS_OBJECTIVES.some(o => o.key === i.objective) ? i.objective : 'athletique';
  const sessions = Math.max(1, Math.min(7, Math.round(Number(i.sessions) || 3)));
  const goalMap = { endurance: 'trail', muscle: 'force', seche: 'recomposition', forme: 'recomposition', athletique: 'recomposition' };
  const rawDays = Array.isArray(i.days) ? i.days.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : [];
  const availableDays = rawDays.length ? [...new Set(rawDays)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) : [1, 3, 5];
  const profile = {
    goal: goalMap[objective] || 'recomposition',
    age: (Number(i.age) >= 10 && Number(i.age) <= 100) ? Math.round(Number(i.age)) : 30,
    sex: i.sex === 'femme' ? 'femme' : 'homme',
    sessions,
    availableDays,
    trainingSlot: TRAINING_SLOTS[i.slot] ? i.slot : '',
    level: (i.level === 'debutant' || i.level === 'intermediaire' || i.level === 'avance') ? i.level : 'debutant',
    activityLevel: (['sedentaire', 'leger', 'modere', 'actif', 'tres'].indexOf(i.activity) !== -1) ? i.activity : '',
    name: (typeof i.name === 'string' ? i.name.trim().slice(0, 24) : ''),
    limitations: (typeof i.limitations === 'string' ? i.limitations.trim().slice(0, 140) : ''),
    equipment: { handles: !!eq.handles, vest: !!eq.vest, kettlebell: !!eq.kettlebell, pullup: !!eq.pullup },
  };
  const w = Number(i.weight); if (w >= 30 && w <= 300) profile.weight = Math.round(w * 10) / 10;
  const h = Number(i.height); if (h >= 100 && h <= 250) profile.height = Math.round(h);
  const goals = { sessions };
  const tw = Number(i.targetWeight); if (tw >= 30 && tw <= 300) goals.targetWeight = Math.round(tw * 10) / 10;
  const dist = Number(i.distance); if (dist > 0 && dist <= 500) goals.distance = Math.round(dist);
  return { fitnessObjective: objective, activeProgram: objective === 'endurance' ? 'run' : 'fullbody', goals, profile };
}
// Suggère un objectif physique à l'onboarding d'après le profil saisi. Priorité au poids cible
// (écart ≥ 3 kg → perte de gras / prise de muscle), sinon l'IMC (≥25 → seche, <18,5 → muscle,
// sinon athletique). Renvoie { key, label, reason } ou null si poids/taille insuffisants. Pur + testé.
function suggestObjective(inputs) {
  const i = inputs || {};
  const w = Number(i.weight), h = Number(i.height), tw = Number(i.targetWeight);
  const r1 = n => Math.round(n * 10) / 10;
  const validW = w >= 30 && w <= 300;
  if (validW && tw >= 30 && tw <= 300) {
    if (w - tw >= 3) return { key: 'seche', label: 'Perte de gras', reason: `Objectif ${r1(tw)} kg (−${r1(w - tw)} kg) : un programme perte de gras t'y amène en douceur.` };
    if (tw - w >= 3) return { key: 'muscle', label: 'Prise de muscle', reason: `Objectif ${r1(tw)} kg (+${r1(tw - w)} kg) : cap sur la prise de muscle.` };
  }
  if (validW && h >= 100 && h <= 250) {
    const bmi = r1(w / ((h / 100) ** 2));
    if (bmi >= 25) return { key: 'seche', label: 'Perte de gras', reason: `IMC ${String(bmi).replace('.', ',')} : un objectif perte de gras est un bon point de départ.` };
    if (bmi < 18.5) return { key: 'muscle', label: 'Prise de muscle', reason: `IMC ${String(bmi).replace('.', ',')} : viser la prise de muscle te construit une base solide.` };
    return { key: 'athletique', label: 'Corps athlétique', reason: `IMC ${String(bmi).replace('.', ',')}, dans la norme : un corps athlétique équilibre force et cardio.` };
  }
  return null;
}
// Habitude de départ suggérée selon l'objectif physique — pour lancer la dynamique dès l'onboarding.
const STARTER_HABITS = {
  seche: { name: 'Boire 2 L d\'eau', xp: 10 },
  muscle: { name: 'Protéines à chaque repas', xp: 10 },
  endurance: { name: '10 min d\'étirement', xp: 10 },
  forme: { name: '10 min de marche', xp: 10 },
  athletique: { name: 'Se coucher avant 23 h', xp: 10 },
};
// Habitude de départ (tous les jours) adaptée à l'objectif. Objectif inconnu → celle du corps athlétique.
// Renvoie { name, xp, weekdays:[0..6] }. Pur + testé.
function starterHabitFor(objective) {
  const base = STARTER_HABITS[objective] || STARTER_HABITS.athletique;
  return { name: base.name, xp: base.xp, weekdays: [0, 1, 2, 3, 4, 5, 6] };
}
// Horaires par défaut des séances selon le moment préféré. Clé inconnue/'' → comportement historique
// (muscu le soir, course le matin). Renvoie { muscu, course } en 'HH:MM'. Pur + testé.
const TRAINING_SLOTS = {
  matin: { muscu: '07:00', course: '07:30', label: 'Matin' },
  midi: { muscu: '12:15', course: '12:00', label: 'Midi' },
  soir: { muscu: '18:00', course: '18:30', label: 'Soir' },
};
function sessionTimesForSlot(slot) {
  const s = TRAINING_SLOTS[slot];
  return s ? { muscu: s.muscu, course: s.course } : { muscu: '18:00', course: '07:30' };
}
// Nombre d'exercices par séance de muscu selon le niveau : débutant 4, intermédiaire 5, avancé 6.
// Clé inconnue → 5 (défaut). Pilote le volume du programme par objectif. Pur + testé.
function perSessionForLevel(level) {
  return level === 'debutant' ? 4 : level === 'avance' ? 6 : 5;
}
// Première séance planifiée d'un programme (ordre chronologique lundi→dimanche) et sa date à partir du
// lundi de départ. Renvoie { title, kind, weekday, date, dayLabel, guidable } ou null si vide.
// guidable = séance de muscu avec exercices (lançable en mode guidé). Pur + testé.
function onboardingFirstSession(week, mondayKey) {
  const list = (Array.isArray(week) ? week : []).filter(s => s && Number.isInteger(s.weekday));
  if (!list.length) return null;
  const s = list.slice().sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(mondayKey || ''));
  let date = '';
  if (m) { const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setDate(d.getDate() + ((s.weekday + 6) % 7)); date = dateKey(d); }
  return {
    title: s.title || '', kind: s.kind, weekday: s.weekday, date,
    dayLabel: WEEKDAY_FR[s.weekday] || '',
    guidable: s.kind === 'muscu' && Array.isArray(s.exercises) && s.exercises.length > 0,
  };
}
// Complétude du profil d'onboarding à partir des saisies : objectif, poids, taille, âge, jours dispo,
// moment préféré. Renvoie { percent, filled, total, nutritionReady, missing:[labels] }. nutritionReady
// = poids ET taille valides (nécessaires aux calories/macros). Pur + testé.
function onboardingCompleteness(inputs) {
  const i = inputs || {};
  const w = Number(i.weight), h = Number(i.height), a = Number(i.age);
  const checks = [
    { key: 'objective', ok: !!i.objective },
    { key: 'weight', ok: w >= 30 && w <= 300, label: 'poids' },
    { key: 'height', ok: h >= 100 && h <= 250, label: 'taille' },
    { key: 'age', ok: a >= 10 && a <= 100, label: 'âge' },
    { key: 'days', ok: Array.isArray(i.days) && i.days.length > 0, label: 'jours dispo' },
    { key: 'slot', ok: !!i.slot, label: 'moment préféré' },
  ];
  const filled = checks.filter(c => c.ok).length;
  const nutritionReady = checks.find(c => c.key === 'weight').ok && checks.find(c => c.key === 'height').ok;
  return { percent: Math.round(filled / checks.length * 100), filled, total: checks.length, nutritionReady, missing: checks.filter(c => !c.ok && c.label).map(c => c.label) };
}
// Nettoie/valide un brouillon d'onboarding (saisies partielles à reprendre) : ne garde que les champs
// connus et valides (objectif, poids, taille, âge, sexe, niveau, séances, créneau, jours). Renvoie un
// objet ou null si rien de valide. Pur + testé.
function sanitizeOnboardingDraft(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const d = {};
  if (FITNESS_OBJECTIVES.some(o => o.key === r.objective)) d.objective = r.objective;
  const w = Number(r.weight); if (w >= 30 && w <= 300) d.weight = Math.round(w * 10) / 10;
  const h = Number(r.height); if (h >= 100 && h <= 250) d.height = Math.round(h);
  const a = Number(r.age); if (a >= 10 && a <= 100) d.age = Math.round(a);
  if (r.sex === 'homme' || r.sex === 'femme') d.sex = r.sex;
  if (r.level === 'debutant' || r.level === 'intermediaire' || r.level === 'avance') d.level = r.level;
  const s = Number(r.sessions); if (s >= 1 && s <= 7) d.sessions = Math.round(s);
  if (TRAINING_SLOTS[r.slot]) d.slot = r.slot;
  const days = Array.isArray(r.days) ? [...new Set(r.days.map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6))].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)) : [];
  if (days.length) d.days = days;
  return Object.keys(d).length ? d : null;
}

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
// Replace les séances d'un programme sur les jours réellement disponibles (0=Dim..6=Sam), en les
// espaçant : si assez de jours, une séance par jour bien répartie ; sinon on double sur certains jours.
// availableDays invalide/vide → programme inchangé. Renvoie une nouvelle semaine triée (lundi d'abord).
// Pur + testé.
function assignProgramDays(week, availableDays) {
  const list = Array.isArray(week) ? week : [];
  const raw = Array.isArray(availableDays) ? availableDays.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : [];
  const days = [...new Set(raw)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (!list.length || !days.length) return list.map(s => ({ ...s }));
  const n = list.length, d = days.length;
  return list.map((s, i) => {
    let idx;
    if (n <= d) idx = n === 1 ? 0 : Math.round(i * (d - 1) / (n - 1));
    else idx = Math.min(d - 1, Math.floor(i * d / n));
    return { ...s, weekday: days[idx] };
  }).sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
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
// Détaille les macros (protéines/glucides/lipides) d'un objectif nutrition : grammes, rôle et part
// des calories du jour (P/G = 4 kcal/g, L = 9). Renvoie [{key,emoji,label,grams,role,pct}] ou [] si
// données absentes. Pur + testé.
function macroBreakdown(nutri) {
  const n = nutri && typeof nutri === 'object' ? nutri : null;
  if (!n || !(Number(n.proteinG) > 0)) return [];
  const kcal = Math.max(1, Number(n.dailyTarget) || 0);
  const pctOf = (g, perG) => Math.round((Number(g) || 0) * perG / kcal * 100);
  return [
    { key: 'protein', emoji: '🥩', label: 'Protéines', grams: Math.round(Number(n.proteinG) || 0), role: 'construit et répare le muscle', pct: pctOf(n.proteinG, 4) },
    { key: 'carb', emoji: '🍚', label: 'Glucides', grams: Math.round(Number(n.carbG) || 0), role: 'ton carburant pour l\'effort', pct: pctOf(n.carbG, 4) },
    { key: 'fat', emoji: '🥑', label: 'Lipides', grams: Math.round(Number(n.fatG) || 0), role: 'hormones et santé', pct: pctOf(n.fatG, 9) },
  ];
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
// Prépare un objet de partage natif (Web Share) pour un programme : { title, text }. Le titre reprend
// l'emoji + le nom du programme, le texte est l'export lisible. null si programme vide. Pur + testé.
function shareableProgram(program, opts) {
  const text = objectiveProgramText(program, opts);
  if (!text) return null;
  const p = program || {};
  const title = `${p.emoji ? p.emoji + ' ' : ''}${p.title} — ma semaine d'entraînement`.trim();
  return { title, text };
}

// Routines bien-être : mobilité, étirements, échauffement, récupération. Chaque mouvement est
// tenu `sec` secondes (guidé comme une séance, unité 'sec'). Contenu curé, sans matériel.
const WELLNESS_ROUTINES = [
  { key: 'warmup', emoji: '🔥', title: 'Échauffement dynamique', minutes: 5, why: 'Réveille le corps avant l\'effort : cœur, articulations, muscles.', moves: [
    { name: 'Cercles de bras', sec: 30, cue: 'Grands cercles avant puis arrière, épaules relâchées.' },
    { name: 'Rotations du tronc', sec: 30, cue: 'Pieds fixes, tourne le buste de gauche à droite.' },
    { name: 'Balancements de jambe', sec: 40, cue: 'Appuie-toi à un mur, balance chaque jambe d\'avant en arrière.' },
    { name: 'Fentes marchées', sec: 40, cue: 'Grands pas, genou arrière vers le sol, buste droit.' },
    { name: 'Squats à vide', sec: 40, cue: 'Descends lentement, poids sur les talons.' },
    { name: 'Talons-fesses', sec: 30, cue: 'Sur place, ramène les talons vers les fessiers.' },
  ] },
  { key: 'hips', emoji: '🦵', title: 'Mobilité hanches', minutes: 6, why: 'Des hanches souples = squats plus profonds, moins de mal de dos.', moves: [
    { name: 'Fente basse + rotation', sec: 45, cue: 'En fente, main au sol, ouvre le bras vers le ciel.' },
    { name: '90/90 hanches', sec: 60, cue: 'Assis, une jambe devant une derrière à 90°, bascule d\'un côté à l\'autre.' },
    { name: 'Pont fessier', sec: 45, cue: 'Sur le dos, pousse les hanches vers le haut, serre les fessiers.' },
    { name: 'Squat profond tenu', sec: 45, cue: 'Talons au sol, coudes qui poussent les genoux vers l\'extérieur.' },
    { name: 'Étirement psoas', sec: 60, cue: 'Genou au sol, avance le bassin, sens l\'avant de la hanche.' },
  ] },
  { key: 'shoulders', emoji: '🏔️', title: 'Mobilité épaules', minutes: 5, why: 'Prépare tractions et pompes, ouvre la posture.', moves: [
    { name: 'Dislocations (bâton/serviette)', sec: 45, cue: 'Bras tendus, passe une serviette de l\'avant à l\'arrière.' },
    { name: 'Cercles d\'omoplates', sec: 30, cue: 'Rentre et sors les omoplates en cercle.' },
    { name: 'Étirement porte de chambranle', sec: 60, cue: 'Avant-bras contre le mur, avance le buste, sens l\'ouverture des pecs.' },
    { name: 'Rotation externe bras', sec: 45, cue: 'Coude au corps, ouvre l\'avant-bras vers l\'extérieur.' },
  ] },
  { key: 'stretch', emoji: '🧘', title: 'Étirements complets', minutes: 8, why: 'Relâche les grands groupes après une séance.', moves: [
    { name: 'Ischios (jambe tendue)', sec: 45, cue: 'Debout ou assis, penche-toi vers le pied, dos long.' },
    { name: 'Quadriceps debout', sec: 45, cue: 'Attrape la cheville, genou vers le sol, bassin en avant.' },
    { name: 'Fessiers (figure 4)', sec: 60, cue: 'Sur le dos, cheville sur le genou opposé, tire la cuisse.' },
    { name: 'Dos (posture de l\'enfant)', sec: 60, cue: 'À genoux, bras tendus devant, relâche le dos.' },
    { name: 'Pecs / épaules au sol', sec: 45, cue: 'Bras au sol en croix, laisse la poitrine s\'ouvrir.' },
    { name: 'Mollets contre le mur', sec: 45, cue: 'Jambe arrière tendue, talon au sol, avance le bassin.' },
  ] },
  { key: 'cooldown', emoji: '🧊', title: 'Retour au calme', minutes: 5, why: 'Fait redescendre le cœur et détend après la course/muscu.', moves: [
    { name: 'Respiration profonde', sec: 60, cue: 'Inspire 4 s, expire 6 s, épaules basses.' },
    { name: 'Marche sur place lente', sec: 60, cue: 'Décontracte les jambes, respire calmement.' },
    { name: 'Étirement chaîne postérieure', sec: 60, cue: 'Penché en avant, relâche la nuque et le dos.' },
    { name: 'Torsion allongée', sec: 60, cue: 'Sur le dos, genoux d\'un côté, regard de l\'autre.' },
  ] },
  { key: 'morning', emoji: '☀️', title: 'Réveil articulaire', minutes: 4, why: 'Démarre la journée en douceur, dérouille les articulations.', moves: [
    { name: 'Cercles de nuque', sec: 30, cue: 'Lents et petits, sans forcer.' },
    { name: 'Cercles de chevilles & poignets', sec: 40, cue: 'Dans les deux sens.' },
    { name: 'Chat-vache', sec: 45, cue: 'À quatre pattes, arrondis puis creuse le dos.' },
    { name: 'Étirement latéral debout', sec: 40, cue: 'Bras au-dessus de la tête, penche de chaque côté.' },
  ] },
  { key: 'backpain', emoji: '🩹', title: 'Bas du dos', minutes: 6, why: 'Soulage et renforce le bas du dos (position assise, port de charges).', moves: [
    { name: 'Bascule du bassin', sec: 45, cue: 'Sur le dos, plaque le bas du dos au sol puis relâche.' },
    { name: 'Genoux vers la poitrine', sec: 45, cue: 'Ramène les deux genoux, berce doucement.' },
    { name: 'Chat-vache', sec: 45, cue: 'À quatre pattes, respire à chaque mouvement.' },
    { name: 'Étirement du piriforme', sec: 60, cue: 'Figure 4 au sol, tire la cuisse vers toi.' },
    { name: 'Gainage planche (léger)', sec: 30, cue: 'Dos neutre, gaine sans cambrer, 20–30 s.' },
    { name: 'Cobra doux', sec: 30, cue: 'À plat ventre, redresse le buste sans forcer les lombaires.' },
  ] },
  { key: 'sleep', emoji: '😴', title: 'Détente du soir', minutes: 6, why: 'Fait redescendre le système nerveux pour mieux dormir.', moves: [
    { name: 'Respiration 4-7-8', sec: 90, cue: 'Inspire 4 s, retiens 7 s, expire 8 s.' },
    { name: 'Étirement cou & épaules', sec: 45, cue: 'Incline la tête, relâche les trapèzes.' },
    { name: 'Torsion allongée', sec: 60, cue: 'Genoux d\'un côté, regard de l\'autre, respire.' },
    { name: 'Jambes contre le mur', sec: 90, cue: 'Bassin près du mur, jambes verticales, relâche.' },
    { name: 'Posture de l\'enfant', sec: 60, cue: 'Front au sol, bras devant, souffle long.' },
  ] },
  { key: 'ankles', emoji: '🦶', title: 'Chevilles & pieds', minutes: 5, why: 'Chevilles solides = moins d\'entorses en course/trail et une meilleure poussée.', moves: [
    { name: 'Cercles de chevilles', sec: 40, cue: 'Assis ou debout, dessine des cercles lents dans les deux sens.' },
    { name: 'Montées sur pointes', sec: 40, cue: 'Monte sur la pointe des pieds, redescends lentement.' },
    { name: 'Marche talons puis pointes', sec: 40, cue: 'Quelques pas sur les talons, puis sur la pointe des pieds.' },
    { name: 'Équilibre sur un pied', sec: 40, cue: 'Tiens 20 s par pied, regard fixe, genou souple.' },
    { name: 'Étirement mollet (fente)', sec: 45, cue: 'Jambe arrière tendue, talon au sol, avance le bassin.' },
    { name: 'Flexion des orteils', sec: 30, cue: 'Orteils repliés au sol, assieds-toi doucement sur les talons.' },
  ] },
  { key: 'neck', emoji: '💆', title: 'Nuque & trapèzes', minutes: 4, why: 'Relâche les tensions du travail assis et des écrans.', moves: [
    { name: 'Inclinaisons de tête', sec: 40, cue: 'Oreille vers l\'épaule, la main accompagne sans forcer.' },
    { name: 'Rotations lentes', sec: 30, cue: 'Tourne la tête d\'un côté à l\'autre, épaules basses.' },
    { name: 'Rentrés de menton', sec: 30, cue: 'Recule le menton (double menton), tiens 3 s, relâche.' },
    { name: 'Haussements d\'épaules', sec: 30, cue: 'Monte les épaules vers les oreilles, relâche d\'un coup.' },
    { name: 'Étirement du trapèze', sec: 45, cue: 'Main derrière le dos, incline la tête du côté opposé.' },
  ] },
  { key: 'wrists', emoji: '🖐️', title: 'Poignets & avant-bras', minutes: 4, why: 'Prépare pompes et tractions, soulage les poignets du clavier.', moves: [
    { name: 'Cercles de poignets', sec: 30, cue: 'Poings fermés, cercles lents dans les deux sens.' },
    { name: 'Étirement fléchisseurs', sec: 40, cue: 'Bras tendu, paume vers le haut, tire doucement les doigts vers toi.' },
    { name: 'Étirement extenseurs', sec: 40, cue: 'Bras tendu, paume vers le bas, tire la main vers toi.' },
    { name: 'Appui poignets au sol', sec: 40, cue: 'À quatre pattes, doigts vers les genoux, bascule doucement.' },
    { name: 'Ouvrir / fermer les mains', sec: 30, cue: 'Serre fort puis écarte les doigts au maximum, répète.' },
  ] },
];
// Prépare une routine bien-être pour la séance guidée (mouvements → exercices en secondes). Null si clé inconnue. Pur + testé.
function wellnessRoutine(key) {
  const r = WELLNESS_ROUTINES.find(x => x.key === key);
  if (!r) return null;
  return { key: r.key, emoji: r.emoji, title: r.title, minutes: r.minutes, why: r.why, exercises: r.moves.map(m => ({ name: m.name, sets: 1, reps: Number(m.sec) || 30, unit: 'sec', rest: 0, cue: m.cue })) };
}
// Suggère une routine bien-être selon la forme du jour et la charge : récup si forme basse / charge
// élevée, échauffement si en forme, sinon un peu de mobilité. Renvoie { key, tone, reason }. Pur + testé.
function suggestedRoutine(loadStatus, readinessScore) {
  const rs = (readinessScore == null || readinessScore === '' || !Number.isFinite(Number(readinessScore))) ? null : Number(readinessScore);
  const lowForm = rs != null && rs < 50;
  const heavyLoad = loadStatus === 'deload' || loadStatus === 'high' || loadStatus === 'ease';
  if (lowForm || heavyLoad) return { key: 'cooldown', tone: 'recover', reason: 'Forme basse ou charge élevée : place plutôt une routine de récupération / étirements aujourd\'hui.' };
  if (rs != null && rs >= 75) return { key: 'warmup', tone: 'ready', reason: 'Bonne forme : un échauffement dynamique et tu es prêt à pousser.' };
  return { key: 'hips', tone: 'mobility', reason: 'Un peu de mobilité entretient tes articulations entre les séances.' };
}
// Zone dominante d'une séance de muscu à partir des zones de ses exercices (noms ou objets {name}).
// Renvoie la zone la plus fréquente, ou null si aucune zone connue. Pur + testé.
function workoutDominantZone(workout) {
  const list = workout && Array.isArray(workout.exercises) ? workout.exercises : [];
  const tally = {};
  list.forEach(ex => {
    const name = typeof ex === 'string' ? ex : (ex && ex.name);
    (exerciseZones(name) || []).forEach(z => { tally[z] = (tally[z] || 0) + 1; });
  });
  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries[0][0] : null;
}
// Suggestion de routine bien-être CONTEXTUELLE : si une séance a été loggée aujourd'hui ou hier,
// cible la récup selon ce qui a été travaillé (course → chevilles, jambes → hanches, haut du corps
// → épaules, gainage → bas du dos). Sinon retombe sur suggestedRoutine(charge, forme). Renvoie
// { key, tone, reason }. Pur + testé.
function contextualWellnessRoutine(state, todayKey, loadStatus, readinessScore) {
  const s = state || {};
  const workouts = Array.isArray(s.workouts) ? s.workouts : [];
  const last = workouts[workouts.length - 1];
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  const l = last && /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(last.date || ''));
  if (last && t && l) {
    const today = new Date(+t[1], +t[2] - 1, +t[3]);
    const done = new Date(+l[1], +l[2] - 1, +l[3]);
    const days = Math.round((today - done) / 86400000);
    if (days >= 0 && days <= 1) {
      if (last.type === 'run') return { key: 'ankles', tone: 'recover', reason: 'Après ta course : mobilise chevilles et mollets pour bien récupérer.' };
      const zone = workoutDominantZone(last);
      if (zone === 'legs' || zone === 'glutes') return { key: 'hips', tone: 'recover', reason: 'Grosse séance jambes : un peu de mobilité hanches pour récupérer.' };
      if (zone === 'back' || zone === 'chest' || zone === 'shoulders' || zone === 'arms') return { key: 'shoulders', tone: 'recover', reason: 'Après le haut du corps : ouvre les épaules pour récupérer.' };
      if (zone === 'abs' || zone === 'core') return { key: 'backpain', tone: 'recover', reason: 'Après le gainage : détends le bas du dos.' };
    }
  }
  return suggestedRoutine(loadStatus, readinessScore);
}
// Journalise une routine bien-être faite ({date, key}), sans doublon même jour+clé, plafonné.
// Renvoie une nouvelle liste. Ignore clé/date invalides. Pur + testé.
function logWellnessDone(list, key, date, cap) {
  const arr = Array.isArray(list) ? list.slice() : [];
  const k = String(key || ''), d = String(date || '');
  if (!k || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return arr;
  if (arr.some(x => x && x.date === d && x.key === k)) return arr;
  arr.push({ date: d, key: k });
  return arr.slice(-Math.max(30, Math.round(Number(cap) || 400)));
}
// Série (streak) de jours consécutifs — jusqu'à aujourd'hui, ou hier si rien encore fait aujourd'hui —
// avec au moins une routine bien-être. 0 si vide/invalide. Pur + testé.
function wellnessStreak(list, todayKey) {
  const days = new Set((Array.isArray(list) ? list : []).filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.date)).map(x => x.date));
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!days.size || !t) return 0;
  const cur = new Date(+t[1], +t[2] - 1, +t[3]); cur.setHours(0, 0, 0, 0);
  if (!days.has(dateKey(cur))) { cur.setDate(cur.getDate() - 1); if (!days.has(dateKey(cur))) return 0; }
  let n = 0;
  while (days.has(dateKey(cur))) { n++; cur.setDate(cur.getDate() - 1); }
  return n;
}
// Plus longue série de jours consécutifs avec au moins une routine bien-être (record all-time). 0 si
// vide/invalide. Pur + testé.
function wellnessBestStreak(list) {
  const days = [...new Set((Array.isArray(list) ? list : []).filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.date)).map(x => x.date))].sort();
  if (!days.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round((new Date(days[i] + 'T12:00:00') - new Date(days[i - 1] + 'T12:00:00')) / 86400000);
    if (diff === 1) { cur++; if (cur > best) best = cur; }
    else if (diff > 1) cur = 1;
  }
  return best;
}
// Nombre de routines bien-être faites dans la fenêtre [startKey..endKey] (bornes incluses). Pur + testé.
function wellnessCountInWindow(list, startKey, endKey) {
  const s = String(startKey || ''), e = String(endKey || '');
  return (Array.isArray(list) ? list : []).filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && x.date >= s && x.date <= e).length;
}
// Durée (minutes) associée à une clé de routine loggée : routine simple, ou parcours « parcours-<key> ».
// 0 si clé inconnue. Pur + testé.
function wellnessMinutesForKey(key) {
  const k = String(key || '');
  if (k.startsWith('parcours-')) { const p = wellnessParcours(k.slice(9)); return p ? p.minutes : 0; }
  const r = WELLNESS_ROUTINES.find(x => x.key === k);
  return r ? r.minutes : 0;
}
// Total des minutes de mobilité faites dans la fenêtre [startKey..endKey] (bornes incluses) : somme des
// durées des routines/parcours loggés. Pur + testé.
function wellnessMinutesInWindow(list, startKey, endKey) {
  const s = String(startKey || ''), e = String(endKey || '');
  return (Array.isArray(list) ? list : []).reduce((sum, x) => {
    if (!x || !/^\d{4}-\d{2}-\d{2}$/.test(x.date) || x.date < s || x.date > e) return sum;
    return sum + wellnessMinutesForKey(x.key);
  }, 0);
}
// Meilleure semaine bien-être (record de routines faites sur une semaine lundi→dimanche, all-time).
// Renvoie { weekStart, count, isCurrent } ou null si aucune routine. isCurrent = semaine de todayKey.
// Égalité → semaine la plus récente. Pur + testé.
function bestWellnessWeek(list, todayKey) {
  const byWeek = {};
  (Array.isArray(list) ? list : []).forEach(x => {
    if (!x || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.date))) return;
    const wk = dateKey(mondayOf(new Date(String(x.date) + 'T12:00:00')));
    byWeek[wk] = (byWeek[wk] || 0) + 1;
  });
  const entries = Object.entries(byWeek);
  if (!entries.length) return null;
  let best = null;
  entries.forEach(([wk, c]) => { if (!best || c > best.count || (c === best.count && wk > best.weekStart)) best = { weekStart: wk, count: c }; });
  const curWeek = /^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || '')) ? dateKey(mondayOf(new Date(String(todayKey) + 'T12:00:00'))) : null;
  return { weekStart: best.weekStart, count: best.count, isCurrent: curWeek != null && best.weekStart === curWeek };
}
// Objet de partage natif (Web Share) du bilan bien-être : série, routines de la semaine, minutes de
// mobilité, total, paliers. { title, text } ou null si aucune routine. Pur + testé.
function shareableWellness(wellnessDone, todayKey) {
  const list = Array.isArray(wellnessDone) ? wellnessDone : [];
  if (!list.length) return null;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''));
  const total = list.length;
  const streak = valid ? wellnessStreak(list, todayKey) : 0;
  let week = 0, min = 0, badges = [];
  if (valid) {
    const monday = dateKey(mondayOf(new Date(String(todayKey) + 'T12:00:00')));
    week = wellnessCountInWindow(list, monday, todayKey);
    min = wellnessMinutesInWindow(list, monday, todayKey);
    const bd = wellnessBadges(list, todayKey);
    badges = (bd && bd.badges) ? bd.badges : [];
  }
  const lines = ['🧘 Mon bilan bien-être'];
  if (streak > 0) lines.push(`🔥 ${streak} jour${streak > 1 ? 's' : ''} de suite`);
  if (valid) lines.push(`Cette semaine : ${week} routine${week > 1 ? 's' : ''} · ${min} min de mobilité`);
  lines.push(`${total} routine${total > 1 ? 's' : ''} au total`);
  if (badges.length) lines.push('Paliers : ' + badges.map(b => `${b.emoji} ${b.label}`).join(', '));
  return { title: '🧘 Mon bilan bien-être — IRL LVP UP', text: lines.join('\n') };
}
// Famille de chaque routine bien-être (pour la répartition hebdo).
const WELLNESS_FAMILIES = {
  warmup: { label: 'Échauffement', emoji: '🔥' },
  hips: { label: 'Mobilité', emoji: '🤸' }, shoulders: { label: 'Mobilité', emoji: '🤸' }, ankles: { label: 'Mobilité', emoji: '🤸' }, neck: { label: 'Mobilité', emoji: '🤸' }, wrists: { label: 'Mobilité', emoji: '🤸' }, morning: { label: 'Mobilité', emoji: '🤸' },
  stretch: { label: 'Étirement', emoji: '🧘' },
  cooldown: { label: 'Détente', emoji: '😌' }, sleep: { label: 'Détente', emoji: '😌' }, backpain: { label: 'Détente', emoji: '😌' },
};
// Répartition des routines faites dans la fenêtre [startKey..endKey] par famille (échauffement/mobilité/
// étirement/détente). Renvoie [{ family, emoji, count }] trié par count décroissant, ou [] si aucune
// routine connue. Ignore les clés de parcours et inconnues. Pur + testé.
function wellnessFamilyBreakdown(wellnessDone, startKey, endKey) {
  const s = String(startKey || ''), e = String(endKey || '');
  const tally = {};
  (Array.isArray(wellnessDone) ? wellnessDone : []).forEach(x => {
    if (!x || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) || x.date < s || x.date > e) return;
    const fam = WELLNESS_FAMILIES[x.key];
    if (!fam) return;
    if (!tally[fam.label]) tally[fam.label] = { family: fam.label, emoji: fam.emoji, count: 0 };
    tally[fam.label].count++;
  });
  return Object.values(tally).sort((a, b) => b.count - a.count || a.family.localeCompare(b.family, 'fr'));
}
// Progression vers l'objectif hebdo de routines : { done, target (borné 1-14), pct (0-100), reached,
// remaining }. Pur + testé.
function wellnessGoalProgress(count, target) {
  const t = Math.max(1, Math.min(14, Math.round(Number(target) || 3)));
  const c = Math.max(0, Math.round(Number(count) || 0));
  return { done: c, target: t, pct: Math.min(100, Math.round(c / t * 100)), reached: c >= t, remaining: Math.max(0, t - c) };
}
// Rappel doux d'inactivité bien-être : si des routines ont déjà été faites mais aucune depuis
// `thresholdDays` (défaut 3), renvoie { inactive:true, days, message }. Sinon { inactive:false, days }.
// Ne relance pas un utilisateur qui n'a jamais commencé (liste vide → inactive:false, days:null). Pur + testé.
function wellnessInactivity(list, todayKey, thresholdDays) {
  const th = Math.max(2, Math.round(Number(thresholdDays) || 3));
  const dates = (Array.isArray(list) ? list : []).map(x => x && x.date).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))).sort();
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!dates.length || !t) return { inactive: false, days: null };
  const last = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dates[dates.length - 1]);
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  const lastD = new Date(+last[1], +last[2] - 1, +last[3]); lastD.setHours(0, 0, 0, 0);
  const days = Math.round((today - lastD) / 86400000);
  if (days < th) return { inactive: false, days };
  return { inactive: true, days, message: `Ça fait ${days} jours sans routine bien-être — 5 min de mobilité te feraient du bien 🧘` };
}
// Routines bien-être ciblant une zone précise du corps (pour le rappel « zone la moins mobilisée »).
const WELLNESS_ZONE_ROUTINES = ['hips', 'shoulders', 'backpain', 'ankles', 'neck', 'wrists'];
// Zone du corps la moins récemment mobilisée : parmi les routines ciblées, celle jamais faite (priorité,
// ordre de la liste) ou faite il y a le plus longtemps, à condition que le dernier passage remonte à
// ≥ minDays (défaut 7). Renvoie { key, emoji, title, lastDays } (lastDays = null si jamais faite) ou null
// si toutes les zones ont été mobilisées récemment. Pur + testé.
function neglectedMobilityZone(wellnessDone, todayKey, minDays) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return null;
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  const thr = Number.isFinite(Number(minDays)) && Number(minDays) > 0 ? Math.floor(Number(minDays)) : 7;
  const lastByKey = {};
  (Array.isArray(wellnessDone) ? wellnessDone : []).forEach(x => {
    if (!x || WELLNESS_ZONE_ROUTINES.indexOf(x.key) === -1 || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.date))) return;
    if (!lastByKey[x.key] || x.date > lastByKey[x.key]) lastByKey[x.key] = x.date;
  });
  let best = null, bestDays = -1;
  WELLNESS_ZONE_ROUTINES.forEach(key => {
    const last = lastByKey[key];
    const days = last ? Math.round((today - new Date(last + 'T12:00:00')) / 86400000) : Infinity;
    if (days >= thr && days > bestDays) { best = { key, lastDays: last ? days : null }; bestDays = days; }
  });
  if (!best) return null;
  const rt = wellnessRoutine(best.key);
  return { key: best.key, emoji: rt.emoji, title: rt.title, lastDays: best.lastDays };
}
// Paliers de badges bien-être : par série (jours consécutifs) et par total de routines faites.
const WELLNESS_STREAK_BADGES = [
  { days: 3, emoji: '🌱', label: '3 jours de suite' },
  { days: 7, emoji: '🔥', label: '7 jours de suite' },
  { days: 14, emoji: '⚡', label: '2 semaines de suite' },
  { days: 30, emoji: '🏆', label: '30 jours de suite' },
];
const WELLNESS_TOTAL_BADGES = [
  { count: 10, emoji: '🧘', label: '10 routines' },
  { count: 25, emoji: '💫', label: '25 routines' },
  { count: 50, emoji: '🌟', label: '50 routines' },
  { count: 100, emoji: '👑', label: '100 routines' },
];
// Badges bien-être gagnés selon la série et le total. Renvoie { streak, total, streakBadge, totalBadge,
// badges:[...], nextStreak, nextTotal }. streakBadge/totalBadge = plus haut palier atteint (ou null).
// Pur + testé.
function wellnessBadges(list, todayKey) {
  const streak = wellnessStreak(list, todayKey);
  const total = (Array.isArray(list) ? list : []).filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.date)).length;
  const streakBadge = WELLNESS_STREAK_BADGES.slice().reverse().find(b => streak >= b.days) || null;
  const totalBadge = WELLNESS_TOTAL_BADGES.slice().reverse().find(b => total >= b.count) || null;
  const badges = [];
  if (streakBadge) badges.push({ ...streakBadge, kind: 'streak' });
  if (totalBadge) badges.push({ ...totalBadge, kind: 'total' });
  return {
    streak, total, streakBadge, totalBadge, badges,
    nextStreak: WELLNESS_STREAK_BADGES.find(b => streak < b.days) || null,
    nextTotal: WELLNESS_TOTAL_BADGES.find(b => total < b.count) || null,
  };
}
// Nouveau badge franchi entre deux états (sortie de wellnessBadges avant/après). Priorité à la série.
// Renvoie le badge gagné { emoji, label, kind } ou null. Pur + testé.
function newWellnessBadge(before, after) {
  const b = before || {}, a = after || {};
  const bs = b.streakBadge ? b.streakBadge.days : 0, as = a.streakBadge ? a.streakBadge.days : 0;
  if (as > bs) return { ...a.streakBadge, kind: 'streak' };
  const bt = b.totalBadge ? b.totalBadge.count : 0, at = a.totalBadge ? a.totalBadge.count : 0;
  if (at > bt) return { ...a.totalBadge, kind: 'total' };
  return null;
}
// Mini-heatmap des routines bien-être sur les `days` derniers jours (défaut 7), du plus ancien au
// plus récent (aujourd'hui en dernier). Renvoie [{ date, dayLabel, count }]. [] si todayKey invalide.
// Pur + testé.
function wellnessWeekHeatmap(list, todayKey, days) {
  const n = Math.max(1, Math.min(31, Math.round(Number(days) || 7)));
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return [];
  const counts = {};
  (Array.isArray(list) ? list : []).forEach(x => { if (x && /^\d{4}-\d{2}-\d{2}$/.test(x.date)) counts[x.date] = (counts[x.date] || 0) + 1; });
  const labels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const base = new Date(+t[1], +t[2] - 1, +t[3]); base.setHours(0, 0, 0, 0);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    const key = dateKey(d);
    out.push({ date: key, dayLabel: labels[d.getDay()], count: counts[key] || 0 });
  }
  return out;
}
// Routine « surprends-moi » : pioche une clé de routine bien-être (seed déterministe si fourni,
// sinon aléatoire), en excluant éventuellement une clé pour varier de la suggestion du jour.
// Renvoie une clé de WELLNESS_ROUTINES. Pur + testé.
function surpriseRoutine(excludeKey, seed) {
  const pool = WELLNESS_ROUTINES.map(r => r.key).filter(k => k !== excludeKey);
  const keys = pool.length ? pool : WELLNESS_ROUTINES.map(r => r.key);
  if (!keys.length) return null;
  const s = Number.isFinite(Number(seed)) ? Math.abs(Math.floor(Number(seed))) : Math.floor(Math.random() * 1e6);
  return keys[s % keys.length];
}
// Parcours bien-être : enchaînements de 2 routines en une seule session guidée.
const WELLNESS_PARCOURS = [
  { key: 'reveil', emoji: '🌅', title: 'Réveil complet', routines: ['morning', 'hips'] },
  { key: 'prepa', emoji: '🔥', title: 'Prépa séance', routines: ['warmup', 'shoulders'] },
  { key: 'detente', emoji: '🌙', title: 'Détente du soir', routines: ['stretch', 'sleep'] },
];
// Construit un parcours guidé (fusion des mouvements de plusieurs routines) à partir de sa clé.
// Renvoie { key, emoji, title, minutes, count, routines:[titres], exercises:[...] } ou null. Pur + testé.
function wellnessParcours(key) {
  const p = WELLNESS_PARCOURS.find(x => x.key === key);
  if (!p) return null;
  const routines = p.routines.map(k => wellnessRoutine(k)).filter(Boolean);
  if (!routines.length) return null;
  const exercises = [];
  routines.forEach(r => r.exercises.forEach(e => exercises.push({ ...e })));
  return {
    key: p.key, emoji: p.emoji, title: p.title,
    minutes: routines.reduce((s, r) => s + r.minutes, 0),
    count: routines.length,
    routines: routines.map(r => r.title),
    exercises,
  };
}
// Objet de partage natif (Web Share) d'une routine bien-être : { title, text } avec la liste des
// mouvements (durée + repère). null si clé inconnue. Pur + testé.
function shareableRoutine(key) {
  const rt = wellnessRoutine(key);
  if (!rt || !rt.exercises.length) return null;
  const lines = [`${rt.emoji} ${rt.title} (${rt.minutes} min)`];
  if (rt.why) lines.push(rt.why);
  lines.push('');
  rt.exercises.forEach((e, i) => lines.push(`${i + 1}. ${e.name} — ${e.reps} s${e.cue ? ` : ${e.cue}` : ''}`));
  return { title: `${rt.emoji} Routine bien-être : ${rt.title}`, text: lines.join('\n') };
}
// Filtre les routines bien-être qui tiennent dans un budget de temps (minutes). Utile pour « je n'ai
// que X minutes ». Renvoie la liste { key, emoji, title, minutes, moves } triée par durée décroissante
// (utilise au mieux le temps dispo) puis titre. Budget invalide ou ≤ 0 → toutes les routines. Pur + testé.
function routinesByTimeBudget(maxMin) {
  const m = Number(maxMin);
  const budget = Number.isFinite(m) && m > 0 ? m : Infinity;
  return WELLNESS_ROUTINES
    .filter(r => r.minutes <= budget)
    .map(r => ({ key: r.key, emoji: r.emoji, title: r.title, minutes: r.minutes, moves: r.moves.length }))
    .sort((a, b) => b.minutes - a.minutes || a.title.localeCompare(b.title, 'fr'));
}
// Routine express ALÉATOIRE tenant dans un budget de temps (minutes) : pioche déterministe (seed) parmi
// les routines ≤ maxMin, en évitant excludeKey si possible. Renvoie une clé de WELLNESS_ROUTINES, ou null
// si aucune ne tient (budget trop court). Pur + testé.
function expressRoutine(maxMin, excludeKey, seed) {
  const pool = routinesByTimeBudget(maxMin).map(r => r.key);
  if (!pool.length) return null;
  const filtered = pool.length > 1 ? pool.filter(k => k !== excludeKey) : pool;
  const list = filtered.length ? filtered : pool;
  const s = Math.abs(Math.floor(Number(seed) || 0));
  return list[s % list.length];
}
// Construit un événement récurrent d'agenda pour une routine bien-être (récup planifiée, ex. 2×/sem).
// refId `wellness-<key>` (dédup). Null si clé inconnue. Pur + testé.
function wellnessRecurringEvent(key, opts) {
  const rt = wellnessRoutine(key);
  if (!rt) return null;
  const o = opts || {};
  return normalizeRecurring({
    id: o.id || Date.now(),
    title: `${rt.emoji} ${rt.title}`,
    time: o.time || '19:00',
    durationMin: rt.minutes,
    kind: 'sport',
    priority: 'normal',
    refId: `wellness-${rt.key}`,
    rule: { freq: 'weekly', interval: 1, weekdays: Array.isArray(o.weekdays) && o.weekdays.length ? o.weekdays : [2, 5], startDate: o.startDate || '' },
  });
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

// Suivi du bloc de périodisation de 4 semaines à partir de sa date de début (lundi) et d'aujourd'hui.
// Renvoie { week (1..4), phase, weeksTotal, done, daysIntoWeek, deloadInWeeks } ou null si invalide
// ou aujourd'hui avant le début. Au-delà de 4 semaines, done=true (proposer un nouveau bloc). Pur + testé.
function currentBlock(blockStartKey, todayKey) {
  const s = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(blockStartKey || ''));
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!s || !t) return null;
  const start = new Date(+s[1], +s[2] - 1, +s[3]); start.setHours(0, 0, 0, 0);
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  const days = Math.floor((today - start) / 86400000);
  if (days < 0) return null;
  const weekIndex = Math.floor(days / 7);
  const done = weekIndex >= 4;
  return {
    week: done ? 4 : weekIndex + 1,
    phase: blockPhase(Math.min(weekIndex, 3)),
    weeksTotal: 4,
    done,
    daysIntoWeek: days % 7,
    deloadInWeeks: done ? 0 : Math.max(0, 3 - weekIndex),
  };
}
// Heads-up anticipé de fin de bloc à partir de l'état du bloc (sortie de currentBlock) : prévient
// avant la décharge et pendant. Renvoie { phase:'deload'|'preload', title, message, showNextAdvice }
// ou null (rien à signaler, ou bloc terminé/invalide). Pur + testé.
function blockPhaseHeadsUp(block) {
  const b = block && typeof block === 'object' ? block : null;
  if (!b || b.done) return null;
  if (b.week === 4) return { phase: 'deload', title: '🏁 Dernière semaine du bloc', message: 'Semaine de décharge : allège le volume et récupère — puis un nouveau bloc t\'attend. Voici déjà la reco pour la suite :', showNextAdvice: true };
  if (b.deloadInWeeks === 1) return { phase: 'preload', title: '🔻 Décharge la semaine prochaine', message: 'Encore une semaine avant la décharge — pousse proprement, ça arrive.', showNextAdvice: false };
  return null;
}

// Séries à appliquer pour une séance datée selon la phase du bloc (S2 +volume, S4 décharge allégée).
// Renvoie les séries ajustées, ou les séries de base si hors bloc / date invalide. Pur + testé.
function phaseSetsForDay(baseSets, blockStartKey, dayKey) {
  const b = currentBlock(blockStartKey, dayKey);
  const base = Math.max(1, Math.round(Number(baseSets) || 3));
  if (!b || b.done) return base;
  return progressSets(base, b.week - 1);
}

// Archive un bloc dans l'historique (plus récent en dernier), plafonné. Ignore une entrée invalide. Pur + testé.
function archiveBlock(history, entry, cap) {
  const list = Array.isArray(history) ? history.slice() : [];
  const e = entry && typeof entry === 'object' ? entry : null;
  if (!e || !e.objective || !/^\d{4}-\d{2}-\d{2}$/.test(String(e.start || ''))) return list;
  list.push({ objective: String(e.objective), start: e.start, end: /^\d{4}-\d{2}-\d{2}$/.test(String(e.end || '')) ? e.end : '', weeks: Math.max(1, Math.round(Number(e.weeks) || 4)) });
  return list.slice(-Math.max(1, Math.round(Number(cap) || 12)));
}
// Synthèse de l'historique de blocs : nombre, dernier bloc, comptage par objectif. Null si vide. Pur + testé.
function blockHistorySummary(history) {
  const list = (Array.isArray(history) ? history : []).filter(b => b && b.objective && /^\d{4}-\d{2}-\d{2}$/.test(String(b.start || '')));
  if (!list.length) return null;
  const byObjective = {};
  list.forEach(b => { byObjective[b.objective] = (byObjective[b.objective] || 0) + 1; });
  return { count: list.length, last: list[list.length - 1], byObjective };
}

// Reco pour le PROCHAIN bloc de 4 semaines à partir des résultats réels : adhérence (0-100),
// plateau de force (bool), statut de charge (sortie de loadAdvice.status). Priorité : régularité,
// puis risque de charge, puis plateau, puis progression. Renvoie { action, emoji, title, advice }. Pur + testé.
function nextBlockAdvice(opts) {
  const o = opts || {};
  const adh = Number.isFinite(Number(o.adherence)) ? Number(o.adherence) : null;
  const plateau = !!o.plateau;
  const load = o.loadStatus;
  if (adh != null && adh < 50) return { action: 'ease', emoji: '🟧', title: 'Prochain bloc : vise la régularité', advice: 'Ton adhérence était basse : simplifie (moins de séances, plus courtes) et privilégie la régularité avant d\'ajouter du volume.' };
  if (load === 'deload' || load === 'high') return { action: 'lighten', emoji: '🟥', title: 'Prochain bloc : allège', advice: 'Ta charge récente est haute : démarre plus léger (~-20 %) et remonte progressivement pour éviter la blessure.' };
  if (plateau) return { action: 'vary', emoji: '🔁', title: 'Prochain bloc : change une variable', advice: 'Ta force stagne : varie les exercices (bouton « Varier »), monte la charge, ou insère une vraie décharge avant de repartir.' };
  if (adh != null && adh >= 75 && (load == null || load === 'push' || load === 'build' || load === 'maintain')) return { action: 'progress', emoji: '🟩', title: 'Prochain bloc : monte le volume', advice: 'Bonne assiduité et charge maîtrisée : ajoute une série ou une séance, ou passe au niveau au-dessus.' };
  return { action: 'keep', emoji: '🟨', title: 'Prochain bloc : garde le cap', advice: 'Reconduis la même structure et progresse en charge/reps là où c\'est propre.' };
}

// Stats d'entraînement sur une fenêtre de dates [startKey..endKey] (bornes incluses) :
// nb de séances, tonnage total, nb de séries validées. Pur.
function blockWindowStats(workouts, startKey, endKey) {
  const list = (Array.isArray(workouts) ? workouts : []).filter(w => w && w.date && String(w.date) >= startKey && String(w.date) <= endKey);
  let tonnage = 0, sets = 0;
  list.forEach(w => { tonnage += workoutTonnage(w) || 0; sets += completedSetCount(w && w.exercises) || 0; });
  return { sessions: list.length, tonnage: Math.round(tonnage), sets };
}
// Compare le PREMIER bloc terminé au DERNIER, à partir de l'historique (chaque entrée = fenêtre
// start..end d'un bloc de 4 semaines) et du journal d'entraînement. Renvoie null si moins de 2
// blocs terminés. Sinon { blocks, first, last, sessionsDelta, tonnageDelta, tonnagePct,
// sessionsPerWeekDelta, trend }. Normalise par semaine pour rester juste. Pur + testé.
function blockComparison(history, workouts) {
  const wins = (Array.isArray(history) ? history : []).filter(b => b && b.objective
    && /^\d{4}-\d{2}-\d{2}$/.test(String(b.start || '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(b.end || '')));
  if (wins.length < 2) return null;
  const stat = w => {
    const s = blockWindowStats(workouts, w.start, w.end);
    const weeks = Math.max(1, Math.round((new Date(w.end + 'T12:00:00') - new Date(w.start + 'T12:00:00')) / 604800000) || Math.round(Number(w.weeks) || 4));
    return { objective: w.objective, start: w.start, end: w.end, weeks, sessions: s.sessions, tonnage: s.tonnage, sets: s.sets,
      tonnagePerWeek: Math.round(s.tonnage / weeks), sessionsPerWeek: Math.round((s.sessions / weeks) * 10) / 10 };
  };
  const first = stat(wins[0]), last = stat(wins[wins.length - 1]);
  const pct = (a, b) => a > 0 ? Math.round((b - a) / a * 100) : (b > 0 ? 100 : 0);
  const tonnagePct = pct(first.tonnage, last.tonnage);
  const sessionsPerWeekDelta = Math.round((last.sessionsPerWeek - first.sessionsPerWeek) * 10) / 10;
  const trend = tonnagePct >= 8 ? 'up' : tonnagePct <= -8 ? 'down' : 'flat';
  return { blocks: wins.length, first, last,
    sessionsDelta: last.sessions - first.sessions, tonnageDelta: last.tonnage - first.tonnage,
    tonnagePct, sessionsPerWeekDelta, trend };
}
// Répartition des blocs TERMINÉS par objectif : pour chaque objectif présent dans l'historique, nombre de
// blocs + tonnage total + séances (via blockWindowStats). Renvoie [{ objective, blocks, tonnage, sessions }]
// trié par nombre de blocs décroissant (puis tonnage). Vide si aucun bloc valide. Pur + testé.
function blocksByObjective(history, workouts) {
  const wins = (Array.isArray(history) ? history : []).filter(b => b && b.objective
    && /^\d{4}-\d{2}-\d{2}$/.test(String(b.start || '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(b.end || '')));
  const byObj = {};
  wins.forEach(b => {
    const s = blockWindowStats(workouts, b.start, b.end);
    if (!byObj[b.objective]) byObj[b.objective] = { objective: b.objective, blocks: 0, tonnage: 0, sessions: 0 };
    byObj[b.objective].blocks++;
    byObj[b.objective].tonnage += s.tonnage;
    byObj[b.objective].sessions += s.sessions;
  });
  return Object.values(byObj).sort((a, b) => b.blocks - a.blocks || b.tonnage - a.tonnage);
}
// Tonnage de muscu par semaine (lundi→dimanche) sur les N dernières semaines (défaut 8), la dernière
// bucket étant la semaine de todayKey. Renvoie { weeks:[{start, tonnage, sessions}], max, total,
// avgPrior, last, trend:'up'|'down'|'flat', deltaPct } ou null si aucune séance chiffrée sur la fenêtre.
// trend/deltaPct comparent la dernière semaine à la moyenne des semaines précédentes NON vides. Pur + testé.
function weeklyTonnageTrend(workouts, todayKey, weeks) {
  const list = Array.isArray(workouts) ? workouts : [];
  const n = Number.isFinite(Number(weeks)) && Number(weeks) > 0 ? Math.floor(Number(weeks)) : 8;
  const base = /^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || '')) ? new Date(todayKey + 'T12:00:00') : new Date();
  const thisMonday = mondayOf(base);
  const buckets = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(thisMonday); start.setDate(start.getDate() - i * 7);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const startKey = dateKey(start), endKey = dateKey(end);
    let tonnage = 0, sessions = 0;
    list.forEach(w => {
      if (!w || !w.date) return;
      const d = String(w.date);
      if (d >= startKey && d <= endKey) { const t = workoutTonnage(w) || 0; if (t > 0) { tonnage += t; sessions++; } }
    });
    buckets.push({ start: startKey, tonnage: Math.round(tonnage), sessions });
  }
  const total = buckets.reduce((s, b) => s + b.tonnage, 0);
  if (total <= 0) return null;
  const max = buckets.reduce((m, b) => Math.max(m, b.tonnage), 0);
  const last = buckets[buckets.length - 1].tonnage;
  const prior = buckets.slice(0, -1).filter(b => b.tonnage > 0);
  const avgPrior = prior.length ? Math.round(prior.reduce((s, b) => s + b.tonnage, 0) / prior.length) : 0;
  const deltaPct = avgPrior > 0 ? Math.round((last - avgPrior) / avgPrior * 100) : (last > 0 ? 100 : 0);
  const trend = avgPrior === 0 ? 'flat' : deltaPct >= 8 ? 'up' : deltaPct <= -8 ? 'down' : 'flat';
  return { weeks: buckets, max, total, avgPrior, last, trend, deltaPct };
}
// Meilleure séance de muscu par tonnage (Σ charge × reps). Renvoie { date, tonnage, count, isLatest }
// où count = nb de séances chiffrées et isLatest = la séance record est aussi la plus récente séance
// chiffrée (→ « nouveau record »). En cas d'égalité de tonnage, garde la plus récente. null si aucune
// séance chiffrée. Pur + testé.
function bestSessionTonnage(workouts) {
  const list = Array.isArray(workouts) ? workouts : [];
  let best = null, count = 0, latestDate = '';
  list.forEach(w => {
    const t = workoutTonnage(w) || 0;
    if (t <= 0) return;
    count++;
    const d = String(w.date || '');
    if (d > latestDate) latestDate = d;
    if (!best || t > best.tonnage || (t === best.tonnage && d >= best.date)) best = { date: d, tonnage: Math.round(t) };
  });
  if (!best) return null;
  return { date: best.date, tonnage: best.tonnage, count, isLatest: best.date === latestDate };
}
// Meilleure SEMAINE de tonnage (record hebdo all-time) : somme du tonnage par semaine (lundi→dimanche),
// puis la plus élevée. Renvoie { weekStart, tonnage, sessions, isCurrent } ou null si aucun tonnage.
// isCurrent = la semaine record est celle de todayKey. En cas d'égalité, garde la plus récente. Pur + testé.
function bestTonnageWeek(workouts, todayKey) {
  const byWeek = {};
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.date))) return;
    const t = workoutTonnage(w) || 0; if (t <= 0) return;
    const wk = dateKey(mondayOf(new Date(String(w.date) + 'T12:00:00')));
    if (!byWeek[wk]) byWeek[wk] = { tonnage: 0, sessions: 0 };
    byWeek[wk].tonnage += t; byWeek[wk].sessions++;
  });
  const entries = Object.entries(byWeek);
  if (!entries.length) return null;
  let best = null;
  entries.forEach(([wk, v]) => {
    const ton = Math.round(v.tonnage);
    if (!best || ton > best.tonnage || (ton === best.tonnage && wk > best.weekStart)) best = { weekStart: wk, tonnage: ton, sessions: v.sessions };
  });
  const curWeek = /^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || '')) ? dateKey(mondayOf(new Date(String(todayKey) + 'T12:00:00'))) : null;
  return { weekStart: best.weekStart, tonnage: best.tonnage, sessions: best.sessions, isCurrent: curWeek != null && best.weekStart === curWeek };
}
// Régularité d'entraînement sur une fenêtre de N jours (défaut 28) : à partir des dates de séances
// (muscu OU course, dédupliquées), mesure l'écart moyen entre séances et un score de régularité 0-100
// (100 = intervalles parfaitement constants). Renvoie { sessions, avgGapDays, maxGapDays, regularity,
// label } ou null si moins de 3 séances (pas assez d'intervalles). Pur + testé.
function trainingConsistency(workouts, todayKey, windowDays) {
  const n = Number.isFinite(Number(windowDays)) && Number(windowDays) > 0 ? Math.floor(Number(windowDays)) : 28;
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return null;
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - (n - 1));
  const startKey = dateKey(start), endKey = dateKey(today);
  const dates = [...new Set((Array.isArray(workouts) ? workouts : [])
    .filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date)) && String(w.date) >= startKey && String(w.date) <= endKey)
    .map(w => String(w.date)))].sort();
  if (dates.length < 3) return null;
  const gaps = [];
  for (let i = 1; i < dates.length; i++) gaps.push(Math.round((new Date(dates[i] + 'T12:00:00') - new Date(dates[i - 1] + 'T12:00:00')) / 86400000));
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((a, b) => a + (b - avg) ** 2, 0) / gaps.length;
  const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
  const regularity = Math.round(Math.max(0, Math.min(100, 100 * (1 - Math.min(1, cv)))));
  const label = regularity >= 75 ? 'Très régulier' : regularity >= 50 ? 'Régulier' : regularity >= 25 ? 'Irrégulier' : 'En dents de scie';
  return { sessions: dates.length, avgGapDays: Math.round(avg * 10) / 10, maxGapDays: Math.max(...gaps), regularity, label };
}
// Répartition des séances par jour de la semaine (lundi→dimanche) sur une fenêtre de N jours (défaut 56).
// Renvoie { counts:[7], bestDay, bestCount, total } où counts[0]=lundi…counts[6]=dimanche ; bestDay =
// index du jour le plus fréquent (0-6, null si aucune séance ; égalité → jour le plus tôt en semaine).
// Compte les séances muscu ET course. Pur + testé.
function trainingByWeekday(workouts, todayKey, windowDays) {
  const n = Number.isFinite(Number(windowDays)) && Number(windowDays) > 0 ? Math.floor(Number(windowDays)) : 56;
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return { counts, bestDay: null, bestCount: 0, total: 0 };
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w && w.date || '')); if (!m) return;
    const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
    const days = Math.round((today - d) / 86400000);
    if (days < 0 || days >= n) return;
    counts[(d.getDay() + 6) % 7]++;
  });
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return { counts, bestDay: null, bestCount: 0, total: 0 };
  let bestDay = 0;
  for (let i = 1; i < 7; i++) if (counts[i] > counts[bestDay]) bestDay = i;
  return { counts, bestDay, bestCount: counts[bestDay], total };
}
// Équilibre course/muscu sur les N derniers jours (défaut 7) : compte les séances de course (type 'run')
// vs muscu (séances avec exercices ou type 'strength'). Renvoie { runs, strength, total, dominant, label }
// ou null si aucune séance. Utile pour un athlète hybride (trail + renfo). Pur + testé.
function weekTrainingBalance(workouts, todayKey, windowDays) {
  const n = Number.isFinite(Number(windowDays)) && Number(windowDays) > 0 ? Math.floor(Number(windowDays)) : 7;
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return null;
  const today = new Date(+t[1], +t[2] - 1, +t[3]); today.setHours(0, 0, 0, 0);
  let runs = 0, strength = 0;
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(w && w.date || '')); if (!m) return;
    const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
    const days = Math.round((today - d) / 86400000);
    if (days < 0 || days >= n) return;
    if (w.type === 'run') runs++;
    else if ((Array.isArray(w.exercises) && w.exercises.length) || w.type === 'strength') strength++;
  });
  const total = runs + strength;
  if (!total) return null;
  const dominant = runs > strength ? 'run' : strength > runs ? 'strength' : 'balanced';
  let label;
  if (runs === 0) label = 'Que de la muscu';
  else if (strength === 0) label = 'Que de la course';
  else if (Math.abs(runs - strength) <= 1) label = 'Bon équilibre';
  else label = dominant === 'run' ? 'Plutôt course' : 'Plutôt muscu';
  return { runs, strength, total, dominant, label };
}
// Meilleur 1RM estimé par exercice sur une fenêtre de dates [startKey..endKey]. Renvoie un objet
// nom -> e1rm (kg). Utilise les setLogs si présents, sinon load/reps de l'exercice. Pur.
function bestE1rmByExercise(workouts, startKey, endKey) {
  const best = {};
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.date || '')) || String(w.date) < startKey || String(w.date) > endKey) return;
    const exos = Array.isArray(w.exercises) && w.exercises.length ? w.exercises : (w.exercise ? [{ name: w.exercise, load: w.load, reps: w.reps }] : []);
    exos.forEach(ex => {
      if (!ex || !ex.name) return;
      const sets = Array.isArray(ex.setLogs) && ex.setLogs.length ? ex.setLogs : [{ load: ex.load, reps: ex.reps }];
      sets.forEach(s => {
        const e = estimate1RM(Number(s && s.load) || 0, Number(s && s.reps) || 0);
        if (e != null) best[ex.name] = Math.max(best[ex.name] || 0, e);
      });
    });
  });
  return best;
}
// Progression de force par exercice-clé entre le PREMIER et le DERNIER bloc terminé : compare le
// meilleur 1RM estimé de chaque exercice chargé présent dans les deux blocs. Renvoie une liste triée
// par progression % décroissante (limitée à opts.limit, défaut 5). [] si < 2 blocs ou aucun exercice
// commun avec charge. Pur + testé.
function blockExerciseProgress(history, workouts, opts) {
  const o = opts || {};
  const limit = Math.max(1, Math.min(12, Math.round(Number(o.limit) || 5)));
  const wins = (Array.isArray(history) ? history : []).filter(b => b && b.objective
    && /^\d{4}-\d{2}-\d{2}$/.test(String(b.start || '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(b.end || '')));
  if (wins.length < 2) return [];
  const first = bestE1rmByExercise(workouts, wins[0].start, wins[0].end);
  const last = bestE1rmByExercise(workouts, wins[wins.length - 1].start, wins[wins.length - 1].end);
  const out = [];
  Object.keys(last).forEach(name => {
    if (!(first[name] > 0) || !(last[name] > 0)) return;
    const f = first[name], l = last[name];
    out.push({ name, firstE1rm: f, lastE1rm: l, deltaKg: Math.round((l - f) * 2) / 2, deltaPct: Math.round((l - f) / f * 100) });
  });
  return out.sort((a, b) => b.deltaPct - a.deltaPct || b.deltaKg - a.deltaKg).slice(0, limit);
}
// Texte partageable de la progression sur les blocs (comparaison globale + force par exercice-clé).
// '' si moins de 2 blocs terminés. Pur + testé.
function blockProgressText(history, workouts) {
  const cmp = blockComparison(history, workouts);
  if (!cmp) return '';
  const arrow = cmp.trend === 'up' ? '📈' : cmp.trend === 'down' ? '📉' : '➡️';
  const sign = n => (n > 0 ? '+' : '') + n;
  const lines = [`${arrow} Ma progression sur ${cmp.blocks} blocs`];
  lines.push(`Tonnage/sem. : ${sign(cmp.tonnagePct)} % · Séances/sem. : ${sign(cmp.sessionsPerWeekDelta)}`);
  lines.push(`1er bloc : ${cmp.first.sessions} séances · ${Math.round(cmp.first.tonnage)} kg`);
  lines.push(`Dernier : ${cmp.last.sessions} séances · ${Math.round(cmp.last.tonnage)} kg`);
  const ex = blockExerciseProgress(history, workouts, { limit: 3 });
  if (ex.length) {
    lines.push('');
    lines.push('💪 Force (1RM estimé) :');
    ex.forEach(e => lines.push(`   ${e.name} : ${Math.round(e.firstE1rm)} → ${Math.round(e.lastE1rm)} kg (${sign(e.deltaPct)} %)`));
  }
  return lines.join('\n');
}
// Objet de partage natif (Web Share) de la progression de bloc : { title, text }. null si < 2 blocs.
// Pur + testé.
function shareableBlockProgress(history, workouts) {
  const text = blockProgressText(history, workouts);
  return text ? { title: '💪 Ma progression sur mes blocs', text } : null;
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
// ---- Durée d'une séance : saisie en heures + minutes ----
// Le champ de durée n'acceptait que des MINUTES : une sortie longue de 1 h 30 se saisissait « 90 ».
// Le modèle reste en minutes (aucune migration), seule la saisie change.

// Découpe une durée totale (min) en { h, m }. Négatif/invalide → 0. Pur + testé.
function splitDuration(totalMin) {
  const t = Math.max(0, Math.round(Number(totalMin) || 0));
  return { h: Math.floor(t / 60), m: t % 60 };
}

// Recompose une durée totale (min) depuis heures + minutes. Tolère des minutes > 59
// (ex. 1 h + 90 min = 150 min) : on ne corrige pas l'utilisateur en silence, on additionne.
// Bornée à `max` (défaut 600 min = 10 h). Pur + testé.
function combineDuration(h, m, max) {
  const hh = Math.max(0, Math.round(Number(h) || 0));
  const mm = Math.max(0, Math.round(Number(m) || 0));
  const cap = Math.max(1, Math.round(Number(max) || 600));
  return Math.min(cap, hh * 60 + mm);
}

// Deux instantanés de séance guidée sont-ils équivalents ? Sert à NE PAS réécrire le state quand
// rien n'a changé. `save()` sérialise TOUT le state puis écrit dans localStorage de façon
// SYNCHRONE : avec des photos de progression (qui restent en base64 dans le state côté PWA), le
// state atteint plusieurs Mo et chaque écriture coûte ~10 ms — mesuré. Persister à chaque frappe
// (introduit en #307) bloquait donc le thread principal en pleine saisie de charge.
// Compare uniquement ce qui compte : exercice courant, séries loguées, repos en cours.
// Pur + testé.
function guidedSnapshotEquals(a, b) {
  const A = a && typeof a === 'object' ? a : null;
  const B = b && typeof b === 'object' ? b : null;
  if (!A || !B) return A === B;
  if (Number(A.index) !== Number(B.index)) return false;
  const ea = Array.isArray(A.exercises) ? A.exercises : [];
  const eb = Array.isArray(B.exercises) ? B.exercises : [];
  if (ea.length !== eb.length) return false;
  for (let i = 0; i < ea.length; i++) {
    const xa = ea[i] || {}, xb = eb[i] || {};
    if (xa.name !== xb.name) return false;
    const la = Array.isArray(xa.setLogs) ? xa.setLogs : [];
    const lb = Array.isArray(xb.setLogs) ? xb.setLogs : [];
    if (la.length !== lb.length) return false;
    for (let j = 0; j < la.length; j++) {
      const sa = la[j] || {}, sb = lb[j] || {};
      if ((Number(sa.load) || 0) !== (Number(sb.load) || 0)) return false;
      if ((Number(sa.reps) || 0) !== (Number(sb.reps) || 0)) return false;
      if (Boolean(sa.completed) !== Boolean(sb.completed)) return false;
    }
  }
  const ra = A.rest && typeof A.rest === 'object' ? A.rest : null;
  const rb = B.rest && typeof B.rest === 'object' ? B.rest : null;
  if (!ra !== !rb) return false;
  if (ra && rb && (Number(ra.endsAt) !== Number(rb.endsAt) || Number(ra.total) !== Number(rb.total))) return false;
  return true;
}

// ---- Minuteur de REPOS des séances guidées : même correction que le minuteur de focus (#308) ----
// L'ancien décompte (`guidedRestSeconds--` dans un setInterval) suivait le NOMBRE DE TICKS, pas
// l'horloge. Il dérivait donc dès que l'onglet passait en arrière-plan — et le repos entre deux
// séries est précisément le moment où l'on pose son téléphone ou où l'écran s'éteint.
// Résultat : le signal de fin de repos arrivait en retard, voire jamais.
// Ici aussi : échéance absolue, restant recalculé depuis l'horloge.

// Démarre un repos : { total, endsAt }. Durée bornée 1–600 s. Pur + testé.
function restStart(seconds, nowMs) {
  const s = Math.max(1, Math.min(600, Math.round(Number(seconds) || 0)));
  const now = Number(nowMs) || Date.now();
  return { total: s, endsAt: now + s * 1000 };
}

// État d'un repos en cours : { remainingSec, total, done, pct } ou null si absent/invalide.
// `done` est vrai même si le repos s'est écoulé pendant que l'écran était éteint. Pur + testé.
function restState(rest, nowMs) {
  const r = rest && typeof rest === 'object' && !Array.isArray(rest) ? rest : null;
  if (!r) return null;
  const total = Math.round(Number(r.total) || 0);
  const endsAt = Number(r.endsAt) || 0;
  if (total <= 0 || !endsAt) return null;
  const now = Number(nowMs) || Date.now();
  const remainingSec = Math.max(0, Math.round((endsAt - now) / 1000));
  return { remainingSec, total, done: remainingSec === 0, pct: restBarPct(remainingSec, total) };
}

// ---- Minuteur de focus : horloge absolue plutôt que compte à rebours en mémoire ----
// L'ancien minuteur (`let remaining = 25*60 ... setInterval(() => { remaining--; ... }, 1000)`)
// cumulait DEUX défauts :
//  1. Rien n'était persisté → recharger l'app perdait le bloc en cours, XP compris.
//  2. Le décompte suivait le NOMBRE DE TICKS, pas l'horloge. Or les navigateurs BRIDENT
//     setInterval quand l'onglet passe en arrière-plan (souvent 1 tick/min, parfois zéro) :
//     poser son téléphone pendant une révision faisait ralentir — voire figer — le minuteur.
// La correction : mémoriser un horodatage de FIN absolu et recalculer le restant depuis l'horloge.
// Le rendu peut alors se rafraîchir à n'importe quelle cadence sans jamais dériver.

// Démarre un bloc : { durationMin, startedAt, endsAt, task, paused:false }. Durée bornée 1–180 min.
// Pur + testé.
function focusTimerStart(durationMin, nowMs, task) {
  const mins = Math.max(1, Math.min(180, Math.round(Number(durationMin) || 25)));
  const now = Number(nowMs) || Date.now();
  return { durationMin: mins, startedAt: now, endsAt: now + mins * 60000, task: String(task || '').slice(0, 120), paused: false };
}

// État courant d'un minuteur persisté (en marche ou en pause).
// Renvoie { remainingSec, elapsedSec, durationMin, done, paused, task } ou null si absent/invalide.
// `done` = le bloc est arrivé à terme (y compris pendant que l'app était fermée). Pur + testé.
function focusTimerState(saved, nowMs) {
  const t = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : null;
  if (!t) return null;
  const mins = Math.round(Number(t.durationMin) || 0);
  const startedAt = Number(t.startedAt) || 0;
  if (mins <= 0 || !startedAt) return null;
  const now = Number(nowMs) || Date.now();
  const paused = Boolean(t.paused);
  let remainingSec;
  if (paused) {
    remainingSec = Math.max(0, Math.round(Number(t.pausedSec) || 0));
  } else {
    const endsAt = Number(t.endsAt) || 0;
    if (!endsAt) return null;
    remainingSec = Math.max(0, Math.round((endsAt - now) / 1000));
  }
  const total = mins * 60;
  return {
    remainingSec,
    elapsedSec: Math.max(0, Math.min(total, total - remainingSec)),
    durationMin: mins,
    done: !paused && remainingSec === 0,
    paused,
    task: String(t.task || '')
  };
}

// Met en pause : fige le restant. Pur + testé.
function focusTimerPause(saved, nowMs) {
  const st = focusTimerState(saved, nowMs);
  if (!st || st.paused) return saved || null;
  return { ...saved, paused: true, pausedSec: st.remainingSec };
}

// Reprend : repositionne l'horodatage de fin à partir du restant figé. Pur + testé.
function focusTimerResume(saved, nowMs) {
  const st = focusTimerState(saved, nowMs);
  if (!st || !st.paused) return saved || null;
  const now = Number(nowMs) || Date.now();
  return { ...saved, paused: false, endsAt: now + st.remainingSec * 1000, pausedSec: undefined };
}

// Le Pomodoro, c'est travail + pause — mais l'app n'avait QUE le minuteur de travail, sans jamais
// dire combien de temps souffler. Résultat : soit on enchaîne sans pause (et le focus se dégrade),
// soit on part 40 min « juste 5 minutes ». Cette fonction ferme la boucle : à partir de la durée
// du bloc qui vient de finir et du nombre de blocs déjà faits dans la journée, elle propose une
// pause courte proportionnelle (~1/5 du bloc, bornée 5–20 min), et une VRAIE pause longue tous les
// 4 blocs (cadence Pomodoro classique). Renvoie { breakMin, long, note } ou null. Pur + testé.
function breakSuggestion(focusMinutes, blocksToday) {
  const mins = Math.round(Number(focusMinutes) || 0);
  if (mins <= 0) return null;
  const n = Math.max(1, Math.round(Number(blocksToday) || 1));
  const long = n % 4 === 0;
  const breakMin = long
    ? Math.min(25, Math.max(15, Math.round(mins / 3)))
    : Math.min(20, Math.max(5, Math.round(mins / 5)));
  const note = long
    ? 'Quatrième bloc d’affilée — accorde-toi une vraie coupure : marche, mange, éloigne-toi de l’écran.'
    : mins >= 75
      ? 'Après un long bloc, lève-toi, bouge et hydrate-toi avant de repartir.'
      : 'Regarde au loin, bois un verre d’eau, respire — puis repars net.';
  return { breakMin, long, note };
}

// La séance guidée en cours n'était conservée QUE dans une variable module (`guidedWorkout`),
// jamais persistée. Fermer le dialogue (croix ou touche Échap) ou recharger l'app effaçait
// instantanément TOUT le travail de la séance : charges saisies, reps, séries validées.
// Sur mobile c'est pire : basculer vers une autre app pendant un repos peut vider la page.
// Prépare l'instantané à persister. Renvoie null si la séance est vide/invalide. Pur + testé.
function guidedSnapshot(workout, index, nowMs) {
  const w = workout && typeof workout === 'object' ? workout : null;
  if (!w || !Array.isArray(w.exercises) || !w.exercises.length) return null;
  const i = Math.max(0, Math.min(w.exercises.length - 1, Math.round(Number(index) || 0)));
  return {
    title: String(w.title || 'Séance'),
    why: String(w.why || ''),
    duration: Math.max(0, Math.round(Number(w.duration) || 0)),
    // COPIE PROFONDE, pas la référence vivante. Un instantané qui aliase l'objet courant n'est pas
    // un instantané : il muterait en même temps que lui — et toute comparaison « avant/après »
    // comparerait alors l'objet avec lui-même, donc ne verrait jamais aucun changement.
    exercises: (typeof structuredClone === 'function') ? structuredClone(w.exercises) : JSON.parse(JSON.stringify(w.exercises)),
    index: i,
    savedAt: Number(nowMs) || Date.now()
  };
}

// Une séance sauvegardée est-elle reprenable ?
// Non si : vide/invalide ; trop ancienne (`maxHours`, défaut 12 h — au-delà ce n'est plus une
// reprise mais une séance oubliée) ; ou si AUCUNE série n'a été validée (rien à sauver → on
// n'ennuie pas Adrien avec une proposition de reprise vide).
// Renvoie { session, done, total, ageMin } ou null. Pur + testé.
function resumableGuided(saved, nowMs, maxHours) {
  const s = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : null;
  if (!s || !Array.isArray(s.exercises) || !s.exercises.length) return null;
  const savedAt = Number(s.savedAt) || 0;
  if (!savedAt) return null;
  const now = Number(nowMs) || Date.now();
  const age = now - savedAt;
  const maxMs = Math.max(1, Math.round(Number(maxHours) || 12)) * 3600000;
  if (age < 0 || age > maxMs) return null;
  let done = 0, total = 0;
  s.exercises.forEach(ex => {
    const logs = Array.isArray(ex && ex.setLogs) ? ex.setLogs : [];
    total += logs.length;
    done += logs.filter(l => l && l.completed).length;
  });
  if (!done) return null;
  return { session: s, done, total, ageMin: Math.round(age / 60000) };
}

// Alternatives à un exercice PENDANT la séance guidée : mêmes zones musculaires, matériel
// réellement disponible, en excluant l'exercice courant ET ceux déjà présents dans la séance
// (sinon on proposerait un doublon de ce qu'il va faire juste après).
// Le dialogue guidé n'offrait aucun moyen de changer d'exercice : si celui-ci ne passe pas
// aujourd'hui (douleur, matériel pris, envie), il fallait sortir de la séance.
// Trie par recouvrement de zones décroissant (le plus proche d'abord), puis par nom.
// Renvoie [{ name, zones, overlap }] limité à `cap` (défaut 4). [] si l'exercice est inconnu.
// Pur + testé.
function exerciseAlternatives(name, library, equipment, exclude, cap) {
  const zones = exerciseZones(name);
  if (!zones.length) return [];
  const limit = Math.max(1, Math.round(Number(cap) || 4));
  const skip = new Set([name].concat((Array.isArray(exclude) ? exclude : []).filter(Boolean)));
  return filterByEquipment(Array.isArray(library) ? library : [], equipment)
    .filter(x => x && x.name && !skip.has(x.name))
    .map(x => {
      const z = exerciseZones(x.name);
      return { name: x.name, zones: z, overlap: z.filter(v => zones.indexOf(v) !== -1).length };
    })
    .filter(x => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// Détecte un record battu AU MOMENT où une série est validée, pendant la séance guidée.
// `personalRecords` / `newRecords` existaient déjà, mais n'étaient consultés qu'au BILAN de fin de
// séance (`showGuidedRecap`) et à l'enregistrement : le record était donc annoncé après coup, jamais
// sous la barre — au seul moment où il motive.
// `prior` : records d'AVANT la séance ({ name: {load, reps} }). `sessionSets` : les autres séries de
// cet exercice déjà validées pendant la séance en cours — pour ne pas ré-annoncer un record déjà
// battu à la série précédente.
// Règles : une série à 0 rep n'est pas une série. Aucun antécédent → aucun record (il n'y a rien à
// battre : le premier passage sur un exercice ne doit pas déclencher une fanfare).
// Renvoie { type: 'load'|'reps', value, previous } ou null. Pur + testé.
function liveSetRecord(prior, name, set, sessionSets) {
  const p = (prior && typeof prior === 'object' && name) ? prior[name] : null;
  if (!p) return null;
  const prevLoad = Number(p.load) || 0, prevReps = Number(p.reps) || 0;
  if (prevLoad <= 0 && prevReps <= 0) return null;
  const load = Number(set && set.load) || 0, reps = Number(set && set.reps) || 0;
  if (reps <= 0) return null;
  let bestLoad = prevLoad, bestReps = prevReps;
  (Array.isArray(sessionSets) ? sessionSets : []).forEach(s => {
    bestLoad = Math.max(bestLoad, Number(s && s.load) || 0);
    bestReps = Math.max(bestReps, Number(s && s.reps) || 0);
  });
  if (load > 0 && load > bestLoad) return { type: 'load', value: load, previous: prevLoad };
  if (reps > bestReps) return { type: 'reps', value: reps, previous: prevReps };
  return null;
}

// Ajuste le nombre de séries d'un exercice PENDANT la séance guidée.
// Le nombre était figé par la prescription : `guidedSetLogs()` reconstruit toujours exactement
// `exercise.sets` lignes, et aucun contrôle ne permettait de le changer. Impossible donc d'ajouter
// une série quand on se sent fort, ni d'en retirer quand on est cuit.
// Refuse de retirer une série DÉJÀ VALIDÉE (ce serait jeter du travail fait sans le dire).
// Bornes : min (défaut 1) et max (défaut 8).
// Renvoie { sets, changed, reason } — reason ∈ 'added'|'removed'|'min'|'max'|'completed'|'noop'.
// null si l'exercice est invalide. Pur + testé.
function adjustGuidedSets(exercise, delta, opts) {
  const ex = exercise && typeof exercise === 'object' ? exercise : null;
  if (!ex) return null;
  const o = opts || {};
  const min = Math.max(1, Math.round(Number(o.min) || 1));
  const max = Math.max(min, Math.round(Number(o.max) || 8));
  const cur = Math.min(max, Math.max(min, Math.round(Number(ex.sets) || 1)));
  const d = Math.round(Number(delta) || 0);
  if (!d) return { sets: cur, changed: false, reason: 'noop' };
  const logs = Array.isArray(ex.setLogs) ? ex.setLogs : [];
  if (d < 0) {
    if (cur <= min) return { sets: cur, changed: false, reason: 'min' };
    const last = logs[cur - 1];
    if (last && last.completed) return { sets: cur, changed: false, reason: 'completed' };
    return { sets: cur - 1, changed: true, reason: 'removed' };
  }
  if (cur >= max) return { sets: cur, changed: false, reason: 'max' };
  return { sets: cur + 1, changed: true, reason: 'added' };
}

// Dernière séance RÉELLEMENT effectuée sur un exercice : les séries telles qu'elles ont été loguées
// (charge × reps), et non une cible calculée. C'est la référence dont on a besoin sous la barre.
// Jusqu'ici, l'historique d'un exercice (`exerciseHistoryStats`) n'était affiché que dans la fiche
// de la bibliothèque — jamais pendant la séance guidée, c'est-à-dire au seul moment où il sert.
// Retombe sur {load, reps, sets} si la séance est antérieure aux setLogs détaillés.
// Ignore les séries à 0 rep (non effectuées).
// Renvoie { date, daysAgo, sets: [{load, reps}], topSet, totalReps, tonnage } ou null. Pur + testé.
function lastExerciseSession(workouts, name, todayKey) {
  if (!name) return null;
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  let found = null;
  (Array.isArray(workouts) ? workouts : []).forEach(w => {
    if (!w || !isKey(w.date)) return;
    const exos = Array.isArray(w.exercises) && w.exercises.length
      ? w.exercises
      : (w.exercise ? [{ name: w.exercise, load: w.load, reps: w.reps, sets: w.sets }] : []);
    const ex = exos.find(e => e && e.name === name);
    if (!ex) return;
    if (!found || w.date > found.date) found = { date: w.date, ex };
  });
  if (!found) return null;
  const ex = found.ex;
  const raw = Array.isArray(ex.setLogs) && ex.setLogs.length
    ? ex.setLogs
    : Array.from({ length: Math.max(1, Math.round(Number(ex.sets) || 1)) }, () => ({ load: ex.load, reps: ex.reps }));
  const sets = raw
    .map(s => ({ load: Number(s && s.load) || 0, reps: Number(s && s.reps) || 0 }))
    .filter(s => s.reps > 0);
  if (!sets.length) return null;
  let topSet = sets[0];
  sets.forEach(s => { if (s.load > topSet.load || (s.load === topSet.load && s.reps > topSet.reps)) topSet = s; });
  return {
    date: found.date,
    daysAgo: isKey(todayKey) ? daysUntil(found.date, todayKey) : null,
    sets,
    topSet,
    totalReps: sets.reduce((a, s) => a + s.reps, 0),
    tonnage: Math.round(sets.reduce((a, s) => a + s.load * s.reps, 0))
  };
}

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
// Date au format YYYY-MM-DD `days` jours après `todayKey` (days peut être négatif). Null si invalide. Pur + testé.
function dateAfterDays(todayKey, days) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || '')); const n = Math.round(Number(days) || 0);
  if (!t) return null;
  const d = new Date(+t[1], +t[2] - 1, +t[3]); d.setDate(d.getDate() + n);
  const p = k => String(k).padStart(2, '0');
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

// ---- Conflits d'horaire dans l'agenda ----
// `dayColumns()` sait DESSINER deux événements qui se chevauchent (côte à côte dans la grille du
// jour), mais rien n'AVERTISSAIT jamais qu'on venait de se planifier deux choses en même temps.
// Pour Adrien qui jongle cours, séances et révisions, se planifier une muscu à 18 h pendant un
// cours de 17 h à 19 h passait totalement inaperçu.
//
// Règles assumées :
//  - un événement « toute la journée » (allDay) ne bloque rien : il n'a pas d'horaire, ce n'est
//    pas un conflit ;
//  - un événement sans heure est ignoré, pour la même raison ;
//  - le contact bord à bord n'est PAS un conflit (finir à 18 h et commencer à 18 h, c'est enchaîné,
//    pas superposé) ;
//  - un événement déjà fait (`completed`) ne provoque pas de conflit ;
//  - on ne se compare jamais à soi-même (utile lors d'une modification).
//
// candidate : { id?, date, time, durationMin }
// Renvoie [{ id, title, kind, time, endTime }] triés par heure. [] si aucun conflit. Pur + testé.
function timeToMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
function minutesToTime(mins) {
  const t = Math.max(0, Math.round(Number(mins) || 0)) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
function scheduleConflicts(agenda, candidate) {
  const c = candidate && typeof candidate === 'object' ? candidate : null;
  if (!c || !/^\d{4}-\d{2}-\d{2}$/.test(String(c.date || ''))) return [];
  const start = timeToMinutes(c.time);
  if (start == null) return [];                       // pas d'heure → rien à comparer
  const dur = Math.max(1, Math.round(Number(c.durationMin) || 60));
  const end = start + dur;
  return (Array.isArray(agenda) ? agenda : [])
    .filter(a => a && a.date === c.date && !a.allDay && !a.completed
      && !(c.id != null && a.id === c.id))
    .map(a => {
      const s = timeToMinutes(a.time);
      if (s == null) return null;
      const d = Math.max(1, Math.round(Number(a.durationMin) || 60));
      return { id: a.id, title: String(a.title || 'Bloc'), kind: a.kind || 'life', start: s, end: s + d };
    })
    .filter(a => a && a.start < end && start < a.end)  // chevauchement strict
    .sort((a, b) => a.start - b.start)
    .map(a => ({ id: a.id, title: a.title, kind: a.kind, time: minutesToTime(a.start), endTime: minutesToTime(a.end) }));
}

// Prochain créneau libre à partir d'une heure donnée, pour une durée voulue, un jour donné.
// Prolonge scheduleConflicts : quand un créneau est pris, autant dire OÙ ça rentre plutôt que
// de seulement dire non. opts : { date, durationMin, after ('HH:MM', défaut 'after'), dayEnd
// ('HH:MM', défaut '22:00'), excludeId }. Renvoie 'HH:MM' du premier créneau qui accueille toute
// la durée sans chevaucher un bloc horaire (hors journée entière / terminé / soi-même), ou null
// si rien ne rentre avant dayEnd. Le contact bord à bord est autorisé (18:00 juste après un bloc
// qui finit à 18:00). Pur + testé.
function nextFreeSlot(agenda, opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(o.date || ''))) return null;
  const dur = Math.max(1, Math.round(Number(o.durationMin) || 60));
  let cand = timeToMinutes(o.after);
  if (cand == null) return null;
  const limit = timeToMinutes(o.dayEnd) != null ? timeToMinutes(o.dayEnd) : 22 * 60;
  const busy = (Array.isArray(agenda) ? agenda : [])
    .filter(a => a && a.date === o.date && !a.allDay && !a.completed
      && !(o.excludeId != null && a.id === o.excludeId))
    .map(a => { const s = timeToMinutes(a.time); return s == null ? null : { s, e: s + Math.max(1, Math.round(Number(a.durationMin) || 60)) }; })
    .filter(Boolean)
    .sort((a, b) => a.s - b.s);
  // On avance le candidat jusqu'à ce qu'il ne heurte plus aucun bloc. Chaque collision le pousse à
  // la fin du bloc heurté ; comme les blocs sont triés, on converge sans boucle infinie.
  let bougé = true, garde = 0;
  while (bougé && garde++ < 500) {
    bougé = false;
    for (const b of busy) {
      if (cand < b.e && b.s < cand + dur) { cand = b.e; bougé = true; }
    }
  }
  return (cand + dur <= limit) ? minutesToTime(cand) : null;
}

// Démarrer un nouveau programme d'objectif ne doit pas laisser l'ANCIEN à l'agenda : sinon ses
// séances se superposent aux nouvelles et on se retrouve avec des jours à deux séances. Le nouveau
// programme commence toujours le lundi suivant (`fromKey`) : on purge donc les séances de programme
// à partir de cette date, SANS toucher à celles déjà passées ni cochées (l'historique — tonnage,
// blocs — reste intact) ni à celles d'ici le lundi (pas de trou cette semaine).
// ATTENTION à l'identification : normalizeAgendaItem N'accepte pas 'objprog' dans AGENDA_SOURCES,
// donc il RECODE source:'objprog' en 'manual'. Une séance de programme réelle ne se reconnaît donc
// PAS à sa source (ce serait 'manual', et purger là-dessus effacerait les vrais RDV perso !) mais à
// son refId préfixé « objprog- » (lui, préservé). On teste les deux par sécurité.
// Renvoie { agenda, removed }. Pur + testé.
function pruneProgramSessionsFrom(agenda, fromKey) {
  const list = Array.isArray(agenda) ? agenda : [];
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(fromKey || '')) ? fromKey : null;
  if (!from) return { agenda: list, removed: 0 };
  const estProgramme = a => a && (a.source === 'objprog' || /^objprog-/.test(String(a.refId || '')));
  const kept = list.filter(a => !(estProgramme(a) && !a.completed && String(a.date || '') >= from));
  return { agenda: kept, removed: list.length - kept.length };
}

// Vue UNIFIÉE des séances d'entraînement à venir, pour « prochaine séance » et « Planifier la
// suite ». Ces widgets ne lisaient que state.plans (créneaux manuels + planificateur hebdo) — donc
// les séances des GÉNÉRATEURS de programme (objprog/coachweek/runplan/planner), qui vivent dans
// state.agenda SANS entrée plans, étaient INVISIBLES : après l'onboarding, l'utilisateur voyait
// « Aucune séance planifiée » malgré 4 semaines placées. On fusionne les deux sources.
// On EXCLUT les agenda liés à un plan (planId) : generateAutomaticWeek pousse À LA FOIS un plan et
// un agenda avec planId — les compter tous deux doublonnerait. Filtre : kind 'sport', non terminé,
// non journée-entière, date >= aujourd'hui. Si `opts.nowMinutes` est fourni, on écarte aussi les
// séances d'aujourd'hui dont l'heure est déjà passée (pour « prochaine séance »).
// Renvoie [{ id, origin:'plan'|'agenda', date, time, label, kind, workout, daysLeft }] trié par
// date puis heure, tronqué à `opts.limit` si fourni. Pur + testé.
function upcomingSessions(plans, agenda, todayKey, opts) {
  const o = opts || {};
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return [];
  const nowMin = Number.isFinite(o.nowMinutes) ? o.nowMinutes : -1;
  const toMin = t => { const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t || '')); return m ? (+m[1] * 60 + +m[2]) : -1; };
  const dayLeft = d => Math.round((new Date(d + 'T12:00:00') - new Date(todayKey + 'T12:00:00')) / 864e5);
  const passe = it => it.date === todayKey && nowMin >= 0 && toMin(it.time) >= 0 && toMin(it.time) < nowMin;
  const out = [];
  (Array.isArray(plans) ? plans : []).forEach(p => {
    if (p && isKey(p.date) && p.date >= todayKey && !p.completed) {
      out.push({ id: p.id, origin: 'plan', date: p.date, time: p.time || '', label: p.type || 'Séance', kind: 'sport', workout: null, daysLeft: dayLeft(p.date) });
    }
  });
  (Array.isArray(agenda) ? agenda : []).forEach(a => {
    if (a && a.kind === 'sport' && !a.completed && !a.allDay && a.planId == null && isKey(a.date) && a.date >= todayKey) {
      out.push({ id: a.id, origin: 'agenda', date: a.date, time: a.time || '', label: String(a.title || 'Séance'), kind: 'sport', workout: Array.isArray(a.workout) ? a.workout : null, daysLeft: dayLeft(a.date) });
    }
  });
  const filtered = out.filter(it => !passe(it)).sort((x, y) => x.date.localeCompare(y.date) || String(x.time).localeCompare(String(y.time)));
  return Number.isFinite(o.limit) ? filtered.slice(0, o.limit) : filtered;
}

// « Base d'endurance » (panneau trail : dénivelé, sortie longue, plan de course, ultra) n'a de sens
// que pour un profil tourné vers l'endurance. Pour un profil force/muscle, c'est du bruit. On
// l'affiche donc seulement si : objectif profil « trail », OU objectif sportif « endurance », OU une
// course est programmée (dans ce cas l'utilisateur fait clairement de l'endurance, quel que soit son
// objectif affiché). Pur + testé.
function showsEnduranceBase(opts) {
  const o = opts || {};
  return o.goal === 'trail' || o.fitnessObjective === 'endurance' || !!o.raceGoalDate;
}

// Digest « À rattraper » : réunit sur le tableau de bord ce qui a besoin d'attention aujourd'hui, à
// travers les domaines, au lieu d'obliger à scanner chaque panneau — forme basse, examen imminent,
// révisions en retard, séances manquées, habitudes à relancer. Réutilise les fonctions existantes
// de chaque domaine (déclarations hoistées → appelables ici). Renvoie [{key, emoji, text, page,
// sev}] trié par gravité ('high' avant 'med'), tronqué à opts.cap (défaut 4). Vide si rien n'urge.
// Pur + testé.
function attentionDigest(state, todayKey, opts) {
  const s = state && typeof state === 'object' ? state : {};
  const o = opts || {};
  const cap = Math.max(1, Math.round(Number(o.cap) || 4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return [];
  const items = [];
  const rec = Array.isArray(s.recovery) ? s.recovery : [];
  const rs = readinessScore(rec.find(r => r && r.date === todayKey) || rec[rec.length - 1] || null);
  if (rs && rs.score < 50) items.push({ key: 'readiness', emoji: '😴', text: `Forme basse (${rs.score}/100) — allège aujourd'hui`, page: 'athlete', sev: 'high' });
  const er = examReminderDue(s.examGoal, todayKey);
  if (er) items.push({ key: 'exam', emoji: '📚', text: er.replace(/^📚\s*/, ''), page: 'calendar', sev: 'high' });
  const od = overdueStudy(s.agenda, todayKey);
  if (od.length) items.push({ key: 'study', emoji: '📕', text: `${od.length} révision${od.length > 1 ? 's' : ''} en retard`, page: 'calendar', sev: 'med' });
  const ms = missedSessions(s.agenda, s.workouts, todayKey);
  if (ms.length) items.push({ key: 'sport', emoji: '🏋️', text: `${ms.length} séance${ms.length > 1 ? 's' : ''} non faite${ms.length > 1 ? 's' : ''} récemment`, page: 'athlete', sev: 'med' });
  const hr = habitsAtRisk(s.habits, todayKey);
  if (hr.length) items.push({ key: 'habits', emoji: '🔥', text: `${hr.length} habitude${hr.length > 1 ? 's' : ''} à relancer avant de perdre la série`, page: 'dashboard', sev: 'med' });
  // Anniversaire imminent (≤ 2 j) : à ne pas oublier. Il vit sinon enfoui dans l'overlay Agenda.
  const bd = (typeof upcomingBirthdays === 'function') ? upcomingBirthdays(s.birthdays, todayKey, { withinDays: 2, max: 1 })[0] : null;
  if (bd) { const w = bd.daysUntil === 0 ? "aujourd'hui" : bd.daysUntil === 1 ? 'demain' : `dans ${bd.daysUntil} j`; items.push({ key: 'birthday', emoji: '🎂', text: `Anniversaire de ${bd.name} ${w}`, page: 'agenda', sev: bd.daysUntil <= 1 ? 'high' : 'med' }); }
  // Rappel de sauvegarde : la sauvegarde est manuelle et le localStorage peut être évincé (iOS). On
  // nudge si l'utilisateur a des données à protéger ET n'a pas sauvegardé depuis ≥ 14 jours (ou jamais).
  const hasData = (Array.isArray(s.weights) && s.weights.length) || (Array.isArray(s.workouts) && s.workouts.length >= 3) || (Array.isArray(s.habits) && s.habits.length >= 1) || (Array.isArray(s.agenda) && s.agenda.length >= 3);
  if (hasData) {
    const lb = String(s.lastBackup || '');
    const since = /^\d{4}-\d{2}-\d{2}$/.test(lb) ? Math.round((new Date(todayKey + 'T12:00:00') - new Date(lb + 'T12:00:00')) / 864e5) : null;
    if (since === null || since >= 14) items.push({ key: 'backup', emoji: '💾', text: since === null ? 'Sauvegarde tes données (jamais fait)' : `Sauvegarde tes données (dernière il y a ${since} j)`, page: 'settings', sev: 'med' });
  }
  // NB : la relance « Postule aujourd'hui » n'est plus ici — elle est devenue le focus PRIORITAIRE du
  // coach adaptatif (adaptiveCoachFocus), avec compte à rebours + avancement hebdo, plus motivant.
  const rank = { high: 0, med: 1 };
  items.sort((a, b) => rank[a.sev] - rank[b.sev]);
  return items.slice(0, cap);
}

// ---- Coaching adaptatif : le focus du moment (Vague 1 de la 3.0) ----
// « À rattraper » (attentionDigest) est RÉACTIF : il liste ce qui est en retard ou en péril à
// l'instant T. Le coach adaptatif est PROACTIF et lit la DYNAMIQUE : sur deux semaines glissantes,
// il compare l'activité récente de chaque pilier de vie (entraînement, focus, sommeil, nutrition)
// à la semaine précédente, repère la tendance, et propose UN seul focus — celui où un petit geste
// aujourd'hui a le plus de valeur — avec un ton qui s'adapte à la situation :
//   - « rebuild »   : un pilier solide qui s'essouffle (on relance avant de perdre l'acquis)
//   - « revive »    : un pilier connu mais dormant depuis un moment (on reprend)
//   - « reinforce » : rien à corriger → on renforce la meilleure dynamique en cours
// Renvoie { pillar, label, emoji, page, trend, tone, recentDays, prevDays, lastActiveDays,
//           headline, insight, action } ou null (aucun historique du tout → l'onboarding couvre ça).
// Pur + testé. Ne dépend d'aucune API navigateur.
function adaptiveCoachFocus(state, todayKey) {
  const s = state && typeof state === 'object' ? state : {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  const dayMs = 864e5;
  const t0 = new Date(todayKey + 'T12:00:00').getTime();
  // 0 = aujourd'hui, valeur positive = jours dans le passé, null si date invalide/future.
  const daysAgo = d => {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    const n = Math.round((t0 - new Date(d + 'T12:00:00').getTime()) / dayMs);
    return n < 0 ? null : n;
  };

  // Alternance : PRIORITÉ ABSOLUE. C'est le n°1 réel d'Adrien, avec une échéance dure (1er août).
  // Tant qu'il cherche (≥ 1 candidature, aucune acceptée) et qu'il n'a pas postulé AUJOURD'HUI, ce
  // focus prime sur tous les piliers de momentum — le but affiché est de le pousser à postuler chaque
  // jour avant l'échéance. Une fois sa candidature du jour envoyée, le coach repasse au reste.
  const apps = Array.isArray(s.applications) ? s.applications : [];
  if (apps.length >= 1 && typeof applicationStats === 'function') {
    const st = applicationStats(apps, todayKey, { weekGoal: Number(s.jobSearchGoal) || 5 });
    if (st.accepted === 0 && !st.appliedToday) {
      const dl = (typeof alternanceDeadline === 'function') ? alternanceDeadline(todayKey) : null;
      const parts = [];
      if (dl && dl.daysLeft != null) parts.push('plus que ' + dl.daysLeft + ' j avant août');
      parts.push(st.weekCount + '/' + st.weekGoal + ' candidature' + (st.weekGoal > 1 ? 's' : '') + ' cette semaine');
      if (st.streak > 0) parts.push('🔥 ' + st.streak + ' j de suite');
      const insight = parts.join(' · ');
      return {
        pillar: 'alternance', label: 'Alternance', emoji: '💼', page: 'alternance',
        trend: 'deadline', tone: 'urgent',
        recentDays: st.weekCount, prevDays: 0, lastActiveDays: null,
        headline: 'Postule aujourd’hui pour ton alternance',
        insight: insight.charAt(0).toUpperCase() + insight.slice(1) + '.',
        action: 'Ajoute une candidature — une seule suffit à avancer.',
      };
    }
  }

  const PILLARS = [
    { pillar: 'sport', label: 'Entraînement', emoji: '🏋️', page: 'athlete', list: s.workouts, active: () => true, action: 'Programme une séance courte aujourd’hui, même 20 min.' },
    { pillar: 'focus', label: 'Focus', emoji: '🧠', page: 'focus', list: s.focusSessions, active: e => (Number(e.minutes) || 0) > 0, action: 'Lance une session de focus de 25 min maintenant.' },
    { pillar: 'sommeil', label: 'Sommeil', emoji: '😴', page: 'athlete', list: s.recovery, active: e => (Number(e.sleep) || 0) > 0, action: 'Note ta nuit et vise un coucher 30 min plus tôt.' },
    { pillar: 'nutrition', label: 'Nutrition', emoji: '🥗', page: 'nutrition', list: s.nutrition, active: e => (Number(e.protein) || 0) > 0 || (Number(e.water) || 0) > 0 || e.fruit === true, action: 'Renseigne tes protéines et ton eau du jour.' },
  ];
  const cands = PILLARS.map(p => {
    const recent = new Set(), prev = new Set();
    let lastActive = null, ever = false;
    for (const e of (Array.isArray(p.list) ? p.list : [])) {
      if (!e || !p.active(e)) continue;
      const n = daysAgo(e.date);
      if (n === null) continue;
      ever = true;
      if (lastActive === null || n < lastActive) lastActive = n;
      if (n <= 6) recent.add(e.date);
      else if (n <= 13) prev.add(e.date);
    }
    const recentDays = recent.size, prevDays = prev.size;
    let trend;
    if (recentDays === 0 && prevDays === 0) trend = ever ? 'dormant' : 'none';
    else if (recentDays > prevDays) trend = 'up';
    else if (recentDays < prevDays) trend = 'down';
    else trend = 'flat';
    return { ...p, recentDays, prevDays, ever, lastActiveDays: lastActive, trend };
  });
  if (!cands.some(c => c.ever)) return null;

  // Priorité du « à corriger » : plus le tier est bas, plus c'est prioritaire.
  //  0 = pilier solide (≥3 j la semaine passée) qui recule    → rebuild
  //  1 = pilier connu mais totalement dormant (2 semaines à 0) → revive
  //  2 = recul plus léger                                       → rebuild
  const tierOf = c => {
    if (c.prevDays >= 3 && c.recentDays < c.prevDays) return 0;
    if (c.ever && c.recentDays === 0 && c.prevDays === 0) return 1;
    if (c.recentDays < c.prevDays) return 2;
    return 9;
  };
  const fixes = cands.map(c => ({ c, tier: tierOf(c) })).filter(x => x.tier < 9);
  let chosen, tone, rotated = false;
  if (fixes.length) {
    // À tier égal : le plus gros décrochage d'abord ; sinon le plus anciennement actif (dormant).
    fixes.sort((a, b) => a.tier - b.tier
      || ((b.c.prevDays - b.c.recentDays) - (a.c.prevDays - a.c.recentDays))
      || ((b.c.lastActiveDays || 0) - (a.c.lastActiveDays || 0)));
    chosen = fixes[0].c;
    tone = fixes[0].tier === 1 ? 'revive' : 'rebuild';
    // MÉMOIRE anti-radotage : si ce même pilier « à corriger » a déjà été le focus les 3 derniers
    // jours (s.coachLog, rempli au rendu — un {date, pillar} par jour) et que rien ne s'est
    // amélioré, on change d'angle : 2e pilier à corriger s'il existe, sinon on renforce le meilleur
    // élan. Un coach qui répète mot pour mot finit ignoré ; varier ré-ouvre l'attention.
    // (Le focus alternance ne passe jamais par ici : priorité absolue, il ne tourne pas.)
    const log = Array.isArray(s.coachLog) ? s.coachLog : [];
    const past = log.filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')) && e.date < todayKey)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    let consec = 0;
    for (const e of past) { if (e.pillar === chosen.pillar) consec++; else break; }
    if (consec >= 3) {
      if (fixes.length > 1) { chosen = fixes[1].c; tone = fixes[1].tier === 1 ? 'revive' : 'rebuild'; rotated = true; }
      else {
        const pool = cands.filter(c => c.pillar !== chosen.pillar && c.recentDays > 0).sort((a, b) => b.recentDays - a.recentDays);
        if (pool.length) { chosen = pool[0]; tone = 'reinforce'; rotated = true; }
      }
    }
  } else {
    // Rien à corriger : on renforce la meilleure dynamique (hausse d'abord, sinon la plus régulière).
    const rising = cands.filter(c => c.trend === 'up');
    const pool = (rising.length ? rising : cands.filter(c => c.recentDays > 0)).sort((a, b) => b.recentDays - a.recentDays);
    if (!pool.length) return null;
    chosen = pool[0];
    tone = 'reinforce';
  }

  const L = chosen.label.toLowerCase();
  const jour = n => `${n} jour${n > 1 ? 's' : ''} actif${n > 1 ? 's' : ''}`;
  let headline, insight, action;
  if (tone === 'rebuild') {
    headline = `Ton ${L} s’essouffle`;
    insight = `${jour(chosen.recentDays)} cette semaine, contre ${chosen.prevDays} la précédente. Un petit geste suffit à repartir.`;
    action = chosen.action;
  } else if (tone === 'revive') {
    const d = chosen.lastActiveDays;
    headline = `Reprends le ${L}`;
    insight = d != null ? `Rien depuis ${d} jour${d > 1 ? 's' : ''} — le bon moment pour relancer avant de perdre l’élan.` : 'Pas d’activité récente — relance dès aujourd’hui.';
    action = chosen.action;
  } else {
    headline = `Ton ${L} monte en régime`;
    insight = `${jour(chosen.recentDays)} cette semaine, en hausse. Garde le rythme.`;
    action = 'Encore un jour actif aujourd’hui pour ancrer l’habitude.';
  }
  // Objectifs PERSO : quand le pilier choisi a un objectif hebdo défini, le coach parle en fonction
  // de LUI (« 1/4 séances sur ton objectif ») — plus crédible qu'un compteur générique. Semaine
  // CALENDAIRE (lundi → aujourd'hui), distincte de la fenêtre glissante 7 j de la dynamique.
  {
    const tm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayKey);
    const monday = dateKey(mondayOf(new Date(+tm[1], +tm[2] - 1, +tm[3])));
    if (chosen.pillar === 'sport') {
      const g = Math.round(Number(s.goals && s.goals.sessions) || 0);
      if (g >= 1) {
        const wc = new Set((Array.isArray(s.workouts) ? s.workouts : [])
          .filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date || '')) && w.date >= monday && w.date <= todayKey)
          .map(w => w.date)).size;
        insight += wc >= g ? ` Objectif hebdo déjà tenu : ${wc}/${g} séance${g > 1 ? 's' : ''} 💪` : ` Objectif hebdo : ${wc}/${g} séance${g > 1 ? 's' : ''}.`;
      }
    } else if (chosen.pillar === 'focus' && typeof focusWeekGoal === 'function') {
      const fw = focusWeekGoal(s.focusSessions, todayKey);
      if (fw) insight += fw.status === 'done' ? ` Objectif hebdo atteint : ${fw.done}/${fw.target} min 💪` : ` Objectif hebdo : ${fw.done}/${fw.target} min de focus.`;
    }
  }
  if (rotated) insight += ' On varie les angles aujourd’hui.';
  return {
    pillar: chosen.pillar, label: chosen.label, emoji: chosen.emoji, page: chosen.page,
    trend: chosen.trend, tone, recentDays: chosen.recentDays, prevDays: chosen.prevDays,
    lastActiveDays: chosen.lastActiveDays, headline, insight, action, rotated,
  };
}

// Taux de suivi des conseils du coach : pour chaque jour JOURNALISÉ (s.coachLog) parmi les
// `windowDays` derniers jours RÉVOLUS (date < todayKey — le jour en cours ne compte pas, il n'est
// pas fini), le conseil est « suivi » si le pilier proposé a eu une activité CE jour-là (mêmes
// définitions d'activité que les piliers ; alternance = candidature datée du jour). Renvoie
// { total, followed, rate } ou null si aucun jour évaluable. Ferme la boucle du coach : on ne se
// contente plus de conseiller, on regarde si ça sert. Pur + testé.
function coachFollowThrough(state, todayKey, windowDays) {
  const s = state && typeof state === 'object' ? state : {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  const win = Math.max(1, Math.round(Number(windowDays) || 7));
  const dayMs = 864e5;
  const t0 = new Date(todayKey + 'T12:00:00').getTime();
  const activeOn = (pillar, date) => {
    const on = (list, ok) => (Array.isArray(list) ? list : []).some(e => e && e.date === date && ok(e));
    if (pillar === 'sport') return on(s.workouts, () => true);
    if (pillar === 'focus') return on(s.focusSessions, e => (Number(e.minutes) || 0) > 0);
    if (pillar === 'sommeil') return on(s.recovery, e => (Number(e.sleep) || 0) > 0);
    if (pillar === 'nutrition') return on(s.nutrition, e => (Number(e.protein) || 0) > 0 || (Number(e.water) || 0) > 0 || e.fruit === true);
    if (pillar === 'alternance') return on(s.applications, () => true);
    return false;
  };
  let total = 0, followed = 0;
  for (const e of (Array.isArray(s.coachLog) ? s.coachLog : [])) {
    if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')) || e.date >= todayKey) continue;
    const n = Math.round((t0 - new Date(e.date + 'T12:00:00').getTime()) / dayMs);
    if (n < 1 || n > win) continue;
    total++;
    if (activeOn(e.pillar, e.date)) followed++;
  }
  if (!total) return null;
  return { total, followed, rate: Math.round(followed / total * 100) };
}

// Filtre la liste des candidatures : recherche plein-texte insensible aux accents/casse sur
// entreprise/poste/source/notes + filtre par statut. Indispensable dès que le suivi dépasse
// quelques dizaines de lignes (la sync Cibles en importe ~500). Pur + testé.
function filterApplications(apps, opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const q = norm(o.query);
  const st = String(o.status || '');
  return (Array.isArray(apps) ? apps : []).filter(a => {
    if (!a) return false;
    if (st && a.status !== st) return false;
    if (q && !(norm(a.company).includes(q) || norm(a.role).includes(q) || norm(a.source).includes(q) || norm(a.notes).includes(q))) return false;
    return true;
  });
}

// Décrit une sauvegarde (déjà dé-enveloppée) pour l'aperçu AVANT import : compte les gros postes,
// repère la dernière date d'activité. Ne jette jamais (entrée inconnue → zéros). Pur + testé.
function describeBackup(raw) {
  const s = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const n = k => Array.isArray(s[k]) ? s[k].length : 0;
  const dates = [];
  ['workouts', 'focusSessions', 'recovery', 'nutrition', 'agenda', 'applications', 'weights'].forEach(k => {
    (Array.isArray(s[k]) ? s[k] : []).forEach(e => { if (e && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ''))) dates.push(String(e.date)); });
  });
  dates.sort();
  const counts = { workouts: n('workouts'), applications: n('applications'), agenda: n('agenda'), focusSessions: n('focusSessions'), habits: n('habits'), weights: n('weights') };
  return {
    ...counts,
    xp: Math.max(0, Math.round(Number(s.xp) || 0)),
    lastDate: dates.length ? dates[dates.length - 1] : '',
    total: counts.workouts + counts.applications + counts.agenda + counts.focusSessions + counts.habits + counts.weights,
  };
}

// Avertissements AVANT d'importer une sauvegarde par-dessus l'état actuel : import probablement
// régressif (vide, bien moins fourni, moins de candidatures, plus ancien) → liste de phrases FR à
// afficher dans la confirmation. Vide = rien d'inquiétant. Pur + testé.
function backupImportWarnings(current, incoming) {
  const cur = describeBackup(current), inc = describeBackup(incoming);
  const w = [];
  if (inc.total === 0) w.push('La sauvegarde semble VIDE.');
  else if (cur.total > 0 && inc.total < cur.total / 2) w.push(`Elle contient beaucoup moins de données que l’état actuel (${inc.total} élément${inc.total > 1 ? 's' : ''} contre ${cur.total}).`);
  if (inc.applications < cur.applications) w.push(`Candidatures : ${inc.applications} dans la sauvegarde contre ${cur.applications} actuellement.`);
  if (cur.lastDate && inc.lastDate && inc.lastDate < cur.lastDate) w.push(`Elle est plus ancienne (dernière activité ${inc.lastDate}, contre ${cur.lastDate} actuellement).`);
  return w;
}

// Formate une taille en octets pour l'affichage (fr). Pur + testé.
function formatBytes(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return '—';
  if (x < 1024) return Math.round(x) + ' o';
  if (x < 1024 * 1024) return (x / 1024).toFixed(x < 10240 ? 1 : 0) + ' Ko';
  if (x < 1024 * 1024 * 1024) return (x / (1024 * 1024)).toFixed(1) + ' Mo';
  return (x / (1024 * 1024 * 1024)).toFixed(2) + ' Go';
}

// Bilan de santé du stockage (3.0 · Fondations) : synthèse PURE à partir de mesures brutes
// collectées par le renderer. info : { stateBytes, quota, usage, persisted, mirrorAt, snapCount,
// now }. Renvoie { level: 'ok'|'warn'|'crit', lines: [...] }. Seuils : localStorage réel ~5 Mo →
// alerte dès 4 Mo (crit) / 2,4 Mo (warn) ; quota navigateur ≥ 80 % → warn ; miroir > 48 h → warn.
function storageHealthSummary(info) {
  const i = info && typeof info === 'object' ? info : {};
  const now = Number(i.now) || 0;
  const stateBytes = Math.max(0, Number(i.stateBytes) || 0);
  const LS_SOFT = 4 * 1024 * 1024;
  let level = 'ok';
  const lines = [`Données de l’app : ${formatBytes(stateBytes)}`];
  if (stateBytes > LS_SOFT) { level = 'crit'; lines.push('⚠️ Proche de la limite du stockage principal (~5 Mo) — exporte une sauvegarde et allège (photos, historique).'); }
  else if (stateBytes > LS_SOFT * 0.6) { level = 'warn'; lines.push('Stockage principal encore confortable, mais à surveiller.'); }
  const quota = Number(i.quota) || 0, usage = Number(i.usage) || 0;
  if (quota > 0) {
    const pctUse = Math.min(100, Math.max(0, Math.round(usage / quota * 100)));
    lines.push(`Espace navigateur : ${formatBytes(usage)} utilisés sur ${formatBytes(quota)} (${pctUse} %)`);
    if (pctUse >= 80 && level !== 'crit') level = 'warn';
  }
  if (i.mirrorAt) {
    const ageH = Math.max(0, Math.floor((now - Number(i.mirrorAt)) / 36e5));
    const snaps = Math.max(0, Math.round(Number(i.snapCount) || 0));
    lines.push(`Copie de secours interne : ${ageH <= 0 ? 'à jour' : `il y a ${ageH} h`} · ${snaps} instantané${snaps > 1 ? 's' : ''} (7 j max)`);
    if (ageH > 48) { if (level !== 'crit') level = 'warn'; lines.push('Le miroir n’a pas été rafraîchi récemment.'); }
  } else {
    lines.push('Copie de secours interne : pas encore de miroir.');
  }
  lines.push(i.persisted === true ? 'Persistance renforcée : accordée par le navigateur ✅' : 'Persistance renforcée : non garantie (dépend du navigateur).');
  return { level, lines };
}

// ---- Photos de progression : dimensions cibles ----
// Côté PWA, `migratePhotosToDisk()` ne s'exécute pas (elle exige window.desktop) : les photos
// restent en base64 DANS le state, donc dans localStorage. Une photo de 3 Mo pèse ~4 Mo en base64,
// et l'app en garde jusqu'à 12 → jusqu'à ~48 Mo, alors que le quota localStorage tourne autour de
// 5–10 Mo. D'où le message « ⚠ Stockage local saturé » déjà présent dans le code.
// La parade : redimensionner à l'import. Cette fonction calcule les dimensions cibles.

// Conserve le ratio, borne le grand côté à `maxSide`, et n'AGRANDIT jamais une image déjà plus
// petite (ce serait gonfler le poids pour rien). Renvoie { width, height } ou null. Pur + testé.
function fitDimensions(width, height, maxSide) {
  const w = Math.round(Number(width) || 0), h = Math.round(Number(height) || 0);
  const max = Math.max(1, Math.round(Number(maxSide) || 1280));
  if (!(w > 0) || !(h > 0)) return null;
  const long = Math.max(w, h);
  if (long <= max) return { width: w, height: h };
  const k = max / long;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

// Poids réel (octets) d'une data URL base64 — sert à mesurer le gain et à ne jamais remplacer une
// image par une version PLUS LOURDE. 0 si l'entrée n'est pas une data URL. Pur + testé.
function dataUrlBytes(dataUrl) {
  const s = String(dataUrl || '');
  const i = s.indexOf(',');
  if (i === -1) return 0;
  const b64 = s.slice(i + 1);
  if (!b64) return 0;
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(b64.length * 3 / 4) - pad);
}

// ---- Réalisme d'une cible de poids ----
// `energyPlan()` calculait sagement un plan pour N'IMPORTE QUELLE cible saisie, sans jamais dire si
// elle était atteignable, saine, ou cohérente avec l'objectif sportif. On pouvait viser 55 kg à
// 174 cm et recevoir un plan comme si de rien n'était.
// Cette fonction évalue la cible AVANT le plan, et le dit franchement.
// Repères généraux de suivi personnel — pas un avis médical. Une cible extrême renvoie
// explicitement vers un professionnel.
//
// opts : { weight, targetWeight, height, sex, age, fitnessObjective, sessionsPerWeek, todayKey }
// Renvoie { targetBmi, deltaKg, deltaPct, direction, ratePerWeek, weeks, level, notes, suggested }
//   direction : 'perte' | 'prise' | 'maintien'
//   level     : 'ok' | 'warn' | 'stop'  (le pire ton rencontré)
//   notes     : [{ tone, text }]
//   suggested : { minKg, maxKg } — fourchette de poids correspondant à un IMC 20–24,5
// Pur + testé.
function weightTargetAdvice(opts) {
  const o = opts || {};
  const weight = Number(o.weight), target = Number(o.targetWeight), height = Number(o.height);
  if (!(weight > 0) || !(target > 0) || !(height > 0)) return null;

  const m = height / 100;
  const targetBmi = Math.round(target / (m * m) * 10) / 10;
  const deltaKg = Math.round((weight - target) * 10) / 10;      // + = perdre
  const absKg = Math.abs(deltaKg);
  const deltaPct = Math.round(absKg / weight * 1000) / 10;
  const direction = absKg < 0.5 ? 'maintien' : deltaKg > 0 ? 'perte' : 'prise';

  // Rythme sûr : ~0,6 % du poids/semaine en perte (borné 0,25–0,9 kg), 0,25 kg/sem en prise.
  const ratePerWeek = direction === 'maintien' ? 0
    : direction === 'perte' ? Math.min(0.9, Math.max(0.25, Math.round(weight * 0.006 * 100) / 100))
    : 0.25;
  const weeks = direction === 'maintien' ? 0 : Math.max(1, Math.ceil(absKg / ratePerWeek));

  // Fourchette « saine » : IMC 20 → 24,5
  const suggested = {
    minKg: Math.round(20 * m * m * 10) / 10,
    maxKg: Math.round(24.5 * m * m * 10) / 10,
  };

  const notes = [];
  const num = n => String(n).replace('.', ',');

  // 1) La cible elle-même est-elle saine ?
  if (targetBmi < 18.5) {
    notes.push({ tone: 'stop', text: `Cette cible te mettrait en insuffisance pondérale (IMC ${num(targetBmi)}). Vise plutôt ${num(suggested.minKg)} kg minimum, et parles-en à un professionnel de santé avant d’aller plus bas.` });
  } else if (targetBmi < 20) {
    notes.push({ tone: 'warn', text: `Cible très basse (IMC ${num(targetBmi)}) : tenable pour certains athlètes, mais la récupération, le sommeil et la force en pâtissent souvent.` });
  } else if (targetBmi > 27 && !(String(o.fitnessObjective || '') === 'muscle' && direction === 'prise')) {
    // L'IMC ne distingue pas le muscle du gras : on ne le brandit PAS contre quelqu'un qui prend
    // délibérément du muscle — ce serait un conseil stupide pour un pratiquant de force.
    notes.push({ tone: 'warn', text: `Cette cible reste haute (IMC ${num(targetBmi)}). Attention : l’IMC ne distingue pas le muscle du gras — si tu es très musclé, ce chiffre veut peu dire. Fie-toi plutôt à tes mensurations.` });
  }

  // 2) L'ampleur du changement
  if (deltaPct >= 15) {
    notes.push({ tone: 'warn', text: `${num(absKg)} kg, c’est ${num(deltaPct)} % de ton poids : une vraie transformation. Découpe-la en paliers de 4–5 kg, avec des semaines à maintien entre chaque.` });
  } else if (deltaPct >= 8) {
    notes.push({ tone: 'ok', text: `${num(absKg)} kg (${num(deltaPct)} % de ton poids) : ambitieux mais atteignable si tu tiens la régularité.` });
  }

  // 3) La durée
  if (weeks > 26) {
    notes.push({ tone: 'warn', text: `À un rythme sûr, il faut ~${weeks} semaines (${Math.round(weeks / 4.345)} mois). Un déficit continu aussi long s’épuise : prévois des pauses à maintien.` });
  }

  // 4) Cohérence avec l'objectif sportif — le point le plus utile
  const obj = String(o.fitnessObjective || '');
  if (obj === 'muscle' && direction === 'perte' && deltaPct >= 3) {
    notes.push({ tone: 'stop', text: `Contradiction : ton objectif est de prendre du muscle, mais ta cible demande de perdre ${num(absKg)} kg. Les deux à la fois, c’est très difficile passé le stade débutant. Choisis : soit une recomposition lente (autour du maintien), soit une séquence — d’abord la perte, ensuite la prise.` });
  } else if (obj === 'seche' && direction === 'prise') {
    notes.push({ tone: 'stop', text: `Contradiction : ton objectif est la sèche, mais ta cible demande de prendre ${num(absKg)} kg. Aligne l’un sur l’autre.` });
  } else if ((obj === 'endurance' || obj === 'athletique') && direction === 'perte' && deltaPct >= 10) {
    notes.push({ tone: 'warn', text: `Perdre ${num(deltaPct)} % de ton poids pèsera sur tes performances et ta récupération. Vise le bas de la fourchette de rythme, garde 2 g de protéines/kg et maintiens la musculation pour ne pas fondre du muscle.` });
  } else if (obj === 'muscle' && direction === 'prise') {
    notes.push({ tone: 'ok', text: `Cohérent avec ton objectif : prise de masse progressive. Reste sur un surplus léger pour limiter le gras.` });
  } else if (direction === 'maintien') {
    notes.push({ tone: 'ok', text: `Cible proche de ton poids actuel : c’est une recomposition. Le poids bougera peu, la composition oui — suis plutôt tes mensurations et tes performances.` });
  }

  // 5) Toujours : préserver le muscle en perte
  if (direction === 'perte' && !notes.some(n => n.tone === 'stop')) {
    notes.push({ tone: 'ok', text: `Pour perdre sans fondre : garde la musculation, vise ~2 g de protéines/kg, et ne descends pas sous ton métabolisme de base.` });
  }

  const level = notes.some(n => n.tone === 'stop') ? 'stop' : notes.some(n => n.tone === 'warn') ? 'warn' : 'ok';
  return { targetBmi, deltaKg, deltaPct, direction, ratePerWeek, weeks, level, notes, suggested };
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
// Estimation nutritionnelle EN DIRECT pour l'onboarding, à partir des saisies (objectif, poids, taille,
// âge, sexe, séances). Renvoie { maintenance, target, dir, adjustPct, proteinG } ou null si poids/taille/
// âge insuffisants. Objectif inconnu → 'athletique'. Pur + testé.
function onboardingNutritionEstimate(inputs) {
  const i = inputs || {};
  const objective = FITNESS_OBJECTIVES.some(o => o.key === i.objective) ? i.objective : 'athletique';
  const n = objectiveNutrition(objective, { weight: i.weight, height: i.height, age: i.age, sex: i.sex, sessionsPerWeek: i.sessions, activityLevel: i.activity });
  if (!n) return null;
  return { maintenance: n.tdee, target: n.dailyTarget, dir: n.dir, adjustPct: n.adjustPct, proteinG: n.proteinG };
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

// Paliers intermédiaires vers la cible de poids : plutôt qu'un seul objectif lointain (« jusqu'à
// novembre »), une échelle de petits caps atteignables toutes les `everyWeeks` semaines, chacun
// avec le poids visé et la date. Le dernier palier est toujours la cible exacte. Donne des objectifs
// courts et concrets à cocher. opts : { current, target, ratePerWeek, todayKey, everyWeeks=2,
// maxSteps=8 }. Renvoie [{ date, weight, weeksFromNow, remaining }] (remaining = kg restants après
// ce palier). Vide si entrées invalides ou déjà à la cible. Pur + testé.
function weightMilestones(opts) {
  const o = opts || {};
  const c = Number(o.current), tg = Number(o.target), rate = Math.abs(Number(o.ratePerWeek)) || 0;
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(o.todayKey || ''));
  const every = Math.max(1, Math.round(Number(o.everyWeeks) || 2));
  const maxSteps = Math.max(2, Math.round(Number(o.maxSteps) || 8));
  if (!(c > 0) || !(tg > 0) || !t || rate <= 0 || Math.abs(c - tg) < 0.2) return [];
  const dir = tg < c ? -1 : 1;
  const totalWeeks = Math.max(1, Math.ceil(Math.abs(c - tg) / rate));
  const start = new Date(+t[1], +t[2] - 1, +t[3]); start.setHours(0, 0, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const step = wk => { const d = new Date(start); d.setDate(d.getDate() + wk * 7); let v = c + dir * rate * wk; v = dir < 0 ? Math.max(tg, v) : Math.min(tg, v); return { date: keyOf(d), weight: Math.round(v * 10) / 10, weeksFromNow: wk, remaining: Math.round(Math.abs(v - tg) * 10) / 10 }; };
  const out = [];
  for (let wk = every; wk < totalWeeks && out.length < maxSteps - 1; wk += every) out.push(step(wk));
  out.push(step(totalWeeks)); // dernier palier = la cible exacte
  return out;
}

// Progression GLOBALE vers la cible : où en est-on entre le point de départ (1re pesée enregistrée, ou
// poids de profil à défaut) et la cible ? Le graphe montre la trajectoire, mais pas ce chiffre « X %
// du chemin » qui motive d'un coup d'œil. Renvoie { pct, doneKg, totalKg, remainingKg, direction,
// start, current, target } ou null si pas de cible / départ = cible. pct borné [0..100]. Pur + testé.
function weightGoalProgress(weights, target, fallbackStart) {
  const tgt = Number(target);
  if (!(tgt > 0)) return null;
  const ws = (Array.isArray(weights) ? weights : [])
    .filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date || '')) && Number(w.value) > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const start = ws.length ? Number(ws[0].value) : Number(fallbackStart);
  const current = ws.length ? Number(ws[ws.length - 1].value) : Number(fallbackStart);
  if (!Number.isFinite(start) || !Number.isFinite(current)) return null;
  const totalKg = Math.round(Math.abs(start - tgt) * 10) / 10;
  if (totalKg < 0.1) return null;                       // départ déjà à la cible → rien à afficher
  const direction = start > tgt ? 'perte' : 'prise';
  const doneRaw = direction === 'perte' ? start - current : current - start;
  const doneKg = Math.round(Math.max(0, Math.min(totalKg, doneRaw)) * 10) / 10;
  const remainingKg = Math.round((totalKg - doneKg) * 10) / 10;
  const pct = Math.max(0, Math.min(100, Math.round((doneKg / totalKg) * 100)));
  return { pct, doneKg, totalKg, remainingKg, direction, start: Math.round(start * 10) / 10, current: Math.round(current * 10) / 10, target: Math.round(tgt * 10) / 10 };
}

// Conseils de fréquence de suivi selon le sens de l'objectif ('perte'|'prise'|'maintien'). En phase
// active on pèse souvent (moyenne > chiffre du jour) et on mesure le tour de taille régulièrement ;
// en maintien, plus léger. Renvoie { weighIn, measure }. Pur + testé.
function trackingCadenceAdvice(direction) {
  const d = String(direction || '');
  if (d === 'maintien') return { weighIn: 'Pèse-toi 1×/semaine, le matin à jeun — juste pour surveiller la stabilité.', measure: 'Tour de taille 1×/mois suffit en maintien.' };
  return { weighIn: 'Pèse-toi 2 à 3×/semaine, le matin à jeun après les toilettes. Regarde la MOYENNE de la semaine, pas le chiffre du jour (il varie avec l\'eau et le sel).', measure: 'Tour de taille toutes les 2 semaines : plus fiable que la balance pour juger la recomposition.' };
}

// Enregistre une pesée en garantissant UNE pesée par jour : remplace celle du jour si elle existe,
// sinon l'ajoute. Deux points de saisie (onglet Athlète et onglet Poids) partagent cette fonction
// pour un comportement identique — sinon des doublons du même jour faussent tendances et plan.
// Valeur bornée [30..300], arrondie à 0,1 ; entrée invalide → tableau inchangé. Renvoie le tableau
// trié par date croissante (nouveau tableau, sans muter l'entrée). Pur + testé.
function upsertWeight(weights, value, dateKey) {
  const list = Array.isArray(weights) ? weights.slice() : [];
  const v = Number(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || '')) || !(v >= 30 && v <= 300)) return list;
  const val = Math.round(v * 10) / 10;
  const out = list.filter(w => !(w && w.date === dateKey));
  out.push({ id: Date.now(), value: val, date: dateKey });
  out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return out;
}

// Comme upsertWeight mais pour une mensuration (taille/poitrine/bras) : UNE entrée par jour. Corriger
// une saisie, ou compléter un champ plus tard dans la journée, FUSIONNE au lieu de créer un doublon de
// date (qui polluait l'historique et rendait le tri instable). Chaque champ n'écrase l'ancien que s'il
// est renseigné (> 0) ; un champ vide conserve la valeur précédente du jour. Bornes [10..300] cm,
// arrondi 0,1. Ne conserve l'id du jour existant que pour une mise à jour. Non mutant, trié. Pur + testé.
function upsertMeasurement(measurements, entry, dateKey) {
  const list = Array.isArray(measurements) ? measurements.slice() : [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return list;
  const e = entry && typeof entry === 'object' ? entry : {};
  const clean = v => { const n = Number(v); return (n >= 10 && n <= 300) ? Math.round(n * 10) / 10 : 0; };
  const fields = ['waist', 'chest', 'arm'];
  const next = {};
  fields.forEach(f => { next[f] = clean(e[f]); });
  if (!fields.some(f => next[f] > 0)) return list;              // rien de valide → inchangé
  const prev = list.find(m => m && m.date === dateKey) || null;
  const merged = { id: prev && prev.id != null ? prev.id : Date.now(), date: dateKey };
  fields.forEach(f => { merged[f] = next[f] > 0 ? next[f] : (prev ? Number(prev[f]) || 0 : 0); });
  const out = list.filter(m => !(m && m.date === dateKey));
  out.push(merged);
  out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return out;
}

// Nom de fichier daté pour l'export de sauvegarde JSON (téléchargement côté PWA, où l'app n'a pas
// accès au dialogue natif de l'app installée). Pur + testé.
function backupFilename(dateKey) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || '')) ? dateKey : 'export';
  return `irl-lvp-up-sauvegarde-${d}.json`;
}

// Un fichier importé peut être soit l'état BRUT (« Exporter mes données » écrit JSON.stringify(state)),
// soit un objet ENVELOPPÉ { version, savedAt, state } (sauvegarde/historique automatique du desktop,
// dont les noms ressemblent à s'y méprendre à l'export). Sans déballage, importer un fichier enveloppé
// passerait le wrapper à normalizeState → aucun champ reconnu → retour aux valeurs par défaut = PERTE
// TOTALE des données. Cette fonction renvoie l'état à normaliser dans les deux cas. Pur + testé.
function unwrapBackup(parsed) {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    && parsed.state && typeof parsed.state === 'object' && !Array.isArray(parsed.state)) return parsed.state;
  return parsed;
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

// Évolution RÉCENTE d'une mensuration : compare la dernière valeur au point antérieur le plus
// proche de `days` jours avant (fenêtre glissante). Renvoie { latest, past, delta, spanDays, date }
// ou null si moins de 2 points datés. Pur + testé.
function measurementRecentDelta(measurements, field, days) {
  const win = Math.max(1, Math.round(Number(days) || 30));
  const list = (Array.isArray(measurements) ? measurements : [])
    .filter(m => m && Number(m[field]) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(m.date || '')))
    .map(m => ({ date: m.date, value: Number(m[field]) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (list.length < 2) return null;
  const last = list[list.length - 1];
  let ref = null, bestScore = Infinity;
  for (let i = 0; i < list.length - 1; i++) {
    const span = daysUntil(list[i].date, last.date);
    if (span == null || span <= 0) continue;
    const score = Math.abs(span - win);
    if (score < bestScore) { bestScore = score; ref = { value: list[i].value, span }; }
  }
  if (!ref) return null;
  return { latest: last.value, past: ref.value, delta: Math.round((last.value - ref.value) * 10) / 10, spanDays: ref.span, date: last.date };
}

// Série datée d'une mensuration (taille/poitrine/bras) pour tracer une mini-courbe de tendance. Le
// panneau ne montrait qu'un delta chiffré ; une sparkline rend l'évolution lisible d'un coup d'œil.
// Renvoie les `limit` derniers points { date, value } triés du plus ancien au plus récent (valeurs
// > 0, dates valides). Renvoie [] si aucun point. Pur + testé.
function measurementSeries(measurements, field, limit) {
  const lim = Math.max(2, Math.round(Number(limit) || 8));
  const list = (Array.isArray(measurements) ? measurements : [])
    .filter(m => m && Number(m[field]) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(m.date || '')))
    .map(m => ({ date: m.date, value: Math.round(Number(m[field]) * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return list.slice(-lim);
}

// Paire avant/après pour comparer la progression : photo la plus ancienne et la plus récente
// (par date). weights (optionnel) → poids le plus proche de chaque date, + delta et nb de jours.
// Null si moins de 2 photos datées. Pur + testé.
function photoComparePair(photos, weights) {
  const list = (Array.isArray(photos) ? photos : [])
    .filter(p => p && /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (list.length < 2) return null;
  const ws = (Array.isArray(weights) ? weights : []).filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date || '')) && Number(w.value) > 0);
  const nearWeight = key => {
    if (!ws.length) return null;
    let best = null, bestDiff = Infinity;
    ws.forEach(w => { const diff = Math.abs(new Date(w.date + 'T12:00:00') - new Date(key + 'T12:00:00')); if (diff < bestDiff) { bestDiff = diff; best = Number(w.value); } });
    return best;
  };
  const before = list[0], after = list[list.length - 1];
  const bw = nearWeight(before.date), aw = nearWeight(after.date);
  const days = Math.round((new Date(after.date + 'T12:00:00') - new Date(before.date + 'T12:00:00')) / 86400000);
  const weightDelta = (bw != null && aw != null) ? Math.round((aw - bw) * 10) / 10 : null;
  return { before: { ...before, weight: bw }, after: { ...after, weight: aw }, days, weightDelta };
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
// Progression du volume de course de la semaine (lundi→aujourd'hui) vers l'objectif hebdo (goalKm, en km).
// Renvoie { km, goalKm, pct (0-100), remaining, reached } ou null si objectif absent (≤ 0) ou date invalide.
// Pur + testé.
function runWeekGoal(workouts, todayKey, goalKm) {
  const g = Number(goalKm);
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!(g > 0) || !t) return null;
  const monday = dateKey(mondayOf(new Date(+t[1], +t[2] - 1, +t[3])));
  const km = Math.round(runKmInWindow(workouts, monday, todayKey) * 10) / 10;
  const pct = Math.min(100, Math.max(0, Math.round(km / g * 100)));
  const remaining = Math.max(0, Math.round((g - km) * 10) / 10);
  return { km, goalKm: g, pct, remaining, reached: km >= g };
}

// Cible hebdo indicative de minutes de concentration protégée.
const FOCUS_WEEK_TARGET_MIN = 120;
// Objectif hebdomadaire de concentration : minutes de focus de la semaine (lundi → todayKey inclus)
// vs cible, avec %, minutes restantes, nb de blocs et statut ('done'|'onTrack'|'behind'). null si
// clés invalides. Pur + testé.
function focusWeekGoal(focusSessions, todayKey, targetMin) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!t) return null;
  const target = Math.max(1, Math.round(Number(targetMin) || FOCUS_WEEK_TARGET_MIN));
  const monday = dateKey(mondayOf(new Date(+t[1], +t[2] - 1, +t[3])));
  const list = (Array.isArray(focusSessions) ? focusSessions : []).filter(f => f && isKey(f.date) && f.date >= monday && f.date <= todayKey);
  const done = list.reduce((a, f) => a + (Number(f.minutes) || 0), 0);
  const pct = Math.min(100, Math.max(0, Math.round(done / target * 100)));
  const remaining = Math.max(0, target - done);
  const status = done >= target ? 'done' : pct >= 60 ? 'onTrack' : 'behind';
  return { done, target, pct, remaining, sessions: list.length, status };
}

// Où est passé ton temps de focus, PAR TÂCHE, sur une fenêtre (défaut 7 jours). focusSessions
// capturent {date, minutes, task} : on connaît le total mais pas la RÉPARTITION. On regroupe par
// tâche, on trie par temps décroissant, on donne le % de chacune. Renvoie { total, tasks:
// [{task, minutes, sessions, pct}] } (tronqué à opts.cap, défaut 5). Pur + testé.
function focusByTask(sessions, todayKey, opts) {
  const o = opts || {};
  const days = Math.max(1, Math.round(Number(o.days) || 7));
  const cap = Math.max(1, Math.round(Number(o.cap) || 5));
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return { total: 0, tasks: [] };
  const s = new Date(todayKey + 'T12:00:00'); s.setDate(s.getDate() - (days - 1));
  const p = n => String(n).padStart(2, '0');
  const startKey = `${s.getFullYear()}-${p(s.getMonth() + 1)}-${p(s.getDate())}`;
  const groups = new Map();
  let total = 0;
  (Array.isArray(sessions) ? sessions : []).forEach(f => {
    if (!f || !isKey(f.date) || f.date < startKey || f.date > todayKey) return;
    const min = Math.max(0, Math.round(Number(f.minutes) || 0));
    if (!min) return;
    const task = (String(f.task || '').trim()) || 'Sans titre';
    if (!groups.has(task)) groups.set(task, { task, minutes: 0, sessions: 0 });
    const g = groups.get(task); g.minutes += min; g.sessions++; total += min;
  });
  const tasks = [...groups.values()]
    .map(g => ({ ...g, pct: total ? Math.round(g.minutes / total * 100) : 0 }))
    .sort((a, b) => b.minutes - a.minutes || a.task.localeCompare(b.task))
    .slice(0, cap);
  return { total, tasks };
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
// Cherche un plateau de force sur au moins un exercice-clé chargé : parcourt les exercices loggés
// (les plus suivis d'abord), calcule leur série de 1RM estimés et applique strengthPlateau. Renvoie
// { plateau:true, exercise, best } au premier exercice suffisamment fourni qui stagne, sinon
// { plateau:false }. opts.window (défaut 3), opts.limit (défaut 10). Pur + testé.
function strengthPlateauAny(workouts, opts) {
  const o = opts || {};
  const window = Math.max(3, Math.round(Number(o.window) || 3));
  const limit = Math.max(window + 1, Math.round(Number(o.limit) || 10));
  const cand = loggedExerciseNames(workouts)
    .map(name => ({ name, series: estimatedOneRmSeries(workouts, name, limit) }))
    .filter(c => c.series.length >= window + 1)
    .sort((a, b) => b.series.length - a.series.length);
  for (const c of cand) {
    const p = strengthPlateau(c.series.map(s => s.e1rm), window);
    if (p && p.plateau) return { plateau: true, exercise: c.name, best: p.best };
  }
  return { plateau: false };
}

// Prévision d'atteinte du prochain palier de force à partir de la série de 1RM estimés
// [{date, e1rm}] (ancien→récent) : estime le gain/semaine (premier→dernier) et le nombre de
// semaines jusqu'au prochain palier rond (step). Renvoie { current, milestone, gap, perWeek, weeks, date }
// ou null si historique insuffisant ou progression nulle/négative. Pur + testé.
function strengthForecast(series, step, todayKey) {
  const pts = (Array.isArray(series) ? series : [])
    .filter(p => p && Number(p.e1rm) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < 2) return null;
  const first = pts[0], last = pts[pts.length - 1];
  const current = Math.round(last.e1rm * 10) / 10;
  const nm = nextStrengthMilestone(current, step);
  if (!nm) return null;
  const weeksSpan = (new Date(last.date + 'T12:00:00') - new Date(first.date + 'T12:00:00')) / (86400000 * 7);
  if (!(weeksSpan > 0)) return null;
  const perWeek = Math.round(((last.e1rm - first.e1rm) / weeksSpan) * 100) / 100;
  if (perWeek <= 0) return null;
  const weeks = Math.max(1, Math.ceil(nm.gap / perWeek));
  return { current, milestone: nm.milestone, gap: Math.round(nm.gap * 10) / 10, perWeek, weeks, date: todayKey ? dateAfterWeeks(todayKey, weeks) : null };
}
// Meilleure prévision de force à surfacer : parcourt les exercices-clés chargés (les plus suivis
// d'abord) et renvoie la 1re prévision valide (strengthForecast) avec le nom de l'exercice, ou null.
// opts : { step=5, todayKey, limit=10 }. Pur + testé.
function bestStrengthForecast(workouts, opts) {
  const o = opts || {};
  const step = Number(o.step) > 0 ? Number(o.step) : 5;
  const today = o.todayKey || '';
  const limit = Math.max(4, Math.round(Number(o.limit) || 10));
  const cands = loggedExerciseNames(workouts)
    .map(name => ({ name, series: estimatedOneRmSeries(workouts, name, limit) }))
    .filter(c => c.series.length >= 2)
    .sort((a, b) => b.series.length - a.series.length);
  for (const c of cands) {
    const f = strengthForecast(c.series, step, today);
    if (f && f.weeks > 0) return { exercise: c.name, ...f };
  }
  return null;
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

// Série « objectif protéines » : jours consécutifs où les protéines du jour ont atteint la cible.
// La nutrition n'avait AUCUNE série (contrairement au sport, bien-être, habitudes, quêtes) alors
// que l'app est gamifiée — celle-ci récompense la régularité. « Aujourd'hui pas encore atteint »
// n'interrompt pas la série (on n'entame pas le jour en cours). Renvoie { current, best }. Pur + testé.
function proteinStreak(nutrition, target, todayKey) {
  const t = Math.round(Number(target) || 0);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!m || t <= 0) return { current: 0, best: 0 };
  const pad = n => String(n).padStart(2, '0');
  const key = x => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
  const hit = new Set();
  (Array.isArray(nutrition) ? nutrition : []).forEach(n => {
    if (n && /^\d{4}-\d{2}-\d{2}$/.test(String(n.date || '')) && (Number(n.protein) || 0) >= t) hit.add(n.date);
  });
  // série en cours : depuis aujourd'hui (ou hier si aujourd'hui pas encore atteint), en remontant
  let d = new Date(+m[1], +m[2] - 1, +m[3]); d.setHours(0, 0, 0, 0);
  if (!hit.has(key(d))) d.setDate(d.getDate() - 1);
  let current = 0, guard = 0;
  while (guard++ < 3660 && hit.has(key(d))) { current++; d.setDate(d.getDate() - 1); }
  // record : plus longue suite consécutive sur tout l'historique
  let best = 0, run = 0, prev = null;
  [...hit].sort().forEach(ds => {
    if (prev) { const pd = new Date(prev + 'T12:00:00'); pd.setDate(pd.getDate() + 1); run = (key(pd) === ds) ? run + 1 : 1; }
    else run = 1;
    if (run > best) best = run;
    prev = ds;
  });
  return { current, best: Math.max(best, current) };
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

// Tendance de l'énergie du matin (`morningRituals[].energy`, note 1–5 saisie chaque matin).
// Ces notes étaient collectées et conservées, mais SEULE celle du jour était affichée (boussole) :
// aucune moyenne, aucune tendance — alors que la récup a déjà `readinessTrend`.
// Compare la fenêtre récente (w derniers jours) à la précédente (les w jours d'avant).
// Déduplique par date. Renvoie { avg, prevAvg, delta, dir, level, days, count } ou null si moins de
// 2 matins notés dans la fenêtre récente. Pur + testé.
// Série de check-ins matinaux consécutifs finissant aujourd'hui (ou hier, tolérance : la série tient
// tant que tu ne « rates » pas un jour entier). Le check-in du matin est le rituel d'entrée de l'app —
// une série encourage la régularité, comme pour les habitudes/quêtes/bien-être. 0 si vide/invalide.
// Pur + testé.
function morningStreak(rituals, todayKey) {
  const days = new Set((Array.isArray(rituals) ? rituals : []).filter(x => x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date || ''))).map(x => x.date));
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(todayKey || ''));
  if (!days.size || !t) return 0;
  const cur = new Date(+t[1], +t[2] - 1, +t[3]); cur.setHours(0, 0, 0, 0);
  if (!days.has(dateKey(cur))) { cur.setDate(cur.getDate() - 1); if (!days.has(dateKey(cur))) return 0; }
  let n = 0;
  while (days.has(dateKey(cur))) { n++; cur.setDate(cur.getDate() - 1); }
  return n;
}

function morningEnergyTrend(rituals, todayKey, windowDays) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return null;
  const w = Math.max(2, Math.min(60, Math.round(Number(windowDays) || 7)));
  const byDate = {};
  (Array.isArray(rituals) ? rituals : []).forEach(r => {
    if (r && isKey(r.date) && Number(r.energy) > 0) byDate[r.date] = Number(r.energy);
  });
  const pad = n => String(n).padStart(2, '0');
  const shift = n => { const d = new Date(todayKey + 'T12:00:00'); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const pick = (from, to) => Object.keys(byDate).filter(k => k >= from && k <= to).map(k => byDate[k]);
  const mean = arr => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length * 10) / 10;
  const recent = pick(shift(w - 1), todayKey);
  if (recent.length < 2) return null;
  const avg = mean(recent);
  const prev = pick(shift(2 * w - 1), shift(w));
  const prevAvg = prev.length ? mean(prev) : null;
  const delta = prevAvg == null ? 0 : Math.round((avg - prevAvg) * 10) / 10;
  const dir = prevAvg == null ? 'flat' : delta >= 0.3 ? 'up' : delta <= -0.3 ? 'down' : 'flat';
  const level = avg >= 4 ? 'high' : avg >= 3 ? 'ok' : 'low';
  return { avg, prevAvg, delta, dir, level, days: w, count: recent.length };
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
// Bilan de sommeil sur la fenêtre [startKey..endKey] : moyenne (h/nuit), nb de nuits relevées, plus courte
// nuit, et statut vs ~8 h. Renvoie { nights, avg, min, status } ('court' <7 h, 'ok' 7–8,5 h, 'bon' >8,5 h)
// ou null si aucune nuit chiffrée. Une seule valeur par date (dernier check-in). Pur + testé.
function weeklySleepStats(recovery, startKey, endKey) {
  const s = String(startKey || ''), e = String(endKey || '');
  const byDate = {};
  (Array.isArray(recovery) ? recovery : []).forEach(r => {
    if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || '')) || r.date < s || r.date > e) return;
    const v = Number(r.sleep) || 0;
    if (v > 0) byDate[r.date] = v;
  });
  const vals = Object.values(byDate);
  if (!vals.length) return null;
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
  const status = avg < 7 ? 'court' : avg <= 8.5 ? 'ok' : 'bon';
  return { nights: vals.length, avg, min: Math.min(...vals), status };
}

// Série des dernières nuits chiffrées (heures de sommeil) pour tracer une mini-courbe : le bilan hebdo
// ne montre que moyenne + nuit la plus courte, pas l'évolution nuit après nuit. Une valeur par date
// (dernier check-in), triée du plus ancien au plus récent, `limit` dernières nuits. Renvoie
// [{ date, value }] ou [] si rien. Pur + testé.
function sleepSeries(recovery, limit) {
  const lim = Math.max(2, Math.round(Number(limit) || 10));
  const byDate = {};
  (Array.isArray(recovery) ? recovery : []).forEach(r => {
    if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) return;
    const h = Number(r.sleep) || 0;
    if (h > 0) byDate[r.date] = Math.round(h * 10) / 10;
  });
  return Object.keys(byDate).sort().slice(-lim).map(d => ({ date: d, value: byDate[d] }));
}

// Régularité du sommeil : écart-type (h) des `limit` dernières nuits chiffrées — une nuit par date
// (dernier check-in). Une variabilité élevée trahit un rythme décousu même quand la moyenne est
// correcte (ce que `weeklySleepStats` ne capte pas). Pur + testé. Retourne { nights, avg, stdev }
// ou null si moins de 3 nuits chiffrées.
function sleepRegularity(recovery, limit) {
  const lim = Math.max(3, Math.round(Number(limit) || 14));
  const byDate = {};
  (Array.isArray(recovery) ? recovery : []).forEach(r => {
    if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) return;
    const h = Number(r.sleep) || 0;
    if (h > 0) byDate[r.date] = h;
  });
  const vals = Object.keys(byDate).sort().slice(-lim).map(d => byDate[d]);
  if (vals.length < 3) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - avg) * (b - avg), 0) / vals.length;
  return { nights: vals.length, avg: Math.round(avg * 10) / 10, stdev: Math.round(Math.sqrt(variance) * 10) / 10 };
}

// Bilan sommeil (qualité + régularité) — 1re étape du coach de recalage demandé par Adrien
// (endormissement dérivé vers ~6 h). S'appuie uniquement sur les données déjà saisies (durée de nuit
// au check-in récup) : pas encore d'heure de coucher/lever suivie (viendra dans une étape suivante,
// nécessaire pour un vrai plan de décalage progressif). Combine moyenne 7 j (`weeklySleepStats`),
// dette 14 j (`sleepDebtHours`) et régularité 14 nuits (`sleepRegularity`) en un seul verdict. Pur +
// testé. Retourne { avg, nights, debt, stdev, irregular, tone, verdict } ou null si aucune nuit
// chiffrée sur les 7 derniers jours. tone : 'ok' | 'attention' | 'urgent'.
function sleepCoachInsight(recovery, todayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  const pad = n => String(n).padStart(2, '0');
  const shift = n => { const d = new Date(todayKey + 'T12:00:00'); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const week = weeklySleepStats(recovery, shift(6), todayKey);
  if (!week) return null;
  const debt = sleepDebtHours(recovery, 7.5, shift(13), todayKey);
  const reg = sleepRegularity(recovery, 14);
  const irregular = !!(reg && reg.stdev >= 1.5);
  const nightsWord = n => `nuit${n > 1 ? 's' : ''}`;
  let tone, verdict;
  if (week.status === 'court' && irregular) {
    tone = 'urgent';
    verdict = `Sommeil court et irrégulier (moy. ${week.avg} h, écart ${reg.stdev} h d’une nuit à l’autre) — avant d’allonger les nuits, stabilise d’abord une heure de coucher fixe.`;
  } else if (week.status === 'court') {
    tone = 'attention';
    verdict = `Sommeil court : moy. ${week.avg} h sur ${week.nights} ${nightsWord(week.nights)}, dette de ${debt.debt} h sur 14 j — vise un coucher 30 min plus tôt.`;
  } else if (irregular) {
    tone = 'attention';
    verdict = `Durée correcte (moy. ${week.avg} h) mais rythme irrégulier (écart ${reg.stdev} h d’une nuit à l’autre) — se coucher à heure fixe compte autant que le total.`;
  } else {
    tone = 'ok';
    verdict = `Sommeil solide : moy. ${week.avg} h sur ${week.nights} ${nightsWord(week.nights)}, rythme régulier.`;
  }
  return { avg: week.avg, nights: week.nights, debt: debt.debt, stdev: reg ? reg.stdev : null, irregular, tone, verdict };
}

// Heure de coucher « ancrée » : minutes écoulées depuis midi (12:00), de sorte que la progression
// soir → nuit → petit matin devienne monotone croissante (20:00 → 480, minuit → 720, 06:00 → 1080).
// Indispensable pour comparer et décaler des couchers qui traversent minuit sur une échelle continue —
// sans quoi 06:00 (petit matin) semblerait « avant » 23:00. Renvoie 0..1439 ou null si l'heure est
// invalide. Pur + testé. Étape 2 du coach de recalage (capture de l'heure de coucher).
function bedtimeAnchor(hhmm) {
  const m = timeToMinutes(hhmm);
  if (m == null) return null;
  return (m - 720 + 1440) % 1440;
}
// Inverse de bedtimeAnchor : d'une valeur ancrée (0..1439, minutes depuis midi) vers 'HH:MM'. Pur + testé.
function bedtimeFromAnchor(anchor) {
  const a = ((Math.round(Number(anchor) || 0) % 1440) + 1440) % 1440;
  return minutesToTime((a + 720) % 1440);
}
// Coucher « typique » récent : médiane des heures de coucher ancrées des `limit` dernières nuits
// renseignées (champ `bedtime` au check-in récup, facultatif). La médiane résiste à une nuit blanche
// isolée, ce qui donne un point d'ancrage honnête au plan de recalage. Une valeur par date (dernier
// check-in). Renvoie { anchor, time, nights } ou null si aucune heure de coucher saisie. Pur + testé.
function recentBedtimeAnchor(recovery, todayKey, limit) {
  const lim = Math.max(1, Math.min(30, Math.round(Number(limit) || 5)));
  const byDate = {};
  (Array.isArray(recovery) ? recovery : []).forEach(r => {
    if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) return;
    if (todayKey && r.date > todayKey) return;
    const a = bedtimeAnchor(r.bedtime);
    if (a != null) byDate[r.date] = a;
  });
  const anchors = Object.keys(byDate).sort().slice(-lim).map(d => byDate[d]);
  if (!anchors.length) return null;
  const sorted = anchors.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return { anchor: median, time: bedtimeFromAnchor(median), nights: anchors.length };
}

// Plan de recalage du sommeil — normalisation robuste (import hostile, valeurs absurdes). Le plan
// décrit un décalage progressif du coucher, du point de départ vers un objectif nocturne. Champs :
// active (bool), targetTime/startTime ('HH:MM' normalisés), startKey (date de départ), stepMin
// (10..60, décalage par pas), stepDays (1..3, un pas tous les N jours), lastReward (date du dernier
// XP sommeil accordé). Un plan n'est actif que si objectif + départ + date de départ sont présents.
// Pur + testé. Étape 3 du coach de recalage.
function normalizeSleepPlan(plan) {
  const p = (plan && typeof plan === 'object' && !Array.isArray(plan)) ? plan : {};
  const norm = v => { const m = timeToMinutes(v); return m == null ? '' : minutesToTime(m); };
  const targetTime = norm(p.targetTime), startTime = norm(p.startTime);
  const startKey = /^\d{4}-\d{2}-\d{2}$/.test(String(p.startKey || '')) ? p.startKey : '';
  const lastReward = /^\d{4}-\d{2}-\d{2}$/.test(String(p.lastReward || '')) ? p.lastReward : '';
  const stepMin = Math.max(10, Math.min(60, Math.round(Number(p.stepMin) || 25)));
  const stepDays = Math.max(1, Math.min(3, Math.round(Number(p.stepDays) || 1)));
  const active = Boolean(p.active) && !!targetTime && !!startTime && !!startKey;
  return { active, targetTime, startTime, startKey, stepMin, stepDays, lastReward };
}

// Démarre un plan de recalage : ancre le point de départ sur le coucher typique récent (médiane des
// dernières nuits renseignées) — ou sur `opts.startTime` si fourni — vers `targetTime` (objectif
// nocturne, ex. 23:30). Renvoie un plan normalisé prêt à stocker, ou null si l'objectif est invalide,
// la date invalide, ou qu'aucune heure de coucher n'a jamais été saisie (impossible d'ancrer le
// départ honnêtement). Pur + testé.
function startSleepPlan(recovery, targetTime, todayKey, opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  const tgt = timeToMinutes(targetTime);
  if (tgt == null || !/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  let startTime = timeToMinutes(o.startTime) != null ? minutesToTime(timeToMinutes(o.startTime)) : '';
  if (!startTime) { const rec = recentBedtimeAnchor(recovery, todayKey, o.window || 5); if (rec) startTime = rec.time; }
  if (!startTime) return null;
  return normalizeSleepPlan({
    active: true, targetTime: minutesToTime(tgt), startTime, startKey: todayKey, lastReward: '',
    stepMin: o.stepMin != null ? o.stepMin : 25, stepDays: o.stepDays != null ? o.stepDays : 1,
  });
}

// Cœur du coach de recalage : à partir du plan (coucher de départ → objectif) et des couchers réels
// récents, calcule LE coucher cible du jour, la progression, l'écart au plan et une estimation
// HONNÊTE d'arrivée. Décale ~stepMin plus tôt tous les stepDays jours (planning idéal), MAIS s'adapte
// si l'utilisateur dévie : on ne demande jamais plus d'un pas au-delà du coucher réel récent — quand
// Adrien est en retard, le plan glisse et la date d'arrivée recule au lieu d'exiger un saut impossible.
// Renvoie { targetTime, goalTime, startTime, recentTime, progress, reached, adapted, status,
// stepsLeft, daysLeft, arrivalKey, stepMin, stepDays, daysElapsed } ou null si plan inactif/invalide.
// status : 'on' (dans les temps) | 'behind' (en retard, plan relâché) | 'ahead' (en avance). Pur + testé.
function sleepPlanDay(plan, recovery, todayKey) {
  const p = normalizeSleepPlan(plan);
  if (!p.active || !/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  const startAnchor = bedtimeAnchor(p.startTime), targetAnchor = bedtimeAnchor(p.targetTime);
  if (startAnchor == null || targetAnchor == null) return null;
  const totalShift = startAnchor - targetAnchor;                 // > 0 : il faut avancer (se coucher plus tôt)
  const daysElapsed = Math.max(0, daysUntil(p.startKey, todayKey) || 0);
  const scheduledSteps = Math.floor(daysElapsed / p.stepDays);
  const idealAnchor = Math.max(targetAnchor, startAnchor - scheduledSteps * p.stepMin);
  const recent = recentBedtimeAnchor(recovery, todayKey, 3);
  const recentAnchor = recent ? recent.anchor : null;
  // Cible du jour : la planification idéale, mais jamais plus d'un pas au-delà de la réalité récente.
  let targetTodayAnchor = idealAnchor, adapted = false;
  if (recentAnchor != null && totalShift > 0) {
    const gentle = recentAnchor - p.stepMin;                     // un seul pas depuis le coucher réel
    if (gentle > idealAnchor) { targetTodayAnchor = Math.min(startAnchor, gentle); adapted = true; }
  }
  targetTodayAnchor = Math.max(targetAnchor, Math.min(startAnchor, targetTodayAnchor));
  const reached = (recentAnchor != null && recentAnchor <= targetAnchor + 15) || (recentAnchor == null && targetTodayAnchor <= targetAnchor + 5);
  // Progression : part du chemin déjà parcourue (référence = coucher réel, sinon planification idéale).
  const donePos = recentAnchor != null ? Math.min(startAnchor, recentAnchor) : idealAnchor;
  const progress = totalShift > 0 ? Math.max(0, Math.min(100, Math.round((startAnchor - donePos) / totalShift * 100))) : 100;
  // Estimation d'arrivée basée sur la réalité : pas restants depuis le coucher réel récent.
  const fromAnchor = recentAnchor != null ? recentAnchor : idealAnchor;
  const remaining = Math.max(0, fromAnchor - targetAnchor);
  const stepsLeft = Math.ceil(remaining / p.stepMin);
  const daysLeft = stepsLeft * p.stepDays;
  const arrivalKey = daysLeft > 0 ? dateAfterDays(todayKey, daysLeft) : todayKey;
  let status = 'on';
  if (recentAnchor != null) {
    if (recentAnchor > idealAnchor + p.stepMin) status = 'behind';
    else if (recentAnchor < idealAnchor - p.stepMin) status = 'ahead';
  }
  return {
    targetTime: bedtimeFromAnchor(targetTodayAnchor), goalTime: p.targetTime, startTime: p.startTime,
    recentTime: recent ? recent.time : null, progress, reached, adapted, status,
    stepsLeft, daysLeft, arrivalKey, stepMin: p.stepMin, stepDays: p.stepDays, daysElapsed,
  };
}

// Conseils du soir contextuels au coucher visé (`targetTime`) — étape 4 (coach RPG). Chaque conseil
// est calé sur une heure relative à la cible : caféine coupée ~8 h avant, dîner ~3 h avant, écrans en
// veille ~1 h30 avant, routine calme ~30 min avant, lumière du jour au réveil (ancre n°1 pour avancer
// l'horloge interne). Renvoie [{ key, icon, text }] ou [] si l'heure est invalide. Pur + testé.
function sleepEveningTips(targetTime) {
  const t = timeToMinutes(targetTime);
  if (t == null) return [];
  const at = offset => minutesToTime((t - offset + 1440 * 2) % 1440);
  return [
    { key: 'caffeine', icon: '☕', text: `Dernier café, thé ou soda avant ${at(8 * 60)} : la caféine reste active 6 à 8 h et retarde l'endormissement.` },
    { key: 'meal', icon: '🍽️', text: `Dîner terminé vers ${at(3 * 60)} — un repas tardif ou lourd tient le corps éveillé.` },
    { key: 'screens', icon: '📵', text: `Écrans en veille et lumières tamisées dès ${at(90)} : la lumière du soir repousse la mélatonine.` },
    { key: 'winddown', icon: '🧘', text: `Routine calme (lecture, étirements doux, respiration) à partir de ${at(30)} pour signaler la nuit au corps.` },
    { key: 'light', icon: '☀️', text: `Au réveil, expose-toi vite à la lumière du jour : c'est l'ancre n°1 pour avancer ton horloge interne.` },
  ];
}

// Adhérence au plan de recalage : sur les `windowDays` dernières nuits renseignées (heure de coucher),
// combien ont tenu la cible planifiée du jour (± 30 min de marge), et série de nuits « dans le plan »
// finissant à la plus récente. Chaque nuit est comparée à SA cible idéale (planning à sa date), pas à
// celle d'aujourd'hui. Renvoie { nights, met, rate, streak } ou null si plan inactif. Pur + testé.
function sleepPlanAdherence(plan, recovery, todayKey, windowDays) {
  const p = normalizeSleepPlan(plan);
  if (!p.active) return null;
  const startAnchor = bedtimeAnchor(p.startTime), targetAnchor = bedtimeAnchor(p.targetTime);
  if (startAnchor == null || targetAnchor == null) return null;
  const w = Math.max(3, Math.min(30, Math.round(Number(windowDays) || 7)));
  const tol = 30;
  const byDate = {};
  (Array.isArray(recovery) ? recovery : []).forEach(r => {
    if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) return;
    if (r.date < p.startKey || (todayKey && r.date > todayKey)) return;
    const a = bedtimeAnchor(r.bedtime);
    if (a != null) byDate[r.date] = a;
  });
  const dates = Object.keys(byDate).sort().slice(-w);
  if (!dates.length) return { nights: 0, met: 0, rate: 0, streak: 0 };
  const idealFor = date => { const de = Math.max(0, daysUntil(p.startKey, date) || 0); const s = Math.floor(de / p.stepDays); return Math.max(targetAnchor, startAnchor - s * p.stepMin); };
  const flags = dates.map(d => byDate[d] <= idealFor(d) + tol);
  const met = flags.filter(Boolean).length;
  let streak = 0;
  for (let i = flags.length - 1; i >= 0; i--) { if (flags[i]) streak++; else break; }
  return { nights: dates.length, met, rate: Math.round(met / dates.length * 100), streak };
}

// Récompense RPG d'un coucher dans le plan : si le plan est actif, non déjà récompensé aujourd'hui, et
// que l'heure de coucher saisie tient la cible du jour (± 20 min), renvoie l'XP à accorder (15, + bonus
// à 25 si l'objectif final est atteint). La cible du jour est calculée SANS la nuit du jour (une nuit ne
// déplace pas son propre objectif). Renvoie { xp, reachedGoal, targetTime } ou null. Pur + testé.
function sleepBedtimeReward(plan, recovery, todayKey, bedtime) {
  const p = normalizeSleepPlan(plan);
  if (!p.active || p.lastReward === todayKey) return null;
  const a = bedtimeAnchor(bedtime);
  if (a == null) return null;
  const prior = (Array.isArray(recovery) ? recovery : []).filter(r => r && r.date !== todayKey);
  const day = sleepPlanDay(p, prior, todayKey);
  if (!day) return null;
  const targetAnchor = bedtimeAnchor(day.targetTime), goalAnchor = bedtimeAnchor(day.goalTime);
  if (a > targetAnchor + 20) return null;
  const reachedGoal = a <= goalAnchor + 15;
  return { xp: reachedGoal ? 25 : 15, reachedGoal, targetTime: day.targetTime };
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

// Rythme d'hydratation DANS la journée : on boit trop souvent tout d'un coup (ou on oublie l'après-midi).
// À partir de l'heure courante, répartit l'objectif sur la fenêtre d'éveil (8 h → 22 h) et dit combien
// de verres on « devrait » avoir bu à cette heure, plus un statut. Renvoie { expected, status
// ('done'|'ontrack'|'behind'), nudge, remaining } ou null hors fenêtre (trop tôt/tard = pas de pression,
// et pas de rappel à boire juste avant de dormir). Pur + testé.
function hydrationPace(count, goal, hour) {
  const g = Math.max(1, Math.min(20, Math.round(Number(goal) || 8)));
  const c = Math.max(0, Math.round(Number(count) || 0));
  const h = Number(hour);
  const START = 8, END = 22;
  if (!Number.isFinite(h) || h < START || h >= END) return null;
  const expected = Math.round(g * Math.max(0, Math.min(1, (h - START) / (END - START))));
  const remaining = Math.max(0, g - c);
  if (c >= g) return { expected, status: 'done', nudge: 'Objectif atteint 💧 — continue à boire selon ta soif.', remaining: 0 };
  if (c >= expected) return { expected, status: 'ontrack', nudge: 'Bon rythme — tu es dans les temps.', remaining };
  const gap = expected - c;
  return { expected, status: 'behind', nudge: `Un peu en retard (~${gap} verre${gap > 1 ? 's' : ''} sur le rythme) — bois un verre maintenant.`, remaining };
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
  module.exports = { localDate, nextThemeMode, resolveTheme, dateKey, weekStart, pct, levelFromXp, leveledUp, xpWithinLevel, computeStreak, nextStreakMilestone, dailyGreeting, suggestedQuests, normalizeAgendaItem, duplicateAgendaItem, departureInfo, reminderAnchorMinutes, dayPlannedMinutes, dayPlanText, AGENDA_KINDS, AGENDA_SOURCES, AGENDA_PRIORITIES, priorityRank, normalizeTodo, todosForDay, JOB_STATUSES, JOB_STATUS_LABEL, normalizeApplication, nextAlternanceTarget, compareApplications, alternanceDeadline, applicationStats, parseCsv, parseApplicationsCsv, jobStatusFromText, jobDateFromText, parseAlternanceTargets, parseSheetApplications, normalizeBirthday, birthdaysForDay, upcomingBirthdays, normalizeRecurring, recurrenceMatches, recurringOccurs, RECUR_FREQ, normalizeHabit, applyHabitEdit, habitStreak, habitBestStreak, habitConsistency, habitWeekMap, habitsWeekPulse, habitsForDay, habitsAtRisk, icsEscape, unescapeIcs, buildIcs, buildRRuleLine, parseIcs, parseRRule, isPrivateHost, normalizeCalendarUrl, isAllowedSheetHost, normalizeSheetCsvUrl, mergeApplications, filterApplications, TRAVEL_HOSTS, isAllowedTravelUrl, buildGeocodeUrl, buildRouteUrl, haversineKm, travelModes, planStudySessions, mergePlannedEvents, todayItems, tomorrowPreview, weekItems, glcPlanningToEvents, prescriptionFor, formatFor, mondayOf, weeklyAggregate, weeklySummary, weeklySummaryText, shareableWeek, monthLabelFr, monthlyRecap, monthlyRecapText, shareableMonth, weeklyInsights, RACE_PRESETS, weeksBetween, weeklyWorkoutStreak, dailyStreak, completeDaysStreak, logQuestDay, questPerfectStreak, logLifeStep, lifeStepStats, recentReflectionNotes, recentWins, recentLessons, recentFocusOutcomes, intentionFollowThrough, trainingHeatmap, acuteChronicRatio, racePhase, raceGoalStatus, loadAdvice, daysUntil, examCountdown, examReminderDue, studyPacing, studyStats, studyBySubject, keyDateMarkers, upcomingKeyDates, upcomingPriorityItems, nextTrainingSession, nextStudySession, missedSessions, overdueStudy, RACE_LADDER, intermediateGoals, proteinTarget, PROTEIN_SNACKS, proteinSnackSuggestion, nutritionCsv, hydrationPlan, buildWeekPlan, volumeRamp, warmupFor, cooldownFor, supplementTiming, generateMeals, MEAL_STYLES, buildShoppingList, remainingShopping, SHOPPING_STAPLES, TRAINING_GOALS, EXERCISE_ZONES, exerciseZones, equipmentOptions, activeExerciseFilters, toggleFavorite, weeklyZoneCoverage, weeklySetsPerZone, setLandmark, muscleBalance, pushPullAdvice, zoneFreshness, suggestTrainingFocus, neglectedZoneReport, runPlanWeek, coachSessionLabel, neglectedZone, goalMatch, goalRank, zoneTopExercises, BODY_GOALS, bodyGoalWorkout, pickExercisesForZones, exerciseAvailable, filterByEquipment, EQUIP_LABELS, FITNESS_OBJECTIVES, objectiveProgram, assignProgramDays, objectiveNutrition, onboardingNutritionEstimate, programWeekSummary, macroBreakdown, objectiveProgramText, shareableProgram, onboardingSetup, TRAINING_SLOTS, sessionTimesForSlot, perSessionForLevel, onboardingFirstSession, onboardingCompleteness, sanitizeOnboardingDraft, suggestObjective, STARTER_HABITS, starterHabitFor, objectiveWelcome, starterChecklist, isIosInstallable, installNudge, CHANGELOG, compareVersions, whatsNewSince, MEMBERSHIP_TIERS, membershipInfo, shareAppPayload, LAUNCH_TARGETS, launchTarget, shouldReacquireWakeLock, pendingBadgeCount, VIBRATION_PATTERNS, vibrationPattern, WELLNESS_ROUTINES, wellnessRoutine, suggestedRoutine, surpriseRoutine, WELLNESS_PARCOURS, wellnessParcours, shareableRoutine, routinesByTimeBudget, expressRoutine, workoutDominantZone, contextualWellnessRoutine, logWellnessDone, wellnessStreak, wellnessBestStreak, wellnessCountInWindow, wellnessMinutesForKey, wellnessMinutesInWindow, bestWellnessWeek, shareableWellness, WELLNESS_FAMILIES, wellnessFamilyBreakdown, wellnessGoalProgress, wellnessInactivity, WELLNESS_ZONE_ROUTINES, neglectedMobilityZone, WELLNESS_STREAK_BADGES, WELLNESS_TOTAL_BADGES, wellnessBadges, newWellnessBadge, wellnessWeekHeatmap, wellnessRecurringEvent, blockPhase, progressSets, currentBlock, phaseSetsForDay, archiveBlock, blockHistorySummary, nextBlockAdvice, blockPhaseHeadsUp, blockWindowStats, blockComparison, blocksByObjective, weeklyTonnageTrend, bestSessionTonnage, bestTonnageWeek, trainingConsistency, trainingByWeekday, weekTrainingBalance, bestE1rmByExercise, blockExerciseProgress, blockProgressText, shareableBlockProgress, quickSessionPlan, buildZonePlan, buildTrainingWeek, WEEKDAY_FR, dayColumns, waterStatus, hydrationPace, waterGoalFor, daysHittingTarget, proteinDaysOnTarget, proteinStreak, basalMetabolicRate, bmiInfo, activityFactor, activityLevelFactor, dateAfterWeeks, paceStatus, energyPlan, weightTargetAdvice, weightMilestones, weightGoalProgress, trackingCadenceAdvice, upsertWeight, upsertMeasurement, backupFilename, unwrapBackup, fitDimensions, dataUrlBytes, timeToMinutes, minutesToTime, scheduleConflicts, nextFreeSlot, pruneProgramSessionsFrom, upcomingSessions, showsEnduranceBase, attentionDigest, adaptiveCoachFocus, coachFollowThrough, describeBackup, backupImportWarnings, formatBytes, storageHealthSummary, calorieAdjustment, weightForecast, coachWeekPlan, mealSplit, nutritionTips, mealIdea, coachPlanText, coachSteps, weeklyAdherence, upsertAdherenceSnapshot, readinessScore, readinessTrend, morningEnergyTrend, morningStreak, sleepDebtHours, weeklySleepStats, sleepSeries, sleepRegularity, sleepCoachInsight, bedtimeAnchor, bedtimeFromAnchor, recentBedtimeAnchor, dateAfterDays, normalizeSleepPlan, startSleepPlan, sleepPlanDay, sleepEveningTips, sleepPlanAdherence, sleepBedtimeReward, personalRecords, newRecords, weightTrend, measurementDelta, measurementRecentDelta, measurementSeries, photoComparePair, recompositionInsight, computeAchievements, lifetimeStats, lastLoggedSession, workoutsTable, workoutsWithExercise, loggedExerciseNames, exerciseVolumeSeries, estimatedOneRmSeries, strengthPlateau, strengthPlateauAny, strengthForecast, bestStrengthForecast, estimate1RM, formatClock, restBarPct, adjustRestSeconds, loadPercentages, progressionSuggestion, progressionText, strengthRecords, nextStrengthMilestone, exerciseHistoryStats, lastExerciseSession, adjustGuidedSets, liveSetRecord, exerciseAlternatives, splitDuration, combineDuration, guidedSnapshot, guidedSnapshotEquals, resumableGuided, focusTimerStart, focusTimerState, focusTimerPause, focusTimerResume, breakSuggestion, restStart, restState, sessionMinutes, workoutTonnage, lifetimeTonnage, completedTonnage, completedSetCount, sessionSummary, runPace, runKmInWindow, weeklyKmRamp, runWeekGoal, FOCUS_WEEK_TARGET_MIN, focusWeekGoal, focusByTask, trailReadiness, agendaMatch };
}
