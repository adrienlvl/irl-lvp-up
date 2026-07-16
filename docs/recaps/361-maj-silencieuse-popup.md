# #361 — Mises à jour façon appli mobile : silencieuses + pop-up « prête » (2.0.5)

Demande d'Adrien : « comme les applications connues, qui s'installe toute seule en fond, sans manip
manuelle, et propose avec une petite pop-up d'installer quand c'est fait ». Faisable sur PC — et le
process principal le faisait déjà en partie ; il manquait le bon comportement côté interface.

## Constat

Le process principal (`electron-main.cjs`) faisait déjà l'essentiel : `autoDownload = true`
(téléchargement en fond), `autoInstallOnAppQuit = true` (pose au prochain arrêt), vérification au
démarrage + toutes les 3 h. **MAIS** le renderer affichait le bandeau **pendant tout le
téléchargement** (« téléchargement en cours… X % ») — donc pas silencieux.

## Ce qui change

- Le handler de statut est extrait dans **`applyUpdateStatus(s)`** (fonction de haut niveau, testable).
- **Silencieux en fond** : les états `available` / `downloading` n'affichent **plus** la pop-up (ils
  restent visibles uniquement dans le panneau Réglages, pour qui veut voir la progression).
- **Pop-up uniquement quand c'est PRÊT** (`ready`) : une petite carte en bas de l'écran
  « **Version X prête 🎉 — Installe-la maintenant, ou elle se posera à la prochaine fermeture** » avec
  le bouton « Redémarrer & installer ». Animation d'entrée douce (respecte `prefers-reduced-motion`).
- Comportement mobile-like complet : rien à faire → la MAJ se télécharge seule et s'installe à la
  fermeture ; ou un clic pour l'appliquer tout de suite.

## Vérification navigateur

- `available` puis `downloading` → pop-up **masquée** (silencieux) ✅.
- `ready` → pop-up **visible** (position fixe bas, z-index 60, animation), bouton installer affiché,
  titre « Version 2.0.6 prête 🎉 » + sous-titre ✅. Aucune erreur console.

## Tests

376 tests + smoke `updateSilent` **bloquant** (pop-up masquée pendant available/downloading, visible
avec bouton + version quand ready).

## Contexte

Build **2.0.5**, **publié en Release** (tag `v2.0.5`) — Adrien recevra donc directement 2.0.0 → 2.0.5
(alternance + coach + MAJ silencieuse) via son « Vérifier les mises à jour ». _Nouvelle règle : je
publie une Release dès qu'une feature attendue est livrée, sans attendre la fin de rotation._
