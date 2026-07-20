# #587 — Proposition : planning d'études multi-échéances avec répétition espacée (Cap 3.0, Vague C)

**Type :** proposition de cadrage (docs seuls) · **build :** inchangé 2.0.203 (pas de bump) ·
**verify :** non requis (aucun code touché — précédents #574/#581/#586).

## Contexte de la boucle

Priorité de nuit #1 = pousser le coaching à fond. **Rotation §4 bis bloque `coach` ce tour** : les
5 derniers domaines sont `docs(586) · coach(585) · athlete(584) · docs(583) · coach(582)` → `coach`
apparaît dans les **2 derniers** ET **2×** sur 5. VPS-AUTOPILOT §3 (« le coach attend son tour comme
les autres ») prime sur la demande (le prompt superviseur : la demande ne prime **jamais** sur §3).
`docs` est aussi bloqué (2×, dernier recap). Le coach reste donc au repos ce tour ; sa piste en réserve
(`sportSlot`/`sportZoneFocus` vs `readinessSlide`, mémoire) attend un tour `coach` ouvert.

Vérifications avant de choisir (§2.3) :
- **P4 (regex non ancrées) épuisé aussi côté `app.js`** : `grep -nE "\.(test|match)\("` → toutes les
  regex sont des gardes de **format date/heure ancrées** (`^\d{4}-\d{2}-\d{2}$`, `^([01]\d|2[0-3]):…$`),
  **aucun classificateur de texte FR libre**. Confirme la clôture P4.3/#572.
- **Couche de hiérarchisation du coach déjà mûre** : `orderCoachNotes`/`coachNoteUrgency`
  (`logic.js:9770-9854`) — 6 rangs d'urgence à regex ancrées, bloc soudé prémisse→conclusion, tri
  stable, budget en caractères. **Proposer « une couche de priorisation » serait une piste fausse**
  (§4 bis.5) : elle existe.
- **`applicationStats` (module Alternance, « sacré »)** relu : entonnoir/taux de réponse/série/relances
  cohérents, pas de défaut prouvable → **on n'y touche pas sans preuve** (§3).

## Le manque réel, prouvé

La demande #2 d'Adrien (« fais avancer la roadmap Cap 3.0 ») + le repli explicite de la demande #1
(« à court d'idées coach à forte valeur → écris-les dans `docs/proposals/` ») convergent vers la
**Vague C**. Ses trois briques (`AUDIT-ET-ROADMAP-3.0.md:92-97`) :

- Multi-matières `examGoals[]` → **fait** (P6, #555→#565).
- Bilan par matière → **amorcé** (`studyBySubject`).
- **Planning multi-échéances avec répétition espacée → NON bâti ET NON proposé.**

Preuve dans le code :
- `planStudySessions` est **mono-matière, mono-échéance** : un bloc « Révision » **identique** sur
  chaque jour entre `startDate` et `examDate`, **ignore `examGoals[]`** ; le formulaire (`app.js:920`)
  **écrase** `examGoal` à chaque envoi.
- `grep -niE "espac|leitner|répétition|spaced"` sur `logic.js` = **rien** côté planning : **zéro**
  répétition espacée, plan **uniforme** (autant de temps à J-60 qu'à J-2), aucun équilibrage par urgence.

C'est le **seul** chantier Cap 3.0 restant **autonome** (zéro dépendance externe, contrairement à la
Vague B qui exige comptes/IA). Le résumé de tête #586 (« chantiers Cap 3.0 restants supervisés/tranchés »)
**passait à côté** de cette voie autonome — corrigé ici.

## Livrable

`docs/proposals/planning-etudes-multi-echeances.md` : problème prouvé · 3 options (A équilibrage seul ·
**B équilibrage + répétition espacée par matière, recommandée** · C SRS par notion, hors périmètre) ·
réalisation par étapes autonomes façon P6 (B.1 logique pure testée sans bump → B.2 UI + check smoke
bloquant → B.3 affinage) · risques (ne rien casser, régénération sans doublon via `refId`, plan borné,
aucune matière/date inventée) · **5 décisions** pour Adrien en fin de doc.

Aucun code modifié → pas de `verify`, pas de bump, pas d'entrée CHANGELOG.

Domaine : etudes
