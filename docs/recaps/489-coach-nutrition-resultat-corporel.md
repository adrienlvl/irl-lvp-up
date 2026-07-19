# 489 — Coaching : le coach relie la nutrition au résultat corporel réel (poids)

**Build 2.0.120 · boucle #489 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`) était devenu très fin sur les **séries**
(en jeu, palier, record, rompue…), mais le pilier **nutrition** restait cloisonné à sa propre
mécanique : cible protéines du jour, collation pour combler l'écart, série protéines. Il parlait
**intrant** (« mange tes protéines ») sans jamais nommer l'**extrant** — le corps qui change, qui
est le *pourquoi* de toute la discipline nutritionnelle d'Adrien. Or l'objectif de poids
(`goals.targetWeight`) et sa progression réelle sont déjà saisis et déjà exploités ailleurs (plan
« Coach & poids » via `weightGoalProgress`) — le coach du focus les ignorait.

## Ce qui est livré

Quand le pilier poussé est **nutrition** et qu'un objectif de poids est fixé avec au moins une pesée
exploitable, le coach cite désormais la **progression réelle vers la cible** (`weightGoalProgress`)
dans son insight — « adaptation aux progrès ET aux écarts » en trois registres :

- **bien avancé** (pct ≥ 50) → il **crédite** : « Et ça paie : 62% de ton objectif de perte atteint
  (3,7 kg sur 6) — ta nutrition en est le moteur. »
- **en chemin** (0 < pct < 50) → il **encourage** : « Ton objectif de perte avance (28%…) — chaque
  jour réglé sur ta cible rapproche le résultat. »
- **pas encore de résultat** (pct 0 / une seule pesée) → il **recadre** sans culpabiliser et invite
  à se peser : « Ta cible de perte (6 kg) attend encore un premier résultat — ces jours de nutrition
  régulière sont exactement ce qui la débloque. »

Un « pourquoi » chiffré et personnel motive plus qu'un compteur d'intrant isolé — même esprit que la
preuve d'impact du sommeil (#460).

## Conception

- **Réutilise l'outil déjà branché** ailleurs (`weightGoalProgress`), aucune nouvelle logique de
  calcul ni nouveau champ d'état ; renvoie déjà `null` si départ == cible.
- **Additif pur** : nouveau champ `weightGoalPct` (0-100, ou `null`) TOUJOURS renvoyé ; la note est
  **appendue à l'insight**, l'action (collation/cible protéines) reste **intacte**.
- **Dégrade proprement** (`null`, aucune note) sans objectif de poids ou sans pesée/poids exploitable.
- Le champ `direction` de `weightGoalProgress` (`'perte'` | `'prise'`) sert tel quel dans le libellé.

`adaptiveCoachFocus` pur + testé (nouveau test dédié aux trois registres + cas sans objectif), check
smoke bloquant `coachFocus` étendu. **Verify 100 % vert** (466 tests + smoke) avant commit.
