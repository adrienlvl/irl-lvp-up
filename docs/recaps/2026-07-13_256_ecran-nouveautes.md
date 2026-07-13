# Boucle #256 (autonome) — 12ᵉ rotation #1 : écran « Nouveautés » · build 1.9.190

**12ᵉ rotation, #1 (mobile/PWA).** Depuis que l'auto-publish est actif, l'app se met à jour toute seule — mais l'utilisateur ne sait pas ce qui a changé. Ajout d'un **écran « Nouveautés »** qui liste, après une mise à jour, les features ajoutées depuis la dernière version vue.

## Livré

- **Carte « ✨ Nouveautés · v1.9.x »** en tête du tableau de bord, après une mise à jour auto.
- Liste les entrées du changelog **plus récentes que la dernière version vue** (max 6), la plus récente en tête.
- Bouton **« 👍 Super, compris »** → marque la version comme vue (ne réapparaît plus jusqu'à la prochaine update).
- **1re utilisation = rien** : un nouvel arrivant ne voit pas tout l'historique, on mémorise juste la version courante.

## Détail technique

- **`lib/logic.js`** : `compareVersions(a,b)` (semver par composant) + `whatsNewSince(lastSeen, changelog, limit=6)` (filtre > lastSeen, tri décroissant, plafond ; `lastSeen` vide → `[]`) + constante `CHANGELOG` (le plus récent en tête, `[0].v` = version courante). Purs + testés.
- **`app.js`** : `renderWhatsNew()` (lit/écrit `localStorage['irl-last-seen-version']`), appelé une fois au démarrage.
- **`index.html`** : `#whatsNewCard`.
- **`style.css`** : `.whatsnew-card` / `.wn-list` (bord accent).

## Vérifs

- `npm run verify` → **285 tests / 285 pass** (+ test `compareVersions`/`whatsNewSince`), garde-fou CSS vert, **SMOKE OK** (`whatsNew`).
- **Navigateur** (localhost:8137) : last-seen simulé `1.9.187` → carte « Nouveautés · v1.9.190 » avec 3 entrées ; « compris » masque + persiste `1.9.190` ; re-render → reste masqué (à jour). ✓
- `npm run dist` → **Setup 1.9.190.exe** (app d'Adrien jamais fermée).

## Suite (rotation 12)

#1 ✅ (#256). Prochain : #2 onboarding, #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue. _Rappel : compléter `CHANGELOG` à chaque release notable._
