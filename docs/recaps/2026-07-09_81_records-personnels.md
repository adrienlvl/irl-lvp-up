# Boucle #81 (autonome) — Records personnels par exercice · build 1.9.15

**Contexte :** 6ᵉ itération de la boucle autonome. Aire : Athlète.

## Livré

La **fiche d'un exercice** (bibliothèque → clic sur une carte) affiche désormais **🏆 Record perso** :
- meilleure **charge (kg)** jamais enregistrée pour cet exercice,
- ou, pour les mouvements au poids du corps, le meilleur **nombre de reps**,
- avec la **date** du record.

Calculé sur **tout l'historique de séances** (`state.workouts`), séries détaillées (`setLogs`) incluses.

## Détail technique

- `lib/logic.js` : `personalRecords(workouts)` pur + testé → `{ nom: { load, reps, date } }` (max charge et max reps par exercice, setLogs pris en compte).
- `app.js` : le handler de détail (`#exerciseCards`) préfixe les notes par la ligne `🏆 Record perso` quand un record existe.
- `extras.css` : `.ex-pr` (encadré teal).

## Vérifs

- `npm run verify` → **128 tests / 128 pass** (+1 : `personalRecords` — charge 20 kg + date, reps 10 via setLogs, vide → {}), **SMOKE OK** (`records:true`).
