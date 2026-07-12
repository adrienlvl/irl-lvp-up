# Boucle #172 (autonome) — Coach Poids : mensurations & recomposition · build 1.9.106

**Contexte :** thème D (Coach Poids). La balance seule ment parfois (recomposition) — ajouter le tour de taille.

## Livré

Dans le panneau **🎯 Coach Poids**, quand au moins 2 mensurations existent, un bloc **📏 Tour de taille** affiche la valeur actuelle + le **delta depuis le début**, et surtout une **lecture croisée poids / taille** :

- poids stable **mais** taille en baisse → *« recomposition en cours : tu perds du gras et gardes ton muscle 💪 »* ;
- poids **et** taille en baisse → *« perte de gras bien engagée »* ;
- poids et taille qui montent → *« surveille que la taille ne grimpe pas trop (gras) »*.

C'est le signal clé que la balance seule rate : Adrien peut « ne pas perdre de poids » tout en s'affinant réellement.

## Détail technique

- `lib/logic.js` : `recompositionInsight(weightDeltaKg, waistDeltaCm)` — pur + testé. Renvoie `{key, message}` (recomp / fatloss / gain) ou `null`.
- `app.js` : `renderCoachWeight` calcule le delta tour de taille (`measurementDelta(state.measurements,'waist')`) + le delta poids, et affiche `.cw-measure` + l'insight.
- `athlete.css` : styles `.cw-measure` / `.cw-measure-ins` (vert).

## Vérifs

- `npm run verify` → **212 tests / 212 pass** (+1 : `recompositionInsight` — recomp/fatloss/gain, taille stable → null). **SMOKE OK** (`coachMeasure:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.106.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Historique du score d'adhérence (snapshot hebdo + courbe) ; responsive mobile continu ; sélecteur d'objectif corporel plus riche.
