const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, safeStorage, dialog } = require('electron');
const path = require('path'); const fs = require('fs'); const https = require('https'); let win, tray, timer;
let autoUpdater; try { ({ autoUpdater } = require('electron-updater')); } catch (_) { autoUpdater = null; }
/* Logique partagée avec le renderer (récurrence testée dans lib/logic.js). */
const L = require(path.join(__dirname, 'lib', 'logic.js'));
/* Occurrences récurrentes du jour, depuis la copie locale de l'état. */
function recurringToday(s, date) { return (Array.isArray(s.recurring) ? s.recurring : []).map(L.normalizeRecurring).filter(r => !r.paused && L.recurrenceMatches(r.rule, date)); }
const settingsFile = () => path.join(app.getPath('userData'), 'notifications.json');
const stateBackupFile = () => path.join(app.getPath('userData'), 'irl-lvp-up-local-backup.json');
const stateBackupHistoryDir = () => path.join(app.getPath('userData'), 'irl-lvp-up-backups');
const isTime = t => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const NOTIF_DEFAULTS = { enabled: false, times: ['09:00', '18:00'], lastSent: {}, leadMinutes: 15, eveningTime: '21:00', eveningEnabled: true };
function settings() { try { const cfg = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); return { ...NOTIF_DEFAULTS, ...(cfg && typeof cfg === 'object' ? cfg : {}), lastSent: (cfg && cfg.lastSent) || {} }; } catch { return { ...NOTIF_DEFAULTS }; } }
function saveSettings(value) { fs.writeFileSync(settingsFile(), JSON.stringify(value, null, 2)); }
function showReminder(title, body) { if (Notification.isSupported()) new Notification({ title, body }).show(); }
/* Lecture défensive de la copie locale de l'état (try/catch, types vérifiés). */
function readBackupState() { try { const backup = JSON.parse(fs.readFileSync(stateBackupFile(), 'utf8')); return backup && typeof backup.state === 'object' ? backup.state : null; } catch { return null; } }
function todaySummary() { const s = readBackupState(); if (!s) return null; const now = new Date(), today = new Date(now - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); const events = (Array.isArray(s.agenda) ? s.agenda : []).filter(a => a && a.date === today && !a.completed).concat(recurringToday(s, today)); const study = events.filter(a => a.kind === 'study').length, sport = events.filter(a => a.kind === 'sport').length, others = events.length - study - sport; const quests = (Array.isArray(s.quests) ? s.quests : []).filter(q => q && !q.done).length; const bdays = (Array.isArray(s.birthdays) ? s.birthdays : []).filter(b => b && Number(b.month) === Number(today.slice(5, 7)) && Number(b.day) === Number(today.slice(8, 10))).map(b => String(b.name || '').slice(0, 40)).filter(Boolean); const parts = []; if (sport) parts.push(`${sport} séance${sport > 1 ? 's' : ''}`); if (study) parts.push(`${study} créneau${study > 1 ? 'x' : ''} de révision`); if (others > 0) parts.push(`${others} bloc${others > 1 ? 's' : ''}`); if (quests) parts.push(`${quests} quête${quests > 1 ? 's' : ''}`); if (bdays.length) parts.unshift(`🎂 anniversaire de ${bdays.join(' et ')}`); return parts.length ? `Aujourd’hui : ${parts.join(', ')}. Un pas à la fois.` : null; }
/* Rappel « X minutes avant » chaque événement du jour non terminé. Une seule notif
   par événement et par jour (clé evt-<id>-<date> dans lastSent). */
