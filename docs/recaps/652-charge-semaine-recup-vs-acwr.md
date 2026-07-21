# #652 — Charge de la semaine : la récup basse ne cohabite plus avec « tu peux remonter » (build 2.0.260)

**Priorité de nuit** = coaching (DEMANDES.md). **Rotation §4 bis** (5 derniers par domaine :
`coach, sommeil, athlete, focus, coach`) → `coach`/`sommeil` (2 derniers) et `coach` (2×) exclus ;
`focus`/`athlete` permis (1× chacun, hors 2 derniers). **`athlete`** pris, aligné priorité de nuit.

## Le manque (prouvé, §3 contradiction intra-phrase au rendu)

Exploration neuve (agent Explore muscu/séance guidée/running/readiness) → 3 candidats ; le plus **autonome**
retenu : la ligne `#weekLoadAdvice` de l'onglet Athlète (`app.js:143`, `renderAthlete`) concatène **deux
signaux indépendants sans arbitrage** :

- un **verdict récup** du jour : `fragile = recovery.at(-1) && (sleep<6 || fatigue>=4 || soreness>=4)` →
  « Récupération basse : garde la prochaine séance facile ou raccourcie. »
- un **verdict de charge** ACWR : `acuteChronicRatio(...)`, zone `low` quand `ratio < 0.8`
  (`logic.js:1632`) → « charge en baisse — **tu peux remonter progressivement** ».

**Cas prouvé** (Node + smoke) : `fragile=true` + zone `low` (une petite séance récente + 3 séances lourdes
en J-10/14/20 → `ratio ≈ 0,28`) affichait, dans la **même phrase** :

> « Récupération basse : garde la prochaine séance facile ou raccourcie. · Aiguë/chronique 0,72
> (charge en baisse — **tu peux remonter progressivement**). »

« garde la séance facile » (repos) suivi aussitôt de « tu peux remonter progressivement » (pousse) : les
deux moitiés se contredisent, faute d'un guard qui fasse primer la récup basse sur le signal de charge basse.
Les autres combinaisons sont déjà cohérentes : `fragile`+`high` (« allège » × 2), `fragile`+`optimal`
(la récup guide, l'ACWR est neutre) — **`fragile`+`low` est le seul cas de collision**.

Distinct de #646 (label `readinessScore` vs freins) et de `loadAdvice` (`logic.js:1639`, qui fait déjà
primer la forme basse — mais n'est **pas** la source de cette ligne, calculée inline).

## Le correctif (curation §3, zéro champ ajouté)

Extraction de la construction de la ligne (jusqu'ici inline dans `renderAthlete`) en **fonction pure testable**
`weekLoadNote(fragile, load, acwr)` (`logic.js`, juste après `loadAdvice`, même patron que
`loadAdvice`/`guidedProgressionLines` : réconcilier deux signaux en une voix). La **récup prime** — comme
`loadAdvice` fait déjà passer la forme basse avant la charge basse : sous fatigue, la zone `low` devient
« charge en baisse — **remonte quand la forme sera revenue** » au lieu de l'invitation immédiate. Le ratio
chiffré reste affiché (diagnostic factuel). Aucun ripple : la fonction ne fait que remplacer une chaîne
construite au même endroit ; le toggle de classe `acwr-high` est conservé tel quel.

**Non-régression** : hors fatigue, la zone `low` réémet « tu peux remonter progressivement » à l'identique ;
`load>500`/`load nul` gardent leurs libellés.

## §4 ter — contrôle de cohérence (rendu cumulé relu)

Cas corrigé : « Récupération basse : garde la prochaine séance facile ou raccourcie. · Aiguë/chronique 0,72
(charge en baisse — remonte quand la forme sera revenue). » → une seule voix : repos maintenant,
reconstruction quand la forme revient.

## Vérification

- Nouveau test node:test `weekLoadNote` (cœur repos↔pousse tué + non-régression reposé + `fragile`+`high`
  cohérent + cas sans ACWR). **577 tests** verts (+1 bloc).
- Nouveau check smoke **bloquant** `weekLoadNote` : pilote `renderAthlete` avec un état forgé
  (récup `sleep:5` + charge basse), lit `#weekLoadAdvice`, exige « garde la prochaine séance facile » +
  « charge en baisse » **sans** « tu peux remonter ». `SMOKE OK`.
- `cd src && xvfb-run -a npm run verify` : 100 % vert.

Build **2.0.260**. CHANGELOG mis à jour (2 assertions `CHANGELOG[0].v` synchronisées).

Domaine : athlete
