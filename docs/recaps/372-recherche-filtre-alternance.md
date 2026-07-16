# #372 — Alternance : recherche + filtre par statut dans le suivi (2.0.16)

Changement de domaine (règle VARIER) pour un besoin réel immédiat : depuis la sync des Cibles,
le suivi affiche ~503 candidatures — retrouver une entreprise = long défilement. Et la question
ouverte d'Adrien (« 503 visibles, c'est trop ? ») trouve ici une première réponse concrète.

## Ce qui est livré

- **`filterApplications(apps, {query, status})`** (pur + testé) : recherche plein-texte insensible
  aux accents/casse sur entreprise + poste + source (la ville y vit) + notes, combinable avec un
  filtre par statut. Entrées cassées ignorées.
- **UI** : barre 🔍 + sélecteur de statut au-dessus de la liste, **visibles seulement à partir de
  8 candidatures** (pas de bruit sur une petite liste). Compteur « 1 / 500 » pendant le filtrage.
- **Interaction fine avec le masquage des refusées** : filtrer explicitement sur « 🚫 Refusé »
  réaffiche les refusées le temps de la consultation (sinon un filtre refus + masquage = 0 résultat
  incompréhensible).
- Filtres **transitoires** (variables d'UI, pas persistés dans l'état).

## Vérification navigateur (échelle réelle)

500 candidatures : rendu 17 ms ; recherche « kpmg lorient » → **2 ms**, 1 résultat, compteur
« 1 / 500 » ; filtre Refusé → les 100 refusées réapparaissent ; barre visible ✅. 0 erreur console.

## Tests

389 tests (accents léa↔LEA, recherche dans poste/source/notes, statut seul et combiné, entrées
cassées) + smoke `altFilter` **bloquant** (vrai événement `input` → 1 résultat, compteur, reset).

## Contexte

Build **2.0.16**. Pas de Release (prochain lot 2.0.12→16). Vague 2 en toile de fond ; reste à
cadrer : photos PWA → IndexedDB (migration réelle), schéma versionné.
