# #366 — Coach adaptatif : taux de suivi des conseils (3.0 · Vague 1) (2.0.10)

Suite logique de #365 : le coach a une mémoire (`coachLog`) — on peut donc **mesurer si ses conseils
servent**, au lieu de conseiller dans le vide.

## Ce qui change

- **`coachFollowThrough(state, todayKey, windowDays=7)`** (pur + testé) : pour chaque jour journalisé
  des 7 derniers jours **révolus** (le jour en cours ne compte pas, il n'est pas fini), le conseil est
  « suivi » si le pilier proposé a eu une activité **ce jour-là** (mêmes définitions que les piliers ;
  alternance = candidature datée du jour). Renvoie `{ total, followed, rate }` ou `null`.
- **Affichage** : sous la carte « Le focus du moment », une petite ligne `#coachFollow` —
  « 📈 Conseils suivis : 3/4 sur 7 jours », avec « beau suivi ! » à ≥ 70 % et « un petit geste par
  jour suffit. » à ≤ 30 % (encourage sans culpabiliser). **Masquée sous 2 jours de données** (bruit).
- Garde-fou CSS `.coach-follow[hidden]{display:none}` (le piège du `display:` qui écrase `hidden`).

## Vérification navigateur

4 jours journalisés / 3 suivis → « 📈 Conseils suivis : 3/4 sur 7 jours — beau suivi ! » ✅ ;
1 seul jour de journal → ligne masquée ✅. Aucune erreur console.

## Tests

383 tests (`coachFollowThrough` : jour en cours exclu, fenêtre 7 j, aucun journal → null, alternance
suivie = candidature du jour) + smoke `coachFocus` étendu (fonction + élément + calcul 1/2 = 50 %).

## Contexte

Build **2.0.10**. Pas de Release (regroupée). La boucle du coach est maintenant fermée :
il **observe** (piliers), **priorise** (alternance d'abord), **se souvient** (anti-radotage) et
**s'évalue** (taux de suivi). Prochaines pistes Vague 1 : bilan hebdo du coach, lien coach ↔ objectifs.
