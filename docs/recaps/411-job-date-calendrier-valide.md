# 411 — Import Alternance : une date de calendrier inexistante n'est plus stockée (2.0.50)

## Le manque (bug pur prouvé — §4.2 robustesse de parseur)

`jobDateFromText` (`src/lib/logic.js:304`) extrait une date ISO d'un libellé libre (ISO ou
JJ/MM/AAAA) à l'import de candidatures — saisie manuelle, `parseApplicationsCsv` (import CSV) et la
**sync Google Sheets**. C'est un point de passage du module sacré Alternance. Son commentaire
promet d'« ignorer les dates aberrantes » : depuis une correction antérieure, elle borne le mois à
1-12 et le jour à 1-31 pour qu'une cellule comme « 13/45/2026 » ne pollue pas le suivi.

Mais elle ne validait que les **bornes par champ**, pas la **validité calendaire**. Un jour dans les
bornes (≤ 31) mais qui n'existe pas dans son mois passait le filtre :

```js
// avant
const pad = (y, mo, d) => { const M = Number(mo), D = Number(d);
  return (M >= 1 && M <= 12 && D >= 1 && D <= 31)
    ? `${y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}` : ''; };
```

Cas concrets prouvés (exécutés sur le code réel avant correctif) :

```js
jobDateFromText('2026-02-30')  // avant → '2026-02-30'  (30 février n'existe pas)   attendu → ''
jobDateFromText('30/02/2026')  // avant → '2026-02-30'                              attendu → ''
jobDateFromText('31/11/2026')  // avant → '2026-11-31'  (novembre a 30 jours)       attendu → ''
jobDateFromText('2025-02-29')  // avant → '2025-02-29'  (2025 non bissextile)       attendu → ''
```

Scénario réaliste : un export tableur ou une saisie avec une typo (« 31/11 » au lieu de « 30/11 »,
« 30/02 »). Impact utilisateur : la date impossible était **stockée telle quelle** sur la
candidature, puis affichée « **postulé le 30/02/2026** » (`app.js:201`,
`a.date.split('-').reverse().join('/')`) — une date qui n'existe pas — et **reparsée ailleurs**
(ex. `new Date('2026-02-30')`) comme le **2 mars**, décalant silencieusement le jour.

## Le correctif (valider par aller-retour sur `Date`)

On garde les bornes par champ (rejet rapide) et on ajoute une vérification de validité calendaire :
construire `new Date(Y, M-1, D)` et vérifier que ses composantes n'ont **pas débordé** (le rollover de
`Date` trahit un jour qui dépasse la longueur du mois).

```js
// après
const pad = (y, mo, d) => {
  const Y = Number(y), M = Number(mo), D = Number(d);
  if (!(M >= 1 && M <= 12 && D >= 1 && D <= 31)) return '';
  const dt = new Date(Y, M - 1, D);
  if (dt.getFullYear() !== Y || dt.getMonth() !== M - 1 || dt.getDate() !== D) return ''; // 30 févr., 31 nov.…
  return `${y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`;
};
```

L'année est toujours à 4 chiffres (regex `\d{4}`), donc `new Date(Y, …)` n'a pas le piège
années 0-99 → 1900. Le **fallback ISO→FR** existant reste cohérent : une date ISO calendairement
invalide donne `''` et laisse une vraie date JJ/MM/AAAA qui suivrait prendre le relais.

## Portée & sûreté

- Logique pure, aucun rendu modifié. Renforcement du **même contrat déjà documenté** (« ignorer les
  dates aberrantes ») — une date impossible EST aberrante, comme « 13/45 ». Purement conservateur.
- Aucune vraie date affectée : le **29 février d'une année bissextile** (`2024-02-29`) reste bien lu ;
  tous les cas nominaux existants passent inchangés.
- +6 cas ajoutés au test `jobDateFromText` (4 fautifs prouvés avant : 30 févr. ISO & FR, 31 nov.,
  29 févr. non bissextile ; 1 garde positive 29 févr. bissextile ; 1 fallback ISO invalide→FR).
  **432 tests + smoke** verts (`cd src && xvfb-run -a npm run verify`, `whatsNew` en 2.0.50,
  `SMOKE OK`).

## Variété (§4)

Rupture avec la famille « arrondi / catégorie IMC » (#400→#408) et le parseur de statut (#409) :
bug de **robustesse d'un parseur de date** dans le **module Alternance** (cœur de la priorité de vie
d'Adrien) — on fiabilise l'import sans rien casser ni retirer.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **432 tests + smoke 100 % verts**. Bump **2.0.49 → 2.0.50** :
effet utilisateur réel (une date impossible n'est plus importée ni affichée) → entrée CHANGELOG (💼)
+ 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`). Aucune Release, zéro dépendance,
aucune donnée perso, aucune feature retirée. Boucle #411.
