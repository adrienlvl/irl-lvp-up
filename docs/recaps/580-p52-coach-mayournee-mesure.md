# #580 — P5.2 : cohérence coach ↔ « Ma journée » mesurée + piste coach vérifiée (mesure, pas de bump)

**Domaine : docs** · pas de bump (aucun code touché) · mesure + piste vérifiée documentée.

## Rotation (§4 bis.3)

5 derniers domaines (mtime, avant cette boucle) = `coach · a11y · docs · coach · athlete`
(#579 · #578 · #577 · #576 · #575).
- `coach` (priorité de nuit #1) : dans le dernier recap (#579) **et** 2× sur 5 (#579, #576) →
  **interdit** (§3 : la rotation prime même sur la demande de nuit).
- `a11y` : dans les 2 derniers recaps (#578) → **interdit**.
- `docs` : 1× (#577), **hors des 2 derniers** → autorisé. Le livrable de cette boucle **est** de la
  documentation (recap + piste mémoire), aucun code changé → tag honnête.

Quota §4 bis.4 : `docs/proposals/` a changé au sein des 10 derniers recaps (#574, proposition
Sécurité) → quota **non** déclenché.

Priorité de nuit #1 (coaching) rotation-bloquée → 2ᵉ demande d'Adrien (**avancer CAP 3.0 / cohérence**),
tâche nommée **P5.2** — dernier angle ouvert : **coach ↔ « Ma journée »** (`renderMyDay` /
`upcomingKeyDates`), explicitement marqué « non encore fuzzé » en #577.

## Méthode P5 : mesurer, pas supposer

« Ma journée » (`renderMyDay`) est d'abord un **planning factuel** (blocs du jour, chips d'échéance,
prochaine révision, aperçu de demain), pas une surface de conseils — les seuls angles de friction avec
le coach sont donc **factuels** (mêmes données, sélecteurs cohérents ?) et le **radotage** (le coach
pousse-t-il un geste déjà posé et visible « fait ✓ » dans Ma journée ?). Trois fuzzers déterministes
(jetables, non commités), ~120 000 états au total :

1. **Exam/révision — 20 000 états.** Compare la 1re chip d'échéance de Ma journée
   (`upcomingKeyDates`, épreuve à venir la plus proche) au rappel d'examen du coach
   (`attentionDigest` clé `exam` → `examCountdown` → `nearestExam`), et vérifie que
   `nextStudySession` ne pointe jamais une révision passée. **0 divergence / 20 000.** Cohérence par
   construction : `normalizeState` peuple toujours `examGoals` depuis le legacy `examGoal` (migration
   P6.1), donc la divergence de source apparente entre `attentionDigest`
   (`examGoals.length ? examGoals : examGoal`) et `renderMyDay` (`examGoals` seul) **ne se manifeste
   jamais au runtime** ; les deux surfaces prennent la même « épreuve la plus proche » via des
   sélecteurs alignés.

2. **Sport « déjà fait aujourd'hui » — 40 000 états.** Cherche un coach qui pousse « fais une séance
   aujourd'hui » alors qu'une séance est loggée le jour même (visible « fait ✓ » dans Ma journée).
   **Déjà couvert** par le crédit `doneToday` (v2.0.100, `logic.js:7235`) qui réécrit l'action sport
   en « Séance déjà faite aujourd'hui 💪 — verrouille avec 5 min d'étirements… ». Aucune réécriture
   d'`action` après cette ligne (grep 7239→7800) → le crédit est final.

3. **Tous piliers × radotage — 60 000 états.** Généralise l'angle 2 aux 4 piliers et à tous les tons,
   en excluant les messages de crédit corrects. **1 080 cas résiduels remontés** — tous du même type
   (voir ci-dessous).

## Constat 1 (négatif, un résultat quand même) : coach ↔ Ma journée FACTUELLEMENT cohérent

Sur l'axe partagé exam/révision et sur le crédit sport-du-jour, aucune contradiction inter-panneaux du
type #575/#577 (directives opposées). « Ma journée » n'émet pas de directive qui puisse s'opposer au
coach ; les faits (épreuve la plus proche, prochaine révision) sont tirés des mêmes sélecteurs. **Angle
coach ↔ « Ma journée » : cohérent.** Avec l'angle coach ↔ Bilan hebdo (contradiction trouvée #577,
corrigée #579), **les deux angles de P5.2 sont désormais mesurés.**

## Constat 2 (piste coach VÉRIFIÉE) : l'action `reinforce` radote un geste déjà fait sur nutrition/sommeil

Le fuzzer 3 a fait sortir un **défaut coach-interne réel et reproductible** : en ton `reinforce`,
l'action générique est « **Encore un jour actif aujourd'hui pour ancrer l'habitude.** »
(`logic.js:5255`). Le crédit `doneToday` qui neutralise ce radotage n'est calculé que pour **sport et
focus** (`logic.js:6222-6226` : `if (chosen.pillar === 'sport' || chosen.pillar === 'focus')`) → pour
les piliers **nutrition** et **sommeil**, un jour où le geste est **déjà posé** (entrée active datée du
jour), le coach ordonne quand même « fais un jour actif aujourd'hui » — l'ordre déjà exécuté que le
changelog v2.0.100 promettait de ne plus répéter.

État repro déterministe (nutrition en hausse réelle — 4 jours cette semaine dont **aujourd'hui**, vs 2
la précédente → `reinforce`) :

```
pillar: nutrition | tone: reinforce
insight : « 4 jours actifs cette semaine, en hausse. Garde le rythme. »
ACTION  : « Encore un jour actif aujourd'hui pour ancrer l'habitude. »
(nutrition loggée aujourd'hui = true)
```

Nuance importante (à respecter pour le futur fix, §4 ter) : le crédit `doneToday` a été **volontairement**
restreint à sport/focus (changelog v2.0.100 : « Sommeil et nutrition gardent leur conseil du jour — le
coucher de ce soir, la cible protéines — eux ne sont pas déjà bouclés pour autant »). Ce raisonnement
vaut pour l'**action PILIER** (« vise un coucher plus tôt », « renseigne tes protéines »), qui reste
prospective. Mais en ton `reinforce` l'action n'est **pas** l'action pilier : c'est le générique « encore
un jour actif aujourd'hui », qui parle d'un **jour actif** — et ce jour actif EST déjà acquis. Le fix
juste ne touche donc **que** ce cas : `reinforce` + pilier nutrition/sommeil + entrée active du jour →
créditer au lieu de pousser (p. ex. « Déjà noté aujourd'hui ✅ — belle régularité »), sans réactiver le
crédit sur l'action pilier prospective des tons rebuild/revive.

**Fix = domaine `coach` → rotation-bloqué cette boucle.** Piste **vérifiée documentée** (ce recap +
mémoire [[coach-leads-contradictions-2guards]]) pour la prochaine boucle coach-ouverte, exactement comme
#577 a documenté avant #579 (§5 : une piste vérifiée vaut mieux qu'un commit rotation-violant). Aucun
code touché, fuzzers supprimés.

## Résultat

- P5.2 : les deux angles (Bilan hebdo, Ma journée) sont mesurés. Ma journée **factuellement cohérent** ;
  une **piste coach vérifiée** (reinforce radote nutrition/sommeil) en réserve pour la prochaine boucle
  `coach`.
- Aucun code touché → **pas de bump**. `verify` inchangé (rien à casser).

_Domaine : docs_
