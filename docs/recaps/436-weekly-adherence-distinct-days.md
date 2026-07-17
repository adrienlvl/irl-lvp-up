# 436 — Adhérence hebdo : compter des JOURS distincts, pas des saisies (2.0.69)

## Le manque (bug prouvé — §4.4 correctness / §4.2 robustesse, domaines Nutrition + Hydratation + Sommeil)

Variété (§4) après la série dates/a11y/Force (#431→#435) : un vrai bug d'**agrégation** dans le
panneau « Adhérence de la semaine » du plan coach, domaine Nutrition/Hydratation peu touché.

`weeklyAdherence` (`logic.js:5327`) construit les lignes « Protéines à la cible (X j) » et
« Hydratation (X j) ». Le comptage se faisait par `.length` sur les **entrées** filtrées, pas sur
les **jours distincts** :

```js
const nut = arr('nutrition').filter(n => n && inWeek(n.date));
const protDays = protTgt > 0 ? nut.filter(n => (Number(n.protein) || 0) >= protTgt).length : 0;
const waterDays = nut.filter(n => (Number(n.water) || 0) >= waterGoal).length;
const rec = arr('recovery').filter(r => r && inWeek(r.date) && Number(r.sleep) > 0);
const sleepAvg = rec.length ? rec.reduce((a, r) => a + Number(r.sleep), 0) / rec.length : 0;
```

Or le **libellé dit « j »** (jours) et le **seuil est `minProteinDays`/`minWaterDays`** (des jours) :
l'intention est indiscutablement « jours distincts ». Deux saisies de **même date** (ex. le 08
enregistré deux fois) comptaient donc **double** — « Hydratation (3 j) » pouvait s'afficher pour
**2 jours réels**, et l'objectif (`≥ minWaterDays`) se validait **à tort**. Idem sommeil : `sleepAvg`
moyennait les **entrées** recovery, pas les nuits distinctes.

Preuve (figée en test) — 3 saisies nutrition sur 2 jours distincts, `minProteinDays`=3 :
```
weeklyAdherence({ nutrition:[07:150, 08:150, 08:150 (doublon)], ... }, ..., { proteinTargetG:140, minProteinDays:3 })
  AVANT → protDays=3, label « (3 j) », done:true   ← objectif validé pour 2 vrais jours
  APRÈS → protDays=2, label « (2 j) », done:false
```

**Pourquoi c'est réel** : des dates dupliquées sont produites par import/restauration/legacy (aucune
déduplication à l'import) et par le chemin `bumpWater`/`bumpProtein` d'`app.js` (`state.nutrition.at(-1)`
+ push d'une nouvelle entrée du jour). Même classe que #428 (poids non triés), #429/#431 (double saisie).

**Fonction sœur incohérente (signal fort)** : la MÊME métrique « jours ≥ cible cette semaine » est
déjà calculée par `daysHittingTarget` (`logic.js:6195`) / `proteinDaysOnTarget` (`:6207`), qui
**dédupliquent par date** (`byDate[n.date] = Math.max(...)`) — c'est ce que le panneau Nutrition
affiche (`app.js:442`, « 💧 X/7 j »). Pour le sommeil, `weeklySleepStats` (`:6335`) et `sleepDebtHours`
(`:6316`) dédupliquent explicitement par date (une valeur/date, garde `v > 0`). `weeklyAdherence`
était le **seul asymétrique** : avec une date en double, le panneau coach et le panneau Nutrition
affichaient deux nombres « j » **contradictoires**.

`grep` : le test existant (`logic.test.js:5773`) n'utilisait que des dates distinctes — le chemin
dupliqué n'était **jamais** exercé.

## Le geste (déléguer aux sœurs déjà testées — zéro choix de design)

Le correctif ne réinvente **aucune** classification : il réutilise les sœurs existantes.

```js
const protDays = proteinDaysOnTarget(arr('nutrition'), protTgt, mondayKey, todayKey);
const waterDays = daysHittingTarget(arr('nutrition'), 'water', waterGoal, mondayKey, todayKey);
const sleepByDate = {};
arr('recovery').forEach(r => {
  if (!r || !inWeek(r.date)) return;
  const v = Number(r.sleep) || 0;
  if (v > 0) sleepByDate[r.date] = v; // une valeur par date (dernier check-in), comme weeklySleepStats
});
const sleepVals = Object.values(sleepByDate);
const sleepAvg = sleepVals.length ? sleepVals.reduce((a, v) => a + v, 0) / sleepVals.length : 0;
```

`proteinDaysOnTarget`/`daysHittingTarget` filtrent déjà sur la même fenêtre `[mondayKey..todayKey]`
et renvoient 0 si la cible ≤ 0 (couvre `protTgt`=0, ex-`protTgt > 0 ? … : 0`). Le sommeil suit la
convention `weeklySleepStats` (dernier check-in/date, garde `v > 0`). **Rétro-compatible** : sans date
en double, comportement identique. Les déclarations sœurs sont hoistées (mêmes portées de module).

## Tests & vérif

- Nouveau bloc pur `weeklyAdherence` (`logic.test.js`) : 3 saisies nutrition + 3 recovery sur **2 jours
  distincts** (le 08 en double) → protéines/eau « (2 j) », `done:false` (< 3 requis), sommeil moyenné
  sur jours distincts (moy. 7, pas 7,3). Le bloc nominal préexistant est inchangé (non-régression).
- Check smoke **`coachAdherence`** étendu (cas date en double → « (1 j) ») **et promu bloquant**
  (nouvelle ligne `errors.push`) — il n'était calculé que sans être enforced.
- `cd src && xvfb-run -a npm run verify` → **442 tests + smoke 100 % verts** (`coachAdherence:true`,
  `whatsNew` en 2.0.69, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.68 → 2.0.69** : effet utilisateur réel (objectifs d'adhérence justes, cohérence avec le
  panneau Nutrition) → entrée CHANGELOG (📊) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke
  `whatsNew`).
- Une fonction pure retouchée (délégation aux sœurs + dédup sommeil), un bloc de test ajouté (442),
  un check smoke promu bloquant. Aucune feature retirée, aucune Release, zéro dépendance, aucune
  donnée perso, posture sécurité inchangée. Le module Alternance (sacré) n'est pas touché.

## Variété (§4)

Rompt la série dates/a11y/Force pour une **correctness d'agrégation** dans le domaine
Nutrition/Hydratation/Sommeil. Le correctif s'appuie sur des sœurs **déjà écrites et testées**
(`daysHittingTarget`, `weeklySleepStats`) : pas de classification à inventer, seulement une
incohérence entrées-vs-jours à supprimer. Boucle #436.
