# #386 — Couverture de `icsEscape` + invariant d'aller-retour (export calendrier)

## Le manque (couverture §4.1, chemin d'export `.ics`)

`icsEscape(text)` — l'échappement des valeurs TEXT iCalendar utilisé par `buildIcs` pour produire
le fichier `.ics` (export d'agenda vers Google Agenda / Apple Calendrier) — était la dernière
fonction pure **substantielle sans aucun test direct** de ce chemin. C'est le **complément
d'export** de l'import déjà couvert : `unescapeIcs` (#381) et `parseIcsDateTime` (#385) verrouillent
la lecture ; rien ne verrouillait l'écriture.

La fonction porte une vraie propriété de correction, **ordre-dépendante** :

```js
String(text || '').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n')
```

Le backslash doit être échappé **en premier** — sinon les backslashes ajoutés par l'échappement
de `,`/`;`/saut de ligne seraient re-échappés (double échappement, titre corrompu). Aucun test ne
gardait cet ordre : un futur refactor (réordonner les `replace`, passer à une map) casserait
l'export sans que rien ne rougisse. `SUMMARY` était testé *dans* `buildIcs` (ligne 137), mais
`icsEscape` seul, ses bornes et l'ordre, non.

## Le geste (couverture, zéro changement de comportement)

`icsEscape` est déjà exportée — **aucun changement runtime**, seulement des tests
(`logic.test.js`, 416 → **419**, +3 blocs) :

1. **Chaque spécial isolé** : `\`→`\\`, `;`→`\;`, `,`→`\,`, saut de ligne → `\n`, CRLF → un seul
   `\n` ; le deux-points (`12:30`) reste intact (pas d'échappement en TEXT) ; vide/`null`/`undefined`
   → `''`.
2. **Ordre backslash-d'abord** : entrée `\,` (backslash + virgule) → exactement 4 caractères
   `\\\,` (backslash échappé + virgule échappée), pas 5 — preuve directe qu'aucun double
   échappement n'a lieu.
3. **Invariant d'aller-retour** `unescapeIcs(icsEscape(x)) === x` sur des chaînes piégeuses : les
   4 spéciaux d'un coup, un **backslash littéral suivi d'un « n »** (`Chemin C:\next` — le scénario
   exact du bug #381, prouvé fidèle de bout en bout), un mélange dense, un backslash seul, une
   chaîne sans spécial. C'est le **contrat du workflow réel d'Adrien** : exporter l'agenda en
   `.ics` puis le ré-importer préserve les titres exactement.

## Vérification

`xvfb-run -a npm run verify` : **419 tests + smoke** verts (416 → 419). Smoke **inchangé** (aucune
modification du renderer).

## Contexte

**Pas de bump de version** : tests seuls, sans effet utilisateur (§6 de VPS-AUTOPILOT). Build reste
**2.0.28**. Backlog autonome §4.1 (couverture d'une fonction pure non testée, cas limites réels :
ordre des échappements, aller-retour, bornes). Complète le couple import/export ICS entamé aux
boucles #381/#385, tout en variant l'axe (écriture vs lecture). Aucune Release, zéro dépendance,
aucune donnée perso, aucune feature retirée. Boucle #386.
