# Proposition — Le flag « récupération fragile » traite un sommeil NON renseigné comme la pire nuit

_Écrite le 2026-07-21 (boucle #631). Domaine : athlete. Déclenchée par la **priorité de nuit**
(« coaching adaptatif à fond, conseils vraiment personnalisés à partir des données réelles ») croisée
avec le **mandat coaching élite** (§1 : un vrai coach ne se contredit pas d'une carte à l'autre)._

## 0. Pourquoi une proposition et pas du code cette itération

1. **Quota de propositions §4 bis.4** : la dernière proposition (#619) est **hors des 10 derniers
   recaps** (621-630 n'en contiennent aucune) → l'itération en cours doit cadrer un chantier, pas
   patcher.
2. Le manque est **réel et prouvé** (grep + lecture ci-dessous), mais le correctif propre est
   **transverse** : le flag est recalculé **inline à ~9 endroits** de `app.js`, avec **deux façons
   incohérentes de résoudre le check-in**, et il **change l'UX de plusieurs surfaces** (Athlète, Ultra,
   séance guidée). Corriger **un seul** site recréerait exactement le genre d'incohérence inter-surfaces
   que §4 ter interdit (cf. le raisonnement de la proposition #619). Le **périmètre** (fix minimal vs
   source unique de vérité) mérite d'être tranché avant de coder.

## 1. Le manque — un champ sommeil laissé VIDE déclenche « récupération basse »

Au check-in, un champ sommeil laissé vide est stocké comme **`sleep: 0`** :

```js
// app.js:804
$('#saveRecovery').onclick = () => { const sleep=Number($('#sleepInput').value)||0, … }
```

`readinessScore` **assume et documente** qu'un sommeil absent ne doit **pas** pénaliser :

```js
// logic.js:9580-9589
if (Number(r.sleep) > 0) { … score = min(1, sleep/8)*40 + fComp + sComp; }
else {
  // Sommeil NON renseigné (champ vide → 0) : on ne le compte PAS comme « 0 h » (la pire nuit)…
  // Une donnée absente ne pénalise plus.
  score = Math.round((fComp + sComp) / 60 * 100);
}
```

Mais le flag « récupération fragile / séance facile » recalculé **inline** dans `app.js` fait, partout,
un `sleep < 6` **sans garde `sleep > 0`** — donc `0 < 6` est **vrai** :

| Site | Surface rendue | Forme du flag |
| --- | --- | --- |
| `app.js:143` | Conseil de charge hebdo (`#weekLoadAdvice`, page Athlète) | `fragile = recovery && (recovery.sleep<6 \|\| fatigue>=4 \|\| soreness>=4)` |
| `app.js:427` | Conseil de récup (`#recoveryAdvice`) | `easy = latest.sleep<6 \|\| latest.fatigue>=4 \|\| latest.soreness>=4` |
| `app.js:490` | Séance guidée — cap « allège le prochain set » | idem `fragile` |
| `app.js:565` | **Cycle Ultra** (`#ultraDownhill`/plan) : `factors = fragile ? [.8,.9,.95,.65] : [1,1.08,1.15,.7]` | `fragile = r && (fatigue>=4 \|\| soreness>=4 \|\| r.sleep<6)` |
| `app.js:268, 325, 397, 444, 519` | Mission Control, compagnon d'entraînement, reco d'exercice, en-tête séance guidée, tendances perso | même motif `sleep<6` |

**Contradiction prouvée (état déclencheur concret).** Check-in du jour = `{sleep vide→0, fatigue:1,
soreness:1}` :

- `readinessScore` → `sleep` non `> 0` → `score = round((30+30)/60*100) = 100`, label **« Prêt à
  pousser »**, rendu sur la carte forme du jour (`#recoveryScore`, `app.js:426`).
- **Au même instant**, `fragile = (0 < 6) = true` → `#weekLoadAdvice` affiche **« Récupération basse :
  garde la prochaine séance facile »**, le **cycle Ultra entier est rabaissé** (`[.8,.9,.95,.65]` au lieu
  de `[1,1.08,1.15,.7]`, avec la mention « récupération fragile »), et la séance guidée passe en mode
  prudent.

Le coach affiche donc **« Prêt à pousser 100/100 » ET « récupération basse »** côte à côte, sur la même
page — parce que l'utilisateur a chiffré sa fatigue et ses courbatures **sans** remplir ses heures de
sommeil. C'est précisément le cas que `readinessScore` a été corrigé pour ne plus pénaliser.

## 2. Un second défaut, jumeau : le flag lit un check-in PÉRIMÉ sur certaines surfaces

La résolution du check-in n'est **pas la même** partout :

- `app.js:268` (Mission Control) et `app.js:325` (compagnon) font correctement
  `state.recovery.find(x => x.date === today) || state.recovery.at(-1)` — **le check-in du jour**.
- Les autres sites (`143`, `397`, `444`, `519`, `565`) prennent `state.recovery.at(-1)` — **le dernier
  check-in existant**, quelle que soit son ancienneté.

Conséquence : un check-in « fragile » vieux de 8 jours continue de piloter le conseil **du jour** (cycle
Ultra rabaissé, reco d'exercice « prudente ») alors qu'aucune donnée récente ne le justifie — et deux
surfaces voisines se contredisent selon la façon dont elles résolvent `recovery`.

## 3. Options

**A — Fix minimal, autonome.** Ajouter la garde `sleep > 0` au flag, **à chaque site** :
`(recovery.sleep > 0 && recovery.sleep < 6) || fatigue >= 4 || soreness >= 4`. Supprime la
contradiction sommeil-absent partout. **Ne touche pas** à la duplication ni à la résolution périmée
(§2 reste ouvert). Coût : ~9 éditions `app.js` + checks smoke. Risque faible ; comportement inchangé
dès que le sommeil **est** renseigné.

**B — Source unique de vérité _(recommandée)_.** Extraire un helper **pur** dans `logic.js`, p. ex.
`recoveryEase(recovery)` (même convention que `readinessScore` : sommeil absent **ignoré**), et
**un accesseur partagé** `todayRecovery(state, today)` (= check-in du jour, repli sur le dernier).
Les ~9 sites appellent ces deux fonctions au lieu de recalculer inline. **Zéro champ ajouté au coach**
(§4 ter respecté) ; le flag devient **testable** (node:test) au lieu d'être dupliqué et invisible aux
tests. Corrige §1 **et** §2 d'un coup. Coût : 1 helper + 1 accesseur testés + ~9 réécritures d'appel +
checks smoke bloquants. C'est un chantier **multi-commits** (façon P6 : B.1 helpers purs testés →
B.2 branchement + smoke), réalisable en **étapes autonomes** une fois le périmètre validé.

**C — Aligner sur `readinessScore` directement.** Remplacer le seuil ad hoc par le **label** de
`readinessScore` (`score < 50` = fragile). Le plus cohérent sémantiquement (une seule échelle de
forme), mais **change les seuils** de déclenchement sur **toutes** les surfaces (un `fatigue 4 +
soreness 1 + 8 h` ne bascule plus pareil) → décalage d'UX plus large et plus de risque de régression
visible. À réserver si tu veux **une** notion de forme partout, quitte à revalider chaque surface.

## 4. Recommandation

**Option B.** Elle éteint la contradiction prouvée (§1) **et** la résolution périmée (§2) sans changer
le comportement quand le sommeil est renseigné, transforme un flag dupliqué 9 fois et non testé en une
fonction pure testée (dette technique en moins), et respecte §4 ter (aucun nouveau champ, pure
curation). Le fix minimal **A** peut servir de **B.1 dégradé** si tu veux d'abord le correctif sûr et
remettre l'unification à plus tard. **C** n'est justifié que si tu veux volontairement UNE échelle de
forme unique partout.

## 5. Risques

- **Multi-sites** : ~9 surfaces de rendu touchées → chaque bascule doit être couverte par un check
  smoke **bloquant** (le smoke est le seul filet sur `app.js`).
- **Changement d'UX visible** : dès le fix, les surfaces **cessent** de crier « récupération basse » sur
  un check-in sans heures de sommeil. C'est l'effet voulu, mais c'est un changement de comportement
  observable → contrôle §4 ter (rendre le résultat cumulé, le relire) obligatoire.
- **Cycle Ultra** (`app.js:565`) : le passage `[.8,.9,.95,.65] → [1,1.08,1.15,.7]` change les volumes
  affichés du plan quand seul le sommeil manquait — vérifier que le plan reste cohérent.
- Aucun risque données/persistance/boot : purement du rendu + une fonction pure.

## 6. Ce qui dépend d'Adrien

1. **Périmètre** : A (fix minimal) · **B (source unique, reco)** · C (tout sur `readinessScore`).
2. **Faut-il aussi corriger la résolution périmée (§2)** — passer partout au check-in **du jour** ?
   (Inclus dans B ; optionnel avec A.)
3. **Réalisation** : en **étapes autonomes** (façon P6, une par tour, rotation respectée) dès ton feu
   vert sur le périmètre — ou en passe supervisée ?
4. **Comportement voulu quand le sommeil est absent** : confirmer qu'un check-in « fatigue/courbatures
   chiffrées, sommeil vide » doit être traité **comme `readinessScore`** (sommeil ignoré, pas de
   pénalité) — c'est l'hypothèse de la reco.
