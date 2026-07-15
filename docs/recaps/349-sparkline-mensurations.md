# #349 — Mini-courbe du tour de taille (1.9.283)

## Le manque

Le panneau Mensurations montrait des **deltas chiffrés** (« Taille −3 cm depuis le début », « récente
−1 cm ») mais **aucune courbe**. Pour suivre la recomposition — la priorité corps d'Adrien — voir la
tendance du tour de taille dans le temps, d'un coup d'œil, a une vraie valeur (la balance seule ne
distingue pas muscle et gras).

## Pourquoi une nouvelle sparkline

`barChartSvg` (utilisé ailleurs) trace les barres **depuis 0** → sur une grande base comme un tour de
taille (84 vs 82 cm), toutes les barres font ~90 % de hauteur : la variation est **invisible**. Il
fallait une courbe **normalisée min→max** qui étale l'amplitude réelle.

## Ce qui change

- Pure `measurementSeries(measurements, field, limit)` : les N derniers points datés `{date, value}`
  d'un champ, triés, valeurs manquantes ignorées.
- Renderer `sparkLineSvg(points)` : polyligne normalisée min→max (variation lisible), `vector-effect`
  non-scaling pour une épaisseur constante.
- Rendu sous les deltas : « 📏 Tour de taille · N mesures · ±X cm » + la mini-courbe. Affiché
  seulement s'il y a ≥ 2 mesures **et** au moins 2 valeurs distinctes (pas de courbe plate inutile).

## Vérification navigateur (rendu réel)

Mesures 88 → 87 → 85,5 → 84 :

| Élément | Résultat |
|---|---|
| Header | ✅ « 📏 Tour de taille · 4 mesures · −4 cm » |
| Courbe | ✅ `M0 8 → L100 92` (88 en haut, 84 en bas — amplitude pleine hauteur) |
| Toutes valeurs égales | ✅ courbe masquée |

## Tests

367 tests `node:test` (tri ancien→récent, plafond N, champ manquant ignoré, vide/date invalide → [])
+ smoke `measureSpark` **bloquant** (série + `sparkLineSvg` produit un `<path>`, < 2 points → '').

## Rotation

#349 — rotation 35 (build 1.9.283). Type : visualisation / polish (sert la priorité recomposition).
Prochain #350.
