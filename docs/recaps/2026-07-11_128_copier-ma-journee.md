# Boucle #128 (autonome) — Copier ma journée · build 1.9.62

**Contexte :** 53ᵉ itération de la boucle autonome. Aire : Agenda / vue jour.

## Livré

Un bouton **« 📋 Copier »** dans l'en-tête de la vue jour met le **planning du jour dans le presse-papiers** (à l'image du « Copier » de la liste de courses) :

```
Ma journée — vendredi 10 juillet
- 09:00 Réunion équipe ✓
- 12:30 Muscu haut du corps
- Journée Révision compta
- — Appeler dentiste
```

Pratique pour partager sa journée (message, note) ou la coller ailleurs.

## Détail technique

- `lib/logic.js` : `dayPlanText(items)` pur + testé → une ligne par item (`- HH:MM titre` / `- Journée …` / `- — …`, `✓` si fait), anniversaires exclus.
- `app.js` : bouton `data-day-copy` dans `.day-view-head` (si la journée n'est pas vide) ; handler dans `#dayView` construit l'en-tête daté + `dayPlanText`, `navigator.clipboard.writeText`, retour « Copié ✓ ».
- `extras.css` : style `.day-copy`.

## Vérifs

- `npm run verify` → **164 tests / 164 pass** (+1 : `dayPlanText` — heure/journée/sans heure, ✓, exclut anniversaire, vide/non-tableau), **SMOKE OK** (`dayCopy:true`). `node --check app.js` OK.
