# 456 — Programme auto : « course » accordée au pluriel quand runs > 1 (2.0.86)

**Boucle #456 · build 2.0.86 · domaine Athlète / programme par objectif · Polish UX honnête (§4.4).**

Filon « pluriel codé en dur, divergent, atteignable » (#452→#454), mais cette fois dans le sens
**inverse** des dernières boucles : ici le compte est presque toujours **> 1** et le mot restait au
**singulier** (les fixes récents corrigeaient « 1 jours » → « 1 jour »).

## Le manque (réel, atteignable)

Le résumé du programme auto (« Mon programme selon mon objectif », onglet Athlète) affiche
`${p.runs} course/sem.` avec « course » **figé au singulier**. Or `p.runs` vient de
`FITNESS_OBJECTIVES` (`logic.js:2713`) et vaut **3** (Corps athlétique), **4** (Perte de gras),
**4** (Endurance), **2** (Remise en forme) — seul « Prise de muscle » vaut **1**. Donc pour 4 des 5
objectifs, l'app écrivait « 4 course/sem. » au lieu de « 4 **courses**/sem. ».

Le libellé existait **en double**, identique :
- `logic.js:3268` (`objectiveProgramText`) — texte **copié/partagé** (`shareableProgram`,
  boutons 📋 Copier / 📤 Partager) ;
- `app.js:620` (`runObjectiveProgram`) — en-tête **rendu à l'écran** ; qui contient AUSSI un détail
  `(${sum.muscu} muscu, ${sum.course} course)` avec le même « course » au singulier.

## Les correctifs

Ternaire d'accord (idiome majoritaire du fichier, aucun helper `course`/`courses` n'existe), aux
**3 emplacements**, « muscu » laissé invariable (abréviation familière de musculation) :

- `logic.js:3268` : `${p.runs} course/sem.` → `${p.runs} course${p.runs > 1 ? 's' : ''}/sem.`
- `app.js:620` (en-tête) : idem `${p.runs} course${p.runs>1?'s':''}/sem.`
- `app.js:620` (détail) : `${sum.course} course)` → `${sum.course} course${sum.course>1?'s':''})`

`runs = 1` (Prise de muscle) reste « 1 course/sem. » au singulier ; `runs = 0` (cas théorique)
aussi. Aucun changement au calcul du programme.

## Garde-fous

- **Test unitaire** (`objectiveProgramText`, `logic.test.js`) : athlétique (3 runs) → « 3 courses/sem. »
  présent et « 3 course/sem. » absent ; Prise de muscle (1 run) → « 1 course/sem. » (pas « 1 courses »).
  L'assertion historique `/muscu · \d+ course/` reste vraie (« 3 course » est un sous-motif de
  « 3 courses »).
- **Check smoke bloquant `objectiveRunPlural`** (`renderer-smoke.cjs`) : pilote le vrai rendu —
  sélectionne « Perte de gras » (4 runs), appelle `runObjectiveProgram()`, lit `#objectiveResult`,
  restaure l'état et re-rend ; vérifie « 4 courses/sem. » présent et « 4 course/sem. » absent.
  Erreur dédiée poussée dans `errors`.

## Vérif

`cd src && xvfb-run -a npm run verify` : **449 tests + smoke** 100 % vert (`objectiveRunPlural`,
`objectiveCopy`, `objectiveShare`, `objectiveSummary`, `whatsNew` verts). Compte de tests inchangé
(assertions ajoutées dans un `test()` existant, pas de nouveau bloc).

## Portée / honnêteté

Effet **visible** (en-tête à l'écran + texte copié/partagé) → **bump 2.0.86** + entrée CHANGELOG
honnête. Aucune fonctionnalité retirée, aucune logique de programme modifiée, aucune surface
réseau/sécurité touchée.

## Suite

Le filon « pluriel figé, divergent, atteignable » couvre désormais les deux sens (compte = 1 ET
compte > 1). Pistes : d'autres unités comptables figées au singulier dans les libellés
`app.js`/`logic.js` (ex. `${n} course` ailleurs, `${n} série`/`${n} bloc` non gardés), ou pivot
couverture/a11y/robustesse pour varier le domaine. Voir mémoire `backlog-leads-distinct-days-legacy`.
