# Proposition — « La priorité du jour » : arbitrer les deux surfaces coach du dashboard

_Écrite le 2026-07-20 (boucle #602). Domaine : coach. Déclenchée par la priorité de nuit d'Adrien
(« pousse le coaching adaptatif à fond : priorisation intelligente, quoi faire en premier
aujourd'hui ») **croisée** avec §3 (« le problème du coach n'est plus ce qu'il **sait**, c'est ce
qu'il **dit en premier** — on l'améliore en curation, pas en volume ») et le quota §4 bis.4._

## 0. Pourquoi une proposition et pas du code

La demande de nuit veut de la **profondeur** de coaching. Or, en vérifiant le code (grep + lecture),
**toutes les capacités unitaires de profondeur existent déjà** :

| Capacité de coaching | Déjà implémentée par | Vérifié |
| --- | --- | --- |
| Hiérarchiser les notes (l'urgent avant l'accessoire) | `orderCoachNotes` + `coachNoteUrgency` + `COACH_URGENCY_TIERS` (`logic.js:9996-10081`) | ✅ tri par urgence, verdict figé en tête |
| Digest transversal **réactif** (retards/périls) | `attentionDigest` (`logic.js:5151-5185`) | ✅ 6 piliers, tri sévérité `high/med`, cap 4 |
| Focus **proactif** mono-pilier (dynamique 2 sem.) | `adaptiveCoachFocus` (`logic.js:5199+`) | ✅ tendance rebuild/revive/reinforce, mémoire anti-radotage `coachLog` |
| Boucle fermée : « as-tu suivi mon conseil ? » | `coachLog` + `coachFollowThrough` (`logic.js:7727-7752`) | ✅ taux de suivi par pilier |
| Suivi des intentions posées | `intentionFollowThrough` (`logic.js:1518+`) | ✅ |

**Ajouter une 94ᵉ capacité serait du volume, pas de la profondeur** (interdit §3). Le seul levier de
profondeur **encore réel** est un **choix structurant** — donc une proposition, pas du code
autonome.

## 1. Problème — deux surfaces coach côte à côte, zéro arbitration entre elles

Le dashboard affiche **deux blocs coach indépendants**, rendus par deux fonctions qui **ne se
connaissent pas** :

- **« À rattraper »** — `renderAttention` (`app.js:164`) → `attentionDigest` : **réactif**, liste ce
  qui est en retard/en péril, trié par une sévérité **fixe** (`rank={high:0,med:1}`, `logic.js:5182`),
  cap 4.
- **« Le focus du moment »** — `renderCoachFocus` (`app.js:227`) → `adaptiveCoachFocus` : **proactif**,
  choisit **UN** pilier par sa **tendance** sur 2 semaines glissantes.

Chacune curate **en interne** (sévérité ; urgence des notes). **Aucune** ne curate **par rapport à
l'autre** : elles lisent le même `state`, au même instant, mais sans état partagé ni dédup.

Conséquences structurelles (indépendantes de tout bug ponctuel) :

1. **Redondance possible** — le même pilier peut occuper les deux blocs le même jour (ex. « 1 séance
   non faite » dans « À rattraper » **pendant que** le focus du moment porte aussi sur le sport). Le
   lecteur voit deux fois le même sujet, sur un écran, sans que rien ne l'ait décidé.
2. **Risque d'avis en tension** — les deux lentilles sont **opposées par construction** (réactif = « tu
   as loupé / c'est en retard, rattrape » ; proactif via la tendance peut inviter à **relancer** un
   pilier qui s'essouffle). `adaptiveCoachFocus` gère finement la readiness **en son sein**
   (`logic.js:~5378` : l'action readiness recadre déjà l'intensité), mais **rien** ne réconcilie une
   readiness basse signalée dans « À rattraper » (« Forme basse (42/100) — allège », `logic.js:5159`)
   avec un focus proactif « relance le sport ». L'utilisateur doit arbitrer lui-même — exactement la
   charge que le coach est censé porter à sa place.
3. **Pas de « LA priorité du jour »** — la demande de nuit demande explicitement « **quoi faire en
   premier aujourd'hui** ». Aujourd'hui il n'existe **aucune** synthèse qui, *toutes surfaces
   confondues*, désigne **une** action n°1 et **pourquoi** (ni, symétriquement, ce qu'on peut **lâcher**
   aujourd'hui parce qu'autre chose prime). Chaque bloc optimise **son** classement ; personne
   n'optimise **le message que l'utilisateur reçoit**, cumulé — c'est le défaut §4 ter (« vert ≠
   bon ») transposé du niveau **phrase** au niveau **carte**.

