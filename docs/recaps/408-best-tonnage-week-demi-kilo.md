# 408 — Record hebdo de tonnage : l'égalité se juge sur le brut, pas l'arrondi (2.0.48)

## Le manque (bug pur prouvé — §4.1/§4.2)

`bestTonnageWeek` (`src/lib/logic.js:3759`) élit le **record hebdomadaire de tonnage muscu** (somme
`charge × reps` par semaine lundi→dimanche). Son intention documentée (commentaire l. 3758) : « En
cas d'égalité, garde la plus récente. » Elle accumulait le tonnage **brut** par semaine, puis dans la
boucle de sélection **arrondissait avant de comparer** et stockait l'arrondi :

```js
// avant
entries.forEach(([wk, v]) => {
  const ton = Math.round(v.tonnage);
  if (!best || ton > best.tonnage || (ton === best.tonnage && wk > best.weekStart)) best = { weekStart: wk, tonnage: ton, sessions: v.sessions };
});
```

C'est le **jumeau exact** du bug corrigé sur `bestSessionTonnage` en #406 (2.0.46) — et les recaps/
changelogs #406 affirmaient à tort que `bestTonnageWeek`, « la sœur, arrondit les deux côtés » et
appliquait donc déjà la bonne règle. En réalité : deux semaines aux tonnages **bruts distincts** qui
tombent dans le **même seau d'arrondi** (ex. `113,0` et `112,5` → tous deux `Math.round → 113`) sont
jugées à égalité, et le départage « garde la plus récente » **vole alors le record à la semaine
antérieure pourtant réellement plus élevée**. Les tonnages en demi-kilo sont la norme (charges 12,5 /
7,5 / 1,25 kg × reps impaires), donc `X,0` vs `X−0,5` dans le même seau se produit en usage réel.

Cas concret et prouvable :

```js
bestTonnageWeek([
  { date: '2026-07-06', exercises: [{ name: 'Bench', load: 100, reps: 1, sets: 1 }, { name: 'Curl', load: 13,   reps: 1, sets: 1 }] }, // 113,0 (lun, antérieure)
  { date: '2026-07-13', exercises: [{ name: 'Bench', load: 100, reps: 1, sets: 1 }, { name: 'Curl', load: 12.5, reps: 1, sets: 1 }] }, // 112,5 (lun suivant, plus récente)
], '2026-07-13')
// semaine A brut 113,0 → best = { weekStart:'2026-07-06', tonnage:113 }
// semaine B brut 112,5 → round(112,5)=113, '113 === 113' + B plus récente → best bascule sur B
// avant → { weekStart:'2026-07-13', tonnage:113, isCurrent:true }  (mauvaise semaine, record volé)
// attendu → { weekStart:'2026-07-06', tonnage:113, isCurrent:false } (A a soulevé 113,0 > 112,5)
```

Impact réel utilisateur : `renderTonnageTrend` (`app.js:498`) affiche `bestTonnageWeek` — mauvaise
**date** de record hebdo, et `isCurrent` calculé sur la mauvaise semaine peut claironner à tort
**« Record hebdo battu cette semaine ! »**. Même classe d'impact que #406 (record de séance), sur le
domaine sœur (record de semaine).

## Le geste (comparer sur le brut, arrondir seulement à l'affichage)

`src/lib/logic.js` — aligné sur `bestSessionTonnage` (#406) : on garde le tonnage **brut** pour la
comparaison et le départage, et on n'arrondit qu'au `return` :

```js
if (!best || v.tonnage > best.tonnage || (v.tonnage === best.tonnage && wk > best.weekStart)) best = { weekStart: wk, tonnage: v.tonnage, sessions: v.sessions };
// …
return { weekStart: best.weekStart, tonnage: Math.round(best.tonnage), sessions: best.sessions, isCurrent: … };
```

Deux bruts distincts ne sont plus jamais à égalité ; l'égalité stricte (bruts identiques) conserve
bien la plus récente. Commentaire d'intention ajouté au-dessus de la comparaison.

## Test

`src/test/logic.test.js` — bloc `bestTonnageWeek` existant : +1 cas `wHalf` (semaine antérieure
113,0 kg vs plus récente 112,5 kg), **prouvé fautif avant** le correctif (renvoyait la semaine du
13-07). Les 3 cas existants (tonnages entiers : record antérieur, record courant, entrées ignorées)
restent verts — brut == arrondi sur des entiers, aucune régression. Ajout dans un `test()` existant →
compteur inchangé à **431 tests** (+ smoke).

## Pourquoi pas de nouveau check smoke

Correctif de **logique pure** ; `app.js` (rendu de `renderTonnageTrend`) n'est pas touché — il passait
déjà `state.workouts` correctement. Le contrat est verrouillé au niveau des tests unitaires (comme
#406 / #407). Le check smoke `bestTonnageWeek` existant reste vert.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **431 tests + smoke 100 % verts** (`whatsNew` vert en 2.0.48,
`bestTonnageWeek` vert, `SMOKE OK`). **Bump 2.0.47 → 2.0.48** : effet utilisateur réel (bonne date de
record hebdo + plus de fausse célébration) → entrée CHANGELOG (🗓️) + 2 assertions `CHANGELOG[0].v`
(logic.test.js + smoke `whatsNew`). Backlog autonome **§4.1/§4.2 (bug pur prouvé)** — clôture la
famille « égalité de tonnage jugée sur l'arrondi » entamée en #406, sur le domaine sœur (record de
semaine). Aucune Release, zéro dépendance, aucune donnée perso, aucune feature retirée. Boucle #408.
