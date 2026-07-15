# #341 — Barre de progression globale dans le coach poids (1.9.275)

## Suite du retour d'Adrien

Adrien a désigné le coach poids comme prioritaire pour la 2.0. Après le fix du stepper (#340), je
polis l'expérience. Le panneau montre déjà beaucoup (ETA, IMC, macros, graphe prévu/réel, paliers,
cadence, semaine type, assiette, adhérence) — mais **aucun indicateur « où en suis-je » au premier
coup d'œil**. Le graphe le contient, mais il faut le lire.

## Ce qui change

Nouvelle fonction pure `weightGoalProgress(weights, target, fallbackStart)` :

- Départ = 1re pesée enregistrée (ou poids de profil à défaut), actuel = dernière pesée.
- Renvoie `{ pct, doneKg, totalKg, remainingKg, direction, start, current, target }`.
- `pct` borné [0..100] : mauvais sens → 0 %, dépassement de la cible → 100 %.
- `null` si pas de cible ou départ déjà à la cible.

Rendu en tête du plan (juste sous le titre) : une **barre de progression** avec
« 🚶 poids actuel · **X %** · 🎯 cible » et le détail « N kg parcourus sur M · reste K kg ».

## Vérification navigateur (rendu réel)

| Scénario (perte 84 → 81 → cible 78) | Résultat |
|---|---|
| Barre | ✅ largeur **50 %**, dégradé vert→accent |
| Texte | ✅ « 🚶 81 kg · 50% · 🎯 78 kg · 3 kg parcourus sur 6 · reste 3 kg » |

## Tests

361 tests `node:test` (perte/prise à 50 %, mauvais sens → 0 %, dépassement → 100 %, repli sans
pesée, cible nulle/départ=cible → null) + smoke `weightGoalProgress` **bloquant**.

## Rotation

#341 — rotation 33 (build 1.9.275). Prochain #342, clôture à #343 (tag v1.9.277).
