# Proposition — Planning d'études multi-échéances avec répétition espacée (Cap 3.0, Vague C)

> **Statut : design — en attente des décisions d'Adrien** (voir la fin du document).
> Écrit par la boucle autonome #587 (2026-07-20). **Aucun code n'est modifié** par cette proposition ;
> c'est un document de cadrage au sens de VPS-AUTOPILOT §4 (« gros chantier = proposition, pas
> implémentation »).

## Pourquoi ce document

Le Cap 3.0 « Vague C — Études BTS, en vrai » (`docs/AUDIT-ET-ROADMAP-3.0.md:92-97`) liste trois
briques. Deux sont faites ou amorcées :

- **Multi-matières / multi-épreuves** → livré par **P6** (`examGoals[]`, boucles #555→#565) :
  le modèle, les consommateurs et l'UI ajouter/lister/supprimer une épreuve existent.
- **Bilan par matière** → amorcé (`studyBySubject`, `logic.js`) : total/fait/à venir/en retard par
  matière, trié par urgence.

La **troisième brique — « Planning multi-échéances : le générateur de révision équilibre plusieurs
matières jusqu'à leurs dates respectives, avec répétition espacée »** — **n'est ni construite ni
proposée**. Ce document la cadre. C'est le **seul** chantier Cap 3.0 restant qui soit à la fois le
besoin réel d'Adrien (BTS CG) **et entièrement autonome** (aucune dépendance externe, aucun compte,
aucune IA — contrairement à la Vague B).

## Le problème, prouvé dans le code

`planStudySessions(config)` (`logic.js`) prend **une seule** matière et **une seule** date d'examen :

```js
const { title = 'Révision', time, durationMin, weekdays, startDate, examDate, baseId } = config;
// … pose un bloc IDENTIQUE sur chaque `weekday` entre startDate et examDate.
events.push({ title, date, time, durationMin, kind: 'study', … });
```

Conséquences mesurables aujourd'hui :

1. **Mono-matière.** Tous les créneaux portent le **même titre**. Réviser Droit **et** Compta jusqu'à
   deux dates différentes impose de lancer le formulaire deux fois — et le second passage **écrase**
   l'`examGoal` unique (`app.js:920` : `state.examGoal = {title, date}`), même si `examGoals[]`
   (P6) sait, lui, en stocker plusieurs. Le générateur **ignore complètement `examGoals[]`**.
2. **Aucune répétition espacée.** `grep -niE "espac|leitner|répétition|spaced"` sur `logic.js` = **rien**
   côté planning. Le plan est **uniforme** : autant de temps à J-60 qu'à J-2, aucune intensification à
   l'approche d'une date, aucun re-passage programmé d'une matière déjà couverte. Or la répétition
   espacée est **le** levier de mémorisation pour un examen — c'est explicitement ce que demande la
   Vague C.
3. **Pas d'équilibrage.** Avec plusieurs matières à des dates différentes, rien ne répartit le temps
   selon l'urgence (jours restants) ni la couverture déjà faite (`studyBySubject` sait pourtant qui
   est « en retard »).

## Options

### Option A — Multi-matières équilibré, SANS répétition espacée
Un générateur qui, à partir de `examGoals[]` (chaque épreuve = une matière datée), répartit les
créneaux disponibles entre matières par **round-robin pondéré par l'urgence** (jours jusqu'à l'examen)
et arrête chaque matière à sa propre date. Chaque créneau porte le **titre de sa matière**
(→ `studyBySubject` devient un vrai bilan par matière, sans changer sa signature).
- ➕ Simple, purement additif, réutilise `examGoals[]` + `mergePlannedEvents` (régénération sans
  doublon déjà en place via `refId`).
- ➖ Ne mémorise pas mieux : pas de re-passage espacé.

### Option B — Multi-matières équilibré **+ répétition espacée au niveau MATIÈRE** _(recommandée)_
Option A, plus un **rythme de révision espacé par matière** : une matière fraîchement introduite
revient à intervalles **croissants** (p. ex. 1 j → 3 j → 7 j → 14 j, plafonnés par la date d'examen),
puis **se resserre** dans la dernière ligne droite avant sa date. La pondération combine
**jours-jusqu'à-examen** (urgence) et **couverture déjà faite** (repli sur `studyBySubject`
`overdue`/`doneRate`).
- ➕ Apporte le vrai bénéfice pédagogique (mémorisation) **sans** modéliser des « notions »
  (l'app n'a pas de cartes/topics — voir Option C). Reste **100 % logique pure testable**, zéro
  dépendance. S'appuie sur des briques existantes (`examGoals[]`, `studyBySubject`,
  `mergePlannedEvents`, `nearestExam`).
