# Boucle #251 (autonome) — 10ᵉ rotation #4 : partage de la progression de bloc · build 1.9.185

**10ᵉ rotation, #4 (coaching périodisé) — dernière de la rotation.** La comparaison de blocs (tonnage + force par exercice) était affichée mais pas partageable. Ajout du **partage Web Share** de la progression.

## Livré

- **Bouton « 📤 Partager ma progression »** sur la carte de comparaison de blocs (dès 2 blocs terminés).
  - Génère un texte : tendance, tonnage/sem., séances/sem., 1ᵉʳ vs dernier bloc, + top 3 exercices en 1RM estimé.
  - Mobile → `navigator.share` (feuille OS) ; sinon → repli presse-papier.

## Détail technique

- **`lib/logic.js`** : `blockProgressText(history, workouts)` (texte réutilisant `blockComparison` + `blockExerciseProgress`) + `shareableBlockProgress(history, workouts)` → `{ title, text }` ou null. Purs + testés.
- **`app.js`** : bouton `#blockShareBtn` dans `#blockCompare` + handler (share natif → repli copie).
- **`strength.css`** : `.bc-share`.

## Vérifs

- `npm run verify` → **281 tests / 281 pass** (+1 `blockProgressText`/`shareableBlockProgress`), garde-fou CSS vert, **SMOKE OK** (`blockShare:true`).
- **Navigateur** (2 blocs, Squat 60→75) : clic → `navigator.share({title:"💪 Ma progression sur mes blocs", text:"📈 …2 blocs · Tonnage/sem. +25% · …"})`. ✓
- `npm run dist` → **Setup 1.9.185.exe** (app d'Adrien jamais fermée).

## 🏁 Rotation 10 COMPLÈTE

#1 partage bilan hebdo (#248) · #2 brouillon onboarding (#249) · #3 rappel inactivité (#250) · #4 partage progression de bloc (#251). → **Première publication (option B) déclenchée par Adrien** ; rotation 11 ensuite.
