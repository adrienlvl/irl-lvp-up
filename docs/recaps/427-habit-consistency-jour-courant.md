# 427 — Habitudes : la régularité ne pénalise plus le jour courant pas encore fait (2.0.60)

## Le manque (bug prouvé — §4.4 cohérence/correctness, domaine frais habitudes)

Le panneau Habitudes affiche **côte à côte** la série (`🔥`, `habitStreak`, `logic.js:559`) et un badge
de régularité 30 j (`📊 %`, `habitConsistency`, `logic.js:603`, rendu `app.js:188`, badge dès
`scheduled >= 4`). `habitStreak` **tolère explicitement le jour en cours** : « aujourd'hui pas encore
fait, on n'entame pas » (`logic.js:567`, on part de la veille). `habitConsistency`, lui, n'avait **aucune**
tolérance équivalente : il comptait le jour courant prévu-mais-pas-encore-fait comme une occurrence
**ratée** tant que la journée n'était pas finie.

Preuve (exécutée sur le vrai code, habitude quotidienne, 4 jours parfaits 13→16 juillet, `today = 07-17`
prévu non fait) :

```
habitConsistency  ->  { done:4, scheduled:5, rate:80 }   // 📊 80 %
habitStreak       ->  4                                    // 🔥 4
```

En pleine journée, une habitude **jeune et parfaite** affichait donc `🔥 4` **et** `📊 80 %` à quelques
pixels l'un de l'autre — deux chiffres qui se contredisent, uniquement parce que la case du jour n'est pas
encore cochée. Effet **disproportionné pour une habitude jeune** : la fenêtre est bornée à la 1re date
loggée (`logic.js:621`), donc 4 jours parfaits + aujourd'hui = 4/5 = 80 % au lieu de 100 %. Pire encore,
ce 80 % était **identique** à celui d'une habitude qui a un **vrai trou** dans le passé.

`grep` : aucun test n'exerçait le cas « jour courant prévu non fait » — dans les 6 cas existants, le jour
courant était toujours **fait** (présent dans le log). Bug jamais vu. Piste repérée via un audit ciblé
(agent) des fonctions habitudes/streak.

## Le geste (même tolérance que `habitStreak`, une seule fonction)

Correction **chirurgicale** dans la seule boucle de `habitConsistency`. Le jour courant (`i === 0`) prévu
mais pas encore fait n'est compté **ni comme prévu ni comme raté** :

```js
if (wds.has(d.getDay()) && !(i === 0 && !done.has(k))) { scheduled++; if (done.has(k)) hit++; }
```

- jour courant **fait** → compté normalement (100 % reste 100 %, denominateur inclut aujourd'hui) ;
- jour courant **prévu non fait** → ignoré (la journée n'est pas finie) ;
- **tout jour révolu raté** → compté comme avant (un vrai trou reste un trou) ;
- jour courant **hors planning** → inchangé (déjà non compté).

Cas vérifiés sur le vrai code (`node -e`) puis figés : `4 faits + today non fait → 4/4=100` (le bug,
aligné sur 🔥 4) · `today fait → 5/5=100` · `trou passé (14) + today non fait → 3/4=75` (le vrai trou
compte, today non) · `today hors-plan → inchangé` · `hebdo vendredi, today non fait → 1/1=100`.

## Tests & vérif

- Bloc pur `habitConsistency` étendu (`test/logic.test.js`) : jour courant prévu non fait → 100 %
  (+ assertion `habitStreak === 4` pour verrouiller la **cohérence** des deux chiffres affichés), jour
  courant fait → 5/5, vrai trou passé + today non fait → 75 % (pas 100 %), hebdo vendredi → 100 %.
- **Check smoke `habitConsistency` étendu** (`renderer-smoke.cjs`) : dans le vrai renderer Electron,
  `today.rate === 100 && today.scheduled === 4` (jour courant toléré) et `hole.rate === 75` (vrai trou
  toujours compté). Ligne `errors.push` existante conservée.
- `cd src && xvfb-run -a npm run verify` → **437 tests + smoke 100 % verts** (`habitConsistency:true`,
  `whatsNew` en 2.0.60, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.59 → 2.0.60** : effet utilisateur réel (le badge 📊 % ne se contredit plus avec la série 🔥)
  → entrée CHANGELOG (📊) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
- Une seule fonction pure modifiée ; `habitStreak`, `habitBestStreak`, `habitWeekMap` inchangés. Les 6 cas
  de test existants restent verts (aucun n'avait le jour courant non fait). Aucune Release, zéro dépendance,
  aucune donnée perso, aucune fonctionnalité retirée.

## Variété (§4)

Rupture avec la série récente (nutrition/poids #426, force/1RM #425, Agenda ICS #424, anniversaires #423,
énergie #422) : **cohérence/correctness (§4.4)** dans le domaine **habitudes**, jamais travaillé dans les
dernières boucles. Boucle #427.
