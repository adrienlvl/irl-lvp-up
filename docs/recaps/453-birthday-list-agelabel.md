# 453 — Liste des anniversaires : âge accordé au singulier (« 1 an » via ageLabel)

**Build 2.0.83 · boucle #453 · 2026-07-18**
Type : polish UX honnête / accord FR (§4.4) + réutilisation d'un helper existant. Domaine : Anniversaires.

## Le manque (réel, prouvé)

`ageLabel` (`logic.js:471`) est le helper d'accord d'âge de l'app :
`` `${n} an${n > 1 ? 's' : ''}` `` → « 1 an », « 2 ans » (en français, 0 et 1 = singulier).

Trois vues affichent l'âge d'un anniversaire. Deux passent déjà par `ageLabel` :

- `renderUpcomingBirthdays` — bandeau « 🎂 À venir » (`app.js:469`) → `ageLabel(b.age)`.
- `renderMonthCalendar` — calendrier mensuel (`app.js:474`) → `ageLabel(b.age)`.

Mais la troisième — la **liste de gestion** des anniversaires, `renderBirthdays` (`app.js:182`) —
codait le pluriel en dur :

```js
${b.year?`<small>${nowY-b.year} ans</small>`:''}
```

Le « ans » constant : pas d'appel à `ageLabel`, pas de ternaire. Pour quelqu'un qui fête son
**premier** anniversaire (`year = annéeCourante − 1`), la liste affichait **« 1 ans »** —
objectivement faux en français, et en contradiction directe avec le helper du même repo et avec
les deux vues sœurs. C'était le dernier des trois emplacements resté au pluriel figé.

## Le correctif

`app.js:182` — un seul remplacement, réutilisation du helper :

```js
${b.year?`<small>${ageLabel(nowY-b.year)}</small>`:''}
```

`ageLabel` gère nativement singulier/pluriel et le cas non-fini (repli `''`). `b.year` étant déjà
gardé truthy, `nowY-b.year` est un entier fini → « N an(s) » accordé. Rien ne change pour 2 ans et +.

## Garde-fou (check smoke bloquant)

Changement de rendu → check **bloquant** `ageLabelList` dans `renderer-smoke.cjs` (à côté du check
`ageLabel` existant) : injecte un anniversaire d'1 an (`year = annéeCourante − 1`), appelle
`renderBirthdays()`, lit `#birthdayList` et exige « 1 an< » présent **et** « 1 ans » absent, puis
restaure `state.birthdays` et re-rend. `if (!checks.ageLabelList) errors.push(...)`.

## Vérif

`cd src && xvfb-run -a npm run verify` → **447 tests + smoke** verts (`ageLabelList:true`).

## Versionnage

Bump `2.0.82 → 2.0.83`, entrée `CHANGELOG` en tête de `logic.js`, +2 assertions `CHANGELOG[0].v`
(`logic.test.js` + check `whatsNew` du smoke).

## Note pour la suite

Le filon « libellés `logic.js`/`app.js` divergents pour un même concept » (déjà #452) reste
productif : ici, un helper d'accord existant appliqué à 2 vues sur 3. Prochaines pistes : chercher
d'autres emplois codés en dur d'un pluriel/accord là où un helper existe, ou couverture/a11y.
