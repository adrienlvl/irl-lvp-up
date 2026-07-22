# 700 — Standards de force : calisthénie + gilet lesté, plus AUCUNE barre (2.0.299)

## Contexte

Retour d'Adrien (précision) : « **TOUT l'onglet Athlète** doit être dans la logique du **poids du corps ou
gilet lesté**, je te l'avais dit ». Juste : après #698/#699 la carte gardait encore les 4 mouvements de **barre**
(squat/DC/SDT/DM) en option — hors-sujet pour son entraînement (calisthénie + gilet). Correction définitive.

## Le changement — `strengthStandards(workouts, bodyweight)` réécrit

- **Mouvements = calisthénie uniquement** : Tractions, Pompes, Dips. **Squat/DC/SDT/DM supprimés.**
- **Classement par reps** au poids du corps (Débutant→Élite ; tractions [3,8,13,20], pompes [12,25,40,60], dips
  [5,12,20,30]). **Aucun poids de corps requis** pour cette voie.
- **Gilet lesté converti honnêtement** : une série lestée (`load>0`) est transformée en **reps ÉQUIVALENTES au
  poids du corps** via Epley — `eff = 30·((bwFrac·PdC + charge)/(bwFrac·PdC)·(1+reps/30) − 1)`. Ainsi 5 tractions
  +20 kg (≈14 reps équiv., **Avancé**) valent davantage que 12 à vide (Intermédiaire) → **progresser en reps OU en
  lest fait monter le niveau**, sans mélanger deux échelles. `bwFrac` = fraction du poids réellement soulevée
  (pompes ≈ 0,65). La meilleure série (par reps équivalentes) l'emporte. Détail affiché : « 5 reps +20 kg (gilet) ».
- Shape simplifié `{key, label, emoji, reps, load, effReps, detail, tier, level, nextLevel, toNext}` ; plus de
  `metric/unit/ratio/sex`. Rendu + note mis à jour.

## Le reste de l'onglet Athlète

Vérifié : le générateur de programme et la bibliothèque **respectent déjà la config MATÉRIEL** d'Adrien
(poignées de pompes, gilet lesté, kettlebell, barre de traction) — smoke `equipmentFilter` + `objectiveEquipment`
verts. Ils ne proposent donc pas de mouvements de barre. La carte Standards était le seul endroit qui l'ignorait.

## Non-régression

- Test node réécrit : reps au poids du corps (sans poids), gilet converti (5+20 kg → Avancé), meilleure série
  gagne, **barre ignorée** (squat/DC → []), Élite (22 tractions), variantes exclues (négatives/inclinées),
  garde-fous. Check smoke `strengthStd` (poids du corps + gilet + pas de barre). **591 tests + SMOKE OK.**
- Vérifié en navigateur avant publication.

## Leçon (renforcée)

Coller au VRAI usage : Adrien s'entraîne **au poids du corps + gilet**, pas à la barre — toute feature muscu doit
partir de là (cf. mémoire `coaching-elite-science`). Corrigé en 3 passes sur retour direct ; garder ce réflexe.

Domaine : athlete
