# 400 — IMC : la catégorie OMS jugée sur l'IMC réel, pas la valeur arrondie (2.0.40)

## Le manque (couverture de tests §4.1 + robustesse — bug pur prouvé)

`bmiInfo` (`src/lib/logic.js:4354`) calculait un IMC arrondi à une décimale **puis** en déduisait la
catégorie OMS **à partir de cette valeur affichée arrondie**, au lieu de l'IMC réel :

```js
// avant
const bmi = Math.round(w / ((h / 100) ** 2) * 10) / 10;
const category = bmi < 18.5 ? 'maigreur' : bmi < 25 ? 'corpulence normale' : bmi < 30 ? 'surpoids' : 'obésité';
```

Un IMC réel juste sous un seuil, mais qui arrondit **à travers** ce seuil, était mal classé :

```js
bmiInfo(53.4, 170)   // IMC réel 18,478 → arrondi 18,5
// avant → { bmi: 18.5, category: 'corpulence normale' }   (18.5 < 18.5 est faux)
// attendu → { bmi: 18.5, category: 'maigreur' }           (l'IMC réel 18,478 < 18,5)

bmiInfo(80.85, 180)  // IMC réel 24,954 → arrondi 25,0
// avant → { bmi: 25, category: 'surpoids' }
// attendu → { bmi: 25, category: 'corpulence normale' }   (l'IMC réel 24,954 < 25)
```

Impact réel utilisateur : `bmiInfo` alimente le rendu du **coach nutrition/poids** (`app.js:265`), où la
catégorie est affichée. Un utilisateur pile au seuil se voyait étiqueté « corpulence normale » alors
qu'il relève de la maigreur (ou « surpoids » à la place de « normale ») — directionnellement faux pour
une app santé, et incohérent avec le chiffre affiché lui-même. Les seuils OMS portent sur l'IMC réel,
pas sur une valeur d'affichage.

## Le geste (catégoriser sur l'IMC réel)

`src/lib/logic.js` — on sépare la valeur **affichée** (arrondie) de la valeur **jugée** (réelle) :

```js
const raw = w / ((h / 100) ** 2);
const bmi = Math.round(raw * 10) / 10;
const category = raw < 18.5 ? 'maigreur' : raw < 25 ? 'corpulence normale' : raw < 30 ? 'surpoids' : 'obésité';
```

Le chiffre affiché (`bmi`) est inchangé ; seule la catégorie collée dessus devient correcte au seuil.

## Test

`src/test/logic.test.js` — bloc `bmiInfo` existant : +2 assertions `deepEqual` (`53.4/170` → maigreur ;
`80.85/180` → corpulence normale), toutes deux **prouvées fautives avant** le correctif. Les 5 assertions
existantes (valeurs franches) restent vertes. Ajout dans un bloc `test()` existant → compteur inchangé
à **431 tests** (+ 2 assertions), + smoke.

## Pourquoi pas de check smoke

Durcissement de **logique pure** : `app.js` n'est pas touché, le contrat est verrouillé au niveau des
tests unitaires.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **tests + smoke 100 % verts** (`whatsNew` vert en 2.0.40).
Build **2.0.40** (logique pure, aucun rendu modifié, zéro régression). Backlog autonome **§4.1/§4.2** —
variation de domaine (métriques santé) après une série sommeil / normalizers / a11y (#397 → #399).
Aucune Release, zéro dépendance, aucune donnée perso, aucune feature retirée. Boucle #400.
