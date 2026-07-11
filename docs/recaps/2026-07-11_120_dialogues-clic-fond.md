# Boucle #120 (autonome) — Dialogues fermables au clic sur le fond · build 1.9.54

**Contexte :** 45ᵉ itération de la boucle autonome. Aire : Fiabilité / UX (suite au signalement d'Adrien « impossible de taper dans les champs »).

## Diagnostic préalable (bug de saisie)
Adrien a signalé qu'en 1.9.53 il ne pouvait taper dans aucun champ, sur toutes les pages. **Non reproductible** : test de frappe réelle dans le vrai renderer Electron (état utilisateur établi) → la saisie fonctionne sur `todoInput` (Dashboard), `foodSearch` (Nutrition), `weekQuickTitle` (Agenda). Aucun dialogue modal ouvert, page non inerte. Conclusion : très probablement une **install pas encore mise à jour** (auto-update en retard). Correctif : réinstaller `Setup 1.9.53.exe`.

## Livré (robustesse UX liée)
Pour éliminer toute sensation d'être « coincé » dans une fenêtre modale : **tout `<dialog>` se ferme désormais en cliquant sur le fond** (backdrop), en plus d'Échap et du bouton ✕.

- `bindDialogBackdropClose()` : sur chaque `<dialog>`, un clic dont la cible est le dialogue lui-même **et** dont les coordonnées sont **hors** de la boîte du dialogue (donc sur le backdrop) déclenche `close()`.
- Idempotent (`data-bdBound`), n'affecte pas les clics à l'intérieur du contenu.

## Vérifs

- `npm run verify` → **158 tests / 158 pass**, **SMOKE OK** — nouveau check `dialogBackdrop` qui **exerce réellement** le comportement (ouvre `#questDialog`, simule un clic backdrop, vérifie la fermeture). `node --check app.js` OK.