function checkEventReminders(cfg, now, date) { const s = readBackupState(); if (!s) return false; const lead = Math.min(60, Math.max(5, Number(cfg.leadMinutes) || 15)); let changed = false; const timed = (Array.isArray(s.agenda) ? s.agenda : []).filter(a => a && a.date === date && !a.completed && isTime(a.time)).map(a => ({ key: `evt-${a.id}-${date}`, time: a.time, title: a.title })).concat(recurringToday(s, date).filter(r => isTime(r.time)).map(r => ({ key: `rec-${r.id}-${date}`, time: r.time, title: r.title }))); timed.forEach(a => { const [h, m] = a.time.split(':').map(Number); const eventAt = new Date(now); eventAt.setHours(h, m, 0, 0); const diff = (eventAt - now) / 60000; if (diff > 0 && diff <= lead && cfg.lastSent[a.key] !== date) { cfg.lastSent[a.key] = date; changed = true; showReminder(`🔔 ${a.time} · ${String(a.title || 'Bloc').slice(0, 80)}`, `Dans ${Math.max(1, Math.round(diff))} min. Prépare-toi tranquillement.`); } }); return changed; }
/* Rappel du soir : s'il reste des blocs ou des quêtes non faits. */
function checkEveningReminder(cfg, time, date) { if (cfg.eveningEnabled === false) return false; const evening = isTime(cfg.eveningTime) ? cfg.eveningTime : '21:00'; if (time !== evening || cfg.lastSent[`evening-${date}`] === date) return false; const s = readBackupState(); if (!s) return false; const remaining = (Array.isArray(s.agenda) ? s.agenda : []).filter(a => a && a.date === date && !a.completed).length + recurringToday(s, date).filter(r => !r.doneLog.includes(date)).length; const quests = (Array.isArray(s.quests) ? s.quests : []).filter(q => q && !q.done).length; const habits = L.habitsForDay(s.habits, date).filter(h => !h.done).length; if (!remaining && !quests && !habits) return false; cfg.lastSent[`evening-${date}`] = date; const parts = []; if (remaining) parts.push(`${remaining} bloc${remaining > 1 ? 's' : ''}`); if (quests) parts.push(`${quests} quête${quests > 1 ? 's' : ''}`); if (habits) parts.push(`${habits} habitude${habits > 1 ? 's' : ''}`); showReminder('🌙 Fermer la journée', `Encore ${parts.join(', ')} aujourd’hui. Un petit geste suffit, puis repos.`); return true; }
function checkReminders() { const cfg = settings(); if (!cfg.enabled) return; const now = new Date(), time = now.toTimeString().slice(0, 5), date = new Date(now - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); let changed = false; Object.keys(cfg.lastSent).forEach(k => { if (cfg.lastSent[k] !== date) { delete cfg.lastSent[k]; changed = true; } }); if (cfg.times.includes(time) && cfg.lastSent[time] !== date) { cfg.lastSent[time] = date; changed = true; const summary = time === cfg.times[0] ? todaySummary() : null; showReminder('⚡ Level Up IRL', summary || 'Une mini-quête t’attend. Fais un pas, gagne de l’XP.'); } if (checkEventReminders(cfg, now, date)) changed = true; if (checkEveningReminder(cfg, time, date)) changed = true; if (changed) saveSettings(cfg); }
function createWindow() { win = new BrowserWindow({ width: 1120, height: 820, minWidth: 720, minHeight: 620, backgroundColor: '#0d1220', autoHideMenuBar: true, icon: path.join(__dirname, 'assets', 'icon.ico'), webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } }); win.loadFile('index.html');
/* S.2 : aucune navigation ni fenêtre externe possible — l'app est 100 % locale. */
win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
win.webContents.on('will-navigate', event => event.preventDefault());
win.on('close', event => { if (!app.isQuitting) { event.preventDefault(); win.hide(); showReminder('Level Up IRL', 'L’application reste active pour tes rappels.'); } }); }
/* Auto-update (electron-updater) — uniquement en build empaqueté. Vérifie GitHub
   Releases au démarrage, télécharge en tâche de fond, prévient le renderer quand
   c'est prêt. Les erreurs (dépôt non configuré, hors-ligne) sont avalées : l'app
   reste 100 % fonctionnelle en local. Seul le process principal parle à GitHub
   (HTTPS, hôte fixe) ; le renderer n'a aucun accès réseau. */
