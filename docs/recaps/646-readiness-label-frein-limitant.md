# #646 — Forme du jour : le label ne dit plus « Prêt à pousser » quand un frein est au rouge

**Build 2.0.254** · boucle #646 (2026-07-21) · Domaine : athlete

## Contexte / choix de la tâche
Priorité de nuit = coaching (DEMANDES.md). Rotation §4 bis — 5 derniers recaps par domaine :
`nutrition (645), coach (644), athlete (643), sommeil (642), focus (641)`. Exclus : `nutrition` et
`coach` (2 derniers). Candidats coaching autorisés (1× sur 5, hors 2 derniers) : **athlete**, sommeil,
focus. **athlete** pris — piste NEUVE déjà cadrée en mémoire (`athlete-coaching-open-leads`, piste #2),
alignée priorité de nuit. Quota §4 bis.4 satisfait (#645 = proposition dans les 10 derniers) → code
autorisé.

## Manque prouvé (contradiction insight↔action, catégorie §3 encouragée)
`readinessScore` (`logic.js:9699`) agrège sommeil/fatigue/courbatures en un score 0–100 et en dérive un
label uniquement à partir de la **moyenne** : `score ≥ 75 → « Prêt à pousser »`. Or un **frein isolé
proche du maximum** (courbatures ≥ 4, fatigue ≥ 4, ou nuit courte < 6 h) reste noyé dans une bonne
moyenne. Cas nominal prouvé par le calcul : `{sleep:8, fatigue:1, soreness:4}` → `40 + 30 + 7,5 = 78` →
label « Prêt à pousser ». Mais sur **la même carte** (Athlète → Récupération), `#recoveryAdvice`
(`app.js:427`, flag `easy = sleep<6 || fatigue>=4 || soreness>=4`) affiche « privilégie une séance
facile, la mobilité ou le repos ». Deux surfaces voisines qui se contredisent : pousser vs lever le pied.

## Correctif (curation §3, zéro champ ajouté, sans ripple)
Dans `readinessScore`, on **borne le label** au pire frein, pas seulement à la moyenne :
```
redFlag = (sleep > 0 && sleep < 6) || fatigue >= 4 || soreness >= 4
label = (score >= 75 && !redFlag) ? 'Prêt à pousser' : score >= 50 ? 'Correct — garde une marge' : 'Récupération prioritaire'
```
- Le **score chiffré ne bouge pas** (78 reste 78). Vérifié : la chaîne `label` n'est **jamais** un
  branchement de décision — seul usage `app.js:426` (`Forme du jour · ${rs.label}`, affichage). Donc
  `loadAdvice`, `deloadRecommendation`, wellness, `readinessDrag`… restent inchangés (ils lisent `.score`).
- Le **sommeil absent (0) n'est PAS un frein rouge** (garde `sleep > 0`), même convention que le score
  lui-même (« une donnée absente ne pénalise pas », `logic.js:9709`). On ne réintroduit donc pas le bug
  `sleep:0`-pire-nuit du flag `easy` d'`app.js` — celui-ci reste couvert par la proposition en attente
  `docs/proposals/recuperation-flag-sommeil-absent.md` (#631), périmètre distinct non préempté.

Logique pure uniquement : le seul rendu affecté est la chaîne du label, pilotée par la fonction pure →
pas de nouveau check smoke (défaut entièrement dans `logic.js`, check `readiness` déjà bloquant).

## Science (mandat coaching élite)
Autorégulation gouvernée par le **frein limitant**, pas par la moyenne : monitoring readiness/RPE
(Halson 2014, *Sports Med*) ; DOMS élevés → réduire la charge sur le muscle concerné (Cheung 2003).
Sources citées dans le commentaire de `readinessScore` et le CHANGELOG.

## Contrôle de cohérence §4 ter (rendu chargé)
Panneau Récupération pour `{sleep:8, fatigue:1, soreness:4}` **après** correctif :
- `#recoveryScore` : « **78**/100 · Forme du jour · **Correct — garde une marge** »
- `#recoveryAdvice` : « privilégie une séance facile, la mobilité ou le repos. »

« Correct — garde une marge » ↔ « séance facile » : cohérent (la marge appelle la retenue). La
contradiction dure « Prêt à pousser » ↔ « séance facile » est levée. Le badge reste vert (zone dérivée
du score, légitimement 78) mais le texte porte désormais la nuance : plus de double message.

## Tests
574 tests (bloc `readinessScore` étendu : plafond courbatures/fatigue/nuit courte + double
non-régression « sans frein rouge, label intact » et « sommeil vide ≠ frein rouge ») + smoke verts.
`xvfb-run -a npm run verify` : 100 %.

## Reste ouvert (mémoire athlète)
Piste #2 partiellement traitée : le cas `sleep:0` (score peut atteindre 100 « Prêt à pousser » + flag
`easy` d'`app.js` sans garde `>0`) reste contradictoire, mais c'est le périmètre exact de la proposition
`recuperation-flag-sommeil-absent.md` (transverse, 9 surfaces, décision d'Adrien). Non préempté ici.

Domaine : athlete
