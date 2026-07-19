# Proposition — `examGoals[]` : suivre plusieurs épreuves du BTS CG

_Rédigé le 2026-07-19 · statut : ✅ **VALIDÉ par Adrien le 2026-07-19 — option A retenue (modèle `examGoals[]` d'abord)**_

> ▶️ **Autorisé en autonomie, PAR ÉTAPES** (étape 1 = modèle + migration rétro-compatible + tests ; l'UI multi-examens exige un check smoke bloquant).
> ❓ **Reste ouvert** : taxonomie des matières (liste BTS CG figée vs texte libre) et vraies dates d'épreuves. **Défaut sûr retenu** : `subject` en **texte libre**, aligné sur la taxonomie déjà déduite par `studyBySubject` — n'invente aucune matière ni aucune date.

## 1. Problème

Un **BTS CG a plusieurs matières et plusieurs épreuves, à des dates différentes**. L'app n'en suit
**qu'une seule à la fois** :

- `app.js:22` — l'état par défaut porte un **objet unique** : `examGoal: { title: '', date: '' }` ;
- `app.js:23` — `normalizeState` le normalise comme un objet unique ;
- `app.js:872` — le formulaire de planning fait une **affectation directe** :
  `examGoal={title:$('#studyTitle').value.trim()||'Examen',date:$('#studyExam').value}`
  → **planifier une 2ᵉ épreuve efface la 1ʳᵉ**, silencieusement.

Six fonctions le consomment au singulier : `upcomingKeyDates` (`logic.js:1702`), `keyDateMarkers`
(`logic.js:1729`), `examCountdown` (`logic.js:1770`), `examReminderDue` (`logic.js:1778`),
`studyPacing` (`logic.js:1789`), et le coach (`logic.js:4922`). Aucune occurrence de `examGoals`
au pluriel dans le code.

Autre pièce du puzzle : `studyBySubject` (`logic.js:1750`) **groupe déjà par matière**, mais déduit la
matière du **titre** de l'événement d'agenda et ne porte ni date d'examen ni objectif propre. Il y a
donc déjà une taxonomie de matières implicite — à réconcilier avec le nouveau modèle plutôt qu'à
doubler.

**Concrètement, aujourd'hui** : tu ne peux pas voir « J-12 avant l'épreuve de Droit **et** J-40 avant
Compta », ni équilibrer tes révisions entre deux échéances. Le compte à rebours, les rappels et
l'allure de révision ne connaissent qu'une seule date.

## 2. Options

| | Option | Portée |
|---|---|---|
| **A** | **Modèle `examGoals[]`** de `{id, subject, title, date}` + migration rétro-compatible de l'`examGoal` unique. Les consommateurs prennent « la plus proche » ou itèrent. | Le socle propre. Débloque tout le reste. |
| **B** | **Minimal** : attacher une date d'examen par matière à `studyBySubject`, sans toucher `examGoal`. | Peu de code, mais laisse deux notions d'examen concurrentes → dette immédiate. |
| **C** | **Complet d'un coup** : `examGoals[]` + objectifs et allure **par matière** + planning multi-échéances qui répartit la charge entre matières jusqu'à leurs dates respectives. | Ce que tu veux vraiment à terme. |

## 3. Recommandation — **A d'abord, C comme cible**

Poser le **modèle de données** en premier, avec migration, puis porter les six consommateurs. C est la
destination (c'est la Vague C de l'audit : « le générateur équilibre plusieurs matières jusqu'à leurs
dates respectives, avec répétition espacée »), mais tenter C sans A d'abord, c'est refaire le modèle
en cours de route. B est à écarter : deux notions d'examen en parallèle, c'est la garantie d'un bug
d'incohérence plus tard.

**Découpage proposé (multi-commits, pas une itération)** :

1. `examGoals[]` dans `defaults` + migration dans `normalizeState` (l'ancien `examGoal` unique devient
   le premier élément) — **rétro-compatible, aucune perte**.
2. Portage des 6 consommateurs (+ leurs tests `node:test`).
3. UI : ajouter / lister / supprimer des épreuves. ⚠️ **Changement de renderer → check smoke bloquant obligatoire.**
4. Seulement ensuite : allure et planning **par matière** (option C).

## 4. Risques

- **Surface large** : 6 fonctions pures + leurs tests. À faire par étapes, chacune verte.
- **Migration** : un utilisateur avec un examen unique existant doit continuer à marcher **à
  l'identique** — c'est le point à tester en premier.
- **UI multi-examens** : c'est là que le risque de régression est réel (le planning actuel est un
  formulaire simple) → smoke bloquant exigé.
- **Double notion de matière** : aligner avec la taxonomie déjà déduite par `studyBySubject`, sinon
  « Droit » (titre) et « Droit » (matière déclarée) divergeront.

## 5. Ce qui dépend d'Adrien

1. **Liste de matières figée** (le référentiel BTS CG : Droit, Éco, Management, Compta financière,
   Fiscalité…) **ou texte libre** ? Ça change l'UI et la fiabilité du regroupement.
2. **Combien d'UI multi-examens veux-tu ?** Juste pouvoir en enregistrer plusieurs et voir le
   prochain compte à rebours, ou un vrai tableau par matière (retard, prochaine révision, allure) ?
3. **Le planning doit-il répartir automatiquement** entre plusieurs matières jusqu'à leurs dates
   respectives (option C), ou tu continues à planifier matière par matière à la main ?
4. Tes **vraies dates d'épreuves** — si tu me les donnes, la migration peut les poser directement.
