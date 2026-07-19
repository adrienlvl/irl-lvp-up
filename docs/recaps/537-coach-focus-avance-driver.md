# 537 — Coaching : le coach nomme CE QUI te donne cette clarté les bons jours de marge (focusAheadDriver)

**Build 2.0.168 · boucle #537 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Depuis #535, le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) sait **inviter à
prendre de l'avance** les bons jours de marge : quand l'allure de l'objectif focus est **large**
(`onpace`, « tu as la marge ») ET qu'un check-in de récup **du jour** met la forme **au vert**
(readiness ≥ 75), `focusGoalAhead` ajoute « Et ta tête est claire ce matin (readiness 88/100) :
profite de cette marge pour prendre de l'avance… ». Mais cette note reste **muette sur QUELLE
composante du check-in** rend l'esprit si clair.

Or côté branche **serrée** (`tight`), le coach nomme **déjà** ce moteur depuis #532 :
`focusFreshDriver` enrichit `focusGoalFresh` de « Et ce qui nourrit cette fraîcheur mentale : ta nuit
de 8 h… ». Le recap #535 signalait lui-même le trou : « Comme `focusGoalFresh`, la note d'avance
pourrait **nommer le moteur** dominant du check-in. » `focusGoalAhead` était donc la **seule** note
focus au vert à ne pas dire pourquoi la tête est claire.

**Pourquoi côté focus et pas côté sport.** Le pendant sport de cette piste (nommer le moteur sur
`sessionGoalAhead`, recap #536 lead 1) a été **écarté après vérification** : côté sport, `readinessBoost`
(#531) fire déjà sur **exactement** la même condition (pilier sport × readiness ≥ 75) et nomme le
moteur (« Ce qui te porte aujourd'hui : ta nuit de 8,5 h… ») → l'ajouter doublonnerait le moteur dans
la même carte. Le focus, lui, **n'a pas de `readinessBoost`** → aucune redondance : le gap est réel et
propre uniquement côté focus.

## Ce qui est livré

Nouveau champ **`focusAheadDriver`** (`{ factor: 'sleep'|'fatigue', value }` ou `null`, **toujours**
renvoyé). Quand `focusGoalAhead` fire (onpace × readiness ≥ 75) ET qu'une force domine nettement le
check-in (`readinessDriver` : frac ≥ 0,75 et ≥ 0,2 au-dessus de la 2ᵉ), le coach **nomme le moteur**,
**appendu à l'insight** :

> Et ce qui te donne cette clarté : ta nuit de 8 h — autant profiter d'un cerveau aussi reposé pour
> engranger un bloc de plus tant que ça tourne tout seul, c'est de l'avance prise sans forcer.

ou, moteur énergie :

> Et ce qui te donne cette clarté : ton énergie est au top (fatigue 1/5) — un esprit aussi vif avance
> vite, saisis-le pour banker un bloc d'avance pendant que c'est facile.

C'est le pendant **EXACT** de `focusFreshDriver` (#532), appliqué à la branche d'**avance** (onpace)
au lieu de la branche **serrée** (tight). Reconnaître le bon geste qui paie ferme la boucle
« adaptation aux **PROGRÈS** » sur le cas d'avance aussi : Adrien voit quelle habitude lui offre ce mou
et la **répète**.

## Garde-fous & honnêteté

- **Sommeil ou énergie SEULEMENT.** Des muscles frais (soreness dominant) ne « donnent » pas de clarté
  mentale : on se tait plutôt que de servir une explication douteuse — **même garde-fou** que
  `focusFreshDriver` côté positif. (Testé : sleep 6 / fat 2 / **sore 1** → readiness 83,
  `focusAheadDriver` null malgré le vert.)
- **Une seule force qui domine.** `readinessDriver` ne renvoie rien à égalité (frac serrés). Le cas
  `ahead` 8/1/1 (trois forces à 100 %) → `focusAheadDriver` null, aucune note. (Testé.)
- **Pas de doublon.** Contrairement au sport, **pas de `readinessBoost` côté focus** → le moteur n'est
  jamais nommé deux fois dans la même carte.
- **Mutuellement exclusif** de `focusFreshDriver` par construction (branche `onpace` vs `tight`).
- **Affine, ne remplace pas.** Note **appendue** à l'insight ; `focusGoalAhead` et l'action du jour
  restent intacts.
- **Vocabulaire distinct** (« ce qui te donne cette clarté ») → zéro collision à l'œil ni en regex avec
  `focusFreshDriver` (« nourrit cette fraîcheur mentale »), `focusDrainDriver` (« te plombe la tête »),
  `readinessBoost` (« Ce qui te porte aujourd'hui ») ni `readinessDrag` (« Ce qui pèse le plus »).
- **Zéro nouvelle fonction.** Réemploi total de `readinessDriver`.

## Vérification

- Tests `logic.test.js` (bloc allure focus) : sleep 8/fat 2/sore 2 → readiness 85, `focusAheadDriver
  === { sleep, 8 }`, notes « ce qui te donne cette clarté : ta nuit de 8 h » + « avance prise sans
  forcer » présentes ; sleep 6/fat 1/sore 2 → `{ fatigue, 1 }`, notes énergie présentes ; sleep
  6/fat 2/sore 1 → readiness 83 mais driver null (muscles frais écartés) ; cas 8/1/1 (égalité) → null ;
  branche serrée (`freshSleep`) → `focusAheadDriver` null.
- Check smoke **bloquant** `coachFocus` étendu (`fAheadDrv`) : `focusGoalAhead === 85` +
  `focusAheadDriver.factor === 'sleep'` + note présente ; null sur le cas 8/1/1.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (511 tests node, SMOKE OK, EXIT=0).

## Suite possible

- Côté **sport ET focus**, un mot bref quand l'objectif hebdo est **déjà tenu** (« Objectif hebdo déjà
  tenu 💪 ») ET que la readiness est au vert : cadrer toute séance/bloc de plus comme du **pur bonus**
  sans pression (« objectif bouclé, forme au top → un bloc bonus tout tranquille, de l'avance sur la
  semaine prochaine »). Attention côté sport à ne pas contredire l'action readiness (« monte
  l'intensité ») — cadrer « bonus libre », pas « douceur ».
- La zone médiane (`focusGoalSteady`, #534) reste sans moteur nommé — mais un jour moyen n'a par
  définition ni force ni frein qui domine nettement, donc le cadrage simple y est probablement le plus
  honnête.
