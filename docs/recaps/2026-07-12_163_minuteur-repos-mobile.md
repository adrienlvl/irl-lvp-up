# Boucle #163 (autonome) — Minuteur de repos façon appli muscu + prêt mobile · build 1.9.97

**Contexte :** nouvelle demande d'Adrien — le minuteur de repos est important, s'inspirer des applis de muscu, et pouvoir l'utiliser **sur téléphone en séance**. 1ʳᵉ itération d'une boucle « séance mobile + Coach/progression/programmes ».

**Note téléphone :** l'app est un logiciel Windows (Electron) — elle ne tourne pas telle quelle sur mobile. Cette itération rend la **séance guidée + le minuteur 100 % mobile-ready** ; le vrai accès téléphone passera par une **version web/PWA** (proposée à Adrien, à construire dans la boucle).

## Livré

Le minuteur de repos de la séance guidée passe au niveau des applis de muscu dédiées :

- **Gros affichage m:ss** (au lieu de « 90s »).
- **Préréglages rapides** : 0:30 / 1:00 / 1:30 / 2:00 / 3:00 (un tap règle le repos, relance si déjà lancé).
- **Vibration** en fin de repos sur mobile (`navigator.vibrate`), en plus du bip sonore.
- **Écran maintenu allumé** pendant toute la séance (`navigator.wakeLock`) — plus d'extinction au milieu d'une série.
- **Mode mobile** : dialogue de séance quasi plein écran, **gros boutons tactiles** (repos, ±15, valider série, champs kg/reps, actions), affichage minuteur agrandi.

## Détail technique

- `lib/logic.js` : `formatClock(sec)` — pur + testé (m:ss, garde-fous).
- `app.js` : `setGuidedRest(sec)` (préréglages), vibration en fin de décompte, `requestGuidedWakeLock()`/`releaseGuidedWakeLock()` (ouverture/fermeture/enregistrement de la séance), affichages du minuteur via `formatClock`.
- `index.html` : `#guidedRestPresets` (5 boutons) sous la barre de repos.
- `strength.css` : gros clock, `.rest-presets`, media-query mobile enrichie (dialogue plein écran + cibles tactiles ≥ 46-50 px).

## Vérifs

- `npm run verify` → **204 tests / 204 pass** (+1 : `formatClock`). **SMOKE OK** (`restTimerMobile:true` — 5 préréglages présents + format). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.97.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Programmes préconçus par envie de corps (abdos / bras / dos / bas du corps) ; plan course ≥ 4×/sem pour le cardio ; améliorations Coach Poids & progression ; puis piste version web/PWA pour l'usage téléphone.
