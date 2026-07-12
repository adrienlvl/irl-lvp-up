# Boucle #196 (autonome) — Système d'accomplissements étendu · build 1.9.130

**Nouveau cap : améliorations de fond (fini le polissage).** L'app est un « RPG de vie » ; le système de badges (cœur RPG) n'avait que 14 accomplissements, surtout des « premières fois ». Peu d'objectifs long terme à viser.

## Livré — 8 nouveaux badges liés aux vraies données (14 → 22)

- 🔥 **Semaine de feu** — série de 7 jours · 🌋 **Inarrêtable** — série de 30 jours.
- 🏅 **Pilier** — 50 séances enregistrées.
- 🐘 **10 tonnes** — 10 000 kg cumulés soulevés (via `lifetimeTonnage`).
- 🌍 **Bornes avalées** — 100 km courus au total.
- 🧭 **Cap physique** — un objectif de programme auto choisi.
- 🎖️ **Cible atteinte** — poids actuel = cible (± 0,5 kg).
- 🎨 **Touche-à-tout** — 8 exercices de muscu différents travaillés.

Ces badges donnent des **caps de progression long terme** (streaks, volume, distance, régularité) au lieu de simples premières fois.

## Détail technique

- **`lib/logic.js`** : `computeAchievements` calcule `runKmTotal`, `totalTonnage` (`lifetimeTonnage`), `weightGoalHit` (poids vs `goals.targetWeight`), variété d'exercices ; +8 définitions de badges.
- **`style.css`** : la liste de badges passe en **grille responsive** (`repeat(auto-fill,minmax(150px,1fr))`, 2 colonnes en mobile) — nécessaire pour afficher proprement 22 badges (avant : rangée flex écrasée).

## Vérifs

- `npm run verify` → **230 tests / 230 pass** (test `computeAchievements` étendu : total 22 + nouveaux badges), garde-fou CSS vert, **SMOKE OK** (`achievements:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.130.exe** (app d'Adrien jamais fermée).

## Suite (améliorations de fond)

Quêtes auto générées depuis les objectifs, bilan hebdo intelligent, auto-déload selon ACWR/récupération, plan de repas concret.
