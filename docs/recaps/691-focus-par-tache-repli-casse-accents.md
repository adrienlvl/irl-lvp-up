# #691 — `focusByTask` replie casse/accents/espaces (champ libre retapé) — build 2.0.291

**Domaine : focus.** Boucle #691, 2026-07-22.

## Mission de la nuit & rotation
Nuit du 22/07 = travail **non-visuel, vérifiable** (robustesse/tests/contenu). Rotation §4 bis —
5 derniers recaps : `a11y (690), coach (689), robustesse (688), etudes (687), agenda (686)` →
**interdits** ce tour : `a11y` + `coach` (2 derniers). Le coaching (priorité de nuit DEMANDES.md)
est donc **bloqué par la rotation** ce tour. Domaine retenu : **`focus`** (0× dans les 5 derniers).

## Manque prouvé
`focusByTask` (`logic.js:9551`) — le récap « 🧠 Où est passé ton focus (7 j) » (`app.js:505`) — regroupait
les sessions par la chaîne `task` **EXACTE**. Or `task` est un **champ libre** retapé à la main à chaque
bloc (`#focusTaskInput`, `app.js:715 state.focusTask=…value.trim()`). Donc « Deep work » vs « deep work »
vs « Deep  work », ou « Révision » vs « revision », créaient des **tâches distinctes** :
- répartition **fragmentée** (le même travail éclaté sur plusieurs lignes),
- **pourcentages faussés** (`pct` calculé sur des seaux morcelés),
- la **tâche « phare »** citée par le coach (`adaptiveCoachFocus`, `logic.js:6767`, fenêtre 14 j) mal
  comptée.

C'est **exactement** le défaut déjà corrigé pour le jumeau `studyBySubject` en **#613**
(`logic.js:1882`, `fold = …toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')…`) : même métier
(regrouper un libellé utilisateur libre retapé), un jumeau durci, l'autre non.

Preuve node (échouait AVANT / passe APRÈS) :
```js
focusByTask([
  {date:'2026-07-15', minutes:30, task:'Deep work'},
  {date:'2026-07-14', minutes:20, task:'deep work'},
], '2026-07-15', {days:7})
// AVANT : 2 tâches (30 / 20) → APRÈS : 1 tâche, 50 min, 100 %
```

## Correctif (§3 — zéro champ ajouté)
Clé de regroupement **repliée** (minuscule + accents ôtés + espaces normalisés), affichage du **premier
libellé** rencontré — écriture **identique** à `studyBySubject` :
```js
const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
…
const key = fold(task) || 'sans titre';
if (!groups.has(key)) groups.set(key, { task, minutes: 0, sessions: 0 });
```
Des tâches réellement distinctes (« Deep work » ≠ « Emails ») gardent des clés séparées.

## Vérification
- **+1 test logic** (`logic.test.js`) : 3 variantes casse/accent/espace → 1 seau (60 min, 3 sessions,
  premier libellé) ; « Révision »/« revision » fusionnent ; tâches distinctes restent séparées.
- **Check smoke `focusByTask` étendu et bloquant** : forge 4 sessions (« Deep work »/« deep work » +
  « Révision »/« revision ») → 2 tâches, phare 50 min / 2 sessions. Pas de regex à backslash (§6).
- Commentaire de code enrichi (référence au jumeau #613).
- `cd src && xvfb-run -a npm run verify` : **588 tests + SMOKE OK**.

## §4 ter — contrôle de cohérence
Effet **visible** (le récap Focus et la citation coach comptent enfin ensemble une même tâche) → **bump
2.0.291**. Aucun texte ajouté à l'écran ; l'affichage reste le premier libellé tapé (cohérent avec ce que
l'utilisateur voit dans son historique).

_Domaine : focus._
