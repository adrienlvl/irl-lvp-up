# #350 — Mini-courbe du sommeil (1.9.284)

## Le manque

Le bilan récupération montrait la **moyenne** de sommeil sur 7 j et la **nuit la plus courte**, mais
aucune **courbe nuit après nuit**. On ne voyait pas si le sommeil progresse ou se dégrade dans le
temps — juste le chiffre du jour et une moyenne.

## Ce qui change

- Pure `sleepSeries(recovery, limit)` : les `limit` dernières nuits chiffrées (heures), une valeur par
  date (dernier check-in), triées, 0 exclu. Renvoie `[{ date, value }]`.
- Rendu dans le panneau Récupération (sous le bilan hebdo) : « 😴 Sommeil · N nuits · X h moy. » + une
  mini-courbe via `sparkLineSvg` (normalisée min→max, le helper introduit au #349 — réutilisé). Affiché
  seulement s'il y a ≥ 3 nuits **et** ≥ 2 valeurs distinctes (pas de courbe plate). Réutilise le style
  `.measure-spark` (aucun CSS nouveau).

## Vérification

Le **Browser pane était indisponible** dans cette session reprise (localhost et file:// bloqués par
la politique du sandbox). Vérification donc via :

- **Smoke `sleepSpark` bloquant** (Electron réel, tous mes edits chargés) : `sleepSeries` renvoie la
  bonne série, `sparkLineSvg` produit un `<path>`, `#sleepSpark` présent, et le `render()` complet
  (→ `renderWeeklySleep`) s'exécute sans erreur (368 tests + SMOKE OK).
- **Node tests** : tri ancien→récent, dédoublonnage par date (dernier check-in), 0 exclu, plafond N,
  vide / date invalide → [].
- Le rendu réutilise **exactement** le même `sparkLineSvg` + `.measure-spark` que la courbe du tour de
  taille (#349), dont le rendu SVG a été confirmé visuellement en navigateur (`M0 8 → L100 92`).

## Rotation

#350 — rotation 35 (build 1.9.284). Type : visualisation. Domaine : sommeil/récupération. Prochain
#351 clôture la rotation (tag v1.9.285).
