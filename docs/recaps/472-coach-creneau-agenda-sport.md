# #472 — Coaching : le coach cale ta séance de sport dans un créneau libre de l'agenda (2.0.103)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

En #471, le coach « Le focus du moment » a appris à dire **quand** caler un bloc — mais seulement
pour le pilier **focus**. Quand il pousse l'**entraînement**, il restait au « quoi » : « Ton
entraînement s'essouffle… programme une séance courte aujourd'hui. » Une bonne intention flottante,
alors que l'app connaît déjà l'agenda du jour (`state.agenda`, RDV horaires) et possède
`nextFreeSlot`. La toute première piste listée à la fin de #471 était justement : « proposer un
créneau agenda aussi pour la séance de sport ».

## L'amélioration

Nouveau champ pur `sportSlot` dans `adaptiveCoachFocus`, exact pendant de `focusSlot`. Quand le
pilier poussé est le **sport**, que l'heure du jour est connue (`opts.nowMinutes`, déjà passé par le
rendu depuis #471) et que l'agenda du jour est **structuré** (≥ 1 RDV horaire réel), le coach cherche
via `nextFreeSlot` le prochain **créneau libre** assez long pour la séance et le **cite** dans
l'action :

- « Ton entraînement s'essouffle… **Créneau libre à 17:30 aujourd'hui — cale ta séance là.** »

La durée du bloc n'est pas arbitraire : c'est la **médiane** des durées de séance réelles d'Adrien
sur 14 j (`workout.duration`), arrondie à 5 min, bornée [20, 90] — sa séance type. Repli propre sur
**45 min** si moins de 3 séances chiffrées. Le coach contourne les rendez-vous (09:15 en plein
RDV 09:00-10:00 → 10:00), exactement comme pour le focus.

### Garde-fous

- **Un vrai planning horaire du jour requis** (≥ 1 item daté du jour, horaire, non journée-entière,
  non terminé) — sinon le « créneau » serait « maintenant », trivial.
- **Pas un jour de récup** : si la readiness du jour est **< 50**, l'action dit déjà « repose,
  mobilité » (bloc readiness, #467) — y coller un créneau de séance la contredirait → `sportSlot`
  reste `null`.
- **Pas quand la séance est déjà faite** (`doneToday`, #469) : le coach crédite, il ne planifie pas.
- **Heure inconnue** (appel legacy 2 arguments) → `sportSlot` `null`, action **inchangée**
  (rétrocompat totale).
- **Bloc qui ne rentre plus avant 22:00** → `nextFreeSlot` renvoie `null`, pas de suggestion
  mensongère.
- Additif pur : nouveau champ `sportSlot` (`HH:MM` ou `null`), aucun retrait. La micro-marche (#465)
  et le renfort (#466), plus bas, écrasent l'action — donc le créneau — quand on abaisse la barre ou
  qu'on félicite le suivi ; c'est voulu (rien à caler dans ces cas).

## Logique / tests

- `src/lib/logic.js` — bloc `sportSlot` (`nextFreeSlot` sur l'agenda du jour, durée = médiane des
  séances 14 j, défaut 45) placé après le calcul `doneToday` dans le pilier sport ; champ `sportSlot`
  au retour. CHANGELOG[0] 2.0.103.
- Aucun changement `src/app.js` : `renderCoachFocus` passe déjà `{ nowMinutes }` (depuis #471) — la
  séance en bénéficie automatiquement.
- `src/test/logic.test.js` — nouveau test « cale la séance de sport dans un créneau libre de
  l'agenda » : créneau avant le premier RDV (08:00), contournement d'un RDV en cours (→10:00), appel
  2 args → null, agenda vide → null, jour de récup (readiness < 50) → null, séance déjà faite → null,
  autre pilier (focus) → null. Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (créneau séance 10:00 cité +
  repli null sans nowMinutes) ; assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **460 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.103**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en
cours). Focus **et** sport disent désormais « quand » : les deux piliers d'action du coach croisent la
vraie journée d'Adrien. Prochaines pistes possibles : crédit multi-piliers (« 3/4 de tes piliers
cochés aujourd'hui ») ; prioriser explicitement le pilier N°1 du jour quand plusieurs décrochent ;
proposer un créneau du soir pour le coucher-cible quand le sommeil est le focus.

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/472-coach-creneau-agenda-sport.md`.
