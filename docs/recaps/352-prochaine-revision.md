# #352 — « Prochaine révision » sur l'accueil (1.9.286)

## Le manque

L'accueil surface « ⏭️ Prochaine séance » (sport) via `upcomingSessions`, mais **aucun équivalent
pour les révisions**. Adrien est en BTS CG : sa prochaine révision planifiée mérite la même
visibilité que sa prochaine séance de sport.

## Ce qui change

- Pure `nextStudySession(agenda, todayKey, nowMinutes)` (miroir de `nextTrainingSession`) : la
  prochaine révision **non faite** (item d'agenda `kind==='study'`), aujourd'hui pas encore passée
  ou plus tard, triée par date puis heure. Renvoie `{ id, title, date, time, daysLeft }` ou `null`.
- Rendu dans « Ma journée » : « 📚 Prochaine révision : <matière> — dans N j (date · heure) », avec
  un accent violet. **Cliquable** : ouvre l'agenda positionné sur le jour de la révision. Masqué s'il
  n'y a rien de prévu.

## Vérification navigateur (flux réel)

Deux révisions (Droit J+2, Compta J+5) :

| Élément | Résultat |
|---|---|
| Ligne | ✅ « 📚 Prochaine révision : Droit BTS — dans 2 j (18/07/2026 · 18:00) » (la plus proche) |
| Clic | ✅ ouvre l'agenda (weekPage) au bon jour |
| Aucune révision | ✅ masqué |

## Tests

369 tests `node:test` (tri date/heure, révision faite ignorée, non-study ignoré, heure passée
aujourd'hui ignorée, rien → null, entrée non-tableau → null) + smoke `nextStudy` **bloquant**.

## Rotation

#352 — début rotation 36 (build 1.9.286). Type : feature. Domaine : révisions/études (besoin réel
d'Adrien, BTS CG). Prochain #353.
