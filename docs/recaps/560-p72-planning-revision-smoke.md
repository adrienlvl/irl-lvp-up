# #560 — P7.2 : parcours « générer un planning de révision » dans le smoke (domaine `tests`, pas de bump)

## Contexte & choix de la tâche (rotation §4 bis)

Contrôle des 5 derniers recaps avant de coder :
`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` →
`etudes · robustesse · etudes · coach · tests` (recaps #555→#559).

- `coach` (la **priorité de nuit** de `docs/DEMANDES.md`) apparaît dans les **2 derniers** recaps
  (#558) → **interdit** cette boucle par §4 bis.3. Comme établi en #555/#556, la rotation prime
  **même sur la demande de nuit** (§3).
- `etudes` apparaît **2×** dans les 5 derniers (#555, #559) → **interdit** aussi.
- `tests` : présent **une seule fois** (#556), **pas** dans les 2 derniers → **autorisé**.

Je sers donc la **2ᵉ demande d'Adrien** (faire avancer le CAP 3.0) avec une tâche **nommée** en
domaine autorisé : **P7.2**, le deuxième parcours utilisateur scripté du smoke (P1.5 tranchée →
option B « étendre le smoke, zéro dépendance »). C'est exactement l'ordre conseillé au démarrage VPS
(ROADMAP l. 208 : « alterne librement entre P6.2, P7.2/P7.3, P4, P2 »).

## Le manque, vérifié dans le code

- P7.1 (#556) a posé **un seul** parcours scripté (`recordSessionJourney`). Le reste du smoke est un
  **rendu ponctuel** : aucun autre check ne joue un enchaînement clic → saisie → submit → assertion.
- Le flux « générer un planning de révision » est le second parcours métier prioritaire d'Adrien
  (BTS CG). Handler réel : `app.js:920` `$('#studyPlanForm').onsubmit` → `planStudySessions(...)`
  (`logic.js:1164`) → `mergePlannedEvents` → `save()` → `renderMonthCalendar()` + statut. **Aucun
  test ne l'exerçait de bout en bout.**

## Ce que fait le check `studyPlanJourney` (bloquant)

Deuxième enchaînement scripté, sur le modèle de `recordSessionJourney` (état sauvegardé/restauré) :

1. **Agenda vidé** (comptage précis) et `calendarCursor` calé sur **juillet 2026** pour que les
   créneaux (lun/mer/ven de ce mois) soient **visibles** dans `#monthCalendar`.
2. Remplissage réel du formulaire (`#studyTitle`/`#studyStart`/`#studyExam`/`#studyTime`/
   `#studyDuration` + cases `#studyDays` lun/mer/ven), du **06/07** au **31/07/2026**.
3. `dispatchEvent('submit')` **réel** sur `#studyPlanForm`.
4. Assertions :
   - **4a** — les créneaux atterrissent dans `state.agenda` (`kind: 'study'`, `source: 'planner'`)
     au **bon nombre** (comparé à `planStudySessions(...)` recalculé, pas un nombre en dur) ;
   - **4b** — le **statut** `#studyPlanStatus` affiche « créneau… » **et** le nombre généré ;
   - **4c** — **le DOM suit** : `#monthCalendar` contient au moins un `[data-edit-agenda="<id>"]`
     correspondant à un créneau généré.
5. **Restauration intégrale** : `agenda` / `examGoal` / `examGoals` / `calendarCursor` remis, puis
   `save()` + `renderMonthCalendar()` + `render()`.

Aucune célébration/haptic dans ce flux (pas d'award d'XP tant qu'on ne **valide** pas un créneau) →
pas de risque de flakiness type #557 : **4 runs smoke consécutifs verts** (1 dans `verify` + 3 isolés).

## Garde-fous & pièges respectés

- Piège §6 (checks injectés par **template literal**) : **aucun** backtick, `${}` ni `\n`/regex
  non échappés — assertions par **concaténation** (`querySelector('… ' + s.id + ' …')`) et `indexOf`,
  jamais de littéral de gabarit ni de `RegExp`.
- Le nombre attendu est **recalculé** via `planStudySessions`, jamais figé en dur → robuste aux
  changements de calendrier.

## Vérif & versionnage

`cd src && xvfb-run -a npm run verify` → **523 tests + smoke verts** (`studyPlanJourney: true`).
Changement **tests-only**, **aucun effet utilisateur** → **pas de bump** (§2.6, précédent #556).

_Reste P7.3 (onboarding complet) pour clore P7 ; et P6.2 (4 consommateurs mono-valués) côté
`etudes` — chacun quand la rotation le permet._

Domaine : tests
