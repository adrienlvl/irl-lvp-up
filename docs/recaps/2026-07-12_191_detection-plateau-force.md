# Boucle #191 (autonome, phase 2) — Détection de plateau de force · build 1.9.125

**Phase 2 (polissage global — zone progression).** Le panneau progression montrait la tendance du 1RM estimé, mais ne signalait pas activement une **stagnation** — le moment où il faut changer quelque chose.

## Livré

Dans le panneau progression, si le **1RM estimé n'a pas battu de record sur les 3 dernières séances**, un bandeau **« ⚠️ Plateau »** apparaît avec un conseil concret : *« change une variable — +1 répétition, tempo plus lent, ou décharge 1 semaine puis reprends un peu plus lourd »*. Reste silencieux tant que tu progresses.

## Détail technique

- **`lib/logic.js`** : `strengthPlateau(values, window)` — compare le meilleur des `window` dernières valeurs à celui d'avant ; renvoie `{plateau, sessions, best, advice}` si pas de dépassement, sinon `null` (et `null` si historique insuffisant). Pur + testé.
- **`app.js`** : `renderExerciseProgression` alimente `strengthPlateau` avec la série `estimatedOneRmSeries` déjà calculée et affiche `.prog-plateau`. **`athlete.css`** : styles `.prog-plateau` (ambre).

## Vérifs

- `npm run verify` → **229 tests / 229 pass** (+1 : `strengthPlateau`), garde-fou CSS vert, **SMOKE OK** (`strengthPlateau:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.125.exe** (app d'Adrien jamais fermée).

## Suite (phase 2)

Polissage réparti : responsive mobile, séances guidées, autres passes a11y.
