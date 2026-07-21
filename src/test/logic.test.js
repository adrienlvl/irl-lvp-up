const test = require('node:test');
const assert = require('node:assert');
const L = require('../lib/logic.js');

test('levelFromXp : 100 XP par niveau', () => {
  assert.equal(L.levelFromXp(0), 1);
  assert.equal(L.levelFromXp(99), 1);
  assert.equal(L.levelFromXp(100), 2);
  assert.equal(L.levelFromXp(250), 3);
  assert.equal(L.levelFromXp(undefined), 1);
});

test('leveledUp : nouveau niveau si franchi, sinon null', () => {
  assert.equal(L.leveledUp(90, 110), 2, '90→110 franchit le palier 100');
  assert.equal(L.leveledUp(0, 350), 4, 'plusieurs paliers → dernier niveau');
  assert.equal(L.leveledUp(120, 150), null, 'même niveau → null');
  assert.equal(L.leveledUp(200, 150), null, 'baisse → null');
  assert.equal(L.leveledUp(99, 100), 2);
});

test('xpWithinLevel : reste 0..99', () => {
  assert.equal(L.xpWithinLevel(0), 0);
  assert.equal(L.xpWithinLevel(100), 0);
  assert.equal(L.xpWithinLevel(150), 50);
  assert.equal(L.xpWithinLevel(-10), 90);
});

test('pct : borné à 100, 0 sans objectif', () => {
  assert.equal(L.pct(5, 10), 50);
  assert.equal(L.pct(20, 10), 100);
  assert.equal(L.pct(5, 0), 0);
  assert.equal(L.pct(0, 10), 0);
});

test('computeStreak : fresh / consécutif / trou / même jour', () => {
  assert.equal(L.computeStreak('', '2026-07-05', '2026-07-04', 0), 1);
  assert.equal(L.computeStreak('2026-07-04', '2026-07-05', '2026-07-04', 3), 4);
  assert.equal(L.computeStreak('2026-07-01', '2026-07-05', '2026-07-04', 3), 1);
  assert.equal(L.computeStreak('2026-07-05', '2026-07-05', '2026-07-04', 7), 7);
});

test('weekStart : lundi 00:00', () => {
  const ws = L.weekStart();
  assert.equal(ws.getDay(), 1);
  assert.equal(ws.getHours(), 0);
  assert.equal(ws.getMinutes(), 0);
});

test('localDate / dateKey : format YYYY-MM-DD', () => {
  assert.match(L.localDate(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(L.dateKey(new Date('2026-03-15T12:00:00')), '2026-03-15');
});

test('nextThemeMode / resolveTheme : cycle et résolution système', () => {
  assert.equal(L.nextThemeMode('auto'), 'light');
  assert.equal(L.nextThemeMode('light'), 'dark');
  assert.equal(L.nextThemeMode('dark'), 'time');
  assert.equal(L.nextThemeMode('time'), 'auto', 'le cycle boucle sur auto');
  assert.equal(L.nextThemeMode('inconnu'), 'auto', 'valeur inconnue → repart sur auto');
  assert.equal(L.resolveTheme('light', true), 'light', 'mode explicite ignore le système');
  assert.equal(L.resolveTheme('dark', false), 'dark');
  assert.equal(L.resolveTheme('auto', true), 'dark', 'auto suit le système (sombre)');
  assert.equal(L.resolveTheme('auto', false), 'light', 'auto suit le système (clair)');
  // mode 'time' : clair le jour (7h-18h), sombre la nuit
  assert.equal(L.resolveTheme('time', true, 8), 'light', 'matin → clair');
  assert.equal(L.resolveTheme('time', false, 14), 'light', 'après-midi → clair');
  assert.equal(L.resolveTheme('time', false, 18), 'light', '18h → encore clair');
  assert.equal(L.resolveTheme('time', false, 19), 'dark', '19h → sombre');
  assert.equal(L.resolveTheme('time', false, 23), 'dark', 'nuit → sombre');
  assert.equal(L.resolveTheme('time', false, 6), 'dark', 'avant 7h → sombre');
  assert.equal(L.resolveTheme('time', true), 'dark', 'heure absente → repli système (sombre)');
  assert.equal(L.resolveTheme('time', false), 'light', 'heure absente → repli système (clair)');
});

test('normalizeAgendaItem : défauts pour une entrée legacy minimale', () => {
  const e = L.normalizeAgendaItem({ id: 42, title: 'Muscu', date: '2026-07-06', time: '18:00', kind: 'sport' });
  assert.equal(e.id, 42);
  assert.equal(e.durationMin, 60);
  assert.equal(e.kind, 'sport');
  assert.equal(e.source, 'manual');
  assert.equal(e.completed, false);
});

test('normalizeAgendaItem : kind invalide → life, source déduite de planId', () => {
  const e = L.normalizeAgendaItem({ id: 1, title: 'X', date: '2026-07-06', time: '18:00', kind: 'nawak', planId: 99 });
  assert.equal(e.kind, 'life');
  assert.equal(e.source, 'training');
  assert.equal(e.planId, 99); // champ lié préservé
});

test('normalizeAgendaItem : study/imported acceptés, refId préservé', () => {
  const e = L.normalizeAgendaItem({ id: 2, title: 'Révision compta', date: '2026-07-07', time: '17:30', kind: 'study', source: 'study-glc', refId: 'glc-2026-07-07', durationMin: 45 });
  assert.equal(e.kind, 'study');
  assert.equal(e.source, 'study-glc');
  assert.equal(e.refId, 'glc-2026-07-07');
  assert.equal(e.durationMin, 45);
});

test('normalizeAgendaItem : durationMin bornée [5..600], completed booléen', () => {
  assert.equal(L.normalizeAgendaItem({ id: 3, durationMin: 2 }).durationMin, 5);
  assert.equal(L.normalizeAgendaItem({ id: 4, durationMin: 9999 }).durationMin, 600);
  assert.equal(L.normalizeAgendaItem({ id: 5, completed: 1 }).completed, true);
});

test('normalizeAgendaItem : date/heure mal formées neutralisées (comme normalizeTodo/normalizeRecurring)', () => {
  // Date impossible (ex. issue d'un .ics abîmé via parseIcsDateTime → applyImportedIcs → .map(normalizeAgendaItem))
  assert.equal(L.normalizeAgendaItem({ id: 1, title: 'X', date: '2026-13-99', time: '18:00' }).date, '', 'date hors bornes → vide');
  assert.equal(L.normalizeAgendaItem({ id: 2, title: 'X', date: 'pas une date', time: '18:00' }).date, '', 'date non reconnue → vide');
  // Heure incohérente
  assert.equal(L.normalizeAgendaItem({ id: 3, title: 'X', date: '2026-07-06', time: '99:99' }).time, '', 'heure hors bornes → vide');
  assert.equal(L.normalizeAgendaItem({ id: 4, title: 'X', date: '2026-07-06', time: '9h30' }).time, '', 'heure non HH:MM → vide');
  // Les valeurs valides restent intactes, et l'heure vide (all-day / non horodaté) reste valide
  const ok = L.normalizeAgendaItem({ id: 5, title: 'X', date: '2026-07-06', time: '07:05' });
  assert.equal(ok.date, '2026-07-06');
  assert.equal(ok.time, '07:05');
  assert.equal(L.normalizeAgendaItem({ id: 6, title: 'X', date: '2026-07-06', time: '' }).time, '', 'heure vide (all-day) conservée');
  assert.equal(L.normalizeAgendaItem({ id: 7, title: 'X', date: '2026-07-06', allDay: true }).date, '2026-07-06');
});

test('duplicateAgendaItem : nouvel id, repart à faire, détaché de planId/recId', () => {
  const src = { id: 10, title: 'Muscu', date: '2026-07-10', time: '18:00', kind: 'sport', completed: true, planId: 99, recId: 'r5', notes: 'haut du corps' };
  const copy = L.duplicateAgendaItem(src, 20);
  assert.equal(copy.id, 20);
  assert.equal(copy.completed, false, 'la copie repart à faire');
  assert.equal(copy.planId, undefined, 'détaché du créneau planifié');
  assert.equal(copy.recId, undefined);
  assert.equal(copy.title, 'Muscu');
  assert.equal(copy.date, '2026-07-10', 'même jour par défaut');
  assert.equal(copy.notes, 'haut du corps', 'contenu conservé');
  assert.equal(src.completed, true, 'source non mutée');
  // targetDate déplace la copie
  assert.equal(L.duplicateAgendaItem(src, 21, '2026-07-11').date, '2026-07-11');
  assert.equal(L.duplicateAgendaItem(null, 22), null);
});

test('normalizeAgendaItem : idempotente', () => {
  const once = L.normalizeAgendaItem({ id: 6, title: 'Bloc', date: '2026-07-08', time: '09:00', kind: 'focus' });
  assert.deepEqual(L.normalizeAgendaItem(once), once);
});

test('normalizeAgendaItem : source planner acceptée', () => {
  const e = L.normalizeAgendaItem({ id: 7, title: 'Révision', date: '2026-07-09', time: '17:30', kind: 'study', source: 'planner' });
  assert.equal(e.source, 'planner');
});

test('buildIcs : durée réelle, UID stable, échappement, CRLF', () => {
  const now = new Date('2026-07-06T10:00:00');
  const ics = L.buildIcs([{ id: 42, title: 'Révision; compta, chap.1\nTVA', date: '2026-07-10', time: '17:30', durationMin: 45, kind: 'study' }], now);
  assert.match(ics, /UID:42@irllvpup/);
  assert.match(ics, /DTSTART:20260710T173000/);
  assert.match(ics, /DTEND:20260710T181500/); // 17:30 + 45 min
  assert.match(ics, /SUMMARY:Révision\\; compta\\, chap\.1\\nTVA/);
  assert.match(ics, /CATEGORIES:study/);
  assert.ok(ics.includes('\r\n'), 'lignes CRLF');
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

test('buildIcs : événements invalides ignorés, durée défaut 60', () => {
  const now = new Date('2026-07-06T10:00:00');
  const ics = L.buildIcs([{ id: 1, title: 'Sans heure', date: '2026-07-10' }, { id: 2, title: 'OK', date: '2026-07-10', time: '09:00' }], now);
  assert.ok(!ics.includes('UID:1@'), 'événement sans heure ignoré');
  assert.match(ics, /DTEND:20260710T100000/); // 09:00 + 60 min par défaut
});

test('planStudySessions : lun/mer/ven entre deux dates, modèle study/planner', () => {
  // 2026-07-06 = lundi ; jusqu'au dimanche 2026-07-19 → L/M/V ×2 semaines = 6 créneaux
  const events = L.planStudySessions({ title: 'Révision compta', time: '17:30', durationMin: 45, weekdays: [1, 3, 5], startDate: '2026-07-06', examDate: '2026-07-19', baseId: 1000 });
  assert.equal(events.length, 6);
  assert.equal(events[0].date, '2026-07-06');
  assert.equal(events[0].kind, 'study');
  assert.equal(events[0].source, 'planner');
  assert.equal(events[0].refId, 'planner-2026-07-06-17:30-revision compta');
  assert.equal(new Set(events.map(e => e.id)).size, 6, 'ids uniques');
});

test('planStudySessions : deux matières au même créneau ne se télescopent pas à la fusion', () => {
  // Droit et Compta, même heure (17:30 « collant »), mêmes jours → avant le fix, refId identique
  // (planner-<date>-17:30) → Compta écrasait les séances de Droit à la régénération. La matière est
  // désormais dans le refId : les deux jeux coexistent, sans partager id ni completed.
  const droit = L.planStudySessions({ title: 'Droit', time: '17:30', weekdays: [1], startDate: '2026-07-06', examDate: '2026-07-13', baseId: 100 });
  const compta = L.planStudySessions({ title: 'Compta', time: '17:30', weekdays: [1], startDate: '2026-07-06', examDate: '2026-07-13', baseId: 200 });
  assert.notEqual(droit[0].refId, compta[0].refId, 'refId distincts par matière');
  let agenda = L.mergePlannedEvents([], droit);
  agenda = L.mergePlannedEvents(agenda, compta);
  const study = agenda.filter(e => e.kind === 'study');
  assert.equal(study.length, droit.length + compta.length, 'les deux matières coexistent');
  assert.equal(study.filter(e => e.title === 'Droit').length, droit.length, 'Droit préservé');
  assert.equal(study.filter(e => e.title === 'Compta').length, compta.length, 'Compta ajouté sans écraser Droit');
  // « Droit » et « droit » = même matière (repli casse/accents) → régénération idempotente
  const droitMin = L.planStudySessions({ title: 'droit', time: '17:30', weekdays: [1], startDate: '2026-07-06', examDate: '2026-07-13', baseId: 300 });
  assert.equal(droit[0].refId, droitMin[0].refId, '« Droit » et « droit » régénèrent le même créneau');
});

test('planStudySessions : config invalide → []', () => {
  assert.deepEqual(L.planStudySessions({ weekdays: [], startDate: '2026-07-06', examDate: '2026-07-19' }), []);
  assert.deepEqual(L.planStudySessions({ weekdays: [1], startDate: '2026-07-20', examDate: '2026-07-19' }), []);
  assert.deepEqual(L.planStudySessions(null), []);
});

test('todayItems : filtre par date, trie par heure, classe les types', () => {
  const state = {
    agenda: [
      { id: 1, title: 'Révision compta', date: '2026-07-06', time: '17:30', kind: 'study' },
      { id: 2, title: 'Séance · Musculation', date: '2026-07-06', time: '08:00', kind: 'sport', planId: 90 },
      { id: 3, title: 'Courses', date: '2026-07-06', time: '12:00', kind: 'life', completed: true },
      { id: 4, title: 'Autre jour', date: '2026-07-07', time: '09:00', kind: 'life' }
    ],
    plans: [{ id: 90, date: '2026-07-06', time: '08:00', type: 'Musculation' }]
  };
  const items = L.todayItems(state, '2026-07-06');
  assert.equal(items.length, 3);
  assert.deepEqual(items.map(i => i.id), [2, 3, 1], 'tri chronologique');
  assert.equal(items[0].type, 'plan');
  assert.equal(items[1].type, 'agenda');
  assert.equal(items[1].completed, true);
  assert.equal(items[2].type, 'study');
});

test('tomorrowPreview : résume le lendemain (premier créneau, total, anniv)', () => {
  const state = {
    agenda: [
      { id: 1, title: 'Réunion', date: '2026-07-07', time: '14:00', kind: 'life' },
      { id: 2, title: 'Sport', date: '2026-07-07', time: '09:00', kind: 'sport' },
      { id: 3, title: 'Admin', date: '2026-07-07', allDay: true, kind: 'life' },
      { id: 4, title: 'Aujourd’hui', date: '2026-07-06', time: '10:00', kind: 'life' }
    ],
    birthdays: [{ id: 5, name: 'Léa', day: 7, month: 7, year: 1990 }]
  };
  const p = L.tomorrowPreview(state, '2026-07-06');
  assert.ok(p, 'un aperçu existe');
  assert.equal(p.dateKey, '2026-07-07');
  assert.equal(p.total, 3, '3 blocs à faire (anniversaire exclu du total)');
  assert.equal(p.timedCount, 2);
  assert.equal(p.allDayCount, 1);
  assert.equal(p.birthdays, 1);
  assert.equal(p.first.time, '09:00', 'première chose = le créneau le plus tôt');
  assert.equal(p.first.title, 'Sport');
  // passage de mois : 2026-07-31 → 2026-08-01
  assert.equal(L.tomorrowPreview({ agenda: [{ id: 1, title: 'x', date: '2026-08-01', time: '10:00', kind: 'life' }] }, '2026-07-31').dateKey, '2026-08-01');
  // rien demain → null (pas d'encart inutile)
  assert.equal(L.tomorrowPreview({ agenda: [{ id: 1, title: 'x', date: '2026-07-06', time: '10:00', kind: 'life' }] }, '2026-07-06'), null);
  assert.equal(L.tomorrowPreview({}, '2026-07-06'), null, 'agenda vide → null');
  assert.equal(L.tomorrowPreview({ agenda: [] }, 'bad'), null, 'date invalide → null');
});

test('todayItems : inclut les plans orphelins (sans entrée agenda)', () => {
  const state = { agenda: [], plans: [{ id: 7, date: '2026-07-06', time: '18:00', type: 'Course' }] };
  const items = L.todayItems(state, '2026-07-06');
  assert.equal(items.length, 1);
  assert.equal(items[0].type, 'plan');
  assert.equal(items[0].title, 'Séance · Course');
});

test('todayItems : state vide → []', () => {
  assert.deepEqual(L.todayItems({}, '2026-07-06'), []);
  assert.deepEqual(L.todayItems(null, '2026-07-06'), []);
});

test('normalizeAgendaItem : priorité par défaut normal, valides gardées, invalide → normal', () => {
  assert.equal(L.normalizeAgendaItem({ id: 1, title: 'X' }).priority, 'normal');
  assert.equal(L.normalizeAgendaItem({ id: 2, priority: 'high' }).priority, 'high');
  assert.equal(L.normalizeAgendaItem({ id: 3, priority: 'low' }).priority, 'low');
  assert.equal(L.normalizeAgendaItem({ id: 4, priority: 'urgent' }).priority, 'normal');
});

test('priorityRank : rang aligné sur AGENDA_PRIORITIES (fort → faible)', () => {
  // Le rang EST l'index dans AGENDA_PRIORITIES : plus petit = plus prioritaire au tri.
  assert.equal(L.priorityRank('high'), 0);
  assert.equal(L.priorityRank('normal'), 1);
  assert.equal(L.priorityRank('low'), 2);
  // Ordre strict : high avant normal avant low (croissant = du plus fort au plus faible).
  assert.ok(L.priorityRank('high') < L.priorityRank('normal'));
  assert.ok(L.priorityRank('normal') < L.priorityRank('low'));
  // Cohérence avec la source de vérité exportée.
  L.AGENDA_PRIORITIES.forEach((p, i) => assert.equal(L.priorityRank(p), i));
});

test('priorityRank : priorité inconnue → rang normal (jamais reléguée en bas)', () => {
  // indexOf === -1 → 1, le MÊME rang que 'normal' : une entrée à priorité corrompue
  // se trie comme une normale, pas comme une 'low' rejetée en fin de liste.
  const attendu = L.priorityRank('normal');
  ['urgent', 'HIGH', 'Low', '', 'medium', 'p1'].forEach(p => assert.equal(L.priorityRank(p), attendu));
  // Entrées non-string hostiles : indexOf ne matche pas → même repli sur normal.
  [undefined, null, 0, 3, NaN, {}, [], ['high'], true].forEach(p => assert.equal(L.priorityRank(p), attendu));
});

test('todayItems : à heure égale, haute priorité avant basse', () => {
  const state = { agenda: [
    { id: 1, title: 'Basse', date: '2026-07-06', time: '09:00', kind: 'life', priority: 'low' },
    { id: 2, title: 'Haute', date: '2026-07-06', time: '09:00', kind: 'life', priority: 'high' },
    { id: 3, title: 'Normale', date: '2026-07-06', time: '09:00', kind: 'life' }
  ] };
  const titles = L.todayItems(state, '2026-07-06').map(i => i.title);
  assert.deepEqual(titles, ['Haute', 'Normale', 'Basse']);
});

test('parseIcs : événement horaire local, durée déduite, source/refId imported', () => {
  const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:abc-123\r\nSUMMARY:Réunion projet\r\nDTSTART:20260710T140000\r\nDTEND:20260710T151500\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
  const ev = L.parseIcs(ics, { kind: 'focus', baseId: 1000 });
  assert.equal(ev.length, 1);
  assert.equal(ev[0].title, 'Réunion projet');
  assert.equal(ev[0].date, '2026-07-10');
  assert.equal(ev[0].time, '14:00');
  assert.equal(ev[0].durationMin, 75);
  assert.equal(ev[0].kind, 'focus');
  assert.equal(ev[0].source, 'imported');
  assert.equal(ev[0].refId, 'ics-abc-123');
});

test('parseIcs : journée entière (VALUE=DATE) → time vide, allDay true', () => {
  const ics = 'BEGIN:VEVENT\r\nUID:d1\r\nSUMMARY:Congé\r\nDTSTART;VALUE=DATE:20260712\r\nDTEND;VALUE=DATE:20260713\r\nEND:VEVENT';
  const ev = L.parseIcs(ics);
  assert.equal(ev[0].time, '');
  assert.equal(ev[0].allDay, true);
  assert.equal(ev[0].date, '2026-07-12');
});

test('parseIcs : dépliage des lignes + déséchappement + réimport idempotent', () => {
  // ligne repliée (SUMMARY sur 2 lignes) et virgule échappée
  const ics = 'BEGIN:VEVENT\r\nUID:x9\r\nSUMMARY:Courses\\, pharmacie et\r\n  banque\r\nDTSTART:20260711T100000\r\nEND:VEVENT';
  const ev = L.parseIcs(ics, { baseId: 5 });
  assert.equal(ev[0].title, 'Courses, pharmacie et banque');
  assert.equal(ev[0].durationMin, 60); // pas de DTEND → défaut 60
  // réimport : même refId → mergePlannedEvents ne duplique pas
  const merged = L.mergePlannedEvents(L.mergePlannedEvents([], ev), L.parseIcs(ics, { baseId: 99 }));
  assert.equal(merged.filter(a => a.refId === 'ics-x9').length, 1);
});

test('unescapeIcs : déséchappe \\n \\, \\; \\\\ (cas nominaux)', () => {
  assert.equal(L.unescapeIcs('a\\nb'), 'a\nb'); // \n → saut de ligne
  assert.equal(L.unescapeIcs('a\\Nb'), 'a\nb'); // \N (majuscule) aussi
  assert.equal(L.unescapeIcs('x\\,y'), 'x,y'); // virgule échappée
  assert.equal(L.unescapeIcs('x\\;y'), 'x;y'); // point-virgule échappé
  assert.equal(L.unescapeIcs('x\\\\y'), 'x\\y'); // backslash échappé → un backslash
  assert.equal(L.unescapeIcs(''), '');
  assert.equal(L.unescapeIcs(null), '');
});

test('unescapeIcs : backslash échappé suivi d un « n » littéral → « \\n », pas un saut de ligne', () => {
  // « \\n » = backslash échappé (\\ → \) + « n » littéral. Le résultat correct est
  // les 2 caractères backslash+n, PAS un retour à la ligne (bug d ordre des replace).
  assert.equal(L.unescapeIcs('\\\\n'), '\\n');
  assert.equal([...L.unescapeIcs('\\\\n')].length, 2, 'deux caractères, aucun \\n');
  assert.ok(!L.unescapeIcs('\\\\n').includes('\n'), 'aucun saut de ligne parasite');
  // « \\, » = backslash échappé + virgule littérale → backslash + virgule
  assert.equal(L.unescapeIcs('\\\\,'), '\\,');
});

test('icsEscape : échappe \\ ; , et sauts de ligne, laisse le reste (export .ics)', () => {
  // Chaque caractère spécial iCalendar (RFC 5545, valeurs TEXT) est échappé individuellement.
  assert.equal(L.icsEscape('a\\b'), 'a\\\\b'); // backslash → double backslash
  assert.equal(L.icsEscape('x;y'), 'x\\;y'); // point-virgule
  assert.equal(L.icsEscape('x,y'), 'x\\,y'); // virgule
  assert.equal(L.icsEscape('l1\nl2'), 'l1\\nl2'); // saut de ligne → « \n » (backslash+n)
  assert.equal(L.icsEscape('l1\r\nl2'), 'l1\\nl2'); // CRLF → un seul « \n »
  // Le deux-points N a PAS besoin d échappement en TEXT : une heure « 12:30 » reste intacte.
  assert.equal(L.icsEscape('12:30'), '12:30');
  assert.equal(L.icsEscape(''), '');
  assert.equal(L.icsEscape(null), '');
  assert.equal(L.icsEscape(undefined), '');
});

test('icsEscape : le backslash est échappé EN PREMIER (sinon double échappement)', () => {
  // Entrée « \, » = backslash littéral + virgule. L ordre correct (backslash d abord) donne
  // « \\ » (backslash échappé) + « \, » (virgule échappée) = 4 caractères. Si la virgule était
  // traitée avant, le backslash qu elle ajoute serait re-échappé → 5 caractères, faux.
  assert.equal(L.icsEscape('\\,'), '\\\\\\,');
  assert.equal([...L.icsEscape('\\,')].length, 4, 'exactement 4 caractères, pas de double échappement');
});

test('icsEscape ↔ unescapeIcs : aller-retour fidèle (export puis ré-import)', () => {
  // Invariant du workflow réel d Adrien : exporter l agenda en .ics puis le ré-importer
  // (Google/Apple Calendar) doit préserver le titre exactement. On verrouille le contrat.
  for (const s of [
    'Révision; compta, chap.1\nTVA', // les 4 spéciaux d un coup (comme le test buildIcs)
    'Chemin C:\\next',               // backslash littéral suivi d un « n » (scénario du bug #381)
    'a;b,c\\d\ne',                   // mélange dense
    '\\',                            // backslash seul
    'sans caractère spécial',
  ]) {
    assert.equal(L.unescapeIcs(L.icsEscape(s)), s, `aller-retour: ${JSON.stringify(s)}`);
  }
});

test('parseIcs : SUMMARY avec backslash littéral échappé ne crée pas de saut de ligne', () => {
  const ics = 'BEGIN:VEVENT\r\nUID:bs\r\nSUMMARY:Chemin C:\\\\ndocs\r\nDTSTART:20260711T100000\r\nEND:VEVENT';
  const ev = L.parseIcs(ics, { baseId: 7 });
  assert.equal(ev[0].title, 'Chemin C:\\ndocs'); // backslash + n conservés, pas de \n
  assert.ok(!ev[0].title.includes('\n'));
});

test('parseIcs : entrée vide / sans VEVENT → []', () => {
  assert.deepEqual(L.parseIcs(''), []);
  assert.deepEqual(L.parseIcs('BEGIN:VCALENDAR\r\nEND:VCALENDAR'), []);
});

test('parseIcsDateTime : journée entière (date seule) → allDay, time vide, ms minuit UTC', () => {
  const r = L.parseIcsDateTime('20260716');
  assert.equal(r.allDay, true);
  assert.equal(r.date, '2026-07-16');
  assert.equal(r.time, '');
  assert.equal(r.ms, Date.UTC(2026, 6, 16)); // indépendant du fuseau
});

test('parseIcsDateTime : heure flottante (sans Z) → heure locale telle quelle, secondes optionnelles', () => {
  const r = L.parseIcsDateTime('20260716T093000');
  assert.equal(r.allDay, false);
  assert.equal(r.date, '2026-07-16'); // pas de conversion : mur-de-l-horloge conservé
  assert.equal(r.time, '09:30');
  assert.equal(r.ms, Date.UTC(2026, 6, 16, 9, 30, 0)); // sortable, indépendant du fuseau du test
  assert.deepEqual(L.parseIcsDateTime('20260716T0930'), r); // secondes facultatives dans le motif
});

test('parseIcsDateTime : instant UTC (suffixe Z) → date/heure LOCALES, ms = vrai instant', () => {
  const r = L.parseIcsDateTime('20260716T120000Z');
  assert.equal(r.allDay, false);
  assert.equal(r.ms, Date.UTC(2026, 6, 16, 12, 0, 0)); // instant exact, indépendant du fuseau
  // date/heure affichées = fuseau local de la machine → on dérive l attendu du meme instant (test portable)
  const local = new Date(r.ms), pad = n => String(n).padStart(2, '0');
  assert.equal(r.date, `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`);
  assert.equal(r.time, `${pad(local.getHours())}:${pad(local.getMinutes())}`);
});

test('parseIcsDateTime : entrée invalide / vide / null → null, espaces tolérés', () => {
  assert.equal(L.parseIcsDateTime('garbage'), null);
  assert.equal(L.parseIcsDateTime(''), null);
  assert.equal(L.parseIcsDateTime(null), null);
  assert.equal(L.parseIcsDateTime('2026-07-16'), null); // format iCal compact : les tirets ne matchent pas
  assert.deepEqual(L.parseIcsDateTime('  20260716T093000  '), L.parseIcsDateTime('20260716T093000')); // trim
});

test('parseIcsDateTime : date/heure calendairement impossible (.ics abîmé) → null, pas de rollover', () => {
  // Le motif \d{2} tolère mois/jour hors bornes et jours qui débordent le mois : tous rejetés.
  assert.equal(L.parseIcsDateTime('20261399'), null);          // mois 13, jour 99
  assert.equal(L.parseIcsDateTime('20260230'), null);          // 30 février n'existe pas
  assert.equal(L.parseIcsDateTime('20261131'), null);          // novembre a 30 jours
  assert.equal(L.parseIcsDateTime('20250229'), null);          // 2025 non bissextile
  assert.equal(L.parseIcsDateTime('20260101T256099'), null);   // heure 25:60 hors bornes
  assert.equal(L.parseIcsDateTime('20260230T120000Z'), null);  // branche Z : plus de rollover vers le 2 mars
  // Gardes positives : une vraie date/heure reste lue à l'identique.
  assert.equal(L.parseIcsDateTime('20240229').date, '2024-02-29'); // 2024 bissextile
  assert.equal(L.parseIcsDateTime('20261231T235900').time, '23:59'); // bornes hautes valides
});

test('parseIcs : un VEVENT à date impossible est ignoré (aucun événement fantôme)', () => {
  const ics = 'BEGIN:VEVENT\r\nUID:bad\r\nSUMMARY:Date abimee\r\nDTSTART:20260230\r\nEND:VEVENT';
  assert.deepEqual(L.parseIcs(ics), []);
  // Un DTEND impossible ne casse pas un DTSTART valide : durée par défaut (60 min).
  const ics2 = 'BEGIN:VEVENT\r\nUID:e1\r\nSUMMARY:Fin abimee\r\nDTSTART:20260716T090000\r\nDTEND:20260230T100000\r\nEND:VEVENT';
  const ev = L.parseIcs(ics2, { baseId: 1 })[0];
  assert.equal(ev.date, '2026-07-16');
  assert.equal(ev.durationMin, 60);
});

test('buildRRuleLine : règle interne → RRULE iCalendar ; invalide → \'\'', () => {
  assert.equal(
    L.buildRRuleLine({ freq: 'weekly', interval: 2, weekdays: [1, 3], startDate: '2026-07-06', until: '2026-12-31' }),
    'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20261231T235959Z'
  );
  assert.equal(L.buildRRuleLine({ freq: 'daily', interval: 1, startDate: '2026-07-01' }), 'RRULE:FREQ=DAILY');
  assert.equal(L.buildRRuleLine({ freq: 'nawak', startDate: '2026-07-01' }), '');
  assert.equal(L.buildRRuleLine(null), '');
  // aller-retour : la RRULE émise se re-parse en règle équivalente
  const rule = { freq: 'weekly', interval: 2, weekdays: [1, 3], startDate: '2026-07-06', until: '2026-12-31' };
  assert.deepEqual(L.parseRRule(L.buildRRuleLine(rule).replace('RRULE:', ''), '2026-07-06'), rule);
});

test('buildIcs : événement récurrent → DTSTART de série + ligne RRULE ; ponctuels inchangés', () => {
  const now = new Date('2026-07-08T10:00:00');
  const rec = { id: 7, title: 'Réunion hebdo', time: '09:00', durationMin: 30, kind: 'focus', rule: { freq: 'weekly', interval: 1, weekdays: [2], startDate: '2026-07-07' } };
  const ics = L.buildIcs([rec, { id: 8, title: 'Ponctuel', date: '2026-07-10', time: '14:00' }], now);
  assert.match(ics, /DTSTART:20260707T090000/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=TU/);
  assert.match(ics, /SUMMARY:Réunion hebdo/);
  assert.match(ics, /SUMMARY:Ponctuel/);
  // récurrent sans heure → journée entière
  const allday = L.buildIcs([{ id: 9, title: 'Rituel', rule: { freq: 'daily', interval: 1, startDate: '2026-07-01' } }], now);
  assert.match(allday, /DTSTART;VALUE=DATE:20260701/);
  // ponctuel sans heure : toujours ignoré (comportement historique)
  assert.ok(!L.buildIcs([{ id: 10, title: 'Sans heure', date: '2026-07-10' }], now).includes('Sans heure'));
});

test('isPrivateHost : loopback/privés/lien-local refusés, hôtes publics acceptés', () => {
  ['localhost', '127.0.0.1', '10.1.2.3', '192.168.0.1', '169.254.1.1', '172.16.0.1', '172.31.255.255', '0.0.0.0', 'nas.local', '::1', 'fe80::1'].forEach(h => assert.equal(L.isPrivateHost(h), true, h + ' privé'));
  ['calendar.google.com', 'p28-caldav.icloud.com', 'outlook.office365.com', '172.32.0.1', '8.8.8.8'].forEach(h => assert.equal(L.isPrivateHost(h), false, h + ' public'));
});

test('normalizeCalendarUrl : https only, webcal→https, hôtes publics, sinon \'\'', () => {
  assert.equal(L.normalizeCalendarUrl('https://calendar.google.com/ical/x/basic.ics'), 'https://calendar.google.com/ical/x/basic.ics');
  assert.equal(L.normalizeCalendarUrl('webcal://p1.icloud.com/published/cal.ics'), 'https://p1.icloud.com/published/cal.ics');
  assert.equal(L.normalizeCalendarUrl('calendar.google.com/x.ics'), 'https://calendar.google.com/x.ics', 'schéma manquant → https');
  assert.equal(L.normalizeCalendarUrl('http://example.com/x.ics'), '', 'http refusé');
  assert.equal(L.normalizeCalendarUrl('ftp://example.com/x.ics'), '', 'ftp refusé');
  assert.equal(L.normalizeCalendarUrl('https://localhost/x.ics'), '', 'hôte local refusé');
  assert.equal(L.normalizeCalendarUrl('https://192.168.1.5/x.ics'), '', 'hôte privé refusé');
  assert.equal(L.normalizeCalendarUrl(''), '');
  assert.equal(L.normalizeCalendarUrl('   '), '');
});

test('parseRRule : FREQ/INTERVAL/BYDAY/UNTIL → règle interne ; non géré → null', () => {
  assert.deepEqual(
    L.parseRRule('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20261231T000000Z', '2026-07-06'),
    { freq: 'weekly', interval: 2, weekdays: [1, 3], startDate: '2026-07-06', until: '2026-12-31' }
  );
  assert.deepEqual(
    L.parseRRule('FREQ=DAILY', '2026-07-01'),
    { freq: 'daily', interval: 1, weekdays: [], startDate: '2026-07-01', until: '' }
  );
  assert.equal(L.parseRRule('FREQ=HOURLY', '2026-07-01'), null, 'fréquence non gérée');
  assert.equal(L.parseRRule('FREQ=DAILY', 'nope'), null, 'date de début invalide');
});

test('parseRRule : COUNT (série finie) → borne UNTIL = date de la N-ième occurrence, pas d\'infini', () => {
  // COUNT converti en UNTIL = date de la N-ième occurrence (simulation via recurrenceMatches).
  const u = (r, s) => L.parseRRule(r, s).until;
  assert.equal(u('FREQ=DAILY;COUNT=3', '2026-07-01'), '2026-07-03', 'daily : 01,02,03');
  assert.equal(u('FREQ=DAILY;INTERVAL=2;COUNT=3', '2026-07-01'), '2026-07-05', 'daily x2 : 01,03,05');
  assert.equal(u('FREQ=DAILY;COUNT=1', '2026-07-01'), '2026-07-01', 'COUNT=1 → seul le début');
  assert.equal(u('FREQ=WEEKLY;COUNT=4;BYDAY=MO', '2026-07-06'), '2026-07-27', 'weekly : 4 lundis');
  assert.equal(u('FREQ=WEEKLY;COUNT=3', '2026-07-06'), '2026-07-20', 'weekly sans BYDAY : jour du début');
  assert.equal(u('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=4', '2026-07-06'), '2026-07-22', 'bihebdo MO,WE : 4e = mer. sem. 2');
  assert.equal(u('FREQ=MONTHLY;COUNT=3', '2026-01-15'), '2026-03-15', 'monthly : 3 mois');
  // Mois sans le 31 sautés (cohérent avec recurrenceMatches) : jan, mars, mai.
  assert.equal(u('FREQ=MONTHLY;COUNT=3', '2026-01-31'), '2026-05-31', 'monthly jour 31 : jan/mars/mai');
  assert.equal(u('FREQ=YEARLY;COUNT=2', '2026-03-20'), '2027-03-20', 'yearly : 2 ans');
  // UNTIL explicite l'emporte (RFC : COUNT et UNTIL exclusifs) ; COUNT absent/≤0 → pas de borne.
  assert.equal(u('FREQ=DAILY;COUNT=3;UNTIL=20261231T000000Z', '2026-07-01'), '2026-12-31', 'UNTIL prime');
  assert.equal(u('FREQ=DAILY;COUNT=0', '2026-07-01'), '', 'COUNT=0 ignoré');
  assert.equal(u('FREQ=DAILY', '2026-07-01'), '', 'sans COUNT → infini (inchangé)');
  // Bout-en-bout : la série s'arrête à la N-ième occurrence, plus d'occurrence au-delà.
  const r = L.parseRRule('FREQ=WEEKLY;COUNT=4;BYDAY=MO', '2026-07-06');
  assert.equal(L.recurrenceMatches(r, '2026-07-27'), true, '4e lundi dans la borne');
  assert.equal(L.recurrenceMatches(r, '2026-08-03'), false, '5e lundi exclu');
  assert.equal(L.recurrenceMatches(r, '2030-01-07'), false, 'plus rien des années après');
});

test('parseIcs : événement récurrent (RRULE) → champ recurrence exploitable par le moteur', () => {
  const ics = 'BEGIN:VEVENT\r\nUID:r1\r\nSUMMARY:Standup\r\nDTSTART:20260706T090000\r\nRRULE:FREQ=WEEKLY;BYDAY=MO\r\nEND:VEVENT';
  const ev = L.parseIcs(ics)[0];
  assert.equal(ev.recurrence.freq, 'weekly');
  assert.deepEqual(ev.recurrence.weekdays, [1]);
  assert.equal(ev.recurrence.startDate, '2026-07-06');
  // la règle produite est directement consommable par recurrenceMatches
  assert.equal(L.recurrenceMatches(ev.recurrence, '2026-07-13'), true, 'lundi suivant');
  assert.equal(L.recurrenceMatches(ev.recurrence, '2026-07-14'), false, 'mardi');
  // un événement sans RRULE a recurrence null
  const single = L.parseIcs('BEGIN:VEVENT\r\nUID:s1\r\nSUMMARY:Ponctuel\r\nDTSTART:20260710T100000\r\nEND:VEVENT')[0];
  assert.equal(single.recurrence, null);
});

test('todayItems : allDay exposé (booléen) pour l’affichage « Journée »', () => {
  const state = { agenda: [
    { id: 1, title: 'Congé', date: '2026-07-06', time: '', kind: 'life', allDay: true },
    { id: 2, title: 'Réu', date: '2026-07-06', time: '10:00', kind: 'focus' }
  ] };
  const items = L.todayItems(state, '2026-07-06');
  assert.equal(items.find(i => i.id === 1).allDay, true);
  assert.equal(items.find(i => i.id === 2).allDay, false);
});

test('normalizeAgendaItem : allDay normalisé en booléen', () => {
  assert.equal(L.normalizeAgendaItem({ id: 1, allDay: 1 }).allDay, true);
  assert.equal(L.normalizeAgendaItem({ id: 2 }).allDay, false);
});

test('normalizeAgendaItem : lieu, notes (bornés) et trajet', () => {
  const e = L.normalizeAgendaItem({ id: 1, location: 'GRETA Rennes', notes: 'apporter dossier', travelMin: 25 });
  assert.equal(e.location, 'GRETA Rennes');
  assert.equal(e.notes, 'apporter dossier');
  assert.equal(e.travelMin, 25);
  assert.equal(L.normalizeAgendaItem({ id: 2, travelMin: -5 }).travelMin, 0);
  assert.equal(L.normalizeAgendaItem({ id: 3, notes: 'x'.repeat(700) }).notes.length, 500);
  assert.equal(L.normalizeAgendaItem({ id: 4 }).location, '');
});

test('departureInfo : heure de départ = heure − trajet, temps restant selon l’heure actuelle', () => {
  const evt = { time: '09:00', travelMin: 25 };
  assert.equal(L.departureInfo(evt).departAt, '08:35');
  assert.equal(L.departureInfo(evt).travelMin, 25);
  // à 08:00, il reste 35 min avant de partir ; à 08:50, on est en retard
  const at8 = L.departureInfo(evt, new Date(2026, 6, 8, 8, 0));
  assert.equal(at8.leaveInMin, 35); assert.equal(at8.late, false);
  const at850 = L.departureInfo(evt, new Date(2026, 6, 8, 8, 50));
  assert.equal(at850.leaveInMin, -15); assert.equal(at850.late, true);
  // pas d'heure ou pas de trajet → null
  assert.equal(L.departureInfo({ time: '', travelMin: 25 }), null);
  assert.equal(L.departureInfo({ time: '09:00', travelMin: 0 }), null);
});

test('dayPlanText : lignes heure + titre, ✓ si fait, hors anniversaires', () => {
  const items = [
    { time: '09:00', title: 'Réunion', completed: true },
    { allDay: true, title: 'Congé' },
    { time: '', title: 'Appeler dentiste' },
    { type: 'birthday', title: '🎂 Maman' },
  ];
  assert.equal(L.dayPlanText(items), '- 09:00 Réunion ✓\n- Journée Congé\n- — Appeler dentiste');
  assert.equal(L.dayPlanText([]), '');
  assert.equal(L.dayPlanText('x'), '');
});

test('dayPlannedMinutes : somme des durées des créneaux horodatés', () => {
  const items = [
    { time: '09:00', durationMin: 60 },
    { time: '14:00', durationMin: 90 },
    { time: '', durationMin: 30 },           // pas d'heure → ignoré
    { time: '18:00', allDay: true, durationMin: 45 }, // journée entière → ignoré
    { time: '20:00', type: 'birthday' },     // anniversaire → ignoré
    { time: '21:00' },                        // sans durée → 60 par défaut
  ];
  assert.equal(L.dayPlannedMinutes(items), 60 + 90 + 60);
  assert.equal(L.dayPlannedMinutes([]), 0);
  assert.equal(L.dayPlannedMinutes('nope'), 0);
});

test('reminderAnchorMinutes : ancre = départ si trajet, sinon heure de l’événement', () => {
  assert.equal(L.reminderAnchorMinutes({ time: '09:00', travelMin: 25 }), 8 * 60 + 35, 'trajet → 08:35');
  assert.equal(L.reminderAnchorMinutes({ time: '18:30' }), 18 * 60 + 30, 'sans trajet → 18:30');
  assert.equal(L.reminderAnchorMinutes({ time: '18:30', travelMin: 0 }), 18 * 60 + 30);
  assert.equal(L.reminderAnchorMinutes({ time: '00:10', travelMin: 30 }), 0, 'borné au même jour (pas de veille)');
  assert.equal(L.reminderAnchorMinutes({ time: 'pas-une-heure' }), null);
  assert.equal(L.reminderAnchorMinutes(null), null);
});

test('normalizeTodo : défauts, texte borné, priorité validée', () => {
  const t = L.normalizeTodo({ id: 5, text: 'Appeler le garage', date: '2026-07-07', priority: 'high' });
  assert.equal(t.text, 'Appeler le garage');
  assert.equal(t.priority, 'high');
  assert.equal(t.done, false);
  assert.equal(L.normalizeTodo({ id: 6, priority: 'nawak' }).priority, 'normal');
  assert.equal(L.normalizeTodo({ id: 7, date: 'pas-une-date' }).date, '');
  assert.equal(L.normalizeTodo({ id: 8, text: 'x'.repeat(300) }).text.length, 200);
  // Date format-valide mais IMPOSSIBLE (backup abîmé / édité à la main) → neutralisée, sinon la
  // tâche est orpheline dans todosForDay (t.date > tout jour réel → jamais active ni « faite »).
  assert.equal(L.normalizeTodo({ id: 9, text: 'x', date: '2026-13-99' }).date, '', 'date impossible → vide');
  assert.equal(L.normalizeTodo({ id: 10, text: 'x', date: '2026-00-10' }).date, '', 'mois 00 → vide');
  assert.equal(L.normalizeTodo({ id: 11, text: 'x', done: true, doneAt: '2026-13-99' }).doneAt, null, 'doneAt impossible → null');
});

test('isBoundedDateKey : accepte une date réelle, rejette format-valide mais impossible', () => {
  assert.equal(L.isBoundedDateKey('2026-07-17'), true);
  assert.equal(L.isBoundedDateKey('2024-02-29'), true, 'bornes larges mois 1-12 / jour 1-31 (comme jobDateFromText)');
  assert.equal(L.isBoundedDateKey('2026-13-99'), false, 'mois 13 / jour 99');
  assert.equal(L.isBoundedDateKey('2026-00-10'), false, 'mois 00');
  assert.equal(L.isBoundedDateKey('2026-07-00'), false, 'jour 00');
  assert.equal(L.isBoundedDateKey('pas-une-date'), false);
  assert.equal(L.isBoundedDateKey(''), false);
  assert.equal(L.isBoundedDateKey(20260717), false, 'non-string → false');
  assert.equal(L.isBoundedDateKey(null), false);
});

test('isRealDateKey : exige une date calendaire réelle (round-trip), rejette les jours impossibles', () => {
  assert.equal(L.isRealDateKey('2026-07-17'), true);
  assert.equal(L.isRealDateKey('2024-02-29'), true, '29 févr. valide en année bissextile');
  assert.equal(L.isRealDateKey('2026-02-29'), false, '29 févr. impossible hors bissextile');
  assert.equal(L.isRealDateKey('2026-02-30'), false, 'févr. n’a pas 30 jours');
  assert.equal(L.isRealDateKey('2026-04-31'), false, 'avril n’a pas 31 jours');
  assert.equal(L.isRealDateKey('2026-06-31'), false, 'juin n’a pas 31 jours');
  assert.equal(L.isRealDateKey('2026-12-31'), true, 'déc. a bien 31 jours');
  assert.equal(L.isRealDateKey('2026-13-01'), false, 'mois 13');
  assert.equal(L.isRealDateKey('2026-00-10'), false, 'mois 00');
  assert.equal(L.isRealDateKey('2026-07-00'), false, 'jour 00');
  assert.equal(L.isRealDateKey('pas-une-date'), false);
  assert.equal(L.isRealDateKey(20260717), false, 'non-string → false');
  assert.equal(L.isRealDateKey(null), false);
  // plus strict que isBoundedDateKey (qui borne seulement mois≤12 / jour≤31)
  assert.equal(L.isBoundedDateKey('2026-04-31'), true, 'témoin : isBoundedDateKey laisse passer 31 avr.');
});

test('todosForDay : actives (jour + en retard) triées, faites du jour séparées', () => {
  const todos = [
    { id: 1, text: 'Retard normal', date: '2026-07-05', priority: 'normal' },
    { id: 2, text: 'Aujourd’hui haute', date: '2026-07-07', priority: 'high' },
    { id: 3, text: 'Aujourd’hui basse', date: '2026-07-07', priority: 'low' },
    { id: 4, text: 'Faite aujourd’hui', date: '2026-07-07', done: true, doneAt: '2026-07-07' },
    { id: 5, text: 'Future', date: '2026-07-20' }
  ];
  const { active, done, remaining, overdue } = L.todosForDay(todos, '2026-07-07');
  assert.deepEqual(active.map(t => t.id), [1, 2, 3], 'en retard d’abord, puis haute, puis basse ; future exclue');
  assert.equal(active[0].overdue, true);
  assert.equal(remaining, 3);
  assert.equal(overdue, 1);
  assert.deepEqual(done.map(t => t.id), [4]);
});

test('normalizeApplication : coercion + statut par défaut', () => {
  const a = L.normalizeApplication({ id: 1, company: 'Acme SARL', role: 'Compta', status: 'postule', date: '2026-07-16', source: 'LinkedIn' });
  assert.equal(a.company, 'Acme SARL'); assert.equal(a.status, 'postule'); assert.equal(a.date, '2026-07-16'); assert.equal(a.source, 'LinkedIn');
  assert.equal(L.normalizeApplication({ status: 'zzz' }).status, 'a_postuler', 'statut inconnu → à postuler');
  assert.equal(L.normalizeApplication({ date: 'pas-une-date' }).date, '', 'date invalide → vide');
  assert.equal(L.normalizeApplication(null).company, '');
});

test('alternanceDeadline : cap sur la rentrée (1er octobre), pas le 1er août', () => {
  // Avant la rentrée : compte à rebours normal (l'été ne fait plus s'effondrer le compteur).
  assert.deepEqual(L.alternanceDeadline('2026-07-16'), { date: '2026-10-01', daysLeft: 77, phase: 'before' });
  // Le 1er août n'est plus une bascule : c'est un jour normal du compte à rebours vers octobre.
  assert.equal(L.alternanceDeadline('2026-08-01').phase, 'before');
  assert.ok(L.alternanceDeadline('2026-08-01').daysLeft > 0, 'plus d’effondrement à J-365 le 1er août');
  // Rentrée passée mais saison encore ouverte (avant le 1er déc.) → « dernière ligne droite », daysLeft <= 0.
  const crunch = L.alternanceDeadline('2026-10-15');
  assert.equal(crunch.phase, 'crunch'); assert.ok(crunch.daysLeft <= 0);
  // Saison finie (après le 1er déc.) → cap de l'an prochain.
  assert.equal(L.alternanceDeadline('2026-12-05').date, '2027-10-01');
  assert.equal(L.alternanceDeadline('2026-12-05').phase, 'before');
  assert.equal(L.alternanceDeadline('bad'), null);
});

test('applicationStats : moteur de motivation (aujourd’hui, semaine, série, relances)', () => {
  const today = '2026-07-16'; // jeudi → lundi = 13/07
  const apps = [
    { id: 1, company: 'A', status: 'postule', date: '2026-07-16' },
    { id: 2, company: 'B', status: 'postule', date: '2026-07-15' },
    { id: 3, company: 'C', status: 'postule', date: '2026-07-14' },
    { id: 4, company: 'D', status: 'entretien', date: '2026-07-01' },
    { id: 5, company: 'E', status: 'postule', date: '2026-07-05' }, // relance : postulé il y a >7 j
    { id: 6, company: 'F', status: 'a_postuler', date: '' }          // pas encore envoyée
  ];
  const s = L.applicationStats(apps, today, { weekGoal: 5, relanceDays: 7 });
  assert.equal(s.total, 6);
  assert.equal(s.sent, 5, '5 candidatures envoyées (avec date)');
  assert.equal(s.appliedToday, true);
  assert.equal(s.streak, 3, '14, 15, 16 juillet d’affilée');
  assert.equal(s.weekCount, 3, 'A, B, C dans la semaine (lun 13/07 →)');
  assert.equal(s.weekGoal, 5); assert.equal(s.weekReached, false);
  assert.equal(s.entretiens, 1);
  assert.equal(s.responseRate, 20, '1 réponse (entretien) sur 5 envoyées');
  assert.deepEqual(s.pendingRelances.map(r => r.company), ['E']);
  // tolérance : postulé hier mais rien aujourd'hui → série tient
  assert.equal(L.applicationStats([{ id: 1, status: 'postule', date: '2026-07-15' }], '2026-07-16', {}).streak, 1);
  // « à postuler » AVEC une date (deadline/repérage, produit par l'import CSV) ne compte PAS comme envoyée :
  // ne gonfle ni le total envoyé, ni aujourd'hui, ni la semaine, ni la série.
  const notSent = L.applicationStats([{ id: 1, company: 'Cible', status: 'a_postuler', date: '2026-07-16' }], '2026-07-16', {});
  assert.equal(notSent.sent, 0, 'à postuler datée → 0 envoyée');
  assert.equal(notSent.appliedToday, false, 'à postuler datée aujourd’hui → pas « postulé aujourd’hui »');
  assert.equal(notSent.weekCount, 0, 'à postuler datée → hors compteur hebdo');
  assert.equal(notSent.streak, 0, 'à postuler datée → aucune série');
  // mixte : seules les vraies candidatures envoyées comptent
  const mixte = L.applicationStats([
    { id: 1, company: 'X', status: 'postule', date: '2026-07-16' },
    { id: 2, company: 'Y', status: 'a_postuler', date: '2026-07-16' }
  ], '2026-07-16', {});
  assert.equal(mixte.sent, 1, 'seule la candidature postulée compte comme envoyée');
  assert.equal(mixte.appliedToday, true, 'la vraie candidature du jour tient « postulé aujourd’hui »');
  // vide → tout à 0
  const z = L.applicationStats([], today, {});
  assert.equal(z.total, 0); assert.equal(z.streak, 0); assert.equal(z.appliedToday, false); assert.equal(z.weekReached, false);
});

test('parseApplicationsCsv : import CSV (colonnes, statuts FR, dates, guillemets)', () => {
  const csv = 'Entreprise,Poste,Statut,Date,Source\nCabinet Léa,Compta,Postulé,16/07/2026,LinkedIn\n"Groupe, Martin",Assistant,Entretien,2026-07-10,Indeed\nExpertise Sud,Alternant,À postuler,,\n';
  const r = L.parseApplicationsCsv(csv);
  assert.equal(r.length, 3);
  assert.equal(r[0].company, 'Cabinet Léa'); assert.equal(r[0].status, 'postule'); assert.equal(r[0].date, '2026-07-16', 'date JJ/MM/AAAA → ISO');
  assert.equal(r[1].company, 'Groupe, Martin', 'virgule dans un champ entre guillemets'); assert.equal(r[1].status, 'entretien'); assert.equal(r[1].date, '2026-07-10');
  assert.equal(r[2].status, 'a_postuler', '« À postuler » ≠ « postulé »');
  // sans en-tête reconnaissable → 1re colonne = entreprise, aucune ligne sautée
  assert.deepEqual(L.parseApplicationsCsv('Boite A\nBoite B\n').map(a => a.company), ['Boite A', 'Boite B']);
  // vide / lignes blanches
  assert.deepEqual(L.parseApplicationsCsv(''), []);
  assert.deepEqual(L.parseApplicationsCsv('\n\n'), []);
});

test('jobStatusFromText : mappe les statuts FR réels (dont La Bonne Alternance)', () => {
  assert.equal(L.jobStatusFromText('À contacter'), 'a_postuler', 'prospect non contacté → à postuler');
  assert.equal(L.jobStatusFromText('Postulé (spontanée LBA)'), 'postule');
  assert.equal(L.jobStatusFromText('Confirmé reçu'), 'postule', 'confirmé ≠ accepté (pas décroché)');
  assert.equal(L.jobStatusFromText('J’ai reçu une réponse négative'), 'refus');
  assert.equal(L.jobStatusFromText('Abandonné'), 'refus');
  assert.equal(L.jobStatusFromText('Écartée'), 'refus');
  assert.equal(L.jobStatusFromText('Entretien'), 'entretien');
  assert.equal(L.jobStatusFromText('Retenu / embauché'), 'accepte');
  // Rejet nié : la tournure standard « non retenu » NE doit PAS être lue comme « retenu / accepté »
  // (le sous-motif « retenu » ne doit pas l'emporter, sinon un refus s'affiche en offre décrochée).
  assert.equal(L.jobStatusFromText('Non retenu'), 'refus', 'non retenu = refus, pas accepté');
  assert.equal(L.jobStatusFromText('Candidature non retenue'), 'refus');
  assert.equal(L.jobStatusFromText('Profil non retenu'), 'refus');
  assert.equal(L.jobStatusFromText('Vous n’avez pas été retenu'), 'refus', 'pas (été) retenu = refus');
  assert.equal(L.jobStatusFromText('Vous êtes retenu'), 'accepte', 'retenu positif reste accepté');
  // Un refus/accepté « après entretien » est un état TERMINAL : le mot « entretien » ne doit plus
  // l'emporter (sinon la candidature reste bloquée en colonne entretien du funnel).
  assert.equal(L.jobStatusFromText('Refusé après entretien'), 'refus', 'refus après entretien = refus');
  assert.equal(L.jobStatusFromText('Non retenu à l’entretien'), 'refus', 'non retenu à l’entretien = refus');
  assert.equal(L.jobStatusFromText('Retenu après entretien'), 'accepte', 'retenu après entretien = accepté');
  assert.equal(L.jobStatusFromText('Entretien prévu mardi'), 'entretien', 'entretien à venir reste entretien');
  // Piège du sous-motif : « entre-PRIS-e » ne doit PAS faire basculer en « accepté » (régression #446).
  assert.equal(L.jobStatusFromText('Entretien en entreprise'), 'entretien', 'entretien EN ENTREPRISE reste entretien');
  assert.equal(L.jobStatusFromText('Entretien avec l’entreprise mardi'), 'entretien');
  assert.equal(L.jobStatusFromText('1er entretien avec l’entreprise'), 'entretien');
  // …mais les vrais « pris/prise » restent bien « accepté ».
  assert.equal(L.jobStatusFromText('Candidature prise'), 'accepte');
  assert.equal(L.jobStatusFromText('Je suis pris'), 'accepte');
  // Une relance SEULE reste bien « relance », et prime sur un simple « postulé ».
  assert.equal(L.jobStatusFromText('Relancé'), 'relance');
  assert.equal(L.jobStatusFromText('2e relance envoyée'), 'relance');
  assert.equal(L.jobStatusFromText('Relancé sans réponse'), 'relance', 'sans réponse ≠ sans suite : pas encore un refus');
  assert.equal(L.jobStatusFromText('Postulé puis relancé'), 'relance', 'la relance prime sur « postulé »');
  // …mais un « relancé PUIS <état terminal/avancé> » est cet état-là, pas une relance en cours (même
  // logique que « refusé après entretien ») : sinon la candidature reste figée en colonne « relance »
  // du funnel et sort du « répondu » d'applicationStats → taux de réponse sous-évalué.
  assert.equal(L.jobStatusFromText('Relancé, sans suite'), 'refus', 'relancé puis sans suite = refus');
  assert.equal(L.jobStatusFromText('Relancé puis refusé'), 'refus', 'relancé puis refusé = refus');
  assert.equal(L.jobStatusFromText('Relancé, finalement abandonné'), 'refus');
  // CORRECTIF #592 (régression #569) : `relance` repasse AVANT `entretien` pour ne plus capter
  // « relance POUR entretien » / « relancé, toujours pas d'entretien » en rang 3 (fige irréversible).
  // Contrepartie assumée : « Relancé, entretien décroché » → 'relance' (rang 2, récupérable au re-sync
  // dès que la cellule dira « Entretien »), là où un sur-classement en 'entretien' serait définitif.
  assert.equal(L.jobStatusFromText('Relancé, entretien décroché'), 'relance', 'ambigu → relance (récupérable), pas entretien (définitif)');
  assert.equal(L.jobStatusFromText('Relance pour entretien'), 'relance', 'une relance POUR obtenir un entretien reste une relance');
  assert.equal(L.jobStatusFromText('Relancé, toujours pas d’entretien'), 'relance');
  assert.equal(L.jobStatusFromText('Relancé, j’ai été pris'), 'accepte', 'relancé puis pris = accepté (gain #569 conservé)');
  assert.equal(L.jobStatusFromText(''), 'a_postuler');
});

test('jobStatusFromText : une NÉGATION de l’action de candidater = à postuler (pas « postulé »)', () => {
  // « pas encore postulé » : le mot « postulé » est capté DANS une négation → la candidature n’est PAS
  // encore envoyée. Sans le garde, le seau `postule` l’emportait → funnel + applicationStats gonflés à
  // chaque sync du Sheets. Motif P4 (un verbe pris dans une tournure qui l’inverse).
  assert.equal(L.jobStatusFromText('Pas encore postulé'), 'a_postuler', 'pas encore postulé = à postuler');
  assert.equal(L.jobStatusFromText('pas postulé'), 'a_postuler');
  assert.equal(L.jobStatusFromText('Pas encore envoyé'), 'a_postuler', 'pas envoyé = pas candidaté');
  assert.equal(L.jobStatusFromText('Candidature non envoyée'), 'a_postuler');
  assert.equal(L.jobStatusFromText('Je n’ai pas encore postulé'), 'a_postuler');
  // Non-régression : un vrai « postulé/envoyé » (sans négation) reste « postulé », même suivi d’un « pas ».
  assert.equal(L.jobStatusFromText('Postulé le 12/03'), 'postule');
  assert.equal(L.jobStatusFromText('Postulé, pas de nouvelles'), 'postule', 'négation APRÈS le verbe → reste postulé');
  assert.equal(L.jobStatusFromText('2e relance envoyée'), 'relance', 'la relance prime toujours');
  assert.equal(L.jobStatusFromText('Candidature envoyée puis refusée'), 'refus', 'refus prime sur envoyé');
  // Non-régression : la négation d’un REFUS (« pas retenu ») reste un refus (verbe « retenu » hors garde).
  assert.equal(L.jobStatusFromText('Pas retenu'), 'refus');
  assert.equal(L.jobStatusFromText('Vous n’avez pas été retenu'), 'refus');
});

test('jobDateFromText : lit ISO/JJ-MM-AAAA, borne mois/jour, ignore les dates aberrantes', () => {
  // Cas nominaux (inchangés)
  assert.equal(L.jobDateFromText('2026-07-16'), '2026-07-16');
  assert.equal(L.jobDateFromText('16/07/2026'), '2026-07-16');
  assert.equal(L.jobDateFromText('1/2/2026'), '2026-02-01', 'zéro-padding jour/mois');
  assert.equal(L.jobDateFromText('le 05/03/2026 confirmé'), '2026-03-05', 'date noyée dans du texte');
  assert.equal(L.jobDateFromText('2026-07-16T10:30'), '2026-07-16', 'datetime → date');
  // Vide / absent
  assert.equal(L.jobDateFromText(''), '');
  assert.equal(L.jobDateFromText(null), '');
  assert.equal(L.jobDateFromText('pas de date'), '');
  // Bornes : mois 1-12, jour 1-31 → aberrant ignoré (plus de date fantôme dans le suivi)
  assert.equal(L.jobDateFromText('13/45/2026'), '', 'jour 13 mois 45 → hors bornes');
  assert.equal(L.jobDateFromText('2026-25-99'), '', 'ISO mois 25 jour 99 → hors bornes');
  assert.equal(L.jobDateFromText('00/00/2026'), '', 'mois/jour 0 → hors bornes');
  // Validité CALENDAIRE : un jour dans les bornes mais qui n'existe pas dans le mois est aberrant
  // aussi (avant le correctif, ces dates impossibles étaient stockées puis affichées telles quelles)
  assert.equal(L.jobDateFromText('2026-02-30'), '', '30 février → date inexistante');
  assert.equal(L.jobDateFromText('30/02/2026'), '', '30 février (FR) → date inexistante');
  assert.equal(L.jobDateFromText('31/11/2026'), '', '31 novembre → novembre n’a que 30 jours');
  assert.equal(L.jobDateFromText('2025-02-29'), '', '29 février hors année bissextile → inexistant');
  // Un 29 février d'une VRAIE année bissextile reste bien lu (pas de faux rejet)
  assert.equal(L.jobDateFromText('2024-02-29'), '2024-02-29', '29 février d’une année bissextile → valide');
  // Une date ISO calendairement invalide ne masque pas une vraie date JJ/MM/AAAA qui suit
  assert.equal(L.jobDateFromText('ref 2026-02-30 puis 05/03/2026'), '2026-03-05', 'fallback ISO invalide→FR');
  // Un motif ISO hors bornes ne masque pas une vraie date JJ/MM/AAAA qui suit
  assert.equal(L.jobDateFromText('ref 2026-13-01 puis 05/03/2026'), '2026-03-05', 'fallback ISO→FR');
});

test('parseCsv : guillemets, séparateurs mixtes, sauts de ligne échappés, CRLF', () => {
  // Guillemets doublés + virgule interne + point-virgule séparateur
  assert.deepEqual(L.parseCsv('a;"b,c";"d""e"'), [['a', 'b,c', 'd"e']]);
  // Saut de ligne littéral à l'intérieur d'un champ entre guillemets
  assert.deepEqual(L.parseCsv('"li1\nli2",x'), [['li1\nli2', 'x']]);
  // Tabulation comme séparateur, CRLF entre lignes, champ vide final conservé
  assert.deepEqual(L.parseCsv('a\tb\r\nc,'), [['a', 'b'], ['c', '']]);
  // Un \n final ne crée pas de ligne fantôme
  assert.deepEqual(L.parseCsv('a\nb\n'), [['a'], ['b']]);
  assert.deepEqual(L.parseCsv(''), []);
  assert.deepEqual(L.parseCsv(null), []);
});

test('parseCsv : cellule multi-ligne en CRLF ne laisse pas de \\r parasite dans la valeur', () => {
  // Cellule entre guillemets dont le saut de ligne interne est encodé en CRLF (RFC 4180, Excel) :
  // le \r isolé est retiré comme hors-champ, seul le \n reste comme vrai saut de ligne interne.
  assert.deepEqual(L.parseCsv('"ligne1\r\nligne2",x'), [['ligne1\nligne2', 'x']]);
  // \r isolé (sans \n) à l'intérieur d'un champ : ignoré aussi, jamais stocké.
  assert.deepEqual(L.parseCsv('"a\rb"'), [['ab']]);
  // Aucune valeur produite ne contient de retour chariot (invariant anti-\r).
  const cells = L.parseCsv('"note\r\nsuite","autre\r"').flat();
  assert.ok(cells.every(c => !c.includes('\r')), 'aucun \\r ne subsiste dans une cellule');
  // Séparation de lignes en CRLF hors guillemets : inchangée (pas de ligne fantôme, pas de \r).
  assert.deepEqual(L.parseCsv('a,b\r\nc,d'), [['a', 'b'], ['c', 'd']]);
});

test('parseAlternanceTargets : filtre score + géo sur un CSV type La Bonne Alternance', () => {
  const csv = [
    'Entreprise,Ville,Statut,Score /10,Notes',
    'FIDUCIAL Lorient,Lorient (56),À contacter,8,cabinet',
    'Petit Cabinet,Vannes (56),À contacter,4,',            // score trop bas → écarté
    'KPMG Rennes,Rennes (35),Postulé,7,',                  // 35 gardé
    'Cabinet Nantes,Nantes (44),À contacter,9,',           // hors zone → écarté
    'Cible Loudéac,Loudeac (22),À contacter,7,',           // 22 Loudéac → gardé
    'Cible Saint-Brieuc,Saint-Brieuc (22),À contacter,9,', // 22 hors Loudéac → écarté
  ].join('\n') + '\n';
  const opts = { minScore: 6, depts: ['35', '56'], townDepts: { '22': ['loudeac'] }, max: 800 };
  const t = L.parseAlternanceTargets(csv, opts);
  const names = t.map(a => a.company).sort();
  assert.deepEqual(names, ['Cible Loudéac', 'FIDUCIAL Lorient', 'KPMG Rennes'], 'score>=6 + géo 56/35/22-Loudéac');
  assert.equal(t.find(a => a.company === 'FIDUCIAL Lorient').status, 'a_postuler');
  assert.equal(t.find(a => a.company === 'KPMG Rennes').status, 'postule');
  assert.equal(t.find(a => a.company === 'FIDUCIAL Lorient').source, 'Lorient (56)', 'la ville sert de source');
  // plafond de sécurité
  assert.equal(L.parseAlternanceTargets(csv, { ...opts, max: 1 }).length, 1);
  // sans filtre géo/score → tout gardé (6 lignes)
  assert.equal(L.parseAlternanceTargets(csv, {}).length, 6);
});

test('parseAlternanceTargets : département d’outre-mer à 3 chiffres reconnu et filtrable', () => {
  const csv = [
    'Entreprise,Ville,Statut,Score /10',
    'Cabinet Fort-de-France,Fort-de-France (972),À contacter,8',
    'Cabinet Rennes,Rennes (35),À contacter,8',
  ].join('\n') + '\n';
  // On cible le 972 : seul le cabinet martiniquais doit passer (le 35 est hors zone).
  const dom = L.parseAlternanceTargets(csv, { depts: ['972'] });
  assert.deepEqual(dom.map(a => a.company), ['Cabinet Fort-de-France'], 'le DOM (972) est ciblable comme un dept métropolitain');
  // Non-régression : cibler la métropole (35) ne ramène pas le DOM.
  const metro = L.parseAlternanceTargets(csv, { depts: ['35'] });
  assert.deepEqual(metro.map(a => a.company), ['Cabinet Rennes'], 'le 35 reste correctement filtré');
});

test('parseAlternanceTargets : en-tête « Score /100 » n’est pas confondu avec la colonne /10', () => {
  // « Score /100 » ne doit PAS être pris pour la colonne de score /10 : sinon 85 et 42 (hors [0,10])
  // deviennent NaN et, avec minScore>0, TOUTES les lignes sont écartées (import silencieusement vide).
  const csv = [
    'Entreprise,Ville,Score /100',
    'ACME Rennes,Rennes (35),85',
    'Beta Lorient,Lorient (56),42',
  ].join('\n') + '\n';
  const t = L.parseAlternanceTargets(csv, { minScore: 6 });
  assert.deepEqual(t.map(a => a.company).sort(), ['ACME Rennes', 'Beta Lorient'], 'colonne /100 ignorée → aucune ligne écartée à tort');
  // La vraie colonne « Score /10 » reste, elle, bien détectée (non-régression).
  const csv10 = 'Entreprise,Ville,Score /10\nGamma,Rennes (35),8\nDelta,Rennes (35),4\n';
  assert.deepEqual(L.parseAlternanceTargets(csv10, { minScore: 6 }).map(a => a.company), ['Gamma'], '/10 toujours détecté et filtré');
});

test('parseSheetApplications : route Cibles (filtré) vs suivi simple (non filtré)', () => {
  const cibles = 'Entreprise,Ville,Statut,Score /10\nA,Lorient (56),À contacter,8\nB,Nantes (44),À contacter,9\n';
  const suivi = 'Entreprise,Statut,Date\nA,Postulé,2026-07-10\nB,Entretien,2026-07-11\n';
  const opts = { minScore: 6, depts: ['56'], townDepts: {}, max: 800 };
  assert.equal(L.parseSheetApplications(cibles, opts).length, 1, 'Cibles → filtré (B en 44 écarté)');
  assert.equal(L.parseSheetApplications(suivi, opts).length, 2, 'suivi simple → tout gardé');
});

test('normalizeSheetCsvUrl : n’accepte QUE le CSV publié docs.google.com', () => {
  // published-to-web CSV
  assert.equal(L.normalizeSheetCsvUrl('https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?gid=0&single=true&output=csv'), 'https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?gid=0&single=true&output=csv');
  // export?format=csv
  assert.ok(L.normalizeSheetCsvUrl('https://docs.google.com/spreadsheets/d/ABC123/export?format=csv&gid=42'));
  // gviz CSV
  assert.ok(L.normalizeSheetCsvUrl('https://docs.google.com/spreadsheets/d/ABC123/gviz/tq?tqx=out:csv&sheet=Cibles'));
  // ajoute https:// si absent
  assert.ok(L.normalizeSheetCsvUrl('docs.google.com/spreadsheets/d/e/x/pub?output=csv'));
  // REFUS : autre hôte, http, hôte privé, pas de CSV, pas une feuille
  assert.equal(L.normalizeSheetCsvUrl('https://evil.com/spreadsheets/d/x/pub?output=csv'), '');
  assert.equal(L.normalizeSheetCsvUrl('http://docs.google.com/spreadsheets/d/x/pub?output=csv'), '');
  assert.equal(L.normalizeSheetCsvUrl('https://docs.google.com/spreadsheets/d/x/edit#gid=0'), '', 'pas un export CSV');
  assert.equal(L.normalizeSheetCsvUrl('https://docs.google.com/document/d/x/pub?output=csv'), '', 'pas /spreadsheets/');
  assert.equal(L.normalizeSheetCsvUrl(''), '');
  // hôtes de redirection autorisés (docs + googleusercontent), rien d'autre
  assert.ok(L.isAllowedSheetHost('docs.google.com'));
  assert.ok(L.isAllowedSheetHost('doc-0s-abc.googleusercontent.com'));
  assert.equal(L.isAllowedSheetHost('evil.com'), false);
  assert.equal(L.isAllowedSheetHost('127.0.0.1'), false);
});

test('mergeApplications : fusion idempotente, sans doublon ni régression', () => {
  const existing = [
    { id: 1, company: 'Cabinet Léa', role: 'Compta', status: 'entretien', date: '2026-07-10', createdAt: 100 },
    { id: 2, company: 'Locale SARL', role: '', status: 'postule', date: '2026-07-05', createdAt: 90 },
  ];
  // « Cibles » liste Cabinet Léa en « à postuler » (ne doit PAS régresser l'entretien) + une nouvelle cible
  const incoming = [
    { company: 'cabinet léa', role: 'Compta', status: 'a_postuler', date: '' },
    { company: 'Nouvelle Cible', role: 'Alternant', status: 'a_postuler', date: '' },
  ];
  const m1 = L.mergeApplications(existing, incoming);
  assert.equal(m1.applications.length, 3, 'la nouvelle cible est ajoutée, pas de doublon pour Cabinet Léa');
  assert.equal(m1.added, 1);
  const lea = m1.applications.find(a => a.id === 1);
  assert.equal(lea.status, 'entretien', 'un suivi avancé n’est jamais remis à « à postuler »');
  assert.equal(m1.applications.find(a => a.company === 'Nouvelle Cible').status, 'a_postuler');
  // Locale SARL non listée dans l'import → conservée (local-only)
  assert.ok(m1.applications.some(a => a.id === 2));
  // idempotence : refusionner le même import ne change plus rien
  const m2 = L.mergeApplications(m1.applications, incoming);
  assert.equal(m2.added, 0); assert.equal(m2.updated, 0);
  // le Suivi fait avancer un statut : postulé → entretien met bien à jour
  const m3 = L.mergeApplications(existing, [{ company: 'Locale SARL', status: 'entretien', date: '2026-07-12' }]);
  assert.equal(m3.updated, 1);
  assert.equal(m3.applications.find(a => a.id === 2).status, 'entretien');
  // clé par ENTREPRISE seule : « Cibles » (avec poste) + « Suivi » (sans poste) pour la même boîte
  // fusionnent en UNE entrée (le poste de Cibles est conservé, le statut de Suivi appliqué).
  const two = L.mergeApplications([], [
    { company: 'Cabinet Alpha', role: 'Alternance CG', status: 'a_postuler' },
    { company: 'Cabinet Alpha', role: '', status: 'entretien', date: '2026-07-10' },
  ]);
  assert.equal(two.applications.length, 1, 'une seule entrée pour Cabinet Alpha');
  assert.equal(two.applications[0].role, 'Alternance CG', 'le poste de Cibles est conservé');
  assert.equal(two.applications[0].status, 'entretien', 'le statut avancé de Suivi est appliqué');
});

test('mergeApplications : une source en retard ne fait pas régresser un statut avancé (pas seulement depuis « à postuler »)', () => {
  // Adrien marque « postulé » (ou « refusé/abandonné ») dans l'app ; une source restée en retard
  // (sync auto ou ré-import du même fichier) ne doit jamais défaire ce suivi.
  const existing = [
    { id: 1, company: 'Refusée SAS', status: 'refus', date: '2026-07-10', createdAt: 1 },
    { id: 2, company: 'Acceptée SARL', status: 'accepte', date: '2026-07-05', createdAt: 2 },
  ];
  const stale = [
    { company: 'Refusée SAS', status: 'postule', date: '2026-07-01' },
    { company: 'Acceptée SARL', status: 'entretien', date: '2026-07-01' },
  ];
  const m = L.mergeApplications(existing, stale);
  assert.equal(m.applications.find(a => a.id === 1).status, 'refus', 'un refus n’est jamais remis à « postulé »');
  assert.equal(m.applications.find(a => a.id === 2).status, 'accepte', 'une acceptation n’est jamais remise à « entretien »');
  // à l'inverse, une vraie progression (ex. le Suivi note un refus après un entretien) s'applique bien
  const forward = L.mergeApplications(
    [{ id: 3, company: 'En cours EURL', status: 'entretien', date: '2026-07-01', createdAt: 3 }],
    [{ company: 'En cours EURL', status: 'refus', date: '2026-07-15' }]
  );
  assert.equal(forward.applications[0].status, 'refus');
  assert.equal(forward.updated, 1);
});

test('attentionDigest : n’émet plus le nudge alternance (déplacé vers le coach adaptatif)', () => {
  const today = '2026-07-16';
  const base = { recovery: [], agenda: [], workouts: [], habits: [] };
  // même avec des candidatures et pas postulé aujourd'hui, le digest ne porte plus l'alternance :
  // c'est désormais le focus prioritaire du coach (adaptiveCoachFocus).
  assert.ok(!L.attentionDigest({ ...base, applications: [{ id: 1, company: 'A', status: 'postule', date: '2026-07-14' }] }, today).some(i => i.key === 'alternance'));
});

test('habitStreak : un jour programmé manqué casse la série, les jours non programmés non', () => {
  // programmée lun/mer/ven, faite lun 6 + mer 8, mardi 7 non programmé ne compte pas
  const h = { id: 1, name: 'X', weekdays: [1, 3, 5], log: ['2026-07-06', '2026-07-08'] };
  assert.equal(L.habitStreak(h, '2026-07-08'), 2, 'lun + mer consécutifs (programmés)');
  // vendredi 10 non fait, mais on interroge le 10 : la série d’avant (lun+mer) reste, on part de la veille
  assert.equal(L.habitStreak(h, '2026-07-10'), 2, 'vendredi pas encore fait → série de la veille intacte');
  // mais si on saute au lundi 13 sans avoir fait vendredi 10 → série cassée
  assert.equal(L.habitStreak(h, '2026-07-13'), 0, 'vendredi 10 (programmé) manqué → cassé');
});
test('récurrent en pause : normalisé et exclu de todayItems', () => {
  const r = { id: 1, title: 'Réunion', paused: true, rule: { freq: 'daily', interval: 1, startDate: '2026-01-01' } };
  assert.equal(L.normalizeRecurring(r).paused, true, 'paused conservé');
  const items = L.todayItems({ recurring: [r] }, '2026-07-10');
  assert.ok(!items.some(i => i.type === 'recurring'), 'aucune occurrence quand en pause');
  const items2 = L.todayItems({ recurring: [{ ...r, paused: false }] }, '2026-07-10');
  assert.ok(items2.some(i => i.type === 'recurring'), 'occurrence présente quand actif');
});
test('habitBestStreak : plus longue série d’occurrences prévues réalisées', () => {
  const h = { id: 1, name: 'Eau', weekdays: [], log: ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-10', '2026-06-11'] };
  assert.equal(L.habitBestStreak(h, '2026-06-11'), 3, 'record = 3 jours (1-3 juin), malgré le trou');
  assert.equal(L.habitBestStreak({ id: 2, weekdays: [], log: [] }, '2026-06-11'), 0, 'sans historique → 0');
  const w = { id: 3, weekdays: [1, 3, 5], log: ['2026-07-06', '2026-07-08', '2026-07-10'] }; // lun/mer/ven
  assert.equal(L.habitBestStreak(w, '2026-07-10'), 3, 'lun+mer+ven prévus enchaînés = record 3');
});

test('habitWeekMap : 7 derniers jours (ancien→récent) avec prévu/fait', () => {
  // habitude quotidienne, faite les 08 et 10/07
  const map = L.habitWeekMap({ id: 1, weekdays: [], log: ['2026-07-08', '2026-07-10'] }, '2026-07-10');
  assert.equal(map.length, 7);
  assert.equal(map[6].key, '2026-07-10', 'dernier = aujourd’hui');
  assert.equal(map[0].key, '2026-07-04', 'premier = J-6');
  assert.equal(map[6].done, true);
  assert.equal(map[4].done, true);  // 08/07
  assert.equal(map[5].done, false); // 09/07 non fait
  assert.ok(map.every(d => d.scheduled), 'sans weekdays → tous prévus');
  // habitude lun/mer/ven : les autres jours ne sont pas "scheduled"
  const w = L.habitWeekMap({ id: 2, weekdays: [1, 3, 5], log: [] }, '2026-07-10');
  assert.equal(w[6].scheduled, true, 'ven 10/07 prévu');   // vendredi
  assert.equal(w[5].scheduled, false, 'jeu 09/07 non prévu');
  assert.deepEqual(L.habitWeekMap({ id: 3 }, 'pas-une-date'), []);
});

test('habitsWeekPulse : agrégat hebdo de toutes les habitudes', () => {
  // 2 habitudes quotidiennes sur la semaine se terminant le 10/07 (14 occurrences prévues) :
  //  - A faite 08 + 10 (2), B faite 10 (1) → 3 tenues / 14 prévues
  const p = L.habitsWeekPulse([
    { id: 1, weekdays: [], log: ['2026-07-08', '2026-07-10'] },
    { id: 2, weekdays: [], log: ['2026-07-10'] }
  ], '2026-07-10');
  assert.equal(p.scheduled, 14);
  assert.equal(p.done, 3);
  assert.equal(p.rate, 21, 'round(3/14*100)=21');
  assert.equal(p.days.length, 7);
  assert.equal(p.days[6].done, 2, 'le 10/07 : A et B faites');
  assert.equal(p.days[6].scheduled, 2);
  // habitude programmée lun/mer/ven : ne compte que ses jours
  const only = L.habitsWeekPulse([{ id: 3, weekdays: [1, 3, 5], log: ['2026-07-10'] }], '2026-07-10');
  assert.equal(only.scheduled, 3, 'lun/mer/ven sur la semaine');
  assert.equal(only.done, 1);
  // aucune habitude / occurrences → null
  assert.equal(L.habitsWeekPulse([], '2026-07-10'), null);
  assert.equal(L.habitsWeekPulse(null, '2026-07-10'), null);
  assert.equal(L.habitsWeekPulse([{ id: 4, weekdays: [1, 3, 5], log: [] }], 'bad-date'), null, 'date invalide → null');
});

test('todosForDay : entrée non-tableau tolérée → vide', () => {
  const r = L.todosForDay(null, '2026-07-07');
  assert.deepEqual(r.active, []);
  assert.equal(r.remaining, 0);
});

test('normalizeBirthday : bornes jour/mois, année optionnelle', () => {
  const b = L.normalizeBirthday({ id: 1, name: 'Maman', day: 1, month: 7, year: 1963 });
  assert.equal(b.name, 'Maman'); assert.equal(b.day, 1); assert.equal(b.month, 7); assert.equal(b.year, 1963);
  assert.equal(L.normalizeBirthday({ day: 40, month: 13 }).day, 0);
  assert.equal(L.normalizeBirthday({ day: 40, month: 13 }).month, 0);
  assert.equal(L.normalizeBirthday({ day: 5, month: 5, year: 1700 }).year, null);
  // date IMPOSSIBLE (jour valide 1-31 mais incompatible avec le mois) → jour écarté, sinon `new Date`
  // la ferait déborder en date fantôme dans upcomingBirthdays. Chaque max de mois est vérifié.
  assert.equal(L.normalizeBirthday({ day: 31, month: 2 }).day, 0, '31 févr. impossible');
  assert.equal(L.normalizeBirthday({ day: 30, month: 2 }).day, 0, '30 févr. impossible');
  assert.equal(L.normalizeBirthday({ day: 29, month: 2 }).day, 29, '29 févr. préservé (fêté 1er mars les années non bissextiles)');
  assert.equal(L.normalizeBirthday({ day: 31, month: 4 }).day, 0, '31 avril impossible');
  assert.equal(L.normalizeBirthday({ day: 30, month: 4 }).day, 30, '30 avril valide');
  assert.equal(L.normalizeBirthday({ day: 31, month: 6 }).day, 0, '31 juin impossible');
  assert.equal(L.normalizeBirthday({ day: 31, month: 9 }).day, 0, '31 septembre impossible');
  assert.equal(L.normalizeBirthday({ day: 31, month: 11 }).day, 0, '31 novembre impossible');
  assert.equal(L.normalizeBirthday({ day: 31, month: 12 }).day, 31, '31 décembre valide');
  // mois invalide → month 0 (donc entrée filtrée par `b.day && b.month` partout) ; le jour ne débordera jamais
  assert.equal(L.normalizeBirthday({ day: 31, month: 0 }).month, 0);
});

test('upcomingBirthdays : une date impossible (31 févr.) est ignorée, pas annoncée comme date fantôme', () => {
  // Non saisissable via <input type="date">, mais possible sur import/restauration d'un backup.
  // AVANT : new Date(2026, 1, 31) débordait au 3 mars → anniversaire fantôme annoncé, jamais matché
  // par birthdaysForDay('2026-03-03'). APRÈS : normalizeBirthday écarte le jour → aucune occurrence.
  const impossible = [{ id: 1, name: 'Fantome', day: 31, month: 2 }];
  assert.deepEqual(L.upcomingBirthdays(impossible, '2026-02-20', { withinDays: 60 }), []);
  assert.deepEqual(L.birthdaysForDay(impossible, '2026-03-03'), []);   // les deux sœurs sont d'accord
  // une vraie date du même mois reste bien annoncée
  const valide = [{ id: 2, name: 'Vrai', day: 28, month: 2 }];
  assert.equal(L.upcomingBirthdays(valide, '2026-02-20', { withinDays: 60 })[0].date, '2026-02-28');
});

test('birthdaysForDay : anniversaire récurrent + âge calculé', () => {
  const bdays = [
    { id: 1, name: 'Adrien', day: 7, month: 7, year: 1999 },
    { id: 2, name: 'Maman', day: 1, month: 7, year: 1963 },
    { id: 3, name: 'Papa', day: 1, month: 9, year: 1960 }
  ];
  const jul7 = L.birthdaysForDay(bdays, '2026-07-07');
  assert.deepEqual(jul7, [{ id: 1, name: 'Adrien', age: 27 }]);
  const jul1 = L.birthdaysForDay(bdays, '2027-07-01');
  assert.deepEqual(jul1, [{ id: 2, name: 'Maman', age: 64 }]);
  assert.deepEqual(L.birthdaysForDay(bdays, '2026-12-25'), []);
});

test('birthdaysForDay : sans année → age null ; date invalide → []', () => {
  assert.deepEqual(L.birthdaysForDay([{ id: 9, name: 'X', day: 3, month: 3 }], '2026-03-03'), [{ id: 9, name: 'X', age: null }]);
  assert.deepEqual(L.birthdaysForDay([{ id: 9, name: 'X', day: 3, month: 3 }], 'nope'), []);
});

test('birthdaysForDay : anniversaire du 29 février fêté le 1er mars les années non bissextiles', () => {
  const leap = [{ id: 1, name: 'Leap', day: 29, month: 2, year: 2000 }];
  // 2027 non bissextile : rien le 28, fêté le 1er mars (bug historique : disparaissait)
  assert.deepEqual(L.birthdaysForDay(leap, '2027-02-28'), []);
  assert.deepEqual(L.birthdaysForDay(leap, '2027-03-01'), [{ id: 1, name: 'Leap', age: 27 }]);
  // 2028 bissextile : fêté le 29 février, pas le 1er mars
  assert.deepEqual(L.birthdaysForDay(leap, '2028-02-29'), [{ id: 1, name: 'Leap', age: 28 }]);
  assert.deepEqual(L.birthdaysForDay(leap, '2028-03-01'), []);
  // 2100 non bissextile (divisible par 100 mais pas 400) → 1er mars
  assert.deepEqual(L.birthdaysForDay(leap, '2100-03-01').map(x => x.name), ['Leap']);
  // 2000 bissextile (divisible par 400) → 29 février
  assert.deepEqual(L.birthdaysForDay(leap, '2000-02-29').map(x => x.name), ['Leap']);
  // un vrai 1er mars et un 29 février cohabitent le 1er mars d'une année non bissextile
  const both = [{ id: 1, name: 'Leap', day: 29, month: 2 }, { id: 2, name: 'Mars', day: 1, month: 3 }];
  assert.deepEqual(L.birthdaysForDay(both, '2027-03-01').map(x => x.name), ['Leap', 'Mars']);
});

test('ageLabel : singulier/pluriel français corrects, âge inconnu → vide', () => {
  assert.equal(L.ageLabel(1), '1 an');       // 1 → singulier
  assert.equal(L.ageLabel(0), '0 an');       // 0 → singulier (règle française)
  assert.equal(L.ageLabel(2), '2 ans');      // ≥ 2 → pluriel
  assert.equal(L.ageLabel(27), '27 ans');
  assert.equal(L.ageLabel(null), '');        // âge inconnu (anniversaire sans année)
  assert.equal(L.ageLabel(undefined), '');
  assert.equal(L.ageLabel(NaN), '');
  assert.equal(L.ageLabel('abc'), '');       // non chiffrable → vide, pas « NaN an »
  assert.equal(L.ageLabel('3'), '3 ans');    // chaîne numérique tolérée
});

test('upcomingBirthdays : le 29 février donne une date réelle (jamais 02-29 en année non bissextile)', () => {
  const leap = [{ id: 1, name: 'Leap', day: 29, month: 2, year: 2000 }];
  // année non bissextile : l'occurrence réelle est le 1er mars, cohérente avec daysUntil
  const nonLeap = L.upcomingBirthdays(leap, '2027-02-25', { withinDays: 30 })[0];
  assert.equal(nonLeap.date, '2027-03-01');
  assert.equal(nonLeap.daysUntil, 4);
  assert.equal(nonLeap.age, 27);
  // année bissextile : le vrai 29 février
  const inLeap = L.upcomingBirthdays(leap, '2028-02-25', { withinDays: 30 })[0];
  assert.equal(inLeap.date, '2028-02-29');
  assert.equal(inLeap.daysUntil, 4);
});

test('upcomingBirthdays : prochains anniversaires triés par proximité, horizon + âge', () => {
  const bdays = [
    { id: 1, name: 'Adrien', day: 7, month: 7, year: 1999 },
    { id: 2, name: 'Maman', day: 1, month: 7, year: 1963 },
    { id: 3, name: 'Papa', day: 1, month: 9, year: 1960 }
  ];
  const up = L.upcomingBirthdays(bdays, '2026-07-06', { withinDays: 60 });
  assert.deepEqual(up.map(x => x.name), ['Adrien', 'Papa'], 'Maman (dans ~360j) hors horizon 60j');
  assert.equal(up[0].daysUntil, 1);
  assert.equal(up[0].age, 27);
  assert.equal(up[0].date, '2026-07-07');
  assert.equal(up[1].daysUntil, 57);
  assert.equal(up[1].age, 66);
});

test('upcomingBirthdays : le jour même compte comme daysUntil 0 ; passage d’année', () => {
  const bdays = [{ id: 1, name: 'Adrien', day: 7, month: 7, year: 1999 }];
  assert.equal(L.upcomingBirthdays(bdays, '2026-07-07', {})[0].daysUntil, 0);
  // depuis décembre, la prochaine occurrence est l'année suivante
  const dec = L.upcomingBirthdays(bdays, '2026-12-01', { withinDays: 365 })[0];
  assert.equal(dec.date, '2027-07-07');
  assert.equal(dec.age, 28);
});

test('normalizeRecurring : défauts, freq/interval validés, weekdays filtrés', () => {
  const r = L.normalizeRecurring({ id: 1, title: 'X', rule: { freq: 'weekly', interval: 2, weekdays: [1, 3, 9], startDate: '2026-07-06' } });
  assert.equal(r.rule.freq, 'weekly');
  assert.equal(r.rule.interval, 2);
  assert.deepEqual(r.rule.weekdays, [1, 3], '9 hors 0..6 filtré');
  assert.equal(L.normalizeRecurring({ rule: { freq: 'nawak' } }).rule.freq, 'weekly');
  assert.equal(L.normalizeRecurring({ rule: { interval: 999 } }).rule.interval, 52);
  // startDate/until format-valides mais IMPOSSIBLES → neutralisés : sinon recurrenceMatches construit
  // un new Date(2026, 12, 99) qui déborde silencieusement vers un jour réel FAUX (mauvaises occurrences).
  assert.equal(L.normalizeRecurring({ rule: { freq: 'weekly', startDate: '2026-13-99' } }).rule.startDate, '', 'startDate impossible → vide');
  assert.equal(L.normalizeRecurring({ rule: { freq: 'weekly', startDate: '2026-07-06', until: '2026-99-99' } }).rule.until, '', 'until impossible → vide');
  assert.equal(L.normalizeRecurring({ rule: { freq: 'weekly', startDate: '2026-07-06' } }).rule.startDate, '2026-07-06', 'startDate réel conservé');
});

test('recurrenceMatches : quotidien avec intervalle + borne de début', () => {
  const rule = { freq: 'daily', interval: 2, startDate: '2026-07-01' };
  assert.equal(L.recurrenceMatches(rule, '2026-07-01'), true);
  assert.equal(L.recurrenceMatches(rule, '2026-07-03'), true);
  assert.equal(L.recurrenceMatches(rule, '2026-07-02'), false);
  assert.equal(L.recurrenceMatches(rule, '2026-06-30'), false, 'avant le début');
});

test('recurrenceMatches : hebdo avec jours + intervalle de semaines', () => {
  const rule = { freq: 'weekly', interval: 1, weekdays: [1, 3], startDate: '2026-07-06' }; // lun 6, mer
  assert.equal(L.recurrenceMatches(rule, '2026-07-06'), true, 'lundi');
  assert.equal(L.recurrenceMatches(rule, '2026-07-08'), true, 'mercredi');
  assert.equal(L.recurrenceMatches(rule, '2026-07-07'), false, 'mardi non coché');
  const biweekly = { freq: 'weekly', interval: 2, weekdays: [1], startDate: '2026-07-06' };
  assert.equal(L.recurrenceMatches(biweekly, '2026-07-06'), true, 'semaine 0');
  assert.equal(L.recurrenceMatches(biweekly, '2026-07-13'), false, 'semaine 1');
  assert.equal(L.recurrenceMatches(biweekly, '2026-07-20'), true, 'semaine 2');
});

test('recurrenceMatches : mensuel, annuel, borne until', () => {
  assert.equal(L.recurrenceMatches({ freq: 'monthly', interval: 1, startDate: '2026-07-15' }, '2026-08-15'), true);
  assert.equal(L.recurrenceMatches({ freq: 'monthly', interval: 1, startDate: '2026-07-15' }, '2026-08-14'), false);
  assert.equal(L.recurrenceMatches({ freq: 'yearly', interval: 1, startDate: '2026-07-07' }, '2027-07-07'), true);
  assert.equal(L.recurrenceMatches({ freq: 'yearly', interval: 2, startDate: '2026-07-07' }, '2027-07-07'), false);
  const until = { freq: 'daily', interval: 1, startDate: '2026-07-01', until: '2026-07-05' };
  assert.equal(L.recurrenceMatches(until, '2026-07-05'), true);
  assert.equal(L.recurrenceMatches(until, '2026-07-06'), false, 'après until');
});

test('todayItems : un événement récurrent tombant ce jour apparaît, validable par date (doneLog)', () => {
  const state = { recurring: [{ id: 1, title: 'Standup', time: '09:00', kind: 'focus', doneLog: ['2026-07-07'], rule: { freq: 'weekly', interval: 1, weekdays: [2, 4], startDate: '2026-07-01' } }] };
  const tue = L.todayItems(state, '2026-07-07').find(i => i.type === 'recurring'); // mardi
  assert.ok(tue, 'occurrence récurrente présente');
  assert.equal(tue.title, 'Standup');
  assert.equal(tue.recurring, true);
  assert.equal(tue.completed, true, 'mardi validé via doneLog');
  const thu = L.todayItems(state, '2026-07-09').find(i => i.type === 'recurring'); // jeudi
  assert.equal(thu.completed, false, 'jeudi pas encore validé');
  assert.equal(L.todayItems(state, '2026-07-08').some(i => i.type === 'recurring'), false, 'mercredi : pas d’occurrence');
});

test('recurrenceMatches : cas limites fin de mois / année bissextile', () => {
  // mensuel démarré le 31 : sauté les mois sans 31, présent les mois avec
  const m31 = { freq: 'monthly', interval: 1, startDate: '2026-01-31' };
  assert.equal(L.recurrenceMatches(m31, '2026-02-28'), false, 'février n’a pas de 31');
  assert.equal(L.recurrenceMatches(m31, '2026-03-31'), true, 'mars a un 31');
  // annuel un 29 février : uniquement les années bissextiles
  const feb29 = { freq: 'yearly', interval: 1, startDate: '2024-02-29' };
  assert.equal(L.recurrenceMatches(feb29, '2028-02-29'), true, '2028 bissextile');
  assert.equal(L.recurrenceMatches(feb29, '2025-02-28'), false, '2025 non bissextile, pas de 29');
  // hebdo au passage d'année : lundi d'une semaine paire
  const wk = { freq: 'weekly', interval: 1, weekdays: [1], startDate: '2025-12-29' };
  assert.equal(L.recurrenceMatches(wk, '2026-01-05'), true, 'lundi suivant, nouvelle année');
});

test('normalizeCalendarUrl : bloque les cibles SSRF sensibles (métadonnées cloud, IPv6 loopback)', () => {
  assert.equal(L.normalizeCalendarUrl('https://169.254.169.254/latest/meta-data/'), '', 'endpoint métadonnées cloud bloqué');
  assert.equal(L.normalizeCalendarUrl('https://[::1]/cal.ics'), '', 'IPv6 loopback bloqué');
  assert.equal(L.normalizeCalendarUrl('HTTPS://Calendar.Google.com/x.ics'), 'https://calendar.google.com/x.ics', 'schéma/hôte normalisés en minuscules');
  assert.equal(L.normalizeCalendarUrl('https://nas.local./cal.ics'), '', 'hôte .local (point final) bloqué');
});

test('normalizeRecurring : doneLog filtré (dates valides uniquement)', () => {
  const r = L.normalizeRecurring({ id: 1, doneLog: ['2026-07-07', 'nope', 42] });
  assert.deepEqual(r.doneLog, ['2026-07-07']);
  assert.deepEqual(L.normalizeRecurring({ id: 2 }).doneLog, []);
});

test('recurringOccurs : occurrence sauf si pause / jour sauté', () => {
  // hebdo tous les lundis à partir du 06/07/2026 (un lundi)
  const rec = { id: 1, title: 'Muscu', rule: { freq: 'weekly', interval: 1, weekdays: [1], startDate: '2026-07-06' } };
  assert.equal(L.recurringOccurs(rec, '2026-07-06'), true, 'lundi → occurrence');
  assert.equal(L.recurringOccurs(rec, '2026-07-07'), false, 'mardi → pas d’occurrence');
  // jour sauté
  assert.equal(L.recurringOccurs({ ...rec, skipLog: ['2026-07-13'] }, '2026-07-13'), false, 'lundi sauté');
  assert.equal(L.recurringOccurs({ ...rec, skipLog: ['2026-07-13'] }, '2026-07-20'), true, 'lundi suivant OK');
  // en pause
  assert.equal(L.recurringOccurs({ ...rec, paused: true }, '2026-07-06'), false);
  // skipLog normalisé (dates invalides filtrées)
  assert.deepEqual(L.normalizeRecurring({ id: 2, skipLog: ['2026-07-13', 'x', 5] }).skipLog, ['2026-07-13']);
});

test('normalizeHabit : défauts, xp borné, weekdays/log filtrés', () => {
  const h = L.normalizeHabit({ id: 1, name: 'Lecture', xp: 999, weekdays: [1, 3, 9], log: ['2026-07-06', 'oops'] });
  assert.equal(h.name, 'Lecture');
  assert.equal(h.xp, 50, 'xp borné à 50');
  assert.deepEqual(h.weekdays, [1, 3]);
  assert.deepEqual(h.log, ['2026-07-06'], 'entrée de log invalide filtrée');
  assert.equal(L.normalizeHabit({ id: 2 }).xp, 10, 'xp défaut 10');
});

test('habitStreak : jours consécutifs, tolérant au jour non encore fait, cassé par un trou', () => {
  const h = { id: 1, name: 'X', log: ['2026-07-05', '2026-07-06', '2026-07-07'] };
  assert.equal(L.habitStreak(h, '2026-07-07'), 3, 'fait aujourd’hui → 3');
  assert.equal(L.habitStreak(h, '2026-07-08'), 3, 'pas encore fait aujourd’hui, série intacte de la veille');
  assert.equal(L.habitStreak(h, '2026-07-09'), 0, 'trou le 08 → série cassée');
  assert.equal(L.habitStreak({ id: 2, log: [] }, '2026-07-07'), 0);
});

test('habitsForDay : filtre par jour de semaine, statut fait + série', () => {
  const habits = [
    { id: 1, name: 'Eau', log: ['2026-07-06', '2026-07-07'] }, // tous les jours
    { id: 2, name: 'Muscu', weekdays: [1, 3], log: [] } // lun/mer seulement
  ];
  const tue = L.habitsForDay(habits, '2026-07-07'); // mardi
  assert.deepEqual(tue.map(h => h.name), ['Eau'], 'Muscu non prévue le mardi');
  assert.equal(tue[0].done, true);
  assert.equal(tue[0].streak, 2);
  const mon = L.habitsForDay(habits, '2026-07-06'); // lundi
  assert.deepEqual(mon.map(h => h.name).sort(), ['Eau', 'Muscu']);
});

test('habitsAtRisk : séries en jeu aujourd’hui (prévues, non faites, série ≥ min)', () => {
  const habits = [
    // série de 3 (05→07), prévue tous les jours, PAS faite le 08 → en jeu
    { id: 1, name: 'Lecture', log: ['2026-07-05', '2026-07-06', '2026-07-07'] },
    // série de 5, mais DÉJÀ faite le 08 → pas en jeu
    { id: 2, name: 'Eau', log: ['2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08'] },
    // prévue, non faite, mais série de 0 (aucun historique) → sous le seuil
    { id: 3, name: 'Nouvelle', log: [] },
    // série de 2, non faite le 08, mais prévue lun/mer seulement (08 = mercredi) → en jeu
    { id: 4, name: 'Muscu', weekdays: [1, 3], log: ['2026-07-01', '2026-07-06'] },
  ];
  const risk = L.habitsAtRisk(habits, '2026-07-08'); // mercredi
  assert.deepEqual(risk.map(h => h.name), ['Lecture', 'Muscu'], 'triées par série décroissante');
  assert.equal(risk[0].streak, 3);
  assert.equal(risk[1].streak, 2);
  // seuil relevé → seule la plus longue série reste
  assert.deepEqual(L.habitsAtRisk(habits, '2026-07-08', 3).map(h => h.name), ['Lecture']);
  // tout est fait / rien de prévu / clé invalide → []
  assert.deepEqual(L.habitsAtRisk([{ id: 9, name: 'Ok', log: ['2026-07-07', '2026-07-08'] }], '2026-07-08'), []);
  assert.deepEqual(L.habitsAtRisk(habits, 'bad'), []);
  assert.deepEqual(L.habitsAtRisk(null, '2026-07-08'), []);
});

test('todayItems : les anniversaires du jour apparaissent (non validables)', () => {
  const state = { birthdays: [{ id: 1, name: 'Maman', day: 6, month: 7, year: 1963 }] };
  const items = L.todayItems(state, '2026-07-06');
  const b = items.find(i => i.type === 'birthday');
  assert.ok(b, 'un item anniversaire est présent');
  assert.match(b.title, /Maman/);
  assert.match(b.title, /63 ans/);
  assert.equal(b.allDay, true);
  // Accord singulier : premier anniversaire (âge 1) → « 1 an », pas « 1 ans ».
  const bebe = L.todayItems({ birthdays: [{ id: 2, name: 'Bébé', day: 6, month: 7, year: 2025 }] }, '2026-07-06').find(i => i.type === 'birthday');
  assert.match(bebe.title, /\(1 an\)/);
  assert.ok(!/1 ans/.test(bebe.title), 'pas d’accord fautif « 1 ans »');
});

test('prescriptionFor : repos par défaut selon la famille', () => {
  assert.equal(L.prescriptionFor({ sets: 3, reps: 10 }, { family: 'general' }).rest, 75);
  assert.equal(L.prescriptionFor({ sets: 3, reps: 10 }, { family: 'core' }).rest, 45);
  assert.equal(L.prescriptionFor({ sets: 3, reps: 10 }, { family: 'conditioning' }).rest, 30);
  assert.equal(L.prescriptionFor({ sets: 3, reps: 10 }, undefined).rest, 75); // pas de source
});

test('prescriptionFor : unité héritée de la source, rest explicite prioritaire', () => {
  const p = L.prescriptionFor({ sets: 3, reps: 30 }, { unit: 'sec', family: 'core' });
  assert.equal(p.unit, 'sec');
  assert.equal(L.prescriptionFor({ sets: 3, reps: 10, rest: 120 }, { family: 'general' }).rest, 120);
  assert.equal(L.prescriptionFor({ sets: 3, reps: 10, unit: 'reps' }, { unit: 'sec' }).unit, 'reps'); // x prioritaire
});

test('prescriptionFor : durée minimale 1, valeurs manquantes tolérées', () => {
  assert.equal(L.prescriptionFor({}, undefined).minutes, 1);
  assert.equal(L.prescriptionFor(null, null).minutes, 1);
  assert.ok(L.prescriptionFor({ sets: 4, reps: 8 }, { family: 'general' }).minutes >= 1);
});

test('formatFor : rendu "sets×reps unit", points d’interrogation si manquant', () => {
  assert.equal(L.formatFor({ sets: 3, reps: 8 }, { family: 'general' }), '3×8 reps');
  assert.equal(L.formatFor({ sets: 3, reps: 30, unit: 'sec' }, undefined), '3×30 sec');
  assert.equal(L.formatFor({}, undefined), '?×? reps');
});

test('normalizeAgendaItem : titres hostiles conservés en texte brut (échappés à l’affichage)', () => {
  const e = L.normalizeAgendaItem({ id: 9, title: '<img src=x onerror=alert(1)>', date: '2026-07-06', time: '10:00', kind: 'life' });
  assert.equal(e.title, '<img src=x onerror=alert(1)>'); // stocké tel quel — escapeHtml protège au rendu
  assert.equal(typeof e.title, 'string');
});

test('buildIcs : plusieurs événements, invalides ignorés, ordre conservé', () => {
  const now = new Date('2026-07-06T10:00:00');
  const ics = L.buildIcs([
    { id: 1, title: 'A', date: '2026-07-10', time: '09:00', durationMin: 30 },
    { id: 2, title: 'B', date: 'bad-date', time: '10:00' },
    { id: 3, title: 'C', date: '2026-07-11', time: '11:00', durationMin: 60 }
  ], now);
  const uids = (ics.match(/UID:\d+@irllvpup/g) || []);
  assert.deepEqual(uids, ['UID:1@irllvpup', 'UID:3@irllvpup']);
});

test('planStudySessions : semaine vide ou plage nulle → []', () => {
  assert.deepEqual(L.planStudySessions({ weekdays: [], startDate: '2026-07-06', examDate: '2026-07-20' }), []);
  assert.deepEqual(L.planStudySessions({ weekdays: [1, 3], startDate: '2026-07-06', examDate: '2026-07-06' }).length >= 0, true);
});

test('mergePlannedEvents : entrées non-tableau tolérées', () => {
  assert.deepEqual(L.mergePlannedEvents(null, null), []);
  const ev = [{ id: 1, refId: 'planner-2026-07-06-17:30', title: 'X' }];
  assert.deepEqual(L.mergePlannedEvents(null, ev), ev);
  assert.deepEqual(L.mergePlannedEvents(ev, null), ev);
});

test('weekItems : 7 jours du lundi, items placés au bon jour', () => {
  const state = {
    agenda: [
      { id: 1, title: 'Muscu', date: '2026-07-06', time: '18:00', kind: 'sport' },       // lundi
      { id: 2, title: 'Révision', date: '2026-07-08', time: '17:30', kind: 'study' },     // mercredi
      { id: 3, title: 'Focus', date: '2026-07-08', time: '09:00', kind: 'focus', completed: true },
      { id: 4, title: 'Hors semaine', date: '2026-07-20', time: '10:00', kind: 'life' }
    ], plans: []
  };
  const days = L.weekItems(state, '2026-07-06');
  assert.equal(days.length, 7);
  assert.equal(days[0].dateKey, '2026-07-06');
  assert.equal(days[0].weekday, 1); // lundi
  assert.equal(days[6].dateKey, '2026-07-12'); // dimanche
  assert.equal(days[0].counts.sport, 1);
  assert.equal(days[2].counts.study, 1);
  assert.equal(days[2].counts.focus, 1);
  assert.equal(days[2].done, 1); // le focus est complété
  assert.equal(days[2].items[0].time, '09:00'); // tri chronologique dans le jour
  assert.ok(days.every(d => !d.items.some(i => i.title === 'Hors semaine')));
});

test('weeklySummaryText : bilan partageable formaté', () => {
  const txt = L.weeklySummaryText({ mondayKey: '2026-07-06', sessions: 3, minutes: 150, km: 12, focusMin: 75, studyDone: 2, studyPlanned: 4, sleepAvg: 7.2 });
  assert.match(txt, /Bilan de la semaine du 06\/07\/2026/);
  assert.match(txt, /3 séances · 150 min · 12 km/);
  assert.match(txt, /75 min de focus/);
  assert.match(txt, /2\/4 révisions validées/);
  assert.match(txt, /7\.2 h de sommeil/);
  // accord au singulier quand une seule révision planifiée (règle FR : 0 et 1 → singulier)
  const one = L.weeklySummaryText({ studyDone: 0, studyPlanned: 1 });
  assert.match(one, /0\/1 révision validée/);
  assert.ok(!/révisions|validées/.test(one), 'pas de pluriel fautif pour studyPlanned = 1');
  // champs absents non affichés
  const min = L.weeklySummaryText({ sessions: 1, minutes: 30 });
  assert.ok(!/focus|révisions|sommeil/.test(min));
  assert.match(min, /1 séance · 30 min/);
  assert.equal(typeof L.weeklySummaryText(null), 'string');
  // shareableWeek : objet de partage natif { title, text }
  const sum = { mondayKey: '2026-07-06', sessions: 3, minutes: 150 };
  const share = L.shareableWeek(sum);
  assert.ok(share && share.title && share.text);
  assert.match(share.title, /bilan de la semaine/i);
  assert.match(share.title, /06\/07\/2026/);
  assert.equal(share.text, L.weeklySummaryText(sum), 'texte = bilan formaté');
  // le texte du bilan démarre toujours par "Bilan..." → jamais null
  assert.ok(L.shareableWeek({}).text.length > 0);
  assert.ok(L.shareableWeek(null).text.length > 0);
});

test('weeklySummary : agrège séances, km, charge, focus, sommeil, révisions', () => {
  const state = {
    workouts: [
      { date: '2026-07-06', type: 'run', duration: 40, distance: 8, effort: 2 },
      { date: '2026-07-08', type: 'strength', duration: 50, effort: 3 },
      { date: '2026-07-20', type: 'run', duration: 30, distance: 5, effort: 2 } // hors semaine
    ],
    focusSessions: [{ date: '2026-07-07', minutes: 25 }, { date: '2026-07-09', minutes: 50 }],
    recovery: [{ date: '2026-07-06', sleep: 8 }, { date: '2026-07-08', sleep: 6 }],
    agenda: [
      { date: '2026-07-08', kind: 'study', completed: true },
      { date: '2026-07-10', kind: 'study', completed: false }
    ]
  };
  const r = L.weeklySummary(state, '2026-07-06');
  assert.equal(r.sessions, 2);         // le run du 20 est exclu
  assert.equal(r.minutes, 90);
  assert.equal(r.km, 8);
  assert.equal(r.load, 40 * 2 + 50 * 3); // 230
  assert.equal(r.focusMin, 75);
  assert.equal(r.sleepAvg, 7);         // (8+6)/2
  assert.equal(r.studyPlanned, 2);
  assert.equal(r.studyDone, 1);
});

test('weeklySummary : une nuit sans sommeil saisi (sleep:0) ne plombe pas la moyenne', () => {
  // Un check-in récup où l'utilisateur note fatigue/courbatures (ou juste son coucher) sans
  // renseigner la durée de sommeil enregistre sleep:0 (app.js : Number(input.value) || 0).
  // Cette nuit ne doit pas être moyennée comme une nuit de 0 h — comme monthlyRecap/weeklySleepStats.
  const state = {
    recovery: [
      { date: '2026-07-06', sleep: 8, fatigue: 2, soreness: 2 },
      { date: '2026-07-07', sleep: 8, fatigue: 2, soreness: 2 },
      { date: '2026-07-08', sleep: 0, fatigue: 3, soreness: 2, bedtime: '23:00' } // sommeil non saisi
    ]
  };
  const r = L.weeklySummary(state, '2026-07-06');
  assert.equal(r.sleepAvg, 8);         // deux nuits à 8 h, pas 16/3 ≈ 5.3
});

test('weeklySummary : deux saisies sur la MÊME nuit ne pèsent pas double (dédup par date)', () => {
  // Import/restauration/double check-in : deux relevés de sommeil pour la même date. La moyenne
  // doit compter UNE nuit (dernier check-in), comme weeklySleepStats/sleepDebtHours — pas moyenner
  // les saisies brutes (qui donnerait (8+4+8)/3 ≈ 6,7 au lieu de (4+8)/2 = 6).
  const state = {
    recovery: [
      { date: '2026-07-06', sleep: 8 },
      { date: '2026-07-06', sleep: 4 }, // même nuit, second relevé → écrase le premier
      { date: '2026-07-07', sleep: 8 }
    ]
  };
  const r = L.weeklySummary(state, '2026-07-06');
  assert.equal(r.sleepAvg, 6);
  assert.equal(r.sleepAvg, L.weeklySleepStats(state.recovery, '2026-07-06', '2026-07-12').avg); // sœur d'accord
});

test('weeklySummary + weeklySummaryText : les candidatures de la semaine comptent', () => {
  const state = {
    applications: [
      { id: 1, company: 'A', status: 'postule', date: '2026-07-07' },   // dans la semaine
      { id: 2, company: 'B', status: 'entretien', date: '2026-07-09' }, // dans la semaine + entretien
      { id: 3, company: 'C', status: 'postule', date: '2026-06-20' },   // hors semaine
      { id: 4, company: 'D', status: 'a_postuler', date: '' },          // pas encore envoyée
    ],
  };
  const r = L.weeklySummary(state, '2026-07-06');
  assert.equal(r.apps, 2);
  assert.equal(r.appEntretiens, 1);
  const txt = L.weeklySummaryText(r);
  assert.match(txt, /💼 2 candidatures · 1 entretien 🎉/);
  // aucune candidature → pas de ligne alternance
  assert.ok(!/💼/.test(L.weeklySummaryText(L.weeklySummary({}, '2026-07-06'))));
});

test('monthLabelFr : étiquette lisible du mois', () => {
  assert.equal(L.monthLabelFr('2026-07'), 'juillet 2026');
  assert.equal(L.monthLabelFr('2026-01'), 'janvier 2026');
  assert.equal(L.monthLabelFr('2026-13'), '');
  assert.equal(L.monthLabelFr('bad'), '');
});

test('monthlyRecap : agrège le mois calendaire + jours actifs', () => {
  const state = {
    workouts: [
      { date: '2026-07-03', type: 'run', duration: 40, distance: 8 },
      { date: '2026-07-03', type: 'strength', duration: 50 }, // même jour → 1 jour actif
      { date: '2026-07-18', type: 'run', duration: 30, distance: 5 },
      { date: '2026-06-30', type: 'run', duration: 20, distance: 4 } // autre mois → exclu
    ],
    focusSessions: [{ date: '2026-07-05', minutes: 25 }],
    wellnessDone: [{ date: '2026-07-05', key: 'a' }, { date: '2026-07-12', key: 'b' }],
    recovery: [{ date: '2026-07-03', sleep: 8 }, { date: '2026-07-18', sleep: 7 }],
    agenda: [
      { date: '2026-07-10', kind: 'study', completed: true },
      { date: '2026-07-11', kind: 'study', completed: false }
    ]
  };
  const r = L.monthlyRecap(state, '2026-07');
  assert.equal(r.sessions, 3);          // 3 séances de juillet
  assert.equal(r.minutes, 120);
  assert.equal(r.km, 13);               // 8 + 5
  assert.equal(r.focusMin, 25);
  assert.equal(r.wellness, 2);
  assert.equal(r.studyDone, 1);
  assert.equal(r.studyPlanned, 2);
  assert.equal(r.sleepAvg, 7.5);        // (8+7)/2
  // jours actifs distincts : 07-03, 07-18, 07-05, 07-12, 07-10 = 5
  assert.equal(r.activeDays, 5);
  // deux saisies sur la même nuit ne pèsent pas double (dédup par date, dernier check-in)
  const dup = L.monthlyRecap({ recovery: [{ date: '2026-07-05', sleep: 8 }, { date: '2026-07-05', sleep: 4 }] }, '2026-07');
  assert.equal(dup.sleepAvg, 4);        // une seule nuit, pas (8+4)/2 = 6
  // mois vide / invalide → null
  assert.equal(L.monthlyRecap(state, '2020-01'), null);
  assert.equal(L.monthlyRecap(state, 'bad'), null);
});

test('monthlyRecapText : texte partageable', () => {
  const txt = L.monthlyRecapText({ monthKey: '2026-07', sessions: 12, minutes: 600, km: 45, wellness: 8, focusMin: 200, studyDone: 6, studyPlanned: 8, activeDays: 20, sleepAvg: 7.4 });
  assert.match(txt, /Bilan de juillet 2026/);
  assert.match(txt, /12 séances · 600 min · 45 km/);
  assert.match(txt, /8 séances bien-être/);
  assert.match(txt, /6\/8 révisions validées/);
  assert.match(txt, /20 jours actifs/);
  // accord au singulier quand une seule révision planifiée dans le mois
  const one = L.monthlyRecapText({ monthKey: '2026-07', sessions: 1, studyDone: 1, studyPlanned: 1 });
  assert.match(one, /1\/1 révision validée/);
  assert.ok(!/révisions|validées/.test(one), 'pas de pluriel fautif pour studyPlanned = 1');
  assert.equal(L.monthlyRecapText(null), '');
});

test('shareableMonth : objet Web Share du bilan mensuel', () => {
  const recap = { monthKey: '2026-07', sessions: 12, minutes: 600, km: 45, wellness: 8, focusMin: 200, studyDone: 6, studyPlanned: 8, activeDays: 20, sleepAvg: 7.4 };
  const s = L.shareableMonth(recap);
  assert.match(s.title, /Mon bilan de juillet 2026/);
  assert.equal(s.text, L.monthlyRecapText(recap));
  assert.equal(L.shareableMonth(null), null);
});
test('weeklyInsights : bilan hebdo intelligent (objectifs + tendance)', () => {
  const state = {
    workouts: [
      { date: '2026-07-06', type: 'run', duration: 40, distance: 8, effort: 2 },
      { date: '2026-07-08', type: 'strength', duration: 50, effort: 3 },
      { date: '2026-07-09', type: 'strength', duration: 50, effort: 3 },
      { date: '2026-07-10', type: 'run', duration: 30, distance: 4, effort: 2 },
    ],
    recovery: [{ date: '2026-07-07', sleep: 5 }],
    goals: { sessions: 4, distance: 10 },
  };
  const ins = L.weeklyInsights(state, '2026-07-06', '2026-07-11');
  assert.ok(Array.isArray(ins) && ins.length >= 1 && ins.length <= 5);
  assert.ok(ins.every(i => i.emoji && i.text && ['good', 'warn', 'info'].includes(i.tone)));
  // 4/4 séances → objectif atteint (good)
  assert.ok(ins.some(i => i.tone === 'good' && /séances/.test(i.text)));
  // 12 km >= 10 → objectif course atteint
  assert.ok(ins.some(i => /km/.test(i.text)));
  // accord de « couru(s) » sur la distance parcourue (cur.km), pluriel ssi ≥ 2 km — cur.km est
  // arrondi au dixième donc peut valoir 1,5 (le garde entier `> 1` d'ailleurs ne conviendrait pas).
  const km1 = L.weeklyInsights({ workouts: [{ date: '2026-07-08', type: 'run', duration: 10, distance: 1, effort: 2 }], goals: { distance: 1 } }, '2026-07-06', '2026-07-11');
  assert.ok(km1.some(i => i.text === '1 km couru — objectif 1 km atteint.'), '1 km couru (singulier, objectif atteint)');
  assert.ok(!km1.some(i => /km courus/.test(i.text)), 'pas de « km courus » fautif à 1 km');
  const kmDec = L.weeklyInsights({ workouts: [{ date: '2026-07-08', type: 'run', duration: 12, distance: 1.5, effort: 2 }], goals: { distance: 1 } }, '2026-07-06', '2026-07-11');
  assert.ok(kmDec.some(i => i.text === '1.5 km couru — objectif 1 km atteint.'), '1,5 km couru (singulier : valeur < 2)');
  const kmPlur = L.weeklyInsights({ workouts: [{ date: '2026-07-08', type: 'run', duration: 30, distance: 5, effort: 2 }], goals: { distance: 3 } }, '2026-07-06', '2026-07-11');
  assert.ok(kmPlur.some(i => i.text === '5 km courus — objectif 3 km atteint.'), '5 km courus (pluriel ≥ 2)');
  const kmRatioSing = L.weeklyInsights({ workouts: [{ date: '2026-07-08', type: 'run', duration: 12, distance: 1.5, effort: 2 }], goals: { distance: 20 } }, '2026-07-06', '2026-07-11');
  assert.ok(kmRatioSing.some(i => i.text === '1.5/20 km couru cette semaine.'), 'ratio : 1,5 km couru (singulier, distance parcourue < 2)');
  const kmRatioPlur = L.weeklyInsights({ workouts: [{ date: '2026-07-08', type: 'run', duration: 20, distance: 3, effort: 2 }], goals: { distance: 20 } }, '2026-07-06', '2026-07-11');
  assert.ok(kmRatioPlur.some(i => i.text === '3/20 km courus cette semaine.'), 'ratio : 3 km courus (pluriel ≥ 2)');
  // sommeil 5 h → alerte
  assert.ok(ins.some(i => /[Ss]ommeil/.test(i.text) && i.tone === 'warn'));
  // accord au singulier quand l'objectif hebdo est d'UNE seule séance (valeur réelle : app.js clampe à Math.max(1,…))
  const goal1done = L.weeklyInsights({ workouts: [{ date: '2026-07-08', type: 'strength', duration: 50, effort: 3 }], goals: { sessions: 1 } }, '2026-07-06', '2026-07-11');
  assert.ok(goal1done.some(i => i.tone === 'good' && /1\/1 séance — objectif atteint/.test(i.text)), '1/1 séance au singulier (objectif atteint)');
  assert.ok(!goal1done.some(i => /\/1 séances/.test(i.text)), 'pas de pluriel fautif quand objectif = 1');
  const goal1none = L.weeklyInsights({ workouts: [], goals: { sessions: 1 } }, '2026-07-06', '2026-07-11');
  assert.ok(goal1none.some(i => i.tone === 'warn' && /0\/1 séance — encore 1 séance pour ton objectif hebdo\./.test(i.text)), '0/1 séance : le reste porte le nom « séance » au singulier');
  // le reste à faire porte le nom « séance(s) » accordé sur le nombre restant (aligné sur app.js « N séance(s) pour boucler ton objectif »)
  const goalMany = L.weeklyInsights({ workouts: [{ date: '2026-07-08', type: 'strength', duration: 50, effort: 3 }], goals: { sessions: 4 } }, '2026-07-06', '2026-07-11');
  assert.ok(goalMany.some(i => i.tone === 'warn' && /1\/4 séances — encore 3 séances pour ton objectif hebdo\./.test(i.text)), 'encore 3 séances (pluriel du reste)');
  // état vide → un message d'amorce
  const empty = L.weeklyInsights({}, '2026-07-06', '2026-07-11');
  assert.equal(empty.length, 1);
});

test('weeklyInsights : pas de « tu montes en volume » quand la charge est en pic (cohérence)', () => {
  // Rampe réaliste : 3 semaines légères puis une semaine chargée → ACWR haut ET volume +vs sem. préc.
  // Le bilan ne doit PAS féliciter la montée (📈) et ordonner d'alléger (🟥) le même jour.
  const spike = {
    workouts: [
      { date: '2026-06-23', type: 'muscu', duration: 30, effort: 2 },
      { date: '2026-06-26', type: 'muscu', duration: 30, effort: 2 },
      { date: '2026-06-30', type: 'muscu', duration: 30, effort: 2 },
      { date: '2026-07-03', type: 'muscu', duration: 35, effort: 2 },
      { date: '2026-07-07', type: 'muscu', duration: 35, effort: 2 },
      { date: '2026-07-09', type: 'muscu', duration: 35, effort: 2 },
      { date: '2026-07-13', type: 'muscu', duration: 60, effort: 3 },
      { date: '2026-07-14', type: 'muscu', duration: 60, effort: 3 },
      { date: '2026-07-15', type: 'muscu', duration: 60, effort: 3 },
      { date: '2026-07-16', type: 'muscu', duration: 60, effort: 3 },
    ],
    goals: { sessions: 4 },
  };
  const acwr = L.acuteChronicRatio(spike.workouts, '2026-07-17');
  assert.equal(acwr.zone, 'high', 'préalable : ACWR bien en pic');
  const ins = L.weeklyInsights(spike, '2026-07-13', '2026-07-17');
  assert.ok(ins.some(i => /Charge en pic/.test(i.text)), 'l’avertissement de pic est présent');
  assert.ok(!ins.some(i => /montes en volume/.test(i.text)), 'aucune félicitation de montée de volume quand la charge est en pic');
  // Non-régression : montée SAINE (ACWR non-pic) → la félicitation 📈 reste
  const healthy = {
    workouts: [
      { date: '2026-06-22', type: 'muscu', duration: 40, effort: 2 }, { date: '2026-06-23', type: 'muscu', duration: 40, effort: 2 }, { date: '2026-06-24', type: 'muscu', duration: 40, effort: 2 },
      { date: '2026-06-29', type: 'muscu', duration: 45, effort: 2 }, { date: '2026-06-30', type: 'muscu', duration: 45, effort: 2 }, { date: '2026-07-01', type: 'muscu', duration: 45, effort: 2 },
      { date: '2026-07-06', type: 'muscu', duration: 50, effort: 2 }, { date: '2026-07-07', type: 'muscu', duration: 50, effort: 2 }, { date: '2026-07-08', type: 'muscu', duration: 50, effort: 2 },
      { date: '2026-07-13', type: 'muscu', duration: 55, effort: 2 }, { date: '2026-07-14', type: 'muscu', duration: 55, effort: 2 }, { date: '2026-07-15', type: 'muscu', duration: 55, effort: 2 }, { date: '2026-07-16', type: 'muscu', duration: 55, effort: 2 },
    ],
    goals: { sessions: 4 },
  };
  assert.notEqual(L.acuteChronicRatio(healthy.workouts, '2026-07-17').zone, 'high', 'préalable : montée saine, pas de pic');
  assert.ok(L.weeklyInsights(healthy, '2026-07-13', '2026-07-17').some(i => /montes en volume/.test(i.text)), 'la montée saine est toujours célébrée');
});

test('weeksBetween : compte les semaines, négatif si passé', () => {
  assert.equal(L.weeksBetween('2026-07-06', '2026-07-20'), 2);
  assert.equal(L.weeksBetween('2026-07-06', '2028-07-06'), 104); // ~2 ans
  assert.ok(L.weeksBetween('2026-07-06', '2026-06-01') < 0);
  assert.equal(L.weeksBetween('bad', '2026-07-20'), null);
});

test('racePhase : phases selon les semaines restantes', () => {
  assert.equal(L.racePhase(120).key, 'foundation'); // >52 sem : objectif 2 ans
  assert.equal(L.racePhase(40).key, 'base');
  assert.equal(L.racePhase(16).key, 'build');
  assert.equal(L.racePhase(6).key, 'specific');
  assert.equal(L.racePhase(1).key, 'taper');
  assert.equal(L.racePhase(-3).key, 'done');
  assert.equal(L.racePhase(null).key, 'none');
});

test('raceGoalStatus : ultra 150-200km à 2 ans → phase fondation', () => {
  const now = new Date('2026-07-06T12:00:00');
  const s = L.raceGoalStatus({ type: 'ultra160', distanceKm: 170, date: '2028-07-01' }, now);
  assert.equal(s.phase.key, 'foundation');
  assert.ok(s.weeksLeft > 90);
  assert.ok(s.monthsLeft > 20);
  assert.ok(s.longRunMin > 0);
  assert.equal(s.km, 170);
  assert.ok(s.daysLeft > 630, 'daysLeft cohérent (~2 ans)');
});
test('raceGoalStatus : course passée de 1 à 3 jours → « Course passée », pas « Affûtage »', () => {
  const now = new Date('2026-07-20T12:00:00');
  // 1 à 3 jours : l'écart en semaines s'arrondit à 0 (Math.round) → le bug affichait « Affûtage ».
  for (let d = 1; d <= 3; d++) {
    const date = new Date('2026-07-20T12:00:00'); date.setDate(date.getDate() - d);
    const s = L.raceGoalStatus({ type: 'trail', distanceKm: 20, date: L.dateKey(date) }, now);
    assert.equal(s.daysLeft, -d, `daysLeft = -${d}`);
    assert.equal(s.phase.key, 'done', `course d'il y a ${d} j → phase done`);
    assert.ok(s.weeksLeft < 0, `weeksLeft négatif pour une course passée (d=${d})`);
  }
  // Non-régression : 4 jours passait déjà (Math.round(-4/7) = -1) → toujours « done ».
  const s4 = L.raceGoalStatus({ type: 'trail', distanceKm: 20, date: '2026-07-16' }, now);
  assert.equal(s4.phase.key, 'done');
  // Non-régression : une course dans 1 jour reste « Affûtage » (daysLeft positif).
  const sUp = L.raceGoalStatus({ type: 'trail', distanceKm: 20, date: '2026-07-21' }, now);
  assert.equal(sUp.daysLeft, 1);
  assert.equal(sUp.phase.key, 'taper');
});
test('taperPlan : affûtage fondé Bosquet 2007 — volume réduit 41-60 %, intensité/fréquence gardées', () => {
  // Hors fenêtre : course lointaine ou passée → null
  assert.equal(L.taperPlan(60, 42), null, 'marathon à 60 j : pas encore en affûtage');
  assert.equal(L.taperPlan(-2, 42), null, 'course passée : null');
  assert.equal(L.taperPlan(null, 42), null, 'jours absents : null');
  // Durée d'affûtage échelonnée par distance
  assert.equal(L.taperPlan(9, 10), null, '10 km : affûtage ~7 j → à 9 j, pas encore');
  assert.ok(L.taperPlan(6, 10), '10 km : à 6 j, en affûtage');
  assert.ok(L.taperPlan(16, 100), 'ultra 100 km : affûtage long (~18 j) → à 16 j, déjà dedans');
  // Multiplicateur de volume dans la bande optimale 41-60 % de coupe près de la course
  const race = L.taperPlan(2, 42);
  assert.ok(race && race.volumeMul > 0.4 && race.volumeMul < 0.65, 'coupe dans la bande Bosquet');
  assert.ok(race.cutPct >= 40 && race.cutPct <= 60, `cutPct ${race.cutPct} % dans 41-60`);
  assert.equal(race.raceWeek, true, 'J-2 = semaine de course');
  assert.equal(race.source, 'Bosquet 2007');
  // Décroissance EXPONENTIELLE : on coupe MOINS au début de l'affûtage qu'à l'approche
  const early = L.taperPlan(14, 42), late = L.taperPlan(2, 42);
  assert.ok(early.volumeMul > late.volumeMul, 'volume plus haut en début d\'affûtage (progressif)');
  assert.ok(early.cutPct < late.cutPct, 'coupe plus légère à 2 semaines qu\'à la semaine de course');
});
test('downhillPrep : préparation aux descentes (repeated bout effect) selon la phase de course', () => {
  // Hors contexte trail (aucun D+) → null
  assert.equal(L.downhillPrep(0, 30, 42), null, 'aucun D+ : pas de contexte trail');
  assert.equal(L.downhillPrep(null, null, 0), null, 'D+ absent : null');
  // Sans course : entretien de base, 1 séance/sem
  const base = L.downhillPrep(600, null, 0);
  assert.ok(base && base.window === 'base' && base.sessionsPerWeek === 1, 'base : 1 séance/sem');
  assert.match(base.protocol, /descente CONTRÔLÉE/, 'protocole concret de descente');
  // Course lointaine (> 8 sem) → toujours base
  assert.equal(L.downhillPrep(600, 90, 80).window, 'base', 'course lointaine : phase base');
  // Fenêtre spécifique (≤ 8 sem) : 1 séance si peu de D+, 2 si profil très vallonné
  const spec = L.downhillPrep(500, 30, 42);
  assert.ok(spec.window === 'specific' && spec.sessionsPerWeek === 1, 'spécifique peu vallonné : 1/sem');
  const specHilly = L.downhillPrep(1500, 30, 80);
  assert.equal(specHilly.sessionsPerWeek, 2, 'spécifique très vallonné (≥1000 m) : 2/sem');
  assert.match(specHilly.why, /80 km/, 'la distance de course apparaît dans le pourquoi');
  // À ≤ 10 j : STOP aux descentes cassantes (fraîcheur, cohérent avec l'affûtage)
  const near = L.downhillPrep(1500, 8, 80);
  assert.ok(near.window === 'race' && near.sessionsPerWeek === 0, 'J-8 : plus de descente cassante');
  assert.match(near.protocol, /J-8/, 'le protocole mentionne le compte à rebours');
  assert.equal(L.downhillPrep(600, 10, 42).window, 'race', 'J-10 inclus dans la fenêtre course');
  assert.equal(L.downhillPrep(600, 11, 42).window, 'specific', 'J-11 encore en spécifique');
});
test('buildTrainingWeek : affûtage réduit le VOLUME des courses en gardant la FRÉQUENCE', () => {
  const kmOf = p => p.days.reduce((s, d) => s + (Number(d.km) || 0) + (d.runs || []).reduce((a, r) => a + (Number(r.km) || 0), 0), 0);
  const full = L.buildTrainingWeek(['legs'], 2, 3, false, { weeklyKm: 40, week: 5 });
  const tap = L.buildTrainingWeek(['legs'], 2, 3, false, { weeklyKm: 40, week: 5, raceDaysLeft: 4, raceKm: 42 });
  const far = L.buildTrainingWeek(['legs'], 2, 3, false, { weeklyKm: 40, week: 5, raceDaysLeft: 60, raceKm: 42 });
  assert.ok(full && tap && far);
  assert.equal(full.taper, null, 'sans course proche : pas d\'affûtage');
  assert.equal(far.taper, null, 'course lointaine : pas d\'affûtage');
  assert.ok(tap.taper, 'course proche : affûtage actif');
  assert.equal(tap.runs, full.runs, 'même nombre de courses (fréquence préservée)');
  const fullKm = kmOf(full), tapKm = kmOf(tap);
  assert.ok(tapKm > 0 && tapKm < fullKm * 0.8, `volume réduit (${tapKm} < 0,8×${fullKm})`);
  // L'intensité est gardée : une séance qualité reste au programme quand il y a ≥ 3 courses
  const allRuns = tap.days.filter(d => d.type === 'run');
  assert.ok(allRuns.some(d => d.quality), 'la séance qualité (intensité) est conservée pendant l\'affûtage');
});
test('acuteChronicRatio : aiguë (7j) vs chronique (28j/4), zones', () => {
  const today = '2026-07-10';
  // charge répartie régulièrement : ~même charge chaque semaine → ratio ~1 (optimal)
  const steady = [
    { date: '2026-07-08', duration: 60, effort: 2 }, // 120, dans les 7j
    { date: '2026-06-30', duration: 60, effort: 2 }, // 120, semaine -1
    { date: '2026-06-23', duration: 60, effort: 2 }, // 120, semaine -2
    { date: '2026-06-17', duration: 60, effort: 2 }, // 120, semaine -3 (<=27j)
  ];
  const r = L.acuteChronicRatio(steady, today);
  assert.equal(r.acute, 120);
  assert.equal(r.chronic, 120, 'moyenne hebdo = 480/4');
  assert.equal(r.ratio, 1);
  assert.equal(r.zone, 'optimal');
  // pic : grosse semaine aiguë vs chronique faible → high
  const spike = [
    { date: '2026-07-09', duration: 120, effort: 4 }, // 480 aiguë
    { date: '2026-06-20', duration: 30, effort: 2 },  // 60 il y a ~20j
  ];
  const s = L.acuteChronicRatio(spike, today);
  assert.ok(s.ratio > 1.5 && s.zone === 'high', 'pic → zone high');
  // pas de charge chronique → null
  assert.equal(L.acuteChronicRatio([], today), null);
  assert.equal(L.acuteChronicRatio(steady, 'pas-une-date'), null);
});
test('acuteChronicRatio : 1re semaine (toute la charge dans les 7 j, aucune base chronique) → null, pas de faux « pic »', () => {
  const today = '2026-07-17';
  // Débutant : 3 séances, TOUTES dans les 7 derniers jours, rien avant → pas de base chronique.
  // Avant le correctif : chronic28 === acute → ratio = 4,0 → zone 'high' → « allège, risque de blessure »
  // criée à quelqu'un qui vient de commencer (démotivant et faux — artefact d'arithmétique).
  const firstWeek = [
    { date: '2026-07-13', duration: 45, effort: 3 },
    { date: '2026-07-15', duration: 45, effort: 3 },
    { date: '2026-07-16', duration: 45, effort: 3 },
  ];
  assert.equal(L.acuteChronicRatio(firstWeek, today), null, 'aucune base chronique hors fenêtre aiguë → ACWR indéfini');
  // Conséquence : le conseil de charge ne recommande PAS un déload à un débutant en semaine 1.
  assert.notEqual(L.loadAdvice(L.acuteChronicRatio(firstWeek, today), { score: 72 }).status, 'deload');
  // Dès qu'UNE séance existe hors des 7 j (base chronique amorcée), l'ACWR se calcule à nouveau
  // — non-régression du « pic à base faible » déjà couvert (le beau grand écart reste un pic légitime).
  const withBase = firstWeek.concat([{ date: '2026-07-05', duration: 30, effort: 2 }]); // 12 j avant today
  assert.ok(L.acuteChronicRatio(withBase, today), 'une base chronique hors fenêtre → ACWR défini');
});
test('loadAdvice : combine ACWR + forme du jour → recommandation', () => {
  // surcharge (ACWR haut) prime, même avec bonne forme → déload
  assert.equal(L.loadAdvice({ zone: 'high' }, { score: 90 }).status, 'deload');
  // forme basse → récupération (sauf si déjà déload)
  assert.equal(L.loadAdvice({ zone: 'optimal' }, { score: 40 }).status, 'ease');
  // zone optimale + bonne forme → pousser
  assert.equal(L.loadAdvice({ zone: 'optimal' }, { score: 80 }).status, 'push');
  // charge basse + forme correcte → remonter le volume
  assert.equal(L.loadAdvice({ zone: 'low' }, { score: 60 }).status, 'build');
  // rien de particulier → maintien
  assert.equal(L.loadAdvice({ zone: 'optimal' }, { score: 60 }).status, 'maintain');
  // données manquantes → maintien (défaut sûr)
  assert.equal(L.loadAdvice(null, null).status, 'maintain');
  assert.ok(L.loadAdvice({ zone: 'high' }, null).advice.length > 10);
});

test('trainingHeatmap : grille w*7 alignée lundi, comptes et futur', () => {
  // aujourd'hui = vendredi 10/07/2026
  const hm = L.trainingHeatmap([{ date: '2026-07-08' }, { date: '2026-07-08' }, { date: '2026-07-06' }], '2026-07-10', 1);
  assert.equal(hm.length, 7, '1 semaine = 7 jours');
  assert.equal(hm[0].date, '2026-07-06', 'commence un lundi');
  assert.equal(hm[0].count, 1);            // lundi 06
  assert.equal(hm[2].count, 2);            // mercredi 08 (deux séances)
  assert.equal(hm[4].future, false);       // vendredi 10 = aujourd'hui
  assert.equal(hm[5].future, true);        // samedi 11 = futur
  assert.equal(L.trainingHeatmap([], '2026-07-10', 8).length, 56);
  assert.deepEqual(L.trainingHeatmap([], 'nope', 8), []);
});

test('dailyStreak : jours calendaires consécutifs, grâce aujourd’hui, cassé par un trou', () => {
  const today = '2026-07-10';
  assert.equal(L.dailyStreak(['2026-07-10', '2026-07-09', '2026-07-08'], today), 3);
  // aujourd'hui absent mais hier + avant-hier → grâce → 2
  assert.equal(L.dailyStreak(['2026-07-09', '2026-07-08'], today), 2);
  // trou hier → seul aujourd'hui compte
  assert.equal(L.dailyStreak(['2026-07-10', '2026-07-08'], today), 1);
  // doublons tolérés, tri non requis
  assert.equal(L.dailyStreak(['2026-07-08', '2026-07-10', '2026-07-09', '2026-07-10'], today), 3);
  assert.equal(L.dailyStreak([], today), 0);
  assert.equal(L.dailyStreak(['2026-07-01'], today), 0, 'rien de récent → 0');
  assert.equal(L.dailyStreak(['2026-07-10'], 'pas-une-date'), 0);
});

test('bestDailyStreak : plus longue série de jours consécutifs (record), robuste aux doublons/désordre', () => {
  // deux runs : 3 jours (05→07) et 4 jours (10→13) → record = 4
  assert.equal(L.bestDailyStreak(['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13']), 4);
  // désordre + doublons + clés invalides ignorés → run de 3 (08→10)
  assert.equal(L.bestDailyStreak(['2026-07-10', '2026-07-08', '2026-07-09', '2026-07-10', 'nope', '2026-07-01']), 3);
  assert.equal(L.bestDailyStreak(['2026-07-05']), 1, 'un seul jour → 1');
  assert.equal(L.bestDailyStreak([]), 0);
  assert.equal(L.bestDailyStreak(null), 0);
  // run traversant un mois (30 juin → 2 juil) = 3 consécutifs
  assert.equal(L.bestDailyStreak(['2026-06-30', '2026-07-01', '2026-07-02']), 3);
});

test('recentWins : victoires passées du rituel du soir, plus récentes d’abord', () => {
  const today = '2026-07-10';
  const refl = [
    { date: '2026-07-08', win: 'Séance malgré la fatigue', lesson: 'x' },
    { date: '2026-07-09', win: '  Fini le chapitre 3  ' },              // trim
    { date: '2026-07-10', win: 'Victoire du jour' },                     // aujourd'hui → exclue
    { date: '2026-07-07', win: '   ' },                                  // vide après trim → exclue
    { date: '2026-07-06', lesson: 'sans victoire' },                     // pas de win → exclue
    { date: '2026-01-01', win: 'Trop ancienne' },                        // hors fenêtre 90 j
    { date: 'bad', win: 'Date invalide' },                               // exclue
  ];
  const r = L.recentWins(refl, today);
  assert.equal(r.length, 2);
  assert.equal(r[0].win, 'Fini le chapitre 3');   // 09 avant 08
  assert.equal(r[0].daysAgo, 1);
  assert.equal(r[1].win, 'Séance malgré la fatigue');
  assert.equal(r[1].daysAgo, 2);
  // cap
  assert.equal(L.recentWins(refl, today, { cap: 1 }).length, 1);
  // fenêtre élargie → la vieille victoire remonte
  assert.equal(L.recentWins(refl, today, { days: 365 }).length, 3);
  // entrées invalides
  assert.deepEqual(L.recentWins([], today), []);
  assert.deepEqual(L.recentWins(refl, 'pas-une-date'), []);
  assert.deepEqual(L.recentWins(null, today), []);
});

test('fitDimensions : redimensionne sans déformer et sans jamais agrandir', () => {
  // photo iPhone typique (portrait 3024×4032) → grand côté ramené à 1280
  const p = L.fitDimensions(3024, 4032, 1280);
  assert.equal(p.height, 1280, 'le grand côté est borné');
  assert.equal(p.width, 960, 'ratio 3:4 conservé');
  // paysage
  const l = L.fitDimensions(4032, 3024, 1280);
  assert.equal(l.width, 1280);
  assert.equal(l.height, 960);
  // carré
  assert.deepEqual(L.fitDimensions(2000, 2000, 1280), { width: 1280, height: 1280 });
  // JAMAIS d'agrandissement : une image déjà petite reste telle quelle
  assert.deepEqual(L.fitDimensions(800, 600, 1280), { width: 800, height: 600 });
  assert.deepEqual(L.fitDimensions(1280, 720, 1280), { width: 1280, height: 720 }, 'pile à la limite');
  // ratio extrême : la dimension mineure ne tombe jamais à 0
  const fin = L.fitDimensions(5000, 3, 1280);
  assert.equal(fin.width, 1280);
  assert.ok(fin.height >= 1, 'au moins 1 px');
  // entrées invalides
  assert.equal(L.fitDimensions(0, 100, 1280), null);
  assert.equal(L.fitDimensions(100, 0, 1280), null);
  assert.equal(L.fitDimensions('x', 'y', 1280), null);
});

test('dataUrlBytes : poids réel d’une data URL base64', () => {
  assert.equal(L.dataUrlBytes('data:image/jpeg;base64,AAAA'), 3);
  assert.equal(L.dataUrlBytes('data:image/jpeg;base64,AAA='), 2, 'padding décompté');
  assert.equal(L.dataUrlBytes('data:image/jpeg;base64,AA=='), 1);
  // ordre de grandeur : le base64 gonfle d'environ 1/3
  const octets = L.dataUrlBytes('data:image/jpeg;base64,' + 'A'.repeat(800 * 1024));
  assert.ok(octets > 590 * 1024 && octets < 620 * 1024, `${octets} octets`);
  // entrées non conformes → 0, jamais une exception
  assert.equal(L.dataUrlBytes('pas une data url'), 0);
  assert.equal(L.dataUrlBytes('data:image/jpeg;base64,'), 0);
  assert.equal(L.dataUrlBytes(null), 0);
  assert.equal(L.dataUrlBytes(undefined), 0);
});

test('weightTargetAdvice : réalisme de la cible et cohérence avec l’objectif sportif', () => {
  // Profil réel d'Adrien : 81 kg, 174 cm
  const base = { weight: 81, height: 174, age: 30, sex: 'homme', sessionsPerWeek: 4 };
  const av = (t, obj) => L.weightTargetAdvice({ ...base, targetWeight: t, fitnessObjective: obj });

  // cible raisonnable (75 kg → IMC ~24,8)
  const ok = av(75, 'athletique');
  assert.equal(ok.direction, 'perte');
  assert.equal(ok.deltaKg, 6);
  assert.equal(ok.level, 'ok', 'rien d’alarmant');
  assert.ok(ok.weeks > 0 && ok.ratePerWeek > 0);
  assert.ok(ok.notes.some(n => /protéines/i.test(n.text)), 'conseil de préservation du muscle');

  // cible dangereusement basse : 55 kg à 174 cm → IMC 18,2
  const bas = av(55, 'athletique');
  assert.equal(bas.level, 'stop');
  assert.ok(bas.targetBmi < 18.5);
  assert.ok(bas.notes.some(n => n.tone === 'stop' && /insuffisance pondérale/i.test(n.text)));
  assert.ok(bas.notes.some(n => /professionnel de santé/i.test(n.text)), 'renvoie vers un professionnel');

  // SEUIL BAS : catégorie OMS jugée sur l'IMC RÉEL, pas la valeur affichée arrondie (cf. #400 pour bmiInfo).
  // 55,9 kg à 174 cm → IMC réel 18,464 (< 18,5 → insuffisance pondérale) mais arrondi à 18,5.
  // Avant : 18,5 < 18,5 faux → simple « warn » (cible très basse), la note « stop » n'était jamais émise.
  const seuilBas = av(55.9, 'athletique');
  assert.equal(seuilBas.targetBmi, 18.5, 'affichage arrondi inchangé');
  assert.equal(seuilBas.level, 'stop', 'IMC réel 18,46 < 18,5 → insuffisance pondérale');
  assert.ok(seuilBas.notes.some(n => n.tone === 'stop' && /insuffisance pondérale/i.test(n.text)));

  // SEUIL HAUT : idem sur > 27. 81,83 kg à 174 cm → IMC réel 27,027 (> 27) mais arrondi à 27,0.
  // Avant : 27,0 > 27 faux → l'avertissement « cible reste haute » sautait.
  const seuilHaut = av(81.83, 'athletique');
  assert.equal(seuilHaut.targetBmi, 27, 'affichage arrondi inchangé');
  assert.equal(seuilHaut.level, 'warn', 'IMC réel 27,03 > 27 → avertissement cible haute');
  assert.ok(seuilHaut.notes.some(n => /reste haute/i.test(n.text)));

  // LE CAS D'ADRIEN : objectif « prendre du muscle » MAIS cible = grosse perte → contradiction
  const contra = av(70, 'muscle');
  assert.equal(contra.level, 'stop');
  assert.ok(contra.notes.some(n => n.tone === 'stop' && /[Cc]ontradiction/.test(n.text)));
  assert.ok(contra.notes.some(n => /séquence|recomposition/i.test(n.text)), 'propose une porte de sortie');

  // objectif sèche mais cible en prise → contradiction inverse
  assert.equal(av(88, 'seche').level, 'stop');

  // perte importante avec objectif endurance → avertissement sur les performances
  const endur = av(70, 'endurance');   // 11 kg = 13,6 % du poids
  assert.equal(endur.level, 'warn');
  assert.ok(endur.notes.some(n => /performances/i.test(n.text)));

  // cible = poids actuel → recomposition
  const maint = av(81, 'athletique');
  assert.equal(maint.direction, 'maintien');
  assert.equal(maint.weeks, 0);
  assert.ok(maint.notes.some(n => /recomposition/i.test(n.text)));

  // prise de masse cohérente avec l'objectif muscle
  const prise = av(85, 'muscle');
  assert.equal(prise.direction, 'prise');
  assert.equal(prise.level, 'ok');

  // fourchette de référence (IMC 20–24,5 à 174 cm)
  assert.ok(ok.suggested.minKg > 59 && ok.suggested.minKg < 62, `min ${ok.suggested.minKg}`);
  assert.ok(ok.suggested.maxKg > 73 && ok.suggested.maxKg < 76, `max ${ok.suggested.maxKg}`);

  // entrées incomplètes → null (on ne devine pas)
  assert.equal(L.weightTargetAdvice({ weight: 81, height: 174 }), null, 'sans cible');
  assert.equal(L.weightTargetAdvice({ weight: 81, targetWeight: 75 }), null, 'sans taille');
  assert.equal(L.weightTargetAdvice(null), null);
});

test('weightTargetAdvice ↔ energyPlan : rythme et durée COHÉRENTS (même écran Coach Poids)', () => {
  // Le conseil (weightTargetAdvice) et le plan (energyPlan) sont rendus côte à côte : leur rythme
  // et leur durée estimée doivent COÏNCIDER (source unique safeLossRate). Avant : energyPlan
  // personnalisait par corpulence (0,5–0,9 %/sem) tandis que weightTargetAdvice restait à 0,6 % fixe
  // → deux durées opposées au même endroit (ex. corpulent : 21 vs 26 semaines).
  const profils = [
    { weight: 92, height: 178, age: 30, sex: 'homme', activityLevel: 'modere', sessionsPerWeek: 4, targetWeight: 78 }, // IMC 29 → 0,9 % plafonné
    { weight: 81, height: 174, age: 30, sex: 'homme', sessionsPerWeek: 4, targetWeight: 75 },                          // profil Adrien
    { weight: 68, height: 172, age: 28, sex: 'femme', activityLevel: 'actif', sessionsPerWeek: 5, targetWeight: 64 },  // sec → 0,5 %
  ];
  for (const p of profils) {
    const ep = L.energyPlan({ ...p, todayKey: '2026-07-20' });
    const wta = L.weightTargetAdvice({ weight: p.weight, targetWeight: p.targetWeight, height: p.height, age: p.age, sex: p.sex, activityLevel: p.activityLevel, sessionsPerWeek: p.sessionsPerWeek });
    assert.ok(ep && wta, 'les deux calculent');
    assert.equal(wta.direction, 'perte');
    assert.equal(wta.ratePerWeek, ep.ratePerWeek, `rythme aligné (${p.weight}→${p.targetWeight})`);
    assert.equal(wta.weeks, ep.weeks, `durée alignée (${p.weight}→${p.targetWeight})`);
  }
  // Corpulence prise en compte : un corpulent perd plus vite (rythme ≥) qu'un sujet déjà sec.
  const gros = L.weightTargetAdvice({ weight: 92, height: 178, age: 30, sex: 'homme', sessionsPerWeek: 4, targetWeight: 88 });
  const sec = L.weightTargetAdvice({ weight: 62, height: 178, age: 30, sex: 'homme', sessionsPerWeek: 4, targetWeight: 60 });
  assert.ok(gros.ratePerWeek > sec.ratePerWeek, 'rythme personnalisé par corpulence');

  // Repli sûr quand le profil est incomplet (pas d'âge → BMR/TDEE incalculables) : rythme borné, non nul.
  const repli = L.weightTargetAdvice({ weight: 90, height: 180, targetWeight: 80 });
  assert.ok(repli.ratePerWeek >= 0.25 && repli.ratePerWeek <= 0.9, 'repli ~0,6 %/sem borné');
  assert.ok(repli.weeks > 0);

  // safeLossRate : garde-fous d'élite (déficit ≤ 25 % TDEE, apport ≥ BMR).
  const r = L.safeLossRate(92, 29, 2800, 1900);
  assert.ok(r && r.deficit <= Math.round(2800 * 0.25), 'déficit plafonné à 25 % du TDEE');
  assert.ok(r.dailyTarget >= 1900, 'apport jamais sous le métabolisme de base');
  assert.equal(L.safeLossRate(0, 24, 2500, 1600), null, 'null si données invalides');
});

test('splitDuration / combineDuration : saisie d’une durée en heures + minutes', () => {
  assert.deepEqual(L.splitDuration(45), { h: 0, m: 45 });
  assert.deepEqual(L.splitDuration(90), { h: 1, m: 30 }, '1 h 30');
  assert.deepEqual(L.splitDuration(60), { h: 1, m: 0 });
  assert.deepEqual(L.splitDuration(0), { h: 0, m: 0 });
  assert.deepEqual(L.splitDuration(-10), { h: 0, m: 0 }, 'négatif → 0');
  assert.deepEqual(L.splitDuration('x'), { h: 0, m: 0 });

  assert.equal(L.combineDuration(1, 30), 90);
  assert.equal(L.combineDuration(0, 45), 45);
  assert.equal(L.combineDuration(2, 0), 120, 'heures seules');
  assert.equal(L.combineDuration('', 45), 45, 'champ heures vide');
  assert.equal(L.combineDuration(1, ''), 60, 'champ minutes vide');
  // on ne « corrige » pas l'utilisateur en silence : 1 h + 90 min = 150 min
  assert.equal(L.combineDuration(1, 90), 150);
  assert.equal(L.combineDuration(20, 0), 600, 'plafond 10 h');
  assert.equal(L.combineDuration(3, 0, 120), 120, 'plafond personnalisé');
  assert.equal(L.combineDuration(-1, -5), 0, 'négatifs → 0');

  // aller-retour : découper puis recomposer redonne la valeur d'origine (le modèle reste en minutes)
  [0, 1, 45, 60, 90, 135, 599].forEach(t => {
    const d = L.splitDuration(t);
    assert.equal(L.combineDuration(d.h, d.m), t, `aller-retour ${t} min`);
  });
});

test('guidedSnapshot : l’instantané est une COPIE, il n’aliase pas la séance vivante', () => {
  // Piège trouvé en vérifiant #310 : si l'instantané garde la référence de `workout.exercises`,
  // il mute en même temps que la séance. Toute comparaison « avant/après » compare alors l'objet
  // avec lui-même → elle ne voit jamais aucun changement, et la sauvegarde est sautée.
  const workout = { title: 'S', exercises: [{ name: 'Squat', setLogs: [{ load: 60, reps: 8, completed: false }] }] };
  const snap = L.guidedSnapshot(workout, 0, 1800000000000);
  assert.notEqual(snap.exercises, workout.exercises, 'pas la même référence de tableau');
  assert.notEqual(snap.exercises[0].setLogs, workout.exercises[0].setLogs, 'ni des séries');

  // muter la séance vivante ne doit PAS modifier l'instantané
  workout.exercises[0].setLogs[0].load = 62.5;
  assert.equal(snap.exercises[0].setLogs[0].load, 60, 'l’instantané est figé');

  // et la comparaison voit donc bien le changement
  const snap2 = L.guidedSnapshot(workout, 0, 1800000000001);
  assert.equal(L.guidedSnapshotEquals(snap, snap2), false, 'le changement est détecté');
});

test('guidedSnapshotEquals : évite de réécrire le state quand rien n’a changé', () => {
  const base = () => ({
    index: 0,
    exercises: [{ name: 'Squat', setLogs: [{ load: 60, reps: 8, completed: true }, { load: 60, reps: 0, completed: false }] }],
    rest: { total: 90, endsAt: 1800000000000 },
  });
  assert.equal(L.guidedSnapshotEquals(base(), base()), true, 'identiques');
  // `savedAt` change à CHAQUE instantané : ce n'est pas un changement métier, il ne doit pas
  // déclencher d'écriture — sinon le garde-fou ne servirait à rien.
  assert.equal(L.guidedSnapshotEquals({ ...base(), savedAt: 1 }, { ...base(), savedAt: 999 }), true);

  // toute vraie modification est bien détectée
  const chg = (f) => { const s = base(); f(s); return L.guidedSnapshotEquals(base(), s); };
  assert.equal(chg(s => { s.index = 1; }), false, 'exercice courant');
  assert.equal(chg(s => { s.exercises[0].setLogs[1].load = 62.5; }), false, 'charge saisie');
  assert.equal(chg(s => { s.exercises[0].setLogs[1].reps = 8; }), false, 'reps saisies');
  assert.equal(chg(s => { s.exercises[0].setLogs[1].completed = true; }), false, 'série validée');
  assert.equal(chg(s => { s.exercises[0].setLogs.push({ load: 0, reps: 0 }); }), false, 'série ajoutée');
  assert.equal(chg(s => { s.exercises[0].name = 'Fentes'; }), false, 'exercice remplacé');
  assert.equal(chg(s => { s.rest = null; }), false, 'repos terminé');
  assert.equal(chg(s => { s.rest.endsAt += 1000; }), false, 'repos réajusté');
  assert.equal(chg(s => { s.exercises.push({ name: 'X', setLogs: [] }); }), false, 'exercice ajouté');

  assert.equal(L.guidedSnapshotEquals(null, null), true);
  assert.equal(L.guidedSnapshotEquals(null, base()), false);
  assert.equal(L.guidedSnapshotEquals(base(), null), false);
});

test('restStart / restState : le repos suit l’horloge, pas les ticks', () => {
  const T0 = 1800000000000;
  const r = L.restStart(90, T0);
  assert.equal(r.total, 90);
  assert.equal(r.endsAt, T0 + 90000);
  assert.equal(L.restStart(0, T0).total, 1, 'plancher');
  assert.equal(L.restStart(9999, T0).total, 600, 'plafond');

  // LE POINT CLÉ : 30 s réelles écoulées → il reste 60 s, même sans qu'aucun tick n'ait eu lieu
  // (écran éteint, app en arrière-plan). L'ancien décompte, lui, se figeait.
  const s30 = L.restState(r, T0 + 30000);
  assert.equal(s30.remainingSec, 60);
  assert.equal(s30.done, false);
  assert.equal(s30.total, 90);
  assert.equal(s30.pct, L.restBarPct(60, 90), 'la barre de progression reste cohérente');

  // le repos est terminé même si l'écran est resté éteint tout du long
  assert.equal(L.restState(r, T0 + 90000).done, true);
  const long = L.restState(r, T0 + 10 * 60000);
  assert.equal(long.remainingSec, 0, 'jamais négatif');
  assert.equal(long.done, true);
  assert.equal(long.pct, 0);

  // entrées invalides
  assert.equal(L.restState(null, T0), null);
  assert.equal(L.restState([], T0), null);
  assert.equal(L.restState({ total: 90 }, T0), null, 'sans endsAt → null');
  assert.equal(L.restState({ endsAt: T0 + 1000 }, T0), null, 'sans total → null');
});

test('focusTimer : piloté par l’horloge, survit au rechargement et à l’arrière-plan', () => {
  const T0 = 1800000000000;
  const t = L.focusTimerStart(25, T0, 'Réviser la TVA');
  assert.equal(t.durationMin, 25);
  assert.equal(t.startedAt, T0);
  assert.equal(t.endsAt, T0 + 25 * 60000);
  assert.equal(t.paused, false);
  assert.equal(t.task, 'Réviser la TVA');
  assert.equal(L.focusTimerStart(0, T0).durationMin, 25, 'défaut');
  assert.equal(L.focusTimerStart(999, T0).durationMin, 180, 'plafond');

  // LE POINT CLÉ : le restant se calcule depuis l'HORLOGE, pas depuis un nombre de ticks.
  // 10 min réelles écoulées → il reste 15 min, même si l'app n'a jamais « tické »
  // (onglet en arrière-plan, app fermée…). L'ancien minuteur dérivait précisément là.
  const apres10 = L.focusTimerState(t, T0 + 10 * 60000);
  assert.equal(apres10.remainingSec, 15 * 60);
  assert.equal(apres10.elapsedSec, 10 * 60);
  assert.equal(apres10.done, false);
  assert.equal(apres10.task, 'Réviser la TVA');

  // le bloc arrive à terme même si l'app était fermée pendant tout ce temps
  assert.equal(L.focusTimerState(t, T0 + 25 * 60000).done, true);
  const depasse = L.focusTimerState(t, T0 + 3 * 3600000);
  assert.equal(depasse.remainingSec, 0, 'jamais négatif');
  assert.equal(depasse.done, true);

  // PAUSE : fige le restant ; le temps réel qui passe ne l'entame plus
  const p = L.focusTimerPause(t, T0 + 10 * 60000);
  assert.equal(p.paused, true);
  assert.equal(p.pausedSec, 15 * 60);
  const enPause = L.focusTimerState(p, T0 + 40 * 60000);   // 30 min plus tard
  assert.equal(enPause.remainingSec, 15 * 60, 'la pause ne consomme pas de temps');
  assert.equal(enPause.done, false, 'un minuteur en pause n’est jamais « terminé »');

  // REPRISE : l'horodatage de fin repart du restant figé
  const r = L.focusTimerResume(p, T0 + 40 * 60000);
  assert.equal(r.paused, false);
  assert.equal(r.endsAt, T0 + 40 * 60000 + 15 * 60000);
  assert.equal(L.focusTimerState(r, T0 + 45 * 60000).remainingSec, 10 * 60);

  // pause/reprise idempotentes
  assert.equal(L.focusTimerPause(p, T0).paused, true, 'pause d’un minuteur déjà en pause');
  assert.equal(L.focusTimerResume(t, T0).paused, false, 'reprise d’un minuteur qui tourne');

  // entrées invalides
  assert.equal(L.focusTimerState(null, T0), null);
  assert.equal(L.focusTimerState([], T0), null);
  assert.equal(L.focusTimerState({ durationMin: 25 }, T0), null, 'sans startedAt → null');
  assert.equal(L.focusTimerState({ startedAt: T0, durationMin: 0 }, T0), null);
});

test('breakSuggestion : pause proportionnelle + pause longue tous les 4 blocs', () => {
  // pause courte ~1/5 du bloc, bornée 5–20
  assert.equal(L.breakSuggestion(25, 1).breakMin, 5, '25 min → 5 min de pause');
  assert.equal(L.breakSuggestion(50, 2).breakMin, 10, '50 min → 10 min');
  assert.equal(L.breakSuggestion(90, 3).breakMin, 18, '90 min → 18 min (borné 20)');
  assert.equal(L.breakSuggestion(25, 1).long, false);
  // 4e bloc → pause longue, bornée 15–25
  const b4 = L.breakSuggestion(25, 4);
  assert.equal(b4.long, true, '4e bloc → pause longue');
  assert.equal(b4.breakMin, 15, 'pause longue plancher 15 min');
  assert.equal(L.breakSuggestion(90, 4).breakMin, 25, 'pause longue plafonnée à 25 min');
  assert.equal(L.breakSuggestion(50, 8).long, true, '8e bloc → encore une pause longue');
  assert.equal(L.breakSuggestion(50, 5).long, false, '5e bloc → pause courte');
  assert.match(b4.note, /coupure/i, 'la pause longue invite à décrocher');
  // le numéro annoncé suit le vrai compte de blocs, pas un « Quatrième » figé (2.0.205)
  assert.match(b4.note, /^4ᵉ bloc/, '4e bloc → « 4ᵉ bloc »');
  assert.match(L.breakSuggestion(50, 8).note, /^8ᵉ bloc/, '8e bloc → « 8ᵉ bloc », plus « Quatrième »');
  assert.match(L.breakSuggestion(50, 12).note, /^12ᵉ bloc/, '12e bloc → « 12ᵉ bloc »');
  assert.match(L.breakSuggestion(90, 1).note, /hydrat/i, 'bloc long → rappel hydratation');
  // entrées invalides / robustesse
  assert.equal(L.breakSuggestion(0, 1), null, 'durée nulle → null');
  assert.equal(L.breakSuggestion(-5, 1), null);
  assert.equal(L.breakSuggestion('x', 1), null);
  assert.equal(L.breakSuggestion(25, 0).long, false, 'blocs=0 traité comme 1er bloc');
  assert.equal(L.breakSuggestion(25).breakMin, 5, 'blocs absent → 1er bloc');
});

test('guidedSnapshot / resumableGuided : la séance en cours survit à une fermeture', () => {
  const T0 = 1800000000000;
  const workout = {
    title: 'Bas du corps', why: 'jambes', duration: 40,
    exercises: [
      { name: 'Squat', sets: 3, setLogs: [{ load: 60, reps: 8, completed: true }, { load: 60, reps: 8, completed: true }, { load: 0, reps: 0, completed: false }] },
      { name: 'Fentes', sets: 3, setLogs: [] },
    ],
  };
  const snap = L.guidedSnapshot(workout, 0, T0);
  assert.equal(snap.title, 'Bas du corps');
  assert.equal(snap.index, 0);
  assert.equal(snap.savedAt, T0);
  assert.equal(snap.exercises.length, 2);
  // index borné à la plage réelle
  assert.equal(L.guidedSnapshot(workout, 99, T0).index, 1);
  assert.equal(L.guidedSnapshot(workout, -5, T0).index, 0);
  // séance vide/invalide → null
  assert.equal(L.guidedSnapshot({ exercises: [] }, 0, T0), null);
  assert.equal(L.guidedSnapshot(null, 0, T0), null);

  // reprenable juste après
  const r = L.resumableGuided(snap, T0 + 12 * 60000);
  assert.equal(r.done, 2, '2 séries validées');
  assert.equal(r.total, 3, 'séries loguées');
  assert.equal(r.ageMin, 12);
  assert.equal(r.session.title, 'Bas du corps');

  // trop ancienne (> 12 h par défaut) → séance oubliée, pas une reprise
  assert.equal(L.resumableGuided(snap, T0 + 13 * 3600000), null);
  assert.ok(L.resumableGuided(snap, T0 + 13 * 3600000, 24), 'fenêtre élargie → reprenable');

  // AUCUNE série validée → rien à sauver, on ne propose pas de reprise
  const vierge = L.guidedSnapshot({ title: 'X', exercises: [{ name: 'Squat', setLogs: [{ load: 60, reps: 8, completed: false }] }] }, 0, T0);
  assert.equal(L.resumableGuided(vierge, T0 + 60000), null);

  // horodatage absent / futur / entrées invalides → null
  assert.equal(L.resumableGuided({ ...snap, savedAt: 0 }, T0), null);
  assert.equal(L.resumableGuided(snap, T0 - 60000), null, 'sauvegardée dans le futur → refusée');
  assert.equal(L.resumableGuided(null, T0), null);
  assert.equal(L.resumableGuided([], T0), null);
});

test('exerciseAlternatives : équivalents même zone, matériel dispo, sans doublon', () => {
  // On s'appuie sur la VRAIE table EXERCISE_ZONES plutôt que d'inventer une table parallèle
  // qui divergerait de la réalité : on vérifie des invariants.
  const noms = Object.keys(L.EXERCISE_ZONES);
  const cible = noms.find(n => L.exerciseZones(n).includes('back')) || noms[0];
  const zonesCible = L.exerciseZones(cible);
  const lib = noms.map(n => ({ name: n }));   // pas de `kind` → aucun matériel requis
  const alts = L.exerciseAlternatives(cible, lib, {}, [], 4);

  assert.ok(alts.length > 0, 'au moins un équivalent');
  assert.ok(alts.length <= 4, 'cap respecté');
  assert.ok(!alts.some(a => a.name === cible), 'jamais l’exercice lui-même');
  alts.forEach(a => {
    assert.ok(a.overlap > 0);
    assert.ok(a.zones.some(z => zonesCible.includes(z)), `${a.name} partage une zone avec ${cible}`);
  });
  // tri par recouvrement décroissant (le plus proche d'abord)
  for (let i = 1; i < alts.length; i++) assert.ok(alts[i - 1].overlap >= alts[i].overlap);

  // exclusion : un exercice déjà dans la séance n'est pas reproposé
  const dejaLa = alts[0].name;
  assert.ok(!L.exerciseAlternatives(cible, lib, {}, [dejaLa], 4).some(a => a.name === dejaLa));

  // matériel : `kind` doit être la clé EXACTE de EQUIP_KIND_REQ (libellé FR capitalisé),
  // sinon exerciseAvailable considère qu'aucun matériel n'est requis.
  const voisin = alts[0].name;   // partage déjà une zone avec la cible
  const libKb = [{ name: voisin, kind: 'Kettlebell' }];
  assert.equal(L.exerciseAlternatives(cible, libKb, { kettlebell: false }, [], 4).length, 0, 'sans kettlebell → écarté');
  assert.equal(L.exerciseAlternatives(cible, libKb, { kettlebell: true }, [], 4).length, 1, 'avec kettlebell → proposé');

  // exercice inconnu / bibliothèque vide → []
  assert.deepEqual(L.exerciseAlternatives('Exercice inexistant', lib, {}, [], 4), []);
  assert.deepEqual(L.exerciseAlternatives(cible, [], {}, [], 4), []);
  assert.deepEqual(L.exerciseAlternatives(cible, null, {}, [], 4), []);
});

test('liveSetRecord : record détecté dès la validation de la série', () => {
  const prior = { 'Développé couché': { load: 40, reps: 10 }, 'Tractions': { load: 0, reps: 8 } };
  // record de CHARGE
  assert.deepEqual(
    L.liveSetRecord(prior, 'Développé couché', { load: 42.5, reps: 8 }, []),
    { type: 'load', value: 42.5, previous: 40 }
  );
  // record de REPS (même charge)
  assert.deepEqual(
    L.liveSetRecord(prior, 'Développé couché', { load: 40, reps: 11 }, []),
    { type: 'reps', value: 11, previous: 10 }
  );
  // poids du corps : seules les reps comptent
  assert.deepEqual(L.liveSetRecord(prior, 'Tractions', { load: 0, reps: 9 }, []), { type: 'reps', value: 9, previous: 8 });
  assert.equal(L.liveSetRecord(prior, 'Tractions', { load: 0, reps: 8 }, []), null, 'égaler n’est pas battre');
  // série en dessous → rien
  assert.equal(L.liveSetRecord(prior, 'Développé couché', { load: 40, reps: 10 }, []), null);
  // PAS DE DOUBLON : le record a déjà été battu à une série précédente de la même séance
  assert.equal(
    L.liveSetRecord(prior, 'Développé couché', { load: 42.5, reps: 8 }, [{ load: 42.5, reps: 8, completed: true }]),
    null,
    'record déjà annoncé à la série précédente'
  );
  // …mais on annonce si on fait ENCORE mieux dans la même séance
  assert.deepEqual(
    L.liveSetRecord(prior, 'Développé couché', { load: 45, reps: 6 }, [{ load: 42.5, reps: 8, completed: true }]),
    { type: 'load', value: 45, previous: 40 }
  );
  // PAS DE FANFARE AU PREMIER PASSAGE : aucun antécédent → rien à battre
  assert.equal(L.liveSetRecord(prior, 'Soulevé de terre', { load: 100, reps: 5 }, []), null);
  assert.equal(L.liveSetRecord({ 'Squat': { load: 0, reps: 0 } }, 'Squat', { load: 60, reps: 8 }, []), null);
  // une série à 0 rep n'est pas une série
  assert.equal(L.liveSetRecord(prior, 'Développé couché', { load: 60, reps: 0 }, []), null);
  // entrées invalides
  assert.equal(L.liveSetRecord(null, 'Développé couché', { load: 50, reps: 10 }, []), null);
  assert.equal(L.liveSetRecord(prior, '', { load: 50, reps: 10 }, []), null);
});

test('adjustGuidedSets : ajouter/retirer une série pendant la séance', () => {
  // ajout simple
  assert.deepEqual(L.adjustGuidedSets({ sets: 3, setLogs: [] }, 1), { sets: 4, changed: true, reason: 'added' });
  // retrait simple (dernière série non validée)
  assert.deepEqual(
    L.adjustGuidedSets({ sets: 3, setLogs: [{ completed: true }, { completed: true }, { completed: false }] }, -1),
    { sets: 2, changed: true, reason: 'removed' }
  );
  // REFUS de retirer une série déjà validée : on ne jette pas du travail fait en silence
  assert.deepEqual(
    L.adjustGuidedSets({ sets: 3, setLogs: [{ completed: true }, { completed: true }, { completed: true }] }, -1),
    { sets: 3, changed: false, reason: 'completed' }
  );
  // bornes
  assert.deepEqual(L.adjustGuidedSets({ sets: 1, setLogs: [] }, -1), { sets: 1, changed: false, reason: 'min' });
  assert.deepEqual(L.adjustGuidedSets({ sets: 8, setLogs: [] }, 1), { sets: 8, changed: false, reason: 'max' });
  // bornes personnalisables
  assert.deepEqual(L.adjustGuidedSets({ sets: 5, setLogs: [] }, 1, { max: 5 }), { sets: 5, changed: false, reason: 'max' });
  assert.deepEqual(L.adjustGuidedSets({ sets: 2, setLogs: [] }, -1, { min: 2 }), { sets: 2, changed: false, reason: 'min' });
  // delta nul
  assert.equal(L.adjustGuidedSets({ sets: 3 }, 0).reason, 'noop');
  // sets absent → traité comme 1
  assert.equal(L.adjustGuidedSets({ setLogs: [] }, 1).sets, 2);
  // sets hors bornes dans l'entrée → ramené dans les bornes avant ajustement
  assert.equal(L.adjustGuidedSets({ sets: 99, setLogs: [] }, 1).reason, 'max');
  // exercice invalide → null
  assert.equal(L.adjustGuidedSets(null, 1), null);
});

test('lastExerciseSession : les séries réellement loguées au dernier passage', () => {
  const today = '2026-07-10';
  const workouts = [
    { date: '2026-07-01', exercises: [{ name: 'Développé couché', setLogs: [{ load: 35, reps: 10, completed: true }] }] },
    { date: '2026-07-06', exercises: [
      { name: 'Squat', setLogs: [{ load: 60, reps: 8, completed: true }] },
      { name: 'Développé couché', setLogs: [
        { load: 40, reps: 10, completed: true },
        { load: 40, reps: 10, completed: true },
        { load: 40, reps: 8, completed: true },
        { load: 0, reps: 0, completed: false },   // série non effectuée → ignorée
      ] },
    ] },
  ];
  const r = L.lastExerciseSession(workouts, 'Développé couché', today);
  assert.equal(r.date, '2026-07-06', 'la séance la plus récente, pas la première trouvée');
  assert.equal(r.daysAgo, 4);
  assert.equal(r.sets.length, 3, 'la série à 0 rep est ignorée');
  assert.deepEqual(r.sets[0], { load: 40, reps: 10 });
  assert.deepEqual(r.topSet, { load: 40, reps: 10 });
  assert.equal(r.totalReps, 28);
  assert.equal(r.tonnage, 40 * 10 + 40 * 10 + 40 * 8); // 1120
  // autre exercice de la même séance
  assert.equal(L.lastExerciseSession(workouts, 'Squat', today).topSet.load, 60);
  // repli : ancienne séance sans setLogs → reconstruit depuis {load, reps, sets}
  const legacy = [{ date: '2026-07-05', exercises: [{ name: 'Tractions', load: 0, reps: 6, sets: 3 }] }];
  const lg = L.lastExerciseSession(legacy, 'Tractions', today);
  assert.equal(lg.sets.length, 3);
  assert.equal(lg.totalReps, 18);
  assert.equal(lg.tonnage, 0, 'poids du corps → tonnage nul');
  // repli sur l'ancien format plat (w.exercise)
  const flat = [{ date: '2026-07-04', exercise: 'Rowing', load: 30, reps: 12, sets: 2 }];
  assert.equal(L.lastExerciseSession(flat, 'Rowing', today).tonnage, 720);
  // exercice jamais fait / entrées invalides → null
  assert.equal(L.lastExerciseSession(workouts, 'Soulevé de terre', today), null);
  assert.equal(L.lastExerciseSession([], 'Squat', today), null);
  assert.equal(L.lastExerciseSession(workouts, '', today), null);
  assert.equal(L.lastExerciseSession(null, 'Squat', today), null);
});

test('logLifeStep : journalise le pas du jour avant son écrasement', () => {
  let log = [];
  log = L.logLifeStep(log, { date: '2026-07-08', text: 'Appeler mamie', done: true });
  log = L.logLifeStep(log, { date: '2026-07-09', text: '  Ranger le bureau  ', done: false }); // trim
  assert.deepEqual(log, [
    { date: '2026-07-08', text: 'Appeler mamie', done: true },
    { date: '2026-07-09', text: 'Ranger le bureau', done: false },
  ]);
  // idempotent : réécrit l'entrée d'une date déjà journalisée (ex. pas validé après coup)
  log = L.logLifeStep(log, { date: '2026-07-09', text: 'Ranger le bureau', done: true });
  assert.equal(log.length, 2);
  assert.equal(log[1].done, true);
  // trié même si journalisé dans le désordre
  log = L.logLifeStep(log, { date: '2026-07-07', text: 'Écrire une lettre', done: false });
  assert.deepEqual(log.map(e => e.date), ['2026-07-07', '2026-07-08', '2026-07-09']);
  // pas sans texte → rien à journaliser
  assert.equal(L.logLifeStep([], { date: '2026-07-10', text: '', done: false }).length, 0);
  assert.equal(L.logLifeStep([], { date: '2026-07-10', text: '   ', done: true }).length, 0);
  // entrées invalides → journal inchangé
  assert.deepEqual(L.logLifeStep([{ date: '2026-07-08', text: 'X', done: true }], { date: 'bad', text: 'Y' }), [{ date: '2026-07-08', text: 'X', done: true }]);
  assert.deepEqual(L.logLifeStep([], null), []);
});

test('lifeStepStats : série et taux de suivi des pas du jour', () => {
  const today = '2026-07-10';
  // le journal ne contient QUE les jours passés
  const log = [
    { date: '2026-07-06', text: 'Écrire', done: false },  // non tenu → casse la série avant
    { date: '2026-07-07', text: 'Appeler', done: true },
    { date: '2026-07-08', text: 'Ranger', done: true },
    { date: '2026-07-09', text: 'Trier', done: true },
  ];
  // pas du jour posé ET tenu → la série inclut aujourd'hui = 4
  const done = L.lifeStepStats(log, today, { date: today, text: 'Méditer', done: true });
  assert.equal(done.streak, 4);
  assert.equal(done.doneDays, 4);
  assert.equal(done.loggedDays, 5);
  assert.equal(done.rate, 80);
  assert.deepEqual(done.lastDone, { date: today, text: 'Méditer', daysAgo: 0 });
  // pas du jour posé mais PAS encore tenu → grâce de dailyStreak : la série repart d'hier = 3
  const pending = L.lifeStepStats(log, today, { date: today, text: 'Méditer', done: false });
  assert.equal(pending.streak, 3);
  assert.equal(pending.doneDays, 3);
  assert.equal(pending.loggedDays, 5, 'le pas du jour compte dès qu’il a un texte');
  assert.equal(pending.lastDone.date, '2026-07-09');
  assert.equal(pending.lastDone.daysAgo, 1);
  // aucun pas posé aujourd'hui → le jour ne compte pas
  const none = L.lifeStepStats(log, today, { date: today, text: '', done: false });
  assert.equal(none.loggedDays, 4);
  assert.equal(none.streak, 3);
  // journal vide
  const empty = L.lifeStepStats([], today, null);
  assert.deepEqual(empty, { streak: 0, doneDays: 0, loggedDays: 0, rate: 0, lastDone: null });
  assert.equal(L.lifeStepStats(null, today, null).streak, 0);
  // le texte du DERNIER pas passé est normalisé comme celui du jour : trim + troncature à 140,
  // sans quoi un pas passé très long s'affichait en entier alors que celui du jour était tronqué
  const longText = '  ' + 'z'.repeat(200) + '  ';
  const longPast = L.lifeStepStats([{ date: '2026-07-09', text: longText, done: true }], today, null);
  assert.equal(longPast.lastDone.text.length, 140, 'le pas passé est tronqué à 140 comme celui du jour');
  assert.equal(longPast.lastDone.text, 'z'.repeat(140), 'trim appliqué avant la troncature (pas d’espaces de tête/queue)');
  // date EN DOUBLE (import/restauration : lifeStepLog n'est pas dédupliqué par normalizeState) →
  // on compte des JOURS distincts, pas des entrées ; dernier gagné, comme logLifeStep à l'écriture.
  const dupLog = [
    { date: '2026-07-07', text: 'Appeler', done: true },
    { date: '2026-07-08', text: 'Ranger', done: true },
    { date: '2026-07-08', text: 'Ranger (réécrit)', done: false },  // 08 réécrit NON tenu → dernier gagne
    { date: '2026-07-09', text: 'Trier', done: true },
  ];
  const dup = L.lifeStepStats(dupLog, today, null);
  assert.equal(dup.loggedDays, 3, '3 jours distincts, pas 4 entrées');
  assert.equal(dup.doneDays, 2, 'le 08 (dernier = non tenu) ne compte plus comme tenu');
  assert.equal(dup.rate, 67, '2/3 arrondi, pas 3/4=75 ni 2/4=50');
  assert.equal(dup.streak, 1, 'série cassée au 08 non tenu (dernier gagné) : seul le 09 tient');
  // même date, dernier TENU → le jour compte une seule fois (ni doublé, ni perdu)
  const dupDone = L.lifeStepStats(
    [{ date: '2026-07-09', text: 'Trier', done: false }, { date: '2026-07-09', text: 'Trier', done: true }],
    today, null);
  assert.equal(dupDone.loggedDays, 1);
  assert.equal(dupDone.doneDays, 1);
});

test('logQuestDay : journalise une journée de quêtes avant la remise à zéro', () => {
  let log = [];
  log = L.logQuestDay(log, '2026-07-08', 3, 3);
  log = L.logQuestDay(log, '2026-07-09', 1, 4);
  assert.deepEqual(log, [{ date: '2026-07-08', done: 3, total: 3 }, { date: '2026-07-09', done: 1, total: 4 }]);
  // idempotent : réécrit l'entrée d'une date déjà journalisée
  log = L.logQuestDay(log, '2026-07-09', 4, 4);
  assert.equal(log.length, 2);
  assert.deepEqual(log[1], { date: '2026-07-09', done: 4, total: 4 });
  // toujours trié par date, même si journalisé dans le désordre
  log = L.logQuestDay(log, '2026-07-07', 2, 2);
  assert.deepEqual(log.map(e => e.date), ['2026-07-07', '2026-07-08', '2026-07-09']);
  // aucune quête ce jour-là → rien à journaliser
  assert.equal(L.logQuestDay([], '2026-07-10', 0, 0).length, 0);
  // done borné à total, valeurs négatives ramenées à 0
  assert.deepEqual(L.logQuestDay([], '2026-07-10', 9, 3)[0], { date: '2026-07-10', done: 3, total: 3 });
  assert.deepEqual(L.logQuestDay([], '2026-07-10', -5, 3)[0], { date: '2026-07-10', done: 0, total: 3 });
  // date invalide → journal inchangé
  assert.deepEqual(L.logQuestDay([{ date: '2026-07-08', done: 1, total: 2 }], 'bad', 1, 2), [{ date: '2026-07-08', done: 1, total: 2 }]);
  // cap
  assert.equal(L.logQuestDay(Array.from({ length: 40 }, (_, i) => ({ date: `2026-05-${String(i + 1).padStart(2, '0')}`, done: 1, total: 1 })), '2026-07-10', 1, 1, 30).length, 30);
});

test('questPerfectStreak : série de journées « toutes quêtes validées »', () => {
  const today = '2026-07-10';
  // le journal ne contient QUE les jours passés — l'état du jour est passé à part
  const log = [
    { date: '2026-07-07', done: 2, total: 2 },  // parfaite
    { date: '2026-07-08', done: 3, total: 3 },  // parfaite
    { date: '2026-07-09', done: 3, total: 3 },  // parfaite
    { date: '2026-07-06', done: 1, total: 4 },  // imparfaite → casse la série avant
    { date: '2026-07-05', done: 0, total: 0 },  // aucune quête → ignorée
  ];
  // aujourd'hui : 4/4 validées → la série inclut aujourd'hui = 4
  const withToday = L.questPerfectStreak(log, today, 4, 4);
  assert.equal(withToday.streak, 4, '07, 08, 09 + aujourd’hui');
  assert.equal(withToday.perfectDays, 4);
  assert.equal(withToday.loggedDays, 5); // 4 jours à quêtes dans le log + aujourd'hui
  assert.equal(withToday.rate, 80);
  // aujourd'hui incomplet → grâce de dailyStreak : la série repart d'hier = 3
  const partial = L.questPerfectStreak(log, today, 2, 4);
  assert.equal(partial.streak, 3);
  assert.equal(partial.perfectDays, 3);
  // aucune quête aujourd'hui → le jour ne compte pas dans loggedDays
  assert.equal(L.questPerfectStreak(log, today, 0, 0).loggedDays, 4);
  // une entrée du log portant la date du jour est ignorée au profit de l'état live
  const dupToday = L.questPerfectStreak([...log, { date: today, done: 0, total: 4 }], today, 4, 4);
  assert.equal(dupToday.streak, 4, 'l’état live du jour prime sur une entrée de journal du même jour');
  // journal vide
  assert.deepEqual(L.questPerfectStreak([], today, 0, 0), { streak: 0, perfectDays: 0, loggedDays: 0, rate: 0 });
  assert.equal(L.questPerfectStreak(null, today, 0, 0).streak, 0);
  // date EN DOUBLE (import/restauration : questLog n'est pas dédupliqué par normalizeState) → on
  // compte des JOURS distincts, pas des entrées. Le 08 apparaît deux fois, dernier gagné (imparfait).
  const dupDay = [
    { date: '2026-07-07', done: 2, total: 2 },  // parfaite
    { date: '2026-07-08', done: 3, total: 3 },  // parfaite…
    { date: '2026-07-08', done: 1, total: 3 },  // …mais réécrite imparfaite (dernier gagne)
    { date: '2026-07-06', done: 4, total: 4 },  // parfaite
  ];
  const dup = L.questPerfectStreak(dupDay, today, 4, 4);
  // AVANT le correctif : perfectDays 4, loggedDays 5 (le 08 compté deux fois), rate 80.
  assert.equal(dup.loggedDays, 4, '3 jours distincts au journal + aujourd’hui');
  assert.equal(dup.perfectDays, 3, '07, 06 + aujourd’hui (le 08 est imparfait au dernier log)');
  assert.equal(dup.rate, 75);
  // doublon d'un jour PARFAIT : ni perfectDays ni loggedDays ne doivent doubler ce jour
  const dupPerfect = [
    { date: '2026-07-08', done: 3, total: 3 },
    { date: '2026-07-08', done: 3, total: 3 },  // même jour, parfait deux fois
    { date: '2026-07-06', done: 1, total: 4 },  // imparfaite
  ];
  const dp = L.questPerfectStreak(dupPerfect, today, 0, 0);
  assert.equal(dp.loggedDays, 2, '2 jours distincts (08, 06)');
  assert.equal(dp.perfectDays, 1, 'seul le 08, compté une fois');
  assert.equal(dp.rate, 50);
});

test('intentionFollowThrough : intention du matin → victoire du soir', () => {
  const today = '2026-07-10';
  const rituals = [
    { date: '2026-07-09', intention: 'Finir le chapitre 3' },   // tenue (victoire ce jour-là)
    { date: '2026-07-08', intention: 'Sortie longue' },         // tenue
    { date: '2026-07-07', intention: 'Réviser la TVA' },        // NON tenue (pas de victoire)
    { date: '2026-07-10', intention: 'Intention du jour' },     // AUJOURD'HUI → exclu (soir pas écrit)
    { date: '2026-07-06', intention: '   ' },                   // vide → exclue
    { date: '2026-06-01', intention: 'Trop ancienne' },         // hors fenêtre 14 j
  ];
  const reflections = [
    { date: '2026-07-09', win: 'Chapitre 3 bouclé' },
    { date: '2026-07-08', win: '18 km' },
    { date: '2026-07-07', win: '   ' },                          // victoire vide → ne compte pas
    { date: '2026-07-05', win: 'Victoire sans intention' },      // pas d'intention ce jour → ignorée
  ];
  const r = L.intentionFollowThrough(rituals, reflections, today);
  assert.equal(r.total, 3, 'aujourd’hui exclu, vide exclue, hors fenêtre exclue');
  assert.equal(r.kept, 2);
  assert.equal(r.rate, 67);                                      // 2/3
  assert.equal(r.pairs[0].date, '2026-07-09');                   // plus récent d’abord
  assert.equal(r.pairs[0].intention, 'Finir le chapitre 3');
  assert.equal(r.pairs[0].win, 'Chapitre 3 bouclé');
  assert.equal(r.pairs[0].kept, true);
  assert.equal(r.pairs[2].kept, false);                          // le 07 : intention sans victoire
  assert.equal(r.pairs[2].win, null);
  // le jour courant n'est jamais compté, même avec une victoire déjà écrite
  const withToday = L.intentionFollowThrough(rituals, [...reflections, { date: '2026-07-10', win: 'Déjà gagné' }], today);
  assert.equal(withToday.total, 3, 'le jour courant reste exclu du taux');
  // cap sur les paires affichées, mais le taux porte sur tout
  const capped = L.intentionFollowThrough(rituals, reflections, today, { cap: 1 });
  assert.equal(capped.pairs.length, 1); assert.equal(capped.total, 3);
  // aucune intention exploitable → null
  assert.equal(L.intentionFollowThrough([], reflections, today), null);
  assert.equal(L.intentionFollowThrough(rituals, reflections, 'pas-une-date'), null);
  assert.equal(L.intentionFollowThrough(null, null, today), null);
});

test('recentFocusOutcomes : « ce qui a avancé » des blocs de focus', () => {
  const today = '2026-07-10';
  const reviews = [
    { id: 1, date: '2026-07-08', outcome: 'Plan de la présentation prêt', next: 'x' },
    { id: 2, date: '2026-07-10', outcome: '  Chapitre 2 relu  ', next: '' },   // AUJOURD'HUI → inclus (trim)
    { id: 3, date: '2026-07-10', outcome: 'Exercices corrigés', next: '' },     // 2e bloc le MÊME jour → inclus
    { id: 4, date: '2026-07-09', outcome: '   ', next: 'juste une action' },    // outcome vide → exclu
    { id: 5, date: '2026-07-09', next: 'sans outcome' },                        // pas d'outcome → exclu
    { id: 6, date: '2026-01-01', outcome: 'Trop ancien' },                      // hors fenêtre 30 j
    { id: 7, date: 'bad', outcome: 'Date invalide' },
  ];
  const r = L.recentFocusOutcomes(reviews, today);
  assert.equal(r.length, 3, 'les deux blocs du jour + celui du 08');
  // à date égale, l'id le plus grand d'abord (bloc le plus récent)
  assert.equal(r[0].outcome, 'Exercices corrigés'); assert.equal(r[0].daysAgo, 0);
  assert.equal(r[1].outcome, 'Chapitre 2 relu');    assert.equal(r[1].daysAgo, 0);
  assert.equal(r[2].outcome, 'Plan de la présentation prêt'); assert.equal(r[2].daysAgo, 2);
  // cap
  assert.equal(L.recentFocusOutcomes(reviews, today, { cap: 2 }).length, 2);
  // fenêtre élargie → le vieux remonte
  assert.equal(L.recentFocusOutcomes(reviews, today, { days: 365 }).length, 4);
  // entrées invalides
  assert.deepEqual(L.recentFocusOutcomes([], today), []);
  assert.deepEqual(L.recentFocusOutcomes(reviews, 'pas-une-date'), []);
  assert.deepEqual(L.recentFocusOutcomes(null, today), []);
});

test('recentLessons : leçons passées du rituel du soir', () => {
  const today = '2026-07-10';
  const refl = [
    { date: '2026-07-08', win: 'Séance faite', lesson: 'Commencer tôt évite la fatigue' },
    { date: '2026-07-09', win: 'Chapitre fini', lesson: '  Couper les notifs marche  ' }, // trim
    { date: '2026-07-10', lesson: 'Leçon du jour' },      // aujourd'hui → exclue
    { date: '2026-07-07', win: 'Victoire sans leçon' },   // pas de lesson → exclue
    { date: '2026-07-06', lesson: '   ' },                // vide après trim → exclue
  ];
  const r = L.recentLessons(refl, today);
  assert.equal(r.length, 2);
  assert.equal(r[0].lesson, 'Couper les notifs marche'); // 09 avant 08
  assert.equal(r[0].daysAgo, 1);
  assert.equal(r[1].lesson, 'Commencer tôt évite la fatigue');
  assert.equal(r[1].daysAgo, 2);
  // win et lesson sont indépendants : le 07 a une victoire mais pas de leçon
  assert.equal(L.recentWins(refl, today).length, 3);
  assert.deepEqual(L.recentLessons(null, today), []);
  assert.deepEqual(L.recentLessons(refl, 'pas-une-date'), []);
});

test('recentReflectionNotes : helper générique sur n’importe quel champ texte', () => {
  const today = '2026-07-10';
  const refl = [{ date: '2026-07-09', tomorrow: 'Réviser le chap. 4' }, { date: '2026-07-08', tomorrow: '' }];
  const r = L.recentReflectionNotes(refl, 'tomorrow', today);
  assert.equal(r.length, 1);
  assert.equal(r[0].text, 'Réviser le chap. 4');
  assert.equal(r[0].daysAgo, 1);
  // champ absent / vide → []
  assert.deepEqual(L.recentReflectionNotes(refl, '', today), []);
  assert.deepEqual(L.recentReflectionNotes(refl, 'inexistant', today), []);
});

test('completeDaysStreak : série de journées complètes (≥ seuil de domaines)', () => {
  const today = '2026-07-10';
  const days = [
    { date: '2026-07-10', count: 5 }, { date: '2026-07-09', count: 4 }, { date: '2026-07-08', count: 6 }, // 3 jours complets d'affilée
    { date: '2026-07-07', count: 2 }, // trou (sous le seuil 4)
    { date: '2026-07-06', count: 5 },
  ];
  assert.equal(L.completeDaysStreak(days, 4, today), 3);
  // seuil plus élevé → série plus courte (seul le 08 a ≥6, mais pas consécutif avec aujourd'hui)
  assert.equal(L.completeDaysStreak(days, 6, today), 0, 'aujourd’hui < 6 et 08 non contigu');
  // seuil par défaut = 4
  assert.equal(L.completeDaysStreak(days, null, today), 3);
  // grâce : aujourd'hui incomplet mais hier + avant-hier complets → 2
  const grace = [{ date: '2026-07-10', count: 1 }, { date: '2026-07-09', count: 5 }, { date: '2026-07-08', count: 4 }];
  assert.equal(L.completeDaysStreak(grace, 4, today), 2);
  assert.equal(L.completeDaysStreak([], 4, today), 0);
  assert.equal(L.completeDaysStreak(null, 4, today), 0);
});

test('weeklyWorkoutStreak : semaines consécutives avec séance, grâce semaine en cours', () => {
  // aujourd'hui = vendredi 10/07/2026 (semaine lundi 06/07)
  const today = '2026-07-10';
  // séances cette semaine + les 2 précédentes → 3
  assert.equal(L.weeklyWorkoutStreak([
    { date: '2026-07-08' }, { date: '2026-07-01' }, { date: '2026-06-24' },
  ], today), 3);
  // rien cette semaine mais 2 semaines avant → grâce → 2
  assert.equal(L.weeklyWorkoutStreak([
    { date: '2026-07-01' }, { date: '2026-06-24' },
  ], today), 2);
  // trou (cette semaine + il y a 2 semaines, semaine dernière manquante) → 1
  assert.equal(L.weeklyWorkoutStreak([
    { date: '2026-07-08' }, { date: '2026-06-24' },
  ], today), 1);
  // rien du tout / entrées invalides
  assert.equal(L.weeklyWorkoutStreak([], today), 0);
  assert.equal(L.weeklyWorkoutStreak('nope', today), 0);
});

test('daysUntil : jours entre deux dates, négatif si passé', () => {
  assert.equal(L.daysUntil('2026-07-10', '2026-07-20'), 10);
  assert.equal(L.daysUntil('2026-07-10', '2026-07-10'), 0);
  assert.equal(L.daysUntil('2026-07-20', '2026-07-10'), -10);
  assert.equal(L.daysUntil('pas-une-date', '2026-07-10'), null);
});

test('upcomingKeyDates : examen + course triés dans l’horizon', () => {
  const exam = { title: 'BTS CG', date: '2026-07-25' }, race = { date: '2026-07-15' };
  const r = L.upcomingKeyDates(exam, race, '2026-07-10', 60);
  assert.equal(r.length, 2);
  assert.equal(r[0].kind, 'race'); assert.equal(r[0].daysLeft, 5); // course plus proche
  assert.equal(r[1].kind, 'exam'); assert.equal(r[1].daysLeft, 15);
  // hors horizon exclu
  assert.equal(L.upcomingKeyDates({ date: '2027-01-01' }, null, '2026-07-10', 60).length, 0);
  // date passée exclue
  assert.equal(L.upcomingKeyDates({ date: '2026-07-01' }, null, '2026-07-10', 60).length, 0);
  assert.deepEqual(L.upcomingKeyDates(null, null, '2026-07-10', 60), []);
  // P6.2 : modèle multi-épreuves examGoals[] — chaque épreuve à venir devient une puce, triées par proximité
  const multi = L.upcomingKeyDates(
    [{ title: 'Droit', date: '2026-07-25' }, { title: 'Compta', date: '2026-07-12' }, { title: 'Passée', date: '2026-06-01' }],
    { date: '2026-07-15' }, '2026-07-10', 60);
  assert.deepEqual(multi.map(m => m.label), ['Compta', 'Course objectif', 'Droit'], 'Compta J-2, course J-5, Droit J-15 ; épreuve passée exclue');
  // deux épreuves le MÊME jour → départage stable par libellé (déterministe)
  const sameDay = L.upcomingKeyDates([{ title: 'Zzz', date: '2026-07-20' }, { title: 'Aaa', date: '2026-07-20' }], null, '2026-07-10', 60);
  assert.deepEqual(sameDay.map(m => m.label), ['Aaa', 'Zzz']);
  assert.deepEqual(L.upcomingKeyDates([], null, '2026-07-10', 60), [], 'liste vide → rien');
});

test('upcomingPriorityItems : échéances agenda prioritaires à venir', () => {
  const agenda = [
    { kind: 'study', priority: 'high', date: '2026-07-20', title: 'Rendu dossier CG', completed: false },
    { kind: 'life', priority: 'high', date: '2026-07-13', title: 'Contrôle blanc', completed: false },
    { kind: 'study', priority: 'high', date: '2026-07-18', title: 'Fait', completed: true }, // fait → exclu
    { kind: 'sport', priority: 'normal', date: '2026-07-14', title: 'Séance', completed: false }, // pas high → exclu
    { kind: 'life', priority: 'high', date: '2026-07-05', title: 'Passé', completed: false }, // passé → exclu
    { kind: 'life', priority: 'high', date: '2026-12-01', title: 'Trop loin', completed: false }, // hors horizon → exclu
  ];
  const r = L.upcomingPriorityItems(agenda, '2026-07-10', 30, 3);
  assert.equal(r.length, 2);
  assert.equal(r[0].title, 'Contrôle blanc'); assert.equal(r[0].daysLeft, 3); // plus proche
  assert.equal(r[1].title, 'Rendu dossier CG'); assert.equal(r[1].daysLeft, 10);
  // limite respectée
  assert.equal(L.upcomingPriorityItems(agenda, '2026-07-10', 365, 1).length, 1);
  // entrées invalides
  assert.deepEqual(L.upcomingPriorityItems(null, '2026-07-10', 30, 3), []);
  assert.deepEqual(L.upcomingPriorityItems(agenda, 'x', 30, 3), []);
});

test('keyDateMarkers : examen et course sur un jour donné', () => {
  const exam = { title: 'BTS CG', date: '2026-05-15' }, race = { date: '2026-06-01' };
  assert.deepEqual(L.keyDateMarkers(exam, race, '2026-05-15'), [{ kind: 'exam', label: 'BTS CG' }]);
  assert.deepEqual(L.keyDateMarkers(exam, race, '2026-06-01'), [{ kind: 'race', label: 'Course' }]);
  assert.deepEqual(L.keyDateMarkers(exam, race, '2026-07-10'), [], 'autre jour → rien');
  // les deux le même jour
  assert.equal(L.keyDateMarkers({ date: '2026-05-15' }, { date: '2026-05-15' }, '2026-05-15').length, 2);
  assert.deepEqual(L.keyDateMarkers(null, null, '2026-05-15'), []);
  // P6.2 : modèle multi-épreuves examGoals[] — un marqueur par épreuve tombant ce jour
  const goals = [{ title: 'Droit', date: '2026-05-15' }, { title: 'Compta', date: '2026-05-15' }, { title: 'Anglais', date: '2026-06-20' }];
  assert.deepEqual(L.keyDateMarkers(goals, null, '2026-05-15'), [{ kind: 'exam', label: 'Droit' }, { kind: 'exam', label: 'Compta' }]);
  assert.deepEqual(L.keyDateMarkers(goals, null, '2026-06-20'), [{ kind: 'exam', label: 'Anglais' }]);
  assert.deepEqual(L.keyDateMarkers([], null, '2026-05-15'), [], 'liste vide → rien');
});

test('studyStats : total / faites / à venir des révisions', () => {
  const agenda = [
    { kind: 'study', date: '2026-07-05', completed: true },
    { kind: 'study', date: '2026-07-12', completed: false },  // à venir
    { kind: 'study', date: '2026-07-08', completed: false },  // passée non faite → pas "à venir"
    { kind: 'sport', date: '2026-07-12', completed: false },  // pas une révision
  ];
  const s = L.studyStats(agenda, '2026-07-10');
  assert.equal(s.total, 3); assert.equal(s.done, 1); assert.equal(s.upcoming, 1);
  assert.deepEqual(L.studyStats([], '2026-07-10'), { total: 0, done: 0, upcoming: 0 });
  assert.deepEqual(L.studyStats('x', '2026-07-10'), { total: 0, done: 0, upcoming: 0 });
});

test('examReminderDue : rappel aux paliers J-30/14/7/3/1/0', () => {
  const g = { title: 'BTS CG', date: '2026-05-15' };
  assert.match(L.examReminderDue(g, '2026-05-08'), /dans 7 jours/);
  assert.match(L.examReminderDue(g, '2026-05-14'), /demain/);
  assert.match(L.examReminderDue(g, '2026-05-15'), /aujourd/);
  assert.equal(L.examReminderDue(g, '2026-05-10'), null, 'J-5 n’est pas un palier');
  assert.equal(L.examReminderDue(g, '2026-05-16'), null, 'passé → null');
  assert.equal(L.examReminderDue({ date: '' }, '2026-05-08'), null);
});

test('examCountdown : J-XX vers la date d’examen', () => {
  const c = L.examCountdown({ title: 'BTS CG', date: '2026-07-20' }, '2026-07-10');
  assert.equal(c.daysLeft, 10); assert.equal(c.weeksLeft, 1); assert.equal(c.past, false); assert.equal(c.title, 'BTS CG');
  const past = L.examCountdown({ date: '2026-07-01' }, '2026-07-10');
  assert.equal(past.past, true); assert.equal(past.daysLeft, -9); assert.equal(past.title, 'Examen');
  assert.equal(L.examCountdown({ date: '' }, '2026-07-10'), null, 'pas de date → null');
  assert.equal(L.examCountdown(null, '2026-07-10'), null);
});
test('nearestExam : l’épreuve la plus proche (P6.2)', () => {
  const list = [
    { id: 'a', title: 'Droit', date: '2026-06-30' },
    { id: 'b', title: 'Compta', date: '2026-06-12' },
    { id: 'c', title: 'Éco', date: '2026-05-01' }, // passé au 2026-06-01
  ];
  assert.equal(L.nearestExam(list, '2026-06-01').id, 'b', 'à venir : la plus proche (Compta)');
  // toutes passées → la plus récemment passée
  assert.equal(L.nearestExam(list, '2026-07-15').id, 'a', 'toutes passées → la plus récente (Droit)');
  // départage stable par titre à date égale
  const tie = [{ title: 'Zoo', date: '2026-06-12' }, { title: 'Anglais', date: '2026-06-12' }];
  assert.equal(L.nearestExam(tie, '2026-06-01').title, 'Anglais', 'date égale → tri alpha stable');
  // objet unique toléré, entrées invalides écartées, aucune datée → null
  assert.equal(L.nearestExam({ title: 'BTS', date: '2026-06-15' }, '2026-06-01').title, 'BTS');
  assert.equal(L.nearestExam([{ date: '' }, null, 5], '2026-06-01'), null, 'aucune épreuve datée → null');
  assert.equal(L.nearestExam(list, 'pas-une-date'), null, 'todayKey invalide → null');
});
test('examCountdown/examReminderDue/studyPacing acceptent examGoals[] (P6.2)', () => {
  const exams = [
    { title: 'Droit', date: '2026-07-25' },
    { title: 'Compta', date: '2026-07-12' }, // la plus proche au 2026-07-05
  ];
  // examCountdown vise la plus proche (Compta)
  const c = L.examCountdown(exams, '2026-07-05');
  assert.equal(c.title, 'Compta'); assert.equal(c.daysLeft, 7);
  // examReminderDue tombe sur le palier de la plus proche
  assert.match(L.examReminderDue(exams, '2026-07-05'), /Compta.*dans 7 jours/);
  // studyPacing calcule le rythme vers la plus proche
  const agenda = [{ kind: 'study', date: '2026-07-08', completed: false }, { kind: 'study', date: '2026-07-10', completed: false }];
  const p = L.studyPacing(agenda, exams, '2026-07-05');
  assert.equal(p.daysLeft, 7); assert.equal(p.remaining, 2);
  // liste vide → null partout (repli sûr)
  assert.equal(L.examCountdown([], '2026-07-05'), null);
});
test('normalizeExamGoal : coercion, bornes, id stable', () => {
  const g = L.normalizeExamGoal({ title: '  BTS CG — Droit  ', subject: ' Droit ', date: '2026-06-15' });
  // CORRECTIF #592 (perte de données #555) : id = date + slug du titre (plus la date seule), pour que
  // deux épreuves le même jour ne se fusionnent plus.
  assert.deepEqual(g, { id: 'exam-2026-06-15-bts-cg-droit', subject: 'Droit', title: 'BTS CG — Droit', date: '2026-06-15' });
  assert.equal(L.normalizeExamGoal({ date: 'pas-une-date' }).date, '', 'date invalide → vide');
  assert.equal(L.normalizeExamGoal({ id: '  x9 ', title: 'T', date: '2026-01-02' }).id, 'x9', 'id fourni conservé + trim');
  assert.equal(L.normalizeExamGoal({ title: 'Compta générale' }).id, 'exam-compta-generale', 'sans date → id slug du titre');
  assert.deepEqual(L.normalizeExamGoal(null), { id: '', subject: '', title: '', date: '' });
  assert.deepEqual(L.normalizeExamGoal([1, 2]), { id: '', subject: '', title: '', date: '' }, 'tableau → objet vide');
});
test('normalizeExamGoals : migration rétro-compatible examGoal → examGoals[]', () => {
  // état neuf (examGoal par défaut vide) → []
  assert.deepEqual(L.normalizeExamGoals({ examGoal: { title: '', date: '' } }), [], 'neuf → liste vide');
  assert.deepEqual(L.normalizeExamGoals({}), [], 'rien → liste vide');
  assert.deepEqual(L.normalizeExamGoals(null), [], 'null → liste vide');
  // legacy unique → premier (et seul) élément, sans perte
  const migrated = L.normalizeExamGoals({ examGoal: { title: 'BTS CG', date: '2026-06-15' } });
  assert.deepEqual(migrated, [{ id: 'exam-2026-06-15-bts-cg', subject: '', title: 'BTS CG', date: '2026-06-15' }]);
  // examGoals déjà présent → utilisé, legacy ignoré, entrées invalides écartées
  const multi = L.normalizeExamGoals({
    examGoal: { title: 'Vieux', date: '2020-01-01' },
    examGoals: [
      { id: 'a', subject: 'Droit', title: 'Épreuve 1', date: '2026-06-15' },
      { title: '', date: '' },           // vide → écartée
      { subject: 'Compta', title: 'Épreuve 2', date: '2026-06-18' },
    ],
  });
  assert.equal(multi.length, 2, 'legacy ignoré + entrée vide écartée');
  assert.deepEqual(multi[0], { id: 'a', subject: 'Droit', title: 'Épreuve 1', date: '2026-06-15' });
  assert.equal(multi[1].id, 'exam-2026-06-18-epreuve-2');
  // dédoublonnage par id
  const dup = L.normalizeExamGoals({ examGoals: [
    { id: 'x', title: 'A', date: '2026-06-15' },
    { id: 'x', title: 'B', date: '2026-06-16' },
  ] });
  assert.equal(dup.length, 1, 'même id → dédoublonné');
  // examGoals non tableau → retombe sur legacy
  assert.equal(L.normalizeExamGoals({ examGoals: 'oops', examGoal: { title: 'T', date: '2026-06-15' } }).length, 1);
});
test('upsertExamGoal / removeExamGoal / sortExamGoals : CRUD multi-épreuves (P6.3)', () => {
  // Ajout successif SANS écraser (le bug que P6.3 corrige : le formulaire remplaçait la liste)
  let list = L.upsertExamGoal([], { title: 'Compta', date: '2026-06-18' });
  list = L.upsertExamGoal(list, { title: 'Droit', date: '2026-06-15' });
  assert.equal(list.length, 2, 'deux dates distinctes → deux épreuves conservées');
  // tri par date croissante : Droit (15) avant Compta (18)
  assert.deepEqual(list.map(g => g.title), ['Droit', 'Compta'], 'triées par date croissante');
  // CORRECTIF #592 : identité = date + titre. Re-soumettre la même date avec le MÊME titre remplace.
  list = L.upsertExamGoal(list, { title: 'Droit', date: '2026-06-15' });
  assert.equal(list.length, 2, 'même date + même titre → remplacement, pas de doublon');
  // entrée vide → liste inchangée
  assert.equal(L.upsertExamGoal(list, { title: '', date: '' }).length, 2, 'entrée vide ignorée');
  // liste absente / non tableau tolérée
  assert.equal(L.upsertExamGoal(null, { title: 'Solo', date: '2026-07-01' }).length, 1, 'liste null tolérée');
  // suppression par id
  const after = L.removeExamGoal(list, 'exam-2026-06-15-droit');
  assert.deepEqual(after.map(g => g.title), ['Compta'], 'retire l’épreuve visée, garde l’autre');
  assert.equal(L.removeExamGoal(list, 'inconnu').length, 2, 'id inconnu → liste inchangée');
  assert.deepEqual(L.removeExamGoal([{ title: 'A', date: '2026-01-01' }], 'exam-2026-01-01-a'), [], 'dernière retirée → []');
  // CORRECTIF #592 (perte de données #555) : deux épreuves le MÊME jour, titres distincts → coexistent
  // (BTS CG : une écrite le matin, une l'après-midi) au lieu d'être fusionnées silencieusement.
  let sameDay = L.upsertExamGoal([], { title: 'Droit', date: '2027-05-11' });
  sameDay = L.upsertExamGoal(sameDay, { title: 'Compta', date: '2027-05-11' });
  assert.equal(sameDay.length, 2, 'deux épreuves le même jour conservées');
  assert.notEqual(sameDay[0].id, sameDay[1].id, 'ids distincts à date égale');
  // sortExamGoals : sans-date en dernier, départage alpha stable à date égale
  const sorted = L.sortExamGoals([
    { title: 'Zebre', date: '' }, { title: 'B', date: '2026-05-10' }, { title: 'A', date: '2026-05-10' },
  ]);
  assert.deepEqual(sorted.map(g => g.title), ['A', 'B', 'Zebre'], 'date puis titre, sans-date à la fin');
  assert.deepEqual(L.sortExamGoals(null), [], 'null → []');
});
test('studyPacing : rythme de révision vers l’examen', () => {
  const exam = { title: 'BTS CG', date: '2026-08-10' }; // J-28 depuis le 13/07
  // 5 révisions planifiées : 2 faites, 3 à venir → 3 restantes sur 4 semaines → 1/sem → tranquille
  const agenda = [
    { kind: 'study', date: '2026-07-06', completed: true }, { kind: 'study', date: '2026-07-09', completed: true },
    { kind: 'study', date: '2026-07-16', completed: false }, { kind: 'study', date: '2026-07-20', completed: false }, { kind: 'study', date: '2026-07-25', completed: false },
    { kind: 'sport', date: '2026-07-16' }, // ignoré (pas study)
  ];
  const p = L.studyPacing(agenda, exam, '2026-07-13');
  assert.equal(p.total, 5);
  assert.equal(p.done, 2);
  assert.equal(p.remaining, 3);
  assert.equal(p.daysLeft, 28);
  assert.equal(p.perWeek, 1);
  assert.equal(p.status, 'ahead');
  // beaucoup de révisions, peu de jours → rythme serré
  const many = Array.from({ length: 20 }, (_, i) => ({ kind: 'study', date: '2026-07-2' + (i % 9 + 1), completed: false }));
  const tight = L.studyPacing(many, { date: '2026-07-27' }, '2026-07-13'); // J-14
  assert.equal(tight.status, 'tight');
  assert.ok(tight.perWeek >= 5);
  // toutes faites → status 'done'
  const allDone = L.studyPacing([{ kind: 'study', date: '2026-07-06', completed: true }], exam, '2026-07-13');
  assert.equal(allDone.status, 'done');
  assert.equal(allDone.remaining, 0);
  // pas d'examen ou pas de révision → null
  assert.equal(L.studyPacing(agenda, null, '2026-07-13'), null);
  assert.equal(L.studyPacing([], exam, '2026-07-13'), null);
  // examen passé → null
  assert.equal(L.studyPacing(agenda, { date: '2026-07-01' }, '2026-07-13'), null);
});

test('nextTrainingSession : prochaine séance à venir, tri date puis heure', () => {
  const plans = [
    { id: 1, date: '2026-07-15', time: '18:00', type: 'Musculation' },
    { id: 2, date: '2026-07-12', time: '10:00', type: 'Course' },
    { id: 3, date: '2026-07-12', time: '08:00', type: 'Mobilité' },
    { id: 4, date: '2026-07-01', time: '18:00', type: 'Passé' },
  ];
  const r = L.nextTrainingSession(plans, '2026-07-10', 12 * 60);
  assert.equal(r.plan.id, 3, 'la plus proche = 12/07 08:00');
  assert.equal(r.daysLeft, 2);
  // même jour : une séance dont l'heure est passée est ignorée, celle à venir est gardée
  const today = [
    { id: 5, date: '2026-07-10', time: '07:00', type: 'Déjà passée' },
    { id: 6, date: '2026-07-10', time: '19:00', type: 'Ce soir' },
  ];
  const r2 = L.nextTrainingSession(today, '2026-07-10', 12 * 60);
  assert.equal(r2.plan.id, 6);
  assert.equal(r2.daysLeft, 0);
  // aucune séance future → null
  assert.equal(L.nextTrainingSession([{ id: 7, date: '2026-07-01', time: '10:00' }], '2026-07-10', 0), null);
  assert.equal(L.nextTrainingSession('pas-un-tableau', '2026-07-10', 0), null);
});

test('nextStudySession : prochaine révision non faite, tri date/heure', () => {
  const ag = [
    { id: 1, kind: 'study', title: 'Compta', date: '2026-07-12', time: '17:30' },
    { id: 2, kind: 'study', title: 'Droit', date: '2026-07-11', time: '18:00' },
    { id: 3, kind: 'sport', title: 'Muscu', date: '2026-07-11', time: '08:00' }, // pas study
    { id: 4, kind: 'study', title: 'Éco', date: '2026-07-11', time: '09:00', completed: true }, // faite → ignorée
    { id: 5, kind: 'study', title: 'Passée', date: '2026-07-05', time: '10:00' }
  ];
  const r = L.nextStudySession(ag, '2026-07-10', 12 * 60);
  assert.equal(r.title, 'Droit', 'la plus proche non faite = 11/07');
  assert.equal(r.id, 2);
  assert.equal(r.daysLeft, 1);
  // même jour : révision dont l'heure est passée ignorée
  const today = [
    { id: 6, kind: 'study', title: 'Matin', date: '2026-07-10', time: '08:00' },
    { id: 7, kind: 'study', title: 'Ce soir', date: '2026-07-10', time: '20:00' }
  ];
  const r2 = L.nextStudySession(today, '2026-07-10', 12 * 60);
  assert.equal(r2.title, 'Ce soir');
  assert.equal(r2.daysLeft, 0);
  // aucune révision future → null
  assert.equal(L.nextStudySession([{ id: 8, kind: 'study', date: '2026-07-01' }], '2026-07-10', 0), null);
  assert.equal(L.nextStudySession('x', '2026-07-10', 0), null);
});
test('missedSessions : séances sport prévues récentes non faites', () => {
  const today = '2026-07-15';
  const agenda = [
    { kind: 'sport', date: '2026-07-13', title: '🏋️ Haut du corps', completed: false }, // manquée
    { kind: 'sport', date: '2026-07-12', title: '🏃 Course facile', completed: true },     // faite (completed)
    { kind: 'sport', date: '2026-07-11', title: '🏋️ Bas du corps', completed: false },    // faite (workout loggé)
    { kind: 'sport', date: '2026-07-16', title: '🏋️ À venir', completed: false },          // futur → ignoré
    { kind: 'study', date: '2026-07-10', title: 'Révision', completed: false },             // pas sport
    { kind: 'sport', date: '2026-06-01', title: '🏋️ Trop vieux', completed: false },       // hors fenêtre 14 j
  ];
  const workouts = [{ date: '2026-07-11', type: 'strength' }];
  const m = L.missedSessions(agenda, workouts, today, { days: 14 });
  assert.equal(m.length, 1, 'seule la séance du 13 est manquée');
  assert.equal(m[0].date, '2026-07-13');
  assert.equal(m[0].title, '🏋️ Haut du corps');
  assert.deepEqual(L.missedSessions([], [], today), []);
  assert.deepEqual(L.missedSessions(agenda, workouts, 'pas-une-date'), []);
});

test('overdueStudy : révisions passées jamais validées (rattrapage)', () => {
  const today = '2026-07-15';
  const agenda = [
    { kind: 'study', date: '2026-07-13', title: 'Compta chap. 3', completed: false }, // en retard (2 j)
    { kind: 'study', date: '2026-07-10', title: 'Droit fiscal', completed: false },   // en retard (5 j)
    { kind: 'study', date: '2026-07-12', title: 'Éco', completed: true },              // faite → ignorée
    { kind: 'study', date: '2026-07-20', title: 'À venir', completed: false },         // future → ignorée
    { kind: 'sport', date: '2026-07-11', title: 'Muscu', completed: false },           // pas study → ignorée
    { kind: 'study', date: '2026-05-01', title: 'Trop vieille', completed: false },    // hors fenêtre 21 j
  ];
  const r = L.overdueStudy(agenda, today);
  assert.equal(r.length, 2);
  assert.equal(r[0].title, 'Compta chap. 3'); // plus récente en tête
  assert.equal(r[0].daysLate, 2);
  assert.equal(r[1].title, 'Droit fiscal');
  assert.equal(r[1].daysLate, 5);
  // cap respecté
  assert.equal(L.overdueStudy(agenda, today, { cap: 1 }).length, 1);
  // fenêtre élargie → la vieille révision remonte
  assert.equal(L.overdueStudy(agenda, today, { days: 120 }).length, 3);
  // entrées invalides
  assert.deepEqual(L.overdueStudy([], today), []);
  assert.deepEqual(L.overdueStudy(agenda, 'pas-une-date'), []);
  assert.deepEqual(L.overdueStudy(null, today), []);
});

test('intermediateGoals : ultra 170km/2ans → paliers croissants échelonnés', () => {
  const now = new Date('2026-07-06T12:00:00');
  const ms = L.intermediateGoals({ type: 'ultra160', distanceKm: 170, date: '2028-07-01' }, now);
  assert.ok(ms.length >= 2 && ms.length <= 3, 'entre 2 et 3 paliers');
  // distances strictement croissantes et < objectif
  for (let i = 1; i < ms.length; i++) assert.ok(ms[i].distanceKm > ms[i - 1].distanceKm, 'croissant');
  assert.ok(ms.every(m => m.distanceKm < 170), 'tous < objectif');
  // dates croissantes et dans le futur, avant la course
  for (let i = 1; i < ms.length; i++) assert.ok(ms[i].date > ms[i - 1].date, 'dates croissantes');
  assert.ok(ms[0].date > '2026-07-06' && ms[ms.length - 1].date < '2028-07-01');
  // marathon ~38 sem → 2 paliers [10 km, semi], sans écraser le premier.
  // Avant le correctif (Math.round), les deux paliers tombaient sur l'index 1
  // (semi) et le dédoublonnage n'en laissait qu'UN → le palier 10 km était perdu.
  const mara = L.intermediateGoals({ type: 'marathon', distanceKm: 42, date: '2027-04-01' }, now);
  assert.equal(mara.length, 2, 'marathon ~8 mois → 2 paliers (pas 1)');
  assert.deepEqual(mara.map(m => m.distanceKm), [10, 21], 'paliers 10 km puis semi, croissants');
});

test('intermediateGoals : objectif proche ou petit → pas de paliers', () => {
  const now = new Date('2026-07-06T12:00:00');
  assert.deepEqual(L.intermediateGoals({ distanceKm: 42, date: '2026-09-01' }, now), []); // < 20 sem
  assert.deepEqual(L.intermediateGoals({ distanceKm: 10, date: '2027-07-01' }, now), []); // rien sous 7.5 km
  assert.deepEqual(L.intermediateGoals(null, now), []);
});

test('raceGoalStatus : marathon proche → spécifique/affûtage, sortie longue plus longue', () => {
  const now = new Date('2026-07-06T12:00:00');
  const specific = L.raceGoalStatus({ type: 'marathon', distanceKm: 42, date: '2026-08-20' }, now); // ~6-7 sem
  assert.equal(specific.phase.key, 'specific');
  assert.ok(specific.longRunMin >= 90); // proche course → longue proche du pic (42*3=126)
  assert.equal(L.raceGoalStatus(null, now), null);
});

test('warmupFor : échauffement adapté au type de séance', () => {
  const haut = L.warmupFor('A · Tirage & poussée');
  assert.match(haut.label, /haut du corps/i);
  assert.ok(haut.moves.length >= 3);
  const jambes = L.warmupFor('B · Jambes & chaîne postérieure');
  assert.match(jambes.label, /bas du corps/i);
  const trail = L.warmupFor('Sortie longue trail · côtes');
  assert.match(trail.label, /trail|course/i);
  const def = L.warmupFor('Séance inconnue');
  assert.match(def.label, /général/i);
  assert.ok(def.moves.length >= 3);
  assert.deepEqual(L.warmupFor('').moves.length >= 3, true);
  // P4.2 — motifs courts ancrés : faux positifs prouvés corrigés
  // `haut` → `\bhaut\b` : « haute intensité » (cardio/HIIT) ne bascule plus en haut du corps
  assert.match(L.warmupFor('Cardio haute intensité').label, /général/i);
  assert.match(L.warmupFor('Séance haute intensité (HIIT)').label, /général/i);
  // `press` → `\bpress\b` : la « presse à cuisses/jambes » (jambes) ne bascule plus en haut du corps…
  assert.match(L.warmupFor('Presse à cuisses').label, /bas du corps/i);
  assert.match(L.warmupFor('Presse à jambes').label, /bas du corps/i);
  // …mais l'anglais « press » (whole word : floor/bench press) reste bien haut du corps
  assert.match(L.warmupFor('Floor press kettlebell').label, /haut du corps/i);
  // `cuisse` + `bas du corps` ajoutés : la séance GÉNÉRÉE « Bas du corps » a enfin son échauffement dédié
  assert.match(L.warmupFor('Bas du corps').label, /bas du corps/i);
});

test('cooldownFor : retour au calme adapté au type de séance', () => {
  assert.match(L.cooldownFor('A · Tirage & poussée').label, /haut du corps/i);
  assert.match(L.cooldownFor('B · Jambes & chaîne postérieure').label, /bas du corps/i);
  assert.match(L.cooldownFor('Puissance & prévention').label, /trail|course/i);
  const def = L.cooldownFor('Séance inconnue');
  assert.match(def.label, /général/i);
  assert.ok(def.moves.length >= 3, '≥ 3 mouvements');
  // des étirements/récup, pas de l'échauffement
  assert.match(L.cooldownFor('B · Jambes').moves.join(' '), /étirement/i);
  // P4.2 — mêmes motifs ancrés côté retour au calme
  assert.match(L.cooldownFor('Cardio haute intensité').label, /général/i);
  assert.match(L.cooldownFor('Presse à cuisses').label, /bas du corps/i);
  assert.match(L.cooldownFor('Floor press kettlebell').label, /haut du corps/i);
  assert.match(L.cooldownFor('Bas du corps').label, /bas du corps/i);
});
test('prehabFor : prévention/prehab niveau kiné, ciblée par zone (Lauersen 2014)', () => {
  const bas = L.prehabFor('B · Jambes & chaîne postérieure');
  assert.match(bas.label, /ischios|genou/i);
  assert.match(JSON.stringify(bas.moves), /Nordic|excentri|freinée/i, 'excentrique ischios (Nordic)');
  assert.ok(bas.moves.length >= 3 && bas.why && /Lauersen/.test(bas.why));
  const haut = L.prehabFor('A · Tirage & poussée');
  assert.match(JSON.stringify(haut), /coiffe|rotation|face pull/i, 'coiffe des rotateurs / face pulls');
  const trail = L.prehabFor('Puissance & prévention');
  assert.match(JSON.stringify(trail.moves), /mollet|proprioception|équilibre/i, 'coureur : mollets/proprio');
  const def = L.prehabFor('Séance inconnue');
  assert.ok(def.moves.length >= 3 && /gainage|planche|bird/i.test(JSON.stringify(def.moves)));
});

test('volumeRamp : cas d’Adrien (15→50 km en 8 sem) = trop rapide, honnête', () => {
  const r = L.volumeRamp(15, 50, 8);
  assert.equal(r.series.length, 8);
  assert.equal(r.series[0].km, 15); // départ = volume actuel
  assert.equal(r.ratePct, 12); // plafonné à 12 %/sem
  assert.ok(!r.reachesTarget, '50 km en 8 sem non atteignable en sécurité');
  assert.ok(r.reachableKm >= 25 && r.reachableKm <= 35, 'atteint ~30 km à la date');
  assert.ok(r.safeTotalWeeks > 8, 'plus de temps nécessaire pour 50 km');
  assert.ok(r.series.some(s => s.cutback), 'contient au moins une semaine de décharge');
});

test('volumeRamp : cible réaliste atteinte, jamais au-dessus de la cible', () => {
  const r = L.volumeRamp(30, 40, 10);
  assert.ok(r.reachesTarget);
  assert.ok(r.series.every(s => s.km <= 40 + 1), 'ne dépasse pas la cible');
  assert.equal(r.thisWeekKm, r.series[0].km);
});

test('volumeRamp : semaine de décharge = baisse ponctuelle', () => {
  const r = L.volumeRamp(20, 60, 8);
  const w4 = r.series.find(s => s.week === 4);
  assert.ok(w4.cutback && w4.km < r.series.find(s => s.week === 3).km, 'décharge en S4');
});

test('buildWeekPlan : un type par jour coché, jusqu’à 7 jours', () => {
  const all = L.buildWeekPlan([1, 2, 3, 4, 5, 6, 0], { phase: 'base' });
  assert.equal(all.length, 7);
  assert.ok(all.every(x => typeof x.type === 'string' && x.type.length > 0));
});

test('buildWeekPlan : exactement une sortie longue (≥2 jours), week-end privilégié', () => {
  const p = L.buildWeekPlan([1, 3, 6], { phase: 'base' }); // Lun/Mer/Sam
  const longs = p.filter(x => x.type === 'Sortie longue');
  assert.equal(longs.length, 1);
  assert.equal(longs[0].weekday, 6); // samedi privilégié
});

test('buildWeekPlan : pas deux jours DURS consécutifs', () => {
  const isHard = t => ['Musculation', 'Fractionné', 'Sortie longue'].includes(t);
  const p = L.buildWeekPlan([1, 2, 3, 4, 5], { phase: 'specific' });
  const pos = d => (d + 6) % 7;
  const sorted = [...p].sort((a, b) => pos(a.weekday) - pos(b.weekday));
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(pos(sorted[i].weekday) - pos(sorted[i - 1].weekday)) === 1) {
      assert.ok(!(isHard(sorted[i].type) && isHard(sorted[i - 1].type)), 'pas 2 durs de suite');
    }
  }
});

test('buildWeekPlan : fractionné seulement en phase avancée + assez de jours', () => {
  const base = L.buildWeekPlan([1, 2, 3, 4, 5], { phase: 'base' });
  assert.ok(!base.some(x => x.type === 'Fractionné'), 'pas de fractionné en base');
  const specific = L.buildWeekPlan([1, 2, 3, 4, 5], { phase: 'specific' });
  assert.ok(specific.some(x => x.type === 'Fractionné'), 'fractionné en spécifique');
  const few = L.buildWeekPlan([1, 3], { phase: 'specific' });
  assert.ok(!few.some(x => x.type === 'Fractionné'), 'pas de fractionné si <4 jours');
});

test('buildWeekPlan : 1 seul jour → 1 séance, aucun jour → []', () => {
  assert.equal(L.buildWeekPlan([3], { phase: 'base' }).length, 1);
  assert.deepEqual(L.buildWeekPlan([], {}), []);
  assert.deepEqual(L.buildWeekPlan(null, {}), []);
});

test('proteinTarget : g/kg selon objectif', () => {
  assert.equal(L.proteinTarget(80, 'force').gramsPerDay, 150); // 80*1.9=152 -> arrondi 5
  assert.equal(L.proteinTarget(80, 'trail').gramsPerDay, 130); // 80*1.6=128 -> 130
  assert.equal(L.proteinTarget(80, 'recomposition').perKg, 1.8);
  assert.ok(L.proteinTarget(undefined, 'force').gramsPerDay > 0); // défaut poids
});

test('proteinSnackSuggestion : collation pour combler le restant', () => {
  // écart 30 g → plus petite collation qui couvre : blanc de poulet (120 g), 30 g
  const r = L.proteinSnackSuggestion(120, 150);
  assert.equal(r.gap, 30);
  assert.equal(r.snackProtein, 30);
  assert.match(r.snack, /poulet/i);
  // écart 10 g → fromage blanc (12 g)
  assert.equal(L.proteinSnackSuggestion(140, 150).snackProtein, 12);
  // écart énorme → la plus grosse collation dispo (45 g)
  assert.equal(L.proteinSnackSuggestion(0, 200).snackProtein, 45);
  // objectif atteint (écart ≤ 5 g) → null
  assert.equal(L.proteinSnackSuggestion(148, 150), null);
  assert.equal(L.proteinSnackSuggestion(160, 150), null);
  // cible inconnue → null
  assert.equal(L.proteinSnackSuggestion(50, 0), null);
});

test('nutritionCsv : export CSV du journal nutrition', () => {
  const nut = [
    { date: '2026-07-08', protein: 130, water: 7, fruit: true },
    { date: '2026-07-06', protein: 150, water: 8, fruit: false },
    { date: 'bad', protein: 99, water: 9, fruit: true },          // date invalide → exclue
    { date: '2026-07-06', protein: 160, water: 6, fruit: true }   // même date → dernière conservée
  ];
  const csv = L.nutritionCsv(nut);
  const lines = csv.split('\n');
  assert.equal(lines[0], 'date,proteines_g,eau_verres,fruits_legumes');
  assert.equal(lines[1], '2026-07-06,160,6,oui'); // dédupliqué (dernière) + trié en tête
  assert.equal(lines[2], '2026-07-08,130,7,oui');
  assert.equal(lines.length, 3);
  // vide → juste l'en-tête
  assert.equal(L.nutritionCsv([]), 'date,proteines_g,eau_verres,fruits_legumes');
  assert.equal(L.nutritionCsv(null), 'date,proteines_g,eau_verres,fruits_legumes');
});

test('generateMeals : compose depuis le frigo, totaux cohérents, signale les manques', () => {
  const pantry = [
    { n: 'Poulet, blanc, cuit', cat: 'P', kcal: 148, p: 30, c: 0, f: 3 },
    { n: 'Riz blanc, cuit', cat: 'F', kcal: 130, p: 2.7, c: 28, f: 0.3 },
    { n: 'Brocoli, cuit', cat: 'L', kcal: 35, p: 2.4, c: 4, f: 0.4 }
  ];
  const meals = L.generateMeals(pantry, { style: 'equilibre', seed: 0, count: 2 });
  assert.ok(meals.length >= 1);
  const m = meals[0];
  assert.ok(m.items.length >= 3, 'protéine + féculent + légume');
  assert.ok(m.items.every(it => it.grams > 0 && it.kcal >= 0));
  assert.ok(m.totalKcal > 0 && m.totalP > 0);
  assert.deepEqual(m.missing, [], 'rien ne manque quand P+F+L présents');
});

test('generateMeals : frigo incomplet → liste ce qui manque ; vide → []', () => {
  const meals = L.generateMeals([{ n: 'Riz blanc, cuit', cat: 'F', kcal: 130, p: 2.7 }], { count: 1 });
  assert.ok(meals[0].missing.includes('une protéine'));
  assert.ok(meals[0].missing.includes('un légume'));
  assert.deepEqual(L.generateMeals([], {}), []);
});

test('generateMeals : ancre (« envie de ») force l’aliment', () => {
  const pantry = [
    { n: 'Poulet, blanc, cuit', cat: 'P', kcal: 148, p: 30 },
    { n: 'Boeuf, steak, cuit', cat: 'P', kcal: 200, p: 26 },
    { n: 'Pâtes, cuites', cat: 'F', kcal: 158, p: 6 }
  ];
  const meals = L.generateMeals(pantry, { anchor: 'boeuf', seed: 0, count: 1 });
  assert.ok(meals[0].items.some(it => /boeuf/i.test(it.name)), 'le boeuf est ancré');
});

test('mealMacro : macros mises à l’échelle de la portion (par 100 g), arrondies', () => {
  const poulet = { n: 'Poulet, blanc, cuit', cat: 'P', kcal: 148, p: 30, c: 0, f: 3 };
  // 100 g → valeurs brutes du frigo (échelle neutre), champs conservés
  assert.deepEqual(L.mealMacro(poulet, 100), { name: 'Poulet, blanc, cuit', grams: 100, kcal: 148, p: 30 });
  // 130 g → kcal 148*1,3=192,4→192 ; p 30*1,3=39
  assert.deepEqual(L.mealMacro(poulet, 130), { name: 'Poulet, blanc, cuit', grams: 130, kcal: 192, p: 39 });
  // arrondi honnête d’une valeur fractionnaire : 2,7 g/100 g × 130 g = 3,51 → 4
  assert.equal(L.mealMacro({ n: 'Riz', kcal: 130, p: 2.7 }, 130).p, 4);
  assert.equal(L.mealMacro({ n: 'Riz', kcal: 130, p: 2.7 }, 130).kcal, 169);
});

test('mealMacro : proportionnalité — doubler la portion double kcal et protéines', () => {
  const f = { n: 'Steak haché 5%', kcal: 137, p: 21 };
  const a = L.mealMacro(f, 100), b = L.mealMacro(f, 200);
  assert.equal(b.kcal, a.kcal * 2);
  assert.equal(b.p, a.p * 2);
  assert.equal(L.mealMacro(f, 0).kcal, 0, 'portion nulle → 0 kcal');
  assert.equal(L.mealMacro(f, 0).p, 0);
});

test('mealMacro : champ manquant ou null → 0, jamais NaN', () => {
  // aliment sans kcal ni protéines (frigo incomplet) : pas de NaN qui polluerait le total du repas
  const m = L.mealMacro({ n: 'Aliment sans macros', cat: 'L' }, 170);
  assert.equal(m.kcal, 0);
  assert.equal(m.p, 0);
  assert.ok(!Number.isNaN(m.kcal) && !Number.isNaN(m.p));
  // valeurs explicitement null (données hostiles) traitées comme 0
  const n = L.mealMacro({ n: 'X', kcal: null, p: null }, 150);
  assert.equal(n.kcal, 0);
  assert.equal(n.p, 0);
});

test('buildShoppingList : ne liste que les catégories manquantes de l’envie', () => {
  // frigo avec seulement une protéine → il manque féculent + légume (+ laitier en équilibré)
  const items = L.buildShoppingList([{ n: 'Poulet, blanc, cuit', cat: 'P' }], { style: 'equilibre', count: 3 });
  const cats = items.map(i => i.cat);
  assert.ok(!cats.includes('P'), 'la protéine déjà présente n’est pas dans la liste');
  assert.ok(cats.includes('F') && cats.includes('L') && cats.includes('D'), 'féculent, légume et laitier manquent');
  const f = items.find(i => i.cat === 'F');
  assert.ok(f.grams > 0 && f.suggestions.length, 'quantité estimée + suggestions concrètes');
});

test('buildShoppingList : frigo complet → liste vide ; frigo vide → toutes les catégories de l’envie', () => {
  const full = [{ cat: 'P', n: 'a' }, { cat: 'F', n: 'b' }, { cat: 'L', n: 'c' }, { cat: 'G', n: 'd' }];
  assert.deepEqual(L.buildShoppingList(full, { style: 'reconfort' }), [], 'rien à acheter');
  const empty = L.buildShoppingList([], { style: 'proteine' }).map(i => i.cat);
  assert.deepEqual(empty, ['P', 'F', 'L', 'D'], 'protéiné → P+F+L+laitier');
});

test('remainingShopping : compte les articles non cochés', () => {
  const items = [{ label: 'Protéine' }, { label: 'Féculent' }, { label: 'Légume' }];
  assert.equal(L.remainingShopping(items, {}), 3);
  assert.equal(L.remainingShopping(items, { 'Féculent': true }), 2);
  assert.equal(L.remainingShopping(items, { 'Protéine': true, 'Féculent': true, 'Légume': true }), 0);
  assert.equal(L.remainingShopping(items, null), 3, 'checked absent → tout à acheter');
  assert.equal(L.remainingShopping('pas-un-tableau', {}), 0);
});

test('supplementTiming : avant/pendant/après par type de séance', () => {
  const muscu = L.supplementTiming('muscu');
  assert.equal(muscu.title, 'Musculation');
  assert.ok(muscu.apres.some(x => /whey/i.test(x)), 'whey en après pour la muscu');
  const longue = L.supplementTiming('sortie-longue');
  assert.ok(longue.pendant.some(x => /sodium|électrolyte/i.test(x)), 'électrolytes pendant la longue');
  assert.ok(longue.avant.some(x => /pas de shake|glucides/i.test(x.toLowerCase()) || /glucides/i.test(x)), 'glucides avant, pas de whey');
  const chaud = L.supplementTiming('chaleur');
  assert.ok(chaud.avant.some(x => /pré-hydrate|hydrate/i.test(x)));
  assert.deepEqual(L.supplementTiming('inconnu').title, 'Musculation'); // défaut
});

test('hydrationPlan : plus chaud → plus de sodium et de liquide', () => {
  const frais = L.hydrationPlan(5), tempere = L.hydrationPlan(18), chaud = L.hydrationPlan(27), tres = L.hydrationPlan(33);
  assert.equal(frais.level, 'Frais');
  assert.equal(tempere.level, 'Tempéré');
  assert.equal(chaud.level, 'Chaud');
  assert.equal(tres.level, 'Très chaud');
  assert.ok(tres.sodiumMgPerH[1] > chaud.sodiumMgPerH[1]);
  assert.ok(chaud.sodiumMgPerH[1] > tempere.sodiumMgPerH[1]);
  assert.ok(tres.fluidMlPerH[1] > frais.fluidMlPerH[1]);
  assert.ok(tres.note.length > 0);
  // Bornes exactes des seuils (t >= 30 / >= 25 / >= 15) : un off-by-one (>) serait attrapé ici.
  assert.equal(L.hydrationPlan(30).level, 'Très chaud');
  assert.equal(L.hydrationPlan(29.9).level, 'Chaud');
  assert.equal(L.hydrationPlan(25).level, 'Chaud');
  assert.equal(L.hydrationPlan(24.9).level, 'Tempéré');
  assert.equal(L.hydrationPlan(15).level, 'Tempéré');
  assert.equal(L.hydrationPlan(14.9).level, 'Frais');
  // Repli sûr sur température non chiffrable : « Tempéré » (médian), jamais « Frais » (le moins
  // hydratant). Sans donnée, on ne sous-conseille pas l'hydratation.
  assert.equal(L.hydrationPlan(undefined).level, 'Tempéré');
  assert.equal(L.hydrationPlan(NaN).level, 'Tempéré');
  assert.equal(L.hydrationPlan('abc').level, 'Tempéré');
  // null coerce vers 0 (fini) : 0 °C est une vraie température → « Frais », pas le repli.
  assert.equal(L.hydrationPlan(null).level, 'Frais');
});

test('weeklySummary : semaine vide → zéros', () => {
  const r = L.weeklySummary({}, '2026-07-06');
  assert.equal(r.sessions, 0);
  assert.equal(r.load, 0);
  assert.equal(r.sleepAvg, 0);
  assert.equal(r.studyPlanned, 0);
});

test('weekItems : lundi invalide → [], state vide → 7 jours vides', () => {
  assert.deepEqual(L.weekItems({}, 'pas-une-date'), []);
  const empty = L.weekItems({}, '2026-07-06');
  assert.equal(empty.length, 7);
  assert.equal(empty.every(d => d.total === 0), true);
});

test('mondayOf : ramène au lundi 00:00', () => {
  assert.equal(L.mondayOf(new Date('2026-07-08T15:00:00')).getDay(), 1); // mercredi → lundi
  assert.equal(L.mondayOf(new Date('2026-07-06T00:00:00')).getDay(), 1); // lundi → lundi
  assert.equal(L.mondayOf(new Date('2026-07-12T23:00:00')).getDay(), 1); // dimanche → lundi
  assert.equal(L.mondayOf(new Date('2026-07-08T15:00:00')).getHours(), 0);
});

test('weeklyAggregate : somme par semaine, alignée sur 8 lundis', () => {
  const now = new Date('2026-07-08T12:00:00'); // mercredi, semaine du lundi 2026-07-06
  const workouts = [
    { date: '2026-07-06', duration: 60, effort: 3 }, // cette semaine : 180
    { date: '2026-07-07', duration: 30, effort: 2 }, // cette semaine : +60 = 240
    { date: '2026-06-30', duration: 45, effort: 2 }  // semaine précédente : 90
  ];
  const res = L.weeklyAggregate(workouts, { weeks: 8, now, value: w => w.duration * w.effort });
  assert.equal(res.length, 8);
  assert.equal(res.at(-1).total, 240); // dernière semaine
  assert.equal(res.at(-2).total, 90);  // semaine d'avant
  assert.equal(res[0].total, 0);       // il y a 8 semaines : rien
});

test('weeklyAggregate : modes avg et count', () => {
  const now = new Date('2026-07-08T12:00:00');
  const recovery = [{ date: '2026-07-06', sleep: 8 }, { date: '2026-07-07', sleep: 6 }];
  const avg = L.weeklyAggregate(recovery, { weeks: 4, now, mode: 'avg', value: r => r.sleep });
  assert.equal(avg.at(-1).total, 7); // (8+6)/2
  const study = [{ date: '2026-07-06' }, { date: '2026-07-08' }];
  const count = L.weeklyAggregate(study, { weeks: 4, now, mode: 'count' });
  assert.equal(count.at(-1).total, 2);
});

test('weeklyAggregate : données vides / hors fenêtre → 0', () => {
  const now = new Date('2026-07-08T12:00:00');
  assert.equal(L.weeklyAggregate([], { weeks: 4, now }).every(p => p.total === 0), true);
  const old = L.weeklyAggregate([{ date: '2020-01-01', v: 5 }], { weeks: 4, now, value: r => r.v });
  assert.equal(old.every(p => p.total === 0), true);
});

test('glcPlanningToEvents : conversion valide, refId stable, durée bornée', () => {
  const data = { version: 1, source: 'legl.compta.v2', days: [{ date: '2026-07-08', due: 12 }, { date: '2026-07-10', due: 100 }] };
  const events = L.glcPlanningToEvents(data, { time: '18:00', fromDate: '2026-07-06', baseId: 500 });
  assert.equal(events.length, 2);
  assert.equal(events[0].title, 'Révision compta · 12 cartes');
  assert.equal(events[0].refId, 'glc-2026-07-08');
  assert.equal(events[0].kind, 'study');
  assert.equal(events[0].source, 'study-glc');
  assert.equal(events[0].durationMin, 24); // 12×2 min
  assert.equal(events[1].durationMin, 90); // borné à 90
});

test('glcPlanningToEvents : rejets défensifs (S.5)', () => {
  assert.deepEqual(L.glcPlanningToEvents(null), []);
  assert.deepEqual(L.glcPlanningToEvents({ version: 2, days: [] }), []);
  assert.deepEqual(L.glcPlanningToEvents({ version: 1, days: 'nope' }), []);
  const dirty = L.glcPlanningToEvents({ version: 1, days: [
    { date: 'pas-une-date', due: 5 },
    { date: '2026-07-08', due: 0 },
    { date: '2026-07-08', due: 9999 },
    { date: '2026-07-05', due: 3 },
    { date: '2026-07-09', due: 4 }
  ] }, { fromDate: '2026-07-06', baseId: 1 });
  assert.equal(dirty.length, 1, 'seule la ligne valide et future passe');
  assert.equal(dirty[0].date, '2026-07-09');
});

test('glcPlanningToEvents : heure invalide → 17:30, réimport idempotent via merge', () => {
  const data = { version: 1, days: [{ date: '2026-07-08', due: 5 }] };
  const first = L.glcPlanningToEvents(data, { time: '99:99', baseId: 10 });
  assert.equal(first[0].time, '17:30');
  const merged = L.mergePlannedEvents(L.mergePlannedEvents([], first), L.glcPlanningToEvents(data, { baseId: 20 }));
  assert.equal(merged.length, 1, 'pas de doublon au réimport');
  assert.equal(merged[0].id, 10, 'id du premier import préservé');
});

test('mergePlannedEvents : idempotent, préserve completed et id, garde le reste', () => {
  const manual = { id: 1, title: 'Muscu', date: '2026-07-07', time: '18:00', kind: 'sport' };
  const plan1 = L.planStudySessions({ weekdays: [1], startDate: '2026-07-06', examDate: '2026-07-13', baseId: 100 });
  let agenda = L.mergePlannedEvents([manual], plan1);
  assert.equal(agenda.length, 3); // manuel + 2 lundis
  agenda = agenda.map(e => e.refId === 'planner-2026-07-06-17:30-revision' ? { ...e, completed: true } : e);
  const plan2 = L.planStudySessions({ weekdays: [1], startDate: '2026-07-06', examDate: '2026-07-13', baseId: 999 });
  const again = L.mergePlannedEvents(agenda, plan2);
  assert.equal(again.length, 3, 'pas de doublon après régénération');
  const kept = again.find(e => e.refId === 'planner-2026-07-06-17:30-revision');
  assert.equal(kept.completed, true, 'statut validé préservé');
  assert.equal(kept.id, 100, 'id préservé');
  assert.ok(again.some(e => e.title === 'Muscu'), 'événement manuel intact');
});

test('mergeRecurring : ré-sync préserve doneLog/skipLog/paused/id, rafraîchit la règle', () => {
  // 1er import d'un abonnement calendrier : un récurrent hebdo.
  const imported = { id: 500, title: 'Standup', time: '09:00', kind: 'life', priority: 'normal',
    rule: { freq: 'weekly', interval: 1, weekdays: [1], startDate: '2026-07-06', until: '' }, refId: 'ics-standup-42' };
  let recurring = L.mergeRecurring([], [imported]);
  assert.equal(recurring.length, 1);
  const first = recurring[0];
  assert.equal(first.refId, 'ics-standup-42');
  // L'utilisateur coche une occurrence, en saute une autre, met en pause.
  recurring = recurring.map(r => r.refId === 'ics-standup-42'
    ? { ...r, doneLog: ['2026-07-06'], skipLog: ['2026-07-13'], paused: true } : r);
  // Re-sync du MÊME abonnement (même refId), l'export a un id neuf et une heure mise à jour.
  const resynced = { id: 999, title: 'Standup équipe', time: '09:30', kind: 'life', priority: 'normal',
    rule: { freq: 'weekly', interval: 1, weekdays: [1], startDate: '2026-07-06', until: '' }, refId: 'ics-standup-42' };
  const after = L.mergeRecurring(recurring, [resynced]);
  assert.equal(after.length, 1, 'pas de doublon après re-sync');
  const kept = after.find(r => r.refId === 'ics-standup-42');
  assert.deepEqual(kept.doneLog, ['2026-07-06'], 'historique de complétion préservé');
  assert.deepEqual(kept.skipLog, ['2026-07-13'], 'jours sautés préservés');
  assert.equal(kept.paused, true, 'état paused préservé');
  assert.equal(kept.id, first.id, 'id stable préservé (pas celui du nouvel import)');
  assert.equal(kept.title, 'Standup équipe', 'titre rafraîchi depuis le calendrier');
  assert.equal(kept.time, '09:30', 'heure rafraîchie depuis le calendrier');
});

test('mergeRecurring : garde les autres récurrents, tolère entrées non-tableau', () => {
  const manual = L.normalizeRecurring({ id: 1, title: 'Manuel', rule: { freq: 'daily', startDate: '2026-07-01' } });
  const subA = L.normalizeRecurring({ id: 2, title: 'A', refId: 'ics-a', rule: { freq: 'daily', startDate: '2026-07-01' } });
  const imported = { id: 300, title: 'B', refId: 'ics-b', rule: { freq: 'daily', startDate: '2026-07-01' } };
  const after = L.mergeRecurring([manual, subA], [imported]);
  assert.equal(after.length, 3, 'manuel + abonnement A intacts + B ajouté');
  assert.ok(after.some(r => r.title === 'Manuel'), 'récurrent manuel (sans refId) intact');
  assert.ok(after.some(r => r.refId === 'ics-a'), 'autre abonnement intact');
  assert.deepEqual(L.mergeRecurring(null, null), []);
  assert.deepEqual(L.mergeRecurring(null, [imported]).map(r => r.refId), ['ics-b']);
  assert.deepEqual(L.mergeRecurring([manual], null), [manual]);
});

// --- Vague S.8 : trajet auto (allowlist + builders + calcul) ---
test('isAllowedTravelUrl : seuls Nominatim/OSRM en https, hôtes publics', () => {
  assert.ok(L.isAllowedTravelUrl('https://nominatim.openstreetmap.org/search?q=x'), 'nominatim ok');
  assert.ok(L.isAllowedTravelUrl('https://router.project-osrm.org/route/v1/driving/0,0;1,1'), 'osrm ok');
  assert.equal(L.isAllowedTravelUrl('https://evil.example.com/'), '', 'autre hôte refusé');
  assert.equal(L.isAllowedTravelUrl('http://nominatim.openstreetmap.org/'), '', 'http refusé');
  assert.equal(L.isAllowedTravelUrl('https://127.0.0.1/'), '', 'loopback refusé');
  assert.equal(L.isAllowedTravelUrl('https://nominatim.openstreetmap.org.evil.com/'), '', 'suffixe piégé refusé');
  assert.equal(L.isAllowedTravelUrl('pas une url'), '', 'invalide refusé');
});
test('buildGeocodeUrl : encode la requête, vide si requête vide', () => {
  const u = L.buildGeocodeUrl('12 rue de la Paix, Lorient');
  assert.ok(u.startsWith('https://nominatim.openstreetmap.org/search?'), 'bon hôte');
  assert.ok(u.includes('q=12%20rue%20de%20la%20Paix%2C%20Lorient'), 'requête encodée');
  assert.equal(L.buildGeocodeUrl('   '), '', 'vide → ""');
  assert.ok(L.isAllowedTravelUrl(u), 'URL construite passe l’allowlist');
});
test('buildRouteUrl : ordre lon,lat ; vide si coords invalides', () => {
  const u = L.buildRouteUrl({ lat: 47.75, lon: -3.36 }, { lat: 48.11, lon: -1.68 });
  assert.ok(u.includes('/driving/-3.36,47.75;-1.68,48.11'), 'lon,lat dans le bon ordre');
  assert.ok(L.isAllowedTravelUrl(u), 'URL route passe l’allowlist');
  assert.equal(L.buildRouteUrl({ lat: 1 }, { lat: 2, lon: 3 }), '', 'coord manquante → ""');
  assert.equal(L.buildRouteUrl(null, null), '', 'null → ""');
});
test('haversineKm : Lorient→Rennes ~ 130 km, null si invalide', () => {
  const km = L.haversineKm({ lat: 47.748, lon: -3.366 }, { lat: 48.117, lon: -1.677 });
  assert.ok(km > 110 && km < 150, 'ordre de grandeur plausible : ' + km);
  assert.equal(L.haversineKm({ lat: 1 }, { lat: 2, lon: 3 }), null, 'coord manquante → null');
  // Cas limites (couverture) :
  const same = { lat: 47.748, lon: -3.366 };
  assert.equal(L.haversineKm(same, same), 0, 'points identiques → 0 exact');
  assert.equal(L.haversineKm(null, same), null, 'premier point absent → null');
  assert.equal(L.haversineKm(same, null), null, 'second point absent → null');
  assert.equal(L.haversineKm({ lat: 'abc', lon: 1 }, same), null, 'lat non numérique → null');
  // coords en chaînes numériques acceptées via Number()
  const asStr = L.haversineKm({ lat: '47.748', lon: '-3.366' }, { lat: '48.117', lon: '-1.677' });
  const asNum = L.haversineKm({ lat: 47.748, lon: -3.366 }, { lat: 48.117, lon: -1.677 });
  assert.equal(asStr, asNum, 'coords en chaînes numériques ⇒ même distance que les nombres');
  // symétrie a→b === b→a
  const ba = L.haversineKm({ lat: 48.117, lon: -1.677 }, { lat: 47.748, lon: -3.366 });
  assert.equal(km, ba, 'distance symétrique (a→b === b→a)');
});
// --- Objectifs physiques par zone ---
test('objectifs par zone : couverture complète et cohérente', () => {
  const { exercises } = require('../lib/exercises-data.js');
  const names = new Set(exercises.map(e => e.name));
  const valid = new Set(L.TRAINING_GOALS.map(g => g.id));
  for (const [name, zones] of Object.entries(L.EXERCISE_ZONES)) {
    assert.ok(names.has(name), `zone mappée pour un exercice inconnu : « ${name} »`);
    assert.ok(zones.length > 0, `${name} : au moins une zone`);
    zones.forEach(z => assert.ok(valid.has(z), `${name} : zone inconnue « ${z} »`));
  }
  for (const e of exercises) assert.ok(L.exerciseZones(e.name).length > 0, `${e.name} : aucune zone`);
  for (const g of L.TRAINING_GOALS) {
    const n = exercises.filter(e => L.goalMatch(e.name, g.id)).length;
    assert.ok(n >= 5, `objectif ${g.id} : seulement ${n} exercice(s)`);
  }
});
test('goalRank : zone principale avant secondaire, 99 hors cible', () => {
  assert.equal(L.goalRank('Gainage planche', 'abs'), 0, 'planche → abdos principal');
  assert.equal(L.goalRank('Montées de genoux', 'abs'), 1, 'montées de genoux → abdos secondaire');
  assert.equal(L.goalRank('Tractions', 'legs'), 99, 'tractions ne ciblent pas les jambes');
  assert.equal(L.goalMatch('Tractions supination', 'arms'), true, 'tractions supination → bras');
});
test('zoneTopExercises : les plus ciblés d’abord', () => {
  const top = L.zoneTopExercises('abs', 3);
  assert.equal(top.length, 3);
  assert.ok(top.every(n => L.goalRank(n, 'abs') === 0), 'zone principale en tête');
});
test('quickSessionPlan : remplit un budget temps selon zone/matériel', () => {
  const ex = [
    { name: 'Gainage planche', kind: 'Poids du corps', family: 'core', sets: 3, reps: 30, unit: 'sec' },
    { name: 'Hollow hold', kind: 'Poids du corps', family: 'core', sets: 3, reps: 20, unit: 'sec' },
    { name: 'Goblet squat kettlebell', kind: 'Kettlebell', family: 'general', sets: 3, reps: 8 },
  ];
  // budget large, zone abdos → ne garde que les exos abdos (planche + hollow)
  const abs = L.quickSessionPlan(ex, { minutes: 60, zone: 'abs', maxExercises: 8 });
  assert.deepEqual(abs.exercises.map(x => x.name).sort(), ['Gainage planche', 'Hollow hold']);
  assert.ok(abs.totalMinutes > 0 && abs.count === 2);
  // filtre matériel kettlebell
  const kb = L.quickSessionPlan(ex, { minutes: 60, equipment: 'Kettlebell' });
  assert.deepEqual(kb.exercises.map(x => x.name), ['Goblet squat kettlebell']);
  // budget serré → limite le nombre d'exercices
  const tight = L.quickSessionPlan(ex, { minutes: 1, maxExercises: 8 });
  assert.equal(tight.count, 1, 'au moins 1 même si ça dépasse le mini budget');
  assert.deepEqual(L.quickSessionPlan([], { minutes: 20 }).exercises, []);
  assert.deepEqual(L.quickSessionPlan(ex, { zone: 'inconnu' }).exercises, []);
});
test('bodyGoalWorkout : séance préconçue par envie de corps', () => {
  const ex = [
    { name: 'Gainage planche', sets: 3, reps: 30, unit: 'sec' },     // abs
    { name: 'Hollow hold', sets: 3, reps: 20, unit: 'sec' },          // abs
    { name: 'Tractions', sets: 3, reps: 8 },                          // back + arms
    { name: 'Goblet squat kettlebell', sets: 3, reps: 8 },            // legs + glutes
  ];
  const abs = L.bodyGoalWorkout('abs', ex, { count: 5 });
  assert.equal(abs.title, 'Abdos béton');
  assert.deepEqual(abs.exercises.map(e => e.name).sort(), ['Gainage planche', 'Hollow hold']);
  assert.ok(abs.exercises.every(e => e.sets > 0 && e.reps > 0));
  assert.deepEqual(L.bodyGoalWorkout('legs', ex).exercises.map(e => e.name), ['Goblet squat kettlebell']);
  assert.equal(L.bodyGoalWorkout('inconnu', ex), null);
  assert.ok(Array.isArray(L.BODY_GOALS) && L.BODY_GOALS.length === 7);
  // full body : une par zone (round-robin), couvre plusieurs zones
  const rich = [
    { name: 'Gainage planche', sets: 3, reps: 30 },        // abs
    { name: 'Tractions', sets: 3, reps: 8 },               // back + arms
    { name: 'Pompes classiques', sets: 3, reps: 10 },      // chest + arms + shoulders
    { name: 'Goblet squat kettlebell', sets: 3, reps: 8 }, // legs + glutes
  ];
  const fb = L.bodyGoalWorkout('fullbody', rich, { count: 4 });
  assert.equal(fb.title, 'Full body'); assert.equal(fb.exercises.length, 4);
  const names = fb.exercises.map(e => e.name);
  assert.ok(names.includes('Goblet squat kettlebell') && names.includes('Tractions') && names.includes('Pompes classiques') && names.includes('Gainage planche'), 'couvre jambes/dos/pecs/abdos');
});
test('pickExercisesForZones : round-robin par zone, sans doublon', () => {
  const rich = [
    { name: 'Gainage planche', sets: 3, reps: 30 },        // abs
    { name: 'Tractions', sets: 3, reps: 8 },               // back + arms
    { name: 'Pompes classiques', sets: 3, reps: 10 },      // chest + arms + shoulders
    { name: 'Goblet squat kettlebell', sets: 3, reps: 8 }, // legs + glutes
  ];
  const p = L.pickExercisesForZones(['legs', 'back', 'chest', 'abs'], rich, 4);
  assert.equal(p.length, 4);
  const names = p.map(e => e.name);
  assert.ok(names.includes('Goblet squat kettlebell') && names.includes('Tractions') && names.includes('Pompes classiques') && names.includes('Gainage planche'));
  assert.ok(p.every(e => e.sets > 0 && e.reps > 0 && e.unit));
  assert.deepEqual(L.pickExercisesForZones(['inconnu'], rich, 3), [], 'zone sans exercice → vide');
  assert.deepEqual(L.pickExercisesForZones(['legs'], [], 3), [], 'liste vide → vide');
  // offset (bouton « varier ») : rotation → sélection différente mais valide sur une zone à ≥2 exos
  const armsPool = [
    { name: 'Pompes diamants', sets: 3, reps: 12 },
    { name: 'Tractions supination', sets: 3, reps: 10 },
    { name: 'Pike push-up', sets: 3, reps: 12 },
  ];
  const a0 = L.pickExercisesForZones(['arms'], armsPool, 1, 0).map(e => e.name);
  const a1 = L.pickExercisesForZones(['arms'], armsPool, 1, 1).map(e => e.name);
  assert.notDeepEqual(a1, a0, 'offset change la sélection');
  assert.equal(L.pickExercisesForZones(['arms'], armsPool, 1, 3).length, 1, 'offset > taille reste borné');
});
test('objectiveProgram : programme hebdo auto par objectif', () => {
  const ex = [
    { name: 'Gainage planche', sets: 3, reps: 30 },
    { name: 'Tractions', sets: 3, reps: 8 },
    { name: 'Pompes classiques', sets: 3, reps: 10 },
    { name: 'Pompes diamants', sets: 3, reps: 8 },
    { name: 'Goblet squat kettlebell', sets: 3, reps: 8 },
    { name: 'Kettlebell swing', sets: 3, reps: 12 },
  ];
  const p = L.objectiveProgram('athletique', ex, { perSession: 4 });
  assert.equal(p.title, 'Corps athlétique');
  assert.equal(p.strength, 3);
  assert.equal(p.runs, 3);
  const muscu = p.week.filter(s => s.kind === 'muscu');
  const course = p.week.filter(s => s.kind === 'course');
  assert.equal(muscu.length, 3, '3 séances muscu');
  assert.equal(course.length, 3, '3 courses');
  assert.ok(muscu.every(s => Array.isArray(s.exercises) && s.exercises.length >= 1), 'chaque muscu a des exos');
  assert.ok(p.week.every(s => s.weekday >= 0 && s.weekday <= 6), 'jours valides');
  const days = p.week.map(s => s.weekday);
  assert.equal(new Set(days).size, 6, '6 séances sur 6 jours distincts');
  assert.ok(Array.isArray(L.FITNESS_OBJECTIVES) && L.FITNESS_OBJECTIVES.length === 5);
  assert.equal(L.objectiveProgram('inconnu', ex), null);
});
test('exerciseAvailable / filterByEquipment : adaptation au matériel', () => {
  const pool = [
    { name: 'Pompes classiques', kind: 'Poids du corps' },
    { name: 'Goblet squat kettlebell', kind: 'Kettlebell' },
    { name: 'Tractions', kind: 'Barre de traction' },
    { name: 'Pompes gilet lesté', kind: 'Gilet lesté' },
  ];
  assert.equal(L.exerciseAvailable(pool[0], { kettlebell: false }), true, 'poids du corps toujours OK');
  assert.equal(L.exerciseAvailable(pool[1], { kettlebell: false }), false, 'kettlebell manquante');
  assert.equal(L.exerciseAvailable(pool[1], { kettlebell: true }), true);
  assert.equal(L.exerciseAvailable(pool[2], { pullup: false }), false, 'barre manquante');
  const noKb = L.filterByEquipment(pool, { kettlebell: false, pullup: true, vest: true, handles: true }).map(x => x.name);
  assert.ok(!noKb.includes('Goblet squat kettlebell') && noKb.includes('Pompes classiques') && noKb.includes('Tractions'));
  assert.equal(L.filterByEquipment(pool, null).length, 4, 'pas de matériel fourni → pas de filtre');
});
test('objectiveProgram : respecte le matériel dispo (exclut la kettlebell)', () => {
  const rich = [
    { name: 'Pompes classiques', kind: 'Poids du corps', sets: 3, reps: 10 },
    { name: 'Pompes diamants', kind: 'Poids du corps', sets: 3, reps: 8 },
    { name: 'Pike push-up', kind: 'Poids du corps', sets: 3, reps: 8 },
    { name: 'Tractions', kind: 'Barre de traction', sets: 3, reps: 8 },
    { name: 'Rowing australien', kind: 'Poids du corps', sets: 3, reps: 10 },
    { name: 'Goblet squat kettlebell', kind: 'Kettlebell', sets: 3, reps: 8 },
    { name: 'Montées de genoux', kind: 'Poids du corps', sets: 3, reps: 20 },
    { name: 'Pont fessier une jambe', kind: 'Poids du corps', sets: 3, reps: 12 },
  ];
  const noGear = L.objectiveProgram('muscle', rich, { perSession: 5, equipment: { kettlebell: false, pullup: false, vest: false, handles: false } });
  const names = noGear.week.filter(s => s.kind === 'muscu').flatMap(s => s.exercises.map(e => e.name));
  assert.ok(names.length >= 1, 'au moins des exercices au poids du corps');
  assert.ok(names.every(n => n !== 'Goblet squat kettlebell' && n !== 'Tractions'), 'aucun exo kettlebell/barre sans matériel');
  const full = L.objectiveProgram('muscle', rich, { perSession: 5, equipment: { kettlebell: true, pullup: true, vest: true, handles: true } });
  const namesFull = full.week.filter(s => s.kind === 'muscu').flatMap(s => s.exercises.map(e => e.name));
  assert.ok(namesFull.includes('Goblet squat kettlebell') || namesFull.includes('Tractions'), 'matériel dispo → exos avec matériel possibles');
});
test('assignProgramDays : replace le programme sur les jours dispo', () => {
  const week = [
    { kind: 'muscu', title: 'A', weekday: 1 },
    { kind: 'course', title: 'R', weekday: 3 },
    { kind: 'muscu', title: 'B', weekday: 5 },
  ];
  // 3 séances, 2 jours dispo (mar/ven) → doublage, seules ces 2 valeurs utilisées
  const two = L.assignProgramDays(week, [2, 5]);
  assert.ok(two.every(s => s.weekday === 2 || s.weekday === 5), 'uniquement les jours choisis');
  assert.equal(two.length, 3);
  // 3 séances, 4 jours dispo → réparti, premier au 1er jour, dernier au dernier
  const four = L.assignProgramDays(week, [1, 2, 4, 6]);
  assert.equal(four[0].weekday, 1);
  assert.equal(four[four.length - 1].weekday, 6);
  assert.equal(new Set(four.map(s => s.weekday)).size, 3, 'répartis sur des jours distincts');
  // trié lundi d'abord (dimanche en dernier)
  const sun = L.assignProgramDays(week, [0, 1]);
  assert.equal(sun[sun.length - 1].weekday, 0, 'dimanche placé en fin de semaine');
  // jours invalides / vides → inchangé (mais copie)
  assert.deepEqual(L.assignProgramDays(week, []).map(s => s.weekday), [1, 3, 5]);
  assert.deepEqual(L.assignProgramDays(week, [9, -1, 'x']).map(s => s.weekday), [1, 3, 5]);
  // doublons ignorés
  assert.ok(L.assignProgramDays(week, [3, 3, 3]).every(s => s.weekday === 3));
  // une seule séance → premier jour dispo
  assert.equal(L.assignProgramDays([{ kind: 'muscu', title: 'A', weekday: 5 }], [2, 4])[0].weekday, 2);
  assert.deepEqual(L.assignProgramDays(null, [1]), []);
});
test('objectiveNutrition : calories/macros cohérentes avec l’objectif', () => {
  const base = { weight: 80, height: 178, age: 30, sex: 'homme', activityLevel: 'modere' };
  const seche = L.objectiveNutrition('seche', base);
  const muscle = L.objectiveNutrition('muscle', base);
  const athle = L.objectiveNutrition('athletique', base);
  assert.equal(seche.dir, 'déficit');
  assert.equal(muscle.dir, 'surplus');
  assert.equal(athle.dir, 'maintien');
  assert.ok(seche.dailyTarget < athle.dailyTarget, 'sèche = moins de calories que maintien');
  assert.ok(muscle.dailyTarget > athle.dailyTarget, 'muscle = plus de calories que maintien');
  assert.ok(seche.proteinG >= muscle.proteinG && muscle.proteinG > 0, 'protéines élevées en sèche');
  assert.ok(seche.dailyTarget >= seche.bmr, 'jamais sous le métabolisme de base');
  assert.ok(seche.proteinG * 4 + seche.carbG * 4 + seche.fatG * 9 <= seche.dailyTarget + 30, 'macros cohérentes avec les calories');
  assert.equal(L.objectiveNutrition('inconnu', base), null);
  assert.equal(L.objectiveNutrition('seche', { weight: 0 }), null, 'données manquantes → null');
});
test('onboardingNutritionEstimate : estimation calories en direct à l’onboarding', () => {
  // profil complet → maintenance (TDEE) + cible selon l'objectif
  const e = L.onboardingNutritionEstimate({ objective: 'seche', weight: 80, height: 178, age: 30, sex: 'homme', sessions: 4 });
  assert.ok(e && e.maintenance > 0 && e.target > 0 && e.proteinG > 0);
  assert.equal(e.dir, 'déficit');
  assert.ok(e.target < e.maintenance, 'sèche = cible sous la maintenance');
  // muscle → surplus (cible au-dessus de la maintenance)
  const m = L.onboardingNutritionEstimate({ objective: 'muscle', weight: 80, height: 178, age: 30, sex: 'homme', sessions: 4 });
  assert.equal(m.dir, 'surplus');
  assert.ok(m.target > m.maintenance);
  // objectif inconnu → athletique (maintien)
  assert.equal(L.onboardingNutritionEstimate({ objective: 'zzz', weight: 80, height: 178, age: 30 }).dir, 'maintien');
  // le niveau d'activité affine la maintenance (actif > sédentaire pour un même profil)
  const sed = L.onboardingNutritionEstimate({ objective: 'athletique', weight: 80, height: 178, age: 30, sex: 'homme', activity: 'sedentaire' });
  const act = L.onboardingNutritionEstimate({ objective: 'athletique', weight: 80, height: 178, age: 30, sex: 'homme', activity: 'tres' });
  assert.ok(act.maintenance > sed.maintenance, 'très actif = maintenance plus élevée que sédentaire');
  // données insuffisantes → null
  assert.equal(L.onboardingNutritionEstimate({ objective: 'seche', weight: 80 }), null);
  assert.equal(L.onboardingNutritionEstimate({}), null);
  assert.equal(L.onboardingNutritionEstimate(null), null);
});
test('currentBlock : suivi de la semaine dans le bloc de 4 semaines', () => {
  const start = '2026-07-06'; // lundi
  assert.equal(L.currentBlock(start, '2026-07-06').week, 1);
  assert.equal(L.currentBlock(start, '2026-07-06').phase.phase, 'Base');
  assert.equal(L.currentBlock(start, '2026-07-06').deloadInWeeks, 3);
  const w2 = L.currentBlock(start, '2026-07-15'); // semaine 2 (9 jours après)
  assert.equal(w2.week, 2); assert.equal(w2.phase.phase, 'Volume'); assert.equal(w2.deloadInWeeks, 2);
  const w4 = L.currentBlock(start, '2026-07-29'); // semaine 4 (23 j)
  assert.equal(w4.week, 4); assert.ok(w4.phase.deload); assert.equal(w4.deloadInWeeks, 0);
  const over = L.currentBlock(start, '2026-08-10'); // au-delà
  assert.equal(over.done, true); assert.equal(over.week, 4);
  assert.equal(L.currentBlock(start, '2026-07-01'), null, 'avant le début → null');
  assert.equal(L.currentBlock('', '2026-07-10'), null);
});
test('currentBlock : 7 jours calendaires = 7 jours même à travers un changement d’heure (DST)', () => {
  // Bloc démarré un lundi, +7 jours calendaires plus tard = début de S2, quel que soit le fuseau.
  // Au printemps, les deux minuits locaux sont distants de 23 h (86400000-3600000) : un Math.floor
  // rabattrait 6,96 j sur 6 → S1 au lieu de S2 (et 3 séries au lieu de 4 en séance guidée).
  const orig = process.env.TZ;
  try {
    process.env.TZ = 'Europe/Paris'; // printemps 2026 = 29 mars
    const spring = L.currentBlock('2026-03-23', '2026-03-30');
    assert.equal(spring.week, 2, '7 j à travers le DST → semaine 2');
    assert.equal(spring.daysIntoWeek, 0, '7 j calendaires = pile 1 semaine');
    assert.equal(L.phaseSetsForDay(3, '2026-03-23', '2026-03-30'), 4, 'S2 Volume = +1 malgré le DST');
    // Fin de bloc : 28 j calendaires = bloc terminé, même à travers le DST.
    assert.equal(L.currentBlock('2026-03-23', '2026-04-20').done, true, '28 j → bloc terminé');
  } finally {
    if (orig === undefined) delete process.env.TZ; else process.env.TZ = orig;
  }
});
test('phaseSetsForDay : séries d’une séance ajustées à la phase du bloc', () => {
  const start = '2026-07-06';
  assert.equal(L.phaseSetsForDay(3, start, '2026-07-06'), 3, 'S1 Base = base');
  assert.equal(L.phaseSetsForDay(3, start, '2026-07-15'), 4, 'S2 Volume = +1');
  assert.equal(L.phaseSetsForDay(3, start, '2026-07-22'), 3, 'S3 Intensité = base');
  assert.equal(L.phaseSetsForDay(3, start, '2026-07-29'), 2, 'S4 Décharge ≈ 60%');
  assert.equal(L.phaseSetsForDay(3, start, '2026-08-20'), 3, 'hors bloc → base');
  assert.equal(L.phaseSetsForDay(3, '', '2026-07-15'), 3, 'sans bloc → base');
});
test('blockPhaseHeadsUp : heads-up anticipé de fin de bloc', () => {
  const start = '2026-07-06';
  // S4 (décharge) → heads-up avec reco du prochain bloc
  const s4 = L.blockPhaseHeadsUp(L.currentBlock(start, '2026-07-27'));
  assert.ok(s4 && s4.phase === 'deload' && s4.showNextAdvice === true);
  assert.ok(/décharge|dernière/i.test(s4.title + ' ' + s4.message));
  // S3 (décharge la semaine prochaine) → heads-up preload sans reco
  const s3 = L.blockPhaseHeadsUp(L.currentBlock(start, '2026-07-20'));
  assert.ok(s3 && s3.phase === 'preload' && s3.showNextAdvice === false);
  // S1 / S2 → rien
  assert.equal(L.blockPhaseHeadsUp(L.currentBlock(start, '2026-07-06')), null, 'S1 → rien');
  assert.equal(L.blockPhaseHeadsUp(L.currentBlock(start, '2026-07-13')), null, 'S2 → rien');
  // bloc terminé → rien (la carte "terminé" prend le relais)
  assert.equal(L.blockPhaseHeadsUp(L.currentBlock(start, '2026-08-03')), null, 'terminé → rien');
  // entrée invalide → null
  assert.equal(L.blockPhaseHeadsUp(null), null);
  assert.equal(L.blockPhaseHeadsUp({ done: true }), null);
});
test('archiveBlock / blockHistorySummary : historique des blocs', () => {
  let h = [];
  h = L.archiveBlock(h, { objective: 'seche', start: '2026-05-04', end: '2026-05-31', weeks: 4 });
  h = L.archiveBlock(h, { objective: 'muscle', start: '2026-06-01', end: '2026-06-28', weeks: 4 });
  assert.equal(h.length, 2);
  assert.equal(h[1].objective, 'muscle');
  // entrée invalide ignorée
  assert.equal(L.archiveBlock(h, { start: 'x' }).length, 2);
  assert.equal(L.archiveBlock(h, null).length, 2);
  // plafond
  let big = []; for (let i = 0; i < 20; i++) big = L.archiveBlock(big, { objective: 'forme', start: '2026-01-01', weeks: 4 }, 12);
  assert.equal(big.length, 12);
  // summary
  const s = L.blockHistorySummary(h);
  assert.equal(s.count, 2);
  assert.equal(s.last.objective, 'muscle');
  assert.equal(s.byObjective.seche, 1);
  assert.equal(L.blockHistorySummary([]), null);
  assert.equal(L.blockHistorySummary(null), null);
});
test('nextBlockAdvice : reco du prochain bloc selon les résultats', () => {
  assert.equal(L.nextBlockAdvice({ adherence: 30 }).action, 'ease', 'adhérence basse prime');
  assert.equal(L.nextBlockAdvice({ adherence: 90, loadStatus: 'deload' }).action, 'lighten', 'charge haute → alléger');
  assert.equal(L.nextBlockAdvice({ adherence: 90, plateau: true }).action, 'vary', 'plateau → varier');
  assert.equal(L.nextBlockAdvice({ adherence: 85, loadStatus: 'push' }).action, 'progress', 'assidu + charge ok → +volume');
  assert.equal(L.nextBlockAdvice({ adherence: 60 }).action, 'keep', 'moyen → garder le cap');
  assert.equal(L.nextBlockAdvice({}).action, 'keep', 'sans donnée → garder');
  assert.ok(L.nextBlockAdvice({ adherence: 30 }).emoji && L.nextBlockAdvice({ adherence: 30 }).advice.length > 10);
});
test('blockWindowStats / blockComparison : progression 1er → dernier bloc', () => {
  const wo = (date, load, reps) => ({ date, exercises: [{ name: 'Squat', setLogs: [{ completed: true, load, reps }] }] });
  const workouts = [
    wo('2026-05-06', 20, 10), wo('2026-05-20', 20, 10),            // bloc 1 : 2 séances, 400 kg
    wo('2026-06-03', 30, 10), wo('2026-06-10', 30, 10), wo('2026-06-20', 30, 10), // bloc 2 : 3 séances, 900 kg
    wo('2026-04-01', 99, 99),                                       // hors fenêtre : ignoré
  ];
  const st = L.blockWindowStats(workouts, '2026-05-01', '2026-05-31');
  assert.equal(st.sessions, 2);
  assert.equal(st.tonnage, 400);
  assert.equal(st.sets, 2);
  // Séance saisie au formulaire (exercices avec `sets` mais SANS setLogs) : le tonnage et les séries
  // doivent tous deux être comptés (jumeau de #444). Avant le repli, sets valait 0 malgré tonnage > 0.
  const manual = [
    { date: '2026-05-06', exercises: [{ name: 'Squat', load: 50, reps: 8, sets: 4 }] }, // 1600 kg, 4 séries
    { date: '2026-05-20', exercise: 'Développé', load: 40, reps: 10, sets: 3 },          // legacy : 1200 kg, 3 séries
  ];
  const man = L.blockWindowStats(manual, '2026-05-01', '2026-05-31');
  assert.equal(man.sessions, 2);
  assert.equal(man.tonnage, 2800);
  assert.equal(man.sets, 7);
  const history = [
    { objective: 'seche', start: '2026-05-04', end: '2026-05-31', weeks: 4 },
    { objective: 'muscle', start: '2026-06-01', end: '2026-06-28', weeks: 4 },
  ];
  const cmp = L.blockComparison(history, workouts);
  assert.equal(cmp.blocks, 2);
  assert.equal(cmp.first.sessions, 2);
  assert.equal(cmp.first.tonnage, 400);
  assert.equal(cmp.last.sessions, 3);
  assert.equal(cmp.last.tonnage, 900);
  assert.equal(cmp.sessionsDelta, 1);
  assert.equal(cmp.tonnageDelta, 500);
  assert.equal(cmp.tonnagePct, 125);
  assert.equal(cmp.trend, 'up');
  // moins de 2 blocs terminés → null
  assert.equal(L.blockComparison(history.slice(0, 1), workouts), null);
  assert.equal(L.blockComparison([], workouts), null);
  // baisse de tonnage → trend down
  const down = L.blockComparison([
    { objective: 'muscle', start: '2026-06-01', end: '2026-06-28', weeks: 4 },
    { objective: 'seche', start: '2026-05-04', end: '2026-05-31', weeks: 4 },
  ], workouts);
  assert.equal(down.trend, 'down');
});
test('blocksByObjective : répartition des blocs terminés par objectif', () => {
  const wo = (date, load, reps) => ({ date, exercises: [{ name: 'Squat', setLogs: [{ completed: true, load, reps }] }] });
  const workouts = [
    wo('2026-05-06', 20, 10), wo('2026-05-20', 20, 10),            // bloc seche : 2 séances, 400 kg
    wo('2026-06-03', 30, 10), wo('2026-06-10', 30, 10), wo('2026-06-20', 30, 10), // bloc muscle 1 : 3 séances, 900 kg
    wo('2026-07-06', 40, 10), wo('2026-07-13', 40, 10),            // bloc muscle 2 : 2 séances, 800 kg
  ];
  const history = [
    { objective: 'seche', start: '2026-05-04', end: '2026-05-31', weeks: 4 },
    { objective: 'muscle', start: '2026-06-01', end: '2026-06-28', weeks: 4 },
    { objective: 'muscle', start: '2026-07-06', end: '2026-08-02', weeks: 4 },
  ];
  const r = L.blocksByObjective(history, workouts);
  assert.equal(r.length, 2);
  // muscle en tête (2 blocs) devant seche (1)
  assert.equal(r[0].objective, 'muscle');
  assert.equal(r[0].blocks, 2);
  assert.equal(r[0].tonnage, 1700); // 900 + 800
  assert.equal(r[0].sessions, 5);
  assert.equal(r[1].objective, 'seche');
  assert.equal(r[1].blocks, 1);
  assert.equal(r[1].tonnage, 400);
  // historique vide / invalide → []
  assert.deepEqual(L.blocksByObjective([], workouts), []);
  assert.deepEqual(L.blocksByObjective([{ objective: 'muscle', start: 'x', end: 'y' }], workouts), []);
  assert.deepEqual(L.blocksByObjective(null, workouts), []);
});
test('weeklyTonnageTrend : tonnage muscu hebdo + tendance', () => {
  // aucune séance chiffrée → null
  assert.equal(L.weeklyTonnageTrend([], '2026-07-13', 8), null);
  assert.equal(L.weeklyTonnageTrend([{ date: '2026-07-13', type: 'run', exercises: [] }], '2026-07-13', 8), null);
  // 2026-07-13 est un lundi → semaine courante = bucket final
  const w = [
    { date: '2026-06-24', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] }, // sem. 06-22 → 2500
    { date: '2026-07-01', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 4 }] }, // sem. 06-29 → 2000
    { date: '2026-07-08', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 4 }] }, // sem. 07-06 → 2000
    { date: '2026-07-13', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 6 }] }, // sem. 07-13 → 3000
  ];
  const t = L.weeklyTonnageTrend(w, '2026-07-13', 8);
  assert.equal(t.weeks.length, 8);
  const last = t.weeks[t.weeks.length - 1];
  assert.equal(last.start, '2026-07-13');
  assert.equal(last.tonnage, 3000);
  assert.equal(last.sessions, 1);
  assert.equal(t.last, 3000);
  assert.equal(t.max, 3000);
  assert.equal(t.total, 9500);
  // dernière (3000) vs moyenne des précédentes non vides (2500,2000,2000 → 2167) → +38 %, tendance up
  assert.equal(t.avgPrior, 2167);
  assert.equal(t.deltaPct, 38);
  assert.equal(t.trend, 'up');
  // buckets triés chronologiquement
  for (let i = 1; i < t.weeks.length; i++) assert.ok(t.weeks[i - 1].start < t.weeks[i].start);
  // paramètre weeks personnalisé
  assert.equal(L.weeklyTonnageTrend(w, '2026-07-13', 4).weeks.length, 4);
});
test('bestSessionTonnage : meilleure séance par tonnage', () => {
  // aucune séance chiffrée → null
  assert.equal(L.bestSessionTonnage([]), null);
  assert.equal(L.bestSessionTonnage([{ date: '2026-07-13', type: 'run', exercises: [] }]), null);
  const w = [
    { date: '2026-06-01', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] }, // 2500
    { date: '2026-06-20', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 8 }] }, // 4000 (record)
    { date: '2026-07-01', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 6 }] }, // 3000 (plus récente)
  ];
  const b = L.bestSessionTonnage(w);
  assert.equal(b.tonnage, 4000);
  assert.equal(b.date, '2026-06-20');
  assert.equal(b.count, 3);
  assert.equal(b.isLatest, false); // le record n'est pas la séance la plus récente
  // si la dernière séance EST le record → isLatest true
  const w2 = [
    { date: '2026-06-01', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] }, // 2500
    { date: '2026-07-01', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 9 }] }, // 4500 (record + plus récente)
  ];
  const b2 = L.bestSessionTonnage(w2);
  assert.equal(b2.tonnage, 4500);
  assert.equal(b2.isLatest, true);
  // égalité de tonnage → garde la plus récente
  const w3 = [
    { date: '2026-06-01', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 6 }] }, // 3000
    { date: '2026-06-15', exercises: [{ name: 'Développé', load: 60, reps: 10, sets: 5 }] }, // 3000
  ];
  assert.equal(L.bestSessionTonnage(w3).date, '2026-06-15');
  // tonnage en .5 (charge 12,5 × reps impaires) : l'égalité se juge sur le tonnage BRUT, pas l'arrondi.
  // Avant le correctif, best.tonnage stocké arrondi (188) était comparé au brut (187,5) → la séance
  // récente identique était rejetée (mauvaise date + « nouveau record » manqué). Cas prouvé fautif.
  const w5 = [
    { date: '2026-06-01', exercises: [{ name: 'Curl', load: 12.5, reps: 5, sets: 3 }] }, // 187,5
    { date: '2026-06-08', exercises: [{ name: 'Curl', load: 12.5, reps: 5, sets: 3 }] }, // 187,5 (plus récente)
  ];
  const b5 = L.bestSessionTonnage(w5);
  assert.equal(b5.date, '2026-06-08'); // égalité de tonnage brut → garde la plus récente
  assert.equal(b5.tonnage, 188); // affichage arrondi inchangé
  assert.equal(b5.isLatest, true); // → « Nouveau record séance ! »
  // séries validées (setLogs) prises en compte
  const w4 = [{ date: '2026-07-01', exercises: [{ name: 'Squat', setLogs: [{ completed: true, load: 100, reps: 5 }, { completed: true, load: 100, reps: 5 }] }] }];
  assert.equal(L.bestSessionTonnage(w4).tonnage, 1000);
  assert.equal(L.bestSessionTonnage(null), null);
});
test('bestTonnageWeek : record hebdo de tonnage', () => {
  assert.equal(L.bestTonnageWeek([], '2026-07-13'), null);
  // semaine du 06-07 = 2 séances (2500+2500=5000) ; semaine courante 13-07 = 3000 → record = 06-07
  const w = [
    { date: '2026-07-06', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] }, // 2500 (lun)
    { date: '2026-07-08', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] }, // 2500 (mer, même semaine)
    { date: '2026-07-13', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 6 }] }, // 3000 (semaine courante)
  ];
  const b = L.bestTonnageWeek(w, '2026-07-13');
  assert.equal(b.weekStart, '2026-07-06');
  assert.equal(b.tonnage, 5000);
  assert.equal(b.sessions, 2);
  assert.equal(b.isCurrent, false);
  // si la semaine courante est le record → isCurrent true
  const w2 = [
    { date: '2026-07-06', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 4 }] }, // 2000
    { date: '2026-07-13', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 10 }] }, // 5000 (courante, record)
  ];
  const b2 = L.bestTonnageWeek(w2, '2026-07-13');
  assert.equal(b2.weekStart, '2026-07-13');
  assert.equal(b2.tonnage, 5000);
  assert.equal(b2.isCurrent, true);
  // séances sans tonnage (course) ignorées
  assert.equal(L.bestTonnageWeek([{ date: '2026-07-13', type: 'run', exercises: [] }], '2026-07-13'), null);
  assert.equal(L.bestTonnageWeek(null, '2026-07-13'), null);
  // égalité APRÈS arrondi mais bruts distincts : la semaine antérieure (113,0 kg) garde le record
  // face à la plus récente (112,5 kg) — le départage « plus récente » ne doit pas jouer quand les
  // bruts diffèrent (jumeau de bestSessionTonnage #406). Avant correctif : renvoyait la semaine du 13.
  const wHalf = [
    { date: '2026-07-06', exercises: [{ name: 'Bench', load: 100, reps: 1, sets: 1 }, { name: 'Curl', load: 13, reps: 1, sets: 1 }] },   // 113,0 (lun, antérieure)
    { date: '2026-07-13', exercises: [{ name: 'Bench', load: 100, reps: 1, sets: 1 }, { name: 'Curl', load: 12.5, reps: 1, sets: 1 }] }, // 112,5 (lun suivant, plus récente)
  ];
  const bHalf = L.bestTonnageWeek(wHalf, '2026-07-13');
  assert.equal(bHalf.weekStart, '2026-07-06');
  assert.equal(bHalf.tonnage, 113);
  assert.equal(bHalf.isCurrent, false);
});
test('trainingConsistency : régularité des séances', () => {
  // moins de 3 séances → null
  assert.equal(L.trainingConsistency([{ date: '2026-07-13' }, { date: '2026-07-10' }], '2026-07-13', 28), null);
  assert.equal(L.trainingConsistency([], '2026-07-13'), null);
  // intervalles parfaitement réguliers (tous les 3 j) → régularité 100
  const reg = [{ date: '2026-07-01' }, { date: '2026-07-04' }, { date: '2026-07-07' }, { date: '2026-07-10' }, { date: '2026-07-13' }];
  const c = L.trainingConsistency(reg, '2026-07-13', 28);
  assert.equal(c.sessions, 5);
  assert.equal(c.avgGapDays, 3);
  assert.equal(c.maxGapDays, 3);
  assert.equal(c.regularity, 100);
  assert.equal(c.label, 'Très régulier');
  // intervalles en dents de scie (1,7,1,7) → régularité faible
  const irr = [{ date: '2026-06-01' }, { date: '2026-06-02' }, { date: '2026-06-09' }, { date: '2026-06-10' }, { date: '2026-06-17' }];
  const ci = L.trainingConsistency(irr, '2026-06-17', 28);
  assert.ok(ci.regularity <= 40, 'régularité basse pour cadence irrégulière');
  assert.equal(ci.maxGapDays, 7);
  // dates dupliquées le même jour comptent pour une séance
  const dup = [{ date: '2026-07-07' }, { date: '2026-07-07' }, { date: '2026-07-10' }, { date: '2026-07-13' }];
  assert.equal(L.trainingConsistency(dup, '2026-07-13', 28).sessions, 3);
  // hors fenêtre → exclu (séance de mai ignorée sur fenêtre 28 j depuis le 13/07)
  const win = [{ date: '2026-05-01' }, { date: '2026-07-07' }, { date: '2026-07-10' }, { date: '2026-07-13' }];
  assert.equal(L.trainingConsistency(win, '2026-07-13', 28).sessions, 3);
  // todayKey invalide → null
  assert.equal(L.trainingConsistency(reg, 'x', 28), null);
});
test('trainingByWeekday : répartition et jour fort', () => {
  const empty = L.trainingByWeekday([], '2026-07-13', 56);
  assert.deepEqual(empty.counts, [0, 0, 0, 0, 0, 0, 0]);
  assert.equal(empty.bestDay, null);
  const w = [
    { date: '2026-07-13' }, // lundi (0)
    { date: '2026-07-07' }, // mardi (1)
    { date: '2026-06-30' }, // mardi (1)
    { date: '2026-07-08' }, // mercredi (2)
  ];
  const r = L.trainingByWeekday(w, '2026-07-13', 56);
  assert.deepEqual(r.counts, [1, 2, 1, 0, 0, 0, 0]);
  assert.equal(r.bestDay, 1); // mardi le plus fréquent
  assert.equal(r.bestCount, 2);
  assert.equal(r.total, 4);
  // hors fenêtre exclu
  assert.equal(L.trainingByWeekday([{ date: '2026-01-01' }, { date: '2026-07-13' }], '2026-07-13', 56).total, 1);
  // dates futures exclues
  assert.equal(L.trainingByWeekday([{ date: '2026-07-20' }, { date: '2026-07-13' }], '2026-07-13', 56).total, 1);
  // égalité → jour le plus tôt en semaine (lundi avant mardi)
  assert.equal(L.trainingByWeekday([{ date: '2026-07-13' }, { date: '2026-07-07' }], '2026-07-13', 56).bestDay, 0);
  // todayKey invalide → pas de jour fort
  assert.equal(L.trainingByWeekday(w, 'x', 56).bestDay, null);
});
test('weekTrainingBalance : équilibre course/muscu', () => {
  assert.equal(L.weekTrainingBalance([], '2026-07-13', 7), null);
  // 3 muscu + 2 course cette semaine → bon équilibre
  const w = [
    { date: '2026-07-13', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] },
    { date: '2026-07-12', type: 'strength', exercises: [{ name: 'Dev', load: 60, reps: 8, sets: 4 }] },
    { date: '2026-07-11', exercises: [{ name: 'Tractions', reps: 8, sets: 4 }] },
    { date: '2026-07-13', type: 'run' },
    { date: '2026-07-10', type: 'run' },
  ];
  const b = L.weekTrainingBalance(w, '2026-07-13', 7);
  assert.equal(b.strength, 3);
  assert.equal(b.runs, 2);
  assert.equal(b.total, 5);
  assert.equal(b.dominant, 'strength');
  assert.equal(b.label, 'Bon équilibre'); // écart 1
  // que de la course
  const onlyRun = L.weekTrainingBalance([{ date: '2026-07-13', type: 'run' }, { date: '2026-07-12', type: 'run' }], '2026-07-13', 7);
  assert.equal(onlyRun.label, 'Que de la course');
  assert.equal(onlyRun.dominant, 'run');
  // que de la muscu
  assert.equal(L.weekTrainingBalance([{ date: '2026-07-13', exercises: [{ name: 'Squat', load: 80, reps: 5, sets: 3 }] }], '2026-07-13', 7).label, 'Que de la muscu');
  // déséquilibre net → plutôt muscu
  const tilt = L.weekTrainingBalance([
    { date: '2026-07-13', exercises: [{ name: 'a', load: 1, reps: 1, sets: 1 }] }, { date: '2026-07-12', exercises: [{ name: 'b', load: 1, reps: 1, sets: 1 }] }, { date: '2026-07-11', exercises: [{ name: 'c', load: 1, reps: 1, sets: 1 }] }, { date: '2026-07-10', exercises: [{ name: 'd', load: 1, reps: 1, sets: 1 }] },
    { date: '2026-07-13', type: 'run' },
  ], '2026-07-13', 7);
  assert.equal(tilt.label, 'Plutôt muscu');
  // hors fenêtre exclu
  assert.equal(L.weekTrainingBalance([{ date: '2026-06-01', type: 'run' }, { date: '2026-07-13', type: 'run' }], '2026-07-13', 7).total, 1);
  // todayKey invalide → null
  assert.equal(L.weekTrainingBalance(w, 'x', 7), null);
});
test('bestE1rmByExercise / blockExerciseProgress : progression de force par exercice', () => {
  const wo = (date, name, load, reps) => ({ date, exercises: [{ name, setLogs: [{ completed: true, load, reps }] }] });
  const workouts = [
    // bloc 1 (mai) : Squat 60×5 (e1RM 70), Développé 40×5 (e1RM ~46,5)
    wo('2026-05-06', 'Squat', 60, 5), wo('2026-05-20', 'Développé', 40, 5),
    // bloc 2 (juin) : Squat 75×5 (e1RM 87,5), Développé 45×5 (e1RM ~52,5), Tractions (pas de charge → ignoré)
    wo('2026-06-03', 'Squat', 75, 5), wo('2026-06-10', 'Développé', 45, 5), wo('2026-06-20', 'Tractions', 0, 8),
  ];
  const b1 = L.bestE1rmByExercise(workouts, '2026-05-01', '2026-05-31');
  assert.equal(b1.Squat, 70);
  const history = [
    { objective: 'muscle', start: '2026-05-04', end: '2026-05-31', weeks: 4 },
    { objective: 'muscle', start: '2026-06-01', end: '2026-06-28', weeks: 4 },
  ];
  const prog = L.blockExerciseProgress(history, workouts);
  const squat = prog.find(p => p.name === 'Squat');
  assert.ok(squat, 'Squat présent dans les deux blocs');
  assert.equal(squat.firstE1rm, 70);
  assert.equal(squat.lastE1rm, 87.5);
  assert.equal(squat.deltaKg, 17.5);
  assert.equal(squat.deltaPct, 25);
  // Tractions sans charge → absent
  assert.ok(!prog.some(p => p.name === 'Tractions'), 'exercice sans charge exclu');
  // trié par progression décroissante, limité
  assert.ok(prog.length <= 5);
  assert.equal(prog[0].name, 'Squat', 'Squat +25% en tête (avant Développé +13%)');
  // < 2 blocs → []
  assert.deepEqual(L.blockExerciseProgress(history.slice(0, 1), workouts), []);
  assert.deepEqual(L.blockExerciseProgress([], workouts), []);
  // limite personnalisable
  assert.ok(L.blockExerciseProgress(history, workouts, { limit: 1 }).length === 1);
});
test('bestE1rmByExercise : formes legacy, repli sans setLogs, fenêtre de dates et garde-fous', () => {
  const b = L.bestE1rmByExercise;
  const W = '2026-05-01', E = '2026-05-31';
  // Forme legacy mono-exercice (w.exercise + w.load/w.reps, sans exercises[]) — encore présente
  // dans d'anciennes séances : bestE1rmByExercise la reconnaît (jumeau des ~6 autres lecteurs muscu).
  assert.deepEqual(b([{ date: '2026-05-06', exercise: 'Squat', load: 100, reps: 5 }], W, E), { Squat: L.estimate1RM(100, 5) });
  // exercises[] SANS setLogs → repli sur {load, reps} de l'exercice
  assert.deepEqual(b([{ date: '2026-05-06', exercises: [{ name: 'Bench', load: 80, reps: 3 }] }], W, E), { Bench: L.estimate1RM(80, 3) });
  // plusieurs setLogs → MEILLEUR 1RM estimé retenu (120×2 > 100×5)
  assert.deepEqual(b([{ date: '2026-05-06', exercises: [{ name: 'DL', setLogs: [{ load: 100, reps: 5 }, { load: 120, reps: 2 }] }] }], W, E), { DL: L.estimate1RM(120, 2) });
  // exercises[] présent mais VIDE → repli sur w.exercise (garde `.length`)
  assert.deepEqual(b([{ date: '2026-05-06', exercises: [], exercise: 'Squat', load: 90, reps: 5 }], W, E), { Squat: L.estimate1RM(90, 5) });
  // hors fenêtre [start..end] → exclu (la veille du début, le lendemain de la fin)
  assert.deepEqual(b([{ date: '2026-04-30', exercise: 'Squat', load: 100, reps: 5 }], W, E), {});
  assert.deepEqual(b([{ date: '2026-06-01', exercise: 'Squat', load: 100, reps: 5 }], W, E), {});
  // bornes incluses (start et end exacts comptent)
  assert.deepEqual(b([{ date: W, exercise: 'A', load: 60, reps: 5 }, { date: E, exercise: 'B', load: 60, reps: 5 }], W, E), { A: L.estimate1RM(60, 5), B: L.estimate1RM(60, 5) });
  // date manquante / mal formée → ignorée
  assert.deepEqual(b([{ date: 'pas-une-date', exercise: 'Squat', load: 100, reps: 5 }], W, E), {});
  assert.deepEqual(b([{ exercise: 'Squat', load: 100, reps: 5 }], W, E), {});
  // charge nulle (poids du corps) → estimate1RM null → aucun record chargé
  assert.deepEqual(b([{ date: '2026-05-06', exercise: 'Tractions', load: 0, reps: 8 }], W, E), {});
  // exercice sans nom → ignoré
  assert.deepEqual(b([{ date: '2026-05-06', exercises: [{ load: 100, reps: 5 }] }], W, E), {});
  // entrées hostiles → objet vide, jamais d'exception
  assert.deepEqual(b(null, W, E), {});
  assert.deepEqual(b([null, undefined, {}, { date: '2026-05-06' }], W, E), {});
  // même exercice sur plusieurs séances de la fenêtre → meilleur 1RM toutes séances confondues
  assert.deepEqual(b([
    { date: '2026-05-06', exercise: 'Squat', load: 90, reps: 5 },
    { date: '2026-05-20', exercise: 'Squat', load: 100, reps: 5 },
  ], W, E), { Squat: L.estimate1RM(100, 5) });
});
test('blockProgressText / shareableBlockProgress : progression de bloc partageable', () => {
  const wo = (date, name, load, reps) => ({ date, exercises: [{ name, setLogs: [{ completed: true, load, reps }] }] });
  const workouts = [
    wo('2026-05-06', 'Squat', 60, 5), wo('2026-05-20', 'Squat', 60, 5),
    wo('2026-06-03', 'Squat', 75, 5), wo('2026-06-10', 'Squat', 75, 5), wo('2026-06-20', 'Squat', 75, 5),
  ];
  const history = [
    { objective: 'seche', start: '2026-05-04', end: '2026-05-31', weeks: 4 },
    { objective: 'muscle', start: '2026-06-01', end: '2026-06-28', weeks: 4 },
  ];
  const txt = L.blockProgressText(history, workouts);
  assert.match(txt, /progression sur 2 blocs/i);
  assert.match(txt, /Tonnage\/sem/);
  assert.match(txt, /Squat/);
  assert.match(txt, /1RM estimé/);
  const share = L.shareableBlockProgress(history, workouts);
  assert.ok(share && share.title && share.text === txt);
  assert.match(share.title, /progression/i);
  // Accord singulier : un bloc avec une seule séance loggée → « 1 séance », pas « 1 séances ».
  const solo = [
    { objective: 'seche', start: '2026-05-04', end: '2026-05-31', weeks: 4 },
    { objective: 'muscle', start: '2026-06-01', end: '2026-06-28', weeks: 4 },
  ];
  const soloWo = [wo('2026-05-06', 'Squat', 60, 5), wo('2026-06-03', 'Squat', 75, 5)];
  const soloTxt = L.blockProgressText(solo, soloWo);
  assert.match(soloTxt, /1er bloc : 1 séance ·/);
  assert.ok(!/1 séances/.test(soloTxt), 'pas d’accord fautif « 1 séances »');
  // < 2 blocs → '' / null
  assert.equal(L.blockProgressText(history.slice(0, 1), workouts), '');
  assert.equal(L.shareableBlockProgress(history.slice(0, 1), workouts), null);
  assert.equal(L.shareableBlockProgress([], workouts), null);
});
test('blockPhase / progressSets : bloc 4 semaines montée puis décharge', () => {
  assert.equal(L.blockPhase(0).phase, 'Base');
  assert.equal(L.blockPhase(1).phase, 'Volume');
  assert.equal(L.blockPhase(2).phase, 'Intensité');
  assert.equal(L.blockPhase(3).phase, 'Décharge');
  assert.ok(L.blockPhase(3).deload && !L.blockPhase(0).deload);
  assert.equal(L.blockPhase(4).phase, 'Base', 'cycle tous les 4');
  assert.equal(L.blockPhase(-1).phase, 'Décharge', 'index négatif géré');
  // 3 séries de base : S1=3, S2=4 (+volume), S3=3, S4=2 (décharge ~60%)
  assert.equal(L.progressSets(3, 0), 3);
  assert.equal(L.progressSets(3, 1), 4);
  assert.equal(L.progressSets(3, 2), 3);
  assert.equal(L.progressSets(3, 3), 2);
  assert.ok(L.progressSets(3, 3) < L.progressSets(3, 1), 'décharge < volume');
  assert.ok(L.progressSets(0, 0) >= 1 && L.progressSets(3, 3) >= 2, 'planchers respectés');
});
test('neglectedZone : première zone prioritaire à 0', () => {
  assert.equal(L.neglectedZone({ legs: 2, back: 1, arms: 1 }, ['abs', 'legs', 'arms']), 'abs', 'abdos non travaillés');
  assert.equal(L.neglectedZone({ abs: 1, legs: 2, arms: 1 }, ['abs', 'legs', 'arms']), null, 'tout couvert → null');
  assert.equal(L.neglectedZone({ abs: 1, arms: 1 }, ['abs', 'legs', 'arms']), 'legs', 'jambes manquantes');
  assert.equal(L.neglectedZone({}, ['abs']), 'abs', 'rien fait → première zone');
  assert.equal(typeof L.neglectedZone(null, null), 'string', 'défauts robustes → une zone');
});

test('weeklyZoneCoverage : compte des exercices par zone sur 7 jours', () => {
  const w = [
    { date: '2026-07-08', exercises: [{ name: 'Gainage planche' }, { name: 'Tractions' }] }, // abs ; back+arms
    { date: '2026-07-06', exercise: 'Gainage latéral' }, // abs (top-level)
    { date: '2026-06-01', exercises: [{ name: 'Gainage planche' }] }, // hors fenêtre
  ];
  const cov = L.weeklyZoneCoverage(w, '2026-07-10');
  assert.equal(cov.abs, 2, 'planche + latéral');
  assert.equal(cov.back, 1); assert.equal(cov.arms, 1);
  assert.equal(cov.legs, undefined, 'aucune jambe cette semaine');
  assert.deepEqual(L.weeklyZoneCoverage([], '2026-07-10'), {});
  assert.deepEqual(L.weeklyZoneCoverage(w, 'pas-une-date'), {});
});
test('weeklySetsPerZone : somme des séries par zone (7 j), completedSets prioritaire', () => {
  const w = [
    { date: '2026-07-08', exercises: [{ name: 'Gainage planche', sets: 3 }, { name: 'Tractions', sets: 4, completedSets: 2 }] }, // abs+3 ; back/arms +2 (validées)
    { date: '2026-07-06', exercise: 'Gainage latéral', sets: 2 }, // abs +2 (top-level)
    { date: '2026-06-01', exercises: [{ name: 'Gainage planche', sets: 5 }] }, // hors fenêtre
  ];
  const s = L.weeklySetsPerZone(w, '2026-07-10');
  assert.equal(s.abs, 5, '3 planche + 2 latéral');
  assert.equal(s.back, 2, 'completedSets (2) prioritaire sur sets (4)');
  assert.equal(s.arms, 2);
  assert.equal(s.legs, undefined, 'aucune jambe cette semaine');
  assert.deepEqual(L.weeklySetsPerZone([], '2026-07-10'), {});
  assert.deepEqual(L.weeklySetsPerZone(w, 'pas-une-date'), {});
});
test('setLandmark : repères hypertrophie (<10 low, 10-20 ok, >20 high)', () => {
  assert.equal(L.setLandmark(0).zone, 'low');
  assert.equal(L.setLandmark(9).zone, 'low');
  assert.equal(L.setLandmark(10).zone, 'ok');
  assert.equal(L.setLandmark(20).zone, 'ok');
  assert.equal(L.setLandmark(21).zone, 'high');
  assert.equal(L.setLandmark('bad').zone, 'low');
  assert.equal(typeof L.setLandmark(12).label, 'string');
});
test('deloadRecommendation : accumulation, semaine légère, fatigue, garde-fous', () => {
  const hard = date => ({ date, exercises: [{ name: 'Gainage planche', sets: 18 }] }); // abs 18 = semaine dure
  const light = date => ({ date, exercises: [{ name: 'Gainage planche', sets: 3 }] }); // décharge (< 15)
  const today = '2026-07-29';
  // 5 semaines dures complètes d'affilée (semaines 1..5) → décharge due (accumulation).
  const acc = L.deloadRecommendation(
    ['2026-07-22', '2026-07-15', '2026-07-08', '2026-07-01', '2026-06-24'].map(hard), today);
  assert.equal(acc.due, true);
  assert.equal(acc.reason, 'accumulation');
  assert.equal(acc.hardWeeks, 5);
  assert.equal(acc.emoji, '🧊');
  assert.match(acc.advice, /40 à 50/);
  // Une semaine légère récente casse le compteur (décharge déjà prise) → pas due.
  const broken = L.deloadRecommendation(
    [hard('2026-07-22'), hard('2026-07-15'), light('2026-07-08'), hard('2026-07-01'), hard('2026-06-24')], today);
  assert.equal(broken.due, false);
  assert.equal(broken.hardWeeks, 2, 'compteur cassé à la semaine légère');
  // 3 semaines dures + forme basse (readiness 40) → décharge avancée (fatigue).
  const fat = L.deloadRecommendation(
    ['2026-07-22', '2026-07-15', '2026-07-08'].map(hard), today, { readiness: 40 });
  assert.equal(fat.due, true);
  assert.equal(fat.reason, 'fatigue');
  assert.match(fat.advice, /forme baisse/);
  // Mêmes 3 semaines sans signal de fatigue (readiness non fourni) → pas encore due.
  const noFat = L.deloadRecommendation(['2026-07-22', '2026-07-15', '2026-07-08'].map(hard), today);
  assert.equal(noFat.due, false);
  assert.equal(noFat.hardWeeks, 3);
  // Zone au-dessus du MRV (>20 séries) signalée dans overMrv (semaine en cours).
  const over = L.deloadRecommendation(
    [{ date: today, exercises: [{ name: 'Gainage planche', sets: 22 }] }, hard('2026-07-15')], today);
  assert.equal(over.overMrv, true);
  assert.equal(over.peakZone, 'abs');
  assert.equal(over.peakSets, 22);
  // Garde-fous : historique insuffisant (< 2 semaines avec séries) et date invalide → null.
  assert.equal(L.deloadRecommendation([hard('2026-07-22')], today), null);
  assert.equal(L.deloadRecommendation([], today), null);
  assert.equal(L.deloadRecommendation(['2026-07-22'].map(hard), 'pas-une-date'), null);
});
test('muscleBalance : équilibre poussée (pecs+épaules) / tirage (dos) sur 28 j', () => {
  const w = [
    { date: '2026-07-08', exercises: [{ name: 'Pompes classiques', sets: 4 }] }, // push +4 (chest/shoulders)
    { date: '2026-07-06', exercises: [{ name: 'Pompes inclinées', sets: 4 }] },   // push +4
    { date: '2026-07-05', exercises: [{ name: 'Tractions', sets: 3 }] },          // pull +3 (back)
    { date: '2026-05-01', exercises: [{ name: 'Tractions', sets: 5 }] },          // hors 28 j
  ];
  const mb = L.muscleBalance(w, '2026-07-10', 28);
  assert.equal(mb.push, 8); assert.equal(mb.pull, 3);
  assert.equal(mb.ratio, 2.67, '8/3'); assert.equal(mb.zone, 'push-heavy');
  // pas de tirage → no-pull
  assert.equal(L.muscleBalance([{ date: '2026-07-08', exercises: [{ name: 'Pompes classiques', sets: 3 }] }], '2026-07-10').zone, 'no-pull');
  // équilibré
  const bal = L.muscleBalance([{ date: '2026-07-08', exercises: [{ name: 'Pompes classiques', sets: 3 }, { name: 'Tractions', sets: 3 }] }], '2026-07-10');
  assert.equal(bal.zone, 'balanced'); assert.equal(bal.ratio, 1);
  assert.equal(L.muscleBalance([{ date: '2026-07-08', exercises: [{ name: 'Gainage planche', sets: 3 }] }], '2026-07-10'), null, 'ni poussée ni tirage → null');
  assert.equal(L.muscleBalance(w, 'x'), null);
  // Double comptage : un exercice à la fois dos ET épaules (back+shoulders) ne doit compter ses
  // séries qu'UNE fois, du côté de sa zone principale (back = tirage). Avant le fix il gonflait les
  // deux plateaux → push=4/pull=4/ratio=1/zone='balanced' (isométrie lue « équilibrée » à tort).
  const hang = L.muscleBalance([{ date: '2026-07-08', exercises: [{ name: 'Suspension barre', sets: 4 }] }], '2026-07-10');
  assert.equal(hang.push, 0, 'suspension barre = tirage seul (pas de poussée)');
  assert.equal(hang.pull, 4); assert.equal(hang.ratio, 0, 'push 0 / pull 4 → ratio 0'); assert.equal(hang.zone, 'no-push');
  const carry = L.muscleBalance([{ date: '2026-07-08', exercises: [{ name: 'Marche fermier kettlebell', sets: 3 }] }], '2026-07-10');
  assert.equal(carry.push, 0, 'marche fermier (back+abs+shoulders) → zone principale back = tirage');
  assert.equal(carry.pull, 3); assert.equal(carry.zone, 'no-push');
  // Mélange réel : suspension barre (tirage) + vraie poussée → chacun compté une fois, équilibré.
  const mix = L.muscleBalance([{ date: '2026-07-08', exercises: [{ name: 'Suspension barre', sets: 4 }, { name: 'Pompes classiques', sets: 4 }] }], '2026-07-10');
  assert.equal(mix.push, 4); assert.equal(mix.pull, 4); assert.equal(mix.zone, 'balanced');
});
test('pushPullAdvice : conseil d’équilibre poussée/tirage', () => {
  // push-heavy (8/3) → avertissement, ajoute du tirage
  const heavy = L.pushPullAdvice({ push: 8, pull: 3, ratio: 2.67, zone: 'push-heavy' });
  assert.equal(heavy.ok, false);
  assert.ok(/tirage|dos/i.test(heavy.advice));
  assert.equal(heavy.push, 8); assert.equal(heavy.pull, 3);
  // équilibré → ok
  const bal = L.pushPullAdvice({ push: 6, pull: 6, ratio: 1, zone: 'balanced' });
  assert.equal(bal.ok, true); assert.equal(bal.emoji, '⚖️');
  // no-pull → conseil dos
  assert.ok(/dos/i.test(L.pushPullAdvice({ push: 8, pull: 0, ratio: null, zone: 'no-pull' }).advice));
  // pull-heavy
  assert.equal(L.pushPullAdvice({ push: 2, pull: 8, ratio: 0.25, zone: 'pull-heavy' }).ok, false);
  // données insuffisantes (< 6 séries) → null
  assert.equal(L.pushPullAdvice({ push: 2, pull: 1, zone: 'push-heavy' }), null);
  // null / vide → null
  assert.equal(L.pushPullAdvice(null), null);
  assert.equal(L.pushPullAdvice({ push: 0, pull: 0, zone: 'x' }), null);
});
test('zoneFreshness : jours depuis le dernier travail de chaque zone + statut', () => {
  const w = [
    { date: '2026-07-10', exercises: [{ name: 'Gainage planche' }] },       // abs aujourd'hui
    { date: '2026-07-06', exercises: [{ name: 'Goblet squat kettlebell' }] }, // legs+glutes il y a 4 j
  ];
  const zf = L.zoneFreshness(w, '2026-07-10');
  const byZone = Object.fromEntries(zf.map(z => [z.zone, z]));
  assert.equal(zf.length, 7, 'les 7 groupes');
  assert.equal(byZone.abs.days, 0); assert.equal(byZone.abs.status, 'recent', '0 j → récent');
  assert.equal(byZone.legs.days, 4); assert.equal(byZone.legs.status, 'ready', '≥ 2 j → prêt');
  assert.equal(byZone.glutes.status, 'ready');
  assert.equal(byZone.chest.days, null); assert.equal(byZone.chest.status, 'never', 'jamais travaillé');
  assert.deepEqual(L.zoneFreshness([], '2026-07-10').filter(z => z.status !== 'never'), []);
  assert.deepEqual(L.zoneFreshness(w, 'x'), []);
});
test('suggestTrainingFocus : groupes reposés + déficit, exclut le récent', () => {
  const w = [
    { date: '2026-07-10', exercises: [{ name: 'Goblet squat kettlebell', sets: 3 }] }, // legs+glutes aujourd'hui → récent
    { date: '2026-07-04', exercises: [{ name: 'Tractions', sets: 3 }] },                // back+arms 6 j → prêt
  ];
  const tf = L.suggestTrainingFocus(w, '2026-07-10');
  const zones = tf.map(z => z.zone);
  assert.ok(!zones.includes('legs') && !zones.includes('glutes'), 'groupes récents exclus');
  assert.equal(tf.length, 5, '7 zones - 2 récentes');
  // jamais travaillés (score 17) devant back/arms (13)
  assert.equal(tf[0].status, 'never'); assert.equal(tf[0].zone, 'abs', 'alpha entre jamais-travaillés');
  const back = tf.find(z => z.zone === 'back');
  assert.equal(back.sets, 3); assert.equal(back.deficit, 7); assert.equal(back.days, 6);
  assert.deepEqual(L.suggestTrainingFocus(w, 'x'), []);
});
test('neglectedZoneReport : zone la moins travaillée sur la fenêtre', () => {
  // beaucoup de jambes/fessiers, rien pour le haut du corps sur 28 j
  const w = [
    { date: '2026-07-10', exercises: [{ name: 'Fentes arrière', completedSets: 4 }, { name: 'Pont fessier', completedSets: 4 }] },
    { date: '2026-07-06', exercises: [{ name: 'Chaise au mur', completedSets: 4 }, { name: 'Split squat bulgare', completedSets: 4 }] },
    { date: '2026-07-02', exercises: [{ name: 'Pompes classiques', completedSets: 2 }] }, // un peu de chest/arms/shoulders
  ];
  const r = L.neglectedZoneReport(w, '2026-07-13', 28);
  assert.ok(r, 'rapport présent');
  // zone du haut du corps jamais travaillée → 0 séries, marquée à rattraper (abs ou dos, tous deux à 0)
  assert.equal(r.sets, 0);
  assert.ok(['abs', 'back'].includes(r.zone), 'zone non travaillée renvoyée');
  assert.equal(r.bySets.back, 0);
  assert.equal(r.bySets.abs, 0);
  assert.equal(r.neglected, true);
  assert.ok(r.emoji && r.label && r.bySets);
  assert.ok(r.bySets.legs > 0, 'jambes bien travaillées');
  // fenêtre trop courte (rien dedans) → aucune donnée
  assert.equal(L.neglectedZoneReport(w, '2026-08-30', 7), null);
  // aucune séance → null
  assert.equal(L.neglectedZoneReport([], '2026-07-13'), null);
  assert.equal(L.neglectedZoneReport(w, 'x'), null);
});
test('equipmentOptions : matériels distincts, comptés et triés par fréquence', () => {
  const ex = [
    { name: 'A', kind: 'Poids du corps' }, { name: 'B', kind: 'Poids du corps' },
    { name: 'C', kind: 'Kettlebell' }, { name: 'D', kind: 'Gilet lesté' }, { name: 'E', kind: '' }, { name: 'F' },
  ];
  const opts = L.equipmentOptions(ex);
  assert.equal(opts[0].kind, 'Poids du corps'); assert.equal(opts[0].count, 2, 'le plus fréquent en premier');
  assert.equal(opts.length, 3, 'kinds vides/absents ignorés');
  // fréquences égales (1) → ordre alphabétique FR : Gilet lesté avant Kettlebell
  assert.equal(opts[1].kind, 'Gilet lesté'); assert.equal(opts[2].kind, 'Kettlebell');
  assert.deepEqual(L.equipmentOptions([]), []);
  assert.deepEqual(L.equipmentOptions('nope'), []);
});

test('activeExerciseFilters : étiquettes des filtres non-défaut', () => {
  assert.deepEqual(L.activeExerciseFilters({}), []);
  assert.deepEqual(L.activeExerciseFilters({ family: 'all', equip: 'all', goal: 'all', term: '', favOnly: false, newOnly: false }), [], 'tous par défaut → []');
  const a = L.activeExerciseFilters({ goal: 'arms', favOnly: true, term: '  curl  ' });
  assert.equal(a.length, 3);
  assert.ok(a.some(x => /curl/.test(x)), 'la recherche apparaît (casse/espaces conservés hors trim)');
  assert.ok(a.some(x => /Bras/.test(x)), 'objectif traduit');
  assert.ok(a.some(x => /Favoris/.test(x)));
  assert.deepEqual(L.activeExerciseFilters({ family: 'trail', equip: 'Kettlebell', newOnly: true }), ['Trail', '🧰 Kettlebell', '🆕 Nouveaux']);
  assert.equal(L.activeExerciseFilters(null).length, 0, 'entrée nulle → []');
  assert.equal(L.activeExerciseFilters({ term: '   ' }).length, 0, 'recherche vide (espaces) ignorée');
});
test('toggleFavorite : ajoute/retire un nom, sans muter, ignore vides', () => {
  const a = L.toggleFavorite([], 'Squat');
  assert.deepEqual(a, ['Squat'], 'ajout');
  const b = L.toggleFavorite(a, 'Tractions');
  assert.deepEqual(b, ['Squat', 'Tractions']);
  const c = L.toggleFavorite(b, 'Squat');
  assert.deepEqual(c, ['Tractions'], 'retrait');
  assert.deepEqual(a, ['Squat'], 'entrée non mutée');
  assert.deepEqual(L.toggleFavorite(['X'], '  '), ['X'], 'nom vide ignoré');
  assert.deepEqual(L.toggleFavorite(['X', 5, ''], 'X'), [], 'nettoie les non-chaînes et retire X');
  assert.deepEqual(L.toggleFavorite('nope', 'Squat'), ['Squat']);
});
test('buildZonePlan : programme progressif, décharge toutes les 4 semaines', () => {
  const p = L.buildZonePlan('abs', 8, 3);
  assert.equal(p.zone, 'abs');
  assert.equal(p.weeks, 8);
  assert.equal(p.perWeek, 3);
  assert.equal(p.exercises.length, 5, '5 exercices clés');
  assert.ok(p.exercises.every(n => L.goalMatch(n, 'abs')), 'tous ciblent les abdos');
  assert.equal(p.blocks.length, 8);
  assert.ok(p.blocks[3].deload && p.blocks[7].deload, 'décharge sem. 4 et 8');
  assert.ok(!p.blocks[0].deload, 'sem. 1 pas une décharge');
  assert.ok(p.blocks[6].reps >= p.blocks[0].reps, 'volume qui monte');
  assert.equal(L.buildZonePlan('zone-bidon', 8), null, 'zone inconnue → null');
  const clamp = L.buildZonePlan('legs', 99, 9);
  assert.ok(clamp.weeks <= 12 && clamp.perWeek <= 5, 'bornes respectées');
});
test('buildTrainingWeek : combine objectifs + runs, jours espacés, repos restant', () => {
  const p = L.buildTrainingWeek(['arms', 'abs', 'legs'], 3, 2);
  assert.equal(p.zones.length, 3);
  assert.equal(p.sessions, 5, '3 muscu + 2 runs');
  assert.ok(p.days.every(d => d.weekday >= 1 && d.weekday <= 6), 'jours Lun-Sam');
  const wd = p.days.map(d => d.weekday);
  assert.equal(new Set(wd).size, wd.length, 'pas 2 séances le même jour');
  const musc = p.days.filter(d => d.type === 'muscu');
  assert.equal(musc.length, 3);
  assert.ok(musc.every(d => d.exercises.length > 0), 'chaque muscu a des exercices');
  assert.ok(p.days.some(d => d.long), 'une sortie longue');
  assert.equal(L.buildTrainingWeek([], 3, 2), null, 'sans objectif → null');
  const clamp = L.buildTrainingWeek(['legs'], 6, 5);
  assert.ok(clamp.strengthDays + clamp.runs <= 6, 'au moins 1 jour de repos');
  // DISTANCE par objectif : chaque course reçoit un km, la sortie longue est la plus longue,
  // le total ≈ volume hebdo saisi (30 km ici), affiché dans le titre.
  const km = L.buildTrainingWeek(['legs'], 2, 3, false, { weeklyKm: 30 });
  const runs = km.days.filter(d => d.type === 'run');
  assert.ok(runs.every(d => d.km > 0), 'chaque course a une distance');
  assert.match(runs.find(d => d.long).title, /km/, 'le km est dans le titre');
  const longKm = runs.find(d => d.long).km, maxEasy = Math.max(...runs.filter(d => !d.long).map(d => d.km));
  assert.ok(longKm >= maxEasy, 'la sortie longue est la plus longue');
  const total = runs.reduce((s, d) => s + d.km, 0);
  assert.ok(total >= 27 && total <= 33, `total ≈ 30 km, obtenu ${total}`);
  // POLARISATION 80/20 (Seiler) : dès 3 courses, UNE séance qualité (tempo/seuil), le reste facile,
  // la longue en dernier. Chaque course porte un conseil d'intensité (zone 2 pour les faciles).
  const r3 = L.buildTrainingWeek(['legs'], 2, 3, false, { weeklyKm: 30, week: 1 }).days.filter(d => d.type === 'run');
  assert.deepEqual(r3.map(d => d.intensity), ['easy', 'quality', 'long']);
  // La séance qualité est un VRAI intervalle VO2max (plus le simple tempo/seuil) et porte sa séance.
  const q = r3.find(d => d.intensity === 'quality');
  assert.match(q.title, /VO2max/i, 'la séance qualité est une séance VO2max');
  assert.equal(q.session.key, 'billat3030', 'semaine 1 → 30/30 Billat');
  assert.match(r3.find(d => d.intensity === 'easy').note, /zone 2|conversation|facile/i);
  const r2 = L.buildTrainingWeek(['legs'], 2, 2, false, { weeklyKm: 24 }).days.filter(d => d.type === 'run');
  assert.deepEqual(r2.map(d => d.intensity), ['easy', 'long'], '2 courses : pas de séance dure');
});
test('qualitySession : VO2max qui tourne (variété) et progresse d’un tour à l’autre', () => {
  // Méso-cycle de 6 semaines : 3 familles (30/30 Billat, 4×4 Norvégien, côtes), chacune 2 fois avec
  // plus de volume au 2ᵉ tour (progression). Sources citées dans chaque séance.
  const keys = [1, 2, 3, 4, 5, 6].map(w => L.qualitySession(w).key);
  assert.deepEqual(keys, ['billat3030', 'norv4x4', 'cotes', 'billat3030', 'norv4x4', 'cotes']);
  const families = new Set([1, 2, 3].map(w => L.qualitySession(w).key));
  assert.equal(families.size, 3, 'trois familles distinctes de séances dures');
  // Progression : la même famille revient PLUS VOLUMINEUSE au tour suivant.
  assert.ok(L.qualitySession(4).reps > L.qualitySession(1).reps, '30/30 : plus de répétitions au 2ᵉ tour');
  assert.ok(L.qualitySession(5).reps > L.qualitySession(2).reps, '4×4 : un bloc de plus au 2ᵉ tour');
  assert.ok(L.qualitySession(6).reps > L.qualitySession(3).reps, 'côtes : plus de côtes au 2ᵉ tour');
  // Le modulo fait boucler le cycle : semaine 7 == semaine 1.
  assert.equal(L.qualitySession(7).key, L.qualitySession(1).key, 'le cycle boucle (7 → 1)');
  // Toutes centrées VO2max, toutes sourcées, entrées invalides → semaine 1 (jamais de crash).
  [1, 2, 3, 4, 5, 6].forEach(w => {
    const s = L.qualitySession(w);
    assert.equal(s.family, 'VO2max');
    assert.ok(s.source && s.title.includes('VO2max') && s.note.length > 40);
  });
  assert.equal(L.qualitySession(0).key, L.qualitySession(1).key, '0 → semaine 1');
  assert.equal(L.qualitySession('x').key, L.qualitySession(1).key, 'invalide → semaine 1');
});
test('isoWeekNumber : numéro de semaine ISO, robuste aux entrées invalides', () => {
  assert.equal(L.isoWeekNumber('2026-01-01'), 1, '1er janvier 2026 (jeudi) → semaine 1');
  assert.equal(L.isoWeekNumber('2026-07-20'), 30, '20 juillet 2026 → semaine 30');
  assert.equal(L.isoWeekNumber('2024-12-30'), 1, '30 déc. 2024 → semaine 1 de 2025 (règle ISO)');
  assert.equal(L.isoWeekNumber(''), 1, 'vide → 1');
  assert.equal(L.isoWeekNumber('pas-une-date'), 1, 'invalide → 1');
  assert.ok(L.isoWeekNumber('2026-07-20') >= 1 && L.isoWeekNumber('2026-07-20') <= 53);
});
test('runDistances : répartit le volume hebdo, sortie longue en dernier et la plus grosse', () => {
  assert.deepEqual(L.runDistances(0, 30), []);
  assert.equal(L.runDistances(1, 30)[0], 12, 'une seule séance : run modéré plafonné');
  const d3 = L.runDistances(3, 30);
  assert.equal(d3.length, 3);
  assert.ok(d3[2] >= d3[0] && d3[2] >= d3[1], 'la longue (dernière) est la plus grosse');
  assert.ok(d3.every(k => k >= 3), 'jamais sous 3 km');
  // n=2 : la longue reste plus grosse que la facile (bug corrigé).
  const d2 = L.runDistances(2, 14);
  assert.ok(d2[1] > d2[0], 'longue > facile même à petit volume');
  // sans volume saisi → défaut par accent
  assert.ok(L.runDistances(2, 0, 'facile').reduce((a, b) => a + b, 0) > 0);
});
test('agendaMatch : recherche titre/lieu/notes, insensible à la casse et aux accents', () => {
  const it = { title: 'RDV Kiné', location: 'Cabinet Lorient', notes: 'ordonnance' };
  assert.equal(L.agendaMatch(it, ''), true, 'requête vide → tout passe');
  assert.equal(L.agendaMatch(it, 'kiné'), true, 'titre');
  assert.equal(L.agendaMatch(it, 'LORIENT'), true, 'lieu (insensible casse)');
  assert.equal(L.agendaMatch(it, 'ordonnance'), true, 'notes');
  assert.equal(L.agendaMatch(it, 'dentiste'), false, 'sans correspondance');
  assert.equal(L.agendaMatch(null, 'x'), false, 'item nul → false');
  // Repli d'accents : taper sans accent (réflexe FR courant) trouve quand même.
  assert.equal(L.agendaMatch(it, 'kine'), true, 'requête sans accent → titre accentué trouvé');
  assert.equal(L.agendaMatch({ title: 'Réunion équipe' }, 'reunion equipe'), true, 'plusieurs accents');
  assert.equal(L.agendaMatch({ notes: 'Château' }, 'CHATEAU'), true, 'accent + casse dans les notes');
  assert.equal(L.agendaMatch(it, 'kinésithérapie'), false, 'requête plus longue que le foin → toujours false');
});
test('dayColumns : chevauchements côte à côte, indépendants sur 1 colonne', () => {
  // deux qui se chevauchent + un séparé
  const r = L.dayColumns([{ start: 540, end: 600 }, { start: 570, end: 630 }, { start: 700, end: 760 }]);
  assert.equal(r[0].cols, 2, 'le groupe qui se chevauche a 2 colonnes');
  assert.equal(r[1].cols, 2);
  assert.notEqual(r[0].col, r[1].col, 'colonnes différentes pour les 2 qui se chevauchent');
  assert.equal(r[2].cols, 1, 'l’événement isolé garde 1 colonne');
  assert.equal(r[2].col, 0);
  // tous séparés → 1 colonne chacun
  const s = L.dayColumns([{ start: 60, end: 120 }, { start: 120, end: 180 }]);
  assert.ok(s.every(x => x.cols === 1), 'contigus sans chevauchement = 1 colonne');
  assert.deepEqual(L.dayColumns([]), [], 'vide → []');
  // réutilisation de colonne : A[9h-10h] et B[9h30-10h30] chevauchent (2 col), C[10h10-11h] commence
  // APRÈS la fin de A → doit reprendre la colonne 0 (libérée), pas en créer une 3e. Le cluster A-B-C
  // reste à 2 colonnes malgré 3 événements.
  const reuse = L.dayColumns([{ start: 540, end: 600 }, { start: 570, end: 630 }, { start: 610, end: 660 }]);
  assert.deepEqual(reuse.map(x => x.col), [0, 1, 0], 'C réutilise la colonne 0 libérée par A');
  assert.ok(reuse.every(x => x.cols === 2), 'cluster A-B-C tient sur 2 colonnes (pas 3)');
  // sortie alignée sur l'ORDRE D'ENTRÉE même si l'entrée est désordonnée (mapping par index i),
  // et clustering correct : le 1er élément (isolé, 700-760) reste seul, les 2 autres se chevauchent.
  const order = L.dayColumns([{ start: 700, end: 760 }, { start: 540, end: 600 }, { start: 570, end: 630 }]);
  assert.deepEqual(order, [{ col: 0, cols: 1 }, { col: 0, cols: 2 }, { col: 1, cols: 2 }], 'ordre d’entrée préservé + clustering');
  // concurrence maximale : trois blocs mutuellement chevauchants → 3 colonnes distinctes
  const three = L.dayColumns([{ start: 540, end: 600 }, { start: 550, end: 610 }, { start: 560, end: 620 }]);
  assert.deepEqual(three.map(x => x.col), [0, 1, 2], '3 chevauchements → 3 colonnes distinctes');
  assert.ok(three.every(x => x.cols === 3), 'cols = concurrence max du cluster');
  // borne end : end absent ou ≤ start est ramené à start+1 → l’événement occupe quand même un créneau
  // et deux blocs de longueur nulle au même départ se retrouvent côte à côte (2 colonnes).
  const clamped = L.dayColumns([{ start: 100 }, { start: 100, end: 50 }]);
  assert.deepEqual(clamped.map(x => x.col), [0, 1], 'end ≤ start ramené à start+1 → côte à côte');
  // start/end non numériques → coercés à 0 (Number || 0), l’événement reste placé sans planter
  assert.deepEqual(L.dayColumns([{ start: 'abc', end: 'xyz' }]), [{ col: 0, cols: 1 }], 'entrées non numériques → 0, placé');
});
test('personalRecords : meilleure charge et meilleures reps par exercice', () => {
  const w = [
    { date: '2026-06-01', exercises: [{ name: 'Goblet squat kettlebell', load: 16, reps: 8 }] },
    { date: '2026-06-08', exercises: [{ name: 'Goblet squat kettlebell', load: 20, reps: 6 }, { name: 'Tractions', load: 0, reps: 8 }] },
    { date: '2026-06-15', exercises: [{ name: 'Tractions', load: 0, setLogs: [{ load: 0, reps: 10 }, { load: 0, reps: 9 }] }] }
  ];
  const r = L.personalRecords(w);
  assert.equal(r['Goblet squat kettlebell'].load, 20, 'record charge = 20 kg');
  assert.equal(r['Goblet squat kettlebell'].date, '2026-06-08', 'date du record de charge');
  assert.equal(r['Tractions'].reps, 10, 'record reps (via setLogs) = 10');
  assert.deepEqual(L.personalRecords([]), {}, 'vide → {}');
  // Forme legacy mono-exercice (`w.exercise` sans tableau `exercises`) : le record doit compter,
  // comme dans toutes les sœurs — sinon un best all-time d'une vieille séance est volé.
  const legacy = [
    { date: '2026-05-01', exercise: 'Développé couché', load: 80, reps: 5 },
    { date: '2026-05-08', exercise: 'Développé couché', load: 85, reps: 4 },
    { date: '2026-05-15', exercises: [{ name: 'Développé couché', load: 82, reps: 6 }] }
  ];
  const rl = L.personalRecords(legacy);
  assert.equal(rl['Développé couché'].load, 85, 'record charge legacy = 85 kg (séance mono-exercice comptée)');
  assert.equal(rl['Développé couché'].reps, 6, 'meilleures reps = 6 (mix legacy + moderne)');
  // La date suit la DERNIÈRE amélioration (charge ou reps) : ici les reps montent à 6 le 05-15.
  assert.equal(rl['Développé couché'].date, '2026-05-15', 'date = dernière amélioration (reps)');
  // Sans le repli legacy, la charge tomberait à 82 (seule la séance moderne compterait) : preuve du fix.
});
test('newRecords : détecte les records battus entre deux instantanés', () => {
  const before = { Tractions: { load: 0, reps: 10 }, 'Goblet squat': { load: 20, reps: 8 } };
  const after = { Tractions: { load: 0, reps: 12 }, 'Goblet squat': { load: 24, reps: 8 }, Pompes: { load: 0, reps: 20 } };
  const prs = L.newRecords(before, after);
  const byName = Object.fromEntries(prs.map(p => [p.name, p]));
  assert.ok(byName.Tractions.repsPr && !byName.Tractions.loadPr, 'Tractions : record de reps');
  assert.ok(byName['Goblet squat'].loadPr, 'Goblet : record de charge');
  assert.ok(byName.Pompes, 'nouvel exercice → record');
  assert.equal(prs.length, 3);
  assert.deepEqual(L.newRecords(after, after), [], 'rien battu → []');
  assert.deepEqual(L.newRecords(null, null), []);
});
test('strengthRecords : meilleure série (1RM estimé) par exercice, triée', () => {
  const w = [
    { date: '2026-06-01', exercises: [{ name: 'Développé couché', load: 40, reps: 8 }] },       // 1RM ≈ 50.5
    { date: '2026-06-08', exercises: [{ name: 'Développé couché', load: 45, reps: 5 }] },       // 1RM ≈ 52.5 → mieux
    { date: '2026-06-08', exercises: [{ name: 'Squat', setLogs: [{ load: 60, reps: 10 }, { load: 70, reps: 3 }] }] }, // 60×10≈80 > 70×3≈77 → meilleure série retenue
    { date: '2026-06-15', exercises: [{ name: 'Gainage', reps: 60 }] },                          // sans charge → ignoré
  ];
  const r = L.strengthRecords(w);
  assert.equal(r.length, 2, 'seuls les exercices chargés');
  assert.equal(r[0].name, 'Squat', 'trié par 1RM décroissant');
  assert.equal(r[0].load, 60); assert.equal(r[0].reps, 10);
  const dc = r.find(x => x.name === 'Développé couché');
  assert.equal(dc.load, 45); assert.equal(dc.reps, 5); assert.equal(dc.date, '2026-06-08');
  assert.equal(dc.e1rm, L.estimate1RM(45, 5));
  assert.deepEqual(L.strengthRecords([]), []);
});
test('strengthRecords : tolère la forme legacy mono-exercice w.exercise (#440)', () => {
  // Séance importée/legacy : l'exercice est noté directement sur l'objet séance, sans tableau exercises[].
  const legacy = [
    { date: '2025-03-01', exercise: 'Tractions lestées', load: 30, reps: 6 },   // 1RM = 30×(1+6/30) = 36
    { date: '2025-03-08', exercise: 'Tractions lestées', load: 32, reps: 5 },   // 1RM ≈ 37.5 → mieux
  ];
  const r = L.strengthRecords(legacy);
  assert.equal(r.length, 1, 'l\'exercice legacy est bien compté');
  assert.equal(r[0].name, 'Tractions lestées');
  assert.equal(r[0].load, 32); assert.equal(r[0].reps, 5);
  assert.equal(r[0].e1rm, L.estimate1RM(32, 5)); assert.equal(r[0].date, '2025-03-08');
  // Mix legacy + moderne : une meilleure série legacy prime sur une série moderne plus faible.
  const mix = [
    { date: '2025-03-01', exercise: 'Squat', load: 100, reps: 5 },              // legacy, 1RM ≈ 116.5
    { date: '2025-03-10', exercises: [{ name: 'Squat', load: 90, reps: 5 }] },  // moderne, 1RM = 105 → moins bien
  ];
  const rm = L.strengthRecords(mix);
  assert.equal(rm.length, 1);
  assert.equal(rm[0].load, 100); assert.equal(rm[0].date, '2025-03-01', 'la meilleure série legacy est retenue');
});
test('nextStrengthMilestone : prochain palier rond + écart', () => {
  assert.deepEqual(L.nextStrengthMilestone(133.5, 10), { milestone: 140, gap: 6.5 });
  assert.deepEqual(L.nextStrengthMilestone(100, 10), { milestone: 110, gap: 10 }, 'strictement au-dessus');
  assert.deepEqual(L.nextStrengthMilestone(62, 5), { milestone: 65, gap: 3 });
  assert.equal(L.nextStrengthMilestone(0), null);
  assert.equal(L.nextStrengthMilestone('x'), null);
});
test('exerciseHistoryStats : séances, dernière date, meilleure série, total séries', () => {
  const w = [
    { date: '2026-06-01', exercises: [{ name: 'Développé couché', load: 40, reps: 8, sets: 3 }] },
    { date: '2026-06-10', exercises: [{ name: 'Développé couché', setLogs: [{ load: 42.5, reps: 6 }, { load: 42.5, reps: 6 }] }, { name: 'Tractions', reps: 10, sets: 4 }] },
    { date: '2026-05-20', exercise: 'Tractions', reps: 8, sets: 3 }, // top-level
  ];
  const dc = L.exerciseHistoryStats(w, 'Développé couché');
  assert.equal(dc.sessions, 2);
  assert.equal(dc.lastDate, '2026-06-10', 'dernière séance');
  assert.equal(dc.totalSets, 5, '3 + 2 séries loggées');
  assert.equal(dc.bestSet.load, 42.5); assert.equal(dc.bestSet.e1rm, L.estimate1RM(42.5, 6));
  const tr = L.exerciseHistoryStats(w, 'Tractions'); // poids du corps
  assert.equal(tr.sessions, 2); assert.equal(tr.bestSet, null, 'aucune charge → pas de meilleure série chargée');
  assert.equal(tr.bestReps, 10, 'meilleures reps au poids du corps');
  assert.equal(L.exerciseHistoryStats(w, 'Inconnu'), null);
  assert.equal(L.exerciseHistoryStats([], 'X'), null);
});
test('workoutsTable : TSV en-tête + lignes triées récent→ancien', () => {
  const w = [
    { date: '2026-07-05', type: 'strength', duration: 40, effort: 3, exercises: [{ name: 'Tractions' }, { name: 'Pompes' }] },
    { date: '2026-07-08', type: 'run', duration: 30, distance: 6, effort: 2 },
  ];
  const tsv = L.workoutsTable(w);
  const lines = tsv.split('\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'Date\tType\tDurée (min)\tDistance (km)\tRPE\tExercices');
  assert.ok(lines[1].startsWith('2026-07-08\trun\t30\t6\t2'), 'le plus récent en premier');
  assert.ok(lines[2].includes('Tractions, Pompes'));
  // séparateur personnalisé + robustesse
  assert.ok(L.workoutsTable(w, ';').split('\n')[1].includes(';'));
  assert.equal(L.workoutsTable([]).split('\n').length, 1, 'juste l’en-tête');
  assert.equal(L.workoutsTable('x').split('\n').length, 1);
});

test('lastLoggedSession : dernière séance muscu/renfo avec exercices', () => {
  const w = [
    { type: 'run', date: '2026-07-10', distance: 5 },                    // pas muscu
    { type: 'strength', date: '2026-07-08', exercises: [{ name: 'Tractions' }] },
    { type: 'strength', date: '2026-07-05', exercises: [{ name: 'Pompes' }] },
    { type: 'strength', date: '2026-07-09', exercises: [] },             // sans exercices
  ];
  const s = L.lastLoggedSession(w);
  assert.equal(s.date, '2026-07-08'); assert.equal(s.exercises[0].name, 'Tractions');
  assert.equal(L.lastLoggedSession([{ type: 'run', date: '2026-07-10' }]), null, 'aucune muscu → null');
  assert.equal(L.lastLoggedSession([]), null);
  // type personnalisé
  assert.equal(L.lastLoggedSession(w, ['run']), null, 'run n’a pas d’exercices');
});

test('loggedExerciseNames : noms uniques déjà réalisés (top-level + exercises[])', () => {
  const w = [
    { date: '2026-06-01', exercise: 'Tractions', exercises: [{ name: 'Tractions' }, { name: 'Pompes classiques' }] },
    { date: '2026-06-08', exercises: [{ name: 'Goblet squat kettlebell' }] },
    { date: '2026-06-09' }
  ];
  const names = L.loggedExerciseNames(w).sort();
  assert.deepEqual(names, ['Goblet squat kettlebell', 'Pompes classiques', 'Tractions'], 'uniques, sans doublon');
  assert.deepEqual(L.loggedExerciseNames([]), [], 'vide → []');
});
test('workoutsWithExercise : séances contenant un exercice (exercises[] ou top-level)', () => {
  const w = [
    { id: 1, date: '2026-06-01', exercises: [{ name: 'Tractions' }, { name: 'Pompes classiques' }] },
    { id: 2, date: '2026-06-08', exercise: 'Tractions' },
    { id: 3, date: '2026-06-09', exercises: [{ name: 'Squat' }] },
  ];
  assert.deepEqual(L.workoutsWithExercise(w, 'Tractions').map(x => x.id), [1, 2]);
  assert.deepEqual(L.workoutsWithExercise(w, 'Squat').map(x => x.id), [3]);
  assert.deepEqual(L.workoutsWithExercise(w, 'Inconnu'), []);
  assert.equal(L.workoutsWithExercise(w, 'all').length, 3, '\'all\' → toutes');
  assert.equal(L.workoutsWithExercise(w, '').length, 3, 'vide → toutes');
  assert.deepEqual(L.workoutsWithExercise('x', 'Tractions'), []);
});
test('workoutTonnage : kg soulevés (setLogs validés prioritaires, sinon charge×reps×séries)', () => {
  // setLogs avec complétion → seules les séries validées comptent (40×8)
  assert.equal(L.workoutTonnage({ exercises: [{ name: 'DC', setLogs: [{ load: 40, reps: 8, completed: true }, { load: 40, reps: 6, completed: false }] }] }), 320);
  // setLogs sans aucune complétion → toutes comptent (40×8 + 40×7)
  assert.equal(L.workoutTonnage({ exercises: [{ name: 'DC', setLogs: [{ load: 40, reps: 8 }, { load: 40, reps: 7 }] }] }), 600);
  // pas de setLogs → charge × reps × séries (60×10×3)
  assert.equal(L.workoutTonnage({ exercises: [{ name: 'Sq', load: 60, reps: 10, sets: 3 }] }), 1800);
  assert.equal(L.workoutTonnage({ exercises: [{ name: 'Tractions', reps: 10, sets: 3 }] }), 0, 'poids du corps → 0');
  // legacy mono-exercice `w.exercise` (séance importée/restaurée) : charge × reps × séries (80×5×4)
  assert.equal(L.workoutTonnage({ date: '2025-03-08', exercise: 'Squat', load: 80, reps: 5, sets: 4 }), 1600, 'legacy w.exercise compté');
  // exercises vide → repli legacy inactif si pas de w.exercise
  assert.equal(L.workoutTonnage({ exercises: [] }), 0);
  assert.equal(L.workoutTonnage({}), 0);
  assert.equal(L.workoutTonnage(null), 0);
});
test('workoutSetCount : séries validées (setLogs) ou repli sur `sets` (saisie manuelle / legacy)', () => {
  // setLogs présents → séries VALIDÉES uniquement (identique à completedSetCount)
  assert.equal(L.workoutSetCount({ exercises: [{ name: 'DC', setLogs: [{ completed: true }, { completed: false }, { completed: true }] }] }), 2);
  assert.equal(L.workoutSetCount({ exercises: [{ name: 'DC', setLogs: [{ completed: false }, { completed: false }] }] }), 0);
  // sans setLogs (séance saisie au formulaire) → champ `sets`
  assert.equal(L.workoutSetCount({ exercises: [{ name: 'Sq', load: 60, reps: 10, sets: 3 }] }), 3);
  assert.equal(L.workoutSetCount({ exercises: [{ name: 'A', sets: 4 }, { name: 'B', sets: 3 }] }), 7);
  // legacy mono-exercice w.exercise → w.sets
  assert.equal(L.workoutSetCount({ date: '2025-03-08', exercise: 'Squat', load: 80, reps: 5, sets: 4 }), 4);
  // bornes hostiles
  assert.equal(L.workoutSetCount({ exercises: [{ name: 'X', sets: -2 }] }), 0);
  assert.equal(L.workoutSetCount({ exercises: [] }), 0);
  assert.equal(L.workoutSetCount({}), 0);
  assert.equal(L.workoutSetCount(null), 0);
});
test('lifetimeTonnage : compte une séance legacy w.exercise à côté d’une moderne', () => {
  // moderne 60×10×3=1800 + legacy 80×5×4=1600 → 3400 (sans le fix, la legacy pesait 0 → 1800)
  assert.equal(L.lifetimeTonnage([
    { date: '2026-07-01', exercises: [{ name: 'Sq', load: 60, reps: 10, sets: 3 }] },
    { date: '2025-03-08', exercise: 'Squat', load: 80, reps: 5, sets: 4 }
  ]), 3400);
});
test('strengthPlateau : détecte l’absence de nouveau record de force', () => {
  // progression continue → pas de plateau
  assert.equal(L.strengthPlateau([90, 92, 94, 96, 98], 3), null);
  // plateau : 3 dernières séances ne dépassent pas le meilleur d'avant (100)
  const p = L.strengthPlateau([95, 100, 98, 99, 97], 3);
  assert.ok(p && p.plateau === true && p.sessions === 3 && p.best === 100);
  assert.ok(/plateau/i.test(p.advice));
  // égalité au record → considéré plateau (pas de dépassement strict)
  assert.ok(L.strengthPlateau([100, 98, 99, 100], 3));
  // historique insuffisant → null
  assert.equal(L.strengthPlateau([100, 101, 102], 3), null);
  assert.equal(L.strengthPlateau([], 3), null);
  assert.equal(L.strengthPlateau(null), null);
});
test('strengthPlateauAny : plateau sur au moins un exercice-clé', () => {
  const wo = (date, name, load, reps) => ({ date, exercises: [{ name, setLogs: [{ completed: true, load, reps }] }] });
  // Squat stagne (100 puis n'excède plus), Développé progresse
  const workouts = [
    wo('2026-06-01', 'Squat', 100, 5), wo('2026-06-08', 'Squat', 98, 5), wo('2026-06-15', 'Squat', 99, 5), wo('2026-06-22', 'Squat', 97, 5),
    wo('2026-06-01', 'Développé', 40, 5), wo('2026-06-08', 'Développé', 45, 5), wo('2026-06-15', 'Développé', 50, 5), wo('2026-06-22', 'Développé', 55, 5),
  ];
  const r = L.strengthPlateauAny(workouts, { window: 3 });
  assert.equal(r.plateau, true);
  assert.equal(r.exercise, 'Squat');
  assert.ok(r.best > 0);
  // que des exercices en progression → pas de plateau
  const up = [
    wo('2026-06-01', 'Squat', 90, 5), wo('2026-06-08', 'Squat', 95, 5), wo('2026-06-15', 'Squat', 100, 5), wo('2026-06-22', 'Squat', 105, 5),
  ];
  assert.equal(L.strengthPlateauAny(up, { window: 3 }).plateau, false);
  // historique insuffisant → pas de plateau
  assert.equal(L.strengthPlateauAny([wo('2026-06-01', 'Squat', 100, 5)]).plateau, false);
  assert.equal(L.strengthPlateauAny([]).plateau, false);
  assert.equal(L.strengthPlateauAny(null).plateau, false);
  // exercices au poids du corps (sans charge) → ignorés, pas de plateau
  const bw = [
    { date: '2026-06-01', exercises: [{ name: 'Pompes', setLogs: [{ completed: true, load: 0, reps: 20 }] }] },
    { date: '2026-06-08', exercises: [{ name: 'Pompes', setLogs: [{ completed: true, load: 0, reps: 20 }] }] },
    { date: '2026-06-15', exercises: [{ name: 'Pompes', setLogs: [{ completed: true, load: 0, reps: 20 }] }] },
    { date: '2026-06-22', exercises: [{ name: 'Pompes', setLogs: [{ completed: true, load: 0, reps: 20 }] }] },
  ];
  assert.equal(L.strengthPlateauAny(bw).plateau, false);
});
test('strengthForecast : prévision d’atteinte du prochain palier de force', () => {
  // +2,5 kg de 1RM par semaine : de 90 à 97,5 en 3 semaines → prochain palier 100 (step 5)
  const series = [
    { date: '2026-06-08', e1rm: 90 },
    { date: '2026-06-15', e1rm: 92.5 },
    { date: '2026-06-22', e1rm: 95 },
    { date: '2026-06-29', e1rm: 97.5 },
  ];
  const f = L.strengthForecast(series, 5, '2026-06-29');
  assert.equal(f.current, 97.5);
  assert.equal(f.milestone, 100, 'prochain palier rond de 5');
  assert.equal(f.perWeek, 2.5, '+2,5 kg/sem');
  assert.equal(f.gap, 2.5);
  assert.equal(f.weeks, 1, 'ceil(2.5/2.5)');
  assert.equal(f.date, '2026-07-06');
  // progression nulle → pas de prévision
  assert.equal(L.strengthForecast([{ date: '2026-06-08', e1rm: 90 }, { date: '2026-06-22', e1rm: 90 }], 5, '2026-06-22'), null);
  // historique insuffisant → null
  assert.equal(L.strengthForecast([{ date: '2026-06-08', e1rm: 90 }], 5), null);
  assert.equal(L.strengthForecast(null), null);
});
test('bestStrengthForecast : meilleure prévision de force à surfacer', () => {
  const wo = (date, name, load, reps) => ({ date, exercises: [{ name, setLogs: [{ completed: true, load, reps }] }] });
  // Squat progresse régulièrement → prévision ; Développé plat → pas de prévision
  const workouts = [
    wo('2026-06-08', 'Squat', 90, 1), wo('2026-06-15', 'Squat', 92.5, 1), wo('2026-06-22', 'Squat', 95, 1), wo('2026-06-29', 'Squat', 97.5, 1),
    wo('2026-06-08', 'Développé', 60, 1), wo('2026-06-22', 'Développé', 60, 1),
  ];
  const f = L.bestStrengthForecast(workouts, { step: 5, todayKey: '2026-06-29' });
  assert.equal(f.exercise, 'Squat');
  assert.equal(f.milestone, 100);
  assert.equal(f.weeks, 1);
  assert.ok(f.perWeek > 0 && f.current === 97.5);
  // aucun exercice en progression → null
  const flat = [wo('2026-06-08', 'Squat', 90, 1), wo('2026-06-22', 'Squat', 90, 1)];
  assert.equal(L.bestStrengthForecast(flat, { todayKey: '2026-06-22' }), null);
  assert.equal(L.bestStrengthForecast([], { todayKey: '2026-06-22' }), null);
  assert.equal(L.bestStrengthForecast(null, {}), null);
});
test('lifetimeTonnage : cumul du tonnage sur toutes les séances', () => {
  const workouts = [
    { exercises: [{ name: 'Sq', load: 60, reps: 10, sets: 3 }] }, // 1800
    { exercises: [{ name: 'DC', setLogs: [{ load: 40, reps: 8, completed: true }] }] }, // 320
    { exercises: [{ name: 'Tractions', reps: 10, sets: 3 }] }, // 0
  ];
  assert.equal(L.lifetimeTonnage(workouts), 2120);
  assert.equal(L.lifetimeTonnage([]), 0);
  assert.equal(L.lifetimeTonnage(null), 0);
});
test('completedTonnage / completedSetCount : séries validées uniquement', () => {
  const ex = [
    { name: 'DC', setLogs: [{ load: 40, reps: 8, completed: true }, { load: 40, reps: 6, completed: false }] }, // 320
    { name: 'Sq', setLogs: [{ load: 60, reps: 10, completed: true }, { load: 60, reps: 8, completed: true }] }, // 600 + 480 = 1080
    { name: 'Gainage', setLogs: [{ load: 0, reps: 45, completed: true }] }, // 0 kg mais 1 série
    { name: 'Repos', reps: 10 }, // pas de setLogs → ignoré
  ];
  assert.equal(L.completedTonnage(ex), 1400, '320 + 1080 + 0');
  assert.equal(L.completedSetCount(ex), 4, '1 + 2 + 1 validées');
  assert.equal(L.completedTonnage([]), 0);
  assert.equal(L.completedSetCount(null), 0);
});
test('sessionSummary : bilan de séance (tonnage, séries, records battus)', () => {
  const ex = [
    { name: 'DC', setLogs: [{ load: 40, reps: 8, completed: true }, { load: 40, reps: 6, completed: false }] },
    { name: 'Squat', setLogs: [{ load: 60, reps: 10, completed: true }] },
  ];
  const prior = { DC: { load: 35, reps: 8 }, Squat: { load: 60, reps: 8 } };
  const s = L.sessionSummary(ex, prior);
  assert.equal(s.tonnage, 320 + 600, '40×8 (validée) + 60×10');
  assert.equal(s.sets, 2); assert.equal(s.exercises, 2);
  const by = Object.fromEntries(s.prs.map(p => [p.name, p]));
  assert.ok(by.DC && by.DC.loadPr, 'DC record de charge (40 > 35)');
  assert.ok(by.Squat && by.Squat.repsPr, 'Squat record de reps (10 > 8)');
  assert.equal(L.sessionSummary([], {}).tonnage, 0);
  assert.deepEqual(L.sessionSummary([{ name: 'X', setLogs: [{ load: 20, reps: 5, completed: true }] }], { X: { load: 30, reps: 8 } }).prs, [], 'rien battu → []');
});
test('runKmInWindow : cumule les km de course dans la fenêtre', () => {
  const w = [
    { type: 'run', date: '2026-07-06', distance: 10 },
    { type: 'run', date: '2026-07-09', distance: 5.5 },
    { type: 'strength', date: '2026-07-08', distance: 0 }, // pas un run
    { type: 'run', date: '2026-06-25', distance: 20 },      // hors fenêtre
  ];
  assert.equal(L.runKmInWindow(w, '2026-07-06', '2026-07-12'), 15.5);
  assert.equal(L.runKmInWindow(w, '2026-06-22', '2026-06-28'), 20, 'semaine précédente');
  assert.equal(L.runKmInWindow([], '2026-07-06', '2026-07-12'), 0);
  assert.equal(L.runKmInWindow('x', '2026-07-06', '2026-07-12'), 0);
});
test('trailReadiness : km 7j/28j, sorties et plus longue sortie', () => {
  const w = [
    { type: 'run', date: '2026-07-08', distance: 12 },   // 2 j → dans 7 j
    { type: 'run', date: '2026-07-04', distance: 8 },     // 6 j → dans 7 j
    { type: 'run', date: '2026-06-20', distance: 21 },    // 20 j → dans 28 j → plus longue
    { type: 'run', date: '2026-05-01', distance: 30 },    // hors 28 j
    { type: 'strength', date: '2026-07-09', distance: 0 },// ignoré
  ];
  const tr = L.trailReadiness(w, '2026-07-10');
  assert.equal(tr.weekKm, 20, '12 + 8 (les deux ≤ 6 j)');
  assert.equal(tr.monthKm, 41, '12 + 8 + 21');
  assert.equal(tr.runs, 3);
  assert.equal(tr.longRun.km, 21); assert.equal(tr.longRun.date, '2026-06-20');
  // Collision d'arrondi : 12,34 et 12,32 tombent tous deux sur 12,3 à l'affichage, mais la 12,34 est
  // la vraie plus longue → le record doit rester sur elle (jugé sur le brut, pas sur l'arrondi #406).
  const rnd = L.trailReadiness([
    { type: 'run', date: '2026-07-05', distance: 12.34 },
    { type: 'run', date: '2026-07-06', distance: 12.32 },
  ], '2026-07-10');
  assert.equal(rnd.longRun.date, '2026-07-05', 'la 12,34 km garde le record malgré l\'arrondi commun');
  assert.equal(rnd.longRun.km, 12.3, 'km affiché arrondi au dixième');
  assert.equal(L.trailReadiness([{ type: 'strength', date: '2026-07-09' }], '2026-07-10'), null, 'aucun run → null');
  assert.equal(L.trailReadiness(w, 'x'), null);
});
test('weeklyKmRamp : progression du kilométrage semaine sur semaine', () => {
  const w = [
    { type: 'run', date: '2026-07-08', distance: 12 }, // 2 j → cette semaine
    { type: 'run', date: '2026-07-06', distance: 13 }, // 4 j → cette semaine (total 25)
    { type: 'run', date: '2026-07-01', distance: 20 }, // 9 j → semaine précédente
    { type: 'strength', date: '2026-07-05', distance: 0 }, // ignoré
  ];
  const rm = L.weeklyKmRamp(w, '2026-07-10');
  assert.equal(rm.thisWeekKm, 25); assert.equal(rm.lastWeekKm, 20);
  assert.equal(rm.rampPct, 25, '(25-20)/20'); assert.equal(rm.zone, 'build');
  // hausse rapide
  assert.equal(L.weeklyKmRamp([{ type: 'run', date: '2026-07-09', distance: 30 }, { type: 'run', date: '2026-07-01', distance: 10 }], '2026-07-10').zone, 'high');
  // pas de semaine précédente → start
  const start = L.weeklyKmRamp([{ type: 'run', date: '2026-07-09', distance: 8 }], '2026-07-10');
  assert.equal(start.zone, 'start'); assert.equal(start.rampPct, null);
  assert.equal(L.weeklyKmRamp([], '2026-07-10'), null);
  assert.equal(L.weeklyKmRamp(w, 'x'), null);
});
test('runWeekGoal : progression course hebdo vs objectif', () => {
  // pas d'objectif → null
  assert.equal(L.runWeekGoal([{ type: 'run', date: '2026-07-13', distance: 8 }], '2026-07-13', 0), null);
  assert.equal(L.runWeekGoal([], '2026-07-13'), null);
  // 2026-07-13 = lundi ; sortie de 8 km ce jour, objectif 20 km
  const w = [{ type: 'run', date: '2026-07-13', distance: 8 }, { type: 'run', date: '2026-07-06', distance: 15 }];
  const g = L.runWeekGoal(w, '2026-07-13', 20);
  assert.equal(g.km, 8, 'la sortie de la semaine précédente est exclue');
  assert.equal(g.goalKm, 20);
  assert.equal(g.pct, 40);
  assert.equal(g.remaining, 12);
  assert.equal(g.reached, false);
  // objectif atteint / dépassé → pct plafonné 100, remaining 0
  const done = L.runWeekGoal([{ type: 'run', date: '2026-07-13', distance: 25 }], '2026-07-13', 20);
  assert.equal(done.reached, true);
  assert.equal(done.pct, 100);
  assert.equal(done.remaining, 0);
  // todayKey invalide → null
  assert.equal(L.runWeekGoal(w, 'x', 20), null);
});

test('focusWeekGoal : objectif hebdo de minutes de focus', () => {
  // 2026-07-15 = mercredi ; lundi = 2026-07-13
  const fs = [
    { date: '2026-07-13', minutes: 25 },
    { date: '2026-07-14', minutes: 50 },
    { date: '2026-07-06', minutes: 40 }, // semaine précédente → exclu
    { date: 'bad', minutes: 30 }         // date invalide → exclu
  ];
  const g = L.focusWeekGoal(fs, '2026-07-15', 120);
  assert.equal(g.done, 75);
  assert.equal(g.target, 120);
  assert.equal(g.sessions, 2);
  assert.equal(g.pct, Math.round(75 / 120 * 100)); // 63
  assert.equal(g.remaining, 45);
  assert.equal(g.status, 'onTrack'); // pct >= 60
  // atteint → done, pct plafonné 100
  const done = L.focusWeekGoal([{ date: '2026-07-13', minutes: 130 }], '2026-07-15', 120);
  assert.equal(done.status, 'done'); assert.equal(done.pct, 100); assert.equal(done.remaining, 0);
  // en retard
  assert.equal(L.focusWeekGoal([{ date: '2026-07-13', minutes: 20 }], '2026-07-15', 120).status, 'behind');
  // cible par défaut si absente
  assert.equal(L.focusWeekGoal([], '2026-07-15').target, L.FOCUS_WEEK_TARGET_MIN);
  // clé invalide → null
  assert.equal(L.focusWeekGoal(fs, 'x', 120), null);
});

test('runPace : allure min:sec par km', () => {
  assert.equal(L.runPace(10, 50).label, '5:00', '10 km en 50 min → 5:00/km');
  assert.equal(L.runPace(10, 50).secPerKm, 300);
  assert.equal(L.runPace(5, 27.5).label, '5:30', '5 km en 27,5 min → 5:30/km');
  assert.equal(L.runPace(0, 30), null, 'distance nulle → null');
  assert.equal(L.runPace(10, 0), null, 'durée nulle → null');
  assert.equal(L.runPace('x', 30), null);
});

test('sessionMinutes : somme des durées, valeurs invalides ignorées', () => {
  assert.equal(L.sessionMinutes([8, 10, 12]), 30);
  assert.equal(L.sessionMinutes([8.4, 10.6]), 19, 'arrondi par élément (8 + 11)');
  assert.equal(L.sessionMinutes([5, null, 'x', -3]), 5, 'invalides/négatifs → 0');
  assert.equal(L.sessionMinutes([]), 0);
  assert.equal(L.sessionMinutes('nope'), 0);
});

test('formatClock : secondes → m:ss', () => {
  assert.equal(L.formatClock(90), '1:30');
  assert.equal(L.formatClock(45), '0:45');
  assert.equal(L.formatClock(125), '2:05');
  assert.equal(L.formatClock(0), '0:00');
  assert.equal(L.formatClock(-8), '0:00');
  assert.equal(L.formatClock('x'), '0:00');
});
test('restBarPct : temps restant en % du total, borné', () => {
  assert.equal(L.restBarPct(75, 75), 100);
  assert.equal(L.restBarPct(30, 60), 50);
  assert.equal(L.restBarPct(0, 60), 0);
  assert.equal(L.restBarPct(90, 60), 100, 'borné à 100');
  assert.equal(L.restBarPct(30, 0), 0, 'total nul → 0');
  assert.equal(L.restBarPct(-5, 60), 0);
});
test('adjustRestSeconds : ±delta borné [0, 600]', () => {
  assert.equal(L.adjustRestSeconds(75, 15), 90);
  assert.equal(L.adjustRestSeconds(75, -15), 60);
  assert.equal(L.adjustRestSeconds(10, -30), 0, 'plancher 0');
  assert.equal(L.adjustRestSeconds(595, 30), 600, 'plafond 600');
  assert.equal(L.adjustRestSeconds('x', 15), 15);
});
test('estimate1RM : formule d’Epley, arrondi 0,5, garde-fous', () => {
  assert.equal(L.estimate1RM(100, 1), 100, '1 rep → charge');
  assert.equal(L.estimate1RM(100, 10), 133.5, '100×(1+10/30)=133.33 → 133.5');
  assert.equal(L.estimate1RM(60, 5), 70, '60×(1+5/30)=70');
  assert.equal(L.estimate1RM(0, 5), null, 'charge nulle → null');
  assert.equal(L.estimate1RM(80, 0), null, '0 rep → null');
  assert.equal(L.estimate1RM(80, 40), null, 'reps > 30 → non fiable → null');
  assert.equal(L.estimate1RM('x', 5), null);
});
test('loadPercentages : charges cibles selon % du 1RM', () => {
  const rows = L.loadPercentages(100);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map(r => r.pct), [60, 70, 80, 90]);
  assert.equal(rows[0].load, 60); assert.equal(rows[2].load, 80);
  assert.equal(rows[1].focus, 'Hypertrophie');
  // arrondi 0,5 : 85 × 0,7 = 59,5
  assert.equal(L.loadPercentages(85)[1].load, 59.5);
  assert.deepEqual(L.loadPercentages(0), []);
  assert.deepEqual(L.loadPercentages('x'), []);
});

test('exerciseVolumeSeries : volume par séance, N dernières, agrégé par jour', () => {
  const entries = [
    { name: 'Tractions', date: '2026-06-01', volume: 100 },
    { name: 'Tractions', date: '2026-06-03', volume: 120 },
    { name: 'Tractions', date: '2026-06-03', volume: 30 },   // même jour → agrégé
    { name: 'Pompes', date: '2026-06-02', volume: 200 },     // autre exo → ignoré
  ];
  const s = L.exerciseVolumeSeries(entries, 'Tractions', 8);
  assert.deepEqual(s, [{ date: '2026-06-01', volume: 100 }, { date: '2026-06-03', volume: 150 }]);
  // limite = 1 → ne garde que la dernière séance
  assert.deepEqual(L.exerciseVolumeSeries(entries, 'Tractions', 1), [{ date: '2026-06-03', volume: 150 }]);
  assert.deepEqual(L.exerciseVolumeSeries(entries, 'Inconnu', 8), []);
  assert.deepEqual(L.exerciseVolumeSeries('nope', 'Tractions', 8), []);
});
test('estimatedOneRmSeries : 1RM estimé par séance, meilleur set du jour', () => {
  const w = [
    { date: '2026-06-01', exercises: [{ name: 'DC', load: 40, reps: 8 }] },                     // ≈ 50.5
    { date: '2026-06-08', exercises: [{ name: 'DC', setLogs: [{ load: 45, reps: 5 }, { load: 50, reps: 3 }] }] }, // max(52.5, 55) = 55
    { date: '2026-06-15', exercises: [{ name: 'Gainage', reps: 60 }] },                          // sans charge → ignoré
  ];
  const s = L.estimatedOneRmSeries(w, 'DC', 8);
  assert.equal(s.length, 2);
  assert.deepEqual(s.map(p => p.date), ['2026-06-01', '2026-06-08']);
  assert.equal(s[0].e1rm, L.estimate1RM(40, 8));
  assert.equal(s[1].e1rm, L.estimate1RM(50, 3), 'meilleur set du jour (50×3)');
  // limite = 1 → dernière séance seulement
  assert.equal(L.estimatedOneRmSeries(w, 'DC', 1).length, 1);
  assert.deepEqual(L.estimatedOneRmSeries(w, 'Gainage', 8), [], 'aucune charge → vide');
  assert.deepEqual(L.estimatedOneRmSeries([], 'DC', 8), []);
});
test('progressionSuggestion : double progression (+reps puis +charge)', () => {
  const w = [
    { date: '2026-06-01', exercises: [{ name: 'Développé couché', load: 40, reps: 8 }] },
    { date: '2026-06-08', exercises: [{ name: 'Développé couché', load: 40, reps: 12 }] }, // dernière : au plafond
  ];
  const s = L.progressionSuggestion(w, 'Développé couché', { minReps: 8, maxReps: 12, increment: 2.5 });
  assert.equal(s.action, 'weight', '12 reps atteintes → on monte la charge');
  assert.equal(s.nextLoad, 42.5); assert.equal(s.nextReps, 8);
  assert.equal(s.lastLoad, 40); assert.equal(s.lastReps, 12);
  // sous le plafond → +1 rep, même charge
  const s2 = L.progressionSuggestion([{ date: '2026-06-08', exercises: [{ name: 'Curl', load: 12, reps: 9 }] }], 'Curl', { minReps: 8, maxReps: 12 });
  assert.equal(s2.action, 'reps'); assert.equal(s2.nextLoad, 12); assert.equal(s2.nextReps, 10);
  // setLogs : meilleure série retenue (charge la plus lourde)
  const s3 = L.progressionSuggestion([{ date: '2026-06-08', exercises: [{ name: 'Squat', setLogs: [{ load: 50, reps: 5 }, { load: 60, reps: 12 }] }] }], 'Squat', { minReps: 8, maxReps: 12, increment: 5 });
  assert.equal(s3.lastLoad, 60); assert.equal(s3.action, 'weight'); assert.equal(s3.nextLoad, 65);
  // deux séances le MÊME jour : la meilleure série (charge la plus lourde) est la référence,
  // pas la dernière loguée (ex. un finisher léger après la vraie séance lourde)
  const sTie = L.progressionSuggestion([
    { date: '2026-06-08', exercises: [{ name: 'Squat', load: 100, reps: 5 }] },
    { date: '2026-06-08', exercises: [{ name: 'Squat', load: 40, reps: 15 }] },
  ], 'Squat', { minReps: 8, maxReps: 12, increment: 5 });
  assert.equal(sTie.lastLoad, 100); assert.equal(sTie.lastReps, 5); assert.equal(sTie.action, 'reps'); assert.equal(sTie.nextLoad, 100);
  // pas de charge → null ; nom absent → null
  assert.equal(L.progressionSuggestion([{ date: '2026-06-08', exercises: [{ name: 'Gainage', reps: 60 }] }], 'Gainage'), null);
  assert.equal(L.progressionSuggestion(w, 'Inconnu'), null);
  assert.equal(L.progressionSuggestion([], 'X'), null);
  // séance legacy mono-exercice `w.exercise` (import/restauration, sans tableau `exercises`) :
  // comptée comme ses sœurs → cible du jour calculée au lieu de null
  const sLegacy = L.progressionSuggestion([
    { date: '2026-06-01', exercise: 'Tractions', load: 80, reps: 8 },
    { date: '2026-06-08', exercise: 'Tractions', load: 80, reps: 12 }, // dernière : au plafond
  ], 'Tractions', { minReps: 8, maxReps: 12, increment: 2.5 });
  assert.equal(sLegacy.action, 'weight'); assert.equal(sLegacy.nextLoad, 82.5);
  assert.equal(sLegacy.lastLoad, 80); assert.equal(sLegacy.lastReps, 12); assert.equal(sLegacy.date, '2026-06-08');
  // mix legacy + moderne pour le même exercice : la référence reste la date la plus récente
  const sMix = L.progressionSuggestion([
    { date: '2026-06-01', exercise: 'Rowing', load: 50, reps: 12 },
    { date: '2026-06-08', exercises: [{ name: 'Rowing', load: 52.5, reps: 9 }] },
  ], 'Rowing', { minReps: 8, maxReps: 12 });
  assert.equal(sMix.action, 'reps'); assert.equal(sMix.lastLoad, 52.5); assert.equal(sMix.nextReps, 10);
});
test('progressionText : phrases FR selon l’action', () => {
  assert.match(L.progressionText({ action: 'weight', lastReps: 12, lastLoad: 40, nextLoad: 42.5, nextReps: 8, increment: 2.5, maxReps: 12 }), /42,5 kg/);
  assert.match(L.progressionText({ action: 'reps', lastReps: 9, lastLoad: 12, nextLoad: 12, nextReps: 10, increment: 2.5, maxReps: 12 }), /vise 10 reps/);
  assert.equal(L.progressionText(null), '');
  // Guidance RIR/RPE présente (Zourdos 2016 / ACSM) dans les deux cas.
  assert.match(L.progressionText({ action: 'reps', lastReps: 9, lastLoad: 12, nextLoad: 12, nextReps: 10, increment: 2.5, maxReps: 12 }), /réserve|RPE/i);
  assert.match(L.progressionText({ action: 'weight', lastReps: 14, lastLoad: 12, nextLoad: 17, nextReps: 8, increment: 2.5, maxReps: 12, overshoot: true }), /au-dessus de la cible/);
});
test('progressionIncrement : +5 kg bas du corps, +2,5 kg haut/isolation (ACSM 2009)', () => {
  assert.equal(L.progressionIncrement('Squat barre'), 5);
  assert.equal(L.progressionIncrement('Soulevé de terre'), 5);
  assert.equal(L.progressionIncrement('Presse à cuisses'), 5);
  assert.equal(L.progressionIncrement('Fente avant'), 5);
  assert.equal(L.progressionIncrement('Développé couché'), 2.5);
  assert.equal(L.progressionIncrement('Curl biceps'), 2.5);
  assert.equal(L.progressionIncrement(''), 2.5);
});
test('progressionSuggestion : règle 2-for-2 (dépasser la cible de ≥2 reps → saut de charge franc)', () => {
  // 14 reps alors que la cible haute est 12 → charge trop légère → double incrément.
  const os = L.progressionSuggestion([{ date: '2026-06-08', exercises: [{ name: 'Curl', load: 12, reps: 14 }] }], 'Curl', { minReps: 8, maxReps: 12, increment: 2.5 });
  assert.equal(os.action, 'weight'); assert.equal(os.overshoot, true); assert.equal(os.nextLoad, 17, '12 + 2×2,5');
  // Pile au sommet (12) → incrément simple, pas d'overshoot.
  const top = L.progressionSuggestion([{ date: '2026-06-08', exercises: [{ name: 'Curl', load: 12, reps: 12 }] }], 'Curl', { minReps: 8, maxReps: 12, increment: 2.5 });
  assert.equal(top.overshoot, false); assert.equal(top.nextLoad, 14.5);
});
test('basalMetabolicRate : Mifflin-St Jeor homme/femme + garde-fous', () => {
  assert.equal(L.basalMetabolicRate(80, 180, 30, 'homme'), 1780, '10·80+6.25·180−5·30+5');
  assert.equal(L.basalMetabolicRate(80, 180, 30, 'femme'), 1614, 'variante femme (−161)');
  assert.equal(L.basalMetabolicRate(0, 180, 30, 'homme'), null);
  assert.equal(L.basalMetabolicRate(80, 180, 0, 'homme'), null);
});
test('suggestedQuests : quêtes du jour depuis l’état réel', () => {
  const today = '2026-07-13';
  const state = {
    agenda: [{ kind: 'sport', date: today, completed: false }],
    workouts: [],
    nutrition: [{ date: today, protein: 20, water: 2 }],
    focusSessions: [],
    habits: [],
    profile: { weight: 80, goal: 'recomposition' },
    quests: [],
  };
  const q = L.suggestedQuests(state, today);
  assert.ok(Array.isArray(q) && q.length >= 1 && q.length <= 4);
  assert.ok(q.every(x => x.name && x.category && x.xp > 0));
  assert.ok(q.some(x => x.key === 'session'), 'séance prévue non faite');
  assert.ok(q.some(x => x.key === 'protein'), 'protéines sous la cible');
  assert.ok(q.some(x => x.key === 'water'), 'eau sous la cible');
  // exclut celles déjà présentes (par nom)
  const dejaLa = q.find(x => x.key === 'protein').name;
  const q2 = L.suggestedQuests({ ...state, quests: [{ name: dejaLa }] }, today);
  assert.ok(!q2.some(x => x.name === dejaLa), 'quête déjà ajoutée exclue');
  // séance faite → pas de quête séance
  const q3 = L.suggestedQuests({ ...state, workouts: [{ date: today, type: 'strength' }] }, today);
  assert.ok(!q3.some(x => x.key === 'session' || x.key === 'move'));
  const qNull = L.suggestedQuests(null, today);
  assert.ok(Array.isArray(qNull) && qNull.length <= 4, 'état nul → sûr (suggestions par défaut)');
});
test('nextStreakMilestone : prochain palier de série', () => {
  assert.deepEqual(L.nextStreakMilestone(0), { milestone: 3, remaining: 3 });
  assert.deepEqual(L.nextStreakMilestone(3), { milestone: 7, remaining: 4 }, 'strictement au-dessus');
  assert.deepEqual(L.nextStreakMilestone(5), { milestone: 7, remaining: 2 });
  assert.deepEqual(L.nextStreakMilestone(29), { milestone: 30, remaining: 1 });
  assert.equal(L.nextStreakMilestone(365), null, 'dernier palier atteint');
  assert.equal(L.nextStreakMilestone(500), null);
  assert.deepEqual(L.nextStreakMilestone(-4), { milestone: 3, remaining: 3 }, 'négatif → 0');
});
test('bmiInfo : IMC + catégorie OMS', () => {
  assert.deepEqual(L.bmiInfo(80, 180), { bmi: 24.7, category: 'corpulence normale' });
  assert.equal(L.bmiInfo(60, 180).category, 'corpulence normale');
  assert.equal(L.bmiInfo(55, 180).category, 'maigreur', 'IMC < 18,5');
  assert.equal(L.bmiInfo(90, 180).category, 'surpoids', 'IMC 25–30');
  assert.equal(L.bmiInfo(105, 180).category, 'obésité', 'IMC ≥ 30');
  assert.equal(L.bmiInfo(0, 180), null);
  assert.equal(L.bmiInfo(80, 0), null);
  // Catégorie jugée sur l'IMC RÉEL, pas la valeur affichée arrondie :
  // 53,4 kg / 1,70 m → IMC 18,478 (arrondi 18,5) reste « maigreur ».
  assert.deepEqual(L.bmiInfo(53.4, 170), { bmi: 18.5, category: 'maigreur' }, 'arrondi 18,5 mais IMC réel < 18,5');
  // Symétrique haut de fourchette : 80,85 kg / 1,80 m → IMC 24,954 (arrondi 25,0) reste « corpulence normale ».
  assert.deepEqual(L.bmiInfo(80.85, 180), { bmi: 25, category: 'corpulence normale' }, 'arrondi 25,0 mais IMC réel < 25');
});
test('activityFactor : palier selon séances/semaine', () => {
  assert.equal(L.activityFactor(0), 1.2);
  assert.equal(L.activityFactor(2), 1.375);
  assert.equal(L.activityFactor(4), 1.55);
  assert.equal(L.activityFactor(6), 1.725);
  assert.equal(L.activityFactor(7), 1.9);
});
test('energyPlan : calories, macros, rythme et date d’atteinte (perte)', () => {
  const p = L.energyPlan({ weight: 80, height: 180, age: 30, sex: 'homme', sessionsPerWeek: 4, targetWeight: 72, todayKey: '2026-07-12' });
  assert.equal(p.bmr, 1780); assert.equal(p.tdee, 2759, '1780×1.55');
  assert.equal(p.goal, 'perte'); assert.equal(p.diff, 8);
  // Rythme PERSONNALISÉ par IMC (proxy du %MG) : IMC 24,7 → 0,7 %/sem = 0,56 kg/sem (Aragon/ISSN 2017,
  // Garthe 2011). Déficit ≤ 25 % du TDEE (ici 22 %). Protéines 2,4 g/kg en déficit (Longland 2016).
  assert.equal(p.ratePerWeek, 0.56, '0,7 %/sem selon IMC 24,7'); assert.equal(p.deficit, 616);
  assert.equal(p.dailyTarget, 2143, 'TDEE − déficit (≤ 25 % TDEE), ≥ métabolisme de base');
  assert.equal(p.proteinG, 192, '2,4 g/kg en perte (préservation musculaire)'); assert.equal(p.fatG, 72);
  assert.equal(p.carbG, 182, '(2143 − 768 − 648)/4');
  assert.equal(p.weeks, 15, 'ceil(8 / 0,56)');
  assert.equal(p.targetDate, '2026-10-25', '12/07 + 15 semaines');
  // Déficit PLAFONNÉ à 25 % du TDEE (garde-fou ISSN) chez un sujet corpulent qui pourrait creuser plus.
  const gros = L.energyPlan({ weight: 100, height: 178, age: 30, sex: 'homme', sessionsPerWeek: 3, targetWeight: 85, todayKey: '2026-07-12' });
  assert.ok(gros.deficit <= Math.round(gros.tdee * 0.25) + 1, 'déficit borné à 25 % du TDEE');
  assert.ok(gros.ratePerWeek > p.ratePerWeek, 'plus corpulent → rythme plus ambitieux');
  // Sujet déjà sec (IMC bas) → rythme RALENTI pour préserver le muscle (Garthe 2011).
  const sec = L.energyPlan({ weight: 68, height: 180, age: 25, sex: 'homme', sessionsPerWeek: 5, targetWeight: 64, todayKey: '2026-07-12' });
  assert.ok(sec.ratePerWeek < p.ratePerWeek, 'plus sec → rythme plus lent, protège la masse maigre');
  // prise de masse : surplus + rythme 0,25
  const gain = L.energyPlan({ weight: 70, height: 175, age: 25, sex: 'homme', sessionsPerWeek: 4, targetWeight: 74, todayKey: '2026-07-12' });
  assert.equal(gain.goal, 'prise'); assert.equal(gain.ratePerWeek, 0.25); assert.ok(gain.dailyTarget > gain.tdee);
  // maintien
  assert.equal(L.energyPlan({ weight: 75, height: 175, age: 25, sex: 'homme', sessionsPerWeek: 3, targetWeight: 75, todayKey: '2026-07-12' }).goal, 'maintien');
  // seuil « maintien » aligné sur weightTargetAdvice (0,5) : un écart de 0,35 kg (fluctuation eau/sel)
  // est un maintien, pas une « perte » avec déficit — les deux fonctions alimentent le même écran.
  const micro = L.energyPlan({ weight: 80, height: 180, age: 30, sex: 'homme', sessionsPerWeek: 4, targetWeight: 79.65, todayKey: '2026-07-12' });
  assert.equal(micro.goal, 'maintien', 'écart 0,35 kg < 0,5 → maintien (aligné sur weightTargetAdvice)');
  assert.equal(micro.deficit, 0, 'maintien = pas de déficit'); assert.equal(micro.weeks, 0);
  assert.equal(L.weightTargetAdvice({ weight: 80, height: 180, targetWeight: 79.65 }).direction, 'maintien', 'même verdict que la sœur');
  assert.equal(L.energyPlan({ weight: 80, height: 180, age: 30, sex: 'homme', targetWeight: 0 }), null, 'sans cible → null');
  // niveau d'activité manuel prioritaire sur le proxy séances
  const act = L.energyPlan({ weight: 80, height: 180, age: 30, sex: 'homme', activityLevel: 'actif', sessionsPerWeek: 2, targetWeight: 72, todayKey: '2026-07-12' });
  assert.equal(act.tdee, 3071, '1780 × 1.725');
});
test('activityLevelFactor / dateAfterWeeks / paceStatus', () => {
  assert.equal(L.activityLevelFactor('modere'), 1.55);
  assert.equal(L.activityLevelFactor('tres'), 1.9);
  assert.equal(L.activityLevelFactor('inconnu'), null);
  assert.equal(L.dateAfterWeeks('2026-07-12', 17), '2026-11-08');
  assert.equal(L.dateAfterWeeks('2026-07-12', 0), null);
  assert.equal(L.dateAfterWeeks('x', 5), null);
  assert.equal(L.paceStatus(17, 17), 'on');
  assert.equal(L.paceStatus(17, 25), 'slow', '25/17 > 1,3');
  assert.equal(L.paceStatus(17, 10), 'fast', '10/17 < 0,77');
  assert.equal(L.paceStatus(0, 5), null);
});
test('calorieAdjustment : stagnation → baisse/hausse calorique', () => {
  const flat = [{ date: '2026-06-21', value: 80 }, { date: '2026-07-01', value: 80.1 }, { date: '2026-07-12', value: 80 }];
  const a = L.calorieAdjustment(flat, 'perte', 2000);
  assert.equal(a.stagnating, true); assert.equal(a.suggestion, 'reduce');
  assert.equal(a.newTarget, 1875); assert.equal(a.delta, 125);
  // perte qui progresse → pas de stagnation
  const losing = [{ date: '2026-06-21', value: 82 }, { date: '2026-07-01', value: 81 }, { date: '2026-07-12', value: 80 }];
  assert.equal(L.calorieAdjustment(losing, 'perte', 2000).stagnating, false);
  // recul insuffisant (< 14 j)
  const short = [{ date: '2026-07-08', value: 80 }, { date: '2026-07-10', value: 80 }, { date: '2026-07-12', value: 80 }];
  assert.equal(L.calorieAdjustment(short, 'perte', 2000).stagnating, false);
  // prise qui stagne → hausse
  const gainFlat = [{ date: '2026-06-21', value: 70 }, { date: '2026-07-01', value: 70 }, { date: '2026-07-12', value: 70 }];
  assert.equal(L.calorieAdjustment(gainFlat, 'prise', 2500).suggestion, 'increase');
  assert.equal(L.calorieAdjustment(flat, 'maintien', 2000).stagnating, false);
  // Pesée QUOTIDIENNE en plateau : les 4 dernières mesures ne couvrent que ~3 j, mais la fenêtre
  // est ancrée par date (≥ 14 j) → le plateau est bien détecté (avant : slice(-4) → jamais).
  const daily = [];
  for (let d = 13; d <= 30; d++) daily.push({ date: `2026-06-${String(d).padStart(2, '0')}`, value: 80 });
  for (let d = 1; d <= 12; d++) daily.push({ date: `2026-07-${String(d).padStart(2, '0')}`, value: 80 });
  const dailyRes = L.calorieAdjustment(daily, 'perte', 2000);
  assert.equal(dailyRes.stagnating, true); assert.equal(dailyRes.suggestion, 'reduce');
  assert.equal(dailyRes.newTarget, 1875); assert.equal(dailyRes.ratePerWeek, 0);
  // Plancher calorique (1200) : la baisse ANNONCÉE = la baisse RÉELLE (cible − plancher), pas 125 fixe.
  const near = L.calorieAdjustment(flat, 'perte', 1250);   // 1250 − 125 = 1125 < 1200 → cut réel 50
  assert.equal(near.newTarget, 1200); assert.equal(near.delta, 50);
  assert.match(near.message, /50 kcal\/jour/); assert.doesNotMatch(near.message, /125 kcal/);
  const mid = L.calorieAdjustment(flat, 'perte', 1300);
  assert.equal(mid.newTarget, 1200); assert.equal(mid.delta, 100);
  // Déjà AU plancher : plus de levier calorique → délégué au cardio, cible inchangée (jamais relevée).
  const atFloor = L.calorieAdjustment(flat, 'perte', 1200);
  assert.equal(atFloor.stagnating, true); assert.equal(atFloor.delta, 0);
  assert.equal(atFloor.newTarget, 1200); assert.match(atFloor.message, /plancher calorique/);
  const below = L.calorieAdjustment(flat, 'perte', 1150);
  assert.equal(below.newTarget, 1150, 'cible sous le plancher jamais REMONTÉE'); assert.equal(below.delta, 0);
  // Prise : pas de plancher → baisse fixe de 125 conservée.
  const gainNear = L.calorieAdjustment(gainFlat, 'prise', 1250);
  assert.equal(gainNear.delta, 125); assert.equal(gainNear.newTarget, 1375);
});
test('dietBreakRecommendation : déficit prolongé → pause diète (MATADOR/ICECAP)', () => {
  const today = '2026-07-29';
  // 13 pesées hebdo, perte continue ~0,5 kg/sem : 78 kg la semaine dernière ← 84 kg il y a 12 sem.
  const dates = ['2026-07-22', '2026-07-15', '2026-07-08', '2026-07-01', '2026-06-24', '2026-06-17', '2026-06-10', '2026-06-03', '2026-05-27', '2026-05-20', '2026-05-13', '2026-05-06', '2026-04-29'];
  const cont = dates.map((date, i) => ({ date, value: Math.round((78 + i * 0.5) * 10) / 10 }));
  const r = L.dietBreakRecommendation(cont, 'perte', today, { deficit: 500 });
  assert.equal(r.due, true);
  assert.equal(r.weeksDeficit, 12);
  assert.equal(r.netLossKg, 6);
  assert.equal(r.kcalBump, 500);
  assert.equal(r.emoji, '⏸️');
  assert.match(r.advice, /PAUSE DIÈTE/);
  assert.match(r.advice, /500 kcal/);
  // Objectif ≠ perte → jamais de pause diète (on ne freine pas une prise / un maintien).
  assert.equal(L.dietBreakRecommendation(cont, 'prise', today), null);
  assert.equal(L.dietBreakRecommendation(cont, 'maintien', today), null);
  // Historique trop court (< 3 semaines relevées) → null.
  assert.equal(L.dietBreakRecommendation(cont.slice(0, 2), 'perte', today), null);
  // Seulement 6 semaines de série (sous le seuil 10 par défaut) → pas due, mais le compteur est juste.
  const shortCut = cont.slice(0, 7);
  const rs = L.dietBreakRecommendation(shortCut, 'perte', today);
  assert.equal(rs.due, false); assert.equal(rs.weeksDeficit, 6);
  // Un REGAIN net sur la dernière semaine (pause/maintien déjà pris) casse la série → pas due.
  const regain = cont.slice(); regain[0] = { date: '2026-07-22', value: 79.6 };   // +1,1 kg vs la sem. d'avant
  const rr = L.dietBreakRecommendation(regain, 'perte', today);
  assert.equal(rr.due, false); assert.equal(rr.weeksDeficit, 0);
  // Sans deficit fourni : pas de chiffrage kcal, mais la reco tient.
  const rNoKcal = L.dietBreakRecommendation(cont, 'perte', today);
  assert.equal(rNoKcal.due, true); assert.equal(rNoKcal.kcalBump, 0);
  assert.doesNotMatch(rNoKcal.advice, /kcal/);
});
test('weightForecast : trajectoire hebdo bornée à la cible', () => {
  const f = L.weightForecast(80, 72, 0.48, 17, '2026-07-12');
  assert.equal(f.length, 18, 'today + 17 semaines');
  assert.deepEqual(f[0], { date: '2026-07-12', value: 80 });
  assert.equal(f[1].value, 79.5, '80 − 0,48 arrondi 0,1');
  assert.equal(f.at(-1).value, 72, 'borné à la cible');
  assert.equal(f.at(-1).date, '2026-11-08', '12/07 + 17 sem.');
  // prise de masse : monte vers la cible
  const g = L.weightForecast(70, 74, 0.25, 16, '2026-07-12');
  assert.equal(g.at(-1).value, 74); assert.ok(g[1].value > 70);
  // garde-fous
  assert.deepEqual(L.weightForecast(80, 72, 0, 17, '2026-07-12'), [], 'rythme nul → []');
  assert.deepEqual(L.weightForecast(80, 72, 0.5, 0, '2026-07-12'), [], '0 semaine → []');
  assert.deepEqual(L.weightForecast(80, 0, 0.5, 17, '2026-07-12'), [], 'sans cible → []');
});
test('coachWeekPlan : semaine muscu/renfo/course adaptée à l’objectif', () => {
  const perte = L.coachWeekPlan('perte', [1, 3, 5]);
  assert.equal(perte.sessions.length, 3, '3 jours dispo → 3 séances');
  assert.deepEqual(perte.sessions.map(s => s.weekday), [1, 3, 5], 'triées par jour');
  assert.deepEqual(perte.sessions.map(s => s.type), ['course', 'muscu', 'renfo']);
  assert.equal(perte.strength, 1); assert.equal(perte.runs, 1); assert.equal(perte.renfo, 1);
  assert.match(perte.note, /déficit/);
  // prise : priorité muscu, peu de cardio, espacé sur 6 jours
  const prise = L.coachWeekPlan('prise', [1, 2, 3, 4, 5, 6]);
  assert.equal(prise.strength, 4); assert.equal(prise.runs, 1);
  assert.equal(prise.sessions.length, 5, 'cap à 5, un jour de repos');
  // sans jours dispo → répartition par défaut, objectif maintien
  const m = L.coachWeekPlan('maintien', []);
  assert.ok(m.sessions.length >= 1 && m.sessions.length <= 5);
  assert.match(m.note, /Maintien/);
  // objectif inconnu → maintien
  assert.match(L.coachWeekPlan('xxx', [1, 3]).note, /Maintien/);
  // dimanche dispo (0) : la semaine reste lundi-en-tête, dimanche EN DERNIER
  // (convention de l'app : (weekday+6)%7 ; runPlanWeek fait déjà pareil).
  const dim = L.coachWeekPlan('maintien', [1, 0]);
  assert.deepEqual(dim.sessions.map(s => s.weekday), [1, 0], 'lundi avant dimanche, pas dim=0 en tête');
  const semaineComplete = L.coachWeekPlan('perte', [1, 2, 3, 4, 5, 6, 0]);
  assert.equal(semaineComplete.sessions[0].weekday, 1, 'la semaine commence lundi');
  assert.equal(semaineComplete.sessions.at(-1).weekday, 0, 'dimanche en dernier');
});
test('coachSessionLabel : titre agenda par type', () => {
  assert.match(L.coachSessionLabel('muscu'), /Musculation/);
  assert.match(L.coachSessionLabel('renfo'), /Renfo/);
  assert.match(L.coachSessionLabel('course'), /Course/);
  assert.equal(L.coachSessionLabel('inconnu'), 'Séance');
});
test('runPlanWeek : semaine de course, sortie longue en fin, garde-fous', () => {
  const p = L.runPlanWeek(4);
  assert.equal(p.count, 4);
  assert.deepEqual(p.sessions.map(s => s.weekday), [1, 3, 5, 0], 'répartis Lun/Mer/Ven/Dim');
  assert.deepEqual(p.sessions.map(s => s.type), ['facile', 'fractionne', 'facile', 'longue']);
  assert.equal(p.sessions.at(-1).type, 'longue', 'sortie longue le dimanche');
  assert.equal(p.totalMinutes, 175, '35+35+35+70');
  assert.equal(L.runPlanWeek(5).count, 5);
  assert.equal(L.runPlanWeek(99).count, 6, 'plafonné à 6');
  assert.equal(L.runPlanWeek(1).count, 3, 'plancher 3');
  // jours imposés
  assert.deepEqual(L.runPlanWeek(4, { days: [1, 2, 3, 4] }).sessions.map(s => s.weekday), [1, 2, 3, 4]);
  // accents (emphasis) : mix de types adapté à l'objectif
  const cnt = (arr, t) => arr.filter(x => x === t).length;
  const vitesse = L.runPlanWeek(4, { emphasis: 'vitesse' }).sessions.map(s => s.type);
  const endurance = L.runPlanWeek(4, { emphasis: 'endurance' }).sessions.map(s => s.type);
  const facile = L.runPlanWeek(4, { emphasis: 'facile' }).sessions.map(s => s.type);
  assert.ok(cnt(vitesse, 'fractionne') + cnt(vitesse, 'tempo') >= 2, 'vitesse : + de tempo/fractionné');
  assert.ok(cnt(endurance, 'facile') >= 2, 'endurance : + de facile/volume');
  assert.equal(cnt(facile, 'fractionne'), 0, 'facile : aucun fractionné');
  assert.deepEqual(L.runPlanWeek(4, { emphasis: 'inconnu' }).sessions.map(s => s.type), ['facile', 'fractionne', 'facile', 'longue'], 'accent inconnu → équilibré');
});
test('programWeekSummary : total séances/minutes/heures d’un programme', () => {
  const week = [
    { kind: 'muscu', minutes: 45 },
    { kind: 'course', minutes: 35 },
    { kind: 'muscu', minutes: 45 },
    { kind: 'course', minutes: 70 },
  ];
  const s = L.programWeekSummary(week);
  assert.equal(s.sessions, 4);
  assert.equal(s.muscu, 2);
  assert.equal(s.course, 2);
  assert.equal(s.minutes, 195);
  assert.equal(s.hours, 3.3, '195 min ≈ 3,3 h');
  const empty = L.programWeekSummary([]);
  assert.deepEqual(empty, { sessions: 0, muscu: 0, course: 0, minutes: 0, hours: 0 });
  assert.equal(L.programWeekSummary(null).sessions, 0, 'entrée invalide → 0');
});
test('macroBreakdown : détail des macros avec rôle et % des calories', () => {
  // 2000 kcal, P150 (600 kcal=30%), G200 (800=40%), L60 (540=27%)
  const b = L.macroBreakdown({ dailyTarget: 2000, proteinG: 150, carbG: 200, fatG: 60, dir: 'maintien' });
  assert.equal(b.length, 3);
  const [p, c, f] = b;
  assert.equal(p.key, 'protein'); assert.equal(p.grams, 150); assert.equal(p.pct, 30);
  assert.ok(/muscle/i.test(p.role));
  assert.equal(c.key, 'carb'); assert.equal(c.pct, 40); assert.ok(/carburant|effort/i.test(c.role));
  assert.equal(f.key, 'fat'); assert.equal(f.pct, 27); assert.ok(/hormone/i.test(f.role));
  assert.ok(b.every(m => m.emoji && m.label));
  // pas de données → []
  assert.deepEqual(L.macroBreakdown(null), []);
  assert.deepEqual(L.macroBreakdown({ dailyTarget: 2000 }), []);
  assert.deepEqual(L.macroBreakdown({ proteinG: 0 }), []);
});
test('wellnessRoutine : routines de mobilité/récup en secondes', () => {
  assert.ok(Array.isArray(L.WELLNESS_ROUTINES) && L.WELLNESS_ROUTINES.length >= 5);
  const r = L.wellnessRoutine('warmup');
  assert.equal(r.title, 'Échauffement dynamique');
  assert.ok(r.exercises.length >= 4);
  assert.ok(r.exercises.every(e => e.name && e.unit === 'sec' && e.reps > 0 && e.sets === 1 && e.rest === 0));
  assert.ok(L.wellnessRoutine('stretch').exercises.some(e => /Ischios|Fessiers|enfant/i.test(e.name)));
  assert.equal(L.wellnessRoutine('inconnu'), null);
  assert.ok(L.wellnessRoutine('backpain') && L.wellnessRoutine('sleep'), 'nouvelles routines bas du dos / sommeil');
  assert.ok(L.wellnessRoutine('ankles') && L.wellnessRoutine('neck') && L.wellnessRoutine('wrists'), 'routines chevilles/nuque/poignets');
  assert.ok(L.WELLNESS_ROUTINES.length >= 11, 'catalogue enrichi');
  // clés uniques
  const keys = L.WELLNESS_ROUTINES.map(r => r.key);
  assert.equal(new Set(keys).size, keys.length, 'clés de routines uniques');
  // chaque routine a un emoji, un titre, des minutes et des mouvements
  L.WELLNESS_ROUTINES.forEach(rt => { assert.ok(rt.key && rt.emoji && rt.title && rt.minutes > 0 && rt.moves.length >= 3); });
});
test('surpriseRoutine : pioche une routine valide, déterministe et variée', () => {
  const keys = L.WELLNESS_ROUTINES.map(r => r.key);
  // toujours une clé existante
  for (let s = 0; s < 30; s++) assert.ok(keys.includes(L.surpriseRoutine(null, s)), 'clé valide');
  // déterministe pour un même seed
  assert.equal(L.surpriseRoutine(null, 7), L.surpriseRoutine(null, 7));
  // exclut la clé demandée (varie de la suggestion du jour)
  for (let s = 0; s < 30; s++) assert.notEqual(L.surpriseRoutine('warmup', s), 'warmup', 'exclusion respectée');
  // la clé pointe vers une vraie routine lançable
  assert.ok(L.wellnessRoutine(L.surpriseRoutine('hips', 3)).exercises.length);
  // seed différents → au moins deux résultats distincts sur la plage
  const got = new Set(); for (let s = 0; s < 20; s++) got.add(L.surpriseRoutine(null, s));
  assert.ok(got.size >= 2, 'varie selon le seed');
});
test('wellnessParcours : enchaînement de 2 routines en une session', () => {
  assert.ok(Array.isArray(L.WELLNESS_PARCOURS) && L.WELLNESS_PARCOURS.length >= 3);
  const p = L.wellnessParcours('reveil');
  assert.equal(p.count, 2);
  assert.equal(p.routines.length, 2);
  // minutes = somme des routines composantes
  const m = L.wellnessRoutine('morning').minutes + L.wellnessRoutine('hips').minutes;
  assert.equal(p.minutes, m);
  // exercices = concaténation des mouvements des 2 routines
  const total = L.wellnessRoutine('morning').exercises.length + L.wellnessRoutine('hips').exercises.length;
  assert.equal(p.exercises.length, total);
  assert.ok(p.exercises.every(e => e.unit === 'sec' && e.reps > 0));
  assert.ok(p.emoji && p.title);
  // chaque parcours prédéfini est valide
  L.WELLNESS_PARCOURS.forEach(x => { const pc = L.wellnessParcours(x.key); assert.ok(pc && pc.exercises.length >= 6); });
  // clé inconnue → null
  assert.equal(L.wellnessParcours('zzz'), null);
  assert.equal(L.wellnessParcours(), null);
});
test('shareableRoutine : partage natif d’une routine bien-être', () => {
  const s = L.shareableRoutine('warmup');
  assert.ok(s && s.title && s.text);
  assert.match(s.title, /routine bien-être/i);
  assert.match(s.title, /Échauffement/);
  // le texte liste les mouvements numérotés avec durée
  assert.match(s.text, /1\. .+ — \d+ s/);
  assert.match(s.text, /min\)/, 'durée totale en tête');
  // toutes les routines produisent un objet valide
  L.WELLNESS_ROUTINES.forEach(r => { const sr = L.shareableRoutine(r.key); assert.ok(sr && sr.text.length > 20); });
  // clé inconnue → null
  assert.equal(L.shareableRoutine('zzz'), null);
  assert.equal(L.shareableRoutine(), null);
});
test('routinesByTimeBudget : filtre les routines par budget de temps', () => {
  const all = L.routinesByTimeBudget(0);
  assert.equal(all.length, L.WELLNESS_ROUTINES.length, 'budget invalide → toutes les routines');
  // budget serré : seules les routines ≤ 4 min
  const quick = L.routinesByTimeBudget(4);
  assert.ok(quick.length > 0 && quick.length < all.length, 'filtre effectif');
  quick.forEach(r => assert.ok(r.minutes <= 4, 'aucune routine ne dépasse le budget'));
  // les routines de 4 min (morning, neck, wrists) sont incluses
  assert.ok(quick.some(r => r.key === 'morning'));
  // tri par durée décroissante puis titre
  const six = L.routinesByTimeBudget(6);
  for (let i = 1; i < six.length; i++) assert.ok(six[i - 1].minutes >= six[i].minutes, 'trié par durée décroissante');
  // une routine de 8 min (stretch) exclue à 6 min mais présente à 8
  assert.ok(!six.some(r => r.key === 'stretch'), 'stretch (8 min) exclue du budget 6 min');
  assert.ok(L.routinesByTimeBudget(8).some(r => r.key === 'stretch'), 'stretch incluse à 8 min');
  // budget négatif / non numérique → toutes
  assert.equal(L.routinesByTimeBudget(-3).length, all.length);
  assert.equal(L.routinesByTimeBudget('abc').length, all.length);
  // chaque entrée expose key/emoji/title/minutes/moves
  quick.forEach(r => { assert.ok(r.key && r.emoji && r.title && r.minutes > 0 && r.moves > 0); });
});
test('expressRoutine : routine aléatoire tenant dans un budget', () => {
  const keys4 = L.routinesByTimeBudget(4).map(r => r.key);
  // pioche dans les routines ≤ 4 min
  for (let s = 0; s < 30; s++) assert.ok(keys4.includes(L.expressRoutine(4, null, s)), 'clé ≤ 4 min');
  // déterministe pour un même seed
  assert.equal(L.expressRoutine(6, null, 7), L.expressRoutine(6, null, 7));
  // évite excludeKey quand c'est possible (plusieurs candidats)
  for (let s = 0; s < 30; s++) { const ex = keys4[0]; assert.notEqual(L.expressRoutine(4, ex, s), ex, 'exclusion respectée'); }
  // budget large → toutes les routines possibles
  const all = L.WELLNESS_ROUTINES.map(r => r.key);
  for (let s = 0; s < 20; s++) assert.ok(all.includes(L.expressRoutine(0, null, s)));
  // budget impossible (aucune routine ≤ 1 min) → null
  assert.equal(L.expressRoutine(1, null, 3), null);
  // la clé renvoyée est jouable
  assert.ok(L.wellnessRoutine(L.expressRoutine(8, null, 5)).exercises.length);
});
test('logWellnessDone / wellnessStreak / wellnessCountInWindow : suivi des routines', () => {
  let log = [];
  log = L.logWellnessDone(log, 'hips', '2026-07-13');
  log = L.logWellnessDone(log, 'warmup', '2026-07-13'); // 2e routine même jour, autre clé
  log = L.logWellnessDone(log, 'hips', '2026-07-13');    // doublon exact → ignoré
  assert.equal(log.length, 2);
  assert.deepEqual(log[0], { date: '2026-07-13', key: 'hips' });
  // clé / date invalides → inchangé
  assert.equal(L.logWellnessDone(log, '', '2026-07-13').length, 2);
  assert.equal(L.logWellnessDone(log, 'hips', 'x').length, 2);
  // streak : jours consécutifs jusqu'à aujourd'hui
  const streakLog = [{ date: '2026-07-11', key: 'a' }, { date: '2026-07-12', key: 'b' }, { date: '2026-07-13', key: 'c' }];
  assert.equal(L.wellnessStreak(streakLog, '2026-07-13'), 3);
  // tolère de compter depuis hier si rien fait aujourd'hui
  assert.equal(L.wellnessStreak(streakLog, '2026-07-14'), 3);
  // trou → streak cassé (seul aujourd'hui)
  assert.equal(L.wellnessStreak([{ date: '2026-07-10', key: 'a' }, { date: '2026-07-13', key: 'b' }], '2026-07-13'), 1);
  // rien récemment → 0
  assert.equal(L.wellnessStreak([{ date: '2026-07-01', key: 'a' }], '2026-07-13'), 0);
  assert.equal(L.wellnessStreak([], '2026-07-13'), 0);
  // record de série (all-time), indépendant d'aujourd'hui
  assert.equal(L.wellnessBestStreak(streakLog), 3);
  // une série passée plus longue qu'un run récent → record = la plus longue
  const past = [
    { date: '2026-06-01', key: 'a' }, { date: '2026-06-02', key: 'b' }, { date: '2026-06-03', key: 'c' }, { date: '2026-06-04', key: 'd' }, // 4 d'affilée
    { date: '2026-07-12', key: 'e' }, { date: '2026-07-13', key: 'f' }, // 2 récents
  ];
  assert.equal(L.wellnessBestStreak(past), 4);
  // doublons le même jour ne gonflent pas le record
  assert.equal(L.wellnessBestStreak([{ date: '2026-07-13', key: 'a' }, { date: '2026-07-13', key: 'b' }]), 1);
  // date IMPOSSIBLE (2026-04-31 → déborde au 1er mai sous `new Date`) : ne fabrique plus de paire
  // consécutive fantôme avec le 2 mai. Une seule vraie séance existe → record 1, PAS 2.
  const phantom = [{ date: '2026-04-31', key: 'a' }, { date: '2026-05-02', key: 'b' }];
  assert.equal(L.wellnessBestStreak(phantom), 1, 'date impossible ignorée, pas de record fantôme');
  // cohérence avec la sœur wellnessStreak (marche depuis une vraie date) : elle ignore déjà le 31/04
  assert.equal(L.wellnessStreak(phantom, '2026-05-02'), 1, 'les deux sœurs sont d’accord');
  assert.equal(L.wellnessBestStreak([]), 0);
  assert.equal(L.wellnessBestStreak(null), 0);
  // comptage sur fenêtre (semaine)
  assert.equal(L.wellnessCountInWindow(streakLog, '2026-07-13', '2026-07-19'), 1);
  assert.equal(L.wellnessCountInWindow(streakLog, '2026-07-06', '2026-07-13'), 3);
  assert.equal(L.wellnessCountInWindow([], '2026-07-06', '2026-07-13'), 0);
});
test('wellnessMinutesForKey / wellnessMinutesInWindow : minutes de mobilité', () => {
  // routine simple → minutes de la routine
  assert.equal(L.wellnessMinutesForKey('hips'), 6);
  assert.equal(L.wellnessMinutesForKey('warmup'), 5);
  assert.equal(L.wellnessMinutesForKey('morning'), 4);
  assert.equal(L.wellnessMinutesForKey('stretch'), 8);
  // parcours → minutes cumulées du parcours
  const rev = L.wellnessParcours('reveil');
  assert.equal(L.wellnessMinutesForKey('parcours-reveil'), rev.minutes);
  // clé inconnue → 0
  assert.equal(L.wellnessMinutesForKey('zzz'), 0);
  assert.equal(L.wellnessMinutesForKey(''), 0);
  assert.equal(L.wellnessMinutesForKey(), 0);
  // somme sur fenêtre
  const log = [
    { date: '2026-07-13', key: 'hips' },    // 6
    { date: '2026-07-13', key: 'warmup' },  // 5
    { date: '2026-07-12', key: 'morning' }, // 4
    { date: '2026-07-05', key: 'stretch' }, // 8 (hors semaine)
    { date: '2026-07-13', key: 'zzz' },     // 0 (inconnue)
  ];
  assert.equal(L.wellnessMinutesInWindow(log, '2026-07-06', '2026-07-13'), 15); // 6+5+4
  assert.equal(L.wellnessMinutesInWindow(log, '2026-07-13', '2026-07-13'), 11); // 6+5
  assert.equal(L.wellnessMinutesInWindow([], '2026-07-06', '2026-07-13'), 0);
  assert.equal(L.wellnessMinutesInWindow(null, '2026-07-06', '2026-07-13'), 0);
});
test('bestWellnessWeek : record de routines par semaine', () => {
  assert.equal(L.bestWellnessWeek([], '2026-07-13'), null);
  // semaine du 06-07 = 3 routines ; semaine courante 13-07 = 1 → record = 06-07
  const log = [
    { date: '2026-07-06', key: 'hips' }, { date: '2026-07-07', key: 'neck' }, { date: '2026-07-08', key: 'warmup' }, // sem. 06-07
    { date: '2026-07-13', key: 'morning' }, // sem. 13-07 (courante)
  ];
  const b = L.bestWellnessWeek(log, '2026-07-13');
  assert.equal(b.weekStart, '2026-07-06');
  assert.equal(b.count, 3);
  assert.equal(b.isCurrent, false);
  // si la semaine courante est le record → isCurrent true
  const log2 = [
    { date: '2026-07-06', key: 'hips' },
    { date: '2026-07-13', key: 'neck' }, { date: '2026-07-14', key: 'warmup' }, { date: '2026-07-15', key: 'morning' }, // 3 cette semaine
  ];
  const b2 = L.bestWellnessWeek(log2, '2026-07-13');
  assert.equal(b2.weekStart, '2026-07-13');
  assert.equal(b2.count, 3);
  assert.equal(b2.isCurrent, true);
  // dates invalides ignorées
  assert.equal(L.bestWellnessWeek([{ date: 'x', key: 'a' }], '2026-07-13'), null);
  assert.equal(L.bestWellnessWeek(null, '2026-07-13'), null);
});
test('shareableWellness : partage du bilan bien-être', () => {
  assert.equal(L.shareableWellness([], '2026-07-13'), null);
  const log = [
    { date: '2026-07-11', key: 'hips' }, { date: '2026-07-12', key: 'neck' }, { date: '2026-07-13', key: 'warmup' },
  ];
  const s = L.shareableWellness(log, '2026-07-13');
  assert.ok(s && s.title && s.text);
  assert.match(s.title, /bilan bien-être/i);
  assert.match(s.text, /3 routines au total/);
  assert.match(s.text, /de suite/); // streak 3 jours
  assert.match(s.text, /min de mobilité/);
  // todayKey invalide → au moins le total, sans planter
  const s2 = L.shareableWellness(log, 'x');
  assert.ok(s2 && /au total/.test(s2.text));
  assert.equal(L.shareableWellness(null, '2026-07-13'), null);
});
test('wellnessFamilyBreakdown : répartition des routines par famille', () => {
  assert.deepEqual(L.wellnessFamilyBreakdown([], '2026-07-06', '2026-07-13'), []);
  const log = [
    { date: '2026-07-13', key: 'hips' },    // Mobilité
    { date: '2026-07-12', key: 'neck' },    // Mobilité
    { date: '2026-07-11', key: 'stretch' }, // Étirement
    { date: '2026-07-10', key: 'warmup' },  // Échauffement
    { date: '2026-07-13', key: 'parcours-reveil' }, // ignoré (parcours)
    { date: '2026-06-01', key: 'hips' },    // hors fenêtre
  ];
  const b = L.wellnessFamilyBreakdown(log, '2026-07-06', '2026-07-13');
  // Mobilité 2 en tête, puis Échauffement/Étirement à 1 (ordre alpha)
  assert.equal(b[0].family, 'Mobilité');
  assert.equal(b[0].count, 2);
  assert.ok(b[0].emoji);
  const mob = b.find(x => x.family === 'Mobilité'), etir = b.find(x => x.family === 'Étirement'), ech = b.find(x => x.family === 'Échauffement');
  assert.ok(mob && etir && ech);
  assert.equal(etir.count, 1); assert.equal(ech.count, 1);
  // total des comptes = routines connues dans la fenêtre (4)
  assert.equal(b.reduce((s, x) => s + x.count, 0), 4);
  // clés inconnues ignorées
  assert.deepEqual(L.wellnessFamilyBreakdown([{ date: '2026-07-13', key: 'zzz' }], '2026-07-06', '2026-07-13'), []);
  assert.deepEqual(L.wellnessFamilyBreakdown(null, '2026-07-06', '2026-07-13'), []);
});
test('wellnessGoalProgress : objectif hebdo de routines', () => {
  const g = L.wellnessGoalProgress(2, 3);
  assert.equal(g.done, 2); assert.equal(g.target, 3);
  assert.equal(g.pct, 67); assert.equal(g.reached, false); assert.equal(g.remaining, 1);
  // atteint / dépassé → pct plafonné 100, reached
  const done = L.wellnessGoalProgress(4, 3);
  assert.equal(done.reached, true); assert.equal(done.pct, 100); assert.equal(done.remaining, 0);
  // cible bornée 1-14 (0/absent → défaut 3 ; négatif → 1 ; trop grand → 14)
  assert.equal(L.wellnessGoalProgress(0, 0).target, 3, '0 → défaut 3');
  assert.equal(L.wellnessGoalProgress(0, -2).target, 1, 'négatif → borne basse 1');
  assert.equal(L.wellnessGoalProgress(0, 99).target, 14);
  // défauts robustes
  assert.equal(L.wellnessGoalProgress().target, 3);
  assert.equal(L.wellnessGoalProgress(-5, 3).done, 0);
});
test('wellnessInactivity : rappel doux après N jours sans routine', () => {
  // dernière routine il y a 5 jours (> seuil 3) → inactif
  const log = [{ date: '2026-07-01', key: 'a' }, { date: '2026-07-08', key: 'b' }];
  const r = L.wellnessInactivity(log, '2026-07-13', 3);
  assert.equal(r.inactive, true);
  assert.equal(r.days, 5);
  assert.ok(/5 jours/.test(r.message));
  // routine récente (< seuil) → pas de rappel
  const recent = L.wellnessInactivity([{ date: '2026-07-12', key: 'a' }], '2026-07-13', 3);
  assert.equal(recent.inactive, false);
  assert.equal(recent.days, 1);
  // pile au seuil → inactif
  assert.equal(L.wellnessInactivity([{ date: '2026-07-10', key: 'a' }], '2026-07-13', 3).inactive, true);
  // jamais commencé (liste vide) → pas de rappel, days null
  const none = L.wellnessInactivity([], '2026-07-13', 3);
  assert.equal(none.inactive, false);
  assert.equal(none.days, null);
  // todayKey invalide → pas de rappel
  assert.equal(L.wellnessInactivity(log, 'x').inactive, false);
  // seuil minimum 2
  assert.equal(L.wellnessInactivity([{ date: '2026-07-12', key: 'a' }], '2026-07-13', 1).inactive, false, 'seuil borné à 2 → 1 jour ne déclenche pas');
});
test('neglectedMobilityZone : zone la moins mobilisée', () => {
  // rien fait → première zone jamais faite (hips), lastDays null
  const n0 = L.neglectedMobilityZone([], '2026-07-13', 7);
  assert.equal(n0.key, 'hips');
  assert.equal(n0.lastDays, null);
  assert.ok(n0.emoji && n0.title);
  // hips fait récemment, épaules faites il y a longtemps, reste jamais → priorité aux jamais faites (ankles avant neck/wrists dans l'ordre)
  const log = [
    { date: '2026-07-12', key: 'hips' },      // récent → exclu
    { date: '2026-06-01', key: 'shoulders' }, // vieux mais pas le plus prioritaire face aux jamais-faits
  ];
  const n1 = L.neglectedMobilityZone(log, '2026-07-13', 7);
  assert.equal(n1.lastDays, null, 'une zone jamais faite prime (Infinity)');
  assert.equal(n1.key, 'backpain', 'première zone jamais faite dans l’ordre après hips/shoulders');
  // toutes les zones faites récemment (< minDays) → null
  const recent = L.WELLNESS_ZONE_ROUTINES.map((k, i) => ({ date: '2026-07-1' + (i % 3 + 1), key: k }));
  assert.equal(L.neglectedMobilityZone(recent, '2026-07-13', 30), null, 'toutes < 30 j → aucune négligée');
  // parmi des zones toutes faites, la plus ancienne au-delà du seuil est choisie
  const mixed = [
    { date: '2026-07-11', key: 'hips' }, { date: '2026-07-10', key: 'shoulders' }, { date: '2026-07-09', key: 'backpain' },
    { date: '2026-06-20', key: 'ankles' }, { date: '2026-07-08', key: 'neck' }, { date: '2026-07-07', key: 'wrists' },
  ];
  const nm = L.neglectedMobilityZone(mixed, '2026-07-13', 7);
  assert.equal(nm.key, 'ankles');
  assert.equal(nm.lastDays, 23);
  // todayKey invalide → null
  assert.equal(L.neglectedMobilityZone(log, 'x', 7), null);
});
test('wellnessBadges / newWellnessBadge : paliers de badges bien-être', () => {
  // série de 3 jours + 3 routines → badge série 🌱, pas encore de badge total (10)
  const three = [{ date: '2026-07-11', key: 'a' }, { date: '2026-07-12', key: 'b' }, { date: '2026-07-13', key: 'c' }];
  const b3 = L.wellnessBadges(three, '2026-07-13');
  assert.equal(b3.streak, 3);
  assert.equal(b3.total, 3);
  assert.equal(b3.streakBadge.days, 3);
  assert.equal(b3.streakBadge.emoji, '🌱');
  assert.equal(b3.totalBadge, null);
  assert.equal(b3.nextStreak.days, 7);
  assert.equal(b3.nextTotal.count, 10);
  assert.equal(b3.badges.length, 1);
  // 12 routines (dont série 7) → badge total 🧘 (10) + badge série 🔥 (7)
  const many = []; for (let i = 0; i < 12; i++) { const d = new Date(2026, 6, 2 + i); many.push({ date: `2026-07-${String(2 + i).padStart(2, '0')}`, key: 'r' + i }); }
  const bm = L.wellnessBadges(many, '2026-07-13');
  assert.equal(bm.total, 12);
  assert.equal(bm.totalBadge.count, 10);
  assert.equal(bm.streakBadge.days, 7, 'série 7+ → badge 🔥');
  assert.equal(bm.badges.length, 2);
  // rien → aucun badge
  const b0 = L.wellnessBadges([], '2026-07-13');
  assert.equal(b0.streakBadge, null);
  assert.equal(b0.totalBadge, null);
  assert.equal(b0.badges.length, 0);
  // newWellnessBadge : franchissement de palier série prioritaire
  assert.equal(L.newWellnessBadge(b0, b3).days, 3);
  assert.equal(L.newWellnessBadge(b0, b3).kind, 'streak');
  // pas de nouveau palier → null
  assert.equal(L.newWellnessBadge(b3, b3), null);
  // franchissement total seul
  const t9 = L.wellnessBadges(many.slice(0, 9), '2026-07-13'); // 9 routines, pas de badge total
  const t10 = L.wellnessBadges(many.slice(0, 10), '2026-07-13'); // 10 → badge total
  const nb = L.newWellnessBadge(t9, t10);
  assert.ok(nb && nb.kind === 'total' && nb.count === 10);
});
test('wellnessWeekHeatmap : heatmap des routines sur 7 jours', () => {
  const log = [
    { date: '2026-07-13', key: 'a' }, { date: '2026-07-13', key: 'b' }, // 2 aujourd'hui
    { date: '2026-07-11', key: 'c' },                                    // 1 avant-hier
    { date: '2026-06-01', key: 'd' },                                    // hors fenêtre
  ];
  const h = L.wellnessWeekHeatmap(log, '2026-07-13', 7);
  assert.equal(h.length, 7);
  // dernier = aujourd'hui avec 2 routines
  assert.equal(h[6].date, '2026-07-13');
  assert.equal(h[6].count, 2);
  assert.equal(h[6].dayLabel, 'L'); // 2026-07-13 = lundi
  // premier = il y a 6 jours (2026-07-07)
  assert.equal(h[0].date, '2026-07-07');
  assert.equal(h[0].count, 0);
  // 2026-07-11 présent avec 1
  const d11 = h.find(c => c.date === '2026-07-11');
  assert.equal(d11.count, 1);
  // hors fenêtre non compté (somme = 3 sur la semaine)
  assert.equal(h.reduce((s, c) => s + c.count, 0), 3);
  // nombre de jours personnalisable
  assert.equal(L.wellnessWeekHeatmap(log, '2026-07-13', 3).length, 3);
  // todayKey invalide → []
  assert.deepEqual(L.wellnessWeekHeatmap(log, 'x', 7), []);
  assert.deepEqual(L.wellnessWeekHeatmap([], '2026-07-13', 7).map(c => c.count), [0, 0, 0, 0, 0, 0, 0]);
});
test('wellnessRecurringEvent : routine récup programmable en récurrent', () => {
  const ev = L.wellnessRecurringEvent('cooldown', { startDate: '2026-07-13' });
  assert.ok(/Retour au calme/.test(ev.title));
  assert.equal(ev.kind, 'sport');
  assert.equal(ev.refId, 'wellness-cooldown');
  assert.equal(ev.rule.freq, 'weekly');
  assert.deepEqual(ev.rule.weekdays, [2, 5]);
  assert.equal(ev.rule.startDate, '2026-07-13');
  assert.ok(ev.durationMin > 0);
  // jours personnalisables
  assert.deepEqual(L.wellnessRecurringEvent('hips', { weekdays: [1, 3, 5] }).rule.weekdays, [1, 3, 5]);
  assert.equal(L.wellnessRecurringEvent('inconnu'), null);
});
test('suggestedRoutine : routine selon forme + charge', () => {
  assert.equal(L.suggestedRoutine('deload', 90).key, 'cooldown', 'charge élevée → récup');
  assert.equal(L.suggestedRoutine('maintain', 40).key, 'cooldown', 'forme basse → récup');
  assert.equal(L.suggestedRoutine('push', 85).key, 'warmup', 'en forme → échauffement');
  assert.equal(L.suggestedRoutine('maintain', 60).key, 'hips', 'neutre → mobilité');
  assert.equal(L.suggestedRoutine(null, null).key, 'hips', 'sans donnée → mobilité');
  ['recover', 'ready', 'mobility'].forEach(() => {});
  assert.ok(L.suggestedRoutine('deload', 90).reason.length > 10);
  // la clé suggérée correspond toujours à une vraie routine
  assert.ok(L.wellnessRoutine(L.suggestedRoutine('deload', 40).key));
});
test('workoutDominantZone : zone la plus travaillée d’une séance', () => {
  assert.equal(L.workoutDominantZone({ exercises: [{ name: 'Chaise au mur' }, { name: 'Élévations mollets' }, { name: 'Relevés tibiaux au mur' }] }), 'legs');
  // accepte des noms bruts (chaînes)
  assert.equal(L.workoutDominantZone({ exercises: ['Pompes classiques', 'Pompes diamants'] }), 'chest');
  assert.equal(L.workoutDominantZone({ exercises: [{ name: 'Gainage planche' }, { name: 'Hollow hold' }] }), 'abs');
  assert.equal(L.workoutDominantZone({ exercises: [{ name: 'Inconnu xyz' }] }), null);
  assert.equal(L.workoutDominantZone({ exercises: [] }), null);
  assert.equal(L.workoutDominantZone(null), null);
});
test('contextualWellnessRoutine : suggestion selon la dernière séance', () => {
  // course récente → chevilles
  const run = { workouts: [{ date: '2026-07-13', type: 'run' }] };
  assert.equal(L.contextualWellnessRoutine(run, '2026-07-13', 'maintain', 60).key, 'ankles');
  // séance jambes hier → hanches
  const legs = { workouts: [{ date: '2026-07-12', type: 'strength', exercises: [{ name: 'Split squat bulgare' }, { name: 'Fentes arrière' }] }] };
  assert.equal(L.contextualWellnessRoutine(legs, '2026-07-13', 'maintain', 60).key, 'hips');
  // haut du corps → épaules
  const upper = { workouts: [{ date: '2026-07-13', type: 'strength', exercises: [{ name: 'Pompes classiques' }, { name: 'Pike push-up' }] }] };
  assert.equal(L.contextualWellnessRoutine(upper, '2026-07-13', 'maintain', 60).key, 'shoulders');
  // gainage → bas du dos
  const abs = { workouts: [{ date: '2026-07-13', type: 'strength', exercises: [{ name: 'Gainage planche' }, { name: 'Hollow hold' }] }] };
  assert.equal(L.contextualWellnessRoutine(abs, '2026-07-13', 'maintain', 60).key, 'backpain');
  // séance trop ancienne (> 1 j) → retombe sur suggestedRoutine
  const old = { workouts: [{ date: '2026-07-01', type: 'run' }] };
  assert.equal(L.contextualWellnessRoutine(old, '2026-07-13', 'maintain', 60).key, 'hips');
  // plusieurs séances : c'est la PLUS RÉCENTE par date qui compte (le stockage réel est
  // newest-first via unshift ; l'ancien code lisait workouts[length-1] = la plus ANCIENNE).
  const multi = { workouts: [
    { date: '2026-07-13', type: 'run' },
    { date: '2026-07-05', type: 'strength', exercises: [{ name: 'Split squat bulgare' }] }
  ] };
  assert.equal(L.contextualWellnessRoutine(multi, '2026-07-13', 'maintain', 60).key, 'ankles');
  // robustesse : indépendant de l'ordre du tableau (on prend la date la plus récente)
  const multiRev = { workouts: [
    { date: '2026-07-05', type: 'strength', exercises: [{ name: 'Split squat bulgare' }] },
    { date: '2026-07-13', type: 'run' }
  ] };
  assert.equal(L.contextualWellnessRoutine(multiRev, '2026-07-13', 'maintain', 60).key, 'ankles');
  // aucune séance → suggestedRoutine (forme basse → cooldown)
  assert.equal(L.contextualWellnessRoutine({ workouts: [] }, '2026-07-13', 'maintain', 40).key, 'cooldown');
  // état invalide → ne plante pas, retombe sur suggestedRoutine
  assert.ok(L.wellnessRoutine(L.contextualWellnessRoutine(null, '2026-07-13', 'push', 85).key));
  // la clé pointe toujours vers une vraie routine
  assert.ok(L.wellnessRoutine(L.contextualWellnessRoutine(legs, '2026-07-13', 'maintain', 60).key).exercises.length);
});
test('starterChecklist : premiers pas cochés selon l’état réel', () => {
  const empty = L.starterChecklist({}, '2026-07-13');
  assert.equal(empty.total, 6);
  assert.equal(empty.done, 0);
  assert.equal(empty.complete, false);
  const some = L.starterChecklist({
    fitnessObjective: 'seche', blockStart: '2026-07-13',
    weights: [{ value: 80 }], workouts: [{ type: 'strength' }],
    nutrition: [{ date: '2026-07-13', water: 5 }], quests: [{ done: true }],
  }, '2026-07-13');
  assert.equal(some.done, 6); assert.equal(some.complete, true);
  const on = k => some.items.find(i => i.key === k).done;
  assert.ok(on('objective') && on('program') && on('weight') && on('workout') && on('water') && on('quest'));
  // eau insuffisante → non cochée
  assert.equal(L.starterChecklist({ nutrition: [{ date: '2026-07-13', water: 2 }] }, '2026-07-13').items.find(i => i.key === 'water').done, false);
  assert.equal(L.starterChecklist(null).done, 0);
});
test('objectiveWelcome : message personnalisé par objectif', () => {
  assert.ok(/muscle/i.test(L.objectiveWelcome('muscle')));
  assert.ok(/gras|déficit/i.test(L.objectiveWelcome('seche')));
  assert.ok(/endurance|trail|course/i.test(L.objectiveWelcome('endurance')));
  assert.ok(L.objectiveWelcome('athletique').length > 20);
  // clé inconnue → message par défaut (athlétique)
  assert.equal(L.objectiveWelcome('zzz'), L.objectiveWelcome('athletique'));
});
test('installNudge : nudge d’installation PWA contextuel', () => {
  const engaged = { workouts: Array.from({ length: 5 }, (_, i) => ({ id: i })) };
  // installable + engagé + non installé → affiché
  const r = L.installNudge(engaged, { standalone: false, canPrompt: true, dismissed: false });
  assert.equal(r.show, true);
  assert.equal(r.sessions, 5);
  assert.ok(/écran d.accueil|installe/i.test(r.message));
  // déjà installé (standalone) → masqué
  assert.equal(L.installNudge(engaged, { standalone: true, canPrompt: true }).show, false);
  // refusé → masqué
  assert.equal(L.installNudge(engaged, { canPrompt: true, dismissed: true }).show, false);
  // pas de prompt dispo (iOS/pas installable) → masqué (iOS a son bandeau)
  assert.equal(L.installNudge(engaged, { canPrompt: false }).show, false);
  // pas assez engagé (< seuil 3) → masqué
  assert.equal(L.installNudge({ workouts: [{ id: 1 }, { id: 2 }] }, { canPrompt: true }).show, false);
  // seuil personnalisable
  assert.equal(L.installNudge({ workouts: [{ id: 1 }] }, { canPrompt: true, threshold: 1 }).show, true);
  // état vide → masqué, sans planter
  assert.equal(L.installNudge({}, { canPrompt: true }).show, false);
  assert.equal(L.installNudge(null, {}).show, false);
});
test('isIosInstallable : aide d’installation iOS (dont iPad-as-Mac iPadOS 13+)', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
  const ipadOld = 'Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X) AppleWebKit/605.1.15';
  const ipadNew = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15'; // iPadOS 13+ se fait passer pour un Mac
  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
  const android = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36';
  // Cas nominaux inchangés
  assert.equal(L.isIosInstallable(iphone, false), true);
  assert.equal(L.isIosInstallable(ipadOld, false), true);
  assert.equal(L.isIosInstallable(android, false), false);
  // Déjà installé en app (standalone) → pas d’aide
  assert.equal(L.isIosInstallable(iphone, true), false);
  // iPad iPadOS 13+ : reconnu via l’écran tactile même si l’UA dit « Macintosh »
  assert.equal(L.isIosInstallable(ipadNew, false, 5), true);
  assert.equal(L.isIosInstallable(ipadNew, true, 5), false); // déjà installé
  // Vrai Mac de bureau (non tactile) → pas d’aide, pas de faux positif
  assert.equal(L.isIosInstallable(mac, false, 0), false);
  assert.equal(L.isIosInstallable(mac, false), false); // maxTouchPoints absent → ignoré
  // Rétrocompat : sans 3ᵉ argument, un « Macintosh » reste non-iOS
  assert.equal(L.isIosInstallable(ipadNew, false), false);
  // Entrées vides
  assert.equal(L.isIosInstallable('', false), false);
  assert.equal(L.isIosInstallable(null, false), false);
});
test('compareVersions / whatsNewSince : écran Nouveautés après mise à jour', () => {
  // compareVersions
  assert.equal(L.compareVersions('1.9.190', '1.9.189'), 1);
  assert.equal(L.compareVersions('1.9.9', '1.9.10'), -1);
  assert.equal(L.compareVersions('1.10.0', '1.9.99'), 1);
  assert.equal(L.compareVersions('2.0.0', '2.0.0'), 0);
  assert.equal(L.compareVersions('1.9', '1.9.0'), 0); // longueurs différentes
  const log = [
    { v: '1.9.190', emoji: '✨', text: 'C' },
    { v: '1.9.189', emoji: '📈', text: 'B' },
    { v: '1.9.188', emoji: '🧘', text: 'A' },
  ];
  // 1re utilisation (pas de lastSeen) → rien (on n'ennuie pas un nouveau)
  assert.deepEqual(L.whatsNewSince('', log), []);
  assert.deepEqual(L.whatsNewSince(null, log), []);
  // après update depuis 1.9.188 → les 2 versions plus récentes, plus récente en tête
  const seen = L.whatsNewSince('1.9.188', log);
  assert.equal(seen.length, 2);
  assert.equal(seen[0].v, '1.9.190');
  assert.equal(seen[1].v, '1.9.189');
  // déjà à jour → rien
  assert.deepEqual(L.whatsNewSince('1.9.190', log), []);
  // plafond respecté
  assert.equal(L.whatsNewSince('0.0.0', log, 1).length, 1);
  // le CHANGELOG intégré est cohérent : trié décroissant, [0].v est la version courante
  assert.ok(Array.isArray(L.CHANGELOG) && L.CHANGELOG.length >= 3);
  for (let i = 1; i < L.CHANGELOG.length; i++) assert.equal(L.compareVersions(L.CHANGELOG[i - 1].v, L.CHANGELOG[i].v), 1);
  assert.equal(L.CHANGELOG[0].v, '2.0.232');
});

test('compareApplications : meilleures cibles en tête, activité récente d’abord ailleurs', () => {
  const n = L.normalizeApplication;
  // à postuler : score décroissant, sans note en queue
  const aps = [n({ id: 1, company: 'Sans', status: 'a_postuler' }), n({ id: 2, company: 'Top', status: 'a_postuler', score: 9 }), n({ id: 3, company: 'Mid', status: 'a_postuler', score: 6 })].sort(L.compareApplications);
  assert.deepEqual(aps.map(a => a.company), ['Top', 'Mid', 'Sans']);
  // postulé : date décroissante d'abord (activité récente), même si le score diffère
  const post = [n({ id: 1, company: 'Vieille', status: 'postule', date: '2026-06-01', score: 9 }), n({ id: 2, company: 'Récente', status: 'postule', date: '2026-07-10', score: 2 })].sort(L.compareApplications);
  assert.equal(post[0].company, 'Récente');
  // l'étape du pipeline prime toujours (à postuler avant postulé)
  const mix = [n({ id: 1, company: 'P', status: 'postule', date: '2026-07-10' }), n({ id: 2, company: 'A', status: 'a_postuler', score: 1 })].sort(L.compareApplications);
  assert.equal(mix[0].company, 'A');
});

test('nextAlternanceTarget : la meilleure cible à postuler du jour', () => {
  const apps = [
    { id: 1, company: 'Moyenne SARL', status: 'a_postuler', score: 6 },
    { id: 2, company: 'KPMG Lorient', status: 'a_postuler', score: 8 },
    { id: 3, company: 'Déjà Postulé', status: 'postule', score: 10, date: '2026-07-10' },
    { id: 4, company: 'Sans Score', status: 'a_postuler' },
  ];
  const t = L.nextAlternanceTarget(apps);
  assert.equal(t.company, 'KPMG Lorient', 'la mieux notée parmi les À POSTULER (postulé=10 ignoré)');
  assert.equal(t.score, 8);
  // égalité de score → ordre alphabétique stable
  const tie = L.nextAlternanceTarget([{ id: 1, company: 'Zeta', status: 'a_postuler', score: 7 }, { id: 2, company: 'Alpha', status: 'a_postuler', score: 7 }]);
  assert.equal(tie.company, 'Alpha');
  // sans score → quand même une cible (les notées passent devant)
  assert.equal(L.nextAlternanceTarget([{ id: 4, company: 'Sans Score', status: 'a_postuler' }]).company, 'Sans Score');
  // rien à postuler → null
  assert.equal(L.nextAlternanceTarget([{ id: 3, company: 'X', status: 'refus' }]), null);
  assert.equal(L.nextAlternanceTarget([]), null);
  // le score survit à normalizeApplication et à la fusion
  assert.equal(L.normalizeApplication({ score: '7' }).score, 7);
  assert.equal(L.normalizeApplication({ score: 42 }).score, null, 'hors 0-10 → null');
  const m = L.mergeApplications([{ id: 1, company: 'A', status: 'a_postuler' }], [{ company: 'A', status: 'a_postuler', score: 9 }]);
  assert.equal(m.applications[0].score, 9);
});

test('compareApplications : tri du suivi (étape, puis score/date selon l’étape)', () => {
  const cmp = L.compareApplications;
  // 1. clé primaire = étape du pipeline (a_postuler → postule → relance → entretien → accepte → refus)
  const byStage = ['refus', 'accepte', 'entretien', 'relance', 'postule', 'a_postuler']
    .map((s, i) => ({ status: s, score: null, date: '', createdAt: i }))
    .sort(cmp).map(a => a.status);
  assert.deepEqual(byStage, ['a_postuler', 'postule', 'relance', 'entretien', 'accepte', 'refus']);

  // 2. à postuler : meilleur SCORE en tête, celles sans note en queue
  const ap = [
    { status: 'a_postuler', company: 'Moyenne', score: 3, date: '', createdAt: 1 },
    { status: 'a_postuler', company: 'SansNote', score: null, date: '', createdAt: 2 },
    { status: 'a_postuler', company: 'TopCible', score: 8, date: '', createdAt: 3 },
  ].sort(cmp).map(a => a.company);
  assert.deepEqual(ap, ['TopCible', 'Moyenne', 'SansNote'], 'score décroissant, sans note en dernier');

  // à postuler, score égal → départage par date décroissante, puis par ajout le plus récent
  const apTie = [
    { status: 'a_postuler', company: 'Ancienne', score: 5, date: '2026-01-01', createdAt: 1 },
    { status: 'a_postuler', company: 'Récente', score: 5, date: '2026-05-01', createdAt: 2 },
  ].sort(cmp).map(a => a.company);
  assert.deepEqual(apTie, ['Récente', 'Ancienne']);
  const apTie2 = [
    { status: 'a_postuler', company: 'AjoutTot', score: 5, date: '2026-01-01', createdAt: 100 },
    { status: 'a_postuler', company: 'AjoutTard', score: 5, date: '2026-01-01', createdAt: 200 },
  ].sort(cmp).map(a => a.company);
  assert.deepEqual(apTie2, ['AjoutTard', 'AjoutTot'], 'à score et date égaux, le plus récemment ajouté d’abord');

  // 3. AUTRE étape : la DATE prime sur le score (activité récente d’abord) — contraste avec « à postuler »
  const ent = [
    { status: 'entretien', company: 'VieuxGrosScore', score: 9, date: '2026-01-01', createdAt: 1 },
    { status: 'entretien', company: 'RécentPetitScore', score: 1, date: '2026-06-01', createdAt: 2 },
  ].sort(cmp).map(a => a.company);
  assert.deepEqual(ent, ['RécentPetitScore', 'VieuxGrosScore'], 'hors à postuler, la date récente passe devant un meilleur score');

  // date manquante ('') reléguée en queue de son groupe de statut
  const noDate = [
    { status: 'postule', company: 'SansDate', score: null, date: '', createdAt: 1 },
    { status: 'postule', company: 'AvecDate', score: null, date: '2026-03-01', createdAt: 2 },
  ].sort(cmp).map(a => a.company);
  assert.deepEqual(noDate, ['AvecDate', 'SansDate']);

  // 4. comparateur cohérent : antisymétrique et réflexif (l’étape prime toujours sur score/date)
  const a = { status: 'a_postuler', score: 8, date: '2026-01-01', createdAt: 1 };
  const b = { status: 'entretien', score: 2, date: '2026-05-01', createdAt: 2 };
  assert.ok(cmp(a, b) < 0 && cmp(b, a) > 0, 'à postuler avant entretien quels que soient score/date');
  assert.equal(cmp(a, a), 0);

  // 5. chemin de production réel : normalizeApplication puis sort → À POSTULER en tête, mieux notée d’abord
  const real = [
    { id: 3, company: 'Refusée', status: 'refus', date: '2026-07-16' },
    { id: 1, company: 'Petite Cible', status: 'a_postuler', score: 4 },
    { id: 2, company: 'Grosse Cible', status: 'a_postuler', score: 9 },
  ].map(L.normalizeApplication).sort(cmp).map(a => a.company);
  assert.deepEqual(real, ['Grosse Cible', 'Petite Cible', 'Refusée']);
});

test('filterApplications : recherche insensible aux accents + filtre statut', () => {
  const apps = [
    { company: 'Cabinet Léa', role: 'Compta', source: 'Lorient (56)', notes: '', status: 'postule' },
    { company: 'FIDUCIAL', role: 'Alternant', source: 'Vannes (56)', notes: 'top cabinet', status: 'a_postuler' },
    { company: 'Gamma SARL', role: '', source: 'Rennes (35)', notes: '', status: 'refus' },
  ];
  // accents/casse ignorés (léa ↔ LEA)
  assert.equal(L.filterApplications(apps, { query: 'LEA' }).length, 1);
  assert.equal(L.filterApplications(apps, { query: 'léa' })[0].company, 'Cabinet Léa');
  // cherche aussi dans poste / source / notes
  assert.equal(L.filterApplications(apps, { query: 'vannes' })[0].company, 'FIDUCIAL');
  assert.equal(L.filterApplications(apps, { query: 'top cab' })[0].company, 'FIDUCIAL');
  // filtre statut seul, et combiné avec la recherche
  assert.equal(L.filterApplications(apps, { status: 'refus' })[0].company, 'Gamma SARL');
  assert.equal(L.filterApplications(apps, { query: 'cabinet', status: 'a_postuler' })[0].company, 'FIDUCIAL');
  assert.equal(L.filterApplications(apps, { query: 'cabinet', status: 'refus' }).length, 0);
  // sans filtre → tout ; entrées cassées ignorées
  assert.equal(L.filterApplications(apps, {}).length, 3);
  assert.equal(L.filterApplications([null, apps[0]], { query: 'léa' }).length, 1);
  assert.deepEqual(L.filterApplications('junk', { query: 'x' }), []);
});

test('describeBackup : aperçu d’une sauvegarde avant import', () => {
  const d = L.describeBackup({ workouts: [{ date: '2026-01-02' }, { date: '2026-01-03' }], applications: [{ date: '2026-01-05' }], agenda: [], xp: '150', habits: [{}, {}] });
  assert.equal(d.workouts, 2); assert.equal(d.applications, 1); assert.equal(d.habits, 2);
  assert.equal(d.xp, 150); assert.equal(d.lastDate, '2026-01-05'); assert.equal(d.total, 5);
  // entrées inconnues/invalides → zéros, jamais de crash
  assert.equal(L.describeBackup(null).total, 0);
  assert.equal(L.describeBackup('junk').total, 0);
  assert.equal(L.describeBackup({ workouts: 'pas un tableau', xp: -5 }).xp, 0);
});

test('backupImportWarnings : alerte avant un import régressif', () => {
  const rich = { workouts: Array.from({ length: 10 }, (_, i) => ({ date: '2026-07-0' + ((i % 9) + 1) })), applications: [{ date: '2026-07-10' }, { date: '2026-07-12' }] };
  // sauvegarde vide → VIDE signalée
  assert.ok(L.backupImportWarnings(rich, {}).some(w => /VIDE/.test(w)));
  // bien moins fournie → signalée avec les comptes
  const small = { workouts: [{ date: '2026-06-01' }] };
  const w2 = L.backupImportWarnings(rich, small);
  assert.ok(w2.some(w => /beaucoup moins/.test(w)));
  assert.ok(w2.some(w => /Candidatures : 0 .* 2/.test(w)));
  assert.ok(w2.some(w => /plus ancienne/.test(w)));
  // sauvegarde plus riche → aucun avertissement
  assert.deepEqual(L.backupImportWarnings(small, rich), []);
});

test('formatBytes : o/Ko/Mo/Go et entrées invalides', () => {
  assert.equal(L.formatBytes(0), '0 o');
  assert.equal(L.formatBytes(512), '512 o');
  assert.equal(L.formatBytes(2048), '2.0 Ko');
  assert.equal(L.formatBytes(150 * 1024), '150 Ko');
  assert.equal(L.formatBytes(2.5 * 1024 * 1024), '2.5 Mo');
  assert.equal(L.formatBytes(3 * 1024 * 1024 * 1024), '3.00 Go');
  assert.equal(L.formatBytes(-1), '—');
  assert.equal(L.formatBytes(NaN), '—');
  assert.equal(L.formatBytes('abc'), '—');
});

test('storageHealthSummary : niveaux et lignes du bilan de stockage', () => {
  const now = 1700000000000;
  // état léger, miroir frais, persistance accordée → ok
  const ok = L.storageHealthSummary({ stateBytes: 200 * 1024, quota: 100e6, usage: 10e6, persisted: true, mirrorAt: now - 36e5, snapCount: 3, now });
  assert.equal(ok.level, 'ok');
  assert.ok(ok.lines[0].includes('200 Ko'));
  assert.ok(ok.lines.some(l => l.includes('3 instantanés')));
  assert.ok(ok.lines.some(l => l.includes('accordée')));
  // état > 4 Mo → crit
  assert.equal(L.storageHealthSummary({ stateBytes: 4.5 * 1024 * 1024, now }).level, 'crit');
  // état > 2,4 Mo → warn
  assert.equal(L.storageHealthSummary({ stateBytes: 3 * 1024 * 1024, now }).level, 'warn');
  // quota utilisé à 85 % → warn
  assert.equal(L.storageHealthSummary({ stateBytes: 1000, quota: 100, usage: 85, now }).level, 'warn');
  // miroir vieux de 60 h → warn + ligne dédiée
  const old = L.storageHealthSummary({ stateBytes: 1000, mirrorAt: now - 60 * 36e5, snapCount: 7, now });
  assert.equal(old.level, 'warn');
  assert.ok(old.lines.some(l => l.includes('pas été rafraîchi')));
  // pas de miroir → ligne explicite, pas de crash
  assert.ok(L.storageHealthSummary({ stateBytes: 1000, now }).lines.some(l => l.includes('pas encore de miroir')));
  // entrée vide → objet cohérent
  const empty = L.storageHealthSummary(null);
  assert.equal(empty.level, 'ok');
  assert.ok(Array.isArray(empty.lines) && empty.lines.length >= 2);
});
test('membershipInfo : ancienneté et paliers de fidélité', () => {
  // jour d'install → 0 j, palier Nouveau, prochain = 7 j
  const d0 = L.membershipInfo('2026-07-13', '2026-07-13');
  assert.equal(d0.days, 0);
  assert.equal(d0.tier.label, 'Nouveau');
  assert.equal(d0.next.days, 7);
  assert.equal(d0.next.remaining, 7);
  // 10 j → palier Lancé (≥7), prochain Régulier (30) dans 20 j
  const d10 = L.membershipInfo('2026-07-03', '2026-07-13');
  assert.equal(d10.days, 10);
  assert.equal(d10.tier.label, 'Lancé');
  assert.equal(d10.tier.emoji, '🌱');
  assert.equal(d10.next.label, 'Régulier');
  assert.equal(d10.next.remaining, 20);
  // 400 j → Vétéran, plus de palier suivant
  const dv = L.membershipInfo('2025-06-01', '2026-07-13');
  assert.equal(dv.tier.label, 'Vétéran');
  assert.equal(dv.next, null);
  // date d'install future → borné à 0 j
  assert.equal(L.membershipInfo('2026-08-01', '2026-07-13').days, 0);
  // dates invalides → null
  assert.equal(L.membershipInfo('', '2026-07-13'), null);
  assert.equal(L.membershipInfo('2026-07-13', 'x'), null);
  assert.equal(L.membershipInfo(null, null), null);
});
test('shareAppPayload : message d’invitation à partager', () => {
  // URL http/https → incluse
  const p = L.shareAppPayload('https://adrienlvl.github.io/irl-lvp-up/');
  assert.ok(p.title && p.text);
  assert.equal(p.url, 'https://adrienlvl.github.io/irl-lvp-up/');
  assert.match(p.text, /IRL LVP UP|RPG de vie/);
  // URL non http (file://, vide) → pas de champ url
  assert.equal('url' in L.shareAppPayload('file:///C:/app/index.html'), false);
  assert.equal('url' in L.shareAppPayload(''), false);
  assert.equal('url' in L.shareAppPayload(), false);
  // toujours un title + text exploitables
  const bare = L.shareAppPayload();
  assert.ok(bare.title.length > 3 && bare.text.length > 20);
});
test('launchTarget : cible de lancement PWA depuis ?go=', () => {
  assert.equal(L.launchTarget('?go=wellness'), 'wellness');
  assert.equal(L.launchTarget('?go=today'), 'today');
  assert.equal(L.launchTarget('?go=athlete'), 'athlete');
  assert.equal(L.launchTarget('go=coach'), 'coach'); // sans le ?
  assert.equal(L.launchTarget('?foo=1&go=nutrition'), 'nutrition');
  // cible inconnue → null
  assert.equal(L.launchTarget('?go=hack'), null);
  // absent / vide / malformé → null
  assert.equal(L.launchTarget('?x=1'), null);
  assert.equal(L.launchTarget(''), null);
  assert.equal(L.launchTarget(null), null);
  assert.equal(L.launchTarget(), null);
  // wellness fait bien partie des cibles connues
  assert.ok(L.LAUNCH_TARGETS.includes('wellness'));
});
test('shouldReacquireWakeLock : ré-acquisition du verrou d’écran', () => {
  // séance ouverte + page visible → ré-acquérir
  assert.equal(L.shouldReacquireWakeLock(true, 'visible'), true);
  // page cachée → non
  assert.equal(L.shouldReacquireWakeLock(true, 'hidden'), false);
  // pas de séance ouverte → non
  assert.equal(L.shouldReacquireWakeLock(false, 'visible'), false);
  assert.equal(L.shouldReacquireWakeLock(undefined, 'visible'), false);
  assert.equal(L.shouldReacquireWakeLock(true, undefined), false);
});
test('pendingBadgeCount : actions en attente pour le badge PWA', () => {
  const state = {
    quests: [{ done: false }, { done: true }, { done: false }],
    agenda: [
      { date: '2026-07-13', kind: 'sport' },
      { date: '2026-07-13', kind: 'sport' },
      { date: '2026-07-13', kind: 'perso' },   // pas sport → ignoré
      { date: '2026-07-14', kind: 'sport' },    // autre jour → ignoré
    ],
  };
  // 2 quêtes non faites + 2 séances sport du jour = 4
  assert.equal(L.pendingBadgeCount(state, '2026-07-13'), 4);
  // une séance sport du jour DÉJÀ FAITE n'est plus en attente (comme sportToday) → non comptée
  const doneState = {
    quests: [{ done: false }],
    agenda: [
      { date: '2026-07-13', kind: 'sport', completed: true },  // terminée → ignorée
      { date: '2026-07-13', kind: 'sport', completed: false }, // à faire → comptée
    ],
  };
  // 1 quête + 1 séance à faire = 2 (avant le correctif : 3, la séance terminée était comptée)
  assert.equal(L.pendingBadgeCount(doneState, '2026-07-13'), 2);
  // aucune action → 0
  assert.equal(L.pendingBadgeCount({ quests: [{ done: true }], agenda: [] }, '2026-07-13'), 0);
  // borné à 99
  const many = { quests: Array.from({ length: 200 }, () => ({ done: false })), agenda: [] };
  assert.equal(L.pendingBadgeCount(many, '2026-07-13'), 99);
  // état vide → 0, sans planter
  assert.equal(L.pendingBadgeCount({}, '2026-07-13'), 0);
  assert.equal(L.pendingBadgeCount(null, '2026-07-13'), 0);
});
test('vibrationPattern : motifs haptiques par événement', () => {
  assert.deepEqual(L.vibrationPattern('restEnd'), [180, 90, 180]);
  assert.deepEqual(L.vibrationPattern('setDone'), [40]);
  assert.ok(Array.isArray(L.vibrationPattern('record')) && L.vibrationPattern('record').length >= 3);
  assert.ok(Array.isArray(L.vibrationPattern('levelUp')) && L.vibrationPattern('levelUp').length >= 3);
  // motifs enrichis : palier bien-être + quête bouclée
  assert.ok(Array.isArray(L.vibrationPattern('badge')) && L.vibrationPattern('badge').length >= 3);
  assert.ok(Array.isArray(L.vibrationPattern('questDone')) && L.vibrationPattern('questDone').length >= 1);
  // événement inconnu → null
  assert.equal(L.vibrationPattern('zzz'), null);
  assert.equal(L.vibrationPattern(), null);
  // chaque motif = durées positives
  Object.keys(L.VIBRATION_PATTERNS).forEach(k => { const p = L.vibrationPattern(k); assert.ok(p.every(n => Number.isFinite(n) && n > 0)); });
  // renvoie une COPIE (pas de mutation du motif source)
  const p = L.vibrationPattern('setDone'); p.push(999);
  assert.deepEqual(L.vibrationPattern('setDone'), [40], 'motif source non muté');
});
test('onboardingSetup : patch d’état initial validé/borné', () => {
  const s = L.onboardingSetup({ weight: 82.4, height: 178, age: 29, sex: 'homme', objective: 'seche', sessions: 4, equipment: { kettlebell: true, pullup: false } });
  assert.equal(s.fitnessObjective, 'seche');
  assert.equal(s.goals.sessions, 4);
  assert.equal(s.profile.weight, 82.4);
  assert.equal(s.profile.height, 178);
  assert.equal(s.profile.age, 29);
  assert.equal(s.profile.goal, 'recomposition');
  assert.deepEqual(s.profile.equipment, { handles: false, vest: false, kettlebell: true, pullup: false });
  assert.equal(s.activeProgram, 'fullbody');
  // jours dispo : captés, dédupliqués, triés lundi d'abord ; défaut [1,3,5] si absent
  assert.deepEqual(L.onboardingSetup({ objective: 'seche', days: [0, 5, 2, 2] }).profile.availableDays, [2, 5, 0]);
  assert.deepEqual(s.profile.availableDays, [1, 3, 5], 'défaut sans jours fournis');
  assert.deepEqual(L.onboardingSetup({ days: [9, -1] }).profile.availableDays, [1, 3, 5], 'jours invalides → défaut');
  // créneau préféré : validé, sinon ''
  assert.equal(L.onboardingSetup({ slot: 'matin' }).profile.trainingSlot, 'matin');
  assert.equal(L.onboardingSetup({ slot: 'nuit' }).profile.trainingSlot, '', 'créneau inconnu → vide');
  assert.equal(s.profile.trainingSlot, '', 'sans créneau → vide');
  // poids cible : capté dans goals si valide, sinon absent
  assert.equal(L.onboardingSetup({ targetWeight: '75.5' }).goals.targetWeight, 75.5);
  assert.equal('targetWeight' in L.onboardingSetup({ targetWeight: 5 }).goals, false, 'hors bornes → absent');
  assert.equal('targetWeight' in s.goals, false, 'non fourni → absent');
  // objectif course (km/sem) : capté dans goals.distance si > 0 et ≤ 500, sinon absent
  assert.equal(L.onboardingSetup({ distance: '25' }).goals.distance, 25);
  assert.equal(L.onboardingSetup({ distance: 30.7 }).goals.distance, 31, 'arrondi');
  assert.equal('distance' in L.onboardingSetup({ distance: 0 }).goals, false, '0 → absent');
  assert.equal('distance' in L.onboardingSetup({ distance: 999 }).goals, false, 'hors bornes → absent');
  assert.equal('distance' in s.goals, false, 'non fourni → absent');
  // pseudo du joueur : trimé, plafonné à 24 caractères, '' si absent/non-string
  assert.equal(L.onboardingSetup({ name: '  Adrien  ' }).profile.name, 'Adrien');
  assert.equal(L.onboardingSetup({ name: 'x'.repeat(40) }).profile.name.length, 24);
  assert.equal(L.onboardingSetup({ name: 42 }).profile.name, '');
  assert.equal(s.profile.name, '', 'non fourni → vide');
  // note blessures/limitations : trimée, plafonnée à 140 caractères, '' sinon
  assert.equal(L.onboardingSetup({ limitations: '  genou droit fragile  ' }).profile.limitations, 'genou droit fragile');
  assert.equal(L.onboardingSetup({ limitations: 'z'.repeat(200) }).profile.limitations.length, 140);
  assert.equal(L.onboardingSetup({ limitations: 7 }).profile.limitations, '');
  assert.equal(s.profile.limitations, '', 'non fourni → vide');
  // niveau d'activité : validé (5 clés), sinon '' (repli auto selon séances)
  assert.equal(L.onboardingSetup({ activity: 'actif' }).profile.activityLevel, 'actif');
  assert.equal(L.onboardingSetup({ activity: 'pro' }).profile.activityLevel, '', 'clé inconnue → vide');
  assert.equal(s.profile.activityLevel, '', 'non fourni → vide');
  // niveau : validé, défaut débutant
  assert.equal(L.onboardingSetup({ level: 'avance' }).profile.level, 'avance');
  assert.equal(L.onboardingSetup({ level: 'pro' }).profile.level, 'debutant', 'niveau inconnu → débutant');
  assert.equal(s.profile.level, 'debutant', 'défaut débutant');
  // objectif inconnu → athletique ; endurance → activeProgram run + goal trail
  assert.equal(L.onboardingSetup({ objective: 'zzz' }).fitnessObjective, 'athletique');
  const endu = L.onboardingSetup({ objective: 'endurance', sessions: 9 });
  assert.equal(endu.activeProgram, 'run');
  assert.equal(endu.profile.goal, 'trail');
  assert.equal(endu.goals.sessions, 7, 'séances bornées à 7');
  // valeurs hors bornes → omises / défauts
  const bad = L.onboardingSetup({ weight: 5, height: 999, age: 200, sex: 'x' });
  assert.equal(bad.profile.weight, undefined);
  assert.equal(bad.profile.height, undefined);
  assert.equal(bad.profile.age, 30);
  assert.equal(bad.profile.sex, 'homme');
  assert.ok(L.onboardingSetup(null).fitnessObjective === 'athletique');
});
test('perSessionForLevel : volume par séance selon le niveau', () => {
  assert.equal(L.perSessionForLevel('debutant'), 4);
  assert.equal(L.perSessionForLevel('intermediaire'), 5);
  assert.equal(L.perSessionForLevel('avance'), 6);
  assert.equal(L.perSessionForLevel('inconnu'), 5, 'défaut 5');
  assert.equal(L.perSessionForLevel(undefined), 5);
  // débutant < intermédiaire < avancé
  assert.ok(L.perSessionForLevel('debutant') < L.perSessionForLevel('intermediaire'));
  assert.ok(L.perSessionForLevel('intermediaire') < L.perSessionForLevel('avance'));
});
test('sessionTimesForSlot : horaires des séances selon le moment préféré', () => {
  assert.deepEqual(L.sessionTimesForSlot('matin'), { muscu: '07:00', course: '07:30' });
  assert.deepEqual(L.sessionTimesForSlot('midi'), { muscu: '12:15', course: '12:00' });
  assert.deepEqual(L.sessionTimesForSlot('soir'), { muscu: '18:00', course: '18:30' });
  // clé inconnue / vide → comportement historique (muscu soir, course matin)
  assert.deepEqual(L.sessionTimesForSlot(''), { muscu: '18:00', course: '07:30' });
  assert.deepEqual(L.sessionTimesForSlot('nuit'), { muscu: '18:00', course: '07:30' });
  assert.deepEqual(L.sessionTimesForSlot(undefined), { muscu: '18:00', course: '07:30' });
  // format HH:MM valide
  Object.keys(L.TRAINING_SLOTS).forEach(k => { const t = L.sessionTimesForSlot(k); assert.ok(/^\d{2}:\d{2}$/.test(t.muscu) && /^\d{2}:\d{2}$/.test(t.course)); });
});
test('onboardingFirstSession : première séance planifiée + date', () => {
  const week = [
    { kind: 'course', title: 'Course facile', weekday: 5 },
    { kind: 'muscu', title: 'Poussée', weekday: 3, exercises: [{ name: 'Pompes', sets: 3, reps: 10 }] },
    { kind: 'muscu', title: 'Jambes', weekday: 1, exercises: [{ name: 'Squat', sets: 3, reps: 10 }] },
  ];
  // lundi 2026-07-13 → première séance = lundi (weekday 1) = Jambes
  const f = L.onboardingFirstSession(week, '2026-07-13');
  assert.equal(f.title, 'Jambes');
  assert.equal(f.kind, 'muscu');
  assert.equal(f.weekday, 1);
  assert.equal(f.date, '2026-07-13');
  assert.equal(f.dayLabel, 'Lundi');
  assert.equal(f.guidable, true);
  // mercredi calculé depuis le lundi
  const wk2 = [{ kind: 'muscu', title: 'Haut', weekday: 3, exercises: [{ name: 'x', sets: 3, reps: 8 }] }];
  assert.equal(L.onboardingFirstSession(wk2, '2026-07-13').date, '2026-07-15');
  // première séance = course sans exercices → non guidable
  const run = [{ kind: 'course', title: 'Sortie longue', weekday: 2 }];
  assert.equal(L.onboardingFirstSession(run, '2026-07-13').guidable, false);
  // dimanche placé en fin de semaine (pas en tête)
  const withSun = [{ kind: 'muscu', title: 'Dim', weekday: 0, exercises: [{ name: 'x', sets: 1, reps: 1 }] }, { kind: 'muscu', title: 'Mar', weekday: 2, exercises: [{ name: 'y', sets: 1, reps: 1 }] }];
  assert.equal(L.onboardingFirstSession(withSun, '2026-07-13').title, 'Mar');
  // sans lundi valide → date vide mais séance renvoyée
  assert.equal(L.onboardingFirstSession(week, '').date, '');
  // vide → null
  assert.equal(L.onboardingFirstSession([], '2026-07-13'), null);
  assert.equal(L.onboardingFirstSession(null, '2026-07-13'), null);
});
test('onboardingCompleteness : complétude du profil d’onboarding', () => {
  // tout rempli → 100 %, nutrition prête
  const full = L.onboardingCompleteness({ objective: 'muscle', weight: 80, height: 178, age: 30, days: [1, 3, 5], slot: 'soir' });
  assert.equal(full.percent, 100);
  assert.equal(full.filled, 6);
  assert.equal(full.nutritionReady, true);
  assert.deepEqual(full.missing, []);
  // objectif seul (défaut) → poids/taille/âge/jours/moment manquants
  const min = L.onboardingCompleteness({ objective: 'muscle' });
  assert.equal(min.filled, 1);
  assert.equal(min.percent, Math.round(1 / 6 * 100));
  assert.equal(min.nutritionReady, false);
  assert.ok(min.missing.includes('poids') && min.missing.includes('taille') && min.missing.includes('moment préféré'));
  // poids + taille valides → nutrition prête même si le reste manque
  const nut = L.onboardingCompleteness({ objective: 'seche', weight: 72, height: 170 });
  assert.equal(nut.nutritionReady, true);
  assert.ok(!nut.missing.includes('poids') && !nut.missing.includes('taille'));
  // valeurs hors bornes → non comptées
  const bad = L.onboardingCompleteness({ objective: 'forme', weight: 5, height: 999, age: 200 });
  assert.equal(bad.nutritionReady, false);
  assert.ok(bad.missing.includes('poids') && bad.missing.includes('taille') && bad.missing.includes('âge'));
  // vide → 0 %
  assert.equal(L.onboardingCompleteness({}).percent, 0);
  assert.equal(L.onboardingCompleteness(null).percent, 0);
});
test('suggestObjective : suggestion d’objectif selon le profil', () => {
  // poids cible nettement plus bas → perte de gras (priorité au poids cible)
  const cut = L.suggestObjective({ weight: 90, height: 178, targetWeight: 80 });
  assert.equal(cut.key, 'seche');
  assert.match(cut.reason, /80 kg/);
  // poids cible plus haut → prise de muscle (même si IMC dirait autre chose)
  assert.equal(L.suggestObjective({ weight: 65, height: 180, targetWeight: 72 }).key, 'muscle');
  // écart de poids cible < 3 kg → on retombe sur l'IMC
  assert.equal(L.suggestObjective({ weight: 95, height: 178, targetWeight: 94 }).key, 'seche'); // IMC ~30
  // IMC seul (pas de poids cible) : surpoids → seche, maigreur → muscle, normal → athletique
  assert.equal(L.suggestObjective({ weight: 95, height: 178 }).key, 'seche');
  assert.equal(L.suggestObjective({ weight: 52, height: 180 }).key, 'muscle');
  assert.equal(L.suggestObjective({ weight: 72, height: 178 }).key, 'athletique');
  // catégorie OMS jugée sur l'IMC RÉEL, pas l'arrondi (cf. bmiInfo #400 / weightTargetAdvice #403) :
  // 72,2/1,70² = 24,98 (arrondi 25,0) reste « dans la norme » → athletique, pas seche
  const norm = L.suggestObjective({ weight: 72.2, height: 170 });
  assert.equal(norm.key, 'athletique');
  assert.match(norm.reason, /IMC 25,/); // l'affichage arrondi (25) reste inchangé
  // 53,4/1,70² = 18,48 (arrondi 18,5) reste « maigreur » → muscle, pas athletique
  const lean = L.suggestObjective({ weight: 53.4, height: 170 });
  assert.equal(lean.key, 'muscle');
  assert.match(lean.reason, /18,5/);
  // info insuffisante → null
  assert.equal(L.suggestObjective({ weight: 80 }), null);
  assert.equal(L.suggestObjective({}), null);
  assert.equal(L.suggestObjective(null), null);
  // toujours un label lisible
  assert.ok(/gras|muscle|athlétique/i.test(L.suggestObjective({ weight: 72, height: 178 }).label));
});
test('starterHabitFor : habitude de départ selon l’objectif', () => {
  const seche = L.starterHabitFor('seche');
  assert.match(seche.name, /eau/i);
  assert.deepEqual(seche.weekdays, [0, 1, 2, 3, 4, 5, 6]);
  assert.ok(seche.xp >= 1 && seche.xp <= 50);
  assert.match(L.starterHabitFor('muscle').name, /prot/i);
  assert.match(L.starterHabitFor('endurance').name, /étirement/i);
  // objectif inconnu → habitude du corps athlétique
  assert.equal(L.starterHabitFor('zzz').name, L.STARTER_HABITS.athletique.name);
  assert.equal(L.starterHabitFor().name, L.STARTER_HABITS.athletique.name);
  // normalisable en vraie habitude
  const h = L.normalizeHabit(L.starterHabitFor('forme'));
  assert.ok(h.name && Array.isArray(h.weekdays) && h.weekdays.length === 7);
});
test('sanitizeOnboardingDraft : brouillon d’onboarding validé', () => {
  const d = L.sanitizeOnboardingDraft({ objective: 'seche', weight: '82.4', height: '178', age: '29', sex: 'femme', level: 'avance', sessions: '4', slot: 'matin', days: [5, 2, 2, 9] });
  assert.equal(d.objective, 'seche');
  assert.equal(d.weight, 82.4);
  assert.equal(d.height, 178);
  assert.equal(d.age, 29);
  assert.equal(d.sex, 'femme');
  assert.equal(d.level, 'avance');
  assert.equal(d.sessions, 4);
  assert.equal(d.slot, 'matin');
  assert.deepEqual(d.days, [2, 5], 'jours dédupliqués + bornés 0-6');
  // valeurs invalides écartées (pas dans l'objet)
  const bad = L.sanitizeOnboardingDraft({ objective: 'zzz', weight: 5, height: 999, age: 200, sex: 'x', level: 'pro', sessions: 12, slot: 'nuit', days: 'x' });
  assert.deepEqual(bad, null, 'aucun champ valide → null');
  // partiel : ne garde que le valide
  const part = L.sanitizeOnboardingDraft({ objective: 'muscle', slot: 'soir', weight: 999 });
  assert.deepEqual(part, { objective: 'muscle', slot: 'soir' });
  assert.equal(L.sanitizeOnboardingDraft(null), null);
  assert.equal(L.sanitizeOnboardingDraft({}), null);
});
test('objectiveProgramText : export texte lisible du programme', () => {
  const ex = [{ name: 'Pompes classiques', kind: 'Poids du corps', sets: 3, reps: 10 }, { name: 'Montées de genoux', kind: 'Poids du corps', sets: 3, reps: 20 }];
  const prog = L.objectiveProgram('athletique', ex);
  const nutri = L.objectiveNutrition('athletique', { weight: 80, height: 178, age: 30, sex: 'homme', activityLevel: 'modere' });
  const txt = L.objectiveProgramText(prog, { nutri });
  assert.ok(txt.includes('Corps athlétique'), 'titre présent');
  assert.ok(/muscu · \d+ course/.test(txt), 'résumé présent');
  assert.ok(txt.includes('🏋️') && txt.includes('🏃'), 'muscu et course listées');
  assert.ok(/×/.test(txt), 'séries×reps présentes');
  assert.ok(txt.includes('Nutrition') && txt.includes('kcal/j'), 'nutrition présente');
  assert.equal(txt.split('\n').length > 5, true, 'plusieurs lignes');
  // Accord de « course » : athlétique = 3 runs → pluriel « 3 courses/sem. » (et jamais « 3 course/sem. »)
  assert.ok(txt.includes('3 courses/sem.'), 'course accordée au pluriel quand runs > 1');
  assert.ok(!/\b3 course\/sem\./.test(txt), 'pas de « 3 course/sem. » au singulier fautif');
  // Prise de muscle = 1 run → singulier « 1 course/sem. »
  const txtMuscle = L.objectiveProgramText(L.objectiveProgram('muscle', ex));
  assert.ok(txtMuscle.includes('1 course/sem.') && !txtMuscle.includes('1 courses/sem.'), 'course au singulier quand runs = 1');
  assert.equal(L.objectiveProgramText(null), '', 'programme vide → chaîne vide');
  assert.equal(L.objectiveProgramText({ title: 'x', week: [] }), '', 'sans séances → vide');
  // shareableProgram : objet de partage natif { title, text }
  const share = L.shareableProgram(prog, { nutri });
  assert.ok(share && share.title && share.text, 'objet de partage complet');
  assert.ok(/Corps athlétique/.test(share.title) && /ma semaine/i.test(share.title), 'titre = nom + ma semaine');
  assert.equal(share.text, txt, 'texte = export lisible');
  assert.equal(L.shareableProgram(null), null, 'programme vide → null');
  assert.equal(L.shareableProgram({ title: 'x', week: [] }), null, 'sans séances → null');
});
test('objectiveProgram : courses adaptées à l’objectif (accent)', () => {
  const ex = [{ name: 'Pompes classiques', kind: 'Poids du corps', sets: 3, reps: 10 }, { name: 'Montées de genoux', kind: 'Poids du corps', sets: 3, reps: 20 }];
  const seche = L.objectiveProgram('seche', ex);
  const types = seche.week.filter(s => s.kind === 'course').map(s => s.type);
  assert.equal(seche.runFocus, 'tempo & fractionné');
  assert.ok(types.includes('fractionne') || types.includes('tempo'), 'sèche : intervalles/tempo présents');
  const endurance = L.objectiveProgram('endurance', ex);
  assert.equal(endurance.runFocus, 'sorties longues');
  const muscle = L.objectiveProgram('muscle', ex);
  assert.ok(muscle.week.filter(s => s.kind === 'course').every(s => s.type === 'facile'), 'muscle : footing facile uniquement');
});
test('mealSplit : répartition calories/macros sur 4 repas', () => {
  const m = L.mealSplit(2000, 160, 200, 60);
  assert.equal(m.length, 4);
  assert.deepEqual(m.map(x => x.meal), ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation']);
  assert.deepEqual(m.map(x => x.kcal), [500, 700, 600, 200], '25/35/30/10 %');
  assert.equal(m[1].proteinG, 56, '160 × 0,35'); assert.equal(m[1].carbG, 70); assert.equal(m[1].fatG, 21);
  assert.deepEqual(L.mealSplit(0, 100, 100, 100), []);
});
test('nutritionTips : conseils adaptés à l’objectif', () => {
  assert.match(L.nutritionTips('perte')[0], /déficit/i);
  assert.match(L.nutritionTips('prise')[0], /surplus/i);
  assert.match(L.nutritionTips('maintien')[0], /stabiliser/i);
  assert.ok(L.nutritionTips('perte').length >= 4 && L.nutritionTips('perte').every(t => typeof t === 'string'));
  // Le levier protéines en sèche est nommé (2,4 g/kg, préservation musculaire) — science, pas générique.
  assert.ok(L.nutritionTips('perte').some(t => /2,4 g\/kg|protéines/i.test(t)));
});
test('mealIdea : exemple d’assiette par repas, rotation par seed', () => {
  const a = L.mealIdea('Petit-déjeuner', 500, 0);
  assert.equal(a.meal, 'Petit-déjeuner'); assert.equal(a.kcal, 500);
  assert.equal(typeof a.example, 'string'); assert.ok(a.example.length > 0);
  // seed fait tourner l'idée
  assert.notEqual(L.mealIdea('Déjeuner', 700, 0).example, L.mealIdea('Déjeuner', 700, 1).example);
  // seed cyclique
  assert.equal(L.mealIdea('Collation', 200, 0).example, L.mealIdea('Collation', 200, 3).example, '3 idées → cycle de 3');
  // repas inconnu → repli
  assert.match(L.mealIdea('Brunch', 400, 0).example, /Protéine/);
});
test('coachPlanText : plan Coach Poids en texte partageable', () => {
  const txt = L.coachPlanText({
    plan: { goal: 'perte', diff: 6, targetDate: '2026-11-08', dailyTarget: 1875, proteinG: 162, carbG: 143, fatG: 73 },
    week: [{ weekday: 1, label: 'Course', minutes: 40 }, { weekday: 3, label: 'Musculation', minutes: 45 }],
    meals: [{ meal: 'Petit-déjeuner', kcal: 469, example: 'Avoine + skyr' }],
  });
  assert.match(txt, /Perdre 6 kg/);
  assert.match(txt, /1875 kcal\/jour/);
  assert.match(txt, /cible ~ 08\/11\/2026/);
  assert.match(txt, /- Lun : Course · 40 min/);
  assert.match(txt, /- Mer : Musculation · 45 min/);
  assert.match(txt, /- Petit-déjeuner : 469 kcal · Avoine \+ skyr/);
  assert.equal(L.coachPlanText({}), '', 'sans plan → vide');
});
test('coachSteps : marche à suivre selon l’objectif', () => {
  assert.match(L.coachSteps('perte')[0], /déficit/);
  assert.match(L.coachSteps('prise')[0], /surplus/);
  assert.ok(L.coachSteps('maintien').length >= 4);
});
test('weeklyAdherence : score d’adhérence hebdo sur données réelles', () => {
  const st = {
    workouts: [{ date: '2026-07-06' }, { date: '2026-07-08' }, { date: '2026-07-10' }],
    nutrition: [{ date: '2026-07-07', protein: 150, water: 8 }, { date: '2026-07-08', protein: 150, water: 8 }, { date: '2026-07-09', protein: 150, water: 8 }],
    recovery: [{ date: '2026-07-08', sleep: 7.5 }, { date: '2026-07-09', sleep: 7 }],
    weights: [{ date: '2026-07-08', value: 80 }],
  };
  const full = L.weeklyAdherence(st, '2026-07-06', '2026-07-12', { proteinTargetG: 140, sessionTarget: 3 });
  assert.equal(full.total, 5); assert.equal(full.done, 5); assert.equal(full.score, 100);
  // sans pesée → 80 %
  const noWeigh = L.weeklyAdherence({ ...st, weights: [] }, '2026-07-06', '2026-07-12', { proteinTargetG: 140, sessionTarget: 3 });
  assert.equal(noWeigh.score, 80);
  assert.equal(noWeigh.items.find(i => i.key === 'weighin').done, false);
  // séances insuffisantes → item séances non validé
  const few = L.weeklyAdherence(st, '2026-07-06', '2026-07-12', { proteinTargetG: 140, sessionTarget: 5 });
  assert.equal(few.items.find(i => i.key === 'sessions').done, false);
  assert.equal(L.weeklyAdherence({}, '2026-07-06', '2026-07-12', {}).score, 0, 'état vide → 0');
});
test('weeklyAdherence : compte des JOURS distincts, pas des entrées (dates en double)', () => {
  // 3 entrées nutrition mais seulement 2 JOURS distincts à la cible (le 08 saisi deux fois) ;
  // 3 entrées recovery mais 2 nuits distinctes. Reproduit un import/restauration/double check-in.
  const st = {
    nutrition: [
      { date: '2026-07-07', protein: 150, water: 8 },
      { date: '2026-07-08', protein: 150, water: 8 },
      { date: '2026-07-08', protein: 150, water: 8 }, // doublon même date
    ],
    recovery: [
      { date: '2026-07-08', sleep: 8 },
      { date: '2026-07-08', sleep: 8 }, // doublon même date
      { date: '2026-07-09', sleep: 6 },
    ],
  };
  const r = L.weeklyAdherence(st, '2026-07-06', '2026-07-12', { proteinTargetG: 140, minProteinDays: 3, minWaterDays: 3 });
  const prot = r.items.find(i => i.key === 'protein');
  const water = r.items.find(i => i.key === 'water');
  // AVANT le correctif : 3 entrées comptées → « (3 j) » et done:true (à tort).
  // APRÈS : 2 jours distincts → « (2 j) » et done:false (< 3 requis).
  assert.match(prot.label, /\(2 j\)/); assert.equal(prot.done, false, '2 jours < 3 requis');
  assert.match(water.label, /\(2 j\)/); assert.equal(water.done, false);
  // sommeil : moyenne sur JOURS distincts (8 le 08, 6 le 09) = 7, pas (8+8+6)/3 ≈ 7,3.
  const sleep = r.items.find(i => i.key === 'sleep');
  assert.match(sleep.label, /moy\. 7\)/);
});
test('upsertAdherenceSnapshot : historique hebdo (maj/ajout, tri, cap)', () => {
  let h = L.upsertAdherenceSnapshot([], '2026-07-06', 80);
  assert.deepEqual(h, [{ week: '2026-07-06', score: 80 }]);
  // même semaine → mise à jour du score
  h = L.upsertAdherenceSnapshot(h, '2026-07-06', 60);
  assert.deepEqual(h, [{ week: '2026-07-06', score: 60 }], 'maj, pas de doublon');
  // nouvelle semaine → ajout, trié
  h = L.upsertAdherenceSnapshot(h, '2026-06-29', 40);
  assert.deepEqual(h.map(x => x.week), ['2026-06-29', '2026-07-06'], 'trié par date');
  // borne + arrondi
  assert.equal(L.upsertAdherenceSnapshot([], '2026-07-06', 150)[0].score, 100, 'borné à 100');
  // cap : garde les 2 dernières
  const many = [{ week: '2026-06-01', score: 1 }, { week: '2026-06-08', score: 2 }, { week: '2026-06-15', score: 3 }];
  assert.deepEqual(L.upsertAdherenceSnapshot(many, '2026-06-22', 4, 2).map(x => x.week), ['2026-06-15', '2026-06-22']);
  // clé invalide → inchangé
  assert.equal(L.upsertAdherenceSnapshot([{ week: '2026-07-06', score: 80 }], 'x', 50).length, 1);
});
test('weightTrend : rythme kg/sem, direction et ETA vers la cible', () => {
  // perte de 1 kg sur 14 jours → −0,5 kg/sem ; cible 79 (reste −2 kg) → ~4 sem.
  const w = [
    { date: '2026-06-26', value: 82 }, { date: '2026-07-03', value: 81.5 }, { date: '2026-07-10', value: 81 },
  ];
  const t = L.weightTrend(w, 79);
  assert.equal(t.ratePerWeek, -0.5);
  assert.equal(t.direction, 'down');
  assert.equal(t.toTarget, -2, 'il reste 2 kg à perdre');
  assert.equal(t.onTrack, true);
  assert.equal(t.weeksToTarget, 4);
  // mauvais sens : cible plus basse mais poids qui monte → onTrack false, pas d'ETA
  const up = L.weightTrend([{ date: '2026-06-26', value: 80 }, { date: '2026-07-10', value: 81 }], 78);
  assert.equal(up.direction, 'up');
  assert.equal(up.onTrack, false);
  assert.equal(up.weeksToTarget, null);
  // cible déjà atteinte
  const at = L.weightTrend([{ date: '2026-06-26', value: 79.1 }, { date: '2026-07-10', value: 79 }], 79);
  assert.equal(at.weeksToTarget, 0);
  assert.equal(at.onTrack, true);
  // pas assez de mesures
  assert.equal(L.weightTrend([{ date: '2026-07-10', value: 80 }], 79), null);
  assert.equal(L.weightTrend('nope', 79), null);
});

test('lifetimeStats : totaux cumulés séances / minutes / km / focus / xp', () => {
  const s = {
    workouts: [
      { type: 'strength', duration: 45 },
      { type: 'run', duration: 60, distance: 10.4 },
      { type: 'run', duration: 30, distance: 5.1 },
    ],
    focusSessions: [{ minutes: 25 }, { minutes: 50 }],
    xp: 1234.6,
  };
  const l = L.lifetimeStats(s);
  assert.equal(l.workouts, 3);
  assert.equal(l.workoutMinutes, 135);
  assert.equal(l.runKm, 15.5);
  assert.equal(l.focusSessions, 2);
  assert.equal(l.focusMinutes, 75);
  assert.equal(l.xp, 1235);
  const empty = L.lifetimeStats({});
  assert.equal(empty.workouts, 0); assert.equal(empty.runKm, 0);
  assert.equal(L.lifetimeStats(null).xp, 0);
});

test('computeAchievements : badges débloqués selon l’état', () => {
  const empty = L.computeAchievements({});
  assert.equal(empty.total, 22);
  assert.equal(empty.unlocked, 0, 'état vide → rien de débloqué');
  const rich = L.computeAchievements({
    quests: [{ done: true }],
    timerRuns: 2,
    streak: 5,
    workouts: [{ type: 'strength' }, { type: 'run' }],
    focusSessions: [{}],
    raceGoal: { date: '2027-01-01' },
    measurements: [{ waist: 80 }, { waist: 79 }],
    weights: [{ value: 81 }],
    habits: [{ name: 'Eau' }],
    nutrition: [{ water: 8 }],
    agenda: [],
  });
  const on = id => rich.badges.find(b => b.id === id).unlocked;
  assert.equal(on('first-quest'), true);
  assert.equal(on('streak-3'), true);
  assert.equal(on('first-strength'), true);
  assert.equal(on('first-run'), true);
  assert.equal(on('hydrated'), true);
  assert.equal(on('race-goal'), true);
  assert.equal(on('body-track'), true);
  assert.equal(on('weigh-in'), true);
  assert.equal(on('workouts-10'), false, '2 séances < 10');
  assert.equal(on('study-5'), false);
  assert.equal(on('streak-7'), false, 'série 5 < 7');
  assert.ok(rich.unlocked >= 8 && rich.unlocked < rich.total);
  // nouveaux badges tied to real data
  const beast = L.computeAchievements({
    streak: 30,
    fitnessObjective: 'seche',
    weights: [{ value: 72 }],
    goals: { targetWeight: 72 },
    workouts: [
      { type: 'run', distance: 60 }, { type: 'run', distance: 45 },
      { type: 'strength', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] },
    ],
  });
  const bon = id => beast.badges.find(b => b.id === id).unlocked;
  assert.equal(bon('streak-7'), true);
  assert.equal(bon('streak-30'), true);
  assert.equal(bon('run-100'), true, '60+45 = 105 km');
  assert.equal(bon('objective-set'), true);
  assert.equal(bon('weight-goal'), true, '72 = cible 72');
  assert.equal(bon('tonnage-10t'), false, '1 séance légère < 10 t');
  // weight-goal : le poids « actuel » = le plus RÉCENT par date, pas le dernier élément du tableau
  const wg = s => L.computeAchievements(s).badges.find(b => b.id === 'weight-goal').unlocked;
  assert.equal(
    wg({ weights: [{ value: 75, date: '2026-07-17' }, { value: 80, date: '2026-01-01' }], goals: { targetWeight: 75 } }),
    true, 'tableau non trié : le poids le plus récent (75) atteint la cible');
  assert.equal(
    wg({ weights: [{ value: 80, date: '2026-07-17' }, { value: 75, date: '2026-01-01' }], goals: { targetWeight: 75 } }),
    false, 'symétrique : un ancien poids-cible en dernière position ne débloque pas');
  assert.equal(
    wg({ weights: [{ value: 72 }], goals: { targetWeight: 72 } }),
    true, 'legacy sans date : compatibilité conservée');
  // robustesse
  assert.equal(L.computeAchievements(null).unlocked, 0);
});

test('measurementDelta : première vs dernière valeur > 0 d’un champ', () => {
  const m = [
    { date: '2026-06-01', waist: 88, arm: 34 },
    { date: '2026-06-15', waist: 86.5, arm: 34.5 },
    { date: '2026-07-01', waist: 85, arm: 35 },
  ];
  const waist = L.measurementDelta(m, 'waist');
  assert.equal(waist.latest, 85); assert.equal(waist.first, 88); assert.equal(waist.delta, -3); assert.equal(waist.count, 3);
  const arm = L.measurementDelta(m, 'arm');
  assert.equal(arm.delta, 1);
  // ignore les valeurs nulles/absentes
  const partial = L.measurementDelta([{ date: '2026-06-01', chest: 0 }, { date: '2026-06-10', chest: 100 }, { date: '2026-06-20', chest: 102 }], 'chest');
  assert.equal(partial.first, 100); assert.equal(partial.delta, 2);
  assert.equal(L.measurementDelta([], 'waist'), null);
  assert.equal(L.measurementDelta([{ date: '2026-06-01', waist: 0 }], 'waist'), null);
  assert.equal(L.measurementDelta('nope', 'waist'), null);
});

test('measurementRecentDelta : évolution sur la fenêtre glissante', () => {
  const m = [
    { date: '2026-04-01', waist: 90 },
    { date: '2026-06-01', waist: 88 },  // ~30 j avant le dernier (2026-07-01)
    { date: '2026-07-01', waist: 85 },
  ];
  const r = L.measurementRecentDelta(m, 'waist', 30);
  // point le plus proche de 30 j avant 2026-07-01 = 2026-06-01 (30 j) plutôt que 2026-04-01 (91 j)
  assert.equal(r.latest, 85); assert.equal(r.past, 88); assert.equal(r.delta, -3); assert.equal(r.spanDays, 30);
  // fenêtre plus large → prend le point le plus proche de 90 j = 2026-04-01
  const wide = L.measurementRecentDelta(m, 'waist', 90);
  assert.equal(wide.past, 90); assert.equal(wide.delta, -5); assert.equal(wide.spanDays, 91);
  // < 2 points → null
  assert.equal(L.measurementRecentDelta([{ date: '2026-07-01', waist: 85 }], 'waist', 30), null);
  assert.equal(L.measurementRecentDelta([], 'waist', 30), null);
});

test('photoComparePair : avant/après + poids proche', () => {
  const photos = [
    { id: 2, date: '2026-06-15', file: 'b.jpg' },
    { id: 1, date: '2026-05-01', file: 'a.jpg' },
    { id: 3, date: '2026-07-10', file: 'c.jpg' },
  ];
  const weights = [
    { date: '2026-05-02', value: 84 },
    { date: '2026-07-09', value: 79 },
  ];
  const cmp = L.photoComparePair(photos, weights);
  assert.equal(cmp.before.date, '2026-05-01', 'plus ancienne');
  assert.equal(cmp.after.date, '2026-07-10', 'plus récente');
  assert.equal(cmp.before.weight, 84, 'poids le plus proche du 01/05');
  assert.equal(cmp.after.weight, 79);
  assert.equal(cmp.weightDelta, -5, '79 - 84');
  assert.equal(cmp.days, 70, 'jours entre 01/05 et 10/07');
  // sans poids → weight null, delta null
  const noW = L.photoComparePair(photos, []);
  assert.equal(noW.before.weight, null);
  assert.equal(noW.weightDelta, null);
  // < 2 photos → null
  assert.equal(L.photoComparePair([{ date: '2026-05-01' }]), null);
  assert.equal(L.photoComparePair(null), null);
});
test('recompositionInsight : poids vs tour de taille', () => {
  // poids stable, taille en baisse → recomposition
  assert.equal(L.recompositionInsight(-0.3, -2).key, 'recomp');
  // poids ET taille en baisse → perte de gras
  assert.equal(L.recompositionInsight(-2, -2).key, 'fatloss');
  // poids et taille montent → prise (surveiller)
  assert.equal(L.recompositionInsight(2, 2).key, 'gain');
  // taille stable → pas d'insight
  assert.equal(L.recompositionInsight(-0.2, -0.3), null);
  assert.equal(L.recompositionInsight('x', -2), null);
});

test('readinessScore : 0-100 selon sommeil/fatigue/courbatures', () => {
  // parfait : 8h, fatigue 1, courbatures 1 → 40+30+30 = 100
  const top = L.readinessScore({ sleep: 8, fatigue: 1, soreness: 1 });
  assert.equal(top.score, 100); assert.equal(top.label, 'Prêt à pousser');
  // médiocre : 5h, fatigue 4, courbatures 4 → 25 + 7.5 + 7.5 = 40 → basse
  const low = L.readinessScore({ sleep: 5, fatigue: 4, soreness: 4 });
  assert.equal(low.score, 40); assert.equal(low.label, 'Récupération prioritaire');
  // correct : 7h, fatigue 2, courbatures 3 → 35 + 22.5 + 15 = 72.5 → 73
  const mid = L.readinessScore({ sleep: 7, fatigue: 2, soreness: 3 });
  assert.equal(mid.score, 73); assert.equal(mid.label, 'Correct — garde une marge');
  assert.equal(L.readinessScore(null), null);
  // Sommeil NON renseigné (champ vide → 0) : ne compte plus « 0 h ». On renormalise fatigue+courbatures
  // sur 100, comme tout le sous-système sommeil qui exclut sleep:0. (Avant : pénalité de −40 pts à tort.)
  const noSleepNeutral = L.readinessScore({ fatigue: 3, soreness: 3 }); // était 30 « Récup prioritaire »
  assert.equal(noSleepNeutral.score, 50); assert.equal(noSleepNeutral.label, 'Correct — garde une marge');
  const noSleepFresh = L.readinessScore({ fatigue: 1, soreness: 1 }); // frais mais sommeil vide
  assert.equal(noSleepFresh.score, 100, 'sans sommeil, frais → 100, pas 60');
  assert.equal(L.readinessScore({ sleep: 0, fatigue: 2, soreness: 2 }).score, 75, 'sleep:0 traité comme non renseigné');
  // sommeil renseigné → strictement inchangé (rétro-compatibilité)
  assert.equal(L.readinessScore({ sleep: 8, fatigue: 3, soreness: 3 }).score, 70);
});
test('readinessLimiter : nomme le frein DOMINANT du check-in (ou null si aucun net)', () => {
  // Courbatures seules élevées (5) → déficit 30, fatigue/sommeil 0 → soreness dominant.
  const sore = L.readinessLimiter({ sleep: 8, fatigue: 1, soreness: 5 });
  assert.deepEqual(sore, { factor: 'soreness', deficit: 30, value: 5 });
  // Fatigue seule élevée (5) → fatigue dominant.
  const fat = L.readinessLimiter({ sleep: 8, fatigue: 5, soreness: 1 });
  assert.deepEqual(fat, { factor: 'fatigue', deficit: 30, value: 5 });
  // Nuit courte (3 h) dominante : déficit 25 vs fatigue 7.5 vs courbatures 0.
  const sleepLim = L.readinessLimiter({ sleep: 3, fatigue: 2, soreness: 1 });
  assert.deepEqual(sleepLim, { factor: 'sleep', deficit: 25, value: 3 });
  // Deux freins à égalité (fatigue 5 ET courbatures 5, déficit 30 chacun) → pas de coupable unique → null.
  assert.equal(L.readinessLimiter({ sleep: 8, fatigue: 5, soreness: 5 }), null);
  // Aucun frein net (tout neutre : déficits 15/15/0) → sous le seuil de dominance → null.
  assert.equal(L.readinessLimiter({ sleep: 8, fatigue: 3, soreness: 3 }), null);
  // Sommeil NON renseigné (sleep vide) : jamais candidat (ne pénalise pas) ; courbatures 5 domine.
  assert.deepEqual(L.readinessLimiter({ fatigue: 1, soreness: 5 }), { factor: 'soreness', deficit: 30, value: 5 });
  // Marge insuffisante (< 6 pts) : courbatures 4 (22,5) vs fatigue 4 (22,5) → égalité → null.
  assert.equal(L.readinessLimiter({ sleep: 8, fatigue: 4, soreness: 4 }), null);
  // Entrée invalide → null.
  assert.equal(L.readinessLimiter(null), null);
});
test('readinessDriver : nomme le MOTEUR dominant de la forme (pendant positif du limiter)', () => {
  // Belle nuit (9 h → frac 1) domine fatigue 2 / courbatures 2 (frac 0,75) → sommeil moteur.
  assert.deepEqual(L.readinessDriver({ sleep: 9, fatigue: 2, soreness: 2 }), { factor: 'sleep', frac: 1, value: 9 });
  // Énergie au top (fatigue 1 → frac 1) domine sommeil 5 (0,625) / courbatures 3 (0,5) → fatigue moteur.
  assert.deepEqual(L.readinessDriver({ sleep: 5, fatigue: 1, soreness: 3 }), { factor: 'fatigue', frac: 1, value: 1 });
  // Muscles frais (courbatures 1 → frac 1) domine sommeil 5 / fatigue 3 → courbatures moteur.
  assert.deepEqual(L.readinessDriver({ sleep: 5, fatigue: 3, soreness: 1 }), { factor: 'soreness', frac: 1, value: 1 });
  // Deux forces à égalité (sommeil 8 ET fatigue 1, frac 1 chacune) → pas de moteur unique → null.
  assert.equal(L.readinessDriver({ sleep: 8, fatigue: 1, soreness: 3 }), null);
  // Tout au top à égalité (frac 1/1/1) → null.
  assert.equal(L.readinessDriver({ sleep: 8, fatigue: 1, soreness: 1 }), null);
  // Aucune force nette (top 0,625 < 0,75) → null.
  assert.equal(L.readinessDriver({ sleep: 5, fatigue: 3, soreness: 3 }), null);
  // Sommeil NON renseigné : jamais candidat ; fatigue 1 domine courbatures 3 → fatigue moteur.
  assert.deepEqual(L.readinessDriver({ fatigue: 1, soreness: 3 }), { factor: 'fatigue', frac: 1, value: 1 });
  // Marge insuffisante (< 0,2) : fatigue 1 (1) vs sommeil 7 h (0,875) → écart 0,125 → null.
  assert.equal(L.readinessDriver({ sleep: 7, fatigue: 1, soreness: 3 }), null);
  // Entrée invalide → null.
  assert.equal(L.readinessDriver(null), null);
});
test('readinessTrend : série de forme des derniers check-ins + delta', () => {
  const rec = [
    { date: '2026-07-06', sleep: 5, fatigue: 4, soreness: 4 }, // 40
    { date: '2026-07-08', sleep: 7, fatigue: 2, soreness: 3 }, // 73
    { date: '2026-07-10', sleep: 8, fatigue: 1, soreness: 1 }, // 100
  ];
  const rt = L.readinessTrend(rec, 8);
  assert.equal(rt.points.length, 3);
  assert.deepEqual(rt.points.map(p => p.score), [40, 73, 100]);
  assert.equal(rt.delta, 60, '100 - 40'); assert.equal(rt.direction, 'up');
  assert.equal(rt.latest, 100);
  // ordre chronologique forcé même si entrée dans le désordre
  assert.deepEqual(L.readinessTrend([rec[2], rec[0]], 8).points.map(p => p.date), ['2026-07-06', '2026-07-10']);
  assert.equal(L.readinessTrend([rec[0]], 8), null, '< 2 check-ins → null');
  assert.equal(L.readinessTrend([], 8), null);
  // date en double (import/restauration/legacy) → un seul POINT par jour, dernier gagné
  const dup = L.readinessTrend([
    { date: '2026-07-06', sleep: 5, fatigue: 4, soreness: 4 }, // 40
    { date: '2026-07-06', sleep: 8, fatigue: 1, soreness: 1 }, // 100 (dernier gagné)
    { date: '2026-07-10', sleep: 8, fatigue: 1, soreness: 1 }, // 100
  ], 8);
  assert.equal(dup.points.length, 2, 'deux jours distincts, pas trois saisies');
  assert.deepEqual(dup.points.map(p => p.score), [100, 100], 'dernier check-in du 06 gagne (100)');
  assert.equal(dup.delta, 0, 'delta = jours distincts (100 - 100), pas 100 - 40');
  assert.equal(dup.latest, 100);
  // la fenêtre slice(-lim) compte des JOURS, pas des saisies : 2 doublons + 2 jours, lim=2 → 2 jours
  const win = L.readinessTrend([
    { date: '2026-07-01', sleep: 8, fatigue: 1, soreness: 1 },
    { date: '2026-07-01', sleep: 8, fatigue: 1, soreness: 1 },
    { date: '2026-07-02', sleep: 5, fatigue: 4, soreness: 4 },
    { date: '2026-07-03', sleep: 8, fatigue: 1, soreness: 1 },
  ], 2);
  assert.deepEqual(win.points.map(p => p.date), ['2026-07-02', '2026-07-03'], 'lim=2 → 2 derniers jours');
});

test('morningEnergyTrend : moyenne d’énergie récente vs fenêtre précédente', () => {
  const today = '2026-07-14';
  // fenêtre récente (08→14) : 3, 3, 2 → moy 2,7 ; fenêtre précédente (01→07) : 4, 4 → moy 4
  const rituals = [
    { date: '2026-07-14', energy: 2 },
    { date: '2026-07-12', energy: 3 },
    { date: '2026-07-09', energy: 3 },
    { date: '2026-07-05', energy: 4 },
    { date: '2026-07-02', energy: 4 },
    { date: '2026-06-01', energy: 5 }, // hors des deux fenêtres
    { date: '2026-07-11', energy: 0 }, // énergie 0 → ignorée
  ];
  const t = L.morningEnergyTrend(rituals, today, 7);
  assert.equal(t.count, 3);
  assert.equal(t.avg, 2.7);      // (3+3+2)/3
  assert.equal(t.prevAvg, 4);    // (4+4)/2
  assert.equal(t.delta, -1.3);
  assert.equal(t.dir, 'down');
  assert.equal(t.level, 'low');  // < 3
  assert.equal(t.days, 7);
  // dédup par date (dernière valeur conservée)
  const dup = L.morningEnergyTrend([{ date: '2026-07-14', energy: 2 }, { date: '2026-07-14', energy: 5 }, { date: '2026-07-13', energy: 5 }], today, 7);
  assert.equal(dup.count, 2); assert.equal(dup.avg, 5);
  // pas de fenêtre précédente → delta 0, dir flat
  const noPrev = L.morningEnergyTrend([{ date: '2026-07-13', energy: 4 }, { date: '2026-07-14', energy: 4 }], today, 7);
  assert.equal(noPrev.prevAvg, null); assert.equal(noPrev.delta, 0); assert.equal(noPrev.dir, 'flat'); assert.equal(noPrev.level, 'high');
  // < 2 matins notés dans la fenêtre récente → null
  assert.equal(L.morningEnergyTrend([{ date: '2026-07-14', energy: 3 }], today, 7), null);
  assert.equal(L.morningEnergyTrend([], today, 7), null);
  assert.equal(L.morningEnergyTrend(rituals, 'pas-une-date', 7), null);
  // énergie qui remonte → dir 'up' + niveau 'ok' (branches jamais exercées) :
  // récente (08→14) 4,4,3 → 3,7 ; précédente (01→07) 3,3 → 3 ; delta +0,7 ≥ 0,3 → 'up' ; 3,7 ∈ [3,4[ → 'ok'
  const up = L.morningEnergyTrend([
    { date: '2026-07-14', energy: 4 }, { date: '2026-07-13', energy: 4 }, { date: '2026-07-12', energy: 3 },
    { date: '2026-07-05', energy: 3 }, { date: '2026-07-02', energy: 3 }], today, 7);
  assert.equal(up.avg, 3.7); assert.equal(up.prevAvg, 3); assert.equal(up.delta, 0.7);
  assert.equal(up.dir, 'up'); assert.equal(up.level, 'ok'); assert.equal(up.count, 3);
  // bornes exactes de dir : delta pile +0,3 → 'up', pile -0,3 → 'down', +0,2 → 'flat'
  const d03up = L.morningEnergyTrend([
    { date: '2026-07-14', energy: 4 }, { date: '2026-07-13', energy: 3 }, { date: '2026-07-12', energy: 3 },
    { date: '2026-07-05', energy: 3 }, { date: '2026-07-02', energy: 3 }], today, 7);
  assert.equal(d03up.delta, 0.3); assert.equal(d03up.dir, 'up');
  const d03dn = L.morningEnergyTrend([
    { date: '2026-07-14', energy: 3 }, { date: '2026-07-13', energy: 3 },
    { date: '2026-07-05', energy: 4 }, { date: '2026-07-04', energy: 3 }, { date: '2026-07-02', energy: 3 }], today, 7);
  assert.equal(d03dn.delta, -0.3); assert.equal(d03dn.dir, 'down');
  const d02 = L.morningEnergyTrend([
    { date: '2026-07-14', energy: 4 }, { date: '2026-07-13', energy: 3 }, { date: '2026-07-12', energy: 3 },
    { date: '2026-07-11', energy: 3 }, { date: '2026-07-10', energy: 3 },
    { date: '2026-07-05', energy: 3 }, { date: '2026-07-02', energy: 3 }], today, 7);
  assert.equal(d02.delta, 0.2); assert.equal(d02.dir, 'flat');
  // bornes exactes de level : avg pile 3 → 'ok', avg pile 4 → 'high'
  const okEdge = L.morningEnergyTrend([{ date: '2026-07-14', energy: 3 }, { date: '2026-07-13', energy: 3 }], today, 7);
  assert.equal(okEdge.avg, 3); assert.equal(okEdge.level, 'ok');
  const hiEdge = L.morningEnergyTrend([{ date: '2026-07-14', energy: 4 }, { date: '2026-07-13', energy: 4 }], today, 7);
  assert.equal(hiEdge.avg, 4); assert.equal(hiEdge.level, 'high');
  // fenêtre bornée : windowDays 100 → 60, 1 → 2 (clamp jamais testé)
  assert.equal(L.morningEnergyTrend([{ date: '2026-07-14', energy: 3 }, { date: '2026-07-13', energy: 3 }], today, 100).days, 60);
  assert.equal(L.morningEnergyTrend([{ date: '2026-07-14', energy: 3 }, { date: '2026-07-13', energy: 3 }], today, 1).days, 2);
});

test('morningStreak : check-ins consécutifs finissant aujourd’hui ou hier', () => {
  // 12, 13, 14 d'affilée, aujourd'hui = 14 → 3
  const r = [{ date: '2026-07-12' }, { date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-10' }];
  assert.equal(L.morningStreak(r, '2026-07-14'), 3);
  // aujourd'hui pas encore fait mais hier oui → la série tient (tolérance d'un jour)
  assert.equal(L.morningStreak(r, '2026-07-15'), 3);
  // ni aujourd'hui ni hier → 0
  assert.equal(L.morningStreak(r, '2026-07-16'), 0);
  // un seul jour (aujourd'hui) → 1
  assert.equal(L.morningStreak([{ date: '2026-07-14' }], '2026-07-14'), 1);
  // dédoublonnage par date
  assert.equal(L.morningStreak([{ date: '2026-07-14' }, { date: '2026-07-14' }, { date: '2026-07-13' }], '2026-07-14'), 2);
  // vide / date invalide → 0
  assert.equal(L.morningStreak([], '2026-07-14'), 0);
  assert.equal(L.morningStreak(r, 'nope'), 0);
});

test('sleepDebtHours : heures manquantes sous la cible, nuits renseignées', () => {
  const rec = [
    { date: '2026-07-06', sleep: 6 },   // -1.5
    { date: '2026-07-07', sleep: 8 },   // 0 (au-dessus)
    { date: '2026-07-08', sleep: 5.5 }, // -2
    { date: '2026-07-09', sleep: 0 },   // non renseigné → ignoré
    { date: '2026-06-01', sleep: 4 },   // hors fenêtre
  ];
  const r = L.sleepDebtHours(rec, 7.5, '2026-07-06', '2026-07-10');
  assert.equal(r.debt, 3.5, '1.5 + 2 (le 08 seulement sous cible avec le 06)');
  assert.equal(r.nights, 3, '06, 07 et 08 renseignées (09 = 0 ignoré)');
  assert.equal(r.avg, 6.5, 'moyenne (6+8+5.5)/3 = 6.5');
  assert.equal(r.target, 7.5);
  assert.equal(L.sleepDebtHours([], 7.5, '2026-07-06', '2026-07-10').debt, 0);
  assert.equal(L.sleepDebtHours('x', 7.5, '2026-07-06', '2026-07-10').nights, 0);
  // Deux check-ins de MÊME date : un « coucher seul » (sleep:0) plus tard dans le tableau ne doit PAS
  // écraser la vraie nuit du matin (symétrie avec weeklySleepStats/sleepSeries/sleepRegularity).
  const dup = L.sleepDebtHours(
    [{ date: '2026-07-06', sleep: 6 }, { date: '2026-07-06', sleep: 0, bedtime: '23:00' }],
    7.5, '2026-07-06', '2026-07-10');
  assert.equal(dup.nights, 1, 'la nuit chiffrée compte, le coucher-seul ne l’efface pas');
  assert.equal(dup.debt, 1.5, '7.5 - 6 = 1.5 (et non 0 par écrasement à sleep:0)');
  assert.equal(dup.avg, 6, 'moyenne = 6 (la vraie nuit), pas 0');
  // Ordre inverse (0 d’abord, vraie nuit ensuite) : même résultat, indépendant de l’ordre.
  const dup2 = L.sleepDebtHours(
    [{ date: '2026-07-06', sleep: 0, bedtime: '23:00' }, { date: '2026-07-06', sleep: 6 }],
    7.5, '2026-07-06', '2026-07-10');
  assert.equal(dup2.debt, 1.5);
  assert.equal(dup2.nights, 1);
});
test('weeklySleepStats : moyenne, nuits, plus courte nuit, statut', () => {
  const rec = [
    { date: '2026-07-06', sleep: 6 }, { date: '2026-07-07', sleep: 8 }, { date: '2026-07-08', sleep: 5.5 },
    { date: '2026-07-09', sleep: 0 },  // ignoré
    { date: '2026-06-01', sleep: 9 },  // hors fenêtre
  ];
  const r = L.weeklySleepStats(rec, '2026-07-06', '2026-07-10');
  assert.equal(r.nights, 3);
  assert.equal(r.avg, 6.5);      // (6+8+5.5)/3
  assert.equal(r.min, 5.5);
  assert.equal(r.status, 'court'); // < 7
  // sommeil correct → 'ok'
  assert.equal(L.weeklySleepStats([{ date: '2026-07-08', sleep: 7.5 }, { date: '2026-07-09', sleep: 8 }], '2026-07-06', '2026-07-10').status, 'ok');
  // bon sommeil → 'bon'
  assert.equal(L.weeklySleepStats([{ date: '2026-07-08', sleep: 9 }], '2026-07-06', '2026-07-10').status, 'bon');
  // aucune nuit chiffrée → null
  assert.equal(L.weeklySleepStats([{ date: '2026-07-08', sleep: 0 }], '2026-07-06', '2026-07-10'), null);
  assert.equal(L.weeklySleepStats([], '2026-07-06', '2026-07-10'), null);
  assert.equal(L.weeklySleepStats(null, '2026-07-06', '2026-07-10'), null);
});

test('sleepSeries : nuits chiffrées récentes, triées, plafonnées, une/jour', () => {
  const rec = [
    { date: '2026-07-06', sleep: 6 }, { date: '2026-07-07', sleep: 8 },
    { date: '2026-07-08', sleep: 5.5 }, { date: '2026-07-09', sleep: 0 }, // 0 ignoré
    { date: '2026-07-05', sleep: 7 },
    { date: '2026-07-07', sleep: 7.5 } // même date → dernier gagne
  ];
  const s = L.sleepSeries(rec, 10);
  assert.deepEqual(s.map(p => p.date), ['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08'], 'trié, sans doublon, 0 exclu');
  assert.equal(s[2].value, 7.5, 'dernier check-in du 07 conservé');
  // plafonné aux N dernières nuits
  assert.equal(L.sleepSeries(rec, 2).length, 2);
  assert.deepEqual(L.sleepSeries(rec, 2).map(p => p.date), ['2026-07-07', '2026-07-08']);
  // rien / dates invalides → []
  assert.deepEqual(L.sleepSeries([], 10), []);
  assert.deepEqual(L.sleepSeries([{ date: 'x', sleep: 7 }], 10), []);
});

test('sleepRegularity : écart-type des nuits, irrégularité détectée', () => {
  assert.equal(L.sleepRegularity([{ date: '2026-07-08', sleep: 6 }], 14), null, 'moins de 3 nuits → null');
  const stable = [{ date: '2026-07-06', sleep: 6 }, { date: '2026-07-07', sleep: 6 }, { date: '2026-07-08', sleep: 6 }, { date: '2026-07-09', sleep: 6 }];
  const rs = L.sleepRegularity(stable, 14);
  assert.equal(rs.nights, 4);
  assert.equal(rs.avg, 6);
  assert.equal(rs.stdev, 0, 'nuits identiques → écart-type nul');
  const jagged = [
    { date: '2026-07-04', sleep: 5 }, { date: '2026-07-05', sleep: 8 }, { date: '2026-07-06', sleep: 5 },
    { date: '2026-07-07', sleep: 8 }, { date: '2026-07-08', sleep: 5 }, { date: '2026-07-09', sleep: 8 }, { date: '2026-07-10', sleep: 5 },
  ];
  const rj = L.sleepRegularity(jagged, 14);
  assert.equal(rj.stdev, 1.5, 'alternance 5/8 h → forte variabilité');
  assert.equal(L.sleepRegularity(jagged, 3).nights, 3, 'plafonné aux N dernières nuits');
  assert.equal(L.sleepRegularity([], 14), null);
  assert.equal(L.sleepRegularity([{ date: 'x', sleep: 7 }, { date: 'y', sleep: 7 }], 14), null, 'dates invalides ignorées');
});

test('bedtimeRegularity : écart-type (min) des heures de coucher, pas de la durée', () => {
  assert.equal(L.bedtimeRegularity([{ date: '2026-07-08', bedtime: '23:00' }], 14), null, 'moins de 3 nuits → null');
  const stable = [{ date: '2026-07-06', bedtime: '23:00' }, { date: '2026-07-07', bedtime: '23:00' }, { date: '2026-07-08', bedtime: '23:00' }];
  const rs = L.bedtimeRegularity(stable, 14);
  assert.equal(rs.nights, 3);
  assert.equal(rs.avgTime, '23:00');
  assert.equal(rs.stdevMin, 0, 'coucher identique chaque soir → écart-type nul');
  const jagged = [
    { date: '2026-07-04', bedtime: '22:00' }, { date: '2026-07-05', bedtime: '01:00' }, { date: '2026-07-06', bedtime: '22:00' },
    { date: '2026-07-07', bedtime: '01:00' }, { date: '2026-07-08', bedtime: '22:00' }, { date: '2026-07-09', bedtime: '01:00' }, { date: '2026-07-10', bedtime: '22:00' },
  ];
  const rj = L.bedtimeRegularity(jagged, 14);
  assert.equal(rj.avgTime, '23:17');
  assert.equal(rj.stdevMin, 89, 'coucher qui alterne 22h/1h → forte variabilité');
  assert.equal(L.bedtimeRegularity([], 14), null);
  assert.equal(L.bedtimeRegularity([{ date: '2026-07-08', sleep: 6 }, { date: '2026-07-09', sleep: 6 }, { date: '2026-07-10', sleep: 6 }], 14), null, 'sans heure de coucher saisie → null');
});

test('sleepCoachInsight : bilan qualité + régularité (1re étape du coach sommeil)', () => {
  const jagged = [
    { date: '2026-07-04', sleep: 5 }, { date: '2026-07-05', sleep: 8 }, { date: '2026-07-06', sleep: 5 },
    { date: '2026-07-07', sleep: 8 }, { date: '2026-07-08', sleep: 5 }, { date: '2026-07-09', sleep: 8 }, { date: '2026-07-10', sleep: 5 },
  ];
  const urgent = L.sleepCoachInsight(jagged, '2026-07-10');
  assert.equal(urgent.avg, 6.3);
  assert.equal(urgent.nights, 7);
  assert.equal(urgent.debt, 10);
  assert.equal(urgent.stdev, 1.5);
  assert.equal(urgent.irregular, true);
  assert.equal(urgent.tone, 'urgent');
  assert.match(urgent.verdict, /court et irrégulier/);

  const stableShort = [
    { date: '2026-07-04', sleep: 6 }, { date: '2026-07-05', sleep: 6 }, { date: '2026-07-06', sleep: 6 }, { date: '2026-07-07', sleep: 6 },
    { date: '2026-07-08', sleep: 6 }, { date: '2026-07-09', sleep: 6 }, { date: '2026-07-10', sleep: 6 },
  ];
  const attn1 = L.sleepCoachInsight(stableShort, '2026-07-10');
  assert.equal(attn1.tone, 'attention');
  assert.equal(attn1.irregular, false);
  assert.match(attn1.verdict, /Sommeil court/);

  const jaggedOk = [
    { date: '2026-07-04', sleep: 6.5 }, { date: '2026-07-05', sleep: 9.5 }, { date: '2026-07-06', sleep: 6.5 },
    { date: '2026-07-07', sleep: 9.5 }, { date: '2026-07-08', sleep: 6.5 }, { date: '2026-07-09', sleep: 9.5 }, { date: '2026-07-10', sleep: 6.5 },
  ];
  const attn2 = L.sleepCoachInsight(jaggedOk, '2026-07-10');
  assert.equal(attn2.tone, 'attention');
  assert.equal(attn2.irregular, true);
  assert.match(attn2.verdict, /rythme irrégulier/);

  const stableOk = [
    { date: '2026-07-04', sleep: 8 }, { date: '2026-07-05', sleep: 8 }, { date: '2026-07-06', sleep: 8 }, { date: '2026-07-07', sleep: 8 },
    { date: '2026-07-08', sleep: 8 }, { date: '2026-07-09', sleep: 8 }, { date: '2026-07-10', sleep: 8 },
  ];
  const ok = L.sleepCoachInsight(stableOk, '2026-07-10');
  assert.equal(ok.tone, 'ok');
  assert.match(ok.verdict, /Sommeil solide/);

  assert.equal(L.sleepCoachInsight([], '2026-07-10'), null, 'aucune nuit sur 7 j → null');
  assert.equal(L.sleepCoachInsight(jagged, 'invalide'), null);
});

test('sleepCoachInsight : la régularité du COUCHER prime sur celle de la durée dès 3 nuits saisies', () => {
  // Même durées jour/nuit que le cas "urgent" ci-dessus (5/8 h en alternance), mais coucher fixe
  // chaque soir : le vrai problème n'est QUE la durée courte, pas un rythme décousu — le coucher
  // stable désamorce le tone 'urgent' (qui, avant ce correctif, se basait uniquement sur la durée).
  const stableBedtimeShortSleep = [
    { date: '2026-07-04', sleep: 5, bedtime: '23:00' }, { date: '2026-07-05', sleep: 8, bedtime: '23:00' }, { date: '2026-07-06', sleep: 5, bedtime: '23:00' },
    { date: '2026-07-07', sleep: 8, bedtime: '23:00' }, { date: '2026-07-08', sleep: 5, bedtime: '23:00' }, { date: '2026-07-09', sleep: 8, bedtime: '23:00' }, { date: '2026-07-10', sleep: 5, bedtime: '23:00' },
  ];
  const r1 = L.sleepCoachInsight(stableBedtimeShortSleep, '2026-07-10');
  assert.equal(r1.bedtimeStdevMin, 0);
  assert.equal(r1.irregular, false, 'coucher stable → plus jugé irrégulier même si la durée varie');
  assert.equal(r1.tone, 'attention', 'court mais pas irrégulier → attention, pas urgent');
  assert.match(r1.verdict, /Sommeil court/);
  assert.doesNotMatch(r1.verdict, /irrégulier/);

  // Durée stable et suffisante (8 h chaque nuit) mais coucher qui saute d'une heure à l'autre : le
  // vrai problème circadien est là, invisible pour l'ancienne logique basée sur la durée seule.
  const stableDurationJaggedBedtime = [
    { date: '2026-07-04', sleep: 8, bedtime: '22:00' }, { date: '2026-07-05', sleep: 8, bedtime: '02:00' }, { date: '2026-07-06', sleep: 8, bedtime: '23:30' }, { date: '2026-07-07', sleep: 8, bedtime: '01:00' },
    { date: '2026-07-08', sleep: 8, bedtime: '22:30' }, { date: '2026-07-09', sleep: 8, bedtime: '00:30' }, { date: '2026-07-10', sleep: 8, bedtime: '23:00' },
  ];
  const r2 = L.sleepCoachInsight(stableDurationJaggedBedtime, '2026-07-10');
  assert.equal(r2.stdev, 0, 'durée parfaitement stable');
  assert.equal(r2.bedtimeStdevMin, 80);
  assert.equal(r2.irregular, true, 'coucher irrégulier détecté malgré une durée stable');
  assert.equal(r2.tone, 'attention');
  assert.match(r2.verdict, /coucher irrégulier/);
});

test('sleepDurationTrend : compare la durée récente à la semaine précédente', () => {
  const today = '2026-07-14';
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const iso = off => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  // Fenêtre récente (0-6 j) ≈ 7 h ; précédente (7-13 j) ≈ 6 h → pente MONTANTE de +1 h.
  const up = [];
  for (let i = 0; i < 7; i++) up.push({ date: iso(i), sleep: 7 });
  for (let i = 7; i < 14; i++) up.push({ date: iso(i), sleep: 6 });
  const tu = L.sleepDurationTrend(up, today, 7);
  assert.equal(tu.avg, 7); assert.equal(tu.prevAvg, 6); assert.equal(tu.delta, 1); assert.equal(tu.dir, 'up'); assert.equal(tu.count, 7);
  // Pente DESCENDANTE : récente 5,5 h, précédente 7 h → -1,5 h.
  const down = [];
  for (let i = 0; i < 7; i++) down.push({ date: iso(i), sleep: 5.5 });
  for (let i = 7; i < 14; i++) down.push({ date: iso(i), sleep: 7 });
  const td = L.sleepDurationTrend(down, today, 7);
  assert.equal(td.delta, -1.5); assert.equal(td.dir, 'down');
  // Stable (0,2 h d'écart, sous le seuil ±0,4) → 'flat'.
  const flat = [];
  for (let i = 0; i < 7; i++) flat.push({ date: iso(i), sleep: 7.2 });
  for (let i = 7; i < 14; i++) flat.push({ date: iso(i), sleep: 7 });
  assert.equal(L.sleepDurationTrend(flat, today, 7).dir, 'flat');
  // Pas de semaine précédente → prevAvg null, delta 0, dir 'flat'.
  const soloWeek = [];
  for (let i = 0; i < 4; i++) soloWeek.push({ date: iso(i), sleep: 6 });
  const ts = L.sleepDurationTrend(soloWeek, today, 7);
  assert.equal(ts.prevAvg, null); assert.equal(ts.delta, 0); assert.equal(ts.dir, 'flat');
  // Moins de 2 nuits récentes chiffrées → null ; nuits sleep:0 ignorées ; date invalide → null.
  assert.equal(L.sleepDurationTrend([{ date: iso(0), sleep: 6 }], today, 7), null);
  assert.equal(L.sleepDurationTrend([{ date: iso(0), sleep: 0 }, { date: iso(1), sleep: 0 }], today, 7), null);
  assert.equal(L.sleepDurationTrend(up, 'nope', 7), null);
});

test('bedtimeRegularityTrend : compare la dispersion du coucher récente à la semaine précédente', () => {
  const today = '2026-07-14';
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const iso = off => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  // Coucher qui SE DISPERSE : récente éparpillée (22:00 / 02:00 en alternance), précédente serrée (23:30).
  const disp = [];
  for (let i = 0; i < 7; i++) disp.push({ date: iso(i), bedtime: i % 2 ? '02:00' : '22:00' });
  for (let i = 7; i < 14; i++) disp.push({ date: iso(i), bedtime: '23:30' });
  const td = L.bedtimeRegularityTrend(disp, today, 7);
  assert.equal(td.prevStdevMin, 0, 'semaine précédente parfaitement régulière');
  assert.ok(td.stdevMin >= 60, 'semaine récente très dispersée');
  assert.ok(td.delta >= 15 && td.dir === 'dispersing', 'écart-type qui grimpe → dispersing');
  assert.equal(td.recentNights, 7); assert.equal(td.prevNights, 7);
  // Coucher qui SE RESSERRE : l'inverse exact → tightening, delta négatif.
  const tight = [];
  for (let i = 0; i < 7; i++) tight.push({ date: iso(i), bedtime: '23:30' });
  for (let i = 7; i < 14; i++) tight.push({ date: iso(i), bedtime: i % 2 ? '02:00' : '22:00' });
  const tt = L.bedtimeRegularityTrend(tight, today, 7);
  assert.ok(tt.delta <= -15 && tt.dir === 'tightening', 'écart-type qui baisse → tightening');
  // Stable (même dispersion modérée les deux semaines) → 'flat'.
  const flat = [];
  for (let i = 0; i < 14; i++) flat.push({ date: iso(i), bedtime: i % 2 ? '23:15' : '22:45' });
  assert.equal(L.bedtimeRegularityTrend(flat, today, 7).dir, 'flat');
  // Moins de 3 couchers dans une fenêtre → null ; couchers absents ignorés ; date invalide → null.
  const sparse = [{ date: iso(0), bedtime: '23:00' }, { date: iso(1), bedtime: '23:00' }];
  for (let i = 7; i < 14; i++) sparse.push({ date: iso(i), bedtime: '23:00' });
  assert.equal(L.bedtimeRegularityTrend(sparse, today, 7), null, 'récente < 3 couchers → null');
  assert.equal(L.bedtimeRegularityTrend(disp, 'nope', 7), null);
});

test('focusMinutesTrend : compare le volume de focus récent à la semaine précédente', () => {
  const today = '2026-07-14';
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const iso = off => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  // Fenêtre récente (0-6 j) 4×60 = 240 min ; précédente (7-13 j) 2×20 = 40 min → pente MONTANTE de +200 min.
  const up = [{ date: iso(0), minutes: 60 }, { date: iso(1), minutes: 60 }, { date: iso(2), minutes: 60 }, { date: iso(3), minutes: 60 }, { date: iso(7), minutes: 20 }, { date: iso(9), minutes: 20 }];
  const tu = L.focusMinutesTrend(up, today, 7);
  assert.equal(tu.recent, 240); assert.equal(tu.prev, 40); assert.equal(tu.delta, 200); assert.equal(tu.dir, 'up'); assert.equal(tu.count, 4);
  // Pente DESCENDANTE : récente 60 min, précédente 300 min → -240 min.
  const down = [{ date: iso(0), minutes: 30 }, { date: iso(2), minutes: 30 }, { date: iso(7), minutes: 60 }, { date: iso(8), minutes: 60 }, { date: iso(9), minutes: 60 }, { date: iso(10), minutes: 60 }, { date: iso(11), minutes: 60 }];
  const td = L.focusMinutesTrend(down, today, 7);
  assert.equal(td.delta, -240); assert.equal(td.dir, 'down');
  // Plusieurs sessions le même jour se CUMULENT (temps total réel).
  const same = [{ date: iso(0), minutes: 25 }, { date: iso(0), minutes: 25 }, { date: iso(7), minutes: 10 }];
  assert.equal(L.focusMinutesTrend(same, today, 7).recent, 50);
  // Stable (20 min d'écart, sous le seuil ±30) → 'flat'.
  const flat = [{ date: iso(0), minutes: 60 }, { date: iso(1), minutes: 20 }, { date: iso(7), minutes: 60 }];
  assert.equal(L.focusMinutesTrend(flat, today, 7).dir, 'flat');
  // Pas de semaine précédente → prev null, delta 0, dir 'flat'.
  const solo = [{ date: iso(0), minutes: 30 }, { date: iso(2), minutes: 30 }];
  const ts = L.focusMinutesTrend(solo, today, 7);
  assert.equal(ts.prev, null); assert.equal(ts.delta, 0); assert.equal(ts.dir, 'flat');
  // Aucun jour de focus récent → null ; minutes ≤ 0 ignorées ; date invalide → null.
  assert.equal(L.focusMinutesTrend([{ date: iso(8), minutes: 60 }], today, 7), null);
  assert.equal(L.focusMinutesTrend([{ date: iso(0), minutes: 0 }], today, 7), null);
  assert.equal(L.focusMinutesTrend(up, 'nope', 7), null);
});

test('proteinAdherenceTrend : compare les jours à la cible protéines récents à la semaine précédente', () => {
  const today = '2026-07-14';
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const iso = off => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const tgt = 150;
  // Récente (0-6 j) : 5 jours à la cible ; précédente (7-13 j) : 2 jours → pente MONTANTE de +3 jours.
  const up = [
    { date: iso(0), protein: 160 }, { date: iso(1), protein: 160 }, { date: iso(2), protein: 160 }, { date: iso(3), protein: 160 }, { date: iso(4), protein: 160 },
    { date: iso(8), protein: 160 }, { date: iso(9), protein: 160 } ];
  const tu = L.proteinAdherenceTrend(up, tgt, today, 7);
  assert.equal(tu.recent, 5); assert.equal(tu.prev, 2); assert.equal(tu.delta, 3); assert.equal(tu.dir, 'up'); assert.equal(tu.count, 5);
  // Pente DESCENDANTE : récente 2 jours, précédente 6 jours → -4.
  const down = [
    { date: iso(0), protein: 160 }, { date: iso(1), protein: 160 },
    { date: iso(7), protein: 160 }, { date: iso(8), protein: 160 }, { date: iso(9), protein: 160 }, { date: iso(10), protein: 160 }, { date: iso(11), protein: 160 }, { date: iso(12), protein: 160 } ];
  const td = L.proteinAdherenceTrend(down, tgt, today, 7);
  assert.equal(td.delta, -4); assert.equal(td.dir, 'down');
  // Jours SOUS la cible non comptés ; agrégation au MAX par date (2 entrées le même jour).
  const maxDay = [{ date: iso(0), protein: 100 }, { date: iso(0), protein: 160 }, { date: iso(7), protein: 200 }];
  const tm = L.proteinAdherenceTrend(maxDay, tgt, today, 7);
  assert.equal(tm.recent, 1); assert.equal(tm.prev, 1);
  // Écart 1 jour (sous le seuil ±2) → 'flat'.
  const flat = [{ date: iso(0), protein: 160 }, { date: iso(1), protein: 160 }, { date: iso(7), protein: 160 }];
  assert.equal(L.proteinAdherenceTrend(flat, tgt, today, 7).dir, 'flat');
  // Pas de jour saisi la semaine précédente → prev null, delta 0, dir 'flat'.
  const solo = [{ date: iso(0), protein: 160 }, { date: iso(2), protein: 50 }];
  const ts = L.proteinAdherenceTrend(solo, tgt, today, 7);
  assert.equal(ts.prev, null); assert.equal(ts.delta, 0); assert.equal(ts.dir, 'flat'); assert.equal(ts.recent, 1);
  // Aucun jour nutrition récent saisi → null ; cible 0 → null ; date invalide → null.
  assert.equal(L.proteinAdherenceTrend([{ date: iso(8), protein: 160 }], tgt, today, 7), null);
  assert.equal(L.proteinAdherenceTrend(up, 0, today, 7), null);
  assert.equal(L.proteinAdherenceTrend(up, tgt, 'nope', 7), null);
});

test('hydrationAdherenceTrend : même moule que les protéines, sur le champ eau (verres/jour)', () => {
  const today = '2026-07-14';
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const iso = off => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const goal = 8;
  // Récente (0-6 j) : 5 jours à 8 verres ; précédente (7-13 j) : 2 → pente MONTANTE +3.
  const up = [
    { date: iso(0), water: 8 }, { date: iso(1), water: 9 }, { date: iso(2), water: 8 }, { date: iso(3), water: 8 }, { date: iso(4), water: 8 },
    { date: iso(8), water: 8 }, { date: iso(9), water: 8 } ];
  const tu = L.hydrationAdherenceTrend(up, goal, today, 7);
  assert.equal(tu.recent, 5); assert.equal(tu.prev, 2); assert.equal(tu.delta, 3); assert.equal(tu.dir, 'up');
  // Pente DESCENDANTE : récente 2, précédente 6 → -4.
  const down = [
    { date: iso(0), water: 8 }, { date: iso(1), water: 8 },
    { date: iso(7), water: 8 }, { date: iso(8), water: 8 }, { date: iso(9), water: 8 }, { date: iso(10), water: 8 }, { date: iso(11), water: 8 }, { date: iso(12), water: 8 } ];
  assert.equal(L.hydrationAdherenceTrend(down, goal, today, 7).delta, -4);
  // Jours SOUS la cible non comptés ; agrégation au MAX par date (deux gorgées le même jour).
  const maxDay = [{ date: iso(0), water: 5 }, { date: iso(0), water: 8 }, { date: iso(7), water: 9 }];
  const tm = L.hydrationAdherenceTrend(maxDay, goal, today, 7);
  assert.equal(tm.recent, 1); assert.equal(tm.prev, 1);
  // Pas de jour saisi la semaine précédente → prev null, delta 0, dir 'flat'.
  const solo = [{ date: iso(0), water: 8 }, { date: iso(2), water: 3 }];
  const ts = L.hydrationAdherenceTrend(solo, goal, today, 7);
  assert.equal(ts.prev, null); assert.equal(ts.dir, 'flat'); assert.equal(ts.recent, 1);
  // Aucun jour récent → null ; cible 0 → null ; date invalide → null.
  assert.equal(L.hydrationAdherenceTrend([{ date: iso(8), water: 8 }], goal, today, 7), null);
  assert.equal(L.hydrationAdherenceTrend(up, 0, today, 7), null);
  assert.equal(L.hydrationAdherenceTrend(up, goal, 'nope', 7), null);
  // fieldAdherenceTrend générique sans champ → null (garde-fou).
  assert.equal(L.fieldAdherenceTrend(up, '', goal, today, 7), null);
});

test('adaptiveCoachFocus : nuance le focus par la pente de son volume', () => {
  // Pilier focus À CORRIGER (jours récents < précédents) + minutes en RECUL → note « minutes de focus reculent ».
  const down = { focusSessions: [
    { date: '2026-07-03', minutes: 60 }, { date: '2026-07-04', minutes: 60 }, { date: '2026-07-05', minutes: 60 }, { date: '2026-07-06', minutes: 60 }, { date: '2026-07-07', minutes: 60 },
    { date: '2026-07-10', minutes: 30 }, { date: '2026-07-12', minutes: 30 } ] };
  const fDown = L.adaptiveCoachFocus(down, '2026-07-16');
  assert.equal(fDown.pillar, 'focus');
  assert.ok(fDown.focusTrend < 0, 'focusTrend négatif');
  assert.match(fDown.insight, /minutes de focus reculent/);
  // Pilier focus EN RENFORT (jours récents ≥ précédents) + minutes en HAUSSE → note « le volume grimpe ».
  const up = { focusSessions: [
    { date: '2026-07-03', minutes: 20 }, { date: '2026-07-05', minutes: 20 },
    { date: '2026-07-11', minutes: 60 }, { date: '2026-07-12', minutes: 60 }, { date: '2026-07-13', minutes: 60 }, { date: '2026-07-14', minutes: 60 } ] };
  const fUp = L.adaptiveCoachFocus(up, '2026-07-16');
  assert.equal(fUp.pillar, 'focus');
  assert.ok(fUp.focusTrend > 0, 'focusTrend positif');
  assert.match(fUp.insight, /le volume grimpe/);
  assert.doesNotMatch(fUp.insight, /reculent/);
  // Hors pilier focus → focusTrend null (sport seul actif).
  const sport = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-10' }, { date: '2026-07-12' }] }, '2026-07-16');
  assert.equal(sport.focusTrend, null);
});

test('adaptiveCoachFocus : surveille la chaîne d’une habitude à risque (habitAtRisk)', () => {
  const wk = [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }];
  // Habitude prévue ce jour (aucun weekday = tous les jours), série de 3 (13-14-15), pas cochée le 16 → à risque.
  const at = L.adaptiveCoachFocus({ workouts: wk, habits: [{ id: 1, name: 'Lecture', log: ['2026-07-13', '2026-07-14', '2026-07-15'] }] }, '2026-07-16');
  assert.ok(at.habitAtRisk, 'habitAtRisk renseigné');
  assert.equal(at.habitAtRisk.name, 'Lecture');
  assert.equal(at.habitAtRisk.streak, 3);
  assert.match(at.insight, /Ne casse pas la chaîne/);
  assert.match(at.insight, /ton habitude « Lecture » tient depuis 3 jours/);
  // Cochée aujourd'hui → plus à risque → null, pas de note.
  const done = L.adaptiveCoachFocus({ workouts: wk, habits: [{ id: 1, name: 'Lecture', log: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'] }] }, '2026-07-16');
  assert.equal(done.habitAtRisk, null);
  assert.doesNotMatch(done.insight, /Ne casse pas la chaîne/);
  // Série trop courte (2 < seuil 3) → ignorée.
  const short = L.adaptiveCoachFocus({ workouts: wk, habits: [{ id: 1, name: 'Eau', log: ['2026-07-14', '2026-07-15'] }] }, '2026-07-16');
  assert.equal(short.habitAtRisk, null);
  // Plusieurs habitudes à risque → la plus longue série nommée + signalement du reste.
  const many = L.adaptiveCoachFocus({ workouts: wk, habits: [
    { id: 1, name: 'Lecture', log: ['2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15'] },
    { id: 2, name: 'Méditation', log: ['2026-07-13', '2026-07-14', '2026-07-15'] } ] }, '2026-07-16');
  assert.equal(many.habitAtRisk.name, 'Lecture');
  assert.equal(many.habitAtRisk.streak, 5);
  assert.match(many.insight, /\(\+1 autre à cocher\)/);
  // Aucune habitude → champ null, aucune note (rétrocompat).
  const none = L.adaptiveCoachFocus({ workouts: wk }, '2026-07-16');
  assert.equal(none.habitAtRisk, null);
});

test('adaptiveCoachFocus : célèbre un palier de série d’habitude franchi (habitMilestone)', () => {
  const wk = [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }];
  // Habitude cochée AUJOURD'HUI (16), série tombant pile sur 3 (14-15-16) → palier franchi.
  const hit = L.adaptiveCoachFocus({ workouts: wk, habits: [{ id: 1, name: 'Lecture', log: ['2026-07-14', '2026-07-15', '2026-07-16'] }] }, '2026-07-16');
  assert.ok(hit.habitMilestone, 'habitMilestone renseigné');
  assert.equal(hit.habitMilestone.name, 'Lecture');
  assert.equal(hit.habitMilestone.streak, 3);
  assert.match(hit.insight, /Chaîne au sommet/);
  assert.match(hit.insight, /atteint 3 jours consécutifs aujourd/);
  // Série de 4 (13→16) : 4 n'est PAS un palier → null, pas de note.
  const between = L.adaptiveCoachFocus({ workouts: wk, habits: [{ id: 1, name: 'Lecture', log: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'] }] }, '2026-07-16');
  assert.equal(between.habitMilestone, null);
  assert.doesNotMatch(between.insight, /Chaîne au sommet/);
  // Palier d'une SEMAINE (7, 10→16) → libellé nommé.
  const week = L.adaptiveCoachFocus({ workouts: wk, habits: [{ id: 1, name: 'Sport', log: ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'] }] }, '2026-07-16');
  assert.equal(week.habitMilestone.streak, 7);
  assert.match(week.insight, /une semaine complète \(7 jours consécutifs\)/);
  // Habitude PAS cochée aujourd'hui (série 3 finissant hier) → habitMilestone muet (c'est habitAtRisk qui parle).
  const notDone = L.adaptiveCoachFocus({ workouts: wk, habits: [{ id: 1, name: 'Lecture', log: ['2026-07-13', '2026-07-14', '2026-07-15'] }] }, '2026-07-16');
  assert.equal(notDone.habitMilestone, null);
  // Deux habitudes au palier le même jour → on nomme la PLUS haute série (7 > 3).
  const many = L.adaptiveCoachFocus({ workouts: wk, habits: [
    { id: 1, name: 'Méditation', log: ['2026-07-14', '2026-07-15', '2026-07-16'] },
    { id: 2, name: 'Sport', log: ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'] } ] }, '2026-07-16');
  assert.equal(many.habitMilestone.name, 'Sport');
  assert.equal(many.habitMilestone.streak, 7);
  // Aucune habitude → champ null (rétrocompat).
  const none = L.adaptiveCoachFocus({ workouts: wk }, '2026-07-16');
  assert.equal(none.habitMilestone, null);
});

test('adaptiveCoachFocus : croise entraînement actif × bien-être lapsé (mobilityTrainGuard)', () => {
  // Entraînement actif ces jours-ci (11-13-15 → recentDays 3) → pilier sport, séance pas faite le 16.
  const wk = [{ date: '2026-07-11' }, { date: '2026-07-13' }, { date: '2026-07-15' }];
  // Bien-être LAPSÉ : dernière routine le 07-10 → 6 j sans mobilité (≥ 4) → note récup.
  const lapsed = L.adaptiveCoachFocus({ workouts: wk, wellnessDone: [{ date: '2026-07-10', key: 'mobilite-dos' }] }, '2026-07-16');
  assert.equal(lapsed.pillar, 'sport');
  assert.equal(lapsed.mobilityTrainGuard, 6);
  assert.equal(lapsed.sleepTrainGuard, null);
  assert.equal(lapsed.hydrationTrainGuard, null);
  assert.match(lapsed.insight, /Un dernier levier, côté récupération : ça fait 6 jours sans routine mobilité/);
  assert.match(lapsed.insight, /tissus et articulations encaissent la charge/);
  // Bien-être frais (routine hier → 1 j < 4) → pas de note.
  const fresh = L.adaptiveCoachFocus({ workouts: wk, wellnessDone: [{ date: '2026-07-15', key: 'mobilite-dos' }] }, '2026-07-16');
  assert.equal(fresh.mobilityTrainGuard, null);
  assert.doesNotMatch(fresh.insight, /côté récupération/);
  // Jamais touché au bien-être (liste vide) → muet, on ne tanne pas un débutant du pilier.
  const never = L.adaptiveCoachFocus({ workouts: wk }, '2026-07-16');
  assert.equal(never.mobilityTrainGuard, null);
  assert.doesNotMatch(never.insight, /sans routine mobilité/);
  // Séance déjà faite aujourd'hui → doneToday → pas de note récup.
  const doneToday = L.adaptiveCoachFocus({ workouts: [...wk, { date: '2026-07-16' }], wellnessDone: [{ date: '2026-07-10', key: 'mobilite-dos' }] }, '2026-07-16');
  assert.equal(doneToday.mobilityTrainGuard, null);
  // Sommeil court (sleepTrainGuard prime) → mobilité en relais, muette ce jour-là. Sport reste le pilier
  // choisi (5 jours actifs > 3 nuits courtes), le sommeil n'est pas en alerte (régulier) donc non forcé.
  const wkBusy = ['11', '12', '13', '14', '15'].map(d => ({ date: '2026-07-' + d }));
  const recov = ['13', '14', '15'].map(d => ({ date: '2026-07-' + d, sleep: 6 }));
  const sleepFirst = L.adaptiveCoachFocus({ workouts: wkBusy, recovery: recov, wellnessDone: [{ date: '2026-07-10', key: 'mobilite-dos' }] }, '2026-07-16');
  assert.equal(sleepFirst.pillar, 'sport');
  assert.ok(sleepFirst.sleepTrainGuard != null, 'le sommeil court prime');
  assert.equal(sleepFirst.mobilityTrainGuard, null);
});

test('adaptiveCoachFocus : croise entraînement actif × protéines chroniquement basses (proteinTrainGuard)', () => {
  // Sport en décrochage MAIS actif (prev 4 j : 03-05-07-09 ; recent 2 j : 11-15 → recentDays 2, tier rebuild)
  // → pilier sport CHOISI malgré la nutrition présente (fix prioritaire), séance pas faite le 16.
  const wk = ['2026-07-03', '2026-07-05', '2026-07-07', '2026-07-09', '2026-07-11', '2026-07-15'].map(d => ({ date: d }));
  const profile = { weight: 75, goal: 'muscle' }; // proteinTarget → 135 g/j
  // Protéines chroniquement sous la cible : 90 g sur 4 jours renseignés (0/4 à la cible < moitié) → note matériau.
  const low = ['11', '12', '14', '15'].map(d => ({ date: `2026-07-${d}`, protein: 90 }));
  const short = L.adaptiveCoachFocus({ workouts: wk, profile, nutrition: low }, '2026-07-16');
  assert.equal(short.pillar, 'sport');
  assert.equal(short.proteinTrainGuard, 0);
  assert.equal(short.sleepTrainGuard, null);
  assert.equal(short.hydrationTrainGuard, null);
  assert.equal(short.mobilityTrainGuard, null);
  assert.match(short.insight, /Et pense au matériau de tes gains : sur tes 4 derniers jours renseignés, tu n’atteins ta cible protéines \(135 g\) que 0\/4/);
  assert.match(short.insight, /l’entraînement ne fait que casser le muscle/);
  assert.match(short.insight, /reconstruire plus fort/);
  // Aucune collision avec les autres notes du relais sport.
  assert.doesNotMatch(short.insight, /socle invisible|carburant qu’on oublie|côté récupération/);
  // Protéines à la cible (140 ≥ 135) → 4/4 → champ null, note absente.
  const ok = L.adaptiveCoachFocus({ workouts: wk, profile, nutrition: low.map(n => ({ ...n, protein: 140 })) }, '2026-07-16');
  assert.equal(ok.proteinTrainGuard, null);
  assert.doesNotMatch(ok.insight, /matériau de tes gains/);
  // Exactement la moitié à la cible (2/4) → PAS chronique → null (seuil honnête : moins de la moitié).
  const half = L.adaptiveCoachFocus({ workouts: wk, profile, nutrition: [
    { date: '2026-07-11', protein: 90 }, { date: '2026-07-12', protein: 90 },
    { date: '2026-07-14', protein: 140 }, { date: '2026-07-15', protein: 140 } ] }, '2026-07-16');
  assert.equal(half.proteinTrainGuard, null);
  // Moins de 3 jours renseignés → données insuffisantes → null.
  const thin = L.adaptiveCoachFocus({ workouts: wk, profile, nutrition: [
    { date: '2026-07-15', protein: 90 }, { date: '2026-07-14', protein: 80 } ] }, '2026-07-16');
  assert.equal(thin.proteinTrainGuard, null);
  // Aucun profil → cible inconnue → null (rétrocompat).
  const noProfile = L.adaptiveCoachFocus({ workouts: wk, nutrition: low }, '2026-07-16');
  assert.equal(noProfile.proteinTrainGuard, null);
  // Séance déjà faite aujourd’hui → doneToday → pas de note.
  const done = L.adaptiveCoachFocus({ workouts: [...wk, { date: '2026-07-16' }], profile, nutrition: low }, '2026-07-16');
  assert.equal(done.proteinTrainGuard, null);
  // Sommeil court (sleepTrainGuard prime) → protéine en relais, muette ce jour-là.
  const wkBusy = ['11', '12', '13', '14', '15'].map(d => ({ date: '2026-07-' + d }));
  const recov = ['13', '14', '15'].map(d => ({ date: '2026-07-' + d, sleep: 6 }));
  const sleepFirst = L.adaptiveCoachFocus({ workouts: wkBusy, profile, recovery: recov, nutrition: low }, '2026-07-16');
  assert.equal(sleepFirst.pillar, 'sport');
  assert.ok(sleepFirst.sleepTrainGuard != null, 'le sommeil court prime');
  assert.equal(sleepFirst.proteinTrainGuard, null);
  // Mobilité lapsée (mobilityTrainGuard prime) → protéine en relais, muette.
  const mobFirst = L.adaptiveCoachFocus({ workouts: wk, profile, nutrition: low, wellnessDone: [{ date: '2026-07-10', key: 'mobilite-dos' }] }, '2026-07-16');
  assert.equal(mobFirst.pillar, 'sport');
  assert.ok(mobFirst.mobilityTrainGuard != null, 'la mobilité lapsée prime');
  assert.equal(mobFirst.proteinTrainGuard, null);
});

test('sleepImpactReport : prouve l’effet du coucher sur le lendemain', () => {
  const today = '2026-07-30';
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const iso = off => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const recovery = [], morningRituals = [], focusSessions = [];
  // 5 nuits couché tôt (22:30) → lendemain énergie 4 / 60 min de focus ; 5 nuits tard (01:00) → 2 / 15 min.
  for (let i = 0; i < 5; i++) { const d = iso(i * 2); recovery.push({ date: d, sleep: 7, bedtime: '22:30' }); morningRituals.push({ date: d, energy: 4 }); focusSessions.push({ date: d, minutes: 60 }); }
  for (let i = 0; i < 5; i++) { const d = iso(i * 2 + 1); recovery.push({ date: d, sleep: 6, bedtime: '01:00' }); morningRituals.push({ date: d, energy: 2 }); focusSessions.push({ date: d, minutes: 15 }); }
  const r = L.sleepImpactReport({ recovery, morningRituals, focusSessions }, today);
  assert.equal(r.nights, 10);
  assert.equal(r.early.energy, 4); assert.equal(r.late.energy, 2);
  assert.equal(r.deltas.energy, 2); assert.equal(r.deltas.focusMin, 45);
  assert.equal(r.confidence, 'good');
  assert.match(r.verdict, /Se coucher tôt paie/);
  // < 4 nuits chiffrées avec coucher → null (pas assez pour conclure)
  assert.equal(L.sleepImpactReport({ recovery: recovery.slice(0, 3), morningRituals, focusSessions }, today), null);
  // aucun contraste (tous couchés à la même heure) → un seul paquet → null
  const flat = []; for (let i = 0; i < 6; i++) flat.push({ date: iso(i), sleep: 7, bedtime: '23:00' });
  assert.equal(L.sleepImpactReport({ recovery: flat }, today), null);
  // nuits sans heure de coucher → null (rien à corréler)
  assert.equal(L.sleepImpactReport({ recovery: [0, 1, 2, 3].map(i => ({ date: iso(i), sleep: 7 })) }, today), null);
  // confiance 'low' si un paquet a < 4 nuits
  const few = [{ date: iso(0), sleep: 7, bedtime: '22:00' }, { date: iso(1), sleep: 7, bedtime: '22:30' }, { date: iso(2), sleep: 6, bedtime: '01:00' }, { date: iso(3), sleep: 6, bedtime: '01:30' }];
  const rf = L.sleepImpactReport({ recovery: few, morningRituals: few.map(f => ({ date: f.date, energy: 3 })) }, today);
  assert.equal(rf.confidence, 'low');
});

test('bedtimeAnchor : minutes depuis midi, coucher soir→matin monotone croissant', () => {
  assert.equal(L.bedtimeAnchor('12:00'), 0);
  assert.equal(L.bedtimeAnchor('20:00'), 480);
  assert.equal(L.bedtimeAnchor('23:30'), 690);
  assert.equal(L.bedtimeAnchor('00:00'), 720);
  assert.equal(L.bedtimeAnchor('06:00'), 1080);
  // 6 h du matin est bien « plus tard » (ancre plus grande) que 23 h — c'est tout l'intérêt
  assert.ok(L.bedtimeAnchor('06:00') > L.bedtimeAnchor('23:00'));
  assert.equal(L.bedtimeAnchor(''), null);
  assert.equal(L.bedtimeAnchor('25:00'), null);
  assert.equal(L.bedtimeAnchor(null), null);
});

test('bedtimeFromAnchor : inverse exact de bedtimeAnchor', () => {
  ['23:30', '06:00', '00:00', '20:15', '12:00'].forEach(t => {
    assert.equal(L.bedtimeFromAnchor(L.bedtimeAnchor(t)), t);
  });
  assert.equal(L.bedtimeFromAnchor(1080), '06:00');
  assert.equal(L.bedtimeFromAnchor(-1), '11:59', 'valeur négative normalisée');
  assert.equal(L.bedtimeFromAnchor(1440), '12:00', 'plafond modulo 1440');
});

test('recentBedtimeAnchor : médiane des couchers récents, résiste à une nuit isolée', () => {
  const rec = [
    { date: '2026-07-06', sleep: 6, bedtime: '05:00' },
    { date: '2026-07-07', sleep: 6, bedtime: '05:30' },
    { date: '2026-07-08', sleep: 6, bedtime: '06:00' },
    { date: '2026-07-09', sleep: 7 },                    // sans heure → ignorée
    { date: '2026-07-10', sleep: 6, bedtime: '05:15' },
  ];
  const r = L.recentBedtimeAnchor(rec, '2026-07-10', 5);
  assert.equal(r.nights, 4);
  assert.equal(r.time, '05:23', 'médiane de 05:00/05:15/05:30/06:00');
  // médiane robuste : une seule nuit décalée (12:00) ne tire pas tout le point d'ancrage
  const withOutlier = rec.concat([{ date: '2026-07-11', sleep: 2, bedtime: '12:00' }]);
  assert.equal(L.recentBedtimeAnchor(withOutlier, '2026-07-11', 5).time, '05:15');
  assert.equal(L.recentBedtimeAnchor([], '2026-07-10', 5), null, 'aucune heure → null');
  assert.equal(L.recentBedtimeAnchor([{ date: '2026-07-06', sleep: 6 }], '2026-07-10', 5), null);
  // n'utilise pas les nuits postérieures à todayKey
  assert.equal(L.recentBedtimeAnchor(rec, '2026-07-07', 5).nights, 2);
});

test('dateAfterDays : décalage en jours, gère les mois et le négatif', () => {
  assert.equal(L.dateAfterDays('2026-07-16', 16), '2026-08-01');
  assert.equal(L.dateAfterDays('2026-07-16', 0), '2026-07-16');
  assert.equal(L.dateAfterDays('2026-07-16', -1), '2026-07-15');
  assert.equal(L.dateAfterDays('2026-12-31', 1), '2027-01-01');
  assert.equal(L.dateAfterDays('invalide', 3), null);
});

test('normalizeSleepPlan : bornes et activation seulement si objectif + départ + date', () => {
  const p = L.normalizeSleepPlan({ active: true, targetTime: '23:30', startTime: '6:00', startKey: '2026-07-16', stepMin: 200, stepDays: 9 });
  assert.equal(p.active, true);
  assert.equal(p.startTime, '06:00', 'heure normalisée en HH:MM');
  assert.equal(p.stepMin, 60, 'plafonné à 60');
  assert.equal(p.stepDays, 3, 'plafonné à 3');
  assert.equal(L.normalizeSleepPlan({ active: true, targetTime: '23:30' }).active, false, 'sans départ → inactif');
  assert.equal(L.normalizeSleepPlan(null).active, false);
  assert.equal(L.normalizeSleepPlan('x').stepMin, 25, 'défaut 25 min');
});

test('startSleepPlan : ancre sur le coucher réel récent, refuse sans données', () => {
  const rec = [{ date: '2026-07-15', sleep: 6, bedtime: '06:00' }];
  const plan = L.startSleepPlan(rec, '23:30', '2026-07-16', {});
  assert.equal(plan.active, true);
  assert.equal(plan.startTime, '06:00');
  assert.equal(plan.targetTime, '23:30');
  assert.equal(plan.startKey, '2026-07-16');
  assert.equal(L.startSleepPlan([], '23:30', '2026-07-16', {}), null, 'aucune heure saisie → null');
  assert.equal(L.startSleepPlan(rec, 'invalide', '2026-07-16', {}), null);
  // startTime explicite prime sur la médiane
  assert.equal(L.startSleepPlan(rec, '23:30', '2026-07-16', { startTime: '04:00' }).startTime, '04:00');
});

test('sleepPlanDay : cible du jour, décalage progressif, adaptation aux écarts, arrivée honnête', () => {
  const plan = { active: true, targetTime: '23:30', startTime: '06:00', startKey: '2026-07-16', stepMin: 25, stepDays: 1 };
  assert.equal(L.sleepPlanDay({ active: false }, [], '2026-07-16'), null, 'plan inactif → null');

  // Jour 0, aucune donnée : cible = départ, arrivée estimée dans 16 pas
  const d0 = L.sleepPlanDay(plan, [], '2026-07-16');
  assert.equal(d0.targetTime, '06:00');
  assert.equal(d0.progress, 0);
  assert.equal(d0.daysLeft, 16);
  assert.equal(d0.arrivalKey, '2026-08-01');
  assert.equal(d0.status, 'on');

  // Jour 4, en retard (couche toujours 05:30 alors que l'idéal serait ~04:20) : le plan se relâche,
  // ne demande qu'un pas depuis la réalité (05:05), et l'arrivée recule
  const behind = [{ date: '2026-07-18', sleep: 6, bedtime: '05:30' }, { date: '2026-07-19', sleep: 6, bedtime: '05:30' }, { date: '2026-07-20', sleep: 6, bedtime: '05:30' }];
  const d4 = L.sleepPlanDay(plan, behind, '2026-07-20');
  assert.equal(d4.targetTime, '05:05', 'un seul pas depuis le coucher réel');
  assert.equal(d4.adapted, true);
  assert.equal(d4.status, 'behind');
  assert.equal(d4.arrivalKey, '2026-08-04', 'arrivée repoussée honnêtement');

  // Jour 4, en avance (déjà à 02:00) : on ne le brusque pas, cible = planification idéale, statut ahead
  const ahead = [{ date: '2026-07-20', sleep: 7, bedtime: '02:00' }];
  const da = L.sleepPlanDay(plan, ahead, '2026-07-20');
  assert.equal(da.status, 'ahead');
  assert.equal(da.adapted, false);
  assert.ok(da.progress > 50);

  // Objectif atteint : couche à 23:20 (≤ objectif) → reached, progression 100, 0 jour restant
  const done = L.sleepPlanDay(plan, [{ date: '2026-07-30', sleep: 8, bedtime: '23:20' }], '2026-07-30');
  assert.equal(done.reached, true);
  assert.equal(done.progress, 100);
  assert.equal(done.daysLeft, 0);

  // Atteint DANS la marge de tolérance : couche à 23:40, soit 10 min APRÈS l'objectif 23:30
  // (dans les ±15 min). `reached` fait autorité → aucun verdict contradictoire : la progression,
  // les pas restants et l'arrivée s'alignent tous sur « atteint » (avant correctif : reached=true
  // mais progress=97, stepsLeft=1, daysLeft=1, arrivée dans le futur → « 🎉 atteint » ET « dans 1 jour »).
  const near = L.sleepPlanDay(plan, [{ date: '2026-07-30', sleep: 8, bedtime: '23:40' }], '2026-07-30');
  assert.equal(near.reached, true);
  assert.equal(near.progress, 100, 'atteint dans la marge → barre pleine, pas 97 %');
  assert.equal(near.stepsLeft, 0);
  assert.equal(near.daysLeft, 0, 'atteint → 0 jour restant, pas d’arrivée dans le futur');
  assert.equal(near.arrivalKey, '2026-07-30', 'arrivée = aujourd’hui quand atteint');

  // Plan DÉGÉNÉRÉ (départ déjà ≤ objectif) + coucher réel encore APRÈS l'objectif : la barre ne doit
  // PLUS mentir. Avant correctif, le raccourci « totalShift ≤ 0 → 100 » affichait progress=100 alors
  // que reached=false et daysLeft>0 (barre pleine ET « pas atteint » ET « arrivée dans N jours »).
  const degen = { active: true, targetTime: '23:30', startTime: '23:12', startKey: '2026-07-21', stepMin: 25, stepDays: 1 };
  const dd = L.sleepPlanDay(degen, [{ date: '2026-07-21', sleep: 6, bedtime: '23:56' }], '2026-07-21');
  assert.equal(dd.reached, false, 'coucher 23:56 > objectif 23:30 → pas atteint');
  assert.ok(dd.daysLeft > 0, 'encore des jours avant l’objectif');
  assert.ok(dd.progress < 100, 'plan dégénéré non atteint → barre non pleine (plus de verdict contradictoire)');
  // Le même plan dégénéré, mais coucher réel DANS l'objectif : atteint, barre pleine, cohérent.
  const degenOk = L.sleepPlanDay(degen, [{ date: '2026-07-21', sleep: 7, bedtime: '23:20' }], '2026-07-21');
  assert.equal(degenOk.reached, true);
  assert.equal(degenOk.progress, 100);
  assert.equal(degenOk.daysLeft, 0);
});

test('sleepEveningTips : conseils du soir calés sur le coucher visé', () => {
  const tips = L.sleepEveningTips('23:30');
  assert.equal(tips.length, 5);
  assert.deepEqual(tips.map(t => t.key), ['caffeine', 'meal', 'screens', 'winddown', 'light']);
  assert.match(tips[0].text, /15:30/, 'caféine coupée 8 h avant');
  assert.match(tips[1].text, /20:30/, 'dîner 3 h avant');
  assert.match(tips[2].text, /22:00/, 'écrans 1 h30 avant');
  // franchit minuit sans casser : cible 00:30 → café à 16:30
  assert.match(L.sleepEveningTips('00:30')[0].text, /16:30/);
  assert.equal(L.sleepEveningTips('nope').length, 0);
  assert.equal(L.sleepEveningTips('').length, 0);
});

test('sleepPlanAdherence : nuits dans le plan (± marge) + série', () => {
  const plan = { active: true, targetTime: '23:30', startTime: '06:00', startKey: '2026-07-16', stepMin: 25, stepDays: 1 };
  const rec = [
    { date: '2026-07-16', sleep: 6, bedtime: '06:00' }, // idéal 06:00 → tenu
    { date: '2026-07-17', sleep: 6, bedtime: '05:30' }, // idéal 05:35 → tenu
    { date: '2026-07-18', sleep: 6, bedtime: '05:40' }, // idéal 05:10, +30 marge = 05:40 → tenu
  ];
  const a = L.sleepPlanAdherence(plan, rec, '2026-07-18', 7);
  assert.equal(a.nights, 3);
  assert.equal(a.met, 3);
  assert.equal(a.rate, 100);
  assert.equal(a.streak, 3);
  // une nuit franchement en retard casse la série
  const rec2 = rec.concat([{ date: '2026-07-19', sleep: 5, bedtime: '07:30' }]);
  const a2 = L.sleepPlanAdherence(plan, rec2, '2026-07-19', 7);
  assert.equal(a2.met, 3);
  assert.equal(a2.streak, 0, 'dernière nuit hors plan → série nulle');
  assert.equal(L.sleepPlanAdherence({ active: false }, rec, '2026-07-18', 7), null);
  assert.deepEqual(L.sleepPlanAdherence(plan, [], '2026-07-18', 7), { nights: 0, met: 0, rate: 0, streak: 0 });
});

test('sleepBedtimeReward : XP pour un coucher dans le plan, une fois/jour', () => {
  const plan = { active: true, targetTime: '23:30', startTime: '06:00', startKey: '2026-07-16', stepMin: 25, stepDays: 1, lastReward: '' };
  const rec = [{ date: '2026-07-16', sleep: 6, bedtime: '06:00' }, { date: '2026-07-17', sleep: 6, bedtime: '05:30' }, { date: '2026-07-18', sleep: 6, bedtime: '05:40' }];
  const r = L.sleepBedtimeReward(plan, rec, '2026-07-18', '05:00');
  assert.ok(r && r.xp === 15 && r.reachedGoal === false, 'cible du jour tenue → +15 XP');
  assert.equal(L.sleepBedtimeReward(plan, rec, '2026-07-18', '07:00'), null, 'trop tard → pas d’XP');
  // objectif final atteint → bonus 25
  const rg = L.sleepBedtimeReward(plan, [{ date: '2026-07-30', sleep: 8, bedtime: '23:20' }], '2026-07-30', '23:15');
  assert.ok(rg && rg.xp === 25 && rg.reachedGoal === true);
  // déjà récompensé aujourd'hui → null
  assert.equal(L.sleepBedtimeReward({ ...plan, lastReward: '2026-07-18' }, rec, '2026-07-18', '05:00'), null);
  assert.equal(L.sleepBedtimeReward({ active: false }, rec, '2026-07-18', '05:00'), null);
  assert.equal(L.sleepBedtimeReward(plan, rec, '2026-07-18', 'nope'), null);
});

test('daysHittingTarget : jours ≥ cible pour un champ (eau)', () => {
  const nut = [
    { date: '2026-07-06', water: 8 },  // ok
    { date: '2026-07-07', water: 5 },  // sous cible
    { date: '2026-07-08', water: 4 }, { date: '2026-07-08', water: 9 }, // max 9 → ok
    { date: '2026-06-01', water: 10 }, // hors fenêtre
  ];
  assert.equal(L.daysHittingTarget(nut, 'water', 8, '2026-07-06', '2026-07-10'), 2, '06 et 08');
  assert.equal(L.daysHittingTarget(nut, 'water', 0, '2026-07-06', '2026-07-10'), 0);
  assert.equal(L.daysHittingTarget([], 'water', 8, '2026-07-06', '2026-07-10'), 0);
});

test('proteinDaysOnTarget : jours ≥ cible dans la fenêtre, agrégé par date', () => {
  const nut = [
    { date: '2026-07-06', protein: 160 }, // ok
    { date: '2026-07-07', protein: 90 },  // sous cible
    { date: '2026-07-08', protein: 100 }, { date: '2026-07-08', protein: 60 }, // même jour → max 100, sous cible
    { date: '2026-07-09', protein: 130 }, // ok
    { date: '2026-06-01', protein: 200 }, // hors fenêtre
  ];
  assert.equal(L.proteinDaysOnTarget(nut, 130, '2026-07-06', '2026-07-10'), 2, '06 et 09 juillet');
  assert.equal(L.proteinDaysOnTarget(nut, 0, '2026-07-06', '2026-07-10'), 0, 'cible nulle → 0');
  assert.equal(L.proteinDaysOnTarget([], 130, '2026-07-06', '2026-07-10'), 0);
  assert.equal(L.proteinDaysOnTarget('x', 130, '2026-07-06', '2026-07-10'), 0);
});

test('waterGoalFor : +2 verres les jours de séance, borné [1..20]', () => {
  assert.equal(L.waterGoalFor(8, false), 8);
  assert.equal(L.waterGoalFor(8, true), 10);
  assert.equal(L.waterGoalFor(undefined, false), 8, 'défaut 8');
  assert.equal(L.waterGoalFor(19, true), 20, 'plafonné à 20');
  assert.equal(L.waterGoalFor(0, false), 8, 'base 0/invalide → repli défaut 8');
  assert.equal(L.waterGoalFor(25, false), 20, 'base excessive plafonnée à 20');
});

test('waterStatus : verres, litres, %, objectif', () => {
  const s = L.waterStatus({ '2026-07-10': 4 }, '2026-07-10', 8);
  assert.equal(s.count, 4); assert.equal(s.goal, 8); assert.equal(s.liters, 1); assert.equal(s.pct, 50); assert.equal(s.done, false);
  const full = L.waterStatus({ '2026-07-10': 8 }, '2026-07-10', 8);
  assert.ok(full.done && full.pct === 100, 'objectif atteint');
  assert.equal(L.waterStatus({}, '2026-07-10', 8).count, 0, 'aucun jour → 0');
  assert.equal(L.waterStatus({ '2026-07-10': 99 }, '2026-07-10', 8).pct, 100, '% plafonné');
});
test('hydrationPace : rythme d’hydratation dans la journée', () => {
  // Objectif 8, fenêtre 8h→22h (14h). À 15h (mi-journée), attendu ≈ 4 verres.
  assert.equal(L.hydrationPace(4, 8, 15).expected, 4);
  assert.equal(L.hydrationPace(4, 8, 15).status, 'ontrack', 'pile sur le rythme');
  assert.equal(L.hydrationPace(5, 8, 15).status, 'ontrack', 'en avance = ontrack');
  const behind = L.hydrationPace(1, 8, 15);
  assert.equal(behind.status, 'behind');
  assert.match(behind.nudge, /retard/i);
  assert.equal(behind.remaining, 7);
  // objectif atteint → done quelle que soit l’heure (dans la fenêtre)
  assert.equal(L.hydrationPace(8, 8, 12).status, 'done');
  assert.equal(L.hydrationPace(9, 8, 12).status, 'done');
  // début de journée : attendu 0 → jamais en retard
  assert.equal(L.hydrationPace(0, 8, 8).expected, 0);
  assert.equal(L.hydrationPace(0, 8, 8).status, 'ontrack');
  // fin de journée : attendu = objectif complet
  assert.equal(L.hydrationPace(3, 8, 21).expected, 7);
  // hors fenêtre (trop tôt / trop tard) → null (pas de pression avant le coucher)
  assert.equal(L.hydrationPace(2, 8, 7), null);
  assert.equal(L.hydrationPace(2, 8, 22), null);
  assert.equal(L.hydrationPace(2, 8, 23), null);
  assert.equal(L.hydrationPace(2, 8, 'x'), null, 'heure invalide → null');
});
test('buildTrainingWeek : mode « même jour » attache les runs aux jours de muscu', () => {
  const p = L.buildTrainingWeek(['arms', 'legs'], 3, 2, true);
  assert.equal(p.sameDay, true);
  assert.equal(p.sessions, 3, '3 jours (= jours de muscu)');
  const totalRuns = p.days.reduce((n, d) => n + (d.runs ? d.runs.length : 0), 0);
  assert.equal(totalRuns, 2, 'les 2 runs sont attachés à des jours de muscu');
  assert.ok(p.days.every(d => d.exercises && d.exercises.length), 'chaque jour garde sa muscu');
  assert.ok(p.days[p.days.length - 1].runs.some(r => r.long), 'sortie longue le dernier jour');
});
test('travelModes : voiture = durée OSRM, vélo/marche depuis la distance', () => {
  const m = L.travelModes(20000, 1200); // 20 km, 20 min voiture
  assert.equal(m.distanceKm, 20, 'distance en km arrondie');
  assert.equal(m.driving, 20, 'voiture = 1200 s → 20 min');
  assert.equal(m.cycling, 80, 'vélo 15 km/h → 80 min');
  assert.equal(m.walking, 240, 'marche 5 km/h → 240 min');
  const z = L.travelModes(0, 0);
  assert.equal(z.driving, 0, 'distance nulle → 0');
  const noDrive = L.travelModes(50000, 0); // repli voiture 50 km/h
  assert.equal(noDrive.driving, 60, 'sans durée OSRM → 50 km à 50 km/h = 60 min');
  // Cas limites (couverture) :
  // borne basse : dès qu'il y a une distance, vélo/marche valent au moins 1 min
  const tiny = L.travelModes(200, 0); // 0,2 km
  assert.equal(tiny.distanceKm, 0.2, 'distance arrondie au dixième');
  assert.equal(tiny.cycling, 1, 'très courte distance → vélo plancher à 1 min');
  assert.equal(tiny.walking, 2, 'marche 0,2 km ≈ 2,4 min → 2 min');
  assert.equal(tiny.driving, 1, 'repli voiture plancher à 1 min sur courte distance');
  // arrondi de distanceKm au dixième
  assert.equal(L.travelModes(12340, 600).distanceKm, 12.3, '12 340 m → 12,3 km');
  // distance négative ramenée à 0 → modes distance nuls
  const neg = L.travelModes(-500, 0);
  assert.equal(neg.distanceKm, 0, 'distance négative → 0');
  assert.equal(neg.cycling, 0, 'distance négative → vélo 0');
  assert.equal(neg.walking, 0, 'distance négative → marche 0');
  // entrées non numériques → tout à 0
  const junk = L.travelModes('x', 'y');
  assert.deepEqual(junk, { distanceKm: 0, driving: 0, cycling: 0, walking: 0 }, 'entrées invalides → 0 partout');
});

test('scheduleConflicts : chevauchements réels seulement', () => {
  const agenda = [
    { id: 'a', title: 'Muscu',   kind: 'sport',  date: '2026-07-20', time: '18:00', durationMin: 60 },
    { id: 'b', title: 'Révision', kind: 'study', date: '2026-07-20', time: '19:00', durationMin: 45 },
    { id: 'c', title: 'Off',      kind: 'sport', date: '2026-07-21', time: '18:00', durationMin: 60 },
    { id: 'd', title: 'Journée',  kind: 'other', date: '2026-07-20', allDay: true },
    { id: 'e', title: 'Sans heure', kind: 'other', date: '2026-07-20' },
  ];
  // chevauchement franc (18:30 tombe dans 18:00–19:00)
  const c1 = L.scheduleConflicts(agenda, { date: '2026-07-20', time: '18:30', durationMin: 30 });
  assert.deepEqual(c1.map(x => x.id), ['a']);

  // contact bord à bord : 19:00 démarre quand Muscu finit → PAS un conflit
  const c2 = L.scheduleConflicts(agenda, { date: '2026-07-20', time: '19:00', durationMin: 30 });
  assert.deepEqual(c2.map(x => x.id), ['b'], 'seule la révision de 19:00 chevauche, pas la muscu qui se termine');

  // englobe les deux
  const c3 = L.scheduleConflicts(agenda, { date: '2026-07-20', time: '17:30', durationMin: 180 });
  assert.deepEqual(c3.map(x => x.id), ['a', 'b'], 'triés par heure');

  // autre jour, allDay et sans heure ne bloquent rien
  assert.deepEqual(L.scheduleConflicts(agenda, { date: '2026-07-22', time: '18:00', durationMin: 60 }), []);

  // on ne se compare jamais à soi-même (édition d'un item existant)
  assert.deepEqual(L.scheduleConflicts(agenda, { id: 'a', date: '2026-07-20', time: '18:00', durationMin: 60 }), []);

  // candidat sans heure : rien à comparer
  assert.deepEqual(L.scheduleConflicts(agenda, { date: '2026-07-20', durationMin: 60 }), []);
});

test('timeToMinutes / minutesToTime : aller-retour et rejets', () => {
  assert.equal(L.timeToMinutes('07:05'), 425);
  assert.equal(L.timeToMinutes('00:00'), 0);
  assert.equal(L.timeToMinutes('24:00'), null, 'heure hors plage rejetée');
  assert.equal(L.timeToMinutes('7h05'), null);
  assert.equal(L.timeToMinutes(''), null);
  assert.equal(L.minutesToTime(425), '07:05');
  assert.equal(L.minutesToTime(0), '00:00');
});

test('nextFreeSlot : premier créneau qui accueille la durée', () => {
  const agenda = [
    { id: 'a', title: 'Muscu', date: '2026-07-20', time: '18:00', durationMin: 60 },
    { id: 'b', title: 'Révision', date: '2026-07-20', time: '19:30', durationMin: 30 },
    { id: 'j', title: 'Journée', date: '2026-07-20', allDay: true },
  ];
  // 18:30 est pris → on tombe à la fin de Muscu (19:00), qui tient 30 min avant Révision (19:30)
  assert.equal(L.nextFreeSlot(agenda, { date: '2026-07-20', after: '18:30', durationMin: 30 }), '19:00');
  // même départ mais durée 45 : 19:00–19:45 chevauche Révision → pousse à 20:00
  assert.equal(L.nextFreeSlot(agenda, { date: '2026-07-20', after: '18:30', durationMin: 45 }), '20:00');
  // contact bord à bord autorisé : 19:00 juste après Muscu n'est pas bloqué
  assert.equal(L.nextFreeSlot(agenda, { date: '2026-07-20', after: '19:00', durationMin: 30 }), '19:00');
  // créneau déjà libre : renvoie l'heure demandée telle quelle
  assert.equal(L.nextFreeSlot(agenda, { date: '2026-07-20', after: '07:00', durationMin: 60 }), '07:00');
  // rien ne rentre avant la fin de journée
  assert.equal(L.nextFreeSlot(agenda, { date: '2026-07-20', after: '21:40', durationMin: 60, dayEnd: '22:00' }), null);
  // on peut s'exclure soi-même (édition d'un créneau existant)
  assert.equal(L.nextFreeSlot(agenda, { date: '2026-07-20', after: '18:00', durationMin: 60, excludeId: 'a' }), '18:00');
  // entrées invalides
  assert.equal(L.nextFreeSlot(agenda, { date: 'nope', after: '18:00', durationMin: 30 }), null);
  assert.equal(L.nextFreeSlot(agenda, { date: '2026-07-20', after: '', durationMin: 30 }), null);
});

test('pruneProgramSessionsFrom : purge le programme à venir, garde histoire et manuel', () => {
  // NB : les vraies séances de programme ont source:'manual' (recodée par normalizeAgendaItem) mais
  // un refId préfixé « objprog- » — c'est LUI qui les identifie, pas la source.
  const agenda = [
    { id: 1, title: 'Ancienne muscu passée', source: 'manual', refId: 'objprog-muscu-haut-1-2026-07-06', date: '2026-07-06', completed: true },
    { id: 2, title: 'Ancienne muscu faite', source: 'manual', refId: 'objprog-muscu-haut-1-2026-07-20', date: '2026-07-20', completed: true },
    { id: 3, title: 'Ancienne muscu à venir', source: 'manual', refId: 'objprog-muscu-haut-1-2026-07-20', date: '2026-07-20', completed: false },
    { id: 4, title: 'Ancienne course à venir', source: 'manual', refId: 'objprog-course-tempo-3-2026-07-27', date: '2026-07-27', completed: false },
    { id: 5, title: 'RDV perso (VRAI manuel, sans refId)', source: 'manual', date: '2026-07-27', completed: false },
    { id: 6, title: 'Séance cette semaine', source: 'manual', refId: 'objprog-muscu-haut-1-2026-07-16', date: '2026-07-16', completed: false },
  ];
  // nouveau programme démarre le lundi 2026-07-20
  const r = L.pruneProgramSessionsFrom(agenda, '2026-07-20');
  const ids = r.agenda.map(a => a.id).sort((a, b) => a - b);
  // retirés : #3 et #4 (refId objprog, à venir, non faits, >= 20/07). #5 (VRAI manuel) NE DOIT PAS partir.
  assert.deepEqual(ids, [1, 2, 5, 6], 'garde passé, coché, VRAI manuel et cette semaine');
  assert.equal(r.removed, 2);
  // un item source:'objprog' brut (si AGENDA_SOURCES l'accepte un jour) est aussi reconnu
  assert.equal(L.pruneProgramSessionsFrom([{ id: 9, source: 'objprog', date: '2026-07-21', completed: false }], '2026-07-20').removed, 1);
  // pas de date de départ valide → ne touche à rien
  assert.equal(L.pruneProgramSessionsFrom(agenda, '').removed, 0);
  assert.equal(L.pruneProgramSessionsFrom(agenda, 'nope').agenda.length, agenda.length);
  // agenda vide / non tableau
  assert.deepEqual(L.pruneProgramSessionsFrom(null, '2026-07-20'), { agenda: [], removed: 0 });
});

test('upcomingSessions : fusionne plans + séances de programme, sans doublon', () => {
  const plans = [
    { id: 1, date: '2026-07-20', time: '18:00', type: 'Musculation' },
    { id: 2, date: '2026-07-10', time: '18:00', type: 'Passée' },          // avant aujourd'hui → exclu
    { id: 3, date: '2026-07-22', time: '09:00', type: 'Auto', auto: true, completed: true }, // fait → exclu
  ];
  const agenda = [
    { id: 10, kind: 'sport', date: '2026-07-21', time: '18:00', title: '🏋️ Haut · S1 · 45 min', workout: ['Développé'], completed: false },
    { id: 11, kind: 'sport', date: '2026-07-23', time: '07:30', title: '🏃 Tempo · 40 min', completed: false },
    { id: 12, kind: 'sport', date: '2026-07-24', time: '18:00', title: 'Liée à un plan', planId: 99, completed: false }, // planId → exclu (doublon)
    { id: 13, kind: 'life',  date: '2026-07-21', time: '12:00', title: 'RDV', completed: false },  // pas sport → exclu
    { id: 14, kind: 'sport', date: '2026-07-25', allDay: true, title: 'Journée sport', completed: false }, // allDay → exclu
    { id: 15, kind: 'sport', date: '2026-07-19', time: '18:00', title: 'Programme passé', completed: false }, // avant aujourd'hui → exclu
  ];
  const r = L.upcomingSessions(plans, agenda, '2026-07-20');
  assert.deepEqual(r.map(s => s.id), [1, 10, 11], 'plan du 20, agenda du 21 puis 23, triés; exclus: passés/faits/planId/life/allDay');
  assert.equal(r[0].origin, 'plan');
  assert.equal(r[1].origin, 'agenda');
  assert.deepEqual(r[1].workout, ['Développé']);
  assert.equal(r[0].daysLeft, 0);
  assert.equal(r[1].daysLeft, 1);
  // nowMinutes : une séance du jour déjà passée est écartée (pour « prochaine séance »)
  const today = [
    { id: 20, date: '2026-07-20', time: '08:00', type: 'Tôt' },
    { id: 21, date: '2026-07-20', time: '20:00', type: 'Tard' },
  ];
  const next = L.upcomingSessions(today, [], '2026-07-20', { nowMinutes: 12 * 60, limit: 1 });
  assert.deepEqual(next.map(s => s.id), [21], '08:00 est passée à midi, 20:00 est la prochaine');
  // todayKey invalide → []
  assert.deepEqual(L.upcomingSessions(plans, agenda, 'nope'), []);
  // limit
  assert.equal(L.upcomingSessions(plans, agenda, '2026-07-20', { limit: 1 }).length, 1);
});

test('showsEnduranceBase : « Base d’endurance » seulement pour un profil endurance', () => {
  // profil force / muscle → masqué
  assert.equal(L.showsEnduranceBase({ goal: 'force', fitnessObjective: 'muscle' }), false);
  assert.equal(L.showsEnduranceBase({ goal: 'recomposition', fitnessObjective: 'seche' }), false);
  assert.equal(L.showsEnduranceBase({ goal: 'recomposition', fitnessObjective: 'athletique' }), false, 'athletique par défaut ne suffit pas');
  // objectif profil trail → affiché
  assert.equal(L.showsEnduranceBase({ goal: 'trail', fitnessObjective: 'muscle' }), true);
  // objectif sportif endurance → affiché
  assert.equal(L.showsEnduranceBase({ goal: 'force', fitnessObjective: 'endurance' }), true);
  // une course programmée → affiché quel que soit l’objectif
  assert.equal(L.showsEnduranceBase({ goal: 'force', fitnessObjective: 'muscle', raceGoalDate: '2026-10-01' }), true);
  assert.equal(L.showsEnduranceBase({ goal: 'force', fitnessObjective: 'muscle', raceGoalDate: '' }), false);
  // entrée vide
  assert.equal(L.showsEnduranceBase(), false);
});

test('studyBySubject : répartition par matière + priorité de révision', () => {
  const agenda = [
    { kind: 'study', title: 'Compta', date: '2026-07-10', completed: true },
    { kind: 'study', title: 'Compta', date: '2026-07-12', completed: true },
    { kind: 'study', title: 'Compta', date: '2026-07-20', completed: false }, // à venir
    { kind: 'study', title: 'Droit',  date: '2026-07-08', completed: false },  // en retard
    { kind: 'study', title: 'Droit',  date: '2026-07-09', completed: false },  // en retard
    { kind: 'study', title: 'Droit',  date: '2026-07-22', completed: false },  // à venir
    { kind: 'study', title: 'Éco',    date: '2026-07-11', completed: true },
    { kind: 'sport', title: 'Muscu',  date: '2026-07-10', completed: true },   // ignoré (pas study)
  ];
  const r = L.studyBySubject(agenda, '2026-07-15');
  // Droit d'abord (2 en retard), puis Compta (retard 0, doneRate 67), puis Éco (100%)
  assert.deepEqual(r.map(s => s.subject), ['Droit', 'Compta', 'Éco']);
  const droit = r.find(s => s.subject === 'Droit');
  assert.deepEqual([droit.total, droit.done, droit.upcoming, droit.overdue], [3, 0, 1, 2]);
  const compta = r.find(s => s.subject === 'Compta');
  assert.deepEqual([compta.total, compta.done, compta.upcoming, compta.overdue, compta.doneRate], [3, 2, 1, 0, 67]);
  assert.equal(r.find(s => s.subject === 'Éco').doneRate, 100);
  // sans titre → « Révision »
  assert.equal(L.studyBySubject([{ kind: 'study', title: '', date: '2026-07-20' }], '2026-07-15')[0].subject, 'Révision');
  // agenda vide
  assert.deepEqual(L.studyBySubject([], '2026-07-15'), []);
  // #613 : titre libre retapé avec une casse/accent/espace différents → UNE seule matière (pas 3),
  // libellé = premier vu, compteurs agrégés. Sans ça le suivi par matière se fragmentait.
  const folded = L.studyBySubject([
    { kind: 'study', title: 'Droit',  date: '2026-07-10', completed: true },
    { kind: 'study', title: 'droit ', date: '2026-07-12', completed: false }, // à venir
    { kind: 'study', title: 'DROIT',  date: '2026-07-08', completed: false }, // en retard
    { kind: 'study', title: 'Éco',    date: '2026-07-11', completed: true },
    { kind: 'study', title: 'eco',    date: '2026-07-13', completed: false }, // à venir
  ], '2026-07-11');
  assert.deepEqual(folded.map(s => s.subject), ['Droit', 'Éco']); // 2 matières, libellé premier-vu
  const d2 = folded.find(s => s.subject === 'Droit');
  assert.deepEqual([d2.total, d2.done, d2.upcoming, d2.overdue], [3, 1, 1, 1]);
  const e2 = folded.find(s => s.subject === 'Éco');
  assert.deepEqual([e2.total, e2.done, e2.upcoming], [2, 1, 1]);
  // matières RÉELLEMENT distinctes (au-delà de casse/accent) NON fusionnées
  assert.equal(L.studyBySubject([
    { kind: 'study', title: 'Droit civil',  date: '2026-07-20' },
    { kind: 'study', title: 'Droit social', date: '2026-07-21' },
  ], '2026-07-15').length, 2);
});

test('attentionDigest : agrège ce qui a besoin d’attention, trié par gravité', () => {
  const today = '2026-07-15';
  const state = {
    recovery: [{ date: today, sleep: 4, fatigue: 5, soreness: 5 }], // forme basse
    examGoal: { title: 'BTS', date: '2026-07-22' },                  // J-7 → rappel (high)
    agenda: [
      { kind: 'study', title: 'Droit', date: '2026-07-10', completed: false }, // révision en retard (med)
      { kind: 'sport', title: 'Muscu', date: '2026-07-12', completed: false }, // séance manquée (med)
    ],
    workouts: [],
    habits: [],
  };
  const d = L.attentionDigest(state, today);
  const keys = d.map(i => i.key);
  assert.ok(keys.includes('exam') && keys.includes('study') && keys.includes('sport'));
  // les items 'high' (exam, éventuellement readiness) passent avant les 'med'
  assert.ok(keys.indexOf('exam') < keys.indexOf('study'), 'high avant med');
  assert.ok(keys.indexOf('exam') < keys.indexOf('sport'));
  // cohérence readiness : présent ssi le score est bas
  const rs = L.readinessScore({ date: today, sleep: 4, fatigue: 5, soreness: 5 });
  if (rs && rs.score < 50) assert.ok(keys.includes('readiness'));
  // chaque item a le format attendu
  assert.ok(d.every(i => i.key && i.emoji && i.text && i.page && (i.sev === 'high' || i.sev === 'med')));
  // navigation : révisions/examen → page calendrier (là où ils vivent) ; séance → athlète
  assert.equal(d.find(i => i.key === 'exam').page, 'calendar');
  assert.equal(d.find(i => i.key === 'study').page, 'calendar');
  assert.equal(d.find(i => i.key === 'sport').page, 'athlete');
  // anniversaire imminent (demain) → item 'birthday' high, navigue vers l'agenda
  const bd = L.attentionDigest({ recovery: [], agenda: [], workouts: [], habits: [], birthdays: [{ id: 1, name: 'Léa', day: 16, month: 7 }] }, today);
  const b = bd.find(i => i.key === 'birthday');
  assert.ok(b && b.page === 'agenda' && b.sev === 'high' && /Léa/.test(b.text) && /demain/.test(b.text));
  // anniversaire lointain (dans 40 j) → pas d'item
  assert.ok(!L.attentionDigest({ recovery: [], agenda: [], workouts: [], habits: [], birthdays: [{ id: 2, name: 'Max', day: 24, month: 8 }] }, today).some(i => i.key === 'birthday'));
  // rappel de sauvegarde : données présentes + jamais sauvegardé → item 'backup' vers settings
  const withData = { recovery: [], agenda: [], workouts: [], habits: [{ id: 1, name: 'X', log: [] }], birthdays: [] };
  assert.ok(L.attentionDigest({ ...withData, lastBackup: '' }, today).some(i => i.key === 'backup' && i.page === 'settings' && /jamais/.test(i.text)));
  assert.ok(L.attentionDigest({ ...withData, lastBackup: '2026-06-25' }, today).some(i => i.key === 'backup' && /20 j/.test(i.text)));
  // sauvegardé récemment → pas de nudge
  assert.ok(!L.attentionDigest({ ...withData, lastBackup: '2026-07-14' }, today).some(i => i.key === 'backup'));
  // aucune donnée (nouveau venu) → pas de nudge même sans sauvegarde
  assert.ok(!L.attentionDigest({ recovery: [], agenda: [], workouts: [], habits: [], birthdays: [], lastBackup: '' }, today).some(i => i.key === 'backup'));
  // cap
  assert.equal(L.attentionDigest(state, today, { cap: 2 }).length, 2);
  // rien d’urgent → []
  assert.deepEqual(L.attentionDigest({ recovery: [], agenda: [], workouts: [], habits: [] }, today), []);
  // date invalide → []
  assert.deepEqual(L.attentionDigest(state, 'nope'), []);
});

test('attentionDigest : sommeil URGENT (court + irrégulier) remonte même si readiness ≥ 50', () => {
  const today = '2026-07-21';
  // Sommeil court ET coucher en dents de scie (22 h ↔ 4 h) → sleepCoachInsight tone 'urgent',
  // mais readiness du jour reste ≥ 50 (HRV/courbatures OK) → l'alerte forme-basse ne se déclenche pas.
  const recovery = [
    { date: '2026-07-16', sleep: 5.0, bedtime: '04:10', energy: 3, hrv: 60, soreness: 2 },
    { date: '2026-07-17', sleep: 7.5, bedtime: '22:20', energy: 4, hrv: 65, soreness: 1 },
    { date: '2026-07-18', sleep: 4.5, bedtime: '03:50', energy: 3, hrv: 62, soreness: 2 },
    { date: '2026-07-19', sleep: 6.0, bedtime: '23:10', energy: 3, hrv: 60, soreness: 2 },
    { date: '2026-07-20', sleep: 4.8, bedtime: '04:30', energy: 3, hrv: 61, soreness: 2 },
    { date: today, sleep: 5.2, bedtime: '02:40', energy: 3, hrv: 60, soreness: 2 },
  ];
  const sci = L.sleepCoachInsight(recovery, today);
  assert.equal(sci.tone, 'urgent');
  const rs = L.readinessScore(recovery[recovery.length - 1]);
  assert.ok(rs && rs.score >= 50, 'readiness reste ≥ 50 → l’alerte forme-basse ne couvre PAS ce cas');
  const base = { recovery, agenda: [], workouts: [], habits: [] };
  const d = L.attentionDigest(base, today);
  const r = d.find(i => i.key === 'readiness');
  assert.ok(r && r.sev === 'high' && r.page === 'athlete' && /[Ss]ommeil/.test(r.text), 'sommeil urgent remonté en high');
  // Sommeil correct → aucune alerte readiness (pas de faux positif).
  const okNights = [
    { date: '2026-07-18', sleep: 7.6, bedtime: '23:00', fatigue: 1, soreness: 1 },
    { date: '2026-07-19', sleep: 7.8, bedtime: '23:05', fatigue: 1, soreness: 1 },
    { date: '2026-07-20', sleep: 7.5, bedtime: '22:55', fatigue: 1, soreness: 1 },
    { date: today, sleep: 7.7, bedtime: '23:10', fatigue: 1, soreness: 1 },
  ];
  assert.ok(!L.attentionDigest({ recovery: okNights, agenda: [], workouts: [], habits: [] }, today).some(i => i.key === 'readiness'));
  // Forme basse ET sommeil urgent le MÊME jour → une SEULE alerte readiness (celle de la forme basse), pas deux.
  const lowRs = recovery.map(x => x.date === today ? { ...x, sleep: 4, fatigue: 5, soreness: 5 } : x);
  const dd = L.attentionDigest({ recovery: lowRs, agenda: [], workouts: [], habits: [] }, today).filter(i => i.key === 'readiness');
  assert.equal(dd.length, 1);
  assert.ok(/Forme basse/.test(dd[0].text));
});

test('adaptiveCoachFocus : lit la dynamique 2 semaines et choisit le bon focus/ton', () => {
  const today = '2026-07-16';
  // Fenêtre récente = jours 0..6 (16→10 juil) ; fenêtre précédente = jours 7..13 (09→03 juil).

  // Aucune donnée / date invalide → null (l'onboarding couvre le nouveau venu).
  assert.equal(L.adaptiveCoachFocus({}, 'nope'), null);
  assert.equal(L.adaptiveCoachFocus({ workouts: [], focusSessions: [], recovery: [], nutrition: [] }, today), null);

  // rebuild : pilier solide (4 j la semaine passée) qui recule à 1 j → priorité haute, ton « rebuild ».
  const slip = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-09' },
    { date: '2026-07-11' },
  ] }, today);
  assert.equal(slip.pillar, 'sport');
  assert.equal(slip.tone, 'rebuild');
  assert.equal(slip.prevDays, 4);
  assert.equal(slip.recentDays, 1);
  assert.equal(slip.page, 'athlete');
  assert.match(slip.headline, /essouffle/);
  assert.ok(slip.action && slip.action.length);

  // revive : pilier connu mais dormant depuis > 2 semaines → ton « revive ».
  const rev = L.adaptiveCoachFocus({ focusSessions: [{ date: '2026-06-20', minutes: 30 }] }, today);
  assert.equal(rev.pillar, 'focus');
  assert.equal(rev.tone, 'revive');
  assert.equal(rev.recentDays, 0);
  assert.equal(rev.prevDays, 0);
  assert.ok(rev.lastActiveDays >= 14);
  assert.match(rev.headline, /Reprends/);
  // Ré-amorçage : après une longue coupure (26 j ≥ 21), l'action est un tout premier pas minuscule,
  // qui NOMME la durée et déculpabilise franchement (bande « long »).
  assert.equal(rev.reviveStep, true);
  assert.match(rev.action, /Après 26 jours sans focus/);
  assert.match(rev.action, /10 min/);
  assert.match(rev.action, /rallume la lampe/);

  // Ré-amorçage bande « modérée » (14-20 j) : pas minuscule proportionné, SANS la phrase « long ».
  const revMod = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-01' }] }, today); // 15 j
  assert.equal(revMod.pillar, 'sport');
  assert.equal(revMod.tone, 'revive');
  assert.equal(revMod.reviveStep, true);
  assert.match(revMod.action, /Après 15 jours sans séance/);
  assert.match(revMod.action, /bouge 5 min/);
  assert.ok(!/rallumer la mèche/.test(revMod.action), 'bande modérée : pas de phrase « long »');

  // Exclusion : un jour de récup (readiness < 50) sur un sport dormant garde l'action « repose »,
  // pas de pas ré-amorçant qui la contredirait.
  const revRest = L.adaptiveCoachFocus({
    workouts: [{ date: '2026-07-01' }],
    recovery: [{ date: '2026-07-16', sleep: 4, fatigue: 5, soreness: 5 }],
  }, today);
  assert.equal(revRest.pillar, 'sport');
  assert.ok(revRest.readiness != null && revRest.readiness < 50);
  assert.ok(!revRest.reviveStep, 'jour de récup : pas de ré-amorçage');
  assert.match(revRest.action, /récupération prioritaire|repose|mobilité/);

  // reinforce : rien à corriger, une dynamique en hausse → ton « reinforce ».
  const up = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-05' }, { date: '2026-07-16' }, { date: '2026-07-14' }, { date: '2026-07-12' },
  ] }, today);
  assert.equal(up.pillar, 'sport');
  assert.equal(up.tone, 'reinforce');
  assert.equal(up.trend, 'up');
  assert.equal(up.recentDays, 3);
  assert.match(up.headline, /monte en régime/);
  assert.equal(up.comeback, false, 'hausse continue (pas de long trou avant) → pas de relance amorcée');

  // RELANCE AMORCÉE : reprise fraîche (07-16 = jour 0, 07-14 = jour 2) après un long silence (dernier
  // geste avant le trou = 15 juin, jour 31) → ton reinforce + comeback salué, avec le trou chiffré.
  const back = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-06-15' }, { date: '2026-07-14' }, { date: '2026-07-16' },
  ] }, today);
  assert.equal(back.pillar, 'sport');
  assert.equal(back.tone, 'reinforce');
  assert.equal(back.comeback, true, 'reprise fraîche après ≥ 14 j de trou → relance amorcée');
  assert.match(back.insight, /Tu as rallumé ton entraînement il y a 2 j après 29 jours d’arrêt/);
  assert.match(back.insight, /le plus dur \(franchir la reprise\) est fait/);
  // ESCALADE du geste : 2 jours actifs cette semaine (07-14 + 07-16) → reprise qui « prend » (building),
  // le coach remonte l'ask vers une vraie séance.
  assert.equal(back.comebackStage, 'building', 'reprise à 2 jours actifs → stade « building »');
  assert.match(back.action, /La reprise tient \(2 jours cette semaine\)/);
  assert.match(back.action, /regagné le droit à une vraie séance/);
  // ESCALADE — stade « étincelle » : un SEUL geste depuis la reprise (07-16 seul, après un long trou)
  // → le coach protège l'étincelle au lieu de pousser (« un 2e jour… »).
  const spark = L.adaptiveCoachFocus({ workouts: [{ date: '2026-06-15' }, { date: '2026-07-16' }] }, today);
  assert.equal(spark.tone, 'reinforce');
  assert.equal(spark.comeback, true, 'reprise fraîche après long trou → relance amorcée');
  assert.equal(spark.recentDays, 1);
  assert.equal(spark.comebackStage, 'spark', 'un seul jour actif → stade « étincelle »');
  assert.match(spark.action, /Ne force pas le rythme/);
  assert.match(spark.action, /un 2e jour actif cette semaine/);
  // Un pilier flambant NEUF (aucune activité avant le trou) n'est pas une « relance ».
  const fresh = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-14' }, { date: '2026-07-16' }] }, today);
  assert.equal(fresh.tone, 'reinforce');
  assert.equal(fresh.comeback, false, 'pilier sans passé avant la fenêtre récente → pas de relance');
  assert.equal(fresh.comebackStage, null, 'hors relance → comebackStage null');
  // La reprise fraîche (comeback) NE double PAS avec la série en jeu : elle raconte déjà le run.
  assert.equal(spark.streakAtRisk, null, 'comeback → pas de note « série en jeu » (disjoint)');

  // SÉRIE EN JEU : 3 jours d'entraînement CONSÉCUTIFS finissant hier (13-14-15), rien aujourd'hui →
  // renforcement + série ≥ 3 nommée, aversion à la perte.
  const series = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-15' },
  ] }, today);
  assert.equal(series.tone, 'reinforce');
  assert.equal(series.comeback, false, 'pas de long trou avant → pas de relance');
  assert.equal(series.streakAtRisk, 3, '3 jours consécutifs finissant hier → série de 3 en jeu');
  assert.match(series.insight, /série de 3 jours d’affilée sur ton entraînement est en jeu/);
  assert.match(series.insight, /un seul geste aujourd’hui la garde vivante/);
  // Geste du jour DÉJÀ posé (07-16) → la série est prolongée, plus « en jeu » → aucune note.
  const seriesToday = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-15' }, { date: '2026-07-16' },
  ] }, today);
  assert.equal(seriesToday.doneToday, true);
  assert.equal(seriesToday.streakAtRisk, null, 'geste du jour posé → série prolongée, pas en jeu');
  assert.doesNotMatch(seriesToday.insight, /est en jeu/);
  // Série trop courte (2 jours consécutifs) → sous le seuil, pas de note.
  const shortSeries = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-14' }, { date: '2026-07-15' }] }, today);
  assert.equal(shortSeries.tone, 'reinforce');
  assert.equal(shortSeries.streakAtRisk, null, 'série de 2 j < 3 → pas de note « en jeu »');
  // PALIER de série EN JEU : 6 jours consécutifs finissant hier (10→15), rien aujourd'hui → le geste
  // du jour porterait la série à 7 = palier. Le coach ajoute la carotte du jalon à la note « en jeu ».
  const milestoneSeries = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-10' }, { date: '2026-07-11' }, { date: '2026-07-12' },
    { date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-15' },
  ] }, today);
  assert.equal(milestoneSeries.tone, 'reinforce');
  assert.equal(milestoneSeries.comeback, false, 'série continue de 6 j → pas de relance');
  assert.equal(milestoneSeries.streakAtRisk, 6, '6 jours consécutifs finissant hier → série de 6 en jeu');
  assert.equal(milestoneSeries.streakMilestoneReach, 7, 'streak 6 → le geste du jour ferait franchir le palier 7');
  assert.match(milestoneSeries.insight, /série de 6 jours d’affilée sur ton entraînement est en jeu/);
  assert.match(milestoneSeries.insight, /décroche le palier d’une semaine/);
  // La série de 3 j (streak 3) n'est PAS à un palier (prochain = 7, à 4 jours) → pas de carotte jalon.
  assert.equal(series.streakMilestoneReach, null, 'streak 3 loin du palier 7 → pas de note « palier »');
  assert.doesNotMatch(series.insight, /décroche le palier/);
  // Les séries de 3 et 6 j ont un record < 7 → pas de note « record perso » (record non notable).
  assert.equal(series.streakRecordReach, null, 'record 3 j < 7 → pas de note record');
  assert.equal(milestoneSeries.streakRecordReach, null, 'record 6 j < 7 → pas de note record (et palier déjà servi)');

  // RECORD PERSO — le run EN COURS est déjà le record all-time (7 j d'affilée finissant hier, ≥ 7) →
  // un geste aujourd'hui le PROLONGE en nouveau record.
  const recordBreak = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-09' }, { date: '2026-07-10' }, { date: '2026-07-11' }, { date: '2026-07-12' },
    { date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-15' },
  ] }, today);
  assert.equal(recordBreak.tone, 'reinforce');
  assert.equal(recordBreak.streakAtRisk, 7, '7 jours consécutifs finissant hier → série de 7 en jeu');
  assert.equal(recordBreak.streakMilestoneReach, null, 'prochain palier de 7 est 14 (loin) → pas de carotte palier');
  assert.equal(recordBreak.streakRecordReach, 'break', 'run en cours = record all-time → un geste bat le record');
  assert.match(recordBreak.insight, /tu bats ton record perso sur ton entraînement/);
  // RECORD PERSO — un record PASSÉ (8 j d'affilée) proche du run actuel (5 j finissant hier, écart ≤ 3),
  // sans long trou (pas de relance) et sans palier du jour (streak 5 loin d'un palier) → note « à portée ».
  const recordNear = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-06-30' }, { date: '2026-07-01' }, { date: '2026-07-02' }, { date: '2026-07-03' },
    { date: '2026-07-04' }, { date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' },
    { date: '2026-07-11' }, { date: '2026-07-12' }, { date: '2026-07-13' },
    { date: '2026-07-14' }, { date: '2026-07-15' },
  ] }, today);
  assert.equal(recordNear.tone, 'reinforce');
  assert.equal(recordNear.comeback, false, 'trou < 14 j entre les deux runs → pas de relance');
  assert.equal(recordNear.streakAtRisk, 5, '5 jours consécutifs finissant hier → série de 5 en jeu');
  assert.equal(recordNear.streakMilestoneReach, null, 'streak 5 loin d’un palier → pas de carotte palier');
  assert.equal(recordNear.streakRecordReach, 'near', 'record passé de 8 j à 3 j du run actuel → à portée');
  assert.match(recordNear.insight, /record perso ici est de 8 jours d’affilée — encore 3 jours pour l’égaler/);

  // MICRO-JALON DE REPRISE — une série repartie à 2 jours (07-14, 07-15, rien aujourd'hui) SOUS le seuil
  // « en jeu » de 3, avec un record perso notable au-dessus (7 j : 06-26→07-02, hors fenêtres, trou de 12 j
  // < 14 → pas de relance) → le coach salue la reconstruction et cite le record comme cap.
  const rebuild = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-06-26' }, { date: '2026-06-27' }, { date: '2026-06-28' }, { date: '2026-06-29' },
    { date: '2026-06-30' }, { date: '2026-07-01' }, { date: '2026-07-02' },
    { date: '2026-07-14' }, { date: '2026-07-15' },
  ] }, today);
  assert.equal(rebuild.tone, 'reinforce');
  assert.equal(rebuild.comeback, false, 'trou de 12 j < 14 → pas de relance, place au micro-jalon de reprise');
  assert.equal(rebuild.streakAtRisk, null, 'série repartie de 2 j < 3 → pas « en jeu »');
  assert.equal(rebuild.streakRebuild, 7, 'série de 2 j + record perso de 7 j → reconstruction saluée, record cité');
  assert.match(rebuild.insight, /Tu reconstruis : 2 jours d’affilée sur ton entraînement/);
  assert.match(rebuild.insight, /record perso : 7 jours/);
  // Reprise à 3 j AVEC le geste du jour posé (streakAtRisk muet car série prolongée) → couvert aussi.
  const rebuild3 = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-06-26' }, { date: '2026-06-27' }, { date: '2026-06-28' }, { date: '2026-06-29' },
    { date: '2026-06-30' }, { date: '2026-07-01' }, { date: '2026-07-02' },
    { date: '2026-07-14' }, { date: '2026-07-15' }, { date: '2026-07-16' },
  ] }, today);
  assert.equal(rebuild3.streakAtRisk, null, 'geste du jour posé → série prolongée, pas « en jeu »');
  assert.equal(rebuild3.streakRebuild, 7, 'reprise à 3 j (geste du jour posé) + record 7 j → reconstruction saluée');
  assert.match(rebuild3.insight, /Tu reconstruis : 3 jours d’affilée/);
  // SANS record notable au-dessus : la petite série de 2 j (07-14, 07-15) seule → pas de « reconstruction ».
  assert.equal(shortSeries.streakRebuild, null, 'série de 2 j sans record perso ≥ 7 → pas de micro-jalon de reprise');
  // Série EN JEU (≥ 3, streakAtRisk parle) → le micro-jalon de reprise reste muet (disjoint).
  assert.equal(recordNear.streakRebuild, null, 'série de 5 j en jeu → streakAtRisk parle, pas streakRebuild');
  assert.equal(series.streakRebuild, null, 'série de 3 j en jeu → pas de streakRebuild');

  // Coach de la SÉRIE ROMPUE (côté correction, pendant consolant de la « série en jeu ») : une série de
  // 5 j close il y a une semaine, pilier maintenant en recul (rebuild) → le coach reconnaît l'acquis
  // plutôt que de reprocher la pause.
  const broken = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' },
    { date: '2026-07-08' }, { date: '2026-07-09' },
  ] }, today);
  assert.equal(broken.tone, 'rebuild', 'série close + rien depuis une semaine → ton de correction');
  assert.equal(broken.brokenStreak, 5, 'série rompue de 5 jours détectée au dernier jour actif');
  assert.equal(broken.brokenStreakTier, 'court', 'série de 5 j (< 7) → nuance « court », relance légère');
  assert.match(broken.insight, /Tu tenais 5 jours d’affilée sur ton entraînement avant cette pause/);
  assert.match(broken.insight, /une série vite relancée/);
  // NUANCE selon la longueur : une série qui avait franchi le palier de la semaine (ici 8 j close il y
  // a une semaine) pèse plus lourd → tier « long », magnitude nommée (« une semaine entière »).
  const longBroken = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-02' }, { date: '2026-07-03' }, { date: '2026-07-04' }, { date: '2026-07-05' },
    { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-08' }, { date: '2026-07-09' },
  ] }, today);
  assert.equal(longBroken.tone, 'rebuild');
  assert.equal(longBroken.brokenStreak, 8, 'série rompue de 8 jours mesurée au dernier jour actif');
  assert.equal(longBroken.brokenStreakTier, 'long', 'série de 8 j (≥ 7) → nuance « long », vraie reprise');
  assert.match(longBroken.insight, /Tu tenais une semaine entière d’affilée sur ton entraînement avant cette pause/);
  assert.match(longBroken.insight, /ça, c’est du solide/);
  assert.doesNotMatch(longBroken.insight, /vite relancée/);
  // Série trop courte (3 j close) → sous le seuil, pas de consolation.
  const shortBroken = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-07' }, { date: '2026-07-08' }, { date: '2026-07-09' },
  ] }, today);
  assert.equal(shortBroken.tone, 'rebuild');
  assert.equal(shortBroken.brokenStreak, null, 'série de 3 j < 4 → pas de note « série rompue »');
  assert.equal(shortBroken.brokenStreakTier, null, 'pas de série rompue → pas de nuance');
  assert.doesNotMatch(shortBroken.insight, /avant cette pause/);
  // Disjoint de la série EN JEU : en ton reinforce, brokenStreak reste null (c'est streakAtRisk qui parle).
  assert.equal(series.brokenStreak, null, 'reinforce (série vivante) → jamais de brokenStreak');
  // Une reprise fraîche (dernier geste aujourd'hui, série vivante) n'est pas une « série rompue ».
  const aliveNotBroken = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-15' }, { date: '2026-07-16' },
  ] }, today);
  assert.equal(aliveNotBroken.brokenStreak, null, 'série encore vivante aujourd’hui → pas rompue');

  // priorité : un pilier qui décroche l'emporte sur un autre en hausse.
  const mixed = L.adaptiveCoachFocus({
    workouts: [{ date: '2026-07-05' }, { date: '2026-07-16' }, { date: '2026-07-14' }, { date: '2026-07-12' }],
    recovery: [{ date: '2026-07-03', sleep: 7 }, { date: '2026-07-05', sleep: 7 }, { date: '2026-07-07', sleep: 7 }, { date: '2026-07-09', sleep: 7 }, { date: '2026-07-11', sleep: 7 }],
  }, today);
  assert.equal(mixed.pillar, 'sommeil');
  assert.equal(mixed.tone, 'rebuild');

  // activité « vide » (protéines/eau/fruit à 0) ne compte pas ; dates futures ignorées.
  assert.equal(L.adaptiveCoachFocus({ nutrition: [{ date: '2026-07-15', protein: 0, water: 0, fruit: false }] }, today), null);
  assert.equal(L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-20' }] }, today), null);

  // alternance : priorité ABSOLUE tant qu'il cherche et n'a pas postulé aujourd'hui — prime sur les piliers.
  const alt = L.adaptiveCoachFocus({ applications: [{ id: 1, company: 'A', status: 'postule', date: '2026-07-14' }], workouts: [{ date: '2026-07-16' }] }, today);
  assert.equal(alt.pillar, 'alternance');
  assert.equal(alt.tone, 'urgent');
  assert.equal(alt.page, 'alternance');
  assert.match(alt.insight, /avant la rentrée/);
  assert.match(alt.insight, /cette semaine/);
  // postulé aujourd'hui, rien en attente → le coach repasse aux piliers (plus d'alternance)
  assert.notEqual(L.adaptiveCoachFocus({ applications: [{ id: 1, company: 'A', status: 'postule', date: today }], workouts: [{ date: '2026-07-16' }] }, today).pillar, 'alternance');
  // alternance décrochée → plus de pression alternance
  assert.notEqual(L.adaptiveCoachFocus({ applications: [{ id: 1, company: 'A', status: 'accepte', date: '2026-07-01' }], workouts: [{ date: '2026-07-16' }] }, today).pillar, 'alternance');

  // FUNNEL — postulé aujourd'hui MAIS une relance en attente (J+9) → le coach coache la relance, nommée.
  const rel = L.adaptiveCoachFocus({ applications: [
    { id: 1, company: 'Faite Aujourd’hui', status: 'postule', date: today },
    { id: 2, company: 'Cabinet Léa', status: 'postule', date: '2026-07-07' },
  ], workouts: [{ date: '2026-07-16' }] }, today);
  assert.equal(rel.pillar, 'alternance');
  assert.equal(rel.tone, 'urgent');
  assert.match(rel.headline, /Relance Cabinet Léa/);
  assert.match(rel.insight, /depuis 9 jours/);
  // postulé aujourd'hui, pas de relance, mais un entretien dans le pipeline → prépa entretien.
  const ent = L.adaptiveCoachFocus({ applications: [
    { id: 1, company: 'A', status: 'postule', date: today },
    { id: 2, company: 'B', status: 'entretien', date: '2026-07-05' },
  ], workouts: [{ date: '2026-07-16' }] }, today);
  assert.equal(ent.pillar, 'alternance');
  assert.match(ent.headline, /entretien/i);
  // PAS encore postulé aujourd'hui, même avec une relance en attente → postuler reste la priorité du jour.
  const pri = L.adaptiveCoachFocus({ applications: [{ id: 1, company: 'X', status: 'postule', date: '2026-07-05' }], workouts: [{ date: '2026-07-16' }] }, today);
  assert.equal(pri.pillar, 'alternance');
  assert.match(pri.headline, /Postule aujourd’hui/);
});

test('adaptiveCoachFocus : priorise explicitement quand plusieurs piliers décrochent', () => {
  const today = '2026-07-16';
  const workouts = [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }];
  const focusSessions = [{ date: '2026-07-04', minutes: 30 }, { date: '2026-07-06', minutes: 30 }, { date: '2026-07-08', minutes: 30 }, { date: '2026-07-12', minutes: 30 }];
  const nutrition = [{ date: '2026-07-03', protein: 100 }, { date: '2026-07-05', protein: 100 }, { date: '2026-07-07', protein: 100 }, { date: '2026-07-13', protein: 100 }];

  // Un SEUL pilier décroche → pas de note de priorisation, alsoSlipping 0.
  const one = L.adaptiveCoachFocus({ workouts }, today);
  assert.equal(one.pillar, 'sport');
  assert.equal(one.alsoSlipping, 0);
  assert.doesNotMatch(one.insight, /autre pilier faiblit|autres piliers faiblissent/);

  // DEUX piliers décrochent (sport + focus, tier égal) → sport choisi (dormant depuis plus longtemps),
  // note explicite au singulier qui NOMME le pilier restant, alsoSlipping 1.
  const two = L.adaptiveCoachFocus({ workouts, focusSessions }, today);
  assert.equal(two.pillar, 'sport');
  assert.equal(two.tone, 'rebuild');
  assert.equal(two.alsoSlipping, 1);
  assert.deepEqual(two.alsoSlippingPillars, ['focus']);
  assert.match(two.insight, /Ton focus faiblit aussi cette semaine/);
  assert.match(two.insight, /celui-ci d’abord, c’est ton levier prioritaire/);

  // TROIS piliers décrochent → note au pluriel qui NOMME les deux autres, dans l'ordre de gravité
  // (sport le plus anciennement actif → choisi ; focus puis nutrition ensuite), alsoSlipping 2.
  const three = L.adaptiveCoachFocus({ workouts, focusSessions, nutrition }, today);
  assert.equal(three.pillar, 'sport');
  assert.equal(three.alsoSlipping, 2);
  assert.deepEqual(three.alsoSlippingPillars, ['focus', 'nutrition']);
  assert.match(three.insight, /Ton focus et ta nutrition faiblissent aussi cette semaine/);

  // GRAVITÉ modulée : un autre pilier DORMANT (focus actif seulement il y a 3 semaines, 0 depuis
  // 14 j) → « à l'arrêt » au lieu de « faiblit » (sport en creux reste le focus prioritaire).
  const dormFocus = [{ date: '2026-06-25', minutes: 30 }];
  const dorm = L.adaptiveCoachFocus({ workouts, focusSessions: dormFocus }, today);
  assert.equal(dorm.pillar, 'sport');
  assert.equal(dorm.alsoSlipping, 1);
  assert.deepEqual(dorm.alsoSlippingPillars, ['focus']);
  assert.match(dorm.insight, /Ton focus est à l’arrêt aussi cette semaine — celui-ci d’abord/);
  assert.doesNotMatch(dorm.insight, /focus faiblit/);

  // MIXTE : nutrition en creux + focus dormant → état précisé en parenthèse pour chacun, verbe neutre
  // « décrochent » (ordre de gravité : les tier 0 avant le tier 1 dormant).
  const mixte = L.adaptiveCoachFocus({ workouts, focusSessions: dormFocus, nutrition }, today);
  assert.equal(mixte.pillar, 'sport');
  assert.equal(mixte.alsoSlipping, 2);
  assert.deepEqual(mixte.alsoSlippingPillars, ['nutrition', 'focus']);
  assert.match(mixte.insight, /Ta nutrition \(en recul\) et ton focus \(à l’arrêt\) décrochent aussi cette semaine/);

  // Rotation (3 j du même focus journalisés) → on a fui le pilier prioritaire, pas de « d'abord ».
  const rotLog = [{ date: '2026-07-13', pillar: 'sport' }, { date: '2026-07-14', pillar: 'sport' }, { date: '2026-07-15', pillar: 'sport' }];
  const rot = L.adaptiveCoachFocus({ workouts, focusSessions, coachLog: rotLog }, today);
  assert.ok(rot.rotated);
  assert.equal(rot.alsoSlipping, 0);
  assert.doesNotMatch(rot.insight, /levier prioritaire/);

  // Renforcement (rien à corriger) → aucune note, alsoSlipping 0.
  const up = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-05' }, { date: '2026-07-16' }, { date: '2026-07-14' }, { date: '2026-07-12' }] }, today);
  assert.equal(up.tone, 'reinforce');
  assert.equal(up.alsoSlipping, 0);
});

test('adaptiveCoachFocus : crédite une journée multi-piliers (doneToday / reinforce)', () => {
  const today = '2026-07-16';
  // Contexte doneToday : sport en décrochage MAIS séance du jour loggée → crédit du geste ; en plus,
  // focus + nutrition sont déjà cochés aujourd'hui → 3/4 piliers → note « belle journée complète ».
  const multi = {
    profile: { weight: 80, goal: 'force' },
    workouts: [{ date: '2026-07-03' }, { date: '2026-07-04' }, { date: '2026-07-05' }, { date: '2026-07-06' }, { date: today, duration: 45 }],
    focusSessions: [{ date: today, minutes: 30, task: 'Thèse' }],
    nutrition: [{ date: today, protein: 120 }],
  };
  const m = L.adaptiveCoachFocus(multi, today);
  assert.equal(m.pillar, 'sport');
  assert.equal(m.doneToday, true);
  assert.equal(m.pillarsToday, 3, 'sport + focus + nutrition cochés aujourd’hui');
  assert.match(m.insight, /3\/4 de tes piliers déjà cochés aujourd’hui/);
  assert.match(m.insight, /belle journée complète/);
  assert.equal(m.completeDayStreak, 1, 'seul aujourd’hui est complet (jours précédents = sport seul) → série 1, pas d’enchaînement');
  assert.doesNotMatch(m.insight, /jours d’affilée à 3\+ piliers/, 'pas de célébration de série sur une journée complète isolée');
  assert.match(m.action, /Séance déjà faite aujourd’hui/, 'le crédit du geste reste dans l’action');

  // Un SEUL pilier coché aujourd'hui (le sport crédité) → pillarsToday 1, aucune note multi-piliers.
  const solo = { workouts: [{ date: '2026-07-03' }, { date: '2026-07-04' }, { date: '2026-07-05' }, { date: '2026-07-06' }, { date: today, duration: 45 }] };
  const s1 = L.adaptiveCoachFocus(solo, today);
  assert.equal(s1.doneToday, true);
  assert.equal(s1.pillarsToday, 1);
  assert.doesNotMatch(s1.insight, /piliers déjà cochés/);

  // DEUX piliers cochés → note « bonne lancée » (seuil bas à 2).
  const two = { workouts: [{ date: '2026-07-03' }, { date: '2026-07-04' }, { date: '2026-07-05' }, { date: '2026-07-06' }, { date: today, duration: 45 }], focusSessions: [{ date: today, minutes: 25, task: 'X' }] };
  const t2 = L.adaptiveCoachFocus(two, today);
  assert.equal(t2.pillarsToday, 2);
  assert.match(t2.insight, /2\/4 de tes piliers déjà cochés aujourd’hui — bonne lancée/);

  // Contexte reinforce SANS doneToday : sport en hausse (dernier jour actif = hier), mais focus ET
  // nutrition cochés aujourd'hui → 2/4 salués. Prouve que le crédit n'exige pas doneToday : un bon élan
  // suffit, et le pilier poussé (sport) n'a même pas d'entrée du jour.
  const rise = { workouts: [{ date: '2026-07-05' }, { date: '2026-07-11' }, { date: '2026-07-12' }, { date: '2026-07-14' }, { date: '2026-07-15' }], focusSessions: [{ date: today, minutes: 30, task: 'X' }], nutrition: [{ date: today, protein: 100 }] };
  const r = L.adaptiveCoachFocus(rise, today);
  assert.equal(r.pillar, 'sport');
  assert.equal(r.tone, 'reinforce');
  assert.equal(r.doneToday, false, 'le pilier poussé n’a pas d’entrée du jour');
  assert.equal(r.pillarsToday, 2);
  assert.match(r.insight, /2\/4 de tes piliers déjà cochés aujourd’hui/);

  // Contexte NÉGATIF (rebuild, geste du jour PAS fait) → aucun crédit, même si un autre pilier est coché.
  const neg = { workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-11' }], focusSessions: [{ date: today, minutes: 30, task: 'X' }] };
  const ng = L.adaptiveCoachFocus(neg, today);
  assert.equal(ng.tone, 'rebuild');
  assert.equal(ng.doneToday, false);
  assert.ok(ng.pillarsToday >= 1);
  assert.doesNotMatch(ng.insight, /piliers déjà cochés/, 'pas de crédit multi-piliers en contexte de correction');
});

test('adaptiveCoachFocus : célèbre une SÉRIE de journées complètes (3+ piliers plusieurs jours de suite)', () => {
  const today = '2026-07-16';
  // Les 4 piliers actifs sur 3 jours consécutifs (14, 15, 16) → chaque jour est « complet » (≥3 piliers).
  const streakState = {
    workouts: [{ date: '2026-07-14', duration: 45 }, { date: '2026-07-15', duration: 45 }, { date: today, duration: 45 }],
    focusSessions: [{ date: '2026-07-14', minutes: 30, task: 'X' }, { date: '2026-07-15', minutes: 30, task: 'X' }, { date: today, minutes: 30, task: 'X' }],
    recovery: [{ date: '2026-07-14', sleep: 7 }, { date: '2026-07-15', sleep: 7 }, { date: today, sleep: 7 }],
    nutrition: [{ date: '2026-07-14', protein: 100 }, { date: '2026-07-15', protein: 100 }, { date: today, protein: 100 }],
  };
  const sk = L.adaptiveCoachFocus(streakState, today);
  assert.equal(sk.pillarsToday, 4, 'les 4 piliers cochés aujourd’hui');
  assert.equal(sk.completeDayStreak, 3, '3 jours consécutifs à ≥3 piliers');
  assert.match(sk.insight, /3 jours d’affilée à 3\+ piliers/);
  assert.doesNotMatch(sk.insight, /belle journée complète/, 'la série remplace le crédit du jour isolé');
  // 3 est un palier (STREAK_MILESTONES) → jalon débloqué.
  assert.equal(sk.completeDayMilestone, 3, 'série de 3 = palier franchi');
  assert.match(sk.insight, /Palier franchi : 3 jours de journées pleines/);

  // Série de 2 jours (15, 16 complets ; le 14 n’a qu’un pilier) → « 2 jours d’affilée ».
  const two = {
    workouts: [{ date: '2026-07-14', duration: 45 }, { date: '2026-07-15', duration: 45 }, { date: today, duration: 45 }],
    focusSessions: [{ date: '2026-07-15', minutes: 30, task: 'X' }, { date: today, minutes: 30, task: 'X' }],
    nutrition: [{ date: '2026-07-15', protein: 100 }, { date: today, protein: 100 }],
  };
  const t2 = L.adaptiveCoachFocus(two, today);
  assert.equal(t2.pillarsToday, 3);
  assert.equal(t2.completeDayStreak, 2, '14 = sport seul → hors série ; 15 et 16 complets');
  assert.match(t2.insight, /2 jours d’affilée à 3\+ piliers/);
  // 2 n’est pas un palier, mais le prochain (3) est à un jour → cap à tenir demain.
  assert.equal(t2.completeDayMilestone, null, 'série de 2 = aucun palier franchi');
  assert.match(t2.insight, /Encore 1 jour pour franchir le palier des 3/);

  // Palier d’une SEMAINE complète : 4 piliers × 7 jours consécutifs (10 → 16).
  const days7 = ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15', today];
  const week = {
    workouts: days7.map(d => ({ date: d, duration: 45 })),
    focusSessions: days7.map(d => ({ date: d, minutes: 30, task: 'X' })),
    recovery: days7.map(d => ({ date: d, sleep: 7 })),
    nutrition: days7.map(d => ({ date: d, protein: 100 })),
  };
  const wk = L.adaptiveCoachFocus(week, today);
  assert.equal(wk.completeDayStreak, 7, '7 jours consécutifs complets');
  assert.equal(wk.completeDayMilestone, 7, 'série de 7 = palier franchi');
  assert.match(wk.insight, /Palier franchi : une semaine complète de journées pleines/);
});

test('adaptiveCoachFocus : une SEULE carotte de palier par jour (journées complètes vs habitude)', () => {
  const today = '2026-07-16';
  const days7 = ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15', today];
  // Palier de journées complètes (7) ET habitude au palier (7) le MÊME jour : sans coordination, deux
  // lignes 🏅/🏆 « une semaine complète… un vrai palier » s'empilaient. Le palier des journées complètes
  // (le plus englobant) parle ; l'habitude garde son CHAMP mais n'ajoute plus la phrase redondante.
  const both = {
    workouts: days7.map(d => ({ date: d, duration: 45 })),
    focusSessions: days7.map(d => ({ date: d, minutes: 30, task: 'X' })),
    recovery: days7.map(d => ({ date: d, sleep: 7 })),
    nutrition: days7.map(d => ({ date: d, protein: 100 })),
    habits: [{ id: 1, name: 'Lecture', log: days7 }],
  };
  const r = L.adaptiveCoachFocus(both, today);
  assert.equal(r.completeDayMilestone, 7, 'palier de journées complètes franchi');
  assert.ok(r.habitMilestone && r.habitMilestone.streak === 7, 'champ habitMilestone TOUJOURS renseigné (télémétrie)');
  assert.match(r.insight, /Palier franchi : une semaine complète de journées pleines/, 'le palier englobant parle');
  assert.doesNotMatch(r.insight, /Chaîne au sommet/, 'la 2ᵉ carotte 🏆 habitude est tue le même jour');
  // Une seule occurrence de « un vrai palier » / « une semaine complète » dans l'insight (pas d'empilement).
  assert.equal((r.insight.match(/un vrai palier/g) || []).length, 0, 'pas la formule « un vrai palier » de l’habitude tue');
  assert.equal((r.insight.match(/une semaine complète/g) || []).length, 1, 'une seule mention « une semaine complète »');
  // Contrôle : l'habitude au palier SEULE (pas de journées complètes) garde bien sa célébration.
  const habitOnly = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-14' }, { date: today }], habits: [{ id: 1, name: 'Lecture', log: days7 }] }, today);
  assert.ok(habitOnly.habitMilestone, 'habitMilestone renseigné');
  assert.match(habitOnly.insight, /Chaîne au sommet/, 'seule, la carotte habitude parle normalement');
});

test('adaptiveCoachFocus : action sport calée sur la readiness du jour', () => {
  const today = '2026-07-16';
  // Décrochage sport (3 j la semaine passée, 1 récente) → pilier « sport », ton rebuild.
  const workouts = [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }];
  // readiness au plancher aujourd'hui (15/100) → allègement recommandé, pas une grosse séance.
  const low = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 3, fatigue: 5, soreness: 5 }] }, today);
  assert.equal(low.pillar, 'sport');
  assert.equal(low.tone, 'rebuild');
  assert.equal(low.readiness, 15);
  assert.match(low.action, /récupération prioritaire|mobilité/);
  // readiness au vert (100/100) → feu vert pour pousser.
  const high = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 8, fatigue: 1, soreness: 1 }] }, today);
  assert.equal(high.pillar, 'sport');
  assert.equal(high.readiness, 100);
  assert.match(high.action, /prêt à pousser|vraie séance/);
  // readiness moyenne (60/100) → séance mesurée, garde une marge.
  const mid = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 6, fatigue: 3, soreness: 3 }] }, today);
  assert.equal(mid.readiness, 60);
  assert.match(mid.action, /garde une marge/);
  // AUCUN check-in daté du jour → action générique, readiness null (une readiness d'hier n'engage pas).
  const none = L.adaptiveCoachFocus({ workouts, recovery: [{ date: '2026-07-10', sleep: 8, fatigue: 1, soreness: 1 }] }, today);
  assert.equal(none.pillar, 'sport');
  assert.equal(none.readiness, null);
  assert.match(none.action, /séance/);
});

test('adaptiveCoachFocus : le crédit de suivi (reinforce) n’écrase pas l’action « lève le pied »', () => {
  const today = '2026-07-16';
  // Sport en bon élan (série 13-14-15 finissant hier → tone reinforce) + suivi élevé des caps
  // (coachLog sport les 3 jours, tous honorés → followThrough 100 %). Mais readiness AU PLANCHER
  // aujourd'hui (15/100). Le crédit de suivi appendait « Un jour actif de plus aujourd'hui » PAR-DESSUS
  // l'action de récup (l. 5533) : « repose-toi » vs « fais un jour actif de plus » le même jour. Son
  // garde-fou ne testait que loadSpike, or loadSpike est MUTUELLEMENT EXCLUSIF de readiness < 50 → il ne
  // couvrait jamais ce cas. L'action doit rester le conseil de récup ; le crédit reste dans l'insight.
  const coachLog = [
    { date: '2026-07-13', pillar: 'sport' },
    { date: '2026-07-14', pillar: 'sport' },
    { date: '2026-07-15', pillar: 'sport' },
  ];
  const workouts = [{ date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-15' }];
  const low = L.adaptiveCoachFocus({
    workouts, coachLog,
    recovery: [{ date: today, sleep: 3, fatigue: 5, soreness: 5 }],
  }, today);
  assert.equal(low.pillar, 'sport');
  assert.equal(low.tone, 'reinforce');
  assert.equal(low.readiness, 15);
  assert.equal(low.followThrough, 100, 'le suivi est bien crédité');
  assert.match(low.insight, /Tu as tenu 3\/3 de mes caps/, 'crédit du suivi conservé dans l’insight');
  assert.match(low.action, /récupération prioritaire/, 'l’action reste le conseil de récup');
  assert.doesNotMatch(low.action, /jour actif de plus/, 'le crédit ne réécrit plus l’action de récup');

  // Forme qui GLISSE (readiness 60, tendance -12+ sur ≥ 4 check-ins → readinessSlide) : « séance
  // allégée » ne doit pas non plus se faire écraser (2ᵉ des trois signaux « garde léger »).
  const slide = L.adaptiveCoachFocus({
    workouts, coachLog,
    recovery: [
      { date: '2026-07-09', sleep: 8, fatigue: 1, soreness: 1 },
      { date: '2026-07-11', sleep: 7, fatigue: 2, soreness: 2 },
      { date: '2026-07-13', sleep: 6, fatigue: 3, soreness: 3 },
      { date: today, sleep: 6, fatigue: 3, soreness: 3 },
    ],
  }, today);
  assert.equal(slide.tone, 'reinforce');
  assert.ok(slide.readinessSlide != null, 'forme qui glisse détectée');
  assert.match(slide.action, /Séance allégée aujourd’hui/, 'l’action « garde léger » reste');
  assert.doesNotMatch(slide.action, /jour actif de plus/);

  // Garde-fou anti-sur-correction : readiness AU VERT (pas un jour « lève le pied ») → le message de
  // renfort « un jour actif de plus » reste bien affiché (comportement inchangé).
  const green = L.adaptiveCoachFocus({
    workouts, coachLog,
    recovery: [{ date: today, sleep: 8, fatigue: 1, soreness: 1 }],
  }, today);
  assert.equal(green.tone, 'reinforce');
  assert.equal(green.readiness, 100);
  assert.match(green.action, /jour actif de plus/, 'hors état « lève le pied » : le renfort reste');
});

test('adaptiveCoachFocus : le crédit de suivi (reinforce) n’écrase pas l’action d’un pilier NON-sport', () => {
  const today = '2026-07-16';
  // Sommeil en HAUSSE (5 nuits cette semaine vs 2 la précédente → tone reinforce, pilier sommeil) et
  // suivi élevé des caps (coachLog sommeil ×3 tous honorés → followThrough 100 %). Le crédit du suivi
  // réécrivait l’action en « Un jour actif de plus aujourd’hui… » — une saveur SPORTIVE qui n’a aucun
  // sens pour le sommeil (une nuit ne se « fait » pas dans la journée) et écrasait l’action riche
  // pilier-spécifique « Vise un coucher 30 min plus tôt ce soir ». On borne désormais l’écrasement au
  // pilier sport : hors sport, l’action pilier reste, le crédit demeure dans l’insight.
  const recovery = [
    { date: '2026-07-03', sleep: 7 }, { date: '2026-07-04', sleep: 7 },
    { date: '2026-07-10', sleep: 8, bedtime: '23:30' }, { date: '2026-07-11', sleep: 8, bedtime: '23:20' },
    { date: '2026-07-12', sleep: 8, bedtime: '23:10' }, { date: '2026-07-13', sleep: 8, bedtime: '23:05' },
    { date: '2026-07-14', sleep: 8, bedtime: '23:00' }, { date: '2026-07-15', sleep: 8, bedtime: '22:50' },
  ];
  const coachLog = [
    { date: '2026-07-13', pillar: 'sommeil' },
    { date: '2026-07-14', pillar: 'sommeil' },
    { date: '2026-07-15', pillar: 'sommeil' },
  ];
  const sleep = L.adaptiveCoachFocus({ recovery, coachLog }, today);
  assert.equal(sleep.pillar, 'sommeil');
  assert.equal(sleep.tone, 'reinforce');
  assert.equal(sleep.rotated, false);
  assert.equal(sleep.followThrough, 100, 'le suivi est bien crédité');
  assert.match(sleep.insight, /Tu as tenu 3\/3 de mes caps/, 'crédit du suivi conservé dans l’insight');
  assert.match(sleep.action, /coucher 30 min plus tôt/, 'l’action pilier sommeil reste');
  assert.doesNotMatch(sleep.action, /jour actif de plus/, 'plus de slogan sportif sur un pilier sommeil');
});

test('adaptiveCoachFocus : readinessDrag nomme le frein DOMINANT de la forme du jour', () => {
  const today = '2026-07-16';
  const workouts = [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }];
  // Courbatures dominantes (sommeil 8, fatigue 1, courbatures 5 → score 70, sore déficit 30 seul) → note « courbatures ».
  const sore = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 8, fatigue: 1, soreness: 5 }] }, today);
  assert.equal(sore.readiness, 70);
  assert.deepEqual(sore.readinessDrag, { factor: 'soreness', value: 5 });
  assert.match(sore.action, /Ce qui pèse le plus : tes courbatures \(5\/5\)/);
  assert.match(sore.action, /épargne les groupes musculaires déjà douloureux/);
  // Fatigue dominante (fatigue 5 seule) → note « fatigue générale ».
  const fat = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 8, fatigue: 5, soreness: 1 }] }, today);
  assert.deepEqual(fat.readinessDrag, { factor: 'fatigue', value: 5 });
  assert.match(fat.action, /Ce qui pèse le plus : ta fatigue générale \(5\/5\)/);
  // Nuit courte dominante (3 h, reste bon) → note « nuit courte », score < 75.
  const sleepDrag = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 3, fatigue: 2, soreness: 1 }] }, today);
  assert.equal(sleepDrag.readinessDrag.factor, 'sleep');
  assert.match(sleepDrag.action, /Ce qui pèse le plus : ta nuit courte \(3 h\)/);
  // Tous les freins au max (aucun coupable unique) → readinessDrag null, note absente.
  const allBad = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 3, fatigue: 5, soreness: 5 }] }, today);
  assert.equal(allBad.readinessDrag, null);
  assert.doesNotMatch(allBad.action, /Ce qui pèse le plus/);
  // readiness au vert (≥ 75) → rien à expliquer, readinessDrag null.
  const green = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 8, fatigue: 1, soreness: 1 }] }, today);
  assert.equal(green.readinessDrag, null);
  // Pilier non-sport → readinessDrag toujours null (défaut).
  const focusPillar = L.adaptiveCoachFocus({ focusSessions: [{ date: '2026-06-20', minutes: 30 }] }, today);
  assert.notEqual(focusPillar.pillar, 'sport');
  assert.equal(focusPillar.readinessDrag, null);
});

test('adaptiveCoachFocus : reinforce × readiness plancher retire « Garde le rythme » (contradiction insight/action)', () => {
  const today = '2026-07-16';
  // Dynamique en hausse (3 j récents vs 1 j précédent) → ton reinforce, insight « … en hausse. Garde le rythme. ».
  const workouts = [{ date: '2026-07-15' }, { date: '2026-07-14' }, { date: '2026-07-12' }, { date: '2026-07-09' }];
  // Forme au plancher AUJOURD'HUI → l'action dit « récupération prioritaire, pas de grosse séance ».
  const low = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 4, fatigue: 5, soreness: 4 }] }, today);
  assert.equal(low.tone, 'reinforce');
  assert.ok(low.readiness != null && low.readiness < 50, 'readiness plancher (< 50)');
  assert.match(low.action, /récupération prioritaire/);
  assert.doesNotMatch(low.insight, /Garde le rythme/, 'l’injonction à continuer est retirée quand l’action dit de se reposer');
  assert.match(low.insight, /en hausse\./, 'le constat hebdo « en hausse » reste');
  assert.doesNotMatch(low.insight, /\.\s{2,}/, 'pas de double espace après le retrait');
  // Forme au vert → aucun conflit, « Garde le rythme » conservé.
  const green = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 8, fatigue: 1, soreness: 1 }] }, today);
  assert.equal(green.tone, 'reinforce');
  assert.ok(green.readiness >= 50);
  assert.match(green.insight, /Garde le rythme/, 'readiness au vert → l’injonction reste');
  // Pas de check-in du jour → readiness inconnu, aucun conflit à désamorcer → conservé.
  const none = L.adaptiveCoachFocus({ workouts }, today);
  assert.equal(none.tone, 'reinforce');
  assert.equal(none.readiness, null);
  assert.match(none.insight, /Garde le rythme/, 'sans check-in du jour → l’injonction reste');
});

test('adaptiveCoachFocus : reinforce × frein hors seuil (glisse/pic) retire aussi « Garde le rythme »', () => {
  const today = '2026-07-20';
  const dk = off => { const d = new Date('2026-07-20T12:00:00'); d.setDate(d.getDate() - off); return d.toISOString().slice(0, 10); };
  // Dynamique sport en hausse (4 j récents vs 2 j précédents) → ton reinforce, insight « … en hausse. Garde le rythme. ».
  const workouts = [{ date: dk(1) }, { date: dk(2) }, { date: dk(4) }, { date: dk(6) }, { date: dk(8) }, { date: dk(10) }];
  // CAS glisse : readiness du jour 60 (∈ [50,75)) mais tendance -40 sur 5 check-ins → readinessSlide, action « séance allégée ».
  const slide = L.adaptiveCoachFocus({ workouts, recovery: [
    { date: dk(7), sleep: 8, fatigue: 1, soreness: 1 }, { date: dk(5), sleep: 7.5, fatigue: 1, soreness: 2 },
    { date: dk(3), sleep: 7, fatigue: 2, soreness: 2 }, { date: dk(1), sleep: 6.5, fatigue: 3, soreness: 2 },
    { date: today, sleep: 6, fatigue: 3, soreness: 3 },
  ] }, today);
  assert.equal(slide.tone, 'reinforce');
  assert.ok(slide.readiness >= 50 && slide.readiness < 75, 'readiness en zone médiane (hors seuil #573)');
  assert.ok(slide.readinessSlide != null, 'forme qui glisse détectée');
  assert.match(slide.action, /Séance allégée/);
  assert.doesNotMatch(slide.insight, /Garde le rythme/, 'la glisse retire l’injonction contradictoire');
  assert.match(slide.insight, /en hausse\./, 'le constat hebdo « en hausse » reste');
  assert.doesNotMatch(slide.insight, /\.\s{2,}/, 'pas de double espace après le retrait');
  // CAS pic de charge : sans check-in du jour (readiness null), ACWR en pic → loadSpike, action « allège ».
  const spike = L.adaptiveCoachFocus({ workouts: [
    { date: dk(1), duration: 90, effort: 4 }, { date: dk(2), duration: 90, effort: 4 },
    { date: dk(4), duration: 90, effort: 4 }, { date: dk(6), duration: 90, effort: 4 },
    { date: dk(8), duration: 30, effort: 2 }, { date: dk(10), duration: 30, effort: 2 },
  ] }, today);
  assert.equal(spike.tone, 'reinforce');
  assert.equal(spike.readiness, null);
  assert.ok(spike.loadSpike != null, 'pic de charge détecté');
  assert.match(spike.action, /allège aujourd’hui/);
  assert.doesNotMatch(spike.insight, /Garde le rythme/, 'le pic de charge retire l’injonction contradictoire');
  // CAS pic de charge AVEC séance DÉJÀ faite aujourd'hui (doneToday) — P5.2/#579. loadSpike n'est PAS
  // calculé (garde de prescription : !doneToday), mais le Bilan hebdo verrait toujours le pic → « Garde
  // le rythme. » doit quand même être retiré (contradiction inter-panneaux mesurée par le fuzzer #577).
  const spikeDoneWk = [
    { date: today, duration: 90, effort: 4 }, { date: dk(1), duration: 90, effort: 4 },
    { date: dk(2), duration: 90, effort: 4 }, { date: dk(4), duration: 90, effort: 4 },
    { date: dk(6), duration: 90, effort: 4 }, { date: dk(8), duration: 30, effort: 2 },
    { date: dk(10), duration: 30, effort: 2 },
  ];
  const spikeDone = L.adaptiveCoachFocus({ workouts: spikeDoneWk }, today);
  assert.equal(spikeDone.tone, 'reinforce');
  assert.equal(spikeDone.doneToday, true, 'séance du jour déjà loggée');
  assert.equal(spikeDone.loadSpike, null, 'loadSpike muet quand la séance est déjà faite (garde de prescription)');
  assert.equal(L.acuteChronicRatio(spikeDoneWk, today).zone, 'high', 'préalable : le Bilan hebdo verrait bien un pic ce jour-là');
  assert.doesNotMatch(spikeDone.insight, /Garde le rythme/, 'doneToday : le pic retire quand même l’injonction (cohérence avec le Bilan hebdo)');
  assert.match(spikeDone.insight, /en hausse\./, 'le constat hebdo « en hausse » reste');
  assert.doesNotMatch(spikeDone.insight, /\.\s{2,}/, 'pas de double espace après le retrait');
  // NON-RÉGRESSION : montée SAINE (ACWR non-pic) un jour doneToday → « Garde le rythme. » CONSERVÉ.
  const healthyDoneWk = [
    { date: today, duration: 45, effort: 3 }, { date: dk(2), duration: 45, effort: 3 },
    { date: dk(4), duration: 45, effort: 3 }, { date: dk(6), duration: 45, effort: 3 },
    { date: dk(9), duration: 45, effort: 3 }, { date: dk(11), duration: 45, effort: 3 },
    { date: dk(13), duration: 45, effort: 3 }, { date: dk(15), duration: 45, effort: 3 },
    { date: dk(18), duration: 45, effort: 3 }, { date: dk(20), duration: 45, effort: 3 },
    { date: dk(22), duration: 45, effort: 3 }, { date: dk(25), duration: 45, effort: 3 },
  ];
  const healthyDone = L.adaptiveCoachFocus({ workouts: healthyDoneWk }, today);
  assert.equal(healthyDone.tone, 'reinforce');
  assert.equal(healthyDone.doneToday, true);
  assert.notEqual(L.acuteChronicRatio(healthyDoneWk, today).zone, 'high', 'préalable : charge régulière, pas de pic');
  assert.match(healthyDone.insight, /Garde le rythme/, 'montée saine doneToday → l’injonction reste (non-régression)');
});

test('adaptiveCoachFocus : readinessBoost nomme le MOTEUR de la forme au vert (pendant positif)', () => {
  const today = '2026-07-16';
  const workouts = [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }];
  // Belle nuit (9 h) dominante, forme au vert (score 85) → moteur SOMMEIL nommé.
  const sleep = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 9, fatigue: 2, soreness: 2 }] }, today);
  assert.equal(sleep.pillar, 'sport');
  assert.equal(sleep.readiness, 85);
  assert.deepEqual(sleep.readinessBoost, { factor: 'sleep', value: 9 });
  assert.match(sleep.action, /prêt à pousser/);
  assert.match(sleep.action, /Ce qui te porte aujourd’hui : ta nuit de 9 h/);
  assert.match(sleep.action, /le vrai moteur de ta forme/);
  assert.equal(sleep.readinessDrag, null); // ≥ 75 → drag muet, boost prend le relais
  // Énergie au top (fatigue 1) dominante, score 75 → moteur FATIGUE (fraîcheur).
  const fat = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 6, fatigue: 1, soreness: 3 }] }, today);
  assert.equal(fat.readiness, 75);
  assert.deepEqual(fat.readinessBoost, { factor: 'fatigue', value: 1 });
  assert.match(fat.action, /Ce qui te porte aujourd’hui : ton énergie est au top \(fatigue 1\/5\)/);
  // Muscles frais (courbatures 1) dominants, score 75 → moteur COURBATURES.
  const sore = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 6, fatigue: 3, soreness: 1 }] }, today);
  assert.deepEqual(sore.readinessBoost, { factor: 'soreness', value: 1 });
  assert.match(sore.action, /Ce qui te porte aujourd’hui : tes muscles sont frais, sans courbatures \(1\/5\)/);
  // Tout au top à égalité (score 100, aucun moteur unique) → readinessBoost null, note absente.
  const allTop = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 8, fatigue: 1, soreness: 1 }] }, today);
  assert.equal(allTop.readiness, 100);
  assert.equal(allTop.readinessBoost, null);
  assert.doesNotMatch(allTop.action, /Ce qui te porte aujourd’hui/);
  // Forme sous le vert (score 70 < 75) → readinessBoost null (terrain de readinessDrag).
  const below = L.adaptiveCoachFocus({ workouts, recovery: [{ date: today, sleep: 8, fatigue: 1, soreness: 5 }] }, today);
  assert.ok(below.readiness < 75);
  assert.equal(below.readinessBoost, null);
  // Pilier non-sport → readinessBoost toujours null (défaut).
  const focusPillar = L.adaptiveCoachFocus({ focusSessions: [{ date: '2026-06-20', minutes: 30 }] }, today);
  assert.notEqual(focusPillar.pillar, 'sport');
  assert.equal(focusPillar.readinessBoost, null);
});

test('adaptiveCoachFocus : action sport tempérée par un PIC de charge (ACWR)', () => {
  const today = '2026-07-16';
  // Charge en pic : 3 séances LOURDES sur 7 j (durée 100 × effort 3 = load 300) après 3 semaines
  // légères → ratio aigu/chronique ≈ 3,6 (> 1,5, zone « high »). Momentum en hausse → sport, reinforce.
  const spikeWk = [
    { date: '2026-07-10', duration: 100, effort: 3 },
    { date: '2026-07-12', duration: 100, effort: 3 },
    { date: '2026-07-14', duration: 100, effort: 3 },
    { date: '2026-07-05', duration: 30, effort: 1 },
    { date: '2026-07-08', duration: 30, effort: 1 },
    { date: '2026-06-28', duration: 30, effort: 1 },
  ];
  // Sans check-in du jour (readiness null), le coach voit quand même le pic et allège.
  const spike = L.adaptiveCoachFocus({ workouts: spikeWk }, today);
  assert.equal(spike.pillar, 'sport');
  assert.equal(spike.tone, 'reinforce');
  assert.equal(spike.comeback, false);
  assert.ok(spike.loadSpike != null && spike.loadSpike > 1.5, 'ratio en zone high renvoyé');
  assert.match(spike.action, /Charge en hausse brutale/);
  assert.match(spike.action, /allège aujourd’hui/);
  // readiness au VERT (100) : corps frais mais charge bondie → on crédite la forme et on redirige vers
  // la qualité, PAS « pousse le volume ».
  const spikeFresh = L.adaptiveCoachFocus({ workouts: spikeWk, recovery: [{ date: today, sleep: 8, fatigue: 1, soreness: 1 }] }, today);
  assert.equal(spikeFresh.pillar, 'sport');
  assert.equal(spikeFresh.readiness, 100);
  assert.ok(spikeFresh.loadSpike != null);
  assert.match(spikeFresh.action, /Forme au vert/);
  assert.match(spikeFresh.action, /consolidation/);
  assert.doesNotMatch(spikeFresh.action, /prêt à pousser/);
  // readiness BASSE (< 50) : l'action « récup » prime déjà, le pic ne double pas dessus (loadSpike null).
  const spikeLow = L.adaptiveCoachFocus({ workouts: spikeWk, recovery: [{ date: today, sleep: 3, fatigue: 5, soreness: 5 }] }, today);
  assert.ok(spikeLow.readiness != null && spikeLow.readiness < 50);
  assert.equal(spikeLow.loadSpike, null, 'readiness basse → action récup, pas de doublon de charge');
  assert.match(spikeLow.action, /récupération prioritaire|mobilité/);
  // Le créneau sport est COUPÉ par le pic (« cale ta séance » contredirait « allège »).
  const spikeSlot = L.adaptiveCoachFocus({ workouts: spikeWk, agenda: [{ id: 'a', date: today, time: '09:00', durationMin: 60 }] }, today, { nowMinutes: 555 });
  assert.ok(spikeSlot.loadSpike != null);
  assert.equal(spikeSlot.sportSlot, null, 'pic de charge → pas de créneau à caler');
  // Charge RÉGULIÈRE (2 séances/semaine sur 4 semaines, load constant) → ratio ≈ 1 (optimal),
  // loadSpike null, action générique/readiness intacte.
  const steady = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-11', duration: 45, effort: 2 }, { date: '2026-07-15', duration: 45, effort: 2 },
    { date: '2026-07-05', duration: 45, effort: 2 }, { date: '2026-07-08', duration: 45, effort: 2 },
    { date: '2026-06-30', duration: 45, effort: 2 }, { date: '2026-07-02', duration: 45, effort: 2 },
    { date: '2026-06-22', duration: 45, effort: 2 }, { date: '2026-06-25', duration: 45, effort: 2 },
  ] }, today);
  assert.equal(steady.pillar, 'sport');
  assert.equal(steady.loadSpike, null, 'charge régulière → pas de pic');
  assert.doesNotMatch(steady.action, /Charge en hausse brutale|consolidation/);
});

test('adaptiveCoachFocus : action sport tempérée par une READINESS QUI GLISSE (tendance)', () => {
  const today = '2026-07-16';
  // Décrochage sport (3 j la semaine passée, 1 récente, sans durée/effort → aucun pic de charge) → sport, rebuild.
  const workouts = [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }];
  // Readiness EN GLISSADE : sommeil constant 8 h (donc pilier sommeil sain, non urgent), fatigue/courbatures
  // qui montent → 100 → 85 → 70 → 63 → 55. Aujourd'hui 55 (zone 50-74) mais chute de -45 pts sur 5 check-ins.
  const slideRec = [
    { date: '2026-07-04', sleep: 8, fatigue: 1, soreness: 1 }, // 100
    { date: '2026-07-06', sleep: 8, fatigue: 2, soreness: 2 }, // 85
    { date: '2026-07-10', sleep: 8, fatigue: 3, soreness: 3 }, // 70
    { date: '2026-07-13', sleep: 8, fatigue: 3, soreness: 4 }, // 63
    { date: '2026-07-16', sleep: 8, fatigue: 4, soreness: 4 }, // 55
  ];
  const slide = L.adaptiveCoachFocus({ workouts, recovery: slideRec }, today);
  assert.equal(slide.pillar, 'sport', 'sport reste le focus (sommeil régulier → non prioritaire)');
  assert.equal(slide.readiness, 55, 'readiness du jour dans la zone d’alerte douce');
  assert.equal(slide.readinessSlide, -45, 'tendance descendante de -45 pts renvoyée');
  assert.equal(slide.loadSpike, null, 'aucune donnée de charge → pas de pic');
  assert.match(slide.action, /ta forme glisse sur tes 5 derniers check-ins \(-45 pts\)/);
  assert.match(slide.action, /fatigue qui s’accumule/);
  assert.match(slide.action, /Séance allégée aujourd’hui/);
  assert.doesNotMatch(slide.action, /séance correcte, mais garde une marge/);

  // JOUR AU VERT (≥ 75) même en tendance descendante → pas d'alerte : glisser depuis très haut reste bénin.
  const highRec = [
    { date: '2026-07-04', sleep: 8, fatigue: 1, soreness: 1 }, // 100
    { date: '2026-07-06', sleep: 8, fatigue: 1, soreness: 1 }, // 100
    { date: '2026-07-10', sleep: 8, fatigue: 1, soreness: 2 }, // 93
    { date: '2026-07-13', sleep: 8, fatigue: 2, soreness: 1 }, // 93
    { date: '2026-07-16', sleep: 8, fatigue: 2, soreness: 2 }, // 85
  ];
  const high = L.adaptiveCoachFocus({ workouts, recovery: highRec }, today);
  assert.equal(high.readiness, 85);
  assert.equal(high.readinessSlide, null, 'jour au vert → pas d’alerte fatigue cumulée');
  assert.match(high.action, /prêt à pousser|vraie séance/);

  // Forme STABLE (tous les check-ins ~63) → tendance plate, pas d'alerte.
  const flatRec = ['2026-07-04', '2026-07-06', '2026-07-10', '2026-07-13', '2026-07-16']
    .map(date => ({ date, sleep: 8, fatigue: 3, soreness: 4 })); // 63 chacun
  const flat = L.adaptiveCoachFocus({ workouts, recovery: flatRec }, today);
  assert.equal(flat.readiness, 63);
  assert.equal(flat.readinessSlide, null, 'forme stable → pas de glissade');
  assert.match(flat.action, /garde une marge/);

  // Jour DÉJÀ BAS (< 50) : l'action « récup » prime déjà, pas de doublon de tendance (readinessSlide null).
  const lowRec = [
    { date: '2026-07-04', sleep: 8, fatigue: 1, soreness: 1 }, // 100
    { date: '2026-07-06', sleep: 8, fatigue: 2, soreness: 2 }, // 85
    { date: '2026-07-10', sleep: 8, fatigue: 4, soreness: 4 }, // 55
    { date: '2026-07-13', sleep: 8, fatigue: 5, soreness: 4 }, // 48
    { date: '2026-07-16', sleep: 8, fatigue: 5, soreness: 5 }, // 40
  ];
  const low = L.adaptiveCoachFocus({ workouts, recovery: lowRec }, today);
  assert.ok(low.readiness != null && low.readiness < 50);
  assert.equal(low.readinessSlide, null, 'readiness basse → action récup, pas de doublon de tendance');
  assert.match(low.action, /récupération prioritaire|mobilité/);
});

test('adaptiveCoachFocus : action sport rehaussée par une READINESS QUI REMONTE (rebound)', () => {
  const today = '2026-07-16';
  // Même décrochage sport que le test glissade (aucune durée/effort → pas de pic de charge).
  const workouts = [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }];
  // Readiness EN REMONTÉE : sommeil constant 8 h, fatigue/courbatures qui BAISSENT → 40 → 48 → 55 → 63 → 70.
  // Aujourd'hui 70 (zone 50-74) mais hausse de +30 pts sur 5 check-ins : le corps réencaisse.
  const upRec = [
    { date: '2026-07-04', sleep: 8, fatigue: 5, soreness: 5 }, // 40
    { date: '2026-07-06', sleep: 8, fatigue: 5, soreness: 4 }, // 48
    { date: '2026-07-10', sleep: 8, fatigue: 4, soreness: 4 }, // 55
    { date: '2026-07-13', sleep: 8, fatigue: 3, soreness: 4 }, // 63
    { date: '2026-07-16', sleep: 8, fatigue: 3, soreness: 3 }, // 70
  ];
  const up = L.adaptiveCoachFocus({ workouts, recovery: upRec }, today);
  assert.equal(up.pillar, 'sport', 'sport reste le focus');
  assert.equal(up.readiness, 70, 'readiness du jour dans la zone [50, 75[');
  assert.equal(up.readinessRebound, 30, 'tendance montante de +30 pts renvoyée');
  assert.equal(up.readinessSlide, null, 'pente montante → jamais de glissade en même temps');
  assert.equal(up.loadSpike, null, 'aucune donnée de charge → pas de pic');
  assert.match(up.action, /ta forme remonte franchement sur tes 5 derniers check-ins \(\+30 pts\)/);
  assert.match(up.action, /réhausser un peu l’intensité/);
  assert.doesNotMatch(up.action, /séance correcte, mais garde une marge/);

  // Forme STABLE (~63 partout) → tendance plate : ni glissade ni remontée, l'action garde la marge.
  const flatRec = ['2026-07-04', '2026-07-06', '2026-07-10', '2026-07-13', '2026-07-16']
    .map(date => ({ date, sleep: 8, fatigue: 3, soreness: 4 })); // 63 chacun
  const flat = L.adaptiveCoachFocus({ workouts, recovery: flatRec }, today);
  assert.equal(flat.readinessRebound, null, 'forme stable → pas de remontée');
  assert.equal(flat.readinessSlide, null, 'forme stable → pas de glissade');
  assert.match(flat.action, /garde une marge/);

  // Un PIC DE CHARGE coïncidant avec la remontée reprend la main : « réencaisse » ne vaut pas « ajoute
  // du volume brutalement » (loadSpike tempère l'action, readinessRebound reste dans le champ, informatif).
  const spikeWk = [
    // Chronique faible (4 semaines) puis semaine aiguë chargée → ACWR en zone 'high'.
    { date: '2026-06-22', duration: 30, effort: 2 }, { date: '2026-06-29', duration: 30, effort: 2 },
    { date: '2026-07-06', duration: 30, effort: 2 },
    { date: '2026-07-13', duration: 90, effort: 5 }, { date: '2026-07-14', duration: 90, effort: 5 },
    { date: '2026-07-15', duration: 90, effort: 5 },
  ];
  const spike = L.adaptiveCoachFocus({ workouts: spikeWk, recovery: upRec }, today);
  if (spike.pillar === 'sport' && spike.loadSpike != null) {
    assert.equal(spike.readinessRebound, 30, 'la remontée reste renvoyée dans le champ malgré le pic');
    assert.match(spike.action, /charge|volume|consolidation/i);
    assert.doesNotMatch(spike.action, /réhausser un peu l’intensité/);
  }
});

test('adaptiveCoachFocus : action sport rehaussée par une SOUS-CHARGE (ACWR zone low)', () => {
  const today = '2026-07-16';
  // Base chronique régulière (6 séances 50 min × effort 4 sur 4 semaines) puis semaine récente ALLÉGÉE
  // (1 seule séance identique) → ratio aigu/chronique ≈ 0,57 (< 0,8, zone « low »).
  const lowWk = [
    { date: '2026-06-22', duration: 50, effort: 4 }, { date: '2026-06-25', duration: 50, effort: 4 },
    { date: '2026-06-29', duration: 50, effort: 4 }, { date: '2026-07-02', duration: 50, effort: 4 },
    { date: '2026-07-06', duration: 50, effort: 4 }, { date: '2026-07-09', duration: 50, effort: 4 },
    { date: '2026-07-13', duration: 50, effort: 4 },
  ];
  const low = L.adaptiveCoachFocus({ workouts: lowWk }, today);
  assert.equal(low.pillar, 'sport');
  assert.ok(low.lowLoad != null && low.lowLoad < 0.8, 'ratio en zone low renvoyé');
  assert.equal(low.loadSpike, null, 'sous-charge → pas de pic (zones exclusives)');
  assert.match(low.action, /Tu es en sous-charge/);
  assert.match(low.action, /ton volume habituel/);
  assert.match(low.action, /progressivement vers ta base/);

  // Forme QUI REMONTE en plus de la sous-charge → deux feux verts concordants, message « Fenêtre idéale ».
  const upRec = [
    { date: '2026-07-04', sleep: 8, fatigue: 5, soreness: 5 }, { date: '2026-07-06', sleep: 8, fatigue: 5, soreness: 4 },
    { date: '2026-07-10', sleep: 8, fatigue: 4, soreness: 4 }, { date: '2026-07-13', sleep: 8, fatigue: 3, soreness: 4 },
    { date: '2026-07-16', sleep: 8, fatigue: 3, soreness: 3 },
  ];
  const both = L.adaptiveCoachFocus({ workouts: lowWk, recovery: upRec }, today);
  assert.equal(both.readiness, 70);
  assert.equal(both.readinessRebound, 30, 'la remontée reste renvoyée dans le champ');
  assert.ok(both.lowLoad != null && both.lowLoad < 0.8, 'sous-charge aussi renvoyée');
  assert.match(both.action, /Fenêtre idéale/);
  assert.match(both.action, /ta forme remonte ET ta charge/);

  // Forme QUI GLISSE (readinessSlide) → « garde léger » prime, la sous-charge NE réécrit PAS l'action.
  const slideRec = [
    { date: '2026-07-04', sleep: 8, fatigue: 1, soreness: 1 }, { date: '2026-07-06', sleep: 8, fatigue: 2, soreness: 2 },
    { date: '2026-07-10', sleep: 8, fatigue: 3, soreness: 3 }, { date: '2026-07-13', sleep: 8, fatigue: 3, soreness: 4 },
    { date: '2026-07-16', sleep: 8, fatigue: 4, soreness: 4 },
  ];
  const slide = L.adaptiveCoachFocus({ workouts: lowWk, recovery: slideRec }, today);
  assert.equal(slide.readinessSlide, -45, 'glissade détectée');
  assert.equal(slide.lowLoad, null, 'forme qui glisse → pas d’incitation à remonter le volume');
  assert.doesNotMatch(slide.action, /sous-charge/);

  // Charge RÉGULIÈRE (ratio ≈ 1, zone optimal) → lowLoad null, action inchangée.
  const okWk = [
    { date: '2026-07-11', duration: 50, effort: 4 }, { date: '2026-07-15', duration: 50, effort: 4 },
    { date: '2026-07-05', duration: 50, effort: 4 }, { date: '2026-07-08', duration: 50, effort: 4 },
    { date: '2026-06-30', duration: 50, effort: 4 }, { date: '2026-07-02', duration: 50, effort: 4 },
  ];
  const ok = L.adaptiveCoachFocus({ workouts: okWk }, today);
  assert.equal(ok.lowLoad, null, 'charge régulière → pas de sous-charge');
  assert.doesNotMatch(ok.action, /sous-charge/);
});

test('adaptiveCoachFocus : mémoire anti-radotage — varie d’angle après 3 jours du même focus', () => {
  const today = '2026-07-16';
  // sommeil = tier 0 (3 j la semaine passée, 1 cette semaine) ; sport = tier 2 (décrochage léger).
  const base = {
    recovery: [{ date: '2026-07-04', sleep: 7 }, { date: '2026-07-05', sleep: 7 }, { date: '2026-07-06', sleep: 7 }, { date: '2026-07-14', sleep: 7 }],
    workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-15' }],
  };
  // Sans journal : le sommeil (plus gros décrochage) est le focus.
  const f0 = L.adaptiveCoachFocus(base, today);
  assert.equal(f0.pillar, 'sommeil'); assert.ok(!f0.rotated);
  // 2 jours de suite seulement → pas encore de rotation.
  const log2 = [{ date: '2026-07-14', pillar: 'sommeil' }, { date: '2026-07-15', pillar: 'sommeil' }];
  assert.equal(L.adaptiveCoachFocus({ ...base, coachLog: log2 }, today).pillar, 'sommeil');
  // 3 jours de suite → on passe au 2e pilier à corriger (sport), marqué rotated.
  const log3 = [{ date: '2026-07-13', pillar: 'sommeil' }, ...log2];
  const f3 = L.adaptiveCoachFocus({ ...base, coachLog: log3 }, today);
  assert.equal(f3.pillar, 'sport'); assert.ok(f3.rotated); assert.match(f3.insight, /varie les angles/);
  // Un jour différent intercalé casse la série → sommeil revient.
  const logBroken = [{ date: '2026-07-13', pillar: 'sommeil' }, { date: '2026-07-14', pillar: 'sport' }, { date: '2026-07-15', pillar: 'sommeil' }];
  assert.equal(L.adaptiveCoachFocus({ ...base, coachLog: logBroken }, today).pillar, 'sommeil');
  // Un seul pilier à corriger → on bascule en renfort du meilleur élan (reinforce).
  const solo = {
    recovery: base.recovery,
    focusSessions: [{ date: '2026-07-14', minutes: 25 }, { date: '2026-07-15', minutes: 25 }],
    coachLog: log3,
  };
  const fs = L.adaptiveCoachFocus(solo, today);
  assert.equal(fs.pillar, 'focus'); assert.equal(fs.tone, 'reinforce'); assert.ok(fs.rotated);
  // L'alternance ne tourne JAMAIS, même après 3 jours.
  const alt = L.adaptiveCoachFocus({ applications: [{ id: 1, company: 'A', status: 'postule', date: '2026-07-10' }], coachLog: [{ date: '2026-07-13', pillar: 'alternance' }, { date: '2026-07-14', pillar: 'alternance' }, { date: '2026-07-15', pillar: 'alternance' }] }, today);
  assert.equal(alt.pillar, 'alternance');
});

test('adaptiveCoachFocus : coach conscient du sommeil (alerte + cible du plan)', () => {
  const today = '2026-07-16';
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const iso = off => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  // 7 nuits courtes ET irrégulières → sleepCoachInsight en alerte
  const recovery = [4, 8, 4, 8, 4, 8, 4].map((h, i) => ({ date: iso(i), sleep: h }));
  assert.equal(L.sleepCoachInsight(recovery, today).tone, 'urgent', 'les données sont bien en alerte');
  // + un décrochage sport (3 séances la semaine passée, 1 récente) : sans promotion, le sport gagnerait.
  const workouts = [iso(8), iso(9), iso(10), iso(1)].map(d => ({ date: d, type: 'muscu' }));
  const f = L.adaptiveCoachFocus({ recovery, workouts }, today);
  assert.equal(f.pillar, 'sommeil', 'un sommeil en alerte prime sur un simple creux de momentum');
  assert.match(f.headline, /sommeil/i);
  assert.ok(/court|irr[ée]guli/i.test(f.insight), 'insight = verdict chiffré du coach sommeil, pas un compteur générique');
  // plan de recalage actif → l'action donne la CIBLE de coucher du soir.
  const plan = { active: true, startTime: '01:00', targetTime: '23:00', startKey: iso(6), stepDays: 3, stepMin: 15 };
  const fp = L.adaptiveCoachFocus({ recovery, workouts, sleepPlan: plan }, today);
  assert.match(fp.action, /\d{1,2}:\d{2}/, 'action = heure de coucher visée par le plan');
  // sommeil solide → aucune promotion : un vrai creux ailleurs reste le focus.
  const good = [8, 8, 8, 8, 8, 8, 8].map((h, i) => ({ date: iso(i), sleep: h }));
  assert.notEqual(L.adaptiveCoachFocus({ recovery: good, workouts }, today).pillar, 'sommeil');

  // PREUVE d'impact citée : sommeil en alerte + couchers qui prouvent leur effet (tôt = +énergie).
  const recImpact = [], mr = [];
  for (let i = 0; i < 4; i++) { const d = iso(i * 2); recImpact.push({ date: d, sleep: 6, bedtime: '22:00' }); mr.push({ date: d, energy: 4 }); }
  for (let i = 0; i < 4; i++) { const d = iso(i * 2 + 1); recImpact.push({ date: d, sleep: 5, bedtime: '01:00' }); mr.push({ date: d, energy: 2 }); }
  const fi = L.adaptiveCoachFocus({ recovery: recImpact, morningRituals: mr }, today);
  assert.equal(fi.pillar, 'sommeil', 'court + irrégulier → focus sommeil');
  assert.match(fi.action, /couché tôt = \+\d/, 'l’action cite la preuve d’impact chiffrée');
});

test('adaptiveCoachFocus : coach conscient de la PENTE de sommeil (dégradation / remontée)', () => {
  const today = '2026-07-16';
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const iso = off => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const workouts = [iso(8), iso(9), iso(10), iso(1)].map(d => ({ date: d, type: 'muscu' })); // décrochage sport
  // DÉGRADATION : semaine récente courte + irrégulière (urgent) ET plus basse que la précédente.
  const down = [];
  for (let i = 0; i < 7; i++) down.push({ date: iso(i), sleep: i % 2 ? 7 : 3 });      // récente ~4,7 h, irrégulière
  for (let i = 7; i < 14; i++) down.push({ date: iso(i), sleep: 7 });                  // précédente 7 h
  const fd = L.adaptiveCoachFocus({ recovery: down, workouts }, today);
  assert.equal(fd.pillar, 'sommeil', 'sommeil urgent → focus');
  assert.ok(fd.sleepTrend < 0, 'pente descendante → delta négatif renvoyé');
  assert.match(fd.insight, /la pente s’enfonce/, 'l’insight nuance le verdict par la dégradation');
  // REMONTÉE : semaine récente toujours courte + irrégulière (urgent) mais plus HAUTE que la précédente.
  const up = [];
  for (let i = 0; i < 7; i++) up.push({ date: iso(i), sleep: i % 2 ? 3 : 7 });         // récente ~5,3 h, irrégulière
  for (let i = 7; i < 14; i++) up.push({ date: iso(i), sleep: 3 });                    // précédente 3 h
  const fu = L.adaptiveCoachFocus({ recovery: up, workouts }, today);
  assert.equal(fu.pillar, 'sommeil');
  assert.ok(fu.sleepTrend > 0, 'pente montante → delta positif renvoyé');
  assert.match(fu.insight, /ça remonte/, 'l’insight crédite le progrès');
  assert.doesNotMatch(fu.insight, /la pente s’enfonce/, 'jamais les deux notes le même jour');
  // STABLE : même sommeil court+irrégulier les deux semaines (motif identique) → pas de note, sleepTrend null.
  const flat = [];
  for (let i = 0; i < 14; i++) flat.push({ date: iso(i), sleep: (i % 7) % 2 ? 7 : 3 });
  const ff = L.adaptiveCoachFocus({ recovery: flat, workouts }, today);
  assert.equal(ff.pillar, 'sommeil');
  assert.equal(ff.sleepTrend, null, 'pente plate → aucune note de tendance');
  assert.doesNotMatch(ff.insight, /la pente s’enfonce|ça remonte/);
  // Champ TOUJOURS présent, y compris hors pilier sommeil (focus prioritaire ailleurs).
  const sport = L.adaptiveCoachFocus({ workouts: [iso(1), iso(3), iso(5)].map(d => ({ date: d })) }, today);
  assert.ok('sleepTrend' in sport && sport.sleepTrend === null, 'sleepTrend toujours renvoyé, null hors sommeil');
});

test('adaptiveCoachFocus : coach conscient de la PENTE de régularité du coucher', () => {
  const today = '2026-07-16';
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const iso = off => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const workouts = [iso(8), iso(9), iso(10), iso(1)].map(d => ({ date: d, type: 'muscu' }));
  // DURÉE stable et courte les deux semaines (sleepTrend restera null : pente plate) → focus sommeil (court).
  // COUCHER qui SE DISPERSE : semaine récente éparpillée, précédente serrée.
  const disp = [];
  for (let i = 0; i < 7; i++) disp.push({ date: iso(i), sleep: 6, bedtime: i % 2 ? '02:00' : '22:00' });
  for (let i = 7; i < 14; i++) disp.push({ date: iso(i), sleep: 6, bedtime: '23:30' });
  const fd = L.adaptiveCoachFocus({ recovery: disp, workouts }, today);
  assert.equal(fd.pillar, 'sommeil', 'sommeil court → focus');
  assert.equal(fd.sleepTrend, null, 'durée plate → pas de note de durée');
  assert.ok(fd.sleepBedtimeTrend > 0, 'coucher qui se disperse → delta positif renvoyé');
  assert.match(fd.insight, /ton coucher se disperse/, 'l’insight nuance par la dispersion');
  // COUCHER qui SE RESSERRE : l'inverse → crédit, sleepBedtimeTrend négatif, jamais « se disperse ».
  const tight = [];
  for (let i = 0; i < 7; i++) tight.push({ date: iso(i), sleep: 6, bedtime: '23:30' });
  for (let i = 7; i < 14; i++) tight.push({ date: iso(i), sleep: 6, bedtime: i % 2 ? '02:00' : '22:00' });
  const ft = L.adaptiveCoachFocus({ recovery: tight, workouts }, today);
  assert.equal(ft.pillar, 'sommeil');
  assert.ok(ft.sleepBedtimeTrend < 0, 'coucher qui se resserre → delta négatif');
  assert.match(ft.insight, /ton coucher se régularise/, 'l’insight crédite la régularisation');
  assert.doesNotMatch(ft.insight, /ton coucher se disperse/, 'jamais les deux notes');
  // MUTUELLEMENT EXCLUSIF avec la pente de DURÉE : durée qui s'enfonce ET coucher dispersé → une SEULE
  // note (la durée prime), sleepBedtimeTrend reste null.
  const both = [];
  for (let i = 0; i < 7; i++) both.push({ date: iso(i), sleep: i % 2 ? 7 : 3, bedtime: i % 2 ? '02:00' : '22:00' });
  for (let i = 7; i < 14; i++) both.push({ date: iso(i), sleep: 7, bedtime: '23:30' });
  const fb = L.adaptiveCoachFocus({ recovery: both, workouts }, today);
  assert.ok(fb.sleepTrend < 0, 'la durée qui s’enfonce prend la main');
  assert.equal(fb.sleepBedtimeTrend, null, 'une seule note de pente à la fois');
  // Champ TOUJOURS présent, y compris hors pilier sommeil.
  const sport = L.adaptiveCoachFocus({ workouts: [iso(1), iso(3), iso(5)].map(d => ({ date: d })) }, today);
  assert.ok('sleepBedtimeTrend' in sport && sport.sleepBedtimeTrend === null, 'sleepBedtimeTrend toujours renvoyé, null hors sommeil');
  // COHÉRENCE (#457-suite) : sommeil SOLIDE (verdict « rythme régulier », tone 'ok') mais coucher qui
  // se disperse RÉCEMMENT → PAS de note « se disperse » (elle contredirait « rythme régulier »). Le
  // bloc coucher est gardé par tone !== 'ok', comme la note de durée.
  const solidButRecentlyDispersing = [];
  for (let i = 0; i < 7; i++) solidButRecentlyDispersing.push({ date: iso(i), sleep: 8, bedtime: i % 2 ? '23:50' : '23:10' }); // récent : dispersion ~20 min
  for (let i = 7; i < 14; i++) solidButRecentlyDispersing.push({ date: iso(i), sleep: 8, bedtime: '23:30' }); // précédent : serré
  const solid = L.adaptiveCoachFocus({ recovery: solidButRecentlyDispersing }, today);
  assert.match(solid.insight, /Sommeil solide/, 'verdict solide (tone ok)');
  assert.doesNotMatch(solid.insight, /ton coucher se disperse/, 'pas de note contradictoire quand le sommeil est solide');
});

test('adaptiveCoachFocus : protège la fenêtre de coucher quand un RDV du soir déborde (sommeil)', () => {
  const today = '2026-07-16';
  const pad = n => (n < 10 ? '0' + n : '' + n);
  const iso = off => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const recovery = [4, 8, 4, 8, 4, 8, 4].map((h, i) => ({ date: iso(i), sleep: h })); // court + irrégulier → alerte
  const workouts = [iso(8), iso(9), iso(10), iso(1)].map(d => ({ date: d, type: 'muscu' }));
  const plan = { active: true, startTime: '01:00', targetTime: '23:00', startKey: iso(6), stepDays: 3, stepMin: 15 };
  const pd = L.sleepPlanDay(plan, recovery, today);
  const tgt = pd.reached ? pd.goalTime : pd.targetTime;       // cible de coucher (souvent dans les petites heures ici)
  const tgtAnchor = L.bedtimeAnchor(tgt);
  // RDV du soir qui finit 20 min APRÈS la cible → mord sur la fenêtre (sas d'endormissement de 30 min).
  const startAnchor = tgtAnchor + 20 - 60;                    // 60 min de RDV, fin = cible + 20
  const startTime = L.minutesToTime((startAnchor + 720) % 1440); // ancre → HH:MM (inverse de bedtimeAnchor)
  const agenda = [{ id: 1, title: 'Dîner famille', date: today, time: startTime, durationMin: 60, kind: 'life' }];
  const f = L.adaptiveCoachFocus({ recovery, workouts, sleepPlan: plan, agenda }, today);
  assert.equal(f.pillar, 'sommeil');
  assert.equal(f.sleepConflict, startTime, 'le RDV menaçant est signalé par son heure de début');
  assert.match(f.action, /Dîner famille/, 'l’action nomme le RDV qui déborde');
  assert.match(f.action, /prot[èe]ge ta fen[êe]tre/i, 'l’action invite à protéger la fenêtre du soir');
  assert.match(f.action, new RegExp(tgt), 'l’action rappelle la cible de coucher');
  // GESTE CONCRET : le RDV finit APRÈS la cible → coucher réaliste = fin du RDV (cible + 20), proposé en repli.
  const realBed = L.bedtimeFromAnchor(tgtAnchor + 20);
  assert.equal(f.sleepConflictBedtime, realBed, 'coucher réaliste = fin du RDV quand la cible saute');
  assert.match(f.action, new RegExp('finit vers ' + realBed), 'l’action donne l’heure de coucher réaliste');
  assert.match(f.action, /couche-toi dès sa fin/, 'l’action propose de se coucher dès la fin plutôt que de repousser');
  // RDV qui finit DANS le sas mais AVANT la cible (cible − 15) → la cible tient : « file au lit », pas de repli.
  const startAnchorB = (tgtAnchor - 15) - 60;
  const startTimeB = L.minutesToTime((startAnchorB + 720) % 1440);
  const agendaB = [{ id: 9, title: 'Ciné', date: today, time: startTimeB, durationMin: 60, kind: 'life' }];
  const fB = L.adaptiveCoachFocus({ recovery, workouts, sleepPlan: plan, agenda: agendaB }, today);
  assert.equal(fB.sleepConflict, startTimeB, 'un RDV dans le sas d’endormissement menace encore la fenêtre');
  assert.equal(fB.sleepConflictBedtime, null, 'la cible tient encore → aucun coucher de repli');
  assert.match(fB.action, /file au lit dès sa fin/, 'l’action invite à filer au lit dès la fin');
  assert.match(fB.action, /prot[ée]ger ta fen[êe]tre/i, 'l’action protège toujours la fenêtre du soir');
  // RDV du soir qui finit BIEN AVANT (cible − 30) → aucune menace.
  const early = [{ id: 2, title: 'Apéro', date: today, time: '18:00', durationMin: 60, kind: 'life' }];
  const fe = L.adaptiveCoachFocus({ recovery, workouts, sleepPlan: plan, agenda: early }, today);
  assert.equal(fe.sleepConflict, null, 'un RDV du soir qui finit tôt ne menace pas la fenêtre');
  assert.ok(!/prot[èe]ge ta fen[êe]tre/i.test(fe.action));
  // RDV en journée (commence avant 17:00) → jamais considéré, même long.
  const day = [{ id: 3, title: 'Réunion', date: today, time: '14:00', durationMin: 180, kind: 'life' }];
  assert.equal(L.adaptiveCoachFocus({ recovery, workouts, sleepPlan: plan, agenda: day }, today).sleepConflict, null);
  // Sans plan actif → pas de cible concrète → pas de détection, même avec un RDV tardif.
  const noPlan = L.adaptiveCoachFocus({ recovery, workouts, agenda }, today);
  assert.equal(noPlan.pillar, 'sommeil');
  assert.equal(noPlan.sleepConflict, null, 'sans plan de recalage, aucune cible à protéger');
  // Autre pilier (sommeil solide → un creux ailleurs) → sleepConflict null.
  const good = [8, 8, 8, 8, 8, 8, 8].map((h, i) => ({ date: iso(i), sleep: h }));
  const fs = L.adaptiveCoachFocus({ recovery: good, workouts, sleepPlan: plan, agenda }, today);
  assert.notEqual(fs.pillar, 'sommeil');
  assert.equal(fs.sleepConflict, null, 'le garde-fenêtre ne concerne que le pilier sommeil');
});

test('adaptiveCoachFocus : parle en fonction des objectifs perso (hebdo calendaire)', () => {
  const today = '2026-07-16'; // jeudi → lundi de la semaine = 2026-07-13
  // sport en décrochage (3 j la semaine passée, 1 cette semaine) + objectif 4 séances/sem
  const sport = { workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-15' }], goals: { sessions: 4 } };
  const f1 = L.adaptiveCoachFocus(sport, today);
  assert.equal(f1.pillar, 'sport');
  assert.match(f1.insight, /Objectif hebdo : 1\/4 séances\./, 'séances de la semaine calendaire vs objectif perso');
  // sans objectif défini → pas de ligne objectif
  assert.ok(!/Objectif hebdo/.test(L.adaptiveCoachFocus({ workouts: sport.workouts }, today).insight));
  // focus en décrochage → objectif minutes (25 min faites cette semaine / cible 120)
  const focus = { focusSessions: [{ date: '2026-07-05', minutes: 30 }, { date: '2026-07-06', minutes: 30 }, { date: '2026-07-07', minutes: 30 }, { date: '2026-07-14', minutes: 25 }] };
  const f2 = L.adaptiveCoachFocus(focus, today);
  assert.equal(f2.pillar, 'focus');
  assert.match(f2.insight, /Objectif hebdo : 25\/120 min de focus\./);
});

test('adaptiveCoachFocus : allure de l’objectif de séances hebdo (faisabilité vs jours restants)', () => {
  // Semaine calendaire : lundi 2026-07-13 → dimanche 2026-07-19. Objectif 4 séances, 1 faite (lundi).
  const g = { goals: { sessions: 4 } };
  // Mardi : 3 séances à caser sur 6 jours restants → DANS LES TEMPS.
  const onpace = L.adaptiveCoachFocus({ ...g, workouts: [{ date: '2026-07-13' }] }, '2026-07-14');
  assert.equal(onpace.pillar, 'sport');
  assert.equal(onpace.sessionGoalPace, 'onpace');
  assert.match(onpace.insight, /Dans les temps : 3 séances en 6 jours restants/);
  // Vendredi : 3 séances pour 3 jours restants → SERRÉ (une chaque jour).
  const tight = L.adaptiveCoachFocus({ ...g, workouts: [{ date: '2026-07-13' }] }, '2026-07-17');
  assert.equal(tight.sessionGoalPace, 'tight');
  assert.match(tight.insight, /Serré mais jouable : 3 séances pour 3 jours restants/);
  // Samedi : 3 séances pour 2 jours restants → HORS DE PORTÉE (recadrage doux).
  const unreach = L.adaptiveCoachFocus({ ...g, workouts: [{ date: '2026-07-13' }] }, '2026-07-18');
  assert.equal(unreach.sessionGoalPace, 'unreachable');
  assert.match(unreach.insight, /ne passera plus cette semaine \(3 séances pour 2 jours restants\)/);
  // Dimanche, séance du jour déjà faite → 0 jour restant utile, la semaine se termine.
  const closed = L.adaptiveCoachFocus({ ...g, workouts: [{ date: '2026-07-19' }] }, '2026-07-19');
  assert.equal(closed.sessionGoalPace, 'unreachable');
  assert.match(closed.insight, /La semaine se termine à 1\/4/);
  // Objectif déjà tenu (4 dates distinctes) → pas d'allure, le « déjà tenu » suffit.
  const done = L.adaptiveCoachFocus({ ...g, workouts: [
    { date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-15' }, { date: '2026-07-16' },
  ] }, '2026-07-17');
  assert.equal(done.sessionGoalPace, null);
  assert.match(done.insight, /Objectif hebdo déjà tenu : 4\/4 séances 💪/);
  // Sans objectif défini → champ null, aucune note d'allure.
  const noGoal = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-13' }] }, '2026-07-14');
  assert.equal(noGoal.sessionGoalPace, null);
  assert.ok(!/Dans les temps|Serré|ne passera plus/.test(noGoal.insight));
});

test('adaptiveCoachFocus : réconciliation objectif serré × forme à plat (restOverGoal)', () => {
  // Vendredi 2026-07-17 (semaine lundi 07-13 → dim 07-19). Objectif 4 séances, 1 faite → 3 pour 3 j
  // restants = allure SERRÉE. Check-in du jour à plat (readiness 15/100). Les deux consignes se
  // contredisent (« une chaque jour » vs « repose ») → le coach tranche : la récup prime.
  const conflict = L.adaptiveCoachFocus({
    goals: { sessions: 4 }, workouts: [{ date: '2026-07-13' }],
    recovery: [{ date: '2026-07-17', sleep: 3, fatigue: 5, soreness: 5 }],
  }, '2026-07-17');
  assert.equal(conflict.pillar, 'sport');
  assert.equal(conflict.sessionGoalPace, 'tight');
  assert.equal(conflict.readiness, 15);
  assert.equal(conflict.restOverGoal, 15);
  assert.match(conflict.insight, /ta forme est à plat aujourd’hui \(readiness 15\/100\)/);
  assert.match(conflict.insight, /la récup prime sur le chiffre/);
  assert.match(conflict.action, /récupération prioritaire/); // l'action de récup reste intacte
  // Forme au VERT le même jour serré → aucun conflit, restOverGoal null (le coach dit « pousse »).
  const fresh = L.adaptiveCoachFocus({
    goals: { sessions: 4 }, workouts: [{ date: '2026-07-13' }],
    recovery: [{ date: '2026-07-17', sleep: 8, fatigue: 1, soreness: 1 }],
  }, '2026-07-17');
  assert.equal(fresh.sessionGoalPace, 'tight');
  assert.equal(fresh.restOverGoal, null);
  assert.ok(!/forme est à plat/.test(fresh.insight));
  // Forme à plat mais allure LARGE (mardi, dans les temps) → pas de conflit à désamorcer → null.
  const loose = L.adaptiveCoachFocus({
    goals: { sessions: 4 }, workouts: [{ date: '2026-07-13' }],
    recovery: [{ date: '2026-07-14', sleep: 3, fatigue: 5, soreness: 5 }],
  }, '2026-07-14');
  assert.equal(loose.sessionGoalPace, 'onpace');
  assert.equal(loose.restOverGoal, null);
  assert.ok(!/forme est à plat/.test(loose.insight));
});

test('adaptiveCoachFocus : prendre de l’avance côté sport (sessionGoalAhead)', () => {
  // Mardi 07-14 (semaine lundi 07-13 → dim 07-19). Objectif 4 séances, 1 faite (lundi) → 3 pour 6 j
  // restants = allure LARGE (onpace). Check-in du jour AU VERT (readiness ≥ 75) et séance du jour PAS
  // encore faite → le coach invite à engranger une séance d'avance (coussin).
  const ahead = L.adaptiveCoachFocus({
    goals: { sessions: 4 }, workouts: [{ date: '2026-07-13' }],
    recovery: [{ date: '2026-07-14', sleep: 8, fatigue: 1, soreness: 1 }],
  }, '2026-07-14');
  assert.equal(ahead.pillar, 'sport');
  assert.equal(ahead.sessionGoalPace, 'onpace');
  assert.equal(ahead.sessionGoalAhead, 100);
  assert.match(ahead.insight, /ton corps est au vert ce matin \(readiness 100\/100\)/);
  assert.match(ahead.insight, /engranger une séance d’avance/);
  assert.match(ahead.insight, /coussin qui met l’objectif à l’abri/);
  // Forme MOYENNE le même jour large (6/3/3 → 60) → aucune invitation (au vert seulement).
  const mid = L.adaptiveCoachFocus({
    goals: { sessions: 4 }, workouts: [{ date: '2026-07-13' }],
    recovery: [{ date: '2026-07-14', sleep: 6, fatigue: 3, soreness: 3 }],
  }, '2026-07-14');
  assert.equal(mid.sessionGoalPace, 'onpace');
  assert.equal(mid.sessionGoalAhead, null);
  assert.ok(!/engranger une séance d’avance/.test(mid.insight));
  // Séance du jour DÉJÀ faite (07-14) × forme au vert → le coussin est pris, pas de 2ᵉ séance poussée.
  const doneToday = L.adaptiveCoachFocus({
    goals: { sessions: 4 }, workouts: [{ date: '2026-07-13' }, { date: '2026-07-14' }],
    recovery: [{ date: '2026-07-14', sleep: 8, fatigue: 1, soreness: 1 }],
  }, '2026-07-14');
  assert.equal(doneToday.sessionGoalPace, 'onpace');
  assert.equal(doneToday.sessionGoalAhead, null);
  assert.ok(!/engranger une séance d’avance/.test(doneToday.insight));
  // Sans check-in du jour → objectif large muet sur la forme, sessionGoalAhead null.
  const noCheckin = L.adaptiveCoachFocus({
    goals: { sessions: 4 }, workouts: [{ date: '2026-07-13' }],
  }, '2026-07-14');
  assert.equal(noCheckin.sessionGoalPace, 'onpace');
  assert.equal(noCheckin.sessionGoalAhead, null);
  // Allure SERRÉE (vendredi 07-17) × forme au vert → branche tight, sessionGoalAhead null.
  const tight = L.adaptiveCoachFocus({
    goals: { sessions: 4 }, workouts: [{ date: '2026-07-13' }],
    recovery: [{ date: '2026-07-17', sleep: 8, fatigue: 1, soreness: 1 }],
  }, '2026-07-17');
  assert.equal(tight.sessionGoalPace, 'tight');
  assert.equal(tight.sessionGoalAhead, null);
  assert.ok(!/engranger une séance d’avance/.test(tight.insight));
});

test('adaptiveCoachFocus : séance bonus libre côté sport, objectif bouclé (sessionGoalBonus)', () => {
  // Mercredi 07-15 (semaine lundi 07-13 → dim 07-19). Objectif 2 séances, 2 faites (lun+mar) → objectif
  // hebdo DÉJÀ tenu. Check-in du jour AU VERT (8/1/1 → 100) et séance du jour PAS encore faite → le coach
  // cadre toute séance de plus en bonus libre, sans pression du compteur.
  const bonus = L.adaptiveCoachFocus({
    goals: { sessions: 2 }, workouts: [{ date: '2026-07-13' }, { date: '2026-07-14' }],
    recovery: [{ date: '2026-07-15', sleep: 8, fatigue: 1, soreness: 1 }],
  }, '2026-07-15');
  assert.equal(bonus.pillar, 'sport');
  assert.equal(bonus.sessionGoalPace, null, 'objectif bouclé → aucune allure (branche done)');
  assert.equal(bonus.sessionGoalBonus, 100);
  assert.match(bonus.insight, /Objectif hebdo déjà tenu : 2\/2 séances 💪/);
  assert.match(bonus.insight, /ta forme est au top ce matin \(readiness 100\/100\)/);
  assert.match(bonus.insight, /objectif de séances déjà dans la poche/);
  assert.match(bonus.insight, /chaque séance en plus est du gain offert/);
  // Forme MOYENNE le même jour (6/3/3 → 60) × objectif bouclé → aucun mot (au vert seulement).
  const mid = L.adaptiveCoachFocus({
    goals: { sessions: 2 }, workouts: [{ date: '2026-07-13' }, { date: '2026-07-14' }],
    recovery: [{ date: '2026-07-15', sleep: 6, fatigue: 3, soreness: 3 }],
  }, '2026-07-15');
  assert.equal(mid.sessionGoalBonus, null);
  assert.ok(!/du gain offert/.test(mid.insight));
  // Séance du jour DÉJÀ faite (07-15) × forme au vert → le bonus est pris, pas de 2ᵉ séance poussée.
  const doneToday = L.adaptiveCoachFocus({
    goals: { sessions: 2 }, workouts: [{ date: '2026-07-13' }, { date: '2026-07-15' }],
    recovery: [{ date: '2026-07-15', sleep: 8, fatigue: 1, soreness: 1 }],
  }, '2026-07-15');
  assert.equal(doneToday.sessionGoalBonus, null);
  assert.ok(!/du gain offert/.test(doneToday.insight));
  // Sans check-in du jour → objectif bouclé muet sur la forme, sessionGoalBonus null.
  const noCheckin = L.adaptiveCoachFocus({
    goals: { sessions: 2 }, workouts: [{ date: '2026-07-13' }, { date: '2026-07-14' }],
  }, '2026-07-15');
  assert.equal(noCheckin.sessionGoalBonus, null);
  // Mutuellement exclusif : objectif NON tenu (onpace) × readiness au vert → sessionGoalBonus null
  // (c’est sessionGoalAhead qui parle sur la marge, pas le bonus).
  const onpace = L.adaptiveCoachFocus({
    goals: { sessions: 4 }, workouts: [{ date: '2026-07-13' }],
    recovery: [{ date: '2026-07-15', sleep: 8, fatigue: 1, soreness: 1 }],
  }, '2026-07-15');
  assert.equal(onpace.sessionGoalPace, 'onpace');
  assert.equal(onpace.sessionGoalBonus, null);
});

test('adaptiveCoachFocus : réconciliation objectif serré × pic de charge (loadOverGoal)', () => {
  const today = '2026-07-16'; // jeudi, semaine lundi 07-13 → dim 07-19 (4 jours restants, aujourd'hui compris)
  // Charge en pic : 3 séances lourdes récentes après 3 semaines légères → ACWR zone 'high'. Une seule
  // de ces séances (07-14) tombe dans la semaine calendaire → wc = 1. Objectif 5 → 4 séances pour 4 j
  // restants = allure SERRÉE. Les deux consignes se contredisent (« une chaque jour » vs « allège »).
  const spikeWk = [
    { date: '2026-07-10', duration: 100, effort: 3 },
    { date: '2026-07-12', duration: 100, effort: 3 },
    { date: '2026-07-14', duration: 100, effort: 3 },
    { date: '2026-07-05', duration: 30, effort: 1 },
    { date: '2026-07-08', duration: 30, effort: 1 },
    { date: '2026-06-28', duration: 30, effort: 1 },
  ];
  const conflict = L.adaptiveCoachFocus({ goals: { sessions: 5 }, workouts: spikeWk }, today);
  assert.equal(conflict.pillar, 'sport');
  assert.equal(conflict.sessionGoalPace, 'tight');
  assert.ok(conflict.loadSpike != null && conflict.loadSpike > 1.5, 'pic de charge détecté');
  assert.equal(conflict.loadOverGoal, conflict.loadSpike, 'loadOverGoal = le ratio du pic');
  assert.match(conflict.insight, /ta charge est en pic cette semaine/);
  assert.match(conflict.insight, /tempérer prime sur le chiffre/);
  assert.match(conflict.action, /Charge en hausse brutale|allège/); // l'action de charge reste intacte
  // Charge RÉGULIÈRE (pas de pic) mais objectif serré → aucun conflit à désamorcer, loadOverGoal null.
  const noSpike = L.adaptiveCoachFocus({ goals: { sessions: 5 }, workouts: [
    { date: '2026-07-14' }, { date: '2026-07-07' }, { date: '2026-07-03' },
  ] }, today);
  assert.equal(noSpike.sessionGoalPace, 'tight');
  assert.equal(noSpike.loadSpike, null, 'aucune charge chiffrée → pas de pic');
  assert.equal(noSpike.loadOverGoal, null);
  assert.ok(!/charge est en pic cette semaine/.test(noSpike.insight));
  // Pic de charge mais objectif LARGE (2 séances → 1 pour 4 j = dans les temps) → pas de conflit → null.
  const loose = L.adaptiveCoachFocus({ goals: { sessions: 2 }, workouts: spikeWk }, today);
  assert.equal(loose.sessionGoalPace, 'onpace');
  assert.ok(loose.loadSpike != null, 'le pic est bien là');
  assert.equal(loose.loadOverGoal, null, 'objectif large → aucune pression à désamorcer');
  assert.ok(!/charge est en pic cette semaine/.test(loose.insight));
});

test('adaptiveCoachFocus : pic de charge × objectif serré RENFORCÉ par une forme qui glisse (loadOverGoalSlide)', () => {
  const today = '2026-07-16'; // jeudi, semaine lundi 07-13 → dim 07-19
  const spikeWk = [
    { date: '2026-07-10', duration: 100, effort: 3 },
    { date: '2026-07-12', duration: 100, effort: 3 },
    { date: '2026-07-14', duration: 100, effort: 3 },
    { date: '2026-07-05', duration: 30, effort: 1 },
    { date: '2026-07-08', duration: 30, effort: 1 },
    { date: '2026-06-28', duration: 30, effort: 1 },
  ];
  // Readiness EN GLISSADE finissant à 55 (zone [50,75)) : 100 → 85 → 70 → 63 → 55, chute -45 sur 5 check-ins.
  const slideRec = [
    { date: '2026-07-04', sleep: 8, fatigue: 1, soreness: 1 }, // 100
    { date: '2026-07-06', sleep: 8, fatigue: 2, soreness: 2 }, // 85
    { date: '2026-07-10', sleep: 8, fatigue: 3, soreness: 3 }, // 70
    { date: '2026-07-13', sleep: 8, fatigue: 3, soreness: 4 }, // 63
    { date: '2026-07-16', sleep: 8, fatigue: 4, soreness: 4 }, // 55
  ];
  // Pic de charge + objectif serré + forme qui glisse EN MÊME TEMPS → note FERME, loadOverGoalSlide = le delta.
  const compound = L.adaptiveCoachFocus({ goals: { sessions: 5 }, workouts: spikeWk, recovery: slideRec }, today);
  assert.equal(compound.pillar, 'sport');
  assert.equal(compound.sessionGoalPace, 'tight');
  assert.ok(compound.loadOverGoal != null && compound.loadOverGoal === compound.loadSpike, 'le conflit de charge est bien là');
  assert.equal(compound.readinessSlide, -45, 'la forme glisse en parallèle');
  assert.equal(compound.loadOverGoalSlide, -45, 'le delta de glissade est renvoyé quand les deux signaux coïncident');
  assert.match(compound.insight, /ta forme glisse en parallèle \(-45 pts sur tes derniers check-ins\)/);
  assert.match(compound.insight, /deux signaux de fatigue qui se cumulent/);
  assert.match(compound.insight, /la seule option saine/);
  assert.doesNotMatch(compound.insight, /tempérer prime sur le chiffre/, 'le registre doux est remplacé par le ferme');

  // Pic + objectif serré mais forme STABLE (pas de glissade) → note DOUCE d'origine, loadOverGoalSlide null.
  const flatRec = ['2026-07-04', '2026-07-06', '2026-07-10', '2026-07-13', '2026-07-16']
    .map(date => ({ date, sleep: 8, fatigue: 3, soreness: 4 })); // 63 chacun, tendance plate
  const stable = L.adaptiveCoachFocus({ goals: { sessions: 5 }, workouts: spikeWk, recovery: flatRec }, today);
  assert.equal(stable.sessionGoalPace, 'tight');
  assert.ok(stable.loadOverGoal != null, 'le conflit de charge est toujours là');
  assert.equal(stable.readinessSlide, null, 'forme stable → pas de glissade');
  assert.equal(stable.loadOverGoalSlide, null, 'sans glissade, pas de renfort');
  assert.match(stable.insight, /tempérer prime sur le chiffre/, 'la note douce d’origine est conservée');
  assert.doesNotMatch(stable.insight, /deux signaux de fatigue/);

  // Sans conflit de charge du tout (charge régulière) → loadOverGoalSlide null même si la forme glisse.
  const noSpike = L.adaptiveCoachFocus({ goals: { sessions: 5 }, workouts: [
    { date: '2026-07-14' }, { date: '2026-07-07' }, { date: '2026-07-03' },
  ], recovery: slideRec }, today);
  assert.equal(noSpike.loadOverGoal, null);
  assert.equal(noSpike.loadOverGoalSlide, null, 'pas de pic → pas de renfort de charge');
});

test('adaptiveCoachFocus : réconciliation POSITIVE objectif serré × sous-charge (lowLoadUnderGoal)', () => {
  const today = '2026-07-16'; // jeudi, semaine lundi 07-13 → dim 07-19, 4 jours restants incl. aujourd'hui
  // Base chronique régulière puis semaine allégée (1 séance récente, sur 07-13 = lundi de la semaine) →
  // ratio aigu/chronique en zone « low ». La séance du 07-13 compte pour l'objectif hebdo (wc=1).
  const lowWk = [
    { date: '2026-06-22', duration: 50, effort: 4 }, { date: '2026-06-25', duration: 50, effort: 4 },
    { date: '2026-06-29', duration: 50, effort: 4 }, { date: '2026-07-02', duration: 50, effort: 4 },
    { date: '2026-07-06', duration: 50, effort: 4 }, { date: '2026-07-09', duration: 50, effort: 4 },
    { date: '2026-07-13', duration: 50, effort: 4 },
  ];
  // Objectif serré (5 séances, 1 faite → 4 à caser pour 4 jours) ET sous-charge → deux feux verts qui S'ALIGNENT.
  const align = L.adaptiveCoachFocus({ goals: { sessions: 5 }, workouts: lowWk }, today);
  assert.equal(align.pillar, 'sport');
  assert.equal(align.sessionGoalPace, 'tight', 'objectif rendu serré par le calendrier');
  assert.ok(align.lowLoad != null && align.lowLoad < 0.8, 'sous-charge détectée');
  assert.equal(align.lowLoadUnderGoal, align.lowLoad, 'lowLoadUnderGoal = le ratio de sous-charge');
  assert.match(align.insight, /cette cadence serrée tombe pile/);
  assert.match(align.insight, /LE moment de pousser pour boucler l’objectif/);
  assert.match(align.action, /Tu es en sous-charge/, 'l’action de sous-charge reste intacte');
  assert.equal(align.lowLoadUnderGoalRebound, null, 'sans forme qui remonte → note à deux signaux');
  assert.match(align.insight, /Les deux signaux s’alignent/, 'registre « deux signaux » par défaut');

  // TRIPLE feu vert : objectif serré + sous-charge + forme qui REMONTE (readinessRebound) → trois signaux
  // concordants, la note s'enthousiasme et les nomme. Recovery en remontée 40→70 (+30 pts sur 5 check-ins),
  // readiness du jour 70 (zone [50,75[), sommeil constant 8 h — même setup que le test readinessRebound.
  const upRec = [
    { date: '2026-07-04', sleep: 8, fatigue: 5, soreness: 5 }, { date: '2026-07-06', sleep: 8, fatigue: 5, soreness: 4 },
    { date: '2026-07-10', sleep: 8, fatigue: 4, soreness: 4 }, { date: '2026-07-13', sleep: 8, fatigue: 3, soreness: 4 },
    { date: '2026-07-16', sleep: 8, fatigue: 3, soreness: 3 },
  ];
  const triple = L.adaptiveCoachFocus({ goals: { sessions: 5 }, workouts: lowWk, recovery: upRec }, today);
  assert.equal(triple.sessionGoalPace, 'tight', 'objectif toujours serré');
  assert.ok(triple.lowLoad != null && triple.lowLoad < 0.8, 'sous-charge toujours détectée');
  assert.equal(triple.lowLoadUnderGoal, triple.lowLoad, 'lowLoadUnderGoal toujours renvoyé');
  assert.equal(triple.readinessRebound, 30, 'forme qui remonte de +30 pts');
  assert.equal(triple.lowLoadUnderGoalRebound, 30, 'le delta positif de la remontée renvoyé');
  assert.match(triple.insight, /trois feux verts concordants/);
  assert.match(triple.insight, /ta forme remonte franchement \(\+30 pts/);
  assert.match(triple.insight, /LE moment de pousser pour boucler l’objectif/);
  assert.doesNotMatch(triple.insight, /Les deux signaux s’alignent/, 'la note à deux signaux est remplacée');
  assert.match(triple.action, /Fenêtre idéale/, 'l’action de sous-charge (renforcée par le rebond) reste intacte');

  // Objectif LARGE (onpace) + sous-charge → pas de cadence quotidienne à soutenir, lowLoadUnderGoal null.
  const loose = L.adaptiveCoachFocus({ goals: { sessions: 2 }, workouts: lowWk }, today);
  assert.equal(loose.sessionGoalPace, 'onpace');
  assert.ok(loose.lowLoad != null, 'la sous-charge est toujours là');
  assert.equal(loose.lowLoadUnderGoal, null, 'objectif large → aucune opportunité à nommer');
  assert.doesNotMatch(loose.insight, /cette cadence serrée tombe pile/);

  // Sous-charge SANS objectif défini → lowLoadUnderGoal null (rien à réconcilier).
  const noGoal = L.adaptiveCoachFocus({ workouts: lowWk }, today);
  assert.ok(noGoal.lowLoad != null);
  assert.equal(noGoal.lowLoadUnderGoal, null, 'pas d’objectif → pas de note');

  // Objectif serré mais charge RÉGULIÈRE (pas de sous-charge) → lowLoad null → lowLoadUnderGoal null.
  const okWk = [
    { date: '2026-07-15', duration: 50, effort: 4 }, { date: '2026-07-11', duration: 50, effort: 4 },
    { date: '2026-07-08', duration: 50, effort: 4 }, { date: '2026-07-05', duration: 50, effort: 4 },
    { date: '2026-07-02', duration: 50, effort: 4 }, { date: '2026-06-30', duration: 50, effort: 4 },
  ];
  const steady = L.adaptiveCoachFocus({ goals: { sessions: 5 }, workouts: okWk }, today);
  assert.equal(steady.sessionGoalPace, 'tight', 'objectif serré aussi ici');
  assert.equal(steady.lowLoad, null, 'charge régulière → pas de sous-charge');
  assert.equal(steady.lowLoadUnderGoal, null, 'sans sous-charge, pas de note positive');
});

test('adaptiveCoachFocus : allure de l’objectif de focus hebdo (min/jour vs jours restants)', () => {
  // Semaine calendaire : lundi 2026-07-13 → dimanche 2026-07-19. Cible par défaut 120 min.
  // Focus seul pilier renseigné → toujours choisi. Session lundi 07-13 = 30 min faites cette semaine.
  const base = min => ({ focusSessions: [{ date: '2026-07-05', minutes: 30 }, { date: '2026-07-13', minutes: min }] });
  // Mardi : 90 min à répartir sur 6 jours restants → ~15 min/jour → DANS LES TEMPS.
  const onpace = L.adaptiveCoachFocus(base(30), '2026-07-14');
  assert.equal(onpace.pillar, 'focus');
  assert.equal(onpace.focusGoalPace, 'onpace');
  assert.match(onpace.insight, /Dans les temps : ~15 min\/jour sur les 6 jours restants/);
  // Dimanche (dernier jour) : 90 min pour 1 seul jour → un gros bloc → SERRÉ.
  const tight = L.adaptiveCoachFocus(base(30), '2026-07-19');
  assert.equal(tight.focusGoalPace, 'tight');
  assert.match(tight.insight, /Serré : 90 min restantes pour 1 jour — cale un vrai bloc d’~90 min chaque jour/);
  // Sans check-in de récup du jour → pas de note « feu vert », focusGoalFresh null.
  assert.equal(tight.focusGoalFresh, null, 'sans readiness du jour → aucune note d’alignement');
  assert.ok(!/les deux signaux s’alignent/i.test(tight.insight));
  // Réconciliation POSITIVE côté FOCUS : objectif serré + readiness au vert le jour même → focusGoalFresh.
  const fresh = L.adaptiveCoachFocus({ ...base(30), recovery: [{ date: '2026-07-19', sleep: 8, fatigue: 1, soreness: 1 }] }, '2026-07-19');
  assert.equal(fresh.focusGoalPace, 'tight');
  assert.equal(fresh.focusGoalFresh, 100, 'readiness ≥ 75 le jour même → le score renvoyé');
  assert.match(fresh.insight, /ta forme est au vert ce matin \(readiness 100\/100\)/);
  assert.match(fresh.insight, /LE moment de pousser pour boucler l’objectif focus/);
  // Tout au top (sleep 8 / fat 1 / sore 1) → trois forces à égalité → readinessDriver null → pas de moteur nommé.
  assert.equal(fresh.focusFreshDriver, null, 'trois forces à égalité → aucun moteur unique nommé');
  assert.ok(!/nourrit cette fraîcheur mentale/.test(fresh.insight));
  // Nommer CE QUI porte la fraîcheur (focusFreshDriver) — pendant focus de readinessBoost (#531).
  // Moteur SOMMEIL : sleep 8 / fat 2 / sore 2 → readinessScore 85 (≥ 75), driver sleep (frac 1 vs 0,75).
  const freshSleep = L.adaptiveCoachFocus({ ...base(30), recovery: [{ date: '2026-07-19', sleep: 8, fatigue: 2, soreness: 2 }] }, '2026-07-19');
  assert.equal(freshSleep.focusGoalFresh, 85, 'readiness au vert');
  assert.deepEqual(freshSleep.focusFreshDriver, { factor: 'sleep', value: 8 }, 'sommeil moteur dominant nommé');
  assert.match(freshSleep.insight, /nourrit cette fraîcheur mentale : ta nuit de 8 h/);
  assert.match(freshSleep.insight, /carburant du deep work/);
  // Moteur ÉNERGIE : sleep 6 / fat 1 / sore 3 → readinessScore 75 (≥ 75), driver fatigue (frac 1 vs 0,75).
  const freshEnergy = L.adaptiveCoachFocus({ ...base(30), recovery: [{ date: '2026-07-19', sleep: 6, fatigue: 1, soreness: 3 }] }, '2026-07-19');
  assert.equal(freshEnergy.focusGoalFresh, 75, 'readiness au vert');
  assert.deepEqual(freshEnergy.focusFreshDriver, { factor: 'fatigue', value: 1 }, 'énergie moteur dominant nommé');
  assert.match(freshEnergy.insight, /nourrit cette fraîcheur mentale : ton énergie est au top \(fatigue 1\/5\)/);
  // Moteur COURBATURES dominant (sleep 6 / fat 2 / sore 1 → score 83 ≥ 75, driver soreness) → HONNÊTETÉ :
  // des muscles frais ne portent pas le deep work → on se tait, focusFreshDriver null malgré le vert.
  const freshSore = L.adaptiveCoachFocus({ ...base(30), recovery: [{ date: '2026-07-19', sleep: 6, fatigue: 2, soreness: 1 }] }, '2026-07-19');
  assert.equal(freshSore.focusGoalFresh, 83, 'readiness au vert');
  assert.equal(freshSore.focusFreshDriver, null, 'muscles frais dominants → non crédités côté focus (deep work)');
  assert.ok(!/nourrit cette fraîcheur mentale/.test(freshSore.insight));
  // Réconciliation du CONFLIT côté FOCUS : objectif serré + readiness AU PLANCHER (< 50) le jour même
  // → focusGoalDrained (le pendant OPPOSÉ de focusGoalFresh, symétrique focus de restOverGoal).
  // sleep 5 / fatigue 4 / soreness 4 → score 40 (< 50).
  const tired = L.adaptiveCoachFocus({ ...base(30), recovery: [{ date: '2026-07-19', sleep: 5, fatigue: 4, soreness: 4 }] }, '2026-07-19');
  assert.equal(tired.focusGoalFresh, null, 'readiness < 75 → aucun alignement');
  assert.equal(tired.focusFreshDriver, null, 'forme à plat → aucun moteur de fraîcheur');
  assert.equal(tired.focusGoalDrained, 40, 'readiness < 50 le jour même → le score du conflit renvoyé');
  assert.match(tired.insight, /ta forme est à plat ce matin \(readiness 40\/100\)/);
  assert.match(tired.insight, /focus court et facile aujourd’hui/);
  assert.ok(!/les deux signaux s’alignent/i.test(tired.insight));
  // Deux freins à égalité (fat 4 / sore 4 également plombants) → readinessLimiter null → aucun frein nommé.
  assert.equal(tired.focusDrainDriver, null, 'freins à égalité → aucun frein unique nommé côté focus');
  assert.ok(!/te plombe la tête/.test(tired.insight));
  // Nommer CE QUI plombe la tête (focusDrainDriver) — pendant OPPOSÉ de focusFreshDriver (#532), miroir focus
  // de readinessDrag (#525). Frein SOMMEIL : sleep 3 / fat 3 / sore 3 → readinessScore 45 (< 50), limiter
  // sommeil (déficit 25 vs 15).
  const drainSleep = L.adaptiveCoachFocus({ ...base(30), recovery: [{ date: '2026-07-19', sleep: 3, fatigue: 3, soreness: 3 }] }, '2026-07-19');
  assert.equal(drainSleep.focusGoalDrained, 45, 'readiness < 50 → conflit renvoyé');
  assert.deepEqual(drainSleep.focusDrainDriver, { factor: 'sleep', value: 3 }, 'sommeil frein dominant nommé');
  assert.match(drainSleep.insight, /te plombe la tête aujourd’hui : ta nuit courte de 3 h/);
  assert.match(drainSleep.insight, /recharge le sommeil ce soir/);
  // Frein ÉNERGIE : sleep 5 / fat 5 / sore 3 → readinessScore 40 (< 50), limiter fatigue (déficit 30 vs 15).
  const drainFat = L.adaptiveCoachFocus({ ...base(30), recovery: [{ date: '2026-07-19', sleep: 5, fatigue: 5, soreness: 3 }] }, '2026-07-19');
  assert.equal(drainFat.focusGoalDrained, 40, 'readiness < 50 → conflit renvoyé');
  assert.deepEqual(drainFat.focusDrainDriver, { factor: 'fatigue', value: 5 }, 'fatigue frein dominant nommé');
  assert.match(drainFat.insight, /te plombe la tête aujourd’hui : ta fatigue générale \(5\/5\)/);
  // Frein COURBATURES dominant (sleep 6 / fat 3 / sore 5 → score 45 < 50, limiter soreness) → HONNÊTETÉ :
  // des muscles douloureux pèsent sur une séance, pas sur le deep work → on se tait, focusDrainDriver null.
  const drainSore = L.adaptiveCoachFocus({ ...base(30), recovery: [{ date: '2026-07-19', sleep: 6, fatigue: 3, soreness: 5 }] }, '2026-07-19');
  assert.equal(drainSore.focusGoalDrained, 45, 'readiness < 50 → conflit renvoyé');
  assert.equal(drainSore.focusDrainDriver, null, 'courbatures dominantes → non créditées comme frein du deep work');
  assert.ok(!/te plombe la tête/.test(drainSore.insight));
  // Mutuellement exclusif de focusFreshDriver : au vert, aucun frein ; à plat, aucun moteur.
  assert.equal(freshSleep.focusDrainDriver, null, 'readiness au vert → aucun frein');
  assert.equal(drainSleep.focusFreshDriver, null, 'readiness à plat → aucun moteur de fraîcheur');
  // Zone MÉDIANE (50 ≤ readiness < 75) : ni feu vert ni conflit — sleep 6 / fatigue 3 / soreness 3 → 60.
  // Mot HONNÊTE de la zone médiane focus (focusGoalSteady, #534) : forme correcte → bloc mesuré.
  const mid = L.adaptiveCoachFocus({ ...base(30), recovery: [{ date: '2026-07-19', sleep: 6, fatigue: 3, soreness: 3 }] }, '2026-07-19');
  assert.equal(mid.focusGoalFresh, null, 'zone médiane → pas d’alignement');
  assert.equal(mid.focusGoalDrained, null, 'zone médiane → pas de conflit');
  assert.equal(mid.focusGoalSteady, 60, 'zone médiane → le score du jour renvoyé');
  assert.match(mid.insight, /Ta forme tient la route ce matin \(readiness 60\/100\) sans être au top/);
  assert.match(mid.insight, /cale un bloc mesuré/);
  assert.ok(!/à plat ce matin|s’alignent/i.test(mid.insight));
  // Mutuellement exclusif : au vert (fresh) et à plat (drained) → focusGoalSteady null.
  assert.equal(fresh.focusGoalSteady, null, 'readiness ≥ 75 → pas de note zone médiane');
  assert.equal(tired.focusGoalSteady, null, 'readiness < 50 → pas de note zone médiane');
  assert.equal(onpace.focusGoalSteady, null, 'objectif large → pas de note zone médiane');
  assert.ok(!/tient la route ce matin/.test(fresh.insight));
  assert.ok(!/tient la route ce matin/.test(tired.insight));
  // Objectif focus DANS LES TEMPS (onpace) → focusGoalFresh/Drained null (assignés dans la branche serrée).
  assert.equal(onpace.focusGoalFresh, null, 'objectif large → pas de note même côté focus');
  assert.equal(onpace.focusGoalDrained, null, 'objectif large → pas de conflit côté focus');
  // Sans check-in de récup du jour → objectif large muet sur la forme, focusGoalAhead null.
  assert.equal(onpace.focusGoalAhead, null, 'objectif large sans readiness → aucune invitation à avancer');
  assert.ok(!/prendre de l’avance/.test(onpace.insight));
  // PRENDRE DE L'AVANCE (focusGoalAhead, #535) — pendant PROACTIF de focusGoalFresh : objectif large +
  // readiness au vert le jour même → invitation à engranger un coussin. (Session focus du 07-14 ajoutée
  // pour que le pilier reste focus malgré le check-in de récup — sinon le sommeil monterait en tête.)
  // sleep 8 / fat 1 / sore 1 → 100. Mardi 07-14, 40 min faites → onpace.
  const aheadFs = [{ date: '2026-07-05', minutes: 30 }, { date: '2026-07-13', minutes: 30 }, { date: '2026-07-14', minutes: 10 }];
  const ahead = L.adaptiveCoachFocus({ focusSessions: aheadFs, recovery: [{ date: '2026-07-14', sleep: 8, fatigue: 1, soreness: 1 }] }, '2026-07-14');
  assert.equal(ahead.pillar, 'focus', 'pilier focus conservé malgré le check-in');
  assert.equal(ahead.focusGoalPace, 'onpace', 'marge sur l’objectif focus');
  assert.equal(ahead.focusGoalAhead, 100, 'readiness ≥ 75 le jour même × marge → le score renvoyé');
  assert.match(ahead.insight, /ta tête est claire ce matin \(readiness 100\/100\)/);
  assert.match(ahead.insight, /prendre de l’avance sur l’objectif tant que c’est facile/);
  assert.match(ahead.insight, /amortira un jour creux plus tard/);
  // Vocabulaire distinct des trois notes de la branche serrée : aucune collision.
  assert.ok(!/au vert ce matin|tient la route ce matin|à plat ce matin|s’alignent/i.test(ahead.insight));
  // NOMMER CE QUI DONNE CETTE CLARTÉ (focusAheadDriver, #537) — pendant EXACT de focusFreshDriver (#532),
  // appliqué à la branche d'AVANCE (onpace × vert) et non à la branche serrée. Le cas `ahead` ci-dessus
  // (8/1/1) a les TROIS forces à égalité (frac tous à 1) → aucun moteur unique : driver null malgré le vert.
  assert.equal(ahead.focusAheadDriver, null, 'trois forces à égalité × marge → aucun moteur d’avance nommé');
  assert.ok(!/te donne cette clarté/.test(ahead.insight));
  // Sommeil moteur dominant : sleep 8 / fat 2 / sore 2 → readiness 85, sommeil domine (frac 1 vs 0,75).
  const aheadSleep = L.adaptiveCoachFocus({ focusSessions: aheadFs, recovery: [{ date: '2026-07-14', sleep: 8, fatigue: 2, soreness: 2 }] }, '2026-07-14');
  assert.equal(aheadSleep.focusGoalAhead, 85, 'marge × vert → invitation à avancer');
  assert.deepEqual(aheadSleep.focusAheadDriver, { factor: 'sleep', value: 8 }, 'sommeil moteur d’avance nommé');
  assert.match(aheadSleep.insight, /ce qui te donne cette clarté : ta nuit de 8 h/);
  assert.match(aheadSleep.insight, /avance prise sans forcer/);
  // Énergie moteur dominant : sleep 6 / fat 1 / sore 2 → readiness 83, fatigue basse domine.
  const aheadEnergy = L.adaptiveCoachFocus({ focusSessions: aheadFs, recovery: [{ date: '2026-07-14', sleep: 6, fatigue: 1, soreness: 2 }] }, '2026-07-14');
  assert.deepEqual(aheadEnergy.focusAheadDriver, { factor: 'fatigue', value: 1 }, 'énergie moteur d’avance nommée');
  assert.match(aheadEnergy.insight, /ce qui te donne cette clarté : ton énergie est au top \(fatigue 1\/5\)/);
  assert.match(aheadEnergy.insight, /banker un bloc d’avance/);
  // HONNÊTETÉ : des muscles frais ne « donnent » PAS de clarté mentale → non crédités, focusAheadDriver null
  // malgré le vert (même garde-fou que focusFreshDriver). sleep 6 / fat 2 / sore 1 → readiness 83.
  const aheadSore = L.adaptiveCoachFocus({ focusSessions: aheadFs, recovery: [{ date: '2026-07-14', sleep: 6, fatigue: 2, soreness: 1 }] }, '2026-07-14');
  assert.equal(aheadSore.focusGoalAhead, 83, 'invitation à avancer présente');
  assert.equal(aheadSore.focusAheadDriver, null, 'muscles frais dominants → non crédités côté focus (deep work)');
  assert.ok(!/te donne cette clarté/.test(aheadSore.insight));
  // Mutuellement exclusif : la branche serrée nomme focusFreshDriver, pas focusAheadDriver.
  assert.equal(freshSleep.focusAheadDriver, null, 'branche serrée → focusAheadDriver null (c’est focusFreshDriver qui parle)');
  // HONNÊTETÉ : objectif large mais readiness moyenne (zone médiane) → aucune invitation (la marge suffit).
  // sleep 6 / fat 3 / sore 3 → 60 (< 75).
  const aheadMid = L.adaptiveCoachFocus({ focusSessions: aheadFs, recovery: [{ date: '2026-07-14', sleep: 6, fatigue: 3, soreness: 3 }] }, '2026-07-14');
  assert.equal(aheadMid.focusGoalPace, 'onpace', 'marge sur l’objectif focus');
  assert.equal(aheadMid.focusGoalAhead, null, 'readiness moyenne × marge → pas de note (aucune pression en plus)');
  assert.ok(!/prendre de l’avance/.test(aheadMid.insight));
  // Objectif large mais readiness à plat → aucune invitation à avancer. sleep 5 / fat 4 / sore 4 → 40.
  const aheadLow = L.adaptiveCoachFocus({ focusSessions: aheadFs, recovery: [{ date: '2026-07-14', sleep: 5, fatigue: 4, soreness: 4 }] }, '2026-07-14');
  assert.equal(aheadLow.focusGoalAhead, null, 'readiness à plat × marge → pas d’invitation à avancer');
  // CERVEAU À PLAT × MARGE → LÈVE LE PIED (focusMarginDrained) — trou symétrique de focusGoalAhead dans la
  // branche onpace : la marge rend un jour au ralenti sans conséquence, on rassure au lieu de rester muet.
  assert.equal(aheadLow.focusMarginDrained, 40, 'readiness < 50 × marge → le score du jour renvoyé');
  assert.match(aheadLow.insight, /ton énergie mentale est basse ce matin \(readiness 40\/100\)/);
  assert.match(aheadLow.insight, /tu as de la marge sur l’objectif/);
  assert.match(aheadLow.insight, /ta marge encaisse ce jour au ralenti/);
  // Vocabulaire distinct : aucune collision avec les notes des autres branches/zones.
  assert.ok(!/à plat ce matin|ta tête est claire ce matin|tient la route ce matin|au vert ce matin|prendre de l’avance/i.test(aheadLow.insight));
  // MUTUELLEMENT EXCLUSIF : focusMarginDrained ne parle QUE en onpace × < 50.
  assert.equal(aheadLow.focusGoalDrained, null, 'onpace → focusGoalDrained (branche serrée) reste null');
  assert.equal(ahead.focusMarginDrained, null, 'onpace × vert (≥ 75) → focusMarginDrained null (c’est focusGoalAhead qui parle)');
  assert.equal(aheadMid.focusMarginDrained, null, 'onpace × zone médiane → focusMarginDrained null');
  assert.equal(onpace.focusMarginDrained, null, 'onpace sans check-in de récup du jour → focusMarginDrained null');
  assert.equal(tired.focusMarginDrained, null, 'branche serrée × à plat → focusMarginDrained null (c’est focusGoalDrained qui parle)');
  // Mutuellement exclusif de la branche serrée : au vert × objectif SERRÉ → focusGoalFresh, pas Ahead.
  assert.equal(fresh.focusGoalAhead, null, 'branche serrée → focusGoalAhead null');
  assert.equal(mid.focusGoalAhead, null, 'branche serrée (zone médiane) → focusGoalAhead null');
  // Objectif déjà atteint (130 ≥ 120) → pas d'allure, le « atteint 💪 » suffit.
  const done = L.adaptiveCoachFocus(base(130), '2026-07-16');
  assert.equal(done.focusGoalPace, null);
  assert.match(done.insight, /Objectif hebdo atteint : 130\/120 min 💪/);
  assert.ok(!/Dans les temps|Serré/.test(done.insight));
  // Sans check-in de récup du jour → objectif bouclé muet sur la forme, focusGoalBonus null.
  assert.equal(done.focusGoalBonus, null, 'objectif bouclé sans readiness → aucun mot bonus');
  assert.ok(!/pur bonus/.test(done.insight));
  // PUR BONUS (focusGoalBonus, #538) — objectif hebdo DÉJÀ bouclé × readiness au vert le jour même →
  // cadrer un bloc de plus comme du pur bonus sans pression. Session focus du 07-16 pour garder le pilier
  // focus malgré le check-in de récup. Total semaine 130 + 10 = 140 ≥ 120 → done. sleep 8/fat 1/sore 1 → 100.
  const bonusFs = [{ date: '2026-07-13', minutes: 130 }, { date: '2026-07-16', minutes: 10 }];
  const bonus = L.adaptiveCoachFocus({ focusSessions: bonusFs, recovery: [{ date: '2026-07-16', sleep: 8, fatigue: 1, soreness: 1 }] }, '2026-07-16');
  assert.equal(bonus.pillar, 'focus', 'pilier focus conservé malgré le check-in');
  assert.equal(bonus.focusGoalPace, null, 'objectif bouclé → pas d’allure');
  assert.equal(bonus.focusGoalBonus, 100, 'objectif bouclé × readiness ≥ 75 le jour même → le score renvoyé');
  assert.match(bonus.insight, /Objectif hebdo atteint : 140\/120 min 💪/);
  assert.match(bonus.insight, /Objectif bouclé et la forme est au rendez-vous ce matin \(readiness 100\/100\)/);
  assert.match(bonus.insight, /un bloc de plus serait du pur bonus, sans la moindre pression/);
  // Vocabulaire distinct des notes d'allure : aucune collision.
  assert.ok(!/prendre de l’avance|au vert ce matin|tient la route ce matin|à plat ce matin/.test(bonus.insight));
  // HONNÊTETÉ : objectif bouclé mais readiness moyenne (zone médiane) → aucun mot bonus. sleep 6/fat 3/sore 3 → 60.
  const bonusMid = L.adaptiveCoachFocus({ focusSessions: bonusFs, recovery: [{ date: '2026-07-16', sleep: 6, fatigue: 3, soreness: 3 }] }, '2026-07-16');
  assert.equal(bonusMid.focusGoalBonus, null, 'readiness moyenne × objectif bouclé → pas de note (rien à ajouter)');
  assert.ok(!/pur bonus/.test(bonusMid.insight));
  // Mutuellement exclusif : objectif NON tenu (behind) × readiness au vert → focusGoalBonus null (c’est l’allure qui parle).
  assert.equal(ahead.focusGoalBonus, null, 'objectif non tenu → aucun mot bonus (branche allure)');
  assert.equal(fresh.focusGoalBonus, null, 'objectif serré non tenu → aucun mot bonus');
  // Hors pilier focus (sport choisi) → focusGoalPace null.
  const sport = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-15' }] }, '2026-07-16');
  assert.equal(sport.pillar, 'sport');
  assert.equal(sport.focusGoalPace, null);
});

test('adaptiveCoachFocus : focus nutrition enrichi (cible protéines réelle + collation concrète)', () => {
  const today = '2026-07-16';
  // Cible = proteinTarget(80, 'force') = round(80*1.9/5)*5 = 150 g.
  assert.equal(L.proteinTarget(80, 'force').gramsPerDay, 150, 'cible protéines attendue');
  // Nutrition en décrochage (3 j la semaine passée, 1 récente sous la cible) + aucun autre pilier
  // → nutrition est le focus. Pas de série (jours sous la cible) → insight = régularité 7 j.
  const base = { profile: { weight: 80, goal: 'force' } };
  const decline = { ...base, nutrition: [
    { date: '2026-07-03', protein: 60 }, { date: '2026-07-04', protein: 60 }, { date: '2026-07-05', protein: 60 },
    { date: '2026-07-15', protein: 50 },
  ] };
  const fn = L.adaptiveCoachFocus(decline, today);
  assert.equal(fn.pillar, 'nutrition');
  assert.match(fn.insight, /0\/7 jours à ta cible protéines \(150 g\)/, 'insight = régularité chiffrée, pas un compteur générique');
  assert.match(fn.action, /Il te reste 150 g de protéines/, 'action = écart du jour (aucune entrée aujourd’hui → 150 g restants)');
  assert.match(fn.action, /~\d+ g\)/, 'l’action cite une collation concrète et son apport');
  // Série protéines en cours (≥ 2 j d’affilée à la cible) → l’insight bascule sur la série motivante.
  const streak = { ...base, nutrition: [
    { date: '2026-07-03', protein: 160 }, { date: '2026-07-04', protein: 160 }, { date: '2026-07-05', protein: 160 }, { date: '2026-07-06', protein: 160 },
    { date: '2026-07-14', protein: 160 }, { date: '2026-07-15', protein: 160 },
  ] };
  const fs = L.adaptiveCoachFocus(streak, today);
  assert.equal(fs.pillar, 'nutrition');
  assert.match(fs.insight, /🔥 2 jours d’affilée à ta cible protéines \(150 g\)/, 'série protéines citée quand elle court');
  // Cible du jour déjà tenue → l’action félicite au lieu de proposer une collation.
  const held = { ...base, nutrition: [
    { date: '2026-07-03', protein: 160 }, { date: '2026-07-04', protein: 160 }, { date: '2026-07-05', protein: 160 }, { date: '2026-07-06', protein: 160 },
    { date: '2026-07-14', protein: 160 }, { date: '2026-07-15', protein: 160 }, { date: today, protein: 160 },
  ] };
  const fh = L.adaptiveCoachFocus(held, today);
  assert.equal(fh.pillar, 'nutrition');
  assert.match(fh.action, /Cible protéines tenue \(160\/150 g\)/, 'action = félicitation quand la cible du jour est atteinte');
  // Sans profil (pas de cible exploitable) → dégrade proprement vers l’action générique.
  const noProfile = L.adaptiveCoachFocus({ nutrition: decline.nutrition }, today);
  assert.equal(noProfile.pillar, 'nutrition');
  assert.ok(!/Il te reste|cible protéines/.test(noProfile.action), 'sans profil : pas d’enrichissement, action générique conservée');
});

test('adaptiveCoachFocus : focus nutrition — PENTE d’adhérence protéines (grimpe / s’effrite)', () => {
  const today = '2026-07-16'; // cible = 150 g (poids 80, objectif force)
  const base = { profile: { weight: 80, goal: 'force' } };
  // NEUTRE + S’EFFRITE : semaine précédente 6 jours à la cible, semaine récente 3 (pas en fin → pas de série) → -3.
  const down = { ...base, nutrition: [
    { date: '2026-07-03', protein: 160 }, { date: '2026-07-04', protein: 160 }, { date: '2026-07-05', protein: 160 },
    { date: '2026-07-06', protein: 160 }, { date: '2026-07-07', protein: 160 }, { date: '2026-07-08', protein: 160 },
    { date: '2026-07-10', protein: 160 }, { date: '2026-07-11', protein: 160 }, { date: '2026-07-12', protein: 160 },
    { date: '2026-07-15', protein: 50 } ] };
  const fd = L.adaptiveCoachFocus(down, today);
  assert.equal(fd.pillar, 'nutrition');
  assert.equal(fd.proteinTrend, -3);
  assert.match(fd.insight, /3\/7 jours à ta cible protéines/);
  assert.match(fd.insight, /Mais ta régularité s’effrite : 3 jours à la cible cette semaine vs 6 la précédente \(-3\)/);
  // NEUTRE + GRIMPE : semaine précédente 1 jour, récente 4 (pas en fin → pas de série) → +3.
  const up = { ...base, nutrition: [
    { date: '2026-07-05', protein: 160 },
    { date: '2026-07-10', protein: 160 }, { date: '2026-07-11', protein: 160 }, { date: '2026-07-13', protein: 160 }, { date: '2026-07-14', protein: 160 },
    { date: '2026-07-15', protein: 50 } ] };
  const fu = L.adaptiveCoachFocus(up, today);
  assert.equal(fu.pillar, 'nutrition');
  assert.equal(fu.proteinTrend, 3);
  assert.match(fu.insight, /Et ta régularité grimpe : 4 jours à la cible cette semaine vs 1 la précédente \(\+3\)/);
  assert.doesNotMatch(fu.insight, /s’effrite/);
  // SÉRIE + GRIMPE : série en cours (14,15,16 à la cible) + semaine précédente maigre → note « grimpe » sous la série.
  const streakUp = { ...base, nutrition: [
    { date: '2026-07-05', protein: 160 },
    { date: '2026-07-14', protein: 160 }, { date: '2026-07-15', protein: 160 }, { date: today, protein: 160 } ] };
  const fsu = L.adaptiveCoachFocus(streakUp, today);
  assert.match(fsu.insight, /🔥 3 jours d’affilée à ta cible protéines/);
  assert.ok(fsu.proteinTrend > 0, 'grimpe créditée sous la série');
  assert.match(fsu.insight, /Et ta régularité grimpe/);
  // SÉRIE + baisse hebdo : une série courte (15,16) mais semaine précédente forte → la note « s’effrite » est SUPPRIMÉE (jamais contre une série).
  const streakDown = { ...base, nutrition: [
    { date: '2026-07-03', protein: 160 }, { date: '2026-07-04', protein: 160 }, { date: '2026-07-05', protein: 160 },
    { date: '2026-07-06', protein: 160 }, { date: '2026-07-07', protein: 160 }, { date: '2026-07-08', protein: 160 },
    { date: '2026-07-15', protein: 160 }, { date: today, protein: 160 } ] };
  const fsd = L.adaptiveCoachFocus(streakDown, today);
  assert.match(fsd.insight, /🔥 2 jours d’affilée à ta cible protéines/);
  assert.equal(fsd.proteinTrend, null, 'pas de note « s’effrite » sous une série');
  assert.doesNotMatch(fsd.insight, /s’effrite/);
  // Pas de semaine précédente renseignée → proteinTrend null, aucune note de pente.
  const solo = { ...base, nutrition: [
    { date: '2026-07-10', protein: 160 }, { date: '2026-07-12', protein: 160 }, { date: '2026-07-15', protein: 50 } ] };
  const fsolo = L.adaptiveCoachFocus(solo, today);
  assert.equal(fsolo.pillar, 'nutrition');
  assert.equal(fsolo.proteinTrend, null);
  assert.doesNotMatch(fsolo.insight, /grimpe|s’effrite/);
  // Hors pilier nutrition → proteinTrend null.
  const sport = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-10' }, { date: '2026-07-12' }] }, today);
  assert.equal(sport.proteinTrend, null);
});

test('adaptiveCoachFocus : focus nutrition — PENTE d’hydratation (relais quand les protéines sont muettes)', () => {
  const today = '2026-07-16';
  // SANS PROFIL (l’eau ne dépend pas de la cible protéines) → protéines muettes (proteinTrend null),
  // l’hydratation prend le relais. GRIMPE : récente 6 j à 8 verres, précédente 3 → +3.
  const up = { nutrition: [
    { date: '2026-07-03', water: 8 }, { date: '2026-07-04', water: 8 }, { date: '2026-07-05', water: 8 },
    { date: '2026-07-10', water: 8 }, { date: '2026-07-11', water: 8 }, { date: '2026-07-12', water: 8 },
    { date: '2026-07-13', water: 8 }, { date: '2026-07-14', water: 8 }, { date: '2026-07-15', water: 8 } ] };
  const fu = L.adaptiveCoachFocus(up, today);
  assert.equal(fu.pillar, 'nutrition');
  assert.equal(fu.proteinTrend, null);
  assert.equal(fu.hydrationTrend, 3);
  assert.match(fu.insight, /côté hydratation, ça suit : 6 jours à tes 8 verres cette semaine vs 3 la précédente \(\+3\)/);
  // DÉCROCHE (hors série protéines) : récente 3 j, précédente 6 → -3.
  const down = { nutrition: [
    { date: '2026-07-03', water: 8 }, { date: '2026-07-04', water: 8 }, { date: '2026-07-05', water: 8 },
    { date: '2026-07-06', water: 8 }, { date: '2026-07-07', water: 8 }, { date: '2026-07-08', water: 8 },
    { date: '2026-07-10', water: 8 }, { date: '2026-07-11', water: 8 }, { date: '2026-07-12', water: 8 },
    { date: '2026-07-15', water: 3 } ] };
  const fd = L.adaptiveCoachFocus(down, today);
  assert.equal(fd.hydrationTrend, -3);
  assert.match(fd.insight, /côté hydratation en revanche, ça décroche : 3 jours à tes 8 verres cette semaine vs 6 la précédente \(-3\)/i);
  // PRIORISATION : quand la pente PROTÉINES parle, l’hydratation se tait (un seul intrant à la fois).
  const protUp = { profile: { weight: 80, goal: 'force' }, nutrition: [
    { date: '2026-07-05', protein: 160 },
    { date: '2026-07-10', protein: 160 }, { date: '2026-07-11', protein: 160 }, { date: '2026-07-13', protein: 160 }, { date: '2026-07-14', protein: 160 },
    // eau en baisse en parallèle — elle ne doit PAS s’afficher car les protéines ont la priorité.
    { date: '2026-07-03', water: 8 }, { date: '2026-07-04', water: 8 }, { date: '2026-07-06', water: 8 },
    { date: '2026-07-07', water: 8 }, { date: '2026-07-08', water: 8 }, { date: '2026-07-09', water: 8 },
    { date: '2026-07-15', water: 3 } ] };
  const fp = L.adaptiveCoachFocus(protUp, today);
  assert.equal(fp.proteinTrend, 3);
  assert.equal(fp.hydrationTrend, null, 'protéines prioritaires → hydratation muette');
  assert.doesNotMatch(fp.insight, /hydratation/);
  // JAMAIS « ça décroche » sous une série protéines célébrée : protéines à pente PLATE (proteinTrend
  // null : 2 jours à la cible cette semaine comme la précédente) mais SÉRIE en cours (15,16) — l’eau en
  // baisse est SUPPRIMÉE tant que la série protéines tient le ton.
  const streak = { profile: { weight: 80, goal: 'force' }, nutrition: [
    { date: '2026-07-05', protein: 160 }, { date: '2026-07-06', protein: 160 },
    { date: '2026-07-15', protein: 160 }, { date: today, protein: 160 },
    { date: '2026-07-03', water: 8 }, { date: '2026-07-04', water: 8 }, { date: '2026-07-07', water: 8 },
    { date: '2026-07-08', water: 8 }, { date: '2026-07-09', water: 8 },
    { date: '2026-07-10', water: 3 }, { date: '2026-07-11', water: 3 } ] };
  const fst = L.adaptiveCoachFocus(streak, today);
  assert.match(fst.insight, /🔥 2 jours d’affilée à ta cible protéines/);
  assert.equal(fst.proteinTrend, null);
  assert.equal(fst.hydrationTrend, null, 'pas de « décroche » sous une série protéines');
  assert.doesNotMatch(fst.insight, /décroche/);
  // Sans semaine précédente renseignée → hydrationTrend null, aucune note.
  const solo = { nutrition: [{ date: '2026-07-14', water: 8 }, { date: '2026-07-15', water: 8 }] };
  const fso = L.adaptiveCoachFocus(solo, today);
  assert.equal(fso.hydrationTrend, null);
  assert.doesNotMatch(fso.insight, /hydratation/);
});

test('adaptiveCoachFocus : focus nutrition — fruits & légumes délaissés malgré un vrai suivi (fruitGuard)', () => {
  const today = '2026-07-16';
  // SANS PROFIL (proteinTrend null) et SANS eau (hydrationTrend null) : nutrition suivie 10 jours sur 14
  // via les protéines, mais ZÉRO fruit/légume coché → le coach nomme le manque de micronutriments.
  const dates = ['2026-07-05', '2026-07-07', '2026-07-09', '2026-07-10', '2026-07-11',
                 '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'];
  const zero = { nutrition: dates.map(d => ({ date: d, protein: 100 })) };
  const fz = L.adaptiveCoachFocus(zero, today);
  assert.equal(fz.pillar, 'nutrition');
  assert.equal(fz.proteinTrend, null);
  assert.equal(fz.hydrationTrend, null);
  assert.deepEqual(fz.fruitGuard, { fruitDays: 0, trackedDays: 10 });
  assert.match(fz.insight, /Côté fruits et légumes en revanche, zéro sur tes 10 jours suivis/);
  assert.match(fz.insight, /fibres, vitamines et antioxydants/);
  // Quelques jours seulement (2/10 ≤ ⌊10\/3⌋ = 3) → branche « seulement N jours ».
  const few = { nutrition: dates.map((d, i) => ({ date: d, protein: 100, fruit: i < 2 })) };
  const ff = L.adaptiveCoachFocus(few, today);
  assert.deepEqual(ff.fruitGuard, { fruitDays: 2, trackedDays: 10 });
  assert.match(ff.insight, /seulement 2 jours sur tes 10 jours suivis/);
  // Habitude déjà correcte (5/10 > 3) → muet.
  const okHabit = { nutrition: dates.map((d, i) => ({ date: d, protein: 100, fruit: i < 5 })) };
  assert.equal(L.adaptiveCoachFocus(okHabit, today).fruitGuard, null);
  // Suivi trop maigre (6 jours < 8) → muet, même sans aucun fruit (fruit=false serait juste « pas loggé »).
  const thin = { nutrition: dates.slice(0, 6).map(d => ({ date: d, protein: 100 })) };
  const ft = L.adaptiveCoachFocus(thin, today);
  assert.equal(ft.pillar, 'nutrition');
  assert.equal(ft.fruitGuard, null);
  // SUBORDINATION : quand la pente d’hydratation parle (relais protéines), le fruit se tait (un seul
  // intrant à la fois). Eau qui grimpe (6 j récents à 8 verres vs 3 la précédente) + zéro fruit.
  const hydra = { nutrition: [
    { date: '2026-07-03', water: 8 }, { date: '2026-07-04', water: 8 }, { date: '2026-07-05', water: 8 },
    { date: '2026-07-10', water: 8 }, { date: '2026-07-11', water: 8 }, { date: '2026-07-12', water: 8 },
    { date: '2026-07-13', water: 8 }, { date: '2026-07-14', water: 8 }, { date: '2026-07-15', water: 8 } ] };
  const fh = L.adaptiveCoachFocus(hydra, today);
  assert.equal(fh.hydrationTrend, 3);
  assert.equal(fh.fruitGuard, null, 'un seul intrant à la fois : hydratation prime sur le fruit');
  assert.doesNotMatch(fh.insight, /fruits et légumes/);
  // Hors pilier nutrition → fruitGuard null.
  const sport = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-14' }, { date: '2026-07-15' }] }, today);
  assert.equal(sport.fruitGuard, null);
});

test('adaptiveCoachFocus : focus nutrition — cite la progression réelle vers l’objectif de poids', () => {
  const today = '2026-07-16';
  // Nutrition en décrochage (3 j la semaine passée, 1 récente), aucun autre pilier → nutrition = focus (ton rebuild).
  const nutrition = [
    { date: '2026-07-04', protein: 100 }, { date: '2026-07-06', protein: 100 }, { date: '2026-07-08', protein: 100 },
    { date: '2026-07-15', protein: 100 },
  ];
  // Objectif de perte 85 → 79 (6 kg). Pesées 85 puis 82 → 3 kg faits = 50% : le coach CRÉDITE.
  const half = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights: [
    { date: '2026-06-01', value: 85 }, { date: '2026-07-14', value: 82 },
  ] }, today);
  assert.equal(half.pillar, 'nutrition');
  assert.equal(half.weightGoalPct, 50);
  assert.match(half.insight, /Et ça paie : 50% de ton objectif de perte atteint \(3 kg sur 6\)/);
  assert.match(half.insight, /ta nutrition en est le moteur/);
  // PENTE de poids (weightPace) : ici la balance descend encore (~0,49 kg/sem) vers la cible → ETA projetée.
  assert.equal(half.weightPace, -0.49);
  assert.match(half.insight, /À ton rythme récent \(0,49 kg\/sem\), tu touches ta cible dans ~6 semaines/);
  // En chemin (< 50 %) : 85 → 84 sur une cible de 6 kg = 17% → le coach ENCOURAGE.
  const onWay = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights: [
    { date: '2026-06-01', value: 85 }, { date: '2026-07-14', value: 84 },
  ] }, today);
  assert.equal(onWay.weightGoalPct, 17);
  assert.match(onWay.insight, /Ton objectif de perte avance \(17%, 1 kg sur 6\)/);
  // Pas encore de résultat (une seule pesée = départ == courant) → recadrage sans culpabiliser.
  const none = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights: [
    { date: '2026-07-14', value: 85 },
  ] }, today);
  assert.equal(none.weightGoalPct, 0);
  assert.match(none.insight, /Ta cible de perte \(6 kg\) attend encore un premier résultat/);
  // Sans objectif de poids → pas d’enrichissement, champ null et aucune note ajoutée.
  const noGoal = L.adaptiveCoachFocus({ nutrition }, today);
  assert.equal(noGoal.pillar, 'nutrition');
  assert.equal(noGoal.weightGoalPct, null);
  assert.equal(noGoal.weightPace, null);
  assert.ok(!/objectif de|attend encore un premier résultat/.test(noGoal.insight), 'sans objectif : insight nutrition intact');
  // Une seule pesée → weightTrend null → weightPace null, aucune note de pente.
  assert.equal(none.weightPace, null);
  assert.ok(!/rythme récent|ne descend plus|repartent/.test(none.insight), 'une seule pesée : pas de note de pente');
});

test('adaptiveCoachFocus : focus nutrition — PENTE de poids (stagnation, dérive, horizon lointain)', () => {
  const today = '2026-07-16';
  const nutrition = [
    { date: '2026-07-04', protein: 100 }, { date: '2026-07-06', protein: 100 }, { date: '2026-07-08', protein: 100 },
    { date: '2026-07-15', protein: 100 },
  ];
  // PLATEAU : 50 % du chemin fait (85→82) mais les 6 dernières pesées sont plates à 82 → « ne descend plus ».
  const stall = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights: [
    { date: '2026-05-01', value: 85 }, { date: '2026-06-10', value: 82 }, { date: '2026-06-20', value: 82 },
    { date: '2026-06-30', value: 82 }, { date: '2026-07-05', value: 82 }, { date: '2026-07-10', value: 82 },
    { date: '2026-07-14', value: 82 },
  ] }, today);
  assert.equal(stall.weightGoalPct, 50);
  assert.equal(stall.weightPace, 0);
  assert.match(stall.insight, /Et ça paie : 50%/);
  assert.match(stall.insight, /Mais la balance ne descend plus \(0 kg\/sem sur tes dernières pesées\) — baisse un peu tes calories ou ajoute du cardio/);
  // DÉRIVE : objectif de perte mais les dernières pesées remontent (82 → 83) → « repartent à la hausse ».
  const drift = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights: [
    { date: '2026-05-01', value: 85 }, { date: '2026-06-10', value: 82 }, { date: '2026-06-20', value: 82.2 },
    { date: '2026-06-30', value: 82.4 }, { date: '2026-07-05', value: 82.6 }, { date: '2026-07-10', value: 82.8 },
    { date: '2026-07-14', value: 83 },
  ] }, today);
  assert.equal(drift.weightPace, 0.21);
  assert.match(drift.insight, /Mais tes dernières pesées repartent à la hausse \(\+0,21 kg\/sem\) — resserre tes calories pour reprendre la perte/);
  // BON SENS mais HORIZON LOINTAIN (> 26 sem) : on crédite la direction sans ETA irréaliste.
  const slow = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights: [
    { date: '2026-05-01', value: 85 }, { date: '2026-06-10', value: 82 }, { date: '2026-06-20', value: 81.94 },
    { date: '2026-06-30', value: 81.88 }, { date: '2026-07-05', value: 81.82 }, { date: '2026-07-10', value: 81.76 },
    { date: '2026-07-14', value: 81.7 },
  ] }, today);
  assert.match(slow.insight, /Et tes dernières pesées vont dans le bon sens \(0,06 kg\/sem\) — tiens le cap, le résultat suit/);
  assert.ok(!/dans ~\d+ semaine/.test(slow.insight), 'horizon lointain : pas d’ETA chiffrée');
  // PRISE (objectif inverse) : cible au-dessus, mais la balance ne monte plus → conseil « ajoute des calories ».
  const gainStall = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 85 }, weights: [
    { date: '2026-05-01', value: 78 }, { date: '2026-06-10', value: 81 }, { date: '2026-06-20', value: 81 },
    { date: '2026-06-30', value: 81 }, { date: '2026-07-05', value: 81 }, { date: '2026-07-10', value: 81 },
    { date: '2026-07-14', value: 81 },
  ] }, today);
  assert.match(gainStall.insight, /Mais la balance ne monte plus \(0 kg\/sem sur tes dernières pesées\) — ajoute un peu de calories pour relancer la prise/);
});

test('adaptiveCoachFocus : focus nutrition — plateau confirmé → cible calorique concrète', () => {
  const today = '2026-07-16';
  const nutrition = [
    { date: '2026-07-04', protein: 100 }, { date: '2026-07-06', protein: 100 }, { date: '2026-07-08', protein: 100 },
    { date: '2026-07-15', protein: 100 },
  ];
  const flatWeights = [
    { date: '2026-05-01', value: 85 }, { date: '2026-06-10', value: 82 }, { date: '2026-06-20', value: 82 },
    { date: '2026-06-30', value: 82 }, { date: '2026-07-05', value: 82 }, { date: '2026-07-10', value: 82 },
    { date: '2026-07-14', value: 82 },
  ];
  // PLATEAU perte + PROFIL complet → calorieAdjustment confirme sur 14 j → cible calorique CHIFFRÉE
  // (au lieu du « baisse un peu tes calories » qualitatif). Poids récent 82, cible 79 → objectif perte.
  const profile = { height: 180, age: 30, sex: 'homme', activityLevel: 'modere' };
  const stallPro = L.adaptiveCoachFocus({ nutrition, profile, goals: { targetWeight: 79 }, weights: flatWeights }, today);
  assert.equal(stallPro.weightPace, 0);
  assert.equal(typeof stallPro.calorieTarget, 'number', 'cible calorique concrète exposée');
  assert.ok(stallPro.calorieTarget > 0);
  assert.match(stallPro.insight, /Mais la balance ne descend plus \(0 kg\/sem sur tes dernières pesées\) — vise ~\d+ kcal\/j \(environ \d+ de moins\) ou ajoute du cardio/);
  assert.ok(!/baisse un peu tes calories/.test(stallPro.insight), 'plateau + profil : conseil chiffré, plus le message vague');
  // DÉRIVE perte + profil → même conseil chiffré (calorieAdjustment couvre rate >= -0,1).
  const driftPro = L.adaptiveCoachFocus({ nutrition, profile, goals: { targetWeight: 79 }, weights: [
    { date: '2026-05-01', value: 85 }, { date: '2026-06-10', value: 82 }, { date: '2026-06-20', value: 82.2 },
    { date: '2026-06-30', value: 82.4 }, { date: '2026-07-05', value: 82.6 }, { date: '2026-07-10', value: 82.8 },
    { date: '2026-07-14', value: 83 },
  ] }, today);
  assert.match(driftPro.insight, /repartent à la hausse \(\+0,21 kg\/sem\) — vise ~\d+ kcal\/j \(environ \d+ de moins\) ou ajoute du cardio/);
  assert.ok(!/resserre tes calories/.test(driftPro.insight), 'dérive + profil : conseil chiffré');
  // PRISE + profil → cible chiffrée « de plus » (jamais « de moins »).
  const gainPro = L.adaptiveCoachFocus({ nutrition, profile, goals: { targetWeight: 85 }, weights: [
    { date: '2026-05-01', value: 78 }, { date: '2026-06-10', value: 81 }, { date: '2026-06-20', value: 81 },
    { date: '2026-06-30', value: 81 }, { date: '2026-07-05', value: 81 }, { date: '2026-07-10', value: 81 },
    { date: '2026-07-14', value: 81 },
  ] }, today);
  assert.match(gainPro.insight, /ne monte plus \(0 kg\/sem sur tes dernières pesées\) — vise ~\d+ kcal\/j \(environ \d+ de plus\) pour relancer la prise/);
  assert.ok(typeof gainPro.calorieTarget === 'number' && gainPro.calorieTarget > 0);
  // PLANCHER calorique (petit gabarit déjà proche du plancher) → cardio, pas de nouvelle baisse.
  const floorPro = L.adaptiveCoachFocus({ nutrition, profile: { height: 150, age: 25, sex: 'femme', activityLevel: 'sedentaire' }, goals: { targetWeight: 43 }, weights: [
    { date: '2026-05-01', value: 47 }, { date: '2026-06-10', value: 45 }, { date: '2026-06-20', value: 45 },
    { date: '2026-06-30', value: 45 }, { date: '2026-07-05', value: 45 }, { date: '2026-07-10', value: 45 },
    { date: '2026-07-14', value: 45 },
  ] }, today);
  assert.match(floorPro.insight, /tu es déjà au plancher calorique \(~\d+ kcal\/j\), relance par le cardio/);
  // Sans profil (BMR incalculable) → energyPlan null → on garde le message qualitatif, calorieTarget null.
  const noProfile = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights: flatWeights }, today);
  assert.equal(noProfile.calorieTarget, null);
  assert.match(noProfile.insight, /baisse un peu tes calories ou ajoute du cardio/);
});

test('adaptiveCoachFocus : focus nutrition — balance flat + tour de taille qui fond → RECADRAGE recomposition', () => {
  const today = '2026-07-16';
  const nutrition = [
    { date: '2026-07-04', protein: 100 }, { date: '2026-07-06', protein: 100 }, { date: '2026-07-08', protein: 100 },
    { date: '2026-07-15', protein: 100 },
  ];
  const flatWeights = [
    { date: '2026-05-01', value: 85 }, { date: '2026-06-10', value: 82 }, { date: '2026-06-20', value: 82 },
    { date: '2026-06-30', value: 82 }, { date: '2026-07-05', value: 82 }, { date: '2026-07-10', value: 82 },
    { date: '2026-07-14', value: 82 },
  ];
  // RECOMP : balance plate (perte, « ne descend plus ») MAIS le tour de taille a fondu de 3 cm (~65 j).
  const measurements = [{ date: '2026-05-10', waist: 92 }, { date: '2026-07-14', waist: 89 }];
  const recomp = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights: flatWeights, measurements }, today);
  assert.deepEqual(recomp.recompFraming, { waistDelta: -3, spanDays: 65 });
  assert.match(recomp.insight, /ton tour de taille a fondu de 3 cm sur les 65 derniers jours/);
  assert.match(recomp.insight, /recomposition.*tu perds du gras en gardant le muscle/);
  assert.match(recomp.insight, /La balance ne dit pas tout/);
  // L'OBSERVATION du plateau reste (« Mais la balance ne descend plus »)…
  assert.match(recomp.insight, /Mais la balance ne descend plus/);
  // …mais l'ORDRE DE COUPE est évincé : plus de « baisse tes calories » qui contredirait « tiens tes
  // calories » du recadrage (deux ordres opposés dans la même phrase, corrigé #564).
  assert.ok(!/baisse un peu tes calories/.test(recomp.insight), 'recomp : aucun ordre de coupe contradictoire');
  assert.ok(!/vise ~\d+ kcal\/j/.test(recomp.insight), 'recomp : aucune cible de coupe chiffrée');
  // MÊME avec profil complet (le plateau serait chiffré « vise ~X kcal de moins ») : la recomposition
  // évince la cible calorique. Sans le fix, l'insight disait « vise ~1875 kcal de moins » PUIS « tiens
  // tes calories avant de couper » — la contradiction la plus dangereuse (un nombre concret à couper).
  const recompPro = L.adaptiveCoachFocus({ nutrition, profile: { height: 180, age: 30, sex: 'homme', activityLevel: 'modere' }, goals: { targetWeight: 79 }, weights: flatWeights, measurements }, today);
  assert.deepEqual(recompPro.recompFraming, { waistDelta: -3, spanDays: 65 });
  assert.equal(recompPro.calorieTarget, null, 'recomp : pas de cible de coupe exposée');
  assert.ok(!/vise ~\d+ kcal\/j/.test(recompPro.insight), 'recomp + profil : la cible chiffrée est évincée');
  assert.ok(!/baisse un peu tes calories/.test(recompPro.insight));
  assert.match(recompPro.insight, /Avant de resserrer pour autant/);
  // Sans mensuration → pas de recadrage.
  const noMeas = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights: flatWeights }, today);
  assert.equal(noMeas.recompFraming, null);
  assert.ok(!/recomposition/.test(noMeas.insight), 'aucune mensuration : pas de note recomp');
  // Tour de taille STABLE (delta 0) → recompositionInsight ne renvoie pas 'recomp' → muet.
  const flatWaist = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights: flatWeights,
    measurements: [{ date: '2026-05-10', waist: 90 }, { date: '2026-07-14', waist: 90 }] }, today);
  assert.equal(flatWaist.recompFraming, null);
  // Objectif de PRISE : la recomposition-perte n'a pas de sens ici → muet même si la taille baisse.
  const gain = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 85 }, measurements, weights: [
    { date: '2026-05-01', value: 78 }, { date: '2026-06-10', value: 81 }, { date: '2026-06-20', value: 81 },
    { date: '2026-06-30', value: 81 }, { date: '2026-07-05', value: 81 }, { date: '2026-07-10', value: 81 },
    { date: '2026-07-14', value: 81 },
  ] }, today);
  assert.equal(gain.recompFraming, null);
  // Balance qui DESCEND vraiment (pas flat) → branche flat inactive → pas de recadrage (fatloss, pas recomp).
  const losing = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, measurements, weights: [
    { date: '2026-05-01', value: 85 }, { date: '2026-06-10', value: 84 }, { date: '2026-06-20', value: 83.5 },
    { date: '2026-06-30', value: 83 }, { date: '2026-07-05', value: 82.5 }, { date: '2026-07-10', value: 82 },
    { date: '2026-07-14', value: 81.5 },
  ] }, today);
  assert.equal(losing.recompFraming, null);
});

test('adaptiveCoachFocus : focus nutrition — le SOMMEIL court, frein caché de la perte de gras', () => {
  const today = '2026-07-16';
  // Nutrition en décrochage (3 j la semaine passée, 1 récente) → nutrition = focus (ton rebuild).
  const nutrition = [
    { date: '2026-07-04', protein: 100 }, { date: '2026-07-06', protein: 100 }, { date: '2026-07-08', protein: 100 },
    { date: '2026-07-15', protein: 100 },
  ];
  // Objectif de PERTE 85 → 79. Sommeil COURT et RÉGULIER (14 nuits à 6 h → avg 6 < 7, stdev 0 → tone
  // 'attention', PAS 'urgent' → le sommeil n'est pas forcé en tête, nutrition reste le focus). Debt = 14
  // nuits × (7,5 − 6) = 21 h sur 14 j. → note « frein caché » APPENDUE, sleepFatLossGuard = 6.
  const shortSleep = [];
  for (const d of ['03','04','05','06','07','08','09','10','11','12','13','14','15','16']) shortSleep.push({ date: `2026-07-${d}`, sleep: 6 });
  const weights = [{ date: '2026-06-01', value: 85 }, { date: '2026-07-14', value: 82 }];
  const drained = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights, recovery: shortSleep }, today);
  assert.equal(drained.pillar, 'nutrition', 'sommeil court mais non urgent → nutrition reste le focus');
  assert.equal(drained.sleepFatLossGuard, 6);
  assert.match(drained.insight, /Et surveille un frein caché : tu dors 6 h en moyenne ces derniers jours \(dette de 21 h sur 14 j\), sous les 7 h/);
  assert.match(drained.insight, /ghréline.*cortisol.*freine la perte de gras/);
  assert.match(drained.insight, /Mieux dormir fait partie du plan/);
  // Le crédit de progression poids reste intact (les deux notes coexistent, leviers distincts).
  assert.equal(drained.weightGoalPct, 50);
  assert.match(drained.insight, /Et ça paie : 50%/);
  // SOMMEIL SOLIDE (8 h) → aucun frein caché, champ null.
  const rested = shortSleep.map(r => ({ ...r, sleep: 8 }));
  const ok = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights, recovery: rested }, today);
  assert.equal(ok.sleepFatLossGuard, null);
  assert.doesNotMatch(ok.insight, /frein caché/);
  // Objectif de PRISE (cible au-dessus) × sommeil court → PENDANT musculaire : le champ perte reste null,
  // mais sleepGainGuard = 6 et la note « frein invisible » (testostérone/GH, synthèse musculaire) s’ajoute.
  const gain = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 90 }, weights: [
    { date: '2026-06-01', value: 82 }, { date: '2026-07-14', value: 85 },
  ], recovery: shortSleep }, today);
  assert.equal(gain.sleepFatLossGuard, null, 'prise : pas de note perte-de-gras');
  assert.doesNotMatch(gain.insight, /frein caché/);
  assert.equal(gain.sleepGainGuard, 6, 'prise × sommeil court : frein musculaire nommé');
  assert.match(gain.insight, /Et surveille un frein invisible : tu dors 6 h en moyenne ces derniers jours \(dette de 21 h sur 14 j\), sous les 7 h/);
  assert.match(gain.insight, /testostérone.*hormone de croissance.*synthèse musculaire.*surplus en gras plutôt qu’en muscle/);
  assert.match(gain.insight, /Bien dormir, c’est transformer tes calories en muscle/);
  // PRISE × sommeil solide (8 h) → aucun frein invisible.
  const gainRested = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 90 }, weights: [
    { date: '2026-06-01', value: 82 }, { date: '2026-07-14', value: 85 },
  ], recovery: rested }, today);
  assert.equal(gainRested.sleepGainGuard, null);
  assert.doesNotMatch(gainRested.insight, /frein invisible/);
  // La note PERTE, elle, ne pose jamais le champ prise.
  assert.equal(drained.sleepGainGuard, null, 'perte : pas de note prise-muscle');
  // Moins de 3 nuits chiffrées → signal trop maigre, champ null.
  const thin = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights, recovery: [
    { date: '2026-07-15', sleep: 6 }, { date: '2026-07-16', sleep: 6 },
  ] }, today);
  assert.equal(thin.sleepFatLossGuard, null);
  assert.doesNotMatch(thin.insight, /frein caché/);
  // Aucune donnée de récup → sleepIns null → champ null, note absente.
  const none = L.adaptiveCoachFocus({ nutrition, goals: { targetWeight: 79 }, weights }, today);
  assert.equal(none.sleepFatLossGuard, null);
  assert.doesNotMatch(none.insight, /frein caché/);
});

test('adaptiveCoachFocus : focus sport — le SOMMEIL court, socle invisible des gains d’entraînement', () => {
  const today = '2026-07-16';
  // Sport en décrochage (3 séances la semaine passée, 1 récente) → sport = focus (ton rebuild, tier 0).
  const workouts = [
    { date: '2026-07-04' }, { date: '2026-07-06' }, { date: '2026-07-08' },
    { date: '2026-07-15' },
  ];
  // Sommeil COURT et RÉGULIER (14 nuits à 6 h → avg 6 < 7, stdev 0 → tone 'attention', PAS 'urgent' → le
  // sommeil n'est pas forcé en tête, sport reste le focus). recovery remplie les deux semaines (recentDays
  // == prevDays == 7) → sommeil tier 9, jamais candidat correction. Debt = 14 × (7,5 − 6) = 21 h sur 14 j.
  const shortSleep = [];
  for (const d of ['03','04','05','06','07','08','09','10','11','12','13','14','15','16']) shortSleep.push({ date: `2026-07-${d}`, sleep: 6 });
  const drained = L.adaptiveCoachFocus({ workouts, recovery: shortSleep }, today);
  assert.equal(drained.pillar, 'sport', 'sommeil court mais non urgent → sport reste le focus');
  assert.equal(drained.sleepTrainGuard, 6);
  assert.match(drained.insight, /Et n’oublie pas le socle invisible de tes gains : tu dors 6 h en moyenne ces derniers jours \(dette de 21 h sur 14 j\), sous les 7 h/);
  assert.match(drained.insight, /consolide l’entraînement.*synthèse protéique.*plafonne les gains de chaque séance.*risque de blessure/);
  assert.match(drained.insight, /Bien dormir démultiplie l’effort/);
  // La note nutrition ne s’invite jamais côté sport (leviers/pilier distincts).
  assert.equal(drained.sleepFatLossGuard, null);
  assert.equal(drained.sleepGainGuard, null);
  assert.doesNotMatch(drained.insight, /frein caché|frein invisible/);
  // SOMMEIL SOLIDE (8 h) → aucun socle invisible, champ null.
  const rested = shortSleep.map(r => ({ ...r, sleep: 8 }));
  const ok = L.adaptiveCoachFocus({ workouts, recovery: rested }, today);
  assert.equal(ok.pillar, 'sport');
  assert.equal(ok.sleepTrainGuard, null);
  assert.doesNotMatch(ok.insight, /socle invisible/);
  // Moins de 3 nuits chiffrées → signal trop maigre, champ null.
  const thin = L.adaptiveCoachFocus({ workouts, recovery: [
    { date: '2026-07-15', sleep: 6 }, { date: '2026-07-16', sleep: 6 },
  ] }, today);
  assert.equal(thin.sleepTrainGuard, null);
  assert.doesNotMatch(thin.insight, /socle invisible/);
  // Aucune donnée de récup → sleepIns null → champ null, note absente.
  const none = L.adaptiveCoachFocus({ workouts }, today);
  assert.equal(none.sleepTrainGuard, null);
  assert.doesNotMatch(none.insight, /socle invisible/);
  // Séance DÉJÀ faite aujourd’hui (doneToday) → pas de note (l’insight félicite, pas de conseil du jour).
  const done = L.adaptiveCoachFocus({ workouts: [...workouts, { date: today }], recovery: shortSleep }, today);
  assert.equal(done.sleepTrainGuard, null);
  assert.doesNotMatch(done.insight, /socle invisible/);
});

test('adaptiveCoachFocus : focus sport — ÉQUILIBRE course ↔ muscu déséquilibré (trainBalanceGuard)', () => {
  const today = '2026-07-16';
  const strengthDay = d => ({ date: d, exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] });
  // Athlète HYBRIDE : muscu il y a 3 semaines (06-25) PUIS 3 sorties de course cette semaine (07-10/12/14).
  // Semaine récente (7 j) = 100 % course → il manque le renfo. Le mois (28 j) contient bien les deux → hybridité prouvée.
  const allRun = { workouts: [strengthDay('2026-06-25'), { date: '2026-07-10', type: 'run' }, { date: '2026-07-12', type: 'run' }, { date: '2026-07-14', type: 'run' }] };
  const fRun = L.adaptiveCoachFocus(allRun, today);
  assert.equal(fRun.pillar, 'sport');
  assert.deepEqual(fRun.trainBalanceGuard, { missing: 'strength', count: 3 });
  assert.match(fRun.insight, /3 sorties de course et zéro renfo/);
  assert.match(fRun.insight, /tout-cardio laisse filer tes gains de force/);
  assert.match(fRun.insight, /Cale une séance de renfo pour rééquilibrer/);
  // Miroir : semaine 100 % muscu (3 séances) + une course il y a 3 semaines → il manque la course.
  const allStrength = { workouts: [{ date: '2026-06-25', type: 'run' }, strengthDay('2026-07-10'), strengthDay('2026-07-12'), strengthDay('2026-07-14')] };
  const fStr = L.adaptiveCoachFocus(allStrength, today);
  assert.equal(fStr.pillar, 'sport');
  assert.deepEqual(fStr.trainBalanceGuard, { missing: 'run', count: 3 });
  assert.match(fStr.insight, /3 séances de muscu et zéro course/);
  assert.match(fStr.insight, /tout-muscu érode la base aérobie/);
  assert.match(fStr.insight, /Cale une sortie de course pour rééquilibrer/);
  // Coureur PUR : aucune muscu sur le mois → hybridité NON prouvée → aucune note (ne pas pousser du renfo à un coureur pur).
  const pureRun = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-10', type: 'run' }, { date: '2026-07-12', type: 'run' }, { date: '2026-07-14', type: 'run' }] }, today);
  assert.equal(pureRun.trainBalanceGuard, null);
  assert.doesNotMatch(pureRun.insight, /rééquilibrer/);
  // Seulement 2 séances d'un type cette semaine → pas un vrai déséquilibre (seuil ≥ 3) → null.
  const thin = L.adaptiveCoachFocus({ workouts: [strengthDay('2026-06-25'), { date: '2026-07-12', type: 'run' }, { date: '2026-07-14', type: 'run' }] }, today);
  assert.equal(thin.trainBalanceGuard, null);
  // Séance DÉJÀ faite aujourd'hui (doneToday) → pas de conseil du jour → null.
  const done = L.adaptiveCoachFocus({ workouts: [...allRun.workouts, { date: today, type: 'run' }] }, today);
  assert.equal(done.trainBalanceGuard, null);
  assert.doesNotMatch(done.insight, /rééquilibrer/);
  // Forme du jour au plancher (readiness 40) → l'action ordonne le repos, on ne pousse pas une séance → null.
  const tired = L.adaptiveCoachFocus({ ...allRun, recovery: [{ date: today, sleep: 5, fatigue: 4, soreness: 4 }] }, today);
  assert.equal(tired.trainBalanceGuard, null);
  assert.doesNotMatch(tired.insight, /rééquilibrer/);
  // Charge en PIC (ACWR haut : 3 courses lourdes récentes vs base faible) → « allège » prime, la note d'équilibre se tait.
  const spikeRun = d => ({ date: d, type: 'run', duration: 120, effort: 5 });
  const spike = L.adaptiveCoachFocus({ workouts: [{ date: '2026-06-25', type: 'run', duration: 40, effort: 2 }, strengthDay('2026-06-26'), spikeRun('2026-07-10'), spikeRun('2026-07-12'), spikeRun('2026-07-14')] }, today);
  assert.equal(spike.loadSpike !== null, true, 'setup : la charge doit bien être en pic');
  assert.equal(spike.trainBalanceGuard, null);
  assert.doesNotMatch(spike.insight, /rééquilibrer/);
});

test('adaptiveCoachFocus : les notes « pousse l’entraînement » se taisent quand la forme GLISSE (readinessSlide)', () => {
  // Contradiction curée (§3, cf. #585) : un jour où l'action dit « Séance allégée aujourd'hui, soigne ta
  // récup » (readinessSlide), les guards qui poussent à ajouter du volume ou à honorer sa séance du jour ne
  // doivent PAS nager à contre-courant. Ils étaient gardés loadSpike/readiness mais PAS readinessSlide.
  const today = '2026-07-16'; // jeudi
  // Readiness EN GLISSADE : 100 → 85 → 70 → 63 → 55 (auj. 55 ∈ [50,75), chute -45 pts sur 5 check-ins).
  const slideRec = [
    { date: '2026-07-04', sleep: 8, fatigue: 1, soreness: 1 },
    { date: '2026-07-06', sleep: 8, fatigue: 2, soreness: 2 },
    { date: '2026-07-10', sleep: 8, fatigue: 3, soreness: 3 },
    { date: '2026-07-13', sleep: 8, fatigue: 3, soreness: 4 },
    { date: '2026-07-16', sleep: 8, fatigue: 4, soreness: 4 },
  ];
  // Forme STABLE (63 constant → readinessSlide null) : même readiness ≥ 50, mais PAS de glissade → les
  // guards doivent PARLER. Prouve que le gate est bien readinessSlide, pas un blocage aveugle.
  const flatRec = ['2026-07-04', '2026-07-06', '2026-07-10', '2026-07-13', '2026-07-16']
    .map(date => ({ date, sleep: 8, fatigue: 3, soreness: 4 }));

  // A. trainBalanceGuard : semaine 100 % muscu chez un hybride → « Cale une sortie de course ».
  const strengthDay = d => ({ date: d, exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] });
  const hybrid = { workouts: [{ date: '2026-06-25', type: 'run' }, strengthDay('2026-07-10'), strengthDay('2026-07-12'), strengthDay('2026-07-14')] };
  const balSlide = L.adaptiveCoachFocus({ ...hybrid, recovery: slideRec }, today);
  assert.equal(balSlide.readinessSlide, -45, 'setup : la forme doit bien glisser');
  assert.equal(balSlide.trainBalanceGuard, null, 'forme qui glisse → trainBalanceGuard se tait');
  assert.doesNotMatch(balSlide.insight, /Cale une sortie de course/);
  assert.match(balSlide.action, /Séance allégée aujourd’hui/);
  const balFlat = L.adaptiveCoachFocus({ ...hybrid, recovery: flatRec }, today);
  assert.equal(balFlat.readinessSlide, null, 'contrôle : forme stable, pas de glissade');
  assert.deepEqual(balFlat.trainBalanceGuard, { missing: 'run', count: 3 }, 'forme stable ≥ 50 → trainBalanceGuard parle toujours');

  // B. pushPullGuard + sportHabitDay : muscu jeudi-dominante, tout en tirage → deux notes qui poussent.
  const w = d => ({ date: d, exercises: [{ name: 'Développé couché', sets: 4, reps: 8 }, { name: 'Tractions', sets: 4, reps: 8 }] });
  const habit = { workouts: ['2026-05-28', '2026-06-04', '2026-06-11', '2026-06-18', '2026-06-25', '2026-07-02', '2026-07-09'].map(w).concat([w('2026-07-13'), w('2026-07-06')]) };
  const habSlide = L.adaptiveCoachFocus({ ...habit, recovery: slideRec }, today);
  assert.equal(habSlide.readinessSlide, -45, 'setup : la forme glisse');
  assert.equal(habSlide.sportHabitDay, null, 'forme qui glisse → sportHabitDay se tait');
  assert.equal(habSlide.pushPullGuard, null, 'forme qui glisse → pushPullGuard se tait');
  assert.equal(habSlide.sportNeglectGuard, null, 'forme qui glisse → sportNeglectGuard se tait');
  assert.doesNotMatch(habSlide.insight, /honore-le aujourd’hui|c’est justement ton jour/);
  const habFlat = L.adaptiveCoachFocus({ ...habit, recovery: flatRec }, today);
  assert.equal(habFlat.readinessSlide, null, 'contrôle : forme stable');
  assert.ok(habFlat.sportHabitDay != null, 'forme stable → sportHabitDay parle toujours');
  assert.ok(habFlat.pushPullGuard != null, 'forme stable → pushPullGuard parle toujours');
});

test('adaptiveCoachFocus : focus sport — balance POUSSÉE ↔ TIRAGE déséquilibrée (pushPullGuard)', () => {
  const today = '2026-07-16';
  const push = d => ({ date: d, exercises: [{ name: 'Pompes classiques', sets: 5, reps: 12 }] });
  const pull = d => ({ date: d, exercises: [{ name: 'Tractions', sets: 3, reps: 8 }] });
  // Muscu du dernier mois très PUSH-HEAVY : 7 séances de pompes (35 séries poussée) pour 1 de tractions
  // (3 séries tirage) → ratio ~11,7 → push-heavy. Aucune course → trainBalanceGuard null (pas hybride), la
  // balance poussée/tirage prend le relais. Dernière séance 07-14 → !doneToday, pas de ré-amorçage dormant.
  const pushHeavy = { workouts: [push('2026-06-22'), push('2026-06-25'), push('2026-06-29'), push('2026-07-03'), push('2026-07-07'), push('2026-07-11'), push('2026-07-14'), pull('2026-06-24')] };
  const fPush = L.adaptiveCoachFocus(pushHeavy, today);
  assert.equal(fPush.pillar, 'sport');
  assert.equal(fPush.trainBalanceGuard, null, 'aucune course → pas hybride → trainBalanceGuard ne parle pas');
  assert.deepEqual(fPush.pushPullGuard, { zone: 'push-heavy', push: 35, pull: 3, ratio: Math.round(35 / 3 * 100) / 100 });
  assert.match(fPush.insight, /balance poussée\/tirage sur 4 semaines : 35 séries de poussée \(pecs, épaules\) pour seulement 3 de tirage/);
  assert.match(fPush.insight, /coiffe des rotateurs en tension/);
  assert.match(fPush.insight, /Ajoute du dos \(tractions, rowing\) à ta prochaine séance/);
  // Cas ZÉRO tirage : que de la poussée → zone no-pull, message « priorité posture ».
  const noPull = { workouts: [push('2026-06-25'), push('2026-06-29'), push('2026-07-05'), push('2026-07-11')] };
  const fNoPull = L.adaptiveCoachFocus(noPull, today);
  assert.equal(fNoPull.pushPullGuard.zone, 'no-pull');
  assert.match(fNoPull.insight, /zéro tirage/);
  assert.match(fNoPull.insight, /c’est ta priorité posture/);
  // Balance CORRECTE (autant de poussée que de tirage) → aucune note, champ null.
  const balanced = { workouts: [push('2026-06-25'), push('2026-07-05'), pull('2026-06-27'), pull('2026-07-07'), pull('2026-07-11')] };
  const fBal = L.adaptiveCoachFocus(balanced, today);
  // 2 push × 5 = 10 séries poussée ; 3 pull × 3 = 9 séries tirage → ratio ~1,11 → balanced → null.
  assert.equal(fBal.pushPullGuard, null);
  assert.doesNotMatch(fBal.insight, /balance poussée/);
  // Volume trop MAIGRE (< 10 séries poussée+tirage sur le mois) → signal non fiable → null.
  const thin = { workouts: [push('2026-07-11')] };
  const fThin = L.adaptiveCoachFocus(thin, today);
  assert.equal(fThin.pushPullGuard, null);
  // Séance DÉJÀ faite aujourd'hui → pas de conseil du jour → null.
  const done = L.adaptiveCoachFocus({ workouts: [...pushHeavy.workouts, push(today)] }, today);
  assert.equal(done.pushPullGuard, null);
  assert.doesNotMatch(done.insight, /balance poussée/);
  // Forme au plancher (readiness 40) → l'action ordonne le repos, on ne charge pas un côté → null.
  const tired = L.adaptiveCoachFocus({ ...pushHeavy, recovery: [{ date: today, sleep: 5, fatigue: 4, soreness: 4 }] }, today);
  assert.equal(tired.pushPullGuard, null);
  // SUBORDINATION à trainBalanceGuard : semaine 100 % course chez un hybride (muscu push-heavy sur le mois)
  // → trainBalanceGuard parle (manque de renfo), pushPullGuard se tait (le signal grossier prime).
  const hybridRunWeek = { workouts: [push('2026-06-22'), push('2026-06-25'), push('2026-06-29'), push('2026-07-01'), { date: '2026-07-10', type: 'run' }, { date: '2026-07-12', type: 'run' }, { date: '2026-07-14', type: 'run' }] };
  const fHybrid = L.adaptiveCoachFocus(hybridRunWeek, today);
  assert.deepEqual(fHybrid.trainBalanceGuard, { missing: 'strength', count: 3 });
  assert.equal(fHybrid.pushPullGuard, null, 'trainBalanceGuard prime → pushPullGuard muet');
});

test('adaptiveCoachFocus : focus sport — zone chroniquement délaissée sur 4 semaines (sportNeglectGuard)', () => {
  const today = '2026-07-16';
  const push = d => ({ date: d, exercises: [{ name: 'Pompes classiques', sets: 5, reps: 12 }] }); // chest/arms/shoulders
  const pull = d => ({ date: d, exercises: [{ name: 'Tractions', sets: 5, reps: 8 }] });           // back/arms
  const abs = d => ({ date: d, exercises: [{ name: 'Gainage planche', sets: 4 }] });                 // abs
  const glute = d => ({ date: d, exercises: [{ name: 'Pont fessier', sets: 4 }] });                  // glutes
  // Un mois de muscu ÉQUILIBRÉE en haut du corps (poussée 15 = tirage 15 → pushPullGuard null) + abdos +
  // fessiers, mais ZÉRO jambe sur 28 j. Aucune course → trainBalanceGuard null (pas hybride). Volume réel
  // (91 séries-zones ≥ 20). Dernière séance 07-10 → !doneToday. Zone la plus délaissée : les jambes (0 série).
  const noLegs = { workouts: [
    push('2026-06-22'), push('2026-06-29'), push('2026-07-06'),
    pull('2026-06-24'), pull('2026-07-01'), pull('2026-07-08'),
    abs('2026-06-26'), abs('2026-07-10'),
    glute('2026-06-28'), glute('2026-07-04'),
  ] };
  const fNeg = L.adaptiveCoachFocus(noLegs, today);
  assert.equal(fNeg.pillar, 'sport');
  assert.equal(fNeg.trainBalanceGuard, null, 'aucune course → pas hybride → trainBalanceGuard muet');
  assert.equal(fNeg.pushPullGuard, null, 'poussée/tirage équilibrés → pushPullGuard muet');
  assert.deepEqual(fNeg.sportNeglectGuard, { zone: 'legs', sets: 0, mean: 13 });
  assert.match(fNeg.insight, /sur le dernier mois, ta zone la plus délaissée, c’est les jambes : zéro série en quatre semaines/);
  assert.match(fNeg.insight, /ajoute les jambes à ton programme cette semaine/);
  // Cas SOUS la moyenne (pas zéro) : jambes travaillées un peu (4 séries) mais loin derrière le reste → note « loin derrière ».
  const fewLegs = { workouts: [...noLegs.workouts, { date: '2026-06-30', exercises: [{ name: 'Chaise au mur', sets: 4 }] }] };
  const fFew = L.adaptiveCoachFocus(fewLegs, today);
  assert.equal(fFew.sportNeglectGuard.zone, 'legs');
  assert.equal(fFew.sportNeglectGuard.sets, 4);
  assert.match(fFew.insight, /les jambes : 4 séries en quatre semaines, loin derrière tes autres groupes/);
  // Volume mensuel MAIGRE (< 20 séries-zones) → « zone délaissée » serait du bruit → null.
  const thin = { workouts: [push('2026-07-08'), abs('2026-07-10')] };
  const fThin = L.adaptiveCoachFocus(thin, today);
  assert.equal(fThin.sportNeglectGuard, null);
  assert.doesNotMatch(fThin.insight, /zone la plus délaissée/);
  // Séance DÉJÀ faite aujourd'hui → pas de conseil du jour → null.
  const done = L.adaptiveCoachFocus({ workouts: [...noLegs.workouts, push(today)] }, today);
  assert.equal(done.sportNeglectGuard, null);
  // Forme au plancher (readiness 40) → l'action ordonne le repos, on ne réclame pas de zone → null.
  const tired = L.adaptiveCoachFocus({ ...noLegs, recovery: [{ date: today, sleep: 5, fatigue: 4, soreness: 4 }] }, today);
  assert.equal(tired.sportNeglectGuard, null);
  // SUBORDINATION à pushPullGuard : muscu push-heavy (dos délaissé) → pushPullGuard parle du dos, sportNeglectGuard muet.
  const pushHeavy = { workouts: [push('2026-06-22'), push('2026-06-25'), push('2026-06-29'), push('2026-07-03'), push('2026-07-07'), push('2026-07-11'), push('2026-07-14'), pull('2026-06-24')] };
  const fPushHeavy = L.adaptiveCoachFocus(pushHeavy, today);
  assert.equal(fPushHeavy.pushPullGuard.zone, 'push-heavy');
  assert.equal(fPushHeavy.sportNeglectGuard, null, 'pushPullGuard prime → sportNeglectGuard muet');
});

test('adaptiveCoachFocus : focus sport — montée de kilométrage de course trop rapide (runVolumeGuard)', () => {
  const today = '2026-07-16';
  const run = (d, km) => ({ type: 'run', date: d, distance: km });
  // Semaine précédente (7-13 j) : 20 km de base. Semaine en cours (0-6 j) : 30 km → +50 %, zone 'high'.
  // Aucune durée/effort → ACWR nul → loadSpike null. Aucune course aujourd'hui → !doneToday.
  const spike = { workouts: [run('2026-07-05', 20), run('2026-07-12', 30)] };
  const fSpike = L.adaptiveCoachFocus(spike, today);
  assert.equal(fSpike.pillar, 'sport');
  assert.equal(fSpike.loadSpike, null, 'sans durée/effort → ACWR nul → pas de pic de charge global');
  assert.deepEqual(fSpike.runVolumeGuard, { thisWeekKm: 30, lastWeekKm: 20, rampPct: 50 });
  assert.match(fSpike.insight, /surveille ta montée de kilométrage/);
  assert.match(fSpike.insight, /de 20 à 30 km de course cette semaine \(\+50 %\)/);
  assert.match(fSpike.insight, /\+10 %\/semaine/);
  // Base trop maigre (semaine précédente < 10 km) : « +150 % » sur 4 km serait du bruit → null.
  const thinBase = { workouts: [run('2026-07-05', 4), run('2026-07-12', 10)] };
  assert.equal(L.adaptiveCoachFocus(thinBase, today).runVolumeGuard, null);
  // Progression maîtrisée (+5 %, zone 'steady') → null.
  const steady = { workouts: [run('2026-07-05', 20), run('2026-07-12', 21)] };
  assert.equal(L.adaptiveCoachFocus(steady, today).runVolumeGuard, null);
  // Muscu pure (aucune course) → weeklyKmRamp nul → null.
  const strengthOnly = { workouts: [{ date: '2026-07-05', exercises: [{ name: 'Pompes classiques', sets: 5, reps: 12 }] }, { date: '2026-07-12', exercises: [{ name: 'Pompes classiques', sets: 5, reps: 12 }] }] };
  assert.equal(L.adaptiveCoachFocus(strengthOnly, today).runVolumeGuard, null);
  // Course déjà faite aujourd'hui → conseil du jour muet → null.
  const doneRun = { workouts: [run('2026-07-05', 20), run('2026-07-12', 30), run(today, 5)] };
  assert.equal(L.adaptiveCoachFocus(doneRun, today).runVolumeGuard, null);
  // Forme au plancher (readiness 40) → l'action ordonne le repos, on ne réclame pas de volume → null.
  const tired = L.adaptiveCoachFocus({ ...spike, recovery: [{ date: today, sleep: 5, fatigue: 4, soreness: 4 }] }, today);
  assert.equal(tired.runVolumeGuard, null);
});

test('adaptiveCoachFocus : focus sport — jour d’entraînement de prédilection = aujourd’hui (sportHabitDay)', () => {
  const today = '2026-07-16'; // un JEUDI (Mon0=3)
  const ex = d => ({ date: d, exercises: [{ name: 'Pompes classiques', sets: 5, reps: 12 }] });
  // 6 séances le JEUDI (jour dominant) + 3 le mardi sur 8 semaines → jeudi 6/9 = 67 %, pic unique.
  // Aucune séance aujourd'hui (!doneToday), exercices sans durée/effort → ACWR nul → loadSpike null.
  const thu = ['2026-07-09', '2026-07-02', '2026-06-25', '2026-06-18', '2026-06-11', '2026-06-04'];
  const tue = ['2026-07-14', '2026-06-30', '2026-06-16'];
  const habit = { workouts: [...thu, ...tue].map(ex) };
  const f = L.adaptiveCoachFocus(habit, today);
  assert.equal(f.pillar, 'sport');
  assert.equal(f.loadSpike, null, 'sans durée/effort → pas de pic de charge global');
  assert.deepEqual(f.sportHabitDay, { weekday: 3, count: 6, total: 9, pct: 67 });
  assert.match(f.insight, /c’est justement ton jour/);
  assert.match(f.insight, /c’est le jeudi que tu t’entraînes le plus \(6 séances sur 9, 67 %\)/);
  assert.match(f.insight, /ancre d’habitude/);
  // Aujourd'hui n'est PAS le jour dominant (mercredi) → note muette même si l'habitude existe.
  assert.equal(L.adaptiveCoachFocus(habit, '2026-07-15').sportHabitDay, null, 'jour ≠ jour dominant → null');
  // Base trop maigre (< 8 séances sur 8 sem) : « ton jour » serait du bruit → null.
  const thin = { workouts: thu.slice(0, 4).map(ex) }; // 4 jeudis seulement
  assert.equal(L.adaptiveCoachFocus(thin, today).sportHabitDay, null, 'moins de 8 séances → pas de vraie habitude');
  // Séance déjà faite aujourd'hui → l'habitude est honorée → null.
  const doneToday = { workouts: [...habit.workouts, ex(today)] };
  assert.equal(L.adaptiveCoachFocus(doneToday, today).sportHabitDay, null, 'séance du jour faite → null');
  // Forme au plancher (readiness bas) → l'action ordonne le repos, on ne pousse pas la séance → null.
  const tired = L.adaptiveCoachFocus({ ...habit, recovery: [{ date: today, sleep: 5, fatigue: 4, soreness: 4 }] }, today);
  assert.equal(tired.sportHabitDay, null, 'forme au rouge → null');
  // Aucun jour dominant (séances éparpillées, part < 30 %) → null.
  const spread = { workouts: ['2026-07-09', '2026-07-02', '2026-06-25', '2026-07-13', '2026-06-29', '2026-07-14', '2026-06-30', '2026-07-08', '2026-06-24', '2026-07-10', '2026-06-26'].map(ex) };
  assert.equal(L.adaptiveCoachFocus(spread, today).sportHabitDay, null, 'aucune concentration (< 30 %) → null');
});

test('adaptiveCoachFocus : focus focus — le SOMMEIL court, carburant caché de la concentration', () => {
  const today = '2026-07-16';
  // Focus en décrochage (3 blocs la semaine passée, 1 récent) → focus = focus (ton rebuild, tier 0).
  // Dernier bloc = 2026-07-14 → aucun bloc aujourd’hui (!doneToday vrai).
  const focusSessions = [
    { date: '2026-07-05', minutes: 30, task: 'Thèse' }, { date: '2026-07-06', minutes: 30, task: 'Thèse' },
    { date: '2026-07-07', minutes: 30, task: 'Thèse' }, { date: '2026-07-14', minutes: 25, task: 'Thèse' },
  ];
  // Sommeil COURT et RÉGULIER (14 nuits à 6 h → avg 6 < 7, stdev 0 → tone 'attention', PAS 'urgent' → le
  // sommeil n’est pas forcé en tête, focus reste le focus). recovery remplie les deux semaines → sommeil
  // tier 9, jamais candidat. Debt = 14 × (7,5 − 6) = 21 h sur 14 j.
  const shortSleep = [];
  for (const d of ['03','04','05','06','07','08','09','10','11','12','13','14','15','16']) shortSleep.push({ date: `2026-07-${d}`, sleep: 6 });
  const drained = L.adaptiveCoachFocus({ focusSessions, recovery: shortSleep }, today);
  assert.equal(drained.pillar, 'focus', 'sommeil court mais non urgent → focus reste le focus');
  assert.equal(drained.sleepFocusGuard, 6);
  assert.match(drained.insight, /Et n’oublie pas ce qui alimente ta concentration : tu dors 6 h en moyenne ces derniers jours \(dette de 21 h sur 14 j\), sous les 7 h/);
  assert.match(drained.insight, /émousse l’attention et la mémoire de travail.*consolide ce que tu apprends le jour/);
  assert.match(drained.insight, /démultiplie chaque bloc de focus/);
  // Les notes des autres piliers ne s’invitent jamais côté focus (leviers/pilier distincts).
  assert.equal(drained.sleepFatLossGuard, null);
  assert.equal(drained.sleepGainGuard, null);
  assert.equal(drained.sleepTrainGuard, null);
  assert.doesNotMatch(drained.insight, /frein caché|frein invisible|socle invisible/);
  // SOMMEIL SOLIDE (8 h) → aucun carburant caché, champ null.
  const rested = shortSleep.map(r => ({ ...r, sleep: 8 }));
  const ok = L.adaptiveCoachFocus({ focusSessions, recovery: rested }, today);
  assert.equal(ok.pillar, 'focus');
  assert.equal(ok.sleepFocusGuard, null);
  assert.doesNotMatch(ok.insight, /alimente ta concentration/);
  // Moins de 3 nuits chiffrées → signal trop maigre, champ null.
  const thin = L.adaptiveCoachFocus({ focusSessions, recovery: [
    { date: '2026-07-15', sleep: 6 }, { date: '2026-07-16', sleep: 6 },
  ] }, today);
  assert.equal(thin.sleepFocusGuard, null);
  assert.doesNotMatch(thin.insight, /alimente ta concentration/);
  // Aucune donnée de récup → sleepIns null → champ null, note absente.
  const none = L.adaptiveCoachFocus({ focusSessions }, today);
  assert.equal(none.sleepFocusGuard, null);
  assert.doesNotMatch(none.insight, /alimente ta concentration/);
  // Bloc DÉJÀ posé aujourd’hui (doneToday) → pas de note.
  const done = L.adaptiveCoachFocus({ focusSessions: [...focusSessions, { date: today, minutes: 30, task: 'Thèse' }], recovery: shortSleep }, today);
  assert.equal(done.sleepFocusGuard, null);
  assert.doesNotMatch(done.insight, /alimente ta concentration/);
});

test('adaptiveCoachFocus : focus focus — coucher IRRÉGULIER (durée OK) émousse la concentration', () => {
  const today = '2026-07-16';
  // Focus en décrochage → focus = focus (ton rebuild), aucun bloc aujourd’hui (!doneToday).
  const focusSessions = [
    { date: '2026-07-05', minutes: 30, task: 'Thèse' }, { date: '2026-07-06', minutes: 30, task: 'Thèse' },
    { date: '2026-07-07', minutes: 30, task: 'Thèse' }, { date: '2026-07-14', minutes: 25, task: 'Thèse' },
  ];
  // Sommeil de DURÉE correcte (8 h → avg 8 ≥ 7 → sleepFocusGuard null, PAS court) mais COUCHER erratique :
  // alternance 22:00 (ancre 600) / 03:00 (ancre 900) → écart-type 150 min ≥ 60 → irregular, tone 'attention'
  // (durée correcte mais irrégulier), non urgent → sommeil pas forcé, focus reste le focus.
  const irregBed = [];
  const dd = ['03','04','05','06','07','08','09','10','11','12','13','14','15','16'];
  dd.forEach((d, i) => irregBed.push({ date: `2026-07-${d}`, sleep: 8, bedtime: i % 2 ? '03:00' : '22:00' }));
  const wobbly = L.adaptiveCoachFocus({ focusSessions, recovery: irregBed }, today);
  assert.equal(wobbly.pillar, 'focus', 'durée correcte + coucher irrégulier (non urgent) → focus reste le focus');
  assert.equal(wobbly.sleepFocusGuard, null, 'durée non courte → pas de note « sommeil court »');
  assert.equal(wobbly.bedtimeFocusGuard, 150, 'écart-type des couchers renvoyé');
  assert.match(wobbly.insight, /Ta durée de sommeil tient, mais tes couchers partent dans tous les sens \(±150 min d’un soir à l’autre\)/);
  assert.match(wobbly.insight, /horloge stable.*désynchronise l’horloge interne qui cadence la vigilance/);
  assert.match(wobbly.insight, /Se coucher à heure fixe compte ici autant que le nombre d’heures/);
  // Les deux notes sommeil (durée vs timing) ne coexistent pas : ici seule celle du timing parle.
  assert.doesNotMatch(wobbly.insight, /alimente ta concentration/);
  // COUCHER RÉGULIER (tous à 23:00, durée OK) → écart-type 0 < 60 → champ null, note absente.
  const steady = irregBed.map(r => ({ ...r, bedtime: '23:00' }));
  const calm = L.adaptiveCoachFocus({ focusSessions, recovery: steady }, today);
  assert.equal(calm.pillar, 'focus');
  assert.equal(calm.bedtimeFocusGuard, null);
  assert.doesNotMatch(calm.insight, /couchers partent dans tous les sens/);
  // Sommeil COURT (6 h) ET coucher irrégulier → tone 'urgent' → pilier forcé sur SOMMEIL (la durée prime) :
  // on n’entre pas dans la branche focus, bedtimeFocusGuard reste null — les deux notes ne se pilent jamais.
  const shortIrreg = irregBed.map(r => ({ ...r, sleep: 6 }));
  const urgent = L.adaptiveCoachFocus({ focusSessions, recovery: shortIrreg }, today);
  assert.equal(urgent.pillar, 'sommeil');
  assert.equal(urgent.bedtimeFocusGuard, null);
  assert.equal(urgent.sleepFocusGuard, null);
  // Moins de 3 couchers renseignés → écart-type indisponible → champ null.
  const thinBed = L.adaptiveCoachFocus({ focusSessions, recovery: [
    { date: '2026-07-15', sleep: 8, bedtime: '22:00' }, { date: '2026-07-16', sleep: 8, bedtime: '03:00' },
  ] }, today);
  assert.equal(thinBed.bedtimeFocusGuard, null);
  assert.doesNotMatch(thinBed.insight, /couchers partent dans tous les sens/);
  // Bloc DÉJÀ posé aujourd’hui (doneToday) → pas de note.
  const done = L.adaptiveCoachFocus({ focusSessions: [...focusSessions, { date: today, minutes: 30, task: 'Thèse' }], recovery: irregBed }, today);
  assert.equal(done.bedtimeFocusGuard, null);
  assert.doesNotMatch(done.insight, /couchers partent dans tous les sens/);
});

test('adaptiveCoachFocus : focus focus — coucher qui se RESSERRE (renfort positif circadien)', () => {
  const today = '2026-07-16';
  // Focus en décrochage → focus = focus (ton rebuild), aucun bloc aujourd’hui (!doneToday).
  const focusSessions = [
    { date: '2026-07-05', minutes: 30, task: 'Thèse' }, { date: '2026-07-06', minutes: 30, task: 'Thèse' },
    { date: '2026-07-07', minutes: 30, task: 'Thèse' }, { date: '2026-07-14', minutes: 25, task: 'Thèse' },
  ];
  const prevD = ['03', '04', '05', '06', '07', '08', '09'];   // fenêtre précédente (7 j)
  const recD = ['10', '11', '12', '13', '14', '15', '16'];    // fenêtre récente (7 j)
  const mk = (dates, bedFn, sleep) => dates.map((d, i) => ({ date: `2026-07-${d}`, sleep, bedtime: bedFn(i) }));
  // Semaine passée dispersée (22:30/23:30 → écart-type ~30 min), semaine récente tenue à heure fixe
  // (23:00 → écart-type 0). Durée 8 h (sleepFocusGuard null). Dispersion globale sur 14 nuits ~21 min
  // < 60 → bedtimeFocusGuard null. bedtimeRegularityTrend : delta 0−30 = −30 ≤ −15 → 'tightening'.
  const rising = [...mk(prevD, i => (i % 2 ? '23:30' : '22:30'), 8), ...mk(recD, () => '23:00', 8)];
  const tighten = L.adaptiveCoachFocus({ focusSessions, recovery: rising }, today);
  assert.equal(tighten.pillar, 'focus');
  assert.equal(tighten.sleepFocusGuard, null, 'durée OK → pas de note « sommeil court »');
  assert.equal(tighten.bedtimeFocusGuard, null, 'couchers pas dispersés maintenant → pas d’alerte');
  assert.equal(tighten.bedtimeFocusTrend, -30, 'delta signé d’écart-type (resserrement) renvoyé');
  assert.match(tighten.insight, /Bonne nouvelle côté horloge interne : tes couchers se resserrent \(±30 → ±0 min d’un soir à l’autre\)/);
  assert.match(tighten.insight, /réaligne l’horloge circadienne qui cadence la vigilance.*vont suivre/);
  assert.match(tighten.insight, /Tiens ce cap, ta concentration a tout à y gagner/);
  // Aucune collision avec les notes d’avertissement (durée / timing).
  assert.doesNotMatch(tighten.insight, /partent dans tous les sens/);
  assert.doesNotMatch(tighten.insight, /alimente ta concentration/);
  // Couchers STABLES dans les deux fenêtres (tous 23:00) → delta 0 → dir 'flat' → champ null, pas de note.
  const steady = [...mk(prevD, () => '23:00', 8), ...mk(recD, () => '23:00', 8)];
  const calm = L.adaptiveCoachFocus({ focusSessions, recovery: steady }, today);
  assert.equal(calm.bedtimeFocusTrend, null);
  assert.doesNotMatch(calm.insight, /tes couchers se resserrent/);
  // SOMMEIL COURT (6 h) qui prime : même avec un resserrement, sleepFocusGuard parle et la note positive
  // reste muette (une seule note sommeil/jour ; la durée est le manque le plus grossier).
  const shortTighten = [...mk(prevD, i => (i % 2 ? '23:30' : '22:30'), 6), ...mk(recD, () => '23:00', 6)];
  const short = L.adaptiveCoachFocus({ focusSessions, recovery: shortTighten }, today);
  assert.equal(short.pillar, 'focus');
  assert.equal(short.sleepFocusGuard, 6);
  assert.equal(short.bedtimeFocusTrend, null, 'note durée prime → renfort circadien muet');
  assert.match(short.insight, /alimente ta concentration/);
  assert.doesNotMatch(short.insight, /tes couchers se resserrent/);
  // Couchers ENCORE DISPERSÉS maintenant (prev 22:00/03:00, recent 22:30/23:30) : écart-type global ≥ 60
  // → bedtimeFocusGuard alerte, la note positive ne s’empile PAS dessus même si la tendance se resserre.
  const stillWide = [...mk(prevD, i => (i % 2 ? '03:00' : '22:00'), 8), ...mk(recD, i => (i % 2 ? '23:30' : '22:30'), 8)];
  const wide = L.adaptiveCoachFocus({ focusSessions, recovery: stillWide }, today);
  assert.equal(wide.pillar, 'focus');
  assert.ok(wide.bedtimeFocusGuard >= 60, 'couchers encore dispersés → alerte');
  assert.equal(wide.bedtimeFocusTrend, null, 'renfort exclu tant que les couchers sont dispersés');
  assert.match(wide.insight, /partent dans tous les sens/);
  assert.doesNotMatch(wide.insight, /tes couchers se resserrent/);
  // Bloc DÉJÀ posé aujourd’hui (doneToday) → pas de note.
  const done = L.adaptiveCoachFocus({ focusSessions: [...focusSessions, { date: today, minutes: 30, task: 'Thèse' }], recovery: rising }, today);
  assert.equal(done.bedtimeFocusTrend, null);
  assert.doesNotMatch(done.insight, /tes couchers se resserrent/);
});

test('adaptiveCoachFocus : focus focus — hydratation basse, levier aigu de la concentration', () => {
  const today = '2026-07-16';
  // Focus en décrochage → focus = focus (ton rebuild), aucun bloc aujourd’hui (!doneToday).
  const focusSessions = [
    { date: '2026-07-05', minutes: 30, task: 'Thèse' }, { date: '2026-07-06', minutes: 30, task: 'Thèse' },
    { date: '2026-07-07', minutes: 30, task: 'Thèse' }, { date: '2026-07-14', minutes: 25, task: 'Thèse' },
  ];
  // Sommeil de DURÉE correcte (8 h) SANS heure de coucher → sleepFocusGuard/bedtimeFocusGuard/
  // bedtimeFocusTrend tous null : les trois notes sommeil se taisent, l’hydratation peut parler.
  const recovery = ['10', '11', '12', '13', '14', '15', '16'].map(d => ({ date: `2026-07-${d}`, sleep: 8 }));
  // Hydratation chroniquement basse : 4 verres/jour sur 4 jours récents (avg 4 < 6, sous la cible de 8).
  const nutrition = ['11', '12', '14', '15'].map(d => ({ date: `2026-07-${d}`, water: 4 }));
  const dry = L.adaptiveCoachFocus({ focusSessions, recovery, nutrition }, today);
  assert.equal(dry.pillar, 'focus', 'focus reste le pilier (nutrition récente sans passé → pas un fix)');
  assert.equal(dry.sleepFocusGuard, null, 'durée OK → pas de note « sommeil court »');
  assert.equal(dry.bedtimeFocusGuard, null, 'pas de coucher saisi → pas d’alerte timing');
  assert.equal(dry.bedtimeFocusTrend, null, 'pas de coucher saisi → pas de renfort circadien');
  assert.equal(dry.hydrationFocusGuard, 4, 'moyenne de verres récente renvoyée');
  assert.match(dry.insight, /Et un levier immédiat, souvent négligé : tu bois 4 verres d’eau par jour ces derniers jours, sous les 8/);
  assert.match(dry.insight, /déshydratation légère.*brouille l’attention et la mémoire de travail/);
  assert.match(dry.insight, /Contrairement au sommeil, ça se corrige en minutes : un grand verre d’eau avant ton bloc/);
  // Aucune collision avec les notes sommeil.
  assert.doesNotMatch(dry.insight, /alimente ta concentration/);
  assert.doesNotMatch(dry.insight, /partent dans tous les sens/);
  // Bien HYDRATÉ (8 verres → avg 8 ≥ 6) → champ null, note absente.
  const wet = L.adaptiveCoachFocus({ focusSessions, recovery, nutrition: nutrition.map(n => ({ ...n, water: 8 })) }, today);
  assert.equal(wet.hydrationFocusGuard, null);
  assert.doesNotMatch(wet.insight, /un levier immédiat, souvent négligé/);
  // Moins de 3 jours d’hydratation saisis → champ null (données réelles insuffisantes).
  const thin = L.adaptiveCoachFocus({ focusSessions, recovery, nutrition: [
    { date: '2026-07-15', water: 4 }, { date: '2026-07-16', water: 3 },
  ] }, today);
  assert.equal(thin.hydrationFocusGuard, null);
  assert.doesNotMatch(thin.insight, /un levier immédiat, souvent négligé/);
  // SOMMEIL COURT (6 h) qui prime : sleepFocusGuard parle, l’hydratation reste muette (une note socle/jour).
  const short = L.adaptiveCoachFocus({ focusSessions, recovery: recovery.map(r => ({ ...r, sleep: 6 })), nutrition }, today);
  assert.equal(short.pillar, 'focus');
  assert.equal(short.sleepFocusGuard, 6);
  assert.equal(short.hydrationFocusGuard, null, 'note sommeil prime → hydratation muette');
  assert.match(short.insight, /alimente ta concentration/);
  assert.doesNotMatch(short.insight, /un levier immédiat, souvent négligé/);
  // Bloc DÉJÀ posé aujourd’hui (doneToday) → pas de note.
  const done = L.adaptiveCoachFocus({ focusSessions: [...focusSessions, { date: today, minutes: 30, task: 'Thèse' }], recovery, nutrition }, today);
  assert.equal(done.hydrationFocusGuard, null);
  assert.doesNotMatch(done.insight, /un levier immédiat, souvent négligé/);
});

test('adaptiveCoachFocus : focus sport — hydratation basse, carburant oublié de l’effort', () => {
  const today = '2026-07-16';
  // Sport en décrochage (3 séances la semaine passée, 1 récente) → sport = focus (ton rebuild), aucune
  // séance aujourd’hui (!doneToday).
  const workouts = [
    { date: '2026-07-04' }, { date: '2026-07-06' }, { date: '2026-07-08' },
    { date: '2026-07-15' },
  ];
  // Sommeil de DURÉE SOLIDE (8 h) → sleepTrainGuard null : le socle sommeil se tait, l’hydratation relaie.
  const recovery = ['10', '11', '12', '13', '14', '15', '16'].map(d => ({ date: `2026-07-${d}`, sleep: 8 }));
  // Hydratation chroniquement basse : 4 verres/jour sur 4 jours récents (avg 4 < 6, sous la cible de 8).
  const nutrition = ['11', '12', '14', '15'].map(d => ({ date: `2026-07-${d}`, water: 4 }));
  const dry = L.adaptiveCoachFocus({ workouts, recovery, nutrition }, today);
  assert.equal(dry.pillar, 'sport', 'sport reste le pilier (nutrition récente sans passé → pas un fix)');
  assert.equal(dry.sleepTrainGuard, null, 'sommeil solide → pas de note « socle invisible »');
  assert.equal(dry.hydrationTrainGuard, 4, 'moyenne de verres récente renvoyée');
  assert.match(dry.insight, /Et pense à un carburant qu’on oublie à l’effort : tu bois 4 verres d’eau par jour ces derniers jours, sous les 8/);
  assert.match(dry.insight, /déshydratation légère.*fait chuter la force, la puissance et l’endurance/);
  assert.match(dry.insight, /Ça se corrige tout de suite : un grand verre avant de bouger, et une gourde à côté de toi pendant l’effort/);
  // Aucune collision avec les notes sommeil ni avec la note d’hydratation côté focus.
  assert.doesNotMatch(dry.insight, /socle invisible/);
  assert.doesNotMatch(dry.insight, /un levier immédiat, souvent négligé|avant ton bloc/);
  // Bien HYDRATÉ (8 verres → avg 8 ≥ 6) → champ null, note absente.
  const wet = L.adaptiveCoachFocus({ workouts, recovery, nutrition: nutrition.map(n => ({ ...n, water: 8 })) }, today);
  assert.equal(wet.hydrationTrainGuard, null);
  assert.doesNotMatch(wet.insight, /un carburant qu’on oublie à l’effort/);
  // Moins de 3 jours d’hydratation saisis → champ null (données réelles insuffisantes).
  const thin = L.adaptiveCoachFocus({ workouts, recovery, nutrition: [
    { date: '2026-07-15', water: 4 }, { date: '2026-07-16', water: 3 },
  ] }, today);
  assert.equal(thin.hydrationTrainGuard, null);
  assert.doesNotMatch(thin.insight, /un carburant qu’on oublie à l’effort/);
  // SOMMEIL COURT (6 h) qui prime : sleepTrainGuard parle, l’hydratation reste muette (une note socle/jour).
  const short = L.adaptiveCoachFocus({ workouts, recovery: recovery.map(r => ({ ...r, sleep: 6 })), nutrition }, today);
  assert.equal(short.pillar, 'sport');
  assert.equal(short.sleepTrainGuard, 6);
  assert.equal(short.hydrationTrainGuard, null, 'note sommeil prime → hydratation muette');
  assert.match(short.insight, /socle invisible/);
  assert.doesNotMatch(short.insight, /un carburant qu’on oublie à l’effort/);
  // Séance DÉJÀ faite aujourd’hui (doneToday) → pas de note.
  const done = L.adaptiveCoachFocus({ workouts: [...workouts, { date: today }], recovery, nutrition }, today);
  assert.equal(done.hydrationTrainGuard, null);
  assert.doesNotMatch(done.insight, /un carburant qu’on oublie à l’effort/);
});

test('adaptiveCoachFocus : focus nutrition — forme du jour basse, l’assiette dérape (readinessNutriGuard)', () => {
  const today = '2026-07-16';
  // Nutrition = pilier (profil + protéines sous la cible, en décrochage récent).
  const nutrition = [
    { date: '2026-07-03', protein: 60 }, { date: '2026-07-04', protein: 60 },
    { date: '2026-07-05', protein: 60 }, { date: '2026-07-15', protein: 50 },
  ];
  // Check-in DATÉ DU JOUR, readiness au plancher SANS nuit courte (sommeil 8 h, fatigue + courbatures
  // au max → score 40 < 50) : la note vise l’état AIGU du jour, pas un sommeil chronique.
  const rec = [{ date: today, sleep: 8, fatigue: 5, soreness: 5 }];
  const low = L.adaptiveCoachFocus({ profile: { weight: 80, goal: 'force' }, nutrition, recovery: rec }, today);
  assert.equal(low.pillar, 'nutrition');
  assert.equal(low.readinessNutriGuard, 40, 'score de readiness du jour renvoyé');
  assert.equal(low.sleepFatLossGuard, null);
  assert.equal(low.sleepGainGuard, null);
  assert.match(low.insight, /ta forme est basse ce matin \(readiness 40\/100\), et les jours de fatigue sont ceux où l’assiette dérape le plus/);
  assert.match(low.insight, /te protègent des fringales bien mieux que la volonté sur une réserve vide/);
  // Forme du jour OK (readiness ≥ 50) → champ null, note absente.
  const ok = L.adaptiveCoachFocus({ profile: { weight: 80, goal: 'force' }, nutrition, recovery: [{ date: today, sleep: 8, fatigue: 1, soreness: 1 }] }, today);
  assert.equal(ok.readinessNutriGuard, null);
  assert.doesNotMatch(ok.insight, /l’assiette dérape/);
  // Aucun check-in aujourd’hui (readiness d’hier seulement) → champ null (une forme d’hier ne dit rien).
  const stale = L.adaptiveCoachFocus({ profile: { weight: 80, goal: 'force' }, nutrition, recovery: [{ date: '2026-07-15', sleep: 8, fatigue: 5, soreness: 5 }] }, today);
  assert.equal(stale.readinessNutriGuard, null);
  assert.doesNotMatch(stale.insight, /l’assiette dérape/);
  // RELAIS : sur un objectif de PERTE + sommeil chroniquement court, le frein caché (sleepFatLossGuard)
  // prime — une seule note inter-pilier/jour, la note « assiette dérape » reste muette.
  const shortNights = [];
  for (const d of ['03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15']) shortNights.push({ date: `2026-07-${d}`, sleep: 6 });
  shortNights.push({ date: today, sleep: 6, fatigue: 5, soreness: 5 });
  const relay = L.adaptiveCoachFocus({ nutrition: [
    { date: '2026-07-04', protein: 100 }, { date: '2026-07-06', protein: 100 },
    { date: '2026-07-08', protein: 100 }, { date: '2026-07-15', protein: 100 },
  ], goals: { targetWeight: 79 }, weights: [{ date: '2026-06-01', value: 85 }, { date: '2026-07-14', value: 82 }], recovery: shortNights }, today);
  assert.equal(relay.pillar, 'nutrition');
  assert.equal(relay.sleepFatLossGuard, 6, 'frein caché sommeil actif');
  assert.equal(relay.readinessNutriGuard, null, 'note sommeil prime → l’assiette dérape muette');
  assert.doesNotMatch(relay.insight, /l’assiette dérape/);
});

test('adaptiveCoachFocus : focus enrichi — l’action nomme la tâche phare réelle', () => {
  const today = '2026-07-16';
  // Focus en décrochage (3 j la semaine passée, 1 récente) → tone rebuild, focus est le focus.
  const decline = { focusSessions: [
    { date: '2026-07-05', minutes: 30, task: 'Compta' }, { date: '2026-07-06', minutes: 30, task: 'Compta' },
    { date: '2026-07-07', minutes: 30, task: 'Compta' }, { date: '2026-07-14', minutes: 25, task: 'Compta' },
  ] };
  const fd = L.adaptiveCoachFocus(decline, today);
  assert.equal(fd.pillar, 'focus'); assert.equal(fd.tone, 'rebuild');
  assert.equal(fd.focusTask, 'Compta', 'tâche phare exposée pour le style/les tests');
  assert.match(fd.action, /Reprends « Compta »/, 'l’action nomme le chantier de focus phare');
  assert.match(fd.action, /115 min sur 14 j/, 'et cite le temps réel passé dessus');
  // Focus en hausse (1 la semaine passée, 3 récentes) → tone reinforce → phrasé « ta concentration va surtout à ».
  // (Dernier bloc = hier, pas aujourd'hui, pour tester le phrasé de renfort sans déclencher le crédit « déjà posé aujourd'hui ».)
  const rising = { focusSessions: [
    { date: '2026-07-05', minutes: 30, task: 'Thèse' }, { date: '2026-07-13', minutes: 30, task: 'Thèse' },
    { date: '2026-07-14', minutes: 30, task: 'Thèse' }, { date: '2026-07-15', minutes: 30, task: 'Thèse' },
  ] };
  const fr = L.adaptiveCoachFocus(rising, today);
  assert.equal(fr.pillar, 'focus'); assert.equal(fr.tone, 'reinforce');
  assert.equal(fr.focusTask, 'Thèse');
  assert.match(fr.action, /Ta concentration va surtout à « Thèse »/, 'phrasé renforcement quand la dynamique monte');
  // Que du « Sans titre » (aucune tâche nommée) → dégrade proprement vers l’action générique.
  const untitled = { focusSessions: [
    { date: '2026-07-05', minutes: 30 }, { date: '2026-07-06', minutes: 30 },
    { date: '2026-07-07', minutes: 30 }, { date: '2026-07-14', minutes: 25 },
  ] };
  const fu = L.adaptiveCoachFocus(untitled, today);
  assert.equal(fu.pillar, 'focus');
  assert.equal(fu.focusTask, null, 'sans tâche nommée : pas d’enrichissement');
  // Sans tâche nommée mais avec assez d’historique (30,30,30,25 → médiane 30), le bloc générique est
  // quand même personnalisé sur la durée habituelle plutôt qu’un 25 min fixe.
  assert.match(fu.action, /Lance une session de focus de 30 min \(ta durée habituelle\)/, 'bloc générique personnalisé sur la durée habituelle');
  // Un autre pilier (sport) → pas de champ focusTask parasite.
  const sport = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-15' }] }, today);
  assert.equal(sport.pillar, 'sport'); assert.equal(sport.focusTask, null, 'focusTask null hors pilier focus');
  assert.equal(sport.focusBlockMin, null, 'focusBlockMin null hors pilier focus');
});

test('adaptiveCoachFocus : la longueur de bloc focus se cale sur la durée médiane réelle', () => {
  const today = '2026-07-16';
  // Décrochage focus, tâche nommée « Compta », sessions longues (50,50,50 min récentes) → médiane 50.
  const long = { focusSessions: [
    { date: '2026-07-05', minutes: 50, task: 'Compta' }, { date: '2026-07-06', minutes: 50, task: 'Compta' },
    { date: '2026-07-07', minutes: 50, task: 'Compta' }, { date: '2026-07-14', minutes: 50, task: 'Compta' },
  ] };
  const fl = L.adaptiveCoachFocus(long, today);
  assert.equal(fl.pillar, 'focus'); assert.equal(fl.tone, 'rebuild');
  assert.equal(fl.focusBlockMin, 50, 'médiane des durées réelles = 50 min');
  assert.match(fl.action, /un bloc de 50 min \(ta durée habituelle\)/, 'la durée habituelle est citée dans l’action tâche phare');
  // Arrondi à 5 min + borne haute 60 : sessions 63,64,65 → médiane 64 → arrondi 65 → borné 60.
  const capped = { focusSessions: [
    { date: '2026-07-05', minutes: 63, task: 'Thèse' }, { date: '2026-07-06', minutes: 64, task: 'Thèse' }, { date: '2026-07-07', minutes: 65, task: 'Thèse' },
    { date: '2026-07-13', minutes: 63, task: 'Thèse' }, { date: '2026-07-14', minutes: 64, task: 'Thèse' },
  ] };
  const fc = L.adaptiveCoachFocus(capped, today);
  assert.equal(fc.focusBlockMin, 60, 'durées longues bornées à 60 min');
  // Borne basse 10 min : sessions courtes 6,7,8 → médiane 7 → arrondi 5 → borné 10.
  const tiny = { focusSessions: [
    { date: '2026-07-05', minutes: 6, task: 'Lecture' }, { date: '2026-07-06', minutes: 7, task: 'Lecture' },
    { date: '2026-07-07', minutes: 8, task: 'Lecture' }, { date: '2026-07-14', minutes: 6, task: 'Lecture' },
  ] };
  const ft = L.adaptiveCoachFocus(tiny, today);
  assert.equal(ft.focusBlockMin, 10, 'durées très courtes bornées à 10 min');
  // Moins de 3 sessions dans la fenêtre → signal insuffisant → focusBlockMin null, repli sur 25 min.
  const scarce = { focusSessions: [
    { date: '2026-07-05', minutes: 40, task: 'Compta' }, { date: '2026-07-14', minutes: 40, task: 'Compta' },
  ] };
  const fsc = L.adaptiveCoachFocus(scarce, today);
  assert.equal(fsc.pillar, 'focus');
  assert.equal(fsc.focusBlockMin, null, 'moins de 3 sessions : pas de médiane fiable');
  assert.match(fsc.action, /un bloc de 25 min/, 'repli sur 25 min sans « ta durée habituelle »');
  assert.ok(!/durée habituelle/.test(fsc.action), 'pas de mention « durée habituelle » sans signal');
});

test('adaptiveCoachFocus : le coach cale le bloc focus dans un créneau libre de l’agenda du jour', () => {
  const today = '2026-07-16';
  // Décrochage focus, bloc médian de 30 min. Agenda du jour : RDV 09:00-10:00 et 14:00-15:00.
  const base = {
    focusSessions: [
      { date: '2026-07-05', minutes: 30, task: 'Compta' }, { date: '2026-07-06', minutes: 30, task: 'Compta' },
      { date: '2026-07-07', minutes: 30, task: 'Compta' }, { date: '2026-07-14', minutes: 30, task: 'Compta' },
    ],
    agenda: [
      { id: 'a', date: today, time: '09:00', durationMin: 60 },
      { id: 'b', date: today, time: '14:00', durationMin: 60 },
    ],
  };
  // À 08:30, le prochain créneau libre pour 30 min est... 08:30 (avant le RDV de 9 h — le bloc rentre).
  const early = L.adaptiveCoachFocus(base, today, { nowMinutes: 8 * 60 + 30 });
  assert.equal(early.pillar, 'focus');
  assert.equal(early.focusSlot, '08:30', 'créneau libre trouvé avant le premier RDV');
  assert.match(early.action, /Créneau libre à 08:30 aujourd’hui/, 'le créneau est cité dans l’action');
  // À 09:15 (en plein RDV), nextFreeSlot pousse après le bloc de 9 h → 10:00.
  const mid = L.adaptiveCoachFocus(base, today, { nowMinutes: 9 * 60 + 15 });
  assert.equal(mid.focusSlot, '10:00', 'le créneau contourne le RDV en cours');
  // Sans nowMinutes (appel legacy 2 args) → pas de créneau, comportement inchangé.
  const noNow = L.adaptiveCoachFocus(base, today);
  assert.equal(noNow.focusSlot, null, 'sans heure du jour, pas de suggestion de créneau');
  assert.ok(!/Créneau libre/.test(noNow.action), 'action inchangée sans nowMinutes');
  // Agenda du jour VIDE (aucun RDV horaire) → pas de créneau (éviter un « maintenant » trivial).
  const empty = L.adaptiveCoachFocus({ focusSessions: base.focusSessions, agenda: [] }, today, { nowMinutes: 10 * 60 });
  assert.equal(empty.focusSlot, null, 'jour sans planning horaire : pas de créneau');
  // Trop tard pour caser le bloc avant la fin de journée (21:50 + 30 min > 22:00) → focusSlot null.
  const late = L.adaptiveCoachFocus(base, today, { nowMinutes: 21 * 60 + 50 });
  assert.equal(late.focusSlot, null, 'plus de créneau assez long avant la fin de journée');
  // Autre pilier (sport) → focusSlot toujours null, aucun parasite.
  const sport = L.adaptiveCoachFocus({
    workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-15' }],
    agenda: base.agenda,
  }, today, { nowMinutes: 8 * 60 });
  assert.equal(sport.pillar, 'sport');
  assert.equal(sport.focusSlot, null, 'le créneau ne concerne que le pilier focus');
});

test('adaptiveCoachFocus : une tête à plat coupe la poussée de bloc focus ET le créneau (pendant focus de #585)', () => {
  const today = '2026-07-19'; // dimanche, dernier jour de semaine → objectif focus serré
  // État CHARGÉ : 4 sessions « Compta » nommées (dont 1 seule cette semaine → objectif serré) + agenda
  // horaire + heure du jour → sans frein, l'action nomme la tâche phare, cale un bloc et un créneau.
  const base = {
    focusSessions: [
      { date: '2026-07-07', minutes: 30, task: 'Compta' }, { date: '2026-07-08', minutes: 30, task: 'Compta' },
      { date: '2026-07-09', minutes: 30, task: 'Compta' }, { date: '2026-07-13', minutes: 30, task: 'Compta' },
    ],
    agenda: [{ id: 'a', date: today, time: '09:00', durationMin: 60 }],
  };
  // Jour À PLAT (sleep 5 / fat 4 / sore 4 → readiness 40 < 50) : l'insight pose le frein focusGoalDrained
  // (« un focus court, soigne ta récup »). L'action ne doit PLUS pousser un bloc habituel ni un créneau.
  const drained = L.adaptiveCoachFocus({ ...base, recovery: [{ date: today, sleep: 5, fatigue: 4, soreness: 4 }] }, today, { nowMinutes: 8 * 60 + 30 });
  assert.equal(drained.pillar, 'focus');
  assert.equal(drained.focusGoalDrained, 40, 'objectif serré × readiness < 50 → frein posé');
  assert.match(drained.insight, /focus court et facile aujourd’hui/, 'le frein « focus court » reste dans l’insight');
  assert.equal(drained.focusTask, null, 'jour à plat : on ne cite plus la tâche phare (contredirait le frein)');
  assert.equal(drained.focusSlot, null, 'jour à plat : pas de créneau où « caler ton bloc »');
  assert.ok(!/Créneau libre|Reprends « Compta »|enchaîne un bloc/.test(drained.action), 'aucune poussée de bloc dans l’action');
  assert.match(drained.action, /Lance une session de focus de 25 min maintenant/, 'action ramenée au bloc COURT de base, cohérent avec « focus court »');
  // Même frein via la branche LARGE (focusMarginDrained, objectif onpace × < 50) : même coupe.
  const looseDrained = L.adaptiveCoachFocus({
    focusSessions: [
      { date: '2026-07-15', minutes: 30, task: 'Compta' }, { date: '2026-07-16', minutes: 30, task: 'Compta' },
      { date: '2026-07-17', minutes: 30, task: 'Compta' },
    ],
    agenda: base.agenda, recovery: [{ date: today, sleep: 5, fatigue: 4, soreness: 4 }],
  }, today, { nowMinutes: 8 * 60 + 30 });
  assert.ok(looseDrained.focusMarginDrained != null, 'objectif large × < 50 → frein margin');
  assert.equal(looseDrained.focusSlot, null, 'frein margin coupe aussi le créneau');
  assert.ok(!/Créneau libre/.test(looseDrained.action), 'pas de créneau non plus sur la branche large');
  // CONTRÔLE : même état, forme non basse (aucun check-in du jour) → la poussée et le créneau REVIENNENT.
  const ok = L.adaptiveCoachFocus(base, today, { nowMinutes: 8 * 60 + 30 });
  assert.equal(ok.focusGoalDrained, null, 'sans check-in du jour, pas de frein');
  assert.equal(ok.focusTask, 'Compta', 'forme correcte : la tâche phare est de nouveau citée');
  assert.equal(ok.focusSlot, '08:30', 'forme correcte : le créneau est de nouveau proposé');
  assert.match(ok.action, /Créneau libre à 08:30/, 'la coupe n’étouffe pas le conseil quand il est légitime');
});

test('adaptiveCoachFocus : la relance comeback focus se ménage quand la tête est à plat', () => {
  const today = '2026-07-19';
  // Geste isolé le 15 juin, long trou (≥ 14 j), puis reprise 18-19 juil (recentDays 2 → building).
  const st = {
    focusSessions: [
      { date: '2026-06-15', minutes: 30, task: 'Compta' },
      { date: '2026-07-18', minutes: 30, task: 'Compta' }, { date: '2026-07-19', minutes: 30, task: 'Compta' },
    ],
  };
  // Jour à plat → focusMarginDrained : la relance ne doit PLUS dire « repasse à un vrai bloc, pas 10 min ».
  const eased = L.adaptiveCoachFocus({ ...st, recovery: [{ date: today, sleep: 5, fatigue: 4, soreness: 4 }] }, today);
  assert.equal(eased.pillar, 'focus');
  assert.equal(eased.comeback, true); assert.equal(eased.comebackStage, 'building');
  assert.ok(eased.focusMarginDrained != null, 'jour à plat → frein posé');
  assert.match(eased.action, /garde un bloc court aujourd’hui, ta tête est à plat/, 'la relance se ménage');
  assert.ok(!/repasse à un vrai bloc de focus/.test(eased.action), 'plus de « repasse à un vrai bloc » un jour à plat');
  // CONTRÔLE : reprise sans frein → la relance pousse de nouveau vers un vrai bloc.
  const push = L.adaptiveCoachFocus({ focusSessions: [
    { date: '2026-06-15', minutes: 30, task: 'Compta' },
    { date: '2026-07-17', minutes: 30, task: 'Compta' }, { date: '2026-07-18', minutes: 30, task: 'Compta' },
  ] }, today);
  assert.equal(push.comeback, true);
  assert.equal(push.focusMarginDrained, null); assert.equal(push.focusGoalDrained, null);
  assert.match(push.action, /repasse à un vrai bloc de focus, pas juste 10 min/, 'sans frein, la relance pousse');
});

test('adaptiveCoachFocus : cale la séance de sport dans un créneau libre de l’agenda', () => {
  const today = '2026-07-16';
  // Décrochage sport (3 j la semaine passée, 1 récente), durées ~45 min. Agenda : RDV 09:00-10:00 et 14:00-15:00.
  const base = {
    workouts: [
      { date: '2026-07-05', duration: 45 }, { date: '2026-07-06', duration: 45 },
      { date: '2026-07-07', duration: 45 }, { date: '2026-07-14', duration: 45 },
    ],
    agenda: [
      { id: 'a', date: today, time: '09:00', durationMin: 60 },
      { id: 'b', date: today, time: '14:00', durationMin: 60 },
    ],
  };
  const early = L.adaptiveCoachFocus(base, today, { nowMinutes: 8 * 60 });
  assert.equal(early.pillar, 'sport');
  assert.equal(early.sportSlot, '08:00', 'créneau libre trouvé avant le premier RDV');
  assert.match(early.action, /Créneau libre à 08:00 aujourd’hui — cale ta séance/, 'le créneau est cité dans l’action');
  // En plein RDV (09:15) → le créneau contourne le bloc en cours → 10:00.
  const mid = L.adaptiveCoachFocus(base, today, { nowMinutes: 9 * 60 + 15 });
  assert.equal(mid.sportSlot, '10:00', 'le créneau contourne le RDV en cours');
  // Sans nowMinutes (appel legacy 2 args) → pas de créneau, action inchangée.
  const noNow = L.adaptiveCoachFocus(base, today);
  assert.equal(noNow.sportSlot, null, 'sans heure du jour, pas de suggestion de créneau');
  assert.ok(!/Créneau libre/.test(noNow.action), 'action inchangée sans nowMinutes');
  // Journée sans planning horaire → pas de créneau (éviter un « maintenant » trivial).
  const empty = L.adaptiveCoachFocus({ workouts: base.workouts, agenda: [] }, today, { nowMinutes: 8 * 60 });
  assert.equal(empty.sportSlot, null, 'jour sans planning horaire : pas de créneau');
  // Jour de récup (readiness basse) → l'action protège, pas de créneau de séance à caler.
  const rest = L.adaptiveCoachFocus({ ...base, recovery: [{ date: today, sleep: 7, fatigue: 5, soreness: 5 }] }, today, { nowMinutes: 8 * 60 });
  assert.ok(rest.readiness != null && rest.readiness < 50, 'readiness basse du jour');
  assert.equal(rest.sportSlot, null, 'un jour de récup, pas de créneau de séance');
  // Séance déjà faite aujourd’hui → crédit, pas de créneau.
  const done = L.adaptiveCoachFocus({ ...base, workouts: [...base.workouts, { date: today, duration: 45 }] }, today, { nowMinutes: 8 * 60 });
  assert.equal(done.doneToday, true, 'séance du jour détectée');
  assert.equal(done.sportSlot, null, 'séance déjà faite : pas de créneau');
  // Autre pilier (focus) → sportSlot toujours null.
  const focus = L.adaptiveCoachFocus({
    focusSessions: [{ date: '2026-07-05', minutes: 30, task: 'Compta' }, { date: '2026-07-06', minutes: 30, task: 'Compta' }, { date: '2026-07-07', minutes: 30, task: 'Compta' }, { date: '2026-07-14', minutes: 30, task: 'Compta' }],
    agenda: base.agenda,
  }, today, { nowMinutes: 8 * 60 });
  assert.equal(focus.pillar, 'focus');
  assert.equal(focus.sportSlot, null, 'le créneau séance ne concerne que le pilier sport');
});

test('adaptiveCoachFocus : nomme le GROUPE MUSCULAIRE à cibler en priorité (sportZoneFocus)', () => {
  const today = '2026-07-16';
  // Jambes travaillées il y a 10 j, tout le reste hier → jambes = groupe le plus reposé.
  const wk = [
    { date: '2026-07-06', exercises: [{ name: 'Chaise au mur', sets: 3 }] },
    { date: '2026-07-15', exercises: [{ name: 'Pompes classiques', sets: 3 }, { name: 'Gainage planche', sets: 3 }, { name: 'Superman', sets: 3 }, { name: 'Pont fessier', sets: 3 }] },
  ];
  const f = L.adaptiveCoachFocus({ workouts: wk }, today);
  assert.equal(f.pillar, 'sport');
  assert.deepEqual(f.sportZoneFocus, { zone: 'legs', days: 10, sets: 0 }, 'zone reposée = jambes, 10 j, 0 série');
  assert.match(f.action, /cible en priorité les jambes/, 'le groupe est nommé dans l’action');
  assert.match(f.action, /le plus reposé \(rien depuis 10 j, 0 série cette semaine\)/, 'repos et volume hebdo cités');
  // Zone JAMAIS ciblée (mais historique ailleurs) → libellé « inaugurer », days null.
  const wkNew = [
    { date: '2026-07-11', exercises: [{ name: 'Superman', sets: 2 }] },
    { date: '2026-07-15', exercises: [{ name: 'Pompes classiques', sets: 3 }, { name: 'Gainage planche', sets: 3 }, { name: 'Pont fessier', sets: 3 }] },
  ];
  const fNew = L.adaptiveCoachFocus({ workouts: wkNew }, today);
  assert.equal(fNew.sportZoneFocus.zone, 'legs');
  assert.equal(fNew.sportZoneFocus.days, null, 'jamais ciblée → days null');
  assert.match(fNew.action, /jamais ciblé ici — le bon jour pour l’inaugurer/, 'libellé zone inédite');
  // Aucun exercice NOMMÉ jamais loggé → pas de données de zone → muet (on ne devine pas).
  const fBlind = L.adaptiveCoachFocus({ workouts: [{ date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-15' }] }, today);
  assert.equal(fBlind.pillar, 'sport');
  assert.equal(fBlind.sportZoneFocus, null, 'sans exercice nommé, aucune zone devinée');
  assert.ok(!/cible en priorité/.test(fBlind.action), 'action générique inchangée');
  // Séance déjà faite aujourd’hui → pas de zone à charger (on crédite, on ne pousse pas).
  const fDone = L.adaptiveCoachFocus({ workouts: [...wk, { date: today, exercises: [{ name: 'Chaise au mur', sets: 3 }] }] }, today);
  assert.equal(fDone.doneToday, true);
  assert.equal(fDone.sportZoneFocus, null, 'séance faite → pas de recommandation de groupe');
  // Readiness au rouge (récup prioritaire) sur un décrochage sport → pas de groupe à charger, cohérent avec « vas-y mollo ».
  const pRed = d => ({ date: d, exercises: [{ name: 'Pompes classiques', sets: 3 }] });
  const fRed = L.adaptiveCoachFocus({ workouts: [pRed('2026-07-05'), pRed('2026-07-06'), pRed('2026-07-07'), pRed('2026-07-14')], recovery: [{ date: today, sleep: 7, fatigue: 5, soreness: 5 }] }, today);
  assert.equal(fRed.pillar, 'sport');
  assert.ok(fRed.readiness != null && fRed.readiness < 50, 'readiness basse');
  assert.equal(fRed.sportZoneFocus, null, 'jour récup → pas de groupe à charger');
  // Autre pilier (focus) → sportZoneFocus toujours null.
  const fFoc = L.adaptiveCoachFocus({ focusSessions: [{ date: '2026-07-05', minutes: 30 }, { date: '2026-07-06', minutes: 30 }, { date: '2026-07-07', minutes: 30 }, { date: '2026-07-14', minutes: 30 }] }, today);
  assert.equal(fFoc.pillar, 'focus');
  assert.equal(fFoc.sportZoneFocus, null, 'zone musculaire = pilier sport uniquement');
});

test('adaptiveCoachFocus : une forme qui GLISSE coupe créneau ET groupe (readinessSlide vs sportSlot/sportZoneFocus)', () => {
  const today = '2026-07-16';
  // Décrochage sport avec exercices NOMMÉS (jambes il y a 10 j → groupe le plus reposé) + durées, ET un
  // agenda horaire du jour → sportSlot et sportZoneFocus s'appliqueraient tous deux… sauf que la readiness
  // GLISSE (55/100, -45 pts sur 5 check-ins → readinessSlide), donc l'action a basculé en « séance allégée,
  // soigne ta récup ». « Cale ta séance là » et « cible en priorité les jambes pour équilibrer ta semaine »
  // la contrediraient de front — même famille de contradiction que loadSpike (« allège »), qui les coupe déjà.
  // Workouts espacés (dernier il y a 5 j) pour que le SPORT reste le pilier en retard, avec exercices
  // NOMMÉS couvrant plusieurs zones (jambes = la plus reposée) → historique de zone exploitable.
  const base = {
    workouts: [
      { date: '2026-07-03', duration: 45, exercises: [{ name: 'Chaise au mur', sets: 3 }] },
      { date: '2026-07-05', duration: 45, exercises: [{ name: 'Pompes classiques', sets: 3 }] },
      { date: '2026-07-07', duration: 45, exercises: [{ name: 'Gainage planche', sets: 3 }] },
      { date: '2026-07-11', duration: 45, exercises: [{ name: 'Tractions', sets: 3 }] },
    ],
    recovery: [
      { date: '2026-07-04', sleep: 8, fatigue: 1, soreness: 1 }, // 100
      { date: '2026-07-06', sleep: 8, fatigue: 2, soreness: 2 }, // 85
      { date: '2026-07-10', sleep: 8, fatigue: 3, soreness: 3 }, // 70
      { date: '2026-07-13', sleep: 8, fatigue: 3, soreness: 4 }, // 63
      { date: '2026-07-16', sleep: 8, fatigue: 4, soreness: 4 }, // 55
    ],
    agenda: [{ id: 'a', date: today, time: '14:00', durationMin: 60 }],
  };
  const slide = L.adaptiveCoachFocus(base, today, { nowMinutes: 8 * 60 });
  assert.equal(slide.pillar, 'sport');
  assert.equal(slide.readinessSlide, -45, 'forme qui glisse détectée');
  assert.equal(slide.loadSpike, null, 'pas de pic de charge (aucun effort loggé)');
  assert.match(slide.action, /Séance allégée aujourd’hui/, 'l’action a basculé en frein');
  assert.equal(slide.sportSlot, null, 'forme qui glisse → pas de créneau à caler');
  assert.equal(slide.sportZoneFocus, null, 'forme qui glisse → pas de groupe à charger');
  assert.ok(!/Créneau libre/.test(slide.action), 'aucune note « cale ta séance là » appendue');
  assert.ok(!/cible en priorité/.test(slide.action), 'aucune note « cible ce groupe » appendue');

  // Contrôle : forme STABLE (readiness 63, non glissante) avec sommeil sain → même état, mais le coach
  // RETROUVE créneau + groupe. La coupe ne mord QUE sur la contradiction (la glissade), elle n’étouffe
  // pas le conseil quand il est cohérent.
  const stableRec = ['2026-07-04', '2026-07-06', '2026-07-10', '2026-07-13', '2026-07-16']
    .map(date => ({ date, sleep: 8, fatigue: 3, soreness: 4 })); // 63 chacun → pas de glissade
  const okDay = L.adaptiveCoachFocus({ ...base, recovery: stableRec }, today, { nowMinutes: 8 * 60 });
  assert.equal(okDay.pillar, 'sport');
  assert.equal(okDay.readinessSlide, null, 'forme stable → pas de glissade');
  assert.equal(okDay.sportSlot, '08:00', 'créneau rétabli quand la forme ne glisse pas');
  assert.ok(okDay.sportZoneFocus && okDay.sportZoneFocus.zone, 'groupe rétabli quand la forme ne glisse pas');
  assert.match(okDay.action, /cible en priorité/, 'la note groupe réapparaît sur un jour cohérent');
});

test('adaptiveCoachFocus : signale un PLATEAU de force sur un exercice chargé (sportPlateau)', () => {
  const today = '2026-07-16';
  const wo = (date, load, reps) => ({ date, exercises: [{ name: 'Squat', setLogs: [{ completed: true, load, reps }] }] });
  // Squat chargé, régulier et récent, dont le 1RM estimé ne progresse plus → plateau nommé.
  const wk = [wo('2026-07-01', 100, 5), wo('2026-07-04', 98, 5), wo('2026-07-08', 99, 5), wo('2026-07-11', 100, 5), wo('2026-07-14', 98, 5)];
  const f = L.adaptiveCoachFocus({ workouts: wk }, today);
  assert.equal(f.pillar, 'sport');
  assert.ok(f.tone !== 'rebuild' && f.tone !== 'revive', 'pilier sport en bonne santé');
  assert.ok(f.sportPlateau && f.sportPlateau.exercise === 'Squat' && f.sportPlateau.best > 0, 'plateau détecté sur le Squat');
  assert.match(f.insight, /ton Squat marque le pas/, 'le lift qui stagne est nommé dans l’insight');
  assert.match(f.insight, /1RM estim[ée] stagne autour de [\d,]+ kg depuis 3 séances/, 'stagnation chiffrée');
  assert.match(f.insight, /ajoute une répétition à charge égale|d[ée]charge une semaine/, 'geste de surcharge progressive concret');
  // Exercice en PROGRESSION → pas de plateau, muet.
  const up = [wo('2026-07-01', 90, 5), wo('2026-07-04', 95, 5), wo('2026-07-08', 100, 5), wo('2026-07-11', 105, 5), wo('2026-07-14', 110, 5)];
  const fUp = L.adaptiveCoachFocus({ workouts: up }, today);
  assert.equal(fUp.sportPlateau, null, 'force qui progresse → aucun plateau');
  assert.ok(!/marque le pas/.test(fUp.insight), 'aucune note plateau quand ça progresse');
  // Sport DORMANT (dernier entraînement il y a 20 j) → tone revive : plateau ancien tu, on ne parle pas de casser un plateau quand la porte est fermée.
  const old = [wo('2026-06-20', 100, 5), wo('2026-06-22', 98, 5), wo('2026-06-24', 99, 5), wo('2026-06-26', 100, 5)];
  const fOld = L.adaptiveCoachFocus({ workouts: old }, today);
  assert.equal(fOld.pillar, 'sport');
  assert.ok(fOld.tone === 'revive' || fOld.tone === 'rebuild', 'sport décroché');
  assert.equal(fOld.sportPlateau, null, 'sport décroché → pas de note plateau (historique trop vieux)');
  // Séance déjà faite aujourd’hui → on crédite, pas de plateau à casser.
  const fDone = L.adaptiveCoachFocus({ workouts: [...wk, wo(today, 98, 5)] }, today);
  assert.equal(fDone.doneToday, true);
  assert.equal(fDone.sportPlateau, null, 'séance faite → pas de note plateau');
  // Exercices au poids du corps seulement (aucune charge) → rien à mesurer → muet.
  const bw = ['2026-07-01', '2026-07-04', '2026-07-08', '2026-07-11', '2026-07-14'].map(d => ({ date: d, exercises: [{ name: 'Pompes', setLogs: [{ completed: true, load: 0, reps: 20 }] }] }));
  assert.equal(L.adaptiveCoachFocus({ workouts: bw }, today).sportPlateau, null, 'poids du corps → pas de plateau de charge');
  // Autre pilier (focus) → sportPlateau toujours null.
  const fFoc = L.adaptiveCoachFocus({ focusSessions: [{ date: '2026-07-14', minutes: 30 }] }, today);
  assert.equal(fFoc.pillar, 'focus');
  assert.equal(fFoc.sportPlateau, null, 'plateau de force = pilier sport uniquement');
});

test('adaptiveCoachFocus : projette le prochain palier quand la force MONTE (sportProgress)', () => {
  const today = '2026-07-16';
  const wo = (date, load, reps) => ({ date, exercises: [{ name: 'Squat', setLogs: [{ completed: true, load, reps }] }] });
  // Squat chargé, régulier et récent, dont le 1RM estimé grimpe franchement → progression projetée.
  const up = [wo('2026-07-01', 90, 5), wo('2026-07-04', 95, 5), wo('2026-07-08', 100, 5), wo('2026-07-11', 105, 5), wo('2026-07-14', 110, 5)];
  const f = L.adaptiveCoachFocus({ workouts: up }, today);
  assert.equal(f.pillar, 'sport');
  assert.ok(f.tone !== 'rebuild' && f.tone !== 'revive', 'pilier sport en bonne santé');
  assert.equal(f.sportPlateau, null, 'force qui monte → aucun plateau');
  assert.ok(f.sportProgress && f.sportProgress.exercise === 'Squat', 'lift qui progresse nommé');
  assert.equal(f.sportProgress.current, 128.5, '1RM estimé courant');
  assert.equal(f.sportProgress.milestone, 130, 'prochain palier rond');
  assert.equal(f.sportProgress.weeks, 1, 'ETA en semaines');
  assert.match(f.insight, /ton Squat gagne du terrain/, 'le lift qui grimpe est nommé dans l’insight');
  assert.match(f.insight, /tu passes la barre des 130 kg dans ~1 semaine/, 'palier projeté avec ETA');
  // EXCLUSION MUTUELLE : sur un plateau, la note de progression se tait (jamais « stagne » et « grimpe » ensemble).
  const flat = [wo('2026-07-01', 100, 5), wo('2026-07-04', 98, 5), wo('2026-07-08', 99, 5), wo('2026-07-11', 100, 5), wo('2026-07-14', 98, 5)];
  const fFlat = L.adaptiveCoachFocus({ workouts: flat }, today);
  assert.ok(fFlat.sportPlateau, 'plateau détecté');
  assert.equal(fFlat.sportProgress, null, 'plateau prioritaire → pas de note de progression');
  assert.ok(!/gagne du terrain/.test(fFlat.insight), 'aucune note de progression quand ça stagne');
  // Sport DORMANT (dernière séance il y a 20 j) → tone revive : on ne projette pas un palier quand la porte est fermée.
  const old = [wo('2026-06-16', 90, 5), wo('2026-06-20', 95, 5), wo('2026-06-24', 100, 5), wo('2026-06-26', 105, 5)];
  const fOld = L.adaptiveCoachFocus({ workouts: old }, today);
  assert.ok(fOld.tone === 'revive' || fOld.tone === 'rebuild', 'sport décroché');
  assert.equal(fOld.sportProgress, null, 'sport décroché → pas de projection (historique trop vieux)');
  // Séance déjà faite aujourd’hui → on crédite, pas de projection.
  const fDone = L.adaptiveCoachFocus({ workouts: [...up, wo(today, 110, 5)] }, today);
  assert.equal(fDone.doneToday, true);
  assert.equal(fDone.sportProgress, null, 'séance faite → pas de note de progression');
  // Poids du corps seulement (aucune charge) → rien à projeter → muet.
  const bw = ['2026-07-01', '2026-07-04', '2026-07-08', '2026-07-11', '2026-07-14'].map(d => ({ date: d, exercises: [{ name: 'Pompes', setLogs: [{ completed: true, load: 0, reps: 20 }] }] }));
  assert.equal(L.adaptiveCoachFocus({ workouts: bw }, today).sportProgress, null, 'poids du corps → pas de projection de charge');
  // Autre pilier (focus) → sportProgress toujours null.
  assert.equal(L.adaptiveCoachFocus({ focusSessions: [{ date: '2026-07-14', minutes: 30 }] }, today).sportProgress, null, 'projection de force = pilier sport uniquement');
});

test('adaptiveCoachFocus : fête un RECORD personnel battu aujourd’hui (sportRecordToday)', () => {
  const today = '2026-07-16';
  const wo = (date, load, reps) => ({ date, exercises: [{ name: 'Squat', setLogs: [{ completed: true, load, reps }] }] });
  // Squat pratiqué depuis des jours (meilleur passé = 104×5 → 1RM 121,5) puis, AUJOURD'HUI, 110×5
  // (1RM estimé 128,5) → un vrai PR battu ce jour sur un exercice déjà au palmarès.
  const wk = [wo('2026-07-08', 100, 5), wo('2026-07-11', 102, 5), wo('2026-07-14', 104, 5), wo(today, 110, 5)];
  const f = L.adaptiveCoachFocus({ workouts: wk }, today);
  assert.equal(f.pillar, 'sport');
  assert.equal(f.doneToday, true, 'séance du jour posée');
  assert.ok(f.sportRecordToday && f.sportRecordToday.exercise === 'Squat', 'record du jour détecté sur le Squat');
  assert.equal(f.sportRecordToday.e1rm, 128.5, '1RM estimé du record');
  assert.equal(f.sportRecordToday.load, 110, 'charge du record');
  assert.equal(f.sportRecordToday.reps, 5, 'répétitions du record');
  assert.match(f.insight, /tu viens de battre ton record sur le Squat/, 'le record est nommé dans l’insight');
  assert.match(f.insight, /1RM estimé à 128,5 kg/, 'le 1RM du record est chiffré');
  assert.match(f.insight, /ta meilleure perf à ce jour/, 'la victoire est explicitée');
  // Séance du jour SANS record (effort en deçà du meilleur passé) → aucune note.
  const fNo = L.adaptiveCoachFocus({ workouts: [wo('2026-07-08', 100, 5), wo('2026-07-11', 102, 5), wo('2026-07-14', 110, 5), wo(today, 100, 5)] }, today);
  assert.equal(fNo.doneToday, true);
  assert.equal(fNo.sportRecordToday, null, 'pas de PB battu aujourd’hui → muet');
  assert.ok(!/battre ton record/.test(fNo.insight), 'aucune note record sans PB du jour');
  // « Record » TRIVIAL de première fois : exercice jamais pratiqué avant aujourd'hui → ignoré (honnêteté).
  const fFirst = L.adaptiveCoachFocus({ workouts: [wo('2026-07-08', 100, 5), wo('2026-07-11', 102, 5), wo('2026-07-14', 104, 5), { date: today, exercises: [{ name: 'Soulevé de terre', setLogs: [{ completed: true, load: 140, reps: 3 }] }] }] }, today);
  assert.equal(fFirst.doneToday, true);
  assert.equal(fFirst.sportRecordToday, null, 'premier passage sur un exercice → pas un record à fêter');
  // Séance PAS faite aujourd'hui → jamais de record du jour.
  const fPast = L.adaptiveCoachFocus({ workouts: [wo('2026-07-08', 100, 5), wo('2026-07-11', 102, 5), wo('2026-07-14', 110, 5)] }, today);
  assert.equal(fPast.doneToday, false);
  assert.equal(fPast.sportRecordToday, null, 'pas de séance du jour → pas de record du jour');
  // Poids du corps uniquement (aucune charge → 1RM non estimable) → muet même sur un « mieux ».
  const bw = ['2026-07-08', '2026-07-11', '2026-07-14', today].map((d, i) => ({ date: d, exercises: [{ name: 'Pompes', setLogs: [{ completed: true, load: 0, reps: 20 + i * 4 }] }] }));
  assert.equal(L.adaptiveCoachFocus({ workouts: bw }, today).sportRecordToday, null, 'poids du corps → pas de record de charge');
  // Autre pilier (focus) → sportRecordToday toujours null.
  assert.equal(L.adaptiveCoachFocus({ focusSessions: [{ date: today, minutes: 30 }] }, today).sportRecordToday, null, 'record de force = pilier sport uniquement');
});

test('adaptiveCoachFocus : fête un RECORD DE RÉPÉTITIONS au poids du corps (sportRepRecordToday)', () => {
  const today = '2026-07-16';
  const bw = (date, reps) => ({ date, exercises: [{ name: 'Tractions', setLogs: [{ completed: true, load: 0, reps }] }] });
  // Tractions au poids du corps depuis des jours (meilleur passé = 10 reps) puis, AUJOURD'HUI, 13 reps
  // → un vrai PR de reps battu ce jour sur un exercice déjà documenté, mais AUCUNE charge (sportRecordToday
  // resterait muet, cf. son test « poids du corps → pas de record de charge »).
  const wk = [bw('2026-07-08', 8), bw('2026-07-11', 9), bw('2026-07-14', 10), bw(today, 13)];
  const f = L.adaptiveCoachFocus({ workouts: wk }, today);
  assert.equal(f.pillar, 'sport');
  assert.equal(f.doneToday, true, 'séance du jour posée');
  assert.equal(f.sportRecordToday, null, 'aucune charge → sportRecordToday reste muet');
  assert.ok(f.sportRepRecordToday && f.sportRepRecordToday.exercise === 'Tractions', 'record de reps détecté sur les Tractions');
  assert.equal(f.sportRepRecordToday.reps, 13, 'reps du record du jour');
  assert.equal(f.sportRepRecordToday.prev, 10, 'meilleur passé rappelé');
  assert.match(f.insight, /tu viens de battre ton record de répétitions sur le Tractions/, 'le record de reps est nommé');
  assert.match(f.insight, /13 reps au poids du corps \(ton meilleur passé : 10\)/, 'reps du jour et passé chiffrés');
  // Séance du jour SANS PR de reps (égaler le meilleur passé ne compte pas) → muet.
  const fTie = L.adaptiveCoachFocus({ workouts: [bw('2026-07-08', 8), bw('2026-07-11', 9), bw('2026-07-14', 12), bw(today, 12)] }, today);
  assert.equal(fTie.doneToday, true);
  assert.equal(fTie.sportRepRecordToday, null, 'égaler le meilleur passé → pas un record');
  assert.ok(!/record de répétitions/.test(fTie.insight), 'aucune note de reps sans PR strict');
  // « Record » TRIVIAL de première fois : exercice au poids du corps jamais pratiqué avant → ignoré.
  const fFirst = L.adaptiveCoachFocus({ workouts: [bw('2026-07-08', 8), bw('2026-07-11', 9), bw('2026-07-14', 10), { date: today, exercises: [{ name: 'Dips', setLogs: [{ completed: true, load: 0, reps: 15 }] }] }] }, today);
  assert.equal(fFirst.doneToday, true);
  assert.equal(fFirst.sportRepRecordToday, null, 'premier passage sur un exercice → pas un record à fêter');
  // Exercice AVEC charge (domaine de sportRecordToday) → jamais un record de REPS, même si les reps montent.
  const loaded = (date, load, reps) => ({ date, exercises: [{ name: 'Développé', setLogs: [{ completed: true, load, reps }] }] });
  const fLoaded = L.adaptiveCoachFocus({ workouts: [loaded('2026-07-08', 60, 5), loaded('2026-07-11', 60, 6), loaded('2026-07-14', 60, 8), loaded(today, 60, 10)] }, today);
  assert.equal(fLoaded.sportRepRecordToday, null, 'exercice chargé → hors du domaine des records de reps au poids du corps');
  // EXCLUSION MUTUELLE : un record de CHARGE le même jour prime → pas de note de reps en plus.
  const fBoth = L.adaptiveCoachFocus({ workouts: [
    { date: '2026-07-08', exercises: [{ name: 'Squat', setLogs: [{ completed: true, load: 100, reps: 5 }] }, { name: 'Tractions', setLogs: [{ completed: true, load: 0, reps: 10 }] }] },
    { date: '2026-07-14', exercises: [{ name: 'Squat', setLogs: [{ completed: true, load: 104, reps: 5 }] }, { name: 'Tractions', setLogs: [{ completed: true, load: 0, reps: 10 }] }] },
    { date: today, exercises: [{ name: 'Squat', setLogs: [{ completed: true, load: 110, reps: 5 }] }, { name: 'Tractions', setLogs: [{ completed: true, load: 0, reps: 13 }] }] },
  ] }, today);
  assert.ok(fBoth.sportRecordToday && fBoth.sportRecordToday.exercise === 'Squat', 'le record de charge est détecté');
  assert.equal(fBoth.sportRepRecordToday, null, 'record de charge prioritaire → pas de note de reps en plus');
  // Séance PAS faite aujourd'hui → jamais de record du jour.
  const fPast = L.adaptiveCoachFocus({ workouts: [bw('2026-07-08', 8), bw('2026-07-11', 9), bw('2026-07-14', 10)] }, today);
  assert.equal(fPast.doneToday, false);
  assert.equal(fPast.sportRepRecordToday, null, 'pas de séance du jour → pas de record du jour');
  // Autre pilier (focus) → sportRepRecordToday toujours null.
  assert.equal(L.adaptiveCoachFocus({ focusSessions: [{ date: today, minutes: 30 }] }, today).sportRepRecordToday, null, 'record de reps = pilier sport uniquement');
});

test('adaptiveCoachFocus : crédite le geste déjà fait aujourd’hui (sport/focus), pas sommeil/nutrition', () => {
  const today = '2026-07-16';
  // SPORT en décrochage (4 j la semaine passée, 1 récente = aujourd'hui) → rebuild, mais la séance
  // du jour est DÉJÀ loggée → le coach crédite au lieu d'ordonner « programme une séance ».
  const sportDone = { workouts: [
    { date: '2026-07-03' }, { date: '2026-07-04' }, { date: '2026-07-05' }, { date: '2026-07-06' },
    { date: '2026-07-16' },
  ] };
  const sd = L.adaptiveCoachFocus(sportDone, today);
  assert.equal(sd.pillar, 'sport'); assert.equal(sd.tone, 'rebuild');
  assert.equal(sd.doneToday, true, 'séance datée du jour → doneToday');
  assert.match(sd.action, /Séance déjà faite aujourd’hui/, 'crédit au lieu d’un ordre déjà exécuté');
  assert.match(sd.insight, /essouffle|semaine/, 'la tendance hebdo (vraie) reste dans l’insight');
  // FOCUS en hausse avec un bloc AUJOURD'HUI → reinforce, tâche phare exposée, mais action = crédit du jour.
  const focusDone = { focusSessions: [
    { date: '2026-07-05', minutes: 30, task: 'Thèse' }, { date: '2026-07-14', minutes: 30, task: 'Thèse' },
    { date: '2026-07-15', minutes: 30, task: 'Thèse' }, { date: '2026-07-16', minutes: 30, task: 'Thèse' },
  ] };
  const fdn = L.adaptiveCoachFocus(focusDone, today);
  assert.equal(fdn.pillar, 'focus'); assert.equal(fdn.doneToday, true);
  assert.equal(fdn.focusTask, 'Thèse', 'la tâche phare reste exposée');
  assert.match(fdn.action, /Bloc de focus déjà posé aujourd’hui/, 'crédit du bloc du jour');
  // doneToday coupe la micro-marche : inutile de gronder un cap ignoré le jour où le geste est là.
  const sportDoneIgnored = { ...sportDone, coachLog: [{ date: '2026-07-13', pillar: 'sport' }, { date: '2026-07-14', pillar: 'sport' }] };
  const sdi = L.adaptiveCoachFocus(sportDoneIgnored, today);
  assert.equal(sdi.doneToday, true);
  assert.equal(sdi.microStep, false, 'pas de micro-marche un jour où le geste est fait');
  assert.match(sdi.action, /déjà faite/, 'le crédit prime sur la micro-marche');
  // Sans entrée du jour, pas de crédit : l'action garde son conseil normal (readiness générique ici).
  const sportNot = { workouts: [{ date: '2026-07-03' }, { date: '2026-07-04' }, { date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-11' }] };
  const sn = L.adaptiveCoachFocus(sportNot, today);
  assert.equal(sn.pillar, 'sport'); assert.equal(sn.doneToday, false);
  assert.doesNotMatch(sn.action, /déjà faite/, 'pas de séance du jour → pas de crédit');
  // SOMMEIL EXCLU : une nuit notée = celle d'HIER ; l'action porte sur le coucher de CE SOIR, à venir.
  const sleepToday = { recovery: [
    { date: '2026-07-03', sleep: 7 }, { date: '2026-07-04', sleep: 7 }, { date: '2026-07-05', sleep: 7 },
    { date: '2026-07-06', sleep: 7 }, { date: '2026-07-16', sleep: 7 },
  ] };
  const sl = L.adaptiveCoachFocus(sleepToday, today);
  assert.equal(sl.pillar, 'sommeil');
  assert.equal(sl.doneToday, false, 'le sommeil n’est jamais « déjà bouclé » : le coucher du soir reste à faire');
  assert.doesNotMatch(sl.action, /déjà faite|déjà posé/, 'l’action sommeil (coucher du soir) est préservée');
  // NUTRITION EXCLUE : « actif » y est trop lâche (protéines > 0 ≠ cible atteinte) → jamais de crédit.
  const nutriToday = { profile: { weight: 80, goal: 'force' }, nutrition: [
    { date: '2026-07-03', protein: 60 }, { date: '2026-07-04', protein: 60 }, { date: '2026-07-05', protein: 60 },
    { date: '2026-07-06', protein: 60 }, { date: '2026-07-16', protein: 40 },
  ] };
  const nt = L.adaptiveCoachFocus(nutriToday, today);
  assert.equal(nt.pillar, 'nutrition');
  assert.equal(nt.doneToday, false, 'la nutrition garde son action calée sur la cible protéines');
});

test('adaptiveCoachFocus : coach méta-conscient — abaisse la barre quand son conseil est ignoré', () => {
  const today = '2026-07-16';
  // Sport en décrochage (3 j la semaine passée, 1 récente) → tone rebuild, un seul pilier à corriger.
  const base = { workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-15' }] };
  const f0 = L.adaptiveCoachFocus(base, today);
  assert.equal(f0.pillar, 'sport'); assert.equal(f0.tone, 'rebuild');
  assert.equal(f0.microStep, false, 'sans journal : pas de micro-marche, action normale');
  assert.match(f0.action, /séance courte/, 'action standard tant que le conseil n’a pas été ignoré');
  // Le coach a poussé « sport » les 13 et 14 SANS séance ces jours-là (ignoré 2×) → micro-marche.
  const ignored = { ...base, coachLog: [{ date: '2026-07-13', pillar: 'sport' }, { date: '2026-07-14', pillar: 'sport' }] };
  const fi = L.adaptiveCoachFocus(ignored, today);
  assert.equal(fi.pillar, 'sport');
  assert.equal(fi.microStep, true, 'conseil ignoré 2 jours → le coach abaisse la barre');
  assert.match(fi.action, /5 min/, 'action = micro-marche concrète');
  assert.match(fi.insight, /abaisse la barre, pas toi/, 'reconnaissance honnête dans l’insight');
  // Un seul jour ignoré → pas encore de bascule (seuil = 2).
  const once = { ...base, coachLog: [{ date: '2026-07-14', pillar: 'sport' }] };
  assert.equal(L.adaptiveCoachFocus(once, today).microStep, false, 'un seul jour ignoré ne suffit pas');
  // Conseil SUIVI (séance le 15) → ne compte pas comme ignoré, même avec 2 jours journalisés.
  const followed = { workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-14' }, { date: '2026-07-15' }], coachLog: [{ date: '2026-07-14', pillar: 'sport' }, { date: '2026-07-15', pillar: 'sport' }] };
  assert.equal(L.adaptiveCoachFocus(followed, today).microStep, false, 'un conseil suivi ne déclenche pas la micro-marche');
  // L'alternance (priorité absolue) ne passe jamais par la micro-marche.
  const alt = L.adaptiveCoachFocus({ applications: [{ id: 1, company: 'A', status: 'postule', date: '2026-07-10' }], coachLog: [{ date: '2026-07-14', pillar: 'alternance' }, { date: '2026-07-15', pillar: 'alternance' }] }, today);
  assert.equal(alt.pillar, 'alternance'); assert.equal(alt.microStep, undefined, 'le focus alternance n’a pas de champ microStep');
});

test('adaptiveCoachFocus : coach méta-conscient positif — crédite un suivi élevé (reinforce)', () => {
  const today = '2026-07-16';
  // Sport en hausse franche (4 j récents vs 1 avant) → tone reinforce, aucun pilier à corriger.
  // (Dernier jour actif = hier, pas aujourd'hui, pour isoler le crédit de suivi du crédit « déjà fait aujourd'hui ».)
  const rising = [{ date: '2026-07-05' }, { date: '2026-07-11' }, { date: '2026-07-12' }, { date: '2026-07-14' }, { date: '2026-07-15' }];
  const plain = L.adaptiveCoachFocus({ workouts: rising }, today);
  assert.equal(plain.pillar, 'sport'); assert.equal(plain.tone, 'reinforce');
  assert.equal(plain.followThrough, null, 'sans journal : pas de crédit de suivi');
  assert.doesNotMatch(plain.insight, /tu qui le construis/);
  // Le coach a poussé « sport » les 11, 12 et 14 et Adrien a suivi (séance ces jours-là) → suivi 100 %.
  const boost = L.adaptiveCoachFocus({
    workouts: rising,
    coachLog: [{ date: '2026-07-11', pillar: 'sport' }, { date: '2026-07-12', pillar: 'sport' }, { date: '2026-07-14', pillar: 'sport' }],
  }, today);
  assert.equal(boost.pillar, 'sport'); assert.equal(boost.tone, 'reinforce');
  assert.equal(boost.followThrough, 100, 'suivi élevé sur ≥ 3 jours → crédité');
  assert.match(boost.insight, /3\/3 de mes caps/, 'l’insight nomme le suivi réel');
  assert.match(boost.insight, /c’est toi qui le construis/, 'le mérite revient à Adrien');
  assert.match(boost.action, /r[ée]gularit[ée] te ressemble/, 'l’action renforce l’agentivité');
  // Seuil : 2 jours journalisés seulement → pas assez de signal, pas de crédit.
  const few = L.adaptiveCoachFocus({
    workouts: rising,
    coachLog: [{ date: '2026-07-12', pillar: 'sport' }, { date: '2026-07-14', pillar: 'sport' }],
  }, today);
  assert.equal(few.followThrough, null, 'moins de 3 jours journalisés → pas de crédit');
  // Suivi FAIBLE (conseils poussés mais non suivis) → pas de crédit malgré 3 jours.
  const low = L.adaptiveCoachFocus({
    workouts: rising,
    coachLog: [{ date: '2026-07-08', pillar: 'sport' }, { date: '2026-07-09', pillar: 'sport' }, { date: '2026-07-10', pillar: 'sport' }],
  }, today);
  assert.equal(low.followThrough, null, 'suivi < 70 % → pas de crédit (pas de flatterie)');
});

test('coachFollowThrough : mesure si les conseils du coach sont suivis', () => {
  const today = '2026-07-16';
  const st = {
    coachLog: [
      { date: '2026-07-13', pillar: 'sommeil' },   // suivi (nuit notée le 13)
      { date: '2026-07-14', pillar: 'sport' },     // PAS suivi (séance le 15, pas le 14)
      { date: '2026-07-15', pillar: 'focus' },     // suivi (session le 15)
      { date: today, pillar: 'sport' },            // aujourd'hui : jour non fini → exclu
    ],
    recovery: [{ date: '2026-07-13', sleep: 7 }],
    workouts: [{ date: '2026-07-15' }],
    focusSessions: [{ date: '2026-07-15', minutes: 25 }],
  };
  const r = L.coachFollowThrough(st, today);
  assert.equal(r.total, 3, 'le jour en cours ne compte pas');
  assert.equal(r.followed, 2);
  assert.equal(r.rate, 67);
  // hors fenêtre 7 jours → aucun jour évaluable → null
  assert.equal(L.coachFollowThrough({ coachLog: [{ date: '2026-07-06', pillar: 'sport' }], workouts: [{ date: '2026-07-06' }] }, today), null);
  // aucun journal → null ; état vide → null
  assert.equal(L.coachFollowThrough({}, today), null);
  // conseil alternance suivi = candidature datée du même jour
  const alt = L.coachFollowThrough({ coachLog: [{ date: '2026-07-15', pillar: 'alternance' }], applications: [{ id: 1, company: 'A', status: 'postule', date: '2026-07-15' }] }, today);
  assert.equal(alt.followed, 1); assert.equal(alt.total, 1);
});

test('focusByTask : répartition du temps de focus par tâche sur la fenêtre', () => {
  const sessions = [
    { date: '2026-07-15', minutes: 50, task: 'Réviser compta' },
    { date: '2026-07-14', minutes: 25, task: 'Réviser compta' },
    { date: '2026-07-13', minutes: 40, task: 'Projet perso' },
    { date: '2026-07-12', minutes: 30, task: 'Réviser compta' },
    { date: '2026-07-01', minutes: 90, task: 'Vieux (hors fenêtre)' }, // > 7 j → exclu
    { date: '2026-07-14', minutes: 0,  task: 'Zéro minute' },          // 0 min → ignoré
    { date: '2026-07-14', minutes: 20, task: '' },                     // titre vide → 'Sans titre'
  ];
  const r = L.focusByTask(sessions, '2026-07-15', { days: 7 });
  assert.equal(r.total, 50 + 25 + 40 + 30 + 20); // 165, hors vieux et zéro
  // trié par minutes : compta (105) > projet (40) > sans titre (20)
  assert.deepEqual(r.tasks.map(t => t.task), ['Réviser compta', 'Projet perso', 'Sans titre']);
  assert.equal(r.tasks[0].minutes, 105);
  assert.equal(r.tasks[0].sessions, 3);
  assert.equal(r.tasks[0].pct, Math.round(105 / 165 * 100)); // 64
  // cap
  assert.equal(L.focusByTask(sessions, '2026-07-15', { days: 7, cap: 1 }).tasks.length, 1);
  // date invalide / vide
  assert.deepEqual(L.focusByTask(sessions, 'nope'), { total: 0, tasks: [] });
  assert.deepEqual(L.focusByTask([], '2026-07-15'), { total: 0, tasks: [] });
});

test('proteinStreak : jours consécutifs à la cible protéines', () => {
  const T = 120;
  // série en cours finissant aujourd'hui (15) : 13,14,15 atteints ; 12 raté
  const nut = [
    { date: '2026-07-11', protein: 130 },
    { date: '2026-07-12', protein: 80 },   // raté → coupe
    { date: '2026-07-13', protein: 120 },
    { date: '2026-07-14', protein: 140 },
    { date: '2026-07-15', protein: 125 },
  ];
  const r = L.proteinStreak(nut, T, '2026-07-15');
  assert.equal(r.current, 3, '13-14-15 consécutifs');
  assert.equal(r.best, 3);
  // aujourd'hui pas encore atteint → ne coupe pas, compte depuis hier
  const r2 = L.proteinStreak([{ date: '2026-07-13', protein: 130 }, { date: '2026-07-14', protein: 130 }, { date: '2026-07-15', protein: 50 }], T, '2026-07-15');
  assert.equal(r2.current, 2, 'aujourd’hui raté n’entame pas : 13-14 comptent');
  // record > courant : longue série passée puis coupée, petite série actuelle
  const r3 = L.proteinStreak([
    { date: '2026-07-01', protein: 130 }, { date: '2026-07-02', protein: 130 }, { date: '2026-07-03', protein: 130 }, { date: '2026-07-04', protein: 130 },
    { date: '2026-07-14', protein: 130 }, { date: '2026-07-15', protein: 130 },
  ], T, '2026-07-15');
  assert.equal(r3.current, 2);
  assert.equal(r3.best, 4);
  // date IMPOSSIBLE (2026-04-31 → déborde au 1er mai) : le RECORD ne gonfle plus par une paire fantôme
  // avec le 2 mai. current (marche depuis today) était déjà sûr et reste inchangé.
  const rPhantom = L.proteinStreak([{ date: '2026-04-31', protein: 200 }, { date: '2026-05-02', protein: 200 }], T, '2026-05-02');
  assert.deepEqual(rPhantom, { current: 1, best: 1 }, 'date impossible ignorée : best non gonflé');
  // cible absente / date invalide
  assert.deepEqual(L.proteinStreak(nut, 0, '2026-07-15'), { current: 0, best: 0 });
  assert.deepEqual(L.proteinStreak(nut, T, 'nope'), { current: 0, best: 0 });
});

test('habitConsistency : régularité DEPUIS le début (fenêtre bornée à la 1re date loggée)', () => {
  // habitude quotidienne ; 1re date loggée = 08/07 → fenêtre bornée à [08..15] = 8 jours prévus
  const log = ['2026-07-15', '2026-07-14', '2026-07-12', '2026-07-10', '2026-07-08']; // 5 tenus / 8 prévus
  const h = { name: 'Lecture', weekdays: [], log };
  const r = L.habitConsistency(h, '2026-07-15', 10);
  assert.deepEqual([r.done, r.scheduled, r.rate], [5, 8, 63]); // 5/8 = 63 %, jours avant le 08 non comptés
  // habitude planifiée lun(1)/mer(3)/ven(5), 1re date = 10/07 → fenêtre [10..15]
  const h2 = { name: 'Sport', weekdays: [1, 3, 5], log: ['2026-07-15', '2026-07-13', '2026-07-10'] };
  const r2 = L.habitConsistency(h2, '2026-07-15', 14);
  // prévus (lun/mer/ven) dans [10..15] : 10(V), 13(L), 15(M) = 3, tous tenus
  assert.deepEqual([r2.done, r2.scheduled, r2.rate], [3, 3, 100]);
  // habitude créée aujourd'hui (1 occurrence) → fenêtre 1 jour, pas de taux ridicule
  const r3 = L.habitConsistency({ name: 'Neuve', weekdays: [], log: ['2026-07-15'] }, '2026-07-15', 30);
  assert.deepEqual([r3.done, r3.scheduled, r3.rate], [1, 1, 100]);
  // aucun historique → null
  assert.equal(L.habitConsistency({ name: 'X', weekdays: [], log: [] }, '2026-07-15', 30), null);
  // date invalide → null
  assert.equal(L.habitConsistency(h, 'nope', 30), null);
  // plafond `days` = contrainte bornante : historique de 21 j mais fenêtre 7 j → on ne compte
  // QUE les 7 derniers jours (pas jusqu'à la 1re date loggée). Aucun test ci-dessus n'exerçait
  // ce cas — tous avaient la 1re date DANS la fenêtre, donc `win` n'y était jamais ce qui borne.
  const longLog = [];
  for (let d = 25; d <= 30; d++) longLog.push('2026-06-' + d);          // 25→30 juin
  for (let d = 1; d <= 15; d++) longLog.push('2026-07-' + String(d).padStart(2, '0')); // 1→15 juil
  const hLong = { name: 'Longue', weekdays: [], log: longLog };
  const rLong = L.habitConsistency(hLong, '2026-07-15', 7);
  assert.deepEqual([rLong.done, rLong.scheduled, rLong.rate], [7, 7, 100]); // 7 prévus / 7 tenus, plafonné à 7 j
  // même fenêtre de 7 j mais un trou DEDANS (12/07 manquant) → 6 / 7 = 86 %
  const hHole = { name: 'Trou', weekdays: [], log: longLog.filter(k => k !== '2026-07-12') };
  const rHole = L.habitConsistency(hHole, '2026-07-15', 7);
  assert.deepEqual([rHole.done, rHole.scheduled, rHole.rate], [6, 7, 86]);
  // habitude planifiée lun/mer/ven avec un jour PRÉVU manqué → prévus dans [10..15] :
  // ven 10 / lun 13 / mer 15 = 3 ; tenus : ven 10 + mer 15 = 2 (lun 13 manqué) → 67 %.
  // Cas d'un taux < 100 sous weekdays, absent des assertions ci-dessus (elles n'avaient que du 100 %).
  const hMiss = { name: 'Sport', weekdays: [1, 3, 5], log: ['2026-07-15', '2026-07-10'] };
  const rMiss = L.habitConsistency(hMiss, '2026-07-15', 14);
  assert.deepEqual([rMiss.done, rMiss.scheduled, rMiss.rate], [2, 3, 67]);
  // JOUR COURANT prévu mais pas encore fait : la journée n'est pas finie → il ne compte PAS comme
  // raté (même tolérance que `habitStreak`). Sinon une habitude jeune parfaite afficherait 🔥 4 mais
  // 📊 80 % côte à côte, incohérence pure. 4 jours faits (13→16), today 17 prévu non fait → 100 %, pas 80 %.
  const hToday = { name: 'Parfaite', weekdays: [], log: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'] };
  const rToday = L.habitConsistency(hToday, '2026-07-17', 30);
  assert.deepEqual([rToday.done, rToday.scheduled, rToday.rate], [4, 4, 100]);
  assert.equal(L.habitStreak(hToday, '2026-07-17'), 4);                  // cohérent avec la série affichée
  // le MÊME jour une fois fait → toujours 100 %, mais compté (5/5)
  const rTodayDone = L.habitConsistency({ ...hToday, log: [...hToday.log, '2026-07-17'] }, '2026-07-17', 30);
  assert.deepEqual([rTodayDone.done, rTodayDone.scheduled, rTodayDone.rate], [5, 5, 100]);
  // un VRAI trou passé compte toujours (le 14 manque, today 17 non fait) → 3 tenus / 4 prévus = 75 %,
  // PAS 100 % : seul le jour courant est toléré, pas les jours révolus ratés.
  const rHoleToday = L.habitConsistency({ name: 'Trou', weekdays: [], log: ['2026-07-13', '2026-07-15', '2026-07-16'] }, '2026-07-17', 30);
  assert.deepEqual([rHoleToday.done, rHoleToday.scheduled, rHoleToday.rate], [3, 4, 75]);
  // habitude hebdo (vendredi) : today ven 17 non fait → seul le ven 10 compte → 100 %, pas 50 %
  const rWeekly = L.habitConsistency({ name: 'Hebdo', weekdays: [5], log: ['2026-07-10'] }, '2026-07-17', 30);
  assert.deepEqual([rWeekly.done, rWeekly.scheduled, rWeekly.rate], [1, 1, 100]);
});

test('applyHabitEdit : modifie nom/jours en préservant id, log, xp, série', () => {
  const h = { id: 42, name: 'Lecture', xp: 15, weekdays: [1, 3, 5], log: ['2026-07-14', '2026-07-15'], createdAt: 1000 };
  // renomme + change les jours
  const r = L.applyHabitEdit(h, { name: '  Lecture du soir  ', weekdays: [1, 2, 3, 4, 5] });
  assert.equal(r.name, 'Lecture du soir');       // trim
  assert.deepEqual(r.weekdays, [1, 2, 3, 4, 5]);
  assert.equal(r.id, 42);                          // id préservé
  assert.deepEqual(r.log, ['2026-07-14', '2026-07-15']); // historique préservé → série intacte
  assert.equal(r.xp, 15);                          // xp préservé
  assert.equal(r.createdAt, 1000);
  // 7 jours cochés → [] (tous les jours)
  assert.deepEqual(L.applyHabitEdit(h, { weekdays: [0, 1, 2, 3, 4, 5, 6] }).weekdays, []);
  // nom vide → garde l'ancien ; jours vides → garde les anciens
  const r2 = L.applyHabitEdit(h, { name: '   ', weekdays: [] });
  assert.equal(r2.name, 'Lecture');
  assert.deepEqual(r2.weekdays, [1, 3, 5]);
  // patch absent → habitude inchangée (normalisée)
  assert.equal(L.applyHabitEdit(h).name, 'Lecture');
  // dédoublonne et trie les jours
  assert.deepEqual(L.applyHabitEdit(h, { weekdays: [5, 1, 5, 3] }).weekdays, [1, 3, 5]);
});

test('weightMilestones : paliers intermédiaires, dernier = cible exacte', () => {
  // 81 → 75 kg (perte 6 kg) à 0,5 kg/sem → 12 semaines ; paliers toutes les 2 sem
  const ms = L.weightMilestones({ current: 81, target: 75, ratePerWeek: 0.5, todayKey: '2026-07-15', everyWeeks: 2, maxSteps: 8 });
  assert.ok(ms.length >= 3);
  // premier palier à S+2 : 81 - 0,5*2 = 80
  assert.equal(ms[0].weeksFromNow, 2);
  assert.equal(ms[0].weight, 80);
  // dernier palier = cible exacte, remaining 0
  const last = ms[ms.length - 1];
  assert.equal(last.weight, 75);
  assert.equal(last.remaining, 0);
  assert.equal(last.weeksFromNow, 12);
  // les poids décroissent vers la cible
  for (let i = 1; i < ms.length; i++) assert.ok(ms[i].weight <= ms[i - 1].weight);
  // prise de poids (81 → 85)
  const up = L.weightMilestones({ current: 81, target: 85, ratePerWeek: 0.25, todayKey: '2026-07-15', everyWeeks: 2 });
  assert.equal(up[up.length - 1].weight, 85);
  assert.ok(up[0].weight > 81);
  // maxSteps borne le nombre de paliers (+ le final)
  const many = L.weightMilestones({ current: 90, target: 70, ratePerWeek: 0.25, todayKey: '2026-07-15', everyWeeks: 1, maxSteps: 5 });
  assert.ok(many.length <= 5);
  assert.equal(many[many.length - 1].weight, 70);
  // déjà à la cible / entrées invalides → []
  assert.deepEqual(L.weightMilestones({ current: 75, target: 75, ratePerWeek: 0.5, todayKey: '2026-07-15' }), []);
  assert.deepEqual(L.weightMilestones({ current: 81, target: 75, ratePerWeek: 0, todayKey: '2026-07-15' }), []);
});

test('weightGoalProgress : progression globale départ → cible', () => {
  // Perte : départ 84, actuel 81, cible 78 → 3 kg faits sur 6 = 50 %
  const p = L.weightGoalProgress([
    { date: '2026-06-01', value: 84 },
    { date: '2026-06-20', value: 82 },
    { date: '2026-07-10', value: 81 }
  ], 78);
  assert.equal(p.direction, 'perte');
  assert.equal(p.totalKg, 6);
  assert.equal(p.doneKg, 3);
  assert.equal(p.remainingKg, 3);
  assert.equal(p.pct, 50);
  assert.equal(p.start, 84);
  assert.equal(p.current, 81);
  // Prise : départ 70, actuel 73, cible 76 → 3 sur 6 = 50 %
  const up = L.weightGoalProgress([{ date: '2026-06-01', value: 70 }, { date: '2026-07-10', value: 73 }], 76);
  assert.equal(up.direction, 'prise');
  assert.equal(up.pct, 50);
  // mauvais sens (on grossit alors qu'on veut perdre) → 0 %, jamais négatif
  const wrong = L.weightGoalProgress([{ date: '2026-06-01', value: 80 }, { date: '2026-07-10', value: 82 }], 75);
  assert.equal(wrong.doneKg, 0);
  assert.equal(wrong.pct, 0);
  // dépassement de la cible → borné à 100 %
  const over = L.weightGoalProgress([{ date: '2026-06-01', value: 80 }, { date: '2026-07-10', value: 74 }], 75);
  assert.equal(over.pct, 100);
  assert.equal(over.doneKg, over.totalKg);
  // aucune pesée → utilise le poids de repli (départ = actuel → pas encore de progrès)
  const fb = L.weightGoalProgress([], 75, 80);
  assert.equal(fb.start, 80);
  assert.equal(fb.current, 80);
  assert.equal(fb.pct, 0);
  // pas de cible / départ = cible → null
  assert.equal(L.weightGoalProgress([{ date: '2026-06-01', value: 80 }], 0), null);
  assert.equal(L.weightGoalProgress([{ date: '2026-06-01', value: 75 }], 75, 75), null);
});

test('trackingCadenceAdvice : conseils de fréquence selon le sens', () => {
  const perte = L.trackingCadenceAdvice('perte');
  assert.ok(/2 à 3/.test(perte.weighIn) && /2 semaines/.test(perte.measure));
  const maintien = L.trackingCadenceAdvice('maintien');
  assert.ok(/1×\/semaine/.test(maintien.weighIn) && /mois/.test(maintien.measure));
  // prise = même cadence active que perte
  assert.equal(L.trackingCadenceAdvice('prise').measure, perte.measure);
});

test('upsertWeight : une pesée par jour (remplace), triée, sans mutation', () => {
  const base = [{ id: 1, value: 80, date: '2026-07-10' }, { id: 2, value: 79.5, date: '2026-07-12' }];
  // nouvelle date → ajout, trié
  const r1 = L.upsertWeight(base, 78.4, '2026-07-15');
  assert.deepEqual(r1.map(w => w.date), ['2026-07-10', '2026-07-12', '2026-07-15']);
  assert.equal(r1.at(-1).value, 78.4);
  assert.equal(base.length, 2, 'entrée non mutée');
  // même date → remplace (pas de doublon)
  const r2 = L.upsertWeight(base, 79.8, '2026-07-12');
  assert.equal(r2.filter(w => w.date === '2026-07-12').length, 1);
  assert.equal(r2.find(w => w.date === '2026-07-12').value, 79.8);
  assert.equal(r2.length, 2);
  // arrondi 0,1 + tri
  assert.equal(L.upsertWeight([], 77.36, '2026-07-15')[0].value, 77.4);
  // bornes / date invalide → inchangé
  assert.deepEqual(L.upsertWeight(base, 20, '2026-07-15'), base);
  assert.deepEqual(L.upsertWeight(base, 500, '2026-07-15'), base);
  assert.deepEqual(L.upsertWeight(base, 80, 'nope'), base);
});

test('upsertMeasurement : une mensuration par jour, fusion des champs, sans mutation', () => {
  const base = [{ id: 1, waist: 84, chest: 100, arm: 36, date: '2026-07-10' }];
  // nouvelle date → ajout trié
  const r1 = L.upsertMeasurement(base, { waist: 83, chest: 99, arm: 36 }, '2026-07-15');
  assert.deepEqual(r1.map(m => m.date), ['2026-07-10', '2026-07-15']);
  assert.equal(r1.at(-1).waist, 83);
  assert.equal(base.length, 1, 'entrée non mutée');
  // même date, seul le tour de taille renseigné → FUSION (poitrine/bras du jour conservés), id conservé
  const withDay = [{ id: 9, waist: 84, chest: 100, arm: 36, date: '2026-07-15' }];
  const r2 = L.upsertMeasurement(withDay, { waist: 82.5, chest: 0, arm: 0 }, '2026-07-15');
  assert.equal(r2.filter(m => m.date === '2026-07-15').length, 1, 'pas de doublon de date');
  assert.equal(r2[0].waist, 82.5, 'taille mise à jour');
  assert.equal(r2[0].chest, 100, 'poitrine conservée');
  assert.equal(r2[0].arm, 36, 'bras conservé');
  assert.equal(r2[0].id, 9, 'id du jour conservé (mise à jour)');
  // arrondi 0,1
  assert.equal(L.upsertMeasurement([], { waist: 81.36 }, '2026-07-15')[0].waist, 81.4);
  // aucun champ valide / bornes / date invalide → inchangé
  assert.deepEqual(L.upsertMeasurement(base, { waist: 0, chest: 0, arm: 0 }, '2026-07-15'), base);
  assert.deepEqual(L.upsertMeasurement(base, { waist: 5 }, '2026-07-15'), base, 'sous la borne → inchangé');
  assert.deepEqual(L.upsertMeasurement(base, { waist: 85 }, 'nope'), base);
});

test('measurementSeries : série datée d’un champ, triée, plafonnée', () => {
  const m = [
    { date: '2026-05-01', waist: 88, chest: 102 },
    { date: '2026-06-01', waist: 86 },
    { date: '2026-07-01', waist: 84, chest: 100 },
    { date: '2026-04-01', waist: 90 }
  ];
  const s = L.measurementSeries(m, 'waist', 8);
  assert.deepEqual(s.map(p => p.value), [90, 88, 86, 84], 'trié du plus ancien au plus récent');
  assert.equal(s[0].date, '2026-04-01');
  // plafonné aux N derniers
  assert.equal(L.measurementSeries(m, 'waist', 2).length, 2);
  assert.deepEqual(L.measurementSeries(m, 'waist', 2).map(p => p.value), [86, 84], 'garde les plus récents');
  // ignore les valeurs manquantes du champ
  assert.equal(L.measurementSeries(m, 'chest', 8).length, 2);
  // rien / champ absent → []
  assert.deepEqual(L.measurementSeries([], 'waist', 8), []);
  assert.deepEqual(L.measurementSeries([{ date: 'bad', waist: 80 }], 'waist', 8), []);
});

test('dailyGreeting : salutation personnalisée selon l’heure', () => {
  assert.equal(L.dailyGreeting({ name: 'Adrien', hour: 8 }).hello, 'Bonjour Adrien');
  assert.equal(L.dailyGreeting({ name: 'Adrien', hour: 14 }).hello, 'Bon après-midi Adrien');
  assert.equal(L.dailyGreeting({ name: 'Adrien', hour: 20 }).hello, 'Bonsoir Adrien');
  assert.equal(L.dailyGreeting({ name: 'Adrien', hour: 2 }).hello, 'Encore debout Adrien');
  // sans nom → pas de prénom collé
  assert.equal(L.dailyGreeting({ hour: 8 }).hello, 'Bonjour');
  // ne garde que le prénom (1er mot), tronqué
  assert.equal(L.dailyGreeting({ name: '  Adrien Dupont ', hour: 8 }).hello, 'Bonjour Adrien');
  // chaque tranche a un nudge non vide
  [8, 14, 20, 2].forEach(h => assert.ok(L.dailyGreeting({ hour: h }).nudge.length > 3));
  // heure absente → midi (après-midi)
  assert.equal(L.dailyGreeting({}).hello, 'Bon après-midi');
  // bornes
  assert.equal(L.dailyGreeting({ hour: 5 }).hello, 'Bonjour');
  assert.equal(L.dailyGreeting({ hour: 23 }).hello, 'Encore debout');
});

test('backupFilename : nom de sauvegarde daté', () => {
  assert.equal(L.backupFilename('2026-07-15'), 'irl-lvp-up-sauvegarde-2026-07-15.json');
  assert.equal(L.backupFilename('nope'), 'irl-lvp-up-sauvegarde-export.json');
  assert.equal(L.backupFilename(), 'irl-lvp-up-sauvegarde-export.json');
});

test('unwrapBackup : déballe le format enveloppé, laisse l’état brut intact', () => {
  const raw = { xp: 100, workouts: [{ id: 1 }], profile: { weight: 80 } };
  // état brut (export direct) → renvoyé tel quel
  assert.strictEqual(L.unwrapBackup(raw), raw);
  // format enveloppé (auto-backup desktop) → on récupère l'état intérieur
  const wrapped = { version: 4, savedAt: '2026-07-15T10:00:00Z', state: raw };
  assert.strictEqual(L.unwrapBackup(wrapped), raw, 'renvoie parsed.state');
  assert.equal(L.unwrapBackup(wrapped).xp, 100);
  // garde-fous : state absent/nul/non-objet/tableau → on ne déballe pas
  const noState = { version: 4 };
  assert.strictEqual(L.unwrapBackup(noState), noState, 'pas de .state → objet inchangé');
  assert.deepEqual(L.unwrapBackup({ state: null }), { state: null }, '.state null → inchangé');
  assert.deepEqual(L.unwrapBackup({ state: [1, 2] }), { state: [1, 2] }, '.state tableau → inchangé');
  assert.equal(L.unwrapBackup(null), null);
  assert.deepEqual(L.unwrapBackup([1, 2]), [1, 2], 'tableau brut → inchangé');
});

test('coachNoteUrgency / orderCoachNotes : l’urgent passe devant l’anodin', () => {
  // Paliers : 0 intégrité physique < 1 charge < 2 sommeil/récup < 3 intrants < 4 non classé < 5 anodin.
  assert.equal(L.coachNoteUrgency('la première cause de blessure du coureur (fracture de fatigue)'), 0);
  assert.equal(L.coachNoteUrgency('Mais ta charge est en pic cette semaine'), 1);
  assert.equal(L.coachNoteUrgency('enraye maintenant, avant que la dette ne s’installe'), 2);
  assert.equal(L.coachNoteUrgency('tu n’atteins ta cible protéines que 2/10'), 3);
  assert.equal(L.coachNoteUrgency('Objectif hebdo : 2/3 séances.'), 4, 'note non classée = rang médian');
  // FAUX POSITIF attrapé EN NAVIGATEUR : une note PÉDAGOGIQUE sur le sommeil qui mentionne la
  // blessure en incise ne doit PAS passer rang 0 — sinon elle force une carte de 365 c (mesuré).
  // Elle porte sur le sommeil → rang 2. Même piège de sous-chaîne que le bug #446 (`pris`/entreprise).
  assert.equal(L.coachNoteUrgency('tu dors 5 h en moyenne ces derniers jours, sous les 7 h — dormir '
    + 'court plafonne les gains de chaque séance tout en augmentant le risque de blessure'), 2,
    'mentionner « blessure » ne suffit pas : la note doit PORTER sur l’intégrité physique');
  assert.equal(L.coachNoteUrgency('un bloc de plus serait du pur bonus, sans la moindre pression'), 5,
    'l’anodin DOIT tomber sous le rang par défaut, sinon il n’est jamais relégué');
  // Le verdict (1ʳᵉ phrase) ne bouge JAMAIS ; le reste est trié par urgence.
  const ordered = L.orderCoachNotes(
    'Ton sommeil déraille — priorité ce soir. Objectif bouclé : un bloc de plus serait du pur bonus, sans pression. ' +
    'Et surveille ta montée de kilométrage : tes tendons encaissent mal, risque de fracture de fatigue. ' +
    'Objectif hebdo : 2/3 séances.');
  assert.match(ordered[0], /Ton sommeil déraille/, 'le verdict reste en tête');
  assert.match(ordered[1], /kilométrage/, 'le risque de blessure remonte juste après le verdict');
  assert.match(ordered[3], /pur bonus/, 'l’anodin part en dernier');
  // Tri STABLE : à rang égal, l’ordre d’origine est conservé.
  const stable = L.orderCoachNotes('Verdict. Note A neutre. Note B neutre. Note C neutre.');
  assert.deepEqual(stable.slice(1), ['Note A neutre.', 'Note B neutre.', 'Note C neutre.']);
  // Entrées dégénérées : jamais d’exception.
  assert.deepEqual(L.orderCoachNotes(''), []);
  assert.equal(L.coachNoteUrgency(null), 4);
  // DÉCOUPAGE (régression attrapée en NAVIGATEUR) : « (moy. 5 h » et « ~69 min d’un soir » ne sont PAS
  // des fins de phrase. Tant que l’ordre était préservé le charabia restait invisible ; dès qu’on
  // reclasse, les fragments se séparent → « Sommeil court et coucher irrégulier (moy. Et la pente… ».
  const vrai = 'Sommeil court et coucher irrégulier (moy. 5 h, coucher variant de ~69 min d’un soir à '
    + 'l’autre) — avant d’allonger les nuits, stabilise d’abord une heure de coucher fixe. '
    + 'Et la pente s’enfonce : tes nuits sont passées de 7,5 à 5 h (-2,5 h vs la semaine précédente).';
  const ph = L.splitCoachSentences(vrai);
  assert.equal(ph.length, 2, 'deux phrases réelles, pas quatre fragments');
  assert.match(ph[0], /coucher fixe\.$/, 'le verdict reste entier, parenthèse et abréviation incluses');
  assert.match(ph[1], /^Et la pente/);
  // DÉCIMALE À POINT (régression attrapée en NAVIGATEUR, §4ter) : le « . » de « 5.3 » n'est PAS une
  // fin de phrase. L'ancien match() coupait à ce point puis PERDAIT le fragment « 5. » dans le trou
  // entre deux captures (le point n'étant pas suivi d'un espace) → la carte du coach affichait un
  // NOMBRE FAUX (« moy. 5.3 h » → « moy. 3 h », « Tu dors 5.3 h » → « 3 h ») dès que l'insight passait
  // par orderCoachNotes. On ne casse plus une décimale et on ne jette aucun caractère.
  assert.deepEqual(L.splitCoachSentences('Sommeil court (moy. 5.3 h, écart 1.5 h) — stabilise.'),
    ['Sommeil court (moy. 5.3 h, écart 1.5 h) — stabilise.'], 'décimale à point préservée, rien perdu');
  assert.deepEqual(L.splitCoachSentences('Tu dors 5.3 h en moyenne. Garde le cap.'),
    ['Tu dors 5.3 h en moyenne.', 'Garde le cap.'], 'la tête de phrase ne disparaît plus');
  // Le verdict sommeil réel (« moy. 5.3 h » avec un POINT, non converti en virgule) survit au reclassement.
  const dec = L.orderCoachNotes('Sommeil court (moy. 5.3 h, dette 6.5 h) — vise un coucher plus tôt. '
    + 'Et la pente s’enfonce : enraye avant que la dette ne s’installe.');
  assert.match(dec[0], /moy\. 5\.3 h/, 'le nombre exact est affiché, pas « moy. 3 h »');
});

test('coachNoteUrgency : « sans nouveau record » (plateau de force) n’est PAS anodin — les félicitations, si', () => {
  // BUG attrapé à la lecture du code (#621, §3 hiérarchisation) : le motif anodin (rang 5) contenait
  // un « record » NU, qui attrapait la note corrective de plateau — « … 1RM estimé stagne … sans
  // nouveau record. Pour débloquer ça : … » — une VRAIE action, reléguée à tort DERRIÈRE « c'est du
  // pur bonus ». Le plateau doit tomber au défaut (4), à parité avec son pendant positif sportProgress.
  const plateau = 'Côté progression : ton développé couché marque le pas — son 1RM estimé stagne autour '
    + 'de 116,5 kg depuis 3 séances, sans nouveau record.';
  assert.equal(L.coachNoteUrgency(plateau), 4,
    'la note « stagne, sans nouveau record » est une action, pas une félicitation → défaut, pas anodin');
  // Les célébrations réelles restent anodin (rang 5) : elles disent « ton record » / « record perso ».
  assert.equal(L.coachNoteUrgency('🏆 Et pas n’importe quelle séance : tu viens de battre ton record '
    + 'sur le Squat — 110 kg × 5, ta meilleure perf à ce jour.'), 5, 'battre TON record = anodin');
  assert.equal(L.coachNoteUrgency('🏆 Et là tu bats ton record perso sur ton entraînement : jamais tu '
    + 'n’avais tenu autant de jours d’affilée.'), 5, 'record PERSO = anodin');
  // Effet réel sur la carte (§4ter) : le plateau (2 phrases) passe DEVANT le bonus anodin ET reste SOUDÉ
  // (prémisse « Côté progression » immédiatement suivie de sa conclusion « Pour débloquer »). Le bonus est
  // appendu AVANT le plateau dans le vrai insight (sessionGoalBonus ~L5589 < plateau ~L7300) : sans l'ajout
  // de « Côté progression » aux ouvreurs d'orderCoachNotes, la prémisse héritait du rang 5 du bonus et se
  // retrouvait DÉCHIRÉE de sa conclusion (prémisse tout en bas, conclusion remontée seule).
  const ordered = L.orderCoachNotes(
    'Ton entrainement monte en régime. Et ta forme est au top : chaque séance en plus est du gain offert, '
    + 'du rab sans pression. Côté progression : ton développé couché marque le pas — son 1RM estimé stagne '
    + 'autour de 116,5 kg depuis 3 séances, sans nouveau record. Pour débloquer ça : ajoute une répétition.');
  assert.match(ordered[0], /monte en régime/, 'le verdict reste en tête');
  assert.match(ordered[1], /marque le pas/, 'le correctif de plateau remonte devant l’anodin');
  assert.match(ordered[2], /Pour débloquer/, 'sa conclusion reste SOUDÉE juste après la prémisse');
  assert.match(ordered[3], /gain offert/, 'le « c’est du rab » part bien en dernier');
  // Pendant positif sportProgress (« Sur ta lancée … ») : même ouvreur sans « Et », même soudage attendu.
  const prog = L.orderCoachNotes(
    'Ta forme tient la route. Et ta forme est au top : chaque séance en plus est du gain offert, sans pression. ' +
    'Sur ta lancée : ton squat gagne du terrain — 1RM estimé à 120 kg. À ce rythme, tu passes la barre des 130 kg.');
  assert.match(prog[1], /Sur ta lancée/, 'la progression remonte devant l’anodin');
  assert.match(prog[2], /À ce rythme/, 'sa conclusion reste soudée');
  assert.match(prog[3], /gain offert/, 'l’anodin en dernier');
});

test('orderCoachNotes : une note à 2 phrases reste SOUDÉE (prémisse classée + conclusion non classée)', () => {
  // BUG attrapé en NAVIGATEUR (§4ter) : plusieurs guards du coach tiennent sur DEUX phrases — une
  // prémisse CLASSÉE (ici sommeil, rang 2) suivie d'une conclusion NON classée (rang par défaut).
  // Le tri phrase par phrase les SÉPARAIT : la prémisse remontait au bon rang, la conclusion tombait
  // ORPHELINE tout en bas, loin de ce qu'elle explique → charabia dès qu'on déplie « plus de contexte ».
  // Reproduit à l'identique de l'assemblage réel (verdict sport en 2 phrases + note kilométrage rang 0
  // + note sommeil×sport rang 2 avec sa conclusion « Bien dormir démultiplie… » rang 4).
  const insight =
    '1 jour actif cette semaine, en hausse. Garde le rythme.' +
    ' Objectif hebdo : 2/4 séances.' +
    ' Et surveille ta montée de kilométrage : tu es passé de 20 à 32 km de course cette semaine, ' +
    'première cause de blessure du coureur (fracture de fatigue) — plafonne à +10 %.' +
    ' Et n’oublie pas le socle invisible de tes gains : tu dors 5,5 h en moyenne ces derniers jours, ' +
    'sous les 7 h — dormir court plafonne les gains de chaque séance. ' +
    'Bien dormir démultiplie l’effort que tu fournis déjà.';
  const ordered = L.orderCoachNotes(insight);
  const iPremisse = ordered.findIndex(p => /socle invisible/.test(p));
  const iConclusion = ordered.findIndex(p => /démultiplie/.test(p));
  assert.ok(iPremisse >= 0 && iConclusion >= 0, 'les deux phrases sont présentes');
  assert.equal(iConclusion, iPremisse + 1, 'la conclusion suit IMMÉDIATEMENT sa prémisse (bloc soudé)');
  // La note kilométrage (rang 0) reste elle aussi en un seul bloc, avant le sommeil (rang 2).
  assert.ok(ordered.findIndex(p => /kilométrage/.test(p)) < iPremisse, 'le rang 0 passe avant le rang 2');
  // GARDE-FOU anti-régression : une note non classée SANS prémisse classée avant elle (« Objectif
  // hebdo », appendue au cœur AVANT les notes secondaires) ne doit PAS être tirée vers le haut — elle
  // reste au rang par défaut, donc APRÈS les notes classées kilométrage/sommeil.
  const iObjectif = ordered.findIndex(p => /Objectif hebdo/.test(p));
  assert.ok(iObjectif > iConclusion, 'une note neutre sans prémisse reste en bas, pas tirée au rang 2');
});

test('jobStatusFromText : « pris » n’est une acceptation que dans une tournure d’acceptation', () => {
  // RÉGRESSION #551 — le fix #446 (`pris` → `\bpris`) ne réglait QUE « entre-pris-e ». Restaient
  // « PRISE de contact », « PRIS contact », « PRIS en compte », « rendez-vous PRIS » : tournures
  // ultra-courantes d’une recherche d’alternance, toutes classées « accepté » → funnel et
  // applicationStats corrompus, via la sync Sheets, sur le module prioritaire d’Adrien.
  assert.equal(L.jobStatusFromText('Prise de contact avec le cabinet'), 'postule');
  assert.equal(L.jobStatusFromText('J’ai pris contact par mail'), 'postule');
  assert.equal(L.jobStatusFromText('Pris en compte, réponse sous 15 j'), 'postule');
  assert.equal(L.jobStatusFromText('Rendez-vous pris pour mardi'), 'postule');
  // …mais une VRAIE acceptation reste reconnue.
  assert.equal(L.jobStatusFromText('J’ai été pris !'), 'accepte');
  assert.equal(L.jobStatusFromText('Je suis prise'), 'accepte');
  assert.equal(L.jobStatusFromText('Candidature retenue'), 'accepte');
  assert.equal(L.jobStatusFromText('Embauché'), 'accepte');
  // `accept` nu matchait « in-accept-able » : la frontière de mot tombe après « in ».
  assert.notEqual(L.jobStatusFromText('Candidature inacceptable'), 'accepte');
  // Non-régression des pièges déjà corrigés.
  assert.equal(L.jobStatusFromText('Entretien en entreprise'), 'entretien', 'piège #446');
  assert.equal(L.jobStatusFromText('Non retenu'), 'refus');
  assert.equal(L.jobStatusFromText('Pas été retenue'), 'refus');
  assert.equal(L.jobStatusFromText('Refusé après entretien'), 'refus', 'état terminal, pas « entretien »');
});

// ── CORRECTIFS #592 (audit adversarial de la nuit VPS #554→#591) ─────────────────────────────────
test('#592/#572 : une négation ÉTRANGÈRE avant « postulé » ne dégrade plus en « à postuler »', () => {
  // Régression #572 : `[\s\S]{0,12}` traversait la ponctuation → « pas de retour, postulé » = à postuler,
  // donc la candidature ENVOYÉE sortait du funnel à chaque sync. La négation doit porter sur le verbe.
  assert.equal(L.jobStatusFromText('Pas de retour, postulé le 03/03'), 'postule');
  assert.equal(L.jobStatusFromText('Pas de news, envoyé le 3'), 'postule');
  assert.equal(L.jobStatusFromText('Mail non lu, postulé le 12/03'), 'postule');
  assert.equal(L.jobStatusFromText('Poste non pourvu, CV envoyé'), 'postule');
  // …mais une vraie négation de l'action reste « à postuler ».
  assert.equal(L.jobStatusFromText('Pas encore postulé'), 'a_postuler');
  assert.equal(L.jobStatusFromText('Candidature non envoyée'), 'a_postuler');
  assert.equal(L.jobStatusFromText('toujours pas envoyé'), 'a_postuler');
});
test('#592/#558 : orderCoachNotes n’étend plus le rang d’une note à une AUTRE note qui suit', () => {
  // Régression #558 : une note autonome (« Et c’est ton jour de jambes », rang propre 4) héritait du
  // rang 0 de la note blessure précédente et passait DEVANT une vraie alerte sommeil (rang 2).
  const ins = 'Verdict sport du jour. Et surveille ta montée de kilométrage : tes tendons encaissent mal, '
    + 'risque de fracture de fatigue. Et c’est justement ton jour de jambes aujourd’hui, profites-en. '
    + 'Et surveille un frein caché : tu dors 5 h en moyenne ces derniers jours, sous les 7 h.';
  const o = L.orderCoachNotes(ins);
  const iKm = o.findIndex(p => /kilométrage/.test(p));
  const iSommeil = o.findIndex(p => /frein caché/.test(p));
  const iJour = o.findIndex(p => /jour de jambes/.test(p));
  assert.ok(iKm < iSommeil, 'la blessure (rang 0) reste devant le sommeil (rang 2)');
  assert.ok(iSommeil < iJour, 'le sommeil (rang 2) passe devant la note neutre (rang 4), plus tirée au rang 0');
  // La prémisse→conclusion d'un MÊME guard (conclusion sans « Et ») reste soudée, elle.
  const soud = L.orderCoachNotes('Cœur du jour. Et n’oublie pas le socle invisible : tu dors 5,5 h en moyenne '
    + 'ces derniers jours, sous les 7 h. Bien dormir démultiplie ton effort.');
  const iP = soud.findIndex(p => /socle invisible/.test(p)), iC = soud.findIndex(p => /démultiplie/.test(p));
  assert.equal(iC, iP + 1, 'la conclusion suit immédiatement sa prémisse');
});
test('#592/#562 : studyPacing borne les révisions à l’épreuve la plus proche (multi-épreuves)', () => {
  const agenda = [];
  for (let i = 1; i <= 6; i++) agenda.push({ kind: 'study', date: `2026-07-${20 + i}`, completed: false }); // avant Droit
  for (let i = 1; i <= 30; i++) agenda.push({ kind: 'study', date: `2026-1${i < 10 ? '0-0' + i : '0-' + (i - 20)}`, completed: false }); // vers Compta (lointain)
  const exams = [{ id: 'd', subject: 'Droit', title: 'Droit', date: '2026-08-01' }, { id: 'c', subject: 'Compta', title: 'Compta', date: '2026-12-15' }];
  const p = L.studyPacing(agenda, exams, '2026-07-20');
  assert.ok(p && p.perWeek <= 7, `rythme plausible (≤7/sem), pas gonflé par l’autre épreuve — obtenu ${p && p.perWeek}`);
  // Mono-épreuve : borne sans effet (toutes les séances ≤ examDate) → statut inchangé.
  const solo = L.studyPacing([{ kind: 'study', date: '2026-07-25', completed: false }], { title: 'X', date: '2026-08-10' }, '2026-07-20');
  assert.ok(solo && solo.remaining === 1, 'mono-épreuve : la révision à venir reste comptée');
});
test('#592/#591 : un palier RARE n’est plus éteint par un palier plus courant du même jour', () => {
  const iso = off => { const d = new Date('2026-07-16T12:00:00'); d.setDate(d.getDate() - off); return d.toISOString().slice(0, 10); };
  // Habitude à 365 j pile aujourd'hui + série de 7 journées complètes (3+ piliers) → les DEUX doivent parler.
  const log = []; for (let i = 0; i < 365; i++) log.push(iso(i));
  const state = {
    habits: [{ id: 1, name: 'Lecture', log }],
    workouts: [], focusSessions: [], nutrition: [], recovery: [],
  };
  for (let i = 0; i < 7; i++) { state.workouts.push({ date: iso(i) }); state.focusSessions.push({ date: iso(i), minutes: 30 }); state.nutrition.push({ date: iso(i), protein: 80 }); }
  const f = L.adaptiveCoachFocus(state, '2026-07-16');
  assert.equal(f.habitMilestone && f.habitMilestone.streak, 365, 'le palier 365 est bien détecté');
  assert.match(f.insight, /année entière|365 jours/, 'le palier RARE (365 j) est célébré malgré le palier de 7 j');
});

test('weekProgramSchedule : ancre le programme sur la SEMAINE EN COURS, saute les jours passés', () => {
  const days = [{ weekday: 1, type: 'muscu' }, { weekday: 3, type: 'muscu' }, { weekday: 5, type: 'muscu' }];
  // Jeudi 2026-07-23 (semaine lundi 20 → dimanche 26). Lundi 20 et mercredi 22 sont passés.
  const occ = L.weekProgramSchedule(days, '2026-07-23', 2);
  const dates = occ.map(o => o.date);
  assert.ok(!dates.includes('2026-07-20') && !dates.includes('2026-07-22'), 'les jours passés de la semaine en cours sont sautés');
  assert.ok(dates.includes('2026-07-24'), 'le vendredi 24 (à venir, CETTE semaine) est bien posé');
  assert.deepEqual(dates, ['2026-07-24', '2026-07-27', '2026-07-29', '2026-07-31'], 'vendredi de cette semaine + semaine suivante complète, triés');
  // Lundi de la semaine : tout est à venir → aucun jour sauté.
  const full = L.weekProgramSchedule(days, '2026-07-20', 1).map(o => o.date);
  assert.deepEqual(full, ['2026-07-20', '2026-07-22', '2026-07-24'], 'un lundi, toute la semaine est posée');
  // Robustesse : entrées vides / date invalide → [].
  assert.deepEqual(L.weekProgramSchedule([], '2026-07-20', 4), []);
  assert.deepEqual(L.weekProgramSchedule(days, 'nope', 4), []);
});

test('weightForecastModel : échelle Y priorise le RÉEL pour qu’il soit lisible', () => {
  // Cible LOINTAINE : plan 90→78 (12 kg), réel varie ~1,5 kg. L’ancienne échelle partagée écrasait le
  // réel (~6/100) ; désormais Y est borné sur le réel → le réel remplit la hauteur.
  const plan = []; for (let i = 0; i <= 12; i++) { const d = new Date('2026-07-11T12:00:00'); d.setDate(d.getDate() + i * 7); plan.push({ date: d.toISOString().slice(0, 10), value: Math.round((90 - i) * 10) / 10 }); }
  const actual = [{ date: '2026-06-20', value: 91.4 }, { date: '2026-06-27', value: 91.0 }, { date: '2026-07-04', value: 90.5 }, { date: '2026-07-11', value: 90.0 }];
  const m = L.weightForecastModel(plan, actual);
  assert.ok(m, 'modèle renvoyé');
  assert.ok(m.vMin >= 89 && m.vMax <= 92.5, `Y borné sur le réel, obtenu ${m.vMin}-${m.vMax}`);
  const ys = m.actual.map(p => p.y); const ampl = Math.max(...ys) - Math.min(...ys);
  assert.ok(ampl > 25, `le réel occupe une vraie amplitude verticale (${ampl.toFixed(1)}/100), plus écrasé`);
  assert.ok(m.yTicks.length >= 2 && m.yTicks.every((t, i) => i === 0 || t.value > m.yTicks[i - 1].value), 'graduations kg croissantes');
  assert.ok(m.yTicks.every(t => t.value >= m.vMin - 0.01 && t.value <= m.vMax + 0.01), 'graduations dans les bornes');
  assert.equal(m.todayX, m.plan[0].x, 'todayX = début du plan');
  assert.equal(m.targetInView, false, '78 hors du cadre réel → pas de ligne cible, le plan sort du bas');
  const noAct = L.weightForecastModel(plan, []);
  assert.ok(noAct.vMin <= 78.5 && noAct.vMax >= 89, 'sans réel, l’échelle couvre le plan');
  assert.equal(L.weightForecastModel([{ date: '2026-07-01', value: 80 }], []), null, '<2 points de plan → null');
  assert.equal(L.weightForecastModel(null, null), null);
  // ZOOM (#596) : fenêtre autour d'aujourd'hui → todayX centré (~50), point courant exposé, plan rogné.
  const zPlan = []; for (let i = 0; i <= 15; i++) { const d = new Date('2026-07-11T12:00:00'); d.setDate(d.getDate() + i * 7); zPlan.push({ date: d.toISOString().slice(0, 10), value: 90 - i * 0.8 }); }
  const zAct = []; for (let i = 6; i >= 0; i--) { const d = new Date('2026-07-11T12:00:00'); d.setDate(d.getDate() - i * 7); zAct.push({ date: d.toISOString().slice(0, 10), value: 91.5 - (6 - i) * 0.2 }); }
  const zoom = L.weightForecastModel(zPlan, zAct, { windowWeeks: 8 });
  assert.equal(zoom.todayX, 50, 'aujourd’hui au centre quand on zoome');
  assert.ok(zoom.plan.length < zPlan.length, 'le plan lointain est rogné par la fenêtre');
  assert.ok(zoom.current && zoom.current.value === zAct[zAct.length - 1].value, 'le point courant = dernière pesée');
  assert.equal(L.weightForecastModel(zPlan, zAct).current.value, zAct[zAct.length - 1].value, 'current exposé même sans zoom');
});

// coachDayPriority (#606, B.1) : arbitrage transversal entre « À rattraper » et « Le focus du moment ».
test('coachDayPriority : date invalide → structure vide', () => {
  const r = L.coachDayPriority({}, 'pas-une-date');
  assert.deepEqual(r, { primary: null, deduped: [], defer: null, reframed: false });
});

test('coachDayPriority : le focus proactif devient la priorité n°1, pilier préservé (non-régression coachLog)', () => {
  const focus = { pillar: 'sport', label: 'Entraînement', emoji: '🏋️', page: 'athlete', tone: 'reinforce', headline: 'Ton entraînement monte en régime', insight: '3 jours actifs cette semaine, en hausse.', action: 'Encore un jour actif.' };
  const digest = [{ key: 'habits', emoji: '🔥', text: '1 habitude à relancer', page: 'dashboard', sev: 'med' }];
  const r = L.coachDayPriority({}, '2026-07-20', { focus, digest });
  assert.equal(r.reframed, false);
  assert.equal(r.primary.source, 'focus');
  assert.equal(r.primary.pillar, 'sport', 'le pilier du focus est intact — coachLog reste la source de vérité');
  assert.equal(r.primary.headline, focus.headline);
  assert.equal(r.deduped.length, 1, 'un digest sur un autre pilier reste visible');
  assert.equal(r.defer, null);
});

test('coachDayPriority : dédoublonne l’item digest déjà porté par le focus (même pilier)', () => {
  const focus = { pillar: 'sport', label: 'Entraînement', emoji: '🏋️', page: 'athlete', tone: 'reinforce', headline: 'Ton entraînement monte en régime', insight: 'x', action: 'y' };
  const digest = [
    { key: 'sport', emoji: '🏋️', text: '2 séances non faites récemment', page: 'athlete', sev: 'med' },
    { key: 'study', emoji: '📕', text: '1 révision en retard', page: 'calendar', sev: 'med' },
  ];
  const r = L.coachDayPriority({}, '2026-07-20', { focus, digest });
  assert.ok(!r.deduped.some(d => d.key === 'sport'), 'le sport est déjà porté par le focus → retiré du digest');
  assert.ok(r.deduped.some(d => d.key === 'study'), 'les autres piliers restent');
  assert.equal(r.deduped.length, 1);
});

test('coachDayPriority : la santé (forme basse) prime sur un focus sport de momentum + report assumé', () => {
  const focus = { pillar: 'sport', label: 'Entraînement', emoji: '🏋️', page: 'athlete', tone: 'rebuild', headline: 'Ton entraînement s’essouffle', insight: 'x', action: 'Programme une séance.' };
  const digest = [
    { key: 'readiness', emoji: '😴', text: 'Forme basse (42/100) — allège aujourd’hui', page: 'athlete', sev: 'high' },
    { key: 'sport', emoji: '🏋️', text: '1 séance non faite', page: 'athlete', sev: 'med' },
  ];
  const r = L.coachDayPriority({}, '2026-07-20', { focus, digest });
  assert.equal(r.reframed, true, 'tension santé↔momentum reconnue');
  assert.equal(r.primary.source, 'health');
  assert.ok(/récup/i.test(r.primary.headline), 'la n°1 recadre vers la récupération');
  assert.ok(r.defer && r.defer.pillar === 'sport', 'le focus sport est assumé comme reporté (defer)');
  assert.ok(!r.deduped.some(d => d.key === 'readiness'), 'la forme basse est promue en n°1 → plus dans le digest');
  assert.ok(!r.deduped.some(d => d.key === 'sport'), 'la séance manquée aussi retirée (cohérent avec le repos)');
});

test('coachDayPriority : séance DÉJÀ faite + forme basse → pas de recadrage (rien à reporter, #614)', () => {
  // Focus sport reinforce mais la séance du jour est faite (doneToday) : l'action n'incite à rien, elle
  // acquitte. Recadrer en « récupère, tu relanceras dès que la forme remonte » suggérerait de reporter un
  // entraînement déjà fait et effacerait l'acquittement → on garde le focus brut, la forme basse reste en digest.
  const focus = { pillar: 'sport', emoji: '🏋️', page: 'athlete', tone: 'reinforce', doneToday: true, headline: 'Ton entraînement monte en régime', insight: 'x', action: 'Séance déjà faite 💪 — verrouille avec 5 min d’étirements.' };
  const digest = [{ key: 'readiness', emoji: '😴', text: 'Forme basse (40/100) — allège aujourd’hui', page: 'athlete', sev: 'high' }];
  const r = L.coachDayPriority({}, '2026-07-20', { focus, digest });
  assert.equal(r.reframed, false, 'séance faite → aucune tension push↔repos à recadrer');
  assert.equal(r.primary.source, 'focus', 'le focus brut (avec son acquittement) reste la n°1');
  assert.equal(r.defer, null, 'rien à reporter : la séance est faite');
  assert.ok(r.deduped.some(d => d.key === 'readiness'), 'la forme basse reste visible dans « À rattraper »');
});

test('coachDayPriority : pas de focus → la n°1 est l’item réactif le plus grave, retiré du digest', () => {
  const digest = [
    { key: 'exam', emoji: '📚', text: 'Examen dans 3 j', page: 'calendar', sev: 'high' },
    { key: 'habits', emoji: '🔥', text: '1 habitude à relancer', page: 'dashboard', sev: 'med' },
  ];
  const r = L.coachDayPriority({}, '2026-07-20', { focus: null, digest });
  assert.equal(r.primary.source, 'digest');
  assert.equal(r.primary.headline, 'Examen dans 3 j');
  assert.ok(!r.deduped.some(d => d.key === 'exam'), 'l’item promu n’est plus doublé dans « À rattraper »');
  assert.equal(r.deduped.length, 1);
});

test('coachDayPriority : focus alternance (priorité absolue) passe intact, jamais recadré par la forme', () => {
  const focus = { pillar: 'alternance', label: 'Alternance', emoji: '💼', page: 'alternance', tone: 'urgent', headline: 'Postule aujourd’hui pour ton alternance', insight: 'x', action: 'Ajoute une candidature.' };
  const digest = [{ key: 'readiness', emoji: '😴', text: 'Forme basse (40/100) — allège', page: 'athlete', sev: 'high' }];
  const r = L.coachDayPriority({}, '2026-07-20', { focus, digest });
  assert.equal(r.reframed, false, 'l’alternance n’est pas un momentum sport → pas de recadrage santé');
  assert.equal(r.primary.pillar, 'alternance');
  assert.ok(r.deduped.some(d => d.key === 'readiness'), 'la forme basse reste visible dans « À rattraper »');
});

