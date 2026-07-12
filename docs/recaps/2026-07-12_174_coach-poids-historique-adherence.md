# Boucle #174 (autonome) — Coach Poids : historique d'adhérence · build 1.9.108

**Contexte :** thème D (Coach Poids). La régularité se juge dans la durée : mémoriser le score d'adhérence semaine après semaine.

## Livré

Le **score d'adhérence hebdo** (déjà calculé sur les données réelles) est désormais **mémorisé** dans l'état (`adherenceHistory`, clé = lundi de la semaine, mis à jour à chaque rendu). Dans le Coach Poids, une **mini-courbe « 📈 Adhérence · N dernières semaines »** montre l'évolution du % — Adrien voit si sa régularité progresse, tient ou s'effrite.

- Snapshot par semaine (lundi), mis à jour si le score change, sans doublon, gardé sur les 12 dernières semaines.
- Courbe rendue seulement à partir de 2 semaines d'historique.

## Détail technique

- `lib/logic.js` : `upsertAdherenceSnapshot(history, weekKey, score, cap=12)` — pur + testé. Met à jour/ajoute la semaine, borne le score 0-100, trie par date, garde les `cap` dernières ; ignore une clé invalide.
- `app.js` : `state.adherenceHistory` (défaut `[]` + normalisé) ; `renderCoachWeight` upsert le score de la semaine courante (save seulement si changé) et rend `.cw-adh-hist` (via `barChartSvg`).
- `athlete.css` : style `.cw-adh-hist`.

## Vérifs

- `npm run verify` → **213 tests / 213 pass** (+1 : `upsertAdherenceSnapshot` — maj/ajout, tri, cap, bornage, clé invalide). **SMOKE OK** (`coachAdhHist:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.108.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Responsive mobile continu des pages denses ; polissages Coach Poids / progression / séances guidées.
