# Proposition — `readinessScore` : sommeil **non renseigné** traité comme « 0 h » (−40 pts)

> Écrit par la boucle autonome (VPS) le **2026-07-18**. Décision réservée à Adrien : le remède
> engage un vrai arbitrage **UX + santé** (« nuit blanche à signaler » vs « donnée absente ») dans
> le domaine **Récupération / Sommeil**, sujet sensible (saga sommeil #377→#380). Aucune ligne de
> code n'a été modifiée — cette itération met en évidence l'incohérence, en donne la preuve, et
> pose les options chiffrées. Piste notée deux fois (recaps #442 et #444) comme « à trancher /
> plutôt proposition que correctif direct ».

## L'incohérence (prouvée)

`readinessScore(recovery)` (`src/lib/logic.js:6297`) calcule la « Forme du jour » (0–100) à partir
de trois signaux du check-in :

```js
const sleep    = Math.max(0, Math.min(12, Number(r.sleep)    || 0)); // ← manquant ⇒ 0 (le PIRE)
const fatigue  = Math.max(1, Math.min(5,  Number(r.fatigue)  || 3)); // ← manquant ⇒ 3 (NEUTRE)
const soreness = Math.max(1, Math.min(5,  Number(r.soreness) || 3)); // ← manquant ⇒ 3 (NEUTRE)
const score = Math.round(Math.min(1, sleep / 8) * 40 + ((5 - fatigue) / 4) * 30 + ((5 - soreness) / 4) * 30);
```

**Deux asymétries se rejoignent :**

1. **Dans la fonction elle-même** : fatigue et courbatures absentes retombent sur une valeur
   **neutre** (`|| 3`, soit la moitié de leur composante). Le sommeil absent retombe sur `|| 0`,
   soit la **pire** valeur possible → composante sommeil = **0/40**.

2. **Vis-à-vis de tout le reste du sous-système sommeil** : `weeklySleepStats` (`logic.js:6397`),
   `sleepDebtHours` (`logic.js:6378`), `sleepSeries`, `sleepRegularity` **excluent explicitement**
   `sleep:0` comme « nuit non chiffrée » (commentaires à l'appui, ex. `logic.js:6384-6388` :
   « n'écris que les nuits chiffrées (sleep > 0) »). `readinessScore` est le **seul** à lire
   `sleep:0` comme un vrai « 0 heure de sommeil ».

**L'UI câble l'asymétrie** (`src/index.html:182`) :

- `#sleepInput` : `<input type="number" placeholder="7.5">` — **aucune valeur par défaut**. Champ
  laissé vide ⇒ `saveRecovery` (`app.js:686`) fait `Number('') || 0` ⇒ stocke `sleep:0`.
- `#fatigueInput` / `#sorenessInput` : `<select>` avec l'option `3` **`selected`** ⇒ toujours une
  valeur neutre, jamais « vide ».

Autrement dit : un check-in où l'on note sa fatigue/ses courbatures **sans** renseigner les heures
de sommeil est un scénario **normal et atteignable** — et il est puni de −40 points.

## Conséquence concrète

Check-in du matin, fatigue **1 (Frais)**, courbatures **1 (Aucune)**, sommeil laissé vide :

| Sommeil saisi | Score | Libellé | Effet dashboard |
|---|---|---|---|
| 8 h | **100** | Prêt à pousser | rien |
| *(vide → 0)* | **60** | Correct — garde une marge | rien |

Pire, aux valeurs **par défaut** (fatigue 3 / courbatures 3, sommeil laissé vide) :

| Sommeil saisi | Score | Libellé | Effet dashboard |
|---|---|---|---|
| 7,5 h | **68** | Correct — garde une marge | rien |
| *(vide → 0)* | **30** | **Récupération prioritaire** | `attentionDigest` pousse « 😴 Forme basse (30/100) — allège aujourd'hui » en gravité **haute** (`logic.js:4768-4769`) |

Le même matin bascule de « Correct » à « Forme basse, allège » **uniquement** parce que la case
sommeil est restée vide. `readinessScore` alimente aussi `loadAdvice`, `suggestedRoutine` /
`contextualWellnessRoutine` (routine bien-être suggérée) et `readinessTrend` → l'écart se propage.

C'est le **même patron** que le bug #444 (`workoutTonnage`) : une donnée que le reste du domaine
sait interpréter d'une façon, lue autrement par une seule fonction → deux verdicts contradictoires
pour la même saisie.

## Pourquoi une proposition et pas un correctif direct

Le **diagnostic** est net (incohérence prouvée). Le **remède**, lui, dépend d'une intention qui
n'appartient qu'à Adrien : dans cette app, `sleep:0` est **ambigu** — il vaut à la fois
« je n'ai pas renseigné » (champ vide) **et** « nuit blanche / très courte » (nombre réellement bas).
Or, vu ta priorité sommeil (endormissements ~6 h, plan de recalage #379), **être alerté quand la
nuit est mauvaise est une fonctionnalité voulue**, pas un bug. Choisir comment traiter le sommeil
absent, c'est arbitrer entre « ne pas fausser la forme sur une donnée manquante » et « ne pas
rater une alerte de mauvaise nuit ». D'où : options ci-dessous, ton choix.

## Options

**A. Re-normaliser sur les composantes renseignées** *(recommandée)*
Quand `sleep` est absent/0, ignorer la composante sommeil et ramener fatigue+courbatures (60 pts) à
100 — exactement la convention « ne compter que les nuits chiffrées » du reste du sous-système.
- Sommeil renseigné (>0) → **score inchangé** (100 % rétro-compatible).
- Sommeil absent → `score = round((compFatigue + compSoreness) / 60 * 100)`. Ex. fatigue 3 /
  courbatures 3 → **50** (« Correct ») au lieu de 30 ; fatigue 1 / courbatures 1 → **100**.
- ➕ Aucun nombre « magique » inventé, calqué sur des fonctions déjà testées ; l'inconnu ne pénalise
  ni ne récompense. ➖ Perd le signal « forme basse » quand la case est vide (mais ce signal était
  de toute façon faux : il ne mesurait pas une vraie mauvaise nuit, juste une case oubliée).

**B. Valeur de sommeil neutre par défaut**
`Number(r.sleep) || <neutre>` avec un neutre explicite (p. ex. 6 h → 30/40, ou la cible perso). Plus
proche du modèle fatigue/courbatures (fallback neutre), mais **choisit un nombre** → arbitraire
assumé, et masque « donnée absente ». ➖ Moins pur que A.

**C. Rendre le sommeil obligatoire côté UI**
Donner une valeur par défaut au `<select>`/à l'input sommeil (ou refuser l'enregistrement sans
sommeil), de sorte que `sleep:0` redevienne une vraie saisie. ➕ Lève l'ambiguïté à la source.
➖ Friction ajoutée au check-in ; change un champ aujourd'hui **optionnel** de fait ; ne corrige pas
les check-ins déjà stockés à `sleep:0`.

**D. Ne rien changer**
Assumer « 0 = pire nuit, à toi de remplir ». ➖ Laisse l'incohérence prouvée (le bilan sommeil dit
« pas de nuit chiffrée » pendant que la forme dit « catastrophe »).

## Recommandation

**Option A.** C'est un **correctif de cohérence** aligné mot pour mot sur la convention déjà en
place et testée dans tout le sous-système sommeil, rétro-compatible sur le cas sommeil renseigné,
et sans nombre arbitraire. Si tu tiens à conserver une alerte « mauvaise nuit », elle a sa place
ailleurs (un seuil explicite sur `sleep > 0 && sleep < X`), pas dans le fallback d'une donnée
absente. Dis-moi « option A » (ou B/C) et une prochaine boucle l'implémente (logique pure + tests +
check smoke, bump de version).

## Portée si tu valides A (pour mémoire)

- `logic.js` : `readinessScore` — brancher sur `sleep > 0` ; sinon score sur 60 renormalisé.
- Tests `logic.test.js` : sommeil renseigné inchangé ; sommeil absent fatigue 3/court. 3 → 50 ;
  fatigue 1/court. 1 → 100 ; garde `readinessTrend` cohérent.
- Smoke : check `readiness` étendu (cas sommeil absent) + éventuellement promu bloquant.
- Docs : recap + entrée CHANGELOG + bump `package.json` + les 2 assertions `CHANGELOG[0].v`.
