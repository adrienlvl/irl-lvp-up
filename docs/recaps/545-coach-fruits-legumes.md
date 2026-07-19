# 545 — Coaching : le coach regarde enfin tes FRUITS & LÉGUMES (fruitGuard)

**Build 2.0.176 · boucle #545 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) lit la nutrition sous plusieurs
angles — cible et série protéines, pente d'adhérence protéines (`proteinTrend`), pente d'hydratation
(`hydrationTrend`), résultat corporel (`weightGoalPct`/`weightPace`), garde-fous sommeil/readiness.
Mais **un champ du journal nutrition n'était lu par PERSONNE** : `nutrition[].fruit` (la case
« fruit/légume » du jour).

Ce champ existe (saisi au journal, exporté au CSV `nutritionCsv`, il fait même partie du signal
d'« activité » du pilier nutrition), et pourtant il ne vivait que dans l'action **générique**
« verrouille l'eau et un fruit/légume » — jamais dans un vrai diagnostic. Or c'est le
**micronutriment** (fibres, vitamines, antioxydants) : le levier de récup, de digestion et
d'immunité, orthogonal au macro (protéines) et à l'hydratation (eau). Un athlète peut nailer ses
protéines et son eau chaque jour et pourtant ne jamais cocher un fruit — trou invisible aux deux
notes voisines.

## Ce qui est livré

Nouveau champ **`fruitGuard`** (`{ fruitDays, trackedDays }` ou `null`, **toujours** renvoyé). Quand
le pilier poussé est la nutrition, qu'Adrien **suit vraiment** son journal (≥ 8 jours des 14 derniers
où protéines OU eau sont saisies) mais **néglige** la case fruit/légume (≤ ⅓ des jours suivis), le
coach **nomme** le manque, note **appendue** à l'insight :

- **zéro** : « Côté fruits et légumes en revanche, zéro sur tes 10 jours suivis ces deux dernières
  semaines — tu gères tes protéines et ton eau, mais les fibres, vitamines et antioxydants (récup,
  digestion, immunité) manquent totalement à l'appel. Glisse un fruit ou une portion de légumes à un
  repas aujourd'hui, c'est le maillon le plus vite comblé. »
- **peu** : « … seulement 2 jours sur tes 10 jours suivis… Coche la case fruit/légume aujourd'hui :
  une portion à un repas et le maillon se comble. »

## Garde-fous & honnêteté

- **Vrai suivi requis.** `trackedDays >= 8` sur 14 j (jours où protéines OU eau sont saisies) : sans
  ce plancher, `fruit` à `false` voudrait juste dire « pas noté » (bruit), pas un manque réel de
  micronutriments. (Testé : 6 jours suivis → `null`.)
- **Habitude correcte = silence.** `fruitDays <= ⌊trackedDays/3⌋` : au-dessus, l'habitude est déjà
  acceptable, rien à corriger. (Testé : 5/10 → `null`.)
- **Subordonné aux DEUX pentes d'intrant.** N'entre **que** si `proteinTrend == null` **et**
  `hydrationTrend == null` : une seule note d'intrant à la fois, priorisation **protéines > eau >
  fruits/légumes** (le micronutriment en dernier, exactement le motif du relais hydratation #501).
  (Testé : eau qui grimpe → `hydrationTrend` parle, `fruitGuard` muet.)
- **Marche sans profil.** Le fruit ne dépend d'aucune cible calculée (comme l'hydratation) → la note
  fonctionne même sans `s.profile`.
- **Affine, ne remplace pas.** Note **appendue** à l'insight ; l'action du jour reste intacte.
- **Vocabulaire distinct** (« fruits et légumes », « fibres, vitamines et antioxydants », « le maillon
  le plus vite comblé », « coche la case fruit/légume ») → zéro collision avec les notes protéines
  (« cible protéines », « la régularité prime »), hydratation (« à tes 8 verres ») ou résultat poids
  (« objectif de perte/prise »).
- **Zéro nouvelle fonction.** Réemploi de `daysHittingTarget` (`Number(true) = 1` → compte les jours
  fruit) et `dateAfterDays` ; comptage des jours suivis en inline.

## Vérification

- Tests `logic.test.js` (nouveau bloc) : 10 jours suivis via protéines, zéro fruit →
  `fruitGuard === { fruitDays: 0, trackedDays: 10 }` + note « zéro sur tes 10 jours suivis » et
  « fibres, vitamines et antioxydants ». Cas 2/10 → « seulement 2 jours ». Exclusions : habitude 5/10,
  suivi maigre (6 j), subordination à `hydrationTrend`, hors pilier nutrition → tous `null`.
- Check smoke **bloquant** `coachFocus` étendu (`fFruit` : 10 j suivis, zéro fruit → `fruitDays: 0`,
  `trackedDays: 10`, « Côté fruits et légumes en revanche, zéro sur tes 10 jours suivis » ; habitude
  5/10 → `fruitGuard === null`).
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (517 tests node, SMOKE OK).

## Suite possible

- Le fruit pourrait se relier à une **série** (comme la série protéines) pour gamifier le
  micronutriment — mais le champ étant booléen (pas une cible chiffrée), la valeur d'une série
  « fruit » est plus faible et le risque de sur-nag réel.
- `trainingByWeekday` (jour d'entraînement dominant) reste le seul gros signal encore inexploité par
  le coach côté sport — ancrage d'habitude, valeur actionnable modérée.
</content>
</invoke>
