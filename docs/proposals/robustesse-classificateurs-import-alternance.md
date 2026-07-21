# Robustesse des classificateurs & de l'import Alternance — audit prouvé + plan

> **Statut** : proposition (boucle #663, 2026-07-22). Écrite au titre du quota §4 bis.4 (10 recaps sans
> proposition) **et** de la priorité nuit n°1 (« robustesse données & classificateurs FR — dette
> récurrente n°1 »). Le module Alternance est **sacré** (sync Google Sheets, cible du jour d'Adrien) :
> tout correctif de son classifieur peut **reclasser des cellules existantes au prochain sync** → une
> partie relève du **supervisé** (§5). D'où : proposition d'abord, on tranche le périmètre, PUIS on code
> les correctifs sûrs par étapes autonomes (rotation §4 bis).

## 1. Problème (10 fragilités, toutes **exécutées** contre le vrai code)

Chaque cas ci-dessous a été reproduit en `node -e` sur `src/lib/logic.js`. Rendu = ce que l'app fait
aujourd'hui ; Attendu = ce qu'un humain lirait. `GRAVE` = corrompt le funnel / `applicationStats`
(taux de réponse, entretiens, acceptations) — souvent **à chaque sync**, en silence.

### A. `jobStatusFromText` (l.320-383) — mauvais classement de statut

| # | Gravité | Cellule d'exemple | Rendu | Attendu | Cause |
|---|---|---|---|---|---|
| 1 | **GRAVE** | `Je ne suis pas le candidat retenu` | `accepte` | `refus` | Fenêtre de négation `[\s\S]{0,12}` (l.328) trop courte : `" le candidat "` = 13 car. → le garde `(non\|pas)…retenu` ne s'arme pas, le bucket `\bretenu` (l.348) gagne. Un **refus affiché « Accepté 🎉 »**. |
| 2 | **GRAVE** | `pas encore contacté` | `postule` | `a_postuler` | Le motif nu `contacte` (l.380) matche « contacté » sans garde de négation → une prospection **non** contactée sort en « postulé » et gonfle `answered`/`responseRate`. Contredit directement `à contacter → a_postuler` (l.322). |
| 3 | MOYENNE | `écart de salaire trop important, en négociation` | `refus` | `postule` | Motif nu `ecart` (l.351) matche « écart » (négociation ouverte), pas seulement « écarté ». |
| 4 | à trancher | `je décline leur proposition` | `refus` | ? | Le candidat renonce à une offre **obtenue** → l'info « offre reçue » est perdue. Choix de pipeline, pas un bug franc. |

Déjà robustes (re-vérifiés, **rien à faire**) : négations adjacentes `retenu`/`pris`, `entre-prise`,
`in-acceptable`, ordre `relance`→`entretien`, `en attente de confirmation`→`postule`.

### B. `jobDateFromText` (l.391-403) — date **silencieusement vidée**

Seuls deux motifs sont lus : ISO `\d{4}-\d{2}-\d{2}` et `\d{1,2}/\d{1,2}/\d{4}`. Tout le reste → `''`.

| # | Gravité | Entrée | Rendu | Cause |
|---|---|---|---|---|
| 5 | MOYENNE | `3 mars 2026` · `03-03-2026` · `2026/03/03` · `03/03/26` | `''` (perdue) | Formats FR courants non couverts → la date de candidature disparaît à l'import ; relances (`daysUntil`, l.244) ne se déclenchent plus. |
| 6 | à trancher | `05/13/2026` (format US, mois 13) | `''` | Ambiguïté JJ/MM assumée (correct pour un Sheets FR), mais un export US est **silencieusement** vidé. À documenter. |

### C. `parseCsv` (l.275-287) — séparateur

| # | Gravité | Entrée | Rendu | Cause |
|---|---|---|---|---|
| 7 | **GRAVE** | `Auchan;Vendeur, rayon;refusé;03/03/2026` | 5 cellules → statut **et date perdus** (lus dans les mauvaises colonnes) | l.281 traite `,` **et** `;` **et** `\t` comme séparateurs **simultanément**. Un champ non-quoté d'un fichier `;` (export Sheets FR) contenant une virgule est éclaté. Casse aussi un score décimal FR `8,5`. |

_(Bonus non chiffré mais réel, relevé par moi : `parseCsv` ne retire pas le **BOM UTF-8** — un export
Sheets commence souvent par `﻿`, le 1ᵉʳ en-tête devient `﻿entreprise` et échappe à la
détection de colonne par nom.)_

### D. `mergeApplications` (l.1091-1115) & `normalizeApplication` (l.162) — perte de données

| # | Gravité | Cas | Rendu | Cause |
|---|---|---|---|---|
| 8 | **GRAVE** _(mais **design documenté**)_ | 2 postes chez la même entreprise | fusion en **1 seule** ligne, le 2ᵉ `role` écrase le 1ᵉʳ (l.1110) | Clé d'identité = `norm(company)` **seule** (l.1093). C'est **assumé** (commentaire l.1082 : « une entreprise = une ligne — le bon grain »). À rouvrir seulement si Adrien veut suivre plusieurs postes/entreprise. |
| 9 | MOYENNE | resync : `accepte` puis cellule `refus` | `refus` écrase `accepte` | `nextStatus` garde le **rang max** (l.1105) ; `refus` (rang 5) > `accepte` (rang 4) dans `JOB_STATUSES` (l.160). Deux états terminaux : lequel gagne ? Un « Accepté 🎉 » saisi main peut sauter au re-sync. |
| 10 | **GRAVE** | import CSV de N entreprises | ids **en collision** (ex. 5 lignes → 2 ids) | `id: Number(x.id) \|\| Date.now()` (l.165) : les lignes CSV sans id prises dans la même ms reçoivent le **même** id → toute édition/suppression/relance par id frappe la mauvaise ligne. Exactement le piège « id dérivé de la date seule » (cf. #555/#592). |

## 2. Options

- **Option A — Correctifs sûrs en autonomie (par étapes, rotation), design différé à Adrien.**
  Le VPS corrige les cas **sans ambiguïté sémantique** (une seule bonne réponse), chacun avec un test
  node qui échoue avant / passe après, **une famille par boucle** : **#1** (élargir la fenêtre de
  négation `retenu`, comme la jumelle `pris`), **#2** (garder `contacte` par une négation, comme
  `postul/envoy` l.377), **#10** (id unique : compteur monotone ou suffixe d'index à l'import — sans
  toucher la persistance), **#5** (2-3 formats de date FR en plus), et le **BOM** dans `parseCsv`.
  On **laisse à Adrien** : #4 (décline), #6 (US), #8 (clé entreprise), #9 (refus vs accepte), et le
  périmètre exact de #7 (voir risques). Coût : ~5 petites boucles ; zéro dépendance ; zéro changement d'UX.
