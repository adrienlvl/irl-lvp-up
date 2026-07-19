# 528 — Coaching : le coach ne se laisse plus tromper par la balance (recadrage recomposition)

**Build 2.0.159 · boucle #528 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Sur un objectif de PERTE, quand le poids stagne, le coach « Le focus du moment »
(`adaptiveCoachFocus`, `logic.js`) déclenche une note « balance flat » qui conseille de **resserrer
les calories** (jusqu'à citer une cible chiffrée via `calorieAdjustment`, #499). Conseil juste… sauf
quand la balance **CACHE une vraie recomposition** : poids stable mais **tour de taille qui fond**
(perte de gras + maintien du muscle). Dans ce cas, couper les calories est une **erreur** — le corps
progresse déjà et on saperait du muscle pour rien. Or l'app calcule déjà exactement ce signal :
`measurementRecentDelta(measurements, 'waist', …)` (évolution récente d'une mensuration) et
`recompositionInsight(weightDelta, waistDelta)` (verdict recomp/fatloss/gain) — mais ces deux
fonctions pures ne vivaient que dans l'onglet Progrès (carte « Coach Poids » + panneau mensurations),
**jamais** dans le coach du jour.

## Ce qui est livré

Nouveau champ **`recompFraming`** (`{ waistDelta, spanDays }` ou `null`, **toujours** renvoyé). Dans
la branche « balance flat » (objectif perte, poids réellement stable), le coach lit le tour de taille
sur ~60 j et, quand `recompositionInsight` renvoie la clé `'recomp'`, il **APPEND** un recadrage qui
nomme le cm perdu et invite à **ne pas couper encore**, **appendu** après la note « resserre » :

> « Mais avant de resserrer : ton tour de taille a fondu de **3 cm** sur les **65** derniers jours
> pendant que la balance stagnait — c'est de la **recomposition** (tu perds du gras en gardant le
> muscle), un progrès réel que le poids seul cache. **La balance ne dit pas tout** : tiens tes
> calories et tes protéines encore une semaine avant de couper, le résultat est déjà en cours. »

C'est l'axe « adaptation dynamique aux **progrès** » demandé pour la nuit : reconnaître un gain caché
**ET** éviter un mauvais conseil. Réemploi total (`measurementRecentDelta` + `recompositionInsight`) —
**zéro** nouvelle fonction.

## Garde-fous & honnêteté

- **Branche flat uniquement** : gate `wt.direction === 'flat'` — le poids est vraiment stable, donc
  passer `w = 0` à `recompositionInsight` est fidèle. Sur une dérive à la hausse (poids qui remonte),
  la note reste muette (on ne prétend pas « poids stable »).
- **Perte seulement** (`wp.direction === 'perte'`) — la recomposition-perte n'a pas de sens sur un
  objectif de prise ; muet même si la taille baisse.
- **Seuil à source unique** : le déclenchement (`waistDelta ≤ -1 cm`) est porté par
  `recompositionInsight` (clé `'recomp'`), pas redupliqué dans le coach.
- **Données réelles seulement** : sans ≥ 2 mensurations de taille datées, `measurementRecentDelta`
  renvoie `null` → note absente. Tour de taille stable → clé ≠ `'recomp'` → muet.
- **Affine, ne remplace pas** : note **appendue** ; la note flat (« resserre / baisse tes calories »)
  et le champ `calorieTarget` restent intacts. Le coach ajoute une nuance (« la balance dit couper,
  mais tes mensurations disent d'attendre ») plutôt que d'effacer un repère.
- **Vocabulaire distinct** (« recomposition », « tour de taille a fondu », « la balance ne dit pas
  tout ») → zéro collision regex avec les guards sommeil (« frein caché/invisible ») ni la note flat.

## Vérification

- Test `logic.test.js` dédié : balance flat + taille −3 cm sur 65 j → `recompFraming` = `{-3, 65}`,
  note recomp + note flat conservée ; sans mensuration → null ; taille stable → null ; objectif prise
  → null ; balance qui descend vraiment (branche flat inactive) → null.
- Check smoke **bloquant** `coachFocus` étendu : recadrage recomposition nommé + « la balance ne dit
  pas tout » + note flat présente ; sans mensuration → recadrage muet.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (506 tests node, SMOKE OK, EXIT=0).
</content>
</invoke>
