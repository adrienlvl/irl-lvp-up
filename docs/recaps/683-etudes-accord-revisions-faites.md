# #683 — Études : « X/N révisions faite**s** / validée**s** » (accord sur le nom, pas sur le compte)

**Build 2.0.284** · 2026-07-22 · Domaine : etudes

## Contexte / rotation

Priorité nuit = coaching, mais **bloquée par la rotation §4 bis**. 5 derniers recaps :
`robustesse (#682), coach (#681), etudes (#680), robustesse (#679), coach (#678)` → `robustesse`
et `coach` interdits (2 derniers **et** 2×/5). `etudes` **libre** (1× en #680, hors 2 derniers).
Quota §4 bis.4 non déclenché (#674 = proposition, dans les 10 derniers).

**Piste précise et nommée** : la note mémoire de #682 signalait explicitement que le même bug
d'accord jumeau « subsiste en etudes (app.js:581/977) ». C'est le pendant études du correctif #682
(quêtes → robustesse) : ici les surfaces touchées appartiennent au feature **études** (révisions),
qui a son propre tag → domaine `etudes`.

## Le défaut (prouvé)

Deux lignes du domaine études accordaient le **nom** « révision » sur le total, mais l'**adjectif**
sur le nombre *fait* — l'inverse de la convention appliquée partout ailleurs (et fixée en #682 :
« l'adjectif s'accorde sur le même compteur que le nom »).

1. **`renderExamCountdown`** (`app.js:977`, badge `#studyProgress`) :
   ```js
   `📖 ${st.done}/${st.total} révision${st.total>1?'s':''} faite${st.done>1?'s':''}…`
   ```
   `studyStats` → `{done:1, total:3}` (cas courant : toutes les révisions pas encore faites) →
   « 📖 1/3 révisions **faite** » au lieu de « faites ».

2. **`renderPrintReport`** (`app.js:581`, bilan hebdo imprimé) :
   ```js
   `${sum.studyDone}/${sum.studyPlanned} révision${sum.studyPlanned>1?'s':''} validée${sum.studyDone>1?'s':''}`
   ```
   `weeklySummary` → `{studyDone:1, studyPlanned:3}` → « 1/3 révisions **validée** » au lieu de
   « validées ».

Le défaut apparaît dès que `done ≤ 1 < total`. Les lignes voisines qui accordent sur le **même**
compteur (`séance${week.length>1}` … `réalisée${week.length>1}`, `app.js:490`) étaient déjà
correctes → l'écart de traitement rendait l'incohérence d'autant plus visible.

## Correctif (§4.4 rendu — chirurgical)

- `faite${st.done>1?'s':''}` → `faite${st.total>1?'s':''}`
- `validée${sum.studyDone>1?'s':''}` → `validée${sum.studyPlanned>1?'s':''}`

L'adjectif s'accorde désormais sur le compteur du nom qu'il qualifie (« révisions »), comme partout
ailleurs. Aucun impact logique — purement cosmétique. Tous les cas couverts (`total===1` →
« 1 révision faite » singulier ; `total>1` → « révisions faites » pluriel quel que soit `done`).

## Vérification

- **Check smoke bloquant `studyProgressPlural`** : forge `state.agenda` (3 items `study`, 1 complété
  → `done=1, total=3`), pilote le **vrai** `renderExamCountdown()`, lit `#studyProgress`, restaure et
  re-rend. Assert `txt.includes('révisions faites')` → **échoue avant** (« révisions faite »), **passe
  après**. Sans backslash (§6), `includes` uniquement.
- **Check smoke bloquant `printReportStudyPlural`** : forge `state.agenda` (3 items `study` dans la
  semaine du lundi 2020-01-06, 1 complété → `studyDone=1, studyPlanned=3`), pilote le **vrai**
  `renderPrintReport('2020-01-06')`, lit `#printReport`, restaure. Assert
  `txt.includes('révisions validées')` → **échoue avant**, **passe après**.
- Contrôle §4 ter (texte lu, cumulé) : « 📖 1/3 révisions faites · 2 à venir. » et le bilan imprimé
  « Cette semaine : aucune séance, 1/3 révisions validées, … » — corrects, courts, non contradictoires.
- `cd src && xvfb-run -a npm run verify` → **583 tests + SMOKE OK** (100 % vert).

Effet utilisateur visible → **bump 2.0.284** + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`.

## Reste ouvert (piste hors-domaine, pour une future boucle)

Le balayage `grep` des accords doubles a isolé **un** autre mismatch, hors études : `app.js:269`
`bloc${items.length>1}` … `terminé${doneCount>1}` (dashboard/agenda). Non traité ici pour ne pas
mélanger les domaines — à vérifier puis corriger dans une boucle `robustesse`/`agenda`. Tous les
autres motifs `…${A>1}s… …${A>1}s…` du fichier utilisent le **même** compteur (déjà corrects).

_Domaine : etudes._
