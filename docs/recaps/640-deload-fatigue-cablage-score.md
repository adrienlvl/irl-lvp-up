# #640 — La décharge muscu « sur fatigue » se déclenche enfin (build 2.0.249)

## Contexte

Priorité de nuit = coaching (CAP 3.0 étape 1 · MANDAT COACHING ÉLITE, coach muscu / gestion de la
fatigue). Rotation §4 bis — les 5 derniers domaines (par mtime) étaient `nutrition, coach, athlete,
nutrition, alternance`. Exclus : `nutrition` (2× sur 5) et `coach` (dans les 2 derniers). **`athlete`**
(1× sur 5, absent des 2 derniers) est **libre** et le mieux aligné avec la priorité de nuit (muscu).
Les 2 pistes athlète ouvertes de la mémoire (#631) sont désormais closes (#633 affûtage, #637 séance
guidée) → angle NEUF trouvé par exploration ciblée du coaching athlète.

## Défaut prouvé (bug de câblage — une branche coach morte en prod)

Sur le **Bilan hebdo** (Athlète → sous les « Séries hebdo par groupe »), `deloadRecommendation`
(`logic.js`) déclenche une **semaine de décharge** dans deux cas :

- **Accumulation** : 5 semaines dures consécutives (≥ 15 séries, ≥ 55 % du pic chacune).
- **Fatigue (décharge anticipée)** : dès **3 semaines dures** SI la forme du jour est basse
  (`readiness < 45`). C'est le cas le plus utile pour éviter le surmenage.

`deloadRecommendation` attend `opts.readiness` = **un nombre** (score 0-100). Mais l'appel de rendu
(`app.js:494`) lui passait l'**objet** renvoyé par `readinessScore` :

```js
deloadRecommendation(state.workouts, localDate(), { readiness: readinessScore(state.recovery.at(-1)) })
// readinessScore renvoie { score, label } → Number({…}) = NaN → isFinite(NaN) = false → readiness = null
```

→ la branche `reason:'fatigue'` était **morte** : seule l'accumulation (5 sem.) pouvait encore
déclencher la décharge. **Preuve que c'est un bug et pas une intention** : les **3 autres** appels de
`readinessScore` dans `app.js` (673, 677 pour `suggestedRoutine`) passent tous correctement
`rs.score` / `rs && rs.score` ; le test unitaire existant (logic.test.js) passe déjà un **nombre**.
Seul `app.js:494` passait l'objet.

**Cas nominal concret** : athlète avec 3 semaines dures d'affilée (18 séries abdos/sem.) et un
check-in du jour `{sleep:5, fatigue:5, soreness:5}` (readiness ≈ 25). Comportement voulu : carte
« 🧊 Décharge conseillée — 3 semaines de charge et ta forme baisse, place une décharge maintenant ».
Comportement réel : `readiness=null` → `due:false` → **aucune carte**. Le lifter fatigué ne recevait
jamais l'alerte de décharge anticipée.

## Correctif (défensif des deux côtés, zéro champ ajouté)

1. **Fonction pure durcie** (`logic.js`) : `deloadRecommendation` accepte désormais `opts.readiness`
   en **nombre** OU en **objet `{score,label}`** (ce que `readinessScore` renvoie naturellement), la
   source unique restant le score. C'est le footgun exact qui a piégé le rendu → on le neutralise.
   Testable et testé (voir plus bas).
2. **Appelant aligné** (`app.js:494`) : passe `(readinessScore(...)||{}).score`, comme ses 3 frères.

## Contrôle §4 ter (surface lue par l'utilisateur)

La carte « Décharge conseillée » a été **rendue pour de vrai** sur état fatigué chargé (check smoke) :
l'advice affiché est « 3 semaines de charge et ta forme baisse : place une semaine de décharge
maintenant — coupe le volume de 40 à 50 %… ». Cohérent, non redondant avec les séries par groupe
juste au-dessous. Aucun texte ajouté : on **restaure** une capacité existante, on n'en empile pas une.

## Vérification

`cd src && xvfb-run -a npm run verify` → **100 % vert**.

- **571 tests** (bloc `deloadRecommendation` étendu : forme objet `{score:40}` → `due:true, fatigue` ;
  objet `{score:null}` → readiness ignoré, pas de fausse fatigue).
- Check smoke **bloquant `deloadWiring`** : construit 3 semaines dures + check-in du jour bas, rend
  `renderWeeklyReview()`, exige que `#weeklySets` contienne « Décharge conseillée » ET « forme
  baisse » (prouve la branche *fatigue*), puis restaure l'état. Rouge avant le correctif, vert après.

Build **2.0.249** (bump + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`).

Sources : gestion de la fatigue / décharge programmée (deload) — principes NSCA.

_Domaine : athlete._
