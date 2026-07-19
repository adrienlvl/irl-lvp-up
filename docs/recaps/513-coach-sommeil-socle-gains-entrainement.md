# 513 — Coaching : le sommeil court, socle invisible des gains d'entraînement (2.0.144)

**Boucle #513 · build 2.0.144 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Les recaps #511/#512 (sommeil × perte, sommeil × prise) ont bouclé les **deux faces de la balance**
côté NUTRITION, et #512 pointait explicitement la face manquante : « **Sommeil × SPORT** : le pendant
côté entraînement (nuit courte → sous-charge qui cale peut-être sur les nuits, au-delà du
`readiness < 50` déjà couvert). Filon inter-pilier encore ouvert. »

Concrètement, le pilier **sport** croisait déjà ses propres signaux du jour — la **forme** du matin
(`readiness`) et la **charge** des 7 j (`acuteChronicRatio`) — mais restait **aveugle au sommeil
CHRONIQUE**. Or c'est une lecture *différente* de la readiness : la readiness est un état **aigu** d'un
matin donné (on peut l'avoir correcte tout en dormant structurellement trop peu depuis des jours) ; le
sommeil moyen des derniers relevés (`sleepIns.avg`) est un signal **structurel**. Et c'est la nuit —
surtout le sommeil profond — que le corps **consolide** l'entraînement : synthèse protéique, réparation
tissulaire, sécrétion de GH et de testostérone. Dormir court **plafonne les gains de chaque séance** et
augmente le risque de blessure, quel que soit l'effort fourni. Un frein réel, jamais nommé côté sport.

## Ce qui a été livré

Le **pendant SPORT** exact des guards nutrition, en fin de branche sport (après les blocs
readiness/charge). Quand — et **seulement** quand — le pilier poussé est le **sport**, la séance du jour
pas déjà faite (`!doneToday`) et le sommeil récent est **court** (moyenne < 7 h sur ≥ 3 nuits chiffrées,
via `sleepIns` déjà calculé en tête), une note **distincte** est appendue à l'insight :

> Et n'oublie pas le socle invisible de tes gains : tu dors 6 h en moyenne ces derniers jours (dette de
> 21 h sur 14 j), sous les 7 h — c'est la nuit que le corps consolide l'entraînement (synthèse protéique,
> réparation, hormones), et dormir court plafonne les gains de chaque séance tout en augmentant le risque
> de blessure. Bien dormir démultiplie l'effort que tu fournis déjà.

Nouveau champ **`sleepTrainGuard`** (la moyenne h, ou `null`), **distinct** de `sleepFatLossGuard` /
`sleepGainGuard`.

## Conception

- **Message et champ distincts, libellé propre** : « socle **invisible** des gains » (≠ « frein
  **caché** » de la perte, ≠ « frein **invisible** » de la prise). Les trois notes ne se confondent ni à
  l'œil ni dans les tests/regex ; chacune vit dans une branche de pilier mutuellement exclusive
  (`nutrition` pour les deux premières, `sport` pour celle-ci).
- **Distinct de `readiness`, assumé** : le pilier sport réagit déjà à la forme du JOUR (readiness < 50 →
  repos). `sleepTrainGuard` lit le sommeil **chronique** (moyenne des derniers relevés) — un axe
  orthogonal : on peut avoir une readiness correcte un matin donné et une dette de sommeil installée.
  C'est pile le trou signalé par #512 (« au-delà du `readiness < 50` déjà couvert »).
- **Compatible avec le sommeil-pilier**, même garde-fou que #511/#512 : si le sommeil est en alerte
  (`tone 'urgent'`), il est forcé en tête (tier −1) → `chosen.pillar === 'sommeil'`, on n'entre pas dans
  la branche sport. La note ne parle donc que dans le cas **subtil** : sommeil court sans être le focus.
- **Additif pur** : `sleepTrainGuard` TOUJOURS renvoyé (`null` par défaut), note appendue seule, action
  du jour (séance / charge / repos) **intacte** — orthogonale à toute action sport. Réemploi total
  (`sleepIns`, `doneToday`, `chosen`). Zéro nouvelle fonction pure.
- **Données réelles seulement** : ≥ 3 nuits chiffrées récentes ET moyenne réellement < 7 h ET séance du
  jour pas encore faite. Nuits solides, ou < 3 nuits, ou aucune récup, ou séance déjà posée → `null`,
  rien d'ajouté.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test dédié) : sport en décrochage (3 séances la semaine
  passée, 1 récente → pilier sport, tier 0) + 14 nuits à 6 h (avg 6 < 7, régulier → tone 'attention',
  non urgent) → `sleepTrainGuard === 6`, note « socle invisible … synthèse protéique … démultiplie
  l'effort » ; `sleepFatLossGuard`/`sleepGainGuard` restent `null` (pas de contamination inter-pilier) ;
  sommeil 8 h → `null`, pas de note ; < 3 nuits → `null` ; aucune récup → `null` ; **séance déjà faite
  aujourd'hui** (`doneToday`) → `null`, pas de note.
- Check smoke bloquant `coachFocus` étendu : sport × sommeil court → note + `sleepTrainGuard === 6` &
  `sleepFatLossGuard === null` ; sport × sommeil 8 h → `null`, pas de « socle invisible ».
- `cd src && xvfb-run -a npm run verify` : **490 tests + smoke 100 % vert**.

## Suite possible

- **Sommeil × FOCUS** : le pendant côté focus (nuit courte → concentration/mémoire de travail
  dégradées, au-delà du `focusGoalDrained` du jour déjà couvert #510). Compléterait le tour des 4 piliers
  (nutrition ×2, sport, focus) pour le croisement « sommeil chronique × pilier ».
- **Hydratation × sport/récup**, **stress/readiness × nutrition** : autres croisements inter-piliers à
  explorer après la saturation du thème « sommeil chronique ».
