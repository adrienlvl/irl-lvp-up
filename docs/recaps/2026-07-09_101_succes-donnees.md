# Boucle #101 (autonome) — Succès pilotés par les données · build 1.9.35

**Contexte :** 26ᵉ itération de la boucle autonome. Aire : Focus & Vie / gamification.

## Livré

La section **Succès** passe de **3 badges codés en dur** à **14 badges calculés depuis l'état réel** de l'app — cohérent avec l'esprit « RPG de vie » :

⚔️ Première quête · ⏳ Focus trouvé · 🔥 Série de 3 jours · 👟 En mouvement · 🏋️ Assidu·e (10 séances) · 💪 Première fonte · 🏃 Premier run · 💧 Bien hydraté · 🧠 Marathon mental (10 focus) · 🎯 Cap fixé (course) · 📏 Miroir (2 mensurations) · ⚖️ Sur la balance · 📚 Réviseur (5 révisions) · 🌱 Rituel ancré.

- Compteur **« X / 14 »**, chaque badge verrouillé affiche sa condition de déblocage en infobulle + sous-titre.

## Détail technique

- `lib/logic.js` : `computeAchievements(state)` pur + testé — défensif (arrays manquants tolérés), retourne `{ badges:[{id,emoji,title,desc,unlocked}], unlocked, total }`.
- `app.js` : `renderRoadmapFeatures`/section succès utilise le moteur (emoji + titre + desc) et le compteur `#achievementProgress`.

## Vérifs

- `npm run verify` → **143 tests / 143 pass** (+1 : `computeAchievements` — état vide → 0/14, état riche → ≥8 débloqués, seuils 10 séances/5 révisions non atteints, entrée `null`), **SMOKE OK** (`achievements:true`, ≥10 badges rendus).
