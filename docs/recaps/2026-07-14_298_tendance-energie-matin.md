# #298 — Rituel du matin : tendance de l'énergie (1.9.232)

**Rotation 22 · item #3 · piste « trous » (4ᵉ succès) — trou d'un AUTRE type**

## Problème
Audit du rituel du matin (`state.morningRituals` = `{date, energy, intention, firstStep}`) :

| champ | lectures dans `app.js` | verdict |
|---|---|---|
| `firstStep` | repeuplement + `#reflectionMemory` (« Ce matin, tu avais choisi… ») | ✅ surfacé |
| `intention` | **repeuplement seul** | ⚠️ trou (texte) |
| `energy` | repeuplement + boussole du jour (« Énergie 3/5 ») | ⚠️ trou (**numérique**) |

`energy` est le cas intéressant : c'est une **note numérique 1–5 saisie chaque
matin** et conservée indéfiniment, mais **seule celle du jour** était affichée.
Aucune moyenne, aucune tendance, aucun historique — alors que la récupération a
déjà son `readinessTrend`. Des mois de signal quotidien, jamais agrégés.

J'ai choisi `energy` plutôt qu'`intention` : un 4ᵉ bloc-liste de textes passés
aurait été répétitif après #296/#297, alors qu'une **tendance chiffrée** est d'un
autre type et complète le tableau de bord de forme.

## Amélioration
Sous le check-in du matin, une tendance : moyenne d'énergie récente + évolution.

### Logique pure — `morningEnergyTrend(rituals, todayKey, windowDays)`
- Miroir de `readinessTrend`, côté énergie subjective.
- Déduplique par date, ignore `energy <= 0`.
- Compare la fenêtre récente (w derniers jours, défaut 7) à la **précédente**
  (les w jours d'avant).
- Renvoie `{ avg, prevAvg, delta, dir ('up'|'down'|'flat'), level ('low'|'ok'|'high'), days, count }`.
- `null` si moins de 2 matins notés dans la fenêtre récente ; `prevAvg` à `null`
  si pas d'historique antérieur (alors `delta = 0`, `dir = 'flat'`).

### Rendu — dans `renderFocusRitual()`
- Bandeau `#morningEnergyTrend`, liseré selon le niveau (ambre si < 3, vert si ≥ 4).
- « ⚡ Énergie moyenne **2,7/5** sur 3 matins · ↘ −1,3 vs les 7 j d'avant »
  (flèche et couleur selon la direction).

## Tests
- `logic.test.js` : moyennes des deux fenêtres, `delta`, `dir`, `level` ; dédup
  par date ; `energy: 0` ignorée ; absence de fenêtre précédente → `prevAvg` null
  / `delta` 0 / `dir` flat ; < 2 matins → `null` ; clé invalide → `null`.
- `renderer-smoke.cjs` : check `morningEnergy` (présence `#morningEnergyTrend` + calcul).
- `npm run verify` : **322 tests + SMOKE OK** (`whatsNew` vert).
- Vérif navigateur (récent bas 2/3/3, précédent haut 4/4) : « ⚡ Énergie moyenne
  2,7/5 sur 3 matins · ↘ −1,3 vs les 7 j d'avant », classes `et-low` / `et-down`. ✔

## Fichiers
- `src/lib/logic.js` — `morningEnergyTrend()` + export + CHANGELOG[0] 1.9.232.
- `src/app.js` — bandeau dans `renderFocusRitual()`.
- `src/index.html` — `#morningEnergyTrend` après `#morningStatus`.
- `src/companion.css` — `.energy-trend` (+ niveaux et directions).
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Piste à continuer
`morningRituals[].intention` reste un trou confirmé (texte) — `recentReflectionNotes`
est générique mais ne prend que `reflections` ; il faudrait le généraliser à toute
liste datée, ou écrire un petit équivalent. Restent aussi : `state.focusReviews`
(seul `next` est surfacé), quêtes non faites, bien-être planifié non fait.
