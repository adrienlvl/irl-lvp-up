# #461 — Le coach cite la preuve d'impact du sommeil (2.0.91)

Boucle refermée entre les 3 approfondissements précédents : le coach (#459) et la preuve d'impact
(#460) se parlent enfin. Un « pourquoi » chiffré et personnel motive plus qu'une consigne générique.

## Ce qui change

Dans `adaptiveCoachFocus`, quand le focus est le **sommeil**, l'action gagne une **preuve tirée des
propres données d'Adrien** via `sleepImpactReport(s, todayKey)` :
- si l'énergie du lendemain est meilleure après un coucher tôt (`deltas.energy >= 0.5`) →
  « … Tes soirs couché tôt = +2 d'énergie le lendemain. »
- sinon, si le focus du lendemain gagne ≥ 15 min → « … Couché tôt, tu enchaînes +X min de focus… »
- sinon (pas de preuve exploitable) → l'action reste le conseil seul (dégrade proprement).

## Vérification navigateur (rendu réel)

Sommeil court + irrégulier (5.6 h, coucher ±90 min) avec couchers tôt=énergie 4 / tard=énergie 2 →
action « Couche-toi à heure fixe ce soir, même le week-end. **Tes soirs couché tôt = +2 d'énergie le
lendemain.** » ✅. Aucune erreur console.

## Tests

451 tests (focus sommeil + action citant `/couché tôt = \+\d/` ; non-régression : sans données
d'impact, l'action reste le conseil seul) + smoke coachFocus déjà couvert.

## Contexte

Build **2.0.91**. Sur `master` + PWA ; **pas de Release** (regroupée). La chaîne Coaching × Sommeil
est complète : observe → priorise (alternance/funnel) → détecte le sommeil en alerte → conseille la
cible du soir → **prouve pourquoi ça vaut le coup**. Builds 2.0.88 → 2.0.91 prêts à publier.
