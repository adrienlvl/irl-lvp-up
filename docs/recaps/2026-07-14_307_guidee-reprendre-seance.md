# #307 — Séance guidée : ta séance n'est plus perdue (1.9.241)

**Rotation 24 · item #4 (CLÔTURE) · le pire cas de la série « données détruites »**

## Le manque
`guidedWorkout` est une simple variable de module :

```js
let sessionExercises=[], selectedExercise=null, guidedWorkout=null, guidedIndex=0, ...
```

**Zéro occurrence de persistance** (grep : `state.guidedWorkout` → 0). Et le handler
de fermeture ne faisait que `close()`, sans avertissement ni sauvegarde.

Conséquence : fermer le dialogue (croix, ou **touche Échap par accident** — un
`<dialog>` se ferme sur Échap par défaut) ou recharger l'app **détruisait
instantanément toute la séance en cours** : chaque charge saisie, chaque rep, chaque
série validée.

Sur mobile c'est pire : basculer vers Spotify pendant un repos de 90 s peut suffire à
faire vider la page par le système. **On perd la séance en écoutant de la musique.**

Même thème que #301 (quêtes) et #302 (pas du jour), mais appliqué au travail **du
moment** — donc le pire des trois.

## Amélioration
La séance en cours est persistée en continu, et proposée à la reprise.

### Modèle
`state.guidedSession` (objet, pas tableau) : ajouté aux `defaults` **et** normalisé
explicitement dans `normalizeState` (objet-ou-`null`), à côté de `shoppingChecked`.

### Logique pure
- `guidedSnapshot(workout, index, nowMs)` — instantané à persister. Index **borné** à
  la plage réelle. `null` si la séance est vide/invalide.
- `resumableGuided(saved, nowMs, maxHours)` — une séance est reprenable **sauf si** :
  vide/invalide ; **trop ancienne** (12 h par défaut — au-delà ce n'est plus une
  reprise mais une séance oubliée) ; **aucune série validée** (rien à sauver → on
  n'ennuie pas Adrien avec une proposition vide) ; horodatage absent ou **dans le
  futur** (horloge incohérente → on refuse plutôt que de faire semblant).
  Renvoie `{ session, done, total, ageMin }`.

### Câblage
- Persistance à **chaque rendu du guidé** *et* **à chaque frappe** dans les champs de
  série (`input`) — sinon une charge tapée mais non encore validée serait perdue.
- `pauseGuidedSession()` **idempotente**, appelée au clic sur la croix **et** sur
  l'événement `close` du dialogue (touche Échap). Je ne dépends pas du seul événement
  `close` : il n'est pas fiable partout (constaté dans le navigateur d'automatisation).
- Toast rassurant à la fermeture : « Séance mise en pause — tu pourras la reprendre. »
- Effacement à l'enregistrement définitif de la séance.
- Bannière `#guidedResume` dans le compagnon d'entraînement : **Reprendre** /
  **Abandonner** (abandon = `confirm()` qui **nomme ce qui sera perdu**, cohérent avec
  #304 et #306).

## Tests
- `logic.test.js` : bornage de l'index ; séance vide → `null` ; reprenable après 12 min ;
  **refusée au-delà de 12 h** (et acceptée si la fenêtre est élargie) ; **aucune série
  validée → pas de proposition** ; horodatage absent ; **sauvegarde « dans le futur » →
  refusée** ; entrées invalides.
- `renderer-smoke.cjs` : check `guidedResume`.
- `npm run verify` : **333 tests + SMOKE OK**.

## Vérif navigateur — le scénario catastrophe, en vrai
1. Séance « Bas du corps », 2 séries validées (24 kg × 10, 24 kg × 9) + une 3ᵉ charge
   **tapée mais non validée** (26 kg × 6).
2. **Rechargement complet de la page** (équivalent à une app tuée).
3. Bannière : « 🏋️ Séance interrompue : Bas du corps — 2 séries déjà validées · à
   l'instant ». ✔
4. « Reprendre » → dialogue rouvert au bon exercice, séries restaurées **à
   l'identique** : `24kg×10✓  24kg×9✓  26kg×6·` — **la série non validée survit aussi**. ✔

### Une erreur de mon script de test, dite franchement
Ma première vérification affichait `0kg×8` pour la 2ᵉ série. **Le code était bon, mon
script était faux** : j'avais capturé les lignes du DOM **une seule fois**, alors que
valider une série re-rend tout le bloc — mes références étaient périmées et j'écrivais
dans des éléments détachés. Script corrigé (re-requête à chaque étape), pas le code.

## Fichiers
- `src/lib/logic.js` — `guidedSnapshot()`, `resumableGuided()` + exports + CHANGELOG[0] 1.9.241.
- `src/app.js` — `guidedSession` (defaults + normalizeState), `persistGuidedSession()`,
  `clearGuidedSession()`, `pauseGuidedSession()`, `renderGuidedResume()`, persistance
  sur `input`, câblage dans `render()`.
- `src/index.html` — `#guidedResume` dans le compagnon d'entraînement.
- `src/strength.css` — `.guided-resume`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Clôture rotation 24 — entièrement dédiée aux séances guidées
#304 ajuster le nombre de séries · #305 record annoncé sous la barre ·
#306 remplacer un exercice à la volée · #307 reprendre une séance interrompue.
(+ #303 « la dernière fois », livrée juste avant la rotation.)
→ **tag `v1.9.241` + push (auto-publish)**.
