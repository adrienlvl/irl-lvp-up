# Boucle #209 (autonome) — #3 Routines mobilité/récup + onboarding rejouable · build 1.9.143

## #3 — Contenu mobilité / étirements / récupération (nouveau)

Nouveau panneau **« 🧘 Routines guidées »** (Athlète → Séance) : 6 routines curées, **sans matériel**, lancées en **mode guidé** (minuteur, écran maintenu, vibration — comme une séance) :

- 🔥 **Échauffement dynamique** (5 min) · 🦵 **Mobilité hanches** (6 min) · 🏔️ **Mobilité épaules** (5 min) · 🧘 **Étirements complets** (8 min) · 🧊 **Retour au calme** (5 min) · ☀️ **Réveil articulaire** (4 min).

Chaque routine enchaîne des mouvements **tenus en secondes** (unité `sec`), avec un **repère d'exécution** (cue). Complète les séances muscu/course par la mobilité et la récup — souvent le maillon manquant.

## #2 (finition) — Onboarding rejouable

Bouton **« 🧭 Refaire la configuration de départ »** dans Réglages → rouvre le parcours d'onboarding (préremplit tes réglages actuels) pour changer d'objectif / mettre à jour ton profil quand tu veux.

## Détail technique

- **`lib/logic.js`** : `WELLNESS_ROUTINES` (6 routines × mouvements) + `wellnessRoutine(key)` → routine prête pour la séance guidée (`{exercises:[{name,sets:1,reps:sec,unit:'sec',rest:0,cue}]}`). Purs + testés.
- **`app.js`** : rendu de `#wellnessBar` (chips depuis WELLNESS_ROUTINES) → `openGuidedWorkout` ; refactor `openOnboarding()` réutilisable + bouton `#settingsReplayOnboarding`.
- **`index.html`** : panneau `wellness-panel` + bouton Réglages. **`strength.css`** : `.wellness-bar`/`.wellness-chip` (responsive).

## Vérifs

- `npm run verify` → **243 tests / 243 pass** (+1 : `wellnessRoutine`), garde-fou CSS vert, **SMOKE OK** (`wellness:true`, `replayOnboarding:true`).
- `npm run dist` → **Setup 1.9.143.exe** (app d'Adrien jamais fermée).

## Suite

Enrichir #3 (programmer une routine récup dans l'agenda, lien avec le conseil de charge) ; puis #4 COACHING périodisé (auto-ajustement multi-semaines, décharges auto).
