# #355 — Série du check-in matinal (1.9.289) · clôture rotation 36

## Le manque

Le check-in du matin (énergie, intention, premier pas) est le **rituel d'entrée** de l'app — celui
qui lance la journée. Les habitudes, quêtes et routines bien-être ont toutes un indicateur de série
(🔥 N jours d'affilée), mais **pas le rituel du matin** : il n'y avait aucun encouragement à la
régularité pour la keystone habit de l'app.

## Ce qui change

- Pure `morningStreak(rituals, todayKey)` (miroir de `wellnessStreak`) : jours consécutifs avec un
  check-in matinal, finissant aujourd'hui **ou hier** (tolérance d'un jour manqué avant de casser la
  série). Dédoublonnage par date. 0 si vide/invalide.
- Rendu dans le panneau « Rituel du matin » : badge « 🔥 N jours de check-in d'affilée » (orange),
  affiché dès 2 jours de suite.

## Vérification navigateur (rendu réel)

| Cas | Résultat |
|---|---|
| 4 check-ins consécutifs (finissant aujourd'hui) | ✅ badge « 🔥 4 jours de check-in d'affilée » |
| 1 seul jour (série < 2) | ✅ badge masqué |

## Tests

370 tests `node:test` (3 d'affilée, tolérance hier, coupure à J+2, un seul jour → 1, dédoublonnage,
vide/date invalide → 0) + smoke `morningStreak` **bloquant**.

## Rotation

#355 — **clôture la rotation 36** (builds 1.9.286 → 1.9.289). Tag `v1.9.289` publié. Type : feature/
engagement. Domaine : rituel du matin.
