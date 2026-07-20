# #584 — Objectif de course : plus d'« Affûtage » une fois la course déjà passée (build 2.0.202)

**Domaine : athlete** · build 2.0.202 · correctif de bug pur (arrondi), à effet visible.

## Rotation (§4 bis.3)

5 derniers domaines (par n° de recap, avant cette boucle) = `docs · coach · fondations · docs · coach`
(#579 · #580 · #581 · #582 · #583).
- **2 derniers** (#583 `docs`, #582 `coach`) → interdits.
- **≥ 2× sur 5** : `docs` (#583, #580) et `coach` (#582, #579) → interdits.
- `fondations` (#581, 1×) autorisé mais = IndexedDB/chantier **supervisé** (code épuisé en autonomie).
- Priorité de nuit #1 (**coach**) : **rotation-bloquée** ce tour (§3 : la rotation s'applique
  pleinement au coach). 2ᵉ demande (**CAP 3.0 fondations**) : réservée au supervisé, propositions
  chantiers 3 & 4 déjà écrites (#574, #581) et en attente de décisions.
- **Backlog nommé P1–P7 entièrement coché.** → protocole « backlog vide » (ROADMAP §805) : chasser un
  **bug pur prouvable** dans un domaine autorisé plutôt qu'inventer du remplissage (demande d'Adrien :
  « pas de filler »). Domaine retenu : **athlete** (absent des 5 derniers recaps).

Quota §4 bis.4 non déclenché (#581 proposition dans les 10 derniers).

## Le bug (prouvé, pur)

`weeksBetween(from, to)` (`logic.js:1345`) promet dans son commentaire « **négatif si to est passé** »
mais renvoie `Math.round((b - a) / (7 * 864e5))`. Pour une course passée de **1 à 3 jours**, l'écart
vaut −0,14 à −0,43 semaine → `Math.round` **le ramène à 0**.

`raceGoalStatus` (`logic.js:2017`) calcule alors `weeksLeft = 0` (arrondi) mais `daysLeft = −1..−3`
(via `daysUntil`, signe fiable). `racePhase(0)` ne tombe pas dans la garde `weeksLeft < 0` (→ « Course
passée ») mais dans `weeksLeft <= 2` (→ **« Affûtage » « Réduis le volume… arrive frais »**). Résultat :
`{ weeksLeft: 0, daysLeft: −1, phase: 'Affûtage' }` — le coach conseille de s'affûter pour une course
qui a eu lieu **hier**. Reproduit 1j/2j/3j ; 4j+ passait déjà (`Math.round(−4/7) = −1`).

Effet **visible** (via app.js, sans le modifier — il consomme `weeksLeft`) :
- `renderRaceGoal` (`app.js:523`) teste `weeksLeft >= 0` pour afficher la carte de phase → une course
  passée d'1–3 j gardait la carte « Affûtage » au lieu du repli « Cette date est passée — mets à jour
  ton objectif ».
- `renderTrainingCompanion` (`app.js:304`) teste `weeksLeft >= 0` → ajoutait « Cap : … dans 0 sem.
  (phase Affûtage) » au conseil du jour.

## Le fix (chirurgical, dans `raceGoalStatus` seulement)

`weeksBetween` est **partagé** avec `renderVolumeGoal` (`app.js:524`, objectif de volume, borné par
`Math.max(1, …)`) et avec le rendu positif des countdowns : passer `Math.round` → `Math.floor`
raccourcirait les libellés « dans X semaines » et changerait le ramp de volume sur des cas hors bug
(§4 ter : effet collatéral non voulu). Correction donc **localisée** à la source du signe fiable :

```js
let weeksLeft = weeksBetween(today, goal.date);
const daysLeft = daysUntil(today, goal.date);
if (weeksLeft === 0 && daysLeft != null && daysLeft < 0) weeksLeft = -1;
```

`intermediateGoals` (autre consommateur de `weeksBetween`, `logic.js:1702`) n'est pas concerné : il
ne s'active que pour `weeksLeft >= 20`. `renderVolumeGoal` (volumeGoal, pas raceGoal) intact.

## §4 ter — rendu cumulé relu

Comme `weeksLeft` devient `−1`, **les deux** surfaces app.js retombent sur leur branche « passée »
**déjà existante** : `renderRaceGoal` affiche « Cette date est passée — mets à jour ton objectif » et
masque la carte de phase ; `renderTrainingCompanion` **n'ajoute plus** le cap. Aucun texte neuf
introduit — une branche correcte enfin atteinte. Non-régression : course **à venir** de 1 jour
(`daysLeft = 1`) garde « Affûtage » ; course passée de 4 j reste « Course passée ».

## Vérif

+1 test logique (`raceGoalStatus` : passée 1/2/3 j → `done` + `weeksLeft < 0` ; non-régression 4 j
passée et 1 j à venir). **534 tests + smoke verts**, `xvfb-run -a npm run verify` 100 %.

Domaine : athlete
