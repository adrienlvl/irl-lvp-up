# #347 — A11y : `aria-current` sur la navigation active (1.9.281) · clôture rotation 34

## Le manque

`showPage` (barre principale) et `showAthleteTab` (sous-menu Athlète) signalaient l'onglet actif
**uniquement par la classe CSS `.active`** — une information **purement visuelle**. Un lecteur
d'écran (ou une navigation au clavier assistée) ne pouvait pas savoir sur quelle page/section on se
trouve. C'est le rôle standard de `aria-current`.

## Ce qui change

- `showPage` : le bouton `[data-page]` actif reçoit `aria-current="page"` ; il est retiré des autres.
- `showAthleteTab` : le bouton `.athlete-subnav` actif reçoit `aria-current="true"` ; retiré des autres.

Toujours exactement **un** élément marqué courant par niveau de navigation, mis à jour à chaque
changement d'onglet. Aucun impact visuel (la classe `.active` reste le style) — c'est purement une
amélioration d'accessibilité.

## Vérification navigateur (comportement réel)

| Action | `aria-current="page"` |
|---|---|
| showPage('nutrition') | ✅ `nutrition` seul |
| showPage('focus') | ✅ `focus` seul |
| showPage('dashboard') | ✅ `dashboard` seul |
| Sous-onglet Athlète « Progrès » | ✅ progres:`true`, seance:absent |
| Sous-onglet Athlète « Séance » | ✅ seance:`true`, progres:absent |

## Tests

365 tests + smoke `navAriaCurrent` **bloquant** (l'onglet actif porte `aria-current`, pas les autres,
sur les deux niveaux de nav).

## Rotation

#347 — **clôture la rotation 34** (builds 1.9.278 → 1.9.281). Tag `v1.9.281` publié.
