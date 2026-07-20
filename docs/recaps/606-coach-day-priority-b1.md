# #606 — Coach « La priorité du jour » B.1 : le modèle pur `coachDayPriority` (logique + tests, pas de bump)

_Boucle #606 · 2026-07-20 · Domaine : coach_

## Contexte — feu vert d'Adrien

`docs/DEMANDES.md` → « À traiter » : **« T'as l'autorisation pour Coach Priority »** (ajouté le
2026-07-20 22:31 via le terminal). C'est le feu vert sur le **périmètre B** de la proposition #602
(`docs/proposals/coach-priorite-du-jour-integree.md`, décision 1). Cette demande prime sur le backlog
§4. Contrôle de rotation vérifié avant de coder : `coach` apparaît **une seule fois** dans les 5
derniers recaps (#602) et **pas dans les 2 derniers** (nutrition, athlete) → la rotation passe, en plus
du feu vert explicite.

Cette itération livre **B.1** : la **fonction pure + ses tests**, comme prévu par la proposition (« B.1,
le modèle pur, peut démarrer dès le feu vert, sans bump »). **Aucun rendu touché** → pas de bump de
version (§2.6 : changement sans effet utilisateur).

## Le manque, re-vérifié (grep + lecture)

Les deux surfaces coach du dashboard sont rendues par deux fonctions qui **ne se connaissent pas** :
- `attentionDigest` (`logic.js:5200`) — **réactif**, `[{key, emoji, text, page, sev}]` trié high→med.
- `adaptiveCoachFocus` (`logic.js:5248`) — **proactif**, un objet `{pillar, tone, headline, insight,
  action, …}` (pilier unique choisi par sa tendance 2 semaines).

Aucune ne curate **par rapport à l'autre** : le même pilier peut occuper les deux blocs (redondance),
et un digest « Forme basse (42/100) — allège » peut **contredire** un focus proactif « relance le
sport ». Personne n'optimisait le message **cumulé** (défaut §4 ter transposé au niveau carte).

## Ce qui a été fait — `coachDayPriority(state, todayKey, opts)` (pure, `logic.js`)

Une fonction **pure** qui réconcilie les sorties des deux fonctions **sans ajouter aucun champ ni
donnée coach** (curation §3 : on retire, on dédoublonne, on hiérarchise). Elle renvoie :

- `primary` : l'unique **action n°1 du jour** (`{source, pillar, emoji, page, headline, why, action}`),
  prête à rendre dans le bloc focus ;
- `deduped` : la liste « À rattraper » **débarrassée** de ce que le focus porte déjà **et** de l'item
  promu en n°1 (plus de doublon) ;
- `defer` : ce qu'on **assume de laisser** aujourd'hui (le focus mis de côté quand la santé prime), ou
  `null` ;
- `reframed` : `true` quand un signal santé a primé sur un focus de momentum sport.

**Règle d'arbitrage** (conservatrice, testée) : un item santé `high` (`readiness < 50`, « forme basse »)
**prime** sur un focus proactif « pousse une séance » (pilier `sport`, ton `rebuild`/`revive`/`reinforce`)
→ la n°1 devient « récupère » et le focus sport passe en `defer`. Sinon le focus reste la n°1 —
**l'alternance** (priorité absolue, ton `urgent`) passe donc **intacte** et n'est **jamais** recadrée par
la forme. Sans focus (pas d'historique) : la n°1 est l'item réactif le plus grave.

**Injectable** : `opts.focus` / `opts.digest` permettent de piloter les entrées en test ; sinon elles
sont calculées via `adaptiveCoachFocus` / `attentionDigest`.

### Non-régression garantie (proposition §4)
- **`coachLog` intact** : `coachDayPriority` est **display-only**, elle ne journalise rien. Le pilier
  loggé reste celui d'`adaptiveCoachFocus` → le taux de suivi `coachFollowThrough` n'est **pas** faussé.
  Test dédié : `primary.pillar === focus.pillar` dans le cas normal.
- **Aucune sur-curation silencieuse** : la dédup ne retire un item que si son pilier est **déjà porté
  par le focus** (map `KEY_TO_PILLAR` explicite) ou s'il est **promu en n°1** — jamais autrement.

## Tests (6 nouveaux, `logic.test.js`)
1. date invalide → structure vide `{primary:null, deduped:[], defer:null, reframed:false}` ;
2. focus proactif → n°1, **pilier préservé** (non-régression coachLog) ;
3. dédup de l'item digest du **même pilier** que le focus ;
4. **tension santé↔momentum** : forme basse prime, `reframed:true`, `defer` = focus sport, readiness
   + séance manquée retirés du digest ;
5. sans focus → n°1 = item réactif le plus grave, retiré du digest ;
6. focus **alternance** intact, jamais recadré, forme basse reste visible dans « À rattraper ».

## Vérification
`cd src && xvfb-run -a npm run verify` → **558 tests + smoke 100 % vert**. Pas de bump (pur, non branché
au rendu).

## Décisions Adrien encore ouvertes (proposition §5, décisions 2-4)
Le feu vert portait sur le **périmètre** (décision 1 = B). B.1 implémente la **reco par défaut** pour les
autres décisions, **ajustable** en B.2/B.3 :
- **Déc. 2** — les deux blocs restent **distincts** (B ne fait que les réconcilier). ✅ conforme.
- **Déc. 3** — `defer` est **calculé** mais **pas encore affiché** ; son affichage est l'objet de **B.3**.
- **Déc. 4** — la santé prime **dès `readiness < 50`** (seuil du digest `high`), sans seuil additionnel ;
  la variante « seulement au-delà d'un seuil » reste un réglage B.3.

## Suite
- **B.2** : brancher `coachDayPriority` au rendu (`renderCoachFocus` affiche `primary`, `renderAttention`
  affiche `deduped`), **check smoke bloquant** (dédup effective + n°1 présent) + **contrôle §4 ter**
  (rendu **cumulé** relu sur un état **chargé**). C'est là que le bump aura lieu (effet utilisateur).
- **B.3** : affinage du `defer` (affichage éventuel, seuils), selon les décisions 3/4 d'Adrien.

Domaine : coach
</content>
</invoke>
