# 524 — Coaching : le coach dit enfin QUOI travailler (groupe musculaire du jour)

**Build 2.0.155** · boucle #524 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) savait dire, sur le pilier SPORT,
**DE** s'entraîner (« Programme une séance courte aujourd'hui, même 20 min ») et, depuis #… , **QUAND**
la caler (`sportSlot` : créneau libre du jour). Mais jamais **QUOI** travailler. Or l'app possède déjà
tout le nécessaire — `suggestTrainingFocus(workouts, todayKey)` classe les 7 groupes musculaires par
priorité = **repos** (jours depuis la dernière fois) + **déficit** vers le minimum hebdo de 10 séries,
en **écartant** ceux travaillés il y a < 2 j (pas encore récupérés). Cette intelligence n'était
exploitée que dans l'onglet Athlète, jamais par le coach quotidien. Résultat : une recommandation sport
générique, alors que les données réelles savent exactement quel muscle est le plus reposé et le moins
servi cette semaine.

## Le geste (additif pur)

Nouveau champ **`sportZoneFocus`** (`{ zone, days, sets }` ou `null`, **toujours** renvoyé) : quand le
coach pilote sur le SPORT, la séance du jour pas déjà faite, et qu'une **vraie** séance est encouragée,
il nomme le groupe à cibler EN PRIORITÉ dans l'**action** :

- Groupe reposé : « Et cible en priorité **les jambes** : c'est ton groupe le plus reposé (rien depuis
  10 j, 0 série cette semaine) — de quoi équilibrer ta semaine. »
- Groupe jamais ciblé (mais historique ailleurs) : « … un groupe que tu n'as encore jamais ciblé ici —
  le bon jour pour l'inaugurer et équilibrer ta semaine. »

### Gates (honnêteté + non-contradiction)

Même gate que `sportSlot` : pilier SPORT · séance pas déjà faite (`!doneToday`) · pas de ré-amorçage
dormant (`!reviveEligible`) · pas de spike de charge (`loadSpike == null`) · readiness pas au rouge
(`null` ou ≥ 50). On ne désigne un groupe à **charger** que quand une vraie séance a du sens — jamais un
jour récup, un micro-pas ou une reprise dormante. **Muet** tant qu'aucun exercice **nommé** n'a jamais
été loggé (`zoneFreshness` tout en `'never'` → on ne devine pas une zone sans données).

## Vocabulaire / anti-collision

« groupe le plus reposé », « cible en priorité », « équilibrer ta semaine » — zéro collision regex avec
`sportSlot` (« cale ta séance ») ni les guards récup (« socle invisible », « carburant », « matériau »,
« côté récupération »).

## Réemploi total

`suggestTrainingFocus`, `zoneFreshness`, `TRAINING_GOALS` (labels FR locaux dédiés à la phrase) —
**zéro** nouvelle fonction. Note **appendée** à l'action, aucune branche existante touchée.

## Vérif

- Fonctions pures testées : `logic.test.js` — nouveau test (zone reposée, zone inédite « inaugurer »,
  muet sans exercice nommé, séance faite → null, readiness rouge → null, autre pilier → null).
- Check smoke **bloquant** `coachFocus` étendu (zone reposée nommée + muet sans historique + séance
  faite → null).
- `xvfb-run -a npm run verify` : **501/501 node + smoke OK**.
