# #462 — Décisions d'Adrien : échéance « rentrée » + `readinessScore` corrigé (2.0.92-93)

Adrien a tranché les **2 propositions** que le VPS avait laissées en attente (« vise la rentrée, et
met bien le readinessscore ! »). Les deux sont implémentées.

## 1. Échéance alternance → la RENTRÉE (2.0.92) — proposition `alternance-echeance-aout`, option B+E

`alternanceDeadline` visait le **1er août** et faisait rouler à « J-365 » pile le 1er août — un
effondrement du compteur au pire moment. Désormais elle vise la **rentrée (1er octobre)** :
- **`before`** : compte à rebours normal vers le 1er octobre (l'été ne fait plus s'effondrer le
  compteur — chercher a du sens jusqu'à la rentrée, beaucoup de contrats démarrent sept./oct.) ;
- **`crunch`** : rentrée passée mais saison encore ouverte (jusqu'au 1er déc.) → `daysLeft <= 0`,
  héros/coach affichent « C'est la rentrée — dernière ligne droite » (l'ancienne branche morte
  « C'est le moment ! » reprend vie, option E) ;
- après le 1er déc. (saison finie) → cap de l'an prochain.
- Renvoie `{ date, daysLeft, phase }`. Libellés « avant août » → « **avant la rentrée** » (héros +
  coach). **Date cible = 1er octobre** (défaut raisonnable pour un BTS/alternance ; ajustable si
  Adrien veut une autre date).

## 2. `readinessScore` : sommeil non renseigné ≠ « 0 h » (2.0.93) — proposition `readiness-sommeil-non-renseigne`, option A

Un check-in où l'on note fatigue/courbatures **sans** remplir les heures de sommeil stockait
`sleep:0` et perdait **−40 pts** (la pire nuit) → fausse alerte « Récupération prioritaire ». Désormais,
sommeil absent (`sleep` non > 0) → on **renormalise fatigue + courbatures (60 pts) sur 100**, comme
tout le sous-système sommeil qui exclut déjà `sleep:0`. Sommeil renseigné → **strictement inchangé**.
Ex. fatigue 3 / courbatures 3, sommeil vide : **50 (« Correct »)** au lieu de 30.

## Vérification navigateur

Héros : « ⏰ J-75 avant la rentrée » (cap oct.) ; `crunch` (15 oct.) → « dernière ligne droite » ✅.
`readinessScore` : sommeil vide 30 → **50**, frais sans sommeil **100**, avec 8 h **70 (inchangé)** ✅.
Aucune erreur console.

## Tests

451 tests (alternanceDeadline : before/crunch/roll, plus d'effondrement le 1er août ; readinessScore :
renormalisation sans sommeil, sleep:0 = absent, rétro-compat sommeil renseigné) + smoke `alternance`
(date 1er octobre) et `readiness` (renormalisation) étendus.

## Suite

Les 2 propositions sont **résolues** → je les retire de `docs/proposals/`. Build **2.0.93**, publié
en Release (Adrien veut ces corrections en ligne).
