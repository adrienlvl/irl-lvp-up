# 418 — Plus longue sortie course : record jugé sur le km brut, pas sur l'arrondi (2.0.55)

## Le manque (bug pur prouvé — §4.1/§4.2)

`trailReadiness` (`src/lib/logic.js:5758`) synthétise l'endurance course sur 28 jours : km sur 7 j,
km sur 28 j, nombre de sorties et **plus longue sortie** (km + date). Pour désigner la plus longue,
il compare chaque sortie au record courant — mais il stockait le record **déjà arrondi au dixième**
et comparait ensuite le km **brut** de la sortie suivante contre cette valeur arrondie :

```js
if (km > 0 && (!longest || km > longest.km)) longest = { km: Math.round(km * 10) / 10, date: w.date };
```

Deux sorties aux distances brutes distinctes qui tombent dans le **même seau d'arrondi** (ex. 12,34
et 12,32 → 12,3) sont alors jugées « à égalité par le dessus » : la sortie **suivante**, pourtant un
poil plus courte, l'emporte (`12,32 > 12,3`) et **vole le record** à la vraie plus longue — mauvaise
date affichée dans le bilan endurance.

Cas concret prouvé (exécuté sur le code réel avant correctif) :

```js
trailReadiness([
  { type: 'run', date: '2026-07-05', distance: 12.34 },
  { type: 'run', date: '2026-07-06', distance: 12.32 },
], '2026-07-10')
// avant → longRun { km: 12.3, date: '2026-07-06' }  (la 12,32 vole le record !)
// attendu → longRun { km: 12.3, date: '2026-07-05' } (la 12,34 est la vraie plus longue)
```

C'est **exactement** l'anti-pattern que le fichier documente déjà comme corrigé ailleurs :
`bestSessionTonnage` (#406, 2.0.46) et `bestTonnageWeek` (#408, 2.0.48, commentaire explicite
`logic.js:3803`) gardent le **brut** pour comparer et n'arrondissent **qu'à l'affichage**, justement
pour ne pas voler un record via une collision de seau d'arrondi. `trailReadiness` violait cette même
règle — troisième occurrence de la même famille, ici côté **course** au lieu de muscu.

## Le correctif (comparer le brut, arrondir à l'affichage)

On stocke la distance **brute** dans `longest.km` pour la comparaison, et on n'arrondit qu'au moment
de construire la valeur de sortie :

```js
if (km > 0 && (!longest || km > longest.km)) longest = { km, date: w.date };
...
const longRun = longest ? { km: Math.round(longest.km * 10) / 10, date: longest.date } : null;
```

## Portée & sûreté

- Logique pure, aucun rendu modifié. `app.js` consomme les mêmes champs (`longRun.km`, `longRun.date`).
- **Conservateur** : pour des distances distinctes hors même seau d'arrondi (le cas courant), le
  résultat est identique — seul le départage des quasi-ex æquo change, et il devient correct. Les
  5 assertions du test existant (21 km → date 2026-06-20, etc.) restent vertes.
- +1 cas ajouté (assertions dans le `test()` existant, compte de tests inchangé à 434) : collision
  d'arrondi 12,34 / 12,32 → le record reste sur la 12,34 (date 2026-07-05), km affiché 12,3.

## Variété (§4)

Rupture avec les dernières boucles : bug de **collision de seau d'arrondi** dans le module
**Course/Trail** (bilan endurance), après couverture agenda (#417), bug Nutrition/poids (#416),
couverture géo (#415) et parseur .ics (#414). Trouvé via un audit des fonctions pures peu testées.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **434 tests + smoke 100 % verts** (`whatsNew` en 2.0.55,
`SMOKE OK`). Bump **2.0.54 → 2.0.55** : effet utilisateur réel (bonne date de plus longue sortie) →
entrée CHANGELOG (🏃) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`). Aucune
Release, zéro dépendance, aucune donnée perso, aucune feature retirée. Boucle #418.
