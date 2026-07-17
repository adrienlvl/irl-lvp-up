# 419 — Hydratation : repli sûr sur température non chiffrable + bornes verrouillées (tests seuls)

## Le manque (§4.2 robustesse + §4.1 couverture — domaine frais)

`hydrationPlan(tempC)` (`src/lib/logic.js:2068`) renvoie le plan boisson/sodium par heure d'effort
selon la température, via trois seuils `t >= 30 / >= 25 / >= 15` (sinon « Frais »). Deux failles :

- **Repli silencieux dangereux** : `const t = Number(tempC)` sans garde. Une température **non
  chiffrable** (`undefined`, `NaN`, `'abc'`) donne `t = NaN` → toutes les comparaisons `>=` sont
  fausses → repli sur **`'Frais'`, le plan le MOINS hydratant** (350–500 ml, 300–500 mg). Mauvaise
  direction pour un repli : sans information, sous-conseiller l'hydratation est le risque à éviter
  (déshydratation), pas l'inverse.
- **Bornes exactes jamais testées** : le seul test (`test/logic.test.js:2752`) n'exerçait que
  4 températures « au milieu » des seaux (5, 18, 27, 33) et vérifiait la monotonie. Une régression
  d'un seuil en `>` (off-by-one) sur 15/25/30 serait passée inaperçue.

Le chemin d'entrée invalide est **actuellement non atteignable depuis l'UI** : le seul appelant
(`renderSupplements`, `app.js:423`) mappe le `<select id="suppHeat">` (options `frais/tempere/chaud/
tres`) vers un `heatMap` de valeurs numériques fixes. **Donc aucun effet utilisateur aujourd'hui →
pas de bump.** C'est un durcissement de correction latente (le module hydratation est cité comme
futur point d'entrée météo dans la roadmap) + un filet de non-régression sur les seuils.

## Le geste

Logique (`logic.js:2068`) — repli neutre au lieu du plus froid, sans dupliquer d'objet ni toucher
l'appelant (on coerce simplement une entrée non finie vers un temps tempéré représentatif) :

```js
let t = Number(tempC);
// Température absente ou non chiffrable → on se cale sur un temps tempéré (18 °C) plutôt que de
// tomber par défaut sur « Frais », le plan le MOINS hydratant.
if (!Number.isFinite(t)) t = 18;
```

Toute valeur **numérique valide reste strictement inchangée** (les 4 assertions historiques restent
vertes). `null` coerce vers `0` (fini) : `0 °C` est une vraie température → « Frais », pas le repli —
comportement documenté par une assertion.

Tests (`logic.test.js`, assertions ajoutées au `test()` existant → **compte inchangé à 434**) :

- bornes exactes : `30 → Très chaud`, `29.9 → Chaud`, `25 → Chaud`, `24.9 → Tempéré`,
  `15 → Tempéré`, `14.9 → Frais` ;
- repli sûr : `undefined / NaN / 'abc' → Tempéré` (jamais Frais) ; `null → Frais` (coercition vers 0).

## Portée & sûreté

- Logique pure, aucun rendu modifié, appelant inchangé (la fonction renvoie toujours un objet plan
  valide → pas de garde à ajouter côté renderer).
- Purement conservateur sur tout l'espace numérique existant. Aucune Release, zéro dépendance,
  aucune donnée perso, aucune fonctionnalité retirée.

## Variété (§4)

Domaine **hydratation** (jamais travaillé dans les dernières boucles), après course/trail (#418),
agenda (#417), nutrition/poids (#416), géo (#415). Type : robustesse (§4.2) + couverture (§4.1) de
bornes. Repéré via un audit des fonctions pures peu testées.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **434 tests + smoke 100 % verts** (`SMOKE OK`). Pas de bump
(2.0.55 conservé) : durcissement d'un chemin non atteignable → sans effet utilisateur (§2.6).
Boucle #419.
