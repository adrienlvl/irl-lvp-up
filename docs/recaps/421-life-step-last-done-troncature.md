# 421 — Pas de vie : le « Dernier tenu » d'un pas passé enfin tronqué comme celui du jour (2.0.56)

## Le manque (incohérence prouvée — §4.2/§4.1, domaine frais)

`lifeStepStats(log, todayKey, todayStep)` (`src/lib/logic.js:1293`) résume le suivi du « pas de
vie » quotidien (série, jours tenus, taux) et renvoie `lastDone` — le dernier pas tenu, affiché dans
l'UI en « Dernier tenu : « … » · il y a N j » (`app.js:454`, texte `escapeHtml`é). Le texte de ce
rappel était **normalisé de deux façons différentes** selon la provenance du pas :

```js
const lastDone = (todayCounts && t.done)
  ? { date: todayKey, text: todayText.slice(0, 140), daysAgo: 0 }               // jour → trim + 140
  : (lastPast ? { date: lastPast.date, text: lastPast.text, daysAgo: … } : null); // passé → BRUT
```

- pas **du jour** tenu : texte déjà nettoyé (`trim()`) **et tronqué à 140 caractères** ;
- pas **passé** tenu : `lastPast.text` renvoyé **brut**, sans trim ni troncature.

Conséquence user-facing : un pas tenu un jour précédent avec un texte à rallonge s'affichait **en
entier** dans la petite ligne « Dernier tenu », pouvant la faire déborder — alors que le même texte
saisi aujourd'hui aurait été coupé à 140. Domaine journal/RPG (« pas de vie »), jamais travaillé
dans les dernières boucles.

## Le geste (aligner le passé sur le jour)

Le texte du pas passé passe par la **même** normalisation que celui du jour — `trim()` puis
troncature à 140 :

```js
: (lastPast ? { date: lastPast.date, text: String(lastPast.text || '').trim().slice(0, 140), daysAgo: … } : null);
```

Conservateur : pour un texte court (le cas courant), le résultat est **identique** (`slice(0, 140)`
ne coupe rien, `trim()` n'ôte que d'éventuels espaces de tête/queue) — seul un texte >140 change, et
il devient cohérent avec le pas du jour.

## Tests

+2 assertions dans le `test('lifeStepStats …')` existant (`test/logic.test.js:2059`), **compte
inchangé à 434** : un pas passé au texte de 200 « z » entouré d'espaces →
`lastDone.text.length === 140` et `=== 'z'.repeat(140)` (trim appliqué **avant** la troncature). Les
5 assertions historiques (textes courts) restent vertes.

## Portée & sûreté

- Logique pure, aucun rendu modifié (`app.js` consomme le même champ `lastDone.text`).
- Aucune Release, zéro dépendance, aucune donnée perso, aucune fonctionnalité retirée.

## Variété (§4)

Rupture avec les dernières boucles : micro-fix d'**affichage** dans le module **Pas de vie**
(journal/RPG), après la couverture Habitudes (#420), le durcissement Hydratation (#419), le bug
Course/Trail (#418), la couverture Agenda (#417). Fonction repérée via un audit des fonctions pures
peu testées d'un domaine frais.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **434 tests + smoke 100 % verts** (`whatsNew` en 2.0.56,
`SMOKE OK`). Bump **2.0.55 → 2.0.56** : effet utilisateur réel (un pas passé long ne déborde plus la
ligne) → entrée CHANGELOG (🌱) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
Boucle #421.
