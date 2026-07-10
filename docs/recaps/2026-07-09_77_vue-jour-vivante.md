# Boucle #77 (autonome) — Vue Jour vivante · build 1.9.11

**Contexte :** 2ᵉ itération de la boucle autonome (cadence passée à ~5 min / dès que l'itération précédente est finie).

## Livré

La **vue Jour** se met à jour toute seule : la **ligne « maintenant »** de la grille horaire et les compteurs **« pars dans X min »** / « déjà l'heure de partir » se figeaient au moment du rendu. Ajout d'un **rafraîchissement chaque minute** (`renderDayView`) quand :
- la page agenda (`#weekPage`) est affichée,
- la vue Jour (`#dayView`) est visible,
- **aucune boîte de dialogue n'est ouverte** (on ne perturbe pas une édition en cours ; le formulaire d'ajout n'est pas touché de toute façon — seul `#dayView` est re-rendu).

## Détail technique

- `app.js` : `setInterval(…, 60000)` au démarrage, gardé (visibilité + `dialog[open]`), enveloppé dans try/catch.

## Vérifs

- `node --check app.js` OK ; `npm run verify` → **125 tests / 125 pass**, **SMOKE OK**.
- Low-risk : ne re-rend que `#dayView` (pas le formulaire), seulement quand la vue est active.
