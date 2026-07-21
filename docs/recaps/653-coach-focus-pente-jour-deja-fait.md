# #653 — Coach Focus : plus de « fais un bloc aujourd'hui » un jour où le bloc est DÉJÀ posé

**Build 2.0.261 · boucle #653 · 2026-07-21 · Domaine : focus**

## Contexte & rotation

Priorité de nuit = coaching (DEMANDES.md). Rotation §4 bis — 5 derniers recaps par numéro :
`athlete (652), coach (651), sommeil (650), athlete (649), focus (648)`. Exclus : `athlete` et `coach`
(2 derniers) + `athlete` (2× sur 5). Domaines de coaching permis : **`sommeil`** (1×, hors 2 derniers)
et **`focus`** (1×, hors 2 derniers). **`focus`** pris — angle NEUF (exploration agent Explore, hors
pistes closes #647/#648/#650/#642/#628/#623/#615/#589/#641/#588).

## Le défaut (contradiction §3, intra-carte, prouvée en rendu chargé §4 ter)

Sur le pilier **focus** de `adaptiveCoachFocus`, la note de pente (`logic.js`, branche
`focusMinutesTrend` `dir === 'down'`) appendait à l'INSIGHT :

> « Tes minutes de focus reculent : 160 → 60 min cette semaine (-100 min) — **un bloc aujourd'hui
> inverse la pente.** »

Elle n'était gardée que par `!focusRested` (le garde-fou #648, jour de tête à plat). Mais le crédit
du jour (`if (doneToday)`, `logic.js:7691`) réécrit l'ACTION en :

> « **Bloc de focus déjà posé aujourd'hui ✅ — savoure** ; si l'énergie est là, un second bloc te
> rapproche de l'objectif. »

`doneToday` était calculé **après** la note de pente et n'y était pas branché → un jour où un bloc de
focus EST déjà posé, l'insight ordonnait « fais-en un » pendant que l'action créditait « c'est déjà
fait, savoure » — dos à dos sur la même carte. Le commentaire du crédit du jour affirmait même « L'insight
(tendance hebdo) reste vrai et intact » : c'était précisément le bug.

Distinct des pistes closes : #648 = contradiction avec le jour reposé (`!focusRested`) ; #588 =
`focusRested` coupe `focusTask/focusSlot/comeback` ; #647 = redondance côté **sommeil**. Ici la
contradiction vient de `doneToday`, non gardée.

**Cas prouvé (Node)** — `focusSessions` : sem. précédente 4 j × 40 min (160), sem. récente 2 j × 30 min
dont **aujourd'hui** (60) → `rebuild` (recentDays 2 < prevDays 4), `focusTrend = -100` (down),
`doneToday = true`. Avant : insight contient « inverse la pente » ET action « déjà posé ».

## Le correctif (curation §3, zéro champ ajouté)

- **Hoist** du calcul de `doneToday` (sport/focus, entrée active datée du jour) **avant** le bloc focus
  enrichi, pour qu'il soit disponible au moment de la note de pente. `readinessSlide` (seul autre
  consommateur, plus bas) reste inchangé. Comportement byte-identique ailleurs.
- Garde de la note de pente : `if (!focusRested)` → **`if (!focusRested && !doneToday)`**. `focusTrend`
  reste TOUJOURS renvoyé (diagnostic factuel) ; seul le texte de poussée est tu le jour où le bloc est
  déjà fait. Aucune note miroir ajoutée (« retirer une note en vaut souvent deux », §3).
- Commentaire du crédit du jour recadré (il n'affirme plus que la tendance hebdo pousse encore).

## §4 ter — contrôle de cohérence (rendu cumulé, état chargé)

Insight relu en entier sur l'état `doneToday` : « 2 jours actifs cette semaine, contre 4 la précédente.
Un petit geste suffit à repartir. Objectif hebdo : 60/120 min de focus. Dans les temps… tu as la marge. »
+ action « Bloc de focus déjà posé aujourd'hui ✅ — savoure… ». Une seule voix : constat de semaine +
crédit du geste du jour, plus aucune injonction « fais un bloc ».

## Non-régression

Même volume mais dernière session **hier** (07-15) → `doneToday = false` → la note « inverse la pente »
**revient** et l'action redevient « Lance une session de focus… ». Vérifié en Node + test dédié.

## Vérification

- Logique pure testée : test `adaptiveCoachFocus : nuance le focus par la pente de son volume` étendu
  (cas `doneToday` : action = crédit, `focusTrend < 0`, pas de « reculent »/« inverse la pente » ; +
  non-régression bloc d'hier → note revient).
- Check smoke **bloquant** `coachFocus` étendu (`fFocusDownDone`, pilote `renderCoachFocus`).
- `cd src && xvfb-run -a npm run verify` → **578 tests + smoke 100 % verts**.

Domaine : focus
