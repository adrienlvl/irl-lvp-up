# 547 — Le coach dit d'abord ce qui compte le plus (2.0.178)

## Le contexte : l'arbitrage d'Adrien

Adrien a tranché la proposition `coach-freeze.md` : **« améliore toujours le Coach, c'est
important »** → le gel dur est **refusé**. Règle retenue à la place : **qualité, pas volume**
(VPS-AUTOPILOT §3). Reste alors la vraie question : améliorer le coach, **comment**, quand il sait
déjà tout (93 champs) ?

## Le défaut trouvé (et il était sérieux)

Les ~89 notes sont concaténées **dans l'ordre du CODE**, jamais dans l'ordre de l'**urgence**. Or
l'historique a fait le pire classement possible :

- les notes **anodines** ont été ajoutées **tôt** — `sessionGoalBonus` (« aucune obligation, c'est du
  rab ») est à la ligne **5164** ;
- les notes **graves** ont été ajoutées **tard** — pic de charge ligne **6167**, montée de kilométrage
  (« première cause de fracture de fatigue ») ligne **6726**.

Comme la carte du coach n'affiche que le **début** de l'insight (curation #546), le résultat était
qu'un jour chargé, elle pouvait afficher **« objectif bouclé, un bloc de plus serait du pur bonus,
sans pression »** en **cachant l'avertissement de blessure** derrière « ＋ plus de contexte ».
C'est l'inverse exact de ce qu'un coach doit faire.

## Ce qui change

- **`coachNoteUrgency(phrase)`** — rang d'urgence : **0** intégrité physique (blessure, fracture,
  tendons) · **1** charge/surmenage · **2** sommeil et récup (dette, pente) · **3** intrants
  (protéines, hydratation) · **4** non classé · **5** anodin (bonus, félicitations, records).
- **`orderCoachNotes(insight)`** — le **verdict reste toujours en tête** (c'est le diagnostic), les
  notes suivantes sont triées par urgence, **tri stable** (à rang égal, l'ordre d'origine tient).
- Le rendu (`splitCoachInsight`) coupe **après** ce reclassement → la carte porte l'urgent, le reste
  se déplie comme avant.

**Rien n'a été ajouté ni retiré au coach** : c'est l'**ordre** qui change. Fonction pure inchangée,
aucun des ~66 tests de garde touché (ils vérifient la *présence* d'une clause, pas sa position).

## Le piège attrapé EN NAVIGATEUR (pas par les tests)

La suite était **verte** et le rendu était **cassé**. Le découpeur de phrases
(`/[^.!?]+[.!?]+/`) coupait sur les abréviations et les parenthèses : `« (moy. 5 h »` devenait deux
« phrases ». Tant que l'ordre était préservé, le charabia restait **invisible** (le texte se relisait
à la suite). Dès qu'on **reclasse**, les fragments se séparent et la carte affichait :

> « Sommeil court et coucher irrégulier **(moy.** **Et la pente s'enfonce**… »

D'où **`splitCoachSentences`** : une coupure est refusée si une **parenthèse reste ouverte** ou si la
suite ne commence pas par une **majuscule**. Règle générale, sans liste d'abréviations à maintenir.

> **C'est exactement le cas d'école du contrôle §4 ter** (« vert ≠ bon ») que ce dépôt vient de se
> donner : la régression n'était visible **que** dans le rendu cumulé, avec un état chargé.

## Vérifs

- **518 tests** + smoke verts. Nouveau test logique (paliers, verdict en tête, tri stable, entrées
  dégénérées, **non-régression du découpage** sur le vrai texte du coach).
- Check smoke **bloquant** `coachCuration` étendu : sur un insight où l'anodin précède l'urgent,
  l'urgent **doit** être sur la carte et l'anodin dans le contexte replié.
- **Navigateur** : journée chargée (sommeil qui dérape + entraînement en baisse) → verdict entier,
  dette de sommeil sur la carte, note d'entraînement reléguée.

## Fichiers

- `src/lib/logic.js` — `splitCoachSentences`, `coachNoteUrgency`, `orderCoachNotes` + CHANGELOG 2.0.178.
- `src/app.js` — `splitCoachInsight` reclasse avant de couper.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs` — tests + check bloquant étendu.

Domaine : coach
