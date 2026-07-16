# DEMANDES D ADRIEN — priorité absolue de l autopilot

> L autopilot lit ce fichier au début de chaque itération. Une demande dans
> « À traiter » ou « En cours » PRIME sur le backlog autonome (§4 de
> VPS-AUTOPILOT.md) — mais JAMAIS sur les interdictions (§3) ni sur verify vert.
> Grosse demande → découpage en étapes, UNE par itération, avancement tenu ici.
> Adrien : ajoutez vos demandes dans « À traiter » (GitHub, éditeur ✏️, ou via
> une session Claude).

## À traiter

- Regarde l’onglet Alternance, quand je met que j’ai postulé, que j’ai abandonné pour une société, ça ne prend pas en compte et ça ne rafraichi pas automatiquement, si tu peux regarder ça et l’améliorer. Après essaye d’améliorer aussi l’onglet Sommeil ! _(ajouté le 2026-07-16 23:54 via le terminal)_

## En cours

## Terminé

- **Système sommeil : évaluation + coach de recalage du rythme.** ✅ Terminé le
  2026-07-16 (builds 2.0.21 → 2.0.24, boucles #377 → #380). Récap complet :
  `docs/recaps/380-systeme-sommeil.md`.
  Contexte : Adrien s endort vers ~6 h du matin et veut revenir à un sommeil
  nocturne. Livré, sans rien casser ni supprimer, en réutilisant l existant
  (sleepDebt, weeklySleep, sleepSpark, readiness) :
  - [x] 1. Bilan sommeil (qualité + régularité) — `sleepCoachInsight` (+
        `sleepRegularity`) combine moyenne 7 j, dette 14 j et régularité en un
        verdict dans « Check-in du jour » (Athlète → Récupération). Build 2.0.21,
        boucle #377.
  - [x] 2. Capture de l heure de coucher — champ facultatif « Coucher » au
        check-in (`recovery[].bedtime`), avec heure « ancrée » (`bedtimeAnchor`)
        pour suivre un rythme qui traverse minuit, et coucher typique récent
        (`recentBedtimeAnchor`, médiane robuste). Build 2.0.22, boucle #378.
  - [x] 3. Plan de recalage progressif — `startSleepPlan`/`sleepPlanDay` :
        heure de coucher CIBLE du jour, décalage 20-30 min tous les 1-2 j depuis
        le rythme réel vers l objectif, ADAPTATION aux écarts (le plan glisse au
        lieu d exiger un saut), barre de progression + arrivée estimée honnête.
        Carte « 🌙 Plan de recalage du sommeil » dans Récupération. Build 2.0.23,
        boucle #379.
  - [x] 4. Coach RPG — conseils du soir calés sur la cible (`sleepEveningTips` :
        café, dîner, écrans, routine, lumière), adhérence + série
        (`sleepPlanAdherence`), XP au coucher tenu (`sleepBedtimeReward`, +15/+25),
        encouragements bienveillants selon l écart. Build 2.0.24, boucle #380.
