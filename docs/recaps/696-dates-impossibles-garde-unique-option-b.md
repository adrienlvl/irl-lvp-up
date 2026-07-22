# 696 — Dates impossibles : garde d'ingestion UNIQUE (proposition #694, option B) (2.0.295)

## Contexte

Session LOCALE. **Adrien a tranché #694 → option B** (uniformisation totale, pas l'option A ciblée reco par
le VPS). Objectif : fermer définitivement la dette « n°1 » (dates format-valides mais impossibles qui
débordent au mois suivant et fabriquent des jours/records/comptes-à-rebours fantômes), et n'avoir **qu'une
seule garde de date** à retenir.

## Le changement (option B = uniformisation + retrait de `isBoundedDateKey`)

- **Retiré `isBoundedDateKey`** (bornes mois≤12/jour≤31 seules) : fonction + export + son test dédié.
- **Tous les points d'ingestion passent à `isRealDateKey`** (date calendaire réelle par aller-retour `new Date`) :
  - `normalizeTodo` (`date` + `doneAt`) — avant `isBoundedDateKey`.
  - `normalizeAgendaItem` (`date`) — avant `isBoundedDateKey`.
  - `normalizeExamGoal` (`date`) — avant **regex de format seul** → **le site prouvé faux** (une épreuve à
    « 2026-02-30 » affichait un compte à rebours décalé de 2 jours via `daysUntil`).
  - `glcPlanningToEvents` (`day.date`) — avant regex de format seul → un jour impossible n'injecte plus un
    event d'étude fantôme dans l'agenda.
  - (`normalizeRecurring` utilisait déjà `isRealDateKey` depuis #692.)
- **Comportement** : une date impossible est **vidée** à l'ingestion (décision #2 : le simple/actuel, pas la
  conservation-signalée) ; le **29 février bissextile reste valide**.

## Non-régression

- **Test dédié `#694 option B`** : 30 févr./31 avr./31 juin/doneAt impossible → neutralisés aux 4 sites
  (exam, todo, agenda, GLC) ; 29 févr. bissextile + dates réelles conservés. Le test `isRealDateKey` vérifie
  aussi `typeof isBoundedDateKey === 'undefined'` (fonction bien retirée).
- Test `isBoundedDateKey` supprimé (fonction retirée), « témoin » retiré du test `isRealDateKey`. Aucun autre
  appelant (app.js/smoke) — vérifié par grep.
- Risque option B (surface plus large sur des sites « bénins » comparés en chaîne) : couvert par la suite —
  **589 tests + SMOKE OK**.

## Différé à Adrien (non pris ici)

Rien de bloquant : la décision #2 (vider vs conserver-en-signalant) a été prise « vider » (défaut simple).
Le durcissement du **séparateur CSV** (#7) et les choix de reclassement Alternance restent dans la
proposition #663 §5.

Domaine : robustesse
