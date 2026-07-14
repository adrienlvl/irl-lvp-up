# #306 — Séance guidée : remplacer un exercice à la volée (1.9.240)

**Rotation 24 · item #3 · priorité Adrien : les séances guidées**

## Vérification des 4 pistes AVANT de coder
| piste | verdict |
|---|---|
| (a) RPE par série | Le « RPE » du code (app.js:130) n'est que l'affichage de `workout.effort` **de séance** (1–5). Pas de RPE par série → manque réel, mais lourd (modèle de données) et discutable. **Écarté.** |
| (b) Remplacer un exercice | Les occurrences de « remplacer » (403, 519) concernent la **restauration de données**, pas les exercices. Aucun contrôle de swap dans le dialogue guidé (liste des `id="guided*"` vérifiée). **Manque réel → retenu.** |
| (c) Sparkline dans le guidé | `exerciseVolumeSeries` est bien appelé, mais dans `renderExerciseProgression()` — un panneau séparé. Manque réel, **mais ferait doublon** avec « la dernière fois » (#303). **Écarté.** |
| (d) Sauter un exercice | `guidedNext` permet déjà d'avancer sans loguer. **Faux manque.** |

## Le manque retenu
Le dialogue guidé n'offrait **aucun moyen de changer d'exercice**. Si celui du jour
ne passe pas — douleur, matériel pris, simple envie — il fallait **sortir de la
séance**. C'est un blocage, pas un confort.

## Amélioration
Un bouton **🔄 Remplacer** à côté du nom de l'exercice, qui propose des équivalents.

### Logique pure — `exerciseAlternatives(name, library, equipment, exclude, cap)`
- **Mêmes zones musculaires** (via `exerciseZones`), triées par **recouvrement de
  zones décroissant** (le plus proche d'abord), puis par nom.
- **Filtrées par le matériel réellement disponible** (`filterByEquipment`).
- **Excluent l'exercice lui-même ET ceux déjà dans la séance** — sinon on
  proposerait un doublon de ce qu'il va faire juste après.
- Renvoie `[{ name, zones, overlap }]`, limité à `cap` (4).

### Garde-fou (cohérent avec #304)
Si des séries sont **déjà validées**, l'app demande confirmation en **nommant ce qui
sera perdu** : « Tu as déjà validé 1 série sur « Goblet squat kettlebell ». Les
remplacer par « Fentes arrière » ? ». Refus → rien ne bouge.

## Tests
- `logic.test.js` : test bâti sur la **vraie table `EXERCISE_ZONES`** (invariants),
  pas sur une table parallèle inventée qui divergerait — jamais l'exercice lui-même,
  recouvrement > 0, tri décroissant, exclusion des exercices de la séance, filtre
  matériel, cap, entrées invalides.
- `renderer-smoke.cjs` : check `guidedSwap`.
- `npm run verify` : **332 tests + SMOKE OK**.

### Une erreur de ma part, dite franchement
Mon premier test échouait sur le filtre matériel. **Le code avait raison, mon test
avait tort** : j'avais inventé `kind: 'kettlebell'`, alors que les clés de
`EQUIP_KIND_REQ` sont les libellés FR capitalisés (`'Kettlebell'`). Avec une clé
inconnue, `exerciseAvailable` considère qu'aucun matériel n'est requis — donc rien
n'était filtré. Test corrigé, pas le code.

## Vérif navigateur (séance guidée réelle, clics réels)
- Séance = Goblet squat + Fentes arrière. Propositions pour le Goblet squat :
  Fentes sautées · Kettlebell swing · Pont fessier une jambe · Soulevé de terre
  kettlebell — **toutes sur les mêmes zones**.
- **Ni l'exercice lui-même ni « Fentes arrière » (déjà dans la séance) ne sont
  proposés.** ✔
- Remplacement effectif, liste refermée, toast de confirmation. ✔
- Garde-fou testé en stubbant `confirm` : **refus → exercice inchangé** ;
  **acceptation → remplacé**. ✔

## Fichiers
- `src/lib/logic.js` — `exerciseAlternatives()` + export + CHANGELOG[0] 1.9.240.
- `src/app.js` — bouton `#guidedSwap`, liste `#guidedSwapList`, handlers, fermeture
  de la liste à chaque changement d'exercice.
- `src/index.html` — en-tête `.guided-ex-head` + bouton + liste.
- `src/strength.css` — `.guided-swap-list` (cibles tactiles 52 px sur mobile).
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.
