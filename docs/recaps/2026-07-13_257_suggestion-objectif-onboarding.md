# Boucle #257 (autonome) — 12ᵉ rotation #2 : suggestion d'objectif à l'onboarding · build 1.9.191

**12ᵉ rotation, #2 (onboarding).** Choisir son objectif physique au démarrage n'est pas évident. L'app propose maintenant un **objectif suggéré selon le profil saisi** (IMC + poids cible), applicable en 1 clic.

## Livré

- **Hint « 💡 Suggéré pour toi : … »** sous les champs de profil, dès que poids (+ taille ou poids cible) sont renseignés.
- Heuristique douce : poids cible nettement plus bas/haut (≥3 kg) → perte de gras / prise de muscle ; sinon IMC (≥25 → perte de gras, <18,5 → prise de muscle, sinon corps athlétique).
- Bouton **« Appliquer »** → bascule le sélecteur d'objectif, met à jour welcome/jauge/aperçu. Le hint se masque quand il correspond déjà au choix.

## Détail technique

- **`lib/logic.js`** : `suggestObjective(inputs)` → `{ key, label, reason }` ou null. Priorité poids cible puis IMC. Pur + testé.
- **`app.js`** : `renderOnboardingSuggest()` câblé sur input/change du dialogue, le change d'objectif et l'ouverture (`openOnboarding`).
- **`index.html`** : `#onboardingSuggest`.
- **`companion.css`** : `.onb-suggest` (bord bleu).
- **CHANGELOG** complété (v1.9.191) → l'écran « Nouveautés » l'affichera à la prochaine update.

## Vérifs

- `npm run verify` → **286 tests / 286 pass** (+ test `suggestObjective`), garde-fou CSS vert, **SMOKE OK** (`onboardingSuggest`).
- **Navigateur** (localhost:8137) : profil 95→82 kg → « Perte de gras (−13 kg) », Appliquer ⇒ objectif `seche` + hint masqué ; profil 52 kg (IMC 16,4) → « Prise de muscle ». ✓
- `npm run dist` → **Setup 1.9.191.exe** (app d'Adrien jamais fermée).

## Suite (rotation 12)

#1 ✅ (#256), #2 ✅ (#257). Prochain : #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.
