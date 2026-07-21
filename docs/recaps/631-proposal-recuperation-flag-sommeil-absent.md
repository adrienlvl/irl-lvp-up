# #631 — Proposition : le flag « récupération fragile » pénalise un sommeil non renseigné (sans bump)

**Domaine : athlete** — coaching-adjacent (running/trail/muscu/récupération), au service de la
**priorité de nuit** (coaching à fond) et du **mandat coaching élite** (§1 : un coach ne se contredit
pas d'une carte à l'autre).

## Contexte / choix de la boucle

Priorité de nuit = coaching. Mais deux verrous cadrent le choix ce tour :

1. **Rotation §4 bis** — les 5 derniers domaines (par mtime) : `nutrition, coach, athlete, coach,
   sommeil`. **Bloqués** : `coach` (2 derniers + 2× sur 5) et `nutrition` (2 derniers). **Autorisé** :
   `athlete` (1× sur 5, absent des 2 derniers).
2. **Quota de propositions §4 bis.4 déclenché** — la dernière proposition écrite est #619
   (`proteine-cible-deficit`) ; les **10 derniers recaps (621-630) n'en contiennent aucune**
   (`ls docs/proposals/` inchangé sur la fenêtre). #626/#629 tenaient encore le quota satisfait parce
   que #619 était dans leur fenêtre ; il en est **sorti** → l'itération doit être une **proposition**,
   pas du code.

Une passe d'exploration (lecture seule) a cherché un défaut **prouvable** hors de la famille
verdict↔chiffres (épuisée). Le plus solide est structurel et transverse → cadré en proposition plutôt
que patché à un seul endroit (§4 ter : un correctif partiel recréerait l'incohérence inter-surfaces).

## Le manque (prouvé par lecture)

Un champ sommeil laissé **vide** est stocké `sleep: 0` (`app.js:804`). Or `readinessScore`
(`logic.js:9580-9589`) **documente** qu'un sommeil absent ne doit **pas** pénaliser (il renormalise
fatigue+courbatures sur 100). Mais le flag « récupération fragile / séance facile » est recalculé
**inline à ~9 endroits** de `app.js` (143, 268, 325, 397, 427, 444, 490, 519, 565) avec, partout, un
`recovery.sleep < 6` **sans garde `sleep > 0`** → `0 < 6` est vrai.

Contradiction prouvée, état `{sleep vide→0, fatigue:1, soreness:1}` : `readinessScore` = **100/100
« Prêt à pousser »** tandis que, au même instant, `#weekLoadAdvice` affiche **« Récupération basse »**,
le **cycle Ultra entier est rabaissé** (`factors = fragile ? [.8,.9,.95,.65] : [1,1.08,1.15,.7]`,
`app.js:565`) et la séance guidée passe en mode prudent. Second défaut jumeau : la résolution du
check-in diffère selon les surfaces (`find(date===today)` sur 268/325, `at(-1)` — potentiellement
périmé — sur les autres).

## Proposition écrite

`docs/proposals/recuperation-flag-sommeil-absent.md` — Problème (fichier:ligne) · 3 options (A fix
minimal autonome · **B source unique de vérité : helper pur `recoveryEase` + accesseur
`todayRecovery`, recommandée** · C tout aligner sur `readinessScore`) · risques (multi-sites, UX
visible, cycle Ultra, aucun risque données/boot) · **4 décisions pour Adrien** (périmètre · corriger
aussi la résolution périmée · étapes autonomes vs supervisé · comportement voulu sommeil absent).

La reco B est réalisable en **étapes autonomes** (B.1 helpers purs testés → B.2 branchement + smoke
bloquants) dès le feu vert d'Adrien sur le périmètre — respecte §4 ter (zéro champ ajouté, pure
curation) et transforme un flag dupliqué 9× et non testé en fonction pure testée.

## Vérification

Pas de changement de code utilisateur → **pas de bump**, `verify` non requis (aucune source touchée).
Grep + lecture des lignes citées confirmés avant rédaction (règle §2.3). Quota §4 bis.4 satisfait par
cette proposition. Rotation respectée (`athlete`).

Domaine : athlete
