# #684 — Coach sommeil : le headline suit le VERDICT, pas le momentum de logging (2.0.285)

## Contexte / rotation
Priorité nuit = **coaching à fond** (DEMANDES.md), traité en **QUALITÉ/curation (§3)** comme imposé.
Contrôle rotation §4 bis sur les 5 derniers recaps (683→679) :
`etudes, robustesse, coach, etudes, robustesse` → `etudes` (2×) et `robustesse` (2×) **interdits**
(2 derniers + 2×/5) ; **`coach` libre** (1× en #681, hors 2 derniers). Quota §4 bis.4 non déclenché
(#674 = proposition récente). Domaine choisi : **coach**.

Angle **NEUF** exigé (familles closes : redondance insight↔action sur SPORT/FOCUS/SOMMEIL/NUTRITION
#681, `focus…Driver` #672/#675/#678, contradiction insight↔action SPORT #561→#585 / FOCUS #588). La
chasse (sous-agent Explore sur `adaptiveCoachFocus`/`sleepCoachInsight`/`coachDayPriority`) a sorti une
contradiction d'un **type non encore traité** : **headline ↔ insight** (pas insight↔action).

## Défaut prouvé
Pour le pilier **sommeil**, `adaptiveCoachFocus` **écrase** l'insight momentum par le **verdict qualité**
de `sleepCoachInsight` (`logic.js:6219`, `insight = sleepIns.verdict`) — moyenne d'heures, dette,
régularité. Mais le **headline**, lui, restait calé sur le **momentum de LOGGING** (nb de nuits saisies
cette semaine vs la précédente) et n'était resynchronisé **que pour le ton `urgent`** (`logic.js:6220`).
Or le comptage de saisies (headline) et la qualité (insight) sont **orthogonaux** → contradiction
frontale dans la même carte, atteignable en cas nominal :
- **rebuild × verdict `ok`** : « **Ton sommeil s'essouffle** » au-dessus de « Sommeil solide, rythme
  régulier » (moins de nuits saisies récemment, mais de bonne qualité).
- **reinforce × verdict `attention`** : « **Ton sommeil monte en régime** » au-dessus de « Sommeil court,
  dette de 9 h » (plus de nuits saisies, mais courtes).

Les piliers non-sommeil **appendent** le verdict à l'insight momentum (headline aligné) ; seul le sommeil
l'**écrase** → seul lui décrochait.

## Correctif (curation §3, zéro champ ajouté)
`logic.js:6220` — au lieu de resynchroniser le headline pour le seul `urgent`, on le re-dérive du **même
verdict** pour tous les tons (l'insight portant désormais le vrai signal) :
- `urgent` → « Ton sommeil déraille — priorité ce soir » (inchangé)
- `ok` → « Ton sommeil tient la route »
- `attention` → « Ton sommeil mérite un coup de pouce »

Piliers non-sommeil intacts. Le cas `revive` sommeil dormant (sleepIns null → branche non exécutée)
reste sur son headline momentum « Reprends le sommeil » (aucun verdict à afficher) — non régressé
(test 7740-7741 toujours vert).

## Contrôle §4 ter (rendu cumulé lu en entier)
- A (rebuild×ok) : « **Ton sommeil tient la route** — Sommeil solide : moy. 8 h sur 2 nuits, rythme
  régulier. Rien à corriger côté sommeil : garde cette même heure de coucher ce soir. » ✓
- B (reinforce×attention) : « **Ton sommeil mérite un coup de pouce** — Sommeil court : moy. 6 h sur 5
  nuits, dette de 9 h sur 14 j. Vise un coucher 30 min plus tôt ce soir. » ✓
Headline, verdict et action disent enfin la même chose.

## Tests
- +1 test logic dédié (rebuild×ok, reinforce×attention, urgent inchangé).
- 3 assertions **bloquantes** ajoutées au check smoke `coachFocus` (pilote le vrai `renderCoachFocus` :
  `fSleep`/urgent, `fOkSleep`/ok, `fAttnSleep`/attention).
- `verify` : **584 tests + SMOKE OK**. Effet visible → **bump 2.0.285**.

**Lot 2.0.263→285 en attente de release (Adrien contrôle).**

_Domaine : coach._
