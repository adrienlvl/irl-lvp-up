# Boucle #42 — Anniversaires dans l'agenda

**Date :** 2026-07-07
**Version :** 1.5.1 → 1.5.2

## Demande d'Adrien
> « Au niveau de l'agenda tu pourrais mettre les anniversaires des personnes que je connais ! Genre moi c'est le 07/07/1999, ma mère le 01/07/1963, mon père le 01/09/1960… que ce soit visible sur l'agenda aussi ! »

## Ce qui a été fait
- **Modèle `state.birthdays`** + `normalizeBirthday` (id, name ≤60, day 1-31, month 1-12, year optionnel 1900-2100) — dans defaults + `normalizeState`.
- **`birthdaysForDay(birthdays, dateKey)`** pur : anniversaires tombant un jour donné (récurrents chaque année) → `[{id, name, age|null}]`, âge = année de la date − année de naissance.
- **Intégration dans `todayItems`** : les anniversaires du jour sont injectés comme items `type:'birthday'`, `allDay`, **non validables** → apparaissent automatiquement en vue **Jour**, **Semaine**, **« Ma journée »** et à l'**impression**. Titre : `🎂 Prénom (âge ans)`.
- **Vue Mois** (`renderMonthCalendar`) : pastille 🎂 par jour d'anniversaire.
- **Panneau de gestion « 🎂 Anniversaires »** (page Calendrier) : formulaire nom + date de naissance, liste triée par date avec âge et suppression. `renderBirthdays`.
- **Style** : accent doré `#d9a441` (slots, chips, mois, liste). En vue Jour, l'icône 🎂 est dans la colonne « heure » (pas de doublon dans le titre).

## Vérifications
- `node --test` → **81/81** ✅ (nouveaux : bornes `normalizeBirthday`, `birthdaysForDay` récurrence + âge + sans année + date invalide, `todayItems` inclut l'anniversaire).
- Smoke → `SMOKE OK`, check `birthdays:true`.
- Flux réel (Electron) avec les vraies dates d'Adrien : liste triée « 1 juil. Maman 63 ans / 7 juil. Adrien 27 ans / 1 sept. Papa 66 ans » ; **aujourd'hui (07/07)** → « 🎂 Adrien (27 ans) » en vue Jour + « Ma journée » ; au **1er juillet** → « Maman (63 ans) » ; aucun bouton « Valider » sur un anniversaire. ✅

## Suite
- **Nouvel audit UX complet** (toujours en attente).
- Idée future : rappel Windows le matin d'un anniversaire (le résumé de notif lit `agenda`, pas encore les anniversaires).
