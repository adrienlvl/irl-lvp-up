# #693 — Coach : le headline nutrition suit le SIGNAL protéines, plus le momentum de logging (build 2.0.293)

**Domaine : coach.** Priorité de nuit = coaching adaptatif, traité en **QUALITÉ/curation** (§3 : corriger un
guard/une clause qui en contredit une autre), sur un **angle NEUF** (contradiction headline↔insight sur un
pilier jamais patché).

## Rotation (§4 bis) — contrôle avant de coder
5 derniers recaps : `robustesse (692), focus (691), a11y (690), coach (689), robustesse (688)`.
→ interdits (2 derniers) : `robustesse`, `focus`. `coach` apparaît **1×** (689, 4ᵉ de 5), **pas dans les
2 derniers** → **autorisé** ce tour. La priorité de nuit « coaching » est donc jouable par la rotation.

## Le défaut (prouvé)
Sous-agent Explore sur les fonctions coach : la contradiction **headline↔insight** avait été fermée sur
**SPORT et FOCUS** (#561→#588) et le pilier **SOMMEIL** re-dérive son headline depuis le verdict
(`logic.js:6261-6272`, correctif §3 explicite). Le pilier **NUTRITION** était le **seul** à écraser
l'insight **sans jamais resynchroniser le headline** — le jumeau non-patché du fix sommeil.

- Le headline nutrition dérive du **momentum de LOGGING** (nb de jours *saisis* : rebuild « Ta nutrition
  s'essouffle » / revive « Reprends la nutrition » / reinforce « monte en régime »), calé lignes 5736-5749.
- Le bloc nutrition (`logic.js:6396-6427`) **écrase** `insight` par le signal **PROTÉINES** (série en cours
  `l.6406`, ou pente d'adhérence `l.6415/6418`) — une mesure **orthogonale**.
- Quand les deux divergent de **signe**, la carte se contredit frontalement :
  - **logging↓ (rebuild) × série/pente↑** → « Ta nutrition **s'essouffle** » + « **🔥 2 jours d'affilée**…
    ne casse pas la série » (ou « … **Et ta régularité grimpe**… la dynamique est bonne »).
  - **logging↑ (reinforce) × adhérence↓** → « Ta nutrition **monte en régime** » + « ta régularité
    **s'effrite**… la glissade ».

État déclencheur (exécuté node) : `profile {75, maintien}`, nutrition = 4 jours à la cible la semaine
précédente + aujourd'hui/hier à 200 g (série 2, cible 135 g) → `recentDays 2 < prevDays 4` ⇒ **rebuild**,
`proteinStreak.current = 2` ⇒ insight « 🔥 2 jours d'affilée ». Avant : headline « Ta nutrition s'essouffle »
au-dessus de « 🔥 … ne casse pas la série ». Deux tests existants (`logic.test.js:10496`, `:10510`) étaient
**déjà** dans cet état contradictoire sans asserter le headline.

## Le correctif (§3, zéro champ ajouté)
`logic.js:6403-6440` — variable locale `nutritionSignal` (`up` si série/pente↑, `down` si pente↓ hors série,
sinon `neutral`), posée dans les mêmes branches qui écrivent l'insight. Puis re-dérivation du headline du
**signal PORTÉ par l'insight**, exactement comme le sommeil :

```js
if (nutritionSignal === 'up' && tone !== 'reinforce') headline = `${Poss} ${L} tient le cap`;
else if (nutritionSignal === 'down' && tone === 'reinforce') headline = `${Poss} ${L} mérite un coup de pouce`;
```

Le verdict **NEUTRE** « N/7, la régularité prime » (qui reconnaît déjà l'imperfection) reste compatible avec
les trois tons → headline inchangé. `revive` est exclu du cas `up` (une série finissant aujourd'hui implique
une activité du jour → pilier non-dormant). Aucun champ ajouté, aucune autre branche touchée.

## Contrôle §4 ter (rendu cumulé, lu en entier)
```
HEADLINE: Ta nutrition tient le cap
INSIGHT : 🔥 2 jours d'affilée à ta cible protéines (135 g). Ne casse pas la série aujourd'hui.
ACTION  : Cible protéines tenue (200/135 g) 💪 — verrouille l'eau et un fruit/légume.
```
Titre positif, corps qui célèbre la série, action qui crédite la cible tenue → cohérent de bout en bout.

## Vérif & versionnage
- +1 test logic (`adaptiveCoachFocus : le headline nutrition suit le SIGNAL protéines…`) : cas série×rebuild
  (headline re-dérivé « tient le cap ») + cas de contrôle **sans profil** (bloc protéines non exécuté →
  headline momentum « s'essouffle » inchangé).
- Effet visible sur une surface lue → **bump 2.0.293** (+ CHANGELOG + 2 assertions `CHANGELOG[0].v`).
- `xvfb-run -a npm run verify` : **589 tests + SMOKE OK**, 100 % vert.

**Lot 2.0.263→293 en attente de release (Adrien contrôle).**

_Domaine : coach._
