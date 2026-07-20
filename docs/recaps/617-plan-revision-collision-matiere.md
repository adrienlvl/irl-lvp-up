# #617 — Plan de révision : deux matières au même créneau ne s'écrasent plus (build 2.0.229)

## Contexte / rotation

Priorité de nuit = coaching, mais **`coach` bloqué par la rotation §4 bis** (2× dans les 5 derniers
recaps, dont un des 2 derniers). `robustesse` et `sommeil` aussi dans les 2 derniers → écartés.
Domaine choisi : **`etudes`** (1× sur 5, absent des 2 derniers → conforme). Tâche prise par la
méthode P5 (mesurer/vérifier avant de coder) via une reconnaissance ciblée des domaines frais.

## Le défaut (prouvé dans le code)

`planStudySessions` (`src/lib/logic.js:1184`) générait chaque créneau de révision avec
`refId = \`planner-${date}-${time}\`` — **sans la matière**. Or :

- Le champ heure du formulaire (`#studyTime`, `app.js:969`) a une valeur par défaut **collante**
  (`17:30`), donc deux matières se retrouvent facilement au même horaire.
- Le submit **ajoute** désormais l'épreuve (`upsertExamGoal`, multi-épreuves BTS supporté depuis P6)
  et fusionne les créneaux via `mergePlannedEvents` (`logic.js:1202`), qui **déduplique par refId**.

Conséquence : planifier « Droit » à 17:30 les lundis, puis « Compta » à 17:30 les mêmes lundis,
produisait le **même refId** aux dates communes → `mergePlannedEvents` **remplaçait** les séances de
Droit par celles de Compta (en héritant même de leur `id` et de leur `completed`). **Perte de séances
silencieuse**, en contradiction directe avec le design multi-matières (`studyBySubject`, `examGoals[]`).

Non couvert par les tests (le test d'idempotence ne régénérait que la *même* config).

## Le correctif (curation §3, zéro champ ajouté)

`refId` inclut désormais une **clé de matière repliée** :
`planner-<date>-<time>-<matière repliée>`, où le repli (casse + accents NFD + espaces) est **identique
à `studyBySubject` (#613)**. Résultat :

- Deux matières distinctes au même créneau **cohabitent** (refId différents).
- Régénérer **la même** matière reste **idempotent** (même refId, `completed`/`id` préservés).
- « Droit » et « droit » régénèrent le **même** créneau (repli cohérent avec le panneau par matière).

Les autres générateurs qui passent par `mergePlannedEvents` utilisent un préfixe distinct
(`glc-<date>`, ICS) → **aucune collision croisée**. Le refId n'est parsé nulle part (grep : utilisé
comme clé opaque) → l'allongement est sans effet de bord.

Note migration : un plan généré **avant** ce fix (ancien refId sans matière) régénéré **une fois**
après la MAJ ne se reconnaît plus (nouvelle clé) → les anciens créneaux restent en place et de
nouveaux s'ajoutent : léger doublon **transitoire, sans perte**, qui se résorbe à la régénération
suivante (les deux passent alors au nouveau format). Choix assumé : bien préférable à la **perte de
données actuelle** entre matières, et impossible à réconcilier sans matière dans l'ancienne clé.

## Vérif

- `+1` test (`planStudySessions : deux matières au même créneau ne se télescopent pas`) : refId
  distincts, coexistence Droit+Compta après double `mergePlannedEvents`, idempotence « Droit »/« droit ».
- 2 assertions de refId existantes mises à jour (nouveau format), test d'idempotence conservé.
- `cd src && xvfb-run -a npm run verify` → **564 tests + smoke OK, 100 % vert**. Build **2.0.229**.

## Contrôle §4 ter

Changement **purement interne** (clé de déduplication) : aucun texte affiché ne change (titres, dates,
libellés du panneau et de l'agenda identiques). Pas de nouvelle surface de lecture à curer.

Domaine : etudes
