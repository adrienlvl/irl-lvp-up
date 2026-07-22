# #673 — `nextFreeSlot` : le commentaire ne promet plus un « défaut » qui n'existe pas (docs, pas de bump)

## Contexte / rotation

- **Priorité nuit** (DEMANDES.md) = coaching adaptatif à fond. **Bloquée ce tour par la rotation** : les
  5 derniers recaps sont `coach, robustesse, docs, coach, robustesse` → `coach` (2 derniers **et** 2× dans
  les 5) et `robustesse` (2× dans les 5) sont **interdits** (§3 : la rotation §4 bis s'applique pleinement
  au coach). Backlog nommé P1→P7 : **entièrement coché**.
- Chasse à une amélioration **sûre et prouvable** dans un domaine frais (athlete/nutrition/sommeil/focus/
  agenda/etudes/alternance/tests) via un sous-agent d'exploration + contre-vérification perso.

## Pistes explorées et VÉRIFIÉES (§4 bis.5 — une piste fausse se dit)

1. **`examCountdown.weeksLeft` arrondi `Math.round` (études)** → **FAUSSE en tant que bug user-visible.**
   `weeksLeft` n'est rendu que si `daysLeft > 90` (`renderExamCountdown` app.js:977 et `renderExamList`
   app.js:978 : `c.daysLeft<=90 ? 'J-'+daysLeft : weeksLeft`). Le « dans 0 semaine » à J-3 **n'arrive
   jamais** ; à ≥ 91 j, `round` donne un résultat correct (« 13 semaines »).
2. **`nextFreeSlot` sans défaut `after` (agenda)** → pas un bug de comportement : les **3** appelants
   passent toujours `after` (app.js:854 `after:candidat.time` ; logic.js:6701 & 7326
   `after: minutesToTime(now)`, tous deux sous garde `now` finie). Reste **un vrai défaut de commentaire**
   (voir correctif ci-dessous).
3. **`energyPlan` fatG = `Math.max(round(w·0.5), round(w·0.9))` (nutrition)** → ligne morte réelle
   (`round` monotone, `0.9w > 0.5w` ∀ w>0 → toujours la branche 0,9) MAIS **gatée** : c'est exactement
   l'item décrit dans la proposition en attente `docs/proposals/glucides-plancher-carburant.md` (#645,
   décision Adrien requise). No-op de sortie → j'évite d'y toucher avant sa décision.
4. **`studyPacing` (études)** et **`mealSplit` (nutrition)** → durcis / non-bug (correctif #592, gardes de
   date pour le premier ; dérive d'arrondi inhérente et bornée pour le second).

## Correctif retenu (le seul défaut réel + sûr trouvé)

Le commentaire de `nextFreeSlot` (`logic.js:5360`) documentait `after ('HH:MM', défaut 'after')` — un
**« défaut » fantôme** : la valeur « 'after' » est un copier-coller resté du gabarit `dayEnd
('HH:MM', défaut '22:00')`, et **aucun défaut n'est implémenté** (`if (cand == null) return null`,
l.5370). Le commentaire **contredit** donc le comportement réel (`after` est **requis**). C'est le cas
« commentaire piégeux » explicitement autorisé (VPS-AUTOPILOT §4.6 + étape 3 de « SI LE BACKLOG SE VIDE »).

Reformulé sans ambiguïté : `after ('HH:MM', REQUIS — heure de départ de la recherche ; sans elle → null,
aucun défaut)`. **Zéro changement de comportement, zéro test à toucher, pas de bump** (§2.6 : changement
sans effet utilisateur).

## Vérification

`cd src && xvfb-run -a npm run verify` → **580 tests + SMOKE OK**, 100 % vert.

## Suite

La priorité nuit coaching reprendra dès que la rotation libère `coach`. Les vrais leviers restants sont
**gatés sur décision d'Adrien** (propositions #645 glucides-plancher, #619 protéines-déficit, #631
récupération-flag, #602 B.3, sécurité/sync/planning-études) — cf. `docs/DEMANDES.md`.

Domaine : docs.
