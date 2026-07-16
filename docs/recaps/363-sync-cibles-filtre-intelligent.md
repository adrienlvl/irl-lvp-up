# #363 — Sync alternance : filtre intelligent des cibles (2.0.7)

Suite de #362. En branchant la sync sur le **vrai** Google Sheets d'Adrien, découverte : l'onglet
« Cibles » fait **14 947 lignes** (export La Bonne Alternance), dont **14 515 « À contacter »** —
importer tout noierait le suivi. Adrien : « fais un tri… entreprises bien notées (≥ 6), et que le
Morbihan, Ille-et-Vilaine, Côtes-d'Armor mais seulement Loudéac / proche du 56 ».

## Ce qui est livré

- `parseAlternanceTargets(text, opts)` (pur + testé) : parse un CSV type La Bonne Alternance et le
  **filtre** — `minScore` (Score /10 ≥ 6, scores hors 0–10 écartés), `depts` (56 + 35 entiers),
  `townDepts` (22 : Loudéac uniquement), `max` (plafond de sécurité 800, jamais d'inondation).
  Détecte le département via le format `Ville (NN)`. Statuts mappés (« à contacter » → à postuler).
- `parseSheetApplications(text, opts)` (routeur) : si le CSV a une colonne « Score …/10 » + « Ville »
  → filtre cibles ; sinon (onglet de suivi simple) → `parseApplicationsCsv` sans filtre. La sync
  route donc automatiquement : « Cibles » filtré, « Suivi Existant » tout gardé.
- `jobStatusFromText` / `jobDateFromText` extraits en helpers partagés (mapping enrichi pour les
  statuts réels : « à contacter »→à postuler, « confirmé »→postulé (≠ accepté), « abandonné/écartée/
  réponse négative »→refus). `parseApplicationsCsv` les réutilise.
- `state.targetFilter` (défaut : score 6, 56/35, 22-Loudéac, max 800), validé dans `normalizeState`.

## Vérification sur les VRAIES données d'Adrien

- 14 947 lignes → **556 cibles** retenues (56 : 362, 35 : 187, 22-Loudéac : 7) : **386 à postuler**
  (sa shortlist actionnable) + 60 postulé + 110 refus. Exemples : FIDUCIAL, KPMG, Cerfrance, TGS,
  Mazars, EXCO Lorient/Vannes — pile des cabinets comptables pour un BTS CG ✅.
- Sync + rendu des 556 lignes : ~720 ms (parse de 4 Mo inclus), rendu instantané, 0 erreur console ✅.
- Routeur : onglet de suivi simple (sans score) → non filtré ✅.

## Confidentialité

Le CSV réel n'a servi qu'à la mise au point locale (scratchpad) ; **aucune donnée d'Adrien n'est
committée** (fichier de test supprimé du dossier de l'app avant commit).

## Tests

381 tests (`jobStatusFromText`, `parseAlternanceTargets` score+géo+plafond, `parseSheetApplications`
routage) + smoke `sheetSync` étendu (filtre cibles + routeur).

## Contexte

Build **2.0.7**, **publié en Release** (Adrien est en train d'adopter la fonctionnalité → il la
récupère directement). La sync « complète » demandée est maintenant réellement utilisable.