- **Option B — Refonte complète, supervisée.** Tout A + les choix de design (#8 clé composite
  `company+role`, #9 ordre terminal, #7 séparateur auto-détecté). Touche le **modèle** (id, clé de
  fusion) et **reclasse** potentiellement des cellules → session supervisée, après un backup.
- **Option C — Ne rien faire.** Le module « marche » au quotidien ; ces cas sont des tournures
  moins fréquentes. Coût : les faux positifs GRAVES restent (un refus compté en acceptation gonfle les
  stats en silence, à **chaque** sync — exactement ce que les fixes #182/#192/#244 combattaient déjà).

## 3. Recommandation — **A**

Les cinq correctifs « sans ambiguïté » (#1, #2, #10, #5, BOM) sont de la **robustesse pure** (§4 type 1
et 2) : entrée qui casse → test qui échoue → correctif minimal → test vert. Ils rendent le module
Alternance **plus juste** sans rien changer à ce qu'il **dit** ni à son UX, et se prennent **une par
boucle** (la rotation empêche de labourer `robustesse` d'affilée). Les quatre décisions de design (#4,
#6, #8, #9) et le périmètre risqué de #7 attendent Adrien : elles changent **quel statut gagne**, donc
peuvent reclasser des cellules réelles → ce n'est pas au VPS de trancher seul (§5).

## 4. Risques

- **Reclassement au sync.** Modifier un bucket change la lecture de cellules **déjà** dans le Sheets
  d'Adrien au prochain import. Les 5 correctifs A ne font que **corriger un faux positif** (un refus
  redevient un refus) → sûrs. #7 est plus délicat : passer `parseCsv` à un **seul** séparateur
  auto-détecté pourrait casser un fichier réellement séparé par virgules → à cadrer (d'où « périmètre
  de #7 » laissé à Adrien : détecter le séparateur sur l'en-tête plutôt que tout accepter).
- **Churn de tests.** `logic.test.js` verrouille des textes de sortie ; chaque correctif ajoute son cas
  (échoue avant / passe après) et ne doit pas régresser les non-régressions existantes (l.788-801,
  l.1039-1054).
- **#10 (id).** Toute solution doit rester **pure** et ne **pas** toucher la persistance (interdit nuit) :
  un compteur dérivé du max des ids existants + index de ligne suffit, sans réécrire le boot.
- **Aucune** de ces pistes n'ajoute de dépendance ni ne retire de fonctionnalité.

## 5. Ce qui dépend d'Adrien (décisions)

1. **Périmètre** : **A** (correctifs sûrs autonomes + design différé) / **B** (refonte supervisée) / **C** (rien) ?
2. **#8 — clé de fusion** : garder `company` seule (statu quo assumé) ou passer à `company+role` pour
   suivre plusieurs postes dans la même boîte ? (impacte le modèle → supervisé si oui.)
3. **#9 — deux états terminaux** : au re-sync, `accepte` doit-il l'emporter sur `refus` (une acceptation
   saisie main est « la vérité »), ou garder le rang max actuel (dernier état lu gagne) ?
4. **#4 / #6** : « je décline une offre » = `refus` ou un état distinct ? Un format de date **US** doit-il
   être ignoré silencieusement (statu quo) ou signalé ?
5. **#7 — séparateur** : autoriser l'auto-détection du séparateur (`;` vs `,`) sur la ligne d'en-tête,
   ou laisser le multi-séparateur actuel ? (le premier corrige la perte de colonnes, le second est plus
   permissif sur des fichiers hétéroclites.)

---

_Prouvé et exécuté en boucle #663. Recaps liés : #182/#192/#244/#446/#569/#592 (historique du classifieur
Alternance). Ne pas implémenter avant le feu vert d'Adrien sur le périmètre (décision 1)._
