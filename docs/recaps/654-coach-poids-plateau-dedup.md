# #654 — Coach Poids : plus de double message sur un plateau (build 2.0.262)

## Contexte
Priorité de nuit = coaching (DEMANDES.md). Rotation §4 bis — 5 derniers domaines
(`focus, athlete, coach, sommeil, athlete`) → `focus`/`athlete` exclus (2 derniers),
`athlete` exclu (2×). Disponibles côté coaching : **`nutrition` (0×)**, `sommeil` (1×),
`coach` (1×). **`nutrition`** pris : le plus frais, cadre avec la priorité de nuit,
angle NEUF (exploration agent Explore sur les surfaces nutrition/poids).

## Manque prouvé (redondance §3, rendu chargé §4 ter)
Sur la carte « Coach Poids » (`renderCoachWeight`, `app.js`), un **plateau** (objectif
perte, poids plat ≥ 14 j, cible non atteinte, **pas** de pause diète due) déclenche
**deux notes au même message** :

- **`cw-adjust`** (`app.js:383`, via `calorieAdjustment`, `logic.js:8859`) :
  « ⚖️ Ton poids stagne (+0 kg/sem sur 16 j). Baisse d'environ 125 kcal/jour ou ajoute
  du cardio pour relancer la perte. **Nouvelle cible : 1875 kcal/j.** » — **avec le chiffre**.
- **`realLine` off-track générique** (`app.js:372`, via `weightTrend.onTrack===false`,
  `logic.js:8913`) : « 📊 Ta tendance récente ne va pas encore vers la cible — ajuste
  calories/activité pour t'aligner sur le plan. » — **sans chiffre**.

Les deux viennent de calculs indépendants (rythme sur les 6 dernières pesées vs fenêtre
datée de 14 j) rendus côte à côte **sans arbitrage**. Sur tout plateau ils se déclenchent
tous les deux : `weightTrend` → `ratePerWeek≈0` → `|rate|<0,05` + cible non atteinte →
`onTrack=false` ; `calorieAdjustment` → `rate≥−0,1` → `stagnating=true`. La `realLine`
générique est **entièrement subsumée** par `cw-adjust` (qui porte le même conseil **plus**
le nombre concret + « Nouvelle cible »).

## Correctif (curation au rendu §3, zéro champ ajouté)
- `adj`/`adjShown` calculés **une seule fois** juste après `dbDue` (`app.js:372`),
  puis réutilisés par le bloc `cw-adjust` (au lieu de recalculer `calorieAdjustment`).
- La branche `realLine` off-track **générique** (non-`dbDue`) se tait quand `adjShown` :
  `else if(!adjShown) realLine = '…ne va pas encore vers la cible…'`. Le bloc `cw-adjust`
  porte alors seul le message.
- **Non-régression préservée** : la variante `dbDue` de la `realLine` (« c'est le signal
  de ta pause diète ci-dessus ») est **intacte** ; quand `adjShown` est faux (données trop
  courtes < 14 j / < 3 pesées, objectif « maintien »), la `realLine` générique **reste**
  comme filet ; la branche `onTrack===true` (« À ton rythme réel : cible ~date ») n'est
  pas touchée.

## §4 ter — contrôle de cohérence
Sortie cumulée relue sur état chargé (plateau perte 80 kg → 76 kg) : le constat de
plateau + le conseil calorique apparaissent **une seule fois** (via `cw-adjust`, avec le
chiffre). Une seule voix.

## Vérification
`cd src && xvfb-run -a npm run verify` → **100 % vert** : 577 tests + smoke OK, dont le
nouveau check bloquant **`coachPlateauDedup`** (pilote `renderCoachWeight` sur un plateau
sans pause diète due, vérifie : ajustement présent, `realLine` générique absente, pas de
pause diète). Build **2.0.262**.

Domaine : nutrition
