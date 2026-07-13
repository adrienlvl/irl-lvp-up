# Boucle #240 (autonome) — 8ᵉ rotation #1 : safe-area insets iPhone · build 1.9.174

**8ᵉ rotation, #1 (mobile/PWA).** En mode standalone sur iPhone à encoche (barre de statut `black-translucent`), les bandeaux fixes et le contenu passaient **sous l'encoche / la barre d'accueil**. Ajout des **safe-area insets**.

## Livré

- **`viewport-fit=cover`** dans le meta viewport (active les `env(safe-area-inset-*)`).
- **Bandeaux fixes** (`.conn-banner` : hors-ligne / MàJ / iOS) : padding haut = `calc(8px + env(safe-area-inset-top))` → dégagent l'encoche.
- **Contenu** (`.app-shell`, y compris mobile & densité compacte) : padding via `max(base, env(safe-area-inset-*))` sur les 4 côtés → le contenu ne touche plus les coins arrondis ni la barre d'accueil.
- **No-op hors iPhone à encoche** : `env()=0` → padding identique à avant (aucune régression desktop/Android).

## Détail technique

- **`index.html`** : meta viewport + `viewport-fit=cover`.
- **`style.css`** : `.conn-banner` padding-top safe ; `.app-shell` base + media `max-width:650px` en `max(...)`. **`extras.css`** : `.app-shell` densité compacte idem.

## Vérifs

- `npm run verify` → **271 tests / 271 pass**, **garde-fou CSS vert** (les `env()`/`max()`/`calc()` sont bien formés), **SMOKE OK** (`safeArea:true` — meta `viewport-fit=cover` + `safe-area-inset` présent dans les feuilles de style).
- **Navigateur** (375px) : `.app-shell` calcule « 30px 16px 55px » (identique, `env()=0`), aucun élément ne déborde → pas de régression. _(L'effet visuel n'est observable que sur un iPhone à encoche.)_
- `npm run dist` → **Setup 1.9.174.exe** (app d'Adrien jamais fermée).

## Suite (rotation 8)

#1 ✅ (#240). Prochain : #2 onboarding, #3 bien-être, #4 coaching. Boucle autonome continue.
