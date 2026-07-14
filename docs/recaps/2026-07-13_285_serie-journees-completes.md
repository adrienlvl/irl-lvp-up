# Boucle #285 (autonome) — 19ᵉ rotation #2 (liberté totale) : série de journées complètes · build 1.9.219

**Domaine : Mission Control / gamification transverse.** Le Mission Control notait un score du jour (X/6 domaines de vie) et un ruban 7 jours, mais rien ne récompensait la **régularité**. Ajout d'une **série de journées « complètes »** (≥ 4 des 6 domaines cochés) affichée dans le bandeau « Rythme récent ».

## Livré

- **Badge « 🌟 N jours complets de suite »** à côté de « RYTHME RÉCENT », dès 2 jours d'affilée.
- « Complet » = au moins **4 des 6 domaines** (matin, focus, corps, carburant, vie, soir) validés le même jour, sur les 30 derniers jours.

## Détail technique

- **`lib/logic.js`** : `completeDaysStreak(days, threshold, todayKey)` → longueur de la série de jours ≥ seuil (défaut 4), en réutilisant `dailyStreak` (grâce pour aujourd'hui incomplet). Pur + testé.
- **`app.js`** : `renderMissionControl` calcule 30 jours de `{date, count}` (via `missionDayState`) et affiche `#missionStreak` si ≥ 2.
- **`index.html`** : `#missionStreak`. **`mission-control.css`** : `.mission-streak`.
- **CHANGELOG** complété (v1.9.219).

## Vérifs

- `npm run verify` → **306 tests / 306 pass** (+ test `completeDaysStreak`), garde-fou CSS vert, **SMOKE OK** (`completeDaysStreak`).
- **Navigateur** (3 jours à 4 domaines) : badge « · 🌟 3 jours complets de suite », score du jour 4/6. ✓
- `npm run dist` → **Setup 1.9.219.exe** (app d'Adrien jamais fermée).

## Suite (rotation 19)

#1 ✅ (#284 révisions BTS), #2 ✅ (#285 mission). Liberté totale : je continue sur d'autres domaines à forte valeur. Fin de rotation (4 items) = tag + auto-publish. Boucle autonome continue.
