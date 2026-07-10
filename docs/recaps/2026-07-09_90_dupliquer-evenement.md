# Boucle #90 (autonome) — Dupliquer un événement d'agenda · build 1.9.24

**Contexte :** 15ᵉ itération de la boucle autonome. Aire : Agenda / édition.

## Livré

Le dialogue **« Modifier l'événement »** propose désormais un bouton **« ⧉ Dupliquer »** (à côté d'Enregistrer / Supprimer) :
- crée une copie de l'événement (même titre, heure, durée, lieu, notes…),
- la copie **repart « à faire »** et est **détachée** d'un éventuel créneau planifié ou récurrent,
- l'édition se rouvre aussitôt sur la copie pour ajuster la date/l'heure.

Utile pour recréer rapidement un rendez-vous récurrent « à la main » ou décaler une séance sans tout resaisir.

## Détail technique

- `lib/logic.js` : `duplicateAgendaItem(item, newId, targetDate)` pur + testé.
  - Nouvel `id`, `completed:false`, supprime `planId`/`recId`/`refId` ; `targetDate` (YYYY-MM-DD) déplace la copie, sinon même jour.
  - Ne mute pas la source (copie via `{...item}`).
- `app.js` : handler `#duplicateAgendaEdit` → `duplicateAgendaItem` + `normalizeAgendaItem`, push, ré-rendu, `openAgendaEdit` sur la copie.
- `index.html` : bouton `#duplicateAgendaEdit` dans `#agendaEditForm`.

## Vérifs

- `npm run verify` → **134 tests / 134 pass** (+1 : `duplicateAgendaItem` — nouvel id, à faire, détaché, source non mutée, targetDate, null), **SMOKE OK** (`agendaDuplicate:true`).
