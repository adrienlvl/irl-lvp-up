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
