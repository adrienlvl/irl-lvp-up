# #644 — Coach nutrition : plus de coupe/cardio poussés un jour de fatigue (build 2.0.253)

## Contexte

Priorité de nuit = coaching adaptatif à fond (`docs/DEMANDES.md`, CAP 3.0 étape 1 · MANDAT COACHING
ÉLITE). Rotation §4 bis vérifiée **avant de coder** (5 derniers recaps par numéro :
`athlete (643), sommeil (642), focus (641), athlete (640), nutrition (639)`) : les 2 derniers
(`athlete`, `sommeil`) sont exclus, `athlete` apparaît 2× → exclu. **`coach`** est **0× sur 5** — le
domaine le plus frais, pleinement aligné avec la priorité de nuit. Angle NEUF exigé (la famille
insight↔action est close sur sport/focus/sommeil) → exploration ciblée en **rendu chargé** (§4 ter)
sur le pilier NUTRITION de `adaptiveCoachFocus`, jamais traité côté contradiction inter-notes.

## Défaut prouvé (contradiction inter-notes, angle NEUF)

Dans `adaptiveCoachFocus` (`logic.js`), quand le pilier est **nutrition** avec un objectif de **PERTE**
et une balance qui **stagne/dérive**, la note de pente poids appendait un **ordre actionnable** :
« … — vise ~1953 kcal/j (environ 125 de moins) **ou ajoute du cardio pour relancer**. » (variantes :
« baisse un peu tes calories ou ajoute du cardio », « resserre tes calories », « relance par le cardio »).
Cette note est gatée par la **tendance poids sur ~14 j** (`weightTrend`).

Juste après, `readinessNutriGuard` (gaté par la **readiness du JOUR** — un signal DIFFÉRENT) appendait :
« … ta forme est basse ce matin (readiness 40/100), et les jours de fatigue sont ceux où l'assiette
dérape le plus … **tenir l'essentiel compte le plus** : tes protéines, ton eau et des repas réguliers. »

Deux compteurs distincts (trend 14 j vs readiness du jour) → **co-occurrence possible** : le coach
**pousse un effort en plus** (couper les calories / ajouter du cardio) **puis** dit dans la même phrase
que **c'est le pire jour pour forcer**. Pousser une coupe ou du cardio un jour de readiness 40 (fatigue
+ courbatures au max) contredit frontalement le besoin de récup — exactement ce qu'un coach élite évite
(« un vrai coach ne blesse ni ne carence »). Distinct des familles déjà closes : ce n'est ni
insight↔action, ni inter-cartes (#634), ni intra-insight sport (#638) — c'est **inter-notes intra-pilier
nutrition**, chacune gardée par un signal de fenêtre différente (même classe de piège que #638).

**Contre-exemple exécuté (§4 ter, rendu réel)** — pilier nutrition, objectif perte, 6 dernières pesées
plates (plateau, `weightPace 0`), profil complet (→ cible chiffrée), check-in du jour `8/5/5` → readiness 40 :
> « … Mais la balance ne descend plus (0,01 kg/sem sur tes dernières pesées) — vise ~1953 kcal/j (environ
> 125 de moins) **ou ajoute du cardio pour relancer**. Un dernier repère pour aujourd'hui : ta forme est
> basse ce matin (readiness 40/100) … tenir l'essentiel compte le plus … »

## Correctif (curation §3, zéro champ ajouté)

`todayReadiness` calculée **une fois** (readiness du check-in daté d'aujourd'hui) et réutilisée par les
deux surfaces (source unique — `readinessNutriGuard` cesse de la relire). Dans la branche de pente poids,
**avant** le calcul de la cible calorique, nouveau gate — même geste que le cas recomposition déjà présent
(`tail = '.'`) :

```
} else if (todayReadiness != null && todayReadiness < 50 && wantGoal === 'perte') {
  tail = `.`;  // jour de fatigue + perte → on CONSTATE le plateau, sans pousser coupe/cardio
}
```

Résultat : un jour de fatigue, le coach **constate** le plateau (« la balance ne descend plus (0 kg/sem
sur tes dernières pesées). ») **sans** ordre de coupe/cardio, et la note « jour de fatigue » porte **seule**
la consigne du jour (protège protéines/eau/repas, ajuste une fois remis). **Réservé à la PERTE** : sur une
PRISE le push est « mange plus » — jamais contre-indiqué un jour de fatigue → conservé.

## §4 ter — contrôle de cohérence cumulé (rendu réel)

- **Fatigue + perte + plateau (corrigé)** : « … Mais la balance ne descend plus (0,01 kg/sem…). Un dernier
  repère pour aujourd'hui : ta forme est basse ce matin (readiness 40/100) … tenir l'essentiel … » → plus
  d'ordre de coupe/cardio, une seule voix cohérente.
- **Sans check-in du jour (préservé)** : le push chiffré reste (`calorieTarget = 1967`, « vise ~X kcal/j … »).
- **Forme du jour OK (readiness ≥ 50, préservé)** : push conservé.
- **PRISE + fatigue (préservé)** : « … pour relancer la prise » reste (le gate ne vise que la perte).

## Vérification

- `logic.test.js` : nouveau test dédié (`jour de fatigue → plateau constaté sans pousser coupe/cardio`) —
  4 volets : contradiction levée (push absent, `calorieTarget null`, note fatigue seule) + 3 non-régressions
  (pas de check-in, forme OK, objectif prise). **574 tests verts.**
- `renderer-smoke.cjs` : check **bloquant** `coachFocus` étendu — fatigue+plateau (push absent) + non-régression
  sans check-in (push chiffré présent). **Smoke OK** (`coachFocus: true`).
- Bump `2.0.252 → 2.0.253` + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`.

**Leçon** : sur le pilier nutrition aussi, deux notes gardées par des **fenêtres/signaux différents**
(tendance poids 14 j vs readiness du jour) peuvent se contredire en rendu chargé — pousser un ajustement
chronique un jour de fatigue aigu. Prochaine boucle coach = encore un autre angle NEUF.

Domaine : coach
