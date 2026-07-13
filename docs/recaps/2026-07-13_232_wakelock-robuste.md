# Boucle #232 (autonome) — 6ᵉ rotation #1 : Wake Lock fiabilisé · build 1.9.166

**6ᵉ rotation, #1 (mobile/PWA).** Le verrou d'écran (Wake Lock) qui garde le téléphone allumé pendant une séance guidée existait mais était **incomplet** : il fuyait sur fermeture Échap/backdrop et **mourait au 1ᵉʳ passage en arrière-plan** (le navigateur libère le lock quand la page se cache — écran éteint, changement d'app — sans jamais le reprendre). Fiabilisé.

## Livré

- **Ré-acquisition automatique** : au retour au premier plan pendant une séance ouverte (`visibilitychange` → visible), le lock est repris — l'écran reste allumé même après un coup d'œil ailleurs.
- **Libération sur tous les chemins de fermeture** : l'événement `close` du dialogue (Échap / clic sur le fond) libère désormais le lock (avant : seulement les boutons Fermer / Enregistrer).
- **Anti double-acquisition** + suivi de la libération auto par le navigateur (écouteur `release` → remet l'état à zéro pour permettre la reprise).

## Détail technique

- **`lib/logic.js`** : `shouldReacquireWakeLock(dialogOpen, visibilityState)` — vrai ssi séance ouverte **et** page visible. Pur + testé.
- **`app.js`** : `requestGuidedWakeLock` garde anti-doublon + écouteur `release` ; écouteur `visibilitychange` qui ré-acquiert ; l'événement `close` du dialogue guidé libère le lock.

## Vérifs

- `npm run verify` → **264 tests / 264 pass** (+1 `shouldReacquireWakeLock`), garde-fou CSS vert, **SMOKE OK** (`wakeLock:true`).
- **Navigateur** : ouverture d'une séance guidée → `navigator.wakeLock.request('screen')` appelé (1×) ; boutons Fermer/Enregistrer → `release()` appelé. _(Le release via événement `close` et la ré-acquisition reposent sur des événements standard non émis par le navigateur d'automatisation ; couverts par le test unitaire + smoke ; les boutons primaires libèrent de toute façon.)_
- `npm run dist` → **Setup 1.9.166.exe** (app d'Adrien jamais fermée).

## Suite (rotation 6)

#1 ✅ (#232). Prochain : #2 onboarding, #3 bien-être, #4 coaching.
