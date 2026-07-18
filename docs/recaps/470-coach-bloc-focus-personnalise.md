# #470 — Coaching : la longueur de bloc focus se cale sur ta durée réelle (2.0.101)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

Depuis #468, quand le coach « Le focus du moment » pousse la concentration, il nomme la **tâche
phare** réelle d'Adrien — mais la **longueur du bloc** suggéré restait un « **25 min** » codé en
dur, identique pour tout le monde :

- « Reprends « Compta », ton chantier de focus phare — un bloc de **25 min** suffit à relancer. »
- « Ta concentration va surtout à « Thèse » — enchaîne un bloc de **25 min** dessus aujourd'hui. »

Or l'app connaît la durée de **chaque** session de focus (`focusSessions[].minutes`). Si Adrien
travaille d'habitude par blocs de 50 min, lui proposer 25 min sonne dérisoire ; s'il fait des
sprints de 15 min, 25 min peut sembler infaisable. Le coach jetait cette information : le seul
pilier encore chiffré par un nombre **générique** plutôt que **personnel**.

## L'amélioration

Nouveau champ pur `focusBlockMin` dans `adaptiveCoachFocus`. Quand le pilier choisi est le
**focus**, on calcule la **médiane** des durées de session réelles sur **14 j** (même fenêtre que la
dynamique et que la tâche phare), robuste aux extrêmes d'une session marathon ou d'un bloc avorté :

- arrondie à **5 min** (un repère rond, pas « 47 min »),
- bornée à **[10, 60]** (ni micro-bloc, ni séance-fleuve),
- **≥ 3 sessions** requises pour un signal stable ; sinon `null` → repli sur le repère 25 min.

Le coach cite alors **sa durée habituelle** dans l'action :

| Cas | Action |
|---|---|
| tâche phare + rebuild | « Reprends « Compta »… — un bloc de **45 min (ta durée habituelle)** suffit à relancer. » |
| tâche phare + reinforce | « …enchaîne un bloc de **45 min (ta durée habituelle)** dessus aujourd'hui. » |
| pas de tâche nommée + rebuild/revive | « Lance une session de focus de **45 min (ta durée habituelle)** maintenant. » |

Un bloc taillé pour Adrien est plus crédible et plus facile à démarrer qu'un chiffre passe-partout.

### Garde-fous

- **≥ 3 sessions sur 14 j uniquement.** En deçà, la médiane n'est pas fiable → `focusBlockMin`
  vaut `null` et le message garde le repère « 25 min », sans la mention « ta durée habituelle ».
- **Fenêtre = 14 j**, cohérente avec la tâche phare (#468) et la dynamique.
- **Hors pilier focus** → `focusBlockMin` toujours `null` (aucun parasite sur sport/sommeil/nutrition).
- **Le crédit du jour (#469), la micro-marche (#465) et le renfort (#466) gardent la priorité** :
  leur override d'action s'exécute après ce bloc (ils portent sur le *suivi*/le *déjà-fait*, pas sur
  le *contenu*). Additif pur : nouveau champ `focusBlockMin` (nombre ou `null`), aucun retrait.

## Logique / tests

- `src/lib/logic.js` — bloc `focusBlockMin` (médiane bornée) dans `adaptiveCoachFocus`, injecté dans
  les trois formulations d'action focus (tâche phare rebuild/reinforce + générique rebuild/revive) ;
  champ `focusBlockMin` au retour. CHANGELOG[0] 2.0.101.
- `src/test/logic.test.js` — nouveau test « la longueur de bloc focus se cale sur la durée médiane
  réelle » : médiane 50 citée dans l'action, borne haute 60 (durées ~64), borne basse 10 (durées ~7),
  moins de 3 sessions → `focusBlockMin === null` + repli 25 min sans « durée habituelle ». Test #468
  voisin recalé : sans tâche nommée mais historique suffisant, le bloc générique devient personnalisé
  (30 min). Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (durée personnalisée 30 min
  citée + repli 25 min à court d'historique) ; assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **458 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.101**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en
cours). Le coach cesse d'imposer un « 25 min » universel : il propose la durée de bloc qui ressemble
vraiment à Adrien. Prochaines pistes possibles : croiser focus × agenda pour proposer un créneau
libre concret pour le bloc ; crédit multi-piliers (« tu as coché 3/4 de tes piliers aujourd'hui »).

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/470-coach-bloc-focus-personnalise.md`.
</content>
</invoke>
