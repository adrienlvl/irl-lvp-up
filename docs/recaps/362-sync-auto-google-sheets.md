# #362 — Sync auto du Google Sheets d'alternance (2.0.6)

Demande d'Adrien : « faudrait que le CSV de Google Sheets se mette à jour automatiquement… onglets
« Cibles » et « Suivi Existant » (les plus à jour)… faut faire attention à ce que tout ne soit pas
mis ». Il a choisi **Option 1 : sync auto complète**.

## Ce qui est livré

- **Fetch réseau sécurisé côté process principal** (`electron-main.cjs` → `fetchSheetCsv` + IPC
  `sheet:fetch`, exposé `window.desktop.fetchSheet`) : même modèle défensif que la sync `.ics`
  (Vague S.8) — HTTPS uniquement, **allowlist stricte `docs.google.com`** (redirections suivies
  seulement vers `*.googleusercontent.com`), timeout 10 s, taille plafonnée 5 Mo, détection d'une
  réponse HTML (onglet non publié → message clair). Réseau UNIQUEMENT dans le main ; renderer verrouillé.
- **Garde-fou d'URL pur** (`normalizeSheetCsvUrl`, testé) : n'accepte QUE des URLs de **CSV publié
  Google Sheets** (`/pub?output=csv`, `export?format=csv`, gviz `tqx=out:csv`). Tout le reste refusé
  (autre hôte, http, hôte privé, page d'édition). `isAllowedSheetHost` borne les redirections.
- **Fusion idempotente** (`mergeApplications`, testé) : dédoublonne **par entreprise** — une
  entreprise = une ligne. Réconcilie une même boîte présente dans « Cibles » (avec poste, « à
  postuler ») ET « Suivi Existant » (statut avancé) en **une seule** entrée : le poste de Cibles est
  conservé, le statut de Suivi appliqué, **sans jamais régresser** un suivi avancé vers « à postuler ».
  Refusionner ne change plus rien (idempotent).
- **UI** dans l'onglet Alternance : coller une/des URL(s) CSV publiées, liste des sources (retrait
  possible), bouton « Synchroniser maintenant », statut. **Sync auto au démarrage + toutes les 3 h**
  (`setupSheetSync`). Sur PWA : tentative de fetch direct, sinon message « dispo sur l'app installée ».
- Sécurité : `state.sheetSyncUrls` validées à chaque `normalizeState` (URLs non conformes rejetées).
  **Seul ce qu'Adrien publie est lu ; les autres onglets ne sont jamais touchés.**

## Vérification navigateur (pont desktop simulé)

- URL `evil.com` → **refusée** avec message ✅. UI (form/list/bouton) présente ✅.
- 2 sources (Cibles + Suivi) → fetch → parse → merge : **Cabinet Alpha en UNE seule entrée**
  (poste « Alternance CG » + statut « entretien »), Boite Beta (à postuler), Gamma SARL (postulé) ✅.
- Resync → « 0 ajoutée, 0 mise à jour » (idempotent) ✅. Aucune erreur console.
- Bug corrigé en cours : la clé de dédoublonnage entreprise+poste créait un doublon quand une boîte
  était dans les deux onglets avec un poste différent/absent → passée à **entreprise seule**.

## Tests

378 tests (`normalizeSheetCsvUrl` accepte/refuse ; `mergeApplications` ajout/dédup/idempotence/
non-régression/clé entreprise) + smoke `sheetSync` **bloquant** (garde-fou URL + merge + rendu liste).

## Contexte

Build **2.0.6**. Code sur `master` + PWA à jour ; **pas de tag Release maintenant** — regroupé au
prochain lot (règle anti-spam de MAJ demandée par Adrien : ~1 Release/jour max). Adrien doit publier
ses 2 onglets en CSV (Fichier → Partager → Publier sur le web → CSV) et coller les liens dans l'app.
