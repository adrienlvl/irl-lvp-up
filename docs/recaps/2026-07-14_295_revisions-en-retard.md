# #295 — Révisions BTS en retard (rattrapage) (1.9.229)

**Rotation 21 · item #4 (CLÔTURE) · liberté totale (domaine : révisions BTS)**

## Problème
Une révision planifiée et **jamais validée disparaissait du suivi** :
- `missedSessions` ne couvre que `kind === 'sport'` — rien pour `kind === 'study'`.
- `studyPacing` ne compte comme « restantes » que les révisions **à venir**
  (`date >= today && !completed`) : une révision sautée sort du calcul, donc le
  rythme affiché paraît **meilleur** qu'il ne l'est.
- `studyStats` ne comptait que `done` et `upcoming`.

Démonstration en vrai (semé en navigateur) : 4 révisions dont 1 faite, 1 future,
**2 sautées** → l'UI affichait « 📖 1/4 révisions faite · 1 à venir ». Les 2 en
retard étaient invisibles.

## Amélioration
Une bannière rouge liste les révisions passées jamais validées, avec leur retard.

### Logique pure — `overdueStudy(agenda, todayKey, opts)`
- Pendant de `missedSessions`, côté révisions : `kind === 'study'`, `date < today`,
  `!completed`, dans la fenêtre `[today - days .. hier]`.
- `opts : { days = 21, cap = 5 }`.
- Renvoie `[{ date, title, daysLate }]`, du plus récent au plus ancien.
- `[]` si agenda/clé invalides.

### Rendu — dans `renderExamCountdown()`
- Bannière `#overdueStudy` sous le rythme de révision : « 2 révisions en retard :
  📕 Compta chap. 3 **J+2** · 📕 Droit fiscal **J+5** » + « Reprogramme-les dans
  le calendrier plutôt que de les oublier. »
- Masquée s'il n'y a rien en retard.

## Tests
- `logic.test.js` : exclusion des révisions faites / futures / non-study / hors
  fenêtre ; tri le plus récent en tête ; `daysLate` correct ; `cap` et `days`
  paramétrables ; entrées invalides → `[]`.
- `renderer-smoke.cjs` : check `overdueStudy` (présence `#overdueStudy` + calcul).
- `npm run verify` : **318 tests + SMOKE OK** (`whatsNew` vert).
- Vérif navigateur : bannière correcte, et `#studyProgress` (« 1/4 · 1 à venir »)
  illustre bien le trou que ça comble. ✔

## Fichiers
- `src/lib/logic.js` — `overdueStudy()` + export + CHANGELOG[0] 1.9.229.
- `src/app.js` — bannière dans `renderExamCountdown()`.
- `src/index.html` — `#overdueStudy` après `#studyPacing`.
- `src/extras.css` — `.overdue-study` (+ `.od-label`, `.od-chip`).
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Clôture rotation 21
Items : #292 export CSV nutrition · #293 mensurations évolution récente ·
#294 habitudes « série en jeu » · #295 révisions en retard.
→ **tag `v1.9.229` + push (auto-publish)**.
