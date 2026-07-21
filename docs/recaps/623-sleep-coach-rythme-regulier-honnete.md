# #623 — Le « Bilan sommeil » ne certifie plus un « rythme régulier » qu'il n'a pas mesuré (build 2.0.233)

## Contexte / rotation

Priorité de nuit (`docs/DEMANDES.md`) = pousser le coaching à fond, **mais** §3 soumet le domaine
`coach` à la **rotation §4 bis** comme les autres. Contrôle des 5 derniers recaps (par numéro) avant
de coder :

```
622 robustesse · 621 coach · 620 robustesse · 619 nutrition · 618 coach
```

→ `robustesse` et `coach` sont les **2 derniers** (et chacun **2× sur 5**) → **bloqués**. `nutrition`
est autorisé (1×, hors des 2 derniers) mais son vrai manque (cible protéines) est **gated** (proposition
#619) et ses fonctions ont été mesurées propres (#620). Domaines **frais** (absents des 5) : `sommeil`,
`focus`, `agenda`, `etudes`, `a11y`, `tests`, `fondations`, `docs`.

Reconnaissance avant de choisir (pour ne pas inventer) — survol par lecture + petits sondages :
- **nutrition** (`proteinTarget`, `energyPlan`, `mealSplit`, `calorieAdjustment`, `hydrationPlan`,
  `waterStatus`, `hydrationPace`) : robustes, bien bornés. `energyPlan` a un `Math.max(0,5·w, 0,9·w)`
  redondant (toujours 0,9) mais sans effet et en domaine **coach/poids** (bloqué) → laissé.
- **focus** (`focusTimerState/Pause/Resume`, `breakSuggestion`, `focusWeekGoal`, `focusByTask`) : propres.
- **agenda** (`scheduleConflicts`, `nextFreeSlot`) : propres (récurrence déjà validée #553).

Angle retenu : **`sommeil`** (frais) — défaut d'**honnêteté** prouvé **par mesure** dans une surface
utilisateur rendue directement au dashboard (`#sleepCoach`).

## Le défaut (prouvé par mesure, pas supposé)

`sleepCoachInsight` (`src/lib/logic.js`) rend le **« Bilan sommeil »** (carte `#sleepCoach`, onglet
Récupération). Sa branche finale « ok » se déclenche quand la durée n'est **pas courte** ET **pas jugée
irrégulière**, et affirme :

> « Sommeil solide : moy. X h sur N nuits, **rythme régulier**. »

Or `irregular` vaut `false` dans **deux** cas très différents :
1. la régularité a été **mesurée** et elle est bonne (`reg` avec `stdev < 1,5 h`, ou `bedReg` avec
   `stdevMin < 60`) ;
2. la régularité **n'a pas pu être mesurée** — moins de 3 nuits chiffrées : `sleepRegularity` renvoie
   `null` (< 3 nuits) et `bedtimeRegularity` aussi (< 3 couchers).

Mesure (rejeu de la fonction) :

```
1 nuit  (8 h)  → { stdev:null, tone:'ok', verdict:"Sommeil solide : moy. 8 h sur 1 nuit, rythme régulier." }
2 nuits (8 h)  → { stdev:null, tone:'ok', verdict:"… sur 2 nuits, rythme régulier." }
3 nuits (8 h)  → { stdev:0,   tone:'ok', verdict:"… sur 3 nuits, rythme régulier." }   ← là, mesuré
```

**Failure scenario concret** : un nouvel utilisateur (ou Adrien qui reprend ses check-ins) saisit **une
seule** bonne nuit → l'app lui certifie un « **rythme régulier** » alors qu'un rythme ne se juge pas sur
une nuit. C'est une **flatterie** : le coach promet un constat qu'il n'a pas fait — l'opposé du mandat
« un vrai coach reste juste ». Et pour Adrien, qui **recale** justement son rythme circadien, un
« rythme régulier » prématuré sape tout le narratif de recalage.

## Le correctif (curation §3 : honnêteté, **zéro champ ajouté**)

La branche « ok » est scindée selon que la régularité a **réellement** été mesurée :

```js
} else if (reg || useBedtime) {          // ≥ 3 nuits de durée OU ≥ 3 couchers → régularité mesurée
  tone = 'ok';
  verdict = `Sommeil solide : moy. ${week.avg} h sur ${week.nights} ${nightsWord(week.nights)}, rythme régulier.`;
} else {                                  // < 3 nuits : régularité NON mesurable
  tone = 'ok';
  verdict = `Bon sommeil : moy. ${week.avg} h sur ${week.nights} ${nightsWord(week.nights)}. Continue tes check-ins pour juger la régularité de ton rythme.`;
}
```

`reg` est non-`null` ssi ≥ 3 nuits de durée ; `useBedtime` est vrai ssi ≥ 3 couchers saisis. Le nouveau
verdict **salue la durée** (honnête : la durée du jour est bonne) et **invite** à poursuivre les
check-ins, sans certifier une régularité non vue. **Dès 3 nuits (ou 3 couchers), le verdict mesuré revient
à l'identique.** `tone` reste `'ok'` → **aucun ripple coach** : `adaptiveCoachFocus` ne greffe ses notes
de pente sommeil que si `tone !== 'ok'`, comportement inchangé.

Non-régression vérifiée : le cas `stableOk` (7 nuits, test « bilan qualité + régularité ») et le cas
`solidButRecentlyDispersing` (14 nuits, test de cohérence coach #457-suite) ont `reg` truthy → gardent
« Sommeil solide … rythme régulier ». Les branches `court`/`irrégulier` sont intactes.

## Contrôle §4 ter (surface utilisateur, rendus lus sur états chargés)

Rendus lus **pour de vrai** (rejeu `sleepCoachInsight`) :

```
1 nuit 8h            → Bon sommeil : moy. 8 h sur 1 nuit. Continue tes check-ins pour juger la régularité de ton rythme.
2 nuits 7,5-8h       → Bon sommeil : moy. 7.8 h sur 2 nuits. Continue tes check-ins pour juger la régularité de ton rythme.
3 nuits 8h           → Sommeil solide : moy. 8 h sur 3 nuits, rythme régulier.
5 nuits 7,8h         → Sommeil solide : moy. 7.8 h sur 4 nuits, rythme régulier.
2 nuits + 2 couchers → Bon sommeil : … (couchers < 3 → régularité toujours non mesurée)
1 nuit + 3 couchers  → Sommeil solide : … rythme régulier.   (régularité mesurée via les couchers)
```

Honnêtes, courts, cohérents : la certitude « rythme régulier » n'apparaît que là où elle est **méritée**.
Aucun texte ajouté à l'écran — une **certitude prématurée retirée**, remplacée par une invite juste.

## Test

Assertions ajoutées au test dédié `sleepCoachInsight : bilan qualité + régularité` (pas un nouveau
`test()`, donc le total reste **567**) : 1 nuit → pas de « rythme régulier » + invite « Continue tes
check-ins » ; 2 nuits idem ; 3 nuits régulières → « Sommeil solide … rythme régulier » (mesuré) rétabli.

## Versionnage / verify

Bump **2.0.232 → 2.0.233** (effet utilisateur réel : le verdict change pour < 3 nuits) : `package.json`
+ entrée `CHANGELOG[0]` en tête de `logic.js` + les 2 assertions `CHANGELOG[0].v` (logic.test.js &
renderer-smoke.cjs `whatsNew`). `cd src && xvfb-run -a npm run verify` → **567 tests + smoke OK**, 100 %
vert. Aucune fonctionnalité retirée ; aucune dépendance ajoutée.

Domaine : sommeil
