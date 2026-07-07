# Boucle #50 — Valider les récurrents + habitudes à jours choisis (fin de la roadmap d'audit)

**Date :** 2026-07-08
**Version :** 1.5.9 → 1.6.0

## Contexte
Boucle automatisée sur la roadmap de l'audit (`docs/AUDIT-COMPLET-2026-07-08.md`). Cette itération couvre **F3 + F4 + F5** → la roadmap d'audit est **terminée**.

## F3 — Valider une occurrence récurrente
- `normalizeRecurring` : nouveau champ **`doneLog`** (dates `YYYY-MM-DD` validées, filtrées).
- `todayItems` : `completed` d'une occurrence = `doneLog.includes(date)` → cohérent partout (Jour/Semaine/Ma journée/impression).
- **Bouton Valider** sur les items ↻ dans « Ma journée » et la vue Jour (`completeRecurringOn(recId, date)`) : la vue Jour valide **le jour affiché** (pas seulement aujourd'hui). Révisions récurrentes → **+15 XP** ; ✓ ensuite.
- **Rappel du soir** (main) : compte désormais les occurrences récurrentes **non validées** (débloqué maintenant qu'elles sont validables).

## F4 — Habitudes : choix des jours
- Formulaire : **7 cases jours** (toutes cochées par défaut ; toutes cochées ⇒ stocké `[]` = tous les jours).
- Liste : les habitudes **non prévues aujourd'hui** restent visibles (grisées, « pas aujourd'hui · mar, jeu »), supprimables — plus d'habitude fantôme ingérable.

## F5 — Habitudes dans le rappel du soir
- `checkEveningReminder` (main) utilise `L.habitsForDay` : « Encore 2 blocs, 1 quête, 1 habitude aujourd'hui… ».

## Vérifications
- `node -c` main OK ; `node --test` → **96/96** ✅ (todayItems validable par date, doneLog filtré).
- Smoke → `SMOKE OK` (checks `recDone:true`, habitDays=7).
- Flux réel (Electron) : Valider sur une révision quotidienne → **+15 XP**, doneLog du jour, ✓ ; habitude « Étirements » sur un seul autre jour → grisée « pas aujourd'hui », sans case. Simulation Node du rappel du soir : `{remaining:1, habits:1}`. ✅

## Bilan de la boucle automatisée
- Boucle A (#49, 1.5.9) : F1 notifications récurrents + F2 export RRULE.
- Boucle B+C (#50, 1.6.0) : F3 validation + F4 jours d'habitudes + F5 rappel du soir.
→ **Backlog d'audit épuisé.** Prochaine grosse étape logique : publier (release GitHub) le lot 1.5.2 → 1.6.0.
