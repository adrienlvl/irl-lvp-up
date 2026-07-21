# #633 — Prépa descentes : la coupe des séances cassantes s'aligne enfin sur l'affûtage (build 2.0.242)

## Contexte

Priorité de nuit = coaching (CAP 3.0 étape 1 · MANDAT COACHING ÉLITE, coach trail). Rotation §4 bis :
les 5 derniers domaines étaient `nutrition, coach, athlete, sommeil, nutrition`. Les 2 derniers
(`nutrition`, `coach`) sont bloqués ; `athlete` (position 3, 1× sur 5, pas dans les 2 derniers) est
**libre**. Piste prise dans la mémoire des pistes athlète ouvertes (exploration #631, défaut n°2 non
encore cadré) : **downhillPrep vs taperPlan — fenêtre d'affûtage**.

## Défaut prouvé (contradiction inter-cartes)

Sur l'onglet Ultra, deux surfaces coach s'appuient sur la même course objectif :

- `taperPlan` (`logic.js`) démarre l'affûtage selon la distance : **J-11** (30 km), **J-14** (marathon),
  **J-18** (ultra) — message « allège le volume, arrive frais » (Bosquet 2007).
- `downhillPrep` (`logic.js`, carte `#ultraDownhill`) coupait les séances de descente **cassante** à
  **J-10 fixe**. Le commentaire du code prétendait pourtant être « cohérent avec `taperPlan` ».

→ Pour toute course > 12 km, il existait une fenêtre (J-11..J-14 marathon, J-11..J-18 ultra) où l'app
disait **simultanément** « arrive frais » (Affûtage) **et** « 1-2 séances de descente/sem, ça casse les
jambes » (Descentes). Ajouter des dégâts musculaires excentriques frais pendant l'affûtage contredit
directement l'objectif de fraîcheur — et le mandat « un vrai coach ne blesse pas ».

## Correctif (curation §3, zéro champ ajouté)

- **Source unique de vérité** : extraction de `taperDaysFor(km)` (durée d'affûtage échelonnée par
  distance, 7/11/14/18 j). `taperPlan` s'y réfère désormais au lieu de son barème inline.
- `downhillPrep` coupe les descentes cassantes dès `d <= Math.max(10, taperDaysFor(km))` : la coupe
  suit la fenêtre d'affûtage, avec un **plancher de sécurité à 10 j** (DOMS ~1 sem, préservé même sur
  les courtes distances dont l'affûtage ne dure que 7 j). Comme `max(10, taperDays) >= taperDays`
  toujours, la contradiction est **structurellement** éliminée : dès que `taperPlan` est actif, la
  descente cassante est coupée.
- Message ajusté : « …la protection excentrique est déjà en place **et l'affûtage a commencé**. Garde
  des descentes souples et courtes, jambes fraîches pour le jour J. » → concorde avec la carte Affûtage.
- Aucune régression du travail spécifique **hors** affûtage (marathon à J-20 reste en `specific`).

## §4 ter — contrôle de cohérence cumulé

Rendu mental à J-13 sur marathon (état chargé) : carte Affûtage « allège le volume (~X %), arrive frais »
+ carte Descentes « plus de descente cassante, l'affûtage a commencé, jambes fraîches » → les deux
surfaces pointent maintenant dans le même sens. Contradiction levée.

## Vérification

- `logic.test.js` : bloc `downhillPrep` étendu (cohérence taper↔descente sur marathon J-13, ultra J-16,
  plancher 10 j sur 10 km, non-régression spécifique J-20, barème `taperDaysFor`). **569 tests verts.**
- `renderer-smoke.cjs` : check bloquant `ultraDownhill` renforcé (`downhillPrep(600,13,42).window==='race'`
  **et** `taperPlan(13,42)` actif). **Smoke OK.**
- Bump `2.0.241 → 2.0.242` + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`.

Domaine : athlete
