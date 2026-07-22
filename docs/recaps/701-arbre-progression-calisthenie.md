# 701 — Athlète spécialisé (1/4) : arbre de progression calisthénique (2.0.300)

## Contexte

Adrien : « comment améliorer encore, pour l'onglet athlète, l'entraînement spécialisé ? → **Fait tout !** » (4
features calisthéniques). Première : l'**arbre de progression / skills** — le cœur d'un entraînement au poids du
corps + gilet.

## Le changement — feature `calisthenicsProgress`

- **Logique pure** (`lib/logic.js`, exportée) : `SKILL_LADDERS` = 4 familles (tirage / poussée / jambes /
  gainage-statique), chacune une échelle ordonnée de paliers du débutant au skill élite.
  - Paliers **auto** : validés depuis les séries loggées (reps ou lest atteint) — ex. `pull1` (1re traction),
    `pull8`, `pull15`, `pullW10` (lestées +10 kg), `push15/30`, `dips10`, `squatBw`, `splitSq`, `plank`, `knees`.
  - Paliers **skill** (mouvements avancés absents de la bibliothèque animée — muscle-up, front lever, planche,
    HSPU, pistol, shrimp, L-sit…) : cochés **à la main** (`state.skillsUnlocked[id]`), ce qui évite le blocage
    « asset graphique » (pas de nouvelle illustration à produire).
  - `calisthenicsProgress(workouts, unlocked)` renvoie par famille `{rungs[{id,label,skill,reached,current}],
    reachedCount, total, next}`.
- **État** : `skillsUnlocked: {}` ajouté à `defaults` + assaini dans `normalizeState` (comme `shoppingChecked`).
- **Rendu** (`app.js` `renderSkillTree`, onglet « Mes progrès ») : par famille, barre de complétion + pastilles de
  paliers (atteint = lime ✅, prochain = 🎯 surligné, verrouillé = 🔒, skill = ➕ cliquable). Note « Prochain : … ».
- **Interaction RPG** : taper un skill le débloque/re-verrouille ; débloquer rapporte **+20 XP** + toast. Clavier
  (Enter/Espace) géré.
- **CSS** (`pages.css`) : `.skill-tree` + paliers.

## Non-régression

- Test node dédié (paliers auto depuis logs, skill manuel via `unlocked`, lest → palier lesté, prochain = 1er non
  atteint, `unlocked` sur un palier auto ignoré, garde-fous null/[]). Check smoke **bloquant `skillTree`**
  (4 familles, auto+skill, includes only — pas de regex). Vérifié en navigateur : rendu + tap muscle-up → débloqué,
  +20 XP. **591 tests + SMOKE OK.**

## Suite (3 features restantes du « fait tout »)

2. Surcharge au gilet (suivi du lest par mouvement + quand ajouter). 3. Objectif de skill guidé. 4. Holds
isométriques (secondes).

Domaine : athlete
