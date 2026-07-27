# 708 — Agenda : la journée entière, formulaire, sélecteur de vue, réglages

## Contexte

Quatre retours d'Adrien, précis, sur la page Agenda :

1. « J'ai une vision uniquement jusqu'à 18h sur la page, pas de toute la journée jusqu'à 00h »
2. « le menu défilant, les données que je veux mettre (ajouter bloc, heure, jour, durée, etc) c'est moche »
3. « le changement Aujourd'hui / vue mois peut être amélioré niveau design »
4. « Importer google / apple et Bilan PDF devraient être dans un menu réglages de l'onglet Agenda »

## 1. La grille se collait aux événements

La plage horaire était calculée à partir du premier et du dernier bloc :

```js
let gStart = tous.length ? floor(min(starts)/60)*60 : 8*60;
let gEnd   = tous.length ? ceil(max(ends)/60)*60   : 20*60;
```

Une journée dont le dernier bloc finit à 18 h produisait donc une grille qui **s'arrête à 18 h**.
Non seulement la soirée n'existait pas visuellement, mais il n'y avait **nulle part où cliquer**
pour poser un bloc à 21 h — la grille étant aussi la zone de création.

Elle couvre maintenant **6 h → minuit**, étendue plus tôt si un bloc commence avant, en vue jour
**comme** en vue semaine. Le prix : 18 heures × la hauteur d'heure ≈ 800–920 px. D'où un défilement
interne (`.dg-scroll`, `.wt-scroll`) : la page ne s'allonge pas, la grille défile dans son cadre.

Et elle s'ouvre **sur le premier bloc réel**, pas sur six heures de vide.

## 2. Le formulaire : dix champs nus

`#weekQuickAdd` alignait dix `<input>` sans étiquette, avec des placeholders pour seule indication —
qui disparaissent dès qu'on tape. Séparé en deux : l'essentiel visible (**Quoi ? · Jour · Heure ·
Durée · Type** + le bouton), le reste replié sous « Plus de détails » (priorité, lieu, trajet,
notes, journée entière).

## 3. Trois vues, deux contrôles

« Jour » et « Semaine » vivaient dans un sélecteur ; « Vue mois » était un bouton perdu dans la
barre d'outils, entre l'import et le PDF. Les trois vues d'un même agenda, réparties sur deux
contrôles de nature différente. C'est maintenant un seul segmenté : **Jour · Semaine · Mois**.

## 4. Import et PDF au premier rang

Deux actions rares occupaient le même rang visuel que « Aujourd'hui » et les flèches de navigation.
Elles passent dans un menu **⚙️ Réglages** replié, avec un libellé et une explication chacune.

## Ce que le smoke a rattrapé

En restructurant le formulaire, j'ai **perdu le bouton d'estimation de trajet** (`#weekQuickEstimate`,
le 🧭 qui interroge OpenStreetMap). Deux checks existants l'ont signalé — l'un pour le champ
manquant, l'autre pour l'absence de nom accessible. Restauré à sa place, à côté du champ trajet,
avec son `aria-label`.

Un piège rencontré deux fois au passage : le rendu a souvent lieu **page masquée**. Un élément
masqué a une hauteur de 0, et toute affectation de `scrollTop` y est silencieusement perdue. Le
placement mémorise donc sa cible sur l'élément et la repose dès que la grille a une hauteur — et
l'appel doit venir **après** l'écriture du DOM, pas pendant le calcul du rendu.

## Non-régression

- Check **bloquant** `agendaJournee` : 06:00 → 24:00, la grille **dépasse** son cadre (donc le
  défilement interne existe vraiment), et `scrollTop > 100` (donc elle s'ouvre sur le premier bloc).
  Validé par mutation : recoller la grille aux événements fait passer le smoke au rouge.
- Check **bloquant** `agendaCommandes` : 3 segments dont « Mois » ; import et PDF **à l'intérieur**
  du menu réglages, lui-même replié ; formulaire étiqueté avec détails repliés.
- **604 tests + SMOKE OK.**

Domaine : design
