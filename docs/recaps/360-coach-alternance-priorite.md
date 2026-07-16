# #360 — Le coach met l'alternance en priorité n°1 (3.0 · Vague 1, tranche 2) (2.0.4)

Suite au retour d'Adrien : « Et la partie Alternance ? ». Le coach adaptatif livré en #359 ne
connaissait que 4 piliers (entraînement, focus, sommeil, nutrition) — **pas l'alternance**, alors
que c'est sa priorité n°1 réelle, avec une échéance dure (1er août). Corrigé.

## Ce qui change

- `adaptiveCoachFocus` gagne une **branche alternance en priorité ABSOLUE**, testée avant tous les
  piliers de momentum : tant qu'Adrien cherche (≥ 1 candidature, aucune acceptée) et qu'il **n'a pas
  postulé aujourd'hui**, « Le focus du moment » affiche **« Postule aujourd'hui pour ton alternance »**
  (ton `urgent`, liseré rouge) avec **le compte à rebours avant août + son avancement hebdo (x/objectif)
  + sa série** (via `applicationStats`/`alternanceDeadline`). Un clic ouvre l'onglet Alternance.
  Dès que sa candidature du jour est envoyée (ou une alternance décrochée), le coach repasse aux
  autres piliers.
- La relance « Postule aujourd'hui » **quitte le digest « À rattraper »** (`attentionDigest`) — elle
  vit désormais uniquement dans le coach, plus riche et plus motivante. Fini le doublon sur l'accueil.

## Pourquoi ce choix

Adrien : « le but c'est de vraiment me pousser à postuler aux entreprises… me motiver chaque jour à
faire des candidatures, surtout avant Août ». Le coach est LA surface « la chose du jour » : y mettre
l'alternance en tête tant qu'il ne l'a pas décrochée, c'est exactement le levier demandé.

## Vérification navigateur

- Sport en recul (aurait donné `rebuild`) MAIS pas postulé aujourd'hui → le coach affiche bien
  l'**alternance** (`coach-urgent`), « Plus que 16 j avant août · 1/5 candidatures cette semaine »,
  clic → onglet Alternance ✅.
- Postulé aujourd'hui → l'alternance s'efface, le coach revient au sport (`rebuild`) ✅.
- Le digest ne contient plus « Postule aujourd'hui » ✅. Aucune erreur console.

## Tests

376 tests `node:test` (branche alternance : prime sur les piliers quand pas postulé du jour, s'efface
si postulé aujourd'hui ou alternance acceptée ; digest n'émet plus l'alternance) + smoke `coachFocus`
étendu (assertion alternance) et `alternance` ajusté (digest = 0 item alternance).

## Contexte

Build **2.0.4**. Item 2/4 de la rotation 3.0 (pas de tag). Vague 1 (Coaching adaptatif) toujours en
cours.
