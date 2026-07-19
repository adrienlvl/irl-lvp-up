# 548 — La carte du coach redevient brève, sans jamais cacher une alerte (2.0.179)

> ⚠️ **Deuxième itération `coach` d'affilée : EXCEPTION explicite d'Adrien** (« enchaîne sur le
> coach, et après fait des boucles sur la rotation que t'avais prévu »). **Ce n'est PAS un
> précédent** : la rotation des domaines (§4 bis) reprend dès la boucle #549, et seul Adrien peut
> accorder une dérogation. Ne pas lire « 2 recaps coach de suite » comme un feu vert.

## Méthode : mesurer au lieu de supposer

Plutôt que de deviner ce qui clochait dans 89 clauses, un **harnais de fuzz** rejoue le coach sur
**576 à 1 260 états** réalistes et mesure ce qui sort.

**Première piste — les contradictions — s'est révélée FAUSSE, et c'est dit :** sur 1 260 scénarios,
**zéro doublon et zéro contradiction**. L'obsession des 60 itérations précédentes pour les exclusions
mutuelles (« subordonné à », « mutuellement exclusif de ») a réellement fonctionné. La seule
« contradiction » détectée était un **faux positif du script de mesure** (`repos` matchait « cerveau
repos**é** » — le piège de sous-chaîne du bug #446).

## Le vrai défaut, lui, était mesurable

La curation de #546 gardait « **deux phrases** » — **quelle que soit leur longueur** :

| | avant | après |
|---|---|---|
| Carte, longueur médiane | **273 c** | **53 c** |
| Cartes > 300 c | **144 / 576 (25 %)** | **0** |
| Carte, maximum | **420 c** | **219 c** |
| Notes urgentes cachées | 0 | **0** |

Objectif « punchy » donc à moitié tenu seulement. Le budget est désormais en **caractères**
(`COACH_CARD_BUDGET = 260`), le **verdict toujours gardé entier** (jamais tronqué en plein milieu).

## La nuance qui fait tout : l'urgence prime sur le budget

Première version du budget : appliqué aveuglément → **96 alertes de rang ≤ 1 se sont retrouvées
reléguées** derrière le dépliant, soit exactement ce que la hiérarchisation de #547 venait de
corriger. Brièveté et sécurité s'opposaient.

Règle retenue : **le budget ne filtre que l'ACCESSOIRE.** Une alerte d'intégrité physique ou de
charge passe sur la carte **même si elle est longue**. Résultat : bref par défaut (médiane 53 c),
long **uniquement** quand ça le mérite.

## Second piège attrapé EN NAVIGATEUR

Carte mesurée à **365 c** malgré le budget : mon classifieur donnait le **rang 0** à une note
**pédagogique sur le sommeil** parce qu'elle contient « … tout en augmentant le risque de
**blessure** » en incise. La note *mentionne* la blessure, elle ne *porte pas* dessus.

→ Motifs du rang 0 **ancrés** (`fracture de fatigue`, `périostite`, `première cause de blessure`,
`zone de blessure`, `tendons`) au lieu d'un `blessure` nu. Cette note retombe au rang 2 (sommeil),
soumise au budget. Après correction : **aucune carte > 300 c, toujours 0 alerte cachée.**

> Encore une fois, la suite était **verte** et le rendu était **faux**. Deux boucles de suite, c'est
> le contrôle §4 ter qui a trouvé le défaut. Et deux fois sur trois, la cause était un **motif de
> sous-chaîne trop lâche** — la signature exacte du bug #446.

## Vérifs

- **518 tests** + smoke verts. Tests ajoutés : faux positif « blessure » en incise (rang 2, pas 0).
- Check smoke **bloquant** `coachCuration` étendu : note accessoire longue → reléguée ; alerte longue
  → **sur la carte** malgré le budget.
- **Navigateur** : journée chargée sans alerte → carte brève ; verdict jamais coupé.

## Fichiers

- `src/lib/logic.js` — rang 0 ancré + CHANGELOG 2.0.179.
- `src/app.js` — `COACH_CARD_BUDGET`, budget en caractères, urgence prioritaire sur le budget.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs` — tests + check bloquant étendu.

Domaine : coach
