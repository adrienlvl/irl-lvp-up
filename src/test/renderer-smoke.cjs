/*
 * renderer-smoke.cjs — vérifie que index.html + app.js se chargent SANS erreur JS
 * dans un vrai renderer Electron (ce qu'un simple "le process tourne encore" ne détecte pas).
 * Sortie : code 0 = OK, code 1 = échec (avec détail).
 * Lancé via `npm run test:smoke`.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Stubs des canaux IPC attendus par preload/app.js (sinon rejets non gérés parasites).
ipcMain.handle('app:version', () => '0.0.0-test');
ipcMain.handle('calendar:fetch', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('calendar:subs:get', () => []);
ipcMain.handle('calendar:subs:save', (_e, l) => l);
ipcMain.handle('notifications:get', () => ({ enabled: false, times: ['09:00', '18:00'], lastSent: {}, leadMinutes: 15, eveningTime: '21:00', eveningEnabled: true }));
ipcMain.handle('notifications:save', (_e, v) => v);
ipcMain.handle('notifications:test', () => true);
ipcMain.handle('backup:save', () => true);
ipcMain.handle('backup:get', () => null);
ipcMain.handle('photos:save', (_e, p) => ({ id: (p && p.id) || 1, file: `${(p && p.id) || 1}.png` }));
ipcMain.handle('photos:read', () => null);
ipcMain.handle('photos:delete', () => true);
ipcMain.handle('travel:config:get', () => ({ home: '', mode: 'driving' }));
ipcMain.handle('travel:config:save', (_e, v) => v);
ipcMain.handle('travel:estimate', () => ({ ok: false, error: 'stub' }));
ipcMain.handle('update:check', () => ({ ok: true }));
ipcMain.handle('update:install', () => true);
ipcMain.handle('data:export', () => ({ ok: false, canceled: true }));
ipcMain.handle('data:import', () => ({ ok: false, canceled: true }));

const errors = [];
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 3 || /uncaught|is not defined|is not a function|\[IRL\]/i.test(message)) {
      errors.push('console: ' + message);
    }
  });
  win.webContents.on('render-process-gone', (_e, d) => errors.push('render-process-gone: ' + d.reason));
  win.webContents.on('did-fail-load', (_e, code, desc) => errors.push('did-fail-load: ' + desc));

  const bail = setTimeout(() => { console.error('SMOKE TIMEOUT (15s)'); app.exit(1); }, 15000);

  try {
    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    await new Promise(r => setTimeout(r, 900)); // laisse app.js finir (onboarding, restore...)
    const checks = await win.webContents.executeJavaScript(`(async function(){
      const checks = {
        logicLoaded: typeof localDate === 'function' && typeof pct === 'function' && typeof computeStreak === 'function' && typeof normalizeAgendaItem === 'function',
        normalize: typeof normalizeState === 'function',
        normalizeHardening: typeof normalizeState === 'function' && (() => {
          const bad = normalizeState({ xp: '-50', streak: 'abc', health: -3, focus: NaN, life: 2.7, timerRuns: '9', goals: { sessions: '0', distance: -5, targetWeight: '999' }, wellnessWeeklyGoal: 99 });
          const okBad = bad.xp === 0 && bad.streak === 0 && bad.health === 0 && bad.focus === 0 && bad.life === 3 && bad.timerRuns === 9
            && bad.goals.sessions >= 1 && bad.goals.sessions <= 14 && bad.goals.distance === 0 && bad.goals.targetWeight === '' && bad.wellnessWeeklyGoal === 14;
          const good = normalizeState({ xp: 500, streak: 12, goals: { sessions: 3, distance: 10.4, targetWeight: 85 }, wellnessWeeklyGoal: 5 });
          const okGood = good.xp === 500 && good.streak === 12 && good.goals.sessions === 3 && good.goals.distance === 10.4 && good.goals.targetWeight === 85 && good.wellnessWeeklyGoal === 5;
          return okBad && okGood;
        })(),
        photosApi: typeof loadGalleryPhotos === 'function' && typeof migratePhotosToDisk === 'function' && !!(window.desktop && window.desktop.savePhoto),
        photoCompare: typeof photoComparePair === 'function' && !!document.getElementById('photoCompare') && (() => { const c = photoComparePair([{ date: '2026-05-01', file: 'a' }, { date: '2026-07-10', file: 'b' }], [{ date: '2026-05-02', value: 84 }, { date: '2026-07-09', value: 79 }]); return c && c.before.date === '2026-05-01' && c.after.date === '2026-07-10' && c.weightDelta === -5 && photoComparePair([{ date: '2026-05-01' }]) === null; })(),
        studyPlanner: !!document.getElementById('studyPlanForm') && typeof planStudySessions === 'function' && typeof buildIcs === 'function',
        examCountdown: typeof examCountdown === 'function' && typeof renderExamCountdown === 'function' && !!document.getElementById('examCountdown') && examCountdown({ title: 'BTS', date: '2099-01-11' }, '2099-01-01').daysLeft === 10,
        studyProgress: typeof studyStats === 'function' && !!document.getElementById('studyProgress') && (s => s.total === 2 && s.done === 1 && s.upcoming === 1)(studyStats([{ kind: 'study', date: '2026-07-05', completed: true }, { kind: 'study', date: '2099-07-12', completed: false }], '2026-07-10')),
        studyPacing: typeof studyPacing === 'function' && !!document.getElementById('studyPacing') && (() => { const exam = { date: '2026-08-10' }; const agenda = [{ kind: 'study', date: '2026-07-06', completed: true }, { kind: 'study', date: '2026-07-16', completed: false }, { kind: 'study', date: '2026-07-20', completed: false }, { kind: 'study', date: '2026-07-25', completed: false }]; const p = studyPacing(agenda, exam, '2026-07-13'); return p.remaining === 3 && p.daysLeft === 28 && p.perWeek === 1 && p.status === 'ahead' && studyPacing([], exam, '2026-07-13') === null && studyPacing(agenda, null, '2026-07-13') === null; })(),
        overdueStudy: typeof overdueStudy === 'function' && !!document.getElementById('overdueStudy') && (() => { const r = overdueStudy([{ kind: 'study', date: '2026-07-13', title: 'Compta', completed: false }, { kind: 'study', date: '2026-07-12', title: 'Faite', completed: true }, { kind: 'study', date: '2026-07-20', title: 'Future', completed: false }], '2026-07-15'); return r.length === 1 && r[0].title === 'Compta' && r[0].daysLate === 2 && overdueStudy(null, '2026-07-15').length === 0; })(),
        attentionDigest: typeof attentionDigest === 'function' && !!document.getElementById('attentionDigest') && !!document.getElementById('attentionPanel') && (() => {
          const st = { recovery: [], workouts: [], habits: [], examGoal: { title: 'BTS', date: '2026-07-22' }, agenda: [{ kind: 'study', title: 'Droit', date: '2026-07-10', completed: false }] };
          const d = attentionDigest(st, '2026-07-15');
          const keys = d.map(i => i.key);
          // anniversaire imminent (relatif à aujourd'hui) → item 'birthday' vers l'agenda
          const today = (typeof localDate === 'function') ? localDate() : '2026-07-15';
          const dm = (() => { const x = new Date(today + 'T12:00:00'); x.setDate(x.getDate() + 1); return { day: x.getDate(), month: x.getMonth() + 1 }; })();
          const bd = attentionDigest({ recovery: [], agenda: [], workouts: [], habits: [], birthdays: [{ id: 1, name: 'Léa', day: dm.day, month: dm.month }] }, today);
          return keys.includes('exam') && keys.includes('study') && keys.indexOf('exam') < keys.indexOf('study')
            && d.every(i => i.emoji && i.text && i.page && i.sev)
            && bd.some(i => i.key === 'birthday' && i.page === 'agenda' && /Léa/.test(i.text))
            && attentionDigest({ recovery: [], agenda: [], workouts: [], habits: [] }, '2026-07-15').length === 0;
        })(),
        digestBackup: typeof attentionDigest === 'function' && ('lastBackup' in state) && (() => {
          const today = (typeof localDate === 'function') ? localDate() : '2026-07-15';
          const withData = { recovery: [], agenda: [], workouts: [], habits: [{ id: 1, name: 'X', log: [] }], birthdays: [] };
          const never = attentionDigest({ ...withData, lastBackup: '' }, today);
          const recent = attentionDigest({ ...withData, lastBackup: today }, today);
          return never.some(i => i.key === 'backup' && i.page === 'settings') && !recent.some(i => i.key === 'backup');
        })(),
        focusBreak: typeof breakSuggestion === 'function' && !!document.getElementById('focusBreakSuggest') && (() => {
          const short = breakSuggestion(25, 1);
          const long = breakSuggestion(50, 4);
          return short && short.breakMin === 5 && short.long === false
            && long && long.long === true && long.breakMin >= 15
            && breakSuggestion(0, 1) === null;
        })(),
        weightStepperFit: !!document.getElementById('coachTarget') && typeof showPage === 'function' && (() => {
          showPage('poids');
          const el = document.getElementById('coachTarget');
          // Une cible à 3 chiffres + décimale (« 100.5 ») doit tenir SANS rognage horizontal.
          el.value = '100.5';
          const fits = el.clientWidth > 0 && el.scrollWidth <= el.clientWidth + 2;
          // Flèches natives du spinner retirées.
          const ap = (getComputedStyle(el).appearance || getComputedStyle(el).webkitAppearance || '').toLowerCase();
          el.value = '';
          showPage('dashboard');
          return fits && ap === 'textfield';
        })(),
        tomorrowPreview: typeof tomorrowPreview === 'function' && !!document.getElementById('myDayTomorrow') && (() => {
          const p = tomorrowPreview({ agenda: [
            { id: 1, title: 'Sport', date: '2026-07-16', time: '09:00', kind: 'sport' },
            { id: 2, title: 'Réunion', date: '2026-07-16', time: '14:00', kind: 'life' }
          ] }, '2026-07-15');
          return p && p.dateKey === '2026-07-16' && p.total === 2 && p.first && p.first.time === '09:00'
            && tomorrowPreview({ agenda: [] }, '2026-07-15') === null;
        })(),
        studySubjects: typeof studyBySubject === 'function' && !!document.getElementById('studySubjects') && (() => {
          const r = studyBySubject([
            { kind: 'study', title: 'Compta', date: '2026-07-10', completed: true },
            { kind: 'study', title: 'Droit', date: '2026-07-08', completed: false },
            { kind: 'study', title: 'Droit', date: '2026-07-20', completed: false },
          ], '2026-07-15');
          return r.length === 2 && r[0].subject === 'Droit' && r[0].overdue === 1 && r[0].upcoming === 1 && r[1].subject === 'Compta' && r[1].doneRate === 100;
        })(),
        examReminder: typeof examReminderDue === 'function' && /demain/.test(examReminderDue({ title: 'BTS', date: '2026-05-15' }, '2026-05-14')) && examReminderDue({ date: '' }, '2026-05-14') === null,
        myDay: !!document.getElementById('myDayList') && typeof todayItems === 'function' && !!(document.getElementById('myDaySummary') || {}).textContent,
        dailyGreeting: typeof dailyGreeting === 'function' && !!document.getElementById('dailyMessage') && (() => {
          const g = dailyGreeting({ name: 'Adrien', hour: 20 });
          return g.hello === 'Bonsoir Adrien' && g.nudge.length > 3 && dailyGreeting({ hour: 8 }).hello === 'Bonjour' && /👋/.test(document.getElementById('dailyMessage').textContent);
        })(),
        charts: !!document.getElementById('chartGrid') && typeof weeklyAggregate === 'function' && typeof renderCharts === 'function',
        weekView: !!document.getElementById('weekGrid') && typeof weekItems === 'function' && typeof renderWeekPage === 'function' && !!document.getElementById('openWeekPage'),
        monthDayJump: typeof renderMonthCalendar === 'function' && (() => { renderMonthCalendar(); return document.querySelectorAll('#monthCalendar .month-day[data-cal-day]').length >= 28; })(),
        keyDateMarkers: typeof keyDateMarkers === 'function' && keyDateMarkers({ title: 'BTS', date: '2026-05-15' }, { date: '2026-06-01' }, '2026-05-15')[0].kind === 'exam' && keyDateMarkers(null, null, '2026-05-15').length === 0,
        upcomingDeadlines: typeof upcomingKeyDates === 'function' && !!document.getElementById('upcomingDeadlines') && (r => r.length === 2 && r[0].kind === 'race')(upcomingKeyDates({ date: '2026-07-25' }, { date: '2026-07-15' }, '2026-07-10', 60)),
        priorityDeadlines: typeof upcomingPriorityItems === 'function' && (() => { const r = upcomingPriorityItems([{ kind: 'study', priority: 'high', date: '2026-07-20', title: 'Rendu', completed: false }, { kind: 'life', priority: 'high', date: '2026-07-13', title: 'Contrôle', completed: false }, { kind: 'sport', priority: 'normal', date: '2026-07-12', title: 'X', completed: false }], '2026-07-10', 30, 3); return r.length === 2 && r[0].title === 'Contrôle' && r[0].daysLeft === 3; })(),
        printReport: !!document.getElementById('printReport') && typeof weeklySummary === 'function' && typeof renderPrintReport === 'function' && !!document.getElementById('printWeekReport'),
        weeklyText: typeof weeklySummaryText === 'function' && !!document.getElementById('copyWeeklySummary') && /3 séances/.test(weeklySummaryText({ sessions: 3, minutes: 150 })) && /2 candidatures/.test(weeklySummaryText({ sessions: 1, minutes: 10, apps: 2 })),
        weeklyShare: typeof shareableWeek === 'function' && !!document.getElementById('shareWeeklySummary') && (() => { const s = shareableWeek({ mondayKey: '2026-07-06', sessions: 3, minutes: 150 }); return s && /bilan de la semaine/i.test(s.title) && s.text === weeklySummaryText({ mondayKey: '2026-07-06', sessions: 3, minutes: 150 }); })(),
        monthlyRecap: typeof monthlyRecap === 'function' && typeof monthLabelFr === 'function' && !!document.getElementById('monthlyRecap') && !!document.getElementById('copyMonthlyRecap') && (() => { const r = monthlyRecap({ workouts: [{ date: '2026-07-03', type: 'run', duration: 40, distance: 8 }], focusSessions: [{ date: '2026-07-05', minutes: 25 }] }, '2026-07'); return r && r.sessions === 1 && r.km === 8 && r.activeDays === 2 && monthLabelFr('2026-07') === 'juillet 2026' && monthlyRecap({}, '2020-01') === null; })(),
        monthlyShare: typeof shareableMonth === 'function' && !!document.getElementById('shareMonthlyRecap') && (() => { const r = { monthKey: '2026-07', sessions: 3, minutes: 150, activeDays: 4 }; const s = shareableMonth(r); return s && /Mon bilan de juillet 2026/.test(s.title) && s.text === monthlyRecapText(r) && shareableMonth(null) === null; })(),
        weeklyInsights: typeof weeklyInsights === 'function' && !!document.getElementById('weeklyInsights') && (() => { const ins = weeklyInsights({ workouts: [{ date: '2026-07-06', type: 'strength', duration: 50, effort: 3 }], goals: { sessions: 4 } }, '2026-07-06', '2026-07-11'); return Array.isArray(ins) && ins.length >= 1 && ins.every(i => i.emoji && i.text && i.tone); })(),
        theme: !!document.getElementById('themeToggle') && (getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim().length > 0),
        themeAuto: typeof nextThemeMode === 'function' && typeof resolveTheme === 'function' && nextThemeMode('auto') === 'light' && resolveTheme('auto', true) === 'dark' && typeof applyTheme === 'function' && typeof currentThemeMode === 'function',
        themeTime: typeof nextThemeMode === 'function' && nextThemeMode('dark') === 'time' && nextThemeMode('time') === 'auto' && resolveTheme('time', false, 14) === 'light' && resolveTheme('time', false, 22) === 'dark' && resolveTheme('time', true) === 'dark',
        raceGoal: !!document.getElementById('raceGoalType') && typeof raceGoalStatus === 'function' && typeof renderRaceGoal === 'function',
        nextSession: typeof nextTrainingSession === 'function' && !!document.getElementById('nextSessionLine') && (nextTrainingSession([{ id: 1, date: '2999-01-02', time: '10:00', type: 'X' }], '2999-01-01', 0) || {}).daysLeft === 1,
        nextStudy: typeof nextStudySession === 'function' && !!document.getElementById('nextStudyLine') && (() => {
          const r = nextStudySession([{ id: 2, kind: 'study', title: 'Compta', date: '2999-01-03', time: '17:30' }, { id: 3, kind: 'study', title: 'Droit', date: '2999-01-02', time: '18:00' }, { id: 4, kind: 'study', title: 'Faite', date: '2999-01-01', completed: true }], '2999-01-01', 0);
          return r && r.title === 'Droit' && r.daysLeft === 1 && nextStudySession([{ id: 5, kind: 'sport', date: '2999-01-02' }], '2999-01-01', 0) === null;
        })(),
        weekStreak: typeof weeklyWorkoutStreak === 'function' && !!document.getElementById('weekStreakBadge') && weeklyWorkoutStreak([{ date: '2026-07-08' }, { date: '2026-07-01' }], '2026-07-10') === 2,
        completeDaysStreak: typeof completeDaysStreak === 'function' && !!document.getElementById('missionStreak') && (() => { const days = [{ date: '2026-07-10', count: 5 }, { date: '2026-07-09', count: 4 }, { date: '2026-07-08', count: 6 }, { date: '2026-07-07', count: 2 }]; return completeDaysStreak(days, 4, '2026-07-10') === 3 && completeDaysStreak(days, 6, '2026-07-10') === 0 && completeDaysStreak([], 4, '2026-07-10') === 0; })(),
        heatmap: typeof trainingHeatmap === 'function' && !!document.getElementById('trainingHeatmap') && trainingHeatmap([], '2026-07-10', 8).length === 56 && trainingHeatmap([{ date: '2026-07-08' }], '2026-07-10', 1)[2].count === 1,
        loadAdvice: typeof loadAdvice === 'function' && !!document.getElementById('loadAdvice') && loadAdvice({ zone: 'high' }, { score: 90 }).status === 'deload' && loadAdvice({ zone: 'optimal' }, { score: 80 }).status === 'push' && loadAdvice(null, null).status === 'maintain',
        missedSessions: typeof missedSessions === 'function' && !!document.getElementById('missedSessions') && (() => { const m = missedSessions([{ kind: 'sport', date: '2026-07-13', title: 'S', completed: false }, { kind: 'sport', date: '2026-07-12', title: 'S2', completed: true }], [], '2026-07-15', { days: 14 }); return m.length === 1 && m[0].date === '2026-07-13' && missedSessions([], [], 'x').length === 0; })(),
        acwr:typeof acuteChronicRatio === 'function' && (r => r && r.ratio === 1 && r.zone === 'optimal')(acuteChronicRatio([{ date: '2026-07-08', duration: 60, effort: 2 }, { date: '2026-06-30', duration: 60, effort: 2 }, { date: '2026-06-23', duration: 60, effort: 2 }, { date: '2026-06-17', duration: 60, effort: 2 }], '2026-07-10')),
        focusStreak: typeof dailyStreak === 'function' && dailyStreak(['2026-07-10', '2026-07-09', '2026-07-08'], '2026-07-10') === 3,
        recentWins: typeof recentWins === 'function' && !!document.getElementById('recentWins') && (() => { const r = recentWins([{ date: '2026-07-08', win: 'A' }, { date: '2026-07-09', win: 'B' }, { date: '2026-07-10', win: 'Aujourdhui' }, { date: '2026-07-07', win: '  ' }], '2026-07-10'); return r.length === 2 && r[0].win === 'B' && r[0].daysAgo === 1 && recentWins(null, '2026-07-10').length === 0; })(),
        lifeStep: typeof logLifeStep === 'function' && typeof lifeStepStats === 'function' && !!document.getElementById('lifeStepStats') && (() => { let lg = []; lg = logLifeStep(lg, { date: '2026-07-08', text: 'Appeler', done: true }); lg = logLifeStep(lg, { date: '2026-07-09', text: 'Ranger', done: true }); lg = logLifeStep(lg, { date: '2026-07-10', text: '', done: false }); const s = lifeStepStats(lg, '2026-07-10', { date: '2026-07-10', text: 'Trier', done: true }); const p = lifeStepStats(lg, '2026-07-10', { date: '2026-07-10', text: 'Trier', done: false }); const dup = lifeStepStats([{ date: '2026-07-08', text: 'Ranger', done: true }, { date: '2026-07-08', text: 'Ranger', done: false }, { date: '2026-07-09', text: 'Trier', done: true }], '2026-07-10', null); return lg.length === 2 && s.streak === 3 && s.doneDays === 3 && s.lastDone.daysAgo === 0 && p.streak === 2 && dup.loggedDays === 2 && dup.doneDays === 1 && lifeStepStats([], '2026-07-10', null).loggedDays === 0; })(),
        questStreak: typeof logQuestDay === 'function' && typeof questPerfectStreak === 'function' && !!document.getElementById('questStreak') && (() => { let lg = []; lg = logQuestDay(lg, '2026-07-08', 3, 3); lg = logQuestDay(lg, '2026-07-09', 3, 3); const s = questPerfectStreak(lg, '2026-07-10', 4, 4); const p = questPerfectStreak(lg, '2026-07-10', 1, 4); const dup = questPerfectStreak([{ date: '2026-07-08', done: 3, total: 3 }, { date: '2026-07-08', done: 1, total: 3 }, { date: '2026-07-06', done: 4, total: 4 }], '2026-07-10', 0, 0); return lg.length === 2 && s.streak === 3 && s.perfectDays === 3 && p.streak === 2 && dup.loggedDays === 2 && dup.perfectDays === 1 && questPerfectStreak([], '2026-07-10', 0, 0).streak === 0; })(),
        questPerfectCelebrate: typeof celebrateQuestsIfPerfect === 'function' && typeof showFlashToast === 'function' && (() => {
          const savedQ = state.quests;
          state.quests = [{ id: 1, done: true }, { id: 2, done: true }];
          const r1 = celebrateQuestsIfPerfect();
          const t = document.getElementById('undoToast');
          const shown = !!t && t.classList.contains('show') && /parfaite/i.test(t.textContent) && !t.querySelector('.ut-undo');
          state.quests = [{ id: 1, done: true }, { id: 2, done: false }];
          const r2 = celebrateQuestsIfPerfect();
          state.quests = savedQ;
          return r1 === true && shown && r2 === false;
        })(),
        intentionFollow: typeof intentionFollowThrough === 'function' && !!document.getElementById('intentionFollow') && (() => { const rit = [{ date: '2026-07-09', intention: 'A' }, { date: '2026-07-08', intention: 'B' }, { date: '2026-07-07', intention: 'C' }, { date: '2026-07-10', intention: 'Aujourdhui' }]; const refl = [{ date: '2026-07-09', win: 'W1' }, { date: '2026-07-08', win: 'W2' }]; const r = intentionFollowThrough(rit, refl, '2026-07-10'); return r && r.total === 3 && r.kept === 2 && r.rate === 67 && r.pairs[0].kept === true && r.pairs[2].kept === false && intentionFollowThrough([], refl, '2026-07-10') === null; })(),
        focusOutcomes: typeof recentFocusOutcomes === 'function' && !!document.getElementById('focusOutcomes') && (() => { const rv = [{ id: 1, date: '2026-07-08', outcome: 'A' }, { id: 2, date: '2026-07-10', outcome: 'B' }, { id: 3, date: '2026-07-10', outcome: 'C' }, { id: 4, date: '2026-07-09', outcome: '  ' }]; const r = recentFocusOutcomes(rv, '2026-07-10'); return r.length === 3 && r[0].outcome === 'C' && r[0].daysAgo === 0 && r[2].outcome === 'A' && recentFocusOutcomes(null, '2026-07-10').length === 0; })(),
        recentLessons: typeof recentLessons === 'function' && !!document.getElementById('recentLessons') && (() => { const refl = [{ date: '2026-07-08', win: 'V', lesson: 'L1' }, { date: '2026-07-09', lesson: 'L2' }, { date: '2026-07-07', win: 'Sans lecon' }]; const r = recentLessons(refl, '2026-07-10'); return r.length === 2 && r[0].lesson === 'L2' && r[0].daysAgo === 1 && recentWins(refl, '2026-07-10').length === 2 && recentLessons(null, '2026-07-10').length === 0; })(),
        focusWeekGoal: typeof focusWeekGoal === 'function' && !!document.getElementById('focusWeekGoal') && (() => { const g = focusWeekGoal([{ date: '2026-07-13', minutes: 25 }, { date: '2026-07-14', minutes: 50 }], '2026-07-15', 120); return g && g.done === 75 && g.target === 120 && g.remaining === 45 && g.status === 'onTrack' && focusWeekGoal([], 'x', 120) === null; })(),
        focusByTask: typeof focusByTask === 'function' && !!document.getElementById('focusByTask') && (() => {
          const r = focusByTask([
            { date: '2026-07-15', minutes: 50, task: 'Compta' },
            { date: '2026-07-13', minutes: 40, task: 'Projet' },
            { date: '2026-07-12', minutes: 30, task: 'Compta' },
          ], '2026-07-15', { days: 7 });
          return r.total === 120 && r.tasks.length === 2 && r.tasks[0].task === 'Compta' && r.tasks[0].minutes === 80 && r.tasks[0].pct === 67 && focusByTask([], 'nope').total === 0;
        })(),
        focusHeatmap: !!document.getElementById('focusHeatmap') && document.querySelectorAll('#focusHeatmap .hm-cell').length === 56,
        supplements: !!document.getElementById('suppHeat') && typeof hydrationPlan === 'function' && !!(document.getElementById('suppProteinTarget') || {}).textContent,
        nutritionPlus: typeof supplementTiming === 'function' && typeof searchFoods === 'function' && !!document.getElementById('foodResults') && (document.querySelectorAll('#suppTimingGrid .supp-phase').length >= 3),
        foodLogProt: typeof bumpProtein === 'function' && typeof searchFoods === 'function' && searchFoods('', 12).some(x => x.p > 0),
        hydration: typeof waterStatus === 'function' && !!document.getElementById('waterPlus') && !!document.getElementById('waterMinus') && !!document.getElementById('hydraFill') && !!document.getElementById('proteinFill') && typeof proteinTarget === 'function',
        hydrationPace: typeof hydrationPace === 'function' && !!document.getElementById('hydraPace') && (() => {
          const mid = hydrationPace(4, 8, 15), late = hydrationPace(1, 8, 15), done = hydrationPace(8, 8, 12);
          return mid && mid.expected === 4 && mid.status === 'ontrack'
            && late && late.status === 'behind' && done && done.status === 'done'
            && hydrationPace(2, 8, 23) === null;
        })(),
        proteinQuick: !!document.getElementById('proteinPlus20') && !!document.getElementById('proteinPlus30') && !!document.getElementById('proteinMinus'),
        proteinSnack: typeof proteinSnackSuggestion === 'function' && !!document.getElementById('proteinSnack') && (() => { const r = proteinSnackSuggestion(120, 150); return r.gap === 30 && r.snackProtein === 30 && proteinSnackSuggestion(148, 150) === null && proteinSnackSuggestion(50, 0) === null; })(),
        waterGoalAdaptive: typeof waterGoalFor === 'function' && waterGoalFor(8, true) === 10 && waterGoalFor(8, false) === 8,
        proteinWeek: typeof proteinDaysOnTarget === 'function' && proteinDaysOnTarget([{ date: '2026-07-06', protein: 160 }, { date: '2026-07-09', protein: 130 }], 130, '2026-07-06', '2026-07-10') === 2,
        proteinStreak: typeof proteinStreak === 'function' && !!document.getElementById('proteinStreak') && (() => {
          const r = proteinStreak([{ date: '2026-07-13', protein: 130 }, { date: '2026-07-14', protein: 140 }, { date: '2026-07-15', protein: 125 }], 120, '2026-07-15');
          const ph = proteinStreak([{ date: '2026-04-31', protein: 200 }, { date: '2026-05-02', protein: 200 }], 120, '2026-05-02');
          return r.current === 3 && r.best === 3 && proteinStreak([], 120, '2026-07-15').current === 0 && proteinStreak([{ date: '2026-07-15', protein: 130 }], 0, '2026-07-15').best === 0 && ph.current === 1 && ph.best === 1;
        })(),
        waterWeek: typeof daysHittingTarget === 'function' && daysHittingTarget([{ date: '2026-07-06', water: 8 }, { date: '2026-07-07', water: 5 }], 'water', 8, '2026-07-06', '2026-07-10') === 1,
        proteinTargetUnified: typeof proteinTarget === 'function' && (() => { const t = proteinTarget(state.profile.weight, state.profile.goal).gramsPerDay; const s = (document.getElementById('nutritionStatus') || {}).textContent || ''; return t === 145 && (s.includes(String(t)) || /\d/.test(s)); })(),
        sleepDebt: typeof sleepDebtHours === 'function' && (r => r.debt === 3.5 && r.nights === 3)(sleepDebtHours([{ date: '2026-07-06', sleep: 6 }, { date: '2026-07-07', sleep: 8 }, { date: '2026-07-08', sleep: 5.5 }], 7.5, '2026-07-06', '2026-07-10')) && (r => r.nights === 1 && r.debt === 1.5)(sleepDebtHours([{ date: '2026-07-06', sleep: 6 }, { date: '2026-07-06', sleep: 0, bedtime: '23:00' }], 7.5, '2026-07-06', '2026-07-10')),
        weeklySleep: typeof weeklySleepStats === 'function' && !!document.getElementById('weeklySleep') && (() => { const r = weeklySleepStats([{ date: '2026-07-06', sleep: 6 }, { date: '2026-07-07', sleep: 8 }, { date: '2026-07-08', sleep: 5.5 }], '2026-07-06', '2026-07-10'); return r.nights === 3 && r.avg === 6.5 && r.min === 5.5 && r.status === 'court' && weeklySleepStats([], '2026-07-06', '2026-07-10') === null; })(),
        sleepSpark: typeof sleepSeries === 'function' && typeof sparkLineSvg === 'function' && !!document.getElementById('sleepSpark') && (() => {
          const s = sleepSeries([{ date: '2026-07-06', sleep: 6 }, { date: '2026-07-07', sleep: 8 }, { date: '2026-07-08', sleep: 5.5 }], 10);
          return s.length === 3 && s[0].value === 6 && s[2].value === 5.5
            && /<path/.test(sparkLineSvg(s.map(p => ({ label: p.date, value: p.value })))) && sleepSeries([], 10).length === 0;
        })(),
        sleepCoach: typeof sleepCoachInsight === 'function' && typeof sleepRegularity === 'function' && typeof bedtimeRegularity === 'function' && !!document.getElementById('sleepCoach') && (() => {
          const jagged = [
            { date: '2026-07-04', sleep: 5 }, { date: '2026-07-05', sleep: 8 }, { date: '2026-07-06', sleep: 5 },
            { date: '2026-07-07', sleep: 8 }, { date: '2026-07-08', sleep: 5 }, { date: '2026-07-09', sleep: 8 }, { date: '2026-07-10', sleep: 5 },
          ];
          const r = sleepCoachInsight(jagged, '2026-07-10');
          if (!r || r.tone !== 'urgent' || r.irregular !== true || r.stdev !== 1.5 || sleepCoachInsight([], '2026-07-10') !== null) return false;
          // Durée stable (7 h chaque nuit) mais coucher qui alterne 22h/1h : la durée seule ne verrait rien,
          // le coucher doit démasquer l'irrégularité (régression du bilan sommeil, étape 2/2 de la demande).
          const stableDurationJaggedBedtime = [
            { date: '2026-07-04', sleep: 7, bedtime: '22:00' }, { date: '2026-07-05', sleep: 7, bedtime: '01:00' },
            { date: '2026-07-06', sleep: 7, bedtime: '22:00' }, { date: '2026-07-07', sleep: 7, bedtime: '01:00' },
            { date: '2026-07-08', sleep: 7, bedtime: '22:00' }, { date: '2026-07-09', sleep: 7, bedtime: '01:00' },
            { date: '2026-07-10', sleep: 7, bedtime: '22:00' },
          ];
          const rb = sleepCoachInsight(stableDurationJaggedBedtime, '2026-07-10');
          return !!rb && rb.irregular === true && rb.bedtimeStdevMin != null && rb.tone === 'attention' && /coucher irrégulier/.test(rb.verdict);
        })(),
        sleepImpact: typeof sleepImpactReport === 'function' && typeof renderWeeklySleep === 'function' && !!document.getElementById('sleepImpact') && (() => {
          const pad = n => (n < 10 ? '0' + n : '' + n);
          const iso = off => { const d = new Date(localDate() + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
          const rec = [], mr = [];
          for (let i = 0; i < 5; i++) { rec.push({ date: iso(i * 2), sleep: 7, bedtime: '22:30' }); mr.push({ date: iso(i * 2), energy: 4 }); }
          for (let i = 0; i < 5; i++) { rec.push({ date: iso(i * 2 + 1), sleep: 6, bedtime: '01:00' }); mr.push({ date: iso(i * 2 + 1), energy: 2 }); }
          const r = sleepImpactReport({ recovery: rec, morningRituals: mr }, localDate());
          if (!(r && r.deltas.energy === 2 && r.confidence === 'good')) return false;
          const saved = { r: state.recovery, m: state.morningRituals };
          state.recovery = rec; state.morningRituals = mr; renderWeeklySleep();
          const el = document.getElementById('sleepImpact');
          const ok = !el.hidden && /coucher/i.test(el.textContent);
          state.recovery = saved.r; state.morningRituals = saved.m; renderWeeklySleep();
          return ok;
        })(),
        sleepBedtimeRegularity: typeof bedtimeRegularity === 'function' && typeof sleepCoachInsight === 'function' && !!document.getElementById('sleepCoach') && (() => {
          // Coucher fixe chaque soir malgré une durée qui alterne 5 h/8 h : le vrai souci n'est QUE
          // la durée courte, pas un rythme décousu — la régularité du coucher doit primer sur celle
          // de la durée dès que 3 nuits de coucher sont saisies (sinon repli sur la durée, testé plus haut).
          const stableBedtimeJaggedSleep = [
            { date: '2026-07-04', sleep: 5, bedtime: '23:00' }, { date: '2026-07-05', sleep: 8, bedtime: '23:00' }, { date: '2026-07-06', sleep: 5, bedtime: '23:00' },
            { date: '2026-07-07', sleep: 8, bedtime: '23:00' }, { date: '2026-07-08', sleep: 5, bedtime: '23:00' }, { date: '2026-07-09', sleep: 8, bedtime: '23:00' }, { date: '2026-07-10', sleep: 5, bedtime: '23:00' },
          ];
          const r1 = sleepCoachInsight(stableBedtimeJaggedSleep, '2026-07-10');
          if (!r1 || r1.bedtimeStdevMin !== 0 || r1.irregular !== false || r1.tone !== 'attention') return false;
          const br = bedtimeRegularity(stableBedtimeJaggedSleep, 14);
          return br && br.nights === 7 && br.stdevMin === 0 && bedtimeRegularity([], 14) === null;
        })(),
        sleepBedtime: typeof bedtimeAnchor === 'function' && typeof recentBedtimeAnchor === 'function' && !!document.getElementById('bedtimeInput') && (() => {
          if (bedtimeAnchor('06:00') <= bedtimeAnchor('23:00')) return false;
          if (bedtimeFromAnchor(bedtimeAnchor('23:30')) !== '23:30') return false;
          const rec = recentBedtimeAnchor([{ date: '2026-07-08', sleep: 6, bedtime: '05:00' }, { date: '2026-07-10', sleep: 6, bedtime: '05:30' }], '2026-07-10', 5);
          return rec && rec.nights === 2 && recentBedtimeAnchor([], '2026-07-10', 5) === null;
        })(),
        sleepReschedule: typeof sleepPlanDay === 'function' && typeof startSleepPlan === 'function' && typeof normalizeSleepPlan === 'function' && !!document.getElementById('sleepPlan') && (() => {
          const plan = { active: true, targetTime: '23:30', startTime: '06:00', startKey: '2026-07-16', stepMin: 25, stepDays: 1 };
          const behind = [{ date: '2026-07-18', sleep: 6, bedtime: '05:30' }, { date: '2026-07-19', sleep: 6, bedtime: '05:30' }, { date: '2026-07-20', sleep: 6, bedtime: '05:30' }];
          const d = sleepPlanDay(plan, behind, '2026-07-20');
          if (!d || d.targetTime !== '05:05' || d.status !== 'behind' || d.adapted !== true) return false;
          if (sleepPlanDay({ active: false }, [], '2026-07-16') !== null) return false;
          return startSleepPlan([], '23:30', '2026-07-16', {}) === null;
        })(),
        sleepRpg: typeof sleepEveningTips === 'function' && typeof sleepPlanAdherence === 'function' && typeof sleepBedtimeReward === 'function' && (() => {
          const tips = sleepEveningTips('23:30');
          if (tips.length !== 5 || sleepEveningTips('nope').length !== 0) return false;
          const plan = { active: true, targetTime: '23:30', startTime: '06:00', startKey: '2026-07-16', stepMin: 25, stepDays: 1, lastReward: '' };
          const rec = [{ date: '2026-07-16', sleep: 6, bedtime: '06:00' }, { date: '2026-07-17', sleep: 6, bedtime: '05:30' }, { date: '2026-07-18', sleep: 6, bedtime: '05:40' }];
          const a = sleepPlanAdherence(plan, rec, '2026-07-18', 7);
          if (!a || a.nights !== 3 || a.streak !== 3) return false;
          const rw = sleepBedtimeReward(plan, rec, '2026-07-18', '05:00');
          return rw && rw.xp === 15 && sleepBedtimeReward(plan, rec, '2026-07-18', '07:00') === null;
        })(),
        readiness: typeof readinessScore === 'function' && !!document.getElementById('recoveryScore') && readinessScore({ sleep: 8, fatigue: 1, soreness: 1 }).score === 100 && readinessScore(null) === null && readinessScore({ fatigue: 3, soreness: 3 }).score === 50 && readinessScore({ sleep: 8, fatigue: 3, soreness: 3 }).score === 70,
        readinessTrend: typeof readinessTrend === 'function' && !!document.getElementById('readinessTrend') && (() => { const rt = readinessTrend([{ date: '2026-07-06', sleep: 5, fatigue: 4, soreness: 4 }, { date: '2026-07-10', sleep: 8, fatigue: 1, soreness: 1 }], 8); if (!(rt && rt.points.length === 2 && rt.delta === 60 && rt.direction === 'up' && readinessTrend([], 8) === null)) return false; const dup = readinessTrend([{ date: '2026-07-06', sleep: 5, fatigue: 4, soreness: 4 }, { date: '2026-07-06', sleep: 8, fatigue: 1, soreness: 1 }, { date: '2026-07-10', sleep: 8, fatigue: 1, soreness: 1 }], 8); return dup && dup.points.length === 2 && dup.delta === 0 && dup.latest === 100; })(),
        morningEnergy: typeof morningEnergyTrend === 'function' && !!document.getElementById('morningEnergyTrend') && (() => { const t = morningEnergyTrend([{ date: '2026-07-14', energy: 2 }, { date: '2026-07-12', energy: 3 }, { date: '2026-07-09', energy: 3 }, { date: '2026-07-05', energy: 4 }, { date: '2026-07-02', energy: 4 }], '2026-07-14', 7); return t && t.count === 3 && t.avg === 2.7 && t.prevAvg === 4 && t.dir === 'down' && t.level === 'low' && morningEnergyTrend([], '2026-07-14', 7) === null; })(),
        morningStreak: typeof morningStreak === 'function' && !!document.getElementById('morningStreak') && (() => {
          const r = [{ date: '2026-07-12' }, { date: '2026-07-13' }, { date: '2026-07-14' }];
          return morningStreak(r, '2026-07-14') === 3 && morningStreak(r, '2026-07-15') === 3 && morningStreak(r, '2026-07-16') === 0 && morningStreak([], '2026-07-14') === 0;
        })(),
        records: typeof personalRecords === 'function' && !!document.getElementById('exerciseDetailNotes'),
        newRecordToast: typeof newRecords === 'function' && typeof flashToast === 'function' && newRecords({ T: { load: 0, reps: 8 } }, { T: { load: 0, reps: 10 } }).length === 1,
        strengthRecords: typeof strengthRecords === 'function' && typeof nextStrengthMilestone === 'function' && !!document.getElementById('strengthRecords') && (() => { const r = strengthRecords([{ date: '2026-06-08', exercises: [{ name: 'DC', load: 45, reps: 5 }, { name: 'Sq', load: 60, reps: 10 }] }]); const nm = nextStrengthMilestone(133.5, 10); const leg = strengthRecords([{ date: '2025-03-01', exercise: 'Tractions', load: 30, reps: 6 }]); return r.length === 2 && r[0].name === 'Sq' && r[0].e1rm === 80 && strengthRecords([]).length === 0 && nm.milestone === 140 && nm.gap === 6.5 && leg.length === 1 && leg[0].load === 30; })(),
        exerciseHistory: typeof exerciseHistoryStats === 'function' && (() => { const h = exerciseHistoryStats([{ date: '2026-06-01', exercises: [{ name: 'DC', load: 40, reps: 8, sets: 3 }] }, { date: '2026-06-10', exercises: [{ name: 'DC', load: 42.5, reps: 6, sets: 3 }] }], 'DC'); return h && h.sessions === 2 && h.lastDate === '2026-06-10' && h.bestSet.load === 42.5 && exerciseHistoryStats([], 'X') === null; })(),
        repeatLast: typeof lastLoggedSession === 'function' && !!document.getElementById('repeatLastSession') && lastLoggedSession([{ type: 'strength', date: '2026-07-08', exercises: [{ name: 'T' }] }]).date === '2026-07-08',
        exportTsv: typeof workoutsTable === 'function' && !!document.getElementById('exportHistoryTsv') && workoutsTable([{ date: '2026-07-08', type: 'run', duration: 30 }]).split(String.fromCharCode(10)).length === 2,
        historyExFilter: typeof workoutsWithExercise === 'function' && !!document.getElementById('historyExercise') && (() => { const w = [{ id: 1, exercises: [{ name: 'Tractions' }] }, { id: 2, exercise: 'Squat' }]; return workoutsWithExercise(w, 'Tractions').length === 1 && workoutsWithExercise(w, 'all').length === 2 && workoutsWithExercise(w, 'Inconnu').length === 0; })(),
        progSpark: typeof exerciseVolumeSeries === 'function' && (s => s.length === 2 && s[1].volume === 150)(exerciseVolumeSeries([{ name: 'T', date: '2026-06-01', volume: 100 }, { name: 'T', date: '2026-06-03', volume: 150 }], 'T', 8)),
        oneRepMax: typeof estimate1RM === 'function' && estimate1RM(100, 10) === 133.5 && estimate1RM(100, 1) === 100 && estimate1RM(0, 5) === null,
        oneRmSeries: typeof estimatedOneRmSeries === 'function' && (() => { const s = estimatedOneRmSeries([{ date: '2026-06-01', exercises: [{ name: 'DC', load: 40, reps: 8 }] }, { date: '2026-06-08', exercises: [{ name: 'DC', load: 50, reps: 3 }] }], 'DC', 8); return s.length === 2 && s[1].e1rm === 55 && estimatedOneRmSeries([], 'DC', 8).length === 0; })(),
        progression: typeof progressionSuggestion === 'function' && typeof progressionText === 'function' && (() => { const s = progressionSuggestion([{ date: '2026-06-08', exercises: [{ name: 'DC', load: 40, reps: 12 }] }], 'DC', { minReps: 8, maxReps: 12, increment: 2.5 }); if (!(s && s.action === 'weight' && s.nextLoad === 42.5 && s.nextReps === 8 && /42,5 kg/.test(progressionText(s)) && progressionSuggestion([], 'X') === null)) return false; const sl = progressionSuggestion([{ date: '2026-06-08', exercise: 'DC', load: 40, reps: 12 }], 'DC', { minReps: 8, maxReps: 12, increment: 2.5 }); return sl && sl.action === 'weight' && sl.nextLoad === 42.5 && sl.lastReps === 12; })(),
        loadPercentages: typeof loadPercentages === 'function' && (() => { const r = loadPercentages(100); return r.length === 4 && r[2].pct === 80 && r[2].load === 80 && loadPercentages(0).length === 0; })(),
        guidedTarget: !!document.getElementById('guidedTarget') && typeof progressionSuggestion === 'function' && (() => { const s = progressionSuggestion([{ date: '2026-06-08', exercises: [{ name: 'DC', load: 40, reps: 9 }] }], 'DC', { minReps: 8, maxReps: 12, increment: 2.5 }); return s && s.nextReps === 10 && s.nextLoad === 40; })(),
        guidedPersistGuard: typeof guidedSnapshotEquals === 'function' && (() => { const base = () => ({ index: 0, exercises: [{ name: 'Squat', setLogs: [{ load: 60, reps: 8, completed: true }] }], rest: { total: 90, endsAt: 1800000000000 } }); if (!guidedSnapshotEquals(base(), base())) return false; if (!guidedSnapshotEquals({ ...base(), savedAt: 1 }, { ...base(), savedAt: 999 })) return false; const c1 = base(); c1.exercises[0].setLogs[0].load = 62.5; if (guidedSnapshotEquals(base(), c1)) return false; const c2 = base(); c2.index = 1; if (guidedSnapshotEquals(base(), c2)) return false; const c3 = base(); c3.rest = null; return !guidedSnapshotEquals(base(), c3) && guidedSnapshotEquals(null, null) === true && guidedSnapshotEquals(null, base()) === false; })(),
        restClock: typeof restStart === 'function' && typeof restState === 'function' && !!document.getElementById('guidedRestTime') && (() => { const T0 = 1800000000000; const r = restStart(90, T0); if (r.total !== 90 || r.endsAt !== T0 + 90000) return false; const s30 = restState(r, T0 + 30000); if (!s30 || s30.remainingSec !== 60 || s30.done) return false; if (!restState(r, T0 + 90000).done) return false; const long = restState(r, T0 + 600000); if (long.remainingSec !== 0 || long.pct !== 0) return false; return restStart(9999, T0).total === 600 && restState(null, T0) === null && restState({ total: 90 }, T0) === null; })(),
        focusTimerClock: typeof focusTimerStart === 'function' && typeof focusTimerState === 'function' && typeof focusTimerPause === 'function' && typeof focusTimerResume === 'function' && !!document.getElementById('timer') && (() => { const T0 = 1800000000000; const t = focusTimerStart(25, T0, 'Rev'); if (t.endsAt !== T0 + 25 * 60000) return false; const s10 = focusTimerState(t, T0 + 10 * 60000); if (!s10 || s10.remainingSec !== 900 || s10.done) return false; if (!focusTimerState(t, T0 + 25 * 60000).done) return false; if (focusTimerState(t, T0 + 3 * 3600000).remainingSec !== 0) return false; const p = focusTimerPause(t, T0 + 10 * 60000); if (!p.paused || focusTimerState(p, T0 + 40 * 60000).remainingSec !== 900) return false; const r = focusTimerResume(p, T0 + 40 * 60000); return !r.paused && focusTimerState(r, T0 + 45 * 60000).remainingSec === 600 && focusTimerState(null, T0) === null; })(),
        guidedResume: typeof guidedSnapshot === 'function' && typeof resumableGuided === 'function' && !!document.getElementById('guidedResume') && (() => { const T0 = 1800000000000; const w = { title: 'S', exercises: [{ name: 'Squat', sets: 2, setLogs: [{ load: 60, reps: 8, completed: true }, { load: 0, reps: 0, completed: false }] }] }; const snap = guidedSnapshot(w, 0, T0); if (!snap || snap.savedAt !== T0) return false; const r = resumableGuided(snap, T0 + 600000); if (!r || r.done !== 1 || r.ageMin !== 10) return false; if (resumableGuided(snap, T0 + 13 * 3600000) !== null) return false; const vide = guidedSnapshot({ title: 'X', exercises: [{ name: 'Squat', setLogs: [{ load: 60, reps: 8, completed: false }] }] }, 0, T0); return resumableGuided(vide, T0 + 60000) === null && guidedSnapshot(null, 0, T0) === null; })(),
        guidedSwap: typeof exerciseAlternatives === 'function' && !!document.getElementById('guidedSwap') && !!document.getElementById('guidedSwapList') && (() => { const noms = Object.keys(EXERCISE_ZONES); const cible = noms.find(n => exerciseZones(n).length) || noms[0]; const lib = noms.map(n => ({ name: n })); const alts = exerciseAlternatives(cible, lib, {}, [], 4); if (!alts.length || alts.length > 4) return false; if (alts.some(a => a.name === cible)) return false; if (!alts.every(a => a.overlap > 0)) return false; const excl = exerciseAlternatives(cible, lib, {}, [alts[0].name], 4); return !excl.some(a => a.name === alts[0].name) && exerciseAlternatives('Inconnu', lib, {}, [], 4).length === 0; })(),
        liveRecord: typeof liveSetRecord === 'function' && (() => { const prior = { DC: { load: 40, reps: 10 } }; const load = liveSetRecord(prior, 'DC', { load: 42.5, reps: 8 }, []); const dup = liveSetRecord(prior, 'DC', { load: 42.5, reps: 8 }, [{ load: 42.5, reps: 8, completed: true }]); return load && load.type === 'load' && load.value === 42.5 && dup === null && liveSetRecord(prior, 'Nouveau', { load: 100, reps: 5 }, []) === null && liveSetRecord(prior, 'DC', { load: 60, reps: 0 }, []) === null; })(),
        guidedSetsAdjust: typeof adjustGuidedSets === 'function' && (() => { const add = adjustGuidedSets({ sets: 3, setLogs: [] }, 1); const rem = adjustGuidedSets({ sets: 3, setLogs: [{ completed: false }, { completed: false }, { completed: false }] }, -1); const blocked = adjustGuidedSets({ sets: 3, setLogs: [{ completed: true }, { completed: true }, { completed: true }] }, -1); return add.sets === 4 && add.reason === 'added' && rem.sets === 2 && blocked.changed === false && blocked.reason === 'completed' && adjustGuidedSets({ sets: 1 }, -1).reason === 'min' && adjustGuidedSets(null, 1) === null; })(),
        guidedLastSession: typeof lastExerciseSession === 'function' && !!document.getElementById('guidedLastSession') && (() => { const w = [{ date: '2026-07-01', exercises: [{ name: 'DC', setLogs: [{ load: 35, reps: 10 }] }] }, { date: '2026-07-06', exercises: [{ name: 'DC', setLogs: [{ load: 40, reps: 10 }, { load: 40, reps: 8 }, { load: 0, reps: 0 }] }] }]; const r = lastExerciseSession(w, 'DC', '2026-07-10'); return r && r.date === '2026-07-06' && r.daysAgo === 4 && r.sets.length === 2 && r.totalReps === 18 && r.tonnage === 720 && lastExerciseSession(w, 'Inconnu', '2026-07-10') === null; })(),
        pace: typeof runPace === 'function' && runPace(10, 50).label === '5:00' && runPace(0, 30) === null,
        sessionTime: typeof sessionMinutes === 'function' && sessionMinutes([8, 10, 12]) === 30 && !!document.getElementById('guidedSessionTime'),
        runVolumeWow: typeof runKmInWindow === 'function' && runKmInWindow([{ type: 'run', date: '2026-07-06', distance: 10 }, { type: 'run', date: '2026-07-09', distance: 5.5 }], '2026-07-06', '2026-07-12') === 15.5,
        trailReadiness: typeof trailReadiness === 'function' && !!document.getElementById('trailRunSummary') && (() => { const tr = trailReadiness([{ type: 'run', date: '2026-07-08', distance: 12 }, { type: 'run', date: '2026-06-20', distance: 21 }], '2026-07-10'); return tr && tr.weekKm === 12 && tr.monthKm === 33 && tr.runs === 2 && tr.longRun.km === 21 && trailReadiness([], '2026-07-10') === null; })(),
        kmRamp: typeof weeklyKmRamp === 'function' && !!document.getElementById('trailRamp') && (() => { const rm = weeklyKmRamp([{ type: 'run', date: '2026-07-08', distance: 25 }, { type: 'run', date: '2026-07-01', distance: 20 }], '2026-07-10'); return rm && rm.thisWeekKm === 25 && rm.lastWeekKm === 20 && rm.rampPct === 25 && rm.zone === 'build' && weeklyKmRamp([], '2026-07-10') === null; })(),
        tonnage: typeof workoutTonnage === 'function' && workoutTonnage({ exercises: [{ load: 60, reps: 10, sets: 3 }] }) === 1800 && workoutTonnage({ exercises: [{ setLogs: [{ load: 40, reps: 8, completed: true }, { load: 40, reps: 6 }] }] }) === 320 && workoutTonnage({ date: '2025-03-08', exercise: 'Squat', load: 80, reps: 5, sets: 4 }) === 1600 && workoutTonnage(null) === 0,
        guidedStats: typeof completedTonnage === 'function' && typeof completedSetCount === 'function' && !!document.getElementById('guidedSessionStats') && (() => { const ex = [{ setLogs: [{ load: 40, reps: 8, completed: true }, { load: 40, reps: 6, completed: false }] }, { setLogs: [{ load: 60, reps: 10, completed: true }] }]; return completedTonnage(ex) === 920 && completedSetCount(ex) === 2 && completedTonnage([]) === 0; })(),
        sessionRecap: typeof sessionSummary === 'function' && !!document.getElementById('guidedRecap') && (() => { const s = sessionSummary([{ name: 'DC', setLogs: [{ load: 40, reps: 8, completed: true }] }], { DC: { load: 35, reps: 8 } }); return s.tonnage === 320 && s.sets === 1 && s.exercises === 1 && s.prs.length === 1 && s.prs[0].loadPr; })(),
        weightTrend: typeof weightTrend === 'function' && !!document.getElementById('weightTrend') && (t => t && t.ratePerWeek === -0.5 && t.weeksToTarget === 4)(weightTrend([{ date: '2026-06-26', value: 82 }, { date: '2026-07-10', value: 81 }], 79)),
        coachWeight: typeof energyPlan === 'function' && typeof basalMetabolicRate === 'function' && !!document.getElementById('coachWeightBody') && !!document.getElementById('coachAge') && (() => { const p = energyPlan({ weight: 80, height: 180, age: 30, sex: 'homme', sessionsPerWeek: 4, targetWeight: 72, todayKey: '2026-07-12' }); return p && p.bmr === 1780 && p.tdee === 2759 && p.goal === 'perte' && p.weeks === 17 && p.targetDate === '2026-11-08' && energyPlan({ weight: 80, height: 180, age: 30, targetWeight: 0 }) === null; })(),
        coachBmi: typeof bmiInfo === 'function' && (() => { const b = bmiInfo(80, 180); return b && b.bmi === 24.7 && b.category === 'corpulence normale' && bmiInfo(0, 180) === null; })(),
        lifetimeTonnage: typeof lifetimeTonnage === 'function' && lifetimeTonnage([{ exercises: [{ name: 'Sq', load: 60, reps: 10, sets: 3 }] }, { exercises: [{ name: 'DC', setLogs: [{ load: 40, reps: 8, completed: true }] }] }]) === 2120 && lifetimeTonnage([]) === 0,
        strengthPlateau: typeof strengthPlateau === 'function' && strengthPlateau([90, 92, 94, 96, 98], 3) === null && (() => { const p = strengthPlateau([95, 100, 98, 99, 97], 3); return p && p.plateau === true && p.best === 100; })(),
        strengthForecast: typeof strengthForecast === 'function' && (() => { const f = strengthForecast([{ date: '2026-06-08', e1rm: 90 }, { date: '2026-06-22', e1rm: 95 }], 5, '2026-06-22'); return f && f.milestone === 100 && f.perWeek === 2.5 && strengthForecast([{ date: '2026-06-08', e1rm: 90 }, { date: '2026-06-22', e1rm: 90 }], 5) === null; })(),
        coachForecast: typeof weightForecast === 'function' && typeof coachForecastSvg === 'function' && (() => { const f = weightForecast(80, 72, 0.48, 17, '2026-07-12'); const svg = coachForecastSvg(f, [{ date: '2026-07-05', value: 81 }, { date: '2026-07-12', value: 80 }]); return f.length === 18 && f.at(-1).value === 72 && /cw-plan-line/.test(svg) && /cw-actual-line/.test(svg) && weightForecast(80, 72, 0, 17, '2026-07-12').length === 0; })(),
        weightMilestones: typeof weightMilestones === 'function' && typeof trackingCadenceAdvice === 'function' && (() => {
          const ms = weightMilestones({ current: 81, target: 75, ratePerWeek: 0.5, todayKey: '2026-07-15', everyWeeks: 2, maxSteps: 8 });
          const last = ms[ms.length - 1];
          return ms.length >= 3 && ms[0].weeksFromNow === 2 && ms[0].weight === 80 && last.weight === 75 && last.remaining === 0
            && trackingCadenceAdvice('perte').weighIn.length > 10 && weightMilestones({ current: 75, target: 75, ratePerWeek: 0.5, todayKey: '2026-07-15' }).length === 0;
        })(),
        weightGoalProgress: typeof weightGoalProgress === 'function' && (() => {
          const p = weightGoalProgress([{ date: '2026-06-01', value: 84 }, { date: '2026-07-10', value: 81 }], 78);
          return p && p.direction === 'perte' && p.totalKg === 6 && p.doneKg === 3 && p.pct === 50
            && weightGoalProgress([{ date: '2026-06-01', value: 80 }, { date: '2026-07-10', value: 82 }], 75).pct === 0
            && weightGoalProgress([{ date: '2026-06-01', value: 80 }, { date: '2026-07-10', value: 74 }], 75).pct === 100
            && weightGoalProgress([{ date: '2026-06-01', value: 75 }], 75, 75) === null;
        })(),
        settingsUpdate: !!document.getElementById('updateCheckBtn') && !!document.getElementById('updateSettingsInstall') && !!document.getElementById('updateCurrentVersion') && !!document.getElementById('updateCheckStatus')
          // Sur desktop (window.desktop présent, cas du smoke Electron), le panneau doit être révélé par setupComfort.
          && (typeof window.desktop === 'undefined' || document.getElementById('updateSettings').hidden === false),
        coachLogWeight: !!document.getElementById('coachWeightToday') && !!document.getElementById('coachLogWeight') && !!document.getElementById('coachLastWeigh') && (() => {
          const savedW = state.weights;
          state.weights = [];
          const today = (typeof localDate === 'function') ? localDate() : new Date().toISOString().slice(0, 10);
          const inp = document.getElementById('coachWeightToday');
          inp.value = '77.3';
          document.getElementById('coachLogWeight').click();
          const enregistre = state.weights.some(w => w.date === today && w.value === 77.3);
          inp.value = '77.8'; document.getElementById('coachLogWeight').click(); // même jour → remplace
          const remplace = state.weights.filter(w => w.date === today).length === 1 && state.weights.find(w => w.date === today).value === 77.8;
          const dernier = /Dernière pesée/.test(document.getElementById('coachLastWeigh').textContent);
          state.weights = savedW; if (typeof renderCoachWeight === 'function') renderCoachWeight();
          return enregistre && remplace && dernier;
        })(),
        weightUpsertShared: typeof upsertWeight === 'function' && !!document.getElementById('addWeightButton') && !!document.getElementById('weightInput') && (() => {
          const savedW = state.weights;
          const today = (typeof localDate === 'function') ? localDate() : new Date().toISOString().slice(0, 10);
          state.weights = [];
          const inp = document.getElementById('weightInput');
          inp.value = '80'; document.getElementById('addWeightButton').click();
          inp.value = '80.6'; document.getElementById('addWeightButton').click(); // même jour → remplace
          const un = state.weights.filter(w => w.date === today).length === 1 && state.weights.find(w => w.date === today).value === 80.6;
          state.weights = savedW; if (typeof renderWeight === 'function') renderWeight(); if (typeof renderCoachWeight === 'function') renderCoachWeight();
          return un && upsertWeight([], 77.36, today)[0].value === 77.4;
        })(),
        weightStepper: !!document.querySelector('[data-target-step="0.5"]') && !!document.querySelector('[data-target-step="-0.5"]') && !!document.getElementById('coachTarget') && (() => {
          const inp = document.getElementById('coachTarget');
          const savedGoals = JSON.parse(JSON.stringify(state.goals));
          inp.value = '80';
          document.querySelector('[data-target-step="0.5"]').click(); // +0,5 → 80,5, enregistré via 'change'
          const plus = String(state.goals.targetWeight) === '80.5';
          inp.value = '80';
          document.querySelector('[data-target-step="-0.5"]').click(); // −0,5 → 79,5
          const moins = String(state.goals.targetWeight) === '79.5';
          state.goals = savedGoals; if (typeof renderCoachWeight === 'function') renderCoachWeight();
          return plus && moins;
        })(),
        whatsNewDismiss: !!document.getElementById('whatsNewCard') && (() => {
          // régression : « Super, compris » doit masquer la carte. CSS .whatsnew-card[hidden] doit
          // battre le display:flex (sinon l'attribut hidden est ignoré et la carte reste affichée).
          const el = document.getElementById('whatsNewCard');
          const prevHidden = el.hidden, prevHtml = el.innerHTML;
          el.hidden = false; el.innerHTML = '<span>x</span>';
          const shown = getComputedStyle(el).display !== 'none';
          el.hidden = true;
          const hid = getComputedStyle(el).display === 'none';
          el.hidden = prevHidden; el.innerHTML = prevHtml;
          return shown && hid;
        })(),
        coachWeek: typeof coachWeekPlan === 'function' && (() => { const p = coachWeekPlan('perte', [1, 3, 5]); const g = coachWeekPlan('prise', [1, 2, 3, 4, 5, 6]); const s = coachWeekPlan('perte', [1, 2, 3, 4, 5, 6, 0]); const okOrder = s.sessions[0].weekday === 1 && s.sessions[s.sessions.length - 1].weekday === 0; return p.sessions.length === 3 && p.renfo === 1 && p.runs === 1 && g.strength === 4 && g.sessions.length === 5 && okOrder && coachWeekPlan('xxx', [1, 3]).note.includes('Maintien'); })(),
        runPlan: typeof runPlanWeek === 'function' && typeof scheduleRunPlan === 'function' && !!document.getElementById('runPlanBtn') && !!document.getElementById('runPlanResult') && (() => { const p = runPlanWeek(4); return p.count === 4 && p.sessions.at(-1).type === 'longue' && p.totalMinutes === 175 && runPlanWeek(99).count === 6; })(),
        coachWeekSchedule: typeof scheduleCoachWeek === 'function' && typeof coachSessionLabel === 'function' && coachSessionLabel('muscu').includes('Musculation') && coachSessionLabel('zzz') === 'Séance',
        coachNutri: typeof mealSplit === 'function' && typeof nutritionTips === 'function' && (() => { const m = mealSplit(2000, 160, 200, 60); return m.length === 4 && m[1].kcal === 700 && m[1].proteinG === 56 && nutritionTips('perte')[0].includes('déficit') && mealSplit(0, 1, 1, 1).length === 0; })(),
        coachMenu: typeof mealIdea === 'function' && (() => { const a = mealIdea('Petit-déjeuner', 500, 0); return a.kcal === 500 && typeof a.example === 'string' && a.example.length > 0 && mealIdea('Déjeuner', 700, 0).example !== mealIdea('Déjeuner', 700, 1).example; })(),
        coachExport: typeof coachPlanText === 'function' && (() => { const t = coachPlanText({ plan: { goal: 'perte', diff: 6, targetDate: '2026-11-08', dailyTarget: 1875, proteinG: 162, carbG: 143, fatG: 73 }, week: [{ weekday: 1, label: 'Course', minutes: 40 }], meals: [{ meal: 'Petit-déjeuner', kcal: 469, example: 'Avoine' }] }); return t.includes('1875 kcal') && t.includes('Course') && coachPlanText({}) === ''; })(),
        coachAdherence: typeof coachSteps === 'function' && typeof weeklyAdherence === 'function' && (() => { const a = weeklyAdherence({ workouts: [{ date: '2026-07-08' }, { date: '2026-07-09' }, { date: '2026-07-10' }], nutrition: [{ date: '2026-07-08', protein: 150, water: 8 }, { date: '2026-07-09', protein: 150, water: 8 }, { date: '2026-07-10', protein: 150, water: 8 }], recovery: [{ date: '2026-07-09', sleep: 8 }], weights: [{ date: '2026-07-08', value: 80 }] }, '2026-07-06', '2026-07-12', { proteinTargetG: 140, sessionTarget: 3 }); const d = weeklyAdherence({ nutrition: [{ date: '2026-07-08', protein: 150, water: 8 }, { date: '2026-07-08', protein: 150, water: 8 }], recovery: [{ date: '2026-07-08', sleep: 8 }, { date: '2026-07-08', sleep: 8 }] }, '2026-07-06', '2026-07-12', { proteinTargetG: 140 }); const dup = d.items.find(i => i.key === 'protein').label.includes('(1 j)') && d.items.find(i => i.key === 'water').label.includes('(1 j)'); return a.total === 5 && a.score === 100 && coachSteps('perte')[0].includes('déficit') && dup; })(),
        coachAdhHist: typeof upsertAdherenceSnapshot === 'function' && Array.isArray(state.adherenceHistory) && (() => { let h = upsertAdherenceSnapshot([], '2026-07-06', 80); h = upsertAdherenceSnapshot(h, '2026-07-06', 60); h = upsertAdherenceSnapshot(h, '2026-06-29', 40); return h.length === 2 && h[0].week === '2026-06-29' && h[1].score === 60; })(),
        coachRefine: typeof activityLevelFactor === 'function' && typeof dateAfterWeeks === 'function' && typeof paceStatus === 'function' && !!document.getElementById('coachActivity') && activityLevelFactor('actif') === 1.725 && dateAfterWeeks('2026-07-12', 17) === '2026-11-08' && paceStatus(17, 25) === 'slow' && energyPlan({ weight: 80, height: 180, age: 30, sex: 'homme', activityLevel: 'actif', sessionsPerWeek: 2, targetWeight: 72, todayKey: '2026-07-12' }).tdee === 3071,
        coachAdjust: typeof calorieAdjustment === 'function' && (() => { const a = calorieAdjustment([{ date: '2026-06-21', value: 80 }, { date: '2026-07-01', value: 80 }, { date: '2026-07-12', value: 80 }], 'perte', 2000); return a.stagnating && a.suggestion === 'reduce' && a.newTarget === 1875 && calorieAdjustment([{ date: '2026-07-10', value: 80 }, { date: '2026-07-12', value: 80 }], 'perte', 2000).stagnating === false; })(),
        coachMeasure: typeof recompositionInsight === 'function' && recompositionInsight(-0.3, -2).key === 'recomp' && recompositionInsight(-2, -2).key === 'fatloss' && recompositionInsight(-0.2, -0.2) === null,
        measureTrend: typeof measurementDelta === 'function' && !!document.getElementById('measurementsTrend') && (d => d && d.delta === -3)(measurementDelta([{ date: '2026-06-01', waist: 88 }, { date: '2026-07-01', waist: 85 }], 'waist')),
        measureUpsert: typeof upsertMeasurement === 'function' && !!document.getElementById('saveMeasurements') && (() => {
          const day = [{ id: 9, waist: 84, chest: 100, arm: 36, date: '2026-07-15' }];
          const r = upsertMeasurement(day, { waist: 82.5, chest: 0, arm: 0 }, '2026-07-15');
          return r.filter(m => m.date === '2026-07-15').length === 1 && r[0].waist === 82.5 && r[0].chest === 100 && r[0].arm === 36 && r[0].id === 9
            && upsertMeasurement([], { waist: 0 }, '2026-07-15').length === 0;
        })(),
        measureRecent: typeof measurementRecentDelta === 'function' && !!document.getElementById('measurementsRecent') && (() => { const r = measurementRecentDelta([{ date: '2026-04-01', waist: 90 }, { date: '2026-06-01', waist: 88 }, { date: '2026-07-01', waist: 85 }], 'waist', 30); return r && r.past === 88 && r.delta === -3 && r.spanDays === 30 && measurementRecentDelta([{ date: '2026-07-01', waist: 85 }], 'waist', 30) === null; })(),
        measureSpark: typeof measurementSeries === 'function' && typeof sparkLineSvg === 'function' && !!document.getElementById('measurementsSpark') && (() => {
          const s = measurementSeries([{ date: '2026-05-01', waist: 88 }, { date: '2026-06-01', waist: 86 }, { date: '2026-07-01', waist: 84 }], 'waist', 8);
          return s.length === 3 && s[0].value === 88 && s[2].value === 84
            && /<path/.test(sparkLineSvg(s.map(p => ({ label: p.date, value: p.value })))) && sparkLineSvg([{ value: 1 }]) === '';
        })(),
        kitchen: typeof generateMeals === 'function' && !!document.getElementById('pantryList') && !!document.getElementById('mealSuggestions') && !!document.getElementById('envieStyles'),
        shopping: typeof buildShoppingList === 'function' && !!document.getElementById('shoppingBlock') && !!document.getElementById('shoppingList') && !!document.getElementById('copyShoppingBtn'),
        shoppingCheck: typeof remainingShopping === 'function' && !!document.getElementById('shoppingRemaining') && remainingShopping([{ label: 'a' }, { label: 'b' }], { a: true }) === 1,
        agendaImport: typeof parseIcs === 'function' && !!document.getElementById('importIcs') && !!document.getElementById('importIcsKind') && !!document.getElementById('calendarAgendaPriority'),
        agendaUx: !!document.getElementById('weekQuickAdd') && !!document.getElementById('agendaFilters') && !!document.getElementById('importIcsWeek') && document.querySelectorAll('#agendaFilters [data-filter]').length === 5,
        agendaSearch: typeof agendaMatch === 'function' && !!document.getElementById('agendaSearch') && agendaMatch({ title: 'RDV Kiné', location: 'Lorient' }, 'kine') === true && agendaMatch({ title: 'Réunion' }, 'reunion') === true && agendaMatch({ title: 'RDV Kiné' }, 'dentiste') === false,
        agendaDay: typeof renderDayView === 'function' && typeof renderAgenda === 'function' && !!document.getElementById('dayView') && document.querySelectorAll('#agendaViewSwitch [data-view]').length === 2,
        agendaPostponeUndo: typeof renderDayView === 'function' && typeof showUndoToast === 'function' && typeof normalizeAgendaItem === 'function' && (() => {
          const savedAg = state.agenda;
          const key = (typeof dateKey === 'function' && typeof dayCursor !== 'undefined') ? dateKey(dayCursor) : null;
          if (!key) { state.agenda = savedAg; return false; }
          state.agenda = [normalizeAgendaItem({ id: 7777, title: 'Test report', date: key, time: '10:00', kind: 'life' })];
          renderDayView();
          const btn = document.querySelector('#dayView [data-day-postpone="7777"]');
          let moved = false, restored = false;
          if (btn) {
            btn.click();
            const a1 = state.agenda.find(a => a.id === 7777); moved = !!a1 && a1.date > key;
            const undo = document.querySelector('#undoToast .ut-undo');
            if (undo) { undo.click(); const a2 = state.agenda.find(a => a.id === 7777); restored = !!a2 && a2.date === key; }
          }
          state.agenda = savedAg; renderDayView();
          return !!btn && moved && restored;
        })(),
        dayGrid: typeof dayColumns === 'function' && typeof endTimeOf === 'function',
        dayPlanned: typeof dayPlannedMinutes === 'function' && dayPlannedMinutes([{ time: '09:00', durationMin: 60 }, { time: '14:00', durationMin: 90 }]) === 150,
        dayCopy: typeof dayPlanText === 'function' && dayPlanText([{ time: '09:00', title: 'X', completed: true }]) === '- 09:00 X ✓',
        agendaDetails: typeof departureInfo === 'function' && !!document.getElementById('calendarAgendaLocation') && !!document.getElementById('calendarAgendaTravel') && !!document.getElementById('calendarAgendaNotes'),
        closeButtonsA11y: ['closeAgendaEdit', 'closeDialog', 'closeWorkoutDialog', 'closeGuidedWorkout', 'closeFocusReview', 'closeExerciseDetail', 'closeZonePlan', 'closeHistoryDialog'].every(id => { const el = document.getElementById(id); return !!el && !!(el.getAttribute('aria-label') || '').trim(); }),
        navArrowsA11y: ['previousMonth', 'nextMonth', 'previousWeek', 'nextWeek'].every(id => { const el = document.getElementById(id); return !!el && !!(el.getAttribute('aria-label') || '').trim(); }),
        restSoundA11y: (() => { const el = document.getElementById('restSoundToggle'); return !!el && el.type === 'checkbox' && !!(el.getAttribute('aria-label') || '').trim(); })(),
        filterSelectsA11y: ['exerciseFamily', 'suppKind'].every(id => { const el = document.getElementById(id); return !!el && el.tagName === 'SELECT' && !!(el.getAttribute('aria-label') || el.getAttribute('title') || '').trim(); }),
        iconButtonsA11y: ['weekQuickEstimate'].every(id => { const el = document.getElementById(id); return !!el && !(el.textContent || '').trim().match(/[A-Za-z0-9]/) && !!(el.getAttribute('aria-label') || '').trim(); }),
        agendaEdit: !!document.getElementById('weekQuickLocation') && !!document.getElementById('weekQuickTravel') && !!document.getElementById('weekQuickNotes') && !!document.getElementById('weekQuickEstimate') && !!document.getElementById('agendaEditForm') && !!document.getElementById('editAgendaNotes'),
        agendaDuplicate: typeof duplicateAgendaItem === 'function' && !!document.getElementById('duplicateAgendaEdit') && (duplicateAgendaItem({ id: 1, date: '2026-07-10', planId: 9, completed: true }, 2) || {}).planId === undefined,
        guidedFromPlan: typeof startGuidedFromNames === 'function' && typeof openGuidedWorkout === 'function' && !!document.getElementById('guidedWorkoutDialog'),
        settingsPage: !!document.querySelector('[data-page="settings"]') && !!document.querySelector('.settings-page') && document.querySelectorAll('.settings-conn .conn-row').length === 3 && !!document.getElementById('settingsTheme') && !!document.getElementById('settingsDensity'),
        // Garde-fou du bug repéré par Adrien : un panneau ABSENT de pageGroups n'est jamais masqué
        // par showPage() → il fuit sur TOUTES les pages (« programme auto » et « routines guidées »
        // s'affichaient dans Réglages). On vérifie qu'aucun panneau d'une autre page n'y fuit.
        pageIsolation: typeof showPage === 'function' && typeof pageGroups === 'object' && (() => { const listed = new Set(Object.values(pageGroups).flat().map(s => s.replace(/^\./, ''))); const doiventEtreRanges = ['objective-program-panel', 'wellness-panel', 'planning-panel', 'weekly-review-panel', 'nutrition-panel', 'kitchen-panel', 'morning-panel', 'reflection-panel', 'settings-page', 'reminder-panel']; if (!doiventEtreRanges.every(c => listed.has(c))) return false; showPage('settings'); const fuite = ['objective-program-panel', 'wellness-panel', 'nutrition-panel', 'planning-panel'].some(c => { const el = document.querySelector('.' + c); return el && !el.classList.contains('app-page-hidden'); }); showPage('dashboard'); return !fuite; })(),
        poidsTab: typeof showPage === 'function' && typeof pageGroups === 'object' && !!document.querySelector('[data-page="poids"]') && !!document.querySelector('.coach-weight-panel') && (() => {
          if (!pageGroups.poids || pageGroups.poids.indexOf('.coach-weight-panel') < 0) return false;
          if (typeof ATHLETE_TABS === 'object' && ATHLETE_TABS['coach-weight-panel']) return false; // plus un sous-onglet athlète
          const cw = document.querySelector('.coach-weight-panel');
          showPage('poids'); const surPoids = !cw.classList.contains('app-page-hidden');
          showPage('athlete'); const horsAthlete = cw.classList.contains('app-page-hidden');
          showPage('dashboard'); const horsDash = cw.classList.contains('app-page-hidden');
          return surPoids && horsAthlete && horsDash;
        })(),
        navAriaCurrent: typeof showPage === 'function' && !!document.querySelector('[data-page="poids"]') && (() => {
          showPage('poids');
          const poids = document.querySelector('[data-page="poids"]'), dash = document.querySelector('[data-page="dashboard"]');
          const ok1 = poids.getAttribute('aria-current') === 'page' && !dash.hasAttribute('aria-current');
          showPage('dashboard');
          const ok2 = dash.getAttribute('aria-current') === 'page' && !poids.hasAttribute('aria-current');
          let ok3 = true;
          if (typeof showAthleteTab === 'function' && document.querySelector('.athlete-subnav [data-atab="progres"]')) {
            showAthleteTab('progres');
            const prog = document.querySelector('.athlete-subnav [data-atab="progres"]'), sea = document.querySelector('.athlete-subnav [data-atab="seance"]');
            ok3 = prog.getAttribute('aria-current') === 'true' && !sea.hasAttribute('aria-current');
            showAthleteTab('seance');
          }
          return ok1 && ok2 && ok3;
        })(),
        escapeOverlay: !!document.getElementById('weekPage') && !!document.getElementById('calendarPage') && (() => {
          document.querySelectorAll('dialog[open]').forEach(d => d.close());
          const wp = document.getElementById('weekPage'), cp = document.getElementById('calendarPage');
          const wpH = wp.hidden, cpH = cp.hidden;
          wp.hidden = false;
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          const wpFerme = wp.hidden === true;
          cp.hidden = false;
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          const cpFerme = cp.hidden === true;
          wp.hidden = wpH; cp.hidden = cpH;
          return wpFerme && cpFerme;
        })(),
        photoCompress: typeof fitDimensions === 'function' && typeof dataUrlBytes === 'function' && typeof compressPhoto === 'function' && typeof optimizeStoredPhotos === 'function' && (() => { const p = fitDimensions(3024, 4032, 1280); if (!p || p.height !== 1280 || p.width !== 960) return false; const petit = fitDimensions(800, 600, 1280); if (petit.width !== 800 || petit.height !== 600) return false; if (fitDimensions(0, 100, 1280) !== null) return false; return dataUrlBytes('data:image/jpeg;base64,AAAA') === 3 && dataUrlBytes('pas une data url') === 0 && dataUrlBytes(null) === 0; })(),
        targetAdvice: typeof weightTargetAdvice === 'function' && !!document.getElementById('coachTargetAdvice') && (() => { const base = { weight: 81, height: 174, age: 30, sex: 'homme' }; const ok = weightTargetAdvice({ ...base, targetWeight: 75, fitnessObjective: 'athletique' }); if (!ok || ok.level !== 'ok' || ok.direction !== 'perte') return false; const bas = weightTargetAdvice({ ...base, targetWeight: 55, fitnessObjective: 'athletique' }); if (bas.level !== 'stop' || bas.targetBmi >= 18.5) return false; const contra = weightTargetAdvice({ ...base, targetWeight: 70, fitnessObjective: 'muscle' }); if (contra.level !== 'stop') return false; const maint = weightTargetAdvice({ ...base, targetWeight: 81, fitnessObjective: 'athletique' }); return maint.direction === 'maintien' && weightTargetAdvice({ weight: 81, height: 174 }) === null; })(),
        durationSplit: typeof splitDuration === 'function' && typeof combineDuration === 'function' && !!document.getElementById('workoutHours') && !!document.getElementById('workoutDuration') && (() => { const d = splitDuration(90); return d.h === 1 && d.m === 30 && combineDuration(1, 30) === 90 && combineDuration(2, 0) === 120 && combineDuration('', 45) === 45 && combineDuration(20, 0) === 600; })(),
        dataIo: !!document.getElementById('exportDataBtn') && !!document.getElementById('importDataBtn') && !!document.getElementById('dataIoStatus'),
        backupFilename: typeof backupFilename === 'function' && backupFilename('2026-07-15') === 'irl-lvp-up-sauvegarde-2026-07-15.json' && /export/.test(backupFilename('x')),
        unwrapBackup: typeof unwrapBackup === 'function' && (() => {
          const raw = { xp: 5, workouts: [] };
          return unwrapBackup(raw) === raw && unwrapBackup({ version: 4, state: raw }) === raw
            && unwrapBackup({ version: 4 }).version === 4 && unwrapBackup(null) === null;
        })(),
        programReset: typeof pruneProgramSessionsFrom === 'function' && (() => {
          // Démarrer un nouveau programme doit purger les séances du précédent à partir du lundi de
          // départ, sans toucher au passé/coché ni au manuel — sinon jours à 2 séances.
          // Séances de programme identifiées par refId 'objprog-…' (source recodée 'manual').
          const ag = [
            { id: 1, source: 'manual', refId: 'objprog-muscu-1-2026-07-16', date: '2026-07-16', completed: false }, // cette semaine → gardé
            { id: 2, source: 'manual', refId: 'objprog-muscu-1-2026-07-20', date: '2026-07-20', completed: false }, // à venir → purgé
            { id: 3, source: 'manual', refId: 'objprog-muscu-1-2026-07-20', date: '2026-07-20', completed: true },  // coché → gardé
            { id: 4, source: 'manual', date: '2026-07-27', completed: false },                                      // VRAI manuel → gardé
          ];
          const r = pruneProgramSessionsFrom(ag, '2026-07-20');
          return r.removed === 1 && r.agenda.map(a => a.id).join(',') === '1,3,4';
        })(),
        plannedMergesProgram: typeof upcomingSessions === 'function' && !!document.getElementById('plannedList') && (() => {
          // « Planifier la suite » doit voir les séances de programme (agenda, sans planId), pas
          // seulement state.plans — sinon invisibles après l'onboarding.
          const plans = [{ id: 1, date: '2026-07-20', time: '18:00', type: 'Musculation' }];
          const agenda = [
            { id: 10, kind: 'sport', date: '2026-07-21', time: '18:00', title: '🏋️ Haut · 45 min', workout: ['Développé'], completed: false },
            { id: 11, kind: 'sport', date: '2026-07-22', time: '18:00', title: 'Liée plan', planId: 5, completed: false }, // doublon → exclu
          ];
          const u = upcomingSessions(plans, agenda, '2026-07-20');
          return u.length === 2 && u[0].origin === 'plan' && u[1].origin === 'agenda' && u[1].id === 10;
        })(),
        athleteZones: typeof organizeAthleteZones === 'function' && typeof showsEnduranceBase === 'function' && (() => {
          // 3 zones intitulées en tête du sous-onglet Séance. Les panneaux vivent groupés dans des
          // conteneurs .training-grid : on range au niveau conteneur, pas panneau. On vérifie donc
          // l'intertitre qui PRÉCÈDE chaque conteneur clé, pas un ordre d'indices rigide.
          const zones = [...document.querySelectorAll('main.app-shell > section.atab-zone')];
          if (zones.length !== 3) return false;
          if (zones.map(z => z.querySelector('.azh-t') && z.querySelector('.azh-t').textContent).join('|') !== 'Faire maintenant|Mon entraînement|Récupération & mobilité') return false;
          if (!zones.every(z => z.dataset.atab === 'seance')) return false;
          // Intertitre précédant le conteneur direct qui abrite un panneau donné.
          const zoneTitreDe = cls => {
            const p = document.querySelector('.' + cls);
            if (!p) return null;
            let sec = p.closest('main.app-shell > section') || p;
            while (sec && !(sec.classList && sec.classList.contains('atab-zone'))) sec = sec.previousElementSibling;
            return sec ? (sec.querySelector('.azh-t') && sec.querySelector('.azh-t').textContent) : null;
          };
          if (zoneTitreDe('athlete-companion') !== 'Faire maintenant') return false;
          if (zoneTitreDe('planning-panel') !== 'Faire maintenant') return false;
          if (zoneTitreDe('wellness-panel') !== 'Récupération & mobilité') return false;
          if (zoneTitreDe('objective-program-panel') !== 'Mon entraînement') return false;
          // « Base d'endurance » masquée/affichée selon l'objectif courant (C).
          const trail = document.querySelector('.trail-panel');
          const attendu = !showsEnduranceBase({ goal: state.profile.goal, fitnessObjective: state.fitnessObjective, raceGoalDate: state.raceGoal && state.raceGoal.date });
          return !!trail && trail.classList.contains('endurance-hidden') === attendu;
        })(),
        nutritionCsv: typeof nutritionCsv === 'function' && !!document.getElementById('exportNutritionCsv') && (() => { const csv = nutritionCsv([{ date: '2026-07-06', protein: 150, water: 8, fruit: false }, { date: '2026-07-08', protein: 130, water: 7, fruit: true }]); const lines = csv.split(String.fromCharCode(10)); return lines.length === 3 && lines[0] === 'date,proteines_g,eau_verres,fruits_legumes' && lines[1] === '2026-07-06,150,8,non' && lines[2] === '2026-07-08,130,7,oui'; })(),
        s8Travel: typeof isAllowedTravelUrl === 'function' && typeof travelModes === 'function' && !!document.getElementById('calendarAgendaEstimate') && !!document.getElementById('travelStartForm') && !!document.getElementById('travelHome') && !!document.getElementById('travelMode'),
        goalsZones: typeof goalMatch === 'function' && typeof goalRank === 'function' && Array.isArray(TRAINING_GOALS) && document.querySelectorAll('#exerciseGoal option').length === 8,
        libNewOnly: !!document.getElementById('exerciseNewOnly') && (() => { const before = document.querySelectorAll('#exerciseCards .exercise-card').length; document.getElementById('exerciseNewOnly').click(); const on = document.querySelectorAll('#exerciseCards .exercise-card').length; document.getElementById('exerciseNewOnly').click(); const off = document.querySelectorAll('#exerciseCards .exercise-card').length; return before === 47 && on === 47 && off === 47; })(),
        equipmentFilter: typeof equipmentOptions === 'function' && !!document.getElementById('exerciseEquipment') && (() => { const sel = document.getElementById('exerciseEquipment'), opts = equipmentOptions(exercises); if (!opts.length || sel.options.length !== opts.length + 1) return false; const top = opts[0]; sel.value = top.kind; sel.dispatchEvent(new Event('change')); const shown = document.querySelectorAll('#exerciseCards .exercise-card').length; sel.value = 'all'; sel.dispatchEvent(new Event('change')); const all = document.querySelectorAll('#exerciseCards .exercise-card').length; return shown === top.count && all === 47; })(),
        favorites: typeof toggleFavorite === 'function' && !!document.getElementById('exerciseFavOnly') && !!document.getElementById('toggleFavExercise') && (() => { const before = (state.exerciseFavorites || []).slice(); state.exerciseFavorites = toggleFavorite([], 'Gainage planche'); renderExerciseLibrary(); const badge = document.querySelectorAll('#exerciseCards .ex-fav-badge').length; document.getElementById('exerciseFavOnly').click(); const favShown = document.querySelectorAll('#exerciseCards .exercise-card').length; document.getElementById('exerciseFavOnly').click(); state.exerciseFavorites = before; renderExerciseLibrary(); return badge >= 1 && favShown === 1; })(),
        libraryReset: typeof activeExerciseFilters === 'function' && !!document.getElementById('exerciseFilterBar') && (() => {
          const goalSel = document.getElementById('exerciseGoal');
          goalSel.value = 'arms'; goalSel.dispatchEvent(new Event('change'));
          const filtered = document.querySelectorAll('#exerciseCards .exercise-card').length;
          const barShown = !document.getElementById('exerciseFilterBar').hidden;
          const resetBtn = document.getElementById('exerciseResetFilters');
          if (resetBtn) resetBtn.click();
          const afterReset = document.querySelectorAll('#exerciseCards .exercise-card').length;
          const barHidden = document.getElementById('exerciseFilterBar').hidden;
          return activeExerciseFilters({ goal: 'arms' }).length === 1 && filtered > 0 && filtered < 47 && barShown && !!resetBtn && afterReset === 47 && barHidden;
        })(),
        zoneCoverage: typeof weeklyZoneCoverage === 'function' && !!document.getElementById('weeklyReviewZones') && weeklyZoneCoverage([{ date: '2026-07-08', exercise: 'Gainage planche' }], '2026-07-10').abs === 1,
        weeklySets: typeof weeklySetsPerZone === 'function' && typeof setLandmark === 'function' && !!document.getElementById('weeklySets') && weeklySetsPerZone([{ date: '2026-07-08', exercise: 'Gainage planche', sets: 3 }], '2026-07-10').abs === 3 && setLandmark(5).zone === 'low' && setLandmark(15).zone === 'ok' && setLandmark(25).zone === 'high',
        muscleBalance: typeof muscleBalance === 'function' && !!document.getElementById('muscleBalance') && (() => { const mb = muscleBalance([{ date: '2026-07-08', exercises: [{ name: 'Pompes classiques', sets: 4 }, { name: 'Tractions', sets: 3 }] }], '2026-07-10', 28); const hang = muscleBalance([{ date: '2026-07-08', exercises: [{ name: 'Suspension barre', sets: 4 }] }], '2026-07-10'); return mb && mb.push === 4 && mb.pull === 3 && mb.zone === 'balanced' && muscleBalance([], '2026-07-10') === null && hang && hang.push === 0 && hang.pull === 4 && hang.zone === 'no-push'; })(),
        zoneFreshness: typeof zoneFreshness === 'function' && !!document.getElementById('zoneFreshness') && (() => { const zf = zoneFreshness([{ date: '2026-07-06', exercises: [{ name: 'Goblet squat kettlebell' }] }], '2026-07-10'); const by = Object.fromEntries(zf.map(z => [z.zone, z])); return zf.length === 7 && by.legs.days === 4 && by.legs.status === 'ready' && by.chest.status === 'never'; })(),
        focusSuggestion: typeof suggestTrainingFocus === 'function' && !!document.getElementById('trainingFocusSuggestion') && (() => { const tf = suggestTrainingFocus([{ date: '2026-07-10', exercises: [{ name: 'Goblet squat kettlebell', sets: 3 }] }, { date: '2026-07-04', exercises: [{ name: 'Tractions', sets: 3 }] }], '2026-07-10'); const zones = tf.map(z => z.zone); return tf.length === 5 && !zones.includes('legs') && tf[0].zone === 'abs' && suggestTrainingFocus([], 'x').length === 0; })(),
        neglectedZone: typeof neglectedZone === 'function' && neglectedZone({ legs: 2, back: 1, arms: 1 }, ['abs', 'legs', 'arms']) === 'abs' && neglectedZone({ abs: 1, legs: 1, arms: 1 }, ['abs', 'legs', 'arms']) === null,
        animEngine: typeof buildAnimatedArt === 'function' && typeof EXERCISE_ANIM === 'object' && /sheet-9 art-p1 frame-a/.test(buildAnimatedArt('9 p1 p4', '', 'x')) && /sheet-9 art-p4 frame-b/.test(buildAnimatedArt('9 p1 p4', '', 'x')) && /exercise-art-anim/.test(exercisePicture('Tractions', '', true)),
        zonePlan: typeof buildZonePlan === 'function' && typeof zoneTopExercises === 'function' && !!document.getElementById('zonePlanBtn') && !!document.getElementById('zonePlanDialog') && !!document.getElementById('zonePlanTable'),
        quickSession: typeof quickSessionPlan === 'function' && !!document.getElementById('quickSessionBtn') && !!document.getElementById('quickSessionResult') && (() => { const p = quickSessionPlan(exercises, { minutes: 20, zone: 'abs', maxExercises: 8 }); return p.count >= 1 && p.count <= 8 && p.totalMinutes > 0 && p.exercises.every(x => exerciseZones(x.name).includes('abs')) && quickSessionPlan(exercises, { zone: 'zzz' }).count === 0; })(),
        bodyGoals: typeof bodyGoalWorkout === 'function' && Array.isArray(BODY_GOALS) && BODY_GOALS.length === 7 && document.querySelectorAll('#bodyGoalsBar [data-bodygoal]').length === 7 && (() => { const w = bodyGoalWorkout('abs', exercises, { count: 5 }); const fb = bodyGoalWorkout('fullbody', exercises, { count: 5 }); return w && w.title === 'Abdos béton' && w.exercises.length >= 2 && w.exercises.every(e => exerciseZones(e.name).includes('abs') && e.sets > 0) && bodyGoalWorkout('legs', exercises).exercises.every(e => exerciseZones(e.name).some(z => z === 'legs' || z === 'glutes')) && fb.exercises.length === 5; })(),
        weekProgram: typeof buildTrainingWeek === 'function' && !!document.getElementById('wpGoals') && document.querySelectorAll('#wpGoals input').length === 7 && !!document.getElementById('wpGenerate') && !!document.getElementById('wpSchedule') && !!document.getElementById('wpSameDay'),
        objectiveProgram: typeof objectiveProgram === 'function' && Array.isArray(FITNESS_OBJECTIVES) && FITNESS_OBJECTIVES.length === 5 && !!document.getElementById('objectiveGenerate') && !!document.getElementById('objectiveSelect') && (() => { const p = objectiveProgram('athletique', exercises, { perSession: 5 }); const m = p.week.filter(s => s.kind === 'muscu'); const c = p.week.filter(s => s.kind === 'course'); return p.strength === 3 && p.runs === 3 && p.week.length === 6 && m.length === 3 && c.length === 3 && m.every(s => s.exercises.length >= 3 && s.exercises.every(e => e.sets > 0)) && objectiveProgram('zzz', exercises) === null; })(),
        objectiveProgression: typeof blockPhase === 'function' && typeof progressSets === 'function' && blockPhase(0).phase === 'Base' && blockPhase(3).deload === true && progressSets(3, 1) === 4 && progressSets(3, 3) === 2,
        currentBlock: typeof currentBlock === 'function' && !!document.getElementById('blockStatus') && (() => { const b = currentBlock('2026-07-06', '2026-07-15'); return b && b.week === 2 && b.phase.phase === 'Volume' && b.deloadInWeeks === 2 && currentBlock('2026-07-06', '2026-08-10').done === true && currentBlock('', 'x') === null; })(),
        blockHeadsUp: typeof blockPhaseHeadsUp === 'function' && (() => { const s4 = blockPhaseHeadsUp(currentBlock('2026-07-06', '2026-07-27')); const s3 = blockPhaseHeadsUp(currentBlock('2026-07-06', '2026-07-20')); return s4 && s4.phase === 'deload' && s4.showNextAdvice === true && s3 && s3.phase === 'preload' && s3.showNextAdvice === false && blockPhaseHeadsUp(currentBlock('2026-07-06', '2026-07-06')) === null && blockPhaseHeadsUp(null) === null; })(),
        nextBlockAdvice: typeof nextBlockAdvice === 'function' && nextBlockAdvice({ adherence: 30 }).action === 'ease' && nextBlockAdvice({ adherence: 85, loadStatus: 'push' }).action === 'progress' && nextBlockAdvice({}).action === 'keep',
        blockForecast: typeof bestStrengthForecast === 'function' && (() => { const wo = (date, name, load, reps) => ({ date, exercises: [{ name, setLogs: [{ completed: true, load, reps }] }] }); const workouts = [wo('2026-06-08', 'Squat', 90, 1), wo('2026-06-15', 'Squat', 92.5, 1), wo('2026-06-22', 'Squat', 95, 1), wo('2026-06-29', 'Squat', 97.5, 1)]; const f = bestStrengthForecast(workouts, { step: 5, todayKey: '2026-06-29' }); return f && f.exercise === 'Squat' && f.milestone === 100 && f.weeks === 1 && bestStrengthForecast([], {}) === null; })(),
        blockNeglect: typeof neglectedZoneReport === 'function' && (() => { const w = [{ date: '2026-07-10', exercises: [{ name: 'Fentes arrière', completedSets: 4 }, { name: 'Pont fessier', completedSets: 4 }] }, { date: '2026-07-06', exercises: [{ name: 'Chaise au mur', completedSets: 4 }] }]; const r = neglectedZoneReport(w, '2026-07-13', 28); return r && r.sets === 0 && r.neglected === true && r.bySets.legs > 0 && neglectedZoneReport([], '2026-07-13') === null; })(),
        blockPushPull: typeof pushPullAdvice === 'function' && typeof muscleBalance === 'function' && (() => { const heavy = pushPullAdvice({ push: 8, pull: 3, ratio: 2.67, zone: 'push-heavy' }); const bal = pushPullAdvice({ push: 6, pull: 6, ratio: 1, zone: 'balanced' }); return heavy && heavy.ok === false && /tirage|dos/i.test(heavy.advice) && bal.ok === true && pushPullAdvice({ push: 2, pull: 1, zone: 'push-heavy' }) === null && pushPullAdvice(null) === null; })(),
        blockPlateau: typeof strengthPlateauAny === 'function' && (() => { const wo = (date, name, load, reps) => ({ date, exercises: [{ name, setLogs: [{ completed: true, load, reps }] }] }); const flat = [wo('2026-06-01', 'Squat', 100, 5), wo('2026-06-08', 'Squat', 98, 5), wo('2026-06-15', 'Squat', 99, 5), wo('2026-06-22', 'Squat', 97, 5)]; const up = [wo('2026-06-01', 'Squat', 90, 5), wo('2026-06-08', 'Squat', 95, 5), wo('2026-06-15', 'Squat', 100, 5), wo('2026-06-22', 'Squat', 105, 5)]; const r = strengthPlateauAny(flat, { window: 3 }); return r.plateau === true && r.exercise === 'Squat' && strengthPlateauAny(up, { window: 3 }).plateau === false && strengthPlateauAny([]).plateau === false && nextBlockAdvice({ adherence: 80, loadStatus: 'maintain', plateau: r.plateau }).action === 'vary'; })(),
        phaseSetsForDay: typeof phaseSetsForDay === 'function' && phaseSetsForDay(3, '2026-07-06', '2026-07-15') === 4 && phaseSetsForDay(3, '2026-07-06', '2026-07-29') === 2 && phaseSetsForDay(3, '', '2026-07-15') === 3,
        blockHistory: typeof archiveBlock === 'function' && typeof blockHistorySummary === 'function' && !!document.getElementById('blockHistory') && (() => { let h = archiveBlock([], { objective: 'seche', start: '2026-05-04', weeks: 4 }); h = archiveBlock(h, { objective: 'muscle', start: '2026-06-01', weeks: 4 }); const s = blockHistorySummary(h); return h.length === 2 && s.count === 2 && s.last.objective === 'muscle' && blockHistorySummary([]) === null; })(),
        blockCompare: typeof blockComparison === 'function' && typeof blockWindowStats === 'function' && !!document.getElementById('blockCompare') && (() => { const wo = (date, load, reps) => ({ date, exercises: [{ name: 'Squat', setLogs: [{ completed: true, load, reps }] }] }); const workouts = [wo('2026-05-06', 20, 10), wo('2026-05-20', 20, 10), wo('2026-06-03', 30, 10), wo('2026-06-10', 30, 10), wo('2026-06-20', 30, 10)]; const hist = [{ objective: 'seche', start: '2026-05-04', end: '2026-05-31', weeks: 4 }, { objective: 'muscle', start: '2026-06-01', end: '2026-06-28', weeks: 4 }]; const c = blockComparison(hist, workouts); return c && c.blocks === 2 && c.first.tonnage === 400 && c.last.tonnage === 900 && c.tonnagePct === 125 && c.trend === 'up' && blockComparison(hist.slice(0, 1), workouts) === null && blockWindowStats(workouts, '2026-05-01', '2026-05-31').sessions === 2; })(),
        blockShare: typeof shareableBlockProgress === 'function' && typeof blockProgressText === 'function' && (() => { const wo = (date, name, load, reps) => ({ date, exercises: [{ name, setLogs: [{ completed: true, load, reps }] }] }); const workouts = [wo('2026-05-06', 'Squat', 60, 5), wo('2026-06-03', 'Squat', 75, 5)]; const hist = [{ objective: 'seche', start: '2026-05-04', end: '2026-05-31', weeks: 4 }, { objective: 'muscle', start: '2026-06-01', end: '2026-06-28', weeks: 4 }]; const s = shareableBlockProgress(hist, workouts); return s && /progression/i.test(s.title) && /2 blocs/i.test(s.text) && shareableBlockProgress(hist.slice(0, 1), workouts) === null; })(),
        blockExProgress: typeof blockExerciseProgress === 'function' && typeof bestE1rmByExercise === 'function' && (() => { const wo = (date, name, load, reps) => ({ date, exercises: [{ name, setLogs: [{ completed: true, load, reps }] }] }); const workouts = [wo('2026-05-06', 'Squat', 60, 5), wo('2026-06-03', 'Squat', 75, 5)]; const hist = [{ objective: 'muscle', start: '2026-05-04', end: '2026-05-31', weeks: 4 }, { objective: 'muscle', start: '2026-06-01', end: '2026-06-28', weeks: 4 }]; const p = blockExerciseProgress(hist, workouts); return p.length === 1 && p[0].name === 'Squat' && p[0].firstE1rm === 70 && p[0].lastE1rm === 87.5 && p[0].deltaPct === 25 && blockExerciseProgress(hist.slice(0, 1), workouts).length === 0; })(),
        objectiveMemory: !!document.getElementById('objectiveSelect') && 'fitnessObjective' in state && 'objectiveSeed' in state && (() => { const p0 = objectiveProgram('muscle', exercises, { perSession: 5, seed: 0 }); const p1 = objectiveProgram('muscle', exercises, { perSession: 5, seed: 1 }); const names = pr => pr.week.filter(s => s.kind === 'muscu').map(s => s.exercises.map(e => e.name).join(',')).join('|'); return names(p0) !== names(p1); })(),
        objectiveRuns: (() => { const t = pr => pr.week.filter(s => s.kind === 'course').map(s => s.type); const s = objectiveProgram('seche', exercises); const m = objectiveProgram('muscle', exercises); return s.runFocus === 'tempo & fractionné' && (t(s).includes('fractionne') || t(s).includes('tempo')) && t(m).every(x => x === 'facile'); })(),
        objectiveSummary: typeof programWeekSummary === 'function' && (() => { const p = objectiveProgram('athletique', exercises); const s = programWeekSummary(p.week); return s.sessions === p.week.length && s.muscu === 3 && s.course === 3 && s.minutes > 0 && s.hours > 0; })(),
        objectiveCopy: typeof objectiveProgramText === 'function' && (() => { const p = objectiveProgram('athletique', exercises); const txt = objectiveProgramText(p); return txt.includes('Corps athlétique') && txt.includes('🏋️') && objectiveProgramText(null) === ''; })(),
        objectiveShare: typeof shareableProgram === 'function' && (() => { const p = objectiveProgram('athletique', exercises); const s = shareableProgram(p); return s && /Corps athlétique/.test(s.title) && /ma semaine/i.test(s.title) && s.text === objectiveProgramText(p) && shareableProgram(null) === null; })(),
        a11yObjective: (() => { const sel = document.getElementById('objectiveSelect'), res = document.getElementById('objectiveResult'), rp = document.getElementById('runPlanResult'); return !!sel && (sel.getAttribute('aria-label') || '').length > 3 && !!res && res.getAttribute('aria-live') === 'polite' && !!rp && rp.getAttribute('aria-live') === 'polite'; })(),
        selectStyled: (() => { const s = document.getElementById('objectiveSelect'); if (!s) return false; const cs = getComputedStyle(s); return (cs.appearance === 'none' || cs.webkitAppearance === 'none') && cs.backgroundImage.indexOf('svg') !== -1; })(),
        scrollbarStyled: (() => { const thin = getComputedStyle(document.body).scrollbarWidth === 'thin'; let rule = false; try { for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch (e) { continue; } for (const r of rules) { if (r.selectorText && r.selectorText.indexOf('-webkit-scrollbar') !== -1) { rule = true; } } } } catch (e) {} return thin || rule; })(),
        inputPolish: (() => { const cb = document.getElementById('wpSameDay'); const ok = cb ? getComputedStyle(cb).accentColor !== 'auto' : false; let rule = false; try { for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch (e) { continue; } for (const r of rules) { if (r.selectorText && r.selectorText.indexOf('focus-visible') !== -1) { rule = true; } } } } catch (e) {} return ok || rule; })(),
        streakMilestone: typeof nextStreakMilestone === 'function' && !!document.getElementById('streakHint') && nextStreakMilestone(5).milestone === 7 && nextStreakMilestone(5).remaining === 2 && nextStreakMilestone(365) === null,
        wellness: typeof wellnessRoutine === 'function' && Array.isArray(WELLNESS_ROUTINES) && WELLNESS_ROUTINES.length >= 5 && !!document.getElementById('wellnessBar') && document.querySelectorAll('#wellnessBar [data-wellness]').length >= 5 && (() => { const r = wellnessRoutine('cooldown'); return r && r.exercises.length >= 3 && r.exercises.every(e => e.unit === 'sec') && wellnessRoutine('zzz') === null && document.querySelectorAll('#wellnessBar [data-wellness-sched]').length >= 5 && typeof wellnessRecurringEvent === 'function' && wellnessRecurringEvent('cooldown').refId === 'wellness-cooldown' && wellnessRecurringEvent('cooldown').kind === 'sport'; })(),
        wellnessSuggest: typeof suggestedRoutine === 'function' && !!document.getElementById('wellnessSuggest') && suggestedRoutine('deload', 40).key === 'cooldown' && suggestedRoutine('push', 85).key === 'warmup' && !!wellnessRoutine(suggestedRoutine('maintain', 60).key),
        wellnessRoutineShare: typeof shareableRoutine === 'function' && (() => { const s = shareableRoutine('warmup'); return s && /routine bien-être/i.test(s.title) && /1\. /.test(s.text) && shareableRoutine('zzz') === null; })(),
        wellnessContext: typeof contextualWellnessRoutine === 'function' && typeof workoutDominantZone === 'function' && (() => { const legs = { workouts: [{ date: '2026-07-13', type: 'strength', exercises: [{ name: 'Split squat bulgare' }, { name: 'Fentes arrière' }] }] }; const run = { workouts: [{ date: '2026-07-13', type: 'run' }] }; return contextualWellnessRoutine(legs, '2026-07-13', 'maintain', 60).key === 'hips' && contextualWellnessRoutine(run, '2026-07-13', 'maintain', 60).key === 'ankles' && contextualWellnessRoutine({ workouts: [] }, '2026-07-13', 'maintain', 40).key === 'cooldown' && workoutDominantZone(legs.workouts[0]) === 'legs'; })(),
        wellnessStreak: typeof wellnessStreak === 'function' && typeof logWellnessDone === 'function' && typeof wellnessCountInWindow === 'function' && !!document.getElementById('wellnessStreak') && 'wellnessDone' in state && (() => { let l = logWellnessDone([], 'hips', '2026-07-12'); l = logWellnessDone(l, 'warmup', '2026-07-13'); return l.length === 2 && wellnessStreak(l, '2026-07-13') === 2 && wellnessCountInWindow(l, '2026-07-06', '2026-07-13') === 2; })(),
        wellnessMinutes: typeof wellnessMinutesForKey === 'function' && typeof wellnessMinutesInWindow === 'function' && (() => { const log = [{ date: '2026-07-13', key: 'hips' }, { date: '2026-07-13', key: 'warmup' }, { date: '2026-07-05', key: 'stretch' }]; return wellnessMinutesForKey('hips') === 6 && wellnessMinutesForKey('parcours-reveil') === wellnessParcours('reveil').minutes && wellnessMinutesForKey('zzz') === 0 && wellnessMinutesInWindow(log, '2026-07-06', '2026-07-13') === 11 && wellnessMinutesInWindow([], '2026-07-06', '2026-07-13') === 0; })(),
        wellnessZone: typeof neglectedMobilityZone === 'function' && Array.isArray(WELLNESS_ZONE_ROUTINES) && !!document.getElementById('wellnessZone') && (() => { const n0 = neglectedMobilityZone([], '2026-07-13', 7); const mixed = [{ date: '2026-07-11', key: 'hips' }, { date: '2026-07-10', key: 'shoulders' }, { date: '2026-07-09', key: 'backpain' }, { date: '2026-06-20', key: 'ankles' }, { date: '2026-07-08', key: 'neck' }, { date: '2026-07-07', key: 'wrists' }]; const nm = neglectedMobilityZone(mixed, '2026-07-13', 7); return n0.key === 'hips' && n0.lastDays === null && !!n0.emoji && nm.key === 'ankles' && nm.lastDays === 23; })(),
        wellnessFamilies: typeof wellnessFamilyBreakdown === 'function' && !!document.getElementById('wellnessFamilies') && (() => { const log = [{ date: '2026-07-13', key: 'hips' }, { date: '2026-07-12', key: 'neck' }, { date: '2026-07-11', key: 'stretch' }, { date: '2026-07-13', key: 'zzz' }]; const b = wellnessFamilyBreakdown(log, '2026-07-06', '2026-07-13'); return b[0].family === 'Mobilité' && b[0].count === 2 && !!b[0].emoji && b.reduce((s, x) => s + x.count, 0) === 3 && wellnessFamilyBreakdown([], '2026-07-06', '2026-07-13').length === 0; })(),
        shareableWellness: typeof shareableWellness === 'function' && !!document.getElementById('wellnessShareBtn') && (() => { const log = [{ date: '2026-07-11', key: 'hips' }, { date: '2026-07-12', key: 'neck' }, { date: '2026-07-13', key: 'warmup' }]; const s = shareableWellness(log, '2026-07-13'); return s && /bilan bien-être/i.test(s.title) && /3 routines au total/.test(s.text) && /min de mobilité/.test(s.text) && shareableWellness([], '2026-07-13') === null; })(),
        bestWellnessWeek: typeof bestWellnessWeek === 'function' && (() => { const log = [{ date: '2026-07-06', key: 'hips' }, { date: '2026-07-07', key: 'neck' }, { date: '2026-07-08', key: 'warmup' }, { date: '2026-07-13', key: 'morning' }]; const b = bestWellnessWeek(log, '2026-07-13'); return b.weekStart === '2026-07-06' && b.count === 3 && b.isCurrent === false && bestWellnessWeek([], '2026-07-13') === null; })(),
        wellnessBestStreak: typeof wellnessBestStreak === 'function' && (() => { const log = [{ date: '2026-06-01', key: 'a' }, { date: '2026-06-02', key: 'b' }, { date: '2026-06-03', key: 'c' }, { date: '2026-06-04', key: 'd' }, { date: '2026-07-13', key: 'e' }]; return wellnessBestStreak(log) === 4 && wellnessBestStreak([{ date: '2026-07-13', key: 'a' }, { date: '2026-07-13', key: 'b' }]) === 1 && wellnessBestStreak([{ date: '2026-04-31', key: 'a' }, { date: '2026-05-02', key: 'b' }]) === 1 && wellnessBestStreak([]) === 0; })(),
        wellnessGoal: typeof wellnessGoalProgress === 'function' && !!document.getElementById('wellnessGoal') && 'wellnessWeeklyGoal' in state && (() => { const g = wellnessGoalProgress(2, 3); return g.done === 2 && g.pct === 67 && g.reached === false && wellnessGoalProgress(4, 3).reached === true && wellnessGoalProgress(0, 99).target === 14; })(),
        wellnessNudge: typeof wellnessInactivity === 'function' && !!document.getElementById('wellnessNudge') && (() => { const r = wellnessInactivity([{ date: '2026-07-08', key: 'a' }], '2026-07-13', 3); return r.inactive === true && r.days === 5 && wellnessInactivity([{ date: '2026-07-12', key: 'a' }], '2026-07-13', 3).inactive === false && wellnessInactivity([], '2026-07-13').days === null; })(),
        wellnessBadges: typeof wellnessBadges === 'function' && typeof newWellnessBadge === 'function' && (() => { const three = [{ date: '2026-07-11', key: 'a' }, { date: '2026-07-12', key: 'b' }, { date: '2026-07-13', key: 'c' }]; const b = wellnessBadges(three, '2026-07-13'); const b0 = wellnessBadges([], '2026-07-13'); return b.streakBadge.days === 3 && b.totalBadge === null && b.nextStreak.days === 7 && newWellnessBadge(b0, b).kind === 'streak' && newWellnessBadge(b, b) === null; })(),
        wellnessHeatmap: typeof wellnessWeekHeatmap === 'function' && !!document.getElementById('wellnessHeatmap') && (() => { const h = wellnessWeekHeatmap([{ date: '2026-07-13', key: 'a' }, { date: '2026-07-13', key: 'b' }, { date: '2026-07-11', key: 'c' }], '2026-07-13', 7); return h.length === 7 && h[6].count === 2 && h[6].date === '2026-07-13' && h.find(c => c.date === '2026-07-11').count === 1 && wellnessWeekHeatmap([], 'x', 7).length === 0; })(),
        wellnessParcours: typeof wellnessParcours === 'function' && !!document.getElementById('wellnessParcours') && document.querySelectorAll('#wellnessParcours [data-parcours]').length >= 3 && (() => { const p = wellnessParcours('reveil'); return p && p.count === 2 && p.exercises.length >= 6 && p.minutes > 0 && wellnessParcours('zzz') === null; })(),
        shareApp: typeof shareAppPayload === 'function' && !!document.getElementById('shareAppBtn') && (() => { const p = shareAppPayload('https://adrienlvl.github.io/irl-lvp-up/'); return p.title && /RPG de vie|IRL LVP UP/.test(p.text) && p.url === 'https://adrienlvl.github.io/irl-lvp-up/' && !('url' in shareAppPayload('file:///x')) && !('url' in shareAppPayload('')); })(),
        membership: typeof membershipInfo === 'function' && Array.isArray(MEMBERSHIP_TIERS) && !!document.getElementById('membershipLine') && (() => { const d0 = membershipInfo('2026-07-13', '2026-07-13'); const d10 = membershipInfo('2026-07-03', '2026-07-13'); return d0.days === 0 && d0.tier.label === 'Nouveau' && d0.next.days === 7 && d10.days === 10 && d10.tier.label === 'Lancé' && d10.next.remaining === 20 && membershipInfo('x', 'y') === null; })(),
        launchTarget: typeof launchTarget === 'function' && Array.isArray(LAUNCH_TARGETS) && LAUNCH_TARGETS.includes('wellness') && LAUNCH_TARGETS.includes('today') && launchTarget('?go=wellness') === 'wellness' && launchTarget('?go=today') === 'today' && launchTarget('?go=coach') === 'coach' && launchTarget('?go=hack') === null && launchTarget('') === null && !!document.querySelector('.wellness-panel') && !!document.querySelector('.my-day-panel'),
        coachTargetEditable: (() => {
          // Foyer UNIQUE de la cible de poids = panneau « Mon plan ». On verrouille : le champ y
          // existe et l'éditer ENREGISTRE ; et le doublon d'« Objectifs hebdomadaires »
          // (#targetWeight) a bien été retiré + un renvoi (#goToPlanFromGoals) le remplace.
          const f = document.getElementById("coachTarget");
          if (!f || !f.closest(".coach-weight-panel")) return false;
          const doublonRetire = !document.getElementById("targetWeight") && !!document.getElementById("goToPlanFromGoals");
          f.value = "72";
          f.dispatchEvent(new Event("change", { bubbles: true }));
          const enregistre = String(JSON.parse(localStorage.getItem("irl-level-up")).goals.targetWeight) === "72";
          const conseil = document.getElementById("coachTargetAdvice");
          return doublonRetire && enregistre && !!conseil && !conseil.hidden;
        })(),
        whatsNew: typeof whatsNewSince === 'function' && typeof compareVersions === 'function' && typeof CHANGELOG !== 'undefined' && !!document.getElementById('whatsNewCard') && (() => { const log = [{ v: '1.9.190', emoji: '✨', text: 'C' }, { v: '1.9.189', emoji: '📈', text: 'B' }, { v: '1.9.188', emoji: '🧘', text: 'A' }]; const seen = whatsNewSince('1.9.188', log); return compareVersions('1.10.0', '1.9.99') === 1 && whatsNewSince('', log).length === 0 && seen.length === 2 && seen[0].v === '1.9.190' && whatsNewSince('1.9.190', log).length === 0 && Array.isArray(CHANGELOG) && CHANGELOG[0].v === '2.0.126'; })(),
        ageLabel: typeof ageLabel === 'function' && ageLabel(1) === '1 an' && ageLabel(2) === '2 ans' && ageLabel(0) === '0 an' && ageLabel(null) === '' && ageLabel('x') === '',
        ageLabelList: typeof renderBirthdays === 'function' && !!document.getElementById('birthdayList') && (() => {
          // La liste de gestion des anniversaires doit accorder l'âge au singulier (« 1 an »),
          // comme le bandeau « À venir » et le calendrier mensuel (tous via ageLabel) — pas « 1 ans ».
          const saved = state.birthdays;
          const y1 = new Date().getFullYear() - 1;
          state.birthdays = [{ id: 90101, name: 'Bebe', day: 5, month: 3, year: y1 }];
          renderBirthdays();
          const html = document.getElementById('birthdayList').innerHTML;
          state.birthdays = saved; renderBirthdays();
          return html.indexOf('1 an<') !== -1 && html.indexOf('1 ans') === -1;
        })(),
        photoCompareDelta: typeof renderGrowth === 'function' && !!document.getElementById('photoCompare') && (() => {
          // L'écart entre deux photos doit accorder « jour » au singulier à 1 jour (« 1 jour d’écart »),
          // pas « 1 jours » — même filon d’accord de libellé que ageLabel (helper appliqué / ternaire).
          const savedP = state.photos, savedW = state.weights;
          state.photos = [{ id: 1, date: '2026-07-01', file: 'a' }, { id: 2, date: '2026-07-02', file: 'b' }];
          state.weights = [];
          renderGrowth();
          const html = document.getElementById('photoCompare').innerHTML;
          state.photos = savedP; state.weights = savedW; renderGrowth();
          return html.indexOf('1 jour d’écart') !== -1 && html.indexOf('1 jours') === -1;
        })(),
        objectiveRunPlural: typeof runObjectiveProgram === 'function' && !!document.getElementById('objectiveResult') && !!document.getElementById('objectiveSelect') && (() => {
          // L'en-tête du programme auto doit accorder « course » au pluriel quand l'objectif a
          // plusieurs runs/sem. (Perte de gras = 4) : « 4 courses/sem. », jamais « 4 course/sem. ».
          const savedObj = state.fitnessObjective, savedSeed = state.objectiveSeed;
          const sel = document.getElementById('objectiveSelect'), savedVal = sel.value;
          sel.value = 'seche';
          runObjectiveProgram();
          const html = document.getElementById('objectiveResult').innerHTML;
          sel.value = savedVal; state.fitnessObjective = savedObj; state.objectiveSeed = savedSeed; runObjectiveProgram();
          return html.indexOf('4 courses/sem.') !== -1 && html.indexOf('4 course/sem.') === -1;
        })(),
        dashboardInputLabels: (() => {
          // A11y : les champs du tableau de bord au placeholder seul (sans <label> englobant)
          // doivent exposer un nom accessible programmatique via aria-label — le placeholder
          // disparait a la saisie et n'est pas un nom fiable pour les lecteurs d'ecran (WCAG 3.3.2).
          const ids = ['todoInput', 'habitInput', 'lifeGoalOne', 'lifeGoalTwo', 'lifeGoalThree', 'focusTaskInput'];
          return ids.every(id => { const el = document.getElementById(id); return el && (el.getAttribute('aria-label') || '').trim().length > 0; });
        })(),
        calorieFloor: typeof calorieAdjustment === 'function' && (() => { const flat = [{ date: '2026-06-21', value: 80 }, { date: '2026-07-01', value: 80.1 }, { date: '2026-07-12', value: 80 }]; const near = calorieAdjustment(flat, 'perte', 1250); const norm = calorieAdjustment(flat, 'perte', 2000); const floor = calorieAdjustment(flat, 'perte', 1200); return near.newTarget === 1200 && near.delta === 50 && near.message.indexOf('50 kcal/jour') !== -1 && near.message.indexOf('125 kcal') === -1 && norm.delta === 125 && norm.newTarget === 1875 && floor.delta === 0 && floor.newTarget === 1200 && floor.message.indexOf('plancher') !== -1; })(),
        tonnageTrend: typeof weeklyTonnageTrend === 'function' && !!document.getElementById('tonnageTrend') && (() => { const w = [{ date: '2026-07-06', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 4 }] }, { date: '2026-07-13', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 6 }] }]; const t = weeklyTonnageTrend(w, '2026-07-13', 8); return t && t.weeks.length === 8 && t.weeks[7].tonnage === 3000 && t.last === 3000 && t.max === 3000 && t.trend === 'up' && weeklyTonnageTrend([], '2026-07-13', 8) === null; })(),
        blocksByObjective: typeof blocksByObjective === 'function' && !!document.getElementById('blocksByObjective') && (() => { const wo = (date, load, reps) => ({ date, exercises: [{ name: 'Squat', setLogs: [{ completed: true, load, reps }] }] }); const workouts = [wo('2026-05-06', 20, 10), wo('2026-06-03', 30, 10), wo('2026-06-10', 30, 10)]; const history = [{ objective: 'seche', start: '2026-05-04', end: '2026-05-31', weeks: 4 }, { objective: 'muscle', start: '2026-06-01', end: '2026-06-28', weeks: 4 }]; const r = blocksByObjective(history, workouts); return r.length === 2 && r[0].objective === 'muscle' && r[0].blocks === 1 && r[0].sessions === 2 && blocksByObjective([], workouts).length === 0; })(),
        bestSession: typeof bestSessionTonnage === 'function' && (() => { const w = [{ date: '2026-06-20', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 8 }] }, { date: '2026-07-01', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 6 }] }]; const b = bestSessionTonnage(w); return b.tonnage === 4000 && b.date === '2026-06-20' && b.count === 2 && b.isLatest === false && bestSessionTonnage([]) === null; })(),
        bestTonnageWeek: typeof bestTonnageWeek === 'function' && (() => { const w = [{ date: '2026-07-06', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] }, { date: '2026-07-08', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] }, { date: '2026-07-13', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 6 }] }]; const b = bestTonnageWeek(w, '2026-07-13'); return b.weekStart === '2026-07-06' && b.tonnage === 5000 && b.sessions === 2 && b.isCurrent === false && bestTonnageWeek([], '2026-07-13') === null; })(),
        runWeekGoal: typeof runWeekGoal === 'function' && !!document.getElementById('runWeekGoal') && (() => { const w = [{ type: 'run', date: '2026-07-13', distance: 8 }, { type: 'run', date: '2026-07-06', distance: 15 }]; const g = runWeekGoal(w, '2026-07-13', 20); return g.km === 8 && g.pct === 40 && g.remaining === 12 && g.reached === false && runWeekGoal([{ type: 'run', date: '2026-07-13', distance: 25 }], '2026-07-13', 20).reached === true && runWeekGoal(w, '2026-07-13', 0) === null; })(),
        weekBalance: typeof weekTrainingBalance === 'function' && !!document.getElementById('weekBalance') && (() => { const w = [{ date: '2026-07-13', exercises: [{ name: 'Squat', load: 100, reps: 5, sets: 5 }] }, { date: '2026-07-12', type: 'strength', exercises: [{ name: 'Dev', load: 60, reps: 8, sets: 4 }] }, { date: '2026-07-13', type: 'run' }, { date: '2026-07-10', type: 'run' }]; const b = weekTrainingBalance(w, '2026-07-13', 7); return b.strength === 2 && b.runs === 2 && b.total === 4 && b.label === 'Bon équilibre' && weekTrainingBalance([], '2026-07-13', 7) === null; })(),
        trainingByWeekday: typeof trainingByWeekday === 'function' && !!document.getElementById('trainingByWeekday') && (() => { const w = [{ date: '2026-07-13' }, { date: '2026-07-07' }, { date: '2026-06-30' }, { date: '2026-07-08' }]; const r = trainingByWeekday(w, '2026-07-13', 56); return r.bestDay === 1 && r.bestCount === 2 && r.total === 4 && JSON.stringify(r.counts) === JSON.stringify([1, 2, 1, 0, 0, 0, 0]) && trainingByWeekday([], '2026-07-13', 56).bestDay === null; })(),
        trainingConsistency: typeof trainingConsistency === 'function' && !!document.getElementById('trainingConsistency') && (() => { const reg = [{ date: '2026-07-01' }, { date: '2026-07-04' }, { date: '2026-07-07' }, { date: '2026-07-10' }, { date: '2026-07-13' }]; const c = trainingConsistency(reg, '2026-07-13', 28); return c.sessions === 5 && c.avgGapDays === 3 && c.regularity === 100 && c.label === 'Très régulier' && trainingConsistency([{ date: '2026-07-13' }], '2026-07-13') === null; })(),
        wellnessExpress: typeof expressRoutine === 'function' && !!document.getElementById('wellnessExpress') && document.querySelectorAll('#wellnessExpress [data-wx]').length >= 3 && (() => { const keys4 = routinesByTimeBudget(4).map(r => r.key); const ok = [0, 1, 2, 3, 4].every(s => keys4.includes(expressRoutine(4, null, s))); return ok && expressRoutine(6, null, 7) === expressRoutine(6, null, 7) && expressRoutine(1, null, 3) === null && !!wellnessRoutine(expressRoutine(8, null, 5)).exercises.length; })(),
        wellnessTimeFilter: typeof routinesByTimeBudget === 'function' && !!document.getElementById('wellnessTimeFilter') && document.querySelectorAll('#wellnessTimeFilter [data-wtf]').length >= 4 && document.querySelectorAll('#wellnessBar [data-wellness]').length === WELLNESS_ROUTINES.length && (() => { const all = routinesByTimeBudget(0), q = routinesByTimeBudget(4); return all.length === WELLNESS_ROUTINES.length && q.length > 0 && q.length < all.length && q.every(r => r.minutes <= 4) && q[0].minutes >= q[q.length - 1].minutes && !routinesByTimeBudget(6).some(r => r.key === 'stretch') && routinesByTimeBudget(8).some(r => r.key === 'stretch'); })(),
        wellnessSurprise: typeof surpriseRoutine === 'function' && !!document.getElementById('wellnessSurprise') && WELLNESS_ROUTINES.length >= 11 && !!wellnessRoutine('ankles') && !!wellnessRoutine('neck') && !!wellnessRoutine('wrists') && WELLNESS_ROUTINES.map(r => r.key).includes(surpriseRoutine(null, 5)) && surpriseRoutine('warmup', 3) !== 'warmup' && surpriseRoutine(null, 7) === surpriseRoutine(null, 7),
        replayOnboarding: !!document.getElementById('settingsReplayOnboarding'),
        onboardingSetup: typeof onboardingSetup === 'function' && !!document.getElementById('onboardingObjective') && !!document.getElementById('onbWeight') && !!document.getElementById('onbSex') && !!document.getElementById('onbTargetWeight') && !!document.getElementById('onbDistance') && !!document.getElementById('onbActivity') && !!document.getElementById('onbName') && !!document.getElementById('playerName') && (() => { const s = onboardingSetup({ name: '  Adrien  ', weight: 80, height: 178, age: 30, sex: 'homme', objective: 'muscle', sessions: 4, targetWeight: 75, distance: 25, activity: 'actif', equipment: { kettlebell: true } }); return s.fitnessObjective === 'muscle' && s.profile.weight === 80 && s.goals.sessions === 4 && s.goals.targetWeight === 75 && s.goals.distance === 25 && s.profile.activityLevel === 'actif' && s.profile.name === 'Adrien' && onboardingSetup({ name: 42 }).profile.name === '' && s.profile.equipment.kettlebell === true && !!document.getElementById('onbLimitations') && !!document.getElementById('limitationsNote') && onboardingSetup({ limitations: '  genou  ' }).profile.limitations === 'genou' && onboardingSetup({ limitations: 7 }).profile.limitations === ''; })(),
        onboardingDays: typeof assignProgramDays === 'function' && document.querySelectorAll('#onbDays input[type=checkbox]').length === 7 && (() => { const s = onboardingSetup({ objective: 'seche', days: [5, 2, 2] }); if (JSON.stringify(s.profile.availableDays) !== '[2,5]') return false; const w = [{ kind: 'muscu', weekday: 1 }, { kind: 'course', weekday: 3 }, { kind: 'muscu', weekday: 5 }]; const r = assignProgramDays(w, [2, 5]); return r.length === 3 && r.every(x => x.weekday === 2 || x.weekday === 5) && JSON.stringify(assignProgramDays(w, []).map(x => x.weekday)) === '[1,3,5]'; })(),
        onboardingMeter: typeof onboardingCompleteness === 'function' && !!document.getElementById('onboardingMeter') && (() => { const f = onboardingCompleteness({ objective: 'muscle', weight: 80, height: 178, age: 30, days: [1, 3], slot: 'soir' }); const m = onboardingCompleteness({ objective: 'muscle' }); return f.percent === 100 && f.nutritionReady === true && m.nutritionReady === false && m.missing.includes('poids'); })(),
        onboardingCalories: typeof onboardingNutritionEstimate === 'function' && !!document.getElementById('onboardingCalories') && (() => { const e = onboardingNutritionEstimate({ objective: 'seche', weight: 80, height: 178, age: 30, sex: 'homme', sessions: 4 }); return e && e.maintenance > 0 && e.target > 0 && e.target < e.maintenance && e.dir === 'déficit' && onboardingNutritionEstimate({ objective: 'seche', weight: 80 }) === null; })(),
        starterHabit: typeof starterHabitFor === 'function' && !!document.getElementById('onbStarterHabit') && !!document.getElementById('onbStarterHabitLabel') && (() => { const h = starterHabitFor('seche'); return /eau/i.test(h.name) && h.weekdays.length === 7 && starterHabitFor('zzz').name === STARTER_HABITS.athletique.name && normalizeHabit(starterHabitFor('muscle')).weekdays.length === 7; })(),
        onboardingSuggest: typeof suggestObjective === 'function' && !!document.getElementById('onboardingSuggest') && (() => { const cut = suggestObjective({ weight: 90, height: 178, targetWeight: 80 }); return cut.key === 'seche' && suggestObjective({ weight: 65, height: 180, targetWeight: 72 }).key === 'muscle' && suggestObjective({ weight: 72, height: 178 }).key === 'athletique' && suggestObjective({ weight: 52, height: 180 }).key === 'muscle' && suggestObjective({ weight: 80 }) === null; })(),
        onboardingDraft: typeof sanitizeOnboardingDraft === 'function' && !!document.getElementById('onbDraftNote') && !!document.getElementById('onbDraftClear') && (() => { const d = sanitizeOnboardingDraft({ objective: 'seche', weight: '80', slot: 'matin', days: [1, 1, 9] }); return d && d.objective === 'seche' && d.weight === 80 && d.slot === 'matin' && JSON.stringify(d.days) === '[1]' && sanitizeOnboardingDraft({}) === null && sanitizeOnboardingDraft({ objective: 'zzz' }) === null; })(),
        onboardingRecap: typeof onboardingFirstSession === 'function' && !!document.getElementById('onboardingRecapDialog') && !!document.getElementById('onboardingRecapBody') && (() => { const week = [{ kind: 'course', title: 'Run', weekday: 5 }, { kind: 'muscu', title: 'Jambes', weekday: 1, exercises: [{ name: 'Squat', sets: 3, reps: 10 }] }]; const f = onboardingFirstSession(week, '2026-07-13'); return f.title === 'Jambes' && f.date === '2026-07-13' && f.dayLabel === 'Lundi' && f.guidable === true && onboardingFirstSession([], '2026-07-13') === null; })(),
        onboardingSlot: typeof sessionTimesForSlot === 'function' && !!document.getElementById('onbSlot') && (() => { const t = sessionTimesForSlot('matin'); const d = sessionTimesForSlot(''); return t.muscu === '07:00' && t.course === '07:30' && d.muscu === '18:00' && d.course === '07:30' && onboardingSetup({ slot: 'soir' }).profile.trainingSlot === 'soir' && onboardingSetup({ slot: 'x' }).profile.trainingSlot === ''; })(),
        onboardingLevel: typeof perSessionForLevel === 'function' && !!document.getElementById('onbLevel') && perSessionForLevel('debutant') === 4 && perSessionForLevel('avance') === 6 && perSessionForLevel('x') === 5 && onboardingSetup({ level: 'avance' }).profile.level === 'avance' && onboardingSetup({ level: 'zzz' }).profile.level === 'debutant',
        starterChecklist: typeof starterChecklist === 'function' && !!document.getElementById('starterCard') && (() => { const s = starterChecklist({ fitnessObjective: 'seche', blockStart: '2026-07-13', weights: [{ value: 80 }], workouts: [{}], nutrition: [{ date: '2026-07-13', water: 5 }], quests: [{ done: true }] }, '2026-07-13'); return s.total === 6 && s.done === 6 && s.complete === true && starterChecklist({}).done === 0; })(),
        objectiveWelcome: typeof objectiveWelcome === 'function' && !!document.getElementById('onboardingWelcome') && objectiveWelcome('muscle') !== objectiveWelcome('seche') && objectiveWelcome('zzz') === objectiveWelcome('athletique') && objectiveWelcome('endurance').length > 20,
        wakeLock: typeof shouldReacquireWakeLock === 'function' && shouldReacquireWakeLock(true, 'visible') === true && shouldReacquireWakeLock(true, 'hidden') === false && shouldReacquireWakeLock(false, 'visible') === false && typeof requestGuidedWakeLock === 'function' && typeof releaseGuidedWakeLock === 'function',
        appBadge: typeof pendingBadgeCount === 'function' && typeof updateAppBadge === 'function' && pendingBadgeCount({ quests: [{ done: false }, { done: true }], agenda: [{ date: '2026-07-13', kind: 'sport' }] }, '2026-07-13') === 2 && pendingBadgeCount({}, '2026-07-13') === 0,
        haptics: typeof vibrationPattern === 'function' && typeof haptic === 'function' && Array.isArray(vibrationPattern('restEnd')) && vibrationPattern('setDone')[0] === 40 && vibrationPattern('zzz') === null && vibrationPattern('record').length >= 3 && Array.isArray(vibrationPattern('badge')) && Array.isArray(vibrationPattern('questDone')),
        safeArea: (() => { const vp = document.querySelector('meta[name=viewport]'); const hasFit = !!vp && /viewport-fit=cover/.test(vp.content); let hasEnv = false; try { for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch (e) { continue; } if (!rules) continue; for (const r of rules) { if (r.cssText && r.cssText.indexOf('safe-area-inset') !== -1) { hasEnv = true; break; } } if (hasEnv) break; } } catch (e) {} return hasFit && hasEnv; })(),
        installNudge: typeof installNudge === 'function' && !!document.getElementById('installCard') && (() => { const eng = { workouts: [{}, {}, {}, {}, {}] }; return installNudge(eng, { canPrompt: true }).show === true && installNudge(eng, { canPrompt: true, standalone: true }).show === false && installNudge(eng, { canPrompt: false }).show === false && installNudge({ workouts: [{}] }, { canPrompt: true }).show === false; })(),
        iosInstallHint: typeof isIosInstallable === 'function' && !!document.getElementById('iosInstallHint') && (() => { const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'; const macTouch = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)'; return isIosInstallable(iphone, false) === true && isIosInstallable(iphone, true) === false && isIosInstallable(macTouch, false, 5) === true && isIosInstallable(macTouch, false, 0) === false && isIosInstallable(macTouch, false) === false; })(),
        onboardingPreview: !!document.getElementById('onboardingPreviewBtn') && !!document.getElementById('onboardingPreview') && typeof renderOnboardingPreview === 'function' && (() => { document.getElementById('onboardingObjective').value = 'seche'; document.getElementById('onbWeight').value = '80'; document.getElementById('onbHeight').value = '178'; renderOnboardingPreview(); const el = document.getElementById('onboardingPreview'); return !el.hidden && /kcal/.test(el.textContent) && /séances/.test(el.textContent); })(),
        macroBreakdown: typeof macroBreakdown === 'function' && (() => { const b = macroBreakdown({ dailyTarget: 2000, proteinG: 150, carbG: 200, fatG: 60 }); return b.length === 3 && b[0].key === 'protein' && b[0].pct === 30 && /muscle/i.test(b[0].role) && macroBreakdown(null).length === 0 && !!document.querySelector('#onboardingPreview .onb-macros'); })(),
        suggestedQuests: typeof suggestedQuests === 'function' && !!document.getElementById('questSuggestions') && (() => { const q = suggestedQuests({ agenda: [{ kind: 'sport', date: '2026-07-13', completed: false }], workouts: [], nutrition: [], focusSessions: [], profile: { weight: 80 }, quests: [] }, '2026-07-13'); return Array.isArray(q) && q.length >= 1 && q.length <= 4 && q.every(x => x.name && x.category && x.xp > 0) && q.some(x => x.key === 'session'); })(),
        objectiveNutrition: typeof objectiveNutrition === 'function' && (() => { const b = { weight: 80, height: 178, age: 30, sex: 'homme', activityLevel: 'modere' }; const s = objectiveNutrition('seche', b), m = objectiveNutrition('muscle', b), a = objectiveNutrition('athletique', b); return s && m && a && s.dailyTarget < a.dailyTarget && m.dailyTarget > a.dailyTarget && objectiveNutrition('zzz', b) === null; })(),
        objectiveEquipment: typeof filterByEquipment === 'function' && typeof exerciseAvailable === 'function' && (() => { const names = pr => pr.week.filter(s => s.kind === 'muscu').flatMap(s => s.exercises.map(e => e.name)); const bw = objectiveProgram('athletique', exercises, { perSession: 6, equipment: { kettlebell: false, pullup: false, vest: false, handles: false } }); const noKb = names(bw).every(n => { const ex = exercises.find(x => x.name === n); return ex && ex.kind !== 'Kettlebell' && ex.kind !== 'Barre de traction'; }); return noKb && names(bw).length >= 3; })(),
        birthdays: typeof birthdaysForDay === 'function' && typeof normalizeBirthday === 'function' && !!document.getElementById('birthdayForm') && !!document.getElementById('birthdayList')
          && normalizeBirthday({ id: 1, name: 'X', day: 31, month: 2 }).day === 0   // date impossible (31 févr.) → écartée
          && normalizeBirthday({ id: 1, name: 'Leap', day: 29, month: 2 }).day === 29  // 29 févr. préservé
          && upcomingBirthdays([{ id: 1, name: 'X', day: 31, month: 2 }], '2026-02-20', { withinDays: 60 }).length === 0,  // plus de date fantôme au 3 mars
        ux2pass2: document.querySelectorAll('details.calendar-setting').length >= 3 && !document.querySelector('.trail-plan') && !!document.querySelector('.training-grid > article.panel .collapse-toggle'),
        ux3: typeof upcomingBirthdays === 'function' && !!document.getElementById('birthdayUpcoming') && !!document.querySelector('.training-grid > .trail-panel'),
        recurring: typeof recurrenceMatches === 'function' && typeof normalizeRecurring === 'function' && !!document.getElementById('recurringForm') && !!document.getElementById('recFreq') && !!document.getElementById('recurringList'),
        recSkip: typeof recurringOccurs === 'function' && typeof skipRecurringOn === 'function' && recurringOccurs({ id: 1, rule: { freq: 'weekly', interval: 1, weekdays: [1], startDate: '2026-07-06' }, skipLog: ['2026-07-13'] }, '2026-07-13') === false,
        habits: typeof habitsForDay === 'function' && typeof habitStreak === 'function' && !!document.getElementById('habitForm') && !!document.getElementById('habitList') && document.querySelectorAll('#habitDays input').length === 7,
        habitWeek: typeof habitWeekMap === 'function' && (m => m.length === 7 && m[6].key === '2026-07-10' && m[6].done === true)(habitWeekMap({ id: 1, weekdays: [], log: ['2026-07-10'] }, '2026-07-10')),
        habitsWeekPulse: typeof habitsWeekPulse === 'function' && !!document.getElementById('habitWeekPulse') && (() => {
          const p = habitsWeekPulse([{ id: 1, weekdays: [], log: ['2026-07-08', '2026-07-10'] }, { id: 2, weekdays: [], log: ['2026-07-10'] }], '2026-07-10');
          return p && p.scheduled === 14 && p.done === 3 && p.rate === 21 && p.days.length === 7
            && habitsWeekPulse([], '2026-07-10') === null;
        })(),
        habitConsistency: typeof habitConsistency === 'function' && (() => {
          const r = habitConsistency({ name: 'Lecture', weekdays: [], log: ['2026-07-15', '2026-07-14', '2026-07-12', '2026-07-10', '2026-07-08'] }, '2026-07-15', 10);
          // jour courant prévu pas encore fait : toléré (pas compté raté) → habitude parfaite = 100 %, cohérent avec la série
          const today = habitConsistency({ name: 'Parfaite', weekdays: [], log: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'] }, '2026-07-17', 30);
          // un VRAI trou passé compte toujours (14 manque) → 75 %, pas 100 %
          const hole = habitConsistency({ name: 'Trou', weekdays: [], log: ['2026-07-13', '2026-07-15', '2026-07-16'] }, '2026-07-17', 30);
          return r && r.done === 5 && r.scheduled === 8 && r.rate === 63 && habitConsistency({ name: 'X', weekdays: [], log: [] }, '2026-07-15', 30) === null
            && today && today.rate === 100 && today.scheduled === 4 && hole && hole.rate === 75;
        })(),
        habitEdit: typeof applyHabitEdit === 'function' && !!document.getElementById('habitList') && (() => {
          const pure = applyHabitEdit({ id: 5, name: 'X', xp: 10, weekdays: [1, 3], log: ['2026-07-15'] }, { name: 'Y', weekdays: [1, 2, 3] });
          if (!(pure.name === 'Y' && pure.id === 5 && pure.log.length === 1 && pure.weekdays.join(',') === '1,2,3')) return false;
          const saved = state.habits;
          state.habits = [{ id: 999, name: 'Test', xp: 10, weekdays: [], log: [] }];
          renderHabits();
          const ok = !!document.querySelector('#habitList [data-habit-edit="999"]');
          state.habits = saved; renderHabits();
          return ok;
        })(),
        habitUndo: typeof showUndoToast === 'function' && !!document.getElementById('habitList') && (() => {
          const saved = state.habits;
          state.habits = [{ id: 888, name: 'ASupprimer', xp: 10, weekdays: [], log: ['2026-07-15'] }];
          renderHabits();
          document.querySelector('#habitList [data-habit-del="888"]').click();
          const supprimee = !state.habits.some(h => Number(h.id) === 888);
          const undoBtn = document.querySelector('#undoToast .ut-undo');
          if (undoBtn) undoBtn.click();
          const restauree = state.habits.some(h => Number(h.id) === 888 && h.log && h.log.length === 1);
          state.habits = saved; renderHabits();
          return supprimee && !!undoBtn && restauree;
        })(),
        habitsAtRisk: typeof habitsAtRisk === 'function' && !!document.getElementById('habitsAtRisk') && (() => { const r = habitsAtRisk([{ id: 1, name: 'Lecture', log: ['2026-07-05', '2026-07-06', '2026-07-07'] }, { id: 2, name: 'Eau', log: ['2026-07-07', '2026-07-08'] }], '2026-07-08'); return r.length === 1 && r[0].name === 'Lecture' && r[0].streak === 3 && habitsAtRisk(null, '2026-07-08').length === 0; })(),
        recDone: typeof completeRecurringOn === 'function' && (L => { const r = normalizeRecurring({ id: 1, doneLog: ['2026-07-07'] }); return r.doneLog.length === 1; })(),
        calSync: typeof normalizeCalendarUrl === 'function' && !!document.getElementById('calSubForm') && !!document.getElementById('calSubList') && !!document.getElementById('calSyncAll') && !!(window.desktop && typeof window.desktop.fetchCalendar === 'function' && typeof window.desktop.getCalendarSubs === 'function'),
        exIcons: typeof exerciseIcon === 'function' && exerciseIcon('Tractions').includes('viewBox="0 0 80 76"') && exerciseIcon('Tractions', true).includes('<animate') && exerciseIcon('Goblet squat kettlebell') !== exerciseIcon('Pompes classiques') && (document.querySelector('.exercise-card .ex-svg') ? document.querySelectorAll('.exercise-card .ex-svg').length >= 1 : true),
        icsRrule: typeof parseRRule === 'function' && (parseIcs('BEGIN:VEVENT\\r\\nUID:x\\r\\nSUMMARY:R\\r\\nDTSTART:20260706T090000\\r\\nRRULE:FREQ=WEEKLY;BYDAY=MO\\r\\nEND:VEVENT')[0]||{}).recurrence != null,
        icsCount: typeof parseRRule === 'function' && typeof recurrenceMatches === 'function' && parseRRule('FREQ=WEEKLY;COUNT=4;BYDAY=MO', '2026-07-06').until === '2026-07-27' && recurrenceMatches(parseRRule('FREQ=WEEKLY;COUNT=4;BYDAY=MO', '2026-07-06'), '2026-08-03') === false && parseRRule('FREQ=DAILY', '2026-07-01').until === '',
        icsRecurringMerge: typeof mergeRecurring === 'function' && (() => {
          const first = mergeRecurring([], [{ id: 1, title: 'Standup', time: '09:00', kind: 'life', rule: { freq: 'weekly', interval: 1, weekdays: [1], startDate: '2026-07-06' }, refId: 'ics-s' }])[0];
          const used = Object.assign({}, first, { doneLog: ['2026-07-06'], skipLog: ['2026-07-13'], paused: true });
          const after = mergeRecurring([used], [{ id: 2, title: 'Standup 2', time: '09:30', kind: 'life', rule: { freq: 'weekly', interval: 1, weekdays: [1], startDate: '2026-07-06' }, refId: 'ics-s' }]);
          return after.length === 1 && after[0].id === first.id && after[0].doneLog.length === 1 && after[0].skipLog.length === 1 && after[0].paused === true && after[0].title === 'Standup 2' && after[0].time === '09:30';
        })(),
        icsExport: typeof buildRRuleLine === 'function' && buildIcs([{ id: 1, title: 'R', time: '09:00', rule: { freq: 'weekly', interval: 1, weekdays: [1], startDate: '2026-07-06' } }]).includes('RRULE:FREQ=WEEKLY'),
        todo: typeof todosForDay === 'function' && typeof normalizeTodo === 'function' && !!document.getElementById('todoForm') && !!document.getElementById('todoList') && !!document.getElementById('todoPriorityBtn'),
        alternance: typeof applicationStats === 'function' && typeof normalizeApplication === 'function' && typeof alternanceDeadline === 'function' && typeof parseApplicationsCsv === 'function' && !!document.querySelector('[data-page="alternance"]') && !!document.getElementById('altForm') && !!document.getElementById('altList') && !!document.getElementById('altHero') && !!document.getElementById('altImportCsv') && typeof pageGroups === 'object' && Array.isArray(pageGroups.alternance) && (() => {
          const s = applicationStats([{ id: 1, status: 'postule', date: '2026-07-16' }, { id: 2, status: 'entretien', date: '2026-07-01' }], '2026-07-16', { weekGoal: 5 });
          if (!(s.sent === 2 && s.appliedToday === true && s.entretiens === 1 && alternanceDeadline('2026-07-16').date === '2026-10-01')) return false;
          // « à postuler » AVEC une date (produit par l'import CSV) ne compte pas comme envoyée
          const sPend = applicationStats([{ id: 1, status: 'a_postuler', date: '2026-07-16' }], '2026-07-16', { weekGoal: 5 });
          if (!(sPend.sent === 0 && sPend.appliedToday === false && sPend.weekCount === 0 && sPend.streak === 0)) return false;
          const csv = parseApplicationsCsv('Entreprise,Statut,Date\\nAcme,Postulé,16/07/2026\\n');
          if (!(csv.length === 1 && csv[0].company === 'Acme' && csv[0].status === 'postule' && csv[0].date === '2026-07-16')) return false;
          if (attentionDigest({ recovery: [], agenda: [], workouts: [], habits: [], applications: [{ id: 1, status: 'postule', date: '2026-07-14' }] }, '2026-07-16').filter(i => i.key === 'alternance').length !== 0) return false;
          const saved = state.applications;
          state.applications = [normalizeApplication({ id: 999, company: 'SmokeCorp', status: 'a_postuler', date: '' })];
          renderAlternance();
          const btn = document.querySelector('#altList [data-alt-apply="999"]');
          const oh = window.haptic; try { window.haptic = () => {}; } catch (_) {}   // évite navigator.vibrate (bloqué sans geste → warning console)
          if (btn) btn.click();
          try { window.haptic = oh; } catch (_) {}
          const app = state.applications.find(a => a.id === 999);
          const ok = !!btn && app && app.status === 'postule' && !!app.date;
          state.applications = saved; renderAlternance();
          return ok;
        })(),
        coachFocus: typeof adaptiveCoachFocus === 'function' && typeof renderCoachFocus === 'function' && !!document.getElementById('coachFocusPanel') && !!document.getElementById('coachFocus') && (() => {
          const f = adaptiveCoachFocus({ workouts: [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-09' }, { date: '2026-07-11' }] }, '2026-07-16');
          if (!(f && f.pillar === 'sport' && f.tone === 'rebuild' && f.page === 'athlete' && /essouffle/.test(f.headline))) return false;
          const fRevive = adaptiveCoachFocus({ focusSessions: [{ date: '2026-06-20', minutes: 30 }] }, '2026-07-16');
          if (fRevive.tone !== 'revive') return false;
          // Coach du RÉ-AMORÇAGE : pilier dormant 26 j (≥ 21) → tout premier pas minuscule qui NOMME la coupure + déculpabilise (bande « long »).
          if (!(fRevive.reviveStep === true && /Après 26 jours sans focus/.test(fRevive.action) && /10 min/.test(fRevive.action) && /rallume la lampe/.test(fRevive.action))) return false;
          // Bande modérée (15 j) : pas ré-amorçant proportionné, SANS la phrase « long ».
          const fReviveMod = adaptiveCoachFocus({ workouts: [{ date: '2026-07-01' }] }, '2026-07-16');
          if (!(fReviveMod.pillar === 'sport' && fReviveMod.reviveStep === true && /Après 15 jours sans séance/.test(fReviveMod.action) && !/rallumer la mèche/.test(fReviveMod.action))) return false;
          if (adaptiveCoachFocus({ workouts: [], focusSessions: [], recovery: [], nutrition: [] }, '2026-07-16') !== null) return false;
          if (adaptiveCoachFocus({ applications: [{ id: 1, status: 'postule', date: '2026-07-14' }] }, '2026-07-16').pillar !== 'alternance') return false;
          // Funnel : postulé aujourd'hui + relance en attente (J+9) → le coach coache la relance nommée.
          const funnelRel = adaptiveCoachFocus({ applications: [{ id: 1, company: 'FaiteAuj', status: 'postule', date: '2026-07-16' }, { id: 2, company: 'RelanceMoi', status: 'postule', date: '2026-07-07' }], workouts: [{ date: '2026-07-16' }] }, '2026-07-16');
          if (!(funnelRel.pillar === 'alternance' && /Relance RelanceMoi/.test(funnelRel.headline))) return false;
          // Coach conscient du sommeil : 7 nuits courtes+irrégulières → sommeil promu en tête, verdict chiffré.
          const sleepRec = [4, 8, 4, 8, 4, 8, 4].map((h, i) => ({ date: '2026-07-1' + (6 - i), sleep: h }));
          const fSleep = adaptiveCoachFocus({ recovery: sleepRec, workouts: [{ date: '2026-07-08' }, { date: '2026-07-07' }, { date: '2026-07-06' }, { date: '2026-07-15' }] }, '2026-07-16');
          if (!(fSleep.pillar === 'sommeil' && /court|irr/i.test(fSleep.insight))) return false;
          // Coach × AGENDA (sommeil) : un RDV du soir qui déborde sur la cible du plan de recalage → alerte « protège ta fenêtre » (comparaison sur l'échelle ancrée).
          const scPlan = { active: true, startTime: '01:00', targetTime: '23:00', startKey: '2026-07-10', stepDays: 3, stepMin: 15 };
          const scPd = sleepPlanDay(scPlan, sleepRec, '2026-07-16');
          const scTgt = scPd.reached ? scPd.goalTime : scPd.targetTime;
          const scStart = minutesToTime((bedtimeAnchor(scTgt) + 20 - 60 + 720) % 1440); // RDV de 60 min finissant 20 min après la cible
          const scWk = [{ date: '2026-07-08' }, { date: '2026-07-07' }, { date: '2026-07-06' }, { date: '2026-07-15' }];
          const fConf = adaptiveCoachFocus({ recovery: sleepRec, workouts: scWk, sleepPlan: scPlan, agenda: [{ id: 'z', title: 'Dîner', date: '2026-07-16', time: scStart, durationMin: 60 }] }, '2026-07-16');
          if (!(fConf.pillar === 'sommeil' && fConf.sleepConflict === scStart && /D[îi]ner/.test(fConf.action) && /prot[èe]ge ta fen[êe]tre/.test(fConf.action))) return false;
          // Geste CONCRET : le RDV finit APRÈS la cible → coach propose le coucher réaliste (fin du RDV) au lieu d'un ordre inatteignable.
          const scRealBed = bedtimeFromAnchor(bedtimeAnchor(scTgt) + 20);
          if (!(fConf.sleepConflictBedtime === scRealBed && new RegExp('finit vers ' + scRealBed).test(fConf.action) && /couche-toi dès sa fin/.test(fConf.action))) return false;
          // Sans plan actif → pas de cible concrète → aucune détection malgré le même RDV tardif.
          if (adaptiveCoachFocus({ recovery: sleepRec, workouts: scWk, agenda: [{ id: 'z', title: 'Dîner', date: '2026-07-16', time: scStart, durationMin: 60 }] }, '2026-07-16').sleepConflict !== null) return false;
          if (!adaptiveCoachFocus({ recovery: [{ date: '2026-07-04', sleep: 7 }, { date: '2026-07-05', sleep: 7 }, { date: '2026-07-06', sleep: 7 }, { date: '2026-07-14', sleep: 7 }], workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-15' }], coachLog: [{ date: '2026-07-13', pillar: 'sommeil' }, { date: '2026-07-14', pillar: 'sommeil' }, { date: '2026-07-15', pillar: 'sommeil' }] }, '2026-07-16').rotated) return false;
          if (!/Objectif hebdo : 1\\/4/.test(adaptiveCoachFocus({ workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-15' }], goals: { sessions: 4 } }, '2026-07-16').insight)) return false;
          // ALLURE de l'objectif hebdo : faisabilité (séances restantes vs jours restants de la semaine calendaire).
          const fPaceTight = adaptiveCoachFocus({ workouts: [{ date: '2026-07-13' }], goals: { sessions: 4 } }, '2026-07-17'); // vendredi : 3 pour 3 j → serré
          if (!(fPaceTight.sessionGoalPace === 'tight' && /Serré mais jouable : 3 séances pour 3 jours restants/.test(fPaceTight.insight))) return false;
          const fPaceOut = adaptiveCoachFocus({ workouts: [{ date: '2026-07-13' }], goals: { sessions: 4 } }, '2026-07-18'); // samedi : 3 pour 2 j → hors de portée
          if (!(fPaceOut.sessionGoalPace === 'unreachable' && /ne passera plus cette semaine/.test(fPaceOut.insight))) return false;
          if (adaptiveCoachFocus({ workouts: [{ date: '2026-07-13' }] }, '2026-07-17').sessionGoalPace !== null) return false; // sans objectif → pas d'allure
          // Focus nutrition ENRICHI : cible protéines réelle (poids/objectif) + collation concrète pour combler l'écart.
          const fNutri = adaptiveCoachFocus({ profile: { weight: 80, goal: 'force' }, nutrition: [{ date: '2026-07-03', protein: 60 }, { date: '2026-07-04', protein: 60 }, { date: '2026-07-05', protein: 60 }, { date: '2026-07-15', protein: 50 }] }, '2026-07-16');
          if (!(fNutri.pillar === 'nutrition' && /cible prot[ée]ines \\(150 g\\)/.test(fNutri.insight) && /Il te reste 150 g/.test(fNutri.action))) return false;
          // Focus nutrition — le coach relie la discipline du jour au RÉSULTAT CORPOREL : progression réelle vers l'objectif de poids (weightGoalProgress).
          const fWeightNut = [{ date: '2026-07-04', protein: 100 }, { date: '2026-07-06', protein: 100 }, { date: '2026-07-08', protein: 100 }, { date: '2026-07-15', protein: 100 }];
          const fWeight = adaptiveCoachFocus({ nutrition: fWeightNut, goals: { targetWeight: 79 }, weights: [{ date: '2026-06-01', value: 85 }, { date: '2026-07-14', value: 82 }] }, '2026-07-16');
          if (!(fWeight.pillar === 'nutrition' && fWeight.weightGoalPct === 50 && /50% de ton objectif de perte atteint \\(3 kg sur 6\\)/.test(fWeight.insight))) return false;
          // Sans objectif de poids → pas d'enrichissement, champ null.
          if (adaptiveCoachFocus({ nutrition: fWeightNut }, '2026-07-16').weightGoalPct !== null) return false;
          // Focus ENRICHI : le coach nomme la tâche PHARE réelle (focusByTask) dans l'action au lieu d'un « lance une session » aveugle.
          const fFocus = adaptiveCoachFocus({ focusSessions: [{ date: '2026-07-05', minutes: 30, task: 'Compta' }, { date: '2026-07-06', minutes: 30, task: 'Compta' }, { date: '2026-07-07', minutes: 30, task: 'Compta' }, { date: '2026-07-14', minutes: 25, task: 'Compta' }] }, '2026-07-16');
          if (!(fFocus.pillar === 'focus' && fFocus.focusTask === 'Compta' && /Reprends « Compta »/.test(fFocus.action) && /115 min sur 14 j/.test(fFocus.action))) return false;
          // Longueur de bloc PERSONNALISÉE : la durée du bloc suggéré se cale sur la médiane réelle (30 min ici, cf. fFocus), pas un 25 min générique.
          if (!(fFocus.focusBlockMin === 30 && /un bloc de 30 min \\(ta durée habituelle\\)/.test(fFocus.action))) return false;
          // Moins de 3 sessions → pas de médiane fiable → focusBlockMin null, repli sur 25 min.
          const fScarce = adaptiveCoachFocus({ focusSessions: [{ date: '2026-07-05', minutes: 40, task: 'Compta' }, { date: '2026-07-14', minutes: 40, task: 'Compta' }] }, '2026-07-16');
          if (!(fScarce.pillar === 'focus' && fScarce.focusBlockMin === null && /un bloc de 25 min/.test(fScarce.action))) return false;
          // Coach × AGENDA : bloc focus calé dans un créneau libre du jour (nowMinutes 09:15, RDV 09:00-10:00 → 10:00).
          const fSlot = adaptiveCoachFocus({ focusSessions: [{ date: '2026-07-05', minutes: 30, task: 'Compta' }, { date: '2026-07-06', minutes: 30, task: 'Compta' }, { date: '2026-07-07', minutes: 30, task: 'Compta' }, { date: '2026-07-14', minutes: 30, task: 'Compta' }], agenda: [{ id: 'a', date: '2026-07-16', time: '09:00', durationMin: 60 }] }, '2026-07-16', { nowMinutes: 555 });
          if (!(fSlot.focusSlot === '10:00' && /Cr[ée]neau libre à 10:00 aujourd/.test(fSlot.action))) return false;
          // Sans nowMinutes (appel 2 args) → pas de créneau, action inchangée.
          if (adaptiveCoachFocus({ focusSessions: [{ date: '2026-07-05', minutes: 30, task: 'Compta' }, { date: '2026-07-06', minutes: 30, task: 'Compta' }, { date: '2026-07-07', minutes: 30, task: 'Compta' }, { date: '2026-07-14', minutes: 30, task: 'Compta' }], agenda: [{ id: 'a', date: '2026-07-16', time: '09:00', durationMin: 60 }] }, '2026-07-16').focusSlot !== null) return false;
          // Coach × AGENDA (sport) : la séance aussi est calée dans un créneau libre (nowMinutes 09:15, RDV 09:00-10:00 → 10:00).
          const sSlot = adaptiveCoachFocus({ workouts: [{ date: '2026-07-05', duration: 45 }, { date: '2026-07-06', duration: 45 }, { date: '2026-07-07', duration: 45 }, { date: '2026-07-14', duration: 45 }], agenda: [{ id: 'a', date: '2026-07-16', time: '09:00', durationMin: 60 }] }, '2026-07-16', { nowMinutes: 555 });
          if (!(sSlot.pillar === 'sport' && sSlot.sportSlot === '10:00' && /Cr[ée]neau libre à 10:00 aujourd/.test(sSlot.action) && /cale ta s[ée]ance/.test(sSlot.action))) return false;
          // Sans nowMinutes → pas de créneau séance (rétrocompat).
          if (adaptiveCoachFocus({ workouts: [{ date: '2026-07-05', duration: 45 }, { date: '2026-07-06', duration: 45 }, { date: '2026-07-07', duration: 45 }, { date: '2026-07-14', duration: 45 }], agenda: [{ id: 'a', date: '2026-07-16', time: '09:00', durationMin: 60 }] }, '2026-07-16').sportSlot !== null) return false;
          // Coach MÉTA-CONSCIENT : conseil « sport » ignoré 2 jours (journalisé, sans séance ces jours-là) → micro-marche.
          const fMicro = adaptiveCoachFocus({ workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-15' }], coachLog: [{ date: '2026-07-13', pillar: 'sport' }, { date: '2026-07-14', pillar: 'sport' }] }, '2026-07-16');
          if (!(fMicro.pillar === 'sport' && fMicro.microStep === true && /5 min/.test(fMicro.action) && /abaisse la barre/.test(fMicro.insight))) return false;
          // Crédit du jour : séance déjà loggée AUJOURD'HUI → le coach crédite au lieu de radoter « programme une séance » (et coupe la micro-marche).
          const fDone = adaptiveCoachFocus({ workouts: [{ date: '2026-07-03' }, { date: '2026-07-04' }, { date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-16' }] }, '2026-07-16');
          if (!(fDone.pillar === 'sport' && fDone.doneToday === true && fDone.microStep === false && /d[ée]j[àa] faite aujourd/.test(fDone.action))) return false;
          // Sommeil EXCLU du crédit : une nuit notée = celle d'hier, le coucher du soir reste à faire.
          if (adaptiveCoachFocus({ recovery: [{ date: '2026-07-03', sleep: 7 }, { date: '2026-07-04', sleep: 7 }, { date: '2026-07-05', sleep: 7 }, { date: '2026-07-06', sleep: 7 }, { date: '2026-07-16', sleep: 7 }] }, '2026-07-16').doneToday !== false) return false;
          if (typeof coachFollowThrough !== 'function' || !document.getElementById('coachFollow')) return false;
          const ft = coachFollowThrough({ coachLog: [{ date: '2026-07-14', pillar: 'sport' }, { date: '2026-07-15', pillar: 'sport' }], workouts: [{ date: '2026-07-15' }] }, '2026-07-16');
          if (!(ft && ft.total === 2 && ft.followed === 1 && ft.rate === 50)) return false;
          // Coach MÉTA-CONSCIENT positif : suivi élevé (≥ 3 jours journalisés, ≥ 70 %) → le coach crédite Adrien (reinforce).
          const fBoost = adaptiveCoachFocus({ workouts: [{ date: '2026-07-05' }, { date: '2026-07-11' }, { date: '2026-07-12' }, { date: '2026-07-14' }, { date: '2026-07-16' }], coachLog: [{ date: '2026-07-11', pillar: 'sport' }, { date: '2026-07-12', pillar: 'sport' }, { date: '2026-07-14', pillar: 'sport' }] }, '2026-07-16');
          if (!(fBoost.tone === 'reinforce' && fBoost.followThrough === 100 && /toi qui le construis/.test(fBoost.insight))) return false;
          // Coach de la RELANCE AMORCÉE : reprise fraîche (07-14, 07-16) après un long trou (dernier geste = 15 juin, 29 j) → comeback salué avec le trou chiffré.
          const fBack = adaptiveCoachFocus({ workouts: [{ date: '2026-06-15' }, { date: '2026-07-14' }, { date: '2026-07-16' }] }, '2026-07-16');
          if (!(fBack.pillar === 'sport' && fBack.tone === 'reinforce' && fBack.comeback === true && /Tu as rallum[ée] ton entra[îi]nement il y a 2 j apr[èe]s 29 jours/.test(fBack.insight))) return false;
          // ESCALADE du geste : 2 jours actifs → stade « building », le coach remonte l'ask vers une vraie séance.
          if (!(fBack.comebackStage === 'building' && /La reprise tient \\(2 jours cette semaine\\)/.test(fBack.action) && /vraie s[ée]ance/.test(fBack.action))) return false;
          // ESCALADE — stade « étincelle » : un SEUL geste depuis la reprise → le coach protège l'étincelle (« un 2e jour… »).
          const fSpark = adaptiveCoachFocus({ workouts: [{ date: '2026-06-15' }, { date: '2026-07-16' }] }, '2026-07-16');
          if (!(fSpark.comeback === true && fSpark.recentDays === 1 && fSpark.comebackStage === 'spark' && /Ne force pas le rythme/.test(fSpark.action) && /un 2e jour actif cette semaine/.test(fSpark.action))) return false;
          if (fBoost.comeback !== false || fBoost.comebackStage !== null) return false; // hausse continue (pas de trou) → pas de relance
          // Coach de la SÉRIE EN JEU : 3 jours d'entraînement consécutifs finissant HIER, rien aujourd'hui → série ≥ 3 nommée (aversion à la perte).
          const fSeries = adaptiveCoachFocus({ workouts: [{ date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-15' }] }, '2026-07-16');
          if (!(fSeries.tone === 'reinforce' && fSeries.streakAtRisk === 3 && /série de 3 jours d.affilée sur ton entraînement est en jeu/.test(fSeries.insight))) return false;
          // Série PROLONGÉE (geste du jour déjà posé, 07-16) → plus « en jeu » → aucune note, streakAtRisk null.
          const fSeriesToday = adaptiveCoachFocus({ workouts: [{ date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-15' }, { date: '2026-07-16' }] }, '2026-07-16');
          if (fSeriesToday.streakAtRisk !== null || /est en jeu/.test(fSeriesToday.insight)) return false;
          // PALIER de série EN JEU : 6 jours consécutifs finissant hier → le geste du jour porterait la série à 7 (palier) → carotte du jalon ajoutée.
          const fMilestone = adaptiveCoachFocus({ workouts: [{ date: '2026-07-10' }, { date: '2026-07-11' }, { date: '2026-07-12' }, { date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-15' }] }, '2026-07-16');
          if (!(fMilestone.streakAtRisk === 6 && fMilestone.streakMilestoneReach === 7 && /d[ée]croche le palier d.une semaine/.test(fMilestone.insight))) return false;
          // Série de 3 j (loin du palier 7) → pas de carotte jalon.
          if (fSeries.streakMilestoneReach !== null || /d[ée]croche le palier/.test(fSeries.insight)) return false;
          // RECORD PERSO : run en cours de 7 j (= record all-time ≥ 7) finissant hier → un geste bat le record.
          const fRecord = adaptiveCoachFocus({ workouts: [{ date: '2026-07-09' }, { date: '2026-07-10' }, { date: '2026-07-11' }, { date: '2026-07-12' }, { date: '2026-07-13' }, { date: '2026-07-14' }, { date: '2026-07-15' }] }, '2026-07-16');
          if (!(fRecord.streakAtRisk === 7 && fRecord.streakRecordReach === 'break' && /tu bats ton record perso sur ton entra/.test(fRecord.insight))) return false;
          // Record non notable (< 7 j) → pas de note record (séries de 3 et 6 j).
          if (fSeries.streakRecordReach !== null || fMilestone.streakRecordReach !== null) return false;
          // Coach de la SÉRIE ROMPUE : série de 5 j close il y a une semaine, pilier en recul (rebuild) → consolation, pas reproche.
          const fBroken = adaptiveCoachFocus({ workouts: [{ date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-08' }, { date: '2026-07-09' }] }, '2026-07-16');
          if (!(fBroken.tone === 'rebuild' && fBroken.brokenStreak === 5 && fBroken.brokenStreakTier === 'court' && /Tu tenais 5 jours d.affilée sur ton entraînement avant cette pause/.test(fBroken.insight))) return false;
          // NUANCE : série de 8 j (≥ 7, palier semaine franchi) close il y a une semaine → tier « long », magnitude nommée.
          const fLongBroken = adaptiveCoachFocus({ workouts: [{ date: '2026-07-02' }, { date: '2026-07-03' }, { date: '2026-07-04' }, { date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-07' }, { date: '2026-07-08' }, { date: '2026-07-09' }] }, '2026-07-16');
          if (!(fLongBroken.brokenStreak === 8 && fLongBroken.brokenStreakTier === 'long' && /Tu tenais une semaine entière d.affilée/.test(fLongBroken.insight))) return false;
          // Série trop courte (3 j) → pas de consolation ; et la série EN JEU (reinforce) ne déclenche jamais brokenStreak.
          const fShortBroken = adaptiveCoachFocus({ workouts: [{ date: '2026-07-07' }, { date: '2026-07-08' }, { date: '2026-07-09' }] }, '2026-07-16');
          if (fShortBroken.brokenStreak !== null || fShortBroken.brokenStreakTier !== null || /avant cette pause/.test(fShortBroken.insight) || fSeries.brokenStreak !== null) return false;
          // MICRO-JALON DE REPRISE : série repartie à 2 j (07-14,07-15) sous le seuil « en jeu », record perso notable de 7 j au-dessus (trou de 12 j < 14) → reconstruction saluée.
          const fRebuild = adaptiveCoachFocus({ workouts: [{ date: '2026-06-26' }, { date: '2026-06-27' }, { date: '2026-06-28' }, { date: '2026-06-29' }, { date: '2026-06-30' }, { date: '2026-07-01' }, { date: '2026-07-02' }, { date: '2026-07-14' }, { date: '2026-07-15' }] }, '2026-07-16');
          if (!(fRebuild.tone === 'reinforce' && fRebuild.streakAtRisk === null && fRebuild.streakRebuild === 7 && /Tu reconstruis : 2 jours d.affilée sur ton entra/.test(fRebuild.insight) && /record perso : 7 jours/.test(fRebuild.insight))) return false;
          // Sans record notable au-dessus (série de 3 j en jeu) → pas de micro-jalon de reprise.
          if (fSeries.streakRebuild !== null) return false;
          // Coach CONSCIENT de la readiness : focus « sport » + check-in du jour → action calée sur la readiness.
          const rdWk = [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }];
          const fRdLow = adaptiveCoachFocus({ workouts: rdWk, recovery: [{ date: '2026-07-16', sleep: 3, fatigue: 5, soreness: 5 }] }, '2026-07-16');
          if (!(fRdLow.pillar === 'sport' && fRdLow.readiness === 15 && /r[ée]cup[ée]ration prioritaire/.test(fRdLow.action))) return false;
          const fRdHigh = adaptiveCoachFocus({ workouts: rdWk, recovery: [{ date: '2026-07-16', sleep: 8, fatigue: 1, soreness: 1 }] }, '2026-07-16');
          if (!(fRdHigh.readiness === 100 && /pr[êe]t [àa] pousser/.test(fRdHigh.action))) return false;
          if (adaptiveCoachFocus({ workouts: rdWk }, '2026-07-16').readiness !== null) return false;
          // Coach CONSCIENT de la CHARGE : pic aigu/chronique (ACWR high) → l'action sport TEMPÈRE (allège),
          // même sans readiness ; readiness au vert → registre « consolidation » ; le créneau est coupé.
          const spikeWk = [{ date: '2026-07-10', duration: 100, effort: 3 }, { date: '2026-07-12', duration: 100, effort: 3 }, { date: '2026-07-14', duration: 100, effort: 3 }, { date: '2026-07-05', duration: 30, effort: 1 }, { date: '2026-07-08', duration: 30, effort: 1 }, { date: '2026-06-28', duration: 30, effort: 1 }];
          const fSpike = adaptiveCoachFocus({ workouts: spikeWk }, '2026-07-16');
          if (!(fSpike.pillar === 'sport' && fSpike.loadSpike != null && fSpike.loadSpike > 1.5 && /Charge en hausse brutale/.test(fSpike.action))) return false;
          const fSpikeFresh = adaptiveCoachFocus({ workouts: spikeWk, recovery: [{ date: '2026-07-16', sleep: 8, fatigue: 1, soreness: 1 }] }, '2026-07-16');
          if (!(fSpikeFresh.readiness === 100 && fSpikeFresh.loadSpike != null && /Forme au vert/.test(fSpikeFresh.action) && !/pr[êe]t [àa] pousser/.test(fSpikeFresh.action))) return false;
          if (adaptiveCoachFocus({ workouts: spikeWk, agenda: [{ id: 'a', date: '2026-07-16', time: '09:00', durationMin: 60 }] }, '2026-07-16', { nowMinutes: 555 }).sportSlot !== null) return false;
          // Coach CONSCIENT de la TENDANCE de readiness : forme du jour « correcte » (55) mais qui GLISSE (-45 pts
          // sur 5 check-ins, sommeil constant sain) → l'action tempère (fatigue cumulée), et un jour au vert (85) non.
          const slideRec = [{ date: '2026-07-04', sleep: 8, fatigue: 1, soreness: 1 }, { date: '2026-07-06', sleep: 8, fatigue: 2, soreness: 2 }, { date: '2026-07-10', sleep: 8, fatigue: 3, soreness: 3 }, { date: '2026-07-13', sleep: 8, fatigue: 3, soreness: 4 }, { date: '2026-07-16', sleep: 8, fatigue: 4, soreness: 4 }];
          const fSlide = adaptiveCoachFocus({ workouts: rdWk, recovery: slideRec }, '2026-07-16');
          if (!(fSlide.pillar === 'sport' && fSlide.readiness === 55 && fSlide.readinessSlide === -45 && /ta forme glisse sur tes 5 derniers check-ins/.test(fSlide.action) && /fatigue qui s.accumule/.test(fSlide.action))) return false;
          const highRec = [{ date: '2026-07-04', sleep: 8, fatigue: 1, soreness: 1 }, { date: '2026-07-06', sleep: 8, fatigue: 1, soreness: 1 }, { date: '2026-07-10', sleep: 8, fatigue: 1, soreness: 2 }, { date: '2026-07-13', sleep: 8, fatigue: 2, soreness: 1 }, { date: '2026-07-16', sleep: 8, fatigue: 2, soreness: 2 }];
          if (adaptiveCoachFocus({ workouts: rdWk, recovery: highRec }, '2026-07-16').readinessSlide !== null) return false;
          // Coach CONSCIENT de la REMONTÉE : forme du jour « correcte » (70) mais qui MONTE (+30 pts sur 5 check-ins)
          // → l'action rehausse l'intensité au lieu de « garde une marge » (symétrique positif de la glissade).
          const upRec = [{ date: '2026-07-04', sleep: 8, fatigue: 5, soreness: 5 }, { date: '2026-07-06', sleep: 8, fatigue: 5, soreness: 4 }, { date: '2026-07-10', sleep: 8, fatigue: 4, soreness: 4 }, { date: '2026-07-13', sleep: 8, fatigue: 3, soreness: 4 }, { date: '2026-07-16', sleep: 8, fatigue: 3, soreness: 3 }];
          const fUp = adaptiveCoachFocus({ workouts: rdWk, recovery: upRec }, '2026-07-16');
          if (!(fUp.pillar === 'sport' && fUp.readiness === 70 && fUp.readinessRebound === 30 && fUp.readinessSlide === null && /ta forme remonte franchement sur tes 5 derniers check-ins/.test(fUp.action) && /r[ée]hausser un peu l.intensit[ée]/.test(fUp.action))) return false;
          // Coach CONSCIENT de la SOUS-CHARGE : base chronique régulière puis semaine allégée (ACWR zone low) →
          // l'action invite à REMONTER le volume progressivement (pendant positif du pic de charge).
          const lowWk = [{ date: '2026-06-22', duration: 50, effort: 4 }, { date: '2026-06-25', duration: 50, effort: 4 }, { date: '2026-06-29', duration: 50, effort: 4 }, { date: '2026-07-02', duration: 50, effort: 4 }, { date: '2026-07-06', duration: 50, effort: 4 }, { date: '2026-07-09', duration: 50, effort: 4 }, { date: '2026-07-13', duration: 50, effort: 4 }];
          const fLow = adaptiveCoachFocus({ workouts: lowWk }, '2026-07-16');
          if (!(fLow.pillar === 'sport' && fLow.lowLoad != null && fLow.lowLoad < 0.8 && fLow.loadSpike === null && /Tu es en sous-charge/.test(fLow.action) && /progressivement vers ta base/.test(fLow.action))) return false;
          // Sous-charge + forme qui remonte → deux feux verts concordants, message « Fenêtre idéale ».
          const fLowUp = adaptiveCoachFocus({ workouts: lowWk, recovery: upRec }, '2026-07-16');
          if (!(fLowUp.lowLoad != null && fLowUp.readinessRebound === 30 && /Fenêtre idéale/.test(fLowUp.action))) return false;
          // Forme qui glisse → la sous-charge NE réécrit PAS l'action (« garde léger » prime).
          if (adaptiveCoachFocus({ workouts: lowWk, recovery: slideRec }, '2026-07-16').lowLoad !== null) return false;
          // Coach PRIORISANT : deux piliers décrochent → note explicite « quoi d'abord » qui NOMME l'autre pilier.
          const fTwo = adaptiveCoachFocus({ workouts: [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }], focusSessions: [{ date: '2026-07-04', minutes: 30 }, { date: '2026-07-06', minutes: 30 }, { date: '2026-07-08', minutes: 30 }, { date: '2026-07-12', minutes: 30 }] }, '2026-07-16');
          if (!(fTwo.alsoSlipping === 1 && fTwo.alsoSlippingPillars && fTwo.alsoSlippingPillars[0] === 'focus' && /Ton focus faiblit aussi/.test(fTwo.insight) && /levier prioritaire/.test(fTwo.insight))) return false;
          // Gravité modulée : un autre pilier DORMANT (focus 0 depuis 14 j) → « à l'arrêt » et non « faiblit ».
          const fDorm = adaptiveCoachFocus({ workouts: [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }], focusSessions: [{ date: '2026-06-25', minutes: 30 }] }, '2026-07-16');
          if (!(fDorm.alsoSlipping === 1 && /Ton focus est à l.arrêt aussi cette semaine/.test(fDorm.insight) && !/focus faiblit/.test(fDorm.insight))) return false;
          // Un seul pilier décroche → pas de note de priorisation.
          if (adaptiveCoachFocus({ workouts: [{ date: '2026-07-03' }, { date: '2026-07-05' }, { date: '2026-07-07' }, { date: '2026-07-11' }] }, '2026-07-16').alsoSlipping !== 0) return false;
          // Crédit MULTI-PILIERS : séance du jour faite (doneToday) + focus & nutrition cochés aujourd'hui → 3/4 salués.
          const fMulti = adaptiveCoachFocus({ profile: { weight: 80, goal: 'force' }, workouts: [{ date: '2026-07-03' }, { date: '2026-07-04' }, { date: '2026-07-05' }, { date: '2026-07-06' }, { date: '2026-07-16', duration: 45 }], focusSessions: [{ date: '2026-07-16', minutes: 30, task: 'X' }], nutrition: [{ date: '2026-07-16', protein: 120 }] }, '2026-07-16');
          if (!(fMulti.pillar === 'sport' && fMulti.doneToday === true && fMulti.pillarsToday === 3 && fMulti.completeDayStreak === 1 && /3\\/4 de tes piliers déjà cochés aujourd/.test(fMulti.insight) && /belle journée complète/.test(fMulti.insight))) return false;
          // Un seul pilier coché aujourd'hui → pillarsToday 1, aucune note.
          if (fDone.pillarsToday !== 1 || /piliers déjà cochés/.test(fDone.insight)) return false;
          // SÉRIE de journées complètes : les 4 piliers actifs 3 jours de suite → célébration de la série (pas le crédit d'un jour isolé).
          const fStreak = adaptiveCoachFocus({ workouts: [{ date: '2026-07-14', duration: 45 }, { date: '2026-07-15', duration: 45 }, { date: '2026-07-16', duration: 45 }], focusSessions: [{ date: '2026-07-14', minutes: 30, task: 'X' }, { date: '2026-07-15', minutes: 30, task: 'X' }, { date: '2026-07-16', minutes: 30, task: 'X' }], recovery: [{ date: '2026-07-14', sleep: 7 }, { date: '2026-07-15', sleep: 7 }, { date: '2026-07-16', sleep: 7 }], nutrition: [{ date: '2026-07-14', protein: 100 }, { date: '2026-07-15', protein: 100 }, { date: '2026-07-16', protein: 100 }] }, '2026-07-16');
          if (!(fStreak.pillarsToday === 4 && fStreak.completeDayStreak === 3 && /3 jours d.affil.*3\\+ piliers/.test(fStreak.insight) && !/belle journée complète/.test(fStreak.insight))) return false;
          // PALIER de série : 3 est un jalon (STREAK_MILESTONES) → palier franchi débloqué.
          if (!(fStreak.completeDayMilestone === 3 && /Palier franchi : 3 jours/.test(fStreak.insight))) return false;
          // Palier d'une SEMAINE : 4 piliers × 7 jours consécutifs (10 → 16) → completeDayMilestone 7.
          const wkDays = ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'];
          const fWeek = adaptiveCoachFocus({ workouts: wkDays.map(d => ({ date: d, duration: 45 })), focusSessions: wkDays.map(d => ({ date: d, minutes: 30, task: 'X' })), recovery: wkDays.map(d => ({ date: d, sleep: 7 })), nutrition: wkDays.map(d => ({ date: d, protein: 100 })) }, '2026-07-16');
          if (!(fWeek.completeDayStreak === 7 && fWeek.completeDayMilestone === 7 && /Palier franchi : une semaine complète/.test(fWeek.insight))) return false;
          // Série de 2 (hors palier) mais prochain palier à un jour → cap à tenir demain, aucun palier franchi.
          const fSoon = adaptiveCoachFocus({ workouts: [{ date: '2026-07-14', duration: 45 }, { date: '2026-07-15', duration: 45 }, { date: '2026-07-16', duration: 45 }], focusSessions: [{ date: '2026-07-15', minutes: 30, task: 'X' }, { date: '2026-07-16', minutes: 30, task: 'X' }], nutrition: [{ date: '2026-07-15', protein: 100 }, { date: '2026-07-16', protein: 100 }] }, '2026-07-16');
          if (!(fSoon.completeDayStreak === 2 && fSoon.completeDayMilestone === null && /Encore 1 jour pour franchir le palier des 3/.test(fSoon.insight))) return false;
          const pad = n => (n < 10 ? '0' + n : '' + n);
          const iso = off => { const d = new Date(localDate() + 'T12:00:00'); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
          const saved = { w: state.workouts, f: state.focusSessions, r: state.recovery, n: state.nutrition, a: state.applications };
          state.workouts = [{ date: iso(3) }, { date: iso(5) }, { date: iso(7) }, { date: iso(9) }, { date: iso(11) }];
          state.focusSessions = []; state.recovery = []; state.nutrition = []; state.applications = [];
          renderCoachFocus();
          const panel = document.getElementById('coachFocusPanel'), btn = document.getElementById('coachFocus');
          const shown = !!panel && !panel.hidden && !!btn && btn.dataset.coachPage === 'athlete' && /essouffle/.test(btn.textContent);
          state.workouts = saved.w; state.focusSessions = saved.f; state.recovery = saved.r; state.nutrition = saved.n; state.applications = saved.a;
          renderCoachFocus();
          return !!shown;
        })(),
        sheetSync: typeof normalizeSheetCsvUrl === 'function' && typeof mergeApplications === 'function' && typeof renderSheetSync === 'function' && typeof syncSheets === 'function' && typeof setupSheetSync === 'function' && !!document.getElementById('altSheetForm') && !!document.getElementById('altSheetUrl') && !!document.getElementById('altSheetList') && !!document.getElementById('altSheetSync') && !!document.getElementById('altSheetStatus') && (() => {
          if (!normalizeSheetCsvUrl('https://docs.google.com/spreadsheets/d/e/x/pub?output=csv')) return false;
          if (normalizeSheetCsvUrl('https://evil.com/spreadsheets/d/x/pub?output=csv') !== '') return false;
          const m = mergeApplications([{ id: 1, company: 'A', role: '', status: 'entretien', date: '2026-07-01' }], [{ company: 'A', status: 'a_postuler' }, { company: 'B', status: 'a_postuler' }]);
          if (!(m.added === 1 && m.applications.length === 2 && m.applications.find(a => a.id === 1).status === 'entretien')) return false;
          if (typeof parseAlternanceTargets !== 'function' || typeof parseSheetApplications !== 'function') return false;
          const cibles = 'Entreprise,Ville,Statut,Score /10\\nBon Cabinet,Lorient (56),À contacter,8\\nLoin,Nantes (44),À contacter,9\\nFaible,Vannes (56),À contacter,4\\n';
          const tg = parseSheetApplications(cibles, { minScore: 6, depts: ['35', '56'], townDepts: { '22': ['loudeac'] }, max: 800 });
          if (!(tg.length === 1 && tg[0].company === 'Bon Cabinet' && tg[0].status === 'a_postuler')) return false;
          if (parseSheetApplications('Entreprise,Statut\\nX,Postulé\\nY,Entretien\\n', {}).length !== 2) return false;
          const saved = state.sheetSyncUrls;
          state.sheetSyncUrls = ['https://docs.google.com/spreadsheets/d/e/x/pub?output=csv'];
          renderSheetSync();
          const list = document.getElementById('altSheetList'), btn = document.getElementById('altSheetSync');
          const ok = list.children.length === 1 && !!list.querySelector('[data-sheet-del]') && !btn.hidden;
          state.sheetSyncUrls = saved; renderSheetSync();
          return ok;
        })(),
        altRelance: (() => {
          if (typeof compareApplications !== 'function') return false;
          const saved = state.applications, savedHide = state.hideRejected;
          const pad = n => (n < 10 ? '0' + n : '' + n);
          const d = new Date(); d.setDate(d.getDate() - 10);
          const old = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
          state.applications = [
            normalizeApplication({ id: 960, company: 'Relançable', status: 'postule', date: old }),
            normalizeApplication({ id: 961, company: 'TopScore', status: 'a_postuler', score: 9 }),
            normalizeApplication({ id: 962, company: 'BasScore', status: 'a_postuler', score: 2 })
          ];
          state.hideRejected = true; renderAlternance();
          const firstRow = document.querySelector('#altList .alt-item');
          const sortOk = firstRow && /TopScore/.test(firstRow.textContent) && firstRow.textContent.indexOf('9/10') !== -1;
          const chip = document.querySelector('#altRelances [data-alt-relance]');
          if (!sortOk || !chip) { state.applications = saved; state.hideRejected = savedHide; renderAlternance(); return false; }
          chip.click();
          const done = state.applications.find(a => a.id === 960).status === 'relance';
          state.applications = saved; state.hideRejected = savedHide; renderAlternance();
          return done;
        })(),
        altTarget: typeof nextAlternanceTarget === 'function' && (() => {
          const saved = state.applications, savedHide = state.hideRejected;
          state.applications = [
            normalizeApplication({ id: 950, company: 'Best Cabinet', status: 'a_postuler', score: 9 }),
            normalizeApplication({ id: 951, company: 'Autre Boite', status: 'a_postuler', score: 5 })
          ];
          renderAlternance();
          const hero = document.getElementById('altHero');
          const t1 = /Cible du jour/.test(hero.textContent) && /Best Cabinet/.test(hero.textContent) && hero.textContent.indexOf('9/10') !== -1;
          const btn = hero.querySelector('[data-alt-apply]');
          if (!t1 || !btn) { state.applications = saved; state.hideRejected = savedHide; renderAlternance(); return false; }
          const oh = window.haptic; try { window.haptic = () => {}; } catch (_) {}
          btn.click();
          try { window.haptic = oh; } catch (_) {}
          const applied = state.applications.find(a => a.id === 950).status === 'postule';
          const gone = !/Cible du jour/.test(document.getElementById('altHero').textContent);
          state.applications = saved; state.hideRejected = savedHide; renderAlternance();
          return applied && gone;
        })(),
        altFilter: typeof filterApplications === 'function' && !!document.getElementById('altSearch') && !!document.getElementById('altStatusFilter') && (() => {
          const saved = state.applications, savedHide = state.hideRejected;
          state.applications = [];
          for (let i = 0; i < 9; i++) state.applications.push(normalizeApplication({ id: 900 + i, company: (i === 0 ? 'Cible Unique' : 'Boite ' + i), status: i % 2 ? 'postule' : 'a_postuler', date: i % 2 ? '2026-07-10' : '' }));
          state.hideRejected = true;
          const inp = document.getElementById('altSearch');
          inp.value = 'cible uni';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          const rows1 = document.querySelectorAll('#altList .alt-item').length;
          const cnt = (document.getElementById('altFilterCount') || {}).textContent || '';
          const rowVisible = !document.getElementById('altFilterRow').hidden;
          inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true }));
          const rows2 = document.querySelectorAll('#altList .alt-item').length;
          state.applications = saved; state.hideRejected = savedHide; renderAlternance();
          return rowVisible && rows1 === 1 && cnt.indexOf('1 / 9') === 0 && rows2 === 9;
        })(),
        altHideRejected: !!document.getElementById('altRejectedToggle') && (() => {
          const saved = state.applications, savedHide = state.hideRejected;
          state.applications = [
            normalizeApplication({ id: 801, company: 'RefusCorp', status: 'refus', date: '2026-07-01' }),
            normalizeApplication({ id: 802, company: 'ActiveCorp', status: 'postule', date: '2026-07-10' })
          ];
          state.hideRejected = true; renderAlternance();
          const list1 = document.getElementById('altList').textContent, tog = document.getElementById('altRejectedToggle');
          const hiddenOk = /ActiveCorp/.test(list1) && !/RefusCorp/.test(list1) && !tog.hidden && /1 refus/i.test(tog.textContent);
          state.hideRejected = false; renderAlternance();
          const list2 = document.getElementById('altList').textContent;
          const shownOk = /RefusCorp/.test(list2) && /ActiveCorp/.test(list2);
          state.applications = saved; state.hideRejected = savedHide; renderAlternance();
          return hiddenOk && shownOk;
        })(),
        altStatusRefresh: (() => {
          if (typeof adaptiveCoachFocus !== 'function' || typeof renderCoachFocus !== 'function') return false;
          const panel = document.getElementById('coachFocusPanel'), el = document.getElementById('coachFocus');
          if (!panel || !el) return false;
          const saved = state.applications;
          state.applications = [normalizeApplication({ id: 803, company: 'RefreshCo', status: 'a_postuler', date: '' })];
          renderCoachFocus();
          const before = !panel.hidden && el.dataset.coachPage === 'alternance';
          renderAlternance();
          const sel = document.querySelector('#altList [data-alt-status="803"]');
          if (!before || !sel) { state.applications = saved; renderCoachFocus(); renderAlternance(); return false; }
          // change de statut via le SELECT (pas le bouton dédié) : le coach doit se rafraîchir tout
          // seul, sans appel manuel supplémentaire — c'est le bug rapporté par Adrien (statut posé
          // mais rien qui « prend en compte » avant un rendu complet suivant).
          sel.value = 'postule';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          const app = state.applications.find(a => a.id === 803);
          const after = el.dataset.coachPage !== 'alternance';
          state.applications = saved; renderCoachFocus(); renderAlternance();
          return !!(app && app.status === 'postule' && app.date && after);
        })(),
        comfort: !!document.getElementById('backToTop') && !!document.getElementById('densityToggle') && !!document.getElementById('appVersion'),
        dialogBackdrop: typeof bindDialogBackdropClose === 'function' && (() => { const d = document.getElementById('questDialog'); if (!d) return false; try { d.showModal(); d.dispatchEvent(new MouseEvent('click', { clientX: 0, clientY: 0, bubbles: true })); const closed = !d.open; if (d.open) d.close(); return closed; } catch (_) { return false; } })(),
        autoUpdate: !!(window.desktop && typeof window.desktop.installUpdate === 'function' && typeof window.desktop.onUpdateStatus === 'function') && !!document.getElementById('updateBanner') && !!document.getElementById('updateInstallBtn'),
        updateSilent: typeof applyUpdateStatus === 'function' && (() => {
          const banner = document.getElementById('updateBanner'), inst = document.getElementById('updateInstallBtn'), txt = document.getElementById('updateBannerText');
          if (!banner || !inst || !txt) return false;
          banner.hidden = true; banner.classList.remove('update-ready');
          // téléchargement en fond → la pop-up reste MASQUÉE (silencieux)
          applyUpdateStatus({ state: 'available', version: '9.9.9' });
          applyUpdateStatus({ state: 'downloading', percent: 42 });
          if (!banner.hidden) return false;
          // prêt → la pop-up apparaît, avec le bouton installer et la version
          applyUpdateStatus({ state: 'ready', version: '9.9.9' });
          const shown = !banner.hidden && banner.classList.contains('update-ready') && !inst.hidden && /9\.9\.9/.test(txt.textContent) && /prête/i.test(txt.textContent);
          banner.hidden = true; banner.classList.remove('update-ready'); // reset pour ne pas polluer l'UI
          return shown;
        })(),
        weekPlanner: typeof buildWeekPlan === 'function' && typeof generateAutomaticWeek === 'function' && document.querySelectorAll('#availabilityDays input').length === 7,
        volume: typeof volumeRamp === 'function' && !!document.getElementById('volStart') && typeof renderVolumeGoal === 'function',
        warmup: typeof warmupFor === 'function' && !!document.getElementById('guidedWarmupList'),
        cooldown: typeof cooldownFor === 'function' && !!document.getElementById('guidedCooldownList') && !!document.getElementById('guidedCooldown'),
        restSound: typeof guidedRestCue === 'function' && typeof restSoundEnabled === 'function' && !!document.getElementById('restSoundToggle'),
        restAdjust: typeof restBarPct === 'function' && typeof adjustRestSeconds === 'function' && typeof adjustGuidedRest === 'function' && !!document.getElementById('guidedRestMinus') && !!document.getElementById('guidedRestPlus') && !!document.getElementById('guidedRestBar') && restBarPct(30, 60) === 50 && adjustRestSeconds(75, -15) === 60 && adjustRestSeconds(595, 30) === 600,
        restTimerMobile: typeof formatClock === 'function' && typeof setGuidedRest === 'function' && !!document.getElementById('guidedRestPresets') && document.querySelectorAll('#guidedRestPresets [data-rest]').length === 5 && formatClock(90) === '1:30' && formatClock(45) === '0:45',
        exCount: (typeof exercises !== 'undefined') ? exercises.length : 0,
        achievements: typeof computeAchievements === 'function' && computeAchievements({ quests: [{ done: true }] }).total === 22 && computeAchievements({ streak: 30, fitnessObjective: 'seche' }).badges.find(b => b.id === 'objective-set').unlocked === true && computeAchievements({ weights: [{ value: 75, date: '2026-07-17' }, { value: 80, date: '2026-01-01' }], goals: { targetWeight: 75 } }).badges.find(b => b.id === 'weight-goal').unlocked === true && computeAchievements({ weights: [{ value: 80, date: '2026-07-17' }, { value: 75, date: '2026-01-01' }], goals: { targetWeight: 75 } }).badges.find(b => b.id === 'weight-goal').unlocked === false && document.querySelectorAll('#achievementList .achievement').length >= 10,
        lifetime: typeof lifetimeStats === 'function' && !!document.getElementById('lifetimeStats') && lifetimeStats({ workouts: [{ type: 'run', duration: 60, distance: 10 }] }).runKm === 10,
        levelUp: typeof leveledUp === 'function' && leveledUp(90, 110) === 2 && leveledUp(120, 150) === null,
        quests: document.querySelectorAll('#questList .quest').length,
        exercises: document.querySelectorAll('#exerciseCards .exercise-card').length,
        levelSet: (document.querySelector('#xpLabel')||{}).textContent || ''
      };
      // Miroir IndexedDB (async, BLOQUANT) : écriture + relecture d'une sonde, instantanés quotidiens
      // (snap du jour présent, élagage à 7), puis on remet le vrai état.
      checks.idbMirror = await (async () => {
        if (typeof idbMirrorState !== 'function' || typeof idbReadState !== 'function' || typeof idbReadCandidates !== 'function' || typeof restoreFromIdbIfEmpty !== 'function' || typeof scheduleIdbMirror !== 'function') return false;
        const ok = await idbMirrorState('{"probe":"smoke"}');
        if (!ok) return false;
        const back = await idbReadState();
        if (!(typeof back === 'string' && back.indexOf('probe') !== -1)) return false;
        // seed 8 vieux instantanés puis un miroir → l'élagage doit garder <= 7 et conserver celui du jour
        const dbS = await idbOpen(); if (!dbS) return false;
        await new Promise(res => { const tx = dbS.transaction('state', 'readwrite'), st = tx.objectStore('state'); for (let i = 1; i <= 8; i++) st.put({ json: '{}', at: 1 }, 'snap:2020-01-0' + i); tx.oncomplete = res; tx.onerror = res; });
        dbS.close();
        await idbMirrorState(JSON.stringify(state)); // remet aussi le miroir sur l'état réel
        const dbK = await idbOpen(); if (!dbK) return false;
        const keys = await new Promise(res => { const tx = dbK.transaction('state', 'readonly'), rq = tx.objectStore('state').getAllKeys(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => res([]); });
        dbK.close();
        const snaps = keys.filter(k => typeof k === 'string' && k.indexOf('snap:') === 0);
        if (snaps.length > 7 || snaps.indexOf('snap:' + localDate()) === -1) return false;
        // les candidats de restauration listent la copie principale en premier
        const cands = await idbReadCandidates();
        return Array.isArray(cands) && cands.length >= 1 && typeof cands[0] === 'string';
      })();
      // Préflight d'import (BLOQUANT) : aperçu + avertissements + refus → null, sans écraser l'état.
      checks.importPreflight = (() => {
        if (typeof describeBackup !== 'function' || typeof backupImportWarnings !== 'function' || typeof confirmBackupImport !== 'function') return false;
        const dd = describeBackup({ workouts: [{ date: '2026-01-02' }, { date: '2026-01-03' }], applications: [{ date: '2026-01-05' }], xp: '50' });
        if (!(dd.workouts === 2 && dd.applications === 1 && dd.xp === 50 && dd.lastDate === '2026-01-05')) return false;
        if (!backupImportWarnings({ applications: [{}, {}, {}, {}] }, {}).length) return false;
        const before = state.xp; const oc = window.confirm; let seen = '';
        window.confirm = m => { seen = String(m); return false; };
        const r = confirmBackupImport({ workouts: [{ date: '2026-01-01' }] });
        window.confirm = oc;
        return r === null && state.xp === before && seen.indexOf('séance') !== -1 && seen.indexOf('Remplacer') !== -1;
      })();
      // Santé du stockage (async, BLOQUANT) : le bilan se rend avec les vraies mesures.
      checks.storageHealth = await (async () => {
        if (typeof storageHealthSummary !== 'function' || typeof formatBytes !== 'function' || typeof renderStorageHealth !== 'function') return false;
        if (!document.getElementById('storageHealth') || !document.getElementById('storageHealthBtn')) return false;
        const s = storageHealthSummary({ stateBytes: 4.5 * 1024 * 1024, now: Date.now() });
        if (s.level !== 'crit') return false;
        await renderStorageHealth();
        const el = document.getElementById('storageHealth');
        return !el.hidden && /Données de l/.test(el.textContent) && /storage-health sh-/.test(el.className);
      })();
      return checks;
    })()`);
    console.log('CHECKS ' + JSON.stringify(checks));
    if (!checks.logicLoaded) errors.push('lib/logic.js non chargé (localDate/pct/computeStreak absents)');
    if (!checks.normalize) errors.push('normalizeState absente');
    if (!checks.normalizeHardening) errors.push('Assainissement scalaires normalizeState KO (compteurs/goals/wellnessWeeklyGoal non bornés)');
    if (!checks.photosApi) errors.push('API photos absente (loadGalleryPhotos/migratePhotosToDisk/desktop.savePhoto)');
    if (!checks.studyPlanner) errors.push('Planificateur de révision absent (studyPlanForm/planStudySessions/buildIcs)');
    if (!checks.myDay) errors.push('Vue Ma journée absente ou non rendue (myDayList/todayItems/myDaySummary)');
    if (!checks.nextStudy) errors.push('Prochaine révision KO (nextStudySession / #nextStudyLine)');
    if (!checks.charts) errors.push('Graphiques absents (chartGrid/weeklyAggregate/renderCharts)');
    if (!checks.weekView) errors.push('Vue Ma semaine absente (weekGrid/weekItems/renderWeekPage/openWeekPage)');
    if (!checks.printReport) errors.push('Bilan PDF absent (printReport/weeklySummary/renderPrintReport/printWeekReport)');
    if (!checks.theme) errors.push('Thème absent (themeToggle / variable --surface-2)');
    if (!checks.raceGoal) errors.push('Objectif de course absent (raceGoalType/raceGoalStatus/renderRaceGoal)');
    if (!checks.supplements) errors.push('Compléments absents (suppHeat/hydrationPlan/suppProteinTarget)');
    if (!checks.nutritionPlus) errors.push('Nutrition+ absente (supplementTiming/searchFoods/foodResults/suppTimingGrid)');
    if (!checks.kitchen) errors.push('Cuisine du jour absente (generateMeals/pantryList/mealSuggestions/envieStyles)');
    if (!checks.hydration) errors.push('Hydratation absente (waterStatus/waterPlus/waterMinus/hydraFill)');
    if (!checks.hydrationPace) errors.push('Rythme hydratation KO (hydrationPace / #hydraPace absent)');
    if (!checks.records) errors.push('Records perso absents (personalRecords/exerciseDetailNotes)');
    if (!checks.strengthRecords) errors.push('Palmarès de force KO (strengthRecords : séance legacy `w.exercise` doit compter dans le palmarès, comme personalRecords #440)');
    if (!checks.progression) errors.push('Suggestion de progression KO (progressionSuggestion : séance legacy `w.exercise` doit être comptée, pas seulement `exercises[]`)');
    if (!checks.tonnage) errors.push('Tonnage séance KO (workoutTonnage : séance legacy `w.exercise` doit peser charge×reps×séries, pas 0 kg — cascade lifetimeTonnage/bestSessionTonnage/charts)');
    if (!checks.coachWeek) errors.push('Semaine type Coach Poids KO (coachWeekPlan : semaine lundi-en-tête, dimanche EN DERNIER — pas dim=0 en tête)');
    if (!checks.shopping) errors.push('Liste de courses absente (buildShoppingList/shoppingBlock/shoppingList/copyShoppingBtn)');
    if (!checks.agendaImport) errors.push('Import agenda absent (parseIcs/importIcs/importIcsKind/calendarAgendaPriority)');
    if (!checks.agendaUx) errors.push('UX agenda absente (weekQuickAdd/agendaFilters 5 filtres/importIcsWeek)');
    if (!checks.agendaSearch) errors.push('Recherche agenda absente (agendaMatch/agendaSearch)');
    if (!checks.agendaDay) errors.push('Vue Jour absente (renderDayView/renderAgenda/dayView/agendaViewSwitch 2 vues)');
    if (!checks.agendaPostponeUndo) errors.push('Annulation report jour KO (postpone → demain sans undo restaurant la date)');
    if (!checks.dayGrid) errors.push('Grille horaire absente (dayColumns/endTimeOf)');
    if (!checks.agendaDetails) errors.push('Détails événement absents (departureInfo/location/travel/notes)');
    if (!checks.agendaEdit) errors.push('Ajout rapide/édition détaillés absents (weekQuickLocation/Travel/Notes/Estimate/agendaEditForm/editAgendaNotes)');
    if (!checks.closeButtonsA11y) errors.push('Bouton de fermeture (×) sans aria-label sur au moins un dialogue');
    if (!checks.navArrowsA11y) errors.push('Bouton-flèche de navigation (←/→) sans aria-label (mois/semaine)');
    if (!checks.restSoundA11y) errors.push('Case du bip de fin de repos (#restSoundToggle) sans aria-label');
    if (!checks.filterSelectsA11y) errors.push('Menu déroulant de filtre (#exerciseFamily / #suppKind) sans nom accessible (aria-label/title)');
    if (!checks.iconButtonsA11y) errors.push('Bouton icône seule (#weekQuickEstimate 🧭) sans aria-label — pas de nom accessible pour VoiceOver');
    if (!checks.guidedFromPlan) errors.push('Séance guidée depuis le programme absente (startGuidedFromNames/openGuidedWorkout/guidedWorkoutDialog)');
    if (!checks.settingsPage) errors.push('Page Réglages absente (data-page=settings/.settings-page/3 conn-row/settingsTheme/settingsDensity)');
    if (!checks.dataIo) errors.push('Export/import données absents (exportDataBtn/importDataBtn/dataIoStatus)');
    if (!checks.targetAdvice) errors.push('Conseil poids cible KO (weightTargetAdvice / #coachTargetAdvice)');
    if (!checks.coachTargetEditable) errors.push('Poids cible non unifié dans « Mon plan » (#coachTarget absent/ne sauvegarde pas, ou #targetWeight pas retiré)');
    if (!checks.programReset) errors.push('Purge programme KO (pruneProgramSessionsFrom)');
    if (!checks.plannedMergesProgram) errors.push('Fusion séances programme KO (upcomingSessions)');
    if (!checks.athleteZones) errors.push('Zones onglet Athlète KO (organizeAthleteZones / 3 intertitres / ordre / trail conditionnel)');
    if (!checks.studySubjects) errors.push('Révisions par matière KO (studyBySubject / #studySubjects)');
    if (!checks.digestBackup) errors.push('Rappel de sauvegarde KO (attentionDigest backup / state.lastBackup)');
    if (!checks.focusBreak) errors.push('Suggestion de pause KO (breakSuggestion / #focusBreakSuggest absent)');
    if (!checks.tomorrowPreview) errors.push('Aperçu de demain KO (tomorrowPreview / #myDayTomorrow absent)');
    if (!checks.weightStepperFit) errors.push('Stepper poids KO (décimale rognée ou flèches natives présentes)');
    if (!checks.weightGoalProgress) errors.push('Progression poids KO (weightGoalProgress absent ou faux)');
    if (!checks.settingsUpdate) errors.push('Panneau Mises à jour (Réglages) KO — éléments absents ou section masquée sur desktop');
    if (!checks.attentionDigest) errors.push('Digest « À rattraper » KO (attentionDigest / #attentionDigest / #attentionPanel)');
    if (!checks.focusByTask) errors.push('Focus par tâche KO (focusByTask / #focusByTask)');
    if (!checks.proteinStreak) errors.push('Série protéines KO (proteinStreak / #proteinStreak)');
    if (!checks.habitConsistency) errors.push('Régularité habitude 30 j KO (habitConsistency)');
    if (!checks.habitsWeekPulse) errors.push('Pouls hebdo habitudes KO (habitsWeekPulse / #habitWeekPulse absent)');
    if (!checks.habitEdit) errors.push('Édition habitude KO (applyHabitEdit / bouton data-habit-edit)');
    if (!checks.habitUndo) errors.push('Annuler suppression habitude KO (showUndoToast / restauration)');
    if (!checks.weightMilestones) errors.push('Paliers de poids KO (weightMilestones / trackingCadenceAdvice)');
    if (!checks.whatsNewDismiss) errors.push('Fermeture Nouveautés KO (.whatsnew-card[hidden] ne masque pas)');
    if (!checks.poidsTab) errors.push('Onglet Poids KO (pageGroups.poids / bouton nav / coach-weight-panel mal isolé)');
    if (!checks.navAriaCurrent) errors.push('Navigation a11y KO (aria-current absent sur l\'onglet actif)');
    if (!checks.escapeOverlay) errors.push('Échap ne ferme pas les overlays (handler keydown Escape)');
    if (!checks.dailyGreeting) errors.push('Salutation d\'accueil KO (dailyGreeting / #dailyMessage sans 👋)');
    if (!checks.backupFilename) errors.push('Sauvegarde PWA KO (backupFilename)');
    if (!checks.unwrapBackup) errors.push('Déballage sauvegarde KO (unwrapBackup — risque de perte de données à l\'import)');
    if (!checks.weightStepper) errors.push('Sélecteur de poids KO (boutons ±0,5 / #coachTarget n\'enregistre pas)');
    if (!checks.coachLogWeight) errors.push('Saisie rapide poids (onglet Poids) KO (#coachLogWeight / #coachLastWeigh)');
    if (!checks.weightUpsertShared) errors.push('Dédup pesée/jour KO (upsertWeight non partagé par #addWeightButton)');
    if (!checks.measureUpsert) errors.push('Mensuration/jour KO (upsertMeasurement : doublon de date ou fusion des champs cassée)');
    if (!checks.measureSpark) errors.push('Sparkline mensurations KO (measurementSeries / sparkLineSvg / #measurementsSpark)');
    if (!checks.sleepSpark) errors.push('Sparkline sommeil KO (sleepSeries / sparkLineSvg / #sleepSpark)');
    if (!checks.sleepCoach) errors.push('Bilan sommeil (coach) KO (sleepCoachInsight / sleepRegularity / bedtimeRegularity / #sleepCoach)');
    if (!checks.sleepImpact) errors.push('Effet du coucher KO (sleepImpactReport / #sleepImpact / rendu)');
    if (!checks.sleepBedtimeRegularity) errors.push('Régularité du coucher KO (bedtimeRegularity ne prime plus sur la durée dans sleepCoachInsight)');
    if (!checks.sleepBedtime) errors.push('Capture heure de coucher KO (bedtimeAnchor / recentBedtimeAnchor / #bedtimeInput)');
    if (!checks.sleepReschedule) errors.push('Plan de recalage sommeil KO (sleepPlanDay / startSleepPlan / normalizeSleepPlan / #sleepPlan)');
    if (!checks.sleepRpg) errors.push('Coach sommeil RPG KO (sleepEveningTips / sleepPlanAdherence / sleepBedtimeReward)');
    if (!checks.s8Travel) errors.push('Trajet auto S.8 absent (isAllowedTravelUrl/travelModes/calendarAgendaEstimate/travelStartForm/travelHome/travelMode)');
    if (!checks.goalsZones) errors.push('Objectifs par zone absents (goalMatch/goalRank/TRAINING_GOALS/#exerciseGoal 8 options)');
    if (!checks.animEngine) errors.push('Moteur d’animation absent (buildAnimatedArt/EXERCISE_ANIM/frame-a/frame-b)');
    if (!checks.zonePlan) errors.push('Programme par zone absent (buildZonePlan/zoneTopExercises/zonePlanBtn/zonePlanDialog/zonePlanTable)');
    if (!checks.muscleBalance) errors.push('Équilibre poussée/tirage KO (muscleBalance : un exercice back+shoulders comme la suspension barre doit compter en tirage seul, pas des deux côtés)');
    if (!checks.weekProgram) errors.push('Planificateur semaine absent (buildTrainingWeek/wpGoals 7/wpGenerate/wpSchedule)');
    if (!checks.birthdays) errors.push('Anniversaires absents (birthdaysForDay/normalizeBirthday/birthdayForm/birthdayList)');
    if (!checks.ux2pass2) errors.push('UX#2 passe 2 KO (3 details.calendar-setting / trail-plan retiré / collapse-toggle sur article.panel)');
    if (!checks.ux3) errors.push('D2/B3 KO (upcomingBirthdays / birthdayUpcoming / trail-panel regroupé dans training-grid)');
    if (!checks.ageLabel) errors.push('Libellé d’âge KO (ageLabel singulier/pluriel : « 1 an » / « 2 ans » / âge inconnu → vide)');
    if (!checks.ageLabelList) errors.push('Liste anniversaires KO (renderBirthdays doit accorder l’âge via ageLabel : « 1 an » et non « 1 ans », comme le bandeau « À venir » et le calendrier)');
    if (!checks.photoCompareDelta) errors.push('Écart photos KO (renderGrowth doit accorder « jour » au singulier à 1 jour : « 1 jour d’écart » et non « 1 jours »)');
    if (!checks.objectiveRunPlural) errors.push('En-tête programme auto KO (runObjectiveProgram doit accorder « course » au pluriel quand runs > 1 : « 4 courses/sem. » et non « 4 course/sem. »)');
    if (!checks.dashboardInputLabels) errors.push('A11y tableau de bord KO (todoInput/habitInput/lifeGoalOne..Three/focusTaskInput doivent avoir un aria-label — nom accessible, placeholder insuffisant)');
    if (!checks.calorieFloor) errors.push('Ajustement calorique KO (calorieAdjustment : baisse annoncée ≠ baisse réelle près du plancher 1200)');
    if (!checks.recurring) errors.push('Récurrence KO (recurrenceMatches/normalizeRecurring/recurringForm/recFreq/recurringList)');
    if (!checks.habits) errors.push('Habitudes KO (habitsForDay/habitStreak/habitForm/habitList/habitDays 7 jours)');
    if (!checks.recDone) errors.push('Validation récurrent KO (completeRecurringOn/doneLog)');
    if (!checks.calSync) errors.push('Sync calendrier KO (normalizeCalendarUrl/calSubForm/calSubList/calSyncAll/desktop.fetchCalendar)');
    if (!checks.exIcons) errors.push('Illustrations exercices KO (exerciseIcon viewBox/animate/patterns distincts)');
    if (!checks.icsRrule) errors.push('Import RRULE KO (parseRRule / parseIcs ne remonte pas recurrence)');
    if (!checks.icsCount) errors.push('Import RRULE COUNT KO (parseRRule ne borne pas une serie finie → recurrence infinie)');
    if (!checks.icsRecurringMerge) errors.push('Re-sync recurrent KO (mergeRecurring ne preserve pas doneLog/skipLog/paused/id → historique efface a la re-sync)');
    if (!checks.icsExport) errors.push('Export RRULE KO (buildRRuleLine / buildIcs ne produit pas de RRULE)');
    if (!checks.todo) errors.push('To-Do absente (todosForDay/normalizeTodo/todoForm/todoList/todoPriorityBtn)');
    if (!checks.alternance) errors.push('Module Alternance KO (applicationStats/normalizeApplication/onglet/flux « J\'ai postulé »)');
    if (!checks.coachAdherence) errors.push('Adhérence hebdo KO (weeklyAdherence : score, ou compte des ENTRÉES au lieu des JOURS distincts sur date en double)');
    if (!checks.questStreak) errors.push('Série quêtes parfaites KO (questPerfectStreak : perfectDays/loggedDays doivent compter des JOURS distincts, pas des entrées, sur date en double)');
    if (!checks.lifeStep) errors.push('Pas du jour KO (lifeStepStats : doneDays/loggedDays doivent compter des JOURS distincts, pas des entrées, sur date en double)');
    if (!checks.coachFocus) errors.push('Coach adaptatif KO (adaptiveCoachFocus/carte « Le focus du moment »/rendu)');
    if (!checks.sheetSync) errors.push('Sync Google Sheets KO (normalizeSheetCsvUrl/mergeApplications/UI/rendu)');
    if (!checks.altHideRejected) errors.push('Masquage des refusées KO (altRejectedToggle/hideRejected/rendu liste)');
    if (!checks.altFilter) errors.push('Recherche/filtre du suivi alternance KO (filterApplications/altSearch/altStatusFilter)');
    if (!checks.altTarget) errors.push('Cible du jour KO (nextAlternanceTarget/héros/flux J’ai postulé)');
    if (!checks.altRelance) errors.push('Relances/tri par score KO (compareApplications/chips relance cliquables)');
    if (!checks.altStatusRefresh) errors.push('Rafraîchissement du coach au changement de statut (select alternance) KO');
    if (!checks.idbMirror) errors.push('Miroir IndexedDB KO (idbMirrorState/idbReadState : écriture/relecture)');
    if (!checks.storageHealth) errors.push('Santé du stockage KO (storageHealthSummary/renderStorageHealth/panneau Réglages)');
    if (!checks.importPreflight) errors.push('Préflight d’import KO (describeBackup/backupImportWarnings/confirmBackupImport)');
    if (!checks.iosInstallHint) errors.push('Aide installation iOS KO (isIosInstallable / #iosInstallHint / iPad-as-Mac iPadOS 13+ non reconnu)');
    if (!checks.comfort) errors.push('Confort absent (backToTop/densityToggle/appVersion)');
    if (!checks.autoUpdate) errors.push('Auto-update absent (desktop.installUpdate/onUpdateStatus/updateBanner)');
    if (!checks.updateSilent) errors.push('MAJ silencieuse KO (applyUpdateStatus : pop-up pendant le téléchargement, ou absente quand prête)');
    if (!checks.weekPlanner) errors.push('Planificateur hebdo absent (buildWeekPlan/generateAutomaticWeek/7 cases jours)');
    if (!checks.volume) errors.push('Montée en volume absente (volumeRamp/volStart/renderVolumeGoal)');
    if (!checks.warmup) errors.push('Échauffement guidé absent (warmupFor/guidedWarmupList)');
    if (!checks.cooldown) errors.push('Retour au calme absent (cooldownFor/guidedCooldownList)');
    if (checks.exCount < 37) errors.push('Bibliothèque incomplète : ' + checks.exCount + ' exercices (attendu ≥ 37)');
    if (!checks.libraryReset) errors.push('Réinitialisation des filtres bibliothèque KO (activeExerciseFilters / #exerciseFilterBar / reset)');
    if (checks.quests < 1) errors.push('#questList vide → render() ne s\'est pas exécuté');
    if (!checks.questPerfectCelebrate) errors.push('Célébration journée parfaite KO (celebrateQuestsIfPerfect / showFlashToast)');
    if (!checks.morningStreak) errors.push('Série check-in matinal KO (morningStreak / #morningStreak)');
    if (!checks.readinessTrend) errors.push('Tendance de forme KO (readinessTrend / #readinessTrend — doublon de date compté deux fois ?)');
    if (!checks.wellnessBestStreak) errors.push('Record série bien-être KO (wellnessBestStreak — date impossible gonfle le record ?)');
    if (checks.exercises < 1) errors.push('#exerciseCards vide → renderExerciseLibrary KO');
  } catch (e) {
    errors.push('exception: ' + e.message);
  }

  clearTimeout(bail);
  if (errors.length) { console.error('SMOKE FAIL:\n' + errors.join('\n')); app.exit(1); }
  else { console.log('SMOKE OK'); app.exit(0); }
});
