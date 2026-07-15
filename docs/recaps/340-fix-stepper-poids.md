# #340 — Fix : décimale rognée + flèches natives du stepper poids (1.9.274)

## Bug signalé par Adrien

> « Dans coach poids, le poids cible n'est pas visible après la décimale, l'écran est sûrement trop
> petit, les flèches de défilement sont flingué. Faut vraiment améliorer ça sur toutes les fenêtres. »

Deux problèmes réels sur le sélecteur de cible (`.weight-stepper`) :

1. **Décimale rognée.** `athlete.css` : `.ws-field input { width: 3.2ch }`. `3.2ch` ne tient que ~3
   caractères → une cible comme « 88,5 » (voire « 100,5 ») était coupée après la virgule.
2. **Flèches natives moches.** Le champ « Ton poids aujourd'hui » (`#coachWeightToday`) et les autres
   `input[type=number]` de l'app gardaient les spinners haut/bas du navigateur — inutiles puisqu'on
   saisit au clavier ou via les boutons +/−.

## Correctifs

- **Largeur du champ cible** : `3.2ch → 6ch`, police `2rem → 1.9rem`, `appearance: textfield` ajouté.
  Media query `≤360px` : police réduite (1.6rem) et boutons 42px pour que « 100,5 kg » tienne en
  entier même sur les plus petits écrans.
- **Flèches natives retirées globalement** (`style.css`) : `input[type=number]` sur TOUTE l'app perd
  ses spinners webkit + `appearance: textfield` (Firefox/standard). « Sur toutes les fenêtres. »

## Vérification navigateur (mesuré, plusieurs largeurs)

| Largeur | « 100,5 » tient sans rognage | « 88,5 » |
|---|---|---|
| 1000 px | ✅ | ✅ |
| 375 px | ✅ | ✅ |
| 320 px | ✅ | ✅ |

`getComputedStyle(#coachTarget).appearance === 'textfield'` (spinner retiré) — idem pour
`#coachWeightToday`. Largeur finale du champ : ~109px (6ch @ 1.9rem).

## Tests

360 tests + nouveau smoke **bloquant** `weightStepperFit` : affiche l'onglet Poids, met « 100.5 »
dans le champ, vérifie `scrollWidth ≤ clientWidth` (aucun rognage) ET `appearance === 'textfield'`.

## Rotation

#340 — début rotation 33 (build 1.9.274). Correctif demandé par Adrien.
