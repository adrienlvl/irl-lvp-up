# 410 — Couverture de test de `compareApplications` (dernière fonction pure non testée)

## Le manque (couverture — §4.1)

Un audit de couverture (357 fonctions exportées croisées avec les fonctions référencées dans
`src/test/logic.test.js`) a montré qu'**une seule** fonction pure exportée n'était **jamais**
exercée par un test : `compareApplications` (`src/lib/logic.js:169`). Son commentaire d'intention
(l. 168) affirmait pourtant « Pur + **testé** » — c'était faux.

C'est le comparateur qui **ordonne tout le suivi de candidatures** de l'onglet 💼 Alternance
(`app.js` : `state.applications.map(normalizeApplication).sort(compareApplications)`), au cœur de la
priorité de vie d'Adrien (décrocher une alternance). Son contrat est subtil et jamais verrouillé :

- clé primaire = **étape du pipeline** (`a_postuler → postule → relance → entretien → accepte → refus`) ;
- pour les **« à postuler »** : **score décroissant** (meilleures cibles en tête, celles sans note en
  queue), puis départage par **date décroissante**, puis par ajout le plus récent ;
- pour **les autres étapes** : **date décroissante d'abord** (activité récente), puis score, puis ajout.

La bascule score-d'abord (à postuler) vs date-d'abord (autres) n'était garantie par rien.

## Le geste (tests seulement, zéro changement de logique)

`src/test/logic.test.js` — nouveau test `compareApplications` couvrant le contrat documenté :

1. tri primaire par étape du pipeline (ordre `JOB_STATUSES`) ;
2. « à postuler » : score décroissant, sans note en dernier ; égalité de score → date décroissante,
   puis ajout le plus récent ;
3. **contraste clé** : pour un statut avancé (`entretien`), une date récente passe **devant** un
   meilleur score — l'inverse de « à postuler » ; date manquante (`''`) reléguée en queue de groupe ;
4. cohérence du comparateur : antisymétrie (`cmp(a,b)<0 ⇔ cmp(b,a)>0`) et réflexivité (`cmp(a,a)===0`),
   l'étape primant toujours sur score/date ;
5. **chemin de production réel** : `normalizeApplication` puis `sort` → « à postuler » en tête, la
   mieux notée d'abord, refusée en queue.

Vérification préalable au call-site : les entrées sont **toujours normalisées** (`normalizeApplication`
coerce statut/score/date), donc le cas `JOB_STATUSES.indexOf(status) === -1` (statut inconnu qui
trierait avant `a_postuler`) **n'est pas atteignable en usage réel** — aucun correctif fabriqué, la
fonction est saine sur son domaine réel. Le test se limite à verrouiller le comportement documenté.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **432 tests + smoke 100 % verts** (`SMOKE OK`). **Aucun bump**
de version : changement sans effet utilisateur (tests uniquement, cf. CLAUDE.md / VPS-AUTOPILOT §2.6)
→ ni CHANGELOG, ni `package.json`, ni assertions `whatsNew` touchés. Le commentaire « Pur + testé »
de `compareApplications` est désormais **exact**. Backlog autonome **§4.1 (couverture de tests)**,
variété assumée après la famille « arrondi/parseur » des boucles #400→#409 : cette itération n'ajoute
aucune logique, elle ferme le dernier trou de couverture des fonctions pures — dans le module sacré
Alternance. Aucune Release, zéro dépendance, aucune donnée perso, aucune feature retirée. Boucle #410.
</content>
</invoke>
