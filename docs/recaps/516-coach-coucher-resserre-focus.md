# 516 — Coaching : le coucher qui se resserre, renfort positif de la concentration (2.0.147)

**Boucle #516 · build 2.0.147 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Le recap #515 a livré `bedtimeFocusGuard` : côté FOCUS, une **alerte** quand les couchers sont
**actuellement dispersés** (écart-type ≥ 60 min). Il pointait explicitement la suite : « **Tendance**
de régularité du coucher (`bedtimeRegularityTrend`, déjà pur+testé) × focus : "tes couchers se
resserrent, ta concentration va suivre" quand la variance **baisse** — un renfort positif, pendant de
`focusTrend` sur l'axe régularité. »

Constat de fond : sur l'axe circadien, le coach ne savait que **gronder**. Les cinq dernières boucles
(#511-#515) ont toutes ajouté des notes d'**avertissement** (« frein caché », « socle invisible »,
« couchers partent dans tous les sens »). Or Adrien a demandé une adaptation **aux progrès ET aux
écarts**. Un coach qui ne relève jamais l'effort qui paie use la motivation : quand le rythme de
coucher se **stabilise** — précisément le combat de tout le système sommeil d'Adrien — personne ne le
créditait. Le renfort positif manquait, alors que le levier est réel : un coucher qui se régularise
réaligne l'horloge circadienne qui cadence la vigilance, donc l'attention suit.

## Ce qui a été livré

Un nouveau champ **`bedtimeFocusTrend`** dans `adaptiveCoachFocus`, en aval de `bedtimeFocusGuard` —
le **pendant POSITIF** de ce dernier, et le premier **renfort** (pas un avertissement) sur l'axe
circadien × focus. Quand — et **seulement** quand — le pilier poussé est le **focus**, le bloc du jour
pas fait (`!doneToday`), **aucune** note sommeil-durée n'a parlé (`sleepFocusGuard == null`), les
couchers ne sont **pas** dispersés maintenant (`bedtimeFocusGuard == null`) ET
`bedtimeRegularityTrend` renvoie `dir === 'tightening'` (écart-type récent ≤ précédent − 15 min), une
note **positive** est appendue à l'insight :

> Bonne nouvelle côté horloge interne : tes couchers se resserrent (±120 → ±40 min d'un soir à
> l'autre) — un rythme de coucher qui se stabilise réaligne l'horloge circadienne qui cadence la
> vigilance, et l'attention comme le temps de réaction vont suivre. Tiens ce cap, ta concentration a
> tout à y gagner.

`bedtimeFocusTrend` renvoie le **delta signé** d'écart-type en minutes (négatif = resserrement), ou
`null`.

## Conception

- **Renfort, pas alerte — valence neuve.** Pendant, sur l'axe régularité du coucher, de ce que
  `focusTrend` 'up' fait sur le volume. Récompenser le progrès qui paie entretient l'élan mieux qu'une
  énième alerte. C'est l'« adaptation aux PROGRÈS » demandée.
- **Vocabulaire distinct, zéro collision.** « se resserrent », « se stabilise », « réaligne »,
  « vont suivre », « Bonne nouvelle » — aucune collision à l'œil ni en regex avec l'avertissement
  `bedtimeFocusGuard` (« partent dans tous les sens », « désynchronise »), `sleepFocusGuard`
  (« alimente ta concentration ») ou `focusTrend` (« le volume grimpe »).
- **Mutuellement exclusif avec les deux notes sommeil (durée/timing).** N'entre QUE si
  `sleepFocusGuard == null` (durée non courte) ET `bedtimeFocusGuard == null` (couchers pas dispersés
  maintenant) : une seule note sommeil par jour. On ne crédite pas la stabilisation le jour où on
  alerte encore sur la dette ou la dispersion — la note la plus grossière prime. `bedtimeFocusGuard`
  lit `bedtimeRegularity(recovery, 14)` (dispersion **globale** sur 14 nuits), donc la note positive
  ne parle que quand le rythme récent est vraiment tenu **et** le global reste sous le seuil `irregular`.
- **Données réelles garanties.** `bedtimeRegularityTrend(7)` exige ≥ 3 couchers récents ET ≥ 3
  précédents (`null` sinon) — plus strict que le guard. Seuil `tightening` = delta ≤ −15 min.
- **Additif pur.** `bedtimeFocusTrend` TOUJOURS renvoyé (`null` par défaut) ; note APPENDUE à
  l'insight, action du jour (tâche phare / bloc) **intacte**. Réemploi total
  (`bedtimeRegularityTrend`, `sleepFocusGuard`, `bedtimeFocusGuard`, `doneToday`) — **zéro** nouvelle
  fonction pure.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test dédié) : focus en décrochage + durée OK (8 h) +
  couchers semaine passée dispersés (22:30/23:30, écart-type 30) puis semaine récente tenue (23:00,
  écart-type 0) → `bedtimeFocusTrend === -30`, `sleepFocusGuard === null`, `bedtimeFocusGuard === null`,
  note « Bonne nouvelle côté horloge interne … se resserrent (±30 → ±0 min) … vont suivre … Tiens ce
  cap », pas de « partent dans tous les sens » ni « alimente ta concentration ». Couchers stables
  (delta 0 → 'flat') → `null` ; sommeil COURT (6 h) → `sleepFocusGuard` prime, renfort muet ; couchers
  encore dispersés (global ≥ 60) → `bedtimeFocusGuard` alerte, renfort exclu ; bloc déjà posé
  aujourd'hui → `null`.
- Check smoke bloquant `coachFocus` étendu : durée OK + couchers qui se resserrent → note +
  `bedtimeFocusTrend === -30` & guards `null` ; couchers stables → `null`, pas de note.
- `cd src && xvfb-run -a npm run verify` : **493 tests + smoke 100 % vert**.

## Suite possible

- Le **pendant côté SPORT/NUTRITION** du resserrement circadien : peu net (l'effet circadien porte
  surtout le **cognitif** ; côté sport/nutrition, durée/readiness portent déjà l'essentiel). À peser
  pour ne pas verser dans le remplissage.
- Autres croisements neufs restants : **hydratation × sport/focus**, **stress/readiness × nutrition**.
- Si à court d'idées à forte valeur : `docs/proposals/` plutôt que du remplissage.
</content>
</invoke>
