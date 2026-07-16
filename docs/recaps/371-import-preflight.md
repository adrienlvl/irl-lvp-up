# #371 — Fondations : préflight d'import de sauvegarde (3.0 · Vague 2, tranche 4) (2.0.15)

Trou de sécurité des données repéré (vérifié avant de coder, règle de la boucle) : l'import de
sauvegarde n'affichait qu'un `confirm(« Remplacer toutes tes données ? »)` **aveugle**. Importer un
vieux fichier quasi vide aurait écrasé les ~717 candidatures et tout le suivi d'Adrien sur un OK
réflexe. (Le « schéma versionné » abstrait attendra — ce manque-ci était réel et immédiat.)

## Ce qui est livré

- **Purs + testés** : `describeBackup(raw)` (compte séances/candidatures/agenda/habitudes/pesées,
  XP, dernière date d'activité ; entrées invalides → zéros) et `backupImportWarnings(current,
  incoming)` → avertissements FR si l'import est probablement régressif : sauvegarde **vide**,
  **bien moins fournie** (< moitié des éléments), **moins de candidatures**, **plus ancienne**.
- **`confirmBackupImport(parsed)`** (renderer, partagé par les DEUX chemins d'import PWA + desktop) :
  la confirmation affiche désormais le CONTENU (« Cette sauvegarde contient : 1 séance,
  0 candidature, … · dernière activité le 15/01/2026 ») puis un bloc « ⚠️ ATTENTION » listant les
  régressions, avant la question. Refus → rien n'est touché.

## Vérification navigateur

État riche (50 candidatures, 30 séances) + vieille sauvegarde d'1 séance → message complet avec les
3 avertissements ; refus → état intact ; acceptation → état remplacé ✅. Aucune erreur console.
Accord corrigé au passage (« 1 élément »).

## Tests

388 tests (describeBackup : comptes/lastDate/entrées invalides ; backupImportWarnings : vide,
régression, candidatures, ancienneté, aucune alerte si plus riche) + smoke `importPreflight`
**bloquant** (confirm stubé : message avec contenu, refus → null, état intact).

## Contexte

Build **2.0.15**. Pas de Release (prochain lot 2.0.12→15 = pack « données blindées » complet :
miroir + instantanés + santé du stockage + import éclairé).
