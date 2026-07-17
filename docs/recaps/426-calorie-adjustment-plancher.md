# 426 — Coach poids : la baisse calorique annoncée = la baisse réelle près du plancher (2.0.59)

## Le manque (bug prouvé — §4.2 robustesse, domaine frais nutrition/poids)

Quand la perte de poids stagne, `calorieAdjustment(weights, goal, dailyTarget)` (`src/lib/logic.js:5472`)
propose une baisse calorique. Le message **et** le champ `delta` étaient **figés à 125 kcal**, mais
`newTarget` était plancharisé : `Math.max(1200, dt - 125)`. Résultat pour un **petit gabarit** dont la
cible est déjà proche du plancher (sédentaire/petite taille — `energyPlan` plancharise `dailyTarget` au
métabolisme de base, souvent ~1200-1300) : la baisse annoncée **surestimait** la baisse réelle.

Preuve (exécutée sur le vrai code) : cible `1250` → `{ delta: 125, newTarget: 1200, message: "…Baisse
d'environ 125 kcal/jour…" }`. Or `1250 → 1200` ne fait que **−50**. Rendu user-facing (`app.js:276`,
carte 🍽️ Coach poids) : *« ⚖️ … Baisse d'environ **125** kcal/jour … **Nouvelle cible : 1200** kcal/j »*
alors que la cible courante est 1250 — un conseil qui **se contredit lui-même** (−125 annoncé vs −50
affiché). Pire à `1200` : « baisse de 125 » alors que `newTarget` = cible **inchangée**.

`grep` : aucun test ne couvrait une cible sous `1200 + 125` ; le seul cas testé (`dt = 2000`) laissait
toujours 125 kcal de marge → bug jamais vu. Repéré via un audit ciblé (agent) des fonctions nutrition/poids.

## Le geste (baisse réelle = ce qui reste au-dessus du plancher, une seule fonction)

Correction **chirurgicale** dans la seule branche `perte` de `calorieAdjustment`. La baisse réelle est
bornée par la marge au-dessus du plancher, jamais 125 fixe :

```js
const cut = Math.min(delta, Math.max(0, dt - FLOOR));   // FLOOR = 1200, cut ∈ [0..125]
const newTarget = dt - cut;                             // jamais < dt (cible sous 1200 non REMONTÉE)
```

- `cut > 0` → message honnête « Baisse d'environ **{cut}** kcal/jour ou ajoute du cardio… » ;
- `cut === 0` (déjà au plancher) → le levier calorique est **épuisé**, le coach pivote : « Tu es déjà au
  plancher calorique (~1200 kcal) — relance par le **cardio** ou plus d'activité plutôt qu'une nouvelle
  baisse. », `newTarget` = cible inchangée.

`delta` renvoyé = `cut` (cohérence de l'API). **Branche `prise` inchangée** : pas de plancher → baisse
fixe de 125 conservée. Cas normal (marge large, ex. `dt = 2000`) **strictement identique** à avant
(`delta 125`, `newTarget 1875`).

Cas vérifiés sur le vrai code (`node -e`) puis figés : `2000 → 125/1875` (inchangé) · `1300 → 100/1200`
· `1250 → 50/1200` (le bug) · `1200 → 0/1200` (cardio) · `1150 → 0/1150` (cible sous plancher **jamais
remontée**) · `prise 1250 → 125/1375` (inchangé).

## Tests & vérif

- Test pur étendu (`test/logic.test.js`, bloc `calorieAdjustment`) : plancher (`1250`, `1300`), au
  plancher (`1200` → délégué cardio), sous le plancher (`1150` → cible non remontée), prise inchangée
  (`125/1375`), + garde `doesNotMatch(/125 kcal/)` sur le message de baisse réelle.
- **Check smoke bloquant `calorieFloor`** (`renderer-smoke.cjs`, après `ageLabel`) : dans le vrai
  renderer Electron, `near.delta === 50`, message contient « 50 kcal/jour » **sans** « 125 kcal », cas
  normal `125/1875`, cas plancher `0/1200` message « plancher ». Ligne `errors.push` associée.
- `cd src && xvfb-run -a npm run verify` → **437 tests + smoke 100 % verts** (`calorieFloor:true`,
  `whatsNew` en 2.0.59, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.58 → 2.0.59** : effet utilisateur réel (conseil de baisse honnête, plus de contradiction)
  → entrée CHANGELOG (🍽️) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
- Une seule fonction pure modifiée, branche `perte` seule ; `prise` et le cas à marge large inchangés.
  Aucune Release, zéro dépendance, aucune donnée perso, aucune fonctionnalité retirée.

## Variété (§4)

Rupture avec la série récente (couverture 1RM #425, robustesse Agenda #424, polish anniversaires #423,
couverture énergie #422) : **bug de robustesse (§4.2)** dans le domaine **nutrition / coach poids**,
jamais travaillé dans les dernières boucles. Boucle #426.
