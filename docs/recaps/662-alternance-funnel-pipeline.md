# 662 — Alternance : barre-pipeline visuelle des candidatures (2.0.270)

## Contexte

Passe qualité UI, **itération 8/N** (mandat `passe-qualite-ui`). Cette fois une **page** (pas un composant
transverse), et la plus importante pour Adrien : **Alternance** (sa recherche de contrat). Inspection au rendu :
la donnée du pipeline existe déjà (`applicationStats().byStatus` = à postuler / postulé / relancé / entretien /
accepté / refus) mais n'était montrée que comme **texte** (« 📤 3 envoyées · 🤝 1 entretien · 📊 67 % »). Aucune
vue d'ensemble visuelle de l'avancement.

> Domaine `alternance` (pas `fondations`) — casse volontairement la série UI pour la rotation, et c'est
> exactement le bon tag (page métier d'Adrien).

## Le changement

- **Logique pure** (`lib/logic.js`) : `applicationFunnel(stats)` → répartit `byStatus` en 5 étapes ORDONNÉES du
  pipeline (`FUNNEL_STAGES`, chacune sa couleur), renvoie `{stages[{key,label,color,count}], sum, refus}`. Le
  **refus est à part** (sortie du pipeline, exclu de la barre et du `sum`). Robuste : entrée nulle/invalide →
  structure stable à 0. Exporté.
- **Rendu** (`app.js`, `renderAlternance`) : sous les chips de stats du hero, une **barre segmentée** (segments
  proportionnels `count/sum`, couleur par étape, `title` = infobulle) + une **légende chiffrée** listant les 5
  étapes (même les 0) et les refus à part. Ne s'affiche que si `sum > 0`.
- **CSS** (`pages.css`) : `.alt-funnel` (barre 10px arrondie, segments à gap 2px, légende à pastilles colorées).

## Non-régression

- **Test node dédié** `applicationFunnel` (ordre des 5 étapes, comptes, `sum` hors refus, `refus` à part,
  couleurs présentes, robustesse vide/null) → **578 tests** (+1).
- **Check smoke BLOQUANT `altFunnel`** (fonction + forme : 5 étapes ordonnées, `sum` hors refus, `refus` séparé,
  `null` → sum 0) — en includes/comparaisons, **pas de regex** (piège template literal, cf. #659).
- Vérifié en navigateur (5 candidatures seedées : 2 à postuler / 1 relancé / 1 entretien / 1 refus) : barre =
  3 segments 50 %/25 %/25 % aux bonnes couleurs, légende complète, refus compté à part. Check `alternance`
  existant reste vert.
- `cd src && npm run verify` → **578 tests + SMOKE OK**. Artifact avant/après.

## Suite

Autres pages à regarder : Nutrition, Focus, Réglages. Puis chips/tags, listes.

Domaine : alternance
