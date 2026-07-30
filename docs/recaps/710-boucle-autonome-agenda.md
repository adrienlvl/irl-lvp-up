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


## Itérations 4 et 5 — le Coach voit l'agenda, et l'app tient sur un iPhone

**Itération 4** (demandée par Adrien) : le Coach jugeait les piliers sans jamais ouvrir l'agenda.
Il signale maintenant une journée saturée — la veille au soir plutôt qu'à 19 h — et un bloc
repoussé 3 fois ou plus. Quand les deux se présentent, la décision passe avant la surcharge :
elle ne se résoudra jamais seule. Un check existant (`altStatusRefresh`) a rattrapé au passage un
défaut que je venais d'introduire : la carte du coach restait affichée avec son état périmé
quand le focus disparaissait.

**Rendu iPhone**, mesuré par sonde à 390 × 844 :

| | Avant | Après |
|---|---|---|
| Colonne de texte de l'en-tête | 110 px | **348 px** |
| Titre | 3 lignes | **1 ligne** |
| Hauteur d'en-tête | 262 px | **191 px** |
| Colonne de la grille semaine | 41 px | **79 px** |

**Itération 5** : la vue semaine tenait ses 7 colonnes dans 390 px — 41 px chacune, soit trois
lettres avant les points de suspension. Rien ne débordait techniquement, mais on ne lisait plus
que des rayures colorées. Elle se fait maintenant glisser du doigt, avec des colonnes lisibles.

L'alignement en-tête/colonne a cassé **trois fois de suite** pendant cette itération (44 px,
puis 48 px, puis un override qui écrasait un réglage déjà correct). Les en-têtes vivent hors du
conteneur défilant : leur première piste doit reproduire « gouttière + écart » du corps, et
quelques pixels d'écart ne se voient pas à l'œil. C'est devenu un test d'invariant qui compare
les deux déclarations dans chaque requête média — validé par mutation.


## Itérations 6 et 7 — la revue, puis les dialogues

**Itération 6.** La revue adversariale a trouvé **11 défauts, dont 6 que je venais de créer**. Le
plus parlant : une bande orange VIDE s'affichait chaque jour sous le conseil du coach, parce que
la règle auteur `.coach-agenda{display:flex}` bat la règle navigateur `[hidden]{display:none}` —
et parce que mon check lisait `el.hidden === true`, la propriété, jamais le rendu. Un check nommé
`whatsNewDismiss` existait déjà dans le même fichier pour ce motif exact, commentaire à l'appui.

Trois de mes six erreurs venaient de gardes qui vérifient l'intention plutôt que le résultat.

**Itération 7.** Sonde des dialogues en 390 px. Premier résultat : deux dialogues à 0 × 0 — mais
c'était un artefact de la sonde, qui les ouvrait sans ouvrir la page qui les contient. Vérifié
avant de « corriger » un non-défaut.

Le vrai défaut est apparu ensuite : **le formulaire d'édition d'un bloc débordait de 106 px** de
son dialogue. Même cause que `.wellness-bar` et `.food-row` — `1fr` ne descend pas sous le contenu
minimum d'une cellule. Troisième occurrence du même piège en une soirée.

Et la passe mobile ne regardait que les panneaux : elle **ne pouvait pas** voir un dialogue. Elle
les ouvre maintenant. Première mutation ratée au passage — je n'avais retiré qu'une déclaration
sur quatre, les trois autres portaient encore le correctif ; la mutation complète fait bien rougir
le smoke avec le chiffre exact.

## Note de traçabilité

Le réglage de capacité (itération 3) a été livré dans le commit `0d9afc2`, dont le message ne
décrit que les correctifs de la revue — les deux travaux se sont retrouvés dans le même `git add`.
Le code est bien là ; c'est le message qui est incomplet. Noté ici plutôt que réécrit : master a
deux écrivains, et une réécriture d'historique coûterait plus cher que cette ligne.

## État

**606 tests + SMOKE OK.** Quatre commits sur master depuis v2.5.1, aucune release.

Domaine : qualité

## Itération 8 — modifier une occurrence récurrente seule

Le chantier le plus demandé du backlog Agenda, et le seul qui touche au MODÈLE.

Jusqu'ici un récurrent savait être sauté (`skipLog`) et validé (`doneLog`), jamais
**modifié**. Un cours décalé d'une semaine obligeait à supprimer le récurrent et
tout ressaisir.

`overrides: { 'YYYY-MM-DD': { time?, durationMin?, title?, moveTo? } }` — une
exception ne stocke QUE ce qui diffère. L'absence d'une clé veut dire « comme
d'habitude », ce qui n'est pas la même chose que la valeur vide (`time:''` est un
bloc sans horaire, volontairement).

Points durs rencontrés :
- **Le déplacement se lit dans les deux sens.** `recurringOccurs` doit rendre faux
  à la date d'origine ET vrai à la date d'arrivée. La recherche « qui vient
  d'ailleurs ? » exige que la source tienne encore debout (règle respectée, non
  sautée), sinon une exception périmée fait apparaître un bloc fantôme.
- **La validation vit sur la date d'ORIGINE.** Cocher le mardi un cours venu du
  lundi doit écrire lundi. Sans ça la coche ne tenait pas et le bloc ressortait.
- **Trois consommateurs lisaient encore la base** : `todayItems`, `busyBlocksForDay`
  et le calendrier mensuel. Le deuxième est le plus vicieux — un cours déplacé
  bloquait le mauvais créneau, et le bon restait faussement libre pour le coach.
- **`openOverlay` laisse un `<dialog>` fermé.** Les champs se remplissaient sans
  que rien ne s'affiche. Les `<dialog>` s'ouvrent avec `showModal()`.

### La mutation qui a servi à quelque chose
Sur trois mutations, la première a SURVÉCU : rendre les consommateurs aveugles à
l'exception ne faisait pas rougir le smoke. Cause — mon assertion cherchait
« 14:00 » dans tout `#dayView`, or **l'axe de la grille horaire affiche 14:00 en
permanence**. Le check était creux. Resserré sur la ligne qui porte le titre du
cours (et qui ne doit plus contenir 09:00), les trois mutations mordent.

Leçon à ajouter à la liste : *une assertion de texte sur un conteneur qui contient
déjà la chaîne cherchée ne prouve rien — viser l'élément, pas la vue.*

615 tests · SMOKE OK · aucun débordement en 390 px.

## Itération 9 — revue adversariale (v2.6.0..HEAD) + publication v2.7.0

Revue menée sur mon propre diff, en cherchant d'abord là où je savais avoir été
vite. **Deux défauts trouvés, tous deux de ma main, tous deux dans l'itération 8.**

1. **« ⤫ sauter » inerte sur une occurrence déplacée.** `skipRecurringOn` écrivait
   la date AFFICHÉE ; or `recurringOccurs` teste d'abord « une occurrence vient-elle
   d'ailleurs ? » et rendait le bloc quand même. Exactement la même erreur, au même
   endroit, que celle corrigée une heure plus tôt pour la validation — j'ai corrigé
   `completeRecurringOn` sans regarder son voisin immédiat.
2. **`mergeRecurring` perdait les exceptions.** Il préservait `doneLog`, `skipLog`
   et `paused` — la saisie manuelle d'Adrien — mais pas `overrides`, ajouté le jour
   même. Une ré-importation du calendrier aurait tout effacé en silence.

**Leçon** : quand je corrige une fonction, lire ses VOISINES qui manipulent le même
champ. Les deux défauts sont des oublis de propagation, pas des erreurs de logique.

v2.7.0 publiée : build Windows OK, PWA déployée.

### Prochaine phase (demandée par Adrien)
Boucle recentrée sur **le Coach et l'onglet Athlète**. Pistes de départ :
- Sonder l'onglet Athlète en 390 px, sous-onglet par sous-onglet (jamais mesuré
  depuis la refonte en 4 onglets).
- Le Coach a maintenant trois cartes empilées (focus, agenda, entraînement) :
  vérifier qu'elles ne crient pas toutes en même temps.
- `coachTraining` n'expose qu'une piste sur six ; les autres restent invisibles.
- Mandat coaching élite : progression, standards de force, sources réelles.

## Itérations 10-11 — contenu du Coach, puis le programme qui obéit

**10.** Deux ajouts au Coach, tous deux déjà calculés et jamais montrés : « ce qui te bride
aujourd'hui » (readinessLimiter/Driver, invisibles depuis toujours) et les cinq pistes
d'entraînement secondaires que `coachTraining` annonçait sans permettre de les lire.

**11.** Le programme auto obéit enfin. Le nombre de séances était figé dans une constante.

### L'incident du harnais mort
Un commentaire que j'ai écrit dans le smoke contenait des **backticks**. Ce bloc vit dans un
template literal passé à `executeJavaScript` : le backtick l'a TERMINÉ au milieu, et le harnais
n'a plus démarré du tout. Or **quand il ne démarre pas, les filtres rendent du VIDE** — ce qui
ressemble à un silence, pas à un échec. J'ai cru pendant deux exécutions que mes mutations
étaient concluantes alors que rien ne tournait.

Deux leçons, écrites sur place dans le fichier :
- **Aucun backtick dans renderer-smoke.cjs** hors délimiteurs.
- **Une sortie vide n'est pas un succès** : toujours exiger la ligne `SMOKE OK`, jamais se
  contenter de l'absence d'erreur.

### Deux tests faux avant deux bugs
Sur les 5 échecs rencontrés à l'itération 11, **4 venaient de mes tests, pas du code** :
un plafond intentionnel pris pour un bug, et surtout un **jeu d'essai synthétique** dont les
zones ne correspondaient à aucun focus — toutes les séances sortaient vides et le test accusait
le code. Rebranché sur la vraie bibliothèque d'exercices, tout passait.

Leçon : *un jeu d'essai irréaliste ne prouve rien, ni dans un sens ni dans l'autre.*

620 tests · SMOKE OK · 390 px propre.

## Itération 12 — revue partielle, et un incident de méthode

### La revue multi-agents n'a PAS tourné
Les quatre agents chercheurs ont tous heurté la limite de session. Le workflow a
rendu `{confirmees:[], rejetees:[], note:'aucune trouvaille brute'}` — **ce qui
ressemble à « aucun défaut trouvé » alors que rien n'a été examiné.**

C'est la deuxième fois dans cette boucle qu'un résultat vide se fait passer pour
un succès (la première : le harnais de smoke mort qui rendait des greps vides).
La règle vaut donc au-delà du smoke : **un résultat vide doit être prouvé vide,
jamais supposé.** Un workflow qui rend une liste vide doit être recoupé avec son
compte d'agents en erreur (`agents_error`) avant d'être cru.

### Revue manuelle, quatre angles
1. **Régressions du plancher retiré** — `runPlanWeek` n'a que deux appelants :
   `runRunPlan` (dont le sélecteur ne propose que 4/5/6, jamais < 3) et
   `objectiveProgram`. `PATTERN[0] = []` ne provoque aucun `days[i]` indéfini,
   la boucle `.map` ne s'exécute pas. RAS.
2. **Migration** — `{...defaults, ...input}` est une fusion de SURFACE : un
   `goals` sauvegardé remplace entièrement celui par défaut, donc `runs` arrive
   `undefined` → normalisé en `'auto'`. Couvert.
   Et surtout : `goals.progSessions` (volume du programme) et `goals.sessions`
   (objectif hebdo, qui alimente la dépense énergétique) restent **étanches** —
   vérifié, les quatre appels `sessionsPerWeek:` lisent `goals.sessions`. Sans
   ça, régler son programme aurait déplacé ses calories.
3. **Rendu** — `#coachForme` et `#coachAutres` sont rendus AVANT le retour
   anticipé `if(!f)`, donc visibles même les jours sans focus. Règles `[hidden]`
   présentes sous chaque `display:`.
4. **Cohérence** — **UN DÉFAUT TROUVÉ ET CORRIGÉ** (voir ci-dessous).

### Le défaut : le coach affirmait faux
La carte « ce qui te bride aujourd'hui » retombe sur le DERNIER check-in quand
il n'y en a pas du jour. Avec un check-in du 4 juillet, le 28 elle affirmait
« 4 h — c'est ce qui pèse le plus sur ta forme du jour ».

Un score chiffré reste ambigu ; **une phrase est une affirmation, et elle doit
être vraie.** Au-delà de 2 jours le coach se tait.

### Ce que cette revue n'a PAS couvert
Faute d'agents : la relecture croisée du diff CSS, les chemins d'import/export
de sauvegarde, et une vérification adversariale indépendante de mes propres
conclusions. **La revue complète reste due.**

621 tests · SMOKE OK · 390 px propre.

## Itérations 14-15 — les coachs se parlent enfin

**Mandat d'Adrien** : « Améliore beaucoup les coachs, et qu'ils soient connectés entre eux. »

**14.** `trainingWeekPlan` + `trainingPlanInputs` : une seule source de vérité, qui
COMPOSE les briques testées au lieu de les réécrire. Deux défauts trouvés par ma
propre sonde avant tout test (readiness absente lue comme « forme nulle » ;
« 7 séances » annoncées pour 6 posées).

**15.** Les deux écrans branchés dessus, puis l'agenda dédoublé.

### Ce que la sonde a tranché : qui décide ?
Le profil par défaut étant en déficit, la politique ramenait **8 séances demandées
à 7**. Elle passait outre un choix explicite — or Adrien avait justement demandé de
pouvoir en mettre plus. Nouveau contrat :
- **réglage manuel → le choix d'Adrien GAGNE**, la politique conseille sans imposer ;
- **« auto » → la politique façonne**, c'est ce qu'auto veut dire.

Dans les deux cas l'écart est dit. Et un message ne décrit que ce qui S'EST PASSÉ :
sur un réglage manuel aucune coupe n'a lieu, annoncer « volume réduit » serait faux.

### Le doublon d'agenda, mesuré
Les deux écrans montrant la même semaine, chaque bouton « Programmer » écrivait avec
son propre préfixe de refId (`objprog-` vs `coachweek-`), idempotent **dans sa famille
seulement** : 24 séances puis 24 de plus, **12 créneaux portant deux blocs identiques**.
Un seul planificateur désormais — le second clic ne fait rien, quel que soit l'écran.

### Un test qui codait le mauvais sujet
Le check du pluriel vérifiait « 4 courses/sem. » en dur : il testait donc le NOMBRE
alors que son sujet est l'ACCORD. Il cassait au premier changement de volume légitime.
Réécrit sur la grammaire du nombre réellement affiché.

Leçon : *un test doit asserter son SUJET, pas une valeur qui se trouve vraie ce jour-là.*

624 tests · SMOKE OK · 390 px propre.

## Itérations 16-17 — la revue complète, et ce qu'elle a révélé

La revue adversariale a enfin tourné en entier : **45 agents, 3 angles, chaque
trouvaille soumise à 3 sceptiques chargés de la réfuter**. Résultat : **13 défauts
confirmés**, dont plusieurs à 0 réfutation sur 3. Tous introduits par moi le matin
même, en trois itérations.

### Le plus grave : une politique décorative
`volumeFactor` n'était consommé NULLE PART ailleurs que dans son propre message, et
`duresMax` n'était lu nulle part du tout. Le coach annonçait « volume réduit de 30 % »
et « une seule séance dure » au-dessus d'une semaine strictement inchangée.

**Un coach qui prétend te protéger sans rien faire est pire qu'un coach muet.**
Corrigé en rendant la politique réelle, pas en retirant la phrase.

### La leçon de fond de ces deux itérations
Trois défauts distincts venaient tous d'un même geste : **écrire le message avant
d'écrire l'effet**. La phrase existait, l'action non. C'est confortable — ça se teste
mal et ça se lit bien.

Garde-fou ajouté aux consignes : *un message qui décrit un effet doit être poussé
APRÈS l'effet, et citer la mesure réelle, pas l'intention.*

### Zéro n'est pas absent (le pendant du piège de ce matin)
`Number('nawak') || 0` vaut 0 : une sauvegarde abîmée supprimait TOUTES les courses.
`String(0 || 'auto')` vaut 'auto' : choisir « 0 course » réaffichait « auto ».
Le matin c'était « null n'est pas zéro » ; l'après-midi, « zéro n'est pas absent ».

### Trois familles d'identifiants, trois plannings
Le panneau « Ma semaine » écrivait une TROISIÈME famille de refId que la
déduplication ignorait : 24 séances, puis 19 de plus, **9 créneaux doublés**.
Garde-fou par CRÉNEAU posé (la déduplication par identifiant ne peut pas voir ce cas).

**Décision produit en attente d'Adrien** : ce panneau reste un troisième générateur de
semaine, aveugle au déficit et à la forme. Le fusionner avec le plan unifié ou le
masquer n'est pas à moi de le trancher.

### Restent à traiter (itération 18)
- Le focus du moment conseille encore « ajoute du cardio » hors de la branche stagnation.
- Le compagnon d'entraînement et le bilan hebdo affirment « ta forme du jour » à partir
  d'un check-in vieux de trois semaines (même défaut que celui corrigé sur #coachForme).

629 tests · SMOKE OK · 390 px propre.

## Itération 18 — les 13 défauts de la revue sont soldés

Deux derniers, et tous deux du même genre : **le coach parlait avec plus d'assurance
que ses données ne le permettaient.**

### « Ajoute du cardio » quand le déficit est inconnu
Cette branche sert quand le plateau n'est PAS confirmé (moins de 14 jours) ou que le
profil est incomplet — donc quand le déficit est inconnu. Y prescrire une coupe et du
cardio était doublement prématuré : contraire au bon conseil sur un déficit déjà
marqué, et sans objet sur une stagnation qui n'en est pas encore une.
Remplacé par un conseil vrai quel que soit le déficit. Quand le plateau se confirme,
le bloc informé reprend la main avec son chiffre.

### Une seule notion de « ta forme du jour »
**Quatorze** endroits lisaient `recovery.at(-1)` sans regarder sa date. `recoveryFraiche`
centralise : au-delà de 2 jours elle rend null, et l'appelant se tait. Les deux panneaux
qui AFFIRMENT sur aujourd'hui (mission control, compagnon d'entraînement) sont branchés.
Les autres usages (ajuster l'intensité d'une séance à partir du dernier état connu)
restent légitimes et n'ont pas été touchés.

### Le fil rouge de la journée
Presque tous les défauts trouvés se ramènent à **un écart entre ce que l'app DIT et ce
qu'elle FAIT** :
- volumeFactor annonçait une coupe qui n'existait pas ;
- duresMax promettait une semaine que l'app ne produisait pas ;
- le compteur annonçait 24 séances pour 28 affichées ;
- le bandeau réclamait des champs déjà remplis ;
- le sélecteur affichait « auto » sur un 0 enregistré ;
- deux panneaux affirmaient « aujourd'hui » sur des données de trois semaines.

Ce n'est pas six bugs, c'est **un seul réflexe** : écrire la phrase avant l'effet, ou
la garder après que l'effet a changé. Le garde-fou est dans les consignes.

630 tests · SMOKE OK · 390 px propre.

## Itération 21 — un bouton qui mentait, et une revue qui n'en était pas une

### La revue a rendu « 0 défaut confirmé ». C'était FAUX.
57 agents sur 60 sont tombés en erreur (limite de session). Les 3 chercheurs, eux,
avaient fini et produit **19 trouvailles** — toutes classées « rejetées » parce que
leurs réfuteurs n'avaient jamais tourné : `votes = 0/0`, donc `survit = false`.

**Un rejet par défaut n'est pas un rejet.** La règle « recouper toute liste vide avec
`agents_error` » a fonctionné — sans elle j'aurais rapporté « aucun défaut » à Adrien
alors que la première trouvaille était grave et vraie.

### Le défaut : « Démarrer cette séance » lançait autre chose
J'avais posé `action='planSeance'` à l'itération 19 **sans jamais le traiter**. Le
gestionnaire connaît `recovery`, `planned`, `mobility`, puis RETOMBE sur la rotation
figée. Le bouton nommait une séance et en lançait une autre.

Et son jumeau : quand la journée n'a pas de muscu, le libellé disait « Voir mon
programme » mais l'action restait `mobility` — le bouton ouvrait une séance guidée de
mobilité au lieu de naviguer.

Vérifié après correction : la séance lancée porte **exactement** les mêmes exercices,
dans le même ordre, que celle nommée au-dessus.

### La leçon, encore la même
C'est le fil rouge, sous une forme nouvelle : **le libellé était écrit, le
comportement non**. Écrire un `action='...'` sans écrire le `if` qui le traite, c'est
exactement écrire la phrase avant l'effet.

Garde-fou : *tout nouvel `action=` doit être suivi, dans le même commit, du cas qui
le traite — et vérifié par un clic réel dans une sonde.*

