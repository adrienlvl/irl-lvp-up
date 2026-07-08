# Boucle #61 — Purge du CSS mort (B-2, build 1.8.4)

## Méthode (outillée, zéro devinette)

Script d'analyse : extraction des **366 classes** définies dans les 17 fichiers CSS, puis pour chacune recherche d'une **référence littérale** dans tout le code (`app.js`, `lib/*.js`, `index.html`). Détection des **préfixes dynamiques** (concaténation `'x-' +` et template `x-${…}`) pour ne pas prendre pour mortes des classes construites à la volée.

Résultat brut : **21 classes** sans référence littérale, dont **14 construites dynamiquement** (donc bien vivantes) :
- sprites photo d'exercices : `sheet-1..6` et `art-p0..p5` → `sheet-${parts[0]} art-${parts[1]}` dans `exercise-icons.js` ;
- priorité : `prio-high` / `prio-low` → `prio-${it.priority}` dans `renderMyDay`/`renderDayView`/`renderWeekPage`/`renderTodos`.

## Réellement mortes → retirées (7)

Vestiges d'anciennes maquettes, aujourd'hui remplacées :
- **Ancien calendrier hebdo** (remplacé par `week-page-day`/`week-chip`/`month-day`) : `agenda-item` (+ `.sport/.life/.study/.completed` + variantes `[data-toggle-agenda]` et thème clair), `agenda-panel` (+ `small`), `week-calendar`, `day-column` (+ `.today`, `b`). `data-toggle-agenda` : **0 référence** dans le code.
- **Ancien bloc trail/séance** : `trail-plan`, `trail-weeks` (+ `div/b/small`), `guided-log-fields` (+ `label/input/:focus`).

Fichiers touchés : `calendar.css` (1447 → 638 o), `theme.css`, `extras.css`, `trail.css`. **≈ −1,9 Ko** de CSS.

## Sûreté

- Suppression **chirurgicale** : seuls les sélecteurs morts retirés ; sélecteurs groupés vivants conservés (ex. `.month-day.today,.day-column.today` → `.month-day.today` ; `.profile-form,.guided-log-fields` → `.profile-form`).
- Aucune de ces 7 classes n'était portée par un élément du DOM (0 référence, aucun préfixe dynamique) → **le rendu est identique par construction**.
- `npm run verify` → **112 tests / 112 pass**, **SMOKE OK**. Re-analyse : plus que les 14 classes dynamiques légitimes.

## Reste du backlog

- **B-5** _(option)_ : découper les gros blocs de rendu d'`app.js` par domaine — prudent, à faire seulement si le gain lisibilité vaut le risque.
