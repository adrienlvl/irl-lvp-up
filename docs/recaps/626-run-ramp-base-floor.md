# #626 — La montée de kilométrage ne crie plus « risque de blessure » sur base minuscule (2.0.236)

**Boucle #626 · 2026-07-21 · build 2.0.236 · domaine `athlete`**

## Contexte / rotation

Priorité de nuit = coaching (DEMANDES.md), mais **`nutrition` et `coach` sont bloqués** par la
rotation §4 bis (les 2 derniers recaps #625 nutrition / #624 coach ; `coach` 2× sur 5). Domaines
disponibles : `athlete`, `focus`, `sommeil`(#623, 1×), `robustesse`(#622, 1×)… Domaine pris :
**`athlete`** (absent des 5 derniers), qui sert directement le **MANDAT COACHING ÉLITE** (muscu /
running / trail). Quota de propositions §4 bis.4 satisfait (#619 en est une, < 10 recaps).

## Défaut prouvé (par lecture + rendu)

`weeklyKmRamp` (logic.js) classe la semaine de course en `zone: 'high'` dès `rampPct > 30`, **sans
aucun plancher de base**. Or les DEUX surfaces d'affichage rendaient ce `high` brut comme une alerte
blessure :

- **`renderAthlete` → bannière `#trailRamp`** (app.js:158) : `high` → « ⚠️ hausse rapide (>30 %) —
  **risque de blessure, lève le pied** ».
- **`renderRunWeekGoal` → `#runWeekGoal`** (app.js:666) : `high` → « ⚠️ **hausse forte** ».

Conséquence : passer de **4 à 9 km** dans la semaine (+125 % par arithmétique sur une base
minuscule) déclenche la **même** alerte alarmante que passer de 20 à 30 km — alors que 9 km de course
ne met les tendons/os/articulations en danger à peu près jamais. C'est exactement le **faux pic** déjà
corrigé côté ACWR 1re semaine (#622) et le pendant de la garde `runVolumeGuard` du coach, qui elle
exige **déjà** `ramp.lastWeekKm >= 10` (logic.js:7246, « au moins 10 km la semaine précédente »). Le
seuil « vraie base = 10 km » existait donc côté coach mais **pas** côté affichage → incohérence entre
surfaces et découragement du débutant (contraire au mandat « un vrai coach ne blesse pas… mais
n'affole pas non plus »).

## Correctif (curation, plancher réutilisé — pas d'ajout de concept)

- **Logique pure** : `weeklyKmRamp` gagne un champ dérivé **`onBase`** = `lastWk >= RUN_RAMP_BASE_KM`
  (constante `= 10`, commentée + sourcée Nielsen 2014 / règle des +10 %/sem., alignée sur le seuil du
  coach). **La `zone` reste inchangée** (accuracy préservée : un +125 % reste `high`) — seule
  l'interprétation d'affichage change. Retour `start` (base 0) : `onBase: false`.
- **Deux renderers** : quand `zone === 'high' && !onBase`, le verdict bascule en construction de base
  au lieu d'alerte blessure — `#trailRamp` : « 📈 tu bâtis ta base — augmente en douceur
  (~+10%/sem.) » (classe `ramp-build`, plus de rouge) ; `#runWeekGoal` : « 📈 tu bâtis ta base »
  (classe `rwg-build`). Dès `lastWeekKm ≥ 10`, le garde-fou blessure revient **à l'identique**.
- **Coach non touché** : `runVolumeGuard` garde déjà `lastWeekKm >= 10` → aucun ripple `coach`
  (domaine resté pur `athlete`).

## §4 ter — contrôle de cohérence (rendu cumulé relu)

- Base < 10 km (this 9 / last 4) → `#trailRamp` : « 📈 **9 km** vs 4 km (**+125%**) — tu bâtis ta
  base — augmente en douceur (~+10%/sem.). » · `#runWeekGoal` : « … vs sem. dernière : +125 % · 📈 tu
  bâtis ta base ». Encourageant, honnête, non redondant.
- Base ≥ 10 km (this 30 / last 20) → alerte « risque de blessure, lève le pied » / « ⚠️ hausse forte »
  **inchangée**. Correct.

## Vérification

- **Logique** : test `weeklyKmRamp` étendu (onBase true sur base 20 ; `high`+onBase true sur base 10 ;
  `high`+onBase **false**+rampPct 125 sur base 4 ; `start` onBase false).
- **Smoke** : `kmRamp` enrichi (assert `onBase`) **et rendu blocant** ; nouveau check bloquant
  **`runRampSoften`** qui pilote `renderRunWeekGoal` sur un scénario base-4 (attend « tu bâtis ta
  base », refuse « hausse forte ») **et** un scénario base-20 (exige « hausse forte »). Les deux
  ajoutés à `errors.push`.
- `cd src && xvfb-run -a npm run verify` → **568 tests + smoke 100 % vert** (`kmRamp:true`,
  `runRampSoften:true`).

Rien cassé, rien supprimé. Build **2.0.236**, CHANGELOG en tête + 2 assertions `CHANGELOG[0].v`.

Domaine : athlete
