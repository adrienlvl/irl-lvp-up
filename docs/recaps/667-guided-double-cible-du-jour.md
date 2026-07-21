# #667 — Séance guidée : plus de double « Cible du jour » sur la carte (build 2.0.273)

**Domaine : athlete.** Priorité nuit = coaching en QUALITÉ (§3). Rotation §4 bis (5 derniers
recaps par domaine : `coach` (666), `tests` (665), `athlete` (664), `robustesse` (663),
`alternance` (662)) → les 2 derniers `coach`+`tests` **bloqués** ; `athlete` n'apparaît qu'une
fois (#664) et **pas dans les 2 derniers** → libre. Priorité n°1 « robustesse » toujours
**bloquée** (#663 attend le feu vert d'Adrien sur le périmètre de reclassement au sync).

## Le manque (prouvé par lecture, piste neuve #652 « Candidat 2 »)

Sur `#guidedWorkoutDialog`, en récupération **correcte** et dès qu'un historique existe pour
l'exercice, **deux `<p>` portaient la même étiquette « Cible du jour »** :

- `#guidedRecoveryNote` (haut de carte, `app.js:445`) — en non-fragile :
  `'Cible du jour : technique propre, effort contrôlé, 2–3 répétitions en réserve.'`
  → en réalité une **consigne d'exécution** (le *comment* : qualité, reps en réserve), pas une cible.
- `#guidedTarget` (bas de carte, `guidedProgressionLines` `logic.js:9577`) —
  `'🎯 Cible du jour : 10 reps × 40 kg — monte la charge 💪'` → **la vraie cible chiffrée** (le *combien*).

Résultat : deux libellés identiques pour deux choses différentes → « laquelle est LA cible ? ».
Redondance d'étiquette présente à chaque ouverture (récup OK + progression disponible). Distinct
des correctifs de progression #637/#652/#664 (contradiction de contenu) : ici c'est l'**étiquette**
qui doublonne, pas le conseil.

## Le correctif (§3, curation pure au rendu, zéro champ)

Renommé le seul préfixe fautif — la note récup non-fragile passe de **« Cible du jour : »** à
**« Consigne du jour : »**. Le 🎯 `#guidedTarget` garde « Cible du jour » : le *combien* reste LA
cible chiffrée, le *comment* devient la *consigne*. Rien d'ajouté ni retiré (mot pour mot le même
contenu, seul le libellé change). La branche fragile (`'Récupération fragile aujourd’hui : …'`)
était déjà sans collision → inchangée.

## §4 ter — rendu cumulé relu (récup OK + progression)

Haut : « **Consigne du jour** : technique propre, effort contrôlé, 2–3 répétitions en réserve. »
→ … → « Feu vert : suis la cible du jour ci-dessous, un cran à la fois… » → « 🎯 **Cible du jour** :
10 reps × 40 kg — monte la charge 💪 ». Plus de doublon ; le « ci-dessous » du feu vert pointe
désormais sans ambiguïté vers le 🎯. Lecture convergente.

## Vérif

- Check smoke **bloquant** `guidedFragileLive` **étendu** (cas récup OK déjà rendu) : `labelOk` =
  `#guidedTarget` contient « Cible du jour » **ET** `#guidedRecoveryNote` ne le contient plus **ET**
  contient « Consigne du jour ». Échoue avant le fix, passe après.
- `cd src && xvfb-run -a npm run verify` → **578 tests + SMOKE OK**, 100 % vert.
- Bump **2.0.273** (rendu visible utilisateur) : `package.json` + CHANGELOG en tête de `logic.js`
  + les 2 assertions `CHANGELOG[0].v` (logic.test.js & renderer-smoke.cjs).

Master seulement. **Lot 2.0.263→273 en attente de release (Adrien contrôle).**

Domaine : athlete.
