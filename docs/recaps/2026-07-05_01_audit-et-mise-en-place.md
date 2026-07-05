# Récap boucle #01 — Audit & mise en place

**Quand :** 2026-07-05
**Durée :** boucle initiale (exploration + audit + fondations doc)
**Statut :** ✅ terminé

## Ce que j'ai fait
1. **Localisé le vrai projet** : `D:\IRL LVP UP` (l'app « RPG de vie » Electron), distinct de ton projet alternance. Identifié aussi `D:\Le Grand Livre Compta App` (révision BTS CG) comme cible d'intégration.
2. **Récupéré la source** : elle n'existait **que** dans le `.exe` → extraite depuis `app.asar` (build-detail, 23/06/2026).
3. **Mis en place l'environnement de travail** :
   - Dossier source éditable : `D:\IRL LVP UP\src\` (app.js, index.html, 20 CSS, electron-main.cjs, preload.cjs, assets, package.json).
   - Dossier docs : `D:\IRL LVP UP\docs\`.
   - **Git initialisé** + `.gitignore` (exclut builds/exe) + commit baseline (32 fichiers suivis).
4. **Lu l'intégralité du code** (app.js ~2 500 lignes, index.html, electron-main, preload) + inspecté Le Grand Livre Compta.
5. **Rédigé l'audit complet** → [`docs/AUDIT.md`](../AUDIT.md).
6. **Rédigé la roadmap séquencée** → [`docs/ROADMAP.md`](../ROADMAP.md).

## Constats clés (extraits de l'audit)
- 🔴 **Aucun build reproductible** : impossible de régénérer le `.exe` (deps Electron/electron-builder absentes). Priorité n°1.
- 🔴 Source qui n'existait que dans le binaire → **corrigé** (src + git).
- 🟠 **Quota `localStorage` non géré** (`save()` sans try/catch) → risque de perte de données silencieuse.
- 🟠 **Photos base64 dans le blob d'état** → perf + quota.
- 🟠 **Double modèle de calendrier** (`agenda` vs `plans`) → orphelins ; il n'existe pas de catégorie « révision » (à ajouter pour le Grand Livre).
- Le Grand Livre Compta a **déjà** un planning implicite (dates `due` de répétition espacée) = la matière à faire remonter dans le calendrier.

## Décisions en attente (bloque la suite autonome)
- **Architecture d'intégration** Grand Livre → calendrier (fichier partagé / .ics / fusion).
- **Confirmation du mode boucles autonomes** et de la cadence.

## Prochaine boucle (prévu)
- Vague 0.1 : reconstituer `package.json` + electron-builder + `npm start`, vérifier que l'app démarre depuis `src/`.
- Vague 0.2/0.4 : `save()` robuste, tray visible, instance unique, CSP.

## Git
- Commit : `Baseline: source extraite de app.asar (build-detail, 23/06/2026)`.
