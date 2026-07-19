# 534 — Coaching : le coach comble la zone MÉDIANE focus, un mot honnête les jours moyens (focusGoalSteady)

**Build 2.0.165 · boucle #534 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Depuis #509/#510, quand la semaine de deep work est **serrée** (allure focus « cale un vrai bloc
aujourd'hui »), le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) sait parler des
**deux extrêmes** de la forme du jour : readiness au **vert** (≥ 75 → `focusGoalFresh`, « c'est LE
moment de pousser », enrichi du moteur `focusFreshDriver` en #532) et readiness au **plancher**
(< 50 → `focusGoalDrained`, « focus court, soigne ta récup », enrichi du frein `focusDrainDriver`
en #533). Mais **entre les deux** — une readiness simplement **correcte** (50 ≤ score < 75), soit la
**majorité des jours** — le coach restait totalement **muet** sur l'état de la tête. Le recap #533
signalait lui-même ce trou : « la zone médiane focus, aujourd'hui muette de tout commentaire de
forme — un mot honnête sur *forme correcte, cale un bloc mesuré* pourrait combler ce trou sans
surpromettre. » Le côté SPORT, lui, couvre déjà sa zone médiane depuis longtemps (« Readiness X/100
— séance correcte, mais garde une marge : pas de record aujourd'hui »). Le focus méritait son pendant.

## Ce qui est livré

Nouveau champ **`focusGoalSteady`** (le score du jour, ou `null`, **toujours** renvoyé). Quand
l'allure focus est **serrée** et qu'un check-in de récup **daté du jour** met la forme dans la
**zone médiane** (50 ≤ readiness < 75), le coach comble le silence d'un mot **honnête et calibré**,
**appendu à l'insight** :

> Ta forme tient la route ce matin (readiness 60/100) sans être au top : cale un bloc mesuré — tiens
> la cible du jour sans forcer un marathon de deep work, un bloc net et régulier fait avancer
> l'objectif sans creuser la fatigue.

C'est le pendant EXACT, côté FOCUS, du « séance correcte, mais garde une marge » que le coach SPORT
sert déjà dans sa zone médiane. La symétrie forme-du-jour côté focus est désormais **complète sur
les trois zones** : vert (`focusGoalFresh`), médiane (`focusGoalSteady`), plancher
(`focusGoalDrained`).

## Garde-fous & honnêteté

- **Ni surpromesse, ni dramatisation.** On n'encourage pas à foncer (readiness pas au vert → « c'est
  LE moment de pousser » serait malhonnête) ni ne dramatise la récup (readiness pas au plancher →
  « soigne ta récup » serait excessif un jour moyen). Juste un cadrage réaliste : bloc **mesuré**,
  régularité > exploit.
- **Mutuellement exclusif** de `focusGoalFresh` (≥ 75) et `focusGoalDrained` (< 50) par construction
  (la branche `else if (rs.score >= 50)` ne s'atteint qu'après avoir écarté ≥ 75 et < 50 → exactement
  50 ≤ score < 75).
- **Données réelles seulement.** Exige un check-in de récup **du jour** ET un objectif focus rendu
  serré par le calendrier. Objectif large (`onpace`) → `focusGoalSteady` null.
- **Affine, ne remplace pas.** Note **appendue** à l'insight ; l'action du jour reste intacte.
- **Vocabulaire distinct** (« Ta forme tient la route ce matin ») → zéro collision à l'œil ni en
  regex avec « ta forme est au vert ce matin » (fresh) ni « ta forme est à plat ce matin » (drained).
- **Zéro nouvelle fonction.** Réemploi total de `readinessScore` déjà lu dans la branche.

## Vérification

- Test `logic.test.js` (bloc allure focus) : zone médiane (sleep 6/fat 3/sore 3 → score 60) →
  `focusGoalSteady === 60`, note « tient la route ce matin (readiness 60/100) sans être au top » +
  « cale un bloc mesuré » présentes. Exclusion mutuelle : au vert (`fresh`) → steady null, à plat
  (`tired`) → steady null, objectif large (`onpace`) → steady null, note « tient la route » absente
  dans ces trois cas.
- Check smoke **bloquant** `coachFocus` étendu (`fFocusMid`) : `focusGoalSteady === 60`, insight
  contient « Ta forme tient la route ce matin (readiness 60/100) sans être au top » et « cale un bloc
  mesuré ».
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (510 tests node, SMOKE OK, EXIT=0).

## Suite possible

La forme-du-jour côté focus est désormais couverte sur les trois zones dans la branche serrée. Piste :
la même zone médiane pourrait, comme le vert et le plancher, **nommer le facteur** dominant du
check-in (un `readinessDriver`/`readinessLimiter` léger) — mais un jour moyen n'a par définition ni
moteur ni frein qui domine nettement, donc rester au cadrage simple est probablement le plus honnête.
Autre piste : symétriser côté focus **onpace** (objectif large) un mot bref quand la forme est au top
(« marge sur l'objectif ET tête fraîche → avance dessus tant que c'est facile »).
