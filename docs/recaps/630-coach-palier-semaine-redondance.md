# #630 — Coach « Le focus du moment » : le palier de semaine ne redit plus la note de base (2.0.240)

**Domaine : coach** — priorité de nuit coaching (§3 QUALITÉ, pas volume : suppression d'une redondance
au rendu, zéro champ ajouté). Rotation OK avant de coder : `coach` absent des **2 derniers** recaps
(629 nutrition, 628 sommeil) et **1×** sur les 5 derniers (627) → autorisé ; `nutrition` et `sommeil`
bloqués.

## Contexte / choix

La demande de nuit d'Adrien (DEMANDES.md « À traiter ») = pousser le coaching à fond. La famille de
défauts « verdict textuel contredit ses propres chiffres » (traitée en #623/#627/#628/#629) est
épuisée : angle **neuf** cherché, conformément à la note mémoire `coach-leads-contradictions-2guards`
(« candidat : milestones "une semaine" redondants »). Une passe d'exploration a confirmé ce candidat
précis dans `adaptiveCoachFocus`.

## Défaut (prouvé par rendu §4 ter)

Dans `adaptiveCoachFocus`, bloc journées complètes, deux `insight +=` **consécutifs** (aucune note
intercalée, `logic.js:7641` puis `:7648`) s'affichaient collés dès qu'une série de journées complètes
franchissait un palier (7, 14, 30…) :

- Note de base : `« 7 jours d'affilée à 3+ piliers — tu enchaînes les journées complètes. 🔥 »`
- Palier : `« 🏅 Palier franchi : une semaine complète de journées pleines ! »`

« **une semaine complète de journées pleines** » ne faisait que **redire, en d'autres mots**, les
« **7 jours** de **journées complètes** » de la phrase juste avant (7 j = une semaine ; journées
complètes = journées pleines) — double énoncé du même fait, avec en prime l'écho « complètes »/
« complète ». Les deux clauses étant de rang d'urgence par défaut, `orderCoachNotes` les laissait
adjacentes → elles rendaient réellement bout à bout.

Le dispositif `milestoneShown`/`milestoneShownAt` (#592) dédoublonne bien les paliers **entre familles**
(journées complètes ↔ habitude ↔ record), mais ne protégeait pas la note de base 7641 qui décrit déjà
le même jalon en clair.

## Correctif (curation §3, zéro champ)

Le palier ne **répète** plus le fait (« … de journées pleines ») : il **reformule** le seuil en unité
parlante, ce que la note de base ne fait pas. Table de nommage (réutilise le vocabulaire du palier
d'habitude `logic.js:7931`, `entière` pour casser l'écho « complète ») :
`3→trois jours · 7→une semaine entière · 14→deux semaines · 30→un mois entier · 60→deux mois ·
100→cent jours · 180→six mois · 365→une année entière`, sinon `${n} jours`. Résultat rendu :
`« … tu enchaînes les journées complètes. 🔥 🏅 Palier franchi : une semaine entière ! »`. Seul le champ
texte `completeDayMilestone`/l'insight change ; la valeur `completeDayMilestone` (télémétrie), la note
de base, le « Encore 1 jour pour franchir le palier » et la dédup inter-familles sont **inchangés**.

## Contrôle §4 ter

Insight cumulé rendu sur état chargé (7 j complets + habitude au palier 7) relu en entier → plus de
« de journées pleines », plus d'écho « complète ». Vérifié aussi à 30 j.

## Vérif

`cd src && xvfb-run -a npm run verify` → **100 % vert** : 569 tests (2 asserts ajoutés : plus de
`de journées pleines`, fait « journées complètes » énoncé 1× ; 3 asserts de texte figé mis à jour dans
logic.test.js) + smoke `coachFocus` (3 checks de texte figé mis à jour + garde `!/de journées pleines/`).

Build **2.0.240**. CHANGELOG en tête de `logic.js` + les 2 assertions `CHANGELOG[0].v`.

Domaine : coach
