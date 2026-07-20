# #578 — A11y : noms accessibles sur 6 champs de saisie au placeholder seul (build 2.0.199)

## Rotation §4 bis — contrôle AVANT de coder

5 derniers domaines (mtime, avant cette boucle) = `docs (577) · coach (576) · athlete (575) ·
fondations (574) · coach (573)`.
- `coach` (priorité de nuit #1) : dans les 2 derniers (#576) ET 2× sur 5 → **interdit** (§3 : la
  rotation prime même sur la demande de nuit ; l'arbitrage d'Adrien du 2026-07-19 range le coach comme
  un domaine parmi les autres).
- `docs` : dans le dernier recap (#577) → **interdit**.
- `a11y` : **absent des 5 derniers** → **autorisé**.

La seule tâche **nommée** encore ouverte (P5.2) a son correctif côté `coach` (rotation-bloqué, cf.
#577), et son angle restant (coach ↔ « Ma journée ») donnerait un résultat `docs` (bloqué) puisque
« Ma journée » est **factuel** (blocs, puces J-X, compteurs) — pas de surface de jugement qui
contredirait le coach. → 2ᵉ demande d'Adrien (« prêt pour le public » : l'a11y conditionne App Store
+ Play), en prolongeant la **ligne a11y** déjà servie (#549/#550/#566/#571), domaine `a11y`.

## Quota propositions §4 bis.4

`docs/proposals/` contient une proposition récente (#574, dans les 10 derniers recaps) → quota **non
déclenché**, pas d'obligation de proposition.

## Le manque — vérifié (grep + lecture)

Piste issue de la mémoire `backlog-leads-distinct-days-legacy` (audit a11y #463) : des champs de
saisie hors recherche/tableau de bord n'ont **qu'un `placeholder`** — pas un nom accessible (WCAG
3.3.2 / 4.1.2 : le placeholder disparaît à la saisie et n'est pas exposé de façon fiable aux lecteurs
d'écran). Contrôle : `grep for="<id>"` = **0** pour chacun, aucun `<label>` englobant, aucun
`aria-label`. Six champs confirmés nus :

| Champ | Surface | Ancien | aria-label ajouté |
|---|---|---|---|
| `birthdayName` | 🎂 Anniversaires | placeholder « Prénom (ex. Maman…) » | « Prénom de la personne » |
| `calSubName` | 🔄 Calendriers sync | « Nom (ex. Perso, Boulot) » | « Nom du calendrier » |
| `calSubUrl` | 🔄 Calendriers sync | « https://…/basic.ics » | « Lien iCal du calendrier » |
| `travelHome` | 🧭 Point de départ | « 📍 Mon adresse de départ… » | « Adresse de départ habituelle » |
| `weightInput` | ⚖️ Poids | « Poids en kg » | « Poids du jour en kg » |
| `envieText` | 🍽️ Cuisine du jour | « Envie de… (ex. poulet) » | « Envie du jour » |

Champs voisins déjà corrects (non touchés, pour mémoire) : `birthdayDate` / `calSubKind` /
`travelMode` portent un `title` ; `altSearch` + les 3 champs de recherche (#571) et les 6 du tableau
de bord (#463) portent déjà un `aria-label`.

## §4 ter — cohérence

**Aucun texte visible ajouté** : `aria-label` n'est pas rendu à l'écran (le placeholder reste
identique) → le contrôle « rendu cumulé » est sans objet. Aucune note coach touchée.

## Vérification

- `index.html` : `aria-label` ajouté aux 6 `<input>`, placeholders inchangés.
- Nouveau check smoke **bloquant** `formFieldLabels` (les 6 ids doivent avoir un `aria-label` non
  vide), poussé dans `errors` (piège #566 : un check défini mais jamais poussé est décoratif). Calqué
  sur `searchFieldLabels` / `dashboardInputLabels`.
- `xvfb-run -a npm run verify` : **532 tests + smoke verts**, `formFieldLabels:true`.

## Versionnage

a11y bumpe (précédents #549/#550/#566/#571) : 2.0.198 → **2.0.199**. Entrée CHANGELOG ♿, 2 assertions
`CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).

## Suite

Restent (mémoire #463, prochaines boucles a11y hors rotation) : formulaire Alternance
(`altCompany`/`altRole`/`altSource`/`altSheetUrl` — module sacré, prudence), et vérifier les champs
récurrence/révision (`recTitle`/`studyTitle` ont un `<label>` englobant → OK). P5.2 reste ouvert
(fix coach rotation-bloqué + angle « Ma journée » factuel).

Domaine : a11y
