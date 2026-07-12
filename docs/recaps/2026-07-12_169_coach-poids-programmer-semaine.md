# Boucle #169 (autonome) — Coach Poids : programmer la semaine type · build 1.9.103

**Contexte :** thème D (Coach Poids). Rendre le plan d'entraînement **actionnable** : le poser dans l'agenda en un clic.

## Livré

Sur la **semaine type** du Coach Poids (muscu / renfo / course adaptés à l'objectif), un bouton **« 📅 Programmer (4 sem.) »** : il crée les séances dans l'**agenda** sur 4 semaines (dès lundi prochain, 18:00, sans doublon), avec le bon titre et la durée. Le nombre de séances ajoutées s'affiche en retour.

Combiné au plan de course (déjà programmable) et à l'ajustement calorique, le Coach Poids devient un vrai programme posé dans le calendrier.

## Détail technique

- `lib/logic.js` : `coachSessionLabel(type)` — pur + testé (titre d'agenda 🏋️/🔥/🏃 par type).
- `app.js` : `scheduleCoachWeek(sessions, weeks)` (mapping lundi + `(weekday+6)%7`, refId `coachweek-*` anti-doublon, comme `scheduleRunPlan`/`scheduleWeekProgram`) ; bouton `#coachWeekSchedule` câblé après le rendu.
- `athlete.css` : entête `.cw-train-head` (titre + bouton).

## Vérifs

- `npm run verify` → **209 tests / 209 pass** (+1 : `coachSessionLabel`). **SMOKE OK** (`coachWeekSchedule:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.103.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Menu réel calé sur les calories ; suivi des mensurations vers la cible ; historique du score d'adhérence ; responsive mobile continu.
