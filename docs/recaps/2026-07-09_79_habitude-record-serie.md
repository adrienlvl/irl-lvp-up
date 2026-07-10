# Boucle #79 (autonome) — Record de série d'habitude · build 1.9.13

**Contexte :** 4ᵉ itération de la boucle autonome. Changement d'aire (Habitudes).

## Livré

À côté de la **série en cours** (🔥) d'une habitude, un badge **🏆 record** affiche la **plus longue série jamais atteinte** — un objectif à battre. Affiché uniquement quand le record **dépasse** la série actuelle (sinon le 🔥 suffit).

## Détail technique

- `lib/logic.js` : `habitBestStreak(habit, todayKey)` (pur + testé) — parcourt l'historique du 1er jour validé jusqu'à aujourd'hui, compte la plus longue suite d'**occurrences prévues consécutives réalisées** (les jours non programmés ne cassent pas ; un jour programmé manqué remet à zéro). Ajouté à `habitsForDay` (`best`).
- `app.js` : `renderHabits` affiche `🏆 {best}` quand `best > streak`.
- `extras.css` : `.habit-record`.

## Vérifs

- `npm run verify` → **126 tests / 126 pass** (+1 : `habitBestStreak` — record 3 malgré un trou ; sans log → 0 ; lun/mer/ven enchaînés = 3), **SMOKE OK**.
