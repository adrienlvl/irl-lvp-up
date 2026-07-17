# 422 — Couverture : `morningEnergyTrend`, tendance « à la hausse » et bornes verrouillées (tests seuls)

## Le manque (§4.1 — couverture réelle, domaine frais)

`morningEnergyTrend(rituals, todayKey, windowDays)` (`src/lib/logic.js:6182`) compare la moyenne
d'énergie du matin (`rituals[].energy`, 1-5) sur la fenêtre récente de `w` jours (défaut 7, borné
2..60) à la fenêtre précédente de même longueur. Elle renvoie `{ avg, prevAvg, delta, dir, level,
days, count }` : `dir` = `'up'` si `delta >= 0.3`, `'down'` si `<= -0.3`, sinon `'flat'` ; `level`
= `'high'` (avg ≥ 4), `'ok'` (avg ≥ 3), `'low'` (< 3).

Son test (`test/logic.test.js:5811`) n'exerçait que **deux combinaisons** : `dir:'down'` + `level:'low'`
et — via le cas sans fenêtre précédente — `dir:'flat'` + `level:'high'`. Manquaient totalement :

- **`dir:'up'`** — l'énergie qui **remonte**, précisément le signal positif que l'app veut afficher ;
- **`level:'ok'`** — la moyenne dans `[3, 4[`, le cas le plus fréquent ;
- les **bornes exactes** de `dir` (delta pile ±0,3 vs 0,2) et de `level` (avg pile 3 vs 4), jamais
  verrouillées → une régression d'un seuil en `>` (off-by-one) serait passée inaperçue ;
- le **clamp de `windowDays`** (min 2 / max 60), jamais testé.

## Le geste (tests seuls, aucun code modifié)

Chaque comportement a d'abord été **exécuté sur le code réel** (`node -e …`) puis figé en assertions
ajoutées au `test('morningEnergyTrend …')` existant :

- **hausse + niveau ok** : récente (08→14) 4,4,3 → 3,7 ; précédente (01→07) 3,3 → 3 ; delta +0,7
  → `dir:'up'`, `level:'ok'` ;
- **bornes de `dir`** : delta pile **+0,3 → 'up'**, pile **-0,3 → 'down'**, **+0,2 → 'flat'** ;
- **bornes de `level`** : avg pile **3 → 'ok'**, pile **4 → 'high'** ;
- **clamp de fenêtre** : `windowDays = 100 → days 60`, `windowDays = 1 → days 2`.

Aucune ligne de `logic.js` touchée : la fonction était déjà correcte — c'est un **filet de
non-régression** sur ses seuils de tendance/niveau et son plafond de fenêtre. Uniquement des
assertions dans le bloc `test()` existant → le **compte de tests reste inchangé (434)**.

## Portée & sûreté

- Purement additif, tests uniquement → **pas de bump de version, pas d'entrée CHANGELOG** (règle
  VPS-AUTOPILOT §2.6 : changement sans effet utilisateur). Aucune Release, zéro dépendance, aucune
  donnée perso, aucune fonctionnalité retirée.
- Variété (§4) : domaine **humeur / énergie du matin** (jamais travaillé dans les dernières boucles),
  type **couverture (§4.1)**, après un micro-fix d'affichage Pas de vie (#421), la couverture
  Habitudes (#420), le durcissement Hydratation (#419) et le bug Course/Trail (#418). Fonction
  repérée via un audit des fonctions pures peu testées d'un domaine frais.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **434 tests + smoke 100 % verts** (`SMOKE OK`). Pas de bump
(2.0.56 conservé, tests seuls). Boucle #422.
