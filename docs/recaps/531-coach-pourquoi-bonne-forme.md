# 531 — Coaching : le coach dit enfin POURQUOI ta forme est BONNE (readinessBoost)

**Build 2.0.162 · boucle #531 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Depuis #525, le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) sait nommer le frein
DOMINANT quand la forme du jour **bride** la séance : `readinessDrag` (via `readinessLimiter`) explique
POURQUOI la readiness est basse (« Ce qui pèse le plus : tes courbatures / ta fatigue / ta nuit
courte »). Mais il restait **aveugle au cas SYMÉTRIQUE** : les jours où la readiness est **au vert**
(≥ 75, action « prêt à pousser »), il donnait le chiffre sans jamais dire **CE QUI PORTE** cette forme.
Or reconnaître le bon comportement qui paie — une belle nuit, des muscles frais, une énergie au top —
ferme la boucle « adaptation dynamique aux **PROGRÈS** » demandée pour la nuit : Adrien voit quel geste
produit sa forme et le **répète**. C'est un renforcement positif sur données réelles, exactement le
pendant manquant de `readinessDrag`.

## Ce qui est livré

Nouveau helper pur **`readinessDriver(recovery)`** — le pendant POSITIF de `readinessLimiter` : il
calcule la **fraction de son maximum** atteinte par chaque composante du check-in (sommeil
`min(h/8, 1)` ; fatigue `(5−n)/4` ; courbatures `(5−n)/4` — barème renormalisé de `readinessScore`, où
un niveau **BAS** de fatigue/courbatures est une **force**) et renvoie la composante la plus proche de
son max **seulement si elle domine nettement** : `frac ≥ 0,75` **ET** ≥ 0,2 au-dessus de la 2e (sinon
plusieurs forces se valent → pas de moteur unique, on se tait). Le sommeil n'est candidat que s'il est
**renseigné** (`sleep > 0`), même convention que `readinessScore`/`readinessLimiter`. Renvoie
`{ factor: 'sleep'|'fatigue'|'soreness', frac, value }` ou `null`.

Dans le coach, nouveau champ **`readinessBoost`** (`{ factor, value }` ou `null`, toujours renvoyé) :
quand le pilier poussé est le SPORT, qu'un check-in du jour existe, que la forme est **au vert**
(`score ≥ 75`) et qu'un moteur **domine**, le coach le NOMME et invite à **capitaliser**, **appendu** à
l'action « prêt à pousser » :

- sommeil → « Ce qui te porte aujourd'hui : ta nuit de **8,5 h** — ce sommeil solide est le vrai
  **moteur** de ta forme, tu as tout pour aller chercher un stimulus franc. Capitalise dessus. »
- énergie → « … ton **énergie est au top** (fatigue 1/5) — profite de cette fraîcheur pour un vrai
  stimulus, c'est ces jours-là que les gains se construisent. »
- muscles → « … tes **muscles sont frais**, sans courbatures (1/5) — le corps est prêt à encaisser du
  volume, vas-y franchement. »

## Garde-fous & honnêteté

- **Mutuellement exclusif de `readinessDrag`** par construction : drag fire sur `< 75`, boost sur
  `≥ 75` — jamais les deux le même jour.
- **Pas de moteur au hasard.** Deux forces à égalité (tout au top, ou sommeil 8 h ET fatigue 1/5 à
  frac 1) → `readinessDriver` renvoie `null` → note absente. La marge ≥ 0,2 pin ça.
- **Vraiment excellente.** Seuil `frac ≥ 0,75` : on ne « crédite » qu'une composante réellement proche
  de son max, pas juste relativement meilleure.
- **Affine, ne remplace pas.** Note **appendue** à l'action « pousse ». Si une branche plus urgente
  réécrit ensuite l'action (`loadSpike`, `doneToday`, `sportSlot` appende après sans conflit…), la note
  disparaît sans contradiction — `readinessBoost` reste informatif dans le champ (même contrat que
  `readinessDrag`).
- **Vocabulaire distinct** (« Ce qui te porte aujourd'hui ») → zéro collision à l'œil ni en regex avec
  `readinessDrag` (« Ce qui pèse le plus ») ni les guards sport (« socle invisible », « carburant »…).
- **Réemploi** : `readinessDriver` calque le barème exact de `readinessScore` — un seul helper pur
  neuf, testable en isolation.

## Vérification

- Test `logic.test.js` `readinessDriver` : moteur sommeil / fatigue / courbatures dominants, deux
  forces à égalité → null, tout au top → null, aucune force nette (< 0,75) → null, sommeil non
  renseigné jamais candidat, marge < 0,2 → null, entrée invalide → null.
- Test `logic.test.js` intégration coach : `readinessBoost` sur sommeil (85) / fatigue (75) /
  courbatures (75), tout au top (100) → null, forme < 75 → null (terrain du drag), pilier non-sport →
  null.
- Check smoke **bloquant** `coachFocus` étendu : moteur sommeil nommé (« ta nuit de 9 h », « le vrai
  moteur de ta forme »), drag muet au vert, tout au top → boost null, forme < 75 → boost null.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (510 tests node, SMOKE OK, EXIT=0).

## Suite possible

Pendant, côté FOCUS, de `readinessBoost` : nommer le moteur de la forme quand le pilier poussé est le
focus et que la readiness est haute (le focus lit déjà `focusGoalFresh`/`focusGoalDrained`, mais sans
expliquer QUELLE composante porte la fraîcheur).
