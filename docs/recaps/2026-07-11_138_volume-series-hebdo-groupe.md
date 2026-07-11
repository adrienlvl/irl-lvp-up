# Boucle #138 (autonome) — Volume de séries hebdo par groupe musculaire · build 1.9.72

**Contexte :** 1ʳᵉ itération du recentrage **Exercices / Athlète** demandé par Adrien. Focus Athlète : piloter le volume d'entraînement.

## Livré

Dans la **revue hebdomadaire** (Athlète → Progrès), sous les zones travaillées, un nouveau bloc **« Séries hebdo par groupe · cible 10–20/sem. »** : une barre par groupe musculaire (abdos, bras, pectoraux, dos, épaules, jambes, fessiers) avec le **nombre de séries réellement effectuées sur 7 jours** et un **repère d'hypertrophie** basé sur les recommandations de volume :

- **< 10 séries** → « à augmenter » (orange)
- **10–20 séries** → « optimal » (vert)
- **> 20 séries** → « volume élevé » (rouge)

Ça transforme le simple comptage d'exercices par zone en un vrai tableau de bord de volume, directement actionnable pour l'objectif prise de muscle (abdos/bras/jambes).

## Détail technique

- `lib/logic.js` :
  - `weeklySetsPerZone(workouts, todayKey)` — pur + testé. Somme les séries par zone sur 7 jours ; prend `completedSets` (séries validées) en priorité, sinon `sets` (prévues) ; gère `exercises[]` et le format top-level `{exercise, sets}`.
  - `setLandmark(sets)` — pur + testé. Renvoie `{label, zone}` (`low`/`ok`/`high`).
- `app.js` : `renderWeeklyReview` remplit `#weeklySets` (barres colorées + verdict par zone, largeur = séries/20).
- `index.html` : `<div id="weeklySets">` dans le panneau revue hebdo.
- `athlete.css` : styles `.weekly-sets` / `.ws-row` / `.ws-bar` (+ variantes low/ok/high), `:empty` masqué.

## Vérifs

- `npm run verify` → **173 tests / 173 pass** (+2 : `weeklySetsPerZone` — somme, completedSets prioritaire, hors-fenêtre, date invalide ; `setLandmark` — bornes 10/20). **SMOKE OK** (`weeklySets:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.72.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
