# #672 — Coach focus : la note « moteur d'avance » ne répète plus l'appel à l'action (2.0.277)

## Contexte / rotation
Priorité nuit (`docs/DEMANDES.md`) = pousser le **coaching adaptatif** en QUALITÉ (§3 : curation, pas
volume). Rotation §4 bis — grep tolérant sur les 5 derniers recaps (671→667) :
`robustesse, docs, coach, robustesse, athlete` → `robustesse`+`docs` bloqués (2 derniers),
`robustesse` 2× → bloqué ; **`coach` libre** (1× en #669, hors 2 derniers). Quota de propositions
§4 bis.4 : le #663 (10ᵉ recap) contient une proposition → quota **non déclenché**, itération de code
permise.

## Méthode — §4 ter appliqué à la lettre (mesurer, puis LIRE le cumulé)
Fuzz de `adaptiveCoachFocus` sur ~5 000 états chargés réalistes (`/tmp/coachfuzz2.cjs`), tri par
longueur d'insight. Aucune paire de phrases quasi-dupliquée au sens des mots (Jaccard ≥ 0,5 → 0 sur
3 000 états) et 0 co-occurrence de tokens contradictoires : le coach est déjà très propre à ce niveau.
**Mais** en lisant l'insight le plus long **en entier** (pilier focus, bon jour × marge), une
redondance de **sens** (invisible au Jaccard, vocabulaire distinct) saute aux yeux — exactement le
piège que §4 ter décrit.

## Défaut prouvé (rendu chargé, `/tmp/showahead.cjs`)
Les bons jours (objectif focus `onpace` + `readiness ≥ 75` le matin), deux notes s'appendent à la
suite dans l'insight :

- **Phrase 4** (`focusGoalAhead`, `logic.js:6001`) — pose l'appel à l'action :
  « … profite de cette marge pour **prendre de l'avance** sur l'objectif **tant que c'est facile** —
  un vrai **bloc engrangé** maintenant te fait un coussin… »
- **Phrase 5** (`focusAheadDriver`, `logic.js:6024/6025`) — dont la valeur PROPRE (#537) est de
  **nommer le moteur** pour qu'Adrien le reproduise, RE-servait le MÊME ordre :
  - énergie : « … un esprit aussi vif avance vite, saisis-le pour **banker un bloc d'avance pendant
    que c'est facile**. »
  - sommeil : « … autant profiter d'un cerveau reposé pour **engranger un bloc de plus** …, c'est de
    l'avance prise sans forcer. »

`focusAheadDriver` est **imbriqué** dans le bloc `rs.score >= 75` de `focusGoalAhead` → la phrase 5
n'apparaît **jamais sans** la phrase 4 : l'injonction en double est **systématique**. La note-moteur
avait été conçue (#537) avec un vocabulaire distinct à l'**ouverture** (« ce qui te donne cette
clarté » vs « ta tête est claire ») — mais la collision était sur la **queue** (l'appel à l'action),
angle jamais vérifié.

## Correctif — §3 curation (retirer, pas ajouter)
La phrase 5 garde sa seule valeur propre — **diagnostiquer le carburant** du jour — et laisse la
phrase 4 porter **seule** l'appel à l'action (`logic.js:6024/6025`) :
- sommeil → « … **c'est ce cerveau reposé qui rend ton bloc si facile aujourd'hui, l'habitude à
  reproduire pour tes prochains bons jours**. »
- énergie → « … **c'est ce ressort mental qui rend ton bloc si facile aujourd'hui, à cultiver pour
  tes prochains bons jours**. »

Le nudge « reproduire / cultiver » conserve l'intention #168 (« tu vois quelle habitude t'offre ce
mou pour la répéter ») — **que la phrase 4 ne donne pas** — sans redonder l'injonction « engranger /
banker un bloc ». Une redite en moins, zéro champ ajouté, `focusAheadDriver`/`focusGoalAhead`
inchangés.

## Vérif
- Tests `logic.test.js` mis à jour : phrase-moteur sommeil/énergie asserte le nouveau libellé + **`!/engranger un bloc|banker un bloc/`** + **un seul `tant que c'est facile`** dans l'insight rendu (preuve de non-redite).
- Smoke : volet `coachFocus` durci — `if (/engranger un bloc|banker un bloc/.test(fAheadDrv.insight)) return false;` (bloquant). Le prefix `ce qui te donne cette clarté : ta nuit de 8 h` reste vérifié.
- `cd src && xvfb-run -a npm run verify` → **580 tests + SMOKE OK** (100 % vert).
- Bump **2.0.277** + CHANGELOG en tête + 2 assertions `CHANGELOG[0].v`.

## Suites possibles (non traitées ici)
La note sœur `focusFreshDriver` (branche SERRÉE `tight`, #532, « ce qui nourrit cette fraîcheur
mentale ») n'a **pas** été auditée pour la même collision de queue ce tour — candidat pour un futur
tour `coach` (à vérifier en rendu chargé, pas en présumant).

_Domaine : coach._
