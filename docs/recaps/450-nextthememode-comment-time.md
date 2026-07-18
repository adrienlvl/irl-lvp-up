# 450 — Cycle de thème : commentaire recalé sur le 4ᵉ mode « selon l'heure » (docs)

**Boucle #450 · pas de build (docs uniquement) · domaine Thème/UI · §4.6 (commentaire piégeux)**

## Le manque (vérifié avant de coder)

`nextThemeMode` (`logic.js:13`) fait tourner le mode de thème sur l'ordre
`['auto', 'light', 'dark', 'time']` — un cycle à **4 modes**. Or son commentaire (`logic.js:12`)
annonçait « Cycle des modes de thème : **auto → clair → sombre → auto** » : un cycle à **3 modes**
qui **omet purement et simplement le mode `'time'`** (« selon l'heure »).

Le mode `'time'` est pourtant de plein droit dans l'app, à chaque étage :
- `resolveTheme('time', …)` (`logic.js:16-21`) le résout (clair 7 h→18 h 59, sombre sinon, repli
  système si l'heure manque) ;
- côté UI (`app.js`), `currentThemeMode` l'accepte, `applyThemeButton` lui donne son icône 🕐 et son
  tooltip « selon l'heure », et le bouton `#themeToggle` appelle `nextThemeMode` → le clic fait donc
  bien 🌗 auto → ☀️ clair → 🌙 sombre → 🕐 selon l'heure → 🌗… ;
- le **test** `nextThemeMode / resolveTheme` (`logic.test.js:55-58`) asserte déjà les 4 étapes
  (`dark → time`, `time → auto`).

Le code, l'UI et le test décrivent tous le cycle à 4 modes ; **seul le commentaire décrivait un cycle
à 3 modes**. Un lecteur (ou une future session autopilot) en aurait conclu à tort que `'time'` n'est
pas dans la rotation du bouton. Défaut de documentation objectif, trouvé par audit frais de `logic.js`
(les familles bug-pur récentes — dédup par date, DST, seuils Poids, Alternance — sont closes ; aucun
bug pur objectivement faux restant confirmé dans le périmètre cœur).

## Le correctif

`logic.js:12` — commentaire recalé : « auto → clair → sombre → **selon l'heure** → auto », fidèle à
`order` et à la chaîne réelle du bouton. Aucune ligne de code modifiée.

## Tests / vérif

- Changement de commentaire uniquement → **aucun** test ni rendu modifié, **pas de bump de version**
  ni d'entrée CHANGELOG (§6 : changement sans effet utilisateur).
- `cd src && xvfb-run -a npm run verify` → **OK** : 446 tests + smoke 100 % vert (`theme`,
  `themeAuto`, `themeTime` verts).

## Suite

Documentation du sous-système thème alignée sur son comportement (code + UI + test). Rien d'autre à
faire ici. Audit du reste de `logic.js` : pas de bug pur objectivement faux confirmé hors des familles
déjà closes.
