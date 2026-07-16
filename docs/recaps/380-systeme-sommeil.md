# #377→#380 — Système sommeil : évaluation + coach de recalage (2.0.21 → 2.0.24)

Demande d'Adrien (`docs/DEMANDES.md`, priorité absolue) : un système sommeil complet — évaluer la
qualité/régularité, proposer un **plan de recalage progressif** du rythme (il s'endort vers ~6 h du
matin et veut revenir à un sommeil nocturne), et accompagner dans l'esprit RPG de l'app. Menée en
une session dédiée, jalon par jalon, chaque jalon vérifié (`verify` 100 % vert) et poussé.

Contrainte découverte dès l'étape 1 (grep) : l'app ne traçait QUE la durée de nuit (`sleep` en
heures) au check-in récup — aucune heure de coucher n'était saisie. Un vrai plan de recalage avait
donc besoin d'une capture d'heure de coucher, ajoutée en douceur (champ facultatif).

## Étape 1/4 — Bilan qualité + régularité (2.0.21, boucle #377)

- `sleepRegularity(recovery, limit)` : écart-type des dernières nuits chiffrées (un rythme décousu
  même à moyenne correcte).
- `sleepCoachInsight(recovery, todayKey)` : combine moyenne 7 j (`weeklySleepStats`), dette 14 j
  (`sleepDebtHours`) et régularité en un verdict avec ton (`ok`/`attention`/`urgent`). Distingue
  « je dors trop peu » de « je dors assez mais à des heures qui changent tout le temps ».
- UI : bloc « 🌙 Bilan sommeil » dans Athlète → Récupération.

## Étape 2/4 — Capture de l'heure de coucher (2.0.22, boucle #378)

- Champ « Coucher » facultatif au check-in récup (`#bedtimeInput`, persisté dans `recovery[].bedtime`).
- `bedtimeAnchor(hhmm)` : heure de coucher « ancrée » en minutes depuis midi → soir → nuit → petit
  matin devient monotone croissant (06:00 « plus tard » que 23:00, même en traversant minuit).
  `bedtimeFromAnchor` fait l'inverse.
- `recentBedtimeAnchor(recovery, todayKey, limit)` : médiane des couchers récents (robuste à une
  nuit isolée) — point d'ancrage honnête du plan.

## Étape 3/4 — Plan de recalage progressif (2.0.23, boucle #379)

- `normalizeSleepPlan` : plan borné/robuste (import hostile), actif seulement si objectif + départ
  + date présents ; nouveau champ d'état `state.sleepPlan` (défaut + `normalizeState`).
- `startSleepPlan` : ancre le départ sur le coucher réel médian récent (ou un point de départ
  fourni), refuse sans donnée.
- `sleepPlanDay` (cœur) : heure de coucher CIBLE du jour (décalage `stepMin` tous les `stepDays`),
  **adaptation aux écarts** — ne réclame jamais plus d'un pas depuis la réalité récente (en retard,
  le plan glisse et l'arrivée recule ; en avance, il ne brusque pas), progression 0-100, statut
  `on`/`behind`/`ahead`, **arrivée estimée honnête**. + `dateAfterDays`.
- UI : carte « 🌙 Plan de recalage du sommeil » dans Récupération — configuration (coucher visé,
  décalage 20/25/30 min, tous les 1-2 j), grande heure cible du soir, barre de progression, date
  d'arrivée, message d'adaptation, Ajuster / Arrêter (styles dans `athlete.css`).

## Étape 4/4 — Coach RPG (2.0.24, boucle #380)

- `sleepEveningTips(targetTime)` : 5 conseils du soir calés sur la cible (café coupé 8 h avant,
  dîner 3 h, écrans 1 h30, routine calme 30 min, lumière du matin) — franchit minuit sans casser.
- `sleepPlanAdherence(plan, recovery, todayKey, window)` : nuits tenant la cible planifiée du jour
  (± 30 min) + série de nuits « dans le plan ».
- `sleepBedtimeReward(plan, recovery, todayKey, bedtime)` : XP RPG au coucher tenu (+15, +25 si
  objectif final atteint), une fois par jour (`lastReward`) ; cible calculée sans la nuit du jour.
- UI : adhérence (« Nuits dans le plan : m/n · 🔥 série ») + dépliant conseils + encouragements
  bienveillants selon l'écart ; le check-in accorde l'XP et fête le coucher tenu (`showFlashToast`).

## Tests

**404 tests** node:test (bedtimeAnchor/inverse, recentBedtimeAnchor, dateAfterDays, normalizeSleepPlan,
startSleepPlan, sleepPlanDay — jour 0/retard adapté/avance/atteint, sleepEveningTips, sleepPlanAdherence,
sleepBedtimeReward — cas nominaux, marges, série cassée, bonus objectif, anti-double-XP) + 3 checks
smoke **bloquants** (`sleepBedtime`, `sleepReschedule`, `sleepRpg`).

## Contexte

Builds **2.0.21 → 2.0.24**. Aucune Release (décision d'Adrien). Zéro dépendance ajoutée, aucune
donnée personnelle, aucune feature retirée. Base honnête pour la suite si besoin (heure de lever,
rappels programmés, intégration à la boussole du matin).
