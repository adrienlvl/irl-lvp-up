# #343 — Indicateur de rythme d'hydratation (1.9.277) · clôture rotation 33

## Le manque

Le suivi d'hydratation comptait les verres du jour (barre + / −) mais ne disait rien du **rythme
dans la journée**. Or le problème typique n'est pas le total, c'est la répartition : on oublie de
boire l'après-midi, puis on descend 4 verres le soir. Rien n'aidait à s'en rendre compte à temps.

## Ce qui change

Nouvelle fonction pure `hydrationPace(count, goal, hour)` :

- Répartit l'objectif sur la fenêtre d'éveil (8 h → 22 h) et calcule combien de verres on
  « devrait » avoir bu à l'heure courante.
- Statut : `done` (objectif atteint), `ontrack` (dans les temps / en avance), `behind` (en retard,
  avec le nombre de verres de retard).
- Renvoie `null` hors fenêtre : pas de pression avant 8 h, et surtout **pas de rappel de boire juste
  avant de dormir** (≥ 22 h).

Rendu sous la barre d'hydratation : un bandeau « ⏰ Un peu en retard (~N verres) — bois un verre
maintenant » (en retard) ou « 👍 Bon rythme » (dans les temps). Masqué si l'objectif est atteint ou
hors fenêtre — aucun encombrement.

## Vérification navigateur (heure stubée, rendu réel)

| Cas | Résultat |
|---|---|
| 15 h, 1 verre | ✅ visible, `hp-behind`, « ⏰ Un peu en retard (~3 verres…) » |
| 15 h, 4 verres | ✅ visible, `hp-ontrack`, « 👍 Bon rythme » |
| 12 h, 8 verres (objectif atteint) | ✅ masqué |
| 7 h (avant la fenêtre) | ✅ masqué |

## Tests

362 tests `node:test` (attendu à mi-journée/début/fin, ontrack/behind/done, hors fenêtre → null,
heure invalide → null) + smoke `hydrationPace` **bloquant**.

## Rotation

#343 — **clôture la rotation 33** (builds 1.9.274 → 1.9.277). Tag `v1.9.277` publié.
