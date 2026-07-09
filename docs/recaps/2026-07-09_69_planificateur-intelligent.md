# Boucle #69 — Planificateur intelligent « Ma semaine d'entraînement » · build 1.9.2

**Demande d'Adrien :** « l'application peut programmer ma semaine d'entraînement, muscu / renforcement, avec différents objectifs (gros bras, abdos, bas du corps) + les runs de la semaine — l'app doit être intelligente ! » Et : « j'ai perdu l'accès à la prépa de mes révisions ? »

## Livré — le coach de semaine

Page **Exercices → panneau 🧠 Ma semaine d'entraînement** :
- **Coche plusieurs objectifs** (bras, abdos, jambes, fessiers, pecs, dos, épaules).
- Règle **séances de muscu / semaine** et **runs / semaine**.
- **🧠 Générer ma semaine** → l'app compose la semaine complète :
  - répartit les zones sur les jours de force (zones tournantes, **5 exercices les plus ciblés** par séance) ;
  - **intercale muscu/run** pour espacer les jours durs ;
  - place la **sortie longue le week-end** ;
  - garde **au moins 1 jour de repos**.
- **📅 Programmer dans mon agenda (4 semaines)** → séances datées (dès lundi prochain, 18h), titre = type + 3 premiers exercices, **idempotent** (refId `week-<type>-<jour>-<date>`).

`buildTrainingWeek(zones, strengthDays, runs)` : pur + testé (bornes, ≥ 1 repos, jours uniques, sortie longue, exercices par séance).

## Révisions : rien de perdu

La prépa de révisions auto (`planStudySessions`, `#studyPlanForm`) est **intacte** — page **Calendrier → « 🎓 Planning de révision »**. Ajout d'un **rappel visible** vers elle dans le panneau « Ma semaine » (elle se planifie à part, jusqu'à la date d'examen).

## Vérifs

- `npm run verify` → **123 tests / 123 pass** (+1 : `buildTrainingWeek`), **SMOKE OK** (`weekProgram:true`).
- **Flux réel Electron** : objectifs bras+abdos+jambes, 3 muscu + 2 runs → 5 jours (3 muscu × 5 exos, 2 runs dont 1 longue), planification **20 séances / 4 semaines**, **idempotence confirmée** (20 → 20 au 2ᵉ clic).

## Reste

- Planche d'animation 24 (2 derniers exercices).
- Publication du lot `npm run release` (action d'Adrien).
