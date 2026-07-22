# #668 — Robustesse : une date bancale ne fait plus planter les graphes du dashboard

**Boucle #668 (2026-07-22).** Build **2.0.274**. 579 tests + SMOKE OK.

## Contexte & rotation
- **Mission de nuit** (ROADMAP « 🌙 DÉMARRAGE VPS » du 22/07) : travail **non-visuel, vérifiable**,
  domaines variés — priorité n°1 « robustesse données », n°2 « couverture de tests ».
- **Rotation §4 bis.3** (5 derniers recaps : `athlete, coach, tests, athlete, robustesse`) → les
  **2 derniers** = `athlete`+`coach` bloqués ; `athlete` 2× bloqué. `robustesse` est libre côté
  rotation **mais** son seul chantier ouvert (classifieur Alternance, #663) est **gaté sur Adrien**
  (proposition `robustesse-classificateurs-import-alternance.md`, décision 1 non tranchée — module
  **sacré**, peut reclasser des cellules réelles). → Domaine retenu : **`tests`/robustesse pure**
  (1× en #665, hors 2 derniers), sur une fonction **hors** Alternance et hors coach/athlete/nutrition.

## Défaut prouvé (exécuté contre le vrai code)
`weeklyAggregate` (`logic.js:2721`) — helper **générique** qui bucketise n'importe quels
enregistrements datés sur 8 semaines. Il alimente `renderCharts` (`app.js:532`) pour 5 courbes du
dashboard (charge, tonnage, focus, sommeil, révisions) sur `state.workouts`, `state.focusSessions`,
`state.recovery`, `state.agenda`.

Le garde de fenêtre (l.2733) vérifiait `typeof r[dateField] !== 'string'` mais **jamais le format** :
```
if (!r || typeof r[dateField] !== 'string' || r[dateField] < firstKey) return;
```
Toute chaîne non-vide triant lexicographiquement `>= firstKey` mais **pas** une vraie date passait
le garde, puis `new Date(`${…}T12:00:00`)` → **Invalid Date** → `mondayOf` → `dateKey()` appelle
`.toISOString()` → **`RangeError: Invalid time value`**. `renderCharts` étant appelé **sans garde**
dans la séquence de rendu (`app.js:693`), **un seul** enregistrement à date abîmée (import / backup /
donnée héritée) **cassait tout le tableau de bord**.

Reproduit en `node -e` (avant fix) : `2026-13-40`, `2026/07/15`, `20260715`, `2026-02-30`, `bad`
→ **THROWS** ; `2026-07-15` → OK. (« Vert ≠ bon » : cas re-exécuté moi-même, pas relayé.)

## Correctif (minimal, en-intention, réutilise l'existant)
Garde durci avec le validateur **déjà exporté et testé** `isRealDateKey` (l.40) — qui exige une date
calendaire **réelle** (rejette aussi les impossibles bien formées comme `2026-02-30`, qui déborderaient
silencieusement sur le mois suivant et fausseraient un bucket) :
```
if (!r || !isRealDateKey(r[dateField]) || r[dateField] < firstKey) return;
```
`isRealDateKey` inclut déjà le `typeof string` → il subsume l'ancien test. Une date douteuse est
désormais **ignorée** (comme une donnée hors fenêtre), le rendu survit. **Aucune régression** sur des
dates valides (elles passent toutes). Commentaire ajouté expliquant le piège `Invalid Date → toISOString`.

## Vérification
- Test node **échoue-avant / passe-après** (`logic.test.js`, après les 3 tests `weeklyAggregate`
  existants) : 5 dates bancales → `assert.doesNotThrow` + tout à 0 ; + non-régression (vraie date
  voisine d'une date bancale reste agrégée).
- `xvfb-run -a npm run verify` : **579 tests + SMOKE OK** (`charts:true` tient).
- Bump **2.0.274** + CHANGELOG (effet utilisateur réel : plus de crash dashboard) + 2 assertions
  `CHANGELOG[0].v`.

## Suites possibles (non prises — rotation)
Candidats latents relevés mais **non reachable en prod aujourd'hui** (donc laissés) : `dayColumns`
(`logic.js:10525`, pas de garde `!e` mais aucun appelant actif) ; `mealMacro` (`logic.js:2387`, garde
`food` incohérent l.2389 mais tous les appelants gardent déjà + domaine nutrition-adjacent).

Domaine : robustesse
