# Boucle #67 — Programme « objectif en X semaines » · build 1.9.0

**Demande d'Adrien :** « y'a un moyen d'avoir genre les abdos au max d'ici 2 mois ? »

## Livré

Depuis un **objectif de zone** (abdos, bras, jambes…) dans la bibliothèque, un bouton **📅 Programme 8 semaines** ouvre un plan progressif :
- **Note honnête** en tête (pour les abdos : ils se révèlent surtout via l'alimentation / un léger déficit ; pour les autres zones : surcharge progressive + protéines + sommeil, hypertrophie visible sur 3-6 mois).
- **5 exercices les plus ciblés** de la zone.
- **Progression semaine par semaine** : séries × reps qui montent (12 → 22), **décharge (récup) toutes les 4 semaines**.
- Bouton **« Programmer dans mon agenda (3×/sem) »** → crée **24 séances** (lun/mer/ven, 18h) sur 8 semaines, **idempotent** (dédup par `refId = zone-<zone>-<date>`), visibles dans toutes les vues agenda + « Ma journée ».

## Détail technique

- `lib/logic.js` (purs + testés) : `zoneTopExercises(zone, n)` (les plus ciblés d'abord) et `buildZonePlan(zone, weeks, perWeek)` (bornes 4-12 sem. / 2-5 séances, blocs hebdo avec décharge).
- `index.html` : `#zonePlanBar` (bouton, visible quand une zone est choisie) + `#zonePlanDialog` (note, exercices, table de progression, bouton planifier).
- `app.js` : `openZonePlan` (rend le plan + note adaptée à la zone), `scheduleZonePlan` (fenêtre bornée à `weeks*7` jours → idempotent).
- `strength.css` : styles du programme.

## Bug corrigé (avant livraison)

Première version de `scheduleZonePlan` bouclait sur un **compteur** (24) au lieu d'une **fenêtre de dates** : au 2ᵉ clic, les 24 dates existantes étant sautées, elle débordait sur les semaines 9-16 (48 séances). Corrigé : boucle bornée à `weeks*7` jours → 2ᵉ clic n'ajoute rien (idempotent). **Vérifié** : 24 → 24.

## Vérifs

- `npm run verify` → **122 tests / 122 pass** (+2 : `zoneTopExercises`, `buildZonePlan`), **SMOKE OK** (`zonePlan:true`).
- **Flux réel Electron** : objectif Abdos → bouton visible → dialogue « 🔥 Objectif Abdos (tablette) — 8 semaines », 5 exos (Bear crawl, Bird dog, Dead bug, Gainage latéral, Gainage planche), décharge présente, planification 24 séances, **idempotence confirmée**.
