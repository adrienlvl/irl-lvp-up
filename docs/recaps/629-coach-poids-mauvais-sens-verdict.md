# #629 — Coach Poids : « stagne » ne ment plus quand le poids part dans le mauvais sens (2.0.239)

## Contexte / choix du domaine

Priorité de nuit = **coaching à fond** (DEMANDES.md). Mais `coach` est **bloqué par la rotation
§4 bis** (recaps 627 & 624 : dans les 2 derniers ET 2× sur 5) et `sommeil` bloqué (628, dernier).
Domaines coaching-adjacents encore autorisés servant le **MANDAT COACHING ÉLITE** (diététique du
sport) : `athlete` (626, 1×) et **`nutrition`** (625, 1×, absent des 2 derniers). Domaine pris :
**`nutrition`**. Quota de propositions §4 bis.4 satisfait (#619 dans les 10 derniers recaps).

Méthode P5 (mesurer/prouver par exécution) : défaut trouvé par rejeu réel de `calorieAdjustment`.

## Défaut prouvé (contradiction verdict ↔ chiffres)

`calorieAdjustment` (`logic.js:8698`) juge la stagnation du poids sur ~14 j et propose un ajustement
calorique, rendu sur la carte **« Coach Poids »** (`app.js:383`, `renderCoachWeight`).

Les deux branches utilisaient le mot **« stagne » codé en dur** alors que leur condition capture
DEUX cas distincts :

- `goal === 'perte' && ratePerWeek >= -0.1` : vrai plateau (rythme ~plat) **ET** poids qui **remonte**
  (`ratePerWeek > 0`).
- `goal === 'prise' && ratePerWeek <= 0.1` : vrai plateau **ET** poids qui **recule** (`ratePerWeek < 0`).

Scénario réel (exécuté) — objectif `perte`, cible 2000, pesées qui montent
`[{07-01:70},{07-08:70.5},{07-16:70.7}]` → `ratePerWeek = 0.33`, sortie :

> « Ton poids **stagne** (**+0,33 kg/sem** sur 15 j). Baisse d'environ 125 kcal/jour… »

Le verdict « stagne » **nie le +0,33 kg/sem** qu'il imprime lui-même : prendre du poids en pleine
sèche n'est pas un plateau, c'est *aller dans le mauvais sens* (plus embêtant qu'un plateau).
Symétrique pour `prise` (poids qui recule dit « Ta prise stagne (-0,33 kg/sem) »). Même famille de
contradictions verdict↔chiffres que #628 (effet du coucher), #627 & #623 (sommeil), jamais traitée
sur cette carte.

## Correctif (curation §3, zéro champ ajouté)

Seul le **verdict** (le champ `message`) change ; `stagnating`, `suggestion`, `delta`, `newTarget`,
`ratePerWeek` **inchangés**, ainsi que le conseil (baisse kcal / cardio / plancher). On distingue au
seuil déjà en place :

- **perte** : `ratePerWeek > 0.1` → « Ton poids **repart à la hausse** (…) alors que tu vises la
  perte. » ; sinon → « Ton poids **stagne** (…). » (plateau, inchangé).
- **prise** : `ratePerWeek < -0.1` → « Ton poids **recule** (…) alors que tu vises la prise. » ;
  sinon → « Ta prise **stagne** (…). ».

Le micro-écart (|rate| ≤ 0,1 kg/sem, bruit de mesure) reste « stagne » : honnête aussi.

## Ripple coach : NUL (vérifié)

`adaptiveCoachFocus` (`logic.js:6336-6349`) consomme `calorieAdjustment` mais lit **uniquement**
`adj.stagnating`/`adj.newTarget`/`adj.delta` — **jamais `adj.message`** — et reformule lui-même la
direction via `wt.direction` (« repartent à la hausse »). Aucun autre consommateur de `.message`.
Défaut isolé à la carte « Coach Poids » → domaine `nutrition` pur, hors coach adaptatif.

## §4 ter — contrôle de cohérence

Verdict rendu sur 7 états chargés (plateau, remonte, remonte près du plancher, progresse, prise
plateau, prise recule, micro-gain) et relu en entier : plus aucune contradiction, la carte cumulée
(⚖️ … **Nouvelle cible : 1875 kcal/j**) colle aux chiffres.

## Vérification

`cd src && xvfb-run -a npm run verify` → **100 % vert** (build 2.0.239).
- Test `calorieAdjustment` étendu : cas « remonte » (perte) et « recule » (prise) → verdict correct,
  `stagnating`/chiffres inchangés, `doesNotMatch(/stagne/)`.
- Check smoke **bloquant** `calorieFloor` étendu (poussé dans `errors`) : vérifie que le cas « remonte »
  dit « repart à la hausse » et jamais « stagne », et que le plateau normal dit toujours « stagne ».

Bump 2.0.238 → **2.0.239** (package.json + CHANGELOG en tête + 2 assertions `CHANGELOG[0].v`).

Domaine : nutrition
