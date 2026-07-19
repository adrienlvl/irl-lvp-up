# 492 — Coaching : le coach surveille ta charge d'entraînement (2.0.123)

**Boucle #492 · build 2.0.123 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Quand le pilier poussé est le SPORT, `adaptiveCoachFocus` calait déjà l'intensité du jour sur la
**readiness** (`readinessScore`, la forme du matin, #463). Mais la readiness lit UNE nuit ; elle
reste **aveugle à la tendance de charge** sur 4 semaines. Le cas piégeux — et le premier facteur de
blessure du sportif régulier — c'est le corps **bien reposé** (readiness au vert) qui a **brutalement
ramp-é son volume** ces 7 derniers jours : la readiness seule crierait « pousse ! » alors que le
ratio aigu/chronique est en zone de risque. `acuteChronicRatio` existait déjà (et alimentait la carte
`loadAdvice`), mais **le coach ne le lisait pas**. C'est exactement l'« adaptation aux écarts »
demandée pour la nuit — et un domaine (la charge) que les 8 derniers builds (séries/piliers)
n'avaient pas touché.

## Ce qui a été livré

Un **coach conscient de la charge** greffé sur l'action sport. Quand le pilier est le SPORT, que la
séance du jour n'est pas déjà faite et que la readiness **n'ordonne pas déjà le repos** (null ou
≥ 50 — sous 50 l'action dit déjà « récup », inutile d'empiler), le coach interroge l'ACWR. En zone
`high` (pic de charge, ratio > 1,5), il **tempère** en deux registres (champ **`loadSpike`** = le
ratio, ou `null`) :

- **readiness au vert (≥ 75)** → on crédite la forme mais on redirige : « Forme au vert, mais ta
  charge a bondi à **2,3× ton volume habituel** ces 7 jours — mets l'énergie sur la technique et la
  qualité plutôt que le volume : une semaine de consolidation te blinde sans risque de blessure. »
- **sinon (null ou 50-74)** → on allège franchement : « Charge en hausse brutale : ta semaine est à
  **2,3× ton volume habituel**, et le corps encaisse mal les pics (risque de blessure) — allège
  aujourd'hui (-30 % de volume), technique propre, tu repartiras plus fort. »

Le ratio est exprimé en **« × ton volume habituel »** (aigu ÷ chronique) — plus parlant qu'un chiffre
brut. Sans pic (charge régulière → zone `optimal`/`low`) ou readiness basse, **rien ne change**.

## Conception

- **Additif pur** : champ `loadSpike` (le ratio, ou `null`) TOUJOURS renvoyé ; l'action sport est
  **remplacée** uniquement en cas de pic, aucune autre branche touchée. Ne se déclenche que sur
  données réelles (`durée × effort > 0` sur 4 semaines) — sinon `acuteChronicRatio` renvoie `null`.
- **Garde-fous anti-contradiction** — un pic dit « allège », donc on coupe/protège tout ce qui dirait
  l'inverse :
  - le **créneau sport** (`sportSlot`, « cale ta séance à HH:MM ») est supprimé quand `loadSpike` ;
  - le **suivi positif** (`followThrough`) garde son crédit dans l'insight mais **ne réécrit plus
    l'action** (« un jour actif de plus » contredirait « allège ») ;
  - l'**escalade de reprise** (`comebackStage` « building ») garde le geste léger en cas de pic, au
    lieu de « repasse à une vraie séance ».
- **Complémentaire de la readiness, pas redondant** : sous 50, la readiness commande déjà le repos et
  `loadSpike` reste `null` (pas de doublon). Les deux signaux profonds (forme du jour × charge
  cumulée) se parlent enfin.

## Vérif

- `adaptiveCoachFocus` reste pure ; test node:test dédié : pic sans readiness → `loadSpike` renvoyé +
  « Charge en hausse brutale » ; readiness 100 + pic → « Forme au vert »/« consolidation », pas
  « prêt à pousser » ; readiness < 50 + pic → `loadSpike` null, action récup ; créneau coupé par le
  pic ; charge régulière → `loadSpike` null.
- Check smoke bloquant `coachFocus` étendu (pic → action tempérée, registre vert, créneau coupé).
- `cd src && xvfb-run -a npm run verify` : **468 tests + smoke 100 % vert**.

## Suite possible

- Étendre au ton `revive`/`rebuild` un message de reprise **progressive** quand le pilier dormant
  revient et que le ratio grimpe (protéger la remontée en charge, ≤ 10 %/semaine, cf. `loadAdvice`
  zone `low`).
- Relier `loadSpike` à la carte `loadAdvice` de l'onglet Athlète (cohérence du verdict « deload »).
- Signal inverse (zone `low`, sous-charge) dans le coach : « tu peux remonter le volume » quand la
  base est trop basse par rapport à l'habitude.
