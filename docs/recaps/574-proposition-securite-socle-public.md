# #574 — Proposition : socle sécurité « prêt pour le public » — chiffrement AU REPOS (docs, pas de bump)

**Domaine : fondations** · docs (proposition, aucun code, pas de bump).

## Pourquoi une proposition ce tour-ci (et pas du code)

Trois contraintes convergent :

1. **Rotation §4 bis.3** — les 5 derniers domaines = `coach · robustesse · a11y · coach · robustesse`.
   `coach` et `robustesse` apparaissent **2×** ET **dans les 2 derniers** → tous deux **interdits**. La
   priorité de nuit #1 (« coaching à fond ») est donc **rotation-bloquée** ce tour (§3 : la rotation
   prime même sur la demande de nuit — le coach attend son tour comme les autres).
2. **Quota §4 bis.4 déclenché** — `docs/proposals/` inchangé depuis le commit `3e22343` (les 6 de P1
   tranchées), soit **20 recaps** en arrière → « l'itération DOIT être une proposition ». ROADMAP P1 est
   **épuisée** (6/6 écrites et tranchées), donc « une proposition prise dans ROADMAP P1 » n'a plus de
   cible : je suis l'**intention** du quota (garder la soupape réelle) → j'écris la proposition
   **manquante** du Cap 3.0 (fallback « backlog vide » point 2 : « écris une proposition manquante »).
3. **2ᵉ demande d'Adrien** (« avance CAP 3.0, pas du polish ; gros chantier structurant → proposition »).
   Or le code autonome du Cap 3.0 est **épuisé** : P6 (multi-examens) et P7 (parcours smoke) **clos**,
   IndexedDB **réservé au supervisé**, es-modules/i18n **fermés**. Le **seul** moyen d'avancer CAP 3.0
   ce soir est d'écrire la proposition du **chantier 3** (« Sécurité & prêt pour le public »), qui
   n'avait **aucune** proposition.

Les trois pointent au même endroit → `docs/proposals/securite-socle-public.md`.

## Le fait qui a orienté la proposition (intuition corrigée par le code)

Hypothèse de départ : « `safeStorage` est importé mais inutilisé → tout est en clair ». **Faux, vérifié
dans le code** : `safeStorage` **est** utilisé, mais **seulement** pour 2 petits fichiers de secrets
réseau — `calendar-subs.dat` (`electron-main.cjs:89-90`) et `travel-config` (`:183-184`), conformément
au **principe S.8 n°6**. En revanche, le **gros corps de données personnelles reste en clair** :

- `localStorage['irl-level-up']` — tout l'état (`app.js:32`, `:54`) ;
- copies disque `backup:save` — instantané + **14 copies quotidiennes** JSON (`electron-main.cjs:196`) ;
- photos (`:206`) et miroir IndexedDB (`app.js:59`).

## Périmètre : ce que la proposition NE fait PAS

La sécurité **réseau** est déjà traitée, et bien, par `docs/SECURITE-RESEAU-S8.md` (réseau confiné au
main, HTTPS, anti-SSRF, allowlists par hôte, bornage). La proposition **n'y touche pas** (§3) et le dit
explicitement. Elle cadre uniquement le **stockage au repos** + une checklist de **publication**
(politique de confidentialité, CSP web, permissions, cadence Electron, modèle de menace).

## Le nœud décisionnel (ce qui engage Adrien)

- **Desktop** : `safeStorage` (trousseau OS) est déjà là → étendre au blob + backups + photos est
  **direct, zéro UX**. Cas facile.
- **Web / PWA** : **pas de trousseau** → chiffrer exige une **phrase de passe** (WebCrypto AES-GCM +
  dérivation), donc coût UX + risque de perte de mot de passe. C'est **la** décision.

Options : **A** desktop seul · **B** desktop + verrou web **opt-in** · **C** obligatoire partout.
Reco : **A maintenant, B en cible, C écarté** (disproportionné pour un journal perso mono-appareil).
Point structurant : décider le chiffrement **avant** de bâtir la persistance IndexedDB (chantier 2,
supervisé) pour la construire **chiffrée d'emblée** — sinon on re-touche la couche persistance deux fois.

## Suivi mis à jour

- `docs/proposals/securite-socle-public.md` (nouveau).
- `docs/proposals/README.md` : section « Propositions au-delà de P1 » + ligne de la nouvelle proposition.
- `docs/ROADMAP.md` : entrée #574 en tête de « État actuel ».
- `docs/DEMANDES.md` : la 2ᵉ demande (avancer CAP 3.0) passe en « En cours » avec le pointeur vers la
  proposition et les 4 décisions en attente.

## Vérifications

- **Aucun code touché** — modifications **100 % markdown** (4 fichiers docs + 1 nouveau). Rien dans
  `src/` (ni `logic.js`, ni `app.js`, ni les tests, ni le smoke) → aucune surface que `verify` puisse
  exercer. Conformément à §2.6, **pas de bump**, pas d'entrée CHANGELOG.
- Relecture : la proposition cite `fichier:ligne` réels, ne pré-décide pas à la place d'Adrien (4 points
  ouverts en §8), et respecte le format `docs/proposals/README.md` (problème · options · reco · risques ·
  ce qui dépend d'Adrien).

Domaine : fondations