### Reste dû
17 trouvailles non vérifiées (la réfutation n'a pas tourné). À reprendre quand les
agents répondent. Plusieurs semblent sérieuses : `duresMax` annoncé au-dessus d'une
semaine qui pose deux séances dures, `recoveryFraiche` branché sur 2 sites sur 14,
« la même semaine que sur ton Programme auto » affiché alors que les deux panneaux
sont vides.

632 tests · SMOKE OK · 390 px propre.

## Itération 22 — le fil rouge, troisième passage dans mon propre code

Deux trouvailles de la revue vérifiées à la main (les agents restent limités), toutes
deux confirmées, toutes deux dans du code que j'ai écrit cette semaine.

### « Tu as demandé 5 courses » — non, il ne les a pas demandées
Adrien règle le TOTAL de séances et laisse les courses en « auto ». Le nombre de
courses est alors DÉDUIT par `objectiveWeekShape`. Le message le lui attribuait quand
même : on lui reprochait une décision qu'il n'avait pas prise.
Distinction posée : « tu as demandé » seulement s'il a réglé les courses lui-même,
« ton volume donne » sinon — avec la sortie correspondante (baisser le total OU choisir
les courses).

### « je viserais environ 70 % » — la coupe valait 80 %, et elle avait déjà eu lieu
Le message citait `volumeFactor` (l'intention) au lieu de la coupe mesurée (4 exercices
sur 5 = 80 %). Et il disait « je viserais », comme un conseil, alors que la réduction
était déjà appliquée.

### Un test qui encodait MA croyance, pas le code
J'avais écrit « sur un réglage manuel, rien n'est coupé ». Faux : `perReel` est calculé
sans condition. Le bon comportement est celui du code — Adrien a demandé à choisir son
nombre de SÉANCES, pas à désactiver la protection contre le surentraînement en déficit.
Contrat clarifié, et le message dit maintenant explicitement ce qui n'a PAS bougé.

**Trois fois de suite le même réflexe, sous trois formes :**
1. écrire le message avant l'effet (volumeFactor décoratif) ;
2. écrire le libellé sans le comportement (`action='planSeance'` jamais traité) ;
3. écrire l'intention au lieu de la mesure (70 % annoncé, 80 % appliqué).

C'est toujours la même chose : **le texte est facile, l'effet est difficile, et rien ne
les relie tant qu'on ne mesure pas.** D'où la règle qui marche : pousser le message
APRÈS l'effet, en citant la valeur produite.

633 tests · SMOKE OK · 390 px propre.

### Reste dû
15 trouvailles non vérifiées. Les plus sérieuses en attente : `duresMax` annoncé
au-dessus d'une semaine qui en pose deux, `recoveryFraiche` branché sur 2 sites sur 14,
« la même semaine que ton Programme auto » affiché quand les deux panneaux sont vides.

## Itération 23 — une réfutation, une confirmation

Deux trouvailles de plus vérifiées à la main.

### RÉFUTÉE : « le bandeau promet une séance dure, la semaine en pose deux »
Exécuté : déficit modéré → `duresMax: 1`, et la semaine posée contient exactement
**une** séance dure. Le plafond fonctionne. La trouvaille décrivait l'état d'AVANT le
correctif de l'itération 16 — le chercheur a raisonné sur le code sans l'exécuter.

*Une trouvaille de revue est une hypothèse, pas un fait. Elle se vérifie par exécution.*

### CONFIRMÉE : deux panneaux de la même page se contredisaient
Avec un check-in vieux de 20 jours :
- compagnon : « Récupération **inconnue** » (correct, `recoveryFraiche` l'a rejeté)
- panneau Récupération : « **100/100** · Forme du jour · Prêt à pousser »

Et c'est le FAUX qui était le plus affirmatif. Le panneau lisait `recovery.at(-1)` sans
regarder sa date. Il dit désormais « Dernier check-in il y a 20 jours · refais-le pour
connaître ta forme du jour » — ni vert ni rouge : une absence de mesure n'est pas un
verdict.

### Ma sonde m'a menti avant que le code ne le fasse
Premier essai : le score restait à 100/100 après correction. J'ai failli conclure que le
patch ne marchait pas. En réalité ma sonde appelait `renderRecovery()` — **qui n'existe
pas** — sous un `typeof === 'function'`, donc rien ne se re-rendait et je mesurais l'état
initial. Le vrai nom est `renderRoadmapFeatures`.

*Un garde `typeof x === 'function'` qui protège un appel FAUX transforme un test en
mesure du vide. Faire échouer bruyamment quand la fonction attendue n'existe pas.*

633 tests · SMOKE OK · 390 px propre.

## Itération 24 — enfin du contenu neuf dans le Coach Poids

Adrien a posé la bonne question : « t'as ajouté du contenu aux coachs ? »
Réponse honnête après vérification : **oui pour le coach du jour et le compagnon
d'entraînement, non pour le Coach Poids.** Sur 22 commits depuis v2.7.0, la majorité
sont des correctifs — dont beaucoup de défauts que j'avais moi-même introduits.

Le Coach Poids avait été RÉORGANISÉ (sections repliables) et CONNECTÉ (sa semaine nomme
enfin de vraies séances), mais n'avait reçu **aucune analyse nouvelle**.

### Ce qui manquait : le RYTHME
L'app calculait déjà les deux nombres et ne les confrontait jamais :
- rythme sûr calculé par `safeLossRate` : **0,64 kg/sem**
- rythme réel calculé par `weightTrend` : **1,3 kg/sem**
- verdict affiché : `onTrack: true`, et rien d'autre.

Deux fois trop vite, et l'app disait que tout allait bien. C'est le seul endroit qui
dit maintenant que **perdre plus vite n'est pas mieux**.

Le seuil est un RAPPORT au rythme sûr, jamais une valeur absolue : 0,8 kg/sem est
raisonnable à 110 kg et excessif à 60 kg. Une mutation qui remplace le rapport par un
seuil absolu fait rougir la suite.

### Sur la crédibilité scientifique
Aucune référence inventée. Le raisonnement est énoncé (au-delà d'un certain rythme ce
qui part n'est plus seulement du gras), et le levier qui protège la masse maigre est
déjà tenu ailleurs dans l'app avec une source réelle — protéines à 2,4 g/kg,
Longland 2016 AJCN, déjà citée dans `energyPlan`.

634 tests · SMOKE OK · 390 px propre.

## Itération 25 — l'affûtage au jour près

`taperPlan` calculait la progression de l'affûtage jour par jour et n'était **jamais
rendu** (`grep -c` = 0 dans app.js). Le coach se contentait de la consigne de semaine
issue de `racePhase` : « réduis le volume de 40-50 % » — floue quand la course est
dans trois jours.

**Vérifié avant de brancher qu'il n'y avait pas contradiction** : `racePhase` donne la
cible de la SEMAINE (40-50 %), `taperPlan` la progression qui y mène (15 % à J-7 →
49 % à J-1). C'est la granularité qui manquait, pas un second avis.

### Le jour J n'avait pas de sens
`taperPlan(0)` sert la même note que le reste de la semaine : « réduis ton volume de
51 % ». Le jour de la course, ça n'a aucun sens — la course EST le volume. Traité à
part : le seul conseil utile porte sur le déroulé, pas sur le volume.

### Une source réelle de plus, cachée en fin de phrase
La note se terminait par « … (Bosquet 2007). » — vraie méta-analyse sur l'affûtage,
déjà dans le dépôt, jamais mise en valeur. Séparée du texte, elle devient lisible et
vérifiable. Le jour J, aucune source n'est affichée puisque le conseil n'en cite pas.

### Ma sonde a menti, deuxième fois en deux jours
Le texte mesuré revenait sans aucun « s » : « emaine de cour e ». J'ai failli croire à
une corruption de fichier. En réalité, dans un **template literal**, `\s` s'écrit `s` —
mon `replace(/\s+/g,' ')` était devenu `replace(/s+/g,' ')` et mangeait les « s » du
texte MESURÉ. L'app allait bien.

*Troisième forme du même piège cette semaine : harnais mort, agents en erreur, et
maintenant une sonde qui abîme ce qu'elle mesure. Vérifier l'instrument avant d'accuser
le code.*

635 tests · SMOKE OK · 390 px propre.

## Itération 26 — « quelques jours » alors que ça durait trois mois

Trouvaille de la revue vérifiée à la main, **confirmée**, et c'est encore une phrase que
j'avais écrite moi-même à l'itération 18.

`weightTrend` rend **exactement la même chose** pour trois jours plats et trois MOIS
plats — mesuré. Et l'app écrivait pourtant :

> « Une balance plate quelques jours n'est pas encore un plateau. »

Sur douze semaines de stagnation, c'est faux ET c'est le pire moment pour se tromper :
on répond « tu t'inquiètes trop vite » à quelqu'un qui bloque depuis longtemps.

### Corrigé en MESURANT, pas en retirant la phrase
`dureePlateau` compte depuis quand le poids tient dans une bande. Une bande et non
l'égalité stricte : le poids fluctue naturellement (eau, sel, transit), et compter
chaque oscillation comme un mouvement réduirait tout plateau à un jour.

Le coach dit maintenant « Moins de 100 g par semaine **depuis 21 jours** », et son titre
passe à « Plateau confirmé » au-delà de deux semaines — avec un conseil différent :
à cette durée, ce n'est plus une fluctuation.

**Et sans mesure, il ne dit rien** : le focus du jour, qui n'a pas la donnée, a simplement
perdu son « quelques jours ». Mieux vaut une phrase plus courte qu'une durée inventée.

636 tests · SMOKE OK · 390 px propre.

## Itération 27 — ajuster au milieu de la semaine

Demande d'Adrien : « faut que je puisse ajuster au milieu, par exemple passer de 4 à
5 running en cours de semaine ».

Le plan régénérait la semaine ENTIÈRE à chaque changement : lundi et mardi, déjà faits,
se retrouvaient replanifiés. Désormais il compte ce qui est enregistré depuis lundi et
ne dispose que le RESTE, sur les jours qui restent. Mesuré : mercredi avec 1 muscu et
1 course faites, 4 séances posées au lieu de 6, aucune sur lundi ni mardi.

### Trois défauts trouvés en construisant
1. **Zéro restant donnait une séance.** `objectiveWeekShape` borne le total à 1 minimum —
   correct pour une semaine entière, faux pour un reste vide. Court-circuit posé.
2. **L'avertissement d'empilement comptait sur un seuil FIXE de 6 jours.** En cours de
   semaine il ne reste parfois que deux jours cochés : six séances dessus font trois par
   jour, et l'app n'en disait rien. Il compte maintenant les jours réellement disponibles.
3. **Le bouton « Programmer (4 sem.) » aurait amputé les semaines 2 à 4.** Il répétait la
   semaine réduite. Le plan porte donc DEUX semaines : `week` (ce qui reste, qu'on affiche
   et qu'Adrien ajuste) et `semaineType` (la semaine entière, qu'on répète).

Le troisième n'a été trouvé que parce qu'un check bloquant est passé au rouge. Sans lui,
le défaut serait parti en production silencieusement.

### Un contrat changé sciemment
`planDuJour` ne décrit plus les jours PASSÉS : le plan ne prétend rien sur ce qui est
derrière. Un test l'interrogeait sur hier — réécrit sur un jour à venir.

639 tests · SMOKE OK · 390 px propre.

### Reste dû sur la demande d'Adrien
- Fusion des zones de « Ma semaine » dans le plan unifié.
- Conseils par objectif, dont : pour un corps athlétique il faut de la prise de muscle.

## Itération 28 — fusion des zones, puis conseils par objectif

### Fusion
Les zones cochées dans « Ma semaine » deviennent une consigne mémorisée que le plan
unifié respecte. Priorité composée : d'abord ce qu'Adrien demande, puis ce qui est
reposé — la mémoire départage À L'INTÉRIEUR de son choix.

**Défaut trouvé en construisant** : depuis que le plan calcule deux semaines, il y a DEUX
appels à `objectiveProgram`, donc deux `prioriteZones`. Mon patch n'en a modifié qu'un —
les zones n'agissaient que sur la semaine invisible. Factorisé en une variable.

### Conseils : références VÉRIFIÉES, pas citées de mémoire
Adrien : « tu te bases sur la littérature scientifique ». Ma règle interdisait déjà les
références non vérifiées — j'ai donc cherché avant d'écrire :

- **Schoenfeld, Ogborn & Krieger 2017**, J Sports Sci 35(11):1073-82 — au-delà de 10 séries
  hebdomadaires par muscle, gains nettement supérieurs (~+9,8 % vs ~+5,4 % sous 5 séries).
- **Morton et al. 2018**, Br J Sports Med 52(6):376-84 — les gains plafonnent vers 1,6 g/kg/j.
- **Wilson et al. 2012**, J Strength Cond Res — l'interférence vient de la COURSE (pas du
  vélo) et frappe spécifiquement le BAS du corps.

Ce dernier confirme l'intuition d'Adrien : « athlétique » suppose de la prise de muscle, et
c'est précisément là que la course gêne. Le conseil donne l'alternative concrète (vélo le
jour des jambes, ou espacer de 6 h).

Deux objectifs n'ont **aucune source** — endurance et remise en forme. Le conseil y reste,
la fausse caution non.

Et les conseils citent le contexte : « 3 courses et 2 séances sollicitant les jambes cette
semaine : espace-les. » Un conseil générique est un article de blog.

642 tests · SMOKE OK · 390 px propre.

## Itération 28 (suite) — un check faux depuis longtemps, en silence

En vérifiant après commit, le smoke est passé rouge une fois. Trois runs suivants : vert.
L'échec était transitoire (collision avec mes sondes). **Mais j'avais commité sans
attendre le verdict** — ma chaîne de commandes n'était pas conditionnée. Faute de méthode :
le commit doit suivre le `SMOKE OK`, pas le précéder.

En cherchant, j'ai trouvé bien pire. Mesuré précisément sur un run réel :

| | |
|---|---|
| checks booléens calculés | **394** |
| gardés par un message d'erreur | **210** |
| **jamais lus par personne** | **184** |
| **faux en silence** | **1** — `proteinTargetUnified` |

184 checks calculent un verdict que rien ne consomme. C'est le fil rouge appliqué au
harnais lui-même : calculer sans utiliser.

### Le check faux
Il asseyait `proteinTarget(...) === 145` — la valeur à exactement 80 kg — avec un repli
`|| /\d/.test(s)` qui passait sur n'importe quel chiffre. Il ne vérifiait donc **jamais**
l'unification annoncée par son nom : seulement une constante, sur un élément
(`#nutritionStatus`) qui affiche ce qu'on a MANGÉ, pas la cible.

Réécrit sur son sujet : les deux surfaces qui portent la cible (`#suppProteinTarget` et
`#proteinLabel`) doivent citer ce que `proteinTarget` calcule, à trois poids différents.
Et il est maintenant **gardé** — une mutation qui décale la cible de 7 g le fait rougir.

*Ma première réécriture visait le mauvais élément et échouait à juste titre. J'ai failli
conclure à un défaut de l'app.*

642 tests · SMOKE OK · 390 px propre.

## Itération 29 — le harnais tenu à ses propres règles

Trois sujets, tous nés du même constat : **quelque chose calcule un verdict que rien ne lit.**

**1. La méta-garde.** Mesure sur un run réel : 394 checks booléens, 212 suivis d'un
`if (!checks.X) errors.push(...)`. Les autres pouvaient valoir `false` sans rien casser — et
l'un d'eux l'était depuis longtemps. Plutôt que d'écrire 182 messages (long, et sans effet sur
le *prochain* check ajouté sans message), une règle unique : aucun check ne peut être faux en
silence, et la liste des checks déjà gardés se lit dans la source plutôt que tenue à la main.
Validée en forçant `photoCompare` à false.

**2. « Fragile » calculé sur un check-in mort.** Le seuil (sommeil < 6 h, fatigue ≥ 4,
courbatures ≥ 4) était recopié à l'identique dans **six** rendus, tous sur
`state.recovery.at(-1)`. Une mauvaise nuit saisie il y a trois semaines, plus rien de saisi
depuis, et l'app te déclarait fragile indéfiniment : charges baissées, séance allégée,
« récupération basse » affiché — sur la foi d'une donnée morte. `recoveryFraiche` existait
pour ça, et **son propre commentaire disait « quatorze endroits LISAIENT », au passé, alors
que huit le faisaient encore.** Un commentaire au passé sur un travail inachevé fait croire la
dette payée. Corrigé : `etatFragile`, un seul seuil, qui exige une mesure du jour.
Second défaut trouvé en chemin : le formulaire enregistre `Number(champ.value) || 0`, donc un
champ sommeil vide vaut 0 en base, et `sleep < 6` lisait ce 0 comme une nuit blanche.

**3. Le panneau qui affirme.** Le compagnon écrit « c'est la même semaine que sur ton Programme
auto et ton Coach Poids ». Le check comparait ces deux-là entre eux, jamais celui qui promet.

### Ce que cette itération a appris

*Deux versions de mon propre check n'ont rien testé, SMOKE vert les deux fois.* La première
conditionnait sur « il affirme » — sans check-in, le compagnon n'atteint jamais la phrase. La
seconde tombait un jour de repos. **Seule la mutation l'a dit.** Un check vert ne prouve pas
qu'il a exercé son sujet ; il prouve seulement qu'il n'a pas échoué, ce qui est aussi ce que
fait un check qui ne s'exécute pas. C'est la même erreur que les 182 checks non gardés, à un
étage au-dessus — et je l'ai commise en la corrigeant.

*Une trouvaille réfutée proprement.* « Le compagnon affirme la même semaine alors que les deux
panneaux sont vides » : sondé, faux. Le Programme auto affiche « Aligné sur ton Coach Poids »
même sans objectif choisi. Ma première sonde visait `#coachWeekSchedule`, qui est un **bouton** —
la semaine vit dans `.cw-week`. Mesurer le mauvais élément produit une fausse trouvaille aussi
sûrement qu'un mauvais raisonnement.

*Ne pas sur-généraliser.* `state.weights.at(-1)` suit le même motif que `recovery.at(-1)` mais
n'est **pas** un défaut : une pesée d'il y a trois semaines reste une estimation valable du
poids, alors que le sommeil d'il y a trois semaines ne dit rien de la forme d'aujourd'hui.
Vérifié avant de conclure, pas corrigé par réflexe.

643 tests · SMOKE OK · 390 px propre.

## Itération 30 — l'affûtage atteint enfin les coachs unifiés (axe A : profondeur)

**Sondé avant de juger, et le mandat était inexact sur deux points** — ce qui valait la peine
d'être vérifié : `taperPlan` *est* rendu (`.wp-taper`), et `qualitySession` affiche bien sa
source (« Billat 2000 » est dans la note). Mais la sonde a trouvé bien pire à côté.

**Le défaut.** Marathon dans 10 jours → le plan unifié posait une **VO2max 12×30/30** et une
**sortie longue de 70 min**, pendant que le compagnon annonçait « Cap : objectif dans 1 sem. ».
L'app disait une chose et faisait l'inverse — le fil rouge, en pire : elle prescrivait la
semaine la plus dure possible au pire moment.

**La cause, plus nette que prévu.** `taperPlan` n'est appelé que par `buildTrainingWeek`, le
générateur du panneau « Ma semaine » — **celui qu'on envisage justement de masquer (étape 11)**.
`objectiveProgram`, qui alimente les trois coachs connectés, n'a jamais su affûter. Le seul
générateur qui honorait la course était l'orphelin. Masquer « Ma semaine » sans ce correctif
aurait donc *supprimé* la seule gestion de course de l'app.

**Le correctif.** La course entre dans `trainingPlanInputs` (J-N dérivé exactement comme le
coach le fait déjà — deux calculs du même J-N divergent tôt ou tard), et `trainingWeekPlan`
rabote les durées. Bosquet 2007 : couper le VOLUME, garder la FRÉQUENCE et l'INTENSITÉ — la
séance qualité reste, plus courte. 175 → 150 → 115 → 96 min à J-14 / J-10 / J-3.

### Ce que cette itération a appris

*J'ai raccordé la mauvaise fonction d'abord.* J'ai passé `raceDaysLeft` à `objectiveProgram` en
supposant qu'il savait affûter — la sonde a rendu « pas d'affûtage » trois fois de suite. Deux
paramètres morts retirés. Supposer la capacité d'une fonction coûte autant que supposer sa
signature.

*Le piège du même tableau.* `semaine` **est** `programme.week` quand `assignProgramDays` ne
s'applique pas : mesurer l'avant après la boucle aurait rendu 0 % et fait disparaître le
message en silence. Relevé avant de couper.

*Annoncer la mesure, pas l'intention.* Le plancher à 20 min rend la coupe réelle plus faible
que `cutPct` (45 % tenus à J-3 pour 48 % visés). Une mutation qui remplace la mesure par
l'intention est attrapée par une assertion dédiée.

644 tests · SMOKE OK · 390 px propre.

## Itération 31 — kilomètres dans les coachs, puis précision de saisie (demande d'Adrien)

**1. La dernière capacité unique du panneau orphelin.** L'audit ouvert à l'itération 30 est
terminé : `buildTrainingWeek` consommait cinq options, dont `weeklyKm`+`emphasis` →
`runDistances`. Lui seul prescrivait des **kilomètres** ; les trois coachs unifiés ne disaient
que « Course facile · 35 min ». Câblé. Distances prescrites SEULEMENT si le volume hebdo est
renseigné — sinon `runDistances` retombe sur un défaut (14/22/26 km) qu'Adrien n'a jamais
saisi, et prescrire une distance qu'il n'a pas choisie serait inventer une donnée.
L'affûtage rabote désormais les km autant que les minutes, et le message cite l'unité que
l'écran affiche.

**2. Demande d'Adrien en cours d'itération** : secondes impossibles, 5,14 km refusé, visuel à
revoir. Les deux blocages étaient réels et vérifiables dans le markup (aucun champ secondes ;
`step="0.1"` faisant refuser 5,14 par le NAVIGATEUR). Contrat de `combineDuration` changé
sciemment, stockage laissé en minutes (aucune migration).

### Ce que cette itération a appris

*Une mutation a survécu et je ne l'ai pas maquillée.* J'affirmais que la plus grosse distance
est attribuée « par rôle et non par position » : dans les quatre gabarits, la sortie longue est
toujours en dernier, donc les deux implémentations sont **indiscernables**. Le code par rôle
reste défensif, mais l'assertion ne revendique plus que ce qu'elle prouve.

*J'ai encore mis des backticks dans renderer-smoke.cjs* — dans un commentaire, autour de `step`
et `checkValidity()`. La règle est écrite dans ce fichier, par moi. Cette fois elle a été
attrapée par `node --check` avant le run, pas par un grep vide.

*Tester la contrainte VÉCUE.* Pour la distance, `checkValidity()` teste ce qu'Adrien a
rencontré — le refus du navigateur — et non notre idée de ce que le champ accepte.

*La précision doit se REVOIR.* J'ai introduit puis corrigé le défaut dans la même itération :
durée fractionnaire affichée « 93.33333333333333 min », distance rabotée par `toFixed(1)`.
Promettre le mètre et l'effacer à l'affichage, c'était le fil rouge appliqué à la demande
elle-même. Sondé : la liste affichait aussi « +undefined XP » sur une séance importée.

645 tests · SMOKE OK · 390 px propre.

## Itération 32 — v2.8.0 publiée, puis l'Analyse rendue voyante

**Publication.** v2.8.0 taguée à la demande d'Adrien : installeur Windows, blockmap et
`latest.yml` en ligne (electron-updater la prendra), PWA déployée. 41 commits depuis v2.7.0.

**Sondage des quatre sous-onglets Athlète à 390 px.** Aucun débordement, aucun champ sous
16 px, aucun panneau vide — la structure tient. Mais « Force & endurance » ne rendait que
98 caractères malgré huit semaines d'historique.

**La cause.** `state.workouts.filter(w => w.exercise && w.load)` ne lit que le format LEGACY à
plat ; l'app écrit `exercises[].setLogs[]` depuis longtemps. Le volume sommait
`load × sets × reps` — zéro sur toute séance moderne. Corrigé par `analysePerformance`, qui
s'appuie sur les fonctions gérant déjà les deux formats, et qui affiche enfin
`bestE1rmByExercise` (1RM estimé, Epley) — testé depuis toujours, rendu nulle part.

### Ce que cette itération a appris

*J'ai appelé la mauvaise fonction de rendu DEUX fois dans la même session.* `renderWorkouts`
(inexistante) puis `renderAthlete` là où le panneau est peint par `renderGrowth`. La première
fois le check a échoué franchement ; la seconde, il affichait l'état vide et j'ai failli
conclure que ma correction ne marchait pas. **Une sonde qui ne re-rend pas mesure l'écran
d'avant** — et mon « 98 caractères » initial était, en partie, cet artefact-là. Le défaut du
filtre legacy, lui, était bien réel et reste confirmé par mutation.

*Deux regex tués par le template literal, coup sur coup.* `\/` devient `/` et termine
l'expression ; `\n` devient un VRAI saut de ligne et casse le littéral. Même famille que le
`\s` devenu `s`. La parade n'est pas d'empiler les antislashs mais de ne pas utiliser de regex
là-dedans : `indexOf` et `split(String.fromCharCode(10))` ne traversent aucun échappement.

*Ne pas afficher un zéro faux.* `blockWindowStats().sets` compte le champ `sets` et jamais
`setLogs` : il aurait affiché « 0 série » sur les séances modernes. Écarté sciemment.

646 tests · SMOKE OK · 390 px propre.

## Itération 33 — un diagnostic qui dit par quoi commencer

**Balayage d'abord.** Le défaut de l'itération 32 (panneau aveugle au format moderne)
appartenait-il à une famille ? Vérifié : `exerciseEntries` et `neglectedZoneReport` gèrent bien
les deux formats, et la séance guidée écrit `completedSets` À CÔTÉ de `setLogs`. Le panneau
Analyse était le dernier aveugle. Mesuré, pas supposé.

**Le vrai manque.** Onze fonctions écrites et testées ne sont rendues NULLE PART
(`sleepRegularity`, `proteinAdherenceTrend`, `zoneTopExercises`, `blockProgressText`…). L'app
nommait « Zone à rattraper : Épaules » sans jamais dire quoi faire. `zoneRattrapage` croise le
classement existant avec le filtre matériel — proposer du kettlebell à qui n'en a pas, c'est un
coach qui ignore ton équipement.

### Ce que cette itération a appris

*Mon jeu d'essai n'était pas réaliste, et j'ai failli corriger l'app pour ça.* Mes séances
n'avaient que `setLogs` ; une séance guidée réelle écrit AUSSI `completedSets`. J'ai cru un
instant que `neglectedZoneReport` était aveugle — c'est ma sonde qui l'était.

*Un remplacement a visé la mauvaise occurrence.* `state.workouts = w;` existe dans plusieurs
checks : mon patch a injecté `state.blockStart` dans le check VOISIN, sans restauration, et
trois checks sans rapport sont tombés. Le harnais l'a dit franchement — mais la cause n'était
pas là où l'échec s'affichait.

*Backticks dans le harnais : troisième fois.* Cette fois j'ai ajouté au patch une vérification
automatique des backticks suspects après écriture, au lieu de compter sur ma vigilance.

*J'ai renoncé à un check, et je l'écris.* Le rendu de cette zone est derrière un bloc
d'entraînement actif que je n'ai pas su reproduire dans le harnais en un temps raisonnable.
Plutôt que de poser un check creux — ou de le laisser rouge — je garde les tests purs
(mutation-validés) et je note le câblage écran comme NON garanti. Un garde-fou qu'on croit
avoir est pire que pas de garde-fou du tout.

647 tests · SMOKE OK · 390 px propre.

### Dette ouverte
- Câblage écran de `zoneRattrapage` non gardé (voir ci-dessus).
- Dix fonctions encore jamais rendues : sommeil (`sleepRegularity`, `bedtimeRegularity`,
  `sleepDurationTrend`), adhérence (`proteinAdherenceTrend`, `hydrationAdherenceTrend`,
  `fieldAdherenceTrend`), force (`blockProgressText`, `progressSets`), `focusMinutesTrend`,
  `workoutDominantZone`.

## Itération 34 — la dette d'hier payée, et ce qu'elle cachait

**Dette soldée.** Hier j'avais noté noir sur blanc : « câblage écran de `zoneRattrapage` non
gardé ». J'ai posé le check aujourd'hui. Il a trouvé le défaut en un run : je passais
`state.exercises`, **un champ qui n'existe pas** — seule occurrence du fichier, et c'était la
mienne. La fonction rendait `[]` à tous les coups : la ligne « Par quoi commencer » ne s'est
jamais affichée. Fonctionnalité livrée verte, mutation-validée côté logique, **morte à l'écran**.

C'est le fil rouge du dépôt appliqué à mon propre travail : un écart entre ce que l'app dit
faire et ce qu'elle fait. Et la seule chose qui l'a révélé est le garde-fou que j'avais renoncé
à poser. **Renoncer à un check coûte plus cher que de le poser.**

### Ce que cette itération a appris

*Mes trois échecs d'hier avaient une cause unique et bête* : les sondes lisaient l'état APRÈS
la restauration, donc elles mesuraient toujours l'écran d'avant. Déplacées au moment du rendu,
elles ont tout montré en trois minutes — panneau visible, zone négligée présente, bibliothèque
vide. J'ai passé une itération entière à conclure « le panneau est inatteignable » alors que je
regardais au mauvais instant.

*Une mutation a survécu, et elle avait raison.* La zone négligée du jeu d'essai était « abdos »,
dont les meilleurs exercices sont tous au poids du corps : le filtre matériel n'y changeait
rien, donc le test n'en prouvait rien. Jeu d'essai corrigé pour que la zone bascule sur le dos,
et l'assertion EXIGE désormais que le cas « tout le matériel » propose un exercice qui en
demande — si la zone redevenait non discriminante, le check tomberait au lieu de passer à vide.

647 tests · SMOKE OK · 390 px propre.

### Dette ouverte
- Dix fonctions encore jamais rendues : sommeil (`sleepRegularity`, `bedtimeRegularity`,
  `sleepDurationTrend`), adhérence (`proteinAdherenceTrend`, `hydrationAdherenceTrend`,
  `fieldAdherenceTrend`), force (`blockProgressText`, `progressSets`), `focusMinutesTrend`,
  `workoutDominantZone`.
- Étape 11 (panneau « Ma semaine ») : toujours la décision d'Adrien.

## Itération 35 — la famille du défaut d'hier fermée, puis la régularité du sommeil

**1. Revue systématique.** Le défaut de l'itération 34 (`state.exercises`, un champ inventé,
fonctionnalité muette et tests verts) posait une question : y en a-t-il d'autres ? Balayage
outillé : 68 clés déclarées, 69 lues, **zéro fantôme**. Le mien était le seul. J'ai validé
l'outil en y remettant le bug — il le retrouve et le nomme — puis j'en ai fait un test
permanent. En JavaScript, lire une propriété absente ne coûte qu'un `undefined` silencieux :
seule une garde structurelle peut fermer cette famille.

**2. Profondeur (axe A).** `sleepRegularity`, `bedtimeRegularity`, `sleepDurationTrend` :
trois mesures calculées, affichées nulle part. Le coach dit maintenant ce que l'app ne disait
pas du tout — la RÉGULARITÉ compte, pas seulement la durée — avec Windred et al. 2023
(SLEEP 47(1):zsad253, UK Biobank, 60 977 participants), **référence vérifiée en ligne avant
d'être écrite**. Un seul frein nommé à la fois, et la source citée uniquement là où elle porte
(le seuil de 7 h est une convention, pas un résultat : ce cas n'affiche aucune référence).

### Ce que cette itération a appris

*Une mutation a survécu, et elle avait raison — encore.* Mon assertion « 2 nuits → rien »
passait parce que `sleepRegularity` rend déjà null sous 3 nuits : elle ne touchait JAMAIS mon
seuil de 7. Le cas discriminant est **six** nuits, où la mesure existe et où c'est bien ma garde
qui doit se taire. Deuxième itération d'affilée où la mutation révèle un test qui passe pour la
mauvaise raison — c'est le seul outil qui distingue « ça marche » de « je n'ai rien testé ».

*Ma vérification automatique des backticks a payé au premier essai.* Quatrième récidive du même
piège, mais cette fois nommée avant le run au lieu de coûter un aller-retour. Une règle qu'on
n'arrive pas à suivre doit devenir un outil.

649 tests · SMOKE OK · 390 px propre.

### Dette ouverte
- Sept fonctions encore jamais rendues : `focusMinutesTrend`, `proteinAdherenceTrend`,
  `hydrationAdherenceTrend`, `fieldAdherenceTrend`, `blockProgressText`, `progressSets`,
  `workoutDominantZone`.
- Étape 11 (panneau « Ma semaine ») : toujours la décision d'Adrien.

## Itération 36 — de « où tu en es » à « où tu vas » (axe A)

**Le manque.** L'app affichait « 5/7 j ≥ 145 g » : la semaine en cours, et rien d'autre.
`proteinAdherenceTrend` et `hydrationAdherenceTrend` comparaient déjà cette semaine à la
précédente depuis toujours, et n'étaient lues NULLE PART. Un décrochage de 7/7 à 0/7 était
donc parfaitement invisible. Le panneau dit maintenant les DEUX semaines, nomme un seul frein
(le plus fort), et se tait tant qu'il n'y a rien à comparer.

**Sondage payant, deux fois.** Ma première sonde a fait croire à un défaut d'hydratation
(0 jour atteint alors que 2,6 ≥ 2,5) : en réalité la cible est en VERRES, pas en litres, et
`Math.round` la ramenait à 3. Le code était juste, mon jeu d'essai faux. Puis la sonde de ma
propre fonction a révélé un vrai défaut avant qu'il n'atteigne l'app : le tri retenait le PIRE,
donc quand rien ne baissait je tombais sur le plus plat et l'app annonçait « stable » alors
qu'un intrant avait gagné 7 jours.

### Ce que cette itération a appris

*Sonder AVANT de construire évite d'accuser le code.* Deux fois de suite, l'anomalie apparente
venait de mon jeu d'essai (unité en verres) ou de ma propre logique (tri), jamais du code
existant. La règle « vérifier ce que la fonction rend avant de bâtir autour » a payé
directement.

*Les trois mutations ne mordent pas au même endroit, et c'est normal.* Celle sur la source ne
touche que le test node : le check du harnais n'exerce que le cas protéines, où la citation est
correcte des deux côtés. Le noter explicitement vaut mieux que d'élargir le check jusqu'à ce
qu'il attrape tout — chaque garde couvre son périmètre, à condition qu'on sache lequel.

650 tests · SMOKE OK · 390 px propre.

### Dette ouverte
- Cinq fonctions encore jamais rendues : `focusMinutesTrend`, `blockProgressText`,
  `progressSets`, `workoutDominantZone`, `bedtimeRegularityTrend`.
- Étape 11 (panneau « Ma semaine ») : toujours la décision d'Adrien.

## Itération 37 — revue : j'avais construit un doublon

**La question posée.** J'ai ajouté trois blocs de coaching en trois itérations. Est-ce que
l'écran est saturé ? Mesuré : **douze blocs, 2199 caractères d'avis** au total. Répartis sur
plusieurs pages, donc pas de saturation — mais **trois blocs sommeil dans le MÊME panneau**,
dont deux qui disent la même chose avec le même chiffre :

- `#sleepCoach` : « Durée correcte (moy. 7.5 h) mais coucher irrégulier (~75 min d'écart) »
- `#sleepRegularite` : « Ton heure de coucher part dans tous les sens — ±75 min »

**J'ai créé le second à l'itération 35 sans lire `sleepCoachInsight`**, qui couvrait déjà ce
sujet en appelant les mêmes fonctions, et qui possède même une option `actionCarried` pour ne
pas répéter un conseil porté ailleurs. La piste du mandat disait ces fonctions « jamais
rendues » — c'était inexact, et je ne l'ai pas vérifié.

**Correction : l'occupant gagne.** Mon bloc est retiré en entier (fonction, rendu, markup,
styles, test, check), et la seule chose qu'il apportait vraiment — la référence vérifiée — est
reversée dans l'occupant, uniquement sur les verdicts d'irrégularité. Bilan : 214 lignes
supprimées, 86 ajoutées.

### Ce que cette itération a appris

*Ajouter est plus facile que vérifier, et c'est le piège de l'axe « profondeur ».* Trois
itérations à empiler du contenu utile, et l'une d'elles a produit un doublon visible à
l'écran. Mesurer l'ÉCRAN — pas la liste des fonctions non rendues — était le seul moyen de le
voir.

*Une piste de mandat n'est pas une mesure.* « `sleepRegularity` jamais rendue » était faux :
elle était consommée par une fonction rendue. Je l'ai pris pour argent comptant à l'itération
35 alors que ma propre règle dit de vérifier ce que la fonction rend AVANT de construire.

*Le même sondage a trouvé un second défaut, plus ancien* : « 0 min de focus le lendemain,
contre 0 min plus tard » — l'absence de donnée présentée comme un résultat.

650 tests · SMOKE OK · 390 px propre.

### Dette ouverte
- Quatre fonctions jamais rendues, à VÉRIFIER une par une avant de construire :
  `focusMinutesTrend`, `blockProgressText`, `progressSets`, `workoutDominantZone`.
- Étape 11 (panneau « Ma semaine ») : toujours la décision d'Adrien.

## Itération 38 — la liste de dette était fausse, le bilan hebdo ne l'était pas

**Vérification d'abord (leçon de l'itération 37).** Les quatre dernières fonctions « jamais
exploitées » : `focusMinutesTrend`, `blockProgressText`, `progressSets`, `workoutDominantZone`.
Deux commandes ont suffi — **toutes les quatre sont consommées par des fonctions qui, elles,
sont rendues** (`adaptiveCoachFocus`, `shareableBlockProgress`, `phaseSetsForDay`,
`contextualWellnessRoutine`). La liste du mandat est fausse sur toute la ligne, comme elle
l'était pour `sleepRegularity`. Vérifier a coûté deux minutes et m'a évité un second doublon.

**Donc : mesurer l'écran, pas la liste.** Sondé le bilan hebdomadaire, jamais examiné :
« 1/4 séances — encore 3 séances pour ton objectif hebdo » est RIGOUREUSEMENT le même texte,
même ton, un mardi et un dimanche soir. `semaineEnCours` calculait déjà les jours restants,
pour le plan seulement. Le verdict suit désormais la FAISABILITÉ : 3 séances sur 6 jours →
neutre, 3 sur 1 jour → « trop serré, vise 2/4 » — une cible atteignable plutôt qu'un
rattrapage impossible.

### Ce que cette itération a appris

*Ma sonde était fautive avant l'app.* J'ai d'abord cru que le bilan comptait mal (1 séance sur
5 posées) : mes dates tombaient hors de la semaine courante. Vérifier avant d'accuser, encore.

*Deux tests existants sont tombés, et j'ai tranché.* Contrat changé sciemment : leur sujet réel
est l'accord singulier/pluriel, pas la phrase. Réassertés sur la formulation actuelle, raison
écrite sur place — jamais assouplis en silence.

*J'ai écrit une branche inatteignable et je l'ai retirée.* `joursRestants` contient toujours
aujourd'hui : sa longueur ne vaut jamais 0, donc mon cas « la semaine est finie » était mort.
Du code qui prétend couvrir une situation impossible ment sur la couverture réelle.

*Le piège d'échappement, hors du harnais cette fois.* Un `\/` dans un patch écrit en heredoc
s'est fait manger et a produit une regex invalide qui a cassé TOUT le fichier de tests
(« # pass 0 »). Même parade : `indexOf` ne traverse aucun échappement.

651 tests · SMOKE OK · 390 px propre.

### Dette ouverte
- **La liste « fonctions jamais exploitées » du mandat est périmée** : les 4 dernières sont
  toutes consommées par des fonctions rendues. Chercher la profondeur en SONDANT l'écran.
- Étape 11 (panneau « Ma semaine ») : toujours la décision d'Adrien.

## Itération 39 — les six demandes d'Adrien, puis v2.9.0

Diagnostic parallèle (6 sondes en lecture seule) avant toute écriture, puis reproduction en
exécutant l'app pour ce que la lecture de code ne pouvait pas trancher.

**1. « Programmer » ne remplissait pas l'agenda.** Reproduit en cliquant : 28 séances écrites,
**0 dans la semaine en cours** — tout partait de lundi PROCHAIN. `weekProgramSchedule` faisait
déjà ce qu'il fallait et l'autre bouton de l'app l'utilisait : deux boutons, deux règles.
Aligné. Trois conséquences traitées : même ancrage sur le repli du Coach Poids, purge partant
d'aujourd'hui, et **garde par créneau** ajouté (il n'existait que dans le planificateur — tant
que le programme démarrait la semaine suivante, la collision était impossible).

**2. 8 semaines.** `blockPhase` cyclait déjà modulo 4 : il suffisait d'arrêter d'écraser
l'index. Deux mésocycles, décharge toutes les 4 semaines.

**3. Séance guidée étape par étape.** Écran « prêt ? », décompte de 5 s passable, une série mise
en avant à la fois, enchaînement automatique après le repos. La série courante est DÉDUITE
(première non validée) et non stockée : un index et des cases à cocher finiraient par se
contredire.

**4. « Charge » sur des pompes.** C'était le placeholder de repli du champ kg, affiché dès que
la suggestion de progression est nulle — donc toujours au poids du corps.

**5. Nutrition au choix.** Cinq programmes ; le choix est ouvert, le coût est annoncé. Plancher
au métabolisme de base, expliqué au lieu d'être imposé.

**6. « Programme auto » → « Plan de bataille ».**

### Ce que cette itération a appris

*Le diagnostic parallèle a payé, mais l'exécution a tranché.* Les agents ont lu le code et
trouvé la cause exacte (`monday + 7`) ; c'est la reproduction en cliquant pour de vrai qui a
donné le chiffre qui compte : 0 séance dans la semaine en cours.

*Ma méta-garde a servi pour la première fois en conditions réelles.* Le passage à 8 semaines a
rendu le check `currentBlock` faux — il n'avait aucun message dédié et serait passé inaperçu.

*Quatre checks/tests sont tombés, tous par contrat changé sciemment*, jamais assouplis :
l'onboarding épinglait `week.length * 4` (ce qui n'est vrai que si l'on démarre lundi prochain),
`agendaSansDoublon` posait 4 semaines à la main pendant que le bouton en pose 8, et deux tests
de bloc dataient la fin à 28 jours.

*Le piège de la mauvaise occurrence, deuxième fois.* En restaurant une mutation, un remplacement
de `return false;` a frappé un filtre géographique sans rapport et cassé 4 tests.

653 tests · SMOKE OK · 390 px propre · **v2.9.0 publiée** (installeur + latest.yml en ligne).

## Itération 40 — revue de la v2.9.0 : je livrais trop vite

**La revue adversariale a échoué à mi-parcours** — 29 agents sur 34 se sont arrêtés sur la
limite de session. Son `confirmees: []` ne prouve donc RIEN : c'est le cas exact que ma propre
règle décrit (« un vide n'est pas un succès, recouper avec `agents_error` »). Restent
29 trouvailles brutes, non réfutées, que je vérifie une par une moi-même.

**Ce que j'ai confirmé et corrigé, tout venant de MOI, en livrant vite :**

1. **Le sélecteur nutrition ne pilotait rien.** Mesuré en faisant tourner l'app : dans le même
   panneau, à trois lignes d'écart, le bloc disait 2217 kcal et le bandeau 2463 — et le plan
   gardait 2463 quel que soit le choix. Corrigé à la source.
2. **Le passage à 8 semaines était à moitié fait.** Des boutons libellés « Programmer
   8 semaines » en programmaient 4 (Coach Poids, plan de course, nouveau bloc, onboarding),
   « Bloc de 4 semaines terminé » s'affichait après 8, la frise n'avait que 4 pastilles sous un
   compteur allant à 8, et « Dernière semaine du bloc » tombait à la S4.
3. **J'avais sur-corrigé le « Charge ».** En masquant le champ kg au poids du corps, j'ai cassé
   une fonctionnalité documentée : `vestProgression` suit « ta meilleure série lestée » sur
   tractions et pompes. Le champ redevient visible, libellé **« lest »** et mis en retrait — la
   plainte d'Adrien portait sur le mot « Charge » qui réclamait une valeur, pas sur le champ.

### Ce que cette itération a appris

*Livrer six choses d'un coup coûte une itération entière de rattrapage.* Chaque changement était
vérifié isolément ; c'est leur ASSEMBLAGE qui était faux. Le passage à 8 semaines touchait plus
d'endroits que ceux que j'avais listés.

*Ma méta-garde a de nouveau attrapé un check devenu faux sans message* (`blockHeadsUp`).

*Sur-corriger est aussi un défaut.* La demande était « ne me réclame pas une charge sur des
pompes », pas « enlève-moi la possibilité de noter mon gilet lesté ».

*Cinquième récidive des backticks dans le harnais*, et quatrième regex mangée par le template
literal. La vérification automatique les attrape désormais, mais je continue d'en écrire.

654 tests · SMOKE OK · 390 px propre.

## Itération 41 — finir de vérifier au lieu d'ajouter

La revue de l'itération 40 avait laissé 29 trouvailles non réfutées (workflow interrompu par la
limite de session). Plutôt que d'empiler du neuf, j'ai tranché celles qui portaient sur la
séance guidée — la fonctionnalité qu'Adrien a le plus détaillée.

**Trois confirmées, toutes dans le flux que je venais de refaire :**

1. L'écran « prêt ? » n'apparaissait **que pour le premier exercice** : `guidedIndex++` ne
   remettait pas `guidedPret` à faux. Mon propre commentaire affirmait pourtant l'inverse —
   « remis à faux à chaque changement d'exercice ». Un commentaire qui décrit une intention
   jamais codée, écrit de ma main.
2. Fermer le dialogue n'arrêtait pas le décompte : l'intervalle survivait et re-rendait un
   écran fermé cinq secondes plus tard.
3. Un repos complet partait après la **dernière** série — 90 s d'attente avant rien.

### Ce que cette itération a appris

*Le check ne pouvait pas voir le défaut n° 1.* Il exerçait une séance à UN exercice ; le
« prêt ? » du second n'existait pas dans le scénario. Un garde-fou ne protège que ce que son
jeu d'essai traverse — la leçon « écrire le test sur le scénario où la chose testée fait une
différence », appliquée à un cas où le scénario lui-même était trop pauvre.

*Vérifier les trouvailles en attente vaut mieux qu'en produire de nouvelles.* Les trois défauts
corrigés ici étaient dans la liste depuis l'itération 40 ; les ignorer pour ajouter une
fonctionnalité aurait laissé la séance guidée à moitié cassée pour Adrien.

654 tests · SMOKE OK · 390 px propre.

### Dette ouverte
- Trouvailles de l'itération 40 encore non vérifiées : la garde par créneau qui perdrait une
  2e séance de même type le même jour ; le repos réglé par ±15 s effacé avant le repos
  automatique ; l'alerte « au-delà de 1 %/semaine » calculée sur le poids du Profil.
- Étape 11 (panneau « Ma semaine ») : toujours la décision d'Adrien.

## Itération 42 — le cap de course (axe A, profondeur)

Premier point de la liste que j'avais annoncée à Adrien. Mesuré avant d'écrire : à 40 jours
d'un marathon, le plan CONNAÎT l'échéance et n'en dit rien — l'affûtage ne démarre qu'à J-14.
Entre l'inscription et les deux dernières semaines, aucun cap. `racePhase` existait, testée,
et n'apparaissait **zéro fois** dans `app.js`.

Le Plan de bataille affiche désormais : « 🏁 Ta course dans 40 jours · **Spécifique** » avec
le focus de la phase.

### Ce que cette itération a appris

*Je suis retombé dans `Number(null) === 0`* — la règle est écrite noir sur blanc dans mon
propre mandat. Sans course, `raceDaysLeft` est null, devient 0, et l'app annonçait « phase
Affûtage » à quelqu'un qui n'a aucune course. Trouvé en sondant ma fonction AVANT de la
brancher, ce qui est la seule bonne nouvelle.

*Une phase qui ment est pire que pas de phase.* `racePhase` bascule en affûtage à 2 semaines
alors que `taperPlan` ne réduit rien avant J-14 : le libellé aurait annoncé « Affûtage »
pendant que le plan tournait à plein régime. Le test porte sur **J-20**, le seul point qui
discrimine — à J-10 les deux versions diraient la même chose.

*Le doublon évité par construction.* Pendant l'affûtage, le focus de phase se tait : le message
de taper dit déjà quoi faire du volume avec les kilomètres réels. Après deux itérations passées
à supprimer des doublons que j'avais créés, celui-ci a été prévu dès l'écriture.

*Une mutation doit rester retrouvable.* L'une des trois remplaçait une ligne par du vide :
impossible à restaurer ensuite. Réparée à la main.

655 tests · SMOKE OK · 390 px propre.

### Reste de la liste annoncée à Adrien
1. ~~La phase de course~~ — faite.
2. L'alerte nutrition « au-delà de 1 %/semaine » se calcule sur `state.profile.weight` (Profil,
   potentiellement périmé) et non sur la dernière pesée. **Vérifié, pas encore corrigé.**
3. Soupçons non vérifiés : garde par créneau qui perdrait une 2e séance de même type le même
   jour ; repos réglé à la main possiblement écrasé.
4. Étape 11 (panneau « Ma semaine ») : décision d'Adrien.

## Itération 43 — l'alerte qui s'éteignait quand on maigrit

Point 2 de la liste annoncée à Adrien. L'avertissement « au-delà de 1 % de ton poids par
semaine » se calculait sur `state.profile.weight` — saisi une fois, jamais mis à jour — alors
que le plan part de la dernière PESÉE.

Mesuré avant de corriger, sur un profil à 80 kg et une pesée réelle à 68 : même plan, mêmes
calories, **1 alerte contre 2**. L'avertissement qui protège le muscle s'éteignait précisément
parce qu'on avait maigri : le poids baisse, le seuil de 1 % baisse avec lui, et l'app
continuait de juger sur l'ancien chiffre.

Corrigé à la source — le poids réellement utilisé par le plan est désormais exposé, et les
écrans cessent de relire le profil de leur côté.

### Ce que cette itération a appris

*Vérifier qu'un défaut a des CONSÉQUENCES avant de le corriger.* Mon premier jeu d'essai
(sédentaire léger) donnait le même verdict avec les deux poids — le plancher calorique
dominait. Un test écrit là-dessus n'aurait rien prouvé. Il a fallu chercher le profil où
l'écart bascule le verdict : très actif, six séances, déficit marqué.

*Un défaut « théorique » et un défaut qui mord ne se corrigent pas avec la même urgence* — mais
on ne peut le savoir qu'en mesurant.

656 tests · SMOKE OK · 390 px propre.

### Reste de la liste annoncée à Adrien
1. ~~La phase de course~~ — faite (itération 42).
2. ~~L'alerte sur le poids périmé~~ — faite.
3. Soupçons non vérifiés de la revue interrompue : garde par créneau qui perdrait une 2e séance
   de même type le même jour ; repos réglé à la main possiblement écrasé par le repos auto.
4. Étape 11 (panneau « Ma semaine ») : décision d'Adrien.

## Itération 44 — les deux derniers soupçons, tous deux réels

Point 3 de la liste annoncée à Adrien : vérifier les soupçons laissés par la revue interrompue.
**Les deux étaient fondés.**

**1. Le repos réglé à la main n'a JAMAIS servi.** Mesuré en exécutant : repos prescrit 75 s,
Adrien monte à 120 s, il valide une série… et le repos qui démarre dure **75 s**.
`renderGuidedWorkout` remettait la valeur prescrite à chaque rendu, et ce rendu a lieu juste
avant le départ du repos. Le défaut précède ma refonte ; mon `endGuidedRest` ne faisait que
l'étendre. Le réglage est désormais retenu pour l'exercice en cours, et le suivant reprend sa
valeur prescrite.

**2. 18 séances sur 48 disparaissaient.** Avec deux jours cochés et six séances par semaine,
plusieurs séances du même type tombent au même créneau : la garde renonçait. Le plan annonçait
six séances par semaine, l'agenda en recevait moins de quatre. On décale de 90 min jusqu'à
trouver un créneau libre. 45 posées sur 48 après correction — les trois manquantes sont le
lundi déjà écoulé, sauté à dessein.

### Ce que cette itération a appris

*Un soupçon non vérifié n'est ni vrai ni faux — mais il coûte à ne pas être tranché.* Ces deux
défauts touchaient directement ce qu'Adrien avait demandé (« le repos en fonction du temps que
j'ai paramétré ») et ce qu'il avait signalé (« les séances ne sont pas dans mon agenda »). Les
laisser en dette, c'était le laisser avec une app qui ne fait pas ce qu'elle annonce.

*Les deux checks portent sur un scénario étroit et volontaire* : deux jours cochés pour six
séances, et un réglage de repos qui change vraiment la valeur. Avec sept jours cochés ou un
réglage égal au prescrit, les deux défauts seraient restés invisibles.

656 tests · SMOKE OK · 390 px propre.

### Reste
- Étape 11 (panneau « Ma semaine ») : **décision d'Adrien**, la seule chose que je ne tranche
  pas seul. Depuis l'itération 30 le masquer ne ferait plus perdre de fonctionnalité.

