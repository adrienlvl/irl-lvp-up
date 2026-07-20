# #609 — Trail spécifique : préparer les DESCENTES (repeated bout effect), build 2.0.223

**Boucle #609 (2026-07-20)** · Série coaching élite (§ « 🌙 DÉMARRAGE VPS » de ROADMAP) — item
**« Trail spécifique (`ultraPlan`) »**. Exception de rotation `athlete` assumée (demande directe
d'Adrien, ROADMAP l.880).

## Le manque (vérifié dans le code)

Le trail se prépare autant en **descente** qu'en montée : courir en descente est un travail
**excentrique** qui inflige les vrais dégâts musculaires (DOMS, perte de force, CK) — c'est ce qui
« casse les jambes » sur un parcours vallonné. Or **rien** dans le code ne préparait la descente :

- `qualitySession` (#603) ne fait que des **côtes** (montée) ;
- `warmupFor`/`prehabFor`/`cooldownFor` couvrent l'excentrique mollets/ischios (Lauersen) mais pas
  la course en descente ;
- le panneau Ultra (`renderUltraPage`) liste « SÉANCES CLÉS » = endurance / **côtes montée** /
  sortie longue / force trail — **aucune séance de descente**.

## La science (WebSearch, méthode obligatoire)

- **Effet de séance répétée (repeated bout effect)** : une seule séance de descente rend le muscle
  bien moins vulnérable à une séance ultérieure (DOMS, CK, perte de force, économie de course tous
  réduits). Sources : Frontiers Physiology 2018 (trail runners entraînés), étude RBE descente
  (PMC11209549), Nature Sci. Reports 2020.
- **Reco pratique** : intégrer **≥ 1 séance de descente dans les semaines qui précèdent** une course
  off-road, surtout pour qui n'est pas habitué aux pentes négatives ; ~4 sem / 10 séances suffisent à
  installer des adaptations neuromusculaires de type excentrique.
- **Nuance sécurité** : pas de séance cassante dans les ~10 derniers jours → cohérent avec l'affûtage
  (`taperPlan`) : la protection se construit tôt, on n'ajoute pas de dommage frais avant le jour J.

## Livré

- **Fonction pure `downhillPrep(dplusPerWeek, raceDaysLeft, raceKm)`** (`logic.js`, exportée) :
  - `null` hors contexte trail (aucun D+) ;
  - phase **base** (pas de course / course > 8 sem) → 1 séance/sem d'entretien ;
  - phase **specific** (course ≤ 8 sem) → 1 séance/sem, ou **2** si profil très vallonné (D+ ≥ 1000
    m/sem) ;
  - phase **race** (course ≤ 10 j) → **0** séance cassante, message « jambes fraîches ».
  - Renvoie `{sessionsPerWeek, window, protocol, why, source}` avec protocole concret (pente 5-10 %,
    4-6 × 60-90 s en descente contrôlée, +1 rép/sem) et source citée.
- **13 assertions** de test (`logic.test.js`) : null, base, specific 1 vs 2, race, bornes J-10/J-11.
- **Rendu** : nouvelle carte « DESCENTES ⬇️ » sur le panneau Ultra (`#ultraDownhill`), alimentée par
  `downhillPrep(baseElevation, raceDaysLeft, raceKm)` dans `renderUltraPage`, style `.dh-card`
  (`ultra.css`, `[hidden]` géré). **Contrôle §4 ter** appliqué (rendu chargé relu : concis,
  complémentaire de la séance « côtes/montée », non contradictoire).
- **Check smoke bloquant `ultraDownhill`** (logique base/specific/race + présence `#ultraDownhill`).
- Build **2.0.223** (CHANGELOG + `package.json` + 2 assertions `CHANGELOG[0].v`).

## Vérif

`cd src && xvfb-run -a npm run verify` → **560 tests + smoke : 100 % vert.**

Reste de la série coaching : **base d'exercices plus complète** (cues d'exécution, variantes par
matériel).

Domaine : athlete
