# 517 — Coaching : l'hydratation, levier aigu de la concentration (2.0.148)

**Boucle #517 · build 2.0.148 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Les six dernières boucles (#511-#516) ont toutes croisé le **sommeil chronique** avec un pilier
(perte, prise, entraînement, focus × durée puis × timing du coucher). L'axe sommeil × focus était
saturé : durée (`sleepFocusGuard`, #514), dispersion du coucher (`bedtimeFocusGuard`, #515),
resserrement du coucher (`bedtimeFocusTrend`, #516). Toutes ces notes portent sur le **sommeil**, un
levier qui se construit sur des **jours**.

Or le pilier focus restait **totalement aveugle à l'hydratation** — pourtant l'un des leviers
cognitifs les plus **rapides** : même une déshydratation légère (1-2 % du poids) émousse
mesurablement l'attention et la mémoire de travail et fait grimper la sensation d'effort. Sa valeur
propre est d'être l'exact **complément** des notes sommeil : là où mieux dormir prend des soirs,
mieux s'hydrater se corrige **en minutes** — un grand verre avant le bloc, action du jour même.
C'était un vrai axe neuf (nouvelle source de données : `nutrition[].water`), pas une énième nuance
sommeil.

## Ce qui a été livré

Un nouveau champ **`hydrationFocusGuard`** dans `adaptiveCoachFocus`, en aval des trois notes
sommeil du focus. Quand — et **seulement** quand — le pilier poussé est le **focus**, le bloc du jour
pas fait (`!doneToday`), **aucune** des trois notes sommeil n'a parlé (`sleepFocusGuard == null &&
bedtimeFocusGuard == null && bedtimeFocusTrend == null`) ET l'hydratation récente est chroniquement
basse (moyenne < 6 verres sur ≥ 3 jours d'eau saisis parmi les 7 derniers, sous la cible de 8), une
note s'append :

> Et un levier immédiat, souvent négligé : tu bois 4 verres d'eau par jour ces derniers jours, sous
> les 8 — même une déshydratation légère (1 à 2 % du poids) brouille l'attention et la mémoire de
> travail et fait grimper la sensation d'effort. Contrairement au sommeil, ça se corrige en minutes :
> un grand verre d'eau avant ton bloc, et garde une gourde à portée.

`hydrationFocusGuard` renvoie la **moyenne de verres** récente (arrondie au dixième), ou `null`.

## Conception

- **Axe neuf, pas une nuance sommeil de plus.** Nouvelle source (`nutrition[].water`), nouveau
  mécanisme (déshydratation **aiguë** vs sommeil chronique), action immédiatement actionnable **le
  jour même** — le complément exact des notes sommeil, pas leur redite.
- **Relais du sommeil, jamais concurrent.** N'entre QUE si les trois notes sommeil du focus se
  taisent : une seule note « socle » par jour, le sommeil (levier primaire, combat documenté d'Adrien)
  prime, l'hydratation en **relais** — exactement le motif `hydrationTrend`-en-relais-de-`proteinTrend`
  du pilier nutrition (#502). Pas d'empilement de notes.
- **Vocabulaire distinct, zéro collision.** « déshydratation », « un grand verre », « se corrige en
  minutes », « une gourde » — aucune collision à l'œil ni en regex avec `sleepFocusGuard`
  (« alimente ta concentration »), `bedtimeFocusGuard` (« partent dans tous les sens »),
  `bedtimeFocusTrend` (« se resserrent ») ou `focusTrend` (« le volume grimpe »).
- **Données réelles garanties.** ≥ 3 jours d'hydratation saisie (`water > 0`) dans la fenêtre 7 j,
  agrégés au **MAX par date** (comme `daysHittingTarget`), moyenne réellement < 6 verres. Seuil 8 =
  cible de base cohérente avec `hydrationAdherenceTrend` (#502).
- **Additif pur.** `hydrationFocusGuard` TOUJOURS renvoyé (`null` par défaut) ; note **appendue** à
  l'insight, action du jour (tâche phare / bloc) **intacte**. Réemploi total (`daysAgo`,
  `s.nutrition`) — **zéro** nouvelle fonction pure.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test dédié) : focus en décrochage + durée OK (8 h,
  sans coucher saisi → 3 notes sommeil muettes) + hydratation 4 verres/jour sur 4 jours récents →
  `hydrationFocusGuard === 4`, note « levier immédiat … 4 verres … sous les 8 … se corrige en minutes »,
  pas de « alimente ta concentration » ni « partent dans tous les sens ». Bien hydraté (8 verres) →
  `null`, note absente ; < 3 jours saisis → `null` ; sommeil COURT (6 h) → `sleepFocusGuard === 6`
  prime, hydratation muette ; bloc déjà posé aujourd'hui → `null`.
- Check smoke bloquant `coachFocus` étendu : hydratation basse (durée OK, pas de coucher) → note +
  `hydrationFocusGuard === 4` & 3 guards sommeil `null` ; bien hydraté → `null`, pas de note.
- `cd src && xvfb-run -a npm run verify` : **494 tests + smoke 100 % vert**.

## Suite possible

- **Hydratation × SPORT** : le pendant côté sport (déshydratation → baisse de force/puissance et
  d'endurance, thermorégulation). Défendable, même moule, source neuve pour le pilier sport (qui ne
  lit aujourd'hui que readiness, ACWR et sommeil).
- **Attention à la saturation** : `adaptiveCoachFocus` dépasse ~1450 lignes et ~40 notes appendues.
  Une **proposition de consolidation** (table déclarative des guards inter-piliers plutôt que blocs
  `if` empilés) commence à valoir plus qu'une note de plus — à écrire dans `docs/proposals/` si les
  idées à forte valeur unitaire se raréfient.
- Croisements neufs restants : **stress/readiness × nutrition**.
