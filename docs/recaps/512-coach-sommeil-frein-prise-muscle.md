# 512 — Coaching : le sommeil court, frein invisible de la prise de muscle (2.0.143)

**Boucle #512 · build 2.0.143 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Le recap #511 (sommeil × **perte** de gras) laissait explicitement la face manquante ouverte :
« Sommeil × PRISE — côté prise de muscle, la nuit courte plombe la récup et la synthèse protéique
(message et gate différents — masse maigre vs gras). Pendant naturel, mais lien à formuler avec soin. »

Concrètement, sur un objectif de **prise** (`wp.direction === 'prise'`), le coach nutrition ne croisait
encore aucun autre pilier : il félicitait la progression de poids, nommait la cible calorique, mais
restait aveugle au **sommeil**. Or manger en surplus ne construit pas de muscle si le corps ne
récupère pas la nuit — la nuit courte fait chuter la **testostérone** et l'**hormone de croissance**
(sécrétée surtout en sommeil profond), bride la **synthèse protéique**, et fait que le surplus
calorique se range davantage en **gras** qu'en muscle. Un frein hormonal réel, jamais nommé.

## Ce qui a été livré

Le **pendant PRISE** exact de #511, en `else if` de la note perte. Dans la branche nutrition, après
les notes de poids, quand — et **seulement** quand — l'objectif est une **PRISE** ET que le sommeil
récent est **court** (moyenne < 7 h sur ≥ 3 nuits, via `sleepIns`, déjà calculé en tête), une note
**distincte** est appendue :

> Et surveille un frein invisible : tu dors 6 h en moyenne ces derniers jours (dette de 21 h sur 14 j),
> sous les 7 h — le manque de sommeil fait chuter la testostérone et l'hormone de croissance, bride la
> synthèse musculaire et range ton surplus en gras plutôt qu'en muscle. Bien dormir, c'est transformer
> tes calories en muscle, pas seulement en avaler plus.

Nouveau champ **`sleepGainGuard`** (la moyenne h, ou `null`), **distinct** de `sleepFatLossGuard`.

## Conception

- **Message et champ distincts** — masse maigre vs gras. Libellé « frein **invisible** » (≠ « frein
  **caché** » de la perte) : les deux notes ne se confondent ni à l'œil ni dans les tests/regex, et
  chacune reste mutuellement exclusive (`perte` XOR `prise` via `wp.direction`).
- **Lien hormonal INVERSE assumé** : la perte parlait ghréline/cortisol (faim + stockage) ; la prise
  parle testostérone/GH + synthèse protéique (construction musculaire). Deux mécanismes réels, deux
  formulations défendables.
- **Compatible avec le sommeil-pilier**, même garde-fou que #511 : si le sommeil est en alerte
  (`tone 'urgent'`), il est forcé en tête (tier −1) → `chosen.pillar === 'sommeil'`, on n'entre pas
  dans la branche nutrition. La note ne parle donc que dans le cas subtil (sommeil court sans être le
  focus du jour).
- **Additif pur** : `sleepGainGuard` TOUJOURS renvoyé (`null` par défaut), note appendue seule,
  aucune autre branche touchée. Réemploi total (`sleepIns`). Zéro nouvelle fonction pure.
- **Données réelles seulement** : ≥ 3 nuits chiffrées récentes ET objectif de prise ET moyenne
  réellement < 7 h. Nuits solides, ou objectif de perte, ou < 3 nuits → `null`, rien d'ajouté.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, cas prise étendu) : prise 82→85 vers 90, 14 nuits à 6 h →
  `sleepGainGuard === 6`, `sleepFatLossGuard === null`, note « frein invisible … testostérone …
  transformer tes calories en muscle » ; sommeil 8 h → `sleepGainGuard === null`, pas de note ; le
  cas perte garde `sleepGainGuard === null` (invariant croisé).
- Check smoke bloquant `coachFocus` étendu : prise × sommeil court → note + `sleepGainGuard === 6` &
  `sleepFatLossGuard === null` ; prise × sommeil 8 h → `null`, pas de « frein invisible ».
- `cd src && xvfb-run -a npm run verify` : **489 tests + smoke 100 % vert**.

## Suite possible

- **Sommeil × SPORT** : le pendant côté entraînement (nuit courte → sous-charge qui cale peut-être sur
  les nuits, au-delà du `readiness < 50` déjà couvert). Filon inter-pilier encore ouvert.
- **Hydratation × perte/prise**, **stress/readiness × nutrition** : autres croisements inter-piliers
  à explorer après la saturation du thème « objectif serré ».
