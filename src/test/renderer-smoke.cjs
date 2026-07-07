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
        printReport: !!document.getElementById('printReport') && typeof weeklySummary === 'function' && typeof renderPrintReport === 'function' && !!document.getElementById('printWeekReport'),
        theme: !!document.getElementById('themeToggle') && (getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim().length > 0),
        raceGoal: !!document.getElementById('raceGoalType') && typeof raceGoalStatus === 'function' && typeof renderRaceGoal === 'function',
        supplements: !!document.getElementById('suppHeat') && typeof hydrationPlan === 'function' && !!(document.getElementById('suppProteinTarget') || {}).textContent,
        nutritionPlus: typeof supplementTiming === 'function' && typeof searchFoods === 'function' && !!document.getElementById('foodResults') && (document.querySelectorAll('#suppTimingGrid .supp-phase').length >= 3),
        kitchen: typeof generateMeals === 'function' && !!document.getElementById('pantryList') && !!document.getElementById('mealSuggestions') && !!document.getElementById('envieStyles'),
        shopping: typeof buildShoppingList === 'function' && !!document.getElementById('shoppingBlock') && !!document.getElementById('shoppingList') && !!document.getElementById('copyShoppingBtn'),
        agendaImport: typeof parseIcs === 'function' && !!document.getElementById('importIcs') && !!document.getElementById('importIcsKind') && !!document.getElementById('calendarAgendaPriority'),
        agendaUx: !!document.getElementById('weekQuickAdd') && !!document.getElementById('agendaFilters') && !!document.getElementById('importIcsWeek') && document.querySelectorAll('#agendaFilters [data-filter]').length === 5,
        agendaDay: typeof renderDayView === 'function' && typeof renderAgenda === 'function' && !!document.getElementById('dayView') && document.querySelectorAll('#agendaViewSwitch [data-view]').length === 2,
        birthdays: typeof birthdaysForDay === 'function' && typeof normalizeBirthday === 'function' && !!document.getElementById('birthdayForm') && !!document.getElementById('birthdayList'),
        ux2pass2: document.querySelectorAll('details.calendar-setting').length === 3 && !document.querySelector('.trail-plan') && !!document.querySelector('.training-grid > article.panel .collapse-toggle'),
        ux3: typeof upcomingBirthdays === 'function' && !!document.getElementById('birthdayUpcoming') && !!document.querySelector('.training-grid > .trail-panel'),
        todo: typeof todosForDay === 'function' && typeof normalizeTodo === 'function' && !!document.getElementById('todoForm') && !!document.getElementById('todoList') && !!document.getElementById('todoPriorityBtn'),
        comfort: !!document.getElementById('backToTop') && !!document.getElementById('densityToggle') && !!document.getElementById('appVersion'),
        autoUpdate: !!(window.desktop && typeof window.desktop.installUpdate === 'function' && typeof window.desktop.onUpdateStatus === 'function') && !!document.getElementById('updateBanner') && !!document.getElementById('updateInstallBtn'),
        weekPlanner: typeof buildWeekPlan === 'function' && typeof generateAutomaticWeek === 'function' && document.querySelectorAll('#availabilityDays input').length === 7,
        volume: typeof volumeRamp === 'function' && !!document.getElementById('volStart') && typeof renderVolumeGoal === 'function',
        warmup: typeof warmupFor === 'function' && !!document.getElementById('guidedWarmupList'),
        exCount: (typeof exercises !== 'undefined') ? exercises.length : 0,
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
    if (!checks.shopping) errors.push('Liste de courses absente (buildShoppingList/shoppingBlock/shoppingList/copyShoppingBtn)');
    if (!checks.agendaImport) errors.push('Import agenda absent (parseIcs/importIcs/importIcsKind/calendarAgendaPriority)');
    if (!checks.agendaUx) errors.push('UX agenda absente (weekQuickAdd/agendaFilters 5 filtres/importIcsWeek)');
    if (!checks.agendaDay) errors.push('Vue Jour absente (renderDayView/renderAgenda/dayView/agendaViewSwitch 2 vues)');
    if (!checks.birthdays) errors.push('Anniversaires absents (birthdaysForDay/normalizeBirthday/birthdayForm/birthdayList)');
    if (!checks.ux2pass2) errors.push('UX#2 passe 2 KO (3 details.calendar-setting / trail-plan retiré / collapse-toggle sur article.panel)');
    if (!checks.ux3) errors.push('D2/B3 KO (upcomingBirthdays / birthdayUpcoming / trail-panel regroupé dans training-grid)');
    if (!checks.todo) errors.push('To-Do absente (todosForDay/normalizeTodo/todoForm/todoList/todoPriorityBtn)');
    if (!checks.comfort) errors.push('Confort absent (backToTop/densityToggle/appVersion)');
    if (!checks.autoUpdate) errors.push('Auto-update absent (desktop.installUpdate/onUpdateStatus/updateBanner)');
    if (!checks.weekPlanner) errors.push('Planificateur hebdo absent (buildWeekPlan/generateAutomaticWeek/7 cases jours)');
    if (!checks.volume) errors.push('Montée en volume absente (volumeRamp/volStart/renderVolumeGoal)');
    if (!checks.warmup) errors.push('Échauffement guidé absent (warmupFor/guidedWarmupList)');
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
