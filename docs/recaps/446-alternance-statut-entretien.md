# 446 — Alternance : « refusé/accepté après entretien » = état terminal (2.0.78)

**Boucle #446 · build 2.0.78 · domaine Alternance (💼, sacré) · correctness (§4.4)**

## Le manque (vérifié avant de coder)

`jobStatusFromText(t)` (`logic.js:296`) mappe un libellé de statut FR libre → l'une des 6 étapes du
pipeline alternance. Il est **partagé par tous les imports** (saisie manuelle + sync Google Sheets)
et alimente `applicationStats` (`logic.js:242`, funnel + `entretiens`/`accepted`/`responseRate`) ainsi
que `mergeApplications` / `rankOf` (`logic.js:1027`, protection anti-régression au re-sync).

L'ordre des tests était piégeux : `entretien` (l. 300) était évalué **avant** les refus (l. 306
négation, l. 308 mot-clé) et l'accepté (l. 307). Or `.test()` renvoie au premier match : dès qu'un
statut contenait le mot « entretien », il l'emportait sur le refus/l'accepté.

**Conséquence (outputs vérifiés sous node, avant fix) :**

- `"Refusé après entretien"` → `entretien` (attendu `refus`)
- `"Non retenu à l'entretien"` → `entretien` (attendu `refus`)
- `"Retenu après entretien"` → `entretien` (attendu `accepte`)

C'est **exactement la même classe de bug** que la garde déjà documentée pour « non retenu » vs
`accepte` (l. 301-305) : une tournure terminale ne doit pas être avalée par une règle intermédiaire
plus « active ». Impact concret : la candidature restait bloquée en colonne **Entretien** du funnel,
gonflant à tort `entretiens` (entretiens en cours) ; pire, `rankOf` place `entretien` (rang 3) sous
`refus` (rang 5) → au re-sync, une candidature réellement refusée ne pouvait **jamais** régresser
hors de la colonne entretien.

Trou de couverture : `logic.test.js` (l. 738-755) testait beaucoup de tournures « non retenu » mais
**aucune** combinée à « entretien » → cas entièrement non exercé.

Candidat trouvé par un audit frais de `logic.js` (hors famille « legacy w.exercise », close #440→#444).

## Le correctif

Déplacer le test `entretien` **après** les états terminaux (refus négation, accepté, refus mot-clé).
La négation reste avant `accepte` (garde existante « non retenu »). Un refus/accord « après entretien »
est ainsi lu comme état FINAL, un entretien À VENIR reste un entretien.

```js
if (/\b(non|pas)\b[\s\S]{0,12}retenu/.test(x)) return 'refus';
if (/accept|retenu|pris|embauch/.test(x)) return 'accepte';
if (/refus|negati|decline|abandonn|ecart|sans suite/.test(x)) return 'refus';
if (/entretien|entrevue/.test(x)) return 'entretien';   // ← déplacé APRÈS les terminaux
```

Rétro-compatible : un statut purement « entretien » (« Entretien », « Entretien prévu mardi ») ne
matche aucun terminal → toujours `entretien`. Aucune régression sur les autres cas testés (tous verts).

## Tests

- **logic.test.js** (`jobStatusFromText`) : +4 assertions — `"Refusé après entretien"` → `refus`,
  `"Non retenu à l'entretien"` → `refus`, `"Retenu après entretien"` → `accepte`,
  `"Entretien prévu mardi"` → `entretien` (le cas à-venir ne régresse pas).
- Pure logique (pas de rendu) : couverture par `logic.test.js`, le check smoke `alternance` /
  `altStatusRefresh` reste vert. **444 tests + smoke 100 % vert.**

`cd src && xvfb-run -a npm run verify` → **OK** (`alternance:true`, `altStatusRefresh:true`).

## Suite

Module Alternance : robustesse du mapping de statut renforcée sans rien casser (Adrien : priorité
alternance avant août). Piste voisine repérée au même audit mais **non traitée** (confiance ~55 %,
choix de design possible) : `"Pas encore postulé"` → `postule` (l. 309) au lieu de `a_postuler`
(le motif `a postuler` de la l. 298 exige l'espace exact) — à reconfirmer/trancher avant de coder,
car élargir le motif risque des faux positifs.
