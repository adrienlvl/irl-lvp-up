# #342 — Mises à jour à la demande dans les Réglages (1.9.276)

## Demande d'Adrien

> « L'application ne se met jamais à jour toute seule sauf après le démarrage. Y'a moyen d'améliorer
> ça ? Que ça propose dans Réglages directement la mise à jour (sauf au démarrage où ça met le pop-up). »

Comportement d'origine : l'app télécharge en tâche de fond (`autoDownload`) mais n'installe qu'au
**prochain démarrage** (`autoInstallOnAppQuit`), et ne re-vérifie que toutes les 3 h. Aucun moyen de
déclencher/installer à la demande.

## Ce qui change

**Process principal (`electron-main.cjs`)** — deux états supplémentaires + retour du check :
- `checking-for-update` → `{state:'checking'}`, `update-not-available` → `{state:'none'}`.
- `update:check` renvoie désormais `true`/`false` (vérification réellement lancée : build empaqueté).

**Renderer (`app.js`)** — panneau « Mises à jour » piloté par le même flux d'événements :
- Le **bandeau popup** reste réservé aux MAJ réellement disponibles (available/downloading/ready) —
  comportement d'origine au démarrage **conservé**.
- Les états « recherche » / « à jour » ne s'affichent QUE dans les Réglages (pas de popup intempestif).

**Réglages (`index.html`)** — nouveau groupe **⬆️ Mises à jour** (desktop-only, révélé par
`setupComfort` si `window.desktop` présent) : version courante, bouton « 🔄 Vérifier maintenant »,
ligne de statut, et bouton « ⬆️ Installer et redémarrer » quand une MAJ est prête → **plus besoin
d'attendre le prochain démarrage**.

## Vérification navigateur (flux complet simulé)

| Cas | Résultat |
|---|---|
| Contexte web (pas de `window.desktop`) | ✅ panneau **masqué** (MAJ web via service-worker) |
| Desktop simulé | ✅ panneau révélé, version « 1.9.276 » lue |
| checking / none / available / downloading / ready / error | ✅ chaque état affiche le bon texte |
| État « ready » | ✅ bouton « Installer et redémarrer » révélé |

## Tests

361 tests + smoke `settingsUpdate` **bloquant** (éléments présents + panneau révélé quand
`window.desktop` existe).

## Rotation

#342 — rotation 33 (build 1.9.276). Prochain #343 clôture la rotation (tag v1.9.277).
