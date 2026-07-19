# 546 — Coach : carte curée + « ＋ plus de contexte » (2.0.177)

## Le problème (retour d'Adrien : « fait une passe de cohérence »)

Le coach « Le focus du moment » a énormément gagné en finesse ces dernières
semaines : il lit maintenant le sommeil (durée, dette, régularité du coucher, pente),
la charge, la force, le kilométrage de course, la nutrition (protéines, eau,
fruits/légumes), l'équilibre poussée/tirage… Chaque angle ajoute, quand il est
pertinent, une clause à l'`insight`. Résultat : les **jours chargés**, la carte
pouvait afficher un **pavé de 3-4 phrases** (jusqu'à ~620 caractères observés) —
l'inverse d'un « focus » qui doit se saisir en un coup d'œil.

Contrainte : ces clauses sont chacune verrouillées par des tests (`assert.match(insight, …)`).
Tronquer l'`insight` dans la fonction pure casserait des dizaines de tests et,
surtout, ferait **perdre du contexte utile**. La bonne couche est donc le **rendu**.

## Ce qui change

- **Fonction pure inchangée** : `adaptiveCoachFocus` renvoie toujours l'`insight`
  complet. Rien n'est perdu, aucun test de garde-fou touché.
- **Découpe au rendu** — nouvelle `splitCoachInsight(text)` : si l'insight dépasse
  ~200 caractères, elle garde les **≤ 2 premières phrases** pour la carte (`primary`)
  et bascule le reste en `extra`. Court → tout reste sur la carte, pas de bouton.
- **Carte curée** : `.coach-insight` affiche `primary` suivi d'un discret « … »
  quand du contexte est replié. Le focus redevient **punchy**.
- **« ＋ plus de contexte »** : un bouton + un paragraphe placés **sous la carte**,
  hors du `<button>` `#coachFocus` (interactif-dans-interactif interdit → pas de
  bug d'accessibilité, la navigation au clic de la carte reste intacte). Un tap
  déplie/replie `extra` ; le label bascule « ＋ plus de contexte » ⇄ « − masquer »
  et `aria-expanded` suit. L'état d'ouverture est préservé entre deux rendus.

## Correctif de cohérence embarqué (#457-suite)

En auditant les clauses, un cas **auto-contradictoire** est ressorti : quand le
sommeil est jugé **solide** (« rythme régulier », `tone === 'ok'`) mais que le
coucher s'est **dispersé sur les 7 derniers jours**, la note de tendance de coucher
pouvait quand même s'ajouter → « rythme régulier » **et** « ton coucher se disperse »
dans la même phrase. Le bloc de tendance de coucher est désormais gardé par
`sleepIns.tone !== 'ok'`, exactement comme la note de tendance de durée. Verrouillé
par un test (sommeil solide + coucher récemment dispersé → aucune note « se disperse »).

## Vérifs

- **517 tests** node:test + **smoke** verts. Nouveau smoke bloquant `coachCuration`
  (contrat de `splitCoachInsight` : court/long ; bouton **non imbriqué** dans la carte).
- Nouveaux tests logique : cohérence sommeil-solide × coucher-dispersé.
- **Navigateur** : scénario sommeil chargé → carte = 1 phrase essentielle + « … »,
  bouton « ＋ plus de contexte » visible hors carte, contexte (« Et la pente s'enfonce… »)
  déplié/replié au clic, label + `aria-expanded` synchronisés.

## Fichiers

- `src/lib/logic.js` — CHANGELOG 2.0.177 ; garde `tone !== 'ok'` sur la tendance de coucher.
- `src/app.js` — `splitCoachInsight` + `renderCoachFocus` (curation) + handler du toggle.
- `src/index.html` — `#coachMoreBtn` + `#coachMore` sous `#coachFocus`.
- `src/calendar.css` — styles `.coach-more-btn` / `.coach-more`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs` — tests + assertions CHANGELOG.
