# #628 — « L'effet de ton coucher » : le verdict ne se contredit plus (build 2.0.238)

**Domaine : sommeil.** Priorité de nuit = coaching (DEMANDES.md), mais **`coach` bloqué** par la
rotation §4 bis (recaps 627 & 624 → dans les 2 derniers ET 2× sur 5) ; `athlete` bloqué (626, 2ᵉ
dernier). Domaines libres : `nutrition` (625) et **`sommeil`** (623, 5ᵉ). Après survol vérifié-propre
du code nutrition mûr (proteinTarget/energyPlan **écartés** : ripple guards coach, cf. proposition
#619 en attente), défaut **prouvé par exécution** (méthode P5) dans `sleepImpactReport` — domaine
sommeil, adjacent au coaching, au service de la priorité de nuit.

## Le défaut (contradiction texte↔données, prouvée)

`sleepImpactReport(state, todayKey)` (logic.js ~9950) sépare les nuits en « couché tôt » / « couché
tard » (médiane des couchers) et compare énergie / focus du lendemain de chaque paquet. Deux branches
**négatives** — jamais couvertes par les tests — mentaient sur la magnitude qu'elles imprimaient :

- **Focus** (l. 10003) : quand les couchers tôt s'accompagnaient de **moins** de focus que les
  couchers tard (`deltas.focusMin ≤ -10`), le verdict était « **Ton focus dépend peu de l'heure de
  coucher** (${E} vs ${Lt} min) ». Or ce seuil couvre aussi bien `-10` que `-75`. Repro exact :
  4 nuits 22:00→15 min, 4 nuits 01:00→90 min ⟹ `deltas.focusMin = -75`, verdict rendu
  « dépend peu de l'heure de coucher (**15 vs 90 min**) » : la phrase nie une dépendance que ses
  propres chiffres (écart × 6) démontrent.
- **Énergie** (l. 9999) : jumeau. Couchers tôt = **moins** d'énergie (`deltas.energy ≤ -0,3`) ⟹
  « tes couchers plus tardifs **ne pèsent pas** sur ton énergie (2/5 vs 5/5) » — « ne pèsent pas »
  face à un écart franc de 3 points sur 5.

Défaut de cohérence texte↔données (§4 ter : « un vrai coach ne certifie pas ce qu'il n'a pas vu » —
ici, il **nie** ce que la mesure montre). Famille jumelle des contradictions déjà closes côté focus
du coach (#588) et sommeil (#623/#627), mais **jamais traitée sur cette carte**. Vérifié :
`imp.verdict` n'est **jamais** lu par le coach (l. 6075-6077 n'utilise que `deltas.energy` /
`deltas.focusMin`, numériques) → **zéro ripple coach**, purement domaine sommeil (carte `#sleepImpact`).

## Le correctif (curation §3, zéro champ ajouté)

Les deux branches négatives disent désormais **honnêtement ce qu'elles mesurent**, sans affirmation
de « peu d'effet » démentie par les chiffres :

- Focus : « Sur cette période, ton focus du lendemain **a plutôt été meilleur après un coucher
  tardif** (15 min avant 23:30 vs 90 après) — d'autres facteurs pèsent sans doute plus ; vise surtout
  un rythme régulier. »
- Énergie : « Curieux : … ton énergie **a plutôt été meilleure après un coucher tardif** (2/5 avant
  23:30 vs 5/5 après) — d'autres facteurs (durée de sommeil, charge du jour) pèsent sans doute
  davantage. »

Formulation exacte pour tout écart de la branche (petit `-10`/`-0,3` comme grand `-75`/`-3`), le
« plutôt » absorbant les petits écarts. Les branches **positives** (« Se coucher tôt paie »), la
branche « pèse peu » réservée aux **petits** écarts d'énergie (`< 0,3`) et le repli focus sont
**inchangés**.

## Contrôle §4 ter (cumulé, relu)

Rendu du verdict sur 6 états chargés (énergie ±/petit, focus ±/petit, positifs intacts) : plus aucune
contradiction, les branches « paie » et « pèse peu » (petits écarts) conservées à l'identique.

## Vérification

`cd src && xvfb-run -a npm run verify` → **569 tests + smoke 100 % vert**. Test `sleepImpactReport`
étendu (assertions branches négatives focus **et** énergie : `doesNotMatch /dépend peu/` &
`/ne pèsent pas/`, `match /meilleur(e) après un coucher tardif/`, deltas −75 / −3). Check smoke
`sleepImpact` étendu et **bloquant** : rend la branche négative focus et refuse `/dépend peu/`.

Build **2.0.238** · CHANGELOG à jour · 2 assertions `CHANGELOG[0].v` bumpées.

Domaine : sommeil
