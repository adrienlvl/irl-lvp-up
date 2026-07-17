# 398 — Robustesse : to-do et récurrence bornent enfin leur date (2.0.38)

## Le manque (robustesse §4.2 — complète le durcissement #393)

La boucle #393 avait borné la date de `normalizeAgendaItem` (mois 1-12, jour 1-31) pour qu'une date
**format-valide mais impossible** (`2026-13-99`, issue d'un `.ics` abîmé ou d'un backup édité à la
main) ne soit pas stockée dans une case introuvable. Son recap, comme son test (`logic.test.js:105`),
affirmaient faire ça « **comme normalizeTodo/normalizeRecurring** » — sauf que c'était **faux** : ces
deux sœurs ne validaient que le **format** (regex `\d{4}-\d{2}-\d{2}`), **pas les bornes**. Preuve
avant correctif :

```js
normalizeTodo({ text: 'x', date: '2026-13-99' }).date              // → '2026-13-99'  (accepté !)
normalizeTodo({ done: true, doneAt: '2026-13-99' }).doneAt         // → '2026-13-99'
normalizeRecurring({ rule: { freq: 'weekly', startDate: '2026-13-99' } }).rule.startDate  // → '2026-13-99'
```

Impact réel (même modèle de menace que #382/#393 : un backup abîmé, plus ancien ou modifié à la main,
passé à `normalizeState`) :

- **To-do** : `todosForDay` compare `t.date <= today` en **lexicographique**. `'2026-13-99'` est
  supérieur à tout jour réel → la tâche n'est **jamais active** ; et `t.date === today` est faux → elle
  n'apparaît pas non plus en « faite du jour ». La tâche devient **invisible partout** (orpheline),
  exactement le bug que #393 a corrigé pour l'agenda.
- **Récurrence** : pire encore. `recurrenceMatches` fait `new Date(+2026, +13-1, +99)` →
  `new Date(2026, 12, 99)` qui **déborde silencieusement** vers un jour réel **faux** (janvier de
  l'année suivante décalé de 99 jours). Le bloc récurrent se met alors à matcher de **mauvaises
  occurrences** au lieu d'être neutralisé.

## Le geste (un helper partagé, l'idiome inline de #393 dédupliqué)

`src/lib/logic.js` — extraction de l'idiome de bornage (jusqu'ici inline dans `normalizeAgendaItem`)
en une fonction pure réutilisable, `isBoundedDateKey`, placée près des autres helpers de date :

```js
function isBoundedDateKey(s) {
  const m = typeof s === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
  return !!(m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31);
}
```

Appliquée aux **trois** normalizers, ce qui **retire une duplication** (au lieu d'en ajouter) :

- `normalizeAgendaItem` : le bloc `dm`/`dateOk` inline → `isBoundedDateKey(x.date)` (comportement
  strictement identique, prouvé par le test #393 resté vert).
- `normalizeTodo` : `date` **et** `doneAt` bornés.
- `normalizeRecurring` : `rule.startDate` **et** `rule.until` bornés (le petit `isDate` local, qui ne
  faisait que le format, est supprimé).

Bornes larges (mois 1-12 / jour 1-31, comme `jobDateFromText` et `normalizeAgendaItem`) : on rejette
l'impossible (`2026-13-99`) sans jamais toucher une saisie normale — un champ `<input type="date">`
ne produit de toute façon qu'une date réelle. Le test `normalizeAgendaItem` ligne 105, dont le libellé
promettait « comme normalizeTodo/normalizeRecurring », devient enfin **vrai**.

## Tests

- Nouveau bloc `isBoundedDateKey` (9 assertions) : date réelle acceptée, `2024-02-29` accepté (bornes
  larges), `2026-13-99` / mois `00` / jour `00` rejetés, non-string / `null` / `''` → `false`.
- `normalizeTodo` : +3 assertions (`date: '2026-13-99'` → `''`, mois `00` → `''`, `doneAt` impossible
  → `null`) — toutes échouaient avant le correctif (dates acceptées telles quelles).
- `normalizeRecurring` : +3 assertions (`startDate` / `until` impossibles → `''`, `startDate` réel
  conservé) — les deux premières échouaient avant.

Total tests : **429 → 430** (nouveau bloc `isBoundedDateKey`) + assertions ajoutées aux blocs
`normalizeTodo` / `normalizeRecurring` existants.

## Pourquoi pas de check smoke

Comme #390/#393 : durcissement de **logique pure** (des normalizers), la machinerie de rendu (`app.js`)
n'est pas touchée. Le contrat est verrouillé au niveau des tests unitaires.

## Vérification

`xvfb-run -a npm run verify` : **430 tests + smoke** verts (`whatsNew` vert en 2.0.38, `SMOKE OK`).

## Contexte

**Bump 2.0.37 → 2.0.38** : effet utilisateur réel (une tâche ou un bloc récurrent importé depuis une
sauvegarde abîmée n'est plus perdu / ne matche plus de faux jours), donc entrée CHANGELOG (🛡️) +
2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`). Backlog autonome **§4.2 (robustesse
des normalizers)** — variation de type après une boucle a11y (#397). Complète et rend cohérent le
durcissement #393 tout en **réduisant** la duplication (helper partagé). Aucune Release, zéro
dépendance, aucune donnée perso, aucune feature retirée. Boucle #398.
</content>
</invoke>
