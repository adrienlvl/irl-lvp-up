# Boucle #119 (autonome) — Fiabilité : smoke propre + toasts dismissables · build 1.9.53

**Contexte :** 44ᵉ itération de la boucle autonome. Aire : Fiabilité / qualité des tests + petite UX.

## Livré

### Test plus fiable
Le smoke test (renderer Electron) émettait à chaque exécution une erreur parasite du **process principal** : `No handler registered for 'travel:config:get'` (le renderer appelle `getTravelConfig()` au démarrage, mais le harness ne stubait pas ce canal). Cette erreur récurrente pouvait **masquer une vraie régression**.

→ Stubs IPC manquants ajoutés au harness : `travel:config:get` / `travel:config:save` / `travel:estimate`, `update:check` / `update:install`, `data:export` / `data:import`. Sortie du smoke désormais **propre** ; le chemin travel-config renvoie une valeur réaliste résolue au lieu de rejeter.

### Petite UX
Les **toasts** (records, montées de niveau) sont désormais **fermables au clic** (curseur main, infobulle « Cliquer pour fermer »).

## Détail technique

- `test/renderer-smoke.cjs` : 7 nouveaux `ipcMain.handle(...)` de stub.
- `app.js` : `flashToast` attache un `onclick` qui masque le toast et annule le timer.
- `extras.css` : `.app-toast.show` devient cliquable (`pointer-events:auto;cursor:pointer`).

## Vérifs

- `npm run verify` → **158 tests / 158 pass**, **SMOKE OK** — plus aucune ligne `Error occurred in handler for 'travel:config:get'`. `node --check` app + harness OK.

_Itération de fiabilité : durcissement du harness (pas de nouvelle fonction pure) + polish UX._
