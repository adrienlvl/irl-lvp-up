# #479 — Coaching : le coach fête tes PALIERS de journées complètes (2.0.110)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

En #477, `adaptiveCoachFocus` a gagné la **série** de journées complètes (`completeDayStreak` : jours
consécutifs à ≥ 3 des 4 piliers) : « 3 jours d'affilée à 3+ piliers — tu enchaînes les journées
complètes. 🔥 ». Utile, mais le message traitait **tous** les enchaînements de la même façon : une série
de 4 jours et une **semaine pleine** (7 jours complets) recevaient le même compteur neutre. Or l'app est
gamifiée et fête déjà les **paliers** de streak quotidien (`STREAK_MILESTONES` = `[3, 7, 14, 30, 60,
100, 180, 365]`, `nextStreakMilestone`) — franchir 7 journées complètes d'affilée, c'est un **jalon**, pas
un compteur anodin. « badge/paliers de série (3, 7, 14 jours complets) comme les milestones de streak
existants » figurait en tête des prochaines pistes de #477 **et** #478.

## L'amélioration

La note de série gagne deux registres, en **rebranchant les paliers de streak existants** (aucune
nouvelle échelle) :

- **Palier franchi** — quand la série tombe pile sur un jalon de `STREAK_MILESTONES` (3, 7, 14, 30…),
  le coach le **débloque** explicitement, avec un libellé nommé aux jalons ronds :
  - 7 → « 🏅 **Palier franchi : une semaine complète** de journées pleines ! »
  - 14 → « … **deux semaines complètes** … » · 30 → « … **un mois complet** … »
  - autres (3, 60…) → « 🏅 **Palier franchi : 3 jours** de journées pleines ! »
- **Cap à tenir demain** — sinon, si le **prochain** palier est à **un seul jour** (`remaining === 1`,
  via `nextStreakMilestone`), le coach donne la carotte actionnable : « **Encore 1 jour pour franchir le
  palier des 7. 🎯** » — la fierté d'hier devient l'objectif de demain.

Exemple : « Séance déjà faite aujourd'hui 💪 … 7 jours d'affilée à 3+ piliers — tu enchaînes les
journées complètes. 🔥 **🏅 Palier franchi : une semaine complète de journées pleines !** »

### Le point de conception

On **réutilise** `STREAK_MILESTONES` (`.includes(completeDayStreak)`) et `nextStreakMilestone` — la même
échelle et la même logique que les streaks quotidiens ailleurs dans l'app : cohérence gamifiée, zéro
heuristique neuve. Le palier ne s'ajoute qu'à l'intérieur de la note de série déjà existante
(`pillarsToday >= 3 && completeDayStreak >= 2`), donc jamais en contexte négatif ni sur une journée
isolée. Le libellé de base (« N jours d'affilée à 3+ piliers — tu enchaînes les journées complètes. 🔥 »)
est **inchangé mot pour mot** : les tests #477 (assertions `.match`) passent tels quels ; le palier
s'ajoute derrière.

### Garde-fous (hérités, intacts)

- Uniquement en contexte positif (`doneToday || tone === 'reinforce'`, `pillarsToday >= 3`,
  `completeDayStreak >= 2`) — hérité de #477, inchangé. Toujours **disjoint d'`alsoSlipping`**.
- Additif pur : nouveau champ `completeDayMilestone` (valeur du palier franchi aujourd'hui, ou `null`)
  **toujours** renvoyé ; `completeDayStreak` inchangé, aucune branche existante touchée.

## Logique / tests

- `src/lib/logic.js` — dans la note de crédit de série : `completeDayMilestone` + libellé palier
  (`STREAK_MILESTONES.includes`) ou cap à tenir (`nextStreakMilestone`, `remaining === 1`) ; champ
  `completeDayMilestone` au retour. CHANGELOG[0] 2.0.110.
- Aucun changement `src/app.js` : `renderCoachFocus` affiche l'insight (enrichi) tel quel.
- `src/test/logic.test.js` — test « célèbre une SÉRIE de journées complètes » étendu : série 3 →
  `completeDayMilestone` 3 + « Palier franchi : 3 jours » ; série 2 → `completeDayMilestone` null +
  « Encore 1 jour pour franchir le palier des 3 » ; nouveau cas 4 piliers × 7 j → `completeDayStreak` 7,
  `completeDayMilestone` 7, « Palier franchi : une semaine complète ». Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (palier 3 franchi ; semaine
  complète → `completeDayMilestone` 7 ; série 2 → cap « Encore 1 jour pour franchir le palier des 3 »,
  aucun palier). Assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **464 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.110**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
Le coach dispose maintenant des trois gradations positives : saluer **une** belle journée (crédit d'un
jour, #476), célébrer l'**enchaînement** (série, #477), fêter le **jalon** (palier, ici). Prochaines
pistes possibles : suggérer de **décaler** un RDV du soir menaçant (`sleepConflict`) plutôt que juste
alerter, si un créneau plus tôt existe ; moduler l'action du pilier dormant choisi (`revive`) vers un
tout premier pas ré-amorçant ; badge visuel persistant au franchissement d'un palier (comme les
milestones de streak affichés).

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/479-coach-paliers-serie-journees.md`.
