# Boucle #107 (autonome) — Allure de course (min/km) · build 1.9.41

**Contexte :** 32ᵉ itération de la boucle autonome. Aire : Athlète / course (trail/ultra).

## Livré

Les séances de **course** affichent désormais leur **allure** (minutes:secondes par kilomètre), calculée depuis la distance et la durée :

> 12,0 km · **5:30/km**

- Visible dans le **journal d'entraînement** (page Athlète) et dans le **détail d'historique** d'une séance.
- N'apparaît que pour les séances de type `run` avec distance et durée > 0.

Repère clé pour un coureur/traileur comme Adrien, sans calcul mental.

## Détail technique

- `lib/logic.js` : `runPace(distanceKm, durationMin)` pur + testé → `{ secPerKm, label:'m:ss' }`, `null` si entrées invalides.
- `app.js` : `renderAthlete` (liste des séances) et `openHistoryDialog` (détail) ajoutent l'allure pour les runs.

## Vérifs

- `npm run verify` → **148 tests / 148 pass** (+1 : `runPace` — 5:00, 5:30, distance/durée nulles → null, entrée invalide), **SMOKE OK** (`pace:true`). `node --check app.js` OK.
