# 412 — Accessibilité : deux menus déroulants de filtre annoncent enfin leur rôle (2.0.51)

## Le manque (§4.3 accessibilité — trou réel prouvé)

Un audit des `<select>` de `src/index.html` (croisé avec les checks a11y existants du smoke) a
montré que **deux** menus déroulants interactifs n'avaient **aucun nom accessible** — ni `<label>`
enveloppant, ni `aria-label`, ni `title` :

- `#exerciseFamily` (l. 164, page Athlète — filtre « famille » de la bibliothèque d'exercices).
  Incohérence flagrante : ses **deux voisins immédiats** dans la même barre de contrôles,
  `#exerciseEquipment` et `#exerciseGoal`, portaient déjà chacun un `title`
  (« Filtrer par matériel disponible », « Cibler une zone du corps ») — seul `exerciseFamily`
  n'avait rien.
- `#suppKind` (l. 176, panneau Compléments — sélecteur « Autour de ta séance »). Il vit dans un
  `<div class="supp-timing-head">` à côté d'un `<b>⏱️ Autour de ta séance</b>` : ce `<b>` est un
  intitulé **visuel** mais n'est **pas** associé programmatiquement au `select` (pas un `<label>`,
  pas de `for`, pas d'`aria-label`).

Tous les autres `<select>` de la page sont, eux, enveloppés dans un `<label>Texte<select>…</select></label>`
(`morningEnergy`, `coachSex`, `historyType`, `planType`, `profileGoal`, `suppHeat`…) — donc déjà
nommés. Impact réel : un lecteur d'écran (VoiceOver iOS — la PWA tourne sur l'iPhone d'Adrien,
NVDA/JAWS desktop) annonce ces deux contrôles comme une simple « liste déroulante » **sans dire à
quoi ils servent**, alors que leurs voisins sont correctement annoncés.

## Le geste (rendu + garde-fou smoke, minimal et additif)

`src/index.html` — un `aria-label` explicite sur chacun, aligné sur le libellé visuel de proximité :

```html
<select id="exerciseFamily" aria-label="Filtrer la bibliothèque par famille d’exercices">…
<select id="suppKind" aria-label="Type de séance pour le timing des compléments">…
```

`src/test/renderer-smoke.cjs` — nouveau check **bloquant** `filterSelectsA11y` (poussé dans
`errors` s'il échoue), dans la famille des checks a11y existants
(`closeButtonsA11y`, `navArrowsA11y`, `restSoundA11y`) :

```js
filterSelectsA11y: ['exerciseFamily', 'suppKind'].every(id => {
  const el = document.getElementById(id);
  return !!el && el.tagName === 'SELECT'
    && !!(el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
}),
```

Il accepte `aria-label` **ou** `title` (les deux fournissent un nom accessible) — pour rester
cohérent avec le patron des voisins et ne pas casser si quelqu'un préfère un `title` plus tard.

## Portée & sûreté

- Purement additif : deux attributs `aria-label`, un check smoke, un libellé CHANGELOG. **Aucun
  changement visuel**, aucune logique modifiée, aucune fonctionnalité retirée.
- Aucun `;` dans un data-URI CSS ; apostrophe typographique `’` conforme au reste du fichier.
- Variété (§4) : rupture nette avec la famille « robustesse de parseur de date/statut » du module
  Alternance (#409→#411) et « arrondi/IMC » (#400→#408) — ici **type = accessibilité (§4.3)**,
  **domaine = pages Athlète & Compléments**, avec check smoke bloquant.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **432 tests + smoke 100 % verts** (`filterSelectsA11y:true`,
`SMOKE OK`). Bump **2.0.50 → 2.0.51** : effet utilisateur réel (deux contrôles désormais nommés pour
les lecteurs d'écran) → entrée CHANGELOG (♿) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke
`whatsNew`). Aucune Release, zéro dépendance, aucune donnée perso. Boucle #412.
