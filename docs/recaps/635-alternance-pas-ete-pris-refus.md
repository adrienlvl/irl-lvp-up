# #635 — Alternance : « pas été pris » (un refus) n'est plus classé « accepté » (build 2.0.244)

## Contexte / rotation
Priorité de nuit = coaching, mais **rotation §4 bis bloquante** : les 5 derniers recaps sont
`coach, nutrition, coach, athlete, athlete` → `coach` (2×), `nutrition` (dans les 2 derniers) et
`athlete` (2×) **tous interdits** ce tour. Le coaching relève pleinement de la rotation (VPS-AUTOPILOT
§3) → domaine neuf obligatoire. Quota de propositions §4 bis.4 satisfait (#631 dans les 10 derniers).
Domaine pris : **`alternance`** — absent des 5 derniers recaps, et c'est le module **sacré** d'Adrien
(priorité de vie n°1). Piste **P4** (regex FR non ancrée / négation non gardée), le gisement prouvé.

## Défaut prouvé
`jobStatusFromText` (`logic.js:304`) mappe une cellule de statut FR libre → l'une des 6 étapes du
pipeline. Le bucket `accepte` (l.324-326) reconnaît la tournure d'acceptation
`\b(?:ete|suis|est|etes|sommes|sont)\s+prise?s?\b` — MAIS **sans aucune garde de négation**, alors que
sa **jumelle** `retenu` en a une, documentée et testée depuis longtemps (l.312 :
`\b(non|pas)\b[\s\S]{0,12}retenu → refus`, précisément pour qu'un « pas retenu » ne bascule pas en
offre décrochée). La symétrie n'avait jamais été faite pour `pris/prise`.

Conséquence, prouvée par lecture + tests :

| Entrée (cellule Statut Sheets/CSV) | Avant | Après |
|---|---|---|
| `Je n'ai pas été pris` | **`accepte`** 😱 | `refus` |
| `Pas été pris` | **`accepte`** | `refus` |
| `Vous n'avez pas été prise` | **`accepte`** | `refus` |

Un **refus** s'affichait « Accepté 🎉 » et gonflait `applicationStats` (`accepted`, et
`entretiens = byStatus.entretien + byStatus.accepte`) **à chaque synchronisation** du Google Sheets —
funnel Alternance corrompu en silence. Aucun test ne couvrait la négation de `pris` (les tests #778
couvrent `retenu`, #792 couvre le `pris` positif).

## Correctif (curation §3 / P4, zéro champ ajouté)
Une garde jumelle du garde `retenu`, placée **avant** le bucket `accepte` (`logic.js:313`) :

```js
if (/\b(non|pas)\b[\s\S]{0,12}\b(?:ete|suis|est|etes|sommes|sont)\s+prise?s?\b/.test(x)) return 'refus';
```

Choix de sûreté : on n'attrape **que la tournure avec auxiliaire** (`été/suis/est… pris`), miroir exact
de la regex d'acceptation qu'on neutralise — **pas** le « pris » nu. Ainsi :
- `J'ai été pris` / `Je suis prise` / `Retenu` → **`accepte`** (inchangé, non régressé) ;
- `Pas encore pris contact` → **`postule`** (prise de contact en cours, capté plus bas par
  `/pris contact/` l.365) : ma garde ne le happe **pas** en `refus` ;
- `Candidature prise` → `accepte` (attente documentée du fix #446, préservée).

La fenêtre `[\s\S]{0,12}` et l'ensemble de négation `(non|pas)` reproduisent **à l'identique** le garde
`retenu` voisin (même profil de risque, déjà validé et documenté) — cohérence, pas d'invention.

## Vérification
- 6 assertions ajoutées (`logic.test.js`, section `jobStatusFromText`) : les 3 négations → refus, +
  non-régression `J'ai été pris` → accepté et `Pas encore pris contact` → postule.
- Pas de nouveau chemin de rendu (fonction pure consommée telle quelle par la sync/import) → pas de
  nouveau check smoke requis. §4 ter : ce n'est pas un ajout de texte mais une **correction de
  classification** — le résultat cumulé du funnel affiche enfin le bon statut.
- `xvfb-run -a npm run verify` : **570 tests + smoke 100 % verts.**

Build **2.0.244** (effet utilisateur → bump). CHANGELOG en tête + 2 assertions `CHANGELOG[0].v`.

Domaine : alternance
