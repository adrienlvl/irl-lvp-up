# Récap boucle #33 — Import d'un vrai extrait CIQUAL 2020 (ANSES)

**Quand :** 2026-07-06
**Statut :** ✅ vérifié (61/61 tests, smoke OK, build 1.2.0)
**Demande d'Adrien :** un vrai sous-ensemble CIQUAL (référence française officielle).

## Ce que j'ai fait
- Récupéré le **fichier officiel CIQUAL 2020 en français** (XLS, ~3,6 Mo) depuis data.gouv.fr / ciqual.anses.fr — **Licence Ouverte (Etalab)**, réutilisation libre. Fichier authentique (OLE Excel signé ANSES).
- **Parsé hors ligne dans le scratchpad** avec SheetJS (`xlsx`), installé UNIQUEMENT dans le scratchpad — **aucun code tiers n'est embarqué dans l'app** (seules les valeurs de données sont extraites).
- Généré `src/lib/foods-data.js` : **2265 aliments** (ceux ayant une énergie valide, hors aliments infantiles), champs pour 100 g : `n` (nom), `cat` (catégorie), `kcal`, `p`, `c`, `f`, `fib`, `sel`.
- **Catégorisation** (P protéine, F féculent, L légume, R fruit, D laitier, G gras, S sucré, B boisson, M plat composé, A autre) — le groupe mixte « fruits/légumes/légumineuses/oléagineux » tranché via le sous-groupe.
- **Recherche classée** (`searchFoods`) : les aliments simples remontent avant les plats composés, et avant par nom qui commence par la requête / nom court. Multi-mots (tous les termes), insensible casse/accents/ligature œ.

## Vérifié
- `poulet` → *Poulet, pilon, cru* · *Poulet, viande, crue*… (plus de « Poulet au curry » en tête)
- `riz` → *Riz blanc, cru* (P 7.4)… · `oeuf` → *Oeuf, dur / cru / poché*
- `node --check` OK · `npm test` **60 → 61** (tests foods réécrits pour CIQUAL) · smoke `SMOKE OK`.
- Taille embarquée : ~250 Ko (données pures, parse instantané). Rebuild **1.2.0** testé.

## Sécurité / licence
- Données **Licence Ouverte** → OK à embarquer avec attribution (faite dans l'UI + en-tête du fichier).
- Zéro dépendance réseau à l'exécution ; le parseur (`xlsx`) reste dans le scratchpad, hors app.

## Suite
- **Suggestions de repas** (demandé) : à partir des catégories P/F/L/R/D/G, composer des repas équilibrés selon la cible protéique/kcal.

## Git
- Commit : `feat(nutrition): vrai extrait CIQUAL 2020 (2265 aliments, Licence Ouverte) + build 1.2.0`.
