# Boucle #72 — Séance guidée liée au programme (muscu) · build 1.9.6

**Demande d'Adrien :** « il faut que je puisse avoir une vraie séance guidée, liée au programme, surtout pour les séances de musculation et pas les runs. »

## Livré

Les séances **muscu** générées par le **planificateur intelligent** et le **programme par zone** portent désormais leur **liste d'exercices** sur l'événement d'agenda (champ `workout`, tableau de noms). Dans la **vue Jour**, ces séances affichent un bouton **▶️ Séance** qui lance la **vraie séance guidée** existante (`openGuidedWorkout`) :
- échauffement repliable + retour au calme,
- **photo animée** de l'exercice, cue, séries × reps,
- **log kg/reps par série + minuteur de repos** entre les séries,
- progression 1/N.

Les **runs n'ont pas** ce bouton (comme demandé) — ils restent de simples blocs agenda.

## Détail technique

- `lib/logic.js` : `normalizeAgendaItem` conserve/sanitize `workout` (≤ 12 noms) ; `todayItems` le propage aux items du jour.
- `app.js` : `scheduleWeekProgram` et `scheduleZonePlan` posent `workout: [exercices]` sur les séances muscu ; `startGuidedFromNames(title, names)` construit `{name, sets, reps}` depuis la bibliothèque et ouvre la séance guidée ; `renderDayView` ajoute le bouton ▶️ ; handler `data-day-guided`.

## Vérifs

- `npm run verify` → **124 tests / 124 pass**, **SMOKE OK** (`guidedFromPlan:true`).
- **Flux réel Electron** : événement « 💪 Bras — séance » avec `workout=[Pompes classiques, Tractions supination, Développé militaire KB]` → `workout` conservé (3), bouton ▶️ présent en vue Jour, clic → séance guidée ouverte, titre correct, **3 exercices chargés**, 1ᵉʳ = Pompes classiques.
- Capture : la séance guidée rend l'échauffement, la photo animée, 3×8 reps · repos 75s, le log des séries.

## Reste (demande n°2 d'Adrien)

**Menu Paramètres + connexions Strava / Garmin / Polar** → Vague S.8 (OAuth) : nécessite qu'Adrien enregistre une app développeur chez chaque service. Strava faisable en solo (OAuth2) ; Garmin/Polar = API partenaires gated. Plan à cadrer avec lui.
