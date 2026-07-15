# #339 — Aperçu de demain dans « Ma journée » (1.9.273) · clôture rotation 32

## Le manque

« Ma journée » sur l'accueil ne montrait **que le jour même**. Le soir, impossible de voir ce que
réserve le lendemain sans ouvrir la vue jour du calendrier — alors que le rituel du soir invite
justement à « préparer demain ». Le pont existait dans un sens (le matin rappelle la note de la
veille) mais pas dans l'autre : le soir, aucune visibilité sur demain.

## Ce qui change

Nouvelle fonction pure `tomorrowPreview(state, todayKey)`, qui s'appuie sur `todayItems` (déjà pur) :

- Calcule le lendemain (gère les passages de mois/année).
- Résume : nombre de blocs à faire, **première chose horodatée**, blocs toute la journée,
  anniversaires.
- Renvoie `null` si rien n'est prévu → **pas d'encart inutile** quand demain est vide.

Rendu sous le résumé de « Ma journée » : un bandeau discret
« 🌅 Demain · 3 blocs · 🎂 1 anniversaire — première chose : 07:30 Course à pied ».

## Vérification navigateur (rendu réel)

| Cas | Résultat |
|---|---|
| Demain : 2 créneaux + 1 all-day + 1 anniv | ✅ « 🌅 Demain · 3 blocs · 🎂 1 anniversaire — première chose : 07:30 Course à pied », bordure ambre (#f59e0b) |
| Rien demain | ✅ encart masqué |

## Tests

360 tests `node:test` (premier créneau = le plus tôt, total hors anniversaire, passage de mois
2026-07-31 → 08-01, agenda vide/date invalide → null) + smoke `tomorrowPreview` **bloquant**.

## Rotation

#339 — **clôture la rotation 32** (builds 1.9.270 → 1.9.273). Tag `v1.9.273` publié.
