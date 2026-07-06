# Récap boucle #13 — Extraction des données statiques (3.1, étape 1)

**Quand :** 2026-07-06 ~04h30 (mode continu)
**Vague :** 3 — tâche 3.1 (étape 1)
**Statut :** ✅ vérifié (23/23 tests, smoke OK, 30 exercices rendus)

## Ce que j'ai fait
- Créé **`lib/exercises-data.js`** : la bibliothèque des 30 exercices illustrés + les 3 programmes d'entraînement (fullbody / circuit / base ultra-trail), extraits tels quels d'`app.js` (13 Ko de données pures, zéro logique).
- `index.html` charge désormais `lib/logic.js` → `lib/exercises-data.js` → `app.js` (portée globale partagée, aucun bundler nécessaire).
- `app.js` allégé (100 → 93 Ko) et plus lisible : il ne contient plus que la logique et le rendu.

## Architecture actuelle des sources
```
src/
├── lib/logic.js          ← fonctions pures testées (dates, XP, calendrier, ICS, planificateur, GLC)
├── lib/exercises-data.js ← données statiques (exercices, programmes)
├── app.js                ← logique applicative + rendu
├── electron-main.cjs     ← process principal (fenêtre, tray, notifs, backups, photos)
├── preload.cjs           ← pont IPC minimal
├── index.html            ← vue unique
└── *.css (15)            ← styles (consolidés boucle #12)
```

## Vérifications
- `node --check` OK sur les deux fichiers modifiés · `npm test` **23/23** · smoke `SMOKE OK` avec `exercises:30` (preuve que la bibliothèque se charge depuis le nouveau fichier).

## Suite proposée
- 3.4 : tests supplémentaires (ex. `todaySummary` si extrait, exerciseRecommendation).
- Vague 4 : **besoin des priorités d'Adrien** (graphiques, PDF hebdo, vue semaine unifiée, thème clair…).

## Git
- Commit : `refactor(data): exercices+programmes extraits vers lib/exercises-data.js (3.1a)`.
