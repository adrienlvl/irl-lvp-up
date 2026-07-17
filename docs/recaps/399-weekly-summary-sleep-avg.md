# 399 — Bilan hebdo : le sommeil moyen ne compte plus les nuits « 0 h » (2.0.39)

## Le manque (couverture de tests §4.1 + robustesse — bug pur prouvé)

`weeklySummary` (`src/lib/logic.js:2054`) calculait le sommeil moyen de la semaine en divisant la
somme des durées par **le nombre de check-ins récup**, pas par le nombre de nuits réellement
chiffrées :

```js
// avant
const rec = (Array.isArray(s.recovery) ? s.recovery : []).filter(r => r && inWeek(r.date));
const sleepAvg = rec.length ? rec.reduce((a, r) => a + (Number(r.sleep) || 0), 0) / rec.length : 0;
```

Un check-in de récupération où l'on note seulement fatigue / courbatures (ou juste l'heure de
coucher) enregistre `sleep: 0` — côté rendu, `app.js` fait `Number($('#sleepInput').value) || 0`.
Une telle nuit était alors moyennée **comme une nuit de 0 h**.

Cas réaliste et prouvable :

```js
recovery = [
  { date:'2026-07-06', sleep:8, fatigue:2, soreness:2 },
  { date:'2026-07-07', sleep:8, fatigue:2, soreness:2 },
  { date:'2026-07-08', sleep:0, fatigue:3, soreness:2, bedtime:'23:00' } // sommeil non saisi
]
weeklySummary(state, '2026-07-06').sleepAvg   // → 5.3  (16/3), attendu 8.0
```

Impact aval visible utilisateur :

- `weeklyInsights` : `if (cur.sleepAvg > 0 && cur.sleepAvg < 7)` déclenchait un **faux** nudge
  « Sommeil moyen 5,3 h — vise 7-8 h » alors que les nuits saisies étaient à 8 h.
- `renderPrintReport` (PDF hebdo) affichait un « Sommeil moyen » faux, et son verdict basculait à
  tort sur « Sommeil moyen bas — protège la récupération ».
- `shareableWeek` (Web Share) partageait ce chiffre faux à l'extérieur de l'app.

**Toutes les fonctions sœurs** filtrent déjà `sleep > 0` : `monthlyRecap` (`logic.js:2129`),
`weeklySleepStats`, `sleepDebtHours`, `sleepSeries`, `sleepRegularity`, `weeklyAdherence`.
`weeklySummary` était le seul outlier → oubli, pas un choix.

## Le geste (aligner sur monthlyRecap)

`src/lib/logic.js` — même filtre `(Number(r.sleep) || 0) > 0` que `monthlyRecap`, ajouté au filtre
`rec` (qui ne sert qu'au calcul de `sleepAvg` dans cette fonction) :

```js
const rec = (Array.isArray(s.recovery) ? s.recovery : []).filter(r => r && inWeek(r.date) && (Number(r.sleep) || 0) > 0);
```

Une nuit sans durée saisie est simplement ignorée du calcul (comme partout ailleurs) ; semaine sans
aucune nuit chiffrée → `sleepAvg = 0`, inchangé.

## Test

`src/test/logic.test.js` — nouveau `test(...)` « weeklySummary : une nuit sans sommeil saisi
(sleep:0) ne plombe pas la moyenne », prouvé fautif avant le correctif (donnait 5.3), vert après
(8.0). 430 → **431 tests**, + smoke.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **431 tests + smoke 100 % verts**. Build **2.0.39**
(logique pure, aucun rendu modifié, zéro régression). Boucle #399.
