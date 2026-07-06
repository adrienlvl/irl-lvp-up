/*
 * renderer-smoke.cjs — vérifie que index.html + app.js se chargent SANS erreur JS
 * dans un vrai renderer Electron (ce qu'un simple "le process tourne encore" ne détecte pas).
 * Sortie : code 0 = OK, code 1 = échec (avec détail).
 * Lancé via `npm run test:smoke`.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Stubs des canaux IPC attendus par preload/app.js (sinon rejets non gérés parasites).
ipcMain.handle('notifications:get', () => ({ enabled: false, times: ['09:00', '18:00'], lastSent: {} }));
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
      nodeIntegration: false
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
    if (checks.quests < 1) errors.push('#questList vide → render() ne s\'est pas exécuté');
    if (checks.exercises < 1) errors.push('#exerciseCards vide → renderExerciseLibrary KO');
  } catch (e) {
    errors.push('exception: ' + e.message);
  }

  clearTimeout(bail);
  if (errors.length) { console.error('SMOKE FAIL:\n' + errors.join('\n')); app.exit(1); }
  else { console.log('SMOKE OK'); app.exit(0); }
});
