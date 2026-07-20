# #582 — Coach : le renfort nutrition ne radote plus un geste déjà noté aujourd'hui (build 2.0.201)

**Domaine : coach** · build 2.0.201 · curation, aucune note ajoutée.

## Rotation (§4 bis.3)

5 derniers domaines (par n° de recap, avant cette boucle) = `docs · a11y · coach · docs · fondations`
(#577 · #578 · #579 · #580 · #581).
- **2 derniers** (#580 `docs`, #581 `fondations`) → interdits ; `docs` aussi 2× (#577, #580).
- `coach` (priorité de nuit #1, en QUALITÉ §3) : **1×** (#579) et **absent des 2 derniers** →
  **autorisé**. Priorité de nuit (coaching à fond) et rotation **convergent**.

Quota §4 bis.4 non déclenché (#581 proposition dans les 10 derniers).

## La piste (vérifiée #580, mise en réserve rotation-bloquée)

Le fuzzer P5.2 du #580 avait sorti une **piste coach vérifiée** (mémoire
`coach-leads-contradictions-2guards`) : en ton `reinforce`, l'action générique **« Encore un jour actif
aujourd'hui pour ancrer l'habitude. »** (`logic.js:5255`) **radote** sur un pilier où le geste est
**déjà posé** ce jour, car le crédit `doneToday` n'est calculé que pour **sport/focus**
(`logic.js:6222-6226`, exclusion volontaire v2.0.100 : sommeil/nutrition ont une action **prospective**).

## Correction de la piste (§4 bis.5) : nutrition SEULE, pas « nutrition ET sommeil »

La piste annonçait le radotage sur **nutrition ET sommeil**. Vérification en **rendu chargé** (§4 ter,
`adaptiveCoachFocus` réel, `today = 2026-07-20`) :

- **Nutrition** en renfort avec entrée du jour → action bien **« Encore un jour actif aujourd'hui… »**
  alors que la nutrition est loggée ce jour → **radotage RÉEL reproduit**.
- **Sommeil** : dès qu'il est choisi en renfort il a **≥ 1 nuit active**, donc `sleepIns =
  sleepCoachInsight(...)` est **truthy** → le bloc sommeil (`logic.js:5717`) remplace **toujours**
  l'action générique par le **conseil de coucher du soir** (`Vise un coucher…`, l.5764-5766), qui est
  **prospectif** (ce qui reste à venir), **pas** un radotage. Testé à 1 et 2 nuits : action = bedtime,
  jamais générique. **Le sommeil ne conserve donc jamais l'action générique** → l'inclure serait du
  **code mort**. Fix scopé à **nutrition uniquement**.

## Le fix (curation, aucune note ajoutée)

Un pendant du crédit `doneToday`, placé juste **après** lui (`logic.js:7241`), sous **triple garde** :

```js
if (tone === 'reinforce' && chosen.pillar === 'nutrition'
    && action === 'Encore un jour actif aujourd’hui pour ancrer l’habitude.'
    && (Array.isArray(chosen.list) ? chosen.list : []).some(e => e && e.date === todayKey && chosen.active(e))) {
  action = 'Déjà noté aujourd’hui ✅ — l’habitude est ancrée, savoure : rien d’autre à cocher côté nutrition.';
}
```

- **`action === <exact générique>`** est la garde clé : si un bloc nutrition a **déjà** remplacé
  l'action par un conseil ciblé (cible protéines l.5865-5866, qui est déjà un crédit propre quand la
  cible est tenue), on **ne touche rien** — le plus spécifique gagne. On ne crédite que le trou résiduel.
- **Rétrospectif assumé** : « un jour actif » = une entrée active. Contrairement à l'action pilier
  prospective des tons rebuild/revive (« renseigne tes protéines »), le générique de renfort décrit un
  état **déjà acquis** si une entrée du jour existe → le créditer est juste, pas prospectif.

## §4 ter — rendu cumulé relu

- **Avec entrée du jour** : insight « 4 jours actifs cette semaine, en hausse. Garde le rythme. » +
  action « Déjà noté aujourd'hui ✅ — l'habitude est ancrée, savoure : rien d'autre à cocher côté
  nutrition. » → cohérent, **plus de « fais-le » déjà exécuté**, non redondant avec l'insight.
- **Non-régression** : nutrition en renfort **sans** rien saisi aujourd'hui → action générique
  **« Encore un jour actif aujourd'hui… » conservée** (l'invitation reste légitime).
- Sommeil inchangé (conseil de coucher prospectif).

## Vérif

+1 test logique (3 volets : crédit avec entrée du jour · générique conservé sans entrée · sommeil jamais
crédité). **533 tests + smoke verts**, `xvfb-run -a npm run verify` 100 %.

## Suite (mémoire)

La piste `coach-leads-contradictions-2guards` garde une piste OUVERTE non traitée : `sportSlot`
(`logic.js:6809`)/`sportZoneFocus` gardés par `loadSpike == null` mais **pas** `readinessSlide == null`
→ appendent « cale ta séance là »/« cible X » à une action « Séance allégée » (readinessSlide) —
contradiction action↔action plus douce, à confirmer en rendu chargé avant de coder. Prochaine boucle
`coach`-ouverte.

Domaine : coach
