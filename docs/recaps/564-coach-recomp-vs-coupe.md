# #564 — Coach : plus de contradiction « coupe tes calories » vs « tiens tes calories »

**Build 2.0.187** · domaine `coach` · demande de nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).
Fichiers : `src/lib/logic.js` (`adaptiveCoachFocus`, branche nutrition plateau/recomp + CHANGELOG),
`src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`, assertions `CHANGELOG[0].v`.

## Pourquoi cette itération est du `coach` (rotation §4 bis vérifiée)

`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` (par n° de recap) → `#563 tests · #562 etudes ·
#561 coach · #560 tests · #559 etudes`. Les **2 derniers** = #563 (tests) et #562 (etudes) ; `coach`
(#561) **n'y est pas** et n'apparaît **qu'une fois** dans les 5 derniers → la rotation **autorise
`coach`**. La priorité de nuit (DEMANDES.md) pointe le coaching ; §3 rappelle que la rotation prime même
sur elle — ici les deux convergent.

## Le défaut réel (deux ordres caloriques opposés dans la MÊME phrase — §3 « guard qui en contredit un autre »)

Piste vérifiée et mise de côté en #561 (mémoire `coach-leads-contradictions-2guards`). Dans
`adaptiveCoachFocus`, focus nutrition, objectif de **perte**, balance **flat** (« ne descend plus ») :

1. le coach construit un `tail` de **coupe** — vague (« — baisse un peu tes calories ou ajoute du cardio »)
   ou, profil complet + stagnation confirmée sur 14 j, **chiffré** (« — vise ~2126 kcal/j, environ 125 de
   moins »), puis `insight += \` ${obs}${tail}\``;
2. juste après, si le **tour de taille** a fondu (≥ 1 cm, ~60 j → `recompositionInsight` clé `recomp`), il
   **appendait** un recadrage : « Mais avant de resserrer : … tiens tes calories et tes protéines encore une
   semaine **avant de couper**. »

Résultat, rendu réel chargé (§4ter) : « … **baisse un peu tes calories** … Mais avant de resserrer : …
**tiens tes calories** … avant de couper. » — **couper MAINTENANT** puis **surtout ne pas couper**, collés
dans la même phrase. Avec profil, le premier ordre portait même un **nombre concret** à retrancher : la
version la plus dangereuse pour la nutrition d'Adrien.

## Le correctif (aucune note ajoutée ni retirée — on éteint un ordre, pas un message)

On **détecte la recomposition AVANT** de formuler le conseil calorique (`recompDetect`, calculé juste avant
`tail`). Quand elle s'applique (flat + perte + taille qui fond) :
- `tail = '.'` → on **clôt** l'observation du plateau et on **n'émet aucun ordre de coupe** (ni le conseil
  vague, ni la cible chiffrée : le bloc `energyPlan`/`calorieAdjustment` passe en `else if`, donc
  `calorieTarget` reste `null` — plus de « vise ~X kcal » nulle part) ;
- le recadrage recomposition porte **seul** le conseil, avec un ouvreur qui ne présuppose plus d'ordre de
  coupe préalable : « **Avant de resserrer pour autant** : ton tour de taille a fondu de 3 cm… tiens tes
  calories… » (au lieu de « Mais avant de resserrer », qui doublait le « Mais » de l'observation).

Hors recomposition (plateau sans mensuration, dérive à la hausse, objectif de prise) : **rien ne change** —
le conseil de coupe et la cible chiffrée restent (contrôle rendu ci-dessous).

## Vérif (rendu réel cumulé, §4ter)

Insight rendu pour de vrai (script jetable) :
- **recomp sans profil** → « …Mais la balance ne descend plus (0 kg/sem). **Avant de resserrer pour autant** :
  ton tour de taille a fondu de 3 cm… tiens tes calories… » — zéro contradiction, pas de double « Mais ».
- **recomp + profil complet** (plateau chiffrable) → **identique** : la cible « vise ~2126 kcal de moins »
  est **évincée**, `calorieTarget` = `null`.
- **contrôle plateau SANS recomp + profil** → « …ne descend plus (0 kg/sem) — **vise ~2126 kcal/j (environ
  125 de moins)** ou ajoute du cardio » — le conseil chiffré normal est **intact**.

Test logique enrichi (`focus nutrition — balance flat + tour de taille qui fond → RECADRAGE recomposition`) :
commentaire corrigé + assertions que l'ordre de coupe est absent (`!/baisse un peu tes calories/`,
`!/vise ~\d+ kcal\/j/`) et nouveau sous-cas **avec profil** (`recompPro` : `calorieTarget === null`, cible
chiffrée évincée, « Avant de resserrer pour autant » présent). Check smoke `coachFocus` élargi (éviction de
l'ordre de coupe + présence du nouvel ouvreur). `cd src && xvfb-run -a npm run verify` → **526 tests +
SMOKE OK, exit 0**. Pas de note ajoutée (§3 respecté) → bump **2.0.187** justifié par l'effet utilisateur.

## Piste vérifiée restante (pour une prochaine boucle `coach`, hors rotation immédiate)

- **followThrough hors sport** (`adaptiveCoachFocus`, bloc `reinforce`/`sportEaseToday`) : pour les piliers
  `sommeil`/`focus`/`nutrition`, « Un jour actif de plus aujourd'hui » écrase encore une action pilier-
  spécifique riche (ex. cible de coucher du plan de recalage) — « un jour actif » n'a pas de sens pour le
  sommeil. Le correctif #561 n'a borné l'écrasement qu'au **sport-sous-repos** ; le cas hors-sport reste.
  Fix : borner l'écrasement aux piliers où l'expression a du sens (jugement à poser en §4ter).

Domaine : coach
</content>
</invoke>
