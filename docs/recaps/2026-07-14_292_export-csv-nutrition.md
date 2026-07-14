# #292 — Export CSV du journal nutrition (1.9.226)

**Rotation 21 · item #1 · liberté totale (domaine : données / portabilité)**

## Problème
L'app exportait les entraînements (CSV), l'agenda (ICS) et une sauvegarde
complète (JSON), mais **pas** le journal nutrition quotidien (protéines, eau,
fruits/légumes). Ces données saisies chaque jour n'étaient donc pas récupérables
dans un tableur pour analyse.

## Amélioration
Un bouton « 📄 Journal nutrition (.csv) » dans Réglages › Sauvegarde & données
exporte tout le suivi nutrition.

### Logique pure — `nutritionCsv(nutrition)`
- En-tête `date,proteines_g,eau_verres,fruits_legumes` toujours présent.
- Filtre les dates valides (`YYYY-MM-DD`), **déduplique par date** (dernière
  entrée conservée), trie par date croissante.
- `fruit` → `oui`/`non` ; protéines/eau numériques (0 par défaut).
- Robuste : entrée non-tableau / vide → juste l'en-tête.

### Rendu — handler `#exportNutritionCsv`
- `download('nutrition-<date>.csv', 'text/csv;charset=utf-8', nutritionCsv(state.nutrition))`.
- Petit retour d'état dans `#dataIoStatus`.

## Tests
- `logic.test.js` : en-tête, tri, déduplication (dernière), exclusion date
  invalide, `oui`/`non`, vide/null → en-tête seul.
- `renderer-smoke.cjs` : check `nutritionCsv` (présence `#exportNutritionCsv` +
  contenu CSV exact).
- `npm run verify` : **315 tests + SMOKE OK** (`whatsNew` vert).
- Vérif navigateur (tab-8) : bouton présent/visible, CSV généré depuis l'état
  (`date,proteines_g,eau_verres,fruits_legumes` + `2026-07-14,145,6,oui`). ✔

## Fichiers
- `src/lib/logic.js` — `nutritionCsv()` + export + CHANGELOG[0] 1.9.226.
- `src/app.js` — handler `#exportNutritionCsv`.
- `src/index.html` — bouton dans le groupe Sauvegarde & données.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.
