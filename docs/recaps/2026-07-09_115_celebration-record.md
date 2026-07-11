# Boucle #115 (autonome) — Célébration de nouveau record · build 1.9.49

**Contexte :** 40ᵉ itération de la boucle autonome. Aire : Athlète / gamification (esprit RPG).

## Livré

Quand une séance enregistrée **bat un record** (charge ou répétitions) sur un exercice, un **toast** félicite Adrien :

> 🎉 Nouveau record : **Tractions — 12 reps** !

- Un premier système de **toast in-app** (`flashToast`) réutilisable pour d'autres retours positifs.
- Gère plusieurs records d'un coup (« … (+2 autres) ! »).
- Renfort de motivation directement lié à l'objectif muscu.

## Détail technique

- `lib/logic.js` : `newRecords(before, after)` pur + testé — compare deux instantanés de `personalRecords`, retourne les exercices dont la charge ou les reps ont progressé (`loadPr`/`repsPr`), y compris les nouveaux exercices.
- `app.js` :
  - `flashToast(msg, ms)` : bannière temporaire (créée à la volée, `role="status"`).
  - handler d'enregistrement de séance : instantané `personalRecords` avant/après l'ajout → `newRecords` → toast si non vide.
- `extras.css` : style `.app-toast` (apparition/disparition douce, thème-compatible).

## Vérifs

- `npm run verify` → **155 tests / 155 pass** (+1 : `newRecords` — record reps, record charge, nouvel exercice, rien battu, entrées nulles), **SMOKE OK** (`newRecordToast:true`). `node --check app.js` OK.
