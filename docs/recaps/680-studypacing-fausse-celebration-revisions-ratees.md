# #680 — `studyPacing` : plus de « toutes tes révisions faites 🎉 » quand elles ont été RATÉES

**Build 2.0.281** · boucle #680 · 2026-07-22

## Contexte / rotation

Priorité de nuit (DEMANDES) = coaching adaptatif à fond, mais **bloquée par la rotation §4 bis** :
5 derniers recaps = `robustesse (#679), coach (#678), etudes (#677), robustesse (#676), coach (#675)`
→ `robustesse` interdit (2 derniers + 2×/5), `coach` interdit (2 derniers + 2×/5). **`etudes` libre**
(1× en #677, hors 2 derniers). Quota de propositions §4 bis.4 non déclenché (#674 = proposition, dans
les 10 derniers). Mission de nuit ROADMAP = « robustesse/correction/tests/contenu, **PAS de visuel** ».

Sonde des domaines frais : la couverture par fonction est **exhaustive** (397/397 fonctions exportées
référencées dans `logic.test.js`, 581 tests) → le filon « fonction sans test » est sec. Chasse tracée
à un **défaut de branche** dans un domaine autorisé (agenda/focus/sommeil/wellness/etudes) via
sous-agent : un seul défaut à effet utilisateur clair est ressorti, en **etudes** (domaine libre).

## Manque prouvé (grep + trace + rendu)

`studyPacing` (`logic.js:1983`) alimente la carte « rythme de révision » du compte à rebours d'examen.
Ligne 2004 (avant) :

```js
if (remaining === 0) return { remaining: 0, daysLeft: c.daysLeft, perWeek: 0, done, total, status: 'done' };
```

`remaining` = séances study **à venir non faites** d'ici l'épreuve proche. Le raccourci confondait
« plus rien à venir » avec « tout complété ».

**Input concret (mono-épreuve, cas courant)** : examen `Droit 2026-08-10` (J-19), 3 séances de révision
**toutes passées et non faites** (07-15/18/20), `todayKey = 2026-07-22`.
- `scoped` (date ≤ examen) = les 3 → `total = 3`, `done = 0`.
- `remaining` (à venir non faites) = **0** (les 3 dates sont < aujourd'hui).
- → renvoyait `{ status:'done', done:0, total:3 }`.

**Effet utilisateur (rendu `app.js:977`)** : la branche `pc.status==='done'` affiche
« 🎉 **Toutes tes révisions planifiées sont faites** — à J-19, chapeau ! » alors que **0/3** validée.
Pire, la **même** fonction de rendu affiche juste en dessous `overdueStudy` (fenêtre 21 j) qui liste ces
3 mêmes séances comme « **3 révisions en retard** ». Deux cartes qui se **contredisent frontalement et
simultanément** sur le module études d'Adrien (BTS CG).

Second versant (multi-épreuves) : épreuve proche **sans** révision en scope mais séances planifiées pour
une épreuve **postérieure** → `total === 0`, `remaining === 0` → même fausse célébration « toutes faites ».

## Correctif (§4.1 correctness, curation honnête)

Ligne 2004 : ne célébrer `'done'` que si des révisions étaient prévues **et** toutes complétées ; sinon
`null` (la carte s'efface, `overdueStudy` porte le message honnête).

```js
if (remaining === 0) return (total > 0 && done === total) ? { …, status: 'done' } : null;
```

- `done === total > 0` (tout vraiment validé) → célébration **conservée** (non-régression).
- `done < total` (séances passées ratées) → `null` : quand `remaining===0`, toute séance non faite en
  scope est forcément **passée** → genuinely manquée, jamais « en cours ».
- `total === 0` (épreuve proche sans révision en scope) → `null`.

**Pas de changement de rendu** : le rendu gère déjà `null` (`if(!pc){pcEl.hidden=true;…}`) → logic.js +
tests seulement, pas de nouveau check smoke (checks `studyPacing`/`overdueStudy` restent verts).

## Tests

+1 test `#680` (5 assertions, échouent avant / passent après) : séances passées ratées → `null` +
`overdueStudy` les signale toujours ; mélange fait/raté → `null` ; multi-épreuves `total===0` → `null` ;
**non-régression** « tout validé » → `status:'done'`. Tests existants (`3025`, `12400`, `12411`, `2936`)
inchangés (aucun ne touchait le chemin `remaining===0` avec `done<total`).

## Effet utilisateur / bump

Effet **visible** (fin de la fausse célébration contredisant le rappel « en retard ») → **bump 2.0.281**
(package.json + CHANGELOG + 2 assertions `CHANGELOG[0].v`). **582 tests + SMOKE OK.**

Domaine : etudes
