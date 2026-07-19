# 523 — Coaching : fêter un palier de série d'habitude franchi aujourd'hui

**Build 2.0.154 · boucle #523 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`) savait **avertir** qu'une chaîne d'habitude
allait tomber (`habitAtRisk`, #520 : « Ne casse pas la chaîne… »), mais jamais **célébrer** qu'une
chaîne vient d'atteindre un jalon. Or les additions récentes étaient **toutes des alertes de
déficit** : guards sommeil (#513), hydratation (#518), mobilité (#521), protéine (#522), plus
`habitAtRisk` — le coach glissait vers le tout-correctif. La demande de la nuit réclame pourtant
explicitement « adaptation dynamique aux **progrès** ET aux écarts » et « ton RPG **motivant** ». Le
recap #520 pointait déjà ce lead : « féliciter un palier de série d'habitude franchi aujourd'hui
(le pendant positif de `habitAtRisk`) ».

Franchir un palier (3, 7, 14, 30… jours) sur une habitude est un renforcement positif à forte
valeur : aversion à la perte × fierté du progrès, sur une **donnée réelle** (la série d'une habitude
cochée ce jour) — pas une note de remplissage.

## Ce qui est livré

Nouveau champ **`habitMilestone`** (`{ name, streak }` ou `null`), **pendant positif** de
`habitAtRisk`. Réutilise `habitsForDay` (déjà testé : habitudes **prévues ce jour** → `{done, streak}`)
et l'échelle **existante** `STREAK_MILESTONES` (3, 7, 14, 30, 60, 100, 180, 365) — aucune nouvelle
échelle, **zéro nouvelle fonction**.

Conditions : parmi les habitudes prévues aujourd'hui, on garde celles **cochées ce jour** (`done`)
dont la **série tombe pile sur un palier**. On nomme la **plus haute** (la plus impressionnante) :

> « 🏆 Chaîne au sommet : ton habitude « Lecture » atteint une semaine complète (7 jours consécutifs)
> aujourd'hui — un vrai palier, l'automatisme s'installe. Savoure et enchaîne le prochain maillon. »

Libellé nommé pour les gros jalons (`une semaine complète`, `deux semaines pleines`, `un mois
entier`, `deux mois`, `cent jours`, `six mois`, `une année entière`), sinon « N jours consécutifs ».

## Garde-fous & honnêteté

- **Ne se répète pas.** Une habitude cochée dont la série vaut exactement un palier ne le franchit
  qu'**une fois** : le lendemain la série vaut palier+1 (hors liste). Pas de célébration en boucle.
- **Disjoint de `habitAtRisk`.** `habitMilestone` ne parle que sur des habitudes **cochées**
  aujourd'hui, `habitAtRisk` sur des habitudes **non cochées** — mutuellement exclusifs par habitude.
  Les deux peuvent parler le même jour sur des habitudes différentes, sans se contredire.
- **Vocabulaire distinct** (« Chaîne au sommet », « atteint … jours consécutifs », « l'automatisme
  s'installe ») → zéro collision à l'œil ni en regex avec `habitAtRisk` (« Ne casse pas la chaîne »,
  « tient depuis »), `completeDayMilestone` (« Palier franchi … journées pleines »), `streakRecordReach`
  (« bats ton record perso ») ni `streakRebuild` (« Tu reconstruis »).
- **Additif pur.** `habitMilestone` TOUJOURS renvoyé (`null` par défaut), note **appendue** à
  l'insight, action du jour intacte, alternance (`return` en amont) jamais touchée. Réemploi total de
  `habitsForDay` — **zéro** nouvelle fonction.

## Vérification

- Test `logic.test.js` dédié : palier 3 (14-15-16 cochée le 16) → `{Lecture, 3}` + note ; série 4
  (hors palier) → `null`, pas de note ; palier 7 → libellé « une semaine complète (7 jours
  consécutifs) » ; non cochée aujourd'hui → muet ; deux habitudes au palier → la plus haute (7) ;
  aucune habitude → `null`.
- Check smoke **bloquant** `coachFocus` étendu : palier 3 → note + champ ; hors palier → `null` sans
  note ; non cochée → muet.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (500 tests, SMOKE OK, EXIT=0).
