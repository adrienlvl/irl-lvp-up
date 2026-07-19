# 521 — Coaching adaptatif : le pilier bien-être/mobilité, angle mort du coach

**Build 2.0.152 · boucle #521 · priorité de la nuit (Coaching adaptatif, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`) était devenu très riche : il croise sport,
focus, sommeil, nutrition (les 4 piliers), plus les habitudes (#520), les candidatures, la readiness
et le poids. Mais il restait **totalement aveugle à une source de données réelle et loggée** :
`s.wellnessDone`, le pilier **bien-être / mobilité** (onglet 💆, routines d'étirements/mobilité avec
séries, badges, familles). Le coach ne l'avait **jamais lu**.

Or côté SPORT, il lisait la charge (ACWR), la forme du jour (readiness), le sommeil et l'hydratation
chroniques — mais jamais la **récupération active**. Quand on s'entraîne régulièrement sans jamais
relâcher (mobilité, étirements), les tissus et articulations encaissent la charge sans contrepartie :
c'est le terrain des tensions et des blessures de surcharge qui s'installent en silence, et la
souplesse qui se perd bride l'amplitude donc la progression. Un frein réel, jamais nommé.

## Ce qui a été fait

Nouveau champ **`mobilityTrainGuard`** (nb de jours sans routine bien-être, ou `null`) — le pendant
**récupération** des « carburants » sommeil (`sleepTrainGuard`, #513) et hydratation
(`hydrationTrainGuard`, #514) sur la branche sport. Il s'append à l'insight quand — et seulement
quand — TOUS les critères sont réunis :

- le pilier poussé est le **SPORT** et la séance n'est pas déjà faite (`!doneToday`) ;
- l'entraînement est **réellement actif** ces jours-ci (`chosen.recentDays >= 2` : la charge est bien
  là, donc le manque de mobilité compte vraiment) ;
- **aucune note « carburant » n'a déjà parlé** (`sleepTrainGuard == null && hydrationTrainGuard == null`)
  → RELAIS : une seule note récup/carburant par jour, le sommeil prime, puis l'hydratation, puis la
  mobilité ;
- le suivi bien-être **existe mais a lapsé** : `wellnessInactivity(s.wellnessDone, todayKey, 4)`
  renvoie inactif ≥ 4 j.

> « Un dernier levier, côté récupération : ça fait 6 jours sans routine mobilité alors que tu
> t'entraînes régulièrement en ce moment — les tissus et articulations encaissent la charge sans
> jamais relâcher, et c'est le terrain des tensions et des blessures de surcharge qui s'installent en
> silence, sans compter la souplesse qui se perd et bride ton amplitude. 5 min de mobilité ou
> d'étirements aujourd'hui entretiennent ce capital et accélèrent la récup entre les séances. »

## Choix honnêtes

- **Convention « on ne tanne pas un débutant du pilier »** : `wellnessInactivity` renvoie
  `inactive:false` sur une liste vide → note muette pour qui n'a **jamais** touché au bien-être.
  Même convention que `renderWellnessNudge`/`renderWellnessZone` dans l'app. On ne nudge que sur un
  usage réellement lapsé.
- **Relais, jamais concurrent** : gated par `sleepTrainGuard == null && hydrationTrainGuard == null`
  → jamais deux notes récup/carburant le même jour ; le sommeil (combat documenté d'Adrien) reste
  primaire.
- **Vocabulaire distinct** (« côté récupération », « tissus et articulations », « s'installent en
  silence », « 5 min de mobilité ou d'étirements ») — zéro collision à l'œil ni en regex avec le
  « socle invisible » du sommeil ou le « carburant qu'on oublie » de l'hydratation.
- **Additif pur** : `mobilityTrainGuard` toujours renvoyé, note **appendue** à l'insight, l'action du
  jour (séance / charge / repos) intacte, l'alternance (`return` en amont) jamais touchée. Réemploi
  total de `wellnessInactivity` — **zéro** nouvelle fonction. Rien supprimé ni cassé.

## Vérif

`cd src && xvfb-run -a npm run verify` → 100 % vert. 498 tests node (dont 1 nouveau test coach
dédié : lapsé / frais / jamais-fait / séance faite / relais sommeil) + smoke `coachFocus` étendu
(3 checks bloquants : lapsé, frais, jamais-fait) + lint.
