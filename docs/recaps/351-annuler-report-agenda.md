# #351 — Annulation du report d'événement (agenda) (1.9.285) · clôture rotation 35

## Le manque

Dans la vue jour de l'agenda, « → demain » reporte l'événement au lendemain **sans filet** : un clic
de travers (fréquent sur mobile) envoie l'événement à demain, et comme aucun bouton ne fait l'inverse,
il faut le retrouver et corriger la date à la main. La suppression d'habitude a déjà une annulation
(`showUndoToast`) — le report, non.

## Ce qui change

Le report « → demain » affiche maintenant un **toast « Annuler »** (helper `showUndoToast` réutilisé)
qui restaure la date d'origine en un clic. Message : « « <titre> » reporté à demain ».

## Vérification navigateur (flux réel)

Événement « Réunion projet BTS » au 16/07 :

| Étape | Résultat |
|---|---|
| Clic « → demain » | ✅ date → 17/07 |
| Toast | ✅ affiché : « « Réunion projet BTS » reporté à demain » |
| Clic « Annuler » | ✅ date restaurée au 16/07 |

(Browser pane ré-ouvert via `preview_start` — la vérif visuelle remarche ; l'indispo précédente était
une erreur de ma part, pas une restriction.)

## Tests

368 tests + smoke `agendaPostponeUndo` **bloquant** (Electron réel : rend la vue jour, clique le
report → date +1, clique Annuler → date restaurée).

## Rotation

#351 — **clôture la rotation 35** (builds 1.9.282 → 1.9.285). Tag `v1.9.285` publié. Type :
interaction / UX safety. Domaine : agenda.
