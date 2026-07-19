# 551 — « pris » ne vaut plus acceptation tout seul : le fix #446 était incomplet (2.0.182)

> Rotation respectée : #549 `a11y` → #550 `alternance` → #551 `robustesse`.

## Comment la cible a été choisie

Cette session a heurté **trois** pièges de sous-chaîne coup sur coup (`repos` dans « cerveau
repos**é** », `blessure` en incise, plus le `pris`/« entre**pris**e » de #446). Ce n'est pas une
coïncidence : **du français analysé par regex non ancrée**, c'est la classe de bug récurrente de ce
dépôt. J'ai donc audité les classifieurs de texte plutôt que d'attendre le prochain incident.

## Le bug : le fix #446 n'avait réglé qu'un cas sur cinq

`jobStatusFromText` (`logic.js:304`) testait `/accept|retenu|\bpris|embauch/`. Le passage de `pris` à
`\bpris` (fix #446) réglait bien « entre-**pris**-e » — mais **`\bpris` matche aussi `prise`**, et
laissait donc passer :

| Texte saisi | Classé AVANT | Correct |
|---|---|---|
| « **Prise de contact** avec le cabinet » | ❌ `accepte` | `postule` |
| « J'ai **pris contact** par mail » | ❌ `accepte` | `postule` |
| « **Pris en compte**, réponse sous 15 j » | ❌ `accepte` | `postule` |
| « **Rendez-vous pris** pour mardi » | ❌ `accepte` | `postule` |
| « Candidature in**accept**able » | ❌ `accepte` | — |

Ce sont des formulations **parmi les plus courantes** d'une recherche d'alternance. Chacune marquait
la candidature comme **offre décrochée**, gonflant l'entonnoir et `applicationStats` (taux de réponse,
nombre d'acceptations) — **automatiquement, à chaque sync du Google Sheets**, sur le module qui est la
priorité de vie d'Adrien. C'est exactement le dommage que le commentaire du fix #446 disait vouloir
éviter.

## Le correctif

- **`pris` exige désormais une tournure d'acceptation** : `/\b(?:ete|suis|est|etes|sommes|sont)\s+prise?s?\b/`
  (« j'ai été pris », « je suis prise ») au lieu de se fier au mot seul.
- **`\baccept`** au lieu de `accept` : la frontière de mot tombe après « in », donc
  « in-accept-able » ne matche plus. Idem `\bretenu`, `\bembauch`.
- Les quatre formulations ci-dessus rejoignent **`postule`** : le contact **est** établi — ce n'est ni
  un « à postuler », ni une acceptation.

## Une attente existante préservée, PAS renversée

Le test du fix #446 documentait « **Candidature prise** » → `accepte`. Ma règle plus stricte la
faisait basculer en `postule`. **Je ne renverse pas une décision documentée au passage** : le cas est
conservé par un motif explicite.

> ⚠️ **À trancher par Adrien** : « candidature prise » est ambiguë — elle peut vouloir dire « offre
> décrochée » comme « candidature bien reçue ». C'est lui qui écrit ces cellules ; s'il entend « bien
> reçue », il faut la déplacer vers `postule`.

## Vérifs

- **519 tests** + smoke verts. Nouveau test verrouillant les 4 faux positifs, les vraies acceptations
  (« été pris », « suis prise », « retenue », « embauché ») **et** toutes les non-régressions
  historiques (#446 « entretien en entreprise », « non retenu », « pas été retenue », « refusé après
  entretien »).

## Fichiers

- `src/lib/logic.js` — `jobStatusFromText` durci + CHANGELOG 2.0.182.
- `src/test/logic.test.js` — test de régression #551.

Domaine : robustesse
