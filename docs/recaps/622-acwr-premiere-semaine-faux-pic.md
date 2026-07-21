# #622 — ACWR : la 1re semaine d'entraînement ne déclenche plus un faux « pic de charge » (build 2.0.232)

## Contexte / rotation

Priorité de nuit (`docs/DEMANDES.md`) = pousser le coaching à fond, **mais** §3 soumet le domaine
`coach` à la **rotation §4 bis** comme les autres. Contrôle avant de coder :

```
grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)
→ coach(621) · nutrition(620) · etudes(619) · robustesse(618?) · coach
```

→ **`coach` et `nutrition` sont les 2 derniers → bloqués** (`coach` est aussi 2× sur 5). Domaines
autorisés : `etudes`/`robustesse` (1× sur 5) + les frais. Le backlog **nommé** P1→P7 est
**entièrement coché** ; les propositions coaching restantes (#619 protéines, #610 base d'exercices) et
le Cap 3.0 (IDB/sync/sécurité) sont **gated** sur décision d'Adrien ou réservés au supervisé.

Reconnaissance avant de choisir, pour ne pas inventer :
- **a11y** (frais) : vérifié **propre** — tous les boutons icône-seuls (`×`, `✏️`, `🗑️`, `＋`) rendus
  par `app.js` ont déjà un `aria-label` ; les 5 pistes P2 sont cochées. Pas de manque → écarté.
- **alternance** (frais, priorité de vie n°1) : noyau `coachDayPriority`/`applicationStats`/focus
  **mesuré propre en #620** ; le seul angle restant (date d'entretien) **engage Adrien** (nouveau
  champ + UI) → hors autonomie.
- **athlète** (techniquement frais) : domaine **très saturé** (CHANGELOG 2.0.213→231 quasi tout
  athlète/coach/nutrition) + série coaching élite gated → j'évite d'y **ajouter** du contenu.

Angle retenu : **`robustesse`** — un défaut d'arithmétique **prouvé par lecture** dans une fonction
pure de charge d'entraînement (`acuteChronicRatio`), fixé sans ajouter de contenu coaching.

## Le défaut (prouvé, pas supposé)

`acuteChronicRatio` (`src/lib/logic.js:1598`) calcule l'ACWR (acute:chronic workload ratio, Gabbett) :

- **aiguë** = somme des charges des **7 derniers jours** (jours 0-6) ;
- **chronique** = **moyenne hebdo sur 28 jours** = `chronic28 / 4` ;
- `ratio = aiguë / chronique`, zone `<0,8` low · `0,8–1,5` optimal · `>1,5` high.

`chronic28` somme les jours 0-27, `acute` les jours 0-6 → `acute ⊆ chronic28`. Quand **toute** la
charge tient dans la fenêtre aiguë (aucune séance datée d'avant 7 j — typiquement la **1re semaine**
d'entraînement, zéro historique), on a `chronic28 === acute`, donc :

```
ratio = acute / (acute / 4) = 4,0   ← FIXÉ par l'arithmétique, pas par un vrai risque
```

Le ratio est **pinné à exactement 4,0 → zone `high`** quelles que soient les valeurs. Conséquence dans
les surfaces qui le consomment :

- `loadAdvice` (`logic.js:1624`) → `status: 'deload'`, « 🟥 Allège cette semaine — ta charge récente a
  bondi (**risque de blessure**), réduis de 30-40 %… » ;
- `weeklyInsights` → « 🟥 Charge en pic (ACWR 4) : prévois une semaine plus légère » ;
- `app.js:143` → « ⚠️ pic de charge — risque accru, allège cette semaine ».

**Failure scenario concret** : un débutant (ex. Adrien qui installe l'habitude) fait ses 3 premières
séances dans la semaine, rien avant → l'app lui répond **déload / risque de blessure dès la semaine 1**.
C'est faux (aucune base à comparer) et **démotivant** — l'exact opposé du mandat « un vrai coach ne
blesse ni ne décourage ».

Le test enshriné `logic.test.js` « pic → zone high » (état à `2026-07-09`+`2026-06-20`) est un
**vrai** pic à base faible (une séance 20 j avant → `chronic28 ≠ acute`) : légitime, **à préserver**.

## Le correctif (robustesse, zéro contenu ajouté)

Sans **aucune** charge hors de la fenêtre aiguë, il n'existe pas de base chronique distincte → l'ACWR
est **indéfini**. On renvoie `null` (même contrat que « pas de charge chronique »), ce qui fait
retomber les **6 consommateurs — tous déjà null-safe** (`if (acwr)` / `acwr && acwr.zone === …` /
`loadAdvice(null)` → défaut `'maintain'`) — sur un défaut neutre au lieu d'une fausse alerte.

```js
// avant
const chronic = chronic28 / 4;
if (!(chronic > 0)) return null;
// après
if (!(chronic28 > acute)) return null;   // une charge hors des 7 j requise (base chronique réelle)
const chronic = chronic28 / 4;
```

`chronic28 > acute` ⟺ charge > 0 sur les jours **7-27** ⟺ base chronique distincte. La condition
**subsume** l'ancien garde `chronic > 0` (`chronic28 > acute ≥ 0 ⟹ chronic28 > 0`). Une seule séance
datée d'avant la semaine ré-active le calcul → le pic à base faible reste détecté.

Tests enshrinés préservés (vérifié) : `steady` (base sur 3 sem. → optimal), `spike` (base 20 j →
high), `weeklyInsights` pic/sain → tous conservent une charge hors des 7 j. Empty/date invalide → null
comme avant.

## Contrôle §4 ter (surface utilisateur, état chargé)

Semaine 1, 3 séances (45 min, RPE 3), readiness 72 :
- **avant** : `#weekLoadAdvice` = « Charge progressive… · Aiguë/chronique 4 (⚠️ pic de charge — risque
  accru, allège) » **+** carte `#loadAdvice` = « 🟥 Allège cette semaine — risque de blessure » → deux
  signaux alarmistes, faux, contradictoires avec la réalité (le débutant n'a rien à alléger) ;
- **après** : `#weekLoadAdvice` = « Charge progressive : conserve une marge sur les séances dures. »
  (clause ACWR retirée) **+** `#loadAdvice` = « 🟨 Maintiens le cap — continue sur ta lancée… ».
  **Calme, cohérent, encourageant.** Rien d'ajouté à l'écran ; un faux signal en moins.

## Test ajouté

`acuteChronicRatio : 1re semaine … → null, pas de faux « pic »` : 3 séances toutes dans les 7 j →
`null` ; `loadAdvice(null, {score:72}).status !== 'deload'` ; +1 séance 12 j avant → ACWR **défini**
(non-régression du pic à base faible).

## Versionnage / verify

Bump **2.0.231 → 2.0.232** (effet utilisateur réel : suppression d'une fausse alerte) : `package.json`
+ entrée `CHANGELOG[0]` en tête de `logic.js` + les 2 assertions `CHANGELOG[0].v` (logic.test.js &
renderer-smoke.cjs `whatsNew`). `cd src && xvfb-run -a npm run verify` → **567 tests + smoke OK**, 100 %
vert. Aucune fonctionnalité retirée ; aucune dépendance ajoutée.

Domaine : robustesse
