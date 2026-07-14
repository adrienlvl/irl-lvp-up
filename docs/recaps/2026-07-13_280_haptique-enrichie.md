# Boucle #280 (autonome) — 18ᵉ rotation #1 : retour haptique enrichi · build 1.9.214

**18ᵉ rotation, #1 (mobile/PWA).** Les vibrations existaient sur repos/série/record/level-up mais pas sur les autres moments de gamification. Ajout de **retours haptiques** sur les paliers bien-être débloqués et les quêtes bouclées.

## Livré

- **Vibration `badge`** quand un palier bien-être est débloqué (motif de célébration).
- **Vibration `questDone`** quand une quête du jour est cochée (petit feedback tactile).

## Détail technique

- **`lib/logic.js`** : `VIBRATION_PATTERNS` enrichi (`badge: [50,40,90,40,160]`, `questDone: [30,30,60]`). Pur + testé (motifs valides, copie non mutée).
- **`app.js`** : `haptic('badge')` dans `markWellnessDone` (nouveau palier) ; `haptic('questDone')` à la validation d'une quête.
- **CHANGELOG** complété (v1.9.214).

## Vérifs

- `npm run verify` → **302 tests / 302 pass** (assertions `badge`/`questDone` ajoutées), garde-fou CSS vert, **SMOKE OK** (`haptics` étendu).
- Non observable en navigateur (pas de vibration hors appareil) → couverture par node:test + smoke. ✓
- `npm run dist` → **Setup 1.9.214.exe** (app d'Adrien jamais fermée).

## Suite (rotation 18)

#1 ✅ (#280). Prochain : #2 onboarding, #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.
