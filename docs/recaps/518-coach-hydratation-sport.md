# 518 — Coaching : l'hydratation, carburant oublié de l'effort (2.0.149)

**Boucle #518 · build 2.0.149 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Le recap #517 a livré `hydrationFocusGuard` : côté FOCUS, l'hydratation comme levier AIGU de la
concentration, en relais des trois notes sommeil du focus. Il pointait explicitement la suite :
« **Hydratation × SPORT** : le pendant côté sport (déshydratation → baisse de force/puissance et
d'endurance, thermorégulation). Défendable, même moule, source neuve pour le pilier sport (qui ne lit
aujourd'hui que readiness, ACWR et sommeil). »

Constat de fond : le pilier **sport** croise depuis #513 le sommeil chronique (`sleepTrainGuard`), lit
la forme du jour (readiness) et la charge des 7 j (ACWR), mais restait **totalement aveugle à
l'hydratation** — pourtant l'un des leviers de performance les plus **rapides**. C'était le symétrique
exact, côté sport, de ce que #517 venait de faire côté focus : une source de données neuve
(`nutrition[].water`) pour un pilier qui ne la lisait pas, avec un mécanisme propre et distinct.

## Ce qui a été livré

Un nouveau champ **`hydrationTrainGuard`** dans `adaptiveCoachFocus`, en aval de `sleepTrainGuard` — le
**pendant, côté SPORT, de `hydrationFocusGuard` (#517)**. Quand — et **seulement** quand — le pilier
poussé est le **sport**, la séance du jour pas faite (`!doneToday`), la note sommeil du sport n'a **pas**
parlé (`sleepTrainGuard == null`) ET l'hydratation récente est chroniquement basse (moyenne < 6 verres
sur ≥ 3 jours d'eau saisis parmi les 7 derniers, sous la cible de 8), une note s'append :

> Et pense à un carburant qu'on oublie à l'effort : tu bois 4 verres d'eau par jour ces derniers jours,
> sous les 8 — même une déshydratation légère (1 à 2 % du poids) fait chuter la force, la puissance et
> l'endurance, gêne la thermorégulation et la récupération, et gonfle la sensation d'effort. Ça se
> corrige tout de suite : un grand verre avant de bouger, et une gourde à côté de toi pendant l'effort.

`hydrationTrainGuard` renvoie la **moyenne de verres** récente (arrondie au dixième), ou `null`.

## Conception

- **Pendant exact de #517, mécanisme distinct.** Même moule (même agrégation eau au MAX par date, même
  seuils 6/8, même relais), mais un **levier propre au sport** : la déshydratation frappe la force, la
  puissance, l'endurance, la thermorégulation et la récupération — pas l'attention/mémoire de travail du
  focus. Source neuve (`nutrition[].water`) pour le pilier sport, pas une redite.
- **Relais du sommeil, jamais concurrent.** N'entre QUE si `sleepTrainGuard == null` : une seule note
  « carburant/socle » par jour, le sommeil (levier primaire, combat documenté d'Adrien) prime,
  l'hydratation en **relais** — exactement le motif `hydrationFocusGuard`-en-relais-des-notes-sommeil
  (#517) et `hydrationTrend`-en-relais-de-`proteinTrend` (#502). Pas d'empilement.
- **Valide séance ET jour de repos.** Message phrasé pour tenir quel que soit l'état de forme (« avant
  de bouger », « récupération ») : pas besoin de garde readiness, on reste maximalement parallèle à
  `sleepTrainGuard` (qui n'en a pas non plus).
- **Vocabulaire distinct, zéro collision.** « carburant qu'on oublie à l'effort », « force, puissance
  et endurance », « thermorégulation », « avant de bouger », « une gourde à côté de toi pendant
  l'effort » — aucune collision à l'œil ni en regex avec `sleepTrainGuard` (« socle invisible »),
  `lowLoad`/`readinessSlide`, ni avec `hydrationFocusGuard` (« levier immédiat », « attention et
  mémoire de travail », « avant ton bloc »). Mutuellement exclusif de `hydrationFocusGuard` par pilier.
- **Données réelles garanties.** ≥ 3 jours d'hydratation saisie (`water > 0`) dans la fenêtre 7 j,
  agrégés au MAX par date, moyenne réellement < 6 verres.
- **Additif pur.** `hydrationTrainGuard` TOUJOURS renvoyé (`null` par défaut) ; note **appendue** à
  l'insight, action du jour (séance / charge / repos) **intacte**. Réemploi total (`daysAgo`,
  `s.nutrition`) — **zéro** nouvelle fonction pure.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test dédié) : sport en décrochage + durée de sommeil OK
  (8 h → `sleepTrainGuard === null`) + hydratation 4 verres/jour sur 4 jours récents →
  `hydrationTrainGuard === 4`, note « carburant qu'on oublie à l'effort … 4 verres … sous les 8 … fait
  chuter la force, la puissance et l'endurance … avant de bouger … une gourde à côté de toi », pas de
  « socle invisible » ni « avant ton bloc ». Bien hydraté (8 verres) → `null`, note absente ; < 3 jours
  saisis → `null` ; sommeil COURT (6 h) → `sleepTrainGuard === 6` prime, hydratation muette ; séance
  déjà faite aujourd'hui → `null`.
- Check smoke bloquant `coachFocus` étendu : hydratation basse (durée OK) → note +
  `hydrationTrainGuard === 4` & `sleepTrainGuard === null` ; bien hydraté → `null`, pas de note.
- `cd src && xvfb-run -a npm run verify` : **495 tests + smoke 100 % vert**.

## Suite possible

- **Les DEUX faces du croisement hydratation × pilier sont désormais bouclées** (focus #517, sport
  #518), comme sommeil × pilier avant (#511/#512 nutrition, #513 sport, #514 focus). Le pilier
  **nutrition** couvre déjà l'hydratation en propre (`hydrationTrend`, #502) — pas de troisième face.
- **Saturation confirmée** : `adaptiveCoachFocus` dépasse ~1500 lignes et ~40 notes appendues. Le
  recap #517 le signalait déjà — une **proposition de consolidation** (table déclarative des guards
  inter-piliers plutôt que blocs `if` empilés) vaut maintenant plus qu'une note de plus. À écrire dans
  `docs/proposals/` dès la prochaine boucle si aucune idée à forte valeur unitaire ne se présente.
- Croisements neufs restants à peser (sans forcer le remplissage) : **stress/readiness × nutrition**.
