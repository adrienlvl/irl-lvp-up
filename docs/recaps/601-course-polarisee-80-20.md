# 601 — Courses générées polarisées 80/20 (intensité par séance) (2.0.217)

> Série coaching poussé à fond, running. Enchaîne directement sur #600 (distance).

## Ce qui change (`buildTrainingWeek`)

Les courses générées ne sont plus toutes « faciles » indifférenciées : elles sont **polarisées**
(modèle 80/20 des coureurs d'élite, **Seiler**) :

- La grande majorité restent en **endurance FACILE** — « zone 2, tu peux tenir une conversation » :
  c'est là que se construit l'endurance sans épuisement ni blessure.
- **Dès 3 courses/semaine**, exactement **une** devient une **séance qualité (tempo/seuil)** — la seule
  séance dure — placée au milieu (jamais collée à la sortie longue).
- La **sortie longue** reste en aisance (durée > vitesse).

Chaque course porte désormais `intensity` (`easy` / `quality` / `long`) et un **conseil d'allure**
(`note`) affiché sur la carte. Exemples d'intensité : n=2 → `[easy, long]` ; n=3 →
`[easy, quality, long]` ; n=4 → `[easy, quality, easy, long]`.

## Vérifs

- **547 tests** + smoke verts. Test intensité (polarisation par nombre de courses, séance qualité
  nommée, note zone 2 sur les faciles, pas de séance dure à 2 courses). Rendu : `renderWeekProgram`
  affiche `d.note` (conseil d'allure) au lieu du texte figé.

## Suite série coaching

Restent : VO2max/fractionné détaillé, affûtage (taper) avant une course, volume/deload muscu (MEV→MRV),
et un éventuel coach trail spécifique (dénivelé). Le socle running (distance + intensité polarisée) est
maintenant posé.

## Fichiers

- `src/lib/logic.js` — `buildTrainingWeek` (intensité polarisée + note par course) + CHANGELOG 2.0.217.
- `src/app.js` — `renderWeekProgram` affiche `d.note`.
- `src/test/logic.test.js` — test polarisation.

Domaine : athlete
