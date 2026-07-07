# Boucle #49 — Audit complet + boucle A : notifs & export conscients des récurrents

**Date :** 2026-07-08
**Version :** 1.5.8 → 1.5.9

## Contexte
Adrien : « Essaye de faire un audit complet et de continuer les boucles ». → **Audit complet** (`docs/AUDIT-COMPLET-2026-07-08.md`) : code/tests/sécurité/données/UX au vert ; **5 écarts fonctionnels** (F1–F5) autour des features récentes pas encore branchées partout. **Boucle A = F1 + F2.**

## F1 — Notifications conscientes des événements récurrents
- `electron-main.cjs` **réutilise `lib/logic.js`** (require) — une seule source de vérité, déjà testée (95 tests) : `recurringToday(s, date)` = occurrences du jour via `normalizeRecurring` + `recurrenceMatches`.
- **Résumé du matin** (`todaySummary`) : compte désormais les occurrences récurrentes (sport/révision/blocs).
- **Rappel « X min avant »** (`checkEventReminders`) : notifie aussi avant une occurrence récurrente horodatée (clé anti-doublon `rec-<id>-<date>`).
- Rappel du soir : volontairement **sans** les récurrents tant qu'ils ne sont pas validables (sinon nag permanent) → viendra avec F3.

## F2 — Export .ics avec RRULE
- **`buildRRuleLine(rule)`** pur + testé : règle interne → `RRULE:FREQ=…;INTERVAL=…;BYDAY=…;UNTIL=…` ; **aller-retour vérifié** avec `parseRRule` (round-trip test).
- **`buildIcs`** étendu : un événement portant `rule` est exporté comme **série** (DTSTART = début de série, + ligne RRULE ; sans heure → `VALUE=DATE`). Ponctuels inchangés (non-régression testée).
- `exportAgendaIcs()` exporte agenda **+ récurrents** → Google/Apple les réimportent comme vraies séries.

## Vérifications
- `node -c electron-main.cjs` OK ; simulation Node du chemin exact du main (require logic + match du mercredi) OK.
- `node --test` → **95/95** ✅ (2 nouveaux : `buildRRuleLine` + round-trip ; `buildIcs` récurrent/all-day/non-régression).
- Smoke → `SMOKE OK`, check `icsExport:true`.

## Suite de la boucle
- **Boucle B (F3)** : valider une occurrence récurrente (log de complétion par date + XP + rappel du soir).
- **Boucle C (F4+F5)** : habitudes — choix des jours dans l'UI + comptées dans le rappel du soir.

_Loop auto-rythmé ; build sans fermer l'app d'Adrien._
