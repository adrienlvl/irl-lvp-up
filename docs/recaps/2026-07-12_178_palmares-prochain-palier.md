# Boucle #178 (autonome) — Palmarès de force : prochain palier · build 1.9.112

**Contexte :** thème F (polissage progression). Donner un cap de force concret à partir du palmarès.

## Livré

Dans le **palmarès de force**, chaque exercice affiche désormais son **prochain palier rond de 1RM** et l'**écart à combler** :

> 👑 Développé couché — 12/06 · 🎯 140 kg dans 6,5
> 133,5 kg × 5 · 1RM est. 133,5 kg

Un objectif chiffré et proche (« plus que 6,5 kg pour 140 ») est bien plus motivant qu'un simple chiffre — ça transforme le palmarès en cible.

## Détail technique

- `lib/logic.js` : `nextStrengthMilestone(value, step=10)` — pur + testé. Renvoie `{milestone, gap}` (palier strictement au-dessus, écart arrondi 0,5 kg) ou `null`.
- `app.js` : `renderStrengthRecords` ajoute la mention `🎯 {palier} kg dans {écart}` sous chaque nom d'exercice (uniquement si l'écart est > 0).

## Vérifs

- `npm run verify` → **217 tests / 217 pass** (+1 : `nextStrengthMilestone` — palier au-dessus, valeur pile sur un palier, step custom, invalide → null ; garde-fou CSS toujours vert). **SMOKE OK** (`strengthRecords:true` + palier). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.112.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Autres polissages progression / Coach Poids ; responsive mobile continu.
