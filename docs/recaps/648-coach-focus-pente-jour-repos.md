# #648 — Coach Focus : plus de « fais un bloc aujourd'hui » un jour de tête à plat (2.0.256)

## Rotation (§4 bis)

Priorité de nuit = coaching. Contrôle des 5 derniers recaps **par numéro** :
`647 coach · 646 athlete · 645 nutrition · 644 coach · 643 athlete`.
→ `coach` (2×, dont le dernier) et `athlete` (2×, dont l'avant-dernier) exclus ; `nutrition` (645) permis
mais ses chantiers à valeur sont tous **proposition-gated** (glucides #645, protéines #619 — en attente
d'une décision d'Adrien). **`focus`** pris : **0× sur les 5 derniers**, domaine de coaching frais,
pleinement aligné avec la priorité de nuit (concentration / deep work). Angle **NEUF** trouvé par
exploration ciblée : distinct de #588 (qui gardait l'ACTION, pas la note d'insight), #641 (boussole vs
mission control), #647/#642/#627 (sommeil).

## Défaut prouvé (contradiction dos-à-dos DANS l'insight, cas nominal)

`adaptiveCoachFocus`, pilier **focus**. Le garde-fou `focusRested` de #588
(`focusRested = focusGoalDrained != null || focusMarginDrained != null`, `logic.js:6574`) coupe bien les
POUSSÉES côté **action** (`focusTask`/`focusSlot`/`comeback`) les jours de readiness au plancher. Mais la
note de **pente de focus** (`focusMinutesTrend`, branche `down`, `logic.js:6613`) vit dans **l'insight** et
n'avait **aucune garde `focusRested`** — elle poussait « un bloc aujourd'hui inverse la pente » même quand
le frein venait, deux phrases plus haut, de dire l'inverse.

**Scénario nominal** (rendu réel, §4 ter) : minutes de focus en recul (`300 → 60 min` sur 7 j) + tone
`rebuild` + un check-in de récup DU JOUR au plancher (`sleep 5 / fatigue 4 / soreness 4` → readiness 40)
sur un objectif hebdo à l'aise → `focusMarginDrained = 40`. Insight cumulé **avant** :

> « … tu as de la marge sur l'objectif — **aucune raison de forcer un gros bloc aujourd'hui. Un focus
> léger, ou même une vraie pause, suffit largement** : ta marge encaisse ce jour au ralenti… et tu
> repartiras l'esprit bien plus tranchant. **Tes minutes de focus reculent : 300 → 60 min cette semaine
> (−240 min) — un bloc aujourd'hui inverse la pente.** »

« Une vraie pause suffit » **dos à dos** avec « un bloc aujourd'hui inverse la pente » : repose-toi…
puis force un bloc. Exact anti-pattern §4 ter (chaque clause testée seule, personne ne lit le cumulé) —
le pendant, côté note d'insight, de la contradiction que #588 a corrigée côté action.

## Correctif (curation §3, zéro champ ajouté)

Branche `down` de la note de pente gardée par `!focusRested` (`logic.js:6613`) :

```js
if (ft.dir === 'down' && (tone === 'rebuild' || tone === 'revive')) {
  focusTrend = ft.delta;                                  // diagnostic factuel TOUJOURS renvoyé
  if (!focusRested) insight += ` Tes minutes de focus reculent : … — un bloc aujourd'hui inverse la pente.`;
}
```

- `focusTrend` reste **calculé et renvoyé** même reposé (le champ garde sa sémantique « TOUJOURS renvoyé »
  du commentaire d'origine ; les tests `focusTrend < 0` restent vrais) — on ne tait que le **texte de
  poussée**, pas la donnée.
- On n'ajoute **aucune variante de repli** « reculent mais repose-toi » : le frein
  (`focusMarginDrained`/`focusGoalDrained`) dit déjà « l'esprit frais rattrapera ces minutes bien plus
  vite » → une note miroir serait un doublon (§4 ter). « Retirer une note en vaut souvent deux ajoutées »
  (§3). La branche `up` (renfort) est intacte — `focusRested` (readiness < 50) et tone `reinforce` ne
  coexistent pas.

## Contrôle §4 ter — rendu cumulé relu

Insight cumulé **après** (même état chargé) : « … aucune raison de forcer un gros bloc aujourd'hui. Un
focus léger, ou même une vraie pause, suffit largement… et tu repartiras l'esprit bien plus tranchant. »
→ **une seule voix**, plus de contre-ordre. Non-régression : sans check-in de récup (jour normal), la note
« minutes de focus reculent … un bloc aujourd'hui inverse la pente » **revient** (cas `fDown` inchangé).

## Vérif

- `adaptiveCoachFocus` : bloc de test « nuance le focus par la pente » **étendu** (`logic.test.js`) — cas
  reposé : `focusMarginDrained != null`, `focusTrend < 0` (renvoyé), insight **sans** `/minutes de focus
  reculent/` ni `/inverse la pente/` ; cas `fDown`/`fUp` inchangés (non-régression).
- Check smoke **bloquant** `coachFocus` étendu (`fFocusDownRested`) : mêmes assertions sur état chargé
  (frein levé + trend renvoyé + poussée tue). Rendu réel confirmé avant/après par sonde node.
- `cd src && xvfb-run -a npm run verify` → **574 tests + smoke 100 % vert**.
- Bump `2.0.255 → 2.0.256` + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`.

Source de conception : autorégulation par le frein limitant (Halson 2014) — un cerveau à plat ne produit
pas de deep work ; les minutes de focus s'accumulent, un esprit frais les rattrape (raisonnement déjà posé
dans `focusGoalDrained`, #509).

_Domaine : focus._
