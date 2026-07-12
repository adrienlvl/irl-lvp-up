# Boucle #218 (autonome) — 2ᵉ rotation #3 : programmer une routine récup · build 1.9.152

**2ᵉ rotation, #3 (mobilité/récup).** Les routines se lançaient à la demande ; on ne pouvait pas les **inscrire dans sa semaine**. Ajout d'une programmation récurrente.

## Livré

Chaque routine du panneau « Routines guidées » a maintenant **deux actions** : **▶️ Lancer** (séance guidée, comme avant) et **📅 Programmer**.

« 📅 Programmer » ajoute la routine comme **événement récurrent dans l'agenda** — **mardi & vendredi à 19h**, chaque semaine — pour ancrer la récup / mobilité dans la routine hebdo. Anti-doublon (refId `wellness-<clé>`) ; l'événement reste modifiable/supprimable dans l'agenda (comme tout récurrent).

## Détail technique

- **`lib/logic.js`** : `wellnessRecurringEvent(key, opts)` → événement récurrent normalisé (`kind:'sport'`, `rule.freq:'weekly'`, `weekdays:[2,5]` par défaut, personnalisables), refId `wellness-<key>`. Null si clé inconnue. Pur + testé.
- **`app.js`** : chips wellness restructurés (bouton `.wc-launch` + bouton `.wc-sched`) ; handler « programmer » (dédup + `state.recurring` + rafraîchissement des vues + toast).
- **`strength.css`** : `.wellness-chip` (conteneur), `.wc-launch`, `.wc-sched`.

## Vérifs

- `npm run verify` → **250 tests / 250 pass** (+1 : `wellnessRecurringEvent`), garde-fou CSS vert, **SMOKE OK** (`wellness:true` avec boutons programmer).
- `npm run dist` → **Setup 1.9.152.exe** (app d'Adrien jamais fermée).

## Suite (2ᵉ rotation)

#4 (historique de blocs `state.blockHistory` + stats de blocs, rappel de fin de bloc).
