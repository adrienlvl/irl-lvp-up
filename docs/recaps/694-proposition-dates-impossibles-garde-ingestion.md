# #694 — Proposition : garde d'ingestion canonique contre les dates impossibles

**Boucle #694 · 2026-07-22 · pas de bump (docs uniquement) · aucune ligne de code touchée.**

## Pourquoi une proposition ce tour (et pas du code)

- **Rotation §4 bis.3** — 5 derniers recaps : `coach (#693), robustesse (#692), focus (#691),
  a11y (#690), coach (#689)`. Interdits (2 derniers) : **`coach`** et **`robustesse`**. `coach` est
  en plus 2× dans les 5 → doublement bloqué.
- **Quota de propositions §4 bis.4 DÉCLENCHÉ** — les 10 derniers recaps (#684→#693) ne contiennent
  **aucune** proposition (dernière : #674 scan-frigo). Donc l'itération **DOIT** être une proposition,
  pas du code. La mission de nuit #5 la sanctionne aussi (« sinon → écris une proposition et stop »).
- **Codebase très balayé** — sous-agent Explore sur les domaines frais (sommeil, nutrition, athlète,
  études, agenda, habitudes, quêtes, parseurs) : **aucun** bug pur prouvable non déjà testé. Toutes les
  fonctions exportées ont au moins un test (les seuls « 0 test » sont des **tables de données**, pas des
  fonctions). Confirme : forcer du code aurait été du remplissage.

## Le manque cadré (sujet = robustesse, différé)

La « dette dates n°1 » (nommée par la mission de nuit) a été colmatée **3× en réactif** (#671/#676
`bestWellnessWeek`/`bestTonnageWeek` ; #692 `normalizeRecurring`) mais l'invariant `isRealDateKey`
(commenté `logic.js:35-39`) reste **non tenu** ailleurs. Site frais **prouvé** : `normalizeExamGoal`
(`logic.js:1911`) valide la date d'épreuve par **format seul** (`/^\d{4}-\d{2}-\d{2}$/`) → `2026-02-30`
passe, puis `examCountdown` (`l.1993`) / `nearestExam` (`l.1948`) l'envoient à `daysUntil` (`l.1808`,
`new Date(+y,+m-1,+d)`) qui **déborde au 2 mars** → **compte à rebours d'examen faux**. Motif #692,
domaine études, non corrigé. Entrées non contraintes par le date-picker : restore de sauvegarde, import
`.ics` abîmé, import GLC, future sync multi-appareils.

Proposition : `docs/proposals/dates-impossibles-garde-ingestion.md` — inventaire des points
d'ingestion encore en garde « format seul », 3 options (A ciblée / B uniformisation totale + retrait de
`isBoundedDateKey` / C statu quo), **reco A** (garde canonique `isRealDateKey` aux 2 sites prouvés —
études + GLC — en étapes autonomes A.1/A.2 dès que la rotation rouvre `robustesse`), risques (comportement
visible → bump + §4 ter ; donnée existante impossible vidée), **4 décisions** pour Adrien (périmètre ·
donnée existante vidée vs signalée · autonome vs supervisé · GLC dans ce lot ou plus tard). Ajoutée au
tableau de `docs/proposals/README.md`.

## Vérif

Aucune ligne de code (`logic.js`/`app.js`/tests/smoke) modifiée → pas de bump, pas d'entrée CHANGELOG.
Baseline node (`npm test`) restée verte (589 tests) — contrôle de non-régression, rien n'était censé
bouger. Fichiers : la proposition, son entrée README, ce recap, l'en-tête ROADMAP.

_Domaine : docs._
