# Proposition — Acter le gel du coach adaptatif

_Rédigé le 2026-07-19 · statut : ✅ **TRANCHÉ par Adrien le 2026-07-19 — gel REFUSÉ**_

> ## ⚖️ Décision d'Adrien : ni option A, ni statu quo — « qualité, pas volume »
>
> Adrien a tranché : **« améliore toujours le Coach, c'est important »**. Le **gel dur (option A) est
> donc écarté** — le coach reste un chantier vivant. Mais le diagnostic ci-dessous reste valable, d'où
> la règle retenue, plus fine que les trois options proposées :
>
> - **Encouragé** : corriger les guards qui se déclenchent à tort ou se contredisent · fusionner ou
>   **supprimer** les notes redondantes · **hiérarchiser** ce qui remonte en premier · reformuler plus
>   court/plus juste · curer au rendu. _Retirer une note vaut souvent mieux qu'en ajouter une._
> - **Sous condition** : ajouter une note **exige** de prouver dans le recap qu'aucune note existante
>   ne couvre l'angle **et** d'appliquer le contrôle de cohérence §4 ter.
> - **La rotation des domaines (§4 bis) s'applique pleinement au coach** : c'est elle, et non une
>   interdiction, qui empêche de refaire 60 itérations d'affilée.
>
> **Ce que ça invalide dans le document** : la recommandation §3 (option A) et le tripwire à 93 clés
> — figer la liste des champs contredirait l'autorisation conditionnelle d'en ajouter. Le reste du
> constat (§1) tient et fonde la nouvelle règle.
>
> **Conséquence directe** : le vrai gisement n'est plus l'ajout mais la **hiérarchisation** — les 89
> clauses sont concaténées dans **l'ordre du code**, donc l'urgent peut passer après l'accessoire.
> C'est le chantier ouvert par cette décision.

_Le document original est conservé ci-dessous pour la trace du raisonnement._

---

## 1. Problème

`adaptiveCoachFocus` (`src/lib/logic.js:4960`) a absorbé **60 itérations autonomes d'affilée**
(commits #487→#546, versions 2.0.87→2.0.177). État constaté :

- **93 champs** renvoyés dans un seul littéral d'objet (`logic.js:7311-7315`), dont 60+ notes
  optionnelles (`…Guard`, `…Trend`, `…Driver`, `…Pace`, `focusGoalFresh/Drained/Steady/Ahead/Bonus`…) ;
- **89 `insight +=`** : chaque note concatène une clause à **une seule** chaîne lue par l'utilisateur ;
- `logic.js` est passé de **5 649 à 9 488 lignes (+68 %)** depuis l'audit du 2026-07-16.

Le signe le plus net de rendement décroissant : plusieurs guards n'existent que pour **boucher le trou
laissé par un autre guard** — `focusGoalSteady` (`logic.js:5354`), `focusMarginDrained` (`logic.js:5429`),
`focusAheadDriver` (`logic.js:5403`, une note-driver ajoutée à une autre note-driver). Chaque pilier a
déjà sa note de tendance, de forme, d'allure **et** d'inter-pilier : l'espace de conception est **épuisé**.

Le symptôme visible (pavé de ~620 caractères) a été corrigé **au rendu** en #546
(`splitCoachInsight`, `app.js:170`, verrouillé par le check smoke `coachCuration`). Le fond — une
fonction qui grossit sans fin — n'est pas traité.

## 2. Options

| | Option | Ce que ça donne |
|---|---|---|
| **A** | **Gel dur** — plus aucun champ ni `insight +=`. Seuls restent : correctif d'un guard qui se déclenche à tort ou en contredit un autre (prouvé par un test), et curation au rendu. | Arrête net la croissance. Risque : refuser une vraie bonne idée un jour. |
| **B** | **Curation seule** — on continue d'ajouter, mais on impose de retirer/fusionner une note à chaque ajout (budget constant). | Garde la porte ouverte, mais demande un arbitrage éditorial à chaque fois — donc infaisable en autonomie. |
| **C** | **Statu quo** avec un simple rappel « varie le domaine ». | Déjà tenté : c'est exactement ce qui a produit les 60 itérations. |

## 3. Recommandation — **Option A**

Le gel est déjà écrit dans `VPS-AUTOPILOT.md §3` ; cette proposition sert à **l'acter** et à en fixer
le périmètre exact. L'option B suppose un jugement éditorial (« quelle note vaut moins que la
nouvelle ? ») qu'un agent autonome n'a pas les moyens de rendre — c'est précisément ce jugement qui a
manqué 60 fois.

**Mécanisme d'application proposé** (ce qui rend le gel réel plutôt que déclaratif) : un test
« tripwire » qui fige la **surface de champs** renvoyée.

- `adaptiveCoachFocus` liste ses champs **inconditionnellement** (chacun vaut `null` par défaut) →
  `Object.keys()` est **déterministe**, indépendant de l'entrée : le test ne peut pas être instable.
- Le test compare `Object.keys(...).sort()` à une liste figée de **93 clés**, avec un commentaire
  renvoyant à §3. Ajouter un 94ᵉ guard **fait rougir la suite**, ce qui force à éditer la liste — donc
  à violer une règle explicite plutôt qu'à déraper sans s'en rendre compte.
- Aucun test actuel ne fixe cet ensemble : les 419 assertions existantes portent toutes sur
  `.insight` / `.action` / des valeurs isolées.

⚠️ **Limite assumée** : ça verrouille la surface de **champs** (le motif suivi par les 60 guards
précédents), pas un futur ajout qui n'écrirait que du texte sans nouveau champ. Ce résidu-là est
couvert par la curation au rendu de #546.

## 4. Risques

- **Faux positif** : un vrai correctif légitime pourrait devoir toucher la liste figée → le commentaire
  doit dire explicitement que **corriger** un guard existant n'ajoute pas de clé, donc ne touche pas au test.
- **Rigidité** : si Adrien veut un jour un nouvel angle coach, il faudra lever le gel — c'est voulu,
  la décision lui revient.
- Aucun risque technique : ajout d'un test pur, pas de renderer, pas de dépendance, pas de bump.

## 5. Ce qui dépend d'Adrien

1. **Valides-tu le gel (option A) ?** Si oui, la règle §3 reste en l'état.
2. **Veux-tu le tripwire** (test qui fige les 93 clés) ou le gel en prose suffit-il ?
3. Y a-t-il **un** angle coach que tu voulais encore et qui n'a jamais été fait ? C'est le moment de
   le dire — il serait traité comme exception explicite, avant fermeture.
