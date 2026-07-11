# Boucle #143 (autonome) — Filtre par matériel (bibliothèque) · build 1.9.77

**Contexte :** 6ᵉ itération du recentrage Exercices / Athlète. Focus **Exercices** : filtrer la bibliothèque selon le matériel dispo.

## Livré

Un nouveau menu déroulant **« 🧰 Tout matériel »** dans les contrôles de la bibliothèque d'exercices. Il liste automatiquement tous les équipements présents dans la base (via le champ `kind` déjà porté par chaque exercice) avec le **nombre d'exercices** pour chacun :

- Poids du corps, Kettlebell, Gilet lesté, Trail…

Adrien peut ainsi n'afficher que **ce qu'il peut réellement faire** avec le matériel sous la main — sans matos, avec sa kettlebell, avec son gilet lesté. Le filtre **se cumule** avec la famille, la zone musculaire, la recherche texte et le filtre « nouveaux ». Zéro tag manuel : l'info existait déjà dans les données.

## Détail technique

- `lib/logic.js` : `equipmentOptions(exercises)` — pur + testé. Renvoie `[{kind, count}]` des `kind` distincts, triés par fréquence puis alphabétique (FR). Ignore les `kind` vides/absents.
- `app.js` : `renderExerciseLibrary` remplit le `<select>` à la volée (une fois) via `equipmentOptions`, et ajoute `equip==='all' || x.kind===equip` au filtre. `onchange` câblé.
- `index.html` : `<select id="exerciseEquipment">` (option « Tout matériel » + options injectées).

## Vérifs

- `npm run verify` → **179 tests / 179 pass** (+1 : `equipmentOptions` — comptage, tri fréquence/alpha, kinds vides ignorés, vide/non-tableau). **SMOKE OK** (`equipmentFilter:true` — le select se peuple, filtrer par le matériel le plus fréquent réduit bien la liste, retour à « all » = 47). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.77.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
