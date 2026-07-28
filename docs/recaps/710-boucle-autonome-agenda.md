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
