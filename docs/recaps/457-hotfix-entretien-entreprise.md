# #457 — Hotfix Alternance : « entretien en entreprise » ≠ « accepté » (2.0.87)

Régression introduite par **#446** (2.0.65), détectée par la **revue adversariale multi-agents** de
l'audit du VPS, puis reproduite sur le code publié (2.0.86).

## Le bug

`jobStatusFromText` (logic.js) mappe un libellé de statut FR vers une étape du funnel. #446 avait
déplacé le test `entretien` **après** les états terminaux (pour que « refusé/retenu après entretien »
soit final) — correct en soi. Mais le regex « accepté » `/accept|retenu|pris|embauch/` contient le
sous-motif **`pris`**, qui matche **`entre‑pris‑e`**. Résultat : toute tournure contenant
« entreprise » — dont « **Entretien en entreprise** », « entretien avec l'entreprise » (formulation
FR ultra-courante pour un entretien sur site) — basculait en **`accepte`**.

Impact réel (module Alternance, priorité n°1) : faux « décroché », `applicationStats.accepted` /
`responseRate` gonflés, et comme `accepte` surclasse `entretien` dans `mergeApplications`, l'erreur
était **collante** au re-sync (pouvait même promouvoir un vrai « entretien » en « accepté »).

Les 4 tests ajoutés par #446 ne couvraient que « Entretien prévu mardi » (sans « entreprise »),
passant à côté du piège.

## Le correctif

Une frontière de mot : `pris` → **`\bpris`**. « pris / prise / pris(es) » restent « accepté » ;
« entre‑pris‑e » n'est plus reconnu (pas de frontière avant le « p » interne).

Vérifié en isolation puis sur la fonction réelle :
- « Entretien en entreprise », « … avec l'entreprise », « 1er entretien avec l'entreprise »,
  « entretien sur site en entreprise » → **entretien** ✅
- « Candidature prise », « Je suis pris », « Retenu », « Accepté », « Embauché » → **accepté** ✅

## Tests

449 tests + smoke verts. `jobStatusFromText` gagne les cas-pièges « entreprise » (doivent rester
entretien) + les vrais « pris/prise » (doivent rester accepté).

## Contexte

Build **2.0.87**, publié en Release (correctif d'un bug présent dans la 2.0.86 tout juste diffusée).
Découverte par l'audit matinal du VPS — la revue adversariale a fait exactement son travail :
attraper un défaut que la suite verte laissait passer.
