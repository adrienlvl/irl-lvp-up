# Boucle #121 (autonome) — Coach hebdo : zone négligée · build 1.9.55

**Contexte :** 46ᵉ itération de la boucle autonome. Aire : Athlète / intelligence du coach.

## Livré

La **revue hebdomadaire** ne se contente plus d'afficher les zones travaillées : elle **suggère la zone prioritaire négligée** dans sa « prochaine décision » :

> Prochaine décision : … **Zone à équilibrer : tu n'as pas travaillé les abdos cette semaine — ajoute un exercice ciblé.**

- Ne se déclenche que si tu as fait **au moins un exercice de muscu** cette semaine (sinon pas de reproche à qui n'a fait que courir).
- Priorité : abdos → jambes → bras → dos → pectoraux → épaules (les besoins d'Adrien : abdos/bras/bas du corps équilibrés).

Réutilise `weeklyZoneCoverage` déjà calculé pour les puces → coût nul, coach plus pertinent.

## Détail technique

- `lib/logic.js` : `neglectedZone(coverage, zones)` pur + testé — première zone de la liste prioritaire à couverture 0, sinon `null` ; défauts robustes.
- `app.js` : `renderWeeklyReview` calcule `neglectedZone(zoneCov, ['abs','legs','arms','back','chest','shoulders'])` et l'ajoute à `#weeklyReviewNext` seulement si des zones ont été travaillées.

## Vérifs

- `npm run verify` → **159 tests / 159 pass** (+1 : `neglectedZone` — zone à 0, tout couvert → null, ordre de priorité, défauts), **SMOKE OK** (`neglectedZone:true`).
