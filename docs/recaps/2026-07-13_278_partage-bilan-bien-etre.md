# Boucle #278 (autonome) — 17ᵉ rotation #3 : partage du bilan bien-être · build 1.9.212

**17ᵉ rotation, #3 (bien-être).** On partageait déjà une routine et la progression de bloc ; ajout du **partage du bilan bien-être** (série, routines de la semaine, minutes de mobilité, total, paliers) via Web Share.

## Livré

- **Bouton « 📤 Partager mon bilan »** dans le panneau bien-être (affiché dès qu'il y a au moins une routine).
- Feuille de partage native (mobile) ou copie presse-papier (desktop) d'un récap : série, routines + minutes de la semaine, total, paliers débloqués.

## Détail technique

- **`lib/logic.js`** : `shareableWellness(wellnessDone, todayKey)` → `{ title, text }` (réutilise `wellnessStreak`/`wellnessCountInWindow`/`wellnessMinutesInWindow`/`wellnessBadges`) ; null si aucune routine ; robuste à un `todayKey` invalide. Pur + testé.
- **`app.js`** : `renderWellnessStreak` affiche/masque `#wellnessShareBtn` selon les données ; handler Web Share + repli presse-papier (« ✓ Copié »).
- **`index.html`** : `#wellnessShareBtn`.
- **CHANGELOG** complété (v1.9.212).

## Vérifs

- `npm run verify` → **301 tests / 301 pass** (+ test `shareableWellness`), garde-fou CSS vert, **SMOKE OK** (`shareableWellness`).
- **Navigateur** (3 routines) : bouton visible ; payload « 🧘 Mon bilan bien-être … 🔥 3 jours de suite … Cette semaine : 1 routine · 5 min … 3 routines au total … Paliers : 🌱 3 jours de suite ». ✓
- `npm run dist` → **Setup 1.9.212.exe** (app d'Adrien jamais fermée).

## Suite (rotation 17)

#1 ✅ (#276), #2 ✅ (#277), #3 ✅ (#278). Prochain : **#4 coaching** (dernière → tag + auto-publish + notif de rotation, puis rotation 18 sur #1). Boucle autonome continue.
