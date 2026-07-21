# #665 — `macroBreakdown` : le contrat défensif exige enfin une cible calorique

**Type** : couverture de tests + durcissement de contrat pur (mission de nuit priorité n°2). **Pas de
bump** — chemin inatteignable dans l'app, aucun effet utilisateur (§2.6). Master seulement.

## Contexte : rotation & mission

- **Mission de la nuit du 2026-07-22** (ROADMAP « DÉMARRAGE VPS ») : *robustesse / correction / tests /
  contenu — **PAS de design visuel***.
- **Rotation §4 bis** — 5 derniers domaines : `athlete` (#664), `robustesse` (#663), `alternance`
  (#662), `fondations` (#661), `fondations` (#660). Bloqués : `athlete` + `robustesse` (2 derniers),
  `fondations` (2× sur 5). La **priorité n°1 (robustesse classificateurs FR)** tombe donc sous rotation
  → j'ai pris la **priorité n°2 : couverture de tests** (domaine `tests`, libre).
- Une chasse au bug de cas-limite (sous-agent + revue perso, méthode « vert ≠ bon » : chaque candidat
  recalculé à la main) a conclu que le code est **exceptionnellement bien gardé** — aucun bug atteignable
  par un chemin réel. Le **seul** défaut observable retenu était un **trou dans le contrat défensif** de
  `macroBreakdown`.

## Le défaut prouvé

`macroBreakdown(nutri)` (`logic.js:3874`) détaille les macros en grammes + **% des calories**. Son
contrat est explicitement défensif — il rend `[]` pour `null`, pour `{dailyTarget:2000}` seul, pour
`{proteinG:0}` (tests existants `logic.test.js:5648-5650`). **Mais** il laissait passer un objet avec
des protéines **sans cible calorique** : `kcal = Math.max(1, Number(n.dailyTarget) || 0)` retombait
alors sur **1 kcal**, dénominateur qui faisait exploser les pourcentages.

Reproduit (avant correctif) :

```
macroBreakdown({ proteinG:150, carbG:200, fatG:60 })  → pct = [60000, 80000, 54000]  (%)
macroBreakdown({ proteinG:150, dailyTarget:0 })       → pct = [60000, 0, 0]           (%)
```

Incohérent avec ses propres garde-fous voisins : `{proteinG:0}` → `[]`, mais `{proteinG:150}` sans
cible → des pourcentages absurdes plutôt que `[]`.

**Pourquoi ce n'était pas un bug utilisateur** (donc pas de bump) : le **seul** appelant runtime est
`renderOnboardingPreview` (`app.js:914`), qui passe toujours le retour d'`objectiveNutrition` — où
`dailyTarget = Math.max(bmr, …) > 0` (`logic.js:8454`). Le chemin fautif est **inatteignable** aujourd'hui.
La correction ferme la fonction publique/exportée contre une réutilisation future, sans rien changer
d'observable.

## Correctif

`logic.js` — un garde-fou ajouté au contrat, `Math.max(1, …)` (désormais mort) remplacé par la valeur :

```js
if (!n || !(Number(n.proteinG) > 0) || !(Number(n.dailyTarget) > 0)) return [];
const kcal = Number(n.dailyTarget);
```

`logic.test.js:5651-5652` — 2 assertions verrouillant le contrat complété (échouent avant, passent après) :

```js
assert.deepEqual(L.macroBreakdown({ proteinG: 150, carbG: 200, fatG: 60 }), []);
assert.deepEqual(L.macroBreakdown({ proteinG: 150, dailyTarget: 0 }), []);
```

## Vérification

`cd src && xvfb-run -a npm run verify` → **578 tests + SMOKE OK, 100 % vert.** Le check smoke
`macroBreakdown` (rendu de l'aperçu d'onboarding avec `objectiveNutrition` réel) reste vrai : aucune
régression du seul chemin réellement emprunté.

## Traçabilité « vert ≠ bon »

Le garbage `[60000, 80000, 54000]` a été reproduit **avant** correctif (node), donc le test échoue bien
avant. Le correctif est symétrique aux 3 garde-fous déjà présents — pas d'ajout de comportement, juste la
complétion d'un contrat partiel.

Domaine : tests
