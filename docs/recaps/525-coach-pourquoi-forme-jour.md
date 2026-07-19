# 525 — Coaching : le coach dit enfin POURQUOI ta forme est basse

**Build 2.0.156 · boucle #525 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) calait déjà l'intensité sport sur
la **readiness du jour** (`readinessScore`) : < 50 → « récupération prioritaire », 50–74 → « séance
correcte, garde une marge », ≥ 75 → « prêt à pousser ». Mais il donnait le **chiffre** (« readiness
63/100 ») sans jamais nommer **POURQUOI** la forme était basse. Or `readinessScore` agrège trois
composantes du check-in — sommeil, fatigue, courbatures — et le **bon geste diffère selon le frein** :
des courbatures appellent d'épargner les muscles douloureux, une fatigue générale de baisser le
volume, une nuit courte de recharger le sommeil. Cette information vivait dans l'entrée `recovery` du
jour, jamais exploitée par le coach.

## Ce qui est livré

Nouveau helper pur **`readinessLimiter(recovery)`** : recalcule le **déficit de points** de chaque
composante par rapport à son maximum, **exactement** le barème de `readinessScore` (sommeil /40,
fatigue /30, courbatures /30), et renvoie le frein **dominant** — mais seulement s'il est **net** :
déficit ≥ 15 **ET** au moins 6 pts au-dessus du second (sinon deux freins se valent → pas de coupable
unique, on se tait). Le sommeil n'est candidat que s'il est **renseigné** (`sleep > 0`), même
convention que `readinessScore` (une nuit non chiffrée ne pénalise pas). Renvoie
`{ factor: 'sleep'|'fatigue'|'soreness', deficit, value }` ou `null`.

Dans le coach, nouveau champ **`readinessDrag`** (`{ factor, value }` ou `null`, toujours renvoyé) :
quand le pilier poussé est le SPORT, qu'un check-in du jour existe, que la forme **bride** la séance
(`score < 75`) et qu'un frein **domine**, le coach le NOMME et adapte le geste, **appendu** à l'action
readiness :

- courbatures → « Ce qui pèse le plus : tes courbatures (5/5) — épargne les groupes musculaires déjà
  douloureux et laisse-les récupérer plutôt que de forcer dessus. »
- fatigue → « … ta fatigue générale (5/5) — réduis le volume plutôt que l'intensité, et vise un vrai
  repos ce soir pour remonter. »
- nuit courte → « … ta nuit courte (3 h) — garde léger, ce qui rechargera vraiment ta forme c'est le
  sommeil de ce soir, pas l'effort. »

## Garde-fous & honnêteté

- **Pas de coupable au hasard.** Deux freins à égalité (tout au rouge : fatigue 5 ET courbatures 5) →
  `readinessLimiter` renvoie `null` → note absente. La marge ≥ 6 pts pin ça (test dédié : 4/4 → null).
- **Muet au vert.** `score ≥ 75` → aucune limitation à expliquer → `readinessDrag` null.
- **Affine, ne remplace pas.** Note **appendue** à l'action d'intensité (récup / marge), qui reste
  cohérente. Si une branche plus urgente réécrit ensuite l'action (`loadSpike`, micro-pas, `doneToday`…),
  la note disparaît sans contradiction — `readinessDrag` reste informatif dans le champ.
- **Vocabulaire distinct** (« Ce qui pèse le plus ») → zéro collision regex avec les guards sport
  (« socle invisible », « carburant », « matériau », « côté récupération »).
- **Réemploi** : `readinessLimiter` calque le barème exact de `readinessScore` — un seul helper pur
  neuf, testable en isolation.

## Vérification

- Test `logic.test.js` `readinessLimiter` : courbatures dominantes, fatigue dominante, nuit courte
  dominante, deux freins à égalité → null, tout neutre → null, sommeil non renseigné jamais candidat,
  marge < 6 → null, entrée invalide → null.
- Test `logic.test.js` intégration coach : `readinessDrag` sur courbatures/fatigue/sommeil, tous au
  max → null, readiness au vert → null, pilier non-sport → null.
- Check smoke **bloquant** `coachFocus` étendu (courbatures nommées + fatigue nommée + tous au max →
  null + vert → null).
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (503 tests node, SMOKE OK, EXIT=0).
</content>
</invoke>
