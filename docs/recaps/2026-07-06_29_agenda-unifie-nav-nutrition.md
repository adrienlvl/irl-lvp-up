# Récap boucle #31 — Agenda unifié + nav regroupée + Nutrition en onglet (D1+D2) → Vague 6 terminée

**Quand :** 2026-07-06
**Vague :** 6 (UX) — D1, D2 + promotion Nutrition
**Statut :** ✅ vérifié (56/56 tests, smoke OK, checks fonctionnels OK, build 1.1.7)

## D1 — Agenda unifié ✅
- Un seul onglet **« Agenda »** (ex « Ma semaine ») avec bascule **Vue semaine ↔ Vue mois** (bouton « 🗓️ Vue mois » dans la vue semaine, « 🗓️ Vue semaine » dans la vue mois). Fini les 2 entrées de nav séparées.
- Réutilisation des ids existants (`openCalendarPage`) → aucun handler cassé.

## D2 — Navigation regroupée ✅
- **7 → 6 onglets** : Aujourd'hui · Agenda · Athlète · Exercices · **Nutrition** · Focus & vie.
- **Ultra-trail** n'est plus un onglet : rangé dans la page **Athlète** (bouton contextuel dans le panneau « Objectif Ultra-trail »).

## Bonus — Nutrition promue en onglet top-level (demande d'Adrien) ✅
- La nutrition sort du sous-onglet Athlète pour devenir un **onglet à part entière** (nutrition + compléments), afin d'y greffer plus tard : **scan du frigo → liste de courses → suggestions de repas** à partir du contenu du frigo, suivi macros…
- Grille nutrition/planning **séparée proprement** : le planificateur de semaine revient dans **Athlète/Séance** (sa vraie place), la nutrition part dans l'onglet Nutrition.
- Sous-onglets Athlète réduits à **Séance + Mes progrès** (garde-fou : un ancien onglet « nutrition » mémorisé retombe sur « seance »).

## Vérifications
- `node --check` OK · `npm test` 56/56 · smoke `SMOKE OK`.
- Check : nav = 6 boutons attendus ; Nutrition page = 2 blocs ; planning en Séance ; nutrition hors Athlète ; Ultra dans Athlète ; bascules semaine/mois OK.
- Rebuild **1.1.7** (packagée testée).

## 🏁 Vague 6 (UX) terminée
A1 (sections rangées) · A2 (repliables) · C1 (dashboard) · C2 (form agenda) · B2 (onglet Exercices) · B1+B3 (Athlète en sous-onglets) · D1 (agenda unifié) · D2 (nav 6 onglets) · Nutrition en onglet.

## Git
- Commit : `feat(ux): agenda unifié + nav 6 onglets + Nutrition en onglet (D1+D2) + build 1.1.7`.
