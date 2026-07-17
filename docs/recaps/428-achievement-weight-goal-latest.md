# 428 — Trophées : le badge « Cible atteinte » se fie au poids le plus récent (2.0.61)

## Le manque (bug prouvé — §4.4 cohérence/correctness, domaine frais achievements/RPG)

`computeAchievements(state)` (`src/lib/logic.js:5559`) débloque le badge `weight-goal` (« 🎖️ Cible
atteinte ») quand le poids « actuel » touche la cible. Le poids actuel était lu comme le **dernier
élément du tableau** — `weights[weights.length - 1]` (`logic.js:5572`) — ce qui suppose `state.weights`
trié chronologiquement.

Or **le reste de l'app sait que ce n'est pas garanti et trie défensivement** : la fonction sœur
`weightGoalProgress` (`logic.js:5394`) fait `.sort((a,b) => String(a.date).localeCompare(String(b.date)))`,
et `app.js` (rendu du coach) trie une copie de `state.weights` avant de prendre `.at(-1)`.
`computeAchievements` était le **seul** consommateur du poids courant à ne pas trier. Un tableau `weights`
non trié survient à la restauration d'une sauvegarde / import legacy : les données brutes ne repassent
pas toutes par `upsertWeight` (le seul point qui re-trie).

Preuve (exécutée sur le vrai code) :

```
computeAchievements({ weights: [{value:75, date:'2026-07-17'}, {value:80, date:'2026-01-01'}],
                      goals: { targetWeight: 75 } })
  → badge weight-goal : unlocked = false   // BUG : compare 80 (dernier élément) au lieu de 75 (le plus récent)
```

La dernière pesée (75, 17 juillet) touche la cible → le badge devrait être débloqué. Symétriquement,
un tableau où un ancien poids-cible se retrouve en dernière position débloquait le badge **à tort**.

`grep` (`test/logic.test.js:5742`) : le badge n'était testé qu'avec des tableaux à **un seul élément
sans champ `date`** (`weights:[{value:81}]`, `[{value:72}]`). Le cas multi-entrées / non trié qui révèle
le bug n'était **jamais** couvert. Bug repéré via un audit ciblé (agent) des fonctions RPG/achievements.

## Le geste (poids le plus récent par date, une seule fonction, calqué sur `weightGoalProgress`)

Correction **chirurgicale** dans la seule ligne `curW` de `computeAchievements`. Le poids courant est
désormais la pesée la **plus récente par date** :

```js
const latestWeight = weights
  .filter(w => w && Number(w.value) > 0)
  .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
  .pop();
const curW = latestWeight ? Number(latestWeight.value) || 0 : 0;
```

- **rétro-compatible** : repli `String(a.date || '')` → les entrées legacy sans date se trient toutes
  sur `''` (tri **stable** de Node), l'ordre du tableau est préservé → `[{value:72}]` reste 72
  (le test existant passe inchangé) ;
- une pesée **datée** prime sur une legacy sans date (plus « récente ») — cohérent ;
- `filter(value > 0)` évite qu'une entrée à valeur nulle soit prise pour « la plus récente ».

Cas vérifiés sur le vrai code (`node -e`) puis figés : `[75@07-17, 80@01-01] cible 75 → true` (le bug) ·
`[80@07-17, 75@01-01] cible 75 → false` (symétrique) · `[{value:72}] sans date, cible 72 → true`
(compatibilité) · `[75@01-01, 80@07-17] cible 75 → false` (trié, récent loin de la cible).

## Tests & vérif

- Bloc pur `computeAchievements` étendu (`test/logic.test.js`) : tableau non trié récent=cible → débloqué,
  symétrique ancien=cible en dernière position → verrouillé, legacy sans date → compatibilité conservée.
- **Check smoke `achievements` étendu** (`renderer-smoke.cjs`) : dans le vrai renderer Electron, le badge
  `weight-goal` est débloqué pour `[75@07-17, 80@01-01]` cible 75 et verrouillé pour le tableau symétrique.
  Ligne `errors.push` associée conservée.
- `cd src && xvfb-run -a npm run verify` → **437 tests + smoke 100 % verts** (`achievements:true`,
  `whatsNew` en 2.0.61, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.60 → 2.0.61** : effet utilisateur réel (badge débloqué au bon moment) → entrée CHANGELOG
  (🎖️) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
- Une seule fonction pure modifiée, une seule ligne de logique. Aucun autre badge touché. Les cas de test
  existants restent verts. Aucune Release, zéro dépendance, aucune donnée perso, aucune fonctionnalité retirée.

## Variété (§4)

Rupture avec la série récente (habitudes #427, nutrition/poids #426, force/1RM #425, Agenda #424,
anniversaires #423) : **cohérence/correctness (§4.4)** dans le domaine **achievements / RPG**, jamais
travaillé dans les dernières boucles. Boucle #428.
