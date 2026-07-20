# #614 — Coach « priorité du jour » : plus de recadrage « récupère » quand la séance est DÉJÀ faite

**Build 2.0.227** · domaine `coach` · boucle autonome VPS (2026-07-21)

## Contexte / priorité

Demande de nuit d'Adrien (DEMANDES.md) : pousser le coaching adaptatif à fond, dans le cadre §3
(qualité, pas volume). Rotation §4 bis contrôlée AVANT de coder : les 5 derniers domaines étaient
`etudes, nutrition, athlete, coach, athlete` → `coach` absent des **2 derniers** et présent **une seule
fois** sur 5 → autorisé ce tour. Quota de propositions satisfait (#610). Méthode imposée par le mémo
coach : **rendu chargé** (§4 ter), pas de test unitaire isolé, pour trouver un angle NEUF.

## Le manque (prouvé en rendu chargé, pas re-labouré)

État chargé réaliste (sport en hausse, **séance du jour faite**, forme basse aujourd'hui — readiness
40/100, sommeil court) rendu via `adaptiveCoachFocus` → `coachDayPriority` :

- Focus brut : pilier `sport`, ton `reinforce`, `doneToday: true`, action = _« Séance déjà faite 💪 —
  verrouille avec 5 min d'étirements, le reste c'est de la récup bien méritée. »_ (déjà orientée récup,
  n'incite à **rien**).
- Pourtant `coachDayPriority` **recadrait** en `primary.source: 'health'` → _« Priorité du jour :
  récupère »_, action _« Repos ou séance très douce — **tu relanceras l'entraînement dès que la forme
  remonte** »_, avec un `defer` _« Ton entraînement monte en régime — ça peut attendre… »_.

Deux défauts : (a) suggérer de **reporter** un entraînement **déjà fait** ; (b) **écraser l'acquittement
mérité** (« séance faite 💪 ») par un message générique. La doc de `sportPush` dit que le recadrage prime
sur un focus qui **« pousse une séance »** — or `doneToday` ne pousse rien : le guard se déclenchait
**à tort** (§3 « corriger un guard qui se déclenche à tort »).

## Correctif (§3, curation, ZÉRO champ ajouté)

`logic.js` (`coachDayPriority`) : `sportPush` gardé `&& !focus.doneToday`. Quand la séance du jour est
faite, plus de tension push↔repos → le focus brut (avec son acquittement) **reste la n°1**, `defer` reste
`null`, et « À rattraper » continue d'afficher _« Forme basse — allège »_ (dédup : readiness ≠ pilier
`sport`, pas de doublon). **Les deux surfaces restent cohérentes** sans recadrage.

Chirurgical : le recadrage **reste** actif quand la séance n'est **pas** faite (tension réelle : le coach
pousse pendant que la forme est basse) — cas couvert par le test/smoke existants (`tone: 'rebuild'`, pas
de `doneToday`). `revive` a toujours `doneToday=false` → inchangé.

## Vérifs

- `logic.test.js` : +1 test (`coachDayPriority : séance DÉJÀ faite + forme basse → pas de recadrage`).
- `renderer-smoke.cjs` : +1 volet logique dans le check bloquant `coachDayPriority` (`dpDone`).
- Contrôle §4 ter appliqué : carte relue en entier sur l'état chargé, message final cohérent.
- `cd src && xvfb-run -a npm run verify` → **563 tests + smoke 100 % vert**.

## Suite

Famille insight↔action close (SPORT/FOCUS), milestones empilables close, tension santé↔momentum
maintenant affinée sur `doneToday`. Prochaine boucle `coach` = encore un autre angle, prouvé en rendu
chargé avant de toucher.

Domaine : coach
