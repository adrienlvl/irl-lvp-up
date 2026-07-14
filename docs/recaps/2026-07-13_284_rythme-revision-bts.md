# Boucle #284 (autonome) — 19ᵉ rotation #1 (liberté totale) : rythme de révision BTS · build 1.9.218

**19ᵉ rotation — liberté totale.** Après 18 rotations sur les 4 caps, je passe à la meilleure valeur sur tout domaine. Ici : le **planning de révision BTS**. Le compte à rebours + « X/Y révisions faites » existaient, mais rien ne disait **si Adrien tient le rythme**. Ajout d'un indicateur de cadence conseillée vers l'examen.

## Livré

- **Bannière « 🎯 N révisions en J-X → vise ~M/semaine · {rythme} »** sous la progression de révision.
- Statut : rythme tranquille 😌 (≤2/sem) · bon rythme 👍 (≤4/sem) · resserre le rythme ⚠️ (>4/sem) · 🎉 tout est fait.
- Couleur de bord adaptée (bleu / ambre si serré / accent si terminé).

## Détail technique

- **`lib/logic.js`** : `studyPacing(agenda, examGoal, todayKey)` → `{ remaining, daysLeft, perWeek, done, total, status }` ; réutilise `examCountdown` + les créneaux `kind:'study'` ; null si pas d'examen à venir ou aucune révision. Pur + testé.
- **`app.js`** : `renderExamCountdown` affiche la bannière `#studyPacing` (tone sp-ahead/onTrack/tight/done).
- **`index.html`** : `#studyPacing`. **`extras.css`** : `.study-pacing`.
- **CHANGELOG** complété (v1.9.218).

## Vérifs

- `npm run verify` → **305 tests / 305 pass** (+ test `studyPacing`), garde-fou CSS vert, **SMOKE OK** (`studyPacing`).
- **Navigateur** : 3 révisions à J-28 → « ~1/semaine · rythme tranquille 😌 » (sp-ahead) ; 15 révisions à J-14 → « ~8/semaine · resserre le rythme ⚠️ » (sp-tight). ✓
- `npm run dist` → **Setup 1.9.218.exe** (app d'Adrien jamais fermée).

## Suite (rotation 19)

#1 ✅ (#284). Liberté totale : je continue sur d'autres domaines à forte valeur. Fin de « rotation » (4 items) = tag + auto-publish. Boucle autonome continue.
