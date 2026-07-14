# Boucle #276 (autonome) — 17ᵉ rotation #1 : raccourci « Ma journée » · build 1.9.210

**17ᵉ rotation, #1 (mobile/PWA).** 6ᵉ raccourci d'app (appui long sur l'icône installée) : **« Ma journée »** (`?go=today`) qui ouvre le tableau de bord et défile jusqu'au panneau « Aujourd'hui » (rendez-vous, blocs, à-faire du jour).

## Livré

- **Raccourci manifest « Ma journée »** → accès direct au plan du jour depuis l'icône.
- `?go=today` : `showPage('dashboard')` + scroll `.my-day-panel`.

## Détail technique

- **`lib/logic.js`** : `'today'` ajouté en tête de `LAUNCH_TARGETS`. Pur + testé (`launchTarget('?go=today') === 'today'`).
- **`app.js`** : nouvelle action `today` dans le handler de lancement.
- **`manifest.webmanifest`** : 6ᵉ shortcut `?go=today` (« Aujourd'hui »).
- **CHANGELOG** complété (v1.9.210).

## Vérifs

- `npm run verify` → **299 tests / 299 pass** (assertion `today` ajoutée), garde-fou CSS vert, **SMOKE OK** (`launchTarget` étendu + `.my-day-panel` présent).
- **Navigateur** (localhost:8137?go=today) : cible `today`, dashboard actif, panneau « Aujourd'hui » visible, scroll en haut (top 0). ✓
- `npm run dist` → **Setup 1.9.210.exe** (app d'Adrien jamais fermée).

## Suite (rotation 17)

#1 ✅ (#276). Prochain : #2 onboarding, #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.
