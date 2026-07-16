# #373 — Alternance : la « Cible du jour » (2.0.17)

Le cœur du besoin d'Adrien : avec ~390 cibles « à postuler », la vraie question quotidienne n'est
pas « dois-je postuler ? » (le coach s'en charge) mais **« je postule à QUI aujourd'hui ? »**.
Réponse : l'app choisit pour lui la meilleure cible et la met en avant, bouton compris.

## Ce qui est livré

- **Le score des Cibles survit désormais à la sync** : `normalizeApplication` gagne un champ
  `score` (0-10, null si inconnu, hors bornes → null) ; `parseAlternanceTargets` le transmet ;
  `mergeApplications` le met à jour.
- **`nextAlternanceTarget(applications)`** (pur + testé) : parmi les « à postuler », la mieux notée
  (départage alphabétique stable) ; les postulées/refusées sont ignorées ; null si rien.
- **Héros alternance** : bloc « 🎯 Cible du jour : FIDUCIAL Lorient **8/10** · Lorient (56) » avec
  bouton **📤 J'ai postulé** intégré. Visible seulement tant qu'Adrien n'a pas postulé aujourd'hui —
  après, il laisse place au « ✅ bravo » jusqu'à demain.
- **`markApplicationApplied(id)`** : le flux « J'ai postulé » (statut, date, XP, célébration,
  re-rendus) est extrait et partagé entre la liste et la cible du jour — et il rafraîchit désormais
  aussi le coach (le focus alternance s'efface immédiatement après la candidature).

## Vérification navigateur

Bloc affiché avec la mieux notée (8/10, la « postulée » à 10 correctement ignorée) → clic →
statut postulé, cible effacée, « ✅ Tu as postulé aujourd'hui » ✅. 0 erreur console.

## Tests

390 tests (meilleure cible, égalité → alphabétique, sans score, rien à postuler → null, score
coercé + fusionné) + smoke `altTarget` **bloquant** (rendu + clic réel + disparition).

## Contexte

Build **2.0.17**. Pas de Release (lot 2.0.12→17). La chaîne de motivation alternance est complète :
coach (« postule aujourd'hui ») → cible du jour (« à celle-ci ») → un clic (« c'est fait ») →
célébration + série.
