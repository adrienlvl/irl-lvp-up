# #602 — Proposition : « La priorité du jour » — arbitrer les 2 surfaces coach (docs, pas de bump)

**Domaine : coach** · docs (proposition, aucun code, pas de bump).

## Pourquoi une proposition ce tour-ci (et pas du code)

Trois contraintes convergent, comme au #574 :

1. **Quota §4 bis.4 déclenché** — `grep -L` sur les **10 derniers recaps** (#592→#601) : **aucune**
   proposition ; `docs/proposals/` inchangé depuis le #587 (14 boucles). → « l'itération en cours
   **DOIT être une proposition** ». Les 15 dernières boucles ont toutes été du code (coach/athlète en
   rafale) : c'est précisément le motif que le quota vient interrompre.
2. **Rotation §4 bis.3** — les 5 derniers domaines = `athlete · athlete · athlete · athlete · athlete`
   (#601→#597). `athlete` est donc **interdit** (5×, dans les 2 derniers). `coach` **n'apparaît pas**
   dans les 5 derniers (dernier = #591) → domaine **autorisé** pour une proposition à sujet coach.
3. **Priorité de nuit d'Adrien** (« pousse le coaching adaptatif à fond : profondeur, priorisation
   intelligente, quoi faire en premier aujourd'hui ») **croisée** avec §3 (« on améliore le coach en
   **qualité/curation**, pas en volume ; le problème n'est plus ce qu'il **sait** mais ce qu'il **dit
   en premier** »). La demande elle-même prévoit la soupape : « à court d'idées à forte valeur → écris
   dans `docs/proposals/` plutôt que d'inventer du remplissage ».

Les trois pointent au même endroit → `docs/proposals/coach-priorite-du-jour-integree.md`.

## Le fait qui a orienté la proposition (2 pistes réfutées AVANT d'écrire)

Avant de proposer quoi que ce soit, j'ai vérifié dans le code (grep + lecture) que la « profondeur »
demandée n'était pas déjà là. Elle l'est — **deux pistes candidates réfutées** :

- **« Hiérarchiser le rendu coach »** → **existe déjà** : `orderCoachNotes` + `coachNoteUrgency` +
  `COACH_URGENCY_TIERS` (`logic.js:9996-10081`) trient les notes par urgence, verdict figé en tête.
- **« Boucle fermée : le coach mesure si tu as suivi son conseil »** → **existe déjà** : `coachLog` +
  `coachFollowThrough` (`logic.js:7727-7752`) calculent un taux de suivi par pilier.

Idem `attentionDigest` (réactif transversal, `logic.js:5151`), `adaptiveCoachFocus` (proactif
mono-pilier), `intentionFollowThrough`. **Toutes les capacités unitaires de profondeur sont bâties** :
ajouter un 94ᵉ champ serait du volume (interdit §3).

**Le seul manque structurel réel, vérifié** : `attentionDigest` (« À rattraper ») et
`adaptiveCoachFocus` (« Le focus du moment ») sont **rendus côte à côte sur le dashboard par deux
fonctions qui ne se connaissent pas** (`renderAttention` `app.js:164` et `renderCoachFocus`
`app.js:227`, aucun état partagé). Chacune curate **en interne** ; **aucune** ne curate **par rapport à
l'autre** → redondance possible (même pilier deux fois) et surtout **avis en tension possible**
(readiness basse → « allège » dans un bloc, tendance sport en baisse → « relance » dans l'autre), sans
arbitrage. Il n'existe **aucune** synthèse « voici LA priorité du jour et pourquoi » — pile ce que la
demande de nuit réclame (« quoi faire en premier »). C'est le défaut §4 ter (« vert ≠ bon ») transposé
du niveau **phrase** au niveau **carte**.

## Ce que propose le doc

- **Reco : Option B** — une **fonction pure** `coachDayPriority(state, todayKey)` qui réconcilie les
  sorties des deux surfaces : renvoie l'action **n°1** du jour (+ pourquoi), la liste « À rattraper »
  **dédupliquée** de ce que le focus porte déjà, et un `defer` optionnel (« ce que tu peux lâcher
  aujourd'hui »). **Curation pure §3, zéro nouveau champ de données.** Réalisable en étapes autonomes
  façon P6 : B.1 pur + tests → B.2 rendu + dédup + smoke bloquant + contrôle §4 ter → B.3 affinage.
- Options écartées : **A** (statu quo documenté), **C** (fusion des deux blocs — UX majeure, touche
  §3 « ne retire pas de fonctionnalité » → hors autonomie).
- **4 décisions attendent Adrien** en fin de doc (périmètre A/B/C · garder les 2 blocs distincts ·
  afficher `defer` ou non · règle de priorité santé↔momentum).

## Vérif / sécurité

Aucun code touché → `npm run verify` non requis pour un changement docs-only (§2.6 : pas de bump).
Interdictions §3 respectées (aucun champ coach ajouté, aucune feature retirée, aucune dépendance,
pas de tag/release). Suite existante inchangée (538+ tests + smoke restent verts, non ré-exécutés car
zéro fichier de code modifié).

Domaine : coach
