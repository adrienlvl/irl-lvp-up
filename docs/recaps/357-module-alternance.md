# #357 — Module « Recherche d'alternance » (tranche 1) (2.0.1)

## Demande d'Adrien

> « Ajoute quelque chose qui me permet d'être motivé à rechercher une alternance… le but c'est de
> vraiment me pousser à postuler aux entreprises. » Précision : **motivation quotidienne, avant août**.

Le Google Sheets partagé n'est pas lisible anonymement (401 — bon signe côté sécurité) → suivi
**natif** dans l'app + (à venir) import CSV, plutôt qu'une intégration OAuth (moins de surface).

## Tranche 1 livrée

Nouvel onglet **💼 Alternance** (`pageGroups.alternance`), pensé pour **pousser à postuler chaque jour**.

- **Fonctions pures** (`lib/logic.js`) : `normalizeApplication`, `alternanceDeadline` (prochain 1er
  août), `applicationStats` (candidatures du jour / semaine vs objectif, **série de jours consécutifs**,
  funnel par statut, taux de réponse, **relances à faire**). Statuts : à postuler → postulé → relancé
  → entretien → accepté → refusé.
- **Hero motivation** : ⏰ **compte à rebours avant août** (urgent ≤ 21 j), « as-tu postulé
  aujourd'hui ? », **objectif hebdo** ajustable (barre), **série 🔥**, stats (envoyées, entretiens,
  taux de réponse).
- **Suivi** : ajout d'une entreprise, bouton **« 📤 J'ai postulé »** (→ statut+date+**XP**+toast, série
  qui vit), sélecteur de statut, suppression **avec annulation**. **Rappels de relance** (postulé
  depuis ≥ 7 j sans suite).
- `state.applications` + `jobSearchGoal` (bornés dans `normalizeState`).

## Vérification navigateur (flux réel)

4 candidatures seedées → hero : « ⏰ J-16 avant août · ✅ Tu as postulé aujourd'hui · 🎯 2/5 ·
🔥 2 jours d'affilée · 📤 3 envoyées » ; relance « Groupe Martin J+10 » ; clic « J'ai postulé » →
statut=postulé, date=aujourd'hui, toast « Candidature envoyée · 🔥 2 jours d'affilée ». ✅

## Tests

373 tests `node:test` (normalizeApplication, alternanceDeadline, applicationStats : aujourd'hui/
semaine/série/relances/taux, tolérance hier, vide → 0) + smoke `alternance` **bloquant** (fonctions +
onglet + flux réel « J'ai postulé »).

## Reste (tranche 2, avant de rendre la main à Adrien)

- **Nudge sur l'accueil** (« À rattraper ») : « Pas encore postulé aujourd'hui » — pour la pousse
  quotidienne dès l'ouverture.
- **Import CSV** depuis son Google Sheets.

## Contexte

Hors rotation (demande directe d'Adrien). Build **2.0.1**. La boucle reste **en pause** — Adrien
a demandé le module complet puis son feu vert avant d'entamer la 3.0.
