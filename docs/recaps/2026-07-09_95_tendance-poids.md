# Boucle #95 (autonome) — Tendance de poids + ETA vers la cible · build 1.9.29

**Contexte :** 20ᵉ itération de la boucle autonome. Aire : Athlète / suivi du poids.

## Livré

Sous la courbe de poids, une **ligne de tendance** résume la dynamique récente :
- **rythme** en kg/semaine (`↓ −0,5 kg/sem`, `↑ +0,3 kg/sem`, ou `→ stable`),
- **reste à faire** vers la cible (`reste −2 kg`),
- **échéance estimée** si on va dans le bon sens (`→ cap vers ~4 sem.`), sinon un rappel honnête (`rythme actuel n'y va pas encore`, bord orange),
- `🎯 cible atteinte !` quand on y est.

Bien plus parlant que la seule variation totale déjà affichée : ça relie l'effort au cap de recomposition d'Adrien.

## Détail technique

- `lib/logic.js` : `weightTrend(weights, target)` pur + testé.
  - Rythme = pente sur les 6 dernières mesures (kg/jour ×7), arrondi.
  - `weeksToTarget` seulement si `sign(rythme) === sign(reste)` et |rythme| ≥ 0,05 ; `onTrack` sinon false. Retourne `null` si < 2 mesures ou span nul.
- `app.js` : `renderWeight` remplit `#weightTrend` (flèche + message, classe `.off-track`).
- `index.html` / `athlete.css` : élément `#weightTrend` + style (bord accent, orange si hors trajectoire).

## Vérifs

- `npm run verify` → **139 tests / 139 pass** (+1 : `weightTrend` — rythme/ETA, mauvais sens, cible atteinte, < 2 mesures, entrée non-tableau), **SMOKE OK** (`weightTrend:true`).
