# #308 — Minuteur de focus : piloté par l'horloge (1.9.242)

**Rotation 25 · item #1 · thème « données détruites » (5ᵉ succès)**

## Le manque — DEUX bugs, pas un
Soupçon confirmé par grep, et un second défaut découvert en lisant le code de près.

```js
let remaining = 25*60, focusDuration=25, interval;
...
interval = setInterval(() => { remaining--; paintTimer(); if (remaining<=0) {...} }, 1000)
```

**Bug 1 — rien n'est persisté** (grep : 0 occurrence). Recharger l'app pendant un
bloc de 25 min perdait le bloc **et son XP**. Même famille que #307.

**Bug 2 — le décompte suit le NOMBRE DE TICKS, pas l'horloge.** Or les navigateurs
**brident `setInterval` quand l'onglet passe en arrière-plan** (souvent 1 tick/minute,
parfois zéro). Conséquence pour Adrien qui révise 25 min sur son téléphone : **poser
le téléphone ou basculer vers une autre app faisait ralentir — voire figer — le
minuteur.** Le bloc ne se terminait jamais. C'est le bug le plus vicieux, parce
qu'il est invisible : rien n'a l'air cassé, le compteur avance juste… trop lentement.

## Amélioration
Le minuteur ne compte plus les ticks : il mémorise un **horodatage de fin absolu** et
recalcule le restant depuis l'horloge. Le rendu peut alors se rafraîchir à n'importe
quelle cadence — ou pas du tout — sans jamais dériver.

### Modèle
`state.focusTimer` (objet) : `defaults` + normalisation explicite (objet-ou-`null`).

### Logique pure
- `focusTimerStart(durationMin, nowMs, task)` → `{ durationMin, startedAt, endsAt, task, paused }`,
  durée bornée 1–180 min.
- `focusTimerState(saved, nowMs)` → `{ remainingSec, elapsedSec, durationMin, done, paused, task }`.
  Le restant vient de `endsAt - now`, jamais négatif. `done` est vrai **même si le bloc
  s'est terminé pendant que l'app était fermée**.
- `focusTimerPause` / `focusTimerResume` — la pause **fige** le restant (le temps réel
  qui passe ne l'entame plus) ; la reprise repositionne `endsAt` depuis le restant figé.
  Les deux sont idempotentes.

### Câblage
- Rendu et bouton pilotés par `focusTimerState` ; tick d'affichage à 1 s **mais qui ne
  fait que rafraîchir** (il ne « fabrique » plus le temps).
- `restoreFocusTimer()` au démarrage : reprend un bloc en cours, ou le termine s'il est
  arrivé à terme pendant l'absence.
- `visibilitychange` : au retour d'arrière-plan, on recalcule et on clôt le bloc s'il
  est fini.
- **Correction d'un bug induit** : le sélecteur de durée (`.focus-presets`) écrivait
  encore dans `remaining` (variable supprimée) **et écrasait silencieusement un bloc en
  cours**. Il refuse désormais de changer la durée pendant un bloc, avec un message.

## Tests
- `logic.test.js` : **le restant se calcule depuis l'horloge** (10 min réelles → 15 min
  restantes, sans qu'aucun tick n'ait eu lieu) ; bloc terminé même app fermée ; restant
  jamais négatif ; **la pause ne consomme pas de temps** ; un minuteur en pause n'est
  jamais `done` ; reprise correcte ; idempotence ; bornes ; entrées invalides.
- `renderer-smoke.cjs` : check `focusTimerClock`.
- `npm run verify` : **334 tests + SMOKE OK**.

## Vérif navigateur — le scénario réel
1. Lancer un bloc de 25 min → affiché `25:00`, persisté.
2. Simuler **10 min de temps réel** en reculant les horodatages, **sans qu'aucun tick
   n'ait lieu** (exactement ce que fait un onglet en arrière-plan).
3. **Rechargement complet de la page.**
4. → Le minuteur affiche **`14:41`**. L'ancien aurait affiché **`25:00`**.
   *(Les ~19 s d'écart avec 15:00 sont le temps réel écoulé entre les deux appels —
   ce qui prouve encore mieux le point : l'horloge a continué pendant le rechargement.)*
5. Pause → figée à `14:40` (`pausedSec = 880`) ; **5 min de temps réel passées en pause
   ne l'entament pas**. ✔

## Fichiers
- `src/lib/logic.js` — `focusTimerStart/State/Pause/Resume` + exports + CHANGELOG[0] 1.9.242.
- `src/app.js` — `focusTimer` (defaults + normalizeState), minuteur réécrit
  (`focusRemainingSec`, `paintTimer`, `startFocusTick`, `syncTimerButton`,
  `finishFocusBlock`, `restoreFocusTimer`, `visibilitychange`), correction du sélecteur
  de durée.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.
