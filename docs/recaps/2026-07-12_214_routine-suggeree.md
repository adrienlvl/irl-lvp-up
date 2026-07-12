# Boucle #214 (autonome) — Approfondir #3 : routine suggérée selon la forme + 2 routines · build 1.9.148

**Approfondir #3 (mobilité/récup).** Les routines existaient mais il fallait choisir soi-même. Ajout d'une **suggestion intelligente** liée à ta forme, + du contenu.

## Livré

- **Suggestion du jour** (bandeau en tête du panneau « Routines guidées ») : selon ta **forme du jour** (readinessScore) et ta **charge** (loadAdvice/ACWR), l'app propose la bonne routine avec un bouton pour la lancer :
  - forme basse **ou** charge élevée → **récupération / étirements** (ambre) ;
  - bonne forme → **échauffement dynamique** (vert) ;
  - sinon → un peu de **mobilité hanches**.
- **2 nouvelles routines** : 🩹 **Bas du dos** (soulage la position assise / port de charges) et 😴 **Détente du soir** (respiration 4-7-8, jambes au mur…) → **8 routines** au total.

## Détail technique

- **`lib/logic.js`** : `WELLNESS_ROUTINES` +2 (backpain, sleep) ; `suggestedRoutine(loadStatus, readinessScore)` → `{key, tone, reason}` (null/donnée manquante gérés). Purs + testés.
- **`app.js`** : `renderWellnessSuggest()` (readinessScore + loadAdvice → suggestedRoutine → bandeau + bouton lancer), appelée dans `render()`.
- **`index.html`** : `#wellnessSuggest`. **`strength.css`** : `.wellness-suggest` + variantes de ton.

## Vérifs

- `npm run verify` → **246 tests / 246 pass** (+1 : `suggestedRoutine`, `wellnessRoutine` étendu), garde-fou CSS vert, **SMOKE OK** (`wellnessSuggest:true`).
- `npm run dist` → **Setup 1.9.148.exe** (app d'Adrien jamais fermée).

## Suite (rotation)

#4 PÉRIODISÉ (décharge qui allège vraiment les séances, rappel de fin de bloc), puis reboucler #1.
