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
// Cycle des modes de thème : auto → clair → sombre → selon l'heure → auto. Pur + testé.
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

// Une clé de date AAAA-MM-JJ est-elle RÉELLE (mois 1-12, jour 1-31), pas seulement format-valide ?
// Neutralise une date impossible (« 2026-13-99 » venue d'un backup abîmé ou d'un .ics cassé) sans
// jamais rejeter une saisie normale — mêmes bornes que jobDateFromText. Partagée par les normalizers
// (agenda / to-do / récurrence) : une case introuvable orpheline l'entrée de toutes les vues. Pur + testé.
function isBoundedDateKey(s) {
  const m = typeof s === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
  return !!(m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31);
}

// Comme isBoundedDateKey mais EXIGE une date calendaire RÉELLE (jour ≤ dernier jour du mois ; 29 févr.
// rejeté hors année bissextile) via un aller-retour `new Date`. Nécessaire là où une clé sert ensuite à
// `new Date(s + 'T12:00:00')` pour un diff de jours : une date format-valide mais impossible
// (2026-04-31, 2026-02-30) déborde silencieusement au mois suivant et fabrique une paire de jours
// consécutifs FANTÔME dans les calculs de RECORD (wellnessBestStreak, best de proteinStreak). Pur + testé.
function isRealDateKey(s) {
  const m = typeof s === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
  if (!m) return false;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3];
}

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
    date: isBoundedDateKey(x.date) ? x.date : '',
    priority: AGENDA_PRIORITIES.includes(x.priority) ? x.priority : 'normal',
    done: Boolean(x.done),
    doneAt: isBoundedDateKey(x.doneAt) ? x.doneAt : null,
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
// Échéance de la recherche d'alternance : la prochaine RENTRÉE (1er octobre). On ne vise plus le
// 1er août — la recherche a du sens tout l'été et jusqu'à la rentrée (beaucoup de contrats démarrent
// en sept./oct.), et le compte à rebours s'effondrait à « J-365 » pile au moment le plus tendu.
// Trois phases : 'before' = compte à rebours normal (daysLeft > 0) ; 'crunch' = rentrée passée mais
// saison encore ouverte (jusqu'au 1er déc. → daysLeft <= 0, « dernière ligne droite ») ; puis, la
// saison réellement finie, on bascule sur le cap de l'an prochain. Renvoie { date, daysLeft, phase }.
// Pur + testé.
function alternanceDeadline(todayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  const y = +todayKey.slice(0, 4);
  const rentree = y + '-10-01', seasonEnd = y + '-12-01';
  let date, phase;
  if (todayKey < rentree) { date = rentree; phase = 'before'; }
  else if (todayKey < seasonEnd) { date = rentree; phase = 'crunch'; }
  else { date = (y + 1) + '-10-01'; phase = 'before'; }
  const days = daysUntil(todayKey, date);
  return { date, daysLeft: days == null ? 0 : days, phase };
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
  const sent = list.filter(a => a.status !== 'a_postuler' && isKey(a.date));
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
// Parseur CSV minimal mais correct (gère les guillemets, virgules et sauts de ligne échappés). Un
// « \r » isolé est ignoré même À L'INTÉRIEUR d'un champ entre guillemets (cohérent avec le hors-champ)
// : une cellule multi-ligne exportée en CRLF (RFC 4180, Excel) ne laisse plus traîner de retour
// chariot parasite dans la valeur — seul le « \n » reste comme vrai saut de ligne interne. Pur.
function parseCsv(text) {
  const s = String(text || ''); const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else if (c !== '\r') cell += c; }
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
  const norm = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
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
  // Rejet formulé par la NÉGATION d'un mot positif (« non retenu », « candidature non retenue »,
  // « pas (été) retenu(e) ») : la tournure standard d'un refus d'alternance. À tester AVANT `accepte`,
  // sinon son sous-motif « retenu » l'emporterait et inverserait le refus en offre acceptée — ce qui
  // corromprait le funnel et `applicationStats` (accepted, responseRate). La négation peut être suivie
  // de quelques mots (« pas été retenu ») : on tolère un court intervalle avant « retenu ».
  if (/\b(non|pas)\b[\s\S]{0,12}retenu/.test(x)) return 'refus';
  // `pris` avec frontière de mot (\bpris) : « pris/prise/pris(es) » = accepté, MAIS pas le sous-motif
  // « pris » d'« entre-pris-e » — sinon « Entretien EN ENTREPRISE » (tournure FR ultra-courante pour
  // un entretien sur site) bascule en « accepté », faux positif corrompant le funnel + applicationStats.
  // `\bpris` (fix #446) ne réglait QUE « entre-pris-e » : il matche encore « PRISE de contact »,
  // « PRIS contact », « PRIS en compte », « rendez-vous PRIS » — tournures ultra-courantes d'une
  // recherche d'alternance, toutes des états EN COURS, qui basculaient en « accepté » et corrompaient
  // le funnel + applicationStats. « pris » ne vaut acceptation que dans une TOURNURE d'acceptation
  // (« j'ai été pris », « je suis prise ») : on l'exige, au lieu de se fier au mot seul.
  // De même `accept` nu matchait « in-accept-able » → `\baccept` (la frontière tombe après « in »).
  // `candidature prise` est conservé explicitement : c'était une attente DOCUMENTÉE par le test du
  // fix #446, on ne la renverse pas au passage (formulation ambiguë — à trancher par Adrien).
  if (/\baccept|\bretenu|\bembauch/.test(x)
    || /\b(?:ete|suis|est|etes|sommes|sont)\s+prise?s?\b/.test(x)
    || /candidature prise/.test(x)) return 'accepte';
  if (/refus|negati|decline|abandonn|ecart|sans suite/.test(x)) return 'refus';
  // `entretien` APRÈS les états terminaux (refus/accepté) : un « refusé après entretien » ou un
  // « retenu à l'issue de l'entretien » est un état FINAL, pas un entretien en cours. Placé avant, le
  // simple mot « entretien » emportait le refus/l'accepté et laissait la candidature bloquée en
  // colonne « entretien » du funnel (et non-régressable au re-sync, `rankOf` entretien < refus).
  if (/entretien|entrevue/.test(x)) return 'entretien';
  // `relance` (suivi EN COURS) APRÈS les états terminaux/avancés — même raison que `entretien` juste
  // au-dessus : « relancé puis refusé », « relancé, sans suite », « relancé, j'ai été pris » ou
  // « relancé, entretien décroché » sont refus / accepté / entretien, PAS une relance en cours. Placé
  // en tête (avant refus/accepté/entretien), le simple mot « relancé » l'emportait → candidature figée
  // en colonne « relance » du funnel (rang 2, jamais régressée au re-sync via mergeApplications) et
  // exclue du « répondu » d'`applicationStats` (answered = entretien+accepté+refus) → taux de réponse
  // sous-évalué. Reste AVANT le seau `postule` : une relance prime sur un simple « postulé ».
  if (/relanc/.test(x)) return 'relance';
  // NÉGATION de l'action de candidater (« pas encore postulé », « pas postulé », « non envoyée »,
  // « candidature pas encore envoyée ») : la candidature n'a PAS encore été envoyée → à postuler, PAS
  // « postulé ». Sans ce garde, le simple mot « postulé »/« envoyé » du seau `postule` juste en dessous
  // l'emportait → la candidature basculait en « postulé » dans le funnel et gonflait applicationStats
  // (answered/responseRate) à CHAQUE sync du Sheets, alors qu'elle reste à faire. Placé APRÈS les états
  // terminaux/avancés (refus/accepté/entretien/relance) : un « pas encore postulé, finalement refusé »
  // reste un refus. On n'exige QUE les verbes d'action de candidature (postul/envoy) : « candidat » est
  // ambigu (« pas un bon candidat » = refus, pas une candidature à envoyer) et « retenu » est un refus
  // (« pas (été) retenu », déjà capté plus haut). Négation collée au verbe (« pas encore postulé » :
  // court intervalle toléré), l'ordre protège le positif (« postulé, pas de nouvelles » reste postulé).
  if (/\b(?:pas|non|jamais)\b[\s\S]{0,12}(?:postul|envoy)/.test(x)) return 'a_postuler';
  // « prise de contact », « pris contact », « pris en compte », « rendez-vous pris » : le contact EST
  // établi — c'est un dossier envoyé/en cours, pas un « à postuler » (et surtout pas un « accepté »).
  if (/postule|envoye|candidat|attente|en cours|contacte|mail envoye|confirm/.test(x)
    || /prise? de contact|pris contact|pris en compte|rendez-?vous pris|rdv pris/.test(x)) return 'postule';
  return 'a_postuler';
}
// Extrait une date ISO d'un texte (ISO ou JJ/MM/AAAA). '' sinon. Pur.
// Borne mois 1-12 / jour 1-31 ET validité CALENDAIRE : une cellule aberrante (« 13/45/2026 » hors
// bornes, mais aussi « 30/02/2026 » ou « 31/11/2026 » — dates de calendrier inexistantes) ne pollue
// plus la date d'une candidature — elle est ignorée ('') au lieu d'être stockée telle quelle. Sinon
// un 30 février importé serait affiché « postulé le 30/02/2026 » et reparsé ailleurs comme le 2 mars.
// La validité se vérifie par aller-retour sur `Date` (le rollover trahit un jour qui déborde le mois).
// Si le motif ISO trouvé est invalide, on retombe sur le motif JJ/MM/AAAA (une vraie date peut suivre du bruit).
function jobDateFromText(t) {
  const s = String(t || '');
  const pad = (y, mo, d) => {
    const Y = Number(y), M = Number(mo), D = Number(d);
    if (!(M >= 1 && M <= 12 && D >= 1 && D <= 31)) return '';
    const dt = new Date(Y, M - 1, D);
    if (dt.getFullYear() !== Y || dt.getMonth() !== M - 1 || dt.getDate() !== D) return ''; // 30 févr., 31 nov.… → inexistante
    return `${y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`;
  };
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
  // Colonne score : « Score /10 ». On cherche « 10 » isolé (\b10\b) et non un simple includes('10')
  // qui prendrait « Score /100 » (ou « Score 2010 ») pour la colonne /10 → scores hors [0,10] rejetés,
  // et import silencieusement vide dès que minScore > 0.
  const iScore = header.findIndex(h => h.includes('score') && /\b10\b/.test(h));
  const iStatus = find('statut', 'status', 'etat');
  const iRole = find('poste', 'intitule', 'metier');
  const iNotes = find('pourquoi', 'note', 'commentaire', 'contexte');
  // Département entre parenthèses : 2 chiffres (métropole, « (35) ») OU 3 chiffres (outre-mer, « (972) »).
  const deptOf = v => { const m = String(v || '').match(/\((\d{2,3})\)/); return m ? m[1] : ''; };
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
  const monthOk = month >= 1 && month <= 12;
  // Jour borné au max RÉEL du mois (févr. = 29 pour préserver le 29/02, fêté le 1er mars les années
  // non bissextiles) : une date impossible (31/02, 31/04…) issue d'un import/restauration est écartée
  // (day = 0 → filtrée partout), sinon `new Date(year, mois-1, 31)` la ferait déborder en date fantôme
  // dans `upcomingBirthdays` — incohérente avec `birthdaysForDay`, qui ne matche jamais une telle date.
  const maxDay = monthOk ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] : 31;
  return {
    id: Number(x.id) || Date.now(),
    name: String(x.name || '').slice(0, 60),
    day: day >= 1 && day <= maxDay ? day : 0,
    month: monthOk ? month : 0,
    year: (Number.isFinite(year) && year >= 1900 && year <= 2100) ? year : null
  };
}

// Anniversaires tombant un jour donné (clé YYYY-MM-DD) → [{id, name, age|null}].
// L'âge est celui atteint ce jour-là (année de la date − année de naissance).
// Les années non bissextiles, un anniversaire du 29 février est fêté le 1er mars
// (même convention que le rollup de date d'`upcomingBirthdays`).
function birthdaysForDay(birthdays, dateKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!m) return [];
  const year = +m[1], month = +m[2], day = +m[3];
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const feb29OnMar1 = !isLeap && month === 3 && day === 1;
  return (Array.isArray(birthdays) ? birthdays : [])
    .map(normalizeBirthday)
    .filter(b => (b.day === day && b.month === month) || (feb29OnMar1 && b.day === 29 && b.month === 2))
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
    // `date` reflète l'occurrence RÉELLE (le 29 févr. bascule au 1er mars les
    // années non bissextiles via le rollover de `new Date`) → jamais de date fantôme.
    const dateStr = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
    out.push({ id: b.id, name: b.name, date: dateStr, age: b.year ? year - b.year : null, daysUntil });
  });
  out.sort((a, b) => a.daysUntil - b.daysUntil || String(a.name).localeCompare(b.name));
  return max > 0 ? out.slice(0, max) : out;
}

// Libellé d'âge en français avec singulier/pluriel correct : « 1 an », « 2 ans »
// (0 et 1 → « an » ; ≥ 2 → « ans »). Âge inconnu (null/undefined/non fini, ex.
// anniversaire sans année de naissance) → chaîne vide. Pur + testé.
function ageLabel(age) {
  const n = Number(age);
  if (age == null || !Number.isFinite(n)) return '';
  return `${n} an${n > 1 ? 's' : ''}`;
}

// ---- Récurrence native (sans dépendance) : rendez-vous répétés ----
// rule = {freq:'daily'|'weekly'|'monthly'|'yearly', interval:1, weekdays:[0..6]?,
//         startDate:'YYYY-MM-DD', until:'YYYY-MM-DD'?}. weekdays : 0=dim..6=sam.
// Modèle stocké : {id, title, time, durationMin, kind, priority, rule}.
const RECUR_FREQ = ['daily', 'weekly', 'monthly', 'yearly'];
function normalizeRecurring(item) {
  const x = item && typeof item === 'object' ? item : {};
  const r = x.rule && typeof x.rule === 'object' ? x.rule : {};
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
      startDate: isBoundedDateKey(r.startDate) ? r.startDate : '',
      until: isBoundedDateKey(r.until) ? r.until : ''
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
    // Le jour courant PRÉVU mais pas encore fait n'est pas un échec : la journée n'est pas finie. On
    // ne le compte ni comme prévu ni comme raté — même tolérance que `habitStreak` (« on n'entame pas »),
    // sinon une habitude jeune parfaite afficherait 🔥 4 mais 📊 80 % en pleine journée (incohérent).
    if (wds.has(d.getDay()) && !(i === 0 && !done.has(k))) { scheduled++; if (done.has(k)) hit++; }
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
  // Date AAAA-MM-JJ avec bornes réelles (mois 1-12, jour 1-31) via isBoundedDateKey : une date
  // format-valide mais impossible (ex. « 2026-13-99 » venue d'un .ics abîmé via parseIcsDateTime →
  // applyImportedIcs) est neutralisée plutôt que stockée dans une case introuvable.
  return {
    ...x,
    id: Number(x.id) || Date.now(),
    title: String(x.title || 'Bloc'),
    date: isBoundedDateKey(x.date) ? x.date : '',
    time: typeof x.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.time) ? x.time : '',
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
  const y = +Y, mo = +Mo, d = +D;
  // Le motif tolère mois/jour hors bornes (13, 99) et 30 févr. / 31 nov. : on valide la
  // validité CALENDAIRE par aller-retour sur Date (comme jobDateFromText). Une date
  // impossible venue d'un .ics abîmé → null (l'événement est ignoré par parseIcs) plutôt
  // que stockée telle quelle (« 2026-13-99 ») ou silencieusement roulée vers un jour faux.
  const probe = new Date(y, mo - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== mo - 1 || probe.getDate() !== d) return null;
  const pad = n => String(n).padStart(2, '0');
  if (h === undefined) return { date: `${Y}-${Mo}-${D}`, time: '', allDay: true, ms: Date.UTC(y, mo - 1, d) };
  // Heure hors bornes (ex. « 25:60 ») → invalide, même logique défensive.
  if (+h > 23 || +mi > 59 || (s !== undefined && +s > 60)) return null;
  if (z === 'Z') {
    const dt = new Date(Date.UTC(y, mo - 1, d, +h, +mi, +(s || 0)));
    return { date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`, time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`, allDay: false, ms: dt.getTime() };
  }
  return { date: `${Y}-${Mo}-${D}`, time: `${h}:${mi}`, allDay: false, ms: Date.UTC(y, mo - 1, d, +h, +mi, +(s || 0)) };
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
  // COUNT (RFC 5545 : « répéter N fois », exclusif d'UNTIL) — la façon dont Google/Apple
  // encodent une série finie. Le modèle interne n'a pas de compteur d'occurrences : sans
  // conversion, un COUNT est ignoré et la série récurre à l'INFINI. On le traduit en la
  // borne UNTIL équivalente = date de la N-ième occurrence, simulée avec recurrenceMatches
  // (même moteur que le rendu aval → cohérence exacte, y compris jours-de-mois manquants et
  // 29 févr.). Repli sûr : N-ième non atteinte dans une large fenêtre → UNTIL vide, soit le
  // comportement actuel — jamais pire.
  const count = Math.round(Number(parts.COUNT));
  if (!until && Number.isFinite(count) && count >= 1) {
    const sm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDateKey);
    const probe = { freq, interval, weekdays, startDate: startDateKey, until: '' };
    const d = new Date(+sm[1], +sm[2] - 1, +sm[3]); d.setHours(0, 0, 0, 0);
    const pad = n => String(n).padStart(2, '0');
    for (let i = 0, seen = 0; i < 20000; i++) {
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (recurrenceMatches(probe, key)) { seen++; if (seen >= count) { until = key; break; } }
      d.setDate(d.getDate() + 1);
    }
  }
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
// (statut plus loin dans le pipeline `JOB_STATUSES`) — pas seulement depuis « à postuler » : un
// import/sync dont la source est en retard (ex. la feuille Google Sheets pas encore mise à jour)
// ne doit jamais écraser un statut que l'app a fait avancer depuis (postulé, entretien, refusé…).
// Conserve id et createdAt existants. Renvoie { applications, added, updated }. Pur + testé.
function mergeApplications(existing, incoming) {
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const keyOf = a => norm(a.company);
  const rankOf = s => { const i = JOB_STATUSES.indexOf(s); return i < 0 ? 0 : i; };
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
    const nextStatus = rankOf(inc.status) < rankOf(cur.status) ? cur.status : inc.status;
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

// Fusion IDEMPOTENTE de récurrents (ré)importés d'un .ics dans la liste existante — l'équivalent
// de mergePlannedEvents pour state.recurring. Un récurrent existant de même refId est remplacé en
// PRÉSERVANT son id, son historique de complétion (doneLog/skipLog) et son état `paused` ; seuls le
// titre, l'heure, le type, la priorité et la règle (le calendrier source fait foi) sont rafraîchis.
// Sans ça, une simple re-sync d'abonnement (syncCalendarSubs) effaçait les cases cochées, la pause et
// changeait l'id — alors que les ponctuels étaient déjà préservés. Le reste de la liste (récurrents
// manuels ou d'autres abonnements) est intact. Records renvoyés normalisés. Pur + testé.
function mergeRecurring(existing, imported) {
  const list = Array.isArray(existing) ? existing : [];
  const incoming = (Array.isArray(imported) ? imported : []).filter(e => e && typeof e === 'object');
  const previous = new Map(list.filter(r => r && r.refId).map(r => [r.refId, r]));
  const merged = incoming.map(e => {
    const old = e.refId ? previous.get(e.refId) : undefined;
    if (!old) return normalizeRecurring(e);
    const o = normalizeRecurring(old);
    return normalizeRecurring({ ...e, id: o.id, doneLog: o.doneLog, skipLog: o.skipLog, paused: o.paused });
  });
  const refs = new Set(incoming.filter(e => e.refId).map(e => e.refId));
  return list.filter(r => !(r && r.refId && refs.has(r.refId))).concat(merged);
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
  birthdaysForDay(s.birthdays, date).forEach(b => { const al = ageLabel(b.age); items.push({ id: 'bday-' + b.id, time: '', title: `🎂 ${b.name}${al ? ` (${al})` : ''}`, kind: 'birthday', priority: 'normal', allDay: true, completed: false, planId: null, type: 'birthday' }); });
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

// Plus LONGUE série de jours consécutifs jamais tenue dans un ensemble de clés de dates (le RECORD,
// par opposition à `dailyStreak` qui mesure la série EN COURS finissant aujourd'hui). Déduplique et
// ignore les clés invalides. Ancrage à midi (comme wellnessBestStreak) pour rester robuste aux
// changements d'heure. Renvoie 0 si aucune date. Pur + testé.
function bestDailyStreak(dateKeys) {
  const days = [...new Set((Array.isArray(dateKeys) ? dateKeys : []).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(String(k))))].sort();
  if (!days.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round((new Date(days[i] + 'T12:00:00') - new Date(days[i - 1] + 'T12:00:00')) / 86400000);
    if (diff === 1) { cur++; if (cur > best) best = cur; }
    else if (diff > 1) cur = 1;
  }
  return best;
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
// On DÉDUPLIQUE par date (une entrée/jour, dernier gagné — comme `logLifeStep` à l'écriture) : sur un
// journal importé/restauré avec une date en double, `doneDays`/`loggedDays`/`rate` comptaient les
// ENTRÉES (`.length`), pas les JOURS distincts, alors que `streak` (via le `Set` de `dailyStreak`) ne
// compte déjà que des jours distincts — même bandeau, deux comptes contradictoires (cf. #437).
// Renvoie { streak, doneDays, loggedDays, rate, lastDone } ; `lastDone` = {date, text, daysAgo} ou null.
// Pur + testé.
function lifeStepStats(log, todayKey, todayStep) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const byDate = new Map();
  (Array.isArray(log) ? log : []).forEach(e => {
    if (e && isKey(e.date) && String(e.text || '').trim() && e.date !== todayKey) byDate.set(e.date, e);
  });
  const entries = [...byDate.values()];
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
    : (lastPast ? { date: lastPast.date, text: String(lastPast.text || '').trim().slice(0, 140), daysAgo: daysUntil(lastPast.date, todayKey) } : null);
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
// On DÉDUPLIQUE par date (une entrée/jour, dernier gagné — comme `logQuestDay` à l'écriture) : sur un
// journal importé/restauré avec une date en double, `perfectDays`/`loggedDays`/`rate` comptaient les
// ENTRÉES (`.length`), pas les JOURS distincts, alors que `streak` (via le `Set` de `dailyStreak`) ne
// compte déjà que des jours distincts — même panneau, deux comptes contradictoires (cf. #436).
// Renvoie { streak, perfectDays, loggedDays, rate }. Pur + testé.
function questPerfectStreak(log, todayKey, todayDone, todayTotal) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const byDate = new Map();
  (Array.isArray(log) ? log : []).forEach(e => {
    if (e && isKey(e.date) && Number(e.total) > 0 && e.date !== todayKey) byDate.set(e.date, e);
  });
  const perfect = [...byDate.values()].filter(e => Number(e.done) >= Number(e.total)).map(e => e.date);
  const tTotal = Math.max(0, Math.round(Number(todayTotal) || 0));
  const tDone = Math.max(0, Math.round(Number(todayDone) || 0));
  const todayCounts = tTotal > 0 && isKey(todayKey);
  if (todayCounts && tDone >= tTotal) perfect.push(todayKey);
  const loggedDays = byDate.size + (todayCounts ? 1 : 0);
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
    const idx = Math.min(rungs.length - 1, Math.max(0, Math.floor((i + 0.5) / count * rungs.length)));
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
// Échéances clés à venir dans l'horizon (jours) : examen(s) + course, triées par proximité. Pur + testé.
// `examGoals` accepte le modèle multi-épreuves examGoals[] (P6.2) — chaque épreuve à venir devient une
// puce — mais tolère encore l'ancien objet unique { title, date } (enveloppé en liste). Pur + testé.
function upcomingKeyDates(examGoals, raceGoal, todayKey, horizon) {
  const h = Math.max(1, Math.min(730, Math.round(Number(horizon) || 60)));
  const out = [];
  const add = (kind, label, date) => { const d = daysUntil(todayKey, date); if (d != null && d >= 0 && d <= h) out.push({ kind, label, daysLeft: d, date }); };
  const exams = Array.isArray(examGoals) ? examGoals : (examGoals ? [examGoals] : []);
  exams.forEach(g => { if (g && g.date) add('exam', String(g.title || 'Examen').slice(0, 40), g.date); });
  if (raceGoal && raceGoal.date) add('race', 'Course objectif', raceGoal.date);
  return out.sort((a, b) => a.daysLeft - b.daysLeft || a.label.localeCompare(b.label));
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

// Marqueurs d'échéances clés tombant un jour donné (examen(s), course objectif). `examGoals` accepte
// le modèle multi-épreuves examGoals[] (P6.2) — un marqueur par épreuve tombant ce jour — mais tolère
// encore l'ancien objet unique { title, date } (enveloppé en liste). Pur + testé.
function keyDateMarkers(examGoals, raceGoal, dateKey) {
  const out = [];
  const isKey = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''));
  const exams = Array.isArray(examGoals) ? examGoals : (examGoals ? [examGoals] : []);
  if (isKey) exams.forEach(g => { if (g && g.date === dateKey) out.push({ kind: 'exam', label: String(g.title || 'Examen').slice(0, 40) }); });
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
// Une épreuve d'examen du modèle multi-épreuves (P6.1) : { id, subject, title, date }. `subject` est
// en TEXTE LIBRE (aucune matière BTS inventée : studyBySubject déduit déjà la matière du titre). id
// stable dérivé de la date (ou d'un slug du titre) quand il manque, pour survivre à la migration. Pur + testé.
function normalizeExamGoal(item) {
  const g = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
  const title = typeof g.title === 'string' ? g.title.trim().slice(0, 80) : '';
  const subject = typeof g.subject === 'string' ? g.subject.trim().slice(0, 60) : '';
  const date = (typeof g.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g.date)) ? g.date : '';
  const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  const id = (typeof g.id === 'string' && g.id.trim()) ? g.id.trim()
    : date ? 'exam-' + date
    : slug ? 'exam-' + slug
    : '';
  return { id, subject, title, date };
}
// Migration rétro-compatible vers le modèle multi-épreuves examGoals[] (P6.1). Prend l'état complet et
// renvoie la liste normalisée : si `examGoals` existe déjà on la normalise ; sinon on retombe sur l'ancien
// `examGoal` unique, qui devient le PREMIER (et seul) élément — sans perte. L'ancien `examGoal` reste lu
// par ailleurs pour compat (les consommateurs sont portés en P6.2). Entrées vides / dates invalides / non
// objets sont écartées ; dédoublonnage par id (ou date|titre). Un état neuf donne []. Pur + testé.
function normalizeExamGoals(input) {
  const state = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const source = Array.isArray(state.examGoals) ? state.examGoals : [];
  let out = source.map(normalizeExamGoal).filter(g => g.date || g.title);
  if (!out.length) {
    const legacy = normalizeExamGoal(state.examGoal);
    if (legacy.date || legacy.title) out = [legacy];
  }
  const seen = new Set();
  return out.filter(g => { const k = g.id || (g.date + '|' + g.title); if (seen.has(k)) return false; seen.add(k); return true; });
}
// Sélecteur « épreuve la plus proche » (P6.2) : parmi une liste examGoals[] (objet unique toléré),
// renvoie l'épreuve qui compte AUJOURD'HUI — l'épreuve À VENIR la plus proche ; s'il n'y en a aucune à
// venir, la plus récemment passée (pour que le compte à rebours puisse dire « examen passé »). Départage
// stable par titre à date égale. null si aucune épreuve datée ou todayKey invalide. Pur + testé.
function nearestExam(examGoals, todayKey) {
  const list = Array.isArray(examGoals) ? examGoals : (examGoals ? [examGoals] : []);
  const withDelta = list
    .map(g => (g && typeof g === 'object' && !Array.isArray(g)) ? g : {})
    .filter(g => /^\d{4}-\d{2}-\d{2}$/.test(String(g.date || '')))
    .map(g => ({ g, d: daysUntil(todayKey, g.date) }))
    .filter(x => x.d != null);
  if (!withDelta.length) return null;
  const upcoming = withDelta.filter(x => x.d >= 0);
  const pool = upcoming.length ? upcoming : withDelta;
  // à venir : la plus proche (plus petit d) ; sinon passé : la plus récente (plus grand d, i.e. -1 avant -9)
  const soonestFirst = upcoming.length;
  pool.sort((a, b) => {
    if (a.d !== b.d) return soonestFirst ? a.d - b.d : b.d - a.d;
    return String(a.g.title || '').localeCompare(String(b.g.title || ''));
  });
  return pool[0].g;
}
// Tri d'affichage des épreuves (P6.3) : par date croissante (les sans-date à la fin), départage stable
// par titre. Ne modifie pas l'entrée. Donne à la liste multi-épreuves un ordre déterministe. Pur + testé.
function sortExamGoals(list) {
  return (Array.isArray(list) ? list : []).slice().sort((a, b) => {
    const ad = (a && a.date) ? a.date : '9999-99-99', bd = (b && b.date) ? b.date : '9999-99-99';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return String((a && a.title) || '').localeCompare(String((b && b.title) || ''));
  });
}
// Ajoute ou met à jour une épreuve dans examGoals[] (P6.3 — UI multi-épreuves ajouter/lister/supprimer).
// Clé = id (dérivé de la date). Si une épreuve de même id existe déjà, elle est REMPLACÉE (le nouveau
// titre gagne : re-générer un planning pour la même date corrige son libellé) ; sinon elle est ajoutée.
// Une entrée vide (ni date ni titre) laisse la liste inchangée. Renvoie la liste normalisée, triée par
// date croissante. C'est ce qui rend l'état multi-épreuves ATTEIGNABLE (le formulaire n'écrase plus). Pur + testé.
function upsertExamGoal(list, goal) {
  const g = normalizeExamGoal(goal);
  const base = normalizeExamGoals({ examGoals: list });
  const next = (g.date || g.title) ? base.filter(x => x.id !== g.id).concat([g]) : base;
  return sortExamGoals(next);
}
// Retire l'épreuve d'id donné de examGoals[] (P6.3, bouton supprimer). Renvoie la liste normalisée
// triée ; un id inconnu laisse la liste inchangée (moins l'éventuel nettoyage de normalisation). Pur + testé.
function removeExamGoal(list, id) {
  return sortExamGoals(normalizeExamGoals({ examGoals: list }).filter(x => x.id !== String(id)));
}
// Accepte soit une épreuve unique { title, date }, soit une liste examGoals[] (résolue via nearestExam,
// « l'épreuve la plus proche ») — P6.2. Renvoie { daysLeft, weeksLeft, past, title, date } ou null.
function examCountdown(examGoal, todayKey) {
  const resolved = Array.isArray(examGoal) ? nearestExam(examGoal, todayKey) : examGoal;
  const g = resolved && typeof resolved === 'object' ? resolved : {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(g.date || ''))) return null;
  const d = daysUntil(todayKey, g.date);
  if (d == null) return null;
  return { daysLeft: d, weeksLeft: Math.round(d / 7), past: d < 0, title: String(g.title || 'Examen').slice(0, 60), date: g.date };
}
// Message de rappel d'examen si aujourd'hui est un palier (J-30/14/7/3/1/0), sinon null. Accepte une
// épreuve unique ou la liste examGoals[] (l'épreuve la plus proche est retenue via examCountdown). Pur + testé.
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
// total, status } ('done'|'ahead'|'onTrack'|'tight') ou null si pas d'examen à venir ou aucune révision.
// `examGoal` accepte une épreuve unique ou la liste examGoals[] (l'épreuve la plus proche, via examCountdown). Pur + testé.
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
  let weeksLeft = weeksBetween(today, goal.date);
  const daysLeft = daysUntil(today, goal.date);
  // Course passée de 1 à 3 jours : Math.round ramène l'écart (-0,14 à -0,43 sem) à 0, ce qui la
  // ferait passer pour « à venir » (phase Affûtage « arrive frais ») alors que daysLeft est déjà
  // négatif. On s'appuie sur le signe fiable de daysLeft pour la marquer passée. Cohérent aussi
  // avec app.js, qui teste `weeksLeft >= 0` pour décider qu'une course est encore devant.
  if (weeksLeft === 0 && daysLeft != null && daysLeft < 0) weeksLeft = -1;
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
  if (/poussée|tirage|\bhaut\b|traction|pompes|\bpress\b|militaire/.test(t))
    return { label: 'Échauffement haut du corps · ~5 min', moves: ['Cercles de bras + rotations d’épaules · 30 s', 'Étirements dynamiques poitrine/dos · 30 s', 'Suspension passive à la barre · 20 s', '1 série de pompes faciles + tractions négatives lentes'] };
  if (/jambe|chaîne|squat|fessier|fente|mollet|cuisse|bas du corps/.test(t))
    return { label: 'Échauffement bas du corps · ~5 min', moves: ['Mobilité hanches (balanciers) · 30 s/jambe', 'Mobilité chevilles (genou au mur) · 30 s/côté', '15 squats à vide en contrôle', 'Fentes marchées lentes · 6/jambe'] };
  if (/trail|côte|course|puissance|longue|swing|explos/.test(t))
    return { label: 'Échauffement trail/course · ~5 min', moves: ['Marche rapide ou trot très facile · 2 min', 'Montées de genoux + talons-fesses · 30 s chacun', 'Mobilité chevilles + fentes lentes · 30 s', 'Gainage planche léger · 20 s'] };
  return { label: 'Échauffement général · ~5 min', moves: ['Mobilité cou/épaules/hanches · 1 min', 'Rotations chevilles et poignets · 30 s', '10 squats à vide + 10 rotations du tronc', 'Montée progressive du rythme cardiaque · 1 min'] };
}

// Retour au calme spécifique selon le type de séance : mobilité douce + étirements
// tenus (~5 min) pour récupérer et entretenir la souplesse. Pas d'XP.
function cooldownFor(title) {
  const t = String(title || '').toLowerCase();
  if (/poussée|tirage|\bhaut\b|traction|pompes|\bpress\b|militaire/.test(t))
    return { label: 'Retour au calme haut du corps · ~5 min', moves: ['Étirement pectoraux au cadre de porte · 30 s/côté', 'Étirement dorsaux/lats, bras tendu · 30 s/côté', 'Étirement triceps derrière la tête · 30 s/côté', 'Rotations lentes du cou + respirations profondes · 1 min'] };
  if (/jambe|chaîne|squat|fessier|fente|mollet|cuisse|bas du corps/.test(t))
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
  let t = Number(tempC);
  // Température absente ou non chiffrable (donnée corrompue, météo indisponible) → on se cale sur
  // un temps tempéré (18 °C) plutôt que de tomber par défaut sur « Frais », le plan le MOINS
  // hydratant : sans info, le repli sûr est un apport neutre, pas de sous-conseiller l'hydratation.
  if (!Number.isFinite(t)) t = 18;
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
  // Sommeil moyen : seules les nuits réellement chiffrées comptent (comme monthlyRecap /
  // weeklySleepStats). Un check-in récup sans heure de sommeil (fatigue/coucher seuls → sleep:0)
  // ne doit pas être moyenné comme une nuit de 0 h — sinon fausse moyenne + faux nudge « sommeil bas ».
  // UNE valeur par date (dernier check-in), comme weeklySleepStats/sleepDebtHours : deux saisies sur
  // la MÊME nuit (import/restauration/double check-in) ne doivent pas peser double dans la moyenne.
  const sleepByDate = {};
  (Array.isArray(s.recovery) ? s.recovery : []).forEach(r => { if (r && inWeek(r.date) && (Number(r.sleep) || 0) > 0) sleepByDate[r.date] = Number(r.sleep) || 0; });
  const sleepNights = Object.values(sleepByDate);
  const sleepAvg = sleepNights.length ? sleepNights.reduce((a, v) => a + v, 0) / sleepNights.length : 0;
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
  if (n(s.studyPlanned)) lines.push(`📚 ${n(s.studyDone)}/${n(s.studyPlanned)} révision${n(s.studyPlanned) > 1 ? 's' : ''} validée${n(s.studyPlanned) > 1 ? 's' : ''}`);
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
  // Sommeil moyen : UNE valeur par date (dernier check-in), comme weeklySummary / weeklySleepStats /
  // sleepDebtHours — deux saisies sur la même nuit (import/restauration) ne pèsent pas double.
  const sleepByDate = {};
  (Array.isArray(s.recovery) ? s.recovery : []).forEach(r => { if (r && inMonth(r.date) && (Number(r.sleep) || 0) > 0) sleepByDate[r.date] = Number(r.sleep) || 0; });
  const sleepNights = Object.values(sleepByDate);
  const sleepAvg = sleepNights.length ? Math.round(sleepNights.reduce((a, v) => a + v, 0) / sleepNights.length * 10) / 10 : 0;
  if (!sessions && !focusMin && !wellness && !studyDoneList.length && !sleepNights.length) return null;
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
  if (n(r.studyPlanned)) lines.push(`📚 ${n(r.studyDone)}/${n(r.studyPlanned)} révision${n(r.studyPlanned) > 1 ? 's' : ''} validée${n(r.studyPlanned) > 1 ? 's' : ''}`);
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
    if (cur.sessions >= goalSessions) out.push({ emoji: '✅', tone: 'good', text: `${cur.sessions}/${goalSessions} séance${goalSessions > 1 ? 's' : ''} — objectif atteint, bravo !` });
    else { const left = goalSessions - cur.sessions; out.push({ emoji: '🎯', tone: 'warn', text: `${cur.sessions}/${goalSessions} séance${goalSessions > 1 ? 's' : ''} — encore ${left} séance${left > 1 ? 's' : ''} pour ton objectif hebdo.` }); }
  } else if (cur.sessions > 0) out.push({ emoji: '🏋️', tone: 'info', text: `${cur.sessions} séance${cur.sessions > 1 ? 's' : ''} cette semaine.` });
  const goalKm = Number(goals.distance) || 0;
  // Accord de « couru(s) » sur la distance RÉELLEMENT parcourue (cur.km). Règle FR : pluriel ssi
  // valeur ≥ 2 — le garde `> 1` employé pour les entiers (séances, jours) ne convient PAS ici, car
  // cur.km est arrondi au dixième (weeklySummary) et peut valoir 1,5 → « 1,5 km couru » au singulier.
  if (goalKm > 0 && cur.km > 0) out.push(cur.km >= goalKm
    ? { emoji: '🏃', tone: 'good', text: `${cur.km} km couru${cur.km >= 2 ? 's' : ''} — objectif ${goalKm} km atteint.` }
    : { emoji: '🏃', tone: 'info', text: `${cur.km}/${goalKm} km couru${cur.km >= 2 ? 's' : ''} cette semaine.` });
  const acwr = acuteChronicRatio(s.workouts, todayKey || mondayKey);
  const loadSpiking = !!(acwr && acwr.zone === 'high');
  if (prev && (prev.minutes > 0 || cur.minutes > 0)) {
    const d = cur.minutes - prev.minutes;
    // Ne pas FÉLICITER la montée en volume quand la charge est en pic (ACWR haut) : l'insight 🟥
    // ci-dessous ordonne d'ALLÉGER pour éviter la blessure — se réjouir du +volume le même jour se
    // contredit et pousse pile vers le risque qu'on signale. Le constat de BAISSE (📉) n'entre pas
    // en conflit avec « allège », on le garde.
    if (d >= 15 && !loadSpiking) out.push({ emoji: '📈', tone: 'good', text: `+${d} min vs semaine dernière — tu montes en volume.` });
    else if (d <= -30) out.push({ emoji: '📉', tone: 'warn', text: `${d} min vs semaine dernière — volume en baisse, semaine plus légère ?` });
  }
  if (loadSpiking) out.push({ emoji: '🟥', tone: 'warn', text: `Charge en pic (ACWR ${acwr.ratio}) : prévois une semaine plus légère pour éviter la blessure.` });
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
      const isPush = zones.includes('chest') || zones.includes('shoulders');
      const isPull = zones.includes('back');
      // Un exercice à la fois « poussée » (pecs/épaules) ET « tirage » (dos) — p.ex. suspension
      // barre ou marche fermier (back+shoulders) — ne compte ses séries qu'UNE fois, du côté de sa
      // zone PRINCIPALE (première taguée, cf. EXERCISE_ZONES). Sinon le même effort gonflait les
      // deux plateaux et une isométrie dos/épaules ressortait « équilibrée » (ratio 1) à tort.
      if (isPush && isPull) { if (zones[0] === 'back') pull += sets; else push += sets; }
      else if (isPush) push += sets;
      else if (isPull) pull += sets;
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
  { v: '2.0.206', emoji: '🏃', text: 'Petit accord de français dans ton Bilan hebdo intelligent : les semaines où tu as couru moins de 2 km, l’app écrivait « 1 km courus » ou « 1,5 km courus » au pluriel. Elle accorde désormais au singulier (« 1 km couru — objectif atteint », « 1,5 km couru »), et garde le pluriel dès 2 km. Rien d’autre ne change.' },
  { v: '2.0.205', emoji: '⏱️', text: 'La suggestion de pause longue du minuteur de focus affiche le bon numéro de bloc. Toutes les quatre sessions de concentration, l’app te propose une vraie coupure — mais son message était figé sur « Quatrième bloc d’affilée », y compris à ta 8ᵉ ou 12ᵉ session de la journée. Désormais il annonce le vrai compte (« 8ᵉ bloc d’affilée — accorde-toi une vraie coupure : marche, mange, éloigne-toi de l’écran »). La pause courte et sa durée conseillée ne changent pas.' },
  { v: '2.0.204', emoji: '🧠', text: 'Ton coach « Le focus du moment » ne te pousse plus à « caler un vrai bloc de focus » un jour où, deux lignes plus haut, il vient de te dire de te reposer. Quand ta forme mentale est à plat le matin (readiness sous 50), il pose à juste titre un frein : « un cerveau fatigué ne produit pas un vrai bloc profond — un focus court et facile aujourd’hui, soigne ta récup » (ou, quand ton objectif de la semaine a de la marge, « un focus léger, ou même une vraie pause, suffit »). Mais l’action, elle, continuait de te lancer « Reprends ton chantier phare, enchaîne un bloc de 45 min » et « Créneau libre à telle heure — cale ton bloc là », et la relance de reprise ajoutait « repasse à un vrai bloc, pas juste 10 min » : trois invitations à pousser qui contredisaient de front le « repose-toi » d’à côté. Désormais, ces jours de tête à plat, ces poussées s’effacent — l’action retombe sur un bloc COURT (« lance une session de 25 min »), cohérent avec le frein — exactement comme le coach le fait déjà côté séance de sport. Les jours où ta forme n’est pas à plat, le chantier phare, le créneau et la vraie reprise reviennent normalement. Rien d’ajouté : trois contradictions de moins.' },
  { v: '2.0.203', emoji: '🩹', text: 'Ton coach « Le focus du moment » ne te propose plus, le même jour, de « t’alléger » et de « charger un groupe à fond ». Quand ta forme est correcte le matin mais GLISSE sur tes derniers check-ins (fatigue qui s’accumule), ton coach bascule à juste titre en frein : « séance allégée aujourd’hui, soigne ta récup avant de taper dans le rouge ». Mais il ajoutait ensuite, sur la même carte, « Créneau libre à telle heure — cale ta séance là » et surtout « Cible en priorité les jambes, ton groupe le plus reposé, pour équilibrer ta semaine » — deux invitations à pousser qui contredisaient de front le « lève le pied » de la ligne d’avant. Désormais, les jours où ta forme glisse, ces deux notes s’effacent (exactement comme elles s’effaçaient déjà les jours de pic de charge) : le message reste cohérent d’un bout à l’autre. Les jours où ta forme ne glisse pas, le créneau et le groupe à cibler reviennent normalement. Rien d’ajouté : deux contradictions de moins.' },
  { v: '2.0.202', emoji: '🏁', text: 'Ton objectif de course ne te conseille plus de « t’affûter pour arriver frais » une fois la course déjà passée. Les 1 à 3 jours suivant ta course, la carte d’objectif et ton coach du jour continuaient d’afficher la phase « Affûtage » (réduis le volume, arrive frais) et « Cap : dans 0 sem. » — alors que la course avait déjà eu lieu la veille ou l’avant-veille. Un arrondi ramenait ce délai négatif à zéro, faisant passer une course passée pour une course imminente. Désormais, dès le lendemain, la carte affiche « Cette date est passée — mets à jour ton objectif » et le rappel de cap disparaît, comme c’était déjà le cas à partir de 4 jours. Rien d’ajouté : une incohérence de calendrier corrigée.' },
  { v: '2.0.201', emoji: '🥗', text: 'Ton coach « Le focus du moment » ne te demande plus « encore un jour actif aujourd’hui » côté nutrition un jour où tu as DÉJÀ noté tes apports. Quand ton suivi nutrition monte en régime, il salue l’élan (« 4 jours actifs cette semaine, en hausse. Garde le rythme. ») et invitait à « encore un jour actif aujourd’hui pour ancrer l’habitude » — même les jours où tu venais justement de saisir tes protéines, ton eau ou un fruit. Il te redemandait un geste déjà fait. Désormais, ces jours-là, il le CRÉDITE : « Déjà noté aujourd’hui ✅ — l’habitude est ancrée. » Les jours où tu n’as encore rien saisi, l’invitation à t’y mettre reste inchangée. (Le sommeil, lui, garde son conseil de coucher du soir, qui porte sur ce qui reste à venir.) Rien d’ajouté : un ordre déjà exécuté en moins.' },
  { v: '2.0.200', emoji: '🩹', text: 'Ton coach « Le focus du moment » ne te dit plus « garde le rythme » un jour de pic de charge où ta séance est DÉJÀ faite. La version précédente effaçait bien cette invitation à continuer quand ta charge d’entraînement était en pic (ACWR élevé) — mais seulement les jours où il te restait une séance à caler. Or un jour de pic est souvent un jour où tu viens justement de t’entraîner : dans ce cas, « Garde le rythme » restait affiché pendant que ton bilan de la semaine, lui, te disait « prévois une semaine plus légère pour éviter la blessure ». Les deux panneaux se contredisaient. Désormais, dès que ta charge est en pic, l’invitation à continuer s’efface — séance faite ou non — et les deux panneaux disent la même chose. Le constat « en hausse » reste, et une vraie montée SAINE garde son « Garde le rythme ». Rien d’ajouté : une contradiction de plus en moins.' },
  { v: '2.0.199', emoji: '♿', text: 'Accessibilité : six champs de saisie qui ne portaient qu’un texte d’exemple (« indice ») ont maintenant un vrai nom lu par les lecteurs d’écran — le prénom d’un anniversaire, le nom et le lien d’un calendrier synchronisé, l’adresse de départ des trajets, le poids du jour et l’envie du jour en cuisine. Un texte d’exemple disparaît dès qu’on tape et n’est pas un nom fiable pour qui navigue à la voix ou au clavier ; ces champs rejoignent ceux de recherche et du tableau de bord déjà corrigés. Rien ne change à l’écran.' },
  { v: '2.0.198', emoji: '🩹', text: 'Ton coach « Le focus du moment » ne te dit plus « garde le rythme » les autres jours où il te demande de lever le pied. La version précédente désamorçait déjà cette contradiction quand ta forme du jour était au plancher (readiness sous 50) ; mais son conseil bascule aussi en frein dans deux autres cas — quand ta forme, correcte le matin, GLISSE régulièrement sur tes derniers check-ins (fatigue qui s’installe → « séance allégée, soigne ta récup ») et quand ta charge d’entraînement est en PIC (ACWR élevé → « allège aujourd’hui, -30 % de volume »). Dans ces deux cas, « Garde le rythme » poussait pendant que le conseil freinait. Désormais l’invitation à continuer s’efface aussi ces jours-là ; le constat « en hausse » reste. Une vraie montée sans frein garde son « Garde le rythme ». Rien d’ajouté : une contradiction de plus en moins.' },
  { v: '2.0.197', emoji: '🏋️', text: 'Ton bilan de la semaine ne te félicite plus de « monter en volume » le jour même où il te dit d’alléger. Quand ta charge d’entraînement bondit d’un coup (ACWR en pic — le signal classique de risque de blessure après une grosse semaine), le bilan affiche « prévois une semaine plus légère pour éviter la blessure ». Or il pouvait, juste à côté, saluer « +X min vs semaine dernière — tu montes en volume » : deux messages qui se contredisaient et poussaient pile vers le risque signalé. Désormais, ces jours de pic, la félicitation de montée de volume s’efface — l’avertissement reste seul et cohérent. Une vraie montée SAINE (charge maîtrisée), elle, continue d’être célébrée. Rien d’ajouté : une contradiction de moins.' },
  { v: '2.0.196', emoji: '🩹', text: 'Ton coach « Le focus du moment » ne te dit plus « garde le rythme » un jour où il te demande de te reposer. Quand ton entraînement monte en régime, il salue l’élan (« 4 jours actifs cette semaine, en hausse. Garde le rythme. ») ; mais les jours où ta forme du jour est au plancher (readiness sous 50), son conseil bascule en « récupération prioritaire : vise mobilité ou marche plutôt qu’une grosse séance aujourd’hui ». Les deux côte à côte — « continue sur ta lancée » ET « lève le pied » — le faisaient parler des deux coins de la bouche. Désormais, ces jours-là, il retire l’invitation à continuer et garde le constat « en hausse » : le compliment reste, l’injonction qui contredit le repos s’efface. Rien d’ajouté : une contradiction de plus en moins.' },
  { v: '2.0.195', emoji: '💼', text: 'Ton suivi Alternance ne compte plus comme « postulé » une candidature que tu n’as PAS encore envoyée. Quand une cellule de statut disait « pas encore postulé », « pas postulé » ou « candidature non envoyée », le suivi ne voyait que le mot « postulé »/« envoyé » et rangeait la candidature dans la colonne « Postulé » de ton entonnoir — à chaque synchronisation de ta feuille Google Sheets — alors qu’elle restait à faire. Ton nombre de candidatures envoyées (et donc ton taux de réponse) était gonflé à tort. Désormais une négation de l’action de candidater (« pas encore postulé », « non envoyée ») est bien classée « à postuler ». Un vrai « postulé » (même suivi de « pas de nouvelles ») reste « postulé », et « pas retenu » reste un refus. Rien d’ajouté : un entonnoir plus juste.' },
  { v: '2.0.194', emoji: '♿', text: 'Tes champs de recherche s’annoncent enfin correctement aux lecteurs d’écran. « Chercher un aliment » (Nutrition), la recherche de l’agenda et la recherche de la bibliothèque d’exercices n’avaient qu’un texte d’exemple à l’intérieur du champ (un « placeholder ») — or celui-ci disparaît dès qu’on tape et n’est pas un nom fiable pour l’accessibilité. Ils portent désormais un vrai nom accessible, comme la recherche de tes candidatures Alternance le faisait déjà. Rien de visible ne change à l’écran : un confort d’usage au clavier et au lecteur d’écran en plus.' },
  { v: '2.0.193', emoji: '🩹', text: 'Ton coach « Le focus du moment » n’affiche plus un chiffre FAUX. Quand sa carte était assez remplie pour être résumée, elle réordonnait ses phrases par ordre d’importance — et, à cette occasion, un nombre à décimale écrit avec un point (comme la moyenne de sommeil « moy. 5.3 h ») perdait son chiffre de tête : « moy. 5.3 h » devenait « moy. 3 h », et une phrase comme « Tu dors 5.3 h en moyenne » se réduisait à « 3 h en moyenne ». Le découpage en phrases prenait le point de la décimale pour une fin de phrase et jetait le morceau au passage. Corrigé : un point collé à un chiffre n’est plus une fin de phrase, et plus aucun caractère n’est perdu — le coach affiche le vrai nombre. Rien d’ajouté : une donnée enfin exacte.' },
  { v: '2.0.192', emoji: '💼', text: 'Ton suivi Alternance classe mieux les candidatures « relancées puis conclues ». Quand une cellule de statut disait à la fois que tu avais relancé ET que c’était fini — « relancé, sans suite », « relancé puis refusé », « relancé, entretien décroché » — le suivi ne retenait que la relance et laissait la candidature bloquée dans la colonne « Relancé », même une fois refusée ou décrochée. Elle échappait alors à ton taux de réponse (un refus compte comme une réponse, pas une relance). Désormais l’état FINAL l’emporte, comme c’était déjà le cas pour « refusé après entretien » : « relancé puis refusé » = refusé, « relancé, entretien décroché » = entretien, « j’ai été pris » = accepté. Une simple relance en cours reste bien « Relancé ». Rien d’ajouté : un classement d’entonnoir plus juste.' },
  { v: '2.0.191', emoji: '🏋️', text: 'Ton échauffement et ton retour au calme collent mieux au type de séance. Le tri se faisait sur des mots-clés du titre trop courts, qui se déclenchaient à tort : une séance « cardio haute intensité » héritait d’un échauffement HAUT DU CORPS (à cause de « hau(t)e »), et une séance de jambes intitulée « presse à cuisses / à jambes » aussi (à cause de « pre(ss)e »). Corrigé : « haute intensité » reçoit désormais un échauffement général, la « presse à cuisses/jambes » un échauffement BAS DU CORPS. Et ta séance générée « Bas du corps » obtient enfin son échauffement bas-du-corps dédié (mobilité hanches/chevilles, squats), au lieu d’un général. L’anglais « floor/bench press » reste bien classé haut du corps. Rien d’ajouté : des mots-clés simplement mieux ciblés.' },
  { v: '2.0.190', emoji: '🌙', text: 'Ton coach « Le focus du moment » ne te dit plus « fais un jour actif de plus » un jour où c’est ton SOMMEIL (ou ton focus, ta nutrition) qu’il met en avant. Quand il te FÉLICITE de bien suivre ses conseils (« Tu as tenu 3/3 de mes caps cette semaine »), il remplaçait ton conseil du jour par « Un jour actif de plus aujourd’hui… » — une formule pensée pour le sport, qui n’a aucun sens pour une nuit (une nuit ne se « fait » pas dans la journée) et qui écrasait un conseil bien plus utile qu’il venait de te donner, comme « Vise un coucher 30 min plus tôt ce soir ». Désormais ce message d’encouragement reste réservé au sport : sur un pilier sommeil / focus / nutrition, le coach GARDE son conseil concret du jour et se contente de créditer ton élan dans le texte. Rien d’ajouté : une incohérence de plus en moins.' },
  { v: '2.0.189', emoji: '🔊', text: 'Deux générateurs d’entraînement s’annoncent enfin aux lecteurs d’écran. Quand tu génères une « séance express » (page Athlète → bibliothèque d’exercices) ou « ma semaine d’entraînement » (coach intelligent), le circuit s’affichait bien à l’écran mais restait totalement muet pour VoiceOver / TalkBack : la personne qui navigue à la voix cliquait « Générer » et n’entendait rien, sans savoir si ça avait marché. Les deux zones de résultat annoncent désormais leur contenu dès qu’il apparaît (comme le faisaient déjà « Mon programme selon mon objectif » et le plan de course). Purement une amélioration d’accessibilité — rien ne change visuellement.' },
  { v: '2.0.188', emoji: '🎓', text: 'Tu peux enfin suivre PLUSIEURS épreuves de ton BTS à la fois. Jusqu’ici, générer un planning de révision pour une nouvelle date d’examen effaçait l’épreuve précédente : impossible de garder l’œil sur Droit et Compta à deux dates différentes. Désormais chaque planning que tu génères AJOUTE son épreuve à ta liste au lieu de remplacer l’ancienne (re-générer pour une même date corrige juste son libellé). Une nouvelle liste « 🎓 Mes épreuves » apparaît sous le planning de révision : chaque épreuve avec son compte à rebours (J-… / « passé »), triées par date, et un bouton × pour en retirer une quand elle n’est plus d’actualité. Tes compteurs, marqueurs de calendrier et le coach lisaient déjà la liste multi-épreuves (ils prennent « l’épreuve la plus proche ») — il ne manquait que le moyen de la remplir. C’est fait.' },
  { v: '2.0.187', emoji: '⚖️', text: 'Ton coach « Le focus du moment » ne se contredit plus sur tes calories quand ton corps recompose. Quand ta balance stagne sur un objectif de perte alors que ton tour de taille fond (une vraie recomposition : tu perds du gras en gardant le muscle), il te recadrait bien — « tiens tes calories et tes protéines encore une semaine avant de couper » — mais quelques mots plus tôt, dans la même phrase, il venait de te dire « baisse un peu tes calories » (voire, profil complet, un chiffre précis : « vise ~1875 kcal/j, environ 125 de moins »). Deux ordres opposés collés l’un à l’autre : couper MAINTENANT, puis surtout ne pas couper. Il ne le fait plus : dès qu’il voit la recomposition en cours, il n’émet AUCUN ordre de coupe (ni le conseil vague, ni la cible chiffrée) et laisse le recadrage porter seul le conseil — « Mais la balance ne descend plus. Avant de resserrer pour autant : ton tour de taille a fondu de 3 cm… tiens tes calories, le résultat est déjà en cours. » Rien d’ajouté : c’est une contradiction — la plus risquée pour ta nutrition — en moins.' },
  { v: '2.0.186', emoji: '🩹', text: 'Ton coach « Le focus du moment » ne te dit plus « fais un jour actif de plus » un jour où ta forme est au plancher. Quand il te FÉLICITE de bien suivre ses conseils (« Tu as tenu 3/3 de mes caps cette semaine »), il remplaçait ton conseil du jour par « Un jour actif de plus aujourd’hui : tu prouves que la régularité te ressemble. » — même les jours où, quelques lignes plus haut, il venait de te recommander du repos : readiness à 15/100, séance allégée, récupération prioritaire. Résultat : « repose-toi » et « fais un jour actif de plus » côte à côte, le coach parlant des deux coins de la bouche. Il ne le fait plus : les jours où ta forme demande de lever le pied (readiness basse, forme qui glisse ou charge en pic), il GARDE son conseil de récup et se contente de créditer ton élan dans le texte. Les autres jours, le message d’encouragement reste. Rien d’ajouté : c’est une contradiction en moins.' },
  { v: '2.0.185', emoji: '🧵', text: 'Ton coach « Le focus du moment » se lit mieux quand tu déplies « plus de contexte » : ses conseils à deux phrases ne se déchirent plus. Plusieurs de ses notes fonctionnent en couple — un constat (« … tu dors 5,5 h en moyenne ces derniers jours, sous les 7 h — dormir court plafonne les gains de chaque séance. ») suivi de sa morale (« Bien dormir démultiplie l’effort que tu fournis déjà. »). Le coach hiérarchise ses notes par urgence pour faire remonter l’essentiel ; mais ce reclassement travaillait phrase par phrase, si bien que la morale, jugée « neutre », se retrouvait éjectée tout en bas, orpheline, loin du constat qu’elle explique — un fil rompu dès qu’on ouvrait le détail. Désormais une phrase de conclusion reste SOUDÉE au constat qui la précède : le couple monte (ou descend) ensemble, à sa juste place. Rien n’est ajouté ni retiré à ce que dit le coach — c’est purement l’ordre d’affichage qui redevient lisible.' },
  { v: '2.0.184', emoji: '📅', text: 'Ton coach « Le focus du moment » connaît désormais TON JOUR d’entraînement — le jour de la semaine où tu t’entraînes le plus, un signal qu’il n’avait jamais lu. Il te parlait de charge, de zones, d’équilibre course/muscu et de progression (le QUOI et le COMBIEN), mais jamais du QUAND : sur quel jour repose ton habitude. Or s’appuyer sur une habitude qui existe déjà est le levier le plus solide pour lancer une séance — bien plus qu’une injonction abstraite. Désormais, quand AUJOURD’HUI est justement ce jour dominant, il te le rappelle : « Et c’est justement ton jour : sur les 8 dernières semaines, c’est le jeudi que tu t’entraînes le plus (6 séances sur 9, 67 %). Ton corps a déjà ce rendez-vous dans le rythme — honore-le aujourd’hui : t’appuyer sur une ancre d’habitude qui existe déjà rend la séance bien plus facile à lancer que de compter sur la seule volonté. » Honnête : il n’en parle que si tu as une VRAIE habitude (au moins 8 séances sur 8 semaines, un jour nettement dominant — au moins 30 % de tes séances, pas d’ex æquo), se tait si tu t’entraînes tous les jours (pas de jour fétiche), les jours où ta forme demande du repos ou ta charge est en pic, et si tu as déjà bougé aujourd’hui (l’habitude est déjà honorée). La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.183', emoji: '✍️', text: 'Petite faute d’accord corrigée dans ta vue Jour : le résumé affichait « 1/3 faits » alors qu’un seul bloc était réalisé — le pluriel se calait sur le total de la journée au lieu du nombre que tu as réellement coché. Il s’accorde désormais avec ce que tu as fait : « 1/3 fait », « 2/3 faits ». Le reste de l’app suivait déjà cette règle.' },
  { v: '2.0.182', emoji: '🩹', text: 'Correctif important sur ton suivi Alternance : des candidatures étaient marquées « acceptée » à tort. Le mot « pris » suffisait à déclencher une acceptation — or « PRISE de contact », « j’ai PRIS contact », « PRIS en compte » et « rendez-vous PRIS » sont parmi les formulations les plus courantes quand on cherche une alternance. Toutes basculaient en offre décrochée, ce qui gonflait faussement ton entonnoir et tes statistiques (taux de réponse, nombre d’acceptations) — y compris automatiquement, à chaque synchronisation de ton Google Sheets. Désormais « pris » ne vaut acceptation que dans une vraie tournure d’acceptation (« j’ai été pris », « je suis prise »), et ces quatre formulations sont correctement classées « candidature envoyée ». Au passage, « candidature inacceptable » n’est plus lue comme « acceptée ».' },
  { v: '2.0.181', emoji: '🔎', text: 'Plus jamais de liste vide sans explication. Dans le suivi Alternance, quand ta recherche ou ton filtre de statut ne trouvait aucune candidature, la liste devenait simplement BLANCHE — de quoi croire, une seconde de trop, que tes candidatures avaient disparu. Elle t’explique maintenant ce qui se passe et quoi faire : « Aucune candidature ne correspond à ce filtre. Efface la recherche ou choisis un autre statut. » Même correction pour tes quêtes du jour : une fois toutes supprimées, la zone t’invite à en ajouter une au lieu de rester muette. Ces deux listes étaient les seules de l’app à ne pas avoir leur message d’état vide.' },
  { v: '2.0.180', emoji: '⌨️', text: 'Navigation au clavier réparée sur les trois grandes pages qui s’ouvrent par-dessus le tableau de bord — Ma semaine, le Calendrier et le plan Ultra-Trail. Elles recouvrent l’écran, mais le curseur clavier, lui, restait derrière : tu pouvais tabuler à l’aveugle dans le tableau de bord caché, et en fermant, le focus ne revenait pas au bouton d’où tu venais. Désormais le focus entre dans la page à l’ouverture, le tableau de bord derrière est réellement mis hors circuit (plus rien d’atteignable au clavier ni annoncé par un lecteur d’écran), et à la fermeture — bouton Retour ou touche Échap — tu retrouves exactement le bouton que tu avais quitté. Rien ne change à la souris ; c’est le parcours clavier qui redevient logique.' },
  { v: '2.0.179', emoji: '🎯', text: 'La carte de ton coach redevient vraiment brève. Elle gardait « deux phrases » quelle que soit leur longueur — une carte sur quatre dépassait donc encore 300 caractères, jusqu’à 420 : l’inverse d’un focus qu’on saisit d’un coup d’œil. Elle tient désormais dans un budget de caractères, et le message médian passe d’environ 270 à environ 60 caractères. Avec une nuance qui compte : ce budget ne s’applique qu’à l’ACCESSOIRE. Une alerte qui touche à ton intégrité physique ou à ta charge d’entraînement passe sur la carte MÊME si elle est longue — bref par défaut, long seulement quand ça le mérite. Et ton verdict du jour n’est jamais coupé en plein milieu.' },
  { v: '2.0.178', emoji: '🚨', text: 'Ton coach te dit d’abord ce qui compte le plus. Ses notes étaient assemblées dans l’ordre du code, pas dans l’ordre de l’urgence : comme sa carte n’affiche que le début, elle pouvait te dire « objectif bouclé, un bloc de plus serait du pur bonus, sans pression » tout en cachant « +50 % de kilométrage cette semaine, bien au-delà de ce que tes tendons encaissent — première cause de fracture de fatigue » derrière « ＋ plus de contexte ». Désormais les notes sont classées par urgence — intégrité physique (blessure), puis charge et surmenage, puis sommeil et récup, puis nutrition, et enfin les félicitations et les bonus. Ton verdict du jour reste toujours en tête, et le reste se déplie comme avant. Rien n’a été retiré : c’est l’ORDRE qui change, pour que l’avertissement qui compte ne soit plus celui qui se retrouve caché.' },
  { v: '2.0.177', emoji: '✂️', text: 'Ton coach va droit au but : après avoir énormément gagné en finesse (il lit maintenant ton sommeil, ta charge, ta force, ta nutrition, ton équilibre muscu…), sa carte « Le focus du moment » restait parfois un pavé les jours chargés. Elle affiche désormais l’essentiel — ton focus du jour en une ou deux phrases — et tout le contexte supplémentaire se déplie d’un tap sur « ＋ plus de contexte ». Punchy en un coup d’œil, détaillé si tu le veux. Rien n’est perdu, tout est mieux rangé.' },
  { v: '2.0.176', emoji: '🥗', text: 'Ton coach « Le focus du moment » regarde enfin tes FRUITS & LÉGUMES — le seul champ de ton journal nutrition qu’il n’avait jamais lu. Il te parlait déjà protéines (ton macro), eau (ton hydratation) et résultat sur la balance, mais le micronutriment — fibres, vitamines, antioxydants, ce qui soutient ta récup, ta digestion et ton immunité — restait totalement muet, coché ou non chaque jour sans que personne ne le remarque. Désormais, quand tu SUIS vraiment ta nutrition (au moins 8 jours des deux dernières semaines où tu notes tes protéines ou ton eau) mais que tu NÉGLIGES la case fruit/légume, il te le dit sans culpabiliser : « Côté fruits et légumes en revanche, zéro sur tes 10 jours suivis ces deux dernières semaines — tu gères tes protéines et ton eau, mais les fibres, vitamines et antioxydants (récup, digestion, immunité) manquent totalement à l’appel. Glisse un fruit ou une portion de légumes à un repas aujourd’hui, c’est le maillon le plus vite comblé. » Honnête : il ne parle que si tu suis vraiment ta nutrition (sinon une case vide voudrait juste dire « pas noté »), reste muet si ton habitude fruits est déjà correcte, et laisse la priorité à tes protéines et à ton eau — une seule note d’intrant à la fois. La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.175', emoji: '🏃', text: 'Ton coach « Le focus du moment » surveille désormais ta MONTÉE de KILOMÉTRAGE de course — la règle des +10 %/semaine, l’angle de progression qu’il ne lisait pas. Il connaissait déjà ta charge globale (durée × effort de toutes tes séances), mais celle-ci reste aveugle à un piège classique du coureur : tu peux garder une charge « optimale » tout en faisant BONDIR tes kilomètres de course (remplacer du renfo par du footing, ou courir plus en endurance facile). Or c’est le mileage qui casse — monter le volume de course trop vite est la première cause de blessure du coureur (périostite, fracture de fatigue), parce que tes tendons, tes os et tes articulations s’adaptent bien plus lentement que ton cardio. Désormais, quand ta semaine de course bondit de plus de +30 % sur une vraie base (au moins 10 km la semaine précédente), il te le dit : « Et surveille ta montée de kilométrage : tu es passé de 20 à 30 km de course cette semaine (+50 %), bien au-delà des +10 %/semaine que tes tendons, tes os et tes articulations encaissent sans casser… plafonne l’augmentation autour de +10 % la semaine prochaine, le temps que le corps s’adapte au volume. » Honnête : il exige un vrai kilométrage pour parler (pas de bruit sur 2 km), se tait les jours où ta forme demande du repos, où ta charge globale est déjà en pic ou si tu as déjà couru. La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.174', emoji: '🦵', text: 'Ton coach « Le focus du moment » repère désormais la ZONE musculaire que tu délaisses depuis un MOIS — l’angle du long terme, là où il ne voyait jusqu’ici que la fraîcheur du jour. Il te disait déjà quel groupe cibler AUJOURD’HUI (le plus reposé), mais jamais « ça fait quatre semaines que tu n’as pas touché tes jambes ». Or un groupe entier laissé de côté aussi longtemps — souvent le bas du corps quand on se concentre sur le haut — bride ta force globale (les jambes/fessiers sont ta plus grosse masse musculaire) et crée un point faible, invisible à la fraîcheur comme à l’équilibre course/muscu. Désormais, quand ta muscu du dernier mois laisse une zone à zéro (ou très loin derrière les autres), il te le dit : « Et sur le dernier mois, ta zone la plus délaissée, c’est les jambes : zéro série en quatre semaines. Un groupe musculaire entier laissé de côté aussi longtemps finit par brider ta force globale et creuser un point faible — ajoute les jambes à ton programme cette semaine. » Honnête : il exige un vrai volume mensuel pour parler (sinon c’est du bruit), se tait les jours où ta forme demande du repos, où ta charge est en pic ou si tu as déjà bougé, et laisse la priorité aux notes d’équilibre plus grosses (course/muscu, poussée/tirage) — une seule à la fois. La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.173', emoji: '💪', text: 'Ton coach « Le focus du moment » surveille désormais ta balance POUSSÉE ↔ TIRAGE en muscu — un déséquilibre de STRUCTURE qu’il ne voyait pas. Il regardait déjà l’équilibre course ↔ muscu et le groupe le plus reposé, mais jamais le penchant classique du haut du corps : pousser (pecs, épaules) bien plus qu’on ne tire (dos). Chaque séance de poussée paraît saine isolément, mais cumulée sur des semaines elle enroule les épaules vers l’avant et met la coiffe des rotateurs en tension — terrain classique de douleur d’épaule. Désormais, quand ta muscu du dernier mois penche nettement d’un côté (avec un vrai volume), il te le dit : « Et regarde ta balance poussée/tirage sur 4 semaines : 30 séries de poussée (pecs, épaules) pour seulement 6 de tirage — pousser bien plus qu’on ne tire enroule les épaules vers l’avant et met la coiffe des rotateurs en tension. Ajoute du dos (tractions, rowing) à ta prochaine séance, tes épaules te remercieront. » (et le miroir, ou le cas d’un côté à zéro). Honnête : il se tait tant qu’il n’a pas assez de séries pour juger, les jours où ta forme demande du repos, où ta charge est en pic, ou si tu as déjà bougé — et il laisse la priorité au conseil « cale carrément une séance » quand un côté entier de ta semaine manque. La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.172', emoji: '⚖️', text: 'Ton coach « Le focus du moment » regarde enfin l’ÉQUILIBRE entre ta course et ta muscu — un angle qu’il ignorait totalement (il ne lisait que la fréquence, ta forme du jour, ta charge et tes carburants, jamais la répartition entre les deux). Comme tu pratiques les deux, une semaine entièrement d’un seul côté est un vrai trou : tout-cardio et zéro renfo, tes gains de force fondent et les appuis que la course sollicite perdent le renfort qui les protège ; tout-muscu et zéro course, ta base aérobie s’érode. Désormais, quand ta semaine sport bascule à 100 % d’un côté (au moins 3 séances, et à condition que tu pratiques bien les deux d’habitude), il te le dit : « Et regarde l’équilibre de ta semaine : 4 sorties de course et zéro renfo, alors que tu pratiques les deux d’habitude — une semaine tout-cardio laisse filer tes gains de force et prive les appuis que la course sollicite du renfort qui les protège. Cale une séance de renfo pour rééquilibrer. » (et le miroir côté muscu). Honnête : il n’en parle que si tu es vraiment un athlète hybride (les deux modalités présentes sur le dernier mois), pas à un coureur pur ; et il se tait les jours où ta forme demande du repos, où ta charge est déjà en pic, ou si tu as déjà bougé aujourd’hui. La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.171', emoji: '😌', text: 'Ton coach « Le focus du moment » ne te pousse plus vers un gros bloc de deep work les jours où ta tête est à plat mais où ton objectif focus est confortablement dans les temps. Jusqu’ici, quand tu avais de la MARGE sur ton objectif (« dans les temps, tu as la marge »), il ne regardait ta forme du matin QUE si elle était au vert (pour t’inviter à prendre de l’avance) — un matin où l’esprit était épuisé, il restait muet et t’invitait quand même à un bloc normal. Le garde-fou « cerveau à plat → focus léger » n’existait que les semaines SERRÉES. Désormais, si ton objectif est dans les temps ET qu’un check-in de récup du matin met ta forme à plat (readiness < 50), il te rassure : « Mais ton énergie mentale est basse ce matin (readiness 40/100) : justement, tu as de la marge sur l’objectif — aucune raison de forcer un gros bloc aujourd’hui. Un focus léger, ou même une vraie pause, suffit largement : ta marge encaisse ce jour au ralenti sans stress, et tu repartiras l’esprit bien plus tranchant. » C’est le cas où lever le pied coûte le moins : l’objectif est déjà à l’abri, un jour au ralenti se rattrape tout seul. Honnête : il n’en parle qu’avec un check-in du jour et une forme réellement basse. La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.170', emoji: '🎁', text: 'Ton coach « Le focus du moment » sait maintenant, côté SPORT aussi, cadrer une séance de plus en bonus libre quand ton objectif de séances de la semaine est DÉJÀ bouclé. C’est le pendant exact de ce qu’il fait déjà côté deep work quand ton objectif de minutes est atteint. Jusqu’ici, une fois l’objectif hebdo de séances tenu (« Objectif hebdo déjà tenu : 2/2 séances 💪 »), il ne regardait plus ta forme du jour. Désormais, si ton objectif est bouclé, qu’un check-in de récup du matin met ton corps au vert (readiness ≥ 75) ET que tu n’as pas déjà bougé aujourd’hui, il ajoute : « Et ta forme est au top ce matin (readiness 88/100) : objectif de séances déjà dans la poche, aucune obligation de t’y remettre aujourd’hui — mais si l’envie de bouger est là, chaque séance en plus est du gain offert, du rab pris sans aucun compteur dans le dos. » Il ne te pousse pas à « lever le pied » (ton action du jour, elle, reste « prêt à pousser » si le corps suit) : il retire simplement la pression du calendrier — l’objectif est tenu, donc toute séance de plus est un pur bonus, pris par envie et sans culpabilité. Honnête : il n’en parle qu’au vert (objectif bouclé + forme moyenne ou basse = rien à ajouter), exige un check-in du jour et se tait si tu as déjà bougé aujourd’hui. La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.169', emoji: '🎁', text: 'Ton coach « Le focus du moment » ne laisse plus tes bons jours sans un mot quand ton objectif focus est DÉJÀ bouclé. Jusqu’ici, une fois l’objectif hebdo de minutes atteint (« Objectif hebdo atteint : 130/120 min 💪 »), il ne regardait plus ta forme du jour. Désormais, si ton objectif est bouclé ET qu’un check-in de récup du matin met ta tête au vert (readiness ≥ 75), il cadre honnêtement ce que ça veut dire : « Objectif bouclé et la forme est au rendez-vous ce matin (readiness 88/100) : plus aucune cible à tenir — un bloc de plus serait du pur bonus, sans la moindre pression, juste un peu d’avance offerte à ta semaine prochaine si l’envie te prend. » Ni une injonction, ni une invitation à « prendre de l’avance » comme quand il reste un objectif à sécuriser : l’objectif est tenu, donc tout bloc de plus est du PUR BONUS, à faire par envie et sans culpabilité. Honnête : il n’en parle qu’au vert (objectif bouclé + tête moyenne ou basse = rien à ajouter, l’objectif est tenu) et exige un check-in du jour. La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.168', emoji: '💡', text: 'Ton coach « Le focus du moment » ne se contente plus de t’inviter à prendre de l’avance les bons jours de marge côté deep work — il te dit maintenant CE QUI te donne cette clarté. Jusqu’ici, quand tu avais de la marge sur ton objectif focus ET la tête fraîche, il t’invitait à engranger un bloc d’avance sans jamais nommer POURQUOI ton esprit est si clair — alors qu’il le fait déjà les jours pressés (« ce qui nourrit cette fraîcheur mentale »). Désormais, si une force ressort nettement de ton check-in, il la nomme aussi sur ce bon jour confortable : une belle nuit → « Et ce qui te donne cette clarté : ta nuit de 8 h — autant profiter d’un cerveau aussi reposé pour engranger un bloc de plus tant que ça tourne tout seul, c’est de l’avance prise sans forcer. » ; une énergie au top → « ton énergie est au top (fatigue 1/5) — un esprit aussi vif avance vite, saisis-le pour banker un bloc d’avance pendant que c’est facile. » Tu vois ainsi quelle habitude t’offre ce mou pour la répéter. Honnête : il ne crédite que le sommeil ou l’énergie (les vrais carburants d’un bloc) — jamais des muscles frais, qui ne portent pas la concentration ; et il se tait si aucune force ne domine clairement. La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.167', emoji: '🏋️', text: 'Ton coach « Le focus du moment » sait maintenant, côté SPORT aussi, t’inviter à prendre de l’avance les bons jours de marge. C’est le pendant exact de ce qu’il fait déjà côté deep work : quand tu as de la MARGE sur ton objectif de séances de la semaine (« dans les temps, tu as la marge ») ET que ta forme du matin est au vert (readiness ≥ 75), il ne laisse plus filer ce bon jour confortable. Il ajoute désormais : « Et ton corps est au vert ce matin (readiness 88/100) : rien ne t’oblige à t’entraîner aujourd’hui, mais profite de cette forme pour engranger une séance d’avance — une de plus maintenant te fait un coussin qui met l’objectif à l’abri si un jour creux tombe plus tard, sans sprint serré en fin de semaine. » Une séance de plus un jour où le corps suit et où rien n’y oblige, c’est mettre ton objectif hebdo à l’abri d’un imprévu. Honnête : il n’en parle qu’au vert (un jour moyen ou bas où tu as déjà la marge n’a besoin d’aucune pression), et seulement si tu n’as pas déjà bougé aujourd’hui (inutile de pousser une 2ᵉ séance le même jour). La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.166', emoji: '🚀', text: 'Ton coach « Le focus du moment » ne se réveille plus seulement les jours pressés : quand tu as de la MARGE sur ton objectif de deep work ET que ta tête est fraîche le matin, il t’invite à prendre de l’avance tant que c’est facile. Jusqu’ici, il ne reliait ta forme du matin à ton objectif focus QUE les semaines serrées (« ta forme est au vert, c’est LE moment de pousser »). Les semaines où tu avais de la marge, il te disait juste « tu as la marge » sans jamais regarder ton check-in — et laissait filer les bons jours. Désormais, quand l’objectif est dans les temps et que ta readiness est au vert (≥ 75), il ajoute : « Et ta tête est claire ce matin (readiness 88/100) : profite de cette marge pour prendre de l’avance sur l’objectif tant que c’est facile — un vrai bloc engrangé maintenant te fait un coussin qui amortira un jour creux plus tard, sans stress. » Les minutes de focus s’accumulent : avancer un jour où l’esprit est clair et où rien ne t’y oblige, c’est te constituer une réserve sereine. C’est le pendant proactif de ce qu’il fait déjà les jours serrés — le même feu vert que côté sport, appliqué à la concentration quand tu peux te le permettre. Honnête : il ne parle qu’au vert (un jour moyen ou bas où tu as déjà la marge n’a besoin d’aucune pression en plus). La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.165', emoji: '🎯', text: 'Ton coach « Le focus du moment » ne te laisse plus sans un mot les jours de forme MOYENNE. Quand ta semaine de deep work est serrée, il savait déjà te parler des deux extrêmes : forme au vert → « c’est LE moment de pousser », forme à plat → « focus court, soigne ta récup ». Mais entre les deux — une readiness simplement correcte, la majorité des jours — il restait totalement muet sur l’état de ta tête. Désormais il comble ce trou d’un mot honnête, sans surpromettre ni dramatiser : « Ta forme tient la route ce matin (readiness 60/100) sans être au top : cale un bloc mesuré — tiens la cible du jour sans forcer un marathon de deep work, un bloc net et régulier fait avancer l’objectif sans creuser la fatigue. » C’est le pendant, côté concentration, du « séance correcte, mais garde une marge » qu’il te sert déjà côté sport. La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.164', emoji: '🌫️', text: 'Ton coach « Le focus du moment » sait maintenant, côté FOCUS aussi, nommer CE QUI te plombe la tête les jours à plat. Quand ta semaine de deep work est serrée mais que ta forme du matin est au plancher, il te disait déjà « focus court aujourd’hui, soigne ta récup » — sans expliquer QUOI brume ton cerveau. Désormais, si un frein ressort nettement de ton check-in, il le nomme et te dit quoi soigner : une nuit trop courte → « Et ce qui te plombe la tête aujourd’hui : ta nuit courte de 4 h — recharge le sommeil ce soir, c’est lui qui remettra ton cerveau en état de deep work, pas l’acharnement du jour. » ; une grosse fatigue → « ta fatigue générale (5/5) — le repos de ce soir vaut plus qu’un bloc forcé maintenant, tu retrouveras un esprit bien plus tranchant demain. » C’est le miroir exact de ce qu’il fait déjà les bons jours (nommer ce qui porte ta fraîcheur mentale). Honnête : il ne pointe que le sommeil ou l’énergie (les seuls freins qui plombent vraiment un bloc) — jamais des muscles douloureux, qui pèsent sur une séance mais pas sur la concentration ; et il se tait si aucun frein ne domine clairement. La note enrichit l’insight, sans rien remplacer.' },
  { v: '2.0.163', emoji: '🧠', text: 'Ton coach « Le focus du moment » sait maintenant, côté FOCUS aussi, nommer CE QUI porte ta fraîcheur mentale. Quand ta semaine de deep work est serrée (« cale un vrai bloc aujourd’hui ») ET que ta forme du matin est au vert, il te disait déjà « c’est LE moment de pousser » — mais sans expliquer QUOI te rend l’esprit si clair. Désormais, si une force ressort nettement de ton check-in, il la nomme et la relie au deep work : une belle nuit → « Et ce qui nourrit cette fraîcheur mentale : ta nuit de 8 h — un cerveau reposé est le vrai carburant du deep work, attaque d’abord ta tâche la plus exigeante tant que la tête suit. » ; une énergie au top → « ton énergie est au top (fatigue 1/5) — l’esprit est vif, profite-en pour aller au fond du bloc le plus dur avant que la journée l’entame. » C’est le pendant, côté concentration, de ce que ton coach fait déjà côté sport, pour que tu voies quel comportement te donne un cerveau prêt et que tu le répètes. Honnête : il ne crédite que le sommeil ou l’énergie (les vrais carburants d’un vrai bloc) — jamais des muscles frais, qui ne portent pas la concentration ; et il se tait si aucune force ne domine clairement. La note enrichit l’insight, sans rien remplacer.' },
  { v: '2.0.162', emoji: '💚', text: 'Ton coach « Le focus du moment » ne te dit plus seulement CE QUI plombe ta forme les jours moyens — il te dit CE QUI la PORTE les jours au vert. C’est le pendant positif exact : quand ta readiness est haute (≥ 75, « prêt à pousser ») et qu’un bon comportement ressort clairement de ton check-in, il le nomme et t’invite à en profiter : une belle nuit → « Ce qui te porte aujourd’hui : ta nuit de 8,5 h — ce sommeil solide est le vrai moteur de ta forme, tu as tout pour aller chercher un stimulus franc. Capitalise dessus. » ; une énergie au top → « ton énergie est au top (fatigue 1/5) — profite de cette fraîcheur pour un vrai stimulus, c’est ces jours-là que les gains se construisent. » ; des muscles frais → « tes muscles sont frais, sans courbatures (1/5) — le corps est prêt à encaisser du volume, vas-y franchement. » Tu vois ainsi quel geste produit ta bonne forme, pour le répéter. Honnête : il ne parle que quand une force domine nettement (si tout est au top à égalité, pas de moteur unique désigné). La note enrichit ton action du jour, elle ne la remplace pas.' },
  { v: '2.0.161', emoji: '🏆', text: 'Ton coach « Le focus du moment » fête maintenant aussi tes records au POIDS DU CORPS. Il savait déjà célébrer un record de charge (un nouveau meilleur 1RM), mais il ignorait complètement tes progrès en calisthénie : gagner des répétitions sur tes tractions, pompes ou dips ne déclenchait rien, alors que sur ces exercices les reps SONT ta progression. Désormais, quand ta séance du jour bat ton record de répétitions sur un exercice sans charge que tu pratiques déjà, il le nomme et le célèbre : « 🏆 Et quelle séance : tu viens de battre ton record de répétitions sur le Tractions — 13 reps au poids du corps (ton meilleur passé : 10), du jamais-vu chez toi. La force au poids du corps se construit rep après rep — chapeau. » Honnête : il ne parle que d’un record vraiment battu aujourd’hui (égaler ne compte pas), sur un exercice sans aucune charge déjà à ton historique — et jamais en même temps qu’un record de charge (celui-ci passe d’abord). La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.160', emoji: '🏆', text: 'Ton coach « Le focus du moment » fête enfin tes records. Il savait déjà projeter ta force qui monte, mais quand tu battais un record personnel dans la journée, il ne servait qu’un « séance déjà faite » générique — passer à côté du moment le plus fort. Désormais, quand ta séance du jour établit un nouveau record sur un exercice que tu pratiques déjà (un vrai record qui bat ta meilleure perf passée, pas un « record » de première fois), il le nomme et le célèbre : « 🏆 Et pas n’importe quelle séance : tu viens de battre ton record sur le Squat — 110 kg × 5 (1RM estimé à 128,5 kg), ta meilleure perf à ce jour. Ça, c’est gravé — savoure. » Ce palmarès vivait jusqu’ici seulement dans ton onglet Athlète — le voilà dans le coach du jour, pour transformer « séance faite » en victoire concrète. Honnête : il ne parle que d’un record vraiment battu aujourd’hui, sur un exercice chargé déjà à ton palmarès. La note enrichit l’insight, ton action du jour reste intacte.' },
  { v: '2.0.159', emoji: '📏', text: 'Ton coach « Le focus du moment » ne se laisse plus tromper par la balance. Quand ton poids stagne sur un objectif de perte, il te conseillait de resserrer les calories — juste, sauf quand ta balance CACHE une vraie recomposition. Désormais, si ton tour de taille a fondu pendant que le poids ne bougeait plus, il le voit et te recadre : « Mais avant de resserrer : ton tour de taille a fondu de 3 cm sur les 65 derniers jours pendant que la balance stagnait — c’est de la recomposition (tu perds du gras en gardant le muscle), un progrès réel que le poids seul cache. La balance ne dit pas tout : tiens tes calories et tes protéines encore une semaine avant de couper, le résultat est déjà en cours. » Il t’évite ainsi de couper tes calories pour rien — et de saper ton muscle — alors que tu progresses déjà. Honnête : il ne parle que si tu as noté tes mensurations et que ta taille a vraiment baissé (≥ 1 cm). La note enrichit l’insight, sans effacer le repère de la balance.' },
  { v: '2.0.158', emoji: '🚀', text: 'Ton coach « Le focus du moment » ne sait plus seulement te dire quand ta force STAGNE — il te salue et te projette quand elle MONTE. C’est le pendant positif du plateau : quand un de tes exercices chargés (les mieux suivis) grimpe vraiment, il nomme le lift, son 1RM estimé, ta pente hebdo et surtout ton prochain cap : « Sur ta lancée : ton Squat gagne du terrain — 1RM estimé à 97,5 kg (+2,5 kg/sem). À ce rythme, tu passes la barre des 100 kg dans ~1 semaine — garde ce cap de surcharge progressive. » Cette projection vivait jusqu’ici seulement dans ton onglet Athlète — la voilà dans le coach du jour, pour transformer un chiffre en objectif motivant. Honnête : il ne parle que sur des exercices chargés avec une vraie pente positive, et jamais en même temps qu’une alerte de plateau (on ne te dit pas « ça stagne » et « ça grimpe » d’un même souffle — la correction du plateau passe d’abord). Ton action du jour reste intacte : la note enrichit l’insight, elle ne le remplace pas.' },
  { v: '2.0.157', emoji: '📈', text: 'Ton coach « Le focus du moment » regarde désormais si ta FORCE progresse vraiment. Il savait déjà te dire DE t’entraîner, QUAND (créneau libre) et QUOI travailler (groupe le plus reposé) — mais jamais si la charge avance. Maintenant, quand un de tes exercices chargés (les mieux suivis) stagne — son 1RM estimé ne dépasse plus son record sur tes 3 dernières séances —, il te le nomme et te donne le geste concret pour débloquer : « Côté progression : ton Squat marque le pas — son 1RM estimé stagne autour de 116,5 kg depuis 3 séances, sans nouveau record. Pour débloquer ça : ajoute une répétition à charge égale, ralentis la phase de descente, ou décharge une semaine avant de reprendre plus lourd. » Cette détection de plateau vivait jusqu’ici seulement dans ton onglet Athlète — la voilà dans le coach du jour. Honnête : il ne parle que sur des exercices chargés avec assez d’historique, et seulement quand ton entraînement est régulier (jamais quand le sport est décroché, ni un jour où ta séance est déjà faite). Ton action du jour reste intacte : la note enrichit l’insight, elle ne le remplace pas.' },
  { v: '2.0.156', emoji: '🔎', text: 'Ton coach « Le focus du moment » ne te donne plus seulement ton score de forme du jour — il te dit ce qui le PLOMBE. Jusqu’ici, sur un check-in de récup au-dessous du vert, il calait l’intensité (« readiness 63/100 — séance correcte, garde une marge ») sans jamais nommer POURQUOI ta forme est basse, alors que le bon geste diffère selon le frein. Désormais, quand un facteur domine nettement ton check-in, il le nomme et adapte le conseil : des courbatures → « Ce qui pèse le plus : tes courbatures (5/5) — épargne les groupes musculaires déjà douloureux et laisse-les récupérer plutôt que de forcer dessus. » ; une fatigue générale → « réduis le volume plutôt que l’intensité, et vise un vrai repos ce soir » ; une nuit courte → « garde léger, ce qui rechargera vraiment ta forme c’est le sommeil de ce soir, pas l’effort. » Il ne parle que quand un frein ressort clairement : si deux se valent (tout au rouge), il ne pointe pas un coupable au hasard. Un « pourquoi » tiré de tes vraies composantes de check-in, qui affine ton geste du jour sans jamais le remplacer.' },
  { v: '2.0.155', emoji: '🦵', text: 'Ton coach « Le focus du moment » ne se contente plus de te dire DE t’entraîner et QUAND (créneau libre du jour) — il te dit désormais QUOI travailler. À partir de ton historique d’exercices réels, il repère le groupe musculaire le plus reposé ET le moins servi cette semaine (repos en jours + séries manquantes vers le minimum hebdo, en écartant ce que tu as travaillé il y a moins de 2 jours) et te le nomme dans l’action : « Et cible en priorité les jambes : c’est ton groupe le plus reposé (rien depuis 10 j, 0 série cette semaine) — de quoi équilibrer ta semaine. » Un groupe encore jamais ciblé ? Il t’invite à l’inaugurer. La recommandation reste honnête : tant que tu n’as loggé aucun exercice nommé, il ne devine rien et se tait ; il ne pousse pas de groupe à charger un jour de récup (forme au rouge) ni si ta séance est déjà faite. Ton action du jour reste sinon intacte.' },
  { v: '2.0.154', emoji: '🏆', text: 'Ton coach « Le focus du moment » ne fait plus que t’avertir quand une chaîne d’habitude va tomber (« ne casse pas la chaîne ») — il te FÉLICITE quand une série vient d’atteindre un palier. Quand une habitude cochée aujourd’hui franchit pile un jalon (3, 7, 14, 30, 60, 100, 180 ou 365 jours), il le célèbre : « 🏆 Chaîne au sommet : ton habitude « Lecture » atteint une semaine complète (7 jours consécutifs) aujourd’hui — un vrai palier, l’automatisme s’installe. Savoure et enchaîne le prochain maillon. » Le pendant positif de l’alerte de série en jeu : après une salve de rappels côté déficit (sommeil, hydratation, mobilité, protéines), le coach renoue avec le renforcement du progrès. Il nomme le palier le plus impressionnant du jour, ne se répète pas (chaque jalon n’est franchi qu’une fois), et ton action du jour reste intacte.' },
  { v: '2.0.153', emoji: '🥩', text: 'Ton coach « Le focus du moment » lit enfin tes PROTÉINES quand il te pilote sur l’ENTRAÎNEMENT — le maillon qui manquait à sa lecture du sport. Il regardait déjà ta charge, ta forme du jour, ton sommeil, ton hydratation et ta récupération active (mobilité), mais restait aveugle au MATÉRIAU même de tes gains : l’entraînement ne fait que casser le muscle (microlésions), c’est la protéine de ton assiette qui fournit les briques pour le reconstruire plus fort. T’entraîner dur en mangeant chroniquement trop peu de protéines, c’est plafonner les gains de chaque séance — le stimulus est là, le matériau manque. Désormais, quand il te pilote sur le sport, que tu t’entraînes vraiment ces jours-ci, qu’aucune note de sommeil, d’hydratation ou de mobilité ne prime déjà, et que tes derniers jours renseignés montrent ta cible protéines atteinte sur moins de la moitié des jours, il te le dit : « Et pense au matériau de tes gains : sur tes 4 derniers jours renseignés, tu n’atteins ta cible protéines (135 g) que 0/4 — or l’entraînement ne fait que casser le muscle, c’est la protéine qui fournit les briques pour le reconstruire plus fort, et sans elle en quantité suffisante chaque séance rend moins. Vise 135 g aujourd’hui, répartis sur tes repas. » La cible est calée sur ton poids et ton objectif, exactement comme sur l’onglet Nutrition ; la note n’apparaît que sur ce cas précis et ton action du jour reste intacte.' },
  { v: '2.0.152', emoji: '🧘', text: 'Ton coach « Le focus du moment » voit enfin ton pilier BIEN-ÊTRE / MOBILITÉ — une donnée qu’il n’avait jamais lue : il ne regardait que ton sport, ton focus, ton sommeil, ta nutrition, tes habitudes, tes candidatures et ton poids. Sur le SPORT, il lisait déjà ta charge, ta forme du jour, ton sommeil et ton hydratation, mais restait aveugle à la RÉCUPÉRATION ACTIVE : quand tu t’entraînes régulièrement sans jamais relâcher (mobilité, étirements), tes tissus et articulations encaissent la charge sans contrepartie — c’est le terrain des tensions et des blessures de surcharge qui s’installent en silence, et la souplesse qui se perd bride ton amplitude. Désormais, quand il te pilote sur le sport, que tu t’entraînes vraiment ces jours-ci, qu’aucune note de sommeil ou d’hydratation ne prime déjà, et que ça fait au moins 4 jours sans routine bien-être (alors que tu en as déjà fait), il te le dit : « Un dernier levier, côté récupération : ça fait 6 jours sans routine mobilité alors que tu t’entraînes régulièrement en ce moment — les tissus et articulations encaissent la charge sans jamais relâcher, et c’est le terrain des tensions et des blessures de surcharge qui s’installent en silence. 5 min de mobilité ou d’étirements aujourd’hui entretiennent ce capital et accélèrent la récup entre les séances. » Il ne te relance jamais sur le bien-être si tu n’y as jamais touché, et ton action du jour reste intacte.' },
  { v: '2.0.151', emoji: '🔗', text: 'Ton coach « Le focus du moment » regarde enfin tes HABITUDES — jusqu’ici il ne lisait que tes 4 piliers (sport, focus, sommeil, nutrition) et restait aveugle à ton tracker d’habitudes. Or une habitude dont la série se joue AUJOURD’HUI (prévue ce jour, pas encore cochée) est le geste le plus urgent et le plus concret de la journée : elle tombe si tu ne la valides pas avant ce soir, là où une tendance de fond peut attendre. Désormais, quand une de tes habitudes porte une série d’au moins 3 jours et n’est pas encore cochée, il te le rappelle : « Ne casse pas la chaîne : ton habitude « Lecture » tient depuis 12 jours et n’est pas encore cochée aujourd’hui — un petit geste et elle continue. » Il prend la plus longue série menacée et te signale s’il en reste d’autres à cocher, pour que tu saches quoi verrouiller en premier. La note s’ajoute quel que soit le pilier du jour, sans jamais remplacer ton action ni la carte Alternance, toujours prioritaire.' },
  { v: '2.0.150', emoji: '🍽️', text: 'Ton coach « Le focus du moment » tient maintenant compte de ta FORME DU JOUR quand il te pilote sur la NUTRITION — un signal qu’il ignorait jusqu’ici de ce côté. Il lisait ton assiette, ta balance et ton sommeil sur la durée, mais restait aveugle à ta readiness du matin ; or le jour de fatigue est, statistiquement, celui où l’assiette dérape : le corps réclame du sucre rapide et la satiété se dérègle. Quand tu as fait ton check-in de récup aujourd’hui et que ta forme est au plancher (readiness < 50), et qu’aucune note de sommeil ne prime, il le nomme au lieu de te laisser subir le jour : « Un dernier repère pour aujourd’hui : ta forme est basse ce matin (readiness 40/100), et les jours de fatigue sont ceux où l’assiette dérape le plus — le corps réclame du sucre rapide et la satiété se dérègle. C’est justement aujourd’hui que tenir l’essentiel compte le plus : tes protéines, ton eau et des repas réguliers te protègent des fringales bien mieux que la volonté sur une réserve vide. » La note n’apparaît que sur ce cas précis (coach sur la nutrition, check-in du jour au plancher, sans note de sommeil qui primerait) ; ton action du jour (protéines) reste intacte.' },
  { v: '2.0.149', emoji: '🚰', text: 'Ton coach « Le focus du moment » regarde maintenant aussi ton HYDRATATION quand il te pilote sur l’ENTRAÎNEMENT — le pendant, côté SPORT, de la note d’hydratation ajoutée juste avant côté focus. Jusqu’ici, sur le sport, il lisait ta forme du jour (readiness), ta charge des 7 jours et ton sommeil, mais restait aveugle à l’eau — pourtant un des leviers de performance les plus RAPIDES : même une déshydratation légère (1 à 2 % du poids) fait chuter la force, la puissance et l’endurance, gêne la thermorégulation et la récupération, et gonfle la sensation d’effort. Quand tes derniers jours montrent une hydratation basse (moins de 6 verres/jour de moyenne, sous la cible de 8) et qu’aucune note de sommeil ne prime, il le dit : « Et pense à un carburant qu’on oublie à l’effort : tu bois 4 verres d’eau par jour ces derniers jours, sous les 8 — même une déshydratation légère fait chuter la force, la puissance et l’endurance, gêne la thermorégulation et la récupération, et gonfle la sensation d’effort. Ça se corrige tout de suite : un grand verre avant de bouger, et une gourde à côté de toi pendant l’effort. » La note n’apparaît que sur ce cas (coach sur le sport, hydratation basse, sans note de sommeil qui primerait) ; ton action du jour reste intacte.' },
  { v: '2.0.148', emoji: '💧', text: 'Ton coach « Le focus du moment » regarde maintenant aussi ton HYDRATATION quand il te pilote sur la concentration — un levier tout neuf, complémentaire du sommeil. Jusqu’ici, côté focus, il ne parlait que de ton sommeil (durée, régularité du coucher), qui se construit sur des jours. L’hydratation, elle, est le levier cognitif le plus RAPIDE : même une déshydratation légère (1 à 2 % du poids) émousse l’attention et la mémoire de travail et fait grimper la sensation d’effort — et ça se corrige en minutes. Quand tes derniers jours montrent une hydratation basse (moins de 6 verres/jour de moyenne, sous la cible de 8) et qu’aucune note de sommeil ne prime, il le dit : « Et un levier immédiat, souvent négligé : tu bois 4 verres d’eau par jour ces derniers jours, sous les 8 — même une déshydratation légère brouille l’attention et la mémoire de travail et fait grimper la sensation d’effort. Contrairement au sommeil, ça se corrige en minutes : un grand verre d’eau avant ton bloc, et garde une gourde à portée. » La note n’apparaît que sur ce cas (coach sur le focus, hydratation basse, sans note de sommeil qui primerait) ; ton action du jour reste intacte.' },
  { v: '2.0.147', emoji: '🌗', text: 'Ton coach « Le focus du moment » sait maintenant aussi te FÉLICITER quand ton rythme de coucher s’améliore — jusqu’ici, côté focus, il ne parlait de tes couchers que pour ALERTER (« ils partent dans tous les sens »). C’est le premier renfort POSITIF sur l’axe de l’horloge interne : quand tes couchers se RESSERRENT d’une semaine à l’autre (écart-type qui baisse d’au moins ~15 min), il le crédite : « Bonne nouvelle côté horloge interne : tes couchers se resserrent (±120 → ±40 min d’un soir à l’autre) — un rythme de coucher qui se stabilise réaligne l’horloge circadienne qui cadence la vigilance, et l’attention comme le temps de réaction vont suivre. Tiens ce cap, ta concentration a tout à y gagner. » Récompenser le progrès qui paie entretient l’élan mieux qu’une alerte de plus. La note n’apparaît que sur ce cas (coach sur le focus, couchers qui se stabilisent, sans note de sommeil court ou de couchers encore dispersés qui primerait) ; ton action du jour reste intacte.' },
  { v: '2.0.146', emoji: '⏰', text: 'Ton coach « Le focus du moment » regarde maintenant, côté FOCUS, non seulement COMBIEN tu dors mais À QUELLE HEURE tu te couches. La note « sommeil court » (ajoutée juste avant) ne voit que la durée : on peut dormir assez d’heures et pourtant se coucher à 22 h un soir, 3 h le lendemain — la durée paraît correcte, le rythme circadien est en miettes. C’est justement ton cas (endormissements erratiques, vers 6 h certains soirs). Quand tes nuits durent assez MAIS que tes couchers partent dans tous les sens (écart d’au moins ~1 h d’un soir à l’autre), il le nomme : « Ta durée de sommeil tient, mais tes couchers partent dans tous les sens (±90 min d’un soir à l’autre) : le cerveau ne tourne à plein régime cognitif que sur une horloge stable — un coucher erratique désynchronise l’horloge interne qui cadence la vigilance, et l’attention comme le temps de réaction décrochent même après une nuit assez longue. Se coucher à heure fixe compte ici autant que le nombre d’heures. » La note n’apparaît que sur ce cas subtil (coach sur le focus, durée correcte mais couchers dispersés, sans être déjà en alerte prioritaire) ; ton action du jour reste intacte.' },
  { v: '2.0.145', emoji: '🧠', text: 'Ton coach « Le focus du moment » relie désormais ton SOMMEIL à ta CONCENTRATION — la dernière des quatre faces du croisement « sommeil chronique × pilier » (après perte, prise et entraînement). Jusqu’ici, quand il te pilotait sur le FOCUS, il lisait ton allure hebdo de minutes et ta forme du jour (readiness), mais restait aveugle à un sommeil CHRONIQUEMENT court : on peut avoir une forme correcte un matin donné tout en accumulant une dette de sommeil depuis des jours. Quand tes nuits sont courtes (moins de 7 h de moyenne sur tes derniers relevés), il nomme le carburant du cerveau : « Et n’oublie pas ce qui alimente ta concentration : tu dors 6 h en moyenne ces derniers jours (dette de 21 h sur 14 j), sous les 7 h — une nuit courte émousse l’attention et la mémoire de travail (le cortex préfrontal tourne au ralenti), et c’est la nuit que le cerveau consolide ce que tu apprends le jour. Dormir court, c’est fournir plus d’effort pour retenir moins ; bien dormir démultiplie chaque bloc de focus. » La note n’apparaît que sur ce cas (coach sur le focus ET sommeil court, sans être déjà en alerte prioritaire) ; ton action du jour (tâche phare, bloc) reste intacte.' },
  { v: '2.0.144', emoji: '🌙', text: 'Ton coach « Le focus du moment » relie désormais ton SOMMEIL à tes GAINS d’ENTRAÎNEMENT — le pendant, côté SPORT, des notes « sommeil × perte » et « sommeil × prise » ajoutées côté nutrition. Jusqu’ici, quand il te pilotait sur le sport, il lisait ta forme du jour (readiness) et ta charge des 7 derniers jours, mais restait aveugle à un sommeil CHRONIQUEMENT court : on peut avoir une forme correcte un matin donné tout en dormant structurellement trop peu depuis des jours. Quand tes nuits sont courtes (moins de 7 h de moyenne sur tes derniers relevés), il nomme le socle invisible : « Et n’oublie pas le socle invisible de tes gains : tu dors 6 h en moyenne ces derniers jours (dette de 21 h sur 14 j), sous les 7 h — c’est la nuit que le corps consolide l’entraînement (synthèse protéique, réparation, hormones), et dormir court plafonne les gains de chaque séance tout en augmentant le risque de blessure. Bien dormir démultiplie l’effort que tu fournis déjà. » La note n’apparaît que sur ce cas (coach sur le sport ET sommeil court, sans être déjà en alerte prioritaire) ; ton action du jour (séance, charge ou repos) reste intacte.' },
  { v: '2.0.143', emoji: '💪', text: 'Ton coach « Le focus du moment » relie aussi ton SOMMEIL à ta prise de MUSCLE — le pendant exact de la note « sommeil × perte de gras ». Quand il te pilote sur la nutrition avec un objectif de PRISE en cours et que tes nuits sont courtes (moins de 7 h de moyenne sur tes derniers relevés), il nomme le frein invisible : « Et surveille un frein invisible : tu dors 6 h en moyenne ces derniers jours (dette de 21 h sur 14 j), sous les 7 h — le manque de sommeil fait chuter la testostérone et l’hormone de croissance, bride la synthèse musculaire et range ton surplus en gras plutôt qu’en muscle. Bien dormir, c’est transformer tes calories en muscle, pas seulement en avaler plus. » Le lien hormonal est l’inverse de la perte : sur une prise, la nuit courte plombe la récup et la construction musculaire, si bien que le surplus se range en gras. La note n’apparaît que sur ce cas (objectif de prise ET sommeil court, sans être déjà en alerte prioritaire) ; rien d’autre ne change.' },
  { v: '2.0.142', emoji: '🌙', text: 'Ton coach « Le focus du moment » relie enfin ton SOMMEIL à ta perte de poids. Quand il te pilote sur la nutrition avec un objectif de PERTE en cours et que tes nuits sont courtes (moins de 7 h de moyenne sur tes derniers relevés), il nomme le frein caché : « Et surveille un frein caché : tu dors 6 h en moyenne ces derniers jours (dette de 21 h sur 14 j), sous les 7 h — le manque de sommeil pousse la faim (ghréline) et le stockage (cortisol) à la hausse et freine la perte de gras autant qu’un écart d’assiette. Mieux dormir fait partie du plan, pas seulement mieux manger. » Jusqu’ici le coach nutrition ne regardait que ton assiette et ta balance ; il croise désormais les piliers pour pointer ce qui peut faire caler ta perte sans que tu le voies. La note n’apparaît que sur ce cas (objectif de perte ET sommeil court, sans être déjà en alerte prioritaire) ; rien d’autre ne change.' },
  { v: '2.0.141', emoji: '🌫️', text: 'Ton coach « Le focus du moment » ne sait pas que célébrer l’alignement côté FOCUS (nouveauté récente : objectif serré ET forme au vert → fonce) : il sait aussi désamorcer le CONFLIT inverse. Quand ton objectif hebdo de MINUTES de focus est SERRÉ (« cale un vrai bloc d’~90 min aujourd’hui pour tenir la cible ») MAIS qu’un check-in de récup du jour met ta forme au PLANCHER (readiness < 50, l’esprit épuisé), le coach ne te pousse plus à t’acharner dans le vide : « Mais ta forme est à plat ce matin (readiness 40/100) : un cerveau fatigué ne produit pas un vrai bloc profond, et t’acharner empilerait des minutes creuses sans avancer l’objectif. Un focus court et facile aujourd’hui, soigne ta récup — l’esprit frais rattrapera ces minutes bien plus vite. » C’est le pendant EXACT et OPPOSÉ de la note d’alignement côté focus, et le symétrique côté focus de la note sport « objectif serré ET forme à plat → la récup prime » : quand la tête est vide, s’entêter sur un gros bloc n’avance rien. La note n’apparaît que sur ce cas précis (objectif focus serré ET readiness au plancher le jour même) ; rien d’autre ne change.' },
  { v: '2.0.140', emoji: '🧠', text: 'Ton coach « Le focus du moment » sait enfin reconnaître l’alignement « tout est réuni » aussi côté FOCUS, pas seulement côté sport. Quand ton objectif hebdo de MINUTES de focus est SERRÉ (« cale un vrai bloc d’~90 min aujourd’hui pour tenir la cible ») ET qu’un check-in de récup du jour met ta forme au vert (readiness ≥ 75, l’esprit frais), le coach ne laisse plus passer la fenêtre : « Et bonne nouvelle : cette cadence serrée tombe pile — ta forme est au vert ce matin (readiness 82/100), l’esprit est frais pour tenir un vrai bloc. Les deux signaux s’alignent : c’est LE moment de pousser pour boucler l’objectif focus. » C’est le pendant EXACT, côté focus, de la note sport « objectif serré ET charge en sous-charge » : le focus n’a pas de charge, mais une tête reposée encaisse un gros bloc de concentration comme un corps frais encaisse une séance. La note n’apparaît que sur ce cas précis (objectif focus serré ET readiness au vert le jour même) ; rien d’autre ne change.' },
  { v: '2.0.139', emoji: '🟢', text: 'Quand ton coach « Le focus du moment » repère l’alignement « objectif serré ET charge en sous-charge » (nouveauté récente : deux feux verts, le calendrier presse pendant que ton corps a de la marge), il sait maintenant reconnaître le cas encore plus favorable : quand, EN PLUS, ta forme REMONTE franchement relevé après relevé. Ce ne sont alors plus deux lectures d’un même moment, mais TROIS signaux concordants qui se cumulent — charge basse (marge structurelle) + forme qui rebondit (ton corps réencaisse, en direct) + cadence serrée (le calendrier réclame). Le coach le dit alors plus enthousiaste : « Et bonne nouvelle : cette cadence serrée tombe pile — ta charge n’est qu’à 0,6× ton volume habituel ET ta forme remonte franchement (+30 pts sur tes derniers check-ins) : trois feux verts concordants (charge basse, forme qui rebondit, calendrier qui presse), pas un hasard — c’est LE moment de pousser pour boucler l’objectif, ton corps est prêt. » C’est le pendant POSITIF exact de la note « pic de charge ET forme qui glisse » (deux signaux de fatigue) : ici, deux/trois signaux de fraîcheur. Quand la forme ne remonte pas, le message reste le même qu’avant. L’action de sous-charge reste intacte.' },
  { v: '2.0.138', emoji: '🚀', text: 'Ton coach « Le focus du moment » ne sait pas que trancher les conflits : il sait aussi reconnaître quand tout s’ALIGNE. Quand ton objectif hebdo de séances est SERRÉ (« il en faut une chaque jour pour tenir l’objectif ») ET que ta charge des dernières semaines est en SOUS-charge (ton corps a de la marge pour remonter), les deux ne se contredisent plus — ils tirent dans le même sens. Le coach le nomme : « Et bonne nouvelle : cette cadence serrée tombe pile — ta charge n’est qu’à 0,6× ton volume habituel, ton corps a toute la marge pour enchaîner ces séances sans risque. Les deux signaux s’alignent : c’est LE moment de pousser pour boucler l’objectif. » C’est le pendant POSITIF exact de la note « pic de charge, lève le pied » : quand le calendrier presse ET que le corps est frais, c’est une fenêtre à saisir, pas un conflit. La note n’apparaît que sur ce cas précis (objectif serré ET sous-charge) ; l’action de sous-charge reste intacte.' },
  { v: '2.0.137', emoji: '🪫', text: 'Quand ton coach « Le focus du moment » tranche entre ton objectif serré et ta CHARGE en pic (nouveauté récente), il sait maintenant reconnaître le cas le plus sérieux : quand, EN PLUS du pic de charge, ta forme GLISSE relevé après relevé. Ce ne sont alors plus deux lectures d’un même instant, mais deux signaux de fatigue qui se CUMULENT — charge cumulée trop haute ET récup qui décroche. Le coach le dit alors plus fermement : « Mais ta charge est en pic cette semaine (2,3× ton volume habituel) ET ta forme glisse en parallèle (-18 pts sur tes derniers check-ins) : deux signaux de fatigue qui se cumulent, pas un coup de mou isolé. Laisser l’objectif hebdo glisser n’est plus prudent, c’est la seule option saine — consolide, protège-toi, tu repars bien plus solide. » Quand un seul des deux signaux est là, le message reste le même qu’avant. Rien d’autre ne change, l’action de charge reste intacte.' },
  { v: '2.0.136', emoji: '🏋️', text: 'Quand ton coach « Le focus du moment » pousse ton SPORT, il désamorce un SECOND conflit du même type que le précédent — cette fois entre ton objectif serré et ta CHARGE. Jusqu’ici, si ton objectif hebdo était SERRÉ (« il en faut une chaque jour pour tenir l’objectif ») ET que ta charge des 7 derniers jours était en PIC (« allège aujourd’hui, semaine de consolidation »), le coach te poussait à enchaîner tous les jours ET à lever le pied. Désormais il TRANCHE : « Mais ta charge est en pic cette semaine (2,3× ton volume habituel) : tempérer prime sur le chiffre — empiler une séance chaque jour sur un corps déjà en zone de blessure serait le pire choix. Laisse l’objectif glisser, consolide, tu repars plus solide. » Un pic de charge est un signal de risque encore plus net qu’une mauvaise forme d’un jour : laisser l’objectif hebdo glisser une semaine ne coûte presque rien à côté d’une blessure. La note n’apparaît que sur ce conflit précis (objectif serré ET charge en pic).' },
  { v: '2.0.135', emoji: '🛌', text: 'Quand ton coach « Le focus du moment » pousse ton SPORT, il ne te donne plus deux consignes contradictoires le même jour. Jusqu’ici, si ton objectif hebdo était SERRÉ (« il en faut une chaque jour pour tenir l’objectif ») ET que ta forme du jour était à plat (« récupération prioritaire, pas de grosse séance aujourd’hui »), le coach te disait à la fois de pousser tous les jours ET de te reposer. Désormais il TRANCHE, honnêtement : « Mais ta forme est à plat aujourd’hui (readiness 15/100) : la récup prime sur le chiffre — mieux vaut manquer la séance du jour et laisser l’objectif glisser que de forcer sur une réserve vide, tu repars plus fort. » La récup passe avant le compteur : rater une séance quand le corps dit stop vaut mieux qu’une blessure. La note n’apparaît que sur ce conflit précis (objectif serré ET forme au plancher) — un objectif déjà hors de portée dit déjà « repars plein lundi », et un objectif large n’a aucun conflit.' },
  { v: '2.0.134', emoji: '🧠', text: 'Quand ton coach « Le focus du moment » pousse ton FOCUS, ton objectif hebdo de minutes ne se contente plus d’afficher un compteur (« 25/120 min ») : il te donne maintenant la CONDUITE du jour, comme il le fait déjà pour tes séances de sport. Il regarde combien de minutes il te reste à faire et sur combien de jours, puis te dit la marche à suivre. Dans les temps : « ~15 min/jour sur les 6 jours restants et l’objectif tombe — tu as la marge. » Et quand ça se resserre (dernier jour, gros reste) : « Serré : 90 min restantes pour 1 jour — cale un vrai bloc d’~90 min chaque jour pour tenir la cible. » Comme les minutes de focus s’accumulent (aujourd’hui compte toujours), pas de faux « hors de portée » : juste deux registres honnêtes, marge ou serré. Un objectif déjà atteint garde son « 💪 » habituel.' },
  { v: '2.0.133', emoji: '💧', text: 'Quand ton coach « Le focus du moment » pousse ta NUTRITION, ton HYDRATATION gagne à son tour une conscience de tendance — le dernier intrant nutrition qui ne parlait que du présent. Jusqu’ici l’eau n’avait que sa jauge du jour ; sa RÉGULARITÉ d’une semaine à l’autre restait muette. Désormais, quand tes protéines n’ont rien de neuf à signaler, le coach regarde l’eau : « Et côté hydratation, ça suit : 6 jours à tes 8 verres cette semaine vs 3 la précédente (+3) — cette régularité soutient ta récup », ou, si ça glisse, « Côté hydratation en revanche, ça décroche : 3 jours à tes 8 verres cette semaine vs 6 la précédente (-3) — un verre régulier soutient récup et satiété. » Un seul intrant parle à la fois : protéines d’abord (ton levier), l’eau en relais — c’est de la priorisation, pas un mur de texte. La note ne contredit jamais une série protéines que tu tiens, marche même sans profil complet, et n’apparaît qu’avec une semaine précédente renseignée.' },
  { v: '2.0.132', emoji: '🍗', text: 'Quand ton coach « Le focus du moment » pousse ta NUTRITION, il ne regarde plus seulement ta régularité protéines DU MOMENT (ta série en cours, ou ton « N/7 cette semaine ») — il lit maintenant dans quelle DIRECTION elle va. Deux « 4/7 » n’appellent pas le même mot selon que ta régularité DÉCOLLE (4 jours à la cible cette semaine contre 1 la précédente) ou S’EFFRITE (4 contre 7). Désormais, quand elle grimpe, il te crédite : « Et ta régularité grimpe : 5 jours à la cible cette semaine vs 2 la précédente (+3) — la dynamique est bonne, garde le cap. » Et quand elle glisse (hors série en cours), il t’alerte sans gronder : « Mais ta régularité s’effrite : 3 jours à la cible cette semaine vs 6 la précédente (-3) — un jour réglé aujourd’hui enraye la glissade. » La note enrichit ton conseil protéines sans jamais le remplacer, ne contredit jamais une série que tu tiens, et n’apparaît qu’avec une semaine précédente renseignée.' },
  { v: '2.0.131', emoji: '🔥', text: 'Quand ton coach « Le focus du moment » repère que ta balance CALE (elle ne descend plus, ou repart à l’envers), il ne se contente plus d’un « baisse un peu tes calories » vague : il te donne maintenant le NOMBRE. En croisant ton plan calorique du jour avec la stagnation confirmée sur ~14 jours, il cite la cible concrète — « Mais la balance ne descend plus (0 kg/sem sur tes dernières pesées) — vise ~2126 kcal/j (environ 125 de moins) ou ajoute du cardio pour relancer. » Si tu es déjà au plancher calorique, il te réoriente honnêtement vers le cardio plutôt qu’une énième baisse. Ça marche dans les deux sens (perte comme prise : « ~X kcal/j de plus ») et reste silencieux tant que ton profil (taille, âge…) n’est pas assez complet pour calculer une vraie cible — dans ce cas le conseil qualitatif d’avant reste affiché. C’est le même chiffre que ta carte « Coach Poids » te propose déjà, désormais aussi dans le focus du jour.' },
  { v: '2.0.130', emoji: '⚖️', text: 'Quand ton coach « Le focus du moment » pousse ta NUTRITION, il ne regarde plus seulement le chemin déjà parcouru vers ton objectif de poids — il lit maintenant dans quelle DIRECTION va ta balance EN CE MOMENT. Son « 50% de ton objectif atteint » te disait le cumul depuis le départ, mais restait aveugle au présent : deux « 50% » n’appellent pas le même mot selon que ton poids PROGRESSE ENCORE ou STAGNE (le plateau classique, où le pourcentage global te rassure à tort). Désormais, quand tes dernières pesées vont dans le bon sens, il te projette : « À ton rythme récent (0,5 kg/sem), tu touches ta cible dans ~6 semaines — tiens le cap. » Et quand ça cale ou repart à l’envers, il recadre côté calories : « Mais la balance ne descend plus (0 kg/sem sur tes dernières pesées) — baisse un peu tes calories ou ajoute du cardio pour relancer », ou « Mais tes dernières pesées repartent à la hausse (+0,3 kg/sem) — resserre tes calories pour reprendre la perte » (adapté à ton sens d’objectif, perte comme prise). La note ne remplace jamais ton conseil protéines : elle l’enrichit, et n’apparaît qu’avec au moins deux pesées exploitables.' },
  { v: '2.0.129', emoji: '🧠', text: 'Ton coach « Le focus du moment » lit maintenant la PENTE de ton FOCUS — le seul pilier qui n’avait encore aucune conscience de tendance. Il te nommait déjà ton chantier phare et calait la durée de ton bloc, mais restait aveugle à ton VOLUME de concentration : deux « 3 jours actifs » n’appellent pas le même mot selon que tes minutes de focus montent ou s’effritent. Désormais, quand ton focus s’essouffle et que tes minutes RECULENT vs la semaine d’avant, il quantifie la chute et t’invite à inverser la pente : « Tes minutes de focus reculent : 300 → 90 min cette semaine (-210 min) — un bloc aujourd’hui inverse la pente. » Et quand ton focus monte en régime avec des minutes en HAUSSE, il crédite la montée : « Et le volume grimpe : 60 → 240 min de focus cette semaine (+180 min) — tu montes en puissance, garde le cap. » La note ne s’affiche que quand la pente va dans le même sens que le constat (jamais de contradiction), et seulement si la semaine précédente est renseignée.' },
  { v: '2.0.128', emoji: '🛏️', text: 'Ton coach « Le focus du moment » lit maintenant la PENTE de la RÉGULARITÉ de ton coucher, pas seulement celle de la durée. Il regardait déjà si tes nuits rallongent ou raccourcissent ; il ignorait un autre signal circadien : ton heure de coucher se resserre-t-elle sur un créneau fixe, ou s’éparpille-t-elle de plus en plus d’un soir à l’autre ? Désormais, quand ton sommeil a besoin de travail et que ta durée n’a rien signalé de franc, il regarde la dispersion de tes couchers vs la semaine d’avant : s’ils se DISPERSENT, il alerte (« Et ton coucher se disperse : de ±20 à ±75 min d’un soir à l’autre (+55 min) — ré-ancre une heure fixe avant que le rythme ne parte ») ; s’ils se RESSERRENT, il crédite (« Bon signe : ton coucher se régularise (de ±70 à ±25 min d’un soir à l’autre, -45 min) — l’ancre circadienne se pose, tiens le cap »). Une seule note de pente à la fois (la durée reste prioritaire), et rien ne change quand ton sommeil est déjà solide ou que tes couchers restent stables.' },
  { v: '2.0.127', emoji: '😴', text: 'Quand ton coach « Le focus du moment » pousse ton SOMMEIL, il ne te donne plus seulement un état des lieux — il regarde maintenant dans quelle DIRECTION vont tes nuits. Son bilan te disait comment tu dors en ce moment (durée moyenne, dette, régularité) mais restait aveugle à la pente : deux « moy. 6,5 h » n’appellent pas le même mot selon que tes nuits remontent ou s’enfoncent. Désormais, quand ton sommeil a besoin de travail et que tes nuits se DÉGRADENT vs la semaine d’avant, il alerte : « Et la pente s’enfonce : tes nuits sont passées de 7 à 6,1 h (-0,9 h vs la semaine précédente) — enraye maintenant, avant que la dette ne s’installe. » Et quand elles REMONTENT, il te crédite pour tenir le cap, même si le total reste court : « Bonne nouvelle : ça remonte (+0,8 h, de 5,9 à 6,7 h vs la semaine précédente) — tu es sur la bonne pente, tiens le cap encore quelques soirs. » Rien ne change quand ton sommeil est déjà solide, ou tant que tes nuits restent stables.' },
  { v: '2.0.126', emoji: '🌱', text: 'Ton coach « Le focus du moment » repère maintenant quand tu es EN SOUS-CHARGE — le pendant positif de la charge qui bondit. Il te tempérait déjà quand ton volume s’envolait trop vite (risque de blessure) ; il restait muet dans le cas inverse, pourtant idéal : quand ta semaine tourne nettement SOUS ton volume habituel, ton corps a de la marge pour remonter. Désormais, quand ton entraînement est bien en dessous de ta base (ratio aigu/chronique bas), il t’invite à rebâtir progressivement au lieu de rester en dessous : « Tu es en sous-charge : ta semaine est à 0,6× ton volume habituel — ton corps a de la marge pour remonter. Rajoute un peu de volume aujourd’hui (une série, 10 min) et reviens progressivement vers ta base (≤ 10 %/semaine), tu construis sans risque de blessure. » Et si ta forme remonte en même temps, il double le feu vert : « Fenêtre idéale : ta forme remonte ET ta charge est à 0,6× ton volume habituel… le bon moment pour rebâtir du volume. » Il reste prudent : rien ne change si ta forme glisse, si ta readiness te dit de récupérer, ou si tu reprends après une longue coupure (là il te propose d’abord un tout petit pas).' },
  { v: '2.0.125', emoji: '📈', text: 'Ton coach « Le focus du moment » remarque maintenant aussi quand ta forme REMONTE — le pendant positif de la fatigue qui s’installe. Une readiness « correcte » (autour de 50-74) le poussait à te dire « séance correcte, mais garde une marge : pas de record » — un plafond prudent qui, quand ta forme grimpe franchement check-in après check-in (retour de vacances, deload qui paie, sommeil qui se recale), sous-vend ta récupération réelle. Désormais, quand tes derniers relevés montent nettement (au moins 12 points gagnés sur 4 check-ins ou plus) alors que le jour même reste « moyen », il te le dit et t’invite à en profiter : « Readiness 70/100 aujourd’hui — et ta forme remonte franchement sur tes 5 derniers check-ins (+30 pts) : ton corps réencaisse. Tu peux réhausser un peu l’intensité aujourd’hui, sans viser le record d’un coup — la marge revient. » Un pic de charge récent reprend la main s’il y en a un (réencaisser ne veut pas dire ajouter du volume brutalement). Rien ne change si ta forme est stable, déjà au vert ou déjà basse.' },
  { v: '2.0.124', emoji: '📉', text: 'Ton coach « Le focus du moment » repère maintenant la FATIGUE QUI S’INSTALLE, pas seulement ta forme du jour. Il calait déjà l’intensité sur ta readiness du matin — mais une readiness « correcte » (autour de 55-70) qui GLISSE check-in après check-in cache un surmenage naissant que le score d’un seul jour sous-estime. Désormais, quand ta forme descend franchement sur tes derniers relevés (au moins 12 points perdus sur 4 check-ins ou plus) alors que le jour même semble juste « moyen », il le nomme au lieu de te dire « séance correcte » : « Readiness 60/100 aujourd’hui — correcte en soi, mais ta forme glisse sur tes 5 derniers check-ins (-40 pts) : ce n’est pas un creux d’un soir, c’est de la fatigue qui s’accumule. Séance allégée aujourd’hui, et soigne ta récup avant de taper dans le rouge. » Il ne t’escalade plus vers « une vraie séance » ces jours-là, même en pleine reprise. Rien ne change si ta forme est stable, si le jour est déjà au vert (≥ 75) ou déjà bas (il te dit alors de récupérer).' },
  { v: '2.0.123', emoji: '🩹', text: 'Ton coach « Le focus du moment » surveille maintenant ta CHARGE d’entraînement pour t’éviter la blessure. Il calait déjà l’intensité du jour sur ta readiness (ta forme du matin) — mais restait aveugle à un piège classique : un corps bien reposé qui a brutalement augmenté son volume ces 7 jours reste en zone de risque, là où la readiness seule crierait « pousse ! ». Désormais, quand ta charge récente bondit trop vite par rapport à ton habitude (ratio aigu/chronique élevé), il tempère : forme au vert, il crédite mais redirige vers la qualité (« Forme au vert, mais ta charge a bondi à 2,3× ton volume habituel ces 7 jours — mets l’énergie sur la technique, pas le volume : une semaine de consolidation te blinde sans risque de blessure ») ; sinon il allège franchement (« Charge en hausse brutale : ta semaine est à 2,3× ton volume habituel, et le corps encaisse mal les pics — allège aujourd’hui (-30 % de volume), technique propre, tu repartiras plus fort »). Il ne te propose plus de créneau pour une grosse séance ces jours-là. Rien ne change tant que ta charge reste régulière, ou quand ta readiness te dit déjà de récupérer.' },
  { v: '2.0.122', emoji: '🎯', text: 'Ton coach « Le focus du moment » ne se contente plus d’afficher ton objectif de séances de la semaine — il te dit s’il est ENCORE JOUABLE et quoi faire pour le tenir. Un « 2/4 séances » ne veut pas dire la même chose un mardi (large) ou un samedi (mort) : le coach calcule maintenant les séances qu’il te reste à caser face aux jours restants avant dimanche, et adapte le message. De la marge : « Dans les temps : 2 séances en 5 jours restants — tu as la marge pour boucler l’objectif hebdo. » Serré : « Serré mais jouable : 3 séances pour 3 jours restants — il en faut une chaque jour pour tenir l’objectif. » Hors de portée : « L’objectif de 4 ne passera plus cette semaine (3 séances pour 2 jours restants) — engrange ce que tu peux, tu repars plein lundi. » Un objectif chiffré selon le temps qui reste guide mieux qu’un compteur figé — sans jamais culpabiliser quand la semaine est trop courte. Rien ne change si tu n’as pas fixé d’objectif de séances ou s’il est déjà tenu.' },
  { v: '2.0.121', emoji: '🌱', text: 'Ton coach « Le focus du moment » salue maintenant ta REPRISE dès ses premiers pas. Il brandissait déjà une série en jeu à partir de 3 jours d’affilée — mais la marche la plus fragile d’un retour, celle des 2 premiers jours après une rupture, ne recevait rien. Désormais, quand une série repart (2 ou 3 jours d’affilée) alors que tu as déjà tenu bien plus long par le passé (au moins une semaine), il nomme la reconstruction et te redonne un cap : « 🌱 Tu reconstruis : 2 jours d’affilée sur ton entraînement, tu retrouves le chemin de ta meilleure série (record perso : 12 jours). Le plus dur — repartir — est derrière toi, une marche à la fois. » Repartir après une chute demande plus de cran que tenir : c’est le moment où l’encouragement compte le plus. Il n’en parle que si tu avais vraiment bâti quelque chose à retrouver.' },
  { v: '2.0.120', emoji: '⚖️', text: 'Quand ton coach « Le focus du moment » pousse ta NUTRITION, il relie enfin ta discipline du jour à ton RÉSULTAT CORPOREL réel. Jusqu’ici il parlait cible protéines, collation, série — mais restait aveugle à ton objectif de poids et à sa progression, le « pourquoi » de tout l’effort. Désormais, si tu as fixé un poids cible et que tes pesées le permettent, il cite l’avancement réel : bien avancé, il te crédite (« Et ça paie : 62% de ton objectif de perte atteint (3,7 kg sur 6) — ta nutrition en est le moteur ») ; en chemin, il t’encourage (« Ton objectif de perte avance (28%…) — chaque jour réglé sur ta cible rapproche le résultat ») ; pas encore de résultat, il recadre sans culpabiliser et t’invite à te peser (« Ta cible de perte (6 kg) attend encore un premier résultat — ces jours de nutrition régulière sont exactement ce qui la débloque »). Un « pourquoi » chiffré et personnel motive plus qu’un compteur isolé. Sans objectif de poids ou sans pesée exploitable, rien ne change.' },
  { v: '2.0.119', emoji: '🏆', text: 'Ton coach « Le focus du moment » brandit maintenant ton RECORD PERSO quand ta série en jeu s’en approche. Il nommait déjà la série que tu risques de perdre et le palier fixe à décrocher, mais restait aveugle à ta plus longue série jamais tenue sur un pilier — le levier le plus intime. Désormais, quand cette série en jeu touche ton record (au moins une semaine d’affilée dans ton histoire), il le rappelle : si ton run actuel EST déjà ton record, « 🏆 Et là tu bats ton record perso sur ton entraînement : jamais tu n’avais tenu autant de jours d’affilée » ; s’il approche un record passé (à trois jours près), « Ton record perso ici est de 10 jours d’affilée — encore 2 jours pour l’égaler. » Battre sa propre meilleure série fait agir plus fort qu’un jalon générique. Il n’en parle que d’un record notable, et jamais le même jour qu’un palier (une seule carotte à la fois).' },
  { v: '2.0.118', emoji: '💚', text: 'Ton coach « Le focus du moment » adapte maintenant sa CONSOLATION à la TAILLE de la série que tu viens de casser. Il te réconfortait déjà quand un pilier retombait après une vraie série, mais du même ton pour 4 jours perdus que pour un mois. Désormais il gradue : une série qui avait franchi le palier de la semaine (au moins 7 jours d’affilée) pèse plus lourd, alors il nomme la magnitude et lui rend justice — « Tu tenais une semaine entière d’affilée sur ton entraînement avant cette pause — ça, c’est du solide : pas un échec, une vraie base à relancer. Un geste aujourd’hui et tu repars de haut. » Pour une série plus courte (4 à 6 jours), il garde le ton léger « une série vite relancée ». Reconnaître un vrai capital perdu à sa juste valeur motive plus qu’un mot passe-partout.' },
  { v: '2.0.117', emoji: '💚', text: 'Ton coach « Le focus du moment » te console au lieu de te gronder quand une belle SÉRIE vient de casser. Il savait déjà brandir une série encore vivante que tu risques de perdre ; côté correction, il ne faisait que constater le recul. Désormais, quand il te ramène sur un pilier que tu as laissé retomber APRÈS avoir tenu une vraie série (au moins 4 jours d’affilée, close il y a peu), il reconnaît l’acquis plutôt que de te reprocher la pause : « Tu tenais 5 jours d’affilée sur ton entraînement avant cette pause — pas un échec, une série à relancer : un geste aujourd’hui et tu repars. » Perdre une série n’est pas repartir de zéro : nommer ce que tu avais bâti transforme la culpabilité (« j’ai lâché ») en élan (« je repars de là »). Il n’en parle que si la série était réelle et la coupure encore fraîche.' },
  { v: '2.0.116', emoji: '🏅', text: 'Ton coach « Le focus du moment » double le levier quand ta série en jeu touche un PALIER. Il te rappelait déjà qu’une série de jours d’affilée sur un pilier risque de tomber si tu ne poses pas ton geste aujourd’hui ; désormais, quand ce geste te ferait franchir PILE un palier (une semaine, deux semaines, un mois, 60 jours…), il ajoute la carotte au bâton : « Ta série de 6 jours d’affilée sur ton entraînement est en jeu — un seul geste aujourd’hui la garde vivante. Et ce geste décroche le palier d’une semaine ! 🏅 » Ne pas perdre sa série ET décrocher un jalon dans la foulée : deux ressorts qui tirent dans le même sens font agir plus fort qu’un seul. Il ne l’ajoute que le jour où le palier est vraiment à portée d’un geste.' },
  { v: '2.0.115', emoji: '🔥', text: 'Ton coach « Le focus du moment » brandit désormais tes SÉRIES en jeu. Quand il renforce un pilier qui tourne bien et que tu enchaînes déjà plusieurs jours d’affilée dessus sans encore avoir posé ton geste du jour, il ne se contente plus d’un « garde le rythme » abstrait : il nomme le capital que tu risques de perdre. « Ton entraînement monte en régime… 🔥 Ta série de 6 jours d’affilée sur ton entraînement est en jeu — un seul geste aujourd’hui la garde vivante. » Perdre une série fait agir plus fort que gagner un jour de plus : le coach s’appuie sur ce ressort. Il ne parle que d’une vraie série (au moins 3 jours) encore vivante, et se tait dès que ton geste du jour est posé — la série est alors prolongée, plus menacée.' },
  { v: '2.0.114', emoji: '📈', text: 'Ton coach « Le focus du moment » fait maintenant GRANDIR le geste au fil d’une reprise, au lieu de te répéter « encore un jour actif ». Après une relance amorcée (un pilier rallumé après un long silence), il adapte l’ask au stade de la reprise. Encore fragile — un seul geste depuis la reprise —, il protège l’étincelle plutôt que de pousser : « Ne force pas le rythme : un 2e jour actif cette semaine ancre l’étincelle mieux qu’une grosse séance. » Dès que la reprise tient — deux jours actifs ou plus —, il remonte la barre vers la normale : « La reprise tient (2 jours cette semaine) — tu as regagné le droit à une vraie séance aujourd’hui. » Pour le sport, il respecte ta readiness du jour : un jour de récup garde le geste léger. Après le premier pas d’un pilier dormant puis le salut de la reprise, c’est le troisième temps : accompagner l’élan jusqu’au rythme normal.' },
  { v: '2.0.113', emoji: '🔥', text: 'Ton coach « Le focus du moment » sait maintenant SALUER une relance amorcée. Il savait proposer le tout premier pas d’un pilier resté dormant ; désormais, quand tu l’honores — un geste frais qui rompt un silence d’au moins deux semaines —, il reconnaît la victoire : « Tu as rallumé ton entraînement il y a 2 j après 29 jours d’arrêt — le plus dur (franchir la reprise) est fait, ne laisse pas la flamme retomber. » Franchir le mur d’activation après une longue coupure est l’instant le plus fragile ET le plus méritant d’une reprise : le nommer ancre la victoire et protège l’élan naissant.' },
  { v: '2.0.112', emoji: '🌱', text: 'Ton coach « Le focus du moment » adapte désormais son geste à la DURÉE d’une coupure. Quand un pilier est resté dormant deux semaines ou plus, il ne te sort plus le « programme une séance courte » habituel — intimidant après une longue pause : il propose un tout premier pas MINUSCULE, proportionné, en nommant la coupure pour que l’effort demandé paraisse juste. « Après 26 jours sans focus, un seul bloc de 10 min sur une tâche facile — juste pour recréer le réflexe. » Au-delà de 3 semaines, il déculpabilise franchement : « On ne rouvre pas le chantier aujourd’hui, on rallume la lampe. » Après une longue coupure, rallumer la mèche compte plus que l’intensité. Il coupe alors la suggestion de créneau (« cale ta séance à 14:30 » contredirait « juste 5 min ») et laisse le micro-pas primer quand c’est plutôt un conseil ignoré.' },
  { v: '2.0.111', emoji: '🛏️', text: 'Ton coach « Le focus du moment » ne se contente plus d’ALERTER quand un rendez-vous du soir menace ta cible de coucher : il te donne le geste concret. Si le rendez-vous finit APRÈS ta cible — l’heure visée devient intenable ce soir —, il propose l’heure de coucher réaliste à viser à la place, calée sur sa fin : « « Dîner famille » (à partir de 21:30) finit vers 22:50, après ta cible de 22:30 — couche-toi dès sa fin plutôt que de repousser encore, tu protèges ta fenêtre du soir. » Viser un coucher tenable limite la casse mieux qu’un « couche-toi à 22:30 » impossible à honorer. Si le rendez-vous finit juste avant ta cible, elle tient encore : file au lit dès la fin, sans écran.' },
  { v: '2.0.110', emoji: '🏅', text: 'Ton coach « Le focus du moment » fête désormais tes PALIERS de journées complètes, comme il fête déjà tes séries quotidiennes. Quand ta série de journées à 3+ piliers franchit pile un jalon — 3, 7 (une semaine pleine !), 14, 30 jours —, il le débloque : « 7 jours d’affilée à 3+ piliers — tu enchaînes les journées complètes. 🔥 🏅 Palier franchi : une semaine complète de journées pleines ! » Et quand le prochain palier est à un seul jour, il te donne le cap à tenir demain : « Encore 1 jour pour franchir le palier des 7. 🎯 » La fierté d’hier devient l’objectif de demain.' },
  { v: '2.0.109', emoji: '🧭', text: 'Ton coach « Le focus du moment » nuance désormais la GRAVITÉ des piliers qui décrochent. Un pilier laissé à l’abandon depuis deux semaines n’appelle pas le même geste qu’un simple creux : le coach le dit. Au lieu de tout mettre sur « faiblit », il distingue « à l’arrêt » (dormant, à relancer) de « faiblit » (en léger recul, à rattraper) : « Ton entraînement s’essouffle… Ton sommeil est à l’arrêt aussi cette semaine — celui-ci d’abord. » Et si les deux se mélangent, il précise l’état de chacun : « Ta nutrition (en recul) et ton focus (à l’arrêt) décrochent aussi cette semaine. » Mêmes garde-fous : il se tait quand il varie d’angle, abaisse la barre ou quand le geste est déjà fait.' },
  { v: '2.0.108', emoji: '🔥', text: 'Ton coach « Le focus du moment » ne salue plus seulement UNE belle journée : il célèbre ta SÉRIE. Quand tu as déjà coché au moins 3 de tes 4 piliers aujourd’hui et que tu enchaînes plusieurs journées complètes d’affilée, il te le rend : « Séance déjà faite aujourd’hui 💪 … 3 jours d’affilée à 3+ piliers — tu enchaînes les journées complètes. 🔥 » Reconnaître qu’on TIENT la régularité motive plus que féliciter un jour isolé. Il reste discret : la célébration de série n’apparaît que les jours vraiment complets, jamais en même temps qu’une alerte « celui-ci d’abord ».' },
  { v: '2.0.107', emoji: '🌙', text: 'Ton coach « Le focus du moment » protège désormais ta fenêtre de coucher le soir, comme il cale déjà tes blocs de focus et de sport. Quand un plan de recalage du sommeil est actif et qu’un rendez-vous horaire de ta journée finit trop tard — sur ta cible de coucher ou dans les 30 min de sas juste avant —, il le repère et t’alerte : « Vise un coucher à 22:30 ce soir (ton plan de recalage). « Dîner famille » (à partir de 20:30) mord sur ta cible de 22:30 — protège ta fenêtre du soir. » Le premier saboteur d’un plan de recalage, c’est un soir qui déborde : le coach le voit venir dans ta vraie journée.' },
  { v: '2.0.106', emoji: '🎉', text: 'Ton coach « Le focus du moment » ne fait plus que pointer ce qui décroche : il SALUE désormais tes journées bien remplies. Quand ton geste du jour est déjà posé (ou qu’il renforce un bon élan) et que tu as en réalité déjà coché plusieurs piliers aujourd’hui, il te le rend : « Séance déjà faite aujourd’hui 💪 … 3/4 de tes piliers déjà cochés aujourd’hui — belle journée complète. 🎯 » Le pendant positif de la priorisation : il nomme ce qui tient, pas seulement ce qui flanche. Complémentaire — jamais en même temps qu’une alerte « celui-ci d’abord ».' },
  { v: '2.0.105', emoji: '🧭', text: 'Ton coach « Le focus du moment » ne se contente plus de COMPTER les autres piliers qui décrochent — il les NOMME. Au lieu de « 2 autres piliers faiblissent aussi cette semaine », il te dit lesquels surveiller ensuite, dans l’ordre de gravité : « Ton entraînement s’essouffle… Ton focus et ta nutrition faiblissent aussi cette semaine — celui-ci d’abord, c’est ton levier prioritaire. » Tu sais quoi attaquer en premier ET ce qui vient juste après. Mêmes garde-fous : il se tait quand il varie d’angle, abaisse la barre ou quand le geste est déjà fait.' },
  { v: '2.0.104', emoji: '🧭', text: 'Ton coach « Le focus du moment » te dit maintenant par quoi COMMENCER quand plusieurs piliers décrochent en même temps. Jusqu’ici il en choisissait un — le plus prioritaire, trié par gravité — mais sans le dire : tu ne voyais qu’un conseil, sans savoir que d’autres pans faiblissaient aussi. Il rend le choix explicite : « Ton entraînement s’essouffle… 2 autres piliers faiblissent aussi cette semaine — celui-ci d’abord, c’est ton levier prioritaire. » Ne pas tout attaquer d’un coup, commencer par le bon levier. Il se tait quand il varie d’angle, abaisse la barre ou quand le geste est déjà fait.' },
  { v: '2.0.103', emoji: '🏋️', text: 'Ton coach « Le focus du moment » te propose désormais un vrai créneau pour ta SÉANCE aussi, pas seulement pour ton focus : quand il te pousse sur l’entraînement et que ta journée a déjà un planning horaire, il regarde ton agenda, cale la durée sur ta séance type (médiane de tes 14 derniers jours) et te dit où l’insérer. « Ton entraînement s’essouffle… Créneau libre à 17:30 aujourd’hui — cale ta séance là. » Il contourne tes rendez-vous, et se tait les jours de récup (readiness basse) ou quand ta séance est déjà faite. Le « quand » gagne aussi le sport.' },
  { v: '2.0.102', emoji: '🗓️', text: 'Ton coach « Le focus du moment » ne te dit plus seulement QUOI faire, mais QUAND : quand il te pousse sur ta concentration, il regarde ton agenda du jour et te propose un vrai créneau libre pour caler ton bloc. « Reprends « Compta »… — un bloc de 45 min suffit à relancer. Créneau libre à 14:30 aujourd’hui — cale ton bloc là. » Il contourne tes rendez-vous et ne suggère un horaire que si ta journée a déjà un planning — sinon il te laisse juger. Une bonne intention devient un plan exécutable inséré dans ta vraie journée.' },
  { v: '2.0.101', emoji: '🎯', text: 'Ton coach « Le focus du moment » arrête de te proposer « un bloc de 25 min » au hasard : quand il te pousse sur ta concentration, il cale la durée du bloc sur TA durée habituelle réelle — la médiane de tes sessions de focus des 14 derniers jours. « Reprends « Compta », ton chantier de focus phare — un bloc de 45 min (ta durée habituelle) suffit à relancer. » Un bloc taillé pour toi est plus crédible et plus facile à lancer qu’un chiffre générique. Sans historique suffisant, il garde le repère de 25 min.' },
  { v: '2.0.100', emoji: '✅', text: 'Ton coach « Le focus du moment » ne te répète plus un ordre que tu as déjà exécuté : quand il pousse ton entraînement ou ton focus alors que tu as DÉJÀ posé ta séance (ou ton bloc) aujourd’hui, il te crédite au lieu de radoter « programme une séance ». « Séance déjà faite aujourd’hui 💪 — verrouille avec 5 min d’étirements, le reste c’est de la récup bien méritée. » Il coupe aussi la micro-marche (« tu ignores mes caps ») les jours où le geste est justement là. Sommeil et nutrition gardent leur conseil du jour (le coucher de ce soir, la cible protéines) — eux ne sont pas « déjà bouclés » pour autant.' },
  { v: '2.0.99', emoji: '🧠', text: 'Ton coach « Le focus du moment » ne te dit plus « lance une session » dans le vide : quand c’est ta concentration qui décroche (ou qui monte), il regarde SUR QUOI tu passes vraiment tes blocs de focus et te nomme ta tâche phare. « Reprends « Compta », ton chantier de focus phare (115 min sur 14 j) — un bloc de 25 min suffit à relancer. » Reprendre un chantier connu coûte moins que repartir de zéro. Le focus était le dernier pilier générique du coach : il parle désormais chiffres et concret sur les quatre (sport, sommeil, nutrition, focus).' },
  { v: '2.0.98', emoji: '🩺', text: 'Ton coach « Le focus du moment » ne te dit plus « fais une grosse séance » sans regarder ta forme du jour : quand il te pousse sur l’entraînement ET que tu as fait ton check-in de récup aujourd’hui, il cale son conseil sur ta readiness. Au plancher, il t’oriente vers mobilité/marche/technique légère plutôt qu’une grosse séance (récupérer aussi, ça progresse). Au vert, il te donne le feu vert pour pousser — c’est le jour d’une vraie séance. Entre les deux, séance mesurée, pas de record. Un coach qui adapte l’intensité à ton corps, pas juste au calendrier.' },
  { v: '2.0.97', emoji: '🙌', text: 'Ton coach « Le focus du moment » sait aussi te féliciter au bon moment : quand tu es en forme sur un pilier ET que tu as bien suivi ses conseils ces derniers jours, il ne dit plus juste « garde le rythme ». Il te crédite pour de vrai — « tu as tenu 5/6 de mes caps cette semaine, cet élan c’est toi qui le construis ». Le pendant positif du coach qui abaisse la barre quand tu décroches : ici il te renvoie le mérite quand tu assures.' },
  { v: '2.0.96', emoji: '🧗', text: 'Ton coach « Le focus du moment » remarque maintenant quand tu le laisses parler dans le vide : s’il t’a déjà poussé deux fois sur le même point (ton sport, ton focus, ton sommeil, ta nutrition) sans que rien ne bouge, il arrête de répéter plus fort. Il abaisse la barre et te propose une micro-marche imbattable — « juste 5 min de mouvement », « un seul bloc de 10 min » — en le disant franchement : on abaisse la barre, pas toi. Rouvrir la porte suffit.' },
  { v: '2.0.95', emoji: '🥗', text: 'Ton coach « Le focus du moment » sait enfin parler nutrition pour de vrai : quand c’est ta nutrition qui décroche, il ne se contente plus de « renseigne tes protéines ». Il calcule ta cible du jour (selon ton poids et ton objectif), regarde ce que tu as déjà mangé, et te propose une collation CONCRÈTE pour combler l’écart — « il te reste 40 g de protéines : un shaker de whey fait le job ». Et si tu tiens une série à ta cible, il te le rappelle pour ne pas la casser.' },
  { v: '2.0.94', emoji: '♿', text: 'Accessibilité : les champs de saisie du tableau de bord (nouvelle tâche, nouvelle habitude, tes 3 priorités de vie, tâche du bloc de concentration) portent désormais un vrai nom lu par les lecteurs d’écran, au lieu de ne compter que sur le texte d’exemple qui disparaît dès qu’on écrit. Rien ne change à l’écran — c’est du confort pour qui navigue en audio ou au clavier.' },
  { v: '2.0.93', emoji: '😴', text: 'Ta « Forme du jour » est plus juste : si tu notes ta fatigue et tes courbatures sans remplir les heures de sommeil, le score ne te compte plus une nuit blanche par défaut. Un sommeil laissé vide n’est plus pris pour « 0 h » (la pire note) — il est simplement ignoré, comme partout ailleurs dans l’app. Fini les fausses alertes « récupération prioritaire » juste parce que la case sommeil était vide.' },
  { v: '2.0.92', emoji: '📅', text: 'Le compte à rebours de ta recherche d’alternance vise désormais la RENTRÉE (1er octobre), plus le 1er août — parce que chercher a encore tout son sens en été et jusqu’à la rentrée (beaucoup de contrats démarrent en septembre/octobre). Le compteur reste honnête tout l’été au lieu de retomber d’un coup, et une fois la rentrée là il passe en « dernière ligne droite » plutôt que de s’effondrer.' },
  { v: '2.0.91', emoji: '🔗', text: 'Ton coach relie tout : quand il te pousse sur le sommeil, il te rappelle ta propre preuve — « couche-toi à heure fixe ce soir. Tes soirs couché tôt = +2 d’énergie le lendemain ». Le conseil du soir porte désormais le « pourquoi » chiffré et personnel, pas juste une consigne.' },
  { v: '2.0.90', emoji: '📊', text: 'Nouveau sur ta page Récupération : « L’effet de ton coucher ». L’app compare tes lendemains selon l’heure où tu t’es couché et te montre la preuve chiffrée — « les soirs où tu te couches avant 23:45, ton lendemain a plus d’énergie : 4/5 contre 2/5 ». Le vrai moteur pour tenir ton recalage : voir noir sur blanc que se coucher tôt paie sur ton énergie et ton focus.' },
  { v: '2.0.89', emoji: '😴', text: 'Ton coach « Le focus du moment » connaît enfin ton sommeil. Quand tes nuits sont courtes ET irrégulières, il remonte le sommeil en tête avec le vrai verdict chiffré (moyenne, dette, régularité) au lieu d’un conseil passe-partout. Et si ton plan de recalage est actif, il te donne directement l’heure de coucher à viser ce soir. Les deux systèmes se parlent — jusqu’ici le coach ignorait toute ton intelligence sommeil.' },
  { v: '2.0.88', emoji: '🎯', text: 'Ton coach alternance ne s’arrête plus à « postule » : une fois ta candidature du jour envoyée, il continue à te piloter sur le reste du funnel. S’il y a une entreprise sans réponse depuis 7 jours ou plus, il te dit « Relance {entreprise} — sans réponse depuis N jours ». Et si tu as un entretien dans le pipeline, il te pousse à le préparer. La priorité reste absolue tant que tu n’as pas décroché ta place.' },
  { v: '2.0.87', emoji: '🩹', text: 'Correctif Alternance : « Entretien en entreprise » (et « entretien avec l’entreprise ») n’est plus classé par erreur en « Accepté ». Un mot glissé dans une version récente reconnaissait « pris » à l’intérieur d’« entre-pris-e » et prenait un entretien à venir pour une offre décrochée — ce qui gonflait à tort ton taux de réponse et pouvait « verrouiller » la candidature en accepté. Les vrais « pris/prise/retenu/accepté » restent bien reconnus.' },
  { v: '2.0.86', emoji: '🏃', text: 'Programme auto (onglet Athlète, « Mon programme selon mon objectif ») : le résumé accorde enfin « course » au pluriel quand ton objectif comporte plusieurs courses par semaine — « 4 courses/sem. » au lieu de « 4 course/sem. » (Perte de gras, Endurance, Corps athlétique…). Même correction dans le détail « (X muscu, Y courses) » et dans le programme copié/partagé. Un objectif à une seule course par semaine (Prise de muscle) reste au singulier. Petit détail d’accord — rien ne change au contenu de ton programme.' },
  { v: '2.0.85', emoji: '💼', text: 'Import Alternance (cibles depuis Google Sheets / CSV) : deux colonnes sont mieux reconnues. Un département d’outre-mer entre parenthèses — « (972) », « (974) »… — est désormais compris comme les départements métropolitains « (35) », donc filtrable et ciblable ; auparavant seuls deux chiffres étaient reconnus et les DOM étaient silencieusement ignorés. Et la colonne de score n’est plus confondue quand son en-tête est « Score /100 » (ou contient une autre année/nombre) : seule une note « /10 » est prise pour la colonne /10, ce qui évitait un import qui repartait vide sans explication. Rien ne change pour un tableau « Score /10 » classique avec des villes métropolitaines.' },
  { v: '2.0.84', emoji: '📸', text: 'Progression photo (onglet Croissance, encart « Avant / Après ») : quand tes deux photos comparées ne sont espacées que d’un jour, l’app écrit désormais « 1 jour d’écart » (au singulier) au lieu de « 1 jours d’écart ». Petit détail d’accord, dans la lignée des autres libellés récemment corrigés. Rien ne change au-delà de deux jours d’écart.' },
  { v: '2.0.83', emoji: '🎂', text: 'Anniversaires : dans la liste de gestion des anniversaires, l’âge s’accorde enfin au singulier — « 1 an » et non « 1 ans » pour quelqu’un qui fête son premier anniversaire. Le bandeau « 🎂 À venir » et le calendrier mensuel le faisaient déjà (via le même helper d’accord), mais cette troisième vue écrivait « ans » en dur : les trois vues s’alignent enfin. Rien ne change pour un âge de 2 ans ou plus.' },
  { v: '2.0.82', emoji: '🎯', text: 'Bilan hebdo (« Comment va ma semaine ») : quand il te reste des séances à faire pour ton objectif, le message dit désormais « encore 3 séances pour ton objectif hebdo » (avec le mot « séance » accordé au nombre restant) au lieu du plus sec « encore 3 pour ton objectif hebdo ». Petit détail de libellé, aligné sur le même message ailleurs dans l’app.' },
  { v: '2.0.81', emoji: '🗓️', text: 'Bloc d’entraînement (périodisation sur 4 semaines) : ta semaine de bloc et le nombre de séries de la séance guidée restent justes même la semaine d’un changement d’heure. Au passage à l’heure d’été (fin mars), deux minuits successifs ne sont distants que de 23 h : l’app pouvait alors compter 6 jours là où 7 s’étaient écoulés — te maintenant une semaine en arrière (par ex. semaine 1 « Base » au lieu de semaine 2 « Volume », soit 3 séries prescrites au lieu de 4) ou repoussant d’un jour la fin du bloc. Le décompte se fait désormais en jours calendaires pleins, comme partout ailleurs dans l’app. Rien ne change hors semaine de changement d’heure.' },
  { v: '2.0.80', emoji: '😴', text: 'Bilans de sommeil (bilan hebdo partageable et récap mensuel) : ta durée de sommeil moyenne compte désormais UNE valeur par nuit, même si une nuit a été saisie deux fois (import, restauration de sauvegarde, ou double check-in le même jour). Avant, une nuit relevée en double pesait double dans la moyenne — ce qui faussait ta moyenne affichée et pouvait déclencher à tort (ou masquer) l’alerte « sommeil bas ». Tes autres statistiques de sommeil (bilan récup, dette, courbe) dédupliquaient déjà par date : les bilans hebdo/mensuel s’alignent enfin.' },
  { v: '2.0.79', emoji: '⚖️', text: 'Coach Poids — plan calorique cohérent avec le conseil affiché juste à côté. Quand ton poids cible est à moins de 0,5 kg de ton poids actuel (soit l’ordre de grandeur de ta fluctuation quotidienne eau/sel), le plan indique désormais « Maintenir ton poids » — comme le fait déjà le bloc conseil « recomposition » sur le même écran. Avant, dès 0,3 kg d’écart, le plan basculait en « Perdre X kg » et te prescrivait un vrai déficit calorique (~500 kcal/j) là où le conseil, lui, disait « ton poids bougera à peine » : deux verdicts opposés au même endroit. Les deux s’accordent enfin.' },
  { v: '2.0.78', emoji: '💼', text: 'Alternance — statut « refusé après entretien » : un refus (ou un accord) reçu à l’issue d’un entretien est enfin classé comme état FINAL. Avant, dès que le mot « entretien » apparaissait dans un statut importé ou synchronisé (« Refusé après entretien », « Non retenu à l’entretien »…), la candidature restait bloquée en colonne « Entretien » du funnel au lieu de passer en « Refusé » — ce qui gonflait à tort ton nombre d’entretiens en cours et faussait tes stats. Un vrai entretien À VENIR (« Entretien prévu mardi ») reste bien en « Entretien ».' },
  { v: '2.0.77', emoji: '💪', text: 'Tonnage soulevé (kg total d’une séance, et tout ce qui en découle : « poids soulevé à vie », record séance, record hebdo, graphe « Tonnage muscu · 8 semaines ») : les vieilles séances à l’ancien format (un seul exercice noté directement sur la séance, sans la liste détaillée) pèsent enfin leur vrai tonnage (charge × reps × séries). Avant, une telle séance restaurée ou importée comptait pour 0 kg partout — alors que ta fiche exercice et ton historique, eux, en affichaient déjà le tonnage : deux chiffres pouvaient se contredire. C’est corrigé : ces séances comptent maintenant partout de la même façon. Rien ne change pour tes séances normales.' },
  { v: '2.0.76', emoji: '🏆', text: 'Palmarès de force (musculation) : ton « Palmarès de force » (meilleures séries et 1RM estimé par exercice) prend désormais aussi en compte les vieilles séances à l’ancien format (un seul exercice noté directement sur la séance, sans la liste détaillée). Si une sauvegarde restaurée ou un import contenait ce format, la meilleure série de ces séances était absente du palmarès — alors que tes records perso, eux, la comptaient déjà : deux compteurs pouvaient se contredire côte à côte. C’est corrigé : ces séances comptent maintenant partout de la même façon. Rien ne change pour tes séances normales.' },
  { v: '2.0.75', emoji: '🗓️', text: 'Coach Poids — « Ta semaine type » : quand le dimanche fait partie de tes jours dispo, la semaine s’affiche à nouveau dans l’ordre normal (lundi en tête, dimanche en dernier). Avant, le dimanche remontait tout en haut de la semaine — un simple souci d’affichage (la programmation des séances dans l’agenda, elle, était déjà correcte). Le reste de l’app (plan de course, programme par objectif) rangeait déjà la semaine lundi-en-tête : le Coach Poids s’aligne enfin.' },
  { v: '2.0.74', emoji: '🎯', text: 'Cible du jour en musculation (fiche exercice et séance guidée) : la suggestion de progression « 🎯 Cible du jour : X reps × Y kg » compte désormais aussi les vieilles séances à l’ancien format (un seul exercice noté directement sur la séance, sans la liste détaillée). Si une sauvegarde restaurée ou un import ne contenait QUE ce format pour un exercice, l’historique s’affichait mais aucune cible n’apparaissait (l’app ne « voyait » pas ces séances pour calculer la progression). C’est corrigé : ces séances comptent maintenant comme partout ailleurs. Rien ne change pour tes séances normales.' },
  { v: '2.0.73', emoji: '🏆', text: 'Records perso (musculation) : les records tenus dans une vieille séance ne sont plus « volés ». Si une sauvegarde restaurée ou un import contenait une séance à l’ancien format (un seul exercice noté directement sur la séance, sans la liste détaillée), le meilleur poids/reps de cet exercice était ignoré au moment de comparer tes records — une charge INFÉRIEURE pouvait alors déclencher à tort un « 🎉 Nouveau record ». Ces vieilles séances comptent désormais dans tes records, exactement comme partout ailleurs dans l’app. Rien ne change pour tes séances normales.' },
  { v: '2.0.72', emoji: '📈', text: 'Tendance de forme (onglet Athlète → Récupération, sous ton check-in) : le mini-graphe « Forme · N derniers check-ins » et sa flèche de tendance comptent désormais des JOURS distincts, jamais des saisies. Si une sauvegarde restaurée ou un import contenait deux fois la même journée dans ton historique de récupération, ce jour apparaissait DEUX fois dans la courbe : la fenêtre des « 8 derniers » glissait alors sur des saisies au lieu de vrais jours, et la flèche haut/bas (calculée entre le premier et le dernier point) pouvait indiquer une tendance fausse. C’est corrigé (une entrée par date, la plus récente gagne — comme à l’enregistrement, qui remplaçait déjà le check-in du jour). Rien ne change quand chaque journée n’apparaît qu’une fois.' },
  { v: '2.0.71', emoji: '🌱', text: 'Suivi du « pas du jour » (accueil) : le compteur « X/Y · Z % » sous ta série de pas tenus compte désormais des JOURS distincts, jamais des saisies. Si une sauvegarde restaurée ou un import contenait deux fois la même journée dans ton journal de pas, elle était comptée en double — le total de jours et le pourcentage étaient faussés, alors que la SÉRIE (🌱 … d’affilée) juste à côté ne comptait déjà qu’un jour par date : le même bandeau affichait deux comptes qui se contredisaient. C’est désormais cohérent (dernier pas gagné pour une date en double, comme à l’enregistrement). Rien ne change quand chaque journée n’apparaît qu’une fois (le cas normal).' },
  { v: '2.0.70', emoji: '🏅', text: 'Série de « journées parfaites » (quêtes du jour) : le compteur « X/Y jours parfaits · Z % » compte désormais des JOURS distincts, jamais des saisies. Si une sauvegarde restaurée ou un import contenait deux fois la même journée dans ton journal de quêtes, elle était comptée en double — le total de jours et le pourcentage étaient faussés, alors que la SÉRIE (🏅 … d’affilée) juste à côté, elle, ne comptait déjà qu’un jour par date : le même bandeau affichait deux comptes qui se contredisaient. C’est désormais cohérent. Rien ne change quand chaque journée n’apparaît qu’une fois (le cas normal).' },
  { v: '2.0.69', emoji: '📊', text: 'Adhérence de la semaine (Mon plan) : les lignes « Protéines à la cible » et « Hydratation » comptent désormais des JOURS distincts, jamais des saisies. Si une même journée était enregistrée deux fois (import, restauration de sauvegarde, ou double check-in), elle gonflait le compteur — « Hydratation (3 j) » pouvait s’afficher pour 2 vrais jours seulement, et l’objectif se validait à tort. Le sommeil moyen de la semaine ne compte lui aussi qu’une nuit par date. C’est maintenant cohérent avec le panneau Nutrition qui, lui, dédupliquait déjà par date. Rien ne change quand tu n’as qu’une saisie par jour.' },
  { v: '2.0.68', emoji: '🏋️', text: 'Équilibre poussée/tirage (onglet Athlète) : un exercice qui travaille à la fois le dos ET les épaules — comme la suspension à la barre ou la marche du fermier — ne fausse plus ton ratio. Jusqu’ici ses séries étaient comptées DEUX fois, une fois en poussée et une fois en tirage : une séance de pur gainage dos/épaules pouvait donc s’afficher « push/pull équilibré » alors que tu n’avais fait ni pompes ni tractions. Ces exercices comptent désormais une seule fois, du côté de leur muscle principal (le dos → tirage). Rien ne change pour tes exercices classiques (pompes, développés, tractions, rowing).' },
  { v: '2.0.67', emoji: '♿', text: 'Accessibilité : le bouton boussole « 🧭 » de l’ajout rapide dans « Ma semaine » (qui estime ton temps de trajet) a désormais un nom accessible. Il n’affichait qu’une icône sans texte : sur iPhone, VoiceOver l’annonçait comme un simple « emoji boussole », sans dire à quoi il sert. Il est maintenant lu « Estimer le trajet depuis mon point de départ », comme ses deux jumeaux ailleurs dans l’app qui affichent, eux, « 🧭 Estimer ». Rien ne change visuellement.' },
  { v: '2.0.66', emoji: '🧘', text: 'Records de régularité : une date impossible ne gonfle plus tes records de série (bien-être et protéines). Si une sauvegarde restaurée ou un import contenait une date qui n’existe pas au calendrier (par ex. un 31 avril), elle « débordait » sur le jour suivant et fabriquait une paire de jours consécutifs fantôme — ton record de série bien-être ou protéines pouvait alors afficher un chiffre jamais atteint, alors que ta série EN COURS, elle, l’ignorait déjà (les deux se contredisaient). Une telle date est désormais ignorée de la même façon partout. Rien ne change pour tes vraies dates.' },
  { v: '2.0.65', emoji: '🎂', text: 'Anniversaires : une date impossible ne crée plus d’anniversaire « fantôme » dans tes prochains anniversaires. Si une sauvegarde restaurée ou un import contenait une date qui n’existe pas (par ex. un 31 février), l’app la reportait par erreur au 3 mars et l’annonçait comme « à venir » — alors qu’elle n’apparaissait jamais dans la journée correspondante. Une telle date est désormais simplement ignorée, partout de la même façon. Le 29 février reste bien géré (fêté le 1er mars les années non bissextiles), et rien ne change pour tes vraies dates.' },
  { v: '2.0.64', emoji: '😴', text: 'Bilan sommeil : ta dette de sommeil ne « perd » plus une vraie nuit quand une même date porte deux saisies. Si, sur un jour, tu avais enregistré ta nuit le matin (durée renseignée) puis, le soir, seulement ton heure de coucher (sans durée), le second enregistrement pouvait effacer la vraie nuit du calcul de dette — la moyenne et le nombre de nuits en pâtissaient. La dette de sommeil ignore désormais une saisie sans durée quand une nuit chiffrée existe pour la même date, exactement comme le font déjà la moyenne hebdo, la mini-courbe et la régularité. Rien ne change quand tu n’as qu’une saisie par jour.' },
  { v: '2.0.63', emoji: '🔁', text: 'Calendrier : re-synchroniser un agenda abonné (.ics) ne remet plus tes rendez-vous récurrents à zéro. Jusqu’ici, chaque re-sync du même abonnement RECONSTRUISAIT tes événements récurrents depuis zéro : les occurrences que tu avais cochées ou sautées repassaient à « à faire », une mise en pause était annulée, et l’identifiant interne changeait — alors que tes événements ponctuels, eux, étaient bien préservés. Désormais un récurrent déjà connu (même source) garde ton historique de cases cochées, tes jours sautés et son état « en pause » ; seuls le titre, l’heure et la règle sont rafraîchis depuis le calendrier. Rien ne change pour tes récurrents créés à la main.' },
  { v: '2.0.62', emoji: '💼', text: 'Alternance : une cible encore « à postuler » n’est plus comptée comme une candidature ENVOYÉE, même quand elle porte une date. En important ton tableur de suivi (Google Sheets), une ligne « à postuler » avec une date de repérage ou une deadline gonflait à tort ta série (« 🔥 »), ton compteur du jour (« postulé aujourd’hui ✓ ») et ton total de la semaine — alors que tu n’avais rien envoyé. Le moteur de motivation ne compte désormais que les candidatures réellement postulées. Rien ne change quand tes « à postuler » n’ont pas de date, ni pour tes vraies candidatures.' },
  { v: '2.0.61', emoji: '🎖️', text: 'Trophées : le badge « Cible atteinte » se fie enfin à ton poids le plus RÉCENT, pas au dernier de la liste. Après une restauration de sauvegarde ou un import, tes pesées ne sont pas toujours rangées dans l’ordre : le badge pouvait alors comparer un vieux poids et rester verrouillé alors que ta dernière pesée touchait la cible (ou, à l’inverse, se débloquer à tort). Il prend désormais la pesée la plus récente par date, comme le reste de l’app. Rien ne change quand tes poids sont déjà dans l’ordre.' },
  { v: '2.0.60', emoji: '📊', text: 'Habitudes : la régularité (le badge « 📊 % ») ne te pénalise plus pour la case du jour pas encore cochée. Une habitude jeune et parfaite pouvait afficher « 🔥 4 » (série intacte) juste à côté de « 📊 80 % » en pleine journée, uniquement parce qu’aujourd’hui n’était pas encore fait — deux chiffres qui se contredisent. La régularité tolère désormais le jour en cours exactement comme la série : tant que la journée n’est pas finie, il ne compte pas comme un raté. Un vrai jour manqué dans le passé, lui, compte toujours.' },
  { v: '2.0.59', emoji: '🍽️', text: 'Coach poids : quand ta perte stagne et que ta cible calorique est déjà proche du plancher (1200 kcal/jour), le conseil de baisse dit enfin la vérité. Il annonçait toujours « baisse d’environ 125 kcal/jour » alors que la « Nouvelle cible » ne pouvait pas descendre sous 1200 — la vraie baisse était parfois de 50 kcal seulement, un conseil qui se contredisait lui-même. Le montant annoncé correspond maintenant exactement à la baisse réelle, et une fois au plancher le coach t’oriente vers le cardio plutôt qu’une baisse impossible. Rien ne change quand la marge est large, ni pour une prise de poids.' },
  { v: '2.0.58', emoji: '📅', text: 'Agenda : un rendez-vous récurrent importé « qui se répète N fois » (fichier .ics d’un agenda Google ou Apple) s’arrête enfin après ses N occurrences. Ces séries finies sont encodées avec un « COUNT » (répéter 4 fois, 10 fois…) que l’import ignorait : le rendez-vous se répétait alors À L’INFINI dans l’agenda. Il est maintenant borné à la bonne dernière date (calculée exactement, même quand des mois n’ont pas le jour visé — ex. un 31 — ou pour un 29 février). Rien ne change pour une récurrence sans fin ou déjà bornée par une date de fin.' },
  { v: '2.0.57', emoji: '🎂', text: 'Anniversaires : l’âge s’accorde enfin correctement au singulier. Dans le bandeau « 🎂 À venir » et sur le calendrier mensuel, un premier anniversaire s’affichait « (1 ans) » — c’est désormais « (1 an) », comme dans « Ma journée » qui le faisait déjà bien. Rien ne change dès 2 ans (« 2 ans »), ni pour un anniversaire enregistré sans année de naissance (l’âge reste alors masqué).' },
  { v: '2.0.56', emoji: '🌱', text: 'Petit détail d’affichage du « pas de vie » : le rappel « Dernier tenu : … » n’affiche plus un texte à rallonge pour un pas passé. Ton pas du jour était déjà raccourci à 140 caractères dans ce rappel, mais un pas tenu un jour précédent, lui, s’affichait en entier — un texte très long pouvait alors déborder la petite ligne. Les deux sont désormais traités pareil (raccourcis à 140 caractères, espaces de tête et de queue nettoyés). Rien ne change pour un pas court.' },
  { v: '2.0.55', emoji: '🏃', text: 'Ta plus longue sortie course (bilan endurance sur 28 j) s’affiche enfin à la bonne date quand deux sorties sont très proches. Avant, la distance de la plus longue sortie était comparée arrondie au dixième : deux sorties à 12,34 km et 12,32 km tombaient toutes deux sur « 12,3 », si bien que la plus récente (pourtant un poil plus courte) volait le record à la vraie plus longue — mauvaise date affichée. Le record est désormais jugé sur la distance réelle et n’est arrondi qu’à l’affichage. C’est le même correctif que pour les records de séance et de semaine muscu (2.0.46 / 2.0.48), appliqué cette fois à la course.' },
  { v: '2.0.54', emoji: '⚖️', text: 'Ajustement calorique : la stagnation de poids est enfin détectée même si tu te pèses tous les jours. Le conseil « ton poids stagne, baisse ~125 kcal (ou ajoute du cardio) » se déclenche quand ton poids ne bouge plus sur au moins 14 jours — mais l’app ne regardait en fait que tes 4 dernières pesées : en te pesant quotidiennement, ces 4 mesures ne couvraient que ~3 jours, donc le plateau n’était jamais repéré, même après des semaines sans changement. La fenêtre est désormais calée sur les ~14 derniers jours quelle que soit ta fréquence de pesée. Rien ne change pour une pesée espacée.' },
  { v: '2.0.53', emoji: '🗓️', text: 'Import de calendrier (.ics) plus robuste aux dates abîmées : un événement dont la date est calendairement impossible — « 30 février », « 31 novembre », ou une date carrément aberrante d’un fichier corrompu — est désormais ignoré à l’import au lieu d’être stocké avec une date qui n’existe pas (et qui rendait l’événement introuvable dans l’agenda, ou glissait silencieusement vers un autre jour). Les vraies dates, y compris le 29 février des années bissextiles, restent bien importées ; une heure impossible (« 25:60 ») est traitée de la même façon.' },
  { v: '2.0.52', emoji: '🌙', text: 'Plan de recalage du sommeil : plus de message contradictoire quand tu te couches juste après ta cible. Si ton coucher réel tombe dans la marge de tolérance (jusqu’à 15 min après l’objectif — un vrai succès), l’app fête « 🎉 Objectif atteint » ET affiche désormais une barre pleine avec « arrivée aujourd’hui ». Avant, elle célébrait l’objectif tout en indiquant en même temps une barre à 97 % et « arrivée estimée dans 1 jour » — trois verdicts qui se contredisaient. Aucun changement quand l’objectif n’est pas encore atteint.' },
  { v: '2.0.51', emoji: '♿', text: 'Accessibilité : deux menus déroulants de filtre annoncent enfin leur rôle aux lecteurs d’écran. Le filtre « famille » de la bibliothèque d’exercices (page Athlète) et le sélecteur « Autour de ta séance » des compléments n’avaient aucun nom accessible — un lecteur d’écran les annonçait comme « liste déroulante » sans dire à quoi ils servent (leurs voisins immédiats, eux, étaient déjà nommés). Chacun porte désormais un libellé explicite. Aucun changement visuel.' },
  { v: '2.0.50', emoji: '💼', text: 'Import de candidatures plus robuste aux dates impossibles : quand un tableur (export ou saisie) contient une date de calendrier inexistante — « 30/02/2026 » ou « 31/11/2026 » (novembre n’a que 30 jours) —, l’app l’ignore désormais au lieu de la stocker telle quelle. Avant, elle passait le filtre (mois et jour dans les bornes) et s’affichait « postulé le 30/02/2026 », une date qui n’existe pas et que d’autres calculs interprétaient comme le 2 mars. Les vraies dates, y compris le 29 février des années bissextiles, restent bien lues.' },
  { v: '2.0.49', emoji: '💼', text: 'Suivi Alternance plus fiable à l’import : un statut « non retenu » (la formulation la plus courante d’un refus) n’est plus classé par erreur comme candidature « acceptée ». Quand tu importes ou synchronises un tableur de candidatures, une ligne « Non retenu », « Candidature non retenue » ou « Pas retenu » atterrit désormais bien dans « Refus » — avant, le mot « retenu » l’emportait et l’inversait en offre décrochée, faussant le funnel, le taux de réponse et « Le focus du moment ». Une vraie réponse positive (« Retenu », « embauché ») reste bien comptée comme acceptée.' },
  { v: '2.0.48', emoji: '🗓️', text: 'Record hebdomadaire de tonnage muscu plus juste : quand deux semaines ont un total très proche dont l’une en demi-kilo (fréquent avec des charges en 12,5 / 7,5 kg), l’app garde bien la semaine qui a réellement soulevé le plus. Avant, le tonnage était comparé arrondi : une semaine antérieure à 113,0 kg et une plus récente à 112,5 kg tombaient toutes deux sur « 113 », et la règle « à égalité, garde la plus récente » donnait le record à la mauvaise semaine (mauvaise date, et « Record hebdo battu cette semaine ! » possible à tort). C’est le même correctif que pour le record de séance (2.0.46), appliqué cette fois au record de la semaine.' },
  { v: '2.0.47', emoji: '🎯', text: 'Objectif suggéré à l’inscription plus juste au seuil : la suggestion d’objectif physique (perte de gras / prise de muscle / corps athlétique) se base désormais sur ton IMC réel, et non sur la valeur affichée arrondie. Un IMC réel de 24,98 (arrondi 25,0) reste « dans la norme » et propose un corps athlétique, au lieu de partir d’emblée sur une perte de gras ; à l’autre bout, un IMC 18,48 (arrondi 18,5) oriente bien vers la prise de muscle. Le chiffre affiché ne change pas — c’est la même règle IMC réel que pour le conseil de poids et le bilan corporel.' },
  { v: '2.0.46', emoji: '🏆', text: 'Record de séance muscu plus juste : quand ta séance du jour égale ton meilleur tonnage historique avec un total en demi-kilo (fréquent avec des charges en 12,5 / 7,5 kg et un nombre de reps impair), l’app affiche enfin « Nouveau record séance ! » à la bonne date. Avant, le record était comparé à sa valeur arrondie : un tonnage réel de 187,5 kg, arrondi à 188, ne se reconnaissait plus lui-même, si bien qu’une séance récente à égalité était ignorée (mauvaise date affichée, célébration manquée). Le chiffre affiché ne change pas — c’est la même règle « à égalité, garde la plus récente » que pour le record hebdo.' },
  { v: '2.0.45', emoji: '🔔', text: 'Badge d’icône PWA plus juste : une fois ta séance de sport du jour terminée, la pastille de notification sur l’icône de l’app ne la compte plus comme une action en attente. Avant, le badge restait allumé après ta séance faite (elle était comptée jusqu’au lendemain) ; il ne reflète désormais que ce qu’il te reste vraiment à faire — quêtes non cochées et séances du jour pas encore faites.' },
  { v: '2.0.44', emoji: '🏃', text: 'Paliers de course plus complets : les objectifs intermédiaires proposés vers ta course (10 km, semi-marathon…) n’écrasent plus le premier palier. Pour un marathon préparé sur ~8 mois, l’app n’affichait par erreur que le semi et perdait le palier 10 km ; elle propose désormais bien la progression complète et croissante. Le calcul qui répartit les paliers sur le temps disponible visait un cran trop haut et faisait fusionner les deux premiers.' },
  { v: '2.0.43', emoji: '⚖️', text: 'Conseil de poids cible plus juste au seuil : quand tu fixes un poids objectif, l’avertissement sur son réalisme (« insuffisance pondérale », « cible reste haute ») se base désormais sur l’IMC réel de la cible, et non sur la valeur affichée arrondie. Une cible à IMC réel 18,46 (affichée 18,5) déclenche bien l’alerte santé « insuffisance pondérale », au lieu d’un simple « cible très basse » ; même logique pour le haut de l’échelle. Le chiffre affiché ne change pas — c’est le prolongement du correctif IMC de la 2.0.40.' },
  { v: '2.0.42', emoji: '🏋️', text: 'Cible de progression plus juste : quand tu logues deux séances le même jour pour un même exercice (par exemple ta vraie séance lourde puis un finisher plus léger), la suggestion de charge se base désormais sur ta MEILLEURE série du jour, plus sur la dernière saisie. Avant, un finisher léger enregistré après ta séance de référence pouvait l’écraser et te faire repartir d’une charge trop basse. C’est la même règle « meilleure série retenue » que l’app applique déjà à l’intérieur d’une même séance.' },
  { v: '2.0.41', emoji: '🧘', text: 'Coach récupération réparé : la routine bien-être suggérée après une séance (chevilles après une course, hanches après les jambes, épaules après le haut du corps, bas du dos après le gainage) se base enfin sur ta séance la plus RÉCENTE. Elle regardait par erreur la toute première séance jamais enregistrée — donc, dès que tu avais plus d’une séance, ce conseil ciblé ne se déclenchait quasiment jamais et tu tombais sur la mobilité générique. Il redevient vivant.' },
  { v: '2.0.40', emoji: '⚖️', text: 'Indice de masse corporelle (IMC) plus juste : la catégorie OMS (maigreur, corpulence normale, surpoids, obésité) est désormais déterminée sur l’IMC réel, et non sur la valeur affichée arrondie à une décimale. Un IMC de 18,478 s’affichait « 18,5 » et basculait à tort en « corpulence normale » alors qu’il relève de la maigreur ; de même un 24,95 arrondi à « 25,0 » n’est plus classé « surpoids ». Le chiffre affiché ne change pas — seule la catégorie collée dessus devient correcte au seuil.' },
  { v: '2.0.39', emoji: '🌙', text: 'Bilan hebdo plus juste : le sommeil moyen de la semaine ne compte plus que les nuits vraiment renseignées. Un check-in de récupération où l’on note seulement sa fatigue, ses courbatures (ou juste son heure de coucher) sans saisir la durée de sommeil ne tire plus la moyenne vers le bas comme une nuit de 0 h. Fini le chiffre faussement bas dans le PDF hebdo et le bilan partagé — et le faux conseil « sommeil moyen bas » qui allait avec. C’est déjà ainsi que le bilan mensuel calculait.' },
  { v: '2.0.38', emoji: '🛡️', text: 'Données plus robustes : une tâche à faire ou un bloc récurrent dont la date serait impossible (par exemple « 2026-13-99 » venue d’une sauvegarde abîmée ou modifiée à la main) n’est plus enregistré tel quel — la date invalide est neutralisée au lieu d’orpheliner l’entrée dans une case introuvable (jamais affichée nulle part). C’est le même garde-fou que l’agenda avait déjà reçu, désormais partagé par les to-do et la récurrence. Aucune saisie normale n’est affectée (les champs date produisent déjà une date réelle).' },
  { v: '2.0.37', emoji: '♿', text: 'Accessibilité : la petite case 🔔 qui active le bip de fin de repos (dans la séance guidée) est maintenant correctement nommée pour les lecteurs d’écran (« Bip sonore à la fin du repos ») au lieu d’être annoncée comme une simple « cloche ». Rien ne change visuellement — c’est la même case, juste enfin compréhensible à la voix.' },
  { v: '2.0.36', emoji: '✍️', text: 'Bilan partagé plus soigné : quand une seule révision est prévue sur la semaine ou le mois, le texte partageable écrit « 0/1 révision validée » au singulier, au lieu de « 0/1 révisions validées ». Un « s » qui échappait à la règle d’accord suivie partout ailleurs dans ces mêmes bilans (séance, candidature, jour actif…). Rien d’autre ne change.' },
  { v: '2.0.35', emoji: '🔎', text: 'Recherche dans l’agenda insensible aux accents : taper « kine », « reunion » ou « chateau » (sans accent, réflexe courant) retrouve désormais « Kiné », « Réunion » ou « Château ». La barre de recherche ignorait déjà la casse ; elle ignore maintenant aussi les accents, comme les autres recherches libres de l’app. Rien d’autre ne change.' },
  { v: '2.0.34', emoji: '✍️', text: 'Petits accords corrigés : un tout premier anniversaire s’affiche désormais « (1 an) » et non « (1 ans) » dans « Ma journée », et le partage de progression sur les blocs de muscu écrit « 1 séance » plutôt que « 1 séances » quand un bloc n’en compte qu’une. Rien d’autre ne change — juste le pluriel qui suit enfin la règle partout ailleurs dans l’app.' },
  { v: '2.0.33', emoji: '🗓️', text: 'Agenda plus robuste : un événement dont la date ou l’heure serait mal formée (date impossible venue d’un fichier calendrier .ics abîmé, ou heure incohérente d’un import) n’est plus enregistré tel quel — la valeur invalide est neutralisée au lieu de planter dans une case introuvable. Comme partout ailleurs dans l’app, seule une date AAAA-MM-JJ et une heure HH:MM valides sont conservées. Aucune saisie normale n’est affectée (les champs date/heure produisent déjà ce format).' },
  { v: '2.0.32', emoji: '🌙', text: 'Onglet Sommeil, demande d’Adrien (étape 2/2) : le « Bilan sommeil » juge maintenant la régularité par l’heure de COUCHER (dès 3 nuits renseignées) plutôt que par la durée de nuit. Une durée qui varie peut cacher un coucher parfaitement stable (juste un réveil différent) — et à l’inverse, un coucher qui saute d’une heure à l’autre peut passer inaperçu si la durée moyenne reste stable, alors que c’est justement ce qui dérègle le rythme. Sans heure de coucher saisie, le bilan retombe comme avant sur la durée. Verdict plus juste, sans rien changer d’autre au plan de recalage.' },
  { v: '2.0.31', emoji: '💼', text: 'Correction demandée : dans le suivi d’alternance, marquer une candidature « postulé » (ou tout autre changement de statut) est maintenant pris en compte de façon fiable — deux bugs corrigés. D’une part, une synchronisation Google Sheets (auto ou ré-import) en retard sur l’app ne peut plus écraser un statut déjà avancé (ex. « postulé » ou « refusé ») pour le remettre à un stade antérieur — seule une vraie progression est appliquée. D’autre part, changer un statut via le menu déroulant met désormais aussi à jour la carte « Le focus du moment » à l’instant, sans attendre un rendu complet suivant.' },
  { v: '2.0.30', emoji: '💼', text: 'Import de candidatures plus propre : une cellule sur plusieurs lignes (une note collée depuis Excel ou un tableur, où le saut de ligne interne était encodé en CRLF) ne laisse plus traîner de retour chariot parasite dans le texte importé. Les vrais sauts de ligne à l’intérieur d’une cellule sont préservés — seul le caractère invisible en trop est retiré.' },
  { v: '2.0.29', emoji: '♿', text: 'Accessibilité : les boutons-flèches ← / → de navigation du calendrier (vue mois et vue semaine) ont maintenant un intitulé clair pour les lecteurs d’écran (« Mois précédent », « Mois suivant », « Semaine précédente », « Semaine suivante »), là où ils n’étaient annoncés que « flèche gauche/droite ». Une info-bulle apparaît aussi au survol. Rien ne change à l’écran.' },
  { v: '2.0.28', emoji: '🎂', text: 'Anniversaires du 29 février enfin fêtés les bonnes années : jusqu’ici, une personne née un 29 février disparaissait du calendrier les années non bissextiles (et la liste « À venir » affichait une date impossible, le 29 février d’une année sans 29 février). Désormais son anniversaire est fêté le 1er mars ces années-là — visible dans le calendrier, avec une date réelle dans « À venir ». Les années bissextiles, c’est toujours le 29 février.' },
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
// cochées + séances de sport du jour NON faites. Borné à 99. Une séance déjà terminée n'est plus « en
// attente » (même filtre `!a.completed` que sportToday, ligne 96). Pur + testé.
function pendingBadgeCount(state, todayKey) {
  const s = state || {};
  const today = String(todayKey || '');
  const quests = Array.isArray(s.quests) ? s.quests.filter(q => q && !q.done).length : 0;
  const sessions = Array.isArray(s.agenda) ? s.agenda.filter(a => a && a.date === today && a.kind === 'sport' && !a.completed).length : 0;
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
    const rawBmi = w / ((h / 100) ** 2);   // IMC réel : catégorie OMS jugée dessus (cf. bmiInfo/weightTargetAdvice)
    const bmi = r1(rawBmi);                 // valeur AFFICHÉE (arrondie) : un IMC 24,98 reste « dans la norme »
    if (rawBmi >= 25) return { key: 'seche', label: 'Perte de gras', reason: `IMC ${String(bmi).replace('.', ',')} : un objectif perte de gras est un bon point de départ.` };
    if (rawBmi < 18.5) return { key: 'muscle', label: 'Prise de muscle', reason: `IMC ${String(bmi).replace('.', ',')} : viser la prise de muscle te construit une base solide.` };
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
  lines.push(`${p.strength} muscu · ${p.runs} course${p.runs > 1 ? 's' : ''}/sem.${p.runFocus ? ' · ' + p.runFocus : ''}`);
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
  // La séance la PLUS RÉCENTE par date (le stockage réel est newest-first via unshift,
  // donc workouts[length-1] était la plus ANCIENNE → contexte quasi toujours ignoré). Pur.
  const dated = workouts.filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date || '')));
  const last = dated.reduce((a, b) => (a && String(a.date) >= String(b.date) ? a : b), null);
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
  const days = [...new Set((Array.isArray(list) ? list : []).filter(x => x && isRealDateKey(x.date)).map(x => x.date))].sort();
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
  // Math.round (pas floor) : deux minuits locaux qui encadrent un changement d'heure (DST) sont
  // distants de 23 h ou 25 h, pas 24 — floor rabattrait 7 jours calendaires sur 6 au printemps.
  // Aligné sur la convention du fichier (daysUntil, acuteChronicRatio, membershipInfo…).
  const days = Math.round((today - start) / 86400000);
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
  list.forEach(w => { tonnage += workoutTonnage(w) || 0; sets += workoutSetCount(w) || 0; });
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
    if (!best || t > best.tonnage || (t === best.tonnage && d >= best.date)) best = { date: d, tonnage: t };
  });
  if (!best) return null;
  return { date: best.date, tonnage: Math.round(best.tonnage), count, isLatest: best.date === latestDate };
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
    // Égalité jugée sur le tonnage BRUT, pas sur l'arrondi : deux semaines aux bruts distincts qui
    // tombent dans le même seau d'arrondi (ex. 113,0 vs 112,5 → 113) ne sont PAS à égalité, sinon le
    // départage « garde la plus récente » vole le record à la semaine antérieure réellement plus
    // élevée. Jumeau de bestSessionTonnage (#406) : on n'arrondit qu'à l'affichage.
    if (!best || v.tonnage > best.tonnage || (v.tonnage === best.tonnage && wk > best.weekStart)) best = { weekStart: wk, tonnage: v.tonnage, sessions: v.sessions };
  });
  const curWeek = /^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || '')) ? dateKey(mondayOf(new Date(String(todayKey) + 'T12:00:00'))) : null;
  return { weekStart: best.weekStart, tonnage: Math.round(best.tonnage), sessions: best.sessions, isCurrent: curWeek != null && best.weekStart === curWeek };
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
  lines.push(`1er bloc : ${cmp.first.sessions} séance${cmp.first.sessions > 1 ? 's' : ''} · ${Math.round(cmp.first.tonnage)} kg`);
  lines.push(`Dernier : ${cmp.last.sessions} séance${cmp.last.sessions > 1 ? 's' : ''} · ${Math.round(cmp.last.tonnage)} kg`);
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
    if (!w) return;
    // Comme ses sœurs (`bestE1rmByExercise`, `workoutsTable`…), tolère la forme legacy
    // mono-exercice `w.exercise` : sinon un record posé dans une vieille séance importée était
    // silencieusement ignoré (vol de record → faux « record battu » sur une charge inférieure).
    const exos = Array.isArray(w.exercises) && w.exercises.length
      ? w.exercises
      : (w.exercise ? [{ name: w.exercise, load: w.load, reps: w.reps }] : []);
    exos.forEach(ex => {
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
    ? `${n}ᵉ bloc d’affilée — accorde-toi une vraie coupure : marche, mange, éloigne-toi de l’écran.`
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
    if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.date || ''))) return;
    // Comme ses sœurs (`personalRecords`, `bestE1rmByExercise`, `workoutsTable`…), tolère la forme
    // legacy mono-exercice `w.exercise` : sinon une meilleure série posée dans une vieille séance
    // importée était absente du palmarès (incohérent avec `personalRecords`, qui la compte, #440).
    const exos = Array.isArray(w.exercises) && w.exercises.length
      ? w.exercises
      : (w.exercise ? [{ name: w.exercise, load: w.load, reps: w.reps }] : []);
    exos.forEach(ex => {
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
  const raw = w / ((h / 100) ** 2);
  const bmi = Math.round(raw * 10) / 10;
  // Catégorie OMS jugée sur l'IMC RÉEL, pas sur la valeur affichée arrondie :
  // un IMC 18,478 (arrondi 18,5) reste « maigreur », pas « corpulence normale ».
  const category = raw < 18.5 ? 'maigreur' : raw < 25 ? 'corpulence normale' : raw < 30 ? 'surpoids' : 'obésité';
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
  // Seuil « maintien » ALIGNÉ sur `weightTargetAdvice` (l. 5146, seuil 0,5) : les deux fonctions
  // dérivent le MÊME verdict perte/prise/maintien depuis (poids − cible) et alimentent le MÊME écran
  // Coach Poids, avec une logique de rythme identique. L'ancien seuil 0,3 divergeait : un écart de
  // 0,35 kg (dans la fluctuation quotidienne eau/sel, ~0,5 % du poids) donnait ici « perte » + un
  // déficit de ~500 kcal/j alors que le conseil affiché juste à côté disait « maintien/recomposition »
  // — deux verdicts opposés sur le même écran. Sous 0,5 kg = maintien (le poids bouge à peine).
  const goal = Math.abs(diff) < 0.5 ? 'maintien' : diff > 0 ? 'perte' : 'prise';
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
  const exams = Array.isArray(s.examGoals) && s.examGoals.length ? s.examGoals : s.examGoal;
  const er = examReminderDue(exams, todayKey);
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
function adaptiveCoachFocus(state, todayKey, opts) {
  const s = state && typeof state === 'object' ? state : {};
  const o = opts && typeof opts === 'object' ? opts : {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  const dayMs = 864e5;
  const t0 = new Date(todayKey + 'T12:00:00').getTime();
  // 0 = aujourd'hui, valeur positive = jours dans le passé, null si date invalide/future.
  const daysAgo = d => {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    const n = Math.round((t0 - new Date(d + 'T12:00:00').getTime()) / dayMs);
    return n < 0 ? null : n;
  };

  // Alternance : PRIORITÉ ABSOLUE (n°1 réel d'Adrien, échéance dure). Machine à états du FUNNEL, pas
  // un simple « postule » : tant qu'il cherche (aucune acceptée), le focus reste alternance et son
  // MESSAGE s'adapte à l'étape la plus utile du jour — (1) pas postulé aujourd'hui → postuler ;
  // (2) postulé, mais une relance en attente (J+7 sans réponse) → relancer la plus ancienne, nommée ;
  // (3) postulé, un entretien dans le pipeline → le préparer. Une fois la candidature du jour envoyée
  // ET rien à relancer/préparer, le coach repasse aux piliers. applicationStats calcule déjà
  // pendingRelances (triées desc) et entretiens — on les exploite au lieu de les jeter.
  const apps = Array.isArray(s.applications) ? s.applications : [];
  if (apps.length >= 1 && typeof applicationStats === 'function') {
    const st = applicationStats(apps, todayKey, { weekGoal: Number(s.jobSearchGoal) || 5 });
    if (st.accepted === 0) {
      const dl = (typeof alternanceDeadline === 'function') ? alternanceDeadline(todayKey) : null;
      const dTxt = dl ? ((dl.phase === 'crunch' || (dl.daysLeft != null && dl.daysLeft <= 0)) ? 'c’est la rentrée, dernière ligne droite' : (dl.daysLeft != null ? 'plus que ' + dl.daysLeft + ' j avant la rentrée' : '')) : '';
      const cap = z => z.charAt(0).toUpperCase() + z.slice(1);
      const base = { pillar: 'alternance', label: 'Alternance', page: 'alternance', trend: 'deadline', tone: 'urgent', recentDays: st.weekCount, prevDays: 0, lastActiveDays: null };
      if (!st.appliedToday) {
        const parts = [];
        if (dTxt) parts.push(dTxt);
        parts.push(st.weekCount + '/' + st.weekGoal + ' candidature' + (st.weekGoal > 1 ? 's' : '') + ' cette semaine');
        if (st.streak > 0) parts.push('🔥 ' + st.streak + ' j de suite');
        return { ...base, emoji: '💼', headline: 'Postule aujourd’hui pour ton alternance', insight: cap(parts.join(' · ')) + '.', action: 'Ajoute une candidature — une seule suffit à avancer.' };
      }
      if (st.pendingRelances && st.pendingRelances.length) {
        const r = st.pendingRelances[0];
        const more = st.pendingRelances.length > 1 ? ' · ' + st.pendingRelances.length + ' relances à faire' : '';
        return { ...base, emoji: '🔁', headline: 'Relance ' + (r.company || 'cette entreprise'), insight: 'Sans réponse depuis ' + r.days + ' jour' + (r.days > 1 ? 's' : '') + more + '. Une relance polie double souvent tes chances.', action: 'Envoie un message court et poli, puis marque la relance faite.' };
      }
      if (st.entretiens > 0) {
        return { ...base, emoji: '🤝', headline: st.entretiens > 1 ? 'Prépare tes ' + st.entretiens + ' entretiens' : 'Prépare ton entretien', insight: (dTxt ? cap(dTxt) + ' · ' : '') + 'un entretien, c’est là que tout se joue.', action: 'Renseigne-toi sur l’entreprise et prépare 2-3 questions à poser.' };
      }
      // Postulé aujourd'hui, rien à relancer ni à préparer → le coach passe aux piliers de momentum.
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
  // Coach CONSCIENT du sommeil : quand la nuit est en ALERTE (court ET irrégulier → sleepCoachInsight
  // tone 'urgent'), une nuit déréglée est un levier plus fort qu'un simple creux de momentum ailleurs
  // → on force le pilier sommeil en tête des corrections (tier -1), tout en le laissant soumis à la
  // rotation anti-radotage (pas de nag mot pour mot 3 j de suite). Les deux systèmes profonds d'Adrien
  // (coach + service Sommeil) se parlent enfin. (L'alternance, plus prioritaire, a déjà `return` au-dessus.)
  const sleepIns = (typeof sleepCoachInsight === 'function') ? sleepCoachInsight(s.recovery, todayKey) : null;
  const sommeilCand = cands.find(c => c.pillar === 'sommeil' && c.ever);
  const fixes = cands.map(c => ({ c, tier: tierOf(c) })).filter(x => x.tier < 9);
  if (sleepIns && sleepIns.tone === 'urgent' && sommeilCand) {
    const ex = fixes.find(f => f.c.pillar === 'sommeil');
    if (ex) ex.tier = -1; else fixes.push({ c: sommeilCand, tier: -1 });
  }
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
  // Coach de l'ALLURE hebdo — le compteur d'objectif « 2/4 séances » disait OÙ Adrien en est, jamais
  // s'il est ENCORE JOUABLE ni quoi faire pour tenir. Un objectif hebdo est un quota à date butoir
  // (dimanche) : deux personnes à « 2/4 » ne sont pas dans la même situation selon qu'on est mardi
  // (large) ou samedi (mort). On calcule donc la FAISABILITÉ réelle — séances restantes à faire vs
  // JOURS restants dans la semaine calendaire où en caser une (une séance = une DATE active, comme wc)
  // — et on donne la conduite du jour, « adaptation aux progrès ET aux écarts » : marge, serré (il en
  // faut une chaque jour), ou hors de portée (on recadre sans culpabiliser, cap remis à lundi). Les
  // jours restants EXCLUENT aujourd'hui si la séance du jour est déjà posée (elle ne libère plus de
  // date). Champ sessionGoalPace ('onpace' | 'tight' | 'unreachable' | null) TOUJOURS renvoyé ; note
  // APPENDUE au compteur, aucune autre branche touchée. Ne parle que quand un objectif existe et n'est
  // pas encore tenu (wc < g) : objectif atteint → le « déjà tenu 💪 » historique suffit.
  let sessionGoalPace = null, sessionGoalAhead = null, sessionGoalBonus = null, focusGoalPace = null, focusGoalFresh = null, focusGoalDrained = null, focusFreshDriver = null, focusDrainDriver = null, focusGoalSteady = null, focusGoalAhead = null, focusAheadDriver = null, focusGoalBonus = null, focusMarginDrained = null;
  {
    const tm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayKey);
    const monday = dateKey(mondayOf(new Date(+tm[1], +tm[2] - 1, +tm[3])));
    if (chosen.pillar === 'sport') {
      const g = Math.round(Number(s.goals && s.goals.sessions) || 0);
      if (g >= 1) {
        const wc = new Set((Array.isArray(s.workouts) ? s.workouts : [])
          .filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date || '')) && w.date >= monday && w.date <= todayKey)
          .map(w => w.date)).size;
        if (wc >= g) {
          insight += ` Objectif hebdo déjà tenu : ${wc}/${g} séance${g > 1 ? 's' : ''} 💪`;
          // OBJECTIF DE SÉANCES BOUCLÉ × FORME AU VERT → SÉANCE BONUS LIBRE. Le pendant, côté SPORT, de
          // focusGoalBonus (#538, focus : objectif de minutes déjà atteint × vert → un bloc de plus = pur
          // bonus). La branche sport « objectif hebdo déjà tenu 💪 » ne lisait PAS la forme du jour : un
          // matin où l'objectif est bouclé ET le corps au vert, le coach laissait le bon geste possible sans
          // un mot. Les recaps #536/#538 signalaient cette suite, en la marquant DÉLICATE : côté sport,
          // l'action readiness pousse déjà « c'est le jour d'une vraie séance, monte l'intensité » (≥ 75) —
          // un « bonus » mal cadré la contredirait. Le cadrage juste NE dit donc PAS « douceur / séance
          // tranquille » (ce serait contre l'action) : il retire la seule PRESSION DU CALENDRIER (objectif
          // bouclé → plus aucune obligation de s'entraîner) et reframe toute séance de plus en BONUS LIBRE —
          // du gain offert, pris par envie. Compatible avec l'action : si Adrien s'entraîne, il s'entraîne
          // bien (l'action tient) ; mais le compteur hebdo ne le pousse plus (l'insight le libère). Additif
          // pur : sessionGoalBonus (le score du jour, ou null) TOUJOURS renvoyé ; NOTE appendue à l'insight,
          // aucune autre branche touchée. Garde-fous honnêtes : (1) au VERT seulement (≥ 75) — objectif
          // bouclé × tête moyenne/basse n'a besoin d'aucun mot ; (2) check-in de récup DU JOUR (données
          // réelles) ; (3) séance du jour PAS encore faite (sportDoneToday faux) — si Adrien a déjà bougé
          // aujourd'hui, le bonus est pris, pousser une 2e séance le même jour contredirait la philosophie
          // readiness (protège du surmenage), même garde-fou que sessionGoalAhead. MUTUELLEMENT EXCLUSIF de
          // sessionGoalAhead (branche wc >= g vs onpace), de restOverGoal (tight × plancher) et des notes
          // focus (chosen.pillar === 'sport'). Vocabulaire distinct (« ta forme est au top ce matin »,
          // « objectif de séances déjà dans la poche », « chaque séance en plus est du gain offert ») — zéro
          // collision à l'œil ni en regex avec sessionGoalAhead (« ton corps est au vert ce matin »,
          // « engranger une séance d'avance »), focusGoalBonus (« pur bonus, sans la moindre pression »),
          // l'action readiness (« c'est le jour d'une vraie séance ») ni readinessBoost (« Ce qui te porte
          // aujourd'hui »). Zéro nouvelle fonction (réemploi de readinessScore).
          const sportDoneToday = (Array.isArray(s.workouts) ? s.workouts : []).some(w => w && w.date === todayKey);
          if (!sportDoneToday && typeof readinessScore === 'function') {
            const todayR = (Array.isArray(s.recovery) ? s.recovery : []).find(r => r && r.date === todayKey);
            const rs = todayR ? readinessScore(todayR) : null;
            if (rs && rs.score >= 75) {
              sessionGoalBonus = rs.score;
              insight += ` Et ta forme est au top ce matin (readiness ${rs.score}/100) : objectif de séances déjà dans la poche, aucune obligation de t’y remettre aujourd’hui — mais si l’envie de bouger est là, chaque séance en plus est du gain offert, du rab pris sans aucun compteur dans le dos.`;
            }
          }
        } else {
          insight += ` Objectif hebdo : ${wc}/${g} séance${g > 1 ? 's' : ''}.`;
          const daysSinceMonday = Math.round((t0 - new Date(monday + 'T12:00:00').getTime()) / dayMs);
          const daysLeftIncl = 7 - daysSinceMonday; // aujourd'hui compris (1 le dimanche … 7 le lundi)
          const sportDoneToday = (Array.isArray(s.workouts) ? s.workouts : []).some(w => w && w.date === todayKey);
          const remain = daysLeftIncl - (sportDoneToday ? 1 : 0); // dates FUTURES encore utiles
          const need = g - wc;
          const sN = need > 1 ? 's' : '', sD = remain > 1 ? 's' : '';
          if (need > remain) {
            sessionGoalPace = 'unreachable';
            insight += remain <= 0
              ? ` La semaine se termine à ${wc}/${g} — pas un échec, un objectif à viser plein dès lundi.`
              : ` L’objectif de ${g} ne passera plus cette semaine (${need} séance${sN} pour ${remain} jour${sD} restant${sD}) — engrange ce que tu peux, tu repars plein lundi.`;
          } else if (need === remain) {
            sessionGoalPace = 'tight';
            insight += ` Serré mais jouable : ${need} séance${sN} pour ${remain} jour${sD} restant${sD} — il en faut une chaque jour pour tenir l’objectif.`;
          } else {
            sessionGoalPace = 'onpace';
            insight += ` Dans les temps : ${need} séance${sN} en ${remain} jour${sD} restant${sD} — tu as la marge pour boucler l’objectif hebdo.`;
            // PRENDRE DE L'AVANCE côté SPORT — le pendant EXACT, côté séances, de focusGoalAhead (#535,
            // focus). focusGoalAhead saisit une occasion : objectif LARGE (onpace, « tu as la marge ») ×
            // readiness au vert → engrange un bloc de focus tant que la tête suit, ça fait un coussin. Le
            // sport avait le trou SYMÉTRIQUE : quand l'allure de séances est LARGE (need < remain) ET que la
            // readiness du matin est au vert (≥ 75, même feu vert corps que le coach sport « prêt à
            // pousser »), la branche d'allure ne lisait pas du tout la forme du jour → le coach laissait
            // filer un bon jour confortable. Or une séance de plus un jour où le corps est frais ET où rien
            // n'y oblige, c'est un COUSSIN : si un jour creux tombe plus tard dans la semaine (readiness au
            // plancher, imprévu), l'objectif est déjà à l'abri au lieu de virer au sprint serré. On INVITE,
            // sans injonction (« rien ne t'oblige… mais profite-en »). Additif pur : sessionGoalAhead (le
            // score du jour, ou null) TOUJOURS renvoyé ; NOTE appendue à l'insight, aucune autre branche
            // touchée. Garde-fous honnêtes : (1) au VERT seulement (≥ 75) — un jour moyen/bas × marge n'a
            // besoin d'aucune pression en plus ; (2) séance du jour PAS encore faite (sportDoneToday faux) —
            // si Adrien a déjà banké une séance aujourd'hui, le coussin est pris, inutile de pousser une 2e
            // séance le même jour (ce serait contredire la philosophie readiness qui protège du surmenage).
            // MUTUELLEMENT EXCLUSIF de restOverGoal (tight × plancher) par branche (onpace vs tight) et des
            // notes focus (chosen.pillar === 'sport'). Vocabulaire distinct (« engranger une séance
            // d'avance ») — zéro collision à l'œil ni en regex avec focusGoalAhead (« prendre de l'avance »),
            // l'action readiness sport (« c'est le jour d'une vraie séance ») ni readinessBoost (« Ce qui te
            // porte aujourd'hui »). Données réelles : exige un check-in de récup DU JOUR.
            if (!sportDoneToday && typeof readinessScore === 'function') {
              const todayR = (Array.isArray(s.recovery) ? s.recovery : []).find(r => r && r.date === todayKey);
              const rs = todayR ? readinessScore(todayR) : null;
              if (rs && rs.score >= 75) {
                sessionGoalAhead = rs.score;
                insight += ` Et ton corps est au vert ce matin (readiness ${rs.score}/100) : rien ne t’oblige à t’entraîner aujourd’hui, mais profite de cette forme pour engranger une séance d’avance — une de plus maintenant te fait un coussin qui met l’objectif à l’abri si un jour creux tombe plus tard, sans sprint serré en fin de semaine.`;
              }
            }
          }
        }
      }
    } else if (chosen.pillar === 'focus' && typeof focusWeekGoal === 'function') {
      const fw = focusWeekGoal(s.focusSessions, todayKey);
      if (fw && fw.status === 'done') {
        insight += ` Objectif hebdo atteint : ${fw.done}/${fw.target} min 💪`;
        // OBJECTIF BOUCLÉ × FORME AU VERT → PUR BONUS. Le pendant, côté objectif DÉJÀ TENU, de
        // focusGoalAhead (#535, objectif LARGE non tenu × vert → prendre de l'avance). Les deux recaps
        // #536/#537 signalaient cette suite : quand l'objectif hebdo est DÉJÀ atteint (status 'done', le
        // « atteint 💪 » historique) ET qu'un check-in de récup DU JOUR met la tête au vert (≥ 75), la
        // branche « done » ne lisait pas du tout la forme — le coach laissait un bon jour sans mot. Or le
        // cadrage juste n'est NI « prendre de l'avance » (focusGoalAhead : là il RESTE un objectif à
        // sécuriser, on constitue un coussin) NI une injonction : l'objectif est bouclé, tout bloc de plus
        // est du PUR BONUS, à faire par envie et sans la moindre pression. On le NOMME comme tel — c'est le
        // ton RPG motivant SANS culpabilité (« si l'envie te prend »), et ça reconnaît le PROGRÈS (objectif
        // tenu) au lieu de le laisser muet. Additif pur : focusGoalBonus (le score du jour, ou null)
        // TOUJOURS renvoyé ; note APPENDUE au « atteint 💪 », aucune autre branche touchée. Garde-fous
        // honnêtes : (1) au VERT seulement (≥ 75) — un jour moyen/bas × objectif bouclé n'a besoin d'aucun
        // mot (l'objectif est tenu, inutile de pousser un bloc de plus sur une tête moyenne) ; (2) exige un
        // check-in de récup DU JOUR (données réelles). MUTUELLEMENT EXCLUSIF de toutes les notes d'allure
        // (focusGoalFresh/Drained/Steady/Ahead) par construction (branche 'done' vs 'behind'). Côté SPORT,
        // on s'abstient volontairement : l'action readiness sport pousse déjà « monte l'intensité » au vert,
        // un « bonus sans pression » brouillerait le message (piste laissée au recap). Vocabulaire distinct
        // (« objectif bouclé », « pur bonus », « au rendez-vous ce matin ») — zéro collision à l'œil ni en
        // regex avec focusGoalAhead (« ta tête est claire ce matin », « prendre de l'avance »), fresh (« au
        // vert ce matin »), steady (« tient la route ce matin ») ni drained (« à plat ce matin »).
        if (typeof readinessScore === 'function') {
          const todayR = (Array.isArray(s.recovery) ? s.recovery : []).find(r => r && r.date === todayKey);
          const rs = todayR ? readinessScore(todayR) : null;
          if (rs && rs.score >= 75) {
            focusGoalBonus = rs.score;
            insight += ` Objectif bouclé et la forme est au rendez-vous ce matin (readiness ${rs.score}/100) : plus aucune cible à tenir — un bloc de plus serait du pur bonus, sans la moindre pression, juste un peu d’avance offerte à ta semaine prochaine si l’envie te prend.`;
          }
        }
      } else if (fw) {
        insight += ` Objectif hebdo : ${fw.done}/${fw.target} min de focus.`;
        // Allure de l'objectif focus — le pendant, côté FOCUS, de sessionGoalPace (sport). Le compteur
        // « 25/120 min » dit OÙ en est Adrien, jamais s'il tient encore la cadence pour boucler la semaine
        // ni combien viser par jour pour tenir. À la différence des séances (une par DATE distincte, d'où un
        // « hors de portée » quand il ne reste plus assez de dates), les minutes de focus s'ACCUMULENT :
        // aujourd'hui reste toujours utilisable et il n'existe pas de cas structurellement impossible → deux
        // registres HONNÊTES seulement (marge vs serré), pas un « unreachable » factice. Les jours restants
        // INCLUENT donc aujourd'hui. On donne la conduite concrète — combien de minutes par jour restant —
        // « adaptation aux progrès ET aux écarts ». Note APPENDUE au compteur ; focusGoalPace ('onpace' |
        // 'tight' | null) TOUJOURS renvoyé. Ne parle que si l'objectif n'est pas atteint (status !== 'done',
        // sinon le « atteint 💪 » suffit).
        const daysSinceMonday = Math.round((t0 - new Date(monday + 'T12:00:00').getTime()) / dayMs);
        const daysLeftIncl = 7 - daysSinceMonday; // aujourd'hui compris (1 le dimanche … 7 le lundi)
        const perDay = Math.ceil(fw.remaining / daysLeftIncl);
        const sD = daysLeftIncl > 1 ? 's' : '';
        if (perDay > 60) {
          focusGoalPace = 'tight';
          insight += ` Serré : ${fw.remaining} min restantes pour ${daysLeftIncl} jour${sD} — cale un vrai bloc d’~${perDay} min chaque jour pour tenir la cible.`;
          // Réconciliation POSITIVE côté FOCUS — le pendant EXACT, côté focus, de lowLoadUnderGoal (sport,
          // #507). Là, une charge en sous-charge (ACWR bas) jouait le rôle de « feu vert corps » qui
          // s'ALIGNE avec un objectif hebdo serré. Le focus n'a pas d'ACWR (les minutes s'accumulent, aucune
          // notion de charge/récup), MAIS la readiness du matin — sommeil, fatigue, courbatures — mesure la
          // FRAÎCHEUR d'esprit, et un cerveau reposé encaisse un gros bloc de concentration comme un corps
          // frais encaisse une séance. Quand l'allure focus est SERRÉE (« cale ~90 min aujourd'hui ») ET
          // qu'un check-in de récup DATÉ DU JOUR met la forme au vert (score ≥ 75, même seuil que le feu
          // vert sport « prêt à pousser »), les deux signaux ne se contredisent pas : ils s'ALIGNENT — le
          // calendrier réclame un vrai bloc ET la tête est exactement fraîche pour le tenir. On le NOMME
          // (pas un conflit à désamorcer comme restOverGoal : une opportunité à souligner). Additif pur :
          // focusGoalFresh (le score, ou null) TOUJOURS renvoyé ; note APPENDUE, aucune autre branche
          // touchée. Mutuellement exclusif des notes sport (restOverGoal/lowLoadUnderGoal, branche
          // chosen.pillar === 'sport') par construction. Données réelles seulement : exige un check-in de
          // récup du jour ET un objectif focus rendu serré par le calendrier.
          // RÉCONCILIATION du CONFLIT côté FOCUS — le pendant EXACT et OPPOSÉ de focusGoalFresh (#509),
          // et le symétrique côté FOCUS de restOverGoal (#504, sport serré × forme à plat → la récup
          // prime). #509 a nommé l'ALIGNEMENT (allure focus serrée × readiness au VERT → fonce) mais a
          // laissé ouvert le CONFLIT : une allure serrée qui réclame un vrai bloc de ~90 min ALORS QUE la
          // readiness du matin est au PLANCHER (< 50, même seuil que le feu rouge sport). Un cerveau
          // épuisé (nuit courte, fatigue, courbatures) ne produit pas de deep work — s'acharner sur un gros
          // bloc empile des minutes creuses qui n'avancent pas vraiment l'objectif et creusent la fatigue.
          // À la différence du sport (rater LA séance fait glisser l'objectif de séances/dates), les
          // minutes de focus s'ACCUMULENT : un esprit frais rattrapera ces minutes bien plus vite qu'un
          // cerveau brumeux qui s'entête. Le coach TRANCHE honnêtement — la récup avant le chiffre : un
          // focus court et facile aujourd'hui, on protège la tête, on rattrape demain. C'est
          // l'« adaptation aux écarts » demandée, appliquée au conflit focus le plus piégeux. Additif pur :
          // focusGoalDrained (le score du jour, ou null) TOUJOURS renvoyé ; note APPENDUE, aucune autre
          // branche touchée. MUTUELLEMENT EXCLUSIF de focusGoalFresh (≥ 75 XOR < 50) et des notes sport
          // (branche chosen.pillar === 'sport') par construction. Données réelles seulement : exige un
          // check-in de récup DU JOUR ET un objectif focus rendu serré par le calendrier.
          if (typeof readinessScore === 'function') {
            const todayR = (Array.isArray(s.recovery) ? s.recovery : []).find(r => r && r.date === todayKey);
            const rs = todayR ? readinessScore(todayR) : null;
            if (rs && rs.score >= 75) {
              focusGoalFresh = rs.score;
              insight += ` Et bonne nouvelle : cette cadence serrée tombe pile — ta forme est au vert ce matin (readiness ${rs.score}/100), l’esprit est frais pour tenir un vrai bloc. Les deux signaux s’alignent : c’est LE moment de pousser pour boucler l’objectif focus.`;
              // Nommer CE QUI porte cette fraîcheur mentale — le pendant EXACT, côté FOCUS, de readinessBoost
              // (#531, sport). focusGoalFresh vient de dire que la readiness est au vert, mais reste muet sur
              // QUELLE composante du check-in la porte. On lit readinessDriver (le même helper pur : la
              // composante la plus proche de son max si elle domine nette), et on ne la crédite QUE si c'est le
              // SOMMEIL ou l'ÉNERGIE (fatigue basse) — les vrais carburants d'un vrai bloc de concentration. Des
              // muscles frais (soreness dominant) ne « portent » PAS le deep work : ce serait une explication
              // douteuse, alors on se tait plutôt que de la servir (honnêteté avant complétude). Reconnaître le
              // bon geste qui paie — une belle nuit, une énergie au top — ferme la boucle « adaptation aux
              // PROGRÈS » côté focus : Adrien voit quel comportement lui donne un cerveau prêt et le RÉPÈTE.
              // Additif pur : champ focusFreshDriver ({ factor: 'sleep'|'fatigue', value } ou null) TOUJOURS
              // renvoyé ; note APPENDUE à l'insight, aucune autre branche touchée. Vocabulaire distinct (« nourrit
              // cette fraîcheur mentale ») — zéro collision à l'œil ni en regex avec readinessBoost côté sport
              // (« Ce qui te porte aujourd'hui ») ni avec la note focusGoalFresh elle-même (« les deux signaux
              // s'alignent »). Réemploi total de readinessDriver — zéro nouvelle fonction.
              if (typeof readinessDriver === 'function') {
                const drv = readinessDriver(todayR);
                if (drv && (drv.factor === 'sleep' || drv.factor === 'fatigue')) {
                  focusFreshDriver = { factor: drv.factor, value: drv.value };
                  if (drv.factor === 'sleep') insight += ` Et ce qui nourrit cette fraîcheur mentale : ta nuit de ${String(drv.value).replace('.', ',')} h — un cerveau reposé est le vrai carburant du deep work, attaque d’abord ta tâche la plus exigeante tant que la tête suit.`;
                  else insight += ` Et ce qui nourrit cette fraîcheur mentale : ton énergie est au top (fatigue ${drv.value}/5) — l’esprit est vif, profite-en pour aller au fond du bloc le plus dur avant que la journée l’entame.`;
                }
              }
            } else if (rs && rs.score < 50) {
              focusGoalDrained = rs.score;
              insight += ` Mais ta forme est à plat ce matin (readiness ${rs.score}/100) : un cerveau fatigué ne produit pas un vrai bloc profond, et t’acharner empilerait des minutes creuses sans avancer l’objectif. Un focus court et facile aujourd’hui, soigne ta récup — l’esprit frais rattrapera ces minutes bien plus vite.`;
              // Nommer CE QUI plombe l'esprit — le pendant EXACT et OPPOSÉ de focusFreshDriver (#532), et
              // le symétrique côté FOCUS de readinessDrag (#525, sport). focusGoalDrained vient de dire que
              // la readiness est au plancher, mais reste muet sur QUELLE composante du check-in brume la
              // tête. On lit readinessLimiter (le même helper pur que le drag sport : le frein DOMINANT), et
              // on ne le crédite QUE si c'est le SOMMEIL ou l'ÉNERGIE (fatigue haute) — les seuls freins qui
              // plombent VRAIMENT un bloc de concentration. Des muscles douloureux (soreness dominant)
              // pèsent sur une SÉANCE, pas sur le deep work : les nommer comme cause d'un cerveau brumeux
              // serait une explication douteuse, alors on se tait (honnêteté avant complétude — exactement
              // le miroir du garde-fou de focusFreshDriver, qui écarte les muscles frais côté positif).
              // Reconnaître le frein qui compte rend l'action bien plus actionnable qu'un score nu : Adrien
              // sait QUOI soigner ce soir (recharger le sommeil, se reposer) pour retrouver un esprit prêt.
              // Additif pur : champ focusDrainDriver ({ factor: 'sleep'|'fatigue', value } ou null) TOUJOURS
              // renvoyé ; note APPENDUE à l'insight, aucune autre branche touchée. MUTUELLEMENT EXCLUSIF de
              // focusFreshDriver par construction (drained sur < 50 XOR fresh sur ≥ 75). Vocabulaire distinct
              // (« Et ce qui te plombe la tête ») — zéro collision à l'œil ni en regex avec readinessDrag
              // sport (« Ce qui pèse le plus »), focusFreshDriver (« nourrit cette fraîcheur mentale ») ni la
              // note focusGoalDrained elle-même. Réemploi total de readinessLimiter — zéro nouvelle fonction.
              if (typeof readinessLimiter === 'function') {
                const lim = readinessLimiter(todayR);
                if (lim && (lim.factor === 'sleep' || lim.factor === 'fatigue')) {
                  focusDrainDriver = { factor: lim.factor, value: lim.value };
                  if (lim.factor === 'sleep') insight += ` Et ce qui te plombe la tête aujourd’hui : ta nuit courte de ${String(lim.value).replace('.', ',')} h — recharge le sommeil ce soir, c’est lui qui remettra ton cerveau en état de deep work, pas l’acharnement du jour.`;
                  else insight += ` Et ce qui te plombe la tête aujourd’hui : ta fatigue générale (${lim.value}/5) — le repos de ce soir vaut plus qu’un bloc forcé maintenant, tu retrouveras un esprit bien plus tranchant demain.`;
                }
              }
            } else if (rs && rs.score >= 50) {
              // ZONE MÉDIANE FOCUS (50 ≤ readiness < 75) — le trou honnête laissé béant par #532/#533 et
              // signalé dans le recap #533. Quand l'allure focus est SERRÉE, la branche du jour ne parlait
              // qu'aux DEUX extrêmes : readiness au VERT (≥ 75 → focusGoalFresh « c'est LE moment de pousser »)
              // ou au PLANCHER (< 50 → focusGoalDrained « focus court, soigne ta récup »). Entre les deux — une
              // forme simplement CORRECTE, la majorité des jours — le coach restait totalement MUET sur l'état
              // du cerveau : ni encouragement à foncer (surpromettre serait malhonnête), ni frein à protéger la
              // récup (dramatiser un jour moyen le serait aussi). C'est exactement le pendant, côté FOCUS, du
              // « séance correcte, mais garde une marge : pas de record aujourd'hui » que le coach SPORT sert
              // déjà dans sa zone médiane (branche readiness plus bas). On comble le trou d'un mot HONNÊTE et
              // calibré : forme correcte → cale un bloc MESURÉ, tiens la cible sans forcer un marathon de deep
              // work — la régularité d'un bloc net vaut mieux qu'un exploit arraché un jour moyen. Additif pur :
              // focusGoalSteady (le score du jour, ou null) TOUJOURS renvoyé ; note APPENDUE à l'insight, aucune
              // autre branche touchée. MUTUELLEMENT EXCLUSIF de focusGoalFresh (≥ 75) et focusGoalDrained (< 50)
              // par construction (50 ≤ score < 75). Vocabulaire distinct (« Ta forme tient la route ce matin »)
              // — zéro collision à l'œil ni en regex avec « ta forme est au vert ce matin » (fresh) ni « ta
              // forme est à plat ce matin » (drained). Données réelles : exige un check-in de récup DU JOUR et
              // un objectif focus rendu serré par le calendrier.
              focusGoalSteady = rs.score;
              insight += ` Ta forme tient la route ce matin (readiness ${rs.score}/100) sans être au top : cale un bloc mesuré — tiens la cible du jour sans forcer un marathon de deep work, un bloc net et régulier fait avancer l’objectif sans creuser la fatigue.`;
            }
          }
        } else {
          focusGoalPace = 'onpace';
          insight += ` Dans les temps : ~${perDay} min/jour sur le${sD} ${daysLeftIncl} jour${sD} restant${sD} et l’objectif tombe — tu as la marge.`;
          // PRENDRE DE L'AVANCE côté FOCUS — le pendant PROACTIF de focusGoalFresh (#509). Là, focusGoalFresh
          // fire quand l'allure est SERRÉE × readiness au vert : la tête fraîche tombe pile pour un bloc
          // NÉCESSAIRE (réactif — le calendrier réclame l'effort). Mais quand l'allure est LARGE (onpace, « tu
          // as la marge ») ET que la readiness du matin est au vert, la branche ne lisait pas du tout la forme
          // du jour : le coach laissait filer une occasion pourtant précieuse. Les minutes de focus
          // s'ACCUMULENT (aucune perte à les avancer, à la différence d'une séance sport datée) : engranger un
          // vrai bloc un jour où l'esprit est clair ET où rien n'y oblige, c'est se constituer un COUSSIN qui
          // amortira un jour creux plus tard sans stress. C'est l'« adaptation aux PROGRÈS » proactive — le
          // même feu vert corps que le sport (readiness ≥ 75 → « c'est le jour d'une vraie séance, monte
          // l'intensité »), appliqué à la concentration quand on a de la marge. On INVITE, sans pression :
          // profiter de la marge tant que la tête suit. Additif pur : focusGoalAhead (le score du jour, ou
          // null) TOUJOURS renvoyé ; note APPENDUE, aucune autre branche touchée. MUTUELLEMENT EXCLUSIF de
          // focusGoalFresh/Steady/Drained par construction (branche onpace vs tight — perDay ≤ 60 XOR > 60) et
          // des notes sport (chosen.pillar === 'sport'). On ne parle QU'au vert (≥ 75, même seuil que partout) :
          // un jour moyen ou bas × objectif large n'a besoin d'aucun mot (la marge suffit, inutile d'ajouter de
          // la pression). Données réelles : exige un check-in de récup DU JOUR. Vocabulaire distinct (« ta tête
          // est claire ce matin », « prendre de l'avance ») — zéro collision à l'œil ni en regex avec « au vert
          // ce matin » (fresh), « tient la route ce matin » (steady) ni « à plat ce matin » (drained).
          if (typeof readinessScore === 'function') {
            const todayR = (Array.isArray(s.recovery) ? s.recovery : []).find(r => r && r.date === todayKey);
            const rs = todayR ? readinessScore(todayR) : null;
            if (rs && rs.score >= 75) {
              focusGoalAhead = rs.score;
              insight += ` Et ta tête est claire ce matin (readiness ${rs.score}/100) : profite de cette marge pour prendre de l’avance sur l’objectif tant que c’est facile — un vrai bloc engrangé maintenant te fait un coussin qui amortira un jour creux plus tard, sans stress.`;
              // NOMMER CE QUI TE DONNE CETTE CLARTÉ — le pendant EXACT de focusFreshDriver (#532), appliqué à
              // la branche d'AVANCE (onpace × vert) au lieu de la branche serrée (tight × vert). focusGoalAhead
              // vient de dire que la tête est claire, mais reste MUET sur QUELLE composante du check-in la porte
              // — exactement le trou que #532 a comblé côté focusGoalFresh, et que le recap #535 signalait comme
              // suite (« la note d'avance pourrait nommer le moteur dominant du check-in »). On lit readinessDriver
              // (le même helper pur), et on ne le crédite QUE si c'est le SOMMEIL ou l'ÉNERGIE (fatigue basse) —
              // les vrais carburants d'un bloc de deep work. Des muscles frais (soreness dominant) ne « donnent »
              // PAS de clarté mentale : on se tait plutôt que de servir une explication douteuse (même garde-fou
              // honnête que focusFreshDriver côté positif). Reconnaître le bon geste qui paie ferme la boucle
              // « adaptation aux PROGRÈS » sur le cas d'avance aussi : Adrien voit quelle habitude lui offre ce mou
              // et la RÉPÈTE. Additif pur : champ focusAheadDriver ({ factor: 'sleep'|'fatigue', value } ou null)
              // TOUJOURS renvoyé ; note APPENDUE, aucune autre branche touchée. Contrairement au sport, PAS de
              // readinessBoost côté focus (readinessBoost est sport-only) → aucun risque de nommer deux fois le
              // même moteur dans la même carte. MUTUELLEMENT EXCLUSIF de focusFreshDriver (branche onpace vs tight).
              // Vocabulaire distinct (« ce qui te donne cette clarté ») — zéro collision à l'œil ni en regex avec
              // focusFreshDriver (« nourrit cette fraîcheur mentale »), focusDrainDriver (« te plombe la tête »),
              // readinessBoost (« Ce qui te porte aujourd'hui ») ni readinessDrag (« Ce qui pèse le plus »).
              // Réemploi total de readinessDriver — zéro nouvelle fonction.
              if (typeof readinessDriver === 'function') {
                const drv = readinessDriver(todayR);
                if (drv && (drv.factor === 'sleep' || drv.factor === 'fatigue')) {
                  focusAheadDriver = { factor: drv.factor, value: drv.value };
                  if (drv.factor === 'sleep') insight += ` Et ce qui te donne cette clarté : ta nuit de ${String(drv.value).replace('.', ',')} h — autant profiter d’un cerveau aussi reposé pour engranger un bloc de plus tant que ça tourne tout seul, c’est de l’avance prise sans forcer.`;
                  else insight += ` Et ce qui te donne cette clarté : ton énergie est au top (fatigue ${drv.value}/5) — un esprit aussi vif avance vite, saisis-le pour banker un bloc d’avance pendant que c’est facile.`;
                }
              }
            } else if (rs && rs.score < 50) {
              // CERVEAU À PLAT × MARGE → LÈVE LE PIED SANS CULPABILITÉ — le trou SYMÉTRIQUE de focusGoalAhead
              // (#535) dans la branche d'allure LARGE (onpace). focusGoalAhead saisit un bon jour (marge × vert
              // → prends de l'avance) ; mais la branche onpace ne lisait la forme QU'AU VERT (≥ 75) — un matin
              // où l'objectif focus est confortablement dans les temps ET où l'esprit est à plat (readiness
              // < 50), elle restait MUETTE, et l'action générique invitait quand même à un vrai bloc. Le
              // garde-fou du cerveau épuisé (focusGoalDrained, « un focus court, soigne ta récup ») n'existait
              // QUE dans la branche SERRÉE (tight, perDay > 60) : le calendrier confortable, lui, n'avait aucun
              // frein — pourtant c'est le cas où lever le pied coûte le MOINS. Le cadrage juste n'est donc pas
              // celui de la branche serrée (qui doit gérer une cible menacée) : ici l'objectif est DÉJÀ à
              // l'abri (tu as la marge), donc un jour au ralenti se rattrape tout seul → on rassure carrément.
              // On NOMME l'écart et on libère : focus léger ou vraie pause, la marge encaisse, tu repars plus
              // tranchant. C'est l'« adaptation aux écarts » appliquée au cas le plus bienveillant. Additif pur :
              // focusMarginDrained (le score du jour, ou null) TOUJOURS renvoyé ; note APPENDUE, aucune autre
              // branche touchée. MUTUELLEMENT EXCLUSIF de focusGoalAhead (≥ 75 XOR < 50, même branche onpace),
              // de focusGoalDrained/Fresh/Steady (branche tight, perDay > 60 XOR ≤ 60) et des notes sport
              // (chosen.pillar === 'sport'). Données réelles : exige un check-in de récup DU JOUR. Vocabulaire
              // distinct (« ton énergie mentale est basse ce matin », « tu as de la marge sur l'objectif »,
              // « ta marge encaisse ce jour au ralenti ») — zéro collision à l'œil ni en regex avec
              // focusGoalDrained (« à plat ce matin », « un cerveau fatigué ne produit pas un vrai bloc
              // profond »), focusGoalAhead (« ta tête est claire ce matin », « prendre de l'avance »),
              // focusGoalSteady (« tient la route ce matin ») ni readinessNutriGuard (« ta forme est basse ce
              // matin »). Zéro nouvelle fonction (réemploi de readinessScore).
              focusMarginDrained = rs.score;
              insight += ` Mais ton énergie mentale est basse ce matin (readiness ${rs.score}/100) : justement, tu as de la marge sur l’objectif — aucune raison de forcer un gros bloc aujourd’hui. Un focus léger, ou même une vraie pause, suffit largement : ta marge encaisse ce jour au ralenti sans stress, et tu repartiras l’esprit bien plus tranchant.`;
            }
          }
        }
      }
    }
  }
  // Coach CONSCIENT de la readiness — boucle coach × récupération (le pendant de coach × sommeil).
  // Quand le pilier choisi est le SPORT et qu'un check-in de récup existe AUJOURD'HUI, l'action
  // générique (« programme une séance courte ») s'efface au profit d'un conseil calé sur la forme
  // RÉELLE du jour, via readinessScore de la nuit du jour. Dire « fais une grosse séance » quand la
  // readiness est au plancher pousse à la blessure ou au dégoût ; dire « repose » quand tout est au
  // vert bride les progrès. On module donc l'intensité recommandée : allègement (mobilité/marche)
  // sous 50, feu vert pour pousser au-dessus de 75, séance mesurée entre les deux. On exige un
  // check-in DATÉ DU JOUR — une readiness d'hier ne dit rien de la forme d'aujourd'hui. (Le
  // micro-pas et le renfort, plus bas, peuvent encore prendre le dessus selon le suivi.)
  let readiness = null, restOverGoal = null, readinessDrag = null, readinessBoost = null;
  if (chosen.pillar === 'sport' && typeof readinessScore === 'function') {
    const todayR = (Array.isArray(s.recovery) ? s.recovery : []).find(r => r && r.date === todayKey);
    const rs = todayR ? readinessScore(todayR) : null;
    if (rs) {
      readiness = rs.score;
      // CONTRADICTION insight × action — le ton reinforce a écrit « … en hausse. Garde le rythme. »
      // (l. 5244), une INJONCTION à continuer sur sa lancée. Mais readiness < 50 fait basculer l'action
      // en « récupération prioritaire : … plutôt qu'une grosse séance aujourd'hui » : les deux côte à
      // côte, le coach POUSSE et FREINE le même jour (même défaut que restOverGoal l.5672 et le
      // followThrough #561/#567, qui ne désamorcent ce conflit que lorsqu'un objectif hebdo SERRÉ le
      // déclenche — le reinforce générique SANS objectif y échappait). On retire la seule injonction qui
      // contredit le repos du jour ; le constat « en hausse » (stat hebdo vraie) et le crédit du volume
      // restent. Curation, pas ajout (§3). Ne touche que le sport (seul pilier à porter une action
      // readiness) et le ton reinforce (seul à écrire cette phrase) → « Garde le rythme. » y est unique.
      if (rs.score < 50 && tone === 'reinforce') insight = insight.replace(' Garde le rythme.', '');
      if (rs.score < 50) action = `Readiness ${rs.score}/100 — récupération prioritaire : vise mobilité, marche ou technique légère plutôt qu’une grosse séance aujourd’hui.`;
      else if (rs.score >= 75) action = `Readiness ${rs.score}/100 — ton corps est prêt à pousser : c’est le jour d’une vraie séance, monte un peu l’intensité.`;
      else action = `Readiness ${rs.score}/100 — séance correcte, mais garde une marge : pas de record aujourd’hui.`;
      // Coach du POURQUOI de la forme — readinessScore donne le CHIFFRE (« readiness 63/100 »),
      // jamais la CAUSE. Quand la forme du jour bride la séance (score < 75, une vraie limitation à
      // expliquer) et qu'un frein DOMINE nettement le check-in (readinessLimiter : sommeil, fatigue
      // ou courbatures), le coach le NOMME et adapte le geste à CE frein précis — épargner les
      // muscles douloureux, baisser le volume, ou recharger le sommeil. Un « pourquoi » tiré des
      // composantes réelles rend l'action bien plus actionnable qu'un score nu, sans jamais
      // contredire l'intensité déjà posée (il la raffine). Additif pur : champ readinessDrag
      // ({ factor, value } ou null) TOUJOURS renvoyé ; note APPENDUE à l'action readiness, aucune
      // autre branche touchée. Vocabulaire distinct (« Ce qui pèse le plus ») — zéro collision à
      // l'œil ni en regex avec les guards sport (« socle invisible », « carburant », « matériau »,
      // « côté récupération »). Ne parle que sur données réelles (un frein réellement dominant).
      if (rs.score < 75 && typeof readinessLimiter === 'function') {
        const lim = readinessLimiter(todayR);
        if (lim) {
          readinessDrag = { factor: lim.factor, value: lim.value };
          if (lim.factor === 'soreness') action += ` Ce qui pèse le plus : tes courbatures (${lim.value}/5) — épargne les groupes musculaires déjà douloureux et laisse-les récupérer plutôt que de forcer dessus.`;
          else if (lim.factor === 'fatigue') action += ` Ce qui pèse le plus : ta fatigue générale (${lim.value}/5) — réduis le volume plutôt que l’intensité, et vise un vrai repos ce soir pour remonter.`;
          else action += ` Ce qui pèse le plus : ta nuit courte (${String(lim.value).replace('.', ',')} h) — garde léger, ce qui rechargera vraiment ta forme c’est le sommeil de ce soir, pas l’effort.`;
        }
      }
      // Coach du POURQUOI de la BONNE forme — le pendant POSITIF exact de readinessDrag (#525). readinessDrag
      // nomme le frein DOMINANT quand la forme BRIDE la séance (< 75) ; il restait aveugle au cas SYMÉTRIQUE :
      // la forme au VERT (≥ 75, « prêt à pousser ») portée par un bon comportement PRÉCIS. Or reconnaître CE
      // QUI paie — une belle nuit, des muscles frais, une énergie au top — ferme la boucle « adaptation aux
      // PROGRÈS » demandée pour la nuit : Adrien voit quel geste produit sa forme et le RÉPÈTE. On lit
      // readinessDriver (le pendant pur de readinessLimiter, même barème renormalisé) : la composante la plus
      // proche de son max, renvoyée SEULEMENT si elle domine nette (frac ≥ 0,75 ET ≥ 0,2 au-dessus de la 2e —
      // sinon plusieurs forces se valent, pas de moteur unique, on se tait). Le coach le NOMME et invite à
      // CAPITALISER, appendu à l'action « pousse ». Additif pur : champ readinessBoost ({ factor, value } ou
      // null) TOUJOURS renvoyé ; MUTUELLEMENT EXCLUSIF de readinessDrag (< 75 XOR ≥ 75). Vocabulaire distinct
      // (« Ce qui te porte aujourd'hui ») — zéro collision à l'œil ni en regex avec readinessDrag (« Ce qui
      // pèse le plus ») ni les guards. Si une branche plus urgente réécrit ensuite l'action (loadSpike,
      // doneToday…), la note disparaît sans contradiction — readinessBoost reste informatif dans le champ.
      if (rs.score >= 75 && typeof readinessDriver === 'function') {
        const drv = readinessDriver(todayR);
        if (drv) {
          readinessBoost = { factor: drv.factor, value: drv.value };
          if (drv.factor === 'soreness') action += ` Ce qui te porte aujourd’hui : tes muscles sont frais, sans courbatures (${drv.value}/5) — le corps est prêt à encaisser du volume, vas-y franchement et va chercher un vrai stimulus.`;
          else if (drv.factor === 'fatigue') action += ` Ce qui te porte aujourd’hui : ton énergie est au top (fatigue ${drv.value}/5) — profite de cette fraîcheur pour un vrai stimulus, c’est ces jours-là que les gains se construisent.`;
          else action += ` Ce qui te porte aujourd’hui : ta nuit de ${String(drv.value).replace('.', ',')} h — ce sommeil solide est le vrai moteur de ta forme, tu as tout pour aller chercher un stimulus franc. Capitalise dessus.`;
        }
      }
      // RÉCONCILIATION objectif hebdo × forme du jour — priorisation intelligente (« quoi faire en
      // premier aujourd'hui »). Quand l'allure de l'objectif hebdo est SERRÉE (sessionGoalPace 'tight' →
      // l'insight vient de dire « il en faut une chaque jour pour tenir l'objectif ») ET que la forme du
      // jour est à PLAT (readiness < 50 → l'action dit « récupération prioritaire, pas de grosse séance »),
      // l'insight et l'action se CONTREDISENT frontalement : pousse une séance chaque jour vs repose-toi
      // aujourd'hui. Laisser les deux côte à côte est un bug de crédibilité (le coach parle des deux coins
      // de la bouche). Le coach TRANCHE honnêtement — la récup passe avant le chiffre : rater la séance du
      // jour et laisser l'objectif hebdo glisser vaut mieux que forcer sur une réserve vide (blessure,
      // dégoût, forme qui s'enfonce). C'est l'« adaptation aux écarts » demandée pour la nuit, appliquée au
      // conflit le plus piégeux (le calendrier qui pousse quand le corps dit stop). Ne se déclenche QUE sur
      // ce conflit précis (tight × readiness plancher) — 'unreachable' dit déjà « repars plein lundi »
      // (aucune pression à désamorcer) et 'onpace' a de la marge (aucun conflit). Additif pur : restOverGoal
      // (le score du jour, ou null) TOUJOURS renvoyé ; NOTE appendue à l'insight, l'action de récup intacte.
      if (rs.score < 50 && sessionGoalPace === 'tight') {
        restOverGoal = rs.score;
        insight += ` Mais ta forme est à plat aujourd’hui (readiness ${rs.score}/100) : la récup prime sur le chiffre — mieux vaut manquer la séance du jour et laisser l’objectif glisser que de forcer sur une réserve vide, tu repars plus fort.`;
      }
    }
  }
  // Coach du RÉ-AMORÇAGE — ÉLIGIBILITÉ (calculée ici, APPLIQUÉE après les créneaux/micro-pas). Un
  // pilier DORMANT (ton 'revive' = ≥14 j sans activité) n'appelle pas le même geste qu'un simple
  // creux : après une longue coupure, l'énergie d'activation est à son maximum, et exiger la « séance
  // courte » habituelle intimide et fait remettre à demain. On abaissera l'ASK à un tout premier pas
  // ré-amorçant, proportionné à la durée de dormance du pilier — rallumer la mèche compte plus que
  // l'intensité. Distinct du micro-pas (#465), qui répond à un conseil IGNORÉ (coachLog) ; ici on
  // répond à la seule DORMANCE, même si le coach n'a jamais nagué ce pilier. Exclusions : le SPORT un
  // jour de récup (readiness < 50 → l'action dit déjà « repose », y caler « bouge 5 min » la
  // contredirait) et le SOMMEIL quand le coach sommeil a déjà un verdict riche (sleepIns non nul, plan
  // ou bilan). Ce flag COUPE aussi les créneaux (focusSlot/sportSlot) : « cale ta séance à 14:30 »
  // contredirait « juste 5 min ». (doneToday est toujours faux en revive : un geste du jour ferait
  // recentDays ≥ 1, donc plus de dormance — inutile de le tester.)
  const reviveEligible = tone === 'revive'
    && !(chosen.pillar === 'sport' && readiness != null && readiness < 50)
    && !(chosen.pillar === 'sommeil' && sleepIns);
  // Focus sommeil ENRICHI : on remplace le compteur générique par le vrai verdict chiffré du coach
  // sommeil (sleepCoachInsight) et, si un plan de recalage est actif, par la CIBLE de coucher du soir
  // (sleepPlanDay) — le coach cesse d'ignorer l'intelligence sommeil qui vit juste à côté.
  let sleepConflict = null, sleepConflictBedtime = null, sleepTrend = null, sleepBedtimeTrend = null;
  if (chosen.pillar === 'sommeil' && sleepIns) {
    insight = sleepIns.verdict;
    if (sleepIns.tone === 'urgent') headline = 'Ton sommeil déraille — priorité ce soir';
    // Coach CONSCIENT de la PENTE de sommeil — le pendant, côté SOMMEIL, de readinessSlide/readinessRebound
    // (#493/#494) côté sport. sleepCoachInsight donne un VERDICT ponctuel (moy. 7 j + dette + régularité)
    // mais reste aveugle à la DIRECTION : deux « moy. 6,5 h » n'appellent pas le même mot selon que les
    // nuits REMONTENT (recalage qui paie) ou s'ENFONCENT (dette qui s'installe). On lit sleepDurationTrend
    // (récente 7 j vs précédente 7 j) et, quand le verdict n'est PAS déjà « solide » (tone !== 'ok', sinon
    // « ça s'aggrave » contredirait « sommeil solide »), on NUANCE le verdict par sa pente :
    //   • qui s'enfonce (dir 'down') → on ALERTE sur la dégradation (urgence d'enrayer avant que la dette
    //     ne s'installe) — l'« adaptation aux écarts » ;
    //   • qui remonte (dir 'up')     → on CRÉDITE le progrès (« bonne pente, tiens le cap »), motivant même
    //     si le total reste court — l'« adaptation aux PROGRÈS » demandée pour la nuit.
    // Additif pur : champ sleepTrend (le delta en h, ou null) TOUJOURS renvoyé ; NOTE appendue à l'insight,
    // action (plan/bilan, plus bas) intacte. MUTUELLEMENT EXCLUSIF up XOR down (une pente à la fois). Ne se
    // déclenche que sur données réelles (≥ 3 nuits chiffrées récentes + une semaine précédente renseignée).
    if (sleepIns.tone !== 'ok' && typeof sleepDurationTrend === 'function') {
      const trend = sleepDurationTrend(s.recovery, todayKey, 7);
      if (trend && trend.prevAvg != null && trend.count >= 3) {
        const numH = n => String(n).replace('.', ',');
        if (trend.dir === 'down') {
          sleepTrend = trend.delta;
          insight += ` Et la pente s’enfonce : tes nuits sont passées de ${numH(trend.prevAvg)} à ${numH(trend.avg)} h (${numH(trend.delta)} h vs la semaine précédente) — enraye maintenant, avant que la dette ne s’installe.`;
        } else if (trend.dir === 'up') {
          sleepTrend = trend.delta;
          insight += ` Bonne nouvelle : ça remonte (+${numH(trend.delta)} h, de ${numH(trend.prevAvg)} à ${numH(trend.avg)} h vs la semaine précédente) — tu es sur la bonne pente, tiens le cap encore quelques soirs.`;
        }
      }
    }
    // Pente de la RÉGULARITÉ du COUCHER — l'axe complémentaire de la durée. Quand la tendance de DURÉE
    // n'a rien nuancé (sleepTrend null : UNE seule note de pente à la fois, comme les sœurs sport), on
    // regarde si la DISPERSION du coucher se RESSERRE (l'ancre circadienne se pose → on crédite) ou se
    // DISPERSE (le rythme part → on alerte, avant qu'un total correct ne s'effrite). Additif pur : champ
    // sleepBedtimeTrend (variation d'écart-type en min, signée, ou null) ; NOTE appendue à l'insight,
    // action intacte. Gardé par tone !== 'ok' (branche) ET sleepTrend === null (jamais deux notes de
    // pente le même jour). Données réelles seulement (≥ 3 couchers saisis dans CHAQUE fenêtre).
    if (sleepIns.tone !== 'ok' && sleepTrend === null && typeof bedtimeRegularityTrend === 'function') {
      const bt = bedtimeRegularityTrend(s.recovery, todayKey, 7);
      if (bt && bt.dir === 'dispersing') {
        sleepBedtimeTrend = bt.delta;
        insight += ` Et ton coucher se disperse : de ±${bt.prevStdevMin} à ±${bt.stdevMin} min d’un soir à l’autre (+${bt.delta} min) — ré-ancre une heure fixe avant que le rythme ne parte.`;
      } else if (bt && bt.dir === 'tightening') {
        sleepBedtimeTrend = bt.delta;
        insight += ` Bon signe : ton coucher se régularise (de ±${bt.prevStdevMin} à ±${bt.stdevMin} min d’un soir à l’autre, ${bt.delta} min) — l’ancre circadienne se pose, tiens le cap.`;
      }
    }
    const pd = (typeof sleepPlanDay === 'function') ? sleepPlanDay(s.sleepPlan, s.recovery, todayKey) : null;
    if (pd && !pd.reached) action = 'Vise un coucher à ' + pd.targetTime + ' ce soir (ton plan de recalage).';
    else if (pd && pd.reached) action = 'Tu tiens ta cible de ' + pd.goalTime + ' — verrouille l’habitude ce soir.';
    else action = sleepIns.irregular ? 'Couche-toi à heure fixe ce soir, même le week-end.' : 'Vise un coucher 30 min plus tôt ce soir.';
    // PREUVE d'impact : si tes propres données montrent que te coucher tôt paie, le coach le cite —
    // un « pourquoi » chiffré et personnel motive plus qu'un conseil générique (boucle avec #460).
    const imp = (typeof sleepImpactReport === 'function') ? sleepImpactReport(s, todayKey) : null;
    if (imp && imp.deltas.energy != null && imp.deltas.energy >= 0.5) action += ' Tes soirs couché tôt = +' + imp.deltas.energy + ' d’énergie le lendemain.';
    else if (imp && imp.deltas.focusMin >= 15) action += ' Couché tôt, tu enchaînes +' + imp.deltas.focusMin + ' min de focus le lendemain.';
    // Coach × AGENDA pour le SOMMEIL — le pendant, CÔTÉ SOIR, des créneaux focus/sport (#471/#472).
    // Ici on ne CHERCHE pas un créneau (le coucher-cible est déjà fixé par le plan) : on PROTÈGE la
    // fenêtre du soir. Quand un plan de recalage est actif (cible de coucher concrète) et qu'un RDV du
    // SOIR déborde sur la cible — il finit après (cible − 30 min de sas d'endormissement), voire au-delà
    // de la cible —, le coach le NOMME et alerte : « ce créneau mord sur ta cible, protège ta fenêtre ».
    // Un coucher-cible qu'un RDV tardif rend intenable est le premier saboteur d'un plan de recalage ;
    // le voir venir dans la vraie journée d'Adrien vaut mieux qu'un « couche-toi à HH:MM » aveugle.
    // Tout est comparé sur l'ÉCHELLE ANCRÉE (bedtimeAnchor, minutes depuis midi) — INDISPENSABLE ici :
    // la cible de recalage d'Adrien est souvent dans les PETITES HEURES (00:30, 01:00…), et sans ancrage
    // un RDV finissant à 23:30 semblerait « après » une cible de 00:30. On ne retient que les RDV qui
    // COMMENCENT le soir (heure ≥ 17:00) : « ce soir » sans ambiguïté sur la même date, et leur fin peut
    // franchir minuit (l'ancre la suit de façon monotone, ≥ 17:00 → l'ancre reste < minuit + durée). On
    // cite le RDV qui finit le plus TARD, par son heure de DÉBUT (toujours < 24:00 à l'affichage). Exige
    // un plan actif (pd) donc une cible concrète à protéger. Additif pur : champ sleepConflict (HH:MM de
    // début du RDV menaçant, ou null) ; la note ENRICHIT l'action, ne la remplace pas.
    const bedTarget = pd ? (pd.reached ? pd.goalTime : pd.targetTime) : null;
    const tgtAnchor = (bedTarget && typeof bedtimeAnchor === 'function') ? bedtimeAnchor(bedTarget) : null;
    if (tgtAnchor != null) {
      const windDown = 30;
      const threats = (Array.isArray(s.agenda) ? s.agenda : [])
        .filter(a => a && a.date === todayKey && !a.allDay && !a.completed && timeToMinutes(a.time) != null && timeToMinutes(a.time) >= 17 * 60)
        .map(a => { const st = timeToMinutes(a.time); return { st, endAnchor: bedtimeAnchor(a.time) + Math.max(1, Math.round(Number(a.durationMin) || 60)), title: String(a.title || 'Bloc').trim() }; })
        .filter(ev => ev.endAnchor > tgtAnchor - windDown)
        .sort((a, b) => b.endAnchor - a.endAnchor);
      if (threats.length) {
        const ev = threats[0];
        sleepConflict = minutesToTime(ev.st);
        const nom = ev.title ? `« ${ev.title} »` : 'Ton créneau du soir';
        // Ne plus seulement ALERTER : donner le geste concret (piste récurrente #477/#479). Deux cas selon
        // que le RDV finit APRÈS la cible ou seulement DANS le sas d'endormissement (30 min) avant elle :
        //  • fin APRÈS la cible → tenir l'heure-cible ce soir est devenu IMPOSSIBLE. Répéter « couche-toi à
        //    HH:MM » serait un ordre inatteignable ; le coach propose l'heure de coucher RÉALISTE — la fin du
        //    RDV — comme repli honnête : viser un coucher tenable juste après limite la casse mieux que de
        //    laisser Adrien repousser encore. Champ additif sleepConflictBedtime (ce coucher de repli).
        //  • fin AVANT la cible (dans le sas) → la cible tient ENCORE : filer au lit dès la fin, sans écran,
        //    suffit à l'honorer. Pas de repli à proposer (sleepConflictBedtime reste null).
        // L'heure de fin est reconvertie depuis l'échelle ANCRÉE (bedtimeFromAnchor), donc juste même quand
        // le RDV — ou la cible de recalage — franchit minuit.
        if (ev.endAnchor > tgtAnchor && typeof bedtimeFromAnchor === 'function') {
          sleepConflictBedtime = bedtimeFromAnchor(ev.endAnchor);
          action += ` ${nom} (à partir de ${sleepConflict}) finit vers ${sleepConflictBedtime}, après ta cible de ${bedTarget} — couche-toi dès sa fin plutôt que de repousser encore, protège ta fenêtre du soir.`;
        } else {
          action += ` ${nom} (à partir de ${sleepConflict}) mord sur ta cible de ${bedTarget} — file au lit dès sa fin, sans écran, pour protéger ta fenêtre du soir.`;
        }
      }
    }
  }
  // Focus nutrition ENRICHI (même esprit que le sommeil #459) : plutôt qu'un « renseigne tes
  // protéines » aveugle, le coach lit l'état RÉEL du jour — cible protéines calée sur le poids et
  // l'objectif d'Adrien (proteinTarget), consommé du jour, écart restant — et propose une COLLATION
  // concrète qui comble le trou (proteinSnackSuggestion). L'insight cite la SÉRIE protéines quand elle
  // court (l'app est gamifiée), sinon la régularité 7 j — la nutrition rejoint sport/focus/sommeil qui
  // parlent déjà chiffres. Dégrade proprement vers l'action générique si pas de cible exploitable.
  // Coach CONSCIENT de la PENTE d'ADHÉRENCE protéines (proteinTrend) — le pendant, côté NUTRITION façon
  // INTRANT, de ce que focusMinutesTrend fait pour le focus. Le résultat corporel (weightPace) a sa
  // pente ; l'HABITUDE protéines, elle, ne disait que son état PONCTUEL : « série en cours » ou « N/7
  // cette semaine ». Deux « 4/7 » n'appellent pas le même mot selon que la régularité MONTE (4 vs 1 la
  // semaine passée : ça décolle) ou S'EFFRITE (4 vs 7 : ça glisse). On compare le nombre de jours à la
  // cible de la fenêtre récente 7 j vs la précédente (proteinAdherenceTrend) et on NUANCE l'insight —
  // sans JAMAIS contredire la headline : sous une SÉRIE (ton célébratoire) on n'appende qu'une hausse ;
  // le verdict neutre « N/7, la régularité prime » (qui reconnaît déjà l'imperfection) accepte hausse
  // ET baisse. Additif pur : proteinTrend (delta jours, ou null) TOUJOURS renvoyé ; note appendue,
  // action (protéines) intacte. Semaine précédente renseignée requise (sinon null).
  let proteinTrend = null, proteinStreakActive = false;
  if (chosen.pillar === 'nutrition' && s.profile && typeof proteinTarget === 'function') {
    const tgt = proteinTarget(s.profile.weight, s.profile.goal).gramsPerDay;
    const nut = Array.isArray(s.nutrition) ? s.nutrition : [];
    if (tgt > 0) {
      const todayN = nut.find(n => n && n.date === todayKey) || null;
      const prot = todayN ? (Number(todayN.protein) || 0) : 0;
      const streak = (typeof proteinStreak === 'function') ? proteinStreak(nut, tgt, todayKey) : { current: 0, best: 0 };
      const onStreak = streak.current >= 2;
      proteinStreakActive = onStreak;
      if (onStreak) {
        insight = `🔥 ${streak.current} jours d’affilée à ta cible protéines (${tgt} g). Ne casse pas la série aujourd’hui.`;
      } else {
        const since = (typeof dateAfterDays === 'function') ? dateAfterDays(todayKey, -6) : null;
        const onTgt = (since && typeof proteinDaysOnTarget === 'function') ? proteinDaysOnTarget(nut, tgt, since, todayKey) : 0;
        insight = `${onTgt}/7 jours à ta cible protéines (${tgt} g) cette semaine. La régularité prime sur la perfection.`;
      }
      if (typeof proteinAdherenceTrend === 'function') {
        const pt = proteinAdherenceTrend(nut, tgt, todayKey, 7);
        if (pt && pt.prev != null) {
          if (pt.dir === 'up') {
            proteinTrend = pt.delta;
            insight += ` Et ta régularité grimpe : ${pt.recent} jours à la cible cette semaine vs ${pt.prev} la précédente (+${pt.delta}) — la dynamique est bonne, garde le cap.`;
          } else if (pt.dir === 'down' && !onStreak) {
            proteinTrend = pt.delta;
            insight += ` Mais ta régularité s’effrite : ${pt.recent} jours à la cible cette semaine vs ${pt.prev} la précédente (${pt.delta}) — un jour réglé aujourd’hui enraye la glissade.`;
          }
        }
      }
      const snack = (typeof proteinSnackSuggestion === 'function') ? proteinSnackSuggestion(prot, tgt) : null;
      if (snack) action = `Il te reste ${snack.gap} g de protéines aujourd’hui — ${snack.snack} (~${snack.snackProtein} g) comble l’écart.`;
      else if (prot > 0) action = `Cible protéines tenue (${prot}/${tgt} g) 💪 — verrouille l’eau et un fruit/légume.`;
    }
  }
  // Coach CONSCIENT de la PENTE d'HYDRATATION (hydrationTrend) — DERNIER intrant nutrition sans
  // conscience de tendance (le pendant EAU de proteinAdherenceTrend, #501 : « chiffrer aussi la pente
  // d'hydratation, même moule »). L'eau n'avait que son état PONCTUEL du jour (barre d'hydratation) ;
  // sa RÉGULARITÉ d'une semaine à l'autre restait muette. On lit hydrationAdherenceTrend (jours à la
  // cible de 8 verres, fenêtre récente 7 j vs précédente) et on NUANCE l'insight — mais SEULEMENT quand
  // la pente protéines n'a rien dit (proteinTrend null) : un seul intrant parle à la fois, PROTÉINES
  // d'abord (levier primaire), l'eau en RELAIS. C'est de la priorisation (« quoi regarder ensuite »),
  // pas un empilement de notes. Jamais « ça décroche » sous une série protéines célébrée
  // (proteinStreakActive). Additif pur : hydrationTrend (delta jours, ou null) TOUJOURS renvoyé ; note
  // appendue, action intacte. Semaine précédente renseignée requise (sinon null). Marche même sans
  // profil (l'eau ne dépend pas de la cible protéines) — cible de base 8 verres, le socle quotidien.
  let hydrationTrend = null;
  if (chosen.pillar === 'nutrition' && proteinTrend === null && typeof hydrationAdherenceTrend === 'function') {
    const nutH = Array.isArray(s.nutrition) ? s.nutrition : [];
    const ht = hydrationAdherenceTrend(nutH, 8, todayKey, 7);
    if (ht && ht.prev != null) {
      if (ht.dir === 'up') {
        hydrationTrend = ht.delta;
        insight += ` Et côté hydratation, ça suit : ${ht.recent} jours à tes 8 verres cette semaine vs ${ht.prev} la précédente (+${ht.delta}) — cette régularité soutient ta récup.`;
      } else if (ht.dir === 'down' && !proteinStreakActive) {
        hydrationTrend = ht.delta;
        insight += ` Côté hydratation en revanche, ça décroche : ${ht.recent} jours à tes 8 verres cette semaine vs ${ht.prev} la précédente (${ht.delta}) — un verre régulier soutient récup et satiété.`;
      }
    }
  }
  // Coach CONSCIENT des FRUITS & LÉGUMES — le SEUL champ du journal nutrition JAMAIS lu par le coach.
  // protein (le macro), water (l'hydratation) et le résultat balance ont chacun leur note ; le
  // MICRONUTRIMENT — fibres, vitamines, antioxydants, ce qui soutient récup, digestion et immunité —
  // restait totalement invisible, coché (ou non) chaque jour et pourtant muet, seulement effleuré par
  // l'action générique « verrouille l'eau et un fruit/légume ». On ne parle QUE quand Adrien SUIT
  // vraiment sa nutrition (assez de jours des 2 dernières semaines où protéines OU eau sont saisies)
  // mais NÉGLIGE la case fruit/légume : sans ce plancher de suivi, `fruit` à false serait juste « pas
  // loggé » (bruit), pas un vrai manque de micronutriments. Subordonné aux DEUX pentes d'intrant
  // (proteinTrend ET hydrationTrend null) : une seule note d'intrant à la fois, priorisation
  // protéines > eau > fruits/légumes (le micronutriment en DERNIER, exactement le motif du relais
  // hydratation). Additif pur : champ fruitGuard ({ fruitDays, trackedDays } ou null) TOUJOURS
  // renvoyé ; NOTE appendue à l'insight, action (protéines) intacte. Marche sans profil (le fruit ne
  // dépend d'aucune cible calculée), comme l'hydratation.
  let fruitGuard = null;
  if (chosen.pillar === 'nutrition' && proteinTrend === null && hydrationTrend === null
      && typeof daysHittingTarget === 'function' && typeof dateAfterDays === 'function') {
    const nutF = Array.isArray(s.nutrition) ? s.nutrition : [];
    const since = dateAfterDays(todayKey, -13);
    if (since) {
      const tracked = {};
      nutF.forEach(n => {
        if (n && /^\d{4}-\d{2}-\d{2}$/.test(String(n.date || '')) && n.date >= since && n.date <= todayKey
            && ((Number(n.protein) || 0) > 0 || (Number(n.water) || 0) > 0)) tracked[n.date] = true;
      });
      const trackedDays = Object.keys(tracked).length;
      const fruitDays = daysHittingTarget(nutF, 'fruit', 1, since, todayKey);
      // Vrai suivi (≥ 8 jours tracés sur 14) ET fruits/légumes nettement en retrait (≤ 1/3 des jours
      // suivis) : en-dessous, c'est du bruit (peu de suivi) ou un habit déjà correct (rien à corriger).
      if (trackedDays >= 8 && fruitDays <= Math.floor(trackedDays / 3)) {
        fruitGuard = { fruitDays, trackedDays };
        if (fruitDays === 0) {
          insight += ` Côté fruits et légumes en revanche, zéro sur tes ${trackedDays} jours suivis ces deux dernières semaines — tu gères tes protéines et ton eau, mais les fibres, vitamines et antioxydants (récup, digestion, immunité) manquent totalement à l’appel. Glisse un fruit ou une portion de légumes à un repas aujourd’hui, c’est le maillon le plus vite comblé.`;
        } else {
          insight += ` Côté fruits et légumes en revanche, seulement ${fruitDays} jour${fruitDays > 1 ? 's' : ''} sur tes ${trackedDays} jours suivis ces deux dernières semaines — tu gères protéines et eau, mais les fibres, vitamines et antioxydants (récup, digestion, immunité) suivent mal. Coche la case fruit/légume aujourd’hui : une portion à un repas et le maillon se comble.`;
        }
      }
    }
  }
  // Coach CONSCIENT du RÉSULTAT CORPOREL — la nutrition ne se juge pas qu'au compteur protéines du
  // jour : son VRAI mérite est le corps qui change. Jusqu'ici le focus nutrition parlait cible
  // protéines / collation / série, mais restait AVEUGLE à l'objectif de poids d'Adrien et à sa
  // progression réelle — le « pourquoi » de toute la discipline. Quand un objectif est fixé
  // (s.goals.targetWeight) et qu'une pesée exploitable existe, le coach cite l'avancement RÉEL vers la
  // cible (weightGoalProgress, l'outil déjà branché dans le plan « Coach & poids ») pour relier la
  // régularité nutrition du jour à son résultat tangible — un « pourquoi » chiffré et personnel motive
  // plus qu'un compteur isolé (même esprit que la preuve d'impact du sommeil, #460). Trois registres,
  // « adaptation aux progrès ET aux écarts » :
  //   • bien avancé (pct ≥ 50)   → on CRÉDITE : la nutrition PAIE, c'est le moteur du résultat.
  //   • en chemin (0 < pct < 50) → on ENCOURAGE : le résultat se construit, chaque jour réglé compte.
  //   • pas encore de résultat    → on RECADRE sans culpabiliser : la cible attend un premier mouvement,
  //     et ces jours de nutrition régulière sont exactement ce qui la débloque (nudge à se peser aussi).
  // weightGoalProgress renvoie déjà null si départ == cible (totalKg < 0,1). Additif pur : champ
  // weightGoalPct (0-100, ou null) TOUJOURS renvoyé ; note APPENDUE à l'insight, action (protéines)
  // intacte. Dégrade proprement (null) sans objectif de poids ou sans pesée/poids exploitable.
  // Coach CONSCIENT de la PENTE de POIDS (weightPace) — le pendant, côté NUTRITION, de ce que
  // readinessSlide/rebound font pour le sport et sleepDurationTrend pour le sommeil. weightGoalPct
  // dit le CUMUL (« 50% de l'objectif atteint »), un état des lieux depuis le départ — mais reste
  // AVEUGLE à la DIRECTION du moment : deux « 50% » n'appellent pas le même mot selon que la balance
  // PROGRESSE ENCORE (donner une ETA motivante) ou STAGNE / REPART (recadrer les calories, cas classique
  // du plateau où le % global rassure à tort). On lit weightTrend (rythme kg/sem sur les 6 dernières
  // pesées, direction, onTrack, semaines estimées vers la cible) et on NUANCE l'insight :
  //   • onTrack + ETA courte (≤ 26 sem) → CRÉDIT chiffré et projeté (« à ce rythme, cible dans ~N sem »)
  //   • onTrack mais horizon lointain    → CRÉDIT de direction sans ETA irréaliste (« ça va dans le bon sens »)
  //   • hors-piste, balance PLATE        → ALERTE plateau, orientée par le sens de l'objectif (calories/cardio)
  //   • hors-piste, MAUVAIS sens         → ALERTE dérive, resserre/remonte selon perte/prise
  // Additif pur : weightPace (kg/sem, ou null) TOUJOURS renvoyé ; NOTE appendue à l'insight, action
  // (protéines) intacte. Deux axes distincts (habitude nutrition vs résultat balance) → pas de
  // contradiction avec le ton. Données réelles seulement (≥ 2 pesées exploitables, sinon null).
  let weightGoalPct = null, weightPace = null, calorieTarget = null, sleepFatLossGuard = null, sleepGainGuard = null, recompFraming = null;
  if (chosen.pillar === 'nutrition' && typeof weightGoalProgress === 'function') {
    const tgtW = Number(s.goals && s.goals.targetWeight);
    const fbW = Number(s.profile && s.profile.weight);
    if (tgtW > 0) {
      const wp = weightGoalProgress(s.weights, tgtW, fbW);
      if (wp) {
        weightGoalPct = wp.pct;
        const numW = n => String(n).replace('.', ',');
        if (wp.pct >= 50) {
          insight += ` Et ça paie : ${wp.pct}% de ton objectif de ${wp.direction} atteint (${numW(wp.doneKg)} kg sur ${numW(wp.totalKg)}) — ta nutrition en est le moteur.`;
        } else if (wp.pct > 0) {
          insight += ` Ton objectif de ${wp.direction} avance (${wp.pct}%, ${numW(wp.doneKg)} kg sur ${numW(wp.totalKg)}) — chaque jour réglé sur ta cible rapproche le résultat.`;
        } else {
          insight += ` Ta cible de ${wp.direction} (${numW(wp.totalKg)} kg) attend encore un premier résultat — ces jours de nutrition régulière sont exactement ce qui la débloque.`;
        }
        if (typeof weightTrend === 'function') {
          const wt = weightTrend(s.weights, tgtW);
          if (wt) {
            weightPace = wt.ratePerWeek;
            const absR = numW(Math.abs(wt.ratePerWeek));
            if (wt.onTrack === true && wt.weeksToTarget != null && wt.weeksToTarget > 0) {
              insight += wt.weeksToTarget <= 26
                ? ` À ton rythme récent (${absR} kg/sem), tu touches ta cible dans ~${wt.weeksToTarget} semaine${wt.weeksToTarget > 1 ? 's' : ''} — tiens le cap.`
                : ` Et tes dernières pesées vont dans le bon sens (${absR} kg/sem) — tiens le cap, le résultat suit.`;
            } else if (wt.onTrack === false) {
              // Observation de la pente (plateau vs dérive), commune aux deux objectifs.
              const obs = wt.direction === 'flat'
                ? (wp.direction === 'perte'
                    ? `Mais la balance ne descend plus (${absR} kg/sem sur tes dernières pesées)`
                    : `Mais la balance ne monte plus (${absR} kg/sem sur tes dernières pesées)`)
                : (wp.direction === 'perte'
                    ? `Mais tes dernières pesées repartent à la hausse (+${absR} kg/sem)`
                    : `Mais tes dernières pesées repartent à la baisse (-${absR} kg/sem)`);
              // Conseil calorique CONCRET quand la stagnation est confirmée sur ~14 j (calorieAdjustment,
              // avec sa fenêtre et ses critères propres). Jusqu'ici le coach ne disait que « baisse un peu
              // tes calories » — vrai mais VAGUE. On calcule la cible calorique du jour (energyPlan depuis
              // le profil ; poids récent = wt.current, déjà en main) et, si la stagnation est confirmée, on
              // cite le NOMBRE exact (« vise ~1875 kcal/j, ~125 de moins ») — le même chiffre que la carte
              // « Coach Poids » propose déjà (calorieAdjustment y est branché), sans le dupliquer. Actionnable
              // plutôt que qualitatif. Dégrade proprement (profil incomplet, ou 14 j non confirmés → on garde
              // le conseil qualitatif). Suite directe de #499 (Suite possible : « citer la cible calorique »).
              const wantGoal = wp.direction === 'perte' ? 'perte' : 'prise';
              // RECOMPOSITION détectée AVANT le conseil calorique. Sur objectif de perte, si la balance
              // stagne (flat) mais que le tour de taille a fondu (≥ 1 cm, ~60 j), le corps recompose déjà :
              // couper serait l'erreur. On le repère ICI pour NE PAS émettre d'ordre de coupe (le « baisse
              // tes calories » vague OU la cible chiffrée « vise ~X kcal de moins ») qui contredirait
              // frontalement le recadrage « tiens tes calories » ajouté juste après — deux ordres opposés
              // dans la même phrase, corrigé boucle #564 (piège relevé en #561).
              let recompDetect = null;
              if (wt.direction === 'flat' && wp.direction === 'perte' && typeof measurementRecentDelta === 'function'
                  && typeof recompositionInsight === 'function') {
                const wd = measurementRecentDelta(s.measurements, 'waist', 60);
                const rec = wd ? recompositionInsight(0, wd.delta) : null;
                if (rec && rec.key === 'recomp') recompDetect = { waistDelta: wd.delta, spanDays: wd.spanDays };
              }
              let tail = wt.direction === 'flat'
                ? (wantGoal === 'perte'
                    ? ` — baisse un peu tes calories ou ajoute du cardio pour relancer.`
                    : ` — ajoute un peu de calories pour relancer la prise.`)
                : (wantGoal === 'perte'
                    ? ` — resserre tes calories pour reprendre la perte.`
                    : ` — remonte tes calories pour reprendre la prise.`);
              if (recompDetect) {
                // Recomposition en cours → aucun ordre de coupe : on clôt l'observation (« … dernières
                // pesées. ») et on laisse le recadrage recomposition ci-dessous porter seul le conseil.
                tail = `.`;
              } else if (typeof energyPlan === 'function' && typeof calorieAdjustment === 'function') {
                const plan = energyPlan({ weight: wt.current, height: s.profile && s.profile.height, age: s.profile && s.profile.age, sex: s.profile && s.profile.sex, activityLevel: s.profile && s.profile.activityLevel, sessionsPerWeek: s.goals && s.goals.sessions, targetWeight: tgtW, todayKey });
                if (plan && plan.goal === wantGoal) {
                  const adj = calorieAdjustment(s.weights, plan.goal, plan.dailyTarget);
                  if (adj && adj.stagnating) {
                    calorieTarget = adj.newTarget;
                    if (adj.delta > 0) {
                      tail = wantGoal === 'perte'
                        ? ` — vise ~${adj.newTarget} kcal/j (environ ${adj.delta} de moins) ou ajoute du cardio pour relancer.`
                        : ` — vise ~${adj.newTarget} kcal/j (environ ${adj.delta} de plus) pour relancer la prise.`;
                    } else {
                      tail = ` — tu es déjà au plancher calorique (~${adj.newTarget} kcal/j), relance par le cardio ou plus d'activité plutôt qu'une nouvelle baisse.`;
                    }
                  }
                }
              }
              insight += ` ${obs}${tail}`;
              // Coach du RÉ-CADRAGE par RECOMPOSITION — la balance ne dit pas tout. Détecté plus haut
              // (recompDetect, qui évince du même coup l'ordre de coupe) ; ici on POSE le recadrage. Un
              // poids stable peut MASQUER une vraie recomposition (perte de gras + maintien du muscle) — invisible
              // sur la balance, lisible seulement au TOUR DE TAILLE. Couper les calories dans ce cas serait une
              // erreur : le corps progresse déjà, on saperait le muscle pour rien. On lit measurementRecentDelta
              // ('waist', ~60 j) et on passe le duo (poids ~flat, delta taille) à recompositionInsight — deux
              // fonctions PURES existantes qui vivaient dans l'onglet Progrès (carte « Coach Poids » + panneau
              // mensurations), JAMAIS dans le coach du jour. Clé 'recomp' → on APPEND un recadrage qui NOMME le
              // cm perdu et invite à NE PAS resserrer encore (« la balance ne dit pas tout »). C'est l'axe
              // « adaptation dynamique aux PROGRÈS » : reconnaître un gain caché ET éviter un mauvais conseil.
              // HONNÊTE : ne parle QUE dans la branche flat (weight ~stable garanti → w=0 fidèle) et QUE si le
              // tour de taille a fondu d'au moins 1 cm (seuil porté par recompositionInsight, source unique).
              // Additif pur : champ recompFraming ({ waistDelta, spanDays } ou null) TOUJOURS renvoyé. Vocabulaire
              // distinct (« recomposition », « la balance ne dit pas tout », « tour de taille a fondu ») — zéro
              // collision avec les guards sommeil (« frein caché/invisible ») ni la note flat (« resserre »).
              if (recompDetect) {
                recompFraming = recompDetect;
                insight += ` Avant de resserrer pour autant : ton tour de taille a fondu de ${numW(Math.abs(recompDetect.waistDelta))} cm sur les ${recompDetect.spanDays} derniers jours pendant que la balance stagnait — c’est de la recomposition (tu perds du gras en gardant le muscle), un progrès réel que le poids seul cache. La balance ne dit pas tout : tiens tes calories et tes protéines encore une semaine avant de couper, le résultat est déjà en cours.`;
              }
            }
          }
        }
        // Coach INTER-PILIER — le SOMMEIL, frein CACHÉ de la perte de gras. Toutes les notes nutrition
        // ci-dessus restent DANS le pilier nutrition (protéines, hydratation, calories, balance). Mais un
        // objectif de PERTE peut caler pour une raison qui n'est ni dans l'assiette ni sur la balance : le
        // manque de sommeil. Chroniquement court (< 7 h de moyenne = le seuil 'court' de weeklySleepStats),
        // le sommeil fait grimper la ghréline (faim) et le cortisol (stockage/rétention), et rogne la part
        // de MASSE MAIGRE perdue — un frein hormonal réel, jamais nommé par le coach nutrition jusqu'ici. On
        // réemploie sleepIns (sleepCoachInsight, déjà calculé en tête) : quand l'objectif est une PERTE ET
        // que la moyenne récente est sous 7 h sur ≥ 3 nuits, on APPEND une note qui NOMME le levier caché.
        // C'est un croisement de piliers (pas une énième nuance intra-nutrition) : le coach dit « ta perte
        // peut buter sur tes nuits, pas seulement sur tes calories ». MUTUELLEMENT COMPATIBLE avec le
        // sommeil-pilier : si le sommeil est en ALERTE (tone 'urgent'), il a été forcé en tête (tier -1) et
        // chosen.pillar === 'sommeil' → on n'est PAS ici ; cette note ne parle QUE dans le cas subtil où le
        // sommeil est court sans être le focus du jour (le frein qu'on ne verrait pas autrement). Ne vise
        // que la PERTE (le lien hormonal ghréline/cortisol × déficit y est le plus net et défendable ; la
        // prise a d'autres leviers). Additif pur : sleepFatLossGuard (la moyenne h, ou null) TOUJOURS
        // renvoyé ; note APPENDUE, aucune autre branche touchée. Données réelles seulement (≥ 3 nuits).
        if (wp.direction === 'perte' && sleepIns && sleepIns.nights >= 3 && sleepIns.avg > 0 && sleepIns.avg < 7) {
          sleepFatLossGuard = sleepIns.avg;
          const numW = n => String(n).replace('.', ',');
          const detteTxt = (sleepIns.debt > 0) ? ` (dette de ${numW(sleepIns.debt)} h sur 14 j)` : '';
          insight += ` Et surveille un frein caché : tu dors ${numW(sleepIns.avg)} h en moyenne ces derniers jours${detteTxt}, sous les 7 h — le manque de sommeil pousse la faim (ghréline) et le stockage (cortisol) à la hausse et freine la perte de gras autant qu’un écart d’assiette. Mieux dormir fait partie du plan, pas seulement mieux manger.`;
        } else if (wp.direction === 'prise' && sleepIns && sleepIns.nights >= 3 && sleepIns.avg > 0 && sleepIns.avg < 7) {
          // PENDANT côté PRISE de #511 (perte). Le lien hormonal est INVERSE : sur un objectif de prise de
          // muscle, la nuit courte fait chuter la testostérone et l'hormone de croissance (sécrétée surtout
          // en sommeil profond), bride la SYNTHÈSE PROTÉIQUE et la récup — donc ton surplus calorique se
          // range davantage en GRAS qu'en muscle. Manger plus ne suffit pas si le corps ne construit pas la
          // nuit. Message et champ DISTINCTS de la perte (masse maigre vs gras) : libellé « frein invisible »
          // (≠ « frein caché » de la perte, pour ne pas confondre les deux notes ni les tests), champ dédié
          // sleepGainGuard. Même gate de données réelles (≥ 3 nuits chiffrées, moyenne < 7 h) et même
          // compatibilité avec le sommeil-pilier (tone 'urgent' → chosen.pillar === 'sommeil', on n'est pas
          // ici). Additif pur : sleepGainGuard TOUJOURS renvoyé (null par défaut), note appendue seule.
          sleepGainGuard = sleepIns.avg;
          const numW = n => String(n).replace('.', ',');
          const detteTxt = (sleepIns.debt > 0) ? ` (dette de ${numW(sleepIns.debt)} h sur 14 j)` : '';
          insight += ` Et surveille un frein invisible : tu dors ${numW(sleepIns.avg)} h en moyenne ces derniers jours${detteTxt}, sous les 7 h — le manque de sommeil fait chuter la testostérone et l’hormone de croissance, bride la synthèse musculaire et range ton surplus en gras plutôt qu’en muscle. Bien dormir, c’est transformer tes calories en muscle, pas seulement en avaler plus.`;
        }
      }
    }
  }
  // Coach INTER-PILIER — la FORME du jour (readiness) × NUTRITION : le jour de fatigue est celui où
  // l'assiette dérape. Toutes les notes nutrition ci-dessus lisent l'assiette, la balance ou le sommeil
  // CHRONIQUE, mais restaient AVEUGLES à un signal AIGU pourtant décisif pour tenir son alimentation : la
  // forme du JOUR. Un matin de readiness basse (fatigue, courbatures, nuit courte cumulées), le corps
  // réclame du sucre rapide et la satiété se dérègle — c'est statistiquement LE jour de fringale et
  // d'écart, celui où la volonté seule cède. Le nommer, c'est transformer un jour à risque en jour où l'on
  // PROTÈGE l'essentiel (protéines, eau, repas réguliers) plutôt qu'un jour subi. DISTINCT des guards
  // sommeil (chroniques, hormonaux, adossés à un objectif de poids) : ici c'est l'ÉTAT AIGU du jour, sans
  // besoin d'objectif de poids. On exige un check-in DATÉ DU JOUR (une readiness d'hier ne dit rien de la
  // forme d'aujourd'hui) et un score < 50 (même seuil « plancher » que le feu rouge sport). RELAIS des
  // guards sommeil : n'entre QUE si aucun n'a parlé (une seule note inter-pilier/jour, même motif que
  // hydrationTrend-en-relais-de-proteinTrend). Additif pur : readinessNutriGuard (le score, ou null)
  // TOUJOURS renvoyé ; note APPENDUE, action (protéines) intacte. Données réelles seulement (check-in du
  // jour + score réellement sous 50).
  let readinessNutriGuard = null;
  if (chosen.pillar === 'nutrition' && sleepFatLossGuard === null && sleepGainGuard === null
    && typeof readinessScore === 'function') {
    const todayR = (Array.isArray(s.recovery) ? s.recovery : []).find(r => r && r.date === todayKey);
    const rs = todayR ? readinessScore(todayR) : null;
    if (rs && rs.score < 50) {
      readinessNutriGuard = rs.score;
      insight += ` Un dernier repère pour aujourd’hui : ta forme est basse ce matin (readiness ${rs.score}/100), et les jours de fatigue sont ceux où l’assiette dérape le plus — le corps réclame du sucre rapide et la satiété se dérègle. C’est justement aujourd’hui que tenir l’essentiel compte le plus : tes protéines, ton eau et des repas réguliers te protègent des fringales bien mieux que la volonté sur une réserve vide.`;
    }
  }
  // Focus ENRICHI (le pilier focus était le SEUL encore générique — cf. #465/#466). Comme le sport
  // lit la readiness et la nutrition la cible protéines, le focus lit la RÉPARTITION réelle du temps
  // de concentration par tâche (focusByTask sur 14 j — même fenêtre que la dynamique). Quand une
  // tâche PHARE nommée ressort, le coach la CITE dans l'action : « reprends « X », ton chantier
  // phare » vaut mieux qu'un « lance une session » aveugle — rouvrir un chantier connu coûte moins
  // que partir de zéro, et nommer la tâche prouve que le coach lit vraiment tes données. L'insight
  // garde le compteur d'objectif hebdo (bloc objectifs, plus haut). Dégrade proprement vers l'action
  // générique si aucune tâche nommée (que du « Sans titre » ou aucune session sur la fenêtre).
  // Longueur de bloc PERSONNALISÉE : plutôt qu'un « 25 min » arbitraire répété à tous, le coach cale
  // la durée du bloc suggéré sur la MÉDIANE réelle des sessions de focus récentes d'Adrien (14 j,
  // robuste aux extrêmes d'une session marathon ou d'un bloc avorté), arrondie à 5 min et bornée à
  // [10, 60]. Proposer SA durée habituelle rend le conseil crédible et atteignable — « un bloc de 45
  // min, ta durée habituelle » colle à qui il est, là où un 25 min générique peut sembler dérisoire
  // (ou infaisable) selon la personne. ≥3 sessions requises pour un signal stable ; sinon défaut 25.
  let focusTask = null, focusBlockMin = null, focusSlot = null, focusTrend = null;
  if (chosen.pillar === 'focus') {
    const durs = [];
    for (const f of (Array.isArray(s.focusSessions) ? s.focusSessions : [])) {
      if (!f) continue;
      const n = daysAgo(f.date);
      if (n === null || n > 13) continue;
      const m = Math.round(Number(f.minutes) || 0);
      if (m > 0) durs.push(m);
    }
    if (durs.length >= 3) {
      durs.sort((a, b) => a - b);
      const mid = Math.floor(durs.length / 2);
      const med = durs.length % 2 ? durs[mid] : (durs[mid - 1] + durs[mid]) / 2;
      focusBlockMin = Math.min(60, Math.max(10, Math.round(med / 5) * 5));
    }
    const blk = focusBlockMin || 25;
    const blkTxt = focusBlockMin ? `${blk} min (ta durée habituelle)` : `${blk} min`;
    const fb = (typeof focusByTask === 'function') ? focusByTask(s.focusSessions, todayKey, { days: 14 }) : { tasks: [] };
    const top = (fb.tasks || []).find(t => t && t.task && t.task !== 'Sans titre');
    // Coach CONSCIENT du frein FOCUS — le pendant, côté focus, du garde-fou SPORT de #585 (sportSlot /
    // sportZoneFocus gardés `readinessSlide == null`). Quand la readiness du JOUR est au plancher,
    // l'insight a DÉJÀ posé un frein explicite — « un focus court, soigne ta récup » (focusGoalDrained,
    // objectif serré) ou « un focus léger, ou même une vraie pause, suffit » (focusMarginDrained,
    // objectif large). Pousser en parallèle le bloc HABITUEL (« enchaîne un bloc de 45 min ») puis le
    // créneau où le caler CONTREDIT ce frein de front — exact anti-pattern §4 ter (chaque clause testée
    // seule, personne ne lit le cumulé), le pendant focus de la contradiction sport corrigée en #585.
    // On garde alors l'action de BASE (« Lance une session de focus de 25 min maintenant » — un bloc
    // COURT, cohérent avec « focus court/léger ») et on coupe la citation de la tâche phare + le créneau.
    // Aucune note ajoutée : deux poussées en moins les jours de tête à plat (« retirer une note en vaut
    // souvent deux ajoutées », §3). `readinessRebound` n'a pas d'équivalent focus ici : seuls ces deux
    // freins du JOUR coupent, jamais une simple zone médiane (focusGoalSteady) ni une avance (Ahead).
    const focusRested = focusGoalDrained != null || focusMarginDrained != null;
    if (top && !focusRested) {
      focusTask = top.task;
      if (tone === 'reinforce') action = `Ta concentration va surtout à « ${top.task} » (${top.minutes} min sur 14 j) — enchaîne un bloc de ${blkTxt} dessus aujourd’hui.`;
      else action = `Reprends « ${top.task} », ton chantier de focus phare (${top.minutes} min sur 14 j) — un bloc de ${blkTxt} suffit à relancer.`;
    } else if (focusBlockMin && !focusRested && (tone === 'rebuild' || tone === 'revive')) {
      // Pas de tâche nommée mais une durée habituelle connue → on personnalise quand même l'action générique.
      action = `Lance une session de focus de ${blkTxt} maintenant.`;
    }
    // Coach × AGENDA : le coach dit désormais QUAND caler le bloc, pas seulement quoi/combien. Quand
    // l'heure du jour est connue (opts.nowMinutes, passé par le rendu) et que l'agenda du jour contient
    // au moins un RDV horaire réel, on cherche le prochain CRÉNEAU LIBRE assez long pour le bloc
    // (nextFreeSlot, qui contourne les blocs occupés) et on le CITE dans l'action. « Un créneau libre à
    // 14:30 » transforme une bonne intention (« lance une session ») en plan exécutable inséré dans la
    // vraie journée d'Adrien — priorisation concrète du « quand », pas juste du « quoi ». On EXIGE un
    // vrai planning horaire du jour : sur une journée vide, le « créneau » serait « maintenant » (trivial
    // et parfois déjà passé) ; on ne veut le conseil que quand il apporte l'info d'un jour structuré.
    const now = Math.round(Number(o.nowMinutes));
    if (typeof nextFreeSlot === 'function' && !reviveEligible && !focusRested && Number.isFinite(now) && now >= 0 && now < 1440) {
      const agenda = Array.isArray(s.agenda) ? s.agenda : [];
      const hasTimed = agenda.some(a => a && a.date === todayKey && !a.allDay && !a.completed && timeToMinutes(a.time) != null);
      if (hasTimed) {
        const slot = nextFreeSlot(agenda, { date: todayKey, after: minutesToTime(now), durationMin: blk });
        if (slot) { focusSlot = slot; action += ` Créneau libre à ${slot} aujourd’hui — cale ton bloc là.`; }
      }
    }
    // Coach CONSCIENT de la PENTE de FOCUS — le pendant, côté FOCUS, de readinessSlide/rebound (sport)
    // et de sleepDurationTrend (sommeil). L'insight focus portait le compteur d'objectif hebdo et le
    // décompte de jours actifs, mais restait AVEUGLE au VOLUME : deux « 3 jours actifs » n'appellent pas
    // le même mot selon que les minutes de concentration MONTENT ou s'EFFRITENT. On lit focusMinutesTrend
    // (total 7 j récents vs 7 j précédents) et on NUANCE l'insight — mais UNIQUEMENT quand la pente
    // CONCORDE avec le ton, pour ne JAMAIS contredire la headline : minutes en RECUL sous un pilier à
    // corriger (rebuild/revive) → on quantifie la dégradation ; minutes en HAUSSE sous un renfort → on
    // crédite la montée. Additif pur : champ focusTrend (delta minutes, ou null) TOUJOURS renvoyé ; NOTE
    // appendue à l'insight, action intacte. Données réelles seulement (semaine précédente renseignée).
    // Mutuellement exclusif up XOR down (une pente à la fois par construction).
    if (typeof focusMinutesTrend === 'function') {
      const ft = focusMinutesTrend(s.focusSessions, todayKey, 7);
      if (ft && ft.prev != null) {
        if (ft.dir === 'down' && (tone === 'rebuild' || tone === 'revive')) {
          focusTrend = ft.delta;
          insight += ` Tes minutes de focus reculent : ${ft.prev} → ${ft.recent} min cette semaine (${ft.delta} min) — un bloc aujourd’hui inverse la pente.`;
        } else if (ft.dir === 'up' && tone === 'reinforce') {
          focusTrend = ft.delta;
          insight += ` Et le volume grimpe : ${ft.prev} → ${ft.recent} min de focus cette semaine (+${ft.delta} min) — tu montes en puissance, garde le cap.`;
        }
      }
    }
  }
  // Coach CONSCIENT du « déjà fait aujourd'hui » : quand le pilier choisi a une entrée ACTIVE datée
  // d'AUJOURD'HUI, lui ordonner « fais-le aujourd'hui » est contradictoire — Adrien vient de le faire.
  // Le coach crédite alors le geste du jour et réoriente vers la consolidation, au lieu de radoter un
  // ordre déjà exécuté (le pire bug de crédibilité d'un coach). Limité au SPORT et au FOCUS : là, une
  // entrée du jour = l'activité est faite, rien de plus n'est requis aujourd'hui. Volontairement EXCLUS :
  // le SOMMEIL (une nuit notée = celle d'HIER ; l'action porte sur le coucher de CE SOIR, encore à venir)
  // et la NUTRITION (« actif » y est trop lâche — protéines > 0 ne veut pas dire cible atteinte ; son
  // bloc enrichi gère déjà l'état du jour vis-à-vis de la cible). On calcule tôt pour couper aussi la
  // micro-marche : inutile de dire « tu ignores mes caps » un jour où le geste est justement posé.
  let doneToday = false;
  if (chosen.pillar === 'sport' || chosen.pillar === 'focus') {
    const list = Array.isArray(chosen.list) ? chosen.list : [];
    doneToday = list.some(e => e && e.date === todayKey && chosen.active(e));
  }
  // Coach CONSCIENT de la TENDANCE de readiness — le pendant CUMULATIF, côté RÉCUP, de la readiness
  // du jour (#463). readinessScore lit la forme d'AUJOURD'HUI, sur UNE nuit ; readinessTrend lit la
  // PENTE de forme sur les derniers check-ins — et le cas piégeux est le symétrique de celui du
  // loadSpike (#492) : une readiness du jour « correcte » (50-74, l'action dit « séance correcte,
  // garde une marge ») mais qui GLISSE régulièrement depuis plusieurs relevés. Le score d'un seul jour
  // ne voit qu'un « milieu de tableau » ; la pente révèle une fatigue qui s'INSTALLE (surmenage
  // naissant), là où « pas de record aujourd'hui » sous-estime le signal. C'est exactement
  // l'« adaptation aux écarts » demandée — et un domaine (récup cumulée) que la readiness du jour et la
  // charge (loadSpike) ne couvraient pas. Quand le pilier poussé est le SPORT, que la séance du jour
  // n'est pas déjà faite (doneToday) et que la readiness du jour est dans la zone d'alerte douce (≥ 50
  // — sinon l'action dit déjà « récup » — et < 75 — au vert, une pente descendante depuis très haut
  // reste bénigne), on interroge la tendance : si elle DESCEND franchement (direction 'down', chute
  // ≥ 12 pts sur ≥ 4 check-ins), le coach NOMME la glissade et recadre vers une séance allégée + récup,
  // plutôt qu'une « séance correcte » qui ignorerait la fatigue cumulée. Additif pur : champ
  // readinessSlide (le delta négatif, ou null) TOUJOURS renvoyé ; l'action est remplacée, aucune autre
  // branche touchée. Ne se déclenche que sur données réelles (≥ 4 check-ins datés). Le loadSpike, plus
  // bas et plus urgent, peut encore réécrire l'action si un pic de charge coïncide (les deux disent
  // « allège », pas de contradiction) ; readinessSlide reste alors dans le champ, informatif.
  let readinessSlide = null;
  if (chosen.pillar === 'sport' && !doneToday && readiness != null && readiness >= 50 && readiness < 75
      && typeof readinessTrend === 'function') {
    const rt = readinessTrend(s.recovery, 8);
    if (rt && rt.direction === 'down' && rt.delta <= -12 && rt.points.length >= 4) {
      readinessSlide = rt.delta;
      const n = rt.points.length;
      const drop = -rt.delta;
      action = `Readiness ${readiness}/100 aujourd’hui — correcte en soi, mais ta forme glisse sur tes ${n} derniers check-ins (-${drop} pts) : ce n’est pas un creux d’un soir, c’est de la fatigue qui s’accumule. Séance allégée aujourd’hui, et soigne ta récup avant de taper dans le rouge.`;
    }
  }
  // Coach CONSCIENT de la REMONTÉE de forme — le pendant POSITIF exact de readinessSlide (#493),
  // l'« adaptation aux PROGRÈS » là où la glissade est l'« adaptation aux écarts ». Même zone d'angle
  // MORT de la readiness du jour : entre 50 et 74, l'action sert « séance correcte, mais garde une
  // marge : pas de record » — un plafond prudent qui, quand la forme REMONTE franchement relevé après
  // relevé, sous-vend la récupération réelle. Le cas est le symétrique de la glissade : le score d'un
  // seul jour n'y voit qu'un « milieu de tableau », mais la PENTE ascendante dit que le corps
  // réencaisse (retour de vacances, deload qui paie, nuit qui se recale). Quand le pilier poussé est
  // le SPORT, la séance du jour pas déjà faite (doneToday) et la readiness du jour dans cette zone
  // [50, 75[, on interroge la tendance : si elle MONTE franchement (direction 'up', hausse ≥ 12 pts
  // sur ≥ 4 check-ins), le coach l'ANNONCE et invite à RÉHAUSSER un peu l'intensité au lieu de tenir
  // la marge — cohérent avec l'escalade de reprise (comebackStage 'building'). Additif pur : champ
  // readinessRebound (le delta positif, ou null) TOUJOURS renvoyé ; l'action est remplacée uniquement
  // en cas de remontée franche, aucune autre branche touchée. MUTUELLEMENT EXCLUSIF de readinessSlide
  // (une pente est 'up' XOR 'down'), donc jamais les deux le même jour. Le loadSpike, plus bas, garde
  // la main : un pic de charge coïncidant avec une forme qui remonte doit tempérer (« réencaisse » ne
  // vaut pas « ajoute du volume brutalement ») — il réécrit alors l'action, readinessRebound reste
  // informatif dans le champ. Ne se déclenche que sur données réelles (≥ 4 check-ins datés).
  let readinessRebound = null;
  if (chosen.pillar === 'sport' && !doneToday && readiness != null && readiness >= 50 && readiness < 75
      && typeof readinessTrend === 'function') {
    const rt = readinessTrend(s.recovery, 8);
    if (rt && rt.direction === 'up' && rt.delta >= 12 && rt.points.length >= 4) {
      readinessRebound = rt.delta;
      const n = rt.points.length;
      action = `Readiness ${readiness}/100 aujourd’hui — et ta forme remonte franchement sur tes ${n} derniers check-ins (+${rt.delta} pts) : ton corps réencaisse. Tu peux réhausser un peu l’intensité aujourd’hui, sans viser le record d’un coup — la marge revient.`;
    }
  }
  // Coach CONSCIENT de la CHARGE d'entraînement — le pendant CUMULATIF de la readiness du jour. La
  // readiness (readinessScore) lit la forme d'AUJOURD'HUI, sur UNE nuit ; l'ACWR (acuteChronicRatio)
  // lit la TENDANCE de charge sur 4 semaines — et les deux DIVERGENT dans le cas le plus piégeux : un
  // corps bien reposé (readiness au vert) qui a brutalement ramp-é son volume les 7 derniers jours
  // reste en zone de risque de blessure (ratio aigu/chronique > 1,5), là où la readiness seule crierait
  // « pousse ! ». Le sport lisait déjà la readiness (#463) mais restait AVEUGLE à ce pic de charge —
  // le premier facteur de blessure du sportif régulier, exactement l'« adaptation aux écarts » demandée.
  // Quand le pilier poussé est le SPORT, que la séance du jour n'est pas déjà faite (doneToday) et que
  // la readiness N'ORDONNE PAS déjà le repos (null ou ≥ 50 — sous 50 l'action dit déjà « récup », inutile
  // d'empiler), on interroge l'ACWR : en zone 'high' (pic), le coach TEMPÈRE — il NOMME le bond (× le
  // volume habituel) et recadre vers une semaine de consolidation (−30 % de volume, technique propre)
  // plutôt qu'un ajout. Deux registres : readiness au vert (≥ 75) → on crédite la forme mais on redirige
  // l'énergie vers la qualité, pas le volume ; sinon → on allège franchement. Ce flag COUPE le créneau
  // sport plus bas (« cale ta séance » contredirait « allège ») et est protégé du suivi/renfort qui
  // sinon réécrirait l'alerte. Additif pur : champ loadSpike (le ratio, ou null) TOUJOURS renvoyé ;
  // l'action est remplacée, aucune autre branche touchée. Ne se déclenche que sur données réelles
  // (durée × effort > 0 sur 4 semaines) — sinon acuteChronicRatio renvoie null et loadSpike reste null.
  let loadSpike = null, loadOverGoal = null, loadOverGoalSlide = null;
  if (chosen.pillar === 'sport' && !doneToday && (readiness == null || readiness >= 50)
      && typeof acuteChronicRatio === 'function') {
    const acwr = acuteChronicRatio(s.workouts, todayKey);
    if (acwr && acwr.zone === 'high') {
      loadSpike = acwr.ratio;
      const r = String(acwr.ratio).replace('.', ',');
      action = (readiness != null && readiness >= 75)
        ? `Forme au vert, mais ta charge a bondi à ${r}× ton volume habituel ces 7 jours — mets l’énergie sur la technique et la qualité plutôt que le volume : une semaine de consolidation te blinde sans risque de blessure.`
        : `Charge en hausse brutale : ta semaine est à ${r}× ton volume habituel, et le corps encaisse mal les pics (risque de blessure) — allège aujourd’hui (-30 % de volume), technique propre, tu repartiras plus fort.`;
      // RÉCONCILIATION objectif hebdo × pic de charge — le pendant, côté CHARGE, de restOverGoal
      // (#504, qui l'a fait côté readiness du jour). Quand l'allure de l'objectif hebdo est SERRÉE
      // (sessionGoalPace 'tight' → l'insight vient de dire « il en faut une chaque jour pour tenir
      // l'objectif ») ET que la charge des 7 derniers jours est en PIC (ACWR zone 'high' → l'action dit
      // « allège, semaine de consolidation »), l'insight et l'action se CONTREDISENT : pousse une séance
      // chaque jour vs allège. Le coach TRANCHE — tempérer la charge prime sur le chiffre : empiler une
      // séance chaque jour sur un corps déjà en zone de risque de blessure est le pire choix, alors que
      // laisser l'objectif hebdo glisser une semaine ne coûte presque rien. C'est l'« adaptation aux
      // écarts » de #504 appliquée au SECOND conflit calendrier-vs-corps : ici c'est la CHARGE CUMULÉE
      // (pas la forme d'un jour) qui dit stop — un signal encore plus net (risque de blessure structurel).
      // MUTUELLEMENT EXCLUSIF de restOverGoal par construction : celui-ci exige readiness < 50, ce bloc
      // exige readiness null ou ≥ 50 → jamais les deux notes le même jour. Ne se déclenche QUE sur ce
      // conflit précis (tight × pic) — 'unreachable'/'onpace' n'ont aucune pression à désamorcer. Additif
      // pur : loadOverGoal (le ratio, ou null) TOUJOURS renvoyé ; NOTE appendue à l'insight, action intacte.
      if (sessionGoalPace === 'tight') {
        loadOverGoal = acwr.ratio;
        // COMPOUND — charge en pic ET forme qui GLISSE en parallèle (Suite possible de #505). readinessSlide
        // (calculé plus haut, dans la même zone de readiness [50,75) que ce bloc peut voir) signale une fatigue
        // qui S'INSTALLE relevé après relevé. S'il est là EN MÊME TEMPS que le pic de charge, ce ne sont plus
        // deux lectures d'un même instant mais DEUX signaux de fatigue concordants qui se cumulent (charge
        // cumulée haute + récup qui décroche). Le choix « laisse l'objectif hebdo glisser » n'est alors plus
        // seulement prudent : c'est la seule option saine — le coach le dit plus FERMEMENT, en nommant les deux
        // signaux. Additif pur : loadOverGoalSlide (le delta négatif, ou null) TOUJOURS renvoyé ; c'est la MÊME
        // note appendue (juste le registre qui durcit selon readinessSlide), l'action de charge reste intacte.
        if (readinessSlide != null) {
          loadOverGoalSlide = readinessSlide;
          insight += ` Mais ta charge est en pic cette semaine (${r}× ton volume habituel) ET ta forme glisse en parallèle (-${-readinessSlide} pts sur tes derniers check-ins) : deux signaux de fatigue qui se cumulent, pas un coup de mou isolé. Laisser l’objectif hebdo glisser n’est plus prudent, c’est la seule option saine — consolide, protège-toi, tu repars bien plus solide.`;
        } else {
          insight += ` Mais ta charge est en pic cette semaine (${r}× ton volume habituel) : tempérer prime sur le chiffre — empiler une séance chaque jour sur un corps déjà en zone de blessure serait le pire choix. Laisse l’objectif glisser, consolide, tu repars plus solide.`;
        }
      }
    }
  }
  // CONTRADICTION insight × action — PROLONGE le garde-fou #573 aux DEUX freins hors du seuil < 50. Le
  // ton reinforce a écrit « … en hausse. Garde le rythme. » (l.5251), une injonction à continuer. #573
  // retire cette phrase quand la readiness du jour est au PLANCHER (< 50 → action « récupération
  // prioritaire »). Mais l'action bascule AUSSI en frein plus haut : readinessSlide (readiness 50-74 qui
  // GLISSE → « Séance allégée aujourd'hui, soigne ta récup ») et loadSpike (charge en PIC → « allège
  // aujourd'hui, -30 % de volume »). Dans ces deux cas, « Garde le rythme. » POUSSE pendant que l'action
  // FREINE — même bug de crédibilité que #573, simplement hors du seuil < 50 (prouvé en rendu chargé
  // §4 ter : readiness 60 qui glisse, et ACWR 3,69× sans check-in du jour). On retire la seule injonction
  // qui contredit le frein ; le constat « en hausse » (stat hebdo vraie) et le crédit du volume restent.
  // Curation, pas ajout (§3). Mutuellement exclusif du strip #573 (readinessSlide/loadSpike exigent une
  // readiness null ou ≥ 50). readinessSlide/loadSpike ne sont non nuls que pour le pilier sport, donc
  // aucun effet sur un reinforce focus (« Garde le rythme » y reste, sans action-frein qui la contredise).
  if (tone === 'reinforce' && (readinessSlide != null || loadSpike != null)) insight = insight.replace(' Garde le rythme.', '');
  // ÉLARGIT le strip précédent au cas SÉANCE DÉJÀ FAITE (doneToday) — la contradiction inter-panneaux
  // mesurée par le fuzzer P5.2 (recap #577). loadSpike n'est calculé que sous la garde de PRESCRIPTION
  // sport (l.6300 : pilier sport, séance PAS déjà faite, readiness null/≥50) ; or le Bilan hebdo
  // (weeklyInsights, l.2462) calcule l'ACWR INCONDITIONNELLEMENT et affiche « 🟥 Charge en pic … prévois
  // une semaine plus légère » dès la zone 'high'. Résultat : un jour de pic où la séance du jour est DÉJÀ
  // faite (doneToday), loadSpike reste null → le strip ci-dessus ne s'exécute pas → « Garde le rythme. »
  // SURVIT dans le coach pendant que le Bilan ordonne d'alléger — et ce cas est le plus courant (un jour
  // de pic de charge est souvent un jour où l'on vient de s'entraîner). On interroge donc l'ACWR
  // INDÉPENDAMMENT de la garde de prescription, pour le pilier SPORT en reinforce (le seul où « Garde le
  // rythme » parle bien de l'entraînement — sur un focus sommeil/focus l'injonction vise le rythme de CE
  // pilier, pas la charge sportive, on n'y touche pas) : en zone 'high', on retire l'injonction. Le
  // constat « en hausse » reste ; une montée SAINE (ACWR non-'high') garde son « Garde le rythme. »
  // (non-régression, comme #576). readiness < 50 est déjà couvert par le strip #573 (l.5632). Curation,
  // pas ajout (§3). On ne recalcule l'ACWR que dans le trou résiduel (loadSpike null + phrase présente).
  if (tone === 'reinforce' && chosen.pillar === 'sport' && loadSpike == null
      && insight.indexOf(' Garde le rythme.') !== -1 && typeof acuteChronicRatio === 'function') {
    const acwr = acuteChronicRatio(s.workouts, todayKey);
    if (acwr && acwr.zone === 'high') insight = insight.replace(' Garde le rythme.', '');
  }
  // Coach CONSCIENT de la SOUS-CHARGE — le pendant POSITIF exact du loadSpike (#492), l'« adaptation
  // aux PROGRÈS » là où le pic était l'« adaptation aux écarts ». Le loadSpike tempère quand l'ACWR
  // grimpe en zone 'high' (risque de blessure) ; il restait muet dans le cas SYMÉTRIQUE, listé en
  // « Suite possible » de #492 ET #494 : l'ACWR en zone 'low' (ratio < 0,8) — le corps tourne
  // NETTEMENT SOUS son volume habituel, avec de la marge pour REMONTER. Sans ce signal, l'action sport
  // générique (« prêt à pousser », « vraie séance ») ignore que la fenêtre est idéale pour rebâtir du
  // volume progressivement (≤ 10 %/semaine, le principe de loadAdvice zone 'low'). Quand le pilier
  // poussé est le SPORT, la séance du jour pas déjà faite (doneToday), le pilier pas dormant
  // (!reviveEligible — un dormant reçoit un micro-pas, pas « remonte le volume ») et la readiness
  // n'ordonne pas le repos (null ou ≥ 50), on interroge l'ACWR : en zone 'low', le coach NOMME la
  // sous-charge (× le volume habituel) et invite à RAJOUTER un peu, progressivement. Anti-contradiction
  // clé : on n'entre PAS si readinessSlide a déjà tempéré (forme qui glisse → « garde léger » ; « remonte
  // le volume » la contredirait). Quand la forme REMONTE en plus (readinessRebound), deux feux verts
  // concordants → message renforcé (« fenêtre idéale »). loadSpike (zone 'high') et lowLoad (zone 'low')
  // sont MUTUELLEMENT EXCLUSIFS par construction (une seule zone ACWR à la fois). Additif pur : champ
  // lowLoad (le ratio, ou null) TOUJOURS renvoyé ; l'action est remplacée uniquement en sous-charge,
  // aucune autre branche touchée. Ne se déclenche que sur données réelles (durée × effort > 0 sur 4 sem.).
  let lowLoad = null, lowLoadUnderGoal = null, lowLoadUnderGoalRebound = null;
  if (chosen.pillar === 'sport' && !doneToday && !reviveEligible && readinessSlide == null
      && (readiness == null || readiness >= 50) && typeof acuteChronicRatio === 'function') {
    const acwr = acuteChronicRatio(s.workouts, todayKey);
    if (acwr && acwr.zone === 'low') {
      lowLoad = acwr.ratio;
      const r = String(acwr.ratio).replace('.', ',');
      action = (readinessRebound != null)
        ? `Fenêtre idéale : ta forme remonte ET ta charge est à ${r}× ton volume habituel (sous ta base) — le bon moment pour rebâtir du volume. Ajoute un peu aujourd’hui et remonte progressivement vers ta base (≤ 10 %/semaine), sans brûler les étapes.`
        : `Tu es en sous-charge : ta semaine est à ${r}× ton volume habituel — ton corps a de la marge pour remonter. Rajoute un peu de volume aujourd’hui (une série, 10 min) et reviens progressivement vers ta base (≤ 10 %/semaine), tu construis sans risque de blessure.`;
      // RÉCONCILIATION POSITIVE objectif hebdo × sous-charge — le pendant EXACT et OPPOSÉ de loadOverGoal
      // (#505/#506, côté PIC), listé en « Suite possible » de #506. Côté pic, l'objectif serré (« il en faut
      // une chaque jour ») CONTREDISAIT la charge (« allège ») → le coach lâchait l'objectif. Ici, quand
      // l'allure est SERRÉE (sessionGoalPace 'tight') ET que la charge est en SOUS-CHARGE (ACWR zone 'low' →
      // le corps a de la marge pour remonter), les deux signaux ne se contredisent plus : ils S'ALIGNENT. Le
      // calendrier réclame des séances ET le corps a exactement la marge pour les encaisser sans risque —
      // deux feux verts concordants (pas un conflit à désamorcer, une opportunité à NOMMER). C'est
      // l'« adaptation aux progrès » : la cadence serrée tombe pile sur une fenêtre de charge idéale, c'est LE
      // moment de pousser pour boucler l'objectif. Note APPENDUE à l'insight (comme loadOverGoal), orthogonale
      // à l'action de sous-charge qui reste intacte. MUTUELLEMENT EXCLUSIF de loadOverGoal (zone 'high' vs
      // 'low') ET de restOverGoal (readiness < 50 vs null/≥ 50) par construction → jamais deux notes le même
      // jour. Ne se déclenche QUE sur ce conflit précis (tight × sous-charge) — 'unreachable'/'onpace' n'ont
      // pas de cadence quotidienne à soutenir. Additif pur : lowLoadUnderGoal (le ratio, ou null) TOUJOURS renvoyé.
      if (sessionGoalPace === 'tight') {
        lowLoadUnderGoal = acwr.ratio;
        // TRIPLE feu vert — le pendant POSITIF exact du compound loadOverGoalSlide (#506, côté PIC). Là-bas,
        // le pic de charge (rouge) qui coïncidait avec une forme qui GLISSE (readinessSlide) cumulait DEUX
        // signaux de fatigue → la note durcissait. Ici, symétrique EXACT : la sous-charge alignée sur
        // l'objectif serré (deux feux verts) coïncide parfois avec une forme qui REMONTE (readinessRebound,
        // déjà calculé plus haut : +≥12 pts sur ≥4 check-ins). Ce n'est alors plus « charge basse + calendrier
        // qui presse » (deux lectures d'un même moment), mais TROIS signaux concordants qui se cumulent :
        // charge basse (marge structurelle) + forme qui rebondit (le corps réencaisse, en direct) + cadence
        // serrée (le calendrier réclame). La fenêtre est encore plus franche → le coach le dit plus
        // ENTHOUSIASTE, en nommant les trois. Compatible par construction : ce bloc exige readinessSlide == null
        // et readinessRebound exige direction 'up' (slide XOR rebound) → readinessRebound PEUT être non nul ici.
        // Additif pur : lowLoadUnderGoalRebound (le delta positif, ou null) TOUJOURS renvoyé ; c'est la MÊME note
        // appendue (juste le registre qui s'enthousiasme selon readinessRebound), l'action de sous-charge intacte.
        if (readinessRebound != null) {
          lowLoadUnderGoalRebound = readinessRebound;
          insight += ` Et bonne nouvelle : cette cadence serrée tombe pile — ta charge n’est qu’à ${r}× ton volume habituel ET ta forme remonte franchement (+${readinessRebound} pts sur tes derniers check-ins) : trois feux verts concordants (charge basse, forme qui rebondit, calendrier qui presse), pas un hasard — c’est LE moment de pousser pour boucler l’objectif, ton corps est prêt.`;
        } else {
          insight += ` Et bonne nouvelle : cette cadence serrée tombe pile — ta charge n’est qu’à ${r}× ton volume habituel, ton corps a toute la marge pour enchaîner ces séances sans risque. Les deux signaux s’alignent : c’est LE moment de pousser pour boucler l’objectif.`;
        }
      }
    }
  }
  // Coach CONSCIENT du SOMMEIL comme SOCLE des GAINS d'entraînement — le pendant, côté SPORT, de
  // sleepFatLossGuard/sleepGainGuard (#511/#512, côté NUTRITION), qui bouclait déjà les DEUX faces de la
  // balance (perte/prise). Le pilier sport lit la forme du JOUR (readiness) et la charge des 7 j (ACWR),
  // mais reste AVEUGLE au sommeil CHRONIQUE : on peut avoir une readiness correcte un matin donné tout en
  // dormant structurellement trop peu depuis des jours. Or c'est la nuit — surtout le sommeil profond — que
  // le corps CONSOLIDE l'entraînement : synthèse protéique, réparation tissulaire, sécrétion de GH et de
  // testostérone. Dormir court PLAFONNE les gains de chaque séance et augmente le risque de blessure, quel
  // que soit l'effort fourni. Un frein réel, jamais nommé côté sport jusqu'ici. Quand — et SEULEMENT quand —
  // le sommeil récent est court (sleepIns.avg < 7 sur ≥ 3 nuits chiffrées, sleepIns déjà calculé en tête)
  // ET que le sommeil n'est pas déjà le pilier forcé (garde-fou identique aux guards nutrition : si le
  // sommeil est en ALERTE, tone 'urgent', il est forcé en tête tier −1 → chosen.pillar 'sommeil', on
  // n'entre pas dans cette branche sport), une note s'append. La note ne parle donc que dans le cas SUBTIL :
  // sommeil court sans être le focus du jour. Additif pur : sleepTrainGuard (la moyenne h, ou null) TOUJOURS
  // renvoyé ; note APPENDUE à l'insight, action (séance/charge/repos) intacte. Réemploi total (sleepIns) —
  // zéro nouvelle fonction. Données réelles seulement : ≥ 3 nuits récentes chiffrées ET moyenne réellement
  // < 7 h ; nuits solides, ou < 3 nuits, ou aucune récup → null, rien d'ajouté.
  let sleepTrainGuard = null;
  if (chosen.pillar === 'sport' && !doneToday && sleepIns && sleepIns.nights >= 3 && sleepIns.avg > 0 && sleepIns.avg < 7) {
    sleepTrainGuard = sleepIns.avg;
    const numW = n => String(n).replace('.', ',');
    const detteTxt = (sleepIns.debt > 0) ? ` (dette de ${numW(sleepIns.debt)} h sur 14 j)` : '';
    insight += ` Et n’oublie pas le socle invisible de tes gains : tu dors ${numW(sleepIns.avg)} h en moyenne ces derniers jours${detteTxt}, sous les 7 h — c’est la nuit que le corps consolide l’entraînement (synthèse protéique, réparation, hormones), et dormir court plafonne les gains de chaque séance tout en augmentant le risque de blessure. Bien dormir démultiplie l’effort que tu fournis déjà.`;
  }
  // Coach CONSCIENT de l'HYDRATATION comme CARBURANT de l'EFFORT — le pendant, côté SPORT, de
  // hydrationFocusGuard (#517, focus), et le RELAIS d'hydratation de sleepTrainGuard (#513) exactement
  // comme l'hydratation relaie le sommeil côté focus. Le pilier sport lit la forme du JOUR (readiness),
  // la charge des 7 j (ACWR) et, depuis #513, le sommeil CHRONIQUE, mais restait AVEUGLE à l'HYDRATATION —
  // pourtant un levier de performance parmi les plus RAPIDES : même une déshydratation légère (1-2 % du
  // poids) fait chuter la force, la puissance et l'endurance, gêne la thermorégulation et la récupération,
  // et gonfle la sensation d'effort. Sa force est d'être l'exact COMPLÉMENT du sommeil : là où mieux dormir
  // se construit sur des nuits, mieux s'hydrater se corrige AVANT la séance — action du jour même. RELAIS
  // du sommeil, jamais concurrent : n'entre QUE si sleepTrainGuard == null (le socle sommeil n'a pas parlé)
  // — une seule note « carburant » par jour, le sommeil (levier primaire, combat documenté d'Adrien) prime,
  // l'hydratation en relais, exactement le motif hydrationFocusGuard-en-relais-des-notes-sommeil (#517).
  // Vocabulaire distinct (« carburant qu'on oublie à l'effort », « force, puissance et endurance »,
  // « thermorégulation », « avant de bouger », « une gourde à côté de toi pendant l'effort ») — zéro
  // collision à l'œil ni en regex avec les notes sport (sleepTrainGuard « socle invisible », lowLoad,
  // readinessSlide) ni avec hydrationFocusGuard focus (« levier immédiat », « attention et mémoire de
  // travail », « avant ton bloc »). Données réelles seulement : ≥ 3 jours d'hydratation saisie (water > 0)
  // dans la fenêtre 7 j, agrégés au MAX par date comme hydrationFocusGuard, moyenne réellement < 6 verres
  // (sous la cible de 8). Additif pur : hydrationTrainGuard (la moyenne de verres, ou null) TOUJOURS
  // renvoyé ; note APPENDUE à l'insight, action (séance / charge / repos) intacte. Réemploi total (daysAgo,
  // s.nutrition) — zéro nouvelle fonction pure.
  let hydrationTrainGuard = null;
  if (chosen.pillar === 'sport' && !doneToday && sleepTrainGuard == null) {
    const waterByDate = {};
    for (const n of (Array.isArray(s.nutrition) ? s.nutrition : [])) {
      if (!n) continue;
      const d = daysAgo(n.date);
      if (d === null || d > 6) continue;
      const w = Number(n.water) || 0;
      if (w > 0) waterByDate[n.date] = Math.max(waterByDate[n.date] || 0, w);
    }
    const vals = Object.values(waterByDate);
    if (vals.length >= 3) {
      const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      if (avg > 0 && avg < 6) {
        hydrationTrainGuard = avg;
        const numW = n => String(n).replace('.', ',');
        insight += ` Et pense à un carburant qu’on oublie à l’effort : tu bois ${numW(avg)} verres d’eau par jour ces derniers jours, sous les 8 — même une déshydratation légère (1 à 2 % du poids) fait chuter la force, la puissance et l’endurance, gêne la thermorégulation et la récupération, et gonfle la sensation d’effort. Ça se corrige tout de suite : un grand verre avant de bouger, et une gourde à côté de toi pendant l’effort.`;
      }
    }
  }
  // Coach CONSCIENT du pilier BIEN-ÊTRE / MOBILITÉ — une source de données réelle (s.wellnessDone) que le
  // coach n'avait JAMAIS lue : il ne voyait que sport, focus, sommeil, nutrition, habitudes, candidatures et
  // poids. Le pilier sport lit déjà la charge (ACWR), la forme du jour (readiness), le sommeil et l'hydratation
  // chroniques, mais restait AVEUGLE à la RÉCUPÉRATION ACTIVE : quand on s'entraîne régulièrement sans jamais
  // relâcher (mobilité, étirements), les tissus et articulations encaissent la charge sans contrepartie — c'est
  // le terrain des tensions et des blessures de surcharge qui s'installent en silence, et la souplesse qui se
  // perd bride l'amplitude donc la progression. DISTINCT des « carburants » sommeil/hydratation : ici ce n'est
  // pas un carburant de l'effort mais son PENDANT récupération. Quand — et SEULEMENT quand — le pilier poussé
  // est le SPORT, la séance pas déjà faite (!doneToday), l'entraînement RÉELLEMENT actif ces jours-ci
  // (chosen.recentDays >= 2 : la charge est bien là, donc le manque de mobilité compte) ET qu'aucune note
  // « carburant » n'a déjà parlé (sleepTrainGuard == null && hydrationTrainGuard == null → RELAIS : une seule
  // note récup/carburant par jour, le sommeil prime, l'hydratation puis la mobilité), une note s'append SI le
  // suivi bien-être existe mais a LAPSÉ (wellnessInactivity, ≥ 4 j sans routine). Même convention HONNÊTE que
  // renderWellnessNudge : on ne tanne pas quelqu'un qui n'a JAMAIS touché au bien-être — liste vide →
  // wellnessInactivity renvoie inactive:false → note muette. Vocabulaire distinct (« côté récupération »,
  // « tissus et articulations », « s'installent en silence », « 5 min de mobilité ou d'étirements ») — zéro
  // collision à l'œil ni en regex avec les carburants (« socle invisible » du sommeil, « carburant qu'on
  // oublie » de l'hydratation). Additif pur : mobilityTrainGuard (nb de jours sans routine, ou null) TOUJOURS
  // renvoyé ; note APPENDUE à l'insight, action (séance / charge / repos) intacte. Réemploi total
  // (wellnessInactivity, s.wellnessDone) — zéro nouvelle fonction pure.
  let mobilityTrainGuard = null;
  if (chosen.pillar === 'sport' && !doneToday && sleepTrainGuard == null && hydrationTrainGuard == null && chosen.recentDays >= 2 && typeof wellnessInactivity === 'function') {
    const inact = wellnessInactivity(s.wellnessDone, todayKey, 4);
    if (inact && inact.inactive && inact.days >= 4) {
      mobilityTrainGuard = inact.days;
      insight += ` Un dernier levier, côté récupération : ça fait ${inact.days} jours sans routine mobilité alors que tu t’entraînes régulièrement en ce moment — les tissus et articulations encaissent la charge sans jamais relâcher, et c’est le terrain des tensions et des blessures de surcharge qui s’installent en silence, sans compter la souplesse qui se perd et bride ton amplitude. 5 min de mobilité ou d’étirements aujourd’hui entretiennent ce capital et accélèrent la récup entre les séances.`;
    }
  }
  // Coach CONSCIENT de la PROTÉINE comme MATÉRIAU des GAINS d'entraînement — le maillon manquant du
  // relais « socle/carburant/récup » du pilier SPORT (sommeil #513 → hydratation #518 → mobilité #521), et
  // le pendant, côté SPORT, de la lecture protéines qui n'existait QUE dans le pilier nutrition (#500/#501 :
  // proteinTrend/proteinStreak). Le sport lit la charge (ACWR), la forme du jour (readiness), le sommeil et
  // l'hydratation chroniques et la récupération active (mobilité), mais restait AVEUGLE au MATÉRIAU même de
  // la reconstruction musculaire : l'entraînement ne fait que CASSER le muscle (microlésions), et c'est la
  // protéine alimentaire qui fournit les briques pour le reconstruire plus fort. S'entraîner dur en mangeant
  // chroniquement trop peu de protéines, c'est plafonner les gains de chaque séance — le stimulus est là, le
  // matériau manque. DISTINCT des carburants (sommeil « socle invisible », hydratation « carburant qu'on
  // oublie ») et de la récup (mobilité « côté récupération ») : ici c'est le SUBSTRAT de construction, pas
  // l'énergie ni la souplesse. DERNIER maillon du relais (une seule note récup/carburant par jour) : n'entre
  // QUE si sleepTrainGuard/hydrationTrainGuard/mobilityTrainGuard sont tous muets, sur entraînement réellement
  // actif (recentDays >= 2, le stimulus est bien là) et profil renseigné (cible proteinTarget calée sur poids
  // + objectif, exactement comme le pilier nutrition). Données réelles seulement : ≥ 3 jours de protéines
  // saisies (protein > 0) dans la fenêtre 7 j, agrégés au MAX par date comme l'hydratation, et cible atteinte
  // sur MOINS de la moitié de ces jours (onTarget × 2 < loggedDays → manque CHRONIQUE, pas un simple jour
  // creux). Vocabulaire distinct (« le matériau de tes gains », « casser le muscle », « briques »,
  // « reconstruit plus fort ») — zéro collision regex avec les autres notes sport ni avec la note protéines
  // du pilier nutrition (« cible protéines », « régularité grimpe »). Additif pur : proteinTrainGuard (nb de
  // jours à la cible sur la fenêtre, 0 compris → toujours != null quand la note parle, comme les autres
  // guards utilisés en == null) TOUJOURS renvoyé ; note APPENDUE à l'insight, action (séance / charge /
  // repos) intacte. Réemploi total (daysAgo, proteinTarget, s.nutrition/s.profile) — zéro nouvelle fonction.
  let proteinTrainGuard = null;
  if (chosen.pillar === 'sport' && !doneToday && sleepTrainGuard == null && hydrationTrainGuard == null
      && mobilityTrainGuard == null && chosen.recentDays >= 2 && s.profile && typeof proteinTarget === 'function') {
    const tgt = proteinTarget(s.profile.weight, s.profile.goal).gramsPerDay;
    if (tgt > 0) {
      const protByDate = {};
      for (const n of (Array.isArray(s.nutrition) ? s.nutrition : [])) {
        if (!n) continue;
        const d = daysAgo(n.date);
        if (d === null || d > 6) continue;
        const p = Number(n.protein) || 0;
        if (p > 0) protByDate[n.date] = Math.max(protByDate[n.date] || 0, p);
      }
      const vals = Object.values(protByDate);
      const loggedDays = vals.length;
      if (loggedDays >= 3) {
        const onTarget = vals.filter(v => v >= tgt).length;
        if (onTarget * 2 < loggedDays) {
          proteinTrainGuard = onTarget;
          insight += ` Et pense au matériau de tes gains : sur tes ${loggedDays} derniers jours renseignés, tu n’atteins ta cible protéines (${tgt} g) que ${onTarget}/${loggedDays} — or l’entraînement ne fait que casser le muscle, c’est la protéine qui fournit les briques pour le reconstruire plus fort, et sans elle en quantité suffisante chaque séance rend moins. Vise ${tgt} g aujourd’hui, répartis sur tes repas.`;
        }
      }
    }
  }
  // Coach CONSCIENT de l'ÉQUILIBRE course ↔ muscu — un axe de MODALITÉ, totalement neuf : jusqu'ici le
  // pilier sport ne lisait que la FRÉQUENCE (jours actifs, allure hebdo), la FORME du jour (readiness), la
  // CHARGE (ACWR) et les carburants chroniques — jamais la RÉPARTITION entre course et renforcement. Or
  // Adrien est un athlète HYBRIDE (trail + renfo) : pour lui, une semaine entièrement d'un seul côté est un
  // vrai trou. Tout-cardio, zéro renfo → les gains de force fondent et les appuis/tendons que la course
  // sollicite perdent le renfort qui les protège (terrain à blessure). Tout-muscu, zéro course → la base
  // aérobie patiemment construite s'érode. Le déséquilibre est invisible à tous les autres signaux (la
  // fréquence peut être parfaite, la charge optimale, la forme au vert — et la semaine quand même 100 %
  // course). On lit weekTrainingBalance (7 j récents) : la note ne parle QUE si la semaine est PURE d'un
  // côté (runs === 0 XOR strength === 0) avec un vrai volume (total ≥ 3 séances — 1-2 séances d'un type ne
  // font pas un déséquilibre) ET si Adrien pratique BEL ET BIEN les deux d'habitude (weekTrainingBalance sur
  // 28 j : runs > 0 ET strength > 0) — sans cette preuve d'hybridité, pousser du renfo à un coureur pur (ou
  // l'inverse) serait du bruit, pas du coaching. On NOMME le manque et le pilier à recaler. Additif pur :
  // trainBalanceGuard ({ missing: 'run'|'strength', count } ou null) TOUJOURS renvoyé ; note APPENDUE à
  // l'insight, action (séance/charge/repos) intacte. Garde-fous cohérents avec les autres notes sport :
  // séance du jour pas déjà faite (!doneToday), pilier pas dormant (!reviveEligible → un micro-pas de
  // reprise n'a pas à parler d'équilibre), forme du jour qui n'ordonne pas le repos (readiness null ou ≥ 50)
  // et PAS en pic de charge (loadSpike null — « ajoute une séance » contredirait « allège »). Vocabulaire
  // distinct (« l'équilibre de ta semaine », « tout-cardio/tout-muscu », « rééquilibrer ») — zéro collision
  // à l'œil ni en regex avec les notes readiness/charge/carburant sport. Réemploi total (weekTrainingBalance,
  // doneToday, readiness, loadSpike, reviveEligible) — zéro nouvelle fonction pure.
  let trainBalanceGuard = null;
  if (chosen.pillar === 'sport' && !doneToday && !reviveEligible && loadSpike == null
      && (readiness == null || readiness >= 50) && typeof weekTrainingBalance === 'function') {
    const recent = weekTrainingBalance(s.workouts, todayKey, 7);
    if (recent && recent.total >= 3 && (recent.runs === 0 || recent.strength === 0)) {
      const span = weekTrainingBalance(s.workouts, todayKey, 28);
      if (span && span.runs > 0 && span.strength > 0) {
        if (recent.runs === 0) {
          // Semaine 100 % muscu → il manque la course.
          trainBalanceGuard = { missing: 'run', count: recent.strength };
          insight += ` Et regarde l’équilibre de ta semaine : ${recent.strength} séance${recent.strength > 1 ? 's' : ''} de muscu et zéro course, alors que tu pratiques les deux d’habitude — une semaine tout-muscu érode la base aérobie que tu as construite. Cale une sortie de course pour rééquilibrer.`;
        } else {
          // Semaine 100 % course → il manque le renfo.
          trainBalanceGuard = { missing: 'strength', count: recent.runs };
          insight += ` Et regarde l’équilibre de ta semaine : ${recent.runs} sortie${recent.runs > 1 ? 's' : ''} de course et zéro renfo, alors que tu pratiques les deux d’habitude — une semaine tout-cardio laisse filer tes gains de force et prive les appuis que la course sollicite du renfort qui les protège. Cale une séance de renfo pour rééquilibrer.`;
        }
      }
    }
  }
  // Coach CONSCIENT de l'ÉQUILIBRE POUSSÉE ↔ TIRAGE — un axe de STRUCTURE, à l'intérieur même de la muscu,
  // que le coach n'avait jamais lu. trainBalanceGuard (#541) regarde l'équilibre course ↔ muscu (modalité) ;
  // sportZoneFocus regarde le groupe le plus REPOSÉ (fraîcheur, jour par jour). Mais aucun ne voit le
  // penchant STRUCTUREL du haut du corps : pousser (pecs, épaules) bien plus qu'on ne tire (dos) est le
  // déséquilibre le plus courant en muscu — et le plus sournois, car chaque séance de poussée paraît saine
  // isolément. Cumulé sur des semaines, il enroule les épaules vers l'avant (posture) et met la coiffe des
  // rotateurs en tension asymétrique : terrain classique de douleur d'épaule. C'est un vrai risque, invisible
  // à la fraîcheur (le dos peut être « reposé » ET sous-travaillé sur le mois) comme à la modalité (100 %
  // muscu peut être parfaitement « hybride » côté course et pourtant tout en poussée). muscleBalance (28 j :
  // séries de poussée pecs/épaules vs tirage dos) et pushPullAdvice existaient — mais ne vivaient QUE dans
  // l'onglet Athlète, jamais dans le coach du jour. Quand le ratio bascule (push-heavy, pull-heavy, ou un
  // côté à zéro) avec un vrai volume (≥ 10 séries poussée+tirage sur le mois — pushPullAdvice renvoie
  // ok:false), le coach NOMME le penchant et le côté à recharger, note APPENDUE à l'insight. Additif pur :
  // pushPullGuard ({ zone, push, pull, ratio } ou null) TOUJOURS renvoyé ; action intacte. Mêmes garde-fous
  // que sportZoneFocus (pilier sport, séance du jour pas faite, pas de ré-amorçage dormant, forme qui
  // n'ordonne pas le repos, pas de pic de charge) — on ne charge un côté que quand une vraie séance est
  // encouragée. Et SUBORDONNÉ à trainBalanceGuard (n'entre que si celui-ci est null) : inutile d'affiner la
  // balance poussée/tirage le jour où on dit déjà « cale carrément une séance de renfo » — le signal grossier
  // (manque total d'un côté de la modalité) prime sur le fin. Vocabulaire distinct (« balance poussée/tirage
  // sur 4 semaines », « coiffe des rotateurs », « enroule les épaules », « haut du corps complet », « priorité
  // posture ») — zéro collision à l'œil ni en regex avec sportZoneFocus (« le plus reposé », « cible en
  // priorité »), trainBalanceGuard (« tout-cardio », « base aérobie », « rééquilibrer ») ou les guards récup.
  // Réemploi total (muscleBalance, pushPullAdvice, doneToday, reviveEligible, loadSpike, readiness) — zéro
  // nouvelle fonction pure.
  let pushPullGuard = null;
  if (chosen.pillar === 'sport' && !doneToday && !reviveEligible && loadSpike == null
      && (readiness == null || readiness >= 50) && trainBalanceGuard == null
      && typeof muscleBalance === 'function' && typeof pushPullAdvice === 'function') {
    const bal = muscleBalance(s.workouts, todayKey, 28);
    const adv = pushPullAdvice(bal, 10);
    if (adv && adv.ok === false) {
      pushPullGuard = { zone: bal.zone, push: bal.push, pull: bal.pull, ratio: bal.ratio };
      if (bal.zone === 'push-heavy') {
        insight += ` Et regarde ta balance poussée/tirage sur 4 semaines : ${bal.push} séries de poussée (pecs, épaules) pour seulement ${bal.pull} de tirage — pousser bien plus qu’on ne tire enroule les épaules vers l’avant et met la coiffe des rotateurs en tension. Ajoute du dos (tractions, rowing) à ta prochaine séance, tes épaules te remercieront.`;
      } else if (bal.zone === 'no-pull') {
        insight += ` Et regarde ta balance poussée/tirage sur 4 semaines : ${bal.push} séries de poussée (pecs, épaules) et zéro tirage — que de la poussée enroule les épaules et met la coiffe des rotateurs en tension. Cale du dos (tractions, rowing), c’est ta priorité posture.`;
      } else if (bal.zone === 'pull-heavy') {
        insight += ` Et regarde ta balance poussée/tirage sur 4 semaines : ${bal.pull} séries de tirage pour seulement ${bal.push} de poussée — le déséquilibre inverse. Ajoute des pecs et des épaules pour un haut du corps complet.`;
      } else if (bal.zone === 'no-push') {
        insight += ` Et regarde ta balance poussée/tirage sur 4 semaines : ${bal.pull} séries de tirage et zéro poussée — ajoute des pecs et des épaules pour un haut du corps complet.`;
      }
    }
  }
  // Coach CONSCIENT du SOMMEIL comme CARBURANT de la CONCENTRATION — le pendant, côté FOCUS, de
  // sleepTrainGuard (#513, sport) et des guards nutrition (#511/#512). Avec lui, les QUATRE piliers
  // (nutrition ×2, sport, focus) croisent enfin le sommeil CHRONIQUE. Le pilier focus lit déjà l'allure
  // hebdo (focusGoalPace) et la forme du JOUR (focusGoalFresh/focusGoalDrained via readiness), mais reste
  // AVEUGLE au sommeil CHRONIQUE — orthogonal à la readiness d'un matin : on peut avoir une readiness
  // correcte tout en accumulant une dette de sommeil depuis des jours. Or le sommeil est le carburant du
  // cerveau : une nuit courte émousse l'attention et la mémoire de travail (cortex préfrontal au ralenti),
  // et c'est la nuit — surtout le sommeil profond et paradoxal — que le cerveau CONSOLIDE ce qu'on a appris
  // le jour. Dormir court, c'est fournir plus d'effort pour retenir moins : chaque bloc de focus rend moins.
  // Un frein réel, jamais nommé côté focus jusqu'ici (focusGoalDrained ne lit que la readiness du JOUR).
  // Quand — et SEULEMENT quand — le pilier poussé est le FOCUS, le bloc du jour pas déjà fait (!doneToday)
  // ET le sommeil récent est court (sleepIns.avg < 7 sur ≥ 3 nuits chiffrées, sleepIns déjà calculé en tête),
  // une note s'append. Même garde-fou que les autres guards : si le sommeil est en ALERTE (tone 'urgent'),
  // il est forcé en tête tier −1 → chosen.pillar 'sommeil', on n'entre pas dans cette branche focus ; la note
  // ne parle donc que dans le cas SUBTIL (sommeil court sans être le focus du jour). Additif pur :
  // sleepFocusGuard (la moyenne h, ou null) TOUJOURS renvoyé ; note APPENDUE à l'insight, action (tâche
  // phare / bloc) intacte. Réemploi total (sleepIns, doneToday) — zéro nouvelle fonction. Données réelles
  // seulement : ≥ 3 nuits récentes chiffrées ET moyenne réellement < 7 h ; nuits solides, ou < 3 nuits, ou
  // aucune récup, ou bloc déjà posé aujourd'hui → null, rien d'ajouté.
  let sleepFocusGuard = null;
  if (chosen.pillar === 'focus' && !doneToday && sleepIns && sleepIns.nights >= 3 && sleepIns.avg > 0 && sleepIns.avg < 7) {
    sleepFocusGuard = sleepIns.avg;
    const numW = n => String(n).replace('.', ',');
    const detteTxt = (sleepIns.debt > 0) ? ` (dette de ${numW(sleepIns.debt)} h sur 14 j)` : '';
    insight += ` Et n’oublie pas ce qui alimente ta concentration : tu dors ${numW(sleepIns.avg)} h en moyenne ces derniers jours${detteTxt}, sous les 7 h — une nuit courte émousse l’attention et la mémoire de travail (le cortex préfrontal tourne au ralenti), et c’est la nuit que le cerveau consolide ce que tu apprends le jour. Dormir court, c’est fournir plus d’effort pour retenir moins ; bien dormir démultiplie chaque bloc de focus.`;
  }
  // Coach CONSCIENT de la RÉGULARITÉ du COUCHER comme socle de la concentration — un axe ORTHOGONAL à
  // sleepFocusGuard (#514). Ce dernier lit la DURÉE chronique (avg < 7 h) ; ici on lit la VARIANCE de
  // l'heure de coucher (bedtimeStdevMin, déjà calculé dans sleepIns), qui capte une DÉFAILLANCE
  // DIFFÉRENTE : on peut dormir assez d'heures MAIS se coucher à 22 h un soir et 3 h le lendemain — la
  // durée paraît correcte, le rythme circadien est en miettes. C'est PRÉCISÉMENT le cas d'Adrien (endort
  // vers ~6 h, horaires erratiques : c'est pour ça que tout le système sommeil a été bâti). Or la
  // régularité de l'horloge interne pèse autant que le nombre d'heures sur la performance COGNITIVE :
  // un coucher erratique désynchronise l'horloge circadienne qui cadence la vigilance, et la vigilance
  // en dents de scie fait décrocher l'attention et le temps de réaction même après une nuit assez longue.
  // Jamais nommé côté focus (sleepFocusGuard reste aveugle au TIMING). Mutuellement exclusif avec lui :
  // n'entre QUE si sleepFocusGuard == null (durée non courte) — quand la nuit est courte, ce message-là
  // a déjà parlé et prime (la durée est le manque le plus grossier) ; on ne pile pas deux notes. Même
  // garde-fou que les autres : sommeil COURT ET irrégulier → tone 'urgent' → pilier sommeil forcé
  // (tier −1), on n'est pas ici ; cette note ne parle donc que dans le cas SUBTIL « durée correcte mais
  // couchers dispersés ». bedtimeStdevMin != null implique ≥ 3 couchers renseignés (bedtimeRegularity
  // renvoie null sinon) : données réelles garanties. Seuil ≥ 60 min = celui d'`irregular` (cohérence).
  // Additif pur : bedtimeFocusGuard (l'écart-type en min, ou null) TOUJOURS renvoyé ; note APPENDUE à
  // l'insight, action (tâche phare / bloc) intacte. Réemploi total (sleepIns, doneToday, sleepFocusGuard).
  let bedtimeFocusGuard = null;
  if (chosen.pillar === 'focus' && !doneToday && sleepFocusGuard == null
      && sleepIns && sleepIns.bedtimeStdevMin != null && sleepIns.bedtimeStdevMin >= 60) {
    bedtimeFocusGuard = sleepIns.bedtimeStdevMin;
    insight += ` Ta durée de sommeil tient, mais tes couchers partent dans tous les sens (±${bedtimeFocusGuard} min d’un soir à l’autre) : le cerveau ne tourne à plein régime cognitif que sur une horloge stable — un coucher erratique désynchronise l’horloge interne qui cadence la vigilance, et l’attention comme le temps de réaction décrochent même après une nuit assez longue. Se coucher à heure fixe compte ici autant que le nombre d’heures.`;
  }
  // Coach CONSCIENT du PROGRÈS de régularité du coucher — le PENDANT POSITIF de bedtimeFocusGuard (#515),
  // et le premier RENFORT (pas un avertissement) sur l'axe circadien × focus. bedtimeFocusGuard alerte
  // quand les couchers sont ACTUELLEMENT dispersés (stdev ≥ 60) ; ici on CRÉDITE quand ils se RESSERRENT
  // d'une semaine à l'autre (bedtimeRegularityTrend dir 'tightening' : écart-type récent ≤ prev − 15 min),
  // le pendant, sur l'axe régularité du coucher, de ce que focusTrend 'up' fait sur le volume. C'est
  // « l'adaptation aux PROGRÈS » demandée : récompenser un rythme de coucher qui se stabilise entretient
  // le comportement (le coach voit et nomme l'effort qui paie), et c'est un levier RÉEL — un coucher qui
  // se régularise réaligne l'horloge circadienne qui cadence la vigilance, donc l'attention suit. Message
  // POSITIF, vocabulaire distinct (« se resserrent », « se stabilise », « réaligne », « vont suivre »,
  // « Bonne nouvelle ») — aucune collision à l'œil ni en regex avec l'avertissement bedtimeFocusGuard
  // (« partent dans tous les sens », « désynchronise »), sleepFocusGuard (« alimente ta concentration »)
  // ou focusTrend (« le volume grimpe »). MUTUELLEMENT EXCLUSIF avec les deux notes sommeil-durée/timing :
  // n'entre QUE si sleepFocusGuard == null (durée non courte) ET bedtimeFocusGuard == null (couchers pas
  // dispersés maintenant) — une seule note sommeil parle par jour ; on ne crédite pas la stabilisation le
  // jour où on alerte encore sur la dispersion ou la dette. bedtimeRegularityTrend exige ≥ 3 couchers
  // récents ET ≥ 3 précédents (null sinon) : données réelles garanties, plus strict que le guard. Additif
  // pur : bedtimeFocusTrend (le delta signé d'écart-type en min, négatif = resserrement, ou null) TOUJOURS
  // renvoyé ; note APPENDUE à l'insight, action (tâche phare / bloc) intacte. Zéro nouvelle fonction pure.
  let bedtimeFocusTrend = null;
  if (chosen.pillar === 'focus' && !doneToday && sleepFocusGuard == null && bedtimeFocusGuard == null
      && typeof bedtimeRegularityTrend === 'function') {
    const bt = bedtimeRegularityTrend(s.recovery, todayKey, 7);
    if (bt && bt.dir === 'tightening') {
      bedtimeFocusTrend = bt.delta;
      insight += ` Bonne nouvelle côté horloge interne : tes couchers se resserrent (±${bt.prevStdevMin} → ±${bt.stdevMin} min d’un soir à l’autre) — un rythme de coucher qui se stabilise réaligne l’horloge circadienne qui cadence la vigilance, et l’attention comme le temps de réaction vont suivre. Tiens ce cap, ta concentration a tout à y gagner.`;
    }
  }
  // Coach CONSCIENT de l'HYDRATATION comme levier AIGU de la concentration — un axe ORTHOGONAL aux trois
  // notes sommeil du focus (#514/#515/#516), toutes centrées sur le sommeil CHRONIQUE (durée, timing). Le
  // pilier focus lit désormais tout le sommeil mais reste AVEUGLE à l'HYDRATATION — pourtant un des leviers
  // cognitifs les plus rapides : même une déshydratation LÉGÈRE (1-2 % du poids) émousse mesurablement
  // l'attention et la mémoire de travail et fait grimper la sensation d'effort. Sa force est d'être l'exact
  // COMPLÉMENT des notes sommeil : là où mieux dormir se construit sur des jours, mieux s'hydrater se
  // corrige en MINUTES — un grand verre avant le bloc, action du jour même. Quand — et SEULEMENT quand — le
  // pilier poussé est le FOCUS, le bloc du jour pas fait (!doneToday) ET l'hydratation récente est
  // chroniquement basse (moyenne < 6 verres sur ≥ 3 jours d'eau saisis parmi les 7 derniers, sous la cible
  // de 8), une note s'append. MUTUELLEMENT EXCLUSIF des trois notes sommeil du focus (n'entre QUE si
  // sleepFocusGuard == null && bedtimeFocusGuard == null && bedtimeFocusTrend == null) : une seule note
  // « socle » par jour — le sommeil, levier primaire (et le combat documenté d'Adrien), prime ; l'hydratation
  // en RELAIS, exactement le motif hydrationTrend-en-relais-de-proteinTrend du pilier nutrition. Vocabulaire
  // distinct (« déshydratation », « un grand verre », « se corrige en minutes ») — zéro collision à l'œil ni
  // en regex avec les notes sommeil (« alimente ta concentration », « partent dans tous les sens », « se
  // resserrent ») ni focusTrend (« le volume grimpe »). Données réelles seulement : ≥ 3 jours d'hydratation
  // saisie (water > 0) dans la fenêtre 7 j, agrégés au MAX par date comme daysHittingTarget. Additif pur :
  // hydrationFocusGuard (la moyenne de verres, ou null) TOUJOURS renvoyé ; note APPENDUE, action (tâche
  // phare / bloc) intacte. Réemploi total (daysAgo, s.nutrition) — zéro nouvelle fonction pure.
  let hydrationFocusGuard = null;
  if (chosen.pillar === 'focus' && !doneToday && sleepFocusGuard == null && bedtimeFocusGuard == null && bedtimeFocusTrend == null) {
    const waterByDate = {};
    for (const n of (Array.isArray(s.nutrition) ? s.nutrition : [])) {
      if (!n) continue;
      const d = daysAgo(n.date);
      if (d === null || d > 6) continue;
      const w = Number(n.water) || 0;
      if (w > 0) waterByDate[n.date] = Math.max(waterByDate[n.date] || 0, w);
    }
    const vals = Object.values(waterByDate);
    if (vals.length >= 3) {
      const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      if (avg > 0 && avg < 6) {
        hydrationFocusGuard = avg;
        const numW = n => String(n).replace('.', ',');
        insight += ` Et un levier immédiat, souvent négligé : tu bois ${numW(avg)} verres d’eau par jour ces derniers jours, sous les 8 — même une déshydratation légère (1 à 2 % du poids) brouille l’attention et la mémoire de travail et fait grimper la sensation d’effort. Contrairement au sommeil, ça se corrige en minutes : un grand verre d’eau avant ton bloc, et garde une gourde à portée.`;
      }
    }
  }
  // Coach × AGENDA pour le SPORT — le pendant du créneau focus (#471). Comme pour le focus, quand le
  // pilier poussé est le sport, que l'heure du jour est connue (opts.nowMinutes, passé par le rendu)
  // et que l'agenda du jour est structuré (≥1 RDV horaire réel), le coach propose le prochain CRÉNEAU
  // LIBRE assez long pour caser la séance (nextFreeSlot, qui contourne les blocs occupés) et le CITE
  // dans l'action : le « quand », pas seulement le « quoi ». Durée du bloc = médiane des durées de
  // séance réelles sur 14 j (défaut 45, arrondie à 5 min, bornée [20, 90]) — la séance type d'Adrien,
  // pas un chiffre arbitraire. Garde-fous : PAS un jour de récup (readiness < 50 → l'action dit
  // « repose », caler une séance la contredirait), PAS un pic de charge (loadSpike, « allège ») NI une
  // forme qui glisse (readinessSlide, « séance allégée, soigne ta récup ») — dans ces deux cas l'action
  // a déjà basculé en frein et « cale ta séance là » la contredirait, exactement comme le bloc lowLoad
  // plus bas refuse d'entrer si readinessSlide a tempéré. PAS quand la séance est déjà faite (doneToday),
  // et un vrai planning horaire requis (sur une journée vide le « créneau » serait « maintenant »,
  // trivial). La micro-marche et le renfort, plus bas, écrasent l'action — donc le créneau — quand on
  // abaisse la barre ou qu'on félicite le suivi ; c'est voulu (pas de créneau à caler dans ces cas).
  let sportSlot = null;
  if (chosen.pillar === 'sport' && !doneToday && !reviveEligible && loadSpike == null && readinessSlide == null && (readiness == null || readiness >= 50)
      && typeof nextFreeSlot === 'function') {
    const now = Math.round(Number(o.nowMinutes));
    if (Number.isFinite(now) && now >= 0 && now < 1440) {
      const agenda = Array.isArray(s.agenda) ? s.agenda : [];
      const hasTimed = agenda.some(a => a && a.date === todayKey && !a.allDay && !a.completed && timeToMinutes(a.time) != null);
      if (hasTimed) {
        const durs = [];
        for (const w of (Array.isArray(s.workouts) ? s.workouts : [])) {
          if (!w) continue;
          const n = daysAgo(w.date);
          if (n === null || n > 13) continue;
          const m = Math.round(Number(w.duration) || 0);
          if (m > 0) durs.push(m);
        }
        let blk = 45;
        if (durs.length >= 3) {
          durs.sort((a, b) => a - b);
          const mid = Math.floor(durs.length / 2);
          const med = durs.length % 2 ? durs[mid] : (durs[mid - 1] + durs[mid]) / 2;
          blk = Math.min(90, Math.max(20, Math.round(med / 5) * 5));
        }
        const slot = nextFreeSlot(agenda, { date: todayKey, after: minutesToTime(now), durationMin: blk });
        if (slot) { sportSlot = slot; action += ` Créneau libre à ${slot} aujourd’hui — cale ta séance là.`; }
      }
    }
  }
  // Coach du CONTENU de séance — jusqu'ici l'action sport disait DE s'entraîner (« programme une
  // séance courte »), et sportSlot disait QUAND, mais jamais QUOI travailler. Or les données réelles
  // savent quel groupe musculaire est le plus reposé ET le moins servi cette semaine :
  // suggestTrainingFocus classe les zones par priorité = repos (jours depuis la dernière fois) + déficit
  // vers le minimum hebdo de 10 séries, en EXCLUANT celles travaillées il y a < 2 j (pas encore récupérées).
  // Le coach nomme donc le groupe à cibler EN PRIORITÉ aujourd'hui — la recommandation « concrète et
  // actionnable » demandée, tirée de l'historique d'exercices d'Adrien, qui équilibre le corps au lieu de
  // toujours retaper les mêmes muscles. MÊME gate que sportSlot (pilier SPORT, séance pas déjà faite,
  // pas de ré-amorçage dormant, pas de spike de charge, readiness pas au rouge) : on ne désigne un groupe
  // à CHARGER que quand une vraie séance est encouragée (pas un jour récup/micro-pas). HONNÊTE : muet tant
  // qu'aucun exercice NOMMÉ n'a jamais été loggé (zoneFreshness tout en 'never' → on ne devine pas une
  // zone sans données). Distingue « jamais ciblé ici » (zone inédite à inaugurer) de « le plus reposé
  // depuis N j ». Additif pur : champ sportZoneFocus ({ zone, days, sets } ou null) TOUJOURS renvoyé ;
  // note APPENDUE à l'action, aucune branche touchée. Réemploi total (suggestTrainingFocus, zoneFreshness)
  // — zéro nouvelle fonction. Vocabulaire distinct (« groupe le plus reposé », « cible en priorité »,
  // « équilibrer ta semaine ») — zéro collision regex avec sportSlot (« cale ta séance ») ni les guards
  // récup (« socle invisible », « carburant », « matériau », « côté récupération »). MÊME gate anti-frein
  // que sportSlot : ni loadSpike ni readinessSlide (l'action dit alors « allège / séance allégée, soigne
  // ta récup » — désigner un groupe à CHARGER « pour équilibrer ta semaine » la contredirait de front).
  let sportZoneFocus = null;
  if (chosen.pillar === 'sport' && !doneToday && !reviveEligible && loadSpike == null && readinessSlide == null && (readiness == null || readiness >= 50)
      && typeof suggestTrainingFocus === 'function' && typeof zoneFreshness === 'function') {
    const fresh = zoneFreshness(s.workouts, todayKey);
    const hasHistory = fresh.some(f => f.status === 'ready' || f.status === 'recent');
    if (hasHistory) {
      const foc = suggestTrainingFocus(s.workouts, todayKey);
      if (foc.length) {
        const top = foc[0];
        const ZONE_FR = { abs: 'les abdos', arms: 'les bras', chest: 'les pectoraux', back: 'le dos', shoulders: 'les épaules', legs: 'les jambes', glutes: 'les fessiers' };
        const zl = ZONE_FR[top.zone] || top.zone;
        sportZoneFocus = { zone: top.zone, days: top.days, sets: top.sets };
        if (top.days == null) {
          action += ` Et cible en priorité ${zl} : un groupe que tu n’as encore jamais ciblé ici — le bon jour pour l’inaugurer et équilibrer ta semaine.`;
        } else {
          const setTxt = top.sets > 0 ? `${top.sets} série${top.sets > 1 ? 's' : ''} cette semaine` : '0 série cette semaine';
          action += ` Et cible en priorité ${zl} : c’est ton groupe le plus reposé (rien depuis ${top.days} j, ${setTxt}) — de quoi équilibrer ta semaine.`;
        }
      }
    }
  }
  // Coach de la ZONE CHRONIQUEMENT DÉLAISSÉE — l'angle du MOIS (28 j), là où sportZoneFocus ne voit que la
  // fraîcheur du JOUR (7 j) et pushPullGuard que le haut du corps. sportZoneFocus désigne le groupe le plus
  // REPOSÉ à cibler AUJOURD'HUI (repos + déficit hebdo) ; il ne dit jamais « ça fait un MOIS que tu n'as pas
  // touché tes jambes ». Or un groupe entier laissé de côté quatre semaines — typiquement le bas du corps
  // chez un pratiquant tourné haut du corps — est un vrai trou structurel : il bride la force globale (les
  // jambes/fessiers sont la plus grosse masse musculaire) et crée un point faible, invisible à la fraîcheur
  // (un groupe jamais servi paraît « bien reposé » sans jamais dire qu'il est SOUS-servi sur le mois) comme
  // à la modalité (100 % muscu peut être « bien hybride » côté course et pourtant zéro jambe). neglectedZoneReport
  // (28 j : séries par zone, flag `neglected` = 0 série OU < 40 % de la moyenne) existait — mais ne vivait
  // QUE dans l'onglet Athlète (carte « bloc »), jamais dans le coach du jour. Le coach NOMME la zone la plus
  // délaissée du mois et invite à la remettre au programme, note APPENDUE à l'insight. Additif pur :
  // sportNeglectGuard ({ zone, sets, mean } ou null) TOUJOURS renvoyé ; action intacte. Mêmes garde-fous que
  // sportZoneFocus (pilier sport, séance du jour pas faite, pas de ré-amorçage dormant, forme qui n'ordonne
  // pas le repos, pas de pic de charge) — on ne réclame une zone en plus que quand une vraie séance est
  // encouragée. SUBORDONNÉ à trainBalanceGuard ET pushPullGuard (n'entre que si les deux sont null) : une
  // seule note d'équilibre à la fois, la plus grossière d'abord (modalité > poussée/tirage > zone délaissée) ;
  // si le trou EST dans l'axe poussée/tirage (dos délaissé), pushPullGuard parle déjà, et cette note se
  // réserve les zones que lui ne voit pas (jambes, fessiers, abdos…). EXIGE un vrai volume mensuel (≥ 20
  // séries-zones sur 28 j) : sans lui, « ta zone délaissée » ne serait que du bruit sur un mois quasi vide (le
  // ton rebuild/revive gère déjà « tu t'entraînes peu »). Vocabulaire distinct (« ta zone la plus délaissée »,
  // « sur le dernier mois », « ajoute … à ton programme ») — zéro collision à l'œil ni en regex avec
  // sportZoneFocus (« le plus reposé », « cible en priorité »), pushPullGuard (« balance poussée/tirage »,
  // « coiffe des rotateurs ») ni trainBalanceGuard (« tout-cardio », « rééquilibrer »). Réemploi total
  // (neglectedZoneReport, doneToday, reviveEligible, loadSpike, readiness) — zéro nouvelle fonction pure.
  let sportNeglectGuard = null;
  if (chosen.pillar === 'sport' && !doneToday && !reviveEligible && loadSpike == null
      && (readiness == null || readiness >= 50) && trainBalanceGuard == null && pushPullGuard == null
      && typeof neglectedZoneReport === 'function') {
    const nz = neglectedZoneReport(s.workouts, todayKey, 28);
    if (nz && nz.neglected) {
      const bs = nz.bySets || {};
      const vals = ['abs', 'arms', 'chest', 'back', 'shoulders', 'legs', 'glutes'].map(z => Number(bs[z]) || 0);
      const total = vals.reduce((a, b) => a + b, 0);
      if (total >= 20) {
        const mean = Math.round(total / vals.length);
        const ZONE_FR = { abs: 'les abdos', arms: 'les bras', chest: 'les pectoraux', back: 'le dos', shoulders: 'les épaules', legs: 'les jambes', glutes: 'les fessiers' };
        const zl = ZONE_FR[nz.zone] || nz.zone;
        sportNeglectGuard = { zone: nz.zone, sets: nz.sets, mean };
        if (nz.sets === 0) {
          insight += ` Et sur le dernier mois, ta zone la plus délaissée, c’est ${zl} : zéro série en quatre semaines. Un groupe musculaire entier laissé de côté aussi longtemps finit par brider ta force globale et creuser un point faible — ajoute ${zl} à ton programme cette semaine.`;
        } else {
          insight += ` Et sur le dernier mois, ta zone la plus délaissée, c’est ${zl} : ${nz.sets} série${nz.sets > 1 ? 's' : ''} en quatre semaines, loin derrière tes autres groupes (~${mean} en moyenne) — ajoute ${zl} à ton programme cette semaine pour combler le retard.`;
        }
      }
    }
  }
  // Coach CONSCIENT de la MONTÉE de KILOMÉTRAGE de course — la règle des +10 %/semaine, l'axe de
  // PROGRESSION du volume de course que le coach n'avait jamais lu. loadSpike (#492) lit la charge
  // GLOBALE (durée × effort de TOUTES les séances, ACWR) ; mais un coureur peut garder cette charge
  // « optimale » tout en faisant BONDIR ses kilomètres de course — remplacer du renfo par du footing, ou
  // courir plus mais en endurance facile (effort bas → load modérée). Le kilométrage propre à la course
  // devient alors AVEUGLE à l'ACWR, et c'est pourtant lui qui casse : monter le mileage trop vite est LA
  // première cause de blessure du coureur (périostite, fracture de fatigue, tendinopathie), parce que
  // tendons, os et articulations s'adaptent bien plus lentement que le système cardio-respiratoire.
  // weeklyKmRamp (km de course 0-6 j vs 7-13 j, zone 'high' = +30 %, au-delà de la fourchette saine des
  // +10 %/semaine) existait mais ne vivait QUE dans l'onglet Athlète — jamais dans le coach du jour. Quand
  // la semaine de course bondit dans la zone 'high' SUR UNE VRAIE BASE (semaine précédente ≥ 10 km — sans
  // ce plancher, un « +150 % » sur 2 km serait du bruit), le coach NOMME le saut et invite à plafonner
  // l'augmentation autour de +10 %. Additif pur : runVolumeGuard ({ thisWeekKm, lastWeekKm, rampPct } ou
  // null) TOUJOURS renvoyé ; note APPENDUE à l'insight (axe VOLUME de course, distinct de l'action du
  // jour). Mêmes garde-fous que les autres notes sport (pilier sport, séance du jour pas faite,
  // pas de ré-amorçage dormant, forme qui n'ordonne pas le repos) et SUBORDONNÉ à loadSpike (n'entre que
  // si loadSpike == null) : une seule note « charge/blessure » à la fois, la plus grossière d'abord (ACWR
  // global > mileage course). Aucune contradiction avec trainBalanceGuard : missing:'run' exige runs === 0
  // cette semaine → km de course = 0 → jamais zone 'high', donc jamais « ajoute une course » vs « plafonne
  // tes km » le même jour. Vocabulaire distinct (« ta montée de kilométrage », « km de course cette
  // semaine », « +10 %/semaine », « tendons, os et articulations », « périostite, fracture de fatigue »)
  // — zéro collision à l'œil ni en regex avec loadSpike (« ton volume habituel », « charge en pic »), les
  // guards carburant (« socle invisible », « carburant »), ni les guards d'équilibre (« tout-cardio »,
  // « balance poussée/tirage », « ta zone la plus délaissée »). Réemploi total (weeklyKmRamp, doneToday,
  // reviveEligible, loadSpike, readiness) — zéro nouvelle fonction pure.
  let runVolumeGuard = null;
  if (chosen.pillar === 'sport' && !doneToday && !reviveEligible && loadSpike == null
      && (readiness == null || readiness >= 50) && typeof weeklyKmRamp === 'function') {
    const ramp = weeklyKmRamp(s.workouts, todayKey);
    if (ramp && ramp.zone === 'high' && ramp.lastWeekKm >= 10) {
      const numK = n => String(n).replace('.', ',');
      runVolumeGuard = { thisWeekKm: ramp.thisWeekKm, lastWeekKm: ramp.lastWeekKm, rampPct: ramp.rampPct };
      insight += ` Et surveille ta montée de kilométrage : tu es passé de ${numK(ramp.lastWeekKm)} à ${numK(ramp.thisWeekKm)} km de course cette semaine (+${ramp.rampPct} %), bien au-delà des +10 %/semaine que tes tendons, tes os et tes articulations encaissent sans casser — c’est le cardio qui suit vite, pas eux. Monter le mileage trop vite est la première cause de blessure du coureur (périostite, fracture de fatigue) : plafonne l’augmentation autour de +10 % la semaine prochaine, le temps que le corps s’adapte au volume.`;
    }
  }
  // Coach de l'ANCRAGE D'HABITUDE — le JOUR d'entraînement de prédilection, un signal que le coach
  // n'avait JAMAIS lu. Tous les autres guards sport parlent de CHARGE (loadSpike), de MODALITÉ
  // (trainBalanceGuard), de ZONES (pushPullGuard/sportZoneFocus/sportNeglectGuard), de VOLUME de course
  // (runVolumeGuard) ou de PROGRESSION (plateau/progress) — le QUOI et le COMBIEN. Aucun ne regarde le
  // QUAND : sur quel jour de semaine Adrien s'entraîne le plus. trainingByWeekday (8 semaines : nombre de
  // séances par jour de semaine + jour dominant) existait mais ne vivait QUE dans l'onglet Athlète (carte
  // « Mes jours · 8 semaines ») — jamais dans le coach du jour (0 appel). Or l'ancrage à une habitude
  // EXISTANTE est le levier de changement de comportement le plus solide (habit stacking) : rappeler
  // « c'est aujourd'hui ton jour d'entraînement » le jour même où le corps a déjà le réflexe rend la
  // séance bien plus probable qu'une injonction abstraite, et c'est un ton RPG qui célèbre une régularité
  // acquise. Quand AUJOURD'HUI est justement ce jour dominant ET que la concentration est réelle, le coach
  // le NOMME et invite à honorer le rendez-vous, note APPENDUE à l'insight. Additif pur : sportHabitDay
  // ({ weekday, count, total, pct } ou null) TOUJOURS renvoyé ; action du jour intacte. Garde-fous :
  // séance du jour PAS déjà faite (!doneToday — sinon l'habitude est déjà honorée, rien à rappeler), pas
  // de ré-amorçage dormant (!reviveEligible), pas de pic de charge (loadSpike == null), forme qui
  // n'ordonne pas le repos (readiness == null || >= 50). EXIGE une VRAIE habitude, sinon « ton jour »
  // serait du bruit : total >= 8 séances sur 8 sem (~1/sem, une base réelle), jour dominant vu >= 3 fois,
  // part >= 30 % des séances (le hasard sur 7 jours donnerait ~14 %) ET pic UNIQUE — pas d'ex æquo (qui
  // s'entraîne tous les jours n'a pas de jour fétiche). N'est PAS subordonné aux guards de zone/charge :
  // axe ORTHOGONAL (le QUAND, pas le QUOI) qui ne fire que ~1 j/sem (le jour dominant) → aucun
  // sur-empilement. Vocabulaire distinct (« c'est justement ton jour », « tu t'entraînes le plus »,
  // « ce rendez-vous », « ancre d'habitude ») — zéro collision à l'œil ni en regex avec les autres notes
  // sport. Réemploi total (trainingByWeekday, doneToday, reviveEligible, loadSpike, readiness) — zéro
  // nouvelle fonction pure.
  let sportHabitDay = null;
  if (chosen.pillar === 'sport' && !doneToday && !reviveEligible && loadSpike == null
      && (readiness == null || readiness >= 50) && typeof trainingByWeekday === 'function') {
    const wd = trainingByWeekday(s.workouts, todayKey, 56);
    if (wd && wd.total >= 8 && wd.bestCount >= 3) {
      const tw = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayKey);
      const todayIdx = (new Date(+tw[1], +tw[2] - 1, +tw[3]).getDay() + 6) % 7;
      const sorted = wd.counts.slice().sort((a, b) => b - a);
      const pct = Math.round(wd.bestCount / wd.total * 100);
      if (todayIdx === wd.bestDay && pct >= 30 && sorted[0] > sorted[1]) {
        const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        const jour = JOURS[wd.bestDay];
        sportHabitDay = { weekday: wd.bestDay, count: wd.bestCount, total: wd.total, pct };
        insight += ` Et c’est justement ton jour : sur les 8 dernières semaines, c’est le ${jour} que tu t’entraînes le plus (${wd.bestCount} séance${wd.bestCount > 1 ? 's' : ''} sur ${wd.total}, ${pct} %). Ton corps a déjà ce rendez-vous dans le rythme — honore-le aujourd’hui : t’appuyer sur une ancre d’habitude qui existe déjà rend la séance bien plus facile à lancer que de compter sur la seule volonté.`;
      }
    }
  }
  // Coach de la PROGRESSION DE FORCE — sportSlot dit QUAND, sportZoneFocus QUEL groupe, mais rien ne
  // regardait si la CHARGE progresse vraiment. Or l'app détecte déjà les plateaux : strengthPlateauAny
  // parcourt les exercices chargés les plus suivis, calcule leur 1RM estimé séance après séance, et
  // repère le premier dont la meilleure valeur ne dépasse plus, sur les 3 dernières séances, celle
  // d'avant la fenêtre. Cette intelligence ne vivait que dans l'onglet Athlète (« Prochain bloc :
  // change une variable ») — jamais dans le coach quotidien. Quand un exercice CHARGÉ stagne, répéter
  // les mêmes séries n'apporte plus rien : le coach NOMME le lift concerné et donne le geste concret de
  // surcharge progressive pour débloquer (répétition en plus, tempo, décharge) — la recommandation
  // « concrète et actionnable » tirée des données réelles, côté « adaptation aux écarts ». MÊME gate de
  // vraie séance que sportZoneFocus, mais on EXIGE en plus un pilier SPORT en bonne santé (tone hors
  // rebuild/revive) : un plateau se lit sur des séances RÉCENTES et régulières, pas quand le sport est
  // décroché (l'historique serait vieux, et le coach dit alors « rouvre la porte », pas « casse ton
  // plateau ») — ce gate écarte aussi tout chevauchement avec le micro-pas. HONNÊTE : muet tant qu'aucun
  // exercice chargé n'a assez d'historique pour juger (strengthPlateauAny → { plateau:false }).
  // Additif pur : champ sportPlateau ({ exercise, best } ou null) TOUJOURS renvoyé ; note APPENDUE à
  // l'insight (axe progression, distinct de l'action « quoi/quand »). Vocabulaire distinct (« marque le
  // pas », « 1RM estimé stagne », « sans nouveau record ») — zéro collision regex avec sportSlot
  // (« cale ta séance »), sportZoneFocus (« cible en priorité ») ni les guards (« socle invisible »…).
  let sportPlateau = null;
  if (chosen.pillar === 'sport' && !doneToday && tone !== 'rebuild' && tone !== 'revive'
      && loadSpike == null && (readiness == null || readiness >= 50)
      && typeof strengthPlateauAny === 'function') {
    const pl = strengthPlateauAny(s.workouts, { window: 3 });
    if (pl && pl.plateau && pl.exercise) {
      sportPlateau = { exercise: pl.exercise, best: pl.best };
      const bestTxt = String(pl.best).replace('.', ',');
      insight += ` Côté progression : ton ${pl.exercise} marque le pas — son 1RM estimé stagne autour de ${bestTxt} kg depuis 3 séances, sans nouveau record. Pour débloquer ça : ajoute une répétition à charge égale, ralentis la phase de descente, ou décharge une semaine avant de reprendre plus lourd.`;
    }
  }
  // Coach de la PROGRESSION DE FORCE — le PENDANT POSITIF du plateau (sportPlateau, #526). Le coach
  // sait NOMMER un lift qui stagne et donner le geste pour débloquer ; il ne savait pas encore SALUER
  // une force qui MONTE, ni PROJETER où elle mène. Or l'app calcule déjà cette prévision :
  // bestStrengthForecast parcourt les exercices chargés les mieux suivis, estime le gain de 1RM par
  // semaine (première → dernière séance) et le nombre de semaines jusqu'au prochain palier rond — mais
  // cette intelligence ne vivait QUE dans l'onglet Athlète (carte « bloc », ligne 🎯). Quand un lift
  // grimpe vraiment, le coach du jour NOMME l'exercice, son 1RM estimé, la pente hebdo et l'ETA au
  // prochain palier — la reconnaissance du PROGRÈS demandée pour la nuit (« adaptation dynamique aux
  // progrès »), pas seulement aux écarts. Un cap concret transforme un chiffre en objectif motivant.
  // MÊME gate que sportPlateau (vraie séance récente, forme pas au rouge, pas de spike, ton sain), PLUS
  // une EXCLUSION MUTUELLE stricte : muet dès qu'un plateau parle (sportPlateau non nul) — jamais « ça
  // stagne » et « ça grimpe » dans le même insight ; la correction du plateau prime (cohérent avec la
  // priorité du coach au problème à régler). HONNÊTE : muet tant qu'aucun exercice chargé n'a une pente
  // positive nette (bestStrengthForecast → null). Additif pur : champ sportProgress
  // ({ exercise, current, milestone, weeks, perWeek } ou null) TOUJOURS renvoyé ; note APPENDUE à
  // l'insight (axe progression). Vocabulaire distinct (« gagne du terrain », « passes la barre des »,
  // « cap de surcharge progressive ») — zéro collision regex avec sportPlateau (« marque le pas »),
  // sportZoneFocus (« cible en priorité »), sportSlot (« cale ta séance ») ni les guards.
  let sportProgress = null;
  if (chosen.pillar === 'sport' && !doneToday && tone !== 'rebuild' && tone !== 'revive'
      && loadSpike == null && (readiness == null || readiness >= 50)
      && sportPlateau == null && typeof bestStrengthForecast === 'function') {
    const fc = bestStrengthForecast(s.workouts, { step: 5, todayKey });
    if (fc && fc.exercise && fc.weeks > 0) {
      sportProgress = { exercise: fc.exercise, current: fc.current, milestone: fc.milestone, weeks: fc.weeks, perWeek: fc.perWeek };
      const curTxt = String(fc.current).replace('.', ','), paceTxt = String(fc.perWeek).replace('.', ',');
      insight += ` Sur ta lancée : ton ${fc.exercise} gagne du terrain — 1RM estimé à ${curTxt} kg (+${paceTxt} kg/sem). À ce rythme, tu passes la barre des ${fc.milestone} kg dans ~${fc.weeks} semaine${fc.weeks > 1 ? 's' : ''} — garde ce cap de surcharge progressive.`;
    }
  }
  // Coach du RECORD DU JOUR — le SOMMET de « l'adaptation aux progrès ». Le coach sait projeter une force
  // qui MONTE (sportProgress, #527) et saluer une séance faite (doneToday, action générique), mais restait
  // AVEUGLE au moment le plus fort de tous : un RECORD PERSONNEL battu AUJOURD'HUI. strengthRecords renvoie
  // déjà, par exercice CHARGÉ, la meilleure perf estimée (1RM) AVEC la date où elle a été posée — un record
  // du jour = un exercice dont le meilleur 1RM de TOUTE son histoire porte la date d'aujourd'hui. Cette
  // intelligence ne vivait que dans l'onglet Athlète (palmarès) — jamais dans le coach quotidien. Quand la
  // séance du jour est faite (doneToday) et qu'elle a établi un nouveau record sur un exercice DÉJÀ pratiqué
  // avant ce jour (un VRAI PR qui BAT un meilleur passé documenté, pas un « record » trivial de première
  // fois), le coach le NOMME et le FÊTE : un chiffre gravé qui transforme « séance faite » en victoire
  // concrète (« ton RPG motivant »). HONNÊTE : ne parle QUE d'un record STRICTEMENT battu aujourd'hui
  // (strengthRecords n'écrase un ancien best que si e1rm >, donc égaler ne compte pas) ET sur un exercice
  // au palmarès AVANT ce jour (le poids du corps est ignoré : estimate1RM(0, r) → null). Additif pur :
  // champ sportRecordToday ({ exercise, e1rm, load, reps } ou null) TOUJOURS renvoyé ; note APPENDUE à
  // l'insight (comme sportProgress/sportPlateau). Réemploi total (strengthRecords) — zéro nouvelle fonction.
  // Exclusif de sportProgress/sportPlateau/sportZoneFocus/sportSlot par construction : ceux-ci exigent
  // !doneToday, celui-ci doneToday → jamais dans le même insight. Vocabulaire distinct (« battre ton
  // record », « ta meilleure perf à ce jour », « c'est gravé ») — zéro collision à l'œil ni en regex.
  let sportRecordToday = null;
  if (chosen.pillar === 'sport' && doneToday && typeof strengthRecords === 'function') {
    const past = (Array.isArray(s.workouts) ? s.workouts : []).filter(w => w && String(w.date || '') < todayKey);
    const priorNames = new Set(strengthRecords(past).map(r => r.name));
    const todayRecs = strengthRecords(s.workouts).filter(r => r.date === todayKey && priorNames.has(r.name));
    if (todayRecs.length) {
      const top = todayRecs.reduce((a, b) => (b.e1rm > a.e1rm ? b : a)); // le plus lourd 1RM battu ce jour
      sportRecordToday = { exercise: top.name, e1rm: top.e1rm, load: top.load, reps: top.reps };
      const e1 = String(top.e1rm).replace('.', ','), ld = String(top.load).replace('.', ',');
      insight += ` 🏆 Et pas n’importe quelle séance : tu viens de battre ton record sur le ${top.name} — ${ld} kg × ${top.reps} (1RM estimé à ${e1} kg), ta meilleure perf à ce jour. Ça, c’est gravé — savoure.`;
    }
  }
  // Coach du RECORD DE RÉPÉTITIONS — le COMPLÉMENT HONNÊTE de sportRecordToday (#529). Ce dernier ne fête
  // qu'un record de CHARGE (1RM estimé via strengthRecords), et IGNORE délibérément le poids du corps
  // (estimate1RM(0, r) → null) : un progrès en calisthénie (tractions 8→12, pompes, dips) restait donc
  // TOTALEMENT invisible au coach, alors que sur ces exercices les répétitions SONT l'axe de progression.
  // Or personalRecords suit déjà, par exercice, le meilleur (charge, reps, date) — et pour un exercice
  // purement au poids du corps la charge reste 0, donc sa date reflète le dernier RECORD DE REPS. Un
  // record de reps du jour = un exercice sans charge dont le meilleur nombre de reps de TOUTE son
  // histoire est battu aujourd'hui. Quand la séance du jour établit ça sur un exercice DÉJÀ documenté
  // avant (un vrai PR de reps, pas un « record » trivial de première fois), le coach le NOMME et le FÊTE —
  // la reconnaissance du progrès au poids du corps que sportRecordToday laissait de côté. HONNÊTE :
  // poids du corps STRICT (rAll.load === 0 : jamais aucune charge sur cet exercice, sinon c'est le
  // domaine de sportRecordToday), reps STRICTEMENT battues (rAll.reps > rPast.reps ; égaler ne compte
  // pas), exercice au palmarès AVANT ce jour (rPast présent). EXCLUSION MUTUELLE avec sportRecordToday :
  // muet si un record de CHARGE parle déjà (une seule célébration/jour, la charge prime — cohérent avec
  // la priorité aux paliers chargés). Additif pur : champ sportRepRecordToday ({ exercise, reps, prev } ou
  // null) TOUJOURS renvoyé ; note APPENDUE à l'insight. Réemploi total (personalRecords) — zéro nouvelle
  // fonction. Vocabulaire distinct (« record de répétitions », « au poids du corps », « rep après rep »,
  // « chapeau ») — zéro collision regex avec sportRecordToday (« 1RM estimé », « c'est gravé »),
  // sportProgress (« gagne du terrain »), sportPlateau (« marque le pas ») ni les autres notes sport.
  let sportRepRecordToday = null;
  if (chosen.pillar === 'sport' && doneToday && sportRecordToday == null && typeof personalRecords === 'function') {
    const past = (Array.isArray(s.workouts) ? s.workouts : []).filter(w => w && String(w.date || '') < todayKey);
    const prPast = personalRecords(past);
    const prAll = personalRecords(s.workouts);
    const cands = [];
    for (const name of Object.keys(prAll)) {
      const rAll = prAll[name], rPast = prPast[name];
      // Poids du corps strict (aucune charge jamais), record de reps posé aujourd'hui, exercice
      // documenté avant, reps strictement battues.
      if (rAll && rAll.load === 0 && rAll.date === todayKey && rAll.reps > 0 && rPast && rAll.reps > rPast.reps) {
        cands.push({ name, reps: rAll.reps, prev: rPast.reps });
      }
    }
    if (cands.length) {
      const top = cands.reduce((a, b) => (b.reps > a.reps ? b : a)); // le plus haut nombre de reps battu ce jour
      sportRepRecordToday = { exercise: top.name, reps: top.reps, prev: top.prev };
      insight += ` 🏆 Et quelle séance : tu viens de battre ton record de répétitions sur le ${top.name} — ${top.reps} reps au poids du corps (ton meilleur passé : ${top.prev}), du jamais-vu chez toi. La force au poids du corps se construit rep après rep — chapeau.`;
    }
  }
  // Coach MÉTA-CONSCIENT du suivi : si ce MÊME pilier a déjà été poussé plusieurs fois récemment
  // (s.coachLog) SANS que rien ne bouge — conseil IGNORÉ, pas juste répété —, hausser le ton ne sert
  // à rien. Le coach change de registre : il propose une MICRO-marche (5-10 min) en le reconnaissant
  // honnêtement, pour rouvrir la porte sans culpabiliser (« on abaisse la barre, pas toi »). Distinct
  // de la rotation anti-radotage, qui change de PILIER après 3 jours du même focus : ici on garde le
  // pilier décroché mais on abaisse radicalement l'exigence. Un coach qui remarque que son approche
  // ne prend pas et s'adapte vaut mieux qu'un coach qui répète plus fort. Uniquement pour les tons
  // « à corriger » (rebuild/revive), jamais après une rotation (le pilier vient de changer d'angle),
  // et jamais un jour où le geste est déjà fait (doneToday — sinon on gronderait un effort réel).
  let microStep = false;
  if (!rotated && !doneToday && (tone === 'rebuild' || tone === 'revive')) {
    const log = Array.isArray(s.coachLog) ? s.coachLog : [];
    const list = Array.isArray(chosen.list) ? chosen.list : [];
    let ignored = 0;
    for (const e of log) {
      if (!e || e.pillar !== chosen.pillar) continue;
      const n = daysAgo(e.date);
      if (n === null || n < 1 || n > 7) continue; // jours RÉVOLUS des 7 derniers (le jour en cours ne compte pas)
      if (!list.some(x => x && x.date === e.date && chosen.active(x))) ignored++;
    }
    if (ignored >= 2) {
      const micros = {
        sport: 'Vise juste 5 min de mouvement aujourd’hui — une marche, 10 squats. Rouvrir la porte suffit.',
        focus: 'Un seul bloc de 10 min, minuteur lancé. Assez court pour ne pas pouvoir refuser.',
        sommeil: 'Ce soir, un seul geste : écrans coupés 15 min plus tôt. Rien d’autre à tenir.',
        nutrition: 'Aujourd’hui, vise juste 1 apport riche en protéines (œufs, skyr, thon). Un seul, pas tout le reste.',
      };
      if (micros[chosen.pillar]) {
        action = micros[chosen.pillar];
        insight += ' Je t’ai déjà soufflé ce cap sans que ça prenne — alors on abaisse la barre, pas toi.';
        microStep = true;
      }
    }
  }
  // Coach du RÉ-AMORÇAGE — APPLICATION (éligibilité calculée plus haut, cf. reviveEligible). Le
  // micro-pas (#465, signal « tu m'ignores » via coachLog) est PLUS spécifique : s'il a déjà pris la
  // main, on le laisse (il abaisse déjà la barre, avec le bon aveu). Sinon, pour un pilier dormant, on
  // remplace l'action générique (« programme une séance courte ») par un tout premier pas MINUSCULE,
  // en NOMMANT la durée de coupure pour que l'ask paraisse proportionné (« Après 26 jours… ») ; au-delà
  // de 3 semaines (long), on ajoute une phrase qui déculpabilise franchement (« on rallume la mèche,
  // pas le chantier »). Additif pur : champ reviveStep (booléen) toujours renvoyé ; aucune autre
  // branche touchée. Distinct du micro-pas dans le libellé pour ne pas radoter le même mot à mot.
  let reviveStep = false;
  if (reviveEligible && !microStep) {
    const d = chosen.lastActiveDays;
    const dTxt = d != null ? `${d} jour${d > 1 ? 's' : ''}` : 'cette coupure';
    const long = d != null && d >= 21;
    const steps = {
      sport: `Après ${dTxt} sans séance, ne vise pas la performance : enfile ta tenue et bouge 5 min, c’est tout.` + (long ? ' Après si longtemps, le seul objectif est de rallumer la mèche.' : ''),
      focus: `Après ${dTxt} sans focus, un seul bloc de 10 min sur une tâche facile — juste pour recréer le réflexe.` + (long ? ' On ne rouvre pas le chantier aujourd’hui, on rallume la lampe.' : ''),
      nutrition: `Après ${dTxt} sans suivi, un seul geste : note 1 apport protéiné aujourd’hui.` + (long ? ' Rien à rattraper — on relance juste le compteur.' : ''),
      sommeil: `Après ${dTxt} sans nuit notée, note juste ta prochaine nuit — un seul champ pour relancer le suivi.` + (long ? ' On reprend le fil doucement, sans viser l’heure parfaite.' : ''),
    };
    if (steps[chosen.pillar]) { action = steps[chosen.pillar]; reviveStep = true; }
  }
  // Coach MÉTA-CONSCIENT positif — le PENDANT du micro-pas (#465). Quand le coach RENFORCE un bon
  // élan (tone 'reinforce', hors rotation) ET que le suivi RÉCENT de ses conseils est élevé
  // (coachFollowThrough ≥ 70 % sur ≥ 3 jours journalisés), il le RECONNAÎT explicitement : le mérite
  // revient à Adrien, pas au coach. Un « garde le rythme » générique ignore l'effort réel ; nommer le
  // suivi (« tu as tenu 5/6 de mes caps ») rend l'agentivité et la fierté. coachFollowThrough
  // n'alimentait qu'une ligne d'affichage séparée (#coachFollow) — on le branche enfin dans le MESSAGE
  // du coach. Réservé au renforcement franc (pas de rotation, où l'on vient de fuir un pilier ignoré).
  let followThrough = null;
  if (!rotated && tone === 'reinforce' && typeof coachFollowThrough === 'function') {
    const ft = coachFollowThrough(s, todayKey, 7);
    if (ft && ft.total >= 3 && ft.rate >= 70) {
      followThrough = ft.rate;
      insight += ` Tu as tenu ${ft.followed}/${ft.total} de mes caps cette semaine — cet élan, c’est toi qui le construis.`;
      // On garde le crédit du suivi (insight), mais on NE réécrit PAS l'action quand le sport doit LEVER
      // LE PIED aujourd'hui : « un jour actif de plus » contredirait frontalement le conseil de récup déjà
      // posé. Le loadSpike (pic de charge) n'est qu'UN des trois signaux « garde léger » — les deux autres
      // sont MUTUELLEMENT EXCLUSIFS de loadSpike (readiness < 50 et readinessSlide exigent readiness < 50 /
      // 50-74, or loadSpike exige readiness null ou ≥ 50), donc `loadSpike == null` ne les couvrait pas :
      // à readiness 15/100, l'action « récupération prioritaire, pas de grosse séance » (l. 5533) se faisait
      // écraser par « un jour actif de plus », soit exactement le conseil que le coach venait de refuser.
      // On reprend la définition canonique de sportEase (l. ~7200) : les trois signaux, pas le seul pic.
      // Et on BORNE l'écrasement au pilier SPORT : « un jour actif de plus » est une saveur sportive
      // qui n'a aucun sens pour sommeil/focus/nutrition (une nuit ne se « fait » pas dans la journée) et
      // écrasait leur action pilier-spécifique bien plus utile (ex. « Vise un coucher 30 min plus tôt ce
      // soir »). Hors sport, on garde cette action riche ; le crédit du suivi reste dans l'insight (déjà
      // ajouté ci-dessus, tous piliers confondus). Le sport, lui, garde son comportement d'origine.
      const sportEaseToday = chosen.pillar === 'sport'
        && ((readiness != null && readiness < 50) || loadSpike != null || readinessSlide != null);
      if (chosen.pillar === 'sport' && !sportEaseToday) action = 'Un jour actif de plus aujourd’hui : tu prouves que la régularité te ressemble.';
    }
  }
  // Coach PRIORISANT — « quoi faire en premier aujourd'hui ». Quand PLUSIEURS piliers décrochent en même
  // temps (fixes contient > 1 pilier), le coach n'en pousse qu'un : le prioritaire, déjà trié plus haut
  // par gravité (tier, puis ampleur du décrochage). Mais ce choix restait IMPLICITE — Adrien voyait un
  // conseil unique sans savoir que d'autres piliers faiblissaient aussi, ni pourquoi celui-là d'abord.
  // On rend la priorisation EXPLICITE dans l'insight en NOMMANT les autres piliers qui décrochent :
  // « Ton sommeil et ta nutrition faiblissent aussi cette semaine — celui-ci d'abord ». Compter les
  // piliers (« 2 autres ») était déjà utile, mais nommer dit à Adrien LESQUELS surveiller ensuite, dans
  // l'ordre de gravité déjà trié — la priorisation actionnable visée par la demande de la nuit : ne pas
  // tout attaquer, commencer par le bon levier, en sachant ce qui suit. Réservé aux tons « à corriger »
  // (chosen EST un fix), HORS rotation (là on a justement fui le pilier prioritaire → « d'abord » serait
  // faux), HORS micro-pas (on abaisse la barre — pas le moment d'empiler les alertes) et HORS geste déjà
  // fait (l'action félicite alors, un « d'abord » sonnerait faux). Additif pur : champ alsoSlipping
  // (nombre) conservé + nouveau champ alsoSlippingPillars (clés des piliers nommés, ordre de gravité).
  const POSSESSIF = { sport: 'ton entraînement', focus: 'ton focus', sommeil: 'ton sommeil', nutrition: 'ta nutrition' };
  let alsoSlipping = 0, alsoSlippingPillars = [];
  if (!rotated && !microStep && !doneToday && (tone === 'rebuild' || tone === 'revive')) {
    const others = fixes.filter(f => f.c.pillar !== chosen.pillar);
    alsoSlipping = others.length;
    alsoSlippingPillars = others.map(f => f.c.pillar);
    if (alsoSlipping >= 1) {
      // Modulation de la GRAVITÉ : nommer les autres piliers qui décrochent est utile (#474), mais les
      // mettre TOUS sur le même « faiblit » perd une info actionnable. Un pilier DORMANT (tier 1 : deux
      // semaines à zéro alors qu'il a déjà existé) n'appelle pas le même geste qu'un simple CREUX (léger
      // recul) : le premier demande une vraie relance, le second un rattrapage. On distingue donc « à
      // l'arrêt » (dormant) de « faiblit » (creux). Trois cas, du plus lisible au plus précis :
      //  • tous dormants   → « … sont à l'arrêt aussi cette semaine »
      //  • tous en creux   → « … faiblissent aussi cette semaine » (libellé historique, inchangé)
      //  • mixte           → état en parenthèse par pilier + verbe neutre « décrochent »
      // Additif pur : alsoSlipping/alsoSlippingPillars inchangés, seul le libellé s'affine.
      const isDormant = f => f.tier === 1;
      const joinNoms = ns => ns.length === 1 ? ns[0] : ns.slice(0, -1).join(', ') + ' et ' + ns[ns.length - 1];
      const allDormant = others.every(isDormant);
      const anyDormant = others.some(isDormant);
      let liste, clause;
      if (anyDormant && !allDormant) {
        liste = joinNoms(others.map(f => (POSSESSIF[f.c.pillar] || f.c.label) + (isDormant(f) ? ' (à l’arrêt)' : ' (en recul)')));
        clause = alsoSlipping === 1 ? 'décroche' : 'décrochent';
      } else {
        liste = joinNoms(others.map(f => POSSESSIF[f.c.pillar] || f.c.label));
        clause = allDormant
          ? (alsoSlipping === 1 ? 'est à l’arrêt' : 'sont à l’arrêt')
          : (alsoSlipping === 1 ? 'faiblit' : 'faiblissent');
      }
      const capListe = liste.charAt(0).toUpperCase() + liste.slice(1);
      insight += ` ${capListe} ${clause} aussi cette semaine — celui-ci d’abord, c’est ton levier prioritaire.`;
    }
  }
  // Crédit du jour (placé EN DERNIER pour primer sur les actions « fais X » — génériques, readiness,
  // tâche phare, renfort) : le geste étant posé, l'action devient une consolidation légère. L'insight
  // (tendance hebdo) reste vrai et intact ; seule l'action, qui donnait un ordre déjà exécuté, change.
  if (doneToday) {
    action = chosen.pillar === 'sport'
      ? 'Séance déjà faite aujourd’hui 💪 — verrouille avec 5 min d’étirements, le reste c’est de la récup bien méritée.'
      : 'Bloc de focus déjà posé aujourd’hui ✅ — savoure ; si l’énergie est là, un second bloc te rapproche de l’objectif.';
  }
  // Pendant du crédit doneToday pour la NUTRITION en renfort. doneToday exclut volontairement sommeil
  // et nutrition (leur action pilier est PROSPECTIVE — « vise un coucher », « renseigne tes protéines »
  // — v2.0.100). Mais l'action GÉNÉRIQUE de renfort « Encore un jour actif aujourd'hui… » est, elle,
  // RÉTROSPECTIVE : un « jour actif » = une entrée active, donc si le pilier a déjà une entrée active
  // datée du jour, l'ordre est déjà exécuté → radotage. Cas prouvé UNIQUEMENT pour la nutrition : le
  // sommeil, lui, ne conserve jamais cette action générique (dès qu'il est choisi il a ≥ 1 nuit → sleepIns
  // est truthy → l'action devient le conseil de coucher du soir, l.5764-5766), donc rien à créditer là.
  // On ne touche QUE cette action générique (si un bloc nutrition l'a déjà remplacée par un conseil
  // ciblé — cible protéines l.5865 — on la laisse) et QUE la nutrition. Curation, aucune note ajoutée.
  if (tone === 'reinforce' && chosen.pillar === 'nutrition'
      && action === 'Encore un jour actif aujourd’hui pour ancrer l’habitude.'
      && (Array.isArray(chosen.list) ? chosen.list : []).some(e => e && e.date === todayKey && chosen.active(e))) {
    action = 'Déjà noté aujourd’hui ✅ — l’habitude est ancrée, savoure : rien d’autre à cocher côté nutrition.';
  }
  // Crédit MULTI-PILIERS — le pendant POSITIF de la priorisation (alsoSlipping NOMME ce qui décroche ;
  // ici on reconnaît ce qui TIENT). Le coach savait pointer les faiblesses, jamais saluer une journée
  // bien remplie. Quand le contexte est bon — le geste du pilier poussé est DÉJÀ posé (doneToday) OU le
  // coach RENFORCE un bon élan (tone 'reinforce') — et qu'Adrien a en réalité déjà TOUCHÉ plusieurs
  // piliers aujourd'hui (entrée active datée du jour, mêmes prédicats d'activité que les piliers), le
  // coach le CRÉDITE : « 3/4 de tes piliers déjà cochés aujourd'hui — belle journée complète. » Nommer
  // la journée complète motive (l'app est gamifiée) et rend l'agentivité, exactement comme alsoSlipping
  // rend la priorisation lisible côté correction. Complémentaire et DISJOINT d'alsoSlipping par
  // construction : alsoSlipping n'existe qu'en rebuild/revive + !doneToday ; ce crédit n'existe qu'en
  // doneToday OU reinforce → jamais les deux notes le même jour. Seuil ≥ 2 piliers pour que « cochés
  // aujourd'hui » traduise une vraie dynamique du jour, pas un pilier isolé. Champ pur pillarsToday
  // (0-4) TOUJOURS renvoyé (informatif) ; la note n'est ajoutée qu'en contexte positif.
  const pillarsToday = cands.filter(c => (Array.isArray(c.list) ? c.list : []).some(e => e && e.date === todayKey && c.active(e))).length;
  // SÉRIE de journées complètes — le cran au-dessus du crédit d'un jour isolé (#475). Reconnaître UNE
  // belle journée motive ; reconnaître qu'Adrien ENCHAÎNE plusieurs journées complètes motive bien plus
  // (l'app est gamifiée, la régularité est le vrai levier). On compte, par jour et sur les piliers, le
  // nombre de piliers ayant une entrée active ce jour-là (mêmes prédicats que les piliers), puis la SÉRIE
  // de jours consécutifs finissant aujourd'hui (avec grâce) où AU MOINS 3 des 4 piliers sont cochés —
  // exactement le seuil de la « belle journée complète 🎯 ». Réutilise completeDaysStreak/dailyStreak
  // (déjà éprouvés). Champ pur completeDayStreak TOUJOURS renvoyé. Dans la note de crédit : quand
  // aujourd'hui EST complet (pillarsToday >= 3, donc dans la série) ET que la série court (>= 2 jours), on
  // célèbre l'enchaînement plutôt que la journée seule ; sinon on garde le crédit d'un jour tel quel.
  const completeDayCounts = new Map();
  for (const c of cands) {
    for (const e of (Array.isArray(c.list) ? c.list : [])) {
      if (!e || !c.active(e)) continue;
      const d = e.date;
      if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d > todayKey) continue;
      let set = completeDayCounts.get(d);
      if (!set) { set = new Set(); completeDayCounts.set(d, set); }
      set.add(c.pillar);
    }
  }
  const completeDayDays = Array.from(completeDayCounts, ([date, set]) => ({ date, count: set.size }));
  const completeDayStreak = (typeof completeDaysStreak === 'function') ? completeDaysStreak(completeDayDays, 3, todayKey) : 0;
  // PALIERS de série de journées complètes — le cran au-dessus de la simple série (#477). Enchaîner
  // 7 journées complètes (une SEMAINE pleine à 3+ piliers) n'est pas un compteur anodin : c'est un
  // JALON, et les jalons se fêtent — l'app gamifiée le fait déjà pour les streaks quotidiens
  // (STREAK_MILESTONES / nextStreakMilestone). On rebranche exactement ces paliers ici : quand la
  // série FRANCHIT pile un palier (3, 7, 14, 30…), le coach le débloque explicitement (« 🏅 Palier
  // franchi : une semaine complète ! ») ; sinon, quand le prochain palier est à UN jour, il donne le
  // cap concret à tenir demain (« Encore 1 jour pour franchir le palier des 7. 🎯 ») — une carotte
  // actionnable qui transforme la fierté d'hier en objectif de demain. Réutilise STREAK_MILESTONES,
  // aucune nouvelle échelle. Additif pur : champ completeDayMilestone (valeur du palier franchi
  // aujourd'hui, ou null) TOUJOURS renvoyé ; le libellé s'ajoute à la note de série existante.
  let completeDayMilestone = null;
  if ((doneToday || tone === 'reinforce') && pillarsToday >= 2) {
    if (pillarsToday >= 3 && completeDayStreak >= 2) {
      insight += ` ${completeDayStreak} jours d’affilée à 3+ piliers — tu enchaînes les journées complètes. 🔥`;
      if (Array.isArray(STREAK_MILESTONES) && STREAK_MILESTONES.includes(completeDayStreak)) {
        completeDayMilestone = completeDayStreak;
        const palier = completeDayStreak === 7 ? 'une semaine complète'
          : completeDayStreak === 14 ? 'deux semaines complètes'
          : completeDayStreak === 30 ? 'un mois complet'
          : `${completeDayStreak} jours`;
        insight += ` 🏅 Palier franchi : ${palier} de journées pleines !`;
      } else if (typeof nextStreakMilestone === 'function') {
        const nm = nextStreakMilestone(completeDayStreak);
        if (nm && nm.remaining === 1) insight += ` Encore 1 jour pour franchir le palier des ${nm.milestone}. 🎯`;
      }
    } else if (pillarsToday >= 3) {
      insight += ` ${pillarsToday}/4 de tes piliers déjà cochés aujourd’hui — belle journée complète. 🎯`;
    } else {
      insight += ' 2/4 de tes piliers déjà cochés aujourd’hui — bonne lancée.';
    }
  }
  // Coach de la RELANCE AMORCÉE — le pendant POSITIF du ré-amorçage (#481). Le coach sait proposer le
  // tout premier pas d'un pilier DORMANT ; il ne savait pas encore SALUER Adrien quand il l'a HONORÉ.
  // Or franchir le mur d'activation après une longue coupure est l'instant le plus fragile ET le plus
  // méritant d'une reprise : le nommer ancre la victoire et protège l'élan naissant. Quand le pilier
  // poussé est en bonne dynamique (tone 'reinforce', hors rotation) et que son activité récente marque
  // la FIN d'un long silence — la reprise (plus ancien geste de la fenêtre 7 j) suit un trou ≥ 14 j sans
  // activité, et le tout dernier geste est FRAIS (≤ 3 j) —, le coach le reconnaît explicitement. On lit
  // le vrai historique du pilier (mêmes prédicats d'activité) pour mesurer le trou : relaunchDay = plus
  // ancienne activité de la fenêtre récente (= début de la reprise) ; prevOld = activité juste avant le
  // trou ; gap = leur écart = la durée du silence rompu. Réservé au ton positif (une reprise se fête,
  // pas un décrochage) et à un pilier réellement ANCIEN (older non vide) — un pilier flambant neuf n'est
  // pas une « relance ». Disjoint du ré-amorçage/micro-pas (tons de correction) par le ton. Additif pur :
  // champ comeback (booléen) TOUJOURS renvoyé ; note ajoutée à l'insight, action (déjà enrichie) intacte.
  let comeback = false, comebackStage = null;
  if (tone === 'reinforce' && !rotated) {
    const ns = [];
    for (const e of (Array.isArray(chosen.list) ? chosen.list : [])) {
      if (!e || !chosen.active(e)) continue;
      const n = daysAgo(e.date);
      if (n !== null) ns.push(n);
    }
    ns.sort((a, b) => a - b);
    const recent = ns.filter(n => n <= 6);
    const older = ns.filter(n => n > 6);
    if (recent.length && older.length && ns[0] <= 3) {
      const relaunchDay = recent[recent.length - 1]; // plus ancienne activité récente = début de la reprise
      const prevOld = older[0];                       // dernière activité avant le trou
      const gap = prevOld - relaunchDay;
      if (gap >= 14) {
        comeback = true;
        const when = relaunchDay === 0 ? 'aujourd’hui' : relaunchDay === 1 ? 'hier' : `il y a ${relaunchDay} j`;
        insight += ` Tu as rallumé ${POSSESSIF[chosen.pillar] || 'ce pilier'} ${when} après ${gap} jours d’arrêt — le plus dur (franchir la reprise) est fait, ne laisse pas la flamme retomber.`;
        // ESCALADE du geste au fil de la reprise (piste en tête de #481/#482). #481 propose le premier
        // pas d'un pilier dormant, #482 SALUE la reprise amorcée ; il manquait le troisième temps : faire
        // GRANDIR l'ask avec l'élan, au lieu de servir le « encore un jour actif » générique quel que soit
        // le stade de la relance. Deux stades, mesurés par le nombre de jours actifs DISTINCTS de la
        // semaine (chosen.recentDays, déjà calculé) :
        //  • ÉTINCELLE (recentDays === 1) — un seul geste depuis la reprise : c'est fragile, on PROTÈGE
        //    plutôt qu'on pousse. Objectif = un 2e jour, pas une grosse séance qui dégoûte.
        //  • ELLE PREND (recentDays ≥ 2) — la reprise s'installe : on REMONTE le geste vers la normale
        //    (« repasse à une vraie séance / un vrai bloc / ta cible protéines pleine »), Adrien a regagné
        //    le droit d'exiger. Pour le SPORT on respecte la readiness : un jour de récup (< 50) garde le
        //    geste léger — pousser « une vraie séance » contredirait l'action readiness déjà posée.
        // Le SOMMEIL est exclu : son coach dédié (sleepIns/plan de recalage) tient déjà une action riche,
        // qu'une escalade générique piétinerait. Additif pur : champ comebackStage (null hors comeback),
        // note APPENDUE à l'action (jamais remplacée), aucune autre branche touchée.
        comebackStage = chosen.recentDays >= 2 ? 'building' : 'spark';
        const n = chosen.recentDays;
        // Garder léger quand la forme du jour est basse (readiness < 50) OU quand la charge est déjà en
        // pic (loadSpike) — dans les deux cas, « repasse à une vraie séance » serait dangereux.
        const sportEase = chosen.pillar === 'sport' && ((readiness != null && readiness < 50) || loadSpike != null || readinessSlide != null);
        const sportEaseWhy = loadSpike != null ? 'charge déjà élevée cette semaine, garde léger' : readinessSlide != null ? 'ta forme glisse ces jours-ci, garde léger' : 'readiness bas aujourd’hui, garde léger';
        // Même garde-fou côté FOCUS : quand la readiness du JOUR est au plancher, l'insight a posé un
        // frein « focus court / vraie pause » (focusGoalDrained ou focusMarginDrained) — « repasse à un
        // vrai bloc, pas juste 10 min » le contredirait exactement comme sportEase l'évite côté séance.
        const focusEase = chosen.pillar === 'focus' && (focusGoalDrained != null || focusMarginDrained != null);
        const escal = comebackStage === 'spark' ? {
          sport: 'Ne force pas le rythme : un 2e jour actif cette semaine ancre l’étincelle mieux qu’une grosse séance.',
          focus: 'Ne force pas le rythme : un 2e bloc cette semaine ancre l’étincelle mieux qu’une journée marathon.',
          nutrition: 'Ne force pas le rythme : un 2e jour de suivi cette semaine réancre le réflexe, pas besoin de tout tracker.',
        } : {
          sport: `La reprise tient (${n} jours cette semaine) — ${sportEase ? sportEaseWhy + ', tu pousseras à la prochaine.' : 'tu as regagné le droit à une vraie séance aujourd’hui.'}`,
          focus: `La reprise tient (${n} jours cette semaine) — ${focusEase ? 'garde un bloc court aujourd’hui, ta tête est à plat, tu pousseras à la prochaine.' : 'repasse à un vrai bloc de focus, pas juste 10 min.'}`,
          nutrition: `La reprise tient (${n} jours cette semaine) — vise ta cible protéines pleine aujourd’hui, plus juste un apport.`,
        };
        if (escal[chosen.pillar]) action += ' ' + escal[chosen.pillar];
      }
    }
  }
  // Coach de la SÉRIE EN JEU — l'aversion à la perte, ressort de motivation le plus puissant d'une
  // app gamifiée. Le coach RENFORCE déjà un bon élan (tone 'reinforce') mais restait aveugle à un
  // signal décisif : une SÉRIE de jours CONSÉCUTIFS sur le pilier poussé, encore VIVANTE mais pas
  // honorée aujourd'hui. « Garde le rythme » est abstrait ; « ta série de 6 jours est en jeu — un
  // geste la garde vivante » nomme un capital concret qu'on risque de perdre, et perdre fait agir
  // plus que gagner. On lit le vrai historique du pilier (mêmes prédicats d'activité) : streak =
  // dailyStreak des dates actives (grâce incluse — le jour en cours encore vide fait compter la série
  // depuis hier). On ne parle QUE d'une série RÉELLE (≥ 3 j, seuil du 1er palier STREAK_MILESTONES) et
  // EN JEU : le geste du jour n'est pas encore posé — vrai pour TOUS les piliers (pas seulement
  // sport/focus que traque doneToday), d'où le test activeToday local ; si la série INCLUT déjà
  // aujourd'hui, elle n'est pas « en jeu » mais prolongée, on se tait. Réservé au renforcement franc
  // (reinforce, hors rotation) et DISJOINT du comeback (une reprise fraîche raconte déjà l'histoire du
  // run — pas de double récit). Additif pur : champ streakAtRisk (nombre de jours, ou null) TOUJOURS
  // renvoyé ; note appendue à l'insight, action intacte.
  let streakAtRisk = null, streakMilestoneReach = null, streakRecordReach = null;
  if (tone === 'reinforce' && !rotated && !comeback && typeof dailyStreak === 'function') {
    const activeToday = (Array.isArray(chosen.list) ? chosen.list : []).some(e => e && e.date === todayKey && chosen.active(e));
    if (!activeToday) {
      const dates = [];
      for (const e of (Array.isArray(chosen.list) ? chosen.list : [])) {
        if (e && chosen.active(e) && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || ''))) dates.push(e.date);
      }
      const streak = dailyStreak(dates, todayKey);
      if (streak >= 3) {
        streakAtRisk = streak;
        insight += ` 🔥 Ta série de ${streak} jours d’affilée sur ${POSSESSIF[chosen.pillar] || 'ce pilier'} est en jeu — un seul geste aujourd’hui la garde vivante.`;
        // PALIER de série EN JEU — quand honorer le pilier AUJOURD'HUI ferait franchir PILE un palier
        // (STREAK_MILESTONES : 3, 7, 14, 30…), on double le levier : à l'aversion à la perte (la série
        // en jeu) s'ajoute la carotte d'un JALON à décrocher dans la foulée. C'est le cas exactement
        // quand nextStreakMilestone(streak).remaining === 1 (streak+1 est un palier) — la série court
        // jusqu'à hier (grâce), le geste du jour la porterait à streak+1. Réutilise l'échelle existante,
        // aucune nouvelle. Additif pur : champ streakMilestoneReach (valeur du palier atteignable
        // aujourd'hui, ou null) TOUJOURS renvoyé ; libellé APPENDU à la note « série en jeu ».
        if (typeof nextStreakMilestone === 'function') {
          const nm = nextStreakMilestone(streak);
          if (nm && nm.remaining === 1) {
            streakMilestoneReach = nm.milestone;
            const palier = nm.milestone === 7 ? 'le palier d’une semaine'
              : nm.milestone === 14 ? 'le palier de deux semaines'
              : nm.milestone === 30 ? 'le palier d’un mois'
              : `le palier des ${nm.milestone} jours`;
            insight += ` Et ce geste décroche ${palier} ! 🏅`;
          }
        }
        // RECORD PERSO de série — battre sa propre meilleure série est le levier le plus intime : le
        // coach nommait la série en jeu et le palier fixe, mais restait aveugle au RECORD all-time du
        // pilier. On lit la plus longue série JAMAIS tenue (bestDailyStreak sur les mêmes dates ; le run
        // en cours en fait partie, donc best ≥ streak). On ne parle que d'un record NOTABLE (≥ 7 j, une
        // vraie semaine à défendre — en dessous, palier/série suffisent). Deux cas, DISJOINTS du palier
        // du jour (on se tait si streakMilestoneReach a déjà parlé — une seule carotte bonus/jour) :
        //  • 'break' (streak === best) : le run en cours EST déjà ton record → un geste le PROLONGE en
        //    nouveau record all-time.
        //  • 'near' (best > streak, à ≤ 3 j) : un record d'un run PASSÉ est à portée — on chiffre le reste
        //    (aujourd'hui compte comme le 1er des jours à tenir pour l'égaler).
        // Additif pur : champ streakRecordReach ('break' | 'near' | null) TOUJOURS renvoyé, note appendue.
        if (!streakMilestoneReach && typeof bestDailyStreak === 'function') {
          const best = bestDailyStreak(dates);
          if (best >= 7) {
            if (streak >= best) {
              streakRecordReach = 'break';
              insight += ` 🏆 Et là tu bats ton record perso sur ${POSSESSIF[chosen.pillar] || 'ce pilier'} : jamais tu n’avais tenu autant de jours d’affilée.`;
            } else if (best - streak <= 3) {
              streakRecordReach = 'near';
              const reste = best - streak;
              insight += ` Ton record perso ici est de ${best} jours d’affilée — encore ${reste} jour${reste > 1 ? 's' : ''} pour l’égaler.`;
            }
          }
        }
      }
    }
  }
  // MICRO-JALON DE REPRISE — le pendant PRÉCOCE de la « série en jeu ». Une série qui repart après une
  // rupture franchit sa marche la plus fragile — et la plus décisive — AVANT d'atteindre le seuil « en
  // jeu » de 3 j : à 2 jours d'affilée, rien ne la saluait, alors même que c'est là qu'on rebâtit ce
  // qu'on avait perdu. On comble ce trou : en renforcement (reinforce, hors rotation, hors comeback qui
  // raconte déjà la relance), quand la série EN COURS est courte (2 ou 3 j, streakAtRisk resté muet — soit
  // streak < 3, soit streak 3 mais geste du jour déjà posé) ET qu'il existe un RECORD perso NOTABLE (≥ 7 j)
  // au-dessus, on nomme la RECONSTRUCTION : « tu retrouves le chemin de ta meilleure série ». Le record
  // sert de cap concret vers lequel remonter — la reprise reprend du sens. Disjoint de streakAtRisk (série
  // ≥ 3 en jeu), du comeback (relance longue) et de brokenStreak (rebuild) par streak / le ton. Additif
  // pur : champ streakRebuild (record perso visé, ou null) TOUJOURS renvoyé ; note appendue, action intacte.
  let streakRebuild = null;
  if (tone === 'reinforce' && !rotated && !comeback && streakAtRisk == null
      && typeof dailyStreak === 'function' && typeof bestDailyStreak === 'function') {
    const dates = [];
    for (const e of (Array.isArray(chosen.list) ? chosen.list : [])) {
      if (e && chosen.active(e) && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')) && e.date <= todayKey) dates.push(e.date);
    }
    const streak = dailyStreak(dates, todayKey);
    if (streak === 2 || streak === 3) {
      const best = bestDailyStreak(dates);
      if (best >= 7) {
        streakRebuild = best;
        insight += ` 🌱 Tu reconstruis : ${streak} jours d’affilée sur ${POSSESSIF[chosen.pillar] || 'ce pilier'}, tu retrouves le chemin de ta meilleure série (record perso : ${best} jours). Le plus dur — repartir — est derrière toi, une marche à la fois.`;
      }
    }
  }
  // Coach de la SÉRIE ROMPUE — le pendant CONSOLANT, côté correction, de la « série en jeu » (#484/#485,
  // qui n'agit qu'en reinforce sur une série VIVANTE). Côté correction, le coach ne savait que constater
  // le recul ; or un pilier qui RECULE juste après avoir tenu une belle SÉRIE ne mérite pas un reproche
  // mais un mot qui reconnaît l'acquis : perdre une série de 5 jours n'est pas un échec, c'est une base à
  // relancer, et la nommer transforme la culpabilité (« j'ai lâché ») en élan (« je repars de là »).
  // Quand le coach corrige un pilier (tone 'rebuild', hors rotation) dont la série est bien ROMPUE
  // aujourd'hui (dailyStreak(today) === 0 : ni aujourd'hui ni hier honorés) mais dont le dernier geste
  // reste FRAIS (≤ 10 j — au-delà on glisse vers le pilier dormant, terrain du ré-amorçage, qui n'existe
  // qu'en ton 'revive'), on mesure la LONGUEUR de la série close à ce dernier jour actif — dailyStreak
  // réutilisé en prenant ce jour comme « aujourd'hui » — et, si elle était réellement LONGUE (≥ 4,
  // au-dessus du seuil « en jeu » de 3), on NOMME l'acquis pour recadrer. Disjoint de streakAtRisk /
  // comeback (reinforce) et du ré-amorçage (revive) par le ton. Additif pur : champ brokenStreak
  // (longueur de la série rompue, ou null) TOUJOURS renvoyé ; note appendue à l'insight, action intacte.
  let brokenStreak = null, brokenStreakTier = null;
  if (tone === 'rebuild' && !rotated && typeof dailyStreak === 'function') {
    const dates = [];
    for (const e of (Array.isArray(chosen.list) ? chosen.list : [])) {
      if (e && chosen.active(e) && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')) && e.date <= todayKey) dates.push(e.date);
    }
    if (dates.length && dailyStreak(dates, todayKey) === 0) {
      const lastKey = dates.reduce((a, b) => (b > a ? b : a));   // dernier jour actif (série close ce jour-là)
      const last = daysAgo(lastKey);
      if (last != null && last >= 2 && last <= 10) {
        const broke = dailyStreak(dates, lastKey);
        if (broke >= 4) {
          brokenStreak = broke;
          // NUANCE selon la LONGUEUR perdue — consoler « pareil » une série de 4 jours et une série
          // d'un mois sonne faux : la première se relance d'un geste léger, la seconde était un vrai
          // capital dont la reprise mérite un mot à la hauteur. On gradue avec les paliers EXISTANTS
          // (STREAK_MILESTONES : 7 = semaine, 14 = deux semaines, 30 = mois) : dès qu'un palier de
          // semaine est franchi (broke ≥ 7) on nomme la magnitude (« une semaine entière », « ça,
          // c'est du solide ») ; en dessous (4-6 j) on garde le ton léger « vite relancée ».
          // brokenStreakTier ('long' | 'court') TOUJOURS renvoyé quand brokenStreak l'est.
          const palierNom = broke >= 30 ? 'un mois entier' : broke >= 14 ? 'deux semaines pleines' : broke >= 7 ? 'une semaine entière' : null;
          if (palierNom) {
            brokenStreakTier = 'long';
            insight += ` Tu tenais ${palierNom} d’affilée sur ${POSSESSIF[chosen.pillar] || 'ce pilier'} avant cette pause — ça, c’est du solide : pas un échec, une vraie base à relancer. Un geste aujourd’hui et tu repars de haut.`;
          } else {
            brokenStreakTier = 'court';
            insight += ` Tu tenais ${broke} jours d’affilée sur ${POSSESSIF[chosen.pillar] || 'ce pilier'} avant cette pause — pas un échec, une série vite relancée : un geste aujourd’hui et tu repars.`;
          }
        }
      }
    }
  }
  // Coach de la CHAÎNE D'HABITUDE — jusqu'ici le coach lisait les 4 piliers (sport/focus/sommeil/
  // nutrition), les objectifs hebdo, la readiness et le sommeil, mais restait TOTALEMENT AVEUGLE au
  // tracker d'habitudes (`s.habits`) — une source de données réelle jamais exploitée. Or une habitude
  // dont la SÉRIE se joue AUJOURD'HUI (prévue ce jour, pas encore cochée) est le signal le plus
  // TIME-CRITICAL et actionnable qui soit : contrairement aux tendances chroniques, elle TOMBE si la
  // journée se termine sans validation — c'est pile « quoi faire en premier aujourd'hui ». On réutilise
  // `habitsAtRisk` (déjà testé : prévues ce jour, non faites, série ≥ min, triées série desc) avec le
  // seuil 3 (même seuil « en jeu » que streakAtRisk des piliers) pour ne nommer qu'une chaîne qui vaut
  // la peine d'être protégée. On NOMME la plus longue série menacée, et on signale s'il en reste
  // d'autres à cocher (priorisation honnête). Orthogonal aux piliers → la note s'appende quel que soit
  // le pilier/ton choisi (l'alternance, plus prioritaire, a déjà `return` au-dessus, donc jamais
  // touchée). Vocabulaire DISTINCT (« ne casse pas la chaîne », « ton habitude "X" », « cochée ») —
  // zéro collision à l'œil ni en regex avec streakAtRisk (« en jeu », « d'affilée sur ton pilier »),
  // brokenStreak (« avant cette pause ») ni streakRebuild. Additif pur : champ habitAtRisk
  // ({ name, streak } ou null) TOUJOURS renvoyé ; note APPENDUE à l'insight, action du jour intacte.
  let habitAtRisk = null;
  if (typeof habitsAtRisk === 'function') {
    const risky = habitsAtRisk(s.habits, todayKey, 3);
    if (risky.length) {
      const top = risky[0];
      habitAtRisk = { name: top.name, streak: top.streak };
      const extra = risky.length - 1;
      const others = extra > 0 ? ` (+${extra} autre${extra > 1 ? 's' : ''} à cocher)` : '';
      insight += ` Ne casse pas la chaîne : ton habitude « ${top.name} » tient depuis ${top.streak} jour${top.streak > 1 ? 's' : ''} et n’est pas encore cochée aujourd’hui${others} — un petit geste et elle continue.`;
    }
  }
  // Coach du PALIER D'HABITUDE — le pendant POSITIF de `habitAtRisk` (#520). Le coach savait AVERTIR
  // qu'une chaîne allait tomber, jamais CÉLÉBRER qu'une chaîne vient d'atteindre un jalon. Or les
  // additions récentes (guards sommeil/hydratation/mobilité/protéine, habitAtRisk) sont TOUTES des
  // alertes de déficit : le coach est devenu correctif. Un palier de série d'habitude FRANCHI
  // aujourd'hui est un renforcement positif à forte valeur (aversion à la perte × fierté du progrès,
  // « ton RPG motivant ») sur une donnée réelle — la série d'une habitude COCHÉE ce jour. On réutilise
  // `habitsForDay` (déjà testé : habitudes PRÉVUES ce jour → {done, streak}) et l'échelle
  // EXISTANTE STREAK_MILESTONES (3, 7, 14, 30, 60, 100, 180, 365) — aucune nouvelle échelle. Une
  // habitude cochée aujourd'hui dont la série tombe PILE sur un palier ne le franchit qu'UNE fois (le
  // lendemain la série vaut palier+1, hors liste) : la note ne se répète pas. On nomme la PLUS haute
  // série au palier (la plus impressionnante). Disjoint de `habitAtRisk` (habitudes NON cochées) : les
  // deux peuvent parler le même jour sur des habitudes différentes, sans se contredire. Vocabulaire
  // DISTINCT (« Chaîne au sommet », « atteint … jours consécutifs », « l'automatisme s'installe ») —
  // zéro collision à l'œil ni en regex avec habitAtRisk (« Ne casse pas la chaîne », « tient depuis »),
  // completeDayMilestone (« Palier franchi … journées pleines »), streakRecordReach (« bats ton record
  // perso ») ni streakRebuild (« Tu reconstruis »). Additif pur : champ habitMilestone ({ name, streak }
  // ou null) TOUJOURS renvoyé ; note APPENDUE à l'insight, action du jour intacte.
  let habitMilestone = null;
  if (typeof habitsForDay === 'function' && Array.isArray(STREAK_MILESTONES)) {
    const reached = habitsForDay(s.habits, todayKey).filter(h => h.done && STREAK_MILESTONES.includes(h.streak));
    if (reached.length) {
      const top = reached.reduce((a, b) => (b.streak > a.streak ? b : a));
      habitMilestone = { name: top.name, streak: top.streak };
      const named = { 7: 'une semaine complète', 14: 'deux semaines pleines', 30: 'un mois entier', 60: 'deux mois', 100: 'cent jours', 180: 'six mois', 365: 'une année entière' }[top.streak];
      const label = named ? `${named} (${top.streak} jours consécutifs)` : `${top.streak} jours consécutifs`;
      insight += ` 🏆 Chaîne au sommet : ton habitude « ${top.name} » atteint ${label} aujourd’hui — un vrai palier, l’automatisme s’installe. Savoure et enchaîne le prochain maillon.`;
    }
  }
  if (rotated) insight += ' On varie les angles aujourd’hui.';
  return {
    pillar: chosen.pillar, label: chosen.label, emoji: chosen.emoji, page: chosen.page,
    trend: chosen.trend, tone, recentDays: chosen.recentDays, prevDays: chosen.prevDays,
    lastActiveDays: chosen.lastActiveDays, headline, insight, action, rotated, microStep, followThrough, readiness, readinessDrag, readinessBoost, focusTask, focusBlockMin, focusSlot, sportSlot, sleepConflict, sleepConflictBedtime, reviveStep, comeback, comebackStage, doneToday, alsoSlipping, alsoSlippingPillars, pillarsToday, completeDayStreak, completeDayMilestone, streakAtRisk, streakMilestoneReach, streakRecordReach, streakRebuild, brokenStreak, brokenStreakTier, habitAtRisk, habitMilestone, sportZoneFocus, sportPlateau, sportProgress, sportRecordToday, sportRepRecordToday, weightGoalPct, weightPace, calorieTarget, recompFraming, sleepFatLossGuard, sleepGainGuard, readinessNutriGuard, sleepTrainGuard, hydrationTrainGuard, mobilityTrainGuard, proteinTrainGuard, trainBalanceGuard, pushPullGuard, sportNeglectGuard, runVolumeGuard, sportHabitDay, sleepFocusGuard, bedtimeFocusGuard, bedtimeFocusTrend, hydrationFocusGuard, sessionGoalPace, sessionGoalAhead, sessionGoalBonus, focusGoalPace, focusGoalFresh, focusGoalDrained, focusFreshDriver, focusDrainDriver, focusGoalSteady, focusGoalAhead, focusAheadDriver, focusGoalBonus, focusMarginDrained, restOverGoal, loadSpike, loadOverGoal, loadOverGoalSlide, readinessSlide, readinessRebound, lowLoad, lowLoadUnderGoal, lowLoadUnderGoalRebound, sleepTrend, sleepBedtimeTrend, focusTrend, proteinTrend, hydrationTrend, fruitGuard,
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
  const rawBmi = target / (m * m);                 // IMC réel de la cible (catégorie OMS jugée dessus)
  const targetBmi = Math.round(rawBmi * 10) / 10;  // valeur AFFICHÉE (arrondie)
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

  // 1) La cible elle-même est-elle saine ? (catégorie jugée sur l'IMC RÉEL, pas l'affiché arrondi)
  if (rawBmi < 18.5) {
    notes.push({ tone: 'stop', text: `Cette cible te mettrait en insuffisance pondérale (IMC ${num(targetBmi)}). Vise plutôt ${num(suggested.minKg)} kg minimum, et parles-en à un professionnel de santé avant d’aller plus bas.` });
  } else if (rawBmi < 20) {
    notes.push({ tone: 'warn', text: `Cible très basse (IMC ${num(targetBmi)}) : tenable pour certains athlètes, mais la récupération, le sommeil et la force en pâtissent souvent.` });
  } else if (rawBmi > 27 && !(String(o.fitnessObjective || '') === 'muscle' && direction === 'prise')) {
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
  const mon = w => (w + 6) % 7; // lundi=0 … dimanche=6 : convention semaine de l'app (comme runPlanWeek)
  const uniq = [...new Set((Array.isArray(days) ? days : []).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => mon(a) - mon(b));
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
  const sessions = chosen.map((type, i) => ({ weekday: dayList[i], type, ...META[type] })).sort((a, b) => mon(a.weekday) - mon(b.weekday));
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
  // protéines/eau/sommeil : compter des JOURS DISTINCTS (le libellé dit « j » et le seuil est
  // minProteinDays/minWaterDays), jamais des ENTRÉES — une date en double (import/restauration/legacy,
  // ou double check-in) ne doit pas gonfler le compte. Symétrie avec daysHittingTarget/weeklySleepStats.
  const protDays = proteinDaysOnTarget(arr('nutrition'), protTgt, mondayKey, todayKey);
  const waterDays = daysHittingTarget(arr('nutrition'), 'water', waterGoal, mondayKey, todayKey);
  const sleepByDate = {};
  arr('recovery').forEach(r => {
    if (!r || !inWeek(r.date)) return;
    const v = Number(r.sleep) || 0;
    if (v > 0) sleepByDate[r.date] = v; // une valeur par date (dernier check-in), comme weeklySleepStats
  });
  const sleepVals = Object.values(sleepByDate);
  const sleepAvg = sleepVals.length ? sleepVals.reduce((a, v) => a + v, 0) / sleepVals.length : 0;
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
  // Fenêtre RÉCENTE ancrée par DATE, pas par nombre de pesées : la stagnation se juge sur les
  // ~14 derniers jours quelle que soit la fréquence. Ancrer sur les 4 dernières mesures (slice(-4))
  // rétrécissait la fenêtre à ~3 j pour qui se pèse tous les jours → days ≥ 14 jamais vrai → plateau
  // jamais détecté même après des mois. On prend la pesée la plus récente distante d'au moins 14 j.
  const b = list[list.length - 1];
  const daysTo = w => (Date.parse(b.date + 'T12:00:00') - Date.parse(w.date + 'T12:00:00')) / 864e5;
  let a = null;
  for (let i = list.length - 2; i >= 0; i--) { if (daysTo(list[i]) >= 14) { a = list[i]; break; } }
  if (!a) return { stagnating: false, suggestion: null };
  const days = daysTo(a);
  const ratePerWeek = Math.round(((b.value - a.value) / days * 7) * 100) / 100;
  const delta = 125, d = Math.round(days), FLOOR = 1200;
  const rateTxt = `${ratePerWeek >= 0 ? '+' : ''}${ratePerWeek} kg/sem sur ${d} j`;
  if (goal === 'perte' && ratePerWeek >= -0.1) {
    // La cible ne descend jamais sous le plancher calorique (1200) : la baisse RÉELLE est ce qui
    // reste au-dessus du plancher (0 à 125 kcal), pas toujours 125. Sinon, pour un petit gabarit déjà
    // proche du plancher (cible ~1250), le message annoncerait « −125 kcal » alors que « Nouvelle
    // cible » ne bouge que de 50 → conseil auto-contradictoire. Épuisé le levier calorique → cardio.
    const cut = Math.min(delta, Math.max(0, dt - FLOOR));
    const newTarget = dt - cut;
    const message = cut > 0
      ? `Ton poids stagne (${rateTxt}). Baisse d'environ ${cut} kcal/jour ou ajoute du cardio pour relancer la perte.`
      : `Ton poids stagne (${rateTxt}). Tu es déjà au plancher calorique (~${FLOOR} kcal) — relance par le cardio ou plus d'activité plutôt qu'une nouvelle baisse.`;
    return { stagnating: true, suggestion: 'reduce', delta: cut, newTarget, ratePerWeek, message };
  }
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
  const targetW = Number(goals.targetWeight) || 0;
  // Poids « actuel » = le plus RÉCENT par date, pas le dernier élément du tableau : `weights`
  // n'est pas garanti trié (restauration/import legacy ne repasse pas tous par upsertWeight), et
  // les fonctions sœurs (weightGoalProgress) trient déjà défensivement. Repli chaîne vide pour les
  // entrées legacy sans date → tri stable, ordre du tableau préservé (rétro-compatible).
  const latestWeight = weights
    .filter(w => w && Number(w.value) > 0)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .pop();
  const curW = latestWeight ? Number(latestWeight.value) || 0 : 0;
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
  if (!workout) return 0;
  // Repli legacy mono-exercice `w.exercise` (séances importées/restaurées sans tableau `exercises`) :
  // sinon une vieille séance chiffrée pesait 0 kg, à rebours de lastExerciseSession/exerciseHistoryStats
  // qui en calculent bien le tonnage à partir des mêmes champs (charge/reps/séries).
  const exos = Array.isArray(workout.exercises) && workout.exercises.length
    ? workout.exercises
    : (workout.exercise ? [{ name: workout.exercise, load: workout.load, reps: workout.reps, sets: workout.sets }] : []);
  return exos.reduce((sum, ex) => {
    if (!ex) return sum;
    if (Array.isArray(ex.setLogs) && ex.setLogs.length) {
      const done = ex.setLogs.filter(x => x && x.completed);
      const arr = done.length ? done : ex.setLogs;
      return sum + arr.reduce((s, x) => s + (Number(x && x.load) || 0) * (Number(x && x.reps) || 0), 0);
    }
    return sum + (Number(ex.load) || 0) * (Number(ex.reps) || 0) * (Number(ex.sets) || 0);
  }, 0);
}

// Nombre de séries d'une séance, symétrique de workoutTonnage : séries VALIDÉES quand la séance a des
// setLogs (séance guidée), sinon le champ `sets` (séance saisie au formulaire / legacy mono-exercice
// `w.exercise`, qui n'ont pas de setLogs). Sans ce repli, un bloc saisi à la main pesait un tonnage > 0
// mais 0 série via completedSetCount, à rebours de workoutTonnage — même incohérence que #444 côté sets.
// Le chemin setLogs est INCHANGÉ (mêmes séries que completedSetCount). Pur + testé.
function workoutSetCount(workout) {
  if (!workout) return 0;
  const exos = Array.isArray(workout.exercises) && workout.exercises.length
    ? workout.exercises
    : (workout.exercise ? [{ name: workout.exercise, sets: workout.sets }] : []);
  return exos.reduce((sum, ex) => {
    if (!ex) return sum;
    if (Array.isArray(ex.setLogs) && ex.setLogs.length) {
      return sum + ex.setLogs.filter(x => x && x.completed).length;   // séries validées (identique à completedSetCount)
    }
    return sum + Math.max(0, Math.round(Number(ex.sets) || 0));       // saisie manuelle / legacy : séries prévues
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
    // Record jugé sur le km BRUT, pas sur l'arrondi : deux sorties aux bruts distincts qui tombent
    // dans le même seau d'arrondi (ex. 12,34 vs 12,32 → 12,3) ne sont PAS à égalité, sinon la plus
    // récente vole le record à la plus longue réelle. Jumeau de bestTonnageWeek (#406) : on n'arrondit
    // qu'à l'affichage (longRun.km ci-dessous).
    if (km > 0 && (!longest || km > longest.km)) longest = { km, date: w.date };
  });
  if (!runs) return null;
  const longRun = longest ? { km: Math.round(longest.km * 10) / 10, date: longest.date } : null;
  return { weekKm: Math.round(week * 10) / 10, monthKm: Math.round(month * 10) / 10, runs, longRun };
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
    if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.date || ''))) return;
    // Repli legacy mono-exercice `w.exercise` (séances importées/restaurées sans tableau
    // `exercises`), même idiome que ses sœurs bestE1rmByExercise / estimatedOneRmSeries /
    // personalRecords — sinon un historique legacy chargé n'affichait aucune cible du jour.
    const exos = Array.isArray(w.exercises) && w.exercises.length ? w.exercises
      : (w.exercise ? [{ name: w.exercise, load: w.load, reps: w.reps }] : []);
    exos.forEach(ex => {
      if (!ex || ex.name !== name) return;
      let load = Number(ex.load) || 0, reps = Number(ex.reps) || 0;
      if (Array.isArray(ex.setLogs) && ex.setLogs.length) {
        ex.setLogs.forEach(s => {
          const l = Number(s && s.load) || 0, r = Number(s && s.reps) || 0;
          if (l > load || (l === load && r > reps)) { load = l; reps = r; }
        });
      }
      if (!(load > 0) || !(reps > 0)) return;
      // Date la plus récente = référence de progression ; à date égale, on garde la MEILLEURE
      // série (charge la plus lourde, puis reps), même idiome que les setLogs ci-dessus — sinon
      // un finisher léger logué après la vraie séance lourde du jour écrasait la référence.
      if (!best || w.date > best.date || (w.date === best.date && (load > best.load || (load === best.load && reps > best.reps)))) best = { date: w.date, load, reps };
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
    if (n && isRealDateKey(n.date) && (Number(n.protein) || 0) >= t) hit.add(n.date);
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

// Pente d'ADHÉRENCE à une cible nutrition (protéines, eau…), côté INTRANT — le pendant de
// `focusMinutesTrend` pour un champ du log nutrition. Une SÉRIE dit l'état EN COURS et un compteur
// hebdo l'état PONCTUEL ; aucun ne voit la DIRECTION : la régularité monte-t-elle ou s'effrite-t-elle
// d'une semaine à l'autre ? On compte les jours où la valeur du jour (agrégée au MAX par date, comme
// daysHittingTarget) atteint la cible dans la fenêtre récente (w jours) vs la précédente (les w
// d'avant). Renvoie { recent, prev, delta, dir, days, count } ou null si aucun jour NUTRITION saisi
// dans la fenêtre récente (rien à dire). prev = null si la semaine précédente n'a aucun jour saisi —
// on ne compare pas à un vide (une pente factice « ça s'effondre » née d'un simple non-suivi). delta =
// variation de jours-à-la-cible (signée) ; dir : 'up' | 'down' | 'flat' (seuil ±2 jours) ; count = nb
// de jours nutrition récents saisis. Pur + testé.
function fieldAdherenceTrend(records, field, target, todayKey, windowDays) {
  const t = Math.round(Number(target) || 0);
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!field || !isKey(todayKey) || t <= 0) return null;
  const w = Math.max(2, Math.min(60, Math.round(Number(windowDays) || 7)));
  const byDate = {};
  (Array.isArray(records) ? records : []).forEach(n => {
    if (n && isKey(n.date)) byDate[n.date] = Math.max(byDate[n.date] || 0, Number(n[field]) || 0);
  });
  const pad = n => String(n).padStart(2, '0');
  const shift = n => { const d = new Date(todayKey + 'T12:00:00'); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const loggedIn = (from, to) => Object.keys(byDate).filter(k => k >= from && k <= to);
  const hitIn = (from, to) => loggedIn(from, to).filter(k => byDate[k] >= t).length;
  const recentLogged = loggedIn(shift(w - 1), todayKey);
  if (!recentLogged.length) return null;
  const recent = hitIn(shift(w - 1), todayKey);
  const prevLogged = loggedIn(shift(2 * w - 1), shift(w));
  const prev = prevLogged.length ? hitIn(shift(2 * w - 1), shift(w)) : null;
  const delta = prev == null ? 0 : recent - prev;
  const dir = prev == null ? 'flat' : delta >= 2 ? 'up' : delta <= -2 ? 'down' : 'flat';
  return { recent, prev, delta, dir, days: w, count: recentLogged.length };
}
// Pente d'adhérence PROTÉINES (délègue à fieldAdherenceTrend sur le champ `protein`). Pur + testé.
function proteinAdherenceTrend(nutrition, target, todayKey, windowDays) {
  return fieldAdherenceTrend(nutrition, 'protein', target, todayKey, windowDays);
}
// Pente d'adhérence HYDRATATION (jours à la cible de verres d'eau, champ `water`) — dernier intrant
// nutrition à gagner sa conscience de tendance, même moule que proteinAdherenceTrend. Pur + testé.
function hydrationAdherenceTrend(nutrition, waterGoal, todayKey, windowDays) {
  return fieldAdherenceTrend(nutrition, 'water', waterGoal, todayKey, windowDays);
}

// Score de forme du jour (0-100) à partir d'un check-in {sleep(h), fatigue(1-5), soreness(1-5)}.
// Sommeil pèse 40, fatigue 30, courbatures 30 (1 = mieux). Retourne { score, label } ou null. Pur + testé.
function readinessScore(recovery) {
  const r = recovery && typeof recovery === 'object' ? recovery : null;
  if (!r) return null;
  const fatigue = Math.max(1, Math.min(5, Number(r.fatigue) || 3));
  const soreness = Math.max(1, Math.min(5, Number(r.soreness) || 3));
  const fComp = ((5 - fatigue) / 4) * 30, sComp = ((5 - soreness) / 4) * 30;
  let score;
  if (Number(r.sleep) > 0) {
    const sleep = Math.min(12, Number(r.sleep));
    score = Math.round(Math.min(1, sleep / 8) * 40 + fComp + sComp);
  } else {
    // Sommeil NON renseigné (champ vide → 0) : on ne le compte PAS comme « 0 h » (la pire nuit), sinon
    // un check-in où l'on note sa fatigue sans les heures de sommeil perdait −40 pts à tort. On
    // renormalise fatigue + courbatures (60 pts) sur 100 — même convention que tout le sous-système
    // sommeil, qui exclut déjà sleep:0 comme « nuit non chiffrée ». Une donnée absente ne pénalise plus.
    score = Math.round((fComp + sComp) / 60 * 100);
  }
  const label = score >= 75 ? 'Prêt à pousser' : score >= 50 ? 'Correct — garde une marge' : 'Récupération prioritaire';
  return { score, label };
}

// Facteur DOMINANT qui plombe la readiness du jour — lit les COMPOSANTES du check-in (sommeil,
// fatigue, courbatures) que readinessScore agrège en un seul chiffre. readinessScore dit COMBIEN
// (« 63/100 ») ; il restait muet sur POURQUOI. Or le bon geste diffère selon le frein : des
// courbatures appellent d'épargner les muscles douloureux, une fatigue générale de baisser le
// volume, une nuit courte de recharger le sommeil. On calcule le DÉFICIT de points de chaque
// composante par rapport à son maximum, EXACTEMENT le barème de readinessScore (sommeil /40,
// fatigue /30, courbatures /30), et on renvoie le frein dominant SEULEMENT s'il est net : déficit
// ≥ 15 ET au moins 6 pts au-dessus du second (sinon deux freins se valent → pas de coupable
// unique, on se tait). Le sommeil n'est candidat que s'il est renseigné (sleep > 0) — une nuit non
// chiffrée ne pénalise pas, même convention que readinessScore. Renvoie { factor:
// 'sleep'|'fatigue'|'soreness', deficit, value } (value = niveau 1–5 pour fatigue/courbatures,
// heures pour le sommeil) ou null. Pur + testé.
function readinessLimiter(recovery) {
  const r = recovery && typeof recovery === 'object' ? recovery : null;
  if (!r) return null;
  const fatigue = Math.max(1, Math.min(5, Number(r.fatigue) || 3));
  const soreness = Math.max(1, Math.min(5, Number(r.soreness) || 3));
  const cands = [
    { factor: 'fatigue', deficit: ((fatigue - 1) / 4) * 30, value: fatigue },
    { factor: 'soreness', deficit: ((soreness - 1) / 4) * 30, value: soreness },
  ];
  if (Number(r.sleep) > 0) {
    const sleep = Math.min(12, Number(r.sleep));
    cands.push({ factor: 'sleep', deficit: Math.max(0, 40 - Math.min(1, sleep / 8) * 40), value: Math.round(sleep * 10) / 10 });
  }
  cands.sort((a, b) => b.deficit - a.deficit);
  const top = cands[0], second = cands[1];
  if (top.deficit < 15) return null;
  if (second && top.deficit - second.deficit < 6) return null;
  return { factor: top.factor, deficit: Math.round(top.deficit), value: top.value };
}

// Composante DOMINANTE qui PORTE la readiness du jour — le pendant POSITIF de readinessLimiter (#525).
// readinessLimiter nomme le FREIN quand la forme est basse ; readinessDriver nomme le MOTEUR quand elle
// est haute. On calcule la FRACTION de son maximum atteinte par chaque composante du check-in (sommeil
// min(h/8, 1) ; fatigue (5−n)/4 ; courbatures (5−n)/4 — barème renormalisé de readinessScore, où un
// niveau BAS de fatigue/courbatures = une force), et on renvoie la composante la plus proche de son max
// SEULEMENT si elle domine nettement : frac ≥ 0,75 (vraiment excellente) ET ≥ 0,2 au-dessus de la 2e
// (sinon plusieurs forces se valent → pas de moteur unique, on se tait, comme le limiter à égalité).
// Le sommeil n'est candidat que s'il est renseigné (sleep > 0) — même convention que readinessScore et
// readinessLimiter (une nuit non chiffrée ne « porte » rien). value = niveau 1–5 (fatigue/courbatures)
// ou heures (sommeil). Renvoie { factor: 'sleep'|'fatigue'|'soreness', frac, value } ou null. Pur + testé.
function readinessDriver(recovery) {
  const r = recovery && typeof recovery === 'object' ? recovery : null;
  if (!r) return null;
  const fatigue = Math.max(1, Math.min(5, Number(r.fatigue) || 3));
  const soreness = Math.max(1, Math.min(5, Number(r.soreness) || 3));
  const cands = [
    { factor: 'fatigue', frac: (5 - fatigue) / 4, value: fatigue },
    { factor: 'soreness', frac: (5 - soreness) / 4, value: soreness },
  ];
  if (Number(r.sleep) > 0) {
    const sleep = Math.min(12, Number(r.sleep));
    cands.push({ factor: 'sleep', frac: Math.min(1, sleep / 8), value: Math.round(sleep * 10) / 10 });
  }
  cands.sort((a, b) => b.frac - a.frac);
  const top = cands[0], second = cands[1];
  if (top.frac < 0.75) return null;
  if (second && top.frac - second.frac < 0.2) return null;
  return { factor: top.factor, frac: Math.round(top.frac * 100) / 100, value: top.value };
}

// Tendance de forme : score de readiness des N derniers check-ins (ancien→récent),
// + delta entre le premier et le dernier de la fenêtre. Null si < 2 check-ins. Pur + testé.
function readinessTrend(recoveryList, limit) {
  const lim = Math.max(2, Math.min(30, Math.round(Number(limit) || 8)));
  // Déduplique par date (Map, dernier gagné) — cohérent avec l'écriture (saveRecovery filtre la date
  // avant push) et avec les sœurs (weeklySleepStats/sleepSeries/sleepRegularity/sleepDebtHours, qui
  // agrègent toutes par date). Sans dédup, un doublon de date (import/restauration/legacy) comptait
  // DEUX points pour un même jour : la fenêtre `slice(-lim)` glissait sur des SAISIES au lieu de
  // JOURS, et delta/latest/direction se faussaient (même famille que #436/#437/#438).
  const byDate = new Map();
  (Array.isArray(recoveryList) ? recoveryList : []).forEach(r => {
    if (r && /^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) byDate.set(r.date, r);
  });
  const pts = [...byDate.values()]
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
    // Symétrie avec weeklySleepStats/sleepSeries/sleepRegularity : n'écris que les nuits chiffrées
    // (sleep > 0). Sinon un second check-in de MÊME date sans durée (« coucher seul », sleep:0)
    // écraserait la vraie nuit du matin — possible sur données legacy/import/restauration.
    const v = Number(r.sleep) || 0;
    if (v > 0) byDate[r.date] = v;
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

// Régularité du COUCHER (pas de la durée) : écart-type (min) des heures de coucher ancrées
// (`bedtimeAnchor`) des `limit` dernières nuits renseignées (champ `bedtime`, facultatif) — une par
// date. C'est le signal qui compte vraiment pour un rythme circadien : deux nuits de 7 h peuvent
// cacher un coucher à 22 h un soir et 3 h du matin le lendemain (`sleepRegularity`, basée sur la
// durée, ne verrait rien d'anormal). Pur + testé. Retourne { nights, avgAnchor, avgTime, stdevMin }
// ou null si moins de 3 nuits avec une heure de coucher saisie.
function bedtimeRegularity(recovery, limit) {
  const lim = Math.max(3, Math.round(Number(limit) || 14));
  const byDate = {};
  (Array.isArray(recovery) ? recovery : []).forEach(r => {
    if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) return;
    const a = bedtimeAnchor(r.bedtime);
    if (a != null) byDate[r.date] = a;
  });
  const vals = Object.keys(byDate).sort().slice(-lim).map(d => byDate[d]);
  if (vals.length < 3) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - avg) * (b - avg), 0) / vals.length;
  return { nights: vals.length, avgAnchor: Math.round(avg), avgTime: bedtimeFromAnchor(avg), stdevMin: Math.round(Math.sqrt(variance)) };
}

// Tendance de la RÉGULARITÉ du COUCHER : compare la dispersion (écart-type, en min) des heures de
// coucher de la fenêtre récente (w derniers jours) à celle de la fenêtre précédente (les w jours
// d'avant). `bedtimeRegularity` dit À QUEL POINT le coucher est stable EN CE MOMENT ; ici on regarde si
// cette stabilité se RESSERRE (l'ancre circadienne se pose) ou se DISPERSE (le rythme part). Pendant,
// sur l'axe RÉGULARITÉ, de ce que `sleepDurationTrend` fait sur l'axe DURÉE : deux « ±40 min de
// coucher » n'appellent pas le même mot selon que le nuage se resserre ou s'éparpille. Échelle ANCRÉE
// (minutes depuis midi, `bedtimeAnchor`) pour traverser minuit ; une valeur par date (dernier
// check-in). Renvoie { stdevMin, prevStdevMin, delta, dir, recentNights, prevNights } ou null si moins
// de 3 couchers renseignés dans l'UNE des deux fenêtres. delta = variation d'écart-type (signé, min ;
// négatif = se resserre). dir : 'tightening' | 'dispersing' | 'flat' (seuil ±15 min). Pur + testé.
function bedtimeRegularityTrend(recovery, todayKey, windowDays) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return null;
  const w = Math.max(2, Math.min(60, Math.round(Number(windowDays) || 7)));
  const byDate = {};
  (Array.isArray(recovery) ? recovery : []).forEach(r => {
    if (!r || !isKey(r.date)) return;
    const a = bedtimeAnchor(r.bedtime);
    if (a != null) byDate[r.date] = a;
  });
  const pad = n => String(n).padStart(2, '0');
  const shift = n => { const d = new Date(todayKey + 'T12:00:00'); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const pick = (from, to) => Object.keys(byDate).filter(k => k >= from && k <= to).map(k => byDate[k]);
  const stdev = arr => {
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    const variance = arr.reduce((s, v) => s + (v - avg) * (v - avg), 0) / arr.length;
    return Math.round(Math.sqrt(variance));
  };
  const recent = pick(shift(w - 1), todayKey);
  const prev = pick(shift(2 * w - 1), shift(w));
  if (recent.length < 3 || prev.length < 3) return null;
  const stdevMin = stdev(recent);
  const prevStdevMin = stdev(prev);
  const delta = stdevMin - prevStdevMin;
  const dir = delta <= -15 ? 'tightening' : delta >= 15 ? 'dispersing' : 'flat';
  return { stdevMin, prevStdevMin, delta, dir, recentNights: recent.length, prevNights: prev.length };
}

// Tendance de la DURÉE de sommeil : compare la moyenne des nuits chiffrées de la fenêtre récente
// (w derniers jours) à celle de la fenêtre précédente (les w jours d'avant). Le verdict ponctuel
// `sleepCoachInsight` dit COMMENT tu dors en ce moment (moy. 7 j + dette 14 j + régularité) mais reste
// aveugle à la DIRECTION : deux « moy. 6,5 h » n'appellent pas le même mot selon que les nuits
// REMONTENT (recalage qui paie) ou s'ENFONCENT (dette qui s'installe). Miroir, côté sommeil, de
// `readinessTrend`/`morningEnergyTrend`. Déduplique par date (une nuit par jour, dernier check-in ;
// sleep > 0). Renvoie { avg, prevAvg, delta, dir, days, count } ou null si moins de 2 nuits chiffrées
// dans la fenêtre récente. dir : 'up' | 'down' | 'flat' (seuil ±0,4 h). Pur + testé.
function sleepDurationTrend(recovery, todayKey, windowDays) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return null;
  const w = Math.max(2, Math.min(60, Math.round(Number(windowDays) || 7)));
  const byDate = {};
  (Array.isArray(recovery) ? recovery : []).forEach(r => {
    if (r && isKey(r.date) && Number(r.sleep) > 0) byDate[r.date] = Number(r.sleep);
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
  const dir = prevAvg == null ? 'flat' : delta >= 0.4 ? 'up' : delta <= -0.4 ? 'down' : 'flat';
  return { avg, prevAvg, delta, dir, days: w, count: recent.length };
}

// Pente du VOLUME de FOCUS — le pendant, côté FOCUS, de ce que `sleepDurationTrend` fait pour le
// sommeil et `readinessTrend` pour la forme. Le focus était le seul pilier SANS conscience de tendance :
// le coach y nomme la tâche phare et cale la durée du bloc, mais deux « 3 jours actifs » n'appellent pas
// le même mot selon que les MINUTES de concentration montent ou s'effritent. On somme les minutes de
// focus par jour (plusieurs sessions le même jour se CUMULENT — temps total réel), puis on compare le
// TOTAL de la fenêtre récente (w jours) au total de la précédente (les w jours d'avant). Renvoie
// { recent, prev, delta, dir, days, count } ou null si aucun jour de focus dans la fenêtre récente.
// delta = variation de minutes (signée) ; dir : 'up' | 'down' | 'flat' (seuil ±30 min) ; count = nb de
// jours de focus récents. prev = null s'il n'y a pas de semaine précédente renseignée. Pur + testé.
function focusMinutesTrend(focusSessions, todayKey, windowDays) {
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  if (!isKey(todayKey)) return null;
  const w = Math.max(2, Math.min(60, Math.round(Number(windowDays) || 7)));
  const byDate = {};
  (Array.isArray(focusSessions) ? focusSessions : []).forEach(f => {
    if (f && isKey(f.date) && Number(f.minutes) > 0) byDate[f.date] = (byDate[f.date] || 0) + Math.round(Number(f.minutes));
  });
  const pad = n => String(n).padStart(2, '0');
  const shift = n => { const d = new Date(todayKey + 'T12:00:00'); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const total = (from, to) => Object.keys(byDate).filter(k => k >= from && k <= to).reduce((s, k) => s + byDate[k], 0);
  const recentKeys = Object.keys(byDate).filter(k => k >= shift(w - 1) && k <= todayKey);
  if (!recentKeys.length) return null;
  const recent = total(shift(w - 1), todayKey);
  const prevKeys = Object.keys(byDate).filter(k => k >= shift(2 * w - 1) && k <= shift(w));
  const prev = prevKeys.length ? total(shift(2 * w - 1), shift(w)) : null;
  const delta = prev == null ? 0 : recent - prev;
  const dir = prev == null ? 'flat' : delta >= 30 ? 'up' : delta <= -30 ? 'down' : 'flat';
  return { recent, prev, delta, dir, days: w, count: recentKeys.length };
}

// Bilan sommeil (qualité + régularité) — 1re étape du coach de recalage demandé par Adrien
// (endormissement dérivé vers ~6 h). S'appuie uniquement sur les données déjà saisies (durée de nuit
// au check-in récup) : pas encore d'heure de coucher/lever suivie (viendra dans une étape suivante,
// nécessaire pour un vrai plan de décalage progressif). Combine moyenne 7 j (`weeklySleepStats`),
// dette 14 j (`sleepDebtHours`) et régularité 14 nuits en un seul verdict. La régularité utilise en
// priorité le COUCHER (`bedtimeRegularity`, dès 3 nuits avec heure saisie) — le signal circadien
// pertinent — et ne retombe sur la durée (`sleepRegularity`) que faute d'heures de coucher : une
// durée qui varie peut cacher un coucher parfaitement stable (juste un réveil différent), et
// inversement un coucher qui saute partout peut cacher une durée moyenne stable. Pur + testé.
// Retourne { avg, nights, debt, stdev, bedtimeStdevMin, irregular, tone, verdict } ou null si aucune
// nuit chiffrée sur les 7 derniers jours. tone : 'ok' | 'attention' | 'urgent'.
function sleepCoachInsight(recovery, todayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  const pad = n => String(n).padStart(2, '0');
  const shift = n => { const d = new Date(todayKey + 'T12:00:00'); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const week = weeklySleepStats(recovery, shift(6), todayKey);
  if (!week) return null;
  const debt = sleepDebtHours(recovery, 7.5, shift(13), todayKey);
  const reg = sleepRegularity(recovery, 14);
  const bedReg = bedtimeRegularity(recovery, 14);
  const useBedtime = !!(bedReg && bedReg.nights >= 3);
  const irregular = useBedtime ? bedReg.stdevMin >= 60 : !!(reg && reg.stdev >= 1.5);
  const nightsWord = n => `nuit${n > 1 ? 's' : ''}`;
  let tone, verdict;
  if (week.status === 'court' && irregular) {
    tone = 'urgent';
    verdict = useBedtime
      ? `Sommeil court et coucher irrégulier (moy. ${week.avg} h, coucher variant de ~${bedReg.stdevMin} min d’un soir à l’autre) — avant d’allonger les nuits, stabilise d’abord une heure de coucher fixe.`
      : `Sommeil court et irrégulier (moy. ${week.avg} h, écart ${reg.stdev} h d’une nuit à l’autre) — avant d’allonger les nuits, stabilise d’abord une heure de coucher fixe.`;
  } else if (week.status === 'court') {
    tone = 'attention';
    verdict = `Sommeil court : moy. ${week.avg} h sur ${week.nights} ${nightsWord(week.nights)}, dette de ${debt.debt} h sur 14 j — vise un coucher 30 min plus tôt.`;
  } else if (irregular) {
    tone = 'attention';
    verdict = useBedtime
      ? `Durée correcte (moy. ${week.avg} h) mais coucher irrégulier (variant de ~${bedReg.stdevMin} min d’un soir à l’autre) — se coucher à heure fixe compte autant que le total.`
      : `Durée correcte (moy. ${week.avg} h) mais rythme irrégulier (écart ${reg.stdev} h d’une nuit à l’autre) — se coucher à heure fixe compte autant que le total.`;
  } else {
    tone = 'ok';
    verdict = `Sommeil solide : moy. ${week.avg} h sur ${week.nights} ${nightsWord(week.nights)}, rythme régulier.`;
  }
  return { avg: week.avg, nights: week.nights, debt: debt.debt, stdev: reg ? reg.stdev : null, bedtimeStdevMin: bedReg ? bedReg.stdevMin : null, irregular, tone, verdict };
}

// Le SOMMEIL PROUVE son effet sur le lendemain (moteur de motivation qui légitime le recalage) :
// corrèle l'heure de COUCHER de chaque nuit chiffrée (champ `bedtime`, saisi le matin = coucher de la
// veille au soir) avec les résultats de la journée qui suit (= même date d'entrée) — énergie du matin
// (morningRituals), minutes de focus, séance, candidature. Sépare les nuits en deux paquets par la
// MÉDIANE de tes propres couchers (couché tôt vs tard, adapté à toi, pas une heure fixe arbitraire) et
// compare. Renvoie { nights, split, early, late, deltas, verdict, confidence } ou null si trop peu de
// contraste. `confidence:'low'` si < 4 nuits d'un côté. Pur + testé.
function sleepImpactReport(state, todayKey, opts) {
  const s = state && typeof state === 'object' ? state : {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  const o = opts && typeof opts === 'object' ? opts : {};
  const win = Math.max(7, Math.min(120, Math.round(Number(o.windowDays) || 30)));
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(String(k || ''));
  const startD = new Date(todayKey + 'T12:00:00'); startD.setDate(startD.getDate() - (win - 1));
  const startKey = dateKey(startD);
  // Nuits candidates : sleep > 0 ET une heure de coucher, dédupliquées par date (dernier check-in).
  const nightByDate = {};
  (Array.isArray(s.recovery) ? s.recovery : []).forEach(r => {
    if (!r || !isKey(r.date) || r.date < startKey || r.date > todayKey) return;
    if (!((Number(r.sleep) || 0) > 0)) return;
    const a = bedtimeAnchor(r.bedtime);
    if (a != null) nightByDate[r.date] = a;
  });
  const dates = Object.keys(nightByDate).sort();
  if (dates.length < 4) return null;
  const anchors = dates.map(d => nightByDate[d]).sort((x, y) => x - y);
  const median = anchors.length % 2 ? anchors[(anchors.length - 1) / 2] : Math.round((anchors[anchors.length / 2 - 1] + anchors[anchors.length / 2]) / 2);
  const split = Number.isFinite(o.splitAnchor) ? o.splitAnchor : median;
  // Index des résultats de la journée, par date.
  const energyByDate = {}; (Array.isArray(s.morningRituals) ? s.morningRituals : []).forEach(m => { if (m && isKey(m.date) && Number(m.energy) > 0) energyByDate[m.date] = Number(m.energy); });
  const focusByDate = {}; (Array.isArray(s.focusSessions) ? s.focusSessions : []).forEach(f => { if (f && isKey(f.date)) focusByDate[f.date] = (focusByDate[f.date] || 0) + (Number(f.minutes) || 0); });
  const trainDates = new Set((Array.isArray(s.workouts) ? s.workouts : []).filter(w => w && isKey(w.date)).map(w => w.date));
  const applyDates = new Set((Array.isArray(s.applications) ? s.applications : []).map(normalizeApplication).filter(a => a.status !== 'a_postuler' && isKey(a.date)).map(a => a.date));
  const early = [], late = [];
  dates.forEach(d => { (nightByDate[d] <= split ? early : late).push(d); });
  if (early.length < 2 || late.length < 2) return null; // pas de contraste exploitable
  const agg = ds => {
    const es = ds.filter(d => energyByDate[d] != null).map(d => energyByDate[d]);
    return {
      nights: ds.length,
      energy: es.length ? Math.round(es.reduce((a, b) => a + b, 0) / es.length * 10) / 10 : null,
      focusMin: Math.round(ds.reduce((a, d) => a + (focusByDate[d] || 0), 0) / ds.length),
      trainRate: Math.round(ds.filter(d => trainDates.has(d)).length / ds.length * 100),
      applyRate: Math.round(ds.filter(d => applyDates.has(d)).length / ds.length * 100),
    };
  };
  const E = agg(early), Lt = agg(late);
  const deltas = {
    energy: (E.energy != null && Lt.energy != null) ? Math.round((E.energy - Lt.energy) * 10) / 10 : null,
    focusMin: E.focusMin - Lt.focusMin, trainRate: E.trainRate - Lt.trainRate, applyRate: E.applyRate - Lt.applyRate,
  };
  const splitTime = bedtimeFromAnchor(split);
  let verdict;
  if (deltas.energy != null && Math.abs(deltas.energy) >= 0.3) {
    verdict = deltas.energy > 0
      ? `Les soirs où tu te couches avant ${splitTime}, ton lendemain a plus d'énergie : ${E.energy}/5 contre ${Lt.energy}/5 après un coucher plus tardif. Se coucher tôt paie.`
      : `Curieux : tes couchers plus tardifs ne pèsent pas sur ton énergie du lendemain (${E.energy}/5 vs ${Lt.energy}/5) — regarde plutôt la durée de sommeil.`;
  } else if (Math.abs(deltas.focusMin) >= 10) {
    verdict = deltas.focusMin > 0
      ? `Couché avant ${splitTime}, tu enchaînes ${E.focusMin} min de focus le lendemain — contre ${Lt.focusMin} min après un coucher plus tard.`
      : `Ton focus du lendemain dépend peu de l'heure de coucher (${E.focusMin} vs ${Lt.focusMin} min) — la régularité comptera plus.`;
  } else if (deltas.energy != null) {
    verdict = `L'heure de coucher pèse peu sur ton énergie du lendemain (${E.energy}/5 avant ${splitTime} vs ${Lt.energy}/5) — d'autres facteurs comptent autant.`;
  } else {
    verdict = `Couché avant ${splitTime} : ${E.focusMin} min de focus le lendemain, contre ${Lt.focusMin} min plus tard.`;
  }
  return { nights: dates.length, split: { anchor: split, time: splitTime }, early: E, late: Lt, deltas, verdict, confidence: Math.min(E.nights, Lt.nights) >= 4 ? 'good' : 'low' };
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
  // Objectif atteint dans la marge de tolérance (±15 min du coucher réel, ±5 min du planning idéal
  // sans données). `reached` fait autorité : quand il est vrai, la progression, les pas restants et
  // l'arrivée s'alignent sur « atteint » (sinon on affichait « 🎉 atteint » ET « arrivée dans N jours »
  // avec une barre à 89 % — trois verdicts contradictoires pour un coucher 1-15 min après la cible).
  const reached = (recentAnchor != null && recentAnchor <= targetAnchor + 15) || (recentAnchor == null && targetTodayAnchor <= targetAnchor + 5);
  // Progression : part du chemin déjà parcourue (référence = coucher réel, sinon planification idéale).
  const donePos = recentAnchor != null ? Math.min(startAnchor, recentAnchor) : idealAnchor;
  const progress = reached ? 100 : (totalShift > 0 ? Math.max(0, Math.min(100, Math.round((startAnchor - donePos) / totalShift * 100))) : 100);
  // Estimation d'arrivée basée sur la réalité : pas restants depuis le coucher réel récent.
  const fromAnchor = recentAnchor != null ? recentAnchor : idealAnchor;
  const remaining = reached ? 0 : Math.max(0, fromAnchor - targetAnchor);
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

// Un événement d'agenda correspond-il à une recherche texte (titre / lieu / notes) ?
// Insensible à la casse ET aux accents (« kine » trouve « Kiné »), comme les autres
// recherches libres FR de l'app. Pur + testé.
function agendaMatch(item, query) {
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = norm(query).trim();
  if (!q) return true;
  if (!item) return false;
  const hay = [item.title, item.location, item.notes].map(norm).join(' ');
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

// ── HIÉRARCHISATION DES NOTES DU COACH ────────────────────────────────────────────────────────────
// Les ~89 notes d'`adaptiveCoachFocus` sont concaténées dans l'ORDRE DU CODE, pas dans l'ordre de
// l'urgence. Or les avertissements les plus graves ont été ajoutés en dernier (montée de kilométrage
// ~L6726, pic de charge ~L6167) et les notes les plus anodines en premier (« objectif bouclé, c'est
// du bonus » ~L5164). Résultat : la carte du coach, qui ne montre que le début, pouvait afficher
// « aucune obligation, c'est du rab » en cachant « +50 % de kilométrage, risque de fracture de
// fatigue » derrière « ＋ plus de contexte ». Ce classement remet l'urgent devant.
// Rang BAS = PLUS urgent. On ne réordonne jamais le verdict (1ʳᵉ phrase) : c'est le diagnostic.
const COACH_URGENCY_TIERS = [
  // ⚠️ Rang 0 = la note PORTE sur l'intégrité physique, pas « mentionne le mot blessure ». Un
  // « blessure » nu classait au sommet une note pédagogique sur le sommeil (« … tout en augmentant le
  // risque de blessure »), qui doublait alors le budget de la carte (365 c mesurés). Motifs ancrés.
  { rank: 0, re: /fracture de fatigue|périostite|première cause de blessure|zone de blessure|tendons/i },
  { rank: 1, re: /pic de charge|charge est en pic|tempérer prime|lève le pied|surmenage|zone de blessure/i },
  { rank: 2, re: /dette|pente s’enfonce|sous les 7 h|en moyenne ces derniers jours|se disperse/i }, // sommeil/récup
  { rank: 3, re: /protéines|hydratation|fruits et légumes|calorique|carburant/i },        // intrants
  { rank: 5, re: /bonus|du rab|sans (?:la moindre )?pression|aucune obligation|offert|record|bravo/i }, // anodin
];
const COACH_URGENCY_DEFAULT = 4;
// Rang d'urgence d'une phrase du coach. Le plus urgent gagne si plusieurs motifs matchent.
function coachNoteUrgency(sentence) {
  const s = String(sentence || '');
  // null = aucun palier reconnu → rang par défaut. Il FAUT partir de null (et non du défaut) :
  // sinon le palier « anodin » (rang 5, au-dessus du défaut 4) ne serait jamais retenu et les
  // notes bonus/félicitations ne seraient pas reléguées derrière les notes non classées.
  let best = null;
  for (const t of COACH_URGENCY_TIERS) {
    if (t.re.test(s) && (best === null || t.rank < best)) best = t.rank;
  }
  return best === null ? COACH_URGENCY_DEFAULT : best;
}
// Découpe l'insight en phrases et renvoie l'ordre d'affichage : verdict d'abord (jamais déplacé),
// puis les notes triées par urgence — à rang égal, l'ordre d'origine est conservé (tri stable).
// Découpe en phrases RÉELLES. Une frontière = un ou plusieurs .!? SUIVIS d'un espace ou de la fin —
// un point NON suivi d'espace n'en est pas une. Décisif : l'ancien /[^.!?]+[.!?]+(?:\s+|$)/ coupait
// à CHAQUE point, y compris à l'intérieur d'une décimale « 5.3 », et — pire — le fragment « 5. »
// tombait dans un TROU entre deux captures de match() (le « . » de « 5.3 » n'étant pas suivi d'espace,
// la 2ᵉ capture ne démarrait qu'à « 3 h ») → il était PUREMENT PERDU : « moy. 5.3 h » → « moy. 3 h »,
// « Tu dors 5.3 h » devenait « 3 h » (nombre FAUX + tête de phrase escamotée) dès que l'insight
// dépassait le budget de la carte et passait par orderCoachNotes. Le découpage par frontières
// « terminateur + espace/fin » ne casse jamais une décimale et ne jette aucun caractère. Le reste est
// inchangé : « (moy. 5 h… » ou « ~69 min. d'un soir » ne sont pas des fins de phrase (on refuse une
// coupure quand une parenthèse reste ouverte, ou quand la suite ne commence pas par une majuscule).
function splitCoachSentences(text) {
  const str = String(text || '');
  const raw = [];
  const re = /[.!?]+(?=\s|$)/g;
  let last = 0, m;
  while ((m = re.exec(str))) {
    const end = m.index + m[0].length;
    raw.push(str.slice(last, end));
    last = end;
  }
  if (last < str.length) raw.push(str.slice(last)); // reliquat sans terminateur : jamais jeté
  const out = [];
  for (const part of raw) {
    const prev = out.length ? out[out.length - 1] : null;
    const opened = prev ? (prev.split('(').length - prev.split(')').length) : 0;
    const startsNewSentence = /^[\s]*[«"']?[A-ZÀ-ÖØ-Þ]/.test(part); // vraie phrase = majuscule
    if (prev !== null && (opened > 0 || !startsNewSentence)) out[out.length - 1] = prev + part;
    else out.push(part);
  }
  return out.map(s => s.trim()).filter(Boolean);
}
function orderCoachNotes(insight) {
  const parts = splitCoachSentences(insight);
  if (!parts || parts.length <= 2) return parts;
  const head = parts[0].trim();
  // BLOC SOUDÉ : plusieurs guards tiennent sur DEUX phrases — une prémisse CLASSÉE (ex. sommeil,
  // rang 2 : « … tu dors 5,5 h… risque de blessure. ») suivie d'une conclusion NON classée (rang par
  // défaut : « Bien dormir démultiplie l'effort que tu fournis déjà. »). Trier phrase par phrase
  // séparait les deux : la prémisse remontait, la conclusion tombait ORPHELINE tout en bas, loin de
  // ce qu'elle explique → charabia dès qu'on déplie « plus de contexte ». On fait donc HÉRITER une
  // phrase non classée du rang de la dernière phrase classée qui la précède (le bloc reste soudé) ;
  // le tri stable (a.u puis a.i) préserve l'ordre prémisse→conclusion à l'intérieur du bloc. Une note
  // non classée SANS prémisse classée avant elle (ex. « Objectif hebdo : 2/4 », appendue au cœur
  // AVANT les notes secondaires) garde le rang par défaut — elle n'est jamais tirée vers le haut.
  let blockRank = COACH_URGENCY_DEFAULT;
  const rest = parts.slice(1).map((p, i) => {
    const own = coachNoteUrgency(p);
    if (own !== COACH_URGENCY_DEFAULT) blockRank = own;
    return { text: p.trim(), i, u: own === COACH_URGENCY_DEFAULT ? blockRank : own };
  }).sort((a, b) => (a.u - b.u) || (a.i - b.i));
  return [head, ...rest.map(r => r.text)].filter(Boolean);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { splitCoachSentences, coachNoteUrgency, orderCoachNotes, localDate, nextThemeMode, resolveTheme, dateKey, weekStart, isBoundedDateKey, isRealDateKey, pct, levelFromXp, leveledUp, xpWithinLevel, computeStreak, nextStreakMilestone, dailyGreeting, suggestedQuests, normalizeAgendaItem, duplicateAgendaItem, departureInfo, reminderAnchorMinutes, dayPlannedMinutes, dayPlanText, AGENDA_KINDS, AGENDA_SOURCES, AGENDA_PRIORITIES, priorityRank, normalizeTodo, todosForDay, JOB_STATUSES, JOB_STATUS_LABEL, normalizeApplication, nextAlternanceTarget, compareApplications, alternanceDeadline, applicationStats, parseCsv, parseApplicationsCsv, jobStatusFromText, jobDateFromText, parseAlternanceTargets, parseSheetApplications, normalizeBirthday, birthdaysForDay, upcomingBirthdays, ageLabel, normalizeRecurring, recurrenceMatches, recurringOccurs, RECUR_FREQ, normalizeHabit, applyHabitEdit, habitStreak, habitBestStreak, habitConsistency, habitWeekMap, habitsWeekPulse, habitsForDay, habitsAtRisk, icsEscape, unescapeIcs, buildIcs, buildRRuleLine, parseIcs, parseIcsDateTime, parseRRule, isPrivateHost, normalizeCalendarUrl, isAllowedSheetHost, normalizeSheetCsvUrl, mergeApplications, filterApplications, TRAVEL_HOSTS, isAllowedTravelUrl, buildGeocodeUrl, buildRouteUrl, haversineKm, travelModes, planStudySessions, mergePlannedEvents, mergeRecurring, todayItems, tomorrowPreview, weekItems, glcPlanningToEvents, prescriptionFor, formatFor, mondayOf, weeklyAggregate, weeklySummary, weeklySummaryText, shareableWeek, monthLabelFr, monthlyRecap, monthlyRecapText, shareableMonth, weeklyInsights, RACE_PRESETS, weeksBetween, weeklyWorkoutStreak, dailyStreak, bestDailyStreak, completeDaysStreak, logQuestDay, questPerfectStreak, logLifeStep, lifeStepStats, recentReflectionNotes, recentWins, recentLessons, recentFocusOutcomes, intentionFollowThrough, trainingHeatmap, acuteChronicRatio, racePhase, raceGoalStatus, loadAdvice, daysUntil, normalizeExamGoal, normalizeExamGoals, nearestExam, sortExamGoals, upsertExamGoal, removeExamGoal, examCountdown, examReminderDue, studyPacing, studyStats, studyBySubject, keyDateMarkers, upcomingKeyDates, upcomingPriorityItems, nextTrainingSession, nextStudySession, missedSessions, overdueStudy, RACE_LADDER, intermediateGoals, proteinTarget, PROTEIN_SNACKS, proteinSnackSuggestion, nutritionCsv, hydrationPlan, buildWeekPlan, volumeRamp, warmupFor, cooldownFor, supplementTiming, mealMacro, generateMeals, MEAL_STYLES, buildShoppingList, remainingShopping, SHOPPING_STAPLES, TRAINING_GOALS, EXERCISE_ZONES, exerciseZones, equipmentOptions, activeExerciseFilters, toggleFavorite, weeklyZoneCoverage, weeklySetsPerZone, setLandmark, muscleBalance, pushPullAdvice, zoneFreshness, suggestTrainingFocus, neglectedZoneReport, runPlanWeek, coachSessionLabel, neglectedZone, goalMatch, goalRank, zoneTopExercises, BODY_GOALS, bodyGoalWorkout, pickExercisesForZones, exerciseAvailable, filterByEquipment, EQUIP_LABELS, FITNESS_OBJECTIVES, objectiveProgram, assignProgramDays, objectiveNutrition, onboardingNutritionEstimate, programWeekSummary, macroBreakdown, objectiveProgramText, shareableProgram, onboardingSetup, TRAINING_SLOTS, sessionTimesForSlot, perSessionForLevel, onboardingFirstSession, onboardingCompleteness, sanitizeOnboardingDraft, suggestObjective, STARTER_HABITS, starterHabitFor, objectiveWelcome, starterChecklist, isIosInstallable, installNudge, CHANGELOG, compareVersions, whatsNewSince, MEMBERSHIP_TIERS, membershipInfo, shareAppPayload, LAUNCH_TARGETS, launchTarget, shouldReacquireWakeLock, pendingBadgeCount, VIBRATION_PATTERNS, vibrationPattern, WELLNESS_ROUTINES, wellnessRoutine, suggestedRoutine, surpriseRoutine, WELLNESS_PARCOURS, wellnessParcours, shareableRoutine, routinesByTimeBudget, expressRoutine, workoutDominantZone, contextualWellnessRoutine, logWellnessDone, wellnessStreak, wellnessBestStreak, wellnessCountInWindow, wellnessMinutesForKey, wellnessMinutesInWindow, bestWellnessWeek, shareableWellness, WELLNESS_FAMILIES, wellnessFamilyBreakdown, wellnessGoalProgress, wellnessInactivity, WELLNESS_ZONE_ROUTINES, neglectedMobilityZone, WELLNESS_STREAK_BADGES, WELLNESS_TOTAL_BADGES, wellnessBadges, newWellnessBadge, wellnessWeekHeatmap, wellnessRecurringEvent, blockPhase, progressSets, currentBlock, phaseSetsForDay, archiveBlock, blockHistorySummary, nextBlockAdvice, blockPhaseHeadsUp, blockWindowStats, blockComparison, blocksByObjective, weeklyTonnageTrend, bestSessionTonnage, bestTonnageWeek, trainingConsistency, trainingByWeekday, weekTrainingBalance, bestE1rmByExercise, blockExerciseProgress, blockProgressText, shareableBlockProgress, quickSessionPlan, buildZonePlan, buildTrainingWeek, WEEKDAY_FR, dayColumns, waterStatus, hydrationPace, waterGoalFor, daysHittingTarget, proteinDaysOnTarget, proteinStreak, fieldAdherenceTrend, proteinAdherenceTrend, hydrationAdherenceTrend, basalMetabolicRate, bmiInfo, activityFactor, activityLevelFactor, dateAfterWeeks, paceStatus, energyPlan, weightTargetAdvice, weightMilestones, weightGoalProgress, trackingCadenceAdvice, upsertWeight, upsertMeasurement, backupFilename, unwrapBackup, fitDimensions, dataUrlBytes, timeToMinutes, minutesToTime, scheduleConflicts, nextFreeSlot, pruneProgramSessionsFrom, upcomingSessions, showsEnduranceBase, attentionDigest, adaptiveCoachFocus, coachFollowThrough, describeBackup, backupImportWarnings, formatBytes, storageHealthSummary, calorieAdjustment, weightForecast, coachWeekPlan, mealSplit, nutritionTips, mealIdea, coachPlanText, coachSteps, weeklyAdherence, upsertAdherenceSnapshot, readinessScore, readinessLimiter, readinessDriver, readinessTrend, morningEnergyTrend, morningStreak, sleepDebtHours, weeklySleepStats, sleepSeries, sleepRegularity, bedtimeRegularity, sleepDurationTrend, bedtimeRegularityTrend, focusMinutesTrend, sleepCoachInsight, sleepImpactReport, bedtimeAnchor, bedtimeFromAnchor, recentBedtimeAnchor, dateAfterDays, normalizeSleepPlan, startSleepPlan, sleepPlanDay, sleepEveningTips, sleepPlanAdherence, sleepBedtimeReward, personalRecords, newRecords, weightTrend, measurementDelta, measurementRecentDelta, measurementSeries, photoComparePair, recompositionInsight, computeAchievements, lifetimeStats, lastLoggedSession, workoutsTable, workoutsWithExercise, loggedExerciseNames, exerciseVolumeSeries, estimatedOneRmSeries, strengthPlateau, strengthPlateauAny, strengthForecast, bestStrengthForecast, estimate1RM, formatClock, restBarPct, adjustRestSeconds, loadPercentages, progressionSuggestion, progressionText, strengthRecords, nextStrengthMilestone, exerciseHistoryStats, lastExerciseSession, adjustGuidedSets, liveSetRecord, exerciseAlternatives, splitDuration, combineDuration, guidedSnapshot, guidedSnapshotEquals, resumableGuided, focusTimerStart, focusTimerState, focusTimerPause, focusTimerResume, breakSuggestion, restStart, restState, sessionMinutes, workoutTonnage, workoutSetCount, lifetimeTonnage, completedTonnage, completedSetCount, sessionSummary, runPace, runKmInWindow, weeklyKmRamp, runWeekGoal, FOCUS_WEEK_TARGET_MIN, focusWeekGoal, focusByTask, trailReadiness, agendaMatch };
}
