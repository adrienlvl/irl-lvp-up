# #603 — Séance qualité de course : de vrais intervalles VO2max qui tournent (build 2.0.218)

**Domaine : athlete.** Série coaching élite (exception de rotation assumée, ROADMAP « 🌙 DÉMARRAGE VPS » +
DEMANDES priorité de nuit « coaching à fond »). 1ʳᵉ tâche non finie de la liste : *#602 — VO2max / fractionné*
(le numéro de boucle #602 est allé à la proposition coach ; la tâche VO2max, elle, restait cochée à faire).

## Le manque, vérifié

La « séance qualité » posée en #601 (`buildTrainingWeek`) était un **simple tempo/seuil fixe** : même note
figée chaque semaine (« ~15-20 min à allure soutenue »). Un vrai coach d'endurance ne fait pas ça — il **fait
tourner** plusieurs familles de séances dures centrées sur **VO2max** (le plafond cardio qui tire la vitesse),
et il **progresse** d'un cycle à l'autre. C'est exactement ce que demandait la roadmap : « vraies séances
d'intervalles VO2max, variété + progression sur les semaines ».

## Science d'abord (méthode imposée, sources citées dans le code + CHANGELOG)

- **30/30 (Billat 2000)** : 30 s à ~VMA / 30 s footing lent → maximise le temps passé *près* de VO2max (~8 min)
  en restant mentalement tenable.
- **4×4 « Norvégien » (Helgerud 2007)** : 4 min à 90-95 % FCmax / 3 min footing → le protocole VO2max le plus
  étudié, **+7-10 % de VO2max en 8 semaines**.
- **Côtes VO2max** : 60-90 s dur en montée / descente en récup → charge le cardio ET la puissance en
  **protégeant les jambes** (moins d'impact qu'à plat) et affine la foulée.

WebSearch : synthèses Billat 30/30, protocole Norvégien 4×4 (Helgerud et al. 2007), côtes VO2 (« Corrine's VO2
hills »), progression 4-6 sem. **Ambitieux mais sûr** : reste **une seule** séance dure/semaine, le modèle
polarisé 80/20 (Seiler) est préservé — les faciles disent toujours « ~80 % du volume en zone 2 ».

## Ce qui a été livré (logique pure + tests + smoke bloquant)

- `qualitySession(week)` (pur, testé) : méso-cycle de **6 semaines** (3 familles × 2 tours) qui **tourne**
  (variété) et **progresse** (30/30 : 12→16 rép. · 4×4 : 4→5 blocs · côtes : 6→8). Renvoie `{key, family:'VO2max',
  reps, title, note, source}`. Entrées invalides → semaine 1, jamais de crash.
- `isoWeekNumber(dateKey)` (pur, testé) : numéro de semaine ISO 1-53 → sert d'index de rotation **sans état
  persistant** (la séance change naturellement chaque semaine réelle).
- `buildTrainingWeek` : le run qualité prend désormais son `title`/`note` de `qualitySession(opts.week)` et
  expose `session`. `renderWeekProgram` (app.js) passe `week: isoWeekNumber(localDate())`. Le rendu de la carte
  (titre + `<small>` de note) suit automatiquement — aucune autre modif de rendu.
- Smoke : check **bloquant** `qualitySessionVO2` (rotation ≥ 3 familles, progression, sources, bouclage du
  cycle, ISO, et câblage dans `buildTrainingWeek`). Test #4328 mis à jour (l'ancienne assertion attendait
  « tempo/seuil » dans le titre) + 2 tests dédiés (`qualitySession`, `isoWeekNumber`).

## Contrôle de cohérence (§4 ter)

Rendu réel des 6 semaines + de la carte (3 courses) relu en entier : titres courts et clairs, chaque note
autonome (échauffement → blocs → retour au calme), sources visibles, aucune redondance entre faciles/qualité/
longue. Ambitieux et sûr.

Vérif : `cd src && xvfb-run -a npm run verify` → **549 tests + smoke verts** (build 2.0.218).
</content>
</invoke>
