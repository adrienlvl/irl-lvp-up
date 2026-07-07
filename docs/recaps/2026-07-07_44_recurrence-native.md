# Boucle #46 — Récurrence d'événements (moteur natif) · loop auto #1

**Date :** 2026-07-07
**Version :** 1.5.5 → 1.5.6

## Contexte
Adrien : « Fais la suite ! Les deux, crée une boucle d'amélioration et hop ! » → boucle d'amélioration autonome (auto-rythmée). **Itération 1 = récurrence d'événements native** (backlog #1 de la recherche GitHub, implémenté SANS dépendance pour rester fidèle à la sécurité locale — pas de rrule.js embarqué).

## Ce qui a été fait
- **`recurrenceMatches(rule, dateKey)`** pur + testé : un jour correspond-il à la règle ? Fréquences **daily / weekly (jours au choix) / monthly / yearly**, **intervalle** (toutes les N), **startDate**, **until** optionnel. Calcul de semaines via lundi de référence.
- **`normalizeRecurring`** : `{id, title, time, durationMin, kind, priority, rule}` (freq validée, interval borné 1..52, weekdays filtrés 0..6).
- **`state.recurring`** (defaults + `normalizeState`).
- **Injection dans `todayItems`** : les occurrences du jour deviennent des items `type:'recurring'`, `recurring:true`, **non validables** → visibles en vue **Jour / Semaine / « Ma journée » / impression** avec marqueur **↻**. Vue **Mois** : occurrences en pastille pointillée.
- **UI** : formulaire repliable **« 🔁 Événements récurrents »** (Vue mois) — titre, heure, type, priorité, fréquence, intervalle (unité dynamique), jours (si hebdo), début, jusqu'au — + liste des récurrents avec suppression. `renderRecurring`.

## Vérifications
- `node --test` → **88/88** ✅ (5 nouveaux : `normalizeRecurring`, `recurrenceMatches` daily/weekly/monthly/yearly/until, `todayItems` inclut le récurrent).
- Smoke → `SMOKE OK`, check `recurring:true`.
- Flux réel (Electron) : « Standup » hebdo le mardi → apparaît **mardi 7 juillet** (09:00 ↻, sans bouton Valider), **absent mercredi 8**. Liste : « ↻ 09:00 Standup équipe · chaque sem. (mar) ». ✅

## Reste sur l'item récurrence
- **1b** : dépliage des séries **RRULE** des `.ics` importés (Google/Apple) → prochaine sous-itération possible.

## Suite de la boucle
- **Itération 2 = habitudes quotidiennes (Dailies façon Habitica)** : récurrentes, série/streak, XP.

_Loop auto-rythmé, build sans fermer l'app d'Adrien (cf. [[irl-build-ne-pas-tuer-app]])._
