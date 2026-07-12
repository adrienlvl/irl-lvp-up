# Boucle #201 (autonome) — Prévision d'atteinte du prochain palier de force · build 1.9.135

**Amélioration de fond (progression).** Le panneau progression détectait déjà les **plateaux** (#191), mais quand tu progresses, rien ne te projetait vers le prochain cap. Le pendant motivant manquait.

## Livré — ligne de prévision dans le panneau progression

Quand tu **progresses** (pas de plateau), une ligne verte estime ton prochain palier rond de 1RM :

> 🔮 À ce rythme (+2,5 kg/sem) : **100 kg** estimés dans ~1 sem. (vers le 06/07)

- Basée sur la **tendance récente** de ton 1RM estimé (gain/semaine, régression linéaire simple).
- Vise le **prochain palier rond** (multiples de 5 kg).
- Ne s'affiche **pas** en cas de plateau (c'est le conseil de déblocage qui prime) ni si la progression est nulle/négative.

## Détail technique

- **`lib/logic.js`** : `strengthForecast(series, step, todayKey)` → `{current, milestone, gap, perWeek, weeks, date}` ou `null` ; réutilise `nextStrengthMilestone` + `dateAfterWeeks`. Pur + testé.
- **`app.js`** : `renderExerciseProgression` calcule `strengthForecast(rmSeries, 5, …)` (si pas de plateau) et affiche `.prog-forecast`. **`athlete.css`** : styles `.prog-forecast`.

## Vérifs

- `npm run verify` → **235 tests / 235 pass** (+1 : `strengthForecast`), garde-fou CSS vert, **SMOKE OK** (`strengthForecast:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.135.exe** (app d'Adrien jamais fermée).

## Suite (améliorations de fond)

L'app est très complète : de plus en plus de zones sont déjà couvertes. Prochaines pistes réellement neuves à évaluer avant de coder.
