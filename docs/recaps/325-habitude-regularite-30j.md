# #325 — Habitudes : taux de régularité sur 30 jours (1.9.259)

## Pistes écartées d'abord (dites honnêtement)

- **Mesures / sommeil / recomposition** : déjà couverts (`measurementRecentDelta`,
  `weeklySleepStats`, `sleepDebtHours`, `recompositionInsight` — ce dernier bien câblé en app.js).
- **Perf de `render()`** : mesurée sur un état lourd (88 Ko, 180 séances, 200 agenda) = **21 ms**,
  réparti sur ~10 fonctions à 2-3 ms chacune, **aucune ne domine**. Micro-optimiser 20 fonctions
  pour un gain marginal serait risqué → pas forcé, changé de cible.

## Le manque retenu

Les habitudes ont la série actuelle (`habitStreak`, court terme) et la frise 7 jours, mais rien
sur la **régularité long terme** : « laquelle je tiens vraiment sur la durée ? ». La série ne le dit
pas (elle tombe à 0 dès un oubli).

## Ce qui change

Fonction pure `habitConsistency(habit, todayKey, days=30)` → `{ done, scheduled, rate }` : part des
occurrences PRÉVUES (jours matchant les `weekdays`) sur la fenêtre et compte celles tenues. Affiché
en **badge inline** sur chaque ligne d'habitude (à côté de la série), coloré : vert ≥ 80 %, orange
≥ 50 %, rouge en dessous. Intégré au rendu existant plutôt qu'un énième panneau séparé.

## Le piège corrigé grâce à la vérif navigateur

Première version : fenêtre fixe de 30 jours. En navigateur, une habitude **créée aujourd'hui**
affichait « 📊 3 % » (1 jour tenu / 30 comptés) — décourageant et faux : on comptait des jours
AVANT l'existence de l'habitude.

**Correction** : la fenêtre est bornée à la **1re date loggée** — c'est « la régularité DEPUIS que
tu as commencé », plafonnée à 30 jours. Plus un seuil d'affichage `scheduled ≥ 4` pour ne rien
montrer tant qu'il n'y a pas assez de recul. Résultat vérifié :

| Habitude | Badge |
|---|---|
| Lecture (établie, 27/30) | ✅ 📊 90 % vert |
| Sport (établi, 10/30) | ✅ 📊 36 % rouge |
| Créée aujourd'hui (1 j) | ✅ pas de badge |
| 3 jours de vie | ✅ pas de badge |

Sans la vérification navigateur, je livrais un « 3 % » démoralisant sur chaque habitude naissante.

## Tests

352 tests `node:test` (+ `habitConsistency` : bornage à la 1re date, jours rares, habitude neuve
→ 100 % sur 1 j, sans historique → null, date invalide) + smoke `habitConsistency` **bloquant**.

## Rotation

#325 — rotation 29 (build 1.9.259). Prochain #326, clôture au #327 (tag v1.9.261).
