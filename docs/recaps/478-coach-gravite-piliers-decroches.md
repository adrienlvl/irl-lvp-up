# #478 — Coaching : le coach nuance la GRAVITÉ des piliers qui décrochent (2.0.109)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

Depuis #474/#475, `adaptiveCoachFocus` NOMME les autres piliers qui décrochent cette semaine
(`alsoSlipping` / `alsoSlippingPillars`) : « Ton focus et ta nutrition faiblissent aussi cette
semaine — celui-ci d'abord. » Utile, mais tous les piliers cités recevaient le **même verbe**
« faiblit / faiblissent », qu'ils soient dormants depuis deux semaines ou en simple creux. Or ces
deux états n'appellent pas le même geste : un pilier **à l'arrêt** (dormant, deux semaines à zéro
alors qu'il a déjà existé) demande une vraie **relance** ; un pilier **en recul** (léger tassement)
demande juste un **rattrapage**. La distinction existait déjà dans la logique (le `tier` de tri :
tier 1 = dormant/revive, tier 0/2 = creux/rebuild), mais elle était **perdue à l'affichage**.
« Moduler le verbe/ton d'`alsoSlipping` selon la gravité (dormant vs simple creux) » figurait en tête
des prochaines pistes de #475, #476 **et** #477.

## L'amélioration

Le libellé des autres piliers qui décrochent s'adapte maintenant à leur **gravité réelle**, en
réutilisant le `tier` déjà calculé (aucune nouvelle heuristique). Trois cas, du plus lisible au plus
précis :

- **Tous dormants** (tier 1) → « … **est / sont à l'arrêt** aussi cette semaine »
- **Tous en creux** → « … **faiblit / faiblissent** aussi cette semaine » (libellé historique, inchangé)
- **Mixte** → état précisé **en parenthèse** par pilier + verbe neutre « décroche(nt) » :
  « **Ta nutrition (en recul) et ton focus (à l'arrêt) décrochent** aussi cette semaine »

Exemple dormant : « Ton entraînement s'essouffle… **Ton sommeil est à l'arrêt aussi cette semaine —
celui-ci d'abord, c'est ton levier prioritaire.** »

### Le point de conception

`isDormant(f) = f.tier === 1` — le `tier` 1 est **exactement** l'état dormant (`ever && recentDays === 0
&& prevDays === 0`), déjà utilisé pour choisir entre les tons `revive` et `rebuild`. On ne recalcule
rien : on relit la gravité déjà triée. Le format homogène (tout dormant / tout creux) donne une phrase
naturelle avec un seul verbe ; le format parenthétique n'apparaît **que** quand les deux gravités se
mélangent, là où un verbe unique mentirait. Backward-compat totale : les cas « tout en creux »
gardent mot pour mot « faiblit / faiblissent » — les tests #474/#475 existants passent inchangés.

### Garde-fous (hérités, intacts)

- Réservé aux tons « à corriger » (`rebuild`/`revive`), HORS rotation, HORS micro-pas, HORS geste déjà
  fait — exactement comme `alsoSlipping` depuis #474.
- Champs `alsoSlipping` (nombre) et `alsoSlippingPillars` (clés, ordre de gravité) **inchangés** : seul
  le **libellé** s'affine. Additif pur, aucune branche existante touchée.

## Logique / tests

- `src/lib/logic.js` — bloc `alsoSlipping` : `isDormant`/`joinNoms`/`allDormant`/`anyDormant`, choix du
  libellé selon la gravité. CHANGELOG[0] 2.0.109.
- Aucun changement `src/app.js` : `renderCoachFocus` affiche l'insight (affiné) tel quel.
- `src/test/logic.test.js` — test « priorise explicitement quand plusieurs piliers décrochent » étendu :
  autre pilier dormant (focus actif il y a 3 semaines, 0 depuis 14 j) → « Ton focus est à l'arrêt aussi
  cette semaine » (pas « faiblit ») ; cas mixte nutrition en creux + focus dormant → « Ta nutrition
  (en recul) et ton focus (à l'arrêt) décrochent aussi cette semaine », `alsoSlipping` 2,
  `alsoSlippingPillars` `['nutrition', 'focus']`. Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (autre pilier dormant → « à
  l'arrêt » et non « faiblit ») ; assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **464 tests + SMOKE OK**, 100 % vert.

## Contexte

Build **2.0.109**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
Le coach ne dit plus seulement *lesquels* des autres piliers décrochent, mais *à quel point* — donc
implicitement *quel geste* chacun appellera quand Adrien y arrivera. Prochaines pistes possibles :
badge/paliers de série (3, 7, 14 jours complets) comme les milestones de streak existants ; suggérer de
**décaler** un RDV du soir menaçant (`sleepConflict`) plutôt que juste alerter, si un créneau plus tôt
existe ; moduler l'action du pilier dormant choisi (`revive`) vers un tout premier pas ré-amorçant.

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/478-coach-gravite-piliers-decroches.md`.
