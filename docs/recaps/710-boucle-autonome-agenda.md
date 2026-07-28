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
