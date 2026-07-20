# #616 — Mesure P5 : pilier athlète / readiness sondé au fuzzer → propre (sans bump)

## Contexte / choix de la boucle

Priorité de nuit = **coaching à fond** (`docs/DEMANDES.md`), mais §3 soumet le domaine `coach` à la
**rotation §4 bis** comme les autres. Contrôle des 5 derniers recaps avant de coder :

```
615 sommeil · 614 coach · 613 etudes · 612 coach · 611 nutrition
```

→ `coach` (2× dans les 5, dont un des 2 derniers) **et** `sommeil` (dans les 2 derniers) sont
**bloqués**. Le backlog **nommé** de la ROADMAP (P1→P7) est **entièrement coché**. Domaine frais
retenu : **`athlete`** (absent des 5 derniers), qui recoupe le **mandat coaching élite** (muscu /
course). Méthode retenue : **P5 — mesurer avant de supposer** (celle qui a marché en #548/#575/#615),
plutôt que d'inventer une tâche.

## Ce qui a été vérifié (grep + lecture + fuzzer)

**1. Angle « interférence entraînement concurrent » (muscu + course) — déjà couvert, écarté.**
Le mandat élite pointe l'interférence (Wilson 2012, Hickson) comme science manquante possible. Vérifié :
le **séquençage** est déjà traité (muscu matin 08:00 / course soir 18:00, CHANGELOG 2.0.209 ;
`buildTrainingWeek` option `sameDay` « espace-les de quelques heures » ; `weekTrainingBalance` +
barre d'équilibre) et la **charge concurrente** l'est aussi (`acuteChronicRatio`/`loadAdvice`,
`deloadRecommendation` #608, course polarisée 80/20 #601). Une carte « interférence » serait de la
**redondance §3**, pas de la valeur — donc **non ajoutée**.

**2. Faux départ écarté : `weekTrainingBalance` et le repli legacy `w.exercise`.**
La fonction ne lit pas `w.exercise` (repli mono-exercice) là où ses sœurs le font. Vérifié dans le
modèle de données : ce **n'est pas** un défaut — les séances muscu legacy portent `type:'strength'`
(select `#workoutType` historique), capté par la branche `|| w.type === 'strength'`. Le repli
`w.exercise` des sœurs sert à extraire le **contenu** (zones/charges), pas à **classer** la séance.

**3. Fuzzer (~14 000 tirages) sur `strengthForecast`, `progressionSuggestion`,
`readinessScore/Limiter/Driver`.** Deux « anomalies » remontées se sont révélées **conformes**,
trois pointaient vers le coach — **gardé** :
- `progressionSuggestion` suggérant 3 → 4 reps alors que `minReps = 7` : **correct** — quand le dernier
  perf est **sous** la fourchette, ajouter une rep pour remonter vers la cible est le bon geste (pas un
  bug de bornes, mon assertion était trop stricte).
- `strengthForecast` extrapolant > 15 kg/sem sur une série **bruitée** générée aléatoirement :
  projection linéaire premier→dernier point, rugueuse **par nature** sur données synthétiques ; les
  vraies séries de 1RM estimé sont bien plus lisses. Pas de correctif justifié.
- `readinessLimiter` **et** `readinessDriver` non nuls le même jour, ou driver à readiness basse /
  limiter à readiness haute : les **helpers purs** sont volontairement **généraux** (ils nomment le
  frein/moteur dominant sans se soucier du niveau global). Le **garde-fou vit chez l'appelant** : dans
  `adaptiveCoachFocus`, **tous** les usages sont gardés par le score —
  driver derrière `rs.score >= 75` (`logic.js:5706, 5805, 5926`), limiter derrière `rs.score < 50`
  ou `< 75` (`:5731, 5904`). Les cas « contradictoires » du fuzzer **n'atteignent jamais** ces
  branches. Aucune contradiction ne parvient au rendu.

## Conclusion

**Aucun défaut, aucune capacité neuve à forte valeur non redondante** sur le pilier athlète/readiness
ce tour. Résultat **négatif assumé** (§4 bis.5 / P5 : « un résultat négatif est un résultat »),
documenté pour éviter qu'une boucle future re-laboure ces fonctions et re-fuzz ces mêmes cibles. Le
point non évident à retenir : **le score-gating driver/limiter est chez l'appelant (le coach), pas
dans les helpers purs** — ne pas conclure au bug en lisant `readinessDriver`/`readinessLimiter` isolés.

## Versionnage / verify

**Pas de bump** (aucun effet utilisateur — recap seul, §2.6). `npm test` : **563 tests verts**
(base inchangée ; aucun fichier `src/` touché → renderer non impacté).

Domaine : robustesse
</content>
</invoke>
