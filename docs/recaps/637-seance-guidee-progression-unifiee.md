# #637 — Séance guidée : les deux surfaces de progression ne se contredisent plus (build 2.0.246)

## Contexte

Priorité de nuit = coaching (CAP 3.0 étape 1 · MANDAT COACHING ÉLITE, muscu). Rotation §4 bis :
5 derniers domaines = `nutrition, coach, nutrition, alternance, athlete`. Les 2 derniers
(`nutrition`, `coach`) sont bloqués, et `nutrition` apparaît 2× → exclus. **`athlete`** (1× sur 5,
absent des 2 derniers) est **libre**. Piste prise dans la mémoire des pistes athlète ouvertes
(`athlete-coaching-open-leads`, exploration #631, défaut n°2 non encore cadré) : **séance guidée —
double prescription de progression contradictoire**. Le défaut n°1 (downhillPrep) était déjà clos (#633).

## Défaut prouvé (deux contradictions rendues côte à côte)

Sur l'écran de séance guidée (`renderGuidedWorkout`, `app.js:444`), sous l'exercice courant, deux
surfaces de progression coexistaient :

- `#guidedProgressionHint` ← `exerciseRecommendation` (`app.js:397`). Dans la branche **feu vert**
  (`effort<=2`, `latestLoad>0`, `unit==='reps'`) elle prescrivait un naïf **« +0,5 kg »**.
- `#guidedTarget` ← `progressionSuggestion` (`logic.js`) : la **double progression** science-cité
  (ACSM 2009 / Zourdos 2016) — reps jusqu'en haut de fourchette, puis **+2,5/+5 kg** via
  `progressionIncrement`.

Deux contradictions, prouvées par lecture :

1. **Feu vert** : le conseil « +0,5 kg » contredit la cible « monte la charge » (+2,5/5 kg) —
   chiffres incompatibles, et le « +0,5 kg » contredit aussi `progressionIncrement`.
2. **Récup basse** : `#guidedTarget` était rendu **inconditionnellement** (dès qu'une suggestion
   existe), donc quand `#guidedRecoveryNote` et `#guidedProgressionHint` disaient à juste titre
   « récupération fragile — répète le format, allège », la cible criait **quand même**
   « monte la charge 💪 ». Sens opposés sur le même écran.

## Correctif (curation §3, zéro champ ajouté)

- **Une seule autorité, gatée par la récupération.** Nouvelle fonction **pure** `guidedProgressionLines(sugg,
  cautious, fallbackHint)` (`logic.js`, à côté de `progressionText`) qui produit `{hint, target}`
  cohérents :
  - `cautious` (récup fragile OU dernière séance dure/incomplète) → la cible **CONSOLIDE**
    (« consolide N reps × X kg en technique parfaite — tu monteras d'un cran quand la forme sera
    revenue »), plus de « monte la charge » ; le conseil récup/technique (`fallbackHint`) est conservé.
    Autorégulation : on n'ajoute pas de charge quand la forme est basse (Zourdos 2016).
  - feu vert → la cible suit la double progression (inchangée), et le conseil **défère** à la cible
    (« Feu vert : suis la cible du jour ci-dessous, un cran à la fois ») au lieu du « +0,5 kg ».
  - pas de suggestion (exercice au temps / sans historique) → cible vide, conseil = repli conservé
    (comportement d'avant préservé).
- `renderGuidedWorkout` câble le rendu sur cette fonction : `#guidedProgressionHint` **et**
  `#guidedTarget` sont désormais dérivés du **même** flag `current.cautious` → cohérence structurelle
  (impossible que l'un dise « pousse » et l'autre « repose »).
- `exerciseRecommendation` **inchangée** : blast radius réduit, `prepareProgression`/swap intacts.

## §4 ter — contrôle de cohérence cumulé

Rendu mental sur état chargé. **Feu vert** : note récup (RIR) + conseil « suis la cible ci-dessous » +
cible « 8 reps × 42,5 kg — monte la charge 💪 » → le conseil ponte vers la cible, un seul chiffre, plus
de « +0,5 kg ». **Récup fragile** : note récup « allège » + conseil « répète le format » + cible
« consolide 12 reps × 40 kg… tu monteras quand la forme reviendra » → les trois disent « consolide ».
Contradictions levées dans les deux cas.

## Vérification

- `logic.test.js` : nouveau bloc `guidedProgressionLines` (feu vert action charge/reps, récup basse
  consolide sans « monte la charge », repli sans suggestion). **571 tests verts.**
- `renderer-smoke.cjs` : check `guidedTarget` **étendu et promu bloquant** (il était défini mais
  jamais poussé dans `errors`, motif P2.2/#566) — vérifie `guidedProgressionLines` exposé, feu vert
  → double progression sans « 0,5 kg », récup basse → consolide sans « monte la charge ». **Smoke OK.**
- Bump `2.0.245 → 2.0.246` + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`.

Domaine : athlete
