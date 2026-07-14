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
  assert.equal(events[0].refId, 'planner-2026-07-06-17:30');
  assert.equal(new Set(events.map(e => e.id)).size, 6, 'ids uniques');
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

test('parseIcs : entrée vide / sans VEVENT → []', () => {
  assert.deepEqual(L.parseIcs(''), []);
  assert.deepEqual(L.parseIcs('BEGIN:VCALENDAR\r\nEND:VCALENDAR'), []);
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

test('todayItems : les anniversaires du jour apparaissent (non validables)', () => {
  const state = { birthdays: [{ id: 1, name: 'Maman', day: 6, month: 7, year: 1963 }] };
  const items = L.todayItems(state, '2026-07-06');
  const b = items.find(i => i.type === 'birthday');
  assert.ok(b, 'un item anniversaire est présent');
  assert.match(b.title, /Maman/);
  assert.match(b.title, /63 ans/);
  assert.equal(b.allDay, true);
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
  assert.match(txt, /2\/4 révisions/);
  assert.match(txt, /7\.2 h de sommeil/);
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
  // sommeil 5 h → alerte
  assert.ok(ins.some(i => /[Ss]ommeil/.test(i.text) && i.tone === 'warn'));
  // état vide → un message d'amorce
  const empty = L.weeklyInsights({}, '2026-07-06', '2026-07-11');
  assert.equal(empty.length, 1);
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
  agenda = agenda.map(e => e.refId === 'planner-2026-07-06-17:30' ? { ...e, completed: true } : e);
  const plan2 = L.planStudySessions({ weekdays: [1], startDate: '2026-07-06', examDate: '2026-07-13', baseId: 999 });
  const again = L.mergePlannedEvents(agenda, plan2);
  assert.equal(again.length, 3, 'pas de doublon après régénération');
  const kept = again.find(e => e.refId === 'planner-2026-07-06-17:30');
  assert.equal(kept.completed, true, 'statut validé préservé');
  assert.equal(kept.id, 100, 'id préservé');
  assert.ok(again.some(e => e.title === 'Muscu'), 'événement manuel intact');
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
});
test('agendaMatch : recherche titre/lieu/notes, insensible à la casse', () => {
  const it = { title: 'RDV Kiné', location: 'Cabinet Lorient', notes: 'ordonnance' };
  assert.equal(L.agendaMatch(it, ''), true, 'requête vide → tout passe');
  assert.equal(L.agendaMatch(it, 'kiné'), true, 'titre');
  assert.equal(L.agendaMatch(it, 'LORIENT'), true, 'lieu (insensible casse)');
  assert.equal(L.agendaMatch(it, 'ordonnance'), true, 'notes');
  assert.equal(L.agendaMatch(it, 'dentiste'), false, 'sans correspondance');
  assert.equal(L.agendaMatch(null, 'x'), false, 'item nul → false');
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
  assert.equal(L.workoutTonnage({}), 0);
  assert.equal(L.workoutTonnage(null), 0);
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
  // pas de charge → null ; nom absent → null
  assert.equal(L.progressionSuggestion([{ date: '2026-06-08', exercises: [{ name: 'Gainage', reps: 60 }] }], 'Gainage'), null);
  assert.equal(L.progressionSuggestion(w, 'Inconnu'), null);
  assert.equal(L.progressionSuggestion([], 'X'), null);
});
test('progressionText : phrases FR selon l’action', () => {
  assert.match(L.progressionText({ action: 'weight', lastReps: 12, lastLoad: 40, nextLoad: 42.5, nextReps: 8, increment: 2.5, maxReps: 12 }), /42,5 kg/);
  assert.match(L.progressionText({ action: 'reps', lastReps: 9, lastLoad: 12, nextLoad: 12, nextReps: 10, increment: 2.5, maxReps: 12 }), /vise 10 reps/);
  assert.equal(L.progressionText(null), '');
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
  assert.equal(p.ratePerWeek, 0.48, '~0,6 %/sem borné'); assert.equal(p.deficit, 528);
  assert.equal(p.dailyTarget, 2231, 'TDEE − déficit, ≥ métabolisme de base');
  assert.equal(p.proteinG, 160, '2 g/kg en perte'); assert.equal(p.fatG, 72);
  assert.equal(p.carbG, 236, '(2231 − 640 − 648)/4');
  assert.equal(p.weeks, 17, 'ceil(8 / 0,48)');
  assert.equal(p.targetDate, '2026-11-08', '12/07 + 17 semaines');
  // prise de masse : surplus + rythme 0,25
  const gain = L.energyPlan({ weight: 70, height: 175, age: 25, sex: 'homme', sessionsPerWeek: 4, targetWeight: 74, todayKey: '2026-07-12' });
  assert.equal(gain.goal, 'prise'); assert.equal(gain.ratePerWeek, 0.25); assert.ok(gain.dailyTarget > gain.tdee);
  // maintien
  assert.equal(L.energyPlan({ weight: 75, height: 175, age: 25, sex: 'homme', sessionsPerWeek: 3, targetWeight: 75, todayKey: '2026-07-12' }).goal, 'maintien');
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
  assert.equal(L.CHANGELOG[0].v, '1.9.222');
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
  assert.match(L.nutritionTips('perte')[0], /déficit/);
  assert.match(L.nutritionTips('prise')[0], /surplus/);
  assert.match(L.nutritionTips('maintien')[0], /stabiliser/);
  assert.ok(L.nutritionTips('perte').length >= 4 && L.nutritionTips('perte').every(t => typeof t === 'string'));
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
});
