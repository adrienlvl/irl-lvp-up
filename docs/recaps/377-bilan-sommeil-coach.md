# #377 — Coach sommeil, étape 1 : bilan qualité + régularité (2.0.21)

## Le manque

Demande d'Adrien (`docs/DEMANDES.md`) : un coach de recalage du rythme de sommeil (il s'endort
actuellement vers ~6 h et veut revenir à un sommeil nocturne). Le check-in récup ne trace que la
**durée** de la nuit (`sleep`, en heures) — la moyenne 7 j (`weeklySleepStats`), la dette 14 j
(`sleepDebtHours`) et une mini-courbe (`sleepSeries`) existaient déjà, mais rien ne combinait ces
signaux en un verdict, et rien ne mesurait la **régularité** (se coucher à heure fixe compte autant
que le total).

Vérification avant de coder (grep) : aucune heure de coucher/lever n'est saisie nulle part dans
l'app — contrairement à ce que la demande supposait. Un vrai plan de recalage progressif (« heure
cible du jour ») a donc besoin de cette saisie, qui n'existe pas encore. Découpage en 4 étapes,
consignées dans `docs/DEMANDES.md` (« En cours ») : bilan (ici), capture de l'heure de coucher,
plan de recalage progressif, intégration coach RPG (conseils du soir, adhérence, récompenses).

## Ce qui change (étape 1/4)

- `sleepRegularity(recovery, limit)` : écart-type (h) des dernières nuits chiffrées — détecte un
  rythme décousu même quand la moyenne est correcte.
- `sleepCoachInsight(recovery, todayKey)` : combine moyenne 7 j + dette 14 j + régularité 14 nuits
  en un seul verdict avec un ton (`ok` / `attention` / `urgent`) — ex. « Sommeil court et
  irrégulier... stabilise d'abord une heure de coucher fixe » vs « Durée correcte mais rythme
  irrégulier... se coucher à heure fixe compte autant que le total ».
- Nouveau bloc « 🌙 Bilan sommeil » dans Athlète → Récupération (`#sleepCoach`), sous la mini-courbe
  de sommeil, coloré selon le ton (violet/orange/rouge).

## Tests

394 tests (`sleepRegularity` : écart-type nul/fort, plafonnement, dates invalides ; `sleepCoachInsight` :
4 combinaisons court/régulier × irrégulier/ok, verdicts distincts, cas vide) + check smoke
`sleepCoach` **bloquant** (fonctions + `#sleepCoach` + verdict `urgent` attendu sur données
irrégulières synthétiques).

## Contexte

Build **2.0.21**. Pas de Release (lot en cours). Priorité demande d'Adrien (prime sur le backlog
autonome). Étape 1/4 — suite en boucles suivantes (capture heure de coucher, plan progressif,
intégration coach).
