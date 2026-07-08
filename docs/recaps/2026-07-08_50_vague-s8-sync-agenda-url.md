# Boucle #52 — Vague S.8 : sync agenda par URL (.ics/webcal)

**Date :** 2026-07-08
**Version :** 1.6.1 → 1.7.0

## Contexte
Adrien lance la **Vague S.8** (fonctions réseau). Choix du point de départ : **sync agenda par URL** (le plus sûr, réutilise le moteur d'import + RRULE). Cadre de sécurité posé d'abord : `docs/SECURITE-RESEAU-S8.md`.

## Ce qui a été fait
### Sécurité (logique pure, testée)
- **`normalizeCalendarUrl`** + **`isPrivateHost`** (lib/logic.js) : HTTPS only (webcal→https), refus loopback/privés/lien-local/IPv6/multicast (anti-SSRF).

### Process principal (seul à faire du réseau)
- **`fetchIcs`** : GET HTTPS, timeout 10 s, ≤ 5 Mo, ≤ 3 redirections https ré-validées, vérifie `BEGIN:VCALENDAR`. Renvoie `{ok, text}` / `{ok:false, error}`.
- **Abonnements chiffrés** : `calendar:subs:get/save` via **`safeStorage`** dans `userData/calendar-subs.dat` (URLs = jetons, jamais en clair). `calendar:fetch` (IPC).

### Renderer (verrouillage inchangé)
- Section repliable **« 🔄 Calendriers synchronisés »** (Vue mois) : ajout d'un lien .ics (nom + URL + catégorie), liste, suppression, **Sync** par source + **Tout synchroniser**.
- `applyImportedIcs()` factorisé (partagé avec l'import fichier) → récurrents (RRULE) dépliés en `state.recurring`, ponctuels en agenda, **dédup par refId**.
- **Sync auto à l'ouverture** (silencieuse) si au moins un abonnement.
- Preload : `fetchCalendar` / `getCalendarSubs` / `saveCalendarSubs`.

## Vérifications
- `node -c` main OK ; `node --test` → **100/100** ✅ (isPrivateHost, normalizeCalendarUrl — http/localhost/privés rejetés).
- Smoke → `SMOKE OK`, check `calSync:true`.
- **Chemin réseau réel** (node + parseIcs) : calendrier public Google (fêtes US) → **200, 120 Ko, 317 événements** extraits. ✅
- **Orchestration renderer** (Electron, fetch stubé déterministe) : abonnement → « Cours de sport » (récurrent) + « Dentiste » (ponctuel), statut « ✓ 2 événements (dont 1 récurrent 🔁) », **re-sync sans doublon**, URL `http://` **refusée** (sous non ajouté). ✅

## Suite S.8 (au choix d'Adrien)
- OAuth Google complet (option « tout auto »), ou **scan du frigo par photo** (décision confidentialité + fournisseur de vision à cadrer), ou signature de code.

_Renderer 100 % verrouillé ; build sans fermer l'app d'Adrien._
