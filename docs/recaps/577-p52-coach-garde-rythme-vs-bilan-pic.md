# #577 — P5.2 : le coach dit « Garde le rythme » quand le Bilan hebdo dit « allège » (mesure, pas de bump)

**Domaine : docs** · pas de bump (aucun code touché) · mesure + piste vérifiée documentée.

## Rotation (§4 bis.3)

5 derniers domaines (avant cette boucle) = `coach · athlete · fondations · coach · robustesse`
(#576 · #575 · #574 · #573 · #572).
- `coach` (priorité de nuit #1) : dans le dernier recap (#576) **et** 2× sur 5 (#576, #573) →
  **interdit** (§3 : la rotation prime même sur la demande de nuit).
- `athlete` : dans les 2 derniers recaps (#575) → **interdit**.
- `docs` : **absent des 5 derniers** → autorisé. Le livrable de cette boucle **est** de la
  documentation (recap + piste mémoire), aucun code changé → tag honnête.

Quota §4 bis.4 : `docs/proposals/` a changé au sein des 10 derniers recaps (#574, proposition
Sécurité) → quota **non** déclenché.

Priorité de nuit #1 (coaching) rotation-bloquée → 2ᵉ demande d'Adrien (**avancer CAP 3.0 / cohérence**),
tâche nommée **P5.2** (« Cohérence des conseils entre panneaux : un même jour, le coach, « Ma journée »
et la revue hebdo peuvent-ils se contredire ? Fuzzer et comparer »).

## Méthode P5 : mesurer, pas supposer

Fuzzer de ~8 000 états déterministes-aléatoires (charge : 4 semaines légères + 1 semaine courante
lourde ou légère ; readiness haute/basse ; objectifs hebdo variés ; historique de sommeil). Pour chaque
état, le **même jour** : `adaptiveCoachFocus` (carte « Le focus du moment »), `weeklyInsights` (« Bilan
hebdo » de la page Athlète) et `attentionDigest` (« À rattraper » de l'accueil), scannés pour des
directives **opposées** (pousser vs alléger).

Après filtrage des faux positifs du détecteur (l'**action** du coach dit souvent déjà « allège » tandis
que seule l'**injonction de l'insight** — « Garde le rythme. » — reste à pousser : c'est le trou
coach-interne visé par #576, pas une contradiction inter-panneaux), il reste **une** vraie contradiction
inter-panneaux, reproductible.

## La contradiction vérifiée : coach « Garde le rythme » vs Bilan hebdo « Charge en pic »

État repro déterministe (chronic bas + semaine courante lourde **avec une séance faite aujourd'hui**) :

```
ACWR: { ratio: 3.71, zone: 'high' }

COACH [reinforce / sport]
  insight : « 3 jours actifs cette semaine, en hausse. Garde le rythme. Objectif hebdo déjà tenu :
             3/3 séances 💪 … »
  action  : « Séance déjà faite aujourd'hui 💪 — verrouille avec 5 min d'étirements … »
  loadSpike: null   readinessSlide: null

BILAN HEBDO
  ✅ 3/3 séances — objectif atteint, bravo !
  🟥 Charge en pic (ACWR 3.71) : prévois une semaine plus légère pour éviter la blessure.
```

Le coach **pousse** (« Garde le rythme. ») pendant que le Bilan hebdo, sur la même journée, ordonne
d'**alléger** (« Charge en pic … semaine plus légère »). C'est exactement le type de contradiction
inter-panneaux que P5.2 cherchait.

## Cause racine (pour la boucle qui corrigera)

`weeklyInsights` calcule l'ACWR **inconditionnellement** (`logic.js:2462`,
`acuteChronicRatio(s.workouts, todayKey)`) → l'alerte 🟥 sort dès que `zone === 'high'`.

Le coach, lui, ne calcule `loadSpike` (et donc ne retire « Garde le rythme. » via le strip #576,
`logic.js:6353`) **que** sous la garde `logic.js:6299` :

```
if (chosen.pillar === 'sport' && !doneToday && (readiness == null || readiness >= 50) && …)
```

Donc dès que **la séance du jour est déjà faite** (`doneToday`), ou que le pilier choisi n'est pas le
sport, `loadSpike` reste `null` → le strip #576 ne s'exécute pas → « Garde le rythme. » **survit** dans
l'insight, en contradiction avec le Bilan hebdo qui, lui, voit toujours le pic. Le cas `doneToday` est
le plus courant : un jour de pic de charge est souvent un jour **où l'on vient de s'entraîner**.

`readiness < 50` produit le même trou côté strip #573 (`logic.js`, readiness plancher) — déjà couvert
pour « Garde le rythme. » par le strip readiness, mais le constat « en hausse » demeure ; c'est un angle
secondaire, la branche `doneToday` est le défaut net.

## Piste de correctif (à appliquer quand `coach` sera rotation-ouvert)

Découpler le retrait de « Garde le rythme. » de la garde de **prescription** sport. Idée minimale
(curation, pas ajout — §3) : quand `tone === 'reinforce'`, calculer l'ACWR (ou réutiliser un
`loadSpiking` déjà disponible) **indépendamment** de `pillar/doneToday/readiness`, et si `zone ===
'high'`, retirer « Garde le rythme. » de l'insight — pour ne jamais pousser un jour que le Bilan hebdo
qualifie de pic. Vérifier la non-régression : une montée **saine** (ACWR non-pic) garde son « Garde le
rythme. » (comme #576). Contrôle §4 ter obligatoire (rendu cumulé coach + Bilan relu ensemble).

**Non appliqué ici** : le fix vit dans `adaptiveCoachFocus` → domaine `coach`, interdit par la rotation
cette boucle. Per §5, une piste **vérifiée et documentée** vaut mieux qu'un commit rotation-violant ou
inventé. Sauvegardée aussi en mémoire (`coach-leads-contradictions-2guards`) pour la prochaine boucle
coach-ouverte.

## Statut P5.2

Angle **coach ↔ Bilan hebdo** : mesuré, **une** contradiction réelle trouvée (ci-dessus), fix en attente
de rotation `coach`. Angle **coach ↔ « Ma journée »** (`renderMyDay`/`upcomingKeyDates`, domaine agenda) :
non encore fuzzé — reste ouvert pour une future mesure. P5.2 **reste décoché**.

Aucun code touché → pas de verify requis (§2.6), pas de bump. Recap #577.

_Domaine : docs_
