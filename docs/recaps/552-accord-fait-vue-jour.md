# 552 — « 1/3 fait », pas « 1/3 faits » : accord du participe en vue Jour (2.0.183)

> Rotation respectée : #550 `alternance` → #551 `robustesse` → #552 `agenda`. Tâche **P2.5**.

## Vérification préalable

Piste marquée « à VÉRIFIER » et de valeur faible assumée — **vérifiée, exacte** :

`app.js` (vue Jour) rendait ``${done}/${doable.length} fait${doable.length>1?'s':''} ce jour`` : le
« s » était décidé par le **dénominateur**. Avec 1 bloc validé sur 3, ça donnait « **1/3 faits** »,
alors qu'un seul est fait. La convention correcte est utilisée **juste à côté** (`app.js:555` :
``parfait${qs.perfectDays>1?'s':''}``, accordé au numérateur), et `renderMyDay` l'applique aussi —
la vue Jour était l'exception.

## Correctif

``fait${done>1?'s':''}`` : le participe s'accorde avec le nombre **réalisé**. « 1/3 fait »,
« 2/3 faits ».

## Le piège du harnais, re-rencontré

Le check smoke est tombé sur `Invalid regular expression flags`. Cause : le smoke injecte les checks
via un **template literal** (`executeJavaScript`), donc `\/` dans une regex devient `/` et casse le
littéral. Il faut écrire **`\\/`** et **`\\s`**. C'est exactement le piège **déjà documenté** dans
`VPS-AUTOPILOT.md §6` — la doc a fait son travail, il fallait juste la relire avant d'écrire la regex.

## Vérifs

- **519 tests** + smoke verts. Nouveau check smoke **BLOQUANT** `dayViewPlural` (1 validé sur 3 →
  « 1/3 fait » **et pas** « 1/3 faits » ; 2 sur 3 → « 2/3 faits »), avec restauration de l'agenda.
- **Navigateur** : « 1/3 fait ce jour » puis « 2/3 faits ce jour ».

## Fichiers

- `src/app.js` — accord sur le numérateur en vue Jour.
- `src/lib/logic.js` — CHANGELOG 2.0.183.
- `src/test/renderer-smoke.cjs` — check bloquant `dayViewPlural` + assertion CHANGELOG.

Domaine : agenda
