# #469 — Coaching : le coach crédite le geste déjà fait aujourd'hui (2.0.100)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

Depuis #467/#468, les quatre piliers d'`adaptiveCoachFocus` parlent chiffres et concret. Restait
un **bug de crédibilité universel** : le coach pouvait choisir un pilier (sport ou focus) que
**tu as déjà accompli aujourd'hui**, et te lancer quand même un ordre déjà exécuté :

- sport rebuild + séance loggée ce jour → « programme une séance courte aujourd'hui »
- focus reinforce + bloc posé ce jour → « enchaîne un bloc de 25 min dessus aujourd'hui »
- pire : la **micro-marche** (#465) pouvait dire « tu ignores mes caps » un jour où le geste
  était justement là.

Un coach qui te répète de faire ce que tu viens de faire perd toute crédibilité — c'est le
symptôme le plus visible d'un coach qui « ne regarde pas ». Or l'app sait exactement si une
entrée est datée du jour.

## L'amélioration

Nouveau `doneToday` dans `adaptiveCoachFocus`. Quand le pilier choisi a une entrée **active datée
d'aujourd'hui**, l'action « fais X » cède la place à un **crédit** + consolidation légère :

| Pilier | Action créditée |
|---|---|
| **sport** | « Séance déjà faite aujourd'hui 💪 — verrouille avec 5 min d'étirements, le reste c'est de la récup bien méritée. » |
| **focus** | « Bloc de focus déjà posé aujourd'hui ✅ — savoure ; si l'énergie est là, un second bloc te rapproche de l'objectif. » |

L'**insight** (tendance hebdo, vraie) reste intact ; seule l'action, qui donnait un ordre déjà
exécuté, change. `doneToday` est calculé **tôt** pour aussi **couper la micro-marche** : inutile
de gronder un cap « ignoré » le jour où le geste est posé.

### Garde-fous — pourquoi seulement sport et focus

- **SOMMEIL exclu** : une nuit notée = celle d'**hier**. L'action sommeil porte sur le **coucher de
  ce soir** (cible du plan de recalage), encore à faire — la créditer effacerait le conseil utile.
- **NUTRITION exclue** : « actif » y est trop lâche (`protein > 0` ≠ cible atteinte). Son bloc
  enrichi (#464) gère déjà l'état du jour vis-à-vis de la cible protéines + collation.
- **Placement en dernier** : l'override prime sur toutes les actions « fais X » (générique,
  readiness #467, tâche phare #468, renfort #466) — mais laisse insights et champs (`focusTask`,
  `followThrough`, `readiness`) intacts pour l'affichage.
- Additif pur : nouveau champ `doneToday` (booléen) dans le retour, aucun retrait.

## Logique / tests

- `src/lib/logic.js` — bloc `doneToday` dans `adaptiveCoachFocus` (calcul tôt + override final +
  garde `!doneToday` sur la micro-marche), CHANGELOG[0] 2.0.100.
- `src/test/logic.test.js` — nouveau test « crédite le geste déjà fait aujourd'hui (sport/focus),
  pas sommeil/nutrition » : sport déjà fait → crédit + insight hebdo préservé ; focus déjà posé →
  crédit + `focusTask` conservé ; micro-marche coupée un jour où le geste est là ; sans entrée du
  jour → pas de crédit ; sommeil/nutrition → `doneToday` toujours `false`. Deux tests voisins
  (#468 tâche phare, #466 suivi) recalés sur « hier » pour isoler leur phrasé du crédit du jour.
  Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (crédit sport du jour +
  micro-marche coupée + sommeil exclu) ; assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **457 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.100**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en
cours). Le coach cesse enfin de radoter un ordre déjà exécuté — un défaut de crédibilité qui minait
tout le reste du coaching personnalisé. Prochaines pistes possibles : moduler la longueur de bloc
focus suggérée selon la durée médiane réelle des sessions d'Adrien ; croiser focus × agenda pour
proposer un créneau libre concret ; crédit multi-piliers (« tu as coché 3/4 de tes piliers
aujourd'hui »).

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/469-coach-credite-geste-du-jour.md`.
