# #460 — Le sommeil prouve son effet sur le lendemain (`sleepImpactReport`) (2.0.90)

3ᵉ approfondissement de la reprise « faire évoluer l'app ». Idée n°2 du jury (valeur 89) : le moteur
de motivation qui **légitime** tout le système de recalage — montrer noir sur blanc que se coucher
tôt paie est bien plus mobilisant qu'un verdict de qualité isolé.

## Ce qui est livré

- **`sleepImpactReport(state, todayKey, opts)`** (pur + testé) : pour chaque nuit chiffrée avec une
  heure de coucher (`bedtime`), corrèle le coucher avec les résultats de la journée qui suit (= même
  date d'entrée, car `bedtime` est saisi le matin = coucher de la veille au soir) : **énergie du
  matin** (morningRituals), **minutes de focus**, séance, candidature. Sépare les nuits en deux
  paquets par la **médiane de tes propres couchers** (couché tôt vs tard, adapté à toi) et compare.
  Renvoie `{ nights, split, early, late, deltas, verdict, confidence }`. `null` si < 4 nuits datées
  ou pas de contraste ; `confidence:'low'` si un paquet a < 4 nuits. Verdict **sign-aware** (honnête
  quand le coucher ne change rien).
- **Écran** : carte `#sleepImpact` sur la page Récupération, sous le bilan sommeil — « 📊 L'effet de
  ton coucher : les soirs où tu te couches avant 23:45, ton lendemain a plus d'énergie : 4/5 contre
  2/5… Se coucher tôt paie. »

## Vérification navigateur (rendu réel)

10 nuits (5 tôt 22:30 / 5 tard 01:00), lendemains énergie 4/60 min vs 2/15 min → split médian 23:45,
verdict « 4/5 contre 2/5… Se coucher tôt paie » ✅. Aucune erreur console.

## Tests

451 tests (deltas énergie/focus, split médian, `null` si < 4 nuits / pas de contraste / sans coucher,
`confidence:'low'`) + smoke `sleepImpact` **bloquant** (rendu réel de la carte via `renderWeeklySleep`).

## Contexte

Build **2.0.90**. Sur `master` + PWA ; **pas de Release** (regroupée). Les **3 meilleurs
approfondissements du jury** sont livrés : funnel coach (#458), coach conscient du sommeil (#459),
preuve d'impact du sommeil (#460). La boucle Coaching × Sommeil est bouclée.
