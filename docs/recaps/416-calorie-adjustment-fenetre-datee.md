# 416 — Ajustement calorique : le plateau est détecté même en pesée quotidienne (2.0.54)

## Le manque (bug pur prouvé — §4.1/§4.2)

`calorieAdjustment` (`src/lib/logic.js:5435`) détecte une stagnation de poids sur ≥ 14 jours et
propose un ajustement calorique (~125 kcal/j : baisser si la perte cale, monter si la prise cale).
Son commentaire promet « stagnation sur ≥ 14 jours (≥ 3 pesées) ».

Mais la fenêtre d'analyse était ancrée par **nombre** de mesures, pas par **date** :

```js
const recent = list.slice(-4), a = recent[0], b = recent[recent.length - 1];
const days = (…b.date − …a.date…) / 864e5;
if (!(days >= 14)) return { stagnating: false, suggestion: null };
```

`slice(-4)` ne garde que les **4 dernières pesées**. Pour qui se pèse **tous les jours** (le cas
d'usage réel — pesée du matin), ces 4 mesures ne couvrent que ~3 jours → `days >= 14` est **toujours
faux** → **la stagnation n'est jamais détectée**, même après des semaines de poids strictement plat.
Le conseil ne se déclenchait qu'avec un historique clairsemé (≥ ~14 j entre les 4 dernières mesures),
exactement la configuration des tests existants — qui masquaient donc le défaut.

Cas concret prouvé (exécuté sur le code réel avant correctif) :

```js
// 30 pesées quotidiennes, toutes à 80.0 kg, du 2026-06-13 au 2026-07-12
calorieAdjustment(daily, 'perte', 2000)
// avant → { stagnating: false, suggestion: null }   (plateau d'un mois ignoré !)
// attendu → { stagnating: true, suggestion: 'reduce', newTarget: 1875, ratePerWeek: 0 }
```

## Le correctif (fenêtre ancrée par DATE)

On mesure la stagnation sur les **~14 derniers jours** quelle que soit la fréquence : on prend comme
borne basse `a` la pesée la **plus récente distante d'au moins 14 j** de la dernière (`b`). Si aucune
pesée n'est assez ancienne (recul < 14 j) → pas de stagnation, comme avant.

```js
const b = list[list.length - 1];
const daysTo = w => (Date.parse(b.date + 'T12:00:00') - Date.parse(w.date + 'T12:00:00')) / 864e5;
let a = null;
for (let i = list.length - 2; i >= 0; i--) { if (daysTo(list[i]) >= 14) { a = list[i]; break; } }
if (!a) return { stagnating: false, suggestion: null };
const days = daysTo(a);
```

La fenêtre reste **récente** (on choisit le point le plus récent au-delà de 14 j, pas le plus ancien
de l'historique) : un plateau des 3 dernières semaines n'est pas dilué par une longue perte antérieure.

## Portée & sûreté

- Logique pure, aucun rendu modifié. `app.js` consomme les mêmes champs.
- **Conservateur sur les cas existants** : pour un historique clairsemé, l'ancre par date retombe sur
  la même pesée que `slice(-4)`. Les 5 assertions du test existant sont inchangées et restent vertes
  (`flat` → `a`=2026-06-21, `days`=21, `reduce`, `newTarget`=1875 ; `losing`, `short` < 14 j,
  `gainFlat` → `increase`, `maintien` → rien).
- +1 cas ajouté (assertions dans le `test()` existant, le compte de tests reste donc à 434) :
  30 pesées **quotidiennes** en plateau (le scénario qui échouait) → `stagnating:true`, `reduce`,
  `newTarget:1875`, `ratePerWeek:0`.

## Variété (§4)

Rupture nette avec les dernières boucles (couverture géo/déplacements #415, parseur de dates #414,
Sommeil #413, a11y #412) : bug de **fenêtre glissante mal bornée** dans le **module Nutrition/Poids**
(coach calorique) — trouvé via un audit des fonctions pures peu testées.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **434 tests + smoke 100 % verts** (`whatsNew` en 2.0.54,
`SMOKE OK`). Bump **2.0.53 → 2.0.54** : effet utilisateur réel (le conseil de plateau se déclenche
enfin pour une pesée fréquente) → entrée CHANGELOG (⚖️) + 2 assertions `CHANGELOG[0].v`
(logic.test.js + smoke `whatsNew`). Aucune Release, zéro dépendance, aucune donnée perso, aucune
feature retirée. Boucle #416.

## Note de session (concurrence VPS)

Une session concurrente a committé et poussé **#415** (couverture `haversineKm`/`travelModes`, tests
seuls) pendant cette itération. Mes diffs (logique + version + tests calorieAdjustment) sont restés
isolés des siens dans le working tree partagé ; j'ai renuméroté mon travail en **#416** et rebasé
proprement avant de pousser. Cf. `[[autopilot-concurrent-sessions]]`.
