# 695 — Import Alternance : 5 correctifs sûrs du classifieur (proposition #663 option A) (2.0.294)

## Contexte

Session LOCALE (matin, après l'audit de la nuit VPS). Adrien a **tranché la proposition #663 → option A** :
corriger les 5 cas SANS ambiguïté du classifieur/import Alternance en autonomie, différer les 4 choix de
design. Priorité : le bug qui **corrompt le funnel** que j'ai livré en #662 (un refus affiché « Accepté 🎉 »).

## Les 5 correctifs (`lib/logic.js`, chacun avec test node échoue-avant/passe-après)

1. **#1 — `jobStatusFromText` négation « retenu »** : la fenêtre `[\s\S]{0,12}` était trop courte —
   « je ne suis pas **le candidat** retenu » (« le candidat » = 13 car.) échappait au garde → le bucket
   `\bretenu` gagnait → **refus affiché « Accepté 🎉 »**. Remplacé par une **liste blanche de mots de liaison**
   (comme le garde `postul` de #592) : `(non|pas) [été|le|la|bon|candidat|profil…]* retenu(e)(s)`. « pas de
   souci, dossier retenu » **ne matche pas** (« de » exclu) → pas d'inversion abusive.
2. **#2 — `contact` ajouté aux verbes gardés par la négation** (l.377) : « pas encore contacté » = prospection
   à faire → `a_postuler`, alors que le motif nu `contacte` la classait « postulé » et gonflait `responseRate`.
   « pris/prise de contact » (contact établi) reste `postule` (« pris » n'est pas un mot de liaison → non capté).
3. **#5 — `jobDateFromText` : formats FR** : avant, seuls ISO et JJ/MM/AAAA étaient lus → « 3 mars 2026 »,
   « 2026/03/03 », « 03-03-2026 », « 03/03/26 » disparaissaient (relances via `daysUntil` cassées). Ajout :
   année-en-tête à slashs, **nom de mois FR** (« 1er août 2026 »), JJ-MM-AAAA, JJ/MM/AA (→ 20AA). La garde
   de **validité calendaire** (30 février → '') est conservée et appliquée à tous les formats.
4. **BOM — `parseCsv`** : `.replace(/^﻿/, '')` en tête. Un export Sheets commence souvent par le BOM
   UTF-8 → le 1er en-tête devenait « ﻿entreprise » et échappait à la détection de colonne par nom.
5. **#10 — id unique à l'import** (`parseApplicationsCsv`) : chaque ligne reçoit `idBase + index` (idBase =
   `Date.now()` capturé une fois). Avant, les lignes sans id recevaient toutes `Date.now()` dans
   normalizeApplication et, prises dans la même ms, **entraient en collision** → éditer/supprimer/relancer
   par id frappait la mauvaise ligne (piège « id dérivé de la date seule », #555/#592). Reste pur, ne touche
   pas la persistance.

## Différé à Adrien (décisions de design non prises)

#4 « je décline une offre » (refus vs état distinct), #6 date US, #8 clé de fusion `company` vs `company+role`,
#9 ordre des deux états terminaux (`accepte` vs `refus` au re-sync), #7 périmètre du séparateur `parseCsv`.
Ces choix **reclassent des cellules réelles** → restent à trancher (proposition #663 §5).

## Non-régression

- Tous les gardes existants tenus (vérifié en node) : « entretien en entreprise » → entretien, « j'ai été
  pris » → accepté, « relance pour entretien » → relance, « pas de retour, postulé le 03/03 » → postulé,
  « prise de contact » → postulé. Dates ISO / JJ/MM/AAAA / dates impossibles inchangées.
- 3 tests étendus (jobStatusFromText, jobDateFromText, parseApplicationsCsv) — **589 tests + SMOKE OK**.

Domaine : alternance
