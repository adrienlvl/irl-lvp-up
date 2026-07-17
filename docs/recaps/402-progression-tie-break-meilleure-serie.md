# 402 — Progression : à date égale, la référence est la meilleure série, pas la dernière loguée (2.0.42)

## Le manque (couverture de tests §4.1 + robustesse — bug pur prouvé)

`progressionSuggestion` (`src/lib/logic.js:5894`) choisit la **séance de référence** (la plus récente)
pour proposer la charge/reps suivantes. Sa sélection retenait, à **date égale**, la **dernière
entrée itérée** au lieu de la **meilleure série** :

```js
// avant
if (!(load > 0) || !(reps > 0)) return;
if (!best || w.date >= best.date) best = { date: w.date, load, reps };
```

Le `>=` a deux effets : sur une date strictement plus récente il remplace (correct — la progression
part de la dernière séance), mais sur une **égalité de date** il écrase avec la dernière entrée
itérée. Or l'intention documentée du bloc (test s3, ligne 4113 : « meilleure série retenue — charge
la plus lourde ») et l'idiome des `setLogs` juste au-dessus (`l > load || (l === load && r > reps)`)
disent clairement que c'est la **meilleure série** qui doit servir de référence.

Cas concret et prouvable — deux `workout` le même jour pour le même exercice (vraie séance lourde,
puis un finisher plus léger logué ensuite) :

```js
progressionSuggestion([
  { date: '2026-06-08', exercises: [{ name: 'Squat', load: 100, reps: 5 }] },  // séance lourde
  { date: '2026-06-08', exercises: [{ name: 'Squat', load: 40,  reps: 15 }] }, // finisher léger
], 'Squat', { minReps: 8, maxReps: 12, increment: 5 })
// avant → { lastLoad: 40, lastReps: 15, action: 'weight', nextLoad: 45 }  (finisher !)
// attendu → { lastLoad: 100, lastReps: 5, action: 'reps', nextLoad: 100 }
```

Impact réel utilisateur : `progressionSuggestion` alimente la **« Cible du jour »** (`nextLoad`/
`nextReps`) affichée dans le coach musculation (`app.js:305` et `:337`). Un finisher léger enregistré
après la vraie séance de référence faisait repartir l'utilisateur d'une charge **trop basse** (ici
40 kg au lieu de 100 kg) — directionnellement faux pour un suivi de force.

## Le geste (départager les ex æquo par la meilleure série)

`src/lib/logic.js` — la date strictement plus récente gagne toujours ; seule l'**égalité** de date
est départagée par la meilleure série (même comparaison que les `setLogs`) :

```js
if (!best || w.date > best.date || (w.date === best.date && (load > best.load || (load === best.load && reps > best.reps)))) best = { date: w.date, load, reps };
```

Aligne cet outlier sur sa sœur `estimatedOneRmSeries` (`logic.js:5921`), qui agrège déjà la meilleure
performance par jour via `Math.max`. Aucun autre comportement ne change : une seule séance par jour,
ou des dates distinctes → strictement identique à avant (prouvé par les 4 assertions existantes restées
vertes).

## Test

`src/test/logic.test.js` — bloc `progressionSuggestion` existant : +1 cas `sTie` (deux séances
`2026-06-08`, `100×5` puis `40×15` → référence `100×5`), **prouvé fautif avant** le correctif
(donnait `40×15`). Ajout dans un `test()` existant → compteur inchangé à **431 tests** (+1 cas), + smoke.

## Pourquoi pas de check smoke

Durcissement de **logique pure** : `app.js` n'est pas touché, le contrat est verrouillé au niveau des
tests unitaires (comme #398/#399/#400).

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **431 tests + smoke 100 % verts** (`whatsNew` vert en 2.0.42).
Build **2.0.42** (logique pure, aucun rendu modifié, zéro régression). Backlog autonome **§4.1/§4.2** —
variation de domaine (progression en force) après une série santé / sommeil / normalizers / bien-être
(#398 → #401). Aucune Release, zéro dépendance, aucune donnée perso, aucune feature retirée. Boucle #402.

## Note — candidat écarté ce run

`alternanceDeadline` (`logic.js:190`) utilise `todayKey >= deadline`, ce qui fait basculer la deadline
à l'an prochain **le jour même** du 1er août → « J-365 avant août » au lieu de « C'est le moment ! »
(la branche `dl.daysLeft<=0` de `app.js:194` est alors inatteignable). Non corrigé volontairement :
un test explicite (`logic.test.js:614`, « le jour même → an prochain ») **codifie** ce comportement,
et le module Alternance est la priorité de vie d'Adrien → changer sa sémantique engage Adrien (§5),
ce n'est pas un correctif autonome sûr.
