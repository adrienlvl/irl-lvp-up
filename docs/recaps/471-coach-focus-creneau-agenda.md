# #471 — Coaching : le coach cale ton bloc de focus dans un créneau libre de l'agenda (2.0.102)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

Depuis #468→#470, quand le coach « Le focus du moment » pousse la concentration, il nomme la
**tâche phare** réelle et cale la **durée du bloc** sur la médiane des sessions d'Adrien. Il disait
donc **quoi** (« reprends « Compta » ») et **combien** (« un bloc de 45 min ») — mais jamais
**quand**. L'action restait une bonne intention flottante :

- « Reprends « Compta », ton chantier de focus phare — un bloc de 45 min suffit à relancer. »

Or l'app connaît l'**agenda du jour** (`state.agenda`, RDV horaires) et possède déjà
`nextFreeSlot`, qui trouve le prochain trou assez long en contournant les blocs occupés. Le coach
jetait cette information : il ne proposait jamais de **créneau concret** où insérer le bloc, alors
que « quoi faire quand aujourd'hui » est exactement la priorisation actionnable que la demande vise.

## L'amélioration

Nouveau champ pur `focusSlot` dans `adaptiveCoachFocus`, et un paramètre optionnel `opts.nowMinutes`
(minutes écoulées dans la journée, passé par le rendu). Quand le pilier choisi est le **focus**, que
l'heure du jour est connue et que l'agenda contient **au moins un RDV horaire réel** aujourd'hui, on
cherche via `nextFreeSlot` le prochain créneau libre assez long pour le bloc (durée = `focusBlockMin`
ou 25) et on le **cite** dans l'action :

- « …un bloc de 45 min suffit à relancer. **Créneau libre à 14:30 aujourd'hui — cale ton bloc là.** »

Le coach contourne les rendez-vous : à 09:15 en plein RDV 09:00-10:00, il propose **10:00**. Une
bonne intention devient un plan exécutable inséré dans la vraie journée d'Adrien.

### Garde-fous

- **Un vrai planning horaire du jour requis** : au moins un item d'agenda daté du jour, horaire
  (`time` valide), non journée-entière, non terminé. Sur une journée vide, le « créneau » serait
  « maintenant » — trivial, parfois déjà passé ; on ne conseille que quand ça apporte une info.
- **Heure du jour connue uniquement** : sans `opts.nowMinutes` (appel legacy à 2 arguments),
  `focusSlot` reste `null` et l'action est **inchangée** — rétrocompatibilité totale.
- **Bloc qui ne rentre plus avant la fin de journée** (défaut 22:00) → `nextFreeSlot` renvoie `null`,
  donc pas de suggestion mensongère.
- **Hors pilier focus** → `focusSlot` toujours `null` (aucun parasite sur sport/sommeil/nutrition).
- Additif pur : nouveau champ `focusSlot` (chaîne `HH:MM` ou `null`) + `opts.nowMinutes` optionnel,
  aucun retrait. Le crédit du jour (#469), la micro-marche (#465) et le renfort (#466) gardent la
  priorité : leur override d'action s'exécute après ce bloc.

## Logique / tests

- `src/lib/logic.js` — signature `adaptiveCoachFocus(state, todayKey, opts)` ; bloc `focusSlot`
  (`nextFreeSlot` sur l'agenda du jour) dans le bloc focus, injecté dans l'action ; champ `focusSlot`
  au retour. CHANGELOG[0] 2.0.102.
- `src/app.js` — `renderCoachFocus` passe `{ nowMinutes }` (heure locale) à `adaptiveCoachFocus`.
- `src/test/logic.test.js` — nouveau test « le coach cale le bloc focus dans un créneau libre de
  l'agenda du jour » : créneau avant le premier RDV (08:30), contournement d'un RDV en cours (→10:00),
  appel 2 args → `focusSlot` null, agenda vide → null, trop tard (21:50) → null, autre pilier → null.
  Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (créneau 10:00 cité + repli null
  sans nowMinutes) ; assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **459 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.102**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en
cours). Le coach passe du « quoi/combien » au « quand » : il croise enfin le focus avec la vraie
journée d'Adrien. Prochaines pistes possibles : crédit multi-piliers (« 3/4 de tes piliers cochés
aujourd'hui ») ; proposer un créneau agenda aussi pour la séance de sport ; prioriser explicitement
le pilier N°1 du jour quand plusieurs décrochent.

## Fichiers

`src/lib/logic.js`, `src/app.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`,
`src/package.json`, `docs/ROADMAP.md`, `docs/recaps/471-coach-focus-creneau-agenda.md`.
