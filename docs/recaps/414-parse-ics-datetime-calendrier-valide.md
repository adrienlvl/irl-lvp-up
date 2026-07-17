# 414 — Import .ics : une date/heure calendairement impossible n'est plus importée (2.0.53)

## Le manque (bug pur prouvé — §4.2 robustesse de parseur)

`parseIcsDateTime` (`src/lib/logic.js:838`) lit une date/heure iCalendar compacte
(`YYYYMMDD` ou `YYYYMMDDThhmmss[Z]`) à l'import de calendrier (`.ics` : export/abonnement Google
Agenda ou Apple Calendrier, via `parseIcs` → `applyImportedIcs`). Son motif capte chaque champ en
`\d{2}`, ce qui **tolère mois/jour hors bornes** (`13`, `99`) et jours qui débordent leur mois
(30 février, 31 novembre). Seule la branche `Z` (UTC → local) passait par `new Date(Date.UTC(...))`,
qui **roulait silencieusement** une date impossible vers un autre jour ; les branches « journée
entière » (l. 843) et « heure flottante » (l. 848) renvoyaient `${Y}-${Mo}-${D}` **tel quel**, sans
aucune validation.

Le recap #393 (`normalizeAgendaItem`) avait ajouté une **défense en profondeur** en aval contre
exactement « `2026-13-99` venue d'un .ics abîmé via parseIcsDateTime » — mais le **bug amont**
restait : le parseur produisait la date invalide, il était seulement neutralisé plus loin. Cette
boucle corrige la source.

Cas concrets prouvés (exécutés sur le code réel avant correctif) :

```js
parseIcsDateTime('20261399')          // avant → { date:'2026-13-99', … }   (mois 13, jour 99)
parseIcsDateTime('20260230')          // avant → { date:'2026-02-30', … }   (30 févr. n'existe pas)
parseIcsDateTime('20261131')          // avant → { date:'2026-11-31', … }   (nov. a 30 jours)
parseIcsDateTime('20250229')          // avant → { date:'2025-02-29', … }   (2025 non bissextile)
parseIcsDateTime('20260101T256099')   // avant → { time:'25:60', … }        (heure hors bornes)
parseIcsDateTime('20260230T120000Z')  // avant → { date:'2026-03-02', … }   (rollover silencieux !)
// attendu partout → null
```

## Impact utilisateur visible

Un événement à date impossible était **stocké** dans l'agenda (`parseIcs` l. 1041) avec une date
introuvable (« 2026-13-99 »), donc **orpheline de toute vue** (`todayItems`/`weekItems` ne la
retrouvent jamais), ou pire **glissée vers un jour faux** (branche `Z` : un événement du 30 février
apparaissait le 2 mars). Une heure `25:60` était affichée telle quelle.

## Le correctif (valider par aller-retour sur `Date`, comme `jobDateFromText`)

Même idiome que le correctif Alternance #411 : construire `new Date(Y, M-1, D)` et vérifier que ses
composantes n'ont **pas débordé** (le rollover trahit un jour qui dépasse la longueur du mois).
Bornes d'heure ajoutées (`h ≤ 23`, `mi ≤ 59`, `s ≤ 60`). Toute date/heure impossible → `null`.

```js
const probe = new Date(y, mo - 1, d);
if (probe.getFullYear() !== y || probe.getMonth() !== mo - 1 || probe.getDate() !== d) return null;
…
if (+h > 23 || +mi > 59 || (s !== undefined && +s > 60)) return null;
```

`parseIcs` gère déjà proprement le `null` : ligne 1035 `if (cur && cur.start && cur.start.date)`
**ignore** l'événement dont le DTSTART est invalide (rien de corrompu n'est stocké) ; un DTEND
invalide (`null`) retombe sur la durée par défaut (60 min) sans casser un DTSTART valide.

## Portée & sûreté

- Logique pure, aucun rendu modifié. Renforcement d'un contrat déjà défendu en aval (#393/#398) —
  on tarit la source au lieu de seulement filtrer plus loin.
- Purement conservateur : une année à 4 chiffres écarte le piège `Date` 0-99 → 1900 ; toutes les
  vraies dates passent inchangées, **29 février bissextile compris** (`20240229` → `2024-02-29`), et
  la branche `Z` d'un instant UTC valide reste convertie à l'identique (test existant vert).
- +2 blocs de tests : `parseIcsDateTime` (6 cas fautifs prouvés avant + 2 gardes positives) et
  `parseIcs` (VEVENT à date impossible ignoré ; DTEND impossible → durée par défaut). **434 tests +
  smoke** verts (`cd src && xvfb-run -a npm run verify`, `whatsNew` en 2.0.53, `SMOKE OK`).

## Variété (§4)

Rupture avec la cohérence interne du module Sommeil (#413) et l'a11y (#412) : bug de **robustesse
d'un parseur** (`.ics`), domaine **import de calendrier** — famille « validité calendaire d'une date »
étendue de `jobDateFromText` (#411, Alternance) à `parseIcsDateTime` (agenda importé).

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **434 tests + smoke 100 % verts**. Bump **2.0.52 → 2.0.53** :
effet utilisateur réel (un événement à date impossible n'est plus importé) → entrée CHANGELOG (🗓️)
+ 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`). Aucune Release, zéro dépendance,
aucune donnée perso, aucune feature retirée. Boucle #414.
