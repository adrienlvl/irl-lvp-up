# #689 — Coach sport : `sessionGoalAhead` ne colle plus « rien ne t'oblige à t'entraîner » sous un ton qui pousse à reprendre (build 2.0.289)

**Priorité nuit = coaching**, traité en **QUALITÉ / curation (§3)** : correction d'un guard qui
**contredit** le cadrage de l'insight qui l'accompagne (« corriger un guard qui se déclenche à tort
ou en contredit un autre » — §3, encouragé).

## Rotation §4 bis
5 derniers recaps : `robustesse (688), etudes (687), agenda (686), robustesse (685), coach (684)`
→ `robustesse`+`etudes` interdits (2 derniers) ; `robustesse` 2× interdit ; **`coach` libre** (1× en
#684, hors 2 derniers). Priorité de nuit = coaching → domaine `coach` légitime ce tour.
Quota §4 bis.4 non déclenché (#674 = proposition dans les 10 derniers).

## Le défaut (prouvé par lecture)
Trouvé par sous-agent Explore (angle NEUF : les contradictions closes étaient insight↔action et
headline↔insight ; ici c'est **une clause d'un même insight qui contredit le ton de cet insight**).

- `adaptiveCoachFocus`, pilier sport, branche objectif hebdo `wc < g` × allure `onpace`
  (`logic.js:5862-5867`) : quand la readiness du jour est au vert (≥ 75) et la séance du jour pas
  encore faite, l'insight ajoutait
  « Et ton corps est au vert ce matin (readiness X/100) : **rien ne t'oblige à t'entraîner
  aujourd'hui**, mais profite de cette forme pour engranger une séance d'avance… ».
- Cette clause de **dispense** était portée **sans garde de ton**, donc aussi en `rebuild`
  (« ton entraînement s'essouffle … un petit geste suffit à repartir ») et `revive`
  (« Reprends l'entraînement … le bon moment pour relancer »). Dans le **même** insight : l'un
  ordonne de reprendre, l'autre en dispense.
- La note **sœur** `sessionGoalBonus` (`logic.js:5815`) porte exactement ce registre et est
  **explicitement gardée** `tone === 'reinforce'` par le « GARDE-FOU DE TON » (`logic.js:5803-5813`),
  qui énonce précisément que « aucune obligation de t'y remettre aujourd'hui » n'est cohérent que si
  le pilier n'est **pas** présenté comme en recul. Ce garde-fou n'avait jamais été propagé à
  `sessionGoalAhead`.
- La sœur **focus** `focusGoalAhead` (`logic.js:6076`) fire, elle, dans **tous les tons** — mais son
  texte n'a **jamais** contenu de clause de dispense (« profite de cette marge pour prendre de
  l'avance tant que c'est facile »). L'asymétrie était donc dans le **texte sport seul**.

Scénario `revive` reproductible : `goals.sessions=2`, dernière séance il y a 23 j (06-20), check-in
du jour au vert (8/1/1 → readiness 100), lundi 07-13 → `wc=0`, `onpace`, `sessionGoalAhead=100`.
Avant : « Reprends l'entraînement … relance dès aujourd'hui … **rien ne t'oblige à t'entraîner
aujourd'hui** … ».

## Le correctif (§3, zéro champ ajouté)
Retrait pur de la clause de dispense « rien ne t'oblige à t'entraîner aujourd'hui, mais » du seul
`sessionGoalAhead` (`logic.js:5867`). La note redevient une **pure invitation**
(« profite de cette forme pour engranger une séance d'avance… »), **cohérente dans tous les tons**,
alignée sur sa jumelle `focusGoalAhead`. Plus juste au passage : ici l'objectif hebdo n'est pas
« tenu » (comme pour `sessionGoalBonus`) mais seulement « dans les temps » — « rien ne t'oblige »
était de toute façon moins exact que pour le bonus. Commentaire mis à jour pour documenter le retrait
(`logic.js:5850-5857`).

## Preuves
- **+1 test logic** (`logic.test.js`) : scénario `revive` complet — `tone==='revive'`, headline
  « Reprends l'entraînement », insight « le bon moment pour relancer », `sessionGoalAhead===100`,
  présence de « engranger une séance d'avance », **absence** de « rien ne t'oblige à t'entraîner ».
  + assertion d'absence de la clause ajoutée au test `sessionGoalAhead` existant (tous tons).
- **1 check smoke bloquant** (`renderer-smoke.cjs`, dans `coachFocus`) : même état `revive` forgé →
  assert `tone==='revive'` & `sessionGoalAhead===100` & présence invitation & **absence** dispense
  (regex `.` pour les apostrophes, sans backslash §6). Échoue avant / passe après.
- **Contrôle §4 ter** : sortie cumulée relue en entier sur l'état `revive` chargé — « Reprends
  l'entraînement. Rien depuis 23 jours — le bon moment pour relancer … Et ton corps est au vert ce
  matin : profite de cette forme pour engranger une séance d'avance … » → plus de contradiction,
  l'invitation **soutient** la reprise.

Effet visible (texte que l'utilisateur lit) → **bump 2.0.289**. `xvfb-run -a npm run verify` :
**587 tests** (+1) + **SMOKE OK**, 100 % vert.

Recap #689. **Lot 2.0.263→289 en attente de release (Adrien contrôle).**

_Domaine : coach._
