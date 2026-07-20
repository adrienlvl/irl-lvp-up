# Proposition — « Base d'exercices plus complète » : le verrou est graphique, pas logique

> **Statut : design — en attente d'une décision d'Adrien** (voir la fin du document).
> Écrit par la boucle autonome #610 (2026-07-20). **Aucun code n'est modifié** par cette proposition ;
> c'est un document de cadrage au sens de VPS-AUTOPILOT §4 (« gros chantier = proposition, pas
> implémentation »). Le code exploré pendant l'analyse a été **intégralement reverté** avant d'écrire.

## Pourquoi ce document

La **SÉRIE COACHING ÉLITE** (ROADMAP « 🌙 DÉMARRAGE VPS ») liste comme **dernier** travail non fini :

> - [ ] **Base d'exercices plus complète** (niveau Garmin/Strava/Apple Fitness) : plus d'exercices,
>   cues d'exécution plus riches, variantes par matériel. **Data pure + tests.**

Cette formulation — « **Data pure + tests** » — est **inexacte**, et c'est le cœur de cette proposition.
J'ai commencé à l'implémenter (ajout de 5 mouvements comblant de vrais trous : adducteurs, portage
unilatéral, mollets unilatéraux, hip thrust lourd, bas des abdos), avec zones + motifs d'illustration
+ tests + smoke. **Le verify a échoué** — non sur ma logique, mais sur **deux invariants de la
bibliothèque** que je n'avais pas vus, et qui changent la nature de la tâche.

## Le verrou, prouvé dans le code

La bibliothèque tient à **exactement 47 exercices** depuis longtemps. Ce n'est pas un hasard : deux
tests de `src/test/icons.test.js` **exigent que CHAQUE exercice ait une vraie illustration** :

```js
// icons.test.js:59
assert.ok(exercises.every(e => /sheet-[1-8] art-p[0-5]/.test(exercisePicture(e.name))),
          'tous les exercices ont une photo');
// icons.test.js:85
assert.ok(exercises.every(e => EXERCISE_ANIM[e.name]), 'tous les exercices ont une animation');
```

- `EXERCISE_ART` (sheets **1-8**) mappe chaque exercice à une **case d'une planche PNG**
  (`assets/exercise-illustrations-v1..5.png` + planches trail-hybride) : une **vraie photo** d'humain.
- `EXERCISE_ANIM` (sheets **9-24**) mappe chaque exercice à **2 cases** d'une planche d'animation
  (position A ↔ position B) pour la mini-démo animée en vue détail.

Autrement dit : **ajouter un exercice, c'est d'abord produire ~3 cellules d'illustration** (au moins
une photo fixe, idéalement 2 cases d'animation) sur les sprite-sheets. Ces cellules sont des **images
matricielles (PNG)** — un **asset graphique**, pas de la donnée. La boucle autonome **ne peut pas les
produire** (je n'ai ni outil de dessin/rendu d'humain, ni moyen de vérifier visuellement le résultat).

Le repli existe (`exerciseIcon` → figure SVG « bonhomme animé » quand aucune photo, `icons.test.js:45`
l'accepte comme « rend quelque chose »), **mais** les deux `every(...)` ci-dessus l'**interdisent
pour la bibliothèque** : un jalon volontaire de la session locale acte « désormais les 47 exercices
ont une **vraie photo** : plus aucun ne retombe sur la figure SVG » (`icons.test.js:58`).

**Conclusion factuelle** : « Base d'exercices plus complète » n'est **pas** une tâche « data pure ».
C'est un chantier qui **engage un asset visuel** (donc Adrien), OU une **décision de niveau de qualité**
(accepter des cartes sans photo). Les deux sortent du périmètre autonome (VPS-AUTOPILOT §5 : « le choix
engage Adrien → proposition puis stop »).

## Ce qui, lui, est déjà complet (pour éviter une fausse piste future)

Vérifié pendant l'analyse — **rien à faire** de ce côté, la maturité est réelle :

- **Bibliothèque ↔ zones** : 47 exercices = 47 clés `EXERCISE_ZONES`, 1 pour 1, **zéro** trou
  (`logic.test.js` « objectifs par zone » le verrouille déjà).
- **Bibliothèque ↔ illustration** : 47 exercices = motif + photo + animation, **zéro** trou
  (`icons.test.js` tests 1, 5, 6).
- **Fiches riches** : chaque exercice a déjà `cue` + `explain` + `goal` + `avoid` + prescription,
  vérifié par `icons.test.js` test « notes de coaching complètes ». Les cues sont **déjà** de bon niveau.

Donc les deux autres axes de la formulation — « **cues plus riches** » et « **variantes par matériel** »
— sont **déjà couverts** pour les 47 mouvements existants. Le seul axe réellement ouvert est « **plus
d'exercices** », et c'est précisément celui qui bute sur l'asset graphique.

## Options

### Option A — Garder l'invariant « toujours une vraie photo ». Adrien fournit les planches. *(le plus fidèle)*
La boucle autonome **ne peut pas** faire grossir la bibliothèque seule. Le travail se découpe :
1. Adrien (ou un designer) fournit une **nouvelle planche PNG** (6 cases) de photos d'exercices +,
   idéalement, sa planche d'animation (A/B). Format connu : cf. `assets/` + CSS `.sheet-<n>`.
2. **Alors** une boucle autonome ajoute les entrées data (bibliothèque + zones + `EXERCISE_ART` +
   `EXERCISE_ANIM` + `EXERCISE_PATTERN`) + tests + smoke, en une itération sûre par planche.
- ✅ Zéro régression visuelle, cohérence parfaite avec l'existant.
- ❌ Bloqué sur une livraison d'Adrien ; le VPS ne peut pas avancer cette brique tout seul.

### Option B — Autoriser un « **2ᵉ rang** » d'exercices illustrés en **figure SVG animée** (sans photo). *(débloque l'autonomie)*
On **assouplit** les deux `every(...)` : la bibliothèque garde ses 47 photos, mais les exercices
**nouvellement ajoutés** peuvent s'appuyer sur la **figure SVG** déjà existante (`EXERCISE_PATTERN`),
qui s'anime elle aussi (A↔B, flèche de mouvement). Les tests deviennent : « les 47 historiques ont une
photo » **et** « tout exercice a **soit** une photo **soit** une figure SVG mappée » (déjà le cas via
`EXERCISE_PATTERN`).
- ✅ Débloque complètement l'ajout autonome (les motifs SVG couvrent squat/hinge/push/pull/carry/calf/
  plank/coredyn/…) → la boucle peut ajouter des dizaines de mouvements gap-fillers, avec cues élite,
  sourcés, testés.