## Itération 45 — revue : j'avais corrigé un site sur sept

Revue due, portant sur mes propres corrections des itérations 42-44.

**Ce qui tient.** Le décalage de créneau est stable au reclic (45 séances, mêmes heures,
aucun doublon, aucune dérive sur trois clics consécutifs). Vérifié en exécutant.

**Ce qui ne tenait pas.** À l'itération 43 j'ai fait lire la dernière PESÉE à l'alerte
nutrition. Je n'ai pas lu ses voisines : `proteinTarget` était appelé avec le poids du Profil à
**sept endroits**. Écart mesuré : 145 g/jour affichés au lieu de 120 — vingt-cinq grammes, et
le coach d'adhérence jugeait Adrien contre cette cible fausse.

### Ce que cette itération a appris

*Chercher une chaîne ne remplace pas lire les voisines.* Six sites trouvés par grep sur
`proteinTarget(state.profile.weight,` ; le septième était écrit avec l'optional chaining
(`state.profile?.weight`) et restait invisible. C'est la SONDE qui l'a montré : la jauge du
jour affichait 165 g pendant que le panneau compléments affichait 145, à deux écrans d'écart.

*Corriger un site crée une incohérence si on ne corrige pas les autres.* Avant l'itération 43,
les sept écrans étaient faux ENSEMBLE — cohérents dans l'erreur. En en corrigeant un seul,
j'avais créé le défaut que ce dépôt traque : deux nombres pour la même chose.

656 tests · SMOKE OK · 390 px propre.

### Reste
- Étape 11 (panneau « Ma semaine ») : **décision d'Adrien**.

## Itération 46 — fermer la famille, pas seulement le défaut

L'itération 45 avait corrigé sept appels de `proteinTarget` sur un poids périmé. Le septième
site m'avait échappé parce qu'il était écrit avec l'optional chaining. Mais ce n'était que le
symptôme : la cause est que la règle « dernière pesée, profil en repli » était **recopiée à la
main** partout. Chaque copie a l'air correcte isolément ; c'est l'ensemble qui dérive.

**Balayage, y compris la forme qui m'avait échappé.** Douze lectures du poids du Profil
restaient : huit déjà justes, et cinq replis explicites **légitimes** — vérifiés un par un
(`weightGoalProgress` attend un `fallbackStart` qui ne sert que sans aucune pesée ; l'onboarding
pré-remplit un champ). Quatre copies manuelles unifiées.

**Garde structurelle** : un balayage ne protège que le jour où on le fait. Le test interdit
désormais qu'une nouvelle copie apparaisse, et vérifie que le helper lit bien les pesées —
sinon il garderait une fonction vide.

### Ce que cette itération a appris

*Corriger les sites ne ferme pas la famille.* Trois fois en cinq itérations, le même schéma :
je corrige les occurrences trouvées, une m'échappe, et la divergence recommence. Ce qui ferme
la famille, c'est une garde qui rend la copie impossible — comme la méta-garde du harnais
(it. 29) et la garde anti-champ fantôme (it. 35).

*Ne pas remplacer en masse.* Cinq des douze lectures étaient des replis corrects. Un
remplacement global aurait cassé `weightGoalProgress`, dont le troisième argument n'est PAS le
poids courant. Lire avant de remplacer, même quand le motif semble uniforme.

657 tests · SMOKE OK · 390 px propre.

### Reste
- Étape 11 (panneau « Ma semaine ») : **décision d'Adrien**.

## Itération 47 — le bloc rendait un conseil, jamais un bilan (axe A)

Mesuré avant d'écrire : à la fin d'un bloc de huit semaines, l'écran dit « Bloc de 8 semaines
terminé », donne le conseil pour la suite, propose d'en générer un nouveau — et ne dit **rien**
de ce que le bloc a produit. `blockWindowStats` et `bestE1rmByExercise` calculaient tout et
n'étaient appelées depuis `app.js` pour cet écran ni l'une ni l'autre.

Le bilan affiche désormais les séances, le tonnage, la variation vs le bloc précédent et les
charges gagnées par exercice, avec un verdict.

### Ce que cette itération a appris

*Le verdict doit distinguer VOLUME et FORCE.* Monter le tonnage sans gagner en charge, c'est
travailler plus pour le même résultat — et une app de coaching qui ne sait pas le dire félicite
pour du travail perdu. Le test porte sur le cas qui discrimine : charges identiques, plus de
séances.

*« Pas de bloc précédent » n'est pas « un bloc précédent à zéro ».* Le premier bloc — donc le
premier vrai usage de l'app — n'a rien à battre. `deltaPct` vaut null plutôt qu'un pourcentage
fabriqué à partir de rien. Même famille que `Number(null) === 0`, transposée à une comparaison.

*Un bloc plus léger n'est pas un échec.* Le verdict le dit : « si c'était voulu (fatigue, vie,
blessure), c'est une bonne décision. » Un coach qui ne sait que féliciter la hausse pousse à la
blessure.

658 tests · SMOKE OK · 390 px propre.

### Reste
- Étape 11 (panneau « Ma semaine ») : **décision d'Adrien**.

## Itération 48 — deux écrans, deux avis opposés sur la même journée

Sondé le tableau de bord, jamais examiné jusqu'ici. Trouvaille mesurée, même journée :

- **Plan de bataille** : « Bas du corps »
- **Tableau de bord** : « Laisse la charge produire son effet — mobilité, marche ou endurance
  très facile »
- Le compagnon ne mentionnait **jamais** le plan.

L'arbitrage est bon — la fatigue passe avant le programme. Ce qui manquait, c'est de le dire :
un coach qui change le programme sans expliquer n'est pas prudent, il est incohérent.

### Ce que cette itération a appris

*Le défaut n'était ni dans un écran ni dans l'autre, mais ENTRE les deux.* Chaque surface était
correcte isolément ; c'est leur juxtaposition qui produisait la contradiction. Aucun test
portant sur un seul écran ne pouvait le voir — il fallait mesurer les deux avec le même état.

*Le check exerce les deux cas.* Séance dure hier (le coach arbitre, il doit nommer ce qu'il
décale) ET journée normale (le coach suit le plan, il ne doit pas se répéter). Une seule des
deux branches aurait laissé passer soit le silence, soit le doublon — les deux mutations le
prouvent.

658 tests · SMOKE OK · 390 px propre.

### Reste
- Étape 11 (panneau « Ma semaine ») : **décision d'Adrien**.

## Itération 49 — trois demandes d'Adrien sur le même panneau

**« Le programme commence jeudi alors qu'on est mardi ? »** Mesuré avant de juger : avec tous
les jours cochés il démarre aujourd'hui, avec lun/mer/ven il démarre demain. **L'app était
correcte** — elle place les séances sur les jours qu'Adrien a lui-même cochés. Elle ne le disait
simplement nulle part. Un comportement correct qu'on n'explique pas est indiscernable d'un
défaut, et c'est bien comme un bug qu'il l'a signalé.

**« Faut me proposer des repas adaptés. »** Les idées de repas étaient une liste figée sur le
seul objectif — sans un chiffre, identique qu'on vise 2000 ou 3400 kcal. Elles se calent
désormais sur la cible du programme choisi.

**« Tu peux pas être plus agressif ? »** Si : −35 %, avec les garde-fous inchangés et une alerte
de plus sur la durée tenable.

### Ce que cette itération a appris

*Un signalement de bug peut porter sur un comportement correct.* La bonne réponse n'était pas de
changer le placement des séances — il était juste — mais de l'expliquer. Corriger ce qui
fonctionne aurait cassé quelque chose de bon.

*L'ordre d'une liste est du contenu.* Ma première version insérait « très agressif » avant
« agressif » : une échelle qui ne se lit pas dans l'ordre fait choisir au hasard. Le test
l'assert explicitement.

*Ne pas maquiller les arrondis.* Le total des quatre repas ne retombe pas exactement sur la
cible ; on l'affiche tel quel plutôt que d'ajuster un chiffre pour que la somme soit belle.

659 tests · SMOKE OK · 390 px propre.

### Reste
- Étape 11 (panneau « Ma semaine ») : **décision d'Adrien**.

---

## Itération 50 — Sécurité alimentaire : nommer le risque plutôt que retirer le choix

**Déclencheur.** Adrien, en cours d'itération : « faut que tu donnes des idées de repas autre
que ça, le but n'est pas non plus que j'aie des troubles du comportement alimentaire, et pareil
si l'application est mise sur l'App Store ou autre ». Puis, après ma première version : **« Laisse
les choix agressifs mais faut mettre des warnings, et que les gens soient conscients des
risques. »**

### Ce que la sonde a trouvé

`weightTargetAdvice` rendait déjà le bon verdict pour une cible de 52 kg à 1m80 :
`level: 'stop'`, « Cette cible te mettrait en insuffisance pondérale (IMC 16) […] parles-en à un
professionnel de santé ».

**`programmesNutrition` ne lisait pas ce drapeau.** Elle proposait « Très agressif » à 2001 kcal
à ce même profil, et aucune de ses alertes ne parlait de la cible. L'app alertait d'un côté et
offrait le contraire de l'autre — le fil rouge, dans sa version la plus coûteuse.

Second défaut, trouvé en ouvrant l'itération : les repas lisaient `profile.goal` et non le
programme **choisi**. Sélectionner « Prise de masse » avec un profil « perte » affichait
3387 kcal de surplus sous la note « En déficit… ».

### Ce qui a été fait

Ma première version **filtrait** les deux rythmes les plus durs. Adrien a tranché l'inverse, et
il a raison : le drapeau ne retire plus rien, il **attache un avertissement nommé** — l'IMC visé,
ce qui se dégrade (muscle, densité osseuse, sommeil, hormones), et vers qui se tourner — à chaque
rythme en déficit, plus un second aux rythmes agressifs. Sur cible risquée : **5 alertes au lieu
de 3, même cible calorique, même liberté**.

Le drapeau descend jusqu'à `programmeNutritionChoisi` : sans ça le programme **retenu** serait
rendu sans ses alertes — averti dans la liste, muet une fois sélectionné.

Repas : quatre idées par créneau (dont des pistes sans viande) qui tournent avec le jour,
portions calées sur la cible, formulations débarrassées de tout ce qui se « mérite » ou se
« rattrape », et un principe affiché avec chaque journée — *des idées, pas des règles ; aucun
aliment interdit ; si compter devient une charge, arrête de compter*.

### Ce que cette itération a appris

*Le garde-fou existait, il n'était pas branché.* Ni `programmesNutrition` ni les repas ne
lisaient un verdict que l'app calculait déjà correctement. Chercher ce qui n'est pas **relié**
paie plus que chercher ce qui est faux.

*Masquer n'est pas désactiver.* Ma version filtrante laissait `programmeNutritionChoisi`
retrouver et **appliquer** un « très agressif » enregistré. Une option cachée mais active est
pire que pas de garde-fou : elle ment sur l'état réel.

*Retirer une option n'apprend rien ; la nommer, si.* La correction d'Adrien a produit un
meilleur design que le mien — l'utilisateur garde la main ET sait ce qu'il fait.

**Mutations.** 3 posées (alerte IMC neutralisée, rotation figée, principe vidé), 3 détectées.
La 4e s'est validée en conditions réelles : le smoke **est tombé** tant que `gardeCible`
n'atteignait pas le rendu, et n'est repassé qu'une fois la plomberie faite jusqu'à
`trainingWeekPlan`.

661 tests · SMOKE OK · 390 px propre · **publié en v2.10.0** (à la demande d'Adrien).

### Reste
- Étape 11 (panneau « Ma semaine ») : **décision d'Adrien**.

---

## Itération 51 — Sonde de l'onglet Athlète : trois nombres pour une seule nutrition

**Déclencheur.** Adrien : « fais maintenant des grosses améliorations sur l'onglet Athlète et
l'UI ». Première étape du protocole : **sonder avant de juger**. Sonde iPhone 390×844, structure
et mesures réelles de chaque sous-onglet.

### Ce que la sonde a trouvé

Le panneau « Plan de bataille » affichait **trois nombres pour la même chose**, à quelques
centimètres l'un de l'autre :

| Endroit | Valeur |
|---|---|
| Bandeau de pilotage | 2518 kcal/j (−10 %) |
| Sélecteur de programme | 2518 kcal/j · −10 % |
| **Bloc macros « Nutrition alignée »** | **2294 kcal/j — déficit (−18 %)** |

Le bloc macros venait d'`objectiveNutrition` — une **quatrième** source nutrition, aveugle à la
cible de poids et au programme choisi, qui déduit son pourcentage du seul objectif physique.

**Second défaut, trouvé en tirant le fil.** `appliquerProgrammeNutrition` déplaçait la cible
sans toucher aux macros : « très agressif » faisait passer la cible de 2392 à 2024 kcal pendant
que P/G/L totalisaient toujours **2394 kcal**. Qui mange ce qui est écrit mange l'ancienne
cible ; le déficit choisi n'existait que dans le titre.

### Ce qui a été fait

`macrosDuPlan(energie, repli)` : le bloc lit le plan énergétique réel, celui sur lequel tout le
reste est déjà aligné. Le conseil d'`objectiveNutrition` est conservé (du texte, pas un chiffre
concurrent) et un profil incomplet retombe entièrement sur elle. Les glucides absorbent
désormais l'écart de cible — protéines et lipides restent adossés au poids. Écart résiduel
≤ 2 kcal, pur arrondi. Le pourcentage affiché se dérive de la cible **retenue**, jamais de
l'intention : après un plancher au métabolisme de base, annoncer −35 % serait faux.

### Ce que la sonde a révélé d'autre — pour l'étape 11

L'onglet **Programme** porte **8 panneaux** et **quatre** générateurs de semaine, pas trois :

1. `OBJECTIF ULTRA-TRAIL` → « Générer ma semaine »
2. `PLAN DE BATAILLE` → « Construire mon plan » *(le bon : 8 semaines, aligné sur tout)*
3. `COACH INTELLIGENT · Ma semaine d'entraînement` → « 🧠 Générer ma semaine » +
   « 📅 Programmer dans mon agenda **(4 semaines)** »
4. `CALENDRIER · MA SEMAINE À MA MESURE` → « Générer ma semaine »

Le n°3 annonce encore **4 semaines** quand le Plan de bataille en programme 8. Décision toujours
en attente d'Adrien : ce n'est plus « un doublon », c'est trois écrans concurrents autour du bon.

### Ce que cette itération a appris

*La sonde structurelle paie autant que la sonde fonctionnelle.* Je cherchais un défaut de rendu ;
c'est l'inventaire des panneaux qui a montré qu'un panneau parlait avec quatre voix.

**Mutations.** 3 posées (macros figées, repli systématique, pourcentage constant), 3 détectées.

662 tests · SMOKE OK.

### Reste
- Étape 11 (quatre générateurs de semaine sur l'onglet Programme) : **décision d'Adrien**.

---

## Itération 52 — Revue adversariale : deux défauts que je venais d'introduire

Revue due après trois itérations de contenu (49, 50, 51). Cible choisie : **mes propres ajouts
des deux dernières**, attaqués sur mes pièges documentés plutôt que sur du code ancien.

### Défaut 1 — « zéro n'est pas absent », sur ma propre règle

`macrosDuPlan` écrivait `Number(e.carbG) || repli.carbG`. Quand le plan tombe **légitimement**
à 0 g de glucides — profil lourd en déficit marqué, où protéines et lipides dépassent déjà la
cible — le bloc réaffichait les glucides de la source **abandonnée** : 777 g mesurés là où le
plan disait 0. Livré la veille, dans le commit qui corrigeait précisément un problème de
sources concurrentes.

Corrigé en testant la **présence** d'un nombre, pas sa vérité. Un champ vraiment absent retombe
toujours sur le repli — vérifié séparément.

### Défaut 2 — la garde regardait la direction, pas l'IMC

`garde.direction === 'perte'` laissait sans le moindre avertissement **le profil le plus exposé
de tous** : quelqu'un déjà à IMC 16 qui garde son poids comme cible (donc direction
« maintien ») et qui choisit « très agressif ». Trois alertes génériques, zéro sur le risque
réel.

Le risque tient à l'IMC **visé**, pas au sens du trajet — et l'alerte ne se déclenche de toute
façon que sur un programme en déficit. Vérifié qu'une cible saine ne produit pas de fausse
alarme.

### Ce que cette revue a appris

*Mes garanties les plus récentes sont les plus fragiles.* Les deux défauts datent de moins de
24 h, et les deux ont été introduits dans des commits qui corrigeaient exactement ce genre de
problème. Réviser le code neuf paie mieux que ratisser l'ancien.

*Une condition de garde trop précise est un trou.* `direction === 'perte'` semblait prudent ;
c'était une restriction qui excluait le cas le plus grave. Une garde doit se poser sur la cause
du risque, pas sur le chemin le plus fréquent qui y mène.

**Mutations.** Les deux mutations **remettent exactement les défauts d'origine** — c'est la
seule forme qui prouve qu'un verrou attrape ce qu'il prétend attraper. Toutes deux détectées.

662 tests · SMOKE OK.

