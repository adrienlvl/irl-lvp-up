# Boucle #235 (autonome) — 6ᵉ rotation #4 : heads-up anticipé de fin de bloc · build 1.9.169

**6ᵉ rotation, #4 (coaching périodisé) — dernière de la rotation.** La reco du prochain bloc n'apparaissait qu'**une fois le bloc terminé**. Elle est maintenant **anticipée dès la semaine de décharge (S4)**, pour préparer la suite pendant qu'on allège.

## Livré

- **Heads-up en semaine de décharge (S4)** : sous-carte « 🏁 Dernière semaine du bloc — allège le volume et récupère, puis un nouveau bloc t'attend » **+ la reco du prochain bloc affichée d'avance** (via `nextBlockAdvice`, avec le plateau réel de #231).
- **Heads-up en S3** : « 🔻 Décharge la semaine prochaine — pousse proprement, ça arrive ».
- Rien en S1/S2 (pas de bruit) ; la carte « bloc terminé » prend le relais après S4.

## Détail technique

- **`lib/logic.js`** : `blockPhaseHeadsUp(block)` — à partir de la sortie de `currentBlock`, renvoie `{ phase:'deload'|'preload', title, message, showNextAdvice }` ou `null`. Pur + testé.
- **`app.js`** : `renderBlockStatus` (branche bloc en cours) rend le heads-up ; en S4, calcule et affiche la reco du prochain bloc (adhérence + charge + plateau réel).
- **`strength.css`** : `.bs-headsup` (bleu) / `.bs-hu-adv`.

## Vérifs

- `npm run verify` → **267 tests / 267 pass** (+1 `blockPhaseHeadsUp`), garde-fou CSS vert, **SMOKE OK** (`blockHeadsUp:true`).
- **Navigateur** (bloc en S4) : carte « Semaine 4/4 · Décharge » + heads-up « 🏁 Dernière semaine du bloc … Voici déjà la reco : 🟧 Prochain bloc … ». ✓
- `npm run dist` → **Setup 1.9.169.exe** (app d'Adrien jamais fermée).

## 🏁 Rotation 6 COMPLÈTE

#1 Wake Lock fiabilisé (#232) · #2 récap de fin d'onboarding (#233) · #3 badges/paliers bien-être (#234) · #4 heads-up anticipé de fin de bloc (#235). → Point à Adrien, boucle stoppée.
