# #559 — P6.2 (1/3) : les échéances clés lisent le modèle multi-épreuves `examGoals[]`

**Build : inchangé (2.0.185) — pas de bump.** Domaine : `etudes`.

## Pourquoi cette tâche (choix contraint)

- **Priorité de nuit = coaching adaptatif**, mais la **rotation §4 bis interdit `coach`** cette boucle :
  `coach` est dans le **dernier** recap (#558) **et** apparaît **2×** dans les 5 derniers
  (#558 + #554). Le §3 dit que la rotation prime **même sur la demande de nuit** → je sers la
  **2ᵉ demande d'Adrien** (faire avancer CAP 3.0), exactement comme #555/#556.
- Contrôle rotation (`grep "^Domaine :"` des 5 derniers) : `coach · robustesse · tests · etudes · coach`.
  `etudes` apparaît **une seule fois** (#555) et **pas dans les 2 derniers** → **autorisé**.
- Tâche **nommée** : **P6.2 — Porter les consommateurs vers `examGoals[]`** (ROADMAP → P6). Le modèle
  et la migration ont été posés en **P6.1 (#555)** ; aucun consommateur ne lisait encore la liste.

## Le manque, vérifié dans le code

`upcomingKeyDates` (puces d'échéances de « Ma journée ») et `keyDateMarkers` (marqueurs du calendrier
mensuel) prenaient un **`examGoal` unique** (`logic.js:1715`, `:1742`) et n'affichaient donc **qu'une
seule épreuve**. Ce sont précisément les deux surfaces « où la liste a du sens » (P6.2) : un BTS a
plusieurs épreuves à des dates différentes (Droit, Compta, Anglais…) — on veut les voir **toutes**.

Les 4 autres consommateurs (`examCountdown`, `examReminderDue`, `studyPacing`, le coach) sont
**mono-valués** (ils choisissent UNE épreuve) : ils seront portés dans une prochaine boucle `etudes`
avec un sélecteur « épreuve la plus proche ». Cette boucle traite **les 2 consommateurs-listes**.

## Ce qui change

- **`upcomingKeyDates(examGoals, …)`** et **`keyDateMarkers(examGoals, …)`** acceptent désormais un
  **tableau** d'épreuves : chaque épreuve à venir (resp. tombant le jour donné) devient une puce /
  un marqueur. **Tolérance ascendante** : un objet unique `{title,date}` est enveloppé en liste — les
  tests et checks smoke existants (qui passent un objet) restent verts sans modification.
  `upcomingKeyDates` gagne un **départage stable par libellé** quand deux épreuves tombent le même
  jour (ordre déterministe).
- **`app.js`** : les deux appels lisent `state.examGoals` (la liste normalisée) au lieu de
  `state.examGoal` (`renderMyDay` l. 248, `renderMonthCalendar` l. 541).
- **Source unique tenue à jour** : le formulaire de planning (`app.js:920`) était le **seul** writer
  runtime de `state.examGoal` ; il ré-alimente maintenant `state.examGoals` dans la foulée
  (`normalizeExamGoals({examGoal})`), sinon le calendrier ré-rendu juste après aurait montré une liste
  **périmée**. Aujourd'hui, sans UI multi-épreuves (P6.3), la liste ne contient qu'une épreuve → cette
  resynchro est **sans perte**.

## Pourquoi pas de bump (§2.6)

L'UI de création multi-épreuves n'existe pas encore (P6.3) : le **seul** état atteignable reste
**mono-épreuve**, pour lequel le rendu est **strictement identique** à avant. Aucun effet utilisateur
visible → pas de bump, exactement comme **P6.1 (#555)**. Le gain est **structurel** (les deux surfaces
sont prêtes à afficher plusieurs épreuves dès que P6.3 permettra d'en créer).

## Vérification

- **Tests logiques** : chemin multi-épreuves ajouté à `upcomingKeyDates` (tri par proximité + épreuve
  passée exclue + départage par libellé) et `keyDateMarkers` (un marqueur par épreuve du jour).
- **Checks smoke bloquants étendus** : `keyDateMarkers` et `upcomingDeadlines` vérifient désormais
  **aussi** le passage d'un tableau de 2 épreuves (compat objet unique conservée).
- `cd src && xvfb-run -a npm run verify` → **523 tests + smoke OK**, 100 % vert.

## Suite (P6.2, reste 4 consommateurs)

Prochaine boucle `etudes` (quand la rotation le permet) : sélecteur « épreuve la plus proche » +
portage de `examCountdown`, `examReminderDue`, `studyPacing`, puis le consommateur coach. Ensuite
**P6.3** (UI ajouter/lister/supprimer) — renderer, check smoke bloquant obligatoire.

Domaine : etudes
