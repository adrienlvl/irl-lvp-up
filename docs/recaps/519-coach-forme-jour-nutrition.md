# 519 — Coaching : la forme du jour basse, quand l'assiette dérape (2.0.150)

**Boucle #519 · build 2.0.150 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Les recaps #513 et #518 signalaient tous deux, parmi les croisements inter-piliers restant à peser,
**« stress/readiness × nutrition »**. C'était le dernier axe neuf franc encore ouvert après la
saturation du thème « sommeil chronique × pilier » (#511/#512 nutrition, #513 sport, #514 focus) et
« hydratation × pilier » (#517 focus, #518 sport).

Constat de fond : le pilier **nutrition** croisait déjà l'assiette (protéines, hydratation), la balance
(weightGoalProgress, weightTrend) et le sommeil **chronique** (`sleepFatLossGuard`/`sleepGainGuard`),
mais restait **totalement aveugle à la readiness du JOUR**. Or c'est un signal **aigu** décisif pour
tenir son alimentation, orthogonal au sommeil chronique : un matin de forme basse (fatigue, courbatures,
nuit courte cumulées), le corps réclame du sucre rapide et la satiété se dérègle — c'est
statistiquement **LE** jour de fringale et d'écart, celui où la volonté seule cède. Le coach sport
adapte depuis longtemps l'intensité à la readiness du jour (#98) ; le coach nutrition, lui, ne la lisait
jamais.

## Ce qui a été livré

Un nouveau champ **`readinessNutriGuard`** dans `adaptiveCoachFocus`, en fin de branche nutrition (après
les guards sommeil). Quand — et **seulement** quand — le pilier poussé est la **nutrition**, un check-in
de récup **daté du jour** existe, sa readiness est au **plancher** (`< 50`, même seuil que le feu rouge
sport) ET aucun guard sommeil n'a parlé (`sleepFatLossGuard === null && sleepGainGuard === null`), une
note s'append :

> Un dernier repère pour aujourd'hui : ta forme est basse ce matin (readiness 40/100), et les jours de
> fatigue sont ceux où l'assiette dérape le plus — le corps réclame du sucre rapide et la satiété se
> dérègle. C'est justement aujourd'hui que tenir l'essentiel compte le plus : tes protéines, ton eau et
> des repas réguliers te protègent des fringales bien mieux que la volonté sur une réserve vide.

`readinessNutriGuard` renvoie le **score** du jour, ou `null`.

## Conception

- **Signal AIGU, distinct des guards sommeil.** Les guards sommeil de la nutrition (#511/#512) lisent le
  sommeil **chronique** (moyenne des derniers relevés → leviers hormonaux ghréline/cortisol/testostérone,
  adossés à un objectif de poids). `readinessNutriGuard` lit l'**état du jour** — sans besoin d'objectif
  de poids. Axe orthogonal : on peut avoir un sommeil chronique correct et une readiness au plancher un
  matin donné (courbatures, fatigue ponctuelle). C'est pile le trou signalé par #513/#518.
- **Relais des guards sommeil, jamais concurrent.** N'entre QUE si les deux guards sommeil sont muets :
  une seule note inter-pilier/jour, exactement le motif `hydrationTrend`-en-relais-de-`proteinTrend`
  (#502) et `hydrationFocusGuard`-en-relais-des-notes-sommeil (#517). Le sommeil chronique prime, la
  forme du jour relaie.
- **Check-in daté du jour exigé.** Une readiness d'hier ne dit rien de la forme d'aujourd'hui (même
  garde-fou que le coach readiness sport, #98). Aucun check-in aujourd'hui → `null`.
- **Vocabulaire distinct, zéro collision.** « l'assiette dérape », « le corps réclame du sucre rapide »,
  « des fringales », « ta forme est basse ce matin » — aucune collision à l'œil ni en regex avec les
  notes sport readiness (« récupération prioritaire », « ta forme est à plat aujourd'hui »), les guards
  sommeil (« frein caché »/« frein invisible »), ni les notes hydratation.
- **Additif pur.** `readinessNutriGuard` TOUJOURS renvoyé (`null` par défaut) ; note **appendue** à
  l'insight, action du jour (protéines) **intacte**. Réemploi total (`readinessScore`, `s.recovery`) —
  **zéro** nouvelle fonction pure.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test dédié) : nutrition en décrochage + check-in du jour
  readiness 40 (sommeil 8 h, fatigue/courbatures au max → pas de nuit courte) → `readinessNutriGuard ===
  40`, note « l'assiette dérape … des fringales … réserve vide », `sleepFatLossGuard`/`sleepGainGuard`
  restent `null`. Forme OK (fatigue/courbatures bas → readiness ≥ 50) → `null`, note absente ; readiness
  d'hier seulement → `null` ; **relais** : objectif de perte + sommeil chronique court →
  `sleepFatLossGuard === 6` prime, `readinessNutriGuard === null`, note muette.
- Check smoke bloquant `coachFocus` étendu : forme basse (durée OK) → note + `readinessNutriGuard === 40`
  & guards sommeil `null` ; forme OK → `null`, pas de note.
- `cd src && xvfb-run -a npm run verify` : **496 tests + smoke 100 % vert**.

## Suite possible

- **Croisement inter-pilier readiness × nutrition bouclé.** Le tour des grands croisements du coaching
  est désormais très couvert : sommeil chronique × {nutrition ×2, sport, focus}, hydratation × {focus,
  sport}, readiness du jour × {sport (de longue date), nutrition}.
- **Saturation confirmée** (déjà signalée #517/#518) : `adaptiveCoachFocus` dépasse ~1500 lignes et ~40
  notes appendues. La **proposition de consolidation** (table déclarative des guards inter-piliers
  plutôt que blocs `if` empilés) vaut maintenant plus qu'une note de plus — à écrire dans
  `docs/proposals/` dès la prochaine boucle si aucune idée à forte valeur unitaire ne se présente.
</content>
</invoke>
