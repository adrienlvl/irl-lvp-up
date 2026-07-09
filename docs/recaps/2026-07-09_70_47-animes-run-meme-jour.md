# Boucle #70 — 47/47 animés + option « muscu + run le même jour » · build 1.9.3

**Demandes d'Adrien :** la dernière planche d'animation ; l'option de faire **muscu + run le même jour** (« je vais pas m'empêcher de courir parce que je fais de la muscu le matin »).

## 47/47 exercices animés

Planche 24 intégrée (`exercise-illustrations-v24.png`) : **Équilibre unipodal** (`24 p0 p3`) + **Pont fessier une jambe** (`24 p1 p4`), vérifiée par lecture d'image. → **les 47 exercices ont une animation début↔fin**. Test verrouillé : `exercises.every(e => EXERCISE_ANIM[e.name])`.

## Planificateur : muscu + run le même jour

`buildTrainingWeek(zones, strengthDays, runs, sameDay)` gagne un 4ᵉ paramètre :
- **sameDay = false** (défaut) : jours séparés, muscu/run intercalés (comportement existant).
- **sameDay = true** : une journée = muscu **+** un/des runs attachés (round-robin), **sortie longue le dernier jour**. Case à cocher « Muscu + run le même jour » dans le panneau.

Planification : sur une journée combinée, la **muscu est posée à 18h** et le **run à 07h30** (2 créneaux distincts, même date) — reflète « muscu le matin, run plus tard ». refId distincts → idempotent.

## Vérifs

- `npm run verify` → **124 tests / 124 pass** (+1 : mode « même jour »), **SMOKE OK** (`weekProgram:true`).
- **Flux réel Electron** (bras+jambes, 3 muscu + 2 runs, même jour) : 3 jours de muscu, 2 runs attachés, planification **20 séances / 4 sem.**, dont **8 journées portant muscu 18h + run 07h30**, **idempotence** confirmée (20 → 20).
- Correction test icônes : l'exemple « non animé » (Équilibre unipodal) étant désormais animé → remplacé par un nom fictif.

## Reste

- Publication du lot sur GitHub (`npm run release` — action d'Adrien, tuto rappelé).
- Signature de code (supprime l'avertissement SmartScreen) — plus tard.
