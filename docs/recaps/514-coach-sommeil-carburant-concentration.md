# 514 — Coaching : le sommeil court, carburant caché de la concentration (2.0.145)

**Boucle #514 · build 2.0.145 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Le recap #513 (sommeil × sport) fermait la question côté entraînement et pointait explicitement la
dernière face manquante : « **Sommeil × FOCUS** : le pendant côté focus (nuit courte →
concentration/mémoire de travail dégradées, au-delà du `focusGoalDrained` du jour déjà couvert #510).
Compléterait le tour des 4 piliers (nutrition ×2, sport, focus) pour le croisement « sommeil chronique
× pilier ». »

Concrètement, le pilier **focus** croisait déjà ses propres signaux du jour — l'**allure hebdo** de
minutes (`focusGoalPace`) et la **forme du matin** (`focusGoalFresh`/`focusGoalDrained` via `readiness`)
— mais restait **aveugle au sommeil CHRONIQUE**. Comme pour le sport, c'est un axe *orthogonal* à la
readiness : la readiness est un état **aigu** d'un matin donné (on peut l'avoir correcte tout en dormant
structurellement trop peu depuis des jours) ; le sommeil moyen des derniers relevés (`sleepIns.avg`) est
un signal **structurel**. Or le sommeil est le carburant du cerveau : une nuit courte émousse
l'**attention** et la **mémoire de travail** (cortex préfrontal au ralenti), et c'est la nuit — surtout
le sommeil profond et paradoxal — que le cerveau **consolide** ce qu'on a appris le jour. Dormir court,
c'est fournir plus d'effort pour retenir moins. Un frein réel, jamais nommé côté focus.

## Ce qui a été livré

Le **pendant FOCUS** exact des guards sport/nutrition, en fin de branche (après le bloc sport
`sleepTrainGuard`). Quand — et **seulement** quand — le pilier poussé est le **focus**, le bloc du jour
pas déjà fait (`!doneToday`) et le sommeil récent est **court** (moyenne < 7 h sur ≥ 3 nuits chiffrées,
via `sleepIns` déjà calculé en tête), une note **distincte** est appendue à l'insight :

> Et n'oublie pas ce qui alimente ta concentration : tu dors 6 h en moyenne ces derniers jours (dette de
> 21 h sur 14 j), sous les 7 h — une nuit courte émousse l'attention et la mémoire de travail (le cortex
> préfrontal tourne au ralenti), et c'est la nuit que le cerveau consolide ce que tu apprends le jour.
> Dormir court, c'est fournir plus d'effort pour retenir moins ; bien dormir démultiplie chaque bloc de
> focus.

Nouveau champ **`sleepFocusGuard`** (la moyenne h, ou `null`), **distinct** de `sleepFatLossGuard` /
`sleepGainGuard` / `sleepTrainGuard`. Avec lui, **les quatre piliers** croisent enfin le sommeil
chronique.

## Conception

- **Message et champ distincts, libellé propre** : « ce qui **alimente** ta concentration », « émousse
  l'attention et la mémoire de travail », « consolide ce que tu **apprends** le jour », « démultiplie
  chaque **bloc de focus** ». Aucune collision à l'œil ni dans les tests/regex avec « frein caché »
  (perte), « frein invisible » (prise) ou « socle invisible » (sport) ; chaque note vit dans une branche
  de pilier mutuellement exclusive.
- **Distinct de `readiness`/`focusGoalDrained`, assumé** : le pilier focus réagit déjà à la forme du
  JOUR (`focusGoalDrained`, readiness < 50 → bloc court). `sleepFocusGuard` lit le sommeil **chronique**
  (moyenne des derniers relevés) — l'axe orthogonal pile signalé par #513. La consolidation mnésique
  nocturne est le pendant cognitif exact de la consolidation musculaire nocturne du sport.
- **Compatible avec le sommeil-pilier**, même garde-fou que #511/#512/#513 : si le sommeil est en alerte
  (`tone 'urgent'`), il est forcé en tête (tier −1) → `chosen.pillar === 'sommeil'`, on n'entre pas dans
  la branche focus. La note ne parle donc que dans le cas **subtil** : sommeil court sans être le focus.
- **Additif pur** : `sleepFocusGuard` TOUJOURS renvoyé (`null` par défaut), note appendue seule, action
  du jour (tâche phare / bloc) **intacte**. Réemploi total (`sleepIns`, `doneToday`, `chosen`). Zéro
  nouvelle fonction pure.
- **Données réelles seulement** : ≥ 3 nuits chiffrées récentes ET moyenne réellement < 7 h ET bloc du
  jour pas encore posé. Nuits solides, ou < 3 nuits, ou aucune récup, ou bloc déjà fait → `null`, rien
  d'ajouté.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test dédié) : focus en décrochage (3 blocs la semaine
  passée, 1 récent → pilier focus, tone 'rebuild') + 14 nuits à 6 h (avg 6 < 7, régulier → tone
  'attention', non urgent) → `sleepFocusGuard === 6`, note « alimente ta concentration … émousse
  l'attention et la mémoire de travail … démultiplie chaque bloc de focus » ; `sleepFatLossGuard` /
  `sleepGainGuard` / `sleepTrainGuard` restent `null` (pas de contamination inter-pilier) ; sommeil 8 h
  → `null`, pas de note ; < 3 nuits → `null` ; aucune récup → `null` ; **bloc déjà posé aujourd'hui**
  (`doneToday`) → `null`, pas de note.
- Check smoke bloquant `coachFocus` étendu : focus × sommeil court → note + `sleepFocusGuard === 6` &
  `sleepTrainGuard === null` ; focus × sommeil 8 h → `null`, pas de « alimente ta concentration ».
- `cd src && xvfb-run -a npm run verify` : **491 tests + smoke 100 % vert**.

## Suite possible

- Le thème « **sommeil chronique × pilier** » est maintenant **saturé** (nutrition ×2, sport, focus).
- Autres croisements inter-piliers à explorer : **hydratation × sport/récup/focus**, **stress/readiness
  × nutrition**, **régularité du coucher (`bedtime`) × pilier**. Ou approfondir un pilier isolément
  (nuance des dettes/tendances, priorisation multi-signal). Si à court d'idées à forte valeur : les
  écrire dans `docs/proposals/` plutôt que d'inventer du remplissage.
