# #382 — Import alternance : date de candidature bornée (2.0.26)

## Le manque (robustesse, chemin sync sacré)

`jobDateFromText` — extrait la date d'une cellule à l'import de candidatures (CSV manuel **et** sync
Google Sheets, via `parseApplicationsCsv`) — n'était couverte par **aucun test** et **ne validait
pas** les bornes. Elle recrachait n'importe quelle date syntaxiquement plausible :

- `13/45/2026` → `2026-45-13` ❌ (jour 13, mois 45)
- `2026-25-99` → `2026-25-99` ❌ (mois 25, jour 99)

Une cellule aberrante (faute de frappe, colonne mal mappée) stockait donc une **date fantôme** sur
la candidature, qui fausse ensuite le tri du suivi et l'affichage. Le module Alternance est sacré
(priorité de vie d'Adrien) : on le durcit sans rien changer aux cas nominaux.

## Le correctif (minimal, borné)

Bornes **mois 1-12 / jour 1-31** (même style que `timeToMinutes` : `h>23 || min>59` → null) via un
petit `pad(y, mo, d)` qui renvoie la date ISO zéro-paddée si valide, `''` sinon. Bonus : si le motif
ISO trouvé est hors bornes, on **retombe sur le motif JJ/MM/AAAA** (une vraie date peut suivre du
bruit) — `ref 2026-13-01 puis 05/03/2026` → `2026-03-05`.

Tous les cas déjà valides sont **strictement inchangés** (l'ISO était déjà `\d{2}-\d{2}`, le FR déjà
`padStart` — le re-pad donne un résultat identique). Seul l'aberrant bascule de garbage → `''`.

## Tests (+3, 406 → 409)

- `jobDateFromText` : cas nominaux (ISO, JJ/MM/AAAA, `1/2/2026` paddé, date noyée dans du texte,
  datetime), vide/null, **hors bornes ignorés** (`13/45/2026`, `2026-25-99`, `00/00/2026` → `''`),
  fallback ISO→FR.
- `parseCsv` (foundation de la sync, jusque-là non testée directement) : guillemets doublés,
  virgule interne, séparateurs mixtes (`;`/`\t`), saut de ligne littéral entre guillemets, CRLF,
  champ vide final conservé, `\n` final sans ligne fantôme, vide/null.

Smoke inchangé (logique pure). `verify` : **409 tests + smoke** verts.

## Contexte

Build **2.0.26**. Backlog autonome §4.1-4.2 (couverture de fonctions pures peu testées + robustesse
des parseurs, chemin d'import). Aucune Release, zéro dépendance, aucune donnée perso, aucune feature
retirée.
