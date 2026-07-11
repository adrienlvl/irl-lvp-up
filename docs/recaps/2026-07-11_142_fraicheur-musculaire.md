# Boucle #142 (autonome) — Fraîcheur musculaire (quoi entraîner aujourd'hui) · build 1.9.76

**Contexte :** 5ᵉ itération du recentrage Exercices / Athlète. Focus Athlète : aider Adrien à **choisir quel groupe travailler aujourd'hui**.

## Livré

Dans le panneau **« Cette semaine »** (Athlète, sous la carte de régularité), un bloc **« 💪 Fraîcheur musculaire »** : une puce par groupe musculaire indiquant **le nombre de jours depuis son dernier travail** et un statut coloré :

- **Prêt** (≥ 2 jours de repos → vert) ;
- **Récent** (< 2 jours → orange) ;
- **Jamais** (grisé).

Une ligne de synthèse conclut : *« Prêt aujourd'hui : Dos, Bras, Jambes. »* (ou, si tout a été travaillé récemment, suggère une journée légère). Couplé au volume hebdo par groupe (#138), Adrien pilote son split d'un coup d'œil : quoi pousser, quoi laisser récupérer.

## Détail technique

- `lib/logic.js` : `zoneFreshness(workouts, todayKey)` — pur + testé. Pour les 7 zones (ordre fixe), calcule les jours depuis le dernier exercice touchant la zone (via `exerciseZones`), renvoie `[{zone, days, status:'ready'|'recent'|'never'}]`. Ignore les dates futures.
- `app.js` : `renderAthlete` remplit `#zoneFreshness` (puces + résumé « Prêt aujourd'hui »).
- `index.html` : `<div id="zoneFreshness">` dans le panneau week-panel.
- `athlete.css` : styles `.zone-fresh` / `.zf-chip` (vert prêt / orange récent / grisé jamais), `:empty` masqué.

## Vérifs

- `npm run verify` → **178 tests / 178 pass** (+1 : `zoneFreshness` — jours, statut ready/recent/never, 7 zones, vide/date invalide). **SMOKE OK** (`zoneFreshness:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.76.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
