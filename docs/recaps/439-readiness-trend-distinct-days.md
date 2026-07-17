# 439 — Tendance de forme : agréger des JOURS distincts, pas des saisies (2.0.72)

**Boucle #439 · build 2.0.72 · domaine Athlète / Récupération · correctness + robustesse (§4.4/§4.2)**

## Le manque (vérifié avant de coder)

`readinessTrend` (`logic.js:6280`) alimente le mini-graphe « Forme · N derniers check-ins » +
flèche de tendance dans l'onglet Athlète → Récupération (`app.js:320`, `#readinessTrend`). La
fonction filtrait/triait/`slice(-lim)` la liste `recovery` **sans dédupliquer par date**, alors
que TOUTES ses sœurs le font (`weeklySleepStats`, `sleepSeries`, `sleepRegularity`,
`bedtimeRegularity`, `sleepDebtHours` — cette dernière via un `byDate`). C'était la seule
asymétrique — piste #2 de la mémoire `backlog-leads-distinct-days-legacy`, même famille que
#436/#437/#438.

L'écriture est pourtant déjà dédupliquée : `saveRecovery` (`app.js:686`) fait
`state.recovery = state.recovery.filter(r=>r.date!==localDate())` **avant** `push`. Un doublon de
date ne peut donc venir que d'un **import / restauration de sauvegarde / données legacy** — exactement
la porte des bugs précédents.

**Conséquence** : sur une date en double, ce jour comptait DEUX points dans la courbe. La fenêtre
`slice(-lim)` glissait alors sur des **saisies** au lieu de **jours** (elle pouvait masquer un vrai
jour antérieur), et `delta`/`direction`/`latest` — calculés entre le premier et le dernier point —
étaient faussés (deux points « même jour » aux extrémités).

## Le correctif

Dédup par date via `Map` (dernier gagné) **avant** tri/`slice`, cohérent avec l'écriture
(`saveRecovery` garde le dernier check-in du jour) et avec les sœurs. Rétro-compatible : sans
doublon, résultat identique.

```js
const byDate = new Map();
(Array.isArray(recoveryList) ? recoveryList : []).forEach(r => {
  if (r && /^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) byDate.set(r.date, r);
});
const pts = [...byDate.values()].sort(...).slice(-lim).map(...);
```

## Tests

- **logic.test.js** : +2 blocs dans le test `readinessTrend` — date en double → un seul point/jour
  (dernier gagné, `delta === 0` au lieu de `100 - 40`), et fenêtre `lim=2` avec doublons → compte
  bien 2 JOURS distincts (`['2026-07-02','2026-07-03']`).
- **renderer-smoke.cjs** : check `readinessTrend` étendu (cas doublon : `points.length === 2`,
  `delta === 0`, `latest === 100`) **et promu bloquant** (`if (!checks.readinessTrend) errors.push(...)`).

`cd src && xvfb-run -a npm run verify` → **442 tests + smoke 100 % vert**.

## Suite

Reste 2 pistes vérifiées dans la mémoire `backlog-leads-distinct-days-legacy` : `personalRecords`
et `progressionSuggestion` (garde legacy `w.exercise` manquante, famille #425).