function sendUpdate(status) { try { if (win && !win.isDestroyed()) win.webContents.send('update:status', status); } catch (_) {} }
function initAutoUpdate() {
  if (!autoUpdater || !app.isPackaged) return;
  try {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', info => sendUpdate({ state: 'available', version: info && info.version }));
    autoUpdater.on('download-progress', p => sendUpdate({ state: 'downloading', percent: Math.round((p && p.percent) || 0) }));
    autoUpdater.on('update-downloaded', info => sendUpdate({ state: 'ready', version: info && info.version }));
    autoUpdater.on('error', err => sendUpdate({ state: 'error', message: String((err && err.message) || err) }));
    autoUpdater.checkForUpdates().catch(() => {});
    // Re-vérifie périodiquement (toutes les 3 h) : l'app reste ouverte dans la zone de
    // notification, donc elle capte une nouvelle version sans qu'Adrien ait à relancer.
    setInterval(() => { try { autoUpdater.checkForUpdates().catch(() => {}); } catch (_) {} }, 3 * 60 * 60 * 1000);
  } catch (_) {}
}
ipcMain.handle('update:install', () => { app.isQuitting = true; try { autoUpdater && autoUpdater.quitAndInstall(); } catch (_) {} });
ipcMain.handle('update:check', () => { try { if (autoUpdater && app.isPackaged) autoUpdater.checkForUpdates().catch(() => {}); } catch (_) {} });
/* ---- Vague S.8 : abonnement calendrier par URL (.ics/webcal) ----
   Réseau UNIQUEMENT ici (process principal) ; le renderer reste verrouillé (CSP self,
   navigation bloquée). HTTPS only + hôte public (anti-SSRF via L.normalizeCalendarUrl),
   timeout, taille plafonnée, redirections https limitées. Contenu parsé côté renderer
   par parseIcs (défensif), jamais exécuté. */
