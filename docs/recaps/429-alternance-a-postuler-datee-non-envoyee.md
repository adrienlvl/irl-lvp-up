# 429 — Alternance : une cible « à postuler » datée n'est plus comptée comme envoyée (2.0.62)

## Le manque (bug prouvé — §4.4 cohérence/correctness, domaine frais Alternance/candidatures)

`applicationStats(applications, todayKey, opts)` (`src/lib/logic.js:202`) est le **moteur de motivation**
de l'onglet 💼 Alternance : série (`🔥`), « postulé aujourd'hui ✓ », compteur hebdo, taux de réponse.
Le sous-ensemble `sent` (candidatures **envoyées**) était calculé **par la seule présence d'une date** :

```js
const sent = list.filter(a => isKey(a.date));   // logic.js:210 — ne teste PAS le statut
```

Or une candidature au statut `a_postuler` (repérée mais **pas encore envoyée**) peut porter une date :
c'est exactement ce que produit l'import CSV (`parseApplicationsCsv`, `logic.js:255`), qui reprend statut
et date **indépendamment** — une deadline ou une date de repérage sur une ligne « à postuler » du tableur.
Résultat : cette cible gonflait `sent`, `appliedToday` (211), `weekCount` (215) et la **série** (217-223),
alors que la fonction sœur `applied` (225) exclut correctement `a_postuler`.

Preuve (exécutée sur le vrai code) :

```
applicationStats([{status:'a_postuler', date:'2026-07-17'}], '2026-07-17')
  → { sent:1, appliedToday:true, weekCount:1, streak:1, byStatus.a_postuler:1, byStatus.postule:0 }
parseApplicationsCsv('entreprise,statut,date\nAlphaCorp,à postuler,2026-07-17\n')
  → [{status:'a_postuler', date:'2026-07-17', ...}]   // l'import crée bien le cas
```

Fonction **incohérente avec elle-même** : `byStatus.postule = 0` (funnel : rien d'envoyé) mais
`sent = streak = 1`. Effet utilisateur : dès l'import de son suivi, Adrien verrait « 🔥 Série : 1 jour »,
« Aujourd'hui : 1 candidature ✓ », « 1/5 cette semaine » **sans avoir rien envoyé** — ce qui sabote le
but affiché de la fonction (« pousser à postuler chaque jour »). Le module Alternance est **sacré**
(priorité de vie d'Adrien) : on l'améliore, on le fiabilise.

`grep` (`test/logic.test.js:673`, `:693`) : la seule candidature `a_postuler` des tests a toujours une
**date vide** (`date: ''`, ligne CSV `,,`). Le cas `a_postuler` **avec** date — celui que révèle l'import —
n'était **jamais** couvert. Bug repéré via un audit ciblé (agent) des fonctions du domaine candidatures.

## Le geste (une ligne, exclure le statut « à postuler » du compte d'envoyées)

```js
const sent = list.filter(a => a.status !== 'a_postuler' && isKey(a.date));
```

Corrige d'un coup les 4 métriques dérivées (`sent`, `appliedToday`, `weekCount`, `streak`), qui toutes
lisent `sent`. Aucune autre logique touchée ; `applied`/`answered`/`responseRate` (déjà corrects par
`byStatus`) inchangés. Rétro-compatible : une « à postuler » sans date ne comptait déjà pas ; une vraie
candidature (`postule`/`entretien`/…) datée compte toujours.

Cas vérifiés sur le vrai code puis figés : `[a_postuler@07-17] → sent 0, appliedToday false, weekCount 0,
streak 0` (le bug) · mixte `[postule@07-17 + a_postuler@07-17] → sent 1, appliedToday true` (seule la
vraie compte) · le test historique à 5 envoyées (`sent === 5`) reste vert (son `a_postuler` a `date:''`).

## Tests & vérif

- Bloc pur `applicationStats` étendu (`test/logic.test.js`) : « à postuler » datée → 0 partout ; cas mixte
  → seule la candidature postulée compte comme envoyée.
- **Check smoke `alternance` étendu** (`renderer-smoke.cjs`) : dans le vrai renderer Electron,
  `applicationStats([{status:'a_postuler', date:'2026-07-16'}], …)` renvoie `sent 0 / appliedToday false /
  weekCount 0 / streak 0`. Ligne `errors.push` associée conservée (bloquant).
- `cd src && xvfb-run -a npm run verify` → **437 tests + smoke 100 % verts** (`alternance:true`,
  `whatsNew` en 2.0.62, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.61 → 2.0.62** : effet utilisateur réel (série/compteurs justes) → entrée CHANGELOG (💼) +
  2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
- Une seule fonction pure, une seule ligne de logique. Aucune feature retirée, module Alternance
  **fiabilisé et non cassé**. Aucune Release, zéro dépendance, aucune donnée perso.

## Variété (§4)

Rupture avec la série récente (achievements/RPG #428, habitudes #427, nutrition/poids #426, force/1RM #425,
Agenda #424) : **cohérence/correctness (§4.4)** dans le domaine **Alternance / candidatures**, jamais
travaillé depuis la demande #391-392. Boucle #429.
