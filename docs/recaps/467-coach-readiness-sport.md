# #467 — Coaching : l'action sport du coach se cale sur la readiness du jour (2.0.98)

**Priorité de la nuit (DEMANDES.md) : pousser le Coaching adaptatif À FOND — CAP 3.0, étape 1.**

## Le manque réel

`adaptiveCoachFocus` sait déjà enrichir ses conseils **sommeil** (verdict chiffré + cible de
recalage) et **nutrition** (cible protéines réelle + collation concrète), mais quand il pousse le
pilier **sport**, l'action restait générique et **aveugle à la forme du jour** :

- rebuild/revive → « Programme une séance courte aujourd'hui, même 20 min. »
- reinforce → « Encore un jour actif aujourd'hui pour ancrer l'habitude. »

Or l'app collecte déjà, à chaque check-in de récup, de quoi calculer une **readiness** (`readinessScore`
sur sommeil + fatigue + courbatures). Le coach l'ignorait complètement côté sport. Résultat : il
pouvait dire « fais une séance » un jour où la readiness est au plancher (fatigue 5, courbatures 5,
nuit courte) — pousser à la blessure ou au dégoût — ou rester tiède un jour où tout est au vert et
brider les progrès. C'est exactement l'écart que la demande vise : **adapter dynamiquement aux
progrès ET aux écarts**.

## L'amélioration

Nouvelle boucle **coach × récupération**, le pendant de la boucle coach × sommeil déjà en place.
Quand le pilier choisi est le sport ET qu'un check-in de récup **daté du jour** existe, l'action se
cale sur `readinessScore` de la nuit du jour :

| Readiness | Conseil |
|---|---|
| **< 50** | « récupération prioritaire : vise mobilité, marche ou technique légère plutôt qu'une grosse séance » |
| **50–74** | « séance correcte, mais garde une marge : pas de record aujourd'hui » |
| **≥ 75** | « ton corps est prêt à pousser : c'est le jour d'une vraie séance, monte un peu l'intensité » |

Chaque message **cite le score** (`Readiness X/100`) — crédible et transparent, comme les autres
piliers qui parlent chiffres.

### Garde-fous

- **Check-in DATÉ DU JOUR uniquement.** Une readiness d'hier ne dit rien de la forme d'aujourd'hui :
  sans entrée de récup pour `todayKey`, on retombe proprement sur l'action générique et `readiness`
  vaut `null`.
- **Le micro-pas (#465) et le renfort (#466) gardent la priorité.** Le bloc readiness s'exécute
  avant eux : si un conseil sport a été ignoré 2 fois (micro-marche) ou si le suivi est élevé
  (renfort), leur message reprend la main. Cohérent : ces signaux-là portent sur le *suivi*, pas sur
  la *forme*.
- Additif pur : nouveau champ `readiness` (nombre ou `null`) dans le retour, aucun retrait.

## Logique / tests

- `src/lib/logic.js` — bloc readiness dans `adaptiveCoachFocus` (pilier sport), champ `readiness` au
  retour, CHANGELOG[0] 2.0.98.
- `src/test/logic.test.js` — nouveau test « action sport calée sur la readiness du jour » : plancher
  (15/100 → allègement), vert (100/100 → feu vert), moyenne (60/100 → marge), pas de check-in du jour
  (→ générique, `readiness === null`). Assertion `CHANGELOG[0].v`.
- `src/test/renderer-smoke.cjs` — check bloquant `coachFocus` étendu (readiness basse/haute/absente) ;
  assertion `whatsNew`.
- `cd src && xvfb-run -a npm run verify` → **455 tests + SMOKE OK**, 100 % vert.

## Fichiers

`src/lib/logic.js`, `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`,
`docs/ROADMAP.md`, `docs/recaps/467-coach-readiness-sport.md`.
