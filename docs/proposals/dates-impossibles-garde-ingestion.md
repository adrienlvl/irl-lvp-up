# Dates impossibles : une garde d'ingestion canonique plutôt que du colmatage réactif

_Proposition écrite le 2026-07-22 (boucle #694). Sujet : robustesse données. Déclencheur : quota de
propositions §4 bis.4 (19 recaps de code depuis la dernière proposition #674, aucune dans les 10
derniers) + rotation qui bloque le domaine `robustesse` en CODE ce tour (#692 est l'avant-dernier
recap). Le sujet est donc **cadré ici**, le code est **différé** jusqu'à ta décision de périmètre._

## 1. Problème — prouvé, récurrent, nommé « dette n°1 »

L'app possède **deux** gardes de clé-date, volontairement distinctes (`logic.js:30-52`) :

- `isBoundedDateKey(s)` — format `AAAA-MM-JJ` **+ bornes** (mois 1-12, jour **1-31**). Accepte donc
  `2026-02-30`, `2026-04-31`, `2026-06-31` : format valide, **date inexistante**.
- `isRealDateKey(s)` — exige une **date calendaire réelle** via un aller-retour `new Date` (jour ≤
  dernier jour du mois, 29 févr. rejeté hors bissextile).

Le commentaire de `isRealDateKey` (`logic.js:35-39`) énonce déjà l'invariant : *« Nécessaire là où une
clé sert ensuite à `new Date(s + 'T12:00:00')` … une date format-valide mais impossible … déborde
silencieusement au mois suivant et fabrique une paire de jours consécutifs FANTÔME »*.

**Cet invariant a été violé site par site, et corrigé site par site, trois fois** :

- **#671 / #676** (2.0.276) : `bestWellnessWeek` / `bestTonnageWeek` — records fantômes → `isRealDateKey`.
- **#692** (2.0.292) : `normalizeRecurring` (`logic.js:572-573`) validait `startDate`/`until` par
  `isBoundedDateKey` → un « mensuel le 31 avril » s'ancrait au **1ᵉʳ de chaque mois** → `isRealDateKey`.

C'est un **whack-a-mole** : on répare le trou qu'on vient de voir, l'invariant reste non tenu ailleurs.
La mission de nuit du 2026-07-22 le nomme explicitement *« dette récurrente n°1 »*.

### 1 bis. Le site frais qui prouve que le trou est encore ouvert (études)

`normalizeExamGoal` (`logic.js:1911`) valide la date d'une épreuve par **regex de format seul** :

```js
const date = (typeof g.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g.date)) ? g.date : '';
```

`2026-02-30` **passe**. Cette date alimente ensuite, **sans re-validation réelle** :

- `examCountdown` (`logic.js:1993`) → `daysUntil(todayKey, g.date)` ;
- `nearestExam` (`logic.js:1948`) → `daysUntil(...)`.

Or `daysUntil` (`logic.js:1808`) fait `new Date(+y, +m-1, +d)` : `new Date(2026, 1, 30)` **déborde au
2 mars**. Résultat concret : une épreuve saisie/importée à `2026-02-30` affiche un **compte à rebours
faux** (décalé de 2 jours), une « semaine restante » fausse, et peut se classer au mauvais rang dans
`nearestExam`. C'est **exactement** le motif #692, non corrigé, en domaine études.

> Portée réelle : au clavier, le sélecteur de date empêche `2026-02-30`. Mais les valeurs entrent
> **aussi** par : restauration de sauvegarde (`unwrapBackup`), import `.ics` abîmé
> (`parseIcsDateTime` → `applyImportedIcs`), import Grand-Livre-Compta (`glcPlanningToEvents`), et une
> future **sync multi-appareils** (chantier 4) où le JSON n'est pas contraint par un `<input type=date>`.
> La garde d'ingestion est la seule qui tient face à ces sources.

## 2. Inventaire des points d'ingestion encore en garde « format seul »

Recensement `grep` + lecture (à confirmer exhaustivement à l'implémentation) :

| Point d'entrée | Garde actuelle | Descente vers `new Date` ? | Risque |
|---|---|---|---|
| `normalizeExamGoal` `l.1911` | bare regex | **oui** (`daysUntil` via `examCountdown`/`nearestExam`) | **compte à rebours faux** |
| `glcPlanningToEvents` `l.1355` | bare regex | indirect (event `study` → agenda) | jour fantôme injecté |
| `normalizeAgendaItem` `l.806` | `isBoundedDateKey` | surtout comparé en **chaîne** (`todayItems`) | faible (case introuvable) |
| `normalizeTodo` `l.138/141` | `isBoundedDateKey` | comparé en **chaîne** (`doneAt === today`) | faible |
| `parseCsv`/`parseApplicationsCsv` `l.291` | `jobDateFromText` | alternance (module **sacré**) | à traiter à part (cf. proposition classifieurs) |
| `parseIcsDateTime` `l.944` | validation propre | via `normalizeAgendaItem` | couvert en aval |

Le point **franchement faux** est `normalizeExamGoal` ; `glcPlanningToEvents` est le second candidat
(source externe). Les autres sont soit comparés en chaîne (bénins), soit déjà couverts, soit dans le
périmètre alternance qui a **sa propre** proposition (`robustesse-classificateurs-import-alternance.md`).

## 3. Options

**Option A — Garde canonique à l'ingestion, ciblée sur les sites prouvés (reco).**
Remplacer la garde de date par `isRealDateKey` **uniquement** aux points d'entrée qui descendent vers
`new Date` et ne sont pas déjà couverts : `normalizeExamGoal` (l.1911) et `glcPlanningToEvents`
(l.1355). Chaque changement = un test node échoue-avant / passe-après (`2026-02-30` → date vidée /
event non produit ; `2024-02-29` bissextile conservé). Périmètre étroit, réalisable en **étapes
autonomes** (A.1 études, A.2 import GLC), aucun ripple coach.

- ✅ Ferme le trou prouvé sans toucher aux sites bénins (chaîne) ni au module alternance sacré.
- ⚠️ Changement de comportement **visible** : une épreuve impossible n'affiche plus de compte à rebours
  (date vidée) au lieu d'un compte faux — c'est un gain, mais c'est un changement → bump + §4 ter.

**Option B — `isRealDateKey` partout où une clé-date est ingérée (uniformisation totale).**
Basculer `normalizeTodo`, `normalizeAgendaItem`, etc., de `isBoundedDateKey` vers `isRealDateKey`, et
**retirer `isBoundedDateKey`** du code (une seule garde à retenir).

- ✅ Invariant tenu **par construction** ; plus jamais de whack-a-mole.
- ⚠️ Touche des sites aujourd'hui bénins (comparaison chaîne) → surface de régression plus large pour un
  gain nul sur ces sites ; supprimer une fonction exportée impacte `logic.test.js` + le smoke.

**Option C — Statu quo réactif.** Continuer à corriger au cas par cas quand un site fait surface.

- ✅ Zéro risque immédiat. ❌ La dette « n°1 » reste ouverte ; le site études est **déjà** faux
  aujourd'hui ; la sync multi-appareils (chantier 4) rouvrira le problème en grand.

## 4. Recommandation

**Option A.** Elle corrige le seul site **prouvé faux** (études) + le seul point d'ingestion externe à
risque (GLC), sans élargir la surface de régression aux sites bénins ni empiéter sur la proposition
alternance. Elle est **réalisable en autonomie par étapes** (A.1/A.2), chacune avec un test rouge→vert,
donc parfaitement dans le cadre de la boucle **dès que la rotation rouvre le domaine `robustesse`**.
L'option B (retrait de `isBoundedDateKey`) est séduisante mais échange un vrai risque de régression
contre un gain théorique sur des sites où la date n'est jamais donnée à `new Date` — à ne faire que si
tu veux « une seule garde » comme règle d'hygiène.

## 5. Risques

- **Comportement** : après A, une date impossible est **vidée** à l'ingestion (études) ou l'occurrence
  n'est **pas** produite (GLC). C'est le comportement voulu, mais visible → **bump** + contrôle §4 ter
  (relire le rendu cumulé du compte à rebours sur un état chargé).
- **Données existantes** : une épreuve déjà persistée avec une date impossible verrait sa date vidée au
  prochain `normalizeExamGoal` — donnée « nettoyée » silencieusement. À confirmer : acceptable ou
  faut-il **conserver** la valeur brute en la signalant plutôt qu'en la vidant ?
- **Tests/smoke** : A n'ajoute que des tests (aucun retrait d'export). B retirerait `isBoundedDateKey`
  → mettre à jour les tests qui l'appellent + l'export.
- **Rotation** : l'implémentation est du domaine `robustesse` → elle attend un tour où `robustesse`
  n'est pas dans les 2 derniers recaps (cette proposition-ci est du `docs`, elle ne consomme pas le tour).

## 6. Ce qui dépend d'Adrien (à trancher)

1. **Périmètre** : **A** (2 sites prouvés, étroit) · **B** (uniformisation totale + retrait de
   `isBoundedDateKey`) · **C** (statu quo réactif) ?
2. **Donnée existante impossible** : la **vider** au prochain normalize (simple, actuel) ou la
   **conserver en la signalant** (plus d'UX, plus de code) ?
3. **Réalisation** : autonome par étapes (A.1 études → A.2 GLC, à un tour où `robustesse` est libre) ou
   tu préfères la grouper avec la refonte IndexedDB / sync (session supervisée, puisque la sync
   rouvrira le sujet) ?
4. **`glcPlanningToEvents`** : le durcir dans ce lot, ou le laisser au futur chantier « scan/import »
   (proposition `scan-frigo-assiette.md`) ?
