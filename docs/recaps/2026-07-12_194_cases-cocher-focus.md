# Boucle #194 (autonome, phase 2) — Cases à cocher vertes + focus visibles · build 1.9.128

**Phase 2 (design).** Suite du polish (selects, scrollbars) : les cases à cocher gardaient l'accent bleu système par endroits, et la navigation clavier n'avait pas d'indicateur de focus net.

## Livré

- **Cases à cocher & radios** : `accent-color` vert (accent de l'app) **partout**, curseur pointer — cohérence visuelle avec le thème.
- **Focus visibles** (accessibilité clavier) : anneau vert doux (`box-shadow`) sur les champs texte/nombre/zone de texte au focus clavier, et contour vert net sur les boutons. Utilise `:focus-visible` → n'apparaît qu'au clavier, pas au clic souris (pas de halo intempestif).

## Détail technique

- **`style.css`** : `input[type=checkbox]/[type=radio]{accent-color:var(--accent)}`, `input:focus-visible,textarea:focus-visible{…anneau vert}`, `button/.primary-button/.secondary-button/.icon-button:focus-visible{outline vert}`.
- **Smoke** : `inputPolish` vérifie `accent-color` calculé sur une checkbox **ou** la présence d'une règle `:focus-visible`.

## Vérifs

- `npm run verify` → **229 tests / 229 pass**, **garde-fou CSS vert**, **SMOKE OK** (`inputPolish:true`).
- `npm run dist` → **Setup 1.9.128.exe** (app d'Adrien jamais fermée).

## Suite (phase 2)

Design : cohérence des cartes/boutons, dialogues, puis autres zones (guidé, agenda, mobile).
