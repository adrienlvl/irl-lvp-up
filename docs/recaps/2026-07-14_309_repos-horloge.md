# #309 — Repos entre séries : piloté par l'horloge (1.9.243)

**Rotation 25 · item #2 · thème « dérive temporelle » (suite directe de #308)**

## Le manque — le même bug que #308, au pire endroit possible
Soupçon émis à la fin de #308, confirmé par grep :

```js
guidedRestInterval = setInterval(() => { guidedRestSeconds--; ... }, 1000)
```

Exactement le même défaut : le décompte suivait le **nombre de ticks**, pas l'horloge.
Or les navigateurs **brident `setInterval` en arrière-plan**.

Et c'est ici que ça fait le plus mal : **le repos entre deux séries est précisément le
moment où l'on pose son téléphone ou où l'écran s'éteint.** Résultat : le décompte
ralentissait, et le signal de fin de repos (son + vibration) arrivait **en retard, ou
jamais**. Adrien restait à attendre un bip qui ne venait pas.

Un mot d'honnêteté : la séance guidée demande un **wake lock** (l'écran reste allumé),
ce qui atténue le problème. Mais le wake lock peut échouer (non supporté, refusé), et
surtout il ne protège pas du cas le plus courant : **basculer vers une autre app** —
la musique, un message — pendant les 90 secondes de repos.

## Amélioration
Même correction que #308 : **échéance absolue**, restant recalculé depuis l'horloge.

### Séparation propre
`guidedRestSeconds` faisait double emploi : durée **configurée** (que les presets et
les boutons ± modifient) **et** compteur décrémenté. J'ai séparé :
- `guidedRestSeconds` — la durée configurée (sémantique inchangée) ;
- `guidedRest = { total, endsAt }` — le repos **en cours**, à échéance absolue.

### Logique pure
- `restStart(seconds, nowMs)` → `{ total, endsAt }`, durée bornée 1–600 s.
- `restState(rest, nowMs)` → `{ remainingSec, total, done, pct }` ou `null`.
  Le restant vient de `endsAt - now`, jamais négatif. `done` est vrai **même si le
  repos s'est écoulé pendant que l'écran était éteint**. `pct` réutilise `restBarPct`,
  donc la barre de progression reste cohérente.

### Câblage
- Le tick d'affichage (1 s) **ne fabrique plus le temps**, il ne fait que rafraîchir.
- `visibilitychange` : au retour d'arrière-plan, un repos écoulé est **clôturé
  immédiatement** (son + vibration), au lieu de reprendre un décompte en retard.
- **Le repos est persisté dans `state.guidedSession`** (cohérent avec #307) : une
  interruption en plein repos ne le perd plus. À la reprise, s'il s'est écoulé
  entre-temps, il est simplement terminé — c'est le comportement juste.
- `adjustGuidedRest` / `setGuidedRest` repositionnent l'échéance si un repos tourne.

## Tests
- `logic.test.js` : **30 s réelles → 60 s restantes sans qu'aucun tick n'ait eu lieu** ;
  repos terminé même écran éteint ; restant jamais négatif ; `pct` cohérent avec
  `restBarPct` ; bornes 1–600 s ; entrées invalides.
- `renderer-smoke.cjs` : check `restClock`.
- `npm run verify` : **335 tests + SMOKE OK**.

## Vérif navigateur — le scénario réel
1. Valider une série → repos de 75 s lancé (`1:15`), **persisté dans la séance**.
2. Simuler **30 s d'écran éteint** en reculant l'échéance, **sans qu'aucun tick n'ait
   lieu**.
3. **Rechargement complet**, puis « Reprendre ».
4. → Le repos affiche **`0:29`** et **tourne toujours**, barre à 39 %.
   L'ancien aurait affiché `1:15`, figé.

*(J'attendais ~0:45 : les ~16 s d'écart sont le temps réel écoulé entre mes deux
commandes — ce qui confirme une fois de plus que l'horloge continue, même page fermée.)*

## Fichiers
- `src/lib/logic.js` — `restStart()`, `restState()` + exports + CHANGELOG[0] 1.9.243.
- `src/app.js` — `guidedRest` séparé de `guidedRestSeconds` ; `startGuidedRest`,
  `tickGuidedRest`, `endGuidedRest`, `paintGuidedRest` réécrits ; persistance du repos
  dans le snapshot ; restauration à la reprise ; `visibilitychange`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.
