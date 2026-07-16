# 391 — Alternance : le statut « postulé »/« refusé » est enfin pris en compte de façon fiable

**Build 2.0.31 · demande d'Adrien** (`docs/DEMANDES.md`, ajoutée le 2026-07-16 par le terminal) :
« Regarde l'onglet Alternance, quand je mets que j'ai postulé, que j'ai abandonné pour une société,
ça ne prend pas en compte et ça ne rafraîchit pas automatiquement ». Étape 1/2 de la demande
(étape 2 : améliorer l'onglet Sommeil, une prochaine itération).

## Ce qui se passait

Deux bugs distincts, tous deux réels et prouvés par test/reproduction avant correctif.

### 1. Une synchronisation en retard écrasait un statut avancé

`mergeApplications` (fusion des candidatures importées depuis Google Sheets, auto toutes les 3h ou
au ré-import d'un CSV) ne protégeait qu'**un seul cas** de régression : un suivi avancé ne revenait
jamais à « à postuler ». Mais rien n'empêchait une source **en retard** sur l'app d'écraser un statut
plus avancé avec un statut antérieur — par exemple : Adrien marque une candidature « postulé » ou
« refusé » (le mot « abandonné » saisi dans une feuille se traduit déjà en `refus` via
`jobStatusFromText`) directement dans l'app, puis une synchro (auto ou ré-import du même fichier) où
la feuille source n'a pas encore ce statut à jour **écrasait silencieusement** son changement en le
ramenant à un stade antérieur du pipeline (`postule`, `entretien`…). Résultat vécu : « je mets que
j'ai postulé, et ça ne prend pas en compte ».

Correctif : la protection est généralisée à **tout le pipeline** (`JOB_STATUSES`, dans son ordre),
pas seulement à `a_postuler`. Le statut entrant ne s'applique que s'il est **au moins aussi avancé**
que le statut actuel (par rang dans le tableau `JOB_STATUSES`, déjà utilisé ailleurs pour le tri).
Une vraie progression (ex. Suivi note un refus après un entretien) continue de s'appliquer.

`src/lib/logic.js` — `mergeApplications` :
```js
const rankOf = s => { const i = JOB_STATUSES.indexOf(s); return i < 0 ? 0 : i; };
...
const nextStatus = rankOf(inc.status) < rankOf(cur.status) ? cur.status : inc.status;
```
(remplace l'ancien `(cur.status !== 'a_postuler' && inc.status === 'a_postuler') ? cur.status : inc.status`,
qui ne couvrait que le cas `a_postuler`.)

+2 tests dans `logic.test.js` : un refus n'est jamais remis à « postulé », une acceptation n'est
jamais remise à « entretien » depuis une source en retard ; et vérification que la vraie progression
(entretien → refus) s'applique toujours.

### 2. Le changement de statut par le menu déroulant ne rafraîchissait pas le coach tout de suite

Le bouton dédié « 📤 J'ai postulé » (`markApplicationApplied`) rafraîchissait bien la carte « Le focus
du moment » (`renderCoachFocus`) immédiatement après le clic. Mais le **menu déroulant** de statut
(`data-alt-status`, seul moyen de marquer « refusé »/l'équivalent d'« abandonné » puisqu'il n'y a pas
de bouton dédié pour cette action) ne le faisait pas — la carte du focus du moment restait affichée
avec l'ancien statut jusqu'au prochain rendu complet (changement de page, etc.). Vu par Adrien comme
« ça ne rafraîchit pas automatiquement ».

Correctif : `src/app.js`, le handler `change` de `#altList` appelle désormais aussi `renderCoachFocus()`,
comme le fait déjà `markApplicationApplied`.

## Garde-fou smoke (bloquant)

Nouveau check `altStatusRefresh` : change le statut d'une candidature via le SELECT (pas le bouton
dédié) et vérifie que la carte du coach (`#coachFocusPanel`/`#coachFocus`) se met à jour **sans appel
manuel supplémentaire** — reproduit exactement le scénario rapporté, verrouillé contre une régression
future.

## Ce qui n'a pas changé

Aucune nouvelle valeur de statut ajoutée (pas de statut « Abandonné » distinct de « Refusé » —
`jobStatusFromText` mappait déjà « abandonn… » vers `refus`, cohérent avec l'existant). Zéro
suppression de fonctionnalité, zéro régression sur les 424 tests + smoke déjà verts.

## Suite (§4 DEMANDES.md, étape 2/2)

Améliorer l'onglet Sommeil (formulation encore ouverte côté Adrien) — prochaine itération autonome
dédiée, après relecture du module sommeil existant (`sleepCoachInsight`, `sleepPlan`, etc., livré en
boucles #377→#380).
