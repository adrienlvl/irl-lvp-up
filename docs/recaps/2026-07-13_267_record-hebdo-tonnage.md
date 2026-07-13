# Boucle #267 (autonome) — 14ᵉ rotation #4 : record hebdo de tonnage · build 1.9.201

**14ᵉ rotation, #4 (coaching) — DERNIÈRE de la rotation.** On avait le record de séance et le « pic » sur 8 semaines, mais pas de **record de semaine all-time**. Ajout d'un record hebdo de tonnage, avec célébration si la semaine en cours le bat.

## Livré

- **Ligne « 🗓️ Record hebdo : X kg · sem. JJ/MM »** au pied du mini-graphe de tonnage (sous le record de séance).
- Si la **semaine en cours** est le record all-time → **« 🗓️ Record hebdo battu cette semaine ! »** en couleur accent.
- Cumule le tonnage de toutes les séances d'une même semaine (lundi→dimanche), sur tout l'historique.

## Détail technique

- **`lib/logic.js`** : `bestTonnageWeek(workouts, todayKey)` → `{ weekStart, tonnage, sessions, isCurrent }` ; regroupe par semaine (`mondayOf`), garde la plus élevée (égalité → plus récente) ; null si aucun tonnage. Pur + testé.
- **`app.js`** : `renderTonnageTrend` ajoute une 2ᵉ ligne `.tt-record` (réutilise le style existant, `.tt-record-new` si record de la semaine).
- **CHANGELOG** complété (v1.9.201).

## Vérifs

- `npm run verify` → **294 tests / 294 pass** (+ test `bestTonnageWeek`), garde-fou CSS vert, **SMOKE OK** (`bestTonnageWeek`).
- **Navigateur** (semaine 06/07 = 5000 kg sur 2 séances ; semaine courante 3000) : « 🏆 Nouveau record séance ! 3 000 kg · 13/07 » + « 🗓️ Record hebdo : 5 000 kg · sem. 06/07 ». ✓
- `npm run dist` → **Setup 1.9.201.exe** (app d'Adrien jamais fermée).

## Fin de la 14ᵉ rotation 🏁

#1 ✅ (#264) · #2 ✅ (#265) · #3 ✅ (#266) · #4 ✅ (#267). **Tag `v1.9.201` → auto-publish en ligne.** Rotation 15 enchaînée sur #1 (mobile/PWA). Boucle autonome continue.
