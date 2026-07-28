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
