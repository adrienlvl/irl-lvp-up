# 699 — Standards de force : version poids du corps (reps) — correctif retour Adrien (2.0.298)

## Contexte

Retour direct d'Adrien sur #698 : « tu mets un truc de force que je dois mettre, mais j'ai pas de poids, je fais
principalement les exercices **au poids du corps** ». Juste : `strengthStandards` (#698) ne classait que les
mouvements de **barre chargés** (ratio 1RM/PdC) → **inutile** pour un pratiquant en calisthénie (tractions,
pompes, où `estimate1RM` avec charge 0 renvoie null).

## Le correctif — deux métriques

`strengthStandards(workouts, bodyweight, {sex})` réécrit pour se situer de **deux façons** (`STRENGTH_MOVEMENTS`
avec `type: 'reps' | 'ratio'`) :

- **Poids du corps (`reps`)** — `Tractions` et `Pompes` classées par le **MEILLEUR nombre de reps sur une série**
  (Débutant→Élite ; tractions [3,8,13,20], pompes [12,25,40,60]). **Aucun poids de corps requis.** Variantes de
  scaling exclues pour rester honnête (tractions **négatives** = assistées, pompes **inclinées** = plus faciles,
  **gilet lesté** = chargé).
- **Barre (`ratio`)** — squat/DC/SDT/DM classés par ratio 1RM estimé ÷ poids de corps (femme ×0,72), affichés
  **seulement** si un poids de corps est noté.

Chaque item renvoie `{metric, value, unit, detail, level, nextLevel, toNext, toNextUnit}`. Le rendu
(`renderStrengthStandards`) affiche « X reps max · +Y reps → niveau » ou « ×ratio PdC · +Z kg → niveau », plus
d'exigence d'un poids de corps pour la partie calisthénie.

## Non-régression

- **Test node réécrit** : reps au poids du corps (12 tractions → Intermédiaire, +1 rep ; 30 pompes →
  Intermédiaire), Élite (22 tractions → niveau max), barre par ratio (nécessite le poids), **sans poids → barre
  omise mais reps conservées** (le fix), variantes exclues, garde-fous null/[].
- **Check smoke `strengthStd`** mis à jour (branche reps sans poids + branche ratio).
- Vérifié en navigateur (Tractions 11 / Pompes 32) : « 🆙 Tractions · Intermédiaire · 11 reps max · +2 reps →
  Avancé », « 🙌 Pompes · Intermédiaire · 32 reps max ». **591 tests + SMOKE OK.**

## Leçon

Une feature « fondée science » doit coller au **vrai usage** de l'utilisateur : le pratiquant vise le poids du
corps, la « force » s'y mesure en reps/progression de variante, pas en 1RM chargé. Corriger tôt sur retour direct.

Domaine : athlete
