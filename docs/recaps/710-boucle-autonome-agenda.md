# 710 — Boucle autonome : vue mois, conflit à l'édition, capacité réglable

## Contexte

Adrien : « Fais une boucle d'amélioration, tout seul, je vais courir. »

Trois itérations, chacune : sonder → corriger → tester par mutation → vérifier → commiter.
Aucune release publiée (consigne : ~1 par jour, il en a reçu 5 aujourd'hui).

## Itération 1 — le plafond de la vue mois ne plafonnait rien

Le plafond de 3 entrées par case était posé en CSS : `.month-event:nth-of-type(n+4)`. Or
`nth-of-type` compte **par type d'élément**, et une case mélange des `<span>` (marqueurs,
anniversaires, récurrents) et des `<button>` (blocs d'agenda). Avec 2 récurrents et 3 blocs,
aucun groupe n'atteint le 4e de *son* type : la règle ne masquait rien.

Mesuré : **5 entrées, 5 visibles**, et l'étiquette annonçait « +2 autres ». La case débordait en
prétendant le contraire — pire que le défaut d'origine, qui au moins ne mentait pas.

## Itération 2 — modifier un bloc ne prévenait d'aucun chevauchement

`confirmerSiConflit` était branché sur trois formulaires mais pas sur celui d'édition. Créer un
bloc sur un cours prévenait ; le **déplacer** dessus, non — alors que c'est le geste courant.

Trois checks existants sont tombés au passage, et **ils tombaient déjà avant** : `weekTimeGrid`,
`agendaCharge` et `dayViewPlural` agrègent tous les occurrences récurrentes sans neutraliser
`state.recurring`. Ils dépendaient de ce que les checks précédents laissaient derrière eux.

Fausse alerte instructive : le check du miroir IndexedDB échouait parce que **quatre sondes
Electron laissées ouvertes verrouillaient le stockage**. Chemins vérifiés avant fermeture — le
binaire de dev, jamais l'app installée.

## Itération 3 — capacité réglable, et la revue qui rattrape ma propre régression

**La jauge jugeait les journées contre une capacité codée en dur** (3 h en semaine, 6 h le
week-end) qu'on ne pouvait pas toucher. Une jauge dont le seuil ne correspond pas à ta vie passe au
rouge tous les jours — et une alerte permanente n'est plus une alerte. Elle se règle maintenant
depuis le menu ⚙️ Réglages de l'Agenda.

Le piège était la conversion : la grille interne est indexée **dimanche→samedi** (`Date.getDay()`),
le formulaire commence le **lundi**. Un cran d'écart aurait fait juger le samedi avec la capacité du
dimanche, sans que rien ne le signale. Les deux conversions sont pures et testées sur une grille
asymétrique — la seule qui prouve que chaque jour tombe à sa place.

### Puis la revue adversariale a trouvé une régression que j'avais introduite en itération 1

En rendant le plafond effectif, j'avais figé l'ordre : marqueurs, anniversaires, récurrents, **puis**
les blocs d'agenda. `slice(0,3)` coupant par la fin, **les rendez-vous perso étaient toujours les
premiers sacrifiés** — et ce sont les seuls porteurs de `data-edit-agenda`, donc les seuls
modifiables d'un clic depuis le mois. Trois cours récurrents (un emploi du temps importé en aligne
facilement autant) et l'entretien d'alternance disparaissait de la case.

C'était bien une **régression** : la règle CSS cassée laissait au moins passer 3 `<span>` **et**
3 `<button>`.

Corrigé en servant les groupes à tour de rôle — aucun n'est structurellement sacrifié, et l'agenda
passe en premier de chaque tour. Les blocs sont aussi triés par heure : `state.agenda` n'est jamais
ordonné, donc la place restante allait au bloc le plus anciennement **créé**.

Deux autres corrections de la revue :
- l'alerte de chevauchement se déclenchait à **chaque** enregistrement, même en ne changeant que le
  titre — et « Annuler » jetait alors la modification sans rien dire ;
- `moisDebordement` ne neutralisait ni les anniversaires, ni les examens, ni la course objectif : il
  serait passé au rouge le jour d'un anniversaire, sans rapport avec le code.

**Et mon jeu d'essai laissait passer la régression** : 1 récurrent pour 4 blocs, donc des blocs
survivaient toujours. Il utilise maintenant 3 récurrents pour 1 bloc — la configuration réelle d'un
jour de cours — et exige qu'un `[data-edit-agenda]` survive à la coupe. Validé par mutation.

## Note de traçabilité

Le réglage de capacité (itération 3) a été livré dans le commit `0d9afc2`, dont le message ne
décrit que les correctifs de la revue — les deux travaux se sont retrouvés dans le même `git add`.
Le code est bien là ; c'est le message qui est incomplet. Noté ici plutôt que réécrit : master a
deux écrivains, et une réécriture d'historique coûterait plus cher que cette ligne.

## État

**606 tests + SMOKE OK.** Quatre commits sur master depuis v2.5.1, aucune release.

Domaine : qualité
