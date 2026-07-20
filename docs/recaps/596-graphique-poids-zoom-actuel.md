# 596 — Graphique du poids : zoom sur « où tu es maintenant » (2.0.212)

> Demande directe d'Adrien : « t'as ajouté le fait qu'on puisse zoomer sur le point où on est
> actuellement ? ça serait bien. » Non, pas encore — fait ici.

## Le problème restant après #594

#594 avait calé l'échelle **verticale** sur le poids réel, mais l'axe du **temps** s'étirait encore
jusqu'à la cible (parfois lointaine) → tes pesées récentes restaient tassées dans le coin gauche,
« où tu es » petit.

## Ce qui change

- **Zoom temporel** (`weightForecastModel`, nouvelle option `windowWeeks`, activée à **9** dans le
  coach) : l'axe X est borné à une **fenêtre autour d'aujourd'hui** (± windowWeeks), donc
  « aujourd'hui » tombe **au centre** (`todayX ≈ 50`), le passé récent et la trajectoire proche
  remplissent le cadre, le lointain est rogné (`overflow:hidden`). L'échelle Y se cale sur le réel
  **visible dans la fenêtre**.
- **Point courant mis en avant** : le modèle expose `current` (ta dernière pesée = « où tu es
  maintenant »). Le rendu le marque net — un **point qui pulse** (`.cw-now`) + une **étiquette
  proéminente** « 📍 ton poids · aujourd'hui » (`.cw-now-chip`), respectant `prefers-reduced-motion`.

## Bonus : un check smoke qui avait silencieusement pourri

En vérifiant, le check `coachWeight` était passé à **`false`** — il gardait les anciennes valeurs
d'`energyPlan` (`weeks 17`, date `2026-11-08`) alors que #595 les a changées (15, `2026-10-25`), et il
était **non-bloquant** → le smoke restait vert. Corrigé (nouvelles valeurs + `proteinG` 192) **et rendu
BLOQUANT** pour qu'il ne puisse plus rôtir sans alerte. _Leçon : un check non-bloquant peut mentir ;
les checks de valeurs métier méritent d'être bloquants._

## Vérifs

- **543 tests** + smoke verts. Test `weightForecastModel` étendu (zoom : `todayX` centré, plan rogné,
  `current` = dernière pesée avec et sans zoom). Check smoke `coachWeight` **désormais bloquant**.
- **Navigateur (DOM)** : marqueur « 📍 83,2 kg · aujourd'hui » **centré à 50 %**, repère « auj. » à
  50 %, axe kg lisible, plan zoomé (10 pts au lieu de 16). _(Le screenshot a timeout sur l'animation —
  le rendu réel est bon, confirmé par le smoke Electron + l'inspection DOM.)_

## Fichiers

- `src/lib/logic.js` — `weightForecastModel` (windowing + `current`) + CHANGELOG 2.0.212.
- `src/app.js` — `coachForecastSvg` (zoom activé + marqueur point courant).
- `src/athlete.css` — `.cw-now` (anneau pulsant), `.cw-now-chip`, reduced-motion.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs` — test zoom + `coachWeight` corrigé/bloquant.

Domaine : mesures
