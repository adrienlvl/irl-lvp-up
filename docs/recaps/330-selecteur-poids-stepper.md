# #330 — Sélecteur de poids cible plus beau (stepper ±0,5 kg) (1.9.264)

## Demande d'Adrien (priorité 2.0 #2)

> « la sélection du poids peut être plus belle au niveau design »

Le champ `#coachTarget` (onglet Poids) était un simple `<input type="number">`.

## Ce qui change (polish/design)

Le champ devient un **stepper** mis en avant :
- **gros affichage** du poids visé (2 rem, gras 800) avec l'unité « kg » à côté, dans un cadre
  arrondi bordé de la couleur d'accent ;
- **boutons ronds − / +** (46 px) qui ajustent la cible par pas de **0,5 kg** (arrondi à 0,5) ;
- si le champ est vide, les boutons partent du **poids actuel** comme base sensée ;
- l'enregistrement direct (au `change`), la synchro et le toast existants sont réutilisés — les
  boutons déclenchent simplement un événement `change`.

Le champ reste tapable au clavier (les flèches font aussi 0,5).

## Le piège corrigé grâce à la vérif navigateur

Première version : la police restait à 16 px. Cause trouvée en inspectant les règles CSS qui
matchent : mon sélecteur visait `.ws-field .ws-input`, mais **l'input n'avait pas la classe
`ws-input`** → seul `button,input,select{font-size:inherit}` s'appliquait. Corrigé en ciblant
`.ws-field input`. Après correction : police confirmée à **32 px, gras 800**. Sans la vérif
navigateur (inspection des règles calculées), le « plus beau » n'aurait pas été appliqué.

## Vérification navigateur

| Contrôle | Résultat |
|---|---|
| Stepper présent (gros chiffre + kg + boutons ronds) | ✅ police 32 px / poids 800 |
| +0,5 ×2 depuis 80 → 81 (champ + state) | ✅ |
| −0,5 depuis 81 → 80,5 | ✅ |
| Champ vidé puis +0,5 → part du poids actuel (75 → 75,5) | ✅ |

## Tests

355 tests `node:test` + smoke `weightStepper` **bloquant** (boutons ±0,5 présents, ajustement
enregistré dans `state.goals.targetWeight`).

## Reste pour la 2.0

Les 3 demandes d'Adrien sur le coach poids sont faites : paliers (#328), onglet dédié (#329),
sélecteur (#330). Suite libre : continuer à polir l'onglet Poids (ordre/contenu) et le reste de
l'app vers la 2.0.

## Rotation

#330 — rotation 30 (build 1.9.264). Prochain #331 = clôture (tag v1.9.265).
