# Boucle #137 (autonome) — Copier mon bilan de la semaine · build 1.9.71

**Contexte :** 62ᵉ itération de la boucle autonome (dernière avant recentrage sur Exercices/Athlète demandé par Adrien).

## Livré

Un bouton **« 📋 Copier mon bilan »** dans la revue hebdomadaire met un **résumé partageable de la semaine** dans le presse-papiers :

```
Bilan de la semaine du 06/07/2026 :
🏋️ 3 séances · 150 min · 12 km
🧠 75 min de focus
📚 2/4 révisions validées
😴 7.2 h de sommeil moyen
```

Les lignes vides (focus/révisions/sommeil à 0) sont omises.

## Détail technique

- `lib/logic.js` : `weeklySummaryText(sum)` pur + testé — formate la sortie de `weeklySummary` en texte.
- `app.js` : handler `#copyWeeklySummary` → `weeklySummaryText(weeklySummary(state, lundi de la semaine))`, clipboard, retour « Copié ✓ ».
- `index.html` : bouton dans le panneau revue hebdo.

## Vérifs

- `npm run verify` → **171 tests / 171 pass** (+1 : `weeklySummaryText` — format, champs omis, null), **SMOKE OK** (`weeklyText:true`). `node --check app.js` OK.

_Note : à partir de la prochaine boucle, focus explicite sur les sections **Exercices** et **Athlète** (demande d'Adrien), cadence 1 min._
