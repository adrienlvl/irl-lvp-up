# #610 — Proposition : « Base d'exercices plus complète » — le verrou est graphique, pas logique

**Domaine : athlete** (dernier item de la SÉRIE COACHING — exception de rotation assumée `athlete`,
VPS-AUTOPILOT §1 + ROADMAP « 🌙 DÉMARRAGE VPS »). **Docs seuls, pas de bump, pas de verify** (aucun
code modifié : l'exploration a été intégralement revertée avant d'écrire).

## Le contexte

La série coaching élite n'a plus qu'**un** item non fini : **« Base d'exercices plus complète » —
plus d'exercices, cues plus riches, variantes par matériel. Data pure + tests.** La priorité de nuit
d'Adrien (« coaching à fond ») + le mandat coaching élite (§1) pointent dessus. Rotation : `coach` et
`athlete` sont dans les 2 derniers recaps, mais la **série coaching** a une exception de rotation
**explicite** sur `athlete`/`nutrition` (VPS-AUTOPILOT §1) — donc autorisé pour finir la série.

## Ce que j'ai vérifié (grep + lecture + implémentation avortée)

D'abord, les **fausses pistes écartées** (la bibliothèque est déjà mûre) :

- **Bibliothèque ↔ zones** : 47 exercices = 47 clés `EXERCISE_ZONES`, 1 pour 1, **zéro trou**
  (`grep name:` en donnait 60 à tort : il comptait les échauffements et titres de fiches).
- **Bibliothèque ↔ illustration** : chaque exercice a un motif `EXERCISE_PATTERN`, une photo
  `EXERCISE_ART` et une animation `EXERCISE_ANIM` — **zéro trou**.
- **Fiches** : `cue`/`explain`/`goal`/`avoid` + prescription **déjà** présents et de bon niveau pour
  les 47 (verrouillé par `icons.test.js` « notes de coaching complètes »). Donc « **cues plus riches** »
  et « **variantes par matériel** » sont **déjà couverts** — le seul axe ouvert est « **plus d'exos** ».

## Le blocage (prouvé)

J'ai implémenté 5 mouvements comblant de vrais manques (adducteurs = planche copenhague ; portage
unilatéral = marche valise ; mollets 1 jambe ; hip thrust lourd ; bas des abdos = relevés de jambes),
avec zones + motifs + tests + smoke. **Le verify a échoué** sur `icons.test.js` :

```js
assert.ok(exercises.every(e => /sheet-[1-8] art-p[0-5]/.test(exercisePicture(e.name))), 'tous les exercices ont une photo');  // :59
assert.ok(exercises.every(e => EXERCISE_ANIM[e.name]), 'tous les exercices ont une animation');                              // :85
```

La bibliothèque tient à **47 exactement** parce qu'un jalon volontaire impose que **chaque** exercice
ait une **vraie photo** (sprite-sheet PNG) **et** une animation. Ajouter un exercice = **produire ~3
cellules d'illustration matricielle** — un **asset graphique**, pas de la donnée. La boucle autonome
**ne peut pas** les produire ni vérifier visuellement. La formulation « Data pure + tests » de la
roadmap est donc **inexacte** : c'est un chantier qui **engage un asset visuel (donc Adrien)** OU une
**décision de niveau de qualité** (accepter des cartes sans photo). VPS-AUTOPILOT §5 → **proposition + stop**.

Note : c'est le §4 ter « vert ≠ bon » **à l'envers** — un invariant vert a **correctement** empêché un
ajout qui aurait cassé la cohérence visuelle « tout photo » sans qu'aucun test métier ne bronche.

## Livré

`docs/proposals/base-exercices-plus-complete.md` — problème (verrou graphique), 3 options
(**A** Adrien fournit les planches · **B** autoriser un 2ᵉ rang en figure SVG animée, sans photo, pour
débloquer l'autonomie · **C** clore : 47 suffisent, la série coaching passe en ✅ et la rotation reprend),
reco **C maintenant / A à la demande**, **4 décisions** pour Adrien. Code **intégralement reverté**,
working tree propre. Tests inchangés (état committé, déjà vert).

Domaine : athlete
