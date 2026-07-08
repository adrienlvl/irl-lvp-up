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

Rien d'autre. Pas d'analytics, pas de télémétrie, pas de CDN.

## À faire si on ajoute d'autres fonctions réseau (OAuth, scan frigo…)
- Garder le même modèle : appel dans le main, hôtes **allowlistés** par domaine, secrets `safeStorage`.
- OAuth Google : `loopback redirect` local + PKCE, jamais de client-secret embarqué en clair.
- Scan frigo : décision de **confidentialité** explicite (photo envoyée à une API de vision) avant tout code ; sinon, modèle on-device.
- Idéalement **signer** les builds (supprime l'avertissement SmartScreen) avant diffusion large.