C'est un défaut de **curation transversale**, pas de connaissance. Il est donc **pile dans le
périmètre encouragé par §3** (hiérarchiser, fusionner, faire remonter l'urgent) — mais il engage un
**choix de périmètre** (faut-il fusionner deux surfaces qu'Adrien a peut-être voulues distinctes ?),
d'où cette proposition.

## 2. Options

### Option A — Ne rien changer (statu quo assumé)
Documenter que les deux surfaces sont **deux lentilles volontairement distinctes** (réactif vs
proactif) et que leur coexistence est un choix, pas un oubli.
- ➕ Coût nul, zéro risque de régression.
- ➖ Laisse la redondance et la tension possibles ; ne répond pas au « quoi faire en premier » de la
  demande de nuit.

### Option B — Fine couche d'**arbitrage/dédup** au rendu (RECO)
Une **fonction pure** `coachDayPriority(state, todayKey, opts)` qui prend les sorties de
`attentionDigest` **et** `adaptiveCoachFocus`, les **réconcilie**, et renvoie :
- `primary` : l'unique action n°1 du jour (celle qui, tout pesé, mérite la première place) + le
  **pourquoi** en une phrase ;
- `deduped` : la liste « À rattraper » **débarrassée** de l'item déjà porté par le focus (plus de
  doublon) ;
- éventuellement `defer` : ce qu'on **assume de laisser** aujourd'hui (« la séance peut attendre :
  ta forme est basse et l'épreuve est dans 3 jours »).

Règles d'arbitrage **explicites et testables** (ex. : un item `high` de sécurité/santé — readiness
basse, épreuve imminente — **prime** sur un focus proactif de momentum et **recadre** son ton ; un
item déjà couvert par le focus est retiré du digest). Rendu inchangé en structure : le bloc « focus »
affiche `primary`, le bloc « À rattraper » affiche `deduped`.
- ➕ **Curation pure §3** : **zéro nouveau champ de données**, zéro `insight +=` ; on **retire** et on
  **hiérarchise**. Réalisable en **étapes autonomes** façon P6 : **B.1** fonction pure + tests
  (dont les cas de tension readiness↔momentum) → **B.2** branchement au rendu + dédup + check smoke
  bloquant + contrôle §4 ter (rendu **cumulé** relu en entier) → **B.3** affinage du « defer ».
- ➖ Risque de **sur-curation** : masquer un item réactif encore utile. Mitigé par B.1 (règles
  prouvées par test) + B.2 (§4 ter sur état chargé).

### Option C — Fusionner les deux blocs en une seule surface « Aujourd'hui »
Refondre « À rattraper » + « Focus du moment » en **un** panneau unique classé.
- ➕ Message le plus net possible pour l'utilisateur.
- ➖ **UX majeure** (retire deux blocs existants → touche §3 « ne retire pas de fonctionnalité »),
  perd la distinction réactif/proactif qu'Adrien a peut-être voulue, gros diff de rendu. **À ne pas
  faire en autonomie.**

## 3. Recommandation

**Option B**, en étapes autonomes. C'est le **seul** levier de profondeur de coaching restant qui
soit à la fois (a) **neuf** (aucune arbitration croisée n'existe — vérifié), (b) **conforme §3** (pure
curation, aucun champ ajouté), (c) **aligné** sur la demande de nuit (« quoi faire en premier »), et
(d) **borné et testable**. B.1 (le modèle pur + ses tests, sans bump) peut démarrer dès le feu vert
d'Adrien sur le périmètre.

## 4. Risques

- **Sur-curation** : la dédup pourrait masquer un item « À rattraper » que l'utilisateur voulait voir
  → règles conservatrices, prouvées par test, et **relecture du rendu cumulé** (§4 ter) sur un état
  **chargé** avant tout commit de rendu.
- **Cohérence des tons** : quand santé prime sur momentum, il faut que le focus **recadre** son
  action sans se contredire → à verrouiller par test (cas readiness basse + tendance sport en baisse).
- **Non-régression** : `coachLog`/`coachFollowThrough` lisent le pilier **du focus** — l'arbitrage ne
  doit pas changer *quel pilier est loggé* sous peine de fausser le taux de suivi. À préserver
  explicitement (le focus reste la source de vérité du log ; l'arbitrage n'agit qu'à l'**affichage**).
- **Smoke** : nouveau check bloquant obligatoire (`coachDayPriority` : dédup effective + n°1 présent).

## 5. Ce qui dépend d'Adrien (à trancher)

1. **Périmètre** : A (statu quo documenté), **B** (couche d'arbitrage/dédup — reco), ou C (fusion) ?
2. **Garder les deux blocs distincts** (« À rattraper » réactif + « focus » proactif) ou les
   rapprocher visuellement ? _(la reco B les garde, elle ne fait que les réconcilier.)_
3. **Afficher un `defer` explicite** (« ce que tu peux lâcher aujourd'hui ») ou rester silencieux sur
   ce qu'on ne fait pas ? _(plus honnête, mais une ligne de plus à l'écran — arbitrage §4 ter.)_
4. **Priorité d'arbitrage** en cas de tension : la santé/sécurité (readiness basse, épreuve imminente)
   doit-elle **toujours** primer sur le momentum, ou seulement au-delà d'un seuil ?

> Rien ne s'implémente avant le feu vert d'Adrien sur le **périmètre** (décision 1). Dès qu'il est
> donné, **B.1** (fonction pure `coachDayPriority` + tests) est réalisable en **autonomie**, sans
> dépendance ni compte, comme la série P6.
