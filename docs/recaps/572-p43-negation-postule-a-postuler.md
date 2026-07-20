# #572 — P4.3 : « pas encore postulé » n'est plus classé « postulé » (funnel Alternance) (2.0.195)

**Domaine : robustesse** (lignée regex-classification #446 / #551 / #569, même fonction `jobStatusFromText`).

## Rotation §4 bis (contrôle AVANT de coder)

Les 5 derniers recaps (par n°) : `571 a11y · 570 coach · 569 robustesse · 568 athlete · 567 coach`.
- `coach` (priorité de nuit, DEMANDES.md) : dans les 2 derniers (#570) **ET** 2× dans les 5 (#570, #567)
  → **interdit** (§3 : la rotation prime même sur la demande de nuit ; arbitrage d'Adrien du 2026-07-19
  « qualité pas volume », la rotation s'applique **pleinement** au coach).
- `a11y` : dans les 2 derniers (#571) → **interdit**.
- `robustesse` (#569) : hors des 2 derniers, **1×** dans les 5 → **autorisé**.

→ Je sers la **2ᵉ demande d'Adrien** (avancer CAP 3.0 / qualité) avec une tâche **nommée** : **P4.3**
(« Balayage du reste de `logic.js` » à la chasse aux regex non ancrées sur du texte FR saisi).

## Vérification de la piste (§2.3) avant de coder

Balayage des regex de classification de texte FR (`grep .test(/.match(`). Les deux classificateurs de
texte libre du fichier sont `jobStatusFromText` (statut Alternance) et `warmupFor`/`cooldownFor`
(déjà traités P4.2/#568). `exerciseZones` est un **lookup exact** (`EXERCISE_ZONES[name]`, pas de regex)
et les autres `.includes` sont des recherches de sous-chaîne intentionnelles (champs de recherche).

Sur `jobStatusFromText`, la piste mémoire (`backlog-leads-distinct-days-legacy`, audit #446) signalait
un faux positif **non traité** : `"Pas encore postulé"` → `postule` au lieu de `a_postuler`. **Prouvé**
en rejouant la fonction :

```
Pas encore postulé      → postule   (attendu a_postuler)
pas postulé             → postule   (attendu a_postuler)
Pas encore envoyé       → postule   (attendu a_postuler)
candidature non envoyée → postule   (attendu a_postuler)
```

Motif P4 exact : le verbe d'action (`postule`/`envoye`, seau `postule` l.343) est capté **à l'intérieur
d'une négation** qui l'inverse. `jobStatusFromText` ne s'applique QU'À la colonne de statut dédiée
(`iStatus` = statut/status/etat/reponse — pas les notes libres), et « pas encore postulé » y est une
formulation **ultra-courante** pour une cible repérée mais pas encore candidatée. Comme la sync Google
Sheets rejoue le classement à **chaque** synchro, la candidature basculait en « Postulé » dans le funnel
et gonflait `applicationStats` (answered / responseRate) — sur le module **sacré** d'Adrien 💼.

## Le fix

Un garde **avant** le seau `postule`, **après** les états terminaux/avancés (refus/accepté/entretien/
relance conservent la priorité, cf. philosophie #446/#569) :

```js
if (/\b(?:pas|non|jamais)\b[\s\S]{0,12}(?:postul|envoy)/.test(x)) return 'a_postuler';
```

Choix de périmètre (méthode P4, ne pas sur-élargir) :
- **Seuls** les verbes d'action de candidature `postul`/`envoy`. `candidat` est écarté (ambigu :
  « pas un bon candidat » = refus, pas une candidature à envoyer) et `retenu` relève du refus
  (« pas (été) retenu », déjà capté l.312).
- Négation **collée** au verbe (fenêtre {0,12} : « pas encore postulé »).
- L'**ordre** protège le positif : « postulé, pas de nouvelles » garde « postulé » (le « pas » est
  APRÈS le verbe, la regex ne le trouve pas avant `postul`/`envoy`).

## Non-régression (prouvée)

`Postulé le 12/03` → postule · `Postulé, pas de nouvelles` → postule · `2e relance envoyée` → relance ·
`candidature envoyée puis refusée` → refus · `Pas retenu` / `Vous n'avez pas été retenu` → refus.
17/17 cas verts au rejeu ciblé.

## Contrôle §4 ter

**Aucun texte visible ajouté** : le fix ne change qu'à quelle **colonne** du funnel une candidature est
rangée (labels inchangés). Pas de nouvelle prose → §4 ter sans objet côté rédaction ; l'effet
utilisateur (entonnoir plus juste, taux de réponse non gonflé) justifie un **bump** (précédents #569).

## Traces

- `logic.js` : garde négation dans `jobStatusFromText` + entrée `CHANGELOG` 2.0.195.
- `logic.test.js` : nouveau test « une NÉGATION de l'action de candidater = à postuler » (11 assertions,
  faux positifs + non-régression positifs/terminaux) + assertion `CHANGELOG[0].v`.
- `renderer-smoke.cjs` : assertion `whatsNew` → 2.0.195.
- `package.json` : 2.0.194 → 2.0.195.

**verify 100 % vert : 529 tests `node:test` + smoke Electron.**

Domaine : robustesse
</content>
</invoke>
