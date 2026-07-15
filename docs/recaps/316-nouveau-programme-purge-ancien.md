# #316 — Un nouveau programme enlève l'ancien (fini les jours à 2 séances) (1.9.250)

## Demande d'Adrien (mot pour mot)

> « quand je crée un nouveau programme, avec les générateurs et autre, faut que ça enlève les
> anciens, ça serait beaucoup mieux et ça éviterai d'avoir des jours avec 2 séances »

## Le manque, vérifié avant de coder

Deux générateurs posent des séances à l'agenda :

1. `generateAutomaticWeek` (planificateur hebdo) — **purge déjà** les anciens créneaux AUTO de la
   fenêtre de 7 jours avant d'en générer (il garde les manuels). RAS.
2. `scheduleObjectiveProgram` (démarrage d'un programme d'objectif, 4 semaines) — **ne purgeait
   rien**. `objprog` n'apparaissait qu'une fois dans tout `app.js`, aucun nettoyage nulle part.
   Sa seule déduplication est par `refId` (même type/focus/jour/date) : elle empêche de recréer
   deux fois la MÊME séance, mais ne touche pas aux séances d'un programme DIFFÉRENT.

Donc : ancien programme Lun/Mer/Ven + nouveau programme Mar/Jeu → les deux coexistent, et si un
jour est commun, on a deux séances dessus. Exactement ce que décrit Adrien.

## Ce qui change

Nouvelle fonction pure `pruneProgramSessionsFrom(agenda, fromKey)`, appelée dans
`scheduleObjectiveProgram` juste avant de poser le nouveau programme. Un programme démarre toujours
le **lundi suivant** : on purge les séances de programme **à partir de ce lundi**, ce qui :

- **supprime les séances de l'ancien programme à venir** → plus de superposition ;
- **garde celles d'ici lundi** (pas de trou cette semaine) ;
- **garde le passé et les séances déjà cochées** → historique (tonnage, blocs) intact ;
- **ne touche pas aux RDV perso** (manuels).

## Le piège trouvé par la vérification navigateur (sinon fix inutile)

Première version : je keyais la purge sur `source === 'objprog'`. La vérification end-to-end a
renvoyé `total_objprog: 0` alors que 8 séances venaient d'être ajoutées → incohérent.

Cause : `normalizeAgendaItem` n'accepte pas `'objprog'` dans `AGENDA_SOURCES` (`['manual',
'training', 'study-glc', 'imported', 'planner']`). Il **recode donc `source:'objprog'` en
`'manual'`**. Une séance de programme réelle ne se reconnaît PAS à sa source (ce serait `'manual'`,
et purger là-dessus effacerait les vrais RDV perso !) mais à son **`refId` préfixé `objprog-`**,
lui préservé par le spread. Sans la vérification navigateur, j'aurais livré une purge qui ne
matchait aucune donnée réelle — un no-op. Corrigé pour keyer sur le `refId`.

## Vérification navigateur (le vrai flux, state en mémoire)

Ancien programme Lun/Mer/Ven (12 séances) placé via `scheduleObjectiveProgram`, une séance marquée
faite, un RDV perso ajouté un mardi. Puis nouveau programme Mar/Jeu.

| Contrôle | Résultat |
|---|---|
| Ancien programme à venir (non fait) retiré | ✅ 12 → 0 |
| **Jours avec 2 séances de programme** | ✅ **AUCUN** |
| Séance déjà faite conservée (historique) | ✅ |
| RDV perso conservé (pas de suppression abusive) | ✅ |
| Total après = 8 nouvelles + 1 faite conservée | ✅ 9 |

Note : un premier essai avait affiché « RDV supprimé / séance faite supprimée » — c'était mon
harnais qui éditait localStorage alors que `scheduleObjectiveProgram` lit le `state` en mémoire (le
`save()` suivant écrasait mes edits). Refait en manipulant `state` directement : tout est conservé.

## Tests

345 tests `node:test` + smoke verts. Le test verrouille précisément le piège : une séance de
programme dont la `source` a été recodée `'manual'` est purgée via son `refId`, tandis qu'un VRAI
RDV manuel (sans `refId`) est préservé.

## Rotation

#316 ouvre la **rotation 27** (build 1.9.250).
