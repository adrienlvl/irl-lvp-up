# Boucle #171 (autonome) — Coach Poids : copier mon plan · build 1.9.105

**Contexte :** thème D (Coach Poids). Rendre le plan emportable / partageable.

## Livré

Un bouton **« 📋 Copier mon plan »** en bas du panneau Coach Poids : il met dans le presse-papiers un **résumé texte propre** de tout le plan —

```
🎯 Mon plan pour atteindre ma cible
Objectif : Perdre 6 kg · cible ~ 08/11/2026
🔥 1875 kcal/jour · 162 g prot · 143 g gluc · 73 g lip

🗓️ Semaine type :
- Lun : Course · 40 min
- Mer : Musculation · 45 min
...

🍽️ Journée d'assiette :
- Petit-déjeuner : 469 kcal · Flocons d'avoine + fromage blanc...
...
```

Adrien peut le coller dans ses notes, l'envoyer, ou le garder sous la main pendant ses courses / repas.

## Détail technique

- `lib/logic.js` : `coachPlanText({plan, week, meals})` — pur + testé. Formate objectif + date cible, calories/macros, semaine type et repas (avec exemples) en texte. `''` si pas de plan.
- `app.js` : `lastCoachPlan` mémorisé à chaque rendu (plan + `wk.sessions` + repas avec exemple), bouton `#coachPlanCopy` → `navigator.clipboard.writeText(coachPlanText(lastCoachPlan))`.
- `athlete.css` : `.cw-copy` (bouton pleine largeur).

## Vérifs

- `npm run verify` → **211 tests / 211 pass** (+1 : `coachPlanText` — objectif/calories/semaine/repas, sans plan → ''). **SMOKE OK** (`coachExport:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.105.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Suivi des mensurations vers la cible ; historique du score d'adhérence ; responsive mobile continu.
