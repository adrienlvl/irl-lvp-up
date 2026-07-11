# Boucle #116 (autonome) — Volume de course semaine vs semaine-1 · build 1.9.50

**Contexte :** 41ᵉ itération de la boucle autonome. Aire : Athlète / préparation ultra.

## Livré

Les stats hebdomadaires de la **page Ultra** montrent maintenant l'évolution du **volume de course** par rapport à la semaine précédente :

> 3 séance(s), 210 min, sortie longue 90 min · **▲ +6 km vs sem-1**

Pour un traileur/ultra comme Adrien, suivre la progression du kilométrage semaine après semaine est central (montée en charge progressive, éviter les sauts).

## Détail technique

- `lib/logic.js` : `runKmInWindow(workouts, sinceKey, untilKey)` pur + testé — cumule la distance des séances `type: 'run'` dans la fenêtre.
- `app.js` : `renderUltraPage` calcule le km de la semaine précédente (lundi-1 → dimanche-1) et affiche le délta ▲/▼/▬ dans `#ultraWeeklyDetail`.

## Vérifs

- `npm run verify` → **156 tests / 156 pass** (+1 : `runKmInWindow` — cumul fenêtre, exclut non-runs et hors fenêtre, vide, non-tableau), **SMOKE OK** (`runVolumeWow:true`).
