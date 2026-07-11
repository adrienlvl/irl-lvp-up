# Boucle #96 (autonome) — Protéines : ajout rapide · build 1.9.30

**Contexte :** 21ᵉ itération de la boucle autonome. Aire : Nutrition / saisie du jour.

## Livré

Sous la jauge **« 💪 Protéines du jour »**, trois boutons rapides : **+ 20 g**, **+ 30 g**, **− 10 g** — à l'image du +/− pour l'eau déjà présent.

On enregistre ses protéines au fil des repas d'un clic, sans passer par le champ + « Valider ». La jauge se met à jour immédiatement, et le total est borné et persistant.

## Détail technique

- `app.js` : `bumpProtein(delta)` (miroir de `bumpWater`) — crée/retrouve l'entrée nutrition du jour, borne le total à **[0..500 g]**, `save()`, met à jour le champ `#proteinInput` et `renderHydration`.
- `index.html` : bloc de contrôles `#proteinMinus` / `#proteinPlus20` / `#proteinPlus30` dans la carte protéines.

## Vérifs

- `npm run verify` → **139 tests / 139 pass**, **SMOKE OK** (nouveau check `proteinQuick` : présence des 3 boutons). `node --check app.js` OK.

_Itération sans nouvelle fonction pure (contrôles UI) : couverte par un check smoke plutôt qu'un test unitaire artificiel._
