# Boucle #130 (autonome) — Temps planifié par jour (vue semaine) · build 1.9.64

**Contexte :** 55ᵉ itération de la boucle autonome. Aire : Agenda / vue semaine.

## Livré

Dans la **vue semaine**, l'en-tête de chaque jour affiche désormais son **temps total planifié** (créneaux horodatés) :

> **Mardi** 12 · 2/3 · **1h30**

On repère instantanément les journées chargées vs légères sur toute la semaine — complément naturel du « ⏱️ planifiées » déjà présent dans la vue jour.

## Détail technique

- `app.js` : `renderWeekPage` calcule `dayPlannedMinutes(fItems)` par jour et l'ajoute au `<small>` de l'en-tête, formaté en compact (`1h30` / `2h` / `45min`).
- Réutilise `dayPlannedMinutes` (fonction pure déjà testée) — pas de nouvelle logique.

## Vérifs

- `npm run verify` → **165 tests / 165 pass**, **SMOKE OK** (rendu de la vue semaine exercé par le check `weekView`, aucune erreur console). `node --check app.js` OK.

_Réutilisation d'une fonction pure déjà couverte ; le format est de l'affichage._