### Reste
- Étape 11 (quatre générateurs de semaine sur l'onglet Programme) : **décision d'Adrien**,
  reformulée avec les mesures de l'itération 51 et une recommandation.

---

## Itération 53 — Étape 11 close : un seul générateur, et le dénivelé entre dans le plan

**Décision d'Adrien**, après dix itérations où je la lui ai posée : « Masque-les, mais intègre
l'ultra-trail dans le plan de bataille, faut que ça soit logique. »

Cartographie préalable des quatre panneaux en parallèle (5 agents, 0 erreur), puis vérification
personnelle de chaque affirmation qui commandait un geste. Quatre étaient critiques, **toutes
confirmées** :

1. **`_perdues` non déclaré** dans `scheduleObjectiveProgram` → `ReferenceError` dès qu'un
   créneau reste pris après trois décalages. Or c'est le chemin qui devient l'unique
   planificateur.
2. **`raceKm = _course.type || _course.distanceKm`** → la clé `'ultra160'` passait en premier :
   `taperDaysFor` rendait 7 jours au lieu de 18, `taperPlan(15,'ultra160')` rendait `null`.
   **Un ultra choisi dans la liste n'affûtait pas.**
3. **Deux classes posent `display:` sans règle `[hidden]`** — `.weekly-planner` et
   `.run-plan-bar`. Le piège du dépôt, pour la troisième fois.
4. **`availableDays` et `zonesVoulues` n'avaient d'écrivain que dans les panneaux à masquer**,
   alors que le plan les LIT déjà.

### Ce qui a été livré (4 commits + release)

- Les deux bugs de plomberie, d'abord — ils conditionnaient le reste.
- Les jours et les zones portés sous la barre du plan, **triés lundi-d'abord** (trois ordres
  concurrents coexistent, et `premiereSeanceInfo` affiche dans l'ordre stocké).
- `repartitionDplus` : le D+ hebdo réparti sur les courses **au prorata du temps debout**, somme
  exacte, jamais dans le titre (l'affûtage y fait un remplacement ancré sur les km).
- Les trois générateurs masqués par `hidden`, avec les règles CSS jumelles.

### Ce que cette itération a appris

*Une mutation qui survit dit quelque chose de vrai.* Retirer le `hidden` de
`.weekly-program-panel` ne cassait rien : ce panneau appartient à `pageGroups.library` et la
page Athlète le masquait déjà. Mon assertion était creuse — et la mutation m'a appris que ce
panneau ne s'affichait pas là où je croyais.

*Mon propre harnais peut être daté.* Le check `repasEtDepart` codait des jours donnant deux jours
d'attente **un mardi** ; il est tombé tout seul au changement de date, sur du code correct. Le
scénario se construit désormais depuis le jour courant.

*Un appel de rendu peut annuler une écriture.* Appeler `renderWeekProgram()` depuis le nouvel
écouteur de zones écrasait le choix qu'on venait d'enregistrer : cette fonction relit `#wpGoals`
et réécrit l'état.

**Mutations** : 9 posées sur l'itération, 9 détectées (dont une seulement après avoir corrigé
l'assertion creuse). 664 tests · SMOKE OK · 390 px propre · **publié en v2.11.0**.

### Reste
- Rien en attente d'Adrien. L'étape 11 est close.

---

## Itération 54 — Le coach sommeil disait « régulier » sans jamais regarder son propre chiffre

**Profondeur (A).** Sonde du bilan hebdo et du coach sommeil avec 14 nuits réalistes — deux
écrans que le journal signalait comme jamais sondés.

*Note de méthode : ma première sonde était fausse.* J'ai posé l'état APRÈS le rendu initial, donc
les panneaux affichaient encore l'écran vide. Seules les fonctions pures étaient exploitables —
et ce sont elles qui ont livré le défaut.

### Le défaut

`sleepCoachInsight` calculait `bedtimeStdevMin: 56` — puis concluait **« rythme régulier »**.

| Rythme mesuré | Verdict rendu |
|---|---|
| 23:10 en semaine, 01:15 le week-end (56 min d'écart-type) | « Sommeil solide […] rythme régulier. » |
| 23:15 tous les jours (0 min d'écart-type) | **la même phrase, mot pour mot** |

Seuil binaire à 60 min, et en dessous l'app **affirmait** la régularité sans jamais montrer le
chiffre qu'elle venait de calculer. Le fil rouge, encore : un écart entre ce que l'app dit et ce
qu'elle sait.

### Ce qui a été fait

Trois bandes. Sous 30 min, le verdict **cite la mesure** au lieu de l'étiqueter. Entre 30 et 60,
le ton reste calme mais le chiffre est montré et la cause nommée. Au-delà, inchangé.

`decalageWeekEnd` nomme la cause avec des données déjà présentes : sur le rythme le plus répandu,
la dispersion vient de **deux nuits sur sept**. Dire « ton coucher varie » envoie corriger sept
soirs quand deux suffisent.

### Ce que cette itération a appris

*Un seuil binaire cache un continuum.* Le vrai défaut n'était pas la valeur du seuil mais le fait
qu'en dessous, l'app se taise sur un nombre qu'elle avait.

*Un test qui tombe peut avoir raison sur le fond et tort sur la lettre.* Celui qui exigeait
« rythme régulier » s'appelle « verdict mesuré » : asserter la MESURE est plus fidèle à son
sujet, et plus strict. Contrat changé sciemment, écrit sur place.

*Ma propre règle enfreinte, encore.* `node -e` a mangé les apostrophes d'un patch — le script
`.cjs` écrit via Write existe précisément pour ça.

**Mutations.** 4 posées, 4 détectées — mais la 3e a d'abord **survécu** : mon garde-fou du
minimum de deux nuits n'avait pas de cas discriminant. Une mutation qui survit est un check
creux, jamais une bonne nouvelle.

665 tests · SMOKE OK · 390 px propre · **publié en v2.12.0**.

### Reste
- Rien en attente d'Adrien.

---

## Itération 55 — Revue adversariale : un invariant testé sur deux exemples n'est pas testé

Revue due après deux itérations de contenu. Cible : **mon propre code des itérations 53 et 54**,
attaqué sur mes pièges documentés plutôt que sur du code ancien — la méthode qui a payé à
l'itération 52.

### Le défaut

`repartitionDplus` arrondissait chaque part au plus proche, puis versait le reste à la plus
grosse, **écrêté à zéro**. Quand toutes les parts s'arrondissent vers le haut, ce reste est
négatif et peut dépasser la plus grosse part.

| D+ saisi | Ce que l'app affichait |
|---|---|
| 1200 m | 300 + 300 + 300 + 300 = **1200 m** ✓ |
| **20 m** | 0 + 10 + 10 + 10 = **30 m** ✗ |

Le défaut ne se voyait que sur les petits totaux. Mon test — écrit la veille — n'assertait la
somme que sur **deux** totaux, tous deux grands.

Corrigé par plus forts restes : troncature à la dizaine inférieure, puis redistribution par
paliers de 10 aux parts les plus lésées. Somme exacte par construction. Balayage : **0 écart sur
4 000 totaux**.

### Ce que la mutation qui a survécu m'a appris

Couper la redistribution laissait la somme **exacte** — tout le reste tombant sur une seule
course — mais violait la règle annoncée : 20 m rendaient `20+0+0+0` au lieu de `10+10+0+0`. Un
test qui n'assertait que la somme laissait passer un partage arbitraire.

*Un invariant se teste sur un domaine, pas sur deux exemples choisis. Et asserter la conséquence
(la somme) ne suffit pas quand la promesse porte sur la RÈGLE (le prorata).*

### Vérifié sans défaut

La phrase « sans aucun jour coché, l'app utilise toute la semaine », écrite à l'itération 53 sous
le nouveau sélecteur. Mesuré : 6 jours sur 7 réellement utilisés. **L'affirmation tient** — une
phrase d'interface vérifiée est aussi un résultat de revue.

**Mutations.** 3 posées, 3 détectées — la 3e seulement après avoir cessé de tester la somme pour
tester le sujet.

665 tests · SMOKE OK. Rien de publié : la dernière release est v2.12.0.

### Reste
- Rien en attente d'Adrien.

---

## Itération 56 — Le champ dénivelé fabriquait ses propres chiffres

Première ligne de la roadmap (712) : la dette n°1, reproduite avant d'être corrigée.

### Reproduction

Une seule saisie réelle — 450 m hier. Puis trois clics sur « Enregistrer » **sans rien taper** :

| Étape | Champ affiché | Entrée du jour | Total stocké |
|---|---|---|---|
| Après rendu | 450 | — | 450 |
| Clic 1 | 900 | 450 | **900** |
| Clic 2 | 1350 | 900 | **1350** |
| Clic 3 | 1800 | 1350 | **1800** |

Le bilan annonçait alors *« Cette semaine : 1800 m D+ »*. `renderAthlete` pré-remplissait le
champ avec la SOMME hebdomadaire, que `#saveTrail` réenregistrait comme la valeur DU JOUR.

### Ce qui a été fait

Le champ montre l'entrée du jour, celle qu'on modifie. Le total de la semaine reste dans
`#trailInsight`, qui dit « Cette semaine » — c'est là qu'il est juste. Et les libellés le disent :
« Dénivelé positif **du jour** », « Sortie longue **du jour** ». *Un champ qui ne dit pas ce qu'il
contient est la moitié du défaut.*

Voisin durci : `state.trail` n'est normalisé que comme tableau, ses entrées ne passent par aucun
normaliseur. Une sauvegarde importée peut porter `elevation:'450'`, et `0 + '450'` vaut `'0450'`.

### Ce que cette itération a appris

*Un jeu d'essai trop propre rend un garde-fou creux.* Ma deuxième mutation a survécu parce que
mes données de test n'utilisaient que des nombres — le durcissement n'était jamais exercé. Et
mon assertion cherchait `« 450 m D+ »`, que `« 0450 m D+ »` contient : **ne jamais asserter une
chaîne qu'une chaîne fautive contient aussi.** Corrigé, la mutation affiche fièrement
« Cette semaine : 04500 m D+ ».

**Mutations.** 2 posées, 2 détectées après correction du jeu d'essai.

665 tests · SMOKE OK. Rien publié : dernière release v2.12.1.

### Reste (roadmap 712)
- Sondes des 4 écrans jamais regardés en 390 px : Focus & vie, Réglages, vue jour, dialogues.
- Puis le coût annoncé des réglages, puis l'arbitrage sous budget de temps.

---

## Itération 57 — Mes propres notes de version enterraient la page Réglages

Deuxième ligne de la roadmap : sonder les écrans jamais mesurés en 390 px.

### Le périmètre réel, mesuré avant de sonder

La passe mobile du smoke ne couvre que **5 pages sur 8** et n'ouvre que **2 dialogues sur 12**.
La page Réglages n'y figure pas. C'était donc bien un angle mort, pas une impression.

### Ce que la sonde a trouvé

Page Réglages : **7 741 px**, dont **4 948 px pour la seule carte « Quoi de neuf »** — 64 % de la
page, 5,9 écrans d'iPhone.

| Dernière visite | Entrées | Hauteur |
|---|---|---|
| À jour | 0 | 0 px |
| 1 release de retard | 1 | 575 px |
| 3 releases | 3 | 1 679 px |
| **6 releases** | 6 | **4 948 px** |

Le changelog compte **423 entrées** et la carte n'avait aucun plafond. Avec la cadence d'une
release par jour, revenir après deux semaines enterrait la page — sous un mur de texte que
**j'alimente moi-même** à chaque publication.

### Ce qui a été fait

`whatsNewCap` garde les trois plus récentes dépliées et replie le reste derrière « Voir les N
versions plus anciennes ». Pire cas : **4 948 px → 1 730 px (−65 %)**, à nombre de caractères
inchangé.

### Ce que cette itération a appris

*Un défaut peut venir de ma propre cadence.* Ce n'est pas un bug de code : c'est une conséquence
de la façon dont je travaille, devenue visible seulement en mesurant l'écran.

*Une sonde trop large produit de faux positifs.* Elle a signalé six champs « sous 16 px » dans
l'onboarding — ce sont des cases à cocher, sur lesquelles Safari ne zoome pas. J'ai vérifié avant
de corriger quoi que ce soit. **Un signalement de sonde n'est pas un défaut tant qu'on n'a pas
regardé ce que c'est.**

**Mutations.** 4 posées, 4 détectées. La plus parlante retire le pli du rendu : le compte total
tombe de 6 à 3 — les anciennes disparaissaient vraiment. La garantie « rien n'est perdu » est
donc prouvée au rendu, pas seulement en logique.

666 tests · SMOKE OK. Rien publié : dernière release v2.12.2.

### Reste (roadmap 712)
- Étendre la passe mobile aux 3 pages et 10 dialogues non couverts (aucun défaut trouvé
  aujourd'hui, mais rien ne les empêche d'en gagner un demain).
- Puis le coût annoncé des réglages, puis l'arbitrage sous budget de temps.

---

## Itération 58 — Revue : le dénivelé avait deux sources, et la mienne ne servait à rien

Revue adversariale due. Cible : **mon propre code des itérations 53 à 57**.

### Le défaut, et il vient de moi

À l'itération 53, j'ai fait lire au Plan de bataille `state.ultraPlan.elevation` plutôt que
`state.trail`, pour éviter le quirk d'inflation du panneau trail. **J'ai corrigé ce quirk à
l'itération 56** — la raison a disparu, la division est restée.

| Ce qu'Adrien fait | Panneau trail | Plan de bataille |
|---|---|---|
| Saisit 600 m dans le panneau trail | « Cette semaine : 600 m D+ » | **rien du tout** |
| Pose 1 200 dans le nouveau réglage | « Cette semaine : 600 m D+ » | « 1 200 m D+ répartis… » |

Deux chiffres pour la même chose sur le même écran, et la saisie historique qui ne pilote rien —
exactement ce que je passe mon temps à corriger ailleurs.

### Ce qui a été fait

`dplusHebdo` répond seule : le réglage explicite s'il existe (une intention prime sur un
constat), sinon ce qui a été enregistré. Et le plan **nomme l'origine** : « 600 m D+ enregistrés
cette semaine » ou « 1 200 m D+ (ton réglage) ». *Un chiffre dont on ignore l'origine ne se
corrige pas.*

### Ce que je ne prétends pas

**La 5e mutation survit.** Le retour à la ligne ajouté à l'en-tête de séance corrige un
débordement de 18 px mesuré une fois, que je n'ai **pas réussi à reproduire en trois
tentatives** — probablement un DOM résiduel de mon propre check mesuré par la passe mobile. Le
CSS reste (défensif, l'en-tête porte maintenant trois étiquettes) mais il n'est **pas couvert**.

*Une mutation qui survit signifie d'ordinaire un check creux ou un harnais mort. Ici, ni l'un ni
l'autre : le scénario lui-même n'est pas reproductible. Le dire vaut mieux que de fabriquer un
test qui ferait semblant.*

### Ce que cette itération a appris

*Une raison technique qui disparaît laisse une architecture qui reste.* Le contournement de
l'itération 53 était justifié le jour où je l'ai écrit ; trois itérations plus tard il ne l'était
plus, et rien ne me l'a signalé. Il a fallu une revue pour le voir.

**Mutations.** 5 posées, 4 détectées, 1 assumée non couverte.

667 tests · SMOKE OK. Rien publié : dernière release v2.12.2.

### Reste (roadmap 712)
- Le coût annoncé des réglages, puis l'arbitrage sous budget de temps.

---

## Itération 59 — J'ai cru trouver un défaut ; la mesure dit non

Roadmap 712, chantier « le coût annoncé des réglages ».

### Ce que j'ai cru trouver

Avec lundi et mardi cochés un mercredi, la phrase annonçait « 6 séances sur 5 jours disponibles :
jusqu'à 2 par jour » pendant que je mesurais **3 séances le lundi et 3 le mardi**. Deux chiffres
apparemment faux, au-dessus du plan qui les contredisait.

### Ce qui était vrai

Je comparais la phrase à **`semaineType`** — la semaine TYPE, un gabarit — au lieu de **`p.week`**,
la semaine réellement programmée et rendue. Sur `p.week`, les six séances sont bien réparties sur
cinq jours, à deux maximum. **La phrase était juste depuis le début.**

### La mesure qui tranche

J'ai exécuté l'ancienne formule et la nouvelle côte à côte sur **576 configurations** (18 jeux de
jours × 4 dates × 8 réglages) : **zéro différence de chiffres**. Deux mutations sur trois
survivent — et elles ont raison de survivre.

### Ce qui reste, et qui est réel

1. **La formulation.** « sur 5 jours DISPONIBLES » se lisait comme « tes jours cochés », alors
   qu'il s'agit de ce qui reste de la semaine. On dit « réparties sur », qui décrit sans
   prétendre, et « le même jour » plutôt que « par jour », qui se lisait comme une moyenne.
2. **L'invariant.** Les nombres se dérivent de la semaine rendue par construction : ils ne
   peuvent plus diverger d'elle. La mutation qui calcule sur le programme brut est détectée.

### Ce que cette itération a appris

*Un défaut apparent peut venir de ma sonde, pas du code.* J'ai mesuré la mauvaise structure. La
règle « sonder avant de juger » ne suffit pas : il faut sonder **la structure que l'écran
utilise**, pas celle qui lui ressemble.

*Une mutation qui survit peut avoir raison.* J'ai d'abord voulu tailler un test qui la ferait
tomber. C'était l'inverse du bon geste : la mutation disait que mon correctif ne corrigeait rien
de numérique, et elle avait raison.

*Le résultat d'une itération peut être « il n'y avait pas de bug ».* C'est un résultat, à
condition de l'écrire.

**Mutations.** 3 posées, 1 détectée, **2 assumées comme justifiées**.

668 tests · SMOKE OK. Rien publié : dernière release v2.12.2.

### Reste (roadmap 712)
- Le coût annoncé des réglages reste à faire : le vrai manque n'est pas la phrase de
  répartition, mais qu'aucun réglage ne dise ce qu'il change AVANT qu'on y touche.
- Puis l'arbitrage sous budget de temps.

---

## Itération 60 — Un réglage dit ce qu'il vient de coûter

Roadmap 712, chantier « le coût annoncé des réglages ». Les réglages du Plan de bataille
s'appliquaient en silence : on voit le nouvel état, jamais l'écart.

### Mesuré avant de construire

Passer de 3 à 5 courses avec 4 séances par semaine **ne change pas le nombre de séances**
(4 → 4) mais fait disparaître la **seule** séance de musculation, en ajoutant 25 min. Rien à
l'écran ne le signalait, et rien ne permettait de le déduire.

Vérifié aussi que l'écart est du **signal** : la graine de variation change les exercices sans
toucher aux comptes ni aux minutes, donc elle ne déclenche aucune phrase.

### Ce qui a été livré

`deltaPlan` compare l'ancienne semaine à la nouvelle et nomme l'écart — **après** l'effet, avec
la mesure réelle :

- « +2 séances, +1 h 30 par semaine. »
- « +25 min par semaine — et ta musculation disparaît complètement. »
- « 1 séance de musculation remplacée par de la course. » *(même nombre de séances, mêmes
  minutes : le changement le plus dur à repérer à l'œil)*

Silence quand rien de chiffrable ne bouge.

### Ce que cette itération a appris

*Une redondance rend la couverture invisible.* J'avais deux gardes de silence. Chacune couvrait
l'autre : mutées séparément, **toutes deux survivaient**, et seule leur mutation simultanée
échouait. Un raccourci redondant ne coûte rien à l'exécution mais ment sur ce qui est testé. Je
l'ai supprimé — la garde restante est désormais détectée seule.

*Un check qui ne remet pas la scène à zéro ne teste pas son sujet.* Mon assertion « rien au
premier rendu » passait pour de mauvaises raisons : un plan calculé plus tôt dans le harnais
servait de référence. Il a fallu effacer explicitement cette référence.

**Mutations.** 5 posées, 5 détectées après suppression de la redondance.

669 tests · SMOKE OK · **publié en v2.13.0**.

### Boucle arrêtée à la demande d'Adrien
Roadmap 712 à jour. Reste, dans l'ordre : l'arbitrage sous budget de temps (le plus gros saut
qualitatif), la mémoire des blocs, puis la distribution si elle a lieu.

---

## Itération 61 — L'app savait que la journée ne tenait pas, et ne le disait qu'à l'Agenda

Premier chantier de la roadmap long terme (713) : l'**Agenda**, jamais audité.

### La sonde a démenti le backlog

L'Agenda est **sain en 390 px** : aucun débordement, aucun champ sous 16 px, trois vues
(Jour/Semaine/Mois), des filtres, un compteur fait/prévu par jour. Le backlog de 705 supposait
des manques d'interface ; ils ne sont pas là.

### Ce qui manquait vraiment

Sur une journée type — 3 h de cours, 2 h de cours, 1 h de muscu, 1 h 30 de révision :

```
dayLoad → { plannedMin: 330, capacityMin: 180, pct: 183, overflowMin: 150, endEstimate: '21:30' }
```

…pendant que « À rattraper » sur le tableau de bord ne parlait que de **sauvegarde**. L'app
savait que la journée débordait de deux heures et demie et ne le disait qu'à qui allait le
chercher.

### Le piège évité — déjà documenté dans le dépôt

Une journée entièrement faite de **cours importés** dépasse la capacité par défaut presque tous
les jours d'école. L'alerte se serait déclenchée en permanence et aurait cessé d'être lue :
c'est mot pour mot ce que la v2.6.0 a corrigé sur la jauge du même sujet. Et « décale ou
raccourcis » n'a aucun sens face à un emploi du temps qu'on ne choisit pas.

L'alerte exige donc **au moins un bloc déplaçable**. Mesuré : 200 % de cours seuls → silence ;
283 % avec deux blocs à soi → alerte haute.

### Deux erreurs de ma part, corrigées

*Ma clé de diagnostic écrasait celle d'un check existant* (`__charge`) — je lisais le diagnostic
d'un autre test en croyant lire le mien.

*Je pilotais le mauvais peintre.* `renderCommandCenter` ne rend pas ce bloc ; c'est
`renderAttention`. La logique était juste depuis le début, et seule la sonde du **rendu** l'a
montré — une fois de plus.

**Mutations.** 5 posées, 5 détectées, dont celle qui retire la garde et fait apparaître
« 3 h de trop » sur une journée de cours seuls.

670 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

### Suite (roadmap 713)
- Agenda dans la navigation, puis le reste du backlog 705.
- Puis Focus, en friche (5 panneaux contre 22 pour Athlète).

---

## Itération 62 — Revue : l'alerte livrée hier ratait le cas réel d'Adrien

Revue adversariale due. Cible : **mon code de l'itération 61**, livré la veille.

### Le défaut

La garde « au moins un bloc déplaçable » ne lisait que `state.agenda` brut, alors que `dayLoad`
compte **aussi les récurrences**. Or les cours d'Adrien sont posés une fois pour toutes en
récurrence hebdomadaire, pas réécrits chaque semaine.

| Journée | `dayLoad` | Alerte |
|---|---|---|
| Deux cours récurrents un mercredi | 330 min, 183 %, **saturé** | **AUCUNE** |

La fonctionnalité livrée la veille ne se déclenchait donc pas dans le cas **le plus courant**.

Une récurrence créée dans l'app est déplaçable par définition — elle se met en pause, se saute,
se modifie pour une occurrence. Seul l'import de calendrier ne se négocie pas : la distinction
tenait, c'est la lecture qui était trop étroite.

### Ce que cette itération a appris

*Vérifier la forme du jeu d'essai AVANT de conclure au défaut.* Ma première tentative mettait
`freq` et `weekdays` à plat, alors que `normalizeRecurring` les attend dans un objet `rule` :
`recurringOccurs` rendait `false` et la journée paraissait vide. J'ai failli conclure que
`dayLoad` ignorait les récurrences — c'est-à-dire diagnostiquer un défaut qui n'existait pas, et
peut-être « corriger » du code sain.

*Une garde neuve doit être éprouvée sur les données réelles, pas sur celles qu'on a sous la
main.* J'avais testé avec des entrées d'agenda parce que c'est ce que j'avais écrit la veille ;
Adrien, lui, utilise des récurrences.

**Mutations.** 2 posées, 2 détectées.

670 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

### Suite (roadmap 713)
- **Focus**, la plus grosse friche (5 panneaux contre 22 pour Athlète).

---

## Itération 63 — Focus : la page savait où va l'attention, jamais dans quel sens

Premier chantier **Focus** de la roadmap 713 — la page la plus en friche (5 panneaux contre 22
pour Athlète). Sondée avec six semaines de sessions réalistes.

### Ce qu'elle disait déjà, et ce qu'elle taisait

| Fonction | Ce qu'elle calcule | Rendue ? |
|---|---|---|
| `focusByTask` | Révisions BTS 70 %, Candidatures 23 %, Lecture 7 % | oui |
| `focusWeekGoal` | 215 / 120 min cette semaine | oui |
| **`focusMinutesTrend`** | **recent 430, prev 350, +80, dir up** | **0 appel** |
| `focusHeatmap` | — | **0 appel** |

La page disait **où** va l'attention et **si** l'objectif est tenu, jamais dans quel **sens** ça
va. La phrase existe maintenant : *« 3 h cette semaine, +1 h 40 par rapport à la précédente
(1 h 20). »* — les deux semaines citées, parce qu'un écart sans son point de départ ne se juge
pas.

### Le piège, et il était tendu

La première semaine d'usage, `focusMinutesTrend` rend `prev: null` **avec** `dir: 'flat'` et
`delta: 0`. Afficher « stable » là-dessus annoncerait une comparaison jamais faite. Le test
l'assert explicitement : *la fonction dit pourtant « flat » — c'est le piège*.

### Deux fausses pistes écartées en vérifiant

*Le panneau Trophées affichait « 0 min de focus »* sur mes données. J'ai mesuré `lifetimeStats`
avant de conclure : elle rend 2250 min correctement — c'était **ma sonde** qui ne repeignait pas.

*`focusByTask` semblait absent de l'écran.* Il est bien rendu, avec une garde qui le masque sous
deux tâches distinctes.

**Trois itérations de suite (61, 62, 63) où vérifier avant d'affirmer m'a évité de « corriger »
du code sain.** C'est devenu le geste le plus rentable de la boucle.

**Mutations.** 4 posées, 4 détectées, dont celle qui fait réapparaître « Autant de concentration
que la semaine dernière » sans semaine dernière.

671 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

### Suite (roadmap 713)
- Focus : `focusHeatmap` reste sans appel ; les parkings et revues hebdo accumulent sans ressortir.

---

## Itération 64 — La carte de concentration récompensait l'émiettement

### Mon audit était faux, et le harnais me l'a dit

Je croyais `#focusHeatmap` mort : markup présent, aucune fonction `focusHeatmap` (`typeof`
vaut `undefined`), zéro appel. J'ai donc écrit « la fonction manquante » et masqué le bloc vide.

**Le méta-garde du smoke a signalé un check `focusHeatmap` devenu faux** — il exigeait
56 cellules. La heatmap était donc déjà rendue : le code réutilisait `trainingHeatmap` sur les
sessions de focus, et mon grep cherchait un nom de fonction qui n'a jamais existé. Masquage
retiré immédiatement.

*Sans ce garde-fou, j'aurais livré une régression en croyant combler un trou.*

### Le vrai défaut, une fois la bonne piste trouvée

`trainingHeatmap` compte les **entrées** par jour. Sur du sport c'est correct ; sur de la
concentration, ça récompense l'émiettement. À temps total **identique** :

| Journée | Ancienne règle | Lecture |
|---|---|---|
| 4 blocs de 15 min | count 4 | case **foncée** |
| 1 bloc de 60 min | count 1 | case claire |

La journée fragmentée paraissait meilleure que la journée concentrée — l'inverse exact de ce
qu'une app de concentration devrait encourager.

`focusHeatmapJours` mesure les **minutes**, avec un seuil dérivé de l'objectif hebdomadaire (un
tiers de la cible tenu en un jour) plutôt qu'un chiffre inventé.

### Le check existant est devenu discriminant

Il comptait 56 cellules — vrai avant comme après le correctif, donc **incapable de voir
l'inversion**. Il rejoue désormais les deux journées à temps égal et exige la même case.

**Mutations.** 4 posées, 4 détectées. La troisième a d'abord survécu : mon assertion sur le
plancher utilisait une journée de 60 min, qui dépasse le seuil dans les deux cas. Il fallait une
**petite** journée avec une cible minuscule.

672 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 65 — Le parking promettait « tu peux y revenir » et ne le permettait pas

### Mon journal se trompait

Il disait « les parkings et revues accumulent sans ressortir ». **Faux** : les deux ressortent
(`renderFocusParking`, `recentFocusOutcomes`). *Cinquième hypothèse initiale démentie par la
mesure en cinq itérations — la vérification est devenue le geste le plus rentable de la boucle.*

### Le vrai défaut — le fil rouge à l'état pur

Le statut du parking promet en toutes lettres : **« tu peux y revenir après ton bloc »**.
Le rendu, lui, filtrait `p.date === localDate()` puis gardait `slice(-4)`.

| Stockées | Affichées | Statut annoncé |
|---|---|---|
| **8** | **4** | « **4 pensées déposées** » |

Trois pensées des jours précédents **et une du jour même** disparaissaient sans un mot, et le
compte tronqué était présenté comme le total. Rien n'était perdu en mémoire — c'était
**injoignable**, ce qui est pire, parce qu'on avait promis l'inverse.

### Ce qui a été fait

Les quatre plus récentes du jour restent en avant (la place à l'écran est limitée), le statut
compte ce qui **existe**, et le reste vit dans un tiroir replié avec les dates. Fenêtre bornée à
14 jours : *un parking qui remonte à trois mois n'est plus un parking, c'est une décharge.*

### Ce que cette itération a appris

*Une promesse écrite dans l'interface est un contrat testable.* « Tu peux y revenir » se vérifie :
il suffit de compter ce qui est atteignable. C'est le test le plus simple à écrire et celui qui
manquait.

**Mutations.** 5 posées, 5 détectées — dont celle qui remet le compte tronqué dans le statut.

673 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 66 — Revue : j'avais transformé une promesse en liste de culpabilité

Revue adversariale due. Cible : mon code des itérations 63 à 65, dont celui de la veille.

### Le défaut

Hier, j'ai rendu les pensées parquées **atteignables** — sans permettre de les **clore**.

| Usage normal (2 pensées/jour, 14 jours) | Résultat |
|---|---|
| Stockées dans la fenêtre | 28 |
| Affichées en avant | 2 |
| **Dans le tiroir** | **26 « autres en attente »** |

Presque toutes déjà traitées, et le nombre ne pouvait que grossir. J'avais transformé une
promesse tenue en **liste de culpabilité** — exactement la décharge que mon propre commentaire
disait vouloir éviter, écrit la veille.

### Ce qui a été fait

Un bouton de clôture par pensée (44 px). L'entrée n'est pas effacée : elle prend un drapeau
`done` et sort du décompte. Mesuré : 8 ouvertes → clic → 7, tiroir de 4 à 3.

### Ce que cette itération a appris

*Une fonctionnalité qui n'a pas de sortie devient une dette pour l'utilisateur.* Ajouter la
visibilité sans l'action, c'est déplacer le problème, pas le résoudre.

*Le diagnostic d'un check vaut autant que son verdict.* J'avais inséré le bloc de clic APRÈS la
restauration de l'état : le tiroir était revidé, le bouton introuvable. Le check a affiché
`bouton=0px` au lieu de simplement échouer — et c'est ce chiffre qui m'a dit où regarder.

**Mutations.** 4 posées, 4 détectées, dont celle qui recâble le bouton avant l'`innerHTML`.

673 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

### Suite (roadmap 713)
- Poids, Exercices et Alternance : un seul panneau chacun.

---

## Itération 67 — Coach Poids : deux cibles sur le même écran, aucune nommée

Premier chantier **Poids** (page à un seul panneau). Sondée sur le scénario le plus courant
d'une sèche : trois mois de pesées, perte franche puis **plateau** sur le dernier mois.

### Ce que le panneau fait déjà bien — à dire aussi

Mon hypothèse de départ était que l'app promettrait une date en ignorant le plateau. **Faux.**
Elle annonce « Plateau confirmé — moins de 100 g par semaine depuis 36 jours » et propose une
pause diète chiffrée (≈ +625 kcal/jour). `dureePlateau`, `dietBreakRecommendation`,
`rythmeVerdict` sont tous rendus.

### Le vrai défaut

L'en-tête se recalcule sur le **champ de saisie** ; la durée, la date estimée, la jauge et les
calories restent sur la cible **enregistrée**. Tant qu'on n'a pas validé :

| Dans l'en-tête | Juste dessous |
|---|---|
| « Perdre 9 kg · ~15 sem. » | « Perdre 4,9 kg · ≈ 9 semaines · 🎯 76 kg » |

Vérifié avant de conclure : **à cible égale, les deux calculs concordent exactement**
(4,9 kg / 9 semaines / 0,57 kg/sem.). Pas de bug de calcul — deux cibles qui coexistent sans
être nommées. Une bannière le dit, et se tait dès qu'elles coïncident.

### Ce que cette itération a appris

*Trois erreurs de ma part dans le check, toutes de la même famille* : mauvais id de champ, un
seul des deux champs renseigné alors que le rendu lit l'autre en premier, panneau replié donc
hauteur nulle — et surtout **le mauvais peintre** (`renderTargetAdvice`, pas
`renderCoachWeight`). **Troisième fois** que je me trompe de peintre en sept itérations.

*Ce qui m'a sauvé à chaque étape : le diagnostic du check affiche ce qu'il lit.* Un check qui
échoue en silence m'aurait laissé deviner ; celui-ci disait « champ de cible introuvable », puis
« identique[] different[] ».

**Mutations.** 4 posées, 4 détectées.

674 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 68 — Exercices n'était pas une friche, et ma métrique était trompeuse

### Le verdict, contraire à l'attente

Ma roadmap classait Exercices en friche sur un seul chiffre : « 1 panneau ». La richesse est
**derrière la fiche**. Mesuré, avec le bon jeu d'essai :

| Fonction | Ce qu'elle rend | Où |
|---|---|---|
| `exerciseHistoryStats` | 29 séances, 87 séries, meilleure série 101 kg × 5, e1RM 118 | fiche exercice |
| `progressionSuggestion` | prochain pas : 101 kg × 6 | fiche exercice |
| `loggedExerciseNames` | marque les exercices déjà faits | liste |
| `bestE1rmByExercise` | **jamais rendue** — mais ferait DOUBLON avec la meilleure série | — |

*Compter les panneaux mesure la mise en page, pas la profondeur.* Nuance ajoutée à la roadmap.

### Ce qui a été fait

La passe mobile 390 px ne parcourait que **5 pages sur 8** : `library` — la plus haute de l'app,
21 779 px — et `settings` en étaient absentes. Elles y sont. Et les panneaux repliés sont
dépliés avant mesure : une hauteur nulle les faisait ignorer, donc la passe **comptait des pages
sans les regarder**.

### Ce que je ne prétends pas

J'ai voulu prouver que l'extension mord, en injectant un débordement dans `#exerciseCards` : il
n'a pas été attrapé. Vérification faite, **mon injection n'était pas un test valide** — la passe
cherche les éléments qui débordent d'*eux-mêmes* (`scrollWidth > clientWidth`), or `min-width`
élargit l'élément sans créer ce cas. Ce n'est pas une preuve que la passe est édentée ; ce n'est
pas non plus une preuve qu'elle mord sur ces deux pages.

### Ce que cette itération a appris

*Troisième jeu d'essai mal formé de la session.* J'ai écrit `sets: [{reps, weight}]` là où l'app
lit `setLogs: [{load, reps}]` — d'où un `bestSet: null` et 0 série sur 29 séances, qui m'a fait
croire un instant à un défaut. **Lire le consommateur avant d'inventer la forme.**

674 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 69 — Mon audit envoyait refaire un sous-système déjà fini

Chantier n°1 de la roadmap : « trancher les trois sous-systèmes à moitié faits ». En allant
mesurer le premier — le temps de trajet — j'ai trouvé qu'il n'y avait rien à trancher.

### La troisième erreur de méthode de cet audit

Mon détecteur d'orphelines ne scannait que `app.js` et `logic.js`. Il ignorait
**`electron-main.cjs`**, où vit tout le processus principal.

| | Avant | Après correction |
|---|---|---|
| Fonctions orphelines | 15 | **7** |
| Temps de trajet | « à moitié construit » | **entier** — géocodage, itinéraire, repli haversine, adresse chiffrée via `safeStorage` |

Restent deux chantiers réellement ouverts (code-barres, helpers d'agenda) et une fonction isolée
(`compareApplications`).

*Une mesure qui n'ouvre pas tous les fichiers ne mesure pas ce qu'elle prétend.* Troisième fois
dans cet audit, après la navigation lue par `[data-page]` et les panneaux pris pour de la
profondeur. Le point commun : à chaque fois, j'ai mesuré ce qui était **facile à compter** plutôt
que ce que je voulais savoir.

### Une précision que je devais à Adrien

Je répète « 100 % locale, zéro dépendance » depuis des dizaines d'itérations. C'est vrai pour
l'essentiel, mais **trois fonctions font du réseau sur clic explicite** : estimation de temps de
trajet (géocodage + itinéraire), import de calendrier ICS, synchronisation d'une feuille de
calcul. Rien ne part automatiquement, l'adresse est stockée chiffrée, et l'app affiche « Trajet
indisponible (réseau) » quand ça échoue.

La formule juste : **aucune donnée ne sort de l'appareil sans que tu l'aies demandé** — pas
« zéro réseau ». Le non-but de la roadmap a été précisé en conséquence.

674 tests · SMOKE OK. Aucune ligne de code applicatif touchée : cette itération corrige le
document qui pilote les suivantes.

---

## Itération 70 — Une revue qui ne trouve rien doit quand même laisser quelque chose

Revue adversariale due. Cible : mon code des itérations 67 à 69.

### Aucun défaut trouvé

Et c'est un résultat qu'il faut savoir écrire plutôt que d'en fabriquer un.

Vérifié **au rendu**, pas sur le code : la bannière d'aperçu apparaît à la saisie d'une cible
différente, **disparaît après enregistrement**, et reste muette ensuite.

Vérifié aussi : `state.goals.targetWeight` devient une **chaîne** après saisie (`'72'`) et ne
redevient un nombre qu'au rechargement. J'ai cherché toutes les additions et concaténations sur
ce champ sans `Number()` autour — **aucune**. Le risque existe, il n'est pas réalisé ; noté pour
la prochaine fois.

### Ce que la revue laisse derrière elle

Le check `apercuNomme` ne testait que **deux** états : cibles identiques (silence) et cibles
différentes (bannière). Il prouvait que la bannière sait **parler**, jamais qu'elle sait
**s'arrêter**. Troisième état ajouté.

Mutation sur la seule ligne qui fait taire la bannière : **détectée**, avec un diagnostic
parlant — « identique[👀 Aperçu pour 76 kg…] », soit une bannière annonçant un écart entre 76 et
76.

*Une garantie non testée n'est pas une garantie, même quand le comportement est correct
aujourd'hui.*

674 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 71 — « Trancher les helpers d'agenda » : la réponse est non, et voici pourquoi

Chantier de la roadmap : décider quoi faire des quatre helpers d'agenda orphelins
(`nextTrainingSession`, `setAgendaCompleted`, `setRecurringDone`, `xpForAgendaItem`).

### Ce que la mesure a montré

Il existe **deux implémentations du même geste** : `completeRecurringOn` dans `app.js`
(utilisée) et `setRecurringDone` dans `logic.js` (orpheline, mais testée). Réflexe naturel :
brancher l'app sur la fonction pure, une seule implémentation, déjà couverte.

**Ce serait une régression.** Les deux ne font pas la même chose :

| | `completeRecurringOn` (app.js) | `setRecurringDone` (logic.js) |
|---|---|---|
| Occurrence déplacée | valide sur la date d'**ORIGINE** via `recurringOccurrence` | prend la date **telle quelle** |
| Décocher | non | oui |
| XP révision | oui | non |

La résolution de la date d'origine est un **correctif documenté** : « cocher le mardi un cours
venu du lundi devait écrire lundi, sinon la coche ne tient pas ». La fonction pure est une
version **antérieure et plus faible**, laissée derrière — pas la pièce manquante.

**Décision : ne pas consolider en l'état.** Il faudrait d'abord porter la résolution de date
d'origine dans la fonction pure. Ce n'est pas une ligne, et ça touche un bug déjà corrigé.

### Ce que j'ai tenté, et pourquoi je ne l'ai pas livré

J'ai voulu épingler le comportement par un check bloquant avant toute consolidation future.
Le check ne reproduit pas le scénario : `recurringOccurrence` ne rend rien sur la date cible,
donc la coche retombe sur le mardi et le check ne teste pas son sujet.

**Retiré, pas commité.** Un check rouge ne se livre pas ; un check qui prétend garder un
comportement sans le reproduire est pire — il donne une fausse sécurité.

### Deux erreurs de ma part, instructives

*`setRecurringOverride` rend `{ recurring, changed }`, pas un tableau.* Je l'ai affecté tel quel
à `state.recurring`, qui n'était donc plus un tableau.

*Ma restauration d'état vivait APRÈS le corps du `try`* : l'exception la sautait, `state.recurring`
restait cassé, et **un check voisin est tombé** — accusant le planificateur d'un défaut qui
n'était pas le sien. Un check qui abîme l'état commun est pire qu'un check absent.

674 tests · SMOKE OK, dépôt propre. Rien publié : dernière release v2.13.0.

### Reste à faire sur ce chantier
Porter la résolution de date d'origine dans `setRecurringDone`, l'épingler par un check qui
reproduit vraiment le déplacement, puis consolider. Dans cet ordre.

---

## Itération 72 — Le champ s'appelait `moveTo`, pas `date`

Suite directe de l'itération 71, qui s'était arrêtée sur un check incapable de reproduire son
scénario. Question laissée ouverte : pourquoi `recurringOccurrence` ne rend-il rien sur la date
cible après un déplacement ?

### La réponse

`setRecurringOverride` rendait `changed: false` et `overrides: {}` : **l'override n'était jamais
appliqué**. Le champ de déplacement s'appelle **`moveTo`**, pas `date` — et
`sanitizeRecurringOverrides` rejette silencieusement tout champ inconnu.

**Aucun défaut dans l'app.** Le déplacement fonctionne, `recurringOccurrence` rend bien
`{ date: mardi, sourceDate: lundi, deplacee: true }`, et `completeRecurringOn` coche le lundi.

*Quatrième forme de données inventée de la session*, après les règles de récurrence, les
sessions de focus et les séries de muscu. À chaque fois, le même remède aurait suffi : lire le
consommateur avant d'écrire le jeu d'essai.

### Ce qui est livré

Le comportement documenté est **enfin gardé** : déplacer l'occurrence du lundi au mardi, la
cocher sur sa nouvelle date, exiger que `doneLog` contienne le lundi et jamais le mardi.

C'est le filet qui manquait pour rendre sûre la consolidation refusée à l'itération 71.

**Mutations.** 2 posées, 2 détectées, avec des diagnostics parlants :
- sans la résolution de date d'origine → `log[2026-08-04]` au lieu de `log[2026-08-03]`
- sans `moveTo` → `deplace=false`

La sauvegarde d'état vit désormais hors du `try`, et le `catch` la restaure — hier, une exception
avait laissé `state.recurring` cassé et fait tomber un check voisin.

674 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

### Reste sur ce chantier
Porter la résolution de date d'origine dans `setRecurringDone`, puis consolider. Le filet est
posé, l'opération est maintenant sûre.

---

## Itération 73 — Deux implémentations deviennent une, dans l'ordre sûr

Aboutissement du chantier ouvert à l'itération 71 (refusé faute de filet) et débloqué à la 72
(check qui reproduit enfin le déplacement).

### L'ordre qui rend l'opération sûre

| Étape | Itération |
|---|---|
| Constater la divergence, **refuser** de consolider | 71 |
| Poser le filet qui reproduit le déplacement | 72 |
| Mettre la fonction pure **à parité**, puis déléguer | 73 |

1. `setRecurringDone` résout désormais la date d'origine via `recurringOccurrence`. Sans
   déplacement, `sourceDate` vaut `dateKey` — le cas courant est intact.
2. `completeRecurringOn` **délègue**. Il garde ce qui lui appartient (trouver la récurrence,
   l'XP, la sauvegarde, le rendu) et n'implémente plus la règle. La mutation directe
   `r.doneLog.push` disparaît : l'état devient immuable.

**Bénéfice au passage** : la version pure sait **décocher**, ce que celle de l'app ne savait pas.

### Ce que cette séquence a appris

*Refuser une consolidation n'est pas y renoncer — c'est la mettre dans le bon ordre.* Faite à
l'itération 71, elle réintroduisait un bug corrigé. Faite après le filet, elle est vérifiable à
chaque étape.

**Mutations.** 3 posées, 3 détectées, avec des diagnostics parlants : sans la résolution,
`log[2026-08-04]` au lieu de `log[2026-08-03]` ; sans la délégation, `log[]` — plus rien n'est
coché.

675 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 74 — Revue : la capacité livrée hier n'avait aucun chemin depuis l'écran

Revue adversariale due. Cible : **la consolidation de l'itération 73**. J'y avais écrit que
`setRecurringDone` « sait maintenant décocher ». Sondé à 390×844 : vrai de la fonction, faux de
l'app — aucun bouton n'y menait.

### La mesure, ligne par ligne

| Écran | Ligne terminée |
|---|---|
| Ma journée | **zéro bouton** |
| Vue Jour, bloc d'agenda | `↪️` · `→ demain` · `✏️` — et rien pour annuler |
| Vue Jour, occurrence récurrente | **zéro bouton** |

Autrement dit : on pouvait **repousser à demain quelque chose de déjà fait**, mais pas défaire un
clic de travers — les 15 XP restaient acquis. Partout ailleurs (quêtes, habitudes, tâches) une
coche est un **interrupteur**, avec le même retrait d'XP recopié en clair quatre fois. L'agenda
était la seule exception.

### Ce que ça devient

- **`gestesDuBloc(item)`** (pur) dit ce qu'une ligne permet encore. Les deux rendus le lisent —
  ils ne disaient déjà pas la même chose.
- Un bloc terminé propose `↩︎ Annuler · −15 XP` et **ne propose plus `→ demain`**. Il reste
  modifiable : corriger un titre garde du sens, le repousser non.
- `xpForAgendaItem` et `setAgendaCompleted`, écrits pour ça et **jamais branchés**, le sont enfin.
  Le « 15 » n'est plus recopié en dur : les deux libellés lisent le même chiffre.
- CSS : l'opacité était posée sur le `<li>` entier. **L'opacité d'un parent ne se rattrape pas sur
  l'enfant** — le seul geste encore possible aurait été le moins lisible de l'écran. On estompe le
  contenu, pas les commandes.

### Ce que cette itération a appris

*Une fonction qui sait faire quelque chose n'est pas une capacité tant qu'aucun clic n'y mène.*
J'ai écrit « elle sait décocher » en toute bonne foi : c'était vrai du code et faux de l'app. La
revue ne doit pas relire le diff, elle doit **rouvrir l'écran**.

Corollaire de méthode : **un check qui mord n'a pas forcément raison.** Le mien réclamait « −15 »
là où un retour au point de départ donne 0. C'était mon arithmétique. L'exigence est maintenant
écrite comme ce qu'elle est — `xp 10485→10500→10485`, ni fantôme ni double retrait.

**Mutations.** 5 posées, 5 détectées, chacune rejouant exactement le défaut mesuré : `bouton=false
decoche=false` avec l'XP qui reste ; `demain=true` sur une ligne faite ; `xp …→10725→10725` quand
le libellé promet −15 et que l'app ne rend rien.

676 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 75 — Focus : l'heure était enregistrée depuis toujours, jamais lue

`finishFocusBlock` (app.js) horodate chaque bloc avec `Date.now()`. Sondé à 390×844 sur un jeu
réaliste : **46 blocs sur 46** portaient un horodatage exploitable, et **rien ne le lisait**.

| Ce que l'app savait déjà | Fonction |
|---|---|
| Combien de minutes | `focusWeekGoal` |
| Sur quoi | `focusByTask` |
| Quels jours | `focusHeatmapJours` |
| Dans quel sens ça va | `focusMinutesTrend` |
| **À quelle heure** | *personne* |

`creneauDeConcentration` (pur) répond : frise de 24 colonnes, meilleure plage de 3 h, et une
phrase qui cite ses propres chiffres. Quand rien ne se détache, elle le dit au lieu de forcer un
créneau.

**Trois refus assumés.** Un `id` n'est une horloge que s'il retombe sur la date de sa session —
une entrée d'un ancien format est écartée, jamais placée à une heure inventée. Sous 8 blocs ou
4 jours distincts : silence. Et la plage ne commence jamais sur une heure vide (`8 h–11 h` et
`9 h–12 h` portaient les mêmes blocs ; annoncer « 8 h » est du remplissage). La fenêtre est
**circulaire** : un couche-tard à 22 h / 23 h / 0 h a bien un créneau.

### Ce que cette itération a appris

**Trois mutations ont survécu, et chacune disait quelque chose de différent.** C'est le vrai
apport de l'itération :

1. *Redondance qui masque la couverture.* Mon scénario « id qui ne colle pas à sa date » mettait
   toutes les sessions au même jour — elles tombaient donc sous le seuil `minJours`, et le seuil
   couvrait le garde-fou à sa place. Réécrit pour **discriminer** : 14 blocs, 6 jours, seul le
   désaccord id/date peut encore rejeter, avec un témoin qui passe juste à côté.
2. *Check tautologique.* Comparer la plage mise en avant à la sortie de la fonction ne vaut que
   contre une divergence rendu/mesure. Si la fonction se trompe de plage, les deux se trompent
   ensemble. La plage attendue est maintenant **épinglée en dur** en plus.
3. *La mesure ne mesurait pas ce qu'elle prétendait.* « La frise tient en 390 px » était vérifié
   dans une fenêtre de bureau. Pire : en largeur fixe, la frise **ne déborde de rien** — son
   panneau grandit avec elle. Elle mesurait **1006 px dans une fenêtre de 390** et se faisait
   rogner en silence, les dernières heures de la journée disparaissant sans un mot. La passe
   mobile la sème désormais et la mesure **face à la fenêtre**, pas face à son conteneur.

Et une rechute connue : `/\s+/` écrit dans le gabarit du harnais devient `/s+/` — la regex a
effacé tous les « s » du texte mesuré. Même famille que la règle des backticks : *dans un
gabarit, une séquence d'échappement inconnue retombe sur sa lettre.*

677 tests · SMOKE OK · frise à 298 px pour 390 de large. Rien publié : dernière release v2.13.0.

---

## Itération 76 — Le panneau des séances manquées arbitre au lieu d'énumérer

Chantier n°6 de la roadmap (« la replanification automatique »), ouvert.

**Mesuré.** Le panneau listait, puis concluait : « Pas de culpabilité — reprends le fil quand tu
veux. » Il invitait à reprendre un fil qu'il n'offrait pas — aucun geste, aucune date, aucun
créneau. Les pièces existaient toutes : `rescheduleOptions` sait trouver un trou réel,
`moveAgendaItem` sait poser le bloc, `acuteChronicRatio` sait si la semaine est déjà lourde.

**Le vrai sujet n'était pas le bouton manquant.** Proposer de rattraper trois séances par-dessus
la semaine en cours serait un mauvais conseil. `rattrapageSeances` tranche, dans cet ordre :

| Priorité | Ce qui est dit |
|---|---|
| 1. La charge | « Ne rattrape rien : ta charge est à **3,89×** ta moyenne » — et **zéro bouton**, il contredirait la phrase |
| 2. La fraîcheur | Au-delà de 3 jours, la séance est **lâchée explicitement** |
| 3. La cible | **Une seule**, la plus récente, avec des créneaux réellement libres |
| 4. L'agenda plein | « aucun trou de 60 min dans tes 7 prochains jours » — on l'avoue |

Le clic déplace vraiment le bloc. Aucune règle physiologique nouvelle : mêmes seuils que
`loadAdvice`, qui pilotait déjà cet écran.

### Ce que cette itération a appris

**Une deuxième fois le même piège de couverture, sous un autre visage.** Le tri des séances
manquées (la plus récente d'abord) était invérifiable : le filtre de fraîcheur ne laissait passer
qu'une seule séance, qui gagnait donc quel que soit l'ordre. Il a fallu **deux séances toutes deux
fraîches** pour que l'ordre décide vraiment. *Un garde-fou en aval peut rendre un garde-fou en
amont indétectable — c'est exactement ce qui s'était produit à l'itération 75 avec `minJours`.*

Et un mutant **équivalent**, signalé comme tel plutôt que maquillé : rendre les boutons quel que
soit le verdict ne change rien, `cible` valant déjà `null` dans la branche « charge ». La garde
documente l'intention ; elle n'est pas observable. Mieux vaut le dire que fabriquer un check
autour.

Mon propre jeu d'essai s'est aussi contredit une fois : j'avais logué une séance le jour même de
la « manquée » — auquel cas rien n'a été manqué. Le code avait raison, le test avait tort.

678 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 77 — Revue : un plafond d'affichage fuyait dans un comptage

Revue adversariale due. Cible : **mon code des itérations 75 et 76**.

### Le défaut, mesuré

Sur **7 séances réellement manquées** :

| Écran | Ce qu'il annonçait |
|---|---|
| Panneau Athlète | « **7** séances prévues non faites (14 j) » |
| « À rattraper » (tableau de bord) | « **5** séances non faites récemment » |

Deux nombres pour un même fait, et le plus visible des deux était **faux**.

**La cause.** `missedSessions` et `overdueStudy` tronquent leur liste à 5 par défaut — un plafond
d'**affichage**. Le digest n'affiche aucune liste, il ne veut qu'un nombre, et lisait `.length`
sur la liste tronquée. Les écrans, eux, demandaient déjà `{cap: 60}` : chacun contournait le
piège dans son coin, le digest l'avait oublié.

**Deux fois le même défaut** : les révisions en retard étaient touchées à l'identique (« 5
révisions en retard » sur 6). Trouvé en lisant les fonctions voisines, comme la règle le demande.

### Ce que cette itération a appris

*C'est mon correctif de la veille qui a rendu le défaut visible.* Tant que les deux écrans se
taisaient de la même façon, personne ne pouvait voir qu'ils ne disaient pas la même chose. **Un
écran qui devient précis met en évidence l'imprécision de son voisin** — d'où l'intérêt de faire
la revue juste après avoir enrichi un sujet, pas avant.

Et une règle à garder : **un plafond ne doit jamais fuir dans un comptage.** `cap` répond à « que
montrer », jamais à « combien y en a-t-il ». Le digest garde d'ailleurs son propre plafond de 4
items, parfaitement légitime — il limite ce qu'on affiche.

Le test devait **dépasser 5 des deux côtés** pour discriminer : à 5 ou moins, la troncature ne
change rien et le test aurait été vacant. C'est précisément pour ça que le défaut avait survécu.

**Mutations.** 4 posées, 4 détectées, chacune rejouant la divergence dans un sens ou dans
l'autre : `panneau=7 digest=5`, puis `panneau=5 digest=7`.

### Trouvé aussi, non corrigé ici — prochain sujet

`creneauDeConcentration` (itération 75) **affirme au présent sur des données périmées**. Vérifié :
avec zéro bloc de concentration depuis 35 jours, il annonce toujours « Ton créneau, c'est
9 h–12 h … Mets là ce qui demande le plus de tête. » La fenêtre de 60 jours n'exige aucune
activité récente. L'app sait pourtant déjà faire ça ailleurs — la forme du jour affiche « dernier
check-in il y a N jours » plutôt qu'un score périmé. *Un commit = un sujet : c'est l'itération 78.*

679 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 78 — Le créneau parle au passé quand il décrit le passé

Sujet nommé par la revue de l'itération 77, et vérifié : `creneauDeConcentration` raisonne sur
60 jours **sans exiger la moindre activité récente**. Avec zéro bloc depuis 35 jours, l'app
annonçait toujours « Ton créneau, c'est 9 h–12 h — mets là ce qui demande le plus de tête. »
Un constat au présent, **et un conseil d'action**, sur un comportement abandonné.

### Se taire aurait été pire

Ce créneau est justement l'information la plus utile le jour où on s'y remet. On change de
**temps**, pas de sujet :

> 🕘 Plus aucun bloc depuis 35 jours. Quand tu en lançais, c'était 9 h–12 h : 22 de tes 22 blocs
> et 100 % de tes minutes. Si tu t'y remets, c'est là que ça avait le mieux tenu.

Le conseil d'action disparaît — on ne recommande pas un créneau qu'on ne tient plus. Le titre
suit (« se pose » → « se posait ») et les barres passent du vert accent au gris : **la teinte dit
la même chose que la phrase.** C'est le modèle que l'app applique déjà à la forme du jour
(« dernier check-in il y a N jours » plutôt qu'un score périmé).

### Ce que cette itération a appris

*Une donnée peut être exacte et l'affirmation fausse quand même.* Les 22 blocs à 9 h–12 h étaient
parfaitement réels ; c'est le **temps du verbe** qui mentait. La règle « une phrase est une
affirmation : vérifier la fraîcheur » ne portait jusqu'ici que sur la valeur — elle porte aussi
sur la **conjugaison** et sur le **conseil** qui l'accompagne.

Deux détails qui font la différence entre un test et un vrai test :
- La paire qui discrimine, ce sont **les mêmes blocs aux mêmes heures, seulement plus vieux** :
  tout ce qui change doit être le temps et l'aveu de l'âge, jamais la mesure.
- **Un seuil qu'on ne teste pas à sa limite n'est pas testé** : 14 j frais, 15 j périmé.

**Mutations.** 5 posées, 5 détectées — dont celle qui remet tout au présent (le défaut d'origine,
`classe=false passe=false`) et celle qui retire la classe sans toucher au texte (`teinte`
inchangée alors que la phrase, elle, était bien au passé).

680 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 79 — La consigne de pesée, confrontée à la réalité

### La sonde a démenti ma piste, et c'est le meilleur résultat de l'itération

Je venais vérifier une fraîcheur douteuse sur la page Poids, dans la foulée de la 78. Mesuré :
l'écran dit **déjà** « Dernière pesée : 81,3 kg · il y a 45 j. ⏰ Pense à te repeser. » Rien à
corriger. *Sonder avant de juger a économisé une itération entière consacrée à un défaut qui
n'existait pas.*

### Ce qu'elle a montré à la place

L'app écrit « Pèse-toi 2 à 3×/semaine, regarde la **moyenne** de la semaine » — et ne regarde
jamais si c'est fait. Elle a pourtant toutes les dates. Pire : elle affiche « −0,42 kg/sem. »
avec la même assurance qu'on se pèse trois fois par semaine ou deux fois par mois.

`cadenceDePesee` met la **consigne et la mesure dans le même bloc** :

> ⚖️ Pèse-toi 2 à 3×/semaine, regarde la MOYENNE de la semaine…
> ⚖️ **0,5 pesée/semaine sur 4 semaines**, là où ton plan en demande 2 à 3×/semaine — dont
> **2 semaines sans aucune pesée**. À ce rythme, « −0,42 kg/sem. » relie deux points éloignés
> plutôt qu'elle ne moyenne des semaines.

Le taux cité est **celui que l'écran voisin calcule**, pas un synonyme.

### Ce que cette itération a appris

**Un conseil qui ne se relit jamais n'est pas un conseil.** L'app en prescrivait un depuis
toujours, avec les données pour le vérifier sous la main. La question à poser aux autres écrans :
*qu'est-ce que je recommande sans jamais vérifier que c'est suivi ?*

**Deux copies d'un même nombre finissent par diverger.** « 2 à 3 » ne vivait que dans la prose ;
il vit maintenant dans `CADENCE_PESEE`, et un test exige que la phrase prescrite contienne ces
bornes-là. La mutation qui les fait diverger tombe immédiatement.

Et une justification tenue au minimum : le lien cadence → fiabilité est de l'**arithmétique**
(sur une semaine vide il n'y a rien à moyenner), pas de la physiologie. Aucune règle invoquée
qu'on ne pourrait pas défendre.

**Mutations.** 7 posées, 7 détectées du premier coup — dont celle qui sort la mesure du bloc de
la consigne (`memeBloc=false` : les deux voix se séparent) et celle qui ignore la cible de
maintien, invisible sans un scénario où **le même rythme change de verdict** selon le sens de
l'objectif.

681 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 80 — Revue : trois défauts, tous de mon fait

Revue adversariale due. Cible : `cadenceDePesee` (79) et `creneauDeConcentration` (78).
Trois trouvailles, toutes vérifiées à la mesure.

### 1. On reprochait un passé qui n'existe pas

Quelqu'un qui commence son suivi il y a 10 jours et s'y tient — 5 pesées, soit **3,5/semaine sur
sa période réelle** — s'entendait dire :

> ⚖️ 1,3 pesées/semaine sur 4 semaines — **dont 2 semaines sans aucune pesée**.

Ces deux semaines sont **antérieures à sa première pesée**. On divisait son effort par du vide,
puis on lui reprochait ce vide. C'est le défaut de l'itération 65 sous un autre visage : *une
mesure honnête devient un reproche dès qu'on la calcule sur une période où l'utilisateur
n'existait pas.* La fenêtre s'arrête maintenant au début réel du suivi.

### 2. Un champ que personne ne lit

`fiabilite` : calculé, exporté, **zéro occurrence dans app.js**. Je venais de reproduire le
défaut « helper orphelin » que les itérations 71 à 74 ont passé quatre tours à corriger. Retiré.
*Écrire une valeur « au cas où » est le premier pas vers deux vérités qui divergent.*

### 3. Une phrase fausse sur le Focus

Un bloc de concentration **d'hier**, mais dont l'`id` vient d'un ancien format, laissait annoncer
« Plus aucun bloc depuis 40 jours ». Le filtre des ids sert à placer une **heure** ; il n'avait
rien à dire sur le fait qu'on soit encore actif. Corrigé à l'itération 78, ce garde-fou s'était
lui-même transformé en source d'erreur — *un filtre légitime pour un usage devient un mensonge
quand on le réutilise pour un autre.*

### Ce que cette itération a appris

**Les trois défauts sont nés du même geste : réutiliser une borne au-delà de ce qu'elle mesure.**
La fenêtre de 28 jours servait à cadrer *et* à diviser ; le filtre des ids servait à placer une
heure *et* à juger l'activité. La question à se poser en écrivant : *cette borne répond à quelle
question exactement, et à combien d'autres est-ce que je la fais répondre ?*

Un test est tombé, **et c'était voulu** : décision écrite sur place, jeu d'essai décalé pour que
le cas historique teste bien la fenêtre pleine, cas court ajouté juste en dessous.

**Mutations.** 5 posées, 5 détectées — dont celle qui recompte les trous sur la fenêtre nominale,
invisible sans le scénario du débutant.

681 tests · SMOKE OK. Rien publié : dernière release v2.13.0.

---

## Itération 81 — v2.14.0 publiée, la charge corrigée, et une restructuration sortie du lot

Adrien reprend la main en cours de route : « Publie déjà ce que t'as fait avant, et fais ça ! »,
avec quatre demandes sur l'onglet Athlète — et un reproche : *« à chaque fois je te dis ça et tu
rajoutes que des petites choses »*. Il redit aussi qu'il ne veut RIEN sur Alternance.

### Ce qui est livré

**v2.14.0 publiée** (45 commits, release GitHub non-draft, l'auto-update la voit). Au passage,
deux garde-fous cessaient d'être des corvées de release : la tête du CHANGELOG était **épinglée
en dur** dans un test — elle ne vérifiait donc que sa propre valeur. Elle se compare maintenant à
`package.json`, ce qui attrape le vrai défaut : publier une version dont l'écran « Nouveautés »
ne parle pas.

**Plus de kilos réclamés sur des pompes.** Deux causes, mesurées :
- `exerciceSansCharge` exigeait un objet portant son `kind`. Or une séance enregistrée ne
  transporte que `{name, sets, reps, load}`. `kind` vide retombait sur « garde le champ ». Il
  accepte désormais un nom seul et demande l'équipement **au catalogue**.
- Il n'était branché **qu'à un seul endroit** (la séance guidée). Le formulaire « Construis ta
  séance » affichait un libellé **statique** « Charge (kg) », exemple « 80 », quoi qu'on tape.

### La mesure qui donne raison à Adrien sur le Plan de bataille

Sondé à 390×844, onglet Athlète, sous-onglet d'arrivée :

| Position | Panneau | Hauteur |
|---|---|---|
| 1 | **carte « Nouveautés »** | **3021 px** (39 % de l'onglet) |
| 3 | Au programme aujourd'hui | 542 px |
| 6 | *Plan de bataille* | **absent — il vit dans un autre sous-onglet** |

Le Plan de bataille n'était pas « peu visible » : il n'était **pas là**. Et 3021 px d'annonces
occupaient le haut de l'écran d'entraînement, parce que les cartes transverses n'appartiennent à
aucun groupe de page et ne sont donc jamais masquées.

### Ce que cette itération a appris

**La restructuration a été SORTIE du lot, et c'est la décision qui compte.** Déplacer le panneau
marchait — mesuré : le plan passait 1ᵉʳ, 3492 px, 43 % de l'onglet — mais il est référencé par
**20 checks** pinglés sur l'ancien sous-onglet, et déplacer la carte « Nouveautés » touche le
mécanisme `pageGroups` (elle appartient à Réglages, pas au tableau de bord — erreur de ma part).
Mon heuristique de reciblage a sur-matché et cassé le panneau trail.

*Livrer ça à moitié vérifié aurait cassé le filet qui a attrapé chaque régression depuis 20
itérations.* Le chantier est réel, il est mesuré, et il mérite son propre tour.

682 tests · SMOKE OK · v2.14.0 publiée.

---

## Itération 82 — Le Plan de bataille ouvre l'onglet Athlète

Reprise du chantier sorti du lot à l'itération 81, cette fois menée à bout.

### Avant / après, mesuré à 390×844

| | Avant | Après |
|---|---|---|
| 1ᵉʳ panneau | carte « Nouveautés » — **3021 px, 39 %** | **Plan de bataille — 3492 px, 43 %** |
| Plan de bataille | **absent** (sous-onglet « Programme ») | 1ᵉʳ, à 684 px du haut |
| Cartes transverses sur Athlète | 3 | 0 |

Il n'était pas « peu visible » : il **n'était pas là** en arrivant.

### Ce que l'échec de la veille a appris

Les deux mécaniques retenues viennent directement du plantage de l'itération 81 :

- **Les cartes passent par l'étiquette `hors-athlete`**, idiome déjà présent dans le fichier,
  et non par `pageGroups`. Les y inscrire faisait gérer leur visibilité par **deux mécanismes à
  la fois** (leur propre `hidden` et `app-page-hidden`) — c'est ce qui avait cassé la fermeture
  des Nouveautés. *Quand un objet a déjà un mécanisme de visibilité, en ajouter un second ne
  s'additionne pas : il entre en conflit.*
- **Le nœud est déplacé au démarrage**, pas réordonné en CSS : les panneaux ne sont pas des
  enfants flex, `order` y est inerte — vérifié à la mesure avant d'y renoncer.

Et surtout, sur les 20 checks accrochés à l'ancien sous-onglet : **je n'ai plus deviné.** Le
smoke en a nommé cinq, seuls ces cinq-là ont été repointés, les quatorze autres restant où leurs
panneaux vivent toujours. La veille, une heuristique de contexte avait sur-matché et cassé le
panneau trail. *Laisser le harnais nommer ce qui est cassé coûte un aller-retour et évite une
rechute.*

**Mutations.** 3 posées, 3 détectées, chacune rejouant un état réellement mesuré.

682 tests · SMOKE OK. Rien publié depuis v2.14.0.

---

## Itération 83 — Le Plan de bataille se compare enfin à lui-même

Adrien : « faut qu'il soit plus complet ». Sondé bloc par bloc avant d'ajouter quoi que ce soit.

### Ce que la sonde a corrigé dans mon propre jugement

Premier passage : **cinq blocs sur quinze paraissaient vides** alors que j'avais semé six
semaines de séances. J'allais l'écrire comme un défaut. En forçant une repeinture complète, deux
d'entre eux se remplissent (`training-weekday` 136 px, `week-balance` 84 px) : *semer l'état ne
suffit pas — sans repeinture, on mesure l'écran d'avant et on croit à tort qu'un bloc est muet.*
Les trois restants attendent des blocs terminés, ce qui est légitime.

### Le vrai trou

Quinze blocs, 4305 px, et **tous parlent du passé** : tonnage 8 semaines, régularité 28 jours,
jour fort, équilibre. L'écran affichait côte à côte « Très régulier · 9 séances », « cette sem.
−100 % » et « 0/40 km » — trois chiffres pour « où j'en suis », aucun verdict. **Un plan qui ne
se relit jamais.**

> 📋 Ta semaine, face au plan — **1/6**
> ⚠️ 1/4 muscu · 0/2 courses. Il te reste 5 séances pour 3 jours d'entraînement d'ici dimanche :
> le compte n'y est pas. Double une journée, ou accepte de finir à 4/6.

**L'arbitrage porte sur le budget de temps**, pas sur le retard : « il te reste 2 séances » ne
veut rien dire sans « et 1 jour d'entraînement ». Sans jours renseignés, `tenable` vaut `null` —
et null n'est pas false : trancher sans connaître le budget serait inventé.

### Ce que cette itération a appris

**Un check qui peint lui-même ce qu'il mesure ne peut pas voir que l'app ne le peint pas.** La
mutation qui retirait `renderAvancementSemaine()` de la chaîne de rendu a SURVÉCU : mon check
appelait le renderer à la main. Il repasse désormais par `render()`, la chaîne de l'app.
*Mesurer l'effet d'un rendu suppose de laisser l'app le déclencher.*

**Mutations.** 6 posées, 6 détectées après cette correction.

683 tests · SMOKE OK. Rien publié depuis v2.14.0.

---

## Itération 84 — Séance guidée : l'écran qu'on manipule en séance

Dernier point de la liste d'Adrien. Sondée à 390×844, dialogue réellement ouvert.

### Deux défauts, mesurés

**L'exercice en cours était en bas.** L'échauffement et la prépa ouvraient le dialogue ; le nom
de l'exercice n'apparaissait qu'à **563 px**, hors du premier écran. Or l'échauffement se
consulte *une fois* ; le bloc « exercice + valider mes séries » se relit toutes les 90 secondes.
Les accordéons descendent au-dessus du retour au calme → le nom remonte à **463 px**.

**Tout l'écran était sous le seuil tactile** : « Remplacer » 32 px, les ± du repos 32 px, les
cinq « Valider » de séries 37 px, la fermeture 42 px. Sur l'écran qu'on manipule entre deux
séries, main moite.

### Ce que cette itération a appris

**C'est le CHECK qui a trouvé le vrai périmètre, pas la sonde.** Ma sonde n'avait vu qu'un bouton
sous 44 px ; le check, qui ouvre la séance dans un contexte plus complet, en a listé huit.
*Un garde-fou n'est pas seulement une protection après coup : c'est souvent une meilleure sonde
que la sonde, parce qu'il tourne dans l'état réel de l'app.*

**Une promesse, un seul endroit.** La 4ᵉ mutation a survécu : j'avais posé la hauteur tactile
DEUX fois — une règle spécifique sur « Remplacer » et une garantie globale. Chacune couvrait
l'autre, donc aucune n'était testable. Le doublon a été retiré, pas contourné par un test de
plus.

**Mutations.** 4 posées, 3 détectées, la 4ᵉ ayant servi à supprimer la redondance qu'elle
révélait.

683 tests · SMOKE OK. Rien publié depuis v2.14.0.

---

## Itération 85 — Revue : deux vérités sur ce que le plan demande

Revue adversariale des itérations 82-84. **Trois hypothèses, trois démentis par la mesure**,
puis un vrai défaut — de mon fait, à l'itération 83.

### Ce que la mesure a démenti

| Soupçon | Verdict |
|---|---|
| La garde d'idempotence de `descendreEchauffement` ferait alterner l'ordre | **Faux** — stable sur 4 ouvertures |
| Le plan généré ne suivrait pas les réglages | **Ma sonde passait la mauvaise forme d'entrée** |
| Le plan produirait 0 course | **Le champ s'appelle `kind`, pas `type`** |

*Deux « écarts » que j'ai failli rapporter n'étaient que mes propres sondes mal formées.*

### Le défaut, lui, est réel

Mesuré sur **8 configurations, 7 en désaccord** : « Ta semaine, face au plan » comparait à
`goals.sessions`, le **réglage brut**. Or la forme de l'objectif l'emporte — « prise de muscle »
pose 4 séances quoi qu'on règle, tandis que les courses suivent le réglage. Le bloc annonçait
donc **« 6 muscu » juste au-dessus d'un plan qui en affichait 4**. La faute (B) exacte que je
passe mon temps à corriger ailleurs, commise sur mon propre ajout de la veille.

Ce que le plan demande se lit désormais **dans le plan généré**. 7 écarts sur 8 → 0.

### Ce que cette itération a appris

**Deux absences qui ne veulent pas dire la même chose**, tranché en écrivant le test : pas de
plan → repli sur le réglage ; plan dont la semaine est **vide** → il prescrit réellement zéro
(repos, décharge), donc on se tait. Réciter le réglage là serait le même défaut dans l'autre sens.

**Un test doit prouver que son scénario DISCRIMINE.** Le nouveau test vérifie d'abord que le
réglage et le plan sont bien en désaccord — sans ce témoin, il passerait aussi sur un cas où les
deux coïncident, et c'est précisément pour ça que le défaut a vécu.

**Ne pas épingler un nombre qui bouge.** Le check « semaine bouclée » de l'itération 83 semait
« exactement ce que le plan demande » — or le plan **s'adapte aux séances déjà faites** : la
cible se déplaçait pendant qu'on visait. Il teste maintenant la bascule de ton, pas un compte.

**Mutations.** 4 posées, 4 détectées.

683 tests · SMOKE OK. Rien publié depuis v2.14.0.

---

## Itération 86 — La mémoire des blocs va jusqu'au conseil

Chantier n°9 de la roadmap. Sondé d'abord : les trois blocs « muets » du Plan de bataille
(`blockCompare`, `blocksByObjective`, `limitationsNote`) **parlent dès qu'il y a des blocs
terminés** — pas de défaut, ils attendent légitimement des données.

Le vrai manque était ailleurs, et la roadmap l'avait nommé : *« la comparaison n'est jamais
tirée jusqu'à la recommandation »*. L'écran affichait « +40 % de tonnage » et s'arrêtait.

`memoireDesBlocs` regroupe les blocs terminés par leur **cadence réellement tenue** et compare
le tonnage par semaine :

> 🧠 À 3,5 séances/semaine tu produis 11,2 t par semaine, soit 100 % de plus qu'à 2. C'est une
> observation sur 2 blocs à toi, **pas une règle** — mais si tu hésites pour le prochain, elle
> penche de ce côté.

**Ce qu'on refuse de dire** : avec une seule cadence dans l'historique, deux blocs au même
rythme ne disent rien *sur* le rythme. On décrit et on l'assume plutôt que de fabriquer une
causalité.

### Ce que cette itération a appris

**Un facteur constant ne se teste pas.** La mutation qui retirait la normalisation par semaine a
survécu : tous mes blocs faisaient 4 semaines, donc diviser par la durée ne changeait aucun
classement. Il a fallu **deux blocs de longueurs différentes, à tonnage total égal**, pour que
la normalisation devienne observable. *Une opération qui s'applique identiquement à tous les
éléments du jeu d'essai est invisible — il faut faire varier ce par quoi elle divise.*

Et une regex trop stricte a fait tomber un test juste : j'exigeais « séances/semaine » au pluriel
là où la phrase disait correctement « 1 séance/semaine ». *Un test doit viser son sujet, pas une
forme grammaticale qui dépend de la valeur.*

**Mutations.** 5 posées, 5 détectées après élargissement du jeu d'essai.

684 tests · SMOKE OK. Rien publié depuis v2.14.0.

---

## Itération 87 — La force rattachée au rythme, et trois libellés faux trouvés en relisant

Fin du chantier n°9. `memoireForceParCadence` attribue le gain de 1RM estimé à la cadence du bloc
où il a été réalisé, et sa phrase vit **dans le panneau du tonnage** — deux encadrés au titre
jumeau seraient le double avis qu'on supprime ailleurs.

### Une panne d'outillage devenue relecture

L'exécution et l'édition ont été indisponibles plusieurs tours. Faute de pouvoir muter, j'ai
relu — et trouvé **trois libellés faux**, tous de la même famille : *un libellé qui promet un
périmètre que le chiffre ne couvre pas.*

| Défaut | Ce que le chiffre couvrait vraiment |
|---|---|
| « en moyenne par bloc » | une moyenne **par exercice** (le compteur tourne par exercice × transition) |
| « Squat **y** a pris le plus » | son gain **toutes cadences confondues** |
| « observation sur N blocs » | des blocs **archivés**, dont certains écartés |

*Une panne n'est pas forcément du temps perdu : la relecture attrape une classe de défauts que
la mutation ne cible pas — celle où le code est juste et la phrase fausse.*

### Un test est tombé, et il avait raison

Avec trois blocs dont le deuxième est vide, la comparaison mécanique « i−1 → i » perdait **tout**.
Or un bloc sans séance ne coupe pas la progression, il la met en pause : une **référence
glissante** enjambe désormais les vides. Contrat décidé sur place, pas assoupli.

### Deux mutations survivantes, deux causes à ne pas confondre

- **Redondance** : la garde `cad > 0` était impliquée par l'absence d'exercices. Doublon retiré —
  pas de test fabriqué autour.
- **Jeu d'essai non discriminant** : un seul exercice par cadence ⇒ diviser par 1 ne change rien.
  Il faut **deux exercices sur la même cadence**. Exactement la leçon de l'itération 86 (tous les
  blocs faisaient 4 semaines), sous un autre visage : *une opération uniforme sur le jeu d'essai
  est invisible ; il faut faire varier ce sur quoi elle porte.*

685 tests · SMOKE OK. Rien publié depuis v2.14.0.

---

## Itération 88 — Revue : l'app félicitait un recul

Revue adversariale des itérations 85-87, sur la cible annoncée : la **référence glissante** de la
veille, la mécanique la plus fraîche et la plus subtile. Deux défauts, tous deux de mon fait.

### 1. « Ta force progresse le plus… −12,5 kg »

Avec des charges décroissantes — blessure, décharge, reprise — la phrase disait :

> 🏋️ Ta force **progresse le plus** à 1 séance/semaine : **−12,5 kg** … Squat y **a pris** le plus
> (−12,5 kg).

Trois mots faux dans une phrase : « progresse » quand tout recule, « le plus » pour désigner la
**moins mauvaise**, « a pris » pour une perte. *L'app félicitait un recul.* Un recul se nomme
désormais recul, sans désigner de gagnant parmi des pertes.

### 2. La référence glissante enjambait le temps

Introduite la veille pour franchir un bloc **vide** — légitime : un bloc sans séance met la
progression en pause, il ne la coupe pas — elle n'avait **aucune limite d'âge**. Mesuré : un bloc
de janvier 2024 servait de référence à un bloc de juin 2026, et l'app annonçait « +76 kg à
3,5 séances/semaine ». **Deux ans et demi attribués à quatre semaines de cadence.** La référence
expire maintenant à 180 jours.

*Un correctif qui lève une contrainte en crée souvent une autre : en autorisant à enjamber un
bloc, j'ai autorisé à enjamber des années. La question à se poser après chaque assouplissement :
qu'est-ce que je viens de rendre possible en plus de ce que je voulais ?*

### Un accident de patch, à retenir

Mon ancre `let phrase; if (!comparable) {` existait dans **deux** fonctions, et le `split/join` a
injecté la branche « recul » dans `memoireDesBlocs` aussi — qui parle de tonnage et n'a pas cette
variable. Les tests l'ont attrapé sur le coup (`aucuneProgression is not defined`).
**Un `split/join` sur une ancre non unique modifie du code qu'on n'avait pas l'intention de
toucher** — vérifier l'unicité avant, ou remplacer par position.

**Mutations.** 5 posées, 5 détectées, dont le témoin en charges croissantes : sans lui, une phrase
figée sur « reculé » passerait pour un succès.

685 tests · SMOKE OK. Rien publié depuis v2.14.0.

---

## Itération 89 — Focus : la cible hebdo confrontée à son historique

Retour sur Focus après six itérations d'Athlète, avec la question la plus productive de la
boucle : *qu'est-ce que l'app PRESCRIT sans jamais vérifier que c'est suivi ?*

**Mesuré** sur huit semaines dont trois au-dessus de la cible : l'app fixe 120 min/semaine,
rapporte la semaine **en cours** et la compare à la **précédente** — et ne dit jamais combien de
fois cette cible est tenue. *Une cible qu'on ne confronte pas à son passé n'est qu'un chiffre
affiché.* Exactement la faute de la cadence de pesée (itération 79).

Une pastille par semaine — la régularité se **voit** avant de se lire — et trois verdicts :

| Cas | Ce qui est dit |
|---|---|
| Irrégulier | « 3 semaines sur 8, soit 38 %. Pleines : 150 min, autres : 50 — **ce n'est pas la cible qui coince, c'est la régularité.** » |
| Habitude (≥70 %) | « 7 sur 8. Une habitude installée, plus un effort — et 7 d'affilée. » |
| Jamais atteinte | « Ton maximum est 75 min pour 120 visées. **À 75 min, tu la tiendrais.** » |

Le dernier cas est le plus utile : proposer une cible **atteignable**, calculée sur son propre
maximum, plutôt que répéter celle qu'il n'atteint pas.

**Deux périodes refusées**, toutes deux apprises à la revue 80 : la semaine en cours (pas finie) et
les semaines antérieures au premier bloc (rien à tenir).

### Ce que cette itération a appris

**Deux rechutes sur des pièges déjà documentés, dans le même tour :**
- une **regex dans un gabarit** de sonde — `\/` y ferme la regex trop tôt et le script meurt sans
  message utile. Les sondes n'utilisent plus de regex, seulement `indexOf` ;
- des **backticks dans un commentaire** du harnais, qui tuent le fichier au chargement.

*Connaître une règle ne suffit pas : ces deux-là sont invisibles à la relecture et ne se voient
qu'à l'exécution. L'audit des backticks doit tourner à CHAQUE retouche du harnais, pas quand on y
pense.*

**Mutations.** 6 posées, 6 détectées, dont celle qui allume toutes les pastilles (`frise=false`) —
la frise redevenait décorative.

686 tests · SMOKE OK. Rien publié depuis v2.14.0.

---

## Itération 90 — Focus : ce que l'énergie du matin annonce

Chantier n°10, volet « focus → journée ». Vérifié **dans le code** (et pas par mot-clé — voir
ci-dessous) : l'énergie du matin sert au check-in du jour, à pré-remplir un champ, et de
**résultat** dans `sleepImpactReport`. Jamais de **prédicteur** — alors que c'est la seule mesure
disponible au moment où l'on décide de sa journée.

> ⚡ Tes journées à énergie haute (4/5) te donnent **100 min** de concentration, contre **25 min**
> les jours bas (2/5). Sur 40 jours à toi.
> **Ce matin tu es à 2/5 : vise un bloc court plutôt qu'une longue session.**

Le conseil du jour n'apparaît **que** si une énergie est notée ce matin. Écart nul → l'app le dit
et renvoie vers ce qu'elle sait déjà mesurer (créneau, sommeil). Le lien inverse existe aussi et
se nomme.

### Ce que cette itération a appris

**Un faux positif de mon propre test.** Ma sonde concluait « déjà couvert » parce que la page
contient « énergie » *et* parle de focus ailleurs. C'est exactement le piège que je m'étais écrit
— *ne jamais asserter une chaîne sur un conteneur qui la contient déjà.* La vérification au niveau
du code a tranché en trente secondes. *Une heuristique par mot-clé répond à « les deux mots
existent-ils ? », pas à « sont-ils reliés ? ».*

**La médiane d'une échelle ordinale est une valeur observée.** Avec 21 jours à 2/5 et 20 à 4/5,
elle vaut 2 — le partage strict vidait le groupe bas et la fonction se taisait, alors que l'écart
mesuré était de 25 min contre 100. *Sur une échelle à cinq crans, un partage strict autour de la
médiane peut supprimer un groupe entier.* Trois partages sont essayés, du plus contrasté au plus
permissif.

**Le conseil doit lire le groupe, pas le seuil.** Il comparait à la médiane alors que le partage
retenu pouvait être inclusif : un 2/5 rangé dans les jours bas s'entendait dire « pile ta
moyenne ».

**Troisième garde IMPLIQUÉE par construction.** Après l'itération 84 (hauteur tactile en double) et
la 87 (`cad > 0` impliqué par l'absence d'exercices), voici `moyE(haut) > moyE(bas)` — vrai par
construction des prédicats. *Une garde qu'aucune entrée ne peut mettre en défaut n'est pas une
sécurité : c'est du bruit qui masque la couverture. On la retire, on ne la teste pas.*

**Mutations.** 6 posées, 6 détectées après retrait de cette garde.

687 tests · SMOKE OK. Rien publié depuis v2.14.0.

---

## Itération 91 — Revue : trois branches atteignables que rien ne gardait

Revue adversariale des itérations 88-90, sur la cible annoncée : le partage à trois niveaux de
`energieEtFocus`, *« le genre de mécanique à cas multiples où un chemin reste non testé »*.
C'était exact — et il y en avait **trois**.

**Aucun défaut.** Les trois branches se comportent correctement, vérifié à la mesure. Mais aucune
n'était gardée : un changement futur les cassait en silence.

| Branche | Quand elle sert | Ce qu'elle évite |
|---|---|---|
| `hautInclus` | la médiane est la valeur **haute** (20 j à 2/5, 21 à 4/5 → médiane 4) | une corrélation nette qui redevient `null` |
| « entre tes deux profils » | énergie du matin **pile** à la médiane, hors des deux groupes | trancher au hasard |
| « tes cadences se valent » | deux cadences au **même** gain moyen | désigner une gagnante inexistante |

### Ce que cette itération a appris

**Une fonction à cas multiples se teste par ses CAS, pas par son cas nominal.** Trois branches
écrites, une seule couverte — et les trois étaient *justes*, ce qui rendait le trou invisible
autrement qu'en les énumérant une par une. *La question à poser après avoir écrit un `else if` :
quelle entrée exactement l'atteint, et est-ce que je l'ai fabriquée ?*

Et la mutation la plus parlante rebranche l'exercice phare sur la branche d'égalité : c'est le
**« y » sans référent** que la revue 88 avait déjà corrigé ailleurs. *Un même défaut de langage
réapparaît branche par branche — le corriger une fois ne le corrige pas partout.*

**Mutations.** 4 posées, 4 détectées.

687 tests · SMOKE OK. Rien publié depuis v2.14.0.

---

## Itération 92 — Le donjon du focus sépare agir de comprendre

**J'allais ajouter un 9ᵉ angle à Focus. La sonde m'en a dissuadé.** Entre « prépare ta tâche » et
le parking à pensées, **six blocs d'analyse** s'étaient empilés (657 px) — dont **trois de mes
propres itérations** (75, 89, 90). J'avais accumulé dans le panneau dont le rôle est d'*exécuter*.

| | Avant | Après |
|---|---|---|
| `.focus-task` | 1024 px | **369 px** |
| Parking à pensées | enfoui sous 657 px d'analyses | remonte de **655 px** |
| Analyses | 6 blocs empilés | 6 blocs dans un pli, à un clic |

Motif déjà employé pour l'échauffement guidé (84) et les nouveautés (57). Rien n'est supprimé.

### Ce que cette itération a appris — quatre erreurs de méthode

**1. `getComputedStyle().display` ne suffit pas sur un `<details>` fermé.** Mesuré : le display
reste `block`, `offsetParent` reste présent, la hauteur de la boîte reste 92 px. **Seul
`checkVisibility()` distingue les deux états.** La règle maison mérite cette nuance.

**2. Un check qui mesure des hauteurs doit le faire là où la chose est visible.** La passe tourne
sur le tableau de bord, où le donjon est masqué et tout vaut 0 — même erreur qu'à l'itération 75
(frise mesurée dans une fenêtre de bureau).

**3. Trois backticks dans des commentaires du harnais, en trois patchs.** Et mon audit était
**filtré** sur les lignes de mon propre bloc, donc aveugle aux voisines. *Un audit filtré n'est
pas un audit.*

**4. Cet audit était faux depuis le début.** La ligne qui referme un gabarit ne *commence* pas par
un backtick : mon test ne la voyait jamais, l'audit croyait rester « dans le gabarit » jusqu'à la
fin du fichier et noyait le vrai signal dans dix faux positifs. Réécrit en comptant la **parité**
des backticks. *Un garde-fou qui n'a jamais rien attrapé mérite qu'on vérifie qu'il fonctionne.*

Pas de fonction pure ici : c'est une hiérarchie d'affichage, gardée par le check seul.
**Mutations.** 5 posées, 5 détectées, dont celle qui **supprime** les blocs au lieu de les
déplacer (`trouves=0/6`).

687 tests · SMOKE OK. Rien publié depuis v2.14.0.

---

## Itération 93 — Les révisions en retard s'arbitrent par l'échéance

### Deux pistes écartées par la mesure, avant d'en trouver une vraie

- **Le rituel du matin** est déjà bien ordonné : action de 4894 à 5148 px, analyse de 5190 à 5818.
  L'action précède l'analyse — ce n'est pas le défaut du donjon. *Je n'ai pas appliqué le pli par
  réflexe.*
- **`fruit`** (nutrition) est bien relu par `fruitDays` : pas d'orphelin là.

### Le vrai manque, nommé par ma propre roadmap

Côté études, l'écran affichait la liste puis « Reprogramme-les dans le calendrier plutôt que de
les oublier » — **une consigne sans mécanisme**, l'état d'avant l'itération 76 pour les séances.
Et `overdueStudy` ne rend pas d'`id`, donc rien ne pouvait bouger.

**Ce qui arbitre ici n'est pas la charge mais l'ÉCHÉANCE** — la différence de fond avec le jumeau
sportif :

> 📕 À reprendre en premier : Révision Compta, sautée **il y a 12 jours**. Son épreuve (Compta) est
> dans **5 jours**. 3 créneaux libres — pose-la là. L'autre est vieille et sans épreuve proche :
> laisse-la.

Le tri est l'**inverse** de celui du sport : une épreuve proche rend rattrapable une révision
pourtant vieille.

### Ce que cette itération a appris

**Trois défauts de ma part, tous attrapés par les garde-fous :**

1. **`appariee` se déduisait** en comparant l'épreuve retenue au repli — faux dès que l'épreuve
   appariée se trouvait *être* la plus proche, soit le cas le plus fréquent. *Un fait se constate,
   il ne se déduit pas d'une comparaison à son propre repli.*
2. « Les **1** autres sont vieilles » — accord au singulier manquant.
3. **Un check ne doit pas dépendre de l'heure à laquelle il tourne.** Mon agenda « plein » ne
   bloquait que 08:00-22:00 ; le smoke tournant à 00:29, `rescheduleOptions` proposait
   « Aujourd'hui 00:44 » et le verdict basculait. *Le pendant, côté horloge, de « un test doit
   asserter son sujet, pas une valeur vraie ce jour-là ».*

Et l'audit des backticks corrigé à l'itération 92 **a attrapé une faute avant le smoke** — premier
bénéfice concret de l'avoir réparé.

**Mutations.** 6 posées, 6 détectées. La dernière a d'abord survécu par **manque de scénario** (et
non par check creux) : la branche « agenda plein » n'était pas rendue.

688 tests · SMOKE OK. Rien publié depuis v2.14.0.

## Itération 94 — revue adversariale : un appariement se constate, un possessif s'assume

Revue des itérations 91-93 (la troisième depuis la 91), visée annoncée d'avance : **l'appariement
révision ↔ épreuve par libellé**, posé à l'itération 93. Une correspondance approximative est
l'endroit où les faux positifs se cachent.

**Sondé avant de juger.** Six libellés dégénérés contre deux épreuves (Compta dans 5 jours, Droit
dans 40) :

```
titre vide ""              -> epreuve=Compta appariee=true   <- faux
titre absent (undefined)   -> epreuve=Compta appariee=true   <- faux
titre = un espace          -> epreuve=Compta appariee=true   <- faux
titre = "a"                -> epreuve=Compta appariee=true   <- faux
« Relire mes fiches »      -> epreuve=Compta appariee=false  <- temoin correct
« Droit des sociétés »     -> epreuve=Droit  appariee=true   <- temoin correct
```

Les témoins normaux se comportaient bien : le jeu d'essai **discriminait**.

### Deux affirmations fausses, toutes deux de moi

1. **Une chaîne vide est sous-chaîne de tout**, et « compta » contient « a ». La direction inverse
   du test (`m.indexOf(titre)`) rendait donc *n'importe quelle* épreuve « appariée » à un libellé
   vide ou d'une lettre. Ce n'est pas qu'un booléen faux : comme **l'épreuve dicte l'ordre** du
   rattrapage (itération 93), la révision passait sous la mauvaise matière *et* la mauvaise
   échéance. Seuil de trois caractères **des deux côtés**.

2. **Le possessif est une affirmation.** La phrase disait « **Son** épreuve (Compta) est dans 5
   jours » même quand aucun libellé ne correspondait — alors que `appariee: false` disait le
   contraire *dans le même objet*. Le repli sur l'épreuve la plus proche reste utile (l'échéance fixe
   la pression réelle) ; il se dit maintenant « **Ta prochaine** épreuve ».

Le second défaut a été trouvé en **écrivant le test du premier** : mon assertion « pas de "Son
épreuve" pour un libellé dégénéré » allait tomber, et la raison n'était pas le test.

### Ce que cette itération a appris

**Deux mutations ont survécu au premier essai, et chacune disait quelque chose de vrai :**

- **Un cas de test peut être vacant sans en avoir l'air.** « ab » n'est sous-chaîne d'aucune de mes
  matières : il ne s'apparie pas *même sans seuil*. Il ne testait donc rien, et un seuil descendu à
  2 passait inaperçu. Remplacé par « co », qui **est** dans « compta ». *Un seuil se teste sur une
  valeur qui le franchit, pas sur une valeur qui échoue pour une autre raison.*
- **Une garde jamais exercée est une garde non testée.** Toutes mes matières faisaient trois lettres
  ou plus, donc le seuil *côté matière* ne servait jamais. Le cas qui l'exerce : une matière « SI »
  — que « révision » contient (« revi-**SI**-on »). Sans la garde, « Révision Droit » s'apparie à SI,
  et comme SI est l'épreuve la plus proche elle prend la tête de l'arbitrage.

**Un harnais de mutation se prouve avant de juger quoi que ce soit.** Mes deux premières tentatives
de muter le *check de rendu* ont rendu « SURVIVANTE » alors que le smoke ne démarrait même pas :
d'abord lancé sous `node` (le smoke tourne sous **Electron**), puis via `electron.cmd` sans shell
(code `null`, sortie vide). Le troisième lanceur commence par un **témoin non muté** et refuse de
conclure si le témoin ne rend pas `SMOKE OK`. *« Une mutation qui survit = check creux, harnais
mort, ou redondance » — c'était le cas du milieu, deux fois de suite, et je l'ai d'abord lu comme le
premier.*

Et **l'audit des backticks a servi une fois de plus** : mes propres `` `appariee` `` dans un
commentaire du gabarit, attrapés avant le smoke. Septième fois — la parade, elle, tient.

**Mutations.** 6 sur la logique (dont le seuil à ses **deux** frontières, 3→2 et 3→4, et le
possessif dans les **deux** sens : « toujours son » *et* « toujours ta prochaine » — un test qui
n'interdit qu'un sens laisse passer l'autre) + 2 sur le check de rendu. 8/8 détectées.

688 tests · SMOKE OK. Rien publié depuis v2.14.0.

## Itération 95 — la séance guidée : ce qu'on fait maintenant domine l'écran

**Recadrage d'Adrien en cours d'itération.** J'avais commencé le chantier n°5 (l'arbitrage sous
budget de temps, côté Agenda) en suivant l'ordre du prompt de boucle. Adrien a arrêté : « reprends
uniquement sur l'ONGLET ATHLETE, poids si tu veux, mais c'est tout », puis « pousse vraiment
l'onglet Athlète à fond et aussi que les séances guidées soit optimisé à fond ». Rien n'était encore
écrit dans le code pour l'Agenda — j'en étais à la sonde — donc rien à annuler. **L'ordre inscrit
dans le prompt de boucle est périmé** : Athlète et Poids seulement.

### Sondé avant de juger — et la mesure était accablante

Sonde Electron 390×844, styles calculés (la capture d'écran ne marche pas sur cette machine) :

```
titre de séance « Haut du corps »   24 px   y=48
« 1 / 4 » (où tu en es)             12 px   y=96
« Squat » — l'exercice EN COURS     18 px   y=463   <- le plus petit texte de l'écran
chrono de repos                     31 px   y=1366
labels « kg » / « reps »             9 px   y=745
boutons − / +                    42×44 px           (norme maison : 44)
```

**L'information la plus utile était le texte le plus petit.** Et ce qui dit *quoi taper* faisait
9,3 px, sur un écran qu'on regarde essoufflé entre deux séries.

Deux chiffres mentaient en plus, du même défaut que la révision de l'itération 78 :

- `sessionMinutes(TOUS les exercices)` → « ≈ 28 min » **identique de la première à la dernière
  série**, alors que la forme de la phrase annonce un temps restant.
- barre = `(index+1)/total` → **25 % sur quatre exercices avant la première série**.

### Ce qui a été fait

`avancementSeanceGuidee` et `etapesDeLaSeance` (pures, injection des minutes parce que
`exercisePrescription` a besoin du catalogue et vit dans app.js). Le temps restant se déduit au
prorata des séries qui restent (mesuré au rendu : **19 min → 13 min** après un exercice bouclé), la
barre part de 0, et la **carte de la séance** liste les étapes avec leur état réel, leurs minutes,
et un clic pour y sauter. Hiérarchie refondue : nouveau cran `--fs-3xl` pour le nom de l'exercice,
titre de séance ramené au rang de contexte, labels à 12,5 px, cibles tactiles à 44 px.

### Ce que cette itération a appris

**Un contrat de garde-fou peut être faux.** Le check `typeHierarchy` exigeait `t > n` — « un titre
de modale doit dominer ce qu'il coiffe ». C'est précisément ce contrat qui protégeait le défaut
qu'Adrien signalait. La règle générale ne tient pas sur un écran d'**action** : le titre de séance y
est du contexte, déjà nommé par l'eyebrow juste au-dessus. Inversé **sciemment**, avec la raison
écrite sur place, et la contrainte garde **deux bornes** (le nom domine ET le titre reste lisible à
14 px) — un check relâché d'un côté n'est plus un check.

**Un état ne se déduit pas d'une position.** `statut: k < i ? 'fait' : …` était le raccourci
évident pour la carte de la séance — et il est faux : on peut sauter un exercice, y revenir, ou
passer à la suite sans avoir tout validé. L'état vient des séries. C'est le cousin exact de la leçon
de l'itération 93 (« un fait se constate, il ne se déduit pas »).

**Valider une série REPEINT tout l'écran guidé.** Mon propre check a d'abord échoué là-dessus : une
`NodeList` capturée avant le premier clic ne désigne plus que des nœuds détachés, donc les clics
suivants ne faisaient rien — la barre montait à 10 %, soit **une** série sur dix, et le saut d'étape
ne partait pas. Diagnostic lu dans `__hierGuidee`, pas deviné. *Après un effet, on re-interroge le
DOM ; on ne réutilise pas une référence.*

**Mutations.** 9 posées (5 sur la logique, 4 sur le rendu : token de taille, labels, cibles
tactiles, carte jamais peinte), 9 détectées — chaque famille précédée d'un **témoin non muté**,
comme la revue 94 l'a imposé.

690 tests · SMOKE OK. **Publié en v2.15.0** à la demande d'Adrien (14 itérations depuis v2.14.0).

### Ce qui attend, mesuré et pas encore fait

La sonde a aussi trouvé, sur l'onglet Athlète lui-même : **une trentaine de panneaux au MÊME poids
visuel** (titre 18 px / 700, rayon 20, eyebrow) — la page se lit comme une liste de blocs
équivalents, sans rien qui dise ce qui compte. Et le **Plan de bataille fait 3 664 px de haut pour
5 189 caractères**, soit 4,3 écrans de scroll pour un seul panneau. C'est la prochaine cible.

## Itération 96 — l'attribut `hidden` cachait à moitié, sur toute l'app

Parti pour replier le Plan de bataille (mesuré 3 664 px à l'itération 95, soit 4,3 écrans pour un
seul panneau). La sonde de son intérieur a donné la structure — un seul enfant, `#objectiveResult`,
pèse **2 618 px et 3 977 caractères sur 5 189** — mais elle a aussi trouvé cinq conteneurs à
**22-24 px et ZÉRO caractère**. Vérification : ils portaient tous `hidden`.

```
blockCompare        hidden=true  display=flex  22 px   <- l attribut est ECRASE
blocksByObjective   hidden=true  display=flex  24 px
tonnageTrend        hidden=true  display=flex  24 px
trainingConsistency hidden=true  display=flex  24 px
trainingByWeekday   hidden=true  display=flex  24 px
weekBalance         hidden=true  display=none   0 px   <- celui-la a sa garde
```

**C'est le défaut que mon propre protocole nomme mot pour mot** : « toute classe qui pose
`display:` doit avoir sa règle `[hidden]{display:none}` juste en dessous ». `hidden` n'est qu'un
`display:none` de la feuille de l'agent utilisateur ; la moindre règle d'auteur le bat.

L'audit global sur les 7 pages a montré que le sujet n'était pas local :

```
installCard   332x50   sur les SEPT pages       zonePlanBar   282x84
#weekGrid     746x380  sur les sept pages       guidedResume  282x24
+ habitsAtRisk, lifeStepStats, wellnessNudge, wellnessZone, hydraPace,
  focusOutcomes, recentLessons…
```

**51 gardes posées**, chacune sous sa règle. Le lint statique a révélé **30 cas latents de plus** —
`#overdueStudy`, `#loadAdvice`, `#recoveryScore`, `#blockStatus`, `#guidedLastSession`… invisibles à
l'audit parce qu'ils avaient du contenu au moment de la sonde, mais qui deviennent des bandes dès
qu'ils sont vides.

### Ce que cette itération a appris

**Deux garde-fous de portées différentes valent mieux qu'un.** Le lint statique lit les `hidden`
écrits dans `index.html` : règle générale, aucun nom en dur, tout nouveau bloc couvert d'office. Le
check au rendu parcourt 8 pages + 4 sous-onglets et mesure la **rect**. La mutation le démontre :
retirer `#weekGrid[hidden]` laisse le **lint vert** et fait **tomber le smoke** — parce que ce
`hidden` est posé par `app.js` à l'exécution, hors de portée du statique. *Un garde-fou dont on ne
connaît pas la portée n'en est pas un.*

**Ma sonde 390 px avait manqué le plus gros.** `#weekGrid` fait 746×380 px de grille fantôme — mais
seulement en largeur bureau, où sa règle mord. J'ai mesuré à une seule largeur et j'ai cru avoir
tout vu ; c'est le check, lancé dans la fenêtre du smoke (800 px), qui l'a trouvé. *Le pendant, côté
largeur, de « un check ne doit pas dépendre de l'heure à laquelle il tourne » (itération 93).*

**Un de mes checks passait GRÂCE au bug.** `pliAnalyseFocus` (itération 91) exigeait 6 analyses
visibles sur 6 après dépliage. Une analyse vide porte `hidden` ; sa bande fantôme de 24 px la
rendait `checkVisibility() === true`. La garde posée, le compte est tombé à **5/6** et le check a
sauté. Contrat corrigé sciemment : il attend désormais les analyses **non cachées**, avec un
plancher à 4 pour ne pas devenir vacant. *Un test vert n'atteste pas que le sujet est sain — il peut
attester qu'un bug le maintient debout.*

**Mutations.** 4 posées, 4 détectées, chaque harnais précédé de son témoin non muté.

691 tests · SMOKE OK. Rien publié depuis v2.15.0.

### Ce qui reste sur le Plan de bataille

Le repli lui-même n'est PAS fait — l'itération a basculé sur le défaut systémique, plus large et
plus rentable. Mesures à reprendre telles quelles : `#objectiveResult` = 2 618 px dont `op-week`
1 009 px (l'action, avec ses trois « ▶️ Démarrer cette séance »), `op-nutri` 464 px et `op-ramp`
347 px (de l'analyse). Le premier bouton d'action est à **1 772 px du haut**, soit le troisième
écran, derrière 1 371 px de préambule. C'est la prochaine cible : remonter l'action, replier
l'analyse.

## Itération 97 — revue adversariale : un check qui déclarait sa couverture

Revue des itérations 95-96. Visée **annoncée avant de mesurer** : le check `hiddenCacheVraiment`
que je venais d'écrire, parce que sa liste de pages était écrite à la main — et une liste en dur ne
prouve rien.

### Le défaut : 8 pages déclarées, 7 visitées, 2 trous

```
pages reelles (8) : dashboard athlete poids library nutrition focus alternance settings
liste du check (8) : dashboard agenda athlete poids library nutrition focus settings
NON COUVERTES   : alternance
NOMS SANS EFFET : agenda
```

« agenda » **n'existe pas** comme page : l'Agenda est un *overlay* ouvert par `#openWeekPage`, pas
une page de `showPage()`. Et `showPage()` sur un nom inconnu ne fait rien — silencieusement. Le
check remesurait donc le tableau de bord, n'a jamais regardé Alternance ni l'Agenda, et annonçait
quand même « aucun fantôme sur **8 pages** ».

C'est le troisième cas de la leçon « une mutation qui survit = check creux, harnais mort, ou
**redondance qui masque la couverture** » — sauf qu'ici aucune mutation ne le révélait : le check
passait, et son propre message de diagnostic mentait.

### Corrigé

La liste vient du DOM (`[data-page]`), chaque visite est **prouvée par `aria-current`** (un nom sans
effet fait tomber le check), l'Agenda est visité comme l'overlay qu'il est — vue semaine **et** vue
mois — et un plancher à 8 pages empêche une réduction silencieuse de la couverture.

### Vérifié sans défaut trouvé

- **Les 51 gardes `[hidden]` mordent.** 43 forcées à `hidden` une par une, après les avoir rendues
  mesurables : rect à zéro pour toutes. Aucune ne perd sa guerre de spécificité. (85 sélecteurs
  n'étaient jamais visibles dans cet état — dit tel quel plutôt que compté comme vérifié.)
- **Le saut d'étape de la séance guidée conserve l'état.** Le check ne testait que le saut *avant* ;
  le cas qui discrimine est le **retour arrière** sur un exercice déjà validé. Mesuré : Squat 4/4 →
  saut vers Gainage → retour → Squat **4/4 toujours là**, carte à jour, un seul `aria-current`.

### Ce que cette itération a appris

**Un message de diagnostic est une affirmation comme une autre.** « aucun fantôme sur 8 pages »
était faux sur le nombre *et* sur les pages, et je l'ai lu trois fois sans le vérifier parce qu'il
disait ce que je voulais entendre. La règle « une phrase est une affirmation : vérifier la
fraîcheur » vaut aussi pour les phrases que mes propres garde-fous m'écrivent.

**Ce qui énumère doit dériver, pas déclarer.** Toute liste écrite à la main dans un check est une
occasion de divergence avec l'app. Quand la liste vient du DOM et que chaque élément prouve son
effet, le check ne peut plus se tromper sur son propre périmètre.

**Mutations.** 3 posées, 3 détectées — dont celle qui remet ma liste en dur et fait maintenant
tomber le check sur `non confirmees[agenda]`.

691 tests · SMOKE OK. Rien publié depuis v2.15.0.

*(Le repli du Plan de bataille reste la prochaine cible, mesures inchangées : l'action `op-week`
à 1 772 px du haut, derrière 1 371 px de préambule.)*

## Itération 98 — le Plan de bataille ouvre sur l'action

La cible annoncée depuis deux itérations. Mesures d'avant, en 390 px : **3 664 px** de panneau
(4,3 écrans), premier « ▶️ Démarrer cette séance » à **1 772 px** du haut — le troisième écran —
derrière 1 371 px de préambule et cinq séances dépliées d'un bloc (1 009 px).

Trois gestes, chacun mesuré après coup :

| geste | effet |
|---|---|
| une seule séance dépliée (celle du jour) | 3 664 → 3 098 px |
| l'explication dans un pli (899 px) + l'action remontée | → 2 136 px |
| les réglages sous le résultat | bouton 1 772 → **1 127 px** |

`seanceAMettreEnAvant` choisit : la séance d'aujourd'hui, sinon la **prochaine** en tournant sur la
semaine. Le pli reprend l'idiome du donjon du Focus (91) et la réorganisation celui du DOM déplacé
après rendu (82, 84, 91) — le gabarit d'`#objectiveResult` est un littéral d'un seul tenant, y
découper cinq blocs aurait été bien plus risqué que déplacer trois nœuds.

Détail qui compte : le sélecteur d'objectif ne descend **que lorsqu'un programme existe**, puisque
la réorganisation ne tourne qu'après un rendu réussi. Tant qu'on n'a rien choisi, le chooser reste
en tête — ce n'est pas un compromis, c'est le bon comportement.

### Ce que cette itération a appris

**Un contrat de garde-fou peut récompenser le défaut.** `planEnTete` (itération 82) exigeait que le
plan soit le panneau **le plus haut** de l'onglet — un proxy de la proéminence qui, littéralement,
payait le mur de 4,3 écrans. En ramenant le panneau à 2 136 px, la clause a sauté. Remplacée par une
borne basse sur sa taille propre (≥ 600 px) ; la proéminence est gardée par ce qui compte : premier
panneau, aucune carte transverse devant, action avant explications. *C'est la deuxième fois en trois
itérations qu'un de mes checks défendait le problème plutôt que la solution (cf. 96, `pliAnalyseFocus`
maintenu vert par un bug).*

**Mon check mesurait la visibilité sur une page masquée.** `checkVisibility()` rendait `false` pour
tout et les hauteurs valaient 0 : l'erreur de lieu de l'itération 92, refaite. Le placement correct
est celui que `planEnTete` employait déjà à trois lignes de là — *lire les checks voisins qui
touchent le même écran*.

**Un test peut être vacant sans en avoir l'air, deuxième fois.** Mon cas « weekday hors bornes »
plaçait une séance AUJOURD'HUI à côté du jour aberrant : celui-ci ne concourait donc jamais, et la
mutation qui acceptait n'importe quel entier survivait. Corrigé avec un jour aberrant à écart
cyclique ÉGAL au bon jour, où il gagnerait par ordre de liste s'il était accepté.

**Mutations.** 8 posées (5 logique, 3 rendu), 8 détectées, chaque harnais précédé de son témoin.

692 tests · SMOKE OK.

### À instruire plus tard

Le panneau qui dépasse maintenant le Plan de bataille est **`program-panel` (« Ta prochaine
séance », 2 174 px)** — et il parle du MÊME sujet que la semaine du plan. Deux voix sur une seule
question : c'est le chantier (B) « un seul avis par sujet », sur le plus gros panneau restant.

## Itération 99 — A1 : le double programme, absorbé puis masqué

Rang 1 de la [roadmap 714](714-audit-athlete-roadmap.md). Première itération après l'audit dédié.

**Méthode inhabituelle, et son échec partiel.** J'ai lancé une cartographie parallèle du code en
lecture seule (4 agents) avant de toucher une ligne. **Les quatre ont échoué sur des erreurs 529**,
et l'agent de synthèse a donc travaillé sur quatre `null` — il est allé lire le code lui-même et a
rendu des affirmations très précises, citées ligne par ligne. Je les ai **toutes vérifiées à la
main** avant d'agir : c'était justifié, elles étaient exactes, mais un rapport d'agent construit sur
des entrées vides n'a aucune valeur avant recoupement.

### Ce que la vérification a trouvé — un défaut, pas seulement une redite

Le gabarit du Plan écrivait `${e.sets}×${e.reps}` **brut**, alors que `pickExercisesForZones`
préserve `unit`. Mesuré en exécutant le générateur :

```
Équilibre unipodal  3x30  unit=sec  -> affiche "3×30"
Bear crawl          3x20  unit=pas  -> affiche "3×20"
```

**Trente répétitions d'équilibre unipodal n'existent pas.** Le panneau qui ouvre l'onglet Athlète
donnait une consigne infaisable — et le panneau qu'on s'apprêtait à masquer, lui, passait par
`formatFor` qui suffixe l'unité. C'est le fil rouge du dépôt sous sa forme la plus pure : la voix
qu'on allait supprimer était la seule à dire vrai.

### Absorbé, refusé, mesuré

| absorbé | pourquoi |
|---|---|
| l'unité (`exerciseFormat`) | correction d'une consigne fausse — 15 lignes rendues, 0 nue |
| le pourquoi par séance de muscu (`FOCUS_POURQUOI`, 6 focus) | les courses en avaient toutes, les muscu aucun |
| le geste « Préparer » | noter une séance à la main n'existait que là |

| refusé | preuve |
|---|---|
| les 3 archétypes | `onboardingSetup` rend `activeProgram: objective === 'endurance' ? 'run' : 'fullbody'` — un réglage à 3 valeurs **dérivé** de celui à 5. Pas un second avis : un résumé périmé du premier |
| vignettes + repos par exercice | décoration et redite (l'écran guidé possède le repos), et les deux re-gonflent le panneau |
| « en faire des variantes du générateur » — ma propre roadmap | la variation existe déjà (`#objectiveVary` → seed → `pickExercisesForZones`, compteur « Variante N ») |

**Aujourd'hui : 6 440 → 4 430 px (−31 %), 6 → 5 panneaux.** Le Plan grossit de 148 px (le contenu
absorbé) et **redevient le plus grand panneau sans avoir gonflé** : son concurrent de 2 174 px a
disparu.

### Ce que cette itération a appris

**Une roadmap que j'écris peut se tromper, et il faut le dire au lieu de l'exécuter.** La 714
prescrivait de transformer les séances du panneau perdant en « variantes du générateur unifié ». La
variation existait déjà de bout en bout ; obéir aurait fait entrer une seconde source de séances
dans le panneau dont tout le contrat dit qu'il est le seul générateur restant. *Un plan est une
hypothèse, pas une consigne.*

**La voix qu'on s'apprête à faire taire peut être celle qui a raison.** J'ai failli masquer
`program-panel` en croyant n'y perdre que des redites : il était le seul à afficher l'unité des
séries. *Avant de fusionner, chercher ce que le perdant fait MIEUX, pas seulement ce qu'il répète.*

**Ma propre sonde a fabriqué un faux défaut.** Elle affichait « ⏱️ ≈ /semaine » et « 📆 Première
séance . » — deux valeurs qui semblaient manquer. Elles vivaient dans des `<b>`, et ma sonde
privilégiait les nœuds de texte DIRECTS. Vérifié avant d'écrire quoi que ce soit : rien n'était
cassé. *Une sonde est un instrument : son biais se mesure comme le reste.*

**Mutations.** 6 posées, 6 détectées. La plus utile rend « Préparer » **inerte sans le retirer** —
le check la voit, donc il mesure l'effet et non l'existence.

693 tests · SMOKE OK. Rien publié depuis v2.16.0.

## Itération 100 — revue adversariale : ce que l'itération 99 avait rendu critique

Revue des itérations 98-99 (les précédentes : 94, 97). Visée annoncée : mon code d'hier soir.

### Le défaut que j'ai créé

`state.activeProgram` était déréférencé **sans garde à trois endroits** : en tête de
`renderTrainingCompanion`, dans son gestionnaire de clic, et en tête de `renderRoadmapFeatures`. Le
chargement ne rattrapait que le **vide** (`activeProgram ||= 'fullbody'`), donc toute chaîne non
vide invalide passait. Mesuré :

```
activeProgram = 'fullbody'      -> render() : erreur=null
activeProgram = 'hybride-2024'  -> render() : Cannot read properties of undefined (reading 'name')
```

Et `renderRoadmapFeatures` est une fonction fourre-tout de 9 000 caractères : elle rend les trois
blocs du panneau masqué **mais aussi** le score de forme, le conseil de charge, les séances
manquées, la tendance de forme, les mensurations et le bilan coach. Le crash emportait donc tout ce
contenu vivant — **écran figé sur la peinture précédente, sans message d'erreur**.

**Ce que l'itération 99 y a changé :** en masquant les trois cartes du panneau, j'ai supprimé le
seul contrôle qui posait une valeur valide (mesuré : `visible=false` pour les trois). La valeur ne
peut désormais venir que d'un état laissé par une version antérieure ou d'une sauvegarde importée —
**le seul chemin non validé**. Un défaut latent est devenu le chemin normal.

Cure à la racine dans `normalizeState` : la liste des valeurs valides se **dérive des clés** de
`programs`. Plus les trois sites rendus défensifs. Un `return` anticipé sur « le panneau est
masqué » aurait été le mauvais correctif — il aurait tué le même contenu vivant.

### Deux défauts révélés, pas créés

**« Voir mon plan » ne montrait pas le plan.** L'action `voirProgramme` ouvrait le sous-onglet
« Programme » — objectifs, profil, routines, historique — alors que le Plan de bataille est assigné
à « Aujourd'hui » depuis l'itération 82.

**Deux de mes checks mesuraient un DOM gonflé par l'ordre des tests.** Mon nouveau check appelle un
`render()` **complet** ; le DOM reflète alors l'état réel, et les comptes sont tombés :

| check | avant (DOM enrichi par les fixtures voisines) | état réel |
|---|---|---|
| `pliAnalyseFocus` | 5 analyses peuplées, 574 px gagnés | **2** peuplées, 225 px |
| `planActionDabord` | 5 blocs d'explication dans le pli | **4** |

Mes seuils `attendus >= 4`, `dedans === 5` et `gagne > 300` étaient donc trois chiffres vrais
uniquement à cause de l'ordre d'exécution. **Je n'ai pas baissé les seuils** : les assertions
portent maintenant sur leur sujet — « tout ce qui EXISTE est dans le pli » se dérive du DOM, « le pli
cache un mur » se mesure par rapport à sa propre hauteur fermée. La cinquième mutation remet
`dedans === 5` et **tombe** : le recalibrage n'était pas cosmétique.

### Ce que cette itération a appris

**Retirer une commande peut promouvoir un défaut latent en chemin normal.** Le crash existait avant
l'itération 99 ; il dormait parce que l'interface ne posait que des valeurs valides. En masquant le
panneau, j'ai laissé l'état et l'import comme seules sources — et ce sont les deux qui ne valident
rien. *Avant de retirer un contrôle, demander qui d'autre écrit la valeur qu'il posait.*

**Un check qui repeint tout révèle les checks qui ne repeignent rien.** Aucun autre check n'appelait
`render()` : ils mesuraient donc, sans le savoir, un DOM laissé riche par leurs voisins. *Une suite
de checks partage un état ; un seuil calibré dans cette suite mesure aussi l'ordre d'exécution.*

**Une garde ne se met pas là où c'est commode.** Le réflexe était d'écrire un `return` anticipé
« si le panneau est masqué » — il aurait supprimé le score de forme, le conseil de charge et les
mensurations avec le bug.

**NON PROUVÉ, et je le dis :** je n'ai pas réussi à atteindre le repli du Compagnon depuis
l'interface (`trainingWeekPlan` rend toujours un plan dans les états essayés). Le check couvre donc
le crash, pas le texte du repli.

**Et pour la deuxième fois ce soir, `node -e` a mangé mes backticks** dans un patch — la règle du
protocole dit « patcher avec un .cjs écrit via Write, jamais node -e ». Deux commentaires sont
partis en morceaux avant que je les rétablisse.

**Mutations.** 5 posées, 5 détectées, témoin non muté d'abord.

693 tests · SMOKE OK. Rien publié depuis v2.16.0. **A2 (un seul check-in) reste la prochaine étape.**

## Itération 101 — deux phrases de mon cru contredisaient les chiffres de l'app

Suite de la revue 100 : ses lentilles adversariales déléguées ont rendu quatre alertes après la
clôture de l'itération. Trois vérifiées, une réfutée.

### Ce que la table figée affirmait

Sur la configuration **par défaut**, le focus « upper » du Plan de bataille disait « tirage et
poussée **équilibrés** » et « **peu coûteux pour les jambes** ». Les fonctions de l'app, sur cette
même séance :

```
exos : Floor press [chest,arms] · Good morning [back,glutes]
       · Développé militaire [shoulders,arms] · Pompes diamants [arms,chest]
muscleBalance  -> { push: 9, pull: 3, ratio: 3, zone: 'push-heavy' }
pushPullAdvice -> « Trop de poussée », ok = false
```

Deux affirmations contredites dans la même phrase — et un Good morning est un hip-hinge
[back, glutes], donc précisément ce qui sert à courir. La consigne « plaçable près d'une sortie
course » était un **mauvais conseil**, pas seulement une imprécision.

**La cause n'était pas le choix des mots, c'était leur nature.** Une séance est composée à
l'exécution ; une promesse figée sur sa composition finit forcément fausse. `pourquoiSeanceMuscu`
la dérive : l'équilibre vient de `muscleBalance` (la même implémentation que le panneau qui en juge
ailleurs — un seul avis par sujet), la sollicitation des jambes des zones réelles, et la consigne de
placement en découle. Vérifié sur les **14 séances de muscu des 5 objectifs** : plus une seule
phrase ne contredit les nombres.

### « Dernier exercice de la séance » sur l'exercice 1 sur 3

Il suffit de sauter le premier, faire les deux autres, puis y revenir — par « Précédent » ou par la
carte de séance que j'ai construite à l'itération 95. Mesuré, avec la contradiction **visible à
l'écran** : l'en-tête disait « Exercice 1/3 · 6/9 séries · ≈ 12 min restantes » quand la ligne du
dessous annonçait la dernière. `restants` filtrait `rang > i + 1`, ce qui confond « rien après moi »
et « je suis le dernier » — alors que le commentaire de la fonction dit lui-même qu'on peut revenir
en arrière. Elle s'en protégeait pour calculer `statut` et l'oubliait pour la phrase.

### Ce que cette itération a appris

**Ma correction reproduisait le défaut qu'elle corrigeait.** `muscleBalance` rend CINQ zones ; ma
ternaire n'en traitait que deux et versait `no-push` dans « équilibrés ». Mesuré sur le focus
« lower » : push=0, pull=3, et j'écrivais « Poussée et tirage équilibrés ». *Corriger une
affirmation fausse par une autre affirmation non mesurée, c'est déplacer le défaut.* La phrase se
fonde désormais sur les NOMBRES, pas sur le nom de la zone : elle reste vraie si les zones sont
renommées.

**Une phrase figée sur une donnée calculée est une dette à retardement.** Le texte était juste le
jour où je l'ai écrit pour le focus que j'avais en tête ; il est devenu faux dès que le générateur a
composé autrement. *Si l'app peut calculer ce qu'une phrase affirme, la phrase doit le lire.*

**Un test qui n'exige rien de positif laisse le contenu disparaître.** Une mutation a survécu : en
supprimant les branches « plateau à zéro », la phrase se contentait de **taire** l'information — mon
test n'assertait que l'absence du mensonge, jamais la présence de l'information. Assertion positive
ajoutée. *« Ne pas mentir » et « dire » sont deux contrats distincts.*

**Une alerte sur quatre réfutée, et c'est dit :** « tout est validé avec 3 séries sur 12 » supposait
des minutes par exercice à 0 ; `prescriptionFor` borne à `Math.max(1, …)` et le minimum réel mesuré
est 4. Latent, pas atteignable. Idem pour `weekday: null` traité comme dimanche — contrat faux, aucun
producteur actuel ne l'émet ; noté, pas corrigé.

**Mutations.** 7 posées, 7 détectées (dont une au rendu). La lentille « rendu » de la revue est morte
sur un 529 : son angle — idempotence de `reorganiserPlanDeBataille`, état ouvert/fermé après un
re-rendu, index `data-op-start` après un remplacement — **reste à instruire**.

693 tests · SMOKE OK. Rien publié depuis v2.16.0. **A2 (un seul check-in) reste la prochaine étape.**

## Itération 102 — A2 : le check-in demandé deux fois, rempli dans un troisième endroit

Rang 2 de la [roadmap 714](714-audit-athlete-roadmap.md). Sonde en 390 px, **sans check-in du
jour** — ce que voit Adrien le matin :

```
Compagnon        462 px, ZÉRO champ  « Renseigne sommeil, fatigue et courbatures »
                                     + bouton « Faire mon check-in »
                                     -> goToSection('athlete', '.recovery-panel')
écart                                572 px
Récupération     806 px, 8 champs    le formulaire
#recoveryAdvice  sous le formulaire  « Fais un check-in »   <- troisième demande
```

Le geste était **demandé à deux endroits et rempli dans un troisième**, et le bouton n'existait que
pour compenser la séparation.

### Ce qui a été fait

Les quatre champs et leur bouton montent dans le panneau qui décide, entre le verdict et les
actions. **Ils gardent leurs id**, donc `renderRoadmapFeatures` et `#saveRecovery` fonctionnent sans
une ligne de changement — c'est tout l'intérêt de déplacer du markup plutôt que de le réécrire.

Trois conséquences traitées, parce qu'elles seraient devenues des mensonges : le bouton de renvoi
(masqué, il pointerait vers un panneau sans formulaire), le texte (« juste en dessous » au lieu de
« renseigne » comme si c'était ailleurs), et la troisième demande (qui explique désormais son silence).
Le panneau qui reste ne s'appelle plus « Check-in du jour » : il n'en contient plus.

**Décision écrite, contre la lettre de ma propre roadmap :** A2 fusionne le **sujet**, pas les
panneaux. Le second garde score, conseil de charge, séances manquées, plan de sommeil — de
l'**analyse**. Les mélanger ferait un panneau de 1 300 px mêlant action et analyse, soit le mur que
l'itération 98 a défait.

| | avant | après |
|---|---|---|
| Compagnon | 462 px, 0 champ | **796 px, 4 champs** |
| Récupération | 806 px, 8 champs | **485 px** |
| total | 1 268 px | 1 281 px |
| onglet Athlète | 15 304 px / 22 panneaux *(audit 30/07)* | **11 879 px / 21 panneaux** (−22 % après A1+A2) |

**Le gain de A2 est la cohérence, pas les pixels** — et il faut le dire ainsi : la roadmap demandait
que chaque fusion rende des pixels, celle-ci rend un scroll de 572 px entre la consigne et son
formulaire, et deux demandes sur trois.

### Ce que cette itération a appris

**Un bouton peut n'exister que pour compenser un défaut de structure.** « Faire mon check-in » ne
faisait rien d'autre que scroller vers le formulaire. En rapprochant les deux, il devient non
seulement inutile mais faux — il emmènerait ailleurs. *Quand on supprime la distance, on doit
supprimer ce qui servait à la franchir.*

**Déplacer du markup par id ne coûte rien au code, et c'est précisément ce qui rend le risque
invisible.** Aucune ligne de JS n'a changé, donc rien n'aurait signalé un câblage cassé. C'est le
check qui doit le dire : il remplit, enregistre, et exige que le verdict CHANGE.

**Ma cinquième mutation ne prouvait rien, et je l'ai refaite.** En remplaçant l'id dans
`$('#saveRecovery')`, `null.onclick` jetait au chargement : le smoke tombait avant d'atteindre mon
check. Refaite en neutralisant la seule écriture d'état — bouton présent, cliquable,
`enregistre=false`. *Une mutation qui casse l'app trop tôt ne teste pas le check qu'on visait.*

**Mutations.** 5 posées, 5 détectées, deux harnais (lint statique + smoke) précédés de leurs témoins.

694 tests · SMOKE OK. Rien publié depuis v2.16.0. **A3 (une seule voix hebdo) est la prochaine
étape** — et l'audit y annonce quatre écrans qui disent « 0 séance cette semaine ».

## Itération 103 — revue : un rendu effaçait ce qu'on venait d'ouvrir

Revue adversariale des itérations 98-102, sur l'angle « stabilité du rendu » que la revue 100
n'avait pas pu instruire (sa lentille était morte sur un 529). Six alertes reçues ; **j'ai remesuré
chacune** avant d'agir.

### Confirmé — trois défauts nés de mon itération 98

| défaut | mesure |
|---|---|
| le pli « Comprendre ce programme » se referme à chaque rendu | même nœud=false, **ouvert après=false** |
| le jour cible refermé à la main se rouvre d'office | **cible rouverte=true** |
| « Modifiable juste au-dessus » | le réglage est **433 px en dessous**, dernier élément du panneau |

Les deux premiers ont la même cause — `el.innerHTML=` écrase l'état d'ouverture — donc le même
correctif : **capturer avant, restaurer après**. Le troisième est une phrase antérieure que mon
propre déplacement (« les réglages à la fin ») a rendue fausse.

### Nuancé, et dit comme tel

La **perte de focus clavier** à chaque rendu n'a **pas été reproduite** : mon `focus()` n'a pas pris
dans la sonde (`acquis=false`). Et les deux `appendChild` par rendu de `.op-bar`/`.op-reglages` sont
réels, mais les **positions finales sont stables** (15→15, 16→16) : aucune conséquence de mise en
page mesurable. Noté, **pas corrigé sur la foi d'un rapport**.

### Ce que cette itération a appris

**Deux bugs dans mon propre correctif, tous deux attrapés en mesurant :**

1. **Une clé de restauration doit être unique, et les titres ne le sont pas.** « Ven · 🏃 Course
   facile · 3 km » apparaît **deux fois** sur six jours (5 titres uniques sur 6). Ma carte gardait
   l'état de la dernière occurrence et l'appliquait aux deux : le jour qu'on venait d'ouvrir se
   refermait **à cause de son homonyme**. Clé corrigée en titre + rang d'occurrence.
2. **Une ligne trop dense m'a coûté une précédence.** `n+'#'+(vus[n]=(vus[n]||0)+1)-1` concatène
   d'abord et soustrait ensuite **sur une chaîne** : toutes les clés valaient `NaN`, donc un seul
   état s'appliquait aux six jours. Réécrite en trois temps.

**Une assertion inobservable est vacante — deux fois de suite.** `departHonnete` sortait à `null`
parce que l'état du smoke ne produit pas la phrase (état forcé désormais), puis **parce que je
cherchais « Modifiable » dans la tranche de 70 caractères gardée pour le diagnostic**, qui le
coupait. Un check qui rend `null` ne garde rien : le retour exige maintenant `true`.

**Un contrat qui verrouille une remise à zéro empêche de la corriger.** `ouverts === 1` — c'est la
**quatrième fois** en dix itérations qu'un de mes garde-fous défend le défaut plutôt que la solution
(96 `pliAnalyseFocus`, 98 `planEnTete`, 100 les seuils calibrés, 103 celui-ci). Le check garde ce
qu'il protégeait vraiment et gagne le contrat neuf.

**Mutations.** 4 posées, 4 détectées — dont celle qui remet ma clé bugguée, pour prouver que le check
voit l'homonyme écraser le jour ouvert.

694 tests · SMOKE OK. Rien publié depuis v2.16.0. **A3 (une seule voix hebdo) reste la prochaine
étape.** Restent aussi, non corrigés et notés : `.op-week`/`.op-day` posent `display:` sans garde
`[hidden]` et échappent au lint statique (markup généré, latent), et le focus clavier après un rendu,
à instruire avec une sonde qui sache poser le focus.

## Itération 104 — A3 : l'app se contredisait d'un sous-onglet à l'autre

Rang 3 de la [roadmap 714](714-audit-athlete-roadmap.md). L'audit annonçait une **redite** (« quatre
écrans qui disent 0 séance cette semaine »). La sonde a trouvé une **contradiction**. Mesuré sur une
semaine réelle — 2 muscu + 1 course, 135 min, 8 km :

| voix | sous-onglet | dit | cible |
|---|---|---|---|
| `#avancementSemaine` | Aujourd'hui | « **3/3** … c'est jouable » | le **PLAN** |
| `#todayCoachSignals` | Aujourd'hui | « **3/4** séances » | le **RÉGLAGE** |
| `.week-panel` | Progrès | « 1 séance pour boucler … » | le RÉGLAGE |
| `.weekly-review-panel` | Corps | « 3/4 — 1 à caser » | le RÉGLAGE |
| `#coachSummary` | Corps | « 3/4 … reste 1 » | le RÉGLAGE |

**Les deux premières vivent sur le même sous-onglet, à quelques centaines de pixels** : l'une dit que
la semaine est bouclée, l'autre qu'il en reste une.

`avancementSemaine` lit ce que le plan POSE (itération 83, avec repli documenté sur `goals` faute de
plan) ; les quatre autres recalculaient la leur sur `state.goals.sessions`. Un seul point de vérité
désormais : `cibleHebdo()`. Et `weeklyInsights`, qui dérivait sa cible **en interne**, accepte une
cible imposée — comportement par défaut inchangé.

**On unifie la CIBLE, pas les panneaux** : sur les 18 usages de `goals.sessions`, la plupart sont
légitimes (formulaires, entrées nutrition, onboarding). Seuls ceux qui **énoncent** un compte à
l'utilisateur ont été alignés.

### Ce que cette itération a appris

**Une redite peut cacher une contradiction, et seule la mesure fait la différence.** L'audit avait
compté les voix ; il n'avait pas comparé leurs chiffres. Quatre écrans qui disent la même chose sont
un défaut de mise en page — deux qui disent l'inverse sur le même écran sont un défaut de fond.
*Compter les voix ne suffit pas : il faut les faire parler côte à côte.*

**Mon propre correctif contenait le piège que le protocole nomme en premier.** Ma garde
`Number.isFinite(Number(opts.cibleSeances))` acceptait `''`, `null` et `false` — `Number('')` vaut 0,
et 0 est fini — donc ces valeurs devenaient une cible de **zéro séance**. « NULL N'EST PAS ZÉRO »,
mais l'autre moitié compte autant : **0 reste une consigne valable** (semaine de repos), donc la garde
ne pouvait pas simplement exiger une valeur non nulle. Elle exige un vrai nombre.

**Une mutation survivante n'est pas toujours un check creux — ici c'était le scénario.** La phrase
« Objectif de N séances atteint » ne sort qu'une fois la cible **atteinte** : avec 3 séances sur 4,
remettre la cible à 4 ne produisait aucune affirmation contradictoire à capturer. Jeu d'essai porté à
4 séances, et le relevé sait lire les **deux** formes de cible. *Vérifier lequel des trois cas c'est,
avant de conclure.*

**Mutations.** 4 posées, 4 détectées après renforcement du jeu d'essai.

695 tests · SMOKE OK. Rien publié depuis v2.16.0.

**Reste, dit franchement :** le mode « Construire » du tableau de bord et le `sessionTarget` de
`weeklyAdherence` lisent encore le réglage. Ni l'un ni l'autre n'énonce le compte qui créait la
contradiction, mais ils devront suivre. Et A3 n'a PAS fusionné les panneaux — `week-panel` reste sur
*Progrès*, `weekly-review-panel` sur *Corps* : la fusion de surface est à faire, probablement en
déplaçant la revue hebdo vers *Progrès*, ce qui servirait aussi B1.

## Itération 105 — le compte de la semaine avait deux bouts, un seul était borné

Suite de A3. L'itération 104 avait unifié la **cible** ; le **numérateur** restait éclaté. Le balayage
de toute l'app (13 voix relevées, hors Athlète comprises) a rendu trois constats actionnables —
**les trois vérifiés à la main, les trois confirmés**.

Mesuré avec 2 muscu + 1 course + 1 vélo cette semaine, **et une séance datée lundi prochain** :

| affiché | valeur |
|---|---|
| `#weekSessions` (Progrès, grand chiffre) | **5** |
| `#weekInsight`, 3 cm en dessous | « il reste **1** séance » (cible 3) |
| `#sessionsProgressText` (Programme) | « **5 / 4** séances » |
| réellement dans lundi→dimanche | **4** |

**`thisWeekWorkouts()` ne bornait que le début** : `date >= weekStart()`, sans borne haute. Une
séance datée après dimanche entrait dans « cette semaine » et gonflait le grand chiffre, la charge en
points, la barre d'objectifs et le mode du tableau de bord. *Une semaine a deux bouts ; un seul était
posé.*

La barre du goal-panel divisait un compte permissif par l'ancien réglage — « 5 / 4 », soit plus de
100 % — pendant que le Plan disait 3/3.

**Et un choix explicite :** le grand chiffre compte **toute activité** (vélo, mobilité), ce qui est le
sujet légitime du panneau « Ton volume ». Je ne l'ai donc pas aligné : son libellé dit « séances,
toute activité » quand les deux comptes divergent, et reste sobre quand ils coïncident. *Deux nombres
différents sont honnêtes s'ils annoncent chacun leur règle* — même raisonnement qu'en A2 (« fusionner
le sujet, pas les panneaux »).

### Ce que cette itération a appris

**Deux fois de suite, mon garde-fou ne voyait que ce que j'avais pensé à lui montrer :**

1. ma liste de panneaux à relever était **écrite à la main** — quatre sélecteurs, et le sous-onglet
   *Programme* n'y figurait pas. **La voix que je venais de corriger échappait à son propre
   garde-fou** (mutation survivante). Le relevé balaie désormais tous les panneaux visibles des quatre
   sous-onglets : une voix ajoutée demain est surveillée d'office.
2. puis mon analyseur exigeait des chiffres **collés** au slash, alors que la barre écrit « 2 / 2
   séances » avec des espaces.

*« Ce qui énumère doit dériver sa liste » ne s'arrête pas à la liste : le motif qu'on cherche est lui
aussi une déclaration, et il peut manquer la forme qu'on n'a pas prévue.*

**Un balayage large paie, même quand il arrive tard.** Le rapport est tombé après la clôture de A3 et
a montré que l'étape était incomplète. Sans lui, « une seule voix hebdo » aurait été cochée avec un
numérateur faux et une barre à 125 %.

**Mutations.** 3 posées, 3 détectées après les deux corrections du check.

695 tests · SMOKE OK. Rien publié depuis v2.16.0.

**Reste du balayage, non traité et noté :** `trailReadiness` et `weeklyKmRamp` comptent les km sur une
fenêtre **glissante de 7 jours** alors que `#weekDistance` et `runWeekGoal` comptent **depuis lundi** —
« X km cette semaine » diverge donc tous les jours sauf le dimanche. Et la charge en points est
calculée **deux fois par la même formule recopiée** (`#weekLoad` et le chip du Compagnon), sans
fonction partagée.

## Itération 106 — revue : « cette semaine » désignait deux fenêtres

Revue adversariale (les précédentes aux 94, 97, 100, 103), sur le dernier constat du balayage de
l'app. Mesuré un jeudi, avec 10 km le dimanche précédent et 5 km aujourd'hui — **désaccord semé**,
pas espéré :

| voix | affiche | fenêtre |
|---|---|---|
| `#weekDistance` | **5** km | depuis lundi |
| `#runWeekGoal` | « Course **cette semaine** 5 / 10 km » | depuis lundi |
| `#trailRunSummary` | « **15 km** · Cette sem. » | 7 jours **glissants** |
| `#trailRamp` | « **15 km cette semaine** » | 7 jours **glissants** |

**5 et 15 km « cette semaine », mêmes mots, facteur 3.**

La fenêtre glissante n'est pas le défaut — pour juger une charge de course elle vaut mieux qu'un
compteur qui repart à zéro le lundi. **Le défaut est le mot.** Chaque fenêtre se nomme désormais :
« 7 derniers j. », « sur 7 jours », « les 7 d'avant » ; la voix calendaire garde « cette semaine ».

### Ce que cette itération a appris

**Deux branches mutuellement exclusives demandent deux jeux d'essai.** La rampe compare deux périodes
quand il y a un précédent, et annonce « première période » sinon. Un seul fixture n'en couvre qu'une,
donc **la mutation qui dérange l'autre survit — ce qui est arrivé dans les deux sens, à tour de
rôle** : d'abord la comparaison n'était pas rendue, puis c'est la première période qui ne l'était
plus. Le check mesure maintenant les **deux** états.

C'est la troisième fois en trois itérations qu'une mutation survit **faute de scénario** et non par
creux (104 : « Objectif de N » ne sort qu'une fois la cible atteinte ; 105 : le sous-onglet
*Programme* n'était pas visité ; 106 : les deux branches de la rampe). *Le réflexe « une mutation qui
survit = un check creux » est faux une fois sur deux : il faut vérifier lequel des trois cas, et le
plus fréquent chez moi est le scénario manquant.*

**Mutations.** 3 posées, 3 détectées après élargissement du jeu d'essai.

695 tests · SMOKE OK. Rien publié depuis v2.16.0.

**Reste du balayage, noté :** la charge en points est calculée **deux fois par la même formule
recopiée** (`#weekLoad` de renderAthlete et le chip du Compagnon), sans fonction partagée — même
résultat aujourd'hui, deux endroits à corriger le jour où la formule change. Et l'angle « cas limites
de `cibleHebdo` » délégué en parallèle n'est pas encore revenu.

## Itération 107 — la cible hebdo rétrécissait à mesure que la semaine avançait

Revue **déléguée** sur mon code des itérations 104-105 (« réfute `cibleHebdo`, la borne de semaine,
le libellé conditionnel »), puis **re-mesurée moi-même** dans le renderer avant d'écrire une ligne.
L'itération 104 avait unifié la cible hebdo — un seul avis par sujet. Cet avis unique **rétrécissait**.

Une seule semaine, objectif « prise de muscle », 4 muscu + 2 courses au plan :

| état | ce que la barre affichait |
|---|---|
| lundi, rien de fait | `0 / 6 séances` |
| après 1 séance | `1 / 5` |
| après 2 séances | `2 / 4` ← la cible a changé, pas le plan |
| 4 muscu, 0 course | `2 / 2 · 100 %` **+ « il reste 2 séances »** juste en dessous |
| semaine bouclée | `4 / 4` ← le réglage manuel reprend la main |

### Deux causes, toutes deux dans `avancementSemaine`

**1. La cible se lisait dans `plan.week`, amputé de ce qui est déjà fait.** Parfait pour afficher un
programme *à placer*, faux pour dire « X/Y séances » : **la cible était remplacée par le reste à
faire**. Elle se lit maintenant dans `semaineType`, la semaine complète que le plan expose déjà.
Mesuré sur les cinq objectifs : `semaineType` vaut *exactement* `week` tant que rien n'est fait —
donc le début de semaine ne change pas, et seul le rétrécissement disparaît.

Réparé du même geste : une semaine bouclée donnait `week: []` → `null` → **repli sur
`state.goals.sessions`**, qui compte toute activité (vélo, marche) et jusqu'à dimanche. La règle de
comptage changeait en pleine semaine. `source` reste « plan » jusqu'au bout ; deux semaines vides
disent toujours « le plan prescrit zéro ».

**2. Le fait était plafonné sur le TOTAL**, donc un excédent de muscu comblait le manque de course —
d'où le 100 % au-dessus d'un « il reste 2 séances ». Plafond **par catégorie** :
`fait + reste === cible`, toujours. C'est l'invariant que le test verrouille.

### Ce que cette itération a appris

**Une bonne fonction lue au mauvais endroit produit un mensonge.** `plan.week` n'a aucun défaut : il
répond à « que me reste-t-il à placer ? ». Le défaut est de lui avoir posé une AUTRE question — « que
demande ma semaine ? ». Trois itérations de suite (105 le libellé, 106 le mot « semaine », 107 la
source de la cible), le défaut n'était **pas** dans le calcul mais dans ce qu'on faisait dire au
chiffre. *Chercher le bug dans la fonction est un réflexe ; ici il était dans la lecture.*

**Un invariant vaut mieux que trois assertions.** `fait + reste === cible` tient en une ligne, se
vérifie sur tous les états, et aurait attrapé le défaut n°2 le jour où il est né. Les assertions
ponctuelles (« 100 % seulement si fini ») en sont des conséquences.

**Le scénario qui discrimine n'est pas le scénario naturel.** Le plafond par catégorie ne se voit que
s'**une** catégorie déborde pendant qu'une autre manque : sans l'état « 2 muscu de trop, 0 course »,
la mutation survivait (les quatre autres états ne débordent jamais). Ajouté explicitement, avec le
témoin `deborde` qui refuse de valider un état qui ne déborde pas. **Quatrième itération de suite où
la couverture tenait à un scénario manquant** — le réflexe « mutation survivante = check creux » est
décidément faux plus d'une fois sur deux.

**Mutations.** 4 posées, 4 détectées (3 sur le smoke, 1 sur les tests node). La troisième remet
l'état exact d'avant la 107 et ressort le défaut mot pour mot : `3 / 3 · 100 %` avec `fait=3 reste=3`.

696 tests · SMOKE OK. Rien publié depuis v2.16.0.

### Ce que la revue a trouvé et que je n'ai PAS encore corrigé

- **Le NUMÉRATEUR n'est pas unifié**, lui. Le sous-onglet Progrès dit « 1 / 5 séances » quand Corps
  dit « 4/5 séances — tu es dans les temps » au même rendu : `weeklyInsights` reçoit bien la cible
  unique mais garde son propre compteur (`workouts.length`, toute activité). **C'est l'étape suivante.**
- **Le libellé conditionnel du grand chiffre est tautologique dans le repli** :
  `sessions === cibleHebdo().fait` compare deux fois le même appel, donc « toute activité » ne peut
  jamais s'afficher par ce chemin. Le correctif de la 107 rend ce chemin rare, pas mort.
- **`uneSeuleCibleHebdo` ne relève que le dénominateur** — deux panneaux à « 2/2 » et « 4/2 » passent.
  Et `releve('.coach-panel')` mesure le premier élément du document portant la classe, qui est
  masqué : la classe est **dupliquée** dans index.html, donc le panneau visible n'est jamais lu.
- Réfutés par la revue, mesures à l'appui : la borne haute de `thisWeekWorkouts` (arithmétique
  calendaire, changement d'heure inclus), les dates invalides, les valeurs absurdes de `cibleSeances`,
  le coût du recalcul (0,4 ms × 7 par rendu).

## Itération 108 — A3 : une seule règle pour compter une séance

La 107 avait unifié la **cible**. Le **numérateur**, lui, se comptait encore de deux façons.
Mesuré dans le renderer, un seul état (1 muscu + 3 sorties vélo), un seul rendu :

| voix | ce qu'elle affichait |
|---|---|
| Progrès · `goal-panel` | **1 / 6 séances** · 17 % + « il reste 5 séances » |
| Corps · `weeklyInsights` | **4/6 séances** — « 2 séances à caser : tu es dans les temps » |
| Corps · `weeklyReviewSummary` | **4 séances réalisées** |
| Corps · `weeklyReviewNext` | « Bloque **2** créneaux » |

**Facteur 4 sur le numérateur, et deux conseils opposés** : l'un dit qu'il reste cinq séances,
l'autre que tu es dans les temps. Une seule cause partout : `workouts.length` compte TOUTE activité
(vélo, marche, mobilité) et se comparait à une cible qui ne compte que muscu et courses.

La règle vit désormais dans **`seancesDeLaSemaine(workouts, todayKey)`** — celle de
`weekTrainingBalance`, à la lettre, sur la semaine **calendaire** — et nulle part ailleurs.
`avancementSemaine` la délègue au lieu de la recopier. `weeklyInsights` et `weeklyAdherence`
acceptent le compte de l'app en option, comme la cible depuis la 104. Le badge « Séances (N/M) » du
coach poids lisait une **troisième** source (`wk.sessions.length`) : il s'y branche aussi.

Les activités hors plan ne sont pas perdues — elles vivent dans le grand chiffre, qui dit
« séances, **toute activité** ». Ce libellé était **inerte** dans le repli sans plan : il comparait
deux fois le même appel, donc le qualificatif ne pouvait jamais s'afficher, précisément quand le
chiffre comptait du vélo. Il lit maintenant `faitBrut`, le compte non plafonné.

### Ce que cette itération a appris

**Le message d'un garde-fou est une affirmation, et il faut la vérifier comme le reste.**
`uneSeuleCibleHebdo` écrivait dans son erreur « Et le NUMÉRATEUR compte autant » — et ne relevait
que la partie droite du slash. La promesse était dans le texte depuis quatre itérations ; le code ne
l'a jamais tenue. *Relire ses propres messages d'erreur comme des tests à écrire.*

**Chercher un panneau par sa classe n'est pas le mesurer.** `document.querySelector('.coach-panel')`
rend le PREMIER élément du document portant la classe — et `.coach-panel` est **dupliqué** dans
index.html : un `#coachFocusPanel` masqué (hauteur 0) et l'article visible du bilan. Le relevé
sortait donc sur le test de hauteur, et le panneau visible — celui qui porte `#coachSummary`, une
voix hebdo — n'était **jamais lu**. On passe désormais le texte du nœud qu'on vient de voir visible :
le détournement devient impossible plutôt que gardé.

**Deux branches d'un même `si` demandent deux mesures — cinquième fois de suite.** « Objectif de N
séances atteint » et « N séances réalisées » ne peuvent pas coexister. Un seul jeu d'essai n'en
couvre qu'une, et la mutation qui touche l'autre survit. Le check balaye maintenant DEUX états
(semaine complète + deux muscu de trop, puis la même semaine privée de ses courses) et exige que
chaque passe soit d'accord **avec elle-même** — les mélanger rendrait le test faux.

**Un jeu d'essai qui ne déborde pas ne discrimine pas un plafond.** Sans les deux muscu en trop,
`fait` et `faitBrut` sont égaux : remettre l'ancien code passait le test. Le semis se dérive
maintenant du plan lui-même.

**Mutations.** 5 posées, 5 détectées (3 smoke, 2 node). Les deux premières sortent
`passe2 num=2[3,5]` — deux numérateurs dans le même rendu, le défaut mot pour mot. 697 tests ·
SMOKE OK. Rien publié depuis v2.16.0.

### DÉFAUT DE MON HARNAIS, trouvé en chemin — à traiter en priorité

**`planActionDabord` est INSTABLE.** Même code, deux passages consécutifs : `ouverts=1` puis
`ouverts=0` puis `ouverts=1`. Il mesure le DOM laissé par les checks précédents sans re-rendre, donc
son verdict dépend de l'ordre **et de l'état persisté**. Mesuré : le smoke tourne sur le profil
Electron de développement et y **lit et écrit le vrai `localStorage`** (`irl-level-up`, 3 384
caractères) — `availableDays` valait `[0]` (dimanche) pendant le run rouge et `[1,3,5]` au run
suivant, ce qui change le jour cible du plan, donc le `<details>` ouvert. **Un garde-fou bloquant qui
tombe au hasard est pire que pas de garde-fou : il apprend à ignorer le rouge.** (L'app installée
d'Adrien n'est pas touchée : le binaire de dev a son propre dossier de profil.)

### Autres constats notés, non corrigés

- **« Bloque N créneaux » n'est gardé par personne** : la phrase n'a pas de slash et ne contient pas
  « séance », donc le relevé ne la voit pas. Je l'ai corrigée (elle lit `reste`), sans garde-fou —
  je le dis plutôt que de laisser croire à une couverture.
- **`thisWeekWorkouts` inclut les jours À VENIR de la semaine, `seancesDeLaSemaine` s'arrête à
  aujourd'hui.** Une séance pré-enregistrée demain compte donc pour le grand chiffre et pas pour le
  plan → le libellé dirait « toute activité » pour une vraie séance. Cohérent mais discutable.
- Le commentaire « QUATRE séances, pas trois » du jeu d'essai était **périmé depuis la 107** (la
  cible ne rétrécit plus, donc quatre sur six ne l'atteignent plus) et la voix « Objectif de N »
  avait disparu du relevé en silence. Réparé par le semis dérivé.

## Itération 109 — revue : le harnais partait de l'histoire des runs, pas d'un état connu

Revue adversariale (les précédentes aux 94, 97, 100, 103, 106), visant **mon propre harnais**, sur le
constat laissé par la 108 : `planActionDabord` rendait `ouverts=1`, puis `0`, puis `1` **sur le même
code**.

Deux profils Electron chargés côte à côte, mesure directe :

| profil | ce que l'app rend |
|---|---|
| développement | `fitnessObjective: 'athletique'` · **6 jours de plan** · 4 154 px |
| **VIERGE** | `fitnessObjective: null` · **0 jour de plan** · 2 507 px |

Le smoke tournait sur le profil de développement et y **lisait et écrivait le vrai localStorage**.
Trois conséquences, toutes mesurées :

1. **Une dizaine de checks parlent du Plan de bataille.** Sur un profil neuf, il n'y a aucun plan :
   ils ne passaient que grâce à un objectif laissé par un run précédent. **Le smoke n'était pas
   reproductible depuis zéro.**
2. `availableDays` valait `[0]` pendant un run et `[1,3,5]` au suivant → autre jour cible → autre
   `<details>` ouvert → autre verdict.
3. Le smoke polluait le profil pour le run suivant.

### Les trois gestes

- **Profil jetable** : `app.setPath('userData')` sur un dossier temporaire effacé à chaque run, avant
  `whenReady()`.
- **Socle de référence** posé par le harnais et vérifié par le check bloquant `socleDeReference`, qui
  exige en plus qu'un plan de 3 séances au moins soit **réellement généré**.
- **`planActionDabord` repart d'un panneau vidé** : il referme volontairement les jours, vide le
  conteneur, re-rend. L'état ouvert/fermé survit aux rendus depuis la 103 (à raison) — donc un voisin
  qui refermait le jour cible faisait tomber ce check.

### Ce que cette itération a appris

**Une mutation trop étroite ne teste pas son sujet.** Ma première mutation ne retirait que la ligne
`state.fitnessObjective = …` — et elle a **survécu**, parce qu'un AUTRE check repose l'objectif au
passage. Le diagnostic le disait : `auDepart[/78/4/…]` (objectif vide au départ) puis
`objectif=athletique` à l'arrivée. Ce n'était ni un check creux ni un harnais mort : c'était une
**redondance qui masquait la couverture**, le troisième cas de la règle. Élargie au bloc entier, elle
est détectée.

**Une assertion datée ne discrimine pas le jour où elle est écrite.** Pour prouver l'isolation du
profil, j'avais choisi la date d'installation : sur un profil de dev créé le même jour, elle vaut
aussi aujourd'hui, donc la mutation survivait. On asserte maintenant **le chemin que le processus
utilise vraiment** (`app.getPath('userData')`, injecté dans la page) — pas une conséquence datée.
*Miroir exact de la leçon « un test doit asserter son sujet, pas une valeur vraie ce jour-là ».*

**Un garde-fou instable est une dette, pas une protection.** Trois passages du même code donnaient
trois verdicts. Je l'ai traité avant de reprendre la roadmap, et c'était le bon ordre : toutes les
itérations suivantes s'appuient dessus.

**Note écrite sur place :** `blockStart` est posé par le socle et **ne survit pas** jusqu'aux checks
(un check intermédiaire remplace l'état par une version normalisée qui ne le garde pas). Aucun check
vert n'en dépend, et dans l'app ce champ n'est écrit que par « Programmer 8 semaines » — je ne
l'assert donc pas, et je le trace dans `__socle` (`auDepart`) plutôt que de le retirer en silence.

**Mutations.** 3 posées, 3 détectées. 697 tests · SMOKE OK.

## Itération 110 — la prémisse de B1 était fausse, et un bug attendait derrière

### D'abord : B1 reposait sur un artefact de mesure

La roadmap dit « `analysis-panel` : **108 caractères** aujourd'hui ». Mesuré sur deux états :

| état | ce que rend le panneau |
|---|---|
| profil neuf, 0 séance | **79 caractères** — « Ajoute des séances… » |
| 8 semaines réalistes (40 séances) | **826 caractères, 5 lignes, 701 px** |

Le panneau n'est pas pauvre : **il était vide parce que le profil était vide**. L'audit du 30/07 a
mesuré le profil de développement, qui contient zéro séance — exactement ce que l'itération 109 a
diagnostiqué pour le smoke. *Mon propre audit a été victime du défaut que l'itération d'avant venait
de corriger ailleurs.*

Au passage, ma première sonde semait « Squat », « Développé couché » et « Rowing barre » : **absents
du catalogue** (47 exercices, orienté kettlebell/poids du corps), donc `exerciseZones` rendait `[]` et
`muscleBalance` annonçait « aucune poussée ». J'ai failli déclarer un défaut qui n'existait pas —
troisième artefact de sonde de la session. Re-semée avec des noms réels, la fonction dit
« 28 poussées / 46 tirages, ratio 0,61 », ce qui est juste.

### Ce que la mesure dit vraiment sur B1

Sur 8 semaines de données réelles, **1 004 px d'analyse rétrospective vivent dans l'écran d'action** :

| bloc | px | panneau | sous-onglet |
|---|---|---|---|
| `blockStatus` | 434 | objective-program-panel | **Aujourd'hui** |
| `tonnageTrend` | 252 | objective-program-panel | **Aujourd'hui** |
| `trainingByWeekday` | 136 | objective-program-panel | **Aujourd'hui** |
| `trainingConsistency` | 98 | objective-program-panel | **Aujourd'hui** |
| `weekBalance` | 84 | objective-program-panel | **Aujourd'hui** |

Un inventaire délégué (8 agents, lecture seule) l'a confirmé : dix fonctions force/endurance rendent
toutes dans le Plan de bataille. **B1 ne doit donc pas AJOUTER des voix — il doit DÉPLACER celles qui
sont au mauvais endroit.** Ajouter e1RM, plateau, prévision et poussée/tirage à `analysis-panel`,
comme la roadmap le prescrit, créerait quatre doublons. C'est le sujet de la prochaine itération, avec
sa mesure de départ (Plan 1 784 px, Analyse 701 px).

### Le bug trouvé en chemin, et corrigé

`id="weekBalance"` existait **deux fois** — Plan de bataille et page « Ma semaine ». `$('#x')` rend
toujours le premier du document, d'où trois conséquences mesurées : la page « Ma semaine »
n'affichait **jamais** ses chips ; `renderWeekPage()` **écrasait** l'équilibre course/muscu du Plan ;
et basculer l'agenda en vue « jour » posait `hidden` sur un bloc de l'onglet **Athlète** (0 px).

Corrigé côté Athlète (`trainingWeekBalance`), donc dans le périmètre de la boucle, et la page
« Ma semaine » redevient seule propriétaire de son id.

### Ce que cette itération a appris

**Un audit se mesure sur des données, pas sur un profil vide.** Les « 108 caractères » ont failli
faire construire une fonctionnalité déjà écrite. *Avant de croire un chiffre d'audit, redemander à
l'app ce qu'elle rend — avec de la donnée dedans.*

**Un jeu d'essai irréaliste fabrique des défauts imaginaires.** Trois noms d'exercices inventés, et
l'app « mentait ». Le protocole dit « jeu d'essai réaliste » : ici, réaliste voulait dire *présent
dans le catalogue*.

**`\s` dans le gabarit du smoke est lu comme un simple « s »** — le diagnostic sortait « Équilibre
emaine ». Même piège que le `\/` de l'itération 108, repayé. Dans ce gabarit, éviter les
échappements : le texte brut suffisait.

**Mutations.** 2 posées, 2 détectées (l'une sur le smoke ET le test node). 698 tests · SMOKE OK.
Rien publié depuis v2.17.0.

## Itération 111 — B1 : l'analyse du passé quitte l'écran d'action

La roadmap prescrivait d'**ajouter** e1RM, plateau, prévision et poussée/tirage au panneau Analyse.
La 110 a mesuré que ces voix existaient déjà, **toutes dans le Plan de bataille**. Les ajouter aurait
créé quatre doublons. On déplace.

| | avant | après |
|---|---|---|
| Plan de bataille (Aujourd'hui) | **3 020 px** | **1 919 px** (−36 %) |
| Analyse (Progrès) | 630 px | 1 728 px |
| Premier « ▶️ Démarrer cette séance » | **à 2 258 px** (2,7 écrans) | **à 1 157 px** (1,4 écran) |

> *Chiffres RECTIFIÉS à l'itération 112 : la première mesure (1 784 → 724 px) avait été prise sans que le plan soit généré — elle décrivait un panneau amputé de son contenu principal, et ne mesurait pas du tout la distance jusqu'au premier geste, qui est pourtant le sujet.*

Les 1 004 px déplacés — `blockStatus` 434, `tonnageTrend` 252, `trainingByWeekday` 136,
`trainingConsistency` 98, `trainingWeekBalance` 84, plus l'historique des blocs — étaient placés
**avant le plan lui-même** : on traversait huit semaines de rétrospective pour arriver à la séance
du jour. Rien supprimé, rien dupliqué : mêmes ids, donc pas une ligne de rendu à changer, et aucun
CSS ne ciblait ces blocs par leur parent (vérifié avant de couper).

Restent dans le Plan les trois voix qui **pilotent** la semaine en cours : `avancementSemaine`,
`limitationsNote`, `runWeekGoal`. Le panneau d'accueil de l'Analyse s'appelle maintenant « Ce que ton
entraînement raconte » — il ne porte plus seulement la force et l'endurance.

Au passage, un défaut de la famille de l'itération 106 : le bloc d'équilibre annonçait « Équilibre
**semaine** » en comptant **sept jours glissants**, juste à côté d'un « Ta semaine, face au plan »
qui compte depuis lundi. Il se nomme désormais « Équilibre · 7 derniers jours ».

### Ce que cette itération a appris

**Un contrat de garde-fou peut devenir périmé sans être faux.** Le check de l'itération 83 mesurait
« le bloc *face au plan* ouvre le panneau » en le comparant à `block-status`, décrit dans son propre
commentaire comme « le premier contenu du plan ». Ce repère vient de déménager : le check rendait
`false` **faute de voisin, pas faute de contrat**. Décidé et écrit sur place plutôt qu'assoupli en
silence : il exige maintenant d'être le PREMIER bloc rendu du panneau — formulation plus forte, qui
implique l'ancienne, et qui ne dépend plus d'un voisin susceptible de bouger.

**Un seuil peut absorber une régression.** La mutation « la fenêtre glissante redevient anonyme » a
**survécu** au premier tour : `fenetreSemaineNommee` ne couvre que les voix de *course*, et mon
compteur d'« accueillis » passait de 6 à 5 — au-dessus du seuil de 3. Un check à seuil ne garde que
ce qui fait passer le seuil ; ce qui varie en dessous est invisible. Assertion dédiée ajoutée.

**Déplacer coûte moins cher qu'ajouter, et rend plus.** Neuf blocs, zéro ligne de rendu modifiée,
1 060 px rendus à l'écran d'atterrissage. *La roadmap voulait de la profondeur ; la profondeur était
déjà écrite, elle était juste au mauvais endroit.*

**Backticks : 13ᵉ fois.** Deux backticks autour de `.block-status` dans un commentaire ont terminé le
gabarit — l'erreur remontée était « status is not defined ». L'audit les a attrapés avant le commit.

**Mutations.** 4 posées, 4 détectées. La troisième reproduit l'état d'avant : plan 2 062 px, analyse
595 px, 5 fautifs. 698 tests · SMOKE OK. Rien publié depuis v2.17.0.

## Itération 112 — revue : mon déménagement avait cassé deux choses en silence

Revue adversariale (les précédentes aux 94, 97, 100, 103, 106, 109), visant **mon code des 110-111**.
Trois angles délégués en parallèle, chacun avec obligation de PROUVER par mutation ; puis tout
re-mesuré à la main. Quinze trouvailles, dont deux régressions utilisateur que les 698 tests
laissaient passer.

### Les deux régressions

**1. Le panneau replié avale maintenant toute l'analyse.** `setupCollapsibles` mémorise l'état
replié sous une clé dérivée de l'eyebrow (`c:ANALYSE`), et `polish.css` applique
`panel.collapsed > *:not(.panel-heading){display:none!important}`. **La clé a survécu au changement
de sens du panneau** : avant la 111, replier « ANALYSE » cachait trois lignes ; après, cela fait
disparaître 1 800 px d'analyse d'un coup. Qui l'avait replié *parce qu'il ne montrait rien* perdait
tout, sans signal. Mesuré : 97 px, cinq blocs invisibles-mais-non-vides. Corrigé en changeant
l'eyebrow — **un panneau qui change de sens change de clé**.

**2. « 🔄 Générer un nouveau bloc » était devenu un bouton mort.** Sans objectif choisi, son
gestionnaire faisait `showPage('athlete')` et s'arrêtait là — geste qui supposait la **proximité** du
sélecteur d'objectif, vraie tant que le bouton vivait dans le même panneau. Depuis la 111 il vit sur
« Progrès », donc `showPage` rappelait le sous-onglet courant : le clic ne produisait **rien**.

### Mes chiffres de la 111 étaient faux

J'avais mesuré le Plan **sans appeler `runObjectiveProgram`** — un panneau amputé de son contenu
principal. Re-mesuré, plan généré : **3 020 → 1 919 px** (et non 1 784 → 724), Analyse **630 → 1 728**.
Et le chiffre qui compte n'avait pas été mesuré : le premier « ▶️ Démarrer cette séance » remonte de
**2 258 à 1 157 px**, de 2,7 écrans à 1,4. Corrigé aux trois endroits qui le citaient.

### Ce que cette itération a appris

**Déplacer du markup, c'est déplacer des HYPOTHÈSES.** Les deux régressions viennent de la même
cause : du code qui supposait *où* l'élément vivait. Le bouton supposait la proximité de son
sélecteur ; la clé de repli supposait que le panneau garderait son sens. Aucune des deux hypothèses
n'était écrite nulle part. *Avant de déplacer un élément, chercher qui suppose sa position — pas
seulement qui le nomme.* Mon contrôle d'avant-déplacement (CSS parent, `reorganiserPlanDeBataille`)
cherchait les références DIRECTES, et elles étaient bien absentes ; les hypothèses, elles, sont
indirectes par nature.

**Un chiffre faux dans un recap est une affirmation fausse.** Même règle que pour l'app. Je l'avais
publiée dans un commit, un journal et une roadmap.

### Ce que la revue a trouvé et que je n'ai PAS encore corrigé

- **Mes deux checks promettent plus qu'ils ne vérifient**, prouvé par mutations qui restent vertes :
  (a) `analyseHorsEcranDaction` exempte `#objectiveResult` — or c'est là que le plan est rendu, donc
  y ajouter du rétrospectif passe (vérifié moi-même : ce nœud contient déjà « semaines », l'exemption
  est nécessaire telle quelle) ; (b) les quatre blocs d'historique (727 px mesurés) ne contiennent
  **aucun** des trois marqueurs et pourraient revenir dans l'écran d'action sans alerte, d'autant que
  le check ne sème jamais `blockHistory` ; (c) le seuil `accueillis >= 3` autorise à **supprimer
  479 px de l'Analyse** en silence, alors que le message promet « rien supprimé » ; (d) `op-reglages`
  est ignoré par classe, donc on peut y cacher le tonnage.
- **`deuxEcransDeuxElements` compare le TEXTE, jamais la géométrie** : `hidden` ne change pas
  `textContent`, donc la conséquence n°3 d'origine (bloc à 0 px) repasserait. Et le geste réellement
  fautif — `renderAgenda` en vue jour — n'est jamais joué : le check appelle `renderWeekPage()`.
- **Fuite d'état dans le harnais** : le check `weekScheduleCurrent` écrit `state.blockStart=''` et
  `state.workouts=[]` et ne restaure que `state.agenda`. De cette ligne jusqu'au check de la 111,
  tous les checks de rendu mesurent une app **sans bloc** (analysis-panel 310 → 194 px mesuré).
  *Et mon commentaire de la 109 accusait le mauvais coupable* : il disait « un check remplace l'état
  par une version normalisée », alors que `normalizeState` conserve `blockStart` et qu'aucun check ne
  remplace `state`. Un lecteur serait allé durcir un endroit sain.
- **Sur bureau, les blocs déplacés perdent 48 % de largeur** (952 → 492 px) : le panneau d'arrivée
  vit dans une grille `1.1fr .9fr` dont la colonne voisine est vide sur ce sous-onglet. Relève de B4.
- Cosmétique : en densité compacte, l'`<article>` garde 24 px de padding là où la `<section>` passait
  à 15 (`extras.css` ne traite que `section.panel`).

**Mutations.** 3 posées, 3 détectées. 699 tests · SMOKE OK. Rien publié depuis v2.17.0.

## Itération 113 — mes garde-fous tiennent enfin leurs promesses

Suite directe de la revue 112, qui avait prouvé par **mutations restées vertes** que mes deux checks
vérifiaient moins que ce que leur message affirmait. Quatre trous fermés, chacun re-prouvé par sa
mutation.

**1. Fuite d'état dans le harnais.** `weekScheduleCurrent` écrivait `state.workouts = []` et
`state.blockStart = ''` et ne restaurait que `state.agenda`. Tous les checks suivants mesuraient donc
une app **sans bloc** alors que le socle de la 109 prétend en poser un (mesuré : analysis-panel
310 → 194 px). **Et en corrigeant, j'ai trouvé la même faute dans mon propre check de la 111** : il
écrivait `blockStart` sans le restaurer, à trois lignes du commentaire où je m'en plaignais.

**2. Mon commentaire accusait le mauvais coupable.** Il disait « un check remplace l'état par une
version normalisée » : faux deux fois — aucun check ne remplace `state`, et `normalizeState` conserve
`blockStart`. Un lecteur serait allé durcir un endroit sain.

**3. Le check de la 110 comparait le texte, jamais la géométrie.** `hidden` ne change pas
`textContent` : un bloc mis à 0 px passait. Il mesure maintenant la hauteur et **joue la vraie
bascule d'agenda** — le geste qui posait `hidden`, qu'il ne rejouait pas. Découvert en chemin : il
visait « aujourdhui » en dur alors que le bloc a déménagé sur « progrès » à la 111, donc il mesurait
`h=0` sans s'en apercevoir. **C'est le test par le texte qui l'avait rendu aveugle au déménagement.**

**4. Le seuil `accueillis >= 3` laissait supprimer 479 px en silence.** Le garde contre la
suppression est maintenant un **test node** qui dérive la liste des blocs du markup, retrouve la
fonction qui écrit chacun, et exige qu'elle soit appelée.

### Ce que cette itération a appris

**J'ai reproduit le défaut que j'étais en train de corriger, dans le même fichier, le même jour.**
La fuite de `blockStart` que je colmatais dans `weekScheduleCurrent`, je l'avais écrite deux
itérations plus tôt dans mon propre check. *Connaître une règle ne la fait pas appliquer : ce qui la
fait appliquer, c'est un garde-fou qui la mesure.* D'où la ré-assertion de `blockStart` dans le socle
— maintenant, la prochaine fuite tombe toute seule.

**Un test qui compare du texte est aveugle à la mise en page.** Le check de la 110 a survécu à un
déménagement d'onglet sans broncher : le texte était là, l'élément invisible. La géométrie l'a vu
immédiatement (`h=84/0/0` sur la mutation).

**Un seuil ne garde que ce qui le franchit.** Écrit dans le commentaire du check, avec les deux trous
qui restent connus et non gardés : les quatre blocs d'historique ne contiennent aucun marqueur, et
`#objectiveResult` est exempté — à raison, il porte le plan et contient déjà le mot « semaines ».

**Mutations.** 4 posées, 4 détectées. 700 tests · SMOKE OK. Rien publié depuis v2.17.0.

## Itération 114 — A5 commence par un bug : sauvegarder ses objectifs effaçait les réglages du Plan

Sondé avant de juger, comme le protocole l'exige. Mesuré en cliquant « Sauvegarder » dans
« Objectifs hebdomadaires » (sous-onglet *Programme*) :

| `state.goals` | avant | après |
|---|---|---|
| `sessions` | 4 | 9 |
| `distance` | 20 | 20 |
| `targetWeight` | 73 | 73 |
| `runs` | **2** | **disparu** |
| `weeklyKm` | **25** | **disparu** |
| `progSessions` | `''` | **disparu** |

Le nombre de courses par semaine et le volume hebdo de course — celui qui sert à prescrire les
**kilomètres** des séances — partaient en silence : le gestionnaire **reconstruisait** `state.goals`
au lieu de le fusionner. Le report à la main de `targetWeight` dans ce même code montre que le
problème avait déjà été rencontré, et rustiné sur un seul champ.

### Ce que cette itération a appris

**Une rustine sur un champ signale un défaut sur tous les autres.** `targetWeight: state.goals.targetWeight`
était la trace visible du bug ; personne n'avait généralisé. *Quand on voit un champ recopié à la
main pour « ne pas le perdre », c'est que la structure entière est reconstruite.*

**Un formulaire n'écrit pas forcément au `change`.** Ma première sonde dispatchait `change` et
`input`, ne voyait rien bouger, et concluait « réglage mort ». Le panneau a un bouton
« Sauvegarder ». *Quatrième artefact de sonde de la session, évité en lisant le markup avant de
conclure.*

**Je n'ai pas su prouver le second défaut, et je l'ai écrit.** Le désaccord mesuré (« 3 / 6 » sur
Progrès contre « 3/5 » sur Corps et Aujourd'hui) venait de l'**effacement** — le plan recalculait
sans le nombre de courses — et non du `renderAthlete()` partiel. Une fois la fusion en place, aucun
champ de ce formulaire ne fait bouger la cible : la mutation `renderAthlete()` **survit**, y compris
avec la branche sans objectif où la cible devrait pourtant suivre le réglage (mesuré : 5 → 5). J'ai
gardé la correction — sauvegarder un objectif doit repeindre tout ce qui en dépend — mais le check
dit noir sur blanc qu'il ne la garde pas. *Un garde-fou qui ne peut pas prouver une promesse ne doit
pas la faire.*

### Ce que la mesure dit pour la suite d'A5

**« Séances / semaine » ne pilote plus rien tant qu'un objectif est choisi.** Mesuré : passer de 4 à
9 laisse la cible à 5, parce que la forme de l'objectif l'emporte sur le réglage brut (comportement
établi à l'itération 85, et c'est pour ça que la cible se lit dans le plan depuis la 107). Le panneau
propose donc de régler une chose que l'app ne suit pas — deux dials pour le même sujet, dont un
inerte : `#sessionsGoal` (panneau *Objectifs hebdomadaires*) et `#progSessions` (Plan de bataille).
C'est exactement ce qu'A5 demande de réunir, et c'est le sujet de la prochaine itération.

**Mutations.** 3 posées, 2 détectées, 1 non gardée et documentée. 700 tests · SMOKE OK. Rien publié
depuis v2.17.0.

## Itération 115 — A5 : un seul réglage pour le nombre de séances, et il pilote vraiment

Suite de la 114, qui avait mesuré que le champ « Séances / semaine » n'avait aucun effet. Mesure
complète des deux dials :

| geste | `goals.sessions` | `goals.progSessions` | cible | plan |
|---|---|---|---|---|
| départ | 4 | `''` | 5 | 3 muscu + 2 courses |
| « Objectifs hebdo » → **8** + Sauvegarder | 8 | `''` | **5** | **inchangé** |
| Plan → **6** | 4 | 6 | **6** | 4 muscu + 2 courses |

Un champ, un bouton « Sauvegarder », une étiquette « Séances / semaine » — et **zéro effet**.

**On ne déplace rien** (la revue 112 a appris ce que coûte un déménagement) : on fait **converger**.
« Sauvegarder » écrit les deux clés — `progSessions` pilote le plan, `sessions` reste le repli quand
aucun plan n'est générable. Mesuré après : régler 8 donne cible 8 et 6 muscu + 2 courses.

Et les deux champs s'affichent l'un l'autre. Celui du Plan n'était peuplé que par
`runObjectiveProgram()`, qui ne tourne qu'à la génération : régler depuis « Objectifs » mettait la
cible à 8 pendant que « Séances/sem. » restait **vide**. La synchronisation vit maintenant dans
`renderAthlete`, à côté de son jumeau, avec la même garde (ne pas toucher un champ en cours de
saisie).

### Ce que cette itération a appris

**Un réglage qui écrit dans l'état n'est pas un réglage qui pilote.** Le champ écrivait bien
`goals.sessions` — la valeur partait en base, le bouton répondait, rien ne trahissait la panne. Ce
qui l'a révélée, c'est d'avoir mesuré la CONSÉQUENCE (la cible, la composition du plan) et pas
l'écriture. *Un test qui vérifie « le champ écrit » aurait été vert sur le code cassé.*

**Deux sens de synchronisation demandent deux jeux d'essai.** La mutation « afficher l'ancienne clé »
survivait, parce qu'après un clic sur Sauvegarder les deux clés valent la même chose : il fallait le
sens inverse, régler depuis le Plan, où seul `progSessions` bouge. *Septième fois que la couverture
tient à un scénario manquant.*

**Contrat élargi sciemment.** Le check de la 114 exigeait qu'aucune clé étrangère aux deux champs du
formulaire ne bouge ; le formulaire en règle maintenant trois. Écrit dans le check avec sa raison,
plutôt qu'assoupli en silence — ce qu'il ne règle pas (`runs`, `weeklyKm`, `targetWeight`) reste
intouchable, et c'est ce que ce test garde.

**Backticks : 7ᵉ fois payée.** Un `node -e` avec des backticks dans un commentaire, et bash a mangé
deux mots (« progSessions: command not found »). Réparé avec un `.cjs`, comme le protocole le dit
depuis sept itérations.

**Mutations.** 3 posées, 3 détectées ; la première reproduit le défaut mot pour mot (cible 5→5, plan
3m+2c→3m+2c). 700 tests · SMOKE OK. Rien publié depuis v2.17.0.

**Reste d'A5 et A4, non fait :** le poids se saisit toujours à DEUX endroits (`#weightInput` sur
Athlète/Corps, `#coachWeightToday` sur la page Poids) — c'est A4, et c'est la prochaine étape.

## Itération 116 — revue : ma convergence des dials tuait le mode « auto »

Revue adversariale (les précédentes aux 94, 97, 100, 103, 106, 109, 112), visant **mon code des
113-115**. Mon propre angle a trouvé une régression introduite la veille, et elle se déclenche sur le
geste le plus banal.

`progSessions` **vide** veut dire « auto » : le plan choisit seul le nombre de séances — c'est le sens
du placeholder du champ jumeau. Mesuré après la 115 :

| geste | `progSessions` | cible |
|---|---|---|
| départ (auto) | `''` | 5 |
| « Sauvegarder » 6 | 6 | 6 ✓ |
| **vider le champ + Sauvegarder** | **4** | **4** ✗ |
| vider le champ du Plan | `''` | 5 ✓ |
| **changer JUSTE la distance** | **4** | **4** ✗ |

Deux causes, toutes deux miennes : `Math.max(1, Number('')||4)` transformait le vide en 4 ; et
surtout **j'affichais la valeur de repli dans un champ éditable**. Le champ montrait 4 « à titre
indicatif », et le bouton la figeait.

### Ce que cette itération a appris

**Un affichage de repli dans un champ éditable devient une écriture.** C'est le cœur du défaut : rien
ne distingue, à l'écran, un nombre *indicatif* d'un nombre *choisi*. Dès qu'un bouton « Sauvegarder »
lit le champ, l'indicatif devient une décision — prise par l'app, au nom de l'utilisateur, sur un
geste qui ne parlait même pas du sujet. *Un champ vide n'est pas un champ à remplir : c'est une
valeur.*

**J'ai cassé « auto » en croyant réunir deux réglages.** L'itération 115 visait « un seul avis par
sujet » et l'a obtenu — en supprimant une option que personne n'avait vue dans le tableau : le mode
où l'app décide. *Réunir deux voix, c'est aussi hériter de ce que chacune savait faire.*

**Un témoin peut tester l'ordre du check au lieu de son sujet.** Ma première assertion sur le repli
comparait à une constante, alors que les passes précédentes du check l'avaient déjà fait bouger. Elle
tombait — pas parce que le code était faux, mais parce que le témoin regardait ailleurs. Corrigé en
relevant la valeur juste avant le geste.

**Mutations.** 3 posées, 3 détectées. 700 tests · SMOKE OK. Rien publié depuis v2.17.0.

**En cours :** une réfutation déléguée sur trois angles (le mode auto, la fusion de `state.goals`, les
garde-fous durcis de la 113) tournait encore à la clôture. Ses trouvailles seront traitées à
l'itération suivante, avant A4.

### Itération 116 (suite) — ce que la réfutation déléguée a ajouté

Elle a confirmé ma trouvaille par une mesure indépendante, et trouvé **deux asymétries de plus** sur
le code que je venais de corriger. Les deux champs que je présentais comme « un seul réglage » ne
validaient pas pareil :

| | plafond | garde de saisie |
|---|---|---|
| `#sessionsGoal` (Objectifs) | **14** | **absente** |
| `#progSessions` (Plan) | **10** | présente |

Saisir 12 : accepté, pilote un plan à 8 séances, puis `progSessions` **redevient 10 au redémarrage**
pendant que `sessions` reste 12. La valeur change toute seule et les deux cadrans re-divergent.

**Ce que ça apprend.** *Réunir deux réglages, ce n'est pas seulement leur faire écrire la même clé :
c'est leur donner le même domaine, la même validation et les mêmes protections.* J'avais fait
converger les valeurs et laissé diverger tout le reste — plafond, placeholder, garde de saisie.

**Et une limite assumée** : je n'ai pas su reproduire la perte de saisie chez moi (`focusReel: false`
— fenêtre sans focus système, les deux champs se comportaient pareil). Je corrige sur la foi de
l'asymétrie de code, qui est factuelle, pas d'une mesure du rendu. C'est écrit dans le commit.

**Mutations.** 4 posées, 4 détectées, sur un test node qui dérive le plafond du markup. 701 tests ·
SMOKE OK.

**Reste des trouvailles, noté :** `normalizeState` transforme `progSessions: 0` ou `'  '` en 4, alors
que `''` et `null` donnent bien « auto » — le tri-état n'est préservé que pour deux des quatre
formes du vide. Cosmétique tant qu'aucun chemin d'écriture ne produit 0.

## Itération 117 — A4 : la lettre visait un défaut qui n'existe pas, la mesure en a trouvé un vrai

**Ce que la roadmap prescrivait** : « une seule saisie de poids dans l'app ». Sondé d'abord : les
deux champs (`#weightInput` sur Athlète/Corps, `#coachWeightToday` sur la page Poids) écrivent la
**même chose**, au même endroit, avec le même dédoublonnage par date — saisir 78,5 d'un côté puis
77,9 de l'autre laisse **une seule** pesée du jour, à 77,9. La duplication n'est pas nuisible.

**Le vrai défaut**, mesuré sur un historique régulier de 9 pesées à −0,35 kg/semaine, au même
instant :

| voix | rythme | échéance |
|---|---|---|
| Athlète · `weightTrend` | −0,36 kg/sem (ce que tu FAIS) | **~14 semaines** |
| Poids · coach | 0,55 kg/sem (ce que ton plan VISE) | **≈ 10 semaines** |

Deux échéances pour un seul objectif, à un facteur 1,4. Les deux sont honnêtes — et **aucune ne
disait de quelle règle elle sortait**. Même défaut qu'à la 106, même remède : nommer la règle sans
toucher aux nombres. « → ~14 sem. **À CE rythme** » et « ≈ 10 semaines **si tu tiens le rythme
VISÉ** · (0,55 kg/sem. **visés par ton plan**) ».

### Ce que cette itération a appris

**Une roadmap peut prescrire un remède contre un symptôme absent.** « Une seule saisie » supposait
que deux saisies divergent ; mesurées, elles convergent parfaitement. Trois fois maintenant que la
lettre visait les pixels ou la structure quand le défaut était dans le CONTENU (A1, A3, A4). *Sonder
avant de juger n'est pas une formalité : c'est ce qui empêche de réparer ce qui marche.*

**Deux artefacts de sonde évités dans la même itération.** Mon premier clic est tombé sur le bouton
de repli `[▾]` ajouté par `setupCollapsibles` au lieu de `#addWeightButton` — d'où un « la saisie
n'écrit rien » entièrement faux. *Dans cette app, `querySelector('.panel button')` attrape presque
toujours le mauvais bouton.*

**Mutations.** 4 posées, 4 détectées, dont l'état exact d'avant. 701 tests · SMOKE OK. Rien publié
depuis v2.17.0.

**Reste d'A4, noté et non fait :** quatre panneaux parlent du poids sur l'onglet Athlète
(`progression-hub`, `analysis-panel`, `weight-panel`, `coach-panel`) plus la page Poids. La lettre
demande que `analysis-panel` se taise ; sa ligne « Ta tendance de poids » n'a pas encore été
confrontée aux autres — à mesurer avant de la retirer, exactement comme ici.

## Itération 118 — A4 (fin) : deux voix sur le poids, deux questions, et un refus argumenté

La roadmap demandait que `analysis-panel` « cesse de parler de poids ». Mesuré avant d'obéir, sur
neuf pesées hebdomadaires :

| voix | ce qu'elle dit | ce qu'elle calcule VRAIMENT |
|---|---|---|
| `weight-panel` (Corps) | « Tendance récente : −0,36 kg/sem » | les **six dernières mesures** (`slice(-6)`) |
| `analysis-panel` (Progrès) | « −2,8 kg en 8 semaines · −0,35 kg/sem » | la **première** pesée contre la dernière |

Deux chiffres proches, mais **pas deux calculs de la même chose** : tendance récente contre bilan
depuis le début. **Refus argumenté**, comme pour A1 et A3 — on ne fait pas taire l'analyse.

Ce qui manquait : l'une des deux ne nommait pas sa fenêtre. Elle dit maintenant « Sur tes
**6 dernières pesées** », et le compte est le **vrai** — `weightTrend` expose `mesures`, parce
qu'avec trois pesées la fenêtre vaut trois.

### Ce que cette itération a appris

**Deux nombres proches trompent plus que deux nombres éloignés.** −0,35 et −0,36 : l'écart est si
petit qu'on conclut « c'est la même chose, mal arrondie » et qu'on supprime un doublon qui n'en est
pas un. Ce sont les fenêtres, lues dans le code, qui ont tranché. *La proximité de deux chiffres ne
dit rien de la proximité des questions.*

**Quatre refus sur cinq étapes de la phase A.** A1 (les archétypes), A3 (la fusion de surface), A4
deux fois — la saisie unique à la 117, le silence de l'analyse ici. À chaque fois la lettre visait
la structure et la mesure a trouvé le contenu. *Une roadmap écrite sans données est une hypothèse,
pas un plan.*

**Huitième scénario manquant.** Le libellé « six en dur » passait le check : avec neuf pesées, la
fenêtre vaut six de toute façon. Il a fallu une seconde passe à trois pesées pour que la mutation
tombe.

**Mutations.** 4 posées, 4 détectées après ajout de la passe courte. 702 tests · SMOKE OK. Rien
publié depuis v2.17.0.

## Itération 119 — B4 refusé par la mesure, et un défaut trouvé par le garde-fou qui le remplace

B4 demandait de casser l'uniformité : « 30 panneaux au même poids : titre 18px/700 ». Mesuré sur
les quatre sous-onglets :

| | valeur |
|---|---|
| panneaux visibles | **21** |
| tailles de titre distinctes | **1** (18,4 px) |
| graisses distinctes | **1** (700) |
| hauteur par sous-onglet | 3 834 à 4 501 px |

**Le constat est exact.** Mais cette uniformité est un CHOIX, argumenté dans `pages.css` par
l'audit typographique du 27/07 : « deux niveaux si proches, répétés sur 47 panneaux, se lisent
comme une liste de blocs équivalents ». Ajouter un cran recréerait ce qui venait d'être corrigé.
Et le symptôme supposé n'est pas là : le premier geste est à **540 px sur les quatre**
sous-onglets, et **trois n'ont aucune action propre** — hiérarchiser des titres n'y rapprocherait
aucune action.

### Le garde-fou a trouvé un défaut en s'exécutant

| fichier | sélecteur | taille |
|---|---|---|
| `pages.css` | `.section-heading h2,.panel h2` | `var(--fs-xl)` — en vigueur |
| `style.css` | idem + `.dialog-heading h2` | **1.5rem EN DUR** — morte mais présente |

Le commentaire de l'audit affirmait « aucune taille en dur ». C'était **faux** : la déclaration
d'origine subsistait, simplement écrasée par l'ordre des feuilles. Si demain quelqu'un renomme ou
réordonne les CSS, les titres repassent à 1,5 rem sans que personne ne l'ait décidé.

### Ce que cette itération a appris

**Écrire un garde-fou est une façon de vérifier une affirmation.** Je n'ai pas cherché ce défaut :
le test l'a trouvé en s'exécutant, parce qu'il DÉRIVE la liste des règles au lieu de la déclarer.
*Un test qui énumère lui-même voit ce que le lecteur ne voit pas.*

**Cinquième refus sur six étapes de phase A+B.** A1, A3, A4 (deux fois), B4. À chaque fois la
lettre visait la structure et la mesure a trouvé autre chose — ou rien. *Ce n'est pas la roadmap
qui est mauvaise : c'est qu'elle a été écrite sur un profil sans données, et qu'aucune de ses
lignes n'avait été mesurée avant d'être écrite.*

**Refuser n'est pas ne rien faire.** Le refus vaut mieux que l'obéissance quand il est mesuré,
mais il doit laisser une trace exécutable : ici, un test qui empêche un futur moi de défaire la
décision sans la lire. La mutation « un panneau majeur obtient un cran à lui » — c'est-à-dire B4
lui-même — est maintenant détectée.

**Mutations.** 3 posées, 3 détectées. 703 tests · SMOKE OK. Rien publié depuis v2.17.0.

## Itération 120 — la page Poids annonçait un plan que tu n'as pas choisi

Trouvé par la réfutation déléguée de **mon propre code de la veille**, puis re-mesuré. C'est la
trouvaille la plus grave de la session — et je l'avais aggravée.

| programme choisi | appliqué par le Plan | annoncé par la page Poids |
|---|---|---|
| prudent | 0,28 kg/sem · 19 sem | **0,55 · 10** |
| équilibré | 0,55 · 10 | 0,55 · 10 *(coïncidence)* |
| agressif | 0,77 · 7 | **0,55 · 10** |
| très agressif | **0,96 · 6 · 1968 kcal** | **0,55 · 10 · 2425 kcal** |

La page Poids construisait son plan avec `energyPlan` et s'arrêtait là, sans passer par
`appliquerProgrammeNutrition`. Le commentaire de `logic.js` l'avait pourtant écrit :
« Le choix nutritionnel doit changer le PLAN, pas seulement un texte […] sinon l'app promettrait
une date de fin qui ne correspond à rien. »

### Ce que cette itération a appris

**Nommer une règle suppose d'avoir vérifié que c'est la bonne.** À l'itération 117 j'ai renommé ce
chiffre en « 0,55 kg/sem. **visés par ton plan** », convaincu de corriger un défaut de nommage. J'ai
transformé un chiffre anonyme en **attribution fausse**, avec un facteur 1,7 — pire que le 1,4 que
je corrigeais. *Le remède de la 106 (nommer la règle) n'est valable que si on a d'abord vérifié
d'où sort le chiffre. Je l'ai appliqué comme une recette.*

**Une coïncidence suffit à masquer un défaut systématique.** Sur cinq programmes, « équilibré »
tombait juste — et c'est celui que j'avais mesuré à la 117. Le check dérive désormais TOUT le
catalogue.

**Une mutation qui survit mérite une enquête, pas un maquillage.** « La garde de sécurité n'est
plus transmise » survit : ce paramètre est **inerte** dans `appliquerProgrammeNutrition` —
mesuré, même sur une cible d'IMC 17,4, avec ou sans garde : 0,97 kg/sem et 1988 kcal. La garde agit
ailleurs, dans `programmesNutrition`, où elle change 5 entrées sur 7 et porte
l'avertissement — conforme à la règle « avertir explicitement, ne pas retirer les options
agressives ». Je la transmets par symétrie, **sans prétendre que c'est gardé**.

**Mutations.** 3 posées, 2 détectées, 1 expliquée. 703 tests · SMOKE OK. Rien publié depuis v2.17.0.

### Ce que la réfutation a trouvé et que je n'ai PAS encore corrigé

- **« Sur tes N dernières pesées » promet une base de N mesures ; le calcul n'en utilise que 2.**
  `weightTrend` est une pente entre la première et la dernière de la fenêtre : les N−2 du
  milieu ne pèsent rien. Une pesée aberrante au milieu est comptée dans le libellé et ne change pas
  le chiffre.
- **Le libellé nomme le NOMBRE, pas la DURÉE** — et c'est la durée qui informe. Deux pesées à 24 h
  d'intervalle donnent « −3,5 kg/sem → ~2 sem. À CE rythme », pendant que la page Poids dit 11
  semaines. *J'ai nommé la seule dimension qui n'informe pas.*
- **Mon check de la 118 est creux** : il cherche `String(nMesures)` n'importe où dans le
  libellé, et « 6 » est déjà contenu dans « −0.36 ». La mutation `${tr.mesures}` →
  `${weights.length}` passe les huit prédicats, y compris la passe courte.

Ces trois-là sont le sujet de la prochaine itération.

## Itération 121 — je nommais la dimension qui n'informe pas

Les trois trouvailles laissées ouvertes par la réfutation n'en font qu'une : mon libellé de la 118
annonçait un **nombre de pesées** là où seule la **durée** a un sens.

| historique | ce que l'app disait | la réalité |
|---|---|---|
| 9 pesées hebdomadaires | « sur tes **6** dernières pesées » | fenêtre **41 j**, −0,30 kg/sem |
| 6 pesées en 5 jours | « sur tes **6** dernières pesées » | fenêtre **5 j**, −0,84 kg/sem |
| 2 pesées à 24 h | « sur tes **2** dernières pesées → **~2 sem.** » | fenêtre **1 j**, −3,5 kg/sem |

Même compte, rythme du simple au triple, échéance de 17 à 8 semaines. Et le compte ment aussi sur
la base du calcul : `weightTrend` est une pente à **deux points**, donc une pesée aberrante au
milieu est comptée dans le libellé sans changer le chiffre.

Le libellé dit maintenant « Sur N jours », et **ne projette plus d'échéance sous deux semaines de
recul** : deux pesées à 24 h affichent « Sur 1 jour : −3,5 kg/sem · reste −7 kg — trop peu de recul
pour projeter une échéance ».

### Ce que cette itération a appris

**Nommer une fenêtre ne suffit pas : encore faut-il nommer la bonne grandeur.** Depuis la 106 je
répète « chaque voix nomme sa règle ». J'ai nommé une règle — le nombre de pesées — qui ne portait
aucune information. *Le remède devient un rite quand on cesse de se demander ce que le mot
apprend au lecteur.*

**Un check qui cherche une sous-chaîne peut être satisfait par le hasard.** Le mien exigeait
« 6 » quelque part dans le libellé : « −0.36 » le fournissait. Il vérifiait donc que le rythme
contient un 6, pas que le compte est juste. *Une assertion doit porter sur un motif entier, jamais
sur un fragment qui peut apparaître ailleurs.*

**Se taire est parfois la bonne réponse.** L'app savait calculer une échéance sur un jour de
données ; elle l'affichait parce qu'elle le pouvait. Ne pas répondre quand la question n'a pas de
sens vaut mieux qu'un chiffre exact tiré d'un calcul absurde.

**Backticks et node -e : 8ᵉ fois.** Une apostrophe échappée dans un `node -e` a cassé le
fichier de tests. Restauré par `git checkout`, réécrit avec un `.cjs`.

**Mutations.** 4 posées, 4 détectées — dont celle qui survivait au check de la 118. 703 tests ·
SMOKE OK. Rien publié depuis v2.17.0.

## Itération 122 — le plan ne demandait jamais s'il restait du temps pour lui

C1 était la seule ligne de la feuille de route dont je doutais qu'elle décrive un vrai défaut :
sur la capacité par défaut, une semaine d'alternant laisse 20 h libres pour un plan qui en
réclame 4. J'ai failli la refuser. Puis j'ai vérifié que `state.dayCapacity` est un réglage
**réellement atteignable** (`ouvrirCapacite()`, `capacityFromHours`) — et à 1 h en semaine, 2 h le
week-end, le Plan de bataille réclamait 4 h quand la semaine n'en avait que 3 de libres. Aucun
écran ne le disait : `dayLoad` mesurait un JOUR, `lightenSuggestions` allégeait un JOUR.

### Ce que la sonde a pris en flagrant délit — dans MON code, pas dans l'app

Ma première version de `budgetSemaine` se contentait de deux preuves : la somme qui dépasse, et
la séance plus longue que le plus grand jour libre. Le rendu affichait alors, en toutes lettres :

> Ton plan demande 4 h · ta semaine a 4 h de libres. Il ne te reste que **0 min** de marge.

Or 45+35+45+70+45 = 240 min dans deux journées de 120 min ne se rangent pas : 70+45 = 115, puis
45+45+35 = 125 > 120. **Le total qui tient ne dit rien du rangement.** L'app annonçait une marge
nulle là où le plan était infaisable — l'écart dire/faire, dans le code même que j'écrivais pour
le traquer. Je ne l'ai vu que parce que j'ai regardé le panneau peint au lieu de relire ma
fonction.

### Ce que la fonction affirme, elle le prouve

| constat | nature | ce que l'écran dit |
|---|---|---|
| la somme dépasse le libre | preuve, quel que soit l'ordre | « il manque 1 h » |
| une séance > le plus grand jour libre | preuve, on ne coupe pas une séance | « ne tient dans aucune journée » |
| le rangement échoue sans preuve | constat de méthode | « **en les rangeant au mieux**, X ne trouve pas de place » |

Le rangement va de la plus longue à la plus courte. S'il aboutit, c'est une preuve *constructive*
que ça rentre. S'il échoue, un autre rangement existe peut-être : l'app nomme sa méthode au lieu
de décréter l'impossible.

Le temps libre se somme jour par jour, en `max(0, libre)` : un lundi qui déborde ne prête pas ses
minutes au dimanche, alors que « capacité totale − pris total » inventerait du temps.

### Ce que cette itération a appris

**Le doute sur une ligne de feuille de route se tranche par une mesure, pas par un pari.** Cinq
lignes ont été refusées depuis la 106, et j'allais refuser celle-ci sur le seul cas par défaut.
La question juste n'était pas « est-ce que ça mord ? » mais « **l'utilisateur peut-il atteindre
l'état où ça mord ?** ». Un `grep` de trente secondes sur `dayCapacity` a répondu oui.

**Une mutation qui survit à un harnais peut être visée sur le mauvais.** `prouve = true` a
survécu au smoke : le rendu ne lisait jamais ce champ, il *redérivait* la distinction par l'ordre
de ses branches. Redondance, donc — la troisième des trois causes. Le remède n'était pas de
durcir le check mais de faire porter la décision par `prouve` : *deux endroits qui décident la
même chose finissent toujours par diverger.* 5 mutations, 5 détectées après correction.

**Le champ des minutes d'un bloc d'agenda est `durationMin`, pas `duration`.** Mes jeux d'essai
annonçaient 240 min ; `normalizeAgendaItem` retombait sur 60 par défaut. Toutes mes semaines
« chargées » étaient quatre fois plus vides que je ne le croyais — ce qui **sous-estimait** le
défaut, sans quoi j'aurais publié des chiffres faux comme à la 111.

**Backticks et `node -e` : 9ᵉ fois.** Deux mots d'un commentaire mangés comme substitutions de
commande. Réparé par un `.cjs`. La règle est écrite depuis huit itérations et je la paie encore.

**Garde-fous.** Le test node est bâti sur le couple qui discrimine : même temps libre (240 min),
même demande (180 min), aucune séance trop longue — et pourtant [100, 100, 40] ne range pas ce
que [120, 120] range. Un test sur les totaux les aurait confondus. Le check bloquant fait deux
passes : capacité contrainte → bloc peint citant les durées calculées ; capacité par défaut, même
agenda → bloc muet. 704 tests · SMOKE OK. Rien publié depuis v2.17.0.

## Itération 123 — revue adversariale : je comparais deux semaines fantômes

Trois itérations depuis la dernière revue, et la cible était toute trouvée : mon arbitrage de la
122, écrit la veille. Il confrontait un plan **en forme de semaine** à un budget **en forme de
semaine** — alors qu'on vit *au milieu* de la semaine. Deux défauts, une seule racine.

| défaut | mesure |
|---|---|
| le budget sommait les jours **écoulés** | 780 min annoncées dont **540 déjà passées (69 %)**, et un verdict « ok » alors qu'aucune journée restante de 60 min ne pouvait accueillir la sortie longue de 70 |
| la demande ignorait le **déjà-fait** | un jeudi avec 1 muscu et 1 course faites : « il manque 1 h » pour 3 h de libres et 2 h 40 réellement restantes |

Le second était le plus laid : les deux séances que l'app déclarait non plaçables — « Haut du
corps », « Course facile » — étaient **exactement celles déjà courues lundi et mardi**. Elle
disait à Adrien de couper son plan alors qu'il était à jour.

`budgetSemaine` prend désormais `aPartirDe` (les jours passés restent listés mais ne pèsent ni
dans le total ni dans le rangement) et `dejaFait`. Le retrait ôte les séances les plus **courtes**
de chaque type : ce qui subsiste est le plus dur à placer, donc la fonction ne peut jamais
conclure « ça rentre » sur un rangement plus facile qu'en vrai. L'écran nomme sa fenêtre —
« d'ici dimanche » — et annonce « Il te reste 3 séances sur 5 (2 h 40) ».

### Ce que cette itération a appris

**Une fonction pure ne doit pas deviner « aujourd'hui », mais l'appelant doit le lui dire.**
J'avais bien gardé `budgetSemaine` pure — et c'est justement pour ça qu'elle raisonnait sur une
semaine abstraite que personne ne vit. *La pureté protège du hasard, pas du hors-sujet.*

**Un check qui RECALCULE au lieu d'OBSERVER ne teste que lui-même.** L'helper du check de la 122
rappelait `budgetSemaine` avec d'autres options que le rendu : il mesurait une valeur que
l'écran n'affichait pas. L'aligner ne suffisait pas — un helper aligné masquerait un rendu qui
oublierait l'option. Il a fallu un **témoin observable** : enregistre une séance, le texte du
panneau doit changer. Aucun helper ne peut fabriquer ça.

**Un trou de couverture qu'on documente reste un trou.** Ma mutation « le rendu ne transmet plus
la fenêtre » survivait parce que le jeu d'essai chargeait lundi–mercredi : les jours écoulés
étaient déjà à zéro. Le check le *disait* (`discrimine=false`), ce qui valait mieux que le
silence — mais dire un trou ne le bouche pas. La charge est maintenant ancrée sur **aujourd'hui**,
et la mutation tombe. *Un jeu d'essai relatif à la date doit être pensé pour le jour où le harnais
tourne, pas pour celui où on l'écrit.*

**J'ai violé ma propre règle dans le garde-fou censé la faire respecter.** Mes deux assertions
cherchaient une durée n'importe où dans le texte — or l'écran affiche « Ton plan demande **4 h** ·
**1 h** de libres » et la demande valait 4 h elle aussi. « Ne jamais asserter une chaîne sur un
conteneur qui la contient déjà », écrit depuis la 121, appliqué partout sauf là. Les motifs sont
ancrés sur « de libres ».

**Backticks : 13ᵉ prise, mais par l'audit.** Un ``aPartirDe`` dans un commentaire du gabarit,
attrapé avant d'avoir rien cassé. L'outil vaut mieux que ma vigilance.

**Mutations.** 6 posées, 6 détectées — la dernière seulement après avoir rendu le jeu d'essai
discriminant. 705 tests · SMOKE OK. Rien publié depuis v2.17.0.
