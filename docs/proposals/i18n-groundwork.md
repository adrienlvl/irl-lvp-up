# Proposition — Amorce d'internationalisation (i18n)

_Rédigé le 2026-07-19 · statut : ✅ **VALIDÉ par Adrien le 2026-07-19 — recommandation = NE RIEN FAIRE (option D)**_

> ⛔ **Valider ce document, c'est acter qu'on n'amorce PAS l'i18n.** L'app reste l'outil perso d'Adrien ; l'extraction coûterait cher pour zéro service, et le vrai piège (phrases pré-composées dans `logic.js`) resterait entier. À rouvrir seulement s'il veut publier hors francophonie.

## 1. Problème

L'app est **exclusivement en français**, en dur :

- `index.html:2` — `<html lang="fr">` ;
- des **milliers de littéraux FR** dans `src/lib/logic.js` et `src/app.js` ;
- le français est **structurel**, pas seulement dans les libellés : constantes (`WEEKDAY_FR`
  `logic.js:9426`), fonctions de formatage (`monthLabelFr` `logic.js:2259`), et surtout des
  **phrases pré-composées** (coach, salutations, allures) assemblées dans la logique pure ;
- **aucune infrastructure** : pas de `t()`, pas de catalogue, pas de notion de locale.

C'est la faiblesse n°6 de l'audit 2.0 : ça ferme l'app à tout non-francophone.

**Soyons honnêtes sur l'urgence** : l'app est un outil **personnel** pour toi, et l'audit séquence
l'i18n « en continu, en parallèle » — c'est-à-dire **dernière**. Cette proposition existe parce qu'elle
était listée en P1, pas parce que je pense qu'il faut la faire maintenant. **Si tu ne prévois pas de
partager l'app hors francophonie, la bonne réponse est « on ne fait rien ».**

## 2. Le vrai piège technique

Ce n'est pas l'extraction des libellés qui est dure, c'est que **`logic.js` renvoie des phrases déjà
composées**. Exemple typique du coach : une note construite par concaténation, avec accords, chiffres
insérés et ponctuation — impossible à traduire par simple substitution de clé, parce que la **grammaire
de la phrase** (ordre des mots, accords, pluriels) est propre à la langue.

Autrement dit : une i18n honnête suppose de **déplacer la composition des phrases vers la couche de
rendu**, en faisant remonter des **données** depuis `logic.js` (`{type:'sleepShort', hours:5}`) plutôt
que du texte. C'est un refactor de fond, bien plus large qu'un catalogue de chaînes.

Autre contrainte dure : **les tests et le smoke comparent la sortie FR exacte**. Le chemin français
doit rester **strictement identique**, octet pour octet, sinon 517 tests tombent.

## 3. Options

| | Option | Portée |
|---|---|---|
| **A** | **Amorce bornée** — helper `t(key)` minimal + catalogue FR + extraction d'**une seule tranche** de libellés **statiques** de la couche de rendu (nav, réglages). | Petit, sûr, réversible. Prouve le concept sans toucher aux phrases composées. |
| **B** | **Extraction totale** des milliers de littéraux d'un coup. | Diff énorme, risque de régression maximal, revue impossible. À écarter. |
| **C** | **Outil d'extraction au build**. | Suppose un bundler (voir `es-modules-split.md`) et ne règle pas le problème des phrases composées. |
| **D** | **Ne rien faire** — l'app reste FR. | Coût nul. |

## 4. Recommandation — **D pour l'instant ; A si tu veux amorcer**

Tant que l'app est ton outil personnel, **D** est la réponse rationnelle : l'i18n coûterait cher et ne
te rendrait aucun service aujourd'hui.

Si tu veux quand même poser une base (par exemple parce que tu envisages de publier sur les stores un
jour) : **A**, strictement limitée aux **libellés statiques de la couche de rendu** — jamais aux
phrases composées de `logic.js`, qui appellent le refactor décrit au §2 et doivent rester hors périmètre
d'une amorce.

## 5. Risques

- **Diff massif** si on dérape vers B : irrevuable, et deux écrivains sur `master`.
- **Régression silencieuse du FR** : toute reformulation casse les tests/smoke qui comparent le texte
  exact — ce qui est une **bonne** chose (le filet fonctionne), mais impose de ne rien reformuler.
- **Demi-mesure durable** : une amorce jamais poursuivie laisse deux styles dans le code (des `t()` par
  endroits, des littéraux ailleurs) — c'est un coût réel, à accepter en connaissance de cause.

## 6. Ce qui dépend d'Adrien

1. **Veux-tu l'anglais un jour ?** Si non → on ferme ce sujet et on retire P1.6 de la roadmap.
2. Si oui : **maintenant une amorce (A)**, ou **plus tard, en une fois**, quand le besoin sera réel ?
3. Si amorce : quelle **tranche pilote** ? (ma reco : libellés de navigation + page Réglages)
