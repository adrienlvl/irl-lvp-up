# #585 — Coach : une forme qui glisse coupe le créneau ET le groupe à charger (build 2.0.203)

## Rotation (§4 bis) — contrôle avant de coder

5 derniers domaines (#584→#580) = `athlete · docs · coach · fondations · docs`.
- **2 derniers** (#584 `athlete`, #583 `docs`) → interdits.
- `docs` apparaît **2×** dans les 5 → interdit.
- **`coach`** : 1× (#582), absent des 2 derniers → **autorisé**. Priorité de nuit #1 (coaching en
  QUALITÉ, §3) et rotation **convergent** ce tour — le coach « attend son tour comme les autres »
  (§3), et c'est son tour.

## La piste (documentée en réserve #583)

Mémoire `coach-leads-contradictions-2guards` + recap #583 signalaient une piste coach **distincte**
et vérifiée en réserve : `sportSlot` (`logic.js:6793`) et `sportZoneFocus` (`logic.js:6838`) sont
gardés `loadSpike == null` **mais pas** `readinessSlide == null`.

## Le manque est réel (grep + lecture)

`readinessSlide` (`logic.js:6252`) se déclenche quand le pilier poussé est le SPORT, readiness du
jour ∈ [50, 75) mais **en glissade** (direction 'down', ≥ 12 pts sur ≥ 4 check-ins). Il **remplace**
alors l'action par un frein explicite :

> « Readiness 55/100 aujourd'hui — correcte en soi, mais ta forme glisse sur tes 5 derniers
> check-ins (-45 pts) : … c'est de la fatigue qui s'accumule. **Séance allégée aujourd'hui, et soigne
> ta récup avant de taper dans le rouge.** »

Or, quelques lignes plus bas, `sportSlot` et `sportZoneFocus` — gardés seulement sur
`loadSpike == null && readiness >= 50` — s'appliquaient encore (readiness 55 passe la garde,
loadSpike null) et **appendaient** à cette même action :

> « … **Créneau libre à 08:00 aujourd'hui — cale ta séance là. Et cible en priorité les jambes :
> c'est ton groupe le plus reposé (…) — de quoi équilibrer ta semaine.** »

« Cale ta séance là » et surtout « cible en priorité les jambes **pour équilibrer ta semaine** »
poussent à s'entraîner/charger un groupe **de front** contre le « lève le pied » de la ligne
d'avant — l'anti-pattern « chaque clause testée isolément, personne ne lit le cumulé » (§4 ter).

**Contradiction déjà nommée par le code lui-même** : le commentaire de `loadSpike`
(`logic.js:6303`) explique qu'il « COUPE le créneau sport plus bas (« cale ta séance » contredirait
« allège ») ». `readinessSlide` produit exactement le même registre « allège » — donc la même
coupe devrait s'appliquer. Le bloc voisin `lowLoad` (`logic.js:6400`) le fait déjà : il refuse
d'entrer si `readinessSlide` a tempéré (« forme qui glisse → garde léger ; remonte le volume la
contredirait »). `sportSlot`/`sportZoneFocus` étaient les deux oublis de ce garde-fou.

## Le fix (§3 : QUALITÉ, curation — on RETIRE, on n'ajoute pas)

Ajout de `&& readinessSlide == null` aux **deux** gardes (`logic.js:6795` sportSlot, `logic.js:6842`
sportZoneFocus), à l'identique du `loadSpike == null` déjà présent et du `readinessSlide == null` du
bloc `lowLoad`. Commentaires mis à jour pour documenter le garde-fou. **Aucune note ajoutée** — deux
notes contradictoires en moins les jours de glissade. « Retirer une note en vaut souvent deux
ajoutées » (§3).

Ciblage chirurgical : seul `readinessSlide` (le frein) coupe. `readinessRebound` (forme qui REMONTE,
« réhausse un peu l'intensité ») **ne coupe pas** — un jour de rebond, proposer un créneau et un
groupe à cibler est **cohérent**, pas contradictoire. La coupe mord donc uniquement sur la
contradiction.

## §4 ter — contrôle de cohérence (rendu cumulé, état chargé, relu en entier)

Test dédié construit un état chargé (workouts espacés avec exercices nommés multi-zones + recovery
en glissade -45 + agenda horaire du jour) :
- **Avec glissade** : `sportSlot === null`, `sportZoneFocus === null`, l'action ne contient **ni**
  « Créneau libre » **ni** « cible en priorité » — elle se limite au frein cohérent.
- **Contrôle sans glissade** (même état, forme stable 63) : créneau **et** groupe **rétablis** — la
  coupe n'étouffe pas le conseil quand il est légitime.

+1 test (2 volets). 535 tests + smoke verts. Build 2.0.203.

## Piste restante

La famille « contradictions de guards sport ↔ frein » est désormais bien couverte (loadSpike,
readiness < 50, readinessSlide sur toutes les surfaces sport). Prochaine itération coach : chasser
un angle **neuf** (pas re-labourer cette famille), en respectant la rotation.

Domaine : coach
