# 423 — Anniversaires : l'âge accordé au singulier (« 1 an », plus « 1 ans ») (2.0.57)

## Le manque (incohérence prouvée — §4.4 pluriels/accents, domaine frais)

L'âge d'un anniversaire est affiché à **trois** endroits. Un seul l'accordait correctement :

- `todayItems` (`logic.js:1132`, vue « Ma journée ») : `an${b.age > 1 ? 's' : ''}` → **correct**
  (« 1 an », « 2 ans ») ;
- **bandeau « 🎂 À venir »** (`app.js:469`, `renderUpcomingBirthdays`) : `(${b.age} ans)` →
  **toujours pluriel** ;
- **calendrier mensuel** (`app.js:474`, titre de la pastille) : `(${b.age} ans)` → **toujours pluriel**.

Conséquence user-facing : un **premier anniversaire** (âge 1 — le cas d'un enfant de proche, fréquent
dans un carnet d'anniversaires) s'affichait « (1 **ans**) » dans le bandeau et sur le calendrier —
faute d'accord en français —, alors que « Ma journée » écrivait déjà « (1 an) ». Domaine
Anniversaires/Agenda, jamais travaillé dans les dernières boucles.

## Le geste (un helper pur, réutilisé partout)

Nouvelle fonction pure `ageLabel(age)` (`logic.js`, juste après `upcomingBirthdays`) :

```js
function ageLabel(age) {
  const n = Number(age);
  if (age == null || !Number.isFinite(n)) return '';
  return `${n} an${n > 1 ? 's' : ''}`;
}
```

- singulier correct : `0` et `1` → « an » (règle française), `≥ 2` → « ans » ;
- âge inconnu (`null`/`undefined`/non chiffrable, ex. anniversaire **sans année de naissance**) →
  chaîne vide → l'appelant n'affiche alors aucune parenthèse (comme avant) ;
- tolère une chaîne numérique (`'3'` → « 3 ans »), jamais de « NaN an ».

Les **trois** points de rendu passent par ce helper (`todayItems` dans `logic.js`, les deux dans
`app.js`), avec le même garde `al ? ` (${al})` : ''`. Comportement **inchangé** dès 2 ans et pour un
âge masqué ; seul le cas âge 0/1 devient grammaticalement juste, et le calcul est désormais **DRY**
(une seule source de vérité pour l'accord).

## Tests & vérif

- Test pur `ageLabel` (`logic.test.js`, près des tests anniversaires) : `1 → '1 an'`, `0 → '0 an'`,
  `2 → '2 ans'`, `27 → '27 ans'`, `null`/`undefined`/`NaN`/`'abc'` → `''`, `'3' → '3 ans'`.
- Rendu (renderer) → **check smoke bloquant** `ageLabel` : `ageLabel(1)==='1 an'`,
  `ageLabel(2)==='2 ans'`, `ageLabel(0)==='0 an'`, `ageLabel(null)===''`, `ageLabel('x')===''`
  (prouve la fonction chargée et correcte dans le vrai renderer Electron), avec sa ligne
  `errors.push`.
- `cd src && xvfb-run -a npm run verify` → **435 tests + smoke 100 % verts** (`ageLabel:true`,
  `whatsNew` en 2.0.57, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.56 → 2.0.57** : effet utilisateur réel (accord correct au singulier) → entrée CHANGELOG
  (🎂) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
- Aucune Release, zéro dépendance, aucune donnée perso, aucune fonctionnalité retirée.

## Variété (§4)

Rupture avec la série de couverture de tests (#422 morningEnergyTrend, #420 habitConsistency) : polish
UX honnête (§4.4) dans le domaine **Anniversaires/Agenda**, après un micro-fix Pas de vie (#421). Le
manque a été repéré en comparant les trois formatages d'âge de l'app. Boucle #423.
