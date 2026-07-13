# Boucle #242 (autonome) — 8ᵉ rotation #3 : parcours guidés (2 routines enchaînées) · build 1.9.176

**8ᵉ rotation, #3 (bien-être).** Les routines se lançaient une par une. Ajout de **parcours** qui enchaînent 2 routines complémentaires en une seule session guidée.

## Livré

- **3 parcours guidés** sous la barre bien-être :
  - 🌅 **Réveil complet** = réveil articulaire → mobilité hanches (10 min)
  - 🔥 **Prépa séance** = échauffement → mobilité épaules (10 min)
  - 🌙 **Détente du soir** = étirements → détente (14 min)
- Un clic lance la **session fusionnée** en mode guidé (tous les mouvements à la suite) ; loggé dans le suivi bien-être (streak/heatmap).

## Détail technique

- **`lib/logic.js`** : `WELLNESS_PARCOURS` (3) + `wellnessParcours(key)` (fusionne les mouvements des routines composantes, somme les minutes). Purs + testés. Exports ajoutés.
- **`app.js`** : rendu des chips `#wellnessParcours` + lancement `openGuidedWorkout` de la session fusionnée + `markWellnessDone('parcours-<key>')`.
- **`index.html`** : `#wellnessParcours`. **`strength.css`** : `.wellness-parcours` / `.wparc-chip`.

## Vérifs

- `npm run verify` → **273 tests / 273 pass** (+1 `wellnessParcours`), garde-fou CSS vert, **SMOKE OK** (`wellnessParcours:true`).
- **Navigateur** : 3 chips affichés ; clic « Réveil complet » → session guidée « 🌅 Réveil complet » ouverte + loggé `parcours-reveil`. ✓
- `npm run dist` → **Setup 1.9.176.exe** (app d'Adrien jamais fermée).

## Suite (rotation 8)

#1 ✅ (#240), #2 ✅ (#241), #3 ✅ (#242). Dernier : **#4 coaching** → puis notif + rotation 9. Boucle autonome continue.
