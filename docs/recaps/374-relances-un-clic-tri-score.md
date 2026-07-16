# #374 — Alternance : relances en un clic + tri par score (2.0.18)

Deux frictions réelles du poste de travail alternance :
1. le bandeau « 🔁 Relances à faire » n'était qu'un AFFICHAGE — aucune action possible ;
2. la liste « à postuler » ignorait le score fraîchement conservé (#373) — les meilleures cibles
   noyées dans l'ordre d'insertion.

## Ce qui est livré

- **`compareApplications(a, b)`** (pur + testé) : étape du pipeline d'abord ; puis, pour les
  « à postuler », **score décroissant** (sans note en queue) ; pour les autres étapes, **date
  décroissante** (activité récente d'abord). La liste devient une vraie file de travail.
- **Score visible** sur chaque ligne (« ⭐ 8/10 ») — le tri est lisible.
- **Relances cliquables** : les chips deviennent des boutons — quand la relance est envoyée, un
  clic passe l'entreprise en statut « relance » (date du jour), avec **toast d'annulation** qui
  restaure statut + date. Le libellé du bandeau explique le geste.

## Vérification

Smoke `altRelance` **bloquant** exécuté dans le renderer réel : ligne de tête = cible au meilleur
score (⭐ 9/10 affiché), clic réel sur la chip → statut « relance » ✅. 391 tests verts.

## Contexte

Build **2.0.18**. Pas de Release (lot 2.0.12→18). Le poste alternance est maintenant complet :
cible du jour → candidature en un clic → relances en un clic → recherche/filtre → refus rangés.