function fetchIcs(rawUrl, redirectsLeft) {
  return new Promise(resolve => {
    const url = L.normalizeCalendarUrl(rawUrl);
    if (!url) return resolve({ ok: false, error: 'URL refusée (HTTPS et hôte public requis).' });
    if (redirectsLeft == null) redirectsLeft = 3;
    let settled = false; const done = r => { if (!settled) { settled = true; resolve(r); } };
    let req;
    try {
      req = https.get(url, { timeout: 10000, headers: { 'User-Agent': 'IRL-LVP-UP', 'Accept': 'text/calendar, text/plain, */*' } }, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) return done({ ok: false, error: 'Trop de redirections.' });
          let next; try { next = new URL(res.headers.location, url).toString(); } catch { return done({ ok: false, error: 'Redirection invalide.' }); }
          return fetchIcs(next, redirectsLeft - 1).then(done);
        }
        if (res.statusCode !== 200) { res.resume(); return done({ ok: false, error: `Réponse ${res.statusCode}.` }); }
        let data = '', size = 0; res.setEncoding('utf8');
        res.on('data', c => { size += Buffer.byteLength(c); if (size > 5 * 1024 * 1024) { req.destroy(); return done({ ok: false, error: 'Fichier trop volumineux (max 5 Mo).' }); } data += c; });
        res.on('end', () => { if (!/BEGIN:VCALENDAR/i.test(data.slice(0, 300))) return done({ ok: false, error: 'La réponse n’est pas un calendrier .ics.' }); done({ ok: true, text: data }); });
      });
    } catch (e) { return done({ ok: false, error: 'Réseau : ' + String(e && e.message || e) }); }
    req.on('timeout', () => { req.destroy(); done({ ok: false, error: 'Délai dépassé (10 s).' }); });
    req.on('error', err => done({ ok: false, error: 'Réseau : ' + String(err && err.message || err) }));
  });
}
const subsFile = () => path.join(app.getPath('userData'), 'calendar-subs.dat');
function readCalendarSubs() { try { const buf = fs.readFileSync(subsFile()); const json = (safeStorage.isEncryptionAvailable() && buf.length && buf[0] !== 0x5b) ? safeStorage.decryptString(buf) : buf.toString('utf8'); const arr = JSON.parse(json); return Array.isArray(arr) ? arr : []; } catch { return []; } }
function writeCalendarSubs(list) { try { const clean = (Array.isArray(list) ? list : []).filter(s => s && typeof s.url === 'string').slice(0, 20).map(s => ({ id: Number(s.id) || Date.now(), name: String(s.name || '').slice(0, 60), url: String(s.url).slice(0, 2000), kind: String(s.kind || 'life').slice(0, 12) })); const json = JSON.stringify(clean); fs.writeFileSync(subsFile(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(json) : Buffer.from(json, 'utf8')); return clean; } catch { return null; } }
ipcMain.handle('calendar:fetch', (_e, url) => fetchIcs(String(url || '')));
ipcMain.handle('calendar:subs:get', () => readCalendarSubs());
ipcMain.handle('calendar:subs:save', (_e, list) => writeCalendarSubs(list));

/* ---- Vague S.8 : trajet auto (géocodage Nominatim + itinéraire OSRM, sans clé) ----
   Même modèle que fetchIcs : réseau UNIQUEMENT ici, HTTPS, hôtes ALLOWLISTÉS
   (L.isAllowedTravelUrl → nominatim.openstreetmap.org + router.project-osrm.org),
   timeout 10 s, taille bornée, redirections https limitées, réponse parsée en JSON
   (jamais exécutée). Opt-in strict : rien ne sort tant qu'Adrien n'a pas cliqué « Estimer ». */
function httpsGetJson(rawUrl, redirectsLeft) {
  return new Promise(resolve => {
    const url = L.isAllowedTravelUrl(rawUrl);
    if (!url) return resolve({ ok: false, error: 'URL refusée (hôte non autorisé).' });
    if (redirectsLeft == null) redirectsLeft = 3;
    let settled = false; const done = r => { if (!settled) { settled = true; resolve(r); } };
    let req;
    try {
      req = https.get(url, { timeout: 10000, headers: { 'User-Agent': 'IRL-LVP-UP/1.0 (app perso locale; estimation de trajet agenda)', 'Accept': 'application/json' } }, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) return done({ ok: false, error: 'Trop de redirections.' });
          let next; try { next = new URL(res.headers.location, url).toString(); } catch { return done({ ok: false, error: 'Redirection invalide.' }); }
          return httpsGetJson(next, redirectsLeft - 1).then(done);
        }
        if (res.statusCode !== 200) { res.resume(); return done({ ok: false, error: `Réponse ${res.statusCode}.` }); }
        let data = '', size = 0; res.setEncoding('utf8');
        res.on('data', c => { size += Buffer.byteLength(c); if (size > 2 * 1024 * 1024) { req.destroy(); return done({ ok: false, error: 'Réponse trop volumineuse.' }); } data += c; });
        res.on('end', () => { try { done({ ok: true, json: JSON.parse(data) }); } catch { done({ ok: false, error: 'Réponse illisible.' }); } });
      });
    } catch (e) { return done({ ok: false, error: 'Réseau : ' + String((e && e.message) || e) }); }
    req.on('timeout', () => { req.destroy(); done({ ok: false, error: 'Délai dépassé (10 s).' }); });
    req.on('error', err => done({ ok: false, error: 'Réseau : ' + String((err && err.message) || err) }));
  });
}
async function geocodeAddress(query) {
  const r = await httpsGetJson(L.buildGeocodeUrl(query));
  if (!r.ok) return r;
  const first = Array.isArray(r.json) ? r.json[0] : null;
  if (!first || first.lat == null || first.lon == null) return { ok: false, error: 'adresse introuvable' };
  return { ok: true, lat: Number(first.lat), lon: Number(first.lon), label: String(first.display_name || query).slice(0, 120) };
}
ipcMain.handle('travel:estimate', async (_e, payload) => {
  try {
    const p = payload && typeof payload === 'object' ? payload : {};
    const from = String(p.from || '').slice(0, 200).trim(), to = String(p.to || '').slice(0, 200).trim();
    if (!from || !to) return { ok: false, error: 'Point de départ et destination requis.' };
    const g1 = await geocodeAddress(from); if (!g1.ok) return { ok: false, error: 'Départ : ' + g1.error };
    const g2 = await geocodeAddress(to); if (!g2.ok) return { ok: false, error: 'Destination : ' + g2.error };
    const r = await httpsGetJson(L.buildRouteUrl(g1, g2));
    let distanceM = null, driveSec = 0;
    if (r.ok && r.json && Array.isArray(r.json.routes) && r.json.routes[0]) { distanceM = Number(r.json.routes[0].distance); driveSec = Number(r.json.routes[0].duration) || 0; }
    let approx = false;
    if (distanceM == null || !Number.isFinite(distanceM)) { const km = L.haversineKm(g1, g2); if (km == null) return { ok: false, error: 'Itinéraire indisponible.' }; distanceM = km * 1000 * 1.3; driveSec = 0; approx = true; }
    return { ok: true, modes: L.travelModes(distanceM, driveSec), from: g1.label, to: g2.label, approx };
  } catch (e) { return { ok: false, error: 'Erreur : ' + String((e && e.message) || e) }; }
});
// Point de départ (adresse = donnée personnelle) + mode préféré — chiffré via safeStorage.
const travelFile = () => path.join(app.getPath('userData'), 'travel.dat');
const TRAVEL_MODES = ['driving', 'cycling', 'walking'];
function readTravelConfig() { try { const buf = fs.readFileSync(travelFile()); const json = (safeStorage.isEncryptionAvailable() && buf.length && buf[0] !== 0x7b) ? safeStorage.decryptString(buf) : buf.toString('utf8'); const o = JSON.parse(json) || {}; return { home: String(o.home || '').slice(0, 200), mode: TRAVEL_MODES.includes(o.mode) ? o.mode : 'driving' }; } catch { return { home: '', mode: 'driving' }; } }
function writeTravelConfig(v) { try { const clean = { home: String((v && v.home) || '').slice(0, 200), mode: TRAVEL_MODES.includes(v && v.mode) ? v.mode : 'driving' }; const json = JSON.stringify(clean); fs.writeFileSync(travelFile(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(json) : Buffer.from(json, 'utf8')); return clean; } catch { return null; } }
ipcMain.handle('travel:config:get', () => readTravelConfig());
ipcMain.handle('travel:config:save', (_e, v) => writeTravelConfig(v));
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) { app.quit(); } else {
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
app.whenReady().then(() => { createWindow(); let trayIcon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.ico')); if (trayIcon.isEmpty()) trayIcon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'irl-lvp-up-logo.png')); tray = new Tray(trayIcon.isEmpty() ? nativeImage.createEmpty() : trayIcon); tray.setToolTip('Level Up IRL'); tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Ouvrir Level Up IRL', click: () => { win.show(); win.focus(); } }, { type: 'separator' }, { label: 'Quitter', click: () => { app.isQuitting = true; app.quit(); } }])); tray.on('click', () => { win.show(); win.focus(); }); timer = setInterval(checkReminders, 30000); checkReminders(); setTimeout(initAutoUpdate, 3500); });
}
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('notifications:get', () => settings());
ipcMain.handle('notifications:save', (_, value) => { const v = value && typeof value === 'object' ? value : {}; const cfg = { enabled: Boolean(v.enabled), times: (Array.isArray(v.times) ? v.times : []).filter(isTime).slice(0,3), lastSent: settings().lastSent || {}, leadMinutes: Math.min(60, Math.max(5, Number(v.leadMinutes) || 15)), eveningTime: isTime(v.eveningTime) ? v.eveningTime : '21:00', eveningEnabled: v.eveningEnabled !== false }; saveSettings(cfg); if (cfg.enabled) showReminder('Rappels activés', 'Tes rendez-vous avec toi-même sont programmés.'); return cfg; });
ipcMain.handle('notifications:test', () => showReminder('⚡ Test réussi', 'Prêt. Ton prochain petit geste compte.'));
ipcMain.handle('backup:save', (_, value) => { if (!value || typeof value !== 'object') return false; const backup={ version: 4, savedAt: new Date().toISOString(), state: value };fs.writeFileSync(stateBackupFile(), JSON.stringify(backup, null, 2));const dir=stateBackupHistoryDir(),daily=path.join(dir,`irl-lvp-up-${backup.savedAt.slice(0,10)}.json`);fs.mkdirSync(dir,{recursive:true});if(!fs.existsSync(daily))fs.writeFileSync(daily,JSON.stringify(backup,null,2));const old=fs.readdirSync(dir).filter(name=>name.endsWith('.json')).sort().reverse().slice(14);old.forEach(name=>fs.rmSync(path.join(dir,name),{force:true}));return true; });
ipcMain.handle('backup:get', () => { try { return JSON.parse(fs.readFileSync(stateBackupFile(), 'utf8')); } catch { return null; } });
/* Export / import manuels des données (portabilité, sauvegarde sur fichier choisi par Adrien). */
ipcMain.handle('data:export', async (_e, json) => { try { const r = await dialog.showSaveDialog(win, { title: 'Exporter mes données', defaultPath: `irl-lvp-up-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] }); if (r.canceled || !r.filePath) return { ok: false, canceled: true }; fs.writeFileSync(r.filePath, String(json || '{}'), 'utf8'); return { ok: true, path: r.filePath }; } catch (e) { return { ok: false, error: String((e && e.message) || e) }; } });
ipcMain.handle('data:import', async () => { try { const r = await dialog.showOpenDialog(win, { title: 'Importer une sauvegarde', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] }); if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true }; const buf = fs.readFileSync(r.filePaths[0], 'utf8'); if (buf.length > 20 * 1024 * 1024) return { ok: false, error: 'Fichier trop volumineux (max 20 Mo).' }; return { ok: true, text: buf }; } catch (e) { return { ok: false, error: String((e && e.message) || e) }; } });
/* --- Photos : stockées en fichiers dans userData/photos/ (hors du blob localStorage). ---
   Sécurité (S.3) : nom de fichier regénéré côté main (jamais de chemin fourni par le renderer),
   Data URL validée par regex stricte, taille bornée à 8 Mo. */
const photosDir = () => path.join(app.getPath('userData'), 'photos');
function photoPath(file) { const name = path.basename(String(file || '')); return /^\d+\.(png|jpe?g|webp|gif)$/i.test(name) ? path.join(photosDir(), name) : null; }
ipcMain.handle('photos:save', (_, payload) => { try { if (!payload || typeof payload.data !== 'string' || payload.data.length > 8 * 1024 * 1024) return null; const match = payload.data.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/); if (!match) return null; const id = Number(payload.id) || Date.now(); const file = `${id}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`; fs.mkdirSync(photosDir(), { recursive: true }); fs.writeFileSync(path.join(photosDir(), file), Buffer.from(match[2], 'base64')); return { id, file }; } catch { return null; } });
ipcMain.handle('photos:read', (_, file) => { const p = photoPath(file); if (!p) return null; try { const ext = path.extname(p).slice(1).toLowerCase().replace('jpg', 'jpeg'); return `data:image/${ext};base64,${fs.readFileSync(p).toString('base64')}`; } catch { return null; } });
ipcMain.handle('photos:delete', (_, file) => { const p = photoPath(file); if (!p) return false; try { fs.rmSync(p, { force: true }); return true; } catch { return false; } });
app.on('window-all-closed', e => { if (process.platform !== 'darwin') e.preventDefault(); }); app.on('before-quit', () => { app.isQuitting = true; clearInterval(timer); });
