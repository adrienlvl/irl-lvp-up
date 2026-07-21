# #642 — Bilan sommeil : plus de consigne de coucher redondante quand un plan de recalage est actif (2.0.251)

## Rotation (§4 bis)

Priorité de nuit = coaching. Contrôle des 5 derniers recaps **par numéro** :
`641 focus · 640 athlete · 639 nutrition · 638 coach · 637 athlete`.
→ `focus` (641, dans les 2 derniers) et `athlete` (640+637, 2×) exclus ; `nutrition` (639) et `coach`
(638) permis mais tout juste servis. **`sommeil`** pris : **0× sur les 5 derniers**, domaine de coaching
le plus **frais** et pleinement aligné avec la priorité de nuit (hygiène du sommeil / recalage circadien
— le pilier construit précisément pour la situation d'Adrien : endormissement dérivé vers ~6 h). Angle
NEUF trouvé par exploration ciblée : les deux surfaces sommeil du bloc Récupération n'avaient jamais été
arbitrées **ensemble**.

## Défaut prouvé (redondance / concurrence inter-surfaces, cas nominal d'Adrien)

Sur la page Athlète → Récupération, `renderWeeklySleep` rend l'une **sous** l'autre :

- **Bilan sommeil** (`#sleepCoach`, `sleepCoachInsight`, `logic.js:10020`) : verdict ponctuel
  (moy. 7 j + dette 14 j + régularité). Quand la nuit cloche, il **finissait par une consigne de coucher
  générique** :
  - court + irrégulier → « … — avant d'allonger les nuits, **stabilise d'abord une heure de coucher fixe.** »
  - court → « … — **vise un coucher 30 min plus tôt.** »
  - durée correcte mais irrégulière → « … — **se coucher à heure fixe compte autant que le total.** »
- **Plan de recalage** (`#sleepPlan`, `sleepPlanDay`, `logic.js:10209`) : quand un plan est actif, il
  porte **déjà** l'action de coucher, en mieux — une **cible chiffrée, adaptative** (« coucher cible ce
  soir **03:30** »), qui glisse jour après jour selon le rythme réel.

**Cas nominal** (l'état pour lequel tout le système sommeil a été bâti) : un plan de recalage **actif** +
des nuits encore courtes/irrégulières. Le bilan (`sleepCoachInsight`, appelé sans conscience du plan)
émettait sa consigne générique **juste au-dessus** de la cible précise du plan. Résultat lu en cumulé :
une instruction vague (« vise un coucher 30 min plus tôt » — 30 min plus tôt que quoi ?) **en concurrence**
avec « coucher cible ce soir 03:30 », qui encode déjà, chiffré et adaptatif, exactement la même intention.
Deux voix pour une seule action, la plus faible parlant en premier.

## Correctif (curation §3, zéro champ ajouté)

`sleepCoachInsight(recovery, todayKey, opts)` gagne un 3ᵉ argument optionnel `opts.planActive`. Quand il
est vrai, une petite fabrique `act = tail => planActive ? '.' : tail` **clôt le diagnostic par un point**
au lieu d'y accoler la consigne de coucher — sur les 3 verdicts « à corriger » (urgent, court, irrégulier).
Le **diagnostic** (tone, chiffres, « Sommeil court : moy. 6 h, dette de X h… ») est **intégralement
conservé** ; seule l'action redondante disparaît. « Retirer une note en vaut souvent deux ajoutées »
(§3) : on ne compense pas par un texte de renvoi (« voir le plan ») — la carte plan est littéralement en
dessous, le lien est visuel. Sans plan (`planActive` absent/faux), la consigne **reste** : le bilan est
alors seul à guider, et il doit continuer de le faire.

**Ripple zéro sur le coach adaptatif.** Les 3 appels internes de `sleepCoachInsight` dans
`adaptiveCoachFocus` (`logic.js` ~5402/5534/6076) n'ont **pas** d'opts → `planActive` faux →
comportement **byte-identique** (même approche que #639 avec `calorieAdjustment`). Seul le point de rendu
(`app.js:615`) passe `{ planActive: !!(state.sleepPlan && state.sleepPlan.active) }`. Le domaine `coach`
n'est pas touché (respect de la rotation).

## Contrôle §4 ter (surfaces lues par l'utilisateur)

Les 2 cartes ont été **rendues ensemble sur état chargé** (plan actif ciblant 23:30 + 7 nuits de 6 h au
coucher en dents de scie 03:00/06:00) via le check smoke :
- **plan actif** → Bilan = « Sommeil court et coucher irrégulier (moy. 6 h, coucher variant de ~89 min…) »
  (diagnostic seul, **sans** « stabilise… ») ; Plan = « coucher cible ce soir 03:30 ». Lecture cumulée
  nette : un diagnostic, puis une action chiffrée. Plus de doublon ni de concurrence.
- **plan inactif** → la consigne de coucher **réapparaît** dans le bilan (prouve le câblage `planActive`).

## Vérification

`cd src && xvfb-run -a npm run verify` → **100 % vert** (EXIT=0, css-lint vert).

- **572 tests** (nouveau bloc `sleepCoachInsight … plan actif` : consigne retirée sur les 3 verdicts
  « à corriger » quand `planActive`, diagnostic conservé, phrase close ; verdict « ok » identique
  plan ou pas ; non-régression sans opts).
- Check smoke **bloquant `sleepCoachDefersToPlan`** : rend `renderWeeklySleep` avec plan actif + nuits
  courtes/irrégulières, exige que `#sleepCoach` **ne contienne plus** la consigne générique
  (`/vise un coucher|stabilise|compte autant/`) tout en gardant le diagnostic, que `#sleepPlan` affiche
  bien « coucher cible », puis (plan désactivé) que la consigne **revienne** ; restaure l'état.
  **Rouge avant** (`sleepCoachDefersToPlan:false`) / **vert après**.

Build **2.0.251** (bump `package.json` + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`).

Sources : hygiène du sommeil / recalage circadien — une seule instruction actionnable prime (le plan
progressif) sur une consigne générique concurrente.

_Domaine : sommeil._
