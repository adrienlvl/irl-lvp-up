# #359 — Coaching adaptatif : « Le focus du moment » (3.0 · Vague 1, tranche 1) (2.0.3)

Première brique de la **Vague 1 de la 3.0 — Coaching adaptatif** (ordre validé par Adrien :
Coaching → Fondations → Sécurité → Sync → Études → Scans).

## L'idée

« À rattraper » (`attentionDigest`) est **réactif** : il liste ce qui est en retard ou en péril
à l'instant T. Le coach adaptatif est **proactif** et lit la **dynamique** : sur deux semaines
glissantes, il compare l'activité récente de chaque pilier de vie à la semaine précédente, repère
la tendance, et propose **UN seul focus** — celui où un petit geste aujourd'hui a le plus de valeur.

## Ce qui change

- Nouvelle fonction pure `adaptiveCoachFocus(state, todayKey)` : pour chaque pilier
  (**entraînement**, **focus**, **sommeil**, **nutrition**) elle compte les jours actifs sur la
  fenêtre récente (0–6 j) vs précédente (7–13 j), en déduit la tendance, puis choisit le focus par
  priorité :
  1. **rebuild** — un pilier solide (≥3 j la semaine passée) qui **s'essouffle** → relancer avant de perdre l'acquis ;
  2. **revive** — un pilier connu mais **dormant** depuis > 2 semaines → reprendre ;
  3. **reinforce** — rien à corriger → **renforcer** la meilleure dynamique en cours.
  Le message (titre + constat chiffré + action concrète) et le ton s'adaptent à la situation.
- Nouvelle carte **« TON COACH · Le focus du moment »** sur l'accueil (entre « À rattraper » et
  « Aujourd'hui »), `renderCoachFocus()`. Liseré coloré selon le ton (ambre / violet / vert). Un
  clic ouvre le bon onglet (athlète, focus, nutrition). Masquée si aucun historique (l'onboarding
  couvre le nouveau venu).

## Vérification navigateur

- Sport solide puis en recul → « Ton entraînement s'essouffle » (ton `rebuild`), « 2 jours actifs
  cette semaine, contre 3 la précédente », action « Programme une séance courte… », clic → onglet
  athlète ✅.
- Sport en hausse → « monte en régime » (`reinforce`) ✅ ; focus dormant 30 j → « Reprends le focus »
  (`revive`) ✅ ; aucune donnée → carte masquée ✅. Aucune erreur console.

## Tests

376 tests `node:test` (adaptiveCoachFocus : null si vide/date invalide, rebuild/revive/reinforce,
priorité du décrochage sur la hausse, activité « vide » et dates futures ignorées) + smoke
`coachFocus` **bloquant** (fonction pure + carte + rendu réel via dates relatives à `localDate()`,
donc indépendant de l'horloge machine).

## Contexte

Build **2.0.3**. Item 1 d'une nouvelle rotation (pas de tag). Prochaines tranches Vague 1 :
enrichir le coach (plus de piliers, mémoire des focus, coaching hebdo), avant de passer aux
Fondations techniques.
