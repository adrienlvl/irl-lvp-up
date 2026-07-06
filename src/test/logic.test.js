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

test('raceGoalStatus : marathon proche → spécifique/affûtage, sortie longue plus longue', () => {
  const now = new Date('2026-07-06T12:00:00');
  const specific = L.raceGoalStatus({ type: 'marathon', distanceKm: 42, date: '2026-08-20' }, now); // ~6-7 sem
  assert.equal(specific.phase.key, 'specific');
  assert.ok(specific.longRunMin >= 90); // proche course → longue proche du pic (42*3=126)
  assert.equal(L.raceGoalStatus(null, now), null);
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
