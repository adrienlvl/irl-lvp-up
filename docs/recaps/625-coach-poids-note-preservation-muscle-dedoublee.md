# #625 — Coach Poids : la préservation du muscle n'est plus dite deux fois de suite (build 2.0.235)

**Domaine choisi :** `nutrition` (cœur du coaching élite — diététique du sport — et priorité de nuit
« coaching à fond »). **Rotation §4 bis contrôlée avant de coder** : les 5 derniers recaps portaient
`sommeil` (624), `coach` (623), `robustesse` (622), `coach` (621), `robustesse` (620) → `coach`,
`sommeil` et `robustesse` **bloqués** (2 derniers recaps ; `coach`/`robustesse` 2× sur 5). `nutrition`
absent des 5 derniers → autorisé. La série coaching élite étant finie (seul reste l'item
proposition-gated « base d'exercices »), on est en **rotation normale**.

## Le défaut (redondance §4 ter, prouvée par rendu)

`weightTargetAdvice` (carte « Coach Poids », rendue par `renderTargetAdvice` → `#coachTargetAdvice`)
empile des notes lues **l'une sous l'autre**. Deux d'entre elles se chevauchaient quand l'objectif est
`endurance`/`athletique` **et** la perte visée ≥ 10 % du poids :

- **Section 4** (spécifique à l'objectif) : « Perdre X % … pèsera sur tes performances … garde 2 g de
  protéines/kg **et maintiens la musculation pour ne pas fondre du muscle**. »
- **Section 5** (rappel générique « toujours préserver le muscle en perte ») : « Pour perdre sans
  fondre : **garde la musculation, vise ~2 g de protéines/kg**, et ne descends pas sous ton métabolisme
  de base. »

Rendu cumulé sur l'état réel (81 kg → 70 kg, endurance) : les deux notes se suivaient, répétant
quasi mot pour mot « protéines/kg + musculation ». C'est exactement le type de redite que §4 ter
proscrit (« redondant avec la phrase d'à côté ») — le pavé coach s'est bâti ainsi.

## Le correctif (curation §3, zéro champ ajouté)

- La note de section 4 **agrège** la seule information neuve de la note 5 (le plancher métabolique) :
  « … maintiens la musculation pour ne pas fondre du muscle **et ne descends pas sous ton métabolisme
  de base**. » → **rien perdu**.
- Un drapeau `muscleAdvised` (posé quand cette note tombe) **coupe** la note 5 générique dans ce seul
  cas → plus de doublon.
- Tous les autres cas sont **inchangés** : perte < 10 % (note 4 ne se déclenche pas → note 5
  conservée), `seche`/`forme` (note 5 seule), `muscle` en perte (note `stop`, pas de note 5).

« Retirer une note en vaut souvent deux ajoutées » (§3) : une note comprehensive au lieu de deux.

## Vérifications

- **§4 ter** : rendu cumulé relu sur 5 états (endurance ≥10 %, athletique ≥10 %, athletique 7,4 %,
  seche, muscle) → la préservation du muscle est dite **une fois**, complète, dans les deux cas ciblés ;
  la note générique revient dès que la note 4 ne s'applique pas.
- Test `weightTargetAdvice` étendu : `filter(/protéines\/kg/).length === 1`, absence de « Pour perdre
  sans fondre », présence de « métabolisme de base » ; non-régression (note 5 conservée sur perte
  modérée).
- `cd src && xvfb-run -a npm run verify` → **568 tests + smoke verts**.

Build **2.0.235**. Recap #625.

Domaine : nutrition
