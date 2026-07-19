# 540 — Coaching : le coach te fait lever le pied quand le cerveau est à plat mais que l'objectif focus est dans les temps (focusMarginDrained)

**Build 2.0.171 · boucle #540 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) lit finement la forme du jour
sur la branche d'allure focus **serrée** (`tight`, perDay > 60) — les trois zones y sont couvertes :
readiness au vert → `focusGoalFresh` (« c'est LE moment de pousser »), à plat → `focusGoalDrained`
(« un focus court, soigne ta récup »), médiane → `focusGoalSteady` (« cale un bloc mesuré »). Mais la
branche d'allure **large** (`onpace`, « tu as la marge ») ne lisait la forme **qu'au vert** :
`focusGoalAhead` (#535, readiness ≥ 75 → « prends de l'avance »). En dessous, **rien**.

Résultat, le trou : un matin où l'objectif focus est **confortablement dans les temps** ET où
l'esprit est **à plat** (readiness < 50), la branche `onpace` restait **muette** — et l'action
générique invitait quand même à un vrai bloc (« reprends « X », un bloc de 45 min »). Le garde-fou du
cerveau épuisé n'existait que les semaines **serrées** ; le calendrier confortable, lui, n'avait
aucun frein — **alors que c'est justement le cas où lever le pied coûte le moins.**

## Ce qui est livré

Nouveau champ **`focusMarginDrained`** (le score du jour, ou `null`, **toujours** renvoyé). Quand
l'allure focus est **large** (`onpace`) ET qu'un check-in de récup **du jour** met la forme **à
plat** (readiness < 50), le coach **rassure**, note **appendue** au « tu as la marge » :

> Mais ton énergie mentale est basse ce matin (readiness 40/100) : justement, tu as de la marge sur
> l'objectif — aucune raison de forcer un gros bloc aujourd'hui. Un focus léger, ou même une vraie
> pause, suffit largement : ta marge encaisse ce jour au ralenti sans stress, et tu repartiras
> l'esprit bien plus tranchant.

**Pourquoi un cadrage DISTINCT de `focusGoalDrained`.** La note de la branche serrée gère une cible
**menacée** (« t'acharner empile des minutes creuses ») : le calendrier presse encore. Ici,
l'objectif est **déjà à l'abri** (tu as la marge) → un jour au ralenti se rattrape tout seul. Le ton
n'est donc pas « attention à ne pas creuser la fatigue » mais **« lève le pied sans culpabilité »** :
la marge est exactement ce qui rend ce jour off gratuit. C'est l'« adaptation aux écarts » appliquée
au cas le plus **bienveillant**.

## Garde-fous & honnêteté

- **À plat SEULEMENT.** readiness < 50. Marge × tête moyenne (50-74) ou au vert → aucun mot ici (le
  vert déclenche `focusGoalAhead`, la médiane reste un trou volontaire — cf. Suite). (Testé : `ahead`
  100 → null, `aheadMid` 60 → null.)
- **Données réelles.** Exige un check-in de récup **du jour** ; sans check-in → null. (Testé :
  `onpace` sans récup → null.)
- **Mutuellement exclusif** de `focusGoalAhead` (≥ 75 XOR < 50, même branche `onpace`), de
  `focusGoalDrained`/`Fresh`/`Steady` (branche `tight`, perDay > 60 XOR ≤ 60 — testé : `tired`, à plat
  en serré → `focusMarginDrained` null, c'est `focusGoalDrained` qui parle) et des notes sport
  (`chosen.pillar === 'sport'`).
- **Affine, ne remplace pas.** Note **appendue** ; l'action du jour reste intacte.
- **Vocabulaire distinct** (« ton énergie mentale est basse ce matin », « tu as de la marge sur
  l'objectif », « ta marge encaisse ce jour au ralenti ») → zéro collision à l'œil ni en regex avec
  `focusGoalDrained` (« à plat ce matin », « un cerveau fatigué ne produit pas un vrai bloc
  profond »), `focusGoalAhead` (« ta tête est claire ce matin », « prendre de l'avance »),
  `focusGoalSteady` (« tient la route ce matin ») ni `readinessNutriGuard` (« ta forme est basse ce
  matin », pilier nutrition).
- **Zéro nouvelle fonction.** Réemploi de `readinessScore` déjà utilisé partout dans la fonction.

## Vérification

- Tests `logic.test.js` (bloc allure focus, cas `aheadLow`) : objectif large (onpace) × readiness 40
  (5/4/4) → `focusMarginDrained === 40`, `focusGoalAhead === null`, notes « ton énergie mentale est
  basse ce matin (readiness 40/100) » + « tu as de la marge sur l'objectif » + « ta marge encaisse ce
  jour au ralenti » présentes, aucun vocabulaire des autres zones. Exclusions : `ahead` (vert),
  `aheadMid` (médiane), `onpace` (sans récup), `tired` (à plat en serré) → tous null.
- Check smoke **bloquant** `coachFocus` étendu (`fMarginDrained`) : `focusMarginDrained === 40` +
  `focusGoalAhead === null` + notes présentes en onpace × à plat ; null au vert et en serré.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (512 tests node, SMOKE OK, EXIT=0).

## Suite possible

- La branche `onpace` a désormais **deux** des trois zones : au vert (`focusGoalAhead`, #535) et à
  plat (`focusMarginDrained`, ce build). La zone **médiane** (onpace × readiness 50-74) reste sans
  cadrage dédié — mais un jour moyen où l'on a déjà la marge n'appelle probablement qu'un « tu as la
  marge » simple (surpromettre serait malhonnête, dramatiser aussi) : à laisser tel quel, comme la
  branche serrée avait tranché avant d'ajouter `focusGoalSteady` (#534).
- Le pilier focus est maintenant symétrique du sport côté « forme du jour × objectif » sur les
  registres serré ET large. Les leads pace/readiness/driver sont saturés (cf. recaps #536→#539) ;
  prochaines pistes coaching à forte valeur probablement **hors** allure/readiness (croisements
  inédits) — sinon écrire une proposition plutôt que du remplissage.
