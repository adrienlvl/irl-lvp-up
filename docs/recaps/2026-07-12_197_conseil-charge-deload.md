# Boucle #197 (autonome) — Conseil de charge intelligent (auto-déload) · build 1.9.131

**Amélioration de fond (coaching).** L'app calculait déjà l'ACWR (ratio charge aiguë/chronique) et un score de forme du jour, mais ces deux signaux vivaient séparément et ne débouchaient pas sur une recommandation claire « pousser / maintenir / alléger ».

## Livré — carte de recommandation dans Athlète

Une carte **« conseil de charge »** combine l'ACWR **et** la forme du jour en une reco actionnable, colorée selon le statut :

| Situation | Statut | Message |
|---|---|---|
| ACWR haut (> 1,5) | 🟥 **Allège** | Pic de charge, risque de blessure → −30/40 % 5–7 j |
| Forme basse (< 50/100) | 🟧 **Récup d'abord** | Séance courte/facile, sommeil + protéines |
| ACWR optimal + forme ≥ 75 | 🟩 **Feu vert** | Ajoute charge ou 1 série sur les exos clés |
| ACWR bas (< 0,8) + forme OK | 🟦 **Remonte le volume** | Ré-augmente ≤ 10 %/sem |
| sinon | 🟨 **Maintiens** | Même volume, 1–2 reps en réserve |

La **priorité va au risque** (surcharge ou forme basse → alléger), même avec un bon ACWR.

## Détail technique

- **`lib/logic.js`** : `loadAdvice(acwr, readiness)` → `{status, emoji, title, advice}` ; combine `acuteChronicRatio` (zone) et `readinessScore` (score). Défaut sûr `maintain` si données manquantes. Pur + testé.
- **`app.js`** : rendu de `#loadAdvice` sous le score de forme (calcule ACWR + readiness du jour). **`index.html`** + **`athlete.css`** : carte `.load-advice` avec variantes de couleur par statut.

## Vérifs

- `npm run verify` → **231 tests / 231 pass** (+1 : `loadAdvice`), garde-fou CSS vert, **SMOKE OK** (`loadAdvice:true`). `node --check` app.js + smoke OK.
- `npm run dist` → **Setup 1.9.131.exe** (app d'Adrien jamais fermée).

## Suite (améliorations de fond)

Quêtes auto depuis les objectifs, bilan hebdo intelligent, plan de repas concret.
