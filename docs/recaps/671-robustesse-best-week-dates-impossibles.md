# #671 — Robustesse : les records « meilleure semaine » ne plantent plus sur une date impossible (2.0.276)

**Date** : 2026-07-22 · **Build** : 2.0.276 · Domaine : `robustesse`

## Rotation (§4 bis.3) — contrôle avant de coder

5 derniers recaps (`ls -t | head -5`) : #670 `docs`, #669 `coach`, #668 `robustesse`, #667 `athlete`,
#666 `coach`. → Bloqués (2 derniers) : `docs`, `coach`. `robustesse` **redevenu libre** (#668 hors des 2
derniers, 1× sur 5). La piste de nuit « coaching à fond » (DEMANDES.md) tombe sous la rotation, qui
s'applique **pleinement** au coach (VPS-AUTOPILOT §3) → domaine `coach` bloqué ce tour. Mission de nuit =
non-visuel : ce correctif est de la robustesse pure, conforme.

Quota de propositions §4 bis.4 : satisfait (#663 dans les 10 derniers).

## Le manque (piste PROUVÉE réservée par #670, suivi direct de #668)

Même classe de bug que `weeklyAggregate` (#668) : un garde de format `/^\d{4}-\d{2}-\d{2}$/` **accepte les
dates impossibles** (`2026-13-40` : format-valide mais mois 13) → `new Date(...'T12:00:00')` = Invalid Date
→ `dateKey(mondayOf(...)).toISOString()` jette une `RangeError` **non gardée** qui casse le rendu de la carte.
Deux sites frères, atteignables via une date de record corrompue (backup/import/legacy — ces listes ne sont
pas normalisées par enregistrement) :

- **`bestWellnessWeek`** (`logic.js:4125`) — rendue par `renderWellnessStreak` (`app.js:689`).
  Crash reproduit : `bestWellnessWeek([{date:"2026-13-40"}],"2026-01-05")` → `Invalid time value`.
- **`bestTonnageWeek`** (`logic.js:4571`) — même patron sur `w.date` (atteint dès qu'une séance à
  tonnage > 0 porte une date impossible). Crash reproduit `node -e`.

## Le correctif (§4.1/§4.2 — bug pur borné, zéro champ, non visuel)

Remplacé le garde faible `/^\d{4}-\d{2}-\d{2}$/` par **`isRealDateKey`** (déjà exporté + testé
`logic.js:40`, rejette les impossibles via aller-retour `new Date`) :

- `logic.js:4128` (record bien-être, boucle `list`) et `logic.js:4574` (record tonnage, boucle `workouts`)
  — les deux sites de crash.
- Par cohérence défensive, les gardes `todayKey` frères : `bestWellnessWeek` (curWeek), `bestTonnageWeek`
  (curWeek), et `shareableWellness` (`valid`) — même patron, `todayKey` normalement issu de `localDate()`
  donc exposition faible, mais isRealDateKey est strictement plus sûr sans régression sur les vraies dates.

**Aucune régression sur dates réelles** : `isRealDateKey` accepte toutes les dates valides ; seules les
impossibles changent de sort (ignorées, comme une donnée hors période) — comportement identique à #668.

## Tests

- `bestTonnageWeek` : +2 assertions (séance à date impossible ignorée → `null` ; `todayKey` impossible →
  pas de crash, `isCurrent:false`), échoue-avant / passe-après.
- `bestWellnessWeek` : +2 assertions symétriques (routine à date impossible ignorée ; `todayKey` impossible).
- Verify : **580 tests + SMOKE OK** (`bestWellnessWeek`, `bestTonnageWeek` toujours verts).

## Version

Bump **2.0.276** (le rendu ne plante plus = effet utilisateur, comme #668) + entrée CHANGELOG + les 2
assertions `CHANGELOG[0].v`. La piste #670 est désormais **close** (les deux sœurs corrigées) — mémoire à
mettre à jour.

Domaine : robustesse
