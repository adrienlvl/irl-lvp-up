# #681 — Coach nutrition : l'action ne redit plus « et un fruit/légume » quand `fruitGuard` l'a déjà dit

**Build 2.0.282** · Domaine : coach · 2026-07-22

## Contexte & rotation
Priorité nuit = coaching (DEMANDES.md), traité en **QUALITÉ/curation (§3)**. Rotation §4 bis (5 derniers
recaps : `etudes, robustesse, coach, etudes, robustesse` → #680/#679/#678/#677/#676) : `etudes`+
`robustesse` interdits (2 derniers **et** 2×/5), **`coach` libre** (1× en #678, hors 2 derniers). Quota
§4 bis.4 non déclenché (#674 = proposition récente). Angle NEUF exigé (toute la famille `focus…Driver`
est close #672/#675/#678). Chasse en rendu chargé (§4 ter) via sous-agent + reproduction personnelle.

## Manque prouvé (§4 ter, cumul rendu chargé)
Dans `adaptiveCoachFocus` branche nutrition, l'action « cible protéines tenue » (`logic.js:6371`) finit
par « — verrouille l'eau **et un fruit/légume**. ». Or, plus bas, `fruitGuard` (`logic.js:6413`, ajouté
plus tard) consacre — quand un vrai suivi néglige le fruit/légume ≥ 8 jours — une **phrase entière**
argumentée à cette même consigne dans l'insight (`logic.js:6430/6432` : « Glisse un fruit ou une portion
de légumes à un repas aujourd'hui… » / « Coche la case fruit/légume aujourd'hui… »). Les deux
co-occurrent naturellement (protéines tenues + eau OK + fruit jamais coché) → **la même consigne dite
deux fois dos à dos** sur la carte. Le commentaire du code (`logic.js:6403`) reconnaissait déjà que
l'action « effleure » le fruit/légume, mais la queue n'avait jamais été curée face à `fruitGuard`.

Rendu chargé reproduit (profil 75 kg/muscle, cible 135 g, 14 j protéines 140 + eau 8 + fruit false) :
> INSIGHT : …*Glisse un fruit ou une portion de légumes à un repas aujourd'hui, c'est le maillon le plus
> vite comblé.*
> ACTION : *Cible protéines tenue (140/135 g) 💪 — verrouille l'eau et un fruit/légume.*

## Correctif — §3 curation (retirer, pas ajouter)
Après le bloc `fruitGuard` (`logic.js:~6437`) : `if (fruitGuard && typeof action === 'string')
action = action.replace(' et un fruit/légume.', '.')` → l'action garde « verrouille l'eau. » seule,
le diagnostic chiffré reste intégralement dans l'insight. **Zéro champ ajouté.** Patron exact de #647
(sommeil, `opts.actionCarried`) et #675/#678 (drivers focus). Chirurgical : **sans** `fruitGuard`
(fruits déjà cochés → `null`), la queue générique « et un fruit/légume » **reste** (seul effleurement
du micronutriment, aucune phrase dédiée ne la double) ; et la borne cible-non-tenue (action = collation)
n'est pas touchée (le `replace` est un no-op).

## Vérif
- `logic.test.js` : +1 test dédié (fruitGuard parle → action sans « et un fruit/légume » mais avec
  « verrouille l'eau. » ; insight garde la phrase « Glisse un fruit… » ; non-régression fruit coché →
  fruitGuard null → queue générique conservée).
- `renderer-smoke.cjs` : volet bloquant après `fruitGuard` (curation + non-régression), via `indexOf`
  (pas de regex → aucun piège de template literal).
- `cd src && xvfb-run -a npm run verify` → **583 tests + SMOKE OK** (100 % vert).
- Bump **2.0.282** + CHANGELOG en tête + 2 assertions `CHANGELOG[0].v`.

## Suites possibles (non traitées ici)
Redondance insight↔action désormais close sur SPORT (#585), FOCUS (#588), SOMMEIL (#627/#647) **et
NUTRITION** (protéines #582, fruit/légume ici). Prochaine boucle coach = angle NEUF ailleurs — chercher
d'autres queues d'action qui « effleurent » un signal qu'une note dédiée développe désormais (pattern
« action générique posée avant une note plus riche ajoutée après »), à prouver en rendu chargé avant de
toucher.

_Domaine : coach._
