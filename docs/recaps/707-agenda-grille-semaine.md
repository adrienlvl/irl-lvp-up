# 707 — Le design de l'Agenda : grille horaire hebdomadaire, vue mois qui respire

## Contexte

Adrien, après le lot 2.3.0 : « je t'ai demandé l'amélioration du design de l'onglet Agenda, c'est pas
encore fait ! »

Il avait raison. En 2.3.0 j'avais unifié les **couleurs** de l'agenda — un correctif de cohérence
réel, mais pas un travail de design. Les trois écrans étaient restés tels quels.

## Le vrai écart : la semaine ne montrait pas le temps

La vue jour avait déjà une grille horaire (`.day-grid`, blocs positionnés en absolu, ligne de
l'heure actuelle). La vue semaine, elle, était **sept listes de pastilles** : on voyait *ce qu'il y
avait*, jamais *quand*. Ni les trous, ni les chevauchements.

C'est le défaut de fond : un agenda dont la vue principale ne représente pas le temps ne sert qu'à
lister. La grille reprend la géométrie de la vue jour, avec une gouttière d'heures partagée par les
sept colonnes :

- une colonne par jour, chaque bloc à son heure et à sa **hauteur réelle** ;
- les chevauchements placés **côte à côte** via `dayColumns` — la fonction pure existait déjà et
  n'était utilisée que par la vue jour ;
- la ligne rouge de l'heure actuelle sur la colonne du jour ;
- la plage horaire s'ajuste à la semaine réelle (inutile d'afficher 00 h–24 h quand tout se passe
  entre 8 h et 21 h), avec un minimum de 6 h pour que la grille ne soit jamais écrasée ;
- les journées entières sortent de la grille et passent dans un bandeau dédié, en haut.

Mesuré sur une semaine de test : 7 en-têtes, 7 colonnes, 5 blocs positionnés, 2 chevauchements
partageant la largeur à 50 % (`left:0%` et `left:50%`), 1 tout-journée en bandeau, hauteur 612 px
pour une plage 08 h–20 h.

## La vue mois débordait en silence

Une case empilait **tout** sans limite : une journée chargée écrasait la hauteur des six lignes et
rendait le mois illisible. Elle montre maintenant trois entrées et annonce « +4 autres » — le clic
sur la case ouvre déjà la journée complète. Le week-end se distingue discrètement (`--fill-1`, un
repère de lecture, pas une alerte) et le jour même ressort.

## Les dernières couleurs en dur

Le lot 2.3.0 avait migré 28 occurrences ; il en restait **19**, précisément dans l'agenda :

- `.week-chip.sport/life/study/focus` — quatre fonds sombres littéraux (`#3a2740`, `#20362f`…) ;
- `.week-chip` — un liseré `#3a4b7a` ;
- `.dg-event{color:#fff}` — du blanc **forcé** sur les blocs de la vue jour : en thème clair, du
  blanc sur un fond de catégorie devenu pâle, donc illisible ;
- deux `var(--pink,#e5484d)` / `var(--pink,#fb7185)` — le même rôle avec deux replis différents.

## Un couplage évité de justesse

Les lignes d'heure de la grille sont dessinées en CSS par un dégradé répété, dont le pas doit valoir
exactement la hauteur d'une heure calculée en JS. Je l'avais d'abord écrit `51px` en dur : un
changement d'échelle côté JS aurait décalé silencieusement toutes les lignes. La hauteur est
maintenant exposée en variable CSS depuis le rendu. Premier essai raté au passage — le repli posé
sur `.wt-cols` **écrasait** la valeur héritée de `.wt-body` ; une déclaration locale bat toujours
l'héritage.

## Non-régression

- Check smoke **bloquant** `weekTimeGrid` : 7 en-têtes, 7 colonnes, blocs positionnés, **les deux
  blocs qui se chevauchent doivent avoir un `left` différent** (c'est tout l'intérêt d'une grille
  par rapport à une liste), conflits et haute priorité marqués, et **plus aucune `.week-chip`** de
  l'ancien rendu.
- **604 tests + SMOKE OK.** Le check est validé par mutation : retirer le positionnement des blocs
  fait passer le smoke au rouge.

En écrivant ce check, il a d'abord échoué à cause de mon jeu d'essai : `localDate()` **ignore son
argument** et rendait la même date pour les sept jours — tous les événements tombaient sur une seule
colonne. C'est `dateKey(d)` qu'il fallait.

Domaine : design
