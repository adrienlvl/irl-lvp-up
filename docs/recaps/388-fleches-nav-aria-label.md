# #388 — Accessibilité : aria-label sur les boutons-flèches de navigation (2.0.29)

## Le manque (accessibilité §4.3, chemin calendrier)

Les 4 boutons-flèches de navigation du calendrier — **précédent/suivant** en vue mois
(`previousMonth`, `nextMonth`, `index.html:225`) et en vue semaine (`previousWeek`, `nextWeek`,
`index.html:239`) — n'avaient **que le glyphe `←` / `→` comme contenu**, sans `aria-label` ni
`title`. Un lecteur d'écran les annonçait « flèche gauche » / « bouton » sans dire ce qu'ils font.

C'était **incohérent avec la convention déjà établie dans le même fichier** :
- `backToTop` (`index.html:221`) : `aria-label="Revenir en haut"` + `title` pour son `↑` ;
- le stepper de cible de poids (`index.html:158`) : `aria-label="Diminuer la cible…"` pour son `−` ;
- les 8 boutons de fermeture `×` des dialogues, déjà gardés par le check smoke `closeButtonsA11y`.

Les flèches de navigation, elles, étaient le trou restant dans cette convention.

## Le geste (accessibilité, zéro changement visuel)

- **`index.html`** : ajout de `aria-label` **+** `title` (même double convention que `backToTop`) sur
  les 4 boutons : « Mois précédent » / « Mois suivant » / « Semaine précédente » / « Semaine
  suivante ». Rien ne change à l'écran (le glyphe reste seul) ; le `title` ajoute juste une
  info-bulle au survol souris, l'`aria-label` donne le nom accessible.
- **`renderer-smoke.cjs`** : nouveau check **bloquant** `navArrowsA11y` — les 4 ids doivent exister
  et porter un `aria-label` non vide (même forme que `closeButtonsA11y`), poussé dans `errors` sinon.
  Verrouille la convention contre une future régression.

## Vérification

`xvfb-run -a npm run verify` : **422 tests + smoke** verts, dont `navArrowsA11y":true` et `whatsNew`
toujours vert en 2.0.29.

## Contexte

**Bump 2.0.28 → 2.0.29** : effet utilisateur réel (annonce lecteur d'écran + info-bulle), donc entrée
CHANGELOG (♿) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`). Backlog autonome
**§4.3 (accessibilité)** — **variation de type** assumée après trois boucles de couverture de tests
(#385/#386/#387). Aucune Release, zéro dépendance, aucune donnée perso, aucune feature retirée.
Boucle #388.
