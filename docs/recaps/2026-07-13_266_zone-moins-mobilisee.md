# Boucle #266 (autonome) — 14ᵉ rotation #3 : zone la moins mobilisée · build 1.9.200

**14ᵉ rotation, #3 (bien-être).** On pouvait faire toujours les mêmes routines et négliger certaines zones. Ajout d'un **rappel ciblé de la zone du corps la moins récemment mobilisée**, pour équilibrer la mobilité.

## Livré

- **Ligne « 🎯 Zone à équilibrer : {routine} (pas mobilisée depuis N j / jamais) »** dans le panneau bien-être, avec bouton **« ▶️ Mobiliser »** qui lance la routine ciblée.
- Couvre 6 zones (hanches, épaules, bas du dos, chevilles, nuque, poignets). Priorité aux zones jamais faites, sinon la plus ancienne (seuil 7 j).
- Ne s'affiche qu'après ≥ 2 routines faites (assez de données).

## Détail technique

- **`lib/logic.js`** : `WELLNESS_ZONE_ROUTINES` + `neglectedMobilityZone(wellnessDone, todayKey, minDays=7)` → `{ key, emoji, title, lastDays }` (lastDays null = jamais) ou null si toutes récentes. Pur + testé.
- **`app.js`** : `renderWellnessZone()` (lance la routine ciblée) appelé dans `render()`.
- **`index.html`** : `#wellnessZone`.
- **`strength.css`** : `.wellness-zone` (accent bleu).
- **CHANGELOG** complété (v1.9.200).

## Vérifs

- `npm run verify` → **293 tests / 293 pass** (+ test `neglectedMobilityZone`), garde-fou CSS vert, **SMOKE OK** (`wellnessZone`).
- **Navigateur** (toutes zones faites, chevilles il y a 23 j) : « 🎯 Zone à équilibrer : 🦶 Chevilles & pieds (pas mobilisée depuis 23 j) ▶️ Mobiliser ». ✓
- `npm run dist` → **Setup 1.9.200.exe** (200ᵉ build ! app d'Adrien jamais fermée).

## Suite (rotation 14)

#1 ✅ (#264), #2 ✅ (#265), #3 ✅ (#266). Prochain : **#4 coaching** (dernière → tag + auto-publish + notif de rotation, puis rotation 15 sur #1). Boucle autonome continue.
