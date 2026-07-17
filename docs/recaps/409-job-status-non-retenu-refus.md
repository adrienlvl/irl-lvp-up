# 409 — Alternance : « non retenu » (refus standard) n'est plus lu comme « accepté » (2.0.49)

## Le manque (bug pur prouvé — §4.1/§4.2)

`jobStatusFromText` (`src/lib/logic.js:284`) mappe un libellé de statut FR libre → l'une des 6 étapes
du pipeline de candidatures. Elle est **partagée par tous les imports** de l'onglet Alternance :
saisie manuelle, `parseApplicationsCsv` (import CSV), et la **sync Google Sheets**
(`parseSheetApplications` → `parseAlternanceTargets`). C'est donc un point de passage sensible du
module sacré Alternance.

La règle « accepté » était testée **avant** la règle « refus » et reconnaissait le sous-motif nu
`retenu` :

```js
// avant
if (/accept|retenu|pris|embauch/.test(x)) return 'accepte';   // ligne 289
if (/refus|negati|decline|abandonn|ecart|sans suite/.test(x)) return 'refus';
```

Or la formulation **la plus courante d'un refus d'alternance** est « **non** retenu(e) » :
« Non retenu », « Candidature non retenue », « Profil non retenu », « Vous n'avez pas été retenu ».
Toutes contiennent `retenu` → la règle `accepte` l'emportait, et la négation n'était jamais
considérée. Un **refus** était donc importé comme une **offre décrochée**.

Cas concrets prouvés (exécutés sur le code réel avant correctif) :

```js
jobStatusFromText('Non retenu')               // avant → 'accepte'   attendu → 'refus'
jobStatusFromText('Candidature non retenue')  // avant → 'accepte'   attendu → 'refus'
jobStatusFromText('Profil non retenu')        // avant → 'accepte'   attendu → 'refus'
jobStatusFromText('Vous n’avez pas été retenu')// avant → 'accepte'  attendu → 'refus'
```

Via le chemin d'import réel (`parseApplicationsCsv`), un tableur « Entreprise,Statut / Acme,Non
retenu » produisait `{ company: 'Acme', status: 'accepte' }`. L'impact se propage à
`applicationStats` : `accepted`, `responseRate`, le funnel par statut, et la carte « Le focus du
moment » comptaient un faux positif — un refus affiché comme une alternance décrochée.

## Le correctif

Une règle de **rejet nié** ajoutée **avant** `accepte` : si le libellé contient une négation
(`non` / `pas`) suivie de près par `retenu`, c'est un refus.

```js
// après (inséré avant la règle `accepte`)
if (/\b(non|pas)\b[\s\S]{0,12}retenu/.test(x)) return 'refus';
if (/accept|retenu|pris|embauch/.test(x)) return 'accepte';
```

L'intervalle borné `[\s\S]{0,12}` couvre « non retenu » (0 mot), « pas été retenu » (« ete »), sans
sur-capturer une phrase où les deux mots seraient éloignés par hasard. Une **vraie** réponse positive
(« Retenu », « Retenu / embauché », « Vous êtes retenu ») reste correctement classée `accepte` — le
mot positif nu ne comporte pas de négation.

## Portée & sûreté

- Logique pure, aucun changement de rendu. Correction purement additive (une règle avant la règle
  fautive), aucune fonctionnalité retirée ni modifiée par ailleurs.
- Cas ambigus laissés volontairement de côté pour rester minimal et sans régression : « pris »
  (`Poste déjà pris` vs `Vous êtes pris`) reste `accepte` — le mot est trop ambigu pour être inversé
  sans risque, contrairement à « non retenu » qui est univoque.
- +5 cas de statut ajoutés au test `jobStatusFromText` (dont 4 fautifs prouvés avant), 1 garde
  positive (« Vous êtes retenu » reste accepté). **431 tests + smoke** verts
  (`cd src && xvfb-run -a npm run verify`).

## Variété (§4)

Rupture assumée avec la famille « arrondi / catégorie IMC » des boucles #400→#408 : bug de
**classification de texte (parseur de statut)** dans le **module Alternance**, cœur de la priorité de
vie d'Adrien (décrocher une alternance) — on fiabilise l'import sans rien casser.
</content>
</invoke>
