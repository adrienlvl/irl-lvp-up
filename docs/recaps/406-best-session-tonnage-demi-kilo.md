# 406 — Record de séance : l'égalité de tonnage se juge sur le brut, pas l'arrondi (2.0.46)

## Le manque (bug pur prouvé — §4.1/§4.2)

`bestSessionTonnage` (`src/lib/logic.js:3739`) désigne la **meilleure séance de muscu par tonnage**
(Σ charge × reps × sets) et, docstring à l'appui, « en cas d'égalité de tonnage, garde la plus
récente ». Sa sélection stockait le tonnage **déjà arrondi**, puis comparait la valeur **brute** de
la séance suivante à cette valeur arrondie :

```js
// avant
if (!best || t > best.tonnage || (t === best.tonnage && d >= best.date)) best = { date: d, tonnage: Math.round(t) };
...
return { date: best.date, tonnage: best.tonnage, count, isLatest: best.date === latestDate };
```

`workoutTonnage` renvoie couramment des demi-kilos : une charge en `12,5` / `7,5` / `22,5` kg (les
incréments de 2,5) multipliée par un nombre de reps impair donne un tonnage `x,5`. Comme
`Math.round(187.5) === 188`, une séance à `187,5` n'est ensuite **jamais** `> 188` ni `=== 188` : la
comparaison à égalité échoue silencieusement.

Cas concret et prouvable — deux séances au même tonnage `.5`, la seconde plus récente :

```js
bestSessionTonnage([
  { date: '2026-06-01', exercises: [{ name: 'Curl', load: 12.5, reps: 5, sets: 3 }] }, // 187,5
  { date: '2026-06-08', exercises: [{ name: 'Curl', load: 12.5, reps: 5, sets: 3 }] }, // 187,5 (plus récente)
])
// avant → { date: '2026-06-01', tonnage: 188, isLatest: false }  (t=187,5 rejeté vs best.tonnage=188)
// attendu → { date: '2026-06-08', tonnage: 188, isLatest: true }  (égalité → garde la plus récente)
```

La fonction sœur `bestTonnageWeek` (`logic.js:3756`) fait exactement la même logique **sans** ce bug :
elle arrondit **les deux côtés** (`const ton = Math.round(v.tonnage); … ton === best.tonnage`). C'est
bien `bestSessionTonnage` qui compare des grandeurs de nature différente.

Impact réel utilisateur : `bestSessionTonnage` alimente `renderTonnageTrend` (`app.js:498`) :
`rec.isLatest ? 'Nouveau record séance !' : 'Record séance :'` + la **date** de la séance. Quand la
séance du jour égale le record all-time avec un tonnage en `.5`, l'app affichait la **mauvaise date**
(l'ancienne séance) et **manquait la célébration** « Nouveau record séance ! ». Les tonnages en `.5`
sont la norme dès qu'on manie des haltères/disques de 1,25 kg, pas un cas limite.

## Le geste (juger sur le brut, arrondir à l'affichage)

`src/lib/logic.js` — même séparation « valeur jugée (brute) vs valeur affichée (arrondie) » qu'en #400
et #403, mais ici sur le tonnage : on garde le tonnage **brut** dans `best` pour toute la comparaison,
et on arrondit **seulement** dans l'objet retourné.

```js
if (!best || t > best.tonnage || (t === best.tonnage && d >= best.date)) best = { date: d, tonnage: t };
...
return { date: best.date, tonnage: Math.round(best.tonnage), count, isLatest: best.date === latestDate };
```

L'égalité se juge désormais sur le tonnage réel (`187,5 === 187,5` → vrai), fidèle à la docstring.
Le chiffre affiché (`tonnage`, arrondi) est **inchangé**. Aucune entrée en kilos entiers n'est
affectée (les 4 assertions existantes, toutes en tonnages entiers, restent vertes).

## Test

`src/test/logic.test.js` — bloc `bestSessionTonnage` existant : +1 cas `w5` (deux séances
`12,5 × 5 × 3 = 187,5`, la seconde plus récente → `date === '2026-06-08'`, `tonnage === 188`,
`isLatest === true`), **prouvé fautif avant** le correctif (donnait `'2026-06-01'`, `isLatest false`).
Ajout dans un `test()` existant → compteur inchangé à **431 tests** (+ smoke).

## Pourquoi pas de nouveau check smoke

Correctif de **logique pure** ; `app.js` (rendu de `#tonnageTrend`) n'est pas touché. Le check smoke
`bestSession` existant reste vert (contrat verrouillé au niveau des tests unitaires, comme #400 → #404).

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **431 tests + smoke 100 % verts** (`whatsNew` vert en 2.0.46,
`SMOKE OK`). Build **2.0.46** : effet utilisateur réel (bonne date + « Nouveau record séance !` retrouvé)
→ entrée CHANGELOG (🏆) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`). Logique
pure, aucun rendu modifié, zéro régression. Backlog autonome **§4.1/§4.2 (bug pur prouvé)** — variation
de domaine (records/tonnage muscu) après une série course/santé/badge (#404 → #405). Aucune Release,
zéro dépendance, aucune donnée perso, aucune feature retirée. Boucle #406.
