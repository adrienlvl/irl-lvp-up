# #315 — Conflit d'horaire : l'app propose le prochain créneau libre (1.9.249)

## Le point de départ : ma propre livraison précédente

Avant de choisir une nouveauté, j'ai relu #314. J'y avais ajouté `scheduleConflicts` mais je ne
l'avais **vérifié qu'en logique pure**, jamais dans le vrai flux navigateur. Première chose faite
cette itération : le vérifier de bout en bout.

**Vérification de #314 (port 8137, tab seed)** — avec une « Muscu 18:00–19:00 » déjà à l'agenda :

| Scénario | Résultat |
|---|---|
| Ajout à 18:30 (en plein dedans) → `confirm()` appelé | ✅ message correct |
| Refuser le `confirm` → l'ajout est bloqué | ✅ agenda inchangé |
| Ajout à 07:00 (créneau libre) → pas de `confirm` | ✅ ajouté directement |

`scheduleConflicts` est donc bon. Mais en le testant, un manque a sauté aux yeux : l'app dit
« c'est pris », et… c'est tout. Elle ne dit pas **où ça rentre**. C'est la vraie itération #315.

## Ce qui change

Nouvelle fonction pure `nextFreeSlot(agenda, opts)` : à partir d'une heure et d'une durée voulues,
elle renvoie le premier créneau du jour qui accueille toute la durée sans chevaucher un bloc
horaire. Branchée dans l'avertissement de conflit, qui passe de :

> ⚠️ Chevauchement le 20/07/2026 : • 18:00–19:00 · Muscu. Ajouter quand même à 18:30 ?

à :

> ⚠️ Chevauchement le 20/07/2026 : • 18:00–19:00 · Muscu. **💡 Prochain créneau libre : 19:00.**
> Ajouter quand même à 18:30 ?

On ne dit plus seulement non : on donne l'info qui permet de décider entre « tant pis, je
superpose » et « ah, 19:00 est libre, je décale ». Vérifié en navigateur : la ligne 💡 apparaît
bien avec la bonne heure dans le vrai flux `#addPlan`.

## Règles assumées (verrouillées par les tests)

- **Contact bord à bord autorisé** : 19:00 juste après un bloc qui finit à 19:00 n'est pas bloqué
  — cohérent avec `scheduleConflicts` (le chevauchement est strict).
- **Journée entière / terminé / soi-même** ne bloquent pas (mêmes exclusions que la détection).
- **Fin de journée** par défaut à 22:00 : si rien ne rentre avant, renvoie `null` et aucune
  suggestion n'est affichée (l'avertissement reste, sans la ligne 💡).
- **Convergence garantie** : chaque collision pousse le candidat à la fin du bloc heurté ; comme
  les blocs sont triés, la boucle converge (garde-fou à 500 itérations par sécurité).

## Tests

344 tests `node:test` + smoke verts. Nouveau test `nextFreeSlot` : créneau poussé à la fin du
bloc, durée qui force un saut supplémentaire, contact bord à bord, créneau déjà libre renvoyé tel
quel, rien avant la fin de journée, auto-exclusion en édition, entrées invalides.

## Clôture de rotation

#315 clôt la **rotation 26** (#313 photos compressées → #314 poids cible dans le plan → #315
créneau libre). Tag `v1.9.249` poussé → auto-publication GitHub Actions.
