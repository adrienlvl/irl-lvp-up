# #322 — Digest « À rattraper » : navigation corrigée + défilement (1.9.256)

## Relecture de mon propre travail (#321)

Le digest « À rattraper » livré au #321 rendait chaque ligne cliquable vers un onglet. En relisant,
j'ai vérifié où vivent réellement les panneaux ciblés — et trouvé un **vrai défaut** :

- Les items **« révisions en retard »** et **« examen imminent »** renvoyaient vers `page:'dashboard'`.
  Mais le planificateur de révisions et la liste des révisions en retard vivent dans la **page
  calendrier** (overlay `#calendarPage`), pas sur le tableau de bord. Cliquer n'amenait donc **pas**
  aux révisions.
- Les items **« forme basse »** et **« séance manquée »** renvoyaient vers l'onglet Athlète sans
  forcer le **sous-onglet Séance**, où se trouvent la récupération et les séances manquées — on
  pouvait atterrir sur « Progrès » sans voir la chose.

## Ce qui change

- `attentionDigest` : révisions/examen → `page:'calendar'` (là où ils vivent vraiment).
- Handler de clic enrichi :
  - `'calendar'` → ouvre l'overlay calendrier (même séquence éprouvée que « Aller au calendrier » des
    Réglages : `#openWeekPage` puis `#openCalendarPage`) ;
  - `'athlete'` → bascule aussi sur le **sous-onglet Séance** ;
  - **défilement** jusqu'au panneau concerné après navigation (récup, séances manquées, habitudes) —
    la ligne te dépose *sur* la chose, pas juste sur l'onglet.

## Vérification navigateur (toutes les cibles)

| Clic sur… | Atterrit sur | Résultat |
|---|---|---|
| Forme basse | Athlète · sous-onglet Séance | ✅ page=athlete, sous-onglet=seance |
| Séance manquée | Athlète | ✅ page=athlete |
| Révisions en retard | Page calendrier (overlay) | ✅ ouvre après le délai, révisions « 📕 Droit J+4 » visibles |
| Examen imminent | Page calendrier | ✅ |

Note : un premier test synchrone a affiché « calendrier non ouvert » — parce que l'overlay s'ouvre
via un `setTimeout(60ms)` (le temps que `weekPage` se rende avant de basculer), et je vérifiais trop
tôt. Revérifié avec attente : le calendrier s'ouvre et les révisions en retard y sont visibles.
Artefact de test, pas un bug.

## Tests

349 tests `node:test` (assertions de navigation ajoutées : exam/study → `calendar`, sport →
`athlete`) + smoke `attentionDigest` bloquant.

## Rotation

#322 — rotation 28 (build 1.9.256). Prochain #323 = clôture (tag v1.9.257).
