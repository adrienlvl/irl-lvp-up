# 393 — Robustesse `normalizeAgendaItem` : date/heure d'un événement enfin validées (2.0.33)

## Le manque (robustesse §4.2, normalizer)

`normalizeAgendaItem` (`logic.js:668`) était le **mouton noir** des normalizers de l'app : il
acceptait n'importe quelle chaîne pour `date` et `time` sans jamais valider le format, contrairement
à ses fonctions sœurs qui, elles, le font depuis longtemps :

- `normalizeTodo` (l.117) : `date` validée par `/^\d{4}-\d{2}-\d{2}$/` ;
- `normalizeRecurring` (l.434) : `time` validée par `/^([01]\d|2[0-3]):[0-5]\d$/`.

```js
// avant (logic.js:674-675)
date: typeof x.date === 'string' ? x.date : '',
time: typeof x.time === 'string' ? x.time : '',
```

Conséquence prouvée : une date **format-valide mais impossible** (`2026-13-99`, mois 13 / jour 99)
ou une heure incohérente (`99:99`) ressortait telle quelle. Le chemin réel : un fichier calendrier
`.ics` abîmé dont un `DTSTART` a des valeurs hors bornes. `parseIcsDateTime` (l.812, dont la regex ne
vérifie que le nombre de chiffres) produit alors `date:"2026-13-99"`, et `applyImportedIcs`
(`app.js:854`) enregistre le résultat via `mergePlannedEvents(...).map(normalizeAgendaItem)` — le
normalizer laissait donc passer la date impossible, qui se retrouvait **stockée dans l'agenda mais
orpheline de toute vue** (aucune case `YYYY-MM-DD` ne correspond à `2026-13-99`). Détail supplémentaire
côté `parseIcsDateTime` : pour cet événement l'objet renvoyé a un champ `date` (`2026-13-99`) qui
contredit son propre `ms` (`Date.UTC` fait déborder l'overflow sur avril 2027).

## Le geste (robustesse, cohérence avec l'existant)

`src/lib/logic.js` — `normalizeAgendaItem` valide désormais les deux champs comme ses sœurs, et
**borne** la date (mois 1-12, jour 1-31) dans l'esprit de `jobDateFromText` (durcissement #386) :

```js
const dm = typeof x.date === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(x.date) : null;
const dateOk = dm && +dm[2] >= 1 && +dm[2] <= 12 && +dm[3] >= 1 && +dm[3] <= 31;
...
date: dateOk ? x.date : '',
time: typeof x.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.time) ? x.time : '',
```

Une date/heure invalide est neutralisée (`''`) au lieu d'être persistée. C'est aussi une **défense
en profondeur** contre le bug amont de `parseIcsDateTime` : même si une date impossible en sort, elle
ne pollue plus l'agenda stocké.

**Aucune saisie normale n'est affectée** : toutes les sources légitimes produisent déjà le bon format
— champs `<input type="date">` / `<input type="time">`, constantes `'18:00'`/`'07:30'`, `dateKey(...)`,
`sessionTimesForSlot`, et `parseIcsDateTime` pour les valeurs bien formées (vérifié par balayage des
appelants dans `app.js` et `logic.js`). L'heure vide (événement « journée » / non horodaté) reste
valide.

## Tests

+1 bloc dans `logic.test.js` (428 → 429) à côté des tests `normalizeAgendaItem` existants : date hors
bornes (`2026-13-99`) et non-date (`pas une date`) → `''` ; heure hors bornes (`99:99`) et non-HH:MM
(`9h30`) → `''` ; valeurs valides (`2026-07-06` / `07:05`) intactes ; heure vide (all-day) conservée.

## Vérification

`xvfb-run -a npm run verify` : **429 tests + smoke** verts (`whatsNew` vert en 2.0.33).

## Contexte

**Bump 2.0.32 → 2.0.33** : effet utilisateur réel (un import/sauvegarde de calendrier abîmé ne plante
plus de date impossible dans l'agenda), donc entrée CHANGELOG (🗓️) + 2 assertions `CHANGELOG[0].v`
(logic.test.js + smoke `whatsNew`). Pas de changement de rendu (logique pure, aucune nouvelle carte)
→ pas de nouveau check smoke, comme #390. Backlog autonome **§4.2 (robustesse des normalizers)** —
**variation de type** après une passe logique (#392), un bugfix (#391), une robustesse de parseur
(#390), une couverture (#389) et une accessibilité (#388). Aucune Release, zéro dépendance, aucune
donnée perso, aucune feature retirée. Boucle #393.
