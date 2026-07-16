# #385 — Couverture de `parseIcsDateTime` (import calendrier)

## Le manque (couverture §4.1, chemin d'import calendrier)

`parseIcsDateTime(value)` — cœur du parsing des dates iCalendar à l'import `.ics`
(abonnement/export Google Agenda & Apple Calendrier, via `parseIcs`) — était la **seule fonction
pure substantielle ni exportée ni testée** de `logic.js`. Elle porte pourtant une vraie complexité
sujette aux régressions :

- trois formes de valeur (`YYYYMMDD` journée entière, `…THHMMSS` heure flottante,
  `…THHMMSSZ` instant UTC), secondes optionnelles ;
- conversion **UTC → date/heure locales** pour le suffixe `Z` (une réunion à midi UTC doit
  s'afficher à l'heure du fuseau de l'appareil) ;
- champ `ms` sortable cohérent entre les trois formes ;
- entrées invalides/vides/nulles → `null`, espaces tolérés.

Aucun test ne verrouillait ce comportement : une régression future (conversion de fuseau,
secondes, format compact) serait passée inaperçue.

## Le geste (couverture, zéro changement de comportement)

- **Export** de `parseIcsDateTime` (ajoutée à `module.exports`, à côté de `parseIcs`) — aucune
  incidence runtime, seulement la surface de test.
- **+4 blocs de tests** (`logic.test.js`, 412 → **416**) :
  1. journée entière → `allDay:true`, `time:''`, `ms = Date.UTC(…)` ;
  2. heure flottante → mur-de-l'horloge conservé (pas de conversion), secondes facultatives
     (`…T0930` ≡ `…T093000`) ;
  3. instant UTC (`Z`) → `ms` = vrai instant, `date`/`time` en heure **locale** ;
  4. entrées invalides / vides / null → `null`, format `YYYY-MM-DD` (tirets) rejeté, `trim`.

**Portabilité** : le cas `Z` dérive la date/heure attendues du **même instant** (`new Date(r.ms)`)
au lieu de coder en dur une heure locale — le test reste vert quel que soit le fuseau de la machine
qui l'exécute (le VPS tourne en UTC+2). Les cas journée-entière et flottant sont, eux,
indépendants du fuseau (`Date.UTC`).

## Vérification

`xvfb-run -a npm run verify` : **416 tests + smoke** verts (412 → 416). Smoke **inchangé**
(aucune modification du renderer).

## Contexte

**Pas de bump de version** : changement tests + export sans effet utilisateur (§6 de
VPS-AUTOPILOT). Build reste **2.0.28**. Backlog autonome §4.1 (couverture d'une fonction pure non
testée, cas limites réels : fuseaux, secondes, formats). Aucune Release, zéro dépendance, aucune
donnée perso, aucune feature retirée. Boucle #385.
