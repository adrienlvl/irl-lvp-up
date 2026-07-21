# #663 — Proposition : robustesse des classificateurs & de l'import Alternance

**Boucle #663 (2026-07-22).** Pas de bump (docs). `docs/proposals/robustesse-classificateurs-import-alternance.md`.

## Pourquoi une proposition ce tour
- **Quota §4 bis.4 déclenché** : dernière proposition écrite = recap #645 (glucides). Les 10 derniers
  recaps (653→662) sont sans proposition, `docs/proposals/` inchangé → l'itération **doit** être une
  proposition (VPS-AUTOPILOT gagne sur toute autre consigne, y compris la mission de nuit).
- **Sujet aligné** avec la priorité nuit n°1 (« robustesse données & classificateurs FR — dette
  récurrente n°1 ») **et** compatible avec la priorité nuit n°5 (« sinon → écris une proposition »).
- **Rotation §4 bis.3** : domaine `robustesse` absent des 5 derniers recaps (alternance, fondations×4) → OK.
- **Véhicule proposition justifié (§5)** : les correctifs touchent le classifieur du **Google Sheets
  sync** (module Alternance **sacré**) et peuvent **reclasser des cellules réelles** au prochain import
  → périmètre à trancher par Adrien avant de coder.

## Ce qui a été fait
Audit read-only (agent Explore) + **10 findings tous re-exécutés moi-même** en `node -e` (« vert ≠ bon » :
je n'ai relayé aucune affirmation non vérifiée). Findings prouvés, avec ligne + entrée qui casse :
- **GRAVE** #1 `Je ne suis pas le candidat retenu` → `accepte` (fenêtre négation `{0,12}` trop courte, l.328).
- **GRAVE** #2 `pas encore contacté` → `postule` (motif nu `contacte` sans garde de négation, l.380).
- **GRAVE** #7 `Auchan;Vendeur, rayon;refusé;…` → colonnes décalées, statut+date perdus (parseCsv traite
  `,` `;` `\t` simultanément, l.281) ; + BOM UTF-8 non retiré.
- **GRAVE** #10 import CSV en lot → **ids en collision** (`id: … || Date.now()`, l.165) — piège #555/#592.
- MOYENNE #3 (`ecart` nu), #5 (formats de date FR non lus → date vidée), #9 (`refus` écrase `accepte` au merge).
- À trancher / design assumé : #4 (décline), #6 (date US), #8 (clé de fusion = `company` seule, documentée l.1082).

Reco **A** : le VPS corrige en autonomie, **une famille par boucle**, les 5 cas **sans ambiguïté**
(#1, #2, #10, #5, BOM) avec test node échoue-avant/passe-après ; les 4 décisions de design (#4, #6, #8,
#9) + le périmètre de #7 attendent Adrien. 5 décisions listées en fin de doc.

## Suites
- **Débloque plusieurs boucles `robustesse` sûres** dès le feu vert d'Adrien sur le périmètre (décision 1).
- README des propositions mis à jour (nouvelle ligne). Aucune ligne de code produit touchée.

Domaine : robustesse
