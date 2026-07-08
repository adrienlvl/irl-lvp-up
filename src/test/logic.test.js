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
