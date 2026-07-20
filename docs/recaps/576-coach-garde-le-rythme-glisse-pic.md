# #576 — Coach : plus de « Garde le rythme » quand la forme glisse ou que la charge est en pic

**Build 2.0.198 · domaine `coach` · 2026-07-20**

## Contexte / priorité

Priorité de nuit d'Adrien (`docs/DEMANDES.md`) : pousser le coaching adaptatif à fond, **en
qualité** (§3 : « retirer une note en vaut souvent deux ajoutées »). Rotation §4 bis vérifiée
**avant de coder** : 5 derniers domaines = `athlete (575) · fondations (574) · coach (573) ·
robustesse (572) · a11y (571)` → `coach` absent des 2 derniers et 1× sur 5 → **autorisé**. Priorité
de nuit et rotation convergent.

## Le défaut (contradiction insight ↔ action, prouvée en rendu chargé §4 ter)

Suite directe de #573. Le ton `reinforce` écrit dans l'insight « … en hausse. **Garde le rythme.** »
(`logic.js:5251`), une injonction à continuer sur sa lancée. #573 (2.0.196) retirait cette phrase
**uniquement** quand la readiness du jour était au **plancher** (`rs.score < 50`, action → « récupération
prioritaire »). Mais l'action sport bascule aussi en **frein** dans deux autres cas, **hors** de ce
seuil :

1. **`readinessSlide`** (`logic.js:6243`) — readiness du jour **correcte** (∈ [50, 75)) mais qui
   **glisse** sur ≥ 4 check-ins (chute ≥ 12 pts) → action réécrite en « … ta forme glisse … **Séance
   allégée aujourd'hui**, soigne ta récup avant de taper dans le rouge. »
2. **`loadSpike`** (`logic.js:6301`) — charge d'entraînement en **pic** (ACWR zone `high`, readiness
   null ou ≥ 50) → action réécrite en « … **allège aujourd'hui** (-30 % de volume) … »

Dans les deux cas, « Garde le rythme. » **pousse** pendant que l'action **freine** — même bug de
crédibilité que #573, simplement hors du seuil `< 50` que #573 couvrait. Reproduit en **rendu chargé**
(`/tmp/coachrender.cjs`, méthode qui paie) :

- **CAS glisse** : sport en hausse (4 j vs 2 j) + readiness du jour **60** avec tendance **-40 pts** sur
  5 check-ins → insight « … en hausse. **Garde le rythme.** … » **ET** action « … Séance allégée … ».
- **CAS pic** : sport en hausse + ACWR **3,69×** sans check-in du jour → insight « **Garde le rythme.** »
  **ET** action « … allège aujourd'hui (-30 % de volume) … ».

## Le fix (curation, pas ajout — §3)

Un seul strip complémentaire ajouté **après** le calcul de `loadSpike` (`logic.js:~6340`, là où
`readinessSlide` et `loadSpike` sont tous deux connus) :

```js
if (tone === 'reinforce' && (readinessSlide != null || loadSpike != null)) insight = insight.replace(' Garde le rythme.', '');
```

- Retire la **seule** injonction contradictoire ; le constat « en hausse » (stat hebdo vraie) et le
  crédit du volume restent.
- **Mutuellement exclusif** du strip #573 (`readinessSlide`/`loadSpike` exigent readiness null ou ≥ 50 ;
  #573 exige < 50) → jamais de double retrait.
- `readinessSlide`/`loadSpike` ne sont non nuls **que** pour le pilier `sport` → aucun effet sur un
  `reinforce` focus (« Garde le rythme » y reste, sans action-frein qui la contredise). Non-régression
  vérifiée : reinforce sport readiness **73** stable (ni glisse ni pic) → « Garde le rythme. » **conservé**
  (action « séance correcte, mais garde une marge » est compatible).

**Aucune note/champ ajouté.** Curation pure : une contradiction de plus en moins.

## Vérifications

- +1 test logique (2 cas : glisse readiness 60, pic ACWR 3,69× ; assertions sur la contradiction retirée
  et le constat « en hausse » conservé). Le test #573 (readiness < 50 + vert + sans check-in) reste vert.
- `xvfb-run -a npm run verify` → **532 tests + smoke 100 % vert** (`coachCuration:true`, `coachFocus:true`).
- Bump 2.0.197 → **2.0.198**, entrée CHANGELOG en tête, 2 assertions `CHANGELOG[0].v` synchronisées.

## Piste laissée ouverte (non traitée — hors scope, à confirmer en rendu chargé)

`sportSlot` (`logic.js:6751`) et `sportZoneFocus` (`logic.js:6796`) sont gardés par `loadSpike == null`
mais **pas** par `readinessSlide == null` → ils peuvent **appender** « Créneau libre à … cale ta séance
là » / « cible en priorité X » à une action de type « **Séance allégée** » (readinessSlide). Contradiction
plus douce (action↔action), à vérifier en rendu chargé avant de conclure — prochaine boucle `coach`.

Domaine : coach
