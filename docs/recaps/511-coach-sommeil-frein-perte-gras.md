# 511 — Coaching : le sommeil court, frein caché de la perte de gras (2.0.142)

**Boucle #511 · build 2.0.142 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

La lignée #504→#510 a saturé un thème : « objectif serré × forme/charge », toujours **à
l'intérieur d'un même pilier** (sport lit sa readiness/ACWR, focus lit sa fraîcheur d'esprit,
nutrition lit ses protéines/calories/balance). Toutes les notes du coach **nutrition** ne regardaient
que l'**assiette** (protéines, hydratation, cible calorique) et la **balance** (progression,
pente, plateau). Aucune ne croisait un **autre pilier**.

Or un objectif de **perte** peut caler pour une raison qui n'est ni dans l'assiette ni sur la
balance : le **manque de sommeil**. Chroniquement court, il fait grimper la **ghréline** (faim) et le
**cortisol** (stockage/rétention d'eau), et rogne la part de masse maigre perdue — un frein
**hormonal réel**, jamais nommé par le coach nutrition. Adrien pouvait suivre sa nutrition à la
lettre, voir sa perte stagner, et n'avoir aucune piste vers la vraie cause : ses nuits.

## Ce qui a été livré

Un **croisement inter-pilier** (pas une énième nuance intra-nutrition). Dans la branche nutrition,
après les notes de poids, quand — et **seulement** quand — l'objectif est une **PERTE**
(`wp.direction === 'perte'`) ET que le sommeil récent est **court** (moyenne < 7 h sur ≥ 3 nuits,
via `sleepIns` = `sleepCoachInsight`, déjà calculé en tête de fonction), une note est **appendue** :

> Et surveille un frein caché : tu dors 6 h en moyenne ces derniers jours (dette de 21 h sur 14 j),
> sous les 7 h — le manque de sommeil pousse la faim (ghréline) et le stockage (cortisol) à la hausse
> et freine la perte de gras autant qu'un écart d'assiette. Mieux dormir fait partie du plan, pas
> seulement mieux manger.

Nouveau champ **`sleepFatLossGuard`** (la moyenne h, ou `null`). Les notes nutrition existantes
(protéines, hydratation, calories, progression/pente de poids) restent **intactes** — les deux
leviers coexistent.

## Conception

- **Premier croisement de PILIERS du coach** : jusqu'ici chaque pilier lisait ses propres signaux.
  Ici le coach nutrition **nomme le pilier sommeil** comme cause possible d'un plateau de perte.
  C'est la « profondeur / valeur réelle » demandée pour la nuit : une capacité **neuve**, pas une
  symétrie de plus dans le thème « objectif serré ».
- **Cible la PERTE seulement** : le lien hormonal ghréline/cortisol × déficit y est le plus net et
  défendable ; la prise a d'autres leviers (récup/synthèse protéique), traités autrement s'il le faut.
- **Compatible avec le sommeil-pilier, prouvé** : si le sommeil est en **alerte** (`tone 'urgent'` =
  court ET irrégulier), il est déjà forcé en tête (tier −1) et devient le pilier choisi →
  `chosen.pillar === 'sommeil'`, on n'entre **pas** dans la branche nutrition. Cette note ne parle
  donc que dans le cas **subtil** : sommeil court mais **pas** le focus prioritaire du jour — le frein
  qu'on ne verrait pas autrement.
- **Additif pur** : `sleepFatLossGuard` TOUJOURS renvoyé (`null` par défaut) ; note appendue, aucune
  autre branche touchée. Réemploi total (`sleepIns` déjà en main). Zéro nouvelle fonction pure.
- **Données réelles seulement** : exige ≥ 3 nuits chiffrées récentes ET un objectif de perte ET une
  moyenne réellement < 7 h. Sans récup, ou nuits solides, ou objectif de prise → `null`, rien d'ajouté.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test dédié) : nutrition en rebuild, perte 85→79
  (50 %), 14 nuits à 6 h (avg 6, non urgent car régulier) → `pillar === 'nutrition'`,
  `sleepFatLossGuard === 6`, note « frein caché : tu dors 6 h … (dette de 21 h sur 14 j) », crédit
  poids 50 % intact ; sommeil 8 h → `null`, pas de note ; objectif de prise → `null` ; < 3 nuits →
  `null` ; aucune récup → `null`.
- Check smoke bloquant `coachFocus` étendu : sommeil court × perte → note + `sleepFatLossGuard === 6` ;
  sommeil 8 h → `null`, pas de « frein caché ».
- `cd src && xvfb-run -a npm run verify` : **489 tests + smoke 100 % vert**.

## Suite possible

- **Sommeil × PRISE** : côté prise de muscle, la nuit courte plombe la récup et la synthèse protéique
  (message et gate différents — masse maigre vs gras). Pendant naturel, mais lien à formuler avec soin.
- **Sommeil × SPORT** : le pendant côté entraînement (nuit courte → readiness réellement plombée,
  déjà en partie couvert par `readiness < 50` ; une note « ta charge cale peut-être sur tes nuits »
  reste possible sur la sous-charge persistante).
- Continuer les croisements inter-piliers, filon neuf après la saturation du thème « objectif serré ».
