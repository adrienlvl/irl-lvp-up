# #327 — « Annuler » après suppression d'une habitude (1.9.261)

## Pistes écartées d'abord (dites honnêtement)

- **Import de sauvegarde** : envisagé une robustesse, mais vérifié — c'est déjà solide (`JSON.parse`
  en try/catch, confirmation, `normalizeState` qui assainit tout, double try/catch). Pas de trou.
- **Contenu (plus d'exercices)** : chaque exercice dépend d'une illustration (`art:'p0'`) dans
  `exercise-icons.js` ; en ajouter un sans visuel assorti afficherait un rendu cassé, et je ne peux
  pas dessiner des SVG au style existant. Écarté.

## Le manque retenu (type frais : sécurité / undo)

Supprimer une habitude était **instantané et irréversible** — un clic accidentel effaçait la série
ET les 30 jours d'historique (le badge de régularité ajouté au #325). D'autant plus coûteux
maintenant que les habitudes portent une vraie histoire, et que l'édition (#326) a rapproché les
boutons ✏️ et ×.

## Ce qui change

Nouveau **toast « Annuler »** réutilisable (`showUndoToast(message, onUndo, ms)`) : un message + un
bouton qui rejoue une action si cliqué avant expiration (~6 s). Ne bloque pas comme un `confirm()`.

Branché sur la suppression d'habitude : on retire l'habitude, on affiche « Habitude « X »
supprimée » avec « Annuler ». Cliquer restaure l'habitude **à sa position d'origine**, avec son log
(donc série et régularité intactes). Sans clic, la suppression devient définitive.

Générique : réutilisable pour d'autres suppressions (quêtes, agenda…) plus tard.

## Vérification navigateur

| Scénario | Résultat |
|---|---|
| Supprimer → toast « Habitude « Méditation » supprimée » visible | ✅ |
| Habitude retirée immédiatement | ✅ |
| Cliquer « Annuler » → restaurée avec son historique (2 entrées) | ✅ |
| Toast masqué après annulation | ✅ |
| Ne pas cliquer → reste supprimée (définitif) | ✅ |

## Tests

353 tests `node:test` + smoke `habitUndo` **bloquant** : le flux complet suppression → « Annuler » →
restauration est exercé dans le renderer (état sauvegardé/restauré).

## Clôture de rotation

#327 **clôt la rotation 29** (#324 série protéines → #325 régularité habitudes → #326 habitudes
modifiables → #327 annuler suppression). Tag `v1.9.261` → auto-publication.
