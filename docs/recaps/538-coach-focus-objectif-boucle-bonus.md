# 538 — Coaching : le coach cadre le bloc de plus comme du PUR BONUS quand l'objectif focus est déjà bouclé (focusGoalBonus)

**Build 2.0.169 · boucle #538 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) lit finement la forme du jour
sur la branche d'objectif focus **non tenu** : allure serrée × vert → fonce (`focusGoalFresh`),
allure large × vert → prends de l'avance (`focusGoalAhead`, #535), zone médiane
(`focusGoalSteady`, #534), conflit (`focusGoalDrained`). Mais dès que l'objectif hebdo est **déjà
atteint** (`fw.status === 'done'`), il retombait sur le seul « Objectif hebdo atteint : 130/120 min
💪 » historique — **muet sur la forme du jour**. Un matin où l'objectif est bouclé ET la tête au
vert, le coach ne disait rien du bon geste possible.

Les recaps #536 **et** #537 signalaient tous deux cette suite : « un mot bref quand l'objectif
hebdo est **déjà tenu** ET que la readiness est au vert : cadrer toute séance/bloc de plus comme du
**pur bonus** sans pression. »

**Pourquoi le cadrage `focusGoalAhead` ne convient pas ici.** `focusGoalAhead` invite à « prendre de
l'avance » parce qu'il **reste un objectif à sécuriser** : un bloc engrangé fait un coussin qui met
la cible à l'abri. Quand l'objectif est **déjà bouclé**, il n'y a plus rien à sécuriser cette
semaine → parler d'avance ou pousser serait à côté. Le cadrage juste est **pur bonus, zéro
pression** : à faire par envie, sans culpabilité.

## Ce qui est livré

Nouveau champ **`focusGoalBonus`** (le score du jour, ou `null`, **toujours** renvoyé). Quand
l'objectif focus est **atteint** (`status === 'done'`) ET qu'un check-in de récup **du jour** met la
forme **au vert** (readiness ≥ 75), le coach cadre honnêtement, **appendu au « atteint 💪 »** :

> Objectif bouclé et la forme est au rendez-vous ce matin (readiness 100/100) : plus aucune cible à
> tenir — un bloc de plus serait du pur bonus, sans la moindre pression, juste un peu d'avance
> offerte à ta semaine prochaine si l'envie te prend.

Ni injonction, ni « prendre de l'avance » : l'objectif est tenu, donc tout bloc de plus est **du pur
bonus**. C'est le ton RPG motivant **sans culpabilité** (« si l'envie te prend »), et ça reconnaît le
**PROGRÈS** (objectif bouclé) au lieu de le laisser muet.

## Garde-fous & honnêteté

- **Au vert SEULEMENT.** On ne parle qu'à readiness ≥ 75. Objectif bouclé × tête moyenne (60) ou
  basse → aucun mot : l'objectif est tenu, inutile de pousser un bloc de plus sur une tête moyenne.
  (Testé : 6/3/3 → 60 → `focusGoalBonus` null.)
- **Données réelles.** Exige un check-in de récup **du jour** ; sans check-in → `focusGoalBonus`
  null, la note ne s'affiche pas. (Testé.)
- **Mutuellement exclusif** de toutes les notes d'allure (`focusGoalFresh`/`Drained`/`Steady`/`Ahead`)
  par construction : branche `status === 'done'` vs `behind`. (Testé : `ahead`/`fresh` non tenus →
  `focusGoalBonus` null.)
- **Côté SPORT, on s'abstient volontairement.** L'action readiness sport pousse déjà « monte
  l'intensité » au vert ; un « bonus sans pression » brouillerait ce message. Le recap #537 avait
  signalé ce risque — piste laissée ouverte.
- **Affine, ne remplace pas.** Note **appendue** au « atteint 💪 » ; l'action du jour reste intacte.
- **Vocabulaire distinct** (« objectif bouclé », « pur bonus », « au rendez-vous ce matin ») → zéro
  collision à l'œil ni en regex avec `focusGoalAhead` (« ta tête est claire ce matin », « prendre de
  l'avance »), `focusGoalFresh` (« au vert ce matin »), `focusGoalSteady` (« tient la route ce
  matin ») ni `focusGoalDrained` (« à plat ce matin »).
- **Zéro nouvelle fonction.** Réemploi de `readinessScore` déjà utilisé partout dans la fonction.

## Vérification

- Tests `logic.test.js` (bloc allure focus) : objectif bouclé (140/120) × readiness 100 (8/1/1) →
  `focusGoalBonus === 100`, pilier focus conservé, notes « au rendez-vous ce matin (readiness
  100/100) » + « un bloc de plus serait du pur bonus, sans la moindre pression » présentes ;
  exclusions : objectif bouclé sans check-in → null, objectif bouclé × moyen (60) → null, objectif
  non tenu (`ahead`/`fresh`) × vert → null.
- Check smoke **bloquant** `coachFocus` étendu (`fBonus`, `fBonusMid`) : `focusGoalBonus === 100` +
  notes présentes en objectif bouclé au vert ; null en zone moyenne.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (511 tests node, SMOKE OK, EXIT=0).

## Suite possible

- Côté **sport**, le pendant « objectif de séances déjà tenu × readiness au vert → séance bonus »
  reste ouvert, mais délicat : ne pas contredire l'action readiness (« monte l'intensité »). Le
  cadrer « séance bonus libre, pur plaisir » plutôt que « douceur », et vérifier qu'il ne double pas
  le feu vert que le coach sport sert déjà.
- Nommer le **moteur** dominant du check-in (`readinessDriver`) sur `focusGoalBonus`, comme
  `focusAheadDriver` (#537) le fait sur l'avance — mais le gain est plus faible ici (aucun objectif à
  tenir, donc moins d'intérêt à ancrer un bon geste à répéter).
