# #468 — Coaching : le focus du coach nomme ta tâche phare réelle (2.0.99)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

`adaptiveCoachFocus` enrichit désormais trois de ses quatre piliers avec les vraies données
d'Adrien : le **sport** lit la readiness du jour (#467), le **sommeil** le verdict chiffré +
la cible de recalage (#459→461), la **nutrition** la cible protéines réelle + une collation
concrète (#464). Restait un trou explicitement pointé par les recaps #465 **et** #466 comme
« prochaine piste » : le pilier **focus** était **le seul encore générique**.

Quand la concentration décrochait ou montait, l'action du coach restait aveugle :

- rebuild/revive → « Lance une session de focus de 25 min maintenant. »
- reinforce → « Encore un jour actif aujourd'hui pour ancrer l'habitude. »

Or l'app capture déjà, à chaque bloc de focus, la **tâche** travaillée (`focusSessions[].task`),
et `focusByTask` sait en tirer la répartition du temps par tâche. Le coach jetait cette
information : il pouvait dire « lance une session » sans jamais dire **sur quoi**, alors qu'Adrien
a des chantiers de fond identifiables (compta, thèse, révisions…).

## L'amélioration

Nouveau bloc pur dans `adaptiveCoachFocus`, calqué sur la nutrition (`proteinSnackSuggestion`).
Quand le pilier choisi est le **focus**, on lit `focusByTask(s.focusSessions, todayKey, {days: 14})`
— même fenêtre de 14 j que la dynamique — et on prend la **tâche phare nommée** (top hors
« Sans titre »). Le coach la **cite** dans son action :

| Ton | Action |
|---|---|
| **rebuild / revive** | « Reprends « Compta », ton chantier de focus phare (115 min sur 14 j) — un bloc de 25 min suffit à relancer. » |
| **reinforce** | « Ta concentration va surtout à « Thèse » (120 min sur 14 j) — enchaîne un bloc de 25 min dessus aujourd'hui. » |

Reprendre un chantier connu coûte moins que repartir de zéro, et nommer la tâche prouve que le
coach lit vraiment les données. L'insight garde le compteur d'objectif hebdo (bloc objectifs, plus
haut) — comme la nutrition : l'insight parle chiffres, l'action nomme le concret.

### Garde-fous

- **Tâche NOMMÉE uniquement.** Que du « Sans titre » (ou aucune session sur 14 j) → on retombe
  proprement sur l'action générique et `focusTask` vaut `null`.
- **Le micro-pas (#465) et le renfort (#466) gardent la priorité** : leur bloc s'exécute après
  celui-ci et peut reprendre la main (signaux de *suivi*, pas de *contenu*). Cohérent avec la
  readiness sport.
- Additif pur : nouveau champ `focusTask` (chaîne ou `null`) dans le retour, aucun retrait.

## Logique / tests

- `src/lib/logic.js` — bloc focus dans `adaptiveCoachFocus` (champ `focusTask`), CHANGELOG[0] 2.0.99.
- `src/test/logic.test.js` — nouveau test « focus enrichi — l'action nomme la tâche phare réelle » :
  décrochage (Reprends « Compta » + 115 min), hausse (Ta concentration va surtout à « Thèse »),
  que du « Sans titre » (→ générique, `focusTask === null`), autre pilier (→ `focusTask === null`).
  Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (tâche phare « Compta » citée) ;
  assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **456 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.99**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en
cours). Les **quatre** piliers du coach parlent désormais chiffres et concret : sport (readiness),
sommeil (verdict + cible), nutrition (protéines + collation), focus (tâche phare). Prochaines
pistes possibles : moduler la longueur de bloc suggérée selon la durée moyenne des sessions
d'Adrien, ou croiser focus × agenda (proposer un créneau libre pour le bloc).

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/468-coach-focus-tache-phare.md`.
