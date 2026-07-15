# #323 — Focus : où est passé ton temps, par tâche (1.9.257)

## Le manque (domaine focus)

Les blocs de focus enregistrent `{date, minutes, task}` : le champ **task** note sur quoi tu t'es
concentré. Mais rien ne l'exploitait — `focusWeekGoal` donne le total de minutes, la heatmap montre
QUAND, mais jamais **SUR QUOI**. La question « sur quoi ai-je vraiment passé mon temps cette
semaine ? » restait sans réponse.

Vérifié avant de coder : aucun regroupement par tâche (`grep focusByTask|byTask` → rien).

## Ce qui change

Fonction pure `focusByTask(sessions, todayKey, opts)` : regroupe les minutes de focus par tâche sur
une fenêtre (7 jours par défaut), trie par temps décroissant, donne le % de chacune. Renvoie
`{ total, tasks: [{task, minutes, sessions, pct}] }`.

Affiché sous l'objectif focus hebdo (`#focusByTask`), **seulement s'il y a du focus ET ≥ 2 tâches**
(sinon la répartition n'apprend rien) :
- un titre « 🧠 Où est passé ton focus (7 j) · 2 h 30 min » ;
- une barre par tâche, largeur = part du temps, avec le temps formaté (h/min).

## Vérification navigateur

Semé compta (1 h 15), projet perso (45 min), droit (30 min) + un ancien bloc hors fenêtre :

| Contrôle | Résultat |
|---|---|
| Total sur 7 j (ancien bloc exclu) | ✅ 2 h 30 |
| Barres proportionnelles | ✅ 50 % / 30 % / 20 % |
| Temps formaté h/min | ✅ « 1 h 15 min » |
| 1 seule tâche | ✅ masqué |
| Aucun focus | ✅ masqué |

## Tests

350 tests `node:test` (+ `focusByTask` : fenêtre, exclusion hors-fenêtre et 0 min, titre vide →
« Sans titre », tri, %, cap, invalide) + smoke `focusByTask` **bloquant**.

## Clôture de rotation

#323 **clôt la rotation 28** (#320 révisions par matière → #321 digest « À rattraper » → #322
navigation du digest → #323 focus par tâche). Tag `v1.9.257` → auto-publication.
