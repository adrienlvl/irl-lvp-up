# #555 — P6.1 : le modèle multi-épreuves `examGoals[]` + sa migration rétro-compatible

**Boucle #555 · pas de bump (aucun effet utilisateur encore) · domaine `etudes`.**

## Pourquoi cette tâche (et pas le coach)

La **priorité de nuit** (DEMANDES.md) reste le coaching adaptatif, mais §3 de VPS-AUTOPILOT.md
impose que la **rotation des domaines (§4 bis) s'applique PLEINEMENT au coach** — et une demande
d'Adrien ne prime **jamais** sur §3. Le domaine `coach` figure dans le **dernier** recap (#554,
`sportHabitDay`) → **interdit cette itération**. `tests` aussi (recap #553). J'ai donc servi la
**2ᵉ demande** de DEMANDES.md — « fais activement avancer la roadmap CAP 3.0 » — en prenant la tâche
nommée **P6.1**, du domaine `etudes` (absent des 5 derniers recaps → autorisé).

P6.1 est aussi marquée **« ⭐ le plus utile à Adrien »** dans la roadmap : c'est le besoin réel de
son **BTS CG** (suivre Droit et Compta à deux dates), et c'est la 1ʳᵉ étape validée de P1.3 (option A).

## Le manque, vérifié dans le code avant de coder

- `examGoal` est un **objet unique** `{title,date}` (`app.js:22`, defaults). Le formulaire de
  planning **écrase** l'épreuve précédente à chaque envoi (`app.js:920`, affectation directe
  `state.examGoal={...}`). Impossible de suivre deux épreuves à des dates différentes.
- 5 consommateurs le lisent au singulier (`examCountdown`, `examReminderDue`, `studyPacing`,
  `upcomingKeyDates`, `keyDateMarkers`) — **non touchés ici**, c'est P6.2.
- Aucun `examGoals` (pluriel) n'existait nulle part (`grep` : 0 occurrence).

## Ce que fait cette étape (modèle + migration SEULEMENT)

Deux fonctions **pures et testées** dans `logic.js`, exportées :

- **`normalizeExamGoal(item)`** → `{ id, subject, title, date }`. `subject` en **texte libre**
  (aucune matière BTS ni date inventée — `studyBySubject` déduit déjà la matière du titre) ; `date`
  validée `YYYY-MM-DD` ; **id stable** dérivé de la date (`exam-2026-06-15`) ou, à défaut, d'un slug
  du titre replié sans accents (`exam-compta-generale`) — pour survivre à la migration sans
  `Date.now()`/`Math.random()` (indisponibles côté logique). id fourni conservé (trim).
- **`normalizeExamGoals(state)`** → liste normalisée. Si `examGoals` existe déjà, on la normalise et
  on écarte les entrées vides / dates invalides / non-objets, avec **dédoublonnage par id** ;
  **sinon** on retombe sur l'ancien `examGoal` unique, qui devient le **PREMIER (et seul) élément —
  sans perte**. Un état neuf donne `[]`.

Câblage minimal côté renderer (aucun changement de rendu) :

- `examGoals: []` ajouté aux `defaults` (`app.js:22`), **à côté** de `examGoal` conservé.
- `normalizeState` appelle `normalizeExamGoals(next)` après la normalisation de `examGoal`
  (`app.js:23`). **`examGoal` reste lu tel quel** pour compatibilité — les consommateurs ne sont
  portés qu'en P6.2, donc rien ne casse aujourd'hui.

## Preuve « teste la migration EN PREMIER »

`test('normalizeExamGoals : migration rétro-compatible…')` couvre : état neuf → `[]`, `null`/`{}` →
`[]`, legacy unique → 1 élément identique (sans perte), `examGoals` présent → legacy ignoré + entrée
vide écartée + id dérivé, dédoublonnage par id, `examGoals` non-tableau → repli sur legacy.
`test('normalizeExamGoal …')` couvre coercion/bornes/trim, date invalide → vide, id fourni conservé,
slug sans accents, entrées `null`/tableau → objet vide. **522 tests + smoke Electron : 100 % verts.**

## Pas de bump (§2.6)

Aucune surface **que l'utilisateur lit** ne change : pas de nouvelle UI, aucun consommateur porté.
Donc **pas d'entrée `CHANGELOG` ni de bump `package.json`** — l'app reste en 2.0.184. La valeur est
strictement **fondation** pour P6.2 (porter les 6 consommateurs) puis P6.3 (UI ajouter/lister/
supprimer, avec check smoke bloquant).

## Suite

- **P6.2** — porter les consommateurs à `examGoals[]` (règle : prendre l'épreuve la plus proche, ou
  itérer là où la liste a du sens). Un ou deux par boucle, avec leurs tests. **Change de domaine
  d'abord** (etudes vient d'être joué).
- **P6.3** — UI multi-épreuves (renderer → check smoke **bloquant**), après P6.2 verte.

Domaine : etudes
