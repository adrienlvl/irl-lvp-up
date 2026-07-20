# #612 — Coach : les notes « pousse l'entraînement » se taisent quand la forme GLISSE (build 2.0.225)

## Contexte / piste

Piste **nommée** laissée ouverte en queue de **P5.2** (ROADMAP) et en mémoire :
_« sportSlot/sportZoneFocus gardés loadSpike==null mais pas readinessSlide — à confirmer en rendu
chargé lors de la prochaine boucle coach. »_

Rotation OK : domaines des 5 derniers recaps = nutrition (611), athlete (610/609/608), coach (607).
`coach` n'apparaît **pas** dans les 2 derniers et **une seule fois** dans les 5 → autorisé.

## Vérification (§4 bis.5 + §4 ter — prouvé avant de coder)

- La piste littérale est **déjà traitée** : `sportSlot` (`logic.js:7046`) **et** `sportZoneFocus`
  (`:7093`) portent bien `readinessSlide == null` depuis **#585**. La note P5.2 était **périmée**.
- **Mais** le vrai manque est ailleurs : la garde `readinessSlide == null` établie par #585 n'a
  **jamais été propagée** à la famille de guards sport ajoutée autour (`trainBalanceGuard` #541 et
  suivants). Cinq guards appendent à l'insight en étant gardés `loadSpike == null &&
  (readiness == null || readiness >= 50)` **sans** `readinessSlide == null`.
- **Contradiction prouvée en rendu chargé** (script node, état réaliste). Un jour de glissade
  (readiness 55 ∈ [50,75), tendance −45 pts sur 5 check-ins) → **action** =
  _« Séance allégée aujourd'hui, et soigne ta récup. »_ Pendant ce temps l'**insight** empilait :
  - `trainBalanceGuard` : _« Cale une sortie de course pour rééquilibrer. »_
  - `pushPullGuard` : _« ajoute des pecs et des épaules… »_
  - `sportHabitDay` : _« c'est justement ton jour… **honore-le aujourd'hui**. »_

  Le coach disait « récupère » ET « entraîne-toi plus » dans le même bloc — exactement la classe de
  contradiction que #585 avait corrigée pour `sportSlot`/`sportZoneFocus`.

## Correctif (curation §3 — ZÉRO champ ajouté)

Ajout de `&& readinessSlide == null` à la condition des **quatre** guards « pousse l'entraînement » :
`trainBalanceGuard` (`:6857`), `pushPullGuard` (`:6900`), `sportNeglectGuard` (`:7142`),
`sportHabitDay` (`:7223`). Commentaires mis à jour (référence #585).

- **Gardé exprès** : `runVolumeGuard` (_« plafonne ta montée de kilométrage »_) — c'est une **mise en
  garde**, **concordante** avec la récup, pas une incitation à en faire plus.
- Gate **chirurgical** : sur une forme **stable** (readiness 63 constant, readinessSlide null) les
  guards **parlent toujours** ; ils ne se taisent que quand la forme **glisse**. `readinessRebound`
  (forme qui remonte → « tu peux réhausser l'intensité ») laisse aussi les guards parler — cohérent.

## Contrôle de cohérence (§4 ter)

Sortie cumulée **relue en entier** sur état chargé glissade : plus aucune incitation à s'entraîner ;
le bloc dit uniformément « récupère aujourd'hui » (momentum + encouragement de reprise conservés).

## Tests / verify

- Nouveau test `logic.test.js` : sur un état glissade, `trainBalanceGuard`/`pushPullGuard`/
  `sportNeglectGuard`/`sportHabitDay` = `null` ; contrôle « forme stable » → ils reparlent (prouve que
  le gate est bien `readinessSlide`, pas un blocage aveugle).
- `xvfb-run -a npm run verify` : **562 tests + smoke 100 % vert**.

## Versionnage

Build **2.0.225** (comportement utilisateur modifié) : `package.json` + `CHANGELOG[0]` + les 2
assertions `CHANGELOG[0].v`. Item P5.2 (queue) : la piste ouverte est **close**.

Domaine : coach
</content>
</invoke>
