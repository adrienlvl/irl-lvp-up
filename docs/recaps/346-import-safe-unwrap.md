# #346 — Fix data-safety : import robuste aux deux formats de sauvegarde (1.9.280)

## Le bug (perte de données réelle)

Deux formats de fichier JSON coexistent :

- **Export manuel** (« Exporter mes données » / `data:export`) → écrit `JSON.stringify(state)` = **état brut**.
- **Sauvegarde automatique desktop** (`backup:save`, + historique quotidien `irl-lvp-up-backups/irl-lvp-up-YYYY-MM-DD.json`) → écrit **`{ version, savedAt, state }`** = **enveloppé**.

L'import manuel faisait `normalizeState(parsed)` **sans déballer**. Résultat : si l'utilisateur
restaurait depuis un fichier d'auto-backup ou d'historique (dont le nom `irl-lvp-up-2026-07-15.json`
ressemble à s'y méprendre à l'export `irl-lvp-up-sauvegarde-2026-07-15.json`), `normalizeState`
recevait le wrapper `{version, savedAt, state}`, n'y trouvait **aucun champ connu**, et renvoyait les
**valeurs par défaut → effacement total des données** (après un simple « Remplacer »).

Seul `#restoreData` (restauration de la copie locale) déballait déjà (`data.state || data`) ; les
**trois** points d'import manuel ne le faisaient pas de façon cohérente.

## Le correctif

Nouvelle fonction pure `unwrapBackup(parsed)` : renvoie `parsed.state` si le fichier est enveloppé
(objet avec un `.state` objet non-tableau), sinon `parsed` tel quel. Appliquée aux **3** points
d'import (restauration locale + import PWA + import desktop) → import robuste aux **deux** formats.

## Vérification navigateur (avant / après, données réelles)

Fichier enveloppé `{version:4, savedAt, state:{xp:4200, streak:37, 2 séances, profil}}` :

| | xp | séances | série | nom |
|---|---|---|---|---|
| **Avant** `normalizeState(wrapped)` | **0** | **0** | — | — |
| **Après** `normalizeState(unwrapBackup(wrapped))` | **4200** | **2** | **37** | **Adrien** |

→ perte totale évitée.

## Tests

365 tests `node:test` (brut → inchangé, enveloppé → `.state`, garde-fous : pas de `.state`,
`.state` null/tableau, null, tableau brut) + smoke `unwrapBackup` **bloquant**.

## Rotation

#346 — rotation 34 (build 1.9.280). Type : robustesse / data-safety. Prochain #347 clôture la
rotation (tag v1.9.281).
