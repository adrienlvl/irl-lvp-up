# #314 — La cible de poids se modifie enfin *dans* le plan (1.9.248)

## Ce qu'Adrien demandait

> « ça serait bien que je puisse changer la cible de poids **aussi dans mon plan** pour atteindre
> ma cible » … puis, faute de la trouver : « **Oui mais je le modifie où le poids cible ?** »

J'avais d'abord répondu « le champ existe déjà ». C'était vrai, et inutile : il existait, mais
pas là où il servait. La deuxième question d'Adrien était la bonne, et elle a révélé trois défauts.

## Les trois défauts, vérifiés avant de coder

1. **Le champ était au mauvais endroit.** `#targetWeight` vivait dans le panneau
   « Objectifs hebdomadaires » (onglet **Séance**), coincé entre « Séances/semaine » et
   « Course/semaine ».
2. **Le plan qui le consomme est sur un autre onglet.** « Mon plan pour atteindre ma cible »
   (`.coach-weight-panel`) est sur l'onglet **Progrès**. Pour ajuster sa cible et voir l'effet,
   il fallait faire l'aller-retour entre deux onglets.
3. **Le message d'aide de l'app était faux.** L'état vide disait :
   *« Renseigne ta cible de poids (panneau **Poids** → objectifs) »*. Ce panneau n'existe pas.
   L'app envoyait l'utilisateur chercher au mauvais endroit.

## Ce qui change

- **Champ « 🎯 Poids cible » ajouté dans le panneau du plan lui-même**, en tête de la ligne
  profil, mis en avant (bordure accent, gras) parce que c'est *la* donnée qui pilote tout le reste.
- **Il enregistre directement** (`change` → `save()`), sans bouton. C'est l'endroit où on lit son
  plan : on ne va pas renvoyer vers un autre onglet pour valider. Le champ des objectifs hebdo,
  lui, reste soumis au bouton « Enregistrer » avec les autres objectifs — d'où le `save()`
  uniquement côté plan.
- **Les deux champs restent synchronisés** dans les deux sens, sans jamais écraser celui qu'on
  est en train de taper (garde `document.activeElement`).
- **Le conseil (`weightTargetAdvice`) s'affiche aux deux endroits**, via une seule fonction de
  rendu qui peint dans les deux blocs.
- **Message d'état vide corrigé** : il pointe vers le champ qui est juste au-dessus.

## Bonus embarqué : conflits d'horaires (`scheduleConflicts`)

Ajouter une séance qui en chevauche une autre ne disait rien. Désormais une confirmation
s'affiche. Règles assumées et verrouillées par les tests : le contact bord à bord (19:00 après
une séance qui finit à 19:00) **n'est pas** un conflit ; les événements « journée entière » et
sans heure ne bloquent rien ; on ne se compare jamais à soi-même lors d'une édition.

## Bugs trouvés en chemin (par les tests, pas par chance)

- **`peindre(` jamais refermé** : en convertissant `el.innerHTML=` en appel de fonction, l'appel
  perdait son second argument → `SyntaxError`. Attrapé par `node --check`.
- **Le conseil ne se rafraîchissait pas après enregistrement** : le handler `change` appelait
  `renderAthlete()`, mais `renderTargetAdvice()` n'est appelé que depuis `render()`. Le smoke a
  refusé de passer et avait raison — c'était un vrai bug, pas un test capricieux.
- **`toast` n'existe pas** ; la fonction s'appelle `flashToast`. Vérifié au lieu de supposer.

## Vérification en navigateur réel (port 8137)

| Scénario | Résultat |
|---|---|
| Champ présent dans « Mon plan pour atteindre ma cible » | ✅ |
| Taper 72 dans le plan → enregistré en base | ✅ `targetWeight: "72"` |
| Champ jumeau (objectifs hebdo) synchronisé | ✅ |
| Objectif « muscle » + cible −9 kg | ⛔ **contradiction signalée** |
| Taper 85 dans les objectifs → le plan suit | ✅ |
| Prise de muscle à 85 kg (IMC 28,1) | ✅ `ta-ok` — aucun sermon sur l'IMC |
| Saisie absurde (999) | ✅ bornée à 300 |
| Champ vidé | ✅ retour propre à l'état vide |

La capture d'écran a expiré (rendu bloqué) — la vérification DOM ci-dessus la remplace, et elle
est plus probante.

## Tests

343 tests `node:test` verts + smoke vert. Nouveaux :
`scheduleConflicts` (chevauchements réels, bord à bord, allDay, auto-exclusion),
`timeToMinutes`/`minutesToTime`, et le smoke `coachTargetEditable` qui verrouille le
comportement demandé : *le champ est dans le panneau du plan, et le modifier enregistre*.
