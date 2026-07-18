# DEMANDES D ADRIEN — priorité absolue de l autopilot

> L autopilot lit ce fichier au début de chaque itération. Une demande dans
> « À traiter » ou « En cours » PRIME sur le backlog autonome (§4 de
> VPS-AUTOPILOT.md) — mais JAMAIS sur les interdictions (§3) ni sur verify vert.
> Grosse demande → découpage en étapes, UNE par itération, avancement tenu ici.
> Adrien : ajoutez vos demandes dans « À traiter » (GitHub, éditeur ✏️, ou via
> une session Claude).

## À traiter

- Fais activement AVANCER la roadmap (docs/ROADMAP.md, CAP 3.0), pas seulement du polish 2.0.x. À chaque itération : repère la prochaine étape non terminée de la roadmap (actuellement Vague 2 « Fondations techniques » : IndexedDB, architecture), fais-la progresser d’UN pas concret et sûr (verify 100% vert), puis tiens à jour l’en-tête « État actuel » ET les cases correspondantes de docs/ROADMAP.md. Si l’étape est un gros chantier qui engage un choix structurant (schéma de données, migration), écris d’abord une proposition dans docs/proposals/ (problème, options, reco, risques) et signale-la ici, tout en avançant les sous-étapes sûres en attendant mon feu vert. Continue d’alterner avec un peu de robustesse/tests pour garder l’app stable. _(ajouté le 2026-07-18 22:22 via le terminal)_

## En cours

## Terminé

- **Alternance : le statut posé n'était pas pris en compte + amélioration de l'onglet Sommeil.** ✅
  Terminé le 2026-07-17 (builds 2.0.31 → 2.0.32, boucles #391 → #392).
  _(ajoutée le 2026-07-16 23:54 via le terminal)_ Adrien : « Regarde l'onglet Alternance, quand je
  met que j'ai postulé, que j'ai abandonné pour une société, ça ne prend pas en compte et ça ne
  rafraîchi pas automatiquement, si tu peux regarder ça et l'améliorer. Après essaye d'améliorer
  aussi l'onglet Sommeil ! »
  - [x] 1. Alternance : deux bugs corrigés — une synchro Google Sheets en retard pouvait écraser un
        statut déjà avancé (postulé/refusé) au lieu de se limiter au cas « à postuler » ; le menu
        déroulant de statut ne rafraîchissait pas la carte « Le focus du moment » tout de suite.
        Build 2.0.31, boucle #391. Détail : `docs/recaps/391-alternance-refresh-statut.md`.
  - [x] 2. Onglet Sommeil : le « Bilan sommeil » juge maintenant la régularité par l'heure de
        **coucher** (dès 3 nuits renseignées) plutôt que par la durée de nuit — c'est le signal qui
        compte vraiment pour un rythme circadien, et l'ancien calcul par durée pouvait aussi bien
        rater une vraie irrégularité de coucher que crier « urgent » à tort quand le coucher était
        en fait déjà stable. Build 2.0.32, boucle #392. Détail :
        `docs/recaps/392-sleep-bedtime-regularity.md`.

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
