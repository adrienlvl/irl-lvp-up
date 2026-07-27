# 709 — Revue adversariale des 4 lots (2.2.0 → 2.5.0) : 12 défauts corrigés

## Contexte

Adrien : « Fais la revue, après je vais dormir. »

Quatre versions avaient été livrées d'affilée sans relecture adversariale — j'avais signalé le
risque à chaque fois. La revue a couvert `git diff v2.1.0..HEAD` sur cinq axes (formulaire
reconstruit, grilles horaires, restructuration Athlète, fonctions pures, CSS et thème clair), chaque
piste étant ensuite confiée à un sceptique chargé de la **réfuter**, plusieurs ayant exercé le code
dans un vrai renderer Electron.

**Résultat : 12 défauts distincts confirmés, dont 2 graves.** Deux pistes réfutées.

## Les deux graves — et pourquoi 605 tests ne les voyaient pas

### 1. La fiche d'exercice ne s'ouvrait plus

Le fragment « +N autres » destiné à la vue mois avait atterri **dans `openExerciseDetail`**, au
milieu du gabarit de la ligne « 🏆 Meilleure série ». `_totalJour` n'y existe pas :
`ReferenceError`, levé **avant** `showModal()`. La fiche ne s'ouvrait donc jamais.

Mon script d'insertion avait cherché la fin de la case du mois par `indexOf("</div>`);")` — et était
tombé sur la première occurrence, située dans une tout autre fonction.

**Pourquoi les tests étaient verts** : la branche fautive n'est atteinte que si
`_hist.bestSet.load > 0`, c'est-à-dire si une séance a été enregistrée **avec une charge**. L'état
de test n'en contenait aucune. Le nouveau check `ficheAvecCharge` sème exactement ce cas.

### 2. La page Athlète pouvait s'afficher entièrement vide

La refonte 2.3.0 a renommé les onglets, mais **quatre appelants** demandaient encore `'seance'` :
fin d'onboarding, digest « À rattraper », « Le focus du moment », et le raccourci `?go=wellness`.
`showAthleteTab` ne validait pas son argument : aucun panneau ne correspondant, elle posait
`display:none!important` sur **tous**, et n'activait aucun bouton.

Le garde-fou existait — mais seulement au démarrage, sur la valeur lue dans `localStorage`. Il ne
protégeait pas les appels à chaud. Le chemin le plus grave était le **premier lancement** : finir
l'onboarding menait à un écran vide.

La fonction normalise maintenant son argument elle-même, et les quatre appelants visent le bon
onglet — `?go=wellness` pointe vers « Programme », où vit réellement `.wellness-panel`.

## Les dix autres

| | Défaut | Effet |
|---|---|---|
| 3 | La durée de l'ajout rapide servait à l'alerte de conflit **puis était jetée** | tout bloc durait 60 min — le bug que 2.2.0 prétendait corriger |
| 4 | Cliquer un bloc de la grille semaine ne faisait rien | le handler testait `[data-edit-agenda]`, vestige des anciennes pastilles |
| 5 | `premier` calculé puis **jamais utilisé** | la grille s'ouvrait sur le premier bloc du lundi, pas de la semaine |
| 6 | Le « +N autres » n'apparaissait nulle part | conséquence du défaut n°1 : le repère était parti avec le fragment |
| 7 | « Replanifier » ancrait « maintenant » sur la date **du bloc** | un bloc d'hier se voyait proposer « Aujourd'hui » sur hier, et la matinée d'un jour futur était perdue |
| 8 | Les liens profonds vers un panneau Athlète | faisaient défiler vers un élément `display:none` |
| 9 | La jauge de charge du jour | restait affichée, et périmée, en vue semaine |
| 10 | `extras.css` charge après `pages.css` | le formulaire reconstruit gardait `display:flex` |
| 11 | Trois géométries incompatibles | en-têtes de jour décalés jusqu'à **12 px** de leurs colonnes |
| 12 | `color:var(--accent)` sur un voile de `--accent` | en thème clair les deux convergent : 3,4–4,5:1, sous le seuil AA |

Mesuré après correction : décalage des en-têtes **0 px**, défilement à 82 px (le premier bloc de la
semaine), formulaire en `block`, clic ouvrant l'édition, jauge masquée en vue semaine.

## Non-régression

Trois checks **bloquants** ajoutés, tous les trois validés par mutation :

- `ficheAvecCharge` — la fiche doit s'ouvrir pour un exercice **avec charge enregistrée**, et son
  contenu ne doit pas porter de `month-more`. Réintroduire le fragment fait rougir le smoke.
- `athleteTabRobuste` — un nom d'onglet inconnu (dont l'ancien `'seance'`) doit retomber sur
  « Aujourd'hui » et **jamais** vider la page. Retirer le garde-fou fait rougir le smoke.
- `moisDebordement` — une case à 5 entrées doit porter `.month-full` **et** un repère « +2 ».

Plus un test node sur `rescheduleOptions` : un bloc du passé se repose à partir d'aujourd'hui, les
libellés disent la vérité, et la matinée d'un jour futur reste proposable.

**605 tests + SMOKE OK.**

## Ce que cette revue dit de la méthode

Quatre livraisons d'affilée sans relecture ont produit deux défauts graves, tous deux issus
d'**éditions par script sur de gros fichiers** : une ancre trouvée dans la mauvaise fonction, et un
renommage dont les appelants n'ont pas suivi. Les deux étaient invisibles pour la suite de tests
parce qu'ils dépendaient d'un état (une charge enregistrée) ou d'un chemin (l'onboarding) que les
tests ne couvraient pas.

Domaine : qualité
