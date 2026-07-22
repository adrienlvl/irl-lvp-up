# #676 — `weekProgramSchedule` : garde durcie contre les dates impossibles (robustesse, pas de bump)

## Contexte / rotation
Priorité nuit = coaching en QUALITÉ (§3), mais **bloquée par la rotation §4 bis**. Les 5 derniers
recaps donnent (grep tolérant à l'italique) : `coach, docs, docs, coach, robustesse`
(#675→#671) → `coach` interdit (2 derniers + 2×/5), `docs` interdit (2 derniers + 2×/5).
**`robustesse` redevenu libre** (1× en #671, hors des 2 derniers). Quota de propositions §4 bis.4
**non déclenché** (#674 = proposition « scan frigo » dans les 10 derniers).

Piste **nommée** en mémoire (`robustesse-dates-impossibles-siblings-668`) : « garde générique =
chercher les `/^\d{4}-\d{2}-\d{2}$/` non gardés restants ».

## Le défaut (PROUVÉ avant de coder)
La famille #668/#671 a durci tous les sites où une date de **record stocké** (corruptible via un
backup abîmé) atteint `dateKey(mondayOf(new Date(clé + 'T12:00:00')))` : une date **format-valide
mais impossible** (« 2026-13-40 ») fabrique une `Invalid Date` → `dateKey().toISOString()` jette une
`RangeError` qui casse le rendu de la carte.

Balayage complet des `dateKey(mondayOf(new Date(<chaîne>+'T…')))` : tous sont désormais gardés par
`isRealDateKey` **sauf un** — `weekProgramSchedule` (`logic.js:2698`), resté sur la regex **faible**
`/^\d{4}-\d{2}-\d{2}$/`. Reproduction :

```
weekProgramSchedule([{weekday:1}], '2026-13-40', 2)  →  RangeError: Invalid time value
```

(`2026-02-30` ne jetait pas — V8 le fait rouler à mars — mais `isRealDateKey` le rejette aussi, ce
qui est le bon comportement : une date que l'utilisateur n'a jamais vécue ne doit pas produire de
créneaux.)

**Atteignabilité honnête** : `weekProgramSchedule` n'est appelé qu'avec `localDate()` (l'aujourd'hui
réel) — donc le crash n'est **pas** atteignable par une donnée utilisateur aujourd'hui, contrairement
à #668/#671 qui portaient sur des dates de records. C'est un **durcissement défensif** qui ferme le
**dernier maillon** de la famille et rend l'invariant uniforme sur tous les sites du motif — pas la
correction d'un crash vécu. D'où : **aucun effet utilisateur → pas de bump** (§6).

## Le correctif
`logic.js:2700` : `/^\d{4}-\d{2}-\d{2}$/.test(...)` → `isRealDateKey(...)`, avec un commentaire qui
renvoie à la famille #668/#671. Zéro autre branche touchée : une entrée valide se comporte à
l'identique (test `2026-07-23`/`2026-07-20` inchangés).

## Tests
`logic.test.js` (bloc `weekProgramSchedule`) : deux assertions ajoutées —
`weekProgramSchedule(days, '2026-13-40', 2) → []` (échoue-avant : RangeError) et
`'2026-02-30' → []`. Les cas nominaux et `'nope' → []` restent verts.

## Vérification
`cd src && xvfb-run -a npm run verify` → **580 tests + SMOKE OK**, 100 % vert. Pas de bump
(`package.json`/`CHANGELOG`/assertions `whatsNew` inchangés).

Domaine : robustesse
