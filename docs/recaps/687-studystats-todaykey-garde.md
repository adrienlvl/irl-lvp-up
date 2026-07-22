# #687 — `studyStats` : `todayKey` validé (garde alignée sur sa sœur `studyBySubject`)

**Boucle #687 (2026-07-22).** Pas de bump (aucun effet utilisateur — voir §Effet). Domaine : `etudes`.

## Contexte / choix de la tâche
Mission de nuit (ROADMAP « 🌙 DÉMARRAGE VPS » du 22/07, qui PRIME sur la demande coaching datée du
18/07) : **robustesse / correction / tests, PAS de visuel, PAS de coaching monomanie**. Priorité
nommée **#2 « Couverture de tests »** (fonctions pures sous-testées, branches limites : entrées vides,
dates invalides).

Rotation §4 bis (5 derniers recaps : `agenda`(686), `robustesse`(685), `coach`(684), `etudes`(683),
`robustesse`(682)) → **`agenda` + `robustesse` interdits** (2 derniers ; `robustesse` aussi 2×/5).
**`etudes` libre** (1× en #683, hors 2 derniers). Quota §4 bis.4 : les 10 derniers recaps (686→677)
ne citent aucune proposition — mais l'objet littéral du quota (« une proposition prise dans ROADMAP
P1 ») est **épuisé** (les 6 propositions P1 sont écrites + tranchées), et la mission datée de la nuit
(PRIME) **interdit** d'implémenter les propositions en attente et **dirige** vers du code non-visuel
prouvé par test node. J'ai donc livré une correction de robustesse prouvée (tension documentée, comme
en #686).

## Piste vérifiée (sous-agent Explore + lecture directe)
`studyStats` (`logic.js:1858`) comparait `a.date >= todayKey` **sans jamais valider `todayKey`**,
alors que sa fonction sœur `studyBySubject` (`logic.js:1877`) fait exactement l'inverse :
`const today = isKey(todayKey) ? todayKey : null`. Incohérence défensive réelle et prouvable :

- `studyStats([{kind:'study', date:'2020-01-01', completed:false}], '')` → **`upcoming:1`** avant
  correctif, car en JS `'2020-01-01' >= ''` vaut `true` → une révision de 2020 comptée « à venir ».
- Avec `todayKey === undefined` : `'2020-01-01' >= undefined` → `false`, donc les vraies révisions
  futures tomberaient à `upcoming:0` (autre incohérence).
- `todayKey === '10/07/2026'` (format libre FR) : comparaison de chaînes bancale.

## Effet utilisateur
**Nul en pratique.** Les 2 appelants (`renderExamCountdown`, `app.js:977`) passent toujours
`localDate()` — une clé `YYYY-MM-DD` valide. C'est donc une **incohérence de robustesse interne**
entre deux sœurs, pas un bug visible. → **Pas de bump, pas d'entrée CHANGELOG** (VPS-AUTOPILOT §2.6 :
changement sans effet utilisateur → pas de bump). Renderer intact.

## Correctif (`logic.js`)
Ajout de la même garde que `studyBySubject` : `isKey` valide `todayKey` ; un `todayKey` non-clé →
`today = null` → `upcoming = 0` (comportement cohérent avec `studyBySubject` où `today === null`
n'incrémente ni `upcoming` ni `overdue`). Le format de `a.date` était déjà validé par regex (inchangé).

## Test (`logic.test.js`, bloc `studyStats` étendu)
+3 assertions dans le test existant : `todayKey` vaut `''`, `undefined`, `'10/07/2026'` sur une
révision passée non faite → `upcoming:0` à chaque fois. **Échouent avant le correctif** (le cas `''`
renvoyait `upcoming:1`), **passent après**.

## Vérif
`cd src && xvfb-run -a npm run verify` → **586 tests + SMOKE OK**, 100 % vert.

## Écarté (impact non justifié)
`parseCsv` (`logic.js:275`) perd silencieusement une cellule vide entre guillemets en toute fin
(`parseCsv('""')` → `[]` au lieu de `[['']]`). Bug de correction réel **mais impact nul**
(`parseApplicationsCsv`/`parseAlternanceTargets` filtrent les lignes vides) et la fonction est sur le
chemin d'import **Alternance (sacré)** → risque > gain, non touché.

_Domaine : etudes._
