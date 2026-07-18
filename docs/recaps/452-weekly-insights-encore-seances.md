# 452 — Bilan hebdo : « encore N séances » (nom accordé) au lieu de « encore N » (2.0.82)

**Boucle #452 · build 2.0.82 · domaine Bilan hebdo / Coaching · polish UX honnête (§4.4)**

## Le manque (réel, prouvé par test)

`weeklyInsights` (`logic.js:2303`) alimente la carte « Comment va ma semaine » (check `weeklyInsights`
au smoke). Quand l'objectif de séances n'est pas encore atteint, le message se terminait par :

```
2/4 séances — encore 2 pour ton objectif hebdo.
```

Le nombre restant n'était **pas suivi de son nom** (« séance(s) »), là où le **message frère** rendu
côté `app.js:146` l'inclut déjà : `${remaining} séance${...}s pour boucler ton objectif de la semaine.`
Deux formulations du même conseil, l'une complète et l'autre tronquée — incohérence de libellé.

## Le correctif

`logic.js:2305` — le reste à faire (`left = goalSessions − cur.sessions`) porte désormais le nom
« séance », **accordé sur le nombre restant** (`left > 1 ? 's'`), pas sur l'objectif :

```
2/4 séances — encore 2 séances pour ton objectif hebdo.
0/1 séance — encore 1 séance pour ton objectif hebdo.
1/4 séances — encore 3 séances pour ton objectif hebdo.
```

Aligné sur la convention d'accord FR (singulier si le reste = 1) et sur le message d'`app.js`. Seul le
libellé change ; la logique de bilan (tri, plafond à 5, tons) est inchangée.

## Vérif

- Test `weeklyInsights` étendu : `0/1 séance — encore 1 séance …` (singulier du reste) **et**
  `1/4 séances — encore 3 séances …` (pluriel du reste). Les assertions d'accord existantes (objectif
  = 1 → pas de pluriel fautif) restent vertes.
- `cd src && xvfb-run -a npm run verify` : **447 tests + smoke** 100 % vert
  (`weeklyInsights:true`, `whatsNew:true`, `SMOKE OK`).

## Portée / honnêteté

Effet utilisateur réel (texte affiché) → **bump 2.0.82** + entrée CHANGELOG (§6). Pur polish de
libellé, aucune fonction ni comportement modifié au-delà de la chaîne.

## Suite

Familles de bugs purs du cœur closes (#438→#451). Prochaines boucles : couverture ciblée, a11y (déjà
solide), ou autres polishes de libellé vérifiables au smoke. Voir la note mémoire
`backlog-leads-distinct-days-legacy`.
