# #481 — Coaching : le coach adapte son geste à la DURÉE d'une coupure (2.0.112)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

`adaptiveCoachFocus` distingue déjà un pilier DORMANT (ton `revive` : ≥ 14 j sans activité) d'un simple
creux (`rebuild`) — mais son ACTION restait générique : « Programme une séance courte aujourd'hui, même
20 min. », « Lance une session de focus de 25 min maintenant. ». Or après une **longue coupure**,
l'énergie d'activation est à son maximum : sortir la « séance courte » habituelle intimide et fait
remettre à demain. Un pilier dormant depuis 26 jours et un autre depuis 15 recevaient exactement le même
ordre, sans reconnaître la coupure ni abaisser la barre. « Moduler l'action du pilier dormant choisi
(`revive`) vers un tout premier pas ré-amorçant » figurait en tête des prochaines pistes de **#478**,
**#479** et **#480**.

## L'amélioration

Quand le pilier poussé est dormant (`revive`), le coach remplace l'action générique par un **tout premier
pas MINUSCULE**, proportionné à la durée de dormance et qui **nomme la coupure** pour que l'effort demandé
paraisse juste. Deux bandes :

- **Coupure modérée (14-20 j)** — pas ré-amorçant sobre : « **Après 15 jours sans séance**, ne vise pas
  la performance : enfile ta tenue et **bouge 5 min**, c'est tout. »
- **Longue coupure (≥ 21 j / 3+ semaines)** — même pas, plus une phrase qui **déculpabilise franchement** :
  « **Après 26 jours sans focus**, un seul bloc de **10 min** sur une tâche facile — juste pour recréer le
  réflexe. **On ne rouvre pas le chantier aujourd'hui, on rallume la lampe.** »

Un pas par pilier (sport, focus, nutrition, sommeil), tous dans le même esprit « rallumer la mèche compte
plus que l'intensité ».

### Le point de conception

- **Distinct du micro-pas (#465)** : celui-ci répond à un conseil **ignoré** (coachLog, ≥ 2 caps non
  suivis) ; le ré-amorçage répond à la seule **dormance**, même si le coach n'a jamais nagué ce pilier.
  Quand les deux se recouvrent, le **micro-pas prime** (`reviveEligible && !microStep`) : c'est le signal
  le plus spécifique, avec le bon aveu (« je t'ai déjà soufflé ce cap… »).
- **Coupe les créneaux** : un pas ré-amorçant rend `focusSlot`/`sportSlot` incohérents (« cale ta séance à
  14:30 » contredit « juste 5 min ») → le flag `reviveEligible`, calculé **avant** les deux blocs de
  créneau, les désactive.
- **Exclusions honnêtes** : le SPORT un jour de récup (`readiness < 50` : l'action dit déjà « repose »,
  y caler « bouge 5 min » la contredirait) et le SOMMEIL quand le coach sommeil a déjà un verdict riche
  (`sleepIns` non nul). `doneToday` est **toujours faux** en `revive` (un geste du jour ferait
  `recentDays ≥ 1`, donc plus de dormance) — inutile de le tester.
- Libellés volontairement **différents** de ceux du micro-pas pour ne pas radoter le même mot à mot.

### Garde-fous / rétrocompat

- Additif pur : nouveau champ `reviveStep` (booléen) **toujours** renvoyé ; aucune autre branche touchée.
  Le ton `revive`, `headline` (« Reprends… »), `lastActiveDays` et l'`insight` sont inchangés — seule
  l'**action** est remplacée. Les tons `rebuild`/`reinforce`/alternance ne passent jamais par ce bloc.

## Logique / tests

- `src/lib/logic.js` — flag `reviveEligible` (après le calcul de `readiness`), gating de `focusSlot` et
  `sportSlot`, bloc d'application `reviveStep` (après le micro-pas). Champ `reviveStep` au retour.
  CHANGELOG[0] 2.0.112.
- Aucun changement `src/app.js` : `renderCoachFocus` affiche l'action (remplacée) telle quelle.
- `src/test/logic.test.js` — test coach étendu : revive focus 26 j → `reviveStep` true, action « Après 26
  jours sans focus » + « 10 min » + « rallume la lampe » ; revive sport 15 j → bande modérée sans phrase
  « long » ; sport dormant + check-in récup (readiness < 50) → `reviveStep` false, action « repose ».
  Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (revive 26 j → `reviveStep` true,
  libellé long ; revive sport 15 j → bande modérée sans « long »). Assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **464 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.112**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
Le coach ne pousse plus le même geste quelle que soit l'ancienneté de la coupure : après une longue pause,
il abaisse radicalement l'ask et déculpabilise. Prochaines pistes possibles : chercher un créneau plus TÔT
dans l'agenda pour suggérer de **décaler** un RDV du soir menaçant (`sleepConflict`, via `nextFreeSlot`)
quand c'est faisable ; escalader le pas ré-amorçant sur plusieurs jours (premier pas → séance courte →
séance normale) au fil de la relance ; exposer un badge « relance amorcée » quand Adrien honore le premier
pas d'un pilier dormant.

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/481-coach-pas-reamorcant-dormance.md`.
