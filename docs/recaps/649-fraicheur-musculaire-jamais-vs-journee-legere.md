# #649 — Fraîcheur musculaire : plus de « journée légère » quand des groupes n'ont jamais été travaillés (build 2.0.257)

**Domaine choisi.** Priorité de nuit = coaching. Rotation §4 bis (5 derniers par numéro :
`648=focus, 647=coach, 646=athlete, 645=nutrition, 644=coach`) → `focus`/`coach` (2 derniers) exclus,
`coach` aussi 2× → exclu ; **`athlete`** pris (1× sur 5, hors 2 derniers), aligné priorité de nuit.
La mémoire notait que les pistes athlète de code étaient closes et demandait une **exploration neuve** :
faite (agent Explore ciblé muscu/running/readiness/deload/blocs, hors pistes closes #633/#637/#640/#643/#646).
Quota §4 bis.4 non déclenché (#645 est une proposition dans les 10 derniers recaps).

**Le défaut (contradiction §3, catégorie encouragée — un guard qui en contredit un autre).** Sur la carte
« 💪 Fraîcheur musculaire » (onglet Athlète, `app.js:149`), la ligne de synthèse listait les groupes
`Prêt aujourd'hui` (statut `ready`, reposés ≥ 2 j) et, à défaut, tombait sur
« Tous les groupes travaillés récemment — pense à une journée légère ». Le repli faisait l'hypothèse
**« aucune zone `ready` ⇒ toutes travaillées récemment »**, fausse : `zoneFreshness` (`logic.js:2845`)
classe chaque zone en `ready` / `recent` (< 2 j) / **`never`** (jamais travaillée), et le filtre
`z.status==='ready'` **écartait les `never`**. Résultat, dès qu'on n'avait ciblé qu'un ou deux groupes,
la carte affichait deux lignes voisines contradictoires :

- « Tous les groupes travaillés récemment — pense à une **journée légère** » (repos), et juste en dessous
- « 🎯 À privilégier aujourd'hui : Bras — **jamais travaillé encore** » (`suggestTrainingFocus`, `app.js:150`).

**Cas prouvé** (rendu vérifié en Node, aujourd'hui 2026-07-21) :
`workouts = [{ date:'2026-07-20', exercises:[{ name:'Gainage planche' }] }]` (abs hier, seul) →
`zoneFreshness` : `abs` `recent`, les 6 autres `never` → **0 zone `ready`** → « journée légère »,
alors que `suggestTrainingFocus` pousse « À privilégier : Bras — jamais travaillé encore ». Cas
ultra-fréquent (débutant après 1-2 séances, ou quiconque n'a ciblé qu'un ou deux groupes).

**Racine.** `suggestTrainingFocus` (`logic.js:2871`) définit déjà `rested = f.status === 'ready' || f.status === 'never'`
— une zone jamais travaillée EST disponible aujourd'hui. La synthèse de fraîcheur ne suivait pas cette
même sémantique.

**Correctif (curation §3, zéro champ, une ligne).** `app.js:149` : le filtre passe de `z.status==='ready'`
à `z.status==='ready'||z.status==='never'`. La synthèse dit alors « Prêt aujourd'hui : Bras, Dos, … »
(les groupes réellement disponibles, `ready` OU jamais faits, aligné sur la ligne « À privilégier ») et ne
conseille « journée légère » **que** si les 7 zones sont `recent` (toutes travaillées ces 2 derniers jours) —
le seul cas où le repos est le bon message. Aucune fonction pure modifiée (le bug était purement au rendu).

**§4 ter (rendu cumulé relu).** Cas chargé (abs hier + pectoraux il y a 5 j + le reste jamais) →
« Prêt aujourd'hui : Bras, Pectoraux, Dos, Épaules, Jambes, Fessiers. » + « À privilégier : Bras — jamais
travaillé encore. » : la synthèse dresse l'inventaire des disponibles, la recommandation pointe la priorité
du jour — une seule voix, plus de « repose-toi / entraîne-toi » dos à dos.

**Au passage.** Les checks smoke `zoneFreshness` et `focusSuggestion` existaient mais n'étaient
**jamais poussés dans `errors`** (donc non bloquants) : le nouveau `zfRestFallback` est, lui, bloquant.

**Tests.** Nouveau check smoke **bloquant** `zfRestFallback` (pilote `renderAthlete` avec le scénario
abs-seul-hier, lit `#zoneFreshness` : doit contenir « Prêt aujourd'hui » et **pas** « journée légère »).
574 tests + smoke 100 % vert. Build 2.0.257.

Domaine : athlete
