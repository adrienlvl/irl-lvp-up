# #677 — `studyPacing` : `done`/`total` bornés à l'épreuve la plus proche (moitié oubliée de #592)

**Domaine :** etudes · **Build :** inchangé (2.0.278, pas de bump) · **Date :** 2026-07-22

## Rotation (§4 bis) — pourquoi ce domaine

5 derniers recaps (676→672) : `robustesse, coach, docs, docs, coach`.
- 2 derniers = `robustesse` + `coach` → **bloqués**.
- Comptes /5 : `coach` 2×, `docs` 2× → **bloqués** aussi (« pas plus d'une fois »).
- **Libres** : alternance, athlete, nutrition, sommeil, focus, agenda, **etudes**, a11y, tests, fondations.

Priorité nuit = coaching, **impossible ce tour** (`coach` bloqué par la rotation, comme la roadmap l'acte
elle-même). Quota de propositions §4 bis.4 **non déclenché** (#674 = proposition récente). Mémoire :
athlete/nutrition-code/robustesse-dates **secs**, alternance **gated** (#663). → sonde des domaines frais.
Défaut prouvé trouvé en **etudes**.

## Le défaut (prouvé)

`studyPacing` (`logic.js:1983`). Le correctif **#592** avait borné `remaining` à l'horizon de l'épreuve
la plus PROCHE (`a.date <= c.date`) pour tuer l'« alarme absurde » du multi-épreuves — **mais** il a
laissé `done` (`list.filter(completed).length`) et `total` (`list.length`) compter **tout** l'agenda
`study`, toutes épreuves confondues. En multi-épreuves, la progression du compte à rebours de l'épreuve
proche était donc **gonflée par les séances d'une épreuve postérieure**.

Appel qui casse :

```js
const exams = [{title:'Compta',date:'2026-07-12'},{title:'Droit',date:'2026-07-25'}]; // proche = Compta (J-7)
const agenda = [
  {kind:'study',title:'Compta',date:'2026-07-03',completed:true},
  {kind:'study',title:'Compta',date:'2026-07-08',completed:false},
  {kind:'study',title:'Compta',date:'2026-07-10',completed:false},
  {kind:'study',title:'Droit', date:'2026-07-20',completed:false}, // APRÈS Compta
  {kind:'study',title:'Droit', date:'2026-07-22',completed:true},  // APRÈS Compta
];
studyPacing(agenda, exams, '2026-07-05');
// AVANT : { done:2, total:5, ... }  ← gonflé par les 2 séances Droit
// APRÈS : { done:1, total:3, ... }  ← borné à l'horizon de Compta
```

## Honnêteté — effet utilisateur : AUCUN (pas de bump)

Le rendu (`renderExamCountdown`, `app.js:977`, carte `#studyPacing`) n'utilise que
`remaining / daysLeft / perWeek / status`. **Ni `done` ni `total` ne sont affichés** — le `done/total`
visible à l'écran (`#studyProgress`) vient d'une **autre** fonction, `studyStats`. Le défaut est donc réel
dans la **valeur de retour** mais **latent** : il ne surfacerait que si `done`/`total` étaient un jour
câblés dans une note coach ou dans la carte. Correctif de **cohérence interne** (comme #676), donc
**pas de bump**.

## Le correctif

Bornage de `done`/`total` au **même** prédicat que `remaining` (date valide + `a.date <= c.date`) :

```js
const scoped = list.filter(a => /^\d{4}-\d{2}-\d{2}$/.test(String(a.date || '')) && a.date <= c.date);
const total = scoped.length;
const done = scoped.filter(a => a.completed).length;
```

**Gate null volontairement inchangé** : `if (!list.length) return null;` reste sur l'agenda `study`
complet (strictement équivalent à l'ancien `if (!total)` quand `total = list.length`). Conséquence :
si `list` est non vide mais `scoped` vide (que des séances postérieures à l'épreuve proche), la fonction
renvoie encore un objet (`done:0, total:0, remaining:0, status:'done'`) — **exactement** comme avant côté
rendu (remaining=0 → même texte). Zéro changement de comportement affiché ; seuls les champs `done`/`total`
non rendus sont corrigés.

- Sans effet en **mono-épreuve** (toutes les séances sont ≤ examDate) → tests 3025/3053/allDone verts.
- Test 12381 (#592) : borne déjà validée pour `remaining`, `done`/`total` non asserts → vert.

## Vérification

- Nouveau test `#677` (`logic.test.js`) : multi-épreuves → `total===3`, `done===1`, `remaining===2`.
- `xvfb-run -a npm run verify` : **581 tests + SMOKE OK**, 100 % vert.

_Domaine : etudes._
