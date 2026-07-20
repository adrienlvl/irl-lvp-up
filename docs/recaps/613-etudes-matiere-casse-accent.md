# #613 — Révisions par matière : « Droit » et « droit » ne font plus deux matières (2.0.226)

**Domaine choisi (rotation §4 bis).** Les 5 derniers recaps : coach (#612), nutrition (#611),
athlete (#610, #609, #608). Coach + nutrition sont dans les 2 derniers → **bloqués** ; athlete
apparaît 3× → **bloqué**. La priorité de nuit (coaching à fond) est donc **hors rotation ce tour**
(§3 : la rotation s'applique pleinement au coach — c'est elle qui empêche 2 tours coach d'affilée,
pas une interdiction ; elle prime sur les demandes). J'ai pris un domaine autorisé aligné avec la
**vraie priorité de vie d'Adrien (BTS)** : `etudes`.

## Le manque, prouvé (pas deviné)

Le panneau « 📚 Révisions par matière » (`#studySubjects`, app.js) s'appuie sur `studyBySubject`
(`logic.js`), qui **regroupe les séances d'étude par leur intitulé**. Vérifié dans le code :
l'intitulé vient de **`#studyTitle`**, un **champ texte LIBRE** (`app.js:969` :
`$('#studyTitle').value.trim()`) — Adrien retape la matière à chaque génération de plan.

Sondé par comportement (méthode P5 « mesurer, pas supposer ») :

```
studyBySubject([{title:'Droit',…},{title:'droit ',…}]) → DEUX matières distinctes
```

Conséquence réelle : « Droit »/« droit »/« DROIT » (ou « Éco »/« eco ») produisaient **plusieurs
chips** pour la même matière, l'avancement `done/total` se retrouvait **éclaté en deux compteurs**,
et le « 🎯 À prioriser : … » pouvait pointer sur un **fantôme** (une moitié de matière). Le panneau
ne s'affiche qu'à partir de 2 matières (`subs.length < 2` masque) → une seule vraie matière tapée en
deux casses faisait **apparaître à tort** le panneau.

## Le correctif (curation §3, zéro champ ajouté)

`studyBySubject` regroupe désormais sur une **clé repliée** — minuscule + accents ôtés
(`normalize('NFD')` + `/[̀-ͯ]/`) + espaces normalisés — tout en **affichant le premier
intitulé rencontré**. Seules les variantes **pures de casse/accent/espace** fusionnent : des matières
réellement distinctes (« Droit civil » ≠ « Droit social », ou « Éco droit » ≠ « Droit ») gardent des
clés distinctes. Aucun nouveau champ, aucune surface de texte ajoutée : on **fusionne**, on ne
gonfle pas.

## Contrôle §4 ter (rendu cumulé, relu en entier)

Rendu sur un état chargé façon BTS (Droit×3 casses, Compta×2, « Éco droit »×2 accents, Management) :
4 matières bien distinctes, chaque variante fusionnée, aucun doublon, « À prioriser : Éco droit
(0/2, 1 en retard) » cohérent. « Éco droit » reste séparé de « Droit » (pas de fusion par
sous-chaîne). Lecture claire, non fragmentée.

## Preuves

- Logique pure `studyBySubject` (`logic.js`), test étendu (`logic.test.js`) : fusion 3 casses →
  1 matière + compteurs agrégés + libellé premier-vu **et** non-régression « matières réellement
  distinctes non fusionnées ». Cas existants (répartition, sans-titre, vide) conservés.
- Build **2.0.226** (bump : effet utilisateur réel) ; CHANGELOG en tête + 2 assertions `CHANGELOG[0].v`.
- `xvfb-run -a npm run verify` : **562 tests + smoke OK** (`studySubjects: true`).

Domaine : etudes
