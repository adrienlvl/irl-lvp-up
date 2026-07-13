# Boucle #243 (autonome) — 8ᵉ rotation #4 : zone à rattraper (équilibre musculaire) · build 1.9.177

**8ᵉ rotation, #4 (coaching périodisé) — dernière de la rotation.** Le coaching de bloc ne signalait pas les **déséquilibres musculaires**. Ajout d'une carte « zone à rattraper » qui pointe le groupe le moins travaillé.

## Livré

- **Carte « 🩹 Zone à rattraper »** sur la carte de bloc en cours : la zone musculaire la **moins travaillée** (en séries) sur les **28 derniers jours** — ex. « 🔥 Abdos (0 série sur 28 j) ».
- Affichée seulement si la zone est **vraiment négligée** (0 série, ou < 40 % de la moyenne) → pas de bruit si l'entraînement est équilibré.

## Détail technique

- **`lib/logic.js`** : `neglectedZoneReport(workouts, todayKey, days=28)` → `{ zone, sets, emoji, label, days, neglected, bySets }` ou null. Comptage des séries par zone via `exerciseZones`, réutilise `TRAINING_GOALS` pour emoji/label. Pur + testé.
- **`app.js`** : `renderBlockStatus` (branche bloc en cours) affiche la carte si `neglected`.
- **`strength.css`** : `.bs-neglect` (rose).

## Vérifs

- `npm run verify` → **274 tests / 274 pass** (+1 `neglectedZoneReport`), garde-fou CSS vert, **SMOKE OK** (`blockNeglect:true`).
- **Navigateur** (bloc en cours + entraînement jambes only) : carte « 🩹 Zone à rattraper : 🔥 Abdos (tablette) (0 série sur 28 j) ». ✓
- `npm run dist` → **Setup 1.9.177.exe** (app d'Adrien jamais fermée).

## 🏁 Rotation 8 COMPLÈTE

#1 safe-area iPhone (#240) · #2 choix de niveau (#241) · #3 parcours guidés (#242) · #4 zone à rattraper (#243). → Notif + rotation 9. Boucle autonome continue.
