# #482 — Coaching : le coach salue une relance amorcée (2.0.113)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

Depuis #481, `adaptiveCoachFocus` sait proposer le **tout premier pas** d'un pilier DORMANT (ton
`revive`, ≥ 14 j sans activité → `reviveStep`). Mais l'arc s'arrêtait au conseil : le coach ne savait
pas **saluer Adrien quand il l'avait HONORÉ**. Or dès qu'il reprend (une séance, un bloc de focus),
le pilier n'est plus dormant — `recentDays ≥ 1`, le ton bascule en `reinforce`/`up` —, et le coach
lui servait le « monte en régime » **générique**, comme pour n'importe quelle hausse. Franchir le mur
d'activation après une longue coupure est pourtant l'instant le plus **fragile ET le plus méritant**
d'une reprise : le passer sous silence rate l'occasion d'ancrer la victoire et de protéger l'élan
naissant. « Exposer un badge relance amorcée quand Adrien honore le premier pas d'un pilier dormant »
figurait en tête des prochaines pistes de **#481**.

## L'amélioration

Le pendant **positif** du ré-amorçage. Quand le pilier poussé est en bonne dynamique
(ton `reinforce`, hors rotation) et que son activité récente marque la **FIN d'un long silence**, le
coach le reconnaît explicitement dans l'insight :

> « Ton entraînement monte en régime. … **Tu as rallumé ton entraînement il y a 2 j après 29 jours
> d'arrêt — le plus dur (franchir la reprise) est fait, ne laisse pas la flamme retomber.** »

### Le point de conception

- **Mesure du trou depuis le vrai historique** : on relit les dates actives du pilier (mêmes prédicats
  d'activité) et on calcule `relaunchDay` = plus **ancienne** activité de la fenêtre récente (0-6 j) =
  début de la reprise ; `prevOld` = **dernière** activité avant le trou (> 6 j) ; `gap` = leur écart =
  la durée du silence rompu. Détection : reprise **fraîche** (`ns[0] ≤ 3` : dernier geste récent) +
  `gap ≥ 14`. Le « quand » affiché (`aujourd'hui`/`hier`/`il y a N j`) est celui du **début** de la
  reprise, pas du dernier geste — « rallumé » désigne bien l'instant de franchissement.
- **Réservé au ton positif** : une reprise se **fête** ; en tons de correction (`rebuild`/`revive`) le
  coach abaisse la barre, ce n'est pas le moment de célébrer. Disjoint du micro-pas/ré-amorçage **par le
  ton** — aucun risque de double message.
- **Pilier réellement ANCIEN requis** (`older` non vide) : un pilier flambant neuf (aucune activité
  avant la fenêtre récente) n'est **pas** une « relance » — juste un démarrage. `fresh` de test le prouve.
- Se contente d'**enrichir l'insight** ; l'action (déjà enrichie ailleurs : readiness, tâche phare,
  crédit du jour…) reste intacte — le « ne laisse pas la flamme retomber » porte le nudge.

### Garde-fous / rétrocompat

- Additif pur : nouveau champ `comeback` (booléen) **toujours** renvoyé ; aucune autre branche touchée.
  Les hausses **continues** (pas de trou ≥ 14 j avant la fenêtre récente) gardent `comeback === false`
  et leur message inchangé — vérifié sur `up` et `fBoost` (suivi élevé, reinforce sans trou).

## Logique / tests

- `src/lib/logic.js` — bloc `comeback` (avant `if (rotated)`), champ `comeback` au retour.
  CHANGELOG[0] 2.0.113.
- Aucun changement `src/app.js` : `renderCoachFocus` affiche l'insight (enrichi) tel quel.
- `src/test/logic.test.js` — test coach étendu : hausse continue → `comeback` false ; reprise 07-14/07-16
  après 15 juin (29 j) → `comeback` true + « rallumé ton entraînement il y a 2 j après 29 jours » ;
  pilier sans passé → `comeback` false. Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (reprise après 29 j → `comeback`
  true, libellé chiffré ; `fBoost` reinforce sans trou → `comeback` false). Assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **464 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.113**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
L'arc du pilier dormant est désormais complet : le coach propose le premier pas (#481) **et** fête sa
réussite. Prochaines pistes possibles : escalader le geste au fil de la reprise (premier pas → séance
courte → séance normale) selon la durée depuis la relance ; nuancer le ton du comeback selon la longueur
du trou (relance après 3 semaines vs 2 mois) ; chercher un créneau plus TÔT pour proposer de **décaler**
un RDV du soir menaçant (`sleepConflict`, via `nextFreeSlot`) quand c'est faisable.

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/482-coach-salue-relance-amorcee.md`.
