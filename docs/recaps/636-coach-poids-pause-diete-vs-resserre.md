# #636 — Coach Poids : « resserre le déficit » ne contredit plus « prends une pause diète » (build 2.0.245)

**Domaine : nutrition.** Priorité de nuit = coaching adaptatif à fond (`docs/DEMANDES.md`, CAP 3.0 étape 1 ·
MANDAT COACHING ÉLITE, diététique du sport). Rotation §4 bis vérifiée **avant de coder**
(`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` → `alternance, athlete, athlete, coach, nutrition`) :
`alternance` et `athlete` **bloqués** (dans les 2 derniers / 2× sur 5) ; `coach` et `nutrition` **autorisés**
(1× sur 5, absents des 2 derniers). Domaine pris : **`nutrition`**, cohérent avec le précédent des correctifs
de la carte « Coach Poids » (#629/#632, conseils caloriques/déficit). Quota de propositions §4 bis.4 **non**
déclenché (propositions #619/#631 dans les 10 derniers recaps).

## Défaut prouvé (contradiction inter-surfaces, angle NEUF)

Sur la carte **Coach Poids** (onglet Athlète, `renderCoachWeight` — `src/app.js`), deux surfaces coach sont
concaténées dans le même `el.innerHTML` :

- **Bloc pause diète** (`#coachWeightBody`, IIFE `cw-dietbreak`) : quand `dietBreakRecommendation` renvoie
  `due:true` (≥ 10 sem. de déficit continu prouvé par la perte réelle + ≥ 1,5 kg perdus), il affiche
  « ⏸️ … Place une **PAUSE DIÈTE** : 1 à 2 semaines à ta maintenance (≈ +700 kcal/jour…) » (MATADOR/ICECAP/
  Trexler).
- **`realLine`** (bloc `chartBlock`, juste en dessous) : quand `paceStatus(plan.weeks, trend.weeksToTarget)
  === 'slow'` → « 📊 À ton rythme réel (… kg/sem) … — **plus lent que prévu : resserre un peu le déficit ou
  bouge plus** ».

**Contradiction, et dans le cas NOMINAL.** La pause diète se déclenche *précisément parce que la perte a
ralenti* (adaptation métabolique). Or une perte ralentie = `weightTrend.ratePerWeek` faible →
`weeksToTarget` grand → `paceStatus` renvoie **très souvent `'slow'`**. Les deux messages coexistent donc
dans leur scénario commun : l'un dit **coupe encore / bouge plus**, l'autre dit **remonte à la maintenance,
arrête de creuser**. Conseils nutritionnels frontalement opposés, côte à côte sur la même carte.

**Contre-exemple exécuté (§4 ter, état chargé, rendu réel dans le smoke)** : profil 79 kg → cible 75 kg,
13 pesées hebdo (84,4 → 79,0 kg) dont les 6 dernières quasi plates (plateau) :
- `dietBreakRecommendation` → `due:true` (12 sem., 5,4 kg perdus) → « … PAUSE DIÈTE … »
- `weightTrend` → `ratePerWeek −0,10`, `weeksToTarget 40`, `onTrack:true` → `paceStatus(≈7, 40)='slow'`
- realLine (AVANT) → « … — plus lent que prévu : **resserre un peu le déficit ou bouge plus** » → **les deux
  se contredisaient**.

Angle **neuf** : aucun correctif récent (#628→#635) ne relie la `realLine`/`paceStatus` à `dietBreak`.

## Correctif (curation §3, zéro champ)

Purement du rendu (`app.js`). Le calcul `dietBreakRecommendation` est **hissé une fois** avant `chartBlock`
(`dietBreak`/`dbDue`) et **partagé** par les deux surfaces (le bloc pause le réutilise au lieu de le
recalculer). Quand la pause est due, la `realLine` **ne pousse plus** à couper davantage — elle **défère** à
la pause affichée juste au-dessus :

- branche `'slow'` → « … — plus lent que prévu, **mais ne resserre pas le déficit : ta pause diète ci-dessus
  est la bonne réponse** » ;
- branche `onTrack===false` (plateau strictement plat) → « Ta tendance récente stagne — **c'est le signal de
  ta pause diète ci-dessus, pas de couper davantage.** » (même classe de contradiction, traitée pour la
  cohérence §4 ter).

**Hors pause** (déficit court, pas d'adaptation) le conseil de rythme d'origine est **inchangé** : resserrer
le déficit reste légitime. C'est un **recadrage ciblé**, pas un ajout — l'esprit §3.

## §4 ter — contrôle de cohérence

Résultat cumulé de la carte relu sur état chargé (pause due + plateau) : la pause diète apparaît, puis la
ligne « rythme réel » y renvoie explicitement — plus de « resserre le déficit » sous un « remonte à ta
maintenance ». Retrait d'une contradiction, pas une clause de plus.

## Vérification

`cd src && xvfb-run -a npm run verify` → **100 % vert** : 570 tests + smoke. Nouveau check **bloquant**
`coachDietBreakNoTighten` (rend la carte dans le scénario pause-due × `paceStatus` slow, exige que « PAUSE
DIÈTE » ET « rythme réel » soient rendus **sans** « resserre un peu le déficit »).

## Versionnage

Build **2.0.245** : bump `package.json`, entrée `CHANGELOG[0]` (⏸️), 2 assertions `CHANGELOG[0].v`
(logic.test.js + renderer-smoke.cjs `whatsNew`).

Domaine : nutrition
