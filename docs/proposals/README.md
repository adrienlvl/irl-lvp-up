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

## ✅ TOUTES TRANCHÉES par Adrien le 2026-07-19

Adrien a **validé les 6 propositions**, c'est-à-dire **accepté la recommandation de chacune**. Deux de
ces recommandations sont des **« non »** : les valider, c'est acter qu'on ne fait **pas** le travail.

| Proposition | Décision | Qui l'exécute |
|---|---|---|
| [`coach-freeze.md`](coach-freeze.md) | ❌ Gel **refusé** → « qualité, pas volume » | ✅ Déjà appliqué (§3) |
| [`indexeddb-primary-persistence.md`](indexeddb-primary-persistence.md) | ✅ **Option B** — IDB primaire | ⚠️ **Session supervisée** — PAS le VPS |
| [`multi-exam-etudes-bts.md`](multi-exam-etudes-bts.md) | ✅ **Option A** — modèle `examGoals[]` d'abord | ▶️ **VPS autorisé**, par étapes |
| [`es-modules-split.md`](es-modules-split.md) | ⛔ **Attendre** — après P1.2 | Personne pour l'instant |
| [`e2e-playwright.md`](e2e-playwright.md) | ✅ **Option B** — étendre le smoke, **zéro dép.** | ▶️ **VPS autorisé** |
| [`i18n-groundwork.md`](i18n-groundwork.md) | ⛔ **Ne rien faire** (option D) | Personne |

**Donc, concrètement : 2 chantiers seulement s'ouvrent en autonomie** (multi-examens BTS et parcours
smoke). Un est réservé à une session supervisée (IndexedDB : il réécrit le boot en asynchrone et
touche la persistance — trop risqué sans surveillance). Deux sont fermés, volontairement.

> Une proposition qui conclurait toujours « il faut le faire » ne serait pas un outil de décision :
> c'est pour ça que deux d'entre elles recommandent de s'abstenir.

Quand une proposition est écrite, coche sa case dans la roadmap et **change de domaine** à
l'itération suivante (§4 bis.3).
