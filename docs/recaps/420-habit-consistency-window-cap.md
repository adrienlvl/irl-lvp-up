# 420 — Couverture : `habitConsistency`, le plafond de fenêtre `days` verrouillé (tests seuls)

## Le manque (§4.1 — couverture réelle, domaine frais)

`habitConsistency(habit, todayKey, days)` (`src/lib/logic.js:594`) calcule le taux de régularité
d'une habitude sur une fenêtre : occurrences RÉALISÉES vs PRÉVUES, en remontant depuis `todayKey`.
La fenêtre est bornée par **deux** contraintes :

1. le **plafond `days`** (défaut 30) — `for (let i = 0; i < win; i++)` ;
2. la **1re date loggée** — `if (k < earliest) break;` (« régularité DEPUIS que tu as commencé »,
   pour ne pas compter des jours antérieurs à l'existence de l'habitude).

Son test (`test/logic.test.js:6696`) couvrait bien la borne « 1re date loggée » (habitude créée
hier, fenêtre bornée au début…), mais **jamais le cas où le plafond `days` est la contrainte
bornante** : dans chacune des assertions existantes, la 1re date loggée tombait DANS la fenêtre,
donc c'est toujours `earliest` qui arrêtait la boucle — jamais `win`. Une régression qui aurait
supprimé le plafond `days` (en faisant toujours remonter jusqu'à la 1re date) serait passée
**inaperçue**. De plus, le seul cas planifié (weekdays) testé était à **100 %** : la distinction
`hit` vs `scheduled` sous un `weekdays` restreint, avec un jour prévu manqué, n'était pas verrouillée.

## Le geste (tests seuls, aucun code modifié)

Les trois comportements ont d'abord été **exécutés sur le code réel** (`node -e …`) puis figés en
assertions ajoutées au `test('habitConsistency …')` existant :

- **plafond `days` = contrainte bornante** : historique de 21 jours (25 juin → 15 juil., tous tenus),
  fenêtre `win = 7` → **7 prévus / 7 tenus = 100 %** (on ne remonte QUE 7 jours, pas jusqu'au 25 juin) ;
- **trou DANS la fenêtre plafonnée** : même historique, 12 juil. retiré → **6 / 7 = 86 %** ;
- **jour prévu manqué sous weekdays** : habitude lun/mer/ven, tenue les ven 10 et mer 15, lun 13
  manqué → prévus 3, tenus 2 → **67 %** (premier cas d'un taux < 100 sous `weekdays`).

Aucune ligne de `logic.js` touchée : la fonction était déjà correcte — c'est un **filet de
non-régression** sur son plafond de fenêtre et sa distinction réalisé/prévu, pas une correction de
bug. Uniquement des assertions dans le bloc `test()` existant → le **compte de tests reste inchangé
(434)**.

## Portée & sûreté

- Purement additif, tests uniquement → **pas de bump de version, pas d'entrée CHANGELOG** (règle
  VPS-AUTOPILOT §2.6 : changement sans effet utilisateur). Aucune Release, zéro dépendance, aucune
  donnée perso, aucune fonctionnalité retirée.
- Variété (§4) : domaine **Habitudes / régularité** (jamais travaillé dans les dernières boucles),
  type **couverture (§4.1)**, après un durcissement Hydratation (#419), un bug Course/Trail (#418),
  la couverture Agenda (#417) et Nutrition/Poids (#416). Fonction repérée via un audit des fonctions
  pures peu testées + sonde empirique révélant que le plafond `days` n'était jamais la contrainte
  exercée.

## Vérif & version

`xvfb-run -a npm run verify` (depuis `src`) → **434 tests + smoke 100 % verts** (`SMOKE OK`). Pas de
bump (2.0.55 conservé, tests seuls). Boucle #420.
