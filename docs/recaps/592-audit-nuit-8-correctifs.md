# 592 — Audit adversarial de la nuit VPS (#554→#591) : 8 correctifs (2.0.208)

> Audit matinal (session locale supervisée). 38 commits VPS relus **diff par diff** par un workflow à
> 14 agents (5 lots de revue → contre-vérification adversariale de chaque suspicion). La suite était
> **verte** (538 tests) : cet audit cherche ce qu'une suite verte laisse passer. Bilan : **8 défauts
> confirmés (2 majeurs sur les données/le funnel), 1 réfuté.**

## Ce que la nuit a bien fait

Les 38 commits ont suivi la roadmap : série **P6** (multi-épreuves `examGoals[]`) close, **P7** (3
parcours scriptés dans le smoke), **P4** (regex ancrées), **P2.2/P2.4** (a11y). **Interdictions dures
toutes respectées** : 0 tag, 0 dépendance, 0 fichier interdit, 0 donnée perso, rotation des domaines
tenue. _(Deux « alarmes » de mes contrôles étaient de faux positifs : le seul tag est mon `v2.0.183`,
le seul diff de `package.json` est le bump.)_

## Les 8 défauts corrigés

**Données / Alternance (les plus graves) :**
1. **#555 — perte de données examens** (`normalizeExamGoal`) : l'id dérivé dépendait de la **date
   seule** → deux épreuves le **même jour** (courant en BTS CG : matin + après-midi) fusionnées en une,
   perte **persistée** à chaque chargement/import. Fix : id = date **+ slug du titre**. Un id explicite
   déjà persisté reste prioritaire → l'épreuve existante d'Adrien ne bouge pas.
2. **#569 — funnel figé** (`jobStatusFromText`) : `relanc` était passé **après** `entretien` → « relance
   **pour** entretien », « relancé, toujours pas d'entretien » classés `entretien` (rang 3, **jamais
   régressé** au re-sync) → taux de réponse **surévalué**. Fix : `relance` avant `entretien`, après
   refus/accepté (les vrais gains de #569 conservés). Contrepartie assumée : « relancé, entretien
   décroché » → `relance` (récupérable), là où l'inverse était définitif.
3. **#572 — candidatures envoyées perdues du funnel** : `[\s\S]{0,12}` laissait « **pas** de retour,
   **postulé** le 3 » basculer en « à postuler » → la candidature envoyée sortait des stats à chaque
   sync. Fix : la négation ne franchit plus qu'une liste blanche de mots de liaison (jamais de
   ponctuation). 16 cas FR validés.

**Coach / études :**
4. **#558 — inversion de priorité** (`orderCoachNotes`) : le rang d'une note « fuyait » vers la note
   suivante → « c'est ton jour de jambes » (anodin) héritait du rang 0 d'une alerte blessure et passait
   **devant** une vraie alerte sommeil. Fix : une note qui ouvre par « Et… » n'hérite jamais ; l'héritage
   ne franchit plus une frontière de note. La soudure prémisse→conclusion d'un même guard est préservée.
5. **#562 — rythme de révision absurde** (`studyPacing`) : en multi-épreuves, **43** révisions (2
   examens) divisées par les **12** jours jusqu'à l'examen le plus proche → « vise ~26/semaine ⚠️ ».
   Fix : borner les révisions comptées à l'horizon de cette épreuve (`a.date <= c.date`). Sans effet en
   mono-épreuve.
6. **#591 (majeur) — palier rare éteint** : `milestoneShown` (booléen) hiérarchisait par **ordre du
   code** → un palier de 7 jours de journées complètes masquait un palier d'habitude de **365 jours**,
   célébré une seule fois dans une vie. Fix : rang d'**ampleur** (`milestoneShownAt`) — un jalon ne se
   tait que face à un jalon déjà montré d'ampleur ≥.
7. **#591 (mineur) — record perso éteint** de la même façon. Fix : la note de record n'est plus gardée
   par le palier de journées complètes (autre sujet).
8. **#582 — code mort** : un crédit nutrition « Déjà noté aujourd'hui ✅ » **inatteignable** (masqué par
   le bloc « cible protéines », toujours exécuté dès qu'un profil existe — ce que `normalizeState`
   garantit). La version 2.0.201 promettait ce changement fantôme. Fix : bloc retiré, test retiré,
   entrée CHANGELOG 2.0.201 réécrite honnêtement.

## La suspicion RÉFUTÉE

`upsertExamGoal` (#565) « écraserait deux épreuves du même jour » : **faux** au niveau du commit — il
**réduit** la perte (avant, n'importe quel 2ᵉ planning à n'importe quelle date écrasait le précédent).
La vraie racine était en amont (`normalizeExamGoal`, #555), corrigée ci-dessus.

## Vérifs

- **541 tests** + smoke verts (+ 4 tests de non-régression #592 ; 5 tests mis à jour vers le
  comportement corrigé ; 1 test de code mort retiré ; 1 check smoke `examListUI` réaligné sur le
  nouveau format d'id).
- **Navigateur** : funnel corrigé (relance/postule/refus) et deux épreuves le même jour conservées,
  vérifiés via le vrai `normalizeState` et le pipeline de statut.

## Non publié

Correctifs poussés sur `master` (le VPS doit bâtir sur du code corrigé cette nuit), mais **pas de
Release** : dernière publiée `v2.0.183`, la publication attend le « publie » d'Adrien.

Domaine : robustesse
