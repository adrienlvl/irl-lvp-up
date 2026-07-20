# #573 — Coach : plus de « Garde le rythme » un jour où l'action dit de se reposer (build 2.0.196)

**Domaine : coach** · demande de nuit (Coaching adaptatif à fond, en QUALITÉ). Rotation §4 bis : les
5 derniers domaines (mtime) = `robustesse · a11y · coach · robustesse · athlete` → `coach` (#570)
absent des **2 derniers** (#572 robustesse, #571 a11y) et **1×** sur 5 → **autorisé**. La priorité de
nuit et la rotation convergent.

## Le défaut (contradiction insight × action, trouvée en rendu chargé §4 ter)

Méthode §4 ter appliquée à `adaptiveCoachFocus` : état chargé réaliste — 4 jours actifs cette semaine
**en hausse** (ton `reinforce`), mais **readiness 48/100** (sommeil court + fatigue élevée le jour
même), sans objectif hebdo défini. Rendu cumulé de la carte :

- headline « Ton entraînement monte en régime »
- insight « 4 jours actifs cette semaine, en hausse. **Garde le rythme.** … »
- action « Readiness 48/100 — **récupération prioritaire** : vise mobilité, marche ou technique légère
  **plutôt qu'une grosse séance aujourd'hui**. »

Le coach **pousse** (« garde le rythme ») et **freine** (« repose-toi ») le même jour, côte à côte sur
la carte — exactement le défaut « parler des deux coins de la bouche » déjà corrigé pour d'autres
notes : `restOverGoal` (2.0.135, `logic.js:5672`) et le followThrough (#561/#567). Mais ces deux
garde-fous ne désamorcent le conflit que lorsqu'un **objectif hebdo serré** le déclenche ; le
`reinforce` **générique sans objectif** (« Garde le rythme. », `logic.js:5244`) y échappait.

## Le correctif (curation, pas ajout — §3)

Dans le bloc readiness (`logic.js`, `chosen.pillar === 'sport'`, après `readiness = rs.score`) :

```js
if (rs.score < 50 && tone === 'reinforce') insight = insight.replace(' Garde le rythme.', '');
```

On retire la **seule injonction** qui contredit le repos du jour. Le constat « en hausse » (stat hebdo
vraie) et le crédit du volume restent — le compliment demeure, l'ordre contradictoire s'efface.
Gating exact : `chosen.pillar === 'sport'` (seul pilier porteur d'une action readiness), `tone ===
'reinforce'` (seul ton écrivant cette phrase, où « Garde le rythme. » est unique), `rs.score < 50`
(seuil identique à l'action « récupération prioritaire »). **Aucune note ni champ ajouté.**

## Vérifications

- Rendu chargé re-joué : plus de « Garde le rythme » face à l'action de repos ; l'insight reste fluide
  (« … en hausse. Et n'oublie pas le socle invisible… »), pas de double espace.
- Non-régression : readiness ≥ 50 → « Garde le rythme » conservé ; pas de check-in du jour (readiness
  null) → conservé ; pilier non-sport → jamais touché.
- Nouveau test `adaptiveCoachFocus : reinforce × readiness plancher retire « Garde le rythme »`
  (3 branches : plancher / vert / sans check-in) + assertion « pas de double espace ».
- `xvfb-run -a npm run verify` : **530 tests + smoke 100 % verts**.

## Versionnage

Build **2.0.196** : bump `package.json` + entrée CHANGELOG (🩹, en tête) + les 2 assertions
`CHANGELOG[0].v` (logic.test.js + renderer-smoke.cjs `whatsNew`).

Domaine : coach
