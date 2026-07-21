# #634 — « À rattraper » : « Forme basse — allège aujourd'hui » exige un check-in daté du jour (build 2.0.243)

**Domaine : coach.** Priorité de nuit = coaching adaptatif. Rotation §4 bis vérifiée **avant de coder**
(`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)`) : 633 `athlete`, 632 `nutrition`, 631
`athlete`, 630 `coach`, 629 `nutrition` → `athlete` et `nutrition` **bloqués** (2× / dans les 2 derniers) ;
`coach` **autorisé** (1× sur 5, absent des 2 derniers). Angle **neuf** : surface `attentionDigest` jamais
traitée, type « champ périmé présenté comme la valeur du jour » + contradiction inter-cartes coach.

## Le défaut (prouvé par lecture)

`attentionDigest` (logic.js) construit l'alerte forme-basse du bandeau « À rattraper » :

```js
// AVANT (logic.js:5363)
const rs = readinessScore(rec.find(r => r && r.date === todayKey) || rec[rec.length - 1] || null);
if (rs && rs.score < 50) items.push({ key: 'readiness', text: `Forme basse (${rs.score}/100) — allège aujourd'hui`, sev: 'high' });
```

Le repli `rec[rec.length - 1]` prend le **dernier** check-in enregistré **sans garde de date** — donc, par
construction, il n'est utilisé que lorsqu'il n'y a **pas** de check-in aujourd'hui. Résultat : tant qu'Adrien
n'a pas fait son check-in du jour, une mauvaise forme vieille de plusieurs jours (ex. `2026-07-14`,
`{sleep:4, fatigue:5, soreness:5}` → readiness 20/100) était affichée en **rouge, priorité high**, avec le
mot « **aujourd'hui** » — alors qu'aucune forme n'a été mesurée aujourd'hui.

**Contradiction inter-cartes prouvée.** `adaptiveCoachFocus`, sur le **même dashboard**, applique déjà la
politique inverse et la **documente** (logic.js:5928-5936) :

```js
// « On exige un check-in DATÉ DU JOUR — une readiness d'hier ne dit rien de la forme d'aujourd'hui. »
const todayR = (Array.isArray(s.recovery) ? s.recovery : []).find(r => r && r.date === todayKey);
const rs = todayR ? readinessScore(todayR) : null;   // null sans check-in du jour
```

Sur une mauvaise nuit vieille d'une semaine : « À rattraper » criait « **Forme basse — allège aujourd'hui** »
(et `coachDayPriority` reframait toute la journée en « récupère »), pendant que « Le focus du moment » juste
en dessous restait muet et poussait « programme une séance ». Deux cartes coach, deux verdicts opposés sur le
même écran, à partir de la même donnée.

## Le correctif (curation §3, zéro champ)

`attentionDigest` s'aligne sur la politique déjà en vigueur dans `adaptiveCoachFocus` : suppression du repli
périmé, la forme-basse « aujourd'hui » n'existe que sur un check-in **daté du jour**.

```js
// APRÈS
const rs = readinessScore(rec.find(r => r && r.date === todayKey) || null);
```

Sans check-in du jour, l'alerte forme-basse se tait ; le **dérèglement de sommeil multi-jours** (nuits courtes
+ coucher irrégulier) reste couvert par la branche `else` `sleepCoachInsight`, qui lit **légitimement**
l'historique — pas une seule nuit périmée. Zéro champ ajouté, purement de la curation.

**Distinct de la proposition #631** (`recuperation-flag-sommeil-absent.md`) : celle-ci vise le flag `fragile`
(`sleep < 6`) recalculé inline dans `app.js`, indépendant de `readinessScore`. `attentionDigest` n'y est pas
mentionné et n'utilise pas ce flag. Le correctif ici ne tranche aucune des 4 décisions en attente de #631 : il
aligne une surface sur un comportement **déjà décidé et commenté** dans le code (adaptiveCoachFocus), pas une
nouvelle politique.

## §4 ter — contrôle de cohérence

Résultat cumulé relu sur état chargé (mauvaise forme périmée + focus sport actif) : le bandeau ne dit plus
« Forme basse — allège aujourd'hui » sur une donnée non datée du jour, et concorde avec « Le focus du moment ».
C'est un **retrait** (une alerte fausse en moins), pas un ajout — l'esprit exact de §3/§4 ter.

## Vérification

`cd src && xvfb-run -a npm run verify` → **100 % vert** : 570 tests (+1 dédié : périmé muet · non-régression
forme du jour · cohérence croisée avec `adaptiveCoachFocus`) + smoke `attentionDigest` **étendu et bloquant**
(check `staleFormGuarded` : périmé sans alerte, forme du jour toujours remontée).

## Versionnage

Build **2.0.243** : bump `package.json`, entrée `CHANGELOG[0]` (😴), 2 assertions `CHANGELOG[0].v`
(logic.test.js + renderer-smoke.cjs `whatsNew`).

Domaine : coach
