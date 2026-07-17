# 430 — Calendrier : la re-sync d'un abonnement ne réinitialise plus les récurrents (2.0.63)

## Le manque (bug prouvé — §4.2 robustesse / idempotence des fusions, domaine Calendrier/ICS)

Le réimport idempotent d'un `.ics` est promis par `parseIcs` (`logic.js:875` : « refId 'ics-<uid>' pour un
réimport idempotent »). Pour les événements **ponctuels**, la promesse est tenue par `mergePlannedEvents`
(`logic.js:1132`), qui réinjecte `id: old.id` et `completed: old.completed` depuis l'événement existant de
même `refId`. Mais pour les événements **récurrents**, `applyImportedIcs` (`app.js:854`) **contournait** ce
mécanisme :

```js
recEvents.forEach(ev => {
  state.recurring = state.recurring.filter(r => !(r.refId && r.refId === ev.refId)); // supprime l'ancien
  state.recurring.push(normalizeRecurring({ id: ev.id, title: ev.title, ..., rule: ev.recurrence, refId: ev.refId }));
});                                                                                   // pousse un objet NEUF
```

L'ancien récurrent était **détruit puis reconstruit à neuf** : `normalizeRecurring` redéfaut alors
`doneLog`/`skipLog` à `[]` et `paused` à `false` (`logic.js:471-473`), et l'`id` devient celui du nouvel
import. Or c'est le chemin emprunté à **chaque re-sync d'abonnement** (`syncCalendarSubs`, `app.js:860`,
rappelé au démarrage et sur clic « Sync »).

Preuve (raisonnée sur le vrai code, figée en test) : un abonnement contenant un `VEVENT` hebdo →
`state.recurring = [{ refId:'ics-standup-42', doneLog:[], skipLog:[], paused:false, id:N1 }]`. L'utilisateur
coche l'occurrence du 6 juillet (`doneLog:['2026-07-06']`), en saute une, met en pause. Re-sync du **même**
abonnement → `{ doneLog:[], skipLog:[], paused:false, id:N2≠N1 }` : la case cochée repasse à « à faire »
(`todayItems` lit `r.doneLog.includes(date)`), la pause saute, l'id change (casse toute référence).

`grep` : aucun test ne couvrait le cycle import → coche → ré-import d'un récurrent ; l'idempotence n'était
testée (`logic.test.js:306`, `:2923`) que pour les ponctuels via `mergePlannedEvents`. Bug repéré via un
audit ciblé (agent) du domaine Calendrier/ICS.

## Le geste (une fonction pure sœur de `mergePlannedEvents`, le renderer l'emprunte)

Nouvelle `mergeRecurring(existing, imported)` (`logic.js`, juste après `mergePlannedEvents`) : un récurrent
existant de même `refId` est **remplacé en PRÉSERVANT `id`, `doneLog`, `skipLog`, `paused`** ; seuls le
titre, l'heure, le type, la priorité et la **règle** (le calendrier source fait foi) sont rafraîchis. Le
reste de la liste (récurrents créés à la main, sans `refId` correspondant, ou d'autres abonnements) est
intact. Records renvoyés normalisés, entrées non-tableau tolérées (comme `mergePlannedEvents`).

`app.js` remplace le `forEach` destructeur par un unique appel :
```js
if (recEvents.length) state.recurring = mergeRecurring(state.recurring,
  recEvents.map(ev => ({ id: ev.id, title: ev.title, time: ev.allDay ? '' : ev.time, kind, priority: 'normal', rule: ev.recurrence, refId: ev.refId })));
```

## Tests & vérif

- Bloc pur `mergeRecurring` (`logic.test.js`) : re-sync → `doneLog`/`skipLog`/`paused`/`id` préservés,
  titre + heure rafraîchis, pas de doublon ; autres récurrents (manuel sans `refId`, autre abonnement)
  intacts ; entrées `null`/non-tableau tolérées.
- **Check smoke `icsRecurringMerge`** (`renderer-smoke.cjs`, bloquant) : dans le vrai renderer Electron,
  cocher + sauter + mettre en pause un récurrent puis re-merger le même `refId` conserve `id`, `doneLog`,
  `skipLog`, `paused` et rafraîchit `title`/`time`. Ligne `errors.push` associée.
- `cd src && xvfb-run -a npm run verify` → **439 tests + smoke 100 % verts** (`icsRecurringMerge:true`,
  `whatsNew` en 2.0.63, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.62 → 2.0.63** : effet utilisateur réel (historique de complétion et pause préservés à la
  re-sync) → entrée CHANGELOG (🔁) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
- Une fonction pure ajoutée + un appel remplacé dans le renderer. Aucune fonctionnalité retirée, aucun
  chemin ponctuel touché. Aucune Release, zéro dépendance, aucune donnée perso.

## Variété (§4)

Rupture avec la longue série de correctness pures (Alternance #429, achievements #428, habitudes #427,
nutrition #426, force #425) : **robustesse / idempotence des fusions (§4.2)** dans le domaine
**Calendrier / ICS**, jamais travaillé dans les dernières boucles. Boucle #430.

## Note pour une prochaine itération

L'audit sommeil (agent) a repéré une asymétrie prouvable dans `sleepDebtHours` (`logic.js:6270`, affectation
`byDate[r.date]` **inconditionnelle** vs `if (v > 0)` dans ses fonctions sœurs `weeklySleepStats`/
`sleepSeries`/`sleepRegularity`) : deux check-ins récup sur la **même date passée** (l'un `sleep>0` le matin,
l'autre `sleep:0` le soir « coucher seul ») → la nuit réelle est écrasée et disparaît de la dette. Non
déclenchable depuis une install fraîche (le handler `app.js:686` déduplique la date du jour), mais réel sur
données legacy/import. Candidat pour une boucle future.
