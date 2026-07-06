# Récap boucle #19 — Matériel corrigé + illustrations refaites (SVG)

**Quand :** 2026-07-06
**Vague :** 5 (Coaching & contenu) — tâches 5.0a, 5.0b
**Statut :** ✅ vérifié (39/39 tests, smoke OK, rendu SVG confirmé par capture)

## Tes retours traités
1. **Matériel faux** (« il m'a mis une caisse ») → **corrigé**.
2. **Illustrations toujours coupées** → **diagnostiquées et remplacées**.
3. Contenu sport trop maigre / pas assez de coaching → **grosse boucle dédiée qui démarre** (Vague 5).

## 5.0a — Matériel réel ✅
- Le modèle d'équipement passe de `{kettlebell, vest, bench}` à **`{handles, vest, kettlebell, pullup}`** = ton kit réel : **poignées de pompes, gilet lesté, kettlebell, barre de traction**. Fini le « banc / marche ».
- Mis à jour partout : defaults, onboarding, profil, sauvegarde, texte du conseil profil. Migration douce (l'ancien `bench` est simplement ignoré).

## 5.0b — Illustrations : diagnostic + solution ✅
- **Diagnostic** (en découpant une planche sur la grille CSS) : les planches photo (1536×1024, grille 3×2 = cellules 512×512) **ne sont pas alignées** — les personnes sont placées n'importe où dans leur cellule et **débordent sur les voisines**. Le découpage en sprite ne peut donc jamais tomber juste (d'où les coupures), et je ne peux pas régénérer les photos.
- **Solution** : remplacement par un **système de pictogrammes SVG** (`lib/exercise-icons.js`) — 10 schémas de mouvement (squat, hinge, bridge, lunge, push, pushv, pull, carry, calf, core). Chaque exercice est mappé à un pattern ; l'icône hérite de la couleur du thème et **ne peut plus être coupée**.
- Vérifié par **capture Electron** : les 30 cartes affichent des silhouettes propres et lisibles, en clair comme en sombre.

## Vérifications
- `node --check` OK (app.js, exercise-icons.js) · `npm test` **39/39** · smoke `SMOKE OK` · capture : `cards=30` avec `.ex-svg`.

## Suite immédiate = Vague 5 (le vrai sujet : coaching)
- **5.1** Ajouter les exercices **barre de traction** (tractions, négatives, rowing australien, dead hang, relevés de genoux) + variations poignées.
- **5.2/5.3/5.4** Programmes structurés + périodisation + guidage renforcé (mode « coach d'athlète de haut niveau »).
- **5.5** Retirer/adapter les mouvements qui exigent un banc/box (que tu n'as pas).

## Git
- Commit : `fix(materiel+visuels): equipement reel + pictogrammes SVG (5.0a/5.0b)`.
