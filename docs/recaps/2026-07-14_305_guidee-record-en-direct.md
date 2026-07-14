# #305 — Séance guidée : record annoncé dès que tu le bats (1.9.239)

**Rotation 24 · item #2 · priorité Adrien : les séances guidées**

## Le manque — plus subtil que prévu, dit honnêtement
Le prompt annonçait que `newRecords` / `personalRecords` n'étaient utilisés qu'à
l'enregistrement. **C'est partiellement faux, et je le corrige** : le grep montre
que `showGuidedRecap()` (app.js:163) appelle déjà `personalRecords` et affiche
« 🏆 X records en vue » sur l'écran de **bilan de fin de séance**.

Le vrai manque est donc plus fin : le record est annoncé **deux fois trop tard** —
au bilan (séance finie) et à l'enregistrement — **jamais au moment où il est battu**,
c'est-à-dire sous la barre, quand ça motive.

## Amélioration
Détection du record **à la validation de la série**, avec toast + retour haptique.

### Logique pure — `liveSetRecord(prior, name, set, sessionSets)`
Trois règles de conception, chacune verrouillée par un test :

1. **Égaler n'est pas battre.** Un `>` strict, pas `>=`.
2. **Pas de fanfare au premier passage.** Sans antécédent sur l'exercice, il n'y a
   rien à battre — annoncer un « record » à la première série de sa vie serait creux.
   Renvoie `null` si `prior[name]` est absent ou vide.
3. **Pas de doublon dans la séance.** `sessionSets` = les autres séries déjà validées
   de cet exercice ; le record n'est annoncé qu'à la série qui **améliore réellement**
   le meilleur atteint jusque-là. Battre 24 → 26 kg annonce une fois ; refaire 26 kg
   à la série suivante n'annonce plus ; passer à 45 kg annonce à nouveau.

Autres garde-fous : une série à **0 rep n'est pas une série** ; sur un exercice au
poids du corps (charge 0), seules les reps comptent.

Renvoie `{ type: 'load' | 'reps', value, previous }` ou `null`.

## Tests
- `logic.test.js` : record de charge, record de reps, poids du corps, **égaler ≠
  battre**, **pas de doublon**, **amélioration supplémentaire dans la même séance**,
  **pas de fanfare au premier passage**, série à 0 rep, entrées invalides.
- `renderer-smoke.cjs` : check `liveRecord`.
- `npm run verify` : **331 tests + SMOKE OK**.

## Vérification navigateur — et un piège évité
Première tentative **trompeuse** : le toast dure 3,8 s, donc en lisant `.app-toast`
juste après la 3ᵉ série, je voyais encore le message de la 2ᵉ. J'aurais conclu à tort
qu'un doublon s'affichait. J'ai vidé le toast entre chaque étape pour rendre le test
concluant :

| série | saisie | attendu | observé |
|---|---|---|---|
| S1 | 24 kg × 10 (égale le record) | rien | **(aucun toast)** ✔ |
| S2 | 26 kg × 8 (bat le record) | annonce | **🎉 Record battu · 26 kg (avant : 24 kg)** ✔ |
| S3 | 26 kg × 8 (déjà battu en S2) | rien | **(aucun toast)** ✔ |

## Fichiers
- `src/lib/logic.js` — `liveSetRecord()` + export + CHANGELOG[0] 1.9.239.
- `src/app.js` — détection dans le handler `data-complete-guided-set` ; toast +
  `haptic('record')` au lieu de `haptic('setDone')` quand c'est un record.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Suite de la rotation 24
Pistes restantes à vérifier : effort/RPE par série ; remplacer un exercice à la volée
si le matériel est pris ; sparkline de progression de l'exercice dans le dialogue guidé.
