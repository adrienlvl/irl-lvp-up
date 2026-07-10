# Boucle #76 (autonome) — Clic sur un créneau libre = créer un événement · build 1.9.10

**Contexte :** 1ʳᵉ itération de la boucle d'amélioration autonome (Adrien : « fais une boucle que tu fais tout seul »). Suite naturelle de la grille horaire (#75).

## Livré

Dans la **vue Jour**, cliquer une **zone vide de la grille horaire** :
- calcule l'heure correspondant à la position du clic (arrondie au **quart d'heure**),
- **pré-remplit l'ajout rapide** (date du jour affiché + heure),
- **met le focus sur le champ titre** (et fait défiler jusqu'au formulaire).

→ On ajoute un événement « à la bonne heure » d'un simple clic, comme dans un vrai agenda. (Cliquer un bloc existant ouvre toujours l'édition ; seuls les créneaux vides déclenchent la création.)

## Détail technique

- `app.js` : `.day-grid` porte `data-gstart` / `data-pxm` / `data-daykey` ; le handler `#dayView` détecte un clic sur `.day-grid` hors `.dg-event`, convertit `offsetY` → minutes, règle `#weekQuickDate`/`#weekQuickTime` et focus `#weekQuickTitle`.
- `extras.css` : `cursor:copy` sur la grille (indice de clic).

## Vérifs

- `npm run verify` → **125 tests / 125 pass**, **SMOKE OK**.
- **Flux réel Electron** : grille `gStart=540` (09:00), clic à `y=120·pxm` → **heure 11:00**, date du jour, focus `weekQuickTitle`. ✅
