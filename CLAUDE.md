# IRL LVP UP — repères pour Claude Code

App « RPG de vie » d'Adrien : **Electron (Windows) + PWA**, JS vanilla **sans bundler**, zéro
dépendance runtime. L'app vit dans `src/`.

- Logique pure → `src/lib/logic.js` (+ tests node:test → `src/test/logic.test.js`).
- Rendu/handlers → `src/app.js` · page → `src/index.html` · smoke renderer →
  `src/test/renderer-smoke.cjs` (checks bloquants = ceux poussés dans `errors`).
- **Vérification obligatoire avant commit** : `cd src && npm run verify`
  (sous Linux : `xvfb-run -a npm run verify`) — 100 % vert.
- Versionnage : bump `src/package.json` **+** entrée `CHANGELOG` en tête de `logic.js` (une entrée
  par version, strictement décroissantes) **+** les 2 assertions `CHANGELOG[0].v`
  (logic.test.js **et** renderer-smoke.cjs, dans le check `whatsNew`).
- ❌ Jamais de tag/Release sans demande explicite d'Adrien · ❌ jamais de données personnelles dans
  le repo · ❌ aucune dépendance ajoutée · ❌ pas de `;` dans les data-URI CSS.
- Feuille de route : `docs/ROADMAP.md` (état) · `docs/AUDIT-ET-ROADMAP-3.0.md` (cap 3.0) ·
  derniers `docs/recaps/` (contexte).

**Session autonome (VPS) : suis `docs/VPS-AUTOPILOT.md` à la lettre.**