- ⚠️ **Incohérence visuelle** : dans la même grille, des cartes « photo » et des cartes « bonhomme
  SVG » cohabiteraient. À trancher : est-ce acceptable (beaucoup d'apps mélangent), ou est-ce un recul
  par rapport au jalon « 100 % photo » ?
- 🔧 Atténuation possible : réserver les nouveaux SVG à une **famille visuellement séparée** (ex. les
  cartes SVG regroupées, ou un petit badge « schéma ») pour que le mélange soit lisible et assumé.

### Option C — Ne rien changer : clore la brique « telle quelle ». *(l'honnête minimal)*
Acter que les 47 exercices + fiches riches + illustrations + zones **suffisent** au périmètre voulu, et
**cocher** l'item de la série coaching comme « livré au niveau atteignable en autonomie ». La série
coaching passe alors entièrement en ✅ et la boucle **reprend la rotation normale** (ROADMAP).
- ✅ Pas de dette, pas de faux chantier qui traîne.
- ❌ On renonce à « plus d'exercices » — mais c'est un renoncement **assumé et documenté**, pas un oubli.

## Recommandation

**C maintenant, A quand une planche arrive.** La bibliothèque est déjà riche (47 mouvements couvrant
les 7 zones, chacun avec fiche complète + photo + animation) ; le retour marginal d'un 48ᵉ exercice est
**faible** au regard du coût (un asset graphique). Je recommande donc de **clore la brique en C** pour
libérer la rotation, **et** de garder **A** comme voie d'expansion propre le jour où Adrien veut ajouter
des mouvements précis (il fournit la planche, le VPS branche la data en une itération sûre).

**B seulement si Adrien tient à faire grossir la bibliothèque sans produire d'assets** : c'est le seul
chemin 100 % autonome, mais il coûte la cohérence visuelle « tout photo ». À ne choisir que si le volume
d'exercices prime sur l'uniformité du rendu.

> Note de méthode : ceci illustre exactement VPS-AUTOPILOT §4 ter (« vert ≠ bon ») **à l'envers** — ici
> un invariant vert (`icons.test.js`) a **correctement** empêché un ajout qui aurait dégradé la
> cohérence visuelle sans qu'aucun test « métier » ne s'en plaigne. Le garde-fou a joué son rôle.

## Décisions qui t'attendent, Adrien

1. **Périmètre** : **A** (tu fournis des planches, le VPS branche la data), **B** (autoriser des
   exercices en figure SVG animée, sans photo, pour débloquer l'ajout autonome), ou **C** (clore la
   brique : 47 exercices suffisent, la série coaching passe en ✅ et la rotation reprend) ?
2. **Si A** : veux-tu piloter **quels** mouvements ajouter (liste précise) ou me laisser proposer une
   liste de gap-fillers (adducteurs, portage unilatéral, mollets 1 jambe, hip thrust, bas des abdos, …)
   à illustrer ?
3. **Si B** : mélange photo + SVG **assumé tel quel**, ou faut-il un marquage visuel (badge/regroupement)
   pour que la différence soit lisible ?
4. **Si C** : je coche l'item et j'écris le recap de clôture de la série coaching — confirme.
