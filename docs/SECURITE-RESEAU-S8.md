# Sécurité réseau — Vague S.8 (2026-07-08)

_Cadre appliqué à toute fonction réseau de l'app (jusqu'ici 100 % locale). Première brique livrée : **sync agenda par URL .ics** (build 1.7.0)._

## Principes (non négociables)
1. **Le réseau vit uniquement dans le process principal** (Node/`electron-main.cjs`). Le **renderer reste verrouillé** : CSP `script-src 'self'`, `will-navigate` → preventDefault, `setWindowOpenHandler` → deny — **inchangés**. Aucune requête ne part du renderer, aucun code distant n'est chargé/exécuté.
2. **HTTPS uniquement.** `webcal://` est réécrit en `https://`. Tout autre schéma (http, ftp, file…) est refusé.
3. **Garde-fou anti-SSRF** (`lib/logic.js`, purs + testés) : `normalizeCalendarUrl` + `isPrivateHost` refusent loopback (127/localhost), privés (10/172.16-31/192.168), lien-local (169.254), `.local/.internal`, multicast et littéraux IPv6. Seuls des **hôtes publics** sont contactés.
4. **Requêtes bornées** : timeout **10 s**, taille **≤ 5 Mo**, **≤ 3 redirections** (https→https, ré-validées), pas de cookies/identifiants, `User-Agent` neutre. La réponse doit commencer par `BEGIN:VCALENDAR`.
5. **Contenu parsé, jamais exécuté** : le `.ics` récupéré passe par `parseIcs` (défensif) puis la fusion idempotente de l'agenda. Aucune évaluation.
6. **Secrets chiffrés** : les URLs d'abonnement (elles contiennent un jeton) sont stockées via **`safeStorage`** (chiffrement OS) dans `userData/calendar-subs.dat` — jamais dans le blob `localStorage` ni les backups en clair.
7. **Opt-in strict** : rien ne sort sur le réseau tant qu'Adrien n'a pas ajouté d'abonnement lui-même. La sync à l'ouverture ne s'exécute que s'il existe au moins un abonnement.

## Surface réseau actuelle (exhaustive)
| Sortant | Où | Quand |
|---|---|---|
| GitHub Releases (auto-update) | main (`electron-updater`) | au démarrage si dépôt configuré |
| URL(s) d'agenda `.ics` fournie(s) par Adrien | main (`fetchIcs`) | à l'ouverture + bouton « Synchroniser » |
| Géocodage **nominatim.openstreetmap.org** (adresses → coordonnées) | main (`httpsGetJson` + `isAllowedTravelUrl`) | à la demande seulement, bouton « 🧭 Estimer le trajet » |
| Itinéraire **router.project-osrm.org** (coordonnées → distance/durée) | main (`httpsGetJson` + `isAllowedTravelUrl`) | idem, après le géocodage |

Rien d'autre. Pas d'analytics, pas de télémétrie, pas de CDN.

### Trajet auto (build 1.8.5) — garanties spécifiques
- **Allowlist stricte par hôte** : `isAllowedTravelUrl` (pur + testé) n'accepte que `nominatim.openstreetmap.org` et `router.project-osrm.org`, en **HTTPS**, hôtes publics (réutilise `isPrivateHost`). Tout autre hôte (y compris un suffixe piégé `…openstreetmap.org.evil.com`) est refusé.
- **JSON parsé, jamais exécuté** ; requêtes bornées (timeout 10 s, ≤ 2 Mo, ≤ 3 redirections https).
- **Opt-in strict** : aucune requête tant qu'Adrien n'a pas cliqué « Estimer ». Les deux adresses (départ + destination) ne partent qu'à ce moment-là.
- **Point de départ chiffré** : l'adresse de départ (donnée personnelle) est stockée via `safeStorage` dans `userData/travel.dat`, jamais dans le blob `localStorage` ni les backups en clair.
- Sans clé d'API, sans compte : les serveurs publics OSM/OSRM suffisent pour un usage perso à faible volume.

## À faire si on ajoute d'autres fonctions réseau (OAuth, scan frigo…)
- Garder le même modèle : appel dans le main, hôtes **allowlistés** par domaine, secrets `safeStorage`.
- OAuth Google : `loopback redirect` local + PKCE, jamais de client-secret embarqué en clair.
- Scan frigo : décision de **confidentialité** explicite (photo envoyée à une API de vision) avant tout code ; sinon, modèle on-device.
- Idéalement **signer** les builds (supprime l'avertissement SmartScreen) avant diffusion large.
