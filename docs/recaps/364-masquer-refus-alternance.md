# #364 — Suivi alternance : masquer les candidatures refusées (2.0.8)

Adrien, après avoir synchronisé ses 2 onglets (717 candidatures dont 214 refus) : « ça devrait
supprimer ceux qui ont reçu une réponse refusée, non ? »

## Choix : masquer, pas supprimer

Supprimer serait un piège : les refus sont toujours dans son Google Sheets → une suppression serait
**réimportée à la sync suivante** (boucle sans fin). Donc on **masque** par défaut, avec un bouton
pour réafficher — les données restent (stats, éviter de re-postuler).

## Ce qui change

- `state.hideRejected` (défaut **true**, coercé booléen dans `normalizeState`).
- `renderAlternance` : quand actif, la liste `#altList` exclut les candidatures `status === 'refus'`
  (refus/négatif/abandonné/écartée, tous mappés en `refus`). Un bouton `#altRejectedToggle` affiche
  « 🗂️ N refusées masquées — Afficher » / « Masquer les N refusées » et bascule `hideRejected`.
- La sync continue d'importer TOUT (les transitions de statut restent correctes : un « postulé » qui
  passe « refusé » dans le Sheet est bien mis à jour) ; seul l'AFFICHAGE filtre. Les stats (envoyées,
  taux de réponse) gardent les refus.
- État vide géré : si tout est masqué (que des refus), la liste est vide et le bouton explique.

## Vérification navigateur (vraies données, 2 onglets)

- 717 en state (394 à postuler, 107 postulé, 214 refus, 2 entretien) → **503 lignes affichées**,
  bouton « 🗂️ 214 refusées masquées — Afficher » ✅.
- Clic → 717 lignes affichées, bouton « Masquer les 214 refusées » ; re-clic → remasqué ✅.
  Aucune erreur console.

## Tests

381 tests + smoke `altHideRejected` **bloquant** (refus absent de la liste quand masqué, présent
sinon, compteur du bouton).

## Contexte

Build **2.0.8**, **publié en Release** (Adrien met en place la fonctionnalité en direct). Note :
« 487 ajoutées, 118 mises à jour » vu par Adrien = deltas d'une passe de sync depuis un état déjà
partiellement peuplé ; l'état cible après sync complète des 2 onglets ≈ 717 (503 visibles).
