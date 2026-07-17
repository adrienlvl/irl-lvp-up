# 431 — Sommeil : la dette ne « perd » plus une vraie nuit sur une date à double saisie (2.0.64)

## Le manque (bug prouvé — §4.2 idempotence des fusions / §4.4 correctness, domaine Sommeil)

Piste laissée en fin de recap #430 (« Note pour une prochaine itération »). `sleepDebtHours`
(`logic.js:6286`) construit son index `byDate` **inconditionnellement** :

```js
byDate[r.date] = Number(r.sleep) || 0;   // logic.js:6292 — écrase quelle que soit la valeur
```

Ses **quatre fonctions sœurs** du même domaine gardent toutes `if (v > 0)` avant d'écrire :
`weeklySleepStats` (`:6307`), `sleepSeries` (`:6326`), `sleepRegularity` (`:6341`),
`bedtimeRegularity` (`:6362`). `sleepDebtHours` était la seule asymétrique.

Conséquence : deux check-ins récup sur la **même date** — l'un le matin avec la nuit chiffrée
(`sleep:7.2`), l'autre le soir « coucher seul » **sans durée** (`sleep:0, bedtime:'23:00'`, ce que
le handler `app.js:686` sait produire : `sleep=Number($('#sleepInput').value)||0`) — et si l'entrée
à `0` vient **après** dans le tableau, elle écrase la vraie nuit. La date tombe ensuite sous le
filtre `s > 0` (`:6295`) et **disparaît** : dette sous-estimée, `nights` amputé, `avg` faussé.

Preuve (exécutée sur le vrai code, figée en test) :

```
sleepDebtHours([{date:'2026-07-06',sleep:6}, {date:'2026-07-06',sleep:0,bedtime:'23:00'}],
               7.5, '2026-07-06', '2026-07-10')
  AVANT → { debt:0, nights:0, avg:0 }   // la nuit de 6 h a disparu (écrasée par sleep:0)
  APRÈS → { debt:1.5, nights:1, avg:6 } // la vraie nuit compte, le coucher-seul est ignoré
```

Non déclenchable sur une install fraîche (le handler déduplique la date du jour avant de pousser),
mais **réel sur données legacy / import / restauration** : `normalizeState` ne déduplique pas
`recovery` par date, et une sauvegarde peut contenir deux entrées de même date.

`grep` : aucun test ne couvrait deux entrées récup de même date — la couverture existante
(`logic.test.js:6036`) n'avait qu'une valeur par jour.

## Le geste (une garde, symétrie avec les sœurs)

```js
const v = Number(r.sleep) || 0;
if (v > 0) byDate[r.date] = v;
```

Un « coucher seul » (`sleep:0`) n'écrase plus une nuit chiffrée de même date. **Rétro-compatible** :
une date dont toutes les entrées valent 0 finissait déjà exclue par le filtre `s > 0` en aval — elle
n'est simplement plus insérée. Deux vraies nuits (>0) de même date : la dernière gagne, avant comme
après (comportement inchangé). Seul le cas « vraie nuit puis 0 » change — exactement le bug.

## Tests & vérif

- Bloc pur `sleepDebtHours` étendu (`test/logic.test.js`) : même date `sleep:6` + `sleep:0` →
  `nights 1, debt 1.5, avg 6` ; puis **ordre inverse** (0 d'abord) → même résultat (indépendant de
  l'ordre du tableau).
- **Check smoke `sleepDebt` étendu** (`renderer-smoke.cjs`, bloquant) : dans le vrai renderer
  Electron, le cas double-saisie renvoie `nights 1 / debt 1.5`. Ligne `errors.push` conservée.
- `cd src && xvfb-run -a npm run verify` → **439 tests + smoke 100 % verts** (`sleepDebt:true`,
  `whatsNew` en 2.0.64, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.63 → 2.0.64** : effet utilisateur réel (dette/moyenne/nuits justes sur données à double
  saisie) → entrée CHANGELOG (😴) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
- Une seule fonction pure, une garde de deux lignes. Aucune feature retirée. Aucune Release, zéro
  dépendance, aucune donnée perso.

## Variété (§4)

Reste dans le registre robustesse/correctness des dernières boucles mais **domaine Sommeil** (jamais
touché depuis la demande #391-392), et referme explicitement la piste ouverte par #430. Boucle #431.
