# #320 — Révisions par matière : voir laquelle est en retard (1.9.254)

## Le manque (domaine révisions BTS — cher à Adrien)

Les révisions sont suivies globalement : `studyStats` compte total/faites/à venir sur TOUTES les
séances `kind:'study'` confondues. Or un BTS CG a plusieurs matières (Compta, Droit, Éco,
Management…). Impossible de voir **laquelle est négligée** — le total global peut sembler bon alors
qu'une matière n'a jamais été révisée.

Vérifié avant de coder : aucun suivi par matière (`grep matiere|subject|topic` → rien). Mais le
modèle le supporte déjà — le planificateur a un champ `#studyTitle` : on peut planifier « Compta »
le lundi, « Droit » le mardi, etc. Le titre sert donc naturellement de matière. Il n'était juste
pas exploité.

## Ce qui change

Fonction pure `studyBySubject(agenda, todayKey)` : regroupe les séances `study` par titre (=
matière) et trie par **priorité de révision** — d'abord le plus de retard (prévu, passé, non fait),
puis le plus faible taux de complétion, puis le plus de séances à venir. Renvoie par matière :
`{subject, total, done, upcoming, overdue, doneRate}`.

Affiché sous le rythme de révision (`#studySubjects`), **seulement s'il y a ≥ 2 matières** (sinon le
total global suffit, aucune valeur ajoutée) :
- un titre « 🎯 À prioriser : **Droit** (0/3, 2 en retard) » pointant la matière la plus en retard ;
- une puce par matière, colorée : rouge si des séances sont en retard, verte si ≥ 67 % faites,
  ambre entre les deux.

## Vérification navigateur

Semé Compta (2/3, à jour), Droit (0/3, 2 en retard), Éco (1/1) :

| Élément | Résultat |
|---|---|
| Priorité affichée | ✅ « 🎯 À prioriser : Droit (0/3, 2 en retard) » |
| Puces colorées | ✅ Droit rouge · Compta vert · Éco vert |
| 1 seule matière | ✅ panneau masqué |
| Aucune révision | ✅ masqué |

## Tests

348 tests `node:test` (+ `studyBySubject` : tri par priorité, retard/à venir/faites, titre vide →
« Révision », vide) + smoke `studySubjects` **bloquant**.

## Rotation

#320 — début de la rotation 28 (build 1.9.254).
