# #475 — Coaching : le coach SALUE tes journées multi-piliers (2.0.106)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

Depuis #473/#474, `adaptiveCoachFocus` sait rendre lisible ce qui **décroche** : il NOMME les autres
piliers qui faiblissent cette semaine et dit par quoi commencer (`alsoSlipping` /
`alsoSlippingPillars`). Mais le coach n'avait qu'un **registre négatif** : il pointait les
faiblesses, jamais il ne saluait une journée bien remplie. Or les trois derniers recaps (#472, #473,
#474) listaient tous, en tête des prochaines pistes, le **crédit multi-piliers** (« 3/4 de tes
piliers cochés aujourd'hui ») — le pendant *positif* de la priorisation. L'app est gamifiée ;
reconnaître explicitement une journée complète motive autant que pointer un creux, et rend
l'agentivité à Adrien.

## L'amélioration

Nouveau champ pur `pillarsToday` (0-4) : le **nombre de piliers** (sport, focus, sommeil, nutrition)
ayant une entrée **active datée du jour** (mêmes prédicats d'activité que les piliers). Quand le
contexte est **positif** — le geste du pilier poussé est déjà posé (`doneToday`) **OU** le coach
renforce un bon élan (`tone === 'reinforce'`) — et qu'`pillarsToday >= 2`, une note de crédit est
ajoutée à l'insight :

- 3-4 piliers : « … **3/4 de tes piliers déjà cochés aujourd'hui — belle journée complète. 🎯** »
- 2 piliers : « … **2/4 de tes piliers déjà cochés aujourd'hui — bonne lancée.** »

Le coach gagne un registre positif : il nomme ce qui **tient**, pas seulement ce qui flanche.

### Garde-fous

- **Uniquement en contexte positif** (`doneToday || reinforce`) : en pleine correction
  (rebuild/revive sans geste du jour), empiler un « bravo » brouillerait l'alerte « celui-ci
  d'abord ».
- **Disjoint d'`alsoSlipping` par construction** : `alsoSlipping` n'existe qu'en rebuild/revive +
  `!doneToday` ; ce crédit n'existe qu'en `doneToday` OU `reinforce`. Jamais les deux notes le même
  jour — les registres correction/célébration ne se télescopent pas.
- **Seuil ≥ 2 piliers** : « cochés aujourd'hui » doit traduire une vraie dynamique du jour, pas un
  pilier isolé (qui est déjà, à lui seul, le sujet du conseil).
- **Additif pur** : nouveau champ `pillarsToday` **toujours** renvoyé (informatif) ; la note
  n'enrichit l'insight qu'en contexte positif, aucune branche existante touchée.

## Logique / tests

- `src/lib/logic.js` — calcul `pillarsToday` (filtre `cands` sur entrée active du jour) + note
  singulier-seuil/pluriel injectée dans l'insight, placé avant le `if (rotated)` ; champ
  `pillarsToday` au retour. CHANGELOG[0] 2.0.106.
- Aucun changement `src/app.js` : `renderCoachFocus` affiche l'insight tel quel.
- `src/test/logic.test.js` — nouveau test « crédite une journée multi-piliers » : 3/4 en doneToday
  (note « belle journée complète » + crédit du geste préservé) ; 1/4 → pas de note ; 2/4 → « bonne
  lancée » ; reinforce **sans** doneToday (focus + nutrition du jour) → 2/4 ; contexte rebuild sans
  geste du jour → aucune note malgré un autre pilier coché. Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (3/4 doneToday → note + repli
  `pillarsToday` 1 sans note sur `fDone`) ; assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **462 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.106**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en
cours). Le coach dispose enfin des deux registres : il nomme ce qui décroche (priorisation) ET salue
ce qui tient (crédit multi-piliers). Prochaines pistes possibles : moduler le verbe/ton d'`alsoSlipping`
selon la gravité (dormant vs simple creux) ; proposer un créneau du soir pour protéger la fenêtre de
coucher-cible quand le sommeil est le focus ; célébrer une **série** de journées complètes (4/4
plusieurs jours de suite).

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/475-coach-credit-multi-piliers.md`.
