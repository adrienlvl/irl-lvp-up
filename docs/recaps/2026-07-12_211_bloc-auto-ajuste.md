# Boucle #211 (autonome) — #4 Bloc auto-ajusté + « nouveau bloc » · build 1.9.145

**Cap #4 — suite.** La carte « Mon bloc » (#210) montrait la progression, mais en fin de cycle rien ne guidait la suite. Le coaching périodisé doit **adapter le prochain bloc aux résultats réels**.

## Livré — fin de bloc intelligente

Quand le bloc de 4 semaines est **terminé**, la carte affiche :

- une **reco pour le prochain bloc** calculée depuis tes résultats réels (adhérence de la semaine + statut de charge ACWR/forme), avec priorité au sens :
  - 🟧 **adhérence basse** → « vise la régularité » ; 🟥 **charge haute** → « allège (~-20 %) » ; 🔁 **plateau** → « change une variable » ; 🟩 **assidu + charge ok** → « monte le volume » ; 🟨 sinon → « garde le cap ».
- un bouton **« 🔄 Générer un nouveau bloc (4 sem.) »** qui régénère le programme (en **variante** via seed) et le **re-planifie** dans l'agenda, redémarrant un cycle Base→Volume→Intensité→Décharge.

## Détail technique

- **`lib/logic.js`** : `nextBlockAdvice({adherence, plateau, loadStatus})` → `{action, emoji, title, advice}`. Pur + testé (priorités).
- **`app.js`** : `renderBlockStatus` (branche `done`) calcule adhérence (`weeklyAdherence`) + charge (`loadAdvice(acuteChronicRatio, readinessScore)`) → `nextBlockAdvice` ; bouton `#newBlockBtn` régénère+programme (seed varié).
- **`strength.css`** : `.bs-next` + variantes de couleur par action.

## Vérifs

- `npm run verify` → **245 tests / 245 pass** (+1 : `nextBlockAdvice`), garde-fou CSS vert, **SMOKE OK** (`nextBlockAdvice:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.145.exe** (app d'Adrien jamais fermée).

## Bilan #1→#4

#1 mobile ✅ · #2 onboarding ✅ · #3 routines ✅ · #4 périodisé ✅ (bloc suivi + auto-ajusté + régénération). Les 4 caps demandés par Adrien sont traités → point à faire à Adrien.
