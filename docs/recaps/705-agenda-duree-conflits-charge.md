# 705 — Agenda 2.2.0 : durée, occupation réelle, charge du jour, replanification

## Contexte

Adrien : « Comment tu peux faire pour vraiment améliorer la grosse partie Agenda ? Là c'est trop
simple et pas assez de choses. Regarde les améliorations possible, prend note des fonctionnalités
d'autres applications et fait les améliorations. »

Méthode : un relevé de l'existant (2 agents sur la logique et l'interface) **plus** une veille sur
4 axes (planification quotidienne, saisie, intelligence/alertes, bilan) avec recherche web sur
Sunsama, Motion, Reclaim, Akiflow, Amie, Structured, Fantastical, Notion Calendar, TickTick,
Todoist, Google Calendar, RescueTime, Toggl, Clockwise. **40 idées relevées, 6 retenues, le reste
écarté avec la raison.**

Le diagnostic qui a tout réorienté : l'Agenda n'était pas « trop simple » par manque d'écrans — il
était **faux**. Trois défauts de fond le rendaient incapable de décrire une journée réelle.

---

## 1. Personne ne pouvait dire combien de temps ça dure

**Aucun des trois formulaires n'avait de champ durée.** Tout bloc créé valait 60 minutes, en
silence. Et le code le savait sans le dire : `app.js` lisait `$('#weekQuickDuration')`…

```js
durationMin: Number($('#weekQuickDuration')?.value) || 60
```

…un identifiant **qui n'existait dans aucun fichier HTML**. `undefined` → `NaN` → `60`. Le repli
masquait l'absence du champ depuis le début.

Conséquence en cascade : la hauteur des blocs dans la grille du jour, le total « ⏱️ planifiées »,
la détection de conflits, l'heure de départ conseillée, le bilan PDF et les rappels Electron
décrivaient tous une journée qui n'existait pas.

`parseDurationInput(value, fallback)` accepte `90`, `'1h30'`, `'2h'`, `'45 min'`, `'1,5h'` ; borne
à 5–600 ; et retombe sur le repli seulement quand c'est **illisible**, jamais quand c'est
simplement hors bornes.

## 2. L'alerte de chevauchement ne voyait pas les cours

`scheduleConflicts` et `nextFreeSlot` ne lisaient que `state.agenda`. Or les cours importés d'un
calendrier vivent dans `state.recurring`. **Poser une muscu à 18 h pendant le cours de 17 h–19 h ne
déclenchait rien.**

`busyBlocksForDay(state, dateKey, opts)` devient le point de vérité unique « ce jour est-il
occupé » : agenda **plus** occurrences récurrentes, en écartant ce qui n'occupe rien (journée
entière, sans heure, déjà fait, sauté, en pause). Le format rendu est directement consommable par
`scheduleConflicts` et `nextFreeSlot` — aucune des deux n'a été réécrite.

L'identifiant d'une occurrence est une **chaîne** `'rec-<id>'` : jamais comparable à l'id numérique
d'un bloc d'agenda, donc pas d'exclusion croisée par accident.

Et l'avertissement s'affiche **pendant** la saisie, sous le champ heure. Un `confirm()` au moment de
valider arrive trop tard : on a déjà choisi son heure.

## 3. La somme des minutes n'était comparée à rien

`dayPlannedMinutes` calculait déjà le total planifié d'une journée et ne le confrontait à aucune
capacité : on découvrait l'impossible à 19 h.

`dayLoad(state, dateKey, opts)` rend `{plannedMin, travelMin, totalMin, capacityMin, pct, status,
endEstimate, overflowMin}`. La capacité est **par jour de semaine** (180 min en semaine, 360 le
week-end, réglable) : une jauge unique serait rouge tous les jours, donc ignorée. Le trajet compte
dans la charge. Une journée qui finit après minuit le dit (`00:15 (demain)`).

`lightenSuggestions` propose quoi déplacer — et **jamais la haute priorité** : une suggestion qui
propose de sacrifier l'examen de demain se fait fermer une fois et plus jamais rouvrir.

## 4. Le seul geste de report était « → demain »

Donc une journée qui déborde se déversait entière sur le lendemain, et le même bloc glissait cinq
fois sans que rien ne le signale.

`rescheduleOptions` propose jusqu'à **3 créneaux réellement libres** sur 7 jours — vérifiés contre
`busyBlocksForDay`, donc cours et trajets compris. Le jour même, rien n'est proposé avant
« maintenant + 15 min » : un créneau déjà passé n'est pas une option.

`moveAgendaItem` incrémente `movedCount` et mémorise `firstDate` **au premier déplacement
seulement**. `postponePrompt` parle à 3 reports, insiste à 6. Le compteur ne bouge que sur une
action d'Adrien — jamais via un import ou une replanification automatique, sinon il ment.

---

## Non-régression

- **31 assertions** sur `parseDurationInput` (toutes les formes, les bornes, l'illisible).
- **`busyBlocksForDay`** : le récurrent compte, le fait/sauté/en pause ne compte plus, l'id est une
  chaîne, s'éditer soi-même ne se heurte pas à soi-même, un mercredi n'hérite pas du cours du mardi.
- **`rescheduleOptions`** : chaque créneau proposé est re-vérifié contre `scheduleConflicts` — le
  test échouerait si l'app proposait un créneau occupé.
- **`dayLoad`** : trajet compté, capacité par jour de semaine, jour vide sans division par zéro,
  fin après minuit, capacité nulle sans `NaN`.
- **`lightenSuggestions`** : la haute priorité est intouchable.
- Checks smoke **bloquants** : `agendaDuration` (les trois identifiants doivent **exister** dans le
  DOM — c'est exactement le bug d'origine), `agendaConflit` (le récurrent doit apparaître dans
  l'occupation), `agendaCharge` (visible et « saturée » à 5 h 30, masquée un jour vide).
- **604 tests + SMOKE OK.** La garde `agendaDuration` est **validée par mutation** : retirer le
  champ du HTML fait passer le smoke au rouge.

## Ce qui a été écarté, et pourquoi

- **Replanification automatique par IA** (Motion, Reclaim) : serveur, compte, synchro continue.
- **Blocs souples qui se replacent seuls** : sans démon, le recalcul à l'ouverture fait sautiller
  les blocs — et la perte de contrôle est le reproche n°1 fait à ces outils. Remplacé par
  « Replanifier » : une proposition, un clic, tu décides.
- **Synchro bidirectionnelle Google/Apple** : OAuth + serveur. L'export .ics reste la sortie.
- **Météo sur les sorties trail** : une seconde sortie réseau permanente dans une app 100 % locale.
- **Rituel du matin en 4 écrans façon Sunsama** : 3 min chaque matin, abandonné en une semaine.

## Reste à faire (par ordre)

Modifier une occurrence récurrente seule ; glisser-déposer et poignée de durée ; vue semaine à
l'échelle du temps ; saisie en langage naturel **avec** aperçu corrigeable ; prévu vs réel ; bilan
du soir. Et l'item 6 du plan — relances d'alternance et to-dos affichés dans la journée — laissé de
côté volontairement : il touche le module Alternance, dont le retrait conditionnel est prévu au
2026-09-01, et il doit passer derrière le même interrupteur.

Domaine : agenda
