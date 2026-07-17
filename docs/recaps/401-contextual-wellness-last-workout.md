# 401 — Coach récupération : la routine contextuelle lit enfin la séance la plus récente (2.0.41)

## Le manque (bug pur prouvé — §4.1/§4.2)

`contextualWellnessRoutine` (`src/lib/logic.js:3224`) propose une routine bien-être **ciblée sur la
récup** selon la dernière séance : course → chevilles, jambes → hanches, haut du corps → épaules,
gainage → bas du dos (sinon repli générique `suggestedRoutine`). Pour trouver « la dernière
séance », elle lisait :

```js
const last = workouts[workouts.length - 1];
```

Or le stockage réel est **newest-first** : `app.js:641` fait `state.workouts.unshift({ ... })` à
chaque séance loggée. `workouts[workouts.length - 1]` désignait donc la **toute première séance
jamais enregistrée**. Conséquence : dès qu'Adrien a plus d'une séance (cas normal), cette première
séance est presque toujours à `> 1 jour` → la garde `days >= 0 && days <= 1` échoue → le conseil
ciblé ne se déclenche **jamais** et on retombe systématiquement sur la mobilité générique.

Repro (course loggée aujourd'hui, plus une vieille séance jambes) :

```js
contextualWellnessRoutine({ workouts: [
  { date:'2026-07-13', type:'run' },                                              // récente (index 0)
  { date:'2026-07-05', type:'strength', exercises:[{ name:'Split squat bulgare' }] } // ancienne
] }, '2026-07-13', 'maintain', 60).key
// avant → 'hips' (repli suggestedRoutine, lit la vieille séance à J-8) ; attendu 'ankles'
```

Impact utilisateur direct : la reco affichée par `renderWellnessSuggest` (`app.js:564`) **et** par
`renderWellnessNudge` (`app.js:568`) — feature de coaching récup **morte** en pratique. Le test
existant ne l'avait pas vu : tous ses cas utilisaient des tableaux à **un seul** élément, où
`workouts[0] === workouts[length-1]`, masquant le bug.

## Le geste (prendre la date la plus récente, indépendamment de l'ordre)

`src/lib/logic.js` — on sélectionne la séance de **date maximale** parmi celles à date valide,
au lieu de se fier à la position dans le tableau :

```js
const dated = workouts.filter(w => w && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date || '')));
const last = dated.reduce((a, b) => (a && String(a.date) >= String(b.date) ? a : b), null);
```

Plus robuste que `workouts[0]` : ça ne dépend plus de l'ordre de stockage (une future source qui
ajouterait en fin de tableau serait aussi correcte) et ça ignore d'emblée les entrées à date
invalide. La garde regex `l = last && /.../.exec(...)` de la ligne suivante reste valable (`last`
peut être `null` → repli propre sur `suggestedRoutine`).

## Tests

`src/test/logic.test.js` — bloc `contextualWellnessRoutine` existant enrichi de **2 assertions** :
un cas multi-séances (le `multi` ci-dessus, **prouvé fautif avant** : `'hips'` au lieu de
`'ankles'`) et un cas à ordre inversé (`multiRev`) qui verrouille la sémantique « date la plus
récente » indépendamment de l'ordre. Les 8 assertions préexistantes (tableaux à 1 élément) restent
vertes. Total : **431 → 431 tests** (assertions ajoutées à un `test(...)` existant).

## Pourquoi pas de check smoke

Correctif de **logique pure** ; `app.js` (rendu) n'est pas touché — les deux appelants passaient
déjà `state` correctement. Contrat verrouillé au niveau des tests unitaires.

## Vérification

`cd src && xvfb-run -a npm run verify` : **431 tests + smoke** verts (`whatsNew` vert en 2.0.41,
`SMOKE OK`).

## Contexte

**Bump 2.0.40 → 2.0.41** : effet utilisateur réel (une reco de coaching récup redevient vivante),
donc entrée CHANGELOG (🧘) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
Backlog autonome **§4.1/§4.2 (bug pur prouvé)** — variation de domaine (récup/bien-être, proche de
la priorité sommeil d'Adrien) après une série robustesse/a11y/polish. Le #400 (IMC, 2.0.40) ayant
été poussé par une session concurrente entre-temps, cette boucle s'insère en 2.0.41. Aucune
Release, zéro dépendance, aucune donnée perso, aucune feature retirée. Boucle #401.
</content>
</invoke>
