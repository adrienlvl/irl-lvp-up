# #669 — Coach : la félicitation « déjà tenu 💪 » ne fusionne plus avec la note suivante (2.0.275)

**Domaine : coach.** Priorité de nuit = coaching À FOND en QUALITÉ (§3, DEMANDES.md). Build 2.0.275.

## Rotation §4 bis (contrôle avant de coder)

5 derniers recaps (668→664) par domaine : `robustesse, athlete, coach, tests, athlete`.
- 2 derniers (668 robustesse, 667 athlete) → **bloqués**.
- `athlete` 2× sur 5 → **bloqué**.
- `coach` : 1× (666), **hors des 2 derniers** → **libre**. La priorité nuit (coaching) tombe donc
  dans une fenêtre où le domaine est autorisé.

## Le manque, prouvé en rendu chargé (§4 ter)

Candidat NEUF laissé ouvert par le recap #666 : « notes finissant par un EMOJI sans `.!?` →
`splitCoachSentences` les FUSIONNE avec la phrase suivante ». Prouvé avec `/tmp/coachtear2.cjs`
(pilier sport, objectif hebdo TENU 2/2, sommeil court sur la semaine → note socle sommeil `l.6950`
suit) :

```
[2] Objectif hebdo déjà tenu : 2/2 séances 💪 Et n’oublie pas le socle invisible de tes gains :
    tu dors 5,8 h … sous les 7 h — … augmentant le risque de blessure.
[3] Bien dormir démultiplie l’effort que tu fournis déjà.
```

Deux défauts cumulés dans **une seule puce** :
1. **FUSION** — la félicitation `l.5709` (`insight += ` … séances 💪``) se termine par l'emoji, SANS
   terminateur. `splitCoachSentences` (`/[.!?]+(?=\s|$)/`) n'ouvre donc aucune frontière après 💪 → la
   note socle sommeil qui suit (majuscule « Et n'oublie… ») est avalée dans la même phrase. Une
   **félicitation** (rang anodin) collée à une **alerte santé** (« risque de blessure », rang haut).
2. **DÉCHIRURE induite** — la conclusion de la note socle (« Bien dormir démultiplie… ») se retrouve
   **orpheline** en puce `[3]`, séparée de sa prémisse désormais coincée dans la puce de la félicitation.

`orderCoachNotes` reclasse **phrase par phrase** : la félicitation ne pouvait plus descendre et
l'alerte ne pouvait plus remonter (toutes deux prisonnières de la même puce).

Même classe côté focus : `l.5807` (`… min 💪`) fusionnait pareil avec la note bonus/allure focus qui suit.

## Le fix (§3, curation, zéro champ)

Un **terminateur après l'emoji** sur les deux notes : `séances 💪` → `séances 💪.` (`l.5709`) et
`min 💪` → `min 💪.` (`l.5807`). Le point referme la félicitation en une phrase propre ; les notes
suivantes (majuscule) redeviennent des phrases distinctes, correctement re-classées. Rendu chargé
après fix (`/tmp/coachtear3.cjs`) : la félicitation part **seule** tout en bas (rang félicitation),
l'alerte socle remonte **en tête**, ET sa conclusion la suit immédiatement (déchirure réparée).

**Pourquoi « point APRÈS l'emoji » et pas « point AVANT » (le patron milestone `text. 🎯`)** : avec
`séances. 💪 Et n'oublie…`, le fragment ` 💪 Et n'oublie…` commence par 💪 (non-majuscule) et serait
re-fusionné dans la puce précédente par la 2ᵉ passe de `splitCoachSentences`. Le point APRÈS 💪 place
la frontière au bon endroit.

## Sécurité de la modif

Toutes les assertions existantes (`logic.test.js` 9678/9775/9819/10142/10155 ; smoke 1203/1264…)
utilisent `assert.match`/`.test()` en **sous-chaîne** sans la ponctuation finale → intactes.

## Tests

- **+1 test** `logic.test.js` (échoue-avant/passe-après) : dans l'état chargé, la félicitation est une
  puce à elle seule terminée par `séances 💪.`, et **aucune** puce ne colle `séances 💪` + `socle invisible`.
- **+1 check smoke bloquant** dans `coachFocus` (`fGoalMet`) : même contrôle de non-fusion sur
  `splitCoachSentences`, terminaison `💪.` vérifiée.
- `cd src && xvfb-run -a npm run verify` → **580 tests + SMOKE OK** (`coachFocus:true`).

## Leçon

Toute note du coach qui se **termine** par un emoji SANS `.!?` avale la note suivante (fusion) et rend
sa conclusion orpheline (déchirure). Le patron sûr = **terminateur juste après l'emoji** (`💪.`), pas
avant. Reste à vérifier un jour, en rendu chargé, les autres notes à emoji terminal (peu nombreuses ;
les milestones mettent déjà le point AVANT l'emoji et vivent en fin d'insight, donc rarement suivies).

Domaine : coach.
</content>
</invoke>
