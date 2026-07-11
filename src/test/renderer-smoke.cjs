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
    const checks = await win.webContents.executeJavaScript(`(function(){
      return {
        logicLoaded: typeof localDate === 'function' && typeof pct === 'function' && typeof computeStreak === 'function' && typeof normalizeAgendaItem === 'function',
        normalize: typeof normalizeState === 'function',
        photosApi: typeof loadGalleryPhotos === 'function' && typeof migratePhotosToDisk === 'function' && !!(window.desktop && window.desktop.savePhoto),
        studyPlanner: !!document.getElementById('studyPlanForm') && typeof planStudySessions === 'function' && typeof buildIcs === 'function',
        myDay: !!document.getElementById('myDayList') && typeof todayItems === 'function' && !!(document.getElementById('myDaySummary') || {}).textContent,
        charts: !!document.getElementById('chartGrid') && typeof weeklyAggregate === 'function' && typeof renderCharts === 'function',
        weekView: !!document.getElementById('weekGrid') && typeof weekItems === 'function' && typeof renderWeekPage === 'function' && !!document.getElementById('openWeekPage'),
        monthDayJump: typeof renderMonthCalendar === 'function' && (() => { renderMonthCalendar(); return document.querySelectorAll('#monthCalendar .month-day[data-cal-day]').length >= 28; })(),
        printReport: !!document.getElementById('printReport') && typeof weeklySummary === 'function' && typeof renderPrintReport === 'function' && !!document.getElementById('printWeekReport'),
        theme: !!document.getElementById('themeToggle') && (getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim().length > 0),
        raceGoal: !!document.getElementById('raceGoalType') && typeof raceGoalStatus === 'function' && typeof renderRaceGoal === 'function',
        nextSession: typeof nextTrainingSession === 'function' && !!document.getElementById('nextSessionLine') && (nextTrainingSession([{ id: 1, date: '2999-01-02', time: '10:00', type: 'X' }], '2999-01-01', 0) || {}).daysLeft === 1,
        weekStreak: typeof weeklyWorkoutStreak === 'function' && !!document.getElementById('weekStreakBadge') && weeklyWorkoutStreak([{ date: '2026-07-08' }, { date: '2026-07-01' }], '2026-07-10') === 2,
        focusStreak: typeof dailyStreak === 'function' && dailyStreak(['2026-07-10', '2026-07-09', '2026-07-08'], '2026-07-10') === 3,
        supplements: !!document.getElementById('suppHeat') && typeof hydrationPlan === 'function' && !!(document.getElementById('suppProteinTarget') || {}).textContent,
        nutritionPlus: typeof supplementTiming === 'function' && typeof searchFoods === 'function' && !!document.getElementById('foodResults') && (document.querySelectorAll('#suppTimingGrid .supp-phase').length >= 3),
        hydration: typeof waterStatus === 'function' && !!document.getElementById('waterPlus') && !!document.getElementById('waterMinus') && !!document.getElementById('hydraFill') && !!document.getElementById('proteinFill') && typeof proteinTarget === 'function',
        proteinQuick: !!document.getElementById('proteinPlus20') && !!document.getElementById('proteinPlus30') && !!document.getElementById('proteinMinus'),
        records: typeof personalRecords === 'function' && !!document.getElementById('exerciseDetailNotes'),
        progSpark: typeof exerciseVolumeSeries === 'function' && (s => s.length === 2 && s[1].volume === 150)(exerciseVolumeSeries([{ name: 'T', date: '2026-06-01', volume: 100 }, { name: 'T', date: '2026-06-03', volume: 150 }], 'T', 8)),
        weightTrend: typeof weightTrend === 'function' && !!document.getElementById('weightTrend') && (t => t && t.ratePerWeek === -0.5 && t.weeksToTarget === 4)(weightTrend([{ date: '2026-06-26', value: 82 }, { date: '2026-07-10', value: 81 }], 79)),
        measureTrend: typeof measurementDelta === 'function' && !!document.getElementById('measurementsTrend') && (d => d && d.delta === -3)(measurementDelta([{ date: '2026-06-01', waist: 88 }, { date: '2026-07-01', waist: 85 }], 'waist')),
        kitchen: typeof generateMeals === 'function' && !!document.getElementById('pantryList') && !!document.getElementById('mealSuggestions') && !!document.getElementById('envieStyles'),
        shopping: typeof buildShoppingList === 'function' && !!document.getElementById('shoppingBlock') && !!document.getElementById('shoppingList') && !!document.getElementById('copyShoppingBtn'),
        shoppingCheck: typeof remainingShopping === 'function' && !!document.getElementById('shoppingRemaining') && remainingShopping([{ label: 'a' }, { label: 'b' }], { a: true }) === 1,
        agendaImport: typeof parseIcs === 'function' && !!document.getElementById('importIcs') && !!document.getElementById('importIcsKind') && !!document.getElementById('calendarAgendaPriority'),
        agendaUx: !!document.getElementById('weekQuickAdd') && !!document.getElementById('agendaFilters') && !!document.getElementById('importIcsWeek') && document.querySelectorAll('#agendaFilters [data-filter]').length === 5,
        agendaSearch: typeof agendaMatch === 'function' && !!document.getElementById('agendaSearch'),
        agendaDay: typeof renderDayView === 'function' && typeof renderAgenda === 'function' && !!document.getElementById('dayView') && document.querySelectorAll('#agendaViewSwitch [data-view]').length === 2,
        dayGrid: typeof dayColumns === 'function' && typeof endTimeOf === 'function',
        agendaDetails: typeof departureInfo === 'function' && !!document.getElementById('calendarAgendaLocation') && !!document.getElementById('calendarAgendaTravel') && !!document.getElementById('calendarAgendaNotes'),
        agendaEdit: !!document.getElementById('weekQuickLocation') && !!document.getElementById('weekQuickTravel') && !!document.getElementById('weekQuickNotes') && !!document.getElementById('weekQuickEstimate') && !!document.getElementById('agendaEditForm') && !!document.getElementById('editAgendaNotes'),
        agendaDuplicate: typeof duplicateAgendaItem === 'function' && !!document.getElementById('duplicateAgendaEdit') && (duplicateAgendaItem({ id: 1, date: '2026-07-10', planId: 9, completed: true }, 2) || {}).planId === undefined,
        guidedFromPlan: typeof startGuidedFromNames === 'function' && typeof openGuidedWorkout === 'function' && !!document.getElementById('guidedWorkoutDialog'),
        settingsPage: !!document.querySelector('[data-page="settings"]') && !!document.querySelector('.settings-page') && document.querySelectorAll('.settings-conn .conn-row').length === 3 && !!document.getElementById('settingsTheme') && !!document.getElementById('settingsDensity'),
        dataIo: !!document.getElementById('exportDataBtn') && !!document.getElementById('importDataBtn') && !!document.getElementById('dataIoStatus'),
        s8Travel: typeof isAllowedTravelUrl === 'function' && typeof travelModes === 'function' && !!document.getElementById('calendarAgendaEstimate') && !!document.getElementById('travelStartForm') && !!document.getElementById('travelHome') && !!document.getElementById('travelMode'),
        goalsZones: typeof goalMatch === 'function' && typeof goalRank === 'function' && Array.isArray(TRAINING_GOALS) && document.querySelectorAll('#exerciseGoal option').length === 8,
        animEngine: typeof buildAnimatedArt === 'function' && typeof EXERCISE_ANIM === 'object' && /sheet-9 art-p1 frame-a/.test(buildAnimatedArt('9 p1 p4', '', 'x')) && /sheet-9 art-p4 frame-b/.test(buildAnimatedArt('9 p1 p4', '', 'x')) && /exercise-art-anim/.test(exercisePicture('Tractions', '', true)),
        zonePlan: typeof buildZonePlan === 'function' && typeof zoneTopExercises === 'function' && !!document.getElementById('zonePlanBtn') && !!document.getElementById('zonePlanDialog') && !!document.getElementById('zonePlanTable'),
        weekProgram: typeof buildTrainingWeek === 'function' && !!document.getElementById('wpGoals') && document.querySelectorAll('#wpGoals input').length === 7 && !!document.getElementById('wpGenerate') && !!document.getElementById('wpSchedule') && !!document.getElementById('wpSameDay'),
        birthdays: typeof birthdaysForDay === 'function' && typeof normalizeBirthday === 'function' && !!document.getElementById('birthdayForm') && !!document.getElementById('birthdayList'),
        ux2pass2: document.querySelectorAll('details.calendar-setting').length >= 3 && !document.querySelector('.trail-plan') && !!document.querySelector('.training-grid > article.panel .collapse-toggle'),
        ux3: typeof upcomingBirthdays === 'function' && !!document.getElementById('birthdayUpcoming') && !!document.querySelector('.training-grid > .trail-panel'),
        recurring: typeof recurrenceMatches === 'function' && typeof normalizeRecurring === 'function' && !!document.getElementById('recurringForm') && !!document.getElementById('recFreq') && !!document.getElementById('recurringList'),
        habits: typeof habitsForDay === 'function' && typeof habitStreak === 'function' && !!document.getElementById('habitForm') && !!document.getElementById('habitList') && document.querySelectorAll('#habitDays input').length === 7,
        habitWeek: typeof habitWeekMap === 'function' && (m => m.length === 7 && m[6].key === '2026-07-10' && m[6].done === true)(habitWeekMap({ id: 1, weekdays: [], log: ['2026-07-10'] }, '2026-07-10')),
        recDone: typeof completeRecurringOn === 'function' && (L => { const r = normalizeRecurring({ id: 1, doneLog: ['2026-07-07'] }); return r.doneLog.length === 1; })(),
        calSync: typeof normalizeCalendarUrl === 'function' && !!document.getElementById('calSubForm') && !!document.getElementById('calSubList') && !!document.getElementById('calSyncAll') && !!(window.desktop && typeof window.desktop.fetchCalendar === 'function' && typeof window.desktop.getCalendarSubs === 'function'),
        exIcons: typeof exerciseIcon === 'function' && exerciseIcon('Tractions').includes('viewBox="0 0 80 76"') && exerciseIcon('Tractions', true).includes('<animate') && exerciseIcon('Goblet squat kettlebell') !== exerciseIcon('Pompes classiques') && (document.querySelector('.exercise-card .ex-svg') ? document.querySelectorAll('.exercise-card .ex-svg').length >= 1 : true),
        icsRrule: typeof parseRRule === 'function' && (parseIcs('BEGIN:VEVENT\\r\\nUID:x\\r\\nSUMMARY:R\\r\\nDTSTART:20260706T090000\\r\\nRRULE:FREQ=WEEKLY;BYDAY=MO\\r\\nEND:VEVENT')[0]||{}).recurrence != null,
        icsExport: typeof buildRRuleLine === 'function' && buildIcs([{ id: 1, title: 'R', time: '09:00', rule: { freq: 'weekly', interval: 1, weekdays: [1], startDate: '2026-07-06' } }]).includes('RRULE:FREQ=WEEKLY'),
        todo: typeof todosForDay === 'function' && typeof normalizeTodo === 'function' && !!document.getElementById('todoForm') && !!document.getElementById('todoList') && !!document.getElementById('todoPriorityBtn'),
        comfort: !!document.getElementById('backToTop') && !!document.getElementById('densityToggle') && !!document.getElementById('appVersion'),
        autoUpdate: !!(window.desktop && typeof window.desktop.installUpdate === 'function' && typeof window.desktop.onUpdateStatus === 'function') && !!document.getElementById('updateBanner') && !!document.getElementById('updateInstallBtn'),
        weekPlanner: typeof buildWeekPlan === 'function' && typeof generateAutomaticWeek === 'function' && document.querySelectorAll('#availabilityDays input').length === 7,
        volume: typeof volumeRamp === 'function' && !!document.getElementById('volStart') && typeof renderVolumeGoal === 'function',
        warmup: typeof warmupFor === 'function' && !!document.getElementById('guidedWarmupList'),
        cooldown: typeof cooldownFor === 'function' && !!document.getElementById('guidedCooldownList') && !!document.getElementById('guidedCooldown'),
        exCount: (typeof exercises !== 'undefined') ? exercises.length : 0,
        achievements: typeof computeAchievements === 'function' && computeAchievements({ quests: [{ done: true }] }).total === 14 && document.querySelectorAll('#achievementList .achievement').length >= 10,
        quests: document.querySelectorAll('#questList .quest').length,
        exercises: document.querySelectorAll('#exerciseCards .exercise-card').length,
        levelSet: (document.querySelector('#xpLabel')||{}).textContent || ''
      };
    })()`);
    console.log('CHECKS ' + JSON.stringify(checks));
    if (!checks.logicLoaded) errors.push('lib/logic.js non chargé (localDate/pct/computeStreak absents)');
    if (!checks.normalize) errors.push('normalizeState absente');
    if (!checks.photosApi) errors.push('API photos absente (loadGalleryPhotos/migratePhotosToDisk/desktop.savePhoto)');
    if (!checks.studyPlanner) errors.push('Planificateur de révision absent (studyPlanForm/planStudySessions/buildIcs)');
    if (!checks.myDay) errors.push('Vue Ma journée absente ou non rendue (myDayList/todayItems/myDaySummary)');
    if (!checks.charts) errors.push('Graphiques absents (chartGrid/weeklyAggregate/renderCharts)');
    if (!checks.weekView) errors.push('Vue Ma semaine absente (weekGrid/weekItems/renderWeekPage/openWeekPage)');
    if (!checks.printReport) errors.push('Bilan PDF absent (printReport/weeklySummary/renderPrintReport/printWeekReport)');
    if (!checks.theme) errors.push('Thème absent (themeToggle / variable --surface-2)');
    if (!checks.raceGoal) errors.push('Objectif de course absent (raceGoalType/raceGoalStatus/renderRaceGoal)');
    if (!checks.supplements) errors.push('Compléments absents (suppHeat/hydrationPlan/suppProteinTarget)');
    if (!checks.nutritionPlus) errors.push('Nutrition+ absente (supplementTiming/searchFoods/foodResults/suppTimingGrid)');
    if (!checks.kitchen) errors.push('Cuisine du jour absente (generateMeals/pantryList/mealSuggestions/envieStyles)');
    if (!checks.hydration) errors.push('Hydratation absente (waterStatus/waterPlus/waterMinus/hydraFill)');
    if (!checks.records) errors.push('Records perso absents (personalRecords/exerciseDetailNotes)');
    if (!checks.shopping) errors.push('Liste de courses absente (buildShoppingList/shoppingBlock/shoppingList/copyShoppingBtn)');
    if (!checks.agendaImport) errors.push('Import agenda absent (parseIcs/importIcs/importIcsKind/calendarAgendaPriority)');
    if (!checks.agendaUx) errors.push('UX agenda absente (weekQuickAdd/agendaFilters 5 filtres/importIcsWeek)');
    if (!checks.agendaSearch) errors.push('Recherche agenda absente (agendaMatch/agendaSearch)');
    if (!checks.agendaDay) errors.push('Vue Jour absente (renderDayView/renderAgenda/dayView/agendaViewSwitch 2 vues)');
    if (!checks.dayGrid) errors.push('Grille horaire absente (dayColumns/endTimeOf)');
    if (!checks.agendaDetails) errors.push('Détails événement absents (departureInfo/location/travel/notes)');
    if (!checks.agendaEdit) errors.push('Ajout rapide/édition détaillés absents (weekQuickLocation/Travel/Notes/Estimate/agendaEditForm/editAgendaNotes)');
    if (!checks.guidedFromPlan) errors.push('Séance guidée depuis le programme absente (startGuidedFromNames/openGuidedWorkout/guidedWorkoutDialog)');
    if (!checks.settingsPage) errors.push('Page Réglages absente (data-page=settings/.settings-page/3 conn-row/settingsTheme/settingsDensity)');
    if (!checks.dataIo) errors.push('Export/import données absents (exportDataBtn/importDataBtn/dataIoStatus)');
    if (!checks.s8Travel) errors.push('Trajet auto S.8 absent (isAllowedTravelUrl/travelModes/calendarAgendaEstimate/travelStartForm/travelHome/travelMode)');
    if (!checks.goalsZones) errors.push('Objectifs par zone absents (goalMatch/goalRank/TRAINING_GOALS/#exerciseGoal 8 options)');
    if (!checks.animEngine) errors.push('Moteur d’animation absent (buildAnimatedArt/EXERCISE_ANIM/frame-a/frame-b)');
    if (!checks.zonePlan) errors.push('Programme par zone absent (buildZonePlan/zoneTopExercises/zonePlanBtn/zonePlanDialog/zonePlanTable)');
    if (!checks.weekProgram) errors.push('Planificateur semaine absent (buildTrainingWeek/wpGoals 7/wpGenerate/wpSchedule)');
    if (!checks.birthdays) errors.push('Anniversaires absents (birthdaysForDay/normalizeBirthday/birthdayForm/birthdayList)');
    if (!checks.ux2pass2) errors.push('UX#2 passe 2 KO (3 details.calendar-setting / trail-plan retiré / collapse-toggle sur article.panel)');
    if (!checks.ux3) errors.push('D2/B3 KO (upcomingBirthdays / birthdayUpcoming / trail-panel regroupé dans training-grid)');
    if (!checks.recurring) errors.push('Récurrence KO (recurrenceMatches/normalizeRecurring/recurringForm/recFreq/recurringList)');
    if (!checks.habits) errors.push('Habitudes KO (habitsForDay/habitStreak/habitForm/habitList/habitDays 7 jours)');
    if (!checks.recDone) errors.push('Validation récurrent KO (completeRecurringOn/doneLog)');
    if (!checks.calSync) errors.push('Sync calendrier KO (normalizeCalendarUrl/calSubForm/calSubList/calSyncAll/desktop.fetchCalendar)');
    if (!checks.exIcons) errors.push('Illustrations exercices KO (exerciseIcon viewBox/animate/patterns distincts)');
    if (!checks.icsRrule) errors.push('Import RRULE KO (parseRRule / parseIcs ne remonte pas recurrence)');
    if (!checks.icsExport) errors.push('Export RRULE KO (buildRRuleLine / buildIcs ne produit pas de RRULE)');
    if (!checks.todo) errors.push('To-Do absente (todosForDay/normalizeTodo/todoForm/todoList/todoPriorityBtn)');
    if (!checks.comfort) errors.push('Confort absent (backToTop/densityToggle/appVersion)');
    if (!checks.autoUpdate) errors.push('Auto-update absent (desktop.installUpdate/onUpdateStatus/updateBanner)');
    if (!checks.weekPlanner) errors.push('Planificateur hebdo absent (buildWeekPlan/generateAutomaticWeek/7 cases jours)');
    if (!checks.volume) errors.push('Montée en volume absente (volumeRamp/volStart/renderVolumeGoal)');
    if (!checks.warmup) errors.push('Échauffement guidé absent (warmupFor/guidedWarmupList)');
    if (!checks.cooldown) errors.push('Retour au calme absent (cooldownFor/guidedCooldownList)');
    if (checks.exCount < 37) errors.push('Bibliothèque incomplète : ' + checks.exCount + ' exercices (attendu ≥ 37)');
    if (checks.quests < 1) errors.push('#questList vide → render() ne s\'est pas exécuté');
    if (checks.exercises < 1) errors.push('#exerciseCards vide → renderExerciseLibrary KO');
  } catch (e) {
    errors.push('exception: ' + e.message);
  }

  clearTimeout(bail);
  if (errors.length) { console.error('SMOKE FAIL:\n' + errors.join('\n')); app.exit(1); }
  else { console.log('SMOKE OK'); app.exit(0); }
});
