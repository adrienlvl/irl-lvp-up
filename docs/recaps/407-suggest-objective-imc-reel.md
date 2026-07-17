# 407 — Objectif suggéré à l'inscription : la catégorie OMS jugée sur l'IMC réel, pas l'arrondi (2.0.47)

## Le manque (bug pur prouvé — §4.1/§4.2)

Troisième membre de la famille « catégorie IMC jugée sur l'arrondi » (après `bmiInfo` #400 et
`weightTargetAdvice` #403). `suggestObjective` (`src/lib/logic.js:2923`) propose un objectif physique
à l'**onboarding** d'après le profil : sans poids cible, elle bascule sur l'IMC (≥25 → perte de gras,
<18,5 → prise de muscle, sinon corps athlétique). Elle arrondissait l'IMC à une décimale **puis**
comparait cette valeur affichée aux seuils OMS :

```js
// avant
const bmi = r1(w / ((h / 100) ** 2));   // r1 = arrondi à 0,1 → valeur AFFICHÉE
if (bmi >= 25) return { key: 'seche', ... };
if (bmi < 18.5) return { key: 'muscle', ... };
return { key: 'athletique', ... };
```

C'est exactement la faute que `bmiInfo` (`logic.js:4364`) documente et évite déjà : « Catégorie OMS
jugée sur l'IMC RÉEL, pas sur la valeur affichée arrondie ». Un IMC réel juste sous un seuil, mais
qui arrondit **à travers**, était mal catégorisé aux deux bornes :

```js
suggestObjective({ weight: 72.2, height: 170 })
// IMC réel 72,2 / 1,70² = 24,983  (< 25 → dans la norme)  ; arrondi 25,0
// avant → { key: 'seche', … }  (25,0 >= 25 vrai ⇒ perte de gras)
// attendu → { key: 'athletique', … }  (24,98 dans la norme)

suggestObjective({ weight: 53.4, height: 170 })
// IMC réel 53,4 / 1,70² = 18,478  (< 18,5 → maigreur)  ; arrondi 18,5
// avant → { key: 'athletique', … }  (18,5 < 18,5 faux ⇒ la branche muscle saute)
// attendu → { key: 'muscle', … }  (maigreur → prise de muscle)
```

Impact réel utilisateur : `suggestObjective` alimente la suggestion d'objectif au tout premier
contact avec l'app (rendu onboarding, check smoke `onboardingSuggest`). Un nouvel utilisateur pile
au seuil se voyait proposer un **programme de perte de gras** alors que son IMC est dans la norme
(directionnellement discutable pour un premier objectif), ou rater l'orientation « prise de muscle »
en cas de maigreur. Les seuils OMS portent sur l'IMC réel, pas sur une valeur d'affichage — principe
déjà acté en #400/#403.

## Le geste (juger sur l'IMC réel, afficher l'arrondi)

`src/lib/logic.js` — même séparation valeur **jugée** (réelle) / valeur **affichée** (arrondie)
qu'en #400 et #403 :

```js
const rawBmi = w / ((h / 100) ** 2);   // IMC réel : catégorie OMS jugée dessus
const bmi = r1(rawBmi);                 // valeur AFFICHÉE (arrondie)
if (rawBmi >= 25) return { key: 'seche', ... `IMC ${...bmi...}` };
if (rawBmi < 18.5) return { key: 'muscle', ... };
return { key: 'athletique', ... };
```

Le chiffre affiché (`bmi`, y compris dans le texte de `reason`) est **inchangé** ; seule la
catégorie collée dessus devient correcte au seuil. Aucune saisie franche (loin des bornes) n'est
affectée : le cas `weight: 95, height: 178` (IMC 29,98 → seche) et `weight: 52, height: 180`
(IMC 16,05 → muscle) restent identiques.

## Tests

`src/test/logic.test.js` — bloc `suggestObjective` existant : **+2 cas de seuil**, tous deux
**prouvés fautifs avant** le correctif :
- normal (`72,2/170` → IMC réel 24,98 → `key === 'athletique'`, affichage `IMC 25` inchangé dans
  `reason`) ;
- maigreur (`53,4/170` → IMC réel 18,48 → `key === 'muscle'`, affichage `18,5` inchangé).

Les assertions existantes (valeurs franches, priorité au poids cible, entrées invalides → null)
restent vertes. Ajout dans un `test()` existant → compteur inchangé à **431 tests** (+ smoke).

## Pourquoi pas de check smoke

Durcissement de **logique pure** : `app.js` (rendu de la suggestion d'onboarding) n'est pas touché,
le contrat est verrouillé au niveau des tests unitaires (comme #400 → #406). Le check smoke
`onboardingSuggest` existant reste vert car l'affichage arrondi ne change pas.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **431 tests + smoke 100 % verts** (`whatsNew` vert en
2.0.47, `SMOKE OK`). Build **2.0.47** : effet utilisateur réel (l'objectif suggéré au seuil cesse de
mentir) → entrée CHANGELOG (🎯) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
Logique pure, aucun rendu modifié, zéro régression. Backlog autonome **§4.1/§4.2 (bug pur prouvé)** —
dernier point non corrigé de la famille « catégorie IMC jugée sur l'arrondi » (#400 `bmiInfo`, #403
`weightTargetAdvice`, ici `suggestObjective` à l'onboarding). Aucune Release, zéro dépendance, aucune
donnée perso, aucune feature retirée. Boucle #407.
</content>
</invoke>
