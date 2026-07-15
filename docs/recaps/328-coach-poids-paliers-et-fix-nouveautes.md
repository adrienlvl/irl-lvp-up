# #328 — Correctif « Nouveautés » + paliers de poids intermédiaires (1.9.262)

Demandes directes d'Adrien : (1) la carte « Nouveautés » restait affichée après clic sur « Super,
compris » ; (2) le coach poids doit proposer des **étapes intermédiaires** (« toutes les semaines
ou 2 semaines ») au lieu d'un seul objectif lointain, plus des **conseils de fréquence** de pesée /
mensurations. Cap sur la 2.0.

## Correctif « Nouveautés » (le bug signalé)

Cause trouvée : `style.css` faisait `.whatsnew-card{display:flex}`, ce qui **écrasait l'attribut
`hidden`** (règle d'auteur > feuille de style du navigateur). Donc `el.hidden=true` au clic ne
masquait rien. Corrigé par `.whatsnew-card[hidden]{display:none}` (spécificité supérieure) + on vide
aussi le contenu à la fermeture. Vérifié en navigateur : la carte passe à `display:none` et
disparaît au clic. Smoke `whatsNewDismiss` ajouté en garde de régression.

## Coach poids — paliers intermédiaires

Nouvelle fonction pure `weightMilestones({current, target, ratePerWeek, todayKey, everyWeeks,
maxSteps})` : une échelle de caps courts vers la cible, chacun avec le poids visé, la date et la
semaine (S+N). Le dernier palier = la cible exacte (🎯). Rendu sous le graphe du coach.

**Intervalle adaptatif** (corrigé après vérif navigateur) : la 1re version, à intervalle fixe de 2
semaines, laissait un TROU sur un plan long (28 sem. → paliers jusqu'à S+14 puis saut direct à S+28).
Corrigé : `everyWk = max(1 ou 2, ceil(semaines/8))` — l'intervalle s'élargit juste ce qu'il faut
pour que ~8 paliers couvrent TOUT le plan sans trou.

Vérifié en navigateur :
- perte courte 81→78 (7 sem.) : paliers **chaque semaine** S+1…S+6 puis 🎯 78 kg à S+7 ;
- prise longue 75→82 (28 sem.) : paliers **toutes les 4 sem.** (76→77→…→81) puis 🎯 82 kg à S+28,
  espacés régulièrement, sans saut.

## Coach poids — conseils de fréquence

`trackingCadenceAdvice(direction)` : en phase active (perte/prise), pèse-toi 2-3×/sem le matin à jeun
(regarder la MOYENNE, pas le chiffre du jour) et tour de taille toutes les 2 semaines ; en maintien,
plus léger (1×/sem, tour de taille mensuel). Affiché sous les paliers.

## Tests

355 tests `node:test` (+ `weightMilestones` : paliers, dernier = cible, prise/perte, cap, déjà à la
cible → [] ; + `trackingCadenceAdvice`) + smokes **bloquants** `weightMilestones` et
`whatsNewDismiss`.

## Reste pour la 2.0 (à décider avec Adrien)

- **Sélecteur de poids plus joli** (design) — demandé, pas encore fait.
- **Coach poids en onglet à part entière** (au lieu d'être dans Athlète) — demandé, décision de
  structure à valider avant de l'implémenter.

## Rotation

#328 — ouvre la rotation 30 (build 1.9.262).
