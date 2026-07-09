# Boucle #68 — 45/47 exercices animés (planches 10-23) · build 1.9.1

**Contexte :** Adrien a généré 14 planches d'animation (format 3 exercices × 2 poses), suivant exactement mon plan (planches 10-23, dans l'ordre chronologique 04:02 → 04:27).

## Intégré

14 sprites 1536×1024 copiés (`exercise-illustrations-v10..v23.png`). Chaque planche : colonne = un exercice, ligne du haut = départ (cases p0/p1/p2), ligne du bas = fin (p3/p4/p5). → **42 entrées `EXERCISE_ANIM`** ajoutées (chacune `"<planche> <caseDépart> <caseFin>"`), + `.sheet-10..23` dans strength.css.

**Mapping vérifié planche par planche** (lecture des 14 images) — 14/14 conformes au plan :
- 10 pompes (inclinées/diamants/gilet) · 11 déficit/pike/développé militaire · 12 tractions supination/négatives/rowing australien · 13 rowing KB/floor press/suspension · 14 fentes arrière/split squat/cosaque · 15 step-up/step-down/chaise · 16 SDT KB/SDT une jambe/pont fessier · 17 swing/good morning/nordic · 18 mollets/tibiaux/sauts cheville · 19 squat sauté/fentes sautées/montées genoux · 20 mountain climbers/bear crawl/dead bug · 21 planche/latéral/hollow · 22 bird dog/superman/touches épaule · 23 marche fermier/relevés genoux/turkish.

→ **45 des 47 exercices ont une animation début↔fin** (avec la planche 9). Reste la **planche 24** (équilibre unipodal + pont fessier une jambe).

## Vérifs

- `npm run verify` → **122 tests / 122 pass**, **SMOKE OK**. `icons.test.js` renforcé : chaque entrée `EXERCISE_ANIM` = exercice connu, format `^\d+ p[0-5] p[0-5]$`, 2 cases **différentes**, ≥ 45 animés.
- **Rendu vérifié par capture 2 frames** sur 5 planches (9, 11, 12, 19, 23) : chaque exercice affiche la position de départ puis la position de fin, personnage entier, aucune coupe.
- Correction d'un test : « Nordic curl » servait d'exemple non-animé → remplacé par « Équilibre unipodal » (planche 24, non générée).

## Suite

Planche 24 (2 exercices) pour atteindre 47/47. Prompt déjà dans l'artifact du plan.
