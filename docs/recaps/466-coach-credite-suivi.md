# #466 — Coaching adaptatif : le coach crédite un suivi élevé (2.0.97)

Priorité de la nuit (DEMANDES.md) : pousser le **Coaching adaptatif** à fond. Le #465 a donné au
coach une conscience méta **négative** (conseil ignoré → il abaisse la barre). Cette itération livre
son **pendant positif** : quand Adrien SUIT bien les conseils, le coach le reconnaît et lui renvoie
le mérite.

## Le problème

`coachFollowThrough(state, todayKey, windowDays)` mesurait déjà le taux de suivi des conseils
(pour chaque jour journalisé dans `s.coachLog`, le pilier poussé a-t-il eu une activité ce jour-là).
Mais son résultat n'alimentait **qu'une ligne d'affichage séparée** (`#coachFollow`) — il
n'**influençait pas** le message du coach. Les deux recaps précédents (#464, #465) pointaient
explicitement cette piste : « brancher `coachFollowThrough` dans le ton du message », « célébrer un
`coachFollowThrough` élevé dans un focus reinforce ».

Résultat : même quand Adrien enchaînait les conseils tenus, le ton `reinforce` restait générique
(« Ton entraînement monte en régime. Garde le rythme. Encore un jour actif aujourd'hui… »). Un
renforcement qui ignore l'effort réel rate l'occasion de nommer l'agentivité — le vrai moteur de la
motivation intrinsèque.

## Ce qui change (1 greffe pure dans `adaptiveCoachFocus`)

Quand le coach **renforce** un bon élan (tone `reinforce`, **hors rotation** — on ne crédite pas un
suivi juste après avoir fui un pilier ignoré) ET que le suivi récent est élevé
(`coachFollowThrough(s, todayKey, 7)` avec `total ≥ 3` jours journalisés **et** `rate ≥ 70 %`) :

- **Insight** complété d'une reconnaissance chiffrée et personnelle : « Tu as tenu 5/6 de mes caps
  cette semaine — cet élan, c'est **toi** qui le construis. »
- **Action** recentrée sur l'agentivité : « Un jour actif de plus aujourd'hui : tu prouves que la
  régularité te ressemble. »
- Champ `followThrough` exposé (le taux, ou `null` sinon — testable, stylable plus tard).

Seuils choisis pour éviter la flatterie creuse : `total ≥ 3` (assez de signal, pas 1-2 jours) et
`rate ≥ 70 %` (un suivi vraiment élevé, pas « la moitié du temps »). Symétrique du micro-pas #465 :
là on **abaisse la barre** quand ça ne prend pas, ici on **renvoie le mérite** quand ça prend.

## Vérification

- Sport en hausse + 3 conseils sport suivis (séance ces jours-là) → `followThrough=100`, insight
  « 3/3 de mes caps », « c'est toi qui le construis », action « la régularité te ressemble ».
- Sans journal → `followThrough=null`, insight générique inchangé.
- 2 jours journalisés seulement (< 3) → pas de crédit (seuil de signal).
- 3 jours journalisés mais **non suivis** (rate < 70 %) → pas de crédit (pas de flatterie).

## Tests

454 tests (nouveau test dédié : crédit à suivi élevé, seuils total/rate, dégradation sans journal) +
check smoke **bloquant** `coachFocus` étendu (rendu réel : `reinforce`, `followThrough=100`, insight
« toi qui le construis »). Verify 100 % vert.

## Contexte

Build **2.0.97**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
Le coach est désormais méta-conscient dans les **deux** sens : il abaisse la barre quand on décroche
(#465) et renvoie le mérite quand on assure (#466). Prochaine piste : enrichir le pilier **focus**
hors objectif (seul pilier encore générique), ou moduler la fréquence des micro-pas.
