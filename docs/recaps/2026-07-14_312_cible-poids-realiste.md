# #312 — Poids cible : l'app dit si elle est réaliste (1.9.246)

**Rotation 26 · item #1 · demande directe d'Adrien**

> « ça serait bien que je puisse changer la cible de poids aussi dans mon plan […] et que
> l'application me donne des recommandations réelles, si la perte de poids serait trop
> importante, si ça n'ira pas avec le fait que je souhaite devenir un athlète »

## Vérification d'abord — le champ existait déjà
`#targetWeight` existe (min 30, max 300). **Le manque n'était pas là.**

Le vrai problème : `energyPlan()` calculait sagement un plan **pour n'importe quelle cible
saisie**, sans jamais dire si elle était atteignable, saine, ou cohérente avec l'objectif
sportif. Adrien pouvait taper **55 kg** (IMC 18,2) et recevoir un plan calories/macros
comme si de rien n'était.

## Amélioration — `weightTargetAdvice(opts)`
Évalue la cible **avant** le plan, et le dit franchement. Quatre familles de contrôles :

1. **La cible est-elle saine ?** IMC de la cible.
   `< 18,5` → **⛔ insuffisance pondérale**, avec la fourchette minimale et un renvoi
   explicite vers un professionnel de santé.
2. **L'ampleur.** `≥ 15 %` du poids → découper en paliers de 4–5 kg.
3. **La durée.** `> 26 semaines` de déficit continu → prévoir des pauses à maintien.
4. **La cohérence avec l'objectif sportif** — le cœur de la demande :
   - objectif **muscle** + cible en **perte** ≥ 3 % → **⛔ contradiction**, avec une porte de
     sortie (recomposition lente *ou* séquence perte → prise) ;
   - objectif **sèche** + cible en **prise** → ⛔ contradiction inverse ;
   - objectif **endurance/athlétique** + perte ≥ 10 % → ⚠️ les performances et la récupération
     vont en pâtir.

Renvoie aussi `suggested` : la fourchette de poids correspondant à un IMC 20–24,5 pour sa taille.

### Un garde-fou trouvé en testant — et c'est le code que j'ai corrigé, pas le test
Ma première version avertissait « IMC cible haut » dès `> 27`. Le test a échoué sur le cas
**cible 85 kg avec objectif prise de muscle** (IMC 28,1).

**Le test avait raison.** L'IMC **ne distingue pas le muscle du gras** : brandir un « IMC
élevé » contre quelqu'un qui prend délibérément du muscle est exactement le genre de conseil
stupide que je veux éviter. J'ai donc corrigé **la logique** : l'avertissement ne se déclenche
plus dans ce cas, et quand il se déclenche il **précise lui-même la limite de l'IMC**.

### Cadrage honnête
Repères généraux de suivi personnel, **pas un avis médical** — c'est écrit sous le bloc, et
toute cible extrême renvoie explicitement vers un professionnel de santé.

## Rendu
Bloc `#targetAdvice` sous le champ, **mis à jour en direct pendant la saisie** (on lit le
champ, pas le state — donc l'avertissement s'affiche avant même de valider). Liseré vert /
ambre / rouge selon le niveau.

*(Détail attrapé au passage : j'avais d'abord attaché l'écouteur `input` dans une fonction de
rendu — elle s'exécute à chaque render, ça aurait empilé les écouteurs. Déplacé au démarrage,
une seule fois.)*

## Tests
- `logic.test.js` (profil réel d'Adrien, 81 kg / 174 cm) : cible raisonnable → `ok` ;
  **55 kg → `stop` + renvoi vers un professionnel** ; **objectif muscle + perte de 11 kg →
  `stop` contradiction avec porte de sortie** ; sèche + prise → `stop` ; endurance + perte
  13,6 % → `warn` performances ; cible = poids actuel → recomposition ; prise cohérente →
  `ok` ; fourchette IMC 20–24,5 ; entrées incomplètes → `null` (on ne devine pas).
- `renderer-smoke.cjs` : check `targetAdvice`.
- `npm run verify` : **339 tests + SMOKE OK**.

## Vérif navigateur (saisie en direct, profil 81 kg / 174 cm)
| cible | objectif | verdict |
|---|---|---|
| **75 kg** | athlétique | ✅ *Perdre 6 kg · IMC 24,8 · ~13 sem.* + conseil protéines/muscu |
| **70 kg** | muscle | ⛔ *Contradiction : ton objectif est de prendre du muscle, mais ta cible demande de perdre 11 kg… Choisis : recomposition lente, ou séquence.* |
| **55 kg** | athlétique | ⛔ *Insuffisance pondérale (IMC 18,2). Vise plutôt 60,6 kg minimum, et parles-en à un professionnel* + 3 autres alertes (32 % du poids, 54 semaines, performances) |

## Fichiers
- `src/lib/logic.js` — `weightTargetAdvice()` + export + CHANGELOG[0] 1.9.246.
- `src/app.js` — `renderTargetAdvice()` + écouteur `input` (attaché une seule fois) + appel dans `render()`.
- `src/index.html` — `#targetAdvice` sous le champ « Poids cible ».
- `src/companion.css` — `.target-advice` (niveaux ok / warn / stop).
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Reporté
La compression des photos (piste prioritaire de #310) est décalée : la demande d'Adrien
passait devant. Elle reste en tête pour #313.
