# #679 — Séance guidée : `traction` ancré en début de mot (ne capture plus « con·traction·s »)

**Build 2.0.280** · boucle #679 · 2026-07-22

## Contexte / rotation

Priorité de nuit (DEMANDES) = coaching adaptatif à fond, mais **bloquée par la rotation §4 bis** :
5 derniers recaps = `coach (#678), etudes (#677), robustesse (#676), coach (#675), docs (#674)`
→ `coach` interdit (2 derniers + 2×/5), `etudes` interdit (2 derniers). `robustesse` **libre**
(1× en #676, hors 2 derniers). Quota de propositions §4 bis.4 non déclenché (#674 = proposition).

Tâche prise par son nom : **ROADMAP « TA MISSION CETTE NUIT » P1 — « Robustesse données &
classificateurs FR »** (regex de classification de texte FR non ancrées). Zones déjà auditées
(Alternance `jobStatusFromText`/`parseCsv` #663, coach, études) explicitement écartées de la chasse.

## Manque prouvé (grep + lecture)

`warmupFor` (`logic.js:2221`), `prehabFor` (2237) et `cooldownFor` (2250) devinent le type de séance
(haut / bas / trail / général) à partir des **mots-clés du titre** pour proposer échauffement,
prévention blessure et retour au calme. Les trois partagent le même motif « haut du corps » :

```js
if (/poussée|tirage|\bhaut\b|traction|pompes|\bpress\b|militaire/.test(t))
```

`traction` n'était **pas ancré** → il matchait à l'intérieur d'un autre mot FR. Chemin utilisateur
réel : un titre d'agenda **éditable** part dans `startGuidedFromNames(item.title, …)` (`app.js:866`,
`app.js:961`) puis `renderGuidedWorkout` appelle `warmupFor/prehabFor/cooldownFor(guidedWorkout.title)`
(`app.js:445`). Donc un titre comme **« Gainage & contractions abdos »** (con·**traction**·s) était
classé **haut du corps** → la séance d'abdos recevait, ensemble et visibles :

- `warmupFor` → « Échauffement haut du corps » (bras/épaules/pompes) ;
- `prehabFor` → « Prévention **épaule** · coiffe des rotateurs » (pour des abdos !) ;
- `cooldownFor` → « Retour au calme haut du corps » (étirements pecs/triceps).

## Correctif (§4.1 correctness / §4.2 robustesse)

`traction` → `\btraction` (**bord de mot à gauche seulement**) dans les 3 motifs identiques :
- « **Tractions** » (pull-ups = tirage, haut du corps) reste bien reconnu → haut du corps ;
- « con**tractions** » (pas de bord de mot avant `traction`) ne bascule plus → séance générale.

Même famille que l'ancrage `\bhaut\b` / `\bpress\b` déjà en place (commentaire « P4.2 — motifs courts
ancrés »). Aucune autre occurrence de classification : les 3 seules sont 2223/2239/2252 (les autres
« traction » du fichier sont de la prose/labels).

Portée assumée : je **n'ai pas** touché à `poussée`/`longue` (deux autres pistes remontées par la
chasse). « Poussée jambes → haut » n'est pas un défaut d'**ancrage** (poussée y est un mot entier) et
« leg press » se dit « presse » dans l'app (déjà géré) ; « Séance longue X → trail » est un défaut de
**sémantique** (longue est un mot entier), pas de bord de mot → l'ancrer ne le corrigerait pas. Seul
`traction`→`contraction` est un faux positif **prouvable et corrigible par ancrage**, donc le seul traité.

## Tests

+2 assertions dans chacun des 3 tests existants (`warmupFor`/`cooldownFor`/`prehabFor`) : échouent
avant le correctif, passent après.
- `warmupFor/cooldownFor('Gainage & contractions abdos').label` → `/général/i` (avant : haut du corps) ;
- `prehabFor('Gainage & contractions abdos')` → `doesNotMatch /coiffe|face pull/i` (avant : coiffe) ;
- non-régression : `('Tractions lestées')` → haut du corps / coiffe **conservés**.

## Effet utilisateur / bump

Effet **visible** (séance guidée affiche le bon triptyque échauffement/prévention/retour au calme pour
un titre contenant « contraction ») → **bump 2.0.280** (package.json + CHANGELOG + 2 assertions
`CHANGELOG[0].v`). **581 tests + SMOKE OK.**

Domaine : robustesse
