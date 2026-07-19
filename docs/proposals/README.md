# 📋 Propositions — les gros chantiers, décidés par Adrien

Ce dossier est la **soupape** de la boucle autonome, décrite dans
[`VPS-AUTOPILOT.md`](../VPS-AUTOPILOT.md) §4 et §5.

> **Honnêteté sur l'historique** : ce dossier n'existait pas jusqu'au 2026-07-19. Le mécanisme
> « gros chantier = proposition » était écrit dans la doc depuis le début mais **n'a jamais servi en
> 546 boucles** — pendant que 60 itérations d'affilée partaient dans le coach adaptatif. C'est
> précisément ce trou que le **quota de propositions** (§4 bis.4) vient combler.

## Quand écrire une proposition plutôt que du code

Dès que le sujet **engage Adrien** — et pas seulement parce qu'il est gros :

- il faudrait une **dépendance npm** (ex. Playwright, un bundler) → règle « zéro dépendance » ;
- il touche le **modèle de données** ou la **persistance** (migration, schéma versionné) ;
- il change l'**UX de façon majeure**, ou retirerait/désactiverait quelque chose ;
- il demande un **arbitrage de périmètre** (jusqu'où aller ? quelle option ?) ;
- il modifie les **règles d'autonomie** elles-mêmes (VPS-AUTOPILOT, roadmap 3.0) — dans ce cas, la
  proposition est **le seul** chemin : on ne s'auto-légifère pas.

Écris le document, **puis STOP**. On n'implémente pas dans la foulée.

## Format attendu (`<slug>.md`)

1. **Problème** — factuel, prouvé dans le code (`fichier:ligne`), pas une intuition.
2. **Options** — 2 ou 3, avec leurs coûts réels et ce qu'elles ferment.
3. **Recommandation** — une seule, assumée, avec le pourquoi.
4. **Risques** — ce qui peut casser (tests, smoke, migration, boot, données).
5. **Ce qui dépend d'Adrien** — les décisions explicites qu'il doit trancher.

Reste **court** et **décidable** : le but est qu'Adrien puisse répondre « option B, vas-y » en une
lecture. Une proposition qui pré-décide à sa place a raté sa cible.

## ✅ Écrites — en attente de décision d'Adrien

Les six propositions du lot P1 ont été rédigées le **2026-07-19**. **Aucune ne doit être implémentée**
avant qu'Adrien ait tranché les questions de leur dernière section.

| Proposition | Sujet | Recommandation |
|---|---|---|
| [`coach-freeze.md`](coach-freeze.md) | Gel du coach adaptatif | **A** — gel dur (+ test « tripwire » à 93 clés) |
| [`indexeddb-primary-persistence.md`](indexeddb-primary-persistence.md) | IndexedDB source de vérité | **B** — IDB primaire ; débloque la sync |
| [`multi-exam-etudes-bts.md`](multi-exam-etudes-bts.md) | `examGoals[]` multi-épreuves BTS | **A** — poser le modèle d'abord |
| [`es-modules-split.md`](es-modules-split.md) | Découper les monolithes | **Attendre** — après P1.2, et le gel freine déjà la croissance |
| [`e2e-playwright.md`](e2e-playwright.md) | Tests de parcours | **B** — étendre le smoke, **zéro dépendance** |
| [`i18n-groundwork.md`](i18n-groundwork.md) | Amorce i18n | **D** — ne rien faire tant que l'app est perso |

> Deux de ces documents recommandent de **ne pas faire** le travail. C'est volontaire : une
> proposition qui conclurait toujours « il faut le faire » ne serait pas un outil de décision.

Quand une proposition est écrite, coche sa case dans la roadmap et **change de domaine** à
l'itération suivante (§4 bis.3).
