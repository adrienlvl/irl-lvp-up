# #381 — Correctif parseur ICS : déséchappement `\\n` (2.0.25)

## Le manque (bug pur prouvé)

`unescapeIcs` (inverse de `icsEscape`, utilisé à l'import d'un `.ics` sur SUMMARY/DESCRIPTION)
n'était couvert par **aucun test** et enchaînait quatre `.replace()` séquentiels :

```js
String(v).replace(/\n/gi, '\n').replace(/\,/g, ',').replace(/\;/g, ';').replace(/\\/g, '\\')
```

Motif classique de **bug d'ordre**. Sur `\\n` (backslash échappé + lettre `n` littérale, ex. un
chemin de fichier `C:\ndocs` encodé `C:\\ndocs`), le premier `.replace` transformait le
sous-motif `\n` (2ᵉ backslash + n) en **retour à la ligne parasite** au lieu de restituer les
deux caractères backslash+`n`. Prouvé avant correction :

- entrée `\\n` → **actuel** `"\<newline>"` ❌ · **attendu** `"\n"` (backslash + n) ✅

Tous les autres cas (`\n`, `\,`, `\;`, `\\`, `\N`) étaient déjà corrects et le restent.

## Le correctif (minimal)

Passe **unique, atomique, gauche→droite** : un backslash consomme le caractère qui suit, plus
aucun sous-motif n'est réanalysé.

```js
String(v || '').replace(/\\([\\nN,;])/g, (m, c) => (c === 'n' || c === 'N') ? '\n' : c)
```

Comportement strictement identique sur tous les cas déjà bons, corrigé sur `\\n` / `\\,`.
`unescapeIcs` est désormais **exporté** (`module.exports`) pour être testable unitairement.

## Tests

**407 tests** (404 + 3) : `unescapeIcs` cas nominaux (`\n`/`\N`/`\,`/`\;`/`\\`, vide, null),
le cas régressif `\\n` → backslash+n (aucun saut de ligne, longueur 2), et un test bout-en-bout
`parseIcs` avec un SUMMARY `C:\\ndocs` → titre `C:\ndocs` sans retour à la ligne parasite.
Smoke inchangé (correctif de logique pure, aucun changement de rendu).

## Contexte

Build **2.0.25**. Backlog autonome §4.1-4.2 (robustesse parseur, bug pur prouvé par un test →
corrigé a minima). Aucune Release, zéro dépendance, aucune donnée perso, aucune feature retirée.
