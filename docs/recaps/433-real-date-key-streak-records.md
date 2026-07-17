# 433 — Records de série : une date impossible ne gonfle plus le record (bien-être & protéines) (2.0.66)

## Le manque (bug prouvé — §4.2 robustesse / §4.4 correctness, domaines Bien-être + Nutrition)

Même classe que #431 (Sommeil) et #432 (Anniversaires) : une date **format-valide mais
calendairement impossible** qui déborde sous `new Date`. Ici, deux fonctions sœurs de calcul de
**record de série** (le « best », all-time) :

- `wellnessBestStreak` (`logic.js:3384`) filtrait ses dates avec la seule regex de format
  `/^\d{4}-\d{2}-\d{2}$/`, puis calculait les écarts jour-à-jour via
  `new Date(days[i] + 'T12:00:00')`.
- le `best` de `proteinStreak` (`logic.js:6201`) construisait son `Set hit` avec la même regex laxe,
  puis parcourait `new Date(prev + 'T12:00:00')`.

Une date impossible comme `'2026-04-31'` (avril n'a que 30 jours) passe la regex, et
`new Date('2026-04-31T12:00:00')` **déborde silencieusement au 1er mai**. Triée juste avant une vraie
date du 2 mai, elle forme une **paire de jours consécutifs fantôme** → le record est gonflé d'un jour
jamais réellement enchaîné.

Point décisif : la fonction **sœur affichée à côté** — `wellnessStreak` (série EN COURS, `logic.js:3372`,
marche à rebours depuis un vrai `todayKey` via `dateKey`) — ne tombe **jamais** sur la date impossible
et l'**ignore** déjà. Le `current` de `proteinStreak` est lui aussi walk-based, donc sûr. Résultat :
« record » et « série actuelle », montrés ensemble, se contredisent.

Preuve (exécutée sur le vrai code, figée en test) :

```
wellnessBestStreak([{date:'2026-04-31',key:'a'}, {date:'2026-05-02',key:'b'}])
  AVANT → 2   (record fantôme ; une seule vraie séance existe)
  APRÈS → 1
wellnessStreak([…mêmes…], '2026-05-02') → 1   (la sœur ignore déjà le 31/04 → incohérence)

proteinStreak([{date:'2026-04-31',protein:200}, {date:'2026-05-02',protein:200}], 120, '2026-05-02')
  AVANT → { current:1, best:2 }   (best gonflé)
  APRÈS → { current:1, best:1 }
```

`new Date('2026-04-31T12:00:00')` renvoie bien **Fri May 01 2026** (vérifié au runtime).

Non déclenchable par l'UI (les dates viennent de `localDate()`, toujours réelles), mais **réel sur
données legacy / import / restauration** : il n'existe **pas** de `normalizeState` assainissant
`wellnessDone`/`nutrition`, et `logWellnessDone` n'applique que la regex laxe — une date impossible
d'une sauvegarde restaurée persiste et atteint ces deux fonctions. Le garde-fou existant
`isBoundedDateKey` (`logic.js:30`) ne borne que mois≤12 / jour≤31 : il **laisse passer** `31/04`.

`grep` : aucun test ne couvrait une date impossible pour ces fonctions (toutes les séries de test
utilisent de vraies dates).

## Le geste (un helper round-trip, appliqué aux deux filtres)

Nouveau helper pur, sœur stricte de `isBoundedDateKey` :

```js
function isRealDateKey(s) {
  const m = typeof s === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
  if (!m) return false;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3];
}
```

L'aller-retour `new Date` rejette exactement les dates impossibles — y compris `29/02` d'une **année
non bissextile** (ces séries portent des dates concrètes datées, donc un 29 février impossible DOIT
être rejeté, contrairement aux anniversaires de #432 qui préservaient le 29/02 volontairement). Les
deux filtres passent de la regex laxe à `isRealDateKey`. **Rétro-compatible** : seule une date
impossible change de comportement ; les chemins walk-based (`current`, `wellnessStreak`) étaient déjà
sûrs et sont inchangés (une date impossible n'y était de toute façon jamais matchée).

## Tests & vérif

- Nouveau bloc pur `isRealDateKey` (`logic.test.js`) : chaque mois court testé (31 avr./juin, 30 févr.,
  29 févr. non bissextile → false ; 31 déc., 29 févr. bissextile → true), + témoin
  `isBoundedDateKey('2026-04-31') === true` pour montrer que le nouveau helper est plus strict.
- `wellnessBestStreak` étendu : `[31/04, 02/05]` → record **1** (pas 2) + `wellnessStreak` de la même
  liste → **1** (les deux sœurs d'accord).
- `proteinStreak` étendu : `[31/04, 02/05]` → `{ current:1, best:1 }` (best non gonflé).
- **Checks smoke bloquants** (`renderer-smoke.cjs`) : `proteinStreak` (déjà bloquant) étendu avec le
  cas fantôme ; `wellnessBestStreak` étendu **et** promu bloquant (nouvelle ligne `errors.push`).
- `cd src && xvfb-run -a npm run verify` → **441 tests + smoke 100 % verts** (`wellnessBestStreak:true`,
  `proteinStreak:true`, `whatsNew` en 2.0.66, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.65 → 2.0.66** : effet utilisateur réel (record de série juste après un import/restauration)
  → entrée CHANGELOG (🧘) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
- Un helper + deux filtres d'une ligne. Aucune feature retirée, aucune Release, zéro dépendance,
  aucune donnée perso.

## Variété (§4)

Même veine « fonctions sœurs cohérentes / date impossible qui déborde » que #431-#432, mais **deux
domaines neufs** (Bien-être + Nutrition) et un helper réutilisable qui referme la classe de bug pour
les records de série. Candidat issu d'un audit ciblé (agents) de domaines peu touchés : le second
candidat étudié (`lastExerciseSession`, dépendance à l'ordre des séances de même date) a été écarté
car sa sortie « correcte » sur double-saisie relève du jugement (meilleure série vs fusion) — trop
débattable pour un run autonome, comme le recommande le recap #432. Boucle #433.
