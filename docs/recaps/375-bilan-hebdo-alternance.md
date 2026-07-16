# #375 — Bilan hebdo : la recherche d'alternance y prend sa place (2.0.19)

Le bilan de semaine partageable (copier/partager depuis l'accueil) listait séances, focus,
révisions, sommeil — mais pas la priorité n°1 d'Adrien. Corrigé.

## Ce qui change

- `weeklySummary` compte désormais les **candidatures de la semaine** (`apps` : date d'action dans
  la semaine, statut ≠ « à postuler ») et celles arrivées en **entretien/acceptées**
  (`appEntretiens`).
- `weeklySummaryText` ajoute la ligne « 💼 4 candidatures · 1 entretien 🎉 » (absente si zéro —
  pas de bruit). `shareableWeek` en profite automatiquement.

## Note de coordination

Premier tick depuis la mise en place du VPS : `git pull --rebase` systématique en tête d'itération
(aucun commit VPS pour l'instant — en cours d'installation par Adrien).

## Tests

392 tests (comptage semaine calendaire, hors-semaine exclu, « à postuler » exclu, ligne texte,
absence si zéro) + check smoke `weeklyText` étendu (renderer réel).

## Contexte

Build **2.0.19**. Pas de Release (lot 2.0.12→19). Domaine varié (bilan/partage) après la série
alternance-poste-de-travail (#372-374).
