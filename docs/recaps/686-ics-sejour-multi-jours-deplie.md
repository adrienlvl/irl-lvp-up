# #686 — Import .ics : un séjour « journée entière » multi-jours apparaît chaque jour (2.0.287)

## Contexte de rotation & quota (contrôle AVANT de coder)

- **Domaines des 5 derniers recaps** (grep tolérant §4 bis.3) : `robustesse` (#685), `coach` (#684),
  `etudes` (#683), `robustesse` (#682), `coach` (#681). → **interdits** ce tour : `robustesse` (2 derniers
  + 2×/5) et `coach` (2 derniers + 2×/5). `etudes` libre (1×, hors 2 derniers) ; **`agenda` libre** (0×).
- **Domaine choisi : `agenda`** — cible **priorité #1 de la nuit du 22/07** (ROADMAP §« TA MISSION CETTE
  NUIT » : « parseurs CSV/**ICS** »), travail **non-visuel, vérifiable**, hors des zones gatées
  (classifieurs Alternance #663, coach/nutrition/athlete).
- **Quota §4 bis.4** : en lecture stricte, les 10 derniers recaps (676→685) ne contiennent **aucune**
  proposition (dernière = #674, désormais en position 11-12) → le quota pointe vers une proposition
  « prise dans ROADMAP P1 ». **Mais son objet littéral est épuisé** : les **6** propositions P1 sont
  toutes écrites (`[x]`) et tranchées par Adrien. La soupape est par ailleurs richement vivante (10
  propositions #574→#674, dont 7 en attente de décision d'Adrien). La **mission datée de cette nuit**
  (qui PRIME per VPS-AUTOPILOT) interdit d'implémenter les propositions en attente et dirige
  explicitement vers du **code non-visuel** robustesse/correction, avec « chaque correctif = cas prouvé
  en test node ». Inventer une 8ᵉ proposition serait du remplissage que le doc proscrit (§4 bis.5).
  → J'ai donc livré le **correctif prouvé** ci-dessous, en documentant la tension honnêtement.

## Le défaut (prouvé)

`parseIcs` (`logic.js:1159`) n'émettait qu'**un seul** événement — au jour de `DTSTART` — pour un
VEVENT « journée entière » qui s'étale sur plusieurs jours. Or en RFC 5545, le `DTEND` d'un événement
`VALUE=DATE` est **exclusif** (le lendemain du dernier jour). Conséquence utilisateur : en important un
calendrier Google/Apple contenant des vacances, un salon, des congés ou un déplacement de plusieurs
jours, **seul le premier jour apparaissait** ; les jours suivants disparaissaient de l'agenda.

Prouvé avant correctif (`node -e`) : `DTSTART;VALUE=DATE:20260101` / `DTEND;VALUE=DATE:20260105`
→ **1** événement (`2026-01-01`) au lieu des **4** jours couverts (01→04).

## Le correctif (§4.1 robustesse, domaine agenda)

Dans le bloc `END:VEVENT`, dépliage d'un séjour all-day en **une occurrence par jour couvert** :

- Uniquement pour un all-day **non récurrent** avec un `DTEND` all-day (`spanDays > 1`, borné ≤ 400).
  Les événements **horaires** qui passent minuit et les **récurrents** gardent leur comportement exact
  (jamais pire).
- Le **jour 1 conserve le refId de base** `ics-<uid>` → un import antérieur (un seul jour stocké) est
  **remplacé** proprement, pas doublé (aucun doublon de migration). Les jours suivants suffixent la date
  (`ics-<uid>-<YYYY-MM-DD>`) → **réimport idempotent** via `mergePlannedEvents` (vérifié : 4 jours,
  réimport → toujours 4).
- Dérivation des dates par `getUTC*` sur `cur.start.ms` (= minuit **UTC** pour un all-day → fidèle).

Effet utilisateur réel (les séjours importés s'affichent chaque jour) → **bump 2.0.287**.

## Vérifs

- 2 nouveaux tests node (échouent avant / passent après) : dépliage 4 jours + refIds + réimport
  idempotent ; **non-régression** all-day récurrent et horaire overnight non dépliés.
- Non-régression : le test all-day simple existant (Jul 12→13, `spanDays=1`) est inchangé.
- `cd src && xvfb-run -a npm run verify` → **586 tests + SMOKE OK**, 100 % vert. Les checks smoke
  `agendaImport`/`icsRrule`/`icsCount`/`icsRecurringMerge` restent verts.
- Contrôle §4 ter : pas de surface texte cumulée modifiée (logique pure ; le compteur d'import
  « N événements importés » du statut reflète honnêtement le nombre réel de jours).

## Reste ouvert (noté, non traité ce tour)

Limites d'import ICS connues et **assumées** (hors périmètre de ce correctif borné) : `TZID` ignoré
(heure flottante traitée en local) et pas d'expansion des all-day multi-jours **récurrents**. Si Adrien
veut une fidélité ICS complète, ce serait une proposition dédiée — pas une itération de code aveugle.

_Domaine : agenda._

**Lot 2.0.263→287 en attente de release (Adrien contrôle).**
