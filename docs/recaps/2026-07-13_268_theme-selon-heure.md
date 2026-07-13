# Boucle #268 (autonome) — 15ᵉ rotation #1 : thème selon l'heure · build 1.9.202

**15ᵉ rotation, #1 (mobile/PWA).** Le thème proposait auto (système) / clair / sombre. Ajout d'un **4ᵉ mode « selon l'heure »** : clair le jour, sombre la nuit — agréable sur mobile sans dépendre du réglage système.

## Livré

- **Nouveau mode de thème 🕐 « selon l'heure »** dans le cycle du bouton (auto → clair → sombre → heure → …).
- Clair de **7h à 18h59**, sombre sinon. Bascule automatiquement au fil de la journée (ré-appliqué chaque minute).

## Détail technique

- **`lib/logic.js`** : `nextThemeMode` cycle étendu à `['auto','light','dark','time']` ; `resolveTheme(mode, systemDark, hour)` gère `'time'` (repli système si heure absente). Purs + testés.
- **`app.js`** : `currentThemeMode` accepte `'time'` ; `applyTheme` passe l'heure courante ; `applyThemeButton` icône 🕐 + libellé ; ré-application du thème sur le tick minute quand le mode est `'time'`.
- **CHANGELOG** complété (v1.9.202).

## Vérifs

- `npm run verify` → **294 tests / 294 pass** (assertions `nextThemeMode`/`resolveTheme` étendues), garde-fou CSS vert, **SMOKE OK** (`themeTime` + `themeAuto`).
- **Navigateur** (21h) : mode `time` → thème **sombre** appliqué (attendu), bouton 🕐, cycle auto→clair→sombre→heure→auto. ✓
- `npm run dist` → **Setup 1.9.202.exe** (app d'Adrien jamais fermée).

## Suite (rotation 15)

#1 ✅ (#268). Prochain : #2 onboarding, #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.
