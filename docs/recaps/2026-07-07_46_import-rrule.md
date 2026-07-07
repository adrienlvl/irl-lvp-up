# Boucle #48 — Import des séries récurrentes (RRULE) des .ics · loop auto #3

**Date :** 2026-07-07
**Version :** 1.5.7 → 1.5.8

## Contexte
Boucle d'amélioration auto — itération 3. Finalise l'item récurrence (1b) : quand on importe un agenda Google/Apple (.ics), les événements **récurrents** (RRULE) ne se limitent plus à leur 1re occurrence.

## Ce qui a été fait
- **`parseRRule(rrule, startDateKey)`** pur + testé : convertit une RRULE iCalendar (`FREQ`, `INTERVAL`, `BYDAY`, `UNTIL`) en **règle de récurrence interne** (celle du moteur natif). `FREQ` non gérée → `null`.
- **`parseIcs`** : capture la ligne `RRULE` et remonte un champ **`recurrence`** (règle parsée, ou `null`) par événement.
- **Handler d'import** (`#importIcs`) : sépare **récurrents** (→ `state.recurring`, dédup par `refId = ics-<uid>`) et **ponctuels** (→ agenda via `mergePlannedEvents`). Statut : « ✓ N importés (dont M récurrents 🔁) ». Réimport sans doublon.

## Vérifications
- `node --test` → **93/93** ✅ (2 nouveaux : `parseRRule` FREQ/INTERVAL/BYDAY/UNTIL + non géré ; `parseIcs` remonte `recurrence` consommable par `recurrenceMatches`).
- Smoke → `SMOKE OK`, check `icsRrule:true`.
- Flux réel (Electron) : .ics avec un VEVENT `RRULE:FREQ=WEEKLY;BYDAY=TU` + un ponctuel → « Réunion hebdo » devient récurrente (↻ le mardi 7), « RDV ponctuel » dans l'agenda ; statut « dont 1 récurrent 🔁 » ; **ré-import → toujours 1 récurrent** (dédup). ✅

## État du backlog de la boucle
- (1) Récurrence : **terminée** (1a natif #46 + 1b import RRULE #48).
- (2) Habitudes quotidiennes : **terminée** (#47).
- (3) Reste : items de `docs/ROADMAP.md` / `docs/RECHERCHE-GITHUB.md`.

_Loop auto-rythmé ; build sans fermer l'app d'Adrien (cf. [[irl-build-ne-pas-tuer-app]])._
