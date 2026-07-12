# Boucle #207 (autonome) — Déploiement web prêt (GitHub Pages) · build 1.9.141

**Cap #1 (mobile) — dernière brique.** Tout le code PWA est en place ; il ne manquait que le moyen de le **mettre en ligne** pour l'installer sur le téléphone.

## Livré

- **Vérifié : aucun chemin absolu** (`/…`) dans index.html / app.js / CSS → l'app fonctionne sous un **sous-chemin** (GitHub Pages projet = `/irl-lvp-up/`). Verrouillé par un test.
- **`.github/workflows/pages.yml`** : workflow GitHub Actions qui, à chaque push, assemble le bundle web (index, app.js, service-worker, manifest, CSS, lib, assets) dans `_site/` et le **publie sur GitHub Pages**. Ne met en ligne que le code — **aucune donnée**.
- **`docs/DEPLOIEMENT-WEB.md`** : mode d'emploi simple pour Adrien (push → activer Pages → l'app est sur `https://adrienlvl.github.io/irl-lvp-up/` → « Ajouter à l'écran d'accueil »), avec la note sécurité (données 100 % locales, jamais publiées).

## 🔔 Action requise d'Adrien (une seule fois)

1. `git push` du dépôt vers GitHub (`adrienlvl/irl-lvp-up`).
2. GitHub → Settings → Pages → **Source : GitHub Actions**.
3. L'app est en ligne → l'ouvrir sur le téléphone → « Ajouter à l'écran d'accueil ».

## Détail technique / tests

- **`test/pwa.test.js`** : +2 tests — workflow présent + copie les bons assets + doc présente ; **aucun chemin absolu** dans index/app (héberge­ment sous-chemin sûr).

## Vérifs

- `npm run verify` → **241 tests / 241 pass** (+2 PWA), garde-fou CSS vert, **SMOKE OK**.
- `npm run dist` → **Setup 1.9.141.exe** (app d'Adrien jamais fermée).

## Bilan #1 (mobile) — SOLIDE ✅

Installable · hors-ligne · nav accessible · toujours à jour (network-first) · responsive · tap targets · replis navigateur · déploiement prêt. → Prochaine boucle : **#2 onboarding guidé**.
