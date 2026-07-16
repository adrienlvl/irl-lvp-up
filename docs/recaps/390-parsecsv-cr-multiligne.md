# #390 — Robustesse `parseCsv` : plus de `\r` parasite dans une cellule multi-ligne (2.0.30)

## Le manque (robustesse §4.2, chemin import CSV)

`parseCsv` (`logic.js:227`) traitait le retour chariot `\r` de façon **incohérente** selon le
contexte :

- **hors guillemets**, un `\r` isolé est ignoré (`else if (c !== '\r') cell += c`) — correct, le CRLF
  de fin de ligne ne laisse rien traîner ;
- **à l'intérieur d'un champ entre guillemets**, tout caractère était ajouté tel quel, `\r` compris.

Conséquence prouvée (probe Node) : une **cellule sur plusieurs lignes** dont le saut interne est
encodé en **CRLF** — le cas RFC 4180, produit par Excel et par un copier-coller de tableur, que le
chemin d'import manuel `parseApplicationsCsv` accepte — ressortait avec un **retour chariot parasite**
dans la valeur :

```
parseCsv('"ligne1\r\nligne2",x')  →  [['ligne1\r\nligne2', 'x']]   (avant)
```

Ce `\r` invisible se retrouvait stocké dans la note d'une candidature (`notes`, chemin sacré
alternance). Même famille que le durcissement d'import #386 (2.0.26, dates aberrantes) : on nettoie
la donnée importée sans jamais rien casser.

## Le geste (robustesse, un seul caractère)

**`logic.js`** — dans la branche « entre guillemets », le `\r` isolé est désormais ignoré **comme
hors guillemets** (cohérence des deux contextes) :

```js
} else if (c !== '\r') cell += c; }   // au lieu de : else cell += c; }
```

Le vrai saut de ligne interne (`\n`) reste préservé — seul le caractère invisible en trop disparaît.
Ne peut **que retirer des `\r`** : aucune entrée bien formée (séparateurs `\n`) n'est affectée.

**`test/logic.test.js`** — 1 bloc (+1, **424 → 425**), à côté du test `parseCsv` existant :
cellule CRLF multi-ligne → `\n` seul conservé ; `\r` isolé sans `\n` retiré aussi ; invariant
« aucune cellule produite ne contient de `\r` » ; et non-régression du CRLF hors guillemets
(séparation de lignes inchangée, pas de ligne fantôme).

## Vérification

`xvfb-run -a npm run verify` : **425 tests + smoke** verts (`whatsNew` vert en 2.0.30).

## Contexte

**Bump 2.0.29 → 2.0.30** : effet utilisateur réel (donnée importée plus propre), donc entrée
CHANGELOG (💼) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`). Backlog autonome
**§4.2 (robustesse des parseurs)** — **variation de type** après trois boucles de couverture (#385→387,
#389) et une d'accessibilité (#388). Aucune Release, zéro dépendance, aucune donnée perso, aucune
feature retirée. Boucle #390.
