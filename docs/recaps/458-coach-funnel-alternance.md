# #458 — Coaching adaptatif : le coach pilote tout le funnel alternance (2.0.88)

Premier approfondissement de la reprise « faire évoluer l'app » (demande d'Adrien), issu d'une phase
de conception multi-agents (double jury) : idée n°1 consensus, valeur 93/100, logique pure.

## Le problème

`adaptiveCoachFocus` mettait l'alternance en priorité absolue, mais son focus se **taisait dès
qu'Adrien avait postulé le matin** (`!st.appliedToday`). Or la vraie bataille continue APRÈS la
candidature du jour : les **relances** (entreprises sans réponse à J+7) et les **entretiens**
restaient non coachés. Pire : `applicationStats` calcule **déjà** `pendingRelances` (triées desc par
ancienneté) et `entretiens` — ils étaient simplement **jetés**.

## Ce qui change

La branche alternance devient une **machine à états du funnel** (tant qu'aucune candidature acceptée) :

1. **Pas postulé aujourd'hui** → « Postule aujourd'hui pour ton alternance » (inchangé — la
   candidature du jour reste la priorité n°1).
2. **Postulé aujourd'hui + une relance en attente** → « **Relance {entreprise}** » (la plus ancienne,
   nommée) · « Sans réponse depuis N jours[· X relances à faire]. »
3. **Postulé aujourd'hui + un entretien dans le pipeline** → « **Prépare ton entretien** » · « un
   entretien, c'est là que tout se joue. »
4. **Postulé aujourd'hui, rien en attente** → le coach repasse aux piliers (comportement d'avant).

Chaque état garde `pillar:'alternance'`, `tone:'urgent'`, `page:'alternance'`, le compte à rebours
août et un emoji distinct (💼/🔁/🤝). La priorité absolue (return avant les piliers) est intacte.

## Vérification navigateur (rendu réel, 3 états)

- Pas postulé → « Postule aujourd'hui… · Plus que 14 j avant août » ✅
- Postulé + relance J+9 → « Relance Cabinet Léa · Sans réponse depuis 9 jours » ✅
- Postulé + entretien → « Prépare ton entretien · c'est là que tout se joue » ✅
- Clic → ouvre l'onglet Alternance ✅. Aucune erreur console.

## Tests

449 tests (états relance nommé J+9, entretien, priorité « postuler » tant que le jour n'est pas fait,
non-régression « postulé + rien en attente → piliers ») + smoke `coachFocus` étendu (état relance
dans le rendu réel).

## Contexte

Build **2.0.88**. Sur `master` + PWA ; **pas de Release** (regroupée avec les prochains
approfondissements). Prochaines pistes du jury : coach conscient du sommeil (`sleepCoachInsight`
branché dans le focus), `sleepImpactReport` (le sommeil prouve son effet sur le lendemain).
