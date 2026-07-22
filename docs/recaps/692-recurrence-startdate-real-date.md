# #692 — Récurrence : une `startDate`/`until` impossible-mais-format-valide ne fabrique plus une série fantôme (build 2.0.292)

**Mission nuit 22/07** : robustesse/correction/tests non-visuels, **PAS de design**. Priorité nommée
**#1 « Robustesse données »** (garde-fous de perte de données / dates impossibles fed à `new Date`).

**Rotation §4 bis** — 5 derniers recaps = `focus (#691), a11y (#690), coach (#689), robustesse (#688),
etudes (#687)`. Interdits (2 derniers) : `focus`, `a11y`. `robustesse` apparaît **1×** (position 4,
#688, hors 2 derniers) → **autorisé**. Domaine retenu : **`robustesse`**.

## Le défaut (prouvé par exécution node)

`normalizeRecurring` (`logic.js:554`) validait `rule.startDate` (ligne 572) et `rule.until` (ligne 573)
avec **`isBoundedDateKey`** (`logic.js:30`) — qui ne contrôle que le **format** (mois 01–12, jour 01–**31**)
et **laisse passer une date calendaire impossible** : `2026-04-31` (avril n'a que 30 j), `2026-02-30`,
`2026-06-31`… Or `recurrenceMatches` (`logic.js:588`) construit ensuite
`new Date(+sm[1], +sm[2]-1, +sm[3])` (ligne 593) : JS **déborde silencieusement** `new Date(2026, 3, 31)`
→ **1er mai**, et ancre **toute la série** sur ce jour faux.

Preuve (module rejoué) :
```
normalizeRecurring({rule:{freq:'monthly', startDate:'2026-04-31'}}).rule.startDate  → '2026-04-31' (gardée !)
recurrenceMatches(rule, '2026-05-01') → true    // « tous les mois le 31 avril » fire le 1er de CHAQUE mois
recurrenceMatches(rule, '2026-06-01') → true
recurrenceMatches(rule, '2026-04-30') → false
normalizeRecurring({rule:{freq:'daily', startDate:'2026-02-30'}}) → gardée, ancrée au 2 mars
```

C'est **exactement l'invariant que le fichier documente déjà** : le commentaire d'`isRealDateKey`
(`logic.js:35-39`) dit qu'une clé bornée-mais-irréelle « déborde silencieusement au mois suivant et
fabrique une paire de jours FANTÔME » — et prescrit `isRealDateKey` **« là où une clé sert ensuite à
`new Date` »**. Les ancres de récurrence sont précisément ce cas, mais utilisaient la garde faible.
Défaut **jumeau** de la famille close en **#671** (`bestWellnessWeek`/`bestTonnageWeek` gardés par
`isRealDateKey`, 2.0.276) — même métier, garde générique laissée ouverte (cf. mémoire
« robustesse-dates-impossibles-siblings-668 » : « chercher les `/^\d{4}-\d{2}-\d{2}$/` non gardés
restants »).

Le test existant (`logic.test.js:1295`) **prétendait** déjà neutraliser les « format-valides mais
IMPOSSIBLES » mais ne testait que `2026-13-99` / `2026-99-99` (hors bornes de format, que
`isBoundedDateKey` attrape) → il ratait le piège **subtil** du jour 31 hors du mois.

## Correctif (§3, zéro champ, pure logique)

`logic.js:572-573` : `isBoundedDateKey` → **`isRealDateKey`** pour `startDate` et `until`. Une date
impossible ⇒ `startDate` vide ⇒ `recurrenceMatches` ne matche **jamais** (plus de série fantôme).
`isRealDateKey` est défini (`logic.js:40`) avant l'usage. Non gâché : une date **réelle** (native
picker, `.ics` déjà filtré par `parseIcsDateTime`) est conservée à l'identique — 29 févr. bissextile
inclus.

**Déclencheur réaliste** : sauvegarde restaurée / `state.recurring` legacy ou abîmé (le picker HTML et
l'import `.ics` émettent des dates réelles). Robustesse sur entrée hostile/corrompue = catégorie #2 de
la mission.

## Tests

+6 assertions dans `normalizeRecurring : défauts…` (`logic.test.js:1300`) : `2026-04-31`/`2026-02-30`
→ `startDate` vide ; `2026-06-31` → `until` vide ; `2024-02-29` bissextile RÉEL conservé ; **preuve
d'absence de série fantôme** (`recurrenceMatches(ghost, '2026-05-01'|'2026-06-01') === false`). Échouent
avant le fix, passent après.

## Bump / §4 ter

Effet utilisateur réel (une récurrence corrompue n'apparaît plus sur des jours jamais choisis) → **bump
2.0.292** + entrée CHANGELOG (relue cumulée : autonome, non contradictoire, cohérente avec la formulation
« semaines-record » de #671). Aucune surface de rendu nouvelle → pas de check smoke (pure logique testée
node). **588 tests + SMOKE OK.**

Domaine : robustesse
</content>
</invoke>
