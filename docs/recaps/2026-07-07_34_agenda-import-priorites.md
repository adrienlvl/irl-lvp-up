# Boucle #36 — Agenda complet : import Google/Apple (.ics) + priorités

**Date :** 2026-07-07
**Version :** 1.2.2 → 1.3.0

## Demande d'Adrien
> « Améliore l'agenda, faut que ce soit un agenda complet, où je puisse tout mettre, le mieux ça serait qu'il importe l'agenda Google et Apple tout seul, histoire que je vois ce que j'ai à faire dans la journée, pouvoir mettre des priorités etc ! C'est hyper important. »

## Ce qui a été fait

### 1. Import de l'agenda Google / Apple (.ics) — 100 % local
- `parseIcs(text, opts)` pur dans `lib/logic.js` :
  - dépliage des lignes repliées **RFC 5545** (continuations),
  - lit `SUMMARY`, `DTSTART`, `DTEND`, `UID` de chaque `VEVENT`,
  - gère **journée entière** (`;VALUE=DATE`), **heure locale/flottante** (heure de paroi telle quelle) et **UTC** (suffixe `Z` → converti en heure locale),
  - **durée déduite** de DTEND−DTSTART (défaut 60 min),
  - `source:'imported'`, `refId:'ics-<uid>'` → **réimport sans doublon** via `mergePlannedEvents`.
- UI (page Calendrier) : bloc **« Importer mon agenda — Google · Apple (.ics) »** : sélecteur de catégorie + fichier `.ics` (max 3 Mo), statut. Handler `#importIcs`.
- **Aucune connexion Internet** : l'utilisateur exporte son .ics depuis Google/Apple et le dépose ; tout est traité sur l'appareil.

### 2. Priorités
- Champ `priority` (`high` / `normal` / `low`) dans le modèle + `normalizeAgendaItem` (défaut `normal`, valeur invalide → `normal`).
- Sélecteur de priorité ajouté au formulaire d'ajout.
- Rendu : badge **🔴 / 🔵** + bordure/opacité dans **« Ma journée »**, la **vue mois** et la **vue semaine**.
- Tri : `todayItems` trie par **heure**, puis par **priorité** à heure égale (`priorityRank` : haute → basse).

### 3. Cap « tout mettre » / « voir la journée »
- Les événements importés + les blocs manuels + les séances + les révisions apparaissent tous dans « Ma journée » et les vues semaine/mois, avec leur priorité.

## Limite connue / honnêteté
- **« Tout seul » (sync automatique live)** = OAuth Google / abonnement CalDAV Apple → nécessite réseau + jetons. Placé en **Vague Sécurité (S.8)**, à côté du scan du frigo, pour être fait proprement (jetons chiffrés `safeStorage`, lecture seule, allowlist). L'import `.ics` manuel livré ici couvre déjà « importer Google et Apple » de façon sûre.
- Un événement journée entière s'affiche avec l'heure « — » (en tête de journée) ; libellé « Journée » possible plus tard.

## Vérifications
- `node --test` → **72/72** ✅ (nouveaux : priorité par défaut/validée, tri priorité à heure égale, `parseIcs` horaire/journée/dépliage/déséchappement/idempotence/vide).
- Smoke renderer → `SMOKE OK`, check `agendaImport:true`.
- Flux réel (Electron) : import d'un vrai `.ics` (2 événements, dont journée entière) via le handler → statut « ✓ 2 événements importés » ; ajout d'un bloc **haute priorité** → badge présent ; à 11:00, la haute priorité passe **avant** l'événement normal importé. ✅

## Roadmap
- Vague 1 enrichie : **1.6 priorités**, **1.7 import .ics** cochés.
- Vague S : **S.8** ajoutée (scan du frigo + sync agenda auto — demandes réseau à ouvrir dans la vague sécurité).

## Suite
- **UX** (prochaine demande d'Adrien) : voir la section « Prochaines étapes » du message.
