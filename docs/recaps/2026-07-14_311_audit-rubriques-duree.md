# #311 — Audit des rubriques + durée en heures (1.9.245)

**Rotation 25 · item #4 (CLÔTURE) · retours directs d'Adrien**

Adrien a signalé trois choses et demandé un audit. Verdict : **1 vrai bug (le sien,
bien vu), 1 fausse alerte, 1 vraie amélioration.**

---

## 1. 🐛 « Dans les réglages y'a programme auto et routines guidées, c'est pas normal non ? »

**Il a raison.** Et la cause est structurelle.

`showPage()` ne masque **que** les panneaux listés dans `pageGroups` :

```js
Object.entries(pageGroups).forEach(([name, selectors]) =>
  selectors.forEach(s => document.querySelectorAll(s)
    .forEach(el => el.classList.toggle('app-page-hidden', name !== page))));
```

Un panneau **absent de `pageGroups` n'est donc JAMAIS masqué** — il s'affiche sur
**toutes** les pages.

Deux panneaux étaient dans ce cas, et ce sont exactement les deux qu'Adrien a vus :

| panneau | titre | déclaré dans `ATHLETE_TABS` ? | dans `pageGroups.athlete` ? |
|---|---|---|---|
| `.objective-program-panel` | « Mon programme selon mon objectif » | ✅ `'seance'` | ❌ **oublié** |
| `.wellness-panel` | « Routines guidées » | ✅ `'seance'` | ❌ **oublié** |

Ils appartenaient bien à la page Athlète — ils avaient juste été oubliés dans la liste
qui pilote le masquage. Ils fuyaient donc sur Réglages **et** sur Nutrition.

**Corrigé** en les ajoutant à `pageGroups.athlete`.

### Garde-fou pour que ça ne revienne pas
Nouveau check smoke **`pageIsolation`** : il vérifie que les panneaux clés sont bien
déclarés dans `pageGroups`, **et** qu'aucun d'eux ne reste visible quand on affiche
Réglages. Le bug ne peut plus repasser en silence.

### Vérif navigateur — avant / après
| page | avant | après |
|---|---|---|
| **Réglages** | Réglages, Rappels, **+ Programme auto, + Routines guidées** | **Réglages, Rappels** ✔ |
| **Nutrition** | 4 panneaux nutrition **+ Programme auto, + Routines guidées** | **4 panneaux nutrition** ✔ |
| **Athlète** | — | Programme auto ✔ · Routines guidées ✔ *(bien revenus chez eux)* |

---

## 2. ✅ « Planifier la suite est connecté avec le reste, j'espère ? » — OUI

**Fausse alerte, et je le dis clairement plutôt que d'inventer un problème.**

Il n'existe **qu'un seul** panneau « Planifier la suite » (`.planning-panel`, Athlète ›
Séance). Vérifié en planifiant réellement une séance dans le navigateur :

- ajoutée à `state.plans` ✔
- **un item d'agenda lié est créé** (`kind: 'sport'`, `planId`) → elle apparaît dans le
  calendrier ✔
- visible dans la liste des séances planifiées de la même page ✔
- alimente « ⏭️ Prochaine séance : Musculation — dans 2 j (16/07 · 18:30) » ✔
- et (cf. #307) l'item d'agenda est marqué *complété* quand la séance est enregistrée
  depuis le plan ✔

Tout est bien relié. Rien à corriger.

---

## 3. ⏱️ « Pouvoir régler en heures, pas uniquement en minutes »

Le champ était `<label>Durée (minutes)</label>` : une sortie longue de 1 h 30 se
saisissait « 90 ».

Désormais **deux champs : `h` et `min`**.

**Le modèle de données reste en minutes** — donc **aucune migration**, et tout
l'existant (statistiques, charge, graphiques) continue de fonctionner à l'identique.
Seule la *saisie* change.

### Logique pure
- `splitDuration(totalMin)` → `{ h, m }` (90 → 1 h 30).
- `combineDuration(h, m, max)` → minutes, borné à 10 h.
  Choix assumé : **1 h + 90 min = 150 min**. On n'« corrige » pas l'utilisateur en
  silence, on additionne ce qu'il a écrit.

### Détail qui comptait
Le champ minutes était `required` : saisir « 2 h » **sans minutes** aurait été bloqué.
J'ai retiré `required` et validé le **total** à la soumission (avec un message si la
durée est nulle).

### Vérif navigateur
- « Sortie longue » planifiée (90 min) → pré-remplie en **1 h 30** ✔
- Saisie « 1 h 45 » → enregistré **105 min** ✔
- Saisie « 2 h » sans minutes → enregistré **120 min** ✔

---

## Tests
- `logic.test.js` : `splitDuration` / `combineDuration` (cas nominaux, champs vides,
  heures seules, minutes > 59, bornes, négatifs, **aller-retour** découpe→recompose).
- `renderer-smoke.cjs` : **`pageIsolation`** (le garde-fou du bug) + `durationSplit`.
- `npm run verify` : **338 tests + SMOKE OK**.

## Fichiers
- `src/app.js` — `pageGroups.athlete` complété ; `setDurationFields()` /
  `readDurationFields()` ; les 6 points de lecture/écriture de la durée migrés ;
  validation du total au submit.
- `src/lib/logic.js` — `splitDuration()`, `combineDuration()` + exports + CHANGELOG[0] 1.9.245.
- `src/index.html` — champ durée en `h` + `min` (avec `aria-label` sur chaque).
- `src/strength.css` — `.dur-split`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Clôture rotation 25
#308 minuteur focus à l'horloge · #309 repos à l'horloge · #310 perf saisie + bug
d'aliasing · #311 audit rubriques + durée en heures.
→ **tag `v1.9.245` + push (auto-publish)**.
