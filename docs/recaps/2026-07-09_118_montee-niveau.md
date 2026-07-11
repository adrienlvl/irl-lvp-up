# Boucle #118 (autonome) — Célébration de montée de niveau · build 1.9.52

**Contexte :** 43ᵉ itération de la boucle autonome. Aire : Dashboard / gamification.

## Livré

Quand l'XP franchit un palier de 100, un **toast** célèbre la montée de niveau :

> 🆙 **Niveau 7 !** <titre du palier>

- Détection **centralisée** dans `renderDashboardCore` (appelé après chaque changement d'état) → fonctionne quelle que soit la source d'XP : séance, focus, quête, habitude, révision validée…
- Pas de faux positif au chargement (l'XP de départ est mémorisée, pas de toast tant qu'elle ne monte pas).
- Réutilise le système de toast in-app introduit à la boucle #115.

## Détail technique

- `lib/logic.js` : `leveledUp(oldXp, newXp)` pur + testé — renvoie le nouveau niveau si `levelFromXp(newXp) > levelFromXp(oldXp)`, sinon `null`.
- `app.js` : variable `lastKnownXp` ; dans `renderDashboardCore`, `leveledUp(lastKnownXp, state.xp)` → `flashToast` si montée, puis mémorise l'XP.

## Vérifs

- `npm run verify` → **158 tests / 158 pass** (+1 : `leveledUp` — franchit, plusieurs paliers, même niveau, baisse), **SMOKE OK** (`levelUp:true`). `node --check app.js` OK.
