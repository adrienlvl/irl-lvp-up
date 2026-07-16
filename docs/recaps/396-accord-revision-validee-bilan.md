# 396 — Polish : « révision validée » au singulier dans les bilans partagés (2.0.36)

## Le manque (polish UX honnête §4.4 — « cohérence des pluriels/accents »)

Les textes **partageables** des bilans hebdo (`weeklySummaryText`, `logic.js:2083`) et mensuel
(`monthlyRecapText`, `logic.js:2143`) accordent tout le reste de leurs lignes avec la règle française
(`n > 1 ? 's' : ''`) : `séance${…}`, `candidature${…}`, `entretien${…}`, `jour${…} actif${…}`. Une
seule chaîne y échappait, avec « révisions validées » **codé en dur au pluriel** :

```js
`📚 ${n(s.studyDone)}/${n(s.studyPlanned)} révisions validées`
```

Conséquence : une semaine (ou un mois) où **une seule révision est planifiée** — cas réaliste : on
programme une seule session de révision dans son agenda — produit dans le texte exporté
« **0/1 révisions validées** » (ou « 1/1 révisions validées »), au lieu du singulier correct
(« 0/1 révision validée »). En français, 0 et 1 prennent le singulier, et le total ici est 1.

Le texte n'est pas seulement affiché : il part en **partage natif Web Share** (`shareableWeek` /
`shareableMonth`) — la coquille est donc visible à l'extérieur de l'app.

## Le geste (accord sur le total planifié, cohérent avec l'existant)

`src/lib/logic.js` — accord de `révision` **et** du participe `validée` sur `studyPlanned` (le total
de révisions dont parle la phrase « X sur Y révisions »), exactement comme les lignes voisines
accordent leur propre compte :

```js
`📚 ${n(s.studyDone)}/${n(s.studyPlanned)} révision${n(s.studyPlanned) > 1 ? 's' : ''} validée${n(s.studyPlanned) > 1 ? 's' : ''}`
```

Idem pour `monthlyRecapText` avec `r.studyPlanned`. Le pluriel (≥ 2 révisions planifiées) est
inchangé ; seul le cas `studyPlanned === 1` bascule du pluriel fautif au singulier correct.

## Tests

+0 nouveau `test(...)` mais 2 cas ajoutés dans les tests existants (les compteurs de tests restent
identiques, ce sont des assertions supplémentaires) :

- `weeklySummaryText : bilan partageable formaté` — `studyDone: 0, studyPlanned: 1` doit produire
  `0/1 révision validée` et **aucun** `révisions`/`validées` pluriel.
- `monthlyRecapText : texte partageable` — `studyDone: 1, studyPlanned: 1` doit produire
  `1/1 révision validée` sans pluriel.

Les deux cas échouaient avant le correctif (pluriel fautif), passent après — accord prouvé. Les
assertions plurielles existantes (`2/4 révisions validées`, `6/8 révisions validées`) restent vertes.

## Pourquoi pas de check smoke

Comme #394, #393 et #390 : correctif de **logique pure** (chaînes produites par des fonctions pures),
la machinerie de rendu (`app.js`) n'est pas touchée. Le manque est verrouillé au niveau des tests
unitaires des deux fonctions ; aucune nouvelle carte ni élément de rendu.

## Vérification

`xvfb-run -a npm run verify` : **429 tests + smoke** verts (`whatsNew` vert en 2.0.36, `SMOKE OK`).

## Contexte

**Bump 2.0.35 → 2.0.36** : effet utilisateur réel (texte partagé « 1 révision validée »), donc entrée
CHANGELOG (✍️) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`). Backlog autonome
**§4.4 (polish UX honnête — cohérence des pluriels/accents)**, sur une surface distincte de #394
(anniversaires / blocs de muscu) : ici les bilans hebdo/mensuel partagés. Note multi-sessions : la
2.0.35 (recherche agenda insensible aux accents, #395) a été poussée par une autre session pendant ce
run — `git pull --rebase` avant de commiter. Aucune Release, zéro dépendance, aucune donnée perso,
aucune feature retirée. Boucle #396.
