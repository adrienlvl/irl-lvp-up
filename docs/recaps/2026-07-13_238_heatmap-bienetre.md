# Boucle #238 (autonome) — 7ᵉ rotation #3 : mini-heatmap des routines · build 1.9.172

**7ᵉ rotation, #3 (bien-être).** Le streak (#230) et les badges (#234) donnaient des chiffres, mais pas de vue d'ensemble. Ajout d'une **mini-heatmap 7 jours** des routines faites — motivant et visuel.

## Livré

- **Heatmap « 7 derniers jours »** dans le panneau bien-être : une case par jour (initiale du jour), colorée selon le nombre de routines (vide / 1 / ≥2), avec la date + le compte en info-bulle.
- Visible dès qu'au moins une routine a été faite.

## Détail technique

- **`lib/logic.js`** : `wellnessWeekHeatmap(list, todayKey, days=7)` → `[{ date, dayLabel, count }]` du plus ancien au plus récent (aujourd'hui en dernier). Pur + testé.
- **`app.js`** : `renderWellnessHeatmap()` (appelée dans `render()`).
- **`index.html`** : `#wellnessHeatmap`. **`strength.css`** : `.wellness-heatmap` / `.wh-cell` (3 niveaux d'intensité).

## Vérifs

- `npm run verify` → **270 tests / 270 pass** (+1 `wellnessWeekHeatmap`), garde-fou CSS vert, **SMOKE OK** (`wellnessHeatmap:true`).
- **Navigateur** (routines 07-13 ×2, 07-11, 07-08) : 7 cases justes — 07-13 niveau 2 (accent), 07-08 & 07-11 niveau 1, reste vide, info-bulles OK. ✓
- `npm run dist` → **Setup 1.9.172.exe** (app d'Adrien jamais fermée).

## Suite (rotation 7)

#1 ✅ (#236), #2 ✅ (#237), #3 ✅ (#238). Dernier : **#4 coaching** → puis PushNotification + rotation 8. Boucle autonome continue.
