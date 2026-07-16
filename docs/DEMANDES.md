# DEMANDES D ADRIEN — priorité absolue de l autopilot

> L autopilot lit ce fichier au début de chaque itération. Une demande dans
> « À traiter » ou « En cours » PRIME sur le backlog autonome (§4 de
> VPS-AUTOPILOT.md) — mais JAMAIS sur les interdictions (§3) ni sur verify vert.
> Grosse demande → découpage en étapes, UNE par itération, avancement tenu ici.
> Adrien : ajoutez vos demandes dans « À traiter » (GitHub, éditeur ✏️, ou via
> une session Claude).

## À traiter

## En cours

- **Système sommeil : évaluation + coach de recalage du rythme.**
  Contexte : Adrien s endort actuellement vers ~6 h du matin et veut revenir à
  un sommeil nocturne. Souhaité :
  1. Évaluer la qualité et la régularité du sommeil à partir des données déjà
     saisies dans l app (heures de coucher/lever, dette de sommeil, readiness...).
  2. Proposer un plan de recalage PROGRESSIF et réaliste (décaler l heure de
     coucher de ~20-30 min plus tôt tous les 1-2 jours, avec l heure cible du
     jour affichée clairement), en s adaptant si Adrien dévie du plan.
  3. Accompagner dans l esprit RPG de l app : conseils du soir (lumière, écrans,
     caféine), suivi de l adhérence, encouragements/récompenses.
  S appuyer sur l existant (sleepDebt, weeklySleep, sleepSpark, readiness...)
  sans rien casser ni supprimer.

  Note constatée en boucle #377 : l app ne trace QUE la durée de nuit (`sleep`
  en heures) au check-in récup — aucune heure de coucher/lever n est saisie
  nulle part (vérifié par grep). Un vrai plan de recalage (étape 2) a donc
  besoin d une saisie d heure de coucher, à ajouter en douceur (champ optionnel).

  Étapes :
  - [x] 1. Bilan sommeil (qualité + régularité) à partir de l existant — nouvelle
        fonction pure `sleepCoachInsight` (+ `sleepRegularity`, écart-type des
        nuits) combinant moyenne 7 j, dette 14 j et régularité en un verdict,
        affiché dans « Check-in du jour » (Athlète → Récupération). Build 2.0.21,
        boucle #377.
  - [ ] 2. Capturer l heure de coucher (champ optionnel au check-in) pour
        permettre un vrai suivi de recalage (sans heure de lever pour l instant —
        la durée suffit à en déduire l essentiel).
  - [ ] 3. Plan de recalage progressif (heure cible du jour, décalage 20-30 min
        tous les 1-2 jours vers un objectif, adaptation aux écarts).
  - [ ] 4. Intégration coach RPG : conseils du soir, suivi d adhérence,
        encouragements/récompenses.

## Terminé