- ➖ Un cran plus complexe : il faut un modèle d'intervalles clair et **borné** (pas de plan à rallonge),
  et une UI qui laisse choisir les matières/jours dispo.

### Option C — Répétition espacée par NOTION (SRS complet, type Anki/Leitner par carte)
Chaque **notion** saisie (pas seulement la matière) suit son propre calendrier de rappels.
- ➕ La forme la plus fidèle de la répétition espacée.
- ➖ **Hors périmètre** : l'app **ne modélise aucune notion** (ni cartes, ni questions). Il faudrait un
  nouveau sous-système de saisie de contenu — un chantier d'un tout autre ordre, une app dans l'app.
  À écarter pour la 3.0.

## Recommandation

**Option B**, **implémentée par étapes autonomes** sur le modèle de P6 (chaque étape verte, testée,
sans rien casser) :

1. **B.1 — Le générateur, en logique pure.** Une fonction `planMultiSubjectStudy(examGoals, config)`
   (nom à confirmer) qui rend une liste d'événements `kind:'study'` équilibrés + espacés, **sans
   toucher au renderer**. Testée en premier (node:test), **pas de bump** (comme P6.1). Le
   `planStudySessions` mono-matière **reste** (rétro-compat : il ne disparaît jamais).
2. **B.2 — Brancher l'UI existante** pour alimenter le générateur à partir de plusieurs `examGoals[]`
   (au lieu d'écraser `examGoal`), avec check smoke **bloquant** (parcours : 2 matières datées →
   créneaux des deux visibles dans l'agenda, régénérables sans doublon). Bump ici (effet utilisateur).
3. **B.3 — Affinage** : intensification finale avant chaque date, garde-fous de charge quotidienne.

Pourquoi B et pas A : la répétition espacée **est** la demande nommée de la Vague C ; A la laisse de
côté. Pourquoi pas C : l'app ne modélise pas les notions, C est un autre produit.

## Risques & garde-fous

- **Ne jamais casser l'existant** (VPS-AUTOPILOT §3) : `planStudySessions` et le formulaire mono-matière
  actuels **restent fonctionnels**. Le multi-matières est un **ajout**, pas un remplacement.
- **Régénération sans doublon** : réutiliser le mécanisme `refId`/`mergePlannedEvents` déjà éprouvé —
  un `refId` par (matière, date, heure). Ne pas ré-inventer la fusion.
- **Plan borné** : plafonner le nombre de créneaux/jour et la longueur totale (le générateur actuel
  plafonne déjà à 400 itérations). Un plan « à rallonge » serait l'inverse du service rendu.
- **Aucune matière ni date inventée** (règle P6.1) : `subject` reste du **texte libre** saisi par
  Adrien ; l'app ne présume d'aucune épreuve BTS.
- **Charge UI** : la saisie de plusieurs matières + jours dispo est le point sensible → l'isoler en
  B.2/B.3, après un modèle pur solide (B.1) déjà couvert par les tests.

## Ce qui dépend d'Adrien — décisions à trancher

1. **Périmètre** : **A** (équilibrage multi-matières seul) · **B** (équilibrage + répétition espacée
   par matière, *recommandée*) · **C** (SRS par notion, *déconseillée : hors périmètre 3.0*) ?
2. **Modèle d'espacement** (si B) : **intervalles fixes** style Leitner (1-3-7-14 j) · ou **pondération
   continue** par jours-jusqu'à-examen (pas d'intervalles nommés, l'app dose seule) ?
3. **Source des matières** : réutiliser **`examGoals[]`** (chaque épreuve datée = une matière à
   réviser, déjà saisissable via l'UI P6) · ou une **liste de matières distincte** du planning ?
4. **Charge quotidienne** : **nombre de créneaux/jour fixe** que tu choisis · ou l'app **répartit
   automatiquement** selon tes jours disponibles et l'urgence ?
5. **Mode de réalisation** : le modèle B.1 est de la **logique pure testable** → réalisable en
   **étapes autonomes** (comme P6). Confirmes-tu que seule l'UI (B.2/B.3) mérite éventuellement une
   session supervisée, ou préfères-tu tout en supervisé ?

---

_Réf. : `AUDIT-ET-ROADMAP-3.0.md:92-97` (Vague C), P6 (`examGoals[]`, boucles #555→#565),
`planStudySessions`/`studyBySubject`/`mergePlannedEvents` (`logic.js`)._
