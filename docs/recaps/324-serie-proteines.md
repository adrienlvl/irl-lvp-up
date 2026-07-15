# #324 — Série « objectif protéines » (1.9.258)

## Le manque

L'app est gamifiée — séries partout : entraînement (`weeklyWorkoutStreak`, `dailyStreak`,
`completeDaysStreak`), bien-être (`wellnessStreak`, `wellnessBestStreak`), habitudes
(`habitStreak`, `habitBestStreak`), quêtes (`questPerfectStreak`). **La nutrition, elle, n'avait
AUCUNE série.** On comptait bien les jours à la cible sur 7 jours (`proteinDaysOnTarget`), mais pas
la suite consécutive — donc pas ce petit moteur de régularité « ne casse pas la chaîne ».

## Fausse piste écartée d'abord

J'ai envisagé une passe **robustesse** sur `normalizeState`, mais vérification faite il est déjà
solide : tous les tableaux sont coercés, tous les objets (profile, goals, guidedSession,
focusTimer, dailyLifeStep, raceGoal…) normalisés explicitement. Pas de vrai trou → je n'ai pas
forcé et j'ai changé de cible.

## Ce qui change

Fonction pure `proteinStreak(nutrition, target, todayKey)` → `{ current, best }` :
- **current** : jours consécutifs (en remontant depuis aujourd'hui) où les protéines ont atteint la
  cible. « Aujourd'hui pas encore atteint » **n'interrompt pas** la série (on n'entame pas le jour
  en cours — même logique que `habitStreak`).
- **best** : plus longue suite consécutive sur tout l'historique.

Affiché sous le bilan hebdo nutrition (`#proteinStreak`), **seulement si `best ≥ 2`** :
- « 🔥 4 jours d'affilée à ta cible protéines » ;
- « · record N j » quand la série actuelle est plus courte que le record ;
- « 💤 Série protéines à relancer · record N j » si la série est retombée à 0.

## Vérification navigateur (cible 145 g)

| Scénario | Résultat |
|---|---|
| 4 jours atteints jusqu'à hier, aujourd'hui pas encore | ✅ « 🔥 4 jours d'affilée » (aujourd'hui ne coupe pas) |
| Longue série passée (5 j) coupée + 1 j récent | ✅ « 🔥 1 jour… · record 5 j » |
| Jamais 2 jours de suite | ✅ masqué |

## Tests

351 tests `node:test` (+ `proteinStreak` : série coupée, aujourd'hui non atteint, record > courant,
cible absente, date invalide) + smoke `proteinStreak` **bloquant**.

## Rotation

#324 — ouvre la rotation 29 (build 1.9.258).
