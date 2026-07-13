# Boucle #231 (autonome) — 5ᵉ rotation #4 : plateau réel dans la reco de bloc · build 1.9.165

**5ᵉ rotation, #4 (coaching périodisé) — dernière de la rotation.** La reco de fin de bloc câblait `plateau: false` en dur : le conseil « change une variable » ne se déclenchait jamais. Il s'appuie maintenant sur un **vrai plateau de force** détecté sur tes séances.

## Livré

- **Détection de plateau réelle** en fin de bloc : `strengthPlateauAny` parcourt les exercices-clés chargés (les plus suivis d'abord), calcule leur série de 1RM estimés et cherche un plateau (`strengthPlateau`).
- Le résultat alimente `nextBlockAdvice` → le conseil **« 🔁 change une variable »** se déclenche désormais quand ta force stagne réellement.
- Quand ce conseil s'affiche, il **nomme l'exercice** qui stagne (« ex. Squat stagne »).
- Priorité inchangée : régularité (adhérence) et charge passent avant le plateau ; la mention n'apparaît que sur le conseil « vary ».

## Détail technique

- **`lib/logic.js`** : `strengthPlateauAny(workouts, {window, limit})` → `{ plateau, exercise, best }`. Réutilise `loggedExerciseNames` + `estimatedOneRmSeries` + `strengthPlateau`. Ignore les exercices sans charge. Pur + testé. Export ajouté.
- **`app.js`** : `renderBlockStatus` calcule le plateau réel et le passe à `nextBlockAdvice` (fin du `plateau:false`), + note de l'exercice sur le conseil « vary ».

## Vérifs

- `npm run verify` → **263 tests / 263 pass** (+1 `strengthPlateauAny`), garde-fou CSS vert, **SMOKE OK** (`blockPlateau:true`).
- **Navigateur** (bloc terminé + Squat qui stagne) : `strengthPlateauAny` renvoie `{plateau:true, exercise:'Squat', best:116.5}` et la carte le reflète ; note réservée au conseil « vary » (priorité adhérence respectée). ✓
- `npm run dist` → **Setup 1.9.165.exe** (app d'Adrien jamais fermée).

## 🏁 Rotation 5 COMPLÈTE

#1 partage natif (#228) · #2 onboarding moment préféré (#229) · #3 streak bien-être (#230) · #4 plateau réel dans la reco de bloc (#231). → Point à Adrien, boucle stoppée.
