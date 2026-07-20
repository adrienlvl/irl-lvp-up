# #618 — « À rattraper » remonte un sommeil URGENT invisible ailleurs (build 2.0.230)

## Contexte / rotation
- **Priorité de nuit (DEMANDES.md)** : pousser le coaching adaptatif à fond, **dans le cadre §3**
  (qualité, pas volume). Rotation §4 bis contrôlée **avant de coder** :
  `grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` → `etudes(617), robustesse(616),
  sommeil(615), coach(614), etudes(613)`. `coach` = 1× sur 5, **absent des 2 derniers** → autorisé.
- Candidat mémoire « milestones redondants » **vérifié CLOS** (#558/2.0.207 : « ne t'empile plus deux
  trophées »). Angle NEUF pris à la place, prouvé par mesure (§4 ter).

## Le manque (prouvé, pas supposé)
Sonde sur état chargé « à la Adrien » (endormissement ~6 h → sommeil **court ET irrégulier**,
`sleepCoachInsight.tone === 'urgent'`, bedtime stdev 147 min), readiness du jour **64** (HRV/courbatures
OK) et **alternance dominant le focus** (cas normal chaque matin tant qu'il n'a pas posté sa candidature
du jour) :

```
attentionDigest        → []            (la porte readiness < 50 ne s'ouvre pas)
adaptiveCoachFocus     → alternance    (le sommeil ne remonte jamais)
coachDayPriority       → primary=alternance, deduped=[]
```

→ Le **signal santé n°1 d'Adrien** ne vivait QUE dans l'onglet Récupération ; sur le dashboard il était
**totalement absent**. `readinessScore` peut rester ≥ 50 alors que le RYTHME part en vrille — les deux
signaux sont distincts. `adaptiveCoachFocus` sait pourtant forcer le sommeil (tier -1 sur tone `urgent`),
mais ce chemin est **court-circuité** par le `return` alternance (priorité absolue).

## Correctif §3 (hiérarchisation — « faire remonter l'urgent »)
`attentionDigest` : après l'alerte forme-basse (`readiness < 50`), une branche **`else`** ajoute, quand
`sleepCoachInsight.tone === 'urgent'`, un item **`🌙 Sommeil déréglé — nuit courte et coucher irrégulier`**
(`key:'readiness'`, `sev:'high'`, `page:'athlete'`).

- **Même clé `readiness`** → dédupliquée contre le focus sommeil (`KEY_TO_PILLAR` dans `coachDayPriority`) :
  n'apparaît **que** quand le focus est ailleurs (alternance), **jamais en doublon**.
- **`else`** → au plus **UNE** alerte readiness/jour (pas « forme basse » + « sommeil déréglé » ensemble).
- Seuil `urgent` (court **ET** irrégulier) uniquement → pas de creep sur le simple `attention`.

## §4 ter — rendu cumulé relu (état chargé)
- **Alternance dominante** : Focus « 💼 Postule aujourd'hui » + À rattraper « 🌙 Sommeil déréglé » →
  cohérent, le signal santé enfin visible, zéro contradiction/redondance.
- **Postulé aujourd'hui** (focus devient sommeil) : `primary = 😴 Ton sommeil déraille`, `deduped = []`
  → item readiness bien **dédupliqué**, aucun doublon.

## Preuve d'ADD conditionnel (§3)
Aucune note existante ne couvre l'angle (digest vide, focus alternance, dayPriority muet — seule surface :
un AUTRE onglet). Contrôle §4 ter appliqué et relu ci-dessus. → ADD justifié.

## Livré
- `logic.js` : branche `else` dans `attentionDigest` (+ commentaire du trou et de la dédup).
- `logic.test.js` : +1 test dédié (urgent remonté si readiness ≥ 50 · pas de faux positif nuit correcte ·
  une seule alerte quand forme basse + sommeil urgent le même jour).
- `renderer-smoke.cjs` : volet **bloquant** ajouté au check `attentionDigest` (surface + une seule alerte).
- Build **2.0.230**, CHANGELOG en tête + 2 assertions `CHANGELOG[0].v`.
- **565 tests + smoke vert.**

Domaine : coach
