# #590 — Bilan hebdo : « km couru(s) » accordé au singulier sous 2 km (build 2.0.206)

## Rotation des domaines (§4 bis.3) — contrôle AVANT de coder

`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` →
`focus · coach · etudes · docs · coach`.

- **2 derniers recaps** = `focus` (#589), `coach` (#588) → **interdits**.
- **coach** apparaît **2×** dans les 5 derniers (#588, #585) → interdit aussi à ce titre. La
  **priorité de nuit #1** (pousser le coaching à fond) reste donc **rotation-bloquée** ce tour :
  §3 sanctuarise pleinement la rotation du coach, et la demande ne prime jamais sur §3 (même lecture
  mécanique qu'en #585/#586/#587).
- `etudes` (#587) et `docs` (#586) = 1×, hors des 2 derniers → autorisés ; les domaines **jamais vus**
  dans les 5 derniers (**athlete**, nutrition, sommeil, agenda, alternance) → autorisés.

Domaine retenu : **`athlete`** — absent des 5 derniers, et le texte corrigé porte sur la **course**
(kilomètres courus du bilan hebdo).

## Contexte — protocole « backlog vide »

Backlog nommé **P1–P7 tout coché** ; P4 (regex FR) **épuisé** ; propositions Cap 3.0 restantes en
attente de décision d'Adrien. On applique le protocole « backlog vide » (§915 ROADMAP, précédents
#584/#589) : **chasser un défaut prouvable dans un domaine autorisé**, sans forcer.

Une chasse ciblée (agent read-only sur les fonctions pures athlete/nutrition/sommeil/agenda/alternance,
en évitant coach et focus interdits) confirme la maturité : **aucune erreur de calcul dure, aucun
off-by-one de countdown** (`examReminderDue`, `raceGoalStatus`, `upcomingBirthdays`… corrects et
commentés). Elle a relevé **un défaut d'accord réel et user-visible** dans le domaine `athlete`, jamais
audité.

## Le défaut — prouvé

`weeklyInsights` (`logic.js:2464-2466`) produit les puces du **« Bilan hebdo intelligent »** (rendu dans
`#weeklyInsights`). La puce course était **figée au pluriel** :

```js
? { emoji: '🏃', tone: 'good', text: `${cur.km} km courus — objectif ${goalKm} km atteint.` }
: { emoji: '🏃', tone: 'info', text: `${cur.km}/${goalKm} km courus cette semaine.` }
```

Or `cur.km` vient de `weeklySummary` (`logic.js:2351`) : `km: Math.round(km * 10) / 10` → **valeur
décimale** (0.5, 1, 1.5…). En français, une quantité **< 2** impose le **singulier** (« 1,5 km
**couru** »). La puce écrivait donc « **1 km courus — objectif atteint** » (couru exact d'un objectif
de 1 km) et « **1,5 km courus** » — pluriel fautif. Le garde `> 1` employé **deux lignes plus haut**
pour « séance » (`logic.js:2460-2461`, déjà corrigé pour l'accord au singulier) avait été **oublié**
ici — incohérence dans **la même fonction**. Précédent identique au CHANGELOG (v2.0.34 « 1 séance »
vs « 1 séances »).

## Le correctif — chirurgical, aucune note ajoutée

Garde d'accord `couru${cur.km >= 2 ? 's' : ''}` sur les **deux** branches (§3 : « rendre une
formulation plus juste » ; **aucun champ ni note ajoutés**) :

```js
? … text: `${cur.km} km couru${cur.km >= 2 ? 's' : ''} — objectif ${goalKm} km atteint.`
: … text: `${cur.km}/${goalKm} km couru${cur.km >= 2 ? 's' : ''} cette semaine.`
```

- **Seuil `>= 2`, pas `> 1`** : le garde entier employé ailleurs (séances, jours) ne convient pas,
  car `cur.km` peut valoir 1,5 → il faut le singulier jusqu'à **strictement** 2. Commentaire ajouté
  au-dessus pour que le prochain lecteur ne « corrige » pas vers `> 1`.
- Accord porté sur **`cur.km`**, la distance **réellement parcourue** que le participe « couru »
  décrit (cohérent sur les deux branches : « 1,5/20 km couru » = 1,5 km parcouru, singulier).
- `cur.km > 0` est garanti par la condition amont → pas de cas « 0 km ».

## Contrôle de cohérence (§4 ter)

`weeklyInsights` = liste de **puces courtes indépendantes** (pas un pavé cumulé). Rendu chargé relu :
- `cur.km = 1.5`, objectif 1 → « 1.5 km couru — objectif 1 km atteint. » ✅ singulier.
- `cur.km = 5`, objectif 3 → « 5 km courus — objectif 3 km atteint. » ✅ pluriel conservé.
- `cur.km = 1.5`, objectif 20 → « 1.5/20 km couru cette semaine. » ✅ singulier.
Aucune contradiction avec les puces voisines (séances, volume, sommeil, charge).

## Vérification

- +5 assertions dans le test `weeklyInsights` (singulier 1 km / 1,5 km ; pluriel ≥ 2 ; ratio
  singulier et pluriel ; absence de « km courus » sous 2 km).
- Check smoke **bloquant** `weeklyInsights` étendu : `weeklyInsights(… distance 1,5, objectif 1)`
  renvoie « 1.5 km couru — objectif 1 km atteint. » et **jamais** « km courus ». Message d'erreur
  enrichi.
- `cd src && xvfb-run -a npm run verify` → **537 tests + smoke, 100 % vert**.

Bump 2.0.205 → **2.0.206** ; entrée CHANGELOG en tête + les 2 assertions `CHANGELOG[0].v`.

Domaine : athlete
