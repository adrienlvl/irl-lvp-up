# 698 — Athlète : Standards de force relatifs au poids de corps (2.0.297)

## Contexte

Session LOCALE. Adrien : « continue les améliorations, **surtout la partie athlète** ». La section Athlète est
déjà très fournie (blocs périodisés, phases, décharge RP, volume/zone MEV-MRV, push/pull, prévision de palier,
records, tonnage, séance guidée…). Un **vrai manque** repéré : nulle part l'app ne dit *« suis-je fort POUR MON
POIDS DE CORPS ? »* — la question la plus motivante pour un pratiquant de force.

## Le changement — feature `strengthStandards`

- **Logique pure** (`lib/logic.js`, exportée) : `strengthStandards(workouts, bodyweight, {sex})` classe les
  **4 grands mouvements de barre** (squat, développé couché, soulevé de terre, développé militaire) du **Débutant
  à l'Élite** selon le ratio **1RM estimé ÷ poids de corps**. Seuils d'ordre de grandeur largement établis (type
  StrengthLevel/ExRx), **ajustés femme ×0,72**. Rend par mouvement : niveau, ratio, 1RM, kg jusqu'au palier
  suivant, seuils. Match par mots-clés normalisés ; **exclut les variantes** (squat bulgare/gobelet, SDT roumain…).
- **Rendu** (`app.js` `renderStrengthStandards`, onglet Athlète → « Mes progrès », après le palmarès) : carte
  `#strengthStandards` — par mouvement, une ligne niveau + barre colorée (débutant gris → élite lime) + « ×ratio
  PdC » + « +X kg → niveau suivant ». Poids de corps = dernière pesée (repli `profile.weight`). État vide honnête
  si pas de poids / pas de mouvement chargé.
- **CSS** (`pages.css`) : `.strength-standards` (lignes, barres, niveaux colorés).

## Cadre (mandat élite « ambitieux mais sûr »)

Un standard **situe**, il ne **prescrit pas** : aucune consigne de charge, formulé comme « repère motivant, pas
un jugement ». Pas de sur-promesse.

## Non-régression

- **Test node dédié** : classement squat/DC/SDT/DM, ratio femme (→ niveau plus haut), Élite (niveau max, pas de
  palier suivant), variante exclue (squat bulgare), garde-fous (pas de poids → [], charge nulle → [], null → []).
- **Check smoke bloquant `strengthStd`** (structure + garde-fous, includes/comparaisons, pas de regex).
- Vérifié en navigateur (données seedées, 79,4 kg) : 3 mouvements classés Novice, ratios + « +X kg → Intermédiaire »,
  barres à 25 %. **591 tests + SMOKE OK.**

Domaine : athlete
