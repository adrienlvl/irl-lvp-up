# #558 — Coach : les conseils à deux phrases ne se déchirent plus (bloc soudé)

**Build 2.0.185** · domaine `coach` · demande de nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).
Fichiers : `src/lib/logic.js` (`orderCoachNotes`), `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`.

## Pourquoi cette itération est du `coach` (rotation §4 bis vérifiée)

`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` → `robustesse, etudes, tests, tests`.
`coach` n'apparaît **dans aucun** des 5 derniers recaps (ni dans les 2 derniers) → la rotation
l'autorise pleinement cette boucle. La priorité de nuit (DEMANDES.md) pointe vers le coaching
adaptatif ; §3 rappelle que la rotation prime même sur la demande de nuit — ici elle ne bloque pas.
Piste **prête et validée en local** depuis #557 (mémoire `coach-lead-ordercoachnotes-blocs-soudes`),
mise de côté ce jour-là par §5 (« répare le harnais d'abord, rien d'autre »).

## Le défaut réel (attrapé en NAVIGATEUR — §4ter)

`orderCoachNotes` hiérarchise les notes du coach par urgence (l'urgent remonte, l'anodin descend),
mais triait **phrase par phrase**. Or plusieurs guards tiennent sur **deux phrases** : un constat
**classé** suivi d'une conclusion **non classée**. Exemple réel, la note sommeil×sport (`logic.js`
l. ~6308) :

> « … tu dors 5,5 h en moyenne ces derniers jours (dette de 14 h sur 14 j), sous les 7 h — … dormir
> court plafonne les gains de chaque séance tout en augmentant le risque de blessure. **Bien dormir
> démultiplie l'effort que tu fournis déjà.** »

La 1ʳᵉ phrase matche le rang 2 (sommeil), la 2ᵉ (« Bien dormir démultiplie… ») ne matche **aucun**
palier → rang par défaut 4. Le tri les **séparait** : la prémisse remontait au rang 2, la conclusion
tombait **orpheline tout en bas**, loin de ce qu'elle explique — fil rompu dès qu'on dépliait « plus
de contexte ». Reproduit via un **rendu chargé** (insight sport cumulé : verdict + note kilométrage
rang 0 + note sommeil rang 2) : la conclusion sommeil arrivait en dernière position, après « Objectif
hebdo » et « Garde le rythme ».

## Le correctif (curation au rendu, rien d'ajouté)

Dans `orderCoachNotes`, une phrase **non classée hérite du rang de la dernière phrase classée qui la
précède** (le bloc reste soudé) ; le tri stable (`a.u` puis `a.i`) préserve l'ordre prémisse→conclusion
à l'intérieur du bloc :

```js
let blockRank = COACH_URGENCY_DEFAULT;
const rest = parts.slice(1).map((p, i) => {
  const own = coachNoteUrgency(p);
  if (own !== COACH_URGENCY_DEFAULT) blockRank = own;
  return { text: p.trim(), i, u: own === COACH_URGENCY_DEFAULT ? blockRank : own };
}).sort((a, b) => (a.u - b.u) || (a.i - b.i));
```

**Ni ajout ni retrait** de contenu — c'est purement l'**ordre d'affichage** qui redevient lisible
(exactement l'axe « améliorer la hiérarchisation / la curation au rendu » encouragé par §3, pas du
volume).

### Garde-fou anti-régression (le piège de la souature aveugle)

Souder aveuglément pourrait tirer une note **indépendante** non classée vers un rang trop haut. Ce
n'est pas le cas ici, et c'est **protégé par l'ordre d'assemblage** : les notes secondaires
(`insight += « Et surveille… »`) commencent par une phrase **classée** (elles portent le mot-clé
d'urgence) et leur conclusion suit ; les notes neutres du **cœur** (« Objectif hebdo : 2/4 »,
« Garde le rythme ») sont appendues **AVANT** les notes secondaires → `blockRank` vaut encore le
défaut quand on les rencontre → elles **restent** au rang 4, jamais tirées vers le haut. Le rendu
§4ter le confirme (conclusion sommeil soudée à sa prémisse ; « Objectif hebdo » toujours en bas) et
un test l'assure explicitement.

## Vérif

- Nouveau test logique `orderCoachNotes : une note à 2 phrases reste SOUDÉE` (assemblage réel :
  conclusion **immédiatement** après sa prémisse ; garde-fou « Objectif hebdo » reste en bas).
- Assertion **bloquante** ajoutée dans le check smoke `coachCuration` (mêmes invariants).
- Le test existant `coachNoteUrgency / orderCoachNotes` reste vert (inchangé).
- `cd src && xvfb-run -a npm run verify` → **523 tests + smoke, `coachCuration:true`, exit 0**.

## Suite possible (non fait ici)

Le **verdict** lui-même peut tenir sur 2 phrases (« 1 jour actif…, en hausse. Garde le rythme. ») ;
seule la 1ʳᵉ est épinglée en tête, la 2ᵉ (rang 4) descend en bas. Moins grave (encouragement
générique, et il reste sous les notes urgentes, ce qui est cohérent), non traité pour rester dans un
correctif net. À évaluer si Adrien le remarque.

Domaine : coach
