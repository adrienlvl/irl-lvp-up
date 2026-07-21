# #664 — Séance guidée : la cible suit la récup LIVE à la reprise (build 2.0.271)

**Priorité de nuit = coaching** (DEMANDES.md, priorité n°1). Mission non-visuelle (robustesse/contenu,
PAS de design). Rotation §4 bis — 5 derniers recaps par domaine : `robustesse, alternance, fondations,
fondations, fondations`. `athlete` absent des 5 derniers → domaine libre, angle coaching-qualité.

## Le défaut (prouvé par lecture, candidat #652 resté ouvert)

`renderGuidedWorkout` (`app.js:445`) affiche 3 surfaces sur la carte de séance guidée :
- `#guidedRecoveryNote` — recalculé **en direct** sur `state.recovery.at(-1)` (flag `fragile`).
- `#guidedProgressionHint` + `#guidedTarget` — pilotés par `guidedProgressionLines(_sugg, current.cautious, …)`.

Or `current.cautious` est **gelé au snapshot d'ouverture** : `openGuidedWorkout` (`app.js:473`) calcule
`exerciseRecommendation(x)` (dont `cautious`) au moment d'ouvrir, et `guidedResumeGo` (`app.js:458`) restaure
les exercices **tels quels** depuis `state.guidedSession` sans recalcul.

**Scénario contradictoire** : séance ouverte le matin (récup OK → `cautious:false` figé), reprise le soir
après un check-in devenu difficile (peu de sommeil / courbatures / fatigue). Au rendu de reprise :
- `#guidedRecoveryNote` (live) → « Récupération fragile aujourd'hui : allège la charge… »
- `#guidedTarget` (cautious figé faux) → « 🎯 Cible du jour : … — monte la charge 💪 »

Deux consignes opposées côte à côte — exactement le type de contradiction insight↔action que §3 demande
de corriger (curation, pas volume).

## Le correctif (render-only, curation §3, zéro champ ajouté)

`renderGuidedWorkout` calcule déjà `fragile` en direct pour la note de récup. On le fait désormais **arbitrer
aussi** la progression :
```
const _liveCautious = Boolean(current.cautious) || Boolean(fragile),
      _fallbackHint  = fragile ? '<conseil récup basse>' : (current.progressionHint || '<défaut>');
const _lines = guidedProgressionLines(_sugg, _liveCautious, _fallbackHint);
```
La récup LIVE prime : forme basse à la reprise → on **consolide** le format (pas de « monte la charge »), et
le conseil bascule sur le message « récup basse » au lieu du « +0,5 kg » gelé du matin. Hors reprise-fragile,
comportement inchangé (`cautious` figé « séance dure/incomplète » toujours respecté). Aucune fonction pure
touchée — `guidedProgressionLines` (pur, testé) est réutilisée telle quelle ; seul le **câblage** change.

## Preuve / vérif

- Check smoke **bloquant `guidedFragileLive`** : pilote `renderGuidedWorkout` deux fois sur le **même**
  exercice figé `cautious:false`, seule la récup change. Récup OK → `#guidedTarget` « monte la charge » +
  `#guidedProgressionHint` « Feu vert ». Récup fragile (soreness 5) → `#guidedTarget` « consolide » **sans**
  « monte la charge », `#guidedProgressionHint` « Récupération… » **sans** « Feu vert » ni « 0,5 kg », et
  `#guidedRecoveryNote` « fragile ». Prouve que le rendu lit bien la récup live, pas le snapshot.
- §4 ter : rendu cumulé sur reprise-fragile relu → les 3 lignes convergent (« ne pousse pas, consolide »).
  Le correctif **retire** une contradiction ; la légère redondance note/conseil préexistait au cas
  fragile-ouvert-frais (même message via `exerciseRecommendation`), donc rien de neuf ajouté.
- `cd src && xvfb-run -a npm run verify` : **578 tests + SMOKE OK**, 100 % vert.

Build **2.0.271**. `whatsNew` mis à jour (2 assertions `CHANGELOG[0].v`). Master seulement.
**Lot 2.0.263→271 en attente de release (Adrien contrôle).**

Domaine : athlete
</content>
</invoke>
