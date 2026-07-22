# 697 — Scan code-barres frigo : fondation logique (proposition #674, option C) (2.0.296)

## Contexte

Session LOCALE. **Adrien a tranché #674 → option C** (code-barres on-device), et — après que je lui aie signalé
le **trou de la proposition** — a choisi « **logique testée maintenant**, UI caméra ensuite avec lui ».

## Le trou signalé (et la voie honnête retenue)

La proposition #674 C disait « `BarcodeDetector` décode l'EAN → on propose une correspondance CIQUAL ». Mais un
**EAN est opaque** (juste un numéro) : il n'existe **aucune base locale EAN→aliment** (CIQUAL indexe des aliments
génériques, pas des références commerciales), et une base produits en ligne (OpenFoodFacts) **casserait le
« 100 % local »**. Donc « scanne → ça se remplit » n'est pas faisable hors-ligne tel quel.

**Voie honnête, sans réseau ni dépendance : une carte APPRENANTE.** Au 1er scan d'un produit, l'utilisateur
choisit l'aliment CIQUAL **une fois** ; on mémorise `EAN → nom d'aliment` ; les scans suivants le proposent
direct (**toujours à confirmer**, jamais d'ajout aveugle). `BarcodeDetector` natif fera le décodage on-device
côté UI (zéro dépendance), dans une session où Adrien pourra tester la caméra sur son appareil.

## Ce qui est fait ici (logique pure, testée — RIEN de visible)

`lib/logic.js` (+ export) :
- `isValidEan(code)` : valide un EAN-8 / EAN-13 (chiffres + **clé de contrôle** ; poids 3/1 alternés depuis la
  droite). Rejette tout scan parasite. Vérifié contre 3 codes-barres réels valides (EAN-13 ×2, EAN-8).
- `normalizeBarcodeMap(m)` : sanitise la carte stockée (clés = EAN valides, valeurs = nom non vide borné ; cap 500).
- `barcodeLookup(map, ean)` : aliment mémorisé ou `null`.
- `learnBarcode(map, ean, foodName)` : renvoie une **nouvelle** carte (immuable) ; EAN invalide/nom vide →
  carte inchangée ; ré-affectation écrase.

**Non wiré** volontairement : pas encore de `state.barcodeMap` dans normalizeState, pas d'UI — ça viendra avec
le scanner caméra (session supervisée, cam testable). Le mapping value = le **nom d'aliment CIQUAL** (`food.n`),
que l'UI résoudra contre `searchFoods`/`state.pantry` (`{n,cat,kcal,p,c,f}`).

## Non-régression

- Test dédié `#674 option C` (EAN valides/invalides, apprend/retrouve/écrase, immuabilité, normalisation). **590
  tests + SMOKE OK.** Aucune fonctionnalité existante touchée (helpers additifs).

## Reste à faire (session avec Adrien, caméra)

UI scanner : bouton « scanner », flux `BarcodeDetector` (repli manuel hors Chromium / iOS Safari), `state.barcodeMap`
dans normalizeState, flux « proposer l'aliment mémorisé / choisir dans CIQUAL au 1er scan → confirmer → ajouter au
frigo ». À voir/tester en vrai.

Domaine : nutrition
