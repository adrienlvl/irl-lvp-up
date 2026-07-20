# #586 — Docs : le résumé CAP 3.0 ne dit plus « Coaching GELÉ » (le gel a été REFUSÉ)

_2026-07-20 · domaine `docs` · pas de bump (docs seuls)_

## Contexte de l'itération

**Priorité de nuit #1** (`docs/DEMANDES.md`) : pousser le coaching adaptatif à fond. Mais la
**rotation des domaines** (§4 bis.3) la **bloque ce tour** : le dernier recap #585 est `coach`, et
`coach` apparaît 2× dans les 5 derniers (#585, #582). §3 rappelle explicitement que « la rotation
s'applique PLEINEMENT au domaine coach » et que la demande de nuit ne prime **jamais** sur §3 — donc
**code coach ET proposition taguée coach sont bloqués** ce tour (lecture mécanique : tagger un recap
`coach` alors que #585 l'est déjà serait une violation directe de §4 bis.3). C'est exactement ce que
#583 et #584 ont documenté pour leur propre tour (« priorité de nuit rotation-bloquée »).

État du backlog vérifié avant de choisir :

- **P1–P7 tous cochés** (backlog nommé clos).
- Chantiers Cap 3.0 restants = **supervisés** (IndexedDB) ou **tranchés en attente** (sécurité #574,
  sync #581) — rien d'autonome sûr à coder.
- **Familles de bugs purs épuisées** : spot-check de la surface numérique nutrition/énergie/poids
  (`weightForecast`, `weightMilestones`, `weightGoalProgress`, `energyPlan`, `paceStatus`,
  `upsertWeight`, `upsertMeasurement`, `calorieAdjustment`) → toutes robustes, gardes et arrondis déjà
  rationalisés, aucun faux positif construit. Confirme la mémoire (`backlog-leads-distinct-days-legacy`).

Domaines **autorisés** ce tour (hors des 2 derniers, ≤ 1× sur 5) : `docs` (#583, 1×) et tous les
absents. J'ai pris `docs` sur un **manque réel repéré en lisant la roadmap**, pas une catégorie ouverte.

## Le problème (prouvé)

Le résumé de tête « 🧭 CAP 3.0 » de `docs/ROADMAP.md` disait, ligne 17 :

> 1. 🤖 **Coaching adaptatif** — ✅ **terminé et GELÉ** le 2026-07-19 (voir « État actuel »).

Or **le gel a été REFUSÉ** par Adrien. Quatre sources concordantes le disent :

- `docs/proposals/coach-freeze.md:3` — « statut : ✅ TRANCHÉ par Adrien le 2026-07-19 — gel **REFUSÉ** »,
  « améliore toujours le Coach, c'est important ».
- `docs/ROADMAP.md:585-597` (l'« État actuel » que la ligne 17 dit d'aller voir) — « Adrien **tient au
  coach** et **refuse le gel dur** : on continue à l'améliorer, mais en qualité ».
- `docs/ROADMAP.md:630` (tableau P1.1) — « Gel refusé → qualité, pas volume … le coach reste un domaine
  **comme les autres**, soumis à la rotation ».
- `docs/VPS-AUTOPILOT.md §3` — le coach « compte, donc on continue à le travailler », gel remplacé par
  « qualité, pas volume ».

**Danger concret** : le résumé de tête est ce qu'on lit **en premier** (et parfois **seul**). Un futur
agent autonome — ou Adrien — qui s'y arrête pouvait conclure « coaching terminé et gelé, on n'y touche
plus » et **refuser tout travail coach**. C'est l'**exact inverse** de la priorité de nuit en cours
(« pousse le coaching à fond »). Même classe de bug documentaire que **#583** : une ligne de synthèse
qui **contredit** la décision détaillée qu'elle est censée résumer.

## Le correctif

Ligne 17 reformulée, alignée mot pour mot sur l'« État actuel » (l. 585-597) et le tableau P1.1 (l. 630) :

> 1. 🤖 **Coaching adaptatif** — ✅ **base livrée (Vague 1)** ; reste un **chantier vivant en QUALITÉ,
>    pas en volume** (arbitrage d'Adrien du 2026-07-19 : gel **refusé** — cf. `proposals/coach-freeze.md`),
>    **soumis à la rotation des domaines comme les autres** (voir « État actuel » + VPS-AUTOPILOT §3).
>    _Ne pas lire « gelé » : le coach continue de se travailler, à son tour._

Balayage de contrôle : `grep -ri "gelé"` sur `docs/*.md` + `docs/proposals/*.md` → **plus aucune** autre
occurrence trompeuse (les « gel dur / gel refusé » restants sont corrects). `AUDIT-ET-ROADMAP-3.0.md`
ne dit pas « gelé » (l. 89 neutre). L'incohérence était **unique** à cette ligne.

## Vérification

Docs seuls, aucun code / test / smoke touché → pas de `verify` requis (§2.6, précédents
#574/#577/#580/#581/#583), pas de bump. Aucune donnée personnelle, aucune dépendance, aucune règle §3
réécrite (on corrige un **résumé** pour qu'il colle à la règle, on ne change pas la règle).

Domaine : docs
