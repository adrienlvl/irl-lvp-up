# #604 — Affûtage (taper) avant une course : le programme de semaine allège tout seul le volume

**Build 2.0.219** · série coaching élite (exception de rotation assumée `athlete`, cf. ROADMAP §807
et VPS-AUTOPILOT §1) · demande de nuit d'Adrien « coaching à fond ».

## Le manque (vérifié dans le code)

La phase `taper` existait dans `racePhase` (weeksLeft ≤ 2) mais **seulement pour l'affichage** : elle
alimentait `raceGoalStatus.longRunMin` (la carte objectif course), rien d'autre. **Aucun des deux
générateurs de semaine ne réduisait réellement le volume** à l'approche d'une course :

- `buildTrainingWeek` (surface « Programme de la semaine », `#wpResult`) ne recevait **aucun contexte
  course** — il polarisait 80/20 (#601) et posait une séance qualité VO2max (#603), sans jamais tapér.
- `buildWeekPlan` (« Générer ma semaine ») recevait `phase` mais l'affûtage y supprime juste le
  fractionné — il ne coupe pas le volume.

Résultat : un coureur à J-4 de son marathon se voyait proposer un volume plein. C'est exactement ce
qu'un coach d'endurance ne fait jamais.

## La science d'abord (méthode obligatoire §825)

WebSearch → **Bosquet et al. 2007** (Med Sci Sports Exerc, méta-analyse de référence, 27 études) +
Mujika & Padilla 2003 :

- Sur les **~2 dernières semaines**, **réduire le VOLUME de 41-60 %** (≈ le diviser par deux) en
  **coupant la durée** des séances.
- **Garder l'INTENSITÉ** (allure course / VO2max) — la baisser n'apporte **rien** — et **garder la
  FRÉQUENCE** (même nombre de séances).
- **Décroissance exponentielle/progressive** du volume > palier sec.
- Durée d'affûtage **échelonnée par distance** : ~1 sem (10 km) → ~2 sem (semi/marathon) → ~2,5 sem
  (ultra/trail).
- Gain attendu **~2-4 %**.

## Livré (logique pure testée + rendu + smoke bloquant)

1. **`taperPlan(daysLeft, raceKm)`** (pur, `logic.js`) — renvoie `null` hors fenêtre d'affûtage (course
   lointaine, passée, **ou absente** — garde `daysLeft == null` avant `Number()`, sinon `Number(null)===0`
   déclencherait un faux affûtage J-0, **bug attrapé au test**). Sinon : `volumeMul` (décroissance
   exponentielle `floor + (start-floor)·e^(−2,3·p)`, bande 41-60 %), `cutPct`, `raceWeek`, `label`, `note`
   citant Bosquet 2007. Durée d'affûtage 7/11/14/18 j selon la distance.
2. **Intégration `buildTrainingWeek`** : nouvelle option `raceDaysLeft`/`raceKm` → quand l'affûtage est
   actif, les distances de course sont **mises à l'échelle** par `volumeMul` (volume réduit), la
   **fréquence est préservée** (même nb de courses) et la **séance qualité reste** (intensité gardée).
   L'objet renvoyé porte `taper`.
3. **Rendu `renderWeekProgram`** (`app.js`) : passe le contexte course (`raceGoalStatus`) au générateur
   et affiche un **bandeau `.wp-taper`** expliquant la coupe. CSS dédié dans `strength.css`.
4. **Smoke bloquant `weekProgramTaper`** : vérifie coupe > 20 %, fréquence conservée, et **pas**
   d'affûtage quand la course est lointaine.

## Vérif

`cd src && xvfb-run -a npm run verify` → **551 tests + smoke 100 % vert** (2 nouveaux tests logique +
1 check smoke). Contrôle §4ter fait : bandeau rendu sur un cas chargé (marathon J-4), cohérent avec la
grille de semaine et la carte objectif course, non redondant avec `wp-note`.

Domaine : athlete
