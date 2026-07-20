# #583 — Docs : la roadmap P5.2 ne renvoie plus vers une piste coach déjà close (#582)

**Build** : inchangé (2.0.201 — docs seuls, pas de bump). **Domaine** : `docs`.

## Contexte de rotation (§4 bis)

5 derniers domaines (recaps #582→#578) = `coach · fondations · docs · coach · a11y`.

- `coach` (priorité de nuit #1) est dans le **dernier** recap (#582) **et** 2× sur 5 → **rotation-bloqué**
  ce tour (§3 : la rotation prime même sur la demande de nuit).
- `fondations` (#581, dernier−1) → interdit (2 derniers).
- `docs` (#580, 1×, hors des 2 derniers) → **autorisé**.

## Hunt de l'itération : backlog code nommé épuisé (domaines autorisés)

Toutes les tâches nommées de « 🎯 Prochaines priorités » sont cochées (P1 propositions écrites, P2/P4/P5
mesurés, P6/P7 clos). Sonde de vrais manques dans les domaines autorisés, méthode P5 (« mesurer ») :

- **a11y** : tous les boutons icône (`installBtn`, `densityToggle`, `themeToggle`, flèches mois/semaine,
  fermetures `×`, `backToTop`, `todoPriorityBtn`…) ont **déjà** un `aria-label` ou un texte visible qui
  fait office de nom accessible ; les boutons vides sont remplis par JS au rendu. Aucun manque.
- **fonctions pures** : aucune fonction exportée non testée ; anniversaires (`birthdaysForDay`,
  `upcomingBirthdays`, `ageLabel`) gèrent le cas **29 février → 1ᵉʳ mars** et l'âge inconnu, `bmiInfo`
  garde poids/taille 0, `proteinTarget` a un défaut sûr. Robustes et couvertes.
- **accords singulier/pluriel** des textes utilisateur (`séance${…>1?'s'}`, `jour${…}`, `carte${due>1?'s'}`)
  : tous accordés sur la **bonne** variable (le bug type #552 est un cas isolé déjà corrigé).

→ Aucun bug prouvable à corriger. §783 option 3 : **curation docs**.

## Incohérence documentaire réelle corrigée

Le header « État actuel » du #582 acte la **correction** de la piste coach « Encore un jour actif
aujourd'hui » (le renfort nutrition radotait un geste **déjà posé** un jour `doneToday`). Mais la
**checklist P5.2** (`docs/ROADMAP.md`) la présentait encore comme :

> « Reste **une piste coach vérifiée** en réserve (rotation-bloquée) … à appliquer en prochaine boucle
> coach-ouverte. »

C'est une trace **périmée** : elle pousserait la prochaine itération `coach` à **re-chasser une piste déjà
close** — exactement l'anti-pattern « 60 itérations dans la même fonction » que la rotation §4 bis combat.

**Fix (docs seuls)** :

1. **ROADMAP P5.2** : la piste nutrition/sommeil est marquée **corrigée #582** et **close** ; P5.2 est
   déclaré **close** (2 angles mesurés — coach↔Bilan hebdo #577/#579, coach↔« Ma journée » #580 — et les
   pistes qu'ils ont fait sortir sont résolues). Note ajoutée : la piste coach **encore ouverte** est
   **distincte** de P5.2 — `sportSlot`/`sportZoneFocus` (`logic.js:6787/6832`) sont gardés `loadSpike==null`
   et `readiness>=50` mais **pas** `readinessSlide==null` → ils appendent « cale ta séance là » / « cible en
   priorité X » à une action « Séance allégée » ; contradiction **douce** action↔action, à **confirmer en
   rendu chargé** (§4 ter) avant de coder, lors de la prochaine boucle `coach`.
2. **Mémoire** `coach-leads-contradictions-2guards` : description réconciliée (P5.2 mesuré **+ close**,
   piste « Encore un jour actif » **corrigée #582**, seule piste coach encore ouverte = sportSlot/
   sportZoneFocus).

## Vérification

`cd src && xvfb-run -a npm run verify` — 100 % vert (533 tests + smoke). Aucun code touché, aucun texte
utilisateur modifié → §4 ter sans objet. Pas de bump (§2.6).

Domaine : docs
