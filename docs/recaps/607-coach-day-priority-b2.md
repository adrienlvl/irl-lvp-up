# #607 — Coach « La priorité du jour » B.2 : branchement au rendu (dédup + recadrage), build 2.0.221

_Boucle #607 · 2026-07-20 · Domaine : coach_

## Contexte — feu vert d'Adrien, étape B.2

`docs/DEMANDES.md` → « En cours » : **Coach Priority**, périmètre **B** de la proposition #602
(feu vert « T'as l'autorisation pour Coach Priority », 2026-07-20 22:31). B.1 (#606) a livré la
**fonction pure** `coachDayPriority` + 6 tests, **non branchée**. Cette itération livre **B.2** :
le **branchement au rendu** des deux surfaces coach du dashboard, avec **check smoke bloquant** et
**contrôle §4 ter** (rendu cumulé relu sur état chargé). C'est ici que le **bump** a lieu (effet
utilisateur). Cette demande prime sur le backlog §4 ; feu vert explicite + étape prévue de la série.

## Ce qui a été fait — `app.js` (rendu branché sur `coachDayPriority`)

Un helper `coachDayPriorityNow()` calcule l'arbitrage **au même instant et avec le même focus**
(`adaptiveCoachFocus` + `nowMinutes`) pour les deux rendus, garantissant une dédup **cohérente** :

- **`renderCoachFocus`** affiche désormais `dp.primary` (la n°1 **arbitrée**) au lieu du focus brut.
  Cas normal → `primary` de source `'focus'` = mêmes champs qu'avant (aucun changement visible). Cas
  **forme basse (readiness `high`) VS focus sport qui pousse** → la carte se **recadre** en
  « 😴 Priorité du jour : récupère » (source `'health'`, `reframed`), la séance attendra. Le pilier
  **journalisé** (`coachLog`) reste calé sur `adaptiveCoachFocus` (`f.pillar`) → `coachFollowThrough`
  **non faussé** (non-régression préservée, exigée par la proposition §4).
- **`renderAttention`** affiche `dp.deduped` : « À rattraper » **débarrassé** du pilier déjà porté par
  la carte focus (plus de doublon) et de l'item promu en n°1. **Garde-fou anti-sur-curation** : la
  dédup n'est appliquée que si la carte focus est **réellement affichée** (`primary.source !== 'digest'`) ;
  sinon (pas de focus proactif) on retombe sur `attentionDigest` **complet**, pour ne jamais faire
  disparaître un item promu qui ne serait visible nulle part.

**Curation pure §3 : zéro champ de données ajouté.** On retire (dédup) et on hiérarchise (n°1). Les
classes de ton coach (`coach-<tone>`) sont inertes côté CSS → le recadrage ne change que le **texte**.

### Curation §4 ter appliquée (rendu cumulé relu)
En rendant le cas recadré sur un **état chargé** (forme basse + sport qui s'essouffle), la carte
d'origine de B.1 répétait « allège **aujourd'hui** » puis « **Aujourd'hui**, **alléger** prime sur
relancer **entraînement** » (double « aujourd'hui », double « alléger », grammaire bancale du label).
Le `why` de la branche santé de `coachDayPriority` a été **resserré** en
« *Récupérer fait plus progresser que forcer une séance.* » — non redondant, grammatical, ton RPG
honnête. (Aucun test n'asservit ce `why` ; les 6 tests B.1 restent verts.)

## Vérification
- **Nouveau check smoke bloquant `coachDayPriority`** (`renderer-smoke.cjs`) : volet logique (dédup
  d'un item sport porté par le focus ; recadrage forme basse→n°1 « récupère », `deduped` vidé) **+**
  volet **rendu** sur état chargé (la carte affiche « récupère », « À rattraper » ne répète plus
  « Forme basse »), avec sauvegarde/restauration de l'état global.
- `cd src && xvfb-run -a npm run verify` → **558 tests + smoke 100 % vert**.

## Versionnage
Build **2.0.221** (bump : effet utilisateur). CHANGELOG en tête de `logic.js` (entrée 🧭) + les 2
assertions `CHANGELOG[0].v` (logic.test.js `whatsNew` + renderer-smoke `whatsNew`).

## Décisions Adrien encore ouvertes (proposition §5, décisions 3-4)
B.2 implémente la **reco par défaut** ; ajustable en **B.3** :
- **Déc. 3** — le `defer` (« ce que tu peux lâcher aujourd'hui ») est **calculé** mais **toujours pas
  affiché** (une ligne de plus à l'écran — arbitrage §4 ter). Objet de B.3.
- **Déc. 4** — la santé prime **dès `readiness < 50`** (seuil du digest `high`) ; la variante
  « seulement au-delà d'un seuil » reste un réglage B.3.

## Suite
- **B.3** (dernière étape) : affinage du `defer` (affichage éventuel, seuils) selon les décisions 3/4
  d'Adrien — étape **optionnelle** qui dépend de ses réponses. Le cœur de la demande (arbitrage + dédup
  + « quoi faire en premier ») est **livré et visible** à partir de ce build.

Domaine : coach
