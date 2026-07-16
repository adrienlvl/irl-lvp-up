# 395 — Recherche d'agenda insensible aux accents (2.0.35)

## Le manque (robustesse / polish UX honnête §4.2 + §4.4)

`agendaMatch` (`logic.js:6468`) filtre un événement d'agenda selon la barre de recherche libre
(titre / lieu / notes), câblée à `renderWeekPage` et `renderDayView` (`app.js:466`, `468`, `836`)
via `agendaMatch(it, agendaSearchText)`. Elle repliait seulement la **casse** (`.toLowerCase()`),
**pas les accents** :

```js
// avant
const q = String(query || '').trim().toLowerCase();
const hay = [item.title, item.location, item.notes].map(x => String(x || '').toLowerCase()).join(' ');
return hay.includes(q);
```

Conséquence dans une app **française** : taper « kine » (réflexe courant — on tape vite, sans
accent) **ne trouvait pas** « RDV Kiné » ; « reunion » ratait « Réunion », « chateau » ratait
« Château ». Manque réel, vérifiable, et surtout **incohérent avec le reste de l'app** : le repli
d'accents `toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')` est déjà l'idiome établi, utilisé
6 fois ailleurs dans `logic.js` (lignes 249, 276, 313, 937, 1936, 4807 — recherches d'exercices,
de routines, etc.). Seule la recherche d'agenda y échappait.

## Le geste (réutilise l'idiome existant, une fonction pure inchangée par ailleurs)

`src/lib/logic.js` — `agendaMatch` normalise désormais requête **et** foin avec le même repli
d'accents que partout ailleurs :

```js
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const q = norm(query).trim();
if (!q) return true;
if (!item) return false;
const hay = [item.title, item.location, item.notes].map(norm).join(' ');
return hay.includes(q);
```

Comme les deux côtés sont repliés, une recherche **avec** accent continue de fonctionner à
l'identique (« kiné » trouve toujours « Kiné ») ; on ne fait qu'**élargir** ce qui matche, jamais
rétrécir. Aucune autre branche ne change (requête vide → `true`, item nul → `false`).

## Tests

- `logic.test.js` : le bloc `agendaMatch` existant est renommé (« … et aux accents ») et gagne
  4 assertions — requête sans accent qui trouve un titre accentué (`'kine'` → « RDV Kiné »),
  plusieurs accents (`'reunion equipe'` → « Réunion équipe »), accent + casse dans les notes
  (`'CHATEAU'` → « Château »), et une requête plus longue que le foin qui reste `false`
  (`'kinésithérapie'`). Les 3 premières échouaient avant le correctif (bug prouvé).
- `renderer-smoke.cjs` : le check **bloquant** `agendaSearch` (ligne 411), qui ne vérifiait que
  l'existence de la fonction + du DOM, exécute maintenant `agendaMatch` sur des cas accentués
  (`'kine'` → true, `'reunion'` → true, `'dentiste'` → false) — le nouveau comportement est
  verrouillé côté renderer aussi, puisque `agendaMatch` sert au rendu de la recherche.

Total tests inchangé (429, ce sont des assertions ajoutées à un `test(...)` existant).

## Vérification

`xvfb-run -a npm run verify` : **429 tests + smoke** verts (`agendaSearch` vert, `whatsNew` vert
en 2.0.35, `SMOKE OK`).

## Contexte

**Bump 2.0.34 → 2.0.35** : effet utilisateur réel (la recherche d'agenda retrouve les événements
tapés sans accent), donc entrée CHANGELOG (🔎) + 2 assertions `CHANGELOG[0].v` (logic.test.js +
smoke `whatsNew`). Check smoke renforcé car `agendaMatch` participe au rendu de la recherche.
Backlog autonome **§4.2/§4.4** — **variation de type** après un polish de pluriels (#394), une
robustesse de normalizer (#393) et une passe logique sommeil (#392). Aucune Release, zéro
dépendance, aucune donnée perso, aucune feature retirée. Boucle #395.
