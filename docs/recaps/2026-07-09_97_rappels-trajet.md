# Boucle #97 (autonome) — Rappels qui tiennent compte du trajet · build 1.9.31

**Contexte :** 22ᵉ itération de la boucle autonome. Aire : Fiabilité / rappels desktop.

## Livré

Le rappel **« avant chaque bloc »** (notification desktop) s'ancre désormais sur l'heure de **départ** quand un temps de trajet est renseigné, pas sur l'heure de l'événement :
- événement à 09:00 avec 25 min de trajet → le rappel se déclenche `lead` minutes avant **08:35**,
- le message devient **« 🚗 Pars bientôt · <titre> — Départ dans X min pour être à 09:00 (trajet 25 min) »**,
- sans trajet, comportement inchangé (« 🔔 09:00 · … »).

Avant, un rendez-vous lointain avec trajet pouvait être notifié trop tard pour partir à l'heure.

## Détail technique

- `lib/logic.js` : `reminderAnchorMinutes(item)` pur + testé → minute d'ancrage (heure − trajet, borné au même jour), `null` si pas d'heure valide.
- `electron-main.cjs` : `checkEventReminders` calcule le diff sur l'ancre via `L.reminderAnchorMinutes`, transmet `travelMin` (agenda + récurrents), message adapté départ/trajet.

## Vérifs

- `npm run verify` → **140 tests / 140 pass** (+1 : `reminderAnchorMinutes` — avec/sans trajet, borné même jour, heure invalide, null), **SMOKE OK**. `node --check electron-main.cjs` OK.
