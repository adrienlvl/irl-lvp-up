# Récap boucle #05 — Calendrier unifié (Vague 1 : 1.1 → 1.4)

**Quand :** 2026-07-06 (reprise après pause demandée par Adrien)
**Vague :** 1 (Unification du calendrier) — tâches 1.1, 1.2, 1.3, 1.4
**Statut :** ✅ terminé et vérifié (11/11 tests, smoke OK)

## Ce que j'ai fait
### 1.1 — Modèle d'événement unifié ✅
- Nouvelle fonction pure **`normalizeAgendaItem`** dans `src/lib/logic.js` : chaque événement du calendrier a désormais la forme `{id, title, date, time, durationMin, kind, source, refId?, planId?, completed}`.
  - `kind ∈ {focus, sport, life, study}` (invalide → `life`)
  - `source ∈ {manual, training, study-glc, imported}` (déduite : `planId` présent → `training`, sinon `manual`)
  - `durationMin` bornée [5..600], défaut 60 · `completed` booléen · champs liés préservés.
- `study` + `study-glc` = les fondations prêtes pour le planning de révision BTS CG (Vague 2).

### 1.2 — Migration douce ✅
- `normalizeState` (app.js) normalise tout `agenda[]` au chargement : les données existantes sont mises au nouveau format **sans perte**, de façon **idempotente** (re-normaliser ne change rien).

### 1.3 — Fin des orphelins ✅
- Bug identifié dans l'audit (§5) corrigé : supprimer un événement du **calendrier mensuel** supprime désormais aussi le **plan d'entraînement lié** (`planId`), et rafraîchit toutes les vues concernées (planning, boussole, compagnon). Plus de séance fantôme qui ressuscite dans « Planifier la suite ».

### 1.4 — Catégorie « Révision » dans l'UI ✅
- Option **Révision** ajoutée aux deux formulaires (agenda du dashboard + calendrier mensuel).
- Légende du calendrier complétée, couleur dédiée **ambre `#5a4a2b`** (focus=bleu, sport=violet, vie=vert, révision=ambre) dans les vues hebdo et mensuelle.

## Vérifications
- `node --check` : 4 fichiers OK.
- `npm test` : **11/11** (6 existants + 5 nouveaux sur `normalizeAgendaItem` : défauts, kind invalide, source déduite, bornes, idempotence).
- Smoke-test renderer (enrichi : vérifie que `normalizeAgendaItem` est chargée dans la page) : `SMOKE OK`, exit 0.

## Reste Vague 1
- **1.5** `.ics` amélioré (durée réelle, UID stable, échappement, catégorie study) → prochaine boucle, puis **Vague 2** (planificateur de révision + vue « Ma journée » + notifications).

## Git
- Commit : `feat(calendrier): modèle d'événement unifié + catégorie révision + fix orphelins (1.1-1.4)`.
