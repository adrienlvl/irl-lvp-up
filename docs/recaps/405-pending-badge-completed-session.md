# 405 — Badge PWA : une séance de sport terminée n'est plus comptée « en attente » (2.0.45)

## Le manque (bug pur prouvé — §4.1/§4.2)

`pendingBadgeCount` (`src/lib/logic.js:2833`) calcule le nombre d'actions **en attente**
aujourd'hui pour la pastille de l'icône PWA (`navigator.setAppBadge`). Son intention documentée
(commentaire ligne 2831) : « quêtes non cochées + séances de sport ». La moitié « quêtes »
excluait bien les items faits (`!q.done`), mais la moitié « sport » comptait **toute** séance de
sport du jour, terminée ou non :

```js
// avant
const sessions = Array.isArray(s.agenda)
  ? s.agenda.filter(a => a && a.date === today && a.kind === 'sport').length
  : 0;
```

Or `completed` est un champ **réel et normalisé** sur chaque item d'agenda
(`normalizeAgendaItem`, `logic.js:696` → `completed: Boolean(x.completed)`) et une séance déjà
faite n'est pas « en attente ». La preuve de l'intention est chez la sœur **`sportToday`**
(`logic.js:96`) qui, elle, filtre correctement : `a.kind === 'sport' && a.date === today &&
!a.completed`. `pendingBadgeCount` était le seul des deux à oublier `!a.completed`.

Cas concret prouvable :

```js
pendingBadgeCount(
  { quests: [], agenda: [{ date: '2026-07-13', kind: 'sport', completed: true }] },
  '2026-07-13'
)
// avant → 1  (la pastille affiche « 1 action en attente »)
// attendu → 0 (la seule séance du jour est déjà faite → rien en attente)
```

Impact réel utilisateur : `updateAppBadge` (`app.js:580`) appelle
`pendingBadgeCount(state, localDate())` et pose `navigator.setAppBadge(n)`. Après avoir **terminé**
sa séance planifiée du jour, l'utilisateur voyait la pastille de l'icône de l'app rester allumée
comme s'il restait une action — jusqu'au lendemain seulement. Le badge cessait de refléter ce qu'il
reste vraiment à faire.

## Le geste (ne compter que les séances non faites)

`src/lib/logic.js` — même filtre `!a.completed` que `sportToday` :

```js
const sessions = Array.isArray(s.agenda)
  ? s.agenda.filter(a => a && a.date === today && a.kind === 'sport' && !a.completed).length
  : 0;
```

Commentaire de la fonction précisé (« séances de sport du jour NON faites… même filtre
`!a.completed` que sportToday »). Aucune autre branche ne change : une séance sans `completed`
reste comptée (les items normaux le sont ou non selon leur état réel).

## Test

`src/test/logic.test.js` — bloc `pendingBadgeCount` existant : +1 cas `doneState` (une séance
`completed: true` ignorée, une `completed: false` comptée, + 1 quête → total 2), **prouvé fautif
avant** le correctif (donnait 3, la séance terminée comptée). Les assertions existantes (séances
sans champ `completed` → toujours comptées) restent vertes. Ajout dans un `test()` existant →
compteur inchangé à **431 tests** (+ smoke).

## Pourquoi pas de nouveau check smoke

Correctif de **logique pure** ; `app.js` (rendu) n'est pas touché — `updateAppBadge` passait déjà
`state` correctement. Le contrat est verrouillé au niveau des tests unitaires (comme #401 / #402 /
#403). Le check smoke `appBadge` existant reste vert.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **431 tests + smoke 100 % verts** (`whatsNew` vert en
2.0.45, `appBadge` vert, `SMOKE OK`). **Bump 2.0.44 → 2.0.45** : effet utilisateur réel (la pastille
de l'icône PWA cesse de mentir après une séance faite) → entrée CHANGELOG (🔔) + 2 assertions
`CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`). Backlog autonome **§4.1/§4.2 (bug pur prouvé)** —
variation de domaine (badge PWA / notifications) après une série santé / sommeil / progression /
course. Aucune Release, zéro dépendance, aucune donnée perso, aucune feature retirée. Boucle #405.
