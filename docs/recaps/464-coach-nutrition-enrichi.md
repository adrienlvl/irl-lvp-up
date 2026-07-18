# #464 — Coaching adaptatif : focus nutrition enrichi (2.0.95)

Priorité de la nuit (DEMANDES.md) : pousser le **Coaching adaptatif** à fond. Après le sommeil
(#459→461), c'est au tour de la **nutrition** de passer d'un conseil aveugle à un conseil chiffré et
actionnable — le pilier restait le seul à parler générique.

## Le problème

Dans `adaptiveCoachFocus`, quand le focus tombait sur la nutrition, l'insight n'était qu'un compteur
de jours actifs et l'action une consigne figée (« Renseigne tes protéines et ton eau du jour »).
Pourtant sport et focus citent déjà leur objectif hebdo, et le sommeil affiche tout `sleepCoachInsight`.
La nutrition avait à côté d'elle `proteinTarget` (cible calée sur le poids + l'objectif),
`proteinStreak`, `proteinDaysOnTarget` et `proteinSnackSuggestion` — totalement ignorés par le coach.

## Ce qui change (1 greffe pure dans `adaptiveCoachFocus`)

Quand le pilier choisi est **nutrition** et qu'un profil existe :
- **Cible réelle** : `proteinTarget(profile.weight, profile.goal).gramsPerDay` (ex. 80 kg + force → 150 g).
- **Insight adaptatif** : si une **série** protéines court (≥ 2 j d'affilée à la cible), on la cite
  pour ne pas la casser (« 🔥 2 jours d'affilée à ta cible protéines (150 g) ») ; sinon la
  **régularité 7 j** (« 3/7 jours à ta cible protéines (150 g) »).
- **Action concrète** : `proteinSnackSuggestion(consommé du jour, cible)` propose la collation qui
  comble l'écart restant (« Il te reste 40 g de protéines — Un shaker de whey (~24 g) comble
  l'écart »). Si la cible du jour est déjà tenue → félicitation (« Cible protéines tenue (160/150 g) »).
- **Dégradation propre** : sans profil (pas de cible exploitable) → l'action générique d'avant.

## Vérification

- Décrochage nutrition + aucun autre pilier → focus **nutrition**, insight régularité chiffrée,
  action « Il te reste 150 g… » avec collation citée.
- Série 2 j → insight bascule sur la série ; cible du jour tenue → félicitation.
- Sans profil → action générique conservée (pas de faux chiffres).

## Tests

452 tests (nouveau test : cible attendue, insight régularité vs série, action collation vs
félicitation, dégradation sans profil) + check smoke **bloquant** `coachFocus` étendu (rendu réel :
focus nutrition, cible 150 g dans l'insight, « Il te reste 150 g » dans l'action). Verify 100 % vert.

## Contexte

Build **2.0.95**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
La chaîne s'étend : le coach parle désormais chiffres et actions concrètes sur les 4 piliers
(sport/focus objectifs, sommeil verdict+plan, nutrition cible+collation). Prochaine piste : enrichir
de même le pilier **focus** hors objectif, ou brancher `coachFollowThrough` dans le ton du message.
