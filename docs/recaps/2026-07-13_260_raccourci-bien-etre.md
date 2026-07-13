# Boucle #260 (autonome) — 13ᵉ rotation #1 : raccourci « Bien-être » · build 1.9.194

**13ᵉ rotation, #1 (mobile/PWA).** Les raccourcis d'app (appui long sur l'icône installée) menaient à l'entraînement / coach / agenda / nutrition, mais pas au bien-être. Ajout d'un **raccourci « Routine bien-être »** (`?go=wellness`), et extraction de la cible de lancement en logique pure testée.

## Livré

- **Raccourci manifest « Routine bien-être »** → appui long sur l'icône installée = accès direct aux routines de mobilité.
- `?go=wellness` ouvre le mode Athlète (onglet Séance) et **fait défiler jusqu'au panneau bien-être**.

## Détail technique

- **`lib/logic.js`** : `LAUNCH_TARGETS` (liste blanche) + `launchTarget(search)` → clé normalisée parmi les cibles connues, null sinon (robuste aux entrées malformées). Pur + testé. Remplace le parsing inline du handler.
- **`app.js`** : le handler de lancement utilise `launchTarget` + nouvelle action `wellness` (showPage athlète → onglet séance → scroll `.wellness-panel`).
- **`manifest.webmanifest`** : 5ᵉ shortcut `?go=wellness`.
- **CHANGELOG** complété (v1.9.194).

## Vérifs

- `npm run verify` → **289 tests / 289 pass** (+ test `launchTarget`), garde-fou CSS vert, **SMOKE OK** (`launchTarget`).
- **Navigateur** (localhost:8137?go=wellness) : bouton Athlète actif, panneau bien-être visible (onglet séance, display:block), `scrollIntoView` → haut de page (top 0). ✓
- `npm run dist` → **Setup 1.9.194.exe** (app d'Adrien jamais fermée).

## Suite (rotation 13)

#1 ✅ (#260). Prochain : #2 onboarding, #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.
