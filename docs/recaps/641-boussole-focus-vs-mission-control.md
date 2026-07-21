# #641 — Boussole locale : plus « Lancer mon focus » quand Mission Control l'a déjà coché (2.0.250)

## Rotation (§4 bis)

Priorité de nuit = coaching. Contrôle des 5 derniers recaps **par numéro** :
`640 athlete · 639 nutrition · 638 coach · 637 athlete · 636 nutrition`.
→ `athlete` (2×, dont le dernier) et `nutrition` (2×, dont l'avant-dernier) exclus ; `coach` permis
(1×, absent des 2 derniers) mais **`focus`** pris : 0× sur les 5 derniers, domaine frais, pleinement
aligné avec la priorité coaching (concentration / rituels), et exploration ciblée → angle NEUF (les
deux surfaces « prochain geste » du dashboard, jamais arbitrées ensemble sur le focus).

## Défaut prouvé (contradiction inter-surfaces, cas nominal)

Deux cartes voisines vivent côte à côte sur l'accueil (`data-page="dashboard"`) et sont rendues
ensemble par `renderDashboardCore` :

- **Mission Control** (`renderMissionControl`, app.js:268) lit l'état focus via `missionDayState`
  (app.js:267) : `focus = state.focusSessions.some(x => x.date === today)` → coche « ✓ Bloc de
  concentration terminé. » dès qu'un bloc est enregistré aujourd'hui.
- **Boussole locale** (`renderDailyCompass`, app.js:266) est une échelle « ton prochain geste ». Sa
  branche focus (`else if(focus)`) ne testait que `focus = state.focusTask?.trim()` — le champ
  « mission active », **jamais remis à zéro automatiquement** (`finishFocusBlock` ne le vide pas) —
  **sans jamais vérifier si un bloc avait été fait aujourd'hui**.

**Cas nominal** (flux quotidien standard) : check-in du matin fait, `focusTask` posé
(« Réviser le DS de maths »), **un bloc de focus bouclé aujourd'hui**.
- `missionDayState().focus = true` → Mission Control affiche « Focus ✓ — Bloc de concentration
  terminé. » et compte le focus comme accompli.
- `renderDailyCompass` : `morning` vrai (skip 1ʳᵉ branche) ; `focus` truthy → **entre dans la branche
  focus** → titre « Protéger une seule chose », CTA n°1 = **« Lancer mon focus »**.

→ Les deux surfaces se contredisent : l'une dit le focus **terminé**, l'autre présente
« **Lancer mon focus** » comme LE geste n°1 restant. La 1ʳᵉ branche de la boussole gère pourtant déjà
correctement le cas par symétrie (`!morning`) : la branche focus était la seule à ne pas retirer un
rung déjà accompli.

## Correctif (curation §3, zéro champ ajouté)

`renderDailyCompass`, branche focus gardée par « aucun bloc fait aujourd'hui » — même patron que la
branche matin (`!morning`) et cohérent avec le coche de Mission Control :

```js
// avant : }else if(focus){
}else if(focus&&!state.focusSessions.some(s=>s.date===today)){
```

Une fois le bloc du jour enregistré, l'échelle avance au rung suivant (créneau du jour → priorité de
vie → défaut) au lieu de renvoyer sur un focus déjà accompli. `state.focusTask` reste affiché en
**signal** informatif (chip « Focus : … ») — on ne perd pas l'info de la mission active, on cesse
juste de la présenter comme une action en attente. Aucun texte ajouté.

## Contrôle §4 ter (surfaces lues par l'utilisateur)

Les deux cartes ont été **rendues ensemble sur état chargé** (matin fait + `focusTask` + bloc du jour
+ une priorité de vie) via le check smoke : Mission Control coche « Bloc de concentration terminé »,
la Boussole affiche désormais « Faire vivre ton cap » / « Revoir mes priorités » (rung suivant),
**plus** « Lancer mon focus ». Lecture cumulée cohérente, sans redondance ni contradiction nouvelle.

## Vérification

`cd src && xvfb-run -a npm run verify` → **100 % vert**.

- **571 tests** (inchangé — correctif de rendu pur, pas de logique nouvelle).
- Check smoke **bloquant `compassFocusDone`** : construit l'état nominal, rend `renderDailyCompass`
  **et** `renderMissionControl`, exige que Mission Control coche « Bloc de concentration terminé » ET
  que la Boussole ne présente plus « Lancer mon focus », puis restaure l'état. **Rouge avant**
  (`compassFocusDone:false`, smoke exit 1) / **vert après**.

Build **2.0.250** (bump + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`).

_Domaine : focus._
