# 403 — Conseil poids cible : la catégorie OMS jugée sur l'IMC réel, pas l'arrondi (2.0.43)

## Le manque (couverture de tests §4.1 + robustesse — bug pur prouvé)

Le frère resté à la traîne du correctif #400 (`bmiInfo`, 2.0.40). `weightTargetAdvice`
(`src/lib/logic.js:4960`) arrondissait l'IMC de la cible à une décimale **puis** comparait cette
valeur affichée aux seuils OMS pour décider du ton de l'avertissement :

```js
// avant
const targetBmi = Math.round(target / (m * m) * 10) / 10;
...
if (targetBmi < 18.5) { /* stop : insuffisance pondérale */ }
else if (targetBmi < 20) { /* warn : cible très basse */ }
else if (targetBmi > 27 && ...) { /* warn : cible reste haute */ }
```

Une cible dont l'IMC **réel** est juste sous un seuil, mais qui arrondit **à travers** ce seuil,
était mal jugée aux deux bornes :

```js
weightTargetAdvice({ weight: 81, height: 174, targetWeight: 55.9, fitnessObjective: 'athletique' })
// IMC réel 55,9 / 1,74² = 18,464  (< 18,5 → insuffisance pondérale)
// arrondi 18,5
// avant → level 'warn', note « cible très basse » (18,5 < 18,5 est faux ⇒ la note « stop » saute)
// attendu → level 'stop', note « insuffisance pondérale … professionnel de santé »

weightTargetAdvice({ weight: 81, height: 174, targetWeight: 81.83, fitnessObjective: 'athletique' })
// IMC réel 27,027 (> 27) mais arrondi 27,0
// avant → aucune note « cible reste haute » (27,0 > 27 est faux)
// attendu → warn « cette cible reste haute »
```

Impact réel utilisateur : `weightTargetAdvice` alimente le rendu du **coach poids/nutrition**
(`#coachTargetAdvice`, check smoke `targetAdvice`). Un utilisateur qui fixe une cible pile au seuil
se voyait rassuré (« cible très basse ») là où l'app aurait dû sortir l'alerte santé
« insuffisance pondérale — parles-en à un professionnel » — directionnellement dangereux pour une
app santé, et incohérent avec le principe déjà posé en #400. Les seuils OMS portent sur l'IMC réel,
pas sur une valeur d'affichage.

## Le geste (juger sur l'IMC réel, afficher l'arrondi)

`src/lib/logic.js` — même séparation qu'en #400 : valeur **jugée** (réelle) vs valeur **affichée**
(arrondie).

```js
const rawBmi = target / (m * m);                 // IMC réel de la cible (catégorie OMS jugée dessus)
const targetBmi = Math.round(rawBmi * 10) / 10;  // valeur AFFICHÉE (arrondie)
...
if (rawBmi < 18.5) { ... } else if (rawBmi < 20) { ... } else if (rawBmi > 27 && ...) { ... }
```

Le chiffre affiché (`targetBmi`, y compris dans le texte des notes et l'objet retourné) est
**inchangé** ; seule la catégorie collée dessus devient correcte au seuil. Aucune saisie franche
(loin des bornes) n'est affectée.

## Tests

`src/test/logic.test.js` — bloc `weightTargetAdvice` existant : **+2 assertions de seuil**, toutes
deux **prouvées fautives avant** le correctif :
- seuil bas (`55.9/174` → IMC réel 18,46 → `level === 'stop'`, note « insuffisance pondérale »,
  affichage `targetBmi === 18.5` inchangé) ;
- seuil haut (`81.83/174` → IMC réel 27,03 → `level === 'warn'`, note « reste haute »,
  affichage `targetBmi === 27` inchangé).

Les assertions existantes (valeurs franches) restent vertes. Ajout dans un `test()` existant →
compteur inchangé à **431 tests** (+ smoke).

## Pourquoi pas de check smoke

Durcissement de **logique pure** : `app.js` (rendu) n'est pas touché, le contrat est verrouillé au
niveau des tests unitaires. Le check smoke `targetAdvice` existant (qui lit `bas.targetBmi < 18.5`
sur une valeur affichée) reste vert car l'affichage arrondi ne change pas.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **431 tests + smoke 100 % verts** (`whatsNew` vert en
2.0.43, `SMOKE OK`). Build **2.0.43** (logique pure, aucun rendu modifié, zéro régression). Backlog
autonome **§4.1/§4.2 (bug pur prouvé)** — prolongement direct du #400, dernier point non corrigé de
cette famille « catégorie IMC jugée sur l'arrondi ». Aucune Release, zéro dépendance, aucune donnée
perso, aucune feature retirée. Boucle #403.
