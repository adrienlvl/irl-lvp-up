# Audit — jeux de données GitHub pour la nutrition (sécurité & licence)

_2026-07-06. Demande d'Adrien : scanner GitHub pour des données utiles, vérifier qu'elles sont sûres avant intégration._

## Méthode
Recherche ciblée (données nutrition : aliments, macros, JSON/CSV, hors-ligne) + évaluation de chaque candidat sur : **licence** (droit de réutilisation), **nature** (données seules vs code exécutable), **provenance/qualité**, **taille** (embarquable hors-ligne), **risque sécurité**.

## Candidats évalués

| Repo | Licence | Nature | Verdict |
|---|---|---|---|
| `eliashussary/nutrition-facts` | MIT | **Code** (wrapper Node.js appelant l'API USDA en ligne) | ❌ Pas des données offline ; introduirait du code + une dépendance réseau. Écarté. |
| `Chetana2403/nutrition-dataset` | **Aucune** | CSV (Nom, portion, kcal, lipides, protéines, glucides, fibres) | ❌ Pas de licence = « tous droits réservés » par défaut → **illégal à redistribuer/embarquer** ; source non indiquée. Écarté. |
| `google-research-datasets/Nutrition5k` | CC BY 4.0 | Images de plats + valeurs nutritionnelles (ML vision) | ⏳ Sûr et permissif, mais lourd et orienté vision — pertinent plus tard pour le **scan de frigo**, pas pour un simple tableau de macros. |
| **USDA FoodData Central** | **Domaine public** (gouv. US) | CSV/JSON officiels | ✅ La référence sûre : réutilisation libre, provenance fiable. |
| Open Food Facts | ODbL | Base énorme | ⏳ Utilisable mais share-alike + attribution + très volumineux ; surdimensionné ici. |

## Principe de sécurité appliqué
- **Ne jamais exécuter** de code provenant d'un repo tiers.
- **Ne pas embarquer** de données sans licence claire (risque juridique) ni de provenance douteuse.
- Préférer une **source de référence en domaine public** (USDA) et rester **hors-ligne** (cohérent avec le « 100 % local » de l'app).

## Décision retenue
Plutôt qu'importer un repo douteux, on embarque un **petit jeu d'aliments curé à la main** (`src/lib/foods-data.js`, 54 aliments, valeurs pour 100 g inspirées du domaine public type USDA). Zéro code tiers, zéro dépendance réseau, zéro risque de licence. Extensible ensuite.

Pour un scan de frigo (futur), la reconnaissance d'image nécessitera un modèle embarqué **ou** un appel réseau à un service — ce dernier cas devra passer par la Vague Sécurité (allowlist, pas de secret en clair, opt-in explicite).
