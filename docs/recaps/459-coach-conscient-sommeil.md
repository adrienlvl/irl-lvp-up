# #459 — Coaching adaptatif : coach conscient du sommeil (2.0.89)

2ᵉ approfondissement de la reprise « faire évoluer l'app », issu du plan du jury (idée #3, valeur 87).
Relie les **deux systèmes profonds** qu'Adrien a demandé de pousser : le coach adaptatif et le service
Sommeil s'ignoraient totalement.

## Le problème

Le pilier « sommeil » d'`adaptiveCoachFocus` portait une action **figée** (« Note ta nuit et vise un
coucher 30 min plus tôt ») et n'était choisi que par momentum (jours actifs) — alors qu'à côté vivent
`sleepCoachInsight` (verdict chiffré : moyenne, dette, régularité, ton urgent/attention/ok) et un
**plan de recalage** complet (`sleepPlanDay` → cible de coucher du soir), totalement ignorés.

## Ce qui change (2 greffes pures dans `adaptiveCoachFocus`)

1. **Promotion** : quand `sleepCoachInsight(s.recovery, todayKey).tone === 'urgent'` (nuits **courtes
   ET irrégulières**), le pilier sommeil est forcé en tête des corrections (`tier -1`) — une nuit
   déréglée est un levier plus fort qu'un simple creux de momentum ailleurs. Reste soumis à la
   **rotation anti-radotage** (pas de nag mot pour mot). L'alternance, plus prioritaire, garde son
   `return` au-dessus.
2. **Enrichissement** : quand le focus est le sommeil, l'insight devient le **verdict chiffré réel**
   (« Sommeil court et irrégulier — moy. 5.7 h, écart 2 h… ») et l'action, si un plan est actif,
   devient la **cible du soir** (« Vise un coucher à 00:30 ce soir »), sinon un conseil calé sur
   l'irrégularité. Dégrade proprement si pas de données (comportement d'avant).

## Vérification navigateur (rendu réel)

7 nuits courtes+irrégulières + un creux sport → focus **sommeil** (promu au-dessus du sport),
« Ton sommeil déraille — priorité ce soir », verdict « moy. 5.7 h, écart 2 h » ✅. Plan actif →
action « Vise un coucher à 00:30 ce soir » ✅. Clic → page sommeil ✅. Sommeil solide → aucune
promotion (un vrai creux ailleurs reste le focus) ✅. Aucune erreur console.

## Tests

450 tests (assertion préalable que les données déclenchent bien `tone:'urgent'`, promotion sur un
creux sport, verdict dans l'insight, cible du plan dans l'action, non-promotion si sommeil solide)
+ smoke `coachFocus` étendu (alerte sommeil dans le rendu réel).

## Contexte

Build **2.0.89**. Sur `master` + PWA ; **pas de Release** (regroupée avec #458 et la suite).
Prochaine piste jury : `sleepImpactReport` (« te coucher tôt = +X h de focus le lendemain »).
