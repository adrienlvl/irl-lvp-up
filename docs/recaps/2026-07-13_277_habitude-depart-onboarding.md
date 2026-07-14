# Boucle #277 (autonome) — 17ᵉ rotation #2 : habitude de départ à l'onboarding · build 1.9.211

**17ᵉ rotation, #2 (onboarding).** L'onboarding crée déjà des quêtes du jour ; ajout d'une **habitude de départ** (tous les jours) adaptée à l'objectif, pour lancer la dynamique de suivi d'habitudes dès le début.

## Livré

- **Case « Créer une habitude de départ : {suggestion} »** (cochée par défaut) dans l'onboarding.
- Le libellé **s'adapte à l'objectif** : sèche → « Boire 2 L d'eau », muscle → « Protéines à chaque repas », endurance → « 10 min d'étirement », forme → « 10 min de marche », athlétique → « Se coucher avant 23 h ».
- À la fin, si cochée, l'habitude (7 jours/sem) est créée dans le panneau Habitudes (dédup par nom).

## Détail technique

- **`lib/logic.js`** : `STARTER_HABITS` + `starterHabitFor(objective)` → `{ name, xp, weekdays:[0..6] }` (objectif inconnu → athletique). Pur + testé ; normalisable via `normalizeHabit`.
- **`app.js`** : `renderOnboardingHabitLabel()` (libellé selon objectif) + création dans `finishOnboarding` si la case est cochée.
- **`index.html`** : `#onbStarterHabit`, `#onbStarterHabitLabel`.
- **`companion.css`** : `.onb-starter-habit`.
- **CHANGELOG** complété (v1.9.211).

## Vérifs

- `npm run verify` → **300 tests / 300 pass** (+ test `starterHabitFor`), garde-fou CSS vert, **SMOKE OK** (`starterHabit`).
- **Navigateur** : libellé adapté (sèche→eau, muscle→protéines) ; « Démarrer » avec case cochée (muscle) → habitude « Protéines à chaque repas » créée (7 jours). ✓
- `npm run dist` → **Setup 1.9.211.exe** (app d'Adrien jamais fermée).

## Suite (rotation 17)

#1 ✅ (#276), #2 ✅ (#277). Prochain : #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.
