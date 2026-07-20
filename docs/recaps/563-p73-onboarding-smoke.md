# #563 — P7.3 : parcours « onboarding complet » dans le smoke (domaine `tests`, pas de bump)

## Contexte & choix de la tâche (rotation §4 bis)

Contrôle des 5 derniers recaps avant de coder :
`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` (recaps #558→#562) →
`etudes(562) · coach(561) · tests(560) · etudes(559) · coach(558)`.

- `coach` (la **priorité de nuit** de `docs/DEMANDES.md`) apparaît dans le **dernier** recap (#561)
  **et 2×** dans les 5 derniers (#558, #561) → **interdit** cette boucle par §4 bis.3. Comme établi
  depuis #555/#556, la rotation prime **même sur la demande de nuit** (§3 : le coach est un domaine
  « comme les autres »).
- `etudes` : **2×** dans les 5 derniers (#559, #562) **et** dans les 2 derniers (#562) → **interdit**.
- `tests` : présent **une seule fois** (#560), **pas** dans les 2 derniers → **autorisé**.

Je sers donc la **2ᵉ demande d'Adrien** (faire avancer le CAP 3.0) avec une tâche **nommée** en
domaine autorisé : **P7.3**, le troisième et **dernier** parcours utilisateur scripté du smoke
(P1.5 tranchée → option B « étendre le smoke, zéro dépendance »). C'est l'ordre conseillé au
démarrage VPS (« alterne librement entre P6.2, P7.2/P7.3, P4, P2 »). P7.1 (#556) et P7.2 (#560)
étant faits, **P7.3 clôt la série P7**.

## Le manque, vérifié dans le code (§2.3)

- Le smoke ne jouait que **deux** enchaînements (`recordSessionJourney`, `studyPlanJourney`) ; le
  parcours de **premier lancement** — pourtant le tout premier contact d'un utilisateur avec l'app —
  n'était couvert par **aucun** test de bout en bout.
- Le flux existe bien : `#onboardingDialog` (`index.html:261`) → handler `$('#finishOnboarding').onclick`
  (`app.js:871`) → `onboardingSetup(onboardingInputs())` (`logic.js:3270`) → `scheduleObjectiveProgram`
  (place le programme 4 sem. dans `state.agenda`, `app.js:683`) → `suggestedQuests` (`logic.js:97`)
  → habitude de départ (`starterHabitFor`, `logic.js:3329`) → `onboardingDone` + `blockStart` +
  `showPage('athlete')` + récap `#onboardingRecapDialog`. Rien ne l'exerçait scripté.

## Ce que fait le check `onboardingJourney` (bloquant)

Troisième enchaînement scripté, sur le modèle de `recordSessionJourney`/`studyPlanJourney` (état
sauvegardé/restauré, haptic neutralisé par prudence) :

1. **Remplissage réel** du formulaire de départ : objectif `muscle`, poids `80`, taille `178`,
   âge `30`, niveau `intermediaire`, activité `modere`, `3` séances, jours lun/mer/ven, créneau
   `soir`, tout le matériel coché, habitude de départ cochée.
2. Le **nombre de séances attendu** est **recomputé** exactement comme le handler
   (`objectiveProgram` + `assignProgramDays`, `week.length × 4`) à partir des mêmes entrées — pas un
   chiffre figé. `state.agenda`/`quests`/`habits`/`blockStart` vidés pour un décompte précis.
3. **Clic RÉEL** sur `#finishOnboarding`.
4. Assertions (état **cohérent en sortie**, l'exigence de P7.3) :
   - **4a** — profil et objectif appliqués : `onboardingDone === true`, `fitnessObjective === 'muscle'`,
     `profile.weight === 80`, `profile.level === 'intermediaire'` ;
   - **4b** — le programme est placé dans `state.agenda` **au bon nombre** (== attendu recalculé, > 0) ;
   - **4c** — quêtes du jour créées (`state.quests.length > 0`) **et** habitude de départ ajoutée
     (`starterHabitFor('muscle').name` = « Protéines à chaque repas ») ;
   - **4d** — le bloc est initialisé (`blockStart` en clé `AAAA-MM-JJ`) ;
   - **4e** — **le DOM suit** : `#onboardingDialog` fermé, `#onboardingRecapDialog` **ouvert** et
     affichant le nombre de séances placées, bouton de nav `[data-page="athlete"]` **actif**.
5. **Restauration intégrale** : `profile`/`goals`/`fitnessObjective`/`objectiveSeed`/`activeProgram`/
   `blockStart`/`blockHistory`/`agenda`/`quests`/`habits`/`onboardingDone` remis, récap refermé,
   `save()` + `render()` + retour à la page d'origine.

## Piège attrapé pendant l'écriture (vert ≠ juste du premier coup)

Première version : je filtrais les créneaux par `a.source === 'objprog'` → **0 trouvé** alors que
les 28 séances étaient **bien placées** (le récap affichait « 28 »). Cause : `normalizeAgendaItem`
(`logic.js:766`) **réécrit** `source` en `'manual'` quand la valeur n'est pas dans `AGENDA_SOURCES`
(`['manual','training','study-glc','imported','planner']` — `'objprog'` n'y est pas), mais **conserve
le `refId`** (via le spread) et `kind:'sport'`. Le marqueur fiable du planificateur d'objectif est
donc le **`refId` préfixé `objprog-`**, pas le champ `source`. Filtre corrigé → `slots === 28 ==`
attendu. (Instrumentation temporaire ajoutée puis **retirée**.)

## Garde-fous & pièges respectés

- Piège §6 (checks injectés par **template literal**) : **aucun** backtick, `${}`, `\n` ni regex non
  échappés — assertions par **concaténation** (`querySelector`/`indexOf`) et comparaisons de longueur,
  jamais de `RegExp` (validation du `blockStart` par `length === 10 && indexOf('-') === 4`).
- Le nombre attendu est **recalculé**, jamais figé.
- Aucune XP créditée par ce flux → pas de célébration/`levelUp`, et haptic neutralisé (leçons #557) :
  **5 runs smoke consécutifs verts** (1 dans `verify` + 4 isolés).

## Vérif & versionnage

`cd src && xvfb-run -a npm run verify` → **526 tests + smoke verts** (`onboardingJourney: true`).
Changement **tests-only**, **aucun effet utilisateur** → **pas de bump** (§2.6, précédents #556/#560).

_La série **P7** (parcours utilisateur scriptés dans le smoke) est **close** : P7.1 séance (#556),
P7.2 planning de révision (#560), P7.3 onboarding (#563). Restent, côté CAP 3.0 selon la rotation :
**P6.3** (UI multi-épreuves, `etudes`) et **P4** (regex non ancrées, `robustesse`)._

Domaine : tests
</content>
</invoke>
