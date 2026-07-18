# 455 — Import Alternance : DOM à 3 chiffres + en-tête « Score /100 » (2.0.85)

**Boucle #455 · build 2.0.85 · domaine Alternance / parsing · robustesse (§4.2) — module sacré, dans le sens « on l'améliore ».**

Pivot assumé après trois boucles d'accord de pluriel (#452→#454) : deux bugs purs **prouvés par
exécution** dans le parseur de cibles Alternance, priorité §4.2 (« parseurs CSV, entrées hostiles »)
au-dessus du polish §4.4.

## Les manques (réels, prouvés par test)

`parseAlternanceTargets` (`logic.js:345`) alimente l'import des cibles depuis Google Sheets / CSV
(onglet 💼, sacré). Deux détections de colonnes étaient trop laxistes / trop strictes :

1. **`deptOf` (l.363)** — `/\((\d{2})\)/` n'extrait qu'**exactement 2 chiffres** entre parenthèses.
   Un département d'outre-mer à 3 chiffres — `Fort-de-France (972)` — ne matche jamais : `deptOf`
   renvoie `''`, donc `geoOk` échoue et **aucun DOM n'est ciblable** via `depts`/`townDepts`. Les
   villes métropolitaines `(35)` passaient, les DOM disparaissaient silencieusement.

2. **`iScore` (l.359)** — `h.includes('score') && h.includes('10')` prend un en-tête
   `Score /100` (ou tout en-tête contenant « 10 », p.ex. une année) pour la colonne `/10`. Les
   valeurs `/100` (85, 42…) sont alors hors `[0,10]` → `scoreOf` renvoie `NaN`, et **avec
   `minScore > 0` toutes les lignes sont écartées** : import silencieusement vide, sans message.

Les deux sont des défauts objectifs du contrat de la fonction (pas des choix de design), et sans
effet sur les données actuelles d'Adrien (en-tête « Score /10 », villes métropolitaines).

## Les correctifs

- `deptOf` : `\d{2}` → `\d{2,3}` — métropole `(35)` **et** outre-mer `(972)` reconnus ; un `(1234)`
  ou une chaîne sans parenthèses ne matchent toujours pas (regex précise, pas de faux positif).
- `iScore` : `h.includes('10')` → `/\b10\b/.test(h)` — « 10 » isolé exigé : `Score /10` matche,
  `Score /100` et `Score 2010` ne matchent plus. Commentaire ajouté sur les deux lignes.

Rétro-compatible : le CSV type « La Bonne Alternance » (« Score /10 », `(56)`/`(35)`/`(22)`) rend
exactement le même résultat qu'avant — le test historique reste vert sans modification.

## Vérif

- +2 tests `parseAlternanceTargets` : DOM `(972)` ciblable + non-régression `(35)` ; en-tête
  `Score /100` ignoré (aucune ligne écartée à tort) + `Score /10` toujours détecté et filtré.
- `cd src && xvfb-run -a npm run verify` : **449 tests + smoke** 100 % vert (`alternance`,
  `altFilter`, `altTarget`, `whatsNew` verts).

## Portée / honnêteté

Le résultat de `parseAlternanceTargets` est **surfacé** (import de cibles). Le comportement change
pour des CSV valides mais non utilisés par Adrien aujourd'hui (un DOM dans la feuille, un en-tête
`/100`) → **bump 2.0.85** + entrée CHANGELOG honnête (rien ne change pour un tableau `/10`
métropolitain classique). Aucune fonctionnalité retirée, aucune surface réseau/sécurité touchée.

## Suite

Filon « robustesse des parseurs Alternance » : `parseCsv` (`logic.js:251`) traite `,`/`;`/tab comme
délimiteurs **simultanés** → un champ non-quoté contenant une virgule dans un fichier `;`-délimité
(export Excel-FR) est mal découpé, ce qui rend aussi mort le `.replace(',', '.')` de `scoreOf`
(scores décimaux `8,5`). C'est un **choix de design** (auto-détection du délimiteur) → à traiter en
**proposition**, pas en autonomie. Voir la note mémoire `backlog-leads-distinct-days-legacy`.
