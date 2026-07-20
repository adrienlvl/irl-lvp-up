# #588 — Coach : une tête à plat coupe la poussée de bloc focus ET le créneau (build 2.0.204)

## Rotation (§4 bis) — contrôle avant de coder

5 derniers domaines (#587→#583) = `etudes · docs · coach · athlete · docs`.
- **2 derniers** (#587 `etudes`, #586 `docs`) → interdits.
- `docs` apparaît **2×** dans les 5 → interdit.
- **`coach`** : 1× (#585), absent des 2 derniers → **autorisé**. Priorité de nuit #1 (coaching à fond,
  en QUALITÉ, §3) et rotation **convergent** ce tour — le coach « attend son tour comme les autres »
  (§3), et c'est son tour. Quota propositions (§4 bis.4) : plusieurs propositions dans les 10 derniers
  recaps → pas d'itération-proposition forcée.

## L'angle NEUF (le mémo/#585 exigeaient de ne PAS re-labourer « guards sport ↔ frein »)

Cartographie du corps de `adaptiveCoachFocus` (5117→7600). La famille sport ↔ frein (`loadSpike`,
`readinessSlide`, `readiness < 50`) est close depuis #585. **Angle neuf trouvé, même classe de bug
mais sur le pilier FOCUS, jamais gardé** : quand la readiness du JOUR est au plancher, l'insight focus
pose déjà un frein explicite —

- `focusGoalDrained` (`logic.js:5485`, objectif serré × readiness < 50) : « un cerveau fatigué ne
  produit pas un vrai bloc profond… **un focus court et facile aujourd'hui, soigne ta récup** » ;
- `focusMarginDrained` (`logic.js:5610`, objectif large × readiness < 50) : « aucune raison de forcer
  un gros bloc aujourd'hui. **Un focus léger, ou même une vraie pause, suffit largement.** »

— mais **trois surfaces d'ACTION continuaient de pousser un bloc**, sans jamais lire ce frein (la
variable locale `readiness` n'est câblée que pour le sport, `logic.js:5627` ; côté focus le frein du
jour ne vit que dans ces deux flags, en portée fonction mais inutilisés en aval) :

1. l'action `focusTask` (`logic.js:6175/6177/6180`) : « Reprends « X », enchaîne un bloc de **45 min
   (ta durée habituelle)** » / « Lance une session de focus de {habituelle} min maintenant » ;
2. le créneau `focusSlot` (`logic.js:6195`) : « **Créneau libre à 08:30 — cale ton bloc là.** » ;
3. la relance comeback focus (`logic.js:7391`) : « La reprise tient — **repasse à un vrai bloc, pas
   juste 10 min.** »

Rendu cumulé d'un jour à plat (objectif serré, 40/100) **avant** correction : l'insight dit « focus
court, soigne ta récup » puis l'action lançait « Reprends « Compta », un bloc de 30 min… Créneau libre
à 08:30 — cale ton bloc là. » — exact anti-pattern §4 ter (chaque clause testée seule, personne ne lit
le cumulé), le **pendant focus** de la contradiction sport corrigée en #585. La preuve que c'est un
oubli parallèle et non un choix : la relance comeback **sport** a déjà un garde `sportEase`
(`logic.js:7383`, coupe sur readiness < 50 / loadSpike / readinessSlide), la relance **focus** n'avait
**aucun** équivalent.

## Le fix (§3 : QUALITÉ, curation — on COUPE, on n'ajoute pas de note)

Un flag `focusRested = focusGoalDrained != null || focusMarginDrained != null` (`logic.js:6182`) —
calqué sur le `readinessSlide == null` de #585 — coupe les trois poussées les jours de tête à plat :

1. `focusTask`/bloc habituel : gardés `&& !focusRested` → l'action **retombe sur le bloc COURT de
   base** (« Lance une session de focus de 25 min maintenant »), cohérent avec « focus court/léger » ;
2. `focusSlot` : garde `!focusRested` ajouté au if du créneau → plus de « cale ton bloc là » ;
3. comeback focus : `focusEase` (miroir exact de `sportEase`, `logic.js`) → la relance dit « garde un
   bloc court aujourd'hui, ta tête est à plat, tu pousseras à la prochaine » au lieu de « repasse à un
   vrai bloc ».

**Aucune note ajoutée** — trois poussées contradictoires en moins les jours de forme mentale à plat.
Ciblage chirurgical : seuls les deux **freins du JOUR** coupent. La zone médiane (`focusGoalSteady`),
l'avance (`focusGoalAhead`) et le feu vert (`focusGoalFresh`) **ne coupent pas** — un jour correct ou
au vert, citer la tâche phare + un créneau reste cohérent. « Retirer une note en vaut souvent deux
ajoutées » (§3).

## §4 ter — contrôle de cohérence (rendu cumulé, état chargé, relu en entier)

État chargé (4 sessions « Compta » nommées dont 1 cette semaine → objectif serré + agenda horaire +
readiness 40/100) :
- **Jour à plat** : `focusTask === null`, `focusSlot === null`, action = « Lance une session de focus
  de 25 min maintenant » — plus **aucune** trace de « Créneau libre », « Reprends « Compta » » ni
  « enchaîne un bloc ». L'insight se lit désormais « objectif serré → **Mais** forme à plat → focus
  court, soigne ta récup » (la réconciliation VOULUE) et l'action ne le contredit plus.
- **Contrôle sans check-in du jour** : `focusTask === 'Compta'`, `focusSlot === '08:30'`, « Créneau
  libre à 08:30 » **rétabli** — la coupe n'étouffe pas le conseil légitime.
- **Comeback à plat** : relance ménagée (« garde un bloc court… ») ; **contrôle** sans frein : « repasse
  à un vrai bloc de focus, pas juste 10 min » conservé.

+2 tests logic.test.js (guard objectif serré/large + comeback) + 1 check bloquant smoke (`coachFocus`,
2 volets frein/contrôle). 537 tests + smoke verts. Build 2.0.204.

## Piste restante

La famille « contradictions insight ↔ action » est maintenant couverte sur le sport (#585) **et** le
focus (ce recap), sur les deux surfaces (objectif + comeback). Prochaine itération coach : un angle
NEUF ailleurs (nutrition/sommeil/poids/habitudes) — les paires de MILESTONES « une semaine » redondants
(streakMilestoneReach / completeDayMilestone / habitMilestone empilables le même jour) restent un
candidat de curation identifié mais non traité, à vérifier au tour prochain, en respectant la rotation.

Domaine : coach
