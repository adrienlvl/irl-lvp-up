# 515 — Coaching : le coucher irrégulier émousse la concentration (2.0.146)

**Boucle #515 · build 2.0.146 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Le recap #514 fermait le thème « **sommeil chronique DURÉE × pilier** » (les quatre guards
`sleepFatLossGuard`/`sleepGainGuard`/`sleepTrainGuard`/`sleepFocusGuard`, tous sur `avg < 7 h`) et
pointait explicitement le filon suivant : « **régularité du coucher (`bedtime`) × pilier** ».

Côté FOCUS, `sleepFocusGuard` (#514) ne lit que la **durée** chronique. Il reste **aveugle au
TIMING** : on peut dormir assez d'heures **et pourtant** se coucher à 22 h un soir, 3 h le lendemain
— la durée paraît correcte, le **rythme circadien** est en miettes. C'est un axe *orthogonal* à la
durée (`bedtimeRegularity` a été bâti précisément parce que `sleepRegularity`, basée sur la durée, ne
voit rien d'anormal quand deux nuits de 7 h cachent un coucher à 22 h puis à 3 h), et c'est
**exactement le cas d'Adrien** (endormissements erratiques, vers ~6 h certains soirs — tout le
système sommeil a été bâti autour de ça). Or la **régularité de l'horloge interne** pèse autant que
le nombre d'heures sur la performance **cognitive** : un coucher erratique désynchronise l'horloge
circadienne qui cadence la vigilance, et une vigilance en dents de scie fait décrocher l'attention et
le temps de réaction **même après une nuit assez longue**. Un frein réel, jamais nommé côté focus.

## Ce qui a été livré

Un nouveau guard **`bedtimeFocusGuard`** dans `adaptiveCoachFocus`, en aval de `sleepFocusGuard`.
Quand — et **seulement** quand — le pilier poussé est le **focus**, le bloc du jour pas déjà fait
(`!doneToday`), la note durée **n'a pas** parlé (`sleepFocusGuard == null`, donc durée non courte) et
l'écart-type des couchers récents est **grand** (`sleepIns.bedtimeStdevMin ≥ 60` min — le seuil même
d'`irregular`, déjà calculé en tête), une note **distincte** est appendue à l'insight :

> Ta durée de sommeil tient, mais tes couchers partent dans tous les sens (±150 min d'un soir à
> l'autre) : le cerveau ne tourne à plein régime cognitif que sur une horloge stable — un coucher
> erratique désynchronise l'horloge interne qui cadence la vigilance, et l'attention comme le temps
> de réaction décrochent même après une nuit assez longue. Se coucher à heure fixe compte ici autant
> que le nombre d'heures.

`bedtimeFocusGuard` renvoie l'écart-type (en min) ou `null`. Le champ est **distinct** des quatre
guards de durée : la DURÉE et le TIMING sont deux défaillances différentes.

## Conception

- **Axe orthogonal à `sleepFocusGuard`, message et champ distincts** : durée (`avg`) vs variance de
  l'heure de coucher (`bedtimeStdevMin`). Libellé propre (« couchers partent dans tous les sens »,
  « horloge stable », « désynchronise l'horloge interne qui cadence la vigilance », « se coucher à
  heure fixe ») — aucune collision à l'œil ni dans les regex avec « alimente ta concentration »
  (durée, #514) ni les « frein caché/invisible », « socle invisible ».
- **Mutuellement exclusif avec la note durée** : n'entre QUE si `sleepFocusGuard == null` (durée non
  courte). Quand la nuit est **courte**, cette note-là a déjà parlé et **prime** (la durée est le
  manque le plus grossier) ; on ne pile jamais deux notes sommeil. De plus, sommeil **court ET
  irrégulier** → `sleepIns.tone === 'urgent'` → pilier sommeil forcé (tier −1) → on n'est pas dans la
  branche focus. La note ne parle donc **que** dans le cas subtil « durée correcte mais couchers
  dispersés ».
- **Données réelles garanties** : `bedtimeStdevMin != null` implique ≥ 3 couchers renseignés
  (`bedtimeRegularity` renvoie `null` sinon). Seuil ≥ 60 min = celui d'`irregular` (cohérence avec le
  Bilan sommeil). < 3 couchers, couchers réguliers (< 60 min), aucune récup, bloc déjà posé → `null`,
  rien d'ajouté.
- **Additif pur** : `bedtimeFocusGuard` TOUJOURS renvoyé (`null` par défaut) ; note APPENDUE à
  l'insight, action du jour (tâche phare / bloc) **intacte**. Réemploi total (`sleepIns`, `doneToday`,
  `sleepFocusGuard`) — **zéro** nouvelle fonction pure.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test dédié) : focus en décrochage + 14 nuits à 8 h
  (durée OK) aux couchers alternés 22:00/03:00 (écart-type 150 min ≥ 60, tone 'attention' non urgent)
  → `bedtimeFocusGuard === 150`, `sleepFocusGuard === null`, note « couchers partent dans tous les
  sens (±150 min…) … horloge stable … Se coucher à heure fixe compte ici autant que le nombre
  d'heures », pas de « alimente ta concentration ». Coucher régulier (tous à 23:00) → `null` ;
  sommeil COURT (6 h) + irrégulier → tone urgent → pilier `sommeil`, `bedtimeFocusGuard` ET
  `sleepFocusGuard` `null` (jamais pilés) ; < 3 couchers → `null` ; bloc déjà posé aujourd'hui →
  `null`.
- Check smoke bloquant `coachFocus` étendu : focus × durée OK mais coucher irrégulier → note +
  `bedtimeFocusGuard === 150` & `sleepFocusGuard === null` ; coucher régulier → `null`, pas de note.
- `cd src && xvfb-run -a npm run verify` : **492 tests + smoke 100 % vert**.

## Suite possible

- Le **pendant côté SPORT/NUTRITION** du coucher irrégulier (irrégularité × récup/synthèse) — mais
  l'effet circadien est le plus net et le mieux documenté côté **cognitif** ; côté sport, le signal
  durée (`sleepTrainGuard`) porte déjà l'essentiel. À peser pour ne pas verser dans le remplissage.
- **Tendance** de régularité du coucher (`bedtimeRegularityTrend`, déjà pur+testé) × focus : « tes
  couchers se resserrent, ta concentration va suivre » quand la variance **baisse** — un renfort
  positif, pendant de `focusTrend` sur l'axe régularité.
- Autres croisements neufs restants : **hydratation × sport/focus**, **stress/readiness × nutrition**.
  Si à court d'idées à forte valeur : `docs/proposals/` plutôt que du remplissage.
