# #608 — Décharge (deload) muscu : le coach dit QUAND lever le pied

**Build 2.0.222** · série coaching élite (exception de rotation assumée `athlete`, cf. ROADMAP §868
et VPS-AUTOPILOT §1) · demande de nuit d'Adrien « coaching à fond ». Item ROADMAP « Volume & DELOAD
muscu » (§891) coché.

## Le manque (vérifié dans le code)

`setLandmark(sets)` sait étiqueter le volume hebdo d'UNE zone (MEV≈10 / optimal / MRV>20), mais **rien
ne recommandait une décharge** sur accumulation de volume. Les décharges existantes sont d'un autre
type :

- `currentBlock`/`blockPhaseHeadsUp` : décharge **planifiée** (semaine 4 fixe du bloc objectif de
  4 sem.) — indépendante du volume réellement logué, et seulement si un bloc objectif est en cours.
- `loadAdvice`/`racePhase` : décharge sur pic **ACR (aigu/chronique)** — signal de **course**, pas de
  volume muscu par groupe musculaire.

Aucune fonction ne regardait les séries hebdo par zone sur plusieurs semaines pour dire « tu enchaînes
la charge depuis trop longtemps, prends une semaine de décharge ». C'est le geste de base d'un coach de
prépa (mésocycle) — il manquait.

## La science d'abord (méthode obligatoire §872)

WebSearch → **Renaissance Periodization / Israetel** (volume landmarks MEV→MAV→MRV, mésocycle) +
**Helms/Zourdos** :

- Le mésocycle **accumule** le volume de MEV≈10 vers MRV≈20 séries/muscle/sem sur **~4-6 semaines**,
  puis **décharge** (5-7 jours).
- La semaine de décharge **tombe le volume à ~50-65 %** (soit **−40 à −50 % de séries**), **garde les
  charges et la technique** — on baisse le VOLUME, pas l'intensité.
- Objectif : dissiper la fatigue accumulée → **surcompensation**, éviter la stagnation/le surmenage.
- Déclencheur secondaire : **signaux de fatigue** (la décharge peut tomber plus tôt).

## Livré (logique pure testée + rendu + smoke bloquant)

1. **`deloadRecommendation(workouts, todayKey, opts)`** (pur, `logic.js`) — agrège les séries par zone
   sur `weeksBack` semaines glissantes (défaut 6), compte les **semaines DURES consécutives** parmi les
   semaines **complètes** (semaine en cours exclue car incomplète). Une semaine « dure » = volume total
   ≥ 55 % du pic ET ≥ 15 séries ; une **semaine légère casse le compteur** (= décharge déjà prise).
   `due` quand l'accumulation atteint `hardWeeksTrigger` (défaut **5**, reason `accumulation`), **ou plus
   tôt** si `opts.readiness < 45` après ≥ trigger−2 semaines dures (reason `fatigue`). Renvoie aussi
   `peakZone`/`peakSets`/`overMrv` (zone la plus chargée, dépassement MRV) et `null` si historique
   insuffisant (< 2 sem. avec séries). **Display-only** : n'alimente aucun compteur (pas de `coachLog`).
2. **Rendu** (`app.js`, bloc `#weeklySets`) : quand `due`, une carte **« 🧊 Décharge conseillée »**
   s'affiche **au-dessus** du bilan de séries par groupe, avec le conseil (−40 à −50 % sur 5-7 j).
   `readinessScore(state.recovery.at(-1))` alimente la branche fatigue. CSS `.ws-deload` dans
   `athlete.css` (bleu glacé, cohérent avec les autres alertes).
3. **Smoke bloquant `deloadReco`** : accumulation (5 sem. → `due`/`accumulation`/`hardWeeks:5`),
   semaine légère qui casse le compteur (`due:false`, `hardWeeks:2`), fatigue (3 sem. + readiness 40 →
   `due`/`fatigue`), et `null` sur historique insuffisant. Présence de `#weeklySets` vérifiée.

## §4 ter — contrôle de cohérence

La carte est **autonome** (son propre bloc `.ws-deload`), pas concaténée au pavé coach : elle ne
grossit pas les 89 clauses d'`adaptiveCoachFocus`. Rendue sur un cas chargé (5 semaines à 18 séries),
le message se lit d'une traite (« 5 semaines de charge soutenue d'affilée : c'est l'heure d'une semaine
de décharge — coupe le volume de 40 à 50 %… ») et ne redonde pas avec les lignes de séries par zone
juste en dessous (elles montrent le volume, la carte dit quoi en faire). Un seul conseil, clair.

## Ambitieux mais sûr

Le déclencheur est **conservateur** : accumulation d'au moins 5 vraies semaines de charge, ou fatigue
avérée (readiness basse) après ≥ 3 semaines dures. Une semaine light spontanée remet le compteur à
zéro → pas de harcèlement. Le conseil ne baisse jamais l'intensité ni les charges (préservation de la
force/du muscle), il ne coupe que le volume, 5-7 jours — exactement le protocole RP/Helms.

## Vérif

`cd src && xvfb-run -a npm run verify` → **559 tests + smoke 100 % vert** (1 test logique groupé +
1 check smoke bloquant `deloadReco`).

Domaine : athlete
