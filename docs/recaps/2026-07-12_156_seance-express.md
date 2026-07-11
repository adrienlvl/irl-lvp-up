# Boucle #156 (autonome) — Générateur de séance express · build 1.9.90

**Contexte :** 19ᵉ itération du recentrage Exercices / Athlète. Focus **Exercices / séances guidées** : « j'ai 20 min, propose-moi une séance ».

## Livré

Dans la **bibliothèque d'exercices**, un bloc **« ⚡ Séance express »** : Adrien choisit une durée (**15 / 20 / 30 / 45 min**) et clique *Générer*. L'app compose un **circuit qui tient dans le budget temps**, en respectant les **filtres zone & matériel** déjà actifs (ex. « abdos » + « poids du corps »).

Le résultat liste les exercices retenus (format + repos) avec l'estimation de durée, et un bouton **« ▶️ Démarrer guidée »** lance directement la séance guidée (minuteur de repos, suivi des séries, compteur de tonnage). De l'envie à l'entraînement en deux clics.

## Détail technique

- `lib/logic.js` : `quickSessionPlan(exercises, opts)` — pur + testé. Filtre par zone (`exerciseZones`) et matériel (`kind`), estime la durée de chaque exercice via `prescriptionFor(x, x)`, remplit gloutonnement le budget (`minutes`) sans dépasser (≥ 1 exercice garanti, plafond `maxExercises`). Renvoie `{exercises, totalMinutes, count}`.
- `app.js` : `runQuickSession()` lit durée + filtres actifs, rend `#quickSessionResult`, bouton *Démarrer guidée* → `startGuidedFromNames('Séance express', names)`. Bouton `#quickSessionBtn` câblé.
- `index.html` : bloc `#quickSessionBar` (select durée + bouton) + `#quickSessionResult`.
- `extras.css` : styles du bloc et de la liste résultat.

## Vérifs

- `npm run verify` → **193 tests / 193 pass** (+1 : `quickSessionPlan` — filtre zone/matériel, remplissage budget, ≥ 1 exercice, zone inconnue → vide, liste vide). **SMOKE OK** (`quickSession:true` — génère un circuit abdos, tous les exos ciblent la zone). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.90.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
