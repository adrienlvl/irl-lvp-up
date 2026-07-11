# Boucle #131 (autonome) — Rappel desktop d'examen · build 1.9.65

**Contexte :** 56ᵉ itération de la boucle autonome. Aire : Rappels / révisions BTS.

## Livré

Le système de **rappels desktop** notifie désormais l'approche de l'examen BTS aux **paliers J-30, J-14, J-7, J-3, J-1 et le jour même** :

> 🎓 **Rappel examen** — 📚 BTS CG : dans 7 jours. Bloque une révision aujourd'hui.

- Tiré de l'état persistant `examGoal` (défini via le planning de révision).
- Envoyé **une fois par jour**, au premier créneau de rappel du matin (pas de spam).

Un filet de sécurité de plus pour ne pas se faire surprendre par l'échéance.

## Détail technique

- `lib/logic.js` : `examReminderDue(examGoal, todayKey)` pur + testé → message si `daysLeft ∈ {0,1,3,7,14,30}`, sinon `null` (via `examCountdown`).
- `electron-main.cjs` : `checkExamReminder(cfg, time, date)` lit `examGoal` du backup, appelle `L.examReminderDue`, envoie la notif une fois/jour (`lastSent['exam-<date>']`) ; branché dans `checkReminders`.

## Vérifs

- `npm run verify` → **166 tests / 166 pass** (+1 : `examReminderDue` — paliers 7/1/0, non-palier J-5, passé, sans date), **SMOKE OK** (`examReminder:true`). `node --check electron-main.cjs` OK.
