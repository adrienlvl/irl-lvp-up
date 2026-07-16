# Proposition — Que fait le compte à rebours « avant août » une fois août arrivé ?

> Écrit par la boucle autonome (VPS) le **2026-07-17**. Décision réservée à Adrien : le choix
> engage la sémantique du module **Alternance** (priorité de vie n°1, module « sacré » §3) et son
> échéance de motivation. Aucune ligne de code n'a été modifiée — cette itération n'est qu'une
> mise en évidence + options.

## Le problème (déclencheur imminent : dans ~15 jours)

`alternanceDeadline(todayKey)` (`src/lib/logic.js:181`) calcule le **prochain 1er août** et, dès que
`today >= 1er août`, **fait rouler l'échéance à l'année suivante** :

```js
function alternanceDeadline(todayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey || ''))) return null;
  const y = +todayKey.slice(0, 4);
  let deadline = y + '-08-01';
  if (todayKey >= deadline) deadline = (y + 1) + '-08-01';   // ← bascule annuelle
  const days = daysUntil(todayKey, deadline);
  return { date: deadline, daysLeft: days == null ? 0 : days };
}
```

Conséquence concrète, à la date de bascule :

| Jour | `daysLeft` | Affichage héros (`app.js:197`) | Focus du moment (`logic.js:4636`) |
|------|-----------|-------------------------------|-----------------------------------|
| 2026-07-31 | **1** | « J-1 avant août » (classe `urgent`) | « plus que 1 j avant août » |
| 2026-08-01 | **365** | « J-365 avant août » (plus `urgent`) | « plus que 365 j avant août » |

Le compte à rebours qui martèle l'urgence pendant des semaines **s'effondre d'un coup** le
1er août — juste au moment où, si le contrat n'est pas encore signé, la pression devrait être
maximale. « Plus que 365 j avant août » est au mieux déroutant, au pire démotivant, pour une
recherche d'alternance qui, dans la vraie vie, **continue tout l'été** (beaucoup de contrats
démarrent en septembre / octobre).

### Indice : une branche de code déjà morte révèle l'intention d'origine

Le héros de l'onglet Alternance contient déjà (`app.js:194`) :

```js
const dTxt = dl ? (dl.daysLeft <= 0 ? 'C’est le moment !' : `J-${dl.daysLeft} avant août`) : '';
```

La branche `daysLeft <= 0 → « C'est le moment ! »` **ne s'exécute jamais** : à cause de la bascule
annuelle, `daysLeft` vaut toujours ≥ 1. L'auteur d'origine attendait manifestement que le compte à
rebours **atteigne zéro** (« C'est le moment ! »), et la bascule a été ajoutée ensuite sans
réconcilier les deux. Il y a donc un désaccord réel entre le rendu voulu et le comportement de la
fonction.

## Ce qui n'est PAS proposé

- Toucher au comportement **avant** le 1er août (aujourd'hui → 31 juillet) : il est correct et
  motivant, on n'y touche pas.
- Décider seul du bon comportement après le 1er août : c'est précisément la question posée à Adrien.

## Options

### A. Ne plus faire rouler — laisser le compteur atteindre 0, puis « C'est le moment ! »
`alternanceDeadline` ne bascule plus ; `daysLeft` descend à 0 le 1er août, puis passe négatif.
- Héros : la branche morte `daysLeft <= 0 → « C'est le moment ! »` **reprend vie** telle quelle.
- Focus du moment : remplacer « plus que N j avant août » par « C'est le mois clé — postule
  aujourd'hui » quand `daysLeft <= 0` (sinon on afficherait « plus que -3 j »).
- **Simple, colle à l'intention d'origine.** Risque : après un certain temps sans succès, « C'est le
  moment ! » perpétuel perd de sa force ; à cadrer avec une éventuelle sortie (voir E).

### B. Repousser l'échéance à la vraie fin de saison (ex. 1er octobre) tant qu'on est dans l'été
La cible n'est pas « août » mais « la rentrée » : viser le **1er octobre** (ou une date qu'Adrien
fixe), et ne faire rouler à l'an prochain qu'une fois cette date passée.
- Le compte à rebours reste **honnête et non nul** pendant tout l'été, quand chercher a encore un
  sens.
- Demande de changer le libellé (« avant la rentrée » plutôt que « avant août »).
- **Le plus fidèle à la réalité du calendrier alternance.** Risque : choisir la date « rentrée » est
  un arbitrage personnel (dépend des entreprises visées).

### C. Garder la bascule annuelle, mais changer le libellé au passage
Ne rien changer à la logique ; quand `daysLeft` est « grand » (p. ex. ≥ 300, donc on a dépassé
août), afficher « Saison suivante : août AAAA » plutôt que « J-365 avant août ».
- Le moins invasif.
- Ne résout pas le fond (l'urgence retombe quand même le 1er août).

### D. Rendre la date cible **configurable** dans les Réglages
Un champ « échéance de ma recherche » (défaut : prochain 1er août) qu'Adrien ajuste.
- Le plus flexible et le plus pérenne.
- Le plus de travail (UI + persistance + normalisation) ; à réserver si Adrien veut vraiment piloter
  ça lui-même.

### E. (complément à A/B) Message de bascule le jour J
Le 1er août (ou à la date cible), un ton dédié : « Le cap d'août est là. Le contrat n'est pas encore
signé ? On ne lâche pas — les places de septembre se jouent maintenant. » Transforme la date en
relance plutôt qu'en compteur qui s'effondre.

## Recommandation

**B (viser la rentrée, ~1er octobre) + E (message de bascule)**, avec **A comme repli minimal** si
Adrien veut le plus petit changement possible.

Raison : la recherche d'alternance ne s'arrête pas au 1er août dans la vraie vie, et le compte à
rebours doit rester un allié honnête tout l'été plutôt que de se réinitialiser à « J-365 » pile au
moment le plus tendu. B garde un compteur crédible ; E remplace l'effondrement par un coup de fouet.
A seul (relancer la branche « C'est le moment ! » déjà écrite) est un correctif d'une ligne côté
logique + une ligne côté focus, si l'on veut aller au plus sûr.

## Portée technique (pour situer l'effort, si Adrien tranche)

- **1 fonction pure** à ajuster : `alternanceDeadline` (`logic.js:181`) — plus tests (`logic.test.js`
  couvre déjà la bascule du 1er août : `alternanceDeadline` lignes ~594-598, à mettre à jour).
- **2 points de rendu** : héros `renderAlternance` (`app.js:194/197`) et `adaptiveCoachFocus`
  (`logic.js:4636`). Le check smoke `alternance` (`renderer-smoke.cjs:707`) asserte
  `alternanceDeadline('2026-07-16').date === '2026-08-01'` — inchangé par A/B/E (dates avant août),
  mais à revérifier.
- Zéro nouvelle dépendance, zéro donnée perso, aucune feature retirée. Compatible avec les garde-fous
  §3. Un bump de version + entrée CHANGELOG seront nécessaires (effet utilisateur visible).

## Décision attendue d'Adrien

Choisir A / B / C / D (+ E ?) et, pour B, la date cible de « rentrée ». La boucle autonome pourra
alors l'implémenter en UNE étape sûre, tests + smoke verts, sans rien casser du module Alternance.
