# Boucle #210 (autonome) — #4 Coaching périodisé : « Mon bloc en cours » · build 1.9.144

**Cap #4 — coaching périodisé (début).** Le programme par objectif intègre déjà une progression 4 semaines (Base→Volume→Intensité→Décharge), mais rien ne montrait **où tu en es** dans le cycle ni quand tombe la décharge.

## Livré — carte « Mon bloc »

Quand un programme a été programmé, une carte en tête du panneau objectif affiche :

- **Semaine X/4** + la **phase en cours** (badge : Base / Volume / Intensité / Décharge, bleu en décharge) ;
- une **frise de 4 points** (passées / en cours / décharge) ;
- la **note de la phase** + **« décharge dans N semaines »** (ou « semaine de décharge 🧊 ») ;
- en fin de cycle : **« 🏁 Bloc terminé — génère un nouveau bloc »**.

La date de début du bloc est mémorisée (`state.blockStart`) quand tu programmes la semaine (via l'objectif ou l'onboarding).

## Détail technique

- **`lib/logic.js`** : `currentBlock(blockStartKey, todayKey)` → `{week, phase, weeksTotal, done, daysIntoWeek, deloadInWeeks}` (réutilise `blockPhase`). Null avant le début. Pur + testé.
- **`app.js`** : `scheduleObjectiveProgram` enregistre `state.blockStart` ; `renderBlockStatus()` (appelée dans `render()` et après programmation) rend `#blockStatus`. `blockStart` ajouté aux defaults.
- **`index.html`** : `#blockStatus` dans le panneau objectif. **`strength.css`** : `.block-status` + frise `.bs-*`.

## Vérifs

- `npm run verify` → **244 tests / 244 pass** (+1 : `currentBlock`), garde-fou CSS vert, **SMOKE OK** (`currentBlock:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.144.exe** (app d'Adrien jamais fermée).

## Suite #4

Auto-ajustement du prochain bloc selon les résultats (plateau → conseil, adhérence faible → alléger, bonne forme → pousser) en s'appuyant sur `strengthPlateau`/`loadAdvice`/`weeklyInsights` ; rappel « nouveau bloc » en fin de cycle.
