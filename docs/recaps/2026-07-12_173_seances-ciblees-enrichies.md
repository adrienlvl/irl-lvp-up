# Boucle #173 (autonome) — Séances ciblées enrichies (Pecs / Épaules / Full body) · build 1.9.107

**Contexte :** thème B (séances ciblées) — élargir le sélecteur d'objectif corporel.

## Livré

La barre **« 🎯 Séances ciblées prêtes »** passe de 4 à **7 objectifs** :

- 🔥 Abdos · 💪 Bras · **🎯 Pecs** · 🦅 Dos · **🏔️ Épaules** · 🦵 Bas du corps · **⚡ Full body**.

Le **Full body** est spécial : au lieu de piocher les meilleurs d'une seule zone, il prend **un exercice par grande zone** (jambes, dos, pecs, abdos, épaules) en tournant — une vraie séance complète du corps en un tap, lancée en guidé (minuteur + suivi + récap).

## Détail technique

- `lib/logic.js` : `BODY_GOALS` étendu à 7 (dont `fullbody` avec `spread:true` + 5 zones) ; `bodyGoalWorkout` gère le mode `spread` (round-robin : une par zone, meilleures d'abord, sans doublon).
- `index.html` : 3 boutons ajoutés dans `#bodyGoalsBar` (le handler existant les gère par délégation).

## Vérifs

- `npm run verify` → **212 tests / 212 pass** (test `bodyGoalWorkout` étendu : 7 objectifs + full body couvrant jambes/dos/pecs/abdos). **SMOKE OK** (`bodyGoals:true` — 7 boutons + full body à 5 exercices). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.107.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Historique du score d'adhérence (snapshot hebdo + courbe) ; responsive mobile continu.
