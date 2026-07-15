# #354 — Assainissement des scalaires dans normalizeState (1.9.288)

## Le manque (robustesse / data-integrity)

`normalizeState` (la couche d'assainissement de l'état, appliquée au chargement ET à chaque import)
coerçait bien les **tableaux** et **objets** (birthdays, habits, agenda, profile…) mais **jamais les
scalaires** : `xp`, `streak`, `health`, `focus`, `life`, `timerRuns`, ni `goals.sessions/distance/
targetWeight`, ni `wellnessWeeklyGoal`. Ils étaient simplement recopiés depuis l'input.

Le #346 a montré qu'un import peut charger des données bancales. Une sauvegarde corrompue (ou éditée
à la main) avec `xp: "-50"`, `streak: NaN`, `goals.sessions: 0`, `targetWeight: 999`… produisait des
valeurs absurdes qui pouvaient casser le calcul de niveau, les barres de progression ou les objectifs.

## Ce qui change

Ajout, en fin de `normalizeState`, d'un assainissement scalaire :

- Compteurs (`xp`, `streak`, `health`, `focus`, `life`, `timerRuns`) → **entiers ≥ 0** (NaN/négatif → 0).
- `goals.sessions` → entier borné **[1..14]**, `goals.distance` → **[0..1000]** (0,1 près),
  `goals.targetWeight` → nombre **[30..300]** ou `''`.
- `wellnessWeeklyGoal` → entier borné **[1..14]**.

## Vérification

Assainissement de données (pas de rendu visuel) → vérifié par le **smoke `normalizeHardening`
bloquant** qui exécute `normalizeState` dans l'**Electron réel** :

| Entrée corrompue | Sortie |
|---|---|
| `xp:'-50'`, `streak:'abc'`, `health:-3`, `focus:NaN`, `life:2.7`, `timerRuns:'9'` | `0, 0, 0, 0, 3, 9` |
| `goals:{sessions:'0', distance:-5, targetWeight:'999'}` | `sessions∈[1..14], distance:0, targetWeight:''` |
| `wellnessWeeklyGoal:99` | `14` |
| Valeurs valides (xp 500, sessions 3, distance 10.4, targetWeight 85, goal 5) | **inchangées** |

## Tests

369 tests + smoke `normalizeHardening` **bloquant** (input corrompu → sortie saine ; valeurs valides
préservées).

## Rotation

#354 — rotation 36 (build 1.9.288). Type : robustesse / data-integrity. Prochain #355 clôture la
rotation (tag v1.9.289).
