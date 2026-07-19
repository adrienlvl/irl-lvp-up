# 522 — Coaching : la protéine, matériau oublié des gains d'entraînement

**Build 2.0.153 · boucle #522 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`) est déjà très riche sur le pilier **sport** : il
lit la charge (ACWR), la forme du jour (readiness), le sommeil chronique (`sleepTrainGuard`, #513),
l'hydratation chronique (`hydrationTrainGuard`, #518) et la récupération active / mobilité
(`mobilityTrainGuard`, #521). Mais il restait **aveugle au MATÉRIAU même de la reconstruction
musculaire** : la protéine. La lecture des protéines n'existait **que** dans le pilier nutrition
(`proteinTrend`/`proteinStreak`, #500/#501). Or l'entraînement ne fait que **casser** le muscle
(microlésions) ; c'est la protéine alimentaire qui fournit les briques pour le reconstruire plus fort.
S'entraîner dur en mangeant chroniquement trop peu de protéines, c'est plafonner les gains de chaque
séance — le stimulus est là, le matériau manque. La note de sommeil citait déjà « synthèse protéique »
comme mécanisme, sans jamais nommer le substrat lui-même.

## Ce qui est livré

Nouveau champ **`proteinTrainGuard`** (nb de jours à la cible sur la fenêtre 7 j, `0` compris → toujours
`!= null` quand la note parle ; sinon `null`), **dernier maillon** du relais « socle / carburant / récup »
du pilier sport : **sommeil → hydratation → mobilité → protéine**. Une seule note récup/carburant par
jour ; la protéine ne parle **que** si les trois autres guards sont muets.

Conditions (données réelles seulement) :
- pilier poussé = **sport**, séance pas déjà faite (`!doneToday`) ;
- `sleepTrainGuard == null && hydrationTrainGuard == null && mobilityTrainGuard == null` (relais) ;
- entraînement **réellement actif** (`chosen.recentDays >= 2`, le stimulus est bien là) ;
- **profil renseigné** → cible via `proteinTarget(poids, objectif)`, exactement comme le pilier nutrition ;
- ≥ **3 jours** de protéines saisies (`protein > 0`) sur la fenêtre 7 j, agrégés au **max** par date ;
- cible atteinte sur **moins de la moitié** de ces jours (`onTarget * 2 < loggedDays` → manque
  **chronique**, pas un simple jour creux ; exactement la moitié → muet).

Note appendue à l'insight, action du jour (séance / charge / repos) intacte :

> « Et pense au matériau de tes gains : sur tes 4 derniers jours renseignés, tu n'atteins ta cible
> protéines (135 g) que 0/4 — or l'entraînement ne fait que casser le muscle, c'est la protéine qui
> fournit les briques pour le reconstruire plus fort, et sans elle en quantité suffisante chaque séance
> rend moins. Vise 135 g aujourd'hui, répartis sur tes repas. »

## Garde-fous & honnêteté

- **Vocabulaire distinct** (« le matériau de tes gains », « casser le muscle », « briques »,
  « reconstruire plus fort ») → zéro collision regex avec les autres notes sport (sommeil « socle
  invisible », hydratation « carburant qu'on oublie », mobilité « côté récupération ») ni avec la note
  protéines du pilier nutrition (« cible protéines », « régularité grimpe »).
- **Subtilité de la sélection du pilier** : des protéines chroniquement basses tirent la nutrition vers
  le focus. La note ne parle donc que quand le **sport reste le pilier choisi** malgré tout — typiquement
  un sport en léger décrochage mais encore actif (fix prioritaire), là où le manque de protéines est un
  frein réel aux gains sans être le sujet n°1 du jour.
- **Additif pur** : `proteinTrainGuard` toujours renvoyé, réemploi total (`daysAgo`, `proteinTarget`,
  `s.nutrition`/`s.profile`) — **zéro nouvelle fonction**. Rétrocompat : sans profil → `null`, rien
  d'ajouté.

## Vérification

- Test `logic.test.js` : cas fires (0/4), cible tenue (4/4 → null), pile la moitié (2/4 → null),
  < 3 jours, sans profil, séance faite, relais sommeil, relais mobilité.
- Check smoke **bloquant** `coachFocus` étendu (note présente + absente + non-collision).
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (499 tests, SMOKE OK, EXIT=0).
