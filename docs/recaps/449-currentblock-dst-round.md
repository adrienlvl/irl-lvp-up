# 449 — Bloc d'entraînement : décompte des jours robuste au changement d'heure (2.0.81)

**Boucle #449 · build 2.0.81 · domaine Musculation/Périodisation · correctness (§4.1)**

## Le manque (vérifié avant de coder, exécuté sous node dans un fuseau DST)

`currentBlock` (`logic.js:3751`, suivi du bloc de périodisation 4 semaines) calculait le nombre de
jours écoulés avec `Math.floor((today - start) / 86400000)` (l. 3757). Or `start` et `today` sont des
`new Date(y, m-1, d)` **en heure locale** ramenés à minuit. Quand la fenêtre franchit un changement
d'heure (DST), deux minuits locaux successifs sont distants de **23 h** (printemps) ou 25 h (automne),
pas 24 : `(today - start) / 86400000` pour 7 jours calendaires vaut alors `6,958`, que `Math.floor`
rabat sur **6**.

Tout le reste du fichier (`daysUntil`, `acuteChronicRatio`, `membershipInfo`, `trainingByWeekday`,
`muscleBalance`, `weeklySetsPerZone`…) utilise `Math.round` **précisément** pour absorber ce ±1 h.
`currentBlock` était le seul à `floor` — contrat de parité non tenu.

**Reproduction (exécutée avant fix, fuseau réel d'Adrien `Europe/Paris`, printemps = 29 mars 2026) :**

- `currentBlock('2026-03-23', '2026-03-30')` (bloc démarré un lundi, +7 jours calendaires)
  → `week: 1, daysIntoWeek: 6` ; attendu `week: 2, daysIntoWeek: 0` (début de S2).
- `phaseSetsForDay(3, '2026-03-23', '2026-03-30')` → **3** ; attendu **4** (S2 « Volume » = base +1).
- `currentBlock('2026-03-23', '2026-04-20')` (28 jours calendaires) → `done: false` ; attendu
  `done: true` (bloc fini → proposer un nouveau bloc). Repoussé d'un jour.

Impact concret et visible : le lundi qui suit le passage à l'heure d'été, la séance guidée prescrit
**3 séries au lieu de 4** (`phaseSetsForDay` → `progressSets(base, b.week-1)`), l'app affiche la
mauvaise phase de bloc (Base au lieu de Volume), et la fin de bloc (heads-up décharge, proposition du
bloc suivant) glisse d'un jour. C'est objectivement faux : la phase/semaine/fin d'un bloc de longueur
fixe ne doit dépendre que du **nombre de jours calendaires** écoulés, pas de savoir si un changement
d'heure est tombé dans la fenêtre.

Trou de couverture : les tests `currentBlock`/`phaseSetsForDay` utilisaient tous des fenêtres en
juillet (hors DST) — aucun ne franchissait un changement d'heure. Candidat trouvé par audit frais des
calculs de dates de `logic.js` (hors familles closes #438→#448).

## Le correctif

`logic.js:3757` — `Math.floor` → `Math.round` (+ commentaire expliquant l'alignement DST sur la
convention du fichier). Rétro-compatible : hors semaine de changement d'heure, les deux minuits sont
distants de pile 24 h → `round(N.0) = floor(N.0) = N`, résultat identique (vérifié). Le cas automne
(fall-back, +1 h → `7,04`) passait déjà avec `floor` ; `round` le garde correct et corrige le
printemps.

## Tests

- **logic.test.js** (`currentBlock`) : +1 test dédié DST — force `process.env.TZ = 'Europe/Paris'`
  (restauré en `finally`), franchit le 29 mars 2026 : 7 jours calendaires → `week: 2, daysIntoWeek: 0`,
  `phaseSetsForDay` → 4, et 28 jours → `done: true`. Déterministe quel que soit le fuseau de la
  machine (garde de régression prouvée : avec `Math.floor`, `days = 6` au lieu de 7).
- Pure logique (rendu inchangé) : checks smoke `currentBlock`/`phaseSetsForDay` restent verts.
  **446 tests + smoke 100 % vert.**

`cd src && xvfb-run -a npm run verify` → **OK** (`SMOKE OK`, 446 pass, `currentBlock:true`,
`phaseSetsForDay:true`).

## Suite

`currentBlock` était la dernière fonction de diff de dates à utiliser `Math.floor` sur un delta de
minuits locaux (grep confirmé : tous les autres `(a - b) / 86400000` du fichier passent déjà par
`Math.round`). Famille « diff de jours robuste au DST » alignée. Aucun jumeau restant connu.
